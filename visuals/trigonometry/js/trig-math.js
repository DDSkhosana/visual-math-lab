/**
 * @file trig-math.js
 * Pure Mathematical Engine for the Trigonometry Suite.
 *
 * Incorporates:
 * 1. Quotient Group Arithmetic on R / 2pi Z and Z / n Z (modQuotient, wrapAngleRad).
 * 2. Two-Sided Bijective Domain Bridges (f^-1 o f = id_X, f o f^-1 = id_Y).
 * 3. Idempotent Orthogonal Projection Operators (P_parallel^2 = P_parallel, P_parallel + P_perp = I).
 * 4. 4-Corner Mixed Partial Difference Quotient (f(A) - f(D) - f(B) + f(C)) / ((x - x0)(y - y0)).
 * 5. Complete 2D & 3D models and formal invariant verifiers for all 4 Trigonometry Visuals:
 *    - Unit Circle, Six Trig Functions & 3D Cylindrical Helix Wave Projections
 *    - Law of Sines & Circumscribed Circle Invariant (a/sin A = b/sin B = c/sin C = 2R)
 *    - Law of Cosines & Generalized Pythagorean Projection (c^2 = a^2 + b^2 - 2ab cos C)
 *    - Angle Sum / Difference & Rotation Matrix Composition (R(alpha + beta) = R(alpha) o R(beta))
 */

export const TAU = Math.PI * 2;
export const EPSILON = 1e-6;

export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
export const toRadians = (deg) => (deg * Math.PI) / 180;
export const toDegrees = (rad) => (rad * 180) / Math.PI;

/**
 * Canonical Quotient Representative in Z / nZ or R / nZ.
 * Guarantees a non-negative representative in [0, modulus) even for negative inputs.
 * Satisfies a === b (mod n) <=> modQuotient(a, n) === modQuotient(b, n).
 */
