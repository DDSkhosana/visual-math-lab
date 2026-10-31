import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLabelKeyMatch,
  isLabelVisible,
  getPointLabel,
  VISUAL_LABELS_REGISTRY,
  VISUAL_LABELS_REGISTRY_3D,
  mountIndividualLabelsUI,
  createStore,
  createDefaultVisState,
  drawHaloText,
} from '../js/circle-core.js';
import { LabelOverlay3D } from '../js/circle-3d.js';

test('Individual Labels: isLabelKeyMatch matches point labels, angles, edges, functions and subscripts', () => {
  // 1. Single letter points vs edges (case-sensitive)
  assert.strictEqual(isLabelKeyMatch('A', 'A'), true, 'Point A must match key A');
  assert.strictEqual(isLabelKeyMatch('A (120, 0)', 'A'), true, 'A with coords must match key A');
  assert.strictEqual(isLabelKeyMatch('A(α)', 'A'), true, 'A(α) must match key A');
  assert.strictEqual(isLabelKeyMatch('a = 5.0', 'A'), false, 'Edge a must NOT match uppercase Point A');
  assert.strictEqual(isLabelKeyMatch('a = 5.0', 'a'), true, 'Edge a must match lowercase key a');
  assert.strictEqual(isLabelKeyMatch('B', 'A'), false, 'Point B must not match Point A');

  // 2. Subscript equivalence
  assert.strictEqual(isLabelKeyMatch('P₁', 'P1'), true, 'P₁ must match key P1');
  assert.strictEqual(isLabelKeyMatch('P₁ (20, 30)', 'P1'), true, 'P₁ with coords must match key P1');
  assert.strictEqual(isLabelKeyMatch('P₂', 'P1'), false, 'P₂ must NOT match key P1');
  assert.strictEqual(isLabelKeyMatch('T₁', 'T1'), true, 'T₁ must match key T1');
  assert.strictEqual(isLabelKeyMatch('T₂', 'T2'), true, 'T₂ must match key T2');

  // 3. Greek letter & numerical angle badges
  assert.strictEqual(isLabelKeyMatch('2θ = 90.0°', '2θ'), true, '2θ badge must match key 2θ');
  assert.strictEqual(isLabelKeyMatch('θ = 45.0°', '2θ'), false, 'θ badge must NOT match key 2θ');
  assert.strictEqual(isLabelKeyMatch('θ = 45.0°', 'θ'), true, 'θ badge must match key θ');
  assert.strictEqual(isLabelKeyMatch('2θ = 90.0°', 'θ'), false, '2θ badge must NOT match key θ');
  assert.strictEqual(isLabelKeyMatch('90.0° (3D Invariant)', '90°'), true, '90.0° 3D badge must match key 90°');
  assert.strictEqual(isLabelKeyMatch('270.0° (P*)', '90°'), false, '270° badge must not match 90°');

  // 4. Trigonometric functions
  assert.strictEqual(isLabelKeyMatch('cos θ = 0.707', 'cos'), true, 'cos badge must match key cos');
  assert.strictEqual(isLabelKeyMatch('sin θ = 0.707', 'sin'), true, 'sin badge must match key sin');
  assert.strictEqual(isLabelKeyMatch('cos θ = 0.707', 'sin'), false, 'cos badge must not match key sin');

  // 5. Special tokens (N_D, A', Hc, Uc)
  assert.strictEqual(isLabelKeyMatch('N_D', 'N_D'), true, 'N_D must match key N_D');
  assert.strictEqual(isLabelKeyMatch('N_diff', 'N_D'), true, 'N_diff must match key N_D');
  assert.strictEqual(isLabelKeyMatch("A'", "A'"), true, "A' must match key A'");
  assert.strictEqual(isLabelKeyMatch('Hc', 'Hc'), true, 'Hc must match key Hc');
  assert.strictEqual(isLabelKeyMatch('Uc', 'Uc'), true, 'Uc must match key Uc');
});

