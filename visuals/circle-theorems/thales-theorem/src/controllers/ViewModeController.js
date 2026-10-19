import { LIMITS } from '../config/defaults.js';
import { clamp } from '../model/thales-math.js';
import { setSplitRatio, setViewMode, toggleSplitDirection } from '../model/actions.js';

/** Applies the view-mode state to the layout and turns button / divider input into actions. */
export class ViewModeController {
  static stateKeys = ['viewMode', 'splitDirection', 'splitRatio'];

  constructor(store, { mainView, container2d, container3d, toolbar2d, toolbar3d, buttons, flipButton, resizer, onResize }) {
    this.store = store;
    this.mainView = mainView;
    this.container2d = container2d;
    this.container3d = container3d;
    this.toolbar2d = toolbar2d;
    this.toolbar3d = toolbar3d;
    this.buttons = buttons;
    this.flipButton = flipButton;
    this.onResize = onResize;

    for (const [mode, button] of Object.entries(buttons)) {
      button.addEventListener('click', () => store.set(setViewMode(mode)));
    }
    flipButton.addEventListener('click', () => store.set(toggleSplitDirection(store.get())));
    this.#enableDividerDrag(resizer);

    this.compactMedia = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 48rem)') : null;
    if (this.compactMedia?.addEventListener) {
      this.compactMedia.addEventListener('change', () => {
        this.render(this.store.get());
        this.onResize?.();
      });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', () => {
        this.render(this.store.get());
        this.onResize?.();
      });
    }

    if (typeof ResizeObserver !== 'undefined' && this.mainView) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize?.();
      });
      try {
        this.resizeObserver.observe(this.mainView);
      } catch (_) {}
    }

    if (this.store?.get) {
      this.render(this.store.get());
    }
  }

  isCompact() {
    if (this.compactMedia?.matches) return true;
    const rect = this.mainView?.getBoundingClientRect?.();
    if (rect && typeof rect.width === 'number' && rect.width > 0) {
      return rect.width <= 768;
    }
    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
      return window.innerWidth <= 768;
    }
    return false;
  }

  render(state = this.store?.get?.() || {}) {
    const viewMode = state?.viewMode || 'split';
    const splitDirection = state?.splitDirection;
    const splitRatio = state?.splitRatio ?? 50;
    const isCompact = this.isCompact();
    const effectiveSplitDirection = isCompact ? 'vertical' : (splitDirection || 'horizontal');
    const horizontal = effectiveSplitDirection === 'horizontal';
    this.mainView.className = `view-container layout-${viewMode} ${horizontal ? 'horizontal' : 'vertical'}-split`;

    if (this.mainView?.dataset) {
      this.mainView.dataset.viewport = isCompact ? 'compact' : 'regular';
    }

    for (const [mode, button] of Object.entries(this.buttons || {})) {
      if (!button) continue;
      button.classList?.toggle('active', mode === viewMode);
      button.setAttribute?.('aria-pressed', String(mode === viewMode));
    }
    const isSplit = viewMode === 'split';
    if (this.flipButton) {
      this.flipButton.style.display = isSplit && !isCompact ? '' : 'none';
      this.flipButton.hidden = !isSplit || isCompact;
      this.flipButton.setAttribute(
        'title',
        horizontal ? 'Switch to vertical split (stacked)' : 'Switch to horizontal split (side-by-side)'
      );
    }

    const split = viewMode === 'split';
    if (this.container2d) this.container2d.style.flexBasis = split ? `${splitRatio}%` : '';
    if (this.container3d) this.container3d.style.flexBasis = split ? `${100 - splitRatio}%` : '';

    if (this.toolbar2d) this.toolbar2d.style.display = viewMode === '3d' ? 'none' : '';
    if (this.toolbar3d) this.toolbar3d.style.display = viewMode === '2d' ? 'none' : '';

    this.onResize?.();
  }

  #enableDividerDrag(resizer) {
    resizer.addEventListener('pointerdown', (event) => {
      try {
        if (resizer.setPointerCapture) resizer.setPointerCapture(event.pointerId);
      } catch (_) {}
      resizer.classList.add('active');
      const move = (e) => {
        const rect = this.mainView.getBoundingClientRect();
        const isRow = window.getComputedStyle(this.mainView).flexDirection.startsWith('row');
        const ratio = isRow
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
        this.store.set(setSplitRatio(clamp(ratio, LIMITS.splitRatio.min, LIMITS.splitRatio.max)));
        this.onResize?.();
      };
      const end = () => {
        try {
          if (resizer.hasPointerCapture?.(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
        } catch (_) {}
        resizer.classList.remove('active');
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', end);
        resizer.removeEventListener('pointercancel', end);
        this.onResize?.();
      };
      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', end);
      resizer.addEventListener('pointercancel', end);
    });
  }
}
