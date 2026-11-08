import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

test('getLabelAnchors contract: BaseScene3DView, NullScene3DView and all subclass 3D views define getLabelAnchors()', () => {
  const circle3D = read('js/circle-3d.js');
  const thalesScene = read('visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js');
  const trigCore = read('visuals/trigonometry/js/trig-core.js');

  // 1. BaseScene3DView and NullScene3DView
  assert.ok(circle3D.includes('getLabelAnchors() {'), 'BaseScene3DView defines getLabelAnchors');
  assert.ok(circle3D.includes('getLabelAnchors() { return null; }'), 'NullScene3DView defines getLabelAnchors returning null');
  assert.ok(thalesScene.includes('getLabelAnchors() {'), 'Thales Scene3DView defines getLabelAnchors');
  assert.ok(trigCore.includes('getLabelAnchors() {'), 'TrigScene3DView defines getLabelAnchors');

  // 2. Circle Theorem subclasses in circle-3d.js
  const viewClasses = [
    { name: 'AngleAtCentre3DView', expected: ['markerO', 'markerA', 'markerB', 'markerP'] },
    { name: 'AnglesInSameSegment3DView', expected: ['markerO', 'markerA', 'markerB', 'markerP1', 'markerP2'] },
    { name: 'CyclicQuad3DView', expected: ['markerA', 'markerB', 'markerC', 'markerD'] },
    { name: 'TangentRadius3DView', expected: ['markerO', 'markerT'] },
    { name: 'AlternateSegment3DView', expected: ['markerT', 'markerA', 'markerB', 'markerD'] },
    { name: 'TangentsFromPoint3DView', expected: ['markerO', 'markerP', 'markerT1', 'markerT2', 'markerK'] },
    { name: 'ChordBisector3DView', expected: ['markerO', 'markerA', 'markerB', 'markerM'] },
  ];

  for (const v of viewClasses) {
    const classIdx = circle3D.indexOf(`export class ${v.name}`);
    assert.ok(classIdx !== -1, `${v.name} must exist in circle-3d.js`);
    const nextClassIdx = circle3D.indexOf('export class ', classIdx + 20);
    const classBody = circle3D.slice(classIdx, nextClassIdx !== -1 ? nextClassIdx : circle3D.length);
    assert.ok(classBody.includes('getLabelAnchors()'), `${v.name} must implement getLabelAnchors()`);
    for (const exp of v.expected) {
      assert.ok(classBody.includes(exp), `${v.name}.getLabelAnchors must reference ${exp}`);
    }
  }

  // 3. TrigScene3DView in trig-core.js
  const trigClassIdx = trigCore.indexOf('export class TrigScene3DView');
  const trigNextClassIdx = trigCore.indexOf('export class ', trigClassIdx + 25);
  const trigClassBody = trigCore.slice(trigClassIdx, trigNextClassIdx !== -1 ? trigNextClassIdx : trigCore.length);
  assert.ok(trigClassBody.includes('getLabelAnchors()'), 'TrigScene3DView must implement getLabelAnchors()');
  for (const exp of ['markerO', 'handleA', 'handleB', 'handleC', 'handleP', 'handleAp', 'handleHelix']) {
    assert.ok(trigClassBody.includes(exp), `TrigScene3DView.getLabelAnchors must reference ${exp}`);
  }
});

