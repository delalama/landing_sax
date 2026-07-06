const contenido = window.contenidoLanding || {};
const idiomas = contenido.idiomas || {};
const idiomaGuardado = localStorage.getItem("landingIdioma");
const idiomaNavegador = navigator.language ? navigator.language.slice(0, 2) : "";
document.documentElement.classList.add("js-motion");
const shouldLocalizePage = document.documentElement.hasAttribute("data-localized");
const seoPageKey = document.documentElement.dataset.seoPage || "";
const seoPages = contenido.seoPages || {};
const seoPageDefaultLang = seoPageKey ? document.documentElement.lang || "es" : "";
let idiomaActivo =
  seoPageDefaultLang ||
  idiomaGuardado ||
  (idiomas[idiomaNavegador] ? idiomaNavegador : contenido.idiomaInicial) ||
  "es";
let textos = idiomas[idiomaActivo] || idiomas.es || {};
const bookingEmail = contenido.emailBooking || "tuemail@example.com";

const bookingEmailElement = document.querySelector("[data-booking-email]");
const copyButtons = document.querySelectorAll("[data-copy-value]");
const siteHeader = document.querySelector(".site-header");
const backToTop = document.querySelector(".back-to-top");
const revealElements = document.querySelectorAll("[data-reveal]");
const repertoireUrl = "repertorio/";

function leerContenido(key) {
  return textos[key] || contenido[key] || "";
}

function resaltarRepertorio(element, text) {
  const match = text.match(/(Repertorio|repertoire|Repertoire|RÃ©pertoire|Répertoire)/);
  if (!match || match.index === undefined) {
    element.textContent = text;
    return;
  }

  const link = document.createElement("a");
  link.className = "repertoire-link";
  link.href = repertoireUrl;
  link.textContent = match[0];

  element.replaceChildren(
    document.createTextNode(text.slice(0, match.index)),
    link,
    document.createTextNode(text.slice(match.index + match[0].length))
  );
}

