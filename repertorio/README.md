# repertorio

Web estatica para visualizar el repertorio de saxo de Jesus.

## Resumen

Este repo contiene una web estatica para presentar y gestionar un repertorio de saxo para eventos. La pagina permite consultar canciones por artista, titulo, estilo, tonalidad y estado, con filtros de busqueda y vistas separadas para repertorio completo, repertorios estandar y listas personalizadas.

El repertorio vive en `songs.js`, donde cada tema incluye artista, titulo, estilo, tonalidad y estado. La interfaz principal esta en `index.html`, con estilos en `styles.css` y logica en `script.js`.

La web tambien incluye:

- Cambio de idioma entre espanol, ingles, aleman y frances.
- Repertorios estandar organizados por tipo de ambiente, como chill, pop, ambient, baile, mix y carols.
- Creacion de un custom reper en dos pases, con limite de canciones y descarga de la lista.
- Metadatos e imagenes para compartir la pagina en redes.
- `utilities.js`, con una utilidad de terminal para exportar los nombres de las canciones:

```powershell
node utilities.js exportNames
```

## Normalizar backing tracks

Los audios que se dejen en `normalize/` se pueden normalizar recursivamente con:

```powershell
.\normalize-volume.ps1
```

El script usa `ffmpeg` con normalizacion loudness precisa de dos pasadas (`loudnorm`) y guarda los audios normalizados en `normalize/normalize_audio/`, respetando las subcarpetas originales. Los archivos originales no se modifican. Por defecto apunta a `-16 LUFS`, `-1.5 dBTP` y `LRA 11`, un punto de partida practico para backing tracks.

Para ver que archivos procesaria sin tocar nada:

```powershell
.\normalize-volume.ps1 -DryRun
```

Si un archivo normalizado ya existe en `normalize/normalize_audio/`, el script lo omite para poder reanudar trabajos interrumpidos. Para regenerar todo:

```powershell
.\normalize-volume.ps1 -Overwrite
```

Requiere tener `ffmpeg` instalado y disponible en el `PATH`.

## Recortar silencios

Para cortar silencios al principio y al final de los audios normalizados:

```powershell
.\trim-silence.ps1
```

Por defecto lee desde `normalize/normalize_audio/` y guarda el resultado en `normalize/trimmed_audio/`, sin modificar los archivos de entrada.

Para ver que archivos procesaria:

```powershell
.\trim-silence.ps1 -DryRun
```

El umbral por defecto es `-50dB`. Si corta demasiado poco, puedes probar `-Threshold -45dB`; si corta demasiado, `-Threshold -55dB`.