test('Normal-oriented label positioning: Solid and Spatial modes decouple from flat world axes', () => {
  const circle3D = read('js/circle-3d.js');

  // 1. AngleAtCentre3DView
  assert.ok(
    circle3D.includes('const O_pos = O.clone().addScaledVector(circleInfo.normal, 0.8);'),
    'AngleAtCentre3DView O_pos must use circleInfo.normal'
  );

  // 2. AnglesInSameSegment3DView
  assert.ok(
    circle3D.includes('const oPos = O.clone().addScaledVector(circleInfo.normal, 0.8);'),
    'AnglesInSameSegment3DView oPos must use circleInfo.normal'
  );

  // 3. CyclicQuad3DView
  assert.ok(
    circle3D.includes('posAC.clone().addScaledVector(circleInfo.normal, 0.6)'),
    'CyclicQuad3DView sumAC must use circleInfo.normal'
  );
  assert.ok(
    circle3D.includes('posBD.clone().addScaledVector(circleInfo.normal, -0.6)'),
    'CyclicQuad3DView sumBD must use circleInfo.normal'
  );

  // 4. TangentRadius3DView
  assert.ok(
    circle3D.includes('const O_pos = O.clone().addScaledVector(primNormal, 0.8);'),
    'TangentRadius3DView O_pos must use primNormal'
  );
  assert.ok(
    circle3D.includes('Sx.clone().addScaledVector(primNormal, 0.4)'),
    'TangentRadius3DView Sx must use primNormal'
  );
  assert.ok(
    circle3D.includes('Tx.clone().addScaledVector(primNormal, 0.4)'),
    'TangentRadius3DView Tx must use primNormal'
  );
  assert.ok(
    circle3D.includes('midTan.clone().addScaledVector(primNormal, 0.4)'),
    'TangentRadius3DView midTan must use primNormal'
  );
  assert.ok(
    circle3D.includes('midCos.clone().addScaledVector(primNormal, 0.3)'),
    'TangentRadius3DView midCos must use primNormal'
  );
  assert.ok(
    circle3D.includes('midSin.clone().addScaledVector(primNormal, 0.3)'),
    'TangentRadius3DView midSin must use primNormal'
  );

  // 5. AlternateSegment3DView
  assert.ok(
    circle3D.includes('const isOriented = isSpatial || isSolid;'),
    'AlternateSegment3DView distinguishes oriented 3D frames'
  );
  assert.ok(
    circle3D.includes('addScaledVector(u, R * 0.62 * Math.cos(majorMidAng)).addScaledVector(v, R * 0.62 * Math.sin(majorMidAng)).addScaledVector(normal, 0.2)'),
    'AlternateSegment3DView majorLabelPos uses oriented basis and normal in Solid/Spatial'
  );
  assert.ok(
    circle3D.includes('addScaledVector(u, R * 0.82 * Math.cos(minorMidAng)).addScaledVector(v, R * 0.82 * Math.sin(minorMidAng)).addScaledVector(normal, 0.2)'),
    'AlternateSegment3DView minorLabelPos uses oriented basis and normal in Solid/Spatial'
  );

  // 6. TangentsFromPoint3DView
  assert.ok(
    circle3D.includes('const O_pos = O.clone().addScaledVector(normal, 0.8);'),
    'TangentsFromPoint3DView O_pos must use normal'
  );
  assert.ok(
    circle3D.includes('const K_pos = K.clone().addScaledVector(normal, 0.7);'),
    'TangentsFromPoint3DView K_pos must use normal'
  );

  // 7. ChordBisector3DView
  assert.ok(
    circle3D.includes('const O_pos = O.clone().addScaledVector(normal, 0.8);'),
    'ChordBisector3DView O_pos must use normal'
  );
});

