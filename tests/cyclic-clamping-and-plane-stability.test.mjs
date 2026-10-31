import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clampCyclicAngle,
  getValidCyclicArc,
  clampAngleInArc,
  clampMinAngleDistance,
  clampAngleToArc,
} from '../js/circle-core.js';
import * as CyclicQuadModel from '../visuals/circle-theorems/cyclic-quadrilateral/src/model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Cyclic Quadrilateral: Strict cyclic order clamping eliminates bowtie self-intersection', () => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => Math.round((rad * 180) / Math.PI);

  // Initial canonical angles: A=140°, B=40°, C=310°, D=230°
  // CCW cyclic cycle: A -> D -> C -> B -> A
  const A = toRad(140);
  const B = toRad(40);
  const C = toRad(310);
  const D = toRad(230);

  // 1. Dragging D between C (310°) and A (140°):
  // Nominal position is 230°
  assert.strictEqual(toDeg(clampCyclicAngle(D, C, A, B, 0.2)), 230);

  // Dragging D near C (e.g. 305°) is clamped to 299° (~11.5° before C)
  const dNearC = toDeg(clampCyclicAngle(toRad(305), C, A, B, 0.2));
  assert.ok(dNearC < 310 && dNearC >= 298, `D near C must be clamped before C (got ${dNearC})`);

  // Dragging D past C into arc C-B (e.g. 330°) is stopped at the boundary
  const dPastC = toDeg(clampCyclicAngle(toRad(330), C, A, B, 0.2));
  assert.strictEqual(dPastC, dNearC, 'Dragging D past C must be clamped to boundary');

  // Dragging D near A (e.g. 145°) is clamped to 151° (~11.5° past A)
  const dNearA = toDeg(clampCyclicAngle(toRad(145), C, A, B, 0.2));
  assert.ok(dNearA > 140 && dNearA <= 152, `D near A must be clamped past A (got ${dNearA})`);

  // 2. Dragging C between D (230°) and B (40°):
  assert.strictEqual(toDeg(clampCyclicAngle(C, D, B, A, 0.2)), 310);
  const cNearD = toDeg(clampCyclicAngle(toRad(235), D, B, A, 0.2));
  assert.ok(cNearD > 230 && cNearD <= 242, `C near D must be clamped past D (got ${cNearD})`);
  const cNearB = toDeg(clampCyclicAngle(toRad(45), D, B, A, 0.2));
  assert.ok(cNearB < 40 && cNearB >= 28, `C near B must be clamped before B (got ${cNearB})`);

  // 3. Dragging B between C (310°) and A (140°):
  assert.strictEqual(toDeg(clampCyclicAngle(B, C, A, D, 0.2)), 40);
  const bNearC = toDeg(clampCyclicAngle(toRad(315), C, A, D, 0.2));
  assert.ok(bNearC > 310 && bNearC <= 322, `B near C must be clamped past C (got ${bNearC})`);
  const bNearA = toDeg(clampCyclicAngle(toRad(135), C, A, D, 0.2));
  assert.ok(bNearA < 140 && bNearA >= 128, `B near A must be clamped before A (got ${bNearA})`);

  // 4. Dragging A between B (40°) and D (230°):
  assert.strictEqual(toDeg(clampCyclicAngle(A, B, D, C, 0.2)), 140);
  const aNearB = toDeg(clampCyclicAngle(toRad(35), B, D, C, 0.2));
  assert.ok(aNearB > 40 && aNearB <= 52, `A near B must be clamped past B (got ${aNearB})`);
  const aNearD = toDeg(clampCyclicAngle(toRad(225), B, D, C, 0.2));
  assert.ok(aNearD < 230 && aNearD >= 218, `A near D must be clamped before D (got ${aNearD})`);
});

test('Angle at Centre: Inscribed vertex P is clamped strictly within major subtending arc', () => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => Math.round((rad * 180) / Math.PI);

  const A = toRad(210);
  const B = toRad(330);
  const P = toRad(90);

  // CCW cycle: B (330°) -> P (90°) -> A (210°) -> B (330°)
  // P nominal is 90°
  assert.strictEqual(toDeg(clampAngleInArc(P, B, A, 0.15)), 90);

  // Dragging P towards A (210°) stops before A
  const pNearA = toDeg(clampAngleInArc(toRad(205), B, A, 0.15));
  assert.ok(pNearA < 210 && pNearA >= 200, `P must stop before A (got ${pNearA})`);

  // Dragging P into minor arc (e.g. 270°) is prevented
  const pInMinor = toDeg(clampAngleInArc(toRad(270), B, A, 0.15));
  assert.ok(pInMinor <= 202 || pInMinor >= 338, `P cannot cross into minor arc (got ${pInMinor})`);

  // Dragging P towards B (330°) stops before B
  const pNearB = toDeg(clampAngleInArc(toRad(335), B, A, 0.15));
  assert.ok(pNearB > 330 && pNearB <= 340, `P must stop before B (got ${pNearB})`);

  // Chord endpoints maintain separation
  const clampedA = toDeg(clampAngleInArc(A, P, B, 0.2));
  assert.strictEqual(clampedA, 210);
  const clampedB = toDeg(clampAngleInArc(B, A, P, 0.2));
  assert.strictEqual(clampedB, 330);
});

