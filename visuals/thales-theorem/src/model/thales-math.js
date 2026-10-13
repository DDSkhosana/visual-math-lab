/** Pure geometry. No DOM, canvas or Three.js dependencies. */

export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const toRadians = (degrees) => (degrees * Math.PI) / 180;
export const toDegrees = (radians) => (radians * 180) / Math.PI;

export function pointOnCircle(radius, angle) {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/**
 * Converts a pointer offset from the circle centre (y pointing up) to an angle on the circumference [0, 2π).
 * Supports full 360° motion across all four quadrants (upper and lower).
 */
export function pointerToAngle(dx, dyUp) {
  let angle = Math.atan2(dyUp, dx);
  if (angle < 0) angle += TAU;
  return angle;
}

/** Spherical to Cartesian: latitude is measured from +Y, longitude from +Z towards +X. */
export function sphericalToCartesian(radius, lat, lon) {
  return {
    x: radius * Math.sin(lat) * Math.sin(lon),
    y: radius * Math.cos(lat),
    z: radius * Math.sin(lat) * Math.cos(lon),
  };
}

export function cartesianToSpherical({ x, y, z }, radius) {
  return { lat: Math.acos(clamp(y / radius, -1, 1)), lon: Math.atan2(x, z) };
}

/**
 * Projects a 3D Cartesian point on the sphere (with diameter AB along the X-axis)
 * into the great-circle cross-section plane containing AB and P.
 * Returns:
 *   - angle2D: polar angle θ ∈ [0, 2π) in the 2D circle plane
 *   - psi: tilt angle ψ ∈ [-π/2, π/2] of the great-circle plane around the X-axis
 *   - x2D, y2D: coordinates in the 2D plane
 */
export function point3DToGreatCircle({ x, y, z }, radius = null) {
  const r = radius ?? Math.hypot(x, y, z);
  const rho = Math.hypot(y, z);

  if (rho < 1e-9) {
    const angle2D = x >= 0 ? 0 : Math.PI;
    return { angle2D, psi: 0, x2D: x >= 0 ? r : -r, y2D: 0 };
  }

  let y2D;
  let psi;
  if (y > 0 || (y === 0 && z >= 0)) {
    y2D = rho;
    psi = Math.atan2(z, y);
  } else {
    y2D = -rho;
    psi = Math.atan2(-z, -y);
  }

  const angle2D = pointerToAngle(x, y2D);
  return { angle2D, psi, x2D: x, y2D };
}

/**
 * Reconstructs 3D Cartesian and spherical coordinates from a 2D angle on the
 * great-circle cross-section plane with tilt ψ around the X-axis.
 */
export function greatCircleTo3D(radius, angle2D, psi = 0) {
  let x = radius * Math.cos(angle2D);
  let y2D = radius * Math.sin(angle2D);
  if (Math.abs(x) < 1e-12) x = 0;
  if (Math.abs(y2D) < 1e-12) y2D = 0;
  let y = y2D * Math.cos(psi);
  let z = y2D * Math.sin(psi);
  if (Math.abs(y) < 1e-12) y = 0;
  if (Math.abs(z) < 1e-12) z = 0;
  const { lat, lon } = cartesianToSpherical({ x, y, z }, radius);
  return { x, y, z, lat, lon, psi };
}

/** Keeps the 2D angle and the 3D longitude in step across the full circle: lon = angle - 90 degrees. */
export function angle2DToLongitude(angle) {
  let degrees = Math.round(toDegrees(angle)) - 90;
  while (degrees > 180) degrees -= 360;
  while (degrees <= -180) degrees += 360;
  return toRadians(degrees);
}

export function longitudeToAngle2D(lon) {
  let degrees = Math.round(toDegrees(lon)) + 90;
  while (degrees < 0) degrees += 360;
  while (degrees >= 360) degrees -= 360;
  return toRadians(degrees);
}

/** The diameter AB spans (-r, 0) to (r, 0); s = |PA| and t = |PB|. */
export function thalesStats2D(radius, angle) {
  const p = pointOnCircle(radius, angle);
  const s = Math.hypot(p.x + radius, p.y);
  const t = Math.hypot(p.x - radius, p.y);
  return {
    radius,
    diameter: radius * 2,
    circumference: TAU * radius,
    p,
    s,
    t,
    sumSquares: s * s + t * t,
    diameterSquared: (2 * radius) ** 2,
    area: 0.5 * s * t,
  };
}

export function sphereStats(radius, lat, lon) {
  const p = sphericalToCartesian(radius, lat, lon);
  const s = Math.hypot(p.x + radius, p.y, p.z);
  const t = Math.hypot(p.x - radius, p.y, p.z);
  return {
    radius,
    diameter: radius * 2,
    circumference: TAU * radius,
    surfaceArea: 4 * Math.PI * radius * radius,
    p,
    s,
    t,
    sumSquares: p.x * p.x + p.y * p.y + p.z * p.z,
    thalesSumSquares: s * s + t * t,
    radiusSquared: radius * radius,
    volume: Math.abs(p.x * p.y * p.z),
    area: 0.5 * s * t,
  };
}
