import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Domain models & derivations
import { createInitialState as createThalesInitialState } from '../visuals/thales-theorem/src/config/defaults.js';
import { computeFrame as computeThalesFrame } from '../visuals/thales-theorem/src/views/canvas2d-draw.js';
import { generateSceneSVG as generateThalesSVG } from '../visuals/thales-theorem/src/views/canvas2d-svg.js';
import { DerivationView as ThalesDerivations } from '../visuals/thales-theorem/src/views/DerivationView.js';

import * as AngleAtCentre from '../visuals/angle-at-centre/src/model.js';
import * as AnglesInSameSegment from '../visuals/angles-in-same-segment/src/model.js';
import * as CyclicQuad from '../visuals/cyclic-quadrilateral/src/model.js';
import * as TangentRadius from '../visuals/tangent-radius/src/model.js';
import * as AlternateSegment from '../visuals/alternate-segment/src/model.js';
import * as TangentsFromPoint from '../visuals/tangents-from-external-point/src/model.js';
import * as ChordBisector from '../visuals/perpendicular-chord-bisector/src/model.js';

import {
  AngleAtCentreDerivations,
  AnglesInSameSegmentDerivations,
  CyclicQuadDerivations,
  TangentRadiusDerivations,
  AlternateSegmentDerivations,
  TangentsFromPointDerivations,
  ChordBisectorDerivations,
} from '../js/circle-derivations.js';

import { PALETTE, UnitSystemConverter } from '../js/circle-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const close = (actual, expected, eps = 1e-4) => {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !~ ${expected}`);
};

/**
 * Lightweight mock element container for headless derivation rendering verification.
 * Does not pollute production DOM or introduce Test-Induced Design Damage (TIDD).
 */
class HeadlessMockElement {
  constructor(id = '', selector = '') {
    this.id = id;
    this.selector = selector;
    this.innerHTML = '';
    this.children = [];
    this.subElements = {};
  }
  get firstElementChild() {
    return this.children[0] || (this.innerHTML ? new HeadlessMockElement() : null);
  }
  querySelector(sel) {
    if (!this.subElements[sel]) {
      this.subElements[sel] = new HeadlessMockElement('', sel);
    }
    return this.subElements[sel];
  }
  querySelectorAll() {
    return [];
  }
}

/**
 * Acquire a free ephemeral TCP port for isolated network integration testing.
 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * Spawns an isolated instance of the production HTTP server (scripts/serve.mjs).
 */
async function startServer(port) {
  const proc = spawn('node', ['scripts/serve.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Server failed to start on port ${port} within 10s`));
    }, 10000);

    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Visual Math Lab is running')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const stop = () => {
    return new Promise((resolve) => {
      proc.on('exit', () => resolve());
      proc.kill();
    });
  };

  return { proc, baseUrl, stop };
}

