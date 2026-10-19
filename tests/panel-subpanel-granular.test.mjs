import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WorkspaceDockManager,
  initWorkspaceDock,
  syncPanelElevationTurn,
  initCollapsibleSections,
  setExpandButtonUI,
  setPanelMinimizeButtonUI,
  Panel,
  stepSpring,
  VelocityTracker,
  computeEdgeSnapTarget,
  CHEVRON_DOWN_SVG,
  CHEVRON_UP_SVG,
  CHEVRON_DOWN_SINGLE_SVG,
  CHEVRON_UP_SINGLE_SVG,
} from '../js/circle-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Lightweight mock element to simulate DOM tree and events in headless Node.js.
 */
class MockDOMElement {
  constructor(tag = 'div', className = '', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentElement = null;
    this.ownerDocument = null;
    this.attributes = new Map();
    this.hidden = false;
    this.scrollTop = 0;
    this.scrollHeight = 200;
    this.clientHeight = 100;
    this.offsetWidth = 320;
    this.offsetHeight = 240;
    this.style = {
      _props: new Map(),
      setProperty: (prop, val) => this.style._props.set(prop, val),
      getPropertyValue: (prop) => this.style._props.get(prop) || '',
      position: '',
      left: '',
      top: '',
      right: '',
      bottom: '',
      width: '',
      height: '',
      zIndex: '',
      display: '',
    };
    this.classList = {
      _set: new Set(className.split(' ').filter(Boolean)),
      add(...tokens) {
        tokens.forEach((t) => this._set.add(t));
      },
      remove(...tokens) {
        tokens.forEach((t) => this._set.delete(t));
      },
      toggle(token, force) {
        if (force === undefined) {
          if (this._set.has(token)) {
            this._set.delete(token);
            return false;
          }
          this._set.add(token);
          return true;
        } else if (force) {
          this._set.add(token);
          return true;
        } else {
          this._set.delete(token);
          return false;
        }
      },
      contains(token) {
        return this._set.has(token);
      },
    };
    this.listeners = new Map();
  }

  get className() {
    return Array.from(this.classList._set).join(' ');
  }
  set className(val) {
    this.classList._set = new Set(String(val).split(' ').filter(Boolean));
  }

  get parentNode() {
    return this.parentElement;
  }

  get textContent() {
    if (this._textContent !== undefined) return this._textContent;
    if (this._innerHTML !== undefined) return this._innerHTML.replace(/<[^>]*>/g, '');
    return '';
  }
  set textContent(val) {
    this._textContent = String(val);
    this._innerHTML = String(val);
  }

  get innerHTML() {
    return this._innerHTML || '';
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._textContent = String(val).replace(/<[^>]*>/g, '');
    if (val === '') {
      this.children.forEach((c) => {
        c.parentElement = null;
      });
      this.children = [];
    }
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  appendChild(child) {
    if (child.parentElement && child.parentElement !== this) {
      const idx = child.parentElement.children.indexOf(child);
      if (idx !== -1) child.parentElement.children.splice(idx, 1);
    }
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    if (child.parentElement && child.parentElement !== this) {
      const idx = child.parentElement.children.indexOf(child);
      if (idx !== -1) child.parentElement.children.splice(idx, 1);
    }
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.unshift(child);
    return child;
  }

  insertBefore(newNode, refNode) {
    if (newNode.parentElement && newNode.parentElement !== this) {
      const idx = newNode.parentElement.children.indexOf(newNode);
      if (idx !== -1) newNode.parentElement.children.splice(idx, 1);
    }
    newNode.parentElement = this;
    newNode.ownerDocument = this.ownerDocument;
    const idx = this.children.indexOf(refNode);
    if (idx !== -1) {
      this.children.splice(idx, 0, newNode);
    } else {
      this.children.push(newNode);
    }
    return newNode;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const check = (node) => {
      if (matches(node, selector)) results.push(node);
      for (const c of node.children) check(c);
    };
    for (const c of this.children) check(c);
    return results;
  }

  contains(node) {
    let curr = node;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentElement;
    }
    return false;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (matches(curr, selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(
      event,
      this.listeners.get(event).filter((h) => h !== handler)
    );
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    let stopped = false;
    const origStop = event.stopPropagation;
    event.stopPropagation = () => {
      stopped = true;
      if (origStop) origStop.call(event);
    };
    if (!event.preventDefault) event.preventDefault = () => {};

    let curr = this;
    while (curr) {
      const handlers = curr.listeners.get(event.type) || [];
      handlers.forEach((h) => h(event));
      if (stopped) break;
      curr = curr.parentElement;
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  focus() {
    this._isFocused = true;
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  setPointerCapture() {}
  hasPointerCapture() { return false; }
  releasePointerCapture() {}

  getBoundingClientRect() {
    const left = parseFloat(this.style.left) || 0;
    const top = parseFloat(this.style.top) || 0;
    const isRootOrLayer = this.classList.contains('floating-workspace') ||
                          this.classList.contains('circle-explorer') ||
                          this.classList.contains('thales-explorer') ||
                          this.tagName === 'BODY';
    const width = parseFloat(this.style.width) || (isRootOrLayer ? 1200 : 320);
    const height = parseFloat(this.style.height) || (isRootOrLayer ? 800 : 260);
    return { top, left, width, height, right: left + width, bottom: top + height };
  }

  scrollIntoView() {}
}

function matches(node, selector) {
  if (!node || !selector) return false;
  if (selector.includes(',')) {
    return selector.split(',').some((s) => matches(node, s.trim()));
  }
  let sel = selector;
  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(selector)) !== null) {
    const [, attr, val] = attrMatch;
    if (val !== undefined) {
      const nodeVal = (typeof node.getAttribute === 'function' ? node.getAttribute(attr) : null) ?? node[attr];
      if (nodeVal !== val) return false;
    } else {
      const hasAttr = (typeof node.hasAttribute === 'function' ? node.hasAttribute(attr) : false) || node[attr] !== undefined;
      if (!hasAttr) return false;
    }
    sel = sel.replace(attrMatch[0], '');
  }

  const idMatch = sel.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if (node.id !== idMatch[1]) return false;
    sel = sel.replace(idMatch[0], '');
  }

  const classMatches = sel.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const cls = cm.slice(1);
      if (!node.classList || !node.classList.contains(cls)) return false;
      sel = sel.replace(cm, '');
    }
  }

  sel = sel.trim();
  if (sel) {
    return node.tagName ? node.tagName.toLowerCase() === sel.toLowerCase() : false;
  }
  return true;
}

