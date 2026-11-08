import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  SetMath,
  FunctionMath,
  RelationMath,
  PermutationMath,
  CategoryMath
} from '../visuals/foundations/js/foundations-core.js';

describe('Foundations Suite — SetMath Axiomatic Primitives', () => {
  test('Kuratowski pair encoding preserves order', () => {
    const pair1 = SetMath.kuratowskiPair(1, 2);
    assert.deepEqual(pair1, [[1], [1, 2]]);

    const pair2 = SetMath.kuratowskiPair(2, 1);
    assert.deepEqual(pair2, [[2], [2, 1]]);
    assert.notDeepEqual(pair1, pair2);
  });

  test('Cartesian product A x B yields exact pairwise combinations', () => {
    const A = ['a', 'b'];
    const B = [1, 2, 3];
    const product = SetMath.cartesianProduct(A, B);
    assert.equal(product.length, 6);
    assert.deepEqual(product[0], ['a', 1]);
    assert.deepEqual(product[5], ['b', 3]);
  });

  test('Power set P(S) has cardinality 2^|S|', () => {
    const S = [1, 2, 3];
    const pSet = SetMath.powerSet(S);
    assert.equal(pSet.length, 8);
    assert.ok(pSet.some(sub => sub.length === 0));
    assert.ok(pSet.some(sub => sub.length === 3));
  });
});

describe('Foundations Suite — FunctionMath Axioms & Inverses (Module 1)', () => {
  test('Detects violations of totality (partial function)', () => {
    const X = [1, 2, 3];
    const Y = ['a', 'b', 'c'];
    // Missing input 3
    const pairs = [[1, 'a'], [2, 'b']];
    const res = FunctionMath.analyzeRelationAsFunction(X, Y, pairs);
    assert.equal(res.isFunction, false);
    assert.equal(res.isTotal, false);
    assert.deepEqual(res.missingInputs, [3]);
  });

  test('Detects violations of uniqueness (multivalued relation)', () => {
    const X = [1, 2];
    const Y = ['a', 'b', 'c'];
    // Input 1 has two outputs: 'a' and 'b'
    const pairs = [[1, 'a'], [1, 'b'], [2, 'c']];
    const res = FunctionMath.analyzeRelationAsFunction(X, Y, pairs);
    assert.equal(res.isFunction, false);
    assert.equal(res.isUnique, false);
    assert.equal(res.multiValuedInputs.length, 1);
    assert.equal(res.multiValuedInputs[0].x, 1);
  });

  test('Identifies non-injective functions (collisions)', () => {
    const X = [1, 2, 3];
    const Y = ['a', 'b'];
    // Both 1 and 2 map to 'a'
    const pairs = [[1, 'a'], [2, 'a'], [3, 'b']];
    const res = FunctionMath.analyzeRelationAsFunction(X, Y, pairs);
    assert.equal(res.isFunction, true);
    assert.equal(res.isInjective, false);
    assert.equal(res.isSurjective, true);
    assert.equal(res.isBijective, false);
    assert.equal(res.collisionOutputs[0].y, 'a');
  });

  test('Identifies non-surjective functions (unhit elements)', () => {
    const X = [1, 2];
    const Y = ['a', 'b', 'c'];
    const pairs = [[1, 'a'], [2, 'b']];
    const res = FunctionMath.analyzeRelationAsFunction(X, Y, pairs);
    assert.equal(res.isFunction, true);
    assert.equal(res.isInjective, true);
    assert.equal(res.isSurjective, false);
    assert.equal(res.isBijective, false);
    assert.deepEqual(res.unhitOutputs, ['c']);
  });

  test('Verifies bijection, computes inverse, and satisfies round-trip identity laws', () => {
    const X = [1, 2, 3];
    const Y = ['x', 'y', 'z'];
    const pairs = [[1, 'y'], [2, 'z'], [3, 'x']];

    const analysis = FunctionMath.analyzeRelationAsFunction(X, Y, pairs);
    assert.equal(analysis.isFunction, true);
    assert.equal(analysis.isInjective, true);
    assert.equal(analysis.isSurjective, true);
    assert.equal(analysis.isBijective, true);

    const inverse = FunctionMath.computeInverse(X, Y, pairs);
    assert.deepEqual(inverse, [['y', 1], ['z', 2], ['x', 3]]);

    const roundTrip = FunctionMath.verifyRoundTripIdentity(X, Y, pairs);
    assert.equal(roundTrip.valid, true);
    assert.equal(roundTrip.leftIdentity, true);
    assert.equal(roundTrip.rightIdentity, true);
  });

  test('Continuous models satisfy forward and inverse evaluation', () => {
    const { linear, exponential, cubic, quadratic } = FunctionMath.continuousPresets;

    // Linear f(3) = 7, f^{-1}(7) = 3
    assert.equal(linear.forward(3), 7);
    assert.equal(linear.inverse(7), 3);

    // Exponential f(0) = 1, f^{-1}(1) = 0
    assert.equal(exponential.forward(0), 1);
    assert.equal(exponential.inverse(1), 0);

    // Cubic f(-2) = -8, f^{-1}(-8) = -2
    assert.equal(cubic.forward(-2), -8);
    assert.equal(cubic.inverse(-8), -2);

    // Quadratic on restricted domain [0, inf)
    assert.equal(quadratic.forward(4), 16);
    assert.equal(quadratic.inverse(16), 4);
  });
});

