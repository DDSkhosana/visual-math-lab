import { PALETTE, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawArrow, withShadow, drawAngleWedge, getPointLabel } from '../../../js/circle-core.js';
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

    // Axes
    if (state.vis2d?.grid !== false) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, g.cy); ctx.lineTo(width, g.cy);
      ctx.moveTo(g.cx, 0); ctx.lineTo(g.cx, height);
      ctx.stroke();
    }

    // Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // Quadrilateral fill (Relevant Area Shading)
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    if (showArea) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.beginPath();
      ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.lineTo(g.C.x, g.C.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.closePath();
      ctx.fill();
    }

    // Diagonals (optional)
    if (state.showDiagonals) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.C.x, g.C.y);
      ctx.moveTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Quadrilateral edges
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.lineTo(g.C.x, g.C.y); ctx.lineTo(g.D.x, g.D.y);
    ctx.closePath();
    ctx.stroke();

    const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);

    // Angle Wedges at opposite vertices (A and C) demonstrating supplementary angles
    if (showAngles) {
      const angAD = Math.atan2(g.D.y - g.A.y, g.D.x - g.A.x);
      const angAB = Math.atan2(g.B.y - g.A.y, g.B.x - g.A.x);
      drawAngleWedge(ctx, g.A, angAD, angAB, 24, 'rgba(168, 85, 247, 0.25)', PALETTE.violet);

      const angCB = Math.atan2(g.B.y - g.C.y, g.B.x - g.C.x);
      const angCD = Math.atan2(g.D.y - g.C.y, g.D.x - g.C.x);
      drawAngleWedge(ctx, g.C, angCB, angCD, 24, 'rgba(245, 158, 11, 0.25)', PALETTE.amber);
    }

    // Exterior line extending DC through C to E
    if (state.showExterior) {
      drawArrow(ctx, g.C, g.E, PALETTE.rose, 2);

      // Exterior angle wedge at C equals opposite interior angle A (violet)
      if (showAngles) {
        const angCB = Math.atan2(g.B.y - g.C.y, g.B.x - g.C.x);
        const angCE = Math.atan2(g.E.y - g.C.y, g.E.x - g.C.x);
        drawAngleWedge(ctx, g.C, angCB, angCE, 25, 'rgba(168, 85, 247, 0.25)', PALETTE.violet);
      }
    }

    // Vertices and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      const formatQuadLabel = (name, angleDeg, pt) => {
        let base = name;
        if (vis.lengths !== false) base += ` (${angleDeg.toFixed(1)}°)`;
        return getPointLabel(base, pt.x - g.cx, -(pt.y - g.cy), vis);
      };

      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.violet, formatQuadLabel('A', g.angleADeg, g.A), 22);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.cyan, formatQuadLabel('B', g.angleBDeg, g.B), 22);
      drawRadialLabelledPoint(ctx, g.C, g.O, PALETTE.amber, formatQuadLabel('C', g.angleCDeg, g.C), 22);
      drawRadialLabelledPoint(ctx, g.D, g.O, PALETTE.rose, formatQuadLabel('D', g.angleDDeg, g.D), 22);
    }

    if (state.showExterior && g.E && showAngles) {
      const dirDCx = g.C.x - g.D.x;
      const dirDCy = g.C.y - g.D.y;
      const lenDC = Math.hypot(dirDCx, dirDCy);
      const ndcx = lenDC > 0.001 ? dirDCx / lenDC : 1;
      const ndcy = lenDC > 0.001 ? dirDCy / lenDC : 0;
      drawTextBadge(ctx, `Ext = ${g.exteriorAngleDeg.toFixed(1)}°`, g.C.x + 40 * ndcx, g.C.y + 40 * ndcy, PALETTE.violet);
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
      a.href = url; a.download = 'cyclic-quadrilateral.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cyclic-quadrilateral.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
