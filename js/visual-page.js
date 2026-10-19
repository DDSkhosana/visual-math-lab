import { initializeAnalytics, trackEvent } from "./analytics.js?v=20260523";
import { mountSharedChrome } from "./components.js?v=20260523";
import { initTutorialAndTips, openTutorialModal, isTipsEnabled, setTipsEnabled } from "./tutorial-walkthrough.js?v=20260523";
import { initGeometryLegend, openLegendModal, toggleLegendModal } from "./geometry-legend.js?v=20260523";
import { initWorkspaceDock } from "./workspace-dock.js?v=20260523";
import { initPermalinkSync, copyShareUrl } from "./permalink.js?v=20260523";

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

  const collapseBtn = document.getElementById("header-collapse-btn");
  const restoreBtn = document.getElementById("header-restore-btn");

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

  // Initialize Walkthrough Tutorial & Contextual Interaction Tips
  initTutorialAndTips(visual);

  // Initialize Geometry Notation Legend Modal & Cheatsheet
  initGeometryLegend();

  // Initialize Workspace Windowing & Dock System
  initWorkspaceDock();

  // Mount status indicators & badges inside the Viewport Modes Toolbar
  const toolbarContent = document.getElementById("toolbar-content");
  if (toolbarContent) {
    let tipsToolbarBtn = document.getElementById("btn-toolbar-tips") || document.getElementById("visual-tutorial-btn");
    if (!tipsToolbarBtn) {
      const divider = document.createElement("span");
      divider.className = "toolbar-divider";
      divider.setAttribute("aria-hidden", "true");
      toolbarContent.appendChild(divider);

      tipsToolbarBtn = document.createElement("button");
      tipsToolbarBtn.type = "button";
      tipsToolbarBtn.className = "btn-toolbar btn-toolbar--badge btn-toolbar-tips";
      tipsToolbarBtn.id = "btn-toolbar-tips";
      tipsToolbarBtn.setAttribute("data-action", "visual-tutorial-btn");
      tipsToolbarBtn.title = "Toggle Tips / Open Walkthrough (Shortcut: ?)";
      tipsToolbarBtn.setAttribute("aria-label", "Walkthrough Tutorial & Interaction Tips");
      tipsToolbarBtn.setAttribute("aria-pressed", isTipsEnabled() ? "true" : "false");
      const tipsActive = isTipsEnabled();
      tipsToolbarBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>
        <span class="tips-btn-label">Guide &amp; Tips: <span class="tutorial-status-pill ${tipsActive ? 'is-on' : 'is-off'}" id="toolbar-tips-status">${tipsActive ? 'ON' : 'OFF'}</span></span>
      `;
      toolbarContent.appendChild(tipsToolbarBtn);
    }

    let legendToolbarBtn = document.getElementById("btn-toolbar-legend") || document.getElementById("visual-legend-btn");
    if (!legendToolbarBtn) {
      legendToolbarBtn = document.createElement("button");
      legendToolbarBtn.type = "button";
      legendToolbarBtn.className = "btn-toolbar btn-toolbar--badge btn-toolbar-legend";
      legendToolbarBtn.id = "btn-toolbar-legend";
      legendToolbarBtn.setAttribute("data-action", "visual-legend-btn");
      legendToolbarBtn.title = "Open Circle Geometry Notation Legend & Cheatsheet (Shortcut: L)";
      legendToolbarBtn.setAttribute("aria-label", "Circle Geometry Notation Legend");
      legendToolbarBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>Legend</span>
      `;
      toolbarContent.appendChild(legendToolbarBtn);
    }

    let shareToolbarBtn = document.getElementById("btn-toolbar-share") || document.getElementById("visual-share-btn");
    if (!shareToolbarBtn) {
      shareToolbarBtn = document.createElement("button");
      shareToolbarBtn.type = "button";
      shareToolbarBtn.className = "btn-toolbar btn-toolbar--badge btn-toolbar-share";
      shareToolbarBtn.id = "btn-toolbar-share";
      shareToolbarBtn.setAttribute("data-action", "visual-share-btn");
      shareToolbarBtn.title = "Copy shareable link with current configuration (Shortcut: S)";
      shareToolbarBtn.setAttribute("aria-label", "Share Geometry Configuration");
      shareToolbarBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        <span>Share</span>
      `;
      toolbarContent.appendChild(shareToolbarBtn);
    }

    const container3d = document.getElementById("canvas-3d-container");
    let arToolbarBtn = document.getElementById("btn-toggle-ar");
    if (!arToolbarBtn && container3d) {
      arToolbarBtn = document.createElement("button");
      arToolbarBtn.type = "button";
      arToolbarBtn.className = "btn-toolbar";
      arToolbarBtn.id = "btn-toggle-ar";
      arToolbarBtn.title = "Enter Augmented Reality mode (WebXR / Camera Pass-Through)";
      arToolbarBtn.setAttribute("aria-label", "Augmented Reality");
      arToolbarBtn.setAttribute("aria-pressed", "false");
      arToolbarBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <path d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
          <circle cx="12" cy="12" r="2.5"/>
        </svg>
        <span>AR: <b class="toggle-state-text" id="ar-status-pill">OFF</b></span>
      `;
      const resetBtn = document.getElementById("btn-reset");
      if (resetBtn) {
        toolbarContent.insertBefore(arToolbarBtn, resetBtn);
      } else {
        toolbarContent.appendChild(arToolbarBtn);
      }
    }

    if (tipsToolbarBtn && !tipsToolbarBtn._hasClickBound) {
      tipsToolbarBtn._hasClickBound = true;
      tipsToolbarBtn.addEventListener("click", (e) => {
        if (e.target && (e.target.id === 'toolbar-tips-status' || e.target.classList.contains('tutorial-status-pill'))) {
          e.stopPropagation();
          setTipsEnabled(!isTipsEnabled());
        } else {
          openTutorialModal();
        }
      });
    }

    if (legendToolbarBtn && !legendToolbarBtn._hasClickBound) {
      legendToolbarBtn._hasClickBound = true;
      legendToolbarBtn.addEventListener("click", () => {
        openLegendModal();
      });
    }

    if (shareToolbarBtn && !shareToolbarBtn._hasClickBound) {
      shareToolbarBtn._hasClickBound = true;
      shareToolbarBtn.addEventListener("click", () => {
        copyShareUrl(window.__vmlStore, window.__vmlDockManager);
      });
    }

    if (arToolbarBtn && !arToolbarBtn._hasClickBound && container3d) {
      let arManager = null;
      arToolbarBtn._hasClickBound = true;
      arToolbarBtn.addEventListener("click", async () => {
        const scene3d = container3d.__scene3d;
        if (!scene3d?.renderer) {
          console.warn("3D Scene not ready for AR");
          return;
        }
        if (!arManager) {
          const { ARManager } = await import("./ar-manager.js?v=20260523");
          arManager = new ARManager({
            renderer: scene3d.renderer,
            scene: scene3d.scene || scene3d.objects?.scene,
            camera: scene3d.camera,
            container: container3d,
            onSessionStart: () => {
              if (typeof scene3d.setARMode === 'function') scene3d.setARMode(true);
              arToolbarBtn.classList.add('active');
              arToolbarBtn.setAttribute('aria-pressed', 'true');
              const pill = document.getElementById('ar-status-pill');
              if (pill) { pill.textContent = 'ON'; pill.classList.add('is-on'); }
            },
            onSessionEnd: () => {
              if (typeof scene3d.setARMode === 'function') scene3d.setARMode(false);
              arToolbarBtn.classList.remove('active');
              arToolbarBtn.setAttribute('aria-pressed', 'false');
              const pill = document.getElementById('ar-status-pill');
              if (pill) { pill.textContent = 'OFF'; pill.classList.remove('is-on'); }
            },
          });
        }
        try {
          await arManager.toggle();
        } catch (err) {
          console.warn("AR initiation error:", err);
          alert(err.message || "Could not start Augmented Reality mode on this device.");
        }
      });
    }
  }

  // Initialize URL State Permalinks
  if (window.__vmlStore) {
    initPermalinkSync(window.__vmlStore, window.__vmlDockManager);
  } else {
    window.addEventListener("vml:store-ready", (e) => {
      if (e.detail?.store) {
        initPermalinkSync(e.detail.store, window.__vmlDockManager);
      }
    }, { once: true });
  }

  trackEvent("visual_view", { visual: visual.slug });
}

initializeAnalytics();
mountSharedChrome();
initializeVisualPage().catch((error) => {
  document.querySelector("[data-visual-error]").hidden = false;
  console.error(error);
});
