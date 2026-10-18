import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AffineTransform2D,
  evaluateConicConjugacy,
  normalizedConicConjugacy,
  projectPointToAffineEllipse,
} from '../js/circle-transforms.js';

test('AffineTransform2D: Identity transformation preserving Euclidean invariants', () => {
  const transform = new AffineTransform2D(1.0, 1.0, 0);

  // Identity matrix
  assert.strictEqual(transform.matrix[0], 1);
  assert.strictEqual(transform.matrix[1], 0);
  assert.strictEqual(transform.matrix[2], 0);
  assert.strictEqual(transform.matrix[3], 1);

  // Identity inverse
  assert.strictEqual(transform.inverseMatrix[0], 1);
  assert.strictEqual(transform.inverseMatrix[1], 0);
  assert.strictEqual(transform.inverseMatrix[2], 0);
  assert.strictEqual(transform.inverseMatrix[3], 1);

  // Ellipse metrics: circular (a = b = r, e = 0)
  const metrics = transform.getEllipseMetrics(100);
  assert.strictEqual(metrics.a, 100);
  assert.strictEqual(metrics.b, 100);
  assert.strictEqual(metrics.eccentricity, 0);

  // Conic metric tensor is isotropic Q = (1/r^2) * I
  const r = 120;
  const Q = transform.getConicMetricTensor(r);
  const expectedDiag = 1 / (r * r);
  assert.ok(Math.abs(Q[0] - expectedDiag) < 1e-12);
  assert.ok(Math.abs(Q[1]) < 1e-12);
  assert.ok(Math.abs(Q[2]) < 1e-12);
  assert.ok(Math.abs(Q[3] - expectedDiag) < 1e-12);
});

test('AffineTransform2D: Forward and inverse point mapping round-trip', () => {
  const transform = new AffineTransform2D(1.75, 0.65, Math.PI / 6);
  const center = { x: 300, y: 250 };
  const origPt = { x: 380, y: 190 };

  const transformed = transform.transformPoint(origPt, center);
  const recovered = transform.inverseTransformPoint(transformed, center);

  assert.ok(Math.abs(recovered.x - origPt.x) < 1e-9);
  assert.ok(Math.abs(recovered.y - origPt.y) < 1e-9);
});

test('AffineTransform2D: Apollonius Theorem of Conjugate Diameters Invariant holds across non-isotropic scales and rotations', () => {
  // Test across multiple stretch factors, axis rotations, diameter angles, and perimeter points
  const testScales = [0.5, 0.75, 1.33, 1.8, 2.4];
  const testAxisAngles = [0, Math.PI / 4, Math.PI / 3, 2.1];
  const testBaselineAngles = [0, Math.PI / 6, Math.PI / 2];
  const testPerimeterAngles = [0.4, 1.2, 2.5, 3.8, 5.1];

  const r = 100;
  const center = { x: 200, y: 200 };

  for (const sx of testScales) {
    for (const axisAngle of testAxisAngles) {
      const transform = new AffineTransform2D(sx, 1.0, axisAngle);
      const Q = transform.getConicMetricTensor(r);

      for (const baselineAngle of testBaselineAngles) {
        // Canonical circle diameter endpoints A and B
        const aCirc = {
          x: center.x + r * Math.cos(baselineAngle),
          y: center.y + r * Math.sin(baselineAngle),
        };
        const bCirc = {
          x: center.x - r * Math.cos(baselineAngle),
          y: center.y - r * Math.sin(baselineAngle),
        };

        // Transformed diameter endpoints on ellipse
        const aEll = transform.transformPoint(aCirc, center);
        const bEll = transform.transformPoint(bCirc, center);

        for (const pAngle of testPerimeterAngles) {
          // Canonical point P on circle
          const pCirc = {
            x: center.x + r * Math.cos(pAngle),
            y: center.y + r * Math.sin(pAngle),
          };

          // Transformed point P on ellipse
          const pEll = transform.transformPoint(pCirc, center);

          // Chord direction vectors: v_PA = A' - P', v_PB = B' - P'
          const vPA = { x: aEll.x - pEll.x, y: aEll.y - pEll.y };
          const vPB = { x: bEll.x - pEll.x, y: bEll.y - pEll.y };

          // Evaluate Apollonius conjugacy invariant: v_PA^T Q v_PB == 0
          const conjugacy = evaluateConicConjugacy(Q, vPA, vPB);
          const normalized = normalizedConicConjugacy(Q, vPA, vPB);

          assert.ok(
            Math.abs(conjugacy) < 1e-6,
            `Conjugacy invariant must be zero: got ${conjugacy} for scale=${sx}, axisAngle=${axisAngle}`
          );
          assert.ok(
            Math.abs(normalized) < 1e-6,
            `Normalized conjugacy cosine must be zero: got ${normalized}`
          );
        }
      }
    }
  }
});

