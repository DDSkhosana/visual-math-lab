import { PALETTE } from '../config/palette.js';
import { pointOnCircle, sphericalToCartesian, thalesStats2D } from '../model/thales-math.js';

/** Maps world coordinates (y up) to canvas pixels for the current pan and zoom across projection planes. */
export function computeFrame(state, width, height) {
  const cx = width / 2 + state.pan.x;
  const cy = height / 2 + state.pan.y;
  const r = state.radius * state.zoom;
  const plane = state.plane2D ?? 'great-circle';

  let a, b, p, angle, pCoords, aCoords, bCoords;

  if (plane === 'xy') {
    const p3d = sphericalToCartesian(state.radius, state.lat3D, state.lon3D);
    const px = p3d.x * state.zoom;
    const py = p3d.y * state.zoom;
    a = { x: cx - r, y: cy };
    b = { x: cx + r, y: cy };
    p = { x: cx + px, y: cy - py };
    angle = Math.atan2(p3d.y, p3d.x);
    if (angle < 0) angle += Math.PI * 2;
    pCoords = { x: p3d.x, y: p3d.y };
    aCoords = { x: -state.radius, y: 0 };
    bCoords = { x: state.radius, y: 0 };
  } else if (plane === 'xz') {
    const p3d = sphericalToCartesian(state.radius, state.lat3D, state.lon3D);
    const px = p3d.x * state.zoom;
    const pz = p3d.z * state.zoom;
    a = { x: cx - r, y: cy };
    b = { x: cx + r, y: cy };
    p = { x: cx + px, y: cy - pz };
    angle = Math.atan2(p3d.z, p3d.x);
    if (angle < 0) angle += Math.PI * 2;
    pCoords = { x: p3d.x, y: p3d.z };
    aCoords = { x: -state.radius, y: 0 };
    bCoords = { x: state.radius, y: 0 };
  } else if (plane === 'yz') {
    const p3d = sphericalToCartesian(state.radius, state.lat3D, state.lon3D);
    const pz = p3d.z * state.zoom;
    const py = p3d.y * state.zoom;
    a = { x: cx, y: cy };
    b = { x: cx, y: cy };
    p = { x: cx + pz, y: cy - py };
    angle = Math.atan2(p3d.y, p3d.z);
    if (angle < 0) angle += Math.PI * 2;
    pCoords = { x: p3d.z, y: p3d.y };
    aCoords = { x: 0, y: 0 };
    bCoords = { x: 0, y: 0 };
  } else {
    // 'great-circle'
    const pt = pointOnCircle(r, state.angle2D);
    const ptMath = pointOnCircle(state.radius, state.angle2D);
    a = { x: cx - r, y: cy };
    b = { x: cx + r, y: cy };
    p = { x: cx + pt.x, y: cy - pt.y };
    angle = state.angle2D;
    pCoords = { x: ptMath.x, y: ptMath.y };
    aCoords = { x: -state.radius, y: 0 };
    bCoords = { x: state.radius, y: 0 };
  }

  return {
    width, height, cx, cy, r, plane,
    a, b, p, angle, pCoords, aCoords, bCoords,
  };
}

const line = (ctx, from, to) => { ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); };

function drawGrid(ctx, state, f) {
  const size = 5 * state.zoom;
  const startX = (state.pan.x % size) - size;
  const startY = (state.pan.y % size) - size;
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (state.vis2d.gridX) for (let x = startX; x < f.width; x += size) line(ctx, { x, y: 0 }, { x, y: f.height });
  if (state.vis2d.gridY) for (let y = startY; y < f.height; y += size) line(ctx, { x: 0, y }, { x: f.width, y });
  ctx.stroke();
}

