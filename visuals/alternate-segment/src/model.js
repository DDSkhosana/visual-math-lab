import { toDegrees, toRadians, PALETTE, getRadialLabelCoords, createDefaultVisState, normalizeAngle } from '../../../js/circle-core.js';

export function createInitialState() {
  const vis = createDefaultVisState();
  return {
    radius: 180,
    pan: { x: 0, y: 0 },
    angleT: toRadians(270), // bottom contact
    angleA: toRadians(150), // upper-left
    angleB: toRadians(40),  // upper-right
    showProofConstruction: true, // Thales theorem proof overlay
    showThalesOverlay: true,
    showDAngles: true,
    showExteriorD: true,
    showArea: true,
    showTriangleShading: false,
    showTriangles: false,
    showAngles: true,
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
  const T = { x: cx + r * Math.cos(state.angleT), y: cy - r * Math.sin(state.angleT) };
  const A = { x: cx + r * Math.cos(state.angleA), y: cy - r * Math.sin(state.angleA) };
  const B = { x: cx + r * Math.cos(state.angleB), y: cy - r * Math.sin(state.angleB) };

  // Diameter opposite T: D (antipodal point)
  const angleD = state.angleT + Math.PI;
  const D = { x: cx + r * Math.cos(angleD), y: cy - r * Math.sin(angleD) };

  // Extended ray point past D for exterior angle representation
  const Dext = {
    x: D.x + (D.x - cx) * 0.35,
    y: D.y - (cy - D.y) * 0.35,
  };

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

  // Point D Interior Angles (Thales proof triangle angles)
  const vDT = { x: T.x - D.x, y: T.y - D.y };
  const vDA = { x: A.x - D.x, y: A.y - D.y };
  const vDB = { x: B.x - D.x, y: B.y - D.y };

  const magDT = Math.hypot(vDT.x, vDT.y) || 1;
  const magDA = Math.hypot(vDA.x, vDA.y) || 1;
  const magDB = Math.hypot(vDB.x, vDB.y) || 1;

  // Interior angle ∠TDA at D (subtends chord TA from diameter TD; identically equals α)
  const dotTDA = vDT.x * vDA.x + vDT.y * vDA.y;
  const angleTDA = toDegrees(Math.acos(Math.max(-1, Math.min(1, dotTDA / (magDT * magDA)))));

  // Interior angle ∠TDB at D (in right triangle ΔTBD)
  const dotTDB = vDT.x * vDB.x + vDT.y * vDB.y;
  const angleTDB = toDegrees(Math.acos(Math.max(-1, Math.min(1, dotTDB / (magDT * magDB)))));

  // Angle ∠BDA at D
  const dotBDA = vDB.x * vDA.x + vDB.y * vDA.y;
  const angleBDA = toDegrees(Math.acos(Math.max(-1, Math.min(1, dotBDA / (magDB * magDA)))));

  // Exterior angle at D (supplementary linear pair: 180° - ∠TDA)
  const extAngleD = 180.0 - angleTDA;
  const reflexAngleD = 360.0 - angleTDA;

  // Thales right angles: ∠TBD = 90°, ∠TAD = 90°, ∠(Tangent, TD) = 90°
  const thalesAngleTBD = 90.0;
  const thalesAngleTAD = 90.0;
  const thalesTangentTD = 90.0;

  // Alternate Segments Geometry on chord TA (both unified under PALETTE.sky)
  const normT = normalizeAngle(state.angleT);
  const normA = normalizeAngle(state.angleA);
  const normB = normalizeAngle(state.angleB);

  const diffTA = normalizeAngle(normA - normT);
  const diffTB = normalizeAngle(normB - normT);

  let sweepMajor, startMajor, sweepMinor, startMinor;
  if (diffTB < diffTA) {
    // B is on the counterclockwise arc from T to A
    startMajor = normT;
    sweepMajor = diffTA;
    startMinor = normA;
    sweepMinor = 2 * Math.PI - diffTA;
  } else {
    // B is on the other arc
    startMajor = normA;
    sweepMajor = 2 * Math.PI - diffTA;
    startMinor = normT;
    sweepMinor = diffTA;
  }

  const areaMajor = 0.5 * r * r * (sweepMajor - Math.sin(sweepMajor));
  const areaMinor = 0.5 * r * r * (sweepMinor - Math.sin(sweepMinor));

  const midAngMajor = normalizeAngle(startMajor + sweepMajor / 2);
  const midAngMinor = normalizeAngle(startMinor + sweepMinor / 2);

  const segMajorLabelPos = {
    x: cx + 0.62 * r * Math.cos(midAngMajor),
    y: cy - 0.62 * r * Math.sin(midAngMajor),
  };
  const segMinorLabelPos = {
    x: cx + 0.82 * r * Math.cos(midAngMinor),
    y: cy - 0.82 * r * Math.sin(midAngMinor),
  };

  const lenTA = Math.hypot(A.x - T.x, A.y - T.y);
  const lenTD = 2 * r;
  const lenBD = Math.hypot(D.x - B.x, D.y - B.y);
  const lenAD = Math.hypot(D.x - A.x, D.y - A.y);

  return {
    cx, cy, r, O, T, A, B, D, Dext, Tan1, Tan2,
    tangentChordDeg, inscribedDeg,
    diffDeg: Math.abs(tangentChordDeg - inscribedDeg),
    angleTDA, angleTDB, angleBDA,
    extAngleD, reflexAngleD,
    thalesAngleTBD, thalesAngleTAD, thalesTangentTD,
    lenTA, lenTD, lenBD, lenAD,
    alternateSegments: {
      color: PALETTE.sky,
      major: {
        color: PALETTE.sky,
        start: startMajor,
        sweep: sweepMajor,
        area: areaMajor,
        labelPos: segMajorLabelPos,
        label: 'Alt Seg (Maj)',
        fullLabel: 'Alternate Segment (Major)',
      },
      minor: {
        color: PALETTE.violet,
        start: startMinor,
        sweep: sweepMinor,
        area: areaMinor,
        labelPos: segMinorLabelPos,
        label: 'Alt Seg (Min)',
        fullLabel: 'Alternate Segment (Minor)',
      },
    },
  };
}

export function generateSVG(state, width, height) {
  const g = computeGeometry(state, width, height);
  const showThales = state.showProofConstruction !== false;
  const center = { x: g.cx, y: g.cy };

  let thalesSVG = '';
  if (showThales && g.D) {
    thalesSVG = `
  <!-- Thales Diameter TD -->
  <line x1="${g.T.x}" y1="${g.T.y}" x2="${g.D.x}" y2="${g.D.y}" stroke="${PALETTE.indigo}" stroke-width="2.5" stroke-dasharray="5,4"/>
  <!-- Thales Chords BD and AD -->
  <line x1="${g.B.x}" y1="${g.B.y}" x2="${g.D.x}" y2="${g.D.y}" stroke="${PALETTE.cyan}" stroke-width="2"/>
  <line x1="${g.A.x}" y1="${g.A.y}" x2="${g.D.x}" y2="${g.D.y}" stroke="${PALETTE.rose}" stroke-width="2"/>
  <!-- Point D -->
  <circle cx="${g.D.x}" cy="${g.D.y}" r="6" fill="${PALETTE.indigo}"/>
  ${(() => {
    const ld = getRadialLabelCoords(g.D, center, 18);
    return `<text x="${ld.x}" y="${ld.y}" fill="${PALETTE.indigo}" font-weight="bold" text-anchor="${ld.anchor}" dominant-baseline="${ld.baseline}">D</text>`;
  })()}`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" fill="none" stroke="${PALETTE.sky}" stroke-width="2"/>
  <!-- Tangent line -->
  <line x1="${g.Tan1.x}" y1="${g.Tan1.y}" x2="${g.Tan2.x}" y2="${g.Tan2.y}" stroke="${PALETTE.emerald}" stroke-width="3"/>
  <!-- Alternate Segments Labels (Abbreviated: Alt Seg (Maj) / Alt Seg (Min)) -->
  <text x="${g.alternateSegments.major.labelPos.x}" y="${g.alternateSegments.major.labelPos.y}" fill="${PALETTE.sky}" font-size="12" font-weight="bold" text-anchor="middle">Alt Seg (Maj)</text>
  <text x="${g.alternateSegments.minor.labelPos.x}" y="${g.alternateSegments.minor.labelPos.y}" fill="${PALETTE.violet}" font-size="11" font-weight="bold" text-anchor="middle">Alt Seg (Min)</text>
  <!-- Triangle TAB -->
  <polygon points="${g.T.x},${g.T.y} ${g.A.x},${g.A.y} ${g.B.x},${g.B.y}" fill="${state.showArea !== false ? 'rgba(56, 189, 248, 0.16)' : 'none'}" stroke="${PALETTE.blue}" stroke-width="2.5"/>
  ${thalesSVG}
  <!-- Points -->
  <circle cx="${g.T.x}" cy="${g.T.y}" r="7" fill="${PALETTE.red}"/>
  <circle cx="${g.A.x}" cy="${g.A.y}" r="6" fill="${PALETTE.blue}"/>
  <circle cx="${g.B.x}" cy="${g.B.y}" r="6" fill="${PALETTE.orange}"/>
  <!-- Text Labels with outward radial clearance -->
  ${(() => {
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
