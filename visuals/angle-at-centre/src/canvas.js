import { PALETTE, toDegrees, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, withShadow, drawSubtendedSector, getSubtendedArcCanvas, drawAngleWedge, drawReflexWedge, getPointLabel } from '../../../js/circle-core.js';
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

      // Inscribed Triangles Shading: Triangle OPA (Blue) and Triangle OPB (Orange)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.P.x, g.P.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(249, 115, 22, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.P.x, g.P.y); ctx.lineTo(g.B.x, g.B.y);
      ctx.closePath();
      ctx.fill();
    }

    // Radii: OA (Red) and OB (Orange)
    if (state.showRadii) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.red;
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.orange;
      ctx.beginPath();
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
    const angPA = Math.atan2(g.A.y - g.P.y, g.A.x - g.P.x);
    const angPB = Math.atan2(g.B.y - g.P.y, g.B.x - g.P.x);
    const angPO = Math.atan2(g.O.y - g.P.y, g.O.x - g.P.x);
    const angAO = Math.atan2(g.O.y - g.A.y, g.O.x - g.A.x);
    const angAP = Math.atan2(g.P.y - g.A.y, g.P.x - g.A.x);
    const angBO = Math.atan2(g.O.y - g.B.y, g.O.x - g.B.x);
    const angBP = Math.atan2(g.P.y - g.B.y, g.P.x - g.B.x);

    const diffAlpha = Math.abs(((angPA - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const alphaDeg = diffAlpha * (180 / Math.PI);
    const diffBeta = Math.abs(((angPB - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const betaDeg = diffBeta * (180 / Math.PI);

    if (showAngles) {
      // Central Angle arc wedge
      drawSubtendedSector(ctx, g.O, g.A, g.B, g.P, 36, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // Helper for interior acute sweep wedge
      const sweepWedge = (vertex, a1, a2, radius, fill, stroke) => {
        let diff = (a2 - a1) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const anticlockwise = diff > Math.PI;
        drawAngleWedge(ctx, vertex, a1, a2, radius, fill, stroke, anticlockwise);
      };

      // Inscribed angle theta at P between PA and PB
      sweepWedge(g.P, angPA, angPB, 38, 'rgba(34, 197, 94, 0.20)', PALETTE.green);

      // Base angles alpha (Lime) in △OPA at P and A
      sweepWedge(g.P, angPO, angPA, 30, 'rgba(132, 204, 22, 0.35)', PALETTE.lime);
      sweepWedge(g.A, angAO, angAP, 26, 'rgba(132, 204, 22, 0.35)', PALETTE.lime);

      // Base angles beta (Fuchsia) in △OPB at P and B
      sweepWedge(g.P, angPO, angPB, 30, 'rgba(217, 70, 239, 0.35)', PALETTE.fuchsia);
      sweepWedge(g.B, angBO, angBP, 26, 'rgba(217, 70, 239, 0.35)', PALETTE.fuchsia);
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
    const showLabels = state.vis2d?.labels !== false;
    if (showAngles && showLabels) {
      // Central Angle badge placed along central angle bisector outside the 36px wedge
      const { angA: sAngA, angB: sAngB, anticlockwise: sCcw } = getSubtendedArcCanvas(g.O, g.A, g.B, g.P);
      const TAU = Math.PI * 2;
      const nA = ((sAngA % TAU) + TAU) % TAU;
      const nB = ((sAngB % TAU) + TAU) % TAU;
      let sweep = (nB - nA) % TAU;
      if (sweep < 0) sweep += TAU;
      const midCentAng = sCcw ? (nA - (TAU - sweep) / 2) : (nA + sweep / 2);
      const centBadgeX = g.cx + 58 * Math.cos(midCentAng);
      const centBadgeY = g.cy + 58 * Math.sin(midCentAng);
      drawTextBadge(ctx, `2θ = ${g.centralDeg.toFixed(1)}°`, centBadgeX, centBadgeY, PALETTE.yellow);

      // Inscribed Angle badges
      const uAx = Math.cos(angPA), uAy = Math.sin(angPA);
      const uBx = Math.cos(angPB), uBy = Math.sin(angPB);
      const bisX = uAx + uBx, bisY = uAy + uBy;
      const bisLen = Math.hypot(bisX, bisY);
      const nBisX = bisLen > 0.001 ? bisX / bisLen : 0;
      const nBisY = bisLen > 0.001 ? bisY / bisLen : 1;
      const inscBadgeX = g.P.x + 60 * nBisX;
      const inscBadgeY = g.P.y + 60 * nBisY;
      drawTextBadge(ctx, `θ = ${g.inscribedDeg.toFixed(1)}°`, inscBadgeX, inscBadgeY, PALETTE.green);

      // Base angle alpha and beta badges near P:
      // Uses vector bisectors placed at 48px to clear 30px wedges
      const uPOx = Math.cos(angPO), uPOy = Math.sin(angPO);
      const bisAlphaPx = uPOx + uAx, bisAlphaPy = uPOy + uAy;
      const lAlphaP = Math.hypot(bisAlphaPx, bisAlphaPy) || 1;
      const bisBetaPx = uPOx + uBx, bisBetaPy = uPOy + uBy;
      const lBetaP = Math.hypot(bisBetaPx, bisBetaPy) || 1;
      drawTextBadge(ctx, `α = ${alphaDeg.toFixed(1)}°`, g.P.x + 48 * (bisAlphaPx / lAlphaP), g.P.y + 48 * (bisAlphaPy / lAlphaP), PALETTE.lime);
      drawTextBadge(ctx, `β = ${betaDeg.toFixed(1)}°`, g.P.x + 48 * (bisBetaPx / lBetaP), g.P.y + 48 * (bisBetaPy / lBetaP), PALETTE.fuchsia);

      // Badges at base vertices A and B (outside 26px wedges along bisectors)
      const uAOx = Math.cos(angAO), uAOy = Math.sin(angAO);
      const uAPx = Math.cos(angAP), uAPy = Math.sin(angAP);
      const bisAx = uAOx + uAPx, bisAy = uAOy + uAPy;
      const lA = Math.hypot(bisAx, bisAy) || 1;
      drawTextBadge(ctx, `α = ${alphaDeg.toFixed(1)}°`, g.A.x + 44 * (bisAx / lA), g.A.y + 44 * (bisAy / lA), PALETTE.lime);

      const uBOx = Math.cos(angBO), uBOy = Math.sin(angBO);
      const uBPx = Math.cos(angBP), uBPy = Math.sin(angBP);
      const bisBx = uBOx + uBPx, bisBy = uBOy + uBPy;
      const lB = Math.hypot(bisBx, bisBy) || 1;
      drawTextBadge(ctx, `β = ${betaDeg.toFixed(1)}°`, g.B.x + 44 * (bisBx / lB), g.B.y + 44 * (bisBy / lB), PALETTE.fuchsia);
    }

    // Conjugate Reflex Angles (Perigon 360° - θ)
    const showReflex = Boolean(state.vis2d?.reflex);
    if (showReflex) {
      const { angA: sAngA, angB: sAngB, anticlockwise: sCcw } = getSubtendedArcCanvas(g.O, g.A, g.B, g.P);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y);
      ctx.arc(g.O.x, g.O.y, 42, sAngA, sAngB, !sCcw);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();

      drawReflexWedge(ctx, g.P, angPA, angPB, 44, 'rgba(20, 184, 166, 0.15)', PALETTE.teal);

      if (showLabels) {
        const TAU = Math.PI * 2;
        const nA = ((sAngA % TAU) + TAU) % TAU;
        const nB = ((sAngB % TAU) + TAU) % TAU;
        let sweep = (nB - nA) % TAU;
        if (sweep < 0) sweep += TAU;
        const midCentAng = sCcw ? (nA - (TAU - sweep) / 2) : (nA + sweep / 2);
        drawTextBadge(ctx, `2θ* = ${(360 - g.centralDeg).toFixed(1)}°`, g.cx - 62 * Math.cos(midCentAng), g.cy - 62 * Math.sin(midCentAng), PALETTE.teal);

        const uAx = Math.cos(angPA), uAy = Math.sin(angPA);
        const uBx = Math.cos(angPB), uBy = Math.sin(angPB);
        const bisX = uAx + uBx, bisY = uAy + uBy;
        const bisLen = Math.hypot(bisX, bisY);
        const nBisX = bisLen > 0.001 ? bisX / bisLen : 0;
        const nBisY = bisLen > 0.001 ? bisY / bisLen : 1;
        drawTextBadge(ctx, `θ* = ${(360 - g.inscribedDeg).toFixed(1)}°`, g.P.x - 62 * nBisX, g.P.y - 62 * nBisY, PALETTE.teal);
      }
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
