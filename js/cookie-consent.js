/**
 * Visual Mathematics Lab - Lightweight Cookie Consent & Privacy Manager
 * Compliant with GDPR (EU/UK), POPIA (South Africa), CCPA/CPRA (California), and COPPA.
 * Zero external dependencies. Fully integrated with Google Consent Mode v2 and i18n.
 * Implements essential technical analytics by default with one-click user opt-out in Cookie Settings.
 */

import { getConsentStatus, updateConsent } from "./analytics.js";
import { t } from "./i18n.js";

let bannerMounted = false;
let currentBannerMode = "notice"; // "notice" | "settings"

function route(root, path) {
  return `${root}/${path}`.replace(/\/{2,}/g, "/");
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Render the informative notice banner.
 * In this mode, users can accept analytics or open Cookie Settings to manage preferences.
 * Direct opt-out is only available within Cookie Settings.
 * @param {HTMLElement} banner
 * @param {string} root
 */
function renderCookieNotice(banner, root) {
  banner.classList.remove("cookie-banner--settings");

  const title = t("cookie.title", {}, "Cookie & Privacy Choices");
  const text = t("cookie.text", {}, "Visual Mathematics Lab uses privacy-preserving, aggregated technical analytics to monitor visualizer performance, screen dimensions, and mathematical rendering reliability. Analytics are active by default to support app functionality, but you can opt out at any time in Cookie Settings.");
  const acceptLabel = t("cookie.accept", {}, "Accept Analytics");
  const settingsLabel = t("cookie.settings", {}, "Cookie Settings");
  const policyLabel = t("cookie.policy_link", {}, "Privacy Policy");

  banner.innerHTML = `
    <div class="cookie-banner__inner">
      <div class="cookie-banner__content">
        <div class="cookie-banner__header">
          <svg class="cookie-banner__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h2 class="cookie-banner__title">${escapeHtml(title)}</h2>
        </div>
        <p class="cookie-banner__text">${escapeHtml(text)}</p>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="button button--primary cookie-btn" id="btn-cookie-accept">${escapeHtml(acceptLabel)}</button>
        <button type="button" class="button button--secondary cookie-btn" id="btn-cookie-settings">${escapeHtml(settingsLabel)}</button>
        <a href="${route(root, "privacy.html")}" class="cookie-banner__policy-link">${escapeHtml(policyLabel)} &rarr;</a>
      </div>
    </div>
  `;

  const btnAccept = banner.querySelector("#btn-cookie-accept");
  const btnSettings = banner.querySelector("#btn-cookie-settings");

  if (btnAccept) {
    btnAccept.addEventListener("click", () => {
      updateConsent(true);
      closeCookieBanner();
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      mountCookieBanner(root, "settings");
    });
  }
}

/**
 * Render the dedicated Cookie Settings modal.
 * Users can review categories and explicitly opt out of technical analytics here.
 * @param {HTMLElement} banner
 * @param {string} root
 */
function renderCookieSettings(banner, root) {
  banner.classList.add("cookie-banner--settings");

  const title = t("cookie.manage", {}, "Manage Cookie Preferences");
  const acceptLabel = t("cookie.accept", {}, "Accept Analytics");
  const declineLabel = t("cookie.decline", {}, "Decline Non-Essential");
  const closeLabel = t("cookie.close", {}, "Close");
  const policyLabel = t("cookie.policy_link", {}, "Privacy Policy");
  const essentialTitle = t("cookie.essential_title", {}, "Strictly Necessary");
  const essentialDesc = t("cookie.essential_desc", {}, "Required for mathematical rendering, interaction state, and language selection. Always active.");
  const alwaysActiveLabel = t("cookie.always_active", {}, "Always Active");
  const analyticsTitle = t("cookie.analytics_title", {}, "Technical Analytics");
  const analyticsDesc = t("cookie.analytics_desc", {}, "Aggregated, privacy-preserving performance telemetry used to monitor visualizer reliability. Active by default; you can opt out here.");

  const currentStatus = getConsentStatus();
  const isDenied = currentStatus === "denied";
  const statusLabel = isDenied
    ? t("cookie.status_denied", {}, "Status: Analytics Blocked")
    : t("cookie.status_granted", {}, "Status: Analytics Allowed");

  banner.innerHTML = `
    <div class="cookie-banner__inner cookie-banner__inner--settings">
      <div class="cookie-banner__content">
        <div class="cookie-banner__header">
          <svg class="cookie-banner__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h2 class="cookie-banner__title">${escapeHtml(title)}</h2>
          <button type="button" class="cookie-banner__close-icon" id="btn-cookie-close-icon" aria-label="${escapeHtml(closeLabel)}">&times;</button>
        </div>
        <div class="cookie-settings__categories">
          <div class="cookie-settings__category">
            <div class="cookie-settings__category-header">
              <span class="cookie-settings__category-name">${escapeHtml(essentialTitle)}</span>
              <span class="cookie-settings__badge cookie-settings__badge--active">${escapeHtml(alwaysActiveLabel)}</span>
            </div>
            <p class="cookie-banner__text">${escapeHtml(essentialDesc)}</p>
          </div>
          <div class="cookie-settings__category">
            <div class="cookie-settings__category-header">
              <span class="cookie-settings__category-name">${escapeHtml(analyticsTitle)}</span>
              <span class="cookie-settings__badge ${isDenied ? 'cookie-settings__badge--denied' : 'cookie-settings__badge--active'}" id="cookie-settings-status">${escapeHtml(statusLabel)}</span>
            </div>
            <p class="cookie-banner__text">${escapeHtml(analyticsDesc)}</p>
          </div>
        </div>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="button button--secondary cookie-btn" id="btn-cookie-decline">${escapeHtml(declineLabel)}</button>
        <button type="button" class="button button--primary cookie-btn" id="btn-cookie-accept">${escapeHtml(acceptLabel)}</button>
        <button type="button" class="button button--ghost cookie-btn" id="btn-cookie-close">${escapeHtml(closeLabel)}</button>
        <a href="${route(root, "privacy.html")}" class="cookie-banner__policy-link">${escapeHtml(policyLabel)} &rarr;</a>
      </div>
    </div>
  `;

  const btnAccept = banner.querySelector("#btn-cookie-accept");
  const btnDecline = banner.querySelector("#btn-cookie-decline");
  const btnClose = banner.querySelector("#btn-cookie-close");
  const btnCloseIcon = banner.querySelector("#btn-cookie-close-icon");

  if (btnAccept) {
    btnAccept.addEventListener("click", () => {
      updateConsent(true);
      closeCookieBanner();
    });
  }

  if (btnDecline) {
    btnDecline.addEventListener("click", () => {
      updateConsent(false);
      closeCookieBanner();
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      closeCookieBanner();
    });
  }

  if (btnCloseIcon) {
    btnCloseIcon.addEventListener("click", () => {
      closeCookieBanner();
    });
  }
}

/**
 * Build or update the cookie banner DOM.
 * @param {string} [root='.']
 * @param {'notice'|'settings'} [mode=currentBannerMode]
 */
export function mountCookieBanner(root = ".", mode = currentBannerMode) {
  currentBannerMode = mode;
  let banner = document.getElementById("vml-cookie-banner");
  if (!banner) {
    banner = document.createElement("aside");
    banner.id = "vml-cookie-banner";
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-label", "Cookie & Privacy Choices");
    document.body.appendChild(banner);
    bannerMounted = true;
  }

  banner.hidden = false;
  banner.classList.remove("is-closing");

  if (mode === "settings") {
    renderCookieSettings(banner, root);
  } else {
    renderCookieNotice(banner, root);
  }
}

/**
 * Open the cookie preferences banner/modal in explicit settings mode.
 * @param {string} [root='.']
 * @param {'notice'|'settings'} [mode='settings']
 */
export function openCookieBanner(root = ".", mode = "settings") {
  const rootDir = document.body?.dataset?.root || root;
  currentBannerMode = mode;
  mountCookieBanner(rootDir, mode);
  const banner = document.getElementById("vml-cookie-banner");
  if (banner) {
    banner.hidden = false;
    banner.classList.remove("is-closing");
    if (mode === "settings") {
      const declineBtn = banner.querySelector("#btn-cookie-decline");
      if (declineBtn) declineBtn.focus();
    } else {
      const acceptBtn = banner.querySelector("#btn-cookie-accept");
      if (acceptBtn) acceptBtn.focus();
    }
  }
}

/**
 * Convenience alias to open the Cookie Settings modal directly.
 * @param {string} [root='.']
 */
export function openCookieSettings(root = ".") {
  openCookieBanner(root, "settings");
}

/**
 * Close and dismiss the cookie preferences banner.
 */
export function closeCookieBanner() {
  const banner = document.getElementById("vml-cookie-banner");
  if (banner) {
    banner.classList.add("is-closing");
    setTimeout(() => {
      banner.hidden = true;
      banner.classList.remove("is-closing");
    }, 200);
  }
}

/**
 * Initialize cookie consent handling on page load.
 * In the opt-out model, displays the informative banner if the user has not yet acknowledged or chosen (status === null).
 * Opt-out is accessible by explicitly opening Cookie Settings.
 * @param {string} [root='.']
 */
export function initCookieConsent(root = ".") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const rootDir = document.body?.dataset?.root || root;
  const status = getConsentStatus();

  // If user has not yet recorded consent choice or acknowledgement, display notice banner
  if (status === null) {
    mountCookieBanner(rootDir, "notice");
  }

  // Wire any trigger buttons with [data-cookie-settings] or [data-action="cookie-settings"]
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-cookie-settings], [data-action='cookie-settings']");
    if (trigger) {
      e.preventDefault();
      openCookieBanner(rootDir, "settings");
    }
  });

  // Re-translate banner when locale changes
  window.addEventListener("vml:locale-changed", () => {
    const banner = document.getElementById("vml-cookie-banner");
    if (banner && !banner.hidden) {
      mountCookieBanner(rootDir, currentBannerMode);
    }
  });

  // Initialize interactive privacy manager if present on page (e.g. privacy.html)
  initPrivacyManager();
}

