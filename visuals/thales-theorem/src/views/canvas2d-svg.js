import { PALETTE } from '../config/palette.js';

/**
 * Generates an SVG string representation of the 2D Thales scene.
 * @param {object} state
 * @param {object} frame Frame computed by computeFrame
 * @returns {string} Clean SVG markup
 */
export function generateSceneSVG(state, f) {
  const { width, height, cx, cy, r, a, b, p, angle } = f;

  // Triangle legs
  const ux = (a.x - p.x);
  const uy = (a.y - p.y);
  const uLen = Math.hypot(ux, uy) || 1;
  const vx = (b.x - p.x);
  const vy = (b.y - p.y);
  const vLen = Math.hypot(vx, vy) || 1;

  const sqSize = 14;
  const nux = ux / uLen;
  const nuy = uy / uLen;
  const nvx = vx / vLen;
  const nvy = vy / vLen;

  const c1x = p.x + nux * sqSize;
  const c1y = p.y + nuy * sqSize;
  const c2x = c1x + nvx * sqSize;
  const c2y = c1y + nvy * sqSize;
  const c3x = p.x + nvx * sqSize;
  const c3y = p.y + nvy * sqSize;

  // Arc path for angle
  const arcRadius = 26;
  const arcEndX = cx + arcRadius * Math.cos(-angle);
  const arcEndY = cy + arcRadius * Math.sin(-angle);
  const largeArc = angle > Math.PI ? 1 : 0;
  const arcD = `M ${cx} ${cy} L ${cx + arcRadius} ${cy} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${arcEndX} ${arcEndY} Z`;

  const isPhi = f.plane === 'xz';
  const angleColor = isPhi ? PALETTE.fuchsia : PALETTE.yellow;
  const angleLabel = isPhi ? 'φ' : 'θ';

  // Radial label coordinates for P
  const dxP = p.x - cx;
  const dyP = p.y - cy;
  const lenP = Math.hypot(dxP, dyP) || 1;
  const uxP = dxP / lenP;
  const uyP = dyP / lenP;
  const pAnchor = uxP > 0.35 ? 'start' : uxP < -0.35 ? 'end' : 'middle';
  const pBaseline = uyP > 0.35 ? 'hanging' : uyP < -0.35 ? 'baseline' : 'central';
  const pxLabel = p.x + uxP * 18;
  const pyLabel = p.y + uyP * 18;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: 'Inter', sans-serif;">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Axes -->
  <line x1="0" y1="${cy}" x2="${width}" y2="${cy}" stroke="rgba(100, 116, 139, 0.7)" stroke-width="1.5"/>
  <line x1="${cx}" y1="${height}" x2="${cx}" y2="0" stroke="rgba(100, 116, 139, 0.7)" stroke-width="1.5"/>

  <!-- Circle (Circumference) -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>

  <!-- Angle Sector at Center -->
  <path d="${arcD}" fill="${isPhi ? 'rgba(217, 70, 239, 0.25)' : 'rgba(234, 179, 8, 0.25)'}" stroke="${angleColor}" stroke-width="1.5"/>
  <text x="${cx + 33 * Math.cos(-angle / 2)}" y="${cy + 33 * Math.sin(-angle / 2)}" fill="${angleColor}" font-style="italic" font-size="13" font-weight="bold" text-anchor="middle" dominant-baseline="central">${angleLabel}</text>

  <!-- Inscribed Triangle Area Shading -->
  <polygon points="${a.x},${a.y} ${b.x},${b.y} ${p.x},${p.y}" fill="rgba(34, 197, 94, 0.2)" stroke="rgba(34, 197, 94, 0.6)" stroke-width="1"/>

  <!-- Right Angle Square at P -->
  <polygon points="${p.x},${p.y} ${c1x},${c1y} ${c2x},${c2y} ${c3x},${c3y}" fill="rgba(20, 184, 166, 0.25)" stroke="${PALETTE.teal}" stroke-width="1.5"/>
  <text x="${p.x + (nux + nvx) * 22}" y="${p.y + (nuy + nvy) * 22}" fill="${PALETTE.teal}" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="central">90°</text>

  <!-- Diameter Chord AB -->
  <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${PALETTE.red}" stroke-width="2.5"/>

  <!-- Leg s (P to a) -->
  <line x1="${p.x}" y1="${p.y}" x2="${a.x}" y2="${a.y}" stroke="${PALETTE.blue}" stroke-width="2.5"/>

  <!-- Leg t (P to b) -->
  <line x1="${p.x}" y1="${p.y}" x2="${b.x}" y2="${b.y}" stroke="${PALETTE.orange}" stroke-width="2.5"/>

  <!-- Radius (C to P) -->
  <line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${PALETTE.indigo}" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Points -->
  <circle cx="${cx}" cy="${cy}" r="4" fill="${PALETTE.indigo}" stroke="#fff" stroke-width="1"/>
  <circle cx="${a.x}" cy="${a.y}" r="5" fill="${PALETTE.red}" stroke="#fff" stroke-width="1"/>
  <circle cx="${b.x}" cy="${b.y}" r="5" fill="${PALETTE.orange}" stroke="#fff" stroke-width="1"/>
  <circle cx="${p.x}" cy="${p.y}" r="6" fill="${PALETTE.violet}" stroke="#fff" stroke-width="1.5"/>

  <!-- Text Labels -->
  <g filter="url(#shadow)" font-family="monospace" font-weight="bold" font-size="13">
    <text x="${a.x - 14}" y="${a.y + 16}" fill="${PALETTE.red}">a</text>
    <text x="${b.x + 8}" y="${b.y + 16}" fill="${PALETTE.orange}">b</text>
    <text x="${cx + 6}" y="${cy + 16}" fill="${PALETTE.indigo}">C</text>
    <text x="${pxLabel}" y="${pyLabel}" fill="${PALETTE.violet}" text-anchor="${pAnchor}" dominant-baseline="${pBaseline}">P</text>
    <text x="${(a.x + p.x) / 2 - 12}" y="${(a.y + p.y) / 2}" fill="${PALETTE.blue}">s</text>
    <text x="${(b.x + p.x) / 2 + 8}" y="${(b.y + p.y) / 2}" fill="${PALETTE.orange}">t</text>
  </g>

  <!-- Title / Watermark -->
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-family="monospace" font-size="11" font-weight="bold">Thales' Theorem | Visual Mathematics Lab</text>
</svg>`;
}
