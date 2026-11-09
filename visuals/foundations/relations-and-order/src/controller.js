/**
 * Controller — Relations, Order & Equivalence Partitions
 * Visual Mathematics Lab — Module 2
 */

import { RelationMath, DraggableToolbar, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
import { RelationDigraphView } from './views/RelationDigraphView.js';
import { QuotientClockView } from './views/QuotientClockView.js';
import { PosetHasseView } from './views/PosetHasseView.js';

export class RelationsController {
  constructor() {
    this.state = {
      viewMode: 'split', // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 50,
      dualMode: 'matrix', // 'matrix' | 'quotient' | 'poset'
      activeMode: 'digraph', // backward compatibility
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
      this.digraphView = new RelationDigraphView(containers.digraph, this, containers.matrix);
    }
    if (containers.quotient) {
      this.quotientView = new QuotientClockView(containers.quotient, this);
    }
    if (containers.poset) {
      this.hasseView = new PosetHasseView(containers.poset, this);
    }

    this.bindDomControls();
    this.enableResizerDrag();
    this.updateAll();

    if (typeof document !== 'undefined') {
      const toolbarEl = document.getElementById('viewport-toolbar');
      const handleEl = document.getElementById('toolbar-drag-handle');
      if (toolbarEl) {
        this.draggableToolbar = new DraggableToolbar(toolbarEl, handleEl);
      }
      const fullscreenBtn = document.getElementById('fullscreen-btn');
      const explorer = document.querySelector('.circle-explorer');
      if (fullscreenBtn && explorer) {
        bindFullscreen(fullscreenBtn, explorer);
      }
      initCollapsibleSections(explorer || document);
    }
  }

  bindDomControls() {
    if (typeof document === 'undefined') return;

    // View Mode Switcher: Split / Digraph (2D) / Dual View (3D)
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.viewMode;
        this.setViewMode(mode);
      });
    });

    // Dual Mode Switcher: Matrix / Quotient / Poset
    document.querySelectorAll('[data-dual-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dualMode = e.currentTarget.dataset.dualMode;
        this.setDualMode(dualMode);
      });
    });

    // Flip button: Toggle horizontal vs vertical split
    document.querySelector('#split-dir-btn')?.addEventListener('click', () => {
      this.toggleSplitDirection();
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
    let canonicalMode = mode;
    if (mode === 'digraph') {
      canonicalMode = '2d';
    } else if (mode === 'quotient') {
      canonicalMode = '3d';
      this.setDualMode('quotient');
    } else if (mode === 'poset') {
      canonicalMode = '3d';
      this.setDualMode('poset');
    }

    this.state.viewMode = canonicalMode;
    this.state.activeMode = canonicalMode === '2d' ? 'digraph' : (canonicalMode === '3d' ? this.state.dualMode : 'digraph');

    if (typeof document !== 'undefined') {
      const mainView = document.querySelector('#main-view');
      if (mainView) {
        mainView.className = `view-container layout-${canonicalMode} ${this.state.splitDirection}-split`;
      }

      document.querySelectorAll('[data-view-mode]').forEach(btn => {
        const isMatch = btn.dataset.viewMode === canonicalMode;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });

      const flipBtn = document.querySelector('#split-dir-btn');
      if (flipBtn) {
        flipBtn.style.display = canonicalMode === 'split' ? '' : 'none';
      }
    }

    this.resizeAllViews();
    this.updateTelemetry();
  }

  toggleSplitDirection() {
    this.state.splitDirection = this.state.splitDirection === 'horizontal' ? 'vertical' : 'horizontal';
    if (typeof document !== 'undefined') {
      const mainView = document.querySelector('#main-view');
      if (mainView) {
        mainView.className = `view-container layout-${this.state.viewMode} ${this.state.splitDirection}-split`;
      }
      const flipBtn = document.querySelector('#split-dir-btn');
      if (flipBtn) {
        flipBtn.setAttribute('title', this.state.splitDirection === 'horizontal'
          ? 'Switch to vertical split (stacked)'
          : 'Switch to horizontal split (side-by-side)');
      }
    }
    this.resizeAllViews();
  }

  setDualMode(dualMode) {
    this.state.dualMode = dualMode;

    if (typeof document !== 'undefined') {
      const matrixMount = document.querySelector('#matrix-viewport-container');
      const quotientMount = document.querySelector('#quotient-viewport-container');
      const posetMount = document.querySelector('#poset-viewport-container');
      const titleSec = document.querySelector('#view-title-secondary');

      if (matrixMount) matrixMount.style.display = dualMode === 'matrix' ? 'flex' : 'none';
      if (quotientMount) quotientMount.style.display = dualMode === 'quotient' ? 'block' : 'none';
      if (posetMount) posetMount.style.display = dualMode === 'poset' ? 'block' : 'none';

      if (titleSec) {
        if (dualMode === 'matrix') {
          titleSec.innerHTML = 'Matrix: Boolean Incidence Matrix (<span class="color-sky">M_ii Diagonal</span>, <span class="color-violet">M = Mᵀ Symmetric</span>)';
        } else if (dualMode === 'quotient') {
          titleSec.innerHTML = 'Quotient: Equivalence Classes (<span class="color-sky">Partitions A/~</span>, <span class="color-violet">Clock ℤ/nℤ</span>)';
        } else if (dualMode === 'poset') {
          titleSec.innerHTML = 'Poset: Hasse Lattice Diagram (<span class="color-emerald">Transitive Reduction</span>, <span class="color-amber">Covering Edges</span>)';
        }
      }

      document.querySelectorAll('[data-dual-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dualMode === dualMode);
      });
    }

    this.updateAll();
  }

  enableResizerDrag() {
    if (typeof document === 'undefined') return;
    const resizer = document.querySelector('#viewport-resizer');
    const mainView = document.querySelector('#main-view');
    const container2d = document.querySelector('#canvas-2d-container');
    const container3d = document.querySelector('#canvas-3d-container');
    if (!resizer || !mainView || !container2d || !container3d) return;

    let isDragging = false;

    resizer.addEventListener('pointerdown', (e) => {
      isDragging = true;
      resizer.classList.add('active');
      resizer.setPointerCapture?.(e.pointerId);
    });

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rect = mainView.getBoundingClientRect();
      let ratio;
      if (this.state.splitDirection === 'horizontal') {
        ratio = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        ratio = ((e.clientY - rect.top) / rect.height) * 100;
      }
      ratio = Math.max(20, Math.min(80, ratio));
      this.state.splitRatio = ratio;

      container2d.style.flexBasis = `${ratio}%`;
      container3d.style.flexBasis = `${100 - ratio}%`;
      this.resizeAllViews();
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('active');
      try { resizer.releasePointerCapture?.(e.pointerId); } catch (_) {}
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  resizeAllViews() {
    this.digraphView?.resize?.();
    if (this.state.dualMode === 'quotient') this.quotientView?.render?.();
    if (this.state.dualMode === 'poset') this.hasseView?.render?.();
  }

  applyPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return;

    this.state.currentPresetId = presetId;
    this.state.elements = [...preset.elements];
    this.state.pairs = preset.pairs.map(p => [...p]);

    if (presetId === 'equivalence' || presetId === 'modular_z3') {
      this.setDualMode('quotient');
    } else if (presetId === 'partial_order' || presetId === 'total_order' || presetId === 'strict_order') {
      this.setDualMode('poset');
    } else {
      this.setDualMode('matrix');
    }

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
