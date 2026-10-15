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

