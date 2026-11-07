import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extrudeTriangleSoup, extrudePolyline, isSolidMode, IdleParallax, SOLID_MODE } from '../js/solid-morph.js';
import { getSolidOrientationFrame, rodriguesVector } from '../js/circle-3d.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const points = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
  return out;
};
const key = (p) => p.map((v) => v.toFixed(6)).join(',');
const verticalEdgeCount = (edges, k) => {
  let count = 0;
  const pts = points(edges);
  for (let i = 0; i < pts.length; i += 2) {
    const [a, b] = [pts[i], pts[i + 1]];
    if (a.every((v, j) => j === k || Math.abs(v - b[j]) < 1e-9) && Math.abs(a[k] - b[k]) > 1e-9) count += 1;
  }
  return count;
};

test('Solid mode identity: only the literal "solid" mode is solid', () => {
  assert.equal(SOLID_MODE, 'solid');
  assert.equal(isSolidMode('solid'), true);
  assert.equal(isSolidMode('spatial'), false);
  assert.equal(isSolidMode('planar'), false);
  assert.equal(isSolidMode(undefined), false);
});

test('A flat triangle extrudes into a closed right prism: two caps, three walls, three vertical edges', () => {
  const tri = [0, 0, 0, 4, 0, 0, 1, 0, 3];
  const { faces, edges } = extrudeTriangleSoup(tri, { axis: 'y', halfHeight: 2 });
  assert.equal(faces.length / 3, 2 * 3 + 3 * 6, 'caps (2 triangles) + 3 walls (2 triangles each)');
  assert.equal(verticalEdgeCount(edges, 1), 3, 'one vertical edge per triangle corner');
  for (const p of points(faces)) assert.ok(Math.abs(Math.abs(p[1]) - 2) < 1e-9, 'every vertex lies on a cap plane y = ±h');
});

test('Every slice of the prism is congruent to the planar figure (theorem invariants hold at every height)', () => {
  const tri = [-3, 0, 0, 3, 0, 0, 1, 0, 2.5];
  const { faces } = extrudeTriangleSoup(tri, { axis: 'y', halfHeight: 1.5 });
  const base = new Set(points(tri).map((p) => key([p[0], p[2]])));
  const top = new Set(points(faces).filter((p) => p[1] > 0).map((p) => key([p[0], p[2]])));
  const bottom = new Set(points(faces).filter((p) => p[1] < 0).map((p) => key([p[0], p[2]])));
  assert.deepEqual([...top].sort(), [...base].sort(), 'top cap projects exactly onto the planar triangle');
  assert.deepEqual([...bottom].sort(), [...base].sort(), 'bottom cap projects exactly onto the planar triangle');
});

test('An angle-wedge fan only walls its outer boundary and only marks real corners', () => {
  const fan = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * (Math.PI / 2);
    const a1 = ((i + 1) / n) * (Math.PI / 2);
    fan.push(0, 0, 0, Math.cos(a0), Math.sin(a0), 0, Math.cos(a1), Math.sin(a1), 0);
  }
  const { faces, edges } = extrudeTriangleSoup(fan, { axis: 'z', halfHeight: 0.5 });
  const boundaryEdges = n + 2;
  assert.equal(faces.length / 3, n * 2 * 3 + boundaryEdges * 6, 'interior radii are not walled');
  assert.equal(verticalEdgeCount(edges, 2), 3, 'vertex and both arc ends are corners; smooth arc points are not');
});

