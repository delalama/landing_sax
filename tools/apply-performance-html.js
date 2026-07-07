const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlFiles = [
  "index.html",
  "share.html",
  ...["saxofonista-bodas-mallorca", "saxofonista-hoteles-mallorca", "saxofonista-eventos-mallorca", "saxofonista-pool-parties-mallorca", "saxofonista-alcudia", "saxofonista-palma"]
    .flatMap((slug) => [
      `${slug}/index.html`,
      `en/${slug}/index.html`,
      `de/${slug}/index.html`,
      `fr/${slug}/index.html`
    ]),
  "repertorio/index.html",
  "repertorio/share.html"
];

function depth(file) {
  return file.split(/[\\/]/).length - 1;
}

function rel(file, asset) {
  return `${"../".repeat(depth(file))}${asset}`;
}

function removeInlineGtag(html) {
  return html
    .replace(/\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-FT710YLQTN"><\/script>/g, "")
    .replace(/\s*<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('js', new Date\(\)\);\s*gtag\('config', 'G-FT710YLQTN'\);\s*<\/script>/g, "");
}

function asyncFonts(html) {
  return html
    .split(/\r?\n/)
    .map((line) => {
      if (!line.includes("fonts.googleapis.com/css2")) {
        return line;
      }

      const match = line.match(/https:\/\/fonts\.googleapis\.com\/css2\?family=[^"]+/);
      if (!match) {
        return line;
      }

      const indent = line.match(/^\s*/)[0];
      const href = match[0];
      return `${indent}<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`;
    })
    .join("\n");
}

function updateCommonImages(html, file) {
  const hero = rel(file, "assets/hero-personal-1600.webp");
  const logo = rel(file, "assets/footer-logo-440.webp");
  const smiling400 = rel(file, "assets/sonriendo-400.webp");
  const smiling700 = rel(file, "assets/sonriendo-700.webp");
  const smiling1100 = rel(file, "assets/sonriendo-1100.webp");

  return html
    .replace(/<link rel="preload" as="image" href="[^"]*assets\/hero-personal\.png">/g, `<link rel="preload" as="image" href="${hero}" fetchpriority="high" type="image/webp">`)
    .replace(/(<img class="hero-image") src="[^"]*assets\/hero-personal(?:-1600)?\.(?:png|webp)"(?: width="\d+" height="\d+")?/g, `$1 src="${hero}" width="1536" height="1024"`)
    .replace(/(<img class="brand-wordmark") src="[^"]*assets\/footer%20y%20logo\.png"([^>]*?)>/g, `$1 src="${logo}" width="440" height="166" decoding="async"$2>`)
    .replace(/(<img class="footer-logo") src="[^"]*assets\/footer%20y%20logo\.png"([^>]*?)>/g, `$1 src="${logo}" width="440" height="166" loading="lazy" decoding="async"$2>`)
    .replace(/<img src="[^"]*assets\/sonriendo(?:-\d+)?\.(?:png|webp)"(?: srcset="[^"]*")?(?: sizes="[^"]*")? alt="([^"]*)"(?: width="\d+" height="\d+")?[^>]*>/g, `<img src="${smiling700}" srcset="${smiling400} 400w, ${smiling700} 700w, ${smiling1100} 843w" sizes="(max-width: 520px) calc(100vw - 48px), (max-width: 860px) min(100vw - 64px, 560px), 348px" alt="$1" width="700" height="1050" loading="lazy" decoding="async">`);
}

function updateRepertoireImages(html) {
  return html
    .replace(/<img class="hero__image" src="assets\/sax-hero\.png" alt="">/g, '<img class="hero__image" src="assets/sax-hero-1400.webp" alt="" width="1400" height="639" fetchpriority="high" decoding="async">')
    .replace(/<img class="brand__mark" src="assets\/footer%20y%20logo\.png" alt="">/g, '<img class="brand__mark" src="assets/footer-logo-440.webp" alt="" width="440" height="166" decoding="async">')
    .replace(/<img src="assets\/flag-gb\.svg" alt="">/g, '<img src="assets/flag-gb.svg" alt="" width="60" height="40">')
    .replace(/<img src="assets\/flag-es\.svg" alt="">/g, '<img src="assets/flag-es.svg" alt="" width="60" height="40">')
    .replace(/<img src="assets\/flag-de\.svg" alt="">/g, '<img src="assets/flag-de.svg" alt="" width="60" height="40">')
    .replace(/<img src="assets\/flag-fr\.svg" alt="">/g, '<img src="assets/flag-fr.svg" alt="" width="60" height="40">');
}

function updateGalleryImages(html, file) {
  return html.replace(/src="([^"]*assets\/img\/([a-z0-9-]+)\.jpg)"/g, (match, original, name) => {
    if (original.includes("-900.webp")) return match;
    return `src="${rel(file, `assets/img/${name}-900.webp`)}"`;
  });
}

function deferLocalScripts(html) {
  return html.replace(
    /<script src="([^"]*(?:analytics|contenido|script|songs|utilities)\.js)"><\/script>/g,
    '<script src="$1" defer></script>'
  );
}

for (const file of htmlFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const original = fs.readFileSync(fullPath, "utf8");
  const next = deferLocalScripts(updateRepertoireImages(updateGalleryImages(updateCommonImages(asyncFonts(removeInlineGtag(original)), file), file)));
  if (next !== original) {
    fs.writeFileSync(fullPath, next);
    console.log(`updated ${file}`);
  }
}
