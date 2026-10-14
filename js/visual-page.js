import { initializeAnalytics, trackEvent } from "./analytics.js?v=20260523";
import { mountSharedChrome } from "./components.js?v=20260523";

function currentSlug() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  if (segments.length && segments[segments.length - 1].endsWith(".html")) {
    segments.pop();
  }
  return segments.pop() || "";
}

function isValidYouTubeId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
}

async function getVisual(slug) {
  const response = await fetch("../../data/visuals.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Could not load visual metadata (${response.status}).`);
  }
  const visuals = await response.json();
  return visuals.find((visual) => visual.slug === slug && visual.published);
}

function renderVideo(visual) {
  const target = document.querySelector("[data-video]");
  if (!target || visual.video?.enabled !== true || !isValidYouTubeId(visual.youtubeId)) {
    return;
  }

  const title = `${visual.title} video`;
  target.innerHTML = `
    <section class="video-section" aria-labelledby="video-heading">
      <h2 id="video-heading">Watch the demonstration</h2>
      <iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/${visual.youtubeId}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </section>
  `;
  target.querySelector("iframe").addEventListener("load", () => trackEvent("youtube_click", { visual: visual.slug }));
}

function enhanceHeader(visual) {
  const header = document.querySelector("[data-site-header]");
  if (!header) {
    return;
  }

  const brand = header.querySelector(".brand");
  const nav = header.querySelector(".site-nav");

  const metaGroup = document.createElement("div");
  metaGroup.className = "site-header__visual-meta";
  metaGroup.innerHTML = `
    <span class="site-header__category">${visual.category}</span>
    <span class="site-header__separator">/</span>
    <span class="site-header__title">${visual.title}</span>
    <button type="button" class="site-header__info-btn" id="visual-info-btn" aria-label="About this visual" aria-expanded="false" title="Show visual information">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <span>Info</span>
    </button>
  `;

  if (brand && brand.nextSibling) {
    header.insertBefore(metaGroup, brand.nextSibling);
  } else if (nav) {
    header.insertBefore(metaGroup, nav);
  } else {
    header.appendChild(metaGroup);
  }

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.className = "site-header__collapse-btn";
  collapseBtn.id = "header-collapse-btn";
  collapseBtn.title = "Hide header (Maximize visual)";
  collapseBtn.setAttribute("aria-label", "Hide header to maximize visual");
  collapseBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
  `;
  if (nav) {
    nav.appendChild(collapseBtn);
  }
}

function setupHeaderAndModal(visual) {
  enhanceHeader(visual);

  const infoBtn = document.getElementById("visual-info-btn");
  const modal = document.getElementById("visual-info-modal");
  const closeBtn = document.getElementById("visual-info-close");
  const dismissBtn = document.getElementById("visual-info-dismiss");
  const scrollLink = document.getElementById("visual-info-scroll");
  const collapseBtn = document.getElementById("header-collapse-btn");
  const restoreBtn = document.getElementById("header-restore-btn");

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    if (infoBtn) infoBtn.setAttribute("aria-expanded", "true");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    if (infoBtn) {
      infoBtn.setAttribute("aria-expanded", "false");
      infoBtn.focus({ preventScroll: true });
    }
  }

  if (infoBtn) {
    infoBtn.addEventListener("click", () => {
      if (modal && modal.hidden) {
        openModal();
      } else {
        closeModal();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (dismissBtn) dismissBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });

  if (scrollLink) {
    scrollLink.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
      const target = document.getElementById("about-visual");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      document.body.classList.add("header-collapsed");
      if (restoreBtn) restoreBtn.hidden = false;
    });
  }

  if (restoreBtn) {
    restoreBtn.addEventListener("click", () => {
      document.body.classList.remove("header-collapsed");
      restoreBtn.hidden = true;
    });
  }
}

export function setFavicon(iconUrl) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    document.head.appendChild(link);
  }
  link.href = iconUrl;
}

async function initializeVisualPage() {
  const visual = await getVisual(currentSlug());
  if (!visual) {
    throw new Error("This visual is not published.");
  }

  document.title = `${visual.title} | Visual Mathematics Lab`;
  const root = document.body.dataset.root || "../..";
  if (visual.thumbnail) {
    setFavicon(`${root}/${visual.thumbnail.replace(/^\//, "")}`);
  }
  document.querySelectorAll("[data-visual-title]").forEach((el) => {
    el.textContent = visual.title;
  });
  document.querySelectorAll("[data-visual-description]").forEach((el) => {
    el.textContent = visual.description;
  });
  document.querySelectorAll("[data-visual-category]").forEach((el) => {
    el.textContent = visual.category;
  });

  setupHeaderAndModal(visual);
  renderVideo(visual);

  // Inject brief concise indemnifying disclaimer footnote in editorial content
  const editorial = document.querySelector(".visual-page__content");
  if (editorial && !editorial.querySelector(".visual-disclaimer-footnote")) {
    const fn = document.createElement("aside");
    fn.className = "visual-disclaimer-footnote";
    fn.setAttribute("role", "note");
    fn.setAttribute("aria-label", "Disclaimer");
    fn.innerHTML = `<p><strong>Disclaimer:</strong> Use of this product is at your own discretion. Neither the authors, contributors, nor Visual Mathematics Lab shall be held liable or responsible for any material loss associated with the use of the app. The product may contain occasional inconsistencies in the colour grammar to visual canvas component mapping; users should interpret all figures, measurements, and derivations with discretion.</p>`;
    editorial.appendChild(fn);
  }

  // Inject disclaimer in the info modal card
  const modalDesc = document.querySelector(".visual-info-card .visual-info-desc");
  if (modalDesc && !document.querySelector(".visual-info-disclaimer")) {
    const modalDisclaimer = document.createElement("p");
    modalDisclaimer.className = "visual-info-disclaimer";
    modalDisclaimer.innerHTML = `<strong>Disclaimer:</strong> Neither the authors, contributors, nor Visual Mathematics Lab shall be held liable for any material loss associated with the use of the app. Graphical elements may have minor inconsistencies in colour grammar to canvas mapping; interpret with discretion.`;
    modalDesc.parentNode.insertBefore(modalDisclaimer, modalDesc.nextSibling);
  }

  trackEvent("visual_view", { visual: visual.slug });
}

initializeAnalytics();
mountSharedChrome();
initializeVisualPage().catch((error) => {
  document.querySelector("[data-visual-error]").hidden = false;
  console.error(error);
});
