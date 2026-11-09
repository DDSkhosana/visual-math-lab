/**
 * Controller — Permutations & Symmetric Groups S_n
 * Visual Mathematics Lab — Module 3
 */

import { PermutationMath, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
import { PermutationGridView } from './views/PermutationGridView.js';
import { CauchyCycleView } from './views/CauchyCycleView.js';
import { BraidDiagramView } from './views/BraidDiagramView.js';
import { CayleyTableView } from './views/CayleyTableView.js';

export class PermutationsController {
  constructor() {
    this.state = {
      viewMode: 'split', // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 50,
      activeMode: 'cauchy', // backwards compat with tests ('cauchy' | 'braid' | 'cayley')
      dualMode: 'cauchy', // 'cauchy' | 'braid' | 'cayley'
      n: 5,
      mapping: [3, 1, 2, 5, 4], // (1 3 2)(4 5)
      currentPresetId: 'compound'
    };

    this.gridView = null;
    this.cauchyView = null;
    this.braidView = null;
    this.cayleyView = null;

    this.presets = {
      compound: {
        id: 'compound',
        name: 'Compound: (1 3 2)(4 5)',
        n: 5,
        mapping: [3, 1, 2, 5, 4]
      },
      three_cycle: {
        id: 'three_cycle',
        name: '3-Cycle: (1 2 3)',
        n: 3,
        mapping: [2, 3, 1]
      },
      single_swap: {
        id: 'single_swap',
        name: 'Transposition: (1 2)',
        n: 4,
        mapping: [2, 1, 3, 4]
      },
      full_cycle: {
        id: 'full_cycle',
        name: '5-Cycle: (1 2 3 4 5)',
        n: 5,
        mapping: [2, 3, 4, 5, 1]
      },
      identity: {
        id: 'identity',
        name: 'Identity: e = ()',
        n: 5,
        mapping: [1, 2, 3, 4, 5]
      }
    };
  }

  mount(containers) {
    if (containers.grid) {
      this.gridView = new PermutationGridView(containers.grid, this);
    }
    if (containers.cauchy) {
      this.cauchyView = new CauchyCycleView(containers.cauchy, this);
    }
    if (containers.braid) {
      this.braidView = new BraidDiagramView(containers.braid, this);
    }
    if (containers.cayley) {
      this.cayleyView = new CayleyTableView(containers.cayley, this);
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

    // View Mode Switcher: Split | Grid | Dual Canvas
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.viewMode;
        if (mode === 'split' || mode === '2d' || mode === '3d') {
          this.setViewMode(mode);
        } else {
          // Compatibility with old data-view-mode="cauchy|braid|cayley"
          this.setDualMode(mode);
        }
      });
    });

    // Split Orientation Flip Button
    document.querySelector('#split-dir-btn')?.addEventListener('click', () => {
      this.toggleSplitDirection();
    });

    // Dual Representation Mode Switcher
    document.querySelectorAll('[data-dual-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dualMode = e.currentTarget.dataset.dualMode;
        this.setDualMode(dualMode);
      });
    });

    // Degree n Selector
    document.querySelectorAll('[data-degree-n]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const n = parseInt(e.currentTarget.dataset.degreeN, 10);
        this.setN(n);
      });
    });

    // Invert Permutation Button (f⁻¹ / y = x Reflection)
    document.querySelector('#btn-invert-perm')?.addEventListener('click', () => {
      this.invertPermutation();
    });

    // Preset Buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = e.currentTarget.dataset.preset;
        this.applyPreset(presetId);
      });
    });

    // Reset
    document.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.reset();
    });
  }

  setViewMode(mode) {
    this.state.viewMode = mode;

    if (typeof document !== 'undefined') {
      const mainView = document.querySelector('#main-view');
      if (mainView) {
        mainView.classList.remove('layout-split', 'layout-2d', 'layout-3d');
        if (mode === 'split') {
          mainView.classList.add('layout-split');
        } else if (mode === '2d') {
          mainView.classList.add('layout-2d');
        } else if (mode === '3d') {
          mainView.classList.add('layout-3d');
        }
      }

      document.querySelectorAll('[data-view-mode]').forEach(btn => {
        const isMatch = btn.dataset.viewMode === mode;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });
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

      const resizer = document.querySelector('#viewport-resizer');
      if (resizer) {
        resizer.style.cursor = this.state.splitDirection === 'horizontal' ? 'col-resize' : 'row-resize';
      }
    }

    this.resizeAllViews();
  }

  setDualMode(dualMode) {
    this.state.dualMode = dualMode;
    this.state.activeMode = dualMode;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-dual-mode]').forEach(btn => {
        const isMatch = btn.dataset.dualMode === dualMode;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', String(isMatch));
      });

      const cauchySec = document.querySelector('#cauchy-viewport-container');
      const braidSec = document.querySelector('#braid-viewport-container');
      const cayleySec = document.querySelector('#cayley-viewport-container');

      if (cauchySec) cauchySec.style.display = dualMode === 'cauchy' ? 'block' : 'none';
      if (braidSec) braidSec.style.display = dualMode === 'braid' ? 'block' : 'none';
      if (cayleySec) cayleySec.style.display = dualMode === 'cayley' ? 'block' : 'none';
    }

    if (dualMode === 'cauchy') this.cauchyView?.render();
    if (dualMode === 'braid') this.braidView?.render();
    if (dualMode === 'cayley') this.cayleyView?.render();

    this.updateTelemetry();
  }

  setMappingValue(x, y) {
    this.state.mapping = PermutationMath.setMappingValue(this.state.mapping, x, y);
    this.state.currentPresetId = 'custom';
    this.updateAll();
  }

  applyTransposition(a, b) {
    this.state.mapping = PermutationMath.applyTransposition(this.state.mapping, a, b);
    this.state.currentPresetId = 'custom';
    this.updateAll();
  }

  invertPermutation() {
    this.state.mapping = PermutationMath.computeInverse(this.state.mapping);
    this.state.currentPresetId = 'custom';
    this.updateAll();
  }

  setN(newN) {
    const validN = Math.max(3, Math.min(5, newN));
    if (this.state.n === validN) return;

    this.state.n = validN;
    // Generate valid permutation of length validN
    const nextMapping = [];
    for (let i = 1; i <= validN; i++) {
      if (i <= this.state.mapping.length && this.state.mapping[i - 1] <= validN) {
        nextMapping.push(this.state.mapping[i - 1]);
      } else {
        nextMapping.push(i);
      }
    }

    // Verify it's a bijection
    const set = new Set(nextMapping);
    if (set.size !== validN) {
      // Fallback to identity for this n
      this.state.mapping = Array.from({ length: validN }, (_, i) => i + 1);
    } else {
      this.state.mapping = nextMapping;
    }

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-degree-n]').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.degreeN, 10) === validN);
      });
    }

    this.state.currentPresetId = 'custom';
    this.updateAll();
  }

  applyPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return;

    this.state.currentPresetId = presetId;
    this.state.n = preset.n;
    this.state.mapping = [...preset.mapping];

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetId);
      });
      document.querySelectorAll('[data-degree-n]').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.degreeN, 10) === preset.n);
      });
    }

    this.updateAll();
  }

  setMapping(newMapping) {
    this.state.mapping = [...newMapping];
    this.state.n = newMapping.length;
    this.state.currentPresetId = 'custom';
    this.updateAll();
  }

  reset() {
    this.applyPreset('compound');
  }

  updateAll() {
    this.gridView?.render();
    this.cauchyView?.render();
    this.braidView?.render();
    this.cayleyView?.render();
    this.updateTelemetry();
  }

  resizeAllViews() {
    this.gridView?.resize();
    if (this.state.dualMode === 'cauchy') this.cauchyView?.render();
    if (this.state.dualMode === 'braid') this.braidView?.render();
    if (this.state.dualMode === 'cayley') this.cayleyView?.render();
  }

  enableResizerDrag() {
    if (typeof document === 'undefined') return;
    const resizer = document.querySelector('#viewport-resizer');
    const container = document.querySelector('#main-view');
    const p1 = document.querySelector('#canvas-2d-container');
    const p2 = document.querySelector('#canvas-3d-container');
    if (!resizer || !container || !p1 || !p2) return;

    let isDragging = false;

    const onPointerDown = (e) => {
      isDragging = true;
      resizer.classList.add('active');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const isHoriz = this.state.splitDirection === 'horizontal';

      let ratio;
      if (isHoriz) {
        const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
        if (clientX === undefined) return;
        ratio = ((clientX - rect.left) / rect.width) * 100;
      } else {
        const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
        if (clientY === undefined) return;
        ratio = ((clientY - rect.top) / rect.height) * 100;
      }

      ratio = Math.max(20, Math.min(80, ratio));
      this.state.splitRatio = ratio;

      if (isHoriz) {
        p1.style.flexBasis = `${ratio}%`;
        p2.style.flexBasis = `${100 - ratio}%`;
        p1.style.width = 'auto';
        p2.style.width = 'auto';
      } else {
        p1.style.flexBasis = `${ratio}%`;
        p2.style.flexBasis = `${100 - ratio}%`;
        p1.style.height = 'auto';
        p2.style.height = 'auto';
      }

      this.resizeAllViews();
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      resizer.classList.remove('active');
      document.body.style.userSelect = '';
      this.resizeAllViews();
    };

    resizer.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { n, mapping, dualMode } = this.state;
    const cycles = PermutationMath.toCycleNotation(mapping);
    const order = PermutationMath.computeOrder(cycles);
    const parity = PermutationMath.computeParityAndSign(mapping);
    const fixedPoints = PermutationMath.computeFixedPoints(mapping);

    // 1. Primary 2D Telemetry Panel
    const elGroup = document.querySelector('#tel-perm-group');
    if (elGroup) elGroup.textContent = `S_${n} (|S_${n}| = ${this.factorial(n)})`;

    const elInv = document.querySelector('#tel-perm-inversions');
    if (elInv) elInv.textContent = `${parity.inversions} inversion(s)`;

    const elParity = document.querySelector('#tel-perm-parity');
    if (elParity) {
      elParity.textContent = parity.isEven ? 'EVEN (+1)' : 'ODD (-1)';
      elParity.className = parity.isEven ? 'color-fuchsia font-bold' : 'color-rose font-bold';
    }

    const elAlt = document.querySelector('#tel-perm-alternating');
    if (elAlt) {
      elAlt.textContent = parity.isEven ? `σ ∈ A_${n} ✓ (kernel of sgn)` : `σ ∉ A_${n} (odd coset)`;
      elAlt.className = parity.isEven ? 'color-emerald font-bold' : 'color-amber font-bold';
    }

    const elFixed = document.querySelector('#tel-perm-fixed');
    if (elFixed) {
      const fixedStr = fixedPoints.length > 0 ? `{ ${fixedPoints.join(', ')} }` : '∅ (Derangement)';
      elFixed.textContent = `${fixedStr} (${fixedPoints.length} fixed)`;
    }

    // 2. Secondary Dual / 3D Telemetry Panel
    const elDualName = document.querySelector('#val-perm-dual-name');
    if (elDualName) {
      elDualName.textContent = dualMode === 'cauchy'
        ? 'Cauchy Matrix & Cycle Orbits'
        : (dualMode === 'braid' ? 'String Braiding Wire Diagram' : 'S₃ Cayley Group Table');
    }

    const elCycles = document.querySelector('#val-perm-cycles');
    if (elCycles) elCycles.textContent = PermutationMath.formatCycles(cycles);

    const elOrder = document.querySelector('#val-perm-order');
    if (elOrder) elOrder.textContent = `ord(σ) = ${order} (lcm of cycles)`;

    const elCrossings = document.querySelector('#val-perm-crossings');
    if (elCrossings) elCrossings.textContent = `${parity.inversions} wire crossing(s)`;

    const elReturn = document.querySelector('#val-perm-id-return');
    if (elReturn) elReturn.textContent = `σ^${order} = id ✓`;
  }

  factorial(num) {
    let res = 1;
    for (let i = 2; i <= num; i++) res *= i;
    return res;
  }
}

export function mountPermutationsVisual(containers) {
  const controller = new PermutationsController();
  controller.mount(containers);
  return controller;
}