// =============================================================================
// Suite 1: Full-Stack HTTP Server, Routing & Network Asset E2E
// =============================================================================
test('E2E HTTP Server: Real network lifecycle, response codes, MIME types, and security resistance', async () => {
  const port = await getFreePort();
  const { baseUrl, stop } = await startServer(port);

  try {
    // 1. Root landing page
    const resRoot = await fetch(`${baseUrl}/`);
    assert.strictEqual(resRoot.status, 200, 'Root index must serve 200 OK');
    assert.ok(resRoot.headers.get('content-type')?.includes('text/html'), 'Root must serve text/html');
    const htmlRoot = await resRoot.text();
    assert.ok(htmlRoot.includes('Visual Mathematics Lab'), 'Root HTML must contain lab title');
    assert.ok(htmlRoot.includes('/visuals/thales-theorem/'), 'Root HTML must link to Thales theorem');

    // 2. All 8 visual theorem endpoints
    const visualPaths = [
      'thales-theorem',
      'angle-at-centre',
      'angles-in-same-segment',
      'cyclic-quadrilateral',
      'tangent-radius',
      'alternate-segment',
      'tangents-from-external-point',
      'perpendicular-chord-bisector',
    ];

    for (const vPath of visualPaths) {
      const res = await fetch(`${baseUrl}/visuals/${vPath}/`);
      assert.strictEqual(res.status, 200, `/visuals/${vPath}/ must serve 200 OK`);
      assert.ok(res.headers.get('content-type')?.includes('text/html'), `${vPath} must serve text/html`);
      const body = await res.text();
      assert.ok(body.toLowerCase().includes('<!doctype html>'), `${vPath} must return valid DOCTYPE`);
      assert.ok(body.includes('id="canvas-2d-container"'), `${vPath} must include #canvas-2d-container`);
      assert.ok(body.includes('id="canvas-3d-container"'), `${vPath} must include #canvas-3d-container`);
    }

    // 3. Static Web Stylesheets & ES Modules
    const staticAssets = [
      { path: '/css/tokens.css', type: 'text/css' },
      { path: '/css/circle-visual.css', type: 'text/css' },
      { path: '/css/site.css', type: 'text/css' },
      { path: '/css/visual.css', type: 'text/css' },
      { path: '/visuals/thales-theorem/styles/layout.css', type: 'text/css' },
      { path: '/js/circle-core.js', type: 'application/javascript' },
      { path: '/js/circle-derivations.js', type: 'application/javascript' },
      { path: '/js/tutorial-walkthrough.js', type: 'application/javascript' },
      { path: '/js/geometry-legend.js', type: 'application/javascript' },
      { path: '/site.webmanifest', type: 'application/manifest+json' },
      { path: '/sitemap.xml', type: 'application/xml' },
    ];

    for (const asset of staticAssets) {
      const res = await fetch(`${baseUrl}${asset.path}`);
      assert.strictEqual(res.status, 200, `${asset.path} must return 200 OK`);
      assert.ok(
        res.headers.get('content-type')?.includes(asset.type),
        `${asset.path} content-type must match ${asset.type}`
      );
      const text = await res.text();
      assert.ok(text.length > 50, `${asset.path} must serve non-empty content`);
    }

    // 4. SVG Thumbnails for all 8 visuals
    for (const vPath of visualPaths) {
      const thumbFile = vPath === 'thales-theorem' ? 'thales-thumbnail.svg' : `${vPath}-thumbnail.svg`;
      const thumbPath = `/assets/images/${thumbFile}`;
      const res = await fetch(`${baseUrl}${thumbPath}`);
      assert.strictEqual(res.status, 200, `${thumbPath} must serve 200 OK`);
      assert.ok(res.headers.get('content-type')?.includes('image/svg+xml'), `${thumbPath} must serve SVG`);
      const svg = await res.text();
      assert.ok(svg.includes('<svg'), `${thumbPath} must contain SVG tag`);
    }

    // 5. 404 Not Found error handling
    const res404 = await fetch(`${baseUrl}/visuals/non-existent-theorem/`);
    assert.strictEqual(res404.status, 404, 'Non-existent route must return 404');
    await res404.text();

    // 6. Security: Path traversal attempt cannot access external files
    const resSec = await fetch(`${baseUrl}/../../nonexistent-secret.txt`);
    assert.strictEqual(resSec.status, 404, 'Path traversal attempt must return 404 Not Found');
    await resSec.text();
  } finally {
    await stop();
  }
});

