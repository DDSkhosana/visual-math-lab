import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawDoubleArrow, withShadow, drawReflexWedge, getPointLabel } from '../../../../js/circle-core.js';
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

    ctx.__vis = state.vis2d;
    ctx.clearRect(0, 0, width, height);
    const g = computeGeometry(state, width, height);

    // Cartesian Grid & Coordinate Axes
    draw2DCartesianGrid(ctx, width, height, g.cx, g.cy, state.vis2d, 40, state.cameraPerspective);

    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    const showQuadrant = (state.showQuadrant !== false) && (state.vis2d?.quadrant !== false);
    const showTrig = (state.showTrigWedges !== false) && (state.vis2d?.trigWedges !== false);
    const showAngles = (state.vis2d?.angles !== false);
    const showLabels = (state.vis2d?.labels !== false);
    const showPoints = (state.vis2d?.points !== false);
    const vis = state.vis2d || {};

    // 1. Dynamic Quadrant Shading & Quadrant Indicators
    if (showQuadrant) {
      const q = g.quadrant;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.arc(g.cx, g.cy, g.r, -q.startAngle, -q.endAngle, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(234, 179, 8, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Quadrant Numerals and Labels (Q1..Q4 / I..IV) at radius 0.82r
      const qr = g.r * 0.82;
      const quads = [
        { num: 'I', qNum: 'Q1', q: 0, x: g.cx + qr * 0.707, y: g.cy - qr * 0.707 },
        { num: 'II', qNum: 'Q2', q: 1, x: g.cx - qr * 0.707, y: g.cy - qr * 0.707 },
        { num: 'III', qNum: 'Q3', q: 2, x: g.cx - qr * 0.707, y: g.cy + qr * 0.707 },
        { num: 'IV', qNum: 'Q4', q: 3, x: g.cx + qr * 0.707, y: g.cy + qr * 0.707 },
      ];

      if (showLabels) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const item of quads) {
          const isActive = item.q === q.index;
          if (isActive) {
            // Circular glowing halo badge behind active numeral
            ctx.beginPath();
            ctx.arc(item.x, item.y, 16, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(234, 179, 8, 0.18)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = 'bold 15px sans-serif';
            ctx.fillStyle = PALETTE.yellow;
            ctx.shadowColor = 'rgba(234, 179, 8, 0.75)';
            ctx.shadowBlur = 10;
            ctx.fillText(item.num, item.x, item.y);
            ctx.shadowBlur = 0;

            // Quadrant Q-number badge
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = PALETTE.yellow;
            ctx.fillText(item.qNum, item.x, item.y - 22);
          } else {
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
            ctx.fillText(item.num, item.x, item.y);
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
            ctx.fillText(item.qNum, item.x, item.y - 18);
          }
        }

        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(234, 179, 8, 0.85)';
        ctx.fillText(`Top View (Plane XZ) | ${q.label}`, 12, height - 10);
      }
      ctx.restore();
    }

    // 2. Dynamic Shading of Areas Subtended Between Chords Connecting Tangents
    if (g.chords && g.chords.length > 0) {
      const showChords = (state.vis2d?.chords !== false);
      for (const c of g.chords) {
        if (showArea && showChords) {
          ctx.save();
          ctx.beginPath();
          if (state.chordAreaMode === 'sector') {
            ctx.moveTo(g.cx, g.cy);
            ctx.arc(g.cx, g.cy, g.r, -c.ang1, -c.ang2, true);
          } else {
            ctx.moveTo(c.p1.x, c.p1.y);
            ctx.arc(g.cx, g.cy, g.r, -c.ang1, -c.ang2, true);
          }
          ctx.closePath();
          ctx.fillStyle = c.fillRgba;
          ctx.fill();
          ctx.restore();
        }

        if (showChords) {
          ctx.save();
          ctx.strokeStyle = c.strokeRgba;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(c.p1.x, c.p1.y);
          ctx.lineTo(c.p2.x, c.p2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        if (showLabels && (state.vis2d?.lengths !== false) && showChords) {
          const areaVal = Math.round(c.area);
          drawTextBadge(ctx, `${c.t1Name}${c.t2Name}: ${areaVal}px²`, c.badgePos.x, c.badgePos.y, c.color);
        }
      }
    }

    // 3. Circle Perimeter
    ctx.strokeStyle = PALETTE.sky;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Trigonometric Wedges & Projections (Exclusively for Primary Tangent T)
    if (showTrig && g.primaryTrig) {
      const pt = g.primaryTrig;

      // Inscribed right triangle Δ O Tx T fill
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(pt.Tx.x, pt.Tx.y);
      ctx.lineTo(g.T.x, g.T.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.fill();

      // Angle θ Arc Wedge at Origin O
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.arc(g.cx, g.cy, 36, 0, -pt.angleRad, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.amber;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (showLabels) {
        const halfAng = -pt.angleRad / 2;
        const badgeX = g.cx + 56 * Math.cos(halfAng);
        const badgeY = g.cy + 56 * Math.sin(halfAng);
        drawTextBadge(ctx, `θ = ${pt.angleDeg.toFixed(1)}°`, badgeX, badgeY, PALETTE.amber);
      }

      // Base Leg (cos θ) along X-axis from O to Tx
      ctx.strokeStyle = PALETTE.sky;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(pt.Tx.x, pt.Tx.y);
      ctx.stroke();

      if (showLabels && (state.vis2d?.lengths !== false)) {
        const midTx = (g.cx + pt.Tx.x) / 2;
        const offsetSign = pt.sinVal >= 0 ? 18 : -18;
        drawTextBadge(ctx, `cos θ = ${pt.cosVal.toFixed(2)}`, midTx, g.cy + offsetSign, PALETTE.sky);
      }

      // Altitude Drop (sin θ) from Tx to T
      ctx.strokeStyle = PALETTE.emerald;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(pt.Tx.x, pt.Tx.y);
      ctx.lineTo(g.T.x, g.T.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-angle square at Tx
      const dirX = Math.sign(g.cx - pt.Tx.x) || 1;
      const dirY = Math.sign(g.T.y - pt.Tx.y) || 1;
      const sq = 12;
      ctx.beginPath();
      ctx.moveTo(pt.Tx.x, pt.Tx.y + dirY * sq);
      ctx.lineTo(pt.Tx.x + dirX * sq, pt.Tx.y + dirY * sq);
      ctx.lineTo(pt.Tx.x + dirX * sq, pt.Tx.y);
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (showLabels && (state.vis2d?.lengths !== false)) {
        const midY = (pt.Tx.y + g.T.y) / 2;
        const offX = pt.cosVal >= 0 ? -48 : 48;
        drawTextBadge(ctx, `sin θ = ${pt.sinVal.toFixed(2)}`, pt.Tx.x + offX, midY, PALETTE.emerald);
      }

      // Projection point Tx marker
      if (showPoints) {
        drawLabelledPoint(ctx, pt.Tx, PALETTE.sky, getPointLabel('Tx', pt.Tx.x - g.cx, 0, vis), 8, 14);
      }

      // Tangent Secant Triangle Δ O T Sx & Segment (tan θ)
      if (pt.isSecantFinite && Math.abs(pt.Sx.x - g.cx) < width * 2) {
        // Secant triangle discrete fill
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy);
        ctx.lineTo(g.T.x, g.T.y);
        ctx.lineTo(pt.Sx.x, pt.Sx.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(244, 63, 94, 0.10)';
        ctx.fill();

        // Secant hypotenuse bar along X-axis from O to Sx
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(g.cx, g.cy);
        ctx.lineTo(pt.Sx.x, pt.Sx.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight tangent segment from T to Sx in Rose
        ctx.strokeStyle = PALETTE.rose;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(g.T.x, g.T.y);
        ctx.lineTo(pt.Sx.x, pt.Sx.y);
        ctx.stroke();

        // Secant point Sx marker
        if (showPoints) {
          drawLabelledPoint(ctx, pt.Sx, PALETTE.rose, getPointLabel('Sx', pt.Sx.x - g.cx, 0, vis), 8, 14);
        }

        // Tangent length badge
        if (showLabels && (state.vis2d?.lengths !== false)) {
          const midX = (g.T.x + pt.Sx.x) / 2;
          const midY = (g.T.y + pt.Sx.y) / 2;
          drawTextBadge(ctx, `tan θ = ${pt.tanVal.toFixed(2)}`, midX, midY - 14, PALETTE.rose);
        }
      }
      ctx.restore();
    }

    // 5. Secant chord & triangle shading (optional secondary secant Q)
    if (state.showSecant) {
      if (showArea) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
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
      if (showPoints) {
        ctx.fillText(getPointLabel('Q', g.Q.x - g.cx, -(g.Q.y - g.cy), vis), g.Q.x + 8, g.Q.y - 8);
      }
    }

    // 6. Radii, Tangents, and Right-Angle Markers for each active tangent
    for (const t of g.tangents) {
      // Radius OT
      ctx.strokeStyle = PALETTE.blue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(t.pt.x, t.pt.y);
      ctx.stroke();

      // Tangent Line with sharp arrowheads at both ends (no blobs)
      drawDoubleArrow(ctx, t.T1, t.T2, PALETTE.lime, 3);

      // Right-angle square marker at contact point
      if (showAngles) {
        ctx.strokeStyle = PALETTE.teal;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(t.pt.x, t.pt.y);
        ctx.lineTo(t.rightSquare.c1.x, t.rightSquare.c1.y);
        ctx.lineTo(t.rightSquare.c2.x, t.rightSquare.c2.y);
        ctx.lineTo(t.rightSquare.c3.x, t.rightSquare.c3.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
        ctx.fill();
        ctx.stroke();

        if (showLabels) {
          drawTextBadge(ctx, '90.0°', t.rightSquare.c2.x + 12, t.rightSquare.c2.y + 12, PALETTE.teal);
        }
      }

      // Conjugate Reflex Angle (270°) at contact point
      const showReflex = Boolean(state.vis2d?.reflex);
      if (showReflex) {
        const angRad = Math.atan2(t.rightSquare.c1.y - t.pt.y, t.rightSquare.c1.x - t.pt.x);
        const angTan = Math.atan2(t.rightSquare.c3.y - t.pt.y, t.rightSquare.c3.x - t.pt.x);
        drawReflexWedge(ctx, t.pt, angRad, angTan, 26, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);

        if (showLabels) {
          const rbx = t.pt.x - 2.2 * (t.rightSquare.c2.x - t.pt.x);
          const rby = t.pt.y - 2.2 * (t.rightSquare.c2.y - t.pt.y);
          drawTextBadge(ctx, `${t.name}* = 270.0°`, rbx, rby, PALETTE.cyan);
        }
      }

      // Point Marker & Label
      if (showPoints) {
        drawRadialLabelledPoint(ctx, t.pt, g.O, PALETTE.red, getPointLabel(t.name, t.pt.x - g.cx, -(t.pt.y - g.cy), vis), 20);
      }
    }

    // 7. Center Point O
    if (showPoints) {
      drawLabelledPoint(ctx, g.O, PALETTE.blue, getPointLabel('O', 0, 0, vis), 10, 16);
    }
  }

  exportPNG() {
    const off = document.createElement('canvas');
    off.width = this.width * 2; off.height = this.height * 2;
    const offCtx = off.getContext('2d');
    offCtx.scale(2, 2);
    offCtx.fillStyle = '#121215';
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

  getSVG(width = this.width, height = this.height) {
    return generateSVG(this.state, width, height);
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
