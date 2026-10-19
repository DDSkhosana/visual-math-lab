/**
 * Shared core utilities, math helpers, and UI widgets for Circle Geometry Visualisations.
 */
import { syncPanelElevationTurn } from './workspace-dock.js';

export const PALETTE = Object.freeze({
  red: '#ef4444',
  orange: '#f97316',
  blue: '#3b82f6',
  indigo: '#6366f1',
  green: '#22c55e',
  violet: '#a855f7',
  violetLight: '#d8b4fe',
  yellow: '#eab308',
  amber: '#fbbf24',
  teal: '#14b8a6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  sky: '#0284c7',
  emerald: '#10b981',
  lime: '#84cc16',
  fuchsia: '#d946ef',
  steel: '#6488b0',
  lavender: '#c4b5fd',
  platinum: '#f8fafc',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
});

export const COMPACT_QUERY = '(max-width: 48rem), (max-height: 34rem) and (orientation: landscape)';

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

export function normalizeAngle(rad) {
  let a = rad % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}

/**
 * Calculates counter-clockwise angle between two vectors or points on circle.
 */
export function angleBetween(a1, a2) {
  let diff = a2 - a1;
  while (diff < 0) diff += Math.PI * 2;
  while (diff >= Math.PI * 2) diff -= Math.PI * 2;
  return diff;
}

export function pointerToAngle(dx, dy) {
  const ang = Math.atan2(dy, dx);
  return normalizeAngle(ang);
}

/**
 * Detects if a pointer coordinate (x, y) is on or very close to the circle circumference,
 * allowing direct click-and-drag radius resizing.
 * @param {number} x - Pointer x in local canvas pixels
 * @param {number} y - Pointer y in local canvas pixels
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @param {number} r - Circle radius
 * @param {number} [tolerance=14] - Proximity threshold in pixels
 * @returns {boolean}
 */
export function isNearCircumference(x, y, cx, cy, r, tolerance = 14) {
  return Math.abs(Math.hypot(x - cx, y - cy) - r) <= tolerance;
}

/**
 * Minimal observable store.
 */
export function createStore(initialState) {
  const initial = JSON.parse(JSON.stringify(initialState));
  let state = { ...initialState };
  const subscribers = [];

  const store = {
    get: () => state,
    set: (patch) => {
      if (!patch) return;
      const prev = state;
      state = { ...state, ...patch };
      const changedKeys = Object.keys(patch);
      for (const { fn, keys } of subscribers) {
        if (!keys || keys.some((k) => changedKeys.includes(k))) {
          fn(state, prev);
        }
      }
    },
    reset: () => {
      const prev = state;
      state = JSON.parse(JSON.stringify(initial));
      const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(state)]));
      for (const { fn, keys } of subscribers) {
        if (!keys || keys.some((k) => allKeys.includes(k))) {
          fn(state, prev);
        }
      }
    },
    getInitial: () => JSON.parse(JSON.stringify(initial)),
    subscribe: (fn, keys = null) => {
      const sub = { fn, keys };
      subscribers.push(sub);
      return () => {
        const i = subscribers.indexOf(sub);
        if (i !== -1) subscribers.splice(i, 1);
      };
    },
  };
  if (typeof window !== 'undefined') {
    window.__vmlStore = store;
    try {
      window.dispatchEvent(new CustomEvent('vml:store-ready', { detail: { store } }));
    } catch (_) {}
  }
  return store;
}

export const CHEVRON_DOWN_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 8 12 13 17 8"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`;
export const CHEVRON_UP_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 11 12 6 17 11"></polyline><polyline points="7 16 12 11 17 16"></polyline></svg>`;

export const CHEVRON_DOWN_SINGLE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
export const CHEVRON_UP_SINGLE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

export function setPanelMinimizeButtonUI(btn, isMinimized, label = 'Panel') {
  if (!btn) return;
  const isExpanded = !isMinimized;
  btn.setAttribute('aria-expanded', String(isExpanded));

  let resolvedLabel = label;
  if (btn.id?.includes('2d') || btn.id?.includes('stats-2d')) resolvedLabel = '2D Telemetry';
  else if (btn.id?.includes('3d') || btn.id?.includes('stats-3d')) resolvedLabel = '3D Telemetry';
  else if (btn.id?.includes('deriv')) resolvedLabel = 'Derivations Panel';
  else if (btn.id?.includes('controls') || btn.id?.includes('thales')) resolvedLabel = 'Controls Panel';
  else if (btn.id?.includes('toolbar-2d')) resolvedLabel = '2D Controls';
  else if (btn.id?.includes('toolbar-3d') || btn.id === 'toggle-toolbar-minimize') resolvedLabel = '3D Controls';

  btn.title = isExpanded ? `Minimize ${resolvedLabel}` : `Expand ${resolvedLabel}`;
  btn.classList.add('panel-minimize-btn');

  let icon = btn.querySelector('.panel-minimize-icon');
  if (!icon) {
    btn.innerHTML = `<span class="panel-minimize-icon" aria-hidden="true">${isExpanded ? CHEVRON_UP_SINGLE_SVG : CHEVRON_DOWN_SINGLE_SVG}</span>`;
  } else {
    icon.innerHTML = isExpanded ? CHEVRON_UP_SINGLE_SVG : CHEVRON_DOWN_SINGLE_SVG;
  }
}

export function setExpandButtonUI(btn, isExpanded) {
  if (!btn || btn.id === 'nav-visuals-btn' || btn.classList?.contains?.('site-nav__dropdown-trigger')) return;
  btn.setAttribute('aria-expanded', String(isExpanded));
  btn.title = isExpanded ? 'Collapse all sections' : 'Expand all sections';

  let icon = btn.querySelector('.panel-expand-icon');
  let label = btn.querySelector('.panel-expand-label');

  if (!icon || !label) {
    btn.classList.add('panel-expand-btn');
    btn.innerHTML = `
      <span class="panel-expand-icon" aria-hidden="true">${isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG}</span>
      <span class="panel-expand-label">${isExpanded ? 'Collapse All' : 'Expand All'}</span>
    `;
    return;
  }

  icon.innerHTML = isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG;
  label.textContent = isExpanded ? 'Collapse All' : 'Expand All';
}

/**
 * Reusable draggable floating panel.
 */
export class Panel {
  constructor(element, { header, resizeHandle, resizeFrom = 'right', minimizeButton, expandButton }) {
    if (!element) return;
    if (element._panelInstance) {
      return element._panelInstance;
    }
    element._panelInstance = this;
    this.element = element;
    this.body = element.querySelector('.panel-body');
    this.minimizeButton = minimizeButton;
    this.expandButton = expandButton;
    this.compact = window.matchMedia(COMPACT_QUERY);
    this.compact.addEventListener('change', () => this.#resetLayout());

    this.#enableDrag(header);
    if (resizeHandle) this.#enableResize(resizeHandle, resizeFrom);
    minimizeButton?.addEventListener('click', () => this.setMinimized(!this.minimized));
    expandButton?.addEventListener('click', () => this.#toggleAll());
    this.#syncMinimizeButton();
    if (expandButton) {
      setExpandButtonUI(expandButton, false);
    }
  }

  get minimized() {
    return this.body ? this.body.classList.contains('hidden') : false;
  }

  setMinimized(minimized) {
    if (!this.body) return;
    this.body.classList.toggle('hidden', minimized);
    this.#syncMinimizeButton();
  }

  #syncMinimizeButton() {
    if (!this.minimizeButton) return;
    setPanelMinimizeButtonUI(this.minimizeButton, this.minimized, 'Panel');
    if (this.expandButton && this.minimized) {
      setExpandButtonUI(this.expandButton, false);
    }
  }

  #toggleAll() {
    if (!this.body) return;
    const sections = Array.from(this.body.querySelectorAll('.collapsible-section'));
    const cards = Array.from(this.body.querySelectorAll('.derivation-card'));
    const isCollapse = this.expandButton?.getAttribute('aria-expanded') === 'true' ||
      this.expandButton?.textContent.includes('Collapse') || (
      !this.minimized && (
        (sections.length > 0 && sections.every((s) => !s.classList.contains('collapsed'))) &&
        (cards.length === 0 || cards.every((c) => c.querySelector('.derivation-card-header')?.classList.contains('open')))
      )
    );
    this.setMinimized(false);
    sections.forEach((s) => {
      s.classList.toggle('collapsed', isCollapse);
      const header = s.querySelector('.collapsible-header');
      if (header) {
        header.setAttribute('aria-expanded', String(!isCollapse));
        header.classList.toggle('open', !isCollapse);
      }
      const icon = s.querySelector('.collapsible-header .icon');
      if (icon) icon.textContent = isCollapse ? '▶' : '▼';
      const content = s.querySelector('.collapsible-content');
      if (content) {
        content.classList.toggle('open', !isCollapse);
        content.classList.toggle('collapsed', isCollapse);
      }
    });
    cards.forEach((c) => {
      const header = c.querySelector('.derivation-card-header');
      const content = c.querySelector('.derivation-card-content');
      header?.classList.toggle('open', !isCollapse);
      header?.setAttribute('aria-expanded', String(!isCollapse));
      content?.classList.toggle('open', !isCollapse);
      c.classList.toggle('open', !isCollapse);
      const icon = c.querySelector('.icon');
      if (icon) icon.textContent = isCollapse ? '▶' : '▼';
    });
    const totalOpen = isCollapse ? 0 : (sections.length + cards.length);
    this.element.classList.toggle('has-expanded-subpanel', totalOpen > 0);
    this.body.classList.toggle('is-all-expanded', totalOpen > 1);
    const isSingle = totalOpen === 1;
    sections.forEach((s) => s.classList.toggle('is-subpanel-overlay', isSingle && !s.classList.contains('collapsed')));
    cards.forEach((c) => c.classList.toggle('is-subpanel-overlay', isSingle && (c.classList.contains('open') || Boolean(c.querySelector('.derivation-card-header')?.classList.contains('open')))));
    if (this.expandButton) {
      setExpandButtonUI(this.expandButton, !isCollapse);
    }
    syncPanelElevationTurn(this.element);
  }

