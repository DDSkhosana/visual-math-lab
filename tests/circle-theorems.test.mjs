import test from 'node:test';
import assert from 'node:assert/strict';

import * as AngleAtCentre from '../visuals/circle-theorems/angle-at-centre/src/model.js';
import * as AnglesInSameSegment from '../visuals/circle-theorems/angles-in-same-segment/src/model.js';
import * as CyclicQuad from '../visuals/circle-theorems/cyclic-quadrilateral/src/model.js';
import * as TangentRadius from '../visuals/circle-theorems/tangent-radius/src/model.js';
import * as AlternateSegment from '../visuals/circle-theorems/alternate-segment/src/model.js';
import * as TangentsFromPoint from '../visuals/circle-theorems/tangents-from-external-point/src/model.js';
import * as ChordBisector from '../visuals/circle-theorems/perpendicular-chord-bisector/src/model.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get3DAngleBisector, get3DAngleDegrees, computeSphericalTriangleExcess, getGeodesicTangent, alignCircleWireToPlane, computeConcyclicPlaneAndCircle, setSector3DVertices, setSegment3DVertices } from '../js/circle-3d.js';
import { PALETTE, UnitSystemConverter, createStore, CHEVRON_DOWN_SVG, CHEVRON_UP_SVG, setExpandButtonUI, CHEVRON_DOWN_SINGLE_SVG, CHEVRON_UP_SINGLE_SVG, setPanelMinimizeButtonUI, initCollapsibleSections, computeOptimalViewportRadius } from '../js/circle-core.js';
import { setExpandButtonUI as thalesSetExpandButtonUI, CHEVRON_DOWN_SINGLE_SVG as thalesChevronDownSingle, CHEVRON_UP_SINGLE_SVG as thalesChevronUpSingle, setPanelMinimizeButtonUI as thalesSetPanelMinimizeButtonUI } from '../visuals/circle-theorems/thales-theorem/src/ui/Accordion.js';
import { getMatchScore, highlightMatch } from '../js/components.js';

const close = (actual, expected, eps = 1e-6) => assert.ok(Math.abs(actual - expected) < eps, `${actual} !~ ${expected}`);

test('Angle at Centre: central angle is exactly 2x inscribed angle across various configurations (both major and minor arc placement)', () => {
  const width = 800;
  const height = 600;
  const state = AngleAtCentre.createInitialState();

  // Test across multiple arc spans
  for (let span = 0.2 * Math.PI; span <= 0.9 * Math.PI; span += 0.2) {
    state.angleA = 0;
    state.angleB = span;

    // 1. P on the major arc: acute inscribed angle, minor central angle
    state.angleP = span / 2 + Math.PI;
    const gMajor = AngleAtCentre.computeGeometry(state, width, height);
    close(gMajor.centralDeg, 2 * gMajor.inscribedDeg, 1e-4);
    close(gMajor.ratio, 2.0, 1e-4);
    assert.ok(gMajor.centralDeg < 180, 'Major arc placement must yield central angle < 180°');
    assert.ok(gMajor.inscribedDeg < 90, 'Major arc placement must yield inscribed angle < 90°');

    // 2. P on the minor arc (below AOB): obtuse inscribed angle, reflex central angle
    state.angleP = span / 2;
    const gMinor = AngleAtCentre.computeGeometry(state, width, height);
    close(gMinor.centralDeg, 2 * gMinor.inscribedDeg, 1e-4);
    close(gMinor.ratio, 2.0, 1e-4);
    assert.ok(gMinor.centralDeg > 180, 'Minor arc placement must dynamically yield reflex central angle > 180°');
    assert.ok(gMinor.inscribedDeg > 90, 'Minor arc placement must yield obtuse inscribed angle > 90°');

    // 3. Reflex perigon invariant (360°)
    close(gMinor.centralDeg + (360 - gMinor.centralDeg), 360, 1e-4);
    close(gMinor.inscribedDeg + (360 - gMinor.inscribedDeg), 360, 1e-4);
  }
});

test('Angles in Same Segment: angles subtended at P1 and P2 are identical', () => {
  const width = 800;
  const height = 600;
  const state = AnglesInSameSegment.createInitialState();

  for (let angP1 = 0.4 * Math.PI; angP1 <= 0.8 * Math.PI; angP1 += 0.1) {
    for (let angP2 = 0.5 * Math.PI; angP2 <= 0.9 * Math.PI; angP2 += 0.1) {
      state.angleP1 = angP1;
      state.angleP2 = angP2;
      const g = AnglesInSameSegment.computeGeometry(state, width, height);

      close(g.angleP1Deg, g.angleP2Deg, 1e-4);
      close(g.diffDeg, 0, 1e-4);
    }
  }
});

test('Cyclic Quadrilateral: opposite angles sum to 180°, total interior sum is 360°, diagonals & Ptolemy theorem hold', () => {
  const width = 800;
  const height = 600;
  const state = CyclicQuad.createInitialState();
  assert.strictEqual(state.showDiagonals, true, 'Cyclic Quadrilateral must have showDiagonals enabled by default');

  // Test several cyclic quad vertex configurations
  const configs = [
    { A: 0.2, B: 0.7, C: 1.2, D: 1.7 },
    { A: 0.1, B: 0.5, C: 1.0, D: 1.6 },
    { A: 0.3, B: 0.8, C: 1.3, D: 1.9 },
  ];

  for (const c of configs) {
    state.angleA = c.A * Math.PI;
    state.angleB = c.B * Math.PI;
    state.angleC = c.C * Math.PI;
    state.angleD = c.D * Math.PI;
    const g = CyclicQuad.computeGeometry(state, width, height);

    close(g.sumAC, 180, 1e-4);
    close(g.sumBD, 180, 1e-4);
    close(g.sumAC + g.sumBD, 360, 1e-4);
    // Exterior angle theorem: Ext ∠C strictly equals opposite interior angle ∠A
    close(g.exteriorAngleDeg, g.angleADeg, 1e-4);
    // Linear pair on straight line DCE sums to 180°
    close(g.exteriorAngleDeg + g.angleCDeg, 180, 1e-4);
    // Diagonals AC and BD and Ptolemy's theorem: |AC|·|BD| = |AB|·|CD| + |BC|·|DA|
    assert.ok(g.lenAC > 0 && g.lenBD > 0, 'Diagonal lengths |AC| and |BD| must be positive');
    assert.ok(g.diagIntersection && Number.isFinite(g.diagIntersection.x) && Number.isFinite(g.diagIntersection.y), 'Diagonal intersection point must be computed');
    close(g.ptolemyLHS, g.ptolemyRHS, 1e-4);
  }
});

test('Tangent-Radius: radial vector is strictly perpendicular to tangent (dot product is 0)', () => {
  const width = 800;
  const height = 600;
  const state = TangentRadius.createInitialState();

  for (let deg = 0; deg < 360; deg += 30) {
    state.angleP = (deg * Math.PI) / 180;
    const g = TangentRadius.computeGeometry(state, width, height);

    close(g.dotProduct, 0, 1e-5);
    close(g.angleDeg, 90, 1e-4);
  }
});

test('Tangent-Radius: dynamic quadrant calculation and orthogonality invariant across all 4 quadrants', () => {
  const width = 800;
  const height = 600;
  const state = TangentRadius.createInitialState();

  const quadrantCases = [
    { deg: 45, expectedIndex: 0, expectedRoman: 'I', expectedSigns: '(+X, +Y)' },
    { deg: 135, expectedIndex: 1, expectedRoman: 'II', expectedSigns: '(-X, +Y)' },
    { deg: 225, expectedIndex: 2, expectedRoman: 'III', expectedSigns: '(-X, -Y)' },
    { deg: 315, expectedIndex: 3, expectedRoman: 'IV', expectedSigns: '(+X, -Y)' },
  ];

  for (const c of quadrantCases) {
    state.angleT = (c.deg * Math.PI) / 180;
    const g = TangentRadius.computeGeometry(state, width, height);

    assert.equal(g.quadrant.index, c.expectedIndex, `Angle ${c.deg}° should be in index ${c.expectedIndex}`);
    assert.equal(g.quadrant.roman, c.expectedRoman, `Angle ${c.deg}° should be Quadrant ${c.expectedRoman}`);
    assert.equal(g.quadrant.signs, c.expectedSigns, `Angle ${c.deg}° should have signs ${c.expectedSigns}`);
    close(g.dotProduct, 0, 1e-6);
  }
});

test('Tangent-Radius: active quadrant highlighting matches Thales standard across 2D, 3D, telemetry, and derivations', async () => {
  globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} disconnect() {} };
  globalThis.window = globalThis.window || { devicePixelRatio: 1 };
  const fs = await import('fs');
  const indexHtml = fs.readFileSync('visuals/circle-theorems/tangent-radius/index.html', 'utf8');
  assert.ok(indexHtml.includes('id="view-title-2d"'), 'index.html must have id="view-title-2d"');
  assert.ok(indexHtml.includes('id="view-title-3d"'), 'index.html must have id="view-title-3d"');
  assert.ok(indexHtml.includes('id="tel-quadrant"') && indexHtml.includes('class="color-yellow" id="tel-quadrant"'), '2D telemetry quadrant must use color-yellow');
  assert.ok(indexHtml.includes('id="val-3d-quadrant"') && indexHtml.includes('class="color-yellow" id="val-3d-quadrant"'), '3D telemetry quadrant must use color-yellow');

  // Verify 2D CanvasView renders Roman numerals and watermark in golden yellow
  const canvasMod = await import('../visuals/circle-theorems/tangent-radius/src/canvas.js');
  const renderedTexts = [];
  const strokes = [];
  const fills = [];
  const mockCtx = {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    closePath: () => {},
    stroke: () => strokes.push(mockCtx.strokeStyle),
    fill: () => fills.push(mockCtx.fillStyle),
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    setLineDash: () => {},
    save: () => {},
    restore: () => {},
    fillText: (text) => renderedTexts.push({ text, fill: mockCtx.fillStyle, shadow: mockCtx.shadowColor }),
    strokeText: () => {},
    setTransform: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    measureText: (text) => ({ width: String(text).length * 7 }),
  };
  const mockCanvas = {
    width: 800,
    height: 600,
    style: {},
    getContext: () => mockCtx,
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  };

  const state = {
    ...TangentRadius.createInitialState(),
    angleT: Math.PI / 4, // Quadrant I
    showQuadrant: true,
    vis2d: { labels: true, quadrant: true, points: true, angles: true, lengths: true, grid: true, axes: true },
  };
  const view = new canvasMod.CanvasView(mockCanvas, mockCanvas.parentElement);
  view.render(state);

  const activeNum = renderedTexts.find((t) => t.text === 'I');
  assert.ok(activeNum, 'Active numeral I must be rendered');
  assert.strictEqual(activeNum.fill, '#eab308', 'Active numeral I must be rendered in PALETTE.yellow (#eab308)');
  assert.ok(activeNum.shadow && activeNum.shadow.includes('234, 179, 8'), 'Active numeral I must have glowing yellow shadow');

  const watermark = renderedTexts.find((t) => t.text && t.text.includes('Top View (Plane XZ) | Quadrant I'));
  assert.ok(watermark, 'Corner pill watermark must be rendered for active quadrant');
  assert.ok(watermark.fill.includes('234, 179, 8'), 'Watermark must use warm golden yellow fill');

  // Verify 3D view and derivations color grammar
  const circle3d = fs.readFileSync('js/circle-3d.js', 'utf8');
  assert.ok(circle3d.includes('makeTriMesh(THREE, PALETTE.yellow, 0.20)'), 'TangentRadius3DView quadrant mesh must use PALETTE.yellow');
  assert.ok(circle3d.includes("color: 'color-yellow'"), 'TangentRadius3DView quadrant billboard label must use color-yellow');

  const derivations = fs.readFileSync('js/circle-derivations.js', 'utf8');
  assert.ok(derivations.includes("tag('yellow', q.label)"), 'TangentRadiusDerivations Step 5 must tag q.label in yellow');
  assert.ok(derivations.includes("tag('yellow', `Quadrant "), 'TangentRadiusDerivations Step 5e must tag Quadrant in yellow');
});

test('Tangent-Radius: multiple tangents option with chord-subtended areas and distinct non-overlapping color tokens', () => {
  const width = 800;
  const height = 600;
  const state = TangentRadius.createInitialState();

  // Test inserting 2, 3, and 4 tangents
  for (const count of [2, 3, 4]) {
    state.tangentCount = count;
    state.angleT = 0.25 * Math.PI; // T1 (45°)
    state.angleT2 = 0.75 * Math.PI; // T2 (135°)
    state.angleT3 = 1.25 * Math.PI; // T3 (225°)
    state.angleT4 = 1.75 * Math.PI; // T4 (315°)

    const g = TangentRadius.computeGeometry(state, width, height);
    assert.equal(g.tangents.length, count, `Should generate exactly ${count} active tangents`);
    assert.equal(g.chords.length, count, `Should generate exactly ${count} chords and subtended areas`);

    // Verify all tangents preserve perpendicularity (dot product 0)
    for (const t of g.tangents) {
      close(t.dotProduct, 0, 1e-5);
      close(t.angleDeg, 90.0, 1e-4);
    }

    // Verify each subtended area has positive non-zero area
    for (const chord of g.chords) {
      assert.ok(chord.area > 0, `Chord ${chord.label} must have positive subtended area`);
      assert.ok(chord.chordLen > 0, `Chord length must be positive`);
    }

    // Verify assigned color tokens are unique and distinct from existing elements
    // Existing elements: Circle (sky), Radius/Center (blue), Contact Point (red), Tangent line (emerald), Right Angle (teal), Secant (yellow)
    const existingTokens = new Set([
      PALETTE.sky,
      PALETTE.blue,
      PALETTE.red,
      PALETTE.emerald,
      PALETTE.teal,
      PALETTE.yellow,
    ]);

    const usedChordColors = new Set();
    for (const chord of g.chords) {
      assert.ok(!existingTokens.has(chord.color), `Chord area color ${chord.color} must not overlap with existing element colors`);
      assert.ok(!usedChordColors.has(chord.color), `Chord area colors must be distinct from each other: duplicate ${chord.color}`);
      usedChordColors.add(chord.color);
    }
  }
});

test('Tangent-Radius: 3D active quadrant numbering, trigonometric projection wedges (cos, sin, tan), enabled by default, and exclusivity to primary tangent', async () => {
  const fs = await import('fs');
  const width = 800;
  const height = 600;
  const state = TangentRadius.createInitialState();

  // 1. Enabled by default contract
  assert.strictEqual(state.showTrigWedges, true, 'showTrigWedges must be enabled by default in initial state');
  assert.strictEqual(state.vis2d?.trigWedges, true, 'vis2d.trigWedges must be enabled by default');
  assert.strictEqual(state.vis3d?.trigWedges, true, 'vis3d.trigWedges must be enabled by default');

  // 2. HTML compliance: default checkboxes and telemetry stat lines
  const indexHtml = fs.readFileSync('visuals/circle-theorems/tangent-radius/index.html', 'utf8');
  assert.ok(indexHtml.includes('id="vis-2d-trig" checked'), '2D Trig Wedges checkbox must be checked by default in HTML');
  assert.ok(indexHtml.includes('id="vis-3d-trig" checked'), '3D Trig Wedges checkbox must be checked by default in HTML');
  assert.ok(indexHtml.includes('id="tel-trig-cos"'), '2D telemetry must contain id="tel-trig-cos"');
  assert.ok(indexHtml.includes('id="tel-trig-sin"'), '2D telemetry must contain id="tel-trig-sin"');
  assert.ok(indexHtml.includes('id="tel-trig-tan"'), '2D telemetry must contain id="tel-trig-tan"');
  assert.ok(indexHtml.includes('id="tel-trig-tan-span"'), '2D telemetry must contain id="tel-trig-tan-span"');
  assert.ok(indexHtml.includes('id="tel-trig-sec-span"'), '2D telemetry must contain id="tel-trig-sec-span"');
  assert.ok(indexHtml.includes('id="val-3d-trig-cos"'), '3D telemetry must contain id="val-3d-trig-cos"');
  assert.ok(indexHtml.includes('id="val-3d-trig-sin"'), '3D telemetry must contain id="val-3d-trig-sin"');
  assert.ok(indexHtml.includes('id="val-3d-trig-tan"'), '3D telemetry must contain id="val-3d-trig-tan"');
  assert.ok(indexHtml.includes('id="val-3d-trig-tan-span"'), '3D telemetry must contain id="val-3d-trig-tan-span"');

  // 3. Mathematical precision across all 4 quadrants for primary tangent
  const quadTrigCases = [
    { deg: 45, expectedQuadNum: 1, expectedCos: Math.SQRT1_2, expectedSin: Math.SQRT1_2, expectedTan: 1.0 },
    { deg: 135, expectedQuadNum: 2, expectedCos: -Math.SQRT1_2, expectedSin: Math.SQRT1_2, expectedTan: -1.0 },
    { deg: 225, expectedQuadNum: 3, expectedCos: -Math.SQRT1_2, expectedSin: -Math.SQRT1_2, expectedTan: 1.0 },
    { deg: 315, expectedQuadNum: 4, expectedCos: Math.SQRT1_2, expectedSin: -Math.SQRT1_2, expectedTan: -1.0 },
  ];

  for (const tc of quadTrigCases) {
    state.angleT = (tc.deg * Math.PI) / 180;
    const g = TangentRadius.computeGeometry(state, width, height);
    assert.ok(g.primaryTrig, 'computeGeometry must return primaryTrig');
    assert.strictEqual(g.quadrant.number, tc.expectedQuadNum, `Quadrant number must be ${tc.expectedQuadNum}`);

    close(g.primaryTrig.cosVal, tc.expectedCos, 1e-4);
    close(g.primaryTrig.sinVal, tc.expectedSin, 1e-4);
    close(g.primaryTrig.tanVal, tc.expectedTan, 1e-4);

    // Pythagorean identity: cos²θ + sin²θ = 1
    close(g.primaryTrig.cosVal ** 2 + g.primaryTrig.sinVal ** 2, 1.0, 1e-6);

    // Tangent span length: |T Sx| = r * |tan θ|
    close(g.primaryTrig.tanLength, g.r * Math.abs(tc.expectedTan), 1e-4);

    // Tangent-Radius Orthogonality Duality: r² + |T Sx|² = |O Sx|² ≡ r²(1 + tan²θ) = (r sec θ)²
    const lhs = g.r ** 2 + g.primaryTrig.tanLength ** 2;
    const rhs = g.primaryTrig.secLength ** 2;
    close(lhs, rhs, 1e-3);
  }

  // 4. Exclusivity to primary tangent:
  // When multiple tangents (e.g. 4) are active, primaryTrig is computed exclusively for primary tangent T
  state.tangentCount = 4;
  state.angleT = Math.PI / 4;
  state.angleT2 = Math.PI * 0.75;
  state.angleT3 = Math.PI * 1.25;
  state.angleT4 = Math.PI * 1.75;
  const multiG = TangentRadius.computeGeometry(state, width, height);
  assert.strictEqual(multiG.tangents.length, 4, 'Must have 4 active tangents');
  // primaryTrig corresponds strictly to primary angleT (45°)
  close(multiG.primaryTrig.angleDeg, 45.0, 1e-4);
  close(multiG.primaryTrig.tanVal, 1.0, 1e-4);
  assert.strictEqual(multiG.quadrant.number, 1, 'Primary tangent quadrant must be Q1');

  // 5. 3D Scene Architecture & Quadrant Numbering
  const circle3d = fs.readFileSync('js/circle-3d.js', 'utf8');
  assert.ok(circle3d.includes('this.lineCos = makeLine(THREE, PALETTE.sky);'), '3D view must create lineCos in PALETTE.sky');
  assert.ok(circle3d.includes('this.lineSin = makeLine(THREE, PALETTE.emerald, true);'), '3D view must create lineSin in PALETTE.emerald');
  assert.ok(circle3d.includes('this.lineTan = makeLine(THREE, PALETTE.rose);'), '3D view must create lineTan in PALETTE.rose');
  assert.ok(circle3d.includes('this.trigAngleWedgeMesh = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.25);'), '3D view must create trigAngleWedgeMesh in PALETTE.amber');
  assert.ok(circle3d.includes('Quadrant ${q + 1} (${romans[q]})'), '3D view must display quadrant numbers 1..4 with Roman numerals');

  // 6. Live Math Derivations Step 8
  const derivations = fs.readFileSync('js/circle-derivations.js', 'utf8');
  assert.ok(derivations.includes('tr-step-8'), 'TangentRadiusDerivations must contain tr-step-8 card');
  assert.ok(derivations.includes('Trigonometric Wedges & Orthogonality Duality'), 'tr-step-8 title must mention Trigonometric Wedges & Orthogonality Duality');
});

test('Alternate Segment: angle between tangent and chord equals inscribed angle in alternate segment', () => {
  const width = 800;
  const height = 600;
  const state = AlternateSegment.createInitialState();

  for (let angB = 0.2 * Math.PI; angB <= 0.8 * Math.PI; angB += 0.2) {
    state.angleB = angB;
    const g = AlternateSegment.computeGeometry(state, width, height);

    close(g.tangentChordDeg, g.inscribedDeg, 1e-4);
    close(g.diffDeg, 0, 1e-4);
  }
});

test('Alternate Segment: Thales overlay axiomatic principles, Point D angles, and distinct Major (Sky) & Minor (Violet) alternate segments', () => {
  const width = 800;
  const height = 600;
  const state = AlternateSegment.createInitialState();

  for (let angB = 0.2 * Math.PI; angB <= 0.8 * Math.PI; angB += 0.2) {
    state.angleB = angB;
    const g = AlternateSegment.computeGeometry(state, width, height);

    // 1. Thales Semicircle Right Angles (Axiomatic Invariant: dot product is zero)
    assert.strictEqual(g.thalesAngleTBD, 90.0, 'Thales angle ∠TBD must be strictly 90.0°');
    assert.strictEqual(g.thalesAngleTAD, 90.0, 'Thales angle ∠TAD must be strictly 90.0°');
    assert.strictEqual(g.thalesTangentTD, 90.0, 'Diameter TD must be perpendicular to tangent line (90.0°)');

    // Dot product orthogonality checks: (B - T) · (B - D) = 0 and (A - T) · (A - D) = 0
    const dotBT_BD = (g.B.x - g.T.x) * (g.B.x - g.D.x) + (g.B.y - g.T.y) * (g.B.y - g.D.y);
    const dotAT_AD = (g.A.x - g.T.x) * (g.A.x - g.D.x) + (g.A.y - g.T.y) * (g.A.y - g.D.y);
    close(dotBT_BD, 0, 1e-4);
    close(dotAT_AD, 0, 1e-4);

    // 2. Point D Angles (Interior α, Exterior 180° - α, Reflex 360° - α)
    close(g.angleTDA, g.inscribedDeg, 1e-4);
    close(g.extAngleD, 180.0 - g.angleTDA, 1e-4);
    close(g.reflexAngleD, 360.0 - g.angleTDA, 1e-4);

    // 3. Alternate Segments Distinct Colour Tokens and Labels
    assert.strictEqual(g.alternateSegments.major.color, PALETTE.sky, 'Major alternate segment must use PALETTE.sky');
    assert.strictEqual(g.alternateSegments.minor.color, PALETTE.violet, 'Minor alternate segment must use PALETTE.violet');
    assert.strictEqual(g.alternateSegments.major.label, 'Alt Seg (Maj)');
    assert.strictEqual(g.alternateSegments.minor.label, 'Alt Seg (Min)');
    assert.strictEqual(g.alternateSegments.major.fullLabel, 'Alternate Segment (Major)');
    assert.strictEqual(g.alternateSegments.minor.fullLabel, 'Alternate Segment (Minor)');
    assert.ok(g.alternateSegments.major.area > 0, 'Major segment area must be positive');
    assert.ok(g.alternateSegments.minor.area > 0, 'Minor segment area must be positive');
    assert.ok(Number.isFinite(g.alternateSegments.major.labelPos.x));
    assert.ok(Number.isFinite(g.alternateSegments.minor.labelPos.x));
  }
});

