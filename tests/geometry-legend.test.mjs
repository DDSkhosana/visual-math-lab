import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('Geometry Legend: CSS contains styles for pop-out modal, cards, tabs, and header button', () => {
  const cssPath = path.join(rootDir, 'css', 'visual.css');
  assert.ok(fs.existsSync(cssPath), 'css/visual.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Header button
  assert.ok(css.includes('.site-header__legend-btn'), 'Must include .site-header__legend-btn');

  // Modal overlay & card
  assert.ok(css.includes('.geometry-legend-overlay'), 'Must include .geometry-legend-overlay');
  assert.ok(css.includes('.geometry-legend-modal-card'), 'Must include .geometry-legend-modal-card');

  // Toolbar & filter tabs
  assert.ok(css.includes('.geometry-legend-toolbar'), 'Must include .geometry-legend-toolbar');
  assert.ok(css.includes('.legend-tab'), 'Must include .legend-tab');
  assert.ok(css.includes('.legend-tab.active'), 'Must include .legend-tab.active');

  // Card components & SVG box
  assert.ok(css.includes('.legend-card'), 'Must include .legend-card');
  assert.ok(css.includes('.legend-card-visual'), 'Must include .legend-card-visual');
  assert.ok(css.includes('.legend-svg'), 'Must include .legend-svg');
  assert.ok(css.includes('.legend-card-formula'), 'Must include .legend-card-formula');

  // Colour grammar
  assert.ok(css.includes('.geometry-legend-grammar'), 'Must include .geometry-legend-grammar');
  assert.ok(css.includes('.grammar-token-card'), 'Must include .grammar-token-card');
});

test('Geometry Legend: visual-page.js imports and initializes legend modal and header button', () => {
  const jsPath = path.join(rootDir, 'js', 'visual-page.js');
  assert.ok(fs.existsSync(jsPath), 'js/visual-page.js must exist');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.ok(js.includes('initGeometryLegend'), 'visual-page.js must import initGeometryLegend');
  assert.ok(js.includes('visual-legend-btn'), 'visual-page.js must render #visual-legend-btn in header');
});

test('Geometry Legend: geometry-legend.js exports all notation elements with valid formulas and SVG diagrams', async () => {
  const modPath = path.join(rootDir, 'js', 'geometry-legend.js');
  assert.ok(fs.existsSync(modPath), 'js/geometry-legend.js must exist');

  const { GEOMETRY_ELEMENTS, COLOR_GRAMMAR_TOKENS, openLegendModal, closeLegendModal, toggleLegendModal } = await import('../js/geometry-legend.js');

  assert.ok(Array.isArray(GEOMETRY_ELEMENTS), 'GEOMETRY_ELEMENTS must be an array');
  assert.ok(GEOMETRY_ELEMENTS.length >= 10, 'Must have at least 10 geometric notation elements');

  const expectedIds = [
    'radius',
    'diameter',
    'chord',
    'secant',
    'tangent',
    'arc',
    'sector',
    'segment',
    'alternate-segment',
    'inscribed-angle',
    'central-angle',
    'reflex-perigon',
    'cyclic-quad'
  ];

  for (const id of expectedIds) {
    const el = GEOMETRY_ELEMENTS.find((item) => item.id === id);
    assert.ok(el, `Element "${id}" must exist in GEOMETRY_ELEMENTS`);
    assert.ok(el.name && el.name.length > 0, `${id}: must have name`);
    assert.ok(el.symbol && el.symbol.length > 0, `${id}: must have symbol`);
    assert.ok(el.formula && el.formula.length > 0, `${id}: must have formula`);
    assert.ok(el.definition && el.definition.length > 10, `${id}: must have definition`);
    assert.ok(el.svg.includes('<svg') && el.svg.includes('</svg>'), `${id}: must have valid SVG markup`);
  }

  assert.ok(Array.isArray(COLOR_GRAMMAR_TOKENS), 'COLOR_GRAMMAR_TOKENS must be an array');
  assert.ok(COLOR_GRAMMAR_TOKENS.length >= 10, 'Must have at least 10 colour grammar tokens');

  assert.strictEqual(typeof openLegendModal, 'function');
  assert.strictEqual(typeof closeLegendModal, 'function');
  assert.strictEqual(typeof toggleLegendModal, 'function');
});

