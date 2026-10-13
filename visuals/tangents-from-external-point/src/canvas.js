import { PALETTE, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawRightAngle, drawAngleWedge, withShadow, getPointLabel } from '../../../js/circle-core.js';
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

    // Grid lines
    if (state.vis2d?.grid !== false) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, g.cy); ctx.lineTo(width, g.cy);
      ctx.moveTo(g.cx, 0); ctx.lineTo(g.cx, height);
      ctx.stroke();
    }

    // Congruence triangles fill and angle wedges
    const showArea = (state.vis2d?.area !== false) && (state.showCongruence !== false) && (state.showArea !== false);
    const showAngles = (state.vis2d?.angles !== false);

    if (showArea || showAngles) {
      if (showArea) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T1.x, g.T1.y); ctx.lineTo(g.P.x, g.P.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T2.x, g.T2.y); ctx.lineTo(g.P.x, g.P.y);
        ctx.closePath();
        ctx.fill();
      }

      if (showAngles) {
        // Equal angle wedges at external point P: angle(T1, P, O) = angle(T2, P, O)
        const angPT1 = Math.atan2(g.T1.y - g.P.y, g.T1.x - g.P.x);
        const angPO = Math.atan2(g.cy - g.P.y, g.cx - g.P.x);
        const angPT2 = Math.atan2(g.T2.y - g.P.y, g.T2.x - g.P.x);

        const sweepWedge = (vertex, a1, a2, fill, stroke) => {
          let diff = (a2 - a1) % (Math.PI * 2);
          if (diff < 0) diff += Math.PI * 2;
          const anticlockwise = diff > Math.PI;
          drawAngleWedge(ctx, vertex, a1, a2, 28, fill, stroke, anticlockwise);
        };

        sweepWedge(g.P, angPO, angPT1, 'rgba(16, 185, 129, 0.28)', PALETTE.emerald);
        sweepWedge(g.P, angPO, angPT2, 'rgba(59, 130, 246, 0.28)', PALETTE.blue);

        // Equal central angle wedges at O: angle(T1, O, P) = angle(T2, O, P)
        const angOT1 = Math.atan2(g.T1.y - g.cy, g.T1.x - g.cx);
        const angOP = Math.atan2(g.P.y - g.cy, g.P.x - g.cx);
        const angOT2 = Math.atan2(g.T2.y - g.cy, g.T2.x - g.cx);
        sweepWedge({ x: g.cx, y: g.cy }, angOP, angOT1, 'rgba(16, 185, 129, 0.22)', null);
        sweepWedge({ x: g.cx, y: g.cy }, angOP, angOT2, 'rgba(59, 130, 246, 0.22)', null);
      }
    }

    // Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // Central bisector line OP
    ctx.strokeStyle = PALETTE.lavender;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.P.x, g.P.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Radii OT1, OT2
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T1.x, g.T1.y);
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.T2.x, g.T2.y);
    ctx.stroke();

    // Right-angle markers at T1 and T2
    if (showAngles) {
      const raFill = 'rgba(20, 184, 166, 0.25)';
      drawRightAngle(ctx, g.T1, { x: g.cx, y: g.cy }, g.P, 14, PALETTE.teal, raFill);
      drawRightAngle(ctx, g.T2, { x: g.cx, y: g.cy }, g.P, 14, PALETTE.teal, raFill);
    }

    // Tangents PT1, PT2
    ctx.strokeStyle = PALETTE.emerald;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.T1.x, g.T1.y);
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.T2.x, g.T2.y);
    ctx.stroke();

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    const center = { x: g.cx, y: g.cy };
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawLabelledPoint(ctx, center, PALETTE.sky, getPointLabel('O', 0, 0, vis), -16, -10);
      drawRadialLabelledPoint(ctx, g.T1, center, PALETTE.emerald, getPointLabel('T₁', g.T1.x - g.cx, -(g.T1.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.T2, center, PALETTE.emerald, getPointLabel('T₂', g.T2.x - g.cx, -(g.T2.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.P, center, PALETTE.red, getPointLabel('P', g.P.x - g.cx, -(g.P.y - g.cy), vis), 20);
    }

    // Tangent lengths displayed with protective badge pills offset perpendicularly outwards
    if (state.vis2d?.lengths !== false) {
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
      drawTextBadge(ctx, `|PT₂| = ${g.lenPT2.toFixed(1)}px`, mid2.x + 18 * n2x, mid2.y + 18 * n2y, PALETTE.emerald);
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
