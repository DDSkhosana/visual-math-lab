/**
 * Controller — Permutations & Symmetric Groups S_n
 * Visual Mathematics Lab — Module 3
 */

import { PermutationMath, DraggableToolbar, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
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

    const { n, mapping } = this.state;
    const cycles = PermutationMath.toCycleNotation(mapping);
    const order = PermutationMath.computeOrder(cycles);
    const parity = PermutationMath.computeParityAndSign(mapping);
    const fixedPoints = PermutationMath.computeFixedPoints(mapping);

    // Update Telemetry Badges
    const badgeCycle = document.querySelector('#badge-cycle-form');
    const badgeOrder = document.querySelector('#badge-order');
    const badgeParity = document.querySelector('#badge-parity');
    const badgeGroup = document.querySelector('#badge-symmetric-group');

    if (badgeCycle) {
      badgeCycle.textContent = `Cycles: ${PermutationMath.formatCycles(cycles)}`;
    }
    if (badgeOrder) {
      badgeOrder.textContent = `Order: ${order}`;
    }
    if (badgeParity) {
      badgeParity.className = `axiom-badge ${parity.isEven ? 'is-valid' : 'is-violated'}`;
      badgeParity.textContent = `Parity: ${parity.isEven ? 'EVEN (+1)' : 'ODD (-1)'}`;
    }
    if (badgeGroup) {
      badgeGroup.textContent = `Group: S_${n} (|S_${n}| = ${this.factorial(n)})`;
    }

    // Textual Telemetry
    const tel = document.querySelector('#permutation-telemetry-content');
    if (tel) {
      const fixedStr = fixedPoints.length > 0 ? `{ ${fixedPoints.join(', ')} }` : '∅ (Derangement)';
      const invPairsText = parity.inversionPairs.length > 0 
        ? parity.inversionPairs.map(([a, b]) => `(${a}, ${b})`).join(', ') 
        : 'None (Identity)';

      tel.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Degree n:</strong> ${n} &nbsp;|&nbsp; <strong>Group Size |S_${n}|:</strong> ${this.factorial(n)}</div>
          <div><strong>Cauchy Map:</strong> [ ${mapping.join(', ')} ]</div>
          <div><strong>Disjoint Cycles:</strong> ${PermutationMath.formatCycles(cycles)}</div>
          <div><strong>Permutation Order:</strong> ${order} (σ^${order} = id)</div>
          <div><strong>Fixed Points (y = x):</strong> ${fixedStr}</div>
          <div><strong>Inversions (Rothe count):</strong> ${parity.inversions} &nbsp;|&nbsp; <strong>Pairs:</strong> { ${invPairsText} }</div>
          <div><strong>Parity &amp; Sign:</strong> ${parity.isEven ? 'EVEN (sgn = +1)' : 'ODD (sgn = -1)'}</div>
        </div>
      `;
    }
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
