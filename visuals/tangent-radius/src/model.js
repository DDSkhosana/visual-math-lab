import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState, normalizeAngle, clamp } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    angleT: toRadians(45),
    angleT2: toRadians(135),
    angleT3: toRadians(225),
    angleT4: toRadians(315),
    tangentCount: 1,
    showQuadrant: true,
    chordAreaMode: 'segment',
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

  const rawAngleT = state.angleT ?? state.angleP ?? toRadians(45);
  const angleT = normalizeAngle(rawAngleT);

  // Quadrant calculations for T
  const quadIndex = Math.floor(angleT / (Math.PI / 2));
  const quadNumber = quadIndex + 1;
  const quadRoman = ['I', 'II', 'III', 'IV'][quadIndex];
  const quadSigns = ['(+X, +Y)', '(-X, +Y)', '(-X, -Y)', '(+X, -Y)'][quadIndex];
  const quadStartAngle = quadIndex * (Math.PI / 2);
  const quadEndAngle = (quadIndex + 1) * (Math.PI / 2);
  const quadrant = {
    index: quadIndex,
    number: quadNumber,
    roman: quadRoman,
    signs: quadSigns,
    startAngle: quadStartAngle,
    endAngle: quadEndAngle,
    label: `Quadrant ${quadRoman} ${quadSigns}`,
  };

  const maxTangentLen = Math.max(80, Math.min(width, height) * 0.45);
  const L = Math.min(state.tangentLength ?? 260, maxTangentLen);

  const count = clamp(state.tangentCount ?? 1, 1, 4);
  const defaultAngles = [
    angleT,
    normalizeAngle(state.angleT2 ?? toRadians(135)),
    normalizeAngle(state.angleT3 ?? toRadians(225)),
    normalizeAngle(state.angleT4 ?? toRadians(315)),
  ];

  const tangents = [];
  for (let i = 0; i < count; i++) {
    const ang = defaultAngles[i];
    const pt = { x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang) };
    const ux = Math.cos(ang);
    const uy = -Math.sin(ang);
    const tx = -uy;
    const ty = ux;
    const t1 = { x: pt.x - tx * L, y: pt.y - ty * L };
    const t2 = { x: pt.x + tx * L, y: pt.y + ty * L };
    const dot = ux * tx + uy * ty;

    // Right-angle square markers at contact
    const sq = 14;
    const c1x = pt.x - ux * sq;
    const c1y = pt.y - uy * sq;
    const c2x = c1x + tx * sq;
    const c2y = c1y + ty * sq;
    const c3x = pt.x + tx * sq;
    const c3y = pt.y + ty * sq;

    tangents.push({
      id: i === 0 ? 'T' : `T${i + 1}`,
      name: count === 1 ? 'T' : `T${i + 1}`,
      index: i,
      angle: ang,
      pt,
      ux, uy, tx, ty,
      T1: t1,
      T2: t2,
      dotProduct: dot,
      angleDeg: 90.0,
      rightSquare: { c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y }, c3: { x: c3x, y: c3y } },
    });
  }

  // Primary tangent contact point & tangent line
  const primary = tangents[0];
  const T = primary.pt;
  const ux = primary.ux;
  const uy = primary.uy;
  const tx = primary.tx;
  const ty = primary.ty;
  const T1 = primary.T1;
  const T2 = primary.T2;
  const dotProduct = primary.dotProduct;

  // Secant point Q (relative to primary T)
  const angQ = angleT + state.secantOffset;
  const Q = { x: cx + r * Math.cos(angQ), y: cy - r * Math.sin(angQ) };

  // Chords connecting adjacent tangents and subtended areas
  const chords = [];
  const areaColors = [
    { name: 'violet', token: PALETTE.violet, fillRgba: 'rgba(168, 85, 247, 0.28)', strokeRgba: 'rgba(168, 85, 247, 0.9)' },
    { name: 'rose', token: PALETTE.rose, fillRgba: 'rgba(244, 63, 94, 0.28)', strokeRgba: 'rgba(244, 63, 94, 0.9)' },
    { name: 'cyan', token: PALETTE.cyan, fillRgba: 'rgba(6, 182, 212, 0.28)', strokeRgba: 'rgba(6, 182, 212, 0.9)' },
    { name: 'fuchsia', token: PALETTE.fuchsia, fillRgba: 'rgba(217, 70, 239, 0.28)', strokeRgba: 'rgba(217, 70, 239, 0.9)' },
  ];

  if (count >= 2) {
    const sorted = [...tangents].sort((a, b) => a.angle - b.angle);
    for (let i = 0; i < sorted.length; i++) {
      const p1 = sorted[i];
      const p2 = sorted[(i + 1) % sorted.length];
      let sweep = p2.angle - p1.angle;
      if (sweep <= 0) sweep += Math.PI * 2;
      const chordLen = 2 * r * Math.sin(sweep / 2);
      const segArea = 0.5 * r * r * (sweep - Math.sin(sweep));
      const secArea = 0.5 * r * r * sweep;
      const triArea = 0.5 * r * r * Math.sin(sweep);
      const area = (state.chordAreaMode === 'sector') ? secArea : segArea;

      const midAngle = normalizeAngle(p1.angle + sweep / 2);
      const badgeR = (state.chordAreaMode === 'sector') ? (r * 0.6) : (r * Math.cos(sweep / 4) * 0.88);
      const badgePos = {
        x: cx + badgeR * Math.cos(midAngle),
        y: cy - badgeR * Math.sin(midAngle),
      };
      const col = areaColors[i % areaColors.length];
      chords.push({
        index: i,
        p1: p1.pt,
        p2: p2.pt,
        t1Name: p1.name,
        t2Name: p2.name,
        label: `Area ${i + 1} (${p1.name}${p2.name})`,
        ang1: p1.angle,
        ang2: p2.angle,
        sweep,
        chordLen,
        segArea,
        secArea,
        triArea,
        area,
        badgePos,
        color: col.token,
        colorName: col.name,
        fillRgba: col.fillRgba,
        strokeRgba: col.strokeRgba,
      });
    }
  }

  return {
    cx, cy, r, O, T, T1, T2, Q,
    ux, uy, tx, ty,
    dotProduct,
    angleDeg: 90.0,
    quadrant,
    tangents,
    chords,
    count,
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  const showQuadrant = state.showQuadrant !== false && state.vis2d?.quadrant !== false;

  let quadrantSVG = '';
  if (showQuadrant) {
    const q = g.quadrant;
    const p1x = g.cx + g.r * Math.cos(q.startAngle);
    const p1y = g.cy - g.r * Math.sin(q.startAngle);
    const p2x = g.cx + g.r * Math.cos(q.endAngle);
    const p2y = g.cy - g.r * Math.sin(q.endAngle);
    quadrantSVG = `
    <!-- Dynamic Quadrant Shading -->
    <path d="M ${g.cx} ${g.cy} L ${p1x} ${p1y} A ${g.r} ${g.r} 0 0 0 ${p2x} ${p2y} Z" fill="rgba(99, 102, 241, 0.12)" stroke="rgba(99, 102, 241, 0.35)" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="${g.cx + (p1x + p2x - 2 * g.cx) * 0.4}" y="${g.cy + (p1y + p2y - 2 * g.cy) * 0.4}" fill="${PALETTE.yellow}" font-weight="bold" font-size="14" text-anchor="middle">${q.roman}</text>`;
  }

  let chordsSVG = '';
  if (g.chords && g.chords.length > 0) {
    for (const c of g.chords) {
      const sweepDeg = (c.sweep * 180 / Math.PI);
      const largeArc = sweepDeg > 180 ? 1 : 0;
      if (state.chordAreaMode === 'sector') {
        chordsSVG += `
    <path d="M ${g.cx} ${g.cy} L ${c.p1.x} ${c.p1.y} A ${g.r} ${g.r} 0 ${largeArc} 0 ${c.p2.x} ${c.p2.y} Z" fill="${c.fillRgba}" stroke="none"/>`;
      } else {
        chordsSVG += `
    <path d="M ${c.p1.x} ${c.p1.y} A ${g.r} ${g.r} 0 ${largeArc} 0 ${c.p2.x} ${c.p2.y} Z" fill="${c.fillRgba}" stroke="none"/>`;
      }
      chordsSVG += `
    <line x1="${c.p1.x}" y1="${c.p1.y}" x2="${c.p2.x}" y2="${c.p2.y}" stroke="${c.strokeRgba}" stroke-width="2.5" stroke-dasharray="5,4"/>`;
    }
  }

  let tangentsSVG = '';
  for (const t of g.tangents) {
    const lt = getRadialLabelCoords(t.pt, g.O, 18);
    tangentsSVG += `
    <!-- Radius OT for ${t.name} -->
    <line x1="${g.O.x}" y1="${g.O.y}" x2="${t.pt.x}" y2="${t.pt.y}" stroke="${PALETTE.blue}" stroke-width="2.5"/>
    <!-- Tangent line for ${t.name} -->
    <line x1="${t.T1.x}" y1="${t.T1.y}" x2="${t.T2.x}" y2="${t.T2.y}" stroke="${PALETTE.emerald}" stroke-width="2.5"/>
    <!-- Contact point ${t.name} -->
    <circle cx="${t.pt.x}" cy="${t.pt.y}" r="6.5" fill="${PALETTE.red}"/>
    <text x="${lt.x}" y="${lt.y}" fill="${PALETTE.red}" font-weight="bold" text-anchor="${lt.anchor}" dominant-baseline="${lt.baseline}">${t.name}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  ${quadrantSVG}
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  ${chordsSVG}
  ${tangentsSVG}
  <!-- Center point -->
  <circle cx="${g.O.x}" cy="${g.O.y}" r="5" fill="${PALETTE.blue}"/>
  <text x="${g.O.x + 8}" y="${g.O.y + 18}" fill="${PALETTE.blue}" font-weight="bold">O</text>
  <text x="14" y="${height - 14}" fill="rgba(148, 163, 184, 0.7)" font-size="11">Tangent-Radius Theorem | Visual Mathematics Lab</text>
</svg>`;
}
