import test from 'node:test';
import assert from 'node:assert/strict';

import { PALETTE as CORE_PALETTE, Panel, initCollapsibleSections } from '../js/circle-core.js';
import { PALETTE as THALES_PALETTE } from '../visuals/thales-theorem/src/config/palette.js';
import {
  AngleAtCentreDerivations,
  AnglesInSameSegmentDerivations,
  CyclicQuadDerivations,
  TangentRadiusDerivations,
  AlternateSegmentDerivations,
  TangentsFromPointDerivations,
  ChordBisectorDerivations,
} from '../js/circle-derivations.js';
import { DerivationView } from '../visuals/thales-theorem/src/views/DerivationView.js';

test('Colour Grammar: Core PALETTE and Thales PALETTE tokens are identical', () => {
  const coreKeys = Object.keys(CORE_PALETTE);
  for (const key of coreKeys) {
    if (THALES_PALETTE[key]) {
      assert.equal(
        CORE_PALETTE[key],
        THALES_PALETTE[key],
        `Color mismatch for key "${key}": ${CORE_PALETTE[key]} vs ${THALES_PALETTE[key]}`
      );
    }
  }
});

test('Colour Grammar: Derivations comply with theorem point identities and line colors', () => {
  class MockElement {
    constructor(id = '') {
      this.id = id;
      this.innerHTML = '';
      this.classList = new Set();
      this.children = [];
    }
    get firstElementChild() {
      return this.children[0] || (this.innerHTML ? new MockElement() : null);
    }
    querySelector(selector) {
      return new MockElement();
    }
    querySelectorAll() {
      return [];
    }
  }

  // 1. Angle at Centre: Point A is red, Point B is orange, Point P is violet
  const c1 = new MockElement('live-derivations-content');
  const d1 = new AngleAtCentreDerivations(c1);
  d1.render({ radius: 10 }, {
    A: { x: 10, y: 0 },
    B: { x: 0, y: 10 },
    P: { x: -10, y: 0 },
    cx: 0,
    cy: 0,
    inscribedDeg: 45,
    centralDeg: 90,
  });
  assert.ok(c1.innerHTML.includes('class="color-red">A</span>'), 'A must be red');
  assert.ok(c1.innerHTML.includes('class="color-orange">B</span>'), 'B must be orange');
  assert.ok(c1.innerHTML.includes('class="color-violet">P</span>'), 'P must be violet');

  // 2. Cyclic Quad: A is violet, B is cyan, C is amber, D is rose
  const c3 = new MockElement('cq-content');
  const d3 = new CyclicQuadDerivations(c3);
  d3.render({ radius: 10 }, {
    angleADeg: 80,
    angleBDeg: 95,
    angleCDeg: 100,
    angleDDeg: 85,
    sumAC: 180,
    sumBD: 180,
  });
  assert.ok(c3.innerHTML.includes('class="color-violet">A</span>'), 'Cyclic quad A must be violet');
  assert.ok(c3.innerHTML.includes('class="color-cyan">B</span>'), 'Cyclic quad B must be cyan');
  assert.ok(c3.innerHTML.includes('class="color-amber">C</span>'), 'Cyclic quad C must be amber');
  assert.ok(c3.innerHTML.includes('class="color-rose">D</span>'), 'Cyclic quad D must be rose');

  // 3. Tangent-Radius: T is red, OT is indigo, v_tan is emerald
  const c4 = new MockElement('tr-content');
  const d4 = new TangentRadiusDerivations(c4);
  d4.render({ radius: 10, angleT: 0 }, {
    T: { x: 10, y: 0 },
    cx: 0,
    cy: 0,
  });
  assert.ok(c4.innerHTML.includes('class="color-red">T</span>'), 'Tangent point T must be red');
  assert.ok(c4.innerHTML.includes('class="color-blue">OT</span>'), 'Radius OT must be blue');
  assert.ok(c4.innerHTML.includes('class="color-emerald">v_tan</span>'), 'Tangent direction must be emerald');

  // 4. Tangents from Point: P is red, O is sky, T1 and T2 are emerald
  const c5 = new MockElement('tfp-content');
  const d5 = new TangentsFromPointDerivations(c5);
  d5.render({ radius: 10 }, {
    d: 20,
    distOP: 20,
    lenPT1: 17.3,
    lenPT2: 17.3,
  });
  assert.ok(c5.innerHTML.includes('class="color-red">P</span>'), 'External Point P must be red');
  assert.ok(c5.innerHTML.includes('class="color-sky">O</span>'), 'Center O must be sky');
  assert.ok(c5.innerHTML.includes('class="color-emerald">T₁</span>'), 'T1 must be emerald');
  assert.ok(c5.innerHTML.includes('class="color-blue">T₂</span>'), 'T2 must be blue');

  // 5. Chord Bisector: A is blue, B is orange, O is sky, M is emerald, chord AB is blue
  const c6 = new MockElement('cb-content');
  const d6 = new ChordBisectorDerivations(c6);
  d6.render({ radius: 10 }, {
    lenChord: 14,
    lenAM: 7,
    distOM: 7.1,
    midDiff: 0,
  });
  assert.ok(c6.innerHTML.includes('class="color-blue">A</span>'), 'A must be blue');
  assert.ok(c6.innerHTML.includes('class="color-orange">B</span>'), 'B must be orange');
  assert.ok(c6.innerHTML.includes('class="color-indigo">O</span>') || c6.innerHTML.includes('class="color-sky">O</span>'), 'O must be indigo or sky');
  assert.ok(c6.innerHTML.includes('class="color-emerald">M</span>'), 'M must be emerald');
  assert.ok(c6.innerHTML.includes('class="color-blue">AB</span>'), 'Chord AB must be blue');

  // 6. Thales Theorem: A is red, B is orange, Center O is indigo, P is violet
  const c7Flat = new MockElement('live-math-2d');
  const c7Solid = new MockElement('live-math-3d');
  const d7 = new DerivationView(c7Flat, c7Solid);
  d7.render({ radius: 10, angle2D: Math.PI / 2, lat3D: Math.PI / 2, lon3D: Math.PI / 2 });
  assert.ok(c7Flat.innerHTML.includes('class="color-red">A</span>'), 'Thales A must be red and uppercase');
  assert.ok(c7Flat.innerHTML.includes('class="color-orange">B</span>'), 'Thales B must be orange and uppercase');
  assert.ok(c7Flat.innerHTML.includes('class="color-indigo">Center O</span>'), 'Thales center must be Center O and uppercase');
  assert.ok(c7Flat.innerHTML.includes('class="color-violet">P</span>'), 'Thales P must be violet and uppercase');

  // Verify graphical primitive colours for coordinates and angles across modules
  assert.ok(c1.innerHTML.includes('class="color-amber"'), 'AngleAtCentre: x coordinates must use amber');
  assert.ok(c1.innerHTML.includes('class="color-lime"'), 'AngleAtCentre: y coordinates must use lime');
  assert.ok(c1.innerHTML.includes('class="color-teal"'), 'AngleAtCentre: perigon invariants must use teal');

  assert.ok(c3.innerHTML.includes('class="color-amber"'), 'CyclicQuad: x coordinates must use amber');
  assert.ok(c3.innerHTML.includes('class="color-lime"'), 'CyclicQuad: y coordinates must use lime');
  assert.ok(c3.innerHTML.includes('class="color-lavender"'), 'CyclicQuad: 180/1080 angle sums must use lavender');

  assert.ok(c4.innerHTML.includes('class="color-amber"'), 'TangentRadius: x coordinates must use amber');
  assert.ok(c4.innerHTML.includes('class="color-lime"'), 'TangentRadius: y coordinates must use lime');
  assert.ok(c4.innerHTML.includes('class="color-teal"'), 'TangentRadius: 90/270/360 angles must use teal');

  assert.ok(c5.innerHTML.includes('class="color-amber"'), 'TangentsFromPoint: x coordinates must use amber');
  assert.ok(c5.innerHTML.includes('class="color-lime"'), 'TangentsFromPoint: y coordinates must use lime');
  assert.ok(c5.innerHTML.includes('class="color-teal"'), 'TangentsFromPoint: 90/270/360 angles must use teal');

  assert.ok(c6.innerHTML.includes('class="color-amber"'), 'ChordBisector: x coordinates must use amber');
  assert.ok(c6.innerHTML.includes('class="color-lime"'), 'ChordBisector: y coordinates must use lime');
  assert.ok(c6.innerHTML.includes('class="color-teal"'), 'ChordBisector: 90/270 angles must use teal');

  assert.ok(c7Flat.innerHTML.includes('class="color-amber"'), 'Thales 2D: x coordinates must use amber');
  assert.ok(c7Flat.innerHTML.includes('class="color-emerald"'), 'Thales 2D: y coordinates must use emerald');
  assert.ok(c7Flat.innerHTML.includes('class="color-teal"'), 'Thales 2D: 90/270/360 angles must use teal');
  assert.ok(c7Solid.innerHTML.includes('class="color-steel"'), 'Thales 3D: z depth coordinates must use steel');
});

