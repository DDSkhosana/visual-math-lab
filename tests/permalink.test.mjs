import test from 'node:test';
import assert from 'node:assert/strict';

import {
  serializeStateToHash,
  deserializeStateFromHash,
  showShareToast,
  copyShareUrl,
  initPermalinkSync,
} from '../js/permalink.js';
import { createStore, toRadians } from '../js/circle-core.js';

test('Permalink: serializeStateToHash encodes mathematical and UI configuration', () => {
  const state = {
    angle2D: toRadians(62.5),
    radius: 12.0,
    viewMode: '3d',
    splitDirection: 'vertical',
    splitRatio: 65,
    cameraPreset: 'front',
    affineMode: true,
    affineStretch: 1.75,
    affineAxisAngle: toRadians(45),
    lengthUnit: 'cm',
  };

  const mockDock = {
    dockEdge: 'left',
    isCollapsed: false,
  };

  const hash = serializeStateToHash(state, mockDock);
  assert.ok(hash.startsWith('#'), 'Hash must start with #');

  const params = new URLSearchParams(hash.slice(1));
  assert.strictEqual(params.get('angle'), '62.5');
  assert.strictEqual(params.get('r'), '12.0');
  assert.strictEqual(params.get('mode'), '3d');
  assert.strictEqual(params.get('dir'), 'v');
  assert.strictEqual(params.get('split'), '65');
  assert.strictEqual(params.get('cam'), 'front');
  assert.strictEqual(params.get('affine'), '1');
  assert.strictEqual(params.get('stretch'), '1.75');
  assert.strictEqual(params.get('axis'), '45');
  assert.strictEqual(params.get('unit'), 'cm');
  assert.strictEqual(params.get('edge'), 'left');
});

test('Permalink: deserializeStateFromHash parses valid URL hashes accurately into state patches', () => {
  const hash = '#angle=120.0&r=14.5&mode=2d&dir=v&split=40&affine=1&stretch=1.80&axis=30&edge=right&docked=0';
  const patch = deserializeStateFromHash(hash);

  assert.ok(Math.abs(patch.angle2D - toRadians(120.0)) < 1e-4);
  assert.ok(Math.abs(patch.angleP - toRadians(120.0)) < 1e-4);
  assert.strictEqual(patch.radius, 14.5);
  assert.strictEqual(patch.viewMode, '2d');
  assert.strictEqual(patch.splitDirection, 'vertical');
  assert.strictEqual(patch.splitRatio, 40);
  assert.strictEqual(patch.affineMode, true);
  assert.strictEqual(patch.affineStretch, 1.80);
  assert.ok(Math.abs(patch.affineAxisAngle - toRadians(30)) < 1e-4);
  assert.strictEqual(patch.dockEdge, 'right');
  assert.strictEqual(patch.dockCollapsed, true);
});

test('Permalink: Round-trip consistency between serialize and deserialize', () => {
  const initial = {
    angle2D: toRadians(75.5),
    radius: 10.0,
    viewMode: '3d',
    splitDirection: 'vertical',
    splitRatio: 70,
    affineMode: true,
    affineStretch: 1.45,
    affineAxisAngle: toRadians(60),
  };

  const hash = serializeStateToHash(initial);
  const recovered = deserializeStateFromHash(hash);

  assert.ok(Math.abs(recovered.angle2D - initial.angle2D) < 1e-3);
  assert.strictEqual(recovered.radius, initial.radius);
  assert.strictEqual(recovered.viewMode, initial.viewMode);
  assert.strictEqual(recovered.splitDirection, initial.splitDirection);
  assert.strictEqual(recovered.splitRatio, initial.splitRatio);
  assert.strictEqual(recovered.affineMode, initial.affineMode);
  assert.strictEqual(recovered.affineStretch, initial.affineStretch);
  assert.ok(Math.abs(recovered.affineAxisAngle - initial.affineAxisAngle) < 1e-3);
});

test('Permalink: Resilient against empty, malformed, and out-of-bounds inputs', () => {
  assert.deepStrictEqual(deserializeStateFromHash(''), {});
  assert.deepStrictEqual(deserializeStateFromHash('#'), {});
  assert.deepStrictEqual(deserializeStateFromHash('?'), {});
  assert.deepStrictEqual(deserializeStateFromHash('invalid-string-without-keys'), {});

  // Non-numeric angle or NaN ignored
  const malformed = deserializeStateFromHash('#angle=hello&stretch=not-a-number&r=invalid');
  assert.strictEqual(malformed.angle2D, undefined);
  assert.strictEqual(malformed.affineStretch, undefined);
  assert.strictEqual(malformed.radius, undefined);

  // Clamping extreme values
  const extreme = deserializeStateFromHash('#stretch=999.0&split=150&r=9999');
  assert.strictEqual(extreme.affineStretch, 2.5); // Max clamp 2.5
  assert.strictEqual(extreme.splitRatio, 90);    // Max clamp 90
  assert.strictEqual(extreme.radius, 50);        // Max clamp 50
});

test('Permalink: showShareToast displays accessible floating toast in DOM', () => {
  const doc = {
    _elements: {},
    getElementById(id) { return this._elements[id] || null; },
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        classList: {
          _set: new Set(),
          add(c) { this._set.add(c); },
          remove(c) { this._set.delete(c); },
          contains(c) { return this._set.has(c); },
        },
        setAttribute(k, v) { this[k] = v; },
        innerHTML: '',
      };
      return el;
    },
    body: {
      appendChild(child) {
        if (child.id) doc._elements[child.id] = child;
      },
    },
  };

  const origDoc = globalThis.document;
  globalThis.document = doc;

  showShareToast('Custom Proof Link Copied!');
  const toast = doc.getElementById('vml-share-toast');
  assert.ok(toast, 'Toast must be created in document body');
  assert.ok(toast.classList.contains('vml-toast--visible'), 'Toast must have vml-toast--visible class');
  assert.ok(toast.innerHTML.includes('Custom Proof Link Copied!'));

  globalThis.document = origDoc;
});

test('Permalink: copyShareUrl writes URL to clipboard and triggers feedback', async () => {
  let clipboardText = null;
  const mockNavigator = {
    clipboard: {
      writeText: async (t) => { clipboardText = t; },
    },
  };
  const mockLocation = {
    origin: 'https://example.com',
    pathname: '/visuals/thales-theorem/',
  };

  const origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const origLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const origWin = globalThis.window;

  Object.defineProperty(globalThis, 'navigator', { value: mockNavigator, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'location', { value: mockLocation, configurable: true, writable: true });
  globalThis.window = {
    location: mockLocation,
    navigator: mockNavigator,
    document: {
      getElementById: () => null,
      createElement: () => ({ classList: { add() {}, remove() {} }, setAttribute() {} }),
      body: { appendChild() {} },
    },
  };

  const store = createStore({ angle2D: toRadians(45), viewMode: '3d' });
  const url = await copyShareUrl(store);

  assert.ok(url.startsWith('https://example.com/visuals/thales-theorem/#angle=45.0'));
  assert.strictEqual(clipboardText, url);

  if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
  if (origLoc) Object.defineProperty(globalThis, 'location', origLoc);
  globalThis.window = origWin;
});