describe('Foundations Suite — RelationMath Axiomatic Properties (Module 2)', () => {
  test('Correctly identifies an Equivalence Relation and computes partition classes', () => {
    const S = [1, 2, 3, 4];
    // Equivalence relation with classes {1, 2} and {3, 4}
    const pairs = [
      [1, 1], [2, 2], [3, 3], [4, 4], // reflexive
      [1, 2], [2, 1],                // symmetric
      [3, 4], [4, 3]                 // symmetric
    ];

    const analysis = RelationMath.analyzeRelation(S, pairs);
    assert.equal(analysis.isReflexive, true);
    assert.equal(analysis.isSymmetric, true);
    assert.equal(analysis.isAntisymmetric, false);
    assert.equal(analysis.isTransitive, true);
    assert.equal(analysis.isEquivalence, true);
    assert.equal(analysis.isPartialOrder, false);

    const classes = RelationMath.computeEquivalenceClasses(S, pairs);
    assert.equal(classes.length, 2);
    assert.deepEqual(classes[0], [1, 2]);
    assert.deepEqual(classes[1], [3, 4]);
  });

  test('Correctly identifies a Partial Order (Poset)', () => {
    const S = [1, 2, 3];
    // Less than or equal to: 1 <= 1, 2 <= 2, 3 <= 3, 1 <= 2, 2 <= 3, 1 <= 3
    const pairs = [
      [1, 1], [2, 2], [3, 3],
      [1, 2], [2, 3], [1, 3]
    ];

    const analysis = RelationMath.analyzeRelation(S, pairs);
    assert.equal(analysis.isReflexive, true);
    assert.equal(analysis.isSymmetric, false);
    assert.equal(analysis.isAntisymmetric, true);
    assert.equal(analysis.isTransitive, true);
    assert.equal(analysis.isPartialOrder, true);
    assert.equal(analysis.isTotalOrder, true);
  });

  test('Modular arithmetic congruence Z/nZ partitioning', () => {
    const integers = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    const classes = RelationMath.computeModuloClasses(integers, 3);
    assert.equal(classes.length, 3);
    // Class 0: multiples of 3
    assert.deepEqual(classes[0], [-3, 0, 3, 6]);
    // Class 1: 3k + 1
    assert.deepEqual(classes[1], [-2, 1, 4]);
    // Class 2: 3k + 2
    assert.deepEqual(classes[2], [-1, 2, 5]);
  });
});

