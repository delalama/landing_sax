const contenido = window.contenidoLanding || {};
const idiomas = contenido.idiomas || {};
const idiomaGuardado = localStorage.getItem("landingIdioma");
const idiomaNavegador = navigator.language ? navigator.language.slice(0, 2) : "";
document.documentElement.classList.add("js-motion");
let idiomaActivo =
  idiomaGuardado ||
  (idiomas[idiomaNavegador] ? idiomaNavegador : contenido.idiomaInicial) ||
  "es";
let textos = idiomas[idiomaActivo] || idiomas.es || {};
const bookingEmail = contenido.emailBooking || "tuemail@example.com";

const bookingEmailElement = document.querySelector("[data-booking-email]");
const copyEmailButton = document.querySelector(".booking-copy");
const siteHeader = document.querySelector(".site-header");
const backToTop = document.querySelector(".back-to-top");
const revealElements = document.querySelectorAll("[data-reveal]");

function leerContenido(key) {
  return textos[key] || contenido[key] || "";
}

function aplicarIdioma(nuevoIdioma) {
  idiomaActivo = idiomas[nuevoIdioma] ? nuevoIdioma : "es";
  textos = idiomas[idiomaActivo] || idiomas.es || {};
  localStorage.setItem("landingIdioma", idiomaActivo);
  document.documentElement.lang = idiomaActivo;
  document.title = "JDL SAX";

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute("content", "\u200b");
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
      element.textContent = list[index];
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
}

function actualizarEmailBooking() {
  if (bookingEmailElement) {
    bookingEmailElement.textContent = bookingEmail;
  }

  if (copyEmailButton) {
    copyEmailButton.textContent = leerContenido("copiarEmail") || "Copiar email";
  }
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => aplicarIdioma(button.dataset.lang));
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

if (copyEmailButton) {
  copyEmailButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bookingEmail);
      copyEmailButton.textContent = leerContenido("emailCopiado") || "Email copiado";
      window.setTimeout(actualizarEmailBooking, 1800);
    } catch (error) {
      actualizarEmailBooking();
    }
  });
}
