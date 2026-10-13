import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../visuals/thales-theorem/src/model/store.js';
import { createInitialState } from '../visuals/thales-theorem/src/config/defaults.js';
import { setAngle2D, setFlag, setLongitude, setSpherePoint, toggleSplitDirection, setPlaying } from '../visuals/thales-theorem/src/model/actions.js';
import { sphereStats, thalesStats2D, toRadians } from '../visuals/thales-theorem/src/model/thales-math.js';
import { NullScene3DView } from '../visuals/thales-theorem/src/views/NullScene3DView.js';
import { computeFrame } from '../visuals/thales-theorem/src/views/canvas2d-draw.js';
import { PALETTE } from '../visuals/thales-theorem/src/config/palette.js';

import { generateSceneSVG } from '../visuals/thales-theorem/src/views/canvas2d-svg.js';

const close = (actual, expected, eps = 1e-7) => assert.ok(Math.abs(actual - expected) < eps, `${actual} !~ ${expected}`);

test('store notifies subscribers only when watched keys change', () => {
  const store = createStore({ a: 1, b: 1 });
  const seen = [];
  store.subscribe((s) => seen.push(s.a), ['a']);
  store.set({ b: 2 });
  store.set({ a: 1 });
  store.set({ a: 2 });
  assert.deepEqual(seen, [2]);
});

test('unsubscribe stops notifications', () => {
  const store = createStore({ a: 1 });
  let calls = 0;
  const off = store.subscribe(() => calls++);
  store.set({ a: 2 });
  off();
  store.set({ a: 3 });
  assert.equal(calls, 1);
});

test('setAngle2D keeps longitude in step', () => {
  const patch = setAngle2D(Math.PI / 2);
  assert.ok(Math.abs(patch.lon3D) < 1e-9);
});

test('setLongitude keeps the 2D angle in step', () => {
  assert.ok(Math.abs(setLongitude(0).angle2D - Math.PI / 2) < 1e-9);
});

test('setFlag replaces nested groups immutably', () => {
  const state = createInitialState();
  const patch = setFlag(state, ['vis2d', 'coords'], true);
  assert.equal(patch.vis2d.coords, true);
  assert.equal(state.vis2d.coords, false);
  assert.deepEqual(setFlag(state, ['show3dArea'], false), { show3dArea: false });
});

test('flipping the split direction resets the ratio', () => {
  const patch = toggleSplitDirection({ splitDirection: 'horizontal' });
  assert.deepEqual(patch, { splitDirection: 'vertical', splitRatio: 50 });
});

test('createInitialState: 2D and 3D metrics match identically', () => {
  const state = createInitialState();
  const flat = thalesStats2D(state.radius, state.angle2D);
  const solid = sphereStats(state.radius, state.lat3D, state.lon3D);

  close(flat.s, solid.s);
  close(flat.t, solid.t);
  close(flat.area, solid.area);
  close(flat.sumSquares, solid.thalesSumSquares);
});

test('setPlaying toggles playback state', () => {
  const patchTrue = setPlaying(true);
  assert.equal(patchTrue.playing, true);
  const patchFalse = setPlaying(false);
  assert.equal(patchFalse.playing, false);
});

test('NullScene3DView supports setCameraPreset without error', () => {
  const null3d = new NullScene3DView();
  assert.doesNotThrow(() => null3d.setCameraPreset('isometric'));
  assert.doesNotThrow(() => null3d.setCameraPreset('top'));
  assert.doesNotThrow(() => null3d.setCameraPreset('front'));
  assert.doesNotThrow(() => null3d.setCameraPreset('side'));
});

test('generateSceneSVG outputs valid standalone SVG markup with circles and labels', () => {
  const state = createInitialState();
  const frame = computeFrame(state, 800, 600);
  const svg = generateSceneSVG(state, frame);

  assert.ok(svg.includes('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('viewBox="0 0 800 600"'));
  assert.ok(svg.includes('<circle'));
  assert.ok(svg.includes(`stroke="${PALETTE.blue}"`)); // chord s
  assert.ok(svg.includes(`stroke="${PALETTE.orange}"`)); // chord t
  assert.ok(svg.includes(`stroke="${PALETTE.red}"`)); // diameter d
  assert.ok(svg.includes("Thales' Theorem"));
});

test('setAngle2D updates 3D coordinates preserving sides s, t, and area', () => {
  const state = createInitialState();
  for (const deg of [15, 60, 120, 210, 300]) {
    const angle = toRadians(deg);
    const patch = setAngle2D(angle, state);
    const flat = thalesStats2D(state.radius, patch.angle2D);
    const solid = sphereStats(state.radius, patch.lat3D, patch.lon3D);

    close(flat.s, solid.s);
    close(flat.t, solid.t);
    close(flat.area, solid.area);
  }
});

test('setSpherePoint updates 2D angle preserving sides s, t, and area', () => {
  const state = createInitialState();
  for (const latDeg of [30, 60, 120, 150]) {
    for (const lonDeg of [-120, -45, 30, 90, 160]) {
      const lat = toRadians(latDeg);
      const lon = toRadians(lonDeg);
      const patch = setSpherePoint({ lat, lon }, state);
      const flat = thalesStats2D(state.radius, patch.angle2D);
      const solid = sphereStats(state.radius, patch.lat3D, patch.lon3D);

      close(flat.s, solid.s);
      close(flat.t, solid.t);
      close(flat.area, solid.area);
    }
  }
});