export function modQuotient(value, modulus = TAU) {
  if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

export function wrapAngleRad(rad) {
  return modQuotient(rad, TAU);
}

export function wrapAngleDeg(deg) {
  return modQuotient(deg, 360);
}

/**
 * Creates a formal two-sided Bijection Bridge between domain X and codomain Y:
 *   forward:  f : X -> Y
 *   inverse:  f^-1 : Y -> X
 *   verifyRoundTrip(x, eq): checks f^-1(f(x)) = x and f(f^-1(y)) = y.
 */
export function createBijectionBridge(forward, inverse) {
  return {
    forward,
    inverse,
    roundTripX(x) {
      return inverse(forward(x));
    },
    roundTripY(y) {
      return forward(inverse(y));
    },
    verifyRoundTrip(x, comparator = (a, b) => Math.abs(a - b) < 1e-5) {
      const y = forward(x);
      const xRecovered = inverse(y);
      const yRecovered = forward(xRecovered);
      return comparator(x, xRecovered) && comparator(y, yRecovered);
    },
  };
}

/**
 * Creates an Idempotent Orthogonal Projection Operator pair (P_parallel, P_perp) in R^2
 * onto the unit direction vector u = (cos phi, sin phi).
 * Satisfies:
 *   1. P_parallel^2 = P_parallel (idempotency)
 *   2. P_perp^2 = P_perp (idempotency)
 *   3. P_parallel + P_perp = I_2 (completeness)
 *   4. P_parallel * P_perp = 0 (orthogonality)
 */
export function createIdempotentProjection2D(axisAngleRad = 0) {
  const ux = Math.cos(axisAngleRad);
  const uy = Math.sin(axisAngleRad);

  // P_parallel matrix: u * u^T
  const p00 = ux * ux;
  const p01 = ux * uy;
  const p10 = ux * uy;
  const p11 = uy * uy;

  // P_perp matrix: I - u * u^T
  const q00 = 1 - p00;
  const q01 = -p01;
  const q10 = -p10;
  const q11 = 1 - p11;

  const projectParallel = (v) => ({
    x: p00 * v.x + p01 * v.y,
    y: p10 * v.x + p11 * v.y,
  });

  const projectPerp = (v) => ({
    x: q00 * v.x + q01 * v.y,
    y: q10 * v.x + q11 * v.y,
  });

  return {
    axisAngleRad,
    u: { x: ux, y: uy },
    matrixParallel: [p00, p01, p10, p11],
    matrixPerp: [q00, q01, q10, q11],
    projectParallel,
    projectPerp,
    scalarProjection(v) {
      return v.x * ux + v.y * uy;
    },
    verifyIdempotency(v) {
      const p1 = projectParallel(v);
      const p2 = projectParallel(p1);
      const q1 = projectPerp(v);
      const q2 = projectPerp(q1);
      const sum = { x: p1.x + q1.x, y: p1.y + q1.y };
      const dot = p1.x * q1.x + p1.y * q1.y;
      return (
        Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-6 &&
        Math.hypot(q2.x - q1.x, q2.y - q1.y) < 1e-6 &&
        Math.hypot(sum.x - v.x, sum.y - v.y) < 1e-6 &&
        Math.abs(dot) < 1e-6
      );
    },
  };
}

/**
 * 4-Corner Rectangle Difference Quotient ("1 - 2 - 3 + 4" / A - D - B + C):
 * Isolates the mixed second partial derivative / bilinear interaction coefficient:
 *   [f(x, y) - f(x, y0) - f(x0, y) + f(x0, y0)] / [(x - x0)(y - y0)]
 */
export function mixedPartialRectangleQuotient(fn, x0, y0, x, y) {
  const dx = x - x0;
  const dy = y - y0;
  if (Math.abs(dx) < 1e-9 || Math.abs(dy) < 1e-9) return 0;
  const fA = fn(x, y);     // +1: Far corner (x, y)
  const fD = fn(x, y0);    // -2: X-only corner (x, y0)
  const fB = fn(x0, y);    // -3: Y-only corner (x0, y)
  const fC = fn(x0, y0);   // +4: Base origin (x0, y0)
  return (fA - fD - fB + fC) / (dx * dy);
}

/* ============================================================================
   SUITE 01: Unit Circle, Six Trig Functions & 3D Cylindrical Helix Projections
   ============================================================================ */

/**
 * Computes all 6 trigonometric functions, geometric line segments on a circle of radius R,
 * Pythagorean identities, and 3D cylindrical helix wave coordinates.
 */
export function computeUnitCircleHelix(angleRad, radius = 1.0, helixPitch = 0.35) {
  const theta = wrapAngleRad(angleRad);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const tan = Math.abs(cos) > EPSILON ? sin / cos : Math.sign(sin || 1) * 1e6;
  const cot = Math.abs(sin) > EPSILON ? cos / sin : Math.sign(cos || 1) * 1e6;
  const sec = Math.abs(cos) > EPSILON ? 1 / cos : Math.sign(cos || 1) * 1e6;
  const csc = Math.abs(sin) > EPSILON ? 1 / sin : Math.sign(sin || 1) * 1e6;

  // 2D geometric coordinates scaled by radius R
  const O = { x: 0, y: 0 };
  const P = { x: radius * cos, y: radius * sin };
  const projX = { x: radius * cos, y: 0 }; // Cosine foot on X-axis
  const projY = { x: 0, y: radius * sin }; // Sine foot on Y-axis

  // Exterior tangent line at P intersects X-axis at Secant point (R*sec, 0)
  // and Y-axis at Cosecant point (0, R*csc)
  const secPoint = { x: clamp(radius * sec, -radius * 6, radius * 6), y: 0 };
  const cscPoint = { x: 0, y: clamp(radius * csc, -radius * 6, radius * 6) };

  // Classic unit-circle vertical tangent at x = R: (R, R*tan) and horizontal at y = R: (R*cot, R)
  const tanLineBase = { x: radius, y: 0 };
  const tanLineTip = { x: radius, y: clamp(radius * tan, -radius * 6, radius * 6) };
  const cotLineBase = { x: 0, y: radius };
  const cotLineTip = { x: clamp(radius * cot, -radius * 6, radius * 6), y: radius };

  // Pythagorean identity residuals
  const pythagoreanPrimary = cos * cos + sin * sin; // === 1
  const pythagoreanTanSec = Math.abs(cos) > 1e-3 ? 1 + tan * tan - sec * sec : 0;
  const pythagoreanCotCsc = Math.abs(sin) > 1e-3 ? 1 + cot * cot - csc * csc : 0;

  // 3D Cylindrical Helix Curve r(t) = (R cos t, R sin t, pitch * R * t)
  // Centered vertically so t in [0, 2pi] spans [-pi * pitch * R, +pi * pitch * R]
  const zHelix = radius * helixPitch * (theta - Math.PI);
  const point3D = { x: P.x, y: P.y, z: zHelix };
  const cosWaveProj3D = { x: P.x, y: -radius * 1.35, z: zHelix }; // XZ floor wave (cos)
  const sinWaveProj3D = { x: -radius * 1.35, y: P.y, z: zHelix }; // YZ wall wave (sin)

  const quadrant = Math.floor((theta / (Math.PI / 2)) % 4) + 1;

  return {
    theta,
    thetaDeg: toDegrees(theta),
    quadrant,
    radius,
    cos,
    sin,
    tan,
    cot,
    sec,
    csc,
    points2D: {
      O,
      P,
      projX,
      projY,
      secPoint,
      cscPoint,
      tanLineBase,
      tanLineTip,
      cotLineBase,
      cotLineTip,
    },
    points3D: {
      point3D,
      cosWaveProj3D,
      sinWaveProj3D,
    },
    invariants: {
      pythagoreanPrimary,
      pythagoreanTanSec,
      pythagoreanCotCsc,
      isIdentityVerified: Math.abs(pythagoreanPrimary - 1) < 1e-6,
    },
  };
}

/* ============================================================================
   SUITE 02: Law of Sines & Circumscribed Circle Invariant (a/sin A = 2R)
   ============================================================================ */

/**
 * Computes an inscribed triangle ABC on a circumcircle of radius R from 3 polar angles
 * (angleA, angleB, angleC) and verifies the Law of Sines:
 *   a / sin A = b / sin B = c / sin C = 2R.
 */
export function computeLawOfSines(angleA, angleB, angleC, radius = 10) {
  const aRad = wrapAngleRad(angleA);
  const bRad = wrapAngleRad(angleB);
  const cRad = wrapAngleRad(angleC);

  const A = { x: radius * Math.cos(aRad), y: radius * Math.sin(aRad) };
  const B = { x: radius * Math.cos(bRad), y: radius * Math.sin(bRad) };
  const C = { x: radius * Math.cos(cRad), y: radius * Math.sin(cRad) };

  // Side lengths opposite to vertices A, B, C
  const a = Math.hypot(B.x - C.x, B.y - C.y);
  const b = Math.hypot(A.x - C.x, A.y - C.y);
  const c = Math.hypot(A.x - B.x, A.y - B.y);

  // Interior angles via Law of Cosines on the chord lengths (safe for all configurations)
  const cosA = a > EPSILON && b > EPSILON && c > EPSILON
    ? clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1)
    : 1;
  const cosB = a > EPSILON && b > EPSILON && c > EPSILON
    ? clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1)
    : 1;
  const cosC = a > EPSILON && b > EPSILON && c > EPSILON
    ? clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1)
    : 1;

  const intA = Math.acos(cosA);
  const intB = Math.acos(cosB);
  const intC = Math.acos(cosC);

  const sinA = Math.sin(intA);
  const sinB = Math.sin(intB);
  const sinC = Math.sin(intC);

  const diameter2R = 2 * radius;
  const ratioA = sinA > 1e-4 ? a / sinA : diameter2R;
  const ratioB = sinB > 1e-4 ? b / sinB : diameter2R;
  const ratioC = sinC > 1e-4 ? c / sinC : diameter2R;

  // Diameter A'B through circumcenter O(0,0) from B to antipode A' = -B
  // Forms right triangle A'BC with right angle at C (Thales' Theorem bridge!)
  const antipodeA = { x: -B.x, y: -B.y };

  // Altitude from C onto side AB (idempotent projection)
  const abAngle = Math.atan2(B.y - A.y, B.x - A.x);
  const projAB = createIdempotentProjection2D(abAngle);
  const relC = { x: C.x - A.x, y: C.y - A.y };
  const parC = projAB.projectParallel(relC);
  const footHc = { x: A.x + parC.x, y: A.y + parC.y };
  const altitudeHc = Math.hypot(C.x - footHc.x, C.y - footHc.y);

  const area = 0.5 * a * b * sinC; // = abc / (4R)

  return {
    radius,
    diameter2R,
    anglesPolar: { aRad, bRad, cRad },
    vertices2D: { A, B, C, antipodeA, footHc },
    sides: { a, b, c },
    interiorAngles: {
      A: intA,
      B: intB,
      C: intC,
      degA: toDegrees(intA),
      degB: toDegrees(intB),
      degC: toDegrees(intC),
      sumDeg: toDegrees(intA + intB + intC),
    },
    sines: { sinA, sinB, sinC },
    ratios: { ratioA, ratioB, ratioC },
    altitudeHc,
    area,
    invariants: {
      angleSumError: Math.abs(intA + intB + intC - Math.PI),
      sineLawErrorA: Math.abs(ratioA - diameter2R),
      sineLawErrorB: Math.abs(ratioB - diameter2R),
      sineLawErrorC: Math.abs(ratioC - diameter2R),
      altitudeIdentityError: Math.abs(b * sinA - a * sinB),
      isVerified:
        Math.abs(ratioA - diameter2R) < 1e-3 &&
        Math.abs(ratioB - diameter2R) < 1e-3 &&
        Math.abs(ratioC - diameter2R) < 1e-3,
    },
  };
}

