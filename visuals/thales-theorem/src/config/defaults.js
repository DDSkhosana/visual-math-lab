export const LIMITS = Object.freeze({
  splitRatio: { min: 10, max: 90 },
  panelWidth: { min: 250, max: 750 },
  pointHitRadius: { mouse: 22, touch: 32 },
});

export const COMPACT_QUERY = '(max-width: 48rem), (max-height: 34rem) and (orientation: landscape)';

export function createInitialState() {
  return {
    radius: 10,
    angle2D: Math.PI / 4,
    lat3D: Math.PI / 4,
    lon3D: Math.PI / 2,
    viewMode: 'split',
    splitDirection: 'horizontal',
    splitRatio: 50,
    pan: { x: 0, y: 0 },
    zoom: 18,
    plane2D: 'great-circle',
    playing: false,
    hoverP2D: false,
    hoverP3D: false,
    show3dArea: true,
    show3dAngles: true,
    vis2d: { points: true, lengths: true, coords: false, area: true, angles: true, reflex: false, gridX: true, gridY: true, grid: true, axes: true },
    vis3d: { labels: true, coords: false, volume: true, sphere: true, circleWire: true, axes: true, gridXZ: true, gridXY: false, gridYZ: false, reflex: false },
  };
}
