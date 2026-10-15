import { sphereStats, toDegrees } from '../model/thales-math.js';

const fix = (n, d = 1) => n.toFixed(d);

/** Declarative label table: where it sits, what it says, when it shows. */
function describeLabels(state) {
  const { radius: r, vis3d, show3dArea, show3dAngles } = state;
  const { p } = sphereStats(r, state.lat3D, state.lon3D);
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

  const lenPA = Math.hypot(-r - p.x, -p.y, -p.z) || 1;
  const lenPB = Math.hypot(r - p.x, -p.y, -p.z) || 1;
  const ux = (-r - p.x) / lenPA, uy = -p.y / lenPA, uz = -p.z / lenPA;
  const vx = (r - p.x) / lenPB, vy = -p.y / lenPB, vz = -p.z / lenPB;
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

  const toPA = { x: p.x + r, y: p.y, z: p.z };
  const toPALen = Math.hypot(toPA.x, toPA.y, toPA.z) || 1;
  const alphaDir = { x: 1 + toPA.x / toPALen, y: toPA.y / toPALen, z: toPA.z / toPALen };
  const alphaDirLen = Math.hypot(alphaDir.x, alphaDir.y, alphaDir.z) || 1;
  const alphaMid = {
    x: -r + (alphaDir.x / alphaDirLen) * (r * 0.35),
    y: (alphaDir.y / alphaDirLen) * (r * 0.35) + 0.3,
    z: (alphaDir.z / alphaDirLen) * (r * 0.35),
  };

  const toPB = { x: p.x - r, y: p.y, z: p.z };
  const toPBLen = Math.hypot(toPB.x, toPB.y, toPB.z) || 1;
  const betaDir = { x: -1 + toPB.x / toPBLen, y: toPB.y / toPBLen, z: toPB.z / toPBLen };
  const betaDirLen = Math.hypot(betaDir.x, betaDir.y, betaDir.z) || 1;
  const betaMid = {
    x: r + (betaDir.x / betaDirLen) * (r * 0.35),
    y: (betaDir.y / betaDirLen) * (r * 0.35) + 0.3,
    z: (betaDir.z / betaDirLen) * (r * 0.35),
  };

  return [
    { key: 'p', at: { x: p.x * 1.15, y: p.y * 1.15, z: p.z * 1.15 }, text: withCoords('P', p.x, p.y, p.z), show: vis3d.labels, color: 'color-violet' },
    { key: 'a', at: { x: -r * 1.15, y: 0, z: 0 }, text: withCoords('A', -r, 0, 0), show: vis3d.labels, color: 'color-red' },
    { key: 'b', at: { x: r * 1.15, y: 0, z: 0 }, text: withCoords('B', r, 0, 0), show: vis3d.labels, color: 'color-orange' },
    { key: 'c', at: { x: -1.2, y: 0.9, z: -1.2 }, text: withCoords('O', 0, 0, 0), show: vis3d.labels, color: 'color-indigo' },
    { key: 's', at: { x: (p.x - r) / 2, y: p.y / 2 + 0.4, z: p.z / 2 }, text: 's', show: labelsAndArea, color: 'color-blue' },
    { key: 't', at: { x: (p.x + r) / 2, y: p.y / 2 + 0.4, z: p.z / 2 }, text: 't', show: labelsAndArea, color: 'color-orange' },
    { key: 'theta', at: thetaMid, text: `θ (colat.) = ${Math.round(toDegrees(state.lat3D))}°`, show: show3dAngles, color: 'color-yellow' },
    { key: 'phi', at: phiMid, text: Math.round(toDegrees(state.lon3D)) === 90 ? 'φ = 90° (z=0, XY)' : `φ = ${Math.round(toDegrees(state.lon3D))}°`, show: show3dAngles, color: 'color-fuchsia' },
    { key: 'alpha', at: alphaMid, text: `α = ${alphaDeg.toFixed(1)}°`, show: show3dAngles && toPALen > 1.5, color: 'color-lime' },
    { key: 'beta', at: betaMid, text: `β = ${betaDeg.toFixed(1)}°`, show: show3dAngles && toPBLen > 1.5, color: 'color-amber' },
    { key: 'right', at: rightAt, text: '90° (3D Invariant)', show: show3dAngles, color: 'color-teal' },
    { key: 'alphaReflex', at: { x: -r - (alphaDir.x / alphaDirLen) * (r * 0.3), y: -(alphaDir.y / alphaDirLen) * (r * 0.3), z: -(alphaDir.z / alphaDirLen) * (r * 0.3) }, text: `α* = ${(360 - alphaDeg).toFixed(1)}°`, show: Boolean(vis3d.reflex && toPALen > 1.5), color: 'color-lime' },
    { key: 'betaReflex', at: { x: r - (betaDir.x / betaDirLen) * (r * 0.3), y: -(betaDir.y / betaDirLen) * (r * 0.3), z: -(betaDir.z / betaDirLen) * (r * 0.3) }, text: `β* = ${(360 - betaDeg).toFixed(1)}°`, show: Boolean(vis3d.reflex && toPBLen > 1.5), color: 'color-amber' },
    { key: 'rightReflex', at: { x: p.x - (bisector.x / bisectorLen) * 1.5, y: p.y - (bisector.y / bisectorLen) * 1.5, z: p.z - (bisector.z / bisectorLen) * 1.5 }, text: '270° (P*)', show: Boolean(vis3d.reflex), color: 'color-teal' },
    { key: 'alt3d', at: { x: p.x, y: p.y / 2 + 0.3, z: p.z / 2 }, text: `h = ${Math.hypot(p.y, p.z).toFixed(1)}`, show: labelsAndArea && Math.hypot(p.y, p.z) > 0.5, color: 'color-lime' },
    { key: 'radius', at: { x: p.x * 0.6, y: p.y * 0.6 + 0.8, z: p.z * 0.6 }, text: 'r', show: vis3d.labels, color: 'color-indigo' },
    { key: 'diam', at: { x: 0, y: -2.0, z: 2.2 }, text: '|d| = 2r', show: vis3d.labels, color: 'color-red' },
    { key: 'axis-x', at: { x: 15.8, y: 0, z: 0 }, text: '+X', show: vis3d.labels, color: 'color-amber' },
    { key: 'axis-y', at: { x: 0, y: 15.8, z: 0 }, text: '+Y', show: vis3d.labels, color: 'color-lime' },
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
    const anythingVisible = state.vis3d.labels || state.show3dAngles || state.vis3d.reflex;
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
