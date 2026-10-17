import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawRightAngle, drawAngleWedge, drawReflexWedge, withShadow, getPointLabel } from '../../../js/circle-core.js';
import { computeGeometry, generateSVG } from './model.js';

export class CanvasView {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');
    this.state = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    if (this.state) this.render(this.state);
  }

  render(state) {
    this.state = state;
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    const g = computeGeometry(state, width, height);

    // Cartesian Grid & Coordinate Axes
    draw2DCartesianGrid(ctx, width, height, g.cx, g.cy, state.vis2d);

    // Congruence triangles fill and angle wedges
    // Congruence triangles fill and angle wedges (Kite structure: OT1PT2)
    const showArea = (state.vis2d?.area !== false) && (state.showCongruence !== false) && (state.showArea !== false);
    const showAngles = (state.vis2d?.angles !== false);

    // Common angle rays
    const angPT1 = Math.atan2(g.T1.y - g.P.y, g.T1.x - g.P.x);
    const angPO = Math.atan2(g.cy - g.P.y, g.cx - g.P.x);
    const angPT2 = Math.atan2(g.T2.y - g.P.y, g.T2.x - g.P.x);

    const angOT1 = Math.atan2(g.T1.y - g.cy, g.T1.x - g.cx);
    const angOP = Math.atan2(g.P.y - g.cy, g.P.x - g.cx);
    const angOT2 = Math.atan2(g.T2.y - g.cy, g.T2.x - g.cx);

    if (showArea || showAngles) {
      if (showArea) {
        // Triangle 1: OPT1 (Emerald)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T1.x, g.T1.y); ctx.lineTo(g.P.x, g.P.y);
        ctx.closePath();
        ctx.fill();

        // Triangle 2: OPT2 (Blue)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T2.x, g.T2.y); ctx.lineTo(g.P.x, g.P.y);
        ctx.closePath();
        ctx.fill();
      }

      if (showAngles) {
        const sweepWedge = (vertex, a1, a2, fill, stroke) => {
          let diff = (a2 - a1) % (Math.PI * 2);
          if (diff < 0) diff += Math.PI * 2;
          const anticlockwise = diff > Math.PI;
          drawAngleWedge(ctx, vertex, a1, a2, 28, fill, stroke, anticlockwise);
        };

        // Disentangled angles: alpha1 (Lime), alpha2 (Fuchsia) at P
        sweepWedge(g.P, angPO, angPT1, 'rgba(132, 204, 22, 0.28)', PALETTE.lime);
        sweepWedge(g.P, angPO, angPT2, 'rgba(217, 70, 239, 0.28)', PALETTE.fuchsia);

        // Disentangled central angles at O: beta1 (Amber), beta2 (Orange)
        sweepWedge({ x: g.cx, y: g.cy }, angOP, angOT1, 'rgba(245, 158, 11, 0.26)', PALETTE.amber);
        sweepWedge({ x: g.cx, y: g.cy }, angOP, angOT2, 'rgba(249, 115, 22, 0.26)', PALETTE.orange);
      }
    }

    // Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // Diagonal Chord T1T2 (Violet)
    ctx.strokeStyle = PALETTE.violet;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(g.T1.x, g.T1.y); ctx.lineTo(g.T2.x, g.T2.y);
    ctx.stroke();

    // Central bisector line OP (d) in Yellow
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.P.x, g.P.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const showLabels = state.vis2d?.labels !== false;

    // Distance d badge along OP
    if (showLabels) {
      const midOPX = (g.cx + g.P.x) / 2;
      const midOPY = (g.cy + g.P.y) / 2;
      drawTextBadge(ctx, `d = ${g.d.toFixed(1)}px`, midOPX, midOPY - 14, PALETTE.yellow);
    }

    // Differentiated Radii: OT1 (Emerald) and OT2 (Blue)
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = PALETTE.emerald;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T1.x, g.T1.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.blue;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T2.x, g.T2.y);
    ctx.stroke();

    // Right-angle markers at T1 and T2, plus node K
    if (showAngles) {
      const raFill = 'rgba(20, 184, 166, 0.25)';
      drawRightAngle(ctx, g.T1, { x: g.cx, y: g.cy }, g.P, 14, PALETTE.teal, raFill);
      drawRightAngle(ctx, g.T2, { x: g.cx, y: g.cy }, g.P, 14, PALETTE.teal, raFill);
      drawRightAngle(ctx, g.K, g.T1, g.P, 11, PALETTE.teal, raFill);
      if (showLabels) {
        drawTextBadge(ctx, '90°', g.T1.x + (g.cx - g.T1.x) * 0.22, g.T1.y + (g.cy - g.T1.y) * 0.22, PALETTE.teal);
        drawTextBadge(ctx, '90°', g.T2.x + (g.cx - g.T2.x) * 0.22, g.T2.y + (g.cy - g.T2.y) * 0.22, PALETTE.teal);
      }
    }

    // Tangents: PT1 (Emerald) and PT2 (Blue)
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PALETTE.emerald;
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.T1.x, g.T1.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.blue;
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.T2.x, g.T2.y);
    ctx.stroke();

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    const center = { x: g.cx, y: g.cy };
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawLabelledPoint(ctx, center, PALETTE.sky, getPointLabel('O', 0, 0, vis), -16, -10);
      drawRadialLabelledPoint(ctx, g.T1, center, PALETTE.emerald, getPointLabel('T₁', g.T1.x - g.cx, -(g.T1.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.T2, center, PALETTE.blue, getPointLabel('T₂', g.T2.x - g.cx, -(g.T2.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.P, center, PALETTE.red, getPointLabel('P', g.P.x - g.cx, -(g.P.y - g.cy), vis), 20);
      drawLabelledPoint(ctx, g.K, PALETTE.violet, getPointLabel('K', g.K.x - g.cx, -(g.K.y - g.cy), vis), 8, -8, 4);
    }

    // Tangent lengths displayed with protective badge pills offset perpendicularly outwards
    if (showLabels && state.vis2d?.lengths !== false) {
      const mid1 = { x: (g.P.x + g.T1.x) / 2, y: (g.P.y + g.T1.y) / 2 };
      const mid2 = { x: (g.P.x + g.T2.x) / 2, y: (g.P.y + g.T2.y) / 2 };

      const d1x = g.P.x - g.T1.x, d1y = g.P.y - g.T1.y;
      const l1 = Math.hypot(d1x, d1y);
      let n1x = l1 > 0.001 ? -d1y / l1 : 0, n1y = l1 > 0.001 ? d1x / l1 : -1;
      if (n1x * (mid1.x - g.cx) + n1y * (mid1.y - g.cy) < 0) { n1x = -n1x; n1y = -n1y; }
      drawTextBadge(ctx, `|PT₁| = ${g.lenPT1.toFixed(1)}px`, mid1.x + 18 * n1x, mid1.y + 18 * n1y, PALETTE.emerald);

      const d2x = g.P.x - g.T2.x, d2y = g.P.y - g.T2.y;
      const l2 = Math.hypot(d2x, d2y);
      let n2x = l2 > 0.001 ? -d2y / l2 : 0, n2y = l2 > 0.001 ? d2x / l2 : 1;
      if (n2x * (mid2.x - g.cx) + n2y * (mid2.y - g.cy) < 0) { n2x = -n2x; n2y = -n2y; }
      drawTextBadge(ctx, `|PT₂| = ${g.lenPT2.toFixed(1)}px`, mid2.x + 18 * n2x, mid2.y + 18 * n2y, PALETTE.blue);
    }

    // 2D Canvas Angle Badges with distinct tokens
    if (showAngles && showLabels) {
      // Angles at P (alpha1 Lime, alpha2 Fuchsia) - staggered radial distances (32px / 56px) to eliminate overlap
      const bisP1 = (angPO + angPT1) / 2;
      const bisP2 = (angPO + angPT2) / 2;
      drawTextBadge(ctx, `α₁\n${g.alphaDeg.toFixed(1)}°`, g.P.x + 32 * Math.cos(bisP1), g.P.y + 32 * Math.sin(bisP1), PALETTE.lime);
      drawTextBadge(ctx, `α₂\n${g.alphaDeg.toFixed(1)}°`, g.P.x + 56 * Math.cos(bisP2), g.P.y + 56 * Math.sin(bisP2), PALETTE.fuchsia);

      // Angles at O (beta1 Amber, beta2 Orange) - staggered radial distances (30px / 52px)
      const bisO1 = (angOP + angOT1) / 2;
      const bisO2 = (angOP + angOT2) / 2;
      drawTextBadge(ctx, `β₁\n${g.betaDeg.toFixed(1)}°`, g.cx + 30 * Math.cos(bisO1), g.cy + 30 * Math.sin(bisO1), PALETTE.amber);
      drawTextBadge(ctx, `β₂\n${g.betaDeg.toFixed(1)}°`, g.cx + 52 * Math.cos(bisO2), g.cy + 52 * Math.sin(bisO2), PALETTE.orange);
    }

    // Conjugate Reflex Angles (270° at T1, T2)
    const showReflex = Boolean(state.vis2d?.reflex);
    if (showReflex) {
      const angT1O = Math.atan2(g.cy - g.T1.y, g.cx - g.T1.x);
      const angT1P = Math.atan2(g.P.y - g.T1.y, g.P.x - g.T1.x);
      drawReflexWedge(ctx, g.T1, angT1O, angT1P, 26, 'rgba(20, 184, 166, 0.18)', PALETTE.teal);

      const angT2O = Math.atan2(g.cy - g.T2.y, g.cx - g.T2.x);
      const angT2P = Math.atan2(g.P.y - g.T2.y, g.P.x - g.T2.x);
      drawReflexWedge(ctx, g.T2, angT2O, angT2P, 26, 'rgba(20, 184, 166, 0.18)', PALETTE.teal);

      if (showLabels) {
        const uT1Ox = (g.cx - g.T1.x) / (Math.hypot(g.cx - g.T1.x, g.cy - g.T1.y) || 1);
        const uT1Oy = (g.cy - g.T1.y) / (Math.hypot(g.cx - g.T1.x, g.cy - g.T1.y) || 1);
        const uT1Px = (g.P.x - g.T1.x) / (Math.hypot(g.P.x - g.T1.x, g.P.y - g.T1.y) || 1);
        const uT1Py = (g.P.y - g.T1.y) / (Math.hypot(g.P.x - g.T1.x, g.P.y - g.T1.y) || 1);
        const bis1X = uT1Ox + uT1Px, bis1Y = uT1Oy + uT1Py;
        const l1 = Math.hypot(bis1X, bis1Y) || 1;
        drawTextBadge(ctx, '270°\n(T₁*)', g.T1.x - 28 * (bis1X / l1), g.T1.y - 28 * (bis1Y / l1), PALETTE.teal);

        const uT2Ox = (g.cx - g.T2.x) / (Math.hypot(g.cx - g.T2.x, g.cy - g.T2.y) || 1);
        const uT2Oy = (g.cy - g.T2.y) / (Math.hypot(g.cx - g.T2.x, g.cy - g.T2.y) || 1);
        const uT2Px = (g.P.x - g.T2.x) / (Math.hypot(g.P.x - g.T2.x, g.P.y - g.T2.y) || 1);
        const uT2Py = (g.P.y - g.T2.y) / (Math.hypot(g.P.x - g.T2.x, g.P.y - g.T2.y) || 1);
        const bis2X = uT2Ox + uT2Px, bis2Y = uT2Oy + uT2Py;
        const l2 = Math.hypot(bis2X, bis2Y) || 1;
        drawTextBadge(ctx, '270°\n(T₂*)', g.T2.x - 28 * (bis2X / l2), g.T2.y - 28 * (bis2Y / l2), PALETTE.teal);
      }
    }
  }

  exportPNG() {
    const off = document.createElement('canvas');
    off.width = this.width * 2; off.height = this.height * 2;
    const offCtx = off.getContext('2d');
    offCtx.scale(2, 2);
    offCtx.fillStyle = '#0f172a';
    offCtx.fillRect(0, 0, this.width, this.height);
    const prevCtx = this.ctx; this.ctx = offCtx;
    this.render(this.state);
    this.ctx = prevCtx;
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'tangents-from-external-point.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tangents-from-external-point.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
