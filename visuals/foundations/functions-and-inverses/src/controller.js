/**
 * Controller — Functions, Inverses & Reversibility
 * Visual Mathematics Lab — Module 1
 */

import { FunctionMath } from '../../js/foundations-core.js';
import { DiscreteMappingView } from './views/DiscreteMappingView.js';
import { AnalyticPlaneView } from './views/AnalyticPlaneView.js';
import { CompositionView } from './views/CompositionView.js';

export class FunctionsController {
  constructor() {
    this.state = {
      activeMode: 'discrete', // 'discrete' | 'analytic' | 'composition'
      domain: [1, 2, 3, 4, 5],
      codomain: ['a', 'b', 'c', 'd', 'e'],
      pairs: [
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
        [4, 'd'],
        [5, 'e']
      ],
      showInverse: false,
      analyticPreset: 'linear',
      restrictDomain: false,
      tracerX: 2.0,
      pipelineDirection: 'forward',
      currentPresetId: 'bijection'
    };

    this.discreteView = null;
    this.analyticView = null;
    this.compositionView = null;

    this.presets = {
      bijection: {
        id: 'bijection',
        name: 'Bijection (Invertible)',
        domain: [1, 2, 3, 4, 5],
        codomain: ['a', 'b', 'c', 'd', 'e'],
        pairs: [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e']]
      },
      injective: {
        id: 'injective',
        name: 'Injective only (Unhit elements)',
        domain: [1, 2, 3],
        codomain: ['a', 'b', 'c', 'd', 'e'],
        pairs: [[1, 'a'], [2, 'b'], [3, 'c']]
      },
      surjective: {
        id: 'surjective',
        name: 'Surjective only (Collisions)',
        domain: [1, 2, 3, 4, 5],
        codomain: ['a', 'b', 'c', 'd'],
        pairs: [[1, 'a'], [2, 'a'], [3, 'b'], [4, 'c'], [5, 'd']]
      },
      neither: {
        id: 'neither',
        name: 'Neither Injective nor Surjective',
        domain: [1, 2, 3, 4],
        codomain: ['a', 'b', 'c', 'd', 'e'],
        pairs: [[1, 'a'], [2, 'a'], [3, 'b'], [4, 'c']]
      },
      partial: {
        id: 'partial',
        name: 'Not a function (Missing input)',
        domain: [1, 2, 3, 4, 5],
        codomain: ['a', 'b', 'c', 'd', 'e'],
        pairs: [[1, 'a'], [2, 'b'], [4, 'c'], [5, 'd']]
      },
      multivalued: {
        id: 'multivalued',
        name: 'Not a function (Multi-valued)',
        domain: [1, 2, 3, 4],
        codomain: ['a', 'b', 'c', 'd'],
        pairs: [[1, 'a'], [1, 'b'], [2, 'c'], [3, 'd'], [4, 'd']]
      }
    };
  }

  mount(containers) {
    if (containers.discrete) {
      this.discreteView = new DiscreteMappingView(containers.discrete, this);
    }
    if (containers.analytic) {
      this.analyticView = new AnalyticPlaneView(containers.analytic, this);
    }
    if (containers.composition) {
      this.compositionView = new CompositionView(containers.composition, this);
    }

    this.bindDomControls();
    this.updateAll();
  }

  bindDomControls() {
    if (typeof document === 'undefined') return;

    // Mode Switcher Buttons
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

    // Analytic Preset Select
    const analyticSelect = document.querySelector('#analytic-preset-select');
    analyticSelect?.addEventListener('change', (e) => {
      this.setAnalyticPreset(e.target.value);
    });

    // Domain Restriction Toggle (for x^2)
    const domainRestrictToggle = document.querySelector('#toggle-restrict-domain');
    domainRestrictToggle?.addEventListener('change', (e) => {
      this.setRestrictDomain(e.target.checked);
    });

    // Inverse Arrow Toggle
    const toggleInverseBtn = document.querySelector('#btn-toggle-inverse');
    toggleInverseBtn?.addEventListener('click', () => {
      this.toggleInverse();
    });

    // Reset Button
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

      // Toggle viewport sections
      const discreteSection = document.querySelector('#discrete-viewport-container');
      const analyticSection = document.querySelector('#analytic-viewport-container');
      const compSection = document.querySelector('#composition-viewport-container');

      if (discreteSection) discreteSection.style.display = mode === 'discrete' ? 'block' : 'none';
      if (analyticSection) analyticSection.style.display = mode === 'analytic' ? 'block' : 'none';
      if (compSection) compSection.style.display = mode === 'composition' ? 'block' : 'none';

      // Show/hide relevant dock controls
      const discreteControls = document.querySelector('#discrete-dock-controls');
      const analyticControls = document.querySelector('#analytic-dock-controls');
      if (discreteControls) discreteControls.style.display = mode === 'discrete' ? 'block' : 'none';
      if (analyticControls) analyticControls.style.display = mode === 'analytic' ? 'block' : 'none';
    }

    if (mode === 'discrete') this.discreteView?.resize();
    if (mode === 'analytic') this.analyticView?.resize();
    if (mode === 'composition') this.compositionView?.render();

    this.updateTelemetry();
  }

  applyPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return;

    this.state.currentPresetId = presetId;
    this.state.domain = [...preset.domain];
    this.state.codomain = [...preset.codomain];
    this.state.pairs = preset.pairs.map(p => [...p]);
    this.state.showInverse = false;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetId);
      });
    }

    this.updateAll();
  }

  setMapping(x, y) {
    // Replace mapping for x with (x, y)
    this.state.pairs = this.state.pairs.filter(([itemX]) => itemX !== x);
    this.state.pairs.push([x, y]);
    this.updateAll();
  }

  removePair(x, y) {
    this.state.pairs = this.state.pairs.filter(([a, b]) => !(a === x && b === y));
    this.updateAll();
  }

  toggleInverse() {
    const analysis = FunctionMath.analyzeRelationAsFunction(this.state.domain, this.state.codomain, this.state.pairs);
    if (!analysis.isBijective && !this.state.showInverse) {
      if (typeof alert !== 'undefined') {
        alert("Cannot invert: The mapping must be strictly Bijective (both Injective and Surjective)!");
      }
      return;
    }
    this.state.showInverse = !this.state.showInverse;
    this.updateAll();
  }

  setAnalyticPreset(presetId) {
    this.state.analyticPreset = presetId;
    if (typeof document !== 'undefined') {
      const restrictWrap = document.querySelector('#restrict-domain-wrapper');
      if (restrictWrap) {
        restrictWrap.style.display = presetId === 'quadratic' ? 'flex' : 'none';
      }
    }
    this.updateAll();
  }

  setRestrictDomain(val) {
    this.state.restrictDomain = Boolean(val);
    if (this.state.restrictDomain && this.state.tracerX < 0) {
      this.state.tracerX = 0;
    }
    this.updateAll();
  }

  setTracerX(val) {
    let clampedVal = val;
    if (this.state.analyticPreset === 'quadratic' && this.state.restrictDomain && clampedVal < 0) {
      clampedVal = 0;
    }
    this.state.tracerX = clampedVal;
    this.analyticView?.render();
    this.compositionView?.render();
    this.updateTelemetry();
  }

  togglePipelineDirection() {
    this.state.pipelineDirection = this.state.pipelineDirection === 'forward' ? 'reverse' : 'forward';
    this.compositionView?.render();
  }

  reset() {
    this.state.showInverse = false;
    this.state.tracerX = 2.0;
    this.state.restrictDomain = false;
    this.applyPreset('bijection');
    this.setAnalyticPreset('linear');
  }

  updateAll() {
    this.discreteView?.render();
    this.analyticView?.render();
    this.compositionView?.render();
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { domain, codomain, pairs, showInverse } = this.state;
    const analysis = FunctionMath.analyzeRelationAsFunction(domain, codomain, pairs);

    // Update Badges
    const badgeFunction = document.querySelector('#badge-is-function');
    const badgeInjective = document.querySelector('#badge-injective');
    const badgeSurjective = document.querySelector('#badge-surjective');
    const badgeBijective = document.querySelector('#badge-bijective');

    if (badgeFunction) {
      badgeFunction.className = `axiom-badge ${analysis.isFunction ? 'is-valid' : 'is-violated'}`;
      badgeFunction.innerHTML = `<span>Function (Well-Defined): ${analysis.isFunction ? 'YES' : 'NO'}</span>`;
    }

    if (badgeInjective) {
      badgeInjective.className = `axiom-badge ${analysis.isInjective ? 'is-valid' : 'is-violated'}`;
      badgeInjective.innerHTML = `<span>Injective (One-to-One): ${analysis.isInjective ? 'YES' : 'NO'}</span>`;
    }

    if (badgeSurjective) {
      badgeSurjective.className = `axiom-badge ${analysis.isSurjective ? 'is-valid' : 'is-violated'}`;
      badgeSurjective.innerHTML = `<span>Surjective (Onto): ${analysis.isSurjective ? 'YES' : 'NO'}</span>`;
    }

    if (badgeBijective) {
      badgeBijective.className = `axiom-badge ${analysis.isBijective ? 'is-valid' : 'is-violated'}`;
      badgeBijective.innerHTML = `<span>Bijective (Invertible): ${analysis.isBijective ? 'YES' : 'NO'}</span>`;
    }

    // Toggle Inverse Button state
    const btnInverse = document.querySelector('#btn-toggle-inverse');
    if (btnInverse) {
      btnInverse.disabled = !analysis.isBijective;
      btnInverse.classList.toggle('active', showInverse);
      btnInverse.innerHTML = showInverse ? '↺ Showing Inverse f⁻¹: Y → X' : 'Invert Mapping (f⁻¹)';
    }

    // Update Textual Telemetry
    const telemetryContainer = document.querySelector('#function-telemetry-content');
    if (telemetryContainer) {
      const pairsFormatted = pairs.map(([x, y]) => `(${x}, ${y})`).join(', ');
      const imageFormatted = analysis.image.length > 0 ? `{ ${analysis.image.join(', ')} }` : '∅';

      let reasonHtml = '';
      if (!analysis.isTotal) {
        reasonHtml += `<div style="color: #f59e0b;">⚠ Fails Totality: Missing input(s) ${analysis.missingInputs.join(', ')}</div>`;
      }
      if (!analysis.isUnique) {
        reasonHtml += `<div style="color: #f87171;">⚠ Fails Uniqueness: Input(s) map to multiple outputs</div>`;
      }
      if (analysis.isFunction && !analysis.isInjective) {
        const colList = analysis.collisionOutputs.map(c => `${c.y} &larr; {${c.inputs.join(', ')}}`).join('; ');
        reasonHtml += `<div style="color: #f87171;">⚠ Collisions (Non-Injective): ${colList}</div>`;
      }
      if (analysis.isFunction && !analysis.isSurjective) {
        reasonHtml += `<div style="color: #fbbf24;">⚠ Unhit (Non-Surjective): { ${analysis.unhitOutputs.join(', ')} }</div>`;
      }

      telemetryContainer.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Domain X:</strong> { ${domain.join(', ')} } &nbsp;|&nbsp; <strong>|X|:</strong> ${domain.length}</div>
          <div><strong>Codomain Y:</strong> { ${codomain.join(', ')} } &nbsp;|&nbsp; <strong>|Y|:</strong> ${codomain.length}</div>
          <div><strong>Graph Pairs f:</strong> { ${pairsFormatted} }</div>
          <div><strong>Image im(f):</strong> ${imageFormatted}</div>
          ${reasonHtml}
        </div>
      `;
    }
  }
}

export function mountFunctionsVisual(containers) {
  const controller = new FunctionsController();
  controller.mount(containers);
  return controller;
}
