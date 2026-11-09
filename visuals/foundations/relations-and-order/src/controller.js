/**
 * Controller — Relations, Order & Equivalence Partitions
 * Visual Mathematics Lab — Module 2
 */

import { RelationMath, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
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
      const telEl = document.getElementById('telemetry-panel');
      if (telEl) {
        this.telemetryPanel = new TelemetryPanel(telEl, {
          header: document.getElementById('telemetry-header'),
          toggleButton: document.getElementById('telemetry-toggle-btn'),
          body: document.getElementById('telemetry-body'),
        });
      }
      const stats3d = document.getElementById('stats-3d');
      if (stats3d) {
        this.stats3dPanel = new TelemetryPanel(stats3d, {
          header: document.getElementById('stats-3d-header'),
          toggleButton: document.getElementById('toggle-stats-3d'),
          body: document.getElementById('stats-3d-body'),
        });
      }

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

    const { elements, pairs, dualMode } = this.state;
    const analysis = RelationMath.analyzeRelation(elements, pairs);

    // 1. Structure classification
    let structName = 'Arbitrary Relation';
    if (analysis.isEquivalence) {
      structName = 'Equivalence Relation (Partition)';
    } else if (analysis.isTotalOrder) {
      structName = 'Total Order (Chain)';
    } else if (analysis.isPartialOrder) {
      structName = 'Partial Order (Poset)';
    }

    // 2. Primary 2D Telemetry Panel
    const elClass = document.querySelector('#tel-rel-class');
    if (elClass) {
      elClass.textContent = structName;
      elClass.className = analysis.isEquivalence || analysis.isPartialOrder ? 'color-lime font-bold' : 'color-yellow font-bold';
    }

    const elRefl = document.querySelector('#tel-rel-refl');
    if (elRefl) {
      elRefl.textContent = analysis.isReflexive ? 'YES (All (a,a) present)' : 'NO (Missing loops)';
      elRefl.className = analysis.isReflexive ? 'color-sky font-bold' : 'color-rose font-bold';
    }

    const elSymm = document.querySelector('#tel-rel-symm');
    if (elSymm) {
      elSymm.textContent = analysis.isSymmetric ? 'YES (M = Mᵀ)' : 'NO (Asymmetric arcs)';
      elSymm.className = analysis.isSymmetric ? 'color-fuchsia font-bold' : 'color-rose font-bold';
    }

    const elAnti = document.querySelector('#tel-rel-antisymm');
    if (elAnti) {
      elAnti.textContent = analysis.isAntisymmetric ? 'YES (No 2-cycles)' : 'NO (2-way distinct edges)';
      elAnti.className = analysis.isAntisymmetric ? 'color-teal font-bold' : 'color-slate font-bold';
    }

    const elTrans = document.querySelector('#tel-rel-trans');
    if (elTrans) {
      elTrans.textContent = analysis.isTransitive ? 'YES (M² ≤ M)' : 'NO (Missing shortcuts)';
      elTrans.className = analysis.isTransitive ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elV = document.querySelector('#tel-rel-vcount');
    if (elV) elV.textContent = `${elements.length} vertices: { ${elements.join(', ')} }`;

    const elE = document.querySelector('#tel-rel-ecount');
    if (elE) elE.textContent = `${pairs.length} directed edges`;

    const maxEdges = Math.max(1, elements.length * elements.length);
    const densityPct = Math.round((pairs.length / maxEdges) * 100);
    const elDensity = document.querySelector('#tel-rel-density');
    if (elDensity) elDensity.textContent = `${densityPct}% (${pairs.length}/${maxEdges})`;

    // 3. Secondary Dual / 3D Telemetry Panel
    const elDualName = document.querySelector('#val-rel-dual-name');
    if (elDualName) {
      elDualName.textContent = dualMode === 'matrix'
        ? `Boolean Matrix (${elements.length} × ${elements.length})`
        : (dualMode === 'quotient' ? 'Quotient Dial (ℤ/nℤ)' : 'Poset Hasse Lattice');
    }

    const reflCount = elements.length - (analysis.missingReflexive ? analysis.missingReflexive.length : 0);
    const elTrace = document.querySelector('#val-rel-trace');
    if (elTrace) elTrace.textContent = `${reflCount} / ${elements.length} on diagonal`;

    const elSymmCheck = document.querySelector('#val-rel-symm-check');
    if (elSymmCheck) {
      elSymmCheck.textContent = analysis.isSymmetric ? 'M = Mᵀ (Symmetric)' : 'M ≠ Mᵀ';
      elSymmCheck.className = analysis.isSymmetric ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elClasses = document.querySelector('#val-rel-quotient-classes');
    if (elClasses) {
      elClasses.textContent = analysis.isEquivalence
        ? 'Partitions into disjoint classes'
        : 'Non-partition (violates equivalence)';
    }

    const elClock = document.querySelector('#val-rel-clock');
    if (elClock) elClock.textContent = `ℤ/${elements.length}ℤ modular dial`;

    const elMaxima = document.querySelector('#val-rel-maxima');
    if (elMaxima) {
      elMaxima.textContent = analysis.isPartialOrder
        ? 'Topological sorting valid'
        : 'Cycles present (DAG violated)';
    }

    const elCover = document.querySelector('#val-rel-cover');
    if (elCover) {
      elCover.textContent = analysis.isPartialOrder ? 'Transitive reduction active' : 'N/A';
    }
  }
}

export function mountRelationsVisual(containers) {
  const controller = new RelationsController();
  controller.mount(containers);
  return controller;
}