  #resetLayout() {
    Object.assign(this.element.style, { left: '', top: '', right: '', width: '' });
  }

  #enableDrag(header) {
    if (!header) return;
    header.addEventListener('pointerdown', (event) => {
      if (this.compact.matches || event.target.closest('button, input, a, select')) return;
      if (this.element.closest('.workspace-dock-body')) return;
      const parentEl = this.element.offsetParent ?? document.body;
      const parent = parentEl.getBoundingClientRect();
      const box = this.element.getBoundingClientRect();
      const offsetX = event.clientX - box.left;
      const offsetY = event.clientY - box.top;

      try {
        if (header.setPointerCapture) header.setPointerCapture(event.pointerId);
      } catch (_) {}

      const move = (e) => {
        const maxX = parentEl.clientWidth - this.element.offsetWidth;
        const maxY = parentEl.clientHeight - this.element.offsetHeight;
        Object.assign(this.element.style, {
          left: `${clamp(e.clientX - parent.left - offsetX, 0, Math.max(0, maxX))}px`,
          top: `${clamp(e.clientY - parent.top - offsetY, 0, Math.max(0, maxY))}px`,
          right: 'auto',
          bottom: 'auto',
        });
      };

      const up = () => {
        try {
          if (header.hasPointerCapture?.(event.pointerId)) header.releasePointerCapture(event.pointerId);
        } catch (_) {}
        header.removeEventListener('pointermove', move);
        header.removeEventListener('pointerup', up);
        header.removeEventListener('pointercancel', up);
      };

      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', up);
      header.addEventListener('pointercancel', up);
    });
  }

  #enableResize(handle, from) {
    handle.addEventListener('pointerdown', (event) => {
      if (this.compact.matches) return;
      const startWidth = this.element.offsetWidth;
      const startX = event.clientX;
      const direction = from === 'left' ? -1 : 1;
      try {
        if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
      } catch (_) {}
      handle.classList.add('active');

      const move = (e) => {
        const width = startWidth + direction * (e.clientX - startX);
        this.element.style.width = `${clamp(width, 240, 700)}px`;
      };

      const up = () => {
        handle.classList.remove('active');
        try {
          if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        } catch (_) {}
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };

      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }
}

/**
 * Reusable Draggable floating toolbar.
 */
export class DraggableToolbar {
  constructor(toolbar, handle = null) {
    if (!toolbar) return;
    this.toolbar = toolbar;
    this.handle = handle;
    this.collapseBtn = toolbar.querySelector('#toolbar-collapse-btn, .toolbar-collapse-btn');
    this.compact = window.matchMedia(COMPACT_QUERY);
    this.compact.addEventListener('change', () => this.resetPosition());

    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCollapsed(!this.isCollapsed);
      });
    }

    if (this.isCollapsed) {
      this.setCollapsed(true);
    }

    window.addEventListener('resize', () => {
      if (this.toolbar.style.transform === 'none') {
        const parent = this.toolbar.offsetParent ?? document.body;
        const maxX = parent.clientWidth - this.toolbar.offsetWidth;
        const maxY = parent.clientHeight - this.toolbar.offsetHeight;
        const curLeft = parseFloat(this.toolbar.style.left) || 0;
        const curTop = parseFloat(this.toolbar.style.top) || 0;
        this.toolbar.style.left = `${clamp(curLeft, 0, Math.max(0, maxX))}px`;
        this.toolbar.style.top = `${clamp(curTop, 0, Math.max(0, maxY))}px`;
      }
    });

    this.toolbar.addEventListener('pointerdown', (e) => this.#onDown(e));

    if (this.handle) {
      this.handle.addEventListener('dblclick', () => this.resetPosition());
      this.handle.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) {
          e.preventDefault();
          if (e.key === 'Home') return this.resetPosition();
          const step = e.shiftKey ? 40 : 10;
          const parent = this.toolbar.offsetParent ?? document.body;
          const pBox = parent.getBoundingClientRect();
          const box = this.toolbar.getBoundingClientRect();
          let left = box.left - pBox.left;
          let top = box.top - pBox.top;
          if (e.key === 'ArrowLeft') left -= step;
          if (e.key === 'ArrowRight') left += step;
          if (e.key === 'ArrowUp') top -= step;
          if (e.key === 'ArrowDown') top += step;
          const maxX = parent.clientWidth - this.toolbar.offsetWidth;
          const maxY = parent.clientHeight - this.toolbar.offsetHeight;
          Object.assign(this.toolbar.style, {
            transform: 'none',
            left: `${clamp(left, 0, Math.max(0, maxX))}px`,
            top: `${clamp(top, 0, Math.max(0, maxY))}px`,
          });
        }
      });
    }
  }

  get isCollapsed() {
    return this.toolbar.classList.contains('is-collapsed');
  }

  setCollapsed(collapsed) {
    this.toolbar.classList.toggle('is-collapsed', collapsed);
    const tipsOn = (typeof document !== 'undefined' && document.body?.classList?.contains('interaction-tips-enabled')) ||
                   (typeof localStorage !== 'undefined' && localStorage.getItem('vml_interaction_tips_enabled') !== 'false');
    this.toolbar.classList.toggle('tips-active', Boolean(collapsed && tipsOn));
    if (this.collapseBtn) {
      this.collapseBtn.setAttribute('aria-expanded', String(!collapsed));
      this.collapseBtn.setAttribute('aria-label', collapsed ? 'Expand toolbar' : 'Collapse toolbar');
      this.collapseBtn.title = collapsed ? 'Expand viewport modes panel' : 'Collapse / expand viewport modes panel';
      const iconCollapse = this.collapseBtn.querySelector('.icon-collapse');
      const iconExpand = this.collapseBtn.querySelector('.icon-expand');
      if (iconCollapse) iconCollapse.style.display = collapsed ? 'none' : 'inline-block';
      if (iconExpand) iconExpand.style.display = collapsed ? 'inline-block' : 'none';
    }
    if (collapsed) {
      this.resetPosition();
    }
  }

  resetPosition() {
    Object.assign(this.toolbar.style, { left: '', top: '', right: '', bottom: '', transform: '' });
  }

  #onDown(event) {
    if (event.target.closest('button, input, a, select')) return;
    const parentEl = this.toolbar.offsetParent ?? document.body;
    const parent = parentEl.getBoundingClientRect();
    const box = this.toolbar.getBoundingClientRect();
    const offsetX = event.clientX - box.left;
    const offsetY = event.clientY - box.top;

    Object.assign(this.toolbar.style, {
      transform: 'none',
      left: `${box.left - parent.left}px`,
      top: `${box.top - parent.top}px`,
      right: 'auto',
      bottom: 'auto',
    });

    this.toolbar.classList.add('is-dragging');
    try {
      if (this.toolbar.setPointerCapture) this.toolbar.setPointerCapture(event.pointerId);
    } catch (_) {}

    const move = (e) => {
      const maxX = parentEl.clientWidth - this.toolbar.offsetWidth;
      const maxY = parentEl.clientHeight - this.toolbar.offsetHeight;
      this.toolbar.style.left = `${clamp(e.clientX - parent.left - offsetX, 0, Math.max(0, maxX))}px`;
      this.toolbar.style.top = `${clamp(e.clientY - parent.top - offsetY, 0, Math.max(0, maxY))}px`;
    };

    const up = () => {
      this.toolbar.classList.remove('is-dragging');
      try {
        if (this.toolbar.hasPointerCapture?.(event.pointerId)) this.toolbar.releasePointerCapture(event.pointerId);
      } catch (_) {}
      this.toolbar.removeEventListener('pointermove', move);
      this.toolbar.removeEventListener('pointerup', up);
      this.toolbar.removeEventListener('pointercancel', up);
    };

    this.toolbar.addEventListener('pointermove', move);
    this.toolbar.addEventListener('pointerup', up);
    this.toolbar.addEventListener('pointercancel', up);
  }
}

/**
 * Reusable Telemetry Panel.
 */
export class TelemetryPanel {
  constructor(element, { header, toggleButton, body }, startCollapsed = true) {
    this.element = element;
    this.header = header;
    this.toggleButton = toggleButton;
    this.body = body;

    this.header.setAttribute('role', 'button');
    this.header.tabIndex = 0;
    this.header.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    this.header.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === this.header) {
        e.preventDefault();
        this.setCollapsed(!this.collapsed);
      }
    });

    this.setCollapsed(startCollapsed);
  }

  get collapsed() {
    return this.body.classList.contains('hidden');
  }

  setCollapsed(collapsed) {
    this.body.classList.toggle('hidden', collapsed);
    this.element.classList.toggle('collapsed', collapsed);
    this.header.setAttribute('aria-expanded', String(!collapsed));
    if (this.toggleButton) {
      setPanelMinimizeButtonUI(this.toggleButton, collapsed, 'Telemetry');
    }
  }
}

/**
 * Accordion section and derivation card toggle helper.
 */