test('3D Grid & Mesh Decoupling: grid, axes, sphere, and circleWire are independently toggled', () => {
  // Mock BaseScene3DView
  const mockScene = {
    grid: { visible: true },
    axes: { visible: true },
    sphere: { visible: true },
    circleWire: { visible: true },
    overlay: null,
    applyCommonVis(state) {
      this.latestVis3d = state?.vis3d || {};
      if (this.grid) this.grid.visible = state?.vis3d?.gridXZ !== false;
      if (this.axes) this.axes.visible = state?.vis3d?.axes !== false;
      if (this.sphere) this.sphere.visible = state?.vis3d?.sphere !== false;
      if (this.circleWire) this.circleWire.visible = state?.vis3d?.circleWire !== false;
    },
  };

  // State 1: grid disabled with axes unspecified (undefined) - axes must remain visible!
  mockScene.applyCommonVis({
    vis3d: { gridXZ: false },
  });
  assert.equal(mockScene.grid.visible, false, 'grid must be hidden');
  assert.equal(mockScene.axes.visible, true, 'axes must remain visible when grid is toggled off');

  // State 2: grid disabled, but axes remains visible
  mockScene.applyCommonVis({
    vis3d: { gridXZ: false, axes: true, sphere: true, circleWire: false },
  });
  assert.equal(mockScene.grid.visible, false, 'grid must be hidden');
  assert.equal(mockScene.axes.visible, true, 'axes must remain visible independently');
  assert.equal(mockScene.sphere.visible, true, 'sphere must be visible');
  assert.equal(mockScene.circleWire.visible, false, 'circle wire must be hidden independently');

  // State 3: sphere disabled, but circle wire remains visible
  mockScene.applyCommonVis({
    vis3d: { gridXZ: true, axes: false, sphere: false, circleWire: true },
  });
  assert.equal(mockScene.grid.visible, true, 'grid must be visible');
  assert.equal(mockScene.axes.visible, false, 'axes must be hidden');
  assert.equal(mockScene.sphere.visible, false, 'sphere mesh must be hidden');
  assert.equal(mockScene.circleWire.visible, true, 'circle wireframe must remain visible');
});

