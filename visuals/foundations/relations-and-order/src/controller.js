/**
 * Controller — Relations, Order & Equivalence Partitions
 * Visual Mathematics Lab — Module 2
 */

import { RelationMath, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
import { RelationDigraphView } from './views/RelationDigraphView.js';
import { QuotientClockView } from './views/QuotientClockView.js';
import { PosetHasseView } from './views/PosetHasseView.js';
import { Relations3DView } from './views/Relations3DView.js';

export class RelationsController {
  constructor() {
    this.state = {
      viewMode: 'split', // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 50,
      dualMode: 'matrix', // 'matrix' | 'quotient' | 'poset'
      primaryMode: 'digraph', // 'digraph' | 'matrix' | 'quotient' | 'poset'
      threeMode: 'spatial-digraph', // 'spatial-digraph' | 'matrix-beacons' | 'quotient-3d' | 'poset-3d'
      spatial3D: true, // true (3D WebGL) | false (2D planar)
      cameraPreset: 'iso',
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
    this.threeView = null;
    this.primaryMatrixView = null;
    this.primaryQuotientView = null;
    this.primaryHasseView = null;
    this.containers = null;

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
    this.containers = containers;
    if (containers.digraph) {
      this.digraphView = new RelationDigraphView(containers.digraph, this, containers.matrix);
    }
    if (containers.quotient) {
      this.quotientView = new QuotientClockView(containers.quotient, this);
    }
    if (containers.poset) {
      this.hasseView = new PosetHasseView(containers.poset, this);
    }
    if (containers.three) {
      this.threeView = new Relations3DView(containers.three, this);
    }
    if (containers.primaryMatrix) {
      this.primaryMatrixView = new RelationDigraphView(null, this, containers.primaryMatrix);
    }
    if (containers.primaryQuotient) {
      this.primaryQuotientView = new QuotientClockView(containers.primaryQuotient, this);
    }
    if (containers.primaryPoset) {
      this.primaryHasseView = new PosetHasseView(containers.primaryPoset, this);
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

    // Primary View Mode Bar (Select Any Representation on Left Canvas)
    document.querySelectorAll('[data-primary-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.primaryView;
        this.setPrimaryView(mode);
      });
    });

    // Secondary 3D Mode Bar (Select Any 3D Counterpart on Right Canvas)
    document.querySelectorAll('[data-3d-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset['3dMode'];
        this.set3DMode(mode);
      });
    });

    // 3D Camera Presets (Top, Front, Side, Iso)
    document.querySelectorAll('#camera-presets-bar [data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.setCameraPreset(preset);
      });
    });

    // Spatial 3D Toggle Button (#btn-toggle-dimension-mode)
    const btnToggleDim = document.querySelector('#btn-toggle-dimension-mode');
    if (btnToggleDim) {
      btnToggleDim.addEventListener('click', () => {
        this.toggleSpatial3D();
      });
    }

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

  setPrimaryView(mode) {
    this.state.primaryMode = mode;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-primary-view]').forEach(btn => {
        const isActive = btn.dataset.primaryView === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      const digraphEl = document.querySelector('#digraph-viewport-container');
      const matrixEl = document.querySelector('#primary-matrix-container');
      const quotientEl = document.querySelector('#primary-quotient-container');
      const posetEl = document.querySelector('#primary-poset-container');

      if (digraphEl) digraphEl.style.display = mode === 'digraph' ? 'block' : 'none';
      if (matrixEl) matrixEl.style.display = mode === 'matrix' ? 'flex' : 'none';
      if (quotientEl) quotientEl.style.display = mode === 'quotient' ? 'block' : 'none';
      if (posetEl) posetEl.style.display = mode === 'poset' ? 'block' : 'none';

      const titleName = document.querySelector('#title-primary-name');
      if (titleName) {
        if (mode === 'digraph') titleName.textContent = 'Directed Graph (Digraph)';
        else if (mode === 'matrix') titleName.textContent = 'Boolean Incidence Matrix (A × A)';
        else if (mode === 'quotient') titleName.textContent = 'Equivalence Classes & Modular Clock';
        else if (mode === 'poset') titleName.textContent = 'Poset Hasse Lattice Diagram';
      }
    }

    if (mode === 'digraph') this.digraphView?.resize?.();
    if (mode === 'matrix') this.primaryMatrixView?.resize?.();
    if (mode === 'quotient') this.primaryQuotientView?.render?.();
    if (mode === 'poset') this.primaryHasseView?.render?.();

    this.updateTelemetry();
  }

  set3DMode(mode) {
    this.state.threeMode = mode;
    this.state.spatial3D = true;

    if (typeof document !== 'undefined') {
      const dimStatus = document.querySelector('#toolbar-dimension-status');
      if (dimStatus) {
        dimStatus.textContent = 'ON';
        dimStatus.className = 'toggle-state-text is-on';
      }

      const btnToggleDim = document.querySelector('#btn-toggle-dimension-mode');
      if (btnToggleDim) {
        btnToggleDim.setAttribute('aria-pressed', 'true');
      }

      document.querySelectorAll('#secondary-mode-bar [data-3d-mode]').forEach(btn => {
        const isActive = btn.dataset['3dMode'] === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      document.querySelectorAll('#secondary-mode-bar [data-dual-mode]').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });

      const threeContainer = document.querySelector('#three-viewport-container');
      const matrixSec = document.querySelector('#matrix-viewport-container');
      const quotientSec = document.querySelector('#quotient-viewport-container');
      const posetSec = document.querySelector('#poset-viewport-container');
      const cameraBar = document.querySelector('#camera-presets-bar');

      if (threeContainer) threeContainer.style.display = 'block';
      if (matrixSec) matrixSec.style.display = 'none';
      if (quotientSec) quotientSec.style.display = 'none';
      if (posetSec) posetSec.style.display = 'none';
      if (cameraBar) cameraBar.style.display = 'flex';

      const titleSec = document.querySelector('#title-secondary-name');
      const valDual = document.querySelector('#val-rel-dual-name');
      let titleText = 'Spatial Digraph Network';
      let statsText = '3D Spatial Network (Z/Y Flux)';

      if (mode === 'matrix-beacons') {
        titleText = '3D Boolean Matrix Beacons & Rails';
        statsText = '3D Matrix Beacons (Transposition Arcs)';
      } else if (mode === 'quotient-3d') {
        titleText = '3D Equivalence Partition Torus & Helix Dial';
        statsText = '3D Quotient Torus (Modular Congruence)';
      } else if (mode === 'poset-3d') {
        titleText = '3D Stratified Poset Hasse Tower & Floors';
        statsText = '3D Poset Hasse Tower (Rank Floors)';
      }

      if (titleSec) titleSec.textContent = titleText;
      if (valDual) valDual.textContent = statsText;
    }

    if (this.threeView) {
      this.threeView.setMode(mode);
      this.threeView.render(this.state);
    }
    this.updateTelemetry();
  }

  toggleSpatial3D() {
    this.state.spatial3D = !this.state.spatial3D;
    if (this.state.spatial3D) {
      this.set3DMode(this.state.threeMode);
    } else {
      this.setDualMode(this.state.dualMode);
    }
  }

  setCameraPreset(preset) {
    this.state.cameraPreset = preset;
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#camera-presets-bar [data-preset]').forEach(btn => {
        const isActive = btn.dataset.preset === preset;
        btn.classList.toggle('active', isActive);
      });
    }
    if (this.threeView) {
      this.threeView.setCameraPreset(preset);
    }
  }

  setDualMode(dualMode) {
    this.state.dualMode = dualMode;
    this.state.spatial3D = false;

    if (typeof document !== 'undefined') {
      const dimStatus = document.querySelector('#toolbar-dimension-status');
      if (dimStatus) {
        dimStatus.textContent = 'OFF';
        dimStatus.className = 'toggle-state-text is-off';
      }

      const btnToggleDim = document.querySelector('#btn-toggle-dimension-mode');
      if (btnToggleDim) {
        btnToggleDim.setAttribute('aria-pressed', 'false');
      }

      document.querySelectorAll('#secondary-mode-bar [data-3d-mode]').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });

      document.querySelectorAll('[data-dual-mode]').forEach(btn => {
        const isActive = btn.dataset.dualMode === dualMode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      const threeContainer = document.querySelector('#three-viewport-container');
      const cameraBar = document.querySelector('#camera-presets-bar');
      const matrixMount = document.querySelector('#matrix-viewport-container');
      const quotientMount = document.querySelector('#quotient-viewport-container');
      const posetMount = document.querySelector('#poset-viewport-container');
      const titleSec = document.querySelector('#title-secondary-name');
      const valDual = document.querySelector('#val-rel-dual-name');

      if (threeContainer) threeContainer.style.display = 'none';
      if (cameraBar) cameraBar.style.display = 'none';
      if (matrixMount) matrixMount.style.display = dualMode === 'matrix' ? 'flex' : 'none';
      if (quotientMount) quotientMount.style.display = dualMode === 'quotient' ? 'block' : 'none';
      if (posetMount) posetMount.style.display = dualMode === 'poset' ? 'block' : 'none';

      if (titleSec) {
        if (dualMode === 'matrix') {
          titleSec.innerHTML = 'Boolean Incidence Matrix (<span class="color-sky">M_ii Diagonal</span>, <span class="color-violet">M = Mᵀ Symmetric</span>)';
        } else if (dualMode === 'quotient') {
          titleSec.innerHTML = 'Quotient: Equivalence Classes (<span class="color-sky">Partitions A/~</span>, <span class="color-violet">Clock ℤ/nℤ</span>)';
        } else if (dualMode === 'poset') {
          titleSec.innerHTML = 'Poset: Hasse Lattice Diagram (<span class="color-emerald">Transitive Reduction</span>, <span class="color-amber">Covering Edges</span>)';
        }
      }

      if (valDual) {
        if (dualMode === 'matrix') valDual.textContent = `2D Boolean Matrix (${this.state.elements.length} × ${this.state.elements.length})`;
        else if (dualMode === 'quotient') valDual.textContent = '2D Quotient Dial (ℤ/nℤ)';
        else if (dualMode === 'poset') valDual.textContent = '2D Poset Hasse Lattice';
      }
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
    this.primaryMatrixView?.resize?.();
    if (this.state.primaryMode === 'quotient') this.primaryQuotientView?.render?.();
    if (this.state.primaryMode === 'poset') this.primaryHasseView?.render?.();
    if (this.state.dualMode === 'quotient') this.quotientView?.render?.();
    if (this.state.dualMode === 'poset') this.hasseView?.render?.();
    this.threeView?.resize?.();
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
    this.digraphView?.render?.();
    this.primaryMatrixView?.render?.();
    this.primaryQuotientView?.render?.();
    this.primaryHasseView?.render?.();
    this.quotientView?.render?.();
    this.hasseView?.render?.();
    if (this.threeView && this.state.spatial3D) {
      this.threeView.render(this.state);
    }
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { elements, pairs, dualMode, spatial3D, threeMode } = this.state;
    const analysis = RelationMath.analyzeRelation(elements, pairs);

    const maxEdges = Math.max(1, elements.length * elements.length);
    const densityPct = Math.round((pairs.length / maxEdges) * 100);
    const complementCount = maxEdges - pairs.length;
    const reflCount = elements.length - (analysis.missingReflexive ? analysis.missingReflexive.length : 0);
    const missingSymmCount = analysis.missingSymmetric ? analysis.missingSymmetric.length : 0;
    const violatedAntiCount = analysis.violatedAntisymmetric ? analysis.violatedAntisymmetric.length : 0;
    const missingTransCount = analysis.missingTransitive ? analysis.missingTransitive.length : 0;

    // Check irreflexive
    const isIrreflexive = reflCount === 0;

    // 1. Structure classification
    let structName = 'Arbitrary Binary Relation';
    if (analysis.isTotalOrder) {
      structName = 'Total Order (Linear Chain ≤)';
    } else if (analysis.isPartialOrder) {
      structName = 'Partial Order (Poset DAG)';
    } else if (analysis.isEquivalence) {
      structName = 'Equivalence Relation (Partition A/~)';
    } else if (isIrreflexive && analysis.isTransitive) {
      structName = 'Strict Partial Order (<)';
    } else if (analysis.isReflexive && analysis.isTransitive) {
      structName = 'Preorder (Quasi-Order)';
    } else if (analysis.isReflexive && analysis.isSymmetric) {
      structName = 'Tolerance (Compatibility Relation)';
    }

    // Equivalence classes or Poset Bounds
    let partitionStr = '';
    let eqClasses = [];
    let minima = [];
    let maxima = [];

    if (analysis.isEquivalence) {
      eqClasses = RelationMath.computeEquivalenceClasses(elements, pairs);
      const classStrs = eqClasses.map(c => `{${c.join(',')}}`).join(', ');
      partitionStr = `Quotient A/~: ${eqClasses.length} disjoint classes: ${classStrs}`;
    } else if (analysis.isPartialOrder) {
      const nonLoopPairs = pairs.filter(([a, b]) => a !== b);
      const hasIncoming = new Set(nonLoopPairs.map(([_, b]) => b));
      const hasOutgoing = new Set(nonLoopPairs.map(([a, _]) => a));
      minima = elements.filter(x => !hasIncoming.has(x));
      maxima = elements.filter(x => !hasOutgoing.has(x));
      partitionStr = `Poset Bounds: Minima {${minima.join(',')}}, Maxima {${maxima.join(',')}}`;
    } else {
      partitionStr = `Graph: |V| = ${elements.length}, |E| = ${pairs.length}`;
    }

    // Kuratowski sample pair construction
    const offDiag = pairs.find(([a, b]) => a !== b);
    const samplePair = offDiag || (pairs.length > 0 ? pairs[0] : null);
    let kuratowskiStr = '∅ (Empty relation)';
    let kuratowskiActiveStr = '∅';
    if (samplePair) {
      const [sa, sb] = samplePair;
      if (sa === sb) {
        kuratowskiStr = `(${sa}, ${sa}) ≡ {{${sa}}}`;
        kuratowskiActiveStr = `{{${sa}}}`;
      } else {
        kuratowskiStr = `(${sa}, ${sb}) ≡ {{${sa}}, {${sa}, ${sb}}}`;
        kuratowskiActiveStr = `{{${sa}}, {${sa}, ${sb}}}`;
      }
    }

    // Converse relation R⁻¹ check
    const pairKeySet = new Set(pairs.map(([a, b]) => `${a},${b}`));
    let converseShared = 0;
    for (const [a, b] of pairs) {
      if (pairKeySet.has(`${b},${a}`)) converseShared++;
    }
    let converseStr = '';
    if (analysis.isSymmetric) {
      converseStr = 'R = R⁻¹ (Self-Converse / Symmetric)';
    } else if (analysis.isAntisymmetric && violatedAntiCount === 0) {
      converseStr = `R ∩ R⁻¹ = Δ (Identity diagonal only, ${reflCount} pairs)`;
    } else {
      converseStr = `|R ∩ R⁻¹| = ${converseShared} shared symmetric pairs`;
    }

    // Idempotence M² = M check
    let idempotenceStr = '';
    if (analysis.isTransitive && analysis.isReflexive) {
      idempotenceStr = 'M² = M (Idempotent Closure Saturated)';
    } else if (analysis.isTransitive) {
      idempotenceStr = 'M² ≤ M (Transitive Sub-idempotent)';
    } else {
      idempotenceStr = `M² ≰ M (${missingTransCount} shortcuts expand relation)`;
    }

    // 2. Primary 2D Telemetry Panel Updates
    const elClass = document.querySelector('#tel-rel-class');
    if (elClass) {
      elClass.textContent = structName;
      elClass.className = analysis.isEquivalence || analysis.isPartialOrder || analysis.isTotalOrder ? 'color-lime font-bold' : 'color-yellow font-bold';
    }

    const elRefl = document.querySelector('#tel-rel-refl');
    if (elRefl) {
      elRefl.textContent = analysis.isReflexive
        ? `YES (Tr(M) = ${elements.length}/${elements.length}, all (a,a) present)`
        : `NO (Tr(M) = ${reflCount}/${elements.length}, missing {${analysis.missingReflexive.join(', ')}})`;
      elRefl.className = analysis.isReflexive ? 'color-sky font-bold' : 'color-rose font-bold';
    }

    const elSymm = document.querySelector('#tel-rel-symm');
    if (elSymm) {
      elSymm.textContent = analysis.isSymmetric
        ? 'YES (M = Mᵀ, all (a,b) ⇔ (b,a))'
        : `NO (${missingSymmCount} asymmetric directed arcs)`;
      elSymm.className = analysis.isSymmetric ? 'color-fuchsia font-bold' : 'color-rose font-bold';
    }

    const elAnti = document.querySelector('#tel-rel-antisymm');
    if (elAnti) {
      elAnti.textContent = analysis.isAntisymmetric
        ? 'YES (M ⊙ Mᵀ ≤ I, no bidirectional 2-cycles)'
        : `NO (${violatedAntiCount} bidirectional 2-cycles)`;
      elAnti.className = analysis.isAntisymmetric ? 'color-teal font-bold' : 'color-slate font-bold';
    }

    const elTrans = document.querySelector('#tel-rel-trans');
    if (elTrans) {
      elTrans.textContent = analysis.isTransitive
        ? 'YES (M² ≤ M, 0 missing shortcuts)'
        : `NO (M² ≰ M, ${missingTransCount} missing shortcuts)`;
      elTrans.className = analysis.isTransitive ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elKuratowskiSample = document.querySelector('#tel-rel-kuratowski-sample');
    if (elKuratowskiSample) elKuratowskiSample.textContent = kuratowskiStr;

    const elKuratowskiStats = document.querySelector('#tel-rel-kuratowski-stats');
    if (elKuratowskiStats) {
      elKuratowskiStats.textContent = `|R| = ${pairs.length} / ${maxEdges} Kuratowski pairs (${densityPct}% density)`;
    }

    const elComplement = document.querySelector('#tel-rel-complement');
    if (elComplement) {
      elComplement.textContent = `|Rᶜ| = ${complementCount} missing pairs (${Math.round((complementCount / maxEdges) * 100)}%)`;
    }

    const elConverse = document.querySelector('#tel-rel-converse');
    if (elConverse) elConverse.textContent = converseStr;

    const elIdempotence = document.querySelector('#tel-rel-idempotence');
    if (elIdempotence) elIdempotence.textContent = idempotenceStr;

    const elPartitionStructure = document.querySelector('#tel-rel-partition-structure');
    if (elPartitionStructure) elPartitionStructure.textContent = partitionStr;

    // Backward-compat count fields if present
    const elV = document.querySelector('#tel-rel-vcount');
    if (elV) elV.textContent = `${elements.length} vertices: { ${elements.join(', ')} }`;
    const elE = document.querySelector('#tel-rel-ecount');
    if (elE) elE.textContent = `${pairs.length} directed edges`;
    const elDensity = document.querySelector('#tel-rel-density');
    if (elDensity) elDensity.textContent = `${densityPct}% (${pairs.length}/${maxEdges})`;

    // 3. Secondary Dual / 3D Telemetry Panel Updates
    const elDualName = document.querySelector('#val-rel-dual-name');
    if (elDualName) {
      if (spatial3D) {
        if (threeMode === 'spatial-digraph') elDualName.textContent = '3D Spatial Network (Z/Y Flux)';
        else if (threeMode === 'matrix-beacons') elDualName.textContent = '3D Boolean Matrix (Beacons & Rail)';
        else if (threeMode === 'quotient-3d') elDualName.textContent = '3D Quotient Equivalence Dial';
        else if (threeMode === 'poset-3d') elDualName.textContent = '3D Poset Hasse Tower';
      } else {
        elDualName.textContent = dualMode === 'matrix'
          ? `Boolean Matrix (${elements.length} × ${elements.length})`
          : (dualMode === 'quotient' ? 'Quotient Dial (ℤ/nℤ)' : 'Poset Hasse Lattice');
      }
    }

    const elTrace = document.querySelector('#val-rel-trace');
    if (elTrace) elTrace.textContent = `${reflCount} / ${elements.length} on diagonal`;

    const elSymmCheck = document.querySelector('#val-rel-symm-check');
    if (elSymmCheck) {
      elSymmCheck.textContent = analysis.isSymmetric
        ? 'M = Mᵀ (Symmetric Reflection)'
        : `M ≠ Mᵀ (${missingSymmCount} asymmetric)`;
      elSymmCheck.className = analysis.isSymmetric ? 'color-fuchsia font-bold' : 'color-rose font-bold';
    }

    const elTransSquare = document.querySelector('#val-rel-trans-square');
    if (elTransSquare) {
      elTransSquare.textContent = analysis.isTransitive
        ? 'M² ≤ M (0 Transitive Violations)'
        : `M² ≰ M (${missingTransCount} violations)`;
      elTransSquare.className = analysis.isTransitive ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elKuratowskiActive = document.querySelector('#val-rel-kuratowski-active');
    if (elKuratowskiActive) elKuratowskiActive.textContent = kuratowskiActiveStr;

    const elDualDensity = document.querySelector('#val-rel-density');
    if (elDualDensity) elDualDensity.textContent = `${densityPct}% (${pairs.length} ones, ${complementCount} zeroes)`;

    const elClasses = document.querySelector('#val-rel-quotient-classes');
    if (elClasses) {
      elClasses.textContent = analysis.isEquivalence
        ? `${eqClasses.length} disjoint classes (${eqClasses.map(c => '{' + c.join(',') + '}').join(' ∪ ')})`
        : `Non-partition (${missingSymmCount > 0 ? 'asymmetric' : 'non-transitive'})`;
    }

    const elClock = document.querySelector('#val-rel-clock');
    if (elClock) elClock.textContent = `ℤ/${elements.length}ℤ modular dial`;

    const elMaxima = document.querySelector('#val-rel-maxima');
    if (elMaxima) {
      elMaxima.textContent = analysis.isPartialOrder
        ? `Minima: {${minima.join(',')}} | Maxima: {${maxima.join(',')}}`
        : 'None (Cycles present)';
    }

    const elCover = document.querySelector('#val-rel-cover');
    if (elCover) {
      elCover.textContent = analysis.isPartialOrder ? 'Transitive reduction active' : 'N/A';
    }

    const elSpatialStat = document.querySelector('#val-rel-spatial-stat');
    if (elSpatialStat) {
      if (spatial3D) {
        if (threeMode === 'spatial-digraph') {
          elSpatialStat.textContent = `${elements.length} Spheres, ${pairs.filter(([a,b])=>a!==b).length} Tubes, ${reflCount} Tori`;
        } else if (threeMode === 'matrix-beacons') {
          elSpatialStat.textContent = `${pairs.length} Beacons, ${reflCount} Diagonal Beacons`;
        } else if (threeMode === 'quotient-3d') {
          elSpatialStat.textContent = `${eqClasses.length || 1} Halo Rings, ${pairs.length} Conduits`;
        } else if (threeMode === 'poset-3d') {
          elSpatialStat.textContent = `${elements.length} Stratified Floor Spheres`;
        }
      } else {
        elSpatialStat.textContent = '2D Planar Projection active';
      }
    }

    // Render 3D if active
    if (this.threeView && this.state.spatial3D) {
      this.threeView.render(this.state);
    }
  }
}

export function mountRelationsVisual(containers) {
  const controller = new RelationsController();
  controller.mount(containers);
  return controller;
}
