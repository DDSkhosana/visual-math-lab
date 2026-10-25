import SITE_CONFIG, { hasConfiguredUrl } from "../config/site-config.js?v=20260523";
import { trackEvent } from "./analytics.js?v=20260523";

const DEFAULT_CIRCLE_VISUALS = [
  { slug: "thales-theorem", suite: "circle-theorems", title: "Thales' Theorem", category: "Geometry" },
  { slug: "angle-at-centre", suite: "circle-theorems", title: "Angle at the Centre Theorem", category: "Geometry" },
  { slug: "angles-in-same-segment", suite: "circle-theorems", title: "Angles in the Same Segment", category: "Geometry" },
  { slug: "cyclic-quadrilateral", suite: "circle-theorems", title: "Cyclic Quadrilateral Theorem", category: "Geometry" },
  { slug: "tangent-radius", suite: "circle-theorems", title: "Tangent-Radius Perpendicularity", category: "Geometry" },
  { slug: "alternate-segment", suite: "circle-theorems", title: "Alternate Segment Theorem", category: "Geometry" },
  { slug: "tangents-from-external-point", suite: "circle-theorems", title: "Tangents from an External Point", category: "Geometry" },
  { slug: "perpendicular-chord-bisector", suite: "circle-theorems", title: "Perpendicular Chord Bisector", category: "Geometry" },
];

const DEFAULT_TRIG_VISUALS = [
  { slug: "unit-circle-helix", suite: "trigonometry", title: "Unit Circle, Six Trig Functions & 3D Helix Waves", category: "Trigonometry" },
  { slug: "law-of-sines", suite: "trigonometry", title: "Law of Sines & Circumcircle Invariant", category: "Trigonometry" },
  { slug: "law-of-cosines", suite: "trigonometry", title: "Law of Cosines & Generalized Pythagorean Projection", category: "Trigonometry" },
  { slug: "angle-sum-identities", suite: "trigonometry", title: "Angle Sum, Difference & Rotation Matrix Composition", category: "Trigonometry" },
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
    // Supports both visuals/<suite>/<slug> and visuals/<slug>
    const candidate = segments[segments.length - 1].replace(/\.html$/, "");
    if (candidate && candidate !== "index" && candidate !== "circle-theorems" && candidate !== "trigonometry") {
      return candidate;
    }
    if (segments.length >= 2 && candidate === "index") {
      const parent = segments[segments.length - 2];
      if (parent !== "circle-theorems" && parent !== "trigonometry" && parent !== "visuals") {
        return parent;
      }
    }
  }
  return "";
}

function escapeHtml(value) {
  if (typeof document !== "undefined" && document.createElement) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
  }
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || "");
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return escapeHtml(text);
  const pattern = tokens.map(escapeRegex).join("|");
  const regex = new RegExp("(" + pattern + ")", "gi");
  const parts = text.split(regex);
  return parts
    .map((part) => {
      const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return '<mark class="site-nav__search-match">' + escapeHtml(part) + '</mark>';
      }
      return escapeHtml(part);
    })
    .join("");
}

