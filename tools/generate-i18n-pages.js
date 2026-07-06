const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const siteBase = "https://delalama.github.io/landing_sax";
const langs = ["es", "en", "de", "fr"];
const langMeta = {
  es: { locale: "es_ES", pathPrefix: "" },
  en: { locale: "en_US", pathPrefix: "en" },
  de: { locale: "de_DE", pathPrefix: "de" },
  fr: { locale: "fr_FR", pathPrefix: "fr" }
};

const pages = [
  { slug: "saxofonista-bodas-mallorca", priority: "0.9", image: "assets/img/bodas-1.jpg", imageTitle: "Saxofonista para bodas en Mallorca" },
  { slug: "saxofonista-hoteles-mallorca", priority: "0.9", image: "assets/img/hoteles-1.jpg", imageTitle: "Saxofonista para hoteles en Mallorca" },
  { slug: "saxofonista-eventos-mallorca", priority: "0.9", image: "assets/img/eventos-1.jpg", imageTitle: "Saxofonista para eventos en Mallorca" },
  { slug: "saxofonista-pool-parties-mallorca", priority: "0.88", image: "assets/img/pool-parties-1.jpg", imageTitle: "Saxofonista para pool parties en Mallorca" },
  { slug: "saxofonista-alcudia", priority: "0.85", image: "assets/img/alcudia-1.jpg", imageTitle: "Saxofonista en Alcudia" },
  { slug: "saxofonista-palma", priority: "0.85", image: "assets/img/palma-1.jpg", imageTitle: "Saxofonista en Palma" }
];

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "contenido.js"), "utf8"), context);
const contenido = context.window.contenidoLanding;
const seoPages = contenido.seoPages || {};

