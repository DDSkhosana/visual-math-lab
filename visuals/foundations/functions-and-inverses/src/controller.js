/**
 * Controller — Functions, Inverses & Reversibility
 * Visual Mathematics Lab — Module 1
 */

import { FunctionMath, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections } from '../../js/foundations-core.js';
import { DiscreteMappingView } from './views/DiscreteMappingView.js';
import { AnalyticPlaneView } from './views/AnalyticPlaneView.js';
import { CompositionView } from './views/CompositionView.js';
import { FunctionGridView } from './views/FunctionGridView.js';
import { Functions3DView } from './views/Functions3DView.js';

export class FunctionsController {
  constructor() {
    this.state = {
      viewMode: 'split',            // 'split' | '2d' | '3d'
      splitDirection: 'horizontal', // 'horizontal' | 'vertical'
      splitRatio: 50,
      dualMode: 'analytic',         // 'analytic' | 'grid' | 'composition'
      primaryMode: 'discrete',      // 'discrete' | 'analytic' | 'grid' | 'composition'
      threeMode: 'spatial-bipartite', // 'spatial-bipartite' | 'analytic-surface' | 'grid-beacons' | 'pipeline-3d'
      spatial3D: true,              // whether secondary canvas displays 3D WebGL (true) or 2D (false)
      cameraPreset: 'iso',

      activeMode: 'discrete', // backward compatibility: 'discrete' | 'analytic' | 'composition'
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
      activeSpecStyle: 1,
      customModel: null,
      formulaAnalysis: null,
      customFormulaStr: 'x^3 - 3*x',
      customMinX: -3.5,
      customMaxX: 3.5
    };

    this.discreteView = null;
    this.gridView = null;
    this.analyticView = null;
    this.compositionView = null;
    this.threeView = null;
    this.primaryAnalyticView = null;
    this.primaryGridView = null;
    this.primaryCompositionView = null;
    this.containers = null;

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
    this.containers = containers;
    if (containers.discrete) {
      this.discreteView = new DiscreteMappingView(containers.discrete, this);
    }
    if (containers.grid) {
      this.gridView = new FunctionGridView(containers.grid, this);
    }
    if (containers.analytic) {
      this.analyticView = new AnalyticPlaneView(containers.analytic, this);
    }
    if (containers.composition) {
      this.compositionView = new CompositionView(containers.composition, this);
    }
    if (containers.three) {
      this.threeView = new Functions3DView(containers.three, this);
    }
    if (containers.primaryAnalytic) {
      this.primaryAnalyticView = new AnalyticPlaneView(containers.primaryAnalytic, this);
    }
    if (containers.primaryGrid) {
      this.primaryGridView = new FunctionGridView(containers.primaryGrid, this);
    }
    if (containers.primaryComposition) {
      this.primaryCompositionView = new CompositionView(containers.primaryComposition, this);
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
      this.renderSpecStyleWorkbench();
    }
  }