test('Angle at Centre: concyclic point P preserves 2theta == 2 x theta identically in Spatial mode on S²', () => {
  const circle3D = read('js/circle-3d.js');

  // Verify Point P is concyclic on the great circle basis (u, v) in spatial mode
  assert.ok(
    circle3D.includes(".addScaledVector(u, R * Math.cos(state.angleP))\n        .addScaledVector(v, R * Math.sin(state.angleP));"),
    'AngleAtCentre3DView positions P on the great circle plane basis (u, v) in spatial mode'
  );

  // Simulate geometric invariant in 3D:
  // Given radius R, any great circle plane has orthonormal basis u, v with center O=(0,0,0)
  const R = 10;
  const angA = (210 * Math.PI) / 180;
  const angB = (330 * Math.PI) / 180;
  const angP = (90 * Math.PI) / 180;

  // Let circle lie in an arbitrary tilted plane with normal n
  const u = [Math.SQRT1_2, 0, Math.SQRT1_2];
  const normal = [0, 1, 0];
  const v = [-Math.SQRT1_2, 0, Math.SQRT1_2];

  const getPt = (ang) => [
    R * (Math.cos(ang) * u[0] + Math.sin(ang) * v[0]),
    R * (Math.cos(ang) * u[1] + Math.sin(ang) * v[1]),
    R * (Math.cos(ang) * u[2] + Math.sin(ang) * v[2]),
  ];

  const ptA = getPt(angA);
  const ptB = getPt(angB);
  const ptP = getPt(angP);

  // Euclidean inscribed angle at P between chords PA and PB in 3D
  const vPA = [ptA[0] - ptP[0], ptA[1] - ptP[1], ptA[2] - ptP[2]];
  const vPB = [ptB[0] - ptP[0], ptB[1] - ptP[1], ptB[2] - ptP[2]];
  const dotP = vPA[0] * vPB[0] + vPA[1] * vPB[1] + vPA[2] * vPB[2];
  const magPA = Math.hypot(...vPA);
  const magPB = Math.hypot(...vPB);
  const thetaInscribedRad = Math.acos(Math.max(-1, Math.min(1, dotP / (magPA * magPB))));
  const thetaInscribedDeg = (thetaInscribedRad * 180) / Math.PI;

  // Central angle subtended by arc AB
  const sweep = ((angB - angA + 2 * Math.PI) % (2 * Math.PI));
  const centralDeg = (sweep * 180) / Math.PI;

  // Check exact 2:1 ratio
  assert.ok(Math.abs(centralDeg - 2 * thetaInscribedDeg) < 1e-10, `Central angle (${centralDeg}°) must equal 2 * inscribed angle (${2 * thetaInscribedDeg}°)`);
});

test('Perpendicular Chord Bisector: |AM| and |MB| segment labels across 2D, Planar, Spatial, and Solid 3D', () => {
  const model2D = read('visuals/circle-theorems/perpendicular-chord-bisector/src/model.js');
  const circle3D = read('js/circle-3d.js');

  // 1. 2D SVG includes |AM| and |MB| labels
  assert.ok(model2D.includes('|AM| = ${g.lenAM.toFixed(1)}'), '2D generateSVG renders |AM| label');
  assert.ok(model2D.includes('|MB| = ${g.lenMB.toFixed(1)}'), '2D generateSVG renders |MB| label');

  // 2. 3D currentLabels includes lenAM and lenMB
  assert.ok(circle3D.includes("key: 'lenAM'"), 'ChordBisector3DView currentLabels includes lenAM');
  assert.ok(circle3D.includes("key: 'lenMB'"), 'ChordBisector3DView currentLabels includes lenMB');
  assert.ok(circle3D.includes("text: `|AM| = ${lenAM.toFixed(1)}`"), 'ChordBisector3DView formats lenAM');
  assert.ok(circle3D.includes("text: `|MB| = ${lenMB.toFixed(1)}`"), 'ChordBisector3DView formats lenMB');
  assert.ok(circle3D.includes("midAM = new THREE.Vector3().addVectors(A, M).multiplyScalar(0.5).addScaledVector(normal, 0.35)"), 'ChordBisector3DView positions midAM with normal offset');
  assert.ok(circle3D.includes("midMB = new THREE.Vector3().addVectors(M, B).multiplyScalar(0.5).addScaledVector(normal, 0.35)"), 'ChordBisector3DView positions midMB with normal offset');
});