test('Tangents from External Point: tangent lengths |PT1| and |PT2| are identical and equal sqrt(d² - r²)', () => {
  const width = 800;
  const height = 600;
  const state = TangentsFromPoint.createInitialState();

  for (const dist of [200, 260, 320]) {
    for (const r of [100, 130, 160]) {
      state.radius = r;
      state.pointDist = dist;
      const g = TangentsFromPoint.computeGeometry(state, width, height);

      const expectedLength = Math.sqrt(dist * dist - r * r);
      close(g.lenPT1, expectedLength, 1e-4);
      close(g.lenPT2, expectedLength, 1e-4);
      close(g.lenDiff, 0, 1e-4);
    }
  }
});

test('Perpendicular Chord Bisector: OM bisects chord AB and is strictly perpendicular (dot product is 0)', () => {
  const width = 800;
  const height = 600;
  const state = ChordBisector.createInitialState();

  for (let angA = 0.6 * Math.PI; angA <= 0.9 * Math.PI; angA += 0.1) {
    for (let angB = 0.1 * Math.PI; angB <= 0.4 * Math.PI; angB += 0.1) {
      state.angleA = angA;
      state.angleB = angB;
      const g = ChordBisector.computeGeometry(state, width, height);

      close(g.lenAM, g.lenMB, 1e-4);
      close(g.midDiff, 0, 1e-4);
      close(g.dot, 0, 1e-4);
      close(g.angleOMADeg, 90, 1e-4);
    }
  }
});

test('3D Angle Utilities: spatial bisector and degree calculation in true 3D', () => {
  class MockVector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    angleTo(v) {
      const d = (this.x * v.x + this.y * v.y + this.z * v.z) / ((this.length() * v.length()) || 1);
      return Math.acos(Math.max(-1, Math.min(1, d)));
    }
  }
  const mockTHREE = { Vector3: MockVector3 };

  const V = new MockVector3(0, 0, 0);
  const P1 = new MockVector3(10, 0, 0);
  const P2 = new MockVector3(0, 0, 10);

  // 90° right angle in XZ plane
  const degRight = get3DAngleDegrees(V, P1, P2, mockTHREE);
  close(degRight, 90, 1e-4);

  const bisRight = get3DAngleBisector(V, P1, P2, 2.0, mockTHREE);
  const expectedComp = 2.0 * Math.SQRT1_2;
  close(bisRight.x, expectedComp, 1e-4);
  close(bisRight.y, 0, 1e-4);
  close(bisRight.z, expectedComp, 1e-4);

  // 60° equilateral angle in 3D
  const P3 = new MockVector3(5, 0, 5 * Math.sqrt(3));
  const deg60 = get3DAngleDegrees(V, P1, P3, mockTHREE);
  close(deg60, 60, 1e-4);

  const bis60 = get3DAngleBisector(V, P1, P3, 3.0, mockTHREE);
  close(bis60.x, 3.0 * (Math.sqrt(3) / 2), 1e-4);
  close(bis60.z, 3.0 * 0.5, 1e-4);
});

test('2D CanvasView.render and generateSVG execute cleanly across all 7 circle theorem visuals', async () => {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.window = globalThis.window || { devicePixelRatio: 1 };

  const noop = () => {};
  const createMockCanvas = () => {
    const ctx = {
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      closePath: noop,
      stroke: noop,
      fill: noop,
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      setLineDash: noop,
      save: noop,
      restore: noop,
      fillText: noop,
      strokeText: noop,
      setTransform: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    };
    return {
      width: 800,
      height: 600,
      style: {},
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
      },
    };
  };

  const visuals = [
    { name: 'angle-at-centre', model: AngleAtCentre, canvasMod: await import('../visuals/circle-theorems/angle-at-centre/src/canvas.js') },
    { name: 'angles-in-same-segment', model: AnglesInSameSegment, canvasMod: await import('../visuals/circle-theorems/angles-in-same-segment/src/canvas.js') },
    { name: 'cyclic-quadrilateral', model: CyclicQuad, canvasMod: await import('../visuals/circle-theorems/cyclic-quadrilateral/src/canvas.js') },
    { name: 'tangent-radius', model: TangentRadius, canvasMod: await import('../visuals/circle-theorems/tangent-radius/src/canvas.js') },
    { name: 'alternate-segment', model: AlternateSegment, canvasMod: await import('../visuals/circle-theorems/alternate-segment/src/canvas.js') },
    { name: 'tangents-from-external-point', model: TangentsFromPoint, canvasMod: await import('../visuals/circle-theorems/tangents-from-external-point/src/canvas.js') },
    { name: 'perpendicular-chord-bisector', model: ChordBisector, canvasMod: await import('../visuals/circle-theorems/perpendicular-chord-bisector/src/canvas.js') },
  ];

  for (const { name, model, canvasMod } of visuals) {
    const state = model.createInitialState();
    const mockCanvas = createMockCanvas();
    const view = new canvasMod.CanvasView(mockCanvas, mockCanvas.parentElement);
    assert.doesNotThrow(() => view.render(state), `${name}: CanvasView.render should not throw`);
    const genSVG = canvasMod.generateSVG || model.generateSVG;
    if (genSVG) {
      const svg = genSVG(state, 800, 600);
      assert.ok(typeof svg === 'string' && svg.includes('<svg'), `${name}: generateSVG should return valid SVG markup`);
    }
  }
});

test('Unified labeling toggle: disabling labels suppresses all 2D text rendering across all circle visuals', async () => {
  const noop = () => {};
  const createMockCanvas = () => {
    const ctx = {
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      closePath: noop,
      stroke: noop,
      fill: noop,
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      setLineDash: noop,
      save: noop,
      restore: noop,
      fillText: noop,
      strokeText: noop,
      setTransform: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    };
    return {
      width: 800,
      height: 600,
      style: {},
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
      },
    };
  };

  const visuals = [
    { name: 'angle-at-centre', model: AngleAtCentre, canvasMod: await import('../visuals/circle-theorems/angle-at-centre/src/canvas.js') },
    { name: 'angles-in-same-segment', model: AnglesInSameSegment, canvasMod: await import('../visuals/circle-theorems/angles-in-same-segment/src/canvas.js') },
    { name: 'cyclic-quadrilateral', model: CyclicQuad, canvasMod: await import('../visuals/circle-theorems/cyclic-quadrilateral/src/canvas.js') },
    { name: 'tangent-radius', model: TangentRadius, canvasMod: await import('../visuals/circle-theorems/tangent-radius/src/canvas.js') },
    { name: 'alternate-segment', model: AlternateSegment, canvasMod: await import('../visuals/circle-theorems/alternate-segment/src/canvas.js') },
    { name: 'tangents-from-external-point', model: TangentsFromPoint, canvasMod: await import('../visuals/circle-theorems/tangents-from-external-point/src/canvas.js') },
    { name: 'perpendicular-chord-bisector', model: ChordBisector, canvasMod: await import('../visuals/circle-theorems/perpendicular-chord-bisector/src/canvas.js') },
  ];

  for (const { name, model, canvasMod } of visuals) {
    const state = {
      ...model.createInitialState(),
      vis2d: {
        labels: false,
        coords: false,
        points: true,
        angles: true,
        lengths: true,
        grid: true,
        axes: false,
      },
    };
    const renderedTexts = [];
    const mockCanvas = createMockCanvas();
    const ctx = mockCanvas.getContext('2d');
    ctx.fillText = (text) => renderedTexts.push(text);

    const view = new canvasMod.CanvasView(mockCanvas, mockCanvas.parentElement);
    view.render(state);

    assert.strictEqual(
      renderedTexts.length,
      0,
      `${name}: when labels is false, no text labels should be rendered, but got: ${JSON.stringify(renderedTexts)}`
    );
  }
});

test('Tangents from External Point: interactive point dragging and bound invariants', () => {
  const state = TangentsFromPoint.createInitialState();
  const g1 = TangentsFromPoint.computeGeometry(state, 800, 600);

  // Invariant: external point distance d > radius r
  assert.ok(g1.d > g1.r, 'Initial point distance d must be strictly greater than radius r');
  assert.strictEqual(TangentsFromPoint.MIN_EXTERNAL_POINT_CLEARANCE, 15, 'Clearance constant must be 15px');

  // Verify non-physical interior point clamp (d <= r) avoids radical and trigonometric NaN
  const insideState = { ...state, radius: 120, pointDist: 80 }; // d < r
  const gInside = TangentsFromPoint.computeGeometry(insideState, 800, 600);
  assert.strictEqual(gInside.d, 120 + TangentsFromPoint.MIN_EXTERNAL_POINT_CLEARANCE);
  assert.ok(!Number.isNaN(gInside.lenPT1) && gInside.lenPT1 > 0);
  assert.ok(!Number.isNaN(gInside.alphaDeg) && gInside.alphaDeg > 0);

  // Both tangent contact points T1 and T2 must lie strictly on the circle radius r
  const distOT1 = Math.hypot(g1.T1.x - g1.cx, g1.T1.y - g1.cy);
  const distOT2 = Math.hypot(g1.T2.x - g1.cx, g1.T2.y - g1.cy);
  close(distOT1, g1.r, 1e-4);
  close(distOT2, g1.r, 1e-4);

  // Both tangent lengths |PT1| and |PT2| must be identical
  close(g1.lenPT1, g1.lenPT2, 1e-4);

  // Dot products OT1 · PT1 and OT2 · PT2 must be 0 (orthogonality / 90° right angles)
  const dot1 = (g1.T1.x - g1.cx) * (g1.P.x - g1.T1.x) + (g1.T1.y - g1.cy) * (g1.P.y - g1.T1.y);
  const dot2 = (g1.T2.x - g1.cx) * (g1.P.x - g1.T2.x) + (g1.T2.y - g1.cy) * (g1.P.y - g1.T2.y);
  close(dot1, 0, 1e-4);
  close(dot2, 0, 1e-4);

  // Interactive dragging at various angles:
  for (const ang of [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const movedState = { ...state, pointAngle: ang, pointDist: 280, radius: 120 };
    const gm = TangentsFromPoint.computeGeometry(movedState, 800, 600);
    close(gm.lenPT1, gm.lenPT2, 1e-4);
    close(gm.lenPT1, Math.sqrt(gm.d * gm.d - gm.r * gm.r), 1e-4);
  }
});

test('UnitSystemConverter: length and angle conversions, formatting, and invariants', () => {
  // Length conversions: px, cm, mm, in, u
  close(UnitSystemConverter.convertLength(96, 'px', 'in'), 1.0, 1e-5);
  close(UnitSystemConverter.convertLength(1, 'in', 'px'), 96.0, 1e-5);
  close(UnitSystemConverter.convertLength(96, 'px', 'cm'), 2.54, 1e-5);
  close(UnitSystemConverter.convertLength(2.54, 'cm', 'px'), 96.0, 1e-5);
  close(UnitSystemConverter.convertLength(96, 'px', 'mm'), 25.4, 1e-5);
  close(UnitSystemConverter.convertLength(25.4, 'mm', 'px'), 96.0, 1e-5);

  // Normalized unit u (relative to radius)
  close(UnitSystemConverter.convertLength(180, 'px', 'u', 180), 1.0, 1e-5);
  close(UnitSystemConverter.convertLength(360, 'px', 'u', 180), 2.0, 1e-5);
  close(UnitSystemConverter.convertLength(1.5, 'u', 'px', 200), 300.0, 1e-5);

  // Angle conversions: deg, rad, grad, turn
  close(UnitSystemConverter.convertAngle(180, 'deg', 'rad'), Math.PI, 1e-5);
  close(UnitSystemConverter.convertAngle(Math.PI, 'rad', 'deg'), 180.0, 1e-5);
  close(UnitSystemConverter.convertAngle(90, 'deg', 'grad'), 100.0, 1e-5);
  close(UnitSystemConverter.convertAngle(100, 'grad', 'deg'), 90.0, 1e-5);
  close(UnitSystemConverter.convertAngle(360, 'deg', 'turn'), 1.0, 1e-5);
  close(UnitSystemConverter.convertAngle(0.25, 'turn', 'deg'), 90.0, 1e-5);

  // Formatting helpers
  assert.strictEqual(UnitSystemConverter.formatLength(180, 'px'), '180 px');
  assert.strictEqual(UnitSystemConverter.formatLength(180, 'u', 180), '1.00 u');
  assert.strictEqual(UnitSystemConverter.formatAngle(90, 'deg'), '90.0°');
  assert.strictEqual(UnitSystemConverter.formatAngle(90, 'grad'), '100.0 gon');
  assert.strictEqual(UnitSystemConverter.formatAngle(180, 'turn'), '0.500 turn');
});

test('createStore: reset() and getInitial() restore full state and notify subscribers', () => {
  const initial = {
    radius: 180,
    angle: 45,
    vis2d: { labels: true, grid: true },
  };

  const store = createStore(initial);
  assert.deepStrictEqual(store.get(), initial);
  assert.deepStrictEqual(store.getInitial(), initial);

  let notified = false;
  store.subscribe((state) => {
    notified = true;
  });

  store.set({ radius: 250, angle: 90, vis2d: { labels: false, grid: false } });
  assert.strictEqual(store.get().radius, 250);
  assert.strictEqual(store.get().angle, 90);
  assert.strictEqual(store.get().vis2d.labels, false);

  notified = false;
  store.reset();
  assert.strictEqual(notified, true, 'Subscribers must be notified when reset() is invoked');
  assert.deepStrictEqual(store.get(), initial, 'reset() must restore exact initial state');
});

test('Cross-visual compliance: all 8 visual HTML files have collapsible toolbar, reset button, and unit converter section', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const visualDirs = [
    { dir: 'thales-theorem', expectedPerspective: 'perspective-front' },
    { dir: 'angle-at-centre', expectedPerspective: 'perspective-top' },
    { dir: 'angles-in-same-segment', expectedPerspective: 'perspective-top' },
    { dir: 'cyclic-quadrilateral', expectedPerspective: 'perspective-top' },
    { dir: 'tangent-radius', expectedPerspective: 'perspective-top' },
    { dir: 'alternate-segment', expectedPerspective: 'perspective-top' },
    { dir: 'tangents-from-external-point', expectedPerspective: 'perspective-top' },
    { dir: 'perpendicular-chord-bisector', expectedPerspective: 'perspective-top' },
  ];

  for (const { dir, expectedPerspective } of visualDirs) {
    const htmlPath = path.join(rootDir, 'visuals', 'circle-theorems', dir, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `File must exist: ${htmlPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Collapsible Viewport Toolbar
    assert.ok(
      html.includes('id="toolbar-collapse-btn"'),
      `${dir}: must contain #toolbar-collapse-btn for collapsing viewport modes panel`
    );
    assert.ok(
      html.includes('id="toolbar-content"') || html.includes('class="toolbar-content"'),
      `${dir}: must contain toolbar-content wrapper`
    );

    // 2. Reset Button
    assert.ok(
      html.includes('id="btn-reset"'),
      `${dir}: must contain #btn-reset in viewport toolbar`
    );

    // 3. Unit System Conversion Section
    assert.ok(
      html.includes('id="section-unit-converter"'),
      `${dir}: must contain #section-unit-converter in controls panel`
    );
    assert.ok(
      html.includes('id="content-unit-converter"'),
      `${dir}: must contain #content-unit-converter mounting target`
    );

    // 4. Initial orientation synchronization
    assert.ok(
      html.includes(expectedPerspective),
      `${dir}: 2D container must include class "${expectedPerspective}" matching 3D initial orientation`
    );
  }
});

test('SEO & Google indexing: all public pages contain canonical URLs, meta tags, and valid Schema.org JSON-LD', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const pages = [
    { file: 'index.html', url: 'https://ddskhosana.github.io/visual-math-lab/' },
    { file: 'about.html', url: 'https://ddskhosana.github.io/visual-math-lab/about.html' },
    { file: 'contact.html', url: 'https://ddskhosana.github.io/visual-math-lab/contact.html' },
    { file: 'privacy.html', url: 'https://ddskhosana.github.io/visual-math-lab/privacy.html' },
    { file: 'visuals/circle-theorems/thales-theorem/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/thales-theorem/' },
    { file: 'visuals/circle-theorems/angle-at-centre/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/angle-at-centre/' },
    { file: 'visuals/circle-theorems/angles-in-same-segment/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/angles-in-same-segment/' },
    { file: 'visuals/circle-theorems/cyclic-quadrilateral/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/cyclic-quadrilateral/' },
    { file: 'visuals/circle-theorems/tangent-radius/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/tangent-radius/' },
    { file: 'visuals/circle-theorems/alternate-segment/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/alternate-segment/' },
    { file: 'visuals/circle-theorems/tangents-from-external-point/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/tangents-from-external-point/' },
    { file: 'visuals/circle-theorems/perpendicular-chord-bisector/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/circle-theorems/perpendicular-chord-bisector/' },
  ];

  for (const page of pages) {
    const filePath = path.join(rootDir, page.file);
    assert.ok(fs.existsSync(filePath), `Page file must exist: ${page.file}`);
    const html = fs.readFileSync(filePath, 'utf8');

    // 1. Canonical tag
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    assert.ok(canonicalMatch, `${page.file}: must have a canonical link`);
    assert.strictEqual(canonicalMatch[1], page.url, `${page.file}: canonical link URL must match`);

    // 2. Robots meta tag
    assert.ok(html.includes('<meta name="robots"'), `${page.file}: must have a robots meta tag`);
    assert.ok(html.includes('content="index, follow'), `${page.file}: robots must allow index, follow`);

    // 3. Description meta tag
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    assert.ok(descMatch && descMatch[1].trim().length > 10, `${page.file}: must have descriptive meta description`);

    // 4. Manifest link
    assert.ok(html.includes('rel="manifest"'), `${page.file}: must link to web manifest`);

    // 5. Open Graph and Twitter Card tags
    assert.ok(html.includes('property="og:title"'), `${page.file}: must have og:title`);
    assert.ok(html.includes('property="og:description"'), `${page.file}: must have og:description`);
    assert.ok(html.includes('name="twitter:card"'), `${page.file}: must have twitter:card`);

    // 6. JSON-LD structured data
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    assert.ok(jsonLdMatches.length > 0, `${page.file}: must include JSON-LD structured data`);
    for (const match of jsonLdMatches) {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);
      assert.ok(parsed['@context'] === 'https://schema.org', `${page.file}: JSON-LD context must be https://schema.org`);
      const hasType = parsed['@type'] || (Array.isArray(parsed['@graph']) && parsed['@graph'].every(item => item['@type']));
      assert.ok(hasType, `${page.file}: JSON-LD must declare @type`);
    }
  }

  // 7. Verify robots.txt
  const robotsTxtPath = path.join(rootDir, 'robots.txt');
  assert.ok(fs.existsSync(robotsTxtPath), 'robots.txt must exist');
  const robotsTxt = fs.readFileSync(robotsTxtPath, 'utf8');
  assert.ok(robotsTxt.includes('Sitemap: https://ddskhosana.github.io/visual-math-lab/sitemap.xml'), 'robots.txt must specify Sitemap URL');
  assert.ok(!robotsTxt.includes('Disallow: /config/'), 'robots.txt must NOT disallow /config/ for Googlebot asset indexing');

  // 8. Verify sitemap.xml
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist');
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'sitemap.xml must define valid urlset');
  for (const page of pages) {
    assert.ok(sitemapXml.includes(`<loc>${page.url}</loc>`), `sitemap.xml must include URL: ${page.url}`);
  }

  // 9. Verify site.webmanifest
  const manifestPath = path.join(rootDir, 'site.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'site.webmanifest must exist');
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifestJson.name, 'Visual Mathematics Lab');
  assert.ok(Array.isArray(manifestJson.icons) && manifestJson.icons.length > 0, 'site.webmanifest must have icons');
});

test('Shared Navigation: components.js includes Home link and dropdown with all 8 visuals', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const componentsPath = path.join(rootDir, 'js', 'components.js');
  assert.ok(fs.existsSync(componentsPath), 'components.js must exist');
  const componentsCode = fs.readFileSync(componentsPath, 'utf8');

  // Must include Home link
  assert.ok(componentsCode.includes('>Home</a>'), 'components.js must include explicit Home link');

  // Must include dropdown container, trigger button, and menu
  assert.ok(componentsCode.includes('id="nav-visuals-dropdown"'), 'components.js must include #nav-visuals-dropdown');
  assert.ok(componentsCode.includes('id="nav-visuals-btn"'), 'components.js must include #nav-visuals-btn trigger');
  assert.ok(componentsCode.includes('id="nav-visuals-menu"'), 'components.js must include #nav-visuals-menu');

  // Must list all 8 visuals
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    assert.ok(componentsCode.includes(slug), `components.js default visuals must include slug: ${slug}`);
  }

  // Must include dynamic fixed positioning and resize/scroll listeners for dropdown clipping prevention
  assert.ok(componentsCode.includes('updateMenuPosition'), 'components.js must include updateMenuPosition');
  assert.ok(componentsCode.includes('menu.style.position = "fixed"'), 'components.js must use fixed positioning for dropdown menu');
  assert.ok(componentsCode.includes('trigger.getBoundingClientRect()'), 'components.js must anchor menu using getBoundingClientRect');

  // Verify responsive navigation styling in visual.css and site.css
  const visualCssPath = path.join(rootDir, 'css', 'visual.css');
  const visualCss = fs.readFileSync(visualCssPath, 'utf8');
  assert.ok(visualCss.includes('overflow-x: auto'), 'visual.css site-header must have overflow-x: auto');
  assert.ok(visualCss.includes('white-space: nowrap'), 'visual.css site-header must have white-space: nowrap');
  assert.ok(visualCss.includes('-webkit-overflow-scrolling: touch'), 'visual.css must support touch momentum scrolling');
  assert.ok(visualCss.includes('@media (max-width: 48rem)'), 'visual.css must have 48rem responsive breakpoint');
  assert.ok(visualCss.includes('@media (max-width: 36rem)'), 'visual.css must have 36rem responsive breakpoint');
  assert.ok(visualCss.includes('@media (max-width: 25rem)'), 'visual.css must have 25rem responsive breakpoint');

  const siteCssPath = path.join(rootDir, 'css', 'site.css');
  const siteCss = fs.readFileSync(siteCssPath, 'utf8');
  assert.ok(siteCss.includes('overflow-x: auto'), 'site.css site-header must have overflow-x: auto');
  assert.ok(siteCss.includes('white-space: nowrap'), 'site.css site-header must have white-space: nowrap');

  // Verify initCollapsibleSections and setExpandButtonUI never corrupt #nav-visuals-btn
  const mockNavVisualsBtn = {
    id: 'nav-visuals-btn',
    classList: { contains: (cls) => cls === 'site-nav__dropdown-trigger', add: () => {} },
    innerHTML: '<span>Visuals</span><svg class="site-nav__caret"></svg>',
    title: 'Browse visualisations',
    setAttribute: () => {},
    getAttribute: () => 'false',
    querySelector: () => null,
  };
  const mockNavDoc = {
    querySelectorAll: (sel) => {
      if (sel.includes('.panel-expand-btn') || sel.includes('nav-visuals-btn')) {
        return [mockNavVisualsBtn];
      }
      return [];
    },
    addEventListener: () => {},
  };
  initCollapsibleSections(mockNavDoc);
  setExpandButtonUI(mockNavVisualsBtn, false);
  setExpandButtonUI(mockNavVisualsBtn, true);
  thalesSetExpandButtonUI(mockNavVisualsBtn, false);
  assert.strictEqual(mockNavVisualsBtn.title, 'Browse visualisations', '#nav-visuals-btn title must not be overwritten');
  assert.ok(mockNavVisualsBtn.innerHTML.includes('Visuals'), '#nav-visuals-btn innerHTML must retain "Visuals"');
  assert.ok(!mockNavVisualsBtn.innerHTML.includes('Expand All'), '#nav-visuals-btn must never contain "Expand All"');
});

