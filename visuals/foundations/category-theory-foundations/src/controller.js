/**
 * CategoryTheoryController — State Management & Orchestrator
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 */

import { CategoryMath } from '../../js/foundations-core.js';
import { CommutativeDiagramView } from './views/CommutativeDiagramView.js';
import { MonoEpiProbeView } from './views/MonoEpiProbeView.js';
import { FactorizationView } from './views/FactorizationView.js';

export class CategoryTheoryController {
  constructor() {
    this.state = {
      activeMode: 'commutative', // 'commutative' | 'probe' | 'factorization'
      diagramType: 'triangle',   // 'triangle' | 'square' | 'product'
      triangleCommutes: true,
      squareCommutes: true,
      
      // Target Morphism f: X -> Y for probe & factorization tests
      currentPresetId: 'collapsing-quotient',
      domainX: [1, 2, 3, 4],
      codomainY: ['a', 'b', 'c'],
      morphismF: [
        [1, 'a'],
        [2, 'a'],
        [3, 'b'],
        [4, 'b']
      ]
    };

    this.commutativeView = null;
    this.probeView = null;
    this.factorizationView = null;

    this.presets = {
      'collapsing-quotient': {
        id: 'collapsing-quotient',
        name: 'Collapsing: 4 elements -> 2 classes',
        domainX: [1, 2, 3, 4],
        codomainY: ['a', 'b', 'c'],
        morphismF: [
          [1, 'a'],
          [2, 'a'],
          [3, 'b'],
          [4, 'b']
        ]
      },
      'injective-monic': {
        id: 'injective-monic',
        name: 'Injective (Monic): 3 elements -> 4 targets',
        domainX: [1, 2, 3],
        codomainY: ['a', 'b', 'c', 'd'],
        morphismF: [
          [1, 'a'],
          [2, 'b'],
          [3, 'c']
        ]
      },
      'surjective-epic': {
        id: 'surjective-epic',
        name: 'Surjective (Epic): 4 elements -> 3 targets',
        domainX: [1, 2, 3, 4],
        codomainY: ['a', 'b', 'c'],
        morphismF: [
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
          [4, 'c']
        ]
      },
      'bijective-isomorphism': {
        id: 'bijective-isomorphism',
        name: 'Bijective (Isomorphism): 3 elements -> 3 targets',
        domainX: [1, 2, 3],
        codomainY: ['a', 'b', 'c'],
        morphismF: [
          [1, 'a'],
          [2, 'b'],
          [3, 'c']
        ]
      }
    };
  }

  mount(containers) {
    if (containers.commutative) {
      this.commutativeView = new CommutativeDiagramView(containers.commutative, this);
    }
    if (containers.probe) {
      this.probeView = new MonoEpiProbeView(containers.probe, this);
    }
    if (containers.factorization) {
      this.factorizationView = new FactorizationView(containers.factorization, this);
    }

    this.bindDomControls();
    this.updateAll();
  }