describe('Foundations Suite — PermutationMath & Symmetric Groups S_n (Module 3)', () => {
  test('Converts Cauchy two-row notation to disjoint cycle notation', () => {
    // 3-cycle: 1->2, 2->3, 3->1
    const p1 = [2, 3, 1];
    const cycles1 = PermutationMath.toCycleNotation(p1);
    assert.deepEqual(cycles1, [[1, 2, 3]]);
    assert.equal(PermutationMath.formatCycles(cycles1), '(1 2 3)');

    // Multiple disjoint cycles: 1->3, 2->1, 3->2, 4->5, 5->4
    const p2 = [3, 1, 2, 5, 4];
    const cycles2 = PermutationMath.toCycleNotation(p2);
    assert.deepEqual(cycles2, [[1, 3, 2], [4, 5]]);
    assert.equal(PermutationMath.formatCycles(cycles2), '(1 3 2)(4 5)');
  });

  test('Composes permutations and respects non-commutativity in S_3', () => {
    // tau1 = (1 2), tau2 = (2 3)
    const tau1 = [2, 1, 3]; // (1 2)
    const tau2 = [1, 3, 2]; // (2 3)

    // (tau1 ∘ tau2)(x) = tau1(tau2(x))
    const comp1 = PermutationMath.composePermutations(tau2, tau1);
    // (tau2 ∘ tau1)(x) = tau2(tau1(x))
    const comp2 = PermutationMath.composePermutations(tau1, tau2);

    assert.notDeepEqual(comp1, comp2); // Non-abelian!
    assert.deepEqual(PermutationMath.toCycleNotation(comp1), [[1, 2, 3]]);
    assert.deepEqual(PermutationMath.toCycleNotation(comp2), [[1, 3, 2]]);
  });

  test('Computes order via lcm of disjoint cycle lengths', () => {
    // (1 2 3)(4 5) -> order lcm(3, 2) = 6
    const cycles = [[1, 2, 3], [4, 5]];
    assert.equal(PermutationMath.computeOrder(cycles), 6);

    // Single 3-cycle -> order 3
    assert.equal(PermutationMath.computeOrder([[1, 2, 3]]), 3);
  });

  test('Computes parity and sign from inversions', () => {
    // 3-cycle (1 2 3) = [2, 3, 1] has 2 inversions (2>1, 3>1) -> Even -> sign +1
    const res1 = PermutationMath.computeParityAndSign([2, 3, 1]);
    assert.equal(res1.inversions, 2);
    assert.equal(res1.isEven, true);
    assert.equal(res1.sign, 1);

    // Single swap (1 2) = [2, 1, 3] has 1 inversion -> Odd -> sign -1
    const res2 = PermutationMath.computeParityAndSign([2, 1, 3]);
    assert.equal(res2.inversions, 1);
    assert.equal(res2.isOdd, true);
    assert.equal(res2.sign, -1);
  });

  test('Decomposes cycle into transpositions', () => {
    // (1 2 3) decomposes into (1 3) ∘ (1 2)
    const transpositions = PermutationMath.decomposeIntoTranspositions([1, 2, 3]);
    assert.deepEqual(transpositions, [[1, 3], [1, 2]]);
  });
});

describe('Foundations Suite — CategoryMath & Universal Properties (Module 4)', () => {
  test('Identifies categorical monomorphisms (injective left-cancellation)', () => {
    const X = [1, 2, 3];
    const Y = ['a', 'b', 'c', 'd'];
    const injectiveMorphism = [[1, 'a'], [2, 'b'], [3, 'c']];

    const monicTest = CategoryMath.testMonomorphism(injectiveMorphism, X, Y);
    assert.equal(monicTest.isMonic, true);

    // Non-injective morphism: 1 and 2 collide on 'a'
    const nonInjective = [[1, 'a'], [2, 'a'], [3, 'b']];
    const failTest = CategoryMath.testMonomorphism(nonInjective, X, Y);
    assert.equal(failTest.isMonic, false);
    assert.ok(failTest.witness);
    assert.equal(failTest.witness.g1[0][1], 1);
    assert.equal(failTest.witness.g2[0][1], 2);
  });

  test('Identifies categorical epimorphisms (surjective right-cancellation)', () => {
    const X = [1, 2, 3, 4];
    const Y = ['a', 'b', 'c'];
    const surjectiveMorphism = [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'c']];

    const epicTest = CategoryMath.testEpimorphism(surjectiveMorphism, X, Y);
    assert.equal(epicTest.isEpic, true);

    // Non-surjective: 'c' is never hit
    const nonSurjective = [[1, 'a'], [2, 'b'], [3, 'a'], [4, 'b']];
    const failEpic = CategoryMath.testEpimorphism(nonSurjective, X, Y);
    assert.equal(failEpic.isEpic, false);
    assert.equal(failEpic.witness.orphaned, 'c');
  });
});