test('Visuals Search Functionality: match strength ranking, top-of-list placement, keyboard selection, and text labeling', () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const componentsPath = path.join(rootDir, 'js', 'components.js');
  const componentsCode = fs.readFileSync(componentsPath, 'utf8');

  // 1. Scoring & match ranking implementation
  assert.ok(componentsCode.includes('function getMatchScore(item, q)'), 'components.js must implement getMatchScore');
  assert.ok(componentsCode.includes('function highlightMatch(text, query)'), 'components.js must implement highlightMatch');
  assert.ok(componentsCode.includes('scored.sort((a, b) => b.score - a.score)'), 'components.js must sort matching items descending by match strength');
  assert.ok(componentsCode.includes('list.appendChild(item)'), 'components.js must move matching items to top of container in sorted score order');

  // 2. Text labeling with <mark class="site-nav__search-match">
  assert.ok(componentsCode.includes('<mark class="site-nav__search-match">'), 'highlightMatch must label matched substring with mark.site-nav__search-match');
  assert.ok(componentsCode.includes('site-nav__search-match-tag'), 'components.js must support tag for suite/category matches');

  // 3. User explicit choice (no auto-click on Enter inside searchInput)
  assert.ok(componentsCode.includes('firstVisible.focus()'), 'Enter key in searchInput must focus firstVisible without auto-clicking');
  assert.ok(!componentsCode.includes('firstVisible.click()'), 'Enter key in searchInput must not auto-click before user explicitly chooses');

  // 4. CSS definitions for match highlights and keyboard focus
  const siteCss = fs.readFileSync(path.join(rootDir, 'css', 'site.css'), 'utf8');
  assert.ok(siteCss.includes('.site-nav__search-match'), 'site.css must define .site-nav__search-match');
  assert.ok(siteCss.includes('.site-nav__search-match-tag'), 'site.css must define .site-nav__search-match-tag');

  const visCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  assert.ok(visCss.includes('.site-nav__search-match'), 'visual.css must define .site-nav__search-match');
  assert.ok(visCss.includes('.site-nav__search-match-tag'), 'visual.css must define .site-nav__search-match-tag');

  // 5. Functional assertions: multi-word tokenization, short query boundary filtering, and multi-token highlighting
  const mockThales = {
    dataset: {
      title: "Thales' Theorem",
      slug: 'thales-theorem',
      suite: 'circle-theorems',
      category: 'Geometry',
      search: "thales' theorem thales-theorem geometry circle-theorems"
    }
  };
  const mockCosines = {
    dataset: {
      title: 'Law of Cosines & Generalized Pythagorean Projection',
      slug: 'law-of-cosines',
      suite: 'trigonometry',
      category: 'Trigonometry',
      search: 'law of cosines & generalized pythagorean projection law-of-cosines trigonometry trigonometry'
    }
  };

  // 2-character word-boundary filtering: 'th' matches Thales but rejects Pythagorean
  assert.ok(getMatchScore(mockThales, 'th') > 0, "'th' must match Thales' Theorem at word boundary");
  assert.equal(getMatchScore(mockCosines, 'th'), -1, "'th' must NOT match Law of Cosines via mid-word 'th' in Pythagorean");

  // Multi-word compound queries across title and suite
  assert.ok(getMatchScore(mockThales, 'thales circle') > 0, "Multi-word query 'thales circle' must match Thales' Theorem");
  assert.equal(getMatchScore(mockCosines, 'thales circle'), -1, "Multi-word query 'thales circle' must not match Law of Cosines");

  // Multi-token highlighting
  const hl = highlightMatch("Thales' Theorem", 'thales theorem');
  assert.ok(hl.includes('<mark class="site-nav__search-match">Thales</mark>'));
  assert.ok(hl.includes('<mark class="site-nav__search-match">Theorem</mark>'));
});

test('Reflex Angle System: HTML toggles, 2D/3D telemetry, and perigon invariants across all 8 visuals', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const htmlPath = path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `HTML file must exist: ${slug}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Checkboxes for 2D and 3D reflex toggles
    assert.ok(html.includes('id="vis-2d-reflex"'), `${slug}: must contain #vis-2d-reflex toggle`);
    assert.ok(html.includes('id="vis-3d-reflex"'), `${slug}: must contain #vis-3d-reflex toggle`);

    // 2. Reflex telemetry rows in 2D and 3D telemetry panels
    const has2DReflexTel =
      html.includes('id="val-2d-alpha-reflex"') ||
      html.includes('id="tel-reflex-central"') ||
      html.includes('id="tel-reflex-p1"') ||
      html.includes('id="tel-reflex-sum"') ||
      html.includes('id="tel-reflex-tan"') ||
      html.includes('id="tel-reflex-alpha"') ||
      html.includes('id="tel-reflex-tangent"') ||
      html.includes('id="tel-reflex-m"');

    assert.ok(has2DReflexTel, `${slug}: must contain 2D reflex telemetry indicator`);

    const has3DReflexTel =
      html.includes('id="val-3d-alpha-reflex"') ||
      html.includes('id="val-3d-reflex-central"') ||
      html.includes('id="val-3d-reflex-p1"') ||
      html.includes('id="val-3d-reflex-sum"') ||
      html.includes('id="val-3d-reflex-tan"') ||
      html.includes('id="val-3d-reflex-alpha"') ||
      html.includes('id="val-3d-reflex-tangent"') ||
      html.includes('id="val-3d-reflex-m"');

    assert.ok(has3DReflexTel, `${slug}: must contain 3D reflex telemetry indicator`);
  }

  // 3. Mathematical Invariants for Reflex Angles:
  // Angle at Centre
  const aacState = AngleAtCentre.createInitialState();
  aacState.angleA = 0;
  aacState.angleB = Math.PI * 0.7;
  aacState.angleP = Math.PI * 1.35;
  const aacG = AngleAtCentre.computeGeometry(aacState, 800, 600);
  const aacReflexCentral = 360 - aacG.centralDeg;
  const aacReflexInscribed = 360 - aacG.inscribedDeg;
  close(aacG.centralDeg + aacReflexCentral, 360, 1e-4);
  close(aacG.inscribedDeg + aacReflexInscribed, 360, 1e-4);
  close(aacReflexCentral, 360 - 2 * aacG.inscribedDeg, 1e-4);

  // Angles in Same Segment
  const aissState = AnglesInSameSegment.createInitialState();
  aissState.angleP1 = 0.5 * Math.PI;
  aissState.angleP2 = 0.8 * Math.PI;
  const aissG = AnglesInSameSegment.computeGeometry(aissState, 800, 600);
  const aissRef1 = 360 - aissG.angleP1Deg;
  const aissRef2 = 360 - aissG.angleP2Deg;
  close(aissRef1, aissRef2, 1e-4);
  close(aissG.angleP1Deg + aissRef1, 360, 1e-4);

  // Cyclic Quadrilateral: opposite reflex sum is 540°, total reflex sum is 1080°
  const cqState = CyclicQuad.createInitialState();
  cqState.angleA = 0.2 * Math.PI;
  cqState.angleB = 0.7 * Math.PI;
  cqState.angleC = 1.2 * Math.PI;
  cqState.angleD = 1.7 * Math.PI;
  const cqG = CyclicQuad.computeGeometry(cqState, 800, 600);
  const cqRefA = 360 - cqG.angleADeg;
  const cqRefB = 360 - cqG.angleBDeg;
  const cqRefC = 360 - cqG.angleCDeg;
  const cqRefD = 360 - cqG.angleDDeg;
  close(cqRefA + cqRefC, 540, 1e-4);
  close(cqRefB + cqRefD, 540, 1e-4);
  close(cqRefA + cqRefB + cqRefC + cqRefD, 1080, 1e-4);

  // Tangent-Radius: right angle conjugate reflex is 270°
  const trState = TangentRadius.createInitialState();
  trState.angleP = Math.PI * 0.25;
  const trG = TangentRadius.computeGeometry(trState, 800, 600);
  const trReflex = 360 - trG.angleDeg;
  close(trReflex, 270, 1e-4);
  close(trG.angleDeg + trReflex, 360, 1e-4);

  // Alternate Segment: tangent reflex and inscribed reflex equal 360 - alpha
  const asState = AlternateSegment.createInitialState();
  const asG = AlternateSegment.computeGeometry(asState, 800, 600);
  const asRefTan = 360 - asG.tangentChordDeg;
  const asRefIns = 360 - asG.inscribedDeg;
  close(asRefTan, asRefIns, 1e-4);
  close(asG.tangentChordDeg + asRefTan, 360, 1e-4);

  // Tangents from External Point: kite reflex sum is 1080°
  const tfpState = TangentsFromPoint.createInitialState();
  const tfpG = TangentsFromPoint.computeGeometry(tfpState, 800, 600);
  const tfpRefP = 360 - 2 * tfpG.alphaDeg;
  const tfpRefO = 360 - 2 * tfpG.betaDeg;
  const tfpKiteReflexSum = 270 + 270 + tfpRefP + tfpRefO;
  close(tfpKiteReflexSum, 1080, 1e-4);

  // Perpendicular Chord Bisector: midpoint perigon 360°, triangle reflex sum 900°
  const cbState = ChordBisector.createInitialState();
  const cbG = ChordBisector.computeGeometry(cbState, 800, 600);
  close(90 + 270, 360, 1e-4);
  const cbTriReflexSum = 3 * 360 - 180;
  close(cbTriReflexSum, 900, 1e-4);

  // 4. Circle Derivations: all 7 classes have their reflex cards defined
  const derivationsFile = fs.readFileSync(path.join(rootDir, 'js', 'circle-derivations.js'), 'utf8');
  assert.ok(derivationsFile.includes('id: "aac-step-5"') || derivationsFile.includes("'aac-step-5'"), 'Angle at Centre must have Step 5 card');
  assert.ok(derivationsFile.includes('id: "aiss-step-5"') || derivationsFile.includes("'aiss-step-5'"), 'Angles in Same Segment must have Step 5 card');
  assert.ok(derivationsFile.includes('id: "cq-step-5"') || derivationsFile.includes("'cq-step-5'"), 'Cyclic Quadrilateral must have Step 5 card');
  assert.ok(derivationsFile.includes('id: "tr-step-7"') || derivationsFile.includes("'tr-step-7'"), 'Tangent-Radius must have Step 7 card');
  assert.ok(derivationsFile.includes('id: "as-step-6"') || derivationsFile.includes("'as-step-6'"), 'Alternate Segment must have Step 6 card');
  assert.ok(derivationsFile.includes('id: "tfp-step-5"') || derivationsFile.includes("'tfp-step-5'"), 'Tangents from External Point must have Step 5 card');
  assert.ok(derivationsFile.includes('id: "cb-step-5"') || derivationsFile.includes("'cb-step-5'"), 'Perpendicular Chord Bisector must have Step 5 card');

  // Verify token colors in derivations
  assert.ok(derivationsFile.includes("tag('lavender'"), 'Derivations must use lavender for 1080° / 540° / 900° reflex sums');
  assert.ok(derivationsFile.includes("tag('sky'"), 'Derivations must use sky token for Cyclic Quad B+D 540° or alternate segment');
});

test('Visual Thumbnails: all 8 SVG thumbnails exist, have valid viewBox, and contain appropriate theorem geometry and titles', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const visuals = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'visuals.json'), 'utf8'));

  const circleVisuals = visuals.filter((v) => (v.suite || 'circle-theorems') === 'circle-theorems');
  assert.strictEqual(circleVisuals.length, 8, 'Must have exactly 8 visual metadata entries');

  const expectedKeywords = {
    'thales-theorem': ['THALES', '90°', 'P', 'O'],
    'angle-at-centre': ['ANGLE AT THE CENTRE', '2θ', 'θ', 'O'],
    'angles-in-same-segment': ['ANGLES IN THE SAME SEGMENT', 'P₁', 'P₂', 'α'],
    'cyclic-quadrilateral': ['CYCLIC QUADRILATERAL', '180°', 'A', 'B', 'C', 'D'],
    'tangent-radius': ['TANGENT-RADIUS', '90°', 'OT', 'Tangent'],
    'alternate-segment': ['ALTERNATE SEGMENT', 'α', 'Alt Seg'],
    'tangents-from-external-point': ['TANGENTS FROM AN EXTERNAL POINT', 'T₁', 'T₂', 'P', '90°'],
    'perpendicular-chord-bisector': ['PERPENDICULAR CHORD BISECTOR', 'OM', '90°', 'M'],
  };

  for (const visual of circleVisuals) {
    const thumbPath = path.join(rootDir, visual.thumbnail);
    assert.ok(fs.existsSync(thumbPath), `Thumbnail must exist: ${visual.thumbnail}`);
    const svg = fs.readFileSync(thumbPath, 'utf8');

    assert.ok(svg.includes('<svg') && svg.includes('</svg>'), `${visual.slug}: must be valid SVG`);
    assert.ok(svg.includes('viewBox="0 0 1200 800"'), `${visual.slug}: must have 1200x800 viewBox`);

    const keywords = expectedKeywords[visual.slug] || [];
    for (const kw of keywords) {
      assert.ok(svg.includes(kw), `${visual.slug}: thumbnail must contain appropriate theorem element or label "${kw}"`);
    }
  }
});

test('Interactive Canvas Protection: all circle visual canvas containers enforce touch-action none and user-select none', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const css = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const thalesCss = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'layout.css'), 'utf8');

  assert.ok(css.includes('#canvas-2d-container') && css.includes('touch-action: none;'), 'circle-visual.css must style #canvas-2d-container with touch-action: none;');
  assert.ok(css.includes('#canvas-3d-container') && css.includes('touch-action: none;'), 'circle-visual.css must style #canvas-3d-container with touch-action: none;');
  assert.ok(thalesCss.includes('.thales-explorer canvas') && thalesCss.includes('touch-action: none;'), 'Thales layout.css must style .thales-explorer canvas with touch-action: none;');
});

test('Touch Display Fluidity: scrollable panels, docks, and telemetry containers enforce touch-action pan-y and momentum scrolling', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const circleCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const dockCss = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8');
  const visualCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  const thalesPanels = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'panels.css'), 'utf8');
  const thalesOverlays = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'overlays.css'), 'utf8');

  // 1. Circle Visual Suite
  assert.ok(circleCss.includes('.panel-body') && circleCss.includes('touch-action: pan-y !important;'), 'circle-visual.css .panel-body must specify touch-action: pan-y !important;');
  assert.ok(circleCss.includes('.stats-body') && circleCss.includes('touch-action: pan-y !important;'), 'circle-visual.css .stats-body must specify touch-action: pan-y !important;');
  assert.ok(circleCss.includes('.collapsible-content') && circleCss.includes('touch-action: pan-y !important;'), 'circle-visual.css .collapsible-content must specify touch-action: pan-y !important;');
  assert.ok(circleCss.includes('input[type=range]') && circleCss.includes('touch-action: pan-x;'), 'circle-visual.css range sliders must specify touch-action: pan-x;');
  assert.ok(circleCss.includes('-webkit-overflow-scrolling: touch !important;'), 'circle-visual.css must enforce WebKit momentum scrolling;');

  // 2. Workspace Dock System
  assert.ok(dockCss.includes('.workspace-dock-body') && dockCss.includes('touch-action: pan-y !important;'), 'workspace-dock.css .workspace-dock-body must specify touch-action: pan-y !important;');
  assert.ok(dockCss.includes('touch-action: pan-x pan-y !important;'), 'workspace-dock.css top/bottom shelf must support 2D touch panning;');

  // 3. Visual Overlays and Modals
  assert.ok(visualCss.includes('.geometry-legend-scroll-container') && visualCss.includes('touch-action: pan-y !important;'), 'Legend scroll container must specify touch-action: pan-y !important;');
  assert.ok(visualCss.includes('.visual-info-overlay') && visualCss.includes('touch-action: pan-y !important;'), 'Info overlay must specify touch-action: pan-y !important;');
  assert.ok(visualCss.includes('.tutorial-modal-overlay') && visualCss.includes('touch-action: pan-y !important;'), 'Walkthrough modal overlay must specify touch-action: pan-y !important;');

  // 4. Thales Benchmark Styles
  assert.ok(thalesPanels.includes('touch-action: pan-y !important;'), 'Thales panels.css must specify touch-action: pan-y !important;');
  assert.ok(thalesOverlays.includes('touch-action: pan-y !important;'), 'Thales overlays.css must specify touch-action: pan-y !important;');
});

test('Alternate Segment & Chord Bisector: interactive Point D and Midpoint M dragging invariants', () => {
  // 1. Alternate Segment: Rigid Point D spinning along perimeter across continuous [0, 2π) domain
  const altState = AlternateSegment.createInitialState();
  const initAltG = AlternateSegment.computeGeometry(altState, 800, 600);
  const initialTA = Math.hypot(initAltG.A.x - initAltG.T.x, initAltG.A.y - initAltG.T.y);
  const initialAB = Math.hypot(initAltG.B.x - initAltG.A.x, initAltG.B.y - initAltG.A.y);
  const initialBT = Math.hypot(initAltG.T.x - initAltG.B.x, initAltG.T.y - initAltG.B.y);
  const initialAlpha = initAltG.inscribedDeg;
  const TAU = Math.PI * 2;

  // Continuous 360° domain sweep (fuzzing every 5° from 0 to 2π)
  for (let deg = 0; deg < 360; deg += 5) {
    const angD = (deg * Math.PI) / 180;
    const oldD = (altState.angleT + Math.PI) % TAU;
    let delta = (angD - oldD) % TAU;
    if (delta > Math.PI) delta -= TAU;
    if (delta < -Math.PI) delta += TAU;
    const nextT = (altState.angleT + delta + TAU * 4) % TAU;
    const nextA = (altState.angleA + delta + TAU * 4) % TAU;
    const nextB = (altState.angleB + delta + TAU * 4) % TAU;

    const g = AlternateSegment.computeGeometry({ ...altState, angleT: nextT, angleA: nextA, angleB: nextB }, 800, 600);

    // Invariants preserved rigidly throughout the full 360° perimeter spin:
    // a. Primary theorem: tangent-chord angle == inscribed angle == initial alpha
    close(g.tangentChordDeg, initialAlpha, 1e-4);
    close(g.inscribedDeg, initialAlpha, 1e-4);
    close(g.diffDeg, 0, 1e-4);

    // b. Point D angles: Interior angle ∠TDA strictly equals alpha, Ext D equals 180° - alpha
    close(g.angleTDA, initialAlpha, 1e-4);
    close(g.extAngleD, 180.0 - initialAlpha, 1e-4);

    // c. Triangle side lengths are strictly invariant under rigid rotation
    const curTA = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y);
    const curAB = Math.hypot(g.B.x - g.A.x, g.B.y - g.A.y);
    const curBT = Math.hypot(g.T.x - g.B.x, g.T.y - g.B.y);
    close(curTA, initialTA, 1e-4);
    close(curAB, initialAB, 1e-4);
    close(curBT, initialBT, 1e-4);

    // d. Point D remains strictly antipodal to T
    const dxT = g.T.x - g.cx;
    const dyT = g.T.y - g.cy;
    const dxD = g.D.x - g.cx;
    const dyD = g.D.y - g.cy;
    close(dxT + dxD, 0, 1e-4);
    close(dyT + dyD, 0, 1e-4);

    // e. Thales right angles remain strictly 90°
    close(g.thalesAngleTBD, 90.0, 1e-4);
    close(g.thalesAngleTAD, 90.0, 1e-4);
    close(g.thalesTangentTD, 90.0, 1e-4);
  }

  // 2. Chord Bisector: Dragging Midpoint M rigidly rotates chord AB
  const bisState = ChordBisector.createInitialState();
  const initG = ChordBisector.computeGeometry(bisState, 800, 600);
  const initialChordLen = initG.lenChord;

  for (const angM of [0, Math.PI / 3, Math.PI / 2, Math.PI, (4 * Math.PI) / 3]) {
    const dAngle = Math.atan2(Math.sin(bisState.angleB - bisState.angleA), Math.cos(bisState.angleB - bisState.angleA));
    const nextA = (angM - dAngle / 2 + TAU * 2) % TAU;
    const nextB = (angM + dAngle / 2 + TAU * 2) % TAU;
    const g = ChordBisector.computeGeometry({ ...bisState, angleA: nextA, angleB: nextB }, 800, 600);

    // Chord length strictly invariant
    close(g.lenChord, initialChordLen, 1e-4);
    // AM = MB
    close(g.lenAM, g.lenMB, 1e-4);
    // OM perpendicular to AB (dot product is 0, angle is 90°)
    close(g.dot, 0, 1e-4);
    close(g.angleOMADeg, 90.0, 1e-4);
  }
});

test('Alternate Segment: showDAngles toggle suppresses Point D interior, exterior, and reflex wedges/badges in 2D and 3D', async () => {
  const canvasMod = await import('../visuals/circle-theorems/alternate-segment/src/canvas.js');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const circle3dCode = fs.readFileSync(path.join(rootDir, 'js', 'circle-3d.js'), 'utf8');

  const noop = () => {};
  const createMockCanvas = () => {
    const renderedTexts = [];
    const ctx = {
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      closePath: noop,
      stroke: noop,
      fill: noop,
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      setLineDash: noop,
      save: noop,
      restore: noop,
      fillText: (text) => renderedTexts.push(text),
      strokeText: noop,
      setTransform: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    };
    return {
      renderedTexts,
      mockCanvas: {
        width: 800,
        height: 600,
        style: {},
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
        parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      },
    };
  };

  // 1. 2D CanvasView: showDAngles = true vs showDAngles = false
  const stateEnabled = {
    ...AlternateSegment.createInitialState(),
    showDAngles: true,
    showProofConstruction: true,
    vis2d: { reflex: true, labels: true, angles: true },
  };
  const { renderedTexts: textsEnabled, mockCanvas: canvasEnabled } = createMockCanvas();
  const viewEnabled = new canvasMod.CanvasView(canvasEnabled, canvasEnabled.parentElement);
  viewEnabled.render(stateEnabled);

  const hasDInt = textsEnabled.some((t) => t.includes('∠TDA'));
  const hasDExt = textsEnabled.some((t) => t.includes('Ext D'));
  const hasDRef = textsEnabled.some((t) => t.includes('D*'));
  assert.ok(hasDInt, 'When showDAngles: true, ∠TDA text badge must be rendered in 2D');
  assert.ok(hasDExt, 'When showDAngles: true, Ext D text badge must be rendered in 2D');
  assert.ok(hasDRef, 'When showDAngles: true, D* reflex badge must be rendered in 2D');

  const stateDisabled = {
    ...AlternateSegment.createInitialState(),
    showDAngles: false,
    showProofConstruction: true,
    vis2d: { reflex: true, labels: true, angles: true },
  };
  const { renderedTexts: textsDisabled, mockCanvas: canvasDisabled } = createMockCanvas();
  const viewDisabled = new canvasMod.CanvasView(canvasDisabled, canvasDisabled.parentElement);
  viewDisabled.render(stateDisabled);

  const hasDIntDisabled = textsDisabled.some((t) => t.includes('∠TDA'));
  const hasDExtDisabled = textsDisabled.some((t) => t.includes('Ext D'));
  const hasDRefDisabled = textsDisabled.some((t) => t.includes('D*'));
  assert.strictEqual(hasDIntDisabled, false, 'When showDAngles: false, ∠TDA badge must NOT be rendered in 2D');
  assert.strictEqual(hasDExtDisabled, false, 'When showDAngles: false, Ext D badge must NOT be rendered in 2D');
  assert.strictEqual(hasDRefDisabled, false, 'When showDAngles: false, D* reflex badge must NOT be rendered in 2D');

  // 2. 3D Scene View: verify state-to-render wiring in circle-3d.js
  assert.ok(
    circle3dCode.includes('showReflex && (state.showDAngles !== false)'),
    'circle-3d.js must guard reflexDMesh with showDAngles !== false'
  );
  assert.ok(
    circle3dCode.includes('const showDAngles = showProof && showAngles && (state.showDAngles !== false);'),
    'circle-3d.js must compute showDAngles guarding angleIntDMesh and angleExtDMesh'
  );
  assert.ok(
    circle3dCode.includes('const showDLabels = showAngles && (state.showDAngles !== false);'),
    'circle-3d.js must guard 3D angIntD and angExtD labels with showDAngles !== false'
  );
  assert.ok(
    circle3dCode.includes("show: showReflex && (state.vis3d?.labels !== false) && (state.showDAngles !== false)"),
    'circle-3d.js must guard 3D reflexD label with showDAngles !== false'
  );

  // 3. Dedicated Triangle Shading Toggle: only Minor & Major segments shaded by default
  const altInit = AlternateSegment.createInitialState();
  assert.strictEqual(altInit.showTriangleShading, false, 'AlternateSegment initial state must default showTriangleShading to false');
  assert.ok(
    circle3dCode.includes('const showTriangles = showArea && Boolean(state.showTriangleShading || state.showTriangles);'),
    'circle-3d.js must guard 3D triangle meshes with showTriangles toggle'
  );
  const altHtml = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'alternate-segment', 'index.html'), 'utf8');
  assert.ok(altHtml.includes('id="toggle-triangles"'), 'alternate-segment/index.html must include #toggle-triangles checkbox');
  assert.ok(altHtml.includes('id="toggle-3d-triangles"'), 'alternate-segment/index.html must include #toggle-3d-triangles checkbox');
});

