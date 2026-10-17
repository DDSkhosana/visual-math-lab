import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WorkspaceDockManager, initWorkspaceDock } from '../js/circle-core.js';

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
    this.ownerDocument = globalThis.document || null;
    this.attributes = new Map();
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
          if (this._set.has(token)) this._set.delete(token);
          else this._set.add(token);
        } else if (force) {
          this._set.add(token);
        } else {
          this._set.delete(token);
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
    return this._textContent || '';
  }
  set textContent(val) {
    this._textContent = String(val);
  }

  get innerHTML() {
    return this._innerHTML || '';
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
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

  appendChild(child) {
    if (child.parentElement && child.parentElement !== this) {
      const idx = child.parentElement.children.indexOf(child);
      if (idx !== -1) child.parentElement.children.splice(idx, 1);
    }
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    if (child.parentElement && child.parentElement !== this) {
      const idx = child.parentElement.children.indexOf(child);
      if (idx !== -1) child.parentElement.children.splice(idx, 1);
    }
    child.parentElement = this;
    this.children.unshift(child);
    return child;
  }

  insertBefore(newNode, refNode) {
    if (newNode.parentElement && newNode.parentElement !== this) {
      const idx = newNode.parentElement.children.indexOf(newNode);
      if (idx !== -1) newNode.parentElement.children.splice(idx, 1);
    }
    newNode.parentElement = this;
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
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }

  setPointerCapture(id) {
    this._capturedPointerId = id;
  }

  releasePointerCapture(id) {
    if (this._capturedPointerId === id) this._capturedPointerId = null;
  }

  hasPointerCapture(id) {
    return this._capturedPointerId === id;
  }

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

  get offsetWidth() {
    return parseFloat(this.style.width) || 300;
  }
  get offsetHeight() {
    return parseFloat(this.style.height) || 200;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockDOMElement('body');
    this.body.ownerDocument = this;
    this.defaultView = null;
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
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }
}

function matches(node, selector) {
  if (!node || !selector) return false;
  if (selector.includes(',')) {
    return selector.split(',').some((s) => matches(node, s.trim()));
  }
  if (selector.startsWith('.')) {
    const classes = selector.split('.').filter(Boolean);
    return classes.every((cls) => node.classList && node.classList.contains(cls));
  }
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector.startsWith('[')) {
    const match = selector.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]+)")?\]/);
    if (match) {
      const [, attr, val] = match;
      if (val !== undefined) return node.getAttribute(attr) === val;
      return node.attributes.has(attr);
    }
  }
  return node.tagName ? node.tagName.toLowerCase() === selector.toLowerCase() : false;
}

// Global mock DOM environment for Node.js test runner
const mockDoc = new MockDocument();
const winListeners = new Map();
const mockWin = {
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: (event, handler) => {
    if (!winListeners.has(event)) winListeners.set(event, []);
    winListeners.get(event).push(handler);
  },
  removeEventListener: (event, handler) => {
    if (!winListeners.has(event)) return;
    winListeners.set(event, winListeners.get(event).filter((h) => h !== handler));
  },
  dispatchEvent: (event) => {
    const handlers = winListeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  },
};
mockDoc.defaultView = mockWin;
globalThis.document = mockDoc;
globalThis.window = mockWin;
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

test('Workspace Windowing System: Core Exports & Class API Contract', () => {
  assert.ok(typeof WorkspaceDockManager === 'function', 'WorkspaceDockManager must be exported as a class');
  assert.ok(typeof initWorkspaceDock === 'function', 'initWorkspaceDock helper must be exported as a function');
});

