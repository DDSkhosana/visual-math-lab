import { sphereStats, thalesStats2D } from '../model/thales-math.js';

const IDS = {
  r2d: 'val-2d-r', d2d: 'val-2d-d', circ2d: 'val-2d-circ',
  s: 'val-s', t: 'val-t', sumSq: 'val-sum-sq', dSq: 'val-d-sq', area: 'val-area',
  alpha2d: 'val-2d-alpha', beta2d: 'val-2d-beta', sumAB2d: 'val-2d-sum-ab',
  r3d: 'val-3d-r', d3d: 'val-3d-d', circ3d: 'val-3d-circ',
  x: 'val-3d-x', y: 'val-3d-y', z: 'val-3d-z',
  sumSq3d: 'val-3d-sum-sq', rSq: 'val-3d-d-sq',
  s3d: 'val-3d-s', t3d: 'val-3d-t', sumSq3dThales: 'val-3d-thales-sum-sq', area3d: 'val-3d-area',
  alpha3d: 'val-3d-alpha', beta3d: 'val-3d-beta', sumAB3d: 'val-3d-sum-ab',
  surf: 'val-surf', volume: 'val-volume',
};

/** Writes the numeric read-outs shown over each canvas. */
export class StatsView {
  static stateKeys = ['radius', 'angle2D', 'lat3D', 'lon3D'];

  constructor(root = document) {
    this.fields = Object.fromEntries(
      Object.entries(IDS).map(([key, id]) => [key, root.getElementById(id)])
    );
  }

  render(state) {
    const flat = thalesStats2D(state.radius, state.angle2D);
    const solid = sphereStats(state.radius, state.lat3D, state.lon3D);
    const values = {
      r2d: flat.radius, d2d: flat.diameter, circ2d: flat.circumference,
      s: flat.s, t: flat.t, sumSq: flat.sumSquares, dSq: flat.diameterSquared, area: flat.area,
      alpha2d: flat.alphaDeg, beta2d: flat.betaDeg, sumAB2d: flat.alphaDeg + flat.betaDeg,
      r3d: solid.radius, d3d: solid.diameter, circ3d: solid.circumference,
      x: solid.p.x, y: solid.p.y, z: solid.p.z,
      sumSq3d: solid.sumSquares, rSq: solid.radiusSquared,
      s3d: solid.s, t3d: solid.t, sumSq3dThales: solid.thalesSumSquares, area3d: solid.area,
      alpha3d: solid.alphaDeg, beta3d: solid.betaDeg, sumAB3d: solid.alphaDeg + solid.betaDeg,
      surf: solid.surfaceArea, volume: solid.volume,
    };
    for (const [key, value] of Object.entries(values)) {
      const field = this.fields[key];
      if (field) field.textContent = value.toFixed(2);
    }
  }
}
