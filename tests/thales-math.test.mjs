import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angle2DToLongitude, cartesianToSpherical, greatCircleTo3D, longitudeToAngle2D, point3DToGreatCircle, pointerToAngle,
  sphereStats, sphericalToCartesian, thalesStats2D, toDegrees, toRadians,
} from '../visuals/thales-theorem/src/model/thales-math.js';
import { rotateBaseline90, setBaselineRotation, setPlane2D } from '../visuals/thales-theorem/src/model/actions.js';
import { computeFrame } from '../visuals/thales-theorem/src/views/canvas2d-draw.js';
import { createInitialState } from '../visuals/thales-theorem/src/config/defaults.js';

const close = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} !~ ${expected}`);

test("Thales: s² + t² equals the diameter squared for every angle across all 4 quadrants", () => {
  for (let deg = 0; deg <= 360; deg += 15) {
    const { sumSquares, diameterSquared, area, s, t } = thalesStats2D(10, toRadians(deg));
    close(sumSquares, diameterSquared);
    close(area, 0.5 * s * t);
  }
});

test("Thales 2D: calculates diameter, circumference, and triangle area correctly", () => {
  const r = 10;
  const stats90 = thalesStats2D(r, toRadians(90));
  close(stats90.diameter, 20);
  close(stats90.circumference, 2 * Math.PI * r);
  // At 90 degrees, triangle is symmetric with base 2r and height r: area = r * r = 100
  close(stats90.area, 100);

  // At 270 degrees (lower quadrant), triangle is symmetric below the axis with height r: area = 100
  const stats270 = thalesStats2D(r, toRadians(270));
  close(stats270.diameter, 20);
  close(stats270.area, 100);
  close(stats270.sumSquares, 400);
});

test("Sphere 3D: calculates diameter, circumference, and surface area correctly", () => {
  const r = 10;
  const stats = sphereStats(r, toRadians(45), toRadians(45));
  close(stats.diameter, 20);
  close(stats.circumference, 2 * Math.PI * r);
  close(stats.surfaceArea, 4 * Math.PI * r * r);
});

test('pointerToAngle converts offsets to angles across all four quadrants', () => {
  close(pointerToAngle(1, 1), Math.PI / 4); // Q1: 45°
  close(pointerToAngle(-1, 1), 3 * Math.PI / 4); // Q2: 135°
  close(pointerToAngle(-1, -1), 5 * Math.PI / 4); // Q3: 225° (lower-left quadrant)
  close(pointerToAngle(1, -1), 7 * Math.PI / 4); // Q4: 315° (lower-right quadrant)
  close(pointerToAngle(1, 0), 0); // 0°
  close(pointerToAngle(0, -1), 3 * Math.PI / 2); // 270° (bottom)
});

test('spherical and Cartesian conversions round-trip', () => {
  const lat = toRadians(60), lon = toRadians(-30);
  const back = cartesianToSpherical(sphericalToCartesian(10, lat, lon), 10);
  close(back.lat, lat);
  close(back.lon, lon);
});

test('points on the sphere satisfy x² + y² + z² = r²', () => {
  const { sumSquares, radiusSquared } = sphereStats(12, toRadians(70), toRadians(110));
  close(sumSquares, radiusSquared);
});

test('2D angle and 3D longitude stay in sync (lon = angle - 90°)', () => {
  assert.equal(Math.round(toDegrees(angle2DToLongitude(toRadians(45)))), -45);
  assert.equal(Math.round(toDegrees(longitudeToAngle2D(toRadians(-45)))), 45);
  assert.equal(Math.round(toDegrees(angle2DToLongitude(toRadians(270)))), 180);
  assert.equal(Math.round(toDegrees(longitudeToAngle2D(toRadians(180)))), 270);
  assert.equal(Math.round(toDegrees(longitudeToAngle2D(toRadians(-135)))), 315);
  assert.equal(Math.round(toDegrees(angle2DToLongitude(toRadians(315)))), -135);
});

test('Great-Circle model: 2D and 3D round-trip conversions preserve angles and tilt', () => {
  const r = 10;
  for (const psiDeg of [-60, -30, 0, 45, 75]) {
    const psi = toRadians(psiDeg);
    for (const deg of [30, 90, 150, 210, 270, 330]) {
      const angle = toRadians(deg);
      const point3D = greatCircleTo3D(r, angle, psi);
      const { angle2D, psi: backPsi } = point3DToGreatCircle(point3D, r);
      close(angle2D, angle, 1e-7);
      close(backPsi, psi, 1e-7);
    }
  }
});

test('Great-Circle model: 2D and 3D Euclidean distances s and t and area are 100% identical', () => {
  const r = 10;
  for (let deg = 0; deg < 360; deg += 30) {
    const angle = toRadians(deg);
    for (const psiDeg of [-45, 0, 45]) {
      const psi = toRadians(psiDeg);
      const p3D = greatCircleTo3D(r, angle, psi);
      const stats2D = thalesStats2D(r, angle);
      const stats3D = sphereStats(r, p3D.lat, p3D.lon);

      // Sides s and t must match identically
      close(stats2D.s, stats3D.s, 1e-7);
      close(stats2D.t, stats3D.t, 1e-7);
      // Pythagorean sums must match
      close(stats2D.sumSquares, stats3D.thalesSumSquares, 1e-7);
      close(stats3D.thalesSumSquares, stats2D.diameterSquared, 1e-7);
      // Inscribed triangle areas must match
      close(stats2D.area, stats3D.area, 1e-7);

      // 3D orthogonality: dot product (a - P) · (b - P) must be 0
      const a3 = { x: -r, y: 0, z: 0 };
      const b3 = { x: r, y: 0, z: 0 };
      const dot3D = (a3.x - p3D.x) * (b3.x - p3D.x) + (a3.y - p3D.y) * (b3.y - p3D.y) + (a3.z - p3D.z) * (b3.z - p3D.z);
      close(dot3D, 0, 1e-7);
    }
  }
});

test('Plane projection selector: setPlane2D updates state correctly', () => {
  const state = createInitialState();
  assert.equal(state.plane2D, 'great-circle');

  const xyPatch = setPlane2D('xy');
  assert.equal(xyPatch.plane2D, 'xy');

  const xzPatch = setPlane2D('xz');
  assert.equal(xzPatch.plane2D, 'xz');

  const yzPatch = setPlane2D('yz');
  assert.equal(yzPatch.plane2D, 'yz');
});

test('Plane projection: computeFrame produces accurate projection coordinates for all 4 planes', () => {
  const state = createInitialState();
  state.radius = 10;
  state.zoom = 1;
  state.pan = { x: 0, y: 0 };
  state.angle2D = toRadians(90); // (0, 10) in 2D
  state.lat3D = toRadians(90);  // On equator
  state.lon3D = toRadians(90);  // Along X axis (sin(90)*sin(90) = 1): x=10, y=0, z=0
  const width = 800;
  const height = 600;
  const cx = 400;
  const cy = 300;

  // 1. Great circle section
  state.plane2D = 'great-circle';
  const frameGC = computeFrame(state, width, height);
  close(frameGC.cx, cx);
  close(frameGC.cy, cy);
  close(frameGC.a.x, cx - 10);
  close(frameGC.b.x, cx + 10);
  close(frameGC.p.x, cx);
  close(frameGC.p.y, cy - 10);

  // 2. XY Plane projection
  state.plane2D = 'xy';
  const frameXY = computeFrame(state, width, height);
  close(frameXY.a.x, cx - 10);
  close(frameXY.b.x, cx + 10);
  close(frameXY.pCoords.x, 10); // lon=90 -> x=10, y=0
  close(frameXY.pCoords.y, 0);

  // 3. XZ Plane projection
  state.plane2D = 'xz';
  const frameXZ = computeFrame(state, width, height);
  close(frameXZ.a.x, cx - 10);
  close(frameXZ.b.x, cx + 10);
  close(frameXZ.pCoords.x, 10);
  close(frameXZ.pCoords.y, 0);

  // 4. YZ Plane projection (Diameter AB is perpendicular: a and b project to (cx, cy))
  state.plane2D = 'yz';
  const frameYZ = computeFrame(state, width, height);
  close(frameYZ.a.x, cx);
  close(frameYZ.a.y, cy);
  close(frameYZ.b.x, cx);
  close(frameYZ.b.y, cy);
});

test("Thales 2D & 3D: angles alpha and beta at vertices a and b sum strictly to 90°", () => {
  const r = 10;
  for (let deg = 10; deg < 180; deg += 10) {
    const s2d = thalesStats2D(r, toRadians(deg));
    close(s2d.alphaDeg + s2d.betaDeg, 90);
    close(s2d.alpha + s2d.beta, Math.PI / 2);

    const s3d = sphereStats(r, toRadians(deg), toRadians(30));
    close(s3d.alphaDeg + s3d.betaDeg, 90);
    close(s3d.alpha + s3d.beta, Math.PI / 2);
  }
});

test("Thales Reflex Angles: alpha* and beta* form exact 360° perigon and sum to 900° with 270°", () => {
  const r = 10;
  for (let deg = 10; deg < 180; deg += 15) {
    const s2d = thalesStats2D(r, toRadians(deg));
    close(s2d.alphaDeg + s2d.alphaReflexDeg, 360);
    close(s2d.betaDeg + s2d.betaReflexDeg, 360);
    close(s2d.alphaReflexDeg + s2d.betaReflexDeg + s2d.rightAngleReflexDeg, 900);
    close(s2d.reflexSumDeg, 900);

    const s3d = sphereStats(r, toRadians(deg), toRadians(45));
    close(s3d.alphaDeg + s3d.alphaReflexDeg, 360);
    close(s3d.betaDeg + s3d.betaReflexDeg, 360);
    close(s3d.alphaReflexDeg + s3d.betaReflexDeg + s3d.rightAngleReflexDeg, 900);
    close(s3d.reflexSumDeg, 900);
  }
});

test('Baseline rotation: actions update rotation in 90-degree steps and full cycle', () => {
  const state = createInitialState();
  assert.equal(state.baselineRotation, 0);

  const step1 = rotateBaseline90(state);
  close(step1.baselineRotation, Math.PI / 2);

  const step2 = rotateBaseline90({ baselineRotation: step1.baselineRotation });
  close(step2.baselineRotation, Math.PI);

  const step3 = rotateBaseline90({ baselineRotation: step2.baselineRotation });
  close(step3.baselineRotation, 3 * Math.PI / 2);

  const step4 = rotateBaseline90({ baselineRotation: step3.baselineRotation });
  close(step4.baselineRotation, 0);

  const direct = setBaselineRotation(Math.PI / 2);
  close(direct.baselineRotation, Math.PI / 2);
});

test('Baseline rotation 2D: rotating baseline to vertical aligns AB along Y and preserves 90° right angle & invariants', () => {
  const state = createInitialState();
  state.radius = 10;
  state.zoom = 1;
  state.pan = { x: 0, y: 0 };
  state.baselineRotation = Math.PI / 2; // 90° rotation: X becomes Y
  const width = 800, height = 600, cx = 400, cy = 300;

  const frame = computeFrame(state, width, height);
  // Vertices A and B must now lie on the vertical axis (x = cx)
  close(frame.a.x, cx);
  close(frame.a.y, cy + 10); // A is at bottom (canvas y down)
  close(frame.b.x, cx);
  close(frame.b.y, cy - 10); // B is at top

  // Diameter must still be exactly 2r
  close(frame.lenD, 20);

  // Across all angles, right angle at P, sides s and t, and area are strictly preserved
  for (let deg = 0; deg < 360; deg += 30) {
    state.angle2D = toRadians(deg);
    const f = computeFrame(state, width, height);

    // Vector from P to A and P to B
    const paX = f.a.x - f.p.x;
    const paY = f.a.y - f.p.y;
    const pbX = f.b.x - f.p.x;
    const pbY = f.b.y - f.p.y;

    // Dot product (P - A) · (P - B) must be 0 (exact 90° right angle)
    const dot = paX * pbX + paY * pbY;
    close(dot, 0, 1e-7);

    // s² + t² = d² = 400
    close(f.lenS * f.lenS + f.lenT * f.lenT, 400, 1e-7);

    // Theoretical area = 0.5 * s * t
    const expected = thalesStats2D(10, toRadians(deg));
    close(f.lenS, expected.s, 1e-7);
    close(f.lenT, expected.t, 1e-7);
    close(0.5 * f.lenS * f.lenT, expected.area, 1e-7);
  }
});

test('Baseline rotation 3D: rigid rotation around Z preserves distances and orthogonality', () => {
  const r = 10;
  const rot = Math.PI / 2;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  // Rotated diameter endpoints in 3D
  const a3 = { x: -r * cosR, y: -r * sinR, z: 0 };
  const b3 = { x: r * cosR, y: r * sinR, z: 0 };

  // A and B lie on Y axis
  close(a3.x, 0);
  close(a3.y, -10);
  close(b3.x, 0);
  close(b3.y, 10);

  for (let latDeg = 15; latDeg <= 165; latDeg += 30) {
    for (let lonDeg = -150; lonDeg <= 180; lonDeg += 45) {
      const raw = sphericalToCartesian(r, toRadians(latDeg), toRadians(lonDeg));
      const p3 = {
        x: raw.x * cosR - raw.y * sinR,
        y: raw.x * sinR + raw.y * cosR,
        z: raw.z,
      };

      // Distance to origin is r
      close(Math.hypot(p3.x, p3.y, p3.z), r, 1e-7);

      // Distance to A and B
      const s = Math.hypot(p3.x - a3.x, p3.y - a3.y, p3.z - a3.z);
      const t = Math.hypot(p3.x - b3.x, p3.y - b3.y, p3.z - b3.z);
      close(s * s + t * t, 4 * r * r, 1e-7);

      // Inscribed 3D right angle
      const dot = (a3.x - p3.x) * (b3.x - p3.x) + (a3.y - p3.y) * (b3.y - p3.y) + (a3.z - p3.z) * (b3.z - p3.z);
      close(dot, 0, 1e-7);
    }
  }
});