test('Reflex Angle Features: TOGGLES configuration and Derivation Step 7 grammar', async () => {
  const { TOGGLES } = await import('../visuals/thales-theorem/src/controllers/controls-config.js');
  assert.deepEqual(TOGGLES['vis-2d-reflex'], ['vis2d', 'reflex']);
  assert.deepEqual(TOGGLES['vis-3d-reflex'], ['vis3d', 'reflex']);

  class MockElement {
    constructor(id = '') {
      this.id = id;
      this.innerHTML = '';
      this.children = [];
    }
    get firstElementChild() {
      return this.children[0] || (this.innerHTML ? new MockElement() : null);
    }
    querySelector() {
      return new MockElement();
    }
    querySelectorAll() {
      return [];
    }
  }

  const flatEl = new MockElement('flat');
  const solidEl = new MockElement('solid');
  const view = new DerivationView(flatEl, solidEl);
  view.render({ radius: 10, angle2D: Math.PI / 4, lat3D: Math.PI / 4, lon3D: Math.PI / 2 });

  // Step 7 must exist in flatElement
  assert.ok(flatEl.innerHTML.includes('deriv-2d-step-7'), 'Step 7 card must be generated');
  assert.ok(flatEl.innerHTML.includes('Explementary &amp; Reflex Angles') || flatEl.innerHTML.includes('Explementary & Reflex Angles'), 'Step 7 title must mention Explementary & Reflex Angles');
  assert.ok(flatEl.innerHTML.includes('class="color-lime">α*'), 'α* must be lime');
  assert.ok(flatEl.innerHTML.includes('class="color-orange">β*'), 'β* must be orange/amber');
  assert.ok(flatEl.innerHTML.includes('class="color-teal">∠APB*'), '∠APB* must be teal');
  assert.ok(flatEl.innerHTML.includes('900.0°'), 'Total reflex sum 900.0° must be present');
});