class MockDocument {
  constructor() {
    this.body = new MockDOMElement('body');
    this.body.ownerDocument = this;
    this.activeElement = null;
    this.listeners = new Map();
  }
  createElement(tag) {
    const el = new MockDOMElement(tag);
    el.ownerDocument = this;
    return el;
  }
  querySelector(sel) {
    return this.body.querySelector(sel);
  }
  querySelectorAll(sel) {
    return this.body.querySelectorAll(sel);
  }
  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }
  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(
      event,
      this.listeners.get(event).filter((h) => h !== handler)
    );
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this.body;
    if (!event.stopPropagation) event.stopPropagation = () => {};
    if (!event.preventDefault) event.preventDefault = () => {};
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }
}

function setupTestEnvironment() {
  globalThis.localStorage?.clear?.();
  const mockDoc = new MockDocument();
  const mockWin = {
    innerWidth: 1200,
    innerHeight: 800,
    listeners: new Map(),
    addEventListener(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(handler);
    },
    removeEventListener(event, handler) {
      if (!this.listeners.has(event)) return;
      this.listeners.set(event, this.listeners.get(event).filter((h) => h !== handler));
    },
    dispatchEvent(event) {
      const handlers = this.listeners.get(event.type) || [];
      handlers.forEach((h) => h(event));
    },
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  };
  mockDoc.defaultView = mockWin;
  globalThis.document = mockDoc;
  globalThis.window = mockWin;

  const root = mockDoc.createElement('div');
  root.className = 'circle-explorer';
  mockDoc.body.appendChild(root);

  const viewContainer = mockDoc.createElement('div');
  viewContainer.className = 'view-container';
  viewContainer.id = 'main-view';
  root.appendChild(viewContainer);

  return { mockDoc, mockWin, root, viewContainer };
}

// ============================================================================
// SUITE 1: LEVEL 1 PANELS — CORE LIFECYCLE & BEHAVIORS
// ============================================================================

test('Granular Panel: Controls Panel minimize, roll-up shade, and expand all lifecycle', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'panel-controls';

  const header = mockDoc.createElement('div');
  header.className = 'panel-header';
  const title = mockDoc.createElement('span');
  title.className = 'panel-title';
  title.textContent = 'Controls';
  header.appendChild(title);

  const minBtn = mockDoc.createElement('button');
  minBtn.className = 'panel-minimize-btn';
  header.appendChild(minBtn);

  const expandBtn = mockDoc.createElement('button');
  expandBtn.className = 'panel-expand-btn';
  header.appendChild(expandBtn);

  panel.appendChild(header);

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sec1 = mockDoc.createElement('div');
  sec1.className = 'collapsible-section collapsed';
  const h1 = mockDoc.createElement('div');
  h1.className = 'collapsible-header';
  h1.textContent = 'Section 1';
  const c1 = mockDoc.createElement('div');
  c1.className = 'collapsible-content collapsed';
  sec1.appendChild(h1);
  sec1.appendChild(c1);

  const sec2 = mockDoc.createElement('div');
  sec2.className = 'collapsible-section collapsed';
  const h2 = mockDoc.createElement('div');
  h2.className = 'collapsible-header';
  h2.textContent = 'Section 2';
  const c2 = mockDoc.createElement('div');
  c2.className = 'collapsible-content collapsed';
  sec2.appendChild(h2);
  sec2.appendChild(c2);

  body.appendChild(sec1);
  body.appendChild(sec2);
  panel.appendChild(body);
  root.appendChild(panel);

  initCollapsibleSections(root);
  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // 1. Initial State
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(panel.classList.contains('is-shaded'), false);

  // 2. Window Shade Toggle (Roll-up)
  const shadeBtn = panel.querySelector('.panel-shade-btn');
  assert.ok(shadeBtn, 'Dock manager must mount shade button into panel header');
  shadeBtn.click();
  assert.strictEqual(panel.classList.contains('is-shaded'), true, 'Clicking shade button must roll up panel');
  assert.strictEqual(shadeBtn.innerHTML, '□');

  shadeBtn.click();
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Clicking shade button again must un-shade panel');
  assert.strictEqual(shadeBtn.innerHTML, '─');

  // 3. Expand All Interaction
  expandBtn.click();
  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'true', 'Expand button must have aria-expanded="true"');
  assert.strictEqual(sec1.classList.contains('collapsed'), false);
  assert.strictEqual(sec2.classList.contains('collapsed'), false);
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(body.classList.contains('is-all-expanded'), true);

  // 4. Collapse All Interaction
  expandBtn.click();
  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(sec1.classList.contains('collapsed'), true);
  assert.strictEqual(sec2.classList.contains('collapsed'), true);
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(body.classList.contains('is-all-expanded'), false);
});

test('Granular Panel: Floating detach, coordinate memory, z-index elevation, and re-dock pipeline', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'panel-derivations';

  const header = mockDoc.createElement('div');
  header.className = 'panel-header';
  panel.appendChild(header);

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // 1. Float Panel
  dock.floatPanel('panel-derivations');
  const record = dock.panels.get('panel-derivations');
  assert.strictEqual(record.isFloating, true);
  assert.strictEqual(panel.classList.contains('is-floating'), true);
  assert.strictEqual(panel.parentElement, dock.floatingLayer, 'Floated panel must move into floating layer');

  // Verify default remembered coordinates applied
  assert.strictEqual(panel.style.position, 'absolute');
  assert.ok(panel.style.left.endsWith('px'));
  assert.ok(panel.style.top.endsWith('px'));

  // 2. Modify coordinates while floating
  record.lastPos.x = 420;
  record.lastPos.y = 180;
  panel.style.left = '420px';
  panel.style.top = '180px';

  // 3. Re-dock Panel
  dock.dockPanel('panel-derivations');
  assert.strictEqual(record.isFloating, false);
  assert.strictEqual(panel.classList.contains('is-floating'), false);
  assert.strictEqual(panel.parentElement, dock.dockBody, 'Re-docked panel must return to dockBody');
  assert.strictEqual(panel.style.position, '', 'Inline position must be cleared on dock');
  assert.strictEqual(panel.style.left, '', 'Inline left must be cleared on dock');
  assert.strictEqual(panel.style.top, '', 'Inline top must be cleared on dock');

  // 4. Float again: must restore custom position (420, 180)
  dock.floatPanel('panel-derivations');
  assert.strictEqual(panel.style.left, '420px', 'Float must restore custom remembered X position');
  assert.strictEqual(panel.style.top, '180px', 'Float must restore custom remembered Y position');
});

