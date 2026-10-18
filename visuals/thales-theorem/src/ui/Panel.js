import { COMPACT_QUERY, LIMITS } from '../config/defaults.js';
import { clamp } from '../model/thales-math.js';
import { setExpandButtonUI, setPanelMinimizeButtonUI } from './Accordion.js';

/**
 * A floating panel that can be dragged, resized and minimised with Pointer Events (mouse, touch, pen).
 * On compact screens the panel flows in the page instead, so dragging and resizing are disabled.
 */
export class Panel {
  /**
   * @param {HTMLElement} element
   * @param {{header: HTMLElement, resizeHandle?: HTMLElement, resizeFrom?: 'left'|'right',
   *          minimizeButton?: HTMLElement, expandButton?: HTMLElement, accordion?: import('./Accordion.js').Accordion}} parts
   */
  constructor(element, { header, resizeHandle, resizeFrom = 'right', minimizeButton, expandButton, accordion }) {
    this.element = element;
    this.body = element.querySelector('.panel-body');
    this.accordion = accordion;
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
    return this.body.classList.contains('hidden');
  }

  setMinimized(minimized) {
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
    if (!this.accordion || !this.body) return;
    const shouldCollapse = this.expandButton?.getAttribute('aria-expanded') === 'true' ||
      this.expandButton?.textContent.includes('Collapse') ||
      (!this.minimized && this.accordion.allOpen(this.body));
    this.setMinimized(false);
    this.accordion.setAll(this.body, !shouldCollapse);
    if (this.expandButton) {
      setExpandButtonUI(this.expandButton, !shouldCollapse);
    }
  }

  #resetLayout() {
    Object.assign(this.element.style, { left: '', top: '', right: '', width: '' });
  }

  #enableDrag(header) {
    header.addEventListener('pointerdown', (event) => {
      if (this.compact.matches || event.target.closest('button')) return;
      if (this.element.closest('.workspace-dock-body')) return;
      const parent = this.element.offsetParent.getBoundingClientRect();
      const box = this.element.getBoundingClientRect();
      const offsetX = event.clientX - box.left;
      const offsetY = event.clientY - box.top;
      try {
        if (header.setPointerCapture) header.setPointerCapture(event.pointerId);
      } catch (_) {}

      const move = (e) => {
        const maxX = this.element.offsetParent.clientWidth - this.element.offsetWidth;
        const maxY = this.element.offsetParent.clientHeight - this.element.offsetHeight;
        Object.assign(this.element.style, {
          left: `${clamp(e.clientX - parent.left - offsetX, 0, Math.max(0, maxX))}px`,
          top: `${clamp(e.clientY - parent.top - offsetY, 0, Math.max(0, maxY))}px`,
          right: 'auto',
          bottom: 'auto',
        });
      };
      this.#trackPointer(header, event.pointerId, move);
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
        this.element.style.width = `${clamp(width, LIMITS.panelWidth.min, LIMITS.panelWidth.max)}px`;
      };
      this.#trackPointer(handle, event.pointerId, move, () => handle.classList.remove('active'));
    });
  }

  #trackPointer(target, pointerId, onMove, onEnd = () => {}) {
    const end = () => {
      try {
        if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
      } catch (_) {}
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      onEnd();
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }
}