test('Angles in Same Segment: P1 and P2 mutual separation and chord boundary invariants', () => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => Math.round((rad * 180) / Math.PI);

  const P1 = toRad(120);
  const P2 = toRad(60);

  // Mutual separation: P1 and P2 maintain minimum angular buffer (0.12 rad ~ 6.9°)
  const separatedP1 = clampMinAngleDistance(P1, P2, 0.12);
  assert.strictEqual(toDeg(separatedP1), 120, 'Well-separated points remain unchanged');

  // If dragged onto identical angle (60°), minimum separation is enforced
  const pushedP1 = toDeg(clampMinAngleDistance(toRad(60), P2, 0.12));
  assert.ok(Math.abs(pushedP1 - 60) >= 6, `P1 must be pushed away from P2 (got ${pushedP1})`);

  // Chord endpoints maintain minimum separation
  const chordA = toRad(210);
  const chordB = toRad(212); // almost overlapping
  const separatedA = toDeg(clampMinAngleDistance(chordA, chordB, 0.25));
  assert.ok(Math.abs(separatedA - 212) >= 14, `Chord endpoints must be separated (got ${separatedA})`);
});

test('Alternate Segment & Chord Bisector: Angular boundary and non-collapse invariants', () => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => Math.round((rad * 180) / Math.PI);

  // Alternate segment: T=270°, A=150°, B=40° (CCW: T -> B -> A -> T)
  const T = toRad(270);
  const A = toRad(150);
  const B = toRad(40);

  const clampedB = toDeg(clampAngleInArc(B, T, A, 0.15));
  assert.strictEqual(clampedB, 40);

  // B dragged towards chord endpoint A (150°) stops before A
  const bNearA = toDeg(clampAngleInArc(toRad(145), T, A, 0.15));
  assert.ok(bNearA < 150 && bNearA >= 140, `B must stop before A (got ${bNearA})`);

  // Chord Bisector: minimum angular separation between A and B
  const bisectorA = 0.85 * Math.PI;
  const bisectorB = 0.84 * Math.PI; // near collision
  const sepA = clampMinAngleDistance(bisectorA, bisectorB, 0.2);
  assert.ok(Math.abs(sepA - bisectorB) >= 0.19, 'Chord bisector endpoints must maintain separation');
});

test('3D Great Circle Origin Lock & Geodesic Decoupling across 3D Views', () => {
  const circle3DCode = fs.readFileSync(path.join(rootDir, 'js/circle-3d.js'), 'utf8');

  // 1. AngleAtCentre3DView center lock
  assert.ok(
    circle3DCode.includes('circleInfo.center = O;') && circle3DCode.includes('circleInfo.radius = R;'),
    'circle-3d.js must anchor circleInfo.center to O and circleInfo.radius to R'
  );

  // 2. CyclicQuad3DView center lock
  assert.ok(
    circle3DCode.includes('const O = new THREE.Vector3(0, 0, 0);') &&
    circle3DCode.includes('alignCircleWireToPlane(this.circleWire, circleInfo.normal, circleInfo.center, circleInfo.radius, THREE);'),
    'CyclicQuad3DView must align circleWire to circleInfo at locked origin'
  );

  // 3. Geodesic overlay decoupling: opt-in only, false by default
  assert.ok(
    circle3DCode.includes('const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);'),
    'Geodesic arcs must be decoupled and strictly opt-in'
  );

  // 4. CyclicQuad3DView onDrag handlers enforce clampCyclicAngle
  assert.ok(
    circle3DCode.includes('clampCyclicAngle(targetAng, st.angleB, st.angleD, st.angleC, 0.2)'),
    'CyclicQuad3DView markerA onDrag must enforce clampCyclicAngle'
  );
  assert.ok(
    circle3DCode.includes('clampCyclicAngle(targetAng, st.angleA, st.angleC, st.angleD, 0.2)'),
    'CyclicQuad3DView markerB onDrag must enforce clampCyclicAngle'
  );
  assert.ok(
    circle3DCode.includes('clampCyclicAngle(targetAng, st.angleD, st.angleB, st.angleA, 0.2)'),
    'CyclicQuad3DView markerC onDrag must enforce clampCyclicAngle'
  );
  assert.ok(
    circle3DCode.includes('clampCyclicAngle(newAngleD, st.angleC, st.angleA, st.angleB, 0.2)'),
    'CyclicQuad3DView markerD onDrag must enforce clampCyclicAngle'
  );
});