test('Chords become rectangles and circles become cylinders with evenly spaced rulings', () => {
  const chord = extrudePolyline([0, 0, 0, 5, 0, 0], { axis: 'y', halfHeight: 1, pairs: true });
  assert.equal(chord.faces.length / 3, 6, 'a chord becomes one rectangle (two triangles)');
  assert.equal(verticalEdgeCount(chord.edges, 1), 2, 'rulings at both chord endpoints');

  const loop = [];
  for (let i = 0; i < 48; i++) loop.push(Math.cos((i / 48) * 2 * Math.PI), 0, Math.sin((i / 48) * 2 * Math.PI));
  const cylinder = extrudePolyline(loop, { axis: 'y', halfHeight: 1, closed: true, generators: 12 });
  assert.equal(cylinder.faces.length / 3, 48 * 6, 'closed loop walls every segment including the closing one');
  assert.equal(verticalEdgeCount(cylinder.edges, 1), 12, 'emphasised circle shows 12 cylinder generators');

  const open = extrudePolyline([0, 0, 0, 1, 0, 0, 2, 0, 1], { axis: 'y', halfHeight: 1 });
  assert.equal(verticalEdgeCount(open.edges, 1), 2, 'open polylines are ruled at their endpoints only');
});

class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq() { return this.dot(this); }
  normalize() { const l = Math.sqrt(this.lengthSq()) || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
}

const mockControls = () => {
  const calls = [];
  return {
    calls,
    THREE: { Vector3: Vec3 },
    camera: { position: new Vec3(0, 48, 0.001), up: new Vec3(0, 0, -1) },
    target: new Vec3(0, 0, 0),
    enabled: true,
    state: 'none',
    pointers: new Map(),
    angularVelocity: { angle: 0 },
    rotateCameraByAxisAngle(axis, angle) { calls.push({ axis: axis.clone(), angle }); },
  };
};

test('Idle parallax waits for idleness, executes compound omnidirectional 3D sway (yaw + pitch) perpendicular to view and stops on interaction', () => {
  const controls = mockControls();
  const parallax = new IdleParallax(controls, null, { amplitudeDeg: 4, pitchRatio: 0.65, periodMs: 8000, idleMs: 3000, rampMs: 1 });
  const t0 = parallax.holdUntil;
  parallax.update(true, t0 + 1000);
  assert.equal(controls.calls.length, 0, 'no sway before the idle delay');

  parallax.update(true, t0 + 3000);
  parallax.update(true, t0 + 3000 + 2000);
  assert.ok(controls.calls.length >= 1, 'sways once idle');
  const { axis, angle } = controls.calls[controls.calls.length - 1];
  const view = new Vec3().subVectors(controls.target, controls.camera.position).normalize();
  assert.ok(Math.abs(axis.dot(view)) < 1e-6, 'compound precession axis is perpendicular to the view direction');
  assert.ok(Math.abs(axis.x) > 1e-4 && Math.abs(axis.z) > 1e-4, 'precession axis spans both horizontal and vertical screen directions for omnidirectional depth');
  assert.ok(angle > 0, 'non-zero angular displacement applied');

  controls.state = 'rotate';
  const before = controls.calls.length;
  parallax.update(true, t0 + 6000);
  parallax.update(true, t0 + 9500);
  assert.equal(controls.calls.length, before, 'user rotation suspends the sway');

  controls.state = 'none';
  parallax.update(false, t0 + 20000);
  assert.equal(controls.calls.length, before, 'disabled (AR or camera animation) never sways');
});

test('Planar/Solid wiring: every visual reaches Solid, Thales keeps Spatial S² and gains a Solid button', () => {
  const core = read('js/circle-core.js');
  assert.ok(core.includes("bindDimClick('btn-mode-spatial', 'spatial');"));
  assert.ok(core.includes("bindDimClick('btn-mode-solid', 'solid');"));
  assert.ok(core.includes("dimensionMode: mode === 'solid' ? 'solid' : 'planar'"), 'Solid shares the planar (flattened) figure');

  const thales = read('visuals/circle-theorems/thales-theorem/index.html');
  assert.ok(thales.includes('id="btn-mode-spatial"'));
  assert.ok(thales.includes('id="btn-mode-solid"'));
  assert.ok(thales.includes('id="btn-mode-solid-pill"'));
  const thalesView = read('visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js');
  assert.ok(thalesView.includes("axis: 'z'"), 'Thales figure lies in the XY plane, so it extrudes along Z');

  const trig = read('visuals/trigonometry/js/trig-core.js');
  assert.ok(trig.includes("bindModeSwitch('btn-mode-solid-pill', 'solid');"));
  assert.ok(trig.includes("bindModeSwitch('btn-mode-solid', 'solid');"));
  for (const rel of ['law-of-sines', 'law-of-cosines', 'angle-sum-identities']) {
    const html = read(`visuals/trigonometry/${rel}/index.html`);
    assert.ok(html.includes('id="btn-mode-solid">Solid 3D</button>'), `${rel} bar labels Solid 3D`);
  }

  const base = read('js/circle-3d.js');
  assert.ok(base.includes('this.updateDepthCues();'), 'shared 3D loop drives the solid morph and parallax');
  assert.ok(base.includes("exclude: () => [this.grid, this.axes, this.sphere]"));

  for (const lang of ['ar', 'de', 'en', 'es', 'fr', 'nr', 'zh']) {
    const locale = JSON.parse(read(`locales/${lang}.json`));
    assert.equal(typeof locale.controls?.solid, 'string', `${lang} defines controls.solid`);
  }
});