test('AffineTransform2D: Euclidean right angle is broken in Affine Mode while Affine Invariant is preserved', () => {
  // Stretched ellipse: sx = 2.0, sy = 1.0, angle = 0
  const transform = new AffineTransform2D(2.0, 1.0, 0);
  const r = 100;
  const center = { x: 0, y: 0 };
  const Q = transform.getConicMetricTensor(r);

  // Baseline along X axis (canonical A = (100, 0), B = (-100, 0))
  // Point P at canonical angle 45 deg: (r*cos45, r*sin45) = (70.71, 70.71)
  const pCirc = { x: r * Math.SQRT1_2, y: r * Math.SQRT1_2 };
  const aCirc = { x: r, y: 0 };
  const bCirc = { x: -r, y: 0 };

  const pEll = transform.transformPoint(pCirc, center); // (141.42, 70.71)
  const aEll = transform.transformPoint(aCirc, center); // (200, 0)
  const bEll = transform.transformPoint(bCirc, center); // (-200, 0)

  const vPA = { x: aEll.x - pEll.x, y: aEll.y - pEll.y };
  const vPB = { x: bEll.x - pEll.x, y: bEll.y - pEll.y };

  // Euclidean dot product: vPA . vPB
  const dotEuclid = vPA.x * vPB.x + vPA.y * vPB.y;
  const lenPA = Math.hypot(vPA.x, vPA.y);
  const lenPB = Math.hypot(vPB.x, vPB.y);
  const cosEuclid = dotEuclid / (lenPA * lenPB);
  const angleDegEuclid = (Math.acos(cosEuclid) * 180) / Math.PI;

  // In Euclidean metric, angle is visibly NOT 90 degrees
  assert.ok(
    Math.abs(angleDegEuclid - 90) > 5.0,
    `Euclidean angle must deviate from 90 deg when stretched: got ${angleDegEuclid}°`
  );

  // But in Affine Conic metric, Apollonius conjugacy is STRICTLY 0.000000
  const conjugacy = evaluateConicConjugacy(Q, vPA, vPB);
  assert.ok(Math.abs(conjugacy) < 1e-10, `Affine conjugacy must remain zero: got ${conjugacy}`);
});

test('projectPointToAffineEllipse snaps arbitrary cursor coordinates to ellipse boundary', () => {
  const transform = new AffineTransform2D(1.6, 0.8, Math.PI / 4);
  const r = 100;
  const center = { x: 250, y: 250 };
  const Q = transform.getConicMetricTensor(r);

  // Arbitrary off-perimeter pointer point
  const pointer = { x: 380, y: 150 };
  const snapped = projectPointToAffineEllipse(pointer.x, pointer.y, center, r, transform);

  // Snapped point (x - cx, y - cy)^T Q (x - cx, y - cy) must equal 1.0 (on ellipse boundary)
  const d = { x: snapped.point.x - center.x, y: snapped.point.y - center.y };
  const quadricVal = evaluateConicConjugacy(Q, d, d);

  assert.ok(
    Math.abs(quadricVal - 1.0) < 1e-6,
    `Snapped point must satisfy ellipse equation x^T Q x = 1: got ${quadricVal}`
  );
});
