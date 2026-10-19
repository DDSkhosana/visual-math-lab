import { sphereStats, toDegrees } from '../model/thales-math.js';

const fix = (n, d = 1) => n.toFixed(d);

/** Declarative label table: where it sits, what it says, when it shows. */
function describeLabels(state) {
  const { radius: r, vis3d, show3dArea, show3dAngles } = state;
  const rot = state.baselineRotation || 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const rawP = sphereStats(r, state.lat3D, state.lon3D).p;
  const p = {
    x: rawP.x * cosR - rawP.y * sinR,
    y: rawP.x * sinR + rawP.y * cosR,
    z: rawP.z,
  };
  const ax = -r * cosR, ay = -r * sinR, az = 0;
  const bx = r * cosR, by = r * sinR, bz = 0;

  const withCoords = (name, x, y, z) => (vis3d.coords ? `${name} (${fix(x)}, ${fix(y)}, ${fix(z)})` : name);
  const labelsAndArea = show3dArea && vis3d.labels;

  const pLen = Math.hypot(p.x, p.y, p.z) || 1;
  const thetaDir = { x: p.x / pLen, y: 1 + p.y / pLen, z: p.z / pLen };
  const thetaDirLen = Math.hypot(thetaDir.x, thetaDir.y, thetaDir.z) || 1;
  const thetaR = r * 0.36;
  const thetaMid = {
    x: (thetaDir.x / thetaDirLen) * thetaR,
    y: (thetaDir.y / thetaDirLen) * thetaR + 0.3,
    z: (thetaDir.z / thetaDirLen) * thetaR,
  };

  const xzLen = Math.hypot(p.x, p.z) || 1;
  const phiDir = { x: p.x / xzLen, z: 1 + p.z / xzLen };
  const phiDirLen = Math.hypot(phiDir.x, phiDir.z) || 1;
  const phiR = r * 0.42;
  const phiMid = { x: (phiDir.x / phiDirLen) * phiR, y: 0.2, z: (phiDir.z / phiDirLen) * phiR };

  const lenPA = Math.hypot(ax - p.x, ay - p.y, az - p.z) || 1;
  const lenPB = Math.hypot(bx - p.x, by - p.y, bz - p.z) || 1;
  const ux = (ax - p.x) / lenPA, uy = (ay - p.y) / lenPA, uz = (az - p.z) / lenPA;
  const vx = (bx - p.x) / lenPB, vy = (by - p.y) / lenPB, vz = (bz - p.z) / lenPB;
  const bisector = { x: ux + vx, y: uy + vy, z: uz + vz };
  const bisectorLen = Math.hypot(bisector.x, bisector.y, bisector.z) || 1;
  const rightAt = {
    x: p.x + (bisector.x / bisectorLen) * 1.5,
    y: p.y + (bisector.y / bisectorLen) * 1.5,
    z: p.z + (bisector.z / bisectorLen) * 1.5,
  };

  const solidStats = sphereStats(r, state.lat3D, state.lon3D);
  const alphaDeg = solidStats.alphaDeg;
  const betaDeg = solidStats.betaDeg;

  const toPA = { x: p.x - ax, y: p.y - ay, z: p.z };
  const toPALen = Math.hypot(toPA.x, toPA.y, toPA.z) || 1;
  const alphaDir = { x: cosR + toPA.x / toPALen, y: sinR + toPA.y / toPALen, z: toPA.z / toPALen };
  const alphaDirLen = Math.hypot(alphaDir.x, alphaDir.y, alphaDir.z) || 1;
  const alphaMid = {
    x: ax + (alphaDir.x / alphaDirLen) * (r * 0.35),
    y: ay + (alphaDir.y / alphaDirLen) * (r * 0.35) + 0.3,
    z: (alphaDir.z / alphaDirLen) * (r * 0.35),
  };

  const toPB = { x: p.x - bx, y: p.y - by, z: p.z };
  const toPBLen = Math.hypot(toPB.x, toPB.y, toPB.z) || 1;
  const betaDir = { x: -cosR + toPB.x / toPBLen, y: -sinR + toPB.y / toPBLen, z: toPB.z / toPBLen };
  const betaDirLen = Math.hypot(betaDir.x, betaDir.y, betaDir.z) || 1;
  const betaMid = {
    x: bx + (betaDir.x / betaDirLen) * (r * 0.35),
    y: by + (betaDir.y / betaDirLen) * (r * 0.35) + 0.3,
    z: (betaDir.z / betaDirLen) * (r * 0.35),
  };

  const proj = p.x * cosR + p.y * sinR;
  const foot = { x: proj * cosR, y: proj * sinR, z: 0 };
  const hLen = Math.hypot(p.x - foot.x, p.y - foot.y, p.z);

  return [
    { key: 'p', at: { x: p.x * 1.15, y: p.y * 1.15, z: p.z * 1.15 }, text: withCoords('P', p.x, p.y, p.z), show: vis3d.labels, color: 'color-violet' },
    { key: 'a', at: { x: ax * 1.15, y: ay * 1.15, z: 0 }, text: withCoords('A', ax, ay, 0), show: vis3d.labels, color: 'color-red' },
    { key: 'b', at: { x: bx * 1.15, y: by * 1.15, z: 0 }, text: withCoords('B', bx, by, 0), show: vis3d.labels, color: 'color-orange' },
    { key: 'c', at: { x: -1.2, y: 0.9, z: -1.2 }, text: withCoords('O', 0, 0, 0), show: vis3d.labels, color: 'color-indigo' },
    { key: 's', at: { x: (p.x + ax) / 2, y: (p.y + ay) / 2 + 0.4, z: p.z / 2 }, text: 's', show: labelsAndArea, color: 'color-blue' },
    { key: 't', at: { x: (p.x + bx) / 2, y: (p.y + by) / 2 + 0.4, z: p.z / 2 }, text: 't', show: labelsAndArea, color: 'color-orange' },
    { key: 'theta', at: thetaMid, text: `θ (colat.) = ${Math.round(toDegrees(Math.acos(Math.max(-1, Math.min(1, p.y / r)))))}°`, show: Boolean(vis3d.labels && show3dAngles), color: 'color-yellow' },
    { key: 'phi', at: phiMid, text: `φ (lon.) = ${Math.round(toDegrees(Math.atan2(p.x, p.z)))}°`, show: Boolean(vis3d.labels && show3dAngles), color: 'color-fuchsia' },
    { key: 'alpha', at: alphaMid, text: `α = ${alphaDeg.toFixed(1)}°`, show: Boolean(vis3d.labels && show3dAngles && toPALen > 1.5), color: 'color-lime' },
    { key: 'beta', at: betaMid, text: `β = ${betaDeg.toFixed(1)}°`, show: Boolean(vis3d.labels && show3dAngles && toPBLen > 1.5), color: 'color-orange' },
    { key: 'right', at: rightAt, text: '90.0° (3D Invariant)', show: Boolean(vis3d.labels && show3dAngles), color: 'color-teal' },
    { key: 'alphaReflex', at: { x: ax - (alphaDir.x / alphaDirLen) * (r * 0.3), y: ay - (alphaDir.y / alphaDirLen) * (r * 0.3), z: -(alphaDir.z / alphaDirLen) * (r * 0.3) }, text: `α* = ${(360 - alphaDeg).toFixed(1)}°`, show: Boolean(vis3d.labels && vis3d.reflex && toPALen > 1.5), color: 'color-lime' },
    { key: 'betaReflex', at: { x: bx - (betaDir.x / betaDirLen) * (r * 0.3), y: by - (betaDir.y / betaDirLen) * (r * 0.3), z: -(betaDir.z / betaDirLen) * (r * 0.3) }, text: `β* = ${(360 - betaDeg).toFixed(1)}°`, show: Boolean(vis3d.labels && vis3d.reflex && toPBLen > 1.5), color: 'color-orange' },
    { key: 'rightReflex', at: { x: p.x - (bisector.x / bisectorLen) * 1.5, y: p.y - (bisector.y / bisectorLen) * 1.5, z: p.z - (bisector.z / bisectorLen) * 1.5 }, text: '270.0° (P*)', show: Boolean(vis3d.labels && vis3d.reflex), color: 'color-teal' },
    { key: 'alt3d', at: { x: (p.x + foot.x) / 2, y: (p.y + foot.y) / 2 + 0.3, z: p.z / 2 }, text: `h = ${hLen.toFixed(1)}`, show: labelsAndArea && hLen > 0.5, color: 'color-emerald' },
    { key: 'radius', at: { x: p.x * 0.6, y: p.y * 0.6 + 0.8, z: p.z * 0.6 }, text: 'r', show: vis3d.labels, color: 'color-indigo' },
    { key: 'diam', at: { x: 0, y: -2.0, z: 2.2 }, text: `|d| = ${(2 * r).toFixed(1)}`, show: vis3d.labels, color: 'color-red' },
    { key: 'axis-x', at: { x: 15.8, y: 0, z: 0 }, text: '+X', show: vis3d.labels, color: 'color-amber' },
    { key: 'axis-y', at: { x: 0, y: 15.8, z: 0 }, text: '+Y', show: vis3d.labels, color: 'color-emerald' },
    { key: 'axis-z', at: { x: 0, y: 0, z: 15.8 }, text: '+Z', show: vis3d.labels, color: 'color-steel' },
  ];
}

/** Positions HTML labels over the 3D canvas. `project` maps a world point to container pixels (or null). */
export class LabelOverlayView {
  constructor(container, project) {
    this.container = container;
    this.project = project;
    this.elements = new Map();
  }

  render(state) {
    const anythingVisible = state.vis3d.labels || Boolean(state.vis3d.coords);
    for (const label of describeLabels(state)) {
      const element = this.element(label.key);
      const screen = label.show && anythingVisible ? this.project(label.at) : null;
      if (!screen) {
        element.classList.remove('visible');
        continue;
      }
      element.style.left = `${screen.x}px`;
      element.style.top = `${screen.y}px`;
      element.textContent = label.text;
      element.className = `label-3d visible ${label.color}`;
    }
  }

  element(key) {
    let element = this.elements.get(key);
    if (!element) {
      element = document.createElement('div');
      element.className = 'label-3d';
      element.dataset.label = key;
      this.container.appendChild(element);
      this.elements.set(key, element);
    }
    return element;
  }
}
