/**
 * Shared core utilities, math helpers, and UI widgets for Circle Geometry Visualisations.
 */

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
 * Minimal observable store.
 */
export function createStore(initialState) {
  let state = { ...initialState };
  const subscribers = [];

  return {
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
    subscribe: (fn, keys = null) => {
      const sub = { fn, keys };
      subscribers.push(sub);
      return () => {
        const i = subscribers.indexOf(sub);
        if (i !== -1) subscribers.splice(i, 1);
      };
    },
  };
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
    this.minimizeButton.textContent = this.minimized ? '+' : '−';
    this.minimizeButton.setAttribute('aria-expanded', String(!this.minimized));
    if (this.expandButton && this.minimized) {
      this.expandButton.textContent = 'Expand All';
    }
  }

  #toggleAll() {
    if (!this.body) return;
    const sections = Array.from(this.body.querySelectorAll('.collapsible-section'));
    const cards = Array.from(this.body.querySelectorAll('.derivation-card'));
    const isCollapse = this.expandButton?.textContent === 'Collapse All' || (
      !this.minimized && (
        (sections.length > 0 && sections.every((s) => !s.classList.contains('collapsed'))) &&
        (cards.length === 0 || cards.every((c) => c.querySelector('.derivation-card-header')?.classList.contains('open')))
      )
    );
    this.setMinimized(false);
    sections.forEach((s) => {
      s.classList.toggle('collapsed', isCollapse);
      const icon = s.querySelector('.collapsible-header .icon');
      if (icon) icon.textContent = isCollapse ? '▶' : '▼';
    });
    cards.forEach((c) => {
      const header = c.querySelector('.derivation-card-header');
      const content = c.querySelector('.derivation-card-content');
      header?.classList.toggle('open', !isCollapse);
      header?.setAttribute('aria-expanded', String(!isCollapse));
      content?.classList.toggle('open', !isCollapse);
    });
    if (this.expandButton) {
      this.expandButton.textContent = isCollapse ? 'Expand All' : 'Collapse All';
    }
  }

  #resetLayout() {
    Object.assign(this.element.style, { left: '', top: '', right: '', width: '' });
  }

  #enableDrag(header) {
    if (!header) return;
    header.addEventListener('pointerdown', (event) => {
      if (this.compact.matches || event.target.closest('button, input, a, select')) return;
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
    this.toolbar = toolbar;
    this.handle = handle;
    this.compact = window.matchMedia(COMPACT_QUERY);
    this.compact.addEventListener('change', () => this.resetPosition());

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
      this.toggleButton.setAttribute('aria-expanded', String(!collapsed));
      this.toggleButton.textContent = collapsed ? '+' : '−';
    }
  }
}

/**
 * Accordion section and derivation card toggle helper.
 */
export function initCollapsibleSections(root = document) {
  root.addEventListener('click', (e) => {
    const header = e.target.closest('.collapsible-header');
    if (!header || !root.contains(header)) return;

    const card = header.closest('.derivation-card');
    if (card) {
      const isOpen = header.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
      const content = card.querySelector('.derivation-card-content');
      if (content) content.classList.toggle('open', isOpen);
      _syncPanelExpandButton(header);
      return;
    }

    const section = header.closest('.collapsible-section');
    if (section) {
      const isCollapsed = section.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', String(!isCollapsed));
      const icon = header.querySelector('.icon');
      if (icon) {
        icon.textContent = isCollapsed ? '▶' : '▼';
      }
      _syncPanelExpandButton(header);
    }
  });
}

