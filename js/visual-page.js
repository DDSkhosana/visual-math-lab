import { initializeAnalytics, trackEvent } from "./analytics.js?v=20260523";
import { mountSharedChrome } from "./components.js?v=20260523";
import { initTutorialAndTips, openTutorialModal, isTipsEnabled, setTipsEnabled } from "./tutorial-walkthrough.js?v=20260523";
import { initGeometryLegend, openLegendModal, toggleLegendModal } from "./geometry-legend.js?v=20260523";
import { initWorkspaceDock } from "./workspace-dock.js?v=20260523";
import { initPermalinkSync, copyShareUrl } from "./permalink.js?v=20260523";
import { initI18n, t, getLocale, translateDOM } from "./i18n.js";

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
  const root = document.body?.dataset?.root || "../../..";
  const response = await fetch(`${root}/data/visuals.json`, { cache: "no-cache" });
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

/**
 * Keeps the 3D view title clear of the floating Planar/Spatial dimension pill.
 * The pill's width depends on its (translatable) labels, so we measure it and
 * publish the exact horizontal space it occupies as `--dimension-bar-clearance`
 * on the 3D container. CSS uses this to cap the title width (with ellipsis);
 * static rem fallbacks in the stylesheets cover the pre-measure first paint.
 */
function initDimensionBarClearance() {
  const container = document.getElementById("canvas-3d-container");
  const bar = container?.querySelector(":scope > .dimension-mode-bar");
  if (!container || !bar || typeof ResizeObserver === "undefined") return;

  const update = () => {
    const c = container.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    if (!c.width || !b.width) return;
    const title = container.querySelector(":scope > .view-title");
    const t = title?.getBoundingClientRect();
    // Only measure when the pill shares the title's row (wide layout). When it is
    // stacked onto row 2 the CSS uses its own narrow-layout title width instead.
    if (t && t.height && b.top >= t.bottom) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const rtl = getComputedStyle(container).direction === "rtl";
    const reserved = rtl ? b.right - c.left : c.right - b.left;
    const titleInset = t ? (rtl ? c.right - t.right : t.left - c.left) : rem;
    const gap = 0.75 * rem;
    container.style.setProperty(
      "--dimension-bar-clearance",
      `${((reserved + titleInset + gap) / rem).toFixed(3)}rem`
    );
  };

  const ro = new ResizeObserver(() => requestAnimationFrame(update));
  ro.observe(container);
  ro.observe(bar);
  window.addEventListener("vml:locale-changed", () => requestAnimationFrame(update));
  update();
}