test('Granular Panel: Tray dropdown visibility toggle, hide state, and restore buttons', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const p1 = mockDoc.createElement('div');
  p1.className = 'ui-panel';
  p1.id = 'p1-modes';
  root.appendChild(p1);

  const p2 = mockDoc.createElement('div');
  p2.className = 'ui-panel';
  p2.id = 'p2-stats';
  root.appendChild(p2);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // 1. Hide Panel 1
  dock.setPanelVisible('p1-modes', false);
  assert.strictEqual(dock.panels.get('p1-modes').isHidden, true);
  assert.strictEqual(p1.style.display, 'none');

  // 2. Hide Panel 2 -> Dock is now completely empty
  dock.setPanelVisible('p2-stats', false);
  assert.strictEqual(dock.panels.get('p2-stats').isHidden, true);

  const emptyNotice = dock.dockBody.querySelector('.dock-empty-notice');
  assert.ok(emptyNotice, 'Dock must display empty notice when all panels are hidden');
  assert.strictEqual(emptyNotice.style.display, 'flex');

  // 3. Click Restore All button in empty notice
  const restoreBtn = emptyNotice.querySelector('.dock-empty-restore-btn');
  assert.ok(restoreBtn);
  restoreBtn.click();

  assert.strictEqual(dock.panels.get('p1-modes').isHidden, false, 'Panel 1 must be restored');
  assert.strictEqual(dock.panels.get('p2-stats').isHidden, false, 'Panel 2 must be restored');
  assert.strictEqual(emptyNotice.style.display, 'none', 'Empty notice must hide after restore');
});

// ============================================================================
// SUITE 2: LEVEL 2 NESTED SUBPANELS — ACCORDIONS, DERIVATION CARDS & DECKS
// ============================================================================

test('Granular Subpanel: Collapsible section toggle, ARIA sync, icon flipping, and content expansion', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const section = mockDoc.createElement('div');
  section.className = 'collapsible-section collapsed';

  const header = mockDoc.createElement('div');
  header.className = 'collapsible-header';
  const icon = mockDoc.createElement('span');
  icon.className = 'icon';
  icon.textContent = '▶';
  header.appendChild(icon);
  const text = mockDoc.createElement('span');
  text.textContent = 'Angle Parameters';
  header.appendChild(text);

  const content = mockDoc.createElement('div');
  content.className = 'collapsible-content collapsed';
  content.textContent = 'Sliders & Controls Content';

  section.appendChild(header);
  section.appendChild(content);
  root.appendChild(section);

  initCollapsibleSections(root);

  // 1. Initial State
  assert.strictEqual(section.classList.contains('collapsed'), true);
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(content.classList.contains('collapsed'), true);
  assert.strictEqual(icon.textContent, '▶');

  // 2. Open via Header Click
  header.click();
  assert.strictEqual(section.classList.contains('collapsed'), false, 'Section must open on click');
  assert.strictEqual(header.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(header.classList.contains('open'), true);
  assert.strictEqual(content.classList.contains('open'), true);
  assert.strictEqual(content.classList.contains('collapsed'), false);
  assert.strictEqual(icon.textContent, '▼', 'Icon must flip to down arrow');

  // 3. Close via Header Click
  header.click();
  assert.strictEqual(section.classList.contains('collapsed'), true);
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false');
  assert.strictEqual(icon.textContent, '▶');
});

test('Granular Subpanel: Derivation Card header toggle, open class, and mathematical content expansion', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const card = mockDoc.createElement('div');
  card.className = 'derivation-card';

  const header = mockDoc.createElement('div');
  header.className = 'derivation-card-header';
  const icon = mockDoc.createElement('span');
  icon.className = 'icon';
  icon.textContent = '▶';
  header.appendChild(icon);
  const title = mockDoc.createElement('span');
  title.textContent = 'Step 1: Triangle Invariants';
  header.appendChild(title);

  const content = mockDoc.createElement('div');
  content.className = 'derivation-card-content';
  content.textContent = 'Mathematical derivation text';

  card.appendChild(header);
  card.appendChild(content);
  root.appendChild(card);

  initCollapsibleSections(root);

  // Initial State: closed
  assert.strictEqual(card.classList.contains('open'), false);
  assert.strictEqual(header.getAttribute('aria-expanded'), 'false');

  // Open Card
  header.click();
  assert.strictEqual(card.classList.contains('open'), true);
  assert.strictEqual(header.classList.contains('open'), true);
  assert.strictEqual(content.classList.contains('open'), true);
  assert.strictEqual(header.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(icon.textContent, '▼');

  // Close Card
  header.click();
  assert.strictEqual(card.classList.contains('open'), false);
  assert.strictEqual(header.classList.contains('open'), false);
  assert.strictEqual(content.classList.contains('open'), false);
  assert.strictEqual(icon.textContent, '▶');
});

