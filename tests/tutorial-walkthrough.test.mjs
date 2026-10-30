import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Walkthrough & Tips: CSS contains complete styles for badges, spotlights, popovers, and toggle states', () => {
  const cssPath = path.join(rootDir, 'css', 'visual.css');
  assert.ok(fs.existsSync(cssPath), 'css/visual.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Header trigger button & status pills
  assert.ok(css.includes('.site-header__tutorial-btn'), 'Must include .site-header__tutorial-btn');
  assert.ok(css.includes('.tutorial-status-pill'), 'Must include .tutorial-status-pill');
  assert.ok(css.includes('.tutorial-status-pill.is-on'), 'Must include .tutorial-status-pill.is-on');
  assert.ok(css.includes('.tutorial-status-pill.is-off'), 'Must include .tutorial-status-pill.is-off');

  // 2. Global suppression when disabled
  assert.ok(
    css.includes('body.interaction-tips-disabled .interaction-tip-badge'),
    'Must suppress tip badges when disabled'
  );
  assert.ok(
    css.includes('body.interaction-tips-disabled .walkthrough-spotlight'),
    'Must suppress spotlight when disabled'
  );
  assert.ok(
    css.includes('body.interaction-tips-disabled .walkthrough-popover'),
    'Must suppress walkthrough popover when disabled'
  );

  // 3. Badges and spotlights
  assert.ok(css.includes('.interaction-tip-badge'), 'Must include .interaction-tip-badge');
  assert.ok(css.includes('.walkthrough-spotlight'), 'Must include .walkthrough-spotlight');
  assert.ok(css.includes('.walkthrough-popover'), 'Must include .walkthrough-popover');
  assert.ok(css.includes('.tutorial-modal-overlay'), 'Must include .tutorial-modal-overlay');
  assert.ok(css.includes('.tutorial-modal-card'), 'Must include .tutorial-modal-card');
  assert.ok(css.includes('.tutorial-switch'), 'Must include .tutorial-switch');
});

test('Walkthrough & Tips: visual-page.js imports and initializes tutorial walkthrough across all visuals', () => {
  const jsPath = path.join(rootDir, 'js', 'visual-page.js');
  assert.ok(fs.existsSync(jsPath), 'js/visual-page.js must exist');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.ok(js.includes('initTutorialAndTips'), 'visual-page.js must import initTutorialAndTips');
  assert.ok(js.includes('visual-tutorial-btn'), 'visual-page.js must render #visual-tutorial-btn in header');
  assert.ok(js.includes('btn-toolbar-tips'), 'visual-page.js must mount quick toolbar tips toggle');
  assert.ok(js.includes('isTipsEnabled'), 'visual-page.js must check isTipsEnabled');
});

test('Walkthrough & Tips: tutorial-walkthrough.js supports all 12 visuals with tailored guidance and toggle state', async () => {
  const modPath = path.join(rootDir, 'js', 'tutorial-walkthrough.js');
  assert.ok(fs.existsSync(modPath), 'js/tutorial-walkthrough.js must exist');
  const modCode = fs.readFileSync(modPath, 'utf8');

  // Check that all 12 visual slugs are covered in theorem tips
  const visuals = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'visuals.json'), 'utf8'));
  assert.strictEqual(visuals.length, 12, 'Must have 12 visuals across circle theorems and trigonometry suites');

  for (const v of visuals) {
    assert.ok(
      modCode.includes(`'${v.slug}'`),
      `tutorial-walkthrough.js must define tailored tips for visual "${v.slug}"`
    );
  }

  // Cyclic quadrilateral tips must cover diagonals AC/BD, synced 2D/3D toggles, and Ptolemy's Theorem
  assert.ok(modCode.includes('Diagonals AC (Lavender) and BD (Sky)'), 'Cyclic quadrilateral tips must describe diagonals AC and BD with colour tokens');
  assert.ok(modCode.includes("Ptolemy\\'s Theorem: |AC|·|BD| = |AB|·|CD| + |BC|·|DA|"), "Cyclic quadrilateral tips must state Ptolemy's Theorem");

  // Verify exports
  const tutorialMod = await import('../js/tutorial-walkthrough.js');
  assert.strictEqual(typeof tutorialMod.isTipsEnabled, 'function');
  assert.strictEqual(typeof tutorialMod.setTipsEnabled, 'function');
  assert.strictEqual(typeof tutorialMod.initTutorialAndTips, 'function');
  assert.strictEqual(typeof tutorialMod.openTutorialModal, 'function');
  assert.strictEqual(typeof tutorialMod.closeTutorialModal, 'function');

  // Test mock localStorage & DOM toggling in Node environment
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  global.document = {
    body: {
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      }
    },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener() {},
  };

  // Default should be true
  assert.strictEqual(tutorialMod.isTipsEnabled(), true);

  // Toggle OFF
  let toggledState = null;
  tutorialMod.setTipsEnabled(false, (v) => { toggledState = v; });
  assert.strictEqual(toggledState, false);
  assert.strictEqual(tutorialMod.isTipsEnabled(), false);
  assert.strictEqual(global.localStorage.getItem('vml_interaction_tips_enabled'), 'false');
  assert.ok(global.document.body.classList.contains('interaction-tips-disabled'));

  // Toggle ON
  tutorialMod.setTipsEnabled(true, (v) => { toggledState = v; });
  assert.strictEqual(toggledState, true);
  assert.strictEqual(tutorialMod.isTipsEnabled(), true);
  assert.strictEqual(global.localStorage.getItem('vml_interaction_tips_enabled'), 'true');
  assert.ok(global.document.body.classList.contains('interaction-tips-enabled'));
});