export function initCollapsibleSections(root = document) {
  // Ensure all nested sub components are collapsed by default
  const initialSections = Array.from(root.querySelectorAll ? root.querySelectorAll('.collapsible-section') : []);
  initialSections.forEach((s) => {
    s.classList.add('collapsed');
    const header = s.querySelector ? s.querySelector('.collapsible-header') : null;
    if (header) {
      header.setAttribute('aria-expanded', 'false');
      header.classList.remove('open');
      const icon = header.querySelector ? header.querySelector('.icon') : null;
      if (icon) icon.textContent = '▶';
    }
    const content = s.querySelector ? s.querySelector('.collapsible-content') : null;
    if (content) {
      content.classList.remove('open');
      content.classList.add('collapsed');
    }
  });

  const initialCards = Array.from(root.querySelectorAll ? root.querySelectorAll('.derivation-card') : []);
  initialCards.forEach((c) => {
    const header = c.querySelector ? c.querySelector('.derivation-card-header') : null;
    if (header) {
      header.classList.remove('open');
      header.setAttribute('aria-expanded', 'false');
      const icon = header.querySelector ? header.querySelector('.icon') : null;
      if (icon) icon.textContent = '▶';
    }
    const content = c.querySelector ? c.querySelector('.derivation-card-content') : null;
    if (content) {
      content.classList.remove('open');
    }
  });

  const expandBtns = Array.from(root.querySelectorAll ? root.querySelectorAll('.panel-expand-btn, [id$="-expand"]') : [])
    .filter((btn) => btn.id !== 'nav-visuals-btn' && !btn.id?.startsWith('nav-') && !btn.classList?.contains?.('site-nav__dropdown-trigger'));
  expandBtns.forEach((btn) => {
    setExpandButtonUI(btn, false);
  });

  root.addEventListener?.('click', (e) => {
    const expandBtn = e.target.closest ? e.target.closest('.panel-expand-btn, [id$="-expand"]') : null;
    if (expandBtn && (!root.contains || root.contains(expandBtn))) {
      if (expandBtn.id === 'nav-visuals-btn' || expandBtn.id?.startsWith('nav-') || expandBtn.classList?.contains?.('site-nav__dropdown-trigger')) {
        return;
      }
      e.preventDefault?.();
      e.stopPropagation?.();
      const panel = expandBtn.closest ? expandBtn.closest('.ui-panel') : null;
      if (!panel) return;
      const body = panel.querySelector ? panel.querySelector('.panel-body') : null;
      if (!body) return;

      const sections = Array.from(body.querySelectorAll ? body.querySelectorAll('.collapsible-section') : []);
      const cards = Array.from(body.querySelectorAll ? body.querySelectorAll('.derivation-card') : []);
      const isCurrentlyExpanded = expandBtn.getAttribute?.('aria-expanded') === 'true' ||
        (expandBtn.textContent && expandBtn.textContent.includes('Collapse'));
      const shouldExpand = !isCurrentlyExpanded;

      body.classList?.remove('hidden');

      sections.forEach((s) => {
        s.classList?.toggle('collapsed', !shouldExpand);
        const h = s.querySelector ? s.querySelector('.collapsible-header') : null;
        if (h) {
          h.setAttribute?.('aria-expanded', String(shouldExpand));
          h.classList?.toggle('open', shouldExpand);
          const icon = h.querySelector ? h.querySelector('.icon') : null;
          if (icon) icon.textContent = shouldExpand ? '▼' : '▶';
        }
        const c = s.querySelector ? s.querySelector('.collapsible-content') : null;
        if (c) {
          c.classList?.toggle('open', shouldExpand);
          c.classList?.toggle('collapsed', !shouldExpand);
        }
      });

      cards.forEach((c) => {
        const h = c.querySelector ? c.querySelector('.derivation-card-header') : null;
        const content = c.querySelector ? c.querySelector('.derivation-card-content') : null;
        if (h) {
          h.classList?.toggle('open', shouldExpand);
          h.setAttribute?.('aria-expanded', String(shouldExpand));
          const icon = h.querySelector ? h.querySelector('.icon') : null;
          if (icon) icon.textContent = shouldExpand ? '▼' : '▶';
        }
        if (content) {
          content.classList?.toggle('open', shouldExpand);
        }
        c.classList?.toggle('open', shouldExpand);
      });

      const totalOpen = shouldExpand ? (sections.length + cards.length) : 0;
      panel.classList?.toggle('has-expanded-subpanel', totalOpen > 0);
      body.classList?.toggle('is-all-expanded', totalOpen > 1);

      const isSingle = totalOpen === 1;
      sections.forEach((s) => s.classList?.toggle('is-subpanel-overlay', isSingle && !s.classList?.contains('collapsed')));
      cards.forEach((c) => c.classList?.toggle('is-subpanel-overlay', isSingle && (c.classList?.contains('open') || Boolean(c.querySelector?.('.derivation-card-header')?.classList?.contains('open')))));

      setExpandButtonUI(expandBtn, shouldExpand);
      syncPanelElevationTurn(panel);
      return;
    }

    const header = e.target.closest ? e.target.closest('.collapsible-header, .derivation-card-header') : null;
    if (!header || (root.contains && !root.contains(header))) return;

    const card = header.closest('.derivation-card');
    if (card) {
      const isOpen = header.classList.toggle('open');
      card.classList.toggle('open', isOpen);
      header.setAttribute('aria-expanded', String(isOpen));
      const content = card.querySelector('.derivation-card-content');
      if (content) content.classList.toggle('open', isOpen);
      const icon = header.querySelector('.icon');
      if (icon) icon.textContent = isOpen ? '▼' : '▶';
      _syncPanelExpandButton(header);
      return;
    }

    const section = header.closest('.collapsible-section');
    if (section) {
      const isCollapsed = section.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', String(!isCollapsed));
      header.classList.toggle('open', !isCollapsed);
      const icon = header.querySelector('.icon');
      if (icon) {
        icon.textContent = isCollapsed ? '▶' : '▼';
      }
      const content = section.querySelector('.collapsible-content');
      if (content) {
        content.classList.toggle('open', !isCollapsed);
        content.classList.toggle('collapsed', isCollapsed);
      }
      _syncPanelExpandButton(header);
    }
  });
}

function _syncPanelExpandButton(header) {
  const panel = header.closest('.ui-panel');
  if (!panel) return;
  const expandBtn = panel.querySelector('.panel-expand-btn, [id$="-expand"]');
  const body = panel.querySelector('.panel-body');
  if (!body) return;

  const sections = Array.from(body.querySelectorAll('.collapsible-section'));
  const cards = Array.from(body.querySelectorAll('.derivation-card'));
  const openSections = sections.filter((s) => !s.classList.contains('collapsed'));
  const openCards = cards.filter((c) => c.classList.contains('open') || Boolean(c.querySelector('.derivation-card-header')?.classList.contains('open')));

  const totalOpen = openSections.length + openCards.length;
  panel.classList.toggle('has-expanded-subpanel', totalOpen > 0);
  body.classList.toggle('is-all-expanded', totalOpen > 1);

  const isSingle = totalOpen === 1;
  sections.forEach((s) => s.classList.toggle('is-subpanel-overlay', isSingle && !s.classList.contains('collapsed')));
  cards.forEach((c) => c.classList.toggle('is-subpanel-overlay', isSingle && (c.classList.contains('open') || Boolean(c.querySelector('.derivation-card-header')?.classList.contains('open')))));

  const allSectionsOpen = sections.length === 0 || openSections.length === sections.length;
  const allCardsOpen = cards.length === 0 || openCards.length === cards.length;

  if (expandBtn) {
    setExpandButtonUI(expandBtn, allSectionsOpen && allCardsOpen);
  }

  syncPanelElevationTurn(panel, header.closest('.collapsible-section, .derivation-card'));
}

/**
 * Fullscreen button binder.
 */
export function bindFullscreen(button, target) {
  if (!button || !target) return;
  button.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      target.requestFullscreen().catch(() => {});
    }
  });
}

/**
 * Wraps canvas text/stroke with high-contrast text shadow/halo.
 */
export function withShadow(ctx, paint, blur = 4) {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = blur;
  paint();
  ctx.shadowBlur = 0;
}

/**
 * Draws text with a dark protective halo stroke so that underlying lines,
 * arcs, and fills never obstruct or get obstructed by the text.
 */
export function drawHaloText(ctx, text, x, y, color, font = 'bold 13px monospace', align = 'center') {
  ctx.save();
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (align) ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4.5;

  const str = String(text);
  const lines = str.split('\n');
  if (lines.length === 1) {
    ctx.strokeText(lines[0], x, y);
    ctx.fillStyle = color;
    ctx.fillText(lines[0], x, y);
  } else {
    const lineHeight = 13;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      ctx.strokeText(lines[i], x, lineY);
      ctx.fillStyle = color;
      ctx.fillText(lines[i], x, lineY);
    }
  }
  ctx.restore();
}

/**
 * Clean mathematical annotation text with protective halo outline.
 * Replaces heavy rectangular black badge backgrounds to eliminate visual clutter.
 */
export function drawTextBadge(ctx, text, x, y, color, font = 'bold 12px monospace') {
  drawHaloText(ctx, text, x, y, color, font, 'center');
}

/**
 * Standardized single-line angle badge helper:
 * Renders angle symbol and numerical value on a single line (e.g. "α = 22.5°")
 * with dark protective halo to prevent obstructing angle arcs and geometric lines.
 */
export function drawAngleBadge(ctx, symbol, valStr, x, y, color, font = 'bold 12px monospace') {
  const text = (valStr !== undefined && valStr !== null) ? `${symbol} = ${valStr}` : symbol;
  drawHaloText(ctx, text, x, y, color, font, 'center');
}

/**
 * Backward compatibility alias for single-line angle label badge.
 */
export function drawVerticalAngleBadge(ctx, symbol, valStr, x, y, color, font = 'bold 12px monospace') {
  return drawAngleBadge(ctx, symbol, valStr, x, y, color, font);
}

/**
 * Computes radial outward coordinate offsets and SVG alignment anchors
 * for non-obstructive label placement.
 */
export function getRadialLabelCoords(at, center, distance = 16) {
  let ux = 0, uy = -1;
  if (center) {
    const dx = at.x - center.x;
    const dy = at.y - center.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.001) {
      ux = dx / len;
      uy = dy / len;
    }
  }
  const x = at.x + ux * distance;
  const y = at.y + uy * distance;
  const anchor = ux > 0.35 ? 'start' : (ux < -0.35 ? 'end' : 'middle');
  const baseline = uy > 0.35 ? 'hanging' : (uy < -0.35 ? 'alphabetic' : 'central');
  return { x, y, anchor, baseline, ux, uy };
}