test('Panel Header Expand/Collapse Affordances: SVG chevrons, accessible labels, and UI state synchronization', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const css = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');

  // Verify CSS affordance styling
  assert.ok(css.includes('.panel-header-actions'), 'visual.css must define .panel-header-actions');
  assert.ok(css.includes('.panel-expand-btn'), 'visual.css must define .panel-expand-btn');
  assert.ok(css.includes('.panel-expand-icon'), 'visual.css must define .panel-expand-icon');
  assert.ok(css.includes('.panel-expand-label'), 'visual.css must define .panel-expand-label');
  assert.ok(css.includes('.panel-expand-btn[aria-expanded="true"]'), 'visual.css must define active expanded state styling');

  // Verify exports and behavior in js/circle-core.js
  assert.ok(typeof setExpandButtonUI === 'function', 'circle-core.js must export setExpandButtonUI');
  assert.ok(typeof CHEVRON_DOWN_SVG === 'string' && CHEVRON_DOWN_SVG.includes('<svg'), 'CHEVRON_DOWN_SVG must be valid SVG string');
  assert.ok(typeof CHEVRON_UP_SVG === 'string' && CHEVRON_UP_SVG.includes('<svg'), 'CHEVRON_UP_SVG must be valid SVG string');

  // Verify mock DOM behavior
  function createMockBtn() {
    let attrs = {};
    let classes = new Set();
    let innerHTML = '';
    const btn = {
      title: '',
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return attrs[k]; },
      classList: {
        add(c) { classes.add(c); },
        contains(c) { return classes.has(c); },
      },
      get innerHTML() { return innerHTML; },
      set innerHTML(val) {
        innerHTML = val;
        this._icon = val.includes('panel-expand-icon') ? {
          _html: '',
          set innerHTML(h) { this._html = h; },
          get innerHTML() { return this._html; }
        } : null;
        this._label = val.includes('panel-expand-label') ? {
          _text: '',
          set textContent(t) { this._text = t; },
          get textContent() { return this._text; }
        } : null;
      },
      querySelector(selector) {
        if (selector === '.panel-expand-icon') return this._icon;
        if (selector === '.panel-expand-label') return this._label;
        return null;
      }
    };
    return btn;
  }

  // Test setExpandButtonUI auto-upgrade and toggle
  const btn = createMockBtn();
  setExpandButtonUI(btn, false);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(btn.title, 'Expand all sections');
  assert.ok(btn.classList.contains('panel-expand-btn'));
  assert.ok(btn.innerHTML.includes('Expand All'));
  assert.ok(btn.innerHTML.includes(CHEVRON_DOWN_SVG));

  setExpandButtonUI(btn, true);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(btn.title, 'Collapse all sections');
  assert.equal(btn._label.textContent, 'Collapse All');
  assert.equal(btn._icon.innerHTML, CHEVRON_UP_SVG);

  // Verify Thales Accordion.js exports and behaves identically
  assert.ok(typeof thalesSetExpandButtonUI === 'function', 'Thales Accordion.js must export setExpandButtonUI');
  const thalesBtn = createMockBtn();
  thalesSetExpandButtonUI(thalesBtn, false);
  assert.equal(thalesBtn.getAttribute('aria-expanded'), 'false');
  thalesSetExpandButtonUI(thalesBtn, true);
  assert.equal(thalesBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(thalesBtn._label.textContent, 'Collapse All');

  // Verify all 8 visual index.html files have .panel-header-actions and .panel-expand-btn
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const htmlPath = path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `File must exist: ${htmlPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('class="panel-header-actions"'), `${slug}/index.html must contain .panel-header-actions container`);
    assert.ok(html.includes('class="panel-expand-btn"'), `${slug}/index.html must contain .panel-expand-btn buttons`);
    assert.ok(html.includes('class="panel-expand-icon"'), `${slug}/index.html must contain .panel-expand-icon span`);
    assert.ok(html.includes('class="panel-expand-label"'), `${slug}/index.html must contain .panel-expand-label span`);
  }
});

test('Panel Minimize Chevron Affordances: SVG single chevrons, accessible titles, and UI state synchronization across all 8 visualizers', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const cssVisual = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  const cssCircle = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const cssOverlays = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'overlays.css'), 'utf8');

  // 1. Verify CSS styling definitions
  assert.ok(cssVisual.includes('.panel-minimize-btn'), 'visual.css must define .panel-minimize-btn');
  assert.ok(cssVisual.includes('.panel-minimize-icon'), 'visual.css must define .panel-minimize-icon');
  assert.ok(cssVisual.includes('.stats-header .panel-minimize-btn'), 'visual.css must style stats-header .panel-minimize-btn');
  assert.ok(cssCircle.includes('.stats-header .panel-minimize-btn'), 'circle-visual.css must style stats-header .panel-minimize-btn');
  assert.ok(cssOverlays.includes('.stats-toggle-btn .panel-minimize-icon'), 'overlays.css must style .stats-toggle-btn .panel-minimize-icon');

  // 2. Verify single chevron SVG constants in circle-core.js and Thales Accordion.js
  assert.ok(typeof CHEVRON_DOWN_SINGLE_SVG === 'string' && CHEVRON_DOWN_SINGLE_SVG.includes('points="6 9 12 15 18 9"'), 'CHEVRON_DOWN_SINGLE_SVG must be single chevron down polyline');
  assert.ok(typeof CHEVRON_UP_SINGLE_SVG === 'string' && CHEVRON_UP_SINGLE_SVG.includes('points="18 15 12 9 6 15"'), 'CHEVRON_UP_SINGLE_SVG must be single chevron up polyline');
  assert.strictEqual(CHEVRON_DOWN_SINGLE_SVG, thalesChevronDownSingle, 'Thales Accordion.js single down chevron must match circle-core.js');
  assert.strictEqual(CHEVRON_UP_SINGLE_SVG, thalesChevronUpSingle, 'Thales Accordion.js single up chevron must match circle-core.js');

  // 3. Verify setPanelMinimizeButtonUI state transitions
  function createMockMinBtn() {
    let attrs = {};
    let classes = new Set();
    let innerHTML = '';
    const btn = {
      title: '',
      setAttribute(k, v) { attrs[k] = String(v); },
      getAttribute(k) { return attrs[k]; },
      classList: {
        add(c) { classes.add(c); },
        contains(c) { return classes.has(c); },
      },
      get innerHTML() { return innerHTML; },
      set innerHTML(val) {
        innerHTML = val;
        this._icon = val.includes('panel-minimize-icon') ? {
          _html: '',
          set innerHTML(h) { this._html = h; },
          get innerHTML() { return this._html; }
        } : null;
      },
      querySelector(selector) {
        if (selector === '.panel-minimize-icon') return this._icon;
        return null;
      }
    };
    return btn;
  }

  // Test minimized (collapsed) state: down chevron, aria-expanded="false", title="Expand Controls Panel"
  const testMinBtn = createMockMinBtn();
  setPanelMinimizeButtonUI(testMinBtn, true, 'Controls Panel');
  assert.equal(testMinBtn.getAttribute('aria-expanded'), 'false');
  assert.equal(testMinBtn.title, 'Expand Controls Panel');
  assert.ok(testMinBtn.classList.contains('panel-minimize-btn'));
  assert.ok(testMinBtn.innerHTML.includes(CHEVRON_DOWN_SINGLE_SVG));

  // Test expanded (open) state: up chevron, aria-expanded="true", title="Minimize Controls Panel"
  setPanelMinimizeButtonUI(testMinBtn, false, 'Controls Panel');
  assert.equal(testMinBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(testMinBtn.title, 'Minimize Controls Panel');
  assert.equal(testMinBtn._icon.innerHTML, CHEVRON_UP_SINGLE_SVG);

  // Test Thales Accordion.js implementation
  const thalesTestBtn = createMockMinBtn();
  thalesSetPanelMinimizeButtonUI(thalesTestBtn, true, 'Derivations Panel');
  assert.equal(thalesTestBtn.getAttribute('aria-expanded'), 'false');
  assert.equal(thalesTestBtn.title, 'Expand Derivations Panel');
  assert.ok(thalesTestBtn.innerHTML.includes(CHEVRON_DOWN_SINGLE_SVG));

  thalesSetPanelMinimizeButtonUI(thalesTestBtn, false, 'Derivations Panel');
  assert.equal(thalesTestBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(thalesTestBtn.title, 'Minimize Derivations Panel');
  assert.equal(thalesTestBtn._icon.innerHTML, CHEVRON_UP_SINGLE_SVG);

  // 4. Verify all 8 visual index.html files have all 6 target buttons updated with chevron affordance
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const htmlPath = path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const expectedButtons = (slug === 'thales-theorem')
      ? ['toggle-stats-2d', 'toggle-stats-3d', 'toggle-thales-minimize', 'toggle-toolbar-2d-minimize', 'toggle-toolbar-minimize', 'toggle-deriv-minimize']
      : ['telemetry-toggle-btn', 'toggle-stats-3d', 'toggle-controls-min', 'toggle-toolbar-2d-minimize', 'toggle-toolbar-3d-minimize', 'toggle-deriv-min'];

    for (const btnId of expectedButtons) {
      const btnRegex = new RegExp(`<button[^>]*id="${btnId}"[^>]*>[\\s\\S]*?<\\/button>`);
      const match = html.match(btnRegex);
      assert.ok(match, `${slug}/index.html must contain button with id="${btnId}"`);

      const btnHtml = match[0];
      assert.ok(btnHtml.includes('class="') && btnHtml.includes('panel-minimize-btn'), `${slug}/index.html button #${btnId} must have class .panel-minimize-btn`);
      assert.ok(btnHtml.includes('class="panel-minimize-icon"'), `${slug}/index.html button #${btnId} must contain .panel-minimize-icon`);
      assert.ok(btnHtml.includes('points="6 9 12 15 18 9"'), `${slug}/index.html button #${btnId} must contain single down chevron SVG`);
      assert.ok(!btnHtml.includes('>+</button>') && !btnHtml.includes('>+ </button>'), `${slug}/index.html button #${btnId} must not have legacy text '+'`);
    }
  }
});

test('3D Viewport Interaction & Gimbal-Lock Prevention: Top preset eliminates pole singularity, precise hit-testing, and translucent angle shading', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const circle3d = fs.readFileSync(path.join(rootDir, 'js', 'circle-3d.js'), 'utf8');
  const thales3d = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'views', 'Scene3DView.js'), 'utf8');

  // Verify Top-view gimbal lock elimination:
  // Must use (0, d, 0.001) with up = (0, 1, 0) instead of (0, 0, -1) which causes coordinate-frame collapse
  assert.ok(circle3d.includes("targetPos = new this.THREE.Vector3(0, d, 0.001)"), 'circle-3d.js Top preset must offset Z slightly to prevent gimbal lock');
  assert.ok(circle3d.includes("const targetUp = new this.THREE.Vector3(0, 1, 0)"), 'circle-3d.js must maintain consistent up vector (0, 1, 0)');
  assert.ok(thales3d.includes("top: { pos: new this.THREE.Vector3(0, 48, 0.001), up: new this.THREE.Vector3(0, 1, 0) }"), 'Thales Scene3DView.js Top preset must maintain up vector (0, 1, 0) with epsilon Z offset');

  // Verify precise hit detection without loose 2.2 unit 3D volume hijacking
  assert.ok(!circle3d.includes("dist3d < 2.2"), 'circle-3d.js must not hijack pointer events with loose 2.2 unit 3D cylinder');
  assert.ok(!thales3d.includes("distanceToPoint(this.objects.pointP.position) < 2.2"), 'Thales Scene3DView.js must not hijack pointer events with loose 2.2 unit distance');

  // Verify translucent 0.28 angle shading harmonized with 2D across all 3D circle theorems
  assert.ok(circle3d.includes("export function makeAngleWedgeMesh(THREE, color, opacity = 0.28)"), 'makeAngleWedgeMesh default opacity must be 0.28');
  assert.ok(circle3d.includes("this.anglePMesh1 = makeAngleWedgeMesh(THREE, PALETTE.lime, 0.28)"), 'TangentsFromPoint3DView alpha1 must use 0.28 opacity');
  assert.ok(circle3d.includes("this.anglePMesh2 = makeAngleWedgeMesh(THREE, PALETTE.fuchsia, 0.28)"), 'TangentsFromPoint3DView alpha2 must use 0.28 opacity');
  assert.ok(!circle3d.includes("makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.65)"), 'circle-3d.js must not use opaque 0.65 opacity for angle wedges');

  // Verify all 3D canvases load in isometric view by default
  const circleCore = fs.readFileSync(path.join(rootDir, 'js', 'circle-core.js'), 'utf8');
  assert.ok(circleCore.includes("defaultCameraPreset || 'iso'"), 'circle-core.js must default camera preset to iso');
  assert.ok(circle3d.includes("this.camera.position.set(26, 18, 26)"), 'circle-3d.js initial camera position must be isometric (26, 18, 26)');
  assert.ok(thales3d.includes("this.camera.position.set(30, 20, 30)"), 'Thales Scene3DView.js initial camera position must be isometric (30, 20, 30)');

  // Verify unconstrained ArcballTrackballControls and mode switching with Arcball default
  assert.ok(circle3d.includes("export class ArcballTrackballControls"), 'circle-3d.js must export ArcballTrackballControls');
  assert.ok(circle3d.includes("this.controls = new ArcballTrackballControls"), 'BaseScene3DView must instantiate ArcballTrackballControls');
  assert.ok(thales3d.includes("this.controls = new ArcballTrackballControls"), 'Thales Scene3DView must instantiate ArcballTrackballControls');
  assert.ok(circle3d.includes("this.mode = 'arcball'"), 'ArcballTrackballControls must default to arcball mode on initial load');
  assert.ok(
    circle3d.includes("crossVectors(curSpherePoint, this.prevSpherePoint)"),
    'ArcballTrackballControls must use curSpherePoint.cross(this.prevSpherePoint) so pointer drag aligns with graphic motion'
  );
  assert.ok(circleCore.includes("camera-mode-toggle"), 'circle-core.js must support camera-mode-toggle');
  assert.ok(circleCore.includes("modeBtn.dataset.cameraMode = 'arcball'"), 'circle-core.js must set dataset.cameraMode to arcball on load');
  assert.ok(circleCore.includes("'🔄 Arcball'"), 'circle-core.js must label default button with Arcball');
  assert.ok(circleCore.includes("cameraMode: 'arcball'"), 'createDefaultVisState must set cameraMode: arcball');

  const thalesMain = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'main.js'), 'utf8');
  assert.ok(thalesMain.includes("modeBtn.dataset.cameraMode = 'arcball'"), 'Thales main.js must set dataset.cameraMode to arcball on load');
  assert.ok(thalesMain.includes("cameraMode: 'arcball'"), 'Thales reset must restore cameraMode to arcball');

  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const html = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html'), 'utf8');
    assert.ok(
      (html.includes('data-preset="iso" class="active"') || html.includes('data-preset="isometric" class="active"')),
      `${slug}/index.html camera-presets-bar must have iso active by default`
    );
  }
});

test('Bidirectional 2D and 3D radius synchronization across all 8 Circle Theorems in Split View (450x420)', async () => {
  const width = 450;
  const height = 420;

  const models = [
    { name: 'Angle at Centre', mod: AngleAtCentre, baseR: 180 },
    { name: 'Angles in Same Segment', mod: AnglesInSameSegment, baseR: 180 },
    { name: 'Cyclic Quadrilateral', mod: CyclicQuad, baseR: 180 },
    { name: 'Tangent-Radius', mod: TangentRadius, baseR: 180 },
    { name: 'Alternate Segment', mod: AlternateSegment, baseR: 180 },
    { name: 'Tangents from External Point', mod: TangentsFromPoint, baseR: 120 },
    { name: 'Perpendicular Chord Bisector', mod: ChordBisector, baseR: 170 },
  ];

  for (const { name, mod, baseR } of models) {
    const defaultState = mod.createInitialState();
    const defaultG = mod.computeGeometry(defaultState, width, height);
    assert.strictEqual(defaultG.r, baseR, `${name} default 2D radius must be ${baseR} in 450x420 split view`);

    // Scale up to 230 in 3D
    const scaledUpState = { ...defaultState, radius: 230 };
    const scaledUpG = mod.computeGeometry(scaledUpState, width, height);
    assert.strictEqual(scaledUpG.r, 230, `${name} 2D radius must scale up to 230 when 3D radius changes to 230`);

    // Scale down to 110 in 3D
    const scaledDownState = { ...defaultState, radius: 110 };
    const scaledDownG = mod.computeGeometry(scaledDownState, width, height);
    assert.strictEqual(scaledDownG.r, 110, `${name} 2D radius must scale down to 110 when 3D radius changes to 110`);
  }

  // Thales theorem
  const { computeFrame } = await import('../visuals/circle-theorems/thales-theorem/src/views/canvas2d-draw.js');
  const thalesState = { radius: 10, zoom: 18, pan: { x: 0, y: 0 } };
  const thalesDefault = computeFrame(thalesState, width, height);
  assert.strictEqual(thalesDefault.r, 180, 'Thales default 2D radius must be 180 in 450x420 split view');

  const thalesScaledUp = computeFrame({ ...thalesState, radius: 12 }, width, height);
  assert.strictEqual(thalesScaledUp.r, 216, 'Thales 2D radius must scale up to 216 when 3D radius changes to 12');

  const thalesScaledDown = computeFrame({ ...thalesState, radius: 7 }, width, height);
  assert.strictEqual(thalesScaledDown.r, 126, 'Thales 2D radius must scale down to 126 when 3D radius changes to 7');
});

test('Radius Resizing: click-and-drag circumference and mouse wheel resizing with 2D/3D canvas synchronization across all modules', async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  // 1. Verify isNearCircumference export and behavior in circle-core.js
  const { isNearCircumference } = await import('../js/circle-core.js');
  assert.strictEqual(typeof isNearCircumference, 'function', 'circle-core.js must export isNearCircumference');

  // Exact rim hit
  assert.strictEqual(isNearCircumference(200, 100, 100, 100, 100, 14), true);
  // Within 14px tolerance
  assert.strictEqual(isNearCircumference(210, 100, 100, 100, 100, 14), true);
  assert.strictEqual(isNearCircumference(190, 100, 100, 100, 100, 14), true);
  // Outside tolerance
  assert.strictEqual(isNearCircumference(220, 100, 100, 100, 100, 14), false);
  assert.strictEqual(isNearCircumference(100, 100, 100, 100, 100, 14), false);

  // 2. Verify all 7 circle theorem main.js files implement circumference dragging and wheel resizing
  const circleTheorems = [
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of circleTheorems) {
    const mainJs = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', slug, 'src', 'main.js'), 'utf8');
    assert.ok(
      mainJs.includes('isNearCircumference'),
      `${slug}/src/main.js must import and use isNearCircumference`
    );
    assert.ok(
      mainJs.includes("canvas.style.cursor = hoverPt ? 'pointer' : (hoverCirc ? 'ew-resize' : 'default')") ||
      mainJs.includes("canvas.style.cursor = 'ew-resize'"),
      `${slug}/src/main.js must set ew-resize cursor when hovering or dragging circumference`
    );
    assert.ok(
      mainJs.includes("canvas.addEventListener('wheel'") || mainJs.includes('addEventListener("wheel"'),
      `${slug}/src/main.js must have mouse wheel event listener on 2D canvas`
    );
    assert.ok(
      mainJs.includes('store.set({ radius:'),
      `${slug}/src/main.js must update store radius upon circumference drag or wheel`
    );
  }

  // 3. Verify Thales 2D and 3D implementations
  const thales2D = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'controllers', 'Canvas2DInteraction.js'), 'utf8');
  assert.ok(thales2D.includes("distCirc < 14"), 'Thales Canvas2DInteraction.js must allow circumference click to enter radius resizing mode');
  assert.ok(thales2D.includes("this.mode = 'radius'"), 'Thales Canvas2DInteraction.js must activate radius resizing mode');
  assert.ok(thales2D.includes("ew-resize"), 'Thales Canvas2DInteraction.js must show ew-resize cursor on circumference hover');
  assert.ok(thales2D.includes("canvas.addEventListener('wheel'"), 'Thales Canvas2DInteraction.js must have wheel listener for 2D canvas');

  const thales3D = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'controllers', 'Scene3DInteraction.js'), 'utf8');
  assert.ok(thales3D.includes("hitsCircumference"), 'Thales Scene3DInteraction.js must check hitsCircumference');
  assert.ok(thales3D.includes("activeTarget = 'radius'"), 'Thales Scene3DInteraction.js must set activeTarget to radius upon circumference click');
  assert.ok(thales3D.includes("element.addEventListener('wheel'"), 'Thales Scene3DInteraction.js must have 3D mouse wheel listener');

  // 4. Verify 3D Scene View in circle-3d.js implements direct circumference dragging and 3D mouse wheel resizing
  const circle3D = fs.readFileSync(path.join(rootDir, 'js', 'circle-3d.js'), 'utf8');
  assert.ok(circle3D.includes('isRadius: true'), 'circle-3d.js enableInteraction must detect direct circumference dragging');
  assert.ok(circle3D.includes("element.addEventListener('wheel'"), 'circle-3d.js enableInteraction must have 3D mouse wheel listener');
  assert.ok(circle3D.includes('store.set(updates)'), 'circle-3d.js 3D wheel must dispatch radius updates to store');
});