test('Workspace Windowing System: CSS Architecture & Zero-Overflow Guarantees', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  assert.ok(fs.existsSync(cssPath), 'css/workspace-dock.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify visual.css imports workspace-dock.css
  const visualCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  assert.ok(visualCss.includes('workspace-dock.css'), 'css/visual.css must import workspace-dock.css');

  // Verify zero-overflow rules
  assert.ok(css.includes('overscroll-behavior: contain'), 'CSS must enforce overscroll-behavior: contain on dock body');
  assert.ok(css.includes('scrollbar-gutter: stable'), 'CSS must enforce scrollbar-gutter: stable to prevent layout shifts');
  assert.ok(css.includes('min-width: 0'), 'CSS must specify min-width: 0 on flex panels to eliminate horizontal overflow');
  assert.ok(css.includes('word-break: break-word'), 'CSS must ensure mathematical strings break gracefully');

  // Verify 8-directional omni-resize cursors
  assert.ok(css.includes('cursor: ns-resize'), 'CSS must define ns-resize for North/South handles');
  assert.ok(css.includes('cursor: ew-resize'), 'CSS must define ew-resize for East/West handles');
  assert.ok(css.includes('cursor: nwse-resize'), 'CSS must define nwse-resize for NW/SE diagonal handles');
  assert.ok(css.includes('cursor: nesw-resize'), 'CSS must define nesw-resize for NE/SW diagonal handles');

  // Verify mobile responsive rule collapses dock to single column
  assert.ok(css.includes('@media (max-width: 48rem)'), 'CSS must specify responsive breakpoint for compact viewports');
  assert.ok(css.includes('.omni-handle'), 'CSS must manage omni-resize handle visibility');
});

test('WorkspaceDockManager: Edge Snapping and Layout Switching', () => {
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const dock = new WorkspaceDockManager(root);

  // Default edge is left
  assert.strictEqual(dock.dockEdge, 'left');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'left');

  // Switch to right
  dock.setDockEdge('right');
  assert.strictEqual(dock.dockEdge, 'right');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'right');

  // Switch to top
  dock.setDockEdge('top');
  assert.strictEqual(dock.dockEdge, 'top');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'top');

  // Switch to bottom
  dock.setDockEdge('bottom');
  assert.strictEqual(dock.dockEdge, 'bottom');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'bottom');

  // Rejects invalid edge
  dock.setDockEdge('diagonal');
  assert.strictEqual(dock.dockEdge, 'bottom');
});

test('WorkspaceDockManager: Dock Collapse & Expansion Toggle', () => {
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const dock = new WorkspaceDockManager(root);

  assert.strictEqual(dock.isCollapsed, false);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), false);

  // Collapse dock
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.isCollapsed, true);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), true);

  // Expand dock
  dock.setDockCollapsed(false);
  assert.strictEqual(dock.isCollapsed, false);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), false);
});

test('WorkspaceDockManager: Panel Registration, Floating, and Re-docking Pipeline', () => {
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  // Create sample UI panel
  const panel = new MockDOMElement('div', 'ui-panel', 'controls-panel');
  const header = new MockDOMElement('div', 'panel-header', 'controls-header');
  const title = new MockDOMElement('h1', 'color-sky');
  title.textContent = 'Interactive Controls';
  const actions = new MockDOMElement('div', 'panel-header-actions');
  header.appendChild(title);
  header.appendChild(actions);
  panel.appendChild(header);

  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(body);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);

  // Registered and enhanced with dock and window buttons
  const record = dock.panels.get('controls-panel');
  assert.ok(record, 'Panel controls-panel must be registered');
  assert.strictEqual(record.isFloating, false, 'Panel starts docked by default');
  assert.ok(record.dockToggleBtn, 'Panel must have dockToggleBtn');
  assert.ok(record.closeBtn, 'Panel must have closeBtn');

  // 8 Omni-resize handles attached
  assert.strictEqual(record.handles.length, 8, 'Panel must have 8 omni-resize boundary handles');
  const handleDirs = record.handles.map((h) => h.getAttribute('data-handle'));
  assert.deepStrictEqual(handleDirs, ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']);

  // Pop out to float
  dock.floatPanel('controls-panel');
  assert.strictEqual(record.isFloating, true);
  assert.strictEqual(panel.classList.contains('is-floating'), true);
  assert.strictEqual(panel.parentElement, dock.floatingLayer, 'Floated panel must move to floatingLayer');
  assert.strictEqual(record.dockToggleBtn.innerHTML, '🗁', 'Dock toggle icon changes to dock-back');

  // Dock back
  dock.dockPanel('controls-panel');
  assert.strictEqual(record.isFloating, false);
  assert.strictEqual(panel.classList.contains('is-floating'), false);
  assert.strictEqual(panel.parentElement, dock.dockBody, 'Docked panel must move into dockBody');
  assert.strictEqual(record.dockToggleBtn.innerHTML, '⧉', 'Dock toggle icon changes to float');
});

