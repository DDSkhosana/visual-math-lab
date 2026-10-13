import { normalizeAngle, toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    angleA: toRadians(210), // bottom-left
    angleB: toRadians(330), // bottom-right
    angleP: toRadians(90),  // top
    showRadii: true,
    showSplit: true,
    showAngles: true,
    showArea: true,
    showCoords: false,
    playing: false,
    activeDrag: null, // 'P' | 'A' | 'B' | null
    ...vis,
  };
}

/**
 * Computes coordinates and angle values for Angle at the Centre.
 */
export function computeGeometry(state, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxSafeRadius = Math.max(50, Math.min(width, height) / 2 - 40);
  const r = Math.min(state.radius, maxSafeRadius);

  // Center O
  const O = { x: cx, y: cy };

  // Points on circle (standard Cartesian with Y down for canvas)
  const A = { x: cx + r * Math.cos(state.angleA), y: cy - r * Math.sin(state.angleA) };
  const B = { x: cx + r * Math.cos(state.angleB), y: cy - r * Math.sin(state.angleB) };
  const P = { x: cx + r * Math.cos(state.angleP), y: cy - r * Math.sin(state.angleP) };

  // Central angle subtended by arc AB
  let centralRad = state.angleB - state.angleA;
  while (centralRad < 0) centralRad += Math.PI * 2;
  while (centralRad >= Math.PI * 2) centralRad -= Math.PI * 2;
  if (centralRad > Math.PI) centralRad = Math.PI * 2 - centralRad;

  // Inscribed angle subtended by arc AB at P
  // Vectors PA and PB
  const vPA = { x: A.x - P.x, y: A.y - P.y };
  const vPB = { x: B.x - P.x, y: B.y - P.y };
  const dotP = vPA.x * vPB.x + vPA.y * vPB.y;
  const magPA = Math.hypot(vPA.x, vPA.y) || 1;
  const magPB = Math.hypot(vPB.x, vPB.y) || 1;
  const cosP = Math.max(-1, Math.min(1, dotP / (magPA * magPB)));
  const inscribedRad = Math.acos(cosP);

  const centralDeg = toDegrees(centralRad);
  const inscribedDeg = toDegrees(inscribedRad);
  const ratio = inscribedDeg > 0.001 ? centralDeg / inscribedDeg : 2.0;

  return {
    cx, cy, r, O, A, B, P,
    centralRad, centralDeg,
    inscribedRad, inscribedDeg,
    ratio,
    arcLength: r * centralRad,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  ${state.showArea !== false ? `<!-- Central sector & Inscribed triangle -->
  <polygon points="${g.O.x},${g.O.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="rgba(234, 179, 8, 0.16)"/>
  <polygon points="${g.P.x},${g.P.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="rgba(34, 197, 94, 0.16)"/>` : ''}
  <!-- Radii OA, OB -->
  <line x1="${g.O.x}" y1="${g.O.y}" x2="${g.A.x}" y2="${g.A.y}" stroke="${PALETTE.indigo}" stroke-width="2.5"/>
  <line x1="${g.O.x}" y1="${g.O.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.indigo}" stroke-width="2.5"/>
  ${state.showSplit ? `<line x1="${g.O.x}" y1="${g.O.y}" x2="${g.P.x}" y2="${g.P.y}" stroke="${PALETTE.lavender}" stroke-width="1.5" stroke-dasharray="4,4"/>` : ''}
  <!-- Inscribed lines PA, PB -->
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.A.x}" y2="${g.A.y}" stroke="${PALETTE.blue}" stroke-width="2.5"/>
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.orange}" stroke-width="2.5"/>
  <!-- Points -->
  <circle cx="${g.O.x}" cy="${g.O.y}" r="5" fill="${PALETTE.indigo}"/>
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.red}"/>
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.orange}"/>
  <circle cx="${g.P.x}" cy="${g.P.y}" r="7" fill="${PALETTE.violet}"/>
  <!-- Text Labels with outward radial clearance -->
  <text x="${g.O.x + 8}" y="${g.O.y + 18}" fill="${PALETTE.indigo}" font-weight="bold">O</text>
  ${(() => {
    const la = getRadialLabelCoords(g.A, g.O, 18);
    const lb = getRadialLabelCoords(g.B, g.O, 18);
    const lp = getRadialLabelCoords(g.P, g.O, 18);
    return `<text x="${la.x}" y="${la.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${la.anchor}" dominant-baseline="${la.baseline}">A</text>
  <text x="${lb.x}" y="${lb.y}" fill="${PALETTE.orange}" font-weight="bold" text-anchor="${lb.anchor}" dominant-baseline="${lb.baseline}">B</text>
  <text x="${lp.x}" y="${lp.y}" fill="${PALETTE.violet}" font-weight="bold" text-anchor="${lp.anchor}" dominant-baseline="${lp.baseline}">P</text>`;
  })()}
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Angle at the Centre Theorem | Visual Mathematics Lab</text>
</svg>`;
}