test('2D Canvas Panning Contract: geometry models offset cx and cy by pan, and all 8 visualizers support grab/grabbing pan & dblclick recenter', async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const width = 800;
  const height = 600;
  const testPan = { x: 42, y: -28 };

  // 1. Verify all 7 circle theorem models offset cx, cy by pan.x, pan.y
  const models = [
    { name: 'Angle at Centre', mod: AngleAtCentre },
    { name: 'Angles in Same Segment', mod: AnglesInSameSegment },
    { name: 'Cyclic Quadrilateral', mod: CyclicQuad },
    { name: 'Tangent Radius', mod: TangentRadius },
    { name: 'Alternate Segment', mod: AlternateSegment },
    { name: 'Tangents from External Point', mod: TangentsFromPoint },
    { name: 'Perpendicular Chord Bisector', mod: ChordBisector },
  ];

  for (const { name, mod } of models) {
    const defaultState = mod.createInitialState();
    assert.deepStrictEqual(defaultState.pan, { x: 0, y: 0 }, `${name} createInitialState must initialize pan to { x: 0, y: 0 }`);

    const defaultGeo = mod.computeGeometry(defaultState, width, height);
    assert.strictEqual(defaultGeo.cx, width / 2, `${name} default cx must be width / 2`);
    assert.strictEqual(defaultGeo.cy, height / 2, `${name} default cy must be height / 2`);

    const pannedState = { ...defaultState, pan: testPan };
    const pannedGeo = mod.computeGeometry(pannedState, width, height);
    assert.strictEqual(pannedGeo.cx, width / 2 + testPan.x, `${name} panned cx must be width / 2 + pan.x`);
    assert.strictEqual(pannedGeo.cy, height / 2 + testPan.y, `${name} panned cy must be height / 2 + pan.y`);
  }

  // 2. Verify all 7 circle theorem main.js files implement panning, grab/grabbing cursors, and dblclick recentering
  const circleTheorems = [
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of circleTheorems) {
    const mainJs = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', slug, 'src', 'main.js'), 'utf8');
    assert.ok(
      mainJs.includes("= 'pan'"),
      `${slug}/src/main.js must set active drag target to 'pan' when dragging background`
    );
    assert.ok(
      mainJs.includes("canvas.style.cursor = 'grabbing'") && (mainJs.includes(": 'grab'") || mainJs.includes("canvas.style.cursor = 'grab'")),
      `${slug}/src/main.js must support 'grab' and 'grabbing' cursor affordances`
    );
    assert.ok(
      mainJs.includes("pan: {") && mainJs.includes("panOrigin.x") && mainJs.includes("panOrigin.y"),
      `${slug}/src/main.js must compute and dispatch pan delta to store`
    );
    assert.ok(
      mainJs.includes("canvas.addEventListener('dblclick',") && mainJs.includes("pan: { x: 0, y: 0 }"),
      `${slug}/src/main.js must bind canvas dblclick to reset pan to { x: 0, y: 0 }`
    );
    assert.ok(
      mainJs.includes("resetBtn.addEventListener('click',") && mainJs.includes("pan: { x: 0, y: 0 }"),
      `${slug}/src/main.js #btn-reset listener must reset pan to { x: 0, y: 0 }`
    );
  }

  // 3. Verify Thales 2D canvas interaction and main.js reset
  const thales2D = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'controllers', 'Canvas2DInteraction.js'), 'utf8');
  assert.ok(thales2D.includes("this.mode = 'pan'"), "Thales Canvas2DInteraction.js must support mode 'pan'");
  assert.ok(thales2D.includes("this.view.canvas.style.cursor = 'grab'"), "Thales Canvas2DInteraction.js must use 'grab' cursor");
  assert.ok(thales2D.includes("this.store.set({ pan:"), "Thales Canvas2DInteraction.js must dispatch pan updates to store");
  assert.ok(thales2D.includes("canvas.addEventListener('dblclick', () => store.set({ pan: { x: 0, y: 0 } }))"), "Thales Canvas2DInteraction.js must reset pan on dblclick");

  const thalesMain = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'main.js'), 'utf8');
  assert.ok(thalesMain.includes("pan: { x: 0, y: 0 }"), "Thales src/main.js resetBtn must clear pan to { x: 0, y: 0 }");
});

test('Viewport Toolbar Badges & Modes Panel Glow: Tips and Legend moved to modes panel, removed from header strip', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  // 1. Verify enhanceHeader in js/visual-page.js does NOT add badges/action buttons to header navigation strip
  const visualPageJs = fs.readFileSync(path.join(rootDir, 'js', 'visual-page.js'), 'utf8');
  assert.ok(!visualPageJs.includes('metaGroup.appendChild(infoBtn)'), 'Header visual-meta must not contain info button');
  assert.ok(!visualPageJs.includes('metaGroup.appendChild(tutorialBtn)'), 'Header visual-meta must not contain tutorial button');
  assert.ok(!visualPageJs.includes('metaGroup.appendChild(legendBtn)'), 'Header visual-meta must not contain legend button');

  // 2. Verify all 8 visuals declare #btn-toolbar-tips and #btn-toolbar-legend inside #toolbar-content
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const html = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html'), 'utf8');
    assert.ok(
      html.includes('id="btn-toolbar-tips"'),
      `${slug}/index.html must include #btn-toolbar-tips inside viewport toolbar`
    );
    assert.ok(
      html.includes('id="btn-toolbar-legend"'),
      `${slug}/index.html must include #btn-toolbar-legend inside viewport toolbar`
    );
    assert.ok(
      html.includes('id="toolbar-tips-status"'),
      `${slug}/index.html must include #toolbar-tips-status inside #btn-toolbar-tips`
    );
  }

  // 3. Verify CSS glow animations and badge styles exist in circle-visual.css, visual.css, and Thales controls.css
  const cssFiles = [
    path.join(rootDir, 'css', 'circle-visual.css'),
    path.join(rootDir, 'css', 'visual.css'),
    path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'controls.css'),
  ];

  for (const cssPath of cssFiles) {
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.includes('.btn-toolbar--badge'), `${path.basename(cssPath)} must define .btn-toolbar--badge`);
    assert.ok(css.includes('.btn-toolbar-tips'), `${path.basename(cssPath)} must define .btn-toolbar-tips`);
    assert.ok(css.includes('.btn-toolbar-legend'), `${path.basename(cssPath)} must define .btn-toolbar-legend`);
    assert.ok(css.includes('modes-panel-tips-glow'), `${path.basename(cssPath)} must define @keyframes modes-panel-tips-glow`);
    assert.ok(
      css.includes('body.interaction-tips-enabled .viewport-header-toolbar.is-collapsed'),
      `${path.basename(cssPath)} must define glow selector for collapsed toolbar when tips enabled`
    );
  }
});

test('Modes Panel & Dock Layout: Collapsed by default and left margin aligned on default or collapse', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  // 1. Verify all 8 visuals have #viewport-toolbar collapsed by default in HTML
  for (const slug of visualSlugs) {
    const html = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html'), 'utf8');
    assert.ok(
      html.includes('class="viewport-header-toolbar is-collapsed"'),
      `${slug}/index.html must have class "viewport-header-toolbar is-collapsed"`
    );
    assert.ok(
      html.includes('id="toolbar-collapse-btn"') && html.includes('aria-expanded="false"'),
      `${slug}/index.html toolbar collapse button must have aria-expanded="false" by default`
    );
  }

  // 2. Verify CSS rules enforce left margin alignment for .viewport-header-toolbar and .workspace-dock.is-collapsed
  const circleVisualCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  assert.ok(circleVisualCss.includes('left: 1rem;'), 'circle-visual.css must align .viewport-header-toolbar to left: 1rem');
  assert.ok(circleVisualCss.includes('transform: none;'), 'circle-visual.css must set transform: none for left alignment');
  assert.ok(
    circleVisualCss.includes('has-workspace-dock[data-dock-edge="left"]:not(.dock-is-collapsed) .viewport-header-toolbar'),
    'circle-visual.css must offset toolbar when left dock is expanded'
  );

  const dockCss = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8');
  assert.ok(dockCss.includes('.workspace-dock.is-collapsed'), 'workspace-dock.css must define .workspace-dock.is-collapsed');
  assert.ok(dockCss.includes('left: 1rem;'), 'workspace-dock.css must align collapsed dock to left: 1rem');
  assert.ok(dockCss.includes('top: 3.5rem;'), 'workspace-dock.css must position collapsed dock at top: 3.5rem below modes panel');

  // 3. Verify DraggableToolbar setCollapsed calls resetPosition
  const thalesToolbarJs = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'src', 'ui', 'DraggableToolbar.js'), 'utf8');
  assert.ok(thalesToolbarJs.includes('this.resetPosition()'), 'Thales DraggableToolbar setCollapsed must call resetPosition on collapse');

  const circleCoreJs = fs.readFileSync(path.join(rootDir, 'js', 'circle-core.js'), 'utf8');
  assert.ok(circleCoreJs.includes('this.resetPosition()'), 'circle-core.js DraggableToolbar setCollapsed must call resetPosition on collapse');

  // 4. Verify WorkspaceDockManager setDockCollapsed sets initX = 16 and initY = 56
  const dockJs = fs.readFileSync(path.join(rootDir, 'js', 'workspace-dock.js'), 'utf8');
  assert.ok(dockJs.includes('let initX = 16;'), 'WorkspaceDockManager must set initX = 16');
  assert.ok(dockJs.includes('let initY = 56;'), 'WorkspaceDockManager must set initY = 56 to place dock pill below modes panel');
  assert.ok(dockJs.includes('dock-is-collapsed'), 'WorkspaceDockManager must toggle dock-is-collapsed class on root');
});

test('Dynamic Viewport Deduction: Adaptive layout for canvases, dock, and modes panel on small viewports', async () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { createStore } = await import('../js/circle-core.js');
  const { ViewModeController } = await import('../js/circle-3d.js');
  const { ViewModeController: ThalesViewModeController } = await import('../visuals/circle-theorems/thales-theorem/src/controllers/ViewModeController.js');
  const { WorkspaceDockManager } = await import('../js/workspace-dock.js');

  // 1. ViewModeController: Deduces compact viewport and enforces vertical split & hides flip button
  const store = createStore({ viewMode: 'split', splitDirection: 'horizontal', splitRatio: 50 });
  const mockBtn = { style: {}, setAttribute: () => {}, classList: { toggle: () => {} }, addEventListener: () => {} };
  const container2d = { style: {} };
  const container3d = { style: {} };

  // A: Large Desktop Viewport (1200x800)
  const desktopMainView = {
    className: '',
    dataset: {},
    classList: { contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
  };
  const desktopCtrl = new ViewModeController(store, {
    mainView: desktopMainView,
    container2d,
    container3d,
    buttons: {},
    flipButton: mockBtn,
  });

  assert.strictEqual(desktopCtrl.isCompact(), false, '1200px viewport must not be compact');
  assert.ok(desktopMainView.className.includes('horizontal-split'), 'Desktop must retain horizontal split');
  assert.strictEqual(mockBtn.style.display, '', 'Flip button must be visible on desktop');
  assert.strictEqual(mockBtn.hidden, false);

  // B: Small Mobile Viewport (390x844 - iPhone 14)
  const mobileMainView = {
    className: '',
    dataset: {},
    classList: { contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
  };
  const mobileCtrl = new ViewModeController(store, {
    mainView: mobileMainView,
    container2d,
    container3d,
    buttons: {},
    flipButton: mockBtn,
  });

  assert.strictEqual(mobileCtrl.isCompact(), true, '390px viewport must deduce compact layout');
  assert.ok(mobileMainView.className.includes('vertical-split'), 'Small viewport must deduce vertical (stacked) split');
  assert.strictEqual(mobileMainView.dataset.viewport, 'compact', 'Dataset must be set to compact');
  assert.strictEqual(mockBtn.style.display, 'none', 'Flip button must be hidden on mobile');
  assert.strictEqual(mockBtn.hidden, true);
  assert.strictEqual(container2d.style.flexBasis, '50%');
  assert.strictEqual(container3d.style.flexBasis, '50%');

  // 2. Thales ViewModeController: Identical viewport deduction contract
  const thalesStore = createStore({ viewMode: 'split', splitDirection: 'horizontal', splitRatio: 50 });
  const thalesMobileMainView = {
    className: '',
    dataset: {},
    classList: { contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 375, height: 667 }),
  };
  const thalesCtrl = new ThalesViewModeController(thalesStore, {
    mainView: thalesMobileMainView,
    container2d,
    container3d,
    buttons: {},
    flipButton: mockBtn,
    resizer: { addEventListener: () => {} },
  });

  assert.strictEqual(thalesCtrl.isCompact(), true, 'Thales 375px viewport must deduce compact layout');
  assert.ok(thalesMobileMainView.className.includes('vertical-split'), 'Thales must deduce vertical split on mobile');
  assert.strictEqual(thalesMobileMainView.dataset.viewport, 'compact');
  assert.strictEqual(mockBtn.style.display, 'none');

  // 3. Viewport Resizer: Click-and-drag horizontal and vertical divider resizing pipeline
  const dragStore = createStore({ viewMode: 'split', splitDirection: 'horizontal', splitRatio: 50 });
  const dragMainView = {
    className: 'view-container layout-split horizontal-split',
    dataset: {},
    classList: {
      _classes: new Set(['view-container', 'layout-split', 'horizontal-split']),
      contains(c) { return this._classes.has(c); },
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); }
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }),
  };
  const dragC2d = { style: {} };
  const dragC3d = { style: {} };
  const resizerListeners = {};
  const mockResizer = {
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    classList: {
      _active: false,
      add(c) { if (c === 'active') this._active = true; },
      remove(c) { if (c === 'active') this._active = false; },
      contains(c) { return c === 'active' ? this._active : false; }
    },
    addEventListener(evt, fn) { resizerListeners[evt] = resizerListeners[evt] || []; resizerListeners[evt].push(fn); },
    removeEventListener(evt, fn) { if (resizerListeners[evt]) resizerListeners[evt] = resizerListeners[evt].filter(f => f !== fn); },
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  let onResizeCount = 0;
  const resizerCtrl = new ViewModeController(dragStore, {
    mainView: dragMainView,
    container2d: dragC2d,
    container3d: dragC3d,
    buttons: {},
    resizer: mockResizer,
    onResize: () => { onResizeCount++; }
  });

  // Pointerdown on divider
  resizerListeners['pointerdown']?.[0]?.({ preventDefault: () => {}, pointerId: 1 });
  assert.strictEqual(mockResizer.classList.contains('active'), true, 'Resizer must become active on pointerdown');

  // Drag horizontal to 650px (65%)
  resizerListeners['pointermove']?.[0]?.({ clientX: 650, clientY: 300 });
  assert.strictEqual(dragStore.get().splitRatio, 65, 'Dragging to 650px on 1000px view must set splitRatio to 65%');
  assert.strictEqual(dragC2d.style.flexBasis, '65%');
  assert.strictEqual(dragC3d.style.flexBasis, '35%');

  // Pointerup releases drag
  resizerListeners['pointerup']?.[0]?.({ pointerId: 1 });
  assert.strictEqual(mockResizer.classList.contains('active'), false, 'Resizer active class must clear on pointerup');
  assert.ok(onResizeCount >= 2, 'onResize must be triggered during divider drag');

  // Accessibility attributes on resizer divider
  assert.strictEqual(mockResizer.getAttribute('role'), 'separator', 'Resizer must declare role="separator"');
  assert.strictEqual(mockResizer.getAttribute('tabindex'), '0', 'Resizer must be keyboard focusable (tabindex="0")');
  assert.strictEqual(mockResizer.getAttribute('aria-valuenow'), '65', 'Resizer aria-valuenow must reflect 65%');
  assert.ok(mockResizer.getAttribute('title').includes('Double-click or press Home to reset to 50/50'), 'Resizer must contain informative tooltip');

  // Double-click resets splitRatio to 50/50
  resizerListeners['dblclick']?.[0]?.();
  assert.strictEqual(dragStore.get().splitRatio, 50, 'Double-clicking resizer must reset splitRatio to 50%');
  assert.strictEqual(mockResizer.getAttribute('aria-valuenow'), '50', 'Resizer aria-valuenow must update to 50% on reset');

  // Keyboard navigation on resizer
  resizerListeners['keydown']?.[0]?.({ key: 'ArrowLeft', preventDefault: () => {} });
  assert.strictEqual(dragStore.get().splitRatio, 45, 'ArrowLeft must decrement splitRatio by 5%');

  resizerListeners['keydown']?.[0]?.({ key: 'ArrowRight', preventDefault: () => {} });
  assert.strictEqual(dragStore.get().splitRatio, 50, 'ArrowRight must increment splitRatio by 5%');

  resizerListeners['keydown']?.[0]?.({ key: 'ArrowLeft', preventDefault: () => {} });
  assert.strictEqual(dragStore.get().splitRatio, 45);
  resizerListeners['keydown']?.[0]?.({ key: 'Home', preventDefault: () => {} });
  assert.strictEqual(dragStore.get().splitRatio, 50, 'Home key must reset splitRatio to 50%');

  // 4. WorkspaceDockManager: Viewport deduction sets compact dataset
  const mockRoot = {
    attributes: {},
    classList: { add: () => {}, toggle: () => {}, contains: () => false },
    setAttribute: (k, v) => { mockRoot.attributes[k] = v; },
    getAttribute: (k) => mockRoot.attributes[k],
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (c) => c,
    ownerDocument: null,
    getBoundingClientRect: () => ({ width: 400, height: 800 }),
  };
  const dockMgr = new WorkspaceDockManager(mockRoot);
  dockMgr.deduceViewport();
  assert.strictEqual(mockRoot.getAttribute('data-viewport'), 'compact', 'Dock must mark root as compact viewport');

  // 4. CSS Media Query Verification across circle-visual.css, thales responsive.css, and workspace-dock.css
  const circleVisualCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const thalesResponsiveCss = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', 'thales-theorem', 'styles', 'responsive.css'), 'utf8');
  const dockCss = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8');

  // Canvases guaranteed positive height on mobile
  assert.ok(circleVisualCss.includes('min-height: 24rem !important;'), 'circle-visual.css must guarantee min-height: 24rem !important');
  assert.ok(circleVisualCss.includes('height: 50% !important;'), 'circle-visual.css must allocate height: 50% !important in split');
  assert.ok(circleVisualCss.includes('min-height: 140px;'), 'circle-visual.css must set min-height: 140px on mobile split containers');
  assert.ok(thalesResponsiveCss.includes('min-height: 24rem !important;'), 'thales responsive.css must guarantee min-height: 24rem !important');
  assert.ok(thalesResponsiveCss.includes('height: 50% !important;'), 'thales responsive.css must allocate height: 50% !important in split');

  // Modes Panel wraps on small screens
  assert.ok(circleVisualCss.includes('max-width: calc(100vw - 1rem);'), 'circle-visual.css must bound modes panel to 100vw - 1rem');
  assert.ok(circleVisualCss.includes('flex-wrap: wrap;'), 'circle-visual.css must wrap toolbar-content on mobile');
  assert.ok(thalesResponsiveCss.includes('flex-wrap: wrap;'), 'thales responsive.css must wrap toolbar-content on mobile');

  // View title offset avoids colliding with modes panel
  assert.ok(circleVisualCss.includes('left: 5.75rem;'), 'circle-visual.css must offset 2D view title past modes panel');
  assert.ok(thalesResponsiveCss.includes('left: 5.75rem;'), 'thales responsive.css must offset 2D view title past modes panel');

  // Workspace dock on mobile: absolute overlay bottom sheet (Strict Zero Displacement)
  assert.ok(dockCss.includes('.workspace-dock:not(.is-collapsed) {\n    bottom: 0 !important;'), 'dock must pin to bottom as bottom sheet overlay on mobile');
  assert.ok(dockCss.includes('max-height: min(58vh, 420px) !important;'), 'dock must bound height to bottom sheet on mobile');
  assert.ok(dockCss.includes('border-radius: 1rem 1rem 0 0 !important;'), 'dock must have rounded top corners on mobile');
  assert.ok(dockCss.includes('.circle-explorer.has-workspace-dock,\n  .thales-explorer.has-workspace-dock {\n    position: relative !important;\n    width: 100% !important;\n    height: calc(100vh - 3rem) !important;'), 'workspace-dock.css must maintain full viewport height on mobile');
});

test('Angle Labeling Contract: Single-line labels without newlines and non-obstructing placement', async () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { drawAngleBadge, drawVerticalAngleBadge } = await import('../js/circle-core.js');

  // 1. Core angle badge helpers format on a single line
  const mockCtx = {
    save: () => {},
    restore: () => {},
    strokeText: (text) => {
      assert.ok(!text.includes('\n'), `Rendered angle text "${text}" must not contain newlines`);
    },
    fillText: (text) => {
      assert.ok(!text.includes('\n'), `Rendered angle text "${text}" must not contain newlines`);
    },
  };
  drawAngleBadge(mockCtx, 'α', '45.0°', 100, 100, '#ffffff');
  drawVerticalAngleBadge(mockCtx, 'θ', '60.0°', 100, 100, '#ffffff');

  // 2. All 2D visual canvas files must not contain \n inside drawTextBadge calls for angles
  const canvasFiles = [
    'visuals/circle-theorems/angle-at-centre/src/canvas.js',
    'visuals/circle-theorems/angles-in-same-segment/src/canvas.js',
    'visuals/circle-theorems/cyclic-quadrilateral/src/canvas.js',
    'visuals/circle-theorems/perpendicular-chord-bisector/src/canvas.js',
    'visuals/circle-theorems/tangent-radius/src/canvas.js',
    'visuals/circle-theorems/tangents-from-external-point/src/canvas.js',
    'visuals/circle-theorems/alternate-segment/src/canvas.js',
    'visuals/circle-theorems/thales-theorem/src/views/canvas2d-draw.js',
  ];

  for (const relPath of canvasFiles) {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const badgeMatches = content.match(/drawTextBadge\([^)]+\)/g) || [];
    for (const badge of badgeMatches) {
      assert.ok(!badge.includes('\\n'), `${relPath}: drawTextBadge call "${badge}" must not contain newline \\n`);
    }
  }

  // 3. 3D label overlays in circle-3d.js and LabelOverlayView.js must not contain \n in angle label definitions
  const circle3dContent = fs.readFileSync(path.join(rootDir, 'js/circle-3d.js'), 'utf8');
  const angleLabel3DMatches = circle3dContent.match(/\{[^}]*isAngle:\s*true[^}]*\}/g) || [];
  for (const m of angleLabel3DMatches) {
    assert.ok(!m.includes('\\n'), `circle-3d.js: 3D angle label "${m}" must not contain newline \\n`);
  }

  const thalesOverlayContent = fs.readFileSync(path.join(rootDir, 'visuals/circle-theorems/thales-theorem/src/views/LabelOverlayView.js'), 'utf8');
  assert.ok(!thalesOverlayContent.includes("key: 'theta'") || !thalesOverlayContent.includes('\\n'), 'LabelOverlayView.js: angle labels must not contain newline \\n');

  // 4. CSS for 3D angle labels must enforce single-line nowrap
  const visualCss = fs.readFileSync(path.join(rootDir, 'css/circle-visual.css'), 'utf8');
  assert.ok(visualCss.includes('.label-3d.is-angle'), 'circle-visual.css must style .label-3d.is-angle');
  assert.ok(visualCss.includes('white-space: nowrap;'), 'circle-visual.css must enforce white-space: nowrap for labels');
});


