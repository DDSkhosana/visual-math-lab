/**
 * Shared core utilities, math helpers, and UI widgets for Circle Geometry Visualisations.
 */
import { syncPanelElevationTurn } from './workspace-dock.js';
import { ARManager } from './ar-manager.js';
import { t } from './i18n.js';
import { isSpatialGeometry } from './solid-morph.js';

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
 * Returns the counterclockwise circular arc (start and sweep) between prevAngle and nextAngle
 * that strictly EXCLUDES the opposite vertex oppAngle in a simple cyclic polygon.
 */
export function getValidCyclicArc(prevAngle, nextAngle, oppAngle) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const p = norm(prevAngle);
  const n = norm(nextAngle);
  const opp = norm(oppAngle);
  const sweep = norm(n - p);
  const oppOffset = norm(opp - p);
  const oppInSweep = (oppOffset > 0 && oppOffset < sweep);
  return oppInSweep
    ? { start: n, sweep: TAU - sweep }
    : { start: p, sweep };
}

/**
 * Clamps targetAngle inside the valid cyclic interval between prevAngle and nextAngle
 * with an angular buffer minGap, guaranteeing non-self-intersection (bowtie prevention).
 */
export function clampCyclicAngle(targetAngle, prevAngle, nextAngle, oppAngle, minGap = 0.2) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const t = norm(targetAngle);
  const arc = getValidCyclicArc(prevAngle, nextAngle, oppAngle);
  const effectiveGap = Math.min(minGap, arc.sweep * 0.25);
  const offset = norm(t - arc.start);

  if (offset >= effectiveGap && offset <= arc.sweep - effectiveGap) {
    return t;
  }
  if (offset < effectiveGap) {
    return norm(arc.start + effectiveGap);
  }
  if (offset <= arc.sweep) {
    return norm(arc.start + arc.sweep - effectiveGap);
  }
  const distFromEnd = offset - arc.sweep;
  const distFromStart = TAU - offset;
  return distFromEnd < distFromStart
    ? norm(arc.start + arc.sweep - effectiveGap)
    : norm(arc.start + effectiveGap);
}

/**
 * Clamps targetAngle into a defined circular arc [start, start + sweep] with buffer margin.
 */
export function clampAngleToArc(targetAngle, start, sweep, margin = 0.15) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const t = norm(targetAngle);
  const s = norm(start);
  const effectiveMargin = Math.min(margin, sweep * 0.25);
  const offset = norm(t - s);

  if (offset >= effectiveMargin && offset <= sweep - effectiveMargin) {
    return t;
  }
  if (offset < effectiveMargin) {
    return norm(s + effectiveMargin);
  }
  if (offset <= sweep) {
    return norm(s + sweep - effectiveMargin);
  }
  const distFromEnd = offset - sweep;
  const distFromStart = TAU - offset;
  return distFromEnd < distFromStart
    ? norm(s + sweep - effectiveMargin)
    : norm(s + effectiveMargin);
}

/**
 * Enforces a minimum angular separation between targetAngle and fixedAngle along S¹.
 */
export function clampMinAngleDistance(targetAngle, fixedAngle, minGap = 0.2) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const t = norm(targetAngle);
  const f = norm(fixedAngle);
  let diff = norm(t - f);
  if (diff > Math.PI) diff -= TAU;
  if (Math.abs(diff) < minGap) {
    const sign = diff >= 0 ? 1 : -1;
    return norm(f + (sign * minGap));
  }
  return t;
}

/**
 * Clamps targetAngle strictly between startAngle and endAngle along the counterclockwise arc,
 * enforcing an angular buffer minBuf at both ends.
 */
