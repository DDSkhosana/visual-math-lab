/**
 * AnalyticPlaneView — Continuous Cartesian Plane with Diagonal Mirror Reflection (y = x)
 * Adaptive Coordinate Axis & Domain-to-Codomain Semantic Colour Tokens
 * Visual Mathematics Lab — Module 1: Functions, Inverses & Reversibility
 */

import { FunctionMath } from '../../../js/foundations-core.js';

// Semantic Colour Tokens matching Suite 03 Design System
const PALETTE = {
  domain: '#38bdf8',           // Sky Blue (Domain X inputs)
  domainGlow: 'rgba(56, 189, 248, 0.45)',
  domainDim: 'rgba(56, 189, 248, 0.15)',
  codomain: '#f472b6',         // Pink / Rose (Codomain Y outputs)
  codomainGlow: 'rgba(244, 114, 182, 0.45)',
  codomainDim: 'rgba(244, 114, 182, 0.15)',
  mirror: '#e2e8f0',           // Silver / Mirror Line y = x
  mirrorGlow: 'rgba(226, 232, 240, 0.35)',
  tracerChord: 'rgba(251, 191, 36, 0.85)', // Amber Reflection Chord
  tracerMid: '#fbbf24',        // Amber Midpoint on y = x
  gridMajor: 'rgba(255, 255, 255, 0.08)',
  gridMinor: 'rgba(255, 255, 255, 0.025)',
  axisBase: 'rgba(148, 163, 184, 0.35)',
  textMuted: '#94a3b8',
  textBright: '#f8fafc',
  danger: '#f87171',
  dangerDim: 'rgba(239, 68, 68, 0.18)',
  success: '#34d399'
};