function drawAxes(ctx, state, f) {
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  line(ctx, { x: 0, y: f.cy }, { x: f.width, y: f.cy });
  line(ctx, { x: f.cx, y: f.height }, { x: f.cx, y: 0 });
  ctx.stroke();

  if (state.vis2d.points || state.vis2d.coords) {
    ctx.font = 'bold 12px monospace';
    withShadow(ctx, () => {
      let xLabel = '+X', xColor = PALETTE.amber;
      let yLabel = '+Y', yColor = PALETTE.lime;
      if (f.plane === 'xz') {
        xLabel = '+X'; xColor = PALETTE.amber;
        yLabel = '+Z'; yColor = PALETTE.steel;
      } else if (f.plane === 'yz') {
        xLabel = '+Z'; xColor = PALETTE.steel;
        yLabel = '+Y'; yColor = PALETTE.lime;
      } else if (f.plane === 'great-circle') {
        xLabel = '+X (AB)'; xColor = PALETTE.amber;
        yLabel = '+Y₂D'; yColor = PALETTE.lime;
      }
      ctx.fillStyle = xColor;
      ctx.fillText(xLabel, f.width - (xLabel.length > 2 ? 55 : 25), f.cy - 8);
      ctx.fillStyle = yColor;
      ctx.fillText(yLabel, f.cx + 8, 20);
    });
  }
}

function drawCircleAndRadius(ctx, state, f) {
  ctx.beginPath();
  ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2);
  ctx.strokeStyle = PALETTE.sky;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  line(ctx, { x: f.cx, y: f.cy }, f.p);
  ctx.strokeStyle = PALETTE.indigo;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.vis2d.lengths) {
    ctx.fillStyle = PALETTE.indigo;
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('r', f.cx + (f.p.x - f.cx) / 2 + 6, f.cy + (f.p.y - f.cy) / 2 - 6);
  }
}

