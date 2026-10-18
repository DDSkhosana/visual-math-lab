import { PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 120,
    pan: { x: 0, y: 0 },
    pointDist: 260,
    pointAngle: 0.15 * Math.PI,
    showCongruence: true,
    showArea: true,
    playing: false,
    ...vis,
  };
}

/**
 * Minimum radial clearance buffer (in px) between circle perimeter and external point P.
 * Rationale:
 * 1. Geometric Singularities: Prevents d <= r where tangent length sqrt(d^2 - r^2)
 *    and contact angle alpha = arccos(r/d) degenerate into imaginary or NaN values.
 * 2. Hit-Target Separation: Point P (hit radius 26px) does not collide with contact points
 *    T1 and T2 (hit radius 24px) or the circle perimeter stroke during pointer interaction.
 * 3. Typography Clearance: Prevents vertex label 'P' from occluding tangent right-angle markers.
 */
export const MIN_EXTERNAL_POINT_CLEARANCE = 15;

export function computeGeometry(state, width, height) {
  const pan = state.pan || { x: 0, y: 0 };
  const cx = width / 2 + (pan.x || 0);
  const cy = height / 2 + (pan.y || 0);
  const maxSafeRadius = Math.max(40, Math.min(width, height) / 2 - 50);
  const r = Math.min(state.radius, maxSafeRadius);

  // External point P safely bounded inside canvas viewport
  const angP = state.pointAngle;
  const padding = 35;
  const maxSafeX = Math.max(50, width / 2 - padding);
  const maxSafeY = Math.max(50, height / 2 - padding);
  const cosP = Math.abs(Math.cos(angP)) || 0.001;
  const sinP = Math.abs(Math.sin(angP)) || 0.001;
  const maxAllowedDist = Math.max(r + MIN_EXTERNAL_POINT_CLEARANCE, Math.min(maxSafeX / cosP, maxSafeY / sinP));
  const d = Math.min(Math.max(r + MIN_EXTERNAL_POINT_CLEARANCE, state.pointDist), maxAllowedDist);
  // In Cartesian coordinates: +X right, +Y up (canvas y = cy - d*sin(angP))
  const P = {
    x: cx + d * Math.cos(angP),
    y: cy - d * Math.sin(angP),
  };

  // Distance OP
  const distOP = Math.hypot(P.x - cx, P.y - cy);
  // Tangent length via Pythagoras: sqrt(d^2 - r^2)
  const tangentLength = Math.sqrt(Math.max(0, distOP * distOP - r * r));

  // Angle alpha in right-triangle OTP: cos(alpha) = r / d
  const alpha = Math.acos(Math.min(1, Math.max(-1, r / distOP)));

  const angleT1 = angP + alpha;
  const angleT2 = angP - alpha;

  const T1 = {
    x: cx + r * Math.cos(angleT1),
    y: cy - r * Math.sin(angleT1),
  };

  const T2 = {
    x: cx + r * Math.cos(angleT2),
    y: cy - r * Math.sin(angleT2),
  };

  // Intersection node K of diagonal OP and chord T1T2
  const distOK = (r * r) / distOP;
  const K = {
    x: cx + distOK * Math.cos(angP),
    y: cy - distOK * Math.sin(angP),
  };

  const lenPT1 = Math.hypot(P.x - T1.x, P.y - T1.y);
  const lenPT2 = Math.hypot(P.x - T2.x, P.y - T2.y);
  const lenDiff = Math.abs(lenPT1 - lenPT2);

  const chordT1T2 = Math.hypot(T1.x - T2.x, T1.y - T2.y);
  const halfChord = chordT1T2 / 2;
  const kiteArea = r * tangentLength;
  const triArea = 0.5 * r * tangentLength;

  const alphaDeg = (alpha * 180) / Math.PI;
  const betaDeg = 90 - alphaDeg;
  const angleT1PT2Deg = alphaDeg * 2;

  return {
    cx, cy, r, d, P, T1, T2, K,
    distOP, distOK,
    tangentLength, lenPT1, lenPT2, lenDiff,
    chordT1T2, halfChord, kiteArea, triArea,
    alphaDeg, betaDeg, angleT1PT2Deg,
    alpha,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.5" />
  
  <!-- Right triangle fills (Kite structure) -->
  ${(state.showCongruence !== false && state.showArea !== false) ? `
  <polygon points="${g.cx},${g.cy} ${g.T1.x},${g.T1.y} ${g.P.x},${g.P.y}" fill="rgba(16, 185, 129, 0.18)" />
  <polygon points="${g.cx},${g.cy} ${g.T2.x},${g.T2.y} ${g.P.x},${g.P.y}" fill="rgba(59, 130, 246, 0.18)" />
  ` : ''}

  <!-- Chord T1T2 -->
  <line x1="${g.T1.x}" y1="${g.T1.y}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.violet}" stroke-width="2.2" />

  <!-- Radii OT1 (Emerald), OT2 (Blue) -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.T1.x}" y2="${g.T1.y}" stroke="${PALETTE.emerald}" stroke-width="2.8" />
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.blue}" stroke-width="2.8" />

  <!-- Distance Line OP -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.P.x}" y2="${g.P.y}" stroke="${PALETTE.yellow}" stroke-width="2" stroke-dasharray="5 5" />

  <!-- Tangents PT1 (Emerald), PT2 (Blue) -->
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.T1.x}" y2="${g.T1.y}" stroke="${PALETTE.emerald}" stroke-width="3.5" />
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.blue}" stroke-width="3.5" />

  <!-- Center O -->
  <circle cx="${g.cx}" cy="${g.cy}" r="5" fill="${PALETTE.sky}" stroke="#fff" stroke-width="1.5" />
  <!-- Diagonal Node K -->
  <circle cx="${g.K.x}" cy="${g.K.y}" r="4" fill="${PALETTE.violet}" stroke="#fff" stroke-width="1" />
  <!-- Contact points -->
  <circle cx="${g.T1.x}" cy="${g.T1.y}" r="6" fill="${PALETTE.emerald}" stroke="#fff" stroke-width="1.5" />
  <circle cx="${g.T2.x}" cy="${g.T2.y}" r="6" fill="${PALETTE.blue}" stroke="#fff" stroke-width="1.5" />
  <!-- External point P -->
  <circle cx="${g.P.x}" cy="${g.P.y}" r="7" fill="${PALETTE.red}" stroke="#fff" stroke-width="2" />

  <text x="${g.cx - 15}" y="${g.cy - 12}" fill="${PALETTE.sky}" font-family="monospace" font-weight="bold">O</text>
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const lt1 = getRadialLabelCoords(g.T1, center, 18);
    const lt2 = getRadialLabelCoords(g.T2, center, 18);
    const lp = getRadialLabelCoords(g.P, center, 18);
    return `<text x="${lt1.x}" y="${lt1.y}" fill="${PALETTE.emerald}" font-family="monospace" font-weight="bold" text-anchor="${lt1.anchor}" dominant-baseline="${lt1.baseline}">T1</text>
  <text x="${lt2.x}" y="${lt2.y}" fill="${PALETTE.blue}" font-family="monospace" font-weight="bold" text-anchor="${lt2.anchor}" dominant-baseline="${lt2.baseline}">T2</text>
  <text x="${lp.x}" y="${lp.y}" fill="${PALETTE.red}" font-family="monospace" font-weight="bold" text-anchor="${lp.anchor}" dominant-baseline="${lp.baseline}">P</text>`;
  })()}
</svg>`;
}
