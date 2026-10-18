import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    pan: { x: 0, y: 0 },
    angleA: toRadians(210),
    angleB: toRadians(330),
    angleP1: toRadians(120),
    angleP2: toRadians(60),
    showCenter: true,
    showShading: true,
    showArea: true,
    showAngles: true,
    playing: false,
    ...vis,
  };
}

export function computeGeometry(state, width, height) {
  const pan = state.pan || { x: 0, y: 0 };
  const cx = width / 2 + (pan.x || 0);
  const cy = height / 2 + (pan.y || 0);
  const maxSafeRadius = Math.max(50, Math.min(width, height) / 2 - 40);
  const r = Math.min(state.radius, maxSafeRadius);

  const O = { x: cx, y: cy };
  const A = { x: cx + r * Math.cos(state.angleA), y: cy - r * Math.sin(state.angleA) };
  const B = { x: cx + r * Math.cos(state.angleB), y: cy - r * Math.sin(state.angleB) };
  const P1 = { x: cx + r * Math.cos(state.angleP1), y: cy - r * Math.sin(state.angleP1) };
  const P2 = { x: cx + r * Math.cos(state.angleP2), y: cy - r * Math.sin(state.angleP2) };

  const angleAtVertex = (V, P_A, P_B) => {
    const v1 = { x: P_A.x - V.x, y: P_A.y - V.y };
    const v2 = { x: P_B.x - V.x, y: P_B.y - V.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
  };

  const angleP1Rad = angleAtVertex(P1, A, B);
  const angleP2Rad = angleAtVertex(P2, A, B);
  const angleP1Deg = toDegrees(angleP1Rad);
  const angleP2Deg = toDegrees(angleP2Rad);

  // Central angle
  let centralRad = state.angleB - state.angleA;
  while (centralRad < 0) centralRad += Math.PI * 2;
  while (centralRad >= Math.PI * 2) centralRad -= Math.PI * 2;
  if (centralRad > Math.PI) centralRad = Math.PI * 2 - centralRad;
  const centralDeg = toDegrees(centralRad);

  return {
    cx, cy, r, O, A, B, P1, P2,
    angleP1Rad, angleP1Deg,
    angleP2Rad, angleP2Deg,
    centralRad, centralDeg,
    diffDeg: Math.abs(angleP1Deg - angleP2Deg),
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  <!-- Triangles -->
  <polygon points="${g.P1.x},${g.P1.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="rgba(59, 130, 246, 0.15)"/>
  <polygon points="${g.P2.x},${g.P2.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="rgba(16, 185, 129, 0.15)"/>
  <!-- Base chord AB -->
  <line x1="${g.A.x}" y1="${g.A.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.red}" stroke-width="3"/>
  <!-- P1 lines -->
  <line x1="${g.P1.x}" y1="${g.P1.y}" x2="${g.A.x}" y2="${g.A.y}" stroke="${PALETTE.blue}" stroke-width="2"/>
  <line x1="${g.P1.x}" y1="${g.P1.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.blue}" stroke-width="2"/>
  <!-- P2 lines -->
  <line x1="${g.P2.x}" y1="${g.P2.y}" x2="${g.A.x}" y2="${g.A.y}" stroke="${PALETTE.emerald}" stroke-width="2"/>
  <line x1="${g.P2.x}" y1="${g.P2.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.emerald}" stroke-width="2"/>
  <!-- Points -->
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.red}"/>
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.red}"/>
  <circle cx="${g.P1.x}" cy="${g.P1.y}" r="7" fill="${PALETTE.blue}"/>
  <circle cx="${g.P2.x}" cy="${g.P2.y}" r="7" fill="${PALETTE.emerald}"/>
  <!-- Text Labels with outward radial clearance -->
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const la = getRadialLabelCoords(g.A, center, 18);
    const lb = getRadialLabelCoords(g.B, center, 18);
    const lp1 = getRadialLabelCoords(g.P1, center, 18);
    const lp2 = getRadialLabelCoords(g.P2, center, 18);
    return `<text x="${la.x}" y="${la.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${la.anchor}" dominant-baseline="${la.baseline}">A</text>
  <text x="${lb.x}" y="${lb.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${lb.anchor}" dominant-baseline="${lb.baseline}">B</text>
  <text x="${lp1.x}" y="${lp1.y}" fill="${PALETTE.blue}" font-weight="bold" text-anchor="${lp1.anchor}" dominant-baseline="${lp1.baseline}">P₁</text>
  <text x="${lp2.x}" y="${lp2.y}" fill="${PALETTE.emerald}" font-weight="bold" text-anchor="${lp2.anchor}" dominant-baseline="${lp2.baseline}">P₂</text>`;
  })()}
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Angles in Same Segment Theorem | Visual Mathematics Lab</text>
</svg>`;
}
