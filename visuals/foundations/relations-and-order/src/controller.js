/**
 * Controller — Relations, Order & Equivalence Partitions
 * Visual Mathematics Lab — Module 2
 */

import { RelationMath } from '../../js/foundations-core.js';
import { RelationDigraphView } from './views/RelationDigraphView.js';
import { QuotientClockView } from './views/QuotientClockView.js';
import { PosetHasseView } from './views/PosetHasseView.js';

export class RelationsController {
  constructor() {
    this.state = {
      activeMode: 'digraph', // 'digraph' | 'quotient' | 'poset'
      elements: [1, 2, 3, 4, 5],
      pairs: [
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], // Reflexive
        [1, 2], [2, 1],                         // Symmetric class {1, 2}
        [3, 4], [4, 3]                          // Symmetric class {3, 4}
      ],
      highlightTransitiveViolations: true,
      currentPresetId: 'equivalence'
    };

    this.digraphView = null;
    this.quotientView = null;
    this.hasseView = null;

    this.presets = {
      equivalence: {
        id: 'equivalence',
        name: 'Equivalence Relation',
        elements: [1, 2, 3, 4, 5],
        pairs: [
          [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
          [1, 2], [2, 1],
          [3, 4], [4, 3]
        ]
      },
      partial_order: {
        id: 'partial_order',
        name: 'Partial Order (Divisibility)',
        elements: [1, 2, 3, 4, 6],
        pairs: [
          [1, 1], [2, 2], [3, 3], [4, 4], [6, 6],
          [1, 2], [1, 3], [1, 4], [1, 6],
          [2, 4], [2, 6],
          [3, 6]
        ]
      },
      total_order: {
        id: 'total_order',
        name: 'Total Order (Linear Chain)',
        elements: [1, 2, 3, 4, 5],
        pairs: [
          [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
          [1, 2], [1, 3], [1, 4], [1, 5],
          [2, 3], [2, 4], [2, 5],
          [3, 4], [3, 5],
          [4, 5]
        ]
      },
      strict_order: {
        id: 'strict_order',
        name: 'Strict Linear Order (<)',
        elements: [1, 2, 3, 4],
        pairs: [
          [1, 2], [1, 3], [1, 4],
          [2, 3], [2, 4],
          [3, 4]
        ]
      },
      modular_z3: {
        id: 'modular_z3',
        name: 'Modulo 3 Congruence',
        elements: [0, 1, 2, 3, 4, 5],
        pairs: [
          [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
          [0, 3], [3, 0],
          [1, 4], [4, 1],
          [2, 5], [5, 2]
        ]
      },
      empty: {
        id: 'empty',
        name: 'Empty Relation (∅)',
        elements: [1, 2, 3, 4],
        pairs: []
      }
    };
  }

  mount(containers) {
    if (containers.digraph) {
      this.digraphView = new RelationDigraphView(containers.digraph, this);
    }
    if (containers.quotient) {
      this.quotientView = new QuotientClockView(containers.quotient, this);
    }
    if (containers.poset) {
      this.hasseView = new PosetHasseView(containers.poset, this);
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

    // Preset Buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = e.currentTarget.dataset.preset;
        this.applyPreset(presetId);
      });
    });

    // Closures
    document.querySelector('#btn-refl-closure')?.addEventListener('click', () => {
      this.addReflexiveClosure();
    });
    document.querySelector('#btn-symm-closure')?.addEventListener('click', () => {
      this.addSymmetricClosure();
    });
    document.querySelector('#btn-trans-closure')?.addEventListener('click', () => {
      this.addTransitiveClosure();
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

      const digraphSec = document.querySelector('#digraph-viewport-container');
      const quotientSec = document.querySelector('#quotient-viewport-container');
      const posetSec = document.querySelector('#poset-viewport-container');

      if (digraphSec) digraphSec.style.display = mode === 'digraph' ? 'block' : 'none';
      if (quotientSec) quotientSec.style.display = mode === 'quotient' ? 'block' : 'none';
      if (posetSec) posetSec.style.display = mode === 'poset' ? 'block' : 'none';
    }

    if (mode === 'digraph') this.digraphView?.resize();
    if (mode === 'quotient') this.quotientView?.render();
    if (mode === 'poset') this.hasseView?.render();

    this.updateTelemetry();
  }

  applyPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return;

