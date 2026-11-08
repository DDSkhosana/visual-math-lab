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
      currentPresetId: 'bijection',
      customModel: null,
      formulaAnalysis: null,
      customFormulaStr: 'x^3 - 3*x',
      customMinX: -3.5,
      customMaxX: 3.5
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

    // Custom Pairs & CSV Import Controls
    const btnApplyPairs = document.querySelector('#btn-apply-custom-pairs');
    const inputCustomPairs = document.querySelector('#input-custom-pairs');
    const inputCustomCodomain = document.querySelector('#input-custom-codomain');
    const inputFilePairs = document.querySelector('#input-file-pairs');
    const btnTriggerUpload = document.querySelector('#btn-trigger-upload-pairs');
    const btnExportPairs = document.querySelector('#btn-export-pairs-csv');

    btnTriggerUpload?.addEventListener('click', () => {
      inputFilePairs?.click();
    });

    btnApplyPairs?.addEventListener('click', () => {
      const text = inputCustomPairs?.value || '';
      const customC = inputCustomCodomain?.value || '';
      if (!text.trim()) return;
      this.loadCustomPairs(text, customC);
    });

    inputFilePairs?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target.result;
        if (inputCustomPairs) inputCustomPairs.value = content;
        const customC = inputCustomCodomain?.value || '';
        this.loadCustomPairs(content, customC);
      };
      reader.readAsText(file);
    });

    btnExportPairs?.addEventListener('click', () => {
      this.exportPairsCSV();
    });

    // Custom Formula Controls
    const inputFormula = document.querySelector('#input-custom-formula');
    const inputMinX = document.querySelector('#input-formula-min');
    const inputMaxX = document.querySelector('#input-formula-max');
    const btnApplyFormula = document.querySelector('#btn-apply-formula');

    btnApplyFormula?.addEventListener('click', () => {
      const formulaStr = inputFormula?.value || 'x^3 - 3*x';
      const minX = parseFloat(inputMinX?.value) || -4;
      const maxX = parseFloat(inputMaxX?.value) || 4;
      this.loadCustomFormula(formulaStr, minX, maxX);
    });

    document.querySelectorAll('[data-formula-preset]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const formula = e.currentTarget.dataset.formulaPreset;
        if (inputFormula) inputFormula.value = formula;
        const minX = parseFloat(inputMinX?.value) || -4;
        const maxX = parseFloat(inputMaxX?.value) || 4;
        this.loadCustomFormula(formula, minX, maxX);
      });
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

  loadCustomPairs(inputString, customCodomainStr = null) {
    try {
      const parsed = FunctionMath.parseOrderedPairs(inputString, customCodomainStr);
      this.state.domain = parsed.domain;
      this.state.codomain = parsed.codomain;
      this.state.pairs = parsed.pairs;
      this.state.currentPresetId = 'custom';
      this.state.showInverse = false;

      if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-preset]').forEach(btn => btn.classList.remove('active'));
      }

      this.updateAll();
    } catch (err) {
      if (typeof alert !== 'undefined') {
        alert(`Error parsing pairs: ${err.message}`);
      }
    }
  }

  loadCustomFormula(formulaStr, minX = -4, maxX = 4) {
    try {
      const evaluator = FunctionMath.createSafeFormulaEvaluator(formulaStr);
      const analysis = FunctionMath.analyzeContinuousFormula(evaluator, minX, maxX);

      this.state.customModel = {
        id: 'custom',
        name: `f(x) = ${formulaStr}`,
        forward: evaluator,
        forwardFormulaText: `f(x) = ${formulaStr}`,
        minX,
        maxX,
        analysis,
        inverse: (y) => FunctionMath.numericalInverse(evaluator, y, minX, maxX),
        inverseFormulaText: analysis.isInjective ? `f⁻¹(y)` : 'Non-invertible'
      };
      this.state.customFormulaStr = formulaStr;
      this.state.customMinX = minX;
      this.state.customMaxX = maxX;
      this.state.analyticPreset = 'custom';
      this.state.formulaAnalysis = analysis;
      this.state.restrictDomain = false;

      if (typeof document !== 'undefined') {
        const analyticSelect = document.querySelector('#analytic-preset-select');
        if (analyticSelect) analyticSelect.value = 'custom';
        const restrictWrap = document.querySelector('#restrict-domain-wrapper');
        if (restrictWrap) restrictWrap.style.display = 'none';
      }

      this.setViewMode('analytic');
      this.updateAll();
    } catch (err) {
      if (typeof alert !== 'undefined') {
        alert(`Error parsing formula: ${err.message}`);
      }
    }
  }

  exportPairsCSV() {
    const lines = ['input_x,output_y'];
    for (const [x, y] of this.state.pairs) {
      lines.push(`${x},${y}`);
    }
    const csvContent = lines.join('\n');

    if (typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'function_ordered_pairs.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return csvContent;
  }

  updateAll() {
    this.discreteView?.render();
    this.analyticView?.render();
    this.compositionView?.render();
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { activeMode, domain, codomain, pairs, showInverse, analyticPreset, customModel, formulaAnalysis } = this.state;

    const badgeFunction = document.querySelector('#badge-is-function');
    const badgeInjective = document.querySelector('#badge-injective');
    const badgeSurjective = document.querySelector('#badge-surjective');
    const badgeBijective = document.querySelector('#badge-bijective');
    const btnInverse = document.querySelector('#btn-toggle-inverse');
    const telemetryContainer = document.querySelector('#function-telemetry-content');

    if (activeMode === 'analytic') {
      const model = (analyticPreset === 'custom' && customModel)
        ? customModel
        : (FunctionMath.continuousPresets[analyticPreset] || FunctionMath.continuousPresets.linear);

      const analysis = (analyticPreset === 'custom' && formulaAnalysis)
        ? formulaAnalysis
        : FunctionMath.analyzeContinuousFormula(model.forward, -4, 4);

      if (badgeFunction) {
        badgeFunction.className = 'axiom-badge is-valid';
        badgeFunction.innerHTML = '<span>Function: YES (Continuous)</span>';
      }
      if (badgeInjective) {
        badgeInjective.className = `axiom-badge ${analysis.isInjective ? 'is-valid' : 'is-violated'}`;
        badgeInjective.innerHTML = `<span>Injective: ${analysis.isInjective ? 'YES (Monotonic)' : 'NO (Extrema/Oscillation)'}</span>`;
      }
      if (badgeSurjective) {
        badgeSurjective.className = 'axiom-badge is-valid';
        badgeSurjective.innerHTML = `<span>Range: [${analysis.range.minY.toFixed(2)}, ${analysis.range.maxY.toFixed(2)}]</span>`;
      }
      if (badgeBijective) {
        badgeBijective.className = `axiom-badge ${analysis.isInjective ? 'is-valid' : 'is-violated'}`;
        badgeBijective.innerHTML = `<span>Invertible: ${analysis.isInjective ? 'YES (f⁻¹ exists)' : 'NO (Multivalued reflection)'}</span>`;
      }

      if (btnInverse) {
        btnInverse.disabled = !analysis.isInjective;
        btnInverse.classList.toggle('active', showInverse);
        btnInverse.innerHTML = showInverse ? '↺ Showing Inverse f⁻¹: Y → X' : 'Invert Mapping (f⁻¹)';
      }

      if (telemetryContainer) {
        const rootsStr = analysis.roots && analysis.roots.length > 0
          ? analysis.roots.map(r => r.toFixed(3)).join(', ')
          : 'None detected on interval';

        const fixedStr = analysis.fixedPoints && analysis.fixedPoints.length > 0
          ? analysis.fixedPoints.map(fp => `(${fp.x.toFixed(3)}, ${fp.y.toFixed(3)})`).join(', ')
          : 'None detected on interval';

        const extremaStr = analysis.extrema && analysis.extrema.length > 0
          ? analysis.extrema.map(e => `${e.type} at (${e.x.toFixed(3)}, ${e.y.toFixed(3)})`).join('; ')
          : 'None (monotonic strictly without turning points)';

        telemetryContainer.innerHTML = `
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
            <div><strong>Active Formula:</strong> <span style="color: #38bdf8;">${model.forwardFormulaText}</span></div>
            <div><strong>Numerical Range:</strong> [${analysis.range.minY.toFixed(3)}, ${analysis.range.maxY.toFixed(3)}]</div>
            <div><strong>Roots (f(x) = 0):</strong> <span style="color: #34d399;">{ ${rootsStr} }</span></div>
            <div><strong>Fixed Points (f(x) = x on diagonal):</strong> <span style="color: #fbbf24;">{ ${fixedStr} }</span></div>
            <div><strong>Monotonicity:</strong> ${analysis.monotonicType}</div>
            <div><strong>Local Extrema:</strong> <span style="color: #c084fc;">${extremaStr}</span></div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); color: ${analysis.isInjective ? '#34d399' : '#f87171'};">
              ${analysis.isInjective ? '✓ Strict bijection on interval: reflection across y = x produces a single-valued inverse function f⁻¹.' : '⚠ Not injective: horizontal line test fails; inverse reflection yields multi-valued branches.'}
            </div>
          </div>
        `;
      }
      return;
    }

    // Discrete Mode
    const analysis = FunctionMath.analyzeRelationAsFunction(domain, codomain, pairs);
    const kernel = FunctionMath.computeKernelEquivalenceRelation(domain, pairs);

    // Update Badges
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
    if (btnInverse) {
      btnInverse.disabled = !analysis.isBijective;
      btnInverse.classList.toggle('active', showInverse);
      btnInverse.innerHTML = showInverse ? '↺ Showing Inverse f⁻¹: Y → X' : 'Invert Mapping (f⁻¹)';
    }

    // Update Textual Telemetry
    if (telemetryContainer) {
      const pairsFormatted = pairs.map(([x, y]) => `(${x}, ${y})`).join(', ');
      const imageFormatted = analysis.image.length > 0 ? `{ ${analysis.image.join(', ')} }` : '∅';
      const quotientFormatted = kernel.classes.map(c => `[${c.elements.join(', ')}]`).join(', ');

      let reasonHtml = '';
      if (!analysis.isTotal) {
        reasonHtml += `<div style="color: #f59e0b;">⚠ Fails Totality: Missing input(s) { ${analysis.missingInputs.join(', ')} }</div>`;
      }
      if (!analysis.isUnique) {
        reasonHtml += `<div style="color: #f87171;">⚠ Fails Uniqueness: Input(s) map to multiple outputs</div>`;
      }
      if (analysis.isFunction && !analysis.isInjective) {
        const colList = analysis.collisionOutputs.map(c => `${c.y} &larr; {${c.inputs.join(', ')}}`).join('; ');
        reasonHtml += `<div style="color: #f87171;">⚠ Collisions (Non-Injective): ${colList}</div>`;
      }
      if (analysis.isFunction && !analysis.isSurjective) {
        reasonHtml += `<div style="color: #fbbf24;">⚠ Unhit (Non-Surjective Deficit Y \\ im(f)): { ${analysis.unhitOutputs.join(', ')} }</div>`;
      }

      // Induced Equivalence Relation Deduction (First Isomorphism Theorem)
      const kernelHtml = `
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div><strong>Induced Equivalence Relation ker(f) on X:</strong> (x₁ ~ x₂ &hArr; f(x₁) = f(x₂))</div>
          <div><strong>Quotient Classes X/ker(f):</strong> { ${quotientFormatted} } &nbsp;|&nbsp; <strong>|X/ker(f)|:</strong> ${kernel.quotientSize}</div>
          <div style="color: #38bdf8;"><strong>First Isomorphism Theorem:</strong> X/ker(f) &cong; im(f) (|X/ker(f)| = ${kernel.quotientSize} = |im(f)| = ${analysis.image.length})</div>
          ${kernel.isTrivial 
            ? '<div style="color: #34d399;">✓ Trivial Kernel: Each input forms its own singleton class (f is Injective).</div>'
            : `<div style="color: #f87171;">⚠ Non-Trivial Kernel: Collision fibers merge ${kernel.nonTrivialClasses.map(c => `{${c.elements.join(', ')}} &rarr; ${c.output}`).join(', ')}</div>`}
        </div>
      `;

      telemetryContainer.innerHTML = `
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
          <div><strong>Domain X:</strong> { ${domain.join(', ')} } &nbsp;|&nbsp; <strong>|X|:</strong> ${domain.length}</div>
          <div><strong>Codomain Y:</strong> { ${codomain.join(', ')} } &nbsp;|&nbsp; <strong>|Y|:</strong> ${codomain.length}</div>
          <div><strong>Graph Pairs f:</strong> { ${pairsFormatted} }</div>
          <div><strong>Image im(f):</strong> ${imageFormatted}</div>
          ${reasonHtml}
          ${kernelHtml}
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
