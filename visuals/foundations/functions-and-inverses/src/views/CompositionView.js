/**
 * CompositionView — Sequential Round-Trip Machine & Identity Pipeline
 * Visual Mathematics Lab — Module 1: Functions, Inverses & Reversibility
 */

import { FunctionMath } from '../../../js/foundations-core.js';

export class CompositionView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.animationProgress = 0;
    this.animating = false;
    this.animFrame = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="pipeline-container" style="padding: 20px; color: #cbd5e1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1rem; color: #e2e8f0;">Round-Trip Composition Machine</h3>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn" id="btn-pipeline-dir" style="padding: 4px 10px; font-size: 0.78rem;">
              Direction: <span id="pipeline-dir-label">f⁻¹ ∘ f (X → X)</span>
            </button>
            <button type="button" class="btn active" id="btn-pipeline-run" style="padding: 4px 12px; font-size: 0.78rem;">
              ▶ Run Machine
            </button>
          </div>
        </div>

        <!-- SVG Pipeline Canvas -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 20px; min-height: 220px;">
          <svg id="pipeline-svg" viewBox="0 0 700 180" style="width: 100%; height: 180px; display: block;">
            <defs>
              <linearGradient id="grad-f" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#0369a1" />
              </linearGradient>
              <linearGradient id="grad-finv" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#be185d" />
                <stop offset="100%" stop-color="#831843" />
              </linearGradient>
              <filter id="glow-gold">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Conduit Pipes -->
            <path d="M 60 90 L 190 90" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4" stroke-dasharray="6 4" fill="none" />
            <path d="M 310 90 L 410 90" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4" stroke-dasharray="6 4" fill="none" />
            <path d="M 530 90 L 630 90" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4" stroke-dasharray="6 4" fill="none" />

            <!-- Input Stage -->
            <circle cx="60" cy="90" r="24" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
            <text id="pipe-input-text" x="60" y="95" text-anchor="middle" fill="#38bdf8" font-size="14" font-weight="bold">x</text>
            <text x="60" y="135" text-anchor="middle" fill="#94a3b8" font-size="11">Input</text>

            <!-- Box 1: Forward Function [f] -->
            <rect id="pipe-box1" x="190" y="45" width="120" height="90" rx="10" fill="url(#grad-f)" stroke="#38bdf8" stroke-width="2" />
            <text id="pipe-box1-title" x="250" y="85" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">f</text>
            <text id="pipe-box1-sub" x="250" y="105" text-anchor="middle" fill="#bae6fd" font-size="11">Stage 1</text>

            <!-- Intermediate Output -->
            <circle cx="360" cy="90" r="22" fill="#1e293b" stroke="#f472b6" stroke-width="2" />
            <text id="pipe-mid-text" x="360" y="95" text-anchor="middle" fill="#f472b6" font-size="13" font-weight="bold">f(x)</text>
            <text x="360" y="135" text-anchor="middle" fill="#94a3b8" font-size="11">Intermediate</text>

            <!-- Box 2: Inverse Function [f⁻¹] -->
            <rect id="pipe-box2" x="410" y="45" width="120" height="90" rx="10" fill="url(#grad-finv)" stroke="#f472b6" stroke-width="2" />
            <text id="pipe-box2-title" x="470" y="85" text-anchor="middle" fill="#ffffff" font-size="16" font-weight="bold">f⁻¹</text>
            <text id="pipe-box2-sub" x="470" y="105" text-anchor="middle" fill="#fbcfe8" font-size="11">Stage 2</text>

            <!-- Final Output -->
            <circle id="pipe-output-circle" cx="630" cy="90" r="24" fill="#1e293b" stroke="#10b981" stroke-width="2.5" />
            <text id="pipe-output-text" x="630" y="95" text-anchor="middle" fill="#34d399" font-size="14" font-weight="bold">x</text>
            <text x="630" y="135" text-anchor="middle" fill="#34d399" font-size="11" font-weight="bold">Identity id_X</text>

            <!-- Animated Carrier Token -->
            <circle id="carrier-token" cx="60" cy="90" r="10" fill="#fbbf24" stroke="#ffffff" stroke-width="2" filter="url(#glow-gold)" opacity="0" />
          </svg>
        </div>

        <!-- Telemetry Step Readout -->
        <div class="pipeline-box" style="margin-top: 16px;">
          <div id="pipeline-telemetry" style="font-family: monospace; font-size: 0.9rem; color: #e2e8f0; line-height: 1.6;">
            Starting: x = 3.00 &rarr; f(3) = 7.00 &rarr; f⁻¹(7) = 3.00 (Perfect identity round-trip!)
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    const btnRun = this.container.querySelector('#btn-pipeline-run');
    const btnDir = this.container.querySelector('#btn-pipeline-dir');

    btnRun?.addEventListener('click', () => this.runAnimation());
    btnDir?.addEventListener('click', () => {
      this.controller.togglePipelineDirection();
      this.render();
    });
  }

  runAnimation() {
    if (this.animating) return;
    this.animating = true;
    this.animationProgress = 0;
    const token = this.container.querySelector('#carrier-token');
    if (token) token.setAttribute('opacity', '1');

    const animate = () => {
      this.animationProgress += 0.015;
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.animating = false;
        if (token) token.setAttribute('opacity', '0');
        this.render();
        return;
      }

      // Compute token x position from 60 to 630
      const currentX = 60 + this.animationProgress * (630 - 60);
      if (token) {
        token.setAttribute('cx', currentX);
      }

      this.animFrame = requestAnimationFrame(animate);
    };

    this.animFrame = requestAnimationFrame(animate);
  }

  render() {
    const state = this.controller.state;
    const model = FunctionMath.continuousPresets[state.analyticPreset] || FunctionMath.continuousPresets.linear;
    const isForward = state.pipelineDirection === 'forward'; // f⁻¹ ∘ f

    const dirLabel = this.container.querySelector('#pipeline-dir-label');
    const inputTxt = this.container.querySelector('#pipe-input-text');
    const box1Title = this.container.querySelector('#pipe-box1-title');
    const box2Title = this.container.querySelector('#pipe-box2-title');
    const midTxt = this.container.querySelector('#pipe-mid-text');
    const outTxt = this.container.querySelector('#pipe-output-text');
    const tel = this.container.querySelector('#pipeline-telemetry');

    if (dirLabel) {
      dirLabel.textContent = isForward ? 'f⁻¹ ∘ f (Domain X → X)' : 'f ∘ f⁻¹ (Codomain Y → Y)';
    }

    const xVal = state.tracerX;
    if (isForward) {
      const yVal = model.forward(xVal);
      const returnX = model.inverse(yVal);

      if (inputTxt) inputTxt.textContent = xVal.toFixed(1);
      if (box1Title) box1Title.textContent = 'f';
      if (box2Title) box2Title.textContent = 'f⁻¹';
      if (midTxt) midTxt.textContent = !isNaN(yVal) ? yVal.toFixed(1) : 'undef';
      if (outTxt) outTxt.textContent = !isNaN(returnX) ? returnX.toFixed(1) : 'err';

      if (tel) {
        tel.innerHTML = `
          <strong>Left Identity:</strong> (f⁻¹ &compfn; f)(${xVal.toFixed(2)}) = f⁻¹(f(${xVal.toFixed(2)})) = f⁻¹(${yVal.toFixed(2)}) = <strong>${returnX.toFixed(2)}</strong> = id_X(${xVal.toFixed(2)}) &checkmark;
        `;
      }
    } else {
      const yVal = model.forward(xVal);
      const intermediateX = model.inverse(yVal);
      const returnY = model.forward(intermediateX);

      if (inputTxt) inputTxt.textContent = yVal.toFixed(1);
      if (box1Title) box1Title.textContent = 'f⁻¹';
      if (box2Title) box2Title.textContent = 'f';
      if (midTxt) midTxt.textContent = !isNaN(intermediateX) ? intermediateX.toFixed(1) : 'undef';
      if (outTxt) outTxt.textContent = !isNaN(returnY) ? returnY.toFixed(1) : 'err';

      if (tel) {
        tel.innerHTML = `
          <strong>Right Identity:</strong> (f &compfn; f⁻¹)(${yVal.toFixed(2)}) = f(f⁻¹(${yVal.toFixed(2)})) = f(${intermediateX.toFixed(2)}) = <strong>${returnY.toFixed(2)}</strong> = id_Y(${yVal.toFixed(2)}) &checkmark;
        `;
      }
    }
  }
}
