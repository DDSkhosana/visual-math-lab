import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extrudeTriangleSoup, extrudePolyline, isSolidMode, IdleParallax, SOLID_MODE } from '../js/solid-morph.js';

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
