/**
 * CauchyCycleView — Dual-Form Cauchy Two-Row Matrix & Disjoint Cycle Orbits
 * Visual Mathematics Lab — Module 3: Permutations & Symmetric Groups S_n
 */

import { PermutationMath } from '../../../js/foundations-core.js';

export class CauchyCycleView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.orbitStep = 0;
    this.selectedNode = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="cauchy-cycle-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 14px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Top: Cauchy Two-Row Matrix & Cycle Formula -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
          <!-- Two-Row Cauchy Matrix -->
          <div>
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Cauchy Two-Row Matrix Notation <span style="font-size: 0.7rem; color: #64748b; font-weight: normal;">(Click entry to cycle)</span>
            </div>
            <div id="cauchy-matrix-mount" style="font-family: monospace; font-size: 1.1rem; color: #ffffff;"></div>
          </div>

          <!-- Disjoint Cycle Formula & Order -->
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Disjoint Cycle Form &amp; Order
            </div>
            <div id="cycle-notation-display" style="font-family: monospace; font-size: 1.25rem; font-weight: bold; color: #38bdf8;">
              (1 2 3)
            </div>
            <div id="order-telemetry" style="font-size: 0.8rem; color: #bae6fd; margin-top: 4px;">
              Order: lcm(3) = 3
            </div>
          </div>
        </div>

        <!-- Center: Cycle Orbits Graph -->
        <div style="flex: 1; min-height: 240px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="cycle-orbits-svg" viewBox="0 0 500 240" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <marker id="cycle-arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
            </defs>
            <g id="cycle-orbits-layer"></g>
          </svg>
          <div style="position: absolute; bottom: 6px; left: 10px; font-size: 0.7rem; color: #64748b; pointer-events: none;">
            Click 2 nodes in the orbit graph to apply transposition swap (i j).
          </div>
        </div>

        <!-- Bottom: Orbit Stepper Controls -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: monospace; font-size: 0.85rem; color: #cbd5e1;">
            Current Orbit Application: <strong id="orbit-power-label" style="color: #38bdf8;">σ⁰ = id</strong>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn" id="btn-step-orbit" style="padding: 5px 12px; font-size: 0.8rem;">
              Step Orbit (σᵏ⁺¹) &rarr;
            </button>
            <button type="button" class="btn" id="btn-reset-orbit" style="padding: 5px 10px; font-size: 0.8rem;">
              Reset Orbit
            </button>
          </div>
        </div>

      </div>
    `;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    this.container.querySelector('#btn-step-orbit')?.addEventListener('click', () => {
      this.stepOrbit();
    });
    this.container.querySelector('#btn-reset-orbit')?.addEventListener('click', () => {
      this.orbitStep = 0;
      this.render();
    });

    // Delegated click for orbit nodes and matrix cells
    this.container.addEventListener('click', (e) => {
      // 1. Matrix cell click
      const cell = e.target.closest('.cauchy-cell');
      if (cell) {
        const col = parseInt(cell.dataset.col, 10);
        const state = this.controller.state;
        const currentTarget = state.mapping[col - 1];
        const nextTarget = (currentTarget % state.n) + 1;
        this.controller.setMappingValue(col, nextTarget);
        return;
      }

      // 2. Orbit node click
      const nodeGroup = e.target.closest('.orbit-node-group');
      if (nodeGroup) {
        const elem = parseInt(nodeGroup.dataset.elem, 10);
        if (!this.selectedNode) {
          this.selectedNode = elem;
          this.render();
        } else if (this.selectedNode === elem) {
          this.selectedNode = null;
          this.render();
        } else {
          const nodeA = this.selectedNode;
          const nodeB = elem;
          this.selectedNode = null;
          this.controller.applyTransposition(nodeA, nodeB);
        }
      }
    });
  }

  stepOrbit() {
    const state = this.controller.state;
    const cycles = PermutationMath.toCycleNotation(state.mapping);
    const order = PermutationMath.computeOrder(cycles);
    this.orbitStep = (this.orbitStep + 1) % (order + 1);
    this.render();
  }

  render() {
    const state = this.controller.state;
    const n = state.n;
    const mapping = state.mapping; // 1-indexed images: mapping[i] is image of (i + 1)

    // 1. Cauchy Two-Row Matrix
    const matrixMount = this.container.querySelector('#cauchy-matrix-mount');
    if (matrixMount) {
      let topRow = '';
      let botRow = '';
      for (let i = 0; i < n; i++) {
        topRow += `<td style="padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.2); color: #94a3b8;">${i + 1}</td>`;
        botRow += `<td class="cauchy-cell" data-col="${i + 1}" style="padding: 4px 8px; color: #38bdf8; font-weight: bold; cursor: pointer; user-select: none;" title="Click to cycle mapping for input ${i + 1}">${mapping[i]}</td>`;
      }
      matrixMount.innerHTML = `
        <div style="display: inline-flex; align-items: center;">
          <span style="font-size: 1.8rem; font-weight: 300; line-height: 1; color: #64748b; margin-right: 2px;">(</span>
          <table style="border-collapse: collapse; text-align: center;">
            <tr>${topRow}</tr>
            <tr>${botRow}</tr>
          </table>
          <span style="font-size: 1.8rem; font-weight: 300; line-height: 1; color: #64748b; margin-left: 2px;">)</span>
        </div>
      `;
    }

    // 2. Disjoint Cycle Notation & Order
    const cycles = PermutationMath.toCycleNotation(mapping);
    const cycleDisplay = this.container.querySelector('#cycle-notation-display');
    const orderTel = this.container.querySelector('#order-telemetry');
    const order = PermutationMath.computeOrder(cycles);

    if (cycleDisplay) {
      cycleDisplay.textContent = PermutationMath.formatCycles(cycles);
    }
    if (orderTel) {
      const lengths = cycles.map(c => c.length);
      const lcmText = lengths.length > 0 ? `lcm(${lengths.join(', ')}) = ${order}` : '1 (identity)';
      orderTel.innerHTML = `Order: <strong>${lcmText}</strong> (since &sigma;<sup>${order}</sup> = id)`;
    }

    // 3. Orbits Polygon Visualizer
    this.renderOrbitsSvg(cycles, n, mapping);

    // 4. Stepper Power Label
    const powerLabel = this.container.querySelector('#orbit-power-label');
    if (powerLabel) {
      if (this.orbitStep === 0) {
        powerLabel.textContent = `σ⁰ = id (Initial State)`;
      } else if (this.orbitStep === order) {
        powerLabel.textContent = `σ${this.orbitStep} = id (Orbit Cycle Closed!)`;
      } else {
        powerLabel.textContent = `σ${this.orbitStep} (Application ${this.orbitStep} of ${order})`;
      }
    }
  }

  renderOrbitsSvg(cycles, n, mapping) {
    const layer = this.container.querySelector('#cycle-orbits-layer');
    if (!layer) return;

    // Layout cycles horizontally
    const width = 500;
    const height = 260;
    const numCycles = Math.max(1, cycles.length);
    const cycleSpacing = width / (numCycles + 1);

    let html = '';

    cycles.forEach((cycle, cIdx) => {
      const cx = (cIdx + 1) * cycleSpacing;
      const cy = height / 2;
      const r = Math.min(65, (cycleSpacing * 0.42));
      const k = cycle.length;

      // Draw cycle nodes along circle
      const nodePos = cycle.map((elem, idx) => {
        const angle = (idx / k) * Math.PI * 2 - Math.PI / 2;
        return {
          elem,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle)
        };
      });

      // Draw oriented arrows
      for (let i = 0; i < k; i++) {
        const p1 = nodePos[i];
        const p2 = nodePos[(i + 1) % k];

        if (k === 1) {
          // Fixed point
          html += `<circle cx="${p1.x}" cy="${p1.y}" r="16" fill="#1e293b" stroke="#64748b" stroke-width="2" />`;
        } else if (k === 2) {
          // 2-cycle transposition swap
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const curve = 14;
          html += `
            <path d="M ${p1.x} ${p1.y} Q ${midX} ${midY - curve} ${p2.x} ${p2.y}" fill="none" stroke="#38bdf8" stroke-width="2.2" style="marker-end: url(#cycle-arrow);" />
            <path d="M ${p2.x} ${p2.y} Q ${midX} ${midY + curve} ${p1.x} ${p1.y}" fill="none" stroke="#38bdf8" stroke-width="2.2" style="marker-end: url(#cycle-arrow);" />
          `;
        } else {
          // Curved polygon perimeter
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          const perpX = -dy / len;
          const perpY = dx / len;
          const ctrlX = midX + perpX * 10;
          const ctrlY = midY + perpY * 10;

          html += `
            <path d="M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}" fill="none" stroke="#38bdf8" stroke-width="2.2" style="marker-end: url(#cycle-arrow);" />
          `;
        }
      }

      // Draw node circles
      nodePos.forEach(p => {
        const isSelected = this.selectedNode === p.elem;
        const strokeColor = isSelected ? '#fbbf24' : '#38bdf8';
        const strokeWidth = isSelected ? '3.5' : '2.5';
        const halo = isSelected ? `<circle r="22" fill="#fbbf24" opacity="0.25" />` : '';

        html += `
          <g class="orbit-node-group" data-elem="${p.elem}" transform="translate(${p.x}, ${p.y})" style="cursor: pointer;">
            ${halo}
            <circle r="16" fill="#0f172a" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
            <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">${p.elem}</text>
          </g>
        `;
      });
    });

    layer.innerHTML = html;
  }
}
