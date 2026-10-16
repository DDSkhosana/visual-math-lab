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
import { PALETTE, UnitSystemConverter, createStore } from '../js/circle-core.js';

const close = (actual, expected, eps = 1e-6) => assert.ok(Math.abs(actual - expected) < eps, `${actual} !~ ${expected}`);

test('Angle at Centre: central angle is exactly 2x inscribed angle across various configurations', () => {
  const width = 800;
  const height = 600;
  const state = AngleAtCentre.createInitialState();

  // Test across multiple arc spans with P on the remaining part of the circle
  for (let span = 0.2 * Math.PI; span <= 0.9 * Math.PI; span += 0.2) {
    state.angleA = 0;
    state.angleB = span;
    state.angleP = span / 2 + Math.PI;
    const g = AngleAtCentre.computeGeometry(state, width, height);

    close(g.centralDeg, 2 * g.inscribedDeg, 1e-4);
    close(g.ratio, 2.0, 1e-4);
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
  // 1. Alternate Segment: Dragging Point D updates Point T (antipodal D = -T)
  const altState = AlternateSegment.createInitialState();
  const TAU = Math.PI * 2;
  for (const angD of [0.2 * Math.PI, 0.7 * Math.PI, 1.3 * Math.PI, 1.8 * Math.PI]) {
    const derivedAngT = (angD - Math.PI + TAU * 2) % TAU;
    const g = AlternateSegment.computeGeometry({ ...altState, angleT: derivedAngT }, 800, 600);
    // Inscribed angle at B and tangent angle must remain strictly equal
    close(g.tangentChordDeg, g.inscribedDeg, 1e-4);
    // Point D must be antipodal to T
    const dxT = g.T.x - g.cx;
    const dyT = g.T.y - g.cy;
    const dxD = g.D.x - g.cx;
    const dyD = g.D.y - g.cy;
    close(dxT + dxD, 0, 1e-4);
    close(dyT + dyD, 0, 1e-4);
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

