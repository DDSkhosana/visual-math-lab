/**
 * FunctionGridView — Interactive Cartesian Coordinate Grid (X × Y)
 * for Discrete Functions, Vertical Line Test, and Horizontal Line Test.
 * Visual Mathematics Lab — Module 1: Functions, Inverses & Reversibility
 */

import { FunctionMath } from '../../../js/foundations-core.js';

export class FunctionGridView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.svg = null;
    this.width = 0;
    this.height = 0;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="function-grid-view" style="position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; background: #090d16; padding: 12px; box-sizing: border-box;">
        
        <!-- Top Status Bar: Line Tests -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
              Discrete Cartesian Coordinate Grid (X &times; Y)
            </div>
            <div id="fn-grid-test-status" style="font-size: 0.95rem; font-weight: bold; color: #34d399;">
              Vertical Line Test: PASSED &nbsp;|&nbsp; Function Well-Defined
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" id="btn-grid-make-bijection" class="btn text-xs px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700" style="border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; cursor: pointer;">
              Reset Bijection
            </button>
          </div>
        </div>

        <!-- Main SVG Coordinate Grid -->
        <div style="flex: 1; min-height: 250px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden;">
          <svg id="fn-grid-svg" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <filter id="fn-glow-dot" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="fn-grid-axes"></g>
            <g id="fn-grid-tests"></g>
            <g id="fn-grid-points"></g>
          </svg>

          <!-- Floating Legend -->
          <div style="position: absolute; bottom: 8px; left: 12px; font-size: 0.72rem; color: #94a3b8; pointer-events: none; background: rgba(15, 23, 42, 0.85); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); display: flex; gap: 10px; align-items: center;">
            <span style="color: #38bdf8;">&#9632; Horizontal: Domain X</span>
            <span style="color: #f472b6;">&#9632; Vertical: Codomain Y</span>
            <span style="color: #34d399;">&#9679; (x, f(x))</span>
            <span style="color: #cbd5e1;">Click cell to set mapping f(x) = y</span>
          </div>
        </div>

      </div>
    `;

    this.svg = this.container.querySelector('#fn-grid-svg');
    this.axesLayer = this.container.querySelector('#fn-grid-axes');
    this.testsLayer = this.container.querySelector('#fn-grid-tests');
    this.pointsLayer = this.container.querySelector('#fn-grid-points');

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

    this.container.querySelector('#btn-grid-make-bijection')?.addEventListener('click', () => {
      this.controller.applyPreset('bijection');
    });

    // Pointer click on grid to toggle/reassign mapping
    this.svg.addEventListener('click', (e) => this.onSvgClick(e));
  }

  getVisibleBounds() {
    const explorer = this.container.closest('.circle-explorer');
    let bottomInset = 0;
    let topInset = 0;
    if (explorer) {
      const isDockBottom = explorer.getAttribute('data-dock-edge') === 'bottom' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockBottom) {
        const dockEl = explorer.querySelector('.workspace-dock');
        bottomInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 300) : 0;
      }
      const isDockTop = explorer.getAttribute('data-dock-edge') === 'top' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockTop) {
        const dockEl = explorer.querySelector('.workspace-dock');
        topInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 260) : 0;
      }
    }
    const usableH = Math.max(220, (this.height || 360) - bottomInset - topInset);
    const startY = topInset;
    return { topInset, bottomInset, usableH, startY };
  }

  resize() {
    if (!this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    this.width = rect.width || 460;
    this.height = rect.height || 260;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.render();
  }

  getLayoutGeometry() {
    const domain = this.controller.state.domain;
    const codomain = this.controller.state.codomain;
    const { startY, usableH } = this.getVisibleBounds();

    const marginL = 55;
    const marginR = 35;
    const marginT = 25;
    const marginB = 35;

    const availW = Math.max(160, this.width - marginL - marginR);
    const availH = Math.max(140, this.height - marginT - marginB);

    const stepX = availW / (domain.length + 1);
    const stepY = availH / (codomain.length + 1);

    const xToPx = (idx) => marginL + (idx + 1) * stepX;
    const yToPx = (idx) => marginT + availH - (idx + 1) * stepY;

    return { marginL, marginR, marginT, marginB, availW, availH, stepX, stepY, xToPx, yToPx };
  }

  onSvgClick(e) {
    const rect = this.svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const domain = this.controller.state.domain;
    const codomain = this.controller.state.codomain;
    const { xToPx, yToPx } = this.getLayoutGeometry();

    // Find closest cell
    let closestX = null;
    let closestY = null;
    let minDist = 30; // Threshold

    domain.forEach((dVal, i) => {
      const px = xToPx(i);
      codomain.forEach((cVal, j) => {
        const py = yToPx(j);
        const dist = Math.hypot(clickX - px, clickY - py);
        if (dist < minDist) {
          minDist = dist;
          closestX = dVal;
          closestY = cVal;
        }
      });
    });

    if (closestX !== null && closestY !== null) {
      this.controller.setMapping(closestX, closestY);
    }
  }

  render() {
    if (!this.svg) return;
    const state = this.controller.state;
    const domain = state.domain;
    const codomain = state.codomain;
    const pairs = state.pairs;

    const { marginL, marginT, availW, availH, xToPx, yToPx } = this.getLayoutGeometry();

    // Evaluate function properties
    const fMap = new Map();
    const colCounts = new Map();
    const rowCounts = new Map();

    domain.forEach(x => colCounts.set(x, 0));
    codomain.forEach(y => rowCounts.set(y, 0));

    pairs.forEach(([x, y]) => {
      colCounts.set(x, (colCounts.get(x) || 0) + 1);
      rowCounts.set(y, (rowCounts.get(y) || 0) + 1);
    });

    const isTotal = domain.every(x => colCounts.get(x) >= 1);
    const isSingleValued = domain.every(x => colCounts.get(x) <= 1);
    const isWellDefined = isTotal && isSingleValued;

    const isInjective = codomain.every(y => rowCounts.get(y) <= 1);
    const isSurjective = codomain.every(y => rowCounts.get(y) >= 1);
    const isBijective = isWellDefined && isInjective && isSurjective;

    // Update Status Banner
    const statusText = this.container.querySelector('#fn-grid-test-status');
    if (statusText) {
      if (!isWellDefined) {
        statusText.style.color = '#f87171';
        statusText.textContent = !isTotal
          ? 'Vertical Line Test: FAILED (Partial mapping: missing input output)'
          : 'Vertical Line Test: FAILED (Multivalued: input maps to multiple outputs)';
      } else if (isBijective) {
        statusText.style.color = '#34d399';
        statusText.textContent = 'Vertical & Horizontal Line Tests: PASSED (Bijective & Invertible ≅)';
      } else if (isInjective) {
        statusText.style.color = '#38bdf8';
        statusText.textContent = 'Horizontal Line Test: INJECTIVE (One-to-One, Unhit targets present)';
      } else if (isSurjective) {
        statusText.style.color = '#a78bfa';
        statusText.textContent = 'Horizontal Line Test: SURJECTIVE (Onto, Collisions present)';
      } else {
        statusText.style.color = '#fbbf24';
        statusText.textContent = 'Vertical Line Test: PASSED (Neither Injective nor Surjective)';
      }
    }

    // 1. Grid Axes & Ticks
    let axesHtml = `
      <!-- Axes Lines -->
      <line x1="${marginL}" y1="${marginT + availH}" x2="${marginL + availW}" y2="${marginT + availH}" stroke="#475569" stroke-width="1.5" />
      <line x1="${marginL}" y1="${marginT}" x2="${marginL}" y2="${marginT + availH}" stroke="#475569" stroke-width="1.5" />

      <!-- Horizontal Axis Label (Domain X) -->
      <text x="${marginL + availW / 2}" y="${marginT + availH + 28}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="bold">
        Domain X (Input)
      </text>

      <!-- Vertical Axis Label (Codomain Y) -->
      <text x="${marginL - 34}" y="${marginT + availH / 2}" text-anchor="middle" transform="rotate(-90 ${marginL - 34} ${marginT + availH / 2})" fill="#f472b6" font-size="12" font-weight="bold">
        Codomain Y (Output)
      </text>
    `;

    // Horizontal Ticks (Domain X)
    domain.forEach((elem, i) => {
      const px = xToPx(i);
      axesHtml += `
        <line x1="${px}" y1="${marginT}" x2="${px}" y2="${marginT + availH}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,3" />
        <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${marginT + availH + 5}" stroke="#64748b" stroke-width="1.5" />
        <text x="${px}" y="${marginT + availH + 16}" text-anchor="middle" fill="#38bdf8" font-size="11" font-family="monospace">
          ${elem}
        </text>
      `;
    });

    // Vertical Ticks (Codomain Y)
    codomain.forEach((elem, j) => {
      const py = yToPx(j);
      axesHtml += `
        <line x1="${marginL}" y1="${py}" x2="${marginL + availW}" y2="${py}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,3" />
        <line x1="${marginL - 5}" y1="${py}" x2="${marginL}" y2="${py}" stroke="#64748b" stroke-width="1.5" />
        <text x="${marginL - 10}" y="${py + 4}" text-anchor="end" fill="#f472b6" font-size="11" font-family="monospace">
          ${elem}
        </text>
      `;
    });

    this.axesLayer.innerHTML = axesHtml;

    // 2. Line Test Visual Overlays
    let testsHtml = '';

    // Vertical line tests per column
    domain.forEach((elem, i) => {
      const px = xToPx(i);
      const count = colCounts.get(elem);
      if (count === 0) {
        // Missing value: red column ray
        testsHtml += `
          <line x1="${px}" y1="${marginT}" x2="${px}" y2="${marginT + availH}" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,3" opacity="0.6" />
          <text x="${px}" y="${marginT - 6}" text-anchor="middle" fill="#f87171" font-size="10" font-weight="bold">∄y</text>
        `;
      } else if (count > 1) {
        // Multivalued: red collision column
        testsHtml += `
          <line x1="${px}" y1="${marginT}" x2="${px}" y2="${marginT + availH}" stroke="#ef4444" stroke-width="2.5" opacity="0.75" />
          <text x="${px}" y="${marginT - 6}" text-anchor="middle" fill="#f87171" font-size="10" font-weight="bold">Multi ∃!</text>
        `;
      }
    });

    // Horizontal line tests per row
    codomain.forEach((elem, j) => {
      const py = yToPx(j);
      const count = rowCounts.get(elem);
      if (count > 1) {
        // Collision row: multiple inputs hit this output
        testsHtml += `
          <line x1="${marginL}" y1="${py}" x2="${marginL + availW}" y2="${py}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6" />
          <text x="${marginL + availW + 8}" y="${py + 3}" fill="#fbbf24" font-size="10">Collision (${count})</text>
        `;
      } else if (count === 0) {
        testsHtml += `
          <text x="${marginL + availW + 8}" y="${py + 3}" fill="#64748b" font-size="9">Unhit</text>
        `;
      }
    });

    this.testsLayer.innerHTML = testsHtml;

    // 3. Grid Points & Interactive Hit Targets
    let pointsHtml = '';

    // Render faint hit target dots for all cells
    domain.forEach((dVal, i) => {
      const px = xToPx(i);
      codomain.forEach((cVal, j) => {
        const py = yToPx(j);
        pointsHtml += `
          <circle cx="${px}" cy="${py}" r="4" fill="rgba(255,255,255,0.06)" style="cursor: pointer;" />
        `;
      });
    });

    // Render active mapping points
    pairs.forEach(([xVal, yVal]) => {
      const xIdx = domain.indexOf(xVal);
      const yIdx = codomain.indexOf(yVal);
      if (xIdx >= 0 && yIdx >= 0) {
        const px = xToPx(xIdx);
        const py = yToPx(yIdx);

        pointsHtml += `
          <!-- Drop Projections -->
          <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${py}" stroke="rgba(56, 189, 248, 0.3)" stroke-dasharray="2,2" />
          <line x1="${marginL}" y1="${py}" x2="${px}" y2="${py}" stroke="rgba(244, 114, 182, 0.3)" stroke-dasharray="2,2" />

          <!-- Active Coordinate Point -->
          <circle cx="${px}" cy="${py}" r="9" fill="none" stroke="#38bdf8" stroke-width="1.5" filter="url(#fn-glow-dot)" />
          <circle cx="${px}" cy="${py}" r="5" fill="#38bdf8" style="cursor: pointer;" />
          <text x="${px}" y="${py - 12}" text-anchor="middle" fill="#f8fafc" font-size="10" font-weight="bold" font-family="monospace">
            (${xVal}, ${yVal})
          </text>
        `;
      }
    });

    this.pointsLayer.innerHTML = pointsHtml;
  }
}
