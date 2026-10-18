import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    pan: { x: 0, y: 0 },
    angleA: toRadians(140),
    angleB: toRadians(40),
    angleC: toRadians(310),
    angleD: toRadians(230),
    showExterior: true,
    showDiagonals: false,
    showAngles: true,
    showArea: true,
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
  const C = { x: cx + r * Math.cos(state.angleC), y: cy - r * Math.sin(state.angleC) };
  const D = { x: cx + r * Math.cos(state.angleD), y: cy - r * Math.sin(state.angleD) };

  // Helper for angle inside polygon at vertex V between neighbors P1 and P2
  const vertexAngle = (V, P1, P2) => {
    const v1 = { x: P1.x - V.x, y: P1.y - V.y };
    const v2 = { x: P2.x - V.x, y: P2.y - V.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1;
    return toDegrees(Math.acos(Math.max(-1, Math.min(1, dot / mag))));
  };

  const angleADeg = vertexAngle(A, D, B);
  const angleBDeg = vertexAngle(B, A, C);
  const angleCDeg = vertexAngle(C, B, D);
  const angleDDeg = vertexAngle(D, C, A);

  const sumAC = angleADeg + angleCDeg;
  const sumBD = angleBDeg + angleDDeg;

  // Exterior point E extending DC past C
  const dcVec = { x: C.x - D.x, y: C.y - D.y };
  const dcLen = Math.hypot(dcVec.x, dcVec.y) || 1;
  const E = { x: C.x + (dcVec.x / dcLen) * 70, y: C.y + (dcVec.y / dcLen) * 70 };
  const exteriorAngleDeg = vertexAngle(C, B, E);

  return {
    cx, cy, r, O, A, B, C, D, E,
    angleADeg, angleBDeg, angleCDeg, angleDDeg,
    sumAC, sumBD, exteriorAngleDeg,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  <!-- Quadrilateral fill -->
  <polygon points="${g.A.x},${g.A.y} ${g.B.x},${g.B.y} ${g.C.x},${g.C.y} ${g.D.x},${g.D.y}" fill="${state.showArea !== false ? 'rgba(99, 102, 241, 0.15)' : 'none'}" stroke="#6366f1" stroke-width="2.5"/>
  ${state.showExterior ? `<line x1="${g.C.x}" y1="${g.C.y}" x2="${g.E.x}" y2="${g.E.y}" stroke="${PALETTE.rose}" stroke-width="2" stroke-dasharray="4,4"/>` : ''}
  <!-- Vertices -->
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.violet}"/>
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.cyan}"/>
  <circle cx="${g.C.x}" cy="${g.C.y}" r="6" fill="${PALETTE.amber}"/>
  <circle cx="${g.D.x}" cy="${g.D.y}" r="6" fill="${PALETTE.rose}"/>
  <!-- Text Labels with outward radial clearance -->
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const la = getRadialLabelCoords(g.A, center, 18);
    const lb = getRadialLabelCoords(g.B, center, 18);
    const lc = getRadialLabelCoords(g.C, center, 18);
    const ld = getRadialLabelCoords(g.D, center, 18);
    return `<text x="${la.x}" y="${la.y}" fill="${PALETTE.violet}" font-weight="bold" text-anchor="${la.anchor}" dominant-baseline="${la.baseline}">A</text>
  <text x="${lb.x}" y="${lb.y}" fill="${PALETTE.cyan}" font-weight="bold" text-anchor="${lb.anchor}" dominant-baseline="${lb.baseline}">B</text>
  <text x="${lc.x}" y="${lc.y}" fill="${PALETTE.amber}" font-weight="bold" text-anchor="${lc.anchor}" dominant-baseline="${lc.baseline}">C</text>
  <text x="${ld.x}" y="${ld.y}" fill="${PALETTE.rose}" font-weight="bold" text-anchor="${ld.anchor}" dominant-baseline="${ld.baseline}">D</text>`;
  })()}
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Cyclic Quadrilateral Theorem | Visual Mathematics Lab</text>
</svg>`;
}
