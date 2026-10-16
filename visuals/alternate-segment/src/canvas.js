import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawDoubleArrow, withShadow, drawSegmentContainingPoint, drawSubtendedSegment, drawAngleWedge, getPointLabel } from '../../../js/circle-core.js';
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

    // Relevant Area Shading (Both Alternate Segments & Triangles)
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    if (showArea) {
      // 1. Alternate Segment on chord TA containing vertex B (Sky)
      drawSegmentContainingPoint(ctx, g.O, g.T, g.A, g.B, g.r, 'rgba(56, 189, 248, 0.16)');

      // 2. Minor Segment on chord TA not containing vertex B (Amber)
      drawSubtendedSegment(ctx, g.O, g.T, g.A, g.B, g.r, 'rgba(245, 158, 11, 0.16)');

      // 3. Triangle TBA shading (Cyan)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.closePath();
      ctx.fill();

      // 4. Diameter proof triangles TBD (Indigo) and ABD (Rose)
      if (state.showProofConstruction && g.D) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.16)';
        ctx.beginPath();
        ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
        ctx.beginPath();
        ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Diameter proof construction (optional: TD and BD)
    if (state.showProofConstruction && g.D) {
      // Diameter TD (Indigo)
      ctx.strokeStyle = PALETTE.indigo;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();

      // Chord BD (Rose)
      ctx.strokeStyle = PALETTE.rose;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tangent Line with sharp double arrowheads (no blobs)
    drawDoubleArrow(ctx, g.Tan1, g.Tan2, PALETTE.emerald, 3);
    const tanMidX = g.T.x + (g.Tan2.x - g.T.x) * 0.45;
    const tanMidY = g.T.y + (g.Tan2.y - g.T.y) * 0.45;
    drawTextBadge(ctx, 'Tangent', tanMidX, tanMidY, PALETTE.emerald);

    // Differentiated Chords with distinct color tokens
    // 1. Primary Chord TA (Blue)
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.A.x, g.A.y);
    ctx.stroke();

    // 2. Chord TB (Cyan)
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.B.x, g.B.y);
    ctx.stroke();

    // 3. Chord BA (Orange)
    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.B.x, g.B.y); ctx.lineTo(g.A.x, g.A.y);
    ctx.stroke();

    // Angles at B and T for wedges and badges
    const angBT = Math.atan2(g.T.y - g.B.y, g.T.x - g.B.x);
    const angBA = Math.atan2(g.A.y - g.B.y, g.A.x - g.B.x);
    const angTan1 = Math.atan2(g.Tan1.y - g.T.y, g.Tan1.x - g.T.x);
    const angTan2 = Math.atan2(g.Tan2.y - g.T.y, g.Tan2.x - g.T.x);
    const angTA = Math.atan2(g.A.y - g.T.y, g.A.x - g.T.x);

    const diff1 = Math.abs(((angTan1 - angTA + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const diff2 = Math.abs(((angTan2 - angTA + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const angTan = Math.abs(diff1 * (180 / Math.PI) - g.tangentChordDeg) < Math.abs(diff2 * (180 / Math.PI) - g.tangentChordDeg) ? angTan1 : angTan2;

    const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);

    // Equal Angle Wedges (at T and B)
    if (showAngles) {
      // 1. Angle between Tangent and Chord TA at T
      drawAngleWedge(ctx, g.T, angTan, angTA, 32, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // 2. Inscribed angle at B: ∠TBA
      drawAngleWedge(ctx, g.B, angBA, angBT, 28, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // 3. Thales Right Angle at B (∠TBD = 90.0°)
      if (state.showProofConstruction && g.D) {
        const angBD = Math.atan2(g.D.y - g.B.y, g.D.x - g.B.x);
        drawAngleWedge(ctx, g.B, angBT, angBD, 22, 'rgba(20, 184, 166, 0.28)', PALETTE.teal);
      }
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawRadialLabelledPoint(ctx, g.T, g.O, PALETTE.red, getPointLabel('T', g.T.x - g.cx, -(g.T.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.blue, getPointLabel('A', g.A.x - g.cx, -(g.A.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.orange, getPointLabel('B', g.B.x - g.cx, -(g.B.y - g.cy), vis), 20);
      if (state.showProofConstruction && g.D) {
        drawRadialLabelledPoint(ctx, g.D, g.O, PALETTE.indigo, getPointLabel('D', g.D.x - g.cx, -(g.D.y - g.cy), vis), 20);
      }
    }

    // Angle text annotations with protective badge pills
    if (showAngles) {
      // Inscribed angle at B
      const uBTx = Math.cos(angBT), uBTy = Math.sin(angBT);
      const uBAx = Math.cos(angBA), uBAy = Math.sin(angBA);
      const bisBX = uBTx + uBAx, bisBY = uBTy + uBAy;
      const lenB = Math.hypot(bisBX, bisBY);
      const nbBX = lenB > 0.001 ? bisBX / lenB : 0;
      const nbBY = lenB > 0.001 ? bisBY / lenB : 1;
      drawTextBadge(ctx, `α = ${g.inscribedDeg.toFixed(1)}°`, g.B.x + 46 * nbBX, g.B.y + 46 * nbBY, PALETTE.yellow);

      // Tangent-chord angle at T
      const lenTA = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y);
      const uTAx = lenTA > 0.001 ? (g.A.x - g.T.x) / lenTA : 0;
      const uTAy = lenTA > 0.001 ? (g.A.y - g.T.y) / lenTA : -1;
      // Tangent vector is perpendicular to OT
      const uOTx = (g.T.x - g.cx) / g.r, uOTy = (g.T.y - g.cy) / g.r;
      let uTanX = -uOTy, uTanY = uOTx;
      if (uTanX * uTAx + uTanY * uTAy < 0) {
        uTanX = -uTanX;
        uTanY = -uTanY;
      }
      const bisTX = uTAx + uTanX, bisTY = uTAy + uTanY;
      const lenT = Math.hypot(bisTX, bisTY);
      const nbTX = lenT > 0.001 ? bisTX / lenT : 0;
      const nbTY = lenT > 0.001 ? bisTY / lenT : 1;
      drawTextBadge(ctx, `α = ${g.tangentChordDeg.toFixed(1)}°`, g.T.x + 44 * nbTX, g.T.y + 44 * nbTY, PALETTE.yellow);
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
      a.href = url; a.download = 'alternate-segment.png'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportSVG() {
    const str = generateSVG(this.state, this.width, this.height);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'alternate-segment.svg'; a.click();
    URL.revokeObjectURL(url);
  }
}
