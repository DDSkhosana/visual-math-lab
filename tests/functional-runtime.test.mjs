import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Helper to mock minimal browser DOM environment for components that touch DOM
function setupMockDOM() {
  const elements = new Map();
  const getOrCreate = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
          _set: new Set(),
          add(c) { this._set.add(c); },
          remove(c) { this._set.delete(c); },
          toggle(c, v) { if (v ?? !this._set.has(c)) this._set.add(c); else this._set.delete(c); },
          contains(c) { return this._set.has(c); }
        },
        setAttribute() {},
        getAttribute() { return null; },
        appendChild(child) { return child; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        addEventListener() {},
        removeEventListener() {}
      });
    }
    return elements.get(id);
  };

  global.document = {
    getElementById: (id) => getOrCreate(id),
    querySelector: (sel) => getOrCreate(sel.replace(/^[#.\[\]="'-]+/g, '')),
    querySelectorAll: () => [],
    createElement: (tag) => getOrCreate(`mock-${tag}-${Math.random()}`),
    body: getOrCreate('body'),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { pathname: '/visuals/circle-theorems/thales-theorem/', hash: '' }
  };
}

test('Functional Verification: Circle Theorems Math Models & Reactive Invariants (All 8 Visuals)', async () => {
  setupMockDOM();
  const { createStore } = await import('../js/circle-core.js');

  // 1. Thales' Theorem
  const thalesDefaults = await import('../visuals/circle-theorems/thales-theorem/src/config/defaults.js');
  const thalesMath = await import('../visuals/circle-theorems/thales-theorem/src/model/thales-math.js');
  const thalesStore = createStore(thalesDefaults.createInitialState());
  let thalesStats = thalesMath.thalesStats2D(thalesStore.get().radius, thalesStore.get().angle2D, thalesStore.get());
  assert.ok(Math.abs((thalesStats.alphaDeg + thalesStats.betaDeg) - 90) < 1e-4, 'Thales ∠APB = α + β must be strictly 90° at initial state');
  assert.ok(Math.abs(thalesStats.sumSquares - thalesStats.diameterSquared) < 1e-4, 'Thales s² + t² must equal |d|²');

  // Sweep Thales point P across all 4 quadrants
  for (let deg = 10; deg <= 350; deg += 30) {
    thalesStore.set({ angle2D: (deg * Math.PI) / 180 });
    thalesStats = thalesMath.thalesStats2D(thalesStore.get().radius, thalesStore.get().angle2D, thalesStore.get());
    assert.ok(Math.abs((thalesStats.alphaDeg + thalesStats.betaDeg) - 90) < 1e-4, `Thales ∠APB must remain 90° at ${deg}°`);
    assert.ok(Math.abs(thalesStats.sumSquares - thalesStats.diameterSquared) < 1e-4, `Thales s² + t² must equal |d|² at ${deg}°`);
  }

  // 2. Angle at Centre
  const aacModel = await import('../visuals/circle-theorems/angle-at-centre/src/model.js');
  const aacStore = createStore(aacModel.createInitialState());
  let aacGeom = aacModel.computeGeometry(aacStore.get(), 800, 600);
  assert.ok(Math.abs(aacGeom.ratio - 2.0) < 1e-3, 'Angle at Centre 2:1 ratio must hold initially');

  // Mutate endpoints A, B and inscribed P
  aacStore.set({ angleA: 0.5, angleB: 2.2, angleP: 4.5 });
  aacGeom = aacModel.computeGeometry(aacStore.get(), 800, 600);
  assert.ok(Math.abs(aacGeom.ratio - 2.0) < 1e-3, 'Angle at Centre 2:1 ratio must hold after angle mutations');

  // 3. Angles in Same Segment
  const aissModel = await import('../visuals/circle-theorems/angles-in-same-segment/src/model.js');
  const aissStore = createStore(aissModel.createInitialState());
  let aissGeom = aissModel.computeGeometry(aissStore.get(), 800, 600);
  assert.ok(Math.abs(aissGeom.angleP1Deg - aissGeom.angleP2Deg) < 1e-4, 'Angles in Same Segment ∠AP₁B and ∠AP₂B must be equal initially');

  // Drag P1 and P2 independently along segment
  aissStore.set({ angleP1: 1.2, angleP2: 2.4 });
  aissGeom = aissModel.computeGeometry(aissStore.get(), 800, 600);
  assert.ok(Math.abs(aissGeom.angleP1Deg - aissGeom.angleP2Deg) < 1e-4, 'Angles in Same Segment ∠AP₁B and ∠AP₂B must remain equal after drag');

  // 4. Cyclic Quadrilateral
  const cycModel = await import('../visuals/circle-theorems/cyclic-quadrilateral/src/model.js');
  const cycStore = createStore(cycModel.createInitialState());
  let cycGeom = cycModel.computeGeometry(cycStore.get(), 800, 600);
  assert.ok(Math.abs(cycGeom.sumAC - 180) < 1e-4, 'Cyclic Quad opposite angles A + C must sum to 180°');
  assert.ok(Math.abs(cycGeom.sumBD - 180) < 1e-4, 'Cyclic Quad opposite angles B + D must sum to 180°');

  // 5. Tangent-Radius
  const trModel = await import('../visuals/circle-theorems/tangent-radius/src/model.js');
  const trStore = createStore(trModel.createInitialState());
  let trGeom = trModel.computeGeometry(trStore.get(), 800, 600);
  assert.ok(Math.abs(trGeom.dotProduct) < 1e-5, 'Tangent-Radius radial dot product must be 0 (perpendicular)');

  // 6. Alternate Segment
  const altModel = await import('../visuals/circle-theorems/alternate-segment/src/model.js');
  const altStore = createStore(altModel.createInitialState());
  let altGeom = altModel.computeGeometry(altStore.get(), 800, 600);
  assert.ok(Math.abs(altGeom.tangentChordDeg - altGeom.inscribedDeg) < 1e-4, 'Alternate Segment tangent-chord angle must equal inscribed angle');

  // 7. Tangents from External Point
  const tfpModel = await import('../visuals/circle-theorems/tangents-from-external-point/src/model.js');
  const tfpStore = createStore(tfpModel.createInitialState());
  let tfpGeom = tfpModel.computeGeometry(tfpStore.get(), 800, 600);
  assert.ok(Math.abs(tfpGeom.lenPT1 - tfpGeom.lenPT2) < 1e-4, 'Tangents from External Point |PT₁| must equal |PT₂|');

  // 8. Perpendicular Chord Bisector
  const pcbModel = await import('../visuals/circle-theorems/perpendicular-chord-bisector/src/model.js');
  const pcbStore = createStore(pcbModel.createInitialState());
  let pcbGeom = pcbModel.computeGeometry(pcbStore.get(), 800, 600);
  assert.ok(Math.abs(pcbGeom.lenAM - pcbGeom.lenMB) < 1e-4, 'Perpendicular Chord Bisector |AM| must equal |MB|');
  assert.ok(Math.abs(pcbGeom.dot) < 1e-5, 'Perpendicular Chord Bisector OM ⊥ AB dot product must be 0');
  assert.ok(Math.abs(pcbGeom.angleOMADeg - 90) < 1e-4, 'Perpendicular Chord Bisector ∠OMA must be 90°');
});

test('Functional Verification: Trigonometry Suite Math Models & Reactive Invariants (All 4 Visuals)', async () => {
  setupMockDOM();
  const trigMath = await import('../visuals/trigonometry/js/trig-math.js');

  // 1. Unit Circle & 3D Helix
  for (let theta = 0; theta < 6.28; theta += 0.5) {
    const res = trigMath.computeUnitCircleHelix(theta, 180, 1.2);
    assert.ok(Math.abs(res.invariants.pythagoreanPrimary - 1.0) < 1e-6, `Pythagorean sum sin²θ + cos²θ must be 1.000000 at θ=${theta}`);
    assert.ok(res.sec !== undefined && res.tan !== undefined, 'Trig ratios must compute');
    assert.ok(res.points3D.point3D.x !== undefined && res.points3D.point3D.y !== undefined && res.points3D.point3D.z !== undefined, '3D helix coordinate must compute');
  }

  // 2. Law of Sines
  const los = trigMath.computeLawOfSines(1.0, 1.2, 0.94, 180);
  assert.ok(Math.abs(los.ratios.ratioA - los.diameter2R) < 1e-3, 'a/sin A must equal 2R');
  assert.ok(Math.abs(los.ratios.ratioB - los.diameter2R) < 1e-3, 'b/sin B must equal 2R');
  assert.ok(Math.abs(los.ratios.ratioC - los.diameter2R) < 1e-3, 'c/sin C must equal 2R');
  assert.ok(los.invariants.isVerified, 'Law of Sines invariant must be verified');

  // Spherical Law of Sines on S²
  const sphLos = trigMath.computeSphericalLawOfSines({ angleA: 0.5, angleB: 2.2, angleC: 4.0 }, 10);
  assert.ok(sphLos.sphericalExcess.excessDeg > 0, 'Spherical excess E on S² must be strictly positive');
  assert.ok(sphLos.isSineLawVerified, 'Spherical sine law must be verified');
  assert.ok(Math.abs(sphLos.ratios.ratioSphA - sphLos.ratios.ratioSphB) < 1e-4, 'Spherical sine ratio sin(a/R)/sinA must equal sin(b/R)/sinB');

  // 3. Law of Cosines
  for (let cDeg = 15; cDeg < 170; cDeg += 25) {
    const loc = trigMath.computeLawOfCosines(7, 9, (cDeg * Math.PI) / 180);
    const expectedC2 = 7 * 7 + 9 * 9 - 2 * 7 * 9 * Math.cos((cDeg * Math.PI) / 180);
    assert.ok(Math.abs(loc.squares.c2 - expectedC2) < 1e-4, `Law of Cosines c² must equal a² + b² - 2ab cos C at C=${cDeg}°`);
    assert.ok(Math.abs(loc.mixedPartialCoeff - (-2 * Math.cos((cDeg * Math.PI) / 180))) < 1e-4, 'Mixed partial derivative must equal -2 cos C');
    assert.ok(loc.invariants.isVerified, 'Law of Cosines invariant must be verified');
  }

  // 4. Angle Sum Identities
  for (let a = 0.2; a < 2.5; a += 0.5) {
    for (let b = 0.2; b < 2.5; b += 0.5) {
      const asi = trigMath.computeAngleSumIdentities(a, b);
      const expectedCosSum = Math.cos(a + b);
      const expectedSinSum = Math.sin(a + b);
      assert.ok(Math.abs(asi.trig.cosSum - expectedCosSum) < 1e-6, 'cos(α+β) must match formula');
      assert.ok(Math.abs(asi.trig.sinSum - expectedSinSum) < 1e-6, 'sin(α+β) must match formula');
      assert.ok(asi.invariants.matrixCompositionVerified, 'Rotation matrix composition must be verified');
    }
  }

  // Spatial SO(3) Lie Group Euler Frame
  const so3 = trigMath.computeSpatialAngleSumEuler(0.8, 0.5, 0.4);
  assert.ok(Math.abs(so3.lieAlgebra.detR - 1.0) < 1e-4, 'SO(3) matrix determinant must be +1.000000');
  assert.ok(so3.lieAlgebra.isSO3, 'Lie group SO(3) condition must be verified');
});

test('Functional Verification: Derivations Panel Evaluates Real-Time State Without Errors (All 12 Visuals)', async () => {
  setupMockDOM();

  // 1. Thales' Theorem Derivations View
  const { DerivationView } = await import('../visuals/circle-theorems/thales-theorem/src/views/DerivationView.js');
  const flatEl = global.document.createElement('div');
  const solidEl = global.document.createElement('div');
  const dView = new DerivationView(flatEl, solidEl);
  assert.doesNotThrow(() => {
    dView.render({
      radius: 180,
      angle2D: 1.2,
      lat3D: Math.PI / 2,
      lon3D: 1.2,
      lengthUnit: 'px',
      angleUnit: 'deg',
      affineMode: false,
      affineStretch: 1.4,
      affineAxisAngle: 0
    });
  }, 'Thales DerivationView must render without error');

  // 2. Circle Theorems 7 Shared Derivations Classes
  const circleDerivs = await import('../js/circle-derivations.js');
  const aacDeriv = new circleDerivs.AngleAtCentreDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => aacDeriv.render({ radius: 180, angleP: 1.5, angleA: 0.4, angleB: 2.6 }), 'AngleAtCentreDerivations must render');

  const aissDeriv = new circleDerivs.AnglesInSameSegmentDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => aissDeriv.render({ radius: 180, angleP1: 1.2, angleP2: 2.1, angleA: 0.2, angleB: 2.8 }), 'AnglesInSameSegmentDerivations must render');

  const cycDeriv = new circleDerivs.CyclicQuadDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => cycDeriv.render({ radius: 180, angleA: 0.5, angleB: 1.8, angleC: 3.4, angleD: 5.1 }), 'CyclicQuadDerivations must render');

  const trDeriv = new circleDerivs.TangentRadiusDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => trDeriv.render({ radius: 180, angleT: 1.0, tangentCount: 1 }), 'TangentRadiusDerivations must render');

  const altDeriv = new circleDerivs.AlternateSegmentDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => altDeriv.render({ radius: 180, angleT: 1.0, angleA: 2.2, angleB: 4.5, angleD: 5.0, showDAngles: true }), 'AlternateSegmentDerivations must render');

  const tfpDeriv = new circleDerivs.TangentsFromPointDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => tfpDeriv.render({ radius: 180, distanceP: 320, angleP: 0.8 }), 'TangentsFromPointDerivations must render');

  const pcbDeriv = new circleDerivs.ChordBisectorDerivations(global.document.createElement('div'));
  assert.doesNotThrow(() => pcbDeriv.render({ radius: 180, angleA: 0.8, angleB: 2.4, showProofTriangles: true }), 'ChordBisectorDerivations must render');

  // 3. Trigonometry Suite Derivations View
  const trigCore = await import('../visuals/trigonometry/js/trig-core.js');
  const trigVisuals = ['unit-circle-helix', 'law-of-sines', 'law-of-cosines', 'angle-sum-identities'];

  for (const vid of trigVisuals) {
    const container = global.document.createElement('div');
    const tDeriv = new trigCore.TrigDerivationsView(container, vid);
    assert.doesNotThrow(() => {
      tDeriv.render({
        angleTheta: 1.0,
        angleAlpha: 0.8,
        angleBeta: 0.5,
        sideA: 7,
        sideB: 9,
        angleC: 1.05,
        radius: 180,
        dimensionMode: 'planar',
        angleUnit: 'deg',
        lengthUnit: 'px'
      });
    }, `${vid} planar derivations must render`);

    // Dual-mode spatial test
    assert.doesNotThrow(() => {
      tDeriv.render({
        angleTheta: 1.0,
        angleAlpha: 0.8,
        angleBeta: 0.5,
        sideA: 7,
        sideB: 9,
        angleC: 1.05,
        radius: 180,
        dimensionMode: 'spatial',
        angleUnit: 'deg',
        lengthUnit: 'px'
      });
    }, `${vid} spatial derivations must render`);
  }
});