test('Arbitrary normal vector extrusion lifts flat geometry in any 3D direction', () => {
  // Planar triangle tilted in 3D: normal n = [3/5, 4/5, 0]
  const n = [3 / 5, 4 / 5, 0];
  // Orthonormal basis in plane: u = [-4/5, 3/5, 0], v = [0, 0, 1]
  const u = [-4 / 5, 3 / 5, 0];
  const v = [0, 0, 1];
  const p0 = [0, 0, 0];
  const p1 = [u[0] * 3, u[1] * 3, 0];
  const p2 = [0, 0, 4];
  const tri = [...p0, ...p1, ...p2];
  const halfHeight = 2.5;
  const { faces, edges } = extrudeTriangleSoup(tri, { normal: n, halfHeight });

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const pts = points(faces);
  for (const pt of pts) {
    const distFromPlane = Math.abs(dot(pt, n));
    assert.ok(Math.abs(distFromPlane - halfHeight) < 1e-6, 'every face vertex lies on cap plane ±h along normal n');
  }

  // Polyline extrusion along arbitrary normal
  const ribbon = extrudePolyline([p0, p1].flat(), { normal: n, halfHeight, pairs: true });
  assert.equal(ribbon.faces.length / 3, 6, 'segment produces two triangles (one rectangle)');
  for (const pt of points(ribbon.faces)) {
    assert.ok(Math.abs(Math.abs(dot(pt, n)) - halfHeight) < 1e-6);
  }
});

test('Solid 3D spherical coordinates orientation frame: exact unit orthogonality across axes and angles', () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.hypot(...a);

  for (const axis of ['y', 'z']) {
    for (const [tilt, azimuth, spin] of [[0, 0, 0], [0.45, 0.6, 0], [1.2, 2.5, 1.8], [0.8, -1.1, 3.14]]) {
      const frame = getSolidOrientationFrame({ solidTilt: tilt, solidAzimuth: azimuth, solidSpin: spin }, axis);
      const { normalArr: n, uArr: u, vArr: v } = frame;
      assert.ok(Math.abs(len(n) - 1) < 1e-9, 'normal is unit vector');
      assert.ok(Math.abs(len(u) - 1) < 1e-9, 'u basis is unit vector');
      assert.ok(Math.abs(len(v) - 1) < 1e-9, 'v basis is unit vector');
      assert.ok(Math.abs(dot(u, n)) < 1e-9, 'u is strictly orthogonal to normal');
      assert.ok(Math.abs(dot(v, n)) < 1e-9, 'v is strictly orthogonal to normal');
      assert.ok(Math.abs(dot(u, v)) < 1e-9, 'u and v are strictly orthogonal');
    }
  }
});