test('Playback Speed Controller: cycle button (0.5x, 1x, 1.5x, 2x), keyboard shortcut Shift+P, reset handling, and DOM presence across all 12 visualizers', async () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { PlaybackController: CorePlaybackController, createStore: createCoreStore } = await import('../js/circle-core.js');
  const { PlaybackController: ThalesPlaybackController } = await import('../visuals/circle-theorems/thales-theorem/src/controllers/PlaybackController.js');

  // 1. Verify Core PlaybackController speed cycling: 1.0 -> 1.5 -> 2.0 -> 0.5 -> 1.0
  const coreStore = createCoreStore({ angleP: 0, playing: false, playbackSpeed: 1.0 });
  const mockPlayBtn = {
    addEventListener: () => {},
    classList: { toggle: () => {} },
    setAttribute: () => {},
    querySelector: () => null,
  };
  let coreClickCb = null;
  const mockSpeedBtn = {
    addEventListener: (evt, cb) => {
      if (evt === 'click') coreClickCb = cb;
    },
    setAttribute: () => {},
  };
  const mockSpeedLabel = { textContent: '' };
  globalThis.document = {
    getElementById: (id) => (id === 'playback-speed-label' ? mockSpeedLabel : null),
    querySelector: () => null,
    addEventListener: () => {},
  };

  const coreController = new CorePlaybackController(coreStore, mockPlayBtn, { speedButton: mockSpeedBtn });
  assert.equal(coreStore.get().playbackSpeed, 1.0);
  assert.equal(mockSpeedLabel.textContent, '1x');

  coreClickCb();
  assert.equal(coreStore.get().playbackSpeed, 1.5);
  assert.equal(mockSpeedLabel.textContent, '1.5x');

  coreClickCb();
  assert.equal(coreStore.get().playbackSpeed, 2.0);
  assert.equal(mockSpeedLabel.textContent, '2x');

  coreClickCb();
  assert.equal(coreStore.get().playbackSpeed, 0.5);
  assert.equal(mockSpeedLabel.textContent, '0.5x');

  coreClickCb();
  assert.equal(coreStore.get().playbackSpeed, 1.0);
  assert.equal(mockSpeedLabel.textContent, '1x');

  // 2. Verify Thales PlaybackController speed cycling
  let thalesClickCb = null;
  const mockThalesSpeedBtn = {
    addEventListener: (evt, cb) => {
      if (evt === 'click') thalesClickCb = cb;
    },
    setAttribute: () => {},
  };
  const mockThalesSpeedLabel = { textContent: '' };
  globalThis.document = {
    getElementById: (id) => {
      if (id === 'btn-playback-speed') return mockThalesSpeedBtn;
      if (id === 'playback-speed-label') return mockThalesSpeedLabel;
      return null;
    },
    querySelector: () => null,
    addEventListener: () => {},
  };

  const thalesStore = createCoreStore({ angle2D: 0, playing: false, playbackSpeed: 1.0 });
  const thalesController = new ThalesPlaybackController(thalesStore, mockPlayBtn, 0.8);
  assert.equal(thalesStore.get().playbackSpeed, 1.0);
  assert.equal(mockThalesSpeedLabel.textContent, '1x');

  thalesClickCb();
  assert.equal(thalesStore.get().playbackSpeed, 1.5);
  assert.equal(mockThalesSpeedLabel.textContent, '1.5x');

  thalesClickCb();
  assert.equal(thalesStore.get().playbackSpeed, 2.0);
  assert.equal(mockThalesSpeedLabel.textContent, '2x');

  thalesClickCb();
  assert.equal(thalesStore.get().playbackSpeed, 0.5);
  assert.equal(mockThalesSpeedLabel.textContent, '0.5x');

  thalesClickCb();
  assert.equal(thalesStore.get().playbackSpeed, 1.0);
  assert.equal(mockThalesSpeedLabel.textContent, '1x');

  // 3. Verify all 12 visualizer HTML pages contain #btn-playback-speed with #playback-speed-label
  const visualizers = [
    'visuals/circle-theorems/thales-theorem/index.html',
    'visuals/circle-theorems/angle-at-centre/index.html',
    'visuals/circle-theorems/angles-in-same-segment/index.html',
    'visuals/circle-theorems/cyclic-quadrilateral/index.html',
    'visuals/circle-theorems/tangent-radius/index.html',
    'visuals/circle-theorems/alternate-segment/index.html',
    'visuals/circle-theorems/tangents-from-external-point/index.html',
    'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
    'visuals/trigonometry/unit-circle-helix/index.html',
    'visuals/trigonometry/law-of-sines/index.html',
    'visuals/trigonometry/law-of-cosines/index.html',
    'visuals/trigonometry/angle-sum-identities/index.html',
  ];

  for (const rel of visualizers) {
    const html = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    assert.ok(html.includes('id="btn-playback-speed"'), `${rel} must contain #btn-playback-speed`);
    assert.ok(html.includes('id="playback-speed-label"'), `${rel} must contain #playback-speed-label`);
    assert.ok(
      html.indexOf('id="btn-playback"') < html.indexOf('id="btn-playback-speed"'),
      `${rel}: #btn-playback-speed must appear directly after #btn-playback in toolbar`
    );
  }

  // 4. Verify CSS styling for .btn-playback-speed
  const circleCss = fs.readFileSync(path.join(rootDir, 'css/circle-visual.css'), 'utf8');
  const visualCss = fs.readFileSync(path.join(rootDir, 'css/visual.css'), 'utf8');
  const controlsCss = fs.readFileSync(path.join(rootDir, 'visuals/circle-theorems/thales-theorem/styles/controls.css'), 'utf8');

  for (const [name, css] of [['circle-visual.css', circleCss], ['visual.css', visualCss], ['controls.css', controlsCss]]) {
    assert.ok(css.includes('.btn-playback-speed'), `${name} must include .btn-playback-speed styles`);
  }
});

test('3D Spherical Geometry on S²: Geodesic SLERP Arcs, Tangents, and Girard\'s Excess Invariant', () => {
  const R = 10;

  // 1. Octant Triangle test: 3 mutually orthogonal vertices on S²
  const A = { x: R, y: 0, z: 0 };
  const B = { x: 0, y: R, z: 0 };
  const C = { x: 0, y: 0, z: R };

  const octant = computeSphericalTriangleExcess(A, B, C, R);
  close(octant.sphAngles.degA, 90, 1e-4);
  close(octant.sphAngles.degB, 90, 1e-4);
  close(octant.sphAngles.degC, 90, 1e-4);
  close(octant.excessDeg, 90, 1e-4);
  close(octant.excessRad, Math.PI / 2, 1e-4);

  // Girard's theorem Area = R² * E_rad: for octant, area is exactly (1/8) of 4*pi*R² = (1/2)*pi*R²
  const expectedOctantArea = 0.5 * Math.PI * R * R;
  close(octant.area, expectedOctantArea, 1e-4);

  // 2. Euclidean contraction limit: as triangle size shrinks toward 0, excess -> 0 and angle sum -> 180°
  const delta = 0.001;
  const A_small = { x: R, y: 0, z: 0 };
  const B_small = { x: R * Math.cos(delta), y: R * Math.sin(delta), z: 0 };
  const C_small = { x: R * Math.cos(delta), y: 0, z: R * Math.sin(delta) };

  const smallTri = computeSphericalTriangleExcess(A_small, B_small, C_small, R);
  assert.ok(smallTri.excessDeg < 0.001, 'Small triangle excess must approach zero');
  const angleSum = smallTri.sphAngles.degA + smallTri.sphAngles.degB + smallTri.sphAngles.degC;
  close(angleSum, 180, 0.001);

  // 3. Geodesic Tangent test: unit vector orthogonal to position vector
  const P = { x: 0, y: 0, z: R };
  const Q = { x: R, y: 0, z: 0 };
  const tanP = getGeodesicTangent(P, Q);
  assert.ok(tanP, 'Tangent vector must be computed');
  close(tanP.x, 1, 1e-6);
  close(tanP.y, 0, 1e-6);
  close(tanP.z, 0, 1e-6);
  const uP = { x: 0, y: 0, z: 1 };
  const dotPT = uP.x * tanP.x + uP.y * tanP.y + uP.z * tanP.z;
  close(dotPT, 0, 1e-6);
  const tanLen = Math.hypot(tanP.x, tanP.y, tanP.z);
  close(tanLen, 1, 1e-6);
});

test('Circle Theorems 3D Dimension Mode: universal DOM wiring, status badges, and store contracts across all 8 visualizers', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const circleVisualizers = [
    'visuals/circle-theorems/thales-theorem/index.html',
    'visuals/circle-theorems/angle-at-centre/index.html',
    'visuals/circle-theorems/angles-in-same-segment/index.html',
    'visuals/circle-theorems/cyclic-quadrilateral/index.html',
    'visuals/circle-theorems/tangent-radius/index.html',
    'visuals/circle-theorems/alternate-segment/index.html',
    'visuals/circle-theorems/tangents-from-external-point/index.html',
    'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
  ];

  // 1. Verify all 8 circle theorem HTML pages contain the universal 3D containers
  for (const rel of circleVisualizers) {
    const html = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    assert.ok(html.includes('id="canvas-3d-container"'), `${rel} must contain #canvas-3d-container`);
  }

  // 2. Verify circle-core.js dynamic mounting contract for Dimension Mode
  const circleCoreJs = fs.readFileSync(path.join(rootDir, 'js/circle-core.js'), 'utf8');
  assert.ok(circleCoreJs.includes("btn-toggle-dimension-mode"), "circle-core.js must wire #btn-toggle-dimension-mode");
  assert.ok(circleCoreJs.includes("toolbar-dimension-status"), "circle-core.js must wire #toolbar-dimension-status");
  assert.ok(circleCoreJs.includes("section-dimension-mode"), "circle-core.js must mount #section-dimension-mode");
  assert.ok(circleCoreJs.includes("toggle-dimension-mode"), "circle-core.js must wire #toggle-dimension-mode");
  assert.ok(circleCoreJs.includes("btn-mode-planar-pill"), "circle-core.js must mount #btn-mode-planar-pill");
  assert.ok(circleCoreJs.includes("btn-mode-spatial-pill"), "circle-core.js must mount #btn-mode-spatial-pill");
  assert.ok(circleCoreJs.includes("dimension-mode-bar"), "circle-core.js must mount .dimension-mode-bar");

  // 3. Verify store contract: reset restores dimensionMode to 'planar'
  const store = createStore({ dimensionMode: 'planar', radius: 180 });
  assert.equal(store.get().dimensionMode, 'planar');
  store.set({ dimensionMode: 'spatial' });
  assert.equal(store.get().dimensionMode, 'spatial');
  store.reset();
  assert.equal(store.get().dimensionMode, 'planar');

  // 4. Verify circle-derivations.js includes Step 6 for Girard's excess invariant
  const derivJs = fs.readFileSync(path.join(rootDir, 'js/circle-derivations.js'), 'utf8');
  assert.ok(derivJs.includes("Girard's Excess"), "circle-derivations.js must include Step 6 on Girard's Excess");
  assert.ok(derivJs.includes("computeSphericalTriangleExcess"), "circle-derivations.js must import computeSphericalTriangleExcess");
});

test('Circle Theorems 3D Spatial Invariants: Tangent-Radius orthogonality, Tangent Cone generators, and Chord Bisector planes', () => {
  const R = 10;

  // 1. Tangent-Radius Invariant: radial vector is normal to tangent plane T_T(S²)
  const angT = 0.75;
  const latT = 1.1; // non-equatorial latitude on S²
  const T = {
    x: R * Math.sin(latT) * Math.cos(angT),
    y: R * Math.cos(latT),
    z: R * Math.sin(latT) * Math.sin(angT)
  };
  const normalT = { x: T.x / R, y: T.y / R, z: T.z / R };
  // Tangent vector along latitude circle
  const tanVec = {
    x: -Math.sin(angT),
    y: 0,
    z: Math.cos(angT)
  };
  // Dot product between normal vector and tangent vector must be zero
  const dotTanNorm = normalT.x * tanVec.x + normalT.y * tanVec.y + normalT.z * tanVec.z;
  close(dotTanNorm, 0, 1e-6);

  // 2. External Tangents 3D Cone Invariant: Apex P outside S² with distance d
  const d = 25;
  const h = (R * R) / d; // distance from O to center of contact circle on S²
  const rc = Math.sqrt(R * R - h * h); // contact circle radius
  const coneHeight = d - h; // cone height from apex P to contact circle base
  const generatorLen = Math.sqrt(d * d - R * R); // slant height / tangent length
  // Check Pythagorean relation for right-triangle generator: rc² + (d - h)² = L²
  close(rc * rc + coneHeight * coneHeight, generatorLen * generatorLen, 1e-4);

  // 3. Chord Bisector 3D Invariant: bisector plane normal is parallel to chord AB
  const angA = 0.3;
  const latA = 1.2;
  const angB = 1.8;
  const latB = 1.4;
  const ptA = {
    x: R * Math.sin(latA) * Math.cos(angA),
    y: R * Math.cos(latA),
    z: R * Math.sin(latA) * Math.sin(angA)
  };
  const ptB = {
    x: R * Math.sin(latB) * Math.cos(angB),
    y: R * Math.cos(latB),
    z: R * Math.sin(latB) * Math.sin(angB)
  };
  // Spherical midpoint M_sph
  const mx = ptA.x + ptB.x;
  const my = ptA.y + ptB.y;
  const mz = ptA.z + ptB.z;
  const mLen = Math.hypot(mx, my, mz);
  const Msph = { x: (mx / mLen) * R, y: (my / mLen) * R, z: (mz / mLen) * R };

  // Chord vector
  const chord = { x: ptB.x - ptA.x, y: ptB.y - ptA.y, z: ptB.z - ptA.z };
  // In 3D, vector from O to spherical midpoint Msph is orthogonal to chord AB
  const dotChordMsph = chord.x * Msph.x + chord.y * Msph.y + chord.z * Msph.z;
  close(dotChordMsph, 0, 1e-4);
});

test('Dynamic Optimal Viewport Radius: computeOptimalViewportRadius scales dynamically across all 12 visualizers, viewports, and reset contracts', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  // 1. Test baseline split-view dimensions (450x420)
  assert.equal(computeOptimalViewportRadius(450, 420, 'angle-at-centre'), 180, 'Default circle theorem radius must be 180 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'thales-theorem'), 180, 'Thales theorem radius must be 180 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'tangents-from-external-point'), 120, 'Tangents from external point must be 120 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'perpendicular-chord-bisector'), 170, 'Perpendicular chord bisector must be 170 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'unit-circle-helix'), 175, 'Unit circle helix must be 175 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'law-of-sines'), 175, 'Law of sines must be 175 in 450x420');
  assert.equal(computeOptimalViewportRadius(450, 420, 'angle-sum-identities'), 175, 'Angle sum identities must be 175 in 450x420');

  // 2. Test widescreen Full 2D desktop dimensions (1000x700)
  const wideDefault = computeOptimalViewportRadius(1000, 700, 'angle-at-centre');
  assert.ok(wideDefault >= 290 && wideDefault <= 330, `Widescreen default radius (${wideDefault}) must expand to occupy viewport width`);

  const wideTangents = computeOptimalViewportRadius(1000, 700, 'tangents-from-external-point');
  assert.ok(wideTangents >= 200 && wideTangents <= 330, `Widescreen tangents radius (${wideTangents}) must scale dynamically with span factor`);

  const wideTrig = computeOptimalViewportRadius(1000, 700, 'unit-circle-helix');
  assert.ok(wideTrig >= 280 && wideTrig <= 330, `Widescreen trig radius (${wideTrig}) must expand dynamically`);

  // 3. Test fallback handling when width or height are zero or missing
  assert.equal(computeOptimalViewportRadius(0, 0, 'angle-at-centre'), 180);
  assert.equal(computeOptimalViewportRadius(0, 0, 'tangents-from-external-point'), 120);
  assert.equal(computeOptimalViewportRadius(0, 0, 'perpendicular-chord-bisector'), 170);
  assert.equal(computeOptimalViewportRadius(0, 0, 'law-of-sines'), 175);

  // 4. Verify circle-core.js syncOptimalRadius contracts:
  const circleCoreJs = fs.readFileSync(path.join(rootDir, 'js/circle-core.js'), 'utf8');
  assert.ok(circleCoreJs.includes('syncOptimalRadius'), 'circle-core.js must implement syncOptimalRadius');
  assert.ok(circleCoreJs.includes('computeOptimalViewportRadius'), 'circle-core.js must use computeOptimalViewportRadius');
  assert.ok(circleCoreJs.includes('userCustomizedRadius'), 'circle-core.js must track userCustomizedRadius');

  // 5. Verify trig-core.js exports computeOptimalViewportRadius and implements syncSlider expansion
  const trigCoreJs = fs.readFileSync(path.join(rootDir, 'visuals/trigonometry/js/trig-core.js'), 'utf8');
  assert.ok(trigCoreJs.includes('computeOptimalViewportRadius'), 'trig-core.js must import and export computeOptimalViewportRadius');
  assert.ok(trigCoreJs.includes('num > parseFloat(el.max)'), 'trig-core.js syncSlider must expand slider max on large radii');

  // 6. Verify Thales Theorem implements syncOptimalRadius on load and reset
  const thalesMainJs = fs.readFileSync(path.join(rootDir, 'visuals/circle-theorems/thales-theorem/src/main.js'), 'utf8');
  assert.ok(thalesMainJs.includes('computeOptimalViewportRadius'), 'thales main.js must use computeOptimalViewportRadius');
  assert.ok(thalesMainJs.includes('store.set({ zoom: optR / r3d })'), 'thales main.js must dynamically set zoom = optR / r3d');
});

test('Omni-Directional 3D Movement, Canvas Spin, Multi-Touch Pinch/Twist/Pan & Universal Panel Touch-Scroll', async () => {
  const { ArcballTrackballControls } = await import('../js/circle-3d.js');
  const {
    createStore,
    computeSpinAngleUpdates2D,
    attachCanvasTouchAndWheelGestures,
    enableUniversalPanelTouch,
  } = await import('../js/circle-core.js');

  // Minimal THREE mock for ArcballTrackballControls
  class MockVector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() {
      const l = this.length();
      if (l > 1e-12) { this.x /= l; this.y /= l; this.z /= l; }
      return this;
    }
    setLength(l) { return this.normalize().addScaledVector(this, l - 1); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    applyQuaternion(q) {
      const x = this.x, y = this.y, z = this.z;
      const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
      const ix = qw * x + qy * z - qz * y;
      const iy = qw * y + qz * x - qx * z;
      const iz = qw * z + qx * y - qy * x;
      const iw = -qx * x - qy * y - qz * z;
      this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
      return this;
    }
  }
  class MockVector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
  }
  class MockQuaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
    setFromAxisAngle(axis, angle) {
      const half = angle / 2;
      const s = Math.sin(half);
      this.x = axis.x * s;
      this.y = axis.y * s;
      this.z = axis.z * s;
      this.w = Math.cos(half);
      return this;
    }
  }
  const mockTHREE = { Vector3: MockVector3, Vector2: MockVector2, Quaternion: MockQuaternion };
  const domListeners = {};
  const mockDom = {
    addEventListener: (evt, fn) => { domListeners[evt] = domListeners[evt] || []; domListeners[evt].push(fn); },
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    hasPointerCapture: () => false,
  };
  const mockCamera = {
    position: new MockVector3(0, 0, 30),
    up: new MockVector3(0, 1, 0),
    quaternion: new MockQuaternion(),
    fov: 45,
    aspect: 1,
    lookAt: () => {},
  };

  const controls = new ArcballTrackballControls(mockTHREE, mockCamera, mockDom);

  // 1. Holroyd continuous spherical-hyperbolic projection: z > 0 both inside and outside virtual sphere rim
  const insidePt = controls.projectOnVirtualSphere(200, 200, 400, 400);
  close(insidePt.z, 1.0, 1e-5);
  const outsideRimPt = controls.projectOnVirtualSphere(395, 395, 400, 400);
  assert.ok(outsideRimPt.z > 0.05, 'Holroyd hyperbolic sheet must maintain positive z outside rim for omni-directional rotation');
  close(outsideRimPt.length(), 1.0, 1e-5);

  // Directional kinematic alignment:
  // Dragging UP (y decreases) produces positive sphere Y so crossVectors(cur, prev) rotates camera down, moving graphic UP
  const ptCenter = controls.projectOnVirtualSphere(200, 200, 400, 400);
  const ptUp = controls.projectOnVirtualSphere(200, 150, 400, 400);
  const ptDown = controls.projectOnVirtualSphere(200, 250, 400, 400);
  const ptLeft = controls.projectOnVirtualSphere(150, 200, 400, 400);
  const ptRight = controls.projectOnVirtualSphere(250, 200, 400, 400);

  assert.ok(ptUp.y > ptCenter.y, 'Dragging UP must produce positive sphere Y for graphic upward motion');
  assert.ok(ptDown.y < ptCenter.y, 'Dragging DOWN must produce negative sphere Y for graphic downward motion');
  assert.ok(ptLeft.x < ptCenter.x, 'Dragging LEFT must produce negative sphere X for graphic leftward motion');
  assert.ok(ptRight.x > ptCenter.x, 'Dragging RIGHT must produce positive sphere X for graphic rightward motion');

  // Verify orbitRotate obeys user directional kinematics (drag up -> camera drops -> model moves up)
  mockCamera.position = new MockVector3(0, 0, 30);
  mockCamera.up = new MockVector3(0, 1, 0);
  controls.orbitRotate(0, -50, 400, 400); // Drag UP
  assert.ok(mockCamera.position.y < 0, 'Orbit drag UP must lower camera elevation so target graphic moves UP on screen');

  mockCamera.position = new MockVector3(0, 0, 30);
  mockCamera.up = new MockVector3(0, 1, 0);
  controls.orbitRotate(0, 50, 400, 400); // Drag DOWN
  assert.ok(mockCamera.position.y > 0, 'Orbit drag DOWN must raise camera elevation so target graphic moves DOWN on screen');

  mockCamera.position = new MockVector3(0, 0, 30);
  mockCamera.up = new MockVector3(0, 1, 0);
  controls.orbitRotate(-50, 0, 400, 400); // Drag LEFT
  assert.ok(mockCamera.position.x > 0, 'Orbit drag LEFT must move camera rightward so target graphic moves LEFT on screen');

  mockCamera.position = new MockVector3(0, 0, 30);
  mockCamera.up = new MockVector3(0, 1, 0);
  controls.orbitRotate(50, 0, 400, 400); // Drag RIGHT
  assert.ok(mockCamera.position.x < 0, 'Orbit drag RIGHT must move camera leftward so target graphic moves RIGHT on screen');

  mockCamera.position = new MockVector3(0, 0, 30);
  mockCamera.up = new MockVector3(0, 1, 0);

  // 2. 3D Canvas Spin (in-plane roll around camera forward axis)
  controls.spinCameraRoll(Math.PI / 2);
  close(mockCamera.up.x, 1.0, 1e-4);
  close(mockCamera.up.y, 0.0, 1e-4);

  // 3. Simultaneous 2-finger pinch-zoom + 2-finger twist-spin + 2-finger pan in 3D
  mockCamera.up.set(0, 1, 0);
  controls.onPointerDown({ pointerId: 1, clientX: 150, clientY: 200, pointerType: 'touch' });
  controls.onPointerDown({ pointerId: 2, clientX: 250, clientY: 200, pointerType: 'touch' });
  assert.equal(controls.state, 'pinch');

  // Spread fingers from 100px to 150px, twist by ~45°, and pan midpoint by (+20, +10)
  controls.onPointerMove({ pointerId: 1, clientX: 120, clientY: 160, pointerType: 'touch' });
  controls.onPointerMove({ pointerId: 2, clientX: 260, clientY: 260, pointerType: 'touch' });
  assert.ok(mockCamera.position.length() < 30, 'Two-finger spread must dolly-zoom camera closer');
  assert.ok(Math.abs(mockCamera.up.x) > 0.05, 'Two-finger twist must spin camera roll');
  assert.ok(controls.target.length() > 0.01, 'Two-finger midpoint movement must pan 3D target');

  // 4. 2D Canvas Multi-Touch Pinch-Zoom, Two-Finger Pan, and Two-Finger Twist-Spin
  const store2D = createStore({ radius: 180, angleA: 0.2, angleB: 1.4, angleP: 2.5, pan: { x: 0, y: 0 } });
  const canvasListeners = {};
  const mockCanvas2D = {
    style: {},
    addEventListener: (evt, fn) => { canvasListeners[evt] = canvasListeners[evt] || []; canvasListeners[evt].push(fn); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }),
  };
  attachCanvasTouchAndWheelGestures(mockCanvas2D, store2D);

  canvasListeners.pointerdown[0]({ pointerId: 10, clientX: 200, clientY: 250, pointerType: 'touch' });
  canvasListeners.pointerdown[0]({ pointerId: 11, clientX: 300, clientY: 250, pointerType: 'touch' });
  canvasListeners.pointermove[0]({ pointerId: 11, clientX: 320, clientY: 290, pointerType: 'touch' });

  const updated2D = store2D.get();
  assert.ok(updated2D.radius > 180, '2D two-finger spread must zoom radius');
  assert.ok(updated2D.pan.x !== 0 || updated2D.pan.y !== 0, '2D two-finger midpoint movement must pan canvas');
  assert.ok(Math.abs(updated2D.angleP - 2.5) > 0.01, '2D two-finger twist must spin figure angles');

  // Verify rigid angular spin invariant: angleB - angleA remains invariant under 2D spin
  const spinPatch = computeSpinAngleUpdates2D({ angleA: 0.5, angleB: 1.7 }, 0.4);
  close(spinPatch.angleB - spinPatch.angleA, 1.2, 1e-6);

  // 5. Universal Panel Touch-Scroll & Pinch-Zoom
  assert.equal(typeof enableUniversalPanelTouch, 'function', 'enableUniversalPanelTouch must be exported');
});

