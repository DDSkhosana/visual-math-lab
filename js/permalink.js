/**
 * @file permalink.js
 * Universal URL State Permalinks & Shareability System for Visual Mathematics Lab.
 *
 * Encodes active mathematical configurations (angles, points, radius), visualization settings
 * (view mode, split orientation/ratio, camera perspective, affine conic deformation), and
 * workspace windowing states (dock margin, collapse state) into shareable URL hashes.
 *
 * Provides bidirectional synchronization, copy-to-clipboard with instant feedback toast,
 * and seamless hashchange restoration.
 */

import { toDegrees, toRadians, normalizeAngle, clamp } from './circle-core.js';

/**
 * Serializes application state and dock manager state into a concise URL hash string.
 * @param {Object} state - Application store state
 * @param {Object} [dockManager=null] - WorkspaceDockManager instance
 * @returns {string} URL hash string, e.g. '#angle=65.0&mode=3d&affine=1'
 */
export function serializeStateToHash(state = {}, dockManager = null) {
  const params = new URLSearchParams();

  // 1. Primary Angle (degrees)
  const rawAngle = state.angle2D ?? state.angleP ?? state.angle ?? state.pAngle;
  if (typeof rawAngle === 'number' && Number.isFinite(rawAngle)) {
    const deg = (toDegrees(normalizeAngle(rawAngle))).toFixed(1);
    params.set('angle', deg);
  }

  // 2. Auxiliary geometric angles if present
  if (typeof state.angleA === 'number' && Number.isFinite(state.angleA)) {
    params.set('angleA', (toDegrees(normalizeAngle(state.angleA))).toFixed(1));
  }
  if (typeof state.angleB === 'number' && Number.isFinite(state.angleB)) {
    params.set('angleB', (toDegrees(normalizeAngle(state.angleB))).toFixed(1));
  }
  if (typeof state.angleC === 'number' && Number.isFinite(state.angleC)) {
    params.set('angleC', (toDegrees(normalizeAngle(state.angleC))).toFixed(1));
  }
  if (typeof state.angleD === 'number' && Number.isFinite(state.angleD)) {
    params.set('angleD', (toDegrees(normalizeAngle(state.angleD))).toFixed(1));
  }
  if (typeof state.angleT === 'number' && Number.isFinite(state.angleT)) {
    params.set('angleT', (toDegrees(normalizeAngle(state.angleT))).toFixed(1));
  }

  // 3. Radius
  if (typeof state.radius === 'number' && Number.isFinite(state.radius)) {
    params.set('r', state.radius.toFixed(1));
  }

  // 4. View Mode (split | 2d | 3d)
  if (state.viewMode && state.viewMode !== 'split') {
    params.set('mode', state.viewMode);
  }

  // 5. Split Direction & Ratio
  if (state.splitDirection === 'vertical') {
    params.set('dir', 'v');
  }
  if (typeof state.splitRatio === 'number' && Math.round(state.splitRatio) !== 50) {
    params.set('split', Math.round(state.splitRatio));
  }

  // 6. 2D Projection Plane / 3D Camera Preset
  const plane = state.plane2D ?? state.activePlane;
  if (plane && plane !== 'great-circle' && plane !== 'equatorial') {
    params.set('plane', plane);
  }
  if (state.cameraPreset && state.cameraPreset !== 'iso') {
    params.set('cam', state.cameraPreset);
  }

  // 7. Affine Conic Transformation Mode
  if (state.affineMode) {
    params.set('affine', '1');
    if (typeof state.affineStretch === 'number' && state.affineStretch !== 1.0) {
      params.set('stretch', state.affineStretch.toFixed(2));
    }
    if (typeof state.affineAxisAngle === 'number' && state.affineAxisAngle !== 0) {
      params.set('axis', Math.round(toDegrees(state.affineAxisAngle)));
    }
  }

  // 8. Unit System
  const unit = state.lengthUnit ?? state.unitSystem?.lengthUnit;
  if (unit && unit !== 'px') {
    params.set('unit', unit);
  }

  // 9. Reflex angle toggle
  if (state.vis2d?.reflex || state.showReflex) {
    params.set('reflex', '1');
  }

  // 10. Workspace Dock State
  const activeDock = dockManager || (typeof window !== 'undefined' ? window.__vmlDockManager : null);
  if (activeDock) {
    if (activeDock.dockEdge && activeDock.dockEdge !== 'bottom') {
      params.set('edge', activeDock.dockEdge);
    }
    if (activeDock.isCollapsed) {
      params.set('docked', '0');
    }
  }

  const str = params.toString();
  return str ? `#${str}` : '';
}

/**
 * Deserializes a URL hash or query string into a state patch and dock settings.
 * @param {string} hashString - The URL hash (e.g. window.location.hash or '#angle=65.0&mode=3d')
 * @returns {Object} State patch object to apply via store.set()
 */
