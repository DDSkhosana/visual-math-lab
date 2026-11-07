/**
 * Solid mode: every flat fill and line of the planar figure is extruded into its right-prism
 * counterpart (figure × [-h, h]) along the figure plane's normal. Each slice parallel to the
 * plane is congruent to the original figure, so planar theorem invariants hold at every height.
 * The planar figure itself, its markers, labels and drag plane stay on the mid-slice.
 */

export const SOLID_MODE = 'solid';
export const isSolidMode = (mode) => mode === SOLID_MODE;
/** Solid is Spatial S² geometry plus volume: both lift the figure's points off the Y = 0 disk. */
export const isSpatialGeometry = (mode) => mode === 'spatial' || mode === SOLID_MODE;

const AXIS_INDEX = { x: 0, y: 1, z: 2 };
const KEY_SCALE = 1e4;
const FLAT_EPSILON = 0.02;

const axisIndexOf = (axis) => AXIS_INDEX[axis] ?? 1;

const keyOf = (p) => `${Math.round(p[0] * KEY_SCALE)},${Math.round(p[1] * KEY_SCALE)},${Math.round(p[2] * KEY_SCALE)}`;

export const resolveNormal = ({ axis = 'y', normal = null } = {}) => {
  if (normal) {
    const n = Array.isArray(normal) ? normal : [normal.x ?? 0, normal.y ?? 0, normal.z ?? 0];
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len > 1e-9) return [n[0] / len, n[1] / len, n[2] / len];
  }
  const k = axisIndexOf(axis);
  return [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0];
};

const lift = (p, norm, offset) => [
  p[0] + norm[0] * offset,
  p[1] + norm[1] * offset,
  p[2] + norm[2] * offset,
];

const toPoints = (positions) => {
  const points = [];
  for (let i = 0; i + 2 < positions.length; i += 3) points.push([positions[i], positions[i + 1], positions[i + 2]]);
  return points;
};

const doubledArea = (a, b, c) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
};

const isCorner = (p, neighbours, cornerAngleDeg) => {
  if (neighbours.length !== 2) return true;
  const [n1, n2] = neighbours;
  const u = [n1[0] - p[0], n1[1] - p[1], n1[2] - p[2]];
  const v = [n2[0] - p[0], n2[1] - p[1], n2[2] - p[2]];
  const lu = Math.hypot(...u), lv = Math.hypot(...v);
  if (lu < 1e-9 || lv < 1e-9) return true;
  const cos = Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI < 180 - cornerAngleDeg;
};

/**
 * Extrudes a flat triangle soup into a closed prism.
 * Returns flat position arrays: `faces` (triangles: both caps + side walls on boundary edges)
 * and `edges` (line-segment pairs: cap outlines + vertical edges at boundary corners).
 */
export function extrudeTriangleSoup(positions, { axis = 'y', normal = null, halfHeight = 1, cornerAngleDeg = 25 } = {}) {
  const norm = resolveNormal({ axis, normal });
  const faces = [];
  const edges = [];
  const vertices = new Map();
  const edgeUse = new Map();
  const points = toPoints(positions);

  for (let t = 0; t + 2 < points.length; t += 3) {
    const tri = [points[t], points[t + 1], points[t + 2]];
    if (doubledArea(...tri) < 1e-10) continue;
    for (const offset of [halfHeight, -halfHeight]) tri.forEach((p) => faces.push(...lift(p, norm, offset)));
    const keys = tri.map(keyOf);
    keys.forEach((key, j) => vertices.set(key, tri[j]));
    for (let j = 0; j < 3; j++) {
      const a = keys[j];
      const b = keys[(j + 1) % 3];
      if (a === b) continue;
      const id = a < b ? `${a}|${b}` : `${b}|${a}`;
      const used = edgeUse.get(id);
      if (used) used.count += 1;
      else edgeUse.set(id, { a, b, count: 1 });
    }
  }

  const neighbours = new Map();
  const link = (from, to) => {
    if (!neighbours.has(from)) neighbours.set(from, []);
    neighbours.get(from).push(to);
  };
  for (const { a, b, count } of edgeUse.values()) {
    if (count !== 1) continue;
    const pa = vertices.get(a);
    const pb = vertices.get(b);
    const aTop = lift(pa, norm, halfHeight), bTop = lift(pb, norm, halfHeight);
    const aBottom = lift(pa, norm, -halfHeight), bBottom = lift(pb, norm, -halfHeight);
    faces.push(...aTop, ...bTop, ...bBottom, ...aTop, ...bBottom, ...aBottom);
    edges.push(...aTop, ...bTop, ...aBottom, ...bBottom);
    link(a, b);
    link(b, a);
  }
  for (const [key, list] of neighbours) {
    const p = vertices.get(key);
    if (isCorner(p, list.map((n) => vertices.get(n)), cornerAngleDeg)) {
      edges.push(...lift(p, norm, halfHeight), ...lift(p, norm, -halfHeight));
    }
  }
  return { faces, edges };
}

