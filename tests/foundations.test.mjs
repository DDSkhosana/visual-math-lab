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

  test('parseOrderedPairs parses parenthesized tuples, CSV, TSV, and respects custom codomain', () => {
    // 1. Parenthesized tuples
    const res1 = FunctionMath.parseOrderedPairs('(1, a), (2, b), (3, c)');
    assert.deepEqual(res1.domain, [1, 2, 3]);
    assert.deepEqual(res1.codomain, ['a', 'b', 'c']);
    assert.deepEqual(res1.pairs, [[1, 'a'], [2, 'b'], [3, 'c']]);

    // 2. CSV format with header
    const csvStr = `x,y\n1,alpha\n2,beta\n3,alpha`;
    const res2 = FunctionMath.parseOrderedPairs(csvStr);
    assert.deepEqual(res2.domain, [1, 2, 3]);
    assert.deepEqual(res2.codomain, ['alpha', 'beta']);
    assert.deepEqual(res2.pairs, [[1, 'alpha'], [2, 'beta'], [3, 'alpha']]);

    // 3. Arrow notation with custom extended codomain (testing surjectivity deficit)
    const arrowStr = `1 -> a\n2 -> b`;
    const res3 = FunctionMath.parseOrderedPairs(arrowStr, 'a, b, c, d');
    assert.deepEqual(res3.domain, [1, 2]);
    assert.deepEqual(res3.codomain, ['a', 'b', 'c', 'd']);
    assert.equal(res3.pairs.length, 2);
  });

  test('computeKernelEquivalenceRelation partitions domain into quotient fibers and satisfies First Isomorphism Theorem', () => {
    const domain = [1, 2, 3, 4, 5];
    const pairs = [
      [1, 'a'],
      [2, 'a'], // collision with 1
      [3, 'b'],
      [4, 'b'], // collision with 3
      [5, 'c']
    ];

    const kernel = FunctionMath.computeKernelEquivalenceRelation(domain, pairs);
    assert.equal(kernel.quotientSize, 3);
    assert.equal(kernel.isTrivial, false);
    assert.equal(kernel.nonTrivialClasses.length, 2);

    // Verify First Isomorphism Theorem: |X/ker(f)| = |im(f)|
    const analysis = FunctionMath.analyzeRelationAsFunction(domain, ['a', 'b', 'c', 'd'], pairs);
    assert.equal(kernel.quotientSize, analysis.image.length);

    // Trivial kernel for injective function
    const injPairs = [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e']];
    const injKernel = FunctionMath.computeKernelEquivalenceRelation(domain, injPairs);
    assert.equal(injKernel.isTrivial, true);
    assert.equal(injKernel.quotientSize, domain.length);
    assert.equal(injKernel.nonTrivialClasses.length, 0);
  });

  test('createSafeFormulaEvaluator evaluates arithmetic, powers, and math functions safely without eval()', () => {
    // Polynomial
    const poly = FunctionMath.createSafeFormulaEvaluator('x^3 - 3*x + 2');
    assert.equal(poly(0), 2);
    assert.equal(poly(1), 0);
    assert.equal(poly(2), 4);

    // Trigonometric and exponential
    const trig = FunctionMath.createSafeFormulaEvaluator('sin(x) + cos(x)');
    assert.ok(Math.abs(trig(0) - 1) < 1e-6);

    // Exponential & Gaussian
    const gauss = FunctionMath.createSafeFormulaEvaluator('exp(-x^2)');
    assert.equal(gauss(0), 1);
    assert.ok(Math.abs(gauss(1) - Math.exp(-1)) < 1e-6);

    // Implicit multiplication
    const impl = FunctionMath.createSafeFormulaEvaluator('2x + 1');
    assert.equal(impl(3), 7);
  });

  test('analyzeContinuousFormula computes roots, fixed points, range, monotonicity, and extrema', () => {
    const evalr = FunctionMath.createSafeFormulaEvaluator('x^3 - 3*x');
    const analysis = FunctionMath.analyzeContinuousFormula(evalr, -3, 3);

    // Roots of x^3 - 3x = x(x^2 - 3) are -sqrt(3), 0, sqrt(3)
    assert.equal(analysis.roots.length, 3);
    assert.ok(Math.abs(analysis.roots[0] - -Math.sqrt(3)) < 0.05);
    assert.ok(Math.abs(analysis.roots[1] - 0) < 0.05);
    assert.ok(Math.abs(analysis.roots[2] - Math.sqrt(3)) < 0.05);

    // Fixed points x^3 - 3x = x <=> x(x^2 - 4) = 0 are -2, 0, 2
    assert.equal(analysis.fixedPoints.length, 3);
    assert.ok(Math.abs(analysis.fixedPoints[0].x - -2) < 0.05);
    assert.ok(Math.abs(analysis.fixedPoints[1].x - 0) < 0.05);
    assert.ok(Math.abs(analysis.fixedPoints[2].x - 2) < 0.05);

    // Local extrema: max at x = -1, min at x = 1
    assert.ok(analysis.extrema.length >= 2);
    assert.equal(analysis.isStrictlyMonotonic, false);
    assert.equal(analysis.isInjective, false);
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

  test('Computes inverse permutation, fixed points, and Rothe diagram inversion cells on coordinate grid', () => {
    // sigma = [3, 1, 2, 5, 4] -> (1 3 2)(4 5)
    // 1->3, 2->1, 3->2, 4->5, 5->4
    const sigma = [3, 1, 2, 5, 4];
    const inv = PermutationMath.computeInverse(sigma);
    // sigma^-1: 3->1, 1->2, 2->3, 5->4, 4->5 => [2, 3, 1, 5, 4]
    assert.deepEqual(inv, [2, 3, 1, 5, 4]);

    // Round-trip composition (sigma ∘ sigma^-1 = id)
    const id = PermutationMath.composePermutations(sigma, inv);
    assert.deepEqual(id, [1, 2, 3, 4, 5]);

    // Fixed points (sigma(x) = x lie on line y = x)
    const pFixed = [1, 3, 2, 4, 5]; // 1, 4, 5 are fixed
    assert.deepEqual(PermutationMath.computeFixedPoints(pFixed), [1, 4, 5]);
    assert.deepEqual(PermutationMath.computeFixedPoints(sigma), []); // derangement

    // Rothe diagram & coordinate grid inversions
    const rothe = PermutationMath.computeRotheDiagram(sigma);
    assert.equal(rothe.n, 5);
    assert.equal(rothe.inversionCount, 3);
    assert.equal(rothe.parity, 'ODD');
    assert.equal(rothe.sign, -1);

    // applyTransposition swap (1 2)
    const swapped = PermutationMath.applyTransposition(sigma, 1, 2);
    // swap positions 0 and 1: [1, 3, 2, 5, 4]
    assert.deepEqual(swapped, [1, 3, 2, 5, 4]);

    // setMappingValue with collision auto-swap (maintaining bijection / Rook property)
    // sigma is [3, 1, 2, 5, 4]. Assign sigma(1) = 1 (displacing column 2 which had value 1 to old value 3)
    const rookMaintained = PermutationMath.setMappingValue(sigma, 1, 1);
    assert.deepEqual(rookMaintained, [1, 3, 2, 5, 4]);
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

  test('First Isomorphism Theorem factors functions through kernel quotient and image', () => {
    const X = [1, 2, 3, 4];
    const Y = ['a', 'b', 'c'];
    const morphismF = [[1, 'a'], [2, 'a'], [3, 'b'], [4, 'b']];

    const fact = CategoryMath.computeQuotientFactorization(morphismF, X, Y);
    assert.equal(fact.quotientClasses.length, 2);
    assert.deepEqual(fact.imageElements, ['a', 'b']);
    assert.deepEqual(fact.unhitCodomain, ['c']);
    assert.equal(fact.isIsomorphismDirect, false);

    // Isomorphism test: 3 elements bijection
    const bijectiveF = [[1, 'a'], [2, 'b'], [3, 'c']];
    const factBio = CategoryMath.computeQuotientFactorization(bijectiveF, [1, 2, 3], ['a', 'b', 'c']);
    assert.equal(factBio.isIsomorphismDirect, true);
    assert.equal(factBio.unhitCodomain.length, 0);
  });

  test('Cartesian currying adjunction satisfies eval(f_hat(a), b) = f(a, b)', () => {
    const A = ['x', 'y'];
    const B = [1, 2];
    const fn = (a, b) => `${a}:${b}`;

    const res = CategoryMath.testCurryingAdjunction(A, B, fn);
    assert.equal(res.adjunctionHolds, true);
    const sliceX = res.curriedMap.get('x');
    assert.equal(sliceX.get(1), 'x:1');
    assert.equal(sliceX.get(2), 'x:2');
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

    // Custom Pairs Loading & CSV Export
    ctrl.loadCustomPairs('(10, u), (20, v), (30, u)');
    assert.equal(ctrl.state.currentPresetId, 'custom');
    assert.deepEqual(ctrl.state.domain, [10, 20, 30]);
    assert.deepEqual(ctrl.state.codomain, ['u', 'v']);
    assert.equal(ctrl.state.pairs.length, 3);

    const exportedCSV = ctrl.exportPairsCSV();
    assert.ok(exportedCSV.includes('input_x,output_y'));
    assert.ok(exportedCSV.includes('10,u'));
    assert.ok(exportedCSV.includes('20,v'));

    // Custom Formula Loading & Deductions
    ctrl.loadCustomFormula('x^3 - 3*x', -3, 3);
    assert.equal(ctrl.state.analyticPreset, 'custom');
    assert.equal(ctrl.state.activeMode, 'analytic');
    assert.ok(ctrl.state.customModel);
    assert.equal(ctrl.state.formulaAnalysis.roots.length, 3);
    assert.equal(ctrl.state.formulaAnalysis.fixedPoints.length, 3);
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
    assert.ok(moduleHtml.includes('mapping-grid-viewport-container'), 'Must contain mapping coordinate grid viewport');
    assert.ok(moduleHtml.includes('canvas-2d-container'), 'Must contain primary canvas container');
    assert.ok(moduleHtml.includes('canvas-3d-container'), 'Must contain secondary dual canvas container');
    assert.ok(moduleHtml.includes('viewport-resizer'), 'Must contain viewport resizer');
    assert.ok(moduleHtml.includes('split-dir-btn'), 'Must contain split direction flip button');
  });

  test('Module 1 FunctionsController coordinates split viewport, orientation flip, and dual modes', async () => {
    const { FunctionsController } = await import('../visuals/foundations/functions-and-inverses/src/controller.js');
    const ctrl = new FunctionsController();

    // Default canonical split mode
    assert.equal(ctrl.state.viewMode, 'split');
    assert.equal(ctrl.state.splitDirection, 'horizontal');
    assert.equal(ctrl.state.dualMode, 'analytic');

    // Toggle split orientation
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'vertical');
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'horizontal');

    // Dual representation modes
    ctrl.setDualMode('grid');
    assert.equal(ctrl.state.dualMode, 'grid');

    ctrl.setDualMode('composition');
    assert.equal(ctrl.state.dualMode, 'composition');

    ctrl.setDualMode('analytic');
    assert.equal(ctrl.state.dualMode, 'analytic');
  });

  test('Module 2 RelationsController manages closures, presets and toggles', async () => {
    const { RelationsController } = await import('../visuals/foundations/relations-and-order/src/controller.js');
    const ctrl = new RelationsController();

    // Default is Equivalence
    assert.equal(ctrl.state.activeMode, 'digraph');
    assert.equal(ctrl.state.currentPresetId, 'equivalence');

    // Toggle pair
    ctrl.togglePair(1, 2); // removes (1, 2)
    assert.equal(ctrl.state.pairs.some(([a, b]) => a === 1 && b === 2), false);
    ctrl.togglePair(1, 2); // adds back (1, 2)
    assert.equal(ctrl.state.pairs.some(([a, b]) => a === 1 && b === 2), true);

    // Apply empty preset and test closures
    ctrl.applyPreset('empty');
    assert.equal(ctrl.state.pairs.length, 0);

    // Reflexive closure: adds (1,1), (2,2), (3,3), (4,4)
    ctrl.addReflexiveClosure();
    assert.equal(ctrl.state.pairs.length, 4);

    // Add asymmetric pair (1, 2) then symmetric closure: adds (2, 1)
    ctrl.togglePair(1, 2);
    ctrl.addSymmetricClosure();
    assert.ok(ctrl.state.pairs.some(([a, b]) => a === 2 && b === 1));

    // Test transitive closure: add (2, 3), transitive closure must add (1, 3)
    ctrl.togglePair(2, 3);
    ctrl.addTransitiveClosure();
    assert.ok(ctrl.state.pairs.some(([a, b]) => a === 1 && b === 3));
  });

  test('PosetHasseView computes exact transitive reduction on Divisibility lattice', async () => {
    const { PosetHasseView } = await import('../visuals/foundations/relations-and-order/src/views/PosetHasseView.js');
    const hasse = new PosetHasseView({ innerHTML: '', querySelector: () => null });

    const elements = [1, 2, 3, 4, 6];
    const divisibilityPairs = [
      [1, 1], [2, 2], [3, 3], [4, 4], [6, 6], // reflexive
      [1, 2], [1, 3], [1, 4], [1, 6],         // 1 divides all
      [2, 4], [2, 6],                         // 2 divides 4 and 6
      [3, 6]                                  // 3 divides 6
    ];

    const covering = hasse.computeTransitiveReduction(elements, divisibilityPairs);
    // Transitive shortcuts (1, 4) and (1, 6) must be pruned!
    // Remaining covering relations: (1, 2), (1, 3), (2, 4), (2, 6), (3, 6)
    assert.equal(covering.length, 5);
    assert.ok(!covering.some(([a, b]) => a === 1 && b === 4));
    assert.ok(!covering.some(([a, b]) => a === 1 && b === 6));
    assert.ok(covering.some(([a, b]) => a === 1 && b === 2));
    assert.ok(covering.some(([a, b]) => a === 2 && b === 4));
    assert.ok(covering.some(([a, b]) => a === 3 && b === 6));

    // Layout hierarchy: minimal element is 1 (level 0)
    const layout = hasse.computeHasseLayout(elements, covering);
    assert.deepEqual(layout.minimalElements, [1]);
    assert.equal(layout.nodeCoords.get(1).level, 0);
  });

  test('Module 2 index.html and thumbnail exist and have valid structure', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fileURLToPath = (await import('node:url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const moduleHtmlPath = path.resolve(__dirname, '../visuals/foundations/relations-and-order/index.html');
    const thumbnailPath = path.resolve(__dirname, '../assets/images/relations-and-order-thumbnail.svg');

    assert.ok(fs.existsSync(moduleHtmlPath), 'relations-and-order/index.html must exist');
    assert.ok(fs.existsSync(thumbnailPath), 'relations-and-order-thumbnail.svg must exist');

    const html = fs.readFileSync(moduleHtmlPath, 'utf8');
    assert.ok(html.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
    assert.ok(html.includes('workspace-dock'), 'Must contain workspace dock');
    assert.ok(html.includes('digraph-viewport-container'), 'Must contain digraph viewport');
    assert.ok(html.includes('quotient-viewport-container'), 'Must contain quotient viewport');
    assert.ok(html.includes('poset-viewport-container'), 'Must contain poset viewport');
    assert.ok(html.includes('viewport-resizer'), 'Must contain viewport resizer');
    assert.ok(html.includes('split-dir-btn'), 'Must contain split direction flip button');
    assert.ok(html.includes('canvas-2d-container'), 'Must contain primary canvas container');
    assert.ok(html.includes('canvas-3d-container'), 'Must contain secondary dual canvas container');
  });

  test('Module 2 RelationsController manages canonical split viewport modes and dual canvas switching', async () => {
    const { RelationsController } = await import('../visuals/foundations/relations-and-order/src/controller.js');
    const ctrl = new RelationsController();

    assert.equal(ctrl.state.viewMode, 'split');
    assert.equal(ctrl.state.splitDirection, 'horizontal');
    assert.equal(ctrl.state.dualMode, 'matrix');

    // View mode switching
    ctrl.setViewMode('2d');
    assert.equal(ctrl.state.viewMode, '2d');
    ctrl.setViewMode('3d');
    assert.equal(ctrl.state.viewMode, '3d');
    ctrl.setViewMode('split');
    assert.equal(ctrl.state.viewMode, 'split');

    // Split direction flip
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'vertical');
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'horizontal');

    // Dual representation canvas switching
    ctrl.setDualMode('quotient');
    assert.equal(ctrl.state.dualMode, 'quotient');
    ctrl.setDualMode('poset');
    assert.equal(ctrl.state.dualMode, 'poset');
    ctrl.setDualMode('matrix');
    assert.equal(ctrl.state.dualMode, 'matrix');

    // Preset auto-switching dual mode
    ctrl.applyPreset('partial_order');
    assert.equal(ctrl.state.dualMode, 'poset');
    ctrl.applyPreset('modular_z3');
    assert.equal(ctrl.state.dualMode, 'quotient');
    ctrl.applyPreset('empty');
    assert.equal(ctrl.state.dualMode, 'matrix');
  });

  test('Module 3 PermutationsController manages mapping, presets and factorials', async () => {
    const { PermutationsController } = await import('../visuals/foundations/permutations-and-groups/src/controller.js');
    const ctrl = new PermutationsController();

    assert.equal(ctrl.state.activeMode, 'cauchy');
    assert.equal(ctrl.state.currentPresetId, 'compound');
    assert.equal(ctrl.state.n, 5);

    // Factorial helper
    assert.equal(ctrl.factorial(3), 6);
    assert.equal(ctrl.factorial(4), 24);
    assert.equal(ctrl.factorial(5), 120);

    // Apply 3-cycle preset
    ctrl.applyPreset('three_cycle');
    assert.equal(ctrl.state.currentPresetId, 'three_cycle');
    assert.equal(ctrl.state.n, 3);
    assert.deepEqual(ctrl.state.mapping, [2, 3, 1]);

    // Apply transposition swap
    ctrl.applyPreset('single_swap');
    assert.equal(ctrl.state.currentPresetId, 'single_swap');
    assert.equal(ctrl.state.n, 4);
    assert.deepEqual(ctrl.state.mapping, [2, 1, 3, 4]);

    // Set custom mapping
    ctrl.setMapping([2, 1]);
    assert.equal(ctrl.state.n, 2);
    assert.deepEqual(ctrl.state.mapping, [2, 1]);

    // Split Viewport Modes & Canonical Strategy
    ctrl.setViewMode('split');
    assert.equal(ctrl.state.viewMode, 'split');
    ctrl.setViewMode('2d');
    assert.equal(ctrl.state.viewMode, '2d');
    ctrl.setViewMode('3d');
    assert.equal(ctrl.state.viewMode, '3d');

    // Split orientation flip
    assert.equal(ctrl.state.splitDirection, 'horizontal');
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'vertical');
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'horizontal');

    // Dual mode switching
    ctrl.setDualMode('braid');
    assert.equal(ctrl.state.dualMode, 'braid');
    ctrl.setDualMode('cayley');
    assert.equal(ctrl.state.dualMode, 'cayley');
    ctrl.setDualMode('cauchy');
    assert.equal(ctrl.state.dualMode, 'cauchy');

    // Interactive transposition swap
    ctrl.applyPreset('compound'); // [3, 1, 2, 5, 4]
    ctrl.applyTransposition(1, 2); // swap elements 1 and 2: [1, 3, 2, 5, 4]
    assert.deepEqual(ctrl.state.mapping, [1, 3, 2, 5, 4]);

    // Interactive coordinate grid cell assignment with automatic bijection collision swap
    ctrl.setMappingValue(1, 4); // assign sigma(1) = 4, displacing 4 (which had 5) to 1's old value 1
    assert.equal(ctrl.state.mapping[0], 4);
    assert.equal(new Set(ctrl.state.mapping).size, 5); // strictly preserves bijection!

    // Invert permutation (y = x reflection)
    ctrl.applyPreset('compound'); // [3, 1, 2, 5, 4]
    ctrl.invertPermutation();
    assert.deepEqual(ctrl.state.mapping, [2, 3, 1, 5, 4]);

    // Dynamic degree n adjustment
    ctrl.setN(3);
    assert.equal(ctrl.state.n, 3);
    assert.equal(ctrl.state.mapping.length, 3);
    assert.equal(new Set(ctrl.state.mapping).size, 3);
  });

  test('Module 3 S_3 Cayley table detects non-commutativity correctly', async () => {
    const { CayleyTableView } = await import('../visuals/foundations/permutations-and-groups/src/views/CayleyTableView.js');
    const view = new CayleyTableView({ innerHTML: '', querySelector: () => null });

    assert.equal(view.s3Elements.length, 6);
    // Elements: e, (1 2), (1 3), (2 3), (1 2 3), (1 3 2)
    const tau12 = view.s3Elements.find(e => e.name === '(1 2)');
    const tau23 = view.s3Elements.find(e => e.name === '(2 3)');
    assert.ok(tau12);
    assert.ok(tau23);

    // Test (1 2) ∘ (2 3) = (1 2 3) vs (2 3) ∘ (1 2) = (1 3 2)
    const { PermutationMath } = await import('../visuals/foundations/js/foundations-core.js');
    const comp1 = PermutationMath.composePermutations(tau23.mapping, tau12.mapping);
    const comp2 = PermutationMath.composePermutations(tau12.mapping, tau23.mapping);

    const match1 = view.s3Elements.find(e => e.mapping.every((v, i) => v === comp1[i]));
    const match2 = view.s3Elements.find(e => e.mapping.every((v, i) => v === comp2[i]));

    assert.equal(match1.name, '(1 2 3)');
    assert.equal(match2.name, '(1 3 2)');
    assert.notEqual(match1.name, match2.name); // Non-commutative!
  });

  test('Module 3 index.html and thumbnail exist and have valid structure', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fileURLToPath = (await import('node:url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const moduleHtmlPath = path.resolve(__dirname, '../visuals/foundations/permutations-and-groups/index.html');
    const thumbnailPath = path.resolve(__dirname, '../assets/images/permutations-and-groups-thumbnail.svg');

    assert.ok(fs.existsSync(moduleHtmlPath), 'permutations-and-groups/index.html must exist');
    assert.ok(fs.existsSync(thumbnailPath), 'permutations-and-groups-thumbnail.svg must exist');

    const html = fs.readFileSync(moduleHtmlPath, 'utf8');
    assert.ok(html.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
    assert.ok(html.includes('workspace-dock'), 'Must contain workspace dock');
    assert.ok(html.includes('grid-viewport-container'), 'Must contain coordinate grid viewport');
    assert.ok(html.includes('cauchy-viewport-container'), 'Must contain cauchy viewport');
    assert.ok(html.includes('braid-viewport-container'), 'Must contain braid viewport');
    assert.ok(html.includes('cayley-viewport-container'), 'Must contain cayley viewport');
    assert.ok(html.includes('viewport-resizer'), 'Must contain viewport resizer');
    assert.ok(html.includes('split-dir-btn'), 'Must contain split direction flip button');
    assert.ok(html.includes('canvas-2d-container'), 'Must contain primary canvas container');
    assert.ok(html.includes('canvas-3d-container'), 'Must contain secondary dual canvas container');
  });

  test('Module 4 CategoryTheoryController manages presets, commutativity, and proof export', async () => {
    const { CategoryTheoryController } = await import('../visuals/foundations/category-theory-foundations/src/controller.js');
    const ctrl = new CategoryTheoryController();

    // Default state: collapsing-quotient
    assert.equal(ctrl.state.activeMode, 'commutative');
    assert.equal(ctrl.state.currentPresetId, 'collapsing-quotient');
    assert.equal(ctrl.state.diagramType, 'triangle');
    assert.equal(ctrl.state.triangleCommutes, true);

    // Switch presets
    ctrl.applyPreset('injective-monic');
    assert.equal(ctrl.state.domainX.length, 3);
    assert.equal(ctrl.state.codomainY.length, 4);

    ctrl.applyPreset('surjective-epic');
    assert.equal(ctrl.state.domainX.length, 4);
    assert.equal(ctrl.state.codomainY.length, 3);

    ctrl.applyPreset('bijective-isomorphism');
    assert.equal(ctrl.state.domainX.length, 3);
    assert.equal(ctrl.state.codomainY.length, 3);

    // Commutativity toggle
    ctrl.toggleTriangleCommutativity(false);
    assert.equal(ctrl.state.triangleCommutes, false);

    // Diagram type
    ctrl.setDiagramType('square');
    assert.equal(ctrl.state.diagramType, 'square');
    ctrl.setDiagramType('product');
    assert.equal(ctrl.state.diagramType, 'product');

    // Proof export
    const proof = ctrl.exportProof();
    assert.ok(proof.includes('Categorical Invariant & Universal Factorization'));
    assert.ok(proof.includes('First Isomorphism Theorem'));
  });

  test('Module 4 index.html and thumbnail exist and have valid structure', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fileURLToPath = (await import('node:url')).fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const moduleHtmlPath = path.resolve(__dirname, '../visuals/foundations/category-theory-foundations/index.html');
    const thumbnailPath = path.resolve(__dirname, '../assets/images/category-theory-foundations-thumbnail.svg');

    assert.ok(fs.existsSync(moduleHtmlPath), 'category-theory-foundations/index.html must exist');
    assert.ok(fs.existsSync(thumbnailPath), 'category-theory-foundations-thumbnail.svg must exist');

    const html = fs.readFileSync(moduleHtmlPath, 'utf8');
    assert.ok(html.includes('Content-Security-Policy'), 'Must have Content-Security-Policy');
    assert.ok(html.includes('workspace-dock'), 'Must contain workspace dock');
    assert.ok(html.includes('commutative-viewport-container'), 'Must contain commutative viewport');
    assert.ok(html.includes('probe-viewport-container'), 'Must contain probe viewport');
    assert.ok(html.includes('factorization-viewport-container'), 'Must contain factorization viewport');
    assert.ok(html.includes('composition-grid-container'), 'Must contain composition coordinate grid viewport');
    assert.ok(html.includes('canvas-2d-container'), 'Must contain primary 2D canvas viewport');
    assert.ok(html.includes('canvas-3d-container'), 'Must contain secondary dual canvas viewport');
    assert.ok(html.includes('viewport-resizer'), 'Must contain viewport resizer');
    assert.ok(html.includes('split-dir-btn'), 'Must contain split direction flip button');
  });

  test('Module 4 CategoryMath implements morphism composition, boolean matrix products, and path comparison', async () => {
    const { CategoryMath } = await import('../visuals/foundations/js/foundations-core.js');

    const f = [[1, 2], [2, 3], [3, 1]];
    const g = [[1, 3], [2, 1], [3, 2]];
    const comp = CategoryMath.composeMorphisms(f, g);

    // (g ∘ f)(1) = g(f(1)) = g(2) = 1
    // (g ∘ f)(2) = g(f(2)) = g(3) = 2
    // (g ∘ f)(3) = g(f(3)) = g(1) = 3
    assert.deepEqual(comp, [[1, 1], [2, 2], [3, 3]]);

    // When h matches comp, path comparison reports commutativity
    const hMatching = [[1, 1], [2, 2], [3, 3]];
    const check1 = CategoryMath.comparePathCompositions(f, g, hMatching, [1, 2, 3]);
    assert.equal(check1.commutes, true);
    assert.equal(check1.discrepancies.length, 0);

    // When h differs, path comparison reports non-commutativity with discrepancy details
    const hViolating = [[1, 1], [2, 2], [3, 2]];
    const check2 = CategoryMath.comparePathCompositions(f, g, hViolating, [1, 2, 3]);
    assert.equal(check2.commutes, false);
    assert.equal(check2.discrepancies.length, 1);
    assert.equal(check2.discrepancies[0].a, 3);
    assert.equal(check2.discrepancies[0].gfa, 3);
    assert.equal(check2.discrepancies[0].ha, 2);

    // Matrix representation & multiplication
    const domain = [1, 2, 3];
    const codomain = [1, 2, 3];
    const matF = CategoryMath.computeMorphismMatrix(f, domain, codomain);
    const matG = CategoryMath.computeMorphismMatrix(g, domain, codomain);
    const matProd = CategoryMath.multiplyMorphismMatrices(matF, matG);
    const matH = CategoryMath.computeMorphismMatrix(hMatching, domain, codomain);

    assert.deepEqual(matProd, matH);
  });

  test('Module 4 CategoryTheoryController coordinates split layout, composition grid, and interactive morphism edits', async () => {
    const { CategoryTheoryController } = await import('../visuals/foundations/category-theory-foundations/src/controller.js');
    const ctrl = new CategoryTheoryController();

    // Default canonical split mode
    assert.equal(ctrl.state.viewMode, 'split');
    assert.equal(ctrl.state.splitDirection, 'horizontal');
    assert.equal(ctrl.state.dualMode, 'composition');
    assert.equal(ctrl.state.triangleCommutes, true);

    // Toggle split orientation
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'vertical');
    ctrl.toggleSplitDirection();
    assert.equal(ctrl.state.splitDirection, 'horizontal');

    // Dual representation modes
    ctrl.setDualMode('factorization');
    assert.equal(ctrl.state.dualMode, 'factorization');
    assert.equal(ctrl.state.activeMode, 'factorization');

    ctrl.setDualMode('probe');
    assert.equal(ctrl.state.dualMode, 'probe');
    assert.equal(ctrl.state.activeMode, 'probe');

    ctrl.setDualMode('composition');
    assert.equal(ctrl.state.dualMode, 'composition');

    // Interactive mapping edit in morphism f
    // Change f(1) from 1 to 2
    ctrl.setTriangleMapping('f', 1, 2);
    // Since g(2) = 2 but h(1) = 1, diagram no longer commutes
    assert.equal(ctrl.state.triangleCommutes, false);

    // Syncing composition restores commutativity: h := g ∘ f
    ctrl.syncTriangleComposition();
    assert.equal(ctrl.state.triangleCommutes, true);

    // Perturb direct morphism breaks commutativity
    ctrl.perturbTriangleDirectMorphism();
    assert.equal(ctrl.state.triangleCommutes, false);
  });
});

