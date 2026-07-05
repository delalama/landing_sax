param(
    [string]$Root = ".\normalize",
    [string]$OutputDir = "",
    [double]$IntegratedLufs = -16,
    [double]$TruePeakDb = -1.5,
    [double]$LoudnessRange = 11,
    [switch]$Overwrite,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$supportedExtensions = @(".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg")
$script:FFmpegPath = $null

function Resolve-FullPath {
    param([string]$Path)

    $executionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
}

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $base = $BasePath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $baseWithSeparator = $base + [IO.Path]::DirectorySeparatorChar

    if ($FullPath.StartsWith($baseWithSeparator, [StringComparison]::OrdinalIgnoreCase)) {
        return $FullPath.Substring($baseWithSeparator.Length)
    }

    return Split-Path -Leaf $FullPath
}

function Get-FFmpegPath {
    $command = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $wingetPackages = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $wingetPackages -PathType Container) {
        $wingetMatch = Get-ChildItem -LiteralPath $wingetPackages -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "\\Gyan\.FFmpeg_" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1

        if ($wingetMatch) {
            return $wingetMatch.FullName
        }
    }

    return $null
}

function Get-CodecArgs {
    param([string]$Extension)

    switch ($Extension.ToLowerInvariant()) {
        ".mp3"  { return @("-c:a", "libmp3lame", "-q:a", "2") }
        ".m4a"  { return @("-c:a", "aac", "-b:a", "256k") }
        ".aac"  { return @("-c:a", "aac", "-b:a", "256k") }
        ".flac" { return @("-c:a", "flac") }
        ".ogg"  { return @("-c:a", "libvorbis", "-q:a", "5") }
        ".wav"  { return @("-c:a", "pcm_s16le") }
        default { return @("-c:a", "copy") }
    }
}

function Invoke-FFmpeg {
    param([string[]]$Arguments)

    $process = New-Object Diagnostics.Process
    $process.StartInfo = New-Object Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $script:FFmpegPath
    $process.StartInfo.Arguments = ($Arguments | ForEach-Object {
        '"' + $_.Replace('"', '\"') + '"'
    }) -join " "
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $false
    $process.StartInfo.RedirectStandardError = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.StandardOutputEncoding = [Text.Encoding]::UTF8
    $process.StartInfo.StandardErrorEncoding = [Text.Encoding]::UTF8

    [void]$process.Start()

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $stdoutTask.Wait()
    $stderrTask.Wait()

    $output = @()
    if ($stdoutTask.Result) {
        $output += $stdoutTask.Result
    }
    if ($stderrTask.Result) {
        $output += $stderrTask.Result
    }

    if ($process.ExitCode -ne 0) {
        throw ($output -join [Environment]::NewLine)
    }

    return $output
}

function Get-LoudnormMeasurements {
    param([string]$InputPath)

    $filter = "loudnorm=I=${IntegratedLufs}:TP=${TruePeakDb}:LRA=${LoudnessRange}:print_format=json"
    $arguments = @(
        "-hide_banner",
        "-nostats",
        "-i", $InputPath,
        "-af", $filter,
        "-f", "null",
        "NUL"
    )
    $output = Invoke-FFmpeg $arguments

    $text = $output -join [Environment]::NewLine
    $match = [regex]::Match($text, "\{[\s\S]*?\}")

    if (-not $match.Success) {
        throw "No se pudo leer la medicion loudnorm de '$InputPath'."
    }

    return $match.Value | ConvertFrom-Json
}

function ConvertTo-NormalizedFile {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [object]$Measurements
    )

    $filter = "loudnorm=I=${IntegratedLufs}:TP=${TruePeakDb}:LRA=${LoudnessRange}" +
        ":measured_I=$($Measurements.input_i)" +
        ":measured_TP=$($Measurements.input_tp)" +
        ":measured_LRA=$($Measurements.input_lra)" +
        ":measured_thresh=$($Measurements.input_thresh)" +
        ":offset=$($Measurements.target_offset)" +
        ":linear=true:print_format=summary"

    $codecArgs = Get-CodecArgs ([IO.Path]::GetExtension($InputPath))

    $arguments = @(
        "-hide_banner",
        "-y",
        "-i", $InputPath,
        "-map_metadata", "0",
        "-vn",
        "-af", $filter
    ) + $codecArgs + @(
        $OutputPath
    )

    Invoke-FFmpeg $arguments | Out-Null
}