  bindDomControls() {
    if (typeof document === 'undefined') return;

    // View Mode Switcher
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.viewMode;
        this.setViewMode(mode);
      });
    });

    // Diagram Type Switcher in Toolbar (Triangle / Square / Product)
    document.querySelectorAll('[data-diagram-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.diagramType;
        this.setDiagramType(type);
      });
    });

    // Preset Buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = e.currentTarget.dataset.preset;
        this.applyPreset(presetId);
      });
    });

    // Commutativity toggle
    document.querySelector('#btn-toggle-comm')?.addEventListener('click', () => {
      this.toggleTriangleCommutativity();
    });

    // Reset
    document.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.reset();
    });
  }

  setViewMode(mode) {
    this.state.activeMode = mode;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-view-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viewMode === mode);
        btn.setAttribute('aria-pressed', btn.dataset.viewMode === mode);
      });

      const commSec = document.querySelector('#commutative-viewport-container');
      const probeSec = document.querySelector('#probe-viewport-container');
      const factSec = document.querySelector('#factorization-viewport-container');

      if (commSec) commSec.style.display = mode === 'commutative' ? 'block' : 'none';
      if (probeSec) probeSec.style.display = mode === 'probe' ? 'block' : 'none';
      if (factSec) factSec.style.display = mode === 'factorization' ? 'block' : 'none';

      // Show/hide diagram type selector buttons only when in commutative view
      const diagramSelector = document.querySelector('#diagram-type-group');
      if (diagramSelector) {
        diagramSelector.style.display = mode === 'commutative' ? 'inline-flex' : 'none';
      }
    }

    if (mode === 'commutative') this.commutativeView?.render();
    if (mode === 'probe') this.probeView?.render();
    if (mode === 'factorization') this.factorizationView?.render();

    this.updateTelemetry();
  }

  setDiagramType(type) {
    if (['triangle', 'square', 'product'].includes(type)) {
      this.state.diagramType = type;
      if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-diagram-type]').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.diagramType === type);
          btn.setAttribute('aria-pressed', btn.dataset.diagramType === type);
        });
      }
      this.commutativeView?.render();
      this.updateTelemetry();
    }
  }

  toggleTriangleCommutativity(commutes) {
    this.state.triangleCommutes = typeof commutes === 'boolean' ? commutes : !this.state.triangleCommutes;
    this.commutativeView?.render();
    this.updateTelemetry();
  }

  toggleSquareCommutativity(commutes) {
    this.state.squareCommutes = typeof commutes === 'boolean' ? commutes : !this.state.squareCommutes;
    this.commutativeView?.render();
    this.updateTelemetry();
  }

  setMorphismF(pairs, domainX, codomainY) {
    this.state.morphismF = pairs;
    if (domainX) this.state.domainX = domainX;
    if (codomainY) this.state.codomainY = codomainY;
    this.updateAll();
  }

  applyPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return;

    this.state.currentPresetId = presetId;
    this.state.domainX = [...preset.domainX];
    this.state.codomainY = [...preset.codomainY];
    this.state.morphismF = preset.morphismF.map(p => [...p]);

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetId);
      });
    }

    this.updateAll();
  }

  reset() {
    this.applyPreset('collapsing-quotient');
    this.state.diagramType = 'triangle';
    this.state.triangleCommutes = true;
    this.state.squareCommutes = true;
    this.setViewMode('commutative');
  }

  updateAll() {
    this.commutativeView?.render();
    this.probeView?.render();
    this.factorizationView?.render();
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const monicTest = CategoryMath.testMonomorphism(this.state.morphismF, this.state.domainX, this.state.codomainY);
    const epicTest = CategoryMath.testEpimorphism(this.state.morphismF, this.state.domainX, this.state.codomainY);
    const fact = CategoryMath.computeQuotientFactorization(this.state.morphismF, this.state.domainX, this.state.codomainY);

    const badgeComm = document.querySelector('#badge-comm-status');
    const badgeMonic = document.querySelector('#badge-monic-status');
    const badgeEpic = document.querySelector('#badge-epic-status');
    const badgeIso = document.querySelector('#badge-iso-status');

    if (badgeComm) {
      badgeComm.className = `axiom-badge ${this.state.triangleCommutes ? 'is-valid' : 'is-violated'}`;
      badgeComm.textContent = `Diagram: ${this.state.triangleCommutes ? 'Commutes (g ∘ f = h)' : 'Non-Commutative'}`;
    }
    if (badgeMonic) {
      badgeMonic.className = `axiom-badge ${monicTest.isMonic ? 'is-valid' : 'is-violated'}`;
      badgeMonic.textContent = `Monic: ${monicTest.isMonic ? 'YES (Injective)' : 'NO'}`;
    }
    if (badgeEpic) {
      badgeEpic.className = `axiom-badge ${epicTest.isEpic ? 'is-valid' : 'is-violated'}`;
      badgeEpic.textContent = `Epic: ${epicTest.isEpic ? 'YES (Surjective)' : 'NO'}`;
    }
    if (badgeIso) {
      const isIso = monicTest.isMonic && epicTest.isEpic;
      badgeIso.className = `axiom-badge ${isIso ? 'is-valid' : 'is-violated'}`;
      badgeIso.textContent = `Isomorphism: ${isIso ? 'YES (≅)' : 'NO'}`;
    }

    const tel = document.querySelector('#category-telemetry-content');
    if (tel) {
      tel.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Morphism f:</strong> |X| = ${this.state.domainX.length} &rarr; |Y| = ${this.state.codomainY.length}</div>
          <div><strong>Left-Cancellation:</strong> ${monicTest.isMonic ? 'Holds (all probes cancel)' : monicTest.reason}</div>
          <div><strong>Right-Cancellation:</strong> ${epicTest.isEpic ? 'Holds (all probes cancel)' : epicTest.reason}</div>
          <div><strong>Universal Factorization:</strong> X &rarr; X/ker(f) [${fact.quotientClasses.length} classes] ≅ im(f) [${fact.imageElements.length} elements] &rarr; Y</div>
        </div>
      `;
    }
  }

  exportProof() {
    const monicTest = CategoryMath.testMonomorphism(this.state.morphismF, this.state.domainX, this.state.codomainY);
    const epicTest = CategoryMath.testEpimorphism(this.state.morphismF, this.state.domainX, this.state.codomainY);
    const fact = CategoryMath.computeQuotientFactorization(this.state.morphismF, this.state.domainX, this.state.codomainY);

    return `
\\section*{Categorical Invariant & Universal Factorization Verification}

\\subsection*{Target Morphism}
Let $f: X \\to Y$ with domain $X = \\{${this.state.domainX.join(', ')}\\}$ and codomain $Y = \\{${this.state.codomainY.join(', ')}\\}$.
Morphism mapping:
\\[
${this.state.morphismF.map(([x, y]) => `f(${x}) = ${y}`).join(', \\quad ')}
\\]

\\subsection*{Cancellation Properties}
\\begin{itemize}
  \\item **Monomorphism (Left-Cancellation)**: ${monicTest.isMonic ? 'Holds ($f$ is monic / injective).' : `Violated: ${monicTest.reason}`}
  \\item **Epimorphism (Right-Cancellation)**: ${epicTest.isEpic ? 'Holds ($f$ is epic / surjective).' : `Violated: ${epicTest.reason}`}
  \\item **Isomorphism Status**: ${monicTest.isMonic && epicTest.isEpic ? 'Isomorphism (both monic and epic in Set).' : 'Not an isomorphism.'}
\\end{itemize}

\\subsection*{Universal Quotient Factorization}
By the First Isomorphism Theorem for Sets, $f$ factors canonically through its kernel quotient:
\\[
X \\xrightarrow{\\pi} X/\\ker(f) \\xrightarrow{\\bar{f}} \\operatorname{im}(f) \\xrightarrow{\\iota} Y
\\]
where:
\\begin{align*}
  X/\\ker(f) &= \\{${fact.quotientClasses.map(c => c.id).join(', ')}\\} \\\\
  \\operatorname{im}(f) &= \\{${fact.imageElements.join(', ')}\\} \\\\
  f &= \\iota \\circ \\bar{f} \\circ \\pi
\\end{align*}
The induced morphism $\\bar{f}: X/\\ker(f) \\to \\operatorname{im}(f)$ is a strict categorical isomorphism.
`.trim();
  }
}

export function mountCategoryTheoryVisual(containers) {
  const controller = new CategoryTheoryController();
  controller.mount(containers);
  return controller;
}