test('Individual Labels: isLabelVisible and getPointLabel obey hiddenLabels mapping', () => {
  const visDefault = { labels: true, coords: false, hiddenLabels: {} };
  assert.strictEqual(isLabelVisible('A', visDefault), true, 'Label A must be visible by default');
  assert.strictEqual(getPointLabel('A', 10, 20, visDefault), 'A', 'getPointLabel must return A by default');

  // Hide label A individually
  const visHideA = { labels: true, coords: false, hiddenLabels: { A: true } };
  assert.strictEqual(isLabelVisible('A', visHideA), false, 'Label A must be hidden when in hiddenLabels');
  assert.strictEqual(getPointLabel('A', 10, 20, visHideA), '', 'getPointLabel must return empty string for hidden A');
  assert.strictEqual(isLabelVisible('B', visHideA), true, 'Label B must remain visible when only A is hidden');
  assert.strictEqual(getPointLabel('B', 10, 20, visHideA), 'B', 'getPointLabel must return B');

  // Master labels toggle OFF overrides everything
  const visMasterOff = { labels: false, coords: false, hiddenLabels: {} };
  assert.strictEqual(getPointLabel('B', 10, 20, visMasterOff), '', 'Master labels OFF must hide all text');

  // Master labels OFF with coords ON shows coords
  const visMasterOffCoordsOn = { labels: false, coords: true, hiddenLabels: {} };
  assert.strictEqual(getPointLabel('B', 10, 20, visMasterOffCoordsOn), '(10, 20)', 'Coords must show when master coords is on');

  // But individually hidden label suppresses coords as well
  const visHideBCoordsOn = { labels: true, coords: true, hiddenLabels: { B: true } };
  assert.strictEqual(getPointLabel('B', 10, 20, visHideBCoordsOn), '', 'Individually hidden point suppresses label and coords');
});

test('Individual Labels: VISUAL_LABELS_REGISTRY registers all 12 modules with appropriate labels', () => {
  const expectedModules = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
    'unit-circle-helix',
    'law-of-sines',
    'law-of-cosines',
    'angle-sum-identities',
  ];

  for (const modId of expectedModules) {
    const list2D = VISUAL_LABELS_REGISTRY[modId];
    assert.ok(Array.isArray(list2D) && list2D.length >= 3, `${modId} must have at least 3 registered 2D labels`);
    for (const item of list2D) {
      assert.ok(item.key, `${modId}: item must have a key`);
      assert.ok(item.name, `${modId}: item must have a display name`);
      assert.ok(item.color && item.color.startsWith('color-'), `${modId}: item must have a color token class`);
    }

    const list3D = VISUAL_LABELS_REGISTRY_3D[modId] || VISUAL_LABELS_REGISTRY[modId];
    assert.ok(Array.isArray(list3D) && list3D.length >= 3, `${modId} must have registered 3D labels`);
  }
});

