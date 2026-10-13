import { SITE_CONFIG } from "../config/site-config.js";

let initialized = false;

export function initializeAnalytics() {
  if (initialized || !/^G-[A-Z0-9]+$/i.test(SITE_CONFIG.analyticsId)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE_CONFIG.analyticsId)}`;
  document.head.append(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", SITE_CONFIG.analyticsId);
  initialized = true;
}

export function trackEvent(name, parameters = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}
