/**
 * CompositionGridView — Interactive Cartesian Coordinate Grid for Morphism Composition,
 * Commutative Path Equality (g ∘ f = h), Discrepancy Vectors, and Matrix Products.
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 */

import { CategoryMath } from '../../../js/foundations-core.js';

export class CompositionGridView {
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
      <div class="composition-grid-view" style="position: relative; width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; background: #090d16; padding: 12px; box-sizing: border-box;">
        
        <!-- View Status & Path Telemetry Banner -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
              Cartesian Path Composition Plane (A &times; C)
            </div>
            <div id="grid-comm-status" style="font-size: 1.05rem; font-weight: bold; color: #34d399;">
              g &comp; f = h (Commutative Coincidence)
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" id="btn-grid-sync-comm" class="btn text-xs px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700" style="border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; cursor: pointer;" title="Make h equal to g ∘ f">
              Sync h &coloneq; g &comp; f
            </button>
            <button type="button" id="btn-grid-perturb" class="btn text-xs px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700" style="border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; cursor: pointer;" title="Perturb h to break commutativity">
              Perturb h(3) &ne; (g&comp;f)(3)
            </button>
          </div>
        </div>

        <!-- Main SVG Coordinate Plane -->
        <div style="flex: 1; min-height: 260px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden;">
          <svg id="comp-grid-svg" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <filter id="comp-glow-target" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <marker id="comp-arrow-red" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
              </marker>
              <marker id="comp-arrow-green" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
            </defs>
            <g id="comp-grid-axes"></g>
            <g id="comp-grid-projections"></g>
            <g id="comp-grid-discrepancies"></g>
            <g id="comp-grid-points"></g>
          </svg>

          <!-- Floating Legend -->
          <div style="position: absolute; bottom: 8px; left: 12px; font-size: 0.72rem; color: #94a3b8; pointer-events: none; background: rgba(15, 23, 42, 0.85); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); display: flex; gap: 10px; align-items: center;">
            <span style="color: #38bdf8;">&#9679; Path 1: (g &comp; f)(a)</span>
            <span style="color: #fbbf24;">&#9679; Path 2: h(a)</span>
            <span style="color: #34d399;">&#9673; Coincident (Commutes)</span>
            <span style="color: #ef4444;">&ndash;&ndash;&gt; Discrepancy Vector (&Delta;)</span>
          </div>
        </div>

        <!-- Factor Morphism Incidence Grids -->
        <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          
          <!-- Subgrid f: A -> B -->
          <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: #38bdf8; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>f: A &rarr; B (Click to Edit)</span>
              <span style="color: #64748b; font-size: 0.7rem;">Domain A &times; Target B</span>
            </div>
            <div id="grid-f-table"></div>
          </div>

          <!-- Subgrid g: B -> C -->
          <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: #a78bfa; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>g: B &rarr; C (Click to Edit)</span>
              <span style="color: #64748b; font-size: 0.7rem;">Domain B &times; Target C</span>
            </div>
            <div id="grid-g-table"></div>
          </div>

          <!-- Subgrid h: A -> C -->
          <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: #fbbf24; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>h: A &rarr; C (Direct Morphism)</span>
              <span style="color: #64748b; font-size: 0.7rem;">Domain A &times; Target C</span>
            </div>
            <div id="grid-h-table"></div>
          </div>

        </div>

        <!-- Algebraic Matrix Multiplication Strip -->
        <div id="comp-matrix-algebra" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 12px; margin-top: 10px; font-family: monospace; font-size: 0.78rem; color: #cbd5e1; line-height: 1.5;"></div>

