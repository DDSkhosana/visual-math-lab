import { PALETTE, draw2DCartesianGrid, drawLabelledPoint, drawRadialLabelledPoint, drawTextBadge, drawDoubleArrow, withShadow, drawReflexWedge, getPointLabel } from '../../../js/circle-core.js';
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

    const showArea = (state.vis2d?.area !== false) && (state.showArea !== false);
    const showQuadrant = (state.showQuadrant !== false) && (state.vis2d?.quadrant !== false);
    const showAngles = (state.vis2d?.angles !== false);
    const showLabels = (state.vis2d?.labels !== false);
    const showPoints = (state.vis2d?.points !== false);
    const vis = state.vis2d || {};

    // 1. Dynamic Quadrant Shading
    if (showQuadrant) {
      const q = g.quadrant;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.arc(g.cx, g.cy, g.r, -q.startAngle, -q.endAngle, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle Roman Numerals in each quadrant
      const qr = g.r * 0.78;
      const quads = [
        { num: 'I', q: 0, x: g.cx + qr * 0.707, y: g.cy - qr * 0.707 },
        { num: 'II', q: 1, x: g.cx - qr * 0.707, y: g.cy - qr * 0.707 },
        { num: 'III', q: 2, x: g.cx - qr * 0.707, y: g.cy + qr * 0.707 },
        { num: 'IV', q: 3, x: g.cx + qr * 0.707, y: g.cy + qr * 0.707 },
      ];

      if (showLabels) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const item of quads) {
          if (item.q === q.index) {
            ctx.font = 'bold 15px sans-serif';
            ctx.fillStyle = PALETTE.yellow;
            ctx.shadowColor = 'rgba(234, 179, 8, 0.6)';
            ctx.shadowBlur = 8;
            ctx.fillText(item.num, item.x, item.y);
            ctx.shadowBlur = 0;
          } else {
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.fillText(item.num, item.x, item.y);
          }
        }

        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
        ctx.fillText(`Active: ${q.label}`, 12, height - 10);
      }
      ctx.restore();
    }

    // 2. Dynamic Shading of Areas Subtended Between Chords Connecting Tangents
    if (g.chords && g.chords.length > 0) {
      const showChords = (state.vis2d?.chords !== false);
      for (const c of g.chords) {
        // Area shading
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

        // Chord connecting adjacent tangent contact points
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

        // Area badge
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

    // 4. Secant chord & triangle shading (optional)
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
      if (showPoints) {
        ctx.fillText(getPointLabel('Q', g.Q.x - g.cx, -(g.Q.y - g.cy), vis), g.Q.x + 8, g.Q.y - 8);
      }
    }

    // 5. Radii, Tangents, and Right-Angle Markers for each active tangent
    for (const t of g.tangents) {
      // Radius OT
      ctx.strokeStyle = PALETTE.blue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.O.x, g.O.y); ctx.lineTo(t.pt.x, t.pt.y);
      ctx.stroke();

      // Tangent Line with sharp arrowheads at both ends (no blobs)
      drawDoubleArrow(ctx, t.T1, t.T2, PALETTE.emerald, 3);

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
          drawTextBadge(ctx, '90°', t.rightSquare.c2.x + 8, t.rightSquare.c2.y + 8, PALETTE.teal);
        }
      }

      // Conjugate Reflex Angle (270°) at contact point
      const showReflex = Boolean(state.vis2d?.reflex);
      if (showReflex) {
        const angRad = Math.atan2(t.rightSquare.c1.y - t.pt.y, t.rightSquare.c1.x - t.pt.x);
        const angTan = Math.atan2(t.rightSquare.c3.y - t.pt.y, t.rightSquare.c3.x - t.pt.x);
        drawReflexWedge(ctx, t.pt, angRad, angTan, 26, 'rgba(20, 184, 166, 0.18)', PALETTE.teal);

        if (showLabels) {
          const rbx = t.pt.x - 1.8 * (t.rightSquare.c2.x - t.pt.x);
          const rby = t.pt.y - 1.8 * (t.rightSquare.c2.y - t.pt.y);
          drawTextBadge(ctx, `${t.name}* = 270°`, rbx, rby, PALETTE.teal);
        }
      }

      // Point Marker & Label
      if (showPoints) {
        drawRadialLabelledPoint(ctx, t.pt, g.O, PALETTE.red, getPointLabel(t.name, t.pt.x - g.cx, -(t.pt.y - g.cy), vis), 20);
      }
    }

    // 6. Center Point O
    if (showPoints) {
      drawLabelledPoint(ctx, g.O, PALETTE.blue, getPointLabel('O', 0, 0, vis), 10, 16);
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