/**
 * Extrudes a flat polyline (or segment pairs) into a ribbon: a chord becomes a rectangle,
 * a circle becomes an open cylinder. `generators` adds evenly spaced rulings on closed loops.
 */
export function extrudePolyline(positions, { axis = 'y', normal = null, halfHeight = 1, pairs = false, closed = false, generators = 0 } = {}) {
  const norm = resolveNormal({ axis, normal });
  const points = toPoints(positions);
  const faces = [];
  const edges = [];
  const segments = [];
  if (pairs) {
    for (let i = 0; i + 1 < points.length; i += 2) segments.push([points[i], points[i + 1]]);
  } else {
    for (let i = 0; i + 1 < points.length; i++) segments.push([points[i], points[i + 1]]);
    if (closed && points.length > 2) segments.push([points[points.length - 1], points[0]]);
  }
  for (const [a, b] of segments) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) < 1e-9) continue;
    const aTop = lift(a, norm, halfHeight), bTop = lift(b, norm, halfHeight);
    const aBottom = lift(a, norm, -halfHeight), bBottom = lift(b, norm, -halfHeight);
    faces.push(...aTop, ...bTop, ...bBottom, ...aTop, ...bBottom, ...aBottom);
    edges.push(...aTop, ...bTop, ...aBottom, ...bBottom);
  }
  if (!points.length || !faces.length) return { faces, edges };

  const first = points[0];
  const last = points[points.length - 1];
  const loops = !pairs && (closed || (points.length > 2 && keyOf(first) === keyOf(last)));
  const rulings = [];
  if (pairs) {
    const seen = new Set();
    for (const p of points) {
      const key = keyOf(p);
      if (!seen.has(key)) {
        seen.add(key);
        rulings.push(p);
      }
    }
  } else if (!loops) {
    rulings.push(first, last);
  } else if (generators > 0) {
    const step = Math.max(1, Math.floor(points.length / generators));
    for (let i = 0; i < points.length - 1; i += step) rulings.push(points[i]);
  }
  for (const p of rulings) edges.push(...lift(p, norm, halfHeight), ...lift(p, norm, -halfHeight));
  return { faces, edges };
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const prefersReducedMotion = () => {
  try {
    return Boolean(globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Averages normals of coincident vertices so a ribbon reads as one smooth surface (a cylinder, not 64 facets). */
const smoothCoincidentNormals = (geometry) => {
  const position = geometry.attributes.position?.array;
  const normal = geometry.attributes.normal?.array;
  if (!position || !normal) return;
  const sums = new Map();
  for (let i = 0; i < position.length; i += 3) {
    const key = keyOf([position[i], position[i + 1], position[i + 2]]);
    const sum = sums.get(key) || [0, 0, 0];
    sum[0] += normal[i]; sum[1] += normal[i + 1]; sum[2] += normal[i + 2];
    sums.set(key, sum);
  }
  for (let i = 0; i < position.length; i += 3) {
    const sum = sums.get(keyOf([position[i], position[i + 1], position[i + 2]]));
    const length = Math.hypot(sum[0], sum[1], sum[2]);
    if (length < 1e-9) continue;
    normal[i] = sum[0] / length; normal[i + 1] = sum[1] / length; normal[i + 2] = sum[2] / length;
  }
  geometry.attributes.normal.needsUpdate = true;
};

/** Adds a sky/ground hemisphere fill so lit solids show shaded side walls. */
export function addSolidLighting(THREE, scene) {
  if (!THREE?.HemisphereLight || !scene?.add) return null;
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.35);
  hemi.position?.set?.(0, 40, 0);
  scene.add(hemi);
  return hemi;
}

/**
 * Keeps prism companions in sync with the visible flat figure of a scene and animates
 * the morph height between 0 (planar) and 1 (solid).
 */
export class SolidMorph {
  constructor(THREE, scene, { axis = 'y', normal = null, center = null, exclude = () => [], emphasis = () => [], halfHeight = () => 3, durationMs = 650 } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.axis = axis;
    this.axisIndex = axisIndexOf(axis);
    this.normal = normal;
    this.center = center;
    this.exclude = exclude;
    this.emphasis = emphasis;
    this.halfHeight = halfHeight;
    this.durationMs = durationMs;
    this.progress = 0;
    this.lastTime = null;
    this.layer = null;
    this.companions = new Map();
    this.relative = new THREE.Matrix4();
    this.sceneInverse = new THREE.Matrix4();
  }

  getEffectiveNormal() {
    const n = typeof this.normal === 'function' ? this.normal() : this.normal;
    return resolveNormal({ axis: this.axis, normal: n });
  }

  getEffectiveCenter() {
    const c = typeof this.center === 'function' ? this.center() : this.center;
    if (c) {
      if (Array.isArray(c)) return c;
      return [c.x ?? 0, c.y ?? 0, c.z ?? 0];
    }
    return [0, 0, 0];
  }

  update(active, now = nowMs()) {
    const target = active ? 1 : 0;
    const dt = this.lastTime == null ? 0 : Math.max(0, now - this.lastTime);
    this.lastTime = now;
    if (prefersReducedMotion() || this.durationMs <= 0) {
      this.progress = target;
    } else if (this.progress !== target) {
      const step = dt / this.durationMs;
      this.progress = target > this.progress ? Math.min(target, this.progress + step) : Math.max(target, this.progress - step);
    }

    if (this.progress <= 0) {
      if (this.layer) this.layer.visible = false;
      if (!active) this.clear();
      return;
    }
    if (!this.layer) {
      this.layer = new this.THREE.Group();
      this.layer.userData.solidSkip = true;
      this.scene.add(this.layer);
    }
    const norm = this.getEffectiveNormal();
    const isAxisAligned = Math.abs(norm[this.axisIndex]) > 1 - 1e-4;
    this.sync(norm, isAxisAligned);
    this.layer.visible = true;
    if (isAxisAligned) {
      this.layer.scale.set(1, 1, 1);
      this.layer.scale.setComponent(this.axisIndex, Math.max(1e-3, easeInOutCubic(this.progress)));
    } else {
      this.layer.scale.set(1, 1, 1);
    }
  }

  sync(norm = this.getEffectiveNormal(), isAxisAligned = true) {
    this.scene.updateMatrixWorld();
    this.sceneInverse.copy(this.scene.matrixWorld).invert();
    const excluded = new Set((this.exclude() || []).filter(Boolean));
    excluded.add(this.layer);
    const emphasis = new Set((this.emphasis() || []).filter(Boolean));
    const rawH = this.halfHeight();
    const h = isAxisAligned ? rawH : rawH * Math.max(1e-3, easeInOutCubic(this.progress));
    const seen = new Set();
    const visit = (object, parentIsMesh) => {
      if (!object.visible || excluded.has(object) || object.userData?.solidSkip) return;
      const kind = this.classify(object, parentIsMesh);
      if (kind) {
        seen.add(object);
        this.syncCompanion(object, kind, h, emphasis.has(object), norm);
      }
      for (const child of object.children) visit(child, object.isMesh === true);
    };
    for (const child of this.scene.children) visit(child, false);
    for (const [source, record] of this.companions) {
      if (!seen.has(source)) {
        this.disposeRecord(record);
        this.companions.delete(source);
      }
    }
  }

  classify(object, parentIsMesh) {
    const position = object.geometry?.attributes?.position;
    const material = object.material;
    if (!position || !material || Array.isArray(material) || material.visible === false) return null;
    if (object.isMesh) {
      if (!material.isMeshBasicMaterial || !material.transparent || material.side !== this.THREE.DoubleSide) return null;
      if ((material.opacity ?? 1) <= 0.02 || position.count < 3) return null;
      return 'fill';
    }
    if (object.isLine) {
      if (parentIsMesh || material.isLineDashedMaterial || position.count < 2) return null;
      if (object.isLineSegments) return 'pairs';
      return object.isLineLoop ? 'loop' : 'line';
    }
    return null;
  }

  syncCompanion(source, kind, h, emphasised, norm = this.getEffectiveNormal()) {
    const geometry = source.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index;
    const material = source.material;
    this.relative.multiplyMatrices(this.sceneInverse, source.matrixWorld);
    const matrix = this.relative.elements;
    let sourceColor = source.userData?.solidColor || material.color;
    if (!source.userData?.solidColor && material.vertexColors && geometry.attributes.color && (!sourceColor || sourceColor.getHex?.() === 0xffffff)) {
      const colors = geometry.attributes.color;
      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < colors.count; i++) {
        rSum += colors.getX(i);
        gSum += colors.getY(i);
        bSum += colors.getZ(i);
      }
      sourceColor = new this.THREE.Color(rSum / colors.count, gSum / colors.count, bSum / colors.count);
    }
    const colorHex = sourceColor?.getHex?.() ?? 0xffffff;
    const opacity = material.opacity ?? 1;
    const record = this.companions.get(source);
    if (record
      && record.position === position && record.version === position.version
      && record.index === index && record.indexVersion === (index?.version ?? -1)
      && record.drawStart === geometry.drawRange.start && record.drawCount === geometry.drawRange.count
      && Math.abs(record.h - h) < 1e-6 && record.colorHex === colorHex && record.opacity === opacity
      && record.norm && record.norm.every((v, idx) => Math.abs(v - norm[idx]) < 1e-5)
      && record.matrix.every((value, i) => Math.abs(value - matrix[i]) < 1e-9)) {
      return;
    }
    if (record) this.disposeRecord(record);
    const next = {
      position,
      version: position.version,
      index,
      indexVersion: index?.version ?? -1,
      drawStart: geometry.drawRange.start,
      drawCount: geometry.drawRange.count,
      h,
      colorHex,
      opacity,
      norm,
      matrix: Array.from(matrix),
      group: null,
    };
    this.companions.set(source, next);

    const positions = this.readScenePositions(geometry);
    if (positions.length < 6) return;
    const [nx, ny, nz] = norm;
    const [cx, cy, cz] = this.getEffectiveCenter();
    for (let i = 0; i < positions.length; i += 3) {
      const dx = positions[i] - cx;
      const dy = positions[i + 1] - cy;
      const dz = positions[i + 2] - cz;
      const distToPlane = Math.abs(dx * nx + dy * ny + dz * nz);
      if (distToPlane > FLAT_EPSILON) return;
    }
    const options = { axis: this.axis, normal: norm, halfHeight: h };
    const extruded = kind === 'fill'
      ? extrudeTriangleSoup(positions, options)
      : extrudePolyline(positions, { ...options, pairs: kind === 'pairs', closed: kind === 'loop', generators: emphasised ? 12 : 0 });
    if (!extruded.faces.length) return;
    next.group = this.buildCompanion(extruded, sourceColor, kind === 'fill' ? opacity : null, emphasised);
    this.layer.add(next.group);
  }

  readScenePositions(geometry) {
    const position = geometry.attributes.position;
    const index = geometry.index;
    const total = index ? index.count : position.count;
    const start = Math.max(0, geometry.drawRange.start || 0);
    const end = Math.min(total, start + (Number.isFinite(geometry.drawRange.count) ? geometry.drawRange.count : total));
    const v = new this.THREE.Vector3();
    const out = [];
    for (let i = start; i < end; i++) {
      const vi = index ? index.getX(i) : i;
      v.fromBufferAttribute(position, vi).applyMatrix4(this.relative);
      out.push(v.x, v.y, v.z);
    }
    return out;
  }

  buildCompanion({ faces, edges }, sourceColor, fillOpacity, emphasised) {
    const { THREE } = this;
    const color = sourceColor?.clone ? sourceColor.clone() : new THREE.Color(0xffffff);
    const group = new THREE.Group();
    group.userData.solidSkip = true;

    const surface = new THREE.BufferGeometry();
    surface.setAttribute('position', new THREE.Float32BufferAttribute(faces, 3));
    surface.computeVertexNormals();
    const isFill = fillOpacity != null;
    if (!isFill) smoothCoincidentNormals(surface);
    const surfaceOpacity = isFill
      ? Math.min(0.5, Math.max(0.16, fillOpacity * 1.35 + 0.06))
      : (emphasised ? 0.16 : 0.07);
    const solid = new THREE.Mesh(surface, new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: surfaceOpacity,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    solid.renderOrder = 2;
    group.add(solid);

    if (edges.length) {
      const outline = new THREE.BufferGeometry();
      outline.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
      const edgeColor = color.clone();
      edgeColor.offsetHSL?.(0, 0, 0.12);
      const lines = new THREE.LineSegments(outline, new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: isFill ? 0.9 : (emphasised ? 0.75 : 0.5),
        depthWrite: false,
      }));
      lines.renderOrder = 4;
      group.add(lines);
    }
    return group;
  }

  disposeRecord(record) {
    const group = record?.group;
    if (!group) return;
    group.parent?.remove(group);
    group.traverse((object) => {
      object.geometry?.dispose?.();
      object.material?.dispose?.();
    });
    record.group = null;
  }

  clear() {
    for (const record of this.companions.values()) this.disposeRecord(record);
    this.companions.clear();
  }

  dispose() {
    this.clear();
    this.layer?.parent?.remove(this.layer);
    this.layer = null;
  }
}