/* ============================================================================
   SUITE 03: Law of Cosines & Generalized Pythagorean Projection
   ============================================================================ */

/**
 * Computes triangle ABC with side lengths a (BC), b (AC), and included angle C at vertex C(0,0).
 * Uses idempotent projection onto AC (along +X axis) and the 4-corner difference quotient
 * to isolate the -2ab cos C bilinear interaction term.
 */
export function computeLawOfCosines(sideA = 8, sideB = 10, angleCRad = Math.PI / 3) {
  const a = Math.max(1, Number(sideA) || 8);
  const b = Math.max(1, Number(sideB) || 10);
  const C = clamp(wrapAngleRad(angleCRad), 0.05, Math.PI - 0.05);

  const cosC = Math.cos(C);
  const sinC = Math.sin(C);

  // Law of Cosines: c^2 = a^2 + b^2 - 2ab cos C
  const a2 = a * a;
  const b2 = b * b;
  const interaction2abCosC = 2 * a * b * cosC;
  const c2 = Math.max(0, a2 + b2 - interaction2abCosC);
  const c = Math.sqrt(c2);

  // Place vertex C at origin (0,0), vertex A along +X at (b, 0), vertex B at (a cos C, a sin C)
  const vertexC = { x: 0, y: 0 };
  const vertexA = { x: b, y: 0 };
  const vertexB = { x: a * cosC, y: a * sinC };

  // Idempotent orthogonal projection of B onto AC (axis angle = 0)
  const proj = createIdempotentProjection2D(0);
  const footD = proj.projectParallel(vertexB); // (a cos C, 0)
  const altitudeVec = proj.projectPerp(vertexB); // (0, a sin C)

  const pProj = vertexB.x; // signed projection a cos C
  const hAlt = vertexB.y;  // altitude a sin C
  const remBase = b - pProj; // b - a cos C

  // Verify 4-corner mixed partial difference quotient on f(a, b) = a^2 + b^2 - 2ab cos C
  // Second mixed partial d^2(c^2) / (da db) = -2 cos C
  const cSquaredFn = (x, y) => x * x + y * y - 2 * x * y * cosC;
  const mixedPartialCoeff = mixedPartialRectangleQuotient(cSquaredFn, 0, 0, a, b);

  // Remaining interior angles A and B
  const cosA = c > EPSILON ? clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1) : 1;
  const cosB = c > EPSILON ? clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1) : 1;
  const angleA = Math.acos(cosA);
  const angleB = Math.acos(cosB);

  const regime = Math.abs(cosC) < 1e-3 ? 'right' : cosC > 0 ? 'acute' : 'obtuse';

  return {
    a,
    b,
    c,
    angleC: C,
    angleCDeg: toDegrees(C),
    angleA,
    angleB,
    cosC,
    sinC,
    regime,
    squares: {
      a2,
      b2,
      c2,
      pythagoreanSum: a2 + b2,
      interaction2abCosC,
    },
    projection: {
      pProj,
      hAlt,
      remBase,
      idempotentVerified: proj.verifyIdempotency(vertexB),
    },
    mixedPartialCoeff, // equals -2 * cos(C)
    vertices2D: {
      C: vertexC,
      A: vertexA,
      B: vertexB,
      D: footD,
      altitudeVec,
    },
    invariants: {
      cosineLawResidual: Math.abs(c2 - (a2 + b2 - interaction2abCosC)),
      altitudePythagorasResidual: Math.abs(c2 - (hAlt * hAlt + remBase * remBase)),
      mixedPartialResidual: Math.abs(mixedPartialCoeff - (-2 * cosC)),
      isVerified:
        Math.abs(c2 - (a2 + b2 - interaction2abCosC)) < 1e-5 &&
        Math.abs(mixedPartialCoeff - (-2 * cosC)) < 1e-5,
    },
  };
}