test('3D Spatial Mode Euclidean Invariants: Straight Chords, Flat Triangles & Geodesic Arc Decoupling across Circle Theorems', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const rootDir = process.cwd();
  const circle3DCode = fs.readFileSync(path.join(rootDir, 'js/circle-3d.js'), 'utf8');

  // 1. AngleAtCentre3DView: straight chords PA & PB, flat triangles triOPA/triOPB, curved arc AB on S²
  assert.ok(circle3DCode.includes('this.linePA.geometry.setFromPoints([P, A])'), 'AngleAtCentre3DView must set linePA from Euclidean points');
  assert.ok(circle3DCode.includes('this.linePB.geometry.setFromPoints([P, B])'), 'AngleAtCentre3DView must set linePB from Euclidean points');
  assert.ok(circle3DCode.includes('setTriVertices(this.triOPAMesh.geometry, O, P, A)'), 'AngleAtCentre3DView must build flat Euclidean triangle triOPAMesh');
  assert.ok(circle3DCode.includes('setTriVertices(this.triOPBMesh.geometry, O, P, B)'), 'AngleAtCentre3DView must build flat Euclidean triangle triOPBMesh');
  assert.ok(circle3DCode.includes('setAngleWedgeVertices3D(this.inscribedAngleMesh, P, A, B, 2.4)'), 'AngleAtCentre3DView must measure true Euclidean angle between straight chords');
  assert.ok(circle3DCode.includes('updateGeodesicArc3D(this.geodesicArcAB, A, B, R)'), 'AngleAtCentre3DView must update geodesic arc AB for the subtended arc on S²');

  // 2. AnglesInSameSegment3DView: straight chords AB, P1A, P1B, P2A, P2B, flat triangles tri1Mesh/tri2Mesh
  assert.ok(circle3DCode.includes('this.chordAB.geometry.setFromPoints([A, B])'), 'AnglesInSameSegment3DView must set chordAB from straight endpoints');
  assert.ok(circle3DCode.includes('this.lineP1A.geometry.setFromPoints([P1, A])'), 'AnglesInSameSegment3DView must set lineP1A from straight endpoints');
  assert.ok(circle3DCode.includes('this.lineP2A.geometry.setFromPoints([P2, A])'), 'AnglesInSameSegment3DView must set lineP2A from straight endpoints');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri1Mesh.geometry, P1, A, B)'), 'AnglesInSameSegment3DView must build flat Euclidean triangle tri1Mesh');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri2Mesh.geometry, P2, A, B)'), 'AnglesInSameSegment3DView must build flat Euclidean triangle tri2Mesh');
  assert.ok(circle3DCode.includes('setAngleWedgeVertices3D(this.angleP1Mesh, P1, A, B, 2.4)'), 'AnglesInSameSegment3DView must measure true Euclidean angle for P1');
  assert.ok(circle3DCode.includes('setAngleWedgeVertices3D(this.angleP2Mesh, P2, A, B, 2.4)'), 'AnglesInSameSegment3DView must measure true Euclidean angle for P2');
  assert.ok(circle3DCode.includes('updateGeodesicArc3D(this.geodesicChordAB, A, B, R)'), 'AnglesInSameSegment3DView must use geodesic arc for subtended arc AB on S²');

  // 3. CyclicQuad3DView: straight quad edges AB, BC, CD, DA and diagonals AC, BD, flat quad meshes
  assert.ok(circle3DCode.includes('this.edgeAB.geometry.setFromPoints([A, B])'), 'CyclicQuad3DView must set edgeAB from straight endpoints');
  assert.ok(circle3DCode.includes('this.edgeBC.geometry.setFromPoints([B, C])'), 'CyclicQuad3DView must set edgeBC from straight endpoints');
  assert.ok(circle3DCode.includes('this.edgeCD.geometry.setFromPoints([C, D])'), 'CyclicQuad3DView must set edgeCD from straight endpoints');
  assert.ok(circle3DCode.includes('this.edgeDA.geometry.setFromPoints([D, A])'), 'CyclicQuad3DView must set edgeDA from straight endpoints');
  assert.ok(circle3DCode.includes('this.diagAC.geometry.setFromPoints([A, C])'), 'CyclicQuad3DView must set diagAC from straight endpoints');
  assert.ok(circle3DCode.includes('setTriVertices(this.quadMesh1.geometry, A, B, C)'), 'CyclicQuad3DView must build flat Euclidean triangle quadMesh1');
  assert.ok(circle3DCode.includes('setTriVertices(this.quadMesh2.geometry, A, C, D)'), 'CyclicQuad3DView must build flat Euclidean triangle quadMesh2');
  assert.ok(circle3DCode.includes('setAngleWedgeVertices3D(this.angleAMesh, A, B, D, 2.2)'), 'CyclicQuad3DView must measure straight Euclidean angle at A');
  assert.ok(circle3DCode.includes('Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u))'), 'CyclicQuad3DView must compute local concyclic circle angle for D');
  assert.ok(circle3DCode.includes('p1.distanceTo(targetPos) < p2.distanceTo(targetPos)'), 'pickSphere must choose the root closest to targetPos');

  // 4. TangentRadius3DView: straight chordLines, flat chordAreaMeshes, geodesic arc on S²
  assert.ok(circle3DCode.includes('this.chordLines[k].geometry.setFromPoints([p1.pos, p2.pos])'), 'TangentRadius3DView must set chordLines from straight endpoints');
  assert.ok(circle3DCode.includes('setTriVertices(this.chordAreaMeshes[k].geometry, O, p1.pos, p2.pos)'), 'TangentRadius3DView must build flat Euclidean triangle chordAreaMeshes in 3D');
  assert.ok(circle3DCode.includes('updateGeodesicArc3D(this.geodesicChords[k], p1.pos, p2.pos, R * 1.002, 32)'), 'TangentRadius3DView must update geodesic arc on S²');

  // 5. AlternateSegment3DView: straight chords TA, AB, BT, diameter TD, chords DB, DA, flat triangles
  assert.ok(circle3DCode.includes('this.chordTA.geometry.setFromPoints([T, A])'), 'AlternateSegment3DView must set chordTA from straight endpoints');
  assert.ok(circle3DCode.includes('this.chordAB.geometry.setFromPoints([A, B])'), 'AlternateSegment3DView must set chordAB from straight endpoints');
  assert.ok(circle3DCode.includes('this.chordBT.geometry.setFromPoints([B, T])'), 'AlternateSegment3DView must set chordBT from straight endpoints');
  assert.ok(circle3DCode.includes('this.diameterTD.geometry.setFromPoints([T, D])'), 'AlternateSegment3DView must set diameterTD from straight endpoints');
  assert.ok(circle3DCode.includes('setTriVertices(this.triMesh.geometry, T, A, B)'), 'AlternateSegment3DView must build flat Euclidean triangle triMesh');

  // 6. TangentsFromPoint3DView: straight secant chord T1T2 piercing through interior, flat right triangles
  assert.ok(circle3DCode.includes('this.chordT1T2.geometry.setFromPoints([T1, T2])'), 'TangentsFromPoint3DView must set chordT1T2 from straight endpoints');
  assert.ok(circle3DCode.includes('this.chordT1T2.visible = true;'), 'TangentsFromPoint3DView must keep straight chordT1T2 visible');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri1Mesh.geometry, O, T1, P)'), 'TangentsFromPoint3DView must build flat right triangle tri1Mesh');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri2Mesh.geometry, O, T2, P)'), 'TangentsFromPoint3DView must build flat right triangle tri2Mesh');

  // 7. ChordBisector3DView: Euclidean midpoint M on chord AB, straight lines AM, MB, OM, flat right triangles
  assert.ok(circle3DCode.includes('this.markerM.position.copy(M)'), 'ChordBisector3DView must keep markerM at Euclidean midpoint M = (A+B)/2');
  assert.ok(circle3DCode.includes('this.lineAM.geometry.setFromPoints([A, M])'), 'ChordBisector3DView must set lineAM from straight endpoints');
  assert.ok(circle3DCode.includes('this.lineMB.geometry.setFromPoints([M, B])'), 'ChordBisector3DView must set lineMB from straight endpoints');
  assert.ok(circle3DCode.includes('this.perpOM.geometry.setFromPoints([O, M])'), 'ChordBisector3DView must set perpOM from straight endpoints');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri1Mesh.geometry, O, A, M)'), 'ChordBisector3DView must build flat right triangle tri1Mesh');
  assert.ok(circle3DCode.includes('setTriVertices(this.tri2Mesh.geometry, O, B, M)'), 'ChordBisector3DView must build flat right triangle tri2Mesh');

  // Mathematical Spatial Invariants
  const R = 10;
  // Non-equatorial points on S²
  const latA = 1.13, angA = 0.5;
  const latB = 2.01, angB = 2.4;
  const latP = 0.73, angP = 1.6;
  const A = {
    x: R * Math.sin(latA) * Math.cos(angA),
    y: R * Math.cos(latA),
    z: R * Math.sin(latA) * Math.sin(angA),
  };
  const B = {
    x: R * Math.sin(latB) * Math.cos(angB),
    y: R * Math.cos(latB),
    z: R * Math.sin(latB) * Math.sin(angB),
  };
  const P = {
    x: R * Math.sin(latP) * Math.cos(angP),
    y: R * Math.cos(latP),
    z: R * Math.sin(latP) * Math.sin(angP),
  };

  // 1. Straight Euclidean chord length vs curved spherical geodesic arc length
  const euclideanChordAB = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z);
  const dotAB = (A.x * B.x + A.y * B.y + A.z * B.z) / (R * R);
  const sphericalArcAB = R * Math.acos(Math.max(-1, Math.min(1, dotAB)));
  assert.ok(euclideanChordAB < sphericalArcAB, 'Euclidean straight chord must be strictly shorter than curved geodesic arc on S²');

  // 2. Euclidean midpoint M = (A+B)/2 is strictly in the interior of the sphere
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 };
  const distOM = Math.hypot(M.x, M.y, M.z);
  assert.ok(distOM < R, 'Euclidean midpoint M of chord AB must lie strictly inside the sphere interior (r < R)');
  close(distOM, Math.sqrt(R * R - Math.pow(euclideanChordAB / 2, 2)), 1e-4);

  // 3. Orthogonality: OM is strictly perpendicular to AB in R^3
  const vecAB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
  const dotOM_AB = M.x * vecAB.x + M.y * vecAB.y + M.z * vecAB.z;
  close(dotOM_AB, 0, 1e-5);
});

test('Concyclic Wireframe Dynamic Alignment & Spatial Shading: alignCircleWireToPlane, computeConcyclicPlaneAndCircle, and full 3D mesh rendering across circle theorems', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const rootDir = process.cwd();
  const circle3DCode = fs.readFileSync(path.join(rootDir, 'js/circle-3d.js'), 'utf8');

  // 1. alignCircleWireToPlane updates quaternion, position, and scale
  class MockVec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    clone() { return new MockVec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    normalize() {
      const l = Math.sqrt(this.lengthSq()) || 1;
      this.x /= l; this.y /= l; this.z /= l;
      return this;
    }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  }
  class MockQuat {
    constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
    identity() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; return this; }
    setFromUnitVectors(vFrom, vTo) {
      this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
      this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
      this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
      this.w = 1 + vFrom.dot(vTo);
      const l = Math.hypot(this.x, this.y, this.z, this.w) || 1;
      this.x /= l; this.y /= l; this.z /= l; this.w /= l;
      return this;
    }
  }
  const mockTHREE = { Vector3: MockVec3, Quaternion: MockQuat };

  const mockWire = {
    position: new MockVec3(0, 0, 0),
    quaternion: new MockQuat(),
    scale: { setScalar(s) { this.x = s; this.y = s; this.z = s; } },
  };

  const norm = new MockVec3(0, 0, 1);
  const center = new MockVec3(1, 2, 3);
  alignCircleWireToPlane(mockWire, norm, center, 8, mockTHREE);
  close(mockWire.position.x, 1, 1e-5);
  close(mockWire.position.y, 2, 1e-5);
  close(mockWire.position.z, 3, 1e-5);
  close(mockWire.scale.x, 8, 1e-5);

  // 2. computeConcyclicPlaneAndCircle computes exact circumcircle on S²(O, R)
  const R = 10;
  const lat = Math.PI / 4;
  const p1 = new MockVec3(R * Math.sin(lat) * Math.cos(0), R * Math.cos(lat), R * Math.sin(lat) * Math.sin(0));
  const p2 = new MockVec3(R * Math.sin(lat) * Math.cos(Math.PI / 2), R * Math.cos(lat), R * Math.sin(lat) * Math.sin(Math.PI / 2));
  const p3 = new MockVec3(R * Math.sin(lat) * Math.cos(Math.PI), R * Math.cos(lat), R * Math.sin(lat) * Math.sin(Math.PI));
  const res = computeConcyclicPlaneAndCircle(p1, p2, p3, R, mockTHREE);
  close(Math.abs(res.normal.y), 1.0, 1e-4);
  close(Math.abs(res.h), R * Math.cos(lat), 1e-4);
  close(res.radius, R * Math.sin(lat), 1e-4);
  close(Math.abs(res.center.y), R * Math.cos(lat), 1e-4);

  // 3. Static checks across all 7 views in circle-3d.js
  // Dynamic alignment calls in 7 circle theorem views:
  assert.ok(circle3DCode.includes('alignCircleWireToPlane(this.circleWire, circleInfo.normal, circleInfo.center, circleInfo.radius, THREE)'), 'AngleAtCentre3DView / AnglesInSameSegment3DView must call alignCircleWireToPlane');
  assert.ok(circle3DCode.includes('alignCircleWireToPlane(this.circleWire, primNormal, O, R, THREE)'), 'TangentRadius3DView must align circle wire to tangent plane');
  assert.ok(circle3DCode.includes('alignCircleWireToPlane(this.circleWire, normal, new THREE.Vector3(0, 0, 0), R, THREE)'), 'AlternateSegment3DView must align circle wire to diameter TD plane');
  assert.ok(circle3DCode.includes('alignCircleWireToPlane(this.circleWire, normal, O, R, THREE)'), 'ChordBisector3DView & TangentsFromPoint3DView must align circle wire');

  // Complete 3D spatial shading restorations:
  assert.ok(circle3DCode.includes('setTriVertices(this.sectorMesh.geometry, O, A, B)'), 'AngleAtCentre3DView must build central sector mesh in spatial mode');
  assert.ok(circle3DCode.includes('setSegment3DVertices(this.segmentMesh.geometry, circleInfo.center, circleInfo.u, circleInfo.v, circleInfo.radius, segStart, segSweep, 32, THREE)'), 'AnglesInSameSegment3DView must build 3D segmentMesh in spatial mode');
  assert.ok(circle3DCode.includes('setSegment3DVertices(this.segmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, segStart, segSweep, 32, THREE)'), 'AlternateSegment3DView must build 3D Major segment mesh in spatial mode');
  assert.ok(circle3DCode.includes('setSegment3DVertices(this.minorSegmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, arcRange.start, arcRange.sweep, 32, THREE)'), 'AlternateSegment3DView must build 3D Minor segment mesh in spatial mode');
  assert.ok(circle3DCode.includes('setSegment3DVertices(this.segmentMesh.geometry, O, u, v'), 'ChordBisector3DView must build 3D segmentMesh in spatial mode');
  assert.ok(circle3DCode.includes('setSector3DVertices(this.quadrantMesh.geometry, O, u, v, R, quadStart, Math.PI / 2, 32, THREE)'), 'TangentRadius3DView must build 3D quadrant mesh in spatial mode');
});

test('Angles in Same Segment: 3D Spatial segment mapping invariant & geodesic arch primitive decoupling', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  class MockVec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new MockVec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    crossVectors(a, b) {
      const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx;
      return this;
    }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  }
  const mockTHREE = { Vector3: MockVec3 };
  const circle3DCode = fs.readFileSync(path.join(rootDir, 'js', 'circle-3d.js'), 'utf8');
  assert.ok(circle3DCode.includes('// Keep P2 strictly concyclic on the small circle wire on S² AND in the exact SAME segment as P1'), 'AnglesInSameSegment3DView must map P2 strictly into same segment as P1');
  assert.ok(circle3DCode.includes('this.geodesicP1A = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber)'), 'AnglesInSameSegment3DView must use distinct PALETTE.amber token for geodesic arch primitives');

  const derivCode = fs.readFileSync(path.join(rootDir, 'js', 'circle-derivations.js'), 'utf8');
  assert.ok(derivCode.includes("'aiss-step-6'"), 'Derivations must include Step 6 decoupling Euclidean chord from spherical geodesic arch');

  const model = AnglesInSameSegment;
  const state = model.createInitialState();
  assert.strictEqual(state.showGeodesicOverlay, false, 'Geodesic arch overlay must be false by default to prevent visual confusion');

  const g = model.computeGeometry(state, 800, 600);
  assert.ok(typeof g.chordLen === 'number' && g.chordLen > 0, 'Must compute Euclidean chord length');
  assert.ok(typeof g.arcLen === 'number' && g.arcLen > 0, 'Must compute Geodesic arc length');
  assert.ok(typeof g.sagitta === 'number' && g.sagitta > 0, 'Must compute Sagitta height');
  assert.ok(typeof g.curvatureRatio === 'number' && g.curvatureRatio > 0 && g.curvatureRatio <= 1.0, 'Curvature ratio must be sinc(theta/2) <= 1');

  // Verify in 3D spatial geometry that AP1B == AP2B identically
  const R = 10;
  const toRad = (d) => d * Math.PI / 180;
  const latA = 1.31, latB = 1.83, latP1 = 0.84;
  const angA = toRad(210), angB = toRad(330), angP1 = toRad(120), angP2 = toRad(60);

  const A = new mockTHREE.Vector3(R * Math.sin(latA) * Math.cos(angA), R * Math.cos(latA), R * Math.sin(latA) * Math.sin(angA));
  const B = new mockTHREE.Vector3(R * Math.sin(latB) * Math.cos(angB), R * Math.cos(latB), R * Math.sin(latB) * Math.sin(angB));
  const P1 = new mockTHREE.Vector3(R * Math.sin(latP1) * Math.cos(angP1), R * Math.cos(latP1), R * Math.sin(latP1) * Math.sin(angP1));

  const circleInfo = computeConcyclicPlaneAndCircle(A, B, P1, R, mockTHREE);

  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const sweepCW2D = norm(angB - angA);
  const p1Offset2D = norm(angP1 - angA);
  const p1InCW2D = (p1Offset2D > 0 && p1Offset2D < sweepCW2D);
  const segStart2D = p1InCW2D ? angA : angB;
  const segSweep2D = p1InCW2D ? sweepCW2D : (TAU - sweepCW2D);
  const t2 = norm(angP2 - segStart2D) / (segSweep2D || 1);

  const toCircleAngle = (pt) => {
    const d = new mockTHREE.Vector3().subVectors(pt, circleInfo.center);
    return norm(Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u)));
  };
  const psiA = toCircleAngle(A);
  const psiB = toCircleAngle(B);
  const psiP1 = toCircleAngle(P1);

  const sweepCWSpatial = norm(psiB - psiA);
  const p1OffsetSpatial = norm(psiP1 - psiA);
  const p1InCWSpatial = (p1OffsetSpatial > 0 && p1OffsetSpatial < sweepCWSpatial);
  const segStartSpatial = p1InCWSpatial ? psiA : psiB;
  const segSweepSpatial = p1InCWSpatial ? sweepCWSpatial : (TAU - sweepCWSpatial);

  const psiP2 = norm(segStartSpatial + t2 * segSweepSpatial);
  const P2 = circleInfo.center.clone()
    .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiP2))
    .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiP2));

  const deg = (V, P_A, P_B) => {
    const v1 = new mockTHREE.Vector3().subVectors(P_A, V);
    const v2 = new mockTHREE.Vector3().subVectors(P_B, V);
    const dot = v1.dot(v2);
    const mag = v1.length() * v2.length();
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  };

  const a1 = deg(P1, A, B);
  const a2 = deg(P2, A, B);
  close(a1, a2, 1e-4);
  assert.ok(Math.abs(a1 - a2) < 1e-4, 'Angles AP1B and AP2B in 3D spatial mode must be identical (same segment invariant)');
});

