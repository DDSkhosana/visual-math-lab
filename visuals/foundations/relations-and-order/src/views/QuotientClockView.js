/**
 * QuotientClockView — Equivalence Partitions & Modular Clock Z/nZ
 * Visual Mathematics Lab — Module 2: Relations, Order & Equivalence
 */

import { RelationMath } from '../../../js/foundations-core.js';

export class QuotientClockView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.modulus = 4;
    this.activeClass = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="quotient-clock-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        <!-- Top: Partition Classes Readout -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: #e2e8f0;">
            Equivalence Classes &amp; Quotient Set A / ~
          </h4>
          <div id="quotient-classes-pills" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0;"></div>
          <div id="partition-theorem-status" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5;"></div>
        </div>

        <!-- Bottom: Modular Arithmetic Clock Ring -->
        <div style="flex: 1; min-height: 280px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; font-size: 0.85rem; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">
              Modular Arithmetic Clock Dial: ℤ / nℤ
            </h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="modulus-slider" style="font-size: 0.8rem; color: #94a3b8;">Modulus n:</label>
              <input type="range" id="modulus-slider" min="2" max="12" value="4" style="width: 100px; cursor: pointer;">
              <span id="modulus-display" style="font-weight: bold; color: #38bdf8; font-size: 0.9rem; min-width: 20px;">4</span>
            </div>
          </div>

          <div style="flex: 1; position: relative; min-height: 220px; display: flex; align-items: center; justify-content: center;">
            <svg id="modular-clock-svg" viewBox="0 0 400 300" style="width: 100%; height: 100%; max-height: 280px; display: block;">
              <defs>
                <filter id="clock-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <g id="clock-ring-layer"></g>
              <g id="clock-ticks-layer"></g>
              <g id="clock-classes-layer"></g>
            </svg>
          </div>

          <div id="modular-congruence-readout" style="margin-top: 8px; font-family: monospace; font-size: 0.82rem; color: #cbd5e1; text-align: center;">
            Click any remainder hour mark [r] to isolate its equivalence class.
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    const slider = this.container.querySelector('#modulus-slider');
    slider?.addEventListener('input', (e) => {
      this.modulus = parseInt(e.target.value, 10);
      const disp = this.container.querySelector('#modulus-display');
      if (disp) disp.textContent = this.modulus;
      this.activeClass = null;
      this.render();
    });
  }

  render() {
    const state = this.controller.state;
    const analysis = RelationMath.analyzeRelation(state.elements, state.pairs);

    this.renderPartitionSummary(state, analysis);
    this.renderModularClock();
  }

  renderPartitionSummary(state, analysis) {
    const pillsContainer = this.container.querySelector('#quotient-classes-pills');
    const statusText = this.container.querySelector('#partition-theorem-status');
    if (!pillsContainer || !statusText) return;

    if (!analysis.isEquivalence) {
      pillsContainer.innerHTML = `
        <div style="color: #f87171; font-size: 0.82rem; padding: 6px 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px;">
          Current relation is not an Equivalence Relation (must be Reflexive, Symmetric, and Transitive).
        </div>
      `;
      statusText.innerHTML = `
        A partition into quotient classes $[a]$ only forms when $\\sim$ is an equivalence relation. Select the <em>Equivalence</em> preset to see the Partition Theorem in action.
      `;
      return;
    }

    const classes = RelationMath.computeEquivalenceClasses(state.elements, state.pairs);

    pillsContainer.innerHTML = classes.map((cls, idx) => `
      <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 20px; padding: 4px 12px; font-size: 0.82rem; color: #bae6fd; font-family: monospace;">
        <strong>[${cls[0]}]</strong> = { ${cls.join(', ')} }
      </div>
    `).join('');

    statusText.innerHTML = `
      <strong>Partition Theorem holds:</strong> The ${classes.length} equivalence classes form a true partition of $A$: they are pairwise disjoint ($[a] \\neq [b] \\implies [a] \\cap [b] = \\emptyset$) and their union covers all of $A$.
    `;
  }

  renderModularClock() {
    const svg = this.container.querySelector('#modular-clock-svg');
    const ringLayer = this.container.querySelector('#clock-ring-layer');
    const ticksLayer = this.container.querySelector('#clock-ticks-layer');
    const classesLayer = this.container.querySelector('#clock-classes-layer');
    if (!svg || !ringLayer) return;

    const n = this.modulus;
    const cx = 200;
    const cy = 140;
    const r = 85;

    // Draw Clock Ring
    ringLayer.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="3" />
      <circle cx="${cx}" cy="${cy}" r="3" fill="#64748b" />
    `;

    // Draw Remainder Ticks 0, 1, ..., n - 1
    let ticksHtml = '';
    let classesHtml = '';

    for (let k = 0; k < n; k++) {
      const angle = (k / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      const isSelected = this.activeClass === k;
      const fillColor = isSelected ? '#38bdf8' : '#1e293b';
      const strokeColor = isSelected ? '#ffffff' : '#38bdf8';

      ticksHtml += `
        <g class="clock-tick-group" data-remainder="${k}" style="cursor: pointer;">
          <circle cx="${x}" cy="${y}" r="16" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isSelected ? 3 : 2}" />
          <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">${k}</text>
        </g>
      `;

      // Draw congruent integers along radial lines outward
      if (isSelected || this.activeClass === null) {
        const sampleIntegers = [k - 2 * n, k - n, k, k + n, k + 2 * n];
        const outDist = r + 36;
        const lx = cx + outDist * Math.cos(angle);
        const ly = cy + outDist * Math.sin(angle);

        if (isSelected) {
          classesHtml += `
            <text x="${lx}" y="${ly}" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="bold">
              [${k}] = { ... ${sampleIntegers.join(', ')} ... }
            </text>
          `;
        }
      }
    }

    ticksLayer.innerHTML = ticksHtml;
    classesLayer.innerHTML = classesHtml;

    // Attach click events to remainder ticks
    this.container.querySelectorAll('.clock-tick-group').forEach(tick => {
      tick.addEventListener('click', (e) => {
        const rem = parseInt(tick.dataset.remainder, 10);
        this.activeClass = this.activeClass === rem ? null : rem;
        this.renderModularClock();
        this.updateCongruenceReadout();
      });
    });

    this.updateCongruenceReadout();
  }

  updateCongruenceReadout() {
    const readout = this.container.querySelector('#modular-congruence-readout');
    if (!readout) return;

    const n = this.modulus;
    if (this.activeClass === null) {
      readout.innerHTML = `ℤ/${n}ℤ has exactly <strong>${n}</strong> equivalence classes: {[0], [1], ..., [${n - 1}]}. Click a remainder hour mark.`;
    } else {
      const r = this.activeClass;
      readout.innerHTML = `
        <strong>Equivalence Class [${r}] mod ${n}:</strong> Any two integers $a, b \\in [${r}]$ satisfy $a \\equiv b \\pmod{${n}} \\iff ${n} \\mid (a - b)$.
      `;
    }
  }
}