    this.state.currentPresetId = presetId;
    this.state.elements = [...preset.elements];
    this.state.pairs = preset.pairs.map(p => [...p]);

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetId);
      });
    }

    this.updateAll();
  }

  togglePair(a, b) {
    const existsIdx = this.state.pairs.findIndex(([x, y]) => x === a && y === b);
    if (existsIdx >= 0) {
      this.state.pairs.splice(existsIdx, 1);
    } else {
      this.state.pairs.push([a, b]);
    }
    this.updateAll();
  }

  addReflexiveClosure() {
    const pairSet = new Set(this.state.pairs.map(([a, b]) => `${a}->${b}`));
    for (const a of this.state.elements) {
      if (!pairSet.has(`${a}->${a}`)) {
        this.state.pairs.push([a, a]);
      }
    }
    this.updateAll();
  }

  addSymmetricClosure() {
    const pairSet = new Set(this.state.pairs.map(([a, b]) => `${a}->${b}`));
    const toAdd = [];
    for (const [a, b] of this.state.pairs) {
      if (!pairSet.has(`${b}->${a}`)) {
        toAdd.push([b, a]);
        pairSet.add(`${b}->${a}`);
      }
    }
    this.state.pairs.push(...toAdd);
    this.updateAll();
  }

  addTransitiveClosure() {
    const pairSet = new Set(this.state.pairs.map(([a, b]) => `${a}->${b}`));
    let changed = true;
    while (changed) {
      changed = false;
      const currentPairs = [...this.state.pairs];
      for (const [a, b] of currentPairs) {
        for (const [c, d] of currentPairs) {
          if (b === c && !pairSet.has(`${a}->${d}`)) {
            this.state.pairs.push([a, d]);
            pairSet.add(`${a}->${d}`);
            changed = true;
          }
        }
      }
    }
    this.updateAll();
  }

  reset() {
    this.applyPreset('equivalence');
  }

  updateAll() {
    this.digraphView?.render();
    this.quotientView?.render();
    this.hasseView?.render();
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { elements, pairs } = this.state;
    const analysis = RelationMath.analyzeRelation(elements, pairs);

    // Update Axiom Badges
    const badgeRefl = document.querySelector('#badge-reflexive');
    const badgeSymm = document.querySelector('#badge-symmetric');
    const badgeAnti = document.querySelector('#badge-antisymmetric');
    const badgeTrans = document.querySelector('#badge-transitive');
    const badgeTotal = document.querySelector('#badge-totality');
    const badgeStruct = document.querySelector('#badge-structure-type');

    if (badgeRefl) {
      badgeRefl.className = `axiom-badge ${analysis.isReflexive ? 'is-valid' : 'is-violated'}`;
      badgeRefl.textContent = `Reflexive: ${analysis.isReflexive ? 'YES' : 'NO'}`;
    }
    if (badgeSymm) {
      badgeSymm.className = `axiom-badge ${analysis.isSymmetric ? 'is-valid' : 'is-violated'}`;
      badgeSymm.textContent = `Symmetric: ${analysis.isSymmetric ? 'YES' : 'NO'}`;
    }
    if (badgeAnti) {
      badgeAnti.className = `axiom-badge ${analysis.isAntisymmetric ? 'is-valid' : 'is-violated'}`;
      badgeAnti.textContent = `Antisymmetric: ${analysis.isAntisymmetric ? 'YES' : 'NO'}`;
    }
    if (badgeTrans) {
      badgeTrans.className = `axiom-badge ${analysis.isTransitive ? 'is-valid' : 'is-violated'}`;
      badgeTrans.textContent = `Transitive: ${analysis.isTransitive ? 'YES' : 'NO'}`;
    }
    if (badgeTotal) {
      badgeTotal.className = `axiom-badge ${analysis.isTotal ? 'is-valid' : 'is-violated'}`;
      badgeTotal.textContent = `Total / Comparable: ${analysis.isTotal ? 'YES' : 'NO'}`;
    }

    // Structure Classification Badge
    if (badgeStruct) {
      let structName = 'Arbitrary Relation';
      let structClass = 'is-warning';

      if (analysis.isEquivalence) {
        structName = 'Equivalence Relation (Partition)';
        structClass = 'is-valid';
      } else if (analysis.isTotalOrder) {
        structName = 'Total Order (Chain)';
        structClass = 'is-valid';
      } else if (analysis.isPartialOrder) {
        structName = 'Partial Order (Poset)';
        structClass = 'is-valid';
      }

      badgeStruct.className = `axiom-badge ${structClass}`;
      badgeStruct.textContent = structName;
    }

    // Telemetry text
    const tel = document.querySelector('#relation-telemetry-content');
    if (tel) {
      const pairsFormatted = pairs.map(([a, b]) => `(${a}, ${b})`).join(', ');

      let diagnostics = '';
      if (!analysis.isReflexive) {
        diagnostics += `<div style="color: #f87171;">Missing self-loops: { ${analysis.missingReflexive.map(x => `(${x}, ${x})`).join(', ')} }</div>`;
      }
      if (!analysis.isSymmetric && analysis.missingSymmetric.length > 0) {
        const miss = analysis.missingSymmetric.map(m => `(${m.missing.join(', ')})`).join(', ');
        diagnostics += `<div style="color: #f87171;">Missing symmetric return edges: { ${miss} }</div>`;
      }
      if (!analysis.isAntisymmetric && analysis.violatedAntisymmetric.length > 0) {
        const viol = analysis.violatedAntisymmetric.map(v => `${v.a} ⇄ ${v.b}`).join(', ');
        diagnostics += `<div style="color: #f59e0b;">Antisymmetry violated by two-way distinct edges: ${viol}</div>`;
      }
      if (!analysis.isTransitive && analysis.missingTransitive.length > 0) {
        const transMiss = analysis.missingTransitive.map(m => `(${m.a}, ${m.b}) & (${m.b}, ${m.c}) ⟹ missing (${m.a}, ${m.c})`).join('; ');
        diagnostics += `<div style="color: #fbbf24;">Transitivity shortcuts missing: ${transMiss}</div>`;
      }

      tel.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Base Set A:</strong> { ${elements.join(', ')} } &nbsp;|&nbsp; <strong>|A|:</strong> ${elements.length}</div>
          <div><strong>Relation R ⊆ A × A:</strong> { ${pairsFormatted || '∅'} } &nbsp;|&nbsp; <strong>|R|:</strong> ${pairs.length}</div>
          ${diagnostics}
        </div>
      `;
    }
  }
}

export function mountRelationsVisual(containers) {
  const controller = new RelationsController();
  controller.mount(containers);
  return controller;
}
