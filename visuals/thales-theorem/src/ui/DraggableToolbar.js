import { COMPACT_QUERY } from '../config/defaults.js';
import { clamp } from '../model/thales-math.js';

/**
 * Enables smooth pointer dragging and keyboard positioning for the viewport toolbar.
 * Allows dragging by its dedicated grip handle or by any non-button background area.
 */
export class DraggableToolbar {
  /**
   * @param {HTMLElement} toolbar The floating toolbar container
   * @param {HTMLElement|null} [handle=null] The drag grip handle element
   */
  constructor(toolbar, handle = null) {
    this.toolbar = toolbar;
    this.handle = handle;
    this.compact = window.matchMedia(COMPACT_QUERY);
    this.compact.addEventListener('change', () => this.resetPosition());

    window.addEventListener('resize', () => this.#handleWindowResize());
    this.#initEvents();
  }

  /**
   * Resets the toolbar position back to default top-center floating alignment.
   */
  resetPosition() {
    Object.assign(this.toolbar.style, {
      left: '',
      top: '',
      right: '',
      bottom: '',
      transform: '',
    });
  }

  #initEvents() {
    this.toolbar.addEventListener('pointerdown', (e) => this.#onDown(e));

    if (this.handle) {
      this.handle.addEventListener('dblclick', () => this.resetPosition());
      this.handle.addEventListener('keydown', (e) => this.#onKeyDown(e));
    }
  }

  #onDown(event) {
    if (event.target.closest('button, input, a, select')) {
      return;
    }

    const parentEl = this.toolbar.offsetParent ?? document.body;
    const parent = parentEl.getBoundingClientRect();
    const box = this.toolbar.getBoundingClientRect();
    const offsetX = event.clientX - box.left;
    const offsetY = event.clientY - box.top;

    // Switch from CSS transform-based centering to explicit pixel coordinates
    Object.assign(this.toolbar.style, {
      transform: 'none',
      left: `${box.left - parent.left}px`,
      top: `${box.top - parent.top}px`,
      right: 'auto',
      bottom: 'auto',
    });

    this.toolbar.classList.add('is-dragging');

    try {
      if (this.toolbar.setPointerCapture) {
        this.toolbar.setPointerCapture(event.pointerId);
      }
    } catch (_) {}

    const move = (e) => {
      const maxX = parentEl.clientWidth - this.toolbar.offsetWidth;
      const maxY = parentEl.clientHeight - this.toolbar.offsetHeight;
      const nextX = clamp(e.clientX - parent.left - offsetX, 0, Math.max(0, maxX));
      const nextY = clamp(e.clientY - parent.top - offsetY, 0, Math.max(0, maxY));

      this.toolbar.style.left = `${nextX}px`;
      this.toolbar.style.top = `${nextY}px`;
    };

    const up = () => {
      this.toolbar.classList.remove('is-dragging');
      try {
        if (this.toolbar.hasPointerCapture?.(event.pointerId)) {
          this.toolbar.releasePointerCapture(event.pointerId);
        }
      } catch (_) {}
      this.toolbar.removeEventListener('pointermove', move);
      this.toolbar.removeEventListener('pointerup', up);
      this.toolbar.removeEventListener('pointercancel', up);
    };

    this.toolbar.addEventListener('pointermove', move);
    this.toolbar.addEventListener('pointerup', up);
    this.toolbar.addEventListener('pointercancel', up);
  }

  #onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') {
        this.resetPosition();
        return;
      }

      const step = event.shiftKey ? 50 : 12;
      const parentEl = this.toolbar.offsetParent ?? document.body;
      const parent = parentEl.getBoundingClientRect();
      const box = this.toolbar.getBoundingClientRect();

      let currentLeft = box.left - parent.left;
      let currentTop = box.top - parent.top;

      if (event.key === 'ArrowLeft') currentLeft -= step;
      if (event.key === 'ArrowRight') currentLeft += step;
      if (event.key === 'ArrowUp') currentTop -= step;
      if (event.key === 'ArrowDown') currentTop += step;

      const maxX = parentEl.clientWidth - this.toolbar.offsetWidth;
      const maxY = parentEl.clientHeight - this.toolbar.offsetHeight;

      Object.assign(this.toolbar.style, {
        transform: 'none',
        left: `${clamp(currentLeft, 0, Math.max(0, maxX))}px`,
        top: `${clamp(currentTop, 0, Math.max(0, maxY))}px`,
        right: 'auto',
        bottom: 'auto',
      });
    }
  }

  #handleWindowResize() {
    if (this.toolbar.style.transform === 'none') {
      const parentEl = this.toolbar.offsetParent;
      if (!parentEl) return;
      const maxX = parentEl.clientWidth - this.toolbar.offsetWidth;
      const maxY = parentEl.clientHeight - this.toolbar.offsetHeight;
      const curLeft = parseFloat(this.toolbar.style.left) || 0;
      const curTop = parseFloat(this.toolbar.style.top) || 0;
      this.toolbar.style.left = `${clamp(curLeft, 0, Math.max(0, maxX))}px`;
      this.toolbar.style.top = `${clamp(curTop, 0, Math.max(0, maxY))}px`;
    }
  }
}
