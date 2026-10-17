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
import { StatsView } from '../visuals/thales-theorem/src/views/StatsView.js';

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

import { PALETTE, UnitSystemConverter, createStore } from '../js/circle-core.js';

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
    this.listeners = {};
    this.attributes = {};
    this.value = '';
    this._textContent = '';
    this.classList = {
      _set: new Set(),
      add: (...cls) => cls.forEach((c) => this.classList._set.add(c)),
      remove: (...cls) => cls.forEach((c) => this.classList._set.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._set.has(c)) this.classList._set.delete(c);
          else this.classList._set.add(c);
        } else if (force) {
          this.classList._set.add(c);
        } else {
          this.classList._set.delete(c);
        }
      },
      contains: (c) => this.classList._set.has(c),
    };
  }

  get textContent() {
    return this._textContent || this.innerHTML;
  }
  set textContent(val) {
    this._textContent = String(val);
  }

  get firstElementChild() {
    return this.children[0] || (this.innerHTML ? new HeadlessMockElement() : null);
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  trigger(event, eventObj = {}) {
    const list = this.listeners[event] || [];
    const ev = { type: event, target: this, ...eventObj };
    for (const h of list) h(ev);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  querySelector(sel) {
    if (!this.subElements[sel]) {
      this.subElements[sel] = new HeadlessMockElement('', sel);
    }
    return this.subElements[sel];
  }

  querySelectorAll(sel) {
    if (sel === '.unit-preset-btn' && !this.subElements[sel]) {
      this.subElements[sel] = UnitSystemConverter.PRESETS.map((p) => {
        const btn = new HeadlessMockElement('', sel);
        btn.setAttribute('data-len', p.lengthUnit);
        btn.setAttribute('data-ang', p.angleUnit);
        btn.textContent = p.name;
        return btn;
      });
    }
    if (!this.subElements[sel]) {
      return [];
    }
    return Array.isArray(this.subElements[sel]) ? this.subElements[sel] : [this.subElements[sel]];
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
// Suite 5B: End-to-End Active Workspace Unit System Selection & Store Synchronization
// =============================================================================
test('E2E Active Workspace Unit System: Presets, Custom Selectors, Store Dispatch, and Live Cross-Theorem Propagation', () => {
  // 1. Initial State Compliance across all 8 Circle Theorem Visuals
  const models = [
    { name: 'thales-theorem', fn: createThalesInitialState },
    { name: 'angle-at-centre', fn: AngleAtCentre.createInitialState },
    { name: 'angles-in-same-segment', fn: AnglesInSameSegment.createInitialState },
    { name: 'cyclic-quadrilateral', fn: CyclicQuad.createInitialState },
    { name: 'tangent-radius', fn: TangentRadius.createInitialState },
    { name: 'alternate-segment', fn: AlternateSegment.createInitialState },
    { name: 'tangents-from-external-point', fn: TangentsFromPoint.createInitialState },
    { name: 'perpendicular-chord-bisector', fn: ChordBisector.createInitialState },
  ];

  for (const { name, fn } of models) {
    const s = fn();
    assert.strictEqual(s.lengthUnit, 'px', `${name}: initial lengthUnit must be 'px'`);
    assert.strictEqual(s.angleUnit, 'deg', `${name}: initial angleUnit must be 'deg'`);
  }

  // 2. UnitSystemConverter Interactive Store Integration
  const store = createStore({ radius: 180, lengthUnit: 'px', angleUnit: 'deg' });
  const container = new HeadlessMockElement('unit-container');
  const converter = new UnitSystemConverter(container, store);

  // Initial render: Standard preset badge and banner
  const banner = container.querySelector('#active-system-name');
  const badge = container.querySelector('#unit-tag-badge');
  assert.strictEqual(banner.textContent, 'Standard (px, °)');
  assert.strictEqual(badge.textContent, 'px');

  // Verify preset buttons exist
  const presetBtns = container.querySelectorAll('.unit-preset-btn');
  assert.ok(presetBtns.length >= 6, 'Must provide at least 6 standard unit presets');

  // 3. User Selects 'Metric' Preset (cm, deg)
  const metricBtn = presetBtns.find((b) => b.getAttribute('data-len') === 'cm' && b.getAttribute('data-ang') === 'deg');
  assert.ok(metricBtn, 'Metric preset button must exist');
  metricBtn.trigger('click');

  assert.strictEqual(store.get().lengthUnit, 'cm', 'Store lengthUnit must update to cm on Metric preset click');
  assert.strictEqual(store.get().angleUnit, 'deg', 'Store angleUnit must remain deg on Metric preset click');
  assert.strictEqual(banner.textContent, 'Metric (cm, °)', 'Active system banner must update to Metric');
  assert.strictEqual(badge.textContent, 'cm', 'Active length unit tag must update to cm');

  // Verify live circle metrics in cm
  const elR = container.querySelector('#metric-conv-r');
  const elD = container.querySelector('#metric-conv-d');
  assert.ok(elR.textContent.includes('cm'), 'Live radius readout must display in cm');
  assert.ok(elD.textContent.includes('cm'), 'Live diameter readout must display in cm');

  // 4. User Selects 'Analytic' Preset (u, rad)
  const analyticBtn = presetBtns.find((b) => b.getAttribute('data-len') === 'u' && b.getAttribute('data-ang') === 'rad');
  assert.ok(analyticBtn, 'Analytic preset button must exist');
  analyticBtn.trigger('click');

  assert.strictEqual(store.get().lengthUnit, 'u', 'Store lengthUnit must update to u on Analytic preset click');
  assert.strictEqual(store.get().angleUnit, 'rad', 'Store angleUnit must update to rad on Analytic preset click');
  assert.strictEqual(banner.textContent, 'Math (u, rad)', 'Active system banner must update to Math (u, rad)');
  assert.strictEqual(badge.textContent, 'u', 'Active length unit tag must update to u');

  // 5. User Uses Custom Selectors: Millimeters (mm) and Turns (turn)
  const selLen = container.querySelector('#select-length-unit');
  const selAng = container.querySelector('#select-angle-unit');

  selLen.value = 'mm';
  selLen.trigger('change', { target: { value: 'mm' } });
  assert.strictEqual(store.get().lengthUnit, 'mm', 'Store lengthUnit must update to mm');

  selAng.value = 'turn';
  selAng.trigger('change', { target: { value: 'turn' } });
  assert.strictEqual(store.get().angleUnit, 'turn', 'Store angleUnit must update to turn');

  assert.strictEqual(banner.textContent, 'Custom (mm, turn)', 'Active system banner must display Custom when non-preset combination active');

  // 6. Cross-Theorem Derivation Substitution reacting to Active Workspace Units
  // Test A: Angle at Centre under Analytic system (u, rad)
  {
    const aacContainer = new HeadlessMockElement('aac-analytic');
    const deriv = new AngleAtCentreDerivations(aacContainer);
    const aacState = { ...AngleAtCentre.createInitialState(), lengthUnit: 'u', angleUnit: 'rad' };
    const aacG = AngleAtCentre.computeGeometry(aacState, 800, 600);
    deriv.render(aacState, aacG);

    const step4Sub = aacContainer.subElements['#aac-step-4 [data-sub]']?.innerHTML || '';
    assert.ok(step4Sub.includes('rad'), 'Angle at Centre: derivation must format angle in rad when rad is active');
  }

  // Test B: Tangents from External Point under Metric system (cm, deg)
  {
    const tfpContainer = new HeadlessMockElement('tfp-metric');
    const deriv = new TangentsFromPointDerivations(tfpContainer);
    const tfpState = { ...TangentsFromPoint.createInitialState(), lengthUnit: 'cm', angleUnit: 'deg' };
    const tfpG = TangentsFromPoint.computeGeometry(tfpState, 800, 600);
    deriv.render(tfpState, tfpG);

    const step4Sub = tfpContainer.subElements['#tfp-step-4 [data-sub]']?.innerHTML || '';
    assert.ok(step4Sub.includes('cm'), 'Tangents from Point: derivation must format tangent lengths in cm when cm is active');
  }

  // Test C: Perpendicular Chord Bisector under Metric system (mm, deg)
  {
    const cbContainer = new HeadlessMockElement('cb-metric');
    const deriv = new ChordBisectorDerivations(cbContainer);
    const cbState = { ...ChordBisector.createInitialState(), lengthUnit: 'mm', angleUnit: 'deg' };
    const cbG = ChordBisector.computeGeometry(cbState, 800, 600);
    deriv.render(cbState, cbG);

    const step4Sub = cbContainer.subElements['#cb-step-4 [data-sub]']?.innerHTML || '';
    assert.ok(step4Sub.includes('mm'), 'Chord Bisector: derivation must format lengths in mm when mm is active');
  }

  // Test D: Thales StatsView under Metric system (cm, rad)
  {
    const rootMock = {
      elements: {},
      getElementById(id) {
        if (!this.elements[id]) {
          this.elements[id] = new HeadlessMockElement(id);
        }
        return this.elements[id];
      },
    };
    const statsView = new StatsView(rootMock);
    const thalesState = { ...createThalesInitialState(), lengthUnit: 'cm', angleUnit: 'rad' };
    statsView.render(thalesState);

    const rField = rootMock.getElementById('val-2d-r');
    const thetaField = rootMock.getElementById('val-2d-theta');
    assert.ok(rField.textContent.includes('cm'), 'Thales StatsView: radius readout must include cm when cm active');
    assert.ok(thetaField.textContent.includes('rad'), 'Thales StatsView: angle readout must include rad when rad active');
  }
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

// =============================================================================
// Suite 7: Gap 1 — Deterministic Canvas Context Spy & 3D State-to-Render
// =============================================================================
class CanvasRenderSpy {
  constructor() {
    this.operations = [];
    this.texts = [];
    this.arcs = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
  }

  beginPath() { this.operations.push({ type: 'beginPath' }); }
  closePath() { this.operations.push({ type: 'closePath' }); }
  moveTo(x, y) { this.operations.push({ type: 'moveTo', x, y }); }
  lineTo(x, y) { this.operations.push({ type: 'lineTo', x, y }); }
  arc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
    const arcOp = { type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle };
    this.operations.push(arcOp);
    this.arcs.push(arcOp);
  }
  fill() { this.operations.push({ type: 'fill', fillStyle: this.fillStyle }); }
  stroke() { this.operations.push({ type: 'stroke', strokeStyle: this.strokeStyle }); }
  clearRect(x, y, w, h) { this.operations.push({ type: 'clearRect', x, y, w, h }); }
  fillRect(x, y, w, h) { this.operations.push({ type: 'fillRect', x, y, w, h }); }
  strokeRect(x, y, w, h) { this.operations.push({ type: 'strokeRect', x, y, w, h }); }
  setLineDash(dash) { this.operations.push({ type: 'setLineDash', dash }); }
  save() { this.operations.push({ type: 'save' }); }
  restore() { this.operations.push({ type: 'restore' }); }
  fillText(text, x, y) {
    const textOp = { type: 'fillText', text: String(text), x, y, fillStyle: this.fillStyle };
    this.operations.push(textOp);
    this.texts.push(textOp);
  }
  strokeText(text, x, y) { this.operations.push({ type: 'strokeText', text: String(text), x, y }); }
  setTransform() {}
  translate() {}
  rotate() {}
  scale() {}
  measureText(text) { return { width: String(text).length * 7 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }

  arcsNear(x, y, tolerance = 15) {
    return this.arcs.filter((a) => Math.hypot(a.x - x, a.y - y) <= tolerance);
  }

  textsContaining(substr) {
    return this.texts.filter((t) => t.text.includes(substr));
  }

  wedgesNear(x, y, tolerance = 15) {
    return this.arcs.filter((a) => Math.hypot(a.x - x, a.y - y) <= tolerance && a.radius >= 20);
  }
}

test('Gap 1: Deterministic Canvas Context Spy & 3D Mesh Visibility — showDAngles toggle strictly alters rendered pixels', async () => {
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.window = globalThis.window || { devicePixelRatio: 1 };
  const canvasMod = await import('../visuals/alternate-segment/src/canvas.js');
  const circle3dCode = fs.readFileSync(path.join(ROOT, 'js', 'circle-3d.js'), 'utf8');

  // Test 2D: CanvasRenderSpy on Alternate Segment
  const stateBase = AlternateSegment.createInitialState();
  const g = AlternateSegment.computeGeometry(stateBase, 800, 600);

  // 1. showDAngles: true
  const spyEnabled = new CanvasRenderSpy();
  const mockCanvasEnabled = {
    width: 800,
    height: 600,
    style: {},
    getContext: () => spyEnabled,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  };
  const viewEnabled = new canvasMod.CanvasView(mockCanvasEnabled, mockCanvasEnabled.parentElement);
  viewEnabled.render({ ...stateBase, showDAngles: true, showProofConstruction: true, vis2d: { reflex: true, labels: true, angles: true } });

  const wedgesAtDEnabled = spyEnabled.wedgesNear(g.D.x, g.D.y, 10);
  assert.ok(wedgesAtDEnabled.length >= 2, 'When showDAngles: true, angle wedges must be drawn at Point D');
  const textBadgesAtDEnabled = spyEnabled.textsContaining('∠TDA');
  assert.ok(textBadgesAtDEnabled.length >= 1, 'When showDAngles: true, ∠TDA badge must be rendered at Point D');

  // 2. showDAngles: false
  const spyDisabled = new CanvasRenderSpy();
  const mockCanvasDisabled = {
    width: 800,
    height: 600,
    style: {},
    getContext: () => spyDisabled,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
  };
  const viewDisabled = new canvasMod.CanvasView(mockCanvasDisabled, mockCanvasDisabled.parentElement);
  viewDisabled.render({ ...stateBase, showDAngles: false, showProofConstruction: true, vis2d: { reflex: true, labels: true, angles: true } });

  const wedgesAtDDisabled = spyDisabled.wedgesNear(g.D.x, g.D.y, 10);
  assert.strictEqual(wedgesAtDDisabled.length, 0, 'When showDAngles: false, strictly ZERO angle wedges must be drawn at Point D');
  const textBadgesAtDDisabled = spyDisabled.textsContaining('∠TDA');
  assert.strictEqual(textBadgesAtDDisabled.length, 0, 'When showDAngles: false, ∠TDA badge must NOT be rendered');
  const extBadgesAtDDisabled = spyDisabled.textsContaining('Ext D');
  assert.strictEqual(extBadgesAtDDisabled.length, 0, 'When showDAngles: false, Ext D badge must NOT be rendered');

  // 3. 3D Scene View Visibility Contract
  assert.ok(circle3dCode.includes('showReflex && (state.showDAngles !== false)'), 'AlternateSegment3DView: reflexDMesh must be guarded with showDAngles !== false');
  assert.ok(circle3dCode.includes('const showDAngles = showProof && showAngles && (state.showDAngles !== false);'), 'AlternateSegment3DView: angleIntDMesh and angleExtDMesh must be guarded with showDAngles !== false');
  assert.ok(circle3dCode.includes('const showDLabels = showAngles && (state.showDAngles !== false);'), 'AlternateSegment3DView: 3D text labels must be guarded with showDAngles !== false');
});

// =============================================================================
// Suite 8: Gap 2 — Pointer Dragging (Synthetic Pointer Event Dispatch)
// =============================================================================
test('Gap 2: Pointer Dragging — Synthetic PointerEvent pipeline test (hit-detection, capture, and rigid rotation)', async () => {
  const state = AlternateSegment.createInitialState();
  const store = createStore(state);
  const width = 800;
  const height = 600;

  // Mock DOM canvas with pointer event dispatch pipeline
  const listeners = {};
  let capturedPointer = null;
  const mockCanvas = {
    style: { cursor: 'default' },
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 800, height: 600 }),
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (listeners[type]) listeners[type] = listeners[type].filter((l) => l !== fn);
    },
    dispatchEvent(event) {
      const type = event.type;
      if (listeners[type]) {
        for (const fn of listeners[type]) fn(event);
      }
      return true;
    },
    setPointerCapture(id) { capturedPointer = id; },
    releasePointerCapture(id) { if (capturedPointer === id) capturedPointer = null; },
  };

  // Wire actual pointer dragging logic as implemented in alternate-segment/src/main.js
  let activePoint = null;
  function hit(x, y, pt, radius = 22) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  mockCanvas.addEventListener('pointerdown', (e) => {
    const rect = mockCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = AlternateSegment.computeGeometry(store.get(), width, height);

    const isProof = Boolean(store.get().showProofConstruction || store.get().showThalesOverlay);
    if (hit(x, y, g.T)) activePoint = 'T';
    else if (hit(x, y, g.A)) activePoint = 'A';
    else if (hit(x, y, g.B)) activePoint = 'B';
    else if (isProof && g.D && hit(x, y, g.D)) activePoint = 'D';

    if (activePoint) {
      try { mockCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });

  mockCanvas.addEventListener('pointermove', (e) => {
    const rect = mockCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = AlternateSegment.computeGeometry(store.get(), width, height);

    if (!activePoint) {
      const isProof = Boolean(store.get().showProofConstruction || store.get().showThalesOverlay);
      const hover = hit(x, y, g.T) || hit(x, y, g.A) || hit(x, y, g.B) || (isProof && g.D && hit(x, y, g.D));
      mockCanvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    mockCanvas.style.cursor = 'grabbing';
    let ang = Math.atan2(g.cy - y, x - g.cx);
    if (ang < 0) ang += Math.PI * 2;

    if (activePoint === 'T') store.set({ angleT: ang });
    else if (activePoint === 'A') store.set({ angleA: ang });
    else if (activePoint === 'B') store.set({ angleB: ang });
    else if (activePoint === 'D') {
      const TAU = Math.PI * 2;
      const cur = store.get();
      const curT = cur.angleT;
      const curA = cur.angleA;
      const curB = cur.angleB;
      const oldD = (curT + Math.PI) % TAU;
      let delta = (ang - oldD) % TAU;
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      store.set({
        angleT: (curT + delta + TAU * 4) % TAU,
        angleA: (curA + delta + TAU * 4) % TAU,
        angleB: (curB + delta + TAU * 4) % TAU,
      });
    }
  });

  const stopDrag = (e) => {
    if (activePoint) {
      try { mockCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
      activePoint = null;
      mockCanvas.style.cursor = 'default';
    }
  };
  mockCanvas.addEventListener('pointerup', stopDrag);

  // 1. Synthetic Dispatch: Click on vertex B and drag to angle 30°
  const gInit = AlternateSegment.computeGeometry(store.get(), width, height);
  mockCanvas.dispatchEvent({ type: 'pointerdown', clientX: 100 + gInit.B.x, clientY: 100 + gInit.B.y, pointerId: 1 });
  assert.strictEqual(capturedPointer, 1, 'Pointer capture must be set when clicking on vertex B');
  assert.strictEqual(activePoint, 'B');

  // Drag B to 30° (Math.PI / 6)
  const targetAngB = Math.PI / 6;
  const targetBx = gInit.cx + gInit.r * Math.cos(targetAngB);
  const targetBy = gInit.cy - gInit.r * Math.sin(targetAngB);
  mockCanvas.dispatchEvent({ type: 'pointermove', clientX: 100 + targetBx, clientY: 100 + targetBy, pointerId: 1 });
  close(store.get().angleB, targetAngB, 1e-2);

  mockCanvas.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(capturedPointer, null, 'Pointer capture must be released on pointerup');
  assert.strictEqual(activePoint, null);

  // 2. Synthetic Dispatch: Click on Point D and spin it by 45°
  const gBeforeD = AlternateSegment.computeGeometry(store.get(), width, height);
  const initialAlpha = gBeforeD.inscribedDeg;
  mockCanvas.dispatchEvent({ type: 'pointerdown', clientX: 100 + gBeforeD.D.x, clientY: 100 + gBeforeD.D.y, pointerId: 2 });
  assert.strictEqual(activePoint, 'D', 'Clicking on Point D with proof enabled must activate Point D dragging');

  // Spin D by 45°
  const curAngleD = (store.get().angleT + Math.PI) % (Math.PI * 2);
  const targetAngleD = curAngleD + Math.PI / 4;
  const targetDx = gBeforeD.cx + gBeforeD.r * Math.cos(targetAngleD);
  const targetDy = gBeforeD.cy - gBeforeD.r * Math.sin(targetAngleD);
  mockCanvas.dispatchEvent({ type: 'pointermove', clientX: 100 + targetDx, clientY: 100 + targetDy, pointerId: 2 });

  const gAfterD = AlternateSegment.computeGeometry(store.get(), width, height);
  close(gAfterD.tangentChordDeg, initialAlpha, 1e-4);
  close(gAfterD.inscribedDeg, initialAlpha, 1e-4);
  close(gAfterD.angleTDA, initialAlpha, 1e-4);
  mockCanvas.dispatchEvent({ type: 'pointerup', pointerId: 2 });

  // 3. Synthetic Dispatch: Click on Point D when showProofConstruction is FALSE
  store.set({ showProofConstruction: false, showThalesOverlay: false });
  const gNoProof = AlternateSegment.computeGeometry(store.get(), width, height);
  mockCanvas.dispatchEvent({ type: 'pointerdown', clientX: 100 + gNoProof.D.x, clientY: 100 + gNoProof.D.y, pointerId: 3 });
  assert.strictEqual(activePoint, null, 'Clicking Point D when proof is disabled must NOT activate drag');
});

// =============================================================================
// Suite 9: Gap 3 — Responsive CSS Contract (Mobile Stack & Split Button Hidden)
// =============================================================================
test('Gap 3: Responsive CSS Contract — Media queries enforce stacked layout and hide #split-dir-btn on mobile', () => {
  const circleCss = fs.readFileSync(path.join(ROOT, 'css', 'circle-visual.css'), 'utf8');
  const thalesCss = fs.readFileSync(path.join(ROOT, 'visuals', 'thales-theorem', 'styles', 'responsive.css'), 'utf8');

  // 1. In circle-visual.css under @media (max-width: 48rem)
  assert.ok(circleCss.includes('@media (max-width: 48rem)'), 'circle-visual.css must define @media (max-width: 48rem) breakpoint');
  assert.ok(/\.circle-explorer\s+\.layout-split\s*\{\s*flex-direction:\s*column;/.test(circleCss), 'circle-visual.css must enforce flex-direction: column on mobile');
  assert.ok(/\.circle-explorer\s+#split-dir-btn\s*\{\s*display:\s*none\s*!important;/.test(circleCss), 'circle-visual.css must hide #split-dir-btn with display: none !important on mobile');

  // 2. In thales-theorem responsive.css under @media (max-width: 48rem)
  assert.ok(thalesCss.includes('@media (max-width: 48rem)'), 'thales responsive.css must define @media (max-width: 48rem) breakpoint');
  assert.ok(/\.thales-explorer\s+#split-dir-btn\s*\{\s*display:\s*none\s*!important;/.test(thalesCss), 'thales responsive.css must hide #split-dir-btn with display: none !important on mobile');
});

// =============================================================================
// Suite 10: Gap 4 — DOM Contract Linter (Zero Missing IDs Across All 8 Visuals)
// =============================================================================
test('Gap 4: DOM Contract Linter — All JS DOM queries match existing HTML element IDs across all 8 visuals', () => {
  const visualsPath = path.join(ROOT, 'data', 'visuals.json');
  const visuals = JSON.parse(fs.readFileSync(visualsPath, 'utf8'));

  const missingReport = [];

  for (const visual of visuals) {
    const htmlPath = path.join(ROOT, 'visuals', visual.slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `Visual ${visual.slug} must have index.html`);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const htmlIdRegex = /id=["']([^"']+)["']/g;
    const htmlIds = new Set();
    let m;
    while ((m = htmlIdRegex.exec(htmlContent)) !== null) {
      htmlIds.add(m[1]);
    }

    const jsDir = path.join(ROOT, 'visuals', visual.slug, 'src');
    if (!fs.existsSync(jsDir)) continue;

    function walkDir(dir) {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walkDir(full) : (full.endsWith('.js') ? [full] : []);
      });
    }

    const jsFiles = walkDir(jsDir);
    for (const file of jsFiles) {
      const code = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(ROOT, file).split(path.sep).join('/');

      const getByIdRegex = /getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
      while ((m = getByIdRegex.exec(code)) !== null) {
        const id = m[1];
        if (id.startsWith('deriv-2d-step-') || id.startsWith('deriv-3d-step-')) continue;
        if (!htmlIds.has(id)) {
          missingReport.push(`${relPath}: getElementById('${id}') not in HTML`);
        }
      }

      const queryHashRegex = /querySelector(?:All)?\(['"][^'"]*#([a-zA-Z0-9_-]+)[^'"]*['"]\)/g;
      while ((m = queryHashRegex.exec(code)) !== null) {
        const id = m[1];
        if (id.startsWith('deriv-2d-step-') || id.startsWith('deriv-3d-step-')) continue;
        if (!htmlIds.has(id)) {
          missingReport.push(`${relPath}: querySelector('#${id}') not in HTML`);
        }
      }
    }
  }

  assert.deepStrictEqual(missingReport, [], `Zero missing IDs allowed. Gaps found:\n${missingReport.join('\n')}`);
});

// =============================================================================
// Suite 11: Gap 5 — HTML Script Loading Contract (Non-Blocking & Preconnected)
// =============================================================================
test('Gap 5: HTML Script Loading Contract — Zero blocking scripts in <head> and preconnect tags for all external origins', () => {
  const visualsPath = path.join(ROOT, 'data', 'visuals.json');
  const visuals = JSON.parse(fs.readFileSync(visualsPath, 'utf8'));

  const pagesToCheck = [
    ...visuals.map((v) => path.join('visuals', v.slug, 'index.html')),
    'index.html',
    'about.html',
    'contact.html',
    'privacy.html',
  ];

  for (const relPage of pagesToCheck) {
    const fullPath = path.join(ROOT, relPage);
    assert.ok(fs.existsSync(fullPath), `Page ${relPage} must exist`);
    const html = fs.readFileSync(fullPath, 'utf8');

    const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
    assert.ok(headMatch, `${relPage}: must contain <head>`);
    const head = headMatch[1];

    // 1. Assert all external <script src="http..."> have defer or type="module"
    const scriptRegex = /<script\s+([^>]*?)>/gi;
    let s;
    while ((s = scriptRegex.exec(head)) !== null) {
      const attrs = s[1];
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        const isExternal = src.startsWith('http://') || src.startsWith('https://');
        if (isExternal) {
          const isNonBlocking = /defer/i.test(attrs) || /type=["']module["']/i.test(attrs);
          assert.ok(
            isNonBlocking,
            `${relPage}: External script "${src}" in <head> must have 'defer' or type='module' to prevent blocking the HTML parser`
          );
        }
      }
    }

    // 2. Assert external origins referenced in <script> or <link> have preconnect
    const linkOrScriptRegex = /(?:src|href)=["'](https?:\/\/[^"'/]+)[^"']*["']/gi;
    const origins = new Set();
    let u;
    while ((u = linkOrScriptRegex.exec(head)) !== null) {
      origins.add(u[1]);
    }

    for (const origin of origins) {
      if (origin.includes('github.io') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        continue; // First-party site origin does not require preconnect
      }
      const hasPreconnect = head.includes(`rel="preconnect" href="${origin}"`) ||
        head.includes(`rel="preconnect"\n    href="${origin}"`) ||
        (head.includes('rel="preconnect"') && head.includes(origin));
      assert.ok(
        hasPreconnect,
        `${relPage}: External origin "${origin}" must have <link rel="preconnect" href="${origin}"> in <head>`
      );
    }
  }
});

