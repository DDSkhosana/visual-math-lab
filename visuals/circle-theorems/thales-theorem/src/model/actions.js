import { greatCircleTo3D, point3DToGreatCircle, sphericalToCartesian } from './thales-math.js';

/** Each action returns a state patch; none of them touch the DOM. */

export const setAngle2D = (angle, state = null) => {
  const r = state?.radius ?? 10;
  let psi = 0;
  if (state && typeof state.lat3D === 'number' && typeof state.lon3D === 'number') {
    const curP = sphericalToCartesian(r, state.lat3D, state.lon3D);
    psi = point3DToGreatCircle(curP, r).psi;
  }
  const { lat, lon } = greatCircleTo3D(r, angle, psi);
  return { angle2D: angle, lat3D: lat, lon3D: lon };
};

export const setLongitude = (lon, state = null) => {
  const r = state?.radius ?? 10;
  const lat = state?.lat3D ?? Math.PI / 4;
  const p = sphericalToCartesian(r, lat, lon);
  const { angle2D } = point3DToGreatCircle(p, r);
  return { lon3D: lon, angle2D };
};

export const setLatitude = (lat, state = null) => {
  const r = state?.radius ?? 10;
  const lon = state?.lon3D ?? Math.PI / 2;
  const p = sphericalToCartesian(r, lat, lon);
  const { angle2D } = point3DToGreatCircle(p, r);
  return { lat3D: lat, angle2D };
};

export const setRadius = (radius) => ({ radius });

export const setSpherePoint = ({ lat, lon }, state = null) => {
  const r = state?.radius ?? 10;
  const p = sphericalToCartesian(r, lat, lon);
  const { angle2D } = point3DToGreatCircle(p, r);
  return { lat3D: lat, lon3D: lon, angle2D };
};

export const setViewMode = (viewMode) => ({ viewMode });

export const setPlane2D = (plane2D) => ({ plane2D });

export const setBaselineRotation = (baselineRotation) => ({ baselineRotation });

export const rotateBaseline90 = (state) => ({
  baselineRotation: (((state?.baselineRotation ?? 0) + Math.PI / 2) % (Math.PI * 2)),
});

export const setPlaying = (playing) => ({ playing });

export const setAffineMode = (affineMode, state = null) => {
  const active = Boolean(affineMode);
  const patch = { affineMode: active };
  if (active && state && Math.abs((state.affineStretch ?? 1.0) - 1.0) < 1e-3) {
    patch.affineStretch = 1.35;
  }
  return patch;
};

export const setAffineStretch = (affineStretch) => ({
  affineStretch: Number(affineStretch),
  affineMode: true,
});

export const setAffineAxisAngle = (affineAxisAngle) => ({
  affineAxisAngle: Number(affineAxisAngle),
  affineMode: true,
});

export const toggleSplitDirection = (state) => ({
  splitDirection: state.splitDirection === 'horizontal' ? 'vertical' : 'horizontal',
  splitRatio: 50,
});

export const setSplitRatio = (splitRatio) => ({ splitRatio });

/** `path` is [key] for a top-level flag or [group, key] for a flag inside vis2d / vis3d. */
export function setFlag(state, path, value) {
  if (path.length === 1) return { [path[0]]: value };
  const [group, key] = path;
  return { [group]: { ...state[group], [key]: value } };
}
