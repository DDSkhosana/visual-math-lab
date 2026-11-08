/**
 * MonoEpiProbeView — Interactive Cancellation Probe Test Bench (Monic & Epic)
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 */

import { CategoryMath } from '../../../js/foundations-core.js';

export class MonoEpiProbeView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.probeType = 'monic'; // 'monic' | 'epic'

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="probe-bench-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Top: Probe Selector & Result Status -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Categorical Probe Cancellation Machine
            </div>
            <div id="probe-cancellation-result" style="font-size: 1.15rem; font-weight: bold; color: #34d399;">
              Left-Cancellation Holds (Monic / Injective)
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn active" id="btn-probe-monic" style="padding: 6px 12px; font-size: 0.8rem;">
              Monomorphism Test (f ∘ g₁ = f ∘ g₂)
            </button>
            <button type="button" class="btn" id="btn-probe-epic" style="padding: 6px 12px; font-size: 0.8rem;">
              Epimorphism Test (h₁ ∘ f = h₂ ∘ f)
            </button>
          </div>
        </div>

        <!-- Center: Interactive Cancellation Diagram SVG -->
        <div style="flex: 1; min-height: 280px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="probe-svg" viewBox="0 0 540 280" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <marker id="probe-arrow-blue" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="probe-arrow-rose" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ec4899" />
              </marker>
              <marker id="probe-arrow-amber" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
              </marker>
            </defs>
            <g id="probe-arrows-layer"></g>
            <g id="probe-objects-layer"></g>
          </svg>
        </div>

        <!-- Bottom: Witness Proof Telemetry -->
        <div id="probe-witness-telemetry" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-top: 12px; font-family: monospace; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;"></div>

      </div>
    `;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    this.container.querySelector('#btn-probe-monic')?.addEventListener('click', (e) => {
      this.probeType = 'monic';
      this.container.querySelector('#btn-probe-monic')?.classList.add('active');
      this.container.querySelector('#btn-probe-epic')?.classList.remove('active');
      this.render();
    });

    this.container.querySelector('#btn-probe-epic')?.addEventListener('click', (e) => {
      this.probeType = 'epic';
      this.container.querySelector('#btn-probe-epic')?.classList.add('active');
      this.container.querySelector('#btn-probe-monic')?.classList.remove('active');
      this.render();
    });
  }

  render() {
    const svg = this.container.querySelector('#probe-svg');
    const arrowsLayer = this.container.querySelector('#probe-arrows-layer');
    const objectsLayer = this.container.querySelector('#probe-objects-layer');
    const resultBanner = this.container.querySelector('#probe-cancellation-result');
    const witnessTel = this.container.querySelector('#probe-witness-telemetry');
    if (!svg || !arrowsLayer) return;

    const state = this.controller.state;

    if (this.probeType === 'monic') {
      // Monomorphism probe test: W -> X via g1, g2; X -> Y via f
      const X = state.domainX || [1, 2, 3];
      const Y = state.codomainY || ['a', 'b', 'c'];
      const f = state.morphismF; // pairs [x, y]
      const testRes = CategoryMath.testMonomorphism(f, X, Y);

      if (resultBanner) {
        resultBanner.style.color = testRes.isMonic ? '#34d399' : '#f87171';
        resultBanner.textContent = testRes.isMonic 
          ? 'LEFT-CANCELLATION HOLDS: f is Monic (Injective)'
          : 'MONIC CANCELLATION FAILS (Counterexample Witness Found)';
      }

      if (witnessTel) {
        if (testRes.isMonic) {
          witnessTel.innerHTML = `
            <div><strong>Monic Definition:</strong> &forall; g₁, g₂: W &rarr; X, (f ∘ g₁ = f ∘ g₂) &implies; g₁ = g₂.</div>
            <div style="color: #34d399; margin-top: 4px;">✓ Distinct domain elements map to distinct targets. Composing with f is left-cancellable.</div>
          `;
        } else {
          const w = testRes.witness;
          witnessTel.innerHTML = `
            <div style="color: #f87171; font-weight: bold;">COUNTEREXAMPLE WITNESS PROBES:</div>
            <div>Probe 1: g₁(*) = ${w.g1[0][1]} &nbsp;|&nbsp; Probe 2: g₂(*) = ${w.g2[0][1]} &nbsp; (Clearly g₁ &ne; g₂)</div>
            <div>Composed outputs: (f ∘ g₁)(*) = ${w.compositionBoth[0][1]} &nbsp;and&nbsp; (f ∘ g₂)(*) = ${w.compositionBoth[0][1]}</div>
            <div style="color: #fbbf24; margin-top: 4px;">
              Because f ∘ g₁ = f ∘ g₂ despite g₁ &ne; g₂, morphism f CANNOT be cancelled on the left!
            </div>
          `;
        }
      }

      // Draw SVG diagram: W (left), X (center), Y (right)
      const pW = { x: 80, y: 140, name: 'W = {*}' };
      const pX = { x: 270, y: 140, name: 'X = {1, 2, 3}' };
      const pY = { x: 460, y: 140, name: 'Y = {a, b, c}' };

      let arrowsHtml = `
        <!-- Arrow g1: W -> X (curved top) -->
        <path d="M ${pW.x + 28} ${pW.y - 12} Q 175 70 ${pX.x - 38} ${pX.y - 12}" fill="none" stroke="#38bdf8" stroke-width="2.2" style="marker-end: url(#probe-arrow-blue);" />
        <text x="175" y="75" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">Probe g₁</text>

        <!-- Arrow g2: W -> X (curved bottom) -->
        <path d="M ${pW.x + 28} ${pW.y + 12} Q 175 210 ${pX.x - 38} ${pX.y + 12}" fill="none" stroke="#ec4899" stroke-width="2.2" style="marker-end: url(#probe-arrow-rose);" />
        <text x="175" y="225" text-anchor="middle" fill="#ec4899" font-size="13" font-weight="bold">Probe g₂</text>

        <!-- Target Arrow f: X -> Y -->
        <line x1="${pX.x + 46}" y1="${pX.y}" x2="${pY.x - 46}" y2="${pY.y}" stroke="${testRes.isMonic ? '#34d399' : '#f87171'}" stroke-width="3" style="marker-end: url(#probe-arrow-amber);" />
        <text x="365" y="125" text-anchor="middle" fill="${testRes.isMonic ? '#34d399' : '#f87171'}" font-size="15" font-weight="bold">Target f</text>
      `;

      let objectsHtml = `
        <g transform="translate(${pW.x}, ${pW.y})">
          <circle r="26" fill="#0f172a" stroke="#64748b" stroke-width="2" />
          <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">W</text>
        </g>
        <g transform="translate(${pX.x}, ${pX.y})">
          <rect x="-44" y="-22" width="88" height="44" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2" />
          <text y="5" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">X</text>
        </g>
        <g transform="translate(${pY.x}, ${pY.y})">
          <rect x="-44" y="-22" width="88" height="44" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2" />
          <text y="5" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">Y</text>
        </g>
      `;

      arrowsLayer.innerHTML = arrowsHtml;
      objectsLayer.innerHTML = objectsHtml;

    } else {
      // Epimorphism probe test: X -> Y via f; Y -> Z via h1, h2
      const X = state.domainX || [1, 2, 3];
      const Y = state.codomainY || ['a', 'b', 'c'];
      const f = state.morphismF;
      const testRes = CategoryMath.testEpimorphism(f, X, Y);

      if (resultBanner) {
        resultBanner.style.color = testRes.isEpic ? '#34d399' : '#f87171';
        resultBanner.textContent = testRes.isEpic 
          ? 'RIGHT-CANCELLATION HOLDS: f is Epic (Surjective)'
          : 'EPIC CANCELLATION FAILS (Unhit Codomain Element)';
      }

      if (witnessTel) {
        if (testRes.isEpic) {
          witnessTel.innerHTML = `
            <div><strong>Epic Definition:</strong> &forall; h₁, h₂: Y &rarr; Z, (h₁ ∘ f = h₂ ∘ f) &implies; h₁ = h₂.</div>
            <div style="color: #34d399; margin-top: 4px;">✓ Every codomain element is covered by f. Composing with f is right-cancellable.</div>
          `;
        } else {
          const w = testRes.witness;
          witnessTel.innerHTML = `
            <div style="color: #f87171; font-weight: bold;">COUNTEREXAMPLE WITNESS PROBES:</div>
            <div>Unhit Element: <strong>${w.orphaned}</strong></div>
            <div>Probe 1 h₁: sends all Y to 0. Probe 2 h₂: sends ${w.orphaned} to 1, rest to 0. (h₁ &ne; h₂)</div>
            <div>Composed outputs: (h₁ ∘ f)(x) = 0 and (h₂ ∘ f)(x) = 0 for all x ∈ X!</div>
            <div style="color: #fbbf24; margin-top: 4px;">
              Because h₁ ∘ f = h₂ ∘ f despite h₁ &ne; h₂, morphism f CANNOT be cancelled on the right!
            </div>
          `;
        }
      }

      // Draw SVG diagram: X (left), Y (center), Z (right)
      const pX = { x: 80, y: 140, name: 'X = {1, 2, 3}' };
      const pY = { x: 270, y: 140, name: 'Y = {a, b, c}' };
      const pZ = { x: 460, y: 140, name: 'Z = {0, 1}' };

      let arrowsHtml = `
        <!-- Target Arrow f: X -> Y -->
        <line x1="${pX.x + 44}" y1="${pX.y}" x2="${pY.x - 44}" y2="${pY.y}" stroke="${testRes.isEpic ? '#34d399' : '#f87171'}" stroke-width="3" style="marker-end: url(#probe-arrow-amber);" />
        <text x="175" y="125" text-anchor="middle" fill="${testRes.isEpic ? '#34d399' : '#f87171'}" font-size="15" font-weight="bold">Target f</text>

        <!-- Arrow h1: Y -> Z (curved top) -->
        <path d="M ${pY.x + 44} ${pY.y - 12} Q 365 70 ${pZ.x - 28} ${pZ.y - 12}" fill="none" stroke="#38bdf8" stroke-width="2.2" style="marker-end: url(#probe-arrow-blue);" />
        <text x="365" y="75" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">Probe h₁</text>

        <!-- Arrow h2: Y -> Z (curved bottom) -->
        <path d="M ${pY.x + 44} ${pY.y + 12} Q 365 210 ${pZ.x - 28} ${pZ.y + 12}" fill="none" stroke="#ec4899" stroke-width="2.2" style="marker-end: url(#probe-arrow-rose);" />
        <text x="365" y="225" text-anchor="middle" fill="#ec4899" font-size="13" font-weight="bold">Probe h₂</text>
      `;

      let objectsHtml = `
        <g transform="translate(${pX.x}, ${pX.y})">
          <rect x="-44" y="-22" width="88" height="44" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2" />
          <text y="5" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">X</text>
        </g>
        <g transform="translate(${pY.x}, ${pY.y})">
          <rect x="-44" y="-22" width="88" height="44" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2" />
          <text y="5" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="bold">Y</text>
        </g>
        <g transform="translate(${pZ.x}, ${pZ.y})">
          <circle r="26" fill="#0f172a" stroke="#64748b" stroke-width="2" />
          <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">Z</text>
        </g>
      `;

      arrowsLayer.innerHTML = arrowsHtml;
      objectsLayer.innerHTML = objectsHtml;
    }
  }
}