test('Granular Subpanel: Elevation Deck pills selection, turn advancement, and previous/next step cycling', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'deck-test-panel';

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sub1 = mockDoc.createElement('div');
  sub1.className = 'collapsible-section collapsed';
  const h1 = mockDoc.createElement('div');
  h1.className = 'collapsible-header';
  h1.textContent = 'Geometry Controls';
  sub1.appendChild(h1);
  sub1.appendChild(mockDoc.createElement('div'));

  const sub2 = mockDoc.createElement('div');
  sub2.className = 'collapsible-section collapsed';
  const h2 = mockDoc.createElement('div');
  h2.className = 'collapsible-header';
  h2.textContent = 'Coordinate Telemetry';
  sub2.appendChild(h2);
  sub2.appendChild(mockDoc.createElement('div'));

  const sub3 = mockDoc.createElement('div');
  sub3.className = 'collapsible-section collapsed';
  const h3 = mockDoc.createElement('div');
  h3.className = 'collapsible-header';
  h3.textContent = 'Formula Proofs';
  sub3.appendChild(h3);
  sub3.appendChild(mockDoc.createElement('div'));

  body.appendChild(sub1);
  body.appendChild(sub2);
  body.appendChild(sub3);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Open all 3 sections to trigger multi-expansion turn-taking deck
  sub1.classList.remove('collapsed');
  sub2.classList.remove('collapsed');
  sub3.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deck = body.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Deck must be generated');
  assert.strictEqual(deck.style.display, 'flex');

  const pills = deck.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 3);
  const prevBtn = deck.querySelector('.elevation-deck-nav-btn.prev');
  const nextBtn = deck.querySelector('.elevation-deck-nav-btn.next');
  assert.ok(prevBtn && nextBtn);

  // Turn 0: sub1
  assert.strictEqual(sub1.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(sub2.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(sub3.getAttribute('data-elevation-turn'), 'deck');

  // Click Next Button -> Turn 1: sub2
  nextBtn.click();
  assert.strictEqual(sub2.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(sub1.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(sub3.getAttribute('data-elevation-turn'), 'deck');

  // Click Next Button -> Turn 2: sub3
  const nextBtn2 = deck.querySelector('.elevation-deck-nav-btn.next');
  nextBtn2.click();
  assert.strictEqual(sub3.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(sub2.getAttribute('data-elevation-turn'), 'deck');

  // Click Next Button -> Wraps back to Turn 0: sub1
  const nextBtn3 = deck.querySelector('.elevation-deck-nav-btn.next');
  nextBtn3.click();
  assert.strictEqual(sub1.getAttribute('data-elevation-turn'), 'top');

  // Click Pill 3 directly -> Turn 2: sub3
  const updatedPills = deck.querySelectorAll('.elevation-deck-pill');
  updatedPills[2].click();
  assert.strictEqual(sub3.getAttribute('data-elevation-turn'), 'top');

  // Click Prev Button -> Turn 1: sub2
  const prevBtnUpdated = deck.querySelector('.elevation-deck-nav-btn.prev');
  prevBtnUpdated.click();
  assert.strictEqual(sub2.getAttribute('data-elevation-turn'), 'top');
});

test('Granular Subpanel: Deck vs Stack mode toggle dynamics and scroll flow', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'mode-toggle-panel';

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const secA = mockDoc.createElement('div');
  secA.className = 'collapsible-section';
  const secB = mockDoc.createElement('div');
  secB.className = 'collapsible-section';

  body.appendChild(secA);
  body.appendChild(secB);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  secA.classList.remove('collapsed');
  secB.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deck = body.querySelector('.panel-elevation-deck');
  const modeBtn = deck.querySelector('.elevation-deck-mode-toggle');
  assert.ok(modeBtn, 'Mode toggle button must exist');

  // Initial Deck mode: secA is top, secB is in-deck (hidden)
  assert.strictEqual(body.getAttribute('data-deck-mode') || 'deck', 'deck');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true);

  // Switch to Stack mode
  modeBtn.click();
  assert.strictEqual(body.getAttribute('data-deck-mode'), 'stack');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false, 'In stack mode, secA must not be hidden in deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), false, 'In stack mode, secB must not be hidden in deck');
  assert.ok(deck.querySelector('.elevation-deck-mode-toggle').textContent.includes('Stack'));

  // Switch back to Deck mode
  const modeBtnBack = deck.querySelector('.elevation-deck-mode-toggle');
  modeBtnBack.click();
  assert.strictEqual(body.getAttribute('data-deck-mode'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true, 'In deck mode, non-active turn must have is-in-deck');
});

test('Granular Subpanel: Mousewheel cycling on deck bar and boundary overscroll chaining', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'wheel-test-panel';

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sec1 = mockDoc.createElement('div');
  sec1.className = 'collapsible-section';
  const c1 = mockDoc.createElement('div');
  c1.className = 'collapsible-content';
  c1.scrollHeight = 100;
  c1.clientHeight = 100;
  c1.scrollTop = 0;
  sec1.appendChild(c1);

  const sec2 = mockDoc.createElement('div');
  sec2.className = 'collapsible-section';
  const c2 = mockDoc.createElement('div');
  c2.className = 'collapsible-content';
  c2.scrollHeight = 100;
  c2.clientHeight = 100;
  c2.scrollTop = 0;
  sec2.appendChild(c2);

  body.appendChild(sec1);
  body.appendChild(sec2);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  sec1.classList.remove('collapsed');
  sec2.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deck = body.querySelector('.panel-elevation-deck');
  assert.ok(deck);

  // 1. Wheel on deck bar down (deltaY: 60) -> Turn 1 (sec2)
  deck._lastWheelTime = 0;
  deck.dispatchEvent({ type: 'wheel', deltaY: 60 });
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'top');

  // 2. Wheel on deck bar up (deltaY: -60) -> Turn 0 (sec1)
  deck._lastWheelTime = 0;
  deck.dispatchEvent({ type: 'wheel', deltaY: -60 });
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top');

  // 3. Boundary overscroll down on active content c1 (at bottom of non-scrollable content)
  c1._lastTurnTime = 0;
  c1.dispatchEvent({ type: 'wheel', deltaY: 50 });
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'top', 'Boundary overscroll must switch to sec2');

  // 4. Boundary overscroll up on active content c2 (at top)
  c2._lastTurnTime = 0;
  c2.dispatchEvent({ type: 'wheel', deltaY: -50 });
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top', 'Boundary overscroll must switch back to sec1');
});

test('Granular Subpanel: Roving arrow navigation between Level 2 headers', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'roving-test-panel';

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sA = mockDoc.createElement('div');
  sA.className = 'collapsible-section';
  const hA = mockDoc.createElement('div');
  hA.className = 'collapsible-header';
  hA.textContent = 'Header Alpha';
  sA.appendChild(hA);

  const sB = mockDoc.createElement('div');
  sB.className = 'collapsible-section';
  const hB = mockDoc.createElement('div');
  hB.className = 'collapsible-header';
  hB.textContent = 'Header Beta';
  sB.appendChild(hB);

  const sC = mockDoc.createElement('div');
  sC.className = 'collapsible-section';
  const hC = mockDoc.createElement('div');
  hC.className = 'collapsible-header';
  hC.textContent = 'Header Gamma';
  sC.appendChild(hC);

  body.appendChild(sA);
  body.appendChild(sB);
  body.appendChild(sC);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Start on hA
  hA.focus();
  assert.strictEqual(mockDoc.activeElement, hA);

  // Press ArrowDown -> moves to hB
  root.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: hA });
  assert.strictEqual(mockDoc.activeElement, hB);

  // Press ArrowDown -> moves to hC
  root.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: hB });
  assert.strictEqual(mockDoc.activeElement, hC);

  // Press ArrowDown -> wraps to hA
  root.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: hC });
  assert.strictEqual(mockDoc.activeElement, hA);

  // Press ArrowUp -> wraps to hC
  root.dispatchEvent({ type: 'keydown', key: 'ArrowUp', target: hA });
  assert.strictEqual(mockDoc.activeElement, hC);

  // Press Home -> jumps to hA
  root.dispatchEvent({ type: 'keydown', key: 'Home', target: hC });
  assert.strictEqual(mockDoc.activeElement, hA);

  // Press End -> jumps to hC
  root.dispatchEvent({ type: 'keydown', key: 'End', target: hA });
  assert.strictEqual(mockDoc.activeElement, hC);
});