function drawDiameter(ctx, f) {
  if (f.plane === 'yz') {
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  line(ctx, f.a, f.b);
  ctx.strokeStyle = PALETTE.red;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawArea(ctx, f) {
  ctx.beginPath();
  ctx.moveTo(f.a.x, f.a.y);
  ctx.lineTo(f.p.x, f.p.y);
  ctx.lineTo(f.b.x, f.b.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
  ctx.fill();

  // Altitude line from P perpendicular to diameter AB (shows height h = |y| and explains quadrant area variation)
  if (Math.abs(f.p.y - f.cy) > 8) {
    ctx.save();
    ctx.strokeStyle = PALETTE.lime;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(f.p.x, f.p.y);
    ctx.lineTo(f.p.x, f.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small right-angle marker at altitude foot
    const signY = f.p.y < f.cy ? -1 : 1;
    const footSize = 8;
    ctx.beginPath();
    ctx.moveTo(f.p.x, f.cy + signY * footSize);
    ctx.lineTo(f.p.x + (f.p.x > f.cx ? -footSize : footSize), f.cy + signY * footSize);
    ctx.lineTo(f.p.x + (f.p.x > f.cx ? -footSize : footSize), f.cy);
    ctx.strokeStyle = PALETTE.lime;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Height label
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = PALETTE.lime;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    const textH = `h = ${Math.abs(f.pCoords.y).toFixed(1)}`;
    const textX = f.p.x + (f.p.x > f.cx ? -footSize - 44 : footSize + 4);
    const textY = (f.p.y + f.cy) / 2 + 3;
    ctx.strokeText(textH, textX, textY);
    ctx.fillText(textH, textX, textY);
    ctx.restore();
  }
}

function drawArrow(ctx, from, to, color, width) {
  const head = 10;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawAngles(ctx, state, f) {
  const lenPA = Math.hypot(f.a.x - f.p.x, f.a.y - f.p.y);
  const lenPB = Math.hypot(f.b.x - f.p.x, f.b.y - f.p.y);
  if (f.plane !== 'yz' && lenPA > 8 && lenPB > 8) {
    const ux = (f.a.x - f.p.x) / lenPA, uy = (f.a.y - f.p.y) / lenPA;
    const vx = (f.b.x - f.p.x) / lenPB, vy = (f.b.y - f.p.y) / lenPB;
    const dot = ux * vx + uy * vy;
    const isRightAngle = Math.abs(dot) < 0.05;
    const size = 16;

    ctx.beginPath();
    ctx.moveTo(f.p.x + ux * size, f.p.y + uy * size);
    ctx.lineTo(f.p.x + ux * size + vx * size, f.p.y + uy * size + vy * size);
    ctx.lineTo(f.p.x + vx * size, f.p.y + vy * size);
    ctx.strokeStyle = PALETTE.teal;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
    ctx.fill();

    const deg = Math.round(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI);
    ctx.fillStyle = PALETTE.teal;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(isRightAngle ? '90°' : `${deg}°`, f.p.x + (ux + vx) * 22 - 10, f.p.y + (uy + vy) * 22 + 4);

    // Euclidean Isosceles base angles alpha and beta (demonstrating why angle P = alpha + beta = 90 deg)
    if (lenPA > 22 && lenPB > 22) {
      const normTheta = ((f.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const isUpper = normTheta <= Math.PI;
      const alphaRad = isUpper ? normTheta / 2 : (Math.PI * 2 - normTheta) / 2;
      const betaRad = Math.PI / 2 - alphaRad;
      const alphaDeg = (alphaRad * 180 / Math.PI).toFixed(0);
      const betaDeg = (betaRad * 180 / Math.PI).toFixed(0);

      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      ctx.lineWidth = 1.2;

      // Base angle alpha at a (lime fill + stroke)
      ctx.beginPath();
      ctx.moveTo(f.a.x, f.a.y);
      const dirPA = Math.atan2(f.p.y - f.a.y, f.p.x - f.a.x);
      ctx.arc(f.a.x, f.a.y, 24, 0, dirPA, f.p.y > f.cy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(132, 204, 22, 0.22)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.lime;
      ctx.stroke();
      ctx.fillStyle = PALETTE.lime;
      ctx.fillText(`α=${alphaDeg}°`, f.a.x + 28 * Math.cos(dirPA / 2) + 2, f.a.y + 28 * Math.sin(dirPA / 2) + (isUpper ? -6 : 14));

      // Base angle beta at b (amber fill + stroke)
      ctx.beginPath();
      ctx.moveTo(f.b.x, f.b.y);
      const dirPB = Math.atan2(f.p.y - f.b.y, f.p.x - f.b.x);
      ctx.arc(f.b.x, f.b.y, 24, Math.PI, dirPB, f.p.y < f.cy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.amber;
      ctx.stroke();
      ctx.fillStyle = PALETTE.amber;
      ctx.fillText(`β=${betaDeg}°`, f.b.x + 30 * Math.cos(Math.PI + (dirPB - Math.PI) / 2) - 18, f.b.y + 30 * Math.sin(Math.PI + (dirPB - Math.PI) / 2) + (isUpper ? -6 : 14));

      ctx.restore();
    }
  }

  const isPhi = f.plane === 'xz';
  const angleColor = isPhi ? PALETTE.fuchsia : PALETTE.yellow;
  const angleFill = isPhi ? 'rgba(217, 70, 239, 0.25)' : 'rgba(234, 179, 8, 0.25)';
  const angleStroke = isPhi ? 'rgba(217, 70, 239, 0.8)' : 'rgba(234, 179, 8, 0.8)';
  const angleLabel = f.plane === 'xz' ? 'φ' : (f.plane === 'yz' ? 'ψ' : 'θ');

  ctx.beginPath();
  ctx.moveTo(f.cx, f.cy);
  ctx.arc(f.cx, f.cy, 26, 0, -f.angle, true);
  ctx.closePath();
  ctx.fillStyle = angleFill;
  ctx.fill();
  ctx.strokeStyle = angleStroke;
  ctx.stroke();

  ctx.fillStyle = angleColor;
  ctx.font = 'italic 13px sans-serif';
  ctx.fillText(angleLabel, f.cx + 33 * Math.cos(-f.angle / 2) - 4, f.cy + 33 * Math.sin(-f.angle / 2) + 4);
}

function drawHover(ctx, f) {
  ctx.beginPath();
  ctx.arc(f.p.x, f.p.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
  ctx.fill();
}

function drawLabelledPoint(ctx, at, color, label, dx = 0, dy = 0, align = null, baseline = null) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (align) ctx.textAlign = align;
  if (baseline) ctx.textBaseline = baseline;
  ctx.font = 'bold 13px monospace';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4.5;
  ctx.strokeText(label, at.x + dx, at.y + dy);
  ctx.fillStyle = color;
  ctx.fillText(label, at.x + dx, at.y + dy);
  ctx.restore();
}

function withShadow(ctx, paint) {
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  paint();
  ctx.shadowBlur = 0;
}

const formatPoint = (x, y) => `(${x.toFixed(1)}, ${y.toFixed(1)})`;

function drawPoints(ctx, state, f) {
  const withCoords = state.vis2d.coords;
  const label = (name, x, y) => (withCoords ? `${name} ${formatPoint(x, y)}` : name);

  if (f.plane === 'yz') {
    drawLabelledPoint(ctx, { x: f.cx, y: f.cy }, PALETTE.red, withCoords ? 'a,b (0,0) ⟂' : 'a,b ⟂', -25, 20);
  } else {
    drawLabelledPoint(ctx, f.a, PALETTE.red, label('a', f.aCoords.x, f.aCoords.y), -16, 0, 'right', 'middle');
    drawLabelledPoint(ctx, f.b, PALETTE.orange, label('b', f.bCoords.x, f.bCoords.y), 16, 0, 'left', 'middle');
    drawLabelledPoint(ctx, { x: f.cx, y: f.cy }, PALETTE.indigo, label('C', 0, 0), -12, 18, 'right', 'top');
  }

  const dpx = f.p.x - f.cx, dpy = f.p.y - f.cy;
  const dplen = Math.hypot(dpx, dpy);
  const upx = dplen > 0.001 ? dpx / dplen : 0;
  const upy = dplen > 0.001 ? dpy / dplen : -1;
  const alignP = upx > 0.35 ? 'left' : (upx < -0.35 ? 'right' : 'center');
  const baseP = upy > 0.35 ? 'top' : (upy < -0.35 ? 'bottom' : 'middle');
  drawLabelledPoint(ctx, f.p, PALETTE.violet, label('P', f.pCoords.x, f.pCoords.y), 18 * upx, 18 * upy, alignP, baseP);
}

function drawLengthLabels(ctx, f) {
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4;

  const renderWithHalo = (text, x, y, color) => {
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  if (f.plane !== 'yz') {
    renderWithHalo('s', f.p.x + (f.a.x - f.p.x) / 2 - 12, f.p.y + (f.a.y - f.p.y) / 2 - 10, PALETTE.blue);
    renderWithHalo('t', f.p.x + (f.b.x - f.p.x) / 2 + 8, f.p.y + (f.b.y - f.p.y) / 2 - 10, PALETTE.orange);
    renderWithHalo('|d| = 2r', f.cx, f.cy - 10, PALETTE.red);
  } else {
    renderWithHalo('s, t', f.p.x + (f.cx - f.p.x) / 2 + 6, f.p.y + (f.cy - f.p.y) / 2 - 6, PALETTE.blue);
    renderWithHalo('|d| ⟂', f.cx + 8, f.cy - 10, PALETTE.red);
  }
  ctx.restore();
}

/** Paints one frame. Layers are drawn back to front. */
export function drawScene(ctx, state, frame) {
  ctx.clearRect(0, 0, frame.width, frame.height);
  drawGrid(ctx, state, frame);
  drawAxes(ctx, state, frame);
  drawCircleAndRadius(ctx, state, frame);
  drawDiameter(ctx, frame);
  if (state.vis2d.area && frame.plane !== 'yz') drawArea(ctx, frame);
  if (frame.plane !== 'yz') {
    drawArrow(ctx, frame.p, frame.a, PALETTE.blue, 3);
    drawArrow(ctx, frame.p, frame.b, PALETTE.orange, 3);
  } else {
    drawArrow(ctx, frame.p, { x: frame.cx, y: frame.cy }, PALETTE.blue, 3);
  }
  if (state.vis2d.angles) drawAngles(ctx, state, frame);
  if (state.hoverP2D) drawHover(ctx, frame);
  if (state.vis2d.points) drawPoints(ctx, state, frame);
  if (state.vis2d.lengths) drawLengthLabels(ctx, frame);
}
