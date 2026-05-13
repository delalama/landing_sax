const contenido = window.contenidoLanding || {};
const idiomas = contenido.idiomas || {};
const idiomaGuardado = localStorage.getItem("landingIdioma");
const idiomaNavegador = navigator.language ? navigator.language.slice(0, 2) : "";
let idiomaActivo =
  idiomaGuardado ||
  (idiomas[idiomaNavegador] ? idiomaNavegador : contenido.idiomaInicial) ||
  "es";
let textos = idiomas[idiomaActivo] || idiomas.es || {};
const bookingEmail = contenido.emailBooking || "tuemail@example.com";

const year = document.querySelector("#year");
const bookingForm = document.querySelector("#bookingForm");

year.textContent = new Date().getFullYear();

function leerContenido(key) {
  return textos[key] || contenido[key] || "";
}

function aplicarIdioma(nuevoIdioma) {
  idiomaActivo = idiomas[nuevoIdioma] ? nuevoIdioma : "es";
  textos = idiomas[idiomaActivo] || idiomas.es || {};
  localStorage.setItem("landingIdioma", idiomaActivo);
  document.documentElement.lang = idiomaActivo;
  document.title = `${contenido.nombre || "Tu Nombre"} | ${contenido.profesion || "Saxofonista"}`;

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
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    bookingEmail
  )}&su=${subject}&body=${body}`;

  window.open(gmailUrl, "_blank", "noopener,noreferrer");
});
