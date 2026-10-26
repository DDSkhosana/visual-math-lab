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
            const html = fs.readFileSync(htmlPath, 'utf8');
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
    const src = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8');

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
    });

    test('derivations use collapsible cardTemplate with unit-aware formatting and reflex shading', () => {
        assert.ok(/import \{[^}]*cardTemplate[^}]*\} from '\.\.\/\.\.\/\.\.\/js\/circle-derivations\.js'/.test(src));
        assert.ok(src.includes('fmtAngle(') && src.includes('fmtLength'));
        assert.ok(src.includes('drawReflexWedge'));
        assert.ok(src.includes('vis3d.reflex'));
    });
});

describe('Trigonometry Suite — Axiomatic Invariants, Synchronization & Unified Colour Grammar', () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/js/trig-core.js'), 'utf8');

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

        // 3. 2D visual representation of sin(α−β) altitude in Rose and cos(α−β) in Amber
        assert.ok(src.includes("const Ndiff = toScreen(m.points2D.N_diff);"));
        assert.ok(src.includes("ctx.strokeStyle = PALETTE.rose;"));
        assert.ok(src.includes("ctx.moveTo(Pdiff.x, Pdiff.y);"));
        assert.ok(src.includes("ctx.lineTo(Ndiff.x, Ndiff.y);"));
        assert.ok(src.includes("drawRightAngle(ctx, Ndiff, O, Pdiff, 10, PALETTE.rose)"));
        assert.ok(src.includes("sin(α−β) ="));
        assert.ok(src.includes("drawLabelledPoint(ctx, Ndiff, PALETTE.amber, getPointLabel('N_D', m.points2D.N_diff.x * r, m.points2D.N_diff.y * r, vis), -10, -12, 3.5)"));

        // 4. 3D visual representation: handleC pick target, dropped altitude, rightAngle4, badges
        assert.ok(src.includes("store.set({ angleBeta: normalizeAngle(alpha - angle) });"));
        assert.ok(src.includes("addSeg(Pdiff, Ndiff, PALETTE.rose, true)"));
        assert.ok(src.includes("addSeg(O, Ndiff, PALETTE.amber)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle4, Ndiff, O, Pdiff"));
        assert.ok(src.includes("key: 'sin-diff-len'"));
        assert.ok(src.includes("key: 'cos-diff-len'"));
        assert.ok(src.includes("key: 'Ndiff', name: 'N_D'"));

        // 5. Telemetry HTML color token harmonization: cos(α-β) in Amber, sin(α-β) in Rose
        const asHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/angle-sum-identities/index.html'), 'utf-8');
        assert.ok(asHtml.includes('<span class="color-amber">cos(α − β):</span><strong class="color-amber" id="tel-cos-diff">'));
        assert.ok(asHtml.includes('<span class="color-rose">sin(α − β):</span><strong class="color-rose" id="tel-sin-diff">'));

        // 6. Axiomatic decomposition triangles △PSQ and △OQD in 2D, 3D, and derivations
        assert.ok(src.includes("Upper Right Triangle △PSQ (Amber)"));
        assert.ok(src.includes("rgba(251, 191, 36, 0.14)"));
        assert.ok(src.includes("drawRightAngle(ctx, S, P, Q, 9, PALETTE.amber)"));
        assert.ok(src.includes("Difference Right Triangle Shading (△OQD)"));
        assert.ok(src.includes("rgba(244, 63, 94, 0.14)"));
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

        // Colour Grammar Standard: 2ab cos C rectangle & badges are invariant in Amber
        assert.ok(src.includes("const rectColor = PALETTE.amber;"), '3D interaction rectangle mesh must be strictly Amber');
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

        // HTML 2D & 3D Telemetry coherence for all 6 trig functions
        const uchHtml = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/unit-circle-helix/index.html'), 'utf-8');
        assert.ok(uchHtml.includes('id="val-3d-tan"'), '3D Telemetry must include tan θ');
        assert.ok(uchHtml.includes('id="val-3d-sec"'), '3D Telemetry must include sec θ');
        assert.ok(uchHtml.includes('id="val-3d-cot"'), '3D Telemetry must include cot θ');
        assert.ok(uchHtml.includes('id="val-3d-csc"'), '3D Telemetry must include csc θ');
        assert.ok(uchHtml.includes('id="tel-o-coords"'), '2D Telemetry must include point coordinates');
        assert.ok(uchHtml.includes('id="val-3d-peq-coords"'), '3D Telemetry must include 3D point coordinates');
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

        // Check trig-core.js dual-mode wiring
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
        assert.ok(src.includes("btnToggleDim.classList.toggle('active', isSpatial)"));
        assert.ok(src.includes("new THREE.BufferGeometry().setFromPoints([Ap, B, C])"), '3D planar mode must shade Thales right-triangle mesh in Amber');
        assert.ok(src.includes("const rLift = R * 1.002;"), '3D spherical cap must have radial lift offset to prevent Z-fighting');
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
        assert.ok(src.includes("addSeg(e1, D_spatial, PALETTE.rose, true)"), 'Spatial SO(3) mode must draw rigid spatial chord PD');

        // Spatial mode initial Euler tilt & planar reset invariant
        assert.ok(src.includes("angleGamma: toRadians(28)"), 'Switching to Spatial SO(3) must initialize non-zero Euler tilt');
        assert.ok(src.includes("angleGamma: 0"), 'Switching to Planar SO(2) must reset Euler tilt to 0');

        // Mode switch accessibility attribute synchronization
        assert.ok(src.includes("btnPlanar.setAttribute('aria-pressed'"), 'btnPlanar must sync aria-pressed');
        assert.ok(src.includes("btnSpatial.setAttribute('aria-pressed'"), 'btnSpatial must sync aria-pressed');
        assert.ok(src.includes("btnPlanarPill.setAttribute('aria-pressed'"), 'btnPlanarPill must sync aria-pressed');
        assert.ok(src.includes("btnSpatialPill.setAttribute('aria-pressed'"), 'btnSpatialPill must sync aria-pressed');

        // CSS stacking & title collision protection
        const trigCss = fs.readFileSync(path.join(ROOT_DIR, 'visuals/trigonometry/css/trig-suite.css'), 'utf-8');
        assert.ok(trigCss.includes('z-index: 25 !important;'), '.dimension-mode-bar must have z-index: 25 to float above 3D labels');
        assert.ok(trigCss.includes('max-width: calc(100% - 19.5rem) !important;'), '#canvas-3d-container .view-title must prevent button collision');
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
        assert.ok(src.includes("const barColor = PALETTE.amber;"), 'Ratio evaluation badge & proportional bar must be strictly Amber');
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
});
