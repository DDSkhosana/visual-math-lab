import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WorkspaceDockManager, initWorkspaceDock, syncPanelElevationTurn } from '../js/circle-core.js';

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

  // Level 2: When dock is collapsed, checking a docked panel auto-expands the dock
  dock.setPanelVisible('derivations-panel', false);
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.isCollapsed, true);

  const trayLabels = dock.trayItemsContainer.querySelectorAll('.tray-item-label');
  const derivationsLabel = Array.from(trayLabels).find((l) => {
    const s = l.querySelector('span');
    return s && s.textContent.includes('Live Math Derivations');
  });
  assert.ok(derivationsLabel, 'Tray must list Live Math Derivations');
  const checkbox = derivationsLabel.querySelector('input');
  assert.ok(checkbox, 'Checkbox must exist in derivations label');
  assert.strictEqual(checkbox.checked, false);

  checkbox.checked = true;
  checkbox.dispatchEvent({ type: 'change' });

  assert.strictEqual(record.isHidden, false);
  assert.strictEqual(dock.isCollapsed, false, 'Checking docked panel while collapsed must auto-expand dock');
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), false);
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

  const initLeft = parseFloat(dock.dockElement.style.left) || 16;
  const initTop = parseFloat(dock.dockElement.style.top) || 16;

  // Simulate pointer drag interaction on collapsed dock header
  header.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: initLeft, clientY: initTop, target: header, preventDefault: () => {} });
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

test('WorkspaceDockManager: Top/Bottom Dock Sub-Panel Overlay & Internal Scrolling Contract', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify CSS contracts for top/bottom dock sub-panel overlay
  assert.ok(css.includes('[data-dock-edge="top"] .workspace-dock-body > .ui-panel .panel-body'), 'CSS must define relative container for top dock panel-body');
  assert.ok(css.includes('[data-dock-edge="bottom"] .workspace-dock-body > .ui-panel .panel-body'), 'CSS must define relative container for bottom dock panel-body');
  assert.ok(css.includes('position: absolute !important'), 'Expanded sub-panel must use position: absolute !important to overlay container');
  assert.ok(css.includes('inset: 0 !important'), 'Expanded sub-panel must use inset: 0 !important to overlay entire panel body');
  assert.ok(css.includes('overflow-y: auto !important'), 'Expanded sub-panel content must use overflow-y: auto !important for internal scrolling');
  assert.ok(css.includes('overscroll-behavior: contain !important'), 'Expanded sub-panel content must use overscroll-behavior: contain !important');
  assert.ok(css.includes('.has-expanded-subpanel'), 'CSS must support has-expanded-subpanel class on ui-panel');
  assert.ok(css.includes('.is-subpanel-overlay'), 'CSS must support is-subpanel-overlay class on collapsible-section');

  // Test DOM state synchronization
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);

  const panel = new MockDOMElement('div', 'ui-panel', 'controls-panel');
  const panelHeader = new MockDOMElement('div', 'panel-header');
  const panelBody = new MockDOMElement('div', 'panel-body');

  const sec1 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-1');
  const h1 = new MockDOMElement('div', 'collapsible-header');
  const c1 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec1.appendChild(h1);
  sec1.appendChild(c1);

  const sec2 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-2');
  const h2 = new MockDOMElement('div', 'collapsible-header');
  const c2 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec2.appendChild(h2);
  sec2.appendChild(c2);

  panelBody.appendChild(sec1);
  panelBody.appendChild(sec2);
  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);
  dock.setDockEdge('top');

  // Initially all collapsed
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(sec1.classList.contains('is-subpanel-overlay'), false);
  assert.strictEqual(sec2.classList.contains('is-subpanel-overlay'), false);

  // Expand sec1
  sec1.classList.remove('collapsed');
  c1.classList.remove('collapsed');
  c1.classList.add('open');
  dock.syncSubpanelOverlayState();

  // Overlay state should be active on panel and sec1
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), false);
  assert.strictEqual(sec1.classList.contains('is-subpanel-overlay'), true);
  assert.strictEqual(sec2.classList.contains('is-subpanel-overlay'), false);

  // Expand sec2 as well (multi-expand / Expand All state)
  sec2.classList.remove('collapsed');
  c2.classList.remove('collapsed');
  c2.classList.add('open');
  dock.syncSubpanelOverlayState();

  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), true);
  assert.strictEqual(sec1.classList.contains('is-subpanel-overlay'), false, 'Multi-expand must deactivate overlay stacking');
  assert.strictEqual(sec2.classList.contains('is-subpanel-overlay'), false, 'Multi-expand must deactivate overlay stacking');

  // Collapse all
  dock.collapseAllSubComponents();
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), false);
  assert.strictEqual(sec1.classList.contains('is-subpanel-overlay'), false);
  assert.strictEqual(sec2.classList.contains('is-subpanel-overlay'), false);
});