export class AnalyticPlaneView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;

    // Viewport & Scale State
    this.scale = 55; // Pixels per unit
    this.defaultScale = 55;
    this.originX = 0;
    this.originY = 0;
    this.panOffsetX = 0;
    this.panOffsetY = 0;

    // Interaction State
    this.isDraggingPoint = false;
    this.isPanning = false;
    this.lastPointerPos = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="analytic-canvas-container" id="analytic-view" style="position: relative; width: 100%; height: 100%;">
        <canvas class="analytic-canvas" id="analytic-canvas" style="display: block; width: 100%; height: 100%; cursor: default;"></canvas>
        <div class="canvas-floating-hints" style="position: absolute; bottom: 12px; left: 16px; font-size: 0.75rem; color: #64748b; pointer-events: none; display: flex; gap: 14px; background: rgba(15, 23, 42, 0.7); padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05);">
          <span><strong style="color: ${PALETTE.domain};">Horizontal Axis:</strong> Domain X</span>
          <span><strong style="color: ${PALETTE.codomain};">Vertical Axis:</strong> Codomain Y</span>
          <span><strong style="color: ${PALETTE.mirror};">y = x:</strong> Reflection Axis</span>
          <span>Drag <b style="color: #fbbf24;">P</b> &bull; Wheel to Zoom &bull; Drag background to Pan</span>
        </div>
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
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', () => this.resetView());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 450;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.defaultScale = Math.min(this.width, this.height) / 9.5;
    if (!this.scale || this.scale < 15) {
      this.scale = this.defaultScale;
    }

    this.originX = this.width / 2 + this.panOffsetX;
    this.originY = this.height / 2 + this.panOffsetY;

    this.render();
  }

  resetView() {
    this.scale = this.defaultScale;
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.originX = this.width / 2;
    this.originY = this.height / 2;
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

  /**
   * Adaptive step computation: 1, 2, or 5 * 10^k
   */
  computeAdaptiveStep() {
    const targetPx = 65; // Target pixel distance between primary ticks
    const rawStep = targetPx / this.scale;
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / power;

    if (fraction >= 5) return 5 * power;
    if (fraction >= 2) return 2 * power;
    return power;
  }

  render() {
    if (!this.ctx || this.width === 0) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const state = this.controller.state;
    const model = this.getModel(state);

    // 1. Grid & Adaptive Coordinate Axes with Semantic Domain/Codomain Tokens
    this.drawAxes(ctx, model, state);

    // 2. Diagonal Reflection Line y = x
    this.drawDiagonalLine(ctx);

    // 3. Forward Curve y = f(x)
    this.drawForwardCurve(ctx, model, state);

    // 4. Inverse Curve y = f⁻¹(x)
    this.drawInverseCurve(ctx, model, state);

    // 5. Numerical Deductions (Roots, Fixed Points, Extrema)
    this.drawNumericalDeductions(ctx, model, state);

    // 6. Interactive Point Reflection & Semantic Coordinate Drop-Lines
    this.drawPointReflection(ctx, model, state);

    // 7. Synchronized Discrete Mapping Pairs & Mirrored Points on Cartesian Plane
    this.drawDiscretePoints(ctx, state);
  }

  drawDiscretePoints(ctx, state) {
    if (!state.pairs || state.pairs.length === 0) return;
    const domain = state.domain || [1, 2, 3, 4, 5];
    const codomain = state.codomain || ['a', 'b', 'c', 'd', 'e'];

    const toNum = (val, list) => {
      const n = Number(val);
      if (!isNaN(n)) return n;
      const idx = list.indexOf(val);
      return idx >= 0 ? idx + 1 : 1;
    };

    ctx.save();
    state.pairs.forEach(([rawX, rawY]) => {
      const x = toNum(rawX, domain);
      const y = toNum(rawY, codomain);

      const pFwd = this.toScreen(x, y);
      const pInv = this.toScreen(y, x);
      const pMid = this.toScreen((x + y) / 2, (x + y) / 2);

      // Amber reflection chord connecting (x, y) and (y, x)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(pFwd.x, pFwd.y);
      ctx.lineTo(pInv.x, pInv.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Midpoint on y = x
      ctx.beginPath();
      ctx.fillStyle = '#fbbf24';
      ctx.arc(pMid.x, pMid.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Forward point (x, y) - Sky Blue
      ctx.beginPath();
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.arc(pFwd.x, pFwd.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inverse point (y, x) - Fuchsia
      ctx.beginPath();
      ctx.fillStyle = '#f472b6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.arc(pInv.x, pInv.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label forward point
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`(${rawX}, ${rawY})`, pFwd.x + 8, pFwd.y - 6);

      // Label inverse point
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`f⁻¹(${rawY})=${rawX}`, pInv.x + 8, pInv.y + 14);
    });
    ctx.restore();
  }

  getModel(state) {
    if (state.analyticPreset === 'custom' && state.customModel) {
      return state.customModel;
    }
    return FunctionMath.continuousPresets[state.analyticPreset] || FunctionMath.continuousPresets.linear;
  }

  drawNumericalDeductions(ctx, model, state) {
    const analysis = model.analysis || (model.id === 'custom' ? state.formulaAnalysis : null);
    if (!analysis) return;

    ctx.save();

    // 1. Draw Roots f(x) = 0 (Emerald Diamonds on the Domain X Axis)
    if (analysis.roots && analysis.roots.length > 0) {
      analysis.roots.forEach((root) => {
        const p = this.toScreen(root, 0);
        ctx.fillStyle = PALETTE.success;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + 6, p.y);
        ctx.lineTo(p.x, p.y + 6);
        ctx.lineTo(p.x - 6, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = PALETTE.success;
        ctx.fillText(`root: ${root.toFixed(2)}`, p.x - 18, p.y + 16);
      });
    }

    // 2. Draw Fixed Points f(x) = x (Amber Stars on the Mirror Line y = x)
    if (analysis.fixedPoints && analysis.fixedPoints.length > 0) {
      analysis.fixedPoints.forEach((fp) => {
        const p = this.toScreen(fp.x, fp.y);
        ctx.fillStyle = PALETTE.tracerMid;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = PALETTE.tracerMid;
        ctx.fillText(`fix: (${fp.x.toFixed(2)}, ${fp.y.toFixed(2)})`, p.x + 8, p.y - 8);
      });
    }

    // 3. Draw Local Extrema
    if (analysis.extrema && analysis.extrema.length > 0) {
      analysis.extrema.forEach((ext) => {
        const p = this.toScreen(ext.x, ext.y);
        ctx.fillStyle = '#c084fc';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText(`${ext.type}: (${ext.x.toFixed(2)}, ${ext.y.toFixed(2)})`, p.x + 8, p.y + (ext.type.includes('max') ? -8 : 12));
      });
    }

    ctx.restore();
  }

  /**
   * Draw the adaptive Cartesian grid and semantically colored axes.
   * - Horizontal Axis: Domain X (Sky Blue #38bdf8)
   * - Vertical Axis: Codomain Y (Pink #f472b6)
   */
  drawAxes(ctx, model, state) {
    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const minY = -(this.height - this.originY) / this.scale;
    const maxY = this.originY / this.scale;

    const step = this.computeAdaptiveStep();
    const startX = Math.floor(minX / step) * step;
    const endX = Math.ceil(maxX / step) * step;
    const startY = Math.floor(minY / step) * step;
    const endY = Math.ceil(maxY / step) * step;

    ctx.save();

    // 1. Minor Sub-Grid
    const subStep = step / 5;
    ctx.strokeStyle = PALETTE.gridMinor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(minX / subStep) * subStep; x <= endX; x += subStep) {
      const p1 = this.toScreen(x, minY);
      const p2 = this.toScreen(x, maxY);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    for (let y = Math.floor(minY / subStep) * subStep; y <= endY; y += subStep) {
      const p1 = this.toScreen(minX, y);
      const p2 = this.toScreen(maxX, y);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // 2. Major Grid
    ctx.strokeStyle = PALETTE.gridMajor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const p1 = this.toScreen(x, minY);
      const p2 = this.toScreen(x, maxY);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    for (let y = startY; y <= endY; y += step) {
      const p1 = this.toScreen(minX, y);
      const p2 = this.toScreen(maxX, y);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // 3. Domain Restriction Shading (for non-injective domain pruning)
    if (model.id === 'quadratic' && state.restrictDomain) {
      const pExclStart = this.toScreen(minX, maxY);
      const pExclEnd = this.toScreen(0, minY);
      ctx.fillStyle = PALETTE.dangerDim;
      ctx.fillRect(pExclStart.x, pExclStart.y, pExclEnd.x - pExclStart.x, pExclEnd.y - pExclStart.y);

      // Warning text in pruned region
      ctx.fillStyle = PALETTE.danger;
      ctx.font = '10px monospace';
      ctx.fillText('Pruned Domain (x < 0) to guarantee bijectivity', pExclStart.x + 12, this.originY - 14);
    }

    // 4. Horizontal Axis: DOMAIN X (Sky Blue)
    const xAxisStart = this.toScreen(minX, 0);
    const xAxisEnd = this.toScreen(maxX, 0);

    // Glowing base line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(xAxisStart.x, xAxisStart.y);
    ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
    ctx.stroke();

    // Core axis line
    ctx.strokeStyle = PALETTE.domain;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(xAxisStart.x, xAxisStart.y);
    ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
    ctx.stroke();

    // Arrowhead at positive X end
    ctx.fillStyle = PALETTE.domain;
    ctx.beginPath();
    ctx.moveTo(xAxisEnd.x - 2, xAxisEnd.y);
    ctx.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 4.5);
    ctx.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 4.5);
    ctx.closePath();
    ctx.fill();

    // 5. Vertical Axis: CODOMAIN Y (Pink)
    const yAxisStart = this.toScreen(0, minY);
    const yAxisEnd = this.toScreen(0, maxY);

    // Glowing base line
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.2)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(yAxisStart.x, yAxisStart.y);
    ctx.lineTo(yAxisEnd.x, yAxisEnd.y);
    ctx.stroke();

    // Core axis line
    ctx.strokeStyle = PALETTE.codomain;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(yAxisStart.x, yAxisStart.y);
    ctx.lineTo(yAxisEnd.x, yAxisEnd.y);
    ctx.stroke();

    // Arrowhead at positive Y end
    ctx.fillStyle = PALETTE.codomain;
    ctx.beginPath();
    ctx.moveTo(yAxisEnd.x, yAxisEnd.y + 2);
    ctx.lineTo(yAxisEnd.x - 4.5, yAxisEnd.y + 10);
    ctx.lineTo(yAxisEnd.x + 4.5, yAxisEnd.y + 10);
    ctx.closePath();
    ctx.fill();

    // 6. Adaptive Ticks and Numerical Labels
    ctx.font = '10px monospace';
    const numDecimals = step < 1 ? 1 : 0;

    // X Ticks (Domain Sky Blue)
    for (let x = startX; x <= endX; x += step) {
      if (Math.abs(x) < 0.0001) continue; // Skip origin
      const p = this.toScreen(x, 0);

      ctx.strokeStyle = PALETTE.domain;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 4);
      ctx.lineTo(p.x, p.y + 4);
      ctx.stroke();

      ctx.fillStyle = PALETTE.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText(x.toFixed(numDecimals), p.x, p.y + 15);
    }

    // Y Ticks (Codomain Pink)
    for (let y = startY; y <= endY; y += step) {
      if (Math.abs(y) < 0.0001) continue; // Skip origin
      const p = this.toScreen(0, y);

      ctx.strokeStyle = PALETTE.codomain;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y);
      ctx.lineTo(p.x + 4, p.y);
      ctx.stroke();

      ctx.fillStyle = PALETTE.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(y.toFixed(numDecimals), p.x - 7, p.y + 3);
    }

    // Origin (0, 0) Marker
    const pOrigin = this.toScreen(0, 0);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText('0', pOrigin.x - 6, pOrigin.y + 14);

    // 7. Semantic Axis Badges
    // Domain X Pill Badge
    this.drawAxisPillBadge(
      ctx,
      xAxisEnd.x - 110,
      xAxisEnd.y + 10,
      'Domain X (inputs x)',
      PALETTE.domain,
      'rgba(56, 189, 248, 0.12)'
    );

    // Codomain Y Pill Badge
    this.drawAxisPillBadge(
      ctx,
      yAxisEnd.x + 12,
      yAxisEnd.y + 8,
      'Codomain Y (outputs y)',
      PALETTE.codomain,
      'rgba(244, 114, 182, 0.12)'
    );

    ctx.restore();
  }

  drawAxisPillBadge(ctx, x, y, text, color, bg) {
    ctx.save();
    ctx.font = 'bold 10px monospace';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 6;
    const height = 18;

    // Clamping to screen bounds
    const safeX = Math.max(10, Math.min(this.width - textWidth - paddingX * 2 - 10, x));
    const safeY = Math.max(10, Math.min(this.height - height - 10, y));

    ctx.fillStyle = bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(safeX, safeY, textWidth + paddingX * 2, height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, safeX + paddingX, safeY + height / 2);
    ctx.restore();
  }

  drawDiagonalLine(ctx) {
    const bound = Math.max(this.width, this.height) / this.scale;
    const p1 = this.toScreen(-bound, -bound);
    const p2 = this.toScreen(bound, bound);

    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.fillStyle = PALETTE.mirror;
    ctx.font = 'italic 11px sans-serif';
    const labelPos = this.toScreen(3.2, 3.2);
    ctx.fillText('mirror line y = x', labelPos.x + 8, labelPos.y - 8);
    ctx.restore();
  }

  drawForwardCurve(ctx, model, state) {
    ctx.save();
    ctx.strokeStyle = PALETTE.domain;
    ctx.lineWidth = 2.5;

    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const step = 0.04;

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

    // Curve Label
    const sampleX = 1.8;
    const sampleY = model.forward(sampleX);
    if (!isNaN(sampleY) && isFinite(sampleY)) {
      const labelScreen = this.toScreen(sampleX, sampleY);
      ctx.fillStyle = PALETTE.domain;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(model.forwardFormulaText, labelScreen.x + 10, labelScreen.y - 10);
    }

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

      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'italic 11px sans-serif';
      const warnPos = this.toScreen(2, -1.8);
      ctx.fillText('Reflected curve fails vertical line test (multivalued)', warnPos.x, warnPos.y);

      ctx.restore();
      return;
    }

    ctx.strokeStyle = PALETTE.codomain;
    ctx.lineWidth = 2.5;

    const minX = -this.originX / this.scale;
    const maxX = (this.width - this.originX) / this.scale;
    const step = 0.04;

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

    // Curve Label
    const sampleY = 2.2;
    const sampleX = model.id === 'exponential' ? Math.exp(1) : 2.2;
    const invY = model.inverse(sampleX);
    if (!isNaN(invY) && isFinite(invY)) {
      const labelScreen = this.toScreen(sampleX, invY);
      ctx.fillStyle = PALETTE.codomain;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(model.inverseFormulaText, labelScreen.x + 10, labelScreen.y + 16);
    }

    ctx.restore();
  }

  /**
   * Interactive Point Tracer & Semantic Projections onto Domain & Codomain Axes
   * Demonstrates the coordinate swap (x, y) ↔ (y, x) across y = x.
   */
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

    // 1. Semantic Projections for Forward Point P(x0, y0)
    // Vertical Drop-Line to Domain X Axis: (x0, y0) → (x0, 0)
    const pDomainDrop = this.toScreen(x0, 0);
    ctx.strokeStyle = PALETTE.domain;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pForward.x, pForward.y);
    ctx.lineTo(pDomainDrop.x, pDomainDrop.y);
    ctx.stroke();

    // Horizontal Drop-Line to Codomain Y Axis: (x0, y0) → (0, y0)
    const pCodomainDrop = this.toScreen(0, y0);
    ctx.strokeStyle = PALETTE.codomain;
    ctx.beginPath();
    ctx.moveTo(pForward.x, pForward.y);
    ctx.lineTo(pCodomainDrop.x, pCodomainDrop.y);
    ctx.stroke();

    // Highlight Axis Markers for Forward Point
    // Domain marker on horizontal axis
    ctx.fillStyle = PALETTE.domain;
    ctx.beginPath();
    ctx.arc(pDomainDrop.x, pDomainDrop.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Codomain marker on vertical axis
    ctx.fillStyle = PALETTE.codomain;
    ctx.beginPath();
    ctx.arc(pCodomainDrop.x, pCodomainDrop.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Semantic Projections for Reflected Point P'(y0, x0)
    if (model.id !== 'quadratic' || state.restrictDomain) {
      // Vertical Drop-Line from P' to Horizontal Axis: (y0, x0) → (y0, 0)
      // Visual proof: The codomain value y0 now acts as the input coordinate on the horizontal axis!
      const pReflXDrop = this.toScreen(y0, 0);
      ctx.strokeStyle = PALETTE.codomain;
      ctx.beginPath();
      ctx.moveTo(pReflected.x, pReflected.y);
      ctx.lineTo(pReflXDrop.x, pReflXDrop.y);
      ctx.stroke();

      // Horizontal Drop-Line from P' to Vertical Axis: (y0, x0) → (0, x0)
      // Visual proof: The domain value x0 now acts as the output coordinate on the vertical axis!
      const pReflYDrop = this.toScreen(0, x0);
      ctx.strokeStyle = PALETTE.domain;
      ctx.beginPath();
      ctx.moveTo(pReflected.x, pReflected.y);
      ctx.lineTo(pReflYDrop.x, pReflYDrop.y);
      ctx.stroke();

      ctx.fillStyle = PALETTE.codomain;
      ctx.beginPath();
      ctx.arc(pReflXDrop.x, pReflXDrop.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.domain;
      ctx.beginPath();
      ctx.arc(pReflYDrop.x, pReflYDrop.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Orthogonal Connecting Chord between P and P'
    ctx.strokeStyle = PALETTE.tracerChord;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pForward.x, pForward.y);
    ctx.lineTo(pReflected.x, pReflected.y);
    ctx.stroke();

    // Midpoint on line y = x
    const midX = (x0 + y0) / 2;
    const midY = (y0 + x0) / 2;
    const pMid = this.toScreen(midX, midY);
    ctx.fillStyle = PALETTE.tracerMid;
    ctx.beginPath();
    ctx.arc(pMid.x, pMid.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Render Points P and P'
    ctx.setLineDash([]);

    // Forward Point P(x0, y0) on curve f
    ctx.fillStyle = PALETTE.domain;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pForward.x, pForward.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Forward Point Callout Pill
    this.drawPointCallout(
      ctx,
      pForward.x + 10,
      pForward.y - 14,
      `P(${x0.toFixed(2)}, ${y0.toFixed(2)})`,
      PALETTE.domain,
      'rgba(15, 23, 42, 0.85)'
    );

    // Reflected Point P'(y0, x0) on inverse f⁻¹
    if (model.id !== 'quadratic' || state.restrictDomain) {
      ctx.fillStyle = PALETTE.codomain;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pReflected.x, pReflected.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Reflected Point Callout Pill
      this.drawPointCallout(
        ctx,
        pReflected.x + 10,
        pReflected.y + 12,
        `P'(${y0.toFixed(2)}, ${x0.toFixed(2)})`,
        PALETTE.codomain,
        'rgba(15, 23, 42, 0.85)'
      );
    }

    ctx.restore();
  }

  drawPointCallout(ctx, x, y, text, color, bg) {
    ctx.save();
    ctx.font = 'bold 11px monospace';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 6;
    const height = 18;

    ctx.fillStyle = bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y - height / 2, textWidth + paddingX * 2, height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + paddingX, y);
    ctx.restore();
  }

  onPointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clickPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const state = this.controller.state;
    const model = this.getModel(state);
    const x0 = state.tracerX;
    const y0 = model.forward(x0);
    const pForward = this.toScreen(x0, y0);

    const dist = Math.hypot(clickPos.x - pForward.x, clickPos.y - pForward.y);
    if (dist <= 25) {
      this.isDraggingPoint = true;
      this.canvas.style.cursor = 'ew-resize';
      return;
    }

    // Otherwise initiate canvas panning
    this.isPanning = true;
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isDraggingPoint) {
      const mathPos = this.toMath(screenX, screenY);
      let newX = Math.max(-6, Math.min(6, mathPos.x));
      const state = this.controller.state;
      if (state.analyticPreset === 'quadratic' && state.restrictDomain && newX < 0) {
        newX = 0;
      }
      this.controller.setTracerX(newX);
      return;
    }

    if (this.isPanning) {
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.panOffsetX += dx;
      this.panOffsetY += dy;
      this.originX += dx;
      this.originY += dy;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      this.render();
      return;
    }

    // Hover affordance
    const state = this.controller.state;
    const model = this.getModel(state);
    const x0 = state.tracerX;
    const y0 = model.forward(x0);
    const pForward = this.toScreen(x0, y0);
    const dist = Math.hypot(screenX - pForward.x, screenY - pForward.y);

    if (dist <= 25) {
      this.canvas.style.cursor = 'ew-resize';
    } else {
      this.canvas.style.cursor = 'grab';
    }
  }

  onPointerUp() {
    this.isDraggingPoint = false;
    this.isPanning = false;
    this.canvas.style.cursor = 'default';
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mathBefore = this.toMath(mouseX, mouseY);
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.max(22, Math.min(200, this.scale * zoomFactor));

    this.scale = newScale;

    // Keep point under mouse fixed
    this.originX = mouseX - mathBefore.x * this.scale;
    this.originY = mouseY + mathBefore.y * this.scale;
    this.panOffsetX = this.originX - this.width / 2;
    this.panOffsetY = this.originY - this.height / 2;

    this.render();
  }
}
