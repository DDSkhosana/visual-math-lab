/**
 * @file circle-transforms.js
 * Dual-Mode Affine Conic Transformation Engine.
 *
 * Implements non-isotropic affine transformations rooted in Felix Klein's Erlangen Program (1872).
 * Enables classical Euclidean circle theorems (such as Thales's Theorem) to be generalized
 * into conics (ellipses) under linear transformations x' = S(u, s) x.
 *
 * In Euclidean mode (s = 1.0, e = 0), invariants are standard Euclidean distances and right angles.
 * In Affine Conic mode (s != 1.0, e > 0), Euclidean angles deform (angle != 90 deg), but
 * Apollonius' Theorem of Conjugate Diameters holds strictly invariant:
 *   v_PA^T Q v_PB = 0
 * where Q is the conic metric quadric tensor: Q = (S^-1)^T (1/r^2 I) S^-1.
 */

/**
 * 2D Affine Transformation Operator S_u(s_x, s_y, phi).
 * Represents a linear map with scaling along an arbitrary axis rotated by phi.
 */
export class AffineTransform2D {
  /**
   * @param {number} scaleX - Primary stretch factor along axis phi (default: 1.0)
   * @param {number} scaleY - Secondary stretch factor perpendicular to phi (default: 1.0)
   * @param {number} axisAngle - Rotation of stretch axis in radians (default: 0)
   */
  constructor(scaleX = 1.0, scaleY = 1.0, axisAngle = 0) {
    this.sx = scaleX;
    this.sy = scaleY;
    this.angle = axisAngle;
    this.update();
  }

  /**
   * Recomputes forward and inverse transformation matrices.
   * Forward:  S = R(phi) * Diag(sx, sy) * R(-phi)
   * Inverse:  S^-1 = R(phi) * Diag(1/sx, 1/sy) * R(-phi)
   */
  update() {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const c2 = c * c;
    const s2 = s * s;
    const cs = c * s;

    // S = R(phi) * S(sx, sy) * R(-phi)
    // [ c -s ] [ sx  0 ] [ c  s ]
    // [ s  c ] [ 0  sy ] [-s  c ]
    const m00 = this.sx * c2 + this.sy * s2;
    const m01 = (this.sx - this.sy) * cs;
    const m10 = (this.sx - this.sy) * cs;
    const m11 = this.sx * s2 + this.sy * c2;

    this.matrix = [m00, m01, m10, m11];

    // Safe inverse (guarding against divide-by-zero if scale approaches 0)
    const invSx = Math.abs(this.sx) > 1e-6 ? 1.0 / this.sx : 1e6;
    const invSy = Math.abs(this.sy) > 1e-6 ? 1.0 / this.sy : 1e6;

    const inv00 = invSx * c2 + invSy * s2;
    const inv01 = (invSx - invSy) * cs;
    const inv10 = (invSx - invSy) * cs;
    const inv11 = invSx * s2 + invSy * c2;

    this.inverseMatrix = [inv00, inv01, inv10, inv11];
  }

  /**
   * Sets scale and angle parameters and updates matrices.
   */
  setParameters(scaleX, scaleY = 1.0, axisAngle = 0) {
    this.sx = scaleX;
    this.sy = scaleY;
    this.angle = axisAngle;
    this.update();
  }

  /**
   * Transforms a 2D vector or coordinate point [x, y] relative to an origin.
   * @param {{x: number, y: number}} pt
   * @param {{x: number, y: number}} [origin={x: 0, y: 0}]
   * @returns {{x: number, y: number}}
   */
  transformPoint(pt, origin = { x: 0, y: 0 }) {
    const dx = pt.x - origin.x;
    const dy = pt.y - origin.y;
    return {
      x: origin.x + (this.matrix[0] * dx + this.matrix[1] * dy),
      y: origin.y + (this.matrix[2] * dx + this.matrix[3] * dy),
    };
  }

  /**
   * Applies the inverse transformation to map from distorted space back to canonical circle space.
   * @param {{x: number, y: number}} pt
   * @param {{x: number, y: number}} [origin={x: 0, y: 0}]
   * @returns {{x: number, y: number}}
   */
  inverseTransformPoint(pt, origin = { x: 0, y: 0 }) {
    const dx = pt.x - origin.x;
    const dy = pt.y - origin.y;
    return {
      x: origin.x + (this.inverseMatrix[0] * dx + this.inverseMatrix[1] * dy),
      y: origin.y + (this.inverseMatrix[2] * dx + this.inverseMatrix[3] * dy),
    };
  }

  /**
   * Transforms a direction vector [dx, dy] without translational origin.
   * @param {{x: number, y: number}} v
   * @returns {{x: number, y: number}}
   */
  transformVector(v) {
    return {
      x: this.matrix[0] * v.x + this.matrix[1] * v.y,
      y: this.matrix[2] * v.x + this.matrix[3] * v.y,
    };
  }

