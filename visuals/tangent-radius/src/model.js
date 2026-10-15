import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    angleT: toRadians(45),
    showSecant: false,
    secantOffset: toRadians(30),
    tangentLength: 260,
    showArea: true,
    showCoords: true,
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
  // Point T on circle
  const T = { x: cx + r * Math.cos(state.angleT), y: cy - r * Math.sin(state.angleT) };

  // Unit radial vector (pointing outward from O to T)
  const ux = Math.cos(state.angleT);
  const uy = -Math.sin(state.angleT);

  // Unit tangent vector (perpendicular: rotated 90 deg counter-clockwise)
  const tx = -uy;
  const ty = ux;

  // Tangent endpoints safely bounded within canvas
  const maxTangentLen = Math.max(80, Math.min(width, height) * 0.45);
  const L = Math.min(state.tangentLength ?? 260, maxTangentLen);
  const T1 = { x: T.x - tx * L, y: T.y - ty * L };
  const T2 = { x: T.x + tx * L, y: T.y + ty * L };

  // Secant point Q
  const angQ = state.angleT + state.secantOffset;
  const Q = { x: cx + r * Math.cos(angQ), y: cy - r * Math.sin(angQ) };

  // Dot product of radial vector and tangent vector
  const dotProduct = ux * tx + uy * ty; // identically 0

  return {
    cx, cy, r, O, T, T1, T2, Q,
    ux, uy, tx, ty,
    dotProduct,
    angleDeg: 90.0,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  <!-- Radius OT -->
  <line x1="${g.O.x}" y1="${g.O.y}" x2="${g.T.x}" y2="${g.T.y}" stroke="${PALETTE.blue}" stroke-width="3"/>
  <!-- Tangent line T1-T2 -->
  <line x1="${g.T1.x}" y1="${g.T1.y}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.emerald}" stroke-width="3"/>
  <!-- Center and Tangent points -->
  <circle cx="${g.O.x}" cy="${g.O.y}" r="5" fill="${PALETTE.blue}"/>
  <circle cx="${g.T.x}" cy="${g.T.y}" r="7" fill="${PALETTE.red}"/>
  <text x="${g.O.x + 8}" y="${g.O.y + 18}" fill="${PALETTE.blue}" font-weight="bold">O</text>
  ${(() => {
    const lt = getRadialLabelCoords(g.T, g.O, 18);
    return `<text x="${lt.x}" y="${lt.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${lt.anchor}" dominant-baseline="${lt.baseline}">T</text>`;
  })()}
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Tangent-Radius Theorem | Visual Mathematics Lab</text>
</svg>`;
}