test('Coupled rigid lockstep rotation: spinning or tilting the cylinder moves all points together with invariant distances', () => {
  const R = 10;
  const aAng = 0.5, bAng = 2.1, cAng = 4.2;
  const toPt = (frame, ang) => [
    R * (frame.uArr[0] * Math.cos(ang) + frame.vArr[0] * Math.sin(ang)),
    R * (frame.uArr[1] * Math.cos(ang) + frame.vArr[1] * Math.sin(ang)),
    R * (frame.uArr[2] * Math.cos(ang) + frame.vArr[2] * Math.sin(ang)),
  ];
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

  const f0 = getSolidOrientationFrame({ solidTilt: 0, solidAzimuth: 0, solidSpin: 0 }, 'y');
  const A0 = toPt(f0, aAng), B0 = toPt(f0, bAng), C0 = toPt(f0, cAng);
  const dAB0 = dist(A0, B0), dBC0 = dist(B0, C0), dCA0 = dist(C0, A0);

  // Spin cylinder by 75 degrees and tilt by 30 degrees
  const f1 = getSolidOrientationFrame({ solidTilt: 0.52, solidAzimuth: 1.1, solidSpin: 1.3 }, 'y');
  const A1 = toPt(f1, aAng), B1 = toPt(f1, bAng), C1 = toPt(f1, cAng);
  const dAB1 = dist(A1, B1), dBC1 = dist(B1, C1), dCA1 = dist(C1, A1);

  assert.ok(Math.abs(dAB1 - dAB0) < 1e-6, 'chord |AB| remains invariant under coupled rotation');
  assert.ok(Math.abs(dBC1 - dBC0) < 1e-6, 'chord |BC| remains invariant under coupled rotation');
  assert.ok(Math.abs(dCA1 - dCA0) < 1e-6, 'chord |CA| remains invariant under coupled rotation');
});

test('Solid 3D UI controls: orientation sliders (tilt, azimuth, spin) and reset button in circle-core and trig-core', () => {
  const circleCore = read('js/circle-core.js');
  assert.ok(circleCore.includes('id="solid-orientation-controls"'), 'circle-core mounts solid orientation subpanel');
  assert.ok(circleCore.includes('id="slider-solid-tilt"'), 'circle-core mounts solid tilt polar phi slider');
  assert.ok(circleCore.includes('id="slider-solid-azimuth"'), 'circle-core mounts solid azimuth theta slider');
  assert.ok(circleCore.includes('id="slider-solid-spin"'), 'circle-core mounts solid coupled spin psi slider');
  assert.ok(circleCore.includes('id="btn-reset-solid-orientation"'), 'circle-core mounts reset solid orientation button');

  const trigCore = read('visuals/trigonometry/js/trig-core.js');
  assert.ok(trigCore.includes('solid-orientation-controls'), 'trig-core mounts solid orientation subpanel');
  assert.ok(trigCore.includes('id="slider-solid-tilt"'), 'trig-core mounts solid tilt polar phi slider');
  assert.ok(trigCore.includes('id="slider-solid-azimuth"'), 'trig-core mounts solid azimuth theta slider');
  assert.ok(trigCore.includes('id="slider-solid-spin"'), 'trig-core mounts solid coupled spin psi slider');
  assert.ok(trigCore.includes('id="btn-reset-solid-orientation"'), 'trig-core mounts reset solid orientation button');
  assert.ok(trigCore.includes('getSolidOrientationFrame'), 'trig-core imports and uses getSolidOrientationFrame');
});

test('Trigonometry visualizers support true 3D Solid mode orientation across all 4 modules', () => {
  const trigCore = read('visuals/trigonometry/js/trig-core.js');
  assert.ok(trigCore.includes("visualId === 'unit-circle-helix'"), 'unit-circle-helix present');
  assert.ok(trigCore.includes("getSolidOrientationFrame(state, 'y', THREE)"), 'uses orientation frame in unit-circle-helix, law-of-sines, law-of-cosines, angle-sum');
  const solidOccurrences = trigCore.match(/isSolidMode\(state\.dimensionMode\)/g);
  assert.ok(solidOccurrences && solidOccurrences.length >= 3, 'all 3 theorem renderers check isSolidMode');
  assert.ok(trigCore.includes('const isSolid = isSolidMode(state.dimensionMode);'), 'unit-circle-helix checks isSolidMode');
});

