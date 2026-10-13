import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    angleT: toRadians(270), // bottom contact
    angleA: toRadians(150), // upper-left
    angleB: toRadians(40),  // upper-right
    showProofConstruction: true,
    showArea: true,
    showAngles: true,
    playing: false,
    ...vis,
  };
}

export function computeGeometry(state, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxSafeRadius = Math.max(50, Math.min(width, height) / 2 - 40);
  const r = Math.min(state.radius, maxSafeRadius);

  const O = { x: cx, y: cy };
  const T = { x: cx + r * Math.cos(state.angleT), y: cy - r * Math.sin(state.angleT) };
  const A = { x: cx + r * Math.cos(state.angleA), y: cy - r * Math.sin(state.angleA) };
  const B = { x: cx + r * Math.cos(state.angleB), y: cy - r * Math.sin(state.angleB) };

  // Diameter opposite T: D
  const angleD = state.angleT + Math.PI;
  const D = { x: cx + r * Math.cos(angleD), y: cy - r * Math.sin(angleD) };

  // Tangent unit direction at T
  const ux = Math.cos(state.angleT);
  const uy = -Math.sin(state.angleT);
  const tx = -uy;
  const ty = ux;

  const maxTangentLen = Math.max(80, Math.min(width, height) * 0.45);
  const L = Math.min(280, maxTangentLen);
  const Tan1 = { x: T.x - tx * L, y: T.y - ty * L };
  const Tan2 = { x: T.x + tx * L, y: T.y + ty * L };

  // Angle between tangent line and chord TA
  const vTA = { x: A.x - T.x, y: A.y - T.y };
  const magTA = Math.hypot(vTA.x, vTA.y) || 1;
  const uTA = { x: vTA.x / magTA, y: vTA.y / magTA };
  const cosTan = Math.max(-1, Math.min(1, tx * uTA.x + ty * uTA.y));
  const ang1 = toDegrees(Math.acos(cosTan));
  const ang2 = 180 - ang1;

  // Inscribed angle at B subtended by chord TA: ∠TBA
  const vBT = { x: T.x - B.x, y: T.y - B.y };
  const vBA = { x: A.x - B.x, y: A.y - B.y };
  const dotB = vBT.x * vBA.x + vBT.y * vBA.y;
  const magB = Math.hypot(vBT.x, vBT.y) * Math.hypot(vBA.x, vBA.y) || 1;
  const inscribedDeg = toDegrees(Math.acos(Math.max(-1, Math.min(1, dotB / magB))));

  // Pick the tangent-chord angle that corresponds to the alternate segment containing B
  const tangentChordDeg = Math.abs(ang1 - inscribedDeg) <= Math.abs(ang2 - inscribedDeg) ? ang1 : ang2;

  return {
    cx, cy, r, O, T, A, B, D, Tan1, Tan2,
    tangentChordDeg, inscribedDeg,
    diffDeg: Math.abs(tangentChordDeg - inscribedDeg),
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  <!-- Tangent line -->
  <line x1="${g.Tan1.x}" y1="${g.Tan1.y}" x2="${g.Tan2.x}" y2="${g.Tan2.y}" stroke="${PALETTE.emerald}" stroke-width="3"/>
  <!-- Triangle TAB -->
  <polygon points="${g.T.x},${g.T.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="${state.showArea !== false ? 'rgba(59, 130, 246, 0.16)' : 'none'}" stroke="#3b82f6" stroke-width="2.5"/>
  <!-- Points -->
  <circle cx="${g.T.x}" cy="${g.T.y}" r="7" fill="${PALETTE.red}"/>
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.blue}"/>
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.orange}"/>
  <!-- Text Labels with outward radial clearance -->
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const lt = getRadialLabelCoords(g.T, center, 18);
    const la = getRadialLabelCoords(g.A, center, 18);
    const lb = getRadialLabelCoords(g.B, center, 18);
    return `<text x="${lt.x}" y="${lt.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${lt.anchor}" dominant-baseline="${lt.baseline}">T</text>
  <text x="${la.x}" y="${la.y}" fill="${PALETTE.blue}" font-weight="bold" text-anchor="${la.anchor}" dominant-baseline="${la.baseline}">A</text>
  <text x="${lb.x}" y="${lb.y}" fill="${PALETTE.orange}" font-weight="bold" text-anchor="${lb.anchor}" dominant-baseline="${lb.baseline}">B</text>`;
  })()}
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Alternate Segment Theorem | Visual Mathematics Lab</text>
</svg>`;
}