test('WorkspaceDockManager: Elevation Hierarchy & Turn-Taking Deck Contract', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Verify CSS architecture for Level 1, Level 2, and Level 3 Elevation
  assert.ok(css.includes('.panel-elevation-deck'), 'CSS must define .panel-elevation-deck container');
  assert.ok(css.includes('.elevation-deck-label'), 'CSS must define .elevation-deck-label');
  assert.ok(css.includes('.elevation-deck-pills'), 'CSS must define .elevation-deck-pills container');
  assert.ok(css.includes('.elevation-deck-pill'), 'CSS must define .elevation-deck-pill');
  assert.ok(css.includes('.elevation-deck-pill.active'), 'CSS must style active deck pill');
  assert.ok(css.includes('.is-elevated-top'), 'CSS must define .is-elevated-top for active top-turn subpanel');
  assert.ok(css.includes('.is-in-deck'), 'CSS must define .is-in-deck for queued subpanels');
  assert.ok(css.includes('display: none !important'), 'Decked subpanels must have display: none !important');
  assert.ok(css.includes('z-index: 20 !important'), 'Elevated top subpanel must use z-index: 20');
  assert.ok(css.includes('.derivation-step'), 'CSS must provide Level 3 elevation for derivation steps');

  // 2. DOM Turn-Taking Verification
  const root = new MockDOMElement('div', 'circle-explorer');
  const panel = new MockDOMElement('div', 'ui-panel', 'dock-controls-panel');
  const panelHeader = new MockDOMElement('div', 'panel-header');
  const panelBody = new MockDOMElement('div', 'panel-body');

  const secA = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-a');
  const hA = new MockDOMElement('div', 'collapsible-header');
  hA.textContent = '▶ Interactive Controls';
  const cA = new MockDOMElement('div', 'collapsible-content collapsed');
  secA.appendChild(hA);
  secA.appendChild(cA);

  const secB = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-b');
  const hB = new MockDOMElement('div', 'collapsible-header');
  hB.textContent = '▶ Geometry Telemetry';
  const cB = new MockDOMElement('div', 'collapsible-content collapsed');
  secB.appendChild(hB);
  secB.appendChild(cB);

  const secC = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-c');
  const hC = new MockDOMElement('div', 'collapsible-header');
  hC.textContent = '▶ Step Derivations';
  const cC = new MockDOMElement('div', 'collapsible-content collapsed');
  secC.appendChild(hC);
  secC.appendChild(cC);

  panelBody.appendChild(secA);
  panelBody.appendChild(secB);
  panelBody.appendChild(secC);
  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);
  dock.setDockEdge('bottom');

  // Initially all collapsed: Level 1 base panel
  assert.strictEqual(panel.getAttribute('data-elevation-level'), '1');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), null);
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), null);

  // Expand single section (secA)
  secA.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(secA.classList.contains('is-subpanel-overlay'), true);
  assert.strictEqual(secA.getAttribute('data-elevation-level'), '2');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), null);

  // Expand all sections (Multi-expansion: secA, secB, secC)
  secB.classList.remove('collapsed');
  secC.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  // Verify multi-expand deck activated
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), true);
  const deckEl = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deckEl, '.panel-elevation-deck must be created in panelBody');
  assert.strictEqual(deckEl.style.display, 'flex');

  // Verify pills generated for all 3 open sections
  const pills = deckEl.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 3, 'Deck must render a pill for each open section');

  // Initial turn belongs to first open section (secA)
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secA.classList.contains('is-elevated-top'), true);
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true);
  assert.strictEqual(secC.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secC.classList.contains('is-in-deck'), true);

  assert.strictEqual(pills[0].classList.contains('active'), true);
  assert.strictEqual(pills[0].getAttribute('aria-selected'), 'true');
  assert.strictEqual(pills[1].classList.contains('active'), false);
  assert.strictEqual(pills[1].getAttribute('aria-selected'), 'false');

  // User clicks pill 2 (Geometry Telemetry) -> switches turn to secB
  pills[1].dispatchEvent({ type: 'click' });

  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secA.classList.contains('is-elevated-top'), false);
  assert.strictEqual(secA.classList.contains('is-in-deck'), true);

  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.classList.contains('is-elevated-top'), true);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);

  const updatedPills = deckEl.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(updatedPills[1].classList.contains('active'), true);
  assert.strictEqual(updatedPills[1].getAttribute('aria-selected'), 'true');

  // User clicks pill 3 (Step Derivations) -> switches turn to secC
  updatedPills[2].dispatchEvent({ type: 'click' });
  assert.strictEqual(secC.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secC.classList.contains('is-elevated-top'), true);
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true);

  // Collapse all
  dock.collapseAllSubComponents();
  assert.strictEqual(deckEl.style.display, 'none');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), null);
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), null);
  assert.strictEqual(secC.getAttribute('data-elevation-turn'), null);
});