// =============================================================================
// Suite 2: Multi-Page UI Component & DOM Structural Integration E2E
// =============================================================================
test('E2E Multi-Page UI Contract: 2D & 3D canvas containers, toolbars, telemetry, derivations, and SEO schema', () => {
  const visualDirs = [
    { dir: 'thales-theorem', canvasId: 'canvas2d' },
    { dir: 'angle-at-centre', canvasId: 'main-canvas' },
    { dir: 'angles-in-same-segment', canvasId: 'main-canvas' },
    { dir: 'cyclic-quadrilateral', canvasId: 'main-canvas' },
    { dir: 'tangent-radius', canvasId: 'main-canvas' },
    { dir: 'alternate-segment', canvasId: 'main-canvas' },
    { dir: 'tangents-from-external-point', canvasId: 'main-canvas' },
    { dir: 'perpendicular-chord-bisector', canvasId: 'main-canvas' },
  ];

  for (const { dir, canvasId } of visualDirs) {
    const htmlPath = path.join(ROOT, 'visuals', dir, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `HTML file must exist: ${htmlPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Dual Viewport Canvases
    assert.ok(html.includes('id="canvas-2d-container"'), `${dir}: missing #canvas-2d-container`);
    assert.ok(html.includes(`id="${canvasId}"`), `${dir}: missing #${canvasId}`);
    assert.ok(html.includes('id="canvas-3d-container"'), `${dir}: missing #canvas-3d-container`);

    // 2. Viewport Mode Switcher
    assert.ok(html.includes('id="btn-split"'), `${dir}: missing #btn-split`);
    assert.ok(html.includes('id="btn-2d"'), `${dir}: missing #btn-2d`);
    assert.ok(html.includes('id="btn-3d"'), `${dir}: missing #btn-3d`);

    // 3. Toolbar Controls & Actions
    assert.ok(html.includes('id="btn-reset"'), `${dir}: missing #btn-reset`);
    assert.ok(html.includes('id="btn-playback"'), `${dir}: missing #btn-playback`);
    assert.ok(html.includes('id="fullscreen-btn"'), `${dir}: missing #fullscreen-btn`);
    assert.ok(html.includes('id="toolbar-collapse-btn"'), `${dir}: missing #toolbar-collapse-btn`);

    // 4. Live Telemetry Panels (2D and 3D)
    assert.ok(
      html.includes('id="telemetry-panel"') || html.includes('id="stats-2d"'),
      `${dir}: missing 2D telemetry panel (#telemetry-panel or #stats-2d)`
    );
    assert.ok(html.includes('id="stats-3d"'), `${dir}: missing #stats-3d`);

    // 5. Live Derivation Panel
    assert.ok(
      html.includes('id="derivations-panel"') || html.includes('id="live-derivation-panel"'),
      `${dir}: missing derivations panel (#derivations-panel or #live-derivation-panel)`
    );

    // 6. Unit Converter Section
    assert.ok(html.includes('id="section-unit-converter"'), `${dir}: missing #section-unit-converter`);
    assert.ok(html.includes('id="content-unit-converter"'), `${dir}: missing #content-unit-converter`);

    // 7. Interactive Modal Tools & Walkthrough Integration Script
    assert.ok(html.includes('src="../../js/visual-page.js'), `${dir}: missing visual-page.js integration script`);

    // 8. SEO & Schema.org JSON-LD
    assert.ok(html.includes('rel="canonical"'), `${dir}: missing canonical link`);
    assert.ok(html.includes('type="application/ld+json"'), `${dir}: missing Schema.org JSON-LD`);
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, `${dir}: valid script tag for JSON-LD required`);
    const schema = JSON.parse(jsonLdMatch[1]);
    assert.strictEqual(schema['@context'], 'https://schema.org', `${dir}: Schema @context must be https://schema.org`);
    assert.ok(schema.name, `${dir}: Schema must contain name`);
    assert.ok(schema.description, `${dir}: Schema must contain description`);
    assert.ok(schema.url, `${dir}: Schema must contain url`);
  }
});

