/**
 * FactorizationView — Universal Factorization & Adjunction Workbench
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 * 
 * Demonstrates:
 * 1. First Isomorphism Theorem for Sets: X / ker(f) ≅ im(f)
 *    Every morphism f : X -> Y uniquely factors as:
 *    X --π (epi)--> X/ker(f) --f_bar (iso)--> im(f) --ι (mono)--> Y
 * 
 * 2. Currying & Cartesian Adjunction: Hom(A × B, C) ≅ Hom(A, C^B)
 *    f(a, b) = c <===> eval(f_hat(a), b) = c
 */

import { CategoryMath } from '../../../js/foundations-core.js';

export class FactorizationView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.activeSubmode = 'factorization'; // 'factorization' | 'adjunction'

    // Sample data for Currying / Adjunction
    this.curryA = ['x1', 'x2'];
    this.curryB = ['y1', 'y2'];
    this.currySelectedA = 'x1';
    this.currySelectedB = 'y2';

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="factorization-view-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Header & Mode Selector -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;">
          <div>
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Universal Factorization & Adjunction
            </div>
            <div id="factorization-title" style="font-size: 1.15rem; font-weight: bold; color: #38bdf8;">
              Universal Quotient Factorization (First Isomorphism Theorem)
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn active" id="btn-submode-fact" style="padding: 6px 12px; font-size: 0.8rem;">
              First Isomorphism (X/ker ≅ im)
            </button>
            <button type="button" class="btn" id="btn-submode-curry" style="padding: 6px 12px; font-size: 0.8rem;">
              Currying Adjunction (A × B ≅ A → Cᴮ)
            </button>
          </div>
        </div>

        <!-- Dynamic Visualization Canvas -->
        <div id="factorization-canvas-container" style="flex: 1; min-height: 300px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="factorization-svg" viewBox="0 0 540 300" style="width: 100%; height: 100%; display: block; user-select: none;">
            <defs>
              <marker id="fact-arrow-cyan" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="fact-arrow-emerald" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
              </marker>
              <marker id="fact-arrow-amber" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
              </marker>
              <marker id="fact-arrow-rose" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ec4899" />
              </marker>
            </defs>
            <g id="fact-edges-layer"></g>
            <g id="fact-nodes-layer"></g>
          </svg>
        </div>

        <!-- Telemetry & Axiom Details -->
        <div id="factorization-telemetry" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-top: 12px; font-family: monospace; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">
        </div>

      </div>
    `;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    this.container.querySelector('#btn-submode-fact')?.addEventListener('click', () => {
      this.activeSubmode = 'factorization';
      this.container.querySelector('#btn-submode-fact')?.classList.add('active');
      this.container.querySelector('#btn-submode-curry')?.classList.remove('active');
      const title = this.container.querySelector('#factorization-title');
      if (title) title.textContent = 'Universal Quotient Factorization (First Isomorphism Theorem)';
      this.render();
    });

    this.container.querySelector('#btn-submode-curry')?.addEventListener('click', () => {
      this.activeSubmode = 'adjunction';
      this.container.querySelector('#btn-submode-curry')?.classList.add('active');
      this.container.querySelector('#btn-submode-fact')?.classList.remove('active');
      const title = this.container.querySelector('#factorization-title');
      if (title) title.textContent = 'Currying & Cartesian Adjunction: Hom(A × B, C) ≅ Hom(A, Cᴮ)';
      this.render();
    });
  }

  render() {
    const svg = this.container.querySelector('#factorization-svg');
    const edgesLayer = this.container.querySelector('#fact-edges-layer');
    const nodesLayer = this.container.querySelector('#fact-nodes-layer');
    const tel = this.container.querySelector('#factorization-telemetry');
    if (!svg || !edgesLayer || !nodesLayer || !tel) return;

    edgesLayer.innerHTML = '';
    nodesLayer.innerHTML = '';

    if (this.activeSubmode === 'factorization') {
      this.renderFactorization(edgesLayer, nodesLayer, tel);
    } else {
      this.renderCurryingAdjunction(edgesLayer, nodesLayer, tel);
    }
  }

  renderFactorization(edgesLayer, nodesLayer, tel) {
    const morphismF = this.controller.state.morphismF || [
      [1, 'a'],
      [2, 'a'],
      [3, 'b'],
      [4, 'b']
    ];
    const domainX = this.controller.state.domainX || [1, 2, 3, 4];
    const codomainY = this.controller.state.codomainY || ['a', 'b', 'c'];

    const fact = CategoryMath.computeQuotientFactorization(morphismF, domainX, codomainY);

    // Layout positions:
    // Top-left: X (Domain) at (90, 80)
    // Top-right: Y (Codomain) at (450, 80)
    // Bottom-left: X/~ (Quotient) at (170, 230)
    // Bottom-right: im(f) (Image) at (370, 230)

    const pX = { x: 80, y: 70, label: 'X', sub: `|X|=${domainX.length}` };
    const pY = { x: 460, y: 70, label: 'Y', sub: `|Y|=${codomainY.length}` };
    const pQuot = { x: 180, y: 220, label: 'X/ker(f)', sub: `|classes|=${fact.quotientClasses.length}` };
    const pIm = { x: 360, y: 220, label: 'im(f)', sub: `|im|=${fact.imageElements.length}` };

    // Draw Edges:
    // 1. Direct f: X -> Y (dashed cyan)
    this.drawArrow(edgesLayer, pX.x + 25, pX.y, pY.x - 25, pY.y, '#38bdf8', 'fact-arrow-cyan', 'f (original)', 'top');

    // 2. Canonical projection π: X -> X/ker(f) (solid emerald)
    this.drawArrow(edgesLayer, pX.x + 15, pX.y + 20, pQuot.x - 20, pQuot.y - 15, '#34d399', 'fact-arrow-emerald', 'π (epimorphism)', 'left');

    // 3. Induced isomorphism f_bar: X/ker(f) -> im(f) (solid amber, double arrow / iso)
    this.drawArrow(edgesLayer, pQuot.x + 40, pQuot.y, pIm.x - 40, pIm.y, '#fbbf24', 'fact-arrow-amber', 'f̄ (isomorphism ≅)', 'bottom');

    // 4. Canonical inclusion ι: im(f) -> Y (solid rose)
    this.drawArrow(edgesLayer, pIm.x + 20, pIm.y - 15, pY.x - 15, pY.y + 20, '#ec4899', 'fact-arrow-rose', 'ι (monomorphism ↪)', 'right');

    // Draw Nodes
    [pX, pY, pQuot, pIm].forEach((node, idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '32');
      circle.setAttribute('fill', '#1e293b');
      circle.setAttribute('stroke', idx === 2 || idx === 3 ? '#fbbf24' : '#38bdf8');
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - 2);
      text.setAttribute('fill', '#f8fafc');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = node.label;
      g.appendChild(text);

      const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subText.setAttribute('x', node.x);
      subText.setAttribute('y', node.y + 16);
      subText.setAttribute('fill', '#94a3b8');
      subText.setAttribute('font-size', '9');
      subText.setAttribute('text-anchor', 'middle');
      subText.textContent = node.sub;
      g.appendChild(subText);

      nodesLayer.appendChild(g);
    });

    // Telemetry text
    const classStrings = fact.quotientClasses.map(c => `${c.id} ↦ ${c.targetY}`).join(', ');
    const unhitText = fact.unhitCodomain.length > 0 ? fact.unhitCodomain.join(', ') : 'None (surjective)';

    tel.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 8px;">
        <div style="background: rgba(56, 189, 248, 0.08); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #38bdf8;">
          <strong style="color: #38bdf8;">Projection π (Surjection)</strong><br>
          Collapses fibers {x | f(x)=y} into equivalence classes: <code>X → X/~</code>
        </div>
        <div style="background: rgba(251, 191, 36, 0.08); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #fbbf24;">
          <strong style="color: #fbbf24;">Isomorphism f̄ (Bijection)</strong><br>
          1-to-1 match between fibers and image values: <code>X/ker(f) ≅ im(f)</code>
        </div>
        <div style="background: rgba(236, 72, 153, 0.08); padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ec4899;">
          <strong style="color: #ec4899;">Inclusion ι (Injection)</strong><br>
          Subobject embedding into full codomain: <code>im(f) ↪ Y</code>
        </div>
      </div>

      <div style="font-size: 0.8rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
        <div><strong>Equivalence Classes in X/ker(f):</strong> ${classStrings}</div>
        <div><strong>Orphaned Codomain Elements (Y \\ im(f)):</strong> ${unhitText}</div>
        <div style="color: #34d399; margin-top: 4px;"><strong>First Isomorphism Theorem:</strong> f = ι ∘ f̄ ∘ π. Every mathematical function factors through an epimorphism, an isomorphism, and a monomorphism.</div>
      </div>
    `;
  }

  renderCurryingAdjunction(edgesLayer, nodesLayer, tel) {
    // Demonstration of Hom(A × B, C) ≅ Hom(A, C^B)
    const A = this.curryA;
    const B = this.curryB;
    const addFn = (a, b) => `${a}+${b}`;

    const curryResult = CategoryMath.testCurryingAdjunction(A, B, addFn);

    // Interactive Currying Layout
    // Left: Product Space A × B -> C
    // Right: Higher-Order Function A -> (B -> C)
    
    // Draw visual boxes for A × B and A -> (B -> C)
    const gLeft = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gLeft.innerHTML = `
      <rect x="40" y="40" width="200" height="220" rx="10" fill="#131e33" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 2"/>
      <text x="140" y="65" fill="#38bdf8" font-size="13" font-weight="bold" text-anchor="middle">Uncurried: f(a, b)</text>
      <text x="140" y="85" fill="#94a3b8" font-size="10" text-anchor="middle">Domain: A × B</text>
      
      <!-- Pair nodes -->
      <g id="pair-nodes-group"></g>
    `;
    nodesLayer.appendChild(gLeft);

    const pairGroup = nodesLayer.querySelector('#pair-nodes-group');
    let pairY = 115;
    for (const a of A) {
      for (const b of B) {
        const isSelected = a === this.currySelectedA && b === this.currySelectedB;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '60');
        rect.setAttribute('y', pairY - 14);
        rect.setAttribute('width', '160');
        rect.setAttribute('height', '26');
        rect.setAttribute('rx', '6');
        rect.setAttribute('fill', isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.05)');
        rect.setAttribute('stroke', isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)');
        rect.setAttribute('cursor', 'pointer');
        rect.addEventListener('click', () => {
          this.currySelectedA = a;
          this.currySelectedB = b;
          this.render();
        });

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', '140');
        txt.setAttribute('y', pairY);
        txt.setAttribute('fill', isSelected ? '#f8fafc' : '#cbd5e1');
        txt.setAttribute('font-size', '11');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline', 'middle');
        txt.textContent = `(${a}, ${b}) ↦ ${addFn(a, b)}`;

        pairGroup.appendChild(rect);
        pairGroup.appendChild(txt);
        pairY += 34;
      }
    }

    // Right: Curried representation
    const gRight = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gRight.innerHTML = `
      <rect x="300" y="40" width="200" height="220" rx="10" fill="#131e33" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="400" y="65" fill="#fbbf24" font-size="13" font-weight="bold" text-anchor="middle">Curried: f̂(a)(b)</text>
      <text x="400" y="85" fill="#94a3b8" font-size="10" text-anchor="middle">Domain: A → (B → C)</text>
      
      <!-- Slice nodes -->
      <g id="slice-nodes-group"></g>
    `;
    nodesLayer.appendChild(gRight);

    const sliceGroup = nodesLayer.querySelector('#slice-nodes-group');
    let sliceY = 125;
    for (const a of A) {
      const isSelectedA = a === this.currySelectedA;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '320');
      rect.setAttribute('y', sliceY - 18);
      rect.setAttribute('width', '160');
      rect.setAttribute('height', '50');
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', isSelectedA ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.05)');
      rect.setAttribute('stroke', isSelectedA ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)');
      rect.setAttribute('cursor', 'pointer');
      rect.addEventListener('click', () => {
        this.currySelectedA = a;
        this.render();
      });

      const txtTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txtTitle.setAttribute('x', '330');
      txtTitle.setAttribute('y', sliceY - 4);
      txtTitle.setAttribute('fill', isSelectedA ? '#fbbf24' : '#f8fafc');
      txtTitle.setAttribute('font-size', '11');
      txtTitle.setAttribute('font-weight', 'bold');
      txtTitle.textContent = `f̂(${a}) : B → C`;

      const txtSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txtSub.setAttribute('x', '330');
      txtSub.setAttribute('y', sliceY + 16);
      txtSub.setAttribute('fill', '#94a3b8');
      txtSub.setAttribute('font-size', '10');
      txtSub.textContent = `[y1↦${addFn(a, 'y1')}, y2↦${addFn(a, 'y2')}]`;

      sliceGroup.appendChild(rect);
      sliceGroup.appendChild(txtTitle);
      sliceGroup.appendChild(txtSub);
      sliceY += 66;
    }

    // Telemetry text
    const curriedSlice = curryResult.curriedMap.get(this.currySelectedA);
    const evalResult = curriedSlice.get(this.currySelectedB);
    const directResult = addFn(this.currySelectedA, this.currySelectedB);

    tel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="color: #38bdf8; font-weight: bold;">Cartesian Closed Category Adjunction: Hom(A × B, C) ≅ Hom(A, Cᴮ)</span>
        <span class="axiom-badge is-valid" style="font-size: 0.75rem;">Natural Isomorphism Valid</span>
      </div>
      <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">
        <div><strong>Selected Input:</strong> a = <span style="color: #fbbf24;">${this.currySelectedA}</span>, b = <span style="color: #38bdf8;">${this.currySelectedB}</span></div>
        <div><strong>Uncurried Evaluation:</strong> <code>f(${this.currySelectedA}, ${this.currySelectedB}) = "${directResult}"</code></div>
        <div><strong>Curried Step 1:</strong> <code>g = f̂(${this.currySelectedA})</code> returns a unary function closure of type <code>B → C</code></div>
        <div><strong>Curried Step 2:</strong> <code>eval(g, ${this.currySelectedB}) = "${evalResult}"</code></div>
        <div style="color: #34d399; margin-top: 6px;"><strong>Adjunction Invariant:</strong> eval(f̂(a), b) ≡ f(a, b). Free product functor <code>(-) × B</code> is left adjoint to exponential functor <code>(-)^B</code>.</div>
      </div>
    `;
  }

  drawArrow(layer, x1, y1, x2, y2, strokeColor, markerId, label, labelPos) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', strokeColor);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', `url(#${markerId})`);
    layer.appendChild(line);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('fill', strokeColor);
    txt.setAttribute('font-size', '10');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('text-anchor', 'middle');

    if (labelPos === 'top') {
      txt.setAttribute('x', midX);
      txt.setAttribute('y', midY - 10);
    } else if (labelPos === 'bottom') {
      txt.setAttribute('x', midX);
      txt.setAttribute('y', midY + 16);
    } else if (labelPos === 'left') {
      txt.setAttribute('x', midX - 25);
      txt.setAttribute('y', midY);
    } else {
      txt.setAttribute('x', midX + 25);
      txt.setAttribute('y', midY);
    }

    txt.textContent = label;
    layer.appendChild(txt);
  }
}
