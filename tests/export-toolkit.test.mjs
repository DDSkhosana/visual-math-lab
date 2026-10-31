/**
 * @file export-toolkit.test.mjs
 * Test Suite for the Universal Educator & Presentation Export Toolkit.
 *
 * Verifies:
 * 1. Vector SVG Generation across all 12 visualizers (8 Circle Theorems + 4 Trigonometry visualizers).
 * 2. Universal getSVG() contract on 2D canvas view classes.
 * 3. 3D WebGL PNG snapshot method contract on BaseScene3DView and Thales Scene3DView.
 * 4. Dynamic Theorem Worksheet Generator data and HTML generation across all 12 visualizers.
 * 5. Animation Loop Recorder class contract and MIME type detection.
 * 6. Cross-visual HTML compliance for Export & Presentation Toolkit controls.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { generateTrigSVG } from '../visuals/trigonometry/js/trig-svg.js';
import { generateWorksheetData, generateWorksheetHTML } from '../js/worksheet-generator.js';
import { AnimationLoopRecorder } from '../js/animation-recorder.js';
import { BaseScene3DView } from '../js/circle-3d.js';
import { Scene3DView as ThalesScene3DView } from '../visuals/circle-theorems/thales-theorem/src/views/Scene3DView.js';

const ALL_VISUAL_SLUGS = [
  // Circle Theorems (8)
  'angle-at-centre',
  'angles-in-same-segment',
  'thales-theorem',
  'cyclic-quadrilateral',
  'tangent-radius',
  'alternate-segment',
  'tangents-from-external-point',
  'perpendicular-chord-bisector',
  // Trigonometry Suite (4)
  'unit-circle-helix',
  'law-of-sines',
  'law-of-cosines',
  'angle-sum-identities',
];

test('Vector SVG Generator: Trigonometry Suite produces valid, rich vector markup', () => {
  const trigVisuals = [
    { id: 'unit-circle-helix', keywords: ['Unit Circle', 'cos θ', 'sin θ', 'sin²θ + cos²θ = 1'] },
    { id: 'law-of-sines', keywords: ['Law of Sines', 'Circumcircle', 'a / sin A = b / sin B = c / sin C = 2R', 'R'] },
    { id: 'law-of-cosines', keywords: ['Law of Cosines', 'c² = a² + b² - 2ab cos C', 'Locus Arc', 'D'] },
    { id: 'angle-sum-identities', keywords: ['Angle Addition', 'cos(α+β)', 'sin(α+β)', 'Stacked Right Triangle'] },
  ];

  for (const { id, keywords } of trigVisuals) {
    const svg = generateTrigSVG(id, { radius: 180 }, 800, 600);
    assert.ok(typeof svg === 'string', `${id}: SVG must be a string`);
    assert.ok(svg.includes('<?xml version="1.0" encoding="UTF-8"?>'), `${id}: Must include XML declaration`);
    assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), `${id}: Must include SVG root with xmlns`);
    assert.ok(svg.includes('viewBox="0 0 800 600"'), `${id}: Must include valid viewBox`);
    assert.ok(svg.includes('</svg>'), `${id}: Must properly close SVG tag`);

    for (const kw of keywords) {
      assert.ok(svg.includes(kw), `${id}: SVG markup must contain expected keyword '${kw}'`);
    }
  }
});

test('Universal getSVG() Contract: Canvas view classes implement getSVG()', async () => {
  // 1. Circle Theorems (7 using canvas.js)
  const circleModules = [
    'alternate-segment',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'perpendicular-chord-bisector',
    'tangent-radius',
    'tangents-from-external-point',
  ];

  for (const slug of circleModules) {
    const mod = await import(`../visuals/circle-theorems/${slug}/src/canvas.js`);
    assert.ok(typeof mod.CanvasView.prototype.getSVG === 'function', `${slug}: CanvasView must implement getSVG()`);
  }

  // 2. Thales Theorem
  const thalesMod = await import('../visuals/circle-theorems/thales-theorem/src/views/Canvas2DView.js');
  assert.ok(typeof thalesMod.Canvas2DView.prototype.getSVG === 'function', 'Thales: Canvas2DView must implement getSVG()');

  // 3. Trigonometry Suite
  const trigMod = await import('../visuals/trigonometry/js/trig-core.js');
  assert.ok(typeof trigMod.TrigCanvas2DView.prototype.getSVG === 'function', 'Trig: TrigCanvas2DView must implement getSVG()');
});

test('3D WebGL Snapshot: BaseScene3DView and Thales Scene3DView implement export3DPNG()', () => {
  assert.ok(typeof BaseScene3DView.prototype.export3DPNG === 'function', 'BaseScene3DView must implement export3DPNG()');
  assert.ok(typeof ThalesScene3DView.prototype.export3DPNG === 'function', 'Thales Scene3DView must implement export3DPNG()');
});

test('Worksheet Generator: generateWorksheetData covers all 12 visualizers with 4 problems & solutions each', () => {
  for (const slug of ALL_VISUAL_SLUGS) {
    const data = generateWorksheetData(slug, { radius: 180, angleTheta: 0.785, sideA: 8, sideB: 10, angleC: 1.05 });

    assert.ok(data.theoremTitle && typeof data.theoremTitle === 'string', `${slug}: Must provide theoremTitle`);
    assert.ok(data.theoremStatement && typeof data.theoremStatement === 'string', `${slug}: Must provide theoremStatement`);
    assert.ok(data.formula && typeof data.formula === 'string', `${slug}: Must provide formula`);
    assert.ok(Array.isArray(data.givenValues) && data.givenValues.length >= 3, `${slug}: Must provide at least 3 given values`);

    // Verify 4 structured problems
    assert.strictEqual(data.problems.length, 4, `${slug}: Must provide exactly 4 structured problems`);
    data.problems.forEach((prob, idx) => {
      assert.strictEqual(prob.number, idx + 1, `${slug}: Problem number must match index`);
      assert.ok(prob.title, `${slug}: Problem ${idx + 1} must have a title`);
      assert.ok(prob.prompt, `${slug}: Problem ${idx + 1} must have a prompt`);
      assert.ok(prob.marks > 0, `${slug}: Problem ${idx + 1} must have positive marks`);
      assert.ok(Array.isArray(prob.subQuestions) && prob.subQuestions.length >= 2, `${slug}: Problem ${idx + 1} must have sub-questions`);
    });

    // Verify 4 corresponding educator solutions
    assert.strictEqual(data.solutions.length, 4, `${slug}: Must provide exactly 4 educator solutions`);
    data.solutions.forEach((sol, idx) => {
      assert.strictEqual(sol.number, idx + 1, `${slug}: Solution number must match index`);
      assert.ok(sol.title, `${slug}: Solution ${idx + 1} must have a title`);
      assert.ok(Array.isArray(sol.steps) && sol.steps.length >= 2, `${slug}: Solution ${idx + 1} must have derivation steps`);
      assert.ok(sol.finalAnswer, `${slug}: Solution ${idx + 1} must have a final answer`);
      assert.ok(sol.rubric, `${slug}: Solution ${idx + 1} must have a marking rubric`);
    });

    // Verify common misconceptions
    assert.ok(Array.isArray(data.commonMisconceptions) && data.commonMisconceptions.length >= 2, `${slug}: Must provide pedagogical misconceptions`);
  }
});

test('Worksheet Generator: generateWorksheetHTML generates valid A4 print document with both pages', () => {
  const dummySvg = '<svg viewBox="0 0 800 600"><circle cx="400" cy="300" r="150" fill="none" stroke="#38bdf8"/></svg>';
  const html = generateWorksheetHTML({ visualId: 'angle-at-centre', state: { radius: 180 }, svgMarkup: dummySvg });

  assert.ok(typeof html === 'string', 'Generated HTML must be a string');
  assert.ok(html.includes('<!DOCTYPE html>'), 'Must have HTML5 doctype');
  assert.ok(html.includes('@page {'), 'Must define @page print styles');
  assert.ok(html.includes('size: A4 portrait;'), 'Must configure A4 portrait layout');
  assert.ok(html.includes('Student Name:'), 'Must include Student Name header line');
  assert.ok(html.includes('Angle at the Centre Theorem'), 'Must include theorem title');
  assert.ok(html.includes('Question 1:'), 'Must include student questions');
  assert.ok(html.includes('class="page-break"'), 'Must include page break for Educator Key');
  assert.ok(html.includes('EDUCATOR MARKING GUIDE &amp; ANSWER KEY'), 'Must include educator marking guide header');
  assert.ok(html.includes('window.print()'), 'Must include native browser print action');
});

test('Animation Loop Recorder: class contract and MIME type discovery', () => {
  assert.ok(typeof AnimationLoopRecorder.isSupported === 'function', 'AnimationLoopRecorder must implement isSupported()');
  assert.ok(typeof AnimationLoopRecorder.getSupportedMimeType === 'function', 'AnimationLoopRecorder must implement getSupportedMimeType()');

  const dummyCanvas = {};
  const recorder = new AnimationLoopRecorder(dummyCanvas, { durationMs: 2500, filename: 'test-loop.webm' });
  assert.strictEqual(recorder.durationMs, 2500, 'durationMs should match configuration');
  assert.strictEqual(recorder.filename, 'test-loop.webm', 'filename should match configuration');
  assert.strictEqual(recorder.isRecording, false, 'Initial recording state must be false');
});

test('Cross-Visual HTML Compliance: all 12 visualizers feature the Export & Presentation Toolkit', () => {
  const htmlFiles = [
    'visuals/circle-theorems/alternate-segment/index.html',
    'visuals/circle-theorems/angle-at-centre/index.html',
    'visuals/circle-theorems/angles-in-same-segment/index.html',
    'visuals/circle-theorems/cyclic-quadrilateral/index.html',
    'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
    'visuals/circle-theorems/tangent-radius/index.html',
    'visuals/circle-theorems/tangents-from-external-point/index.html',
    'visuals/circle-theorems/thales-theorem/index.html',
    'visuals/trigonometry/unit-circle-helix/index.html',
    'visuals/trigonometry/law-of-sines/index.html',
    'visuals/trigonometry/law-of-cosines/index.html',
    'visuals/trigonometry/angle-sum-identities/index.html',
  ];

  for (const path of htmlFiles) {
    const raw = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    assert.ok(raw.includes('id="section-export-toolkit"'), `${path}: Must contain #section-export-toolkit`);
    assert.ok(raw.includes('Export &amp; Presentation Toolkit') || raw.includes('Export & Presentation Toolkit'), `${path}: Must have Export Toolkit header`);
    assert.ok(raw.includes('id="btn-export-png"'), `${path}: Must contain #btn-export-png`);
    assert.ok(raw.includes('id="btn-export-svg"'), `${path}: Must contain #btn-export-svg`);
    assert.ok(raw.includes('id="btn-export-3d-png"'), `${path}: Must contain #btn-export-3d-png`);
    assert.ok(raw.includes('id="btn-record-loop"'), `${path}: Must contain #btn-record-loop`);
    assert.ok(raw.includes('id="btn-export-worksheet"'), `${path}: Must contain #btn-export-worksheet`);
  }
});