  /**
   * Computes the semi-major axis (a), semi-minor axis (b), and eccentricity (e)
   * for a deformed circle of canonical radius r.
   * @param {number} r - Canonical circle radius
   * @returns {{ a: number, b: number, eccentricity: number, angle: number }}
   */
  getEllipseMetrics(r) {
    const s1 = Math.abs(this.sx * r);
    const s2 = Math.abs(this.sy * r);
    const a = Math.max(s1, s2);
    const b = Math.min(s1, s2);
    const eccentricity = a > 1e-6 ? Math.sqrt(Math.max(0, 1 - (b * b) / (a * a))) : 0;
    const orientation = s1 >= s2 ? this.angle : this.angle + Math.PI / 2;
    return { a, b, eccentricity, angle: orientation };
  }

  /**
   * Returns the 2x2 conic metric quadric tensor Q for a circle of radius r deformed by this transform.
   * Q = (S^-1)^T * (1/r^2 * I) * S^-1 = (1/r^2) * (S^-1)^2 (since S is symmetric).
   * @param {number} r - Canonical circle radius
   * @returns {[number, number, number, number]} 2x2 matrix elements [q00, q01, q10, q11]
   */
  getConicMetricTensor(r) {
    const inv = this.inverseMatrix;
    const factor = 1.0 / (r * r);

    // Q = factor * inv^T * inv
    // Since inv is symmetric, inv^T = inv
    const q00 = factor * (inv[0] * inv[0] + inv[2] * inv[2]);
    const q01 = factor * (inv[0] * inv[1] + inv[2] * inv[3]);
    const q10 = q01;
    const q11 = factor * (inv[1] * inv[1] + inv[3] * inv[3]);

    return [q00, q01, q10, q11];
  }
}

/**
 * Evaluates the Apollonius conjugacy scalar between two chord direction vectors v1 and v2:
 * delta_conj = v1^T * Q * v2
 * In pure circle mode or under affine transformation, orthogonal chords to diameter endpoints satisfy delta_conj = 0.
 *
 * @param {[number, number, number, number]} Q - 2x2 conic metric tensor
 * @param {{x: number, y: number}} v1 - First direction vector (e.g. vector P -> A)
 * @param {{x: number, y: number}} v2 - Second direction vector (e.g. vector P -> B)
 * @returns {number} The conjugacy value (strictly 0 for conjugate directions)
 */
export function evaluateConicConjugacy(Q, v1, v2) {
  // Q * v2
  const qv2_x = Q[0] * v2.x + Q[1] * v2.y;
  const qv2_y = Q[2] * v2.x + Q[3] * v2.y;

  // v1^T * (Q * v2)
  return v1.x * qv2_x + v1.y * qv2_y;
}

/**
 * Normalizes the conjugacy metric into a unitless invariant value [-1, 1],
 * analogous to cos(theta) for Euclidean inner products.
 *
 * @param {[number, number, number, number]} Q - 2x2 conic metric tensor
 * @param {{x: number, y: number}} v1
 * @param {{x: number, y: number}} v2
 * @returns {number} Normalized conjugacy cosine: v1^T Q v2 / sqrt((v1^T Q v1) * (v2^T Q v2))
 */
export function normalizedConicConjugacy(Q, v1, v2) {
  const num = evaluateConicConjugacy(Q, v1, v2);
  const d1 = evaluateConicConjugacy(Q, v1, v1);
  const d2 = evaluateConicConjugacy(Q, v2, v2);
  const denom = Math.sqrt(Math.max(1e-12, d1 * d2));
  return num / denom;
}

/**
 * Retraction map that projects an unconstrained pointer coordinate (px, py)
 * to the nearest point on the perimeter of the affine ellipse.
 * Uses inverse mapping back to the canonical circle, angular projection, and forward transform.
 *
 * @param {number} px - Pointer X in canvas space
 * @param {number} py - Pointer Y in canvas space
 * @param {{x: number, y: number}} center - Center of ellipse
 * @param {number} r - Canonical circle radius
 * @param {AffineTransform2D} transform - The active affine transform
 * @returns {{ point: {x: number, y: number}, angleRad: number }}
 */
export function projectPointToAffineEllipse(px, py, center, r, transform) {
  // Map pointer point to canonical circle space
  const canonicalPt = transform.inverseTransformPoint({ x: px, y: py }, center);
  const dx = canonicalPt.x - center.x;
  const dy = canonicalPt.y - center.y;
  const angleRad = Math.atan2(dy, dx);

  // Canonical point on circle
  const circPt = {
    x: center.x + r * Math.cos(angleRad),
    y: center.y + r * Math.sin(angleRad),
  };

  // Map back to distorted ellipse space
  const ellipsePt = transform.transformPoint(circPt, center);
  return { point: ellipsePt, angleRad };
}