function createMockElement(tagName = 'div', id = '', elementsMap = null) {
  const listeners = {};
  const classes = new Set();
  const attributes = {};
  const children = [];
  let _id = id;

  const el = {
    tagName: tagName.toUpperCase(),
    get id() {
      return _id;
    },
    set id(val) {
      _id = val;
      if (val && elementsMap) elementsMap.set(val, el);
    },
    type: tagName === 'button' ? 'button' : undefined,
    dataset: {},
    style: {},
    parentNode: null,
    nextSibling: null,
    children,
    textContent: '',
    innerHTML: '',
    get className() {
      return Array.from(classes).join(' ');
    },
    set className(val) {
      classes.clear();
      (val || '').split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
    },
    classList: {
      add: (...cls) => cls.forEach((c) => classes.add(c)),
      remove: (...cls) => cls.forEach((c) => classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c);
          else classes.add(c);
        } else if (force) {
          classes.add(c);
        } else {
          classes.delete(c);
        }
      },
      contains: (c) => classes.has(c),
      [Symbol.iterator]: () => classes.values(),
    },
    setAttribute: (k, v) => { attributes[k] = String(v); },
    getAttribute: (k) => attributes[k] || null,
    addEventListener: (type, handler) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    click: () => {
      if (listeners.click) {
        listeners.click.forEach((fn) => fn({ target: el }));
      }
    },
    appendChild: (child) => {
      child.parentNode = el;
      if (children.length > 0) {
        children[children.length - 1].nextSibling = child;
      }
      children.push(child);
      return child;
    },
    insertBefore: (newChild, refChild) => {
      newChild.parentNode = el;
      const idx = children.indexOf(refChild);
      if (idx !== -1) {
        children.splice(idx, 0, newChild);
      } else {
        children.push(newChild);
      }
      return newChild;
    },
    closest: (sel) => {
      let cur = el;
      while (cur) {
        if (sel === '.checkbox-container' && cur.classList?.contains('checkbox-container')) return cur;
        cur = cur.parentNode;
      }
      return null;
    },
    querySelector: (sel) => {
      const all = el.querySelectorAll(sel);
      return all[0] || null;
    },
    querySelectorAll: (sel) => {
      const matched = [];
      const walk = (node) => {
        if (!node || !node.children) return;
        for (const child of node.children) {
          if (sel === '.label-chip' && child.classList?.contains('label-chip')) matched.push(child);
          if (sel === '.chip-check' && child.classList?.contains('chip-check')) matched.push(child);
          if (sel.startsWith('[data-action=') && child.dataset?.action === sel.slice(14, -2)) matched.push(child);
          if (sel.startsWith('[data-label=') && child.dataset?.label === sel.slice(13, -2)) matched.push(child);
          if (sel.includes('span[class*="color-"]') && child.classList) {
            for (const c of child.classList) {
              if (c.startsWith('color-')) { matched.push(child); break; }
            }
          }
          walk(child);
        }
      };
      walk(el);
      return matched;
    },
  };
  return el;
}

test('Individual Labels: mountIndividualLabelsUI creates interactive chip controls and syncs with store', () => {
  const elements = new Map();
  const getOrCreate = (id, tag = 'div') => {
    if (!elements.has(id)) {
      const el = createMockElement(tag, id, elements);
      elements.set(id, el);
    }
    return elements.get(id);
  };

  const container2D = getOrCreate('checkbox-2d', 'label');
  container2D.classList.add('checkbox-container');
  const input2D = getOrCreate('vis-2d-labels', 'input');
  container2D.appendChild(input2D);

  const container3D = getOrCreate('checkbox-3d', 'label');
  container3D.classList.add('checkbox-container');
  const input3D = getOrCreate('vis-3d-labels', 'input');
  container3D.appendChild(input3D);

  const panelBody2D = getOrCreate('panel-body-2d', 'div');
  panelBody2D.appendChild(container2D);

  const panelBody3D = getOrCreate('panel-body-3d', 'div');
  panelBody3D.appendChild(container3D);

  global.document = {
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => {
      const el = createMockElement(tag, '', elements);
      return el;
    },
  };

  const store = createStore({
    ...createDefaultVisState(),
  });

  mountIndividualLabelsUI(store, { visualId: 'angle-at-centre' });

  // 1. Verify 2D and 3D wrappers created
  const wrapper2D = elements.get('individual-labels-2d-wrapper');
  const wrapper3D = elements.get('individual-labels-3d-wrapper');
  assert.ok(wrapper2D, '#individual-labels-2d-wrapper must be mounted');
  assert.ok(wrapper3D, '#individual-labels-3d-wrapper must be mounted');

  // 2. Verify chips for angle-at-centre: O, A, B, P, 2θ, θ
  const chips2D = wrapper2D.querySelectorAll('.label-chip');
  assert.ok(chips2D.length >= 4, 'Must create at least 4 chips for 2D labels');
  const chipKeys = Array.from(chips2D).map((c) => c.dataset.labelKey);
  assert.ok(chipKeys.includes('A'), 'Chips must contain A');
  assert.ok(chipKeys.includes('O'), 'Chips must contain O');
  assert.ok(chipKeys.includes('P'), 'Chips must contain P');

  // 3. Test clicking chip A toggles hiddenLabels in store
  const chipA = Array.from(chips2D).find((c) => c.dataset.labelKey === 'A');
  chipA.click();
  assert.strictEqual(store.get().vis2d.hiddenLabels['A'], true, 'Clicking chip A must set hiddenLabels.A = true');
  assert.strictEqual(chipA.classList.contains('active'), false, 'Chip A must now be inactive');

  // 4. Test clicking Quick Action [None] hides all labels
  const btnNone = wrapper2D.querySelector('[data-action="none"]');
  btnNone.click();
  assert.strictEqual(store.get().vis2d.hiddenLabels['A'], true, 'None must hide A');
  assert.strictEqual(store.get().vis2d.hiddenLabels['B'], true, 'None must hide B');
  assert.strictEqual(store.get().vis2d.hiddenLabels['P'], true, 'None must hide P');
  assert.strictEqual(store.get().vis2d.hiddenLabels['O'], true, 'None must hide O');

  // 5. Test clicking Quick Action [All] clears hiddenLabels
  const btnAll = wrapper2D.querySelector('[data-action="all"]');
  btnAll.click();
  assert.deepStrictEqual(store.get().vis2d.hiddenLabels, {}, 'All must reset hiddenLabels to empty');
  assert.strictEqual(chipA.classList.contains('active'), true, 'Chip A must now be active');

  // 6. Test disabling master labels applies .is-disabled to wrapper
  store.set({ vis2d: { ...store.get().vis2d, labels: false } });
  assert.strictEqual(wrapper2D.classList.contains('is-disabled'), true, 'Wrapper must have .is-disabled when master is false');

  store.set({ vis2d: { ...store.get().vis2d, labels: true } });
  assert.strictEqual(wrapper2D.classList.contains('is-disabled'), false, 'Wrapper must remove .is-disabled when master is true');
});

