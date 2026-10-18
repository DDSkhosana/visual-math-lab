import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawArrow, withShadow, drawAngleWedge, drawReflexWedge, getPointLabel } from '../../../js/circle-core.js';
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
    draw2DCartesianGrid(ctx, width, height, g.cx, g.cy, state.vis2d, 40, state.cameraPerspective);

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

    // Diagonals (optional) - AC (Lavender) & BD (Teal) matching supplementary sums
    if (state.showDiagonals) {
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = PALETTE.lavender;
      ctx.beginPath();
      ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.C.x, g.C.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.sky;
      ctx.beginPath();
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

    // Angle Wedges at all four vertices demonstrating supplementary pairs (A + C = 180°, B + D = 180°)
    if (showAngles) {
      const sweepWedge = (vertex, a1, a2, radius, fill, stroke) => {
        let diff = (a2 - a1) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const anticlockwise = diff > Math.PI;
        drawAngleWedge(ctx, vertex, a1, a2, radius, fill, stroke, anticlockwise);
      };

      const angAD = Math.atan2(g.D.y - g.A.y, g.D.x - g.A.x);
      const angAB = Math.atan2(g.B.y - g.A.y, g.B.x - g.A.x);
      sweepWedge(g.A, angAD, angAB, 26, 'rgba(168, 85, 247, 0.28)', PALETTE.violet);

      const angBA = Math.atan2(g.A.y - g.B.y, g.A.x - g.B.x);
      const angBC = Math.atan2(g.C.y - g.B.y, g.C.x - g.B.x);
      sweepWedge(g.B, angBA, angBC, 26, 'rgba(6, 182, 212, 0.28)', PALETTE.cyan);

      const angCB = Math.atan2(g.B.y - g.C.y, g.B.x - g.C.x);
      const angCD = Math.atan2(g.D.y - g.C.y, g.D.x - g.C.x);
      sweepWedge(g.C, angCB, angCD, 26, 'rgba(245, 158, 11, 0.28)', PALETTE.amber);

      const angDC = Math.atan2(g.C.y - g.D.y, g.C.x - g.D.x);
      const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
      sweepWedge(g.D, angDC, angDA, 26, 'rgba(244, 63, 94, 0.28)', PALETTE.rose);

      // Explicit angle badges for all 4 vertices along interior vector bisectors outside 26px wedges
      const showLabels = state.vis2d?.labels !== false;
      if (showLabels) {
        const uADx = Math.cos(angAD), uADy = Math.sin(angAD);
        const uABx = Math.cos(angAB), uABy = Math.sin(angAB);
        const bisAx = uADx + uABx, bisAy = uADy + uABy;
        const lA = Math.hypot(bisAx, bisAy) || 1;
        const nbAx = bisAx / lA, nbAy = bisAy / lA;

        const uBAx = Math.cos(angBA), uBAy = Math.sin(angBA);
        const uBCx = Math.cos(angBC), uBCy = Math.sin(angBC);
        const bisBx = uBAx + uBCx, bisBy = uBAy + uBCy;
        const lB = Math.hypot(bisBx, bisBy) || 1;
        const nbBx = bisBx / lB, nbBy = bisBy / lB;

        const uCBx = Math.cos(angCB), uCBy = Math.sin(angCB);
        const uCDx = Math.cos(angCD), uCDy = Math.sin(angCD);
        const bisCx = uCBx + uCDx, bisCy = uCBy + uCDy;
        const lC = Math.hypot(bisCx, bisCy) || 1;
        const nbCx = bisCx / lC, nbCy = bisCy / lC;

        const uDCx = Math.cos(angDC), uDCy = Math.sin(angDC);
        const uDAx = Math.cos(angDA), uDAy = Math.sin(angDA);
        const bisDx = uDCx + uDAx, bisDy = uDCy + uDAy;
        const lD = Math.hypot(bisDx, bisDy) || 1;
        const nbDx = bisDx / lD, nbDy = bisDy / lD;

        drawTextBadge(ctx, `∠A = ${g.angleADeg.toFixed(1)}°`, g.A.x + 48 * nbAx, g.A.y + 48 * nbAy, PALETTE.violet);
        drawTextBadge(ctx, `∠B = ${g.angleBDeg.toFixed(1)}°`, g.B.x + 48 * nbBx, g.B.y + 48 * nbBy, PALETTE.cyan);
        drawTextBadge(ctx, `∠C = ${g.angleCDeg.toFixed(1)}°`, g.C.x + 48 * nbCx, g.C.y + 48 * nbCy, PALETTE.amber);
        drawTextBadge(ctx, `∠D = ${g.angleDDeg.toFixed(1)}°`, g.D.x + 48 * nbDx, g.D.y + 48 * nbDy, PALETTE.rose);
      }
    }

    const showLabels = state.vis2d?.labels !== false;

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
        if (vis.labels !== false) base += ` (${angleDeg.toFixed(1)}°)`;
        return getPointLabel(base, pt.x - g.cx, -(pt.y - g.cy), vis);
      };

      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.violet, formatQuadLabel('A', g.angleADeg, g.A), 22);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.cyan, formatQuadLabel('B', g.angleBDeg, g.B), 22);
      drawRadialLabelledPoint(ctx, g.C, g.O, PALETTE.amber, formatQuadLabel('C', g.angleCDeg, g.C), 22);
      drawRadialLabelledPoint(ctx, g.D, g.O, PALETTE.rose, formatQuadLabel('D', g.angleDDeg, g.D), 22);
    }

    if (state.showExterior && g.E && showAngles && showLabels) {
      const dirDCx = g.C.x - g.D.x;
      const dirDCy = g.C.y - g.D.y;
      const lenDC = Math.hypot(dirDCx, dirDCy);
      const ndcx = lenDC > 0.001 ? dirDCx / lenDC : 1;
      const ndcy = lenDC > 0.001 ? dirDCy / lenDC : 0;
      const angCB = Math.atan2(g.B.y - g.C.y, g.B.x - g.C.x);
      const uCBx = Math.cos(angCB), uCBy = Math.sin(angCB);
      const bisExtX = uCBx + ndcx, bisExtY = uCBy + ndcy;
      const lExt = Math.hypot(bisExtX, bisExtY) || 1;
      drawTextBadge(ctx, `Ext = ${g.exteriorAngleDeg.toFixed(1)}°`, g.C.x + 45 * (bisExtX / lExt), g.C.y + 45 * (bisExtY / lExt), PALETTE.violet);
    }

    // Conjugate Reflex Angles (Perigon 360° - θ)
    const showReflex = Boolean(state.vis2d?.reflex);
    if (showReflex) {
      const angAD = Math.atan2(g.D.y - g.A.y, g.D.x - g.A.x);
      const angAB = Math.atan2(g.B.y - g.A.y, g.B.x - g.A.x);
      drawReflexWedge(ctx, g.A, angAD, angAB, 32, 'rgba(168, 85, 247, 0.18)', PALETTE.violet);

      const angBA = Math.atan2(g.A.y - g.B.y, g.A.x - g.B.x);
      const angBC = Math.atan2(g.C.y - g.B.y, g.C.x - g.B.x);
      drawReflexWedge(ctx, g.B, angBA, angBC, 32, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);

      const angCB = Math.atan2(g.B.y - g.C.y, g.B.x - g.C.x);
      const angCD = Math.atan2(g.D.y - g.C.y, g.D.x - g.C.x);
      drawReflexWedge(ctx, g.C, angCB, angCD, 32, 'rgba(245, 158, 11, 0.18)', PALETTE.amber);

      const angDC = Math.atan2(g.C.y - g.D.y, g.C.x - g.D.x);
      const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
      drawReflexWedge(ctx, g.D, angDC, angDA, 32, 'rgba(244, 63, 94, 0.18)', PALETTE.rose);

      if (showLabels) {
        const uADx = Math.cos(angAD), uADy = Math.sin(angAD);
        const uABx = Math.cos(angAB), uABy = Math.sin(angAB);
        const bisAx = uADx + uABx, bisAy = uADy + uABy;
        const lA = Math.hypot(bisAx, bisAy) || 1;

        const uBAx = Math.cos(angBA), uBAy = Math.sin(angBA);
        const uBCx = Math.cos(angBC), uBCy = Math.sin(angBC);
        const bisBx = uBAx + uBCx, bisBy = uBAy + uBCy;
        const lB = Math.hypot(bisBx, bisBy) || 1;

        const uCBx = Math.cos(angCB), uCBy = Math.sin(angCB);
        const uCDx = Math.cos(angCD), uCDy = Math.sin(angCD);
        const bisCx = uCBx + uCDx, bisCy = uCBy + uCDy;
        const lC = Math.hypot(bisCx, bisCy) || 1;

        const uDCx = Math.cos(angDC), uDCy = Math.sin(angDC);
        const uDAx = Math.cos(angDA), uDAy = Math.sin(angDA);
        const bisDx = uDCx + uDAx, bisDy = uDCy + uDAy;
        const lD = Math.hypot(bisDx, bisDy) || 1;

        drawTextBadge(ctx, `∠A* = ${(360 - g.angleADeg).toFixed(1)}°`, g.A.x - 54 * (bisAx / lA), g.A.y - 54 * (bisAy / lA), PALETTE.violet);
        drawTextBadge(ctx, `∠B* = ${(360 - g.angleBDeg).toFixed(1)}°`, g.B.x - 54 * (bisBx / lB), g.B.y - 54 * (bisBy / lB), PALETTE.cyan);
        drawTextBadge(ctx, `∠C* = ${(360 - g.angleCDeg).toFixed(1)}°`, g.C.x - 54 * (bisCx / lC), g.C.y - 54 * (bisCy / lC), PALETTE.amber);
        drawTextBadge(ctx, `∠D* = ${(360 - g.angleDDeg).toFixed(1)}°`, g.D.x - 54 * (bisDx / lD), g.D.y - 54 * (bisDy / lD), PALETTE.rose);
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