/**
 * Wire interactive privacy controls on privacy.html with live i18n support.
 */
export function initPrivacyManager() {
  const allowBtn = document.getElementById("privacy-btn-allow");
  const blockBtn = document.getElementById("privacy-btn-block");
  const statusEl = document.getElementById("privacy-consent-status");

  if (!allowBtn && !blockBtn && !statusEl) return;

  function updateStatusDisplay() {
    if (!statusEl) return;
    const current = getConsentStatus();
    if (current === "denied") {
      statusEl.textContent = t("cookie.status_denied", {}, "Status: Analytics Blocked");
      statusEl.style.color = "#f43f5e";
    } else if (current === "granted") {
      statusEl.textContent = t("cookie.status_granted", {}, "Status: Analytics Allowed");
      statusEl.style.color = "#22c55e";
    } else {
      statusEl.textContent = t("cookie.status_unset", {}, "Status: Not Yet Chosen");
      statusEl.style.color = "#94a3b8";
    }
    if (allowBtn) {
      allowBtn.textContent = t("cookie.accept", {}, "Accept Analytics");
    }
    if (blockBtn) {
      blockBtn.textContent = t("cookie.decline", {}, "Decline Non-Essential");
    }
  }

  if (allowBtn && !allowBtn._hasPrivacyBound) {
    allowBtn._hasPrivacyBound = true;
    allowBtn.addEventListener("click", () => {
      updateConsent(true);
      updateStatusDisplay();
    });
  }

  if (blockBtn && !blockBtn._hasPrivacyBound) {
    blockBtn._hasPrivacyBound = true;
    blockBtn.addEventListener("click", () => {
      updateConsent(false);
      updateStatusDisplay();
    });
  }

  updateStatusDisplay();
  window.addEventListener("vml:locale-changed", updateStatusDisplay);
  window.addEventListener("vml:consent-updated", updateStatusDisplay);
  window.addEventListener("vml:consent-changed", updateStatusDisplay);
}