test('Individual Labels: 2D drawHaloText and 3D LabelOverlay3D suppress individually hidden labels', () => {
  // 1. Test 2D drawHaloText suppression
  let strokeCount = 0;
  let fillCount = 0;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    strokeText: () => { strokeCount++; },
    fillText: () => { fillCount++; },
    __vis: {
      labels: true,
      hiddenLabels: { '2θ': true },
    },
  };

  drawHaloText(mockCtx, '2θ = 90.0°', 100, 100, '#eab308');
  assert.strictEqual(strokeCount, 0, '2θ badge must be suppressed when 2θ is in hiddenLabels');

  drawHaloText(mockCtx, 'θ = 45.0°', 100, 100, '#22c55e');
  assert.strictEqual(strokeCount, 1, 'θ badge must NOT be suppressed when only 2θ is hidden');

  // 2. Test 3D LabelOverlay3D suppression
  const overlayContainer = createMockElement('div', 'overlay-3d');
  global.document = {
    createElement: (tag) => createMockElement(tag),
  };

  const mockCamera = {};
  const mockThree = {
    Vector3: class {
      constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
      clone() { return new mockThree.Vector3(this.x, this.y, this.z); }
      project() { return this; }
    },
  };

  const overlay3D = new LabelOverlay3D(mockThree, overlayContainer, mockCamera);
  overlay3D.project = () => ({ x: 150, y: 150 });

  const labels = [
    { key: 'A', name: 'A', at: { x: 10, y: 0, z: 0 }, show: true, color: 'color-red' },
    { key: 'B', name: 'B', at: { x: -10, y: 0, z: 0 }, show: true, color: 'color-green' },
  ];

  // Render with A hidden in 3D
  overlay3D.render(labels, { labels: true, hiddenLabels: { A: true } });

  const elA = overlayContainer.querySelector('[data-label="A"]');
  const elB = overlayContainer.querySelector('[data-label="B"]');

  assert.ok(elA, 'Element for A exists');
  assert.ok(elB, 'Element for B exists');
  assert.strictEqual(elA.classList.contains('visible'), false, '3D Label A must not have .visible when hidden');
  assert.strictEqual(elA.style.display, 'none', '3D Label A must have display: none when hidden');
  assert.strictEqual(elB.classList.contains('visible'), true, '3D Label B must be visible');
});

