/**
 * CommutativeDiagramView — Commutative Diagrams & Path Composition Engine
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 */

import { CategoryMath } from '../../../js/foundations-core.js';

export class CommutativeDiagramView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="commutative-diagram-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Top: Commutativity Status Banner -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Categorical Commutativity Check
            </div>
            <div id="comm-diagram-status" style="font-size: 1.15rem; font-weight: bold; color: #34d399;">
              DIAGRAM COMMUTES (g ∘ f = h)
            </div>
          </div>
          <div id="badge-comm-equality" class="axiom-badge is-valid" style="font-size: 0.8rem;">
            Path Equality Valid
          </div>
        </div>

        <!-- Center: Interactive Commutative Diagram SVG -->
        <div style="flex: 1; min-height: 280px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="comm-diagram-svg" viewBox="0 0 520 280" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <marker id="cat-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="cat-arrow-gold" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
              </marker>
              <filter id="aura-gold">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <g id="comm-arrows-layer"></g>
            <g id="comm-objects-layer"></g>
          </svg>
        </div>

        <!-- Bottom: Path Telemetry -->
        <div id="comm-path-telemetry" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-top: 12px; font-family: monospace; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;"></div>

      </div>
    `;

    this.svg = this.container.querySelector('#comm-diagram-svg');
    this.arrowsLayer = this.container.querySelector('#comm-arrows-layer');
    this.objectsLayer = this.container.querySelector('#comm-objects-layer');

    this.render();
  }

  render() {
    if (!this.svg) return;
    const state = this.controller.state;
    const type = state.diagramType; // 'triangle' | 'square' | 'product'

    if (type === 'triangle') {
      this.renderTriangleDiagram(state);
    } else if (type === 'square') {
      this.renderSquareDiagram(state);
    } else {
      this.renderProductDiagram(state);
    }
  }

  renderTriangleDiagram(state) {
    // Triangle: A -> B via f, B -> C via g, A -> C via h
    const pA = { x: 90, y: 190, name: 'A' };
    const pB = { x: 260, y: 70, name: 'B' };
    const pC = { x: 430, y: 190, name: 'C' };

    // Evaluation: f: A->B, g: B->C, h: A->C
    // By default f(x)=x, g(y)=y, h(x)=y -> commutes!
    const commutes = state.triangleCommutes;

    // Status Banner
    const statusText = this.container.querySelector('#comm-diagram-status');
    const badge = this.container.querySelector('#badge-comm-equality');
    const tel = this.container.querySelector('#comm-path-telemetry');

    if (statusText) {
      statusText.style.color = commutes ? '#34d399' : '#f87171';
      statusText.textContent = commutes ? 'DIAGRAM COMMUTES: g ∘ f = h' : 'NON-COMMUTATIVE: g ∘ f ≠ h';
    }
    if (badge) {
      badge.className = `axiom-badge ${commutes ? 'is-valid' : 'is-violated'}`;
      badge.textContent = commutes ? 'g ∘ f = h' : 'g ∘ f ≠ h';
    }
    if (tel) {
      tel.innerHTML = `
        <div><strong>Path 1:</strong> A &xrightarrow{f} B &xrightarrow{g} C &nbsp;|&nbsp; <strong>(g ∘ f)(x) = g(f(x))</strong></div>
        <div><strong>Path 2:</strong> A &xrightarrow{h} C &nbsp;|&nbsp; <strong>h(x)</strong></div>
        <div style="margin-top: 4px; color: ${commutes ? '#34d399' : '#f87171'};">
          ${commutes ? '✓ Every element x ∈ A maps to the same target under both paths.' : '⚠ Mappings disagree on domain elements!'}
        </div>
      `;
    }

    const strokeColor = commutes ? '#fbbf24' : '#38bdf8';
    const marker = commutes ? 'url(#cat-arrow-gold)' : 'url(#cat-arrow)';

    // Arrows
    let arrowsHtml = `
      <!-- Arrow f: A -> B -->
      <line x1="${pA.x + 18}" y1="${pA.y - 12}" x2="${pB.x - 18}" y2="${pB.y + 12}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${(pA.x + pB.x) / 2 - 14}" y="${(pA.y + pB.y) / 2 - 8}" fill="#38bdf8" font-size="14" font-weight="bold">f</text>

      <!-- Arrow g: B -> C -->
      <line x1="${pB.x + 18}" y1="${pB.y + 12}" x2="${pC.x - 18}" y2="${pC.y - 12}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${(pB.x + pC.x) / 2 + 14}" y="${(pB.y + pC.y) / 2 - 8}" fill="#38bdf8" font-size="14" font-weight="bold">g</text>

      <!-- Arrow h: A -> C (bottom horizontal) -->
      <line x1="${pA.x + 24}" y1="${pA.y}" x2="${pC.x - 24}" y2="${pC.y}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${(pA.x + pC.x) / 2}" y="${pA.y + 24}" text-anchor="middle" fill="#38bdf8" font-size="14" font-weight="bold">h = g ∘ f</text>
    `;

    // Objects
    let objectsHtml = [pA, pB, pC].map(p => `
      <g transform="translate(${p.x}, ${p.y})">
        <circle r="22" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        <text y="6" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">${p.name}</text>
      </g>
    `).join('');

    this.arrowsLayer.innerHTML = arrowsHtml;
    this.objectsLayer.innerHTML = objectsHtml;
  }

  renderSquareDiagram(state) {
    // Naturality Square:
    // F(X) ---> G(X) via eta_X
    //   |         |
    //   v         v  via F(f) and G(f)
    // F(Y) ---> G(Y) via eta_Y
    const p1 = { x: 120, y: 70, name: 'F(X)' };
    const p2 = { x: 400, y: 70, name: 'G(X)' };
    const p3 = { x: 120, y: 210, name: 'F(Y)' };
    const p4 = { x: 400, y: 210, name: 'G(Y)' };

    const statusText = this.container.querySelector('#comm-diagram-status');
    const badge = this.container.querySelector('#badge-comm-equality');
    const tel = this.container.querySelector('#comm-path-telemetry');

    if (statusText) {
      statusText.style.color = '#34d399';
      statusText.textContent = 'NATURALITY SQUARE COMMUTES: G(f) ∘ η_X = η_Y ∘ F(f)';
    }
    if (badge) {
      badge.className = 'axiom-badge is-valid';
      badge.textContent = 'Naturality Axiom Verified';
    }
    if (tel) {
      tel.innerHTML = `
        <div><strong>Top-Right Path:</strong> F(X) &xrightarrow{η_X} G(X) &xrightarrow{G(f)} G(Y)</div>
        <div><strong>Left-Bottom Path:</strong> F(X) &xrightarrow{F(f)} F(Y) &xrightarrow{η_Y} G(Y)</div>
        <div style="margin-top: 4px; color: #34d399;">
          Natural transformations systematically map between functors while preserving all morphism compositions.
        </div>
      `;
    }

    const strokeColor = '#fbbf24';
    const marker = 'url(#cat-arrow-gold)';

    let arrowsHtml = `
      <!-- Top: eta_X -->
      <line x1="${p1.x + 30}" y1="${p1.y}" x2="${p2.x - 30}" y2="${p2.y}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${(p1.x + p2.x) / 2}" y="${p1.y - 10}" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">η_X</text>

      <!-- Bottom: eta_Y -->
      <line x1="${p3.x + 30}" y1="${p3.y}" x2="${p4.x - 30}" y2="${p4.y}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${(p3.x + p4.x) / 2}" y="${p3.y + 22}" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="bold">η_Y</text>

      <!-- Left: F(f) -->
      <line x1="${p1.x}" y1="${p1.y + 26}" x2="${p3.x}" y2="${p3.y - 26}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${p1.x - 14}" y="${(p1.y + p3.y) / 2 + 5}" text-anchor="end" fill="#38bdf8" font-size="14" font-weight="bold">F(f)</text>

      <!-- Right: G(f) -->
      <line x1="${p2.x}" y1="${p2.y + 26}" x2="${p4.x}" y2="${p4.y - 26}" stroke="${strokeColor}" stroke-width="2.5" style="marker-end: ${marker};" />
      <text x="${p2.x + 14}" y="${(p2.y + p4.y) / 2 + 5}" text-anchor="start" fill="#38bdf8" font-size="14" font-weight="bold">G(f)</text>
    `;

    let objectsHtml = [p1, p2, p3, p4].map(p => `
      <g transform="translate(${p.x}, ${p.y})">
        <rect x="-30" y="-18" width="60" height="36" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">${p.name}</text>
      </g>
    `).join('');

    this.arrowsLayer.innerHTML = arrowsHtml;
    this.objectsLayer.innerHTML = objectsHtml;
  }

  renderProductDiagram(state) {
    // Universal Product Property:
    // Object Z with maps f: Z->X, g: Z->Y
    // Unique arrow <f, g>: Z -> X x Y
    const pZ = { x: 100, y: 140, name: 'Z' };
    const pProd = { x: 260, y: 140, name: 'X × Y' };
    const pX = { x: 420, y: 70, name: 'X' };
    const pY = { x: 420, y: 210, name: 'Y' };

    const statusText = this.container.querySelector('#comm-diagram-status');
    const badge = this.container.querySelector('#badge-comm-equality');
    const tel = this.container.querySelector('#comm-path-telemetry');

    if (statusText) {
      statusText.style.color = '#34d399';
      statusText.textContent = 'UNIVERSAL PROPERTY OF PRODUCT: ∃! ⟨f, g⟩ : Z → X × Y';
    }
    if (badge) {
      badge.className = 'axiom-badge is-valid';
      badge.textContent = 'Universal Factorization';
    }
    if (tel) {
      tel.innerHTML = `
        <div><strong>Projections:</strong> π₁: X × Y &rarr; X &nbsp;and&nbsp; π₂: X × Y &rarr; Y</div>
        <div><strong>Universal Mediator:</strong> For any pair (f: Z &rarr; X, g: Z &rarr; Y), there exists a <strong>unique</strong> arrow ⟨f, g⟩ such that π₁ ∘ ⟨f, g⟩ = f and π₂ ∘ ⟨f, g⟩ = g.</div>
      `;
    }

    const strokeColor = '#38bdf8';
    const marker = 'url(#cat-arrow)';

    let arrowsHtml = `
      <!-- Unique mediator <f, g>: Z -> X x Y -->
      <line x1="${pZ.x + 24}" y1="${pZ.y}" x2="${pProd.x - 34}" y2="${pProd.y}" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="5 3" style="marker-end: url(#cat-arrow-gold);" />
      <text x="${(pZ.x + pProd.x) / 2}" y="${pZ.y - 12}" text-anchor="middle" fill="#fbbf24" font-size="13" font-weight="bold">∃! ⟨f, g⟩</text>

      <!-- Projections: pi_1 and pi_2 -->
      <line x1="${pProd.x + 34}" y1="${pProd.y - 10}" x2="${pX.x - 22}" y2="${pX.y + 10}" stroke="${strokeColor}" stroke-width="2.2" style="marker-end: ${marker};" />
      <text x="${(pProd.x + pX.x) / 2}" y="${(pProd.y + pX.y) / 2 - 8}" fill="#38bdf8" font-size="13" font-weight="bold">π₁</text>

      <line x1="${pProd.x + 34}" y1="${pProd.y + 10}" x2="${pY.x - 22}" y2="${pY.y - 10}" stroke="${strokeColor}" stroke-width="2.2" style="marker-end: ${marker};" />
      <text x="${(pProd.x + pY.x) / 2}" y="${(pProd.y + pY.y) / 2 + 16}" fill="#38bdf8" font-size="13" font-weight="bold">π₂</text>

      <!-- Direct arrows f: Z -> X and g: Z -> Y -->
      <path d="M ${pZ.x} ${pZ.y - 20} Q 260 20 ${pX.x - 20} ${pX.y}" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1.8" stroke-dasharray="4 4" style="marker-end: ${marker};" />
      <text x="260" y="35" text-anchor="middle" fill="#94a3b8" font-size="12">f</text>

      <path d="M ${pZ.x} ${pZ.y + 20} Q 260 260 ${pY.x - 20} ${pY.y}" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1.8" stroke-dasharray="4 4" style="marker-end: ${marker};" />
      <text x="260" y="250" text-anchor="middle" fill="#94a3b8" font-size="12">g</text>
    `;

    let objectsHtml = `
      <g transform="translate(${pZ.x}, ${pZ.y})">
        <circle r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="2" />
        <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">Z</text>
      </g>
      <g transform="translate(${pProd.x}, ${pProd.y})">
        <rect x="-34" y="-18" width="68" height="36" rx="8" fill="#0f172a" stroke="#fbbf24" stroke-width="2.2" />
        <text y="5" text-anchor="middle" fill="#fbbf24" font-size="13" font-weight="bold">X × Y</text>
      </g>
      <g transform="translate(${pX.x}, ${pX.y})">
        <circle r="20" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">X</text>
      </g>
      <g transform="translate(${pY.x}, ${pY.y})">
        <circle r="20" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">Y</text>
      </g>
    `;

    this.arrowsLayer.innerHTML = arrowsHtml;
    this.objectsLayer.innerHTML = objectsHtml;
  }
}
