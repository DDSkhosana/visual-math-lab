import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    modQuotient,
    wrapAngleRad,
    wrapAngleDeg,
    createBijectionBridge,
    createIdempotentProjection2D,
    mixedPartialRectangleQuotient,
    computeUnitCircleHelix,
    computeLawOfSines,
    computeSphericalLawOfSines,
    computeLawOfCosines,
    computeSphericalLawOfCosines,
    computeAngleSumIdentities,
    computeSpatialAngleSumEuler,
} from '../visuals/trigonometry/js/trig-math.js';
import {
    computeSagitta,
    computeCurvatureRatio,
    projectStereographicToEquator,
    projectEquatorToSphere,
    interpolateCurvatureHomotopy,
    interpolateGeodesicChord,
} from '../js/circle-core.js';
import * as circle3D from '../js/circle-3d.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Trigonometry Suite — Foundational Operators (trig-math.js)', () => {
    test('modQuotient wraps negative and positive values into [0, m)', () => {
        assert.equal(modQuotient(-1, 5), 4);
        assert.equal(modQuotient(7, 5), 2);
        assert.equal(modQuotient(-90, 360), 270);
        assert.ok(Math.abs(wrapAngleDeg(405) - 45) < 1e-12);
        assert.ok(Math.abs(wrapAngleRad(-Math.PI / 2) - (3 * Math.PI) / 2) < 1e-12);
    });

    test('createBijectionBridge verifies round-trip identity', () => {
        const degRadBridge = createBijectionBridge(
            (deg) => (deg * Math.PI) / 180,
            (rad) => (rad * 180) / Math.PI
        );
        assert.equal(degRadBridge.verifyRoundTrip(60), true);
        assert.equal(degRadBridge.verifyRoundTrip(-135), true);
    });

    test('createIdempotentProjection2D satisfies P^2 = P, Q^2 = Q, P + Q = I, P*Q = 0', () => {
        const proj = createIdempotentProjection2D(Math.PI / 6);
        const v = { x: 4.2, y: -1.7 };
        assert.equal(proj.verifyIdempotency(v), true);

        const p = proj.projectParallel(v);
        const q = proj.projectPerp(v);
        assert.ok(Math.abs(p.x + q.x - v.x) < 1e-12);
        assert.ok(Math.abs(p.y + q.y - v.y) < 1e-12);
        assert.ok(Math.abs(p.x * q.x + p.y * q.y) < 1e-12);
    });

    test('mixedPartialRectangleQuotient (1 - 2 - 3 + 4) computes exact bilinear derivative', () => {
        const cosC = 0.5;
        const f = (a, b) => a * a + b * b - 2 * a * b * cosC;
        const mq = mixedPartialRectangleQuotient(f, 1.5, 2.0, 3.0, 4.0);
        assert.ok(Math.abs(mq - (-2 * cosC)) < 1e-12);
    });
});

describe('Trigonometry Suite — Visual Invariants', () => {
    test('computeUnitCircleHelix satisfies Pythagorean and Secant-Tangent invariants', () => {
        const state = computeUnitCircleHelix(Math.PI / 5, 1.0, 0.35);
        assert.ok(Math.abs(state.invariants.pythagoreanPrimary - 1) < 1e-12);
        assert.ok(Math.abs(state.invariants.pythagoreanTanSec) < 1e-12);
        assert.ok(Math.abs(state.invariants.pythagoreanCotCsc) < 1e-12);
        assert.equal(state.invariants.isIdentityVerified, true);
        assert.ok(Math.abs(state.points3D.point3D.x - state.cos) < 1e-12);
        assert.ok(Math.abs(state.points3D.point3D.y - state.sin) < 1e-12);
    });

    test('computeLawOfSines satisfies a/sinA = b/sinB = c/sinC = 2R and altitude bridge', () => {
        const state = computeLawOfSines(0.3, 2.1, 4.2, 10);
        assert.ok(state.invariants.sineLawErrorA < 1e-12);
        assert.ok(state.invariants.sineLawErrorB < 1e-12);
        assert.ok(state.invariants.sineLawErrorC < 1e-12);
        assert.ok(state.invariants.altitudeIdentityError < 1e-12);
        assert.equal(state.invariants.isVerified, true);
    });

    test('computeSphericalLawOfSines satisfies sin(a/R)/sinA = sin(b/R)/sinB = sin(c/R)/sinC and positive spherical excess', () => {
        const state = computeSphericalLawOfSines({
            angleA: 0.4,
            angleB: 2.2,
            angleC: 4.1,
            latA: 1.1,
            latB: 2.0,
            latC: 0.9,
        }, 10);
        assert.ok(Math.abs(state.ratios.ratioSphA - state.ratios.ratioSphB) < 0.05);
        assert.ok(Math.abs(state.ratios.ratioSphB - state.ratios.ratioSphC) < 0.05);
        assert.equal(state.isSineLawVerified, true);
        assert.ok(state.sphericalExcess.excessDeg > 0, 'spherical excess must be strictly positive on non-coplanar triangle');
        assert.ok(state.sphericalExcess.sphericalArea > 0, 'spherical area must be positive');
        assert.ok(state.pyramidVolume > 0, 'trihedral pyramid volume must be positive');
    });

    test('computeLawOfCosines satisfies c^2 = a^2 + b^2 - 2ab cos C and mixed partial = -2 cos C', () => {
        const state = computeLawOfCosines(8, 10, Math.PI / 3);
        assert.ok(state.invariants.cosineLawResidual < 1e-11);
        assert.ok(state.invariants.altitudePythagorasResidual < 1e-11);
        assert.ok(state.invariants.mixedPartialResidual < 1e-11);
        assert.equal(state.projection.idempotentVerified, true);
        assert.equal(state.invariants.isVerified, true);
    });

    test('computeLawOfCosines supports full 360° orbital motion of vertex B across all 4 quadrants', () => {
        // Upper half plane (acute and obtuse)
        const acute = computeLawOfCosines(8, 10, Math.PI / 3);
        assert.ok(acute.vertices2D.B.y > 0, 'Vertex B in upper half plane for angle < 180°');
        assert.ok(acute.invariants.cosineLawResidual < 1e-11);

        // Lower half plane (reflection across baseline, angle = 240° = 4π/3)
        const lowerQuad3 = computeLawOfCosines(8, 10, (4 * Math.PI) / 3);
        assert.ok(lowerQuad3.vertices2D.B.y < 0, 'Vertex B in lower half plane for angle > 180°');
        assert.ok(Math.abs(lowerQuad3.angleCDeg - 120) < 1e-10, 'Geometric interior angle must be 120° for 240° polar');
        assert.ok(Math.abs(lowerQuad3.c - Math.sqrt(8*8 + 10*10 - 2*8*10*Math.cos(4*Math.PI/3))) < 1e-11);
        assert.ok(lowerQuad3.invariants.cosineLawResidual < 1e-11);

        // Quadrant 4 (angle = 300° = 5π/3)
        const lowerQuad4 = computeLawOfCosines(8, 10, (5 * Math.PI) / 3);
        assert.ok(lowerQuad4.vertices2D.B.y < 0);
        assert.ok(Math.abs(lowerQuad4.angleCDeg - 60) < 1e-10);
        assert.ok(lowerQuad4.invariants.cosineLawResidual < 1e-11);
    });

    test('computeAngleSumIdentities satisfies R(a+b) = R(a)R(b) and addition/subtraction formulas', () => {
        const state = computeAngleSumIdentities(Math.PI / 6, Math.PI / 4, 1.0);
        assert.ok(state.invariants.cosSumResidual < 1e-12);
        assert.ok(state.invariants.sinSumResidual < 1e-12);
        assert.ok(state.invariants.cosDiffResidual < 1e-12);
        assert.ok(state.invariants.sinDiffResidual < 1e-12);
        assert.equal(state.invariants.matrixCompositionVerified, true);
    });

    test('computeSphericalLawOfCosines satisfies cos(c/R) = cos(a/R)cos(b/R) + sin(a/R)sin(b/R)cos C, positive excess, and smooth Euclidean contraction', () => {
        const sM = computeSphericalLawOfCosines(7, 9, Math.PI / 3, 10);
        assert.ok(sM.invariants.residualCosineLaw < 1e-5, 'Spherical cosine residual must be within 1e-5');
        assert.equal(sM.invariants.isVerified, true);
        assert.ok(sM.sphericalExcess.excessRad > 0, 'Spherical excess must be strictly positive on spherical triangle');
        assert.ok(sM.sphericalExcess.sphericalArea > 0, 'Spherical area must be positive');

        // Test Euclidean limit as R -> infinity (e.g. R = 50000)
        const sLarge = computeSphericalLawOfCosines(7, 9, Math.PI / 3, 50000);
        assert.ok(
            sLarge.taylorContraction.curvatureDifference < 1e-4,
            `As R -> infinity, spherical c must smoothly contract to Euclidean c (diff: ${sLarge.taylorContraction.curvatureDifference})`
        );
    });

    test('computeSphericalLawOfCosines omnidirectional S² translation preserves all intrinsic invariants under arbitrary SO(3) rotations', () => {
        // Test canonical configuration (colatC = 0, lonC = 0, heading = 0)
        const canonical = computeSphericalLawOfCosines(7, 9, Math.PI / 3, 10, 0, 0, 0);
        assert.ok(canonical.invariants.isVerified, 'Canonical triangle must be verified');

        // Test arbitrary rotations across sphere S² (Equator, South Pole, Arbitrary latitudes and longitudes)
        const testRotations = [
            { colat: Math.PI / 2, lon: Math.PI / 4, head: 0.5 }, // Equator
            { colat: Math.PI * 0.8, lon: -Math.PI / 3, head: 1.2 }, // Southern hemisphere
            { colat: Math.PI, lon: 0, head: 0 }, // South Pole
            { colat: 0.35, lon: 2.1, head: -0.7 }, // Northern hemisphere
        ];

        for (const rot of testRotations) {
            const rotated = computeSphericalLawOfCosines(7, 9, Math.PI / 3, 10, rot.colat, rot.lon, rot.head);
            assert.ok(rotated.invariants.residualCosineLaw < 1e-5, `Spherical cosine residual under rot (${rot.colat}, ${rot.lon}) must be < 1e-5`);
            assert.ok(rotated.invariants.residualSideA < 1e-5, 'Side a geodesic arc distance must be preserved');
            assert.ok(rotated.invariants.residualSideB < 1e-5, 'Side b geodesic arc distance must be preserved');
            assert.ok(rotated.invariants.isVerified, 'SO(3) rotated triangle invariants must be verified');
            assert.ok(Math.abs(rotated.c - canonical.c) < 1e-6, `Side c (${rotated.c}) must be strictly invariant under SO(3)`);
            assert.ok(Math.abs(rotated.sphericalExcess.excessRad - canonical.sphericalExcess.excessRad) < 1e-6, 'Spherical excess must be strictly invariant');
            assert.ok(Math.abs(rotated.sphericalExcess.sphericalArea - canonical.sphericalExcess.sphericalArea) < 1e-6, 'Spherical area must be strictly invariant');
        }
    });

    test('computeSpatialAngleSumEuler satisfies SO(3) Lie group properties (orthonormality, det(R)=1, planar SO(2) reduction at gamma=0)', () => {
        const spatial = computeSpatialAngleSumEuler(Math.PI / 6, Math.PI / 4, 0.45, 1.0);
        assert.equal(spatial.lieAlgebra.isSO3, true, 'Spatial rotation matrix must satisfy det(R) = +1 in SO(3)');
        assert.ok(Math.abs(spatial.lieAlgebra.detR - 1.0) < 1e-6);

        // Planar reduction test when gamma = 0
        const planar = computeSpatialAngleSumEuler(Math.PI / 6, Math.PI / 4, 0, 1.0);
        assert.equal(planar.isPlanarReduction, true);
        assert.ok(Math.abs(planar.R_matrix[0][0] - Math.cos(Math.PI / 6 + Math.PI / 4)) < 1e-6);
        assert.ok(Math.abs(planar.R_matrix[1][0] - Math.sin(Math.PI / 6 + Math.PI / 4)) < 1e-6);
    });
});

