(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-FT710YLQTN";
  var CONSENT_KEY = "jdl_analytics_consent";
  var isConfigured = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";
  var isLocal = /^(localhost|127\.0\.0\.1|)$/i.test(window.location.hostname);

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

  function loadAnalytics() {
    if (document.querySelector('script[data-jdl-analytics="ga4"]')) {
      return;
    }

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: true
    });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    script.dataset.jdlAnalytics = "ga4";
    document.head.appendChild(script);
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
      ".jdl-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:space-between;max-width:760px;margin:auto;padding:14px 16px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:#111;color:#fff;box-shadow:0 18px 48px rgba(0,0,0,.28);font:14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.jdl-consent p{margin:0}.jdl-consent__actions{display:flex;gap:8px;flex:0 0 auto}.jdl-consent button{border:0;border-radius:6px;padding:9px 12px;font:700 13px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}.jdl-consent__accept{background:#f7c66b;color:#15110a}.jdl-consent__reject{background:#2d2d2d;color:#fff}@media (max-width:640px){.jdl-consent{flex-direction:column;align-items:stretch}.jdl-consent__actions{justify-content:flex-end}}";
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
    banner.setAttribute("aria-label", "Preferencias de analitica");
    banner.innerHTML =
      "<p>Usamos analitica para saber de donde llegan las visitas y mejorar la web.</p>" +
      '<div class="jdl-consent__actions">' +
      '<button class="jdl-consent__reject" type="button">Rechazar</button>' +
      '<button class="jdl-consent__accept" type="button">Aceptar</button>' +
      "</div>";

    banner.querySelector(".jdl-consent__accept").addEventListener("click", function () {
      setConsent("granted");
      banner.remove();
      loadAnalytics();
    });

    banner.querySelector(".jdl-consent__reject").addEventListener("click", function () {
      setConsent("denied");
      banner.remove();
    });

    document.body.appendChild(banner);
  }

  function init() {
    addClickTracking();

    var consent = getConsent();
    if (consent === "granted") {
      loadAnalytics();
      return;
    }

    if (consent !== "denied") {
      showConsentBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
