import { sphereStats, toDegrees, sphericalToCartesian, clamp } from '../model/thales-math.js';
import { isLabelVisible } from '../../../../../js/circle-core.js';
import { getSolidOrientationFrame } from '../../../../../js/circle-3d.js';

const fix = (n, d = 1) => n.toFixed(d);

/** Declarative label table: where it sits, what it says, when it shows. */
export function describeLabels(state, anchors = null) {
  const { radius: r, vis3d = {} } = state;
  const show3dArea = Boolean(state.show3dArea ?? true) && (vis3d?.area !== false) && (state.showArea !== false);
  const show3dAngles = Boolean(state.show3dAngles ?? true) && (vis3d?.angles !== false) && (state.showAngles !== false);
  const showReflex = Boolean(vis3d?.reflex || state.showReflex);
  const isSpatial = state.dimensionMode === 'spatial';
  const isSolid = state.dimensionMode === 'solid';
  const rot = state.baselineRotation || 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  let a, b, p, o;
  if (anchors?.a && anchors?.b && anchors?.p) {
    a = { x: anchors.a.x, y: anchors.a.y, z: anchors.a.z };
    b = { x: anchors.b.x, y: anchors.b.y, z: anchors.b.z };
    p = { x: anchors.p.x, y: anchors.p.y, z: anchors.p.z };
    o = anchors.o ? { x: anchors.o.x, y: anchors.o.y, z: anchors.o.z } : { x: 0, y: 0, z: 0 };
  } else if (isSolid) {
    const frame = getSolidOrientationFrame(state, 'z');
    const u = Array.isArray(frame.uArr) ? { x: frame.uArr[0], y: frame.uArr[1], z: frame.uArr[2] } : frame.u;
    const v = Array.isArray(frame.vArr) ? { x: frame.vArr[0], y: frame.vArr[1], z: frame.vArr[2] } : frame.v;
    const uRot = {
      x: u.x * cosR + v.x * sinR,
      y: u.y * cosR + v.y * sinR,
      z: u.z * cosR + v.z * sinR,
    };
    const vRot = {
      x: -u.x * sinR + v.x * cosR,
      y: -u.y * sinR + v.y * cosR,
      z: -u.z * sinR + v.z * cosR,
    };
    const ang = state.angle2D ?? Math.PI / 4;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    a = { x: -r * uRot.x, y: -r * uRot.y, z: -r * uRot.z };
    b = { x: r * uRot.x, y: r * uRot.y, z: r * uRot.z };
    p = {
      x: r * (uRot.x * cosA + vRot.x * sinA),
      y: r * (uRot.y * cosA + vRot.y * sinA),
      z: r * (uRot.z * cosA + vRot.z * sinA),
    };
    o = { x: 0, y: 0, z: 0 };
  } else if (isSpatial) {
    const raw = sphericalToCartesian(r, state.lat3D ?? Math.PI / 4, state.lon3D ?? Math.PI / 3);
    a = { x: -r * cosR, y: -r * sinR, z: 0 };
    b = { x: r * cosR, y: r * sinR, z: 0 };
    p = {
      x: raw.x * cosR - raw.y * sinR,
      y: raw.x * sinR + raw.y * cosR,
      z: raw.z,
    };
    o = { x: 0, y: 0, z: 0 };
  } else {
    const ang = state.angle2D ?? Math.PI / 4;
    const rawX = r * Math.cos(ang), rawY = r * Math.sin(ang);
    a = { x: -r * cosR, y: -r * sinR, z: 0 };
    b = { x: r * cosR, y: r * sinR, z: 0 };
    p = { x: rawX * cosR - rawY * sinR, y: rawX * sinR + rawY * cosR, z: 0 };
    o = { x: 0, y: 0, z: 0 };
  }

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

  const toPA = { x: a.x - p.x, y: a.y - p.y, z: a.z - p.z };
  const toPB = { x: b.x - p.x, y: b.y - p.y, z: b.z - p.z };
  const lenPA = Math.hypot(toPA.x, toPA.y, toPA.z) || 1;
  const lenPB = Math.hypot(toPB.x, toPB.y, toPB.z) || 1;
  const ux = toPA.x / lenPA, uy = toPA.y / lenPA, uz = toPA.z / lenPA;
  const vx = toPB.x / lenPB, vy = toPB.y / lenPB, vz = toPB.z / lenPB;
  const bisector = { x: ux + vx, y: uy + vy, z: uz + vz };
  const bisectorLen = Math.hypot(bisector.x, bisector.y, bisector.z) || 1;
  const rightAt = {
    x: p.x + (bisector.x / bisectorLen) * 1.5,
    y: p.y + (bisector.y / bisectorLen) * 1.5,
    z: p.z + (bisector.z / bisectorLen) * 1.5,
  };

  const toBA = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const toBALen = Math.hypot(toBA.x, toBA.y, toBA.z) || 1;
  const fromAtoP = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
  const fromAtoPLen = Math.hypot(fromAtoP.x, fromAtoP.y, fromAtoP.z) || 1;
  const dotA = (toBA.x * fromAtoP.x + toBA.y * fromAtoP.y + toBA.z * fromAtoP.z) / (toBALen * fromAtoPLen);
  const alphaDeg = toDegrees(Math.acos(clamp(dotA, -1, 1)));

  const alphaDir = {
    x: toBA.x / toBALen + fromAtoP.x / fromAtoPLen,
    y: toBA.y / toBALen + fromAtoP.y / fromAtoPLen,
    z: toBA.z / toBALen + fromAtoP.z / fromAtoPLen,
  };
  const alphaDirLen = Math.hypot(alphaDir.x, alphaDir.y, alphaDir.z) || 1;
  const alphaMid = {
    x: a.x + (alphaDir.x / alphaDirLen) * (r * 0.35),
    y: a.y + (alphaDir.y / alphaDirLen) * (r * 0.35) + 0.3,
    z: a.z + (alphaDir.z / alphaDirLen) * (r * 0.35),
  };

  const toAB = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const fromBtoP = { x: p.x - b.x, y: p.y - b.y, z: p.z - b.z };
  const fromBtoPLen = Math.hypot(fromBtoP.x, fromBtoP.y, fromBtoP.z) || 1;
  const dotB = (toAB.x * fromBtoP.x + toAB.y * fromBtoP.y + toAB.z * fromBtoP.z) / (toBALen * fromBtoPLen);
  const betaDeg = toDegrees(Math.acos(clamp(dotB, -1, 1)));

  const betaDir = {
    x: toAB.x / toBALen + fromBtoP.x / fromBtoPLen,
    y: toAB.y / toBALen + fromBtoP.y / fromBtoPLen,
    z: toAB.z / toBALen + fromBtoP.z / fromBtoPLen,
  };
  const betaDirLen = Math.hypot(betaDir.x, betaDir.y, betaDir.z) || 1;
  const betaMid = {
    x: b.x + (betaDir.x / betaDirLen) * (r * 0.35),
    y: b.y + (betaDir.y / betaDirLen) * (r * 0.35) + 0.3,
    z: b.z + (betaDir.z / betaDirLen) * (r * 0.35),
  };

  const abDir = { x: toBA.x / toBALen, y: toBA.y / toBALen, z: toBA.z / toBALen };
  const proj = fromAtoP.x * abDir.x + fromAtoP.y * abDir.y + fromAtoP.z * abDir.z;
  const foot = { x: a.x + abDir.x * proj, y: a.y + abDir.y * proj, z: a.z + abDir.z * proj };
  const hLen = Math.hypot(p.x - foot.x, p.y - foot.y, p.z - foot.z);

  const diamMid = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2 - 1.5,
    z: (a.z + b.z) / 2,
  };

  return [
    { key: 'p', at: { x: p.x * 1.15, y: p.y * 1.15, z: p.z * 1.15 }, text: withCoords('P', p.x, p.y, p.z), show: vis3d.labels, color: 'color-violet' },
    { key: 'a', at: { x: a.x * 1.15, y: a.y * 1.15, z: a.z * 1.15 }, text: withCoords('A', a.x, a.y, a.z), show: vis3d.labels, color: 'color-red' },
    { key: 'b', at: { x: b.x * 1.15, y: b.y * 1.15, z: b.z * 1.15 }, text: withCoords('B', b.x, b.y, b.z), show: vis3d.labels, color: 'color-orange' },
    { key: 'c', at: { x: o.x - 1.2, y: o.y + 0.9, z: o.z - 1.2 }, text: withCoords('O', o.x, o.y, o.z), show: vis3d.labels, color: 'color-indigo' },
    { key: 's', at: { x: (p.x + a.x) / 2, y: (p.y + a.y) / 2 + 0.4, z: (p.z + a.z) / 2 }, text: 's', show: labelsAndArea, color: 'color-blue' },
    { key: 't', at: { x: (p.x + b.x) / 2, y: (p.y + b.y) / 2 + 0.4, z: (p.z + b.z) / 2 }, text: 't', show: labelsAndArea, color: 'color-orange' },
    { key: 'theta', at: thetaMid, text: `θ (colat.) = ${Math.round(toDegrees(Math.acos(clamp(p.y / r, -1, 1))))}°`, show: Boolean(vis3d.labels && show3dAngles), color: 'color-yellow' },
    { key: 'phi', at: phiMid, text: `φ (lon.) = ${Math.round(toDegrees(Math.atan2(p.x, p.z)))}°`, show: Boolean(vis3d.labels && show3dAngles && isSpatial), color: 'color-fuchsia' },
    { key: 'alpha', at: alphaMid, text: `α = ${alphaDeg.toFixed(1)}°`, show: Boolean(vis3d.labels && show3dAngles && fromAtoPLen > 1.5), color: 'color-lime' },
    { key: 'beta', at: betaMid, text: `β = ${betaDeg.toFixed(1)}°`, show: Boolean(vis3d.labels && show3dAngles && fromBtoPLen > 1.5), color: 'color-orange' },
    { key: 'right', at: rightAt, text: '90.0° (3D Invariant)', show: Boolean(vis3d.labels && show3dAngles), color: 'color-teal' },
    { key: 'alphaReflex', at: { x: a.x - (alphaDir.x / alphaDirLen) * (r * 0.3), y: a.y - (alphaDir.y / alphaDirLen) * (r * 0.3), z: a.z - (alphaDir.z / alphaDirLen) * (r * 0.3) }, text: `α* = ${(360 - alphaDeg).toFixed(1)}°`, show: Boolean(vis3d.labels && showReflex && fromAtoPLen > 1.5), color: 'color-lime' },
    { key: 'betaReflex', at: { x: b.x - (betaDir.x / betaDirLen) * (r * 0.3), y: b.y - (betaDir.y / betaDirLen) * (r * 0.3), z: b.z - (betaDir.z / betaDirLen) * (r * 0.3) }, text: `β* = ${(360 - betaDeg).toFixed(1)}°`, show: Boolean(vis3d.labels && showReflex && fromBtoPLen > 1.5), color: 'color-orange' },
    { key: 'rightReflex', at: { x: p.x - (bisector.x / bisectorLen) * 1.5, y: p.y - (bisector.y / bisectorLen) * 1.5, z: p.z - (bisector.z / bisectorLen) * 1.5 }, text: '270.0° (P*)', show: Boolean(vis3d.labels && showReflex), color: 'color-teal' },
    { key: 'alt3d', at: { x: (p.x + foot.x) / 2, y: (p.y + foot.y) / 2 + 0.3, z: (p.z + foot.z) / 2 }, text: `h = ${hLen.toFixed(1)}`, show: labelsAndArea && hLen > 0.5, color: 'color-emerald' },
    { key: 'radius', at: { x: p.x * 0.6, y: p.y * 0.6 + 0.8, z: p.z * 0.6 }, text: 'r', show: vis3d.labels, color: 'color-indigo' },
    { key: 'diam', at: diamMid, text: `|d| = ${(2 * r).toFixed(1)}`, show: vis3d.labels, color: 'color-red' },
    { key: 'axis-x', at: { x: 15.8, y: 0, z: 0 }, text: '+X', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-amber' },
    { key: 'axis-x-neg', at: { x: -15.8, y: 0, z: 0 }, text: '-X', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-amber' },
    { key: 'axis-y', at: { x: 0, y: 15.8, z: 0 }, text: '+Y', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-emerald' },
    { key: 'axis-y-neg', at: { x: 0, y: -15.8, z: 0 }, text: '-Y', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-emerald' },
    { key: 'axis-z', at: { x: 0, y: 0, z: 15.8 }, text: '+Z', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-steel' },
    { key: 'axis-z-neg', at: { x: 0, y: 0, z: -15.8 }, text: '-Z', show: Boolean(vis3d.labels && vis3d.axes !== false), color: 'color-steel' },
  ];
}

/** Positions HTML labels over the 3D canvas. `project` maps a world point to container pixels (or null). */
export class LabelOverlayView {
  constructor(container, project, getAnchors = null) {
    this.container = container;
    this.project = project;
    this.getAnchors = getAnchors;
    this.elements = new Map();
  }

  render(state) {
    const anythingVisible = state.vis3d.labels || Boolean(state.vis3d.coords);
    const anchors = typeof this.getAnchors === 'function' ? this.getAnchors() : null;
    for (const label of describeLabels(state, anchors)) {
      const element = this.element(label.key);
      const isIndividualHidden = !isLabelVisible(label.text || label.key, state.vis3d);
      const screen = label.show && !isIndividualHidden && anythingVisible ? this.project(label.at) : null;
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