test('Omnidirectional 3D solid mode dragging: direct interaction on solid visual and circular mesh updates solidTilt and solidAzimuth', () => {
  const circle3D = read('js/circle-3d.js');
  assert.ok(circle3D.includes('isSolidOrient: true'), 'circle-3d.js enables isSolidOrient on direct drag');
  assert.ok(circle3D.includes('solidTilt: nextTilt'), 'circle-3d.js updates solidTilt during omnidirectional drag');
  assert.ok(circle3D.includes('solidAzimuth: nextAzimuth'), 'circle-3d.js updates solidAzimuth during omnidirectional drag');

  const thales3D = read('visuals/circle-theorems/thales-theorem/src/controllers/Scene3DInteraction.js');
  assert.ok(thales3D.includes("activeTarget = 'solidOrient'"), 'Thales Scene3DInteraction activates solidOrient mode');
  assert.ok(thales3D.includes('solidTilt: nextTilt'), 'Thales Scene3DInteraction updates solidTilt during omnidirectional drag');
  assert.ok(thales3D.includes('solidAzimuth: nextAzimuth'), 'Thales Scene3DInteraction updates solidAzimuth during omnidirectional drag');
});

test('Spatial mode 2D spherical surface draggability: all cases decouple Solid from Spatial and support 2-DOF dragging (lat & angle) on S²', () => {
  const circle3D = read('js/circle-3d.js');

  // 1. Tangent-Radius: points T, T2, T3, T4 draggable across full S² (latT, angleT)
  assert.ok(circle3D.includes("{ id: 'T', mesh: this.tangentMarkers[0], field: 'angleT', latField: 'latT' }"), 'TangentRadius3DView equips T with latField latT');
  assert.ok(circle3D.includes("R * Math.sin(lat) * Math.cos(ang)"), 'TangentRadius3DView computes T on S² via spherical lat & ang');

  // 2. Perpendicular Chord Bisector: points A, B, and midpoint M draggable across full S²
  assert.ok(circle3D.includes("latField: 'latA'"), 'ChordBisector3DView equips A with latField latA');
  assert.ok(circle3D.includes("latField: 'latB'"), 'ChordBisector3DView equips B with latField latB');
  assert.ok(circle3D.includes("updates.latA = lat;"), 'ChordBisector3DView updates latA in store on drag');
  assert.ok(circle3D.includes("updates.latB = lat;"), 'ChordBisector3DView updates latB in store on drag');

  // 3. Alternate Segment: points T, B, and D draggable across full S²
  assert.ok(circle3D.includes("updates.latT = lat;"), 'AlternateSegment3DView updates latT in store on drag');
  assert.ok(circle3D.includes("updates.latB = lat;"), 'AlternateSegment3DView updates latB in store on drag');

  // 4. Tangents from Point: apex P draggable in 3D around S² (latP, pointAngle)
  assert.ok(circle3D.includes("store.set({ pointAngle: angle, latP: lat });"), 'TangentsFromPoint3DView updates latP on drag');
  assert.ok(circle3D.includes("d * Math.sin(latP) * Math.cos(angP)"), 'TangentsFromPoint3DView positions apex P in 3D spherical coordinates');

  // 5. Angle at Centre: points P, A, B draggable across full S² and feed Girard excess
  assert.ok(circle3D.includes("if (st.dimensionMode === 'spatial' && lat !== undefined) updates.latP = lat;"), 'AngleAtCentre3DView updates latP on drag in spatial mode');
  assert.ok(circle3D.includes("if (st.dimensionMode === 'spatial' && lat !== undefined) updates.latA = lat;"), 'AngleAtCentre3DView updates latA on drag in spatial mode');
  assert.ok(circle3D.includes("if (st.dimensionMode === 'spatial' && lat !== undefined) updates.latB = lat;"), 'AngleAtCentre3DView updates latB on drag in spatial mode');

  // 6. Thales: P draggable across full S² (lat3D, lon3D)
  const thalesScene = read('visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js');
  assert.ok(thalesScene.includes("sphericalToCartesian(r, lat, lon)"), 'Thales Scene3DView positions P on S²');
  assert.ok(!thalesScene.includes("if (isSolid || isSpatial)"), 'Thales Scene3DView decouples isSolid from isSpatial');
  const thalesInteraction = read('visuals/circle-theorems/thales-theorem/src/controllers/Scene3DInteraction.js');
  assert.ok(thalesInteraction.includes("this.scene.pickSphere(st.baselineRotation || 0)"), 'Thales Scene3DInteraction picks S² in spatial mode');
  assert.ok(thalesInteraction.includes("setSpherePoint(sph, st)"), 'Thales Scene3DInteraction updates sphere coordinates');

  // 7. Trigonometry Suite: Law of Sines & Law of Cosines support full 2D surface dragging on S²
  const trigCore = read('visuals/trigonometry/js/trig-core.js');
  assert.ok(trigCore.includes("makeLawOfSinesTarget('A', this.handleA, 'angleA', 'latA')"), 'Law of Sines equips A with latA');
  assert.ok(trigCore.includes("makeLawOfSinesTarget('B', this.handleB, 'angleB', 'latB')"), 'Law of Sines equips B with latB');
  assert.ok(trigCore.includes("makeLawOfSinesTarget('C', this.handleC, 'angleC', 'latC')"), 'Law of Sines equips C with latC');
  assert.ok(trigCore.includes("store.set({ colatC: colat, lonC: lon, solidTilt: colat, solidAzimuth: lon });"), 'Law of Cosines drags C over colatC and lonC on S²');
});

