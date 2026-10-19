import test from 'node:test';
import assert from 'node:assert/strict';

import { ARManager } from '../js/ar-manager.js';

class MockRenderer {
  constructor() {
    this.clearColor = 0x0a0f1d;
    this.clearAlpha = 1.0;
    this.xr = { enabled: false, setSession: async () => {} };
  }
  getClearColor() {
    return { getHex: () => this.clearColor };
  }
  getClearAlpha() {
    return this.clearAlpha;
  }
  setClearColor(color, alpha = 1.0) {
    this.clearColor = color;
    this.clearAlpha = alpha;
  }
}

class MockContainer {
  constructor() {
    this.children = [];
    this.classList = {
      _set: new Set(),
      add: (c) => this.classList._set.add(c),
      remove: (c) => this.classList._set.delete(c),
      contains: (c) => this.classList._set.has(c),
    };
    this.ownerDocument = {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        innerHTML: '',
        remove: () => {},
        querySelector: () => ({ addEventListener: () => {} }),
      }),
    };
  }
  prepend(el) {
    this.children.unshift(el);
  }
  appendChild(el) {
    this.children.push(el);
  }
  insertBefore(el, ref) {
    this.children.push(el);
  }
}

test('ARManager: Instance creation and initial state contract', () => {
  const manager = new ARManager();
  assert.strictEqual(manager.isActive, false);
  assert.strictEqual(manager.mode, null);
});

test('ARManager: Fallback Video Pass-Through AR lifecycle', async () => {
  const originalNav = globalThis.navigator;

  // Mock navigator with mediaDevices
  const mockTrack = { stop: () => { mockTrack.stopped = true; } };
  const mockNav = {
    mediaDevices: {
      getUserMedia: async () => ({
        getTracks: () => [mockTrack],
      }),
    },
  };
  Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true, writable: true });

  const renderer = new MockRenderer();
  const container = new MockContainer();

  let started = false;
  let ended = false;

  const manager = new ARManager({
    renderer,
    container,
    onSessionStart: (info) => { started = true; },
    onSessionEnd: () => { ended = true; },
  });

  const res = await manager.start();
  assert.strictEqual(res, true);
  assert.strictEqual(manager.isActive, true);
  assert.strictEqual(manager.mode, 'video-passthrough');
  assert.strictEqual(started, true);
  assert.strictEqual(renderer.clearAlpha, 0, 'Renderer canvas must become transparent for AR video stream');
  assert.ok(container.classList.contains('is-ar-active'));

  // Stop session
  manager.stop();
  assert.strictEqual(manager.isActive, false);
  assert.strictEqual(manager.mode, null);
  assert.strictEqual(ended, true);
  assert.strictEqual(mockTrack.stopped, true, 'Camera media tracks must be stopped');
  assert.strictEqual(renderer.clearAlpha, 1.0, 'Renderer clear alpha must be restored to 1.0');
  assert.strictEqual(container.classList.contains('is-ar-active'), false);

  Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true, writable: true });
});

test('ARManager: WebXR Immersive AR lifecycle when supported', async () => {
  const originalNav = globalThis.navigator;

  let sessionEnded = false;
  const mockSession = {
    addEventListener: (type, handler) => {
      if (type === 'end') mockSession.onEnd = handler;
    },
    end: () => { sessionEnded = true; },
  };

  const mockNav = {
    xr: {
      isSessionSupported: async (mode) => mode === 'immersive-ar',
      requestSession: async () => mockSession,
    },
  };
  Object.defineProperty(globalThis, 'navigator', { value: mockNav, configurable: true, writable: true });

  const renderer = new MockRenderer();
  const container = new MockContainer();

  const manager = new ARManager({ renderer, container });
  const res = await manager.start();

  assert.strictEqual(res, true);
  assert.strictEqual(manager.isActive, true);
  assert.strictEqual(manager.mode, 'webxr');
  assert.strictEqual(renderer.xr.enabled, true);

  manager.stop();
  assert.strictEqual(manager.isActive, false);
  assert.strictEqual(sessionEnded, true);

  Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true, writable: true });
});

test('ARManager: Tier 3 Spatial AR Simulation fallback when no camera or WebXR is present', async () => {
  const originalNav = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true });

  const renderer = new MockRenderer();
  const container = new MockContainer();

  let startedMode = null;
  const manager = new ARManager({
    renderer,
    container,
    onSessionStart: (info) => { startedMode = info.mode; },
  });

  const res = await manager.start();
  assert.strictEqual(res, true);
  assert.strictEqual(manager.isActive, true);
  assert.strictEqual(manager.mode, 'spatial-simulation');
  assert.strictEqual(startedMode, 'spatial-simulation');
  assert.strictEqual(renderer.clearAlpha, 0, 'Renderer clear alpha must be 0 in spatial simulation');
  assert.ok(container.classList.contains('is-ar-active'));

  manager.stop();
  assert.strictEqual(manager.isActive, false);
  assert.strictEqual(manager.mode, null);
  assert.strictEqual(renderer.clearAlpha, 1.0);

  Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true, writable: true });
});

test('Affine Mode: Canvas2DView and Scene3DView stateKeys subscribe to affine state and setAffineMode initializes visible stretch', async () => {
  const { Canvas2DView } = await import('../visuals/thales-theorem/src/views/Canvas2DView.js');
  const { Scene3DView } = await import('../visuals/thales-theorem/src/views/Scene3DView.js');
  const { setAffineMode, setAffineStretch } = await import('../visuals/thales-theorem/src/model/actions.js');

  for (const key of ['affineMode', 'affineStretch', 'affineAxisAngle']) {
    assert.ok(Canvas2DView.stateKeys.includes(key), `Canvas2DView.stateKeys must include ${key}`);
    assert.ok(Scene3DView.stateKeys.includes(key), `Scene3DView.stateKeys must include ${key}`);
  }

  const patchFromUnit = setAffineMode(true, { affineStretch: 1.0 });
  assert.strictEqual(patchFromUnit.affineMode, true);
  assert.strictEqual(patchFromUnit.affineStretch, 1.35, 'Enabling affine mode at stretch=1.0 must auto-initialize to 1.35x');

  const stretchPatch = setAffineStretch(1.6);
  assert.strictEqual(stretchPatch.affineStretch, 1.6);
  assert.strictEqual(stretchPatch.affineMode, true, 'Adjusting stretch slider must auto-enable affineMode');
});