test('WorkspaceDockManager: Panels Visibility Tray and Restore Mechanism', () => {
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const panel = new MockDOMElement('div', 'ui-panel', 'derivations-panel');
  const header = new MockDOMElement('div', 'panel-header');
  header.textContent = 'Live Math Derivations';
  panel.appendChild(header);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);

  // Hide panel via setPanelVisible
  dock.setPanelVisible('derivations-panel', false);
  const record = dock.panels.get('derivations-panel');
  assert.strictEqual(record.isHidden, true);
  assert.strictEqual(panel.hidden, true);
  assert.strictEqual(panel.style.display, 'none');

  // Restore panel
  dock.setPanelVisible('derivations-panel', true);
  assert.strictEqual(record.isHidden, false);
  assert.strictEqual(panel.hidden, false);
  assert.strictEqual(panel.style.display, '');
});

test('WorkspaceDockManager: Strict Zero Canvas Displacement Invariant', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify view-container overlay rules: pinned to 100% width and 100% height with zero reflow
  assert.ok(css.includes('position: absolute !important'), 'Canvas container must have position: absolute !important');
  assert.ok(css.includes('inset: 0 !important'), 'Canvas container must enforce inset: 0 !important');
  assert.ok(css.includes('width: 100% !important'), 'Canvas container must maintain 100% width !important');
  assert.ok(css.includes('height: 100% !important'), 'Canvas container must maintain 100% height !important');
  assert.ok(css.includes('flex: none !important'), 'Canvas container must enforce flex: none to prevent sibling displacement');

  // Verify dock is an absolute overlay rather than an in-flow flex sibling
  assert.ok(css.includes('.workspace-dock {\n  --dock-size: 380px;\n  position: absolute !important;'),
    'Workspace dock must be an absolute overlay to guarantee zero canvas displacement');

  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const dock = new WorkspaceDockManager(root);

  // View container remains untouched and unconstrained across dock mutations
  ['left', 'right', 'top', 'bottom'].forEach((edge) => {
    dock.setDockEdge(edge);
    assert.strictEqual(viewContainer.style.width, '', 'viewContainer inline width must never be altered by dock edge');
    assert.strictEqual(viewContainer.style.height, '', 'viewContainer inline height must never be altered by dock edge');
  });

  dock.setDockCollapsed(true);
  assert.strictEqual(viewContainer.style.width, '', 'viewContainer inline width must never be altered by dock collapse');
  dock.setDockCollapsed(false);
  assert.strictEqual(viewContainer.style.width, '', 'viewContainer inline width must never be altered by dock expand');
});

