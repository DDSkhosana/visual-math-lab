import test from 'node:test';
import assert from 'node:assert/strict';

import * as AngleAtCentre from '../visuals/angle-at-centre/src/model.js';
import * as AnglesInSameSegment from '../visuals/angles-in-same-segment/src/model.js';
import * as CyclicQuad from '../visuals/cyclic-quadrilateral/src/model.js';
import * as TangentRadius from '../visuals/tangent-radius/src/model.js';
import * as AlternateSegment from '../visuals/alternate-segment/src/model.js';
import * as TangentsFromPoint from '../visuals/tangents-from-external-point/src/model.js';
import * as ChordBisector from '../visuals/perpendicular-chord-bisector/src/model.js';
import { get3DAngleBisector, get3DAngleDegrees } from '../js/circle-3d.js';

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