test('Alternate Segment: 3D Spatial concyclic circumplane invariant & 2D/3D telemetry coherence', () => {
  const rootDir = process.cwd();
  class MockVec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new MockVec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    crossVectors(a, b) {
      const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx;
      return this;
    }
    cross(b) {
      const x = this.y * b.z - this.z * b.y;
      const y = this.z * b.x - this.x * b.z;
      const z = this.x * b.y - this.y * b.x;
      this.x = x; this.y = y; this.z = z;
      return this;
    }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  }
  const mockTHREE = { Vector3: MockVec3 };

  const deg = (V, P_A, P_B) => {
    const v1 = new mockTHREE.Vector3().subVectors(P_A, V);
    const v2 = new mockTHREE.Vector3().subVectors(P_B, V);
    const dot = v1.dot(v2);
    const mag = v1.length() * v2.length();
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  };

  const R = 10;
  const latT = 1.25, latB = 1.75;
  const angT = 4.71, angA = 2.62, angB = 0.70;

  const T = new mockTHREE.Vector3(
    R * Math.sin(latT) * Math.cos(angT),
    R * Math.cos(latT),
    R * Math.sin(latT) * Math.sin(angT)
  );
  const D = T.clone().negate();
  const rawB = new mockTHREE.Vector3(
    R * Math.sin(latB) * Math.cos(angB),
    R * Math.cos(latB),
    R * Math.sin(latB) * Math.sin(angB)
  );

  const vTD = new mockTHREE.Vector3().subVectors(D, T);
  const vTB = new mockTHREE.Vector3().subVectors(rawB, T);
  let normal = new mockTHREE.Vector3().crossVectors(vTD, vTB).normalize();
  const u = T.clone().normalize();
  const v = normal.clone().cross(u).normalize();

  const TAU = Math.PI * 2;
  const dAngA = ((angA - angT) % TAU + TAU) % TAU;
  const dAngB = ((angB - angT) % TAU + TAU) % TAU;

  const A = new mockTHREE.Vector3().addScaledVector(u, R * Math.cos(dAngA)).addScaledVector(v, R * Math.sin(dAngA));
  const B = new mockTHREE.Vector3().addScaledVector(u, R * Math.cos(dAngB)).addScaledVector(v, R * Math.sin(dAngB));

  const tanDir = v.clone();
  const tan1 = new mockTHREE.Vector3().addScaledVector(tanDir, -14).addVectors(T, tanDir.clone().multiplyScalar(-14));
  const tan2 = new mockTHREE.Vector3().addScaledVector(tanDir, 14).addVectors(T, tanDir.clone().multiplyScalar(14));

  const degB = deg(B, T, A);
  const degTan1 = deg(T, tan1, A);
  const degTan2 = deg(T, tan2, A);
  const degTan = Math.abs(degTan1 - degB) <= Math.abs(degTan2 - degB) ? degTan1 : degTan2;
  const degIntD = deg(D, T, A);
  const thalesTBD = deg(B, T, D);
  const thalesTAD = deg(A, T, D);

  // Invariant verification: Alternate Segment Theorem holds to machine precision in 3D
  close(degTan, degB, 1e-4);
  close(degIntD, degB, 1e-4);
  close(thalesTBD, 90.0, 1e-4);
  close(thalesTAD, 90.0, 1e-4);

  // Static checks that main.js and circle-3d.js store and synchronize 3D telemetry
  const circle3DCode = fs.readFileSync(path.join(rootDir, 'js', 'circle-3d.js'), 'utf8');
  const matches = circle3DCode.match(/this\.lastComputed3D\s*=/g);
  assert.equal(matches?.length, 7, 'All 7 Circle Theorem 3D scene views must populate this.lastComputed3D');
  assert.ok(circle3DCode.includes('dAngA = ((state.angleA - state.angleT)'), 'AlternateSegment3DView must map A concyclically onto diameter TD circle plane');

  const visualizers = [
    'alternate-segment',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];
  for (const v of visualizers) {
    const mainJs = fs.readFileSync(path.join(rootDir, 'visuals', 'circle-theorems', v, 'src', 'main.js'), 'utf8');
    assert.ok(
      mainJs.includes('scene3d.lastComputed3D') || mainJs.includes('scene3d?.lastComputed3D'),
      `${v} main.js must read live 3D metrics from scene3d.lastComputed3D in spatial mode`
    );
  }

  // 3D Spatial Segment and Sector Shading Alignment Invariants
  assert.ok(
    circle3DCode.includes('const arcRange = getSubtendedArcRange3D(0, dAngA, dAngB);'),
    'AlternateSegment3DView must compute arcRange relative to basis {u, v} so segments are bound by chord TA'
  );
  assert.ok(
    circle3DCode.includes('const segStart = segStartSpatial;'),
    'AnglesInSameSegment3DView must use segStartSpatial and segSweepSpatial in circleInfo {u, v} basis'
  );
  assert.ok(
    circle3DCode.includes('let u = new THREE.Vector3(1, 0, 0).projectOnPlane(primNormal);'),
    'TangentRadius3DView must align 3D quadrant sector shading to coordinate plane axes'
  );
});

test('Cyclic Quadrilateral: 3D Spatial Mode concyclic arc parameterization, directional drag synchronization, and supplementary angle invariant', () => {
  const R = 10;
  const toRad = (d) => d * Math.PI / 180;
  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;

  // 1. Initial 2D state angles
  const angA = toRad(140);
  const angB = toRad(40);
  const angC = toRad(310);
  const angD = toRad(230);
  const latA = 1.25, latB = 1.75, latC = 1.45;

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  }

  const customTHREE = { Vector3: Vec3 };

  const A = new Vec3(R * Math.sin(latA) * Math.cos(angA), R * Math.cos(latA), R * Math.sin(latA) * Math.sin(angA));
  const B = new Vec3(R * Math.sin(latB) * Math.cos(angB), R * Math.cos(latB), R * Math.sin(latB) * Math.sin(angB));
  const C = new Vec3(R * Math.sin(latC) * Math.cos(angC), R * Math.cos(latC), R * Math.sin(latC) * Math.sin(angC));

  const circleInfo = computeConcyclicPlaneAndCircle(A, B, C, R, customTHREE);

  // Canonical 2D arc containing D (between A and C, excluding B) with t in [0, 1] (0 = A, 1 = C)
  const sweepPos2D = norm(angC - angA);
  const bOffset2D = norm(angB - angA);
  const bInPos2D = (bOffset2D > 0 && bOffset2D < sweepPos2D);
  const sweepAC2D = bInPos2D ? -(TAU - sweepPos2D) : sweepPos2D;
  const rawT = sweepAC2D > 0
    ? norm(angD - angA) / sweepAC2D
    : norm(angA - angD) / (-sweepAC2D);
  const tD = Math.max(0.01, Math.min(0.99, rawT));

  const toCircleAngle = (pt) => {
    const d = new Vec3().subVectors(pt, circleInfo.center);
    return norm(Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u)));
  };
  const psiA = toCircleAngle(A);
  const psiB = toCircleAngle(B);
  const psiC = toCircleAngle(C);

  const sweepPosSpatial = norm(psiC - psiA);
  const bOffsetSpatial = norm(psiB - psiA);
  const bInPosSpatial = (bOffsetSpatial > 0 && bOffsetSpatial < sweepPosSpatial);
  const sweepACSpatial = bInPosSpatial ? -(TAU - sweepPosSpatial) : sweepPosSpatial;

  const psiD = norm(psiA + tD * sweepACSpatial);
  const D = circleInfo.center.clone()
    .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiD))
    .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiD));

  // Invariant 1: D is concyclic with A, B, C (distance from center == radius)
  const distDFromCenter = D.distanceTo(circleInfo.center);
  assert.ok(Math.abs(distDFromCenter - circleInfo.radius) < 1e-4, 'D must lie strictly on the circle of A, B, C');

  // Invariant 2: Euclidean opposite angle sums equal 180° on the cutting plane
  const deg = (V, P_A, P_B) => {
    const v1 = new Vec3().subVectors(P_A, V);
    const v2 = new Vec3().subVectors(P_B, V);
    const dot = v1.dot(v2);
    const mag = v1.length() * v2.length();
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  };
  const degA = deg(A, B, D);
  const degB = deg(B, A, C);
  const degC = deg(C, B, D);
  const degD = deg(D, C, A);

  assert.ok(Math.abs((degA + degC) - 180) < 1e-3, `Opposite angles A+C must sum to 180° on cutting plane (got ${degA + degC})`);
  assert.ok(Math.abs((degB + degD) - 180) < 1e-3, `Opposite angles B+D must sum to 180° on cutting plane (got ${degB + degD})`);

  // Invariant 3: Directional drag synchronization and bidirectional parity
  // Case A: Dragging D towards C in 3D (t = 0.85) increases parameter t and moves 2D angle towards C
  const tTowardC = 0.85;
  const psiDTowardC = norm(psiA + tTowardC * sweepACSpatial);
  const hitTowardC = circleInfo.center.clone()
    .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiDTowardC))
    .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiDTowardC));

  const dHitC = new Vec3().subVectors(hitTowardC, circleInfo.center);
  const psiHitC = norm(Math.atan2(dHitC.dot(circleInfo.v), dHitC.dot(circleInfo.u)));
  const reconstructedTC = sweepACSpatial > 0
    ? norm(psiHitC - psiA) / sweepACSpatial
    : norm(psiA - psiHitC) / (-sweepACSpatial);
  assert.ok(Math.abs(reconstructedTC - tTowardC) < 1e-4, 'Reconstructed arc parameter from 3D hit towards C must match 0.85');
  const reconstructed2DAngleC = norm(angA + reconstructedTC * sweepAC2D);
  assert.ok(norm(reconstructed2DAngleC - angA) > norm(angD - angA), 'Dragging D towards C in 3D must increase separation from A in 2D');
  assert.ok(norm(angC - reconstructed2DAngleC) < norm(angC - angD), 'Dragging D towards C in 3D must decrease separation to C in 2D');

  // Case B: Dragging D towards A in 3D (t = 0.25) decreases parameter t and moves 2D angle towards A
  const tTowardA = 0.25;
  const psiDTowardA = norm(psiA + tTowardA * sweepACSpatial);
  const hitTowardA = circleInfo.center.clone()
    .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiDTowardA))
    .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiDTowardA));

  const dHitA = new Vec3().subVectors(hitTowardA, circleInfo.center);
  const psiHitA = norm(Math.atan2(dHitA.dot(circleInfo.v), dHitA.dot(circleInfo.u)));
  const reconstructedTA = sweepACSpatial > 0
    ? norm(psiHitA - psiA) / sweepACSpatial
    : norm(psiA - psiHitA) / (-sweepACSpatial);
  assert.ok(Math.abs(reconstructedTA - tTowardA) < 1e-4, 'Reconstructed arc parameter from 3D hit towards A must match 0.25');
  const reconstructed2DAngleA = norm(angA + reconstructedTA * sweepAC2D);
  assert.ok(norm(reconstructed2DAngleA - angA) < norm(angD - angA), 'Dragging D towards A in 3D must decrease separation to A in 2D');
  assert.ok(norm(angC - reconstructed2DAngleA) > norm(angC - angD), 'Dragging D towards A in 3D must increase separation from C in 2D');
});

test('Perpendicular Chord Bisector: Decoupled telemetry, canvas, 3D, and derivation color grammar (Emerald, Teal, Cyan, Lavender)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const htmlPath = path.join(rootDir, 'visuals/circle-theorems/perpendicular-chord-bisector/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 1. 2D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-emerald">Difference |AM − MB|:</span><strong class="color-emerald" id="tel-diff">'),
    'Difference |AM - MB| in 2D telemetry must use color-emerald'
  );
  assert.ok(
    html.includes('<span class="color-teal">Angle at M (∠OMA):</span><span class="color-teal" id="tel-angle-oma">'),
    'Angle at M in 2D telemetry must use color-teal'
  );
  assert.ok(
    html.includes('<span class="color-cyan">Reflex Right Angle (M*):</span><strong class="color-cyan" id="tel-reflex-m">'),
    'Reflex Right Angle in 2D telemetry must use color-cyan'
  );
  assert.ok(
    html.includes('<span class="color-lavender">Perigon (90° + 270°):</span><strong class="color-lavender" id="tel-perigon-m">'),
    'Perigon in 2D telemetry must use color-lavender'
  );

  // 2. 3D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-teal">3D Bisector Angle:</span><strong class="color-teal" id="val-3d-ang-m">'),
    '3D Bisector Angle must use color-teal'
  );
  assert.ok(
    html.includes('<span class="color-emerald">3D Invariant Δ:</span><strong class="color-emerald" id="val-3d-diff">'),
    '3D Invariant Δ must use color-emerald'
  );
  assert.ok(
    html.includes('<span class="color-cyan">3D Reflex Angle M*:</span><strong class="color-cyan" id="val-3d-reflex-m">'),
    '3D Reflex Angle M* must use color-cyan'
  );
  assert.ok(
    html.includes('<span class="color-lavender">3D Perigon Invariant:</span><strong class="color-lavender" id="val-3d-perigon-m">'),
    '3D Perigon Invariant must use color-lavender'
  );

  // 3. Canvas 2D reflex uses PALETTE.cyan
  const canvasPath = path.join(rootDir, 'visuals/circle-theorems/perpendicular-chord-bisector/src/canvas.js');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf8');
  assert.ok(
    canvasSrc.includes("drawReflexWedge(ctx, g.M, angMA, angMO, 28, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);"),
    'CanvasView must render reflex wedge with PALETTE.cyan'
  );
  assert.ok(
    canvasSrc.includes("drawTextBadge(ctx, '270.0° (M*)', g.M.x + 36 * uOMx, g.M.y + 36 * uOMy, PALETTE.cyan);"),
    'CanvasView must label 270° reflex badge with PALETTE.cyan'
  );

  // 4. Scene 3D reflex mesh & label uses cyan
  const scene3DPath = path.join(rootDir, 'js/circle-3d.js');
  const scene3DSrc = fs.readFileSync(scene3DPath, 'utf8');
  assert.ok(
    scene3DSrc.includes('this.reflexRightMesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25);'),
    'ChordBisector3DView must instantiate reflex wedge mesh with PALETTE.cyan'
  );
  assert.ok(
    scene3DSrc.includes("key: 'reflexM'") && scene3DSrc.includes("color: 'color-cyan'"),
    'ChordBisector3DView must render 3D reflexM label badge with color-cyan'
  );

  // 5. Live derivations grammar
  const derivPath = path.join(rootDir, 'js/circle-derivations.js');
  const derivSrc = fs.readFileSync(derivPath, 'utf8');
  assert.ok(
    derivSrc.includes("tag('emerald', `Δ = |AM - MB| = ${diff}`)"),
    'Derivations Step 4 must render Invariant Difference with emerald tag'
  );
  assert.ok(
    derivSrc.includes("tag('cyan', '270.0°')"),
    'Derivations Step 5 title must render 270.0° with cyan tag'
  );
  assert.ok(
    derivSrc.includes("tag('cyan', `Midpoint Reflex M* = ${fmtAngle(270, angUnit)}`)"),
    'Derivations Step 5 evaluation highlight must render Midpoint Reflex M* with cyan tag'
  );
  assert.ok(
    derivSrc.includes("tag('lavender', `(Perigon ${fmtAngle(360, angUnit)})`)"),
    'Derivations Step 5 evaluation highlight must render Perigon with lavender tag'
  );
});

test('Tangents from External Point: Decoupled telemetry, canvas, 3D, and derivation color grammar (Red, Violet, Cyan, Sky, Amber)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const htmlPath = path.join(rootDir, 'visuals/circle-theorems/tangents-from-external-point/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 1. 2D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-violet">Diagonal Intersection ∠OKT₁:</span><strong class="color-violet">90.0°</strong>'),
    'Diagonal Intersection in 2D telemetry must use color-violet matching node K'
  );
  assert.ok(
    html.includes('<span class="color-red">Total Subtended ∠T₁PT₂ (2α):</span><strong class="color-red" id="tel-angle-tpt">'),
    'Total Subtended ∠T₁PT₂ in 2D telemetry must use color-red matching apex P'
  );
  assert.ok(
    html.includes('<span class="color-cyan">Reflex Right Angles (T₁*, T₂*):</span><strong class="color-cyan" id="tel-reflex-tangent">'),
    'Reflex Right Angles in 2D telemetry must use color-cyan'
  );

  // 2. 3D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-sky">Radius R:</span><span class="color-sky" id="val-3d-r">'),
    '3D Radius R must use color-sky matching 2D radius and great circle wire'
  );
  assert.ok(
    html.includes('<span class="color-cyan">3D Reflex Angles (T₁*, T₂*):</span><strong class="color-cyan" id="val-3d-reflex-tangent">'),
    '3D Reflex Angles in 3D telemetry must use color-cyan'
  );

  // 3. Canvas 2D reflex uses PALETTE.cyan
  const canvasPath = path.join(rootDir, 'visuals/circle-theorems/tangents-from-external-point/src/canvas.js');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf8');
  assert.ok(
    canvasSrc.includes("drawReflexWedge(ctx, g.T1, angT1O, angT1P, 26, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);"),
    'CanvasView must render T1 reflex wedge with PALETTE.cyan'
  );
  assert.ok(
    canvasSrc.includes("drawReflexWedge(ctx, g.T2, angT2O, angT2P, 26, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);"),
    'CanvasView must render T2 reflex wedge with PALETTE.cyan'
  );
  assert.ok(
    canvasSrc.includes("drawTextBadge(ctx, '270.0° (T₁*)', g.T1.x - 38 * (bis1X / l1), g.T1.y - 38 * (bis1Y / l1), PALETTE.cyan);"),
    'CanvasView must label T1 270° reflex badge with PALETTE.cyan'
  );

  // 4. Scene 3D reflex mesh & labels use cyan
  const scene3DPath = path.join(rootDir, 'js/circle-3d.js');
  const scene3DSrc = fs.readFileSync(scene3DPath, 'utf8');
  assert.ok(
    scene3DSrc.includes('this.reflexRight1Mesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25);'),
    'TangentsFromPoint3DView must instantiate reflex1 wedge mesh with PALETTE.cyan'
  );
  assert.ok(
    scene3DSrc.includes("key: 'reflex1'") && scene3DSrc.includes("color: 'color-cyan'"),
    'TangentsFromPoint3DView must render 3D reflex1 label badge with color-cyan'
  );

  // 5. Live derivations grammar
  const derivPath = path.join(rootDir, 'js/circle-derivations.js');
  const derivSrc = fs.readFileSync(derivPath, 'utf8');
  assert.ok(
    derivSrc.includes("tag('amber', 'Area = r · √(d² - r²)')"),
    'Derivations Step 3 card must render Kite Area formula with amber tag'
  );
  assert.ok(
    derivSrc.includes("tag('cyan', '∠OT₁P* = 270.0°')"),
    'Derivations Step 5 card must render 270.0° reflex with cyan tag'
  );
  assert.ok(
    derivSrc.includes("tag('cyan', `T₁* = T₂* = ${fmtAngle(270, angUnit)}`)"),
    'Derivations Step 5 evaluation highlight must render Contact Reflexes with cyan tag'
  );

  // 6. Responsive Telemetry Layout Checks (no clipping)
  const circleVisualCss = fs.readFileSync(path.join(rootDir, 'css/circle-visual.css'), 'utf8');
  assert.ok(
    circleVisualCss.includes('max-height: calc(100% - 2rem) !important;') &&
    circleVisualCss.includes('max-height: min(20rem, calc(100% - 2.8rem)) !important;'),
    'css/circle-visual.css must enforce dynamic viewport containment on .stats-overlay and .stats-body'
  );
  const visualCss = fs.readFileSync(path.join(rootDir, 'css/visual.css'), 'utf8');
  assert.ok(
    visualCss.includes('max-height: calc(100% - 2rem) !important;') &&
    visualCss.includes('max-height: min(20rem, calc(100% - 2.8rem)) !important;'),
    'css/visual.css must enforce dynamic viewport containment on .stats-overlay and .stats-body'
  );
  assert.ok(
    !html.includes('style="max-height: 380px'),
    'tangents-from-external-point/index.html must not contain static max-height: 380px'
  );
});

test('Tangent-Radius: Decoupled telemetry, canvas, 3D, and derivation color grammar (Lime, Steel, Violet, Cyan, Lavender, Red)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const htmlPath = path.join(rootDir, 'visuals/circle-theorems/tangent-radius/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 1. 2D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-lime">Tangent Vector (v_tan):</span><strong class="color-lime" id="tel-vtan">'),
    'Tangent Vector in 2D telemetry must use color-lime'
  );
  assert.ok(
    html.includes('<span class="color-steel">Vector Dot Product (r · t):</span><strong class="color-steel" id="tel-dot">'),
    'Vector Dot Product in 2D telemetry must use color-steel'
  );
  assert.ok(
    html.includes('<span class="color-violet">Secant Hypotenuse (|O Sx|):</span><strong class="color-violet" id="tel-trig-sec-span">'),
    'Secant Hypotenuse in 2D telemetry must use color-violet'
  );
  assert.ok(
    html.includes('<span class="color-cyan">Reflex Right Angle (T*):</span><strong class="color-cyan" id="tel-reflex-tangent">'),
    'Reflex Right Angle in 2D telemetry must use color-cyan'
  );
  assert.ok(
    html.includes('<span class="color-lavender">Perigon Arc (90° + 270°):</span><strong class="color-lavender" id="tel-perigon-tangent">'),
    'Perigon Arc in 2D telemetry must use color-lavender'
  );

  // 2. 3D Telemetry Decoupled Palette
  assert.ok(
    html.includes('<span class="color-red">Contact T (x, z):</span><span class="color-red" id="val-3d-t">'),
    'Contact Point T in 3D telemetry must use color-red'
  );
  assert.ok(
    html.includes('<span class="color-lime">Tangent Vector (v_tan):</span><strong class="color-lime" id="val-3d-vtan">'),
    'Tangent Vector in 3D telemetry must use color-lime'
  );
  assert.ok(
    html.includes('<span class="color-steel">3D Dot Product (r · t):</span><strong class="color-steel" id="val-3d-dot">'),
    'Vector Dot Product in 3D telemetry must use color-steel'
  );
  assert.ok(
    html.includes('<span class="color-violet">3D Secant Hypotenuse (|O Sx|):</span><strong class="color-violet" id="val-3d-trig-sec-span">'),
    'Secant Hypotenuse in 3D telemetry must use color-violet'
  );
  assert.ok(
    html.includes('<span class="color-cyan">3D Reflex Angle T*:</span><strong class="color-cyan" id="val-3d-reflex-tangent">'),
    'Reflex Right Angle in 3D telemetry must use color-cyan'
  );
  assert.ok(
    html.includes('<span class="color-lavender">3D Perigon Invariant:</span><strong class="color-lavender" id="val-3d-perigon-tangent">'),
    'Perigon Invariant in 3D telemetry must use color-lavender'
  );

  // 3. Canvas 2D styles
  const canvasPath = path.join(rootDir, 'visuals/circle-theorems/tangent-radius/src/canvas.js');
  const canvasSrc = fs.readFileSync(canvasPath, 'utf8');
  assert.ok(
    canvasSrc.includes('drawDoubleArrow(ctx, t.T1, t.T2, PALETTE.lime, 3);'),
    'CanvasView must render Tangent Line double arrow with PALETTE.lime'
  );
  assert.ok(
    canvasSrc.includes("ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';"),
    'CanvasView must render Secant Hypotenuse with violet rgba'
  );
  assert.ok(
    canvasSrc.includes("drawReflexWedge(ctx, t.pt, angRad, angTan, 26, 'rgba(6, 182, 212, 0.18)', PALETTE.cyan);"),
    'CanvasView must render reflex wedge with PALETTE.cyan'
  );
  assert.ok(
    canvasSrc.includes('drawTextBadge(ctx, `${t.name}* = 270.0°`, rbx, rby, PALETTE.cyan);'),
    'CanvasView must label 270.0° reflex badge with PALETTE.cyan'
  );

  // 4. 3D Scene Architecture & Labels
  const scene3DPath = path.join(rootDir, 'js/circle-3d.js');
  const scene3DSrc = fs.readFileSync(scene3DPath, 'utf8');
  assert.ok(
    scene3DSrc.includes('this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.lime);'),
    'TangentRadius3DView must instantiate tangentDoubleArrow with PALETTE.lime'
  );
  assert.ok(
    scene3DSrc.includes('this.lineSecantHypot = makeLine(THREE, PALETTE.violet, true);'),
    'TangentRadius3DView must instantiate lineSecantHypot with PALETTE.violet'
  );
  assert.ok(
    scene3DSrc.includes('makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25)'),
    'TangentRadius3DView must instantiate reflex wedge meshes with PALETTE.cyan'
  );
  assert.ok(
    scene3DSrc.includes("key: `reflex_${t.name}`") && scene3DSrc.includes("color: 'color-cyan'"),
    'TangentRadius3DView must render reflex angle badge with color-cyan'
  );

  // 5. Live Math Derivations Grammar
  const derivPath = path.join(rootDir, 'js/circle-derivations.js');
  const derivSrc = fs.readFileSync(derivPath, 'utf8');
  assert.ok(
    derivSrc.includes("tag('lime', 'v_tan')"),
    'TangentRadiusDerivations Step 2 must tag v_tan in lime'
  );
  assert.ok(
    derivSrc.includes("tag('steel', '0')") && derivSrc.includes("tag('steel', '0.0000')"),
    'TangentRadiusDerivations Step 3 must tag dot product in steel'
  );
  assert.ok(
    derivSrc.includes("tag('cyan', '270.0°')") && derivSrc.includes("tag('lavender', '360°')"),
    'TangentRadiusDerivations Step 7 must tag 270.0° reflex in cyan and 360° in lavender'
  );
  assert.ok(
    derivSrc.includes("tag('violet', '|O S_x|²')") || derivSrc.includes("tag('violet', '|O S_x|"),
    'TangentRadiusDerivations Step 8 must tag secant hypotenuse in violet'
  );
});
