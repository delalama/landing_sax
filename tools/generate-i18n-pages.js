const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const siteBase = "https://delalama.github.io/landing_sax";
const siteIdentity = "Jesús de la Lama | Saxofonista Mallorca";
const langs = ["es", "en", "de", "fr"];
const langMeta = {
  es: { locale: "es_ES", pathPrefix: "", homeLabel: "Inicio" },
  en: { locale: "en_US", pathPrefix: "en", homeLabel: "Home" },
  de: { locale: "de_DE", pathPrefix: "de", homeLabel: "Startseite" },
  fr: { locale: "fr_FR", pathPrefix: "fr", homeLabel: "Accueil" }
};

const pages = [
  { slug: "saxofonista-bodas-mallorca", priority: "0.9", image: "assets/img/bodas-1.jpg" },
  { slug: "saxofonista-hoteles-mallorca", priority: "0.9", image: "assets/img/hoteles-1.jpg" },
  { slug: "saxofonista-eventos-mallorca", priority: "0.9", image: "assets/img/eventos-1.jpg" },
  { slug: "saxofonista-pool-parties-mallorca", priority: "0.88", image: "assets/img/pool-parties-1.jpg" },
  { slug: "saxofonista-alcudia", priority: "0.85", image: "assets/img/alcudia-1.jpg" },
  { slug: "saxofonista-palma", priority: "0.85", image: "assets/img/palma-1.jpg" }
];
const pageMap = Object.fromEntries(pages.map((page) => [page.slug, page]));

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "contenido.js"), "utf8"), context);
const contenido = context.window.contenidoLanding;
const seoPages = contenido.seoPages || {};

function pageUrl(slug, lang) {
  const prefix = langMeta[lang].pathPrefix;
  return `${siteBase}/${prefix ? `${prefix}/` : ""}${slug}/`;
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

function ensureMeta(html, selector, content) {
  const attr = selector.startsWith("property=") ? "property" : "name";
  const key = selector.match(/"([^"]+)"/)[1];
  const re = new RegExp(`<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content="[^"]*">`);
  const tag = `    <meta ${attr}="${key}" content="${content}">`;
  if (re.test(html)) {
    return replaceMeta(html, selector, content);
  }
  return html.replace(/(\s*<meta name="viewport"[^>]*>)/, `$1\n${tag}`);
}

function ensureFaviconLinks(html) {
  const faviconUrl = `${siteBase}/assets/final_favicon.png`;
  const iconTag = `    <link rel="icon" type="image/png" sizes="240x240" href="${faviconUrl}">`;
  const appleTag = `    <link rel="apple-touch-icon" sizes="240x240" href="${faviconUrl}">`;
  let next = html.replace(/\s*<link rel="(?:shortcut )?icon"[^>]*>/g, "");
  next = next.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, "");
  return next.replace(/(\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">)/, `\n${iconTag}\n${appleTag}$1`);
}

function jsonLdScript(data) {
  return `    <script type="application/ld+json">\n${JSON.stringify(data, null, 6).replace(/^/gm, "      ")}\n    </script>`;
}

function schemaForPage(slug, lang, data) {
  const page = pageMap[slug];
  const currentUrl = pageUrl(slug, lang);
  const image = `${siteBase}/${page.image}`;
  const performerId = `${siteBase}/#jdl-sax`;
  const serviceId = `${currentUrl}#service`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "PerformingGroup",
      "@id": performerId,
      name: siteIdentity,
      alternateName: "JDL SAX",
      description: "Saxofonista en Mallorca para bodas, hoteles, eventos privados y pool parties con música de saxo en directo.",
      url: siteBase + "/",
      image,
      email: "mailto:elaltas@gmail.com",
      telephone: "+34 605 545 236",
      sameAs: [
        "https://www.youtube.com/@elaltas",
        "https://www.instagram.com/jesusdelalamasax/"
      ],
      areaServed: ["Mallorca", "Palma", "Alcúdia", "Pollença", "Can Picafort", "Cala Millor", "Port d’Alcúdia"],
      serviceType: "saxofonista para bodas, hoteles, eventos privados y pool parties"
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: langMeta[lang].homeLabel, item: siteBase + "/" },
        { "@type": "ListItem", position: 2, name: data.h1, item: currentUrl }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": serviceId,
      name: data.h1,
      description: data.description,
      serviceType: data.serviceType || "saxofonista para bodas, hoteles, eventos privados y pool parties",
      url: currentUrl,
      image,
      provider: { "@id": performerId },
      areaServed: ["Mallorca", "Palma", "Alcúdia", "Pollença", "Can Picafort", "Cala Millor", "Port d’Alcúdia"]
    }
  ];
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