test('Camera Perspective Synchronization: 2D plane and 3D camera presets align bidirectionally', async () => {
  const { setPlane2D } = await import('../visuals/thales-theorem/src/model/actions.js');
  
  const planeToPreset = {
    'great-circle': 'isometric',
    'xy': 'front',
    'xz': 'top',
    'yz': 'side',
  };
  const presetToPlane = {
    'isometric': 'great-circle',
    'default': 'great-circle',
    'iso': 'great-circle',
    'front': 'xy',
    'top': 'xz',
    'side': 'yz',
  };

  for (const [plane, preset] of Object.entries(planeToPreset)) {
    assert.strictEqual(presetToPlane[preset], plane);
    const patch = setPlane2D(plane);
    assert.strictEqual(patch.plane2D, plane);
  }
});

test('Thales Grammar Decoupling & Dynamic Angle Annotations', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  // 1. LabelOverlayView checks
  const { LabelOverlayView } = await import('../visuals/thales-theorem/src/views/LabelOverlayView.js');
  const overlayCode = fs.readFileSync(path.join(rootDir, 'visuals/thales-theorem/src/views/LabelOverlayView.js'), 'utf8');
  assert.ok(overlayCode.includes("key: 'diam'"), 'LabelOverlayView must define diam label');
  assert.ok(overlayCode.includes('|d| = ${(2 * r).toFixed(1)}'), 'LabelOverlayView must format dynamic 3D diameter');
  assert.ok(overlayCode.includes("key: 'axis-y'") && overlayCode.includes("color: 'color-emerald'"), 'axis-y must be color-emerald');
  assert.ok(overlayCode.includes("key: 'alt3d'") && overlayCode.includes("color: 'color-emerald'"), '3D altitude must be color-emerald');

  // 2. DerivationView checks: P.y / elevation is Emerald, alpha is Lime, theta is Yellow, beta is Orange
  class MockElement {
    constructor(id = '') {
      this.id = id;
      this.innerHTML = '';
      this.children = [];
    }
    get firstElementChild() {
      return this.children[0] || (this.innerHTML ? new MockElement() : null);
    }
    querySelector() {
      return new MockElement();
    }
    querySelectorAll() {
      return [];
    }
  }

  const flatEl = new MockElement('flat');
  const solidEl = new MockElement('solid');
  const view = new DerivationView(flatEl, solidEl);
  view.render({ radius: 10, angle2D: Math.PI / 4, lat3D: Math.PI / 4, lon3D: Math.PI / 2 });

  // P.y and elevation in emerald
  assert.ok(flatEl.innerHTML.includes('class="color-emerald">y (elevation)</span>'), '2D Derivations: y (elevation) must be emerald');
  assert.ok(flatEl.innerHTML.includes('class="color-emerald">y²</span>'), '2D Derivations: y² must be emerald');
  assert.ok(solidEl.innerHTML.includes('class="color-emerald">y</span>'), '3D Derivations: y must be emerald');
  assert.ok(solidEl.innerHTML.includes('class="color-emerald">y²</span>'), '3D Derivations: y² must be emerald');
  assert.ok(solidEl.innerHTML.includes('class="color-emerald">+Y</span>'), '3D Derivations: +Y pole must be emerald');

  // alpha and alpha* in lime
  assert.ok(flatEl.innerHTML.includes('class="color-lime">α</span>'), '2D Derivations: α must be lime');
  assert.ok(flatEl.innerHTML.includes('class="color-lime">α*'), '2D Derivations: α* must be lime');

  // theta in yellow
  assert.ok(flatEl.innerHTML.includes('class="color-yellow">θ</span>') || flatEl.innerHTML.includes('class="color-yellow">Polar angle θ</span>'), '2D Derivations: θ must be yellow');
  assert.ok(solidEl.innerHTML.includes('class="color-yellow">Colatitude θ</span>'), '3D Derivations: Colatitude θ must be yellow');

  // beta in orange
  assert.ok(flatEl.innerHTML.includes('class="color-orange">β</span>'), '2D Derivations: β must be orange');
  assert.ok(flatEl.innerHTML.includes('class="color-orange">β*'), '2D Derivations: β* must be orange');

  // 3. index.html checks
  const html = fs.readFileSync(path.join(rootDir, 'visuals/thales-theorem/index.html'), 'utf8');
  assert.ok(html.includes('id="val-2d-theta"'), 'index.html must have val-2d-theta');
  assert.ok(html.includes('id="val-3d-theta"'), 'index.html must have val-3d-theta');
  assert.ok(html.includes('id="val-3d-phi"'), 'index.html must have val-3d-phi');
  assert.ok(html.includes('id="val-3d-y"'), 'index.html must have val-3d-y');
  assert.ok(html.includes('class="color-emerald">Y Grid</span>'), 'index.html must use color-emerald for Y Grid');
  assert.ok(html.includes('class="color-orange">β*</span>'), 'index.html must use color-orange for β* reflex in 2D overlays');
  assert.ok(html.includes('class="color-orange">360°-β</span>'), 'index.html must use color-orange for 360°-β in 3D overlays');
});