test('Granular Subpanel: The Escape Ladder hierarchical ascending', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'escape-panel';

  const panelHeader = mockDoc.createElement('div');
  panelHeader.className = 'panel-header';
  panel.appendChild(panelHeader);

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sec = mockDoc.createElement('div');
  sec.className = 'collapsible-section';
  const secHeader = mockDoc.createElement('div');
  secHeader.className = 'collapsible-header open';
  secHeader.setAttribute('aria-expanded', 'true');
  sec.appendChild(secHeader);

  const secContent = mockDoc.createElement('div');
  secContent.className = 'collapsible-content open';
  const innerInput = mockDoc.createElement('input');
  secContent.appendChild(innerInput);
  sec.appendChild(secContent);

  body.appendChild(sec);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Open section so we can test ladder traversal from inside open section
  sec.classList.remove('collapsed');
  sec.classList.add('open');
  secHeader.classList.add('open');
  secHeader.setAttribute('aria-expanded', 'true');
  secContent.classList.add('open');
  secContent.classList.remove('collapsed');

  // Level 3 Focus: inner input
  innerInput.focus();
  assert.strictEqual(mockDoc.activeElement, innerInput);

  // Step 1: Escape inside Level 3 input ascends to Level 2 Section Header
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(mockDoc.activeElement, secHeader, 'Escape in Level 3 must ascend to Level 2 Header');

  // Step 2: Escape on open Level 2 header triggers click to collapse it
  let collapseClicked = false;
  secHeader.click = () => { collapseClicked = true; };
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(collapseClicked, true, 'Escape on open Level 2 header must collapse section');

  // Simulate section now collapsed
  secHeader.classList.remove('open');
  secHeader.setAttribute('aria-expanded', 'false');
  sec.classList.add('collapsed');

  // Step 3: Escape on closed Level 2 header ascends to Level 1 Panel Header
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(mockDoc.activeElement, panelHeader, 'Escape on closed Level 2 header must ascend to Panel Header');
});

// ============================================================================
// SUITE 3: LEVEL 3 NESTED CONTROLS & ZERO-CLIPPING INVARIANTS
// ============================================================================

test('Granular Level 3: Nested slider and step components inside elevated subpanels', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'level3-panel';

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sec1 = mockDoc.createElement('div');
  sec1.className = 'collapsible-section';
  const h1 = mockDoc.createElement('div');
  h1.className = 'collapsible-header';
  sec1.appendChild(h1);
  const content1 = mockDoc.createElement('div');
  content1.className = 'collapsible-content';

  const sliderBox = mockDoc.createElement('div');
  sliderBox.className = 'slider-container';
  const slider = mockDoc.createElement('input');
  slider.type = 'range';
  sliderBox.appendChild(slider);

  const stepBox = mockDoc.createElement('div');
  stepBox.className = 'derivation-step';
  stepBox.textContent = 'Invariant Step: s² + t² = (2r)²';

  content1.appendChild(sliderBox);
  content1.appendChild(stepBox);
  sec1.appendChild(content1);

  const sec2 = mockDoc.createElement('div');
  sec2.className = 'collapsible-section';
  const h2 = mockDoc.createElement('div');
  h2.className = 'collapsible-header';
  sec2.appendChild(h2);
  const content2 = mockDoc.createElement('div');
  content2.className = 'collapsible-content';
  sec2.appendChild(content2);

  body.appendChild(sec1);
  body.appendChild(sec2);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Open both sections so elevation deck turn-taking activates
  sec1.classList.remove('collapsed');
  sec2.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  // Verify elements are preserved in DOM tree without suppression
  assert.strictEqual(content1.contains(sliderBox), true);
  assert.strictEqual(content1.contains(stepBox), true);
  assert.strictEqual(sliderBox.classList.contains('slider-container'), true);
  assert.strictEqual(stepBox.classList.contains('derivation-step'), true);

  // sec1 starts with elevation turn top
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top');

  // Slider input event must bubble cleanly without mutating dock edge or elevation
  let inputTriggered = false;
  slider.addEventListener('input', () => { inputTriggered = true; });
  slider.dispatchEvent({ type: 'input' });
  assert.strictEqual(inputTriggered, true, 'Level 3 slider inputs must fire without interference');
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top', 'Elevation turn must remain stable during Level 3 interactions');
});

test('Granular Dimension: Top/bottom dock height resizing and zero-clipping scroll contract', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify non-clipping CSS rules
  assert.ok(css.includes('overflow-y: auto !important'), 'Content containers must enforce overflow-y: auto !important');
  assert.ok(css.includes('scrollbar-gutter: stable !important'), 'Content containers must declare scrollbar-gutter: stable');
  assert.ok(css.includes('overscroll-behavior: contain !important'), 'Content containers must declare overscroll-behavior: contain');

  const { mockDoc, mockWin, root } = setupTestEnvironment();

  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  dock.setDockEdge('bottom');

  const resizer = dock.dockResizer;
  assert.ok(resizer);

  // Drag resizer upwards to expand dock height from 340px to 520px
  resizer.dispatchEvent({ type: 'pointerdown', pointerId: 10, clientX: 200, clientY: 500 });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 200, clientY: 320 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 10 });

  assert.strictEqual(dock.dockSizeHorizontal, 520, 'Bottom dock height must expand smoothly with upward drag');
  assert.strictEqual(dock.dockElement.style.height, '520px');
  assert.strictEqual(dock.dockElement.style.getPropertyValue('--dock-size'), '520px');
});