/**
 * Standard 2D geometric vertex point: 5px circle, solid fill, 1px white border,
 * plus a high-contrast label with protective halo.
 */
export function drawLabelledPoint(ctx, at, color, label = '', dx = 0, dy = 0, radius = 5) {
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (label) {
    drawHaloText(ctx, label, at.x + dx, at.y + dy, color, 'bold 13px monospace');
  }
}

/**
 * Draws a labelled point on/near a circle with automatic outward radial offset.
 * Mathematically guarantees the label never penetrates the circle interior,
 * never covers chords or radii, and remains strictly outside geometric strokes.
 */
export function drawRadialLabelledPoint(ctx, at, center, color, label = '', distance = 18, radius = 5) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (label) {
    let ux = 0;
    let uy = -1;
    if (center) {
      const dx = at.x - center.x;
      const dy = at.y - center.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.001) {
        ux = dx / len;
        uy = dy / len;
      }
    }

    const lx = at.x + ux * distance;
    const ly = at.y + uy * distance;

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = ux > 0.35 ? 'left' : (ux < -0.35 ? 'right' : 'center');
    ctx.textBaseline = uy > 0.35 ? 'top' : (uy < -0.35 ? 'bottom' : 'middle');

    // Protective dark halo ensures background geometry is not visible through letters
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.lineWidth = 4.5;
    ctx.strokeText(label, lx, ly);

    ctx.fillStyle = color;
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}

/**
 * Sharp mathematical vector arrow without end blobs/globs.
 */
export function drawArrow(ctx, from, to, color, width = 2, head = 10) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Double-ended arrow for infinite lines/tangents/axes.
 */
export function drawDoubleArrow(ctx, p1, p2, color, width = 2, head = 10) {
  drawArrow(ctx, p1, p2, color, width, head);
  drawArrow(ctx, p2, p1, color, width, head);
}

/**
 * Normalizes camera preset names across 2D plane and 3D camera naming conventions.
 */
export function normalizeCameraPreset(val) {
  if (!val) return 'iso';
  const s = String(val).toLowerCase();
  if (s === 'isometric' || s === 'default' || s === 'great-circle' || s === 'iso') return 'iso';
  if (s === 'front' || s === 'xy') return 'front';
  if (s === 'top' || s === 'xz') return 'top';
  if (s === 'side' || s === 'yz') return 'side';
  return s;
}

/**
 * Draws a 2D Cartesian grid, coordinate axes, and active projection watermark through (cx, cy).
 * - vis2d.grid !== false: draws subtle Cartesian grid lines across the canvas.
 * - vis2d.axes !== false: draws re-orientated coordinate axes matching the active camera perspective
 *   (top: +X/+Z plan, front: +X/+Y elevation, side: +Z/+Y profile, iso: +X/+Y2D section).
 * - Watermark pill indicates active projection plane and orientation.
 */
