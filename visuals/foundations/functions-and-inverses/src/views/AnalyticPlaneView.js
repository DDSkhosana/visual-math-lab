/**
 * AnalyticPlaneView — Continuous Cartesian Plane with Diagonal Mirror Reflection (y = x)
 * Visual Mathematics Lab — Module 1: Functions, Inverses & Reversibility
 */

import { FunctionMath } from '../../../js/foundations-core.js';

export class AnalyticPlaneView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.scale = 45; // pixels per unit
    this.originX = 0;
    this.originY = 0;
    this.isDraggingPoint = false;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="analytic-canvas-container" id="analytic-view">
        <canvas class="analytic-canvas" id="analytic-canvas"></canvas>
      </div>
    `;

    this.canvas = this.container.querySelector('#analytic-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.setupEventListeners();
    this.resize();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 450;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.originX = this.width / 2;
    this.originY = this.height / 2;
    this.scale = Math.min(this.width, this.height) / 10;

    this.render();
  }

  toScreen(mathX, mathY) {
    return {
      x: this.originX + mathX * this.scale,
      y: this.originY - mathY * this.scale
    };
  }

  toMath(screenX, screenY) {
    return {
      x: (screenX - this.originX) / this.scale,
      y: (this.originY - screenY) / this.scale
    };
  }

  render() {
    if (!this.ctx || this.width === 0) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const state = this.controller.state;
    const model = FunctionMath.continuousPresets[state.analyticPreset] || FunctionMath.continuousPresets.linear;

    // 1. Grid & Coordinate Axes
    this.drawAxes(ctx);

    // 2. Diagonal Reflection Line y = x
    this.drawDiagonalLine(ctx);

    // 3. Forward Curve y = f(x)
    this.drawForwardCurve(ctx, model, state);

    // 4. Inverse Curve y = f⁻¹(x)
    this.drawInverseCurve(ctx, model, state);

    // 5. Interactive Point Tracer & Orthogonal Reflection Chord
    this.drawPointReflection(ctx, model, state);
  }

  drawAxes(ctx) {
    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const minY = -(this.height - this.originY) / this.scale;
    const maxY = this.originY / this.scale;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    // Grid lines
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
      const p1 = this.toScreen(x, minY);
      const p2 = this.toScreen(x, maxY);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const p1 = this.toScreen(minX, y);
      const p2 = this.toScreen(maxX, y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;

    // X Axis
    const xAxisStart = this.toScreen(minX, 0);
    const xAxisEnd = this.toScreen(maxX, 0);
    ctx.beginPath();
    ctx.moveTo(xAxisStart.x, xAxisStart.y);
    ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
    ctx.stroke();

    // Y Axis
    const yAxisStart = this.toScreen(0, minY);
    const yAxisEnd = this.toScreen(0, maxY);
    ctx.beginPath();
    ctx.moveTo(yAxisStart.x, yAxisStart.y);
    ctx.lineTo(yAxisEnd.x, yAxisEnd.y);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('x', this.width - 15, this.originY - 6);
    ctx.fillText('y', this.originX + 8, 15);
    ctx.restore();
  }

  drawDiagonalLine(ctx) {
    const bound = Math.max(this.width, this.height) / this.scale;
    const p1 = this.toScreen(-bound, -bound);
    const p2 = this.toScreen(bound, bound);

    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 12px sans-serif';
    const labelPos = this.toScreen(3.2, 3.2);
    ctx.fillText('mirror line y = x', labelPos.x + 8, labelPos.y - 8);
    ctx.restore();
  }

  drawForwardCurve(ctx, model, state) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const step = 0.05;

    ctx.beginPath();
    let started = false;

    for (let x = minX; x <= maxX; x += step) {
      if (model.id === 'quadratic' && state.restrictDomain && x < 0) {
        continue;
      }

      const y = model.forward(x);
      if (isNaN(y) || !isFinite(y)) {
        started = false;
        continue;
      }

      const screen = this.toScreen(x, y);
      if (!started) {
        ctx.moveTo(screen.x, screen.y);
        started = true;
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    }
    ctx.stroke();

    // Label
    const labelScreen = this.toScreen(1.8, model.forward(1.8));
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(model.forwardFormulaText, labelScreen.x + 10, labelScreen.y - 10);

    ctx.restore();
  }

  drawInverseCurve(ctx, model, state) {
    ctx.save();

    if (model.id === 'quadratic' && !state.restrictDomain) {
      // If not restricted, show that inverse is multivalued (sideways parabola branches ±sqrt(x))
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);

      // Upper branch y = sqrt(x)
      ctx.beginPath();
      for (let x = 0; x <= 6; x += 0.05) {
        const p = this.toScreen(x, Math.sqrt(x));
        if (x === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      // Lower branch y = -sqrt(x)
      for (let x = 6; x >= 0; x -= 0.05) {
        const p = this.toScreen(x, -Math.sqrt(x));
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = 'italic 11px sans-serif';
      const warnPos = this.toScreen(2, -1.8);
      ctx.fillText('Reflected curve fails vertical line test (multivalued)', warnPos.x, warnPos.y);

      ctx.restore();
      return;
    }

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.5;

    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const step = 0.05;

    ctx.beginPath();
    let started = false;

    for (let x = minX; x <= maxX; x += step) {
      const y = model.inverse(x);
      if (isNaN(y) || !isFinite(y)) {
        started = false;
        continue;
      }

      const screen = this.toScreen(x, y);
      if (!started) {
        ctx.moveTo(screen.x, screen.y);
        started = true;
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    }
    ctx.stroke();

    // Label
    const labelX = model.id === 'exponential' ? 2.5 : 2.5;
    const labelY = model.inverse(labelX);
    if (!isNaN(labelY)) {
      const labelScreen = this.toScreen(labelX, labelY);
      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(model.inverseFormulaText, labelScreen.x + 10, labelScreen.y + 16);
    }

    ctx.restore();
  }

  drawPointReflection(ctx, model, state) {
    const x0 = state.tracerX;
    if (model.id === 'quadratic' && state.restrictDomain && x0 < 0) {
      return;
    }

    const y0 = model.forward(x0);
    if (isNaN(y0) || !isFinite(y0)) return;

    // Reflected point on inverse: (y0, x0)
    const pForward = this.toScreen(x0, y0);
    const pReflected = this.toScreen(y0, x0);

    ctx.save();

    // 1. Orthogonal connecting chord
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pForward.x, pForward.y);
    ctx.lineTo(pReflected.x, pReflected.y);
    ctx.stroke();

    // 2. Midpoint on y = x
    const midX = (x0 + y0) / 2;
    const midY = (y0 + x0) / 2;
    const pMid = this.toScreen(midX, midY);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(pMid.x, pMid.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. Forward point (x0, f(x0))
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pForward.x, pForward.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Label forward point
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`P(${x0.toFixed(2)}, ${y0.toFixed(2)})`, pForward.x + 8, pForward.y - 8);

    // 4. Reflected point (f(x0), x0)
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(pReflected.x, pReflected.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Label reflected point
    ctx.fillStyle = '#fce7f3';
    ctx.fillText(`P'(${y0.toFixed(2)}, ${x0.toFixed(2)})`, pReflected.x + 8, pReflected.y + 14);

    ctx.restore();
  }

  onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clickPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const state = this.controller.state;
    const model = FunctionMath.continuousPresets[state.analyticPreset] || FunctionMath.continuousPresets.linear;
    const x0 = state.tracerX;
    const y0 = model.forward(x0);
    const pForward = this.toScreen(x0, y0);

    const dist = Math.hypot(clickPos.x - pForward.x, clickPos.y - pForward.y);
    if (dist <= 25) {
      this.isDraggingPoint = true;
    }
  }

  onPointerMove(e) {
    if (!this.isDraggingPoint) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const mathPos = this.toMath(screenX, 0);

    let newX = Math.max(-5, Math.min(5, mathPos.x));
    const state = this.controller.state;
    if (state.analyticPreset === 'quadratic' && state.restrictDomain && newX < 0) {
      newX = 0;
    }

    this.controller.setTracerX(newX);
  }

  onPointerUp() {
    this.isDraggingPoint = false;
  }
}
