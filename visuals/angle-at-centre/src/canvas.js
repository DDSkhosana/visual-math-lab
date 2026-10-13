import { PALETTE, toDegrees, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, withShadow, drawSubtendedSector, drawAngleWedge, getPointLabel } from '../../../js/circle-core.js';
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

    // Coordinate grid axes
    if (state.vis2d?.grid !== false) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, g.cy); ctx.lineTo(width, g.cy);
      ctx.moveTo(g.cx, 0); ctx.lineTo(g.cx, height);
      ctx.stroke();
    }

    // Main Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // Relevant Area Shading (Central Sector & Inscribed Triangle)
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    if (showArea) {
      // Central Sector subtending P on arc AB
      drawSubtendedSector(ctx, g.O, g.A, g.B, g.P, g.r, 'rgba(234, 179, 8, 0.16)');

      // Inscribed Triangle Shading
      ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.P.x, g.P.y);
      ctx.lineTo(g.A.x, g.A.y);
      ctx.lineTo(g.B.x, g.B.y);
      ctx.closePath();
      ctx.fill();
    }

    // Radii OA, OB
    if (state.showRadii) {
      ctx.strokeStyle = PALETTE.indigo;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.stroke();
    }

    // Split line OP (dashed)
    if (state.showSplit) {
      ctx.strokeStyle = PALETTE.lavender;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y);
      ctx.lineTo(g.P.x, g.P.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Inscribed chords PA, PB
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.A.x, g.A.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);

    // Angle Arcs and Wedges
    if (showAngles) {
      // Central Angle arc wedge
      drawSubtendedSector(ctx, g.O, g.A, g.B, g.P, 36, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // Inscribed Angle arc wedge
      const angPA = Math.atan2(g.A.y - g.P.y, g.A.x - g.P.x);
      const angPB = Math.atan2(g.B.y - g.P.y, g.B.x - g.P.x);
      drawAngleWedge(ctx, g.P, angPA, angPB, 30, 'rgba(34, 197, 94, 0.25)', PALETTE.green);
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      const lblO = getPointLabel('O', 0, 0, vis);
      const lblA = getPointLabel('A', g.A.x - g.cx, -(g.A.y - g.cy), vis);
      const lblB = getPointLabel('B', g.B.x - g.cx, -(g.B.y - g.cy), vis);
      const lblP = getPointLabel('P', g.P.x - g.cx, -(g.P.y - g.cy), vis);
      drawLabelledPoint(ctx, g.O, PALETTE.indigo, lblO, 10, 16);
      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.red, lblA, 20);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.orange, lblB, 20);
      drawRadialLabelledPoint(ctx, g.P, g.O, PALETTE.violet, lblP, 20);
    }

    // Angle Text Annotations with protective badge pills
    if (showAngles) {
      // Central Angle badge placed along central angle bisector
      const midCentAng = -(state.angleA + state.angleB) / 2;
      const centBadgeX = g.cx + 52 * Math.cos(midCentAng);
      const centBadgeY = g.cy + 52 * Math.sin(midCentAng);
      drawTextBadge(ctx, `2θ = ${g.centralDeg.toFixed(1)}°`, centBadgeX, centBadgeY, PALETTE.yellow);

      // Inscribed Angle badge placed along inscribed angle bisector
      const angPA = Math.atan2(g.A.y - g.P.y, g.A.x - g.P.x);
      const angPB = Math.atan2(g.B.y - g.P.y, g.B.x - g.P.x);
      const uAx = Math.cos(angPA), uAy = Math.sin(angPA);
      const uBx = Math.cos(angPB), uBy = Math.sin(angPB);
      const bisX = uAx + uBx, bisY = uAy + uBy;
      const bisLen = Math.hypot(bisX, bisY);
      const nBisX = bisLen > 0.001 ? bisX / bisLen : 0;
      const nBisY = bisLen > 0.001 ? bisY / bisLen : 1;
      const inscBadgeX = g.P.x + 48 * nBisX;
      const inscBadgeY = g.P.y + 48 * nBisY;
      drawTextBadge(ctx, `θ = ${g.inscribedDeg.toFixed(1)}°`, inscBadgeX, inscBadgeY, PALETTE.green);
    }
  }

  exportPNG() {
    const off = document.createElement('canvas');
    off.width = this.width * 2;
    off.height = this.height * 2;
    const offCtx = off.getContext('2d');
    offCtx.scale(2, 2);
    offCtx.fillStyle = '#0f172a';
    offCtx.fillRect(0, 0, this.width, this.height);

    const prevCtx = this.ctx;
    this.ctx = offCtx;
    this.render(this.state);
    this.ctx = prevCtx;

    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'angle-at-centre.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'angle-at-centre.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