export function draw2DCartesianGrid(ctx, width, height, cx, cy, vis2d = {}, step = 40, perspective = null) {
  const showGrid = vis2d?.grid !== false;
  const showAxes = vis2d?.axes !== false;
  const showLabels = vis2d?.labels !== false;
  const showCoords = Boolean(vis2d?.coords);
  const rawP = perspective || vis2d?.cameraPerspective || vis2d?.perspective;
  const p = rawP ? normalizeCameraPreset(rawP) : null;

  ctx.save();

  if (showGrid) {
    ctx.lineWidth = 1;
    // Secondary grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.22)';
    ctx.beginPath();
    const startX = cx % step;
    for (let x = startX; x <= width; x += step) {
      if (Math.abs(x - cx) < 1) continue;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    const startY = cy % step;
    for (let y = startY; y <= height; y += step) {
      if (Math.abs(y - cy) < 1) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Primary grid lines every 4 steps
    const majorStep = step * 4;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
    ctx.beginPath();
    const startMajorX = cx % majorStep;
    for (let x = startMajorX; x <= width; x += majorStep) {
      if (Math.abs(x - cx) < 1) continue;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    const startMajorY = cy % majorStep;
    for (let y = startMajorY; y <= height; y += majorStep) {
      if (Math.abs(y - cy) < 1) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  if (showAxes) {
    let xColor = PALETTE.amber;
    let yColor = PALETTE.lime;
    let xLabel = '+X';
    let xNegLabel = '-X';
    let yLabel = '+Y';
    let yNegLabel = '-Y';

    if (p === 'top') {
      xColor = PALETTE.amber;
      yColor = PALETTE.steel;
      xLabel = '+X';
      xNegLabel = '-X';
      yLabel = '+Z';
      yNegLabel = '-Z';
    } else if (p === 'side') {
      xColor = PALETTE.steel;
      yColor = PALETTE.lime;
      xLabel = '+Z';
      xNegLabel = '-Z';
      yLabel = '+Y';
      yNegLabel = '-Y';
    } else if (p === 'iso') {
      xColor = PALETTE.amber;
      yColor = PALETTE.emerald;
      xLabel = '+X';
      xNegLabel = '-X';
      yLabel = '+Y₂D';
      yNegLabel = '-Y₂D';
    }

    // Horizontal Axis
    ctx.strokeStyle = xColor;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Vertical Axis
    ctx.strokeStyle = yColor;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Arrowheads (+Horiz at right, -Horiz at left, +Vert at top, -Vert at bottom)
    const arrowHead = 8;
    // +Horiz (right)
    ctx.fillStyle = xColor;
    ctx.beginPath();
    ctx.moveTo(width - 2, cy);
    ctx.lineTo(width - arrowHead - 2, cy - 4);
    ctx.lineTo(width - arrowHead - 2, cy + 4);
    ctx.closePath();
    ctx.fill();

    // -Horiz (left)
    ctx.beginPath();
    ctx.moveTo(2, cy);
    ctx.lineTo(arrowHead + 2, cy - 4);
    ctx.lineTo(arrowHead + 2, cy + 4);
    ctx.closePath();
    ctx.fill();

    // +Vert (top)
    ctx.fillStyle = yColor;
    ctx.beginPath();
    ctx.moveTo(cx, 2);
    ctx.lineTo(cx - 4, arrowHead + 2);
    ctx.lineTo(cx + 4, arrowHead + 2);
    ctx.closePath();
    ctx.fill();

    // -Vert (bottom)
    ctx.beginPath();
    ctx.moveTo(cx, height - 2);
    ctx.lineTo(cx - 4, height - arrowHead - 2);
    ctx.lineTo(cx + 4, height - arrowHead - 2);
    ctx.closePath();
    ctx.fill();

    // Axis Labels & Watermark
    if (showLabels) {
      drawHaloText(ctx, xLabel, width - 20, cy - 10, xColor, 'bold 11px monospace');
      drawHaloText(ctx, xNegLabel, 20, cy - 10, xColor, 'bold 11px monospace');
      drawHaloText(ctx, yLabel, cx + 12, 18, yColor, 'bold 11px monospace');
      drawHaloText(ctx, yNegLabel, cx + 12, height - 12, yColor, 'bold 11px monospace');

      if (showCoords || rawP) {
        const watermarks = {
          top: 'XZ Plan Projection (Y=0) | Top View',
          front: 'XY Elevation Projection (Z=0) | Front View',
          side: 'YZ Profile Projection (X=0) | Side View',
          iso: 'Isometric Perspective | Great Circle Section',
        };
        const activeKey = p || 'top';
        const wm = watermarks[activeKey] || watermarks.top;
        drawHaloText(ctx, wm, 14, height - 12, 'rgba(148, 163, 184, 0.75)', 'bold 11px monospace');
      }
    }
  }

  ctx.restore();
}

/**
 * Standard Euclidean right-angle square marker.
 */
export function drawRightAngle(ctx, vertex, towards1, towards2, size = 14, color = PALETTE.teal, fill = 'rgba(20, 184, 166, 0.25)') {
  const v1 = { x: towards1.x - vertex.x, y: towards1.y - vertex.y };
  const v2 = { x: towards2.x - vertex.x, y: towards2.y - vertex.y };
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 === 0 || len2 === 0) return;
  const u1 = { x: (v1.x / len1) * size, y: (v1.y / len1) * size };
  const u2 = { x: (v2.x / len2) * size, y: (v2.y / len2) * size };

  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.lineTo(vertex.x + u1.x, vertex.y + u1.y);
  ctx.lineTo(vertex.x + u1.x + u2.x, vertex.y + u1.y + u2.y);
  ctx.lineTo(vertex.x + u2.x, vertex.y + u2.y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/**
 * Draws a filled and stroked angle sector wedge at a vertex.
 * When `anticlockwise` is omitted (null), automatically sweeps the minor interior angle (<= 180°).
 */
export function drawAngleWedge(ctx, vertex, startAngle, endAngle, radius = 28, fill = 'rgba(234, 179, 8, 0.22)', stroke = null, anticlockwise = null) {
  let ccw = anticlockwise;
  if (ccw === null || ccw === undefined) {
    let diff = (endAngle - startAngle) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;
    ccw = diff > Math.PI;
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle, ccw);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Calculates the conjugate reflex angle in degrees (the explementary angle: 360° - θ).
 */
export function computeReflexAngle(deg) {
  const norm = ((deg % 360) + 360) % 360;
  return Number((360 - norm).toFixed(2));
}

/**
 * Draws a conjugate reflex angle wedge (explementary perigon arc 360° - θ) at a vertex.
 */
export function drawReflexWedge(ctx, vertex, startAngle, endAngle, radius = 32, fill = 'rgba(234, 179, 8, 0.12)', stroke = null) {
  let diff = (endAngle - startAngle) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  // If interior angle is clockwise (diff <= Math.PI), reflex arc sweeps in reverse (counter-clockwise on exterior)
  const ccw = diff <= Math.PI;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle, ccw);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Determines the canvas arc parameters (angA, angB, anticlockwise)
 * for the circle arc between points A and B that does NOT contain point P.
 */
export function getSubtendedArcCanvas(center, A, B, P) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const angA = Math.atan2(A.y - center.y, A.x - center.x);
  const angB = Math.atan2(B.y - center.y, B.x - center.x);
  const angP = Math.atan2(P.y - center.y, P.x - center.x);

  const a = norm(angA);
  const b = norm(angB);
  const p = norm(angP);

  const sweepCW = norm(b - a);
  const pOffset = norm(p - a);

  // If clockwise sweep contains P, then counter-clockwise (anticlockwise=true) avoids P
  const anticlockwise = (pOffset > 0 && pOffset < sweepCW);

  return { angA, angB, anticlockwise };
}

/**
 * Draws a circular sector on the arc between A and B that does NOT contain P.
 */
export function drawSubtendedSector(ctx, center, A, B, P, radius, fill = 'rgba(234, 179, 8, 0.16)', stroke = null) {
  const { angA, angB, anticlockwise } = getSubtendedArcCanvas(center, A, B, P);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.arc(center.x, center.y, radius, angA, angB, anticlockwise);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a circular segment bounded by chord AB and the arc that does NOT contain P
 * (or the minor arc between A and B when called with signature `(ctx, center, radius, A, B, fill, stroke)`).
 */
export function drawSubtendedSegment(ctx, center, A, B, P, radius, fill = 'rgba(56, 189, 248, 0.12)', stroke = null) {
  let angA, angB, anticlockwise, r, fillStyle, strokeStyle;
  if (typeof A === 'number') {
    // Called as (ctx, center, radius, ptA, ptB, fill, stroke)
    r = A;
    const ptA = B;
    const ptB = P;
    fillStyle = radius || 'rgba(56, 189, 248, 0.12)';
    strokeStyle = typeof fill === 'string' && fill !== 'rgba(56, 189, 248, 0.12)' ? fill : null;
    angA = Math.atan2(ptA.y - center.y, ptA.x - center.x);
    angB = Math.atan2(ptB.y - center.y, ptB.x - center.x);
    let diff = (angB - angA) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;
    anticlockwise = diff > Math.PI;
  } else {
    ({ angA, angB, anticlockwise } = getSubtendedArcCanvas(center, A, B, P));
    r = radius;
    fillStyle = fill;
    strokeStyle = stroke;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, angA, angB, anticlockwise);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a circular segment bounded by chord AB and the arc that DOES contain point P.
 * (e.g. For Angles in Same Segment and Alternate Segment theorems).
 */
export function drawSegmentContainingPoint(ctx, center, A, B, P, radius, fill = 'rgba(56, 189, 248, 0.10)', stroke = null) {
  const { angA, angB, anticlockwise } = getSubtendedArcCanvas(center, A, B, P);
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, angA, angB, !anticlockwise);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Determines 3D mathematical arc start angle and sweep on the XZ circle
 * for the minor arc between angleA and angleB (sweep <= PI).
 */
export function getMinorArcRange3D(angleA, angleB) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const a = norm(angleA);
  const b = norm(angleB);
  let sweep = norm(b - a);
  if (sweep <= Math.PI) {
    return { start: a, sweep };
  } else {
    return { start: b, sweep: TAU - sweep };
  }
}

/**
 * Determines 3D mathematical arc start angle and sweep on the XZ circle
 * for the arc between angleA and angleB that does NOT contain angleP.
 */
export function getSubtendedArcRange3D(angleA, angleB, angleP) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const a = norm(angleA);
  const b = norm(angleB);
  const p = norm(angleP);

  const forwardSweep = norm(b - a);
  const pOffset = norm(p - a);

  if (pOffset > 0 && pOffset < forwardSweep) {
    return { start: b, sweep: TAU - forwardSweep };
  } else {
    return { start: a, sweep: forwardSweep };
  }
}

/**
 * Standard 2D and 3D visibility configuration defaults matching Thales benchmark.
 */
export function formatCoord(x, y) {
  return `(${Math.round(x)}, ${Math.round(y)})`;
}

export function getPointLabel(name, x, y, vis2d = {}) {
  const showLabels = vis2d.labels !== false;
  const showCoords = Boolean(vis2d.coords);
  if (!showLabels && !showCoords) return '';
  const coordStr = formatCoord(x, y);
  if (showLabels && showCoords) return `${name} ${coordStr}`;
  if (showLabels) return name;
  return coordStr;
}

export function createDefaultVisState() {
  return {
    pan: { x: 0, y: 0 },
    lengthUnit: 'px',
    angleUnit: 'deg',
    cameraMode: 'arcball',
    vis2d: {
      grid: true,
      axes: true,
      points: true,
      labels: true,
      coords: false,
      lengths: true,
      angles: true,
      area: true,
      quadrant: true,
      chords: true,
    },
    vis3d: {
      gridXZ: true,
      axes: true,
      sphere: true,
      circleWire: true,
      labels: true,
      coords: false,
      angles: true,
      area: true,
      quadrant: true,
      chords: true,
    },
  };
}

/**
 * Connects standard 2D and 3D controls & toggles to the visual store and scene controllers.
 */
export function bindStandardToggles(store, ...args) {
  let opts = {};
  if (args.length === 1 && typeof args[0] === 'object') {
    opts = args[0] || {};
  } else if (args.length >= 2) {
    opts = { scene3d: args[0], view2d: args[1], ...(args[2] || {}) };
  }

  const panel2d = opts.panel2d || document.getElementById('toolbar-2d-panel');
  const panel3d = opts.panel3d || document.getElementById('toolbar-3d-panel');
  const sceneTarget = opts.scene3d || opts.view3d;
  const viewTarget = opts.view2d || opts.canvas2d;

  if (panel2d && !panel2d._panelInstance) {
    panel2d._panelInstance = new Panel(panel2d, {
      header: panel2d.querySelector('.panel-header'),
      resizeHandle: panel2d.querySelector('.resize-handle, #toolbar-2d-resize, [id$="-2d-resize"]'),
      resizeFrom: 'right',
      minimizeButton: panel2d.querySelector('#toggle-toolbar-2d-minimize, [id$="-2d-minimize"], [id$="-min"]'),
      expandButton: panel2d.querySelector('#toggle-toolbar-2d-btn, [id$="-2d-btn"], [id$="-expand"]'),
    });
  }

  if (panel3d && !panel3d._panelInstance) {
    panel3d._panelInstance = new Panel(panel3d, {
      header: panel3d.querySelector('.panel-header'),
      resizeHandle: panel3d.querySelector('.resize-handle-left, .resize-handle, #toolbar-3d-resize, [id$="-3d-resize"]'),
      resizeFrom: 'left',
      minimizeButton: panel3d.querySelector('#toggle-toolbar-3d-minimize, [id$="-3d-minimize"], [id$="-min"]'),
      expandButton: panel3d.querySelector('#toggle-toolbar-3d-btn, [id$="-3d-btn"], [id$="-expand"]'),
    });
  }

  const bindCheck = (ids, onChange) => {
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => onChange(e.target.checked));
      }
    }
  };

  const syncCheck = (ids, val) => {
    const list = Array.isArray(ids) ? ids : [ids];
    for (const id of list) {
      const el = document.getElementById(id);
      if (el && el.checked !== Boolean(val)) {
        el.checked = Boolean(val);
      }
    }
  };

  const syncAll = (st = {}) => {
    if (st.vis2d) {
      syncCheck(['vis-2d-grid', 'toggle-2d-grid', 'vis-2d-grid-x'], st.vis2d.grid !== false);
      syncCheck(['vis-2d-axes', 'toggle-2d-axes'], st.vis2d.axes !== false);
      syncCheck(['vis-2d-points', 'toggle-2d-points'], st.vis2d.points !== false);
      syncCheck(['vis-2d-labels', 'toggle-2d-labels'], st.vis2d.labels !== false);
      syncCheck(['vis-2d-coords', 'toggle-2d-coords'], Boolean(st.vis2d.coords));
      syncCheck(['vis-2d-lengths', 'toggle-2d-lengths'], st.vis2d.lengths !== false);
      syncCheck(['vis-2d-angles', 'toggle-2d-angles'], st.vis2d.angles !== false);
      syncCheck(['vis-2d-area', 'toggle-2d-area'], st.vis2d.area !== false);
      syncCheck(['vis-2d-quadrant', 'toggle-2d-quadrant'], st.vis2d.quadrant !== false);
      syncCheck(['vis-2d-chords', 'toggle-2d-chords'], st.vis2d.chords !== false);
      syncCheck(['vis-2d-reflex', 'toggle-2d-reflex'], Boolean(st.vis2d.reflex));
    }
    if (st.vis3d) {
      syncCheck(['vis-3d-grid', 'toggle-3d-grid', 'vis-3d-grid-xz'], st.vis3d.gridXZ !== false);
      syncCheck(['vis-3d-axes', 'toggle-3d-axes'], st.vis3d.axes !== false);
      syncCheck(['vis-3d-sphere', 'toggle-3d-sphere'], st.vis3d.sphere !== false);
      syncCheck(['vis-3d-wire', 'toggle-3d-circle-wire', 'vis-3d-circle-wire'], st.vis3d.circleWire !== false);
      syncCheck(['vis-3d-labels', 'toggle-3d-labels'], st.vis3d.labels !== false);
      syncCheck(['vis-3d-coords', 'toggle-3d-coords'], Boolean(st.vis3d.coords));
      syncCheck(['vis-3d-angles', 'toggle-3d-angles'], st.vis3d.angles !== false);
      syncCheck(['vis-3d-area', 'toggle-3d-area'], st.vis3d.area !== false);
      syncCheck(['vis-3d-quadrant', 'toggle-3d-quadrant'], st.vis3d.quadrant !== false);
      syncCheck(['vis-3d-chords', 'toggle-3d-chords'], st.vis3d.chords !== false);
      syncCheck(['vis-3d-reflex', 'toggle-3d-reflex'], Boolean(st.vis3d.reflex));
    }
  };

  syncAll(store.get());
  store.subscribe((state) => syncAll(state));

  bindCheck(['vis-2d-grid', 'toggle-2d-grid', 'vis-2d-grid-x'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), grid: val } });
  });
  bindCheck(['vis-2d-axes', 'toggle-2d-axes'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), axes: val } });
  });
  bindCheck(['vis-2d-points', 'toggle-2d-points'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), points: val } });
  });
  bindCheck(['vis-2d-labels', 'toggle-2d-labels'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), labels: val } });
  });
  bindCheck(['vis-2d-coords', 'toggle-2d-coords'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), coords: val } });
  });
  bindCheck(['vis-2d-lengths', 'toggle-2d-lengths'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), lengths: val } });
  });
  bindCheck(['vis-2d-angles', 'toggle-2d-angles'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), angles: val }, showAngles: val });
  });
  bindCheck(['vis-2d-area', 'toggle-2d-area'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), area: val }, showArea: val });
  });
  bindCheck(['vis-2d-quadrant', 'toggle-2d-quadrant'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), quadrant: val }, showQuadrant: val });
  });
  bindCheck(['vis-2d-chords', 'toggle-2d-chords'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), chords: val } });
  });
  bindCheck(['vis-2d-reflex', 'toggle-2d-reflex'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), reflex: val }, showReflex: val });
  });

  bindCheck(['vis-3d-grid', 'toggle-3d-grid', 'vis-3d-grid-xz'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), gridXZ: val } });
  });
  bindCheck(['vis-3d-axes', 'toggle-3d-axes'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), axes: val } });
  });
  bindCheck(['vis-3d-sphere', 'toggle-3d-sphere'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), sphere: val } });
  });
  bindCheck(['vis-3d-wire', 'toggle-3d-circle-wire', 'vis-3d-circle-wire'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), circleWire: val } });
  });
  bindCheck(['vis-3d-labels', 'toggle-3d-labels'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), labels: val } });
  });
  bindCheck(['vis-3d-coords', 'toggle-3d-coords'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), coords: val } });
  });
  bindCheck(['vis-3d-angles', 'toggle-3d-angles'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), angles: val }, showAngles: val });
  });
  bindCheck(['vis-3d-area', 'toggle-3d-area'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), area: val }, showArea: val });
  });
  bindCheck(['vis-3d-quadrant', 'toggle-3d-quadrant'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), quadrant: val }, showQuadrant: val });
  });
  bindCheck(['vis-3d-chords', 'toggle-3d-chords'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), chords: val } });
  });
  bindCheck(['vis-3d-reflex', 'toggle-3d-reflex'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), reflex: val }, showReflex: val });
  });

  // 3D & 2D Synchronized Camera Perspective Presets
  const cameraButtonSelector =
    '#toolbar-3d-panel [data-preset], .camera-presets-bar button, [data-camera-preset], #toolbar-2d-panel [data-preset], [data-plane]';

  const applyPerspective = (preset) => {
    const p = normalizeCameraPreset(preset);
    const planeMap = { iso: 'great-circle', top: 'xz', front: 'xy', side: 'yz' };
    const pKey = planeMap[p] || 'great-circle';

    // 1. Update 3D scene camera
    sceneTarget?.setCameraPreset(p);

    // 2. Synchronize 2D and 3D container perspective and illuminated active view badges
    const perspectiveBadges = {
      top: ' <span class="perspective-badge color-yellow font-bold">[Top View: XZ Plan]</span>',
      front: ' <span class="perspective-badge color-lime font-bold">[Front View: XY Elevation]</span>',
      side: ' <span class="perspective-badge color-steel font-bold">[Side View: YZ Profile]</span>',
      iso: ' <span class="perspective-badge color-sky font-bold">[Isometric Perspective]</span>',
    };

    const updateContainerBadge = (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.classList.remove('perspective-top', 'perspective-front', 'perspective-side', 'perspective-iso');
      container.classList.add(`perspective-${p}`);

      const titleEl = container.querySelector('.view-title');
      if (titleEl) {
        if (!titleEl.dataset.origTitle) {
          titleEl.dataset.origTitle = titleEl.innerHTML
            .replace(/\s*<span class="[^"]*(?:color-|perspective-badge)[^"]*font-bold[^"]*">\[.*?\]<\/span>/gi, '')
            .replace(/\s*\[.*?\]/g, '')
            .trim();
        }
        titleEl.innerHTML = `${titleEl.dataset.origTitle}${perspectiveBadges[p] || ''}`;
      }
    };

    updateContainerBadge('canvas-2d-container');
    updateContainerBadge('canvas-3d-container');

    // 3. Update active classes across all buttons in 2D & 3D
    const allButtons = document.querySelectorAll(cameraButtonSelector);
    allButtons.forEach((b) => {
      if (b.classList.contains('camera-mode-toggle')) return;
      const bPreset = b.dataset.preset || b.dataset.cameraPreset || b.dataset.plane;
      if (!bPreset) return;
      b.classList.toggle('active', normalizeCameraPreset(bPreset) === p);
    });

    // 4. Update store state
    store.set({
      cameraPerspective: p,
      plane2D: pKey,
      vis2d: {
        ...(store.get().vis2d || {}),
        cameraPerspective: p,
        plane: pKey,
      },
    });

    // 5. Trigger 2D canvas re-render
    if (viewTarget?.render) {
      viewTarget.render(store.get());
    } else if (viewTarget?.draw) {
      viewTarget.draw();
    }
  };

  // Delegated click handler on document to capture all present and future camera preset buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest(cameraButtonSelector);
    if (!btn || btn.classList.contains('camera-mode-toggle')) return;
    const preset = btn.dataset.preset || btn.dataset.cameraPreset || btn.dataset.plane;
    if (preset) {
      applyPerspective(preset);
    }
  });

  store.subscribe((state) => {
    if (state.cameraPerspective) {
      const p = normalizeCameraPreset(state.cameraPerspective);
      const allButtons = document.querySelectorAll(cameraButtonSelector);
      allButtons.forEach((b) => {
        if (b.classList.contains('camera-mode-toggle')) return;
        const bPreset = b.dataset.preset || b.dataset.cameraPreset || b.dataset.plane;
        if (!bPreset) return;
        b.classList.toggle('active', normalizeCameraPreset(bPreset) === p);
      });
    }
  }, ['cameraPerspective', 'plane2D']);

  // 3D Camera Rotation Mode (Free 360° Trackball vs Constrained Turntable Orbit)
  const presetBars = document.querySelectorAll('.camera-presets-bar');
  presetBars.forEach((bar) => {
    if (!bar.querySelector('.camera-mode-toggle')) {
      const modeBtn = document.createElement('button');
      modeBtn.type = 'button';
      modeBtn.className = 'camera-mode-toggle';
      modeBtn.dataset.cameraMode = 'arcball';
      modeBtn.title = 'Current: Arcball (unconstrained 360° 6-DOF tumbling). Click for Constrained Orbit.';
      modeBtn.innerHTML = '🔄 Arcball';
      bar.appendChild(modeBtn);

      modeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curMode = sceneTarget?.controls?.mode || 'arcball';
        const nextMode = (curMode === 'arcball' || curMode === 'trackball') ? 'orbit' : 'arcball';
        sceneTarget?.controls?.setMode?.(nextMode);
        modeBtn.dataset.cameraMode = nextMode;
        modeBtn.innerHTML = (nextMode === 'arcball' || nextMode === 'trackball') ? '🔄 Arcball' : '🌐 Orbit';
        modeBtn.title = (nextMode === 'arcball' || nextMode === 'trackball')
          ? 'Current: Arcball (unconstrained 360° 6-DOF tumbling). Click for Constrained Orbit.'
          : 'Current: Constrained Orbit (turntable with level horizon). Click for Arcball.';
        store.set({ cameraMode: nextMode });
      });
    }
  });

  // Reset to initial load configuration
  const defaultPreset = opts.defaultCameraPreset || 'iso';
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (typeof store.reset === 'function') {
        store.reset();
      } else if (opts.createInitialState) {
        store.set(opts.createInitialState());
      }
      store.set({
        playing: false,
        viewMode: 'split',
        splitDirection: 'horizontal',
        splitRatio: 50,
        cameraMode: 'arcball',
      });
      sceneTarget?.controls?.setMode?.('arcball');
      presetBars.forEach((bar) => {
        const btn = bar.querySelector('.camera-mode-toggle');
        if (btn) {
          btn.dataset.cameraMode = 'arcball';
          btn.innerHTML = '🔄 Arcball';
          btn.title = 'Current: Arcball (unconstrained 360° 6-DOF tumbling). Click for Constrained Orbit.';
        }
      });
      applyPerspective(defaultPreset);
      opts.onReset?.();
    });
  }

  // Mount Unit System Converter if container is present
  const unitConverterContainer = document.getElementById('content-unit-converter');
  if (unitConverterContainer) {
    new UnitSystemConverter(unitConverterContainer, store);
  }

  // Set initial camera perspective to match 2D and 3D orientation on first load
  applyPerspective(store.get().cameraPerspective || defaultPreset);

  // Export buttons
  const pngButtons = document.querySelectorAll('#btn-export-png, #btn-export-png-2d, #btn-snapshot-png, #toolbar-2d-panel [id*="png"]');
  pngButtons.forEach((btn) => {
    btn.addEventListener('click', () => viewTarget?.exportPNG?.());
  });

  const svgButtons = document.querySelectorAll('#btn-export-svg, #btn-export-svg-2d, #btn-snapshot-svg, #toolbar-2d-panel [id*="svg"]');
  svgButtons.forEach((btn) => {
    btn.addEventListener('click', () => viewTarget?.exportSVG?.());
  });
}