async function initializeVisualPage() {
  const visual = await getVisual(currentSlug());
  if (!visual) {
    throw new Error("This visual is not published.");
  }

  const root = document.body.dataset.root || "../../..";
  if (visual.thumbnail) {
    setFavicon(`${root}/${visual.thumbnail.replace(/^\//, "")}`);
  }

  const updateVisualMetadata = () => {
    const slug = visual.slug;
    const translatedTitle = t(`visuals.${slug}.title`, {}, visual.title);
    const translatedDesc = t(`visuals.${slug}.description`, {}, visual.description);
    const translatedCat = t(`visuals.${slug}.category`, {}, visual.category);

    document.title = `${translatedTitle} | Visual Mathematics Lab`;
    document.querySelectorAll("[data-visual-title]").forEach((el) => {
      el.textContent = translatedTitle;
    });
    document.querySelectorAll("[data-visual-description]").forEach((el) => {
      el.textContent = translatedDesc;
    });
    document.querySelectorAll("[data-visual-category]").forEach((el) => {
      el.textContent = translatedCat;
    });

    const headerTitle = document.querySelector(".site-header__title");
    if (headerTitle) headerTitle.textContent = translatedTitle;
    const headerCat = document.querySelector(".site-header__category");
    if (headerCat) headerCat.textContent = translatedCat;

    // Synchronize 2D & 3D Telemetry Panels and Invariant Verification Badges
    const text2D = t("telemetry.panel_2d", {}, "2D Geometric Telemetry");
    const text3D = t("telemetry.panel_3d", {}, "3D Spatial Telemetry");
    const verifiedText = t("telemetry.verified", {}, t("derivations.verified", {}, "Verified Invariant"));

    // 2D Telemetry Panel Headers
    const panels2d = document.querySelectorAll("#stats-2d, #telemetry-panel, .stats-overlay:not(#stats-3d)");
    panels2d.forEach((panel) => {
      const titleEl = panel.querySelector(".stats-title");
      if (titleEl) titleEl.textContent = text2D;

      const header = panel.querySelector(".stats-header");
      if (header) {
        let badge = header.querySelector(".telemetry-invariant-badge");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "telemetry-invariant-badge";
          badge.title = "Geometric invariant verified in real-time";
          const toggleBtn = header.querySelector(".panel-minimize-btn, .stats-toggle-btn");
          if (toggleBtn) {
            header.insertBefore(badge, toggleBtn);
          } else {
            header.appendChild(badge);
          }
        }
        badge.textContent = `${verifiedText} ✓`;
      }
    });

    // 3D Telemetry Panel Headers
    const panels3d = document.querySelectorAll("#stats-3d");
    panels3d.forEach((panel) => {
      const titleEl = panel.querySelector(".stats-title");
      if (titleEl) titleEl.textContent = text3D;

      const header = panel.querySelector(".stats-header");
      if (header) {
        let badge = header.querySelector(".telemetry-invariant-badge");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "telemetry-invariant-badge";
          badge.title = "Spatial invariant verified in real-time";
          const toggleBtn = header.querySelector(".panel-minimize-btn, .stats-toggle-btn");
          if (toggleBtn) {
            header.insertBefore(badge, toggleBtn);
          } else {
            header.appendChild(badge);
          }
        }
        badge.textContent = `${verifiedText} ✓`;
      }
    });

    // Synchronize Derivations Panel Headers
    const derivTitle = t("derivations.panel_title", {}, "Live Math Derivations");
    const derivHeaders = document.querySelectorAll("#derivation-header h1, #deriv-header h1, #derivations-panel .panel-header h1, #live-derivation-panel .panel-header h1");
    derivHeaders.forEach((h1) => {
      h1.textContent = derivTitle;
    });

    // Synchronize Controls Panel Headers
    const controlsTitle = t("controls.panel_title", {}, "Interactive Controls");
    const controlsHeaders = document.querySelectorAll("#controls-header h1, #panel-header h1");
    controlsHeaders.forEach((h1) => {
      h1.textContent = controlsTitle;
    });

    // Synchronize 2D & 3D Toolbar Panel Headers
    const toolbar2DHeaders = document.querySelectorAll("#toolbar-2d-header h1");
    toolbar2DHeaders.forEach((h1) => {
      h1.textContent = `2D ${controlsTitle}`;
    });
    const toolbar3DHeaders = document.querySelectorAll("#toolbar-3d-header h1, #toolbar-header h1");
    toolbar3DHeaders.forEach((h1) => {
      h1.textContent = `3D ${controlsTitle}`;
    });

    // Synchronize Expand/Collapse All Buttons
    const expandAllText = t("derivations.expand_all", {}, "Expand All");
    const collapseAllText = t("derivations.collapse_all", {}, "Collapse All");
    document.querySelectorAll(".panel-expand-btn, #toggle-deriv-expand, #toggle-controls-expand").forEach((btn) => {
      const label = btn.querySelector(".panel-expand-label");
      if (label) {
        const isExpanded = btn.getAttribute("aria-expanded") === "true";
        label.textContent = isExpanded ? collapseAllText : expandAllText;
      }
    });

    // Synchronize Viewport Toolbar Buttons
    const legendBtn = document.getElementById("btn-toolbar-legend");
    if (legendBtn) {
      const span = legendBtn.querySelector("span");
      if (span) span.textContent = t("controls.geometry_legend", {}, "Legend");
      legendBtn.title = `${t("controls.geometry_legend", {}, "Legend")} (Shortcut: L)`;
    }

    const resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.title = t("controls.reset_view", {}, "Reset View");
    }

    const splitBtn = document.getElementById("btn-split");
    if (splitBtn) splitBtn.title = t("controls.split_view", {}, "Split View");

    const btn2d = document.getElementById("btn-2d");
    if (btn2d) btn2d.title = t("controls.full_2d", {}, "2D View");

    const btn3d = document.getElementById("btn-3d");
    if (btn3d) btn3d.title = t("controls.full_3d", {}, "3D View");

    // Synchronize Dimension Mode Bar
    const planarBtn = document.getElementById("btn-mode-planar");
    if (planarBtn) {
      planarBtn.textContent = t("controls.planar", {}, "Planar");
    }
    const spatialBtn = document.getElementById("btn-mode-spatial");
    if (spatialBtn) {
      spatialBtn.textContent = t("controls.spatial", {}, "Spatial S²");
    }

    // Synchronize Camera Presets
    const presetTop = document.querySelector('[data-preset="top"]');
    if (presetTop) presetTop.textContent = t("controls.preset_top", {}, "Top");
    const presetFront = document.querySelector('[data-preset="front"]');
    if (presetFront) presetFront.textContent = t("controls.preset_front", {}, "Front");
    const presetSide = document.querySelector('[data-preset="side"]');
    if (presetSide) presetSide.textContent = t("controls.preset_side", {}, "Side");
    const presetIso = document.querySelector('[data-preset="isometric"]');
    if (presetIso) presetIso.textContent = t("controls.preset_iso", {}, "Iso");

    // Synchronize Toolbar Buttons
    const flipBtn = document.getElementById("split-dir-btn");
    if (flipBtn) flipBtn.title = t("controls.flip", {}, "Flip Split");
    const shareBtn = document.getElementById("btn-toolbar-share");
    if (shareBtn) {
      const span = shareBtn.querySelector("span");
      if (span) span.textContent = t("controls.share", {}, "Share");
      shareBtn.title = t("controls.share", {}, "Share");
    }

    // Synchronize Telemetry Panel Titles
    document.querySelectorAll("#stats-2d-header .stats-title, #telemetry-header h1").forEach((el) => {
      el.textContent = t("telemetry.panel_2d", {}, "2D Telemetry");
    });
    document.querySelectorAll("#stats-3d-header .stats-title").forEach((el) => {
      el.textContent = t("telemetry.panel_3d", {}, "3D Telemetry");
    });

    // Run DOM Translation for all elements marked with data-i18n
    translateDOM(document);
  };

  updateVisualMetadata();
  if (typeof window !== "undefined") {
    window.addEventListener("vml:locale-changed", updateVisualMetadata);
  }

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
              const mainView = document.getElementById('main-view');
              if (mainView && mainView.classList.contains('layout-2d')) {
                document.getElementById('btn-split')?.click();
              }
              if (typeof scene3d.setARMode === 'function') scene3d.setARMode(true);
              if (typeof scene3d.resize === 'function') scene3d.resize();
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
initDimensionBarClearance();
initializeVisualPage().catch((error) => {
  document.querySelector("[data-visual-error]").hidden = false;
  console.error(error);
});