/**
 * Idle parallax: after the viewer stops interacting, the camera sways a few degrees side to side
 * (about its own screen-up axis) so depth cues (occlusion, relative motion) reveal the third dimension.
 * Any pointer, wheel or key interaction stops it immediately; it never runs with reduced motion.
 */
export class IdleParallax {
  constructor(controls, domElement, {
    amplitudeDeg = 4.5,
    pitchRatio = 0.65,
    periodMs = 9000,
    idleMs = 3000,
    rampMs = 1500,
  } = {}) {
    this.controls = controls;
    this.amplitudeYaw = (amplitudeDeg * Math.PI) / 180;
    this.amplitudePitch = ((amplitudeDeg * pitchRatio) * Math.PI) / 180;
    this.periodMs = periodMs;
    this.periodPitchMs = periodMs / Math.SQRT2; // Incommensurate frequency ratio produces open, non-repeating Lissajous 3D precession
    this.idleMs = idleMs;
    this.rampMs = rampMs;
    this.appliedYaw = 0;
    this.appliedPitch = 0;
    this.phaseStart = null;
    this.holdUntil = nowMs();
    this.poke = this.poke.bind(this);
    this.domElement = domElement;
    if (domElement?.addEventListener) {
      ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((type) => domElement.addEventListener(type, this.poke, { passive: true }));
    }
  }

