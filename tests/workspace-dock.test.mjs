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
    this.className = className;
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
      add: (...tokens) => tokens.forEach((t) => this.classList._set.add(t)),
      remove: (...tokens) => tokens.forEach((t) => this.classList._set.delete(t)),
      toggle: (token, force) => {
        if (force === undefined) {
          if (this.classList._set.has(token)) this.classList._set.delete(token);
          else this.classList._set.add(token);
        } else if (force) {
          this.classList._set.add(token);
        } else {
          this.classList._set.delete(token);
        }
      },
      contains: (token) => this.classList._set.has(token),
    };
    this.listeners = new Map();
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

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600 };
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
const mockWin = {
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
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
