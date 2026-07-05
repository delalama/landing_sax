(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-FT710YLQTN";
  var CONSENT_KEY = "jdl_analytics_consent";
  var isConfigured = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";
  var isLocal = /^(localhost|127\.0\.0\.1|)$/i.test(window.location.hostname);
  var params = new URLSearchParams(window.location.search);
  var isDebug = params.has("analytics_debug");

  if (!isConfigured || isLocal) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  function getConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (error) {
      return "denied";
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (error) {
      return;
    }
  }

  function clearConsent() {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch (error) {
      return;
    }
  }

  function trackLeadClick(link) {
    if (typeof window.gtag !== "function" || getConsent() !== "granted") {
      return;
    }

    var href = link.href || "";
    var label = "outbound";

    if (href.indexOf("wa.me") !== -1 || href.indexOf("whatsapp") !== -1) {
      label = "whatsapp";
    } else if (href.indexOf("mailto:") === 0) {
      label = "email";
    } else if (href.indexOf("tel:") === 0) {
      label = "phone";
    } else if (href.indexOf("instagram.com") !== -1) {
      label = "instagram";
    } else if (href.indexOf("youtube.com") !== -1 || href.indexOf("youtu.be") !== -1) {
      label = "youtube";
    }

    window.gtag("event", "lead_click", {
      event_category: "engagement",
      event_label: label,
      link_url: href
    });
  }

  function addClickTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("a[href]");
      if (!link) {
        return;
      }

      var href = link.href || "";
      if (
        href.indexOf("wa.me") !== -1 ||
        href.indexOf("whatsapp") !== -1 ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("tel:") === 0 ||
        href.indexOf("instagram.com") !== -1 ||
        href.indexOf("youtube.com") !== -1 ||
        href.indexOf("youtu.be") !== -1
      ) {
        trackLeadClick(link);
      }
    });
  }

  function injectConsentStyles() {
    if (document.getElementById("jdl-consent-style")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "jdl-consent-style";
    style.textContent =
      ".jdl-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:860px;margin:auto;padding:16px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:#111;color:#fff;box-shadow:0 18px 48px rgba(0,0,0,.28);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.jdl-consent__row{display:flex;gap:16px;align-items:center;justify-content:space-between}.jdl-consent h2{margin:0 0 4px;font:800 15px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.jdl-consent p{margin:0;color:rgba(255,255,255,.82)}.jdl-consent__actions{display:flex;gap:8px;flex:0 0 auto}.jdl-consent button{border:0;border-radius:6px;padding:9px 12px;font:700 13px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}.jdl-consent__accept{background:#f7c66b;color:#15110a}.jdl-consent__reject,.jdl-consent__settings,.jdl-consent__save{background:#2d2d2d;color:#fff}.jdl-consent__panel{display:none;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.14)}.jdl-consent.is-open .jdl-consent__panel{display:block}.jdl-consent__option{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px}.jdl-consent__option input{width:18px;height:18px;margin:1px 0 0;accent-color:#f7c66b}.jdl-consent__option strong{display:block;margin-bottom:2px}.jdl-consent__panel-actions{display:flex;justify-content:flex-end}@media (max-width:680px){.jdl-consent__row{flex-direction:column;align-items:stretch}.jdl-consent__actions{justify-content:flex-end;flex-wrap:wrap}}";
    document.head.appendChild(style);
  }

  function showConsentBanner() {
    if (document.querySelector(".jdl-consent")) {
      return;
    }

    injectConsentStyles();

    var banner = document.createElement("div");
    banner.className = "jdl-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferencias de cookies");
    banner.innerHTML =
      '<div class="jdl-consent__row">' +
      "<div>" +
      "<h2>Cookies</h2>" +
      "<p>Usamos cookies analiticas para saber de donde llegan las visitas y mejorar la web.</p>" +
      "</div>" +
      '<div class="jdl-consent__actions">' +
      '<button class="jdl-consent__reject" type="button">Rechazar</button>' +
      '<button class="jdl-consent__settings" type="button" aria-expanded="false">Configurar</button>' +
      '<button class="jdl-consent__accept" type="button">Aceptar</button>' +
      "</div>" +
      "</div>" +
      '<div class="jdl-consent__panel" aria-hidden="true">' +
      '<label class="jdl-consent__option">' +
      '<input type="checkbox" class="jdl-consent__analytics" checked>' +
      "<span><strong>Cookies analiticas</strong>Nos ayudan a medir visitas, origen del trafico y clics de contacto. Puedes rechazarlas sin que la web deje de funcionar.</span>" +
      "</label>" +
      '<div class="jdl-consent__panel-actions">' +
      '<button class="jdl-consent__save" type="button">Guardar preferencias</button>' +
      "</div>" +
      "</div>";

    var settingsButton = banner.querySelector(".jdl-consent__settings");
    var panel = banner.querySelector(".jdl-consent__panel");
    var analyticsCheckbox = banner.querySelector(".jdl-consent__analytics");

    settingsButton.addEventListener("click", function () {
      var isOpen = banner.classList.toggle("is-open");
      settingsButton.setAttribute("aria-expanded", String(isOpen));
      panel.setAttribute("aria-hidden", String(!isOpen));
    });

    banner.querySelector(".jdl-consent__accept").addEventListener("click", function () {
      setConsent("granted");
      banner.remove();
    });

    banner.querySelector(".jdl-consent__reject").addEventListener("click", function () {
      setConsent("denied");
      banner.remove();
    });

    banner.querySelector(".jdl-consent__save").addEventListener("click", function () {
      if (analyticsCheckbox.checked) {
        setConsent("granted");
        banner.remove();
        return;
      }

      setConsent("denied");
      banner.remove();
    });

    document.body.appendChild(banner);
  }

  function init() {
    if (params.has("analytics_reset")) {
      clearConsent();
    }

    addClickTracking();

    if (isDebug && typeof window.gtag === "function") {
      window.gtag("set", "debug_mode", true);
    }

    var consent = getConsent();
    if (consent !== "granted" && consent !== "denied") {
      showConsentBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
