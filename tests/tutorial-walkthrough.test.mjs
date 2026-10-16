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

test('Walkthrough & Tips: tutorial-walkthrough.js supports all 8 visuals with tailored guidance and toggle state', async () => {
  const modPath = path.join(rootDir, 'js', 'tutorial-walkthrough.js');
  assert.ok(fs.existsSync(modPath), 'js/tutorial-walkthrough.js must exist');
  const modCode = fs.readFileSync(modPath, 'utf8');

  // Check that all 8 visual slugs are covered in theorem tips
  const visuals = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'visuals.json'), 'utf8'));
  assert.strictEqual(visuals.length, 8, 'Must have 8 visuals');

  for (const v of visuals) {
    assert.ok(
      modCode.includes(`'${v.slug}'`),
      `tutorial-walkthrough.js must define tailored tips for visual "${v.slug}"`
    );
  }

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

