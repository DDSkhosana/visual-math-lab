import { PALETTE, getRadialLabelCoords, createDefaultVisState } from '../../../js/circle-core.js';

export function createInitialState() {
  return {
    radius: 170,
    angleA: 0.85 * Math.PI, // Top-left (symmetrically paired with angleB for 90° vertical bisector)
    angleB: 0.15 * Math.PI, // Top-right
    showRadii: true,
    showExtendedBisector: true,
    showArea: true,
    playing: false,
    ...createDefaultVisState(),
  };
}

export function computeGeometry(state, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxSafeRadius = Math.max(50, Math.min(width, height) / 2 - 40);
  const r = Math.min(state.radius, maxSafeRadius);

  const A = {
    x: cx + r * Math.cos(state.angleA),
    y: cy - r * Math.sin(state.angleA),
  };

  const B = {
    x: cx + r * Math.cos(state.angleB),
    y: cy - r * Math.sin(state.angleB),
  };

  // Midpoint M of chord AB
  const M = {
    x: (A.x + B.x) / 2,
    y: (A.y + B.y) / 2,
  };

  // Distance OM (perpendicular distance to chord)
  const distOM = Math.hypot(M.x - cx, M.y - cy);

  // Lengths AM and MB
  const lenAM = Math.hypot(M.x - A.x, M.y - A.y);
  const lenMB = Math.hypot(B.x - M.x, B.y - M.y);
  const lenChord = Math.hypot(B.x - A.x, B.y - A.y);
  const midDiff = Math.abs(lenAM - lenMB);

  // Dot product of AB and OM vectors: (B - A) . (M - O)
  const vecAB = { x: B.x - A.x, y: B.y - A.y };
  const vecOM = { x: M.x - cx, y: M.y - cy };
  const dot = vecAB.x * vecOM.x + vecAB.y * vecOM.y;

  // Angle between AB and OM in degrees
  const magAB = Math.hypot(vecAB.x, vecAB.y);
  const magOM = Math.hypot(vecOM.x, vecOM.y);
  let angleOMADeg = 90;
  if (magAB > 0.001 && magOM > 0.001) {
    const cosVal = Math.min(1, Math.max(-1, (vecAB.x * (-vecOM.x) + vecAB.y * (-vecOM.y)) / (magAB * magOM)));
    // angle between AM vector (A - M) and MO vector (O - M)
    const vecMA = { x: A.x - M.x, y: A.y - M.y };
    const vecMO = { x: cx - M.x, y: cy - M.y };
    const magMA = Math.hypot(vecMA.x, vecMA.y);
    const magMO = Math.hypot(vecMO.x, vecMO.y);
    const cosAngle = (vecMA.x * vecMO.x + vecMA.y * vecMO.y) / (magMA * magMO);
    angleOMADeg = (Math.acos(Math.min(1, Math.max(-1, cosAngle))) * 180) / Math.PI;
  }

  // Extended bisector line through O and M
  let bisectorP1 = { x: cx, y: cy };
  let bisectorP2 = { x: cx, y: cy };
  if (magOM > 0.001) {
    const dir = { x: vecOM.x / magOM, y: vecOM.y / magOM };
    bisectorP1 = { x: cx - dir.x * (r + 40), y: cy - dir.y * (r + 40) };
    bisectorP2 = { x: cx + dir.x * (r + 40), y: cy + dir.y * (r + 40) };
  }

  return {
    cx, cy, r, A, B, M,
    distOM, lenAM, lenMB, lenChord, midDiff,
    dot, angleOMADeg,
    bisectorP1, bisectorP2,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.5" />

  <!-- Triangles OMA and OMB fills -->
  ${state.showArea !== false ? `
  <polygon points="${g.cx},${g.cy} ${g.A.x},${g.A.y} ${g.M.x},${g.M.y}" fill="rgba(59, 130, 246, 0.16)" />
  <polygon points="${g.cx},${g.cy} ${g.B.x},${g.B.y} ${g.M.x},${g.M.y}" fill="rgba(245, 158, 11, 0.16)" />
  ` : ''}

  <!-- Extended Bisector -->
  <line x1="${g.bisectorP1.x}" y1="${g.bisectorP1.y}" x2="${g.bisectorP2.x}" y2="${g.bisectorP2.y}" stroke="${PALETTE.lavender}" stroke-width="2" stroke-dasharray="5 5" />

  <!-- Radii OA, OB -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.A.x}" y2="${g.A.y}" stroke="${PALETTE.amber}" stroke-width="2.5" />
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.amber}" stroke-width="2.5" />

  <!-- Chord AB -->
  <line x1="${g.A.x}" y1="${g.A.y}" x2="${g.B.x}" y2="${g.B.y}" stroke="${PALETTE.blue}" stroke-width="3" />

  <!-- Perpendicular OM -->
  <line x1="${g.cx}" y1="${g.cy}" x2="${g.M.x}" y2="${g.M.y}" stroke="${PALETTE.emerald}" stroke-width="3" />

  <!-- Center O -->
  <circle cx="${g.cx}" cy="${g.cy}" r="5" fill="${PALETTE.sky}" stroke="#fff" stroke-width="1.5" />
  <!-- Midpoint M -->
  <circle cx="${g.M.x}" cy="${g.M.y}" r="6" fill="${PALETTE.emerald}" stroke="#fff" stroke-width="1.5" />
  <!-- Chord endpoints -->
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.blue}" stroke="#fff" stroke-width="1.5" />
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.orange}" stroke="#fff" stroke-width="1.5" />

  <text x="${g.cx - 15}" y="${g.cy - 10}" fill="${PALETTE.sky}" font-family="monospace" font-weight="bold">O</text>
  ${(() => {
    const center = { x: g.cx, y: g.cy };
    const la = getRadialLabelCoords(g.A, center, 18);
    const lb = getRadialLabelCoords(g.B, center, 18);
    // For M, offset slightly away from center along OM
    const dxm = g.M.x - g.cx;
    const dym = g.M.y - g.cy;
    const lenM = Math.hypot(dxm, dym) || 1;
    const mx = g.M.x + (dxm / lenM) * 16;
    const my = g.M.y + (dym / lenM) * 16;
    return `<text x="${la.x}" y="${la.y}" fill="${PALETTE.blue}" font-family="monospace" font-weight="bold" text-anchor="${la.anchor}" dominant-baseline="${la.baseline}">A</text>
  <text x="${lb.x}" y="${lb.y}" fill="${PALETTE.orange}" font-family="monospace" font-weight="bold" text-anchor="${lb.anchor}" dominant-baseline="${lb.baseline}">B</text>
  <text x="${mx}" y="${my}" fill="${PALETTE.emerald}" font-family="monospace" font-weight="bold" text-anchor="middle" dominant-baseline="middle">M</text>`;
  })()}
</svg>`;
}
