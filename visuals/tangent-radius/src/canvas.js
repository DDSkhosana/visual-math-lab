import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawDoubleArrow, withShadow, getPointLabel } from '../../../js/circle-core.js';
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

    // Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);

    // Secant chord & triangle shading (optional)
    if (state.showSecant) {
      if (showArea) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.18)';
        ctx.beginPath();
        ctx.moveTo(g.O.x, g.O.y);
        ctx.lineTo(g.T.x, g.T.y);
        ctx.lineTo(g.Q.x, g.Q.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.Q.x, g.Q.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = PALETTE.yellow;
      ctx.beginPath();
      ctx.arc(g.Q.x, g.Q.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (state.vis2d?.points !== false) {
        const vis = state.vis2d || {};
        ctx.fillText(getPointLabel('Q', g.Q.x - g.cx, -(g.Q.y - g.cy), vis), g.Q.x + 8, g.Q.y - 8);
      }
    }

    // Radius OT
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.T.x, g.T.y);
    ctx.stroke();

    // Tangent Line with sharp arrowheads at both ends (no blobs)
    drawDoubleArrow(ctx, g.T1, g.T2, PALETTE.emerald, 3);

    // Right-angle square marker at T
    const sq = 14;
    const c1x = g.T.x - g.ux * sq;
    const c1y = g.T.y - g.uy * sq;
    const c2x = c1x + g.tx * sq;
    const c2y = c1y + g.ty * sq;
    const c3x = g.T.x + g.tx * sq;
    const c3y = g.T.y + g.ty * sq;

    const showAngles = (state.vis2d?.angles !== false);
    if (showAngles) {
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y);
      ctx.lineTo(c1x, c1y);
      ctx.lineTo(c2x, c2y);
      ctx.lineTo(c3x, c3y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
      ctx.fill();
      ctx.stroke();
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawLabelledPoint(ctx, g.O, PALETTE.blue, getPointLabel('O', 0, 0, vis), 10, 16);
      drawRadialLabelledPoint(ctx, g.T, g.O, PALETTE.red, getPointLabel('T', g.T.x - g.cx, -(g.T.y - g.cy), vis), 20);
    }

    // Right-angle 90° annotation with protective badge pill
    if (showAngles) {
      drawTextBadge(ctx, '90°', c2x + 8, c2y + 8, PALETTE.teal);
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
      a.href = url; a.download = 'tangent-radius.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tangent-radius.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