/**
 * Unit System Conversion Controller.
 * Supports Length units: px, cm, mm, in, u (normalized radius units).
 * Supports Angle units: deg, rad, grad, turn.
 * Provides live invariant metric equivalence (r, 2r, 2πr, πr²) and an interactive converter calculator.
 */
export class UnitSystemConverter {
  static LENGTH_CONVERSIONS = {
    px: { name: 'Pixels', symbol: 'px', toPx: 1, fromPx: 1 },
    cm: { name: 'Centimeters', symbol: 'cm', toPx: 96 / 2.54, fromPx: 2.54 / 96 },
    mm: { name: 'Millimeters', symbol: 'mm', toPx: 9.6 / 2.54, fromPx: 25.4 / 96 },
    in: { name: 'Inches', symbol: 'in', toPx: 96, fromPx: 1 / 96 },
    u: { name: 'Normalized Units', symbol: 'u', toPx: 180, fromPx: 1 / 180 },
  };

  static ANGLE_CONVERSIONS = {
    deg: { name: 'Degrees', symbol: '°', toDeg: 1, fromDeg: 1 },
    rad: { name: 'Radians', symbol: 'rad', toDeg: 180 / Math.PI, fromDeg: Math.PI / 180 },
    grad: { name: 'Gradians', symbol: 'gon', toDeg: 360 / 400, fromDeg: 400 / 360 },
    turn: { name: 'Turns', symbol: 'turn', toDeg: 360, fromDeg: 1 / 360 },
  };

