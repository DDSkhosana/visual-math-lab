import SITE_CONFIG, { hasMeasurementId } from "../config/site-config.js?v=20260523";

let initialized = false;

export const CONSENT_STORAGE_KEY = "vml_cookie_consent";

/**
 * Retrieve the current stored cookie consent status.
 * @returns {'granted'|'denied'|null}
 */
export function getConsentStatus() {
  if (typeof localStorage !== "undefined") {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Update user cookie consent for analytics under Google Consent Mode v2.
 * @param {boolean} granted
 */
export function updateConsent(granted) {
  const status = granted ? "granted" : "denied";
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
    } catch {
      // Ignore localStorage access quota or private browsing exceptions
    }
  }

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: status
    });
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("vml:consent-updated", { detail: { status, granted } }));
  }
}

/**
 * Initialize Google Analytics 4 with Google Consent Mode v2.
 * Enforces deny-by-default for non-essential analytics cookies, disables Google Signals,
 * disables ad personalization, and enables IP anonymization for COPPA/GDPR/POPIA compliance.
 */
export function initializeAnalytics() {
  const measurementId = SITE_CONFIG.analytics.measurementId;
  if (initialized || !hasMeasurementId(measurementId)) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Google Consent Mode v2 — Denied by default unless explicitly granted by user
  const savedConsent = getConsentStatus();
  const isGranted = savedConsent === "granted";

  window.gtag("consent", "default", {
    analytics_storage: isGranted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  // Strict COPPA & Student Privacy Hardening
  window.gtag("set", "allow_google_signals", false);
  window.gtag("set", "allow_ad_personalization_signals", false);
  window.gtag("set", "anonymize_ip", true);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  initialized = true;
}

/**
 * Dispatch an analytics event if gtag is initialized and consent permits.
 * @param {string} name
 * @param {Record<string, any>} [parameters]
 */
export function trackEvent(name, parameters = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, parameters);
  }
}
