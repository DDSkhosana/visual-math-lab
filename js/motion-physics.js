/**
 * Motion Physics & Damped Harmonic Oscillator Engine
 * 
 * Implements second-order spring-damper physics, Semi-Implicit Euler integration,
 * velocity tracking for kinetic gestures, and quadratic potential wells for magnetic snapping.
 */

/**
 * Semi-Implicit (Symplectic) Euler step for a damped harmonic oscillator:
 * m * x'' + c * x' + k * (x - target) = 0
 * 
 * @param {Object} params
 * @param {number} params.pos - Current position
 * @param {number} params.vel - Current velocity (px/s)
 * @param {number} params.target - Equilibrium target position
 * @param {number} [params.k=280] - Spring stiffness (N/m)
 * @param {number} [params.c=28] - Damping coefficient (N*s/m)
 * @param {number} [params.mass=1] - Mass (kg)
 * @param {number} [params.dt=1/60] - Timestep in seconds
 * @returns {{ pos: number, vel: number, isAtRest: boolean }}
 */
export function stepSpring({ pos, vel, target, k = 280, c = 28, mass = 1, dt = 1 / 60 }) {
  const force = -k * (pos - target) - c * vel;
  const accel = force / mass;
  const nVel = vel + accel * dt;
  const nPos = pos + nVel * dt;
  const isAtRest = Math.abs(nPos - target) < 0.25 && Math.abs(nVel) < 0.5;

  return {
    pos: isAtRest ? target : nPos,
    vel: isAtRest ? 0 : nVel,
    target,
    isAtRest,
    done: isAtRest,
  };
}

/**
 * Velocity tracker for touch, pointer, and wheel kinetic release impulses.
 */
export class VelocityTracker {
  constructor(maxSamples = 6) {
    this.maxSamples = maxSamples;
    this.samples = [];
  }

  reset() {
    this.samples = [];
  }

  add(val, time = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.samples.push({ val, time });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  push(val, time) {
    this.add(val, time);
  }

  getVelocity() {
    if (this.samples.length < 2) return 0;
    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const dt = (newest.time - oldest.time) / 1000;
    return dt > 0.0001 ? (newest.val - oldest.val) / dt : 0;
  }
}

/**
 * Evaluates a quadratic attractive potential well within a threshold distance of edge boundaries.
 * 
 * @param {number} pos - Current 1D coordinate (x or y)
 * @param {number} minBound - Minimum boundary coordinate (e.g., 0)
 * @param {number} maxBound - Maximum boundary coordinate (e.g., viewport width/height - element size)
 * @param {number} [threshold=24] - Capture zone threshold in pixels
 * @param {number} [margin=12] - Rest equilibrium margin from edge in pixels
 * @returns {number} Snapped position or original position if outside potential well
 */
export function computeEdgeSnapTarget(pos, minBound, maxBound, threshold = 24, margin = 12) {
  if (pos - minBound < threshold) {
    return minBound + margin;
  }
  if (maxBound - pos < threshold) {
    return Math.max(minBound + margin, maxBound - margin);
  }
  return pos;
}
