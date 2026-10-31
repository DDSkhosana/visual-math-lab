import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WorkspaceDockManager,
  initWorkspaceDock,
  syncPanelElevationTurn,
  cyclePanelSubpanel,
  activateTabSubpanel,
  setSubpanelOpen,
  initCollapsibleSections,
  setExpandButtonUI,
  Panel,
} from '../js/circle-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Lightweight mock element simulating DOM tree and events in headless Node.js.
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
      setProperty: (prop, val) => {
        this.style._props.set(prop, val);
        this.style[prop] = val;
      },
      getPropertyValue: (prop) => this.style._props.get(prop) || this.style[prop] || '',
      removeProperty: (prop) => {
        this.style._props.delete(prop);
        this.style[prop] = '';
      },
      position: '',
      left: '',
      top: '',
      right: '',
      bottom: '',
      width: '',
      height: '',
      zIndex: '',
      display: '',
      overflowY: '',
      overflowX: '',
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
    this.classList._set = new Set((val || '').split(' ').filter(Boolean));
  }

  get textContent() {
    if (this._textContent !== undefined) return this._textContent;
    return this.children.map((c) => (typeof c === 'string' ? c : c.textContent || '')).join('');
  }
  set textContent(val) {
    this._textContent = val;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || '';
  }
  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }
  getAttribute(k) {
    return this.attributes.get(k) ?? null;
  }
  removeAttribute(k) {
    this.attributes.delete(k);
  }
  hasAttribute(k) {
    return this.attributes.has(k);
  }

  appendChild(child) {
    if (typeof child === 'string') {
      this._textContent = (this._textContent || '') + child;
      return child;
    }
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.unshift(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    newChild.parentElement = this;
    newChild.ownerDocument = this.ownerDocument;
    const idx = this.children.indexOf(refChild);
    if (idx === -1) {
      this.children.push(newChild);
    } else {
      this.children.splice(idx, 0, newChild);
    }
    return newChild;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  replaceChildren(...newChildren) {
    this.children.forEach((c) => {
      if (typeof c === 'object' && c) c.parentElement = null;
    });
    this.children = [];
    newChildren.forEach((c) => this.appendChild(c));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    if (typeof selector !== 'string') return results;
    const selectors = selector.split(',').map((s) => s.trim());
    const match = (el) => {
      return selectors.some((sel) => {
        if (sel.startsWith('#')) return el.id === sel.substring(1);
        if (sel.startsWith('.')) {
          const classes = sel.split('.').filter(Boolean);
          return classes.every((c) => el.classList.contains(c));
        }
        if (sel.startsWith('[')) {
          const m = sel.match(/\[([a-zA-Z0-9_-]+)(?:=["']?([^"']+)["']?)?\]/);
          if (m) {
            const attr = m[1];
            const val = m[2];
            return val ? el.getAttribute(attr) === val : el.hasAttribute(attr);
          }
        }
        return sel.toLowerCase() === el.tagName.toLowerCase();
      });
    };

    const traverse = (node) => {
      if (!node || !node.children) return;
      for (const child of node.children) {
        if (typeof child !== 'object' || !child) continue;
        if (match(child)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  closest(selector) {
    let cur = this;
    const match = (el) => {
      const trimmed = selector.trim();
      const parts = trimmed.split(',').map((s) => s.trim());
      return parts.some((p) => {
        if (p.startsWith('.')) return el.classList.contains(p.substring(1));
        if (p.startsWith('#')) return el.id === p.substring(1);
        return el.tagName.toLowerCase() === p.toLowerCase();
      });
    };
    while (cur) {
      if (match(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  contains(other) {
    let cur = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  getBoundingClientRect() {
    return {
      left: parseFloat(this.style.left) || 0,
      top: parseFloat(this.style.top) || 0,
      width: this.offsetWidth,
      height: this.offsetHeight,
      right: (parseFloat(this.style.left) || 0) + this.offsetWidth,
      bottom: (parseFloat(this.style.top) || 0) + this.offsetHeight,
    };
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event).filter((f) => f !== fn);
    this.listeners.set(event, list);
  }
  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    list.forEach((fn) => fn.call(this, event));
    return !event.defaultPrevented;
  }
  focus() {
    this._isFocused = true;
  }
}

class MockDocument extends MockDOMElement {
  constructor() {
    super('#document');
    this.body = new MockDOMElement('body');
    this.body.ownerDocument = this;
    this.appendChild(this.body);
  }
  createElement(tag) {
    const el = new MockDOMElement(tag);
    el.ownerDocument = this;
    return el;
  }
  getElementById(id) {
    return this.querySelector(`#${id}`);
  }
}

// ============================================================================
// END-TO-END TEST SUITE: DOCK PANEL NESTED SUBPANEL FUNCTIONALITY & ELEVATION
// ============================================================================

test('E2E Subpanel Contract 1: Nested subpanels fully expand their contents across all panels', () => {
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  // Build a test panel with 3 nested subpanels (2 collapsible sections + 1 derivation card)
  const panel = new MockDOMElement('div', 'ui-panel', 'test-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(header);
  panel.appendChild(body);

  // Subpanel 1: Parameters section
  const sec1 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-params');
  const h1 = new MockDOMElement('div', 'collapsible-header');
  const icon1 = new MockDOMElement('span', 'icon');
  icon1.textContent = '▶';
  h1.appendChild(icon1);
  const title1 = new MockDOMElement('span');
  title1.textContent = 'Parameters';
  h1.appendChild(title1);
  const c1 = new MockDOMElement('div', 'collapsible-content collapsed');
  const slider = new MockDOMElement('input', 'slider-radius');
  c1.appendChild(slider);
  sec1.appendChild(h1);
  sec1.appendChild(c1);
  body.appendChild(sec1);

  // Subpanel 2: Units section
  const sec2 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-units');
  const h2 = new MockDOMElement('div', 'collapsible-header');
  const icon2 = new MockDOMElement('span', 'icon');
  icon2.textContent = '▶';
  h2.appendChild(icon2);
  const title2 = new MockDOMElement('span');
  title2.textContent = 'Units';
  h2.appendChild(title2);
  const c2 = new MockDOMElement('div', 'collapsible-content collapsed');
  const select = new MockDOMElement('select', 'unit-select');
  c2.appendChild(select);
  sec2.appendChild(h2);
  sec2.appendChild(c2);
  body.appendChild(sec2);

  // Subpanel 3: Derivations container with derivation card
  const derivContainer = new MockDOMElement('div', '', 'live-derivations-content');
  const card1 = new MockDOMElement('div', 'derivation-card', 'step-1-card');
  const cardH = new MockDOMElement('div', 'derivation-card-header');
  const cardIcon = new MockDOMElement('span', 'icon');
  cardIcon.textContent = '▶';
  cardH.appendChild(cardIcon);
  const cardTitle = new MockDOMElement('span');
  cardTitle.textContent = 'Step 1: Proof';
  cardH.appendChild(cardTitle);
  const cardC = new MockDOMElement('div', 'derivation-card-content');
  const mathRow = new MockDOMElement('div', 'derivation-math-row');
  mathRow.textContent = '2θ = 2α + 2β';
  cardC.appendChild(mathRow);
  card1.appendChild(cardH);
  card1.appendChild(cardC);
  derivContainer.appendChild(card1);
  body.appendChild(derivContainer);

  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  assert.ok(dock, 'WorkspaceDockManager successfully mounted');

  // Verify initial collapsed state: content hidden
  assert.strictEqual(sec1.classList.contains('collapsed'), true);
  assert.strictEqual(c1.classList.contains('open'), false);
  assert.strictEqual(sec2.classList.contains('collapsed'), true);
  assert.strictEqual(card1.classList.contains('open'), false);

  // Expand Subpanel 1 using setSubpanelOpen
  setSubpanelOpen(sec1, true);
  assert.strictEqual(sec1.classList.contains('collapsed'), false, 'sec1 must not be collapsed');
  assert.strictEqual(c1.classList.contains('open'), true, 'c1 must have open class for full expansion');
  assert.strictEqual(c1.classList.contains('collapsed'), false, 'c1 collapsed class must be removed');
  assert.strictEqual(h1.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(h1.querySelector('.icon')?.textContent, '▼');

  // Expand Derivation Card using setSubpanelOpen
  setSubpanelOpen(card1, true);
  assert.strictEqual(card1.classList.contains('open'), true, 'card1 must have open class for full expansion');
  assert.strictEqual(cardC.classList.contains('open'), true, 'cardC must have open class');
  assert.strictEqual(cardH.getAttribute('aria-expanded'), 'true');

  // Collapse subpanel 1
  setSubpanelOpen(sec1, false);
  assert.strictEqual(sec1.classList.contains('collapsed'), true, 'sec1 must be collapsed');
  assert.strictEqual(c1.classList.contains('open'), false);
  assert.strictEqual(c1.classList.contains('collapsed'), true);
  assert.strictEqual(h1.getAttribute('aria-expanded'), 'false');
});

test('E2E Subpanel Contract 2: CSS Scroll Overflow and Height Budgeting Invariants', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Level 2 Elevation declaration
  assert.ok(css.includes('.workspace-dock-body > .ui-panel [data-elevation-level="2"]'), 'CSS must define [data-elevation-level="2"] styling');
  assert.ok(css.includes('.ui-panel.is-floating [data-elevation-level="2"]'), 'CSS must support [data-elevation-level="2"] on floating panels');

  // 2. Ensure each nested subpanel fully expands its contents with scroll overflow
  assert.ok(css.includes('.workspace-dock-body .collapsible-section:not(.collapsed) > .collapsible-content'), 'CSS must define open collapsible-content in dock');
  assert.ok(css.includes('.workspace-dock-body .derivation-card.open > .derivation-card-content'), 'CSS must define open derivation-card-content in dock');
  assert.ok(css.includes('overflow-y: auto !important'), 'CSS must enforce overflow-y: auto !important on open subpanels');
  assert.ok(css.includes('overflow-x: hidden !important'), 'CSS must enforce overflow-x: hidden !important to prevent horizontal spillage');
  assert.ok(css.includes('overscroll-behavior-y: contain !important'), 'CSS must enforce overscroll-behavior-y: contain !important');
  assert.ok(css.includes('scrollbar-gutter: stable !important'), 'CSS must enforce scrollbar-gutter: stable !important');
  assert.ok(css.includes('touch-action: pan-y !important'), 'CSS must enforce touch-action: pan-y !important');
  assert.ok(css.includes('-webkit-overflow-scrolling: touch !important'), 'CSS must enforce momentum scrolling on touch displays');

  // 3. Live derivations content flex wrapper
  assert.ok(css.includes('.workspace-dock-body #live-derivations-content'), 'CSS must declare #live-derivations-content container rules');
  assert.ok(css.includes('display: flex !important'), 'CSS must enforce display: flex !important on derivation content container');
  assert.ok(css.includes('flex-direction: column !important'), 'CSS must enforce flex-direction: column !important');
  assert.ok(css.includes('flex: 1 1 auto !important'), 'CSS must enforce flex: 1 1 auto !important for full height expansion');
  assert.ok(css.includes('min-height: 0 !important'), 'CSS must declare min-height: 0 !important to allow internal scroll overflow');

  // 4. Stack & Accordion mode overflow rules
  assert.ok(css.includes('[data-deck-mode="stack"]'), 'CSS must define styles for stack mode');
  assert.ok(css.includes('[data-deck-mode="accordion"]'), 'CSS must define styles for accordion mode');
  assert.ok(css.includes('max-height: calc(var(--dock-size, 380px) - 5rem) !important'), 'CSS must adapt max-height to dock size in stack/accordion mode');
});

test('E2E Subpanel Contract 3: Elevation Level Turn-Taking Deck, Pills, and Turn Cycling', () => {
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'turn-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(header);
  panel.appendChild(body);

  const s1 = new MockDOMElement('div', 'collapsible-section collapsed', 's1');
  const h1 = new MockDOMElement('div', 'collapsible-header');
  h1.textContent = '▶ Step Alpha';
  const c1 = new MockDOMElement('div', 'collapsible-content collapsed');
  c1.scrollHeight = 500;
  c1.clientHeight = 200;
  s1.appendChild(h1);
  s1.appendChild(c1);
  body.appendChild(s1);

  const s2 = new MockDOMElement('div', 'collapsible-section collapsed', 's2');
  const h2 = new MockDOMElement('div', 'collapsible-header');
  h2.textContent = '▶ Step Beta';
  const c2 = new MockDOMElement('div', 'collapsible-content collapsed');
  c2.scrollHeight = 600;
  c2.clientHeight = 200;
  s2.appendChild(h2);
  s2.appendChild(c2);
  body.appendChild(s2);

  const s3 = new MockDOMElement('div', 'collapsible-section collapsed', 's3');
  const h3 = new MockDOMElement('div', 'collapsible-header');
  h3.textContent = '▶ Step Gamma';
  const c3 = new MockDOMElement('div', 'collapsible-content collapsed');
  c3.scrollHeight = 450;
  c3.clientHeight = 200;
  s3.appendChild(h3);
  s3.appendChild(c3);
  body.appendChild(s3);

  root.appendChild(panel);
  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // 1. Initial State: Level 1 base panel
  assert.strictEqual(panel.getAttribute('data-elevation-level'), '1');

  // 2. Open s1 (Single open subpanel): gets Level 2 elevation
  setSubpanelOpen(s1, true);
  dock.syncSubpanelOverlayState();

  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(s1.getAttribute('data-elevation-level'), '2');
  assert.strictEqual(s1.classList.contains('is-subpanel-overlay'), true);

  // 3. Multi-Expansion: open s2 and s3
  setSubpanelOpen(s2, true);
  setSubpanelOpen(s3, true);
  dock.syncSubpanelOverlayState();

  // Deck bar is generated with 3 pills
  const deck = body.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Elevation deck bar must be present in body');
  assert.strictEqual(deck.style.display, 'flex');

  const pills = deck.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 3, 'Deck must render 3 pills for 3 open subpanels');

  // Initial turn: s1 is top elevated
  assert.strictEqual(s1.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s1.classList.contains('is-elevated-top'), true);
  assert.strictEqual(s2.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(s2.classList.contains('is-in-deck'), true);
  assert.strictEqual(s3.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(s3.classList.contains('is-in-deck'), true);
  assert.strictEqual(pills[0].classList.contains('active'), true);

  // 4. Switch turn via Pill Click (Click Pill 2 -> Step Beta)
  pills[1].dispatchEvent({ type: 'click', stopPropagation: () => {} });

  assert.strictEqual(s2.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s2.classList.contains('is-elevated-top'), true);
  assert.strictEqual(s1.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(s1.classList.contains('is-in-deck'), true);
  assert.strictEqual(s3.classList.contains('is-in-deck'), true);

  const updatedPills = deck.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(updatedPills[1].classList.contains('active'), true);
  assert.strictEqual(updatedPills[1].getAttribute('aria-selected'), 'true');
  assert.strictEqual(updatedPills[0].classList.contains('active'), false);

  // 5. Advance Turn via Next Button (▶)
  const nextBtn = deck.querySelector('.elevation-deck-nav-btn.next');
  assert.ok(nextBtn, 'Next nav button must exist on deck');
  nextBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });

  // Turn advances from s2 to s3
  assert.strictEqual(s3.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s3.classList.contains('is-elevated-top'), true);
  assert.strictEqual(s2.classList.contains('is-in-deck'), true);

  // 6. Recede Turn via Prev Button (◀)
  const prevBtn = deck.querySelector('.elevation-deck-nav-btn.prev');
  assert.ok(prevBtn, 'Prev nav button must exist on deck');
  prevBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });

  // Turn recedes back from s3 to s2
  assert.strictEqual(s2.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s2.classList.contains('is-elevated-top'), true);

  // 7. Roving Arrow Navigation on Pills (ArrowRight)
  const curPill = deck.querySelectorAll('.elevation-deck-pill')[1];
  curPill.dispatchEvent({ type: 'keydown', key: 'ArrowRight', preventDefault: () => {}, stopPropagation: () => {} });

  // Roved from s2 to s3
  assert.strictEqual(s3.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s3.classList.contains('is-elevated-top'), true);

  // 8. Card content wheel strictly scrolls text and does not hijack turn (restricted to deck bar)
  c3.scrollTop = 250; // at bottom (scrollTop + clientHeight >= scrollHeight)
  c3._lastTurnTime = 0;
  c3.dispatchEvent({
    type: 'wheel',
    deltaY: 50, // downward wheel scroll inside card content
    preventDefault: () => {},
    stopPropagation: () => {},
  });

  // Turn remains stably on s3 without hijacking!
  assert.strictEqual(s3.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(s3.classList.contains('is-elevated-top'), true);
  assert.strictEqual(s1.classList.contains('is-in-deck'), true);
});

test('E2E Subpanel Contract 4: Three-Way Mode Toggle (Deck ☵ ↔ Stack ↕ ↔ Accordion ▾)', () => {
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'mode-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(header);
  panel.appendChild(body);

  const secA = new MockDOMElement('div', 'collapsible-section collapsed', 'secA');
  const secB = new MockDOMElement('div', 'collapsible-section collapsed', 'secB');
  body.appendChild(secA);
  body.appendChild(secB);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  setSubpanelOpen(secA, true);
  setSubpanelOpen(secB, true);
  dock.syncSubpanelOverlayState();

  const deck = body.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Deck must be present');

  const modeBtn = deck.querySelector('.elevation-deck-mode-toggle');
  assert.ok(modeBtn, 'Mode toggle button must be present in deck');

  // 1. Initial Mode: Deck
  assert.ok(modeBtn.classList.contains('is-deck') || modeBtn.classList.contains('is-tabs'));

  // 2. Switch to Stack Mode
  modeBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
  assert.strictEqual(body.getAttribute('data-deck-mode'), 'stack');
  // In Stack mode, no subpanel is forced into 'is-in-deck'
  assert.strictEqual(secA.classList.contains('is-in-deck'), false);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);
  assert.strictEqual(secA.getAttribute('data-elevation-level'), '2');
  assert.strictEqual(secB.getAttribute('data-elevation-level'), '2');

  // 3. Switch to Accordion Mode
  const deckStack = body.querySelector('.panel-elevation-deck');
  const modeBtnStack = deckStack.querySelector('.elevation-deck-mode-toggle');
  modeBtnStack.dispatchEvent({ type: 'click', stopPropagation: () => {} });
  assert.strictEqual(body.getAttribute('data-deck-mode'), 'accordion');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);

  // 4. Switch to Tabs Mode
  const deckAccordion = body.querySelector('.panel-elevation-deck');
  const modeBtnAccordion = deckAccordion.querySelector('.elevation-deck-mode-toggle');
  modeBtnAccordion.dispatchEvent({ type: 'click', stopPropagation: () => {} });
  assert.strictEqual(body.getAttribute('data-deck-mode'), 'tabs');

  // In Tabs mode, single-turn tab switching is enforced: top tab elevated, others parked
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true);
});

test('E2E Subpanel Contract 5: Subpanel cycling un-shades panel and expands target', () => {
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel is-shaded', 'shaded-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  const shadeBtn = new MockDOMElement('button', 'panel-shade-btn');
  header.appendChild(shadeBtn);
  const minBtn = new MockDOMElement('button', 'panel-minimize-btn');
  const minIcon = new MockDOMElement('span', 'panel-minimize-icon');
  minBtn.appendChild(minIcon);
  header.appendChild(minBtn);

  const body = new MockDOMElement('div', 'panel-body hidden');
  panel.appendChild(header);
  panel.appendChild(body);

  const sub1 = new MockDOMElement('div', 'collapsible-section collapsed', 'sub1');
  const sub2 = new MockDOMElement('div', 'collapsible-section collapsed', 'sub2');
  body.appendChild(sub1);
  body.appendChild(sub2);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Initially panel is shaded and body hidden
  assert.strictEqual(panel.classList.contains('is-shaded'), true);

  // Cycle subpanel forward
  cyclePanelSubpanel(panel, 'forward');

  // Verify panel was unshaded and body restored to visible
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Panel must be unshaded after cycling');
  assert.strictEqual(body.classList.contains('hidden'), false, 'Body must un-hide after cycling');
  assert.strictEqual(sub1.classList.contains('collapsed'), false, 'Target subpanel must be opened');
  assert.strictEqual(sub1.getAttribute('data-elevation-level'), '2', 'Target subpanel elevated to Level 2');

  // Cycle forward again to sub2 (now 2 subpanels open, activating deck turn)
  cyclePanelSubpanel(panel, 'forward');
  assert.strictEqual(sub2.classList.contains('collapsed'), false, 'Subpanel 2 opened on forward cycle');
  assert.strictEqual(sub2.getAttribute('data-elevation-turn'), 'top', 'Subpanel 2 elevated to top turn');
  assert.strictEqual(sub1.getAttribute('data-elevation-turn'), 'deck', 'Subpanel 1 parked in deck');
});

test('E2E Subpanel Contract 6: Universal DOM Integrity across all 12 Visualizers', () => {
  const visualizers = [
    // Circle Theorems
    'visuals/circle-theorems/thales-theorem/index.html',
    'visuals/circle-theorems/angle-at-centre/index.html',
    'visuals/circle-theorems/angles-in-same-segment/index.html',
    'visuals/circle-theorems/cyclic-quadrilateral/index.html',
    'visuals/circle-theorems/tangent-radius/index.html',
    'visuals/circle-theorems/alternate-segment/index.html',
    'visuals/circle-theorems/tangents-from-external-point/index.html',
    'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
    // Trigonometry Suite
    'visuals/trigonometry/angle-sum-identities/index.html',
    'visuals/trigonometry/law-of-cosines/index.html',
    'visuals/trigonometry/law-of-sines/index.html',
    'visuals/trigonometry/unit-circle-helix/index.html',
  ];

  visualizers.forEach((relPath) => {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const html = fs.readFileSync(fullPath, 'utf8');

    // 1. Must contain all 4 standard panels
    const panels = html.match(/class="[^"]*ui-panel[^"]*"/g) || [];
    assert.strictEqual(panels.length >= 4, true, `${relPath} must contain at least 4 ui-panel containers`);

    // 2. All collapsible sections must be collapsed by default with right arrows
    assert.ok(html.includes('class="collapsible-section collapsed"'), `${relPath} must have collapsed sections`);
    assert.ok(!html.includes('<div class="collapsible-section">'), `${relPath} must not contain uncollapsed sections`);

    // 3. Panel expand all affordance
    assert.ok(html.includes('panel-expand-btn') || html.includes('toggle-controls-expand'), `${relPath} must have expand-all affordance`);

    // 4. Panel minimize affordance
    assert.ok(html.includes('panel-minimize-btn'), `${relPath} must have minimize-button affordance`);

    // 5. Live derivations container
    assert.ok(html.includes('live-derivations-content') || html.includes('live-derivation-panel') || html.includes('derivations-panel'),
      `${relPath} must provide derivations panel with live content container`);
  });
});
