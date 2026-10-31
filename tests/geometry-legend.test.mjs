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

  // Unified scroll container to prevent panel overflow
  assert.ok(css.includes('.geometry-legend-scroll-container'), 'Must include .geometry-legend-scroll-container');

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

test('Geometry Legend: geometry-legend.js exports notation elements and KaTeX rendering utilities', async () => {
  const modPath = path.join(rootDir, 'js', 'geometry-legend.js');
  assert.ok(fs.existsSync(modPath), 'js/geometry-legend.js must exist');

  const {
    GEOMETRY_ELEMENTS,
    COLOR_GRAMMAR_TOKENS,
    openLegendModal,
    closeLegendModal,
    toggleLegendModal,
    renderLatex,
    formatLatexFallback,
    loadKaTeX
  } = await import('../js/geometry-legend.js');

  assert.ok(Array.isArray(GEOMETRY_ELEMENTS), 'GEOMETRY_ELEMENTS must be an array');
  assert.ok(GEOMETRY_ELEMENTS.length >= 22, 'Must have at least 22 geometric notation elements covering circle theorems and trigonometry');

  const expectedIds = [
    // Classical Lines & Segments
    'radius',
    'diameter',
    'chord',
    'secant',
    'tangent',
    // Regions & Arcs
    'arc',
    'sector',
    'segment',
    'alternate-segment',
    'sagitta-curvature',
    // Angles & Classical Invariants
    'inscribed-angle',
    'central-angle',
    'angles-same-segment',
    'reflex-perigon',
    'cyclic-quad',
    'cyclic-diagonals-ptolemy',
    // Missing Circle Theorem Features
    'thales-semicircle',
    'tangents-external-point',
    'perpendicular-chord-bisector',
    'affine-conic-invariants',
    // Trigonometry Suite Features
    'six-trig-functions',
    'cylindrical-helix-waves',
    'law-of-sines-circumdiameter',
    'law-of-cosines-projection',
    'angle-sum-difference-rotation',
    // Composite Multi-Color Gradient Features
    'composite-diameter',
    'composite-tangent-pair',
    'composite-stacked-triangles',
    'composite-bilinear-rect',
    'composite-helix-walls',
    'composite-euler-frame'
  ];

  for (const id of expectedIds) {
    const el = GEOMETRY_ELEMENTS.find((item) => item.id === id);
    assert.ok(el, `Element "${id}" must exist in GEOMETRY_ELEMENTS`);
    assert.ok(el.name && el.name.length > 0, `${id}: must have name`);
    assert.ok(el.symbol && el.symbol.length > 0, `${id}: must have symbol`);
    assert.ok(el.formula && el.formula.length > 0, `${id}: must have formula`);
    assert.ok(el.definition && el.definition.length > 10, `${id}: must have definition`);
    assert.ok(el.svg.includes('<svg') && el.svg.includes('</svg>'), `${id}: must have valid SVG markup`);

    // Verify mathematical rendering does not crash and produces non-empty output
    const rendered = renderLatex(el.formula);
    assert.ok(rendered && rendered.length > 0, `${id}: rendered formula must be non-empty`);
  }

  // Cyclic quadrilateral diagonals: legend card and colour tokens match 2D/3D (AC = lavender, BD = sky)
  const cyclicQuad = GEOMETRY_ELEMENTS.find((item) => item.id === 'cyclic-quad');
  assert.ok(cyclicQuad.svg.includes('stroke="#c4b5fd"') && cyclicQuad.svg.includes('stroke="#0284c7"'), 'Cyclic quad legend SVG must draw diagonals AC (lavender) and BD (sky)');
  const ptolemy = GEOMETRY_ELEMENTS.find((item) => item.id === 'cyclic-diagonals-ptolemy');
  assert.ok(ptolemy.formula.includes('|AC|') && ptolemy.formula.includes('|BD|'), 'Ptolemy legend formula must reference both diagonals');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.lavender').role.includes('diagonal AC'), 'Lavender token must document cyclic diagonal AC');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.sky').role.includes('diagonal BD'), 'Sky token must document cyclic diagonal BD');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.amber').role.includes('Vertex C (Cyclic)'), 'Amber token must document cyclic vertex C');
  assert.ok(!COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.fuchsia').role.includes('(Cyclic)'), 'Fuchsia must not be documented as a cyclic vertex colour');

  // Angles in the Same Segment: legend card and colour tokens match 2D/3D (P1 = blue, P2 = emerald, chord = red, segment = sky)
  const sameSeg = GEOMETRY_ELEMENTS.find((item) => item.id === 'angles-same-segment');
  assert.ok(sameSeg, 'angles-same-segment must exist in GEOMETRY_ELEMENTS');
  assert.ok(sameSeg.formula.includes('\\angle AP_1B = \\angle AP_2B'), 'Same segment formula must equate inscribed angles P1 and P2');
  assert.ok(sameSeg.svg.includes('stroke="#ef4444"') && sameSeg.svg.includes('fill="#3b82f6"') && sameSeg.svg.includes('fill="#10b981"'), 'Same segment SVG must render chord AB (red), P1 (blue), and P2 (emerald)');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.blue').role.includes('P₁'), 'Blue token must document Vertex P₁');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.emerald').role.includes('P₂'), 'Emerald token must document Vertex P₂');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.red').role.includes('Common chord AB'), 'Red token must document Common chord AB');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.sky').role.includes('Same Segment'), 'Sky token must document Same Segment');

  // Sagitta & Curvature: verifies sagitta s formula and curvature ratio K
  const sagitta = GEOMETRY_ELEMENTS.find((item) => item.id === 'sagitta-curvature');
  assert.ok(sagitta, 'sagitta-curvature must exist in GEOMETRY_ELEMENTS');
  assert.ok(sagitta.formula.includes('R\\left(1 - \\cos\\frac{\\theta}{2}\\right)'), 'Sagitta formula must define R(1 - cos(theta/2))');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.rose').role.includes('Sagitta s'), 'Rose token must document Sagitta s');
  assert.ok(COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.indigo').role.includes('Auxiliary point D'), 'Indigo token must document Auxiliary point D');

  // Verify categories distribution
  const trigElements = GEOMETRY_ELEMENTS.filter((item) => item.category === 'trig');
  assert.strictEqual(trigElements.length, 5, 'Must have 5 dedicated trigonometry elements');

  const compositeElements = GEOMETRY_ELEMENTS.filter((item) => item.category === 'composite');
  assert.strictEqual(compositeElements.length, 6, 'Must have 6 dedicated composite gradient elements');

  assert.ok(Array.isArray(COLOR_GRAMMAR_TOKENS), 'COLOR_GRAMMAR_TOKENS must be an array');
  assert.ok(COLOR_GRAMMAR_TOKENS.length >= 18, 'Must have at least 18 colour grammar tokens');

  // Verify that COLOR_GRAMMAR_TOKENS includes trigonometry and composite mappings
  const amberToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.amber');
  assert.ok(amberToken?.role?.includes('cos θ'), 'Amber token must document Cosine leg (cos θ)');
  assert.ok(amberToken?.role?.includes('Bilinear interaction rectangle'), 'Amber token must document Bilinear interaction rectangle');

  const emeraldToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.emerald');
  assert.ok(emeraldToken?.role?.includes('sin θ'), 'Emerald token must document Sine leg (sin θ)');

  const roseToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.rose');
  assert.ok(roseToken?.role?.includes('tan θ'), 'Rose token must document Tangent ratio leg (tan θ)');

  const skyToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.sky');
  assert.ok(skyToken?.role?.includes('sec θ'), 'Sky token must document Secant line (sec θ)');
  assert.ok(skyToken?.role?.includes('helix'), 'Sky token must document Cylindrical helix curve');

  const fuchsiaToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.fuchsia');
  assert.ok(fuchsiaToken, 'PALETTE.fuchsia must exist');

  const steelToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.steel');
  assert.ok(steelToken, 'PALETTE.steel must exist');

  const lavenderToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.lavender');
  assert.ok(lavenderToken, 'PALETTE.lavender must exist');

  const platinumToken = COLOR_GRAMMAR_TOKENS.find((t) => t.token === 'PALETTE.platinum');
  assert.ok(platinumToken, 'PALETTE.platinum must exist');

  assert.strictEqual(typeof openLegendModal, 'function');
  assert.strictEqual(typeof closeLegendModal, 'function');
  assert.strictEqual(typeof toggleLegendModal, 'function');
  assert.strictEqual(typeof renderLatex, 'function');
  assert.strictEqual(typeof formatLatexFallback, 'function');
  assert.strictEqual(typeof loadKaTeX, 'function');

  // Verify LaTeX fallback converts syntax to clean Unicode symbols
  const testFormula = '\\text{Area} = \\frac{1}{2} r^2 (\\theta - \\sin\\theta)';
  const formatted = formatLatexFallback(testFormula);
  assert.ok(!formatted.includes('\\frac'), 'Fallback must resolve \\frac');
  assert.ok(!formatted.includes('\\theta'), 'Fallback must resolve \\theta to θ');
  assert.ok(!formatted.includes('\\sin'), 'Fallback must resolve \\sin to sin');
  assert.ok(formatted.includes('²'), 'Fallback must format exponent to ²');
  assert.ok(formatted.includes('θ'), 'Fallback must include Greek letter θ');

  // Verify new trigonometric & square root fallback formatting
  const trigFormula = '\\cos(\\alpha \\pm \\beta) = \\sqrt{d^2 - r^2}';
  const trigFormatted = formatLatexFallback(trigFormula);
  assert.ok(trigFormatted.includes('cos'), 'Fallback must resolve \\cos');
  assert.ok(trigFormatted.includes('α'), 'Fallback must resolve \\alpha to α');
  assert.ok(trigFormatted.includes('±'), 'Fallback must resolve \\pm to ±');
  assert.ok(trigFormatted.includes('β'), 'Fallback must resolve \\beta to β');
  assert.ok(trigFormatted.includes('√(d² - r²)'), 'Fallback must format square root to √(d² - r²)');
});

test('Geometry Legend: js/geometry-legend.js modal includes Trigonometry tab and dynamic suite-aware title', () => {
  const legendJsPath = path.join(rootDir, 'js', 'geometry-legend.js');
  const legendJs = fs.readFileSync(legendJsPath, 'utf8');

  // Dedicated Trigonometry & Composite tabs
  assert.ok(legendJs.includes('data-filter="trig"'), 'Modal toolbar must include data-filter="trig"');
  assert.ok(legendJs.includes('Trigonometry &amp; Functions'), 'Modal toolbar must include "Trigonometry & Functions" tab label');
  assert.ok(legendJs.includes('data-filter="composite"'), 'Modal toolbar must include data-filter="composite"');
  assert.ok(legendJs.includes('Composite &amp; Tensor Elements'), 'Modal toolbar must include "Composite & Tensor Elements" tab label');

  // Dynamic header context
  assert.ok(legendJs.includes('eyebrowText'), 'mountLegendModal must dynamically define eyebrowText');
  assert.ok(legendJs.includes('subtitleText'), 'mountLegendModal must dynamically define subtitleText');
  assert.ok(legendJs.includes('isTrig'), 'openLegendModal and mountLegendModal must check isTrig');
});