test('WorkspaceDockManager: Advanced Docking Refinements (Shade, Tray Float, Magnetic Snapping, Deck Navigation & Stack Mode)', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Verify CSS rules for refined capabilities
  assert.ok(css.includes('.dock-drag-handle'), 'CSS must define .dock-drag-handle');
  assert.ok(css.includes('.tray-item-float-btn'), 'CSS must define .tray-item-float-btn');
  assert.ok(css.includes('.tray-dropdown-footer'), 'CSS must define .tray-dropdown-footer');
  assert.ok(css.includes('.panel-shade-btn'), 'CSS must define .panel-shade-btn');
  assert.ok(css.includes('.ui-panel.is-shaded'), 'CSS must define .ui-panel.is-shaded');
  assert.ok(css.includes('.elevation-deck-nav-btn'), 'CSS must define .elevation-deck-nav-btn');
  assert.ok(css.includes('.elevation-deck-mode-toggle'), 'CSS must define .elevation-deck-mode-toggle');

  // 2. Setup DOM environment
  const root = new MockDOMElement('div', 'circle-explorer');
  const panel = new MockDOMElement('div', 'ui-panel', 'refined-panel');
  const panelHeader = new MockDOMElement('div', 'panel-header');
  const panelBody = new MockDOMElement('div', 'panel-body');

  const secA = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-a');
  const hA = new MockDOMElement('div', 'collapsible-header');
  hA.textContent = '▶ Subpanel Alpha';
  const cA = new MockDOMElement('div', 'collapsible-content collapsed');
  secA.appendChild(hA);
  secA.appendChild(cA);

  const secB = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-b');
  const hB = new MockDOMElement('div', 'collapsible-header');
  hB.textContent = '▶ Subpanel Beta';
  const cB = new MockDOMElement('div', 'collapsible-content collapsed');
  secB.appendChild(hB);
  secB.appendChild(cB);

  panelBody.appendChild(secA);
  panelBody.appendChild(secB);
  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);

  // 3. Window Shade / Roll-Up Verification
  const shadeBtn = panel.querySelector('.panel-shade-btn');
  assert.ok(shadeBtn, 'Panel header must have a shade button');
  assert.strictEqual(panel.classList.contains('is-shaded'), false);

  shadeBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(panel.classList.contains('is-shaded'), true, 'Clicking shadeBtn must shade panel');
  shadeBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Clicking shadeBtn again must un-shade panel');

  // 4. Tray Float / Re-Dock Button Verification
  const trayRow = dock.trayItemsContainer.querySelector('.tray-item-row');
  assert.ok(trayRow, 'Tray items must be organized in rows');
  const floatBtn = trayRow.querySelector('.tray-item-float-btn');
  assert.ok(floatBtn, 'Tray row must include a float/dock toggle button');
  assert.strictEqual(floatBtn.textContent, '⧉');

  floatBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(dock.panels.get('refined-panel').isFloating, true, 'Clicking floatBtn in tray must float panel');

  const updatedFloatBtn = dock.trayItemsContainer.querySelector('.tray-item-float-btn');
  assert.strictEqual(updatedFloatBtn.textContent, '🗁', 'Float button icon must update to dock icon');
  updatedFloatBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(dock.panels.get('refined-panel').isFloating, false, 'Clicking dockBtn in tray must re-dock panel');

  // 5. Magnetic Snapping on Dragged Collapsed Pill
  dock.setDockCollapsed(true);
  const header = dock.dockElement.querySelector('.workspace-dock-header');
  // Drag near left edge (clientX: 10px -> snap threshold < 24px)
  header.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 100, target: header, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 10, clientY: 100 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });

  assert.strictEqual(dock.collapsedPos.x, 12, 'Collapsed pill dropped within 24px of edge must magnetically snap to 12px');

  // 6. Elevation Deck Prev/Next Navigation & Mode Toggle
  dock.setDockCollapsed(false);
  secA.classList.remove('collapsed');
  secB.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deckEl = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deckEl, 'Elevation deck must be present');

  const prevBtn = deckEl.querySelector('.elevation-deck-nav-btn.prev');
  const nextBtn = deckEl.querySelector('.elevation-deck-nav-btn.next');
  const modeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');

  assert.ok(prevBtn, 'Elevation deck must have Previous button');
  assert.ok(nextBtn, 'Elevation deck must have Next button');
  assert.ok(modeBtn, 'Elevation deck must have Mode toggle button');

  // Initial turn: secA
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');

  // Advance via nextBtn -> switches to secB
  nextBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'deck');

  // Advance via updated prevBtn -> switches back to secA
  const updatedPrevBtn = deckEl.querySelector('.elevation-deck-nav-btn.prev');
  updatedPrevBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');

  // Switch to Stack mode
  const currentModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  currentModeBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'stack');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false, 'In Stack mode, subpanels must not have is-in-deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), false, 'In Stack mode, subpanels must not have is-in-deck');

  // Switch back to Deck mode
  const updatedModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  updatedModeBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true, 'In Deck mode, non-active subpanel must have is-in-deck');
});