  bindDomControls() {
    if (typeof document === 'undefined') return;

    // View Mode Switcher ('split' | '2d' | '3d' or legacy 'discrete' | 'analytic' | 'composition')
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

    // Dual Mode Switcher (Continuous Mirror | Coordinate Grid | Composition Machine)
    document.querySelectorAll('[data-dual-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dualMode = e.currentTarget.dataset.dualMode;
        this.setDualMode(dualMode);
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

    // 12 Specification Styles Selector
    document.querySelectorAll('[data-spec-style]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const style = e.currentTarget.dataset.specStyle;
        this.setSpecStyle(style);
      });
    });

    // Reset Button
    document.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.reset();
    });
  }

  setSpecStyle(styleNum) {
    this.state.activeSpecStyle = Number(styleNum) || 1;
    document.querySelectorAll('[data-spec-style]').forEach(btn => {
      const isActive = Number(btn.dataset.specStyle) === this.state.activeSpecStyle;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    this.renderSpecStyleWorkbench();
  }

  renderSpecStyleWorkbench() {
    const workbench = document.querySelector('#spec-style-workbench');
    if (!workbench) return;
    const style = this.state.activeSpecStyle;

    switch (style) {
      case 1:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 1: Set of Ordered Pairs (Kuratowski)</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">A function is formally a subset of the Cartesian product: <code>f &sube; X &times; Y</code> satisfying totality and uniqueness.</p>
          <div style="background: #0b1120; padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08); font-family: monospace; color: #e2e8f0; margin-bottom: 8px;">
            f = { ${this.state.pairs.map(([x, y]) => `(${x}, ${y})`).join(', ')} }
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-sky-400" id="wb-btn-load-bijection">Load Standard Bijection</button>
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-amber-400" id="wb-btn-load-injective">Load Injective (Unhit)</button>
          </div>
        `;
        workbench.querySelector('#wb-btn-load-bijection')?.addEventListener('click', () => this.applyPreset('bijection'));
        workbench.querySelector('#wb-btn-load-injective')?.addEventListener('click', () => this.applyPreset('injective'));
        break;

      case 2:
        const rows = this.state.pairs.map(([x, y], idx) => `
          <tr>
            <td style="padding: 3px 6px; border: 1px solid rgba(255,255,255,0.1);"><input type="text" class="wb-table-x" data-idx="${idx}" value="${x}" style="width: 40px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; text-align: center; border-radius: 3px;"></td>
            <td style="padding: 3px 6px; border: 1px solid rgba(255,255,255,0.1); text-align: center; color: #64748b;">&rarr;</td>
            <td style="padding: 3px 6px; border: 1px solid rgba(255,255,255,0.1);"><input type="text" class="wb-table-y" data-idx="${idx}" value="${y}" style="width: 40px; background: #0f172a; color: #f472b6; border: 1px solid #334155; text-align: center; border-radius: 3px;"></td>
          </tr>
        `).join('');
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 2: Table Form (Direct Input-Output Lookup)</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Tabular representation pairing elements. Edit values in the table and click Apply:</p>
          <table style="border-collapse: collapse; margin-bottom: 8px;">
            <thead><tr style="color: #94a3b8;"><th style="padding: 2px 6px;">x &isin; X</th><th></th><th style="padding: 2px 6px;">y = f(x)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-apply-table">Apply Table Changes</button>
        `;
        workbench.querySelector('#wb-btn-apply-table')?.addEventListener('click', () => {
          const xInputs = Array.from(workbench.querySelectorAll('.wb-table-x'));
          const yInputs = Array.from(workbench.querySelectorAll('.wb-table-y'));
          const newPairs = [];
          for (let i = 0; i < xInputs.length; i++) {
            const xVal = isNaN(Number(xInputs[i].value)) ? xInputs[i].value : Number(xInputs[i].value);
            const yVal = isNaN(Number(yInputs[i].value)) ? yInputs[i].value : Number(yInputs[i].value);
            newPairs.push([xVal, yVal]);
          }
          this.state.pairs = newPairs;
          this.updateAll();
        });
        break;

      case 3:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 3: Explicit Formula</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Explicit analytical computation rule y = f(x). Select a formula:</p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-sky-300" data-f="linear">f(x) = 2x + 1</button>
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-sky-300" data-f="cubic">f(x) = x³</button>
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-sky-300" data-f="exponential">f(x) = eˣ</button>
            <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-sky-300" data-f="quadratic">f(x) = x²</button>
          </div>
        `;
        workbench.querySelectorAll('[data-f]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.setAnalyticPreset(e.currentTarget.dataset.f);
            this.setDualMode('analytic');
          });
        });
        break;

      case 4:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 4: Piecewise Formula</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Defined by different formulas across partitioned subdomains:</p>
          <div style="background: #0b1120; padding: 6px 10px; border-radius: 4px; font-family: monospace; color: #e2e8f0; margin-bottom: 8px;">
            f(x) = { x&sup2; (if x &ge; 0); &minus;x (if x &lt; 0) }
          </div>
          <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-load-piecewise">Plot Piecewise Function</button>
        `;
        workbench.querySelector('#wb-btn-load-piecewise')?.addEventListener('click', () => {
          this.setDualMode('analytic');
          this.loadCustomFormula('x >= 0 ? x^2 : -x', -3, 3);
        });
        break;

      case 5:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 5: Implicit Equation F(x, y) = 0</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Circle: x&sup2; + y&sup2; = 9 &rArr; y = &plusmn;&radic;(9 &minus; x&sup2;). Fails uniqueness &exist;!y (2 outputs per x).</p>
          <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 text-rose-400" id="wb-btn-load-implicit">Demonstrate Vertical Line Test Failure</button>
        `;
        workbench.querySelector('#wb-btn-load-implicit')?.addEventListener('click', () => {
          this.setDualMode('analytic');
          this.loadCustomFormula('sqrt(Math.max(0, 9 - x^2))', -3, 3);
        });
        break;

      case 6:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 6: Inductive / Recurrence Relation</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Base case: f(0) = 1, Step: f(n) = 2 &times; f(n &minus; 1).</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
            <span>n:</span>
            <input type="number" id="wb-rec-n" value="4" min="0" max="6" style="width: 45px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 2px 4px; border-radius: 3px;">
            <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-run-rec">Compute Trace</button>
          </div>
          <div id="wb-rec-result" style="font-family: monospace; color: #34d399; font-size: 0.75rem;">f(4) = 2 &times; f(3) = 2 &times; 8 = 16</div>
        `;
        workbench.querySelector('#wb-btn-run-rec')?.addEventListener('click', () => {
          const n = parseInt(workbench.querySelector('#wb-rec-n').value) || 0;
          const val = Math.pow(2, n);
          workbench.querySelector('#wb-rec-result').textContent = `f(${n}) = 2^${n} = ${val} (Unrolled in ${n} steps)`;
        });
        break;

      case 7:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 7: Algorithmic / Program</div>
          <pre style="background: #0b1120; padding: 4px 8px; border-radius: 4px; color: #a5b4fc; font-size: 0.72rem; margin: 0 0 6px 0;">function collatz(x) { return x % 2 === 0 ? x / 2 : 3 * x + 1; }</pre>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span>x:</span>
            <input type="number" id="wb-prog-x" value="7" style="width: 45px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 2px 4px; border-radius: 3px;">
            <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-run-prog">Run</button>
            <span id="wb-prog-result" style="font-family: monospace; color: #34d399;">&rarr; 22</span>
          </div>
        `;
        workbench.querySelector('#wb-btn-run-prog')?.addEventListener('click', () => {
          const x = parseInt(workbench.querySelector('#wb-prog-x').value) || 1;
          const res = x % 2 === 0 ? x / 2 : 3 * x + 1;
          workbench.querySelector('#wb-prog-result').textContent = `collatz(${x}) → ${res}`;
        });
        break;

      case 8:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 8: &lambda;-Calculus Abstraction</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Pure Church term: (&lambda;x. 2x + 1)</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
            <span>Argument:</span>
            <input type="number" id="wb-lambda-arg" value="5" style="width: 45px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; padding: 2px 4px; border-radius: 3px;">
            <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-run-lambda">&beta;-Reduce</button>
          </div>
          <div id="wb-lambda-result" style="font-family: monospace; color: #e2e8f0; font-size: 0.72rem;">(&lambda;x. 2x + 1) 5 &rarr;β 2(5) + 1 = 11</div>
        `;
        workbench.querySelector('#wb-btn-run-lambda')?.addEventListener('click', () => {
          const arg = parseInt(workbench.querySelector('#wb-lambda-arg').value) || 0;
          workbench.querySelector('#wb-lambda-result').textContent = `(λx. 2x + 1) ${arg} →β 2(${arg}) + 1 = ${2 * arg + 1}`;
        });
        break;

      case 9:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 9: Graphical Plot in &reals;&sup2;</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Geometric curve passing Vertical Line Test (&le;1 output per input).</p>
          <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-view-plane">View Continuous Cartesian Plane</button>
        `;
        workbench.querySelector('#wb-btn-view-plane')?.addEventListener('click', () => {
          this.setDualMode('analytic');
          this.setViewMode('split');
        });
        break;

      case 10:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 10: Categorical Morphism</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Morphism arrow X &rarr; Y with identity id_X and round-trip composition.</p>
          <button type="button" class="btn text-xs px-2 py-1 bg-sky-900 text-sky-200" id="wb-btn-view-composition">View Round-Trip Composition Machine</button>
        `;
        workbench.querySelector('#wb-btn-view-composition')?.addEventListener('click', () => {
          this.setDualMode('composition');
          this.setViewMode('split');
        });
        break;

      case 11:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 11: Characteristic Indicator &chi;_A</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">Select elements of subset A &sube; {1, 2, 3, 4, 5}:</p>
          <div style="display: flex; gap: 8px; margin-bottom: 6px;">
            <label style="cursor: pointer;"><input type="checkbox" class="wb-subset" value="1" checked> 1</label>
            <label style="cursor: pointer;"><input type="checkbox" class="wb-subset" value="2"> 2</label>
            <label style="cursor: pointer;"><input type="checkbox" class="wb-subset" value="3" checked> 3</label>
            <label style="cursor: pointer;"><input type="checkbox" class="wb-subset" value="4"> 4</label>
            <label style="cursor: pointer;"><input type="checkbox" class="wb-subset" value="5" checked> 5</label>
          </div>
          <div id="wb-subset-result" style="font-family: monospace; color: #34d399; font-size: 0.75rem;">&chi;_A = [1, 0, 1, 0, 1]</div>
        `;
        workbench.querySelectorAll('.wb-subset').forEach(cb => {
          cb.addEventListener('change', () => {
            const checks = Array.from(workbench.querySelectorAll('.wb-subset')).map(c => c.checked ? 1 : 0);
            workbench.querySelector('#wb-subset-result').textContent = `χ_A = [${checks.join(', ')}]`;
          });
        });
        break;

      case 12:
        workbench.innerHTML = `
          <div style="color: #38bdf8; font-weight: 600; margin-bottom: 4px;">Style 12: Limit / Series (Taylor Approximation)</div>
          <p style="margin: 0 0 6px 0; color: #94a3b8;">eˣ &approx; &sum; xⁿ / n! with N polynomial terms:</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
            <span>N: <b id="wb-n-val" style="color: #38bdf8;">3</b></span>
            <input type="range" id="wb-n-slider" min="1" max="6" value="3" style="flex: 1;">
          </div>
          <div id="wb-n-formula" style="font-family: monospace; color: #e2e8f0; font-size: 0.72rem;">f₃(x) = 1 + x + x²/2 + x³/6</div>
        `;
        workbench.querySelector('#wb-n-slider')?.addEventListener('input', (e) => {
          const n = parseInt(e.target.value) || 1;
          workbench.querySelector('#wb-n-val').textContent = n;
          const terms = ['1', 'x'];
          if (n >= 2) terms.push('x²/2');
          if (n >= 3) terms.push('x³/6');
          if (n >= 4) terms.push('x⁴/24');
          if (n >= 5) terms.push('x⁵/120');
          if (n >= 6) terms.push('x⁶/720');
          workbench.querySelector('#wb-n-formula').textContent = `f_${n}(x) = ${terms.join(' + ')}`;
        });
        break;
    }
  }

  setViewMode(mode) {
    if (typeof document === 'undefined') {
      if (['discrete', 'analytic', 'composition'].includes(mode)) {
        this.state.activeMode = mode;
      }
      return;
    }

    // Handle legacy view modes
    if (mode === 'discrete') {
      this.state.activeMode = 'discrete';
      mode = 'split';
    } else if (mode === 'analytic') {
      this.state.activeMode = 'analytic';
      this.setDualMode('analytic');
      return;
    } else if (mode === 'composition') {
      this.state.activeMode = 'composition';
      this.setDualMode('composition');
      return;
    }

    this.state.viewMode = mode;

    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      const bMode = btn.dataset.viewMode;
      const isActive = bMode === mode || (mode === 'split' && bMode === 'discrete');
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

  setPrimaryView(mode) {
    this.state.primaryMode = mode;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-primary-view]').forEach(btn => {
        const isActive = btn.dataset.primaryView === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      const discreteEl = document.querySelector('#discrete-viewport-container');
      const analyticEl = document.querySelector('#primary-analytic-container');
      const gridEl = document.querySelector('#primary-grid-container');
      const compEl = document.querySelector('#primary-composition-container');

      if (discreteEl) discreteEl.style.display = mode === 'discrete' ? 'block' : 'none';
      if (analyticEl) analyticEl.style.display = mode === 'analytic' ? 'block' : 'none';
      if (gridEl) gridEl.style.display = mode === 'grid' ? 'block' : 'none';
      if (compEl) compEl.style.display = mode === 'composition' ? 'block' : 'none';

      const titleName = document.querySelector('#title-primary-name');
      if (titleName) {
        if (mode === 'discrete') titleName.textContent = 'Discrete Bipartite Graph';
        else if (mode === 'analytic') titleName.textContent = 'Continuous Plane & Mirror';
        else if (mode === 'grid') titleName.textContent = 'Coordinate Grid (X × Y)';
        else if (mode === 'composition') titleName.textContent = 'Composition Pipeline';
      }
    }

    if (mode === 'discrete') this.discreteView?.resize();
    if (mode === 'analytic') this.primaryAnalyticView?.resize();
    if (mode === 'grid') this.primaryGridView?.resize();
    if (mode === 'composition') this.primaryCompositionView?.render();

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
      const analyticSec = document.querySelector('#analytic-viewport-container');
      const gridSec = document.querySelector('#mapping-grid-viewport-container');
      const compSec = document.querySelector('#composition-viewport-container');
      const cameraBar = document.querySelector('#camera-presets-bar');

      if (threeContainer) threeContainer.style.display = 'block';
      if (analyticSec) analyticSec.style.display = 'none';
      if (gridSec) gridSec.style.display = 'none';
      if (compSec) compSec.style.display = 'none';
      if (cameraBar) cameraBar.style.display = 'flex';

      const titleSec = document.querySelector('#title-secondary-name');
      const valDual = document.querySelector('#val-dual-name');
      let titleText = 'Parallel-Plane Bipartite';
      let statsText = '3D Spatial Venn (Z = ±4.5)';

      if (mode === 'analytic-surface') {
        titleText = '3D Analytic Curve & Amber y = x Sheet';
        statsText = '3D Analytic & Amber Identity Plane';
      } else if (mode === 'grid-beacons') {
        titleText = '3D Coordinate Grid & Matrix Beacons';
        statsText = '3D Matrix Grid (X × Y Beacons)';
      } else if (mode === 'pipeline-3d') {
        titleText = '3D Round-Trip Helical Chamber Loop';
        statsText = '3D Round-Trip Pipeline Loop';
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

    if (dualMode === 'analytic') {
      this.state.activeMode = 'analytic';
    } else if (dualMode === 'composition') {
      this.state.activeMode = 'composition';
    } else {
      this.state.activeMode = 'discrete';
    }

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
      const analyticSec = document.querySelector('#analytic-viewport-container');
      const gridSec = document.querySelector('#mapping-grid-viewport-container');
      const compSec = document.querySelector('#composition-viewport-container');

      if (threeContainer) threeContainer.style.display = 'none';
      if (cameraBar) cameraBar.style.display = 'none';
      if (analyticSec) analyticSec.style.display = dualMode === 'analytic' ? 'block' : 'none';
      if (gridSec) gridSec.style.display = dualMode === 'grid' ? 'block' : 'none';
      if (compSec) compSec.style.display = dualMode === 'composition' ? 'block' : 'none';

      // Update secondary view title
      const titleSec = document.querySelector('#view-title-secondary');
      const titleName = document.querySelector('#title-secondary-name');
      const valDual = document.querySelector('#val-dual-name');

      if (titleName) {
        if (dualMode === 'analytic') titleName.textContent = 'Continuous Plane (2D)';
        else if (dualMode === 'grid') titleName.textContent = 'Coordinate Grid (2D)';
        else if (dualMode === 'composition') titleName.textContent = 'Composition Pipeline (2D)';
      }
      if (valDual) {
        if (dualMode === 'analytic') valDual.textContent = '2D Continuous Plane (y = f(x))';
        else if (dualMode === 'grid') valDual.textContent = '2D Coordinate Grid (X × Y)';
        else if (dualMode === 'composition') valDual.textContent = '2D Composition Machine';
      }
    }

    if (dualMode === 'analytic') this.analyticView?.resize();
    if (dualMode === 'grid') this.gridView?.resize();
    if (dualMode === 'composition') this.compositionView?.render();

    this.updateTelemetry();
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

  resizeAllViews() {
    this.discreteView?.resize();
    this.analyticView?.resize();
    this.gridView?.resize();
    this.compositionView?.render();
    this.primaryAnalyticView?.resize();
    this.primaryGridView?.resize();
    this.primaryCompositionView?.render();
    this.threeView?.resize();
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
    this.setViewMode('split');
    this.setDualMode('analytic');
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
    this.gridView?.render();
    this.compositionView?.render();
    this.primaryAnalyticView?.render();
    this.primaryGridView?.render();
    this.primaryCompositionView?.render();
    if (this.threeView && this.state.spatial3D) {
      this.threeView.render(this.state);
    }
    this.updateTelemetry();
  }

  updateTelemetry() {
    if (typeof document === 'undefined') return;

    const { domain, codomain, pairs, showInverse, analyticPreset, customModel, formulaAnalysis, dualMode, tracerX, spatial3D, threeMode } = this.state;

    // 1. Compute discrete analysis
    const analysis = FunctionMath.analyzeRelationAsFunction(domain, codomain, pairs);
    const kernel = FunctionMath.computeKernelEquivalenceRelation(domain, pairs);

    // 2. Primary 2D Telemetry Panel Updates
    const elIsFunc = document.querySelector('#tel-is-function');
    if (elIsFunc) {
      elIsFunc.textContent = analysis.isFunction ? 'YES (Well-Defined)' : 'NO (Violated)';
      elIsFunc.className = analysis.isFunction ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elTotality = document.querySelector('#tel-totality');
    if (elTotality) {
      elTotality.textContent = analysis.isTotal
        ? `SATISFIED (${domain.length}/${domain.length} mapped)`
        : `FAILS: Missing {${analysis.missingInputs.join(', ')}}`;
      elTotality.className = analysis.isTotal ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elUniq = document.querySelector('#tel-uniqueness');
    if (elUniq) {
      elUniq.textContent = analysis.isUnique
        ? 'SATISFIED (Single-valued)'
        : `FAILS: Multi-valued at {${analysis.multiValuedInputs.map(m => m.x).join(', ')}}`;
      elUniq.className = analysis.isUnique ? 'color-emerald font-bold' : 'color-rose font-bold';
    }

    const elInj = document.querySelector('#tel-injective');
    if (elInj) {
      elInj.textContent = analysis.isInjective
        ? 'YES (One-to-One, ker(f) is diagonal)'
        : `NO (${analysis.collisionOutputs.length} collision output(s))`;
      elInj.className = analysis.isInjective ? 'color-teal font-bold' : 'color-rose font-bold';
    }

    const elLeftInv = document.querySelector('#tel-left-inverse');
    if (elLeftInv) {
      if (analysis.isInjective && domain.length > 0) {
        elLeftInv.textContent = 'EXISTS (∀x ∈ X, g(f(x)) = x)';
        elLeftInv.className = 'color-blue font-bold';
      } else {
        elLeftInv.textContent = 'NONE (Collisions destroy left-invertibility)';
        elLeftInv.className = 'color-rose font-bold';
      }
    }

    const elSurj = document.querySelector('#tel-surjective');
    if (elSurj) {
      elSurj.textContent = analysis.isSurjective
        ? 'YES (Onto, im(f) = Y)'
        : `NO (Unhit: {${analysis.unhitOutputs.join(', ')}})`;
      elSurj.className = analysis.isSurjective ? 'color-fuchsia font-bold' : 'color-amber font-bold';
    }

    const elRightInv = document.querySelector('#tel-right-inverse');
    if (elRightInv) {
      if (analysis.isSurjective) {
        elRightInv.textContent = 'EXISTS (∀y ∈ Y, f(h(y)) = y)';
        elRightInv.className = 'color-violet font-bold';
      } else {
        elRightInv.textContent = 'NONE (Unhit outputs have no preimage)';
        elRightInv.className = 'color-rose font-bold';
      }
    }

    const elBij = document.querySelector('#tel-bijective');
    if (elBij) {
      elBij.textContent = analysis.isBijective ? 'YES (f⁻¹ exists, unique & two-sided)' : 'NO (Isomorphism in Set fails)';
      elBij.className = analysis.isBijective ? 'color-lime font-bold' : 'color-slate font-bold';
    }

    const elRoundtrip = document.querySelector('#tel-roundtrip');
    if (elRoundtrip) {
      if (analysis.isBijective) {
        elRoundtrip.textContent = '(f⁻¹ ∘ f)(x) = x ✓ (Identity preserved)';
        elRoundtrip.className = 'color-lime font-bold';
      } else {
        elRoundtrip.textContent = 'Non-reversible (Information / entropy loss)';
        elRoundtrip.className = 'color-rose font-bold';
      }
    }

    const elDomCard = document.querySelector('#tel-domain-card');
    if (elDomCard) {
      const injCand = domain.length <= codomain.length ? '|X|≤|Y| (Inj ok)' : '|X|>|Y| (Inj imp)';
      const surjCand = domain.length >= codomain.length ? '|X|≥|Y| (Surj ok)' : '|X|<|Y| (Surj imp)';
      elDomCard.textContent = `|X|=${domain.length}, |Y|=${codomain.length}, |im(f)|=${analysis.image.length} (${injCand}, ${surjCand})`;
    }

    const elCodCard = document.querySelector('#tel-codomain-card');
    if (elCodCard) elCodCard.textContent = `${codomain.length} elements: { ${codomain.join(', ')} }`;

    const elImgCard = document.querySelector('#tel-image-card');
    if (elImgCard) elImgCard.textContent = `{ ${analysis.image.join(', ')} }`;

    const elKernel = document.querySelector('#tel-kernel-classes');
    if (elKernel) {
      elKernel.textContent = `${kernel.quotientSize} class(es): { ${kernel.classes.map(c => `[${c.elements.join(', ')}]`).join(', ')} }`;
    }

    // Toggle Inverse Button state
    const btnInverse = document.querySelector('#btn-toggle-inverse');
    if (btnInverse) {
      btnInverse.disabled = !analysis.isBijective;
      btnInverse.classList.toggle('active', showInverse);
      btnInverse.innerHTML = showInverse ? '↺ Showing Inverse f⁻¹: Y → X' : 'Invert Mapping (f⁻¹)';
    }

    // 3. Secondary Dual / 3D Telemetry Panel Updates
    const model = (analyticPreset === 'custom' && customModel)
      ? customModel
      : (FunctionMath.continuousPresets[analyticPreset] || FunctionMath.continuousPresets.linear);

    const cAnalysis = (analyticPreset === 'custom' && formulaAnalysis)
      ? formulaAnalysis
      : FunctionMath.analyzeContinuousFormula(model.forward, -4, 4);

    const elDualName = document.querySelector('#val-dual-name');
    if (elDualName) {
      if (spatial3D) {
        if (threeMode === 'spatial-bipartite') elDualName.textContent = '3D Spatial Venn (Z = ±4.5)';
        else if (threeMode === 'analytic-surface') elDualName.textContent = '3D Analytic & Amber Identity Sheet';
        else if (threeMode === 'grid-beacons') elDualName.textContent = '3D Matrix Grid (X × Y Beacons)';
        else if (threeMode === 'pipeline-3d') elDualName.textContent = '3D Round-Trip Composition Loop';
      } else {
        elDualName.textContent = dualMode === 'analytic'
          ? 'Continuous Plane (2D)'
          : (dualMode === 'grid' ? 'Coordinate Grid (2D)' : 'Composition Machine (2D)');
      }
    }

    const elVertLine = document.querySelector('#val-vert-line-test');
    if (elVertLine) {
      if (analysis.isUnique) {
        elVertLine.textContent = 'PASSED (max 1 output/x)';
        elVertLine.className = 'color-teal font-bold';
      } else {
        elVertLine.textContent = `FAILED (${analysis.multiValuedInputs.length} multi-valued vertical intersection(s))`;
        elVertLine.className = 'color-rose font-bold';
      }
    }

    const elHorizLine = document.querySelector('#val-horiz-line-test');
    if (elHorizLine) {
      if (analysis.isInjective) {
        elHorizLine.textContent = 'PASSED (max 1 input/y)';
        elHorizLine.className = 'color-emerald font-bold';
      } else {
        elHorizLine.textContent = `FAILED (${analysis.collisionOutputs.length} collision horizontal intersection(s))`;
        elHorizLine.className = 'color-amber font-bold';
      }
    }

    const elDualFormula = document.querySelector('#val-dual-formula');
    if (elDualFormula) {
      elDualFormula.textContent = model.forwardFormulaText || this.state.customFormulaStr;
    }

    const pY = model.forward ? model.forward(tracerX) : 0;
    const elDualP = document.querySelector('#val-dual-p');
    if (elDualP) elDualP.textContent = `(${tracerX.toFixed(2)}, ${pY.toFixed(2)}, 0.00)`;

    const elDualPinv = document.querySelector('#val-dual-pinv');
    if (elDualPinv) elDualPinv.textContent = `(${pY.toFixed(2)}, ${tracerX.toFixed(2)}, 0.00)`;

    const distToMirror = Math.abs(pY - tracerX) / Math.SQRT2;
    const elDualDist = document.querySelector('#val-dual-distance');
    if (elDualDist) elDualDist.textContent = `${distToMirror.toFixed(2)} units (normal to y = x)`;

    const pMid = (tracerX + pY) / 2;
    const elDualPmid = document.querySelector('#val-dual-pmid');
    if (elDualPmid) elDualPmid.textContent = `(${pMid.toFixed(2)}, ${pMid.toFixed(2)})`;

    const elDualRoots = document.querySelector('#val-dual-roots');
    if (elDualRoots) {
      const rootsStr = cAnalysis.roots && cAnalysis.roots.length > 0
        ? cAnalysis.roots.map(r => r.toFixed(2)).join(', ')
        : 'None on interval';
      elDualRoots.textContent = `{ ${rootsStr} }`;
    }

    const elDualFixed = document.querySelector('#val-dual-fixed');
    if (elDualFixed) {
      const fixedStr = cAnalysis.fixedPoints && cAnalysis.fixedPoints.length > 0
        ? cAnalysis.fixedPoints.map(f => f.x.toFixed(2)).join(', ')
        : 'None on interval';
      elDualFixed.textContent = `{ ${fixedStr} }`;
    }

    const elDualRange = document.querySelector('#val-dual-range');
    if (elDualRange && cAnalysis.range) {
      elDualRange.textContent = `[${cAnalysis.range.minY.toFixed(2)}, ${cAnalysis.range.maxY.toFixed(2)}]`;
    }

    const elDualIdentity = document.querySelector('#val-dual-identity');
    if (elDualIdentity) {
      elDualIdentity.textContent = cAnalysis.isInjective
        ? '||f⁻¹(f(x)) − x|| = 0.000 ✓ (Identity conserved)'
        : 'f⁻¹ multi-valued (not reversible)';
      elDualIdentity.className = cAnalysis.isInjective ? 'color-lime font-bold' : 'color-rose font-bold';
    }

    const elDualSpatial = document.querySelector('#val-dual-spatial-stat');
    if (elDualSpatial) {
      elDualSpatial.textContent = `${pairs.length} Conduits, ${analysis.collisionOutputs.length} Collision Halos, ${analysis.unhitOutputs.length} Unhit Nodes`;
    }

    if (this.threeView && this.state.spatial3D) {
      this.threeView.render(this.state);
    }
  }
}

export function mountFunctionsVisual(containers) {
  const controller = new FunctionsController();
  controller.mount(containers);
  return controller;
}
