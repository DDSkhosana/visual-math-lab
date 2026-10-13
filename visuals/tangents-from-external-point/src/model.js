import { PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 120,
    pointDist: 260,
    pointAngle: 0.15 * Math.PI,
    showCongruence: true,
    showArea: true,
    playing: false,
    ...vis,
  };
}

export function computeGeometry(state, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxSafeRadius = Math.max(40, Math.min(width, height) / 2 - 50);
  const r = Math.min(state.radius, maxSafeRadius);

  // External point P safely bounded inside canvas viewport
  const angP = state.pointAngle;
  const padding = 35;
  const maxSafeX = Math.max(50, width / 2 - padding);
  const maxSafeY = Math.max(50, height / 2 - padding);
  const cosP = Math.abs(Math.cos(angP)) || 0.001;
  const sinP = Math.abs(Math.sin(angP)) || 0.001;
  const maxAllowedDist = Math.max(r + 15, Math.min(maxSafeX / cosP, maxSafeY / sinP));
  const d = Math.min(Math.max(r + 15, state.pointDist), maxAllowedDist);
  const P = {
    x: cx + d * Math.cos(angP),
    y: cy + d * Math.sin(angP),
  };

  // Distance OP
  const distOP = Math.hypot(P.x - cx, P.y - cy);
  // Tangent length
  const tangentLength = Math.sqrt(Math.max(0, distOP * distOP - r * r));

  // Angle alpha in right-triangle OTP: cos(alpha) = r / d
  const alpha = Math.acos(Math.min(1, Math.max(-1, r / distOP)));

  const angleT1 = angP - alpha;
  const angleT2 = angP + alpha;

  const T1 = {
    x: cx + r * Math.cos(angleT1),
    y: cy + r * Math.sin(angleT1),
  };

  const T2 = {
    x: cx + r * Math.cos(angleT2),
    y: cy + r * Math.sin(angleT2),
  };

  const lenPT1 = Math.hypot(P.x - T1.x, P.y - T1.y);
  const lenPT2 = Math.hypot(P.x - T2.x, P.y - T2.y);
  const lenDiff = Math.abs(lenPT1 - lenPT2);

  const angleOPT1Deg = (alpha * 180) / Math.PI;
  const angleT1PT2Deg = angleOPT1Deg * 2;

  return {
    cx, cy, r, d, P, T1, T2,
    tangentLength, lenPT1, lenPT2, lenDiff,
    angleOPT1Deg, angleT1PT2Deg,
    alpha,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.5" />
  
  <!-- Right triangle fills -->
  ${(state.showCongruence !== false && state.showArea !== false) ? `
  <polygon points="${g.cx},${g.cy} ${g.T1.x},${g.T1.y} ${g.P.x},${g.P.y}" fill="rgba(16, 185, 129, 0.16)" />
  <polygon points="${g.cx},${g.cy} ${g.T2.x},${g.T2.y} ${g.P.x},${g.P.y}" fill="rgba(59, 130, 246, 0.16)" />
  ` : ''}

  <!-- Radii OT1, OT2 -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.T1.x}" y2="${g.T1.y}" stroke="${PALETTE.amber}" stroke-width="2.5" />
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.amber}" stroke-width="2.5" />

  <!-- Secant / Line OP -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.P.x}" y2="${g.P.y}" stroke="${PALETTE.lavender}" stroke-width="2" stroke-dasharray="5 5" />

  <!-- Tangents PT1, PT2 -->
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.T1.x}" y2="${g.T1.y}" stroke="${PALETTE.emerald}" stroke-width="3.5" />
  <line x1="${g.P.x}" y1="${g.P.y}" x2="${g.T2.x}" y2="${g.T2.y}" stroke="${PALETTE.emerald}" stroke-width="3.5" />

  <!-- Center O -->
  <circle cx="${g.cx}" cy="${g.cy}" r="5" fill="${PALETTE.sky}" stroke="#fff" stroke-width="1.5" />
  <!-- Contact points -->
  <circle cx="${g.T1.x}" cy="${g.T1.y}" r="6" fill="${PALETTE.emerald}" stroke="#fff" stroke-width="1.5" />
  <circle cx="${g.T2.x}" cy="${g.T2.y}" r="6" fill="${PALETTE.emerald}" stroke="#fff" stroke-width="1.5" />
  <!-- External point P -->
  <circle cx="${g.P.x}" cy="${g.P.y}" r="7" fill="${PALETTE.red}" stroke="#fff" stroke-width="2" />

  <text x="${g.cx - 15}" y="${g.cy - 12}" fill="${PALETTE.sky}" font-family="monospace" font-weight="bold">O</text>
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const lt1 = getRadialLabelCoords(g.T1, center, 18);
    const lt2 = getRadialLabelCoords(g.T2, center, 18);
    const lp = getRadialLabelCoords(g.P, center, 18);
    return `<text x="${lt1.x}" y="${lt1.y}" fill="${PALETTE.emerald}" font-family="monospace" font-weight="bold" text-anchor="${lt1.anchor}" dominant-baseline="${lt1.baseline}">T1</text>
  <text x="${lt2.x}" y="${lt2.y}" fill="${PALETTE.emerald}" font-family="monospace" font-weight="bold" text-anchor="${lt2.anchor}" dominant-baseline="${lt2.baseline}">T2</text>
  <text x="${lp.x}" y="${lp.y}" fill="${PALETTE.red}" font-family="monospace" font-weight="bold" text-anchor="${lp.anchor}" dominant-baseline="${lp.baseline}">P</text>`;
  })()}
</svg>`;
}
