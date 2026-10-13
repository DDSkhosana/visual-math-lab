import SITE_CONFIG, { hasMeasurementId } from "../config/site-config.js?v=20260523";

let initialized = false;

export function initializeAnalytics() {
  const measurementId = SITE_CONFIG.analytics.measurementId;
  if (initialized || !hasMeasurementId(measurementId)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
  initialized = true;
}

export function trackEvent(name, parameters = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}
