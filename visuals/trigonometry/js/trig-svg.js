/**
 * @file trig-svg.js
 * Universal Vector SVG Generator for the Trigonometry Suite.
 * Generates mathematically rigorous, high-contrast, scalable vector illustrations
 * for Unit Circle & 3D Helix, Law of Sines, Law of Cosines, and Angle Addition Identities.
 */

import { PALETTE } from '../../../js/circle-core.js';
import {
  TAU,
  toDegrees,
  computeUnitCircleHelix,
  computeLawOfSines,
  computeLawOfCosines,
  computeAngleSumIdentities,
} from './trig-math.js';

/**
 * Universal Vector SVG Generator for the Trigonometry Suite.
 * Generates standalone SVG illustrations suitable for downloads, worksheets, and presentations.
 *
 * @param {string} visualId 'unit-circle-helix' | 'law-of-sines' | 'law-of-cosines' | 'angle-sum-identities'
 * @param {object} state Geometry and configuration state
 * @param {number} width Target width in pixels (default 800)
 * @param {number} height Target height in pixels (default 600)
 * @returns {string} XML SVG markup
 */
export function generateTrigSVG(visualId, state = {}, width = 800, height = 600) {
  const pan = state.pan || { x: 0, y: 0 };
  const cx = width / 2 + (pan.x || 0);
  const cy = height / 2 + (pan.y || 0);
  const r = Math.min(Number(state.radius) > 0 ? Number(state.radius) : 175, Math.min(width, height) * 0.42);

  const svgAngleArc = (acx, acy, radius, startAngle, endAngle, color, fillOpacity = 0.22) => {
    let sweep = endAngle - startAngle;
    while (sweep < 0) sweep += TAU;
    while (sweep > TAU) sweep -= TAU;
    const x1 = acx + radius * Math.cos(startAngle);
    const y1 = acy - radius * Math.sin(startAngle);
    const x2 = acx + radius * Math.cos(endAngle);
    const y2 = acy - radius * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${acx.toFixed(1)} ${acy.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 0 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
    return `<path d="${d}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="1.8"/>`;
  };

  const svgRightAngle = (vertex, toward1, toward2, size = 12, color = PALETTE.teal) => {
    const dx1 = toward1.x - vertex.x, dy1 = toward1.y - vertex.y;
    const l1 = Math.hypot(dx1, dy1) || 1;
    const u1x = (dx1 / l1) * size, u1y = (dy1 / l1) * size;
    const dx2 = toward2.x - vertex.x, dy2 = toward2.y - vertex.y;
    const l2 = Math.hypot(dx2, dy2) || 1;
    const u2x = (dx2 / l2) * size, u2y = (dy2 / l2) * size;
    const p1 = { x: vertex.x + u1x, y: vertex.y + u1y };
    const p2 = { x: p1.x + u2x, y: p1.y + u2y };
    const p3 = { x: vertex.x + u2x, y: vertex.y + u2y };
    return `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.8"/>`;
  };

  const svgPoint = (pt, label, color = PALETTE.amber, dx = 12, dy = -10, radius = 4.5) => {
    return `<g>
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius}" fill="${color}" stroke="#121215" stroke-width="1.8"/>
      <text x="${(pt.x + dx).toFixed(1)}" y="${(pt.y + dy).toFixed(1)}" fill="${color}" font-size="13" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="central">${label}</text>
    </g>`;
  };

  let content = '';

  if (visualId === 'unit-circle-helix') {
    const theta = state.angleTheta ?? Math.PI / 4;
    const m = computeUnitCircleHelix(theta, 1.0, state.helixPitch ?? 0.35);
    const toScreen = (pt) => ({ x: cx + pt.x * r, y: cy - pt.y * r });
    const O = toScreen(m.points2D.O);
    const P = toScreen(m.points2D.P);
    const projX = toScreen(m.points2D.projX);
    const projY = toScreen(m.points2D.projY);
    const tanBase = toScreen(m.points2D.tanLineBase);
    const tanTip = toScreen(m.points2D.tanLineTip);
    const deg = ((toDegrees(theta) % 360) + 360) % 360;

    const cosVal = m.cos ?? m.trig?.cos ?? 0;
    const sinVal = m.sin ?? m.trig?.sin ?? 0;
    const tanVal = m.tan ?? m.trig?.tan ?? 0;

    const tanSection = Math.abs(tanVal) <= 4.5 ? `
      <line x1="${tanBase.x.toFixed(1)}" y1="${tanBase.y.toFixed(1)}" x2="${tanTip.x.toFixed(1)}" y2="${tanTip.y.toFixed(1)}" stroke="${PALETTE.rose}" stroke-width="2.8" stroke-linecap="round"/>
      <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${tanTip.x.toFixed(1)}" y2="${tanTip.y.toFixed(1)}" stroke="${PALETTE.violet}" stroke-width="1.5" stroke-dasharray="4,4"/>
      ${svgPoint(tanTip, 'T', PALETTE.rose, 12, -8, 4)}
    ` : '';

    content = `
    <!-- Cartesian Axes -->
    <line x1="${(cx - r * 1.35).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + r * 1.35).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#334155" stroke-width="1.5"/>
    <line x1="${cx.toFixed(1)}" y1="${(cy + r * 1.35).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy - r * 1.35).toFixed(1)}" stroke="#334155" stroke-width="1.5"/>
    <text x="${(cx + r * 1.38).toFixed(1)}" y="${(cy + 4).toFixed(1)}" fill="#64748b" font-size="12" font-family="sans-serif">+X</text>
    <text x="${(cx + 4).toFixed(1)}" y="${(cy - r * 1.38).toFixed(1)}" fill="#64748b" font-size="12" font-family="sans-serif">+Y</text>

    <!-- Unit Circle -->
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(56, 189, 248, 0.05)" stroke="${PALETTE.sky}" stroke-width="2.5"/>

    <!-- Cosine Area Shading (Amber) -->
    <polygon points="${O.x.toFixed(1)},${O.y.toFixed(1)} ${projX.x.toFixed(1)},${projX.y.toFixed(1)} ${P.x.toFixed(1)},${P.y.toFixed(1)}" fill="rgba(245, 158, 11, 0.18)"/>

    <!-- Angle Wedge at O -->
    ${svgAngleArc(cx, cy, 38, 0, theta, PALETTE.amber, 0.28)}

    <!-- Right Angle at projX -->
    ${svgRightAngle(projX, O, P, 11, PALETTE.teal)}

    <!-- Cosine Segment (Amber) -->
    <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${projX.x.toFixed(1)}" y2="${projX.y.toFixed(1)}" stroke="${PALETTE.amber}" stroke-width="3.6" stroke-linecap="round"/>

    <!-- Sine Segment (Emerald) -->
    <line x1="${projX.x.toFixed(1)}" y1="${projX.y.toFixed(1)}" x2="${P.x.toFixed(1)}" y2="${P.y.toFixed(1)}" stroke="${PALETTE.emerald}" stroke-width="3.6" stroke-linecap="round"/>

    <!-- Hypotenuse / Radius (Indigo) -->
    <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${P.x.toFixed(1)}" y2="${P.y.toFixed(1)}" stroke="${PALETTE.indigo}" stroke-width="2.6"/>

    <!-- Tangent Line (Rose) -->
    ${tanSection}

    <!-- Points -->
    ${svgPoint(O, 'O', PALETTE.indigo, -14, 14, 4.5)}
    ${svgPoint(P, 'P', PALETTE.amber, 14, -12, 5)}
    ${svgPoint(projX, 'cos θ', PALETTE.amber, 0, 18, 3.5)}
    ${svgPoint(projY, 'sin θ', PALETTE.emerald, -20, 0, 3.5)}

    <!-- Header Badge & Invariants -->
    <rect x="20" y="20" width="420" height="72" rx="8" fill="rgba(30, 41, 59, 0.85)" stroke="#334155" stroke-width="1"/>
    <text x="36" y="46" fill="#f8fafc" font-size="15" font-family="'Inter', sans-serif" font-weight="600">Unit Circle &amp; Six Trigonometric Functions</text>
    <text x="36" y="68" fill="#94a3b8" font-size="12" font-family="'Inter', sans-serif">θ = ${deg.toFixed(1)}° | cos θ = ${cosVal.toFixed(4)} | sin θ = ${sinVal.toFixed(4)} | tan θ = ${tanVal.toFixed(4)}</text>
    <text x="36" y="84" fill="#38bdf8" font-size="11" font-family="'Inter', sans-serif" font-weight="500">sin²θ + cos²θ = 1.0000 | 1 + tan²θ = sec²θ</text>
    `;
  } else if (visualId === 'law-of-sines') {
    const angleA = state.angleA ?? 0.8;
    const angleB = state.angleB ?? 2.2;
    const angleC = state.angleC ?? 4.0;
    const m = computeLawOfSines(angleA, angleB, angleC, r);
    const toScreen = (pt) => ({ x: cx + pt.x, y: cy - pt.y });
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const C = toScreen(m.vertices2D.C);
    const O = { x: cx, y: cy };

    const sideA = m.sides?.a ?? m.a ?? 10;
    const sideB = m.sides?.b ?? m.b ?? 10;
    const sideC = m.sides?.c ?? m.c ?? 10;
    const degA = m.interiorAngles?.degA ?? toDegrees(m.intA || 0);
    const degB = m.interiorAngles?.degB ?? toDegrees(m.intB || 0);
    const degC = m.interiorAngles?.degC ?? toDegrees(m.intC || 0);

    content = `
    <!-- Circumcircle (Sky) -->
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(56, 189, 248, 0.04)" stroke="${PALETTE.sky}" stroke-width="2.2" stroke-dasharray="5,4"/>

    <!-- Circumradius Line OA (Sky) -->
    <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${PALETTE.sky}" stroke-width="1.8" stroke-dasharray="3,3"/>
    <text x="${((O.x + A.x) / 2 - 12).toFixed(1)}" y="${((O.y + A.y) / 2).toFixed(1)}" fill="${PALETTE.sky}" font-size="12" font-family="sans-serif" font-weight="600">R</text>

    <!-- Triangle Interior -->
    <polygon points="${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)} ${C.x.toFixed(1)},${C.y.toFixed(1)}" fill="rgba(56, 189, 248, 0.09)"/>

    <!-- Triangle Sides -->
    <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${PALETTE.emerald}" stroke-width="3.2"/>
    <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${C.x.toFixed(1)}" y2="${C.y.toFixed(1)}" stroke="${PALETTE.amber}" stroke-width="3.2"/>
    <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${PALETTE.rose}" stroke-width="3.2"/>

    <!-- Side Labels -->
    <text x="${((B.x + C.x) / 2 + 14).toFixed(1)}" y="${((B.y + C.y) / 2).toFixed(1)}" fill="${PALETTE.emerald}" font-size="13" font-family="sans-serif" font-weight="700">a = ${sideA.toFixed(1)}</text>
    <text x="${((A.x + C.x) / 2 - 14).toFixed(1)}" y="${((A.y + C.y) / 2).toFixed(1)}" fill="${PALETTE.amber}" font-size="13" font-family="sans-serif" font-weight="700">b = ${sideB.toFixed(1)}</text>
    <text x="${((A.x + B.x) / 2).toFixed(1)}" y="${((A.y + B.y) / 2 + 16).toFixed(1)}" fill="${PALETTE.rose}" font-size="13" font-family="sans-serif" font-weight="700">c = ${sideC.toFixed(1)}</text>

    <!-- Points -->
    ${svgPoint(O, 'O', PALETTE.sky, 0, -12, 4)}
    ${svgPoint(A, 'A', PALETTE.rose, -14, -10, 5)}
    ${svgPoint(B, 'B', PALETTE.emerald, 14, -10, 5)}
    ${svgPoint(C, 'C', PALETTE.amber, 0, 16, 5)}

    <!-- Header Badge & Invariants -->
    <rect x="20" y="20" width="460" height="72" rx="8" fill="rgba(30, 41, 59, 0.85)" stroke="#334155" stroke-width="1"/>
    <text x="36" y="46" fill="#f8fafc" font-size="15" font-family="'Inter', sans-serif" font-weight="600">The Law of Sines (Sine Rule &amp; Circumdiameter 2R)</text>
    <text x="36" y="68" fill="#94a3b8" font-size="12" font-family="'Inter', sans-serif">a / sin A = b / sin B = c / sin C = 2R = ${(2 * r).toFixed(1)}</text>
    <text x="36" y="84" fill="${PALETTE.sky}" font-size="11" font-family="'Inter', sans-serif" font-weight="500">A = ${degA.toFixed(1)}°, B = ${degB.toFixed(1)}°, C = ${degC.toFixed(1)}° (Sum = 180.0°)</text>
    `;
  } else if (visualId === 'law-of-cosines') {
    const sideA = state.sideA ?? 8;
    const sideB = state.sideB ?? 10;
    const angleC = state.angleC ?? Math.PI / 3;
    const m = computeLawOfCosines(sideA, sideB, angleC);
    const scale = (r * 1.15) / Math.max(m.a, m.b, m.c, 10);
    const originX = cx - m.b * scale * 0.42;
    const originY = cy + m.projection.hAlt * scale * 0.35;
    const toScreen = (pt) => ({ x: originX + pt.x * scale, y: originY - pt.y * scale });

    const C = toScreen(m.vertices2D.C);
    const A = toScreen(m.vertices2D.A);
    const B = toScreen(m.vertices2D.B);
    const D = toScreen(m.vertices2D.D);

    content = `
    <!-- Locus Arc of B centered at C with radius a -->
    <circle cx="${C.x.toFixed(1)}" cy="${C.y.toFixed(1)}" r="${(m.a * scale).toFixed(1)}" fill="none" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1.4" stroke-dasharray="4,4"/>

    <!-- Triangle Interior -->
    <polygon points="${C.x.toFixed(1)},${C.y.toFixed(1)} ${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)}" fill="rgba(244, 63, 94, 0.08)"/>

    <!-- Altitude Line BD (Dashed) -->
    <line x1="${B.x.toFixed(1)}" y1="${B.y.toFixed(1)}" x2="${D.x.toFixed(1)}" y2="${D.y.toFixed(1)}" stroke="#64748b" stroke-width="1.6" stroke-dasharray="3,3"/>
    ${svgRightAngle(D, C, B, 10, PALETTE.teal)}

    <!-- Triangle Sides -->
    <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${PALETTE.emerald}" stroke-width="3.4"/>
    <line x1="${C.x.toFixed(1)}" y1="${C.y.toFixed(1)}" x2="${A.x.toFixed(1)}" y2="${A.y.toFixed(1)}" stroke="${PALETTE.amber}" stroke-width="3.4"/>
    <line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke="${PALETTE.rose}" stroke-width="3.4"/>

    <!-- Angle Arc at C -->
    ${svgAngleArc(C.x, C.y, 28, 0, m.C, PALETTE.amber, 0.25)}

    <!-- Side Labels -->
    <text x="${((C.x + B.x) / 2 - 14).toFixed(1)}" y="${((C.y + B.y) / 2 - 8).toFixed(1)}" fill="${PALETTE.emerald}" font-size="13" font-family="sans-serif" font-weight="700">a = ${m.a.toFixed(1)}</text>
    <text x="${((C.x + A.x) / 2).toFixed(1)}" y="${((C.y + A.y) / 2 + 18).toFixed(1)}" fill="${PALETTE.amber}" font-size="13" font-family="sans-serif" font-weight="700">b = ${m.b.toFixed(1)}</text>
    <text x="${((A.x + B.x) / 2 + 14).toFixed(1)}" y="${((A.y + B.y) / 2 - 8).toFixed(1)}" fill="${PALETTE.rose}" font-size="13" font-family="sans-serif" font-weight="700">c = ${m.c.toFixed(2)}</text>

    <!-- Points -->
    ${svgPoint(C, 'C', PALETTE.amber, -14, 14, 5)}
    ${svgPoint(A, 'A', PALETTE.amber, 14, 14, 5)}
    ${svgPoint(B, 'B', PALETTE.rose, 0, -14, 5)}
    ${svgPoint(D, 'D', '#64748b', 0, 14, 3.5)}

    <!-- Header Badge & Invariants -->
    <rect x="20" y="20" width="460" height="72" rx="8" fill="rgba(30, 41, 59, 0.85)" stroke="#334155" stroke-width="1"/>
    <text x="36" y="46" fill="#f8fafc" font-size="15" font-family="'Inter', sans-serif" font-weight="600">The Law of Cosines (Cosine Rule)</text>
    <text x="36" y="68" fill="#94a3b8" font-size="12" font-family="'Inter', sans-serif">c² = a² + b² - 2ab cos C | c = ${m.c.toFixed(2)}, ∠C = ${toDegrees(m.C).toFixed(1)}°</text>
    <text x="36" y="84" fill="${PALETTE.amber}" font-size="11" font-family="'Inter', sans-serif" font-weight="500">c² = ${(m.c * m.c).toFixed(2)}, a² = ${(m.a * m.a).toFixed(2)}, b² = ${(m.b * m.b).toFixed(2)}, -2ab cos C = ${(-2 * m.a * m.b * Math.cos(m.C)).toFixed(2)}</text>
    `;
  } else if (visualId === 'angle-sum-identities') {
    const alpha = state.angleAlpha ?? Math.PI / 6;
    const beta = state.angleBeta ?? Math.PI / 4;
    const m = computeAngleSumIdentities(alpha, beta, 1.0);
    const toScreen = (pt) => ({ x: cx + pt.x * r, y: cy - pt.y * r });

    const O = toScreen(m.points2D.O);
    const P = toScreen(m.points2D.P);
    const Q = toScreen(m.points2D.Q);
    const M = toScreen(m.points2D.M);
    const N = toScreen(m.points2D.N);
    const Ndiff = toScreen(m.points2D.N_diff);

    const diffRay = state.showDifferenceRay !== false ? `
      <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${Ndiff.x.toFixed(1)}" y2="${Ndiff.y.toFixed(1)}" stroke="${PALETTE.orange}" stroke-width="2" stroke-dasharray="4,4"/>
      ${svgPoint(Ndiff, 'N_diff', PALETTE.orange, 12, -8, 3.5)}
    ` : '';

    content = `
    <!-- Unit Circle Arc -->
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.2"/>

    <!-- Base Axis Line -->
    <line x1="${(cx - 20).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + r * 1.25).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#334155" stroke-width="1.5"/>

    <!-- Stacked Right Triangle OMQ (Sky) -->
    <polygon points="${O.x.toFixed(1)},${O.y.toFixed(1)} ${M.x.toFixed(1)},${M.y.toFixed(1)} ${Q.x.toFixed(1)},${Q.y.toFixed(1)}" fill="rgba(2, 132, 199, 0.16)" stroke="${PALETTE.sky}" stroke-width="2"/>

    <!-- Stacked Right Triangle OQP (Violet) -->
    <polygon points="${O.x.toFixed(1)},${O.y.toFixed(1)} ${Q.x.toFixed(1)},${Q.y.toFixed(1)} ${P.x.toFixed(1)},${P.y.toFixed(1)}" fill="rgba(168, 85, 247, 0.16)" stroke="${PALETTE.violet}" stroke-width="2"/>

    <!-- Right Angle Markers -->
    ${svgRightAngle(M, O, Q, 10, PALETTE.teal)}
    ${svgRightAngle(Q, O, P, 10, PALETTE.teal)}

    <!-- Hypotenuse OP (Indigo) -->
    <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${P.x.toFixed(1)}" y2="${P.y.toFixed(1)}" stroke="${PALETTE.indigo}" stroke-width="2.8"/>

    <!-- Intermediate Ray OQ (Amber) -->
    <line x1="${O.x.toFixed(1)}" y1="${O.y.toFixed(1)}" x2="${Q.x.toFixed(1)}" y2="${Q.y.toFixed(1)}" stroke="${PALETTE.amber}" stroke-width="2.2"/>

    <!-- Difference Ray (Orange) if enabled -->
    ${diffRay}

    <!-- Angle Arcs -->
    ${svgAngleArc(cx, cy, 32, 0, alpha, PALETTE.amber, 0.28)}
    ${svgAngleArc(cx, cy, 46, alpha, alpha + beta, PALETTE.emerald, 0.28)}

    <!-- Points -->
    ${svgPoint(O, 'O', PALETTE.indigo, -14, 14, 4.5)}
    ${svgPoint(P, 'P', PALETTE.violet, 14, -12, 5)}
    ${svgPoint(Q, 'Q', PALETTE.amber, 14, -8, 4.5)}
    ${svgPoint(M, 'M', PALETTE.sky, 0, 16, 3.5)}
    ${svgPoint(N, 'N', PALETTE.sky, -14, 0, 3.5)}

    <!-- Header Badge & Invariants -->
    <rect x="20" y="20" width="480" height="72" rx="8" fill="rgba(30, 41, 59, 0.85)" stroke="#334155" stroke-width="1"/>
    <text x="36" y="46" fill="#f8fafc" font-size="15" font-family="'Inter', sans-serif" font-weight="600">Trigonometric Angle Addition Identities</text>
    <text x="36" y="68" fill="#94a3b8" font-size="12" font-family="'Inter', sans-serif">cos(α+β) = cos α cos β - sin α sin β = ${m.trig.cosSum.toFixed(4)}</text>
    <text x="36" y="84" fill="${PALETTE.violet}" font-size="11" font-family="'Inter', sans-serif" font-weight="500">sin(α+β) = sin α cos β + cos α sin β = ${m.trig.sinSum.toFixed(4)} | α = ${toDegrees(alpha).toFixed(1)}°, β = ${toDegrees(beta).toFixed(1)}°</text>
    `;
  } else {
    content = `
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${PALETTE.sky}" stroke-width="2.5"/>
    <text x="24" y="${height - 24}" fill="#94a3b8" font-size="13">${visualId} | Visual Mathematics Lab</text>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #121215; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#121215"/>
  ${content}
</svg>`;
}
