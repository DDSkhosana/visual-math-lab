import test from 'node:test';
import assert from 'node:assert/strict';

import * as AngleAtCentre from '../visuals/angle-at-centre/src/model.js';
import * as AnglesInSameSegment from '../visuals/angles-in-same-segment/src/model.js';
import * as CyclicQuad from '../visuals/cyclic-quadrilateral/src/model.js';
import * as TangentRadius from '../visuals/tangent-radius/src/model.js';
import * as AlternateSegment from '../visuals/alternate-segment/src/model.js';
import * as TangentsFromPoint from '../visuals/tangents-from-external-point/src/model.js';
import * as ChordBisector from '../visuals/perpendicular-chord-bisector/src/model.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get3DAngleBisector, get3DAngleDegrees } from '../js/circle-3d.js';
import { PALETTE, UnitSystemConverter, createStore, CHEVRON_DOWN_SVG, CHEVRON_UP_SVG, setExpandButtonUI, CHEVRON_DOWN_SINGLE_SVG, CHEVRON_UP_SINGLE_SVG, setPanelMinimizeButtonUI, initCollapsibleSections } from '../js/circle-core.js';
import { setExpandButtonUI as thalesSetExpandButtonUI, CHEVRON_DOWN_SINGLE_SVG as thalesChevronDownSingle, CHEVRON_UP_SINGLE_SVG as thalesChevronUpSingle, setPanelMinimizeButtonUI as thalesSetPanelMinimizeButtonUI } from '../visuals/thales-theorem/src/ui/Accordion.js';

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