test('Angles in Same Segment: P1, P2 angle wedges and individual label toggles', () => {
  // 1. Registry verification: θ1 (blue), θ2 (emerald), 2θ (yellow)
  const reg = VISUAL_LABELS_REGISTRY['angles-in-same-segment'];
  assert.ok(reg, 'Must have registry for angles-in-same-segment');
  const theta1Item = reg.find((item) => item.key === 'θ1');
  const theta2Item = reg.find((item) => item.key === 'θ2');
  const twoThetaItem = reg.find((item) => item.key === '2θ');
  assert.ok(theta1Item, 'Must register θ1');
  assert.strictEqual(theta1Item.color, 'color-blue', 'θ1 must be color-blue');
  assert.ok(theta2Item, 'Must register θ2');
  assert.strictEqual(theta2Item.color, 'color-emerald', 'θ2 must be color-emerald');
  assert.ok(twoThetaItem, 'Must register 2θ');
  assert.strictEqual(twoThetaItem.color, 'color-yellow', '2θ must be color-yellow');

  // 2. isLabelKeyMatch handles θ1, θ2, generic θ, and reflex angles
  assert.strictEqual(isLabelKeyMatch('θ₁ = 45.0°', 'θ1'), true, 'θ₁ badge must match key θ1');
  assert.strictEqual(isLabelKeyMatch('θ₁ = 45.0°', 'θ₁'), true, 'θ₁ badge must match key θ₁');
  assert.strictEqual(isLabelKeyMatch('θ₂ = 45.0°', 'θ1'), false, 'θ₂ badge must NOT match key θ1');
  assert.strictEqual(isLabelKeyMatch('θ₂ = 45.0°', 'θ2'), true, 'θ₂ badge must match key θ2');
  assert.strictEqual(isLabelKeyMatch('θ₁* = 315.0°', 'θ1'), true, 'Reflex θ₁* must match key θ1');
  assert.strictEqual(isLabelKeyMatch('θ₂* = 315.0°', 'θ2'), true, 'Reflex θ₂* must match key θ2');
  assert.strictEqual(isLabelKeyMatch('θ₁ = 45.0°', 'θ'), true, 'Generic key θ must match θ₁ badge');
  assert.strictEqual(isLabelKeyMatch('θ₂ = 45.0°', 'θ'), true, 'Generic key θ must match θ₂ badge');
  assert.strictEqual(isLabelKeyMatch('2θ = 90.0°', '2θ'), true, '2θ badge must match key 2θ');

  // 3. Selective visibility filtering
  const visHideTheta1 = { labels: true, angles: true, hiddenLabels: { θ1: true } };
  assert.strictEqual(isLabelVisible('θ₁', visHideTheta1), false, 'θ₁ must be hidden');
  assert.strictEqual(isLabelVisible('θ₁ = 45.0°', visHideTheta1), false, 'θ₁ badge must be hidden');
  assert.strictEqual(isLabelVisible('θ₂', visHideTheta1), true, 'θ₂ must remain visible when only θ1 is hidden');
  assert.strictEqual(isLabelVisible('θ₂ = 45.0°', visHideTheta1), true, 'θ₂ badge must remain visible');

  const visHideTheta2 = { labels: true, angles: true, hiddenLabels: { θ2: true } };
  assert.strictEqual(isLabelVisible('θ₁ = 45.0°', visHideTheta2), true, 'θ₁ must remain visible');
  assert.strictEqual(isLabelVisible('θ₂ = 45.0°', visHideTheta2), false, 'θ₂ must be hidden');
});

