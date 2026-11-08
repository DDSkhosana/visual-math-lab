/**
 * PermutationGridView — Interactive n × n Cartesian Coordinate Grid,
 * Fixed-Point Diagonal (y = x), and Rothe Diagram Inversion Cells.
 * Visual Mathematics Lab — Module 3: Permutations & Symmetric Groups S_n
 */

import { PermutationMath } from '../../../js/foundations-core.js';

export class PermutationGridView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.svg = null;
    this.width = 0;
    this.height = 0;
    this.activeDrag = null;
    this.hoverCoord = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="permutation-grid-container" style="position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column;">
        <svg id="perm-grid-svg" style="width: 100%; height: 100%; user-select: none; touch-action: none;">
          <defs>
            <filter id="perm-glow-dot" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="perm-grid-pat" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="0.5" />
            </pattern>
          </defs>
          <g id="perm-grid-bg"></g>
          <g id="perm-grid-rothe"></g>
          <g id="perm-grid-axes"></g>
          <g id="perm-grid-diagonal"></g>
          <g id="perm-grid-crosshair"></g>
          <g id="perm-grid-points"></g>
        </svg>

        <!-- Floating Quick Guide -->
        <div style="position: absolute; bottom: 8px; left: 12px; font-size: 0.72rem; color: #94a3b8; pointer-events: none; background: rgba(15, 23, 42, 0.75); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          <span style="color: #38bdf8;">■ X: Input Domain</span> &nbsp;|&nbsp;
          <span style="color: #f472b6;">■ Y: Output Codomain</span> &nbsp;|&nbsp;
          <span style="color: #64748b;">-- y = x: Fixed Points</span> &nbsp;|&nbsp;
          <span style="color: #cbd5e1;">Click/drag cell to swap &sigma;(x) = y</span>
        </div>
      </div>
    `;

    this.svg = this.container.querySelector('#perm-grid-svg');
    this.bgLayer = this.container.querySelector('#perm-grid-bg');
    this.rotheLayer = this.container.querySelector('#perm-grid-rothe');
    this.axesLayer = this.container.querySelector('#perm-grid-axes');
    this.diagLayer = this.container.querySelector('#perm-grid-diagonal');
    this.crosshairLayer = this.container.querySelector('#perm-grid-crosshair');
    this.pointsLayer = this.container.querySelector('#perm-grid-points');

    this.setupEventListeners();
    this.resize();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    // Observe dock changes for visible bounds clearance
    const explorer = this.container.closest('.circle-explorer');
    if (explorer && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => this.resize());
      observer.observe(explorer, { attributes: true, attributeFilter: ['data-dock-edge', 'class'] });
    }

    this.svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.svg.addEventListener('pointerleave', () => {
      this.hoverCoord = null;
      this.renderCrosshair();
    });
  }

  getVisibleBounds() {
    const explorer = this.container.closest('.circle-explorer');
    let bottomInset = 0;
    let topInset = 0;
    if (explorer) {
      const isDockBottom = explorer.getAttribute('data-dock-edge') === 'bottom' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockBottom) {
        const dockEl = explorer.querySelector('.workspace-dock');
        bottomInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 320) : 0;
      }
      const isDockTop = explorer.getAttribute('data-dock-edge') === 'top' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockTop) {
        const dockEl = explorer.querySelector('.workspace-dock');
        topInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 280) : 0;
      }
    }
    const usableH = Math.max(200, this.height - bottomInset - topInset);
    const startY = topInset;
    return { topInset, bottomInset, usableH, startY };
  }

  resize() {
    if (!this.svg) return;
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 500;
    this.height = rect.height || 450;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.render();
  }

  getGridGeometry() {
    const n = this.controller.state.n;
    const { startY, usableH } = this.getVisibleBounds();

    const marginL = 55;
    const marginR = 30;
    const marginT = startY + 35;
    const marginB = (this.height - (startY + usableH)) + 45;

    const availW = Math.max(160, this.width - marginL - marginR);
    const availH = Math.max(160, this.height - marginT - marginB);

    // Keep grid aspect ratio square for geometric isometry (y = x at exactly 45 degrees)
    const gridSize = Math.min(availW, availH);
    const originX = marginL + (availW - gridSize) / 2;
    const originY = marginT + availH - (availH - gridSize) / 2; // bottom of grid (y=0)

    const cellSize = gridSize / n;

    // Coordinate conversion functions:
    // math coordinates (x, y) where 1 <= x, y <= n
    // xPixel = originX + (x - 0.5) * cellSize
    // yPixel = originY - (y - 0.5) * cellSize
    const xToPx = (x) => originX + (x - 0.5) * cellSize;
    const yToPx = (y) => originY - (y - 0.5) * cellSize;

    const pxToCell = (px, py) => {
      const col = Math.floor((px - originX) / cellSize) + 1;
      const row = Math.floor((originY - py) / cellSize) + 1;
      if (col >= 1 && col <= n && row >= 1 && row <= n) {
        return { x: col, y: row };
      }
      return null;
    };

    return {
      n,
      gridSize,
      originX,
      originY,
      cellSize,
      xToPx,
      yToPx,
      pxToCell
    };
  }

  render() {
    if (!this.svg || this.width === 0) return;
    const state = this.controller.state;
    const geom = this.getGridGeometry();
    const rothe = PermutationMath.computeRotheDiagram(state.mapping);

    this.renderBackgroundGrid(geom);
    this.renderRotheInversions(geom, rothe);
    this.renderAxes(geom);
    this.renderDiagonal(geom);
    this.renderPoints(geom, state.mapping, rothe);
    this.renderCrosshair();
  }

  renderBackgroundGrid(geom) {
    const { n, originX, originY, gridSize, cellSize } = geom;
    let html = '';

    // Outer grid boundary
    html += `
      <rect x="${originX}" y="${originY - gridSize}" width="${gridSize}" height="${gridSize}" 
            fill="#090e1a" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" rx="4" />
    `;

    // Grid lines
    for (let i = 1; i < n; i++) {
      const x = originX + i * cellSize;
      const y = originY - i * cellSize;
      // Vertical line
      html += `<line x1="${x}" y1="${originY - gridSize}" x2="${x}" y2="${originY}" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" />`;
      // Horizontal line
      html += `<line x1="${originX}" y1="${y}" x2="${originX + gridSize}" y2="${y}" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" />`;
    }

    this.bgLayer.innerHTML = html;
  }

  renderRotheInversions(geom, rothe) {
    const { originX, originY, cellSize } = geom;
    let html = '';

    // Shaded inversion squares in the Rothe diagram:
    for (const cell of rothe.inversionCells) {
      const cellX = originX + (cell.x - 1) * cellSize;
      const cellY = originY - cell.y * cellSize;

      html += `
        <rect x="${cellX + 2}" y="${cellY + 2}" width="${cellSize - 4}" height="${cellSize - 4}" 
              rx="4" fill="rgba(245, 158, 11, 0.18)" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1" stroke-dasharray="3 2" />
        <text x="${cellX + cellSize / 2}" y="${cellY + cellSize / 2 + 4}" text-anchor="middle" fill="#fbbf24" font-size="10" opacity="0.8">inv</text>
      `;
    }

    this.rotheLayer.innerHTML = html;
  }

  renderDiagonal(geom) {
    const { originX, originY, gridSize } = geom;
    // Diagonal y = x from bottom-left (originX, originY) to top-right (originX + gridSize, originY - gridSize)
    this.diagLayer.innerHTML = `
      <line x1="${originX}" y1="${originY}" x2="${originX + gridSize}" y2="${originY - gridSize}" 
            stroke="#64748b" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.75" />
      <text x="${originX + gridSize - 4}" y="${originY - gridSize - 8}" text-anchor="end" fill="#94a3b8" font-size="11" font-style="italic">
        y = x (Fixed Points)
      </text>
    `;
  }

  renderAxes(geom) {
    const { n, originX, originY, gridSize, cellSize, xToPx, yToPx } = geom;
    let html = '';

    // Horizontal X Axis (Input Domain)
    html += `
      <line x1="${originX - 10}" y1="${originY}" x2="${originX + gridSize + 15}" y2="${originY}" stroke="#38bdf8" stroke-width="2" />
      <text x="${originX + gridSize + 20}" y="${originY + 4}" fill="#38bdf8" font-size="12" font-weight="bold">X</text>
    `;

    // Vertical Y Axis (Output Codomain)
    html += `
      <line x1="${originX}" y1="${originY + 10}" x2="${originX}" y2="${originY - gridSize - 15}" stroke="#f472b6" stroke-width="2" />
      <text x="${originX}" y="${originY - gridSize - 20}" text-anchor="middle" fill="#f472b6" font-size="12" font-weight="bold">Y = σ(X)</text>
    `;

    // Ticks & Labels
    for (let i = 1; i <= n; i++) {
      const px = xToPx(i);
      const py = yToPx(i);

      // X Tick
      html += `
        <line x1="${px}" y1="${originY}" x2="${px}" y2="${originY + 6}" stroke="#38bdf8" stroke-width="1.5" />
        <text x="${px}" y="${originY + 20}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="600">${i}</text>
      `;

      // Y Tick
      html += `
        <line x1="${originX - 6}" y1="${py}" x2="${originX}" y2="${py}" stroke="#f472b6" stroke-width="1.5" />
        <text x="${originX - 14}" y="${py + 4}" text-anchor="end" fill="#f472b6" font-size="12" font-weight="600">${i}</text>
      `;
    }

    this.axesLayer.innerHTML = html;
  }

  renderPoints(geom, mapping, rothe) {
    const { xToPx, yToPx } = geom;
    let html = '';

    for (let x = 1; x <= mapping.length; x++) {
      const y = mapping[x - 1];
      const px = xToPx(x);
      const py = yToPx(y);
      const isFixed = x === y;

      const fill = isFixed ? '#10b981' : '#38bdf8';
      const stroke = isFixed ? '#34d399' : '#e0f2fe';

      html += `
        <g class="perm-point-group" data-x="${x}" data-y="${y}" style="cursor: pointer;">
          <!-- Hit target -->
          <circle cx="${px}" cy="${py}" r="22" fill="transparent" />

          <!-- Halo -->
          <circle cx="${px}" cy="${py}" r="15" fill="${fill}" opacity="0.25" filter="url(#perm-glow-dot)" />

          <!-- Main point marker -->
          <circle cx="${px}" cy="${py}" r="12" fill="#0f172a" stroke="${stroke}" stroke-width="2.8" />
          <circle cx="${px}" cy="${py}" r="5" fill="${fill}" />

          <!-- Label -->
          <text x="${px}" y="${py - 16}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">
            (${x}, ${y})${isFixed ? ' ★' : ''}
          </text>
        </g>
      `;
    }

    this.pointsLayer.innerHTML = html;
  }

  renderCrosshair() {
    if (!this.hoverCoord) {
      this.crosshairLayer.innerHTML = '';
      return;
    }

    const geom = this.getGridGeometry();
    const { originX, originY, gridSize, xToPx, yToPx } = geom;
    const px = xToPx(this.hoverCoord.x);
    const py = yToPx(this.hoverCoord.y);

    this.crosshairLayer.innerHTML = `
      <!-- Vertical projection -->
      <line x1="${px}" y1="${originY}" x2="${px}" y2="${originY - gridSize}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7" />
      <!-- Horizontal projection -->
      <line x1="${originX}" y1="${py}" x2="${originX + gridSize}" y2="${py}" stroke="#f472b6" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7" />
      <!-- Active cell highlight -->
      <rect x="${px - geom.cellSize / 2}" y="${py - geom.cellSize / 2}" width="${geom.cellSize}" height="${geom.cellSize}" 
            fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="1.5" rx="3" />
    `;
  }

  onPointerDown(e) {
    const pt = this.toSvgCoords(e);
    const geom = this.getGridGeometry();
    const cell = geom.pxToCell(pt.x, pt.y);
    if (!cell) return;

    this.activeDrag = {
      startX: cell.x,
      currentY: cell.y
    };

    // Immediate click-to-swap update
    this.controller.setMappingValue(cell.x, cell.y);
  }

  onPointerMove(e) {
    const pt = this.toSvgCoords(e);
    const geom = this.getGridGeometry();
    const cell = geom.pxToCell(pt.x, pt.y);

    if (cell) {
      if (!this.hoverCoord || this.hoverCoord.x !== cell.x || this.hoverCoord.y !== cell.y) {
        this.hoverCoord = cell;
        this.renderCrosshair();
      }

      if (this.activeDrag && this.activeDrag.currentY !== cell.y) {
        this.activeDrag.currentY = cell.y;
        this.controller.setMappingValue(this.activeDrag.startX, cell.y);
      }
    } else {
      if (this.hoverCoord) {
        this.hoverCoord = null;
        this.renderCrosshair();
      }
    }
  }

  onPointerUp() {
    this.activeDrag = null;
  }

  toSvgCoords(e) {
    const rect = this.svg.getBoundingClientRect();
    const scaleX = this.width / (rect.width || 1);
    const scaleY = this.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }
}