test('WorkspaceDockManager: Freely Draggable Collapsed Capsule Pill with Pointer Capture', () => {
  globalThis.localStorage?.clear?.();
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const dock = new WorkspaceDockManager(root);

  // Collapse into floating capsule pill
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.isCollapsed, true);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), true);

  // Initial parked position is assigned
  assert.ok(dock.dockElement.style.left.endsWith('px'), 'Collapsed dock must have initial left px style');
  assert.ok(dock.dockElement.style.top.endsWith('px'), 'Collapsed dock must have initial top px style');

  const header = dock.dockElement.querySelector('.workspace-dock-header');
  assert.ok(header, 'Dock must have header');

  // Simulate pointer drag interaction on collapsed dock header
  header.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 16, clientY: 16, target: header, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 150, clientY: 90 });

  assert.strictEqual(dock.dockElement.classList.contains('is-dragging'), true, 'Dock must have is-dragging class during drag');
  assert.strictEqual(dock.dockElement.style.left, '150px', 'Dock left style must update with drag');
  assert.strictEqual(dock.dockElement.style.top, '90px', 'Dock top style must update with drag');
  assert.deepStrictEqual(dock.collapsedPos, { x: 150, y: 90 }, 'Dock manager must track collapsedPos coordinates');

  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockElement.classList.contains('is-dragging'), false, 'Dock must remove is-dragging class after drag');

  // Expanding the dock clears inline positioning to restore edge-docked pinned layout
  dock.setDockCollapsed(false);
  assert.strictEqual(dock.isCollapsed, false);
  assert.strictEqual(dock.dockElement.style.left, '', 'Inline left must be cleared on expand');
  assert.strictEqual(dock.dockElement.style.top, '', 'Inline top must be cleared on expand');
  assert.strictEqual(dock.dockElement.style.right, '', 'Inline right must be cleared on expand');
  assert.strictEqual(dock.dockElement.style.bottom, '', 'Inline bottom must be cleared on expand');
  assert.strictEqual(dock.dockElement.style.width, '', 'Inline width must be cleared on expand');
  assert.strictEqual(dock.dockElement.style.height, '', 'Inline height must be cleared on expand');

  // Re-collapsing remembers the dragged position
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.dockElement.style.left, '150px', 'Re-collapsing dock must restore saved position');
  assert.strictEqual(dock.dockElement.style.top, '90px', 'Re-collapsing dock must restore saved position');
});

test('WorkspaceDockManager: Edge-Adaptive Docking Orientations & Detached Floating Panels', () => {
  globalThis.localStorage?.clear?.();
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify horizontal body rules for top/bottom margins
  assert.ok(css.includes('[data-dock-edge="top"] .workspace-dock-body'), 'CSS must define horizontal shelf for top margin');
  assert.ok(css.includes('[data-dock-edge="bottom"] .workspace-dock-body'), 'CSS must define horizontal shelf for bottom margin');
  assert.ok(css.includes('flex-direction: row !important'), 'Top/bottom dock body must use flex-direction: row !important');
  assert.ok(css.includes('overflow-x: auto !important'), 'Top/bottom dock body must use overflow-x: auto !important');
  assert.ok(css.includes('align-items: flex-start !important'), 'Top/bottom dock body must align items to start to prevent stretching dead space');
  assert.ok(css.includes('height: auto !important'), 'Docked panels must maintain height: auto to eliminate vertical dead space');
  assert.ok(css.includes('overflow-y: auto !important'), 'Docked panel body must be scrollable when content exceeds bounds');
  assert.ok(css.includes('.workspace-dock-body > .ui-panel .panel-body.hidden {\n  display: none !important;'), 'Collapsed panel body must enforce display: none !important');

  // Verify collapsed capsule pill CSS
  assert.ok(css.includes('border-radius: 9999px !important'), 'Collapsed dock must style as rounded capsule pill');
  assert.ok(css.includes('cursor: grab'), 'Collapsed dock must display grab cursor');

  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const panel = new MockDOMElement('div', 'ui-panel', 'stats-panel');
  const panelHeader = new MockDOMElement('div', 'panel-header');
  panel.appendChild(panelHeader);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);

  // Switch to top edge
  dock.setDockEdge('top');
  assert.strictEqual(dock.dockEdge, 'top');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'top');

  // Switch to bottom edge
  dock.setDockEdge('bottom');
  assert.strictEqual(dock.dockEdge, 'bottom');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'bottom');

  // Float panel
  dock.floatPanel('stats-panel');
  const record = dock.panels.get('stats-panel');
  assert.strictEqual(record.isFloating, true);
  assert.strictEqual(panel.parentElement, dock.floatingLayer);
  assert.ok(panel.style.left.endsWith('px'), 'Floating panel must have left position');
  assert.ok(panel.style.top.endsWith('px'), 'Floating panel must have top position');

  // Simulate dragging floating panel header
  panelHeader.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 30, clientY: 60, target: panelHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 80, clientY: 120 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 2 });

  assert.strictEqual(panel.style.left, '80px', 'Floating panel left must update from drag');
  assert.strictEqual(panel.style.top, '120px', 'Floating panel top must update from drag');
});