function replaceImageAlts(html, data) {
  let next = html;
  next = replaceMeta(next, 'property="og:image:alt"', data.ogImageAlt);
  next = replaceMeta(next, 'name="twitter:image:alt"', data.ogImageAlt);
  if (data.heroImageAlt) {
    next = next.replace(/(<img class="hero-image"[^>]*alt=")[^"]*(")/, `$1${data.heroImageAlt}$2`);
  }
  if (Array.isArray(data.galleryAlts)) {
    let index = 0;
    next = next.replace(/(<figure class="seo-photo"[\s\S]*?<img[^>]*alt=")[^"]*(")/g, (match, start, end) => {
      const alt = data.galleryAlts[index++];
      return alt ? `${start}${alt}${end}` : match;
    });
  }
  return next;
}

function replaceJsonLd(html, slug, lang, data) {
  const schema = schemaForPage(slug, lang, data).map(jsonLdScript).join("\n");
  const withoutSchema = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  return withoutSchema.replace(/(\s*<\/head>)/, `\n${schema}$1`);
}

function replaceRelatedLinks(html, lang) {
  return html.replace(/<a class="seo-mini-link" href="([^"]+)"><span>[\s\S]*?<\/span><strong>[\s\S]*?<\/strong><\/a>/g, (match, href) => {
    const slug = (href.match(/(?:\.\.\/)?([^/]+)\/$/) || [])[1];
    const data = slug && seoPages[slug] && (seoPages[slug][lang] || seoPages[slug].es);
    if (!data) return match;
    const label = data.heroEyebrow || data.h1;
    return `<a class="seo-mini-link" href="${href}"><span>${label}</span><strong>${data.h1}</strong></a>`;
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
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${siteIdentity}</title>`);
  html = ensureMeta(html, 'name="application-name"', siteIdentity);
  html = ensureMeta(html, 'name="apple-mobile-web-app-title"', siteIdentity);
  html = ensureFaviconLinks(html);
  html = replaceMeta(html, 'name="description"', data.description);
  html = replaceMeta(html, 'property="og:locale"', data.ogLocale || langMeta[lang].locale);
  html = replaceMeta(html, 'property="og:title"', siteIdentity);
  html = replaceMeta(html, 'property="og:description"', data.ogDescription || data.description);
  html = replaceMeta(html, 'property="og:url"', pageUrl(slug, lang));
  html = replaceMeta(html, 'property="og:site_name"', siteIdentity);
  html = replaceMeta(html, 'name="twitter:title"', data.ogTitle || data.title);
  html = replaceMeta(html, 'name="twitter:description"', data.twitterDescription || data.ogDescription || data.description);
  html = replaceImageAlts(html, data);

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
  html = replaceRelatedLinks(html, lang);

  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<p class="eyebrow">)[\s\S]*?(<\/p>)/, `$1${data.asideEyebrow}$2`);
  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<p class="eyebrow">[\s\S]*?<\/p>\s*<p>)[\s\S]*?(<\/p>)/, `$1${data.asideText}$2`);
  html = html.replace(/(<aside class="seo-side-panel"[\s\S]*?<a class="text-link"[^>]*>)[\s\S]*?(<\/a>)/, `$1${data.asideCta}$2`);

  html = applyLanguageUrls(html, slug, lang);
  html = replaceJsonLd(html, slug, lang, data);

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
  ...pages.flatMap((page) => langs.map((lang) => {
    const data = seoPages[page.slug][lang] || seoPages[page.slug].es;
    return sitemapEntry(pageUrl(page.slug, lang), page.priority, page.image, data.h1, page.slug);
  })),
  sitemapEntry(`${siteBase}/repertorio/`, "0.7", "repertorio/assets/share-preview.jpg?v=20260526", "Repertorio de saxo para eventos")
].join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);