      </div>
    `;

    this.svg = this.container.querySelector('#comp-grid-svg');
    this.axesLayer = this.container.querySelector('#comp-grid-axes');
    this.projectionsLayer = this.container.querySelector('#comp-grid-projections');
    this.discrepanciesLayer = this.container.querySelector('#comp-grid-discrepancies');
    this.pointsLayer = this.container.querySelector('#comp-grid-points');

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

    // Quick sync & perturb buttons
    this.container.querySelector('#btn-grid-sync-comm')?.addEventListener('click', () => {
      this.controller.syncTriangleComposition();
    });

    this.container.querySelector('#btn-grid-perturb')?.addEventListener('click', () => {
      this.controller.perturbTriangleDirectMorphism();
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

  render() {
    if (!this.svg) return;
    const state = this.controller.state;
    const domainA = state.objectsA || [1, 2, 3];
    const codomainC = state.objectsC || [1, 2, 3];
    const morphismF = state.triangleF || [[1, 1], [2, 2], [3, 3]];
    const morphismG = state.triangleG || [[1, 1], [2, 2], [3, 3]];
    const morphismH = state.triangleH || [[1, 1], [2, 2], [3, 3]];

    const comparison = CategoryMath.comparePathCompositions(morphismF, morphismG, morphismH, domainA);
    const commutes = comparison.commutes;

    // Update Status Banner
    const statusText = this.container.querySelector('#grid-comm-status');
    if (statusText) {
      statusText.style.color = commutes ? '#34d399' : '#f87171';
      statusText.textContent = commutes
        ? 'g ∘ f = h (Commutative Coincidence: Paths Agree)'
        : `g ∘ f ≠ h (Discrepancy at element ${comparison.discrepancies.map(d => `a=${d.a}`).join(', ')})`;
    }

    // Geometry layout for Cartesian Grid
    const { startY, usableH } = this.getVisibleBounds();
    const marginL = 50;
    const marginR = 40;
    const marginT = 25;
    const marginB = 35;

    const availW = Math.max(160, this.width - marginL - marginR);
    const availH = Math.max(140, this.height - marginT - marginB);

    const lenA = domainA.length;
    const lenC = codomainC.length;

    const stepX = availW / (lenA + 1);
    const stepY = availH / (lenC + 1);

    const xToPx = (idx) => marginL + (idx + 1) * stepX;
    const yToPx = (idx) => marginT + availH - (idx + 1) * stepY;

    // 1. Render Grid Axes & Ticks
    let axesHtml = `
      <!-- Coordinate Origin & Axes Lines -->
      <line x1="${marginL}" y1="${marginT + availH}" x2="${marginL + availW}" y2="${marginT + availH}" stroke="#475569" stroke-width="1.5" />
      <line x1="${marginL}" y1="${marginT}" x2="${marginL}" y2="${marginT + availH}" stroke="#475569" stroke-width="1.5" />

      <!-- Horizontal Axis Label (Domain A) -->
      <text x="${marginL + availW / 2}" y="${marginT + availH + 28}" text-anchor="middle" fill="#38bdf8" font-size="12" font-weight="bold">
        Domain A (Source)
      </text>