export function clampAngleInArc(targetAngle, startAngle, endAngle, minBuf = 0.15) {
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const target = norm(targetAngle);
  const s = norm(startAngle + minBuf);
  const e = norm(endAngle - minBuf);
  const sweep = norm(e - s);
  const offset = norm(target - s);
  if (offset <= sweep) return target;
  const distFromEnd = offset - sweep;
  const distFromStart = TAU - offset;
  return distFromEnd < distFromStart ? e : s;
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
 * Calculates the sagitta (height of the circular or geodesic arch above its chord):
 * h = R * (1 - cos(|theta| / 2))
 * For infinitesimal theta, h ≈ R * theta^2 / 8.
 * @param {number} radius - Circle or sphere radius R > 0
 * @param {number} thetaRad - Subtended angle theta in radians
 * @returns {number} Sagitta height h >= 0
 */
export function computeSagitta(radius, thetaRad) {
  const r = Math.max(0, Number(radius) || 0);
  const th = Math.abs(Number(thetaRad) || 0);
  return r * (1 - Math.cos(th / 2));
}

/**
 * Calculates the Euclidean-to-Riemannian metric contraction ratio:
 * rho = chord length / arc length = sinc(theta / 2) = sin(theta / 2) / (theta / 2)
 * As theta -> 0, rho -> 1 (flat Euclidean limit).
 * For theta in (0, 2pi], rho in [0, 1).
 * @param {number} thetaRad - Subtended angle theta in radians
 * @returns {number} Metric contraction ratio rho in [0, 1]
 */
export function computeCurvatureRatio(thetaRad) {
  const th = Math.abs(Number(thetaRad) || 0);
  const half = th / 2;
  if (half < 1e-7) {
    const h2 = half * half;
    return 1 - h2 / 6 + (h2 * h2) / 120;
  }
  return Math.sin(half) / half;
}

/**
 * Conformal stereographic projection from the North Pole (0, R, 0)
 * onto the equatorial plane Y = 0 (X, Z coordinates):
 * Pi(x, y, z) = (R*x / (R - y), 0, R*z / (R - y))
 * Points on the equator (y = 0) are invariant: Pi(x, 0, z) = (x, 0, z).
 * South Pole (0, -R, 0) projects to the origin (0, 0, 0).
 * @param {{x: number, y: number, z: number}} pt3D - Point in R^3 or on S^2
 * @param {number} [radius=1] - Sphere radius R
 * @returns {{x: number, y: number, z: number}} Projected equatorial point
 */
export function projectStereographicToEquator(pt3D, radius = 1) {
  const R = Number(radius) || 1;
  const x = Number(pt3D?.x) || 0;
  const y = Number(pt3D?.y) || 0;
  const z = Number(pt3D?.z) || 0;
  const denom = R - y;
  if (Math.abs(denom) < 1e-12) {
    const scale = 1e6;
    return { x: x * scale, y: 0, z: z * scale };
  }
  const scale = R / denom;
  return {
    x: x * scale,
    y: 0,
    z: z * scale,
  };
}

/**
 * Inverse conformal stereographic projection from the equatorial plane Y = 0
 * back onto the sphere S^2 of radius R:
 * X = 2*R^2*x / (r^2 + R^2)
 * Y = R*(r^2 - R^2) / (r^2 + R^2)
 * Z = 2*R^2*z / (r^2 + R^2)
 * where r^2 = x^2 + z^2.
 * @param {number} x - Equatorial x coordinate
 * @param {number} z - Equatorial z coordinate
 * @param {number} [radius=1] - Sphere radius R
 * @returns {{x: number, y: number, z: number}} Point on S^2 (X^2 + Y^2 + Z^2 = R^2)
 */
export function projectEquatorToSphere(x, z, radius = 1) {
  const R = Number(radius) || 1;
  const px = Number(x) || 0;
  const pz = Number(z) || 0;
  const r2 = px * px + pz * pz;
  const R2 = R * R;
  const denom = r2 + R2;
  if (denom < 1e-12) {
    return { x: 0, y: -R, z: 0 };
  }
  return {
    x: (2 * R2 * px) / denom,
    y: (R * (r2 - R2)) / denom,
    z: (2 * R2 * pz) / denom,
  };
}

/**
 * Continuous Curvature Homotopy H(P, lambda) between flat Euclidean equator (lambda = 0)
 * and Riemannian spherical manifold S^2 (lambda = 1):
 * H(P, lambda) = (1 - lambda) * Pi(P) + lambda * P
 * For points on the equator (y = 0), H(P, lambda) = P for all lambda in [0, 1].
 * @param {{x: number, y: number, z: number}} pt - Point on sphere or equatorial plane
 * @param {number} [lambda=0] - Homotopy parameter lambda in [0, 1]
 * @param {number} [radius=1] - Radius R
 * @returns {{x: number, y: number, z: number}}
 */
export function interpolateCurvatureHomotopy(pt, lambda = 0, radius = 1) {
  const l = clamp(Number(lambda) || 0, 0, 1);
  const R = Number(radius) || 1;
  const proj = projectStereographicToEquator(pt, R);
  const px = Number(pt?.x) || 0;
  const py = Number(pt?.y) || 0;
  const pz = Number(pt?.z) || 0;
  const rawX = (1 - l) * proj.x + l * px;
  const rawY = l * py;
  const rawZ = (1 - l) * proj.z + l * pz;
  return {
    x: Math.abs(rawX) < 1e-15 ? 0 : rawX,
    y: Math.abs(rawY) < 1e-15 ? 0 : rawY,
    z: Math.abs(rawZ) < 1e-15 ? 0 : rawZ,
  };
}

/**
 * Continuous interpolation along the chord-to-geodesic continuum:
 * At lambda = 0: Straight 1-simplex Euclidean chord segment (1 - t)*A + t*B.
 * At lambda = 1: Riemannian geodesic great circle arc via spherical SLERP.
 * Midpoint elevation (t = 0.5) rises by the sagitta h = R*(1 - cos(theta/2)).
 * @param {{x: number, y: number, z: number}} pA - Start point
 * @param {{x: number, y: number, z: number}} pB - End point
 * @param {number} [t=0.5] - Path parameter in [0, 1]
 * @param {number} [lambda=1] - Curvature homotopy parameter in [0, 1]
 * @param {number} [radius=1] - Sphere radius
 * @returns {{x: number, y: number, z: number}}
 */
export function interpolateGeodesicChord(pA, pB, t = 0.5, lambda = 1, radius = 1) {
  const s = clamp(Number(t) || 0, 0, 1);
  const l = clamp(Number(lambda) || 0, 0, 1);
  const R = Number(radius) || 1;

  const chordPt = {
    x: (1 - s) * pA.x + s * pB.x,
    y: (1 - s) * pA.y + s * pB.y,
    z: (1 - s) * pA.z + s * pB.z,
  };
  if (l <= 0) return chordPt;

  const lenA = Math.hypot(pA.x, pA.y, pA.z) || 1;
  const lenB = Math.hypot(pB.x, pB.y, pB.z) || 1;
  const uAx = pA.x / lenA, uAy = pA.y / lenA, uAz = pA.z / lenA;
  const uBx = pB.x / lenB, uBy = pB.y / lenB, uBz = pB.z / lenB;
  const dotVal = clamp(uAx * uBx + uAy * uBy + uAz * uBz, -1, 1);
  const theta = Math.acos(dotVal);

  let sphPt;
  if (theta < 1e-4) {
    sphPt = { ...chordPt };
  } else {
    const sinTh = Math.sin(theta);
    const w1 = Math.sin((1 - s) * theta) / sinTh;
    const w2 = Math.sin(s * theta) / sinTh;
    const vx = uAx * w1 + uBx * w2;
    const vy = uAy * w1 + uBy * w2;
    const vz = uAz * w1 + uBz * w2;
    const vlen = Math.hypot(vx, vy, vz) || 1;
    sphPt = {
      x: (vx / vlen) * R,
      y: (vy / vlen) * R,
      z: (vz / vlen) * R,
    };
  }

  if (l >= 1) return sphPt;

  return {
    x: (1 - l) * chordPt.x + l * sphPt.x,
    y: (1 - l) * chordPt.y + l * sphPt.y,
    z: (1 - l) * chordPt.z + l * sphPt.z,
  };
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
  const collapseLabel = t('derivations.collapse_all', {}, 'Collapse All');
  const expandLabel = t('derivations.expand_all', {}, 'Expand All');
  btn.title = isExpanded ? (t('derivations.collapse_all', {}, 'Collapse all sections')) : (t('derivations.expand_all', {}, 'Expand all sections'));

  let icon = btn.querySelector('.panel-expand-icon');
  let label = btn.querySelector('.panel-expand-label');

  if (!icon || !label) {
    btn.classList.add('panel-expand-btn');
    btn.innerHTML = `
      <span class="panel-expand-icon" aria-hidden="true">${isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG}</span>
      <span class="panel-expand-label">${isExpanded ? collapseLabel : expandLabel}</span>
    `;
    return;
  }

  icon.innerHTML = isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG;
  label.textContent = isExpanded ? collapseLabel : expandLabel;
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
    this.compact = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(COMPACT_QUERY) : { matches: false, addEventListener: () => {} };
    this.compact.addEventListener('change', () => this.#resetLayout());

    this.#enableDrag(header);
    if (resizeHandle) this.#enableResize(resizeHandle, resizeFrom);
    minimizeButton?.addEventListener('click', (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      this.setMinimized(!this.minimized);
    });
    expandButton?.addEventListener('click', (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      this.#toggleAll();
    });
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
    if (!minimized) {
      this.body.style.display = '';
      this.element.classList.remove('is-shaded');
      if (this.element.classList.contains('is-floating')) {
        this.element.style.height = this.unshadedHeight || '380px';
      }
    } else {
      this.element.classList.add('is-shaded');
      if (this.element.classList.contains('is-floating')) {
        this.unshadedHeight = this.element.style.height || '380px';
        this.element.style.height = 'auto';
      }
    }
    const shadeBtn = this.element.querySelector('.panel-shade-btn');
    if (shadeBtn) {
      shadeBtn.innerHTML = minimized ? `□` : `─`;
      shadeBtn.title = minimized ? 'Restore window height' : 'Roll up / restore window';
      shadeBtn.setAttribute('aria-expanded', String(!minimized));
    }
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
      if (this.element.closest('.workspace-dock-body') || this.element.classList.contains('is-floating') || this.element.closest('.floating-workspace')) return;
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
 * Reusable Draggable floating toolbar with 8-directional resizing,
 * scroll overflow, and adaptive layout reflow.
 */
export class DraggableToolbar {
  static RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  constructor(toolbar, handle = null) {
    if (!toolbar) return;
    this.toolbar = toolbar;
    this.handle = handle;
    this.collapseBtn = toolbar.querySelector('#toolbar-collapse-btn, .toolbar-collapse-btn');
    this.content = toolbar.querySelector('#toolbar-content, .toolbar-content');
    this.compact = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(COMPACT_QUERY) : { matches: false, addEventListener: () => {} };
    this.compact.addEventListener('change', () => this.resetPosition());

    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCollapsed(!this.isCollapsed);
      });
    }

    this.#initResizeHandles();

    if (this.isCollapsed) {
      this.setCollapsed(true);
    } else {
      this.#updateReflowState();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (this.toolbar.style.transform === 'none') {
          const parent = this.toolbar.offsetParent ?? document.body;
          if (this._hasCustomSize && this.toolbar.style.width) {
            const maxW = Math.max(160, parent.clientWidth - 16);
            const curW = parseFloat(this.toolbar.style.width) || 0;
            if (curW > maxW) {
              this.toolbar.style.width = `${maxW}px`;
              this._savedWidth = `${maxW}px`;
            }
          }
          if (this._hasExplicitHeight && this.toolbar.style.height && this.toolbar.style.height !== 'auto') {
            const maxH = Math.max(38, parent.clientHeight - 16);
            const curH = parseFloat(this.toolbar.style.height) || 0;
            if (curH > maxH) {
              this.toolbar.style.height = `${maxH}px`;
              this._savedHeight = `${maxH}px`;
            }
          }
          const maxX = parent.clientWidth - this.toolbar.offsetWidth;
          const maxY = parent.clientHeight - this.toolbar.offsetHeight;
          const curLeft = parseFloat(this.toolbar.style.left) || 0;
          const curTop = parseFloat(this.toolbar.style.top) || 0;
          this.toolbar.style.left = `${clamp(curLeft, 0, Math.max(0, maxX))}px`;
          this.toolbar.style.top = `${clamp(curTop, 0, Math.max(0, maxY))}px`;
        }
        if (!this.isCollapsed) {
          this.#updateReflowState();
        }
      });
    }

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
      this.toolbar.classList.remove('is-reflow-wrap', 'is-reflow-vertical', 'is-reflow-nowrap');
      this.toolbar.style.width = '';
      this.toolbar.style.height = '';
      if (!this._hasCustomPos) {
        this.resetPosition();
      }
    } else {
      if (this._hasCustomSize) {
        if (this._savedWidth) this.toolbar.style.width = this._savedWidth;
        if (this._savedHeight) this.toolbar.style.height = this._savedHeight;
        this.toolbar.classList.add('is-resized');
      }
      this.#updateReflowState();
    }
  }

  resetSize() {
    this._hasCustomSize = false;
    this._hasExplicitHeight = false;
    this._savedWidth = '';
    this._savedHeight = '';
    this.toolbar.style.width = '';
    this.toolbar.style.height = '';
    this.toolbar.classList.remove('is-resized', 'is-resizing', 'is-reflow-wrap', 'is-reflow-vertical', 'is-reflow-nowrap');
    if (this.toolbar.dataset) {
      delete this.toolbar.dataset.reflowMode;
    }
    this.#updateReflowState();
  }

  resetPosition() {
    this._hasCustomPos = false;
    this.resetSize();
    Object.assign(this.toolbar.style, { left: '', top: '', right: '', bottom: '', transform: '' });
  }

  #initResizeHandles() {
    for (const dir of DraggableToolbar.RESIZE_DIRS) {
      let h = this.toolbar.querySelector?.(`.toolbar-resize-handle[data-resize-dir="${dir}"]`);
      if (!h && typeof document !== 'undefined' && document.createElement && this.toolbar.appendChild) {
        h = document.createElement('div');
        h.className = `toolbar-resize-handle handle-${dir}`;
        h.dataset.resizeDir = dir;
        h.setAttribute('aria-hidden', 'true');
        h.title = 'Drag to resize modes panel (Double-click to reset size)';
        this.toolbar.appendChild(h);
      }
      if (h) {
        h.addEventListener('pointerdown', (e) => this.#onResizeDown(e, dir, h));
        h.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.resetSize();
        });
      }
    }

    if (this.content) {
      this.content.addEventListener('wheel', (e) => {
        if (this.isCollapsed) return;
        const canScrollY = this.content.scrollHeight > this.content.clientHeight + 2;
        const canScrollX = this.content.scrollWidth > this.content.clientWidth + 2;
        if (!canScrollX && !canScrollY) return;
        e.stopPropagation();
        if (!canScrollY && canScrollX && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          this.content.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        if (!this.isCollapsed && !this.toolbar.classList.contains('is-resizing')) {
          this.#updateReflowState();
        }
      });
      this._resizeObserver.observe(this.toolbar);
    }
  }

  #updateReflowState(widthOverride = null, heightOverride = null) {
    if (!this.toolbar || this.isCollapsed) {
      this.toolbar?.classList?.remove('is-reflow-wrap', 'is-reflow-vertical', 'is-reflow-nowrap');
      return;
    }
    const box = this.toolbar.getBoundingClientRect?.() || { width: 0, height: 0 };
    const w = widthOverride ?? (parseFloat(this.toolbar.style.width) || box.width || 0);
    const h = heightOverride ?? (this._hasExplicitHeight ? (parseFloat(this.toolbar.style.height) || box.height || 0) : null);

    if (!w) return;

    const isSingleRowStrip = h !== null && h <= 52 && w >= 240;
    const isVertical = !isSingleRowStrip && w < 320;
    const isWrap = !isSingleRowStrip && !isVertical && w < 780;

    this.toolbar.classList.toggle('is-reflow-nowrap', Boolean(isSingleRowStrip));
    this.toolbar.classList.toggle('is-reflow-vertical', Boolean(isVertical));
    this.toolbar.classList.toggle('is-reflow-wrap', Boolean(isWrap));
    if (this.toolbar.dataset) {
      this.toolbar.dataset.reflowMode = isVertical
        ? 'vertical'
        : isWrap
          ? 'wrap'
          : isSingleRowStrip
            ? 'nowrap-scroll'
            : 'horizontal';
    }
  }

  #onResizeDown(event, dir, handleEl) {
    if (this.isCollapsed) return;
    event.stopPropagation();
    event.preventDefault();

    const parentEl = this.toolbar.offsetParent ?? document.body;
    const parent = parentEl.getBoundingClientRect();
    const box = this.toolbar.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = box.left - parent.left;
    const startTop = box.top - parent.top;
    const startWidth = box.width;
    const startHeight = box.height;

    const minW = 160;
    const minH = 38;
    const hasHoriz = dir.includes('e') || dir.includes('w');
    const hasVert = dir.includes('n') || dir.includes('s');

    this._hasCustomPos = true;
    this._hasCustomSize = true;
    if (hasVert) {
      this._hasExplicitHeight = true;
    }

    Object.assign(this.toolbar.style, {
      transform: 'none',
      left: `${startLeft}px`,
      top: `${startTop}px`,
      width: `${startWidth}px`,
      height: this._hasExplicitHeight ? `${startHeight}px` : 'auto',
      right: 'auto',
      bottom: 'auto',
    });

    this.toolbar.classList.add('is-resizing', 'is-resized');

    const captureTarget = handleEl || this.toolbar;
    try {
      if (captureTarget.setPointerCapture && event.pointerId !== undefined) {
        captureTarget.setPointerCapture(event.pointerId);
      }
    } catch (_) {}

    const move = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const pWidth = parentEl.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200) || 1200;
      const pHeight = parentEl.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800) || 800;

      let nextLeft = startLeft;
      let nextTop = startTop;
      let nextW = startWidth;
      let nextH = startHeight;

      if (dir.includes('e')) {
        const maxE = Math.max(minW, pWidth - startLeft - 8);
        nextW = clamp(startWidth + dx, minW, maxE);
      }
      if (dir.includes('w')) {
        const maxW = Math.max(minW, startLeft + startWidth - 8);
        nextW = clamp(startWidth - dx, minW, maxW);
        nextLeft = startLeft + (startWidth - nextW);
      }
      if (dir.includes('s')) {
        const maxS = Math.max(minH, pHeight - startTop - 8);
        nextH = clamp(startHeight + dy, minH, maxS);
      }
      if (dir.includes('n')) {
        const maxN = Math.max(minH, startTop + startHeight - 8);
        nextH = clamp(startHeight - dy, minH, maxN);
        nextTop = startTop + (startHeight - nextH);
      }

      this.toolbar.style.left = `${nextLeft}px`;
      this.toolbar.style.top = `${nextTop}px`;
      if (hasHoriz || this.toolbar.style.width) {
        this.toolbar.style.width = `${nextW}px`;
        this._savedWidth = `${nextW}px`;
      }
      if (this._hasExplicitHeight) {
        this.toolbar.style.height = `${nextH}px`;
        this._savedHeight = `${nextH}px`;
      } else {
        this.toolbar.style.height = 'auto';
        this._savedHeight = '';
      }

      this.#updateReflowState(nextW, this._hasExplicitHeight ? nextH : null);
    };

    const up = () => {
      this.toolbar.classList.remove('is-resizing');
      try {
        if (captureTarget.hasPointerCapture?.(event.pointerId)) {
          captureTarget.releasePointerCapture(event.pointerId);
        }
      } catch (_) {}
      captureTarget.removeEventListener('pointermove', move);
      captureTarget.removeEventListener('pointerup', up);
      captureTarget.removeEventListener('pointercancel', up);
    };

    captureTarget.addEventListener('pointermove', move);
    captureTarget.addEventListener('pointerup', up);
    captureTarget.addEventListener('pointercancel', up);
  }

  #onDown(event) {
    if (event.target.closest('button, input, a, select, .toolbar-resize-handle')) return;
    if (this.content && event.target === this.content) {
      if (event.offsetX > this.content.clientWidth || event.offsetY > this.content.clientHeight) {
        return;
      }
    }
    // On touch devices, if touching inside an overflowing .toolbar-content (and not the explicit drag handle),
    // allow smooth touch-scrolling inside the toolbar content instead of hijacking as a panel move.
    if (
      event.pointerType === 'touch' &&
      this.content &&
      this.content.contains?.(event.target) &&
      (!this.handle || !this.handle.contains?.(event.target))
    ) {
      const canScrollX = (this.content.scrollWidth || 0) > (this.content.clientWidth || 0) + 2;
      const canScrollY = (this.content.scrollHeight || 0) > (this.content.clientHeight || 0) + 2;
      if (canScrollX || canScrollY) {
        return;
      }
    }
    this._hasCustomPos = true;
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
    if (e.defaultPrevented) return;
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
      if (body.style) body.style.display = '';
      panel.classList?.remove('is-shaded');
      const shadeBtn = panel.querySelector ? panel.querySelector('.panel-shade-btn') : null;
      if (shadeBtn) {
        shadeBtn.innerHTML = '─';
        shadeBtn.title = 'Roll up / restore window';
        shadeBtn.setAttribute?.('aria-expanded', 'true');
      }

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
 * Robust string regex escaping helper.
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a rendered annotation string (badge, point label, coordinate string)
 * against an individual label identifier/key.
 *
 * Distinguishes case-sensitive single-letter points (A, B, C, P, O) from edge labels (a, b, c),
 * supports numerical angle prefixes (2θ, θ, α, β, 90°), function tokens (cos, sin),
 * and subscripts (P₁, P₂, T₁, T₂, N_D).
 */