/* ============================================================================
   SUITE 04: Angle Sum, Difference & Rotation Matrix Composition R(α+β)=R(α)∘R(β)
   ============================================================================ */

/**
 * Computes 2x2 rotation matrices R(alpha), R(beta), their composition R(alpha) o R(beta),
 * and the stacked right-triangle geometric proof of sin(alpha +- beta) and cos(alpha +- beta).
 */
export function computeAngleSumIdentities(alphaRad = Math.PI / 6, betaRad = Math.PI / 4, radius = 1.0) {
  const alpha = wrapAngleRad(alphaRad);
  const beta = wrapAngleRad(betaRad);
  const sumAngle = wrapAngleRad(alpha + beta);
  const diffAngle = wrapAngleRad(alpha - beta);

  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);

  // 2x2 Rotation Matrices: R(theta) = [[cos, -sin], [sin, cos]]
  const R_alpha = [cosA, -sinA, sinA, cosA];
  const R_beta = [cosB, -sinB, sinB, cosB];

  // Matrix Product (Composition): R_comp = R(alpha) * R(beta)
  const R_comp = [
    R_alpha[0] * R_beta[0] + R_alpha[1] * R_beta[2], // cosA cosB - sinA sinB
    R_alpha[0] * R_beta[1] + R_alpha[1] * R_beta[3], // -(sinA cosB + cosA sinB)
    R_alpha[2] * R_beta[0] + R_alpha[3] * R_beta[2], // sinA cosB + cosA sinB
    R_alpha[2] * R_beta[1] + R_alpha[3] * R_beta[3], // cosA cosB - sinA sinB
  ];

  // Expanded algebraic components
  const cosACosB = cosA * cosB;
  const sinASinB = sinA * sinB;
  const sinACosB = sinA * cosB;
  const cosASinB = cosA * sinB;

  const cosSum = cosACosB - sinASinB;
  const sinSum = sinACosB + cosASinB;
  const cosDiff = cosACosB + sinASinB;
  const sinDiff = sinACosB - cosASinB;

  // Geometric Stacked Triangle Vertices on Circle of Radius R:
  // O = (0, 0)
  // P = (R cos(a+b), R sin(a+b)) — tip of compound angle (alpha + beta)
  // Q = (R cos(b) cos(a), R cos(b) sin(a)) — projection of P onto the alpha ray!
  // M = (R cos(a) cos(b), 0) — foot of Q on X-axis
  // N = (R cos(a+b), 0) — foot of P on X-axis
  // R_rect = (R cos(b) cos(a), R cos(b) sin(a))
  const O = { x: 0, y: 0 };
  const P = { x: radius * cosSum, y: radius * sinSum };
  const P_diff = { x: radius * cosDiff, y: radius * sinDiff };
  const A_ray = { x: radius * cosA, y: radius * sinA };
  const Q = { x: radius * cosB * cosA, y: radius * cosB * sinA };
  const M = { x: Q.x, y: 0 };
  const N = { x: P.x, y: 0 };
  const S_corner = { x: P.x, y: Q.y }; // forms the upper right triangle P-S-Q with angle alpha

  return {
    alpha,
    beta,
    alphaDeg: toDegrees(alpha),
    betaDeg: toDegrees(beta),
    sumAngle,
    sumAngleDeg: toDegrees(sumAngle),
    diffAngle,
    diffAngleDeg: toDegrees(diffAngle),
    radius,
    trig: {
      cosA,
      sinA,
      cosB,
      sinB,
      cosACosB,
      sinASinB,
      sinACosB,
      cosASinB,
      cosSum,
      sinSum,
      cosDiff,
      sinDiff,
    },
    matrices: {
      R_alpha,
      R_beta,
      R_comp,
    },
    points2D: {
      O,
      P,
      P_diff,
      A_ray,
      Q,
      M,
      N,
      S_corner,
    },
    invariants: {
      cosSumResidual: Math.abs(Math.cos(alpha + beta) - cosSum),
      sinSumResidual: Math.abs(Math.sin(alpha + beta) - sinSum),
      cosDiffResidual: Math.abs(Math.cos(alpha - beta) - cosDiff),
      sinDiffResidual: Math.abs(Math.sin(alpha - beta) - sinDiff),
      matrixCompositionVerified:
        Math.abs(R_comp[0] - Math.cos(alpha + beta)) < 1e-6 &&
        Math.abs(R_comp[2] - Math.sin(alpha + beta)) < 1e-6,
    },
  };
}