function _syncPanelExpandButton(header) {
  const panel = header.closest('.ui-panel');
  if (!panel) return;
  const expandBtn = panel.querySelector('[id$="-expand"], [id$="-btn"]');
  const body = panel.querySelector('.panel-body');
  if (!expandBtn || !body) return;

  const sections = Array.from(body.querySelectorAll('.collapsible-section'));
  const cards = Array.from(body.querySelectorAll('.derivation-card'));
  const allSectionsOpen = sections.length === 0 || sections.every((s) => !s.classList.contains('collapsed'));
  const allCardsOpen = cards.length === 0 || cards.every((c) => c.querySelector('.derivation-card-header')?.classList.contains('open'));

  expandBtn.textContent = (allSectionsOpen && allCardsOpen) ? 'Collapse All' : 'Expand All';
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
export function drawHaloText(ctx, text, x, y, color, font = 'bold 13px monospace') {
  ctx.save();
  ctx.font = font;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4.5;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Clean mathematical annotation text with protective halo outline.
 * Replaces heavy rectangular black badge backgrounds to eliminate visual clutter.
 */
export function drawTextBadge(ctx, text, x, y, color, font = 'bold 12px monospace') {
  drawHaloText(ctx, text, x, y, color, font);
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
 * Draws a 2D Cartesian grid and coordinate axes through (cx, cy).
 * - vis2d.grid !== false: draws subtle Cartesian grid lines across the canvas.
 * - vis2d.axes !== false: draws X and Y coordinate axes through (cx, cy) with arrowheads and labels (+X, -X, +Y, -Y).
 */
export function draw2DCartesianGrid(ctx, width, height, cx, cy, vis2d = {}, step = 40) {
  const showGrid = vis2d?.grid !== false;
  const showAxes = vis2d?.axes !== false;

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
    // X-Axis (Horizontal) - Amber
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Y-Axis (Vertical) - Lime
    ctx.strokeStyle = 'rgba(132, 204, 22, 0.8)';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Arrowheads (+X at right, -X at left, +Y at top, -Y at bottom)
    const arrowHead = 8;
    // +X (right)
    ctx.fillStyle = PALETTE.amber;
    ctx.beginPath();
    ctx.moveTo(width - 2, cy);
    ctx.lineTo(width - arrowHead - 2, cy - 4);
    ctx.lineTo(width - arrowHead - 2, cy + 4);
    ctx.closePath();
    ctx.fill();

    // -X (left)
    ctx.beginPath();
    ctx.moveTo(2, cy);
    ctx.lineTo(arrowHead + 2, cy - 4);
    ctx.lineTo(arrowHead + 2, cy + 4);
    ctx.closePath();
    ctx.fill();

    // +Y (top)
    ctx.fillStyle = PALETTE.lime;
    ctx.beginPath();
    ctx.moveTo(cx, 2);
    ctx.lineTo(cx - 4, arrowHead + 2);
    ctx.lineTo(cx + 4, arrowHead + 2);
    ctx.closePath();
    ctx.fill();

    // -Y (bottom)
    ctx.beginPath();
    ctx.moveTo(cx, height - 2);
    ctx.lineTo(cx - 4, height - arrowHead - 2);
    ctx.lineTo(cx + 4, height - arrowHead - 2);
    ctx.closePath();
    ctx.fill();

    // Axis Labels
    drawHaloText(ctx, '+X', width - 20, cy - 10, PALETTE.amber, 'bold 11px monospace');
    drawHaloText(ctx, '-X', 20, cy - 10, PALETTE.amber, 'bold 11px monospace');
    drawHaloText(ctx, '+Y', cx + 12, 18, PALETTE.lime, 'bold 11px monospace');
    drawHaloText(ctx, '-Y', cx + 12, height - 12, PALETTE.lime, 'bold 11px monospace');
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
 */
export function drawAngleWedge(ctx, vertex, startAngle, endAngle, radius = 28, fill = 'rgba(234, 179, 8, 0.22)', stroke = null, anticlockwise = false) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle, anticlockwise);
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
 * Draws a circular segment bounded by chord AB and the arc that does NOT contain P.
 */
export function drawSubtendedSegment(ctx, center, A, B, P, radius, fill = 'rgba(56, 189, 248, 0.12)', stroke = null) {
  const { angA, angB, anticlockwise } = getSubtendedArcCanvas(center, A, B, P);
  ctx.save();
  ctx.beginPath();
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
    vis2d: {
      grid: true,
      axes: true,
      points: true,
      labels: true,
      coords: false,
      lengths: true,
      angles: true,
      area: true,
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

  // 3D Camera Presets
  const cameraButtons = document.querySelectorAll('#toolbar-3d-panel [data-preset], #canvas-3d-container .camera-presets-bar button, #toolbar-3d-panel [data-camera-preset]');
  cameraButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      let preset = btn.dataset.preset || btn.dataset.cameraPreset;
      if (preset === 'isometric') preset = 'iso';
      cameraButtons.forEach((b) => {
        const p = b.dataset.preset || b.dataset.cameraPreset;
        b.classList.toggle('active', (p === 'isometric' ? 'iso' : p) === preset);
      });
      sceneTarget?.setCameraPreset(preset);
    });
  });

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
      this.onStep(delta, current, this.store);
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