test('Alternate Segment: Planar and spatial labeling, tokens, and individual toggles', () => {
  // 1. Registry verification: D is color-indigo, Tangent, α, Alt Seg (Maj), Alt Seg (Min)
  const reg = VISUAL_LABELS_REGISTRY['alternate-segment'];
  assert.ok(reg, 'Must have registry for alternate-segment');
  const dItem = reg.find((item) => item.key === 'D');
  assert.ok(dItem, 'Must register D');
  assert.strictEqual(dItem.color, 'color-indigo', 'D must be color-indigo');

  const tanItem = reg.find((item) => item.key === 'Tangent');
  assert.ok(tanItem, 'Must register Tangent');
  assert.strictEqual(tanItem.color, 'color-emerald', 'Tangent must be color-emerald');

  const alphaItem = reg.find((item) => item.key === 'α');
  assert.ok(alphaItem, 'Must register α');
  assert.strictEqual(alphaItem.color, 'color-yellow', 'α must be color-yellow');

  const majItem = reg.find((item) => item.key === 'segMajor');
  assert.ok(majItem, 'Must register Alt Seg (Maj)');
  assert.strictEqual(majItem.color, 'color-sky', 'Alt Seg (Maj) must be color-sky');

  const minItem = reg.find((item) => item.key === 'segMinor');
  assert.ok(minItem, 'Must register Alt Seg (Min)');
  assert.strictEqual(minItem.color, 'color-violet', 'Alt Seg (Min) must be color-violet');

  // Point O should not be registered as point O is not rendered
  const oItem = reg.find((item) => item.key === 'O');
  assert.strictEqual(oItem, undefined, 'O must not be registered in alternate-segment');

  // 2. isLabelKeyMatch for alternate segment badges
  assert.strictEqual(isLabelKeyMatch('α = 60.0°', 'α'), true, 'α badge must match key α');
  assert.strictEqual(isLabelKeyMatch('α = 60.0°', 'a'), true, 'Latin key a must match Greek α badge');
  assert.strictEqual(isLabelKeyMatch('α* = 300.0°', 'α'), true, 'Reflex α* badge must match key α');
  assert.strictEqual(isLabelKeyMatch('α* = 300.0°', 'a'), true, 'Reflex α* badge must match Latin key a');
  assert.strictEqual(isLabelKeyMatch('Tangent', 'Tangent'), true, 'Tangent badge must match Tangent');
  assert.strictEqual(isLabelKeyMatch('Tangent', 'tangent'), true, 'Tangent badge must match lowercase tangent');
  assert.strictEqual(isLabelKeyMatch('Alt Seg (Maj)', 'segMajor'), true, 'Alt Seg (Maj) badge must match segMajor');
  assert.strictEqual(isLabelKeyMatch('Alt Seg (Maj)', 'Alt Seg (Maj)'), true, 'Alt Seg (Maj) badge must match full key');
  assert.strictEqual(isLabelKeyMatch('Alt Seg (Min)', 'segMinor'), true, 'Alt Seg (Min) badge must match segMinor');
  assert.strictEqual(isLabelKeyMatch('Alt Seg (Min)', 'Alt Seg (Min)'), true, 'Alt Seg (Min) badge must match full key');

  // 3. 3D LabelOverlay multi-property check (name, key, text)
  const overlayContainer = createMockElement('div', 'overlay-3d-alt');
  const mockThree = {
    Vector3: class {
      constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
      clone() { return new mockThree.Vector3(this.x, this.y, this.z); }
      project() { return this; }
    },
  };
  const overlay3D = new LabelOverlay3D(mockThree, overlayContainer, {});
  overlay3D.project = () => ({ x: 100, y: 100 });

  const labels = [
    { key: 'angTan', name: 'α', text: 'α = 60.0°', at: { x: 0, y: 0, z: 0 }, isAngle: true, color: 'color-yellow' },
    { key: 'angB', name: 'α', text: 'α = 60.0°', at: { x: 0, y: 0, z: 0 }, isAngle: true, color: 'color-yellow' },
    { key: 'tangent', name: 'Tangent', text: 'Tangent', at: { x: 0, y: 0, z: 0 }, color: 'color-emerald' },
    { key: 'segMajor', name: 'Alt Seg (Maj)', text: 'Alt Seg (Maj)', at: { x: 0, y: 0, z: 0 }, color: 'color-sky' },
  ];

  // Render with α hidden: angTan and angB must both be hidden
  overlay3D.render(labels, { labels: true, angles: true, hiddenLabels: { 'α': true } });
  const elTan = overlayContainer.querySelector('[data-label="angTan"]');
  const elB = overlayContainer.querySelector('[data-label="angB"]');
  const elTang = overlayContainer.querySelector('[data-label="tangent"]');
  const elMaj = overlayContainer.querySelector('[data-label="segMajor"]');

  assert.strictEqual(elTan.style.display, 'none', 'angTan must be hidden when α is in hiddenLabels');
  assert.strictEqual(elB.style.display, 'none', 'angB must be hidden when α is in hiddenLabels');
  assert.strictEqual(elTang.classList.contains('visible'), true, 'Tangent must remain visible');
  assert.strictEqual(elMaj.classList.contains('visible'), true, 'Alt Seg (Maj) must remain visible');
});

