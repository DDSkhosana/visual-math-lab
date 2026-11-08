/**
 * Controller — Permutations & Symmetric Groups S_n
 * Visual Mathematics Lab — Module 3
 */

import { PermutationMath } from '../../js/foundations-core.js';
import { CauchyCycleView } from './views/CauchyCycleView.js';
import { BraidDiagramView } from './views/BraidDiagramView.js';
import { CayleyTableView } from './views/CayleyTableView.js';

export class PermutationsController {
  constructor() {
    this.state = {
      activeMode: 'cauchy', // 'cauchy' | 'braid' | 'cayley'
      n: 5,
      mapping: [3, 1, 2, 5, 4], // (1 3 2)(4 5)
      currentPresetId: 'compound'
    };

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

      const cauchySec = document.querySelector('#cauchy-viewport-container');
      const braidSec = document.querySelector('#braid-viewport-container');
      const cayleySec = document.querySelector('#cayley-viewport-container');

      if (cauchySec) cauchySec.style.display = mode === 'cauchy' ? 'block' : 'none';
      if (braidSec) braidSec.style.display = mode === 'braid' ? 'block' : 'none';
      if (cayleySec) cayleySec.style.display = mode === 'cayley' ? 'block' : 'none';
    }

    if (mode === 'cauchy') this.cauchyView?.render();
    if (mode === 'braid') this.braidView?.render();
    if (mode === 'cayley') this.cayleyView?.render();

    this.updateTelemetry();
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
    }

    this.updateAll();
  }

  setMapping(newMapping) {
    this.state.mapping = [...newMapping];
    this.state.n = newMapping.length;
    this.updateAll();
  }

  reset() {
    this.applyPreset('compound');
  }

  updateAll() {
    this.cauchyView?.render();
    this.braidView?.render();
    this.cayleyView?.render();
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { n, mapping } = this.state;
    const cycles = PermutationMath.toCycleNotation(mapping);
    const order = PermutationMath.computeOrder(cycles);
    const parity = PermutationMath.computeParityAndSign(mapping);

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
      tel.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Degree n:</strong> ${n} &nbsp;|&nbsp; <strong>Group Size |S_${n}|:</strong> ${this.factorial(n)}</div>
          <div><strong>Disjoint Cycles:</strong> ${PermutationMath.formatCycles(cycles)}</div>
          <div><strong>Permutation Order:</strong> ${order} (σ^${order} = id)</div>
          <div><strong>Inversion Count:</strong> ${parity.inversions} &nbsp;|&nbsp; <strong>Sign sgn(σ):</strong> ${parity.sign > 0 ? '+1' : '-1'}</div>
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
