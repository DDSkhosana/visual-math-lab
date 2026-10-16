import SITE_CONFIG, { hasConfiguredUrl } from "../config/site-config.js?v=20260523";
import { trackEvent } from "./analytics.js?v=20260523";

const DEFAULT_VISUALS = [
  { slug: "thales-theorem", title: "Thales' Theorem", category: "Geometry" },
  { slug: "angle-at-centre", title: "Angle at the Centre Theorem", category: "Geometry" },
  { slug: "angles-in-same-segment", title: "Angles in the Same Segment", category: "Geometry" },
  { slug: "cyclic-quadrilateral", title: "Cyclic Quadrilateral Theorem", category: "Geometry" },
  { slug: "tangent-radius", title: "Tangent-Radius Perpendicularity", category: "Geometry" },
  { slug: "alternate-segment", title: "Alternate Segment Theorem", category: "Geometry" },
  { slug: "tangents-from-external-point", title: "Tangents from an External Point", category: "Geometry" },
  { slug: "perpendicular-chord-bisector", title: "Perpendicular Chord Bisector", category: "Geometry" },
];

function route(root, path) {
  return `${root}/${path}`.replace(/\/{2,}/g, "/");
}

function currentPage() {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  return pathname.split("/").pop() || "index.html";
}

function getActiveSlug() {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);
  const visualsIndex = segments.indexOf("visuals");
  if (visualsIndex !== -1 && visualsIndex + 1 < segments.length) {
    return segments[visualsIndex + 1].replace(/\.html$/, "");
  }
  return "";
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function renderVisualsList(root, visuals, activeSlug) {
  return visuals
    .map((v) => {
      const isActive = v.slug === activeSlug;
      const visualUrl = route(root, `visuals/${encodeURIComponent(v.slug)}/index.html`);
      return `
        <a href="${visualUrl}" class="site-nav__dropdown-item ${isActive ? "is-active" : ""}" role="menuitem" ${isActive ? 'aria-current="page"' : ""}>
          <span class="site-nav__dropdown-item-title">${escapeHtml(v.title)}</span>
          ${isActive ? '<span class="site-nav__dropdown-item-badge">Active</span>' : ""}
        </a>
      `;
    })
    .join("");
}

export function mountSharedChrome() {
  const root = document.body.dataset.root || ".";
  const page = currentPage();
  const activeSlug = getActiveSlug();
  const isHomePage = (page === "index.html" || page === "") && !activeSlug;
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");

  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <a class="brand" href="${route(root, "index.html")}">${SITE_CONFIG.site.name}</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="${route(root, "index.html")}" class="site-nav__link" ${isHomePage ? 'aria-current="page"' : ""}>Home</a>
        <div class="site-nav__dropdown" id="nav-visuals-dropdown">
          <button type="button" class="site-nav__dropdown-trigger" id="nav-visuals-btn" aria-haspopup="true" aria-expanded="false" aria-controls="nav-visuals-menu" title="Browse visualisations">
            <span>Visuals</span>
            <svg class="site-nav__caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="site-nav__dropdown-menu" id="nav-visuals-menu" role="menu" aria-label="Visualisations list" hidden>
            <div class="site-nav__dropdown-header">
              <span class="site-nav__dropdown-title">Geometry Proofs</span>
              <span class="site-nav__dropdown-count" id="nav-visuals-count">${DEFAULT_VISUALS.length} Visuals</span>
            </div>
            <div class="site-nav__dropdown-list" id="nav-visuals-list" role="none">
              ${renderVisualsList(root, DEFAULT_VISUALS, activeSlug)}
            </div>
            <div class="site-nav__dropdown-footer">
              <a href="${route(root, "index.html#visuals")}" class="site-nav__dropdown-all-link">Browse Full Gallery &rarr;</a>
            </div>
          </div>
        </div>
        <a href="${route(root, "about.html")}" class="site-nav__link" ${page === "about.html" ? 'aria-current="page"' : ""}>About</a>
        <a href="${route(root, "contact.html")}" class="site-nav__link" ${page === "contact.html" ? 'aria-current="page"' : ""}>Contact</a>
      </nav>
    `;

    // Dropdown interaction logic
    const dropdown = header.querySelector("#nav-visuals-dropdown");
    const trigger = header.querySelector("#nav-visuals-btn");
    const menu = header.querySelector("#nav-visuals-menu");
    const list = header.querySelector("#nav-visuals-list");
    const count = header.querySelector("#nav-visuals-count");

    if (dropdown && trigger && menu) {
      const updateMenuPosition = () => {
        if (menu.hidden) return;
        if (typeof window === "undefined" || !trigger.getBoundingClientRect) return;
        const rect = trigger.getBoundingClientRect();
        if (!rect.width && !rect.height && !rect.top) return;

        const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1024);

        // If trigger has been scrolled off-screen horizontally, close menu
        if (rect.right < 0 || rect.left > viewportWidth) {
          closeMenu();
          return;
        }

        menu.style.position = "fixed";
        menu.style.top = `${Math.round(rect.bottom + 6)}px`;
        const menuWidth = menu.offsetWidth || 280;

        // Align right edge of menu to right edge of trigger button when possible
        const rightEdge = rect.right;
        const leftCandidate = rightEdge - menuWidth;
        const maxLeft = viewportWidth - menuWidth - 8;
        const finalLeft = Math.max(8, Math.min(leftCandidate, maxLeft));

        menu.style.left = `${Math.round(finalLeft)}px`;
        menu.style.right = "auto";
      };

      const openMenu = () => {
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        updateMenuPosition();
      };

      const closeMenu = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      };

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menu.hidden) {
          openMenu();
        } else {
          closeMenu();
        }
      });

      // Close when clicking outside
      document.addEventListener("pointerdown", (e) => {
        if (!dropdown.contains(e.target)) {
          closeMenu();
        }
      });

      if (typeof window !== "undefined") {
        window.addEventListener("resize", () => {
          if (!menu.hidden) updateMenuPosition();
        }, { passive: true });

        window.addEventListener("scroll", () => {
          if (!menu.hidden) updateMenuPosition();
        }, { passive: true });

        header.addEventListener("scroll", () => {
          if (!menu.hidden) updateMenuPosition();
        }, { passive: true });
      }

      // Keyboard navigation
      dropdown.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeMenu();
          trigger.focus();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (menu.hidden) {
            openMenu();
          }
          const items = Array.from(menu.querySelectorAll(".site-nav__dropdown-item"));
          const currentIndex = items.indexOf(document.activeElement);
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const items = Array.from(menu.querySelectorAll(".site-nav__dropdown-item"));
          const currentIndex = items.indexOf(document.activeElement);
          if (currentIndex > 0) {
            items[currentIndex - 1]?.focus();
          } else {
            trigger.focus();
          }
        }
      });

      // Asynchronously fetch live data/visuals.json to ensure any dynamic updates are synced
      fetch(route(root, "data/visuals.json"))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data) && list) {
            const published = data.filter((v) => v.published);
            if (published.length > 0) {
              list.innerHTML = renderVisualsList(root, published, activeSlug);
              if (count) count.textContent = `${published.length} Visuals`;
            }
          }
        })
        .catch(() => {
          // Gracefully keep DEFAULT_VISUALS fallback
        });
    }
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
