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
    computeLawOfCosines,
    computeAngleSumIdentities,
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

    test('computeLawOfCosines satisfies c^2 = a^2 + b^2 - 2ab cos C and mixed partial = -2 cos C', () => {
        const state = computeLawOfCosines(8, 10, Math.PI / 3);
        assert.ok(state.invariants.cosineLawResidual < 1e-11);
        assert.ok(state.invariants.altitudePythagorasResidual < 1e-11);
        assert.ok(state.invariants.mixedPartialResidual < 1e-11);
        assert.equal(state.projection.idempotentVerified, true);
        assert.equal(state.invariants.isVerified, true);
    });

    test('computeAngleSumIdentities satisfies R(a+b) = R(a)R(b) and addition/subtraction formulas', () => {
        const state = computeAngleSumIdentities(Math.PI / 6, Math.PI / 4, 1.0);
        assert.ok(state.invariants.cosSumResidual < 1e-12);
        assert.ok(state.invariants.sinSumResidual < 1e-12);
        assert.ok(state.invariants.cosDiffResidual < 1e-12);
        assert.ok(state.invariants.sinDiffResidual < 1e-12);
        assert.equal(state.invariants.matrixCompositionVerified, true);
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
    });

    test('Angle Sum dropped line from P to X-axis is fully represented in 3D with right angle at N', () => {
        assert.ok(src.includes("addSeg(P, N, PALETTE.emerald, true)"));
        assert.ok(src.includes("addSeg(O, N, PALETTE.amber)"));
        assert.ok(src.includes("setRightAngle3DVertices(this.rightAngle3, N, O, P"));
    });
});
