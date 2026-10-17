import { PALETTE } from '../config/palette.js';
import { point3DToGreatCircle, pointOnCircle, sphericalToCartesian, thalesStats2D, toDegrees } from '../model/thales-math.js';

/** Maps world coordinates (y up) to canvas pixels for the current pan and zoom across projection planes. */
export function computeFrame(state, width, height) {
  const cx = width / 2 + state.pan.x;
  const cy = height / 2 + state.pan.y;
  const maxSafeRadius = Math.max(40, Math.min(width, height) / 2 - 30);
  const baseZoom = state.zoom || 18;
  const rawR = state.radius * baseZoom;
  const r = Math.min(rawR, maxSafeRadius);
  const zoom = r / (state.radius || 10);
  const plane = state.plane2D ?? 'great-circle';
  const rot = state.baselineRotation || 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  let a, b, p, angle, pCoords, aCoords, bCoords, outOfPlane;
  const p3d = sphericalToCartesian(state.radius, state.lat3D, state.lon3D);

  if (plane === 'xy') {
    const px = p3d.x;
    const py = p3d.y;
    const rx = px * cosR - py * sinR;
    const ry = px * sinR + py * cosR;
    aCoords = { x: -state.radius * cosR, y: -state.radius * sinR };
    bCoords = { x: state.radius * cosR, y: state.radius * sinR };
    pCoords = { x: rx, y: ry };
    a = { x: cx + aCoords.x * zoom, y: cy - aCoords.y * zoom };
    b = { x: cx + bCoords.x * zoom, y: cy - bCoords.y * zoom };
    p = { x: cx + pCoords.x * zoom, y: cy - pCoords.y * zoom };
    angle = Math.atan2(ry, rx);
    if (angle < 0) angle += Math.PI * 2;
    outOfPlane = {
      axis: 'Z',
      val: p3d.z,
      symbol: p3d.z > 0.05 ? '⊙' : (p3d.z < -0.05 ? '⊗' : '—'),
      dirText: p3d.z > 0.05 ? '+Z (toward viewer)' : (p3d.z < -0.05 ? '-Z (into screen)' : 'coplanar'),
      color: PALETTE.steel,
    };
  } else if (plane === 'xz') {
    const px = p3d.x;
    const pz = p3d.z;
    const rx = px * cosR - pz * sinR;
    const rz = px * sinR + pz * cosR;
    aCoords = { x: -state.radius * cosR, y: -state.radius * sinR };
    bCoords = { x: state.radius * cosR, y: state.radius * sinR };
    pCoords = { x: rx, y: rz };
    a = { x: cx + aCoords.x * zoom, y: cy - aCoords.y * zoom };
    b = { x: cx + bCoords.x * zoom, y: cy - bCoords.y * zoom };
    p = { x: cx + pCoords.x * zoom, y: cy - pCoords.y * zoom };
    angle = Math.atan2(rz, rx);
    if (angle < 0) angle += Math.PI * 2;
    outOfPlane = {
      axis: 'Y',
      val: p3d.y,
      symbol: p3d.y > 0.05 ? '⊙' : (p3d.y < -0.05 ? '⊗' : '—'),
      dirText: p3d.y > 0.05 ? '+Y (zenith up)' : (p3d.y < -0.05 ? '-Y (nadir down)' : 'equatorial'),
      color: PALETTE.lime,
    };
  } else if (plane === 'yz') {
    const pz = p3d.z;
    const py = p3d.y;
    aCoords = { x: 0, y: -state.radius * sinR };
    bCoords = { x: 0, y: state.radius * sinR };
    pCoords = { x: pz, y: py };
    a = { x: cx, y: cy - aCoords.y * zoom };
    b = { x: cx, y: cy - bCoords.y * zoom };
    p = { x: cx + pz * zoom, y: cy - py * zoom };
    angle = Math.atan2(py, pz);
    if (angle < 0) angle += Math.PI * 2;
    outOfPlane = {
      axis: 'X',
      val: p3d.x,
      symbol: p3d.x > 0.05 ? '⊙' : (p3d.x < -0.05 ? '⊗' : '—'),
      dirText: p3d.x > 0.05 ? '+X (towards B)' : (p3d.x < -0.05 ? '-X (towards A)' : 'midplane'),
      color: PALETTE.amber,
    };
  } else {
    // 'great-circle'
    const ptMath = pointOnCircle(state.radius, state.angle2D);
    const rx = ptMath.x * cosR - ptMath.y * sinR;
    const ry = ptMath.x * sinR + ptMath.y * cosR;
    aCoords = { x: -state.radius * cosR, y: -state.radius * sinR };
    bCoords = { x: state.radius * cosR, y: state.radius * sinR };
    pCoords = { x: rx, y: ry };
    a = { x: cx + aCoords.x * zoom, y: cy - aCoords.y * zoom };
    b = { x: cx + bCoords.x * zoom, y: cy - bCoords.y * zoom };
    p = { x: cx + pCoords.x * zoom, y: cy - pCoords.y * zoom };
    angle = state.angle2D;
    const { psi } = point3DToGreatCircle(p3d, state.radius);
    const psiDeg = (psi * 180) / Math.PI;
    outOfPlane = {
      axis: 'ψ',
      val: psiDeg,
      symbol: Math.abs(psiDeg) > 0.5 ? '⟂' : '—',
      dirText: Math.abs(psiDeg) > 0.5 ? `tilt ${psiDeg.toFixed(1)}°` : 'equatorial',
      color: PALETTE.magenta,
    };
  }

  const lenS = Math.hypot(p.x - a.x, p.y - a.y) / (zoom || 1);
  const lenT = Math.hypot(p.x - b.x, p.y - b.y) / (zoom || 1);
  const lenD = Math.hypot(b.x - a.x, b.y - a.y) / (zoom || 1);
  const lenR = Math.hypot(p.x - cx, p.y - cy) / (zoom || 1);

  return {
    width, height, cx, cy, r, plane, baselineRotation: rot, zoom: zoom,
    a, b, p, angle, pCoords, aCoords, bCoords,
    lenS, lenT, lenD, lenR, outOfPlane,
  };
}