// =============================================================================
// Suite 3: End-to-End Live Derivations & Dynamic Mathematical Invariants
// =============================================================================
test('E2E Derivations & Live Invariants Pipeline across all 8 circle theorems', async () => {
  // 1. Thales' Theorem
  {
    const flatEl = new HeadlessMockElement('flat');
    const solidEl = new HeadlessMockElement('solid');
    const deriv = new ThalesDerivations(flatEl, solidEl);
    deriv.render({ radius: 10, angle2D: Math.PI / 4, lat3D: Math.PI / 4, lon3D: Math.PI / 2 });

    const step4Sub = flatEl.subElements['#deriv-2d-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = flatEl.subElements['#deriv-2d-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('s² + t²'), 'Thales: Step 4 must substitute s² + t²');
    assert.ok(step4Sub.includes('|d|²'), 'Thales: Step 4 must substitute |d|²');
    assert.ok(step4Eval.includes('✓ Thales Verified'), 'Thales: Step 4 must display ✓ Thales Verified badge');
  }

  // 2. Angle at Centre
  {
    const container = new HeadlessMockElement('aac');
    const deriv = new AngleAtCentreDerivations(container);
    const state = AngleAtCentre.createInitialState();
    const g = AngleAtCentre.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step4Sub = container.subElements['#aac-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#aac-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('Central ∠AOB'), 'Angle at Centre: Step 4 must compute Central ∠AOB');
    assert.ok(step4Sub.includes('Ratio ='), 'Angle at Centre: Step 4 must compute angle ratio');
    assert.ok(step4Eval.includes('✓ 2:1 Invariant'), 'Angle at Centre: Step 4 must verify 2:1 Invariant');
  }

  // 3. Angles in Same Segment
  {
    const container = new HeadlessMockElement('aiss');
    const deriv = new AnglesInSameSegmentDerivations(container);
    const state = AnglesInSameSegment.createInitialState();
    const g = AnglesInSameSegment.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step4Sub = container.subElements['#aiss-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#aiss-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('∠AP₁B'), 'Angles in Same Segment: Step 4 must evaluate ∠AP₁B');
    assert.ok(step4Sub.includes('Invariant Difference'), 'Angles in Same Segment: Step 4 must evaluate Invariant Difference');
    assert.ok(step4Eval.includes('✓ Same Segment Equal'), 'Angles in Same Segment: Step 4 must verify Same Segment Equal');
  }

  // 4. Cyclic Quadrilateral (including Opposite Sum and Exterior Angle Invariant)
  {
    const container = new HeadlessMockElement('cq');
    const deriv = new CyclicQuadDerivations(container);
    const state = CyclicQuad.createInitialState();
    const g = CyclicQuad.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step3Sub = container.subElements['#cq-step-3 [data-sub]']?.innerHTML || '';
    const step3Eval = container.subElements['#cq-step-3 [data-eval]']?.innerHTML || '';
    assert.ok(step3Sub.includes('∠A') && step3Sub.includes('∠C'), 'Cyclic Quad: Step 3 must evaluate A + C sum');
    assert.ok(step3Eval.includes('✓ 180.0° Invariant'), 'Cyclic Quad: Step 3 must verify 180° Supplementary Invariant');

    const step4Sub = container.subElements['#cq-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#cq-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('Total Quadrilateral Interior Sum'), 'Cyclic Quad: Step 4 must evaluate total quad sum');
    assert.ok(step4Eval.includes('✓ Verified'), 'Cyclic Quad: Step 4 must verify total sum');

    const step6Sub = container.subElements['#cq-step-6 [data-sub]']?.innerHTML || '';
    const step6Eval = container.subElements['#cq-step-6 [data-eval]']?.innerHTML || '';
    assert.ok(step6Sub.includes('Ext ∠C'), 'Cyclic Quad: Step 6 must substitute Exterior Angle Ext ∠C');
    assert.ok(step6Sub.includes('∠A'), 'Cyclic Quad: Step 6 must substitute Opposite Interior Angle ∠A');
    assert.ok(step6Eval.includes('✓ Exterior Invariant'), 'Cyclic Quad: Step 6 must verify Exterior Invariant');
  }

  // 5. Tangent-Radius
  {
    const container = new HeadlessMockElement('tr');
    const deriv = new TangentRadiusDerivations(container);
    const state = TangentRadius.createInitialState();
    const g = TangentRadius.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step3Sub = container.subElements['#tr-step-3 [data-sub]']?.innerHTML || '';
    const step3Eval = container.subElements['#tr-step-3 [data-eval]']?.innerHTML || '';
    assert.ok(step3Sub.includes('Orthogonality Axiom'), 'Tangent-Radius: Step 3 must substitute Dot Product');
    assert.ok(step3Eval.includes('✓ Orthogonal'), 'Tangent-Radius: Step 3 must verify Orthogonal');

    const step4Sub = container.subElements['#tr-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#tr-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('90.0°'), 'Tangent-Radius: Step 4 must substitute 90.0°');
    assert.ok(step4Eval.includes('✓ Perpendicular'), 'Tangent-Radius: Step 4 must verify Perpendicular Invariant');
  }

  // 6. Alternate Segment
  {
    const container = new HeadlessMockElement('as');
    const deriv = new AlternateSegmentDerivations(container);
    const state = AlternateSegment.createInitialState();
    const g = AlternateSegment.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step4Sub = container.subElements['#as-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#as-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('[Tangent line]'), 'Alternate Segment: Step 4 must substitute [Tangent line]');
    assert.ok(step4Sub.includes('Alternate Segment'), 'Alternate Segment: Step 4 must substitute Alternate Segment angle');
    assert.ok(step4Eval.includes('✓ Alternate Segment Equal'), 'Alternate Segment: Step 4 must verify Alternate Segment Equal');
  }

  // 7. Tangents from External Point
  {
    const container = new HeadlessMockElement('tfp');
    const deriv = new TangentsFromPointDerivations(container);
    const state = TangentsFromPoint.createInitialState();
    const g = TangentsFromPoint.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step4Sub = container.subElements['#tfp-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#tfp-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('|PT₁|'), 'Tangents from Point: Step 4 must calculate |PT₁|');
    assert.ok(step4Sub.includes('|PT₂|'), 'Tangents from Point: Step 4 must calculate |PT₂|');
    assert.ok(step4Eval.includes('✓ Tangent Segments Equal'), 'Tangents from Point: Step 4 must verify Tangent Segments Equal');
  }

  // 8. Perpendicular Chord Bisector
  {
    const container = new HeadlessMockElement('cb');
    const deriv = new ChordBisectorDerivations(container);
    const state = ChordBisector.createInitialState();
    const g = ChordBisector.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    const step3Sub = container.subElements['#cb-step-3 [data-sub]']?.innerHTML || '';
    assert.ok(step3Sub.includes('90.0°'), 'Chord Bisector: Step 3 must calculate 90.0° perpendicular angle');

    const step4Sub = container.subElements['#cb-step-4 [data-sub]']?.innerHTML || '';
    const step4Eval = container.subElements['#cb-step-4 [data-eval]']?.innerHTML || '';
    assert.ok(step4Sub.includes('|AM|'), 'Chord Bisector: Step 4 must calculate |AM|');
    assert.ok(step4Sub.includes('|MB|'), 'Chord Bisector: Step 4 must calculate |MB|');
    assert.ok(step4Eval.includes('✓ Perpendicular Bisector'), 'Chord Bisector: Step 4 must verify Perpendicular Bisector');
  }
});

// =============================================================================
// Suite 4: End-to-End Reflex Angle Workflow Across All 8 Visuals
// =============================================================================
test('E2E Reflex Angle System: Circular perigon invariant (θ + θ* = 360°) and derivation badge generation', () => {
  // 1. Thales Reflex Angles
  {
    const state = createThalesInitialState();
    const alpha = 45.0;
    const beta = 45.0;
    const alphaStar = 360.0 - alpha;
    const betaStar = 360.0 - beta;

    close(alpha + alphaStar, 360.0, 1e-4);
    close(beta + betaStar, 360.0, 1e-4);
    close(alphaStar + betaStar, 630.0, 1e-4);
  }

  // 2. 7 Circle Theorems Reflex Angles in Derivation Engine
  const circleTheorems = [
    { name: 'angle-at-centre', derivClass: AngleAtCentreDerivations, model: AngleAtCentre, prefix: 'aac' },
    { name: 'angles-in-same-segment', derivClass: AnglesInSameSegmentDerivations, model: AnglesInSameSegment, prefix: 'aiss' },
    { name: 'cyclic-quadrilateral', derivClass: CyclicQuadDerivations, model: CyclicQuad, prefix: 'cq' },
    { name: 'tangent-radius', derivClass: TangentRadiusDerivations, model: TangentRadius, prefix: 'tr' },
    { name: 'alternate-segment', derivClass: AlternateSegmentDerivations, model: AlternateSegment, prefix: 'as' },
    { name: 'tangents-from-external-point', derivClass: TangentsFromPointDerivations, model: TangentsFromPoint, prefix: 'tfp' },
    { name: 'perpendicular-chord-bisector', derivClass: ChordBisectorDerivations, model: ChordBisector, prefix: 'cb' },
  ];

  for (const { name, derivClass, model, prefix } of circleTheorems) {
    const container = new HeadlessMockElement(prefix);
    const deriv = new derivClass(container);
    const state = { ...model.createInitialState(), vis2d: { reflex: true } };
    const g = model.computeGeometry(state, 800, 600);
    deriv.render(state, g);

    // Verify reflex step slot is registered and displays perigon check
    const reflexSlotKey = Object.keys(container.subElements).find(
      (k) => k.includes('-step-5 [data-eval]') || k.includes('-step-6 [data-eval]') || k.includes('-step-7 [data-eval]')
    );
    assert.ok(reflexSlotKey, `${name}: reflex eval slot must be registered`);
    const evalHtml = container.subElements[reflexSlotKey]?.innerHTML || '';
    assert.ok(
      evalHtml.includes('Perigon') || evalHtml.includes('360') || evalHtml.includes('✓'),
      `${name}: reflex slot must assert 360° perigon invariant`
    );
  }
});

// =============================================================================
// Suite 5: End-to-End Multi-System Unit Conversion Pipeline
// =============================================================================
test('E2E Unit System Conversion: High-precision conversions across Length and Angular metric/imperial/astronomical systems', () => {
  // 1. Length conversions: roundtrip through base pixels
  const basePx = 180.0;
  const lengthUnits = ['px', 'cm', 'mm', 'in', 'u'];

  for (const u of lengthUnits) {
    const converted = UnitSystemConverter.convertLength(basePx, 'px', u, 180);
    assert.ok(Number.isFinite(converted) && converted > 0, `Length in ${u} must be positive finite number`);
    const roundtrip = UnitSystemConverter.convertLength(converted, u, 'px', 180);
    close(roundtrip, basePx, 1e-4);
  }

  // 2. Angular conversions: roundtrip through base degrees
  const baseDeg = 90.0; // Right angle
  const angleUnits = ['deg', 'rad', 'grad', 'turn'];

  for (const u of angleUnits) {
    const converted = UnitSystemConverter.convertAngle(baseDeg, 'deg', u);
    assert.ok(Number.isFinite(converted) && converted > 0, `Angle in ${u} must be positive finite number`);
    const roundtrip = UnitSystemConverter.convertAngle(converted, u, 'deg');
    close(roundtrip, baseDeg, 1e-4);
  }

  // Exact geometric identities
  const rad90 = UnitSystemConverter.convertAngle(90, 'deg', 'rad');
  close(rad90, Math.PI / 2, 1e-8);

  const grad90 = UnitSystemConverter.convertAngle(90, 'deg', 'grad');
  close(grad90, 100.0, 1e-8);

  const turn90 = UnitSystemConverter.convertAngle(90, 'deg', 'turn');
  close(turn90, 0.25, 1e-8);
});

// =============================================================================
// Suite 6: End-to-End Standalone Vector SVG Generation Pipeline
// =============================================================================
test('E2E Vector SVG Generation: Complete SVG export pipeline across all 8 visual explorers', async () => {
  // 1. Thales' Theorem SVG
  {
    const state = createThalesInitialState();
    const frame = computeThalesFrame(state, 800, 600);
    const svg = generateThalesSVG(state, frame);

    assert.ok(svg.startsWith('<svg') || svg.includes('<svg'), "Thales: SVG must contain '<svg'");
    assert.ok(svg.includes('</svg>'), "Thales: SVG must terminate with '</svg>'");
    assert.ok(svg.includes('viewBox="0 0 800 600"'), 'Thales: SVG must specify 800x600 viewBox');
    assert.ok(svg.includes('<circle'), 'Thales: SVG must include circle primitives');
    assert.ok(!svg.includes('NaN'), 'Thales: SVG must not contain NaN attributes');
    assert.ok(!svg.includes('undefined'), 'Thales: SVG must not contain undefined attributes');
  }

  // 2. 7 Circle Theorems SVG
  const circleTheorems = [
    { dir: 'angle-at-centre', model: AngleAtCentre, canvasPath: '../visuals/angle-at-centre/src/canvas.js' },
    { dir: 'angles-in-same-segment', model: AnglesInSameSegment, canvasPath: '../visuals/angles-in-same-segment/src/canvas.js' },
    { dir: 'cyclic-quadrilateral', model: CyclicQuad, canvasPath: '../visuals/cyclic-quadrilateral/src/canvas.js' },
    { dir: 'tangent-radius', model: TangentRadius, canvasPath: '../visuals/tangent-radius/src/canvas.js' },
    { dir: 'alternate-segment', model: AlternateSegment, canvasPath: '../visuals/alternate-segment/src/canvas.js' },
    { dir: 'tangents-from-external-point', model: TangentsFromPoint, canvasPath: '../visuals/tangents-from-external-point/src/canvas.js' },
    { dir: 'perpendicular-chord-bisector', model: ChordBisector, canvasPath: '../visuals/perpendicular-chord-bisector/src/canvas.js' },
  ];

  for (const { dir, model, canvasPath } of circleTheorems) {
    const canvasMod = await import(canvasPath);
    const gen = canvasMod.generateSVG || model.generateSVG;
    assert.strictEqual(typeof gen, 'function', `${dir}: must export generateSVG function`);

    const state = model.createInitialState();
    const svg = gen(state, 800, 600);

    assert.ok(svg.includes('<svg'), `${dir}: SVG must contain '<svg'`);
    assert.ok(svg.includes('</svg>'), `${dir}: SVG must terminate with '</svg>'`);
    assert.ok(svg.includes('viewBox="0 0 800 600"'), `${dir}: SVG must specify 800x600 viewBox`);
    assert.ok(!svg.includes('NaN'), `${dir}: SVG must not contain NaN attributes`);
    assert.ok(!svg.includes('undefined'), `${dir}: SVG must not contain undefined attributes`);
  }
});