  static PRESETS = [
    { id: 'standard', name: 'Standard (px, °)', lengthUnit: 'px', angleUnit: 'deg' },
    { id: 'metric', name: 'Metric (cm, °)', lengthUnit: 'cm', angleUnit: 'deg' },
    { id: 'engineering', name: 'Eng (mm, °)', lengthUnit: 'mm', angleUnit: 'deg' },
    { id: 'analytic', name: 'Math (u, rad)', lengthUnit: 'u', angleUnit: 'rad' },
    { id: 'surveying', name: 'Survey (cm, gon)', lengthUnit: 'cm', angleUnit: 'grad' },
    { id: 'revolutions', name: 'Turns (px, turn)', lengthUnit: 'px', angleUnit: 'turn' },
  ];

  static convertLength(value, fromUnit, toUnit, radius = 180) {
    if (fromUnit === toUnit) return value;
    const r = radius || 1;
    let pxVal;
    if (fromUnit === 'u') {
      pxVal = value * r;
    } else {
      pxVal = value * (UnitSystemConverter.LENGTH_CONVERSIONS[fromUnit]?.toPx || 1);
    }

    if (toUnit === 'u') {
      return pxVal / r;
    }
    return pxVal * (UnitSystemConverter.LENGTH_CONVERSIONS[toUnit]?.fromPx || 1);
  }

  static convertAngle(value, fromUnit, toUnit) {
    if (fromUnit === toUnit) return value;
    const degVal = value * (UnitSystemConverter.ANGLE_CONVERSIONS[fromUnit]?.toDeg || 1);
    return degVal * (UnitSystemConverter.ANGLE_CONVERSIONS[toUnit]?.fromDeg || 1);
  }

  static formatLength(value, unit = 'px', radius = 180, decimals = null) {
    const converted = UnitSystemConverter.convertLength(value, 'px', unit, radius);
    if (decimals !== null) {
      if (unit === 'px') return `${Number(converted).toFixed(decimals)} px`;
      return `${converted.toFixed(decimals)} ${unit}`;
    }
    if (unit === 'px') return `${Math.round(converted)} px`;
    if (unit === 'u') return `${converted.toFixed(2)} u`;
    return `${converted.toFixed(2)} ${unit}`;
  }

  static formatAngle(valueDeg, unit = 'deg', decimals = null) {
    const converted = UnitSystemConverter.convertAngle(valueDeg, 'deg', unit);
    const d = decimals !== null ? decimals : (unit === 'rad' || unit === 'turn' ? 3 : 1);
    if (unit === 'deg') return `${converted.toFixed(d)}°`;
    if (unit === 'rad') return `${converted.toFixed(d)} rad`;
    if (unit === 'grad') return `${converted.toFixed(d)} gon`;
    if (unit === 'turn') return `${converted.toFixed(d)} turn`;
    return `${converted.toFixed(d)} ${unit}`;
  }

  static formatArea(valuePxSq, unit = 'px', radius = 180, decimals = null) {
    const r = radius || 180;
    if (unit === 'px') {
      const d = decimals !== null ? decimals : 1;
      return `${valuePxSq.toFixed(d)} px²`;
    }
    if (unit === 'u') {
      const uArea = valuePxSq / (r * r);
      const d = decimals !== null ? decimals : 2;
      return `${uArea.toFixed(d)} u²`;
    }
    const fromPx = UnitSystemConverter.LENGTH_CONVERSIONS[unit]?.fromPx || 1;
    const convertedArea = valuePxSq * fromPx * fromPx;
    const d = decimals !== null ? decimals : 2;
    return `${convertedArea.toFixed(d)} ${unit}²`;
  }

  constructor(container, store = null) {
    if (!container) return;
    this.container = container;
    this.store = store;
    const curState = store ? store.get() : {};
    this.selectedLengthUnit = curState.lengthUnit || 'px';
    this.selectedAngleUnit = curState.angleUnit || 'deg';
    this.calcValue = 180;
    this.calcUnit = 'len-px';

    this.#renderDOM();
    this.#bindEvents();

    if (this.store) {
      this.store.subscribe((state) => this.update(state), ['radius', 'lengthUnit', 'angleUnit']);
      this.update(this.store.get());
    } else {
      this.update({ radius: 180, lengthUnit: 'px', angleUnit: 'deg' });
    }
  }

  #renderDOM() {
    const matchedPreset = UnitSystemConverter.PRESETS.find(
      (p) => p.lengthUnit === this.selectedLengthUnit && p.angleUnit === this.selectedAngleUnit
    );
    const activeLabel = matchedPreset ? matchedPreset.name : `Custom (${this.selectedLengthUnit}, ${this.selectedAngleUnit})`;