test('WorkspaceDockManager: Nested Sub Components Collapsed By Default in Dock Panel', () => {
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  // Create a panel with nested collapsible sections, cards, and expand button
  const panel = new MockDOMElement('div', 'ui-panel', 'test-controls');
  panel.ownerDocument = mockDoc;

  const header = new MockDOMElement('div', 'panel-header');
  header.textContent = 'Controls';
  panel.appendChild(header);

  const expandBtn = new MockDOMElement('button', 'panel-expand-btn', 'toggle-test-expand');
  const expandLabel = new MockDOMElement('span', 'panel-expand-label');
  expandLabel.textContent = 'Collapse All';
  const expandIcon = new MockDOMElement('span', 'panel-expand-icon');
  expandBtn.appendChild(expandIcon);
  expandBtn.appendChild(expandLabel);
  header.appendChild(expandBtn);

  const panelBody = new MockDOMElement('div', 'panel-body hidden');
  panel.appendChild(panelBody);

  // Sub-component 1: Collapsible section
  const sec = new MockDOMElement('div', 'collapsible-section');
  const secHeader = new MockDOMElement('div', 'collapsible-header');
  const secIcon = new MockDOMElement('span', 'icon');
  secIcon.textContent = '▼';
  secHeader.appendChild(secIcon);
  sec.appendChild(secHeader);
  const secContent = new MockDOMElement('div', 'collapsible-content open');
  sec.appendChild(secContent);
  panelBody.appendChild(sec);

  // Sub-component 2: Derivation card
  const card = new MockDOMElement('div', 'derivation-card');
  const cardHeader = new MockDOMElement('div', 'derivation-card-header open');
  const cardIcon = new MockDOMElement('span', 'icon');
  cardIcon.textContent = '▼';
  cardHeader.appendChild(cardIcon);
  card.appendChild(cardHeader);
  const cardContent = new MockDOMElement('div', 'derivation-card-content open');
  card.appendChild(cardContent);
  panelBody.appendChild(card);

  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Verify collapseSubComponents was executed on panel in the dock
  assert.ok(sec.classList.contains('collapsed'), 'Section in docked panel must have .collapsed class');
  assert.strictEqual(secHeader.getAttribute('aria-expanded'), 'false', 'Section header must have aria-expanded="false"');
  assert.strictEqual(secIcon.textContent, '▶', 'Section icon must be ▶');
  assert.ok(!secContent.classList.contains('open'), 'Section content must not have .open class');
  assert.ok(secContent.classList.contains('collapsed'), 'Section content must have .collapsed class');

  assert.ok(!cardHeader.classList.contains('open'), 'Card header must not have .open class');
  assert.strictEqual(cardHeader.getAttribute('aria-expanded'), 'false', 'Card header must have aria-expanded="false"');
  assert.strictEqual(cardIcon.textContent, '▶', 'Card icon must be ▶');
  assert.ok(!cardContent.classList.contains('open'), 'Card content must not have .open class');

  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'false', 'Expand button must have aria-expanded="false"');
  assert.strictEqual(expandLabel.textContent, 'Expand All', 'Expand button label must be Expand All');

  // Verify CSS rule in workspace-dock.css
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.workspace-dock-body .collapsible-section.collapsed .collapsible-content'), 'CSS must define rule for collapsed section in dock');
  assert.ok(css.includes('.workspace-dock-body .derivation-card-content:not(.open)'), 'CSS must define rule for unopened derivation card in dock');

  // Verify all 8 visual HTML files have collapsed sections and right arrows by default
  const visualSlugs = [
    'thales-theorem',
    'angle-at-centre',
    'angles-in-same-segment',
    'cyclic-quadrilateral',
    'tangent-radius',
    'alternate-segment',
    'tangents-from-external-point',
    'perpendicular-chord-bisector',
  ];

  for (const slug of visualSlugs) {
    const htmlPath = path.join(rootDir, 'visuals', slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('class="collapsible-section collapsed"'), `${slug}/index.html must have collapsible sections collapsed by default`);
    assert.ok(!html.includes('<div class="collapsible-section">'), `${slug}/index.html must not contain uncollapsed <div class="collapsible-section">`);
  }
});