function pageUrl(slug, lang, index = false) {
  const prefix = langMeta[lang].pathPrefix;
  return `${siteBase}/${prefix ? `${prefix}/` : ""}${slug}/${index ? "index.html" : ""}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceMeta(html, selector, content) {
  if (!content) return html;
  const attr = selector.startsWith("property=") ? "property" : "name";
  const key = selector.match(/"([^"]+)"/)[1];
  const re = new RegExp(`(<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content=")[^"]*(">)`);
  return html.replace(re, `$1${content}$2`);
}

function replaceFirstTagText(html, tag, text, className) {
  if (!text) return html;
  const classPart = className ? `[^>]*class="${className}"[^>]*` : "[^>]*";
  const re = new RegExp(`(<${tag}${classPart}>)[\\s\\S]*?(</${tag}>)`);
  return html.replace(re, `$1${text}$2`);
}

function replaceSectionHeading(html, sectionClass, eyebrow, title) {
  const re = new RegExp(`(<section class="[^"]*${sectionClass}[^"]*"[\\s\\S]*?<div class="section-heading">)([\\s\\S]*?)(</div>)`);
  return html.replace(re, (_, start, inner, end) => {
    let next = inner;
    if (eyebrow) next = next.replace(/(<p class="eyebrow">)[\s\S]*?(<\/p>)/, `$1${eyebrow}$2`);
    if (title) next = next.replace(/(<h2[^>]*>)[\s\S]*?(<\/h2>)/, `$1${title}$2`);
    return `${start}${next}${end}`;
  });
}

function replaceParagraphs(html, paragraphs) {
  if (!paragraphs) return html;
  let index = 0;
  return html.replace(/(<div class="seo-rich-copy">[\s\S]*?)(<h3>)/, (match) =>
    match.replace(/(<p>)[\s\S]*?(<\/p>)/g, (p, start, end) => {
      const value = paragraphs[index++];
      return value ? `${start}${value}${end}` : p;
    })
  );
}

function replaceListItems(html, items) {
  if (!items) return html;
  let index = 0;
  return html.replace(/(<ul class="seo-list">)([\s\S]*?)(<\/ul>)/, (_, start, inner, end) => {
    const next = inner.replace(/(<li>)[\s\S]*?(<\/li>)/g, (li, liStart, liEnd) => {
      const value = items[index++];
      return value ? `${liStart}${value}${liEnd}` : li;
    });
    return `${start}${next}${end}`;
  });
}

function alternates(slug) {
  const links = langs
    .map((lang) => `    <link rel="alternate" hreflang="${lang}" href="${pageUrl(slug, lang)}">`)
    .join("\n");
  return `${links}\n    <link rel="alternate" hreflang="x-default" href="${pageUrl(slug, "es")}">`;
}

function applyLanguageUrls(html, slug, currentLang) {
  return html.replace(/<button class="language-button" type="button" data-lang="(en|es|de|fr)"([^>]*)>/g, (match, lang, rest) => {
    const activeUrl = pageUrl(slug, lang);
    const cleaned = rest.replace(/\sdata-lang-url="[^"]*"/, "");
    return `<button class="language-button" type="button" data-lang="${lang}" data-lang-url="${activeUrl}"${cleaned}>`;
  });
}

function localizeHtml(baseHtml, slug, lang) {
  const data = (seoPages[slug] && (seoPages[slug][lang] || seoPages[slug].es)) || {};
  let html = baseHtml;

  html = html.replace(/<html[^>]*>/, `<html lang="${lang}" data-localized data-seo-page="${slug}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${data.title}</title>`);
  html = replaceMeta(html, 'name="description"', data.description);
  html = replaceMeta(html, 'property="og:locale"', data.ogLocale || langMeta[lang].locale);
  html = replaceMeta(html, 'property="og:title"', data.ogTitle || data.title);
  html = replaceMeta(html, 'property="og:description"', data.ogDescription || data.description);
  html = replaceMeta(html, 'property="og:url"', pageUrl(slug, lang, true));
  html = replaceMeta(html, 'name="twitter:title"', data.ogTitle || data.title);
  html = replaceMeta(html, 'name="twitter:description"', data.twitterDescription || data.ogDescription || data.description);

  const nav = (contenido.idiomas && contenido.idiomas[lang]) || {};
  html = html
    .replace(/(<a href="[^"]*#sobre-mi" data-content="navSobreMi">)[\s\S]*?(<\/a>)/, `$1${nav.navSobreMi || "Sobre mi"}$2`)
    .replace(/(<a href="[^"]*#booking" data-content="navBooking">)[\s\S]*?(<\/a>)/, `$1${nav.navBooking || "Booking"}$2`)
    .replace(/(<a href="[^"]*repertorio\/" data-content="navRepertorio">)[\s\S]*?(<\/a>)/, `$1${nav.navRepertorio || "Repertorio"}$2`);

  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${pageUrl(slug, lang)}">`);
  html = html.replace(/(?:\s*<link rel="alternate" hreflang="[^"]+" href="[^"]*">)+/g, "");
  html = html.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n${alternates(slug)}`);

  html = html.replace(/(<p class="eyebrow">)[\s\S]*?(<\/p>)/, `$1${data.heroEyebrow}$2`);
  html = html.replace(/(<h1>)[\s\S]*?(<\/h1>)/, `$1${data.h1}$2`);
  html = html.replace(/(<p class="hero-copy">)[\s\S]*?(<\/p>)/, `$1${data.heroCopy}$2`);
  html = html.replace(/(<span class="social-kicker">)[\s\S]*?(<\/span>)/, `$1${data.ctaKicker}$2`);
  html = replaceFirstTagText(html, "h2", data.copyTitle);
  html = replaceParagraphs(html, data.copyParagraphs);
  html = replaceFirstTagText(html, "h3", data.listTitle);
  html = replaceListItems(html, data.listItems);
  html = replaceSectionHeading(html, "seo-gallery-section", data.galleryEyebrow, data.galleryTitle);
  html = replaceSectionHeading(html, "seo-crosslinks-section", data.relatedEyebrow, data.relatedTitle);

  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<p class="eyebrow">)[\s\S]*?(<\/p>)/, `$1${data.asideEyebrow}$2`);
  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<p class="eyebrow">[\s\S]*?<\/p>\s*<p>)[\s\S]*?(<\/p>)/, `$1${data.asideText}$2`);
  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<a class="text-link"[^>]*>)[\s\S]*?(<\/a>)/, `$1${data.asideCta}$2`);

  html = applyLanguageUrls(html, slug, lang);

  if (lang !== "es") {
    html = html
      .replace(/(href|src)="\.\.\/assets\//g, '$1="../../assets/')
      .replace(/href="\.\.\/styles\.css/g, 'href="../../styles.css')
      .replace(/src="\.\.\/analytics\.js"/g, 'src="../../analytics.js"')
      .replace(/src="\.\.\/contenido\.js"/g, 'src="../../contenido.js"')
      .replace(/src="\.\.\/script\.js"/g, 'src="../../script.js"')
      .replace(/href="\.\.\/repertorio\//g, 'href="../../repertorio/')
      .replace(/href="\.\.\/# /g, 'href="../../# ')
      .replace(/href="\.\.\/#/g, 'href="../../#')
      .replace(/href="\.\.\/"/g, 'href="../../"');
  }

  return html;
}

function sitemapEntry(loc, priority, image, imageTitle, slug) {
  const altLinks = slug
    ? `\n${langs.map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${pageUrl(slug, lang)}" />`).join("\n")}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(slug, "es")}" />`
    : "";
  const imageBlock = image
    ? `\n    <image:image>\n      <image:loc>${siteBase}/${image}</image:loc>\n      <image:title>${imageTitle}</image:title>\n    </image:image>`
    : "";
  return `  <url>\n    <loc>${loc}</loc>${altLinks}\n    <lastmod>2026-07-06</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>${imageBlock}\n  </url>`;
}

for (const page of pages) {
  const sourcePath = path.join(root, page.slug, "index.html");
  const source = fs.readFileSync(sourcePath, "utf8");

  fs.writeFileSync(sourcePath, localizeHtml(source, page.slug, "es"));

  for (const lang of langs.filter((item) => item !== "es")) {
    const outputDir = path.join(root, lang, page.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "index.html"), localizeHtml(source, page.slug, lang));
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[
  sitemapEntry(`${siteBase}/`, "1.0", "assets/share-preview.jpg?v=20260526", "JDL SAX - Saxofonista en Mallorca"),
  ...pages.flatMap((page) => langs.map((lang) => sitemapEntry(pageUrl(page.slug, lang), page.priority, page.image, page.imageTitle, page.slug))),
  sitemapEntry(`${siteBase}/repertorio/`, "0.7", "repertorio/assets/share-preview.jpg?v=20260526", "Repertorio de saxo para eventos")
].join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
