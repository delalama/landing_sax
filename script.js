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

const year = document.querySelector("#year");
const bookingForm = document.querySelector("#bookingForm");
const siteHeader = document.querySelector(".site-header");
const revealElements = document.querySelectorAll("[data-reveal]");

if (year) {
  year.textContent = new Date().getFullYear();
}

function leerContenido(key) {
  return textos[key] || contenido[key] || "";
}

function aplicarIdioma(nuevoIdioma) {
  idiomaActivo = idiomas[nuevoIdioma] ? nuevoIdioma : "es";
  textos = idiomas[idiomaActivo] || idiomas.es || {};
  localStorage.setItem("landingIdioma", idiomaActivo);
  document.documentElement.lang = idiomaActivo;
  document.title = "Jesús Sax";

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && leerContenido("metaDescripcion")) {
    metaDescription.setAttribute("content", leerContenido("metaDescripcion"));
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

  document.querySelectorAll("[data-email-link]").forEach((element) => {
    element.href = `mailto:${bookingEmail}`;
    element.textContent = bookingEmail;
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    const isActive = button.dataset.lang === idiomaActivo;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => aplicarIdioma(button.dataset.lang));
});

aplicarIdioma(idiomaActivo);

function actualizarHeaderEnScroll() {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
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

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const name = formData.get("name");
    const email = formData.get("email");
    const date = formData.get("date") || leerContenido("fechaPorConfirmar") || "Por confirmar";
    const message = formData.get("message");

    const subject = encodeURIComponent(`${leerContenido("asuntoBooking") || "Solicitud de booking"} - ${name}`);
    const body = encodeURIComponent(
      `Nombre: ${name}\nEmail: ${email}\nFecha del evento: ${date}\n\nMensaje:\n${message}`
    );

    window.location.href = `mailto:${bookingEmail}?subject=${subject}&body=${body}`;
  });
}
