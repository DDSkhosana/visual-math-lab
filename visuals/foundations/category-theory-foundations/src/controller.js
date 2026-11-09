/**
 * CategoryTheoryController — State Management & Orchestrator
 * Canonical Split-Viewport Architecture & Morphism Composition Coordinate Grid
 * Visual Mathematics Lab — Module 4: Category Theory & Universal Properties
 */

import { CategoryMath, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
import { CategoryDerivations } from '../../js/foundations-derivations.js';
import { CommutativeDiagramView } from './views/CommutativeDiagramView.js';
import { CompositionGridView } from './views/CompositionGridView.js';
import { MonoEpiProbeView } from './views/MonoEpiProbeView.js';
import { FactorizationView } from './views/FactorizationView.js';
import { Category3DView } from './views/Category3DView.js';

export class CategoryTheoryController {
  constructor() {
    this.state = {
      viewMode: 'split',            // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 50,
      dualMode: 'composition',      // 'composition' | 'factorization' | 'probe'
      primaryMode: 'diagram',       // 'diagram' | 'composition' | 'factorization' | 'probe'
      threeMode: 'spatial-simplex', // 'spatial-simplex' | 'composition-3d' | 'universal-cone' | 'functor-3d'
      spatial3D: true,              // true (3D WebGL) | false (2D planar)
      cameraPreset: 'iso',

      activeMode: 'commutative',    // backward compatibility: 'commutative' | 'probe' | 'factorization'
      diagramType: 'triangle',      // 'triangle' | 'square' | 'product'
      triangleCommutes: true,
      squareCommutes: true,

      // Objects & Triangle Morphisms for Composition Grid & Commutative Diagram
      objectsA: [1, 2, 3],
      objectsB: [1, 2, 3],
      objectsC: [1, 2, 3],
      triangleF: [
        [1, 1],
        [2, 2],
        [3, 3]
      ],
      triangleG: [
        [1, 1],
        [2, 2],
        [3, 3]
      ],
      triangleH: [
        [1, 1],
        [2, 2],
        [3, 3]
      ],
      
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
    this.compositionGridView = null;
    this.probeView = null;
    this.factorizationView = null;
    this.threeView = null;
    this.primaryCompositionView = null;
    this.primaryFactorizationView = null;
    this.primaryProbeView = null;

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
    if (containers.compositionGrid) {
      this.compositionGridView = new CompositionGridView(containers.compositionGrid, this);
    }
    if (containers.probe) {
      this.probeView = new MonoEpiProbeView(containers.probe, this);
    }
    if (containers.factorization) {
      this.factorizationView = new FactorizationView(containers.factorization, this);
    }
    if (containers.three) {
      this.threeView = new Category3DView(containers.three);
    }
    if (containers.primaryComposition) {
      this.primaryCompositionView = new CompositionGridView(containers.primaryComposition, this);
    }
    if (containers.primaryProbe) {
      this.primaryProbeView = new MonoEpiProbeView(containers.primaryProbe, this);
    }
    if (containers.primaryFactorization) {
      this.primaryFactorizationView = new FactorizationView(containers.primaryFactorization, this);
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
      const liveDerivContainer = document.getElementById('live-derivations-content');
      if (liveDerivContainer) {
        this.derivations = new CategoryDerivations(liveDerivContainer);
      }
      initCollapsibleSections(explorer || document);
    }
  }

  bindDomControls() {
    if (typeof document === 'undefined') return;

    // View Mode Switcher ('split' | '2d' | '3d' or legacy 'commutative' | 'probe' | 'factorization')
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.viewMode;
        this.setViewMode(mode);
      });
    });

    // Split Direction Flip button (#split-dir-btn)
    const splitDirBtn = document.querySelector('#split-dir-btn');
    if (splitDirBtn) {
      splitDirBtn.addEventListener('click', () => {
        this.toggleSplitDirection();
      });
    }

    // Primary Representation Mode Bar
    document.querySelectorAll('[data-primary-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const primaryView = e.currentTarget.dataset.primaryView;
        this.setPrimaryView(primaryView);
      });
    });

    // Secondary 3D Counterpart Mode Bar
    document.querySelectorAll('[data-3d-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const threeMode = e.currentTarget.dataset['3dMode'];
        this.set3DMode(threeMode);
      });
    });

    // Dual Mode Switcher (2D Fallback)
    document.querySelectorAll('#secondary-mode-bar [data-dual-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dualMode = e.currentTarget.dataset.dualMode;
        this.setDualMode(dualMode);
      });
    });

    // Camera Presets Bar
    document.querySelectorAll('#camera-presets-bar [data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.setCameraPreset(preset);
      });
    });

    // Spatial 3D Toggle
    document.querySelector('#btn-toggle-dimension-mode')?.addEventListener('click', () => {
      this.toggleSpatial3D();
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
    if (typeof document === 'undefined') {
      if (['commutative', 'probe', 'factorization'].includes(mode)) {
        this.state.activeMode = mode;
      }
      return;
    }

    // Handle legacy view modes
    if (mode === 'commutative') {
      this.state.activeMode = 'commutative';
      mode = 'split';
    } else if (mode === 'probe') {
      this.state.activeMode = 'probe';
      this.setDualMode('probe');
      return;
    } else if (mode === 'factorization') {
      this.state.activeMode = 'factorization';
      this.setDualMode('factorization');
      return;
    }

    this.state.viewMode = mode;

    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      const bMode = btn.dataset.viewMode;
      const isActive = bMode === mode || (mode === 'split' && bMode === 'commutative');
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    const mainView = document.querySelector('#main-view');
    const container2D = document.querySelector('#canvas-2d-container');
    const resizer = document.querySelector('#viewport-resizer');
    const container3D = document.querySelector('#canvas-3d-container');

    if (mode === 'split') {
      if (mainView) {
        mainView.classList.remove('layout-2d-only', 'layout-3d-only');
        mainView.classList.add('layout-split');
      }
      if (container2D) {
        container2D.style.display = 'block';
        container2D.style.flex = `0 0 ${this.state.splitRatio}%`;
      }
      if (resizer) resizer.style.display = 'block';
      if (container3D) {
        container3D.style.display = 'block';
        container3D.style.flex = `1 1 0%`;
      }
    } else if (mode === '2d') {
      if (mainView) {
        mainView.classList.remove('layout-split', 'layout-3d-only');
        mainView.classList.add('layout-2d-only');
      }
      if (container2D) {
        container2D.style.display = 'block';
        container2D.style.flex = '1 1 100%';
      }
      if (resizer) resizer.style.display = 'none';
      if (container3D) container3D.style.display = 'none';
    } else if (mode === '3d') {
      if (mainView) {
        mainView.classList.remove('layout-split', 'layout-2d-only');
        mainView.classList.add('layout-3d-only');
      }
      if (container2D) container2D.style.display = 'none';
      if (resizer) resizer.style.display = 'none';
      if (container3D) {
        container3D.style.display = 'block';
        container3D.style.flex = '1 1 100%';
      }
    }

    this.resizeAllViews();
  }

  toggleSplitDirection() {
    this.state.splitDirection = this.state.splitDirection === 'horizontal' ? 'vertical' : 'horizontal';
    if (typeof document !== 'undefined') {
      const mainView = document.querySelector('#main-view');
      if (mainView) {
        mainView.classList.toggle('horizontal-split', this.state.splitDirection === 'horizontal');
        mainView.classList.toggle('vertical-split', this.state.splitDirection === 'vertical');
      }
    }
    this.resizeAllViews();
  }

  setPrimaryView(view) {
    this.state.primaryMode = view;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('#primary-mode-bar [data-primary-view]').forEach(btn => {
        const isMatch = btn.dataset.primaryView === view;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });

      const commEl = document.querySelector('#commutative-viewport-container');
      const compEl = document.querySelector('#primary-composition-container');
      const factEl = document.querySelector('#primary-factorization-container');
      const probeEl = document.querySelector('#primary-probe-container');

      if (commEl) commEl.style.display = view === 'diagram' ? 'block' : 'none';
      if (compEl) compEl.style.display = view === 'composition' ? 'block' : 'none';
      if (factEl) factEl.style.display = view === 'factorization' ? 'block' : 'none';
      if (probeEl) probeEl.style.display = view === 'probe' ? 'block' : 'none';
    }

    if (view === 'diagram') this.commutativeView?.render();
    if (view === 'composition') (this.primaryCompositionView || this.compositionGridView)?.render();
    if (view === 'factorization') (this.primaryFactorizationView || this.factorizationView)?.render();
    if (view === 'probe') (this.primaryProbeView || this.probeView)?.render();

    this.updateTelemetry();
  }

  set3DMode(threeMode) {
    this.state.threeMode = threeMode;
    this.state.spatial3D = true;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('#secondary-mode-bar [data-3d-mode]').forEach(btn => {
        const isMatch = btn.dataset['3dMode'] === threeMode;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });
      document.querySelectorAll('#secondary-mode-bar [data-dual-mode]').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });

      const threeContainer = document.querySelector('#three-viewport-container');
      const compSec = document.querySelector('#composition-grid-container');
      const probeSec = document.querySelector('#probe-viewport-container');
      const factSec = document.querySelector('#factorization-viewport-container');

      if (threeContainer) threeContainer.style.display = 'block';
      if (compSec) compSec.style.display = 'none';
      if (probeSec) probeSec.style.display = 'none';
      if (factSec) factSec.style.display = 'none';

      const statusEl = document.querySelector('#toolbar-dimension-status');
      if (statusEl) {
        statusEl.textContent = 'ON';
        statusEl.className = 'color-sky';
      }

      const titleName = document.querySelector('#title-secondary-name');
      if (titleName) {
        if (threeMode === 'spatial-simplex') titleName.textContent = 'Spatial Commutative Simplex';
        else if (threeMode === 'composition-3d') titleName.textContent = '3D Composition Landscape';
        else if (threeMode === 'universal-cone') titleName.textContent = '3D Universal Cone & Factorization';
        else if (threeMode === 'functor-3d') titleName.textContent = '3D Functorial Sheets & Transformations';
      }
    }

    if (this.threeView) {
      this.threeView.setMode(threeMode);
      this.threeView.render(this.state);
    }
    this.updateTelemetry();
  }

  setCameraPreset(preset) {
    this.state.cameraPreset = preset;
    if (this.threeView) {
      this.threeView.setCameraPreset(preset);
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#camera-presets-bar [data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
      });
    }
  }

  toggleSpatial3D() {
    this.state.spatial3D = !this.state.spatial3D;

    if (typeof document !== 'undefined') {
      const statusEl = document.querySelector('#toolbar-dimension-status');
      if (statusEl) {
        statusEl.textContent = this.state.spatial3D ? 'ON' : 'OFF';
        statusEl.className = this.state.spatial3D ? 'color-sky' : 'color-slate';
      }

      const threeContainer = document.querySelector('#three-viewport-container');
      const compSec = document.querySelector('#composition-grid-container');
      const probeSec = document.querySelector('#probe-viewport-container');
      const factSec = document.querySelector('#factorization-viewport-container');

      if (this.state.spatial3D) {
        if (threeContainer) threeContainer.style.display = 'block';
        if (compSec) compSec.style.display = 'none';
        if (probeSec) probeSec.style.display = 'none';
        if (factSec) factSec.style.display = 'none';
        if (this.threeView) this.threeView.render(this.state);
      } else {
        if (threeContainer) threeContainer.style.display = 'none';
        if (compSec) compSec.style.display = this.state.dualMode === 'composition' ? 'block' : 'none';
        if (probeSec) probeSec.style.display = this.state.dualMode === 'probe' ? 'block' : 'none';
        if (factSec) factSec.style.display = this.state.dualMode === 'factorization' ? 'block' : 'none';
      }
    }
    this.updateTelemetry();
  }

  setDualMode(dualMode) {
    this.state.dualMode = dualMode;
    this.state.spatial3D = false;

    if (dualMode === 'probe') {
      this.state.activeMode = 'probe';
    } else if (dualMode === 'factorization') {
      this.state.activeMode = 'factorization';
    } else {
      this.state.activeMode = 'commutative';
    }

    if (typeof document !== 'undefined') {
      document.querySelectorAll('#secondary-mode-bar [data-dual-mode]').forEach(btn => {
        const isActive = btn.dataset.dualMode === dualMode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      document.querySelectorAll('#secondary-mode-bar [data-3d-mode]').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });

      const statusEl = document.querySelector('#toolbar-dimension-status');
      if (statusEl) {
        statusEl.textContent = 'OFF';
        statusEl.className = 'color-slate';
      }

      const threeContainer = document.querySelector('#three-viewport-container');
      const compGridSec = document.querySelector('#composition-grid-container');
      const probeSec = document.querySelector('#probe-viewport-container');
      const factSec = document.querySelector('#factorization-viewport-container');

      if (threeContainer) threeContainer.style.display = 'none';
      if (compGridSec) compGridSec.style.display = dualMode === 'composition' ? 'block' : 'none';
      if (probeSec) probeSec.style.display = dualMode === 'probe' ? 'block' : 'none';
      if (factSec) factSec.style.display = dualMode === 'factorization' ? 'block' : 'none';
    }

    if (dualMode === 'composition') this.compositionGridView?.render();
    if (dualMode === 'probe') this.probeView?.render();
    if (dualMode === 'factorization') this.factorizationView?.render();

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
      this.compositionGridView?.render();
      this.updateTelemetry();
    }
  }

  setTriangleMapping(morphism, src, tgt) {
    if (morphism === 'f') {
      const idx = this.state.triangleF.findIndex(([s]) => s === src);
      if (idx >= 0) this.state.triangleF[idx] = [src, tgt];
      else this.state.triangleF.push([src, tgt]);
    } else if (morphism === 'g') {
      const idx = this.state.triangleG.findIndex(([s]) => s === src);
      if (idx >= 0) this.state.triangleG[idx] = [src, tgt];
      else this.state.triangleG.push([src, tgt]);
    } else if (morphism === 'h') {
      const idx = this.state.triangleH.findIndex(([s]) => s === src);
      if (idx >= 0) this.state.triangleH[idx] = [src, tgt];
      else this.state.triangleH.push([src, tgt]);
    }

    // Recheck commutativity: g ∘ f == h
    const comp = CategoryMath.comparePathCompositions(
      this.state.triangleF,
      this.state.triangleG,
      this.state.triangleH,
      this.state.objectsA
    );
    this.state.triangleCommutes = comp.commutes;

    this.commutativeView?.render();
    this.compositionGridView?.render();
    this.updateTelemetry();
  }

  syncTriangleComposition() {
    this.state.triangleH = CategoryMath.composeMorphisms(this.state.triangleF, this.state.triangleG);
    this.state.triangleCommutes = true;
    this.commutativeView?.render();
    this.compositionGridView?.render();
    this.updateTelemetry();
  }

  perturbTriangleDirectMorphism() {
    // Modify last mapping of h so it differs from g(f(last))
    const lastA = this.state.objectsA[this.state.objectsA.length - 1];
    const fMap = new Map(this.state.triangleF);
    const gMap = new Map(this.state.triangleG);
    const gfa = gMap.get(fMap.get(lastA)) || 1;
    
    // Choose different codomain target
    const targets = this.state.objectsC;
    const diffTarget = targets.find(t => t !== gfa) || (gfa === 1 ? 2 : 1);

    const idx = this.state.triangleH.findIndex(([s]) => s === lastA);
    if (idx >= 0) this.state.triangleH[idx] = [lastA, diffTarget];
    else this.state.triangleH.push([lastA, diffTarget]);

    this.state.triangleCommutes = false;
    this.commutativeView?.render();
    this.compositionGridView?.render();
    this.updateTelemetry();
  }

  toggleTriangleCommutativity(commutes) {
    const shouldCommute = typeof commutes === 'boolean' ? commutes : !this.state.triangleCommutes;
    if (shouldCommute) {
      this.syncTriangleComposition();
    } else {
      this.perturbTriangleDirectMorphism();
    }
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
    this.state.triangleF = [[1, 1], [2, 2], [3, 3]];
    this.state.triangleG = [[1, 1], [2, 2], [3, 3]];
    this.state.triangleH = [[1, 1], [2, 2], [3, 3]];
    this.state.triangleCommutes = true;
    this.state.squareCommutes = true;
    this.setViewMode('split');
    this.setDualMode('composition');
  }

  updateAll() {
    this.commutativeView?.render();
    this.compositionGridView?.render();
    this.probeView?.render();
    this.factorizationView?.render();
    this.updateTelemetry();
  }

  resizeAllViews() {
    this.commutativeView?.render();
    if (this.state.primaryMode === 'composition') (this.primaryCompositionView || this.compositionGridView)?.render();
    if (this.state.primaryMode === 'factorization') (this.primaryFactorizationView || this.factorizationView)?.render();
    if (this.state.primaryMode === 'probe') (this.primaryProbeView || this.probeView)?.render();

    if (this.state.spatial3D && this.threeView) {
      this.threeView.resize();
    } else {
      if (this.state.dualMode === 'composition') this.compositionGridView?.render();
      if (this.state.dualMode === 'probe') this.probeView?.render();
      if (this.state.dualMode === 'factorization') this.factorizationView?.render();
    }
  }

  enableResizerDrag() {
    if (typeof document === 'undefined') return;
    const resizer = document.querySelector('#viewport-resizer');
    const mainView = document.querySelector('#main-view');
    const container2D = document.querySelector('#canvas-2d-container');

    if (!resizer || !mainView || !container2D) return;

    let isDragging = false;

    resizer.addEventListener('pointerdown', (e) => {
      isDragging = true;
      resizer.setPointerCapture(e.pointerId);
      document.body.style.cursor = this.state.splitDirection === 'horizontal' ? 'col-resize' : 'row-resize';
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const rect = mainView.getBoundingClientRect();
      let percent = 50;

      if (this.state.splitDirection === 'horizontal') {
        percent = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        percent = ((e.clientY - rect.top) / rect.height) * 100;
      }

      percent = Math.max(20, Math.min(80, percent));
      this.state.splitRatio = percent;
      container2D.style.flex = `0 0 ${percent}%`;
      this.resizeAllViews();
    });

    window.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        this.resizeAllViews();
      }
    });
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { triangleCommutes, dualMode, domainX, codomainY, morphismF, spatial3D, threeMode } = this.state;
    const monicTest = CategoryMath.testMonomorphism(morphismF, domainX, codomainY);
    const epicTest = CategoryMath.testEpimorphism(morphismF, domainX, codomainY);
    const fact = CategoryMath.computeQuotientFactorization(morphismF, domainX, codomainY);

    // 1. Primary 2D Telemetry Panel
    const elComm = document.querySelector('#tel-cat-commutes');
    if (elComm) {
      elComm.textContent = triangleCommutes ? 'Commutes (g ∘ f = h) ✓' : 'Non-Commutative (g ∘ f ≠ h)';
      elComm.className = triangleCommutes ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elDisc = document.querySelector('#tel-cat-discrepancy');
    if (elDisc) {
      elDisc.textContent = triangleCommutes ? 'Δ = 0.000 (Exact Coincidence)' : 'Δ > 0 (Discrepancy Vector Non-Zero)';
      elDisc.className = triangleCommutes ? 'color-emerald' : 'color-rose font-bold';
    }

    const elMonic = document.querySelector('#tel-cat-monic');
    if (elMonic) {
      elMonic.textContent = monicTest.isMonic ? 'YES (Injective / Left-Cancellative)' : 'NO (Collision Fibers Exist)';
      elMonic.className = monicTest.isMonic ? 'color-sky font-bold' : 'color-rose font-bold';
    }

    const elEpic = document.querySelector('#tel-cat-epic');
    if (elEpic) {
      elEpic.textContent = epicTest.isEpic ? 'YES (Surjective / Right-Cancellative)' : 'NO (Uncovered Codomain Targets)';
      elEpic.className = epicTest.isEpic ? 'color-fuchsia font-bold' : 'color-amber font-bold';
    }

    const elIso = document.querySelector('#tel-cat-iso');
    if (elIso) {
      const isIso = monicTest.isMonic && epicTest.isEpic;
      elIso.textContent = isIso ? 'YES (Isomorphism ≅, Invertible)' : 'NO';
      elIso.className = isIso ? 'color-lime font-bold' : 'color-slate font-bold';
    }

    const elObjs = document.querySelector('#tel-cat-objects');
    if (elObjs) elObjs.textContent = 'Obj(C) = { A, B, C }, |Hom| = 6';

    const elComp = document.querySelector('#tel-cat-comp');
    if (elComp) elComp.textContent = triangleCommutes ? 'g ∘ f = h (Commutative Triangle)' : 'g ∘ f ≠ h (Discrepancy active)';

    const elUniversalPrimary = document.querySelector('#tel-cat-universal');
    if (elUniversalPrimary) {
      elUniversalPrimary.textContent = `∃! u : X/ker(f) ≅ im(f) [${fact.quotientClasses.length} fibers] ✓`;
    }

    const elAdjPrimary = document.querySelector('#tel-cat-adjunction');
    if (elAdjPrimary) {
      elAdjPrimary.textContent = 'Hom(A × B, C) ≅ Hom(A, Cᴮ) (Adjunction)';
    }

    // 2. Secondary Dual / 3D Telemetry Panel
    const elDualName = document.querySelector('#val-cat-dual-name');
    if (elDualName) {
      if (spatial3D) {
        if (threeMode === 'spatial-simplex') elDualName.textContent = '3D Commutative Simplex';
        else if (threeMode === 'composition-3d') elDualName.textContent = '3D Composition Landscape Grid';
        else if (threeMode === 'universal-cone') elDualName.textContent = '3D Universal Cone & Factorization';
        else if (threeMode === 'functor-3d') elDualName.textContent = '3D Functorial Sheets & Transformations';
      } else {
        elDualName.textContent = dualMode === 'composition'
          ? 'Composition Grid (A × C)'
          : (dualMode === 'probe' ? 'Monic & Epic Cancellation Probes' : 'Universal Factorization & Adjunction');
      }
    }

    const elPath1 = document.querySelector('#val-cat-path1');
    if (elPath1) elPath1.textContent = 'A → B → C (M_f × M_g)';

    const elPath2 = document.querySelector('#val-cat-path2');
    if (elPath2) elPath2.textContent = 'A → C (Direct morphism h)';

    const elProbeMonic = document.querySelector('#val-cat-probe-monic');
    if (elProbeMonic) {
      elProbeMonic.textContent = monicTest.isMonic
        ? 'f ∘ g₁ = f ∘ g₂ ⟹ g₁ = g₂ ✓'
        : 'Witness probe separates inputs';
    }

    const elProbeEpic = document.querySelector('#val-cat-probe-epic');
    if (elProbeEpic) {
      elProbeEpic.textContent = epicTest.isEpic
        ? 'h₁ ∘ f = h₂ ∘ f ⟹ h₁ = h₂ ✓'
        : 'Discriminator probe separates outputs';
    }

    const elUniversal = document.querySelector('#val-cat-universal');
    if (elUniversal) {
      elUniversal.textContent = `∃! u : X/ker(f) ≅ im(f) [${fact.quotientClasses.length} classes] ✓`;
    }

    const elCurry = document.querySelector('#val-cat-curry');
    if (elCurry) {
      elCurry.textContent = 'Hom(A × B, C) ≅ Hom(A, Cᴮ)';
    }

    const elSpatialStat = document.querySelector('#val-cat-spatial-stat');
    if (elSpatialStat) {
      if (spatial3D) {
        if (threeMode === 'spatial-simplex') {
          elSpatialStat.textContent = '3 Object Vertices, 3 Morphism Conduits, Commuting Facet';
        } else if (threeMode === 'composition-3d') {
          elSpatialStat.textContent = '9 Composition Height Towers on 3×3 Grid';
        } else if (threeMode === 'universal-cone') {
          elSpatialStat.textContent = '4 Cone Vertices, Golden Ray ∃! u, Product Halo';
        } else if (threeMode === 'functor-3d') {
          elSpatialStat.textContent = '2 Parallel Functor Planes, Natural Transformation Bridges';
        }
      } else {
        elSpatialStat.textContent = '2D Planar Projection active';
      }
    }

    if (this.derivations) {
      this.derivations.render(this.state, monicTest, epicTest, fact);
    }

    if (this.threeView && this.state.spatial3D) {
      this.threeView.render(this.state);
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