function getSingleTokenScore(item, token) {
  const title = (item.dataset.title || "").toLowerCase();
  const slug = (item.dataset.slug || "").toLowerCase();
  const suite = (item.dataset.suite || "").toLowerCase();
  const category = (item.dataset.category || "").toLowerCase();
  const searchTerms = (item.dataset.search || "").toLowerCase();

  if (!searchTerms.includes(token)) return -1;

  // Word boundary regex: matches token at start of string or after word-delimiter punctuation
  const wordBoundaryRegex = new RegExp("(^|[\\s\\-_/(\\[])" + escapeRegex(token), "i");

  // For short queries (<= 2 chars, like 'th', 'si', 'an', '3d'), require a word-boundary match
  // to avoid matching broad internal substrings across unrelated words
  if (token.length <= 2) {
    const hasWordBoundary =
      wordBoundaryRegex.test(title) ||
      wordBoundaryRegex.test(slug) ||
      wordBoundaryRegex.test(suite) ||
      wordBoundaryRegex.test(category);
    if (!hasWordBoundary) return -1;
  }

  let score = 0;

  // 1. Exact title match
  if (title === token) {
    score += 1000;
  } else if (title.startsWith(token)) {
    score += 500;
  } else if (wordBoundaryRegex.test(title)) {
    score += 350;
  } else if (title.includes(token)) {
    score += 150;
  }

  // Bonus for position earlier in title
  const titleIdx = title.indexOf(token);
  if (titleIdx >= 0) {
    score += Math.max(0, 50 - titleIdx * 2);
    score += Math.round((token.length / Math.max(1, title.length)) * 50);
  }

  // 2. Slug match
  if (slug === token) {
    score += 150;
  } else if (slug.startsWith(token)) {
    score += 100;
  } else if (wordBoundaryRegex.test(slug)) {
    score += 80;
  } else if (slug.includes(token)) {
    score += 50;
  }

  // 3. Suite match (e.g. 'circle-theorems', 'trigonometry')
  if (suite === token) {
    score += 120;
  } else if (suite.startsWith(token)) {
    score += 80;
  } else if (wordBoundaryRegex.test(suite)) {
    score += 60;
  } else if (suite.includes(token)) {
    score += 30;
  }

  // 4. Category match (e.g. 'geometry', 'trigonometry')
  if (category === token) {
    score += 120;
  } else if (category.startsWith(token)) {
    score += 80;
  } else if (wordBoundaryRegex.test(category)) {
    score += 60;
  } else if (category.includes(token)) {
    score += 30;
  }

  return score;
}

export function getMatchScore(item, q) {
  const trimmed = (q || "").trim().toLowerCase();
  if (!trimmed) return -1;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (!tokens.length) return -1;

  let totalScore = 0;

  for (const token of tokens) {
    const tokenScore = getSingleTokenScore(item, token);
    if (tokenScore < 0) {
      // Multi-word tokenization: all tokens must match (AND condition)
      return -1;
    }
    totalScore += tokenScore;
  }

  // Multi-word phrase bonus: contiguous substring match in title or searchTerms
  const title = (item.dataset.title || "").toLowerCase();
  if (tokens.length > 1) {
    if (title.includes(trimmed)) {
      totalScore += 400;
    } else {
      totalScore += 50 * tokens.length;
    }
  }

  return totalScore;
}