test('Angles in Same Segment: 3D Spatial Mode concyclic vertex mapping and wedge attachment', async () => {
  const { computeConcyclicPlaneAndCircle, setAngleWedgeVertices3D } = await import('../js/circle-3d.js');

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
    addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    length() { return Math.sqrt(this.lengthSq()); }
    normalize() { const l = this.length() || 1; this.multiplyScalar(1 / l); return this; }
    angleTo(v) { return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / (this.length() * v.length())))); }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    applyAxisAngle(axis, angle) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const cross = new Vec3().crossVectors(axis, this);
      const dot = axis.dot(this);
      this.multiplyScalar(cos).addScaledVector(cross, sin).addScaledVector(axis, dot * (1 - cos));
      return this;
    }
  }

  class MockBufferGeometry {
    constructor() {
      this.isBufferGeometry = true;
      this.attributes = {};
    }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    computeVertexNormals() {}
  }

  class MockBufferAttribute {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
  }

  const mockThree = {
    Vector3: Vec3,
    BufferGeometry: MockBufferGeometry,
    BufferAttribute: MockBufferAttribute,
  };

  const R = 10;
  const state = {
    angleA: 3.66,
    angleB: 5.76,
    angleP1: 2.09,
    angleP2: 1.05,
    latA: 1.31,
    latB: 1.83,
    latP1: 0.84,
    latP2: 0.84,
    dimensionMode: 'spatial',
  };

  const A = new Vec3(R * Math.sin(state.latA) * Math.cos(state.angleA), R * Math.cos(state.latA), R * Math.sin(state.latA) * Math.sin(state.angleA));
  const B = new Vec3(R * Math.sin(state.latB) * Math.cos(state.angleB), R * Math.cos(state.latB), R * Math.sin(state.latB) * Math.sin(state.angleB));
  const P1 = new Vec3(R * Math.sin(state.latP1) * Math.cos(state.angleP1), R * Math.cos(state.latP1), R * Math.sin(state.latP1) * Math.sin(state.angleP1));

  // 1. Calculate cutting circle through A, B, P1
  const circleInfo = computeConcyclicPlaneAndCircle(A, B, P1, R, mockThree);
  assert.ok(circleInfo.radius > 0, 'Cutting circle radius must be positive');
  assert.ok(circleInfo.center instanceof Vec3, 'Cutting circle center must be computed');

  const TAU = Math.PI * 2;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const sweepCW2D = norm(state.angleB - state.angleA);
  const p1Offset2D = norm(state.angleP1 - state.angleA);
  const p1InCW2D = (p1Offset2D > 0 && p1Offset2D < sweepCW2D);
  const segStart2D = p1InCW2D ? state.angleA : state.angleB;
  const segSweep2D = p1InCW2D ? sweepCW2D : (TAU - sweepCW2D);
  const rawT = norm(state.angleP2 - segStart2D) / (segSweep2D || 1);
  const t2 = Math.max(0.01, Math.min(0.99, rawT));

  const toCircleAngle = (pt) => {
    const d = new Vec3().subVectors(pt, circleInfo.center);
    return norm(Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u)));
  };
  const psiA = toCircleAngle(A);
  const psiB = toCircleAngle(B);
  const psiP1 = toCircleAngle(P1);

  const sweepCWSpatial = norm(psiB - psiA);
  const p1OffsetSpatial = norm(psiP1 - psiA);
  const p1InCWSpatial = (p1OffsetSpatial > 0 && p1OffsetSpatial < sweepCWSpatial);
  const segStartSpatial = p1InCWSpatial ? psiA : psiB;
  const segSweepSpatial = p1InCWSpatial ? sweepCWSpatial : (TAU - sweepCWSpatial);

  const psiP2 = norm(segStartSpatial + t2 * segSweepSpatial);
  const P2 = circleInfo.center.clone()
    .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiP2))
    .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiP2));

  // 2. Invariant: P2 must lie strictly on cutting circle
  const distP2FromCircleCenter = P2.distanceTo(circleInfo.center);
  assert.ok(Math.abs(distP2FromCircleCenter - circleInfo.radius) < 1e-4, 'P2 must lie strictly on concyclic cutting circle');

  // 3. Invariant: Angles subtended at P1 and P2 are identical on the cutting plane
  const v1_p1 = new Vec3().subVectors(A, P1);
  const v2_p1 = new Vec3().subVectors(B, P1);
  const v1_p2 = new Vec3().subVectors(A, P2);
  const v2_p2 = new Vec3().subVectors(B, P2);
  const degP1 = v1_p1.angleTo(v2_p1) * 180 / Math.PI;
  const degP2 = v1_p2.angleTo(v2_p2) * 180 / Math.PI;
  assert.ok(Math.abs(degP1 - degP2) < 1e-4, `Inscribed angles must match identically (P1=${degP1}, P2=${degP2})`);

  // 4. Invariant: Central angle subtended at circleInfo.center is exactly 2x inscribed angle
  const O = circleInfo.center;
  const vOA = new Vec3().subVectors(A, O);
  const vOB = new Vec3().subVectors(B, O);
  const degCent = vOA.angleTo(vOB) * 180 / Math.PI;
  assert.ok(Math.abs(degCent - 2 * degP1) < 1e-3, `Central angle at circle center must equal 2 * theta (got ${degCent} vs ${2 * degP1})`);

  // 5. Angle wedge meshes are attached directly to vertices P1, P2, and O
  const geomP1 = new MockBufferGeometry();
  const geomP2 = new MockBufferGeometry();
  const geomCent = new MockBufferGeometry();

  setAngleWedgeVertices3D(geomP1, P1, A, B, 2.4, 24, mockThree);
  setAngleWedgeVertices3D(geomP2, P2, A, B, 2.4, 24, mockThree);
  setAngleWedgeVertices3D(geomCent, O, A, B, 2.6, 24, mockThree);

  const arrP1 = geomP1.attributes.position.array;
  const arrP2 = geomP2.attributes.position.array;
  const arrCent = geomCent.attributes.position.array;

  assert.ok(Math.hypot(arrP1[0] - P1.x, arrP1[1] - P1.y, arrP1[2] - P1.z) < 1e-4, 'Angle wedge P1 apex must be firmly attached to vertex P1');
  assert.ok(Math.hypot(arrP2[0] - P2.x, arrP2[1] - P2.y, arrP2[2] - P2.z) < 1e-4, 'Angle wedge P2 apex must be firmly attached to vertex P2');
  assert.ok(Math.hypot(arrCent[0] - O.x, arrCent[1] - O.y, arrCent[2] - O.z) < 1e-4, 'Central angle wedge apex must be firmly attached to circle center O');
});