export function deserializeStateFromHash(hashString = '') {
  if (!hashString || typeof hashString !== 'string') return {};

  const clean = hashString.replace(/^[#?]+/, '');
  if (!clean) return {};

  const params = new URLSearchParams(clean);
  const patch = {};

  // 1. Primary Angle
  if (params.has('angle')) {
    const deg = parseFloat(params.get('angle'));
    if (Number.isFinite(deg)) {
      const rad = normalizeAngle(toRadians(deg));
      patch.angle2D = rad;
      patch.angleP = rad;
      patch.angle = rad;
    }
  }

  // 2. Auxiliary angles
  for (const k of ['angleA', 'angleB', 'angleC', 'angleD', 'angleT']) {
    if (params.has(k)) {
      const deg = parseFloat(params.get(k));
      if (Number.isFinite(deg)) {
        patch[k] = normalizeAngle(toRadians(deg));
      }
    }
  }

  // 3. Radius
  if (params.has('r')) {
    const r = parseFloat(params.get('r'));
    if (Number.isFinite(r) && r > 0) {
      patch.radius = clamp(r, 2, 50);
    }
  }

  // 4. View Mode
  if (params.has('mode')) {
    const mode = params.get('mode');
    if (['split', '2d', '3d'].includes(mode)) {
      patch.viewMode = mode;
    }
  }

  // 5. Split Direction & Ratio
  if (params.has('dir')) {
    const d = params.get('dir');
    patch.splitDirection = (d === 'v' || d === 'vertical') ? 'vertical' : 'horizontal';
  }
  if (params.has('split')) {
    const s = parseFloat(params.get('split'));
    if (Number.isFinite(s)) {
      patch.splitRatio = clamp(s, 10, 90);
    }
  }

  // 6. Projection Plane & Camera Preset
  if (params.has('plane')) {
    const plane = params.get('plane');
    patch.plane2D = plane;
    patch.activePlane = plane;
  }
  if (params.has('cam')) {
    patch.cameraPreset = params.get('cam');
  }

  // 7. Affine Conic Transformation Mode
  if (params.has('affine')) {
    const aff = params.get('affine');
    patch.affineMode = aff === '1' || aff === 'true';
  }
  if (params.has('stretch')) {
    const s = parseFloat(params.get('stretch'));
    if (Number.isFinite(s)) {
      patch.affineStretch = clamp(s, 0.4, 2.5);
    }
  }
  if (params.has('axis')) {
    const deg = parseFloat(params.get('axis'));
    if (Number.isFinite(deg)) {
      patch.affineAxisAngle = toRadians(deg);
    }
  }

  // 8. Unit System
  if (params.has('unit')) {
    patch.lengthUnit = params.get('unit');
  }

  // 9. Reflex Angles
  if (params.has('reflex')) {
    patch.showReflex = params.get('reflex') === '1';
    patch.vis2d = { ...(patch.vis2d || {}), reflex: patch.showReflex };
    patch.vis3d = { ...(patch.vis3d || {}), reflex: patch.showReflex };
  }

  // 10. Dock settings
  if (params.has('edge')) {
    patch.dockEdge = params.get('edge');
  }
  if (params.has('docked')) {
    patch.dockCollapsed = params.get('docked') === '0';
  }

  return patch;
}

/**
 * Displays a non-intrusive floating feedback toast notification.
 * @param {string} message - Toast text to display
 * @param {number} [duration=3000] - Duration in milliseconds before fading
 */
export function showShareToast(message = 'Link copied to clipboard! (Share exact geometric proof)', duration = 3000) {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById('vml-share-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'vml-share-toast';
    toast.className = 'vml-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0;">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    <span>${message}</span>
  `;

  toast.classList.add('vml-toast--visible');

  if (toast._timer) {
    clearTimeout(toast._timer);
  }
  toast._timer = setTimeout(() => {
    toast.classList.remove('vml-toast--visible');
  }, duration);
}

/**
 * Copies the current state permalink to clipboard and displays the feedback toast.
 * @param {Object} store - Observable store
 * @param {Object} [dockManager=null] - WorkspaceDockManager instance
 * @returns {Promise<string>} The copied URL
 */
export async function copyShareUrl(store = null, dockManager = null) {
  const state = store?.get?.() || (typeof window !== 'undefined' ? window.__vmlStore?.get?.() : {}) || {};
  const hash = serializeStateToHash(state, dockManager);

  let url = '';
  if (typeof window !== 'undefined') {
    url = `${window.location.origin}${window.location.pathname}${hash}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      showShareToast('Link copied to clipboard! (Share exact geometric proof)');
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      showShareToast(`Link: ${url}`, 4500);
    }
  }
  return url;
}

/**
 * Initializes continuous bidirectional synchronization between application store and URL hash.
 * @param {Object} store - Observable store
 * @param {Object} [dockManager=null] - WorkspaceDockManager
 */
export function initPermalinkSync(store, dockManager = null) {
  if (!store || typeof window === 'undefined') return;

  // 1. Initial hydration from existing URL hash
  if (window.location.hash) {
    const patch = deserializeStateFromHash(window.location.hash);
    if (Object.keys(patch).length > 0) {
      store.set(patch);
      const dm = dockManager || window.__vmlDockManager;
      if (dm && patch.dockEdge && typeof dm.setDockEdge === 'function') {
        dm.setDockEdge(patch.dockEdge);
      }
      if (dm && patch.dockCollapsed !== undefined && typeof dm.setCollapsed === 'function') {
        dm.setCollapsed(patch.dockCollapsed);
      }
    }
  }

  // 2. Debounced store subscription to keep URL hash in sync with interaction
  let debounceTimer = null;
  store.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const dm = dockManager || window.__vmlDockManager;
      const hash = serializeStateToHash(state, dm);
      if (window.location.hash !== hash) {
        try {
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', hash || window.location.pathname);
          } else {
            window.location.hash = hash;
          }
        } catch (_) {}
      }
    }, 180);
  });

  // 3. Listen to browser history navigation (back/forward)
  window.addEventListener('hashchange', () => {
    const patch = deserializeStateFromHash(window.location.hash);
    if (Object.keys(patch).length > 0) {
      store.set(patch);
      const dm = dockManager || window.__vmlDockManager;
      if (dm && patch.dockEdge && typeof dm.setDockEdge === 'function') {
        dm.setDockEdge(patch.dockEdge);
      }
    }
  });

  // 4. Global keyboard shortcut: 'S' or 'Alt+S' to copy share link
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      copyShareUrl(store, dockManager);
    }
  });
}