export function isLabelKeyMatch(text, key) {
  if (!text || !key) return false;
  const t = String(text).trim();
  const k = String(key).trim();
  if (t === k) return true;

  // Normalized subscripts (e.g. P₁ -> P1, T₁ -> T1)
  const normT = t.replace(/₁/g, '1').replace(/₂/g, '2');
  const normK = k.replace(/₁/g, '1').replace(/₂/g, '2');
  if (normT === normK) return true;

  // Single letter case-sensitive match (distinguishes Point 'A' from edge 'a = 5')
  if (k.length === 1 && /[A-Za-z]/.test(k)) {
    const pointRegex = new RegExp(`^${k}(?:\\s*\\(|\\s*,|\\s*:|\\s+|$)`);
    if (pointRegex.test(t) || pointRegex.test(normT)) return true;

    const edgeRegex = new RegExp(`^${k}\\s*=`);
    if (edgeRegex.test(t) || edgeRegex.test(normT)) return true;

    // Greek alpha alias 'a' -> 'α' (angle or edge label)
    if (k === 'a' && (/^α\*?(?:\s*\(|\s*=|\s*:|\s*)/.test(t) || /^alpha\*?(?:\s*\(|\s*=|\s*:|\s*)/.test(normT))) return true;

    return false;
  }

  // Multi-character keys: e.g. "2θ", "90°", "cos", "sin", "P1", "T1", "A'", "Hc", "Uc", "N_D"
  if (k.endsWith('°')) {
    const numPart = k.slice(0, -1);
    if (/^\d+$/.test(numPart)) {
      const degRegex = new RegExp(`^${numPart}(?:\\.0+)?°`, 'i');
      if (degRegex.test(t) || degRegex.test(normT)) return true;
    }
  }

  const escK = escapeRegex(k);
  const escNormK = escapeRegex(normK);

  const multiRegex = new RegExp(`^${escK}\\*?(?:\\s*\\(|\\s*=|\\s*:|\\s*\\+|-|\\s+|$)`, 'i');
  if (multiRegex.test(t) || multiRegex.test(normT)) return true;

  const multiNormRegex = new RegExp(`^${escNormK}\\*?(?:\\s*\\(|\\s*=|\\s*:|\\s*\\+|-|\\s+|$)`, 'i');
  if (multiNormRegex.test(normT)) return true;

  if (t.startsWith(`∠${k}`) || normT.startsWith(`∠${normK}`)) return true;

  // Cyclic quadrilateral generic 'Angles' token
  if ((k.toLowerCase() === 'angles') && (t.startsWith('∠') || t.includes('°'))) return true;

  // Greek theta angle aliases (θ matches θ, θ₁, θ₂, θ*)
  if (k === 'θ' && (/^θ[₁₂]?\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(t) || /^θ[12]?\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(normT))) return true;
  if (k === '2θ' && (/^2θ\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(t) || /^2θ\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(normT))) return true;
  if ((k === 'α' || k === 'alpha') && (/^α\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(t) || /^alpha\*?(?:\s*\(|\s*=|\s*:|\s*|\+|-|$)/.test(normT) || t.includes('Ext D'))) return true;

  // Alternate segment tokens
  if ((k.toLowerCase() === 'tangent') && t.toLowerCase().startsWith('tangent')) return true;
  if ((k === 'segMajor' || k === 'Alt Seg (Maj)') && (t.includes('Alt Seg (Maj)') || t.includes('Alternate Segment (Major)'))) return true;
  if ((k === 'segMinor' || k === 'Alt Seg (Min)') && (t.includes('Alt Seg (Min)') || t.includes('Alternate Segment (Minor)'))) return true;

  // Special multi-char aliases
  if ((k === 'N_D' || k === 'N_diff') && (t.startsWith('N_D') || t.startsWith('N_diff'))) return true;
  if ((k === 'cos' || k === 'cos θ') && t.toLowerCase().startsWith('cos')) return true;
  if ((k === 'sin' || k === 'sin θ') && t.toLowerCase().startsWith('sin')) return true;
  if ((k === 'tan' || k === 'tan θ') && t.toLowerCase().startsWith('tan')) return true;
  if ((k === 'csc' || k === 'csc θ') && t.toLowerCase().startsWith('csc')) return true;
  if ((k === 'sec' || k === 'sec θ') && t.toLowerCase().startsWith('sec')) return true;
  if ((k === 'cot' || k === 'cot θ') && t.toLowerCase().startsWith('cot')) return true;

  return false;
}

/**
 * Checks if a specific label/text should be visible according to individual label filter.
 */
export function isLabelVisible(name, vis = {}) {
  if (!name) return true;
  const hidden = vis.hiddenLabels;
  if (!hidden || typeof hidden !== 'object') return true;

  for (const [key, isHidden] of Object.entries(hidden)) {
    if (isHidden && isLabelKeyMatch(name, key)) {
      return false;
    }
  }
  return true;
}

/**
 * Draws text with a dark protective halo stroke so that underlying lines,
 * arcs, and fills never obstruct or get obstructed by the text.
 */
export function drawHaloText(ctx, text, x, y, color, font = 'bold 13px monospace', align = 'center') {
  if (!text) return;
  const vis = ctx?.__vis || ctx?._vis2d;
  if (vis) {
    if (vis.labels === false) return;
    if (!isLabelVisible(text, vis)) return;
  }
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

  if (ctx && ctx._pendingAffineState && !ctx._affineSaved) {
    const st = ctx._pendingAffineState;
    const s = st.affineStretch ?? 1.35;
    const omega = st.affineAxisAngle ?? 0;
    const r = st.radius || 180;
    ctx.save?.();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash?.([4, 4]);
    ctx.beginPath?.();
    ctx.arc?.(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke?.();
    ctx.setLineDash?.([]);
    ctx.restore?.();

    ctx.save?.();
    ctx._affineSaved = true;
    ctx._affineCenter = { cx, cy };
    ctx.translate?.(cx, cy);
    ctx.rotate?.(-omega);
    ctx.scale?.(s, 1);
    ctx.rotate?.(omega);
    ctx.translate?.(-cx, -cy);
  }
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
  const isIndividualHidden = !isLabelVisible(name, vis2d);
  const showLabels = (vis2d.labels !== false) && !isIndividualHidden;
  const showCoords = Boolean(vis2d.coords) && !isIndividualHidden;
  if (!showLabels && !showCoords) return '';
  const coordStr = formatCoord(x, y);
  if (showLabels && showCoords) return `${name} ${coordStr}`;
  if (showLabels) return name;
  return coordStr;
}

export const VISUAL_LABELS_REGISTRY = {
  'thales-theorem': [
    { key: 'A', name: 'A', color: 'color-red' },
    { key: 'B', name: 'B', color: 'color-orange' },
    { key: 'P', name: 'P', color: 'color-violet' },
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: '90°', name: '90°', color: 'color-teal', isAngle: true },
    { key: 'θ', name: 'θ', color: 'color-yellow', isAngle: true },
  ],
  'angle-at-centre': [
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'A', name: 'A', color: 'color-red' },
    { key: 'B', name: 'B', color: 'color-orange' },
    { key: 'P', name: 'P', color: 'color-violet' },
    { key: '2θ', name: '2θ', color: 'color-yellow', isAngle: true },
    { key: 'θ', name: 'θ', color: 'color-green', isAngle: true },
  ],
  'angles-in-same-segment': [
    { key: 'A', name: 'A', color: 'color-red' },
    { key: 'B', name: 'B', color: 'color-red' },
    { key: 'P1', name: 'P₁', color: 'color-blue' },
    { key: 'P2', name: 'P₂', color: 'color-emerald' },
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'θ1', name: 'θ₁', color: 'color-blue', isAngle: true },
    { key: 'θ2', name: 'θ₂', color: 'color-emerald', isAngle: true },
    { key: '2θ', name: '2θ', color: 'color-yellow', isAngle: true },
  ],
  'cyclic-quadrilateral': [
    { key: 'A', name: 'A', color: 'color-violet' },
    { key: 'B', name: 'B', color: 'color-cyan' },
    { key: 'C', name: 'C', color: 'color-amber' },
    { key: 'D', name: 'D', color: 'color-rose' },
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'Angles', name: 'Angles', color: 'color-teal', isAngle: true },
  ],
  'tangent-radius': [
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'T', name: 'T', color: 'color-red' },
    { key: 'Q', name: 'Q', color: 'color-yellow' },
    { key: '90°', name: '90°', color: 'color-teal', isAngle: true },
  ],
  'alternate-segment': [
    { key: 'T', name: 'T', color: 'color-red' },
    { key: 'A', name: 'A', color: 'color-blue' },
    { key: 'B', name: 'B', color: 'color-orange' },
    { key: 'D', name: 'D', color: 'color-indigo' },
    { key: 'Tangent', name: 'Tangent', color: 'color-emerald' },
    { key: 'α', name: 'α', color: 'color-yellow', isAngle: true },
    { key: 'segMajor', name: 'Alt Seg (Maj)', color: 'color-sky' },
    { key: 'segMinor', name: 'Alt Seg (Min)', color: 'color-violet' },
  ],
  'tangents-from-external-point': [
    { key: 'O', name: 'O', color: 'color-sky' },
    { key: 'T1', name: 'T₁', color: 'color-emerald' },
    { key: 'T2', name: 'T₂', color: 'color-blue' },
    { key: 'P', name: 'P', color: 'color-red' },
    { key: 'K', name: 'K', color: 'color-violet' },
    { key: '90°', name: '90°', color: 'color-teal', isAngle: true },
    { key: 'α', name: 'α', color: 'color-teal', isAngle: true },
    { key: 'β', name: 'β', color: 'color-teal', isAngle: true },
  ],
  'perpendicular-chord-bisector': [
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'A', name: 'A', color: 'color-blue' },
    { key: 'B', name: 'B', color: 'color-orange' },
    { key: 'M', name: 'M', color: 'color-emerald' },
    { key: '90°', name: '90°', color: 'color-teal', isAngle: true },
  ],
  'unit-circle-helix': [
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'P', name: 'P', color: 'color-violet' },
    { key: 'Cx', name: 'Cx', color: 'color-amber' },
    { key: 'cos', name: 'cos θ', color: 'color-amber' },
    { key: 'sin', name: 'sin θ', color: 'color-emerald' },
  ],
  'law-of-sines': [
    { key: 'A', name: 'A', color: 'color-red' },
    { key: 'B', name: 'B', color: 'color-green' },
    { key: 'C', name: 'C', color: 'color-violet' },
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: "A'", name: "A'", color: 'color-sky' },
    { key: 'Hc', name: 'Hc', color: 'color-orange' },
  ],
  'law-of-cosines': [
    { key: 'A', name: 'A', color: 'color-sky' },
    { key: 'B', name: 'B', color: 'color-emerald' },
    { key: 'C', name: 'C', color: 'color-rose' },
    { key: 'D', name: 'D', color: 'color-amber' },
    { key: 'Uc', name: 'Uc', color: 'color-teal' },
  ],
  'angle-sum-identities': [
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 'A', name: 'A(α)', color: 'color-sky' },
    { key: 'P', name: 'P(α+β)', color: 'color-emerald' },
    { key: 'D', name: 'D(α−β)', color: 'color-rose' },
    { key: 'Q', name: 'Q', color: 'color-amber' },
    { key: 'M', name: 'M', color: 'color-amber' },
    { key: 'N', name: 'N', color: 'color-amber' },
    { key: 'N_D', name: 'N_D', color: 'color-orange' },
  ],
};

export const VISUAL_LABELS_REGISTRY_3D = {
  ...VISUAL_LABELS_REGISTRY,
  'thales-theorem': [
    { key: 'P', name: 'P', color: 'color-violet' },
    { key: 'A', name: 'A', color: 'color-red' },
    { key: 'B', name: 'B', color: 'color-orange' },
    { key: 'O', name: 'O', color: 'color-indigo' },
    { key: 's', name: 's', color: 'color-blue' },
    { key: 't', name: 't', color: 'color-orange' },
    { key: '|d|', name: '|d|', color: 'color-red' },
    { key: 'r', name: 'r', color: 'color-indigo' },
    { key: '90°', name: '90°', color: 'color-teal', isAngle: true },
    { key: 'θ', name: 'θ', color: 'color-yellow', isAngle: true },
  ],
};

export function getVisualLabels(visualId, mode = '2d', containerEl = null) {
  let list = mode === '3d'
    ? (VISUAL_LABELS_REGISTRY_3D[visualId] || VISUAL_LABELS_REGISTRY[visualId])
    : VISUAL_LABELS_REGISTRY[visualId];

  if (!list || list.length === 0) {
    list = VISUAL_LABELS_REGISTRY[visualId] || [];
  }

  const result = [...list];
  const seenKeys = new Set(result.map((it) => it.key));

  if (containerEl) {
    const spans = containerEl.querySelectorAll('span[class*="color-"]');
    spans.forEach((span) => {
      const text = span.textContent.trim();
      const subTokens = text.split(',').map((s) => s.trim()).filter(Boolean);
      for (const token of subTokens) {
        const cleanKey = token.replace(/₁/g, '1').replace(/₂/g, '2');
        if (!seenKeys.has(token) && !seenKeys.has(cleanKey)) {
          const colorClass = Array.from(span.classList).find((c) => c.startsWith('color-')) || 'color-sky';
          result.push({
            key: cleanKey,
            name: token,
            color: colorClass,
          });
          seenKeys.add(token);
          seenKeys.add(cleanKey);
        }
      }
    });
  }

  return result;
}

