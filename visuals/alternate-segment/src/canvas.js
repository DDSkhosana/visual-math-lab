import { PALETTE, draw2DCartesianGrid, drawRadialLabelledPoint, drawTextBadge, drawDoubleArrow, drawSegmentContainingPoint, drawSubtendedSegment, drawAngleWedge, drawRightAngle, drawReflexWedge, getPointLabel } from '../../../js/circle-core.js';
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

    const showThales = Boolean(state.showProofConstruction || state.showThalesOverlay);

    // Relevant Area Shading (Both Alternate Segments & Triangles)
    // Major Alternate Segment: Sky | Minor Alternate Segment: Violet
    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    if (showArea) {
      // 1. Alternate Segment (Major) on chord TA containing vertex B (Sky)
      drawSegmentContainingPoint(ctx, g.O, g.T, g.A, g.B, g.r, 'rgba(56, 189, 248, 0.20)', 'rgba(56, 189, 248, 0.45)');

      // 2. Alternate Segment (Minor) on chord TA (Violet: distinct colour token)
      drawSubtendedSegment(ctx, g.O, g.T, g.A, g.B, g.r, 'rgba(168, 85, 247, 0.18)', 'rgba(168, 85, 247, 0.45)');

      // 3. Triangle TBA shading (Cyan)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.A.x, g.A.y);
      ctx.closePath();
      ctx.fill();

      // 4. Diameter proof triangles TBD (Indigo) and TAD (Rose)
      if (showThales && g.D) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.16)';
        ctx.beginPath();
        ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
        ctx.beginPath();
        ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.A.x, g.A.y); ctx.lineTo(g.D.x, g.D.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Diameter proof construction (TD, BD, AD, and exterior ray Dext)
    if (showThales && g.D) {
      // Diameter TD (Indigo dashed)
      ctx.strokeStyle = PALETTE.indigo;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(g.T.x, g.T.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();

      // Chord BD (Cyan)
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(g.B.x, g.B.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();

      // Chord AD (Rose)
      ctx.strokeStyle = PALETTE.rose;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.A.x, g.A.y); ctx.lineTo(g.D.x, g.D.y);
      ctx.stroke();

      // Exterior ray past D
      if (g.Dext) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(g.D.x, g.D.y); ctx.lineTo(g.Dext.x, g.Dext.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Tangent Line with sharp double arrowheads (no blobs)
    drawDoubleArrow(ctx, g.Tan1, g.Tan2, PALETTE.emerald, 3);
    const tanMidX = g.T.x + (g.Tan2.x - g.T.x) * 0.45;
    const tanMidY = g.T.y + (g.Tan2.y - g.T.y) * 0.45;
    const showLabels = state.vis2d?.labels !== false;
    if (showLabels) {
      drawTextBadge(ctx, 'Tangent', tanMidX, tanMidY, PALETTE.emerald);
    }

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
    const activeTanPt = Math.abs(diff1 * (180 / Math.PI) - g.tangentChordDeg) < Math.abs(diff2 * (180 / Math.PI) - g.tangentChordDeg) ? g.Tan1 : g.Tan2;

    const showAngles = (state.vis2d?.angles !== false) && (state.showAngles !== false);

    // Equal Angle Wedges (at T and B) + Thales Right Angles + Point D Wedges
    if (showAngles) {
      // 1. Angle between Tangent and Chord TA at T
      drawAngleWedge(ctx, g.T, angTan, angTA, 32, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // 2. Inscribed angle at B: ∠TBA
      drawAngleWedge(ctx, g.B, angBA, angBT, 28, 'rgba(234, 179, 8, 0.25)', PALETTE.yellow);

      // 3. Thales Right Angles and Point D Angle Wedges
      if (showThales && g.D) {
        // Right angle at B: ∠TBD = 90.0°
        drawRightAngle(ctx, g.B, g.T, g.D, 14, PALETTE.teal, 'rgba(20, 184, 166, 0.28)');

        // Right angle at A: ∠TAD = 90.0°
        drawRightAngle(ctx, g.A, g.T, g.D, 14, PALETTE.teal, 'rgba(20, 184, 166, 0.28)');

        // Right angle at T: TD ⊥ Tangent (90.0°)
        drawRightAngle(ctx, g.T, g.D, activeTanPt, 14, PALETTE.teal, 'rgba(20, 184, 166, 0.28)');

        // Point D Interior and Exterior Angles
        if (state.showDAngles !== false) {
          // Point D Interior Angle: ∠TDA = α (yellow)
          const angDT = Math.atan2(g.T.y - g.D.y, g.T.x - g.D.x);
          const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
          drawAngleWedge(ctx, g.D, angDT, angDA, 28, 'rgba(234, 179, 8, 0.28)', PALETTE.yellow);

          // Point D Exterior Angle: Ext D = 180° - α (rose)
          if (g.Dext) {
            const angDext = Math.atan2(g.Dext.y - g.D.y, g.Dext.x - g.D.x);
            drawAngleWedge(ctx, g.D, angDA, angDext, 24, 'rgba(244, 63, 94, 0.28)', PALETTE.rose);
          }
        }
      }
    }

    // Points and Labels adhering to Euclidean standards with outward radial clearance
    if (state.vis2d?.points !== false) {
      const vis = state.vis2d || {};
      drawRadialLabelledPoint(ctx, g.T, g.O, PALETTE.red, getPointLabel('T', g.T.x - g.cx, -(g.T.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.A, g.O, PALETTE.blue, getPointLabel('A', g.A.x - g.cx, -(g.A.y - g.cy), vis), 20);
      drawRadialLabelledPoint(ctx, g.B, g.O, PALETTE.orange, getPointLabel('B', g.B.x - g.cx, -(g.B.y - g.cy), vis), 20);
      if (showThales && g.D) {
        drawRadialLabelledPoint(ctx, g.D, g.O, PALETTE.indigo, getPointLabel('D', g.D.x - g.cx, -(g.D.y - g.cy), vis), 20);
      }
    }

    // Alternate Segment Labels (Major: Sky, Minor: Violet)
    if (showLabels && showArea && g.alternateSegments) {
      drawTextBadge(ctx, g.alternateSegments.major.label, g.alternateSegments.major.labelPos.x, g.alternateSegments.major.labelPos.y, g.alternateSegments.major.color || PALETTE.sky);
      drawTextBadge(ctx, g.alternateSegments.minor.label, g.alternateSegments.minor.labelPos.x, g.alternateSegments.minor.labelPos.y, g.alternateSegments.minor.color || PALETTE.violet);
    }

    // Angle text annotations with protective badge pills
    if (showAngles && showLabels) {
      // Inscribed angle at B (snug at the 28px wedge boundary)
      const uBTx = Math.cos(angBT), uBTy = Math.sin(angBT);
      const uBAx = Math.cos(angBA), uBAy = Math.sin(angBA);
      const bisBX = uBTx + uBAx, bisBY = uBTy + uBAy;
      const lenB = Math.hypot(bisBX, bisBY);
      const nbBX = lenB > 0.001 ? bisBX / lenB : 0;
      const nbBY = lenB > 0.001 ? bisBY / lenB : 1;
      drawTextBadge(ctx, `α = ${g.inscribedDeg.toFixed(1)}°`, g.B.x + 36 * nbBX, g.B.y + 36 * nbBY, PALETTE.yellow);

      // Tangent-chord angle at T (bisects the active tangent ray and chord TA, snug at 32px wedge)
      const lenTA = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y);
      const uTAx = lenTA > 0.001 ? (g.A.x - g.T.x) / lenTA : 0;
      const uTAy = lenTA > 0.001 ? (g.A.y - g.T.y) / lenTA : -1;
      const uActX = Math.cos(angTan), uActY = Math.sin(angTan);
      const bisTX = uTAx + uActX, bisTY = uTAy + uActY;
      const lenT = Math.hypot(bisTX, bisTY);
      const nbTX = lenT > 0.001 ? bisTX / lenT : 0;
      const nbTY = lenT > 0.001 ? bisTY / lenT : 1;
      drawTextBadge(ctx, `α = ${g.tangentChordDeg.toFixed(1)}°`, g.T.x + 36 * nbTX, g.T.y + 36 * nbTY, PALETTE.yellow);

      // Thales Badges: Right angles at B, A, T and Angles at D
      if (showThales && g.D) {
        // Right angle at B: ∠TBD = 90.0°
        const angBD = Math.atan2(g.D.y - g.B.y, g.D.x - g.B.x);
        const bisBDX = Math.cos(angBT) + Math.cos(angBD);
        const bisBDY = Math.sin(angBT) + Math.sin(angBD);
        const lenBD = Math.hypot(bisBDX, bisBDY) || 1;
        drawTextBadge(ctx, '∠TBD = 90.0°', g.B.x + 22 * (bisBDX / lenBD), g.B.y + 22 * (bisBDY / lenBD), PALETTE.teal);

        // Right angle at A: ∠TAD = 90.0°
        const angAT = Math.atan2(g.T.y - g.A.y, g.T.x - g.A.x);
        const angAD = Math.atan2(g.D.y - g.A.y, g.D.x - g.A.x);
        const bisADX = Math.cos(angAT) + Math.cos(angAD);
        const bisADY = Math.sin(angAT) + Math.sin(angAD);
        const lenAD = Math.hypot(bisADX, bisADY) || 1;
        drawTextBadge(ctx, '∠TAD = 90.0°', g.A.x + 22 * (bisADX / lenAD), g.A.y + 22 * (bisADY / lenAD), PALETTE.teal);

        // Point D Angles (Interior & Exterior)
        if (state.showDAngles !== false) {
          // Point D Interior Angle: ∠TDA = α (snug at the 28px wedge)
          const angDT = Math.atan2(g.T.y - g.D.y, g.T.x - g.D.x);
          const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
          const bisIntDX = Math.cos(angDT) + Math.cos(angDA);
          const bisIntDY = Math.sin(angDT) + Math.sin(angDA);
          const lenIntD = Math.hypot(bisIntDX, bisIntDY) || 1;
          drawTextBadge(ctx, `∠TDA = α = ${g.angleTDA.toFixed(1)}°`, g.D.x + 34 * (bisIntDX / lenIntD), g.D.y + 34 * (bisIntDY / lenIntD), PALETTE.yellow);

          // Point D Exterior Angle: Ext D = 180° - α (snug at the 24px wedge)
          if (g.Dext) {
            const angDext = Math.atan2(g.Dext.y - g.D.y, g.Dext.x - g.D.x);
            const bisExtDX = Math.cos(angDA) + Math.cos(angDext);
            const bisExtDY = Math.sin(angDA) + Math.sin(angDext);
            const lenExtD = Math.hypot(bisExtDX, bisExtDY) || 1;
            drawTextBadge(ctx, `Ext D = ${g.extAngleD.toFixed(1)}°`, g.D.x + 30 * (bisExtDX / lenExtD), g.D.y + 30 * (bisExtDY / lenExtD), PALETTE.rose);
          }
        }
      }
    }

    // Conjugate Reflex Angles (Perigon 360° - θ)
    const showReflex = Boolean(state.vis2d?.reflex);
    if (showReflex) {
      drawReflexWedge(ctx, g.T, angTan, angTA, 40, 'rgba(234, 179, 8, 0.15)', PALETTE.yellow);
      drawReflexWedge(ctx, g.B, angBA, angBT, 36, 'rgba(234, 179, 8, 0.15)', PALETTE.yellow);

      if (showThales && g.D && state.showDAngles !== false) {
        const angDT = Math.atan2(g.T.y - g.D.y, g.T.x - g.D.x);
        const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
        drawReflexWedge(ctx, g.D, angDT, angDA, 36, 'rgba(234, 179, 8, 0.15)', PALETTE.yellow);
      }

      if (showLabels) {
        // Bisectors in outward reflex direction (negative of interior bisector)
        const uBTx = Math.cos(angBT), uBTy = Math.sin(angBT);
        const uBAx = Math.cos(angBA), uBAy = Math.sin(angBA);
        const bisBX = uBTx + uBAx, bisBY = uBTy + uBAy;
        const lenB = Math.hypot(bisBX, bisBY) || 1;
        drawTextBadge(ctx, `α* = ${(360 - g.inscribedDeg).toFixed(1)}°`, g.B.x - 44 * (bisBX / lenB), g.B.y - 44 * (bisBY / lenB), PALETTE.yellow);

        const lenTA = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y) || 1;
        const uTAx = (g.A.x - g.T.x) / lenTA, uTAy = (g.A.y - g.T.y) / lenTA;
        const uActX = Math.cos(angTan), uActY = Math.sin(angTan);
        const bisTX = uTAx + uActX, bisTY = uTAy + uActY;
        const lenT = Math.hypot(bisTX, bisTY) || 1;
        drawTextBadge(ctx, `α* = ${(360 - g.tangentChordDeg).toFixed(1)}°`, g.T.x - 46 * (bisTX / lenT), g.T.y - 46 * (bisTY / lenT), PALETTE.yellow);

        if (showThales && g.D && state.showDAngles !== false) {
          const angDT = Math.atan2(g.T.y - g.D.y, g.T.x - g.D.x);
          const angDA = Math.atan2(g.A.y - g.D.y, g.A.x - g.D.x);
          const bisIntDX = Math.cos(angDT) + Math.cos(angDA);
          const bisIntDY = Math.sin(angDT) + Math.sin(angDA);
          const lenIntD = Math.hypot(bisIntDX, bisIntDY) || 1;
          drawTextBadge(ctx, `D* = ${(360 - g.angleTDA).toFixed(1)}°`, g.D.x - 44 * (bisIntDX / lenIntD), g.D.y - 44 * (bisIntDY / lenIntD), PALETTE.yellow);
        }
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

