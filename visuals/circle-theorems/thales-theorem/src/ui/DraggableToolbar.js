import { COMPACT_QUERY } from '../config/defaults.js';
import { clamp } from '../model/thales-math.js';

/**
 * Enables smooth pointer dragging, 8-directional resizing, scroll overflow,
 * and adaptive layout reflow for the viewport modes toolbar.
 */
export class DraggableToolbar {
  static RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  /**
   * @param {HTMLElement} toolbar The floating toolbar container
   * @param {HTMLElement|null} [handle=null] The drag grip handle element
   */
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
      window.addEventListener('resize', () => this.#handleWindowResize());
    }
    this.#initEvents();
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
      this.collapseBtn.setAttribute('aria-label', collapsed ? 'Expand view options' : 'Collapse view options');
      this.collapseBtn.title = collapsed ? 'Expand view options (2D, 3D, Split, AR, Spatial, Play, Reset)' : 'Collapse view options';
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

  /**
   * Resets custom toolbar dimensions and adaptive reflow state.
   */
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

  /**
   * Resets the toolbar position and size back to default floating alignment.
   */
  resetPosition() {
    this._hasCustomPos = false;
    this.resetSize();
    Object.assign(this.toolbar.style, {
      left: '',
      top: '',
      right: '',
      bottom: '',
      transform: '',
    });
  }

  #initResizeHandles() {
    for (const dir of DraggableToolbar.RESIZE_DIRS) {
      let h = this.toolbar.querySelector?.(`.toolbar-resize-handle[data-resize-dir="${dir}"]`);
      if (!h && typeof document !== 'undefined' && document.createElement && this.toolbar.appendChild) {
        h = document.createElement('div');
        h.className = `toolbar-resize-handle handle-${dir}`;
        h.dataset.resizeDir = dir;
        h.setAttribute('aria-hidden', 'true');
        h.title = 'Drag to resize view toolbar (Double-click to reset size)';
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

  #initEvents() {
    this.toolbar.addEventListener('pointerdown', (e) => this.#onDown(e));

    if (this.handle) {
      this.handle.addEventListener('dblclick', () => this.resetPosition());
      this.handle.addEventListener('keydown', (e) => this.#onKeyDown(e));
    }
  }

  #onDown(event) {
    if (event.target.closest('button, input, a, select, .toolbar-resize-handle')) {
      return;
    }
    if (this.content && event.target === this.content) {
      if (event.offsetX > this.content.clientWidth || event.offsetY > this.content.clientHeight) {
        return;
      }
    }
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
      if (this._hasCustomSize && this.toolbar.style.width) {
        const maxW = Math.max(160, parentEl.clientWidth - 16);
        const curW = parseFloat(this.toolbar.style.width) || 0;
        if (curW > maxW) {
          this.toolbar.style.width = `${maxW}px`;
          this._savedWidth = `${maxW}px`;
        }
      }
      if (this._hasExplicitHeight && this.toolbar.style.height && this.toolbar.style.height !== 'auto') {
        const maxH = Math.max(38, parentEl.clientHeight - 16);
        const curH = parseFloat(this.toolbar.style.height) || 0;
        if (curH > maxH) {
          this.toolbar.style.height = `${maxH}px`;
          this._savedHeight = `${maxH}px`;
        }
      }
      const maxX = parentEl.clientWidth - this.toolbar.offsetWidth;
      const maxY = parentEl.clientHeight - this.toolbar.offsetHeight;
      const curLeft = parseFloat(this.toolbar.style.left) || 0;
      const curTop = parseFloat(this.toolbar.style.top) || 0;
      this.toolbar.style.left = `${clamp(curLeft, 0, Math.max(0, maxX))}px`;
      this.toolbar.style.top = `${clamp(curTop, 0, Math.max(0, maxY))}px`;
    }
    if (!this.isCollapsed) {
      this.#updateReflowState();
    }
  }
}