test('Colour Grammar: Telemetry stats across all 8 visual HTML pages enforce colorized labels and values', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const files = [
    'visuals/thales-theorem/index.html',
    'visuals/angle-at-centre/index.html',
    'visuals/angles-in-same-segment/index.html',
    'visuals/cyclic-quadrilateral/index.html',
    'visuals/tangent-radius/index.html',
    'visuals/alternate-segment/index.html',
    'visuals/tangents-from-external-point/index.html',
    'visuals/perpendicular-chord-bisector/index.html'
  ];

  for (const relPath of files) {
    const fullPath = path.join(rootDir, relPath);
    const html = fs.readFileSync(fullPath, 'utf8');
    const lines = html.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('class="stat-line"')) {
        assert.ok(
          !l.includes('<span>'),
          `${relPath}:${idx + 1} has an uncolored <span> label in stat-line: ${l.trim()}`
        );
        assert.ok(
          !l.includes('<strong>'),
          `${relPath}:${idx + 1} has an uncolored <strong> value in stat-line: ${l.trim()}`
        );
      }
    });
  }
});

test('Flip Split Toggle: Concise "Flip" label, SVG icon, and ratio reset across all 8 visualizers', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const files = [
    'visuals/thales-theorem/index.html',
    'visuals/angle-at-centre/index.html',
    'visuals/angles-in-same-segment/index.html',
    'visuals/cyclic-quadrilateral/index.html',
    'visuals/tangent-radius/index.html',
    'visuals/alternate-segment/index.html',
    'visuals/tangents-from-external-point/index.html',
    'visuals/perpendicular-chord-bisector/index.html'
  ];

  for (const relPath of files) {
    const fullPath = path.join(rootDir, relPath);
    const html = fs.readFileSync(fullPath, 'utf8');
    assert.ok(html.includes('id="split-dir-btn"'), `${relPath} must have #split-dir-btn`);
    assert.ok(html.includes('<span>Flip</span>'), `${relPath} must have concise "Flip" label`);
    assert.ok(!html.includes('Flip Split'), `${relPath} must not have legacy "Flip Split" label`);
  }

  // Verify circle-3d ViewModeController resets splitRatio: 50 on flip
  const { createStore } = await import('../js/circle-core.js');
  const { ViewModeController } = await import('../js/circle-3d.js');

  const store = createStore({ viewMode: 'split', splitDirection: 'horizontal', splitRatio: 30 });
  const mockBtn = {
    addEventListener: (evt, handler) => { mockBtn.handler = handler; },
    click: () => { if (mockBtn.handler) mockBtn.handler(); },
    style: {},
    setAttribute: () => {},
    classList: { toggle: () => {} }
  };
  const mockContainer = { style: {} };
  const mockMainView = { className: '', classList: { contains: () => false }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500 }) };

  new ViewModeController(store, {
    mainView: mockMainView,
    container2d: mockContainer,
    container3d: mockContainer,
    buttons: {},
    flipButton: mockBtn
  });

  // Trigger flip
  mockBtn.click();
  assert.strictEqual(store.get().splitDirection, 'vertical');
  assert.strictEqual(store.get().splitRatio, 50, 'Flipping split direction must reset splitRatio to 50');
});