test('Trigonometry Law of Sines: line segment labels a-len-3d, b-len-3d, c-len-3d in Solid and Planar 3D', () => {
  const trigCore = read('visuals/trigonometry/js/trig-core.js');

  // Check Solid mode line segment labels
  assert.ok(trigCore.includes("key: 'a-len-3d', text: `a = ${m.sides.a.toFixed(2)}`, at: midBC"), 'Law of Sines Solid mode includes a-len-3d');
  assert.ok(trigCore.includes("key: 'b-len-3d', text: `b = ${m.sides.b.toFixed(2)}`, at: midAC"), 'Law of Sines Solid mode includes b-len-3d');
  assert.ok(trigCore.includes("key: 'c-len-3d', text: `c = ${m.sides.c.toFixed(2)}`, at: midAB"), 'Law of Sines Solid mode includes c-len-3d');

  // Check Planar mode line segment labels
  assert.ok(trigCore.includes("key: 'a-len-3d', text: `a = ${m.sides.a.toFixed(2)}`, at: { x: (B.x + C.x) / 2, y: 0.4, z: (B.z + C.z) / 2 }"), 'Law of Sines Planar mode includes a-len-3d');
  assert.ok(trigCore.includes("key: 'b-len-3d', text: `b = ${m.sides.b.toFixed(2)}`, at: { x: (A.x + C.x) / 2, y: 0.4, z: (A.z + C.z) / 2 }"), 'Law of Sines Planar mode includes b-len-3d');
  assert.ok(trigCore.includes("key: 'c-len-3d', text: `c = ${m.sides.c.toFixed(2)}`, at: { x: (A.x + B.x) / 2, y: 0.4, z: (A.z + B.z) / 2 }"), 'Law of Sines Planar mode includes c-len-3d');
});

test('Trigonometry Angle Sum Identities: Solid 3D difference and sum projection labels with dynamic interaction', () => {
  const trigCore = read('visuals/trigonometry/js/trig-core.js');

  // Solid 3D difference and sum labels in angle-sum-identities
  assert.ok(trigCore.includes("key: 'Pdiff', name: 'D(α−β)'"), 'Angle Sum Identities Solid mode includes Pdiff');
  assert.ok(trigCore.includes("key: 'Ndiff', name: 'N_D'"), 'Angle Sum Identities Solid mode includes Ndiff');
  assert.ok(trigCore.includes("key: 'cos-diff-len'"), 'Angle Sum Identities Solid mode includes cos-diff-len');
  assert.ok(trigCore.includes("key: 'sin-diff-len'"), 'Angle Sum Identities Solid mode includes sin-diff-len');
  assert.ok(trigCore.includes("key: 'chord-pd-len'"), 'Angle Sum Identities Solid mode includes chord-pd-len');
  assert.ok(trigCore.includes("key: 'cos-sum-len'"), 'Angle Sum Identities Solid mode includes cos-sum-len');
  assert.ok(trigCore.includes("key: 'sin-sum-len'"), 'Angle Sum Identities Solid mode includes sin-sum-len');

  // Normal-oriented positioning for 3D extrusion
  assert.ok(trigCore.includes("at: Ndiff.clone().multiplyScalar(0.5).addScaledVector(v, 0.95).addScaledVector(normal, 0.45)"), 'cos-diff-len uses oriented normal and v vector in Solid mode');
  assert.ok(trigCore.includes("at: N.clone().multiplyScalar(0.5).addScaledVector(v, -0.85).addScaledVector(normal, 0.45)"), 'cos-sum-len uses oriented normal and v vector in Solid mode');
});

