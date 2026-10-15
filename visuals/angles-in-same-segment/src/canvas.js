import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, withShadow, drawSegmentContainingPoint, drawAngleWedge, getPointLabel } from '../../../js/circle-core.js';
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

    // Relevant Area Shading (Same Circular Segment & Inscribed Triangles)
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false) && (state.showShading !== false);
    if (showArea) {
      // The eponymous "Same Segment" on chord AB containing P1 and P2
      drawSegmentContainingPoint(ctx, g.O, g.A, g.B, g.P1, g.r, 'rgba(56, 189, 248, 0.08)');

      // Inscribed Triangles
      ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.P1.x, g.P1.y); ctx.lineTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.P2.x, g.P2.y); ctx.lineTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.closePath();
      ctx.fill();
    }

    // Optional center radii OA, OB & Central Angle AOB
    if (state.showCenter) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);
      if (showAngles) {
        const angA = Math.atan2(g.A.y - g.O.y, g.A.x - g.O.x);
        const angB = Math.atan2(g.B.y - g.O.y, g.B.x - g.O.x);
        drawAngleWedge(ctx, g.O, angA, angB, 30, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);
      }
    }

    // Base chord AB
    ctx.strokeStyle = PALETTE.red;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    // P1 inscribed chords
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.P1.x, g.P1.y); ctx.lineTo(g.A.x, g.A.y);
    ctx.moveTo(g.P1.x, g.P1.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    // P2 inscribed chords
    ctx.strokeStyle = PALETTE.emerald;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.P2.x, g.P2.y); ctx.lineTo(g.A.x, g.A.y);
    ctx.moveTo(g.P2.x, g.P2.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);

    // Angle arc wedges at P1 and P2
    if (showAngles) {
      const angP1A = Math.atan2(g.A.y - g.P1.y, g.A.x - g.P1.x);
      const angP1B = Math.atan2(g.B.y - g.P1.y, g.B.x - g.P1.x);
      drawAngleWedge(ctx, g.P1, angP1A, angP1B, 28, 'rgba(59, 130, 246, 0.25)', PALETTE.blue);

      const angP2A = Math.atan2(g.A.y - g.P2.y, g.A.x - g.P2.x);
      const angP2B = Math.atan2(g.B.y - g.P2.y, g.B.x - g.P2.x);
      drawAngleWedge(ctx, g.P2, angP2A, angP2B, 28, 'rgba(16, 185, 129, 0.25)', PALETTE.emerald);
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      if (state.showCenter) drawLabelledPoint(ctx, g.O, PALETTE.indigo, getPointLabel('O', 0, 0, vis), 10, 16);
      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.red, getPointLabel('A', g.A.x - g.cx, -(g.A.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.red, getPointLabel('B', g.B.x - g.cx, -(g.B.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.P1, g.O, PALETTE.blue, getPointLabel('P₁', g.P1.x - g.cx, -(g.P1.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.P2, g.O, PALETTE.emerald, getPointLabel('P₂', g.P2.x - g.cx, -(g.P2.y - g.cy), vis), 20);
    }

    // Angle text annotations with protective badge pills inside angle cones
    if (showAngles) {
      // Central Angle badge at O (above O along angle bisector) in yellow
      if (state.showCenter) {
        const angA = Math.atan2(g.A.y - g.O.y, g.A.x - g.O.x);
        const angB = Math.atan2(g.B.y - g.O.y, g.B.x - g.O.x);
        const uAx = Math.cos(angA), uAy = Math.sin(angA);
        const uBx = Math.cos(angB), uBy = Math.sin(angB);
        const bisOX = uAx + uBx, bisOY = uAy + uBy;
        const lenO = Math.hypot(bisOX, bisOY);
        const nbOX = lenO > 0.001 ? bisOX / lenO : 0;
        const nbOY = lenO > 0.001 ? bisOY / lenO : -1;
        drawTextBadge(ctx, `2θ = ${g.centralDeg.toFixed(1)}°`, g.O.x + 44 * nbOX, g.O.y + 44 * nbOY, PALETTE.yellow);
      }

      const angP1A = Math.atan2(g.A.y - g.P1.y, g.A.x - g.P1.x);
      const angP1B = Math.atan2(g.B.y - g.P1.y, g.B.x - g.P1.x);
      const uP1Ax = Math.cos(angP1A), uP1Ay = Math.sin(angP1A);
      const uP1Bx = Math.cos(angP1B), uP1By = Math.sin(angP1B);
      const bis1X = uP1Ax + uP1Bx, bis1Y = uP1Ay + uP1By;
      const len1 = Math.hypot(bis1X, bis1Y);
      const nb1X = len1 > 0.001 ? bis1X / len1 : 0;
      const nb1Y = len1 > 0.001 ? bis1Y / len1 : 1;
      drawTextBadge(ctx, `θ₁ = ${g.angleP1Deg.toFixed(1)}°`, g.P1.x + 44 * nb1X, g.P1.y + 44 * nb1Y, PALETTE.blue);

      const angP2A = Math.atan2(g.A.y - g.P2.y, g.A.x - g.P2.x);
      const angP2B = Math.atan2(g.B.y - g.P2.y, g.B.x - g.P2.x);
      const uP2Ax = Math.cos(angP2A), uP2Ay = Math.sin(angP2A);
      const uP2Bx = Math.cos(angP2B), uP2By = Math.sin(angP2B);
      const bis2X = uP2Ax + uP2Bx, bis2Y = uP2Ay + uP2By;
      const len2 = Math.hypot(bis2X, bis2Y);
      const nb2X = len2 > 0.001 ? bis2X / len2 : 0;
      const nb2Y = len2 > 0.001 ? bis2Y / len2 : 1;
      drawTextBadge(ctx, `θ₂ = ${g.angleP2Deg.toFixed(1)}°`, g.P2.x + 44 * nb2X, g.P2.y + 44 * nb2Y, PALETTE.emerald);
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
      a.href = url; a.download = 'angles-in-same-segment.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'angles-in-same-segment.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