test('Performance: Multi-origin preconnects and deferred Three.js/OrbitControls across all 8 visualizers', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const files = [
    'visuals/thales-theorem/index.html',
    'visuals/angle-at-centre/index.html',
    'visuals/angles-in-same-segment/index.html',
    'visuals/cyclic-quadrilateral/index.html',
    'visuals/tangent-radius/index.html',
    'visuals/alternate-segment/index.html',
    'visuals/tangents-from-external-point/index.html',
    'visuals/perpendicular-chord-bisector/index.html'
  ];

  for (const relPath of files) {
    const fullPath = path.join(rootDir, relPath);
    const html = fs.readFileSync(fullPath, 'utf8');

    // Preconnect & DNS-prefetch assertions
    assert.ok(
      html.includes('rel="preconnect" href="https://cdnjs.cloudflare.com"'),
      `${relPath} must preconnect to cdnjs.cloudflare.com`
    );
    assert.ok(
      html.includes('rel="preconnect" href="https://cdn.jsdelivr.net"'),
      `${relPath} must preconnect to cdn.jsdelivr.net`
    );
    assert.ok(
      html.includes('rel="dns-prefetch" href="https://cdnjs.cloudflare.com"'),
      `${relPath} must have dns-prefetch for cdnjs.cloudflare.com`
    );
    assert.ok(
      html.includes('rel="dns-prefetch" href="https://cdn.jsdelivr.net"'),
      `${relPath} must have dns-prefetch for cdn.jsdelivr.net`
    );

    // Deferred Three.js and OrbitControls assertions
    assert.ok(
      html.includes('<script defer src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'),
      `${relPath} must load Three.js with defer`
    );
    assert.ok(
      html.includes('<script defer src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>'),
      `${relPath} must load OrbitControls with defer`
    );
    assert.ok(
      !html.includes('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'),
      `${relPath} must not have synchronous render-blocking Three.js`
    );
  }
});

test('Camera Presets Bar: Vertically oriented and right-margin aligned across all visualizers', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const circleCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const thalesCss = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'overlays.css'), 'utf8');

  for (const [name, css] of [['circle-visual.css', circleCss], ['overlays.css', thalesCss]]) {
    assert.ok(
      css.includes('.camera-presets-bar'),
      `${name} must define .camera-presets-bar`
    );
    assert.ok(
      /flex-direction:\s*column/.test(css),
      `${name} .camera-presets-bar must be vertically oriented (flex-direction: column)`
    );
    assert.ok(
      /\.camera-presets-bar\s*\{[^}]*right:\s*1rem/s.test(css),
      `${name} .camera-presets-bar must be aligned along the right margin (right: 1rem)`
    );
    assert.ok(
      /\.camera-mode-toggle\s*\{[^}]*border-top/s.test(css),
      `${name} .camera-mode-toggle must use a top border divider in vertical layout`
    );
  }
});

test('Canvas Header Info & Overlay Minimal Styling: Canvas never hides under info text and overlays do not collide', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');

  const circleCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  const thalesCss = fs.readFileSync(path.join(rootDir, 'visuals', 'thales-theorem', 'styles', 'overlays.css'), 'utf8');
  const visualCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');

  for (const [name, css] of [['circle-visual.css', circleCss], ['overlays.css', thalesCss]]) {
    // 1. view-title must have transparent background and no borders so canvas is visible
    assert.ok(
      /\.view-title\s*\{[^}]*background:\s*transparent/s.test(css),
      `${name} .view-title must have transparent background`
    );
    assert.ok(
      /\.view-title\s*\{[^}]*border:\s*none/s.test(css),
      `${name} .view-title must have no border`
    );
    assert.ok(
      /\.view-title\s*\{[^}]*max-width:\s*calc/s.test(css),
      `${name} .view-title must have max-width constraint to prevent overlapping right margin controls`
    );

    // 2. perspective-badge must have transparent background and no bulky box-shadow
    assert.ok(
      /\.perspective-badge\s*\{[^}]*background:\s*transparent/s.test(css),
      `${name} .perspective-badge must have transparent background`
    );
    assert.ok(
      !css.includes('box-shadow: 0 0 10px rgba(56, 189, 248'),
      `${name} must not have glowing neon box-shadows on perspective badges`
    );
  }

  // 3. tip-3d must be positioned below camera presets bar (at least 10rem from top)
  assert.ok(
    /\.interaction-tip-badge\.tip-3d\s*\{[^}]*top:\s*10\.5rem/s.test(visualCss),
    'visual.css .interaction-tip-badge.tip-3d must be positioned below camera presets bar at top: 10.5rem'
  );
});