test('Walkthrough & Tips: Guide includes steps for Breadcrumb Dock Navigation, Affine Conic Mode, WebXR AR, and Permalinks', () => {
  const modPath = path.join(rootDir, 'js', 'tutorial-walkthrough.js');
  const code = fs.readFileSync(modPath, 'utf8');

  // Verify tour steps
  assert.ok(code.includes('Hierarchical Breadcrumbs & Dock Navigation'), 'Must include dock breadcrumbs step');
  assert.ok(code.includes('Dual-Mode Affine Conic Generalization'), 'Must include affine conic step');
  assert.ok(code.includes('WebXR & Spatial Augmented Reality (AR)'), 'Must include WebXR AR step');
  assert.ok(code.includes('Shareable Permalinks, Notation Legend & Global Settings'), 'Must include permalinks and settings step');
  assert.ok(code.includes('Live Math Derivations & Telemetry Verification'), 'Must include live derivations and telemetry verification step');

  // Verify Thales specifics
  assert.ok(code.includes('Apollonius') && code.includes('conjugate diameter'), 'Must explain Apollonius invariant');
  assert.ok(code.includes('WebXR or camera pass-through'), 'Must describe AR options');
  assert.ok(code.includes('URL permalink'), 'Must describe permalinks');

  // Verify multi-lingual, privacy, and composite sections
  assert.ok(code.includes('Multilingual Localization &amp; Privacy'), 'Must include i18n & privacy cheatsheet');
  assert.ok(code.includes('Composite Elements &amp; Color Tokens'), 'Must include composite elements cheatsheet');
  assert.ok(code.includes('Harmonic Audio Sonification'), 'Must document harmonic audio sonification in guide');
  assert.ok(code.includes('IsiNdebele'), 'Must document IsiNdebele in guide');
  assert.ok(code.includes('Google Consent Mode v2'), 'Must document Google Consent Mode v2 in guide');

  // Verify shortcuts
  assert.ok(code.includes('<kbd>S</kbd> Share Link'), 'Must include Share shortcut');
  assert.ok(code.includes('<kbd>L</kbd> Legend'), 'Must include Legend shortcut');
  assert.ok(code.includes('<kbd>M</kbd> Sound'), 'Must include Sound M shortcut');
  assert.ok(code.includes('<kbd>Shift+P</kbd> Presets'), 'Must include Shift+P Presets shortcut');
  assert.ok(code.includes('<kbd>Alt+1..9</kbd>'), 'Must include Alt+1..9 panel jumping shortcut');
  assert.ok(code.includes('<kbd>Alt+\\\\</kbd>'), 'Must include Alt+\\ float cycle shortcut');
  assert.ok(code.includes('<kbd>Esc</kbd>'), 'Must include Escape ladder shortcut');
});

test('Walkthrough & Tips: visual-page.js mounts Share and AR buttons into the toolbar', () => {
  const jsPath = path.join(rootDir, 'js', 'visual-page.js');
  const code = fs.readFileSync(jsPath, 'utf8');

  assert.ok(code.includes('btn-toolbar-share'), 'visual-page.js must mount btn-toolbar-share');
  assert.ok(code.includes('btn-toggle-ar'), 'visual-page.js must handle btn-toggle-ar');
  assert.ok(code.includes('copyShareUrl'), 'visual-page.js must invoke copyShareUrl');
  assert.ok(code.includes('initPermalinkSync'), 'visual-page.js must initialize permalink synchronization');
});

test('Telemetry & Guide: visual-page.js synchronizes 2D/3D telemetry panel titles with i18n and injects invariant status badges', () => {
  const jsPath = path.join(rootDir, 'js', 'visual-page.js');
  const code = fs.readFileSync(jsPath, 'utf8');

  assert.ok(code.includes("t('telemetry.panel_2d'") || code.includes('t("telemetry.panel_2d"'), 'visual-page.js must translate 2D telemetry title');
  assert.ok(code.includes("t('telemetry.panel_3d'") || code.includes('t("telemetry.panel_3d"'), 'visual-page.js must translate 3D telemetry title');
  assert.ok(code.includes('telemetry-invariant-badge'), 'visual-page.js must inject telemetry-invariant-badge');
  assert.ok(code.includes("t('derivations.verified'") || code.includes('t("derivations.verified"'), 'visual-page.js must translate verified badge text');

  const cssPath = path.join(rootDir, 'css', 'visual.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.telemetry-invariant-badge'), 'css/visual.css must style .telemetry-invariant-badge');
  assert.ok(css.includes('[dir="rtl"] .telemetry-invariant-badge'), 'css/visual.css must support RTL for .telemetry-invariant-badge');
});