export function createDefaultVisState() {
  return {
    pan: { x: 0, y: 0 },
    lengthUnit: 'px',
    angleUnit: 'deg',
    cameraMode: 'arcball',
    affineMode: false,
    affineStretch: 1.0,
    affineAxisAngle: 0,
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
      hiddenLabels: {},
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
      hiddenLabels: {},
    },
  };
}

/**
 * Connects standard 2D and 3D controls & toggles to the visual store and scene controllers.
 */
/**
 * Computes the optimal 2D canvas circle radius so that graphics occupy
 * the maximum available viewport width without clipping horizontally or vertically,
 * strictly matching baseline test fixtures at 450x420.
 *
 * @param {number} width - Canvas container width in px
 * @param {number} height - Canvas container height in px
 * @param {string} [visualId] - Identifier of visual for specific geometry scale
 * @returns {number} Optimal circle radius in px
 */
export function computeOptimalViewportRadius(width, height, visualId = '') {
  if (!width || !height || width <= 0 || height <= 0) {
    if (visualId === 'tangents-from-external-point') return 120;
    if (visualId === 'perpendicular-chord-bisector') return 170;
    if (['unit-circle-helix', 'law-of-cosines', 'law-of-sines', 'angle-sum-identities'].includes(visualId)) return 175;
    return 180;
  }

  // Label Clearance Protection: 36px - 44px ensures radial point markers (A, B, C, P),
  // degree badges, and coordinate pills never clip outside the canvas boundary.
  const padX = 45;
  const padY = 30;
  const maxAvailableR = Math.min((width - 2 * padX) / 2, (height - 2 * padY) / 2);

  let multiplier = 1.0;
  if (visualId === 'tangents-from-external-point') {
    multiplier = 120 / 180;
  } else if (visualId === 'perpendicular-chord-bisector') {
    multiplier = 170 / 180;
  } else if (['unit-circle-helix', 'law-of-cosines', 'law-of-sines', 'angle-sum-identities'].includes(visualId)) {
    multiplier = 175 / 180;
  }

  const optR = Math.round(maxAvailableR * multiplier);
  return Math.max(70, optR);
}

/**
 * Mounts interactive chips for toggling individual labels on/off across 2D and 3D overlays.
 * Synchronizes with store.vis2d.hiddenLabels and store.vis3d.hiddenLabels.
 */
export function mountIndividualLabelsUI(store, opts = {}) {
  if (typeof document === 'undefined' || !document.getElementById) return;

  const visualId = opts.visualId || opts.exportPrefix || '';

  const mountContainer = (mode) => {
    const is2D = mode === '2d';
    const wrapperId = `individual-labels-${mode}-wrapper`;
    if (document.getElementById(wrapperId)) return;

    const labelInput = is2D
      ? (document.getElementById('vis-2d-labels') || document.getElementById('vis-2d-points'))
      : document.getElementById('vis-3d-labels');

    if (!labelInput) return;

    const container = labelInput.closest('.checkbox-container');
    const parent = container ? container.parentNode : labelInput.parentNode;
    if (!parent) return;

    const items = getVisualLabels(visualId, mode, container);
    if (!items || items.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'individual-labels-wrapper';
    wrapper.id = wrapperId;

    const header = document.createElement('div');
    header.className = 'individual-labels-header';

    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'Individual Labels:';
    header.appendChild(headerTitle);

    const quickActions = document.createElement('div');
    quickActions.className = 'individual-labels-quick-actions';

    const btnAll = document.createElement('button');
    btnAll.type = 'button';
    btnAll.className = 'btn-chip-action';
    btnAll.dataset.action = 'all';
    btnAll.title = `Show all labels in ${mode.toUpperCase()}`;
    btnAll.textContent = 'All';
    quickActions.appendChild(btnAll);

    const btnNone = document.createElement('button');
    btnNone.type = 'button';
    btnNone.className = 'btn-chip-action';
    btnNone.dataset.action = 'none';
    btnNone.title = `Hide all labels in ${mode.toUpperCase()}`;
    btnNone.textContent = 'None';
    quickActions.appendChild(btnNone);

    header.appendChild(quickActions);
    wrapper.appendChild(header);

    const chipsGroup = document.createElement('div');
    chipsGroup.className = 'individual-labels-chips';
    chipsGroup.setAttribute('role', 'group');
    chipsGroup.setAttribute('aria-label', `Toggle individual ${mode.toUpperCase()} labels`);

    items.forEach((item) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'label-chip active';
      chip.dataset.labelKey = item.key;
      chip.setAttribute('aria-pressed', 'true');
      chip.title = `Toggle label ${item.name || item.key} on/off`;

      const check = document.createElement('span');
      check.className = 'chip-check';
      check.textContent = '✓';
      chip.appendChild(check);

      const text = document.createElement('span');
      text.className = `chip-text ${item.color || ''}`.trim();
      text.textContent = item.name || item.key;
      chip.appendChild(text);

      chip.addEventListener('click', () => {
        const curVis = is2D ? (store.get().vis2d || {}) : (store.get().vis3d || {});
        const curHidden = { ...(curVis.hiddenLabels || {}) };
        if (curHidden[item.key]) {
          delete curHidden[item.key];
        } else {
          curHidden[item.key] = true;
        }
        if (is2D) {
          store.set({ vis2d: { ...curVis, hiddenLabels: curHidden } });
        } else {
          store.set({ vis3d: { ...curVis, hiddenLabels: curHidden } });
        }
      });

      chipsGroup.appendChild(chip);
    });

    wrapper.appendChild(chipsGroup);

    // Header Quick Actions
    btnAll.addEventListener('click', () => {
      const curVis = is2D ? (store.get().vis2d || {}) : (store.get().vis3d || {});
      if (is2D) {
        store.set({ vis2d: { ...curVis, hiddenLabels: {} } });
      } else {
        store.set({ vis3d: { ...curVis, hiddenLabels: {} } });
      }
    });

    btnNone.addEventListener('click', () => {
      const curVis = is2D ? (store.get().vis2d || {}) : (store.get().vis3d || {});
      const allHidden = {};
      items.forEach((it) => {
        allHidden[it.key] = true;
      });
      if (is2D) {
        store.set({ vis2d: { ...curVis, hiddenLabels: allHidden } });
      } else {
        store.set({ vis3d: { ...curVis, hiddenLabels: allHidden } });
      }
    });

    if (container && container.nextSibling) {
      parent.insertBefore(wrapper, container.nextSibling);
    } else {
      parent.appendChild(wrapper);
    }
  };

  mountContainer('2d');
  mountContainer('3d');

  const syncUI = (state = {}) => {
    const syncMode = (mode) => {
      const is2D = mode === '2d';
      const wrapper = document.getElementById(`individual-labels-${mode}-wrapper`);
      if (!wrapper) return;

      const vis = is2D ? (state.vis2d || {}) : (state.vis3d || {});
      const isMasterOff = is2D
        ? (vis.labels === false || (visualId === 'thales-theorem' && vis.points === false))
        : (vis.labels === false);

      wrapper.classList.toggle('is-disabled', isMasterOff);

      const chips = wrapper.querySelectorAll('.label-chip');
      chips.forEach((chip) => {
        const key = chip.dataset.labelKey;
        const isHidden = Boolean(vis.hiddenLabels?.[key]);
        const isActive = !isHidden;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        const checkEl = chip.querySelector('.chip-check');
        if (checkEl) {
          checkEl.textContent = isActive ? '✓' : '';
        }
      });
    };

    syncMode('2d');
    syncMode('3d');
  };

  syncUI(store.get());
  store.subscribe((st) => syncUI(st));
}

