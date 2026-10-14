import { setAngle2D, setLatitude, setLongitude, setRadius } from '../model/actions.js';
import { toDegrees, toRadians } from '../model/thales-math.js';

const degrees = (rad) => Math.round(toDegrees(rad));
const degreeLabel = (value) => `${value}°`;

/** Slider element ids, how input becomes a state patch, and how state becomes a slider value. */
export const SLIDERS = [
  {
    input: 'angle-slider', label: 'angle-val-label',
    toPatch: (v, s) => setAngle2D(toRadians(parseInt(v, 10)), s),
    fromState: (s) => degrees(s.angle2D), format: degreeLabel,
  },
  {
    input: 'radius-slider', label: 'radius-val-label',
    toPatch: (v) => setRadius(parseFloat(v)),
    fromState: (s) => s.radius, format: String,
  },
  {
    input: 'lat-slider', label: 'lat-val-label',
    toPatch: (v, s) => setLatitude(toRadians(parseInt(v, 10)), s),
    fromState: (s) => degrees(s.lat3D), format: degreeLabel,
  },
  {
    input: 'lon-slider', label: 'lon-val-label',
    toPatch: (v, s) => setLongitude(toRadians(parseInt(v, 10)), s),
    fromState: (s) => degrees(s.lon3D), format: degreeLabel,
  },
];

/** Checkbox element id -> path into state. */
export const TOGGLES = {
  'vis-2d-points': ['vis2d', 'points'],
  'vis-2d-lengths': ['vis2d', 'lengths'],
  'vis-2d-coords': ['vis2d', 'coords'],
  'vis-2d-area': ['vis2d', 'area'],
  'vis-2d-angles': ['vis2d', 'angles'],
  'vis-2d-grid-x': ['vis2d', 'gridX'],
  'vis-2d-grid-y': ['vis2d', 'gridY'],
  'vis-3d-labels': ['vis3d', 'labels'],
  'vis-3d-coords': ['vis3d', 'coords'],
  'vis-3d-volume': ['vis3d', 'volume'],
  'vis-3d-sphere': ['vis3d', 'sphere'],
  'vis-3d-wire': ['vis3d', 'circleWire'],
  'vis-3d-circle-wire': ['vis3d', 'circleWire'],
  'vis-3d-axes': ['vis3d', 'axes'],
  'vis-3d-grid-xz': ['vis3d', 'gridXZ'],
  'vis-3d-grid-xy': ['vis3d', 'gridXY'],
  'vis-3d-grid-yz': ['vis3d', 'gridYZ'],
  'toggle-3d-area': ['show3dArea'],
  'toggle-3d-angles': ['show3dAngles'],
};
