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
} from '../trigonometry/js/trig-math.js';

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

describe('Trigonometry Suite — Self-Contained Folder Structure', () => {
    test('All 4 visualizers and suite catalog exist inside trigonometry/', () => {
        const expectedFiles = [
            'trigonometry/index.html',
            'trigonometry/data/trig-visuals.json',
            'trigonometry/css/trig-suite.css',
            'trigonometry/js/trig-math.js',
            'trigonometry/js/trig-core.js',
            'trigonometry/unit-circle-helix/index.html',
            'trigonometry/law-of-sines/index.html',
            'trigonometry/law-of-cosines/index.html',
            'trigonometry/angle-sum-identities/index.html',
        ];
        for (const relPath of expectedFiles) {
            const fullPath = path.join(ROOT_DIR, relPath);
            assert.equal(fs.existsSync(fullPath), true, `Expected ${relPath} to exist`);
        }

        const catalog = JSON.parse(
            fs.readFileSync(path.join(ROOT_DIR, 'trigonometry/data/trig-visuals.json'), 'utf8')
        );
        assert.equal(Array.isArray(catalog), true);
        assert.equal(catalog.length, 4);
    });
});
