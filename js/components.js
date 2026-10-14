import SITE_CONFIG, { hasConfiguredUrl } from "../config/site-config.js?v=20260523";
import { trackEvent } from "./analytics.js?v=20260523";

function route(root, path) {
  return `${root}/${path}`.replace(/\/{2,}/g, "/");
}

function currentPage() {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  return pathname.split("/").pop() || "index.html";
}

export function mountSharedChrome() {
  const root = document.body.dataset.root || ".";
  const page = currentPage();
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");

  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <a class="brand" href="${route(root, "index.html")}">${SITE_CONFIG.site.name}</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="${route(root, "index.html")}" ${page === "index.html" ? 'aria-current="page"' : ""}>Visuals</a>
        <a href="${route(root, "about.html")}" ${page === "about.html" ? 'aria-current="page"' : ""}>About</a>
        <a href="${route(root, "contact.html")}" ${page === "contact.html" ? 'aria-current="page"' : ""}>Contact</a>
      </nav>
    `;
  }

  if (footer) {
    const supportLink = hasConfiguredUrl(SITE_CONFIG.buyMeACoffee.profileUrl)
      ? `<a data-support-link href="${SITE_CONFIG.buyMeACoffee.profileUrl}" target="_blank" rel="noopener noreferrer">Support the project</a>`
      : "";
    footer.className = "site-footer";
    const links = [supportLink, `<a href="${route(root, "privacy.html")}">Privacy</a>`].filter(Boolean).join(' &middot; ');
    footer.innerHTML = `
      <div class="site-footer__main">
        <span>&copy; ${new Date().getFullYear()} ${SITE_CONFIG.site.name}</span>
        <span>${links}</span>
      </div>
      <div class="site-footer__disclaimer" role="note">
        <p><strong>Disclaimer:</strong> Use of this product is at your own discretion. Neither the authors, contributors, nor Visual Mathematics Lab shall be held liable or responsible for any material loss or damages associated with the use of the app. The product may contain occasional inconsistencies in the colour grammar to visual canvas component mapping; users should interpret all figures, measurements, and derivations with discretion.</p>
      </div>
    `;
  }

  document.querySelectorAll("[data-support-container]").forEach((container) => {
    if (!hasConfiguredUrl(SITE_CONFIG.buyMeACoffee.profileUrl)) {
      container.innerHTML = '<p class="notice">Support links will be available once the project profile is configured.</p>';
      return;
    }

    container.innerHTML = `
      <section class="support-panel" aria-labelledby="support-heading">
        <div class="support-panel__content">
          <p class="support-panel__eyebrow">Support</p>
          <h2 id="support-heading" class="support-panel__heading">Support the project</h2>
          <p class="support-panel__text">Visual Mathematics Lab is independently made. Your support helps fund new interactive proofs and keeps this lab accessible to all learners.</p>
        </div>
        <div class="support-panel__action">
          <a class="button button--support" data-support-link href="${SITE_CONFIG.buyMeACoffee.profileUrl}" target="_blank" rel="noopener noreferrer">
            <svg class="support-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
            <span>Buy me a coffee</span>
          </a>
        </div>
      </section>
    `;
  });

  document.querySelectorAll("[data-support-link]").forEach((link) => {
    link.addEventListener("click", () => trackEvent("support_click", { page_path: window.location.pathname }));
  });
}
