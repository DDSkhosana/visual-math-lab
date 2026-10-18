import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawRightAngle, drawAngleWedge, drawReflexWedge, drawSubtendedSegment, drawDoubleArrow, withShadow, getPointLabel } from '../../../js/circle-core.js';
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

    // Shaded areas (circular segment, congruent triangles, and angle wedges)
    const center = { x: g.cx, y: g.cy };
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    const showAngles = (state.vis2d?.angles !== false);

    if (showArea) {
      // Minor circular segment cut off by chord AB
      drawSubtendedSegment(ctx, center, g.r, g.A, g.B, 'rgba(56, 189, 248, 0.10)', null, true);

      // Congruence triangles fill
      ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.A.x, g.A.y); ctx.lineTo(g.M.x, g.M.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.M.x, g.M.y);
      ctx.closePath();
      ctx.fill();
    }

    if (showAngles) {
      // Equal central angle wedges at O: angle(A, O, M) = angle(B, O, M)
      const angA = Math.atan2(g.A.y - g.cy, g.A.x - g.cx);
      const angB = Math.atan2(g.B.y - g.cy, g.B.x - g.cx);
      const angM = Math.atan2(g.M.y - g.cy, g.M.x - g.cx);

      const sweepWedge = (vertex, a1, a2, fill, stroke) => {
        let diff = (a2 - a1) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        const anticlockwise = diff > Math.PI;
        drawAngleWedge(ctx, vertex, a1, a2, 28, fill, stroke, anticlockwise);
      };
      sweepWedge(center, angM, angA, 'rgba(59, 130, 246, 0.28)', PALETTE.blue);
      sweepWedge(center, angM, angB, 'rgba(245, 158, 11, 0.28)', PALETTE.orange);
    }

    // Circle
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // Extended bisector line
    if (state.showExtendedBisector) {
      ctx.strokeStyle = PALETTE.lavender;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(g.bisectorP1.x, g.bisectorP1.y);
      ctx.lineTo(g.bisectorP2.x, g.bisectorP2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Radii OA (Blue) and OB (Orange)
    if (state.showRadii) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.blue;
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.A.x, g.A.y);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.orange;
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.B.x, g.B.y);
      ctx.stroke();
    }

    // Chord Segments: AM (Blue) and MB (Orange)
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.M.x, g.M.y);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.M.x, g.M.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    // Perpendicular OM (Emerald)
    ctx.strokeStyle = PALETTE.emerald;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy); ctx.lineTo(g.M.x, g.M.y);
    ctx.stroke();

    // Right-angle marker at M (between MA and MO)
    if (showAngles) {
      const raFill = 'rgba(20, 184, 166, 0.25)';
      drawRightAngle(ctx, g.M, g.A, center, 14, PALETTE.teal, raFill);
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    const uOMx = g.distOM > 0.001 ? (g.M.x - g.cx) / g.distOM : 0;
    const uOMy = g.distOM > 0.001 ? (g.M.y - g.cy) / g.distOM : 1;
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawLabelledPoint(ctx, center, PALETTE.indigo, getPointLabel('O', 0, 0, vis), -16, 18);
      drawRadialLabelledPoint(ctx, g.A, center, PALETTE.blue, getPointLabel('A', g.A.x - g.cx, -(g.A.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.B, center, PALETTE.orange, getPointLabel('B', g.B.x - g.cx, -(g.B.y - g.cy), vis), 20);
      drawLabelledPoint(ctx, g.M, PALETTE.emerald, getPointLabel('M', g.M.x - g.cx, -(g.M.y - g.cy), vis), 16 * uOMx, 16 * uOMy);
    }

    // Angle text labels at O and right-angle at M
    const showLabels = state.vis2d?.labels !== false;
    if (showAngles && showLabels) {
      const angA = Math.atan2(g.A.y - g.cy, g.A.x - g.cx);
      const angB = Math.atan2(g.B.y - g.cy, g.B.x - g.cx);
      const angM = Math.atan2(g.M.y - g.cy, g.M.x - g.cx);
      const degAOM = Math.abs(((angA - angM + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * (180 / Math.PI);
      const degBOM = Math.abs(((angB - angM + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * (180 / Math.PI);

      // Robust Euclidean unit vector bisectors (eliminates branch-cut wrap and scalar average jumps)
      const uOAx = (g.A.x - g.cx) / (Math.hypot(g.A.x - g.cx, g.A.y - g.cy) || 1);
      const uOAy = (g.A.y - g.cy) / (Math.hypot(g.A.x - g.cx, g.A.y - g.cy) || 1);
      const uOMx = (g.M.x - g.cx) / (Math.hypot(g.M.x - g.cx, g.M.y - g.cy) || 1);
      const uOMy = (g.M.y - g.cy) / (Math.hypot(g.M.x - g.cx, g.M.y - g.cy) || 1);
      const uOBx = (g.B.x - g.cx) / (Math.hypot(g.B.x - g.cx, g.B.y - g.cy) || 1);
      const uOBy = (g.B.y - g.cy) / (Math.hypot(g.B.x - g.cx, g.B.y - g.cy) || 1);

      const bisAOMx = uOAx + uOMx, bisAOMy = uOAy + uOMy;
      const lenAOM = Math.hypot(bisAOMx, bisAOMy) || 1;
      const nbAOMx = bisAOMx / lenAOM, nbAOMy = bisAOMy / lenAOM;

      const bisBOMx = uOBx + uOMx, bisBOMy = uOBy + uOMy;
      const lenBOM = Math.hypot(bisBOMx, bisBOMy) || 1;
      const nbBOMx = bisBOMx / lenBOM, nbBOMy = bisBOMy / lenBOM;

      // Position badges outside the 26px angle wedges (50px from center O to eliminate obstruction)
      drawTextBadge(ctx, `∠AOM = ${degAOM.toFixed(1)}°`, g.cx + 50 * nbAOMx, g.cy + 50 * nbAOMy, PALETTE.blue);
      drawTextBadge(ctx, `∠BOM = ${degBOM.toFixed(1)}°`, g.cx + 50 * nbBOMx, g.cy + 50 * nbBOMy, PALETTE.orange);
      drawTextBadge(ctx, '90.0°', g.M.x - 26 * uOMx, g.M.y - 26 * uOMy, PALETTE.teal);
    }

    // Length text on chord halves with protective badge pills offset perpendicular to chord
    if (showLabels && state.vis2d?.lengths !== false) {
      const dABx = g.B.x - g.A.x, dABy = g.B.y - g.A.y;
      const lenAB = Math.hypot(dABx, dABy);
      let nABx = lenAB > 0.001 ? -dABy / lenAB : 0, nABy = lenAB > 0.001 ? dABx / lenAB : -1;
      if (nABx * uOMx + nABy * uOMy < 0) { nABx = -nABx; nABy = -nABy; }

      const midAM = { x: (g.A.x + g.M.x) / 2, y: (g.A.y + g.M.y) / 2 };
      const midMB = { x: (g.B.x + g.M.x) / 2, y: (g.B.y + g.M.y) / 2 };
      drawTextBadge(ctx, `|AM| = ${g.lenAM.toFixed(1)}px`, midAM.x + 16 * nABx, midAM.y + 16 * nABy, PALETTE.blue);
      drawTextBadge(ctx, `|MB| = ${g.lenMB.toFixed(1)}px`, midMB.x + 16 * nABx, midMB.y + 16 * nABy, PALETTE.orange);
    }

    // Conjugate Reflex Angles (270° at M)
    const showReflex = Boolean(state.vis2d?.reflex);
    if (showReflex) {
      const angMA = Math.atan2(g.A.y - g.M.y, g.A.x - g.M.x);
      const angMO = Math.atan2(g.cy - g.M.y, g.cx - g.M.x);
      drawReflexWedge(ctx, g.M, angMA, angMO, 28, 'rgba(20, 184, 166, 0.18)', PALETTE.teal);

      if (showLabels) {
        drawTextBadge(ctx, '270.0° (M*)', g.M.x + 36 * uOMx, g.M.y + 36 * uOMy, PALETTE.teal);
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
      a.href = url; a.download = 'perpendicular-chord-bisector.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'perpendicular-chord-bisector.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