    this.container.innerHTML = `
      <div class="unit-converter-container">
        <div class="active-unit-system-banner">
          <span class="active-unit-system-label">Active Workspace Units:</span>
          <span class="active-unit-system-tag" id="active-system-name">${activeLabel}</span>
        </div>

        <div class="unit-presets-bar" role="group" aria-label="Quick Unit Presets">
          ${UnitSystemConverter.PRESETS.map((p) => `
            <button type="button" class="unit-preset-btn ${p.lengthUnit === this.selectedLengthUnit && p.angleUnit === this.selectedAngleUnit ? 'active' : ''}" data-len="${p.lengthUnit}" data-ang="${p.angleUnit}" title="${p.name}">
              ${p.name.split(' ')[0]}
            </button>
          `).join('')}
        </div>

        <div class="unit-selectors-grid">
          <div class="unit-select-group">
            <label class="unit-label" for="select-length-unit">Active Length Unit</label>
            <select id="select-length-unit" class="unit-select">
              <option value="px" ${this.selectedLengthUnit === 'px' ? 'selected' : ''}>Pixels (px)</option>
              <option value="cm" ${this.selectedLengthUnit === 'cm' ? 'selected' : ''}>Centimeters (cm)</option>
              <option value="mm" ${this.selectedLengthUnit === 'mm' ? 'selected' : ''}>Millimeters (mm)</option>
              <option value="in" ${this.selectedLengthUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
              <option value="u" ${this.selectedLengthUnit === 'u' ? 'selected' : ''}>Normalized (u = r)</option>
            </select>
          </div>
          <div class="unit-select-group">
            <label class="unit-label" for="select-angle-unit">Active Angle Unit</label>
            <select id="select-angle-unit" class="unit-select">
              <option value="deg" ${this.selectedAngleUnit === 'deg' ? 'selected' : ''}>Degrees (°)</option>
              <option value="rad" ${this.selectedAngleUnit === 'rad' ? 'selected' : ''}>Radians (rad)</option>
              <option value="grad" ${this.selectedAngleUnit === 'grad' ? 'selected' : ''}>Gradians (gon)</option>
              <option value="turn" ${this.selectedAngleUnit === 'turn' ? 'selected' : ''}>Turns (rev)</option>
            </select>
          </div>
        </div>

        <div class="unit-metrics-card">
          <div class="unit-metrics-title">
            <span>Live Circle Invariants</span>
            <span class="active-length-unit-tag" id="unit-tag-badge">${this.selectedLengthUnit}</span>
          </div>
          <div class="unit-metric-row"><span>Radius r:</span><span class="unit-metric-val" id="metric-conv-r">0.00</span></div>
          <div class="unit-metric-row"><span>Diameter 2r:</span><span class="unit-metric-val" id="metric-conv-d">0.00</span></div>
          <div class="unit-metric-row"><span>Circumf. 2πr:</span><span class="unit-metric-val" id="metric-conv-c">0.00</span></div>
          <div class="unit-metric-row"><span>Circle Area πr²:</span><span class="unit-metric-val" id="metric-conv-a">0.00</span></div>
        </div>

        <div class="unit-quick-calc">
          <div class="unit-calc-title">Interactive Value Converter</div>
          <div class="unit-calc-inputs">
            <input type="number" id="unit-calc-input" class="unit-calc-input" value="180" step="any" aria-label="Value to convert">
            <select id="unit-calc-type" class="unit-calc-select" aria-label="Unit of value to convert">
              <optgroup label="Length">
                <option value="len-px" selected>px</option>
                <option value="len-cm">cm</option>
                <option value="len-mm">mm</option>
                <option value="len-in">in</option>
                <option value="len-u">u</option>
              </optgroup>
              <optgroup label="Angle">
                <option value="ang-deg">deg (°)</option>
                <option value="ang-rad">rad</option>
                <option value="ang-grad">grad</option>
                <option value="ang-turn">turn</option>
              </optgroup>
            </select>
          </div>
          <div class="unit-calc-results" id="unit-calc-results"></div>
        </div>
      </div>
    `;
  }

  #bindEvents() {
    const selLen = this.container.querySelector('#select-length-unit');
    const selAng = this.container.querySelector('#select-angle-unit');
    const calcInput = this.container.querySelector('#unit-calc-input');
    const calcSelect = this.container.querySelector('#unit-calc-type');

    selLen?.addEventListener('change', (e) => {
      this.selectedLengthUnit = e.target.value;
      if (this.store) {
        this.store.set({ lengthUnit: this.selectedLengthUnit });
      } else {
        this.update({ radius: 180, lengthUnit: this.selectedLengthUnit, angleUnit: this.selectedAngleUnit });
      }
    });

    selAng?.addEventListener('change', (e) => {
      this.selectedAngleUnit = e.target.value;
      if (this.store) {
        this.store.set({ angleUnit: this.selectedAngleUnit });
      } else {
        this.update({ radius: 180, lengthUnit: this.selectedLengthUnit, angleUnit: this.selectedAngleUnit });
      }
    });

    this.container.querySelectorAll('.unit-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const len = btn.getAttribute('data-len');
        const ang = btn.getAttribute('data-ang');
        this.selectedLengthUnit = len;
        this.selectedAngleUnit = ang;
        if (this.store) {
          this.store.set({ lengthUnit: len, angleUnit: ang });
        } else {
          this.update({ radius: 180, lengthUnit: len, angleUnit: ang });
        }
      });
    });

    calcInput?.addEventListener('input', (e) => {
      this.calcValue = parseFloat(e.target.value) || 0;
      this.#renderCalcResults();
    });

    calcSelect?.addEventListener('change', (e) => {
      this.calcUnit = e.target.value;
      this.#renderCalcResults();
    });

    this.#renderCalcResults();
  }

  update(state = {}) {
    if (state.lengthUnit && state.lengthUnit !== this.selectedLengthUnit) {
      this.selectedLengthUnit = state.lengthUnit;
    }
    if (state.angleUnit && state.angleUnit !== this.selectedAngleUnit) {
      this.selectedAngleUnit = state.angleUnit;
    }

    const selLen = this.container.querySelector('#select-length-unit');
    if (selLen && selLen.value !== this.selectedLengthUnit) {
      selLen.value = this.selectedLengthUnit;
    }
    const selAng = this.container.querySelector('#select-angle-unit');
    if (selAng && selAng.value !== this.selectedAngleUnit) {
      selAng.value = this.selectedAngleUnit;
    }

    const badge = this.container.querySelector('#unit-tag-badge');
    if (badge) badge.textContent = this.selectedLengthUnit;

    const bannerTag = this.container.querySelector('#active-system-name');
    const matchedPreset = UnitSystemConverter.PRESETS.find(
      (p) => p.lengthUnit === this.selectedLengthUnit && p.angleUnit === this.selectedAngleUnit
    );
    if (bannerTag) {
      bannerTag.textContent = matchedPreset ? matchedPreset.name : `Custom (${this.selectedLengthUnit}, ${this.selectedAngleUnit})`;
    }

    this.container.querySelectorAll('.unit-preset-btn').forEach((btn) => {
      const blen = btn.getAttribute('data-len');
      const bang = btn.getAttribute('data-ang');
      btn.classList.toggle('active', blen === this.selectedLengthUnit && bang === this.selectedAngleUnit);
    });

    const r = state.radius || 180;
    const lenUnit = this.selectedLengthUnit;
    const elR = this.container.querySelector('#metric-conv-r');
    const elD = this.container.querySelector('#metric-conv-d');
    const elC = this.container.querySelector('#metric-conv-c');
    const elA = this.container.querySelector('#metric-conv-a');

    if (!elR || !elD || !elC || !elA) return;

    const rConv = UnitSystemConverter.convertLength(r, 'px', lenUnit, r);
    const dConv = rConv * 2;
    const cConv = 2 * Math.PI * rConv;
    const aConv = Math.PI * rConv * rConv;

    const fmtDec = (val) => {
      if (lenUnit === 'px') return Math.round(val).toLocaleString();
      if (Math.abs(val) >= 1000) return val.toFixed(1);
      if (Math.abs(val) < 0.01) return val.toExponential(2);
      return val.toFixed(2);
    };

    elR.textContent = `${fmtDec(rConv)} ${lenUnit}`;
    elD.textContent = `${fmtDec(dConv)} ${lenUnit}`;
    elC.textContent = `${fmtDec(cConv)} ${lenUnit}`;
    elA.textContent = `${fmtDec(aConv)} ${lenUnit}²`;

    this.#renderCalcResults(r);
  }

  #renderCalcResults(radius = null) {
    const resultsContainer = this.container.querySelector('#unit-calc-results');
    if (!resultsContainer) return;

    const r = radius || (this.store ? this.store.get().radius : 180) || 180;
    const val = this.calcValue;
    const type = this.calcUnit;

    let html = '';
    if (type.startsWith('len-')) {
      const fromUnit = type.replace('len-', '');
      const units = [
        { id: 'px', label: 'px', name: 'Pixels' },
        { id: 'cm', label: 'cm', name: 'Centimeters' },
        { id: 'mm', label: 'mm', name: 'Millimeters' },
        { id: 'in', label: 'in', name: 'Inches' },
        { id: 'u', label: 'u', name: 'Radius Units' },
      ];
      html = units.map((u) => {
        const conv = UnitSystemConverter.convertLength(val, fromUnit, u.id, r);
        const isCurrent = u.id === fromUnit;
        const formatted = u.id === 'px' ? Math.round(conv) : conv.toFixed(2);
        return `<div class="unit-calc-res-item ${isCurrent ? 'highlight' : ''}">
          <span>${u.name} (${u.label}):</span>
          <strong>${formatted} ${u.label}</strong>
        </div>`;
      }).join('');
    } else {
      const fromUnit = type.replace('ang-', '');
      const units = [
        { id: 'deg', label: '°', name: 'Degrees' },
        { id: 'rad', label: 'rad', name: 'Radians' },
        { id: 'grad', label: 'gon', name: 'Gradians' },
        { id: 'turn', label: 'turn', name: 'Turns' },
      ];
      html = units.map((u) => {
        const conv = UnitSystemConverter.convertAngle(val, fromUnit, u.id);
        const isCurrent = u.id === fromUnit;
        let formatted;
        if (u.id === 'deg') formatted = `${conv.toFixed(1)}°`;
        else if (u.id === 'rad') formatted = `${conv.toFixed(3)} rad`;
        else if (u.id === 'grad') formatted = `${conv.toFixed(1)} gon`;
        else formatted = `${conv.toFixed(3)} turn`;
        return `<div class="unit-calc-res-item ${isCurrent ? 'highlight' : ''}">
          <span>${u.name}:</span>
          <strong>${formatted}</strong>
        </div>`;
      }).join('');
    }

    resultsContainer.innerHTML = html;
  }
}

/**
 * Standard auto-sweep playback controller matching Thales benchmark.
 * Synchronizes playback loop with the store's 'playing' property so that
 * user interactions (dragging points, clicking controls) immediately update
 * the Play/Pause button UI across the application.
 */
export class PlaybackController {
  constructor(store, button, options = {}) {
    this.store = store;
    this.button = button;
    if (typeof options === 'function') {
      this.onStep = options;
      this.field = null;
      this.speed = 0.6;
    } else {
      this.field = options?.field ?? 'angleP';
      this.speed = options?.speed ?? 0.6;
      this.onStep = options?.onStep;
    }
    this.animId = null;
    this.lastTime = null;

    if (this.button) {
      this.button.addEventListener('click', () => {
        const nextState = !this.store.get().playing;
        this.store.set({ playing: nextState });
      });
    }

    this.store.subscribe((state) => this.render(state), ['playing']);
    this.render(this.store.get());
  }

  render(state) {
    const isPlaying = Boolean(state?.playing);

    if (this.button) {
      this.button.classList.toggle('active', isPlaying);
      this.button.setAttribute('aria-pressed', String(isPlaying));
      const playIcon = this.button.querySelector('.icon-play');
      const pauseIcon = this.button.querySelector('.icon-pause');
      const label = this.button.querySelector('.playback-label, span');

      if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'inline-block';
      if (pauseIcon) pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
      if (label) label.textContent = isPlaying ? 'Pause' : 'Play';
    }

    if (isPlaying && !this.animId) {
      this.lastTime = performance.now();
      this.animId = requestAnimationFrame((now) => this.#loop(now));
    } else if (!isPlaying && this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
      this.lastTime = null;
    }
  }

  #loop(now) {
    if (!this.store.get().playing) {
      this.animId = null;
      this.lastTime = null;
      return;
    }
    const delta = Math.min(0.1, (now - (this.lastTime ?? now)) / 1000);
    this.lastTime = now;
    const current = this.store.get();

    if (typeof this.onStep === 'function') {
      this.onStep(delta, this.store, current);
    } else if (this.field) {
      let nextVal = ((current[this.field] ?? 0) + this.speed * delta) % (Math.PI * 2);
      if (nextVal < 0) nextVal += Math.PI * 2;
      this.store.set({ [this.field]: nextVal });
    }

    this.animId = requestAnimationFrame((t) => this.#loop(t));
  }

  pause() {
    if (this.store.get().playing) {
      this.store.set({ playing: false });
    }
  }

  dispose() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
      this.lastTime = null;
    }
  }
}

export {
  WorkspaceDockManager,
  initWorkspaceDock,
  syncPanelElevationTurn,
  stepSpring,
  VelocityTracker,
  computeEdgeSnapTarget,
} from './workspace-dock.js';
export {
  AffineTransform2D,
  evaluateConicConjugacy,
  normalizedConicConjugacy,
  projectPointToAffineEllipse,
} from './circle-transforms.js';
export { ARManager } from './ar-manager.js';
export {
  serializeStateToHash,
  deserializeStateFromHash,
  copyShareUrl,
  showShareToast,
  initPermalinkSync,
} from './permalink.js';