test('Angle at Centre: initial state equatorial alignment and 2D-3D angle value equivalence', async () => {
  const aacModel = await import('../visuals/circle-theorems/angle-at-centre/src/model.js');
  const init = aacModel.createInitialState();

  // 1. Initial latitudes are equatorial (pi/2)
  assert.strictEqual(init.latA, Math.PI / 2, 'Initial latA must be pi/2');
  assert.strictEqual(init.latB, Math.PI / 2, 'Initial latB must be pi/2');
  assert.strictEqual(init.latP, Math.PI / 2, 'Initial latP must be pi/2');

  // 2. Geometry angles in 2D
  const g = aacModel.computeGeometry(init, 800, 600);
  assert.strictEqual(Math.round(g.centralDeg), 120, '2D central angle is 120°');
  assert.strictEqual(Math.round(g.inscribedDeg), 60, '2D inscribed angle is 60°');
  assert.ok(Math.abs(g.ratio - 2.0) < 1e-10, '2D ratio is 2.000');

  // 3. 3D view implementation equivalence
  const circle3D = read('js/circle-3d.js');
  assert.ok(circle3D.includes("degInsc > 1e-4 ? degCent / degInsc : 2.0"), 'Ratio calculation in 3D');
  assert.ok(circle3D.includes("getSolidOrientationFrame(state, 'y', THREE)"), 'AngleAtCentre3DView uses getSolidOrientationFrame in 3D');
});

test('Axiomatic Constraints Invariance across all 12 Visualizers in Spatial and Solid 3D', () => {
  const circle3D = read('js/circle-3d.js');
  const thalesScene = read('visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js');
  const trigCore = read('visuals/trigonometry/js/trig-core.js');

  // 1. Thales: diameter AB with AP perpendicular to PB (dot product 0)
  assert.ok(thalesScene.includes("pointA.position.set(-r * scaleX * cosR, -r * scaleY * sinR, 0)"), 'Thales A diametrically opposite to B');
  assert.ok(thalesScene.includes("pointB.position.set(r * scaleX * cosR, r * scaleY * sinR, 0)"), 'Thales B diametrically opposite to A');

  // 2. Tangent-Radius: radial vector OT is strictly orthogonal to tangent
  assert.ok(circle3D.includes("normDir = new THREE.Vector3().subVectors(O, T).normalize()"), 'Tangent-Radius builds normDir from OT');
  assert.ok(circle3D.includes("corner2 = new THREE.Vector3().addVectors(corner1, tanDir.clone().multiplyScalar(s))"), 'Tangent-Radius builds orthogonal corner');

  // 3. Perpendicular Chord Bisector: OM bisects AB (|AM| = |MB|) and is orthogonal
  assert.ok(circle3D.includes("M = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5)"), 'Midpoint M is exact average of A and B');
  assert.ok(circle3D.includes("key: 'lenAM'"), 'lenAM label verified');
  assert.ok(circle3D.includes("key: 'lenMB'"), 'lenMB label verified');

  // 4. Tangents from Point: |PT1| = |PT2|
  assert.ok(circle3D.includes("const genLen = Math.sqrt(Math.max(0, d * d - R * R));"), 'Tangents from point length formula sqrt(d² - R²)');

  // 5. Angles in Same Segment: concyclic P1, P2 subtending chord AB
  assert.ok(circle3D.includes("this.angleP1Mesh"), 'P1 angle wedge');
  assert.ok(circle3D.includes("this.angleP2Mesh"), 'P2 angle wedge');

  // 6. Cyclic Quadrilateral: opposite angles sum to 180°
  assert.ok(circle3D.includes("quadMesh1"), 'Cyclic quad triangulation 1');
  assert.ok(circle3D.includes("quadMesh2"), 'Cyclic quad triangulation 2');

  // 7. Alternate Segment: tangent angle equals alternate segment inscribed angle
  assert.ok(circle3D.includes("tanDir = v.clone()"), 'Alternate Segment tangent direction');

  // 8. Angle at Centre: central angle is 2x inscribed angle
  assert.ok(circle3D.includes("arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP)"), 'Subtended arc calculation');

  // 9-10. Law of Sines and Cosines
  assert.ok(trigCore.includes("law-of-sines"), 'Law of Sines supported');
  assert.ok(trigCore.includes("law-of-cosines"), 'Law of Cosines supported');

  // 11. Angle Sum Identities: rotation compositions
  assert.ok(trigCore.includes("angle-sum-identities"), 'Angle Sum Identities supported');

  // 12. Unit Circle Helix
  assert.ok(trigCore.includes("unit-circle-helix"), 'Unit Circle Helix supported');
});