const line = (ctx, from, to) => { ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); };

function drawGrid(ctx, state, f) {
  const size = 5 * (f.zoom || state.zoom);
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
      let yLabel = '+Y', yColor = PALETTE.emerald;
      if (f.plane === 'xz') {
        xLabel = '+X'; xColor = PALETTE.amber;
        yLabel = '+Z'; yColor = PALETTE.steel;
      } else if (f.plane === 'yz') {
        xLabel = '+Z'; xColor = PALETTE.steel;
        yLabel = '+Y'; yColor = PALETTE.emerald;
      } else if (f.plane === 'great-circle') {
        const isVert = Math.abs(Math.sin(f.baselineRotation || 0)) > 0.5;
        xLabel = isVert ? '+X (⟂)' : '+X (AB)'; xColor = PALETTE.amber;
        yLabel = isVert ? '+Y (AB)' : '+Y₂D'; yColor = PALETTE.emerald;
      }
      ctx.fillStyle = xColor;
      ctx.fillText(xLabel, f.width - (xLabel.length > 2 ? 55 : 25), f.cy - 8);
      ctx.fillStyle = yColor;
      ctx.fillText(yLabel, f.cx + 8, 20);
    });
  }
}

function drawQuadrantOverlay(ctx, state, f) {
  if (f.plane === 'yz') return;
  const px = f.pCoords.x;
  const py = f.pCoords.y;
  const activeQ = py >= 0 ? (px >= 0 ? 1 : 2) : (px < 0 ? 3 : 4);

  // Subtle Roman Numerals in each quadrant at radius 0.82r
  const qr = f.r * 0.82;
  const quads = [
    { num: 'I', q: 1, x: f.cx + qr * 0.707, y: f.cy - qr * 0.707 },
    { num: 'II', q: 2, x: f.cx - qr * 0.707, y: f.cy - qr * 0.707 },
    { num: 'III', q: 3, x: f.cx - qr * 0.707, y: f.cy + qr * 0.707 },
    { num: 'IV', q: 4, x: f.cx + qr * 0.707, y: f.cy + qr * 0.707 },
  ];

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const q of quads) {
    const isActive = q.q === activeQ;
    if (isActive) {
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = PALETTE.yellow;
      ctx.shadowColor = 'rgba(234, 179, 8, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(q.num, q.x, q.y);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.fillText(q.num, q.x, q.y);
    }
  }

  // Active projection plane & quadrant corner pill watermark with out-of-plane frame dimension
  if (state.vis2d.points || state.vis2d.coords) {
    const planeName = f.plane === 'xy' ? 'XY Plane (Z=0)' : (f.plane === 'xz' ? 'XZ Plane (Y=0)' : (f.plane === 'yz' ? 'YZ Plane (X=0)' : 'Great Circle Section'));
    const qLabel = `Quadrant ${['I', 'II', 'III', 'IV'][activeQ - 1]} (${px >= 0 ? '+X' : '-X'}, ${py >= 0 ? '+Y' : '-Y'})`;
    const oopLabel = f.outOfPlane ? ` | ⟂ ${f.outOfPlane.axis}: ${f.outOfPlane.symbol} ${f.outOfPlane.val > 0 ? '+' : ''}${f.outOfPlane.val.toFixed(1)} (${f.outOfPlane.dirText})` : '';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.fillText(`${planeName} | ${qLabel}${oopLabel}`, 12, f.height - 10);
  }
  ctx.restore();
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

  const showLabels = state.vis2d.points !== false && state.vis2d.labels !== false;
  if (state.vis2d.lengths && showLabels) {
    ctx.fillStyle = PALETTE.indigo;
    ctx.font = 'bold 12px monospace';
    const rLabel = f.plane === 'great-circle' ? `r=${state.radius.toFixed(1)}` : `r=${f.lenR.toFixed(1)}`;
    ctx.fillText(rLabel, f.cx + (f.p.x - f.cx) / 2 + 6, f.cy + (f.p.y - f.cy) / 2 - 6);
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

function drawArea(ctx, state, f) {
  ctx.beginPath();
  ctx.moveTo(f.a.x, f.a.y);
  ctx.lineTo(f.p.x, f.p.y);
  ctx.lineTo(f.b.x, f.b.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
  ctx.fill();

  // Altitude line from P perpendicular to diameter AB (shows height h and explains quadrant area variation)
  const dxAB = f.b.x - f.a.x;
  const dyAB = f.b.y - f.a.y;
  const lenAB = Math.hypot(dxAB, dyAB);
  if (lenAB > 1e-4) {
    const uxAB = dxAB / lenAB;
    const uyAB = dyAB / lenAB;
    const dxAP = f.p.x - f.a.x;
    const dyAP = f.p.y - f.a.y;
    const t = dxAP * uxAB + dyAP * uyAB;
    const footX = f.a.x + t * uxAB;
    const footY = f.a.y + t * uyAB;
    const hx = f.p.x - footX;
    const hy = f.p.y - footY;
    const hLen = Math.hypot(hx, hy);

    if (hLen > 6) {
      ctx.save();
      ctx.strokeStyle = PALETTE.lime;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(f.p.x, f.p.y);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small right-angle marker at altitude foot
      const uhX = hx / hLen;
      const uhY = hy / hLen;
      const footSize = 8;
      const dirAlongAB = t >= lenAB / 2 ? -1 : 1;
      const c1x = footX + uhX * footSize;
      const c1y = footY + uhY * footSize;
      const c2x = c1x + uxAB * footSize * dirAlongAB;
      const c2y = c1y + uyAB * footSize * dirAlongAB;
      const c3x = footX + uxAB * footSize * dirAlongAB;
      const c3y = footY + uyAB * footSize * dirAlongAB;

      ctx.beginPath();
      ctx.moveTo(c1x, c1y);
      ctx.lineTo(c2x, c2y);
      ctx.lineTo(c3x, c3y);
      ctx.strokeStyle = PALETTE.lime;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Height label
      const showLabels = state.vis2d.points !== false && state.vis2d.labels !== false;
      if (showLabels) {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = PALETTE.lime;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
        const textH = `h = ${(hLen / (f.zoom || 1)).toFixed(1)}`;
        const midH = { x: (f.p.x + footX) / 2, y: (f.p.y + footY) / 2 };
        const offsetNorm = { x: -uhY * 12, y: uhX * 12 };
        ctx.strokeText(textH, midH.x + offsetNorm.x - 14, midH.y + offsetNorm.y + 4);
        ctx.fillText(textH, midH.x + offsetNorm.x - 14, midH.y + offsetNorm.y + 4);
      }
      ctx.restore();
    }
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
  const showLabels = state.vis2d.points !== false && state.vis2d.labels !== false;

  const lenPA = Math.hypot(f.a.x - f.p.x, f.a.y - f.p.y);
  const lenPB = Math.hypot(f.b.x - f.p.x, f.b.y - f.p.y);
  if (f.plane !== 'yz' && lenPA > 8 && lenPB > 8) {
    const ux = (f.a.x - f.p.x) / lenPA, uy = (f.a.y - f.p.y) / lenPA;
    const vx = (f.b.x - f.p.x) / lenPB, vy = (f.b.y - f.p.y) / lenPB;
    const dot = ux * vx + uy * vy;
    const isRightAngle = Math.abs(dot) < 0.05;
    const size = 16;

    if (state.vis2d.angles) {
      ctx.beginPath();
      ctx.moveTo(f.p.x + ux * size, f.p.y + uy * size);
      ctx.lineTo(f.p.x + ux * size + vx * size, f.p.y + uy * size + vy * size);
      ctx.lineTo(f.p.x + vx * size, f.p.y + vy * size);
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.25)';
      ctx.fill();

      if (showLabels) {
        const deg = Math.round(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI);
        ctx.fillStyle = PALETTE.teal;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(isRightAngle ? '90°' : `${deg}°`, f.p.x + (ux + vx) * 22 - 10, f.p.y + (uy + vy) * 22 + 4);
      }
    }

    if (state.vis2d.reflex) {
      // 270° reflex angle around the outside of vertex P
      const angPA = Math.atan2(uy, ux);
      const angPB = Math.atan2(vy, vx);
      const cross = ux * vy - uy * vx;
      ctx.beginPath();
      ctx.moveTo(f.p.x, f.p.y);
      ctx.arc(f.p.x, f.p.y, 18, angPA, angPB, cross > 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.12)';
      ctx.fill();
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      if (showLabels) {
        const bLenP = Math.hypot(ux + vx, uy + vy) || 1;
        ctx.fillStyle = PALETTE.teal;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('270°', f.p.x - 30 * ((ux + vx) / bLenP) - 10, f.p.y - 30 * ((uy + vy) / bLenP) + 4);
      }
    }

    // Base angles alpha and beta (interior acute + exterior reflex conjugate)
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

      const baseAB = Math.atan2(f.b.y - f.a.y, f.b.x - f.a.x);
      const uxAB = Math.cos(baseAB), uyAB = Math.sin(baseAB);
      const dirPA = Math.atan2(f.p.y - f.a.y, f.p.x - f.a.x);
      const uxA = (f.p.x - f.a.x) / lenPA, uyA = (f.p.y - f.a.y) / lenPA;
      const bxA = uxAB + uxA, byA = uyAB + uyA;
      const bLenA = Math.hypot(bxA, byA) || 1;
      const crossA = uxAB * uyA - uyAB * uxA;

      const baseBA = Math.atan2(f.a.y - f.b.y, f.a.x - f.b.x);
      const uxBA = Math.cos(baseBA), uyBA = Math.sin(baseBA);
      const dirPB = Math.atan2(f.p.y - f.b.y, f.p.x - f.b.x);
      const uxB = (f.p.x - f.b.x) / lenPB, uyB = (f.p.y - f.b.y) / lenPB;
      const bxB = uxBA + uxB, byB = uyBA + uyB;
      const bLenB = Math.hypot(bxB, byB) || 1;
      const crossB = uxBA * uyB - uyBA * uxB;

      if (state.vis2d.angles) {
        // Base angle alpha at A (interior lime fill + stroke)
        ctx.beginPath();
        ctx.moveTo(f.a.x, f.a.y);
        ctx.arc(f.a.x, f.a.y, 24, baseAB, dirPA, crossA < 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(132, 204, 22, 0.22)';
        ctx.fill();
        ctx.strokeStyle = PALETTE.lime;
        ctx.stroke();
        if (showLabels) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillStyle = PALETTE.lime;
          const lx = f.a.x + 34 * (bxA / bLenA);
          const ly = f.a.y + 34 * (byA / bLenA);
          ctx.strokeText('α', lx, ly - 6);
          ctx.fillText('α', lx, ly - 6);
          ctx.strokeText(`${alphaDeg}°`, lx, ly + 7);
          ctx.fillText(`${alphaDeg}°`, lx, ly + 7);
          ctx.restore();
        }

        // Base angle beta at B (interior orange fill + stroke)
        ctx.beginPath();
        ctx.moveTo(f.b.x, f.b.y);
        ctx.arc(f.b.x, f.b.y, 24, baseBA, dirPB, crossB < 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.22)';
        ctx.fill();
        ctx.strokeStyle = PALETTE.orange;
        ctx.stroke();
        if (showLabels) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillStyle = PALETTE.orange;
          const lx = f.b.x + 34 * (bxB / bLenB);
          const ly = f.b.y + 34 * (byB / bLenB);
          ctx.strokeText('β', lx, ly - 6);
          ctx.fillText('β', lx, ly - 6);
          ctx.strokeText(`${betaDeg}°`, lx, ly + 7);
          ctx.fillText(`${betaDeg}°`, lx, ly + 7);
          ctx.restore();
        }
      }

      if (state.vis2d.reflex) {
        // Reflex angle alpha* at A (exterior lime dashed arc + label)
        ctx.beginPath();
        ctx.moveTo(f.a.x, f.a.y);
        ctx.arc(f.a.x, f.a.y, 22, baseAB, dirPA, crossA > 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(132, 204, 22, 0.12)';
        ctx.fill();
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = PALETTE.lime;
        ctx.stroke();
        ctx.restore();

        const alphaReflexDeg = (360 - Number(alphaDeg)).toFixed(0);
        if (showLabels) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillStyle = PALETTE.lime;
          const lx = f.a.x - 36 * (bxA / bLenA);
          const ly = f.a.y - 36 * (byA / bLenA);
          ctx.strokeText('α*', lx, ly - 6);
          ctx.fillText('α*', lx, ly - 6);
          ctx.strokeText(`${alphaReflexDeg}°`, lx, ly + 7);
          ctx.fillText(`${alphaReflexDeg}°`, lx, ly + 7);
          ctx.restore();
        }

        // Reflex angle beta* at B (exterior orange dashed arc + label)
        ctx.beginPath();
        ctx.moveTo(f.b.x, f.b.y);
        ctx.arc(f.b.x, f.b.y, 22, baseBA, dirPB, crossB > 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
        ctx.fill();
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = PALETTE.orange;
        ctx.stroke();
        ctx.restore();

        const betaReflexDeg = (360 - Number(betaDeg)).toFixed(0);
        if (showLabels) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillStyle = PALETTE.orange;
          const lx = f.b.x - 36 * (bxB / bLenB);
          const ly = f.b.y - 36 * (byB / bLenB);
          ctx.strokeText('β*', lx, ly - 6);
          ctx.fillText('β*', lx, ly - 6);
          ctx.strokeText(`${betaReflexDeg}°`, lx, ly + 7);
          ctx.fillText(`${betaReflexDeg}°`, lx, ly + 7);
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  const isPhi = f.plane === 'xz';
  const angleColor = isPhi ? PALETTE.fuchsia : PALETTE.yellow;
  const angleFill = isPhi ? 'rgba(217, 70, 239, 0.25)' : 'rgba(234, 179, 8, 0.25)';
  const angleStroke = isPhi ? 'rgba(217, 70, 239, 0.8)' : 'rgba(234, 179, 8, 0.8)';
  const angleLabel = f.plane === 'xz' ? 'φ' : (f.plane === 'yz' ? 'ψ' : 'θ');

  const baseO = Math.atan2(f.b.y - f.cy, f.b.x - f.cx);
  const dirOP = Math.atan2(f.p.y - f.cy, f.p.x - f.cx);
  const uOBx = Math.cos(baseO), uOBy = Math.sin(baseO);
  const uOPx = Math.cos(dirOP), uOPy = Math.sin(dirOP);
  const crossO = uOBx * uOPy - uOBy * uOPx;
  const angO = Math.acos(Math.max(-1, Math.min(1, uOBx * uOPx + uOBy * uOPy)));

  if (state.vis2d.angles) {
    ctx.beginPath();
    ctx.moveTo(f.cx, f.cy);
    ctx.arc(f.cx, f.cy, 26, baseO, dirOP, crossO < 0);
    ctx.closePath();
    ctx.fillStyle = angleFill;
    ctx.fill();
    ctx.strokeStyle = angleStroke;
    ctx.stroke();

    if (showLabels) {
      const midAngle = baseO + (crossO < 0 ? -1 : 1) * (angO / 2);
      const angODeg = Math.round(toDegrees(angO));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillStyle = angleColor;
      ctx.font = 'italic bold 12px sans-serif';
      const lx = f.cx + 34 * Math.cos(midAngle);
      const ly = f.cy + 34 * Math.sin(midAngle);
      ctx.strokeText(angleLabel, lx, ly - 6);
      ctx.fillText(angleLabel, lx, ly - 6);
      ctx.strokeText(`${angODeg}°`, lx, ly + 7);
      ctx.fillText(`${angODeg}°`, lx, ly + 7);
      ctx.restore();
    }
  }

  if (state.vis2d.reflex) {
    ctx.beginPath();
    ctx.moveTo(f.cx, f.cy);
    ctx.arc(f.cx, f.cy, 36, baseO, dirOP, crossO > 0);
    ctx.closePath();
    ctx.fillStyle = isPhi ? 'rgba(217, 70, 239, 0.12)' : 'rgba(234, 179, 8, 0.12)';
    ctx.fill();
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = angleStroke;
    ctx.stroke();
    ctx.restore();

    if (showLabels) {
      const reflexDeg = Math.round(360 - toDegrees(angO));
      const midReflex = baseO + (crossO < 0 ? 1 : -1) * ((Math.PI * 2 - angO) / 2);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillStyle = angleColor;
      ctx.font = 'italic bold 11px sans-serif';
      const lx = f.cx + 46 * Math.cos(midReflex);
      const ly = f.cy + 46 * Math.sin(midReflex);
      ctx.strokeText(`${angleLabel}*`, lx, ly - 6);
      ctx.fillText(`${angleLabel}*`, lx, ly - 6);
      ctx.strokeText(`${reflexDeg}°`, lx, ly + 7);
      ctx.fillText(`${reflexDeg}°`, lx, ly + 7);
      ctx.restore();
    }
  }
}

function drawHover(ctx, f, state) {
  if (state.hoverP2D) {
    ctx.beginPath();
    ctx.arc(f.p.x, f.p.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.fill();
  }
  if (state.hoverA2D && f.plane !== 'yz') {
    ctx.beginPath();
    ctx.arc(f.a.x, f.a.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
  }
  if (state.hoverB2D && f.plane !== 'yz') {
    ctx.beginPath();
    ctx.arc(f.b.x, f.b.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.fill();
  }
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
  const showLabels = state.vis2d.points !== false && state.vis2d.labels !== false;
  const withCoords = state.vis2d.coords;
  const label = (name, x, y) => (showLabels ? (withCoords ? `${name} ${formatPoint(x, y)}` : name) : (withCoords ? formatPoint(x, y) : ''));

  if (f.plane === 'yz') {
    drawLabelledPoint(ctx, { x: f.cx, y: f.cy }, PALETTE.red, showLabels ? (withCoords ? 'A,B (0,0) ⟂' : 'A,B ⟂') : (withCoords ? '(0,0) ⟂' : ''), -25, 20);
  } else {
    drawLabelledPoint(ctx, f.a, PALETTE.red, label('A', f.aCoords.x, f.aCoords.y), -16, 0, 'right', 'middle');
    drawLabelledPoint(ctx, f.b, PALETTE.orange, label('B', f.bCoords.x, f.bCoords.y), 16, 0, 'left', 'middle');
    drawLabelledPoint(ctx, { x: f.cx, y: f.cy }, PALETTE.indigo, label('O', 0, 0), -12, 18, 'right', 'top');
  }

  const dpx = f.p.x - f.cx, dpy = f.p.y - f.cy;
  const dplen = Math.hypot(dpx, dpy);
  const upx = dplen > 0.001 ? dpx / dplen : 0;
  const upy = dplen > 0.001 ? dpy / dplen : -1;
  const alignP = upx > 0.35 ? 'left' : (upx < -0.35 ? 'right' : 'center');
  const baseP = upy > 0.35 ? 'top' : (upy < -0.35 ? 'bottom' : 'middle');
  drawLabelledPoint(ctx, f.p, PALETTE.violet, label('P', f.pCoords.x, f.pCoords.y), 18 * upx, 18 * upy, alignP, baseP);

  // If point P has an out-of-plane component in current reference plane, show its 3D depth direction & magnitude
  if (state.vis2d.coords && f.outOfPlane && Math.abs(f.outOfPlane.val) > 0.05) {
    ctx.save();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = f.outOfPlane.color;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.lineWidth = 3;
    const oopText = `${f.outOfPlane.symbol} ${f.outOfPlane.axis}=${f.outOfPlane.val > 0 ? '+' : ''}${f.outOfPlane.val.toFixed(1)}`;
    ctx.strokeText(oopText, f.p.x + 20 * upx, f.p.y + 20 * upy + 14);
    ctx.fillText(oopText, f.p.x + 20 * upx, f.p.y + 20 * upy + 14);
    ctx.restore();
  }
}

function drawLengthLabels(ctx, f, state) {
  const showLabels = state?.vis2d?.points !== false && state?.vis2d?.labels !== false;
  if (!showLabels) return;
  ctx.save();
  ctx.font = 'bold 12px monospace';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 4;

  const renderWithHalo = (text, x, y, color) => {
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };

  const sText = `s=${f.lenS.toFixed(1)}`;
  const tText = `t=${f.lenT.toFixed(1)}`;

  if (f.plane !== 'yz') {
    renderWithHalo(sText, f.p.x + (f.a.x - f.p.x) / 2 - 20, f.p.y + (f.a.y - f.p.y) / 2 - 10, PALETTE.blue);
    renderWithHalo(tText, f.p.x + (f.b.x - f.p.x) / 2 + 10, f.p.y + (f.b.y - f.p.y) / 2 - 10, PALETTE.orange);
    renderWithHalo(`|d|=${f.lenD.toFixed(1)}`, f.cx - 24, f.cy - 10, PALETTE.red);
  } else {
    renderWithHalo(`s,t=${f.lenS.toFixed(1)}`, f.p.x + (f.cx - f.p.x) / 2 + 6, f.p.y + (f.cy - f.p.y) / 2 - 6, PALETTE.blue);
    renderWithHalo(`|d|⟂=${f.lenD.toFixed(1)}`, f.cx + 8, f.cy - 10, PALETTE.red);
  }
  ctx.restore();
}

/** Paints one frame. Layers are drawn back to front. */
export function drawScene(ctx, state, frame) {
  ctx.clearRect(0, 0, frame.width, frame.height);
  drawGrid(ctx, state, frame);
  drawAxes(ctx, state, frame);
  drawQuadrantOverlay(ctx, state, frame);
  drawCircleAndRadius(ctx, state, frame);
  drawDiameter(ctx, frame);
  if (state.vis2d.area && frame.plane !== 'yz') drawArea(ctx, state, frame);
  if (frame.plane !== 'yz') {
    drawArrow(ctx, frame.p, frame.a, PALETTE.blue, 3);
    drawArrow(ctx, frame.p, frame.b, PALETTE.orange, 3);
  } else {
    drawArrow(ctx, frame.p, { x: frame.cx, y: frame.cy }, PALETTE.blue, 3);
  }
  if (state.vis2d.angles || state.vis2d.reflex) drawAngles(ctx, state, frame);
  if (state.hoverP2D || state.hoverA2D || state.hoverB2D) drawHover(ctx, frame, state);
  if (state.vis2d.points) drawPoints(ctx, state, frame);
  if (state.vis2d.lengths) drawLengthLabels(ctx, frame, state);
}