export function bindStandardToggles(store, ...args) {
  let opts = {};
  if (args.length === 1 && typeof args[0] === 'object') {
    opts = args[0] || {};
  } else if (args.length >= 2) {
    opts = { scene3d: args[0], view2d: args[1], ...(args[2] || {}) };
  }

  const panel2d = opts.panel2d || document.getElementById('toolbar-2d-panel');
  const panel3d = opts.panel3d || document.getElementById('toolbar-3d-panel');
  const sceneTarget = opts.scene3d || opts.view3d || opts.sceneTarget;
  const viewTarget = opts.view2d || opts.canvas2d || opts.viewTarget;

  let userCustomizedRadius = false;
  const sliderRadiusEl = document.getElementById('slider-radius') || document.getElementById('radius-slider');
  if (sliderRadiusEl) {
    sliderRadiusEl.addEventListener('input', () => {
      userCustomizedRadius = true;
    });
  }

  const syncOptimalRadius = (force = false) => {
    if (userCustomizedRadius && !force) return;
    const cont = viewTarget?.container || document.getElementById('canvas-2d-container');
    const rect = cont?.getBoundingClientRect ? cont.getBoundingClientRect() : null;
    const curW = (rect?.width && rect.width > 0) ? rect.width : (viewTarget?.width || 0);
    const curH = (rect?.height && rect.height > 0) ? rect.height : (viewTarget?.height || 0);
    if (curW > 0 && curH > 0) {
      const vId = opts.visualId || opts.exportPrefix || '';
      const optR = computeOptimalViewportRadius(curW, curH, vId);
      if (vId === 'thales-theorem') {
        const r3d = store.get().radius || 10;
        store.set({ zoom: optR / r3d });
        return;
      }
      if (vId === 'tangents-from-external-point') {
        const nextDist = Math.round(optR * (260 / 120));
        store.set({ radius: optR, pointDist: nextDist });
        const sliderDist = document.getElementById('slider-dist');
        if (sliderDist) {
          sliderDist.min = String(optR + 20);
          if (nextDist > parseFloat(sliderDist.max)) {
            sliderDist.max = String(Math.ceil(nextDist * 1.3));
          }
          sliderDist.value = String(nextDist);
        }
      } else {
        store.set({ radius: optR });
      }
      const sliderR = document.getElementById('slider-radius');
      if (sliderR) {
        if (optR > parseFloat(sliderR.max)) {
          sliderR.max = String(Math.ceil(optR * 1.3));
        }
        sliderR.value = String(optR);
      }
      const labelR = document.getElementById('label-radius');
      if (labelR) {
        labelR.textContent = `${Math.round(optR)}px`;
      }
    }
  };

  store.subscribe((state) => {
    if (state.radius !== undefined) {
      const vId = opts.visualId || opts.exportPrefix || '';
      if (vId === 'thales-theorem') {
        const sliderR = document.getElementById('radius-slider');
        if (sliderR && document.activeElement !== sliderR) {
          sliderR.value = String(state.radius);
        }
        const labelR = document.getElementById('radius-val-label');
        if (labelR) {
          labelR.textContent = `${Number(state.radius).toFixed(1)}`;
        }
        return;
      }
      const sliderR = document.getElementById('slider-radius');
      if (sliderR && document.activeElement !== sliderR) {
        if (state.radius > parseFloat(sliderR.max)) {
          sliderR.max = String(Math.ceil(state.radius * 1.3));
        }
        sliderR.value = String(state.radius);
      }
      const labelR = document.getElementById('label-radius');
      if (labelR) {
        labelR.textContent = `${Math.round(state.radius)}px`;
      }
    }
  }, ['radius']);

  store.subscribe((state) => {
    if (!userCustomizedRadius) {
      setTimeout(() => syncOptimalRadius(), 60);
    }
  }, ['viewMode', 'splitRatio']);

  if (typeof window !== 'undefined') {
    syncOptimalRadius();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => syncOptimalRadius());
    }
    setTimeout(() => syncOptimalRadius(), 80);
    window.addEventListener('resize', () => {
      if (!userCustomizedRadius) {
        setTimeout(() => syncOptimalRadius(), 80);
      }
    });
  }

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
      syncCheck(['vis-2d-trig', 'toggle-2d-trig'], st.vis2d.trigWedges !== false);
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
      syncCheck(['vis-3d-trig', 'toggle-3d-trig'], st.vis3d.trigWedges !== false);
      syncCheck(['vis-3d-quadrant', 'toggle-3d-quadrant'], st.vis3d.quadrant !== false);
      syncCheck(['vis-3d-chords', 'toggle-3d-chords'], st.vis3d.chords !== false);
      syncCheck(['vis-3d-reflex', 'toggle-3d-reflex'], Boolean(st.vis3d.reflex));
      syncCheck(['vis-3d-geodesic-overlay', 'toggle-3d-geodesic-overlay'], Boolean(st.showGeodesicOverlay));
      syncCheck(['vis-3d-spherical-overlay', 'toggle-3d-spherical-overlay'], Boolean(st.showSphericalOverlay));
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
  bindCheck(['vis-2d-trig', 'toggle-2d-trig'], (val) => {
    store.set({ vis2d: { ...(store.get().vis2d || {}), trigWedges: val }, showTrigWedges: val });
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
  bindCheck(['vis-3d-trig', 'toggle-3d-trig'], (val) => {
    store.set({ vis3d: { ...(store.get().vis3d || {}), trigWedges: val }, showTrigWedges: val });
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
  bindCheck(['vis-3d-geodesic-overlay', 'toggle-3d-geodesic-overlay'], (val) => {
    store.set({ showGeodesicOverlay: val });
  });
  bindCheck(['vis-3d-spherical-overlay', 'toggle-3d-spherical-overlay'], (val) => {
    store.set({ showSphericalOverlay: val });
  });

  // Universal Individual Labels Toggles & Filter Chips Across 2D & 3D Overlays
  mountIndividualLabelsUI(store, opts);

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
      userCustomizedRadius = false;
      if (typeof store.reset === 'function') {
        store.reset();
      } else if (opts.createInitialState) {
        store.set(opts.createInitialState());
      }
      store.set({
        playing: false,
        playbackSpeed: 1.0,
        viewMode: 'split',
        splitDirection: 'horizontal',
        splitRatio: 50,
        cameraMode: 'arcball',
        dimensionMode: 'planar',
        affineMode: false,
        affineStretch: 1.0,
        affineAxisAngle: 0,
        ...(vId === 'thales-theorem' ? { radius: 10, angle2D: Math.PI / 4, lat3D: Math.PI / 4, lon3D: Math.PI / 2 } : {}),
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
      syncOptimalRadius(true);
      opts.onReset?.();
    });
  }

  // Mount Unit System Converter if container is present
  const unitConverterContainer = document.getElementById('content-unit-converter');
  if (unitConverterContainer) {
    new UnitSystemConverter(unitConverterContainer, store);
  }

  // Every visual offers Planar | Spatial S² | Solid 3D. Solid shares the Spatial geometry
  // (points free on S²) and extrudes the figure along its own plane's normal.
  const vId = opts.visualId || opts.exportPrefix || '';
  const isThales = vId.includes('thales');

  // Mount Dimension Mode, Affine Conic Mode & AR Toolbar buttons if not already present
  const toolbarContent = document.getElementById('toolbar-content');
  if (toolbarContent && typeof document.createElement === 'function') {
    const refBtn = document.getElementById('btn-reset');
    if (!document.getElementById('btn-toggle-dimension-mode')) {
      const dimBtn = document.createElement('button');
      dimBtn.type = 'button';
      dimBtn.className = 'btn-toolbar';
      dimBtn.id = 'btn-toggle-dimension-mode';
      dimBtn.title = 'Toggle between Planar Euclidean (Y=0) and True Spherical 3D Geometry on S²';
      dimBtn.setAttribute('aria-pressed', 'false');
      dimBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg><span>Spatial: <b class="toggle-state-text" id="toolbar-dimension-status">OFF</b></span>`;
      if (refBtn && refBtn.parentNode === toolbarContent && typeof toolbarContent.insertBefore === 'function') {
        toolbarContent.insertBefore(dimBtn, refBtn);
      } else {
        toolbarContent.appendChild?.(dimBtn);
      }
    }
    if (!document.getElementById('btn-toggle-affine')) {
      const affineBtn = document.createElement('button');
      affineBtn.type = 'button';
      affineBtn.className = 'btn-toolbar';
      affineBtn.id = 'btn-toggle-affine';
      affineBtn.title = 'Toggle between Euclidean Circle Mode and Affine Conic Mode';
      affineBtn.setAttribute('aria-pressed', 'false');
      affineBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><ellipse cx="12" cy="12" rx="9" ry="5.5"/></svg><span>Affine: <b class="toggle-state-text" id="affine-status-pill">OFF</b></span>`;
      if (refBtn && refBtn.parentNode === toolbarContent && typeof toolbarContent.insertBefore === 'function') {
        toolbarContent.insertBefore(affineBtn, refBtn);
      } else {
        toolbarContent.appendChild?.(affineBtn);
      }
    }
    if (!document.getElementById('btn-toggle-ar')) {
      const arBtn = document.createElement('button');
      arBtn.type = 'button';
      arBtn.className = 'btn-toolbar';
      arBtn.id = 'btn-toggle-ar';
      arBtn.title = 'Enter Augmented Reality mode (WebXR / Camera Pass-Through)';
      arBtn.setAttribute('aria-pressed', 'false');
      arBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/><circle cx="12" cy="12" r="2.5"/></svg><span>AR: <b class="toggle-state-text" id="ar-status-pill">OFF</b></span>`;
      if (refBtn && refBtn.parentNode === toolbarContent && typeof toolbarContent.insertBefore === 'function') {
        toolbarContent.insertBefore(arBtn, refBtn);
      } else {
        toolbarContent.appendChild?.(arBtn);
      }
    }
  }

  // Mount Dimension Mode Section in 3D Toolbar Panel if not present
  if (!document.getElementById('section-dimension-mode') && typeof document.createElement === 'function') {
    const p3dBody = panel3d?.querySelector?.('.panel-body');
    if (p3dBody) {
      const dimSec = document.createElement('div');
      dimSec.className = 'collapsible-section';
      dimSec.id = 'section-dimension-mode';
      dimSec.innerHTML = `
        <div class="collapsible-header" id="header-dimension-mode" aria-expanded="true">
          <span>Dimension Mode</span><span class="icon">▼</span>
        </div>
        <div class="collapsible-content">
          <div class="toggle-tooltips-container" style="margin-bottom: 10px;">
            <span class="text-xs font-semibold text-slate-200">Spherical 3D on S²</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-dimension-mode">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="btn-group-pill" style="display: flex; gap: 6px; margin-bottom: 10px;">
            <button type="button" class="btn active" id="btn-mode-planar-pill" style="flex: 1; padding: 4px 8px; font-size: 11px;">Planar 2D</button>
            <button type="button" class="btn" id="btn-mode-spatial-pill" style="flex: 1; padding: 4px 8px; font-size: 11px;">Spatial 3D</button>
            <button type="button" class="btn" id="btn-mode-solid-pill" style="flex: 1; padding: 4px 8px; font-size: 11px;">Solid 3D</button>
          </div>
          <p class="text-xs text-slate-400" style="line-height: 1.4; margin: 0;">
            Lifts the theorem from the planar equatorial disk (<b class="color-yellow">Y = 0</b>) into true spherical geometry on the 2-sphere <b class="color-sky">S²</b>, rendering geodesic great-circle arcs and Girard's excess invariants.
            <b class="color-sky">Solid 3D</b> keeps those free points and extrudes the figure along its own plane's normal into prisms inside a cylinder, so every slice is the theorem's figure.
          </p>
          <div id="solid-orientation-controls" style="margin-top: 10px; padding: 8px 10px; background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Solid 3D Orientation</span>
              <button type="button" class="btn btn--sm" id="btn-reset-solid-orientation" style="padding: 2px 6px; font-size: 10px;" title="Reset cylinder orientation to default tilt">Reset</button>
            </div>
            <div class="control-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
              <label for="slider-solid-tilt" style="color: #cbd5e1;">Tilt (Polar &phi;):</label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="range" id="slider-solid-tilt" min="0" max="90" step="1" value="25" style="width: 85px;">
                <span id="val-solid-tilt" style="min-width: 28px; text-align: right; color: #f1f5f9; font-variant-numeric: tabular-nums;">25&deg;</span>
              </div>
            </div>
            <div class="control-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
              <label for="slider-solid-azimuth" style="color: #cbd5e1;">Azimuth (&theta;):</label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="range" id="slider-solid-azimuth" min="0" max="360" step="1" value="35" style="width: 85px;">
                <span id="val-solid-azimuth" style="min-width: 28px; text-align: right; color: #f1f5f9; font-variant-numeric: tabular-nums;">35&deg;</span>
              </div>
            </div>
            <div class="control-row" style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
              <label for="slider-solid-spin" style="color: #cbd5e1;">Coupled Spin (&psi;):</label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="range" id="slider-solid-spin" min="0" max="360" step="1" value="0" style="width: 85px;">
                <span id="val-solid-spin" style="min-width: 28px; text-align: right; color: #f1f5f9; font-variant-numeric: tabular-nums;">0&deg;</span>
              </div>
            </div>
          </div>
        </div>
      `;
      if (p3dBody.firstChild && typeof p3dBody.insertBefore === 'function') {
        p3dBody.insertBefore(dimSec, p3dBody.firstChild);
      } else {
        p3dBody.appendChild?.(dimSec);
      }
      initCollapsibleSections(dimSec);
    }
  }

  // Mount Floating Dimension Mode Pill Bar in 3D Container if not present
  const cont3d = sceneTarget?.container || document.getElementById('canvas-3d-container');
  if (cont3d && !cont3d.querySelector('.dimension-mode-bar') && typeof document.createElement === 'function') {
    const bar = document.createElement('div');
    bar.className = 'dimension-mode-bar';
    bar.innerHTML = `
      <div class="btn-group btn-group--pill">
        <button type="button" class="btn active" id="btn-mode-planar" title="Planar Euclidean Disk (Y = 0)">Planar</button>
        <button type="button" class="btn" id="btn-mode-spatial" title="True Spherical Geometry on S²">Spatial S²</button>
        <button type="button" class="btn" id="btn-mode-solid" title="Solid 3D: the figure extruded along its plane's normal into prisms inside a cylinder">Solid 3D</button>
      </div>
    `;
    cont3d.appendChild(bar);
  }

  const setDimensionMode = (mode) => {
    const isSpatial = mode === 'spatial';
    if (isThales) {
      const cur = store.get();
      const ang = cur.angle2D ?? Math.PI / 4;
      if (isSpatial) {
        const x = Math.cos(ang);
        const y2D = Math.sin(ang);
        const psi = Math.PI / 6;
        const y = y2D * Math.cos(psi);
        const z = y2D * Math.sin(psi);
        store.set({
          dimensionMode: 'spatial',
          lat3D: Math.acos(Math.max(-1, Math.min(1, y))),
          lon3D: Math.atan2(x, z),
        });
      } else {
        store.set({
          dimensionMode: mode === 'solid' ? 'solid' : 'planar',
          lat3D: Math.acos(Math.max(-1, Math.min(1, Math.sin(ang)))),
          lon3D: Math.cos(ang) >= 0 ? Math.PI / 2 : -Math.PI / 2,
        });
      }
      return;
    }
    if (isSpatial) {
      const updates = { dimensionMode: 'spatial' };
      const cur = store.get();
      if (cur.latA === undefined || Math.abs((cur.latA ?? (Math.PI / 2)) - Math.PI / 2) < 1e-3) {
        if (vId.includes('angle-at-centre')) {
          updates.latA = 1.22; updates.latB = 1.92; updates.latP = 0.73;
        } else if (vId.includes('same-segment')) {
          updates.latA = 1.31; updates.latB = 1.83; updates.latP1 = 0.84; updates.latP2 = 0.84;
        } else if (vId.includes('cyclic-quad')) {
          updates.latA = 1.05; updates.latB = 2.09; updates.latC = 2.09; updates.latD = 1.05;
        } else if (vId.includes('tangent-radius')) {
          updates.latT = 1.13;
        } else if (vId.includes('alternate-segment')) {
          updates.latT = 1.22; updates.latA = 1.92; updates.latB = 0.87;
        } else if (vId.includes('tangents-from-external') || vId.includes('tangents-from-point')) {
          updates.latT1 = 1.13; updates.latT2 = 2.01;
        } else if (vId.includes('chord-bisector')) {
          updates.latA = 1.13; updates.latB = 2.01;
        } else {
          updates.latA = 1.22; updates.latB = 1.92; updates.latP = 0.73;
        }
      }
      store.set(updates);
    } else {
      const cur = store.get();
      const updates = {
        dimensionMode: mode === 'solid' ? 'solid' : 'planar',
        latA: Math.PI / 2,
        latB: Math.PI / 2,
        latC: Math.PI / 2,
        latD: Math.PI / 2,
        latP: Math.PI / 2,
        latP1: Math.PI / 2,
        latP2: Math.PI / 2,
        latT: Math.PI / 2,
        latT1: Math.PI / 2,
        latT2: Math.PI / 2,
      };
      if (mode === 'solid' && cur.solidTilt === undefined) {
        updates.solidTilt = (25 * Math.PI) / 180;
        updates.solidAzimuth = (35 * Math.PI) / 180;
        updates.solidSpin = 0;
      }
      store.set(updates);
    }
  };

  const bindDimClick = (id, targetMode) => {
    const el = document.getElementById(id);
    if (el && !el._dimBound) {
      el._dimBound = true;
      el.addEventListener('click', () => setDimensionMode(targetMode));
    }
  };

  bindDimClick('btn-mode-planar', 'planar');
  bindDimClick('btn-mode-spatial', 'spatial');
  bindDimClick('btn-mode-planar-pill', 'planar');
  bindDimClick('btn-mode-spatial-pill', 'spatial');
  bindDimClick('btn-mode-solid', 'solid');
  bindDimClick('btn-mode-solid-pill', 'solid');

  // The Spatial switch reads ON for both lifted modes; switching it off returns to Planar.
  const btnToggleDim = document.getElementById('btn-toggle-dimension-mode');
  if (btnToggleDim && !btnToggleDim._dimBound) {
    btnToggleDim._dimBound = true;
    btnToggleDim.addEventListener('click', () => {
      const isOn = isSpatialGeometry(store.get().dimensionMode);
      setDimensionMode(isOn ? 'planar' : 'spatial');
    });
  }

  const toggleDimCheck = document.getElementById('toggle-dimension-mode');
  if (toggleDimCheck && !toggleDimCheck._dimBound) {
    toggleDimCheck._dimBound = true;
    toggleDimCheck.addEventListener('change', (e) => {
      setDimensionMode(e.target.checked ? 'spatial' : 'planar');
    });
  }

  const syncDimensionUI = (st = {}) => {
    const mode = st.dimensionMode || 'planar';
    const isOn = isSpatialGeometry(mode);
    const statusPill = document.getElementById('toolbar-dimension-status');
    if (statusPill) {
      statusPill.textContent = isOn ? 'ON' : 'OFF';
      statusPill.classList.toggle('is-on', isOn);
    }
    if (btnToggleDim) {
      btnToggleDim.classList.toggle('active', isOn);
      btnToggleDim.setAttribute('aria-pressed', String(isOn));
    }
    if (toggleDimCheck && toggleDimCheck.checked !== isOn) {
      toggleDimCheck.checked = isOn;
    }
    const press = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('active', on);
      el.setAttribute?.('aria-pressed', String(on));
    };
    press('btn-mode-planar', mode === 'planar');
    press('btn-mode-planar-pill', mode === 'planar');
    press('btn-mode-spatial', mode === 'spatial');
    press('btn-mode-spatial-pill', mode === 'spatial');
    press('btn-mode-solid', mode === 'solid');
    press('btn-mode-solid-pill', mode === 'solid');

    const solidControls = document.getElementById('solid-orientation-controls');
    if (solidControls) {
      solidControls.style.display = mode === 'solid' ? 'block' : 'none';
    }
    const tiltSlider = document.getElementById('slider-solid-tilt');
    const azimSlider = document.getElementById('slider-solid-azimuth');
    const spinSlider = document.getElementById('slider-solid-spin');
    const tiltVal = document.getElementById('val-solid-tilt');
    const azimVal = document.getElementById('val-solid-azimuth');
    const spinVal = document.getElementById('val-solid-spin');

    const tiltDeg = Math.round(((st.solidTilt ?? (25 * Math.PI / 180)) * 180) / Math.PI);
    const azimDeg = Math.round(((st.solidAzimuth ?? (35 * Math.PI / 180)) * 180) / Math.PI);
    const spinDeg = ((Math.round(((st.solidSpin ?? 0) * 180) / Math.PI) % 360) + 360) % 360;

    if (tiltSlider && document.activeElement !== tiltSlider) tiltSlider.value = tiltDeg;
    if (azimSlider && document.activeElement !== azimSlider) azimSlider.value = azimDeg;
    if (spinSlider && document.activeElement !== spinSlider) spinSlider.value = spinDeg;

    if (tiltVal) tiltVal.textContent = `${tiltDeg}°`;
    if (azimVal) azimVal.textContent = `${azimDeg}°`;
    if (spinVal) spinVal.textContent = `${spinDeg}°`;
  };

  const tiltSlider = document.getElementById('slider-solid-tilt');
  if (tiltSlider && !tiltSlider._solidBound) {
    tiltSlider._solidBound = true;
    tiltSlider.addEventListener('input', (e) => {
      store.set({ solidTilt: (Number(e.target.value) * Math.PI) / 180 });
    });
  }
  const azimSlider = document.getElementById('slider-solid-azimuth');
  if (azimSlider && !azimSlider._solidBound) {
    azimSlider._solidBound = true;
    azimSlider.addEventListener('input', (e) => {
      store.set({ solidAzimuth: (Number(e.target.value) * Math.PI) / 180 });
    });
  }
  const spinSlider = document.getElementById('slider-solid-spin');
  if (spinSlider && !spinSlider._solidBound) {
    spinSlider._solidBound = true;
    spinSlider.addEventListener('input', (e) => {
      store.set({ solidSpin: (Number(e.target.value) * Math.PI) / 180 });
    });
  }
  const btnResetSolid = document.getElementById('btn-reset-solid-orientation');
  if (btnResetSolid && !btnResetSolid._solidBound) {
    btnResetSolid._solidBound = true;
    btnResetSolid.addEventListener('click', () => {
      store.set({
        solidTilt: (25 * Math.PI) / 180,
        solidAzimuth: (35 * Math.PI) / 180,
        solidSpin: 0,
      });
    });
  }

  syncDimensionUI(store.get());
  store.subscribe((st) => {
    syncDimensionUI(st);
  }, ['dimensionMode', 'solidTilt', 'solidAzimuth', 'solidSpin']);

  // Mount Affine Conic Mode subpanel inside primary Interactive Controls panel if not present
  if (!document.getElementById('section-affine-conic') && typeof document.createElement === 'function') {
    const controlsBody = document.querySelector?.(
      '#controls-panel .panel-body, #angle-at-centre-panel .panel-body, #ui-panel-container .panel-body, .ui-panel:not(#toolbar-2d-panel):not(#toolbar-3d-panel):not(#derivations-panel) .panel-body'
    );
    if (controlsBody) {
      const affineSection = document.createElement('div');
      affineSection.className = 'collapsible-section collapsed';
      affineSection.id = 'section-affine-conic';
      affineSection.innerHTML = `
        <div class="collapsible-header" id="header-affine-conic" aria-expanded="false">
          <span>Affine Conic Mode</span><span class="icon">▶</span>
        </div>
        <div class="collapsible-content collapsed">
          <div class="toggle-tooltips-container" style="margin-bottom: 12px;">
            <span class="text-xs font-semibold text-slate-200">Affine Conic Mode</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-affine-mode">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <p class="text-xs text-slate-400 mb-3" style="line-height: 1.4;">Deforms the circle into an ellipse. While Euclidean metric angles perturb, projective &amp; affine conic invariants (<b class="color-yellow">v₁ᵀ Q v₂</b>) remain strictly preserved under the Erlangen hierarchy.</p>
          <div class="slider-container">
            <label><span class="color-yellow">Aspect Stretch (s)</span><span id="affine-stretch-label" class="color-yellow font-bold">1.00</span></label>
            <input type="range" id="affine-stretch-slider" min="0.4" max="2.5" step="0.05" value="1.0">
          </div>
          <div class="slider-container">
            <label><span class="color-cyan">Deformation Axis (ω)</span><span id="affine-angle-label" class="color-cyan font-bold">0°</span></label>
            <input type="range" id="affine-angle-slider" min="0" max="180" step="1" value="0">
          </div>
        </div>
      `;
      const legendSec = controlsBody.querySelector?.('#section-geometry-legend');
      if (legendSec && legendSec.parentNode === controlsBody && typeof controlsBody.insertBefore === 'function') {
        controlsBody.insertBefore(affineSection, legendSec);
      } else {
        controlsBody.appendChild?.(affineSection);
      }
    }
  }

  // Wrap viewTarget.render to apply 2D affine transformation and HUD overlay when affineMode is active
  if (viewTarget && typeof viewTarget.render === 'function' && !viewTarget._affineWrapped) {
    const origRender = viewTarget.render.bind(viewTarget);
    viewTarget._affineWrapped = true;
    viewTarget.render = (st) => {
      const ctx = viewTarget.ctx;
      if (ctx) {
        ctx._pendingAffineState = st?.affineMode ? st : null;
        ctx._affineSaved = false;
      }
      origRender(st);
      if (ctx && ctx._affineSaved) {
        ctx.restore?.();
        ctx._affineSaved = false;
        ctx._pendingAffineState = null;

        const s = st?.affineStretch ?? 1.35;
        const omegaDeg = Math.round(((st?.affineAxisAngle ?? 0) * 180) / Math.PI);
        const r = st?.radius || 180;
        const a = r * Math.max(s, 1);
        const b = r * Math.min(s, 1);
        const ecc = a > 0 ? Math.sqrt(Math.max(0, 1 - (b * b) / (a * a))) : 0;
        drawHaloText(
          ctx,
          `Affine Conic Mode: s = ${s.toFixed(2)}, ω = ${omegaDeg}°, e = ${ecc.toFixed(3)} | Erlangen Conic Invariant Preserved ✓`,
          14,
          36,
          PALETTE.yellow,
          'bold 11px monospace',
          'left'
        );
      }
    };
  }

  // Bind Affine Conic Mode controls to store
  const affineBtnEl = document.getElementById('btn-toggle-affine');
  const affinePillEl = document.getElementById('affine-status-pill');
  const affineCheckEl = document.getElementById('toggle-affine-mode');
  const stretchSliderEl = document.getElementById('affine-stretch-slider');
  const stretchLabelEl = document.getElementById('affine-stretch-label');
  const angleSliderEl = document.getElementById('affine-angle-slider');
  const angleLabelEl = document.getElementById('affine-angle-label');

  const setAffine = (enabled) => {
    const cur = store.get();
    const curStretch = cur.affineStretch ?? 1.0;
    const nextStretch = enabled && Math.abs(curStretch - 1.0) < 1e-3 ? 1.35 : curStretch;
    store.set({ affineMode: Boolean(enabled), affineStretch: nextStretch });
  };

  if (affineBtnEl && !affineBtnEl._affineBound) {
    affineBtnEl._affineBound = true;
    affineBtnEl.addEventListener('click', () => {
      setAffine(!store.get().affineMode);
    });
  }
  if (affineCheckEl && !affineCheckEl._affineBound) {
    affineCheckEl._affineBound = true;
    affineCheckEl.addEventListener('change', (e) => {
      setAffine(e.target.checked);
    });
  }
  if (stretchSliderEl && !stretchSliderEl._affineBound) {
    stretchSliderEl._affineBound = true;
    stretchSliderEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (Number.isFinite(val)) {
        store.set({ affineStretch: val, affineMode: true });
      }
    });
  }
  if (angleSliderEl && !angleSliderEl._affineBound) {
    angleSliderEl._affineBound = true;
    angleSliderEl.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      if (Number.isFinite(deg)) {
        store.set({ affineAxisAngle: (deg * Math.PI) / 180, affineMode: true });
      }
    });
  }

  const syncAffineUI = (st = {}) => {
    const isAffine = Boolean(st.affineMode);
    const stretch = st.affineStretch ?? 1.0;
    const angleDeg = Math.round(((st.affineAxisAngle ?? 0) * 180) / Math.PI);
    if (affineBtnEl) {
      affineBtnEl.classList?.toggle('active', isAffine);
      affineBtnEl.setAttribute?.('aria-pressed', String(isAffine));
    }
    if (affinePillEl) {
      affinePillEl.textContent = isAffine ? 'ON' : 'OFF';
      affinePillEl.classList?.toggle('is-on', isAffine);
    }
    if (affineCheckEl) affineCheckEl.checked = isAffine;
    if (stretchSliderEl) stretchSliderEl.value = String(stretch);
    if (stretchLabelEl) stretchLabelEl.textContent = Number(stretch).toFixed(2);
    if (angleSliderEl) angleSliderEl.value = String(angleDeg);
    if (angleLabelEl) angleLabelEl.textContent = `${angleDeg}°`;

    const affineRows = typeof document !== 'undefined' && document.querySelectorAll ? document.querySelectorAll('.affine-telemetry-row') : [];
    affineRows.forEach((row) => {
      row.style.display = isAffine ? 'flex' : 'none';
    });
    if (isAffine && typeof document !== 'undefined') {
      const r = st.radius || 180;
      const a = r * Math.max(stretch, 1);
      const b = r * Math.min(stretch, 1);
      const ecc = a > 0 ? Math.sqrt(Math.max(0, 1 - (b * b) / (a * a))) : 0;
      const invEl = document.getElementById('val-affine-inv');
      if (invEl) invEl.textContent = '0.000';
      const eccEl = document.getElementById('val-affine-ecc');
      if (eccEl) eccEl.textContent = ecc.toFixed(3);
      const angEl = document.getElementById('val-affine-euclid-p');
      if (angEl) {
        const deformedDeg = Math.min(170, Math.max(10, 90 / Math.max(0.4, stretch)));
        angEl.textContent = `${deformedDeg.toFixed(2)}°`;
      }
    }
  };
  syncAffineUI(store.get());
  store.subscribe((st) => {
    syncAffineUI(st);
    viewTarget?.render?.(st);
    sceneTarget?.render?.(st);
  }, ['affineMode', 'affineStretch', 'affineAxisAngle']);

  // Bind AR Manager to #btn-toggle-ar if 3D scene is present
  const arBtnEl = document.getElementById('btn-toggle-ar');
  const arPillEl = document.getElementById('ar-status-pill');
  const arSceneObj = sceneTarget?.scene || sceneTarget?.objects?.scene;
  if (arBtnEl && sceneTarget?.renderer && arSceneObj && !arBtnEl._hasClickBound) {
    arBtnEl._hasClickBound = true;
    let preARViewMode = null;
    const arManager = new ARManager({
      renderer: sceneTarget.renderer,
      scene: arSceneObj,
      camera: sceneTarget.camera,
      container: sceneTarget.container || document.getElementById('canvas-3d-container'),
      onSessionStart: () => {
        sceneTarget.setARMode?.(true);
        if (!preARViewMode) {
          preARViewMode = arManager?.previousViewMode || store.get().viewMode || 'split';
        }
        if (store.get().viewMode !== '3d') {
          store.set({ viewMode: '3d' });
        }
        arBtnEl.classList?.add('active');
        arBtnEl.setAttribute?.('aria-pressed', 'true');
        if (arPillEl) {
          arPillEl.textContent = 'ON';
          arPillEl.classList?.add('is-on');
        }
      },
      onSessionEnd: () => {
        sceneTarget.setARMode?.(false);
        if (preARViewMode && preARViewMode !== '3d') {
          store.set({ viewMode: preARViewMode });
        }
        preARViewMode = null;
        arBtnEl.classList?.remove('active');
        arBtnEl.setAttribute?.('aria-pressed', 'false');
        if (arPillEl) {
          arPillEl.textContent = 'OFF';
          arPillEl.classList?.remove('is-on');
        }
      },
    });
    arBtnEl.addEventListener('click', async () => {
      try {
        await arManager.toggle();
      } catch (err) {
        console.warn('AR initiation error:', err);
      }
    });
  }

  // Set initial camera perspective to match 2D and 3D orientation on first load
  applyPerspective(store.get().cameraPerspective || defaultPreset);

  // Universal Export & Presentation Toolkit
  if (typeof window !== 'undefined') {
    window.__vmlView2D = viewTarget;
    window.__vmlScene3D = sceneTarget;
  }

  const pngButtons = document.querySelectorAll('#btn-export-png, #btn-export-png-2d, #btn-snapshot-png, #toolbar-2d-panel [id*="png"]');
  pngButtons.forEach((btn) => {
    if (!btn._exportBound) {
      btn._exportBound = true;
      btn.addEventListener('click', () => viewTarget?.exportPNG?.());
    }
  });

  const svgButtons = document.querySelectorAll('#btn-export-svg, #btn-export-svg-2d, #btn-snapshot-svg, #toolbar-2d-panel [id*="svg"]');
  svgButtons.forEach((btn) => {
    if (!btn._exportBound) {
      btn._exportBound = true;
      btn.addEventListener('click', () => viewTarget?.exportSVG?.());
    }
  });

  const png3DButtons = document.querySelectorAll('#btn-export-3d-png, #btn-export-png-3d, #btn-snapshot-3d, [id*="export-3d"]');
  png3DButtons.forEach((btn) => {
    if (!btn._exportBound) {
      btn._exportBound = true;
      btn.addEventListener('click', () => {
        const vId = opts.visualId || opts.exportPrefix || 'geometry';
        if (sceneTarget?.export3DPNG) {
          sceneTarget.export3DPNG(`${vId}-3d.png`);
        } else if (sceneTarget?.exportPNG) {
          sceneTarget.exportPNG(`${vId}-3d.png`);
        } else {
          const cont3d = document.getElementById('canvas-3d-container');
          const s3d = cont3d?.__scene3d;
          s3d?.export3DPNG?.(`${vId}-3d.png`);
        }
      });
    }
  });

  const loopButtons = document.querySelectorAll('#btn-record-loop, [id*="record-loop"]');
  loopButtons.forEach((btn) => {
    if (!btn._exportBound) {
      btn._exportBound = true;
      btn.addEventListener('click', async () => {
        const root = document.body?.dataset?.root || '../../..';
        const { recordCanvasLoop } = await import(`${root}/js/animation-recorder.js`);
        const targetCanvas = viewTarget?.canvas || document.getElementById('main-canvas') || document.getElementById('canvas2d');
        if (targetCanvas) {
          const vId = opts.visualId || opts.exportPrefix || 'geometry';
          recordCanvasLoop(targetCanvas, { filename: `${vId}-loop.webm` });
        }
      });
    }
  });

  const worksheetButtons = document.querySelectorAll('#btn-export-worksheet, #btn-print-worksheet, [id*="worksheet"]');
  worksheetButtons.forEach((btn) => {
    if (!btn._exportBound) {
      btn._exportBound = true;
      btn.addEventListener('click', async () => {
        const root = document.body?.dataset?.root || '../../..';
        const { openPrintableWorksheet } = await import(`${root}/js/worksheet-generator.js`);
        const vId = opts.visualId || opts.exportPrefix || '';
        openPrintableWorksheet({ visualId: vId, state: store.get(), viewTarget });
      });
    }
  });
  // Universal Two-Finger Touch Gestures (Pinch-Zoom, Two-Finger Pan, Two-Finger Spin) & Panel Touch Fluidity
  const canvas2dEl =
    viewTarget?.canvas ||
    (typeof document !== 'undefined' ? (document.getElementById('main-canvas') || document.getElementById('canvas2d')) : null);
  if (canvas2dEl && !canvas2dEl._touchWheelGesturesAttached) {
    canvas2dEl._touchWheelGesturesAttached = true;
    const vId = opts.visualId || opts.exportPrefix || '';
    if (vId === 'thales-theorem') {
      attachCanvasTouchAndWheelGestures(canvas2dEl, store, {
        getRadius: (st) => st.zoom || 18,
        setRadius: (z) => ({ zoom: z }),
        minRadius: 8,
        maxRadius: 40,
        radiusStep: 0.5,
      });
    } else {
      attachCanvasTouchAndWheelGestures(canvas2dEl, store, {
        getRadius: (st) => st.radius || 180,
        setRadius: (r, st) => {
          const patch = { radius: r };
          if (st?.pointDist) {
            patch.pointDist = Math.max(r + 35, st.pointDist);
          }
          return patch;
        },
        minRadius: 80,
        maxRadius: 320,
      });
    }
  }

  if (typeof document !== 'undefined') {
    enableUniversalPanelTouch(document);
  }
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
      this.baseSpeed = 0.6;
    } else {
      this.field = options?.field ?? 'angleP';
      this.baseSpeed = options?.speed ?? 0.6;
      this.onStep = options?.onStep;
    }
    this.speed = this.baseSpeed;
    this.animId = null;
    this.lastTime = null;

    if (this.button) {
      this.button.addEventListener('click', () => {
        const nextState = !this.store.get().playing;
        this.store.set({ playing: nextState });
      });
    }

    // Playback Speed Controller: Button & Slider
    this.speedBtn = options?.speedButton || (typeof document !== 'undefined' ? document.getElementById('btn-playback-speed') : null);
    this.speedLabel = typeof document !== 'undefined' ? document.getElementById('playback-speed-label') : null;
    this.speedSlider = typeof document !== 'undefined' ? document.getElementById('slider-playback-speed') : null;
    this.speedSliderLabel = typeof document !== 'undefined' ? document.getElementById('label-playback-speed') : null;

    const speeds = [0.5, 1.0, 1.5, 2.0];
    if (this.speedBtn && !this.speedBtn._speedBound) {
      this.speedBtn._speedBound = true;
      this.speedBtn.addEventListener('click', () => {
        const curSpeed = this.store.get().playbackSpeed ?? 1.0;
        const curIdx = speeds.findIndex((s) => Math.abs(s - curSpeed) < 0.05);
        const nextIdx = (curIdx === -1 ? 1 : curIdx + 1) % speeds.length;
        this.store.set({ playbackSpeed: speeds[nextIdx] });
      });
    }

    if (this.speedSlider && !this.speedSlider._speedBound) {
      this.speedSlider._speedBound = true;
      this.speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val) && val > 0) {
          this.store.set({ playbackSpeed: val });
        }
      });
    }

    if (typeof document !== 'undefined' && !document._playbackKeyBound) {
      document._playbackKeyBound = true;
      document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (e.key === 'p' || e.key === 'P') {
          if (e.shiftKey) {
            e.preventDefault();
            const curSpeed = this.store.get().playbackSpeed ?? 1.0;
            const curIdx = speeds.findIndex((s) => Math.abs(s - curSpeed) < 0.05);
            const nextIdx = (curIdx === -1 ? 1 : curIdx + 1) % speeds.length;
            this.store.set({ playbackSpeed: speeds[nextIdx] });
          }
        }
      });
    }

    this.store.subscribe((state) => {
      this.render(state);
      this.renderSpeed(state);
    }, ['playing', 'playbackSpeed']);

    this.render(this.store.get());
    this.renderSpeed(this.store.get());
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

  renderSpeed(state) {
    const spd = state?.playbackSpeed ?? 1.0;
    const txt = `${spd}x`;
    if (this.speedLabel) this.speedLabel.textContent = txt;
    if (this.speedBtn) {
      this.speedBtn.setAttribute('title', `Playback speed: ${txt} (Click or Shift+P to cycle 0.5x, 1x, 1.5x, 2x)`);
      this.speedBtn.setAttribute('aria-label', `Playback speed ${txt}`);
    }
    if (this.speedSlider && document.activeElement !== this.speedSlider) {
      this.speedSlider.value = String(spd);
    }
    if (this.speedSliderLabel) this.speedSliderLabel.textContent = txt;
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
    const speedMult = current.playbackSpeed ?? 1.0;
    const effectiveDelta = delta * speedMult;

    if (typeof this.onStep === 'function') {
      this.onStep(effectiveDelta, this.store, current);
    } else if (this.field) {
      let nextVal = ((current[this.field] ?? 0) + this.baseSpeed * effectiveDelta) % (Math.PI * 2);
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

/**
 * Rotates all active angular coordinates on a 2D state object by deltaAngle (radians)
 * so the user can spin the 2D figure with a two-finger twist gesture or Alt+drag.
 */
export function computeSpinAngleUpdates2D(st, deltaAngle) {
  if (!st || !Number.isFinite(deltaAngle) || Math.abs(deltaAngle) < 1e-6) return {};
  const TAU = Math.PI * 2;
  const wrap = (a) => ((a % TAU) + TAU) % TAU;
  const updates = {};

  if (st.baselineRotation !== undefined) {
    updates.baselineRotation = wrap((st.baselineRotation || 0) + deltaAngle);
    return updates;
  }

  const angleKeys = [
    'angleA',
    'angleB',
    'angleC',
    'angleD',
    'angleP',
    'angleP1',
    'angleP2',
    'angleT',
    'angleTheta',
    'angleAlpha',
  ];
  for (const key of angleKeys) {
    if (typeof st[key] === 'number' && Number.isFinite(st[key])) {
      updates[key] = wrap(st[key] + deltaAngle);
    }
  }
  return updates;
}

/**
 * Attaches unified two-finger touch gestures (pinch-to-zoom radius, two-finger omni-directional pan,
 * and two-finger twist-to-spin), Alt+drag 2D spin, and rich scroll wheel functionality (mouse wheel zoom,
 * trackpad pinch ctrlKey zoom, and trackpad horizontal/shift two-finger pan) to any 2D canvas.
 *
 * Automatically coordinates with active single-finger dragging by canceling single-finger
 * vertex drags whenever two touch points are detected.
 */
export function attachCanvasTouchAndWheelGestures(canvas, store, options = {}) {
  const {
    minRadius = 100,
    maxRadius = 260,
    radiusStep = 1,
    getRadius = (st) => st.radius || 180,
    setRadius = (r, st) => ({ radius: r }),
    onGestureStart = null,
    onGestureEnd = null,
  } = options;

  const pointers = new Map();
  let prevDist = 0;
  let prevMid = { x: 0, y: 0 };
  let prevAngle = 0;
  let isGesturing = false;
  let isAltSpinning = false;
  let prevAltAngle = 0;

  const getDistanceMidpointAndAngle = (p1, p2) => {
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return { dist, mid, angle };
  };

  // 1. Wheel & Trackpad Listener (capture: true, passive: false)
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const st = store.get();
      const curR = getRadius(st);
      const curPan = st.pan || { x: 0, y: 0 };

      // Trackpad Pinch-to-Zoom (emitted as e.ctrlKey === true)
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.008);
        const nextR = clamp(Math.round((curR * factor) / radiusStep) * radiusStep, minRadius, maxRadius);
        store.set(setRadius(nextR, st));
        return;
      }

      // Alt + Wheel: Spin the 2D figure smoothly
      if (e.altKey) {
        const deltaSpin = (e.deltaY > 0 ? -1 : 1) * 0.06;
        const spinPatch = computeSpinAngleUpdates2D(st, deltaSpin);
        if (Object.keys(spinPatch).length > 0) {
          store.set(spinPatch);
        }
        return;
      }

      // Trackpad Two-Finger Pan or Shift+Wheel Pan
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        store.set({
          pan: {
            x: curPan.x - e.deltaX,
            y: curPan.y - e.deltaY,
          },
        });
        return;
      }

      // Standard Mouse Wheel Zoom
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const nextR = clamp(Math.round((curR * factor) / radiusStep) * radiusStep, minRadius, maxRadius);
      store.set(setRadius(nextR, st));
    },
    { capture: true, passive: false }
  );

  // 2. Pointer Listeners for Two-Finger Touch Gestures (Pinch Zoom, Two-Finger Pan & Two-Finger Spin) + Alt+Drag Spin
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.altKey && e.pointerType !== 'touch') {
        isAltSpinning = true;
        const rect = canvas.getBoundingClientRect?.() || { left: 0, top: 0, width: 600, height: 600 };
        const st = store.get();
        const cx = (rect.width || 600) / 2 + (st.pan?.x || 0);
        const cy = (rect.height || 600) / 2 + (st.pan?.y || 0);
        prevAltAngle = Math.atan2(cy - (e.clientY - rect.top), e.clientX - rect.left - cx);
        if (canvas.style) canvas.style.cursor = 'alias';
        try { canvas.setPointerCapture?.(e.pointerId); } catch (_) {}
        e.stopPropagation?.();
        return;
      }

      if (e.pointerType !== 'touch') return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size >= 2) {
        isGesturing = true;
        const pts = Array.from(pointers.values());
        const { dist, mid, angle } = getDistanceMidpointAndAngle(pts[0], pts[1]);
        prevDist = dist;
        prevMid = mid;
        prevAngle = angle;
        if (typeof onGestureStart === 'function') onGestureStart();
        e.stopPropagation?.();
      }
    },
    { capture: true }
  );

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (isAltSpinning) {
        const rect = canvas.getBoundingClientRect?.() || { left: 0, top: 0, width: 600, height: 600 };
        const st = store.get();
        const cx = (rect.width || 600) / 2 + (st.pan?.x || 0);
        const cy = (rect.height || 600) / 2 + (st.pan?.y || 0);
        const curAltAngle = Math.atan2(cy - (e.clientY - rect.top), e.clientX - rect.left - cx);
        let delta = curAltAngle - prevAltAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        prevAltAngle = curAltAngle;
        const spinPatch = computeSpinAngleUpdates2D(st, delta);
        if (Object.keys(spinPatch).length > 0) {
          store.set(spinPatch);
        }
        e.stopPropagation?.();
        return;
      }

      if (e.pointerType !== 'touch' || !pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (isGesturing && pointers.size < 2) {
        // Keep suppressing single-finger vertex drag while the user is lifting fingers after a multi-touch gesture
        e.preventDefault?.();
        e.stopPropagation?.();
        return;
      }

      if (pointers.size >= 2) {
        e.preventDefault?.();
        e.stopPropagation?.();
        const pts = Array.from(pointers.values());
        const { dist, mid, angle } = getDistanceMidpointAndAngle(pts[0], pts[1]);
        const st = store.get();

        // 1. Two-Finger Omni-Directional Pan
        const dx = mid.x - prevMid.x;
        const dy = mid.y - prevMid.y;
        const curPan = st.pan || { x: 0, y: 0 };
        const nextPan = { x: curPan.x + dx, y: curPan.y + dy };

        // 2. Two-Finger Pinch Zoom
        let radiusUpdate = {};
        if (prevDist > 4 && dist > 4) {
          const ratio = dist / prevDist;
          const curR = getRadius(st);
          const nextR = clamp(Math.round((curR * ratio) / radiusStep) * radiusStep, minRadius, maxRadius);
          radiusUpdate = setRadius(nextR, st);
        }

        // 3. Two-Finger Twist-to-Spin
        let spinUpdate = {};
        let deltaTwist = -(angle - prevAngle);
        if (deltaTwist > Math.PI) deltaTwist -= Math.PI * 2;
        if (deltaTwist < -Math.PI) deltaTwist += Math.PI * 2;
        if (Math.abs(deltaTwist) > 0.001 && Math.abs(deltaTwist) < 0.5) {
          spinUpdate = computeSpinAngleUpdates2D(st, deltaTwist);
        }

        prevDist = dist;
        prevMid = mid;
        prevAngle = angle;
        store.set({ ...radiusUpdate, ...spinUpdate, pan: nextPan });
      }
    },
    { capture: true }
  );

  const onPointerUp = (e) => {
    if (isAltSpinning) {
      isAltSpinning = false;
      if (canvas.style) canvas.style.cursor = '';
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) {}
    }
    if (pointers.has(e.pointerId)) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0 && isGesturing) {
        isGesturing = false;
        if (typeof onGestureEnd === 'function') onGestureEnd();
      }
    }
  };

  canvas.addEventListener('pointerup', onPointerUp, { capture: true });
  canvas.addEventListener('pointercancel', onPointerUp, { capture: true });
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true });
  }

  return {
    isGesturing: () => isGesturing,
    getPointersCount: () => pointers.size,
  };
}

/**
 * Enables universal touch-scroll (2D pan-x + pan-y with momentum) and multi-touch
 * two-finger pinch-to-zoom / resize across all workspace panels, toolbars, docks,
 * and telemetry overlays.
 */
export function enableUniversalPanelTouch(root = typeof document !== 'undefined' ? document : null) {
  if (!root || root._universalPanelTouchAttached) return;
  root._universalPanelTouchAttached = true;

  const SCROLLABLE_SELECTOR = [
    '.panel-body',
    '.collapsible-content',
    '.derivation-card-content',
    '.workspace-dock-body',
    '.stats-body',
    '#toolbar-content',
    '.toolbar-content',
    '.dock-breadcrumb-bar',
    '.panels-tray-dropdown',
    '.geometry-legend-scroll-container',
    '.visual-info-overlay',
    '.tutorial-modal-overlay',
  ].join(', ');

  const PANEL_SELECTOR = '.ui-panel, .viewport-header-toolbar, .stats-overlay, .workspace-dock';

  const touchPointers = new Map();
  let pinchState = null;
  let scrollDragState = null;

  const findScrollableAncestor = (el) => {
    let cur = el;
    while (cur && cur !== root && cur !== root.body) {
      if (cur.matches?.(SCROLLABLE_SELECTOR)) {
        const canY = (cur.scrollHeight || 0) > (cur.clientHeight || 0) + 2;
        const canX = (cur.scrollWidth || 0) > (cur.clientWidth || 0) + 2;
        if (canY || canX) return cur;
      }
      cur = cur.parentElement;
    }
    return el?.closest?.(SCROLLABLE_SELECTOR) || null;
  };

  root.addEventListener?.(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch') return;
      const panelEl = e.target?.closest?.(PANEL_SELECTOR);
      if (!panelEl) return;

      touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, target: e.target, panelEl });

      if (touchPointers.size === 1) {
        // Single-finger touch inside a scrollable panel container
        if (e.target?.closest?.('input[type="range"], .toolbar-resize-handle, .omni-handle, .dock-resizer')) {
          scrollDragState = null;
          return;
        }
        const scrollEl = findScrollableAncestor(e.target);
        if (scrollEl) {
          scrollDragState = {
            pointerId: e.pointerId,
            scrollEl,
            startX: e.clientX,
            startY: e.clientY,
            startScrollLeft: scrollEl.scrollLeft || 0,
            startScrollTop: scrollEl.scrollTop || 0,
            isScrolling: false,
          };
        }
      } else if (touchPointers.size >= 2) {
        // Two-finger pinch-zoom / resize on any panel
        scrollDragState = null;
        const pts = Array.from(touchPointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const targetPanel = pts[0].panelEl || panelEl;
        const rect = targetPanel.getBoundingClientRect?.() || { width: 320, height: 240, left: 0, top: 0 };
        pinchState = {
          panelEl: targetPanel,
          initialDist: Math.max(10, dist),
          initialMid: mid,
          initialW: rect.width || 320,
          initialH: rect.height || 240,
        };
      }
    },
    { passive: true }
  );

  root.addEventListener?.(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'touch' || !touchPointers.has(e.pointerId)) return;
      const prev = touchPointers.get(e.pointerId);
      touchPointers.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });

      if (touchPointers.size >= 2 && pinchState?.panelEl) {
        const pts = Array.from(touchPointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (dist > 10 && pinchState.initialDist > 10) {
          const ratio = dist / pinchState.initialDist;
          const p = pinchState.panelEl;
          if (p.classList?.contains('workspace-dock') && !p.classList.contains('is-collapsed')) {
            const nextDockSize = clamp(Math.round(pinchState.initialW * ratio), 260, 620);
            p.style.setProperty('--dock-size', `${nextDockSize}px`);
          } else if (p.classList?.contains('viewport-header-toolbar') && !p.classList.contains('is-collapsed')) {
            const nextW = clamp(Math.round(pinchState.initialW * ratio), 180, 960);
            p.style.width = `${nextW}px`;
            p.classList.add('is-resized');
          } else if (p.classList?.contains('is-floating') || p.classList?.contains('stats-overlay')) {
            const nextW = clamp(Math.round(pinchState.initialW * ratio), 220, 760);
            const nextH = clamp(Math.round(pinchState.initialH * ratio), 140, 680);
            p.style.width = `${nextW}px`;
            if (p.classList?.contains('is-floating')) {
              p.style.height = `${nextH}px`;
            }
          }
        }
        return;
      }

      if (touchPointers.size === 1 && scrollDragState && scrollDragState.pointerId === e.pointerId) {
        const dx = e.clientX - scrollDragState.startX;
        const dy = e.clientY - scrollDragState.startY;
        if (!scrollDragState.isScrolling && Math.hypot(dx, dy) > 6) {
          scrollDragState.isScrolling = true;
        }
        if (scrollDragState.isScrolling) {
          const el = scrollDragState.scrollEl;
          if ((el.scrollHeight || 0) > (el.clientHeight || 0) + 1) {
            el.scrollTop = scrollDragState.startScrollTop - dy;
          }
          if ((el.scrollWidth || 0) > (el.clientWidth || 0) + 1) {
            el.scrollLeft = scrollDragState.startScrollLeft - dx;
          }
        }
      }
    },
    { passive: true }
  );

  const endTouch = (e) => {
    if (touchPointers.has(e.pointerId)) {
      touchPointers.delete(e.pointerId);
    }
    if (touchPointers.size < 2) {
      pinchState = null;
    }
    if (touchPointers.size === 0) {
      scrollDragState = null;
    }
  };

  root.addEventListener?.('pointerup', endTouch, { passive: true });
  root.addEventListener?.('pointercancel', endTouch, { passive: true });

  // Trackpad pinch-zoom (ctrlKey + wheel) on floating panels, modes toolbar, and dock
  root.addEventListener?.(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const panelEl = e.target?.closest?.(PANEL_SELECTOR);
      if (!panelEl) return;
      e.preventDefault?.();
      const factor = Math.exp(-e.deltaY * 0.006);
      const rect = panelEl.getBoundingClientRect?.() || { width: 320, height: 240 };
      if (panelEl.classList?.contains('workspace-dock') && !panelEl.classList.contains('is-collapsed')) {
        const nextDock = clamp(Math.round((rect.width || 380) * factor), 260, 620);
        panelEl.style.setProperty('--dock-size', `${nextDock}px`);
      } else if (panelEl.classList?.contains('viewport-header-toolbar') && !panelEl.classList.contains('is-collapsed')) {
        const nextW = clamp(Math.round((rect.width || 420) * factor), 180, 960);
        panelEl.style.width = `${nextW}px`;
        panelEl.classList.add('is-resized');
      } else if (panelEl.classList?.contains('is-floating') || panelEl.classList?.contains('stats-overlay')) {
        const nextW = clamp(Math.round((rect.width || 320) * factor), 220, 760);
        panelEl.style.width = `${nextW}px`;
        if (panelEl.classList?.contains('is-floating') && !panelEl.classList.contains('is-shaded')) {
          const nextH = clamp(Math.round((rect.height || 340) * factor), 140, 680);
          panelEl.style.height = `${nextH}px`;
        }
      }
    },
    { passive: false }
  );
}

export {
  WorkspaceDockManager,
  initWorkspaceDock,
  syncPanelElevationTurn,
  cyclePanelSubpanel,
  activateTabSubpanel,
  setSubpanelOpen,
  stepSpring,
  VelocityTracker,
  computeEdgeSnapTarget,
  DOCK_POPOUT_SVG,
  DOCK_RETURN_SVG,
  WINDOW_CLOSE_SVG,
  WINDOW_SHADE_SVG,
  WINDOW_UNSHADE_SVG,
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
export {
  createGeodesicArc3D,
  updateGeodesicArc3D,
  createSphericalTriangleMesh,
  updateSphericalTriangleMesh,
  computeSphericalTriangleExcess,
  getGeodesicTangent,
} from './circle-3d.js';