      <!-- Vertical Axis Label (Target C) -->
      <text x="${marginL - 32}" y="${marginT + availH / 2}" text-anchor="middle" transform="rotate(-90 ${marginL - 32} ${marginT + availH / 2})" fill="#fbbf24" font-size="12" font-weight="bold">
        Target C (Codomain)
      </text>
    `;

    // Horizontal Ticks (Domain A)
    domainA.forEach((elem, i) => {
      const px = xToPx(i);
      axesHtml += `
        <line x1="${px}" y1="${marginT}" x2="${px}" y2="${marginT + availH}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,3" />
        <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${marginT + availH + 5}" stroke="#64748b" stroke-width="1.5" />
        <text x="${px}" y="${marginT + availH + 16}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="monospace">
          a${elem}
        </text>
      `;
    });

    // Vertical Ticks (Target C)
    codomainC.forEach((elem, j) => {
      const py = yToPx(j);
      axesHtml += `
        <line x1="${marginL}" y1="${py}" x2="${marginL + availW}" y2="${py}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,3" />
        <line x1="${marginL - 5}" y1="${py}" x2="${marginL}" y2="${py}" stroke="#64748b" stroke-width="1.5" />
        <text x="${marginL - 10}" y="${py + 4}" text-anchor="end" fill="#94a3b8" font-size="11" font-family="monospace">
          c${elem}
        </text>
      `;
    });

    this.axesLayer.innerHTML = axesHtml;

    // 2. Render Projections, Points & Discrepancies
    let projectionsHtml = '';
    let discrepanciesHtml = '';
    let pointsHtml = '';

    comparison.evaluations.forEach((evalItem, i) => {
      const px = xToPx(i);
      const targetGfaIdx = codomainC.indexOf(evalItem.gfa);
      const targetHaIdx = codomainC.indexOf(evalItem.ha);

      const pyGfa = targetGfaIdx >= 0 ? yToPx(targetGfaIdx) : marginT + availH / 2;
      const pyHa = targetHaIdx >= 0 ? yToPx(targetHaIdx) : marginT + availH / 2;

      if (evalItem.agrees) {
        // Paths coincide: g(f(a)) == h(a)
        projectionsHtml += `
          <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${pyHa}" stroke="rgba(52, 211, 153, 0.25)" stroke-dasharray="3,3" />
          <line x1="${marginL}" y1="${pyHa}" x2="${px}" y2="${pyHa}" stroke="rgba(52, 211, 153, 0.25)" stroke-dasharray="3,3" />
        `;

        pointsHtml += `
          <!-- Coincidence Target Ring -->
          <circle cx="${px}" cy="${pyHa}" r="11" fill="none" stroke="#10b981" stroke-width="2" opacity="0.8" filter="url(#comp-glow-target)" />
          <circle cx="${px}" cy="${pyHa}" r="5" fill="#10b981" />
          <text x="${px}" y="${pyHa - 14}" text-anchor="middle" fill="#34d399" font-size="10" font-weight="bold" font-family="monospace">
            ✓ g(f(${evalItem.a})) = h(${evalItem.a}) = ${evalItem.ha}
          </text>
        `;
      } else {
        // Discrepancy!
        projectionsHtml += `
          <!-- Path 1 Projection (Sky Cyan) -->
          <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${pyGfa}" stroke="rgba(56, 189, 248, 0.3)" stroke-dasharray="2,2" />
          <!-- Path 2 Projection (Amber Gold) -->
          <line x1="${px}" y1="${marginT + availH}" x2="${px}" y2="${pyHa}" stroke="rgba(251, 191, 36, 0.3)" stroke-dasharray="2,2" />
        `;

        // Discrepancy Vector connecting the two points
        discrepanciesHtml += `
          <line x1="${px}" y1="${pyGfa}" x2="${px}" y2="${pyHa}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,3" style="marker-end: url(#comp-arrow-red);" />
          <text x="${px + 8}" y="${(pyGfa + pyHa) / 2 + 4}" fill="#f87171" font-size="10" font-weight="bold" font-family="monospace">
            &Delta; &ne; 0 (${evalItem.gfa} &ne; ${evalItem.ha})
          </text>
        `;

        // Path 1 Point (Sky Cyan)
        pointsHtml += `
          <circle cx="${px}" cy="${pyGfa}" r="6" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />
          <text x="${px - 8}" y="${pyGfa - 8}" text-anchor="end" fill="#38bdf8" font-size="10" font-family="monospace">
            (g∘f)(${evalItem.a})=${evalItem.gfa}
          </text>
        `;

        // Path 2 Point (Amber Gold)
        pointsHtml += `
          <circle cx="${px}" cy="${pyHa}" r="6" fill="#d97706" stroke="#fbbf24" stroke-width="2" />
          <text x="${px - 8}" y="${pyHa + 14}" text-anchor="end" fill="#fbbf24" font-size="10" font-family="monospace">
            h(${evalItem.a})=${evalItem.ha}
          </text>
        `;
      }
    });

    this.projectionsLayer.innerHTML = projectionsHtml;
    this.discrepanciesLayer.innerHTML = discrepanciesHtml;
    this.pointsLayer.innerHTML = pointsHtml;

    // 3. Render Morphism Factor Tables (f, g, h)
    this.renderSubgridTable('#grid-f-table', 'f', domainA, state.objectsB || [1, 2, 3], morphismF, '#38bdf8');
    this.renderSubgridTable('#grid-g-table', 'g', state.objectsB || [1, 2, 3], codomainC, morphismG, '#a78bfa');
    this.renderSubgridTable('#grid-h-table', 'h', domainA, codomainC, morphismH, '#fbbf24');

    // 4. Render Algebraic Matrix Multiplication Strip
    this.renderMatrixAlgebra(morphismF, morphismG, morphismH, domainA, state.objectsB || [1, 2, 3], codomainC, commutes);
  }

  renderSubgridTable(selector, mapName, domain, codomain, pairs, accentColor) {
    const el = this.container.querySelector(selector);
    if (!el) return;

    const map = new Map(pairs);

    let html = `
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.72rem; font-family: monospace;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <th style="padding: 4px; color: #64748b;">${mapName}\\x</th>
            ${domain.map(x => `<th style="padding: 4px; color: #94a3b8;">${x}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    codomain.forEach(y => {
      html += `<tr>`;
      html += `<td style="padding: 4px; color: #64748b; font-weight: bold;">${y}</td>`;
      domain.forEach(x => {
        const isActive = map.get(x) === y;
        const bg = isActive ? `${accentColor}33` : 'rgba(255,255,255,0.02)';
        const border = isActive ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.04)';
        const color = isActive ? accentColor : '#475569';
        html += `
          <td style="padding: 4px;">
            <button type="button" data-morphism="${mapName}" data-src="${x}" data-tgt="${y}"
              style="width: 22px; height: 22px; line-height: 20px; text-align: center; border-radius: 3px; background: ${bg}; border: ${border}; color: ${color}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer; transition: all 0.15s ease;">
              ${isActive ? '1' : '0'}
            </button>
          </td>
        `;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    el.innerHTML = html;

    // Attach click handlers to toggle/set mapping
    el.querySelectorAll('button[data-morphism]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const morphism = e.currentTarget.dataset.morphism;
        const src = parseInt(e.currentTarget.dataset.src, 10);
        const tgt = parseInt(e.currentTarget.dataset.tgt, 10);
        this.controller.setTriangleMapping(morphism, src, tgt);
      });
    });
  }

  renderMatrixAlgebra(morphismF, morphismG, morphismH, domainA, domainB, domainC, commutes) {
    const el = this.container.querySelector('#comp-matrix-algebra');
    if (!el) return;

    const matF = CategoryMath.computeMorphismMatrix(morphismF, domainA, domainB);
    const matG = CategoryMath.computeMorphismMatrix(morphismG, domainB, domainC);
    const matComp = CategoryMath.multiplyMorphismMatrices(matF, matG);
    const matH = CategoryMath.computeMorphismMatrix(morphismH, domainA, domainC);

    const formatMatrix = (mat, color) => `
      <span style="display: inline-block; vertical-align: middle; border-left: 2px solid ${color}; border-right: 2px solid ${color}; padding: 0 4px; margin: 0 4px;">
        ${mat.map(row => row.join(' ')).join('<br/>')}
      </span>
    `;

    el.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="color: #94a3b8;">Matrix Composition:</span>
          <strong>M<sub>f</sub></strong> ${formatMatrix(matF, '#38bdf8')}
          &times;
          <strong>M<sub>g</sub></strong> ${formatMatrix(matG, '#a78bfa')}
          =
          <strong>M<sub>g∘f</sub></strong> ${formatMatrix(matComp, '#34d399')}
        </div>
        <div>
          <span style="color: #94a3b8;">Direct Path:</span>
          <strong>M<sub>h</sub></strong> ${formatMatrix(matH, '#fbbf24')}
          <span class="axiom-badge ${commutes ? 'is-valid' : 'is-violated'}" style="margin-left: 8px; font-size: 0.72rem;">
            ${commutes ? 'M_{g∘f} = M_h (Strict Equality)' : 'M_{g∘f} ≠ M_h (Matrix Mismatch)'}
          </span>
        </div>
      </div>
    `;
  }
}