  poke(extraMs = 0) {
    const hold = typeof extraMs === 'number' ? extraMs : 0;
    this.holdUntil = Math.max(this.holdUntil, nowMs() + hold);
    this.phaseStart = null;
    this.appliedYaw = 0;
    this.appliedPitch = 0;
  }

  update(enabled = true, now = nowMs()) {
    const controls = this.controls;
    const busy = !enabled
      || prefersReducedMotion()
      || controls?.enabled === false
      || (controls?.state && controls.state !== 'none')
      || Math.abs(controls?.angularVelocity?.angle || 0) > 1e-5
      || (controls?.pointers?.size || 0) > 0;
    if (busy) {
      this.holdUntil = Math.max(this.holdUntil, now);
      this.phaseStart = null;
      this.appliedYaw = 0;
      this.appliedPitch = 0;
      return;
    }
    if (now - this.holdUntil < this.idleMs || typeof controls?.rotateCameraByAxisAngle !== 'function') return;
    if (this.phaseStart == null) {
      this.phaseStart = now;
      this.appliedYaw = 0;
      this.appliedPitch = 0;
    }
    const elapsed = now - this.phaseStart;
    const ramp = Math.min(1, elapsed / this.rampMs);

    // True omnidirectional 2-DOF precession: Yaw (screen-up) + Pitch (screen-right)
    const targetYaw = this.amplitudeYaw * ramp * Math.sin((2 * Math.PI * elapsed) / this.periodMs);
    const targetPitch = this.amplitudePitch * ramp * Math.sin((2 * Math.PI * elapsed) / this.periodPitchMs);

    const deltaYaw = targetYaw - this.appliedYaw;
    const deltaPitch = targetPitch - this.appliedPitch;
    this.appliedYaw = targetYaw;
    this.appliedPitch = targetPitch;

    const upAxis = this.screenUpAxis();
    const rightAxis = this.screenRightAxis(upAxis);

    // Instantaneous composite rotation vector in the tangent plane perpendicular to the line of sight
    const rotVec = new this.controls.THREE.Vector3().addScaledVector(upAxis, deltaYaw).addScaledVector(rightAxis, deltaPitch);
    const rotAngle = Math.sqrt(rotVec.lengthSq());
    if (rotAngle > 1e-8) {
      controls.rotateCameraByAxisAngle(rotVec.normalize(), rotAngle);
    }
  }