test('Thales Theorem: Point P 3D interaction, solidOrient anti-hijack guard, and Volume Box formation in 3D Solid mode', () => {
  const thalesScene = read('visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js');
  const thalesInteraction = read('visuals/circle-theorems/thales-theorem/src/controllers/Scene3DInteraction.js');
  const thalesMath = read('visuals/circle-theorems/thales-theorem/src/model/thales-math.js');

  // 1. Point P hit testing threshold expanded to 34px and nearAnyTarget anti-hijack guard
  assert.ok(thalesScene.includes('< 34) return true;'), 'hitsPointP uses 34px screen distance threshold');
  assert.ok(thalesScene.includes('nearAnyTarget(tolerance = 38)'), 'Scene3DView defines nearAnyTarget guard');
  assert.ok(thalesInteraction.includes('if (this.scene.nearAnyTarget?.(38))'), 'Scene3DInteraction guards against solidOrient hijacking near points');

  // 2. Volume Box formed by Point P in Solid mode
  assert.ok(thalesScene.includes('const px = o.pointP.position.x;'), 'volumeBox tracks pointP x coordinate');
  assert.ok(thalesScene.includes('const py = o.pointP.position.y;'), 'volumeBox tracks pointP y coordinate');
  assert.ok(thalesScene.includes('const pz = o.pointP.position.z;'), 'volumeBox tracks pointP z coordinate');
  assert.ok(thalesScene.includes('const boxDepth = (isSolid && Math.abs(pz) < 0.05) ? (2 * h) : Math.max(Math.abs(pz), min);'), 'volumeBox enforces non-zero 3D extrusion depth in solid mode');
  assert.ok(thalesScene.includes('o.volumeBox.scale.set(Math.max(Math.abs(px), min), Math.max(Math.abs(py), min), boxDepth);'), 'volumeBox scaled with Point P dimensions');
  assert.ok(thalesScene.includes('o.volumeBox.position.set(px / 2, py / 2, boxPosZ);'), 'volumeBox centered between origin and Point P');

  // 3. Mathematical sphereStats computes volume in Solid mode
  assert.ok(thalesMath.includes('const isSolid = dimensionMode === \'solid\';'), 'sphereStats recognizes solid mode');
  assert.ok(thalesMath.includes('const depth = (isSolid && Math.abs(p.z) < 0.05) ? (2 * h) : Math.max(Math.abs(p.z), 0.001);'), 'sphereStats computes 3D volume depth');
  assert.ok(thalesMath.includes('const volume = Math.abs(p.x * p.y * depth);'), 'sphereStats computes box volume for solid mode');
});