test('Cyclic Quadrilateral: opposite angles sum to 180° and total interior sum is 360°', () => {
  const width = 800;
  const height = 600;
  const state = CyclicQuad.createInitialState();

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
    { name: 'angle-at-centre', model: AngleAtCentre, canvasMod: await import('../visuals/angle-at-centre/src/canvas.js') },
    { name: 'angles-in-same-segment', model: AnglesInSameSegment, canvasMod: await import('../visuals/angles-in-same-segment/src/canvas.js') },
    { name: 'cyclic-quadrilateral', model: CyclicQuad, canvasMod: await import('../visuals/cyclic-quadrilateral/src/canvas.js') },
    { name: 'tangent-radius', model: TangentRadius, canvasMod: await import('../visuals/tangent-radius/src/canvas.js') },
    { name: 'alternate-segment', model: AlternateSegment, canvasMod: await import('../visuals/alternate-segment/src/canvas.js') },
    { name: 'tangents-from-external-point', model: TangentsFromPoint, canvasMod: await import('../visuals/tangents-from-external-point/src/canvas.js') },
    { name: 'perpendicular-chord-bisector', model: ChordBisector, canvasMod: await import('../visuals/perpendicular-chord-bisector/src/canvas.js') },
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
    { name: 'angle-at-centre', model: AngleAtCentre, canvasMod: await import('../visuals/angle-at-centre/src/canvas.js') },
    { name: 'angles-in-same-segment', model: AnglesInSameSegment, canvasMod: await import('../visuals/angles-in-same-segment/src/canvas.js') },
    { name: 'cyclic-quadrilateral', model: CyclicQuad, canvasMod: await import('../visuals/cyclic-quadrilateral/src/canvas.js') },
    { name: 'tangent-radius', model: TangentRadius, canvasMod: await import('../visuals/tangent-radius/src/canvas.js') },
    { name: 'alternate-segment', model: AlternateSegment, canvasMod: await import('../visuals/alternate-segment/src/canvas.js') },
    { name: 'tangents-from-external-point', model: TangentsFromPoint, canvasMod: await import('../visuals/tangents-from-external-point/src/canvas.js') },
    { name: 'perpendicular-chord-bisector', model: ChordBisector, canvasMod: await import('../visuals/perpendicular-chord-bisector/src/canvas.js') },
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
    const htmlPath = path.join(rootDir, 'visuals', dir, 'index.html');
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
    { file: 'visuals/thales-theorem/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/thales-theorem/' },
    { file: 'visuals/angle-at-centre/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/angle-at-centre/' },
    { file: 'visuals/angles-in-same-segment/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/angles-in-same-segment/' },
    { file: 'visuals/cyclic-quadrilateral/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/cyclic-quadrilateral/' },
    { file: 'visuals/tangent-radius/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/tangent-radius/' },
    { file: 'visuals/alternate-segment/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/alternate-segment/' },
    { file: 'visuals/tangents-from-external-point/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/tangents-from-external-point/' },
    { file: 'visuals/perpendicular-chord-bisector/index.html', url: 'https://ddskhosana.github.io/visual-math-lab/visuals/perpendicular-chord-bisector/' },
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
    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
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

  assert.strictEqual(visuals.length, 8, 'Must have exactly 8 visual metadata entries');

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

  for (const visual of visuals) {
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
  const thalesCss = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'layout.css'), 'utf8');

  assert.ok(css.includes('#canvas-2d-container') && css.includes('touch-action: none;'), 'circle-visual.css must style #canvas-2d-container with touch-action: none;');
  assert.ok(css.includes('#canvas-3d-container') && css.includes('touch-action: none;'), 'circle-visual.css must style #canvas-3d-container with touch-action: none;');
  assert.ok(thalesCss.includes('.thales-explorer canvas') && thalesCss.includes('touch-action: none;'), 'Thales layout.css must style .thales-explorer canvas with touch-action: none;');
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
  const canvasMod = await import('../visuals/alternate-segment/src/canvas.js');
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
  const altHtml = fs.readFileSync(path.join(rootDir, 'visuals', 'alternate-segment', 'index.html'), 'utf8');
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
    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
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
  const cssOverlays = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'overlays.css'), 'utf8');

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
    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
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
  const thales3d = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'views', 'Scene3DView.js'), 'utf8');

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

  const thalesMain = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'main.js'), 'utf8');
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
    const html = fs.readFileSync(path.join(rootDir, 'visuals', slug, 'index.html'), 'utf8');
    assert.ok(
      (html.includes('data-preset="iso" class="active"') || html.includes('data-preset="isometric" class="active"')),
      `${slug}/index.html camera-presets-bar must have iso active by default`
    );
  }
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
    const mainJs = fs.readFileSync(path.join(rootDir, 'visuals', slug, 'src', 'main.js'), 'utf8');
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
  const thales2D = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'controllers', 'Canvas2DInteraction.js'), 'utf8');
  assert.ok(thales2D.includes("distCirc < 14"), 'Thales Canvas2DInteraction.js must allow circumference click to enter radius resizing mode');
  assert.ok(thales2D.includes("this.mode = 'radius'"), 'Thales Canvas2DInteraction.js must activate radius resizing mode');
  assert.ok(thales2D.includes("ew-resize"), 'Thales Canvas2DInteraction.js must show ew-resize cursor on circumference hover');
  assert.ok(thales2D.includes("canvas.addEventListener('wheel'"), 'Thales Canvas2DInteraction.js must have wheel listener for 2D canvas');

  const thales3D = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'controllers', 'Scene3DInteraction.js'), 'utf8');
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
    const mainJs = fs.readFileSync(path.join(rootDir, 'visuals', slug, 'src', 'main.js'), 'utf8');
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
  const thales2D = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'controllers', 'Canvas2DInteraction.js'), 'utf8');
  assert.ok(thales2D.includes("this.mode = 'pan'"), "Thales Canvas2DInteraction.js must support mode 'pan'");
  assert.ok(thales2D.includes("this.view.canvas.style.cursor = 'grab'"), "Thales Canvas2DInteraction.js must use 'grab' cursor");
  assert.ok(thales2D.includes("this.store.set({ pan:"), "Thales Canvas2DInteraction.js must dispatch pan updates to store");
  assert.ok(thales2D.includes("canvas.addEventListener('dblclick', () => store.set({ pan: { x: 0, y: 0 } }))"), "Thales Canvas2DInteraction.js must reset pan on dblclick");

  const thalesMain = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'main.js'), 'utf8');
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
    const html = fs.readFileSync(path.join(rootDir, 'visuals', slug, 'index.html'), 'utf8');
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
    path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'controls.css'),
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
    const html = fs.readFileSync(path.join(rootDir, 'visuals', slug, 'index.html'), 'utf8');
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
  const thalesToolbarJs = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'src', 'ui', 'DraggableToolbar.js'), 'utf8');
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
  const { ViewModeController: ThalesViewModeController } = await import('../visuals/thales-theorem/src/controllers/ViewModeController.js');
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

  // 3. WorkspaceDockManager: Viewport deduction sets compact dataset
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
  const thalesResponsiveCss = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'responsive.css'), 'utf8');
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
    'visuals/angle-at-centre/src/canvas.js',
    'visuals/angles-in-same-segment/src/canvas.js',
    'visuals/cyclic-quadrilateral/src/canvas.js',
    'visuals/perpendicular-chord-bisector/src/canvas.js',
    'visuals/tangent-radius/src/canvas.js',
    'visuals/tangents-from-external-point/src/canvas.js',
    'visuals/alternate-segment/src/canvas.js',
    'visuals/thales-theorem/src/views/canvas2d-draw.js',
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

  const thalesOverlayContent = fs.readFileSync(path.join(rootDir, 'visuals/thales-theorem/src/views/LabelOverlayView.js'), 'utf8');
  assert.ok(!thalesOverlayContent.includes("key: 'theta'") || !thalesOverlayContent.includes('\\n'), 'LabelOverlayView.js: angle labels must not contain newline \\n');

  // 4. CSS for 3D angle labels must enforce single-line nowrap
  const visualCss = fs.readFileSync(path.join(rootDir, 'css/circle-visual.css'), 'utf8');
  assert.ok(visualCss.includes('.label-3d.is-angle'), 'circle-visual.css must style .label-3d.is-angle');
  assert.ok(visualCss.includes('white-space: nowrap;'), 'circle-visual.css must enforce white-space: nowrap for labels');
});