function renderVisualsList(root, circleVisuals, activeSlug, trigVisuals = DEFAULT_TRIG_VISUALS) {
  const renderItem = (v, defaultSuite) => {
    const suite = v.suite || defaultSuite;
    const isActive = v.slug === activeSlug;
    const visualUrl = route(root, `visuals/${encodeURIComponent(suite)}/${encodeURIComponent(v.slug)}/index.html`);
    const searchTerms = `${v.title} ${v.slug} ${v.category || ""} ${suite}`.toLowerCase();
    return `
      <a href="${visualUrl}" class="site-nav__dropdown-item ${isActive ? "is-active" : ""}" role="menuitem" ${isActive ? 'aria-current="page"' : ""} data-suite="${escapeHtml(suite)}" data-slug="${escapeHtml(v.slug)}" data-title="${escapeHtml(v.title)}" data-category="${escapeHtml(v.category || "")}" data-search="${escapeHtml(searchTerms)}">
        <span class="site-nav__dropdown-item-title">${escapeHtml(v.title)}</span>
        ${isActive ? '<span class="site-nav__dropdown-item-badge">Active</span>' : ""}
      </a>
    `;
  };

  return `
    <a href="${route(root, "visuals/circle-theorems/index.html")}" class="site-nav__dropdown-suite-label" data-suite-header="circle-theorems">
      <span>Suite 01 &middot; Circle Theorems (${circleVisuals.length})</span>
    </a>
    ${circleVisuals.map((v) => renderItem(v, "circle-theorems")).join("")}
    <a href="${route(root, "visuals/trigonometry/index.html")}" class="site-nav__dropdown-suite-label site-nav__dropdown-suite-label--divider" data-suite-header="trigonometry">
      <span>Suite 02 &middot; Trigonometry (${trigVisuals.length})</span>
    </a>
    ${trigVisuals.map((v) => renderItem(v, "trigonometry")).join("")}
  `;
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
    const totalCount = DEFAULT_CIRCLE_VISUALS.length + DEFAULT_TRIG_VISUALS.length;
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
              <span class="site-nav__dropdown-title">Interactive Suites</span>
              <span class="site-nav__dropdown-count" id="nav-visuals-count">${totalCount} Visuals</span>
            </div>
            <div class="site-nav__dropdown-search">
              <svg class="site-nav__search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" class="site-nav__search-input" id="nav-visuals-search" placeholder="Search visualisations (e.g. Helix, Sine, Thales)..." aria-label="Search visualisations" autocomplete="off" spellcheck="false">
              <button type="button" class="site-nav__search-clear" id="nav-visuals-search-clear" aria-label="Clear search" title="Clear query" hidden>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div class="site-nav__dropdown-list" id="nav-visuals-list" role="none">
              ${renderVisualsList(root, DEFAULT_CIRCLE_VISUALS, activeSlug, DEFAULT_TRIG_VISUALS)}
            </div>
            <div class="site-nav__dropdown-empty" id="nav-visuals-empty" hidden>
              <span>No visualisations found</span>
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
    const searchInput = header.querySelector("#nav-visuals-search");
    const searchClear = header.querySelector("#nav-visuals-search-clear");
    const emptyState = header.querySelector("#nav-visuals-empty");

    const initListOrder = () => {
      if (!list) return;
      Array.from(list.children).forEach((child, idx) => {
        child.dataset.defaultOrder = idx;
      });
    };
    initListOrder();

    const filterVisuals = (query) => {
      const q = (query || "").trim().toLowerCase();
      if (searchClear) searchClear.hidden = !q;

      const items = Array.from(list.querySelectorAll(".site-nav__dropdown-item"));
      const suiteHeaders = Array.from(list.querySelectorAll(".site-nav__dropdown-suite-label"));

      if (!q) {
        items.forEach((item) => {
          const titleEl = item.querySelector(".site-nav__dropdown-item-title");
          if (titleEl && item.dataset.title) {
            titleEl.textContent = item.dataset.title;
          }
          const tagEl = item.querySelector(".site-nav__search-match-tag");
          if (tagEl) tagEl.remove();
          item.hidden = false;
        });

        suiteHeaders.forEach((h) => {
          h.hidden = false;
        });

        const allChildren = Array.from(list.children);
        allChildren.sort((a, b) => Number(a.dataset.defaultOrder || 0) - Number(b.dataset.defaultOrder || 0));
        allChildren.forEach((child) => list.appendChild(child));

        if (emptyState) emptyState.hidden = true;
        if (count) count.textContent = `${items.length} Visuals`;
        return;
      }

      const scored = [];
      items.forEach((item) => {
        const score = getMatchScore(item, q);
        if (score > 0) {
          scored.push({ item, score });
        } else {
          item.hidden = true;
          const titleEl = item.querySelector(".site-nav__dropdown-item-title");
          if (titleEl && item.dataset.title) {
            titleEl.textContent = item.dataset.title;
          }
          const tagEl = item.querySelector(".site-nav__search-match-tag");
          if (tagEl) tagEl.remove();
        }
      });

      // Sort descending by match strength
      scored.sort((a, b) => b.score - a.score);

      // Hide suite headers during active search so top matches are brought together at the top
      suiteHeaders.forEach((h) => {
        h.hidden = true;
      });

      // Re-order matching items to the top of the container in sorted strength order
      scored.forEach(({ item }) => {
        item.hidden = false;
        list.appendChild(item);

        const title = item.dataset.title || "";
        const titleEl = item.querySelector(".site-nav__dropdown-item-title");
        if (titleEl) {
          titleEl.innerHTML = highlightMatch(title, q);
        }

        let tagEl = item.querySelector(".site-nav__search-match-tag");
        const titleLower = title.toLowerCase();
        const suite = item.dataset.suite || "";
        const category = item.dataset.category || "";
        const tokens = q.split(/\s+/).filter(Boolean);
        const allTokensInTitle = tokens.every((t) => titleLower.includes(t));
        const matchedInSuiteOrCat = tokens.some((t) => suite.toLowerCase().includes(t) || category.toLowerCase().includes(t));
        if (!allTokensInTitle && matchedInSuiteOrCat) {
          if (!tagEl) {
            tagEl = document.createElement("span");
            tagEl.className = "site-nav__search-match-tag";
            const badge = item.querySelector(".site-nav__dropdown-item-badge");
            if (badge) {
              item.insertBefore(tagEl, badge);
            } else {
              item.appendChild(tagEl);
            }
          }
          tagEl.textContent = suite === "circle-theorems" ? "Circle Theorems" : "Trigonometry";
        } else if (tagEl) {
          tagEl.remove();
        }
      });

      if (emptyState) {
        emptyState.hidden = scored.length > 0;
        if (scored.length === 0) {
          emptyState.textContent = `No visualisations found for "${query.trim()}"`;
        }
      }

      if (count) {
        count.textContent = `${scored.length} of ${items.length} Visuals`;
      }
    };

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        filterVisuals(e.target.value);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          // Move focus to first visible match for explicit review and keyboard navigation (no auto-navigation)
          const firstVisible = list.querySelector(".site-nav__dropdown-item:not([hidden])");
          if (firstVisible) {
            firstVisible.focus();
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const firstVisible = list.querySelector(".site-nav__dropdown-item:not([hidden])");
          if (firstVisible) {
            firstVisible.focus();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (searchInput.value) {
            searchInput.value = "";
            filterVisuals("");
          } else {
            closeMenu();
            trigger.focus();
          }
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          filterVisuals("");
          searchInput.focus();
        }
      });
    }

    if (dropdown && trigger && menu) {
      const updateMenuPosition = () => {
        if (menu.hidden) return;
        if (typeof window === "undefined" || !trigger.getBoundingClientRect) return;
        const rect = trigger.getBoundingClientRect();
        if (!rect.width && !rect.height && !rect.top) return;

        const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1024);

        if (rect.right < 0 || rect.left > viewportWidth) {
          closeMenu();
          return;
        }

        menu.style.position = "fixed";
        menu.style.top = `${Math.round(rect.bottom + 6)}px`;
        const menuWidth = menu.offsetWidth || 280;

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
        setTimeout(() => {
          if (searchInput && typeof searchInput.focus === "function") {
            searchInput.focus();
          }
        }, 40);
      };

      const closeMenu = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (searchInput && searchInput.value) {
          searchInput.value = "";
          filterVisuals("");
        }
      };

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menu.hidden) {
          openMenu();
        } else {
          closeMenu();
        }
      });

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
          if (document.activeElement === searchInput) return;
          e.preventDefault();
          if (menu.hidden) {
            openMenu();
            return;
          }
          const items = Array.from(menu.querySelectorAll(".site-nav__dropdown-item:not([hidden])"));
          if (items.length === 0) return;
          const currentIndex = items.indexOf(document.activeElement);
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        } else if (e.key === "ArrowUp") {
          if (document.activeElement === searchInput) return;
          e.preventDefault();
          const items = Array.from(menu.querySelectorAll(".site-nav__dropdown-item:not([hidden])"));
          if (items.length === 0) return;
          const currentIndex = items.indexOf(document.activeElement);
          if (currentIndex > 0) {
            items[currentIndex - 1]?.focus();
          } else if (searchInput && typeof searchInput.focus === "function") {
            searchInput.focus();
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
              const circle = published.filter((v) => (v.suite || "circle-theorems") === "circle-theorems");
              const trig = published.filter((v) => v.suite === "trigonometry");
              const trigList = trig.length > 0 ? trig : DEFAULT_TRIG_VISUALS;
              list.innerHTML = renderVisualsList(root, circle, activeSlug, trigList);
              if (count) count.textContent = `${circle.length + trigList.length} Visuals`;
              initListOrder();
              if (searchInput && searchInput.value) {
                filterVisuals(searchInput.value);
              }
            }
          }
        })
        .catch(() => {
          // Gracefully keep DEFAULT_CIRCLE_VISUALS fallback
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