  /** Camera up made orthogonal to the view direction: rocking about it is a sideways sway from any preset. */
  screenUpAxis() {
    const { THREE, camera, target } = this.controls;
    const axis = new THREE.Vector3(0, 1, 0);
    if (!camera?.up || !camera?.position || !target) return axis;
    const view = new THREE.Vector3().subVectors(target, camera.position);
    if (view.lengthSq() < 1e-12) return axis;
    view.normalize();
    const up = camera.up.clone().addScaledVector(view, -camera.up.dot(view));
    return up.lengthSq() > 1e-8 ? up.normalize() : axis;
  }

  /** Screen right vector (view × up): rocking about it produces vertical pitch/nodding motion. */
  screenRightAxis(up = this.screenUpAxis()) {
    const { THREE, camera, target } = this.controls;
    const axis = new THREE.Vector3(1, 0, 0);
    if (!camera?.position || !target || !up) return axis;
    const view = new THREE.Vector3().subVectors(target, camera.position);
    if (view.lengthSq() < 1e-12) return axis;
    view.normalize();
    const rx = view.y * up.z - view.z * up.y;
    const ry = view.z * up.x - view.x * up.z;
    const rz = view.x * up.y - view.y * up.x;
    const right = new THREE.Vector3(rx, ry, rz);
    return right.lengthSq() > 1e-8 ? right.normalize() : axis;
  }

  dispose() {
    if (this.domElement?.removeEventListener) {
      ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((type) => this.domElement.removeEventListener(type, this.poke));
    }
  }
}