function aplicarIdioma(nuevoIdioma) {
  idiomaActivo = idiomas[nuevoIdioma] ? nuevoIdioma : "es";
  textos = idiomas[idiomaActivo] || idiomas.es || {};
  localStorage.setItem("landingIdioma", idiomaActivo);

  if (shouldLocalizePage) {
    document.documentElement.lang = idiomaActivo;
  }

  document.querySelectorAll("[data-content]").forEach((element) => {
    const value = leerContenido(element.dataset.content);
    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-list]").forEach((element) => {
    const list = leerContenido(element.dataset.list);
    const index = Number(element.dataset.index);
    if (Array.isArray(list) && list[index]) {
      if (element.hasAttribute("data-repertoire-link")) {
        resaltarRepertorio(element, list[index]);
      } else {
        element.textContent = list[index];
      }
    }
  });

  document.querySelectorAll("[data-placeholder]").forEach((element) => {
    const value = leerContenido(element.dataset.placeholder);
    if (value) {
      element.setAttribute("placeholder", value);
    }
  });

  document.querySelectorAll("[data-link]").forEach((element) => {
    const url = contenido[element.dataset.link];
    if (url) {
      element.href = url;
    }
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    const isActive = button.dataset.lang === idiomaActivo;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  actualizarEmailBooking();
  aplicarSeoPageIdioma();
}

function actualizarEmailBooking() {
  if (bookingEmailElement) {
    bookingEmailElement.textContent = bookingEmail;
  }

  copyButtons.forEach((button) => {
    const contentKey =
      button.dataset.content ||
      (button.dataset.copyValue && button.dataset.copyValue.includes("+") ? "copiarTelefono" : "copiarEmail");
    button.textContent = leerContenido(contentKey) || button.dataset.copyLabel || button.textContent;
  });
}

function actualizarMeta(selector, value) {
  const element = document.head.querySelector(selector);
  if (element && value) {
    element.setAttribute("content", value);
  }
}

function escribirTexto(selector, value, root = document) {
  const element = root.querySelector(selector);
  if (element && value) {
    element.textContent = value;
  }
}

function aplicarSeoPageIdioma() {
  const pageSet = seoPages[seoPageKey];
  if (!pageSet) {
    return;
  }

  const page = pageSet[idiomaActivo] || pageSet.es;
  if (!page) {
    return;
  }

  if (page.title) {
    document.title = page.title;
    actualizarMeta('meta[property="og:title"]', page.ogTitle || page.title.replace(" | Jesús de la Lama - JDL SAX", " | JDL SAX"));
    actualizarMeta('meta[name="twitter:title"]', page.ogTitle || page.title.replace(" | Jesús de la Lama - JDL SAX", " | JDL SAX"));
  }

  actualizarMeta('meta[name="description"]', page.description);
  actualizarMeta('meta[property="og:description"]', page.ogDescription || page.description);
  actualizarMeta('meta[name="twitter:description"]', page.twitterDescription || page.ogDescription || page.description);
  const ogLocales = { es: "es_ES", en: "en_US", de: "de_DE", fr: "fr_FR" };
  actualizarMeta('meta[property="og:locale"]', page.ogLocale || ogLocales[idiomaActivo] || "es_ES");

  escribirTexto(".hero-content .eyebrow", page.heroEyebrow);
  escribirTexto(".hero-content h1", page.h1);
  escribirTexto(".hero-content .hero-copy", page.heroCopy);
  escribirTexto(".main-actions .social-kicker", page.ctaKicker);

  const copy = document.querySelector(".seo-rich-copy");
  if (copy) {
    escribirTexto("h2", page.copyTitle, copy);
    const paragraphs = copy.querySelectorAll("p");
    if (page.copyParagraphs) {
      paragraphs.forEach((paragraph, index) => {
        if (page.copyParagraphs[index]) {
          paragraph.textContent = page.copyParagraphs[index];
        }
      });
    }
    escribirTexto("h3", page.listTitle, copy);
    const items = copy.querySelectorAll(".seo-list li");
    if (page.listItems) {
      items.forEach((item, index) => {
        if (page.listItems[index]) {
          item.textContent = page.listItems[index];
        }
      });
    }
  }

  const aside = document.querySelector(".seo-side-panel");
  if (aside) {
    escribirTexto(".eyebrow", page.asideEyebrow, aside);
    const asideText = aside.querySelector(":scope > p:not(.eyebrow)");
    if (asideText && page.asideText) {
      asideText.textContent = page.asideText;
    }
    escribirTexto(".text-link", page.asideCta, aside);
  }

  escribirTexto(".seo-gallery-section .section-heading .eyebrow", page.galleryEyebrow);
  escribirTexto(".seo-gallery-section .section-heading h2", page.galleryTitle);
  escribirTexto(".seo-crosslinks-section .section-heading .eyebrow", page.relatedEyebrow);
  escribirTexto(".seo-crosslinks-section .section-heading h2", page.relatedTitle);
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.langUrl && button.dataset.langUrl !== window.location.href) {
      localStorage.setItem("landingIdioma", button.dataset.lang);
      window.location.href = button.dataset.langUrl;
      return;
    }

    aplicarIdioma(button.dataset.lang);
  });
});

aplicarIdioma(idiomaActivo);

function actualizarHeaderEnScroll() {
  const isScrolled = window.scrollY > 12;

  if (siteHeader) {
    siteHeader.classList.toggle("is-scrolled", isScrolled);
  }

  if (backToTop) {
    backToTop.classList.toggle("is-visible", isScrolled);
  }
}

function activarRevelado() {
  if (!revealElements.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
  );

  revealElements.forEach((element) => {
    if (!element.classList.contains("is-visible")) {
      observer.observe(element);
    }
  });
}

actualizarHeaderEnScroll();
activarRevelado();
window.addEventListener("scroll", actualizarHeaderEnScroll, { passive: true });

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copyValue);
      const successKey =
        button.dataset.content === "copiarTelefono" ||
        (button.dataset.copyValue && button.dataset.copyValue.includes("+"))
          ? "telefonoCopiado"
          : "emailCopiado";
      button.textContent = leerContenido(successKey) || button.dataset.copySuccess || "Copiado";
      window.setTimeout(actualizarEmailBooking, 1800);
    } catch (error) {
      actualizarEmailBooking();
    }
  });
});
