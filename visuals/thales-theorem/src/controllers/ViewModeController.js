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
  }

  render({ viewMode, splitDirection, splitRatio }) {
    const horizontal = splitDirection === 'horizontal';
    this.mainView.className = `view-container layout-${viewMode} ${horizontal ? 'horizontal' : 'vertical'}-split`;

    for (const [mode, button] of Object.entries(this.buttons)) {
      button.classList.toggle('active', mode === viewMode);
      button.setAttribute('aria-pressed', String(mode === viewMode));
    }
    const isSplit = viewMode === 'split';
    this.flipButton.style.display = isSplit ? '' : 'none';
    this.flipButton.hidden = !isSplit;
    this.flipButton.setAttribute(
      'title',
      horizontal ? 'Switch to vertical split (stacked)' : 'Switch to horizontal split (side-by-side)'
    );

    const split = viewMode === 'split';
    this.container2d.style.flexBasis = split ? `${splitRatio}%` : '';
    this.container3d.style.flexBasis = split ? `${100 - splitRatio}%` : '';

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