describe('Suite Folder Architecture — visuals/circle-theorems/ & visuals/trigonometry/', () => {
    test('All 4 Trigonometry visualizers and 8 Circle Theorem visualizers live in their own suite folders under visuals/', () => {
        const expectedFiles = [
            'visuals/circle-theorems/index.html',
            'visuals/circle-theorems/thales-theorem/index.html',
            'visuals/circle-theorems/angle-at-centre/index.html',
            'visuals/circle-theorems/angles-in-same-segment/index.html',
            'visuals/circle-theorems/cyclic-quadrilateral/index.html',
            'visuals/circle-theorems/tangent-radius/index.html',
            'visuals/circle-theorems/alternate-segment/index.html',
            'visuals/circle-theorems/tangents-from-external-point/index.html',
            'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
            'visuals/trigonometry/index.html',
            'visuals/trigonometry/data/trig-visuals.json',
            'visuals/trigonometry/css/trig-suite.css',
            'visuals/trigonometry/js/trig-math.js',
            'visuals/trigonometry/js/trig-core.js',
            'visuals/trigonometry/unit-circle-helix/index.html',
            'visuals/trigonometry/law-of-sines/index.html',
            'visuals/trigonometry/law-of-cosines/index.html',
            'visuals/trigonometry/angle-sum-identities/index.html',
        ];
        for (const relPath of expectedFiles) {
            const fullPath = path.join(ROOT_DIR, relPath);
            assert.equal(fs.existsSync(fullPath), true, `Expected ${relPath} to exist`);
        }

        const catalog = JSON.parse(
            fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/data/trig-visuals.json'), 'utf8')
        );
        assert.equal(Array.isArray(catalog), true);
        assert.equal(catalog.length, 4);

        const unifiedCatalog = JSON.parse(
            fs.readFileSync(path.join(ROOT_DIR, 'data/visuals.json'), 'utf8')
        );
        assert.equal(Array.isArray(unifiedCatalog), true);
        assert.equal(unifiedCatalog.length, 12, 'data/visuals.json must contain all 12 visual metadata entries');
        const circleCount = unifiedCatalog.filter(v => (v.suite || 'circle-theorems') === 'circle-theorems').length;
        const trigCount = unifiedCatalog.filter(v => v.suite === 'trigonometry').length;
        assert.equal(circleCount, 8, 'Must have 8 circle theorems in unified catalog');
        assert.equal(trigCount, 4, 'Must have 4 trigonometry visuals in unified catalog');

        // Verify 100% key-value parity and schema completeness across all 12 visualizers
        const expectedKeys = ['slug', 'suite', 'title', 'category', 'badge', 'formula', 'description', 'thumbnail', 'published', 'youtubeId', 'video'];
        for (const entry of unifiedCatalog) {
            for (const key of expectedKeys) {
                assert.ok(Object.hasOwn(entry, key), `Visual "${entry.slug}" is missing unified key "${key}"`);
            }
            assert.ok(typeof entry.badge === 'string' && entry.badge.length > 0, `Visual "${entry.slug}" must have non-empty badge`);
            assert.ok(typeof entry.formula === 'string' && entry.formula.length > 0, `Visual "${entry.slug}" must have non-empty formula`);
        }

        // Verify badge convention: Circle Theorems Theorem 01-08, Trigonometry Trig 01-04
        const circleEntries = unifiedCatalog.filter(v => (v.suite || 'circle-theorems') === 'circle-theorems');
        circleEntries.forEach((v, idx) => {
            const expectedBadge = `Theorem 0${idx + 1}`;
            assert.equal(v.badge, expectedBadge, `Circle theorem "${v.slug}" badge should be ${expectedBadge}`);
        });

        const trigEntries = unifiedCatalog.filter(v => v.suite === 'trigonometry');
        trigEntries.forEach((v, idx) => {
            const expectedBadge = `Trig 0${idx + 1}`;
            assert.equal(v.badge, expectedBadge, `Trigonometry "${v.slug}" badge should be ${expectedBadge}`);
            const trigCatalogMatch = catalog.find(c => c.slug === v.slug);
            assert.ok(trigCatalogMatch, `trig-visuals.json must contain ${v.slug}`);
            assert.equal(trigCatalogMatch.badge, expectedBadge, `trig-visuals.json "${v.slug}" badge should be ${expectedBadge}`);
            assert.equal(trigCatalogMatch.formula, v.formula, `trig-visuals.json "${v.slug}" formula should match data/visuals.json`);
        });

        const rootHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.equal(rootHtml.includes('visuals/circle-theorems/'), true);
        assert.equal(rootHtml.includes('visuals/trigonometry/'), true);
    });

    test('All 4 Trigonometry visualizers share the unified UI/UX DOM architecture with Circle Theorems', () => {
        const trigSlugs = [
            'unit-circle-helix',
            'law-of-sines',
            'law-of-cosines',
            'angle-sum-identities',
        ];
        const requiredMarkers = [
            'class="circle-explorer"',
            'id="viewport-toolbar"',
            'id="telemetry-panel"',
            'id="stats-3d"',
            'id="labels-3d-container"',
            'id="derivations-panel"',
            'id="toolbar-2d-panel"',
            'id="toolbar-3d-panel"',
            'id="vis-2d-grid"',
            'id="vis-2d-axes"',
            'id="vis-2d-points"',
            'id="vis-2d-labels"',
            'id="vis-2d-lengths"',
            'id="vis-2d-coords"',
            'id="vis-2d-angles"',
            'id="vis-2d-area"',
            'id="vis-2d-reflex"',
            'id="vis-3d-grid"',
            'id="vis-3d-axes"',
            'id="vis-3d-sphere"',
            'id="vis-3d-wire"',
            'id="vis-3d-labels"',
            'id="vis-3d-coords"',
            'id="vis-3d-angles"',
            'id="vis-3d-area"',
            'id="vis-3d-reflex"',
            'id="val-3d-r"',
            'katex.min.css',
            'katex.min.js',
            'id="section-unit-converter"',
            'js/visual-page.js',
        ];

        for (const slug of trigSlugs) {
            const htmlPath = path.join(ROOT_DIR, 'visuals/trigonometry', slug, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
            for (const marker of requiredMarkers) {
                assert.equal(
                    html.includes(marker),
                    true,
                    `Expected ${slug}/index.html to contain unified UI/UX marker '${marker}'`
                );
            }
            assert.equal(
                html.includes(`id="${slug}-panel"`),
                true,
                `Expected ${slug}/index.html to contain #${slug}-panel`
            );
        }
    });
});



describe('Trigonometry Suite — 2D/3D Drawing Conventions aligned with Circle Theorems', () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8').replace(/\r\n/g, '\n');

    test('reuses shared Circle Theorems 3D angle, right-angle and bisector helpers', () => {
        for (const sym of [
            'makeAngleWedgeMesh',
            'setAngleWedgeVertices3D',
            'makeRightAngleMesh',
            'setRightAngle3DVertices',
            'get3DAngleBisector',
            'get3DReflexBisector',
        ]) {
            assert.ok(src.includes(sym), `trig-core.js should use ${sym}`);
        }
        assert.ok(/from '\.\.\/\.\.\/\.\.\/js\/circle-3d\.js'/.test(src), 'imports from js/circle-3d.js');
    });

    test('vectors use sharp arrowheads (no heavy apex globes) with discrete vertex markers', () => {
        assert.ok(src.includes('THREE.ArrowHelper'), '3D vectors should use THREE.ArrowHelper');
        assert.ok(src.includes('drawVectorWithApexLabel'), '2D vectors should use arrowhead + radial halo label');
        assert.ok(src.includes('getRadialLabelCoords') && src.includes('drawHaloText'));
        assert.equal(/SphereGeometry\(\s*0\.4\d/.test(src), false, 'no oversized 0.4x apex spheres');
        const markerRadii = [...src.matchAll(/makeMarker3D\([^,]+,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
        assert.ok(markerRadii.length >= 4, 'discrete 3D markers declared');
        for (const r of markerRadii) assert.ok(r <= 0.2, `marker radius ${r} should be <= 0.2`);
    });

    test('3D drag targets follow BaseScene3DView onDrag(angle, hit, store) contract', () => {
        assert.ok(src.includes("field: 'angleTheta'"));
        assert.ok(src.includes("field: 'angleA'"));
        assert.equal(/onDrag:\s*\(\s*pt\s*,\s*store\s*\)/.test(src), false, 'legacy 2-arg onDrag removed');
        assert.ok(/onDrag:\s*\(\s*angle\s*,\s*_?hit\s*,\s*store\s*\)/.test(src));
    });

    test('2D canvas is fully interactive (handle hit-test, radius resize, pan, reset, zoom)', () => {
        assert.ok(src.includes('getInteractiveHandles2D'));
        assert.ok(src.includes("'ew-resize'"));
        assert.ok(src.includes("'grabbing'"));
        assert.ok(src.includes("'dblclick'"));
        assert.ok(src.includes("'wheel'"));
        // Law of Sines 2D interaction affordances
        assert.ok(src.includes("field: 'antipodeA'"), 'Law of Sines must declare interactive antipodeA handle');
        assert.ok(src.includes("store.set({ angleB: normalizeAngle(ang + Math.PI) })"), 'Dragging antipode A rotates vertex B');
        assert.ok(src.includes('this.hoverCircumference'), 'Canvas must support circumference hover indicator');
        assert.ok(src.includes('canvas.addEventListener(\'keydown\''), 'Canvas must support keyboard arrow navigation');
        assert.ok(src.includes("A: ∠A = ${m.interiorAngles.degA.toFixed(1)}°, a = ${m.sides.a.toFixed(2)}"), 'Law of Sines active drag badge for A displays interior angle and opposite side');
        assert.ok(src.includes("A': 2R = ${m.diameter2R.toFixed(1)}"), 'Law of Sines active drag badge for antipode A displays 2R diameter');
        assert.ok(src.includes("2R = ${m.diameter2R.toFixed(1)} (R = ${(m.diameter2R / 2).toFixed(1)})"), 'Law of Sines radius drag badge displays circumdiameter 2R');
        assert.ok(src.includes("this.handleAp = makeMarker3D(PALETTE.amber, 0.18)"), 'TrigScene3DView must create 3D interactive marker for antipode A');
        assert.ok(src.includes("this.handleAp.position.copy(Ap)"), 'TrigScene3DView must position 3D handleAp at circumdiameter point A');

        // Angle Sum 2D interaction affordances
        assert.ok(src.includes("P: α+β = ${pDeg}°"), 'Angle Sum active drag badge for P displays compound angle α+β');
        assert.ok(src.includes("D: α−β = ${dDeg}°"), 'Angle Sum active drag badge for D displays compound angle α−β');

        // Law of Cosines 2D interaction affordances
        assert.ok(src.includes("originY = cy + m.projection.hAlt * scale * 0.35"), 'Law of Cosines getInteractiveHandles2D must align originY with altitude projection offset');
        assert.ok(src.includes("store.set({ sideA: Math.round(nextA * 2) / 2 })"), 'Dragging reference circumference in Law of Cosines resizes sideA');
        assert.ok(src.includes('#renderInteractiveAffordances(ctx, state, cx, cy, r)'), 'render must centralize interactive affordances across all trig visualizers');
    });

    test('derivations use collapsible cardTemplate with unit-aware formatting and reflex shading', () => {
        assert.ok(/import \{[^}]*cardTemplate[^}]*\} from '\.\.\/\.\.\/\.\.\/js\/circle-derivations\.js'/.test(src));
        assert.ok(src.includes('fmtAngle(') && src.includes('fmtLength'));
        assert.ok(src.includes('drawReflexWedge'));
        assert.ok(src.includes('vis3d.reflex'));
    });
});

describe('Trigonometry Suite — Axiomatic Invariants, Synchronization & Unified Colour Grammar', () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8').replace(/\r\n/g, '\n');

    test('model radius getModelRadius(state) synchronizes 2D scale, 3D scene, telemetry, and derivations', () => {
        assert.ok(src.includes('export function getModelRadius('));
        assert.ok(src.includes('this.R = getModelRadius(state)'));
        assert.ok(src.includes('computeLawOfSines(state.angleA, state.angleB, state.angleC, getModelRadius(state))'));
        assert.ok(src.includes('const scale = r / getModelRadius(state)'));
        assert.ok(src.includes('const R3D = getModelRadius(state)'));
    });

    test('directed conjugate angle wedges handle compound and perigon angles on both sides of 180°', () => {
        assert.ok(src.includes('function drawConjugateWedge('));
        assert.ok(src.includes('function getDirectedAngleBadge('));
        assert.ok(src.includes('getPolarLabel3D('));
        assert.ok(src.includes('drawConjugateWedge(ctx, O, 0, m.sumAngle'));
        assert.ok(src.includes('m.sumAngle <= Math.PI'));
    });

    test('Law of Cosines color grammar aligns vertex with opposite side across 2D, 3D, and derivations', () => {
        // A ↔ a = BC (sky), B ↔ b = CA (emerald), C ↔ c = AB (rose)
        assert.ok(src.includes("markerO: PALETTE.rose, handleA: PALETTE.sky, handleB: PALETTE.emerald, handleC: PALETTE.amber"));
        assert.ok(src.includes("drawRadialLabelledPoint(ctx, A, centroid, PALETTE.sky"));
        assert.ok(src.includes("drawRadialLabelledPoint(\n        ctx,\n        B,\n        centroid,\n        PALETTE.emerald"));
        assert.ok(src.includes("key: 'ang-A', text: `∠A = ${fmtAngle(toDegrees(m.angleA), angUnit)}`, at: bisA, color: 'color-sky'"));
        assert.ok(src.includes("key: 'ang-B', text: `∠B = ${fmtAngle(toDegrees(m.angleB), angUnit)}`, at: bisB, color: 'color-emerald'"));

        // HTML & Telemetry token consistency: A (sky), B (emerald), C & c² (rose), D & 2ab cos C (amber)
        const locHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/law-of-cosines/index.html'), 'utf-8');
        assert.ok(locHtml.includes('3D: Euclidean Projection Prism (<span class="color-rose">c²</span>)'));
        assert.ok(!locHtml.includes('3D: Euclidean Projection Prism (<span class="color-amber">c²</span>)'));
        assert.ok(locHtml.includes('<span class="color-rose">Vertex C (origin):</span>'));
        assert.ok(locHtml.includes('<span class="color-emerald">Vertex B (a cos C, a sin C):</span>'));
        assert.ok(locHtml.includes('Labels (<span class="color-sky">A</span>, <span class="color-emerald">B</span>, <span class="color-rose">C</span>, <span class="color-amber">D</span>)'));
        assert.ok(locHtml.includes('id="val-3d-c-coords"'), '3D Telemetry must include Vertex C coordinates');
        assert.ok(locHtml.includes('id="val-3d-a-coords"'), '3D Telemetry must include Vertex A coordinates');
        assert.ok(locHtml.includes('id="val-3d-b-coords"'), '3D Telemetry must include Vertex B coordinates');
        assert.ok(locHtml.includes('id="val-3d-d-coords"'), '3D Telemetry must include Foot D coordinates');
        assert.ok(locHtml.includes('id="vis-3d-lengths"'), '3D Controls must include vis-3d-lengths toggle');

        // 3D Scene edge lengths & dynamic marker color alignment
        assert.ok(src.includes("key: 'side-a-len'"), '3D scene must include side a length label');
        assert.ok(src.includes("key: 'side-b-len'"), '3D scene must include side b length label');
        assert.ok(src.includes("key: 'side-c-len'"), '3D scene must include side c length label');
        assert.ok(src.includes("key: 'alt-h-len'"), '3D scene must include altitude h length label');
        assert.ok(src.includes("key: 'proj-p-len'"), '3D scene must include projection p length label');
        assert.ok(src.includes("key: 'sph-a-len'"), '3D spherical mode must include geodesic arc a length label');
        assert.ok(src.includes("key: 'sph-b-len'"), '3D spherical mode must include geodesic arc b length label');
        assert.ok(src.includes("key: 'sph-c-len'"), '3D spherical mode must include geodesic arc c length label');
        assert.ok(src.includes("this.markerO.material.color.set(PALETTE.indigo);"), '3D spherical center O must be PALETTE.indigo');
        assert.ok(src.includes("this.handleC.material.color.set(PALETTE.rose);"), '3D spherical apex C must be PALETTE.rose');
    });

    test('Angle Sum 3D scene colors and right-angle markers match 2D and derivation cards', () => {
        assert.ok(src.includes("handleA: PALETTE.sky, handleP: PALETTE.emerald,"));
        assert.ok(src.includes("rightAngle1: PALETTE.violet, rightAngle2: PALETTE.amber"));
        assert.ok(src.includes("ref-sum"));
    });

    test('Unit Circle cylindrical helix naming and coordinates are unified as y(θ) with XZ ground plane', () => {
        assert.ok(src.includes("r(θ) = (R cos θ, y(θ), R sin θ)"));
        assert.ok(src.includes("Helix height ${tag('violet', `y(θ) = ${m.points3D.point3D.z.toFixed(3)}`)}"));
        assert.equal(src.includes("z(θ) = "), false, "legacy z(θ) notation replaced with vertical y(θ)");
    });

    test('point and angle labeling consistency is 100% aligned between 2D and 3D across all visuals', () => {
        // Unit circle: O, P(θ), Cx, Helix(θ), θ, θ*
        assert.ok(src.includes("key: 'Cx', name: 'Cx'"));
        // Law of Sines: O, A, B, C, A', Hc, ∠A, ∠B, ∠C, ∠C*
        assert.ok(src.includes("key: 'Ap', name: \"A'\""));
        assert.ok(src.includes("key: 'Hc', name: 'Hc'"));
        // Law of Cosines: C, A, B, D, ∠C, ∠A, ∠B, ∠C*
        assert.ok(src.includes("key: 'D', name: 'D'"));
        assert.ok(src.includes("key: 'ang-C'"));
        // Angle Sum: O, A(α), P(α+β), Q, M, N, α, β, (α+β)*
        assert.ok(src.includes("key: 'M', name: 'M'"));
        assert.ok(src.includes("key: 'N', name: 'N'"));
        assert.ok(src.includes("key: 'cos-sum-len'"));
        assert.ok(src.includes("key: 'sin-sum-len'"));

        // 2D coordinate toggling for auxiliary points M, Q, N, N_D
        assert.ok(src.includes("getPointLabel('Q', m.points2D.Q.x * r, m.points2D.Q.y * r, vis)"), '2D Q must use getPointLabel');
        assert.ok(src.includes("getPointLabel('M', m.points2D.M.x * r, m.points2D.M.y * r, vis)"), '2D M must use getPointLabel');
        assert.ok(src.includes("getPointLabel('N', m.points2D.N.x * r, m.points2D.N.y * r, vis)"), '2D N must use getPointLabel');
        assert.ok(src.includes("getPointLabel('N_D', m.points2D.N_diff.x * r, m.points2D.N_diff.y * r, vis)"), '2D N_D must use getPointLabel');
    });

    test('Angle Sum dropped line from P to X-axis is fully represented in 3D with right angle at N', () => {
        assert.ok(src.includes("addSeg(P, N, PALETTE.emerald, true)"));
        assert.ok(src.includes("addSeg(O, N, PALETTE.amber)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle3, N, O, P"));
    });

    test('Angle Sum interactive D(α−β) handle, sin(α−β) altitude and color token harmonization across 2D & 3D', () => {
        // 1. Math model exports N_diff
        const m = computeAngleSumIdentities(Math.PI / 6, Math.PI / 4, 1.0);
        assert.ok(m.points2D.N_diff, 'N_diff must be defined in points2D');
        assert.strictEqual(m.points2D.N_diff.y, 0, 'N_diff must be on X-axis (y = 0)');
        assert.strictEqual(m.points2D.N_diff.x, m.points2D.P_diff.x, 'N_diff.x must match P_diff.x');

        // 2. 2D Handle D is exposed when showDifferenceRay !== false
        assert.ok(src.includes("id: 'D'"));
        assert.ok(src.includes("field: 'diffBeta'"));
        assert.ok(src.includes("store.set({ angleBeta: normalizeAngle((st.angleAlpha || 0) - ang) })"));

        // 3. 2D visual representation of sin(α−β) altitude in Rose and cos(α−β) in Orange (distinct from cos(α+β) in Amber)
        assert.ok(src.includes("const Ndiff = toScreen(m.points2D.N_diff);"));
        assert.ok(src.includes("ctx.strokeStyle = PALETTE.rose;"));
        assert.ok(src.includes("ctx.moveTo(Pdiff.x, Pdiff.y);"));
        assert.ok(src.includes("ctx.lineTo(Ndiff.x, Ndiff.y);"));
        assert.ok(src.includes("drawRightAngle(ctx, Ndiff, O, Pdiff, 10, PALETTE.rose)"));
        assert.ok(src.includes("sin(α−β) ="));
        assert.ok(src.includes("drawLabelledPoint(ctx, Ndiff, PALETTE.orange, getPointLabel('N_D', m.points2D.N_diff.x * r, m.points2D.N_diff.y * r, vis), -10, -12, 3.5)"));

        // 4. 3D visual representation: handleC pick target, dropped altitude, rightAngle4, badges
        assert.ok(src.includes("const nextBeta = normalizeAngle(alpha - angle);"));
        assert.ok(src.includes("store.set({ angleBeta: nextBeta });"));
        assert.ok(src.includes("addSeg(Pdiff, Ndiff, PALETTE.rose, true)"));
        assert.ok(src.includes("addSeg(O, Ndiff, PALETTE.orange)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle4, Ndiff, O, Pdiff"));
        assert.ok(src.includes("key: 'sin-diff-len'"));
        assert.ok(src.includes("key: 'cos-diff-len'"));
        assert.ok(src.includes("key: 'Ndiff', name: 'N_D'"));

        // 5. Telemetry HTML color token harmonization: cos(α-β) in Orange (distinct from cos(α+β) in Amber), sin(α-β) in Rose, Separation in Violet, Chord |PD| in Teal
        const asHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/angle-sum-identities/index.html'), 'utf-8');
        assert.ok(asHtml.includes('<span class="color-amber">cos(α + β):</span><strong class="color-amber" id="tel-cos-sum">'));
        assert.ok(asHtml.includes('<span class="color-orange">cos(α − β):</span><strong class="color-orange" id="tel-cos-diff">'));
        assert.ok(asHtml.includes('<span class="color-rose">sin(α − β):</span><strong class="color-rose" id="tel-sin-diff">'));
        assert.ok(asHtml.includes('<span class="color-violet">Separation ∠POD (2β):</span><strong class="color-violet" id="tel-separation">'), 'Separation ∠POD in telemetry must use color-violet matching beta');
        assert.ok(asHtml.includes('<span class="color-teal">Chord Length |PD|:</span><strong class="color-teal" id="tel-chord-pd">'), 'Chord |PD| in telemetry must use color-teal matching the Teal chord stroke');
        assert.ok(src.includes("midQD.x + outNorm.x * 28"), '2D |PD| badge must be placed outward along segment QD avoiding ray OA obstruction');
        assert.ok(src.includes("key: 'chord-pd-len'"));

        // 6. Axiomatic decomposition triangles △PSQ and △OQD in 2D, 3D, and derivations with crisp solid translucent tint shading
        assert.ok(src.includes("Upper Right Triangle △PSQ"));
        assert.ok(src.includes("rgba(251, 191, 36"));
        assert.ok(src.includes("drawRightAngle(ctx, S, P, Q, 9, PALETTE.amber)"));
        assert.ok(src.includes("Difference Right Triangle Shading (△OQD)"));
        assert.ok(src.includes("rgba(244, 63, 94"));
        assert.ok(src.includes("drawRightAngle(ctx, Q, O, Pdiff, 11, PALETTE.rose)"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([P, S, Q])"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([O, Q, Pdiff])"));
        assert.ok(src.includes("△PSQ"));
        assert.ok(src.includes("△OQD"));
        assert.ok(asHtml.includes("Stacked Right Triangles (△OMQ, △OQP, △PSQ)"));
        assert.ok(asHtml.includes("Difference Ray D(α − β) &amp; △OQD"));
    });

    test('Law of Cosines bilinear interaction rectangle (2ab cos C) is represented in 3D ground plane with live badge', () => {
        assert.ok(src.includes("showInteractionRect = state.showInteractionRect !== false && showArea"));
        assert.ok(src.includes("const R0 = new THREE.Vector3(0, 0.015, 0)"));
        assert.ok(src.includes("const R1 = new THREE.Vector3(D.x, 0.015, 0)"));
        assert.ok(src.includes("const R2 = new THREE.Vector3(D.x, 0.015, -rectDepth)"));
        assert.ok(src.includes("key: 'rect-2abcos'"));
        assert.ok(src.includes("2ab cos C = ${m.squares.interaction2abCosC.toFixed(1)}"));
        assert.ok(src.includes("vis-3d-rect"));

        // Colour Grammar Standard: 2ab cos C rectangle & extruded 3D prism with 4-corner constitutive vertex colors
        assert.ok(src.includes("const rectColor = PALETTE.amber;"), '3D interaction rectangle badge color invariant');
        assert.ok(src.includes("const prismY = -0.45;"), '3D interaction rectangle must render as a visible extruded prism');
        assert.ok(src.includes("const showSphRect = state.showInteractionRect !== false && showArea;"), 'Spherical 3D mode must also project 2ab cos C rectangle');
        assert.ok(!src.includes("m.cosC >= 0 ? PALETTE.amber : PALETTE.rose"), 'trig-core.js must not flip Amber to Rose for negative cosine');
    });

    test('Unit Circle Six Trig Functions & 3D Cylindrical Helix structure and wave projections are fully integrated', () => {
        assert.ok(src.includes("new THREE.CylinderGeometry(R, R, H_cyl, 48, 1, true)"));
        assert.ok(src.includes("addSeg(P_helix, W_cos, PALETTE.amber, true)"));
        assert.ok(src.includes("addSeg(P_helix, W_sin, PALETTE.emerald, true)"));
        assert.ok(src.includes("key: 'tan-len-3d'"));
        assert.ok(src.includes("key: 'cot-len-3d'"));
        assert.ok(src.includes("key: 'sec-len-3d'"));
        assert.ok(src.includes("key: 'csc-len-3d'"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle2, T_base"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle3, C_base"));
        assert.ok(src.includes("key: 'helix-y'"));

        // Shading Standards: Crisp High-Contrast Solid Translucent Shading in 2D and 3D
        assert.ok(src.includes("rgba(56, 189, 248, 0.05)"), '2D Unit Circle disk must use subtle sky tint');
        assert.ok(src.includes("Primary Pythagorean Right Triangle: cos²θ + sin²θ = 1 (Crisp Indigo)"), '2D Pythagorean triangle must use crisp Indigo tint');
        assert.ok(src.includes("Discrete Secant-Tangent Right Triangle: 1 + tan²θ = sec²θ (Crisp Rose)"), '2D Tan-Sec triangle must use crisp Rose tint');
        assert.ok(src.includes("Discrete Cotangent-Cosecant Right Triangle: 1 + cot²θ = csc²θ (Crisp Fuchsia)"), '2D Cot-Csc triangle must use crisp Fuchsia tint');
        assert.ok(src.includes("new THREE.CircleGeometry(R, 64)"), '3D scene must include equatorial unit circle disk');
        assert.ok(src.includes("color: PALETTE.indigo, transparent: true, opacity: 0.18"), '3D Pythagorean right triangle must declare solid Indigo material');
        assert.ok(src.includes("color: PALETTE.rose, transparent: true, opacity: 0.18"), '3D Tan-Sec right triangle must declare solid Rose material');
        assert.ok(src.includes("color: PALETTE.fuchsia, transparent: true, opacity: 0.18"), '3D Cot-Csc right triangle must declare solid Fuchsia material');
        assert.ok(src.includes("color: PALETTE.amber, transparent: true, opacity: 0.20"), '3D dedicated Cosine ground mesh must declare Amber material');
        assert.ok(src.includes("color: PALETTE.emerald, transparent: true, opacity: 0.20"), '3D dedicated Sine ground mesh must declare Emerald material');
        assert.ok(src.includes("color: PALETTE.amber, transparent: true, opacity: 0.18"), '3D Cosine Wave Wall must declare Amber surface curtain');
        assert.ok(src.includes("color: PALETTE.emerald, transparent: true, opacity: 0.18"), '3D Sine Wave Wall must declare Emerald surface curtain');
        assert.ok(src.includes("color: PALETTE.violetLight, transparent: true, opacity: 0.14"), '3D Helical Ribbon must declare violetLight ruled surface');
        assert.ok(src.includes("color: PALETTE.lavender, transparent: true, opacity: 0.15"), '3D Vertical Harmonic Elevation Triangle must declare Lavender material');

        // HTML 2D & 3D Telemetry coherence for all 6 trig functions
        const uchHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/unit-circle-helix/index.html'), 'utf-8');
        assert.ok(uchHtml.includes('id="val-3d-tan"'), '3D Telemetry must include tan θ');
        assert.ok(uchHtml.includes('id="val-3d-sec"'), '3D Telemetry must include sec θ');
        assert.ok(uchHtml.includes('id="val-3d-cot"'), '3D Telemetry must include cot θ');
        assert.ok(uchHtml.includes('id="val-3d-csc"'), '3D Telemetry must include csc θ');
        assert.ok(uchHtml.includes('id="tel-o-coords"'), '2D Telemetry must include point coordinates');
        assert.ok(uchHtml.includes('id="val-3d-peq-coords"'), '3D Telemetry must include 3D point coordinates');

        // Function and shading toggles in dock interactive controls panel
        assert.ok(uchHtml.includes('id="section-trig-functions"'), 'Controls panel must have collapsible trig functions section');
        assert.ok(uchHtml.includes('id="check-func-sin"'), 'Must have Sine toggle');
        assert.ok(uchHtml.includes('id="check-func-cos"'), 'Must have Cosine toggle');
        assert.ok(uchHtml.includes('id="check-func-tan"'), 'Must have Tangent toggle');
        assert.ok(uchHtml.includes('id="check-func-csc"'), 'Must have Cosecant toggle');
        assert.ok(uchHtml.includes('id="check-func-sec"'), 'Must have Secant toggle');
        assert.ok(uchHtml.includes('id="check-func-cot"'), 'Must have Cotangent toggle');
        assert.ok(uchHtml.includes('id="check-shading-sin"'), 'Must have Sine area shading toggle');
        assert.ok(uchHtml.includes('id="check-shading-cos"'), 'Must have Cosine area shading toggle');

        // Dedicated Cosecant & Cotangent derivation step
        assert.ok(src.includes("Complementary Cotangent & Cosecant Duality"), 'Must include dedicated Cotangent & Cosecant derivation card');
        assert.ok(src.includes("uch-step-4"), 'Must include step 4 for Cot-Csc');
        assert.ok(src.includes("uch-step-5"), 'Must include step 5 for Helix');
    });

    test('Law of Sines dual-mode switch (Planar Y = 0 vs Spherical 3D) is fully wired into DOM, 3D scene, telemetry, and derivations', () => {
        const losHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/law-of-sines/index.html'), 'utf-8');
        assert.ok(losHtml.includes('id="btn-mode-planar"'));
        assert.ok(losHtml.includes('id="btn-mode-spatial"'));
        assert.ok(losHtml.includes('id="btn-mode-planar-pill"'));
        assert.ok(losHtml.includes('id="btn-mode-spatial-pill"'));
        assert.ok(losHtml.includes('id="section-dimension-mode"'));
        assert.ok(losHtml.includes('id="val-3d-mode-label"'));
        assert.ok(losHtml.includes('id="row-3d-excess"'));
        assert.ok(losHtml.includes('id="row-3d-volume"'));
        assert.ok(losHtml.includes('id="btn-toggle-dimension-mode"'), 'Toolbar must include floating dimension mode toggle');
        assert.ok(losHtml.includes('id="toolbar-dimension-status"'), 'Toolbar must include status pill');
        assert.ok(losHtml.includes('<span>Spatial: <span class="tutorial-status-pill is-off" id="toolbar-dimension-status">OFF</span></span>'), 'Toolbar toggle must consistently label Spatial: OFF');
        assert.ok(losHtml.includes('>Spatial S²</button>'), 'Segmented bar pill must consistently label Spatial S²');
        assert.ok(losHtml.includes('id="btn-mode-solid"'), 'Must include Solid 3D button');

        // Check trig-core.js tri-mode wiring
        assert.ok(src.includes("dimensionMode: 'planar'"));
        assert.ok(src.includes("computeSphericalLawOfSines(state, R)"));
        assert.ok(src.includes("addGeodesicArc(B, C, PALETTE.red)"));
        assert.ok(src.includes("addGeodesicArc(A, C, PALETTE.green)"));
        assert.ok(src.includes("addGeodesicArc(A, B, PALETTE.violet)"));
        assert.ok(src.includes("Spherical Geodesics on S²"));
        assert.ok(src.includes("Girard's Spherical Excess Theorem"));
        assert.ok(src.includes("Euclidean Taylor Correspondence"));
        assert.ok(src.includes("btn-mode-planar"));
        assert.ok(src.includes("btn-mode-spatial"));
        assert.ok(src.includes("btn-mode-solid"));
        assert.ok(src.includes("press('btn-toggle-dimension-mode', is3D)"));
        assert.ok(src.includes("bindModeSwitch('btn-mode-spatial', 'spatial')"), 'Spatial-id buttons must select Spatial S² mode');
        assert.ok(src.includes("bindModeSwitch('btn-mode-solid', 'solid')"), 'Solid-id buttons must select Solid 3D mode');
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([Ap, B, C])"), '3D planar mode must shade Thales right-triangle mesh in Amber');
        assert.ok(src.includes("const rLift = R * 1.002;"), '3D spherical cap must have radial lift offset to prevent Z-fighting');
        assert.ok(src.includes("addSeg(B, C, PALETTE.red, true)"), 'Law of Sines spatial mode must draw straight Euclidean chord BC');
        assert.ok(src.includes("addSeg(A, C, PALETTE.green, true)"), 'Law of Sines spatial mode must draw straight Euclidean chord AC');
        assert.ok(src.includes("addSeg(A, B, PALETTE.violet, true)"), 'Law of Sines spatial mode must draw straight Euclidean chord AB');
        assert.ok(src.includes("const flatSecantGeom = new THREE.BufferGeometry().setFromPoints([A, B, C])"), 'Law of Sines spatial mode must shade flat Euclidean secant triangle ABC');
        assert.ok(src.includes("const Ap = circleInfo.center.clone().multiplyScalar(2).sub(B);"), 'Law of Sines spatial mode must construct Thales antipode Ap on concyclic circumcircle');
        assert.ok(src.includes("const Hc = new THREE.Vector3().copy(A).addScaledVector(vAB, tAlt);"), 'Law of Sines spatial mode must project altitude foot Hc onto side AB in 3D');
    });

    test('Law of Cosines dual-mode switch (Planar Euclidean vs Spherical 3D on S²) is fully wired into DOM, 3D scene, telemetry, and derivations', () => {
        const locHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/law-of-cosines/index.html'), 'utf-8');
        assert.ok(locHtml.includes('id="btn-mode-planar"'));
        assert.ok(locHtml.includes('id="btn-mode-spatial"'));
        assert.ok(locHtml.includes('id="btn-mode-planar-pill"'));
        assert.ok(locHtml.includes('id="btn-mode-spatial-pill"'));
        assert.ok(locHtml.includes('id="section-dimension-mode"'));
        assert.ok(locHtml.includes('id="val-3d-mode-label"'));
        assert.ok(locHtml.includes('id="row-3d-cosc-arc"'));
        assert.ok(locHtml.includes('id="btn-toggle-dimension-mode"'), 'Toolbar must include floating dimension mode toggle');
        assert.ok(locHtml.includes('id="toolbar-dimension-status"'), 'Toolbar must include status pill');
        assert.ok(locHtml.includes('<span>Spatial: <span class="tutorial-status-pill is-off" id="toolbar-dimension-status">OFF</span></span>'), 'Toolbar toggle must consistently label Spatial: OFF');
        assert.ok(locHtml.includes('>Spatial S²</button>'), 'Segmented bar pill must consistently label Spatial S²');
        assert.ok(locHtml.includes('id="btn-mode-solid"'), 'Must include Solid 3D button');
        assert.ok(locHtml.includes('id="row-3d-sph-c"'));
        assert.ok(locHtml.includes('id="row-3d-excess"'));
        assert.ok(locHtml.includes('id="row-3d-area"'));

        // Check trig-core.js dual-mode wiring for Law of Cosines
        assert.ok(src.includes("computeSphericalLawOfCosines(state.sideA, state.sideB, state.angleC, R)"));
        assert.ok(src.includes("Spherical Great-Circle Geodesics"));
        assert.ok(src.includes("Spherical Law of Cosines"));
        assert.ok(src.includes("Curvature Contraction & Euclidean Taylor Limit"));
        assert.ok(src.includes("Girard Excess & Spherical Area"));
        assert.ok(src.includes("val-3d-cosc-arc"));
        assert.ok(src.includes("val-3d-sph-c"));
        assert.ok(locHtml.includes('id="tel-c-coords"'));
        assert.ok(locHtml.includes('id="tel-a-coords"'));
        assert.ok(locHtml.includes('id="tel-b-coords"'));
        assert.ok(locHtml.includes('id="val-3d-b-coords"'));
        assert.ok(src.includes("sideA: Math.round(nextA * 2) / 2"));
        assert.ok(src.includes("addSeg(C, A, PALETTE.emerald, true)"), 'Law of Cosines spatial mode must draw straight Euclidean chord CA');
        assert.ok(src.includes("addSeg(C, B, PALETTE.sky, true)"), 'Law of Cosines spatial mode must draw straight Euclidean chord CB');
        assert.ok(src.includes("addSeg(A, B, PALETTE.rose, true)"), 'Law of Cosines spatial mode must draw straight Euclidean chord AB');
        assert.ok(src.includes("const flatSecantGeom = new THREE.BufferGeometry().setFromPoints([C, A, B])"), 'Law of Cosines spatial mode must shade flat Euclidean secant triangle CAB');
        assert.ok(locHtml.includes('id="slider-colat-c"'), 'Law of Cosines must include colatitude slider');
        assert.ok(locHtml.includes('id="slider-lon-c"'), 'Law of Cosines must include longitude slider');
        assert.ok(locHtml.includes('id="btn-recenter-c"'), 'Law of Cosines must include recenter button');
        assert.ok(src.includes("id: 'C'"), 'Law of Cosines 3D targets must include handle C for omnidirectional positioning');
    });

    test('Bidirectional 2D and 3D radius synchronization: resizing radius in Split View dimensions (450x420) scales 2D canvas without premature clamping', async () => {
        const { TrigCanvas2DView, getModelRadius } = await import('../visuals/trigonometry/js/trig-core.js');
        const mockCanvas = { width: 450, height: 420, getContext: () => ({ setTransform: () => {}, clearRect: () => {} }) };
        const mockContainer = { getBoundingClientRect: () => ({ width: 450, height: 420 }) };
        const view = new TrigCanvas2DView(mockCanvas, mockContainer, 'unit-circle-helix');
        view.width = 450;
        view.height = 420;

        // Default radius 175
        const defaultGeom = view.getCenterAndRadius({ radius: 175 });
        assert.strictEqual(defaultGeom.r, 175, 'Default radius 175 must not be clamped in 450x420 split view');

        // Resizing to 220 in 3D / store must scale 2D radius to 220
        const enlargedGeom = view.getCenterAndRadius({ radius: 220 });
        assert.strictEqual(enlargedGeom.r, 220, 'Enlarging 3D radius to 220 must scale 2D radius to 220');

        // Resizing to 260 (maximum slider value)
        const maxGeom = view.getCenterAndRadius({ radius: 260 });
        assert.strictEqual(maxGeom.r, 260, 'Enlarging 3D radius to max 260 must scale 2D radius to 260');

        // Resizing to 110 (minimum slider range)
        const minGeom = view.getCenterAndRadius({ radius: 110 });
        assert.strictEqual(minGeom.r, 110, 'Shrinking 3D radius to 110 must scale 2D radius to 110');

        // Synchronized 3D world radius
        assert.strictEqual(getModelRadius({ radius: 175 }), 10, '175px maps to 10 world units');
        assert.strictEqual(getModelRadius({ radius: 220 }), 220 / 17.5, '220px maps proportionally to world units');
    });

    test('Angle Sum Identities dual-mode switch (Planar SO(2) vs Spatial SO(3) Euler Frame) is fully wired into DOM, 3D scene, telemetry, and derivations', () => {
        const asiHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/angle-sum-identities/index.html'), 'utf-8');
        assert.ok(asiHtml.includes('id="btn-mode-planar"'));
        assert.ok(asiHtml.includes('id="btn-mode-spatial"'));
        assert.ok(asiHtml.includes('id="btn-mode-planar-pill"'));
        assert.ok(asiHtml.includes('id="btn-mode-spatial-pill"'));
        assert.ok(asiHtml.includes('id="section-dimension-mode"'));
        assert.ok(asiHtml.includes('id="slider-gamma"'));
        assert.ok(asiHtml.includes('id="val-3d-mode-label"'));
        assert.ok(asiHtml.includes('id="row-3d-gamma"'));
        assert.ok(asiHtml.includes('id="row-3d-trace"'));
        assert.ok(asiHtml.includes('id="row-3d-rot-angle"'));
        assert.ok(asiHtml.includes('id="btn-toggle-dimension-mode"'), 'Toolbar must include floating dimension mode toggle');
        assert.ok(asiHtml.includes('id="toolbar-dimension-status"'), 'Toolbar must include status pill');

        // Check trig-core.js dual-mode wiring for Angle Sum Identities
        assert.ok(src.includes("computeSpatialAngleSumEuler(state.angleAlpha, state.angleBeta, state.angleGamma, R)"));
        assert.ok(src.includes("SO(3) Lie Group Euler Composition"));
        assert.ok(src.includes("Orthonormal Frame Triad & Metric Invariance"));
        assert.ok(src.includes("Planar SO(2) Principal Subgroup Embedding"));
        assert.ok(src.includes("Lie Algebra Trace & Rotation Angle"));
        assert.ok(src.includes("Parallelepiped Volume & Scalar Triple Product"));
        assert.ok(src.includes("2×2 Algebraic Determinant & Area Preserving Invariant"));
        assert.ok(src.includes("det(R) = R₀₀R₁₁ − R₀₁R₁₀"));
        assert.ok(src.includes("asi-step-5"));
        assert.ok(src.includes("slider-gamma"));
        assert.ok(src.includes("val-3d-gamma"));
        assert.ok(src.includes("val-3d-trace"));
        assert.ok(src.includes("val-3d-rot-angle"));
        assert.ok(src.includes("D_spatial = new THREE.Vector3(R * cosDiff, R * sinDiff * sinGamma, R * sinDiff * cosGamma)"), 'Spatial SO(3) mode must project difference vector D');
        assert.ok(src.includes("addSeg(e1, D_spatial, PALETTE.teal, true)"), 'Spatial SO(3) mode must draw rigid spatial chord PD');
        assert.ok(src.includes(".addScaledVector(e1, Math.cos(ang))"), 'Spatial SO(3) mode must construct tilted great circle wireframe spanned by {e1, e2}');

        // Spatial mode initial Euler tilt & planar reset invariant
        assert.ok(src.includes("angleGamma: toRadians(28)"), 'Switching to Spatial SO(3) must initialize non-zero Euler tilt');
        assert.ok(src.includes("angleGamma: 0"), 'Switching to Planar SO(2) must reset Euler tilt to 0');

        // Mode switch accessibility attribute synchronization (one shared helper presses every mode control)
        assert.ok(src.includes("el.setAttribute('aria-pressed', on ? 'true' : 'false')"), 'mode controls must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-planar', isPlanar)"), 'btnPlanar must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-spatial', isSpatial)"), 'btnSpatial must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-solid', isSolid)"), 'btnSolid must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-planar-pill', isPlanar)"), 'btnPlanarPill must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-spatial-pill', isSpatial)"), 'btnSpatialPill must sync aria-pressed');
        assert.ok(src.includes("press('btn-mode-solid-pill', isSolid)"), 'btnSolidPill must sync aria-pressed');

        // CSS stacking & title collision protection
        const trigCss = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/css/trig-suite.css'), 'utf-8');
        assert.ok(trigCss.includes('z-index: 25 !important;'), '.dimension-mode-bar must have z-index: 25 to float above 3D labels');
        assert.ok(trigCss.includes('max-width: calc(100% - var(--dimension-bar-clearance, 19.5rem)) !important;'), '#canvas-3d-container .view-title must prevent button collision');
        // Clearance must cover the pill's full footprint: right offset (8.2rem) + pill width + gap
        const clearanceMatch = trigCss.match(/#canvas-3d-container:has\(> \.dimension-mode-bar\)\s*\{\s*--dimension-bar-clearance:\s*([\d.]+)rem/);
        assert.ok(clearanceMatch && parseFloat(clearanceMatch[1]) >= 22, 'dimension pill clearance must reserve at least 22rem so the title cannot run under the pill');
        const visualPageJs = fs.readFileSync(path.join(ROOT_DIR, 'js/visual-page.js'), 'utf-8');
        assert.ok(visualPageJs.includes('initDimensionBarClearance();'), 'visual-page.js must measure the pill and publish --dimension-bar-clearance at runtime');
    });

    test('Law of Cosines dynamic ratio visual overlay, proportional gauge bar, and telemetry synchronization', () => {
        // 1. Math model exports ratio: cosRatio and projRatio
        const mAcute = computeLawOfCosines(8, 10, Math.PI / 3); // 60 deg, cos = 0.5
        assert.ok(mAcute.ratio, 'ratio must be defined on computeLawOfCosines');
        assert.ok(Math.abs(mAcute.ratio.cosRatio - 0.5) < 1e-5, 'cosRatio must equal 0.5 at 60 degrees');
        assert.ok(Math.abs(mAcute.ratio.projRatio - (8 * 0.5) / 10) < 1e-5, 'projRatio must equal (a cos C)/b');

        const mObtuse = computeLawOfCosines(8, 10, (2 * Math.PI) / 3); // 120 deg, cos = -0.5
        assert.ok(Math.abs(mObtuse.ratio.cosRatio - (-0.5)) < 1e-5, 'cosRatio must equal -0.5 at 120 degrees');
        assert.ok(Math.abs(mObtuse.ratio.projRatio - (8 * -0.5) / 10) < 1e-5, 'projRatio must equal negative fraction');

        // 2. HTML elements: Telemetry & Controls
        const locHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/law-of-cosines/index.html'), 'utf-8');
        assert.ok(locHtml.includes('id="tel-cos-ratio"'), '2D Telemetry must include tel-cos-ratio');
        assert.ok(locHtml.includes('id="tel-proj-frac"'), '2D Telemetry must include tel-proj-frac');
        assert.ok(locHtml.includes('id="val-3d-cos-ratio"'), '3D Telemetry must include val-3d-cos-ratio');
        assert.ok(locHtml.includes('id="row-3d-cos-ratio"'), '3D Telemetry must include row-3d-cos-ratio container');
        assert.ok(locHtml.includes('id="toggle-ratio-badge"'), '2D Controls must include toggle-ratio-badge checkbox');
        assert.ok(locHtml.includes('id="vis-3d-ratio"'), '3D Controls must include vis-3d-ratio checkbox');

        // 3. trig-core.js: state, binding, 2D overlay & gauge bar, 3D billboard badge, and telemetry
        assert.ok(src.includes("showRatioBadge: true"), 'Initial state must include showRatioBadge: true');
        assert.ok(src.includes("bindCheck(['toggle-ratio-badge', 'vis-3d-ratio'], 'showRatioBadge')"), 'Must bind ratio toggles in sync');
        assert.ok(src.includes("cos C = (a²+b²−c²)/(2ab) = ${m.cosC.toFixed(3)}"), '2D must render dynamic evaluation ratio badge');
        assert.ok(src.includes("Proj Ratio (a cos C)/b = ${projFrac.toFixed(3)}"), '2D must render proportional projection bar/gauge');
        assert.ok(src.includes("key: 'ratio-cos'"), '3D scene must push ratio-cos billboard label');
        assert.ok(src.includes("const cosColor = PALETTE.violet;"), 'Cosine Ratio evaluation badge (cos C) must use distinct PALETTE.violet token');
        assert.ok(src.includes("const barColor = PALETTE.amber;"), 'Proportional projection bar must be strictly Amber');
        assert.ok(src.includes("const projW = projFrac * trackW;"), 'Projection ratio fill slider must be strictly proportional to projFrac without premature clamping');
        assert.ok(src.includes("fillGrad.addColorStop(0, PALETTE.rose);"), 'Projection ratio fill gradient must include Rose for Angle C / Side c');
        assert.ok(src.includes("fillGrad.addColorStop(0.5, PALETTE.violet);"), 'Projection ratio fill gradient must include Violet for cos C');
        assert.ok(locHtml.includes('<span class="color-violet">cos C</span>'), 'HTML formulas must use distinct color-violet token for cos C');
        assert.ok(locHtml.includes('class="color-violet" id="tel-cos-ratio"'), '2D telemetry tel-cos-ratio must use color-violet');
        assert.ok(locHtml.includes('class="color-violet" id="val-3d-cos-ratio"'), '3D telemetry val-3d-cos-ratio must use color-violet');
        assert.ok(src.includes("tag('violet', 'cos C = (a²+b²−c²)/(2ab)')"), 'Derivations step 1 must use distinct violet token for Cosine Ratio formula');
        assert.ok(src.includes("setText('tel-cos-ratio', m.cosC.toFixed(4))"), '2D telemetry must set tel-cos-ratio');
        assert.ok(src.includes("setText('tel-proj-frac'"), '2D telemetry must set tel-proj-frac');
        assert.ok(src.includes("setText('val-3d-cos-ratio', m.cosC.toFixed(4))"), '3D telemetry must set val-3d-cos-ratio');
        assert.ok(src.includes("cos C = (a²+b²−c²)/(2ab)"), 'Derivations step 1 must align with Cosine Ratio formula');
    });

    test('Unit Circle Harmonic Audio Sonification: Web Audio API mathematical mapping and DOM wiring', async () => {
        const { thetaToFrequency, freqToNoteName, HarmonicSonifier, TUNING_PRESETS } = await import('../visuals/trigonometry/js/harmonic-sonifier.js');

        // 1. Frequency calculation: f(θ) = f0 * 2^(θ/2π)
        const baseFreq = 261.625565; // C4 Middle C
        assert.ok(Math.abs(thetaToFrequency(0, baseFreq) - 261.625565) < 1e-4, 'At 0 rad, frequency must be C4 (261.63 Hz)');
        assert.ok(Math.abs(thetaToFrequency(Math.PI, baseFreq) - 369.9944) < 1e-3, 'At π rad, frequency must be tritone F#4 (~370.00 Hz)');
        assert.ok(Math.abs(thetaToFrequency(1.5 * Math.PI, baseFreq) - 440.0) < 1e-3, 'At 3π/2 rad, frequency must be concert A4 (440.0 Hz)');
        assert.ok(Math.abs(thetaToFrequency(2 * Math.PI, baseFreq) - 261.625565) < 1e-4, 'At 2π rad, frequency wraps to octave C4');

        // 2. Note name mapping & Tuning Presets
        assert.ok(TUNING_PRESETS.standard && TUNING_PRESETS.verdi && TUNING_PRESETS.scientific && TUNING_PRESETS.baroque);
        assert.equal(freqToNoteName(261.63, 440), 'C4');
        assert.equal(freqToNoteName(440.0, 440), 'A4');
        assert.equal(freqToNoteName(523.25, 440), 'C5');
        assert.equal(freqToNoteName(432.0, 432), 'A4', 'Verdi 432 Hz maps to A4 under A=432 ref');
        assert.equal(freqToNoteName(415.0, 415), 'A4', 'Baroque 415 Hz maps to A4 under A=415 ref');

        // 3. Sonifier instance lifecycle & dynamic tuning standard switching (headless safe)
        const sonifier = new HarmonicSonifier({ baseFreq });
        assert.equal(sonifier.enabled, false, 'Audio must be muted/disabled by default (autoplay policy)');
        sonifier.update({ angleTheta: Math.PI / 2 });
        assert.ok(sonifier.currentFreq > 310 && sonifier.currentFreq < 312, 'Calculates frequency at 90 degrees (~311.1 Hz)');
        assert.equal(sonifier.currentNote, 'D#4');

        // Switch to Verdi tuning (A = 432 Hz, C = 256.87 Hz)
        sonifier.setTuning('verdi');
        assert.equal(sonifier.tuning, 'verdi');
        assert.ok(Math.abs(sonifier.baseFreq - 256.8687) < 1e-3);
        sonifier.update({ angleTheta: 1.5 * Math.PI }); // 270 degrees
        assert.ok(Math.abs(sonifier.currentFreq - 432.0) < 1e-3, 'At 270 deg in Verdi tuning, frequency must be exactly 432.0 Hz');
        assert.equal(sonifier.currentNote, 'A4');

        // Switch to Scientific tuning (C = 256.0 Hz = 2^8)
        sonifier.setTuning('scientific');
        assert.equal(sonifier.tuning, 'scientific');
        assert.equal(sonifier.baseFreq, 256.0);
        sonifier.update({ angleTheta: 0 });
        assert.equal(sonifier.currentFreq, 256.0);
        assert.equal(sonifier.currentNote, 'C4');

        // Switch to Baroque tuning (A = 415 Hz)
        sonifier.setTuning('baroque');
        assert.equal(sonifier.tuning, 'baroque');
        sonifier.update({ angleTheta: 1.5 * Math.PI });
        assert.ok(Math.abs(sonifier.currentFreq - 415.0) < 1e-3, 'At 270 deg in Baroque tuning, frequency must be 415.0 Hz');
        assert.equal(sonifier.currentNote, 'A4');

        sonifier.setVolume(0.75);
        assert.equal(sonifier.volume, 0.75);

        // 4. HTML elements in unit-circle-helix/index.html
        const uchHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/unit-circle-helix/index.html'), 'utf-8');
        assert.ok(uchHtml.includes('id="btn-toggle-sound"'), 'Toolbar must include #btn-toggle-sound');
        assert.ok(uchHtml.includes('id="sound-status-pill"'), 'Toolbar must include #sound-status-pill');
        assert.ok(uchHtml.includes('id="val-audio-freq"'), 'Telemetry must display live #val-audio-freq');
        assert.ok(uchHtml.includes('id="section-audio-sonification"'), 'Controls panel must have collapsible #section-audio-sonification');
        assert.ok(uchHtml.includes('id="check-audio-enable"'), 'Controls must include #check-audio-enable');
        assert.ok(uchHtml.includes('id="select-audio-tuning"'), 'Controls must include #select-audio-tuning dropdown');
        assert.ok(uchHtml.includes('id="slider-audio-volume"'), 'Controls must include volume slider');

        // 5. trig-core.js wiring
        assert.ok(src.includes("import { HarmonicSonifier } from './harmonic-sonifier.js'"), 'trig-core.js must import HarmonicSonifier');
        assert.ok(src.includes("sonifier = new HarmonicSonifier()"), 'trig-core.js must instantiate HarmonicSonifier for unit-circle-helix');
        assert.ok(src.includes("sonifier.update(state)"), 'trig-core.js must pipe state updates to sonifier');
    });

    test('Angle Sum Identities: 3D Spatial shading is unified with 2D and 3D Planar (stacked triangles, reflex wedge, right angles, and circle wire)', () => {
        // 1. In Spatial mode, stacked triangles OMQ, OQP, PSQ and difference triangle OQD are shaded with identical color tokens and opacity
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([O, M, Q])"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([O, Q, e1])"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([e1, S, Q])"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([O, Q, D_spatial])"));

        // 2. Straight Euclidean decomposition perimeter box segments and dropped altitudes in R^3
        assert.ok(src.includes("addSeg(Q, M, PALETTE.amber, true)"));
        assert.ok(src.includes("addSeg(e1, N_spatial, PALETTE.emerald, true)"));
        assert.ok(src.includes("addSeg(Q, S, PALETTE.amber, true)"));
        assert.ok(src.includes("addSeg(e1, S, PALETTE.amber, true)"));
        assert.ok(src.includes("addSeg(M, N_spatial, PALETTE.amber, true)"));

        // 3. Right angles at Q, M, N, and Ndiff in 3D spatial mode
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle1, Q, O, e1, 0.85, THREE)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle2, M, O, Q, 0.75, THREE)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle3, N_spatial, O, e1, 0.75, THREE)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle4, Ndiff_spatial, O, D_spatial, 0.75, THREE)"));

        // 4. Reflex conjugate wedge (alpha+beta)* in Teal is wired in 3D spatial mode
        assert.ok(src.includes("setAngleWedgeVertices3D(this.reflexWedge1, O, X_ref, e1, 3.6, 32, THREE, m.sumAngle <= Math.PI)"));

        // 5. Circle wire is dynamically aligned to the tilted Euler plane normal e3 in spatial mode, and reset to flat (0,1,0) in planar mode
        assert.ok(src.includes("alignCircleWireToPlane(this.circleWire, e3, O, R, THREE)"));
        assert.ok(src.includes("alignCircleWireToPlane(this.circleWire, new THREE.Vector3(0, 1, 0), O, R, THREE)"));
    });

    test('Mathematical Continuum & Unified 2D-3D Geometry Invariants (Sagitta, Curvature Contraction, Conformal Stereographic Projection, and Homotopy)', () => {
        // 1. Dual Export Integrity: circle-core.js and circle-3d.js both export continuum utilities
        assert.equal(typeof computeSagitta, 'function');
        assert.equal(typeof computeCurvatureRatio, 'function');
        assert.equal(typeof projectStereographicToEquator, 'function');
        assert.equal(typeof projectEquatorToSphere, 'function');
        assert.equal(typeof interpolateCurvatureHomotopy, 'function');
        assert.equal(typeof interpolateGeodesicChord, 'function');

        assert.equal(circle3D.computeSagitta, computeSagitta);
        assert.equal(circle3D.computeCurvatureRatio, computeCurvatureRatio);
        assert.equal(circle3D.projectStereographicToEquator, projectStereographicToEquator);
        assert.equal(circle3D.projectEquatorToSphere, projectEquatorToSphere);
        assert.equal(circle3D.interpolateCurvatureHomotopy, interpolateCurvatureHomotopy);
        assert.equal(circle3D.interpolateGeodesicChord, interpolateGeodesicChord);

        // 2. Sagitta Invariant: h = R * (1 - cos(theta / 2))
        const R = 10;
        assert.equal(computeSagitta(R, 0), 0, 'Sagitta at theta=0 is exactly 0');
        assert.ok(Math.abs(computeSagitta(R, Math.PI) - R) < 1e-12, 'Sagitta at theta=pi is R');
        assert.ok(Math.abs(computeSagitta(R, 2 * Math.PI) - 2 * R) < 1e-12, 'Sagitta at theta=2pi is 2R (diameter)');
        const h60 = computeSagitta(R, Math.PI / 3);
        const expectedH60 = R * (1 - Math.cos(Math.PI / 6));
        assert.ok(Math.abs(h60 - expectedH60) < 1e-12, 'Sagitta at 60 deg matches analytical formula');

        // Infinitesimal limit check: h -> R * theta^2 / 8
        const eps = 1e-4;
        const hEps = computeSagitta(R, eps);
        const hApprox = (R * eps * eps) / 8;
        assert.ok(Math.abs(hEps - hApprox) / hApprox < 1e-6, 'Sagitta converges quadratically to R*theta^2/8');

        // 3. Curvature Contraction Ratio Invariant: rho = sinc(theta / 2) = sin(theta / 2) / (theta / 2)
        assert.equal(computeCurvatureRatio(0), 1, 'rho(0) = 1 (Euclidean flat limit)');
        assert.ok(Math.abs(computeCurvatureRatio(1e-9) - 1) < 1e-12, 'rho(eps) smoothly approaches 1 without NaN');
        assert.ok(Math.abs(computeCurvatureRatio(Math.PI) - 2 / Math.PI) < 1e-12, 'rho(pi) = 2/pi');
        assert.ok(Math.abs(computeCurvatureRatio(2 * Math.PI)) < 1e-12, 'rho(2pi) = 0 (closed perigon chord is 0)');

        // Monotonicity on [0, pi]
        assert.ok(computeCurvatureRatio(0) > computeCurvatureRatio(Math.PI / 4));
        assert.ok(computeCurvatureRatio(Math.PI / 4) > computeCurvatureRatio(Math.PI / 2));
        assert.ok(computeCurvatureRatio(Math.PI / 2) > computeCurvatureRatio(Math.PI));

        // Invariant relation: chord / arc = rho
        for (const angle of [0.2, 0.5, 1.0, 1.5, 2.5]) {
            const chordLen = 2 * R * Math.sin(angle / 2);
            const arcLen = R * angle;
            const ratio = chordLen / arcLen;
            assert.ok(Math.abs(ratio - computeCurvatureRatio(angle)) < 1e-12, `chord/arc = rho for theta=${angle}`);
        }

        // 4. Conformal Stereographic Projection & Inversion
        // Equator invariant: Pi(x, 0, z) = (x, 0, z)
        const eqPt = { x: 6, y: 0, z: 8 };
        const projEq = projectStereographicToEquator(eqPt, R);
        assert.ok(Math.abs(projEq.x - 6) < 1e-12 && Math.abs(projEq.z - 8) < 1e-12 && projEq.y === 0);

        // South Pole (0, -R, 0) projects to origin (0, 0, 0)
        const southPole = { x: 0, y: -R, z: 0 };
        const projSouth = projectStereographicToEquator(southPole, R);
        assert.ok(Math.hypot(projSouth.x, projSouth.z) < 1e-12);

        // Bijective round-trip: Pi(Pi^-1(x, z)) = (x, z)
        for (const [px, pz] of [[3, 4], [-5, 7], [0, 9], [8, -6]]) {
            const sphPt = projectEquatorToSphere(px, pz, R);
            // Verify on sphere S^2(R)
            const normSq = sphPt.x * sphPt.x + sphPt.y * sphPt.y + sphPt.z * sphPt.z;
            assert.ok(Math.abs(normSq - R * R) < 1e-9, `Point must lie on sphere of radius ${R}`);

            // Inverse projection
            const flatPt = projectStereographicToEquator(sphPt, R);
            assert.ok(Math.abs(flatPt.x - px) < 1e-9, `Round trip X invariant: ${flatPt.x} vs ${px}`);
            assert.ok(Math.abs(flatPt.z - pz) < 1e-9, `Round trip Z invariant: ${flatPt.z} vs ${pz}`);
            assert.equal(flatPt.y, 0);
        }

        // 5. Curvature Homotopy Continuum: H(P, lambda)
        const pSph = { x: 0, y: -R, z: 0 };
        const hFlat = interpolateCurvatureHomotopy(pSph, 0, R);
        assert.equal(hFlat.y, 0, 'Lambda = 0 yields flat elevation Y = 0');
        assert.ok(Math.hypot(hFlat.x, hFlat.z) < 1e-12, 'South pole flat image is origin');

        const hSph = interpolateCurvatureHomotopy(pSph, 1, R);
        assert.ok(Math.abs(hSph.y - (-R)) < 1e-12, 'Lambda = 1 restores spherical elevation');

        // Equator is fixed invariant locus of homotopy
        const hEqMid = interpolateCurvatureHomotopy(eqPt, 0.42, R);
        assert.ok(Math.abs(hEqMid.x - eqPt.x) < 1e-12 && Math.abs(hEqMid.z - eqPt.z) < 1e-12 && hEqMid.y === 0);

        // 6. Geodesic-to-Chord Continuum: interpolateGeodesicChord
        const pA = { x: R, y: 0, z: 0 };
        const pB = { x: 0, y: 0, z: R }; // 90 degree arc on equator
        const chordMid = interpolateGeodesicChord(pA, pB, 0.5, 0, R);
        const expectedChordMid = { x: R / 2, y: 0, z: R / 2 };
        assert.ok(Math.abs(chordMid.x - expectedChordMid.x) < 1e-12);
        assert.ok(Math.abs(chordMid.z - expectedChordMid.z) < 1e-12);
        const distFromCenterChord = Math.hypot(chordMid.x, chordMid.z);

        const sphMid = interpolateGeodesicChord(pA, pB, 0.5, 1, R);
        const distFromCenterSph = Math.hypot(sphMid.x, sphMid.z);
        assert.ok(Math.abs(distFromCenterSph - R) < 1e-12, 'Spherical geodesic midpoint lies on sphere radius R');

        // Sagitta difference
        const midDiff = distFromCenterSph - distFromCenterChord;
        const sagitta90 = computeSagitta(R, Math.PI / 2);
        assert.ok(Math.abs(midDiff - sagitta90) < 1e-12, 'Sagitta exactly matches elevation gap between chord and geodesic');
    });

    test('Initial page enter: 2D Planar Canvas lifecycle bootstrap and zero-dimension layout resilience across all 4 Trigonometry visualizers', async () => {
        const trigSlugs = ['angle-sum-identities', 'law-of-sines', 'law-of-cosines', 'unit-circle-helix'];

        // 1. All 4 HTML entry points must use resilient readyState guard (never bare DOMContentLoaded inside module)
        for (const slug of trigSlugs) {
            const htmlPath = path.join(ROOT_DIR, 'visuals/trigonometry', slug, 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
            assert.ok(
                html.includes("if (document.readyState === 'loading')"),
                `${slug}/index.html must check document.readyState === 'loading'`
            );
            assert.ok(
                html.includes("window.addEventListener('DOMContentLoaded', init);"),
                `${slug}/index.html must register DOMContentLoaded fallback`
            );
            assert.ok(
                html.includes("} else {\n      init();\n    }"),
                `${slug}/index.html must execute init() immediately when DOM is already interactive/complete`
            );
        }

        // 2. TrigCanvas2DView.render() must self-heal via resize() if width/height were unmeasured or 0 at constructor time
        const { TrigCanvas2DView, createTrigInitialState } = await import('../visuals/trigonometry/js/trig-core.js');
        let resizeCalled = false;
        let mockWidth = 0;
        let mockHeight = 0;

        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: () => new Proxy({}, {
                get(target, prop) {
                    if (prop in target) return target[prop];
                    if (prop === 'measureText') return () => ({ width: 10 });
                    return () => {};
                },
                set(target, prop, val) {
                    target[prop] = val;
                    return true;
                }
            }),
            setAttribute: () => {},
            hasAttribute: () => true,
        };

        const mockContainer = {
            getBoundingClientRect: () => ({ width: mockWidth, height: mockHeight }),
            clientWidth: 0,
            clientHeight: 0,
        };

        const view = new TrigCanvas2DView(mockCanvas, mockContainer, 'angle-sum-identities');
        assert.equal(view.width, 0, 'Initial width must be 0 when container is unlaid');

        // Now container gains layout dimensions after HTML/CSS paint
        mockWidth = 480;
        mockHeight = 440;
        mockContainer.clientWidth = 480;
        mockContainer.clientHeight = 440;

        const st = createTrigInitialState('angle-sum-identities');
        // Calling render() when width was previously 0 must automatically invoke resize() and paint without early-return abort
        view.render(st);

        assert.equal(view.width, 480, 'view.render() must self-heal width by calling resize()');
        assert.equal(view.height, 440, 'view.render() must self-heal height by calling resize()');
        assert.equal(view.canvas.width >= 480, true, 'canvas width must be initialized');

        // 3. trig-core.js mountTrigVisual queues a secondary requestAnimationFrame resize pass
        const src = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8').replace(/\r\n/g, '\n');
        assert.ok(
            src.includes("requestAnimationFrame(() => {\n      view2d.resize();\n      scene3d.resize();\n    });"),
            'mountTrigVisual must queue dual-pass resize on requestAnimationFrame to guarantee layout reflow paint'
        );
    });

    test('TrigScene3DView: angle-sum-identities renders rich 3D geometry in planar and spatial modes without TDZ reference error', async () => {
        const { TrigScene3DView, createTrigInitialState } = await import('../visuals/trigonometry/js/trig-core.js');

        const mockContainer = {
            appendChild: () => {},
            getBoundingClientRect: () => ({ width: 800, height: 600 }),
            clientWidth: 800,
            clientHeight: 600,
            querySelector: () => null,
            querySelectorAll: () => [],
            dataset: {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {},
            removeEventListener: () => {},
        };

        class Vector2 {
            constructor(x = 0, y = 0) { this.x = x; this.y = y; }
            set() { return this; }
        }
        class Vector3 {
            constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
            copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
            set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
            clone() { return new Vector3(this.x, this.y, this.z); }
            add() { return this; }
            addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
            sub() { return this; }
            subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
            multiplyScalar() { return this; }
            addScaledVector() { return this; }
            normalize() { return this; }
            crossVectors() { return this; }
            dot() { return 1; }
            length() { return 1; }
            lengthSq() { return 1; }
            distanceTo() { return 1; }
            setScalar() { return this; }
            negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
            project() { return this; }
            angleTo() { return 0.5; }
            applyAxisAngle() { return this; }
        }
        class Group {
            constructor() { this.children = []; this.position = new Vector3(); }
            add(...objs) { this.children.push(...objs); }
            remove() {}
            clear() { this.children = []; }
        }
        class Mesh {
            constructor() {
                this.children = [];
                this.position = new Vector3();
                this.rotation = new Vector3();
                this.material = { color: { set: () => {} }, dispose: () => {} };
                this.scale = new Vector3();
                this.quaternion = { setFromUnitVectors: () => {} };
                this.geometry = { setFromPoints: () => {}, setAttribute: () => {}, computeVertexNormals: () => {}, dispose: () => {} };
            }
            add(...objs) { this.children.push(...objs); }
            remove() {}
        }
        class Line {
            constructor() {
                this.children = [];
                this.position = new Vector3();
                this.rotation = new Vector3();
                this.material = { color: { set: () => {} }, dispose: () => {} };
                this.scale = new Vector3();
                this.geometry = { setFromPoints: () => {}, setAttribute: () => {}, computeVertexNormals: () => {}, dispose: () => {} };
                this.quaternion = { setFromUnitVectors: () => {} };
            }
            add(...objs) { this.children.push(...objs); }
            computeLineDistances() {}
        }
        class BufferGeometry {
            constructor() { this.attributes = {}; }
            setFromPoints() { return this; }
            setIndex() { return this; }
            setAttribute() { return this; }
            computeVertexNormals() {}
            dispose() {}
        }
        class Quaternion {
            constructor() {}
            setFromAxisAngle() { return this; }
            setFromUnitVectors() { return this; }
        }
        const mockResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        const mockTHREE = {
            Vector2, Vector3, Group, Mesh, Line, BufferGeometry, Quaternion,
            Color: class { constructor() {} set() {} },
            LineBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
            LineDashedMaterial: class {},
            MeshBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
            MeshPhysicalMaterial: class { constructor() { this.color = { set: () => {} }; } },
            MeshStandardMaterial: class { constructor() { this.color = { set: () => {} }; } },
            SphereGeometry: class {},
            RingGeometry: class {},
            ConeGeometry: class {},
            CylinderGeometry: class {},
            CircleGeometry: class {},
            DoubleSide: 2,
            BufferAttribute: class { constructor() {} },
            Float32BufferAttribute: class { constructor() {} },
            ArrowHelper: class { constructor() { this.line = { material: {} }; this.cone = { material: {} }; } },
            PerspectiveCamera: class {
                constructor() { this.position = new Vector3(); this.up = new Vector3(); }
                updateProjectionMatrix() {}
                lookAt() {}
            },
            WebGLRenderer: class {
                constructor() { this.domElement = mockContainer; }
                setSize() {}
                setPixelRatio() {}
                render() {}
            },
            Scene: class { constructor() { this.children = []; } add(obj) { this.children.push(obj); } },
            AmbientLight: class {},
            DirectionalLight: class { constructor() { this.position = new Vector3(); } },
            GridHelper: class { constructor() { this.position = new Vector3(); } },
            Raycaster: class { constructor() {} setFromCamera() {} intersectObjects() { return []; } }
        };

        const prevResizeObserver = global.ResizeObserver;
        const prevRAF = global.requestAnimationFrame;
        const prevCAF = global.cancelAnimationFrame;
        const prevWindow = global.window;
        const prevDoc = global.document;
        global.ResizeObserver = mockResizeObserver;
        global.requestAnimationFrame = (cb) => {};
        global.cancelAnimationFrame = () => {};
        global.window = {
            devicePixelRatio: 1,
            addEventListener: () => {},
            removeEventListener: () => {},
        };
        global.document = {
            createElement: () => ({
                appendChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                dataset: {},
                style: {},
                classList: { add: () => {}, remove: () => {} },
            }),
        };

        try {
            const trigSlugs = ['angle-sum-identities', 'law-of-sines', 'law-of-cosines', 'unit-circle-helix'];
            for (const vId of trigSlugs) {
                const scene = new TrigScene3DView(mockTHREE, mockContainer, vId);
                scene.controls = { target: new Vector3(), update: () => {} };
                const state = createTrigInitialState(vId);

                // 1. Planar mode render
                assert.doesNotThrow(() => {
                    scene.render(state);
                }, `TrigScene3DView.render in planar mode must not throw ReferenceError for ${vId}`);
                assert.ok(scene.dynamicGroup.children.length >= 8, `${vId} Planar mode must populate dynamicGroup with vectors, wedges, and lines`);

                // 2. Spatial mode render
                state.dimensionMode = 'spatial';
                assert.doesNotThrow(() => {
                    scene.render(state);
                }, `TrigScene3DView.render in spatial mode must not throw for ${vId}`);
                assert.ok(scene.dynamicGroup.children.length >= 8, `${vId} Spatial mode must populate dynamicGroup with 3D geometry`);
            }
        } finally {
            global.ResizeObserver = prevResizeObserver;
            global.requestAnimationFrame = prevRAF;
            global.cancelAnimationFrame = prevCAF;
            global.window = prevWindow;
            global.document = prevDoc;
        }
    });

    test('Law of Cosines: Full-plane interaction, unconstrained 2D/3D vertex dragging, translation handle C, and locus toggle', async () => {
        const { TrigCanvas2DView, TrigScene3DView, createTrigInitialState } = await import('../visuals/trigonometry/js/trig-core.js');

        // 1. 2D Interactive Handles Invariant: Vertex C, A, B, and vertices2D
        const mockCanvas = {
            width: 800,
            height: 600,
            getContext: () => new Proxy({}, {
                get(target, prop) {
                    if (prop in target) return target[prop];
                    if (prop === 'measureText') return () => ({ width: 10 });
                    return () => {};
                },
                set(target, prop, val) {
                    target[prop] = val;
                    return true;
                }
            }),
            setAttribute: () => {},
            hasAttribute: () => true,
        };

        const mockContainer = {
            getBoundingClientRect: () => ({ width: 800, height: 600 }),
            clientWidth: 800,
            clientHeight: 600,
            appendChild: () => {},
            querySelector: () => null,
            querySelectorAll: () => [],
            dataset: {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {},
            removeEventListener: () => {},
        };

        const prevResizeObserver = global.ResizeObserver;
        const prevRAF = global.requestAnimationFrame;
        const prevCAF = global.cancelAnimationFrame;
        const prevWindow = global.window;
        const prevDoc = global.document;

        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        global.requestAnimationFrame = () => {};
        global.cancelAnimationFrame = () => {};
        global.window = { devicePixelRatio: 1, addEventListener: () => {}, removeEventListener: () => {} };
        global.document = {
            createElement: () => ({
                appendChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                dataset: {},
                style: {},
                classList: { add: () => {}, remove: () => {} },
            }),
        };

        try {
            const view2d = new TrigCanvas2DView(mockCanvas, mockContainer, 'law-of-cosines');
            const state = createTrigInitialState('law-of-cosines');
            const info = view2d.getInteractiveHandles2D(state);

            assert.ok(info.handles && info.handles.length >= 3, 'Law of Cosines 2D handles must contain at least B, A, C');
            const handleB = info.handles.find(h => h.id === 'B');
            const handleA = info.handles.find(h => h.id === 'A');
            const handleC = info.handles.find(h => h.id === 'C');

            assert.ok(handleB, 'Handle B must exist in interactive handles');
            assert.equal(handleB.field, 'angleC', 'Handle B must be bound to angleC & sideA');
            assert.ok(handleB.scale > 0, 'Handle B must supply scale for full-plane sideA calculation');

            assert.ok(handleA, 'Handle A must exist in interactive handles');
            assert.equal(handleA.field, 'sideB', 'Handle A must be bound to sideB');

            assert.ok(handleC, 'Handle C must exist in interactive handles for direct whole-graphic translation');
            assert.equal(handleC.field, 'pan', 'Handle C must be bound to pan');

            assert.ok(info.vertices2D, 'info must provide vertices2D for hit testing edges and triangle interior');
            assert.ok(info.vertices2D.A && info.vertices2D.B && info.vertices2D.C && info.vertices2D.D, 'vertices2D must include A, B, C, D');

            // 2. 3D Draggable Targets Invariant: Planar Dragging of B scales sideA & angleC without perimeter lock
            class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set() { return this; } }
            class Vector3 {
                constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
                copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
                set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
                clone() { return new Vector3(this.x, this.y, this.z); }
                add() { return this; }
                addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
                sub() { return this; }
                subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
                multiplyScalar() { return this; }
                addScaledVector() { return this; }
                normalize() { return this; }
                crossVectors() { return this; }
                dot() { return 1; }
                length() { return 1; }
                lengthSq() { return 1; }
                distanceTo() { return 1; }
                setScalar() { return this; }
                negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
                project() { return this; }
                angleTo() { return 0.5; }
                applyAxisAngle() { return this; }
            }
            class Group { constructor() { this.children = []; } add(child) { this.children.push(child); } clear() { this.children = []; } }
            class Mesh {
                constructor() {
                    this.children = [];
                    this.position = new Vector3();
                    this.rotation = new Vector3();
                    this.scale = new Vector3(1, 1, 1);
                    this.material = { color: { set: () => {} }, opacity: 1, transparent: false };
                    this.visible = true;
                    this.quaternion = { setFromUnitVectors: () => {}, identity: () => {} };
                    this.geometry = { setFromPoints: () => {}, setAttribute: () => {}, computeVertexNormals: () => {}, dispose: () => {} };
                }
                add(...objs) { this.children.push(...objs); }
                remove() {}
            }
            class Line extends Mesh {
                constructor() { super(); }
                computeLineDistances() {}
            }
            class BufferGeometry {
                setFromPoints() { return this; }
                setAttribute() { return this; }
                setIndex() { return this; }
            }
            const mockTHREE = {
                Vector2,
                Vector3,
                Group,
                Mesh,
                Line,
                BufferGeometry,
                Color: class { constructor() {} set() { return this; } setHex() { return this; } },
                Quaternion: class { constructor() {} setFromUnitVectors() {} identity() {} },
                ArrowHelper: class { constructor() { this.line = { material: {} }; this.cone = { material: {} }; } },
                BufferAttribute: class { constructor() {} },
                GridHelper: class { constructor() { this.position = new Vector3(); } },
                Float32BufferAttribute: class {},
                LineBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
                LineDashedMaterial: class {},
                MeshBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
                MeshPhysicalMaterial: class { constructor() { this.color = { set: () => {} }; } },
                MeshStandardMaterial: class { constructor() { this.color = { set: () => {} }; } },
                SphereGeometry: class {},
                CylinderGeometry: class {},
                RingGeometry: class {},
                ConeGeometry: class {},
                CircleGeometry: class {},
                DoubleSide: 2,
                WebGLRenderer: class {
                    constructor() {
                        this.domElement = {
                            style: {},
                            addEventListener: () => {},
                            removeEventListener: () => {},
                            focus: () => {},
                            setAttribute: () => {},
                            hasAttribute: () => true,
                            width: 800,
                            height: 600,
                        };
                    }
                    setSize() {}
                    setPixelRatio() {}
                    render() {}
                    dispose() {}
                },
                PerspectiveCamera: class {
                    constructor() {
                        this.position = new Vector3(0, 0, 10);
                        this.quaternion = { setFromUnitVectors: () => {}, identity: () => {} };
                        this.up = new Vector3(0, 1, 0);
                    }
                    lookAt() {}
                    updateProjectionMatrix() {}
                },
                Scene: class {
                    constructor() { this.children = []; }
                    add(child) { this.children.push(child); }
                    remove() {}
                },
                AmbientLight: class {},
                DirectionalLight: class {
                    constructor() { this.position = new Vector3(); }
                },
                Raycaster: class {
                    setFromCamera() {}
                    intersectObjects() { return []; }
                },
            };

            const scene3d = new TrigScene3DView(mockTHREE, mockContainer, 'law-of-cosines');
            scene3d.controls = { target: new Vector3(), update: () => {} };

            let updatedState = null;
            const mockStore = {
                get: () => state,
                set: (partial) => { updatedState = { ...state, ...partial }; },
            };

            const targetB = scene3d.draggableTargets.find(t => t.id === 'B');
            assert.ok(targetB, '3D scene must register draggable target B for Law of Cosines');

            // Drag B to hit { x: 6, y: 0, z: 8 } (distance from origin = 10, angle = atan2(8, 6))
            targetB.onDrag(0, new Vector3(6, 0, 8), mockStore);
            assert.ok(updatedState, 'Dragging 3D target B must invoke store.set');
            assert.ok(Math.abs(updatedState.angleC - Math.atan2(8, 6)) < 0.01, '3D dragging B must update angleC');
            assert.ok(updatedState.sideA >= 2 && updatedState.sideA <= 12, '3D dragging B must scale sideA within [2, 12]');

            const targetA = scene3d.draggableTargets.find(t => t.id === 'A');
            assert.ok(targetA, '3D scene must register draggable target A for Law of Cosines');
            targetA.onDrag(0, new Vector3(12, 0, 0), mockStore);
            assert.ok(updatedState.sideB >= 2 && updatedState.sideB <= 12, '3D dragging A must scale sideB');

            const targetC = scene3d.draggableTargets.find(t => t.id === 'C');
            assert.ok(targetC, '3D scene must register draggable target C for Law of Cosines');

            // 3. HTML Controls Invariant: toggle-locus-circle exists in index.html and is bound in trig-core.js
            const htmlSrc = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/law-of-cosines/index.html'), 'utf8');
            assert.ok(htmlSrc.includes('id="toggle-locus-circle"'), 'law-of-cosines index.html must contain toggle-locus-circle checkbox');

            const coreSrc = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8');
            assert.ok(coreSrc.includes("bindCheck(['toggle-locus-circle', 'vis-2d-circle'], 'showLocusCircle')"), 'trig-core.js must bind toggle-locus-circle to showLocusCircle');
            assert.ok(coreSrc.includes('state.showLocusCircle !== false'), 'trig-core.js must respect showLocusCircle toggle');
        } finally {
            global.ResizeObserver = prevResizeObserver;
            global.requestAnimationFrame = prevRAF;
            global.cancelAnimationFrame = prevCAF;
            global.window = prevWindow;
            global.document = prevDoc;
        }
    });

    test('Law of Cosines 3D: spatial mode locus circle & unified shading across planar, spatial, and solid modes', async () => {
        const { TrigScene3DView, createTrigInitialState } = await import('../visuals/trigonometry/js/trig-core.js');
        const prevResizeObserver = global.ResizeObserver;
        const prevRAF = global.requestAnimationFrame;
        const prevCAF = global.cancelAnimationFrame;
        const prevWindow = global.window;
        const prevDoc = global.document;

        global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        global.requestAnimationFrame = () => {};
        global.cancelAnimationFrame = () => {};
        global.window = { devicePixelRatio: 1, addEventListener: () => {}, removeEventListener: () => {} };
        global.document = {
            createElement: () => ({
                appendChild: () => {},
                removeChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                dataset: {},
                style: {},
                classList: { add: () => {}, remove: () => {}, contains: () => false },
            }),
        };

        class Vector2 {
            constructor(x = 0, y = 0) { this.x = x; this.y = y; }
            set(x, y) { this.x = x; this.y = y; return this; }
        }
        class Vector3 {
            constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
            set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
            copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
            clone() { return new Vector3(this.x, this.y, this.z); }
            sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
            subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
            add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
            addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
            addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
            normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
            multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
            dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
            cross(v) { return this.crossVectors(this, v); }
            crossVectors(a, b) {
                const ax = a.x, ay = a.y, az = a.z;
                const bx = b.x, by = b.y, bz = b.z;
                this.x = ay * bz - az * by;
                this.y = az * bx - ax * bz;
                this.z = ax * by - ay * bx;
                return this;
            }
            length() { return Math.hypot(this.x, this.y, this.z); }
            lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
            setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
            negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
            project() { return this; }
            distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
            angleTo(v) {
                const theta = this.dot(v) / (Math.sqrt(this.lengthSq() * v.lengthSq()) || 1);
                return Math.acos(Math.max(-1, Math.min(1, theta)));
            }
            applyAxisAngle(axis, angle) {
                const c = Math.cos(angle), s = Math.sin(angle);
                const dot = this.dot(axis);
                const cross = new Vector3().crossVectors(axis, this);
                this.set(
                    this.x * c + cross.x * s + axis.x * dot * (1 - c),
                    this.y * c + cross.y * s + axis.y * dot * (1 - c),
                    this.z * c + cross.z * s + axis.z * dot * (1 - c)
                );
                return this;
            }
        }
        class Group {
            constructor() { this.children = []; this.visible = true; this.position = new Vector3(); this.scale = new Vector3(1, 1, 1); }
            add(...objs) { this.children.push(...objs); }
            remove() {}
        }
        class Mesh {
            constructor() {
                this.children = [];
                this.position = new Vector3();
                this.rotation = new Vector3();
                this.scale = new Vector3(1, 1, 1);
                this.material = { color: { set: () => {}, clone: () => new mockTHREE.Color() }, opacity: 1, transparent: false };
                this.visible = true;
                this.quaternion = { setFromUnitVectors: () => {}, identity: () => {} };
                this.geometry = { setFromPoints: () => {}, setAttribute: () => {}, setIndex: () => {}, computeVertexNormals: () => {}, dispose: () => {} };
                this.userData = {};
            }
            add(...objs) { this.children.push(...objs); }
            remove() {}
        }
        class Line extends Mesh {
            constructor() { super(); }
            computeLineDistances() {}
        }
        class BufferGeometry {
            setFromPoints() { return this; }
            setAttribute() { return this; }
            setIndex() { return this; }
        }
        const mockTHREE = {
            Vector2,
            Vector3,
            Group,
            Mesh,
            Line,
            BufferGeometry,
            Color: class { constructor(c = 0) { this.val = c; } set(c) { this.val = c; return this; } setHex(c) { this.val = c; return this; } clone() { return new mockTHREE.Color(this.val); } },
            Quaternion: class { constructor() {} setFromUnitVectors() {} identity() {} },
            ArrowHelper: class { constructor() { this.line = { material: {} }; this.cone = { material: {} }; } },
            BufferAttribute: class { constructor() {} },
            GridHelper: class { constructor() { this.position = new Vector3(); } },
            Float32BufferAttribute: class {},
            LineBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
            LineDashedMaterial: class {},
            MeshBasicMaterial: class { constructor() { this.color = { set: () => {} }; } },
            MeshPhysicalMaterial: class { constructor() { this.color = { set: () => {} }; } },
            MeshStandardMaterial: class { constructor() { this.color = { set: () => {} }; } },
            SphereGeometry: class {},
            CylinderGeometry: class {},
            RingGeometry: class {},
            ConeGeometry: class {},
            CircleGeometry: class {},
            DoubleSide: 2,
            WebGLRenderer: class {
                constructor() {
                    this.domElement = {
                        style: {},
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        focus: () => {},
                        setAttribute: () => {},
                        hasAttribute: () => true,
                        width: 800,
                        height: 600,
                    };
                }
                setSize() {}
                setPixelRatio() {}
                render() {}
                dispose() {}
            },
            PerspectiveCamera: class {
                constructor() {
                    this.position = new Vector3(0, 0, 10);
                    this.quaternion = { setFromUnitVectors: () => {}, identity: () => {} };
                    this.up = new Vector3(0, 1, 0);
                }
                lookAt() {}
                updateProjectionMatrix() {}
            },
            Scene: class {
                constructor() { this.children = []; }
                add(child) { this.children.push(child); }
                remove() {}
            },
            AmbientLight: class {},
            DirectionalLight: class {
                constructor() { this.position = new Vector3(); }
            },
            Raycaster: class {
                setFromCamera() {}
                intersectObjects() { return []; }
            },
        };

        const mockContainer = {
            appendChild: () => {},
            removeChild: () => {},
            getBoundingClientRect: () => ({ width: 800, height: 600 }),
            clientWidth: 800,
            clientHeight: 600,
            querySelector: () => null,
            querySelectorAll: () => [],
            dataset: {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {},
            removeEventListener: () => {},
        };

        try {
            const scene = new TrigScene3DView(mockTHREE, mockContainer, 'law-of-cosines');
            scene.controls = { target: new Vector3(), update: () => {} };

            // 1. Planar Mode Rendering
            const statePlanar = createTrigInitialState('law-of-cosines');
            statePlanar.dimensionMode = 'planar';
            scene.render(statePlanar);
            assert.ok(scene.circleWire.visible, 'Planar mode must show locus circle');
            assert.strictEqual(scene.circleInfo.center.x, 0);
            assert.strictEqual(scene.circleInfo.center.y, 0);
            assert.strictEqual(scene.circleInfo.center.z, 0);

            // 2. Spatial S² Mode Rendering: locus circle is around C, not concyclic circumcircle
            const stateSpatial = createTrigInitialState('law-of-cosines');
            stateSpatial.dimensionMode = 'spatial';
            scene.render(stateSpatial);
            assert.ok(scene.circleWire.visible, 'Spatial mode must respect showLocusCircle');
            assert.ok(scene.circleInfo, 'Spatial mode must provide circleInfo for locus circle');
            // In spatial mode, circle center must NOT be at 0,0,0 and radius must be R*sin(a/R)
            const R = scene.R || 10;
            const expectedRadius = R * Math.sin(stateSpatial.sideA / R);
            assert.ok(Math.abs(scene.circleInfo.radius - expectedRadius) < 0.1, 'Spatial locus circle radius must be R*sin(a/R)');
            // And C must be at distance R from origin, not on circleWire circumference
            const distCFromLocusCenter = Math.hypot(
                scene.handleC.position.x - scene.circleInfo.center.x,
                scene.handleC.position.y - scene.circleInfo.center.y,
                scene.handleC.position.z - scene.circleInfo.center.z
            );
            assert.ok(Math.abs(distCFromLocusCenter - scene.circleInfo.radius) > 1.0, 'Vertex C must NOT lie on the locus circle circumference');

            // 3. Solid Mode Rendering: unified shading and interaction rectangle
            const stateSolid = createTrigInitialState('law-of-cosines');
            stateSolid.dimensionMode = 'solid';
            scene.render(stateSolid);
            assert.ok(scene.circleWire.visible, 'Solid mode must respect showLocusCircle');
            const hasSolidSkipMesh = scene.dynamicGroup.children.some(c => c.userData?.solidSkip === true);
            assert.ok(hasSolidSkipMesh, 'Solid mode must render interaction rectangle with solidSkip to prevent double extrusion');
            const hasSolidColorMesh = scene.dynamicGroup.children.some(c => c.userData?.solidColor);
            assert.ok(hasSolidColorMesh, 'Solid mode sub-triangles must provide solidColor for SolidMorph companion shading');

            // 4. Source invariant: spatial mode does not call computeConcyclicPlaneAndCircle for law-of-cosines
            const coreSrc = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8');
            const locSpatialBlock = coreSrc.slice(coreSrc.indexOf("this.visualId === 'law-of-cosines'"), coreSrc.indexOf("this.visualId === 'law-of-cosines'") + 2000);
            assert.ok(!locSpatialBlock.includes("computeConcyclicPlaneAndCircle(C, A, B"), 'Law of Cosines spatial mode must not compute concyclic circumcircle');
        } finally {
            global.ResizeObserver = prevResizeObserver;
            global.requestAnimationFrame = prevRAF;
            global.cancelAnimationFrame = prevCAF;
            global.window = prevWindow;
            global.document = prevDoc;
        }
    });
});