describe('Foundations Suite — File Integrity & Module 1 Controller Integration', () => {
  test('foundations-visuals.json catalog file is valid and contains 4 modules', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fileURLToPath = (await import('node:url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const catalogPath = path.resolve(__dirname, '../visuals/foundations/data/foundations-visuals.json');
    assert.ok(fs.existsSync(catalogPath), 'foundations-visuals.json must exist');

    const content = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.equal(Array.isArray(content), true);
    assert.equal(content.length, 4);

    const module1 = content.find(v => v.slug === 'functions-and-inverses');
    assert.ok(module1, 'functions-and-inverses must be present in catalog');
    assert.equal(module1.suite, 'foundations');
    assert.equal(module1.published, true);
  });

  test('FunctionsController state management, presets and domain restriction work correctly', async () => {
    const { FunctionsController } = await import('../visuals/foundations/functions-and-inverses/src/controller.js');
    const ctrl = new FunctionsController();

    // Default state
    assert.equal(ctrl.state.activeMode, 'discrete');
    assert.equal(ctrl.state.currentPresetId, 'bijection');
    assert.equal(ctrl.state.showInverse, false);

    // Apply presets
    ctrl.applyPreset('injective');
    assert.equal(ctrl.state.currentPresetId, 'injective');
    assert.equal(ctrl.state.domain.length, 3);
    assert.equal(ctrl.state.codomain.length, 5);

    // Bijection & inverse toggle
    ctrl.applyPreset('bijection');
    ctrl.toggleInverse();
    assert.equal(ctrl.state.showInverse, true);
    ctrl.toggleInverse();
    assert.equal(ctrl.state.showInverse, false);

    // Continuous preset & domain restriction
    ctrl.setAnalyticPreset('quadratic');
    assert.equal(ctrl.state.analyticPreset, 'quadratic');
    ctrl.setRestrictDomain(true);
    assert.equal(ctrl.state.restrictDomain, true);

    // Tracer position clamp
    ctrl.setTracerX(-3);
    assert.equal(ctrl.state.tracerX, 0); // clamped to 0 when domain is restricted!
  });

  test('Module 1 index.html and suite index.html exist and contain valid CSP and structure', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fileURLToPath = (await import('node:url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const moduleHtmlPath = path.resolve(__dirname, '../visuals/foundations/functions-and-inverses/index.html');
    const suiteHtmlPath = path.resolve(__dirname, '../visuals/foundations/index.html');
    const thumbnailPath = path.resolve(__dirname, '../assets/images/functions-and-inverses-thumbnail.svg');

    assert.ok(fs.existsSync(moduleHtmlPath), 'functions-and-inverses/index.html must exist');
    assert.ok(fs.existsSync(suiteHtmlPath), 'visuals/foundations/index.html must exist');
    assert.ok(fs.existsSync(thumbnailPath), 'functions-and-inverses-thumbnail.svg must exist');

    const moduleHtml = fs.readFileSync(moduleHtmlPath, 'utf8');
    assert.ok(moduleHtml.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
    assert.ok(moduleHtml.includes('workspace-dock'), 'Must contain workspace-dock integration');
    assert.ok(moduleHtml.includes('discrete-viewport-container'), 'Must contain discrete viewport');
    assert.ok(moduleHtml.includes('analytic-viewport-container'), 'Must contain analytic viewport');
    assert.ok(moduleHtml.includes('composition-viewport-container'), 'Must contain composition viewport');
  });
});