test('Granular All 8 Theorems: HTML structure contract for panels, headers, actions and chevrons', () => {
  const slugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of slugs) {
    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `File must exist: ${htmlPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Every visual must have panels with headers
    assert.ok(/class="[^"]*panel-header[^"]*"/.test(html), `${slug} must contain panel headers`);
    assert.ok(/class="[^"]*panel-body[^"]*"/.test(html), `${slug} must contain panel bodies`);
    assert.ok(/class="[^"]*collapsible-header[^"]*"/.test(html), `${slug} must contain collapsible headers`);
    assert.ok(/class="[^"]*collapsible-content[^"]*"/.test(html), `${slug} must contain collapsible content`);
    assert.ok(/class="[^"]*collapsible-section[^"]*"/.test(html), `${slug} must contain collapsible sections`);
  }
});

// ============================================================================
// SUITE 3: MATHEMATICAL MOTION PHYSICS & DIMENSION CONSERVATION CONTRACTS
// ============================================================================

test('Granular Motion Physics: Spring-damper integration, velocity tracking, and potential well snapping', () => {
  // 1. Semi-Implicit Euler Damped Harmonic Oscillator Convergence
  let state = { pos: 0, vel: 0, target: 100 };
  let iterations = 0;
  for (let i = 0; i < 180; i++) {
    state = stepSpring({ ...state, k: 280, c: 28, mass: 1, dt: 1 / 60 });
    iterations++;
    if (state.done) break;
  }
  assert.strictEqual(state.done, true, 'stepSpring must converge to target and report done=true');
  assert.ok(Math.abs(state.pos - 100) < 0.1, `Position (${state.pos}) must reach target (100) within resting threshold`);
  assert.ok(Math.abs(state.vel) < 0.1, `Velocity (${state.vel}) must settle to rest`);
  assert.ok(iterations < 120, `Spring damper must settle quickly (took ${iterations} frames)`);

  // Initial at-rest state returns immediately
  const atRest = stepSpring({ pos: 200, vel: 0, target: 200 });
  assert.strictEqual(atRest.done, true);
  assert.strictEqual(atRest.pos, 200);

  // 2. VelocityTracker Rolling Window Fling Momentum
  const tracker = new VelocityTracker(150);
  tracker.push(0, 0);
  tracker.push(25, 25);
  tracker.push(50, 50);
  tracker.push(100, 100);
  const vel = tracker.getVelocity();
  assert.strictEqual(vel, 1000, 'VelocityTracker must compute release velocity v = dx / dt = 1000 px/s');

  tracker.reset();
  assert.strictEqual(tracker.getVelocity(), 0, 'VelocityTracker must return 0 after reset');

  // Single sample returns 0
  tracker.push(50, 200);
  assert.strictEqual(tracker.getVelocity(), 0, 'Single sample must return velocity 0');

  // 3. Potential Well Edge Snapping: computeEdgeSnapTarget
  // Snapping near minBound (0)
  assert.strictEqual(computeEdgeSnapTarget(10, 0, 800, 24, 12), 12, 'Must snap to minBound + margin');
  assert.strictEqual(computeEdgeSnapTarget(23, 0, 800, 24, 12), 12, 'Must snap within threshold to minBound + margin');

  // Snapping near maxBound (800)
  assert.strictEqual(computeEdgeSnapTarget(785, 0, 800, 24, 12), 788, 'Must snap to maxBound - margin');
  assert.strictEqual(computeEdgeSnapTarget(777, 0, 800, 24, 12), 788, 'Must snap within threshold to maxBound - margin');

  // Neutral zone: unconstrained dragging
  assert.strictEqual(computeEdgeSnapTarget(400, 0, 800, 24, 12), 400, 'Must preserve position inside neutral zone');
  assert.strictEqual(computeEdgeSnapTarget(25, 0, 800, 24, 12), 25, 'Outside threshold must not snap');
  assert.strictEqual(computeEdgeSnapTarget(775, 0, 800, 24, 12), 775, 'Outside threshold must not snap');
});

test('Granular Motion Deck: Horizontal sliding transitions (slide-forward / slide-backward) on turn changes', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sub1 = mockDoc.createElement('div');
  sub1.className = 'collapsible-section';
  const h1 = mockDoc.createElement('div');
  h1.className = 'collapsible-header';
  h1.textContent = 'Controls';
  sub1.appendChild(h1);
  sub1.appendChild(mockDoc.createElement('div'));

  const sub2 = mockDoc.createElement('div');
  sub2.className = 'collapsible-section';
  const h2 = mockDoc.createElement('div');
  h2.className = 'collapsible-header';
  h2.textContent = 'Telemetry';
  sub2.appendChild(h2);
  sub2.appendChild(mockDoc.createElement('div'));

  const sub3 = mockDoc.createElement('div');
  sub3.className = 'collapsible-section';
  const h3 = mockDoc.createElement('div');
  h3.className = 'collapsible-header';
  h3.textContent = 'Formulas';
  sub3.appendChild(h3);
  sub3.appendChild(mockDoc.createElement('div'));

  body.appendChild(sub1);
  body.appendChild(sub2);
  body.appendChild(sub3);
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Open all 3 sections to trigger multi-expansion turn-taking deck
  sub1.classList.remove('collapsed');
  sub2.classList.remove('collapsed');
  sub3.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deck = body.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Deck must be present');
  const prevBtn = deck.querySelector('.elevation-deck-nav-btn.prev');
  const nextBtn = deck.querySelector('.elevation-deck-nav-btn.next');
  assert.ok(prevBtn && nextBtn);

  // 1. Initial active element is top without backward slide
  assert.strictEqual(sub1.classList.contains('is-elevated-top'), true);
  assert.strictEqual(sub1.classList.contains('slide-backward'), false);

  // 2. Next click advances with slide-forward
  nextBtn.click();
  assert.strictEqual(sub2.classList.contains('is-elevated-top'), true);
  assert.strictEqual(sub2.classList.contains('slide-forward'), true);
  assert.strictEqual(sub2.classList.contains('slide-backward'), false);
  assert.strictEqual(sub1.classList.contains('is-elevated-top'), false);
  assert.strictEqual(sub1.classList.contains('slide-forward'), false);

  // 3. Prev click reverses with slide-backward
  const prevBtn2 = deck.querySelector('.elevation-deck-nav-btn.prev');
  prevBtn2.click();
  assert.strictEqual(sub1.classList.contains('is-elevated-top'), true);
  assert.strictEqual(sub1.classList.contains('slide-backward'), true, 'Moving backward must apply slide-backward');
  assert.strictEqual(sub1.classList.contains('slide-forward'), false);

  // 4. Direct call to syncPanelElevationTurn with backward direction
  syncPanelElevationTurn(panel, sub3, { direction: 'backward' });
  assert.strictEqual(sub3.classList.contains('is-elevated-top'), true);
  assert.strictEqual(sub3.classList.contains('slide-backward'), true);
  assert.strictEqual(sub3.classList.contains('slide-forward'), false);

  // 5. Direct call to syncPanelElevationTurn with forward direction
  syncPanelElevationTurn(panel, sub2, { direction: 'forward' });
  assert.strictEqual(sub2.classList.contains('is-elevated-top'), true);
  assert.strictEqual(sub2.classList.contains('slide-forward'), true);
  assert.strictEqual(sub2.classList.contains('slide-backward'), false);
});

test('Granular Dimension Conservation: Level 2 and Level 3 overflow: visible and flex: 1 1 auto zero-clipping contracts', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify smooth scroll snapping on deck pills strip
  assert.ok(css.includes('scroll-behavior: smooth !important'), 'Deck pills strip must enforce scroll-behavior: smooth');
  assert.ok(css.includes('scroll-snap-type: x proximity !important'), 'Deck pills strip must declare scroll-snap-type: x proximity');
  assert.ok(css.includes('scroll-snap-align: center !important'), 'Deck pills must declare scroll-snap-align: center');

  // Verify zero-clipping contracts for .is-elevated-top wrapper
  assert.ok(css.includes('overflow: visible !important'), 'Elevated wrapper must enforce overflow: visible !important to eliminate clipping');
  assert.ok(css.includes('min-height: 0 !important'), 'Elevated wrapper must enforce min-height: 0 !important for flex dimension conservation');

  // Verify internal content scroll contracts
  assert.ok(css.includes('overflow-y: auto !important'), 'Content must handle vertical scroll');
  assert.ok(css.includes('scrollbar-gutter: stable !important'), 'Scrollbar gutter must remain stable to prevent layout shifts');

  // Verify deck slide keyframe animations
  assert.ok(css.includes('@keyframes deckSlideNext'), 'Deck slide forward keyframe animation must be defined');
  assert.ok(css.includes('@keyframes deckSlidePrev'), 'Deck slide backward keyframe animation must be defined');
  assert.ok(css.includes('.slide-forward'), '.slide-forward CSS class must be defined');
  assert.ok(css.includes('.slide-backward'), '.slide-backward CSS class must be defined');
});

// ============================================================================
// SUITE 4: FLOATING WINDOWS LIFECYCLE & NON-EMPTY RENDERING ACROSS ALL THEOREMS
// ============================================================================

test('Granular Floating Windows: All 32 panels across 8 theorems float out with rendered content, un-hidden body, close, and re-dock', () => {
  const slugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  let totalTestedPanels = 0;

  for (const slug of slugs) {
    const { mockDoc, root } = setupTestEnvironment();

    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const panelIds = [...html.matchAll(/<div[^>]*class="[^"]*ui-panel[^"]*"[^>]*id="([^"]+)"/g)].map((m) => m[1]);

    assert.strictEqual(panelIds.length, 4, `${slug} must declare exactly 4 panels in HTML`);

    // Build DOM representation matching each visualizer's HTML structure
    for (const id of panelIds) {
      const panel = mockDoc.createElement('div');
      panel.className = 'ui-panel';
      panel.id = id;

      const content = mockDoc.createElement('div');
      content.className = 'panel-content';

      const header = mockDoc.createElement('div');
      header.className = 'panel-header';
      const h1 = mockDoc.createElement('h1');
      h1.textContent = `${slug} ${id}`;
      header.appendChild(h1);

      const actions = mockDoc.createElement('div');
      actions.className = 'panel-header-actions';
      header.appendChild(actions);
      content.appendChild(header);

      // The theorem HTMLs statically declare panel-body with the hidden class
      const body = mockDoc.createElement('div');
      body.className = 'panel-body hidden';

      const sec = mockDoc.createElement('div');
      sec.className = 'collapsible-section collapsed';
      body.appendChild(sec);
      content.appendChild(body);

      panel.appendChild(content);
      root.appendChild(panel);
    }

    const dock = new WorkspaceDockManager(root, { document: mockDoc });

    for (const id of panelIds) {
      totalTestedPanels++;
      const record = dock.panels.get(id);
      assert.ok(record, `${slug} -> ${id} must be registered in WorkspaceDockManager`);
      assert.strictEqual(record.isFloating, false, `${id} must start docked`);

      const panel = record.element;
      const body = panel.querySelector('.panel-body');
      assert.ok(body, `${id} must have a .panel-body element`);

      // 1. Float out panel into floating workspace layer
      dock.floatPanel(id);
      assert.strictEqual(record.isFloating, true, `${id} must be marked isFloating=true`);
      assert.strictEqual(panel.classList.contains('is-floating'), true, `${id} must have class .is-floating`);
      assert.strictEqual(panel.parentElement, dock.floatingLayer, `${id} must be mounted in floatingLayer`);

      // Critical invariant: floating panel body MUST NOT be hidden or empty
      assert.strictEqual(body.classList.contains('hidden'), false, `${id} .hidden class must be removed on float`);
      assert.notStrictEqual(body.style.display, 'none', `${id} body display must not be 'none'`);

      // Controls and headers check
      assert.strictEqual(record.dockToggleBtn.innerHTML, '🗁', `${id} dock toggle button must show redock glyph 🗁`);
      assert.ok(record.dockToggleBtn.getAttribute('aria-label').includes('Dock'), `${id} aria-label must say Dock`);
      assert.ok(record.closeBtn, `${id} must have a close button mounted`);

      // 2. Close floating window via close button
      record.closeBtn.click();
      assert.strictEqual(record.isHidden, true, `${id} must be hidden after close click`);
      assert.strictEqual(panel.style.display, 'none', `${id} style.display must be none when closed`);

      // Re-open via dock manager setPanelVisible
      dock.setPanelVisible(id, true);
      assert.strictEqual(record.isHidden, false, `${id} must be un-hidden`);
      assert.strictEqual(panel.style.display, '', `${id} style.display must be restored`);

      // 3. Re-dock panel back into dockBody via dockToggleBtn
      record.dockToggleBtn.click();
      assert.strictEqual(record.isFloating, false, `${id} must return to isFloating=false`);
      assert.strictEqual(panel.classList.contains('is-floating'), false, `${id} must lose .is-floating class`);
      assert.strictEqual(panel.parentElement, dock.dockBody, `${id} must be reparented into dockBody`);
      assert.strictEqual(panel.style.position, '', `${id} absolute position must be cleared`);
      assert.strictEqual(panel.style.left, '', `${id} inline left must be cleared`);
      assert.strictEqual(panel.style.top, '', `${id} inline top must be cleared`);
      assert.strictEqual(record.dockToggleBtn.innerHTML, '⧉', `${id} dock toggle button must revert to float glyph ⧉`);
      assert.strictEqual(body.classList.contains('hidden'), false, `${id} body must remain visible inside dock container`);
    }
  }

  assert.strictEqual(totalTestedPanels, 32, 'All 32 panels across 8 theorems must be fully tested');
});

test('Granular Floating Windows: Auto-expansion of collapsed dock when re-docking floating panels', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'panel-auto-expand';

  const content = mockDoc.createElement('div');
  content.className = 'panel-content';
  const header = mockDoc.createElement('div');
  header.className = 'panel-header';
  const body = mockDoc.createElement('div');
  body.className = 'panel-body hidden';
  content.appendChild(header);
  content.appendChild(body);
  panel.appendChild(content);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // 1. Float out panel
  dock.floatPanel('panel-auto-expand');
  const record = dock.panels.get('panel-auto-expand');
  assert.strictEqual(record.isFloating, true);

  // 2. Collapse dock bar
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.isCollapsed, true);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), true);
  assert.strictEqual(root.classList.contains('dock-is-collapsed'), true);

  // 3. Re-dock floating panel: dock must auto-expand so user can see returned panel
  record.dockToggleBtn.click();
  assert.strictEqual(record.isFloating, false);
  assert.strictEqual(dock.isCollapsed, false, 'Dock must automatically un-collapse when a panel is docked');
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), false, 'Dock class must clear is-collapsed');
  assert.strictEqual(root.classList.contains('dock-is-collapsed'), false, 'Root class must clear dock-is-collapsed');
  assert.strictEqual(panel.parentElement, dock.dockBody);
});

test('Granular Floating Windows: CSS zero-clip header actions, title ellipsis, and non-empty floating body contracts', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Floating panel body forced display flex contract
  assert.ok(
    css.includes('.ui-panel.is-floating .panel-body') && css.includes('display: flex !important;'),
    'Floating panels must force display: flex !important on .panel-body to prevent blank windows'
  );
  assert.ok(
    css.includes('.ui-panel.is-floating:not(.is-shaded) .panel-body.hidden') && css.includes('display: flex !important;'),
    'Floating panels must override .hidden class with display: flex !important when not shaded'
  );

  // 2. Panel header actions zero-shrink & min-width contract
  assert.ok(
    css.includes('.panel-header-actions') &&
    css.includes('flex-shrink: 0 !important;') &&
    css.includes('min-width: max-content !important;'),
    'Panel header actions must enforce flex-shrink: 0 !important and min-width: max-content !important so buttons are never clipped'
  );

  // 3. Panel header titles text-overflow contract
  assert.ok(
    css.includes('text-overflow: ellipsis') &&
    css.includes('white-space: nowrap'),
    'Panel header titles must have ellipsis and nowrap to prevent action button clipping'
  );

  // 4. Shading must only target .panel-body, not .panel-content (which would hide header)
  assert.ok(
    css.includes('.ui-panel.is-shaded .panel-body'),
    'Shaded class must only target .panel-body so the window title and action buttons remain visible'
  );
  assert.strictEqual(
    css.includes('.ui-panel.is-shaded .panel-content'),
    false,
    'Shaded class must never hide .panel-content'
  );
});

test('Granular Window Shading: Roll-up, restore height, mutual deadlock resolution with minimize/expand, header click restore, and shelf dimensions', () => {
  const { mockDoc, root } = setupTestEnvironment();

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'panel-shade-test';

  const content = mockDoc.createElement('div');
  content.className = 'panel-content';
  const header = mockDoc.createElement('div');
  header.className = 'panel-header';
  const title = mockDoc.createElement('h1');
  title.textContent = '3D Controls & Toggles';
  header.appendChild(title);

  const actions = mockDoc.createElement('div');
  actions.className = 'panel-header-actions';
  const minBtn = mockDoc.createElement('button');
  minBtn.className = 'panel-minimize-btn';
  minBtn.id = 'min-btn-test';
  actions.appendChild(minBtn);

  const expBtn = mockDoc.createElement('button');
  expBtn.className = 'panel-expand-btn';
  expBtn.id = 'exp-btn-test';
  actions.appendChild(expBtn);

  header.appendChild(actions);
  content.appendChild(header);

  const body = mockDoc.createElement('div');
  body.className = 'panel-body';

  const sec1 = mockDoc.createElement('div');
  sec1.className = 'collapsible-section collapsed';
  const secH1 = mockDoc.createElement('div');
  secH1.className = 'collapsible-header';
  secH1.textContent = 'Section 1';
  sec1.appendChild(secH1);
  const secC1 = mockDoc.createElement('div');
  secC1.className = 'collapsible-content collapsed';
  sec1.appendChild(secC1);
  body.appendChild(sec1);

  content.appendChild(body);
  panel.appendChild(content);
  root.appendChild(panel);

  const panelController = new Panel(panel, {
    header,
    minimizeButton: minBtn,
    expandButton: expBtn,
  });

  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  const record = dock.panels.get('panel-shade-test');
  assert.ok(record);
  assert.ok(record.shadeBtn);

  // 1. Initial State: Unshaded and Accessible
  assert.strictEqual(panel.classList.contains('is-shaded'), false);
  assert.strictEqual(body.classList.contains('hidden'), false);
  assert.strictEqual(record.shadeBtn.innerHTML, '─');

  // 2. Roll up via shade button
  record.shadeBtn.click();
  assert.strictEqual(panel.classList.contains('is-shaded'), true, 'Clicking shadeBtn must shade panel');
  assert.strictEqual(body.classList.contains('hidden'), true, 'Shading must set hidden on panel-body');
  assert.strictEqual(record.shadeBtn.innerHTML, '□', 'Shade icon must toggle to restore square □');
  assert.strictEqual(record.shadeBtn.title, 'Restore window height');

  // 3. Restore height via shade button
  record.shadeBtn.click();
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Clicking shadeBtn again must un-shade panel');
  assert.strictEqual(body.classList.contains('hidden'), false, 'Un-shading must remove hidden from panel-body');
  assert.strictEqual(body.style.display, '', 'Un-shading must clear display none');
  assert.strictEqual(record.shadeBtn.innerHTML, '─');
  assert.strictEqual(record.shadeBtn.title, 'Roll up / restore window');

  // 4. Header Click Restore: Roll up again, then click header outside buttons
  dock.setPanelShaded('panel-shade-test', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  // Clicking on header title must restore window
  header.dispatchEvent({ type: 'click', target: title });
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Clicking on header must unshade panel');
  assert.strictEqual(body.classList.contains('hidden'), false);
  assert.strictEqual(record.shadeBtn.innerHTML, '─');

  // 5. Deadlock Resolution with Minimize Button:
  // When shaded, clicking minimize button to expand MUST clear is-shaded
  dock.setPanelShaded('panel-shade-test', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  panelController.setMinimized(false);
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Panel.setMinimized(false) must clear is-shaded');
  assert.strictEqual(body.classList.contains('hidden'), false);
  assert.strictEqual(record.shadeBtn.innerHTML, '─');

  // 6. Deadlock Resolution with Expand All:
  // When shaded, clicking Expand All MUST clear is-shaded and reveal content
  dock.setPanelShaded('panel-shade-test', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  expBtn.click();
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Expand All click must clear is-shaded');
  assert.strictEqual(body.classList.contains('hidden'), false);
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(record.shadeBtn.innerHTML, '─');

  // 7. Auto-Unshade on Float:
  // If a docked panel was shaded, popping it out MUST automatically unshade it
  dock.setPanelShaded('panel-shade-test', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  dock.floatPanel('panel-shade-test');
  assert.strictEqual(record.isFloating, true);
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Floating a panel must automatically unshade it');
  assert.strictEqual(body.classList.contains('hidden'), false);

  // 8. Auto-Unshade on Re-Dock:
  // If a floating window was shaded, re-docking it MUST automatically unshade it
  dock.setPanelShaded('panel-shade-test', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  dock.dockPanel('panel-shade-test');
  assert.strictEqual(record.isFloating, false);
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Re-docking a panel must automatically unshade it');
  assert.strictEqual(body.classList.contains('hidden'), false);
});