$rootPath = Resolve-FullPath $Root
if (-not (Test-Path -LiteralPath $rootPath -PathType Container)) {
    throw "No existe la carpeta '$rootPath'."
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $outputRoot = Join-Path $rootPath "normalize_audio"
}
else {
    $outputRoot = Resolve-FullPath $OutputDir
}

$backupRoot = Join-Path $rootPath "_originals"
$files = Get-ChildItem -LiteralPath $rootPath -Recurse -File |
    Where-Object {
        $supportedExtensions -contains $_.Extension.ToLowerInvariant() -and
        -not $_.FullName.StartsWith($backupRoot, [StringComparison]::OrdinalIgnoreCase) -and
        -not $_.FullName.StartsWith($outputRoot, [StringComparison]::OrdinalIgnoreCase) -and
        -not $_.Name.EndsWith(".normalized$($_.Extension)", [StringComparison]::OrdinalIgnoreCase)
    } |
    Sort-Object FullName

if ($files.Count -eq 0) {
    Write-Host "No hay archivos de audio compatibles en '$rootPath'."
    exit 0
}

if ($DryRun) {
    Write-Host "Archivos que se normalizarian: $($files.Count) en '$rootPath'."
}
else {
    Write-Host "Normalizando $($files.Count) archivo(s) en '$rootPath'."
}
Write-Host "Destino: $outputRoot"
Write-Host "Objetivo: $IntegratedLufs LUFS, true peak $TruePeakDb dBTP, LRA $LoudnessRange."

if (-not $DryRun) {
    $script:FFmpegPath = Get-FFmpegPath
    if (-not $script:FFmpegPath) {
        throw "No encuentro ffmpeg. Instala ffmpeg y vuelve a ejecutar este script."
    }
    Write-Host "ffmpeg: $script:FFmpegPath"
}

foreach ($file in $files) {
    $relativePath = Get-RelativePath $rootPath $file.FullName
    $outputPath = Join-Path $outputRoot $relativePath
    $outputDirPath = Split-Path -Parent $outputPath
    $tempPath = Join-Path $outputDirPath ("$($file.BaseName).normalizing$($file.Extension)")

    Write-Host ""
    Write-Host "-> $relativePath"
    Write-Host "   destino: $outputPath"

    if ((Test-Path -LiteralPath $outputPath -PathType Leaf) -and -not $Overwrite) {
        Write-Host "   ya existe, se omite. Usa -Overwrite para regenerarlo."
        continue
    }

    if ($DryRun) {
        Write-Host "   dry-run: no se ha modificado."
        continue
    }

    try {
        Write-Host "   midiendo..."
        $measurements = Get-LoudnormMeasurements $file.FullName

        Write-Host "   normalizando..."
        New-Item -ItemType Directory -Force -Path $outputDirPath | Out-Null
        ConvertTo-NormalizedFile $file.FullName $tempPath $measurements

        if (-not (Test-Path -LiteralPath $tempPath -PathType Leaf)) {
            throw "ffmpeg no creo el archivo temporal '$tempPath'."
        }

        Move-Item -LiteralPath $tempPath -Destination $outputPath -Force
        Write-Host "   ok"
    }
    catch {
        if (Test-Path -LiteralPath $tempPath -PathType Leaf) {
            Remove-Item -LiteralPath $tempPath -Force
        }

        Write-Error "Fallo normalizando '$relativePath': $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Listo."
if ($DryRun) {
    Write-Host "No se ha modificado ningun archivo."
}
else {
    Write-Host "Archivos normalizados guardados en '$outputRoot'."
}
