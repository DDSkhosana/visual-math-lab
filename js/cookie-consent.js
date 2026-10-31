/**
 * Visual Mathematics Lab - Lightweight Cookie Consent & Privacy Manager
 * Compliant with GDPR (EU/UK), POPIA (South Africa), CCPA/CPRA (California), and COPPA.
 * Zero external dependencies. Fully integrated with Google Consent Mode v2 and i18n.
 * Implements essential technical analytics by default with one-click user opt-out.
 */

import { getConsentStatus, updateConsent } from "./analytics.js";
import { t } from "./i18n.js";

let bannerMounted = false;

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
 * Build or update the cookie banner DOM.
 * @param {string} [root='.']
 */
export function mountCookieBanner(root = ".") {
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

  const title = t("cookie.title", {}, "Cookie & Privacy Choices");
  const text = t("cookie.text", {}, "Visual Mathematics Lab uses privacy-preserving, aggregated technical analytics to monitor visualizer performance, screen dimensions, and mathematical rendering reliability. Analytics are active by default to support app functionality, but you can opt out at any time.");
  const acceptLabel = t("cookie.accept", {}, "Accept Analytics");
  const declineLabel = t("cookie.decline", {}, "Decline Non-Essential");
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
        <button type="button" class="button button--secondary cookie-btn" id="btn-cookie-decline">${escapeHtml(declineLabel)}</button>
        <button type="button" class="button button--primary cookie-btn" id="btn-cookie-accept">${escapeHtml(acceptLabel)}</button>
        <a href="${route(root, "privacy.html")}" class="cookie-banner__policy-link">${escapeHtml(policyLabel)} &rarr;</a>
      </div>
    </div>
  `;

  const btnAccept = banner.querySelector("#btn-cookie-accept");
  const btnDecline = banner.querySelector("#btn-cookie-decline");

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
}

/**
 * Open the cookie preferences banner/modal.
 * @param {string} [root='.']
 */
export function openCookieBanner(root = ".") {
  const rootDir = document.body?.dataset?.root || root;
  mountCookieBanner(rootDir);
  const banner = document.getElementById("vml-cookie-banner");
  if (banner) {
    banner.hidden = false;
    banner.classList.remove("is-closing");
    const acceptBtn = banner.querySelector("#btn-cookie-accept");
    if (acceptBtn) acceptBtn.focus();
  }
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
 * @param {string} [root='.']
 */
export function initCookieConsent(root = ".") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const rootDir = document.body?.dataset?.root || root;
  const status = getConsentStatus();

  // If user has not yet recorded consent choice or acknowledgement, display banner
  if (status === null) {
    mountCookieBanner(rootDir);
  }

  // Wire any trigger buttons with [data-cookie-settings] or [data-action="cookie-settings"]
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-cookie-settings], [data-action='cookie-settings']");
    if (trigger) {
      e.preventDefault();
      openCookieBanner(rootDir);
    }
  });

  // Re-translate banner when locale changes
  window.addEventListener("vml:locale-changed", () => {
    const banner = document.getElementById("vml-cookie-banner");
    if (banner && !banner.hidden) {
      mountCookieBanner(rootDir);
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
