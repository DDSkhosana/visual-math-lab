import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WorkspaceDockManager, initWorkspaceDock, syncPanelElevationTurn, cyclePanelSubpanel, initCollapsibleSections, setSubpanelOpen } from '../js/circle-core.js';

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
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.clientHeight = 0;
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
    if (!event.stopPropagation) event.stopPropagation = () => {};
    if (!event.preventDefault) event.preventDefault = () => {};
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }
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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');
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
    const htmlPath = path.join(rootDir, 'visuals', 'circle-theorems', slug, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('class="collapsible-section collapsed"'), `${slug}/index.html must have collapsible sections collapsed by default`);
    assert.ok(!html.includes('<div class="collapsible-section">'), `${slug}/index.html must not contain uncollapsed <div class="collapsible-section">`);
  }
});

test('WorkspaceDockManager: Top/Bottom Dock Sub-Panel Overlay & Internal Scrolling Contract', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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
  assert.strictEqual(deckEl.style.display, 'grid');

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
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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

  // Switch to Accordion mode
  const accordionModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  accordionModeBtn.dispatchEvent({ type: 'click' });
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'accordion');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);

  // Switch back to Tabs / Deck mode
  const updatedModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  updatedModeBtn.dispatchEvent({ type: 'click' });
  assert.ok(
    panelBody.getAttribute('data-deck-mode') === 'tabs' || panelBody.getAttribute('data-deck-mode') === 'deck',
    'Must cycle back to tabs/deck mode'
  );
  assert.strictEqual(secB.classList.contains('is-in-deck'), true, 'In Deck mode, non-active subpanel must have is-in-deck');
});

test('WorkspaceDockManager: Comprehensive Step-by-Step User Interaction Pipeline', async () => {
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
      if (!event.stopPropagation) event.stopPropagation = () => {};
      if (!event.preventDefault) event.preventDefault = () => {};
      const handlers = this.listeners.get(event.type) || [];
      handlers.forEach((h) => h(event));
    },
  };
  mockDoc.defaultView = mockWin;

  const root = mockDoc.createElement('div');
  root.className = 'circle-explorer';
  mockDoc.body.appendChild(root);

  // Main canvas view container
  const viewContainer = mockDoc.createElement('div');
  viewContainer.className = 'view-container';
  root.appendChild(viewContainer);

  // Panel 1: Controls panel with subpanels
  const panel1 = mockDoc.createElement('div');
  panel1.className = 'ui-panel';
  panel1.id = 'panel-controls';

  const p1Header = mockDoc.createElement('div');
  p1Header.className = 'panel-header';
  p1Header.textContent = 'Interactive Controls';
  panel1.appendChild(p1Header);

  const p1Body = mockDoc.createElement('div');
  p1Body.className = 'panel-body';

  const secA = mockDoc.createElement('div');
  secA.className = 'collapsible-section collapsed';
  const secAHeader = mockDoc.createElement('div');
  secAHeader.className = 'collapsible-header';
  secAHeader.textContent = 'Primary Angles';
  secA.appendChild(secAHeader);
  const secAContent = mockDoc.createElement('div');
  secAContent.className = 'collapsible-content collapsed';
  secA.appendChild(secAContent);
  p1Body.appendChild(secA);

  const secB = mockDoc.createElement('div');
  secB.className = 'collapsible-section collapsed';
  const secBHeader = mockDoc.createElement('div');
  secBHeader.className = 'collapsible-header';
  secBHeader.textContent = 'Projection Controls';
  secB.appendChild(secBHeader);
  const secBContent = mockDoc.createElement('div');
  secBContent.className = 'collapsible-content collapsed';
  secB.appendChild(secBContent);
  p1Body.appendChild(secB);

  panel1.appendChild(p1Body);
  root.appendChild(panel1);

  // Panel 2: Derivations panel
  const panel2 = mockDoc.createElement('div');
  panel2.className = 'ui-panel';
  panel2.id = 'panel-derivations';
  const p2Header = mockDoc.createElement('div');
  p2Header.className = 'panel-header';
  p2Header.textContent = 'Geometric Derivations';
  panel2.appendChild(p2Header);
  const p2Body = mockDoc.createElement('div');
  p2Body.className = 'panel-body';
  panel2.appendChild(p2Body);
  root.appendChild(panel2);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // -------------------------------------------------------------
  // Step 1: Edge switching with vertical/horizontal size memory
  // -------------------------------------------------------------
  assert.strictEqual(dock.dockEdge, 'left');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'left');
  assert.strictEqual(dock.dockSize, 380);

  const edgeTopBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="top"]');
  assert.ok(edgeTopBtn, 'Edge button for top must exist');
  edgeTopBtn.click();
  assert.strictEqual(dock.dockEdge, 'top');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'top');
  assert.strictEqual(dock.dockSize, 340, 'Horizontal edge must use dockSizeHorizontal (340px)');
  assert.strictEqual(edgeTopBtn.classList.contains('active'), true);
  assert.strictEqual(edgeTopBtn.getAttribute('aria-pressed'), 'true');
  assert.deepStrictEqual(dock.getEdgeDefaultCollapsedPos('top'), { x: 120, y: 16 }, 'Top edge collapsed pill must sit to the right of modes pill at x=120');

  const edgeRightBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="right"]');
  edgeRightBtn.click();
  assert.strictEqual(dock.dockEdge, 'right');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'right');
  assert.strictEqual(dock.dockSize, 380, 'Vertical edge must restore dockSizeVertical (380px)');

  const edgeBottomBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="bottom"]');
  edgeBottomBtn.click();
  assert.strictEqual(dock.dockEdge, 'bottom');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'bottom');
  assert.strictEqual(dock.dockSize, 340);

  // Switch back to left edge
  const edgeLeftBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="left"]');
  edgeLeftBtn.click();
  assert.strictEqual(dock.dockEdge, 'left');

  // -------------------------------------------------------------
  // Step 2: Resizer drag with clamping
  // -------------------------------------------------------------
  const resizer = dock.dockResizer;
  assert.ok(resizer, 'Dock resizer divider must exist');

  // Pointerdown on resizer
  resizer.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 380, clientY: 200 });
  assert.strictEqual(resizer.classList.contains('active'), true);
  assert.strictEqual(resizer.hasPointerCapture(2), true);

  // Drag outward: clientX moves to 450 (+70px)
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 450, clientY: 200 });
  assert.strictEqual(dock.dockSize, 450);
  assert.strictEqual(dock.dockSizeVertical, 450);

  // Drag below minimum threshold: clientX moves to 100 -> clamped to 280
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 100, clientY: 200 });
  assert.strictEqual(dock.dockSize, 240, 'Resizer must allow a compact 240px dock without exceeding the viewport');

  // Pointerup releases capture
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 2 });
  assert.strictEqual(resizer.classList.contains('active'), false);
  assert.strictEqual(resizer.hasPointerCapture(2), false);

  // -------------------------------------------------------------
  // Step 3: Collapse and expand via collapse button
  // -------------------------------------------------------------
  const collapseBtn = dock.collapseBtn;
  assert.ok(collapseBtn, 'Collapse button must exist in dock header');
  assert.strictEqual(dock.isCollapsed, false);

  // Click collapse button
  collapseBtn.click();
  assert.strictEqual(dock.isCollapsed, true);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), true);
  assert.strictEqual(root.classList.contains('dock-is-collapsed'), true);
  assert.strictEqual(collapseBtn.getAttribute('aria-label'), 'Expand Dock');

  // Click collapse button again to expand
  collapseBtn.click();
  assert.strictEqual(dock.isCollapsed, false);
  assert.strictEqual(dock.dockElement.classList.contains('is-collapsed'), false);
  assert.strictEqual(root.classList.contains('dock-is-collapsed'), false);
  assert.strictEqual(collapseBtn.getAttribute('aria-label'), 'Collapse Dock');
  assert.strictEqual(dock.dockElement.style.left, '');

  // -------------------------------------------------------------
  // Step 4: Header interaction while collapsed
  // -------------------------------------------------------------
  dock.setDockCollapsed(true);
  assert.strictEqual(dock.isCollapsed, true);

  const dockHeader = dock.dockElement.querySelector('.workspace-dock-header');

  // Double-click header while collapsed resets pill position to (16, 56)
  dockHeader.dispatchEvent({ type: 'dblclick' });
  assert.strictEqual(dock.collapsedPos.x, 16);
  assert.strictEqual(dock.collapsedPos.y, 56);
  assert.strictEqual(dock.dockElement.style.left, '16px');
  assert.strictEqual(dock.dockElement.style.top, '56px');

  // Single-click header auto-expands dock
  dockHeader.click();
  assert.strictEqual(dock.isCollapsed, false);

  // -------------------------------------------------------------
  // Step 5: Capsule pill drag with pointer capture and magnetic snap
  // -------------------------------------------------------------
  dock.setDockCollapsed(true);
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 3, clientX: 200, clientY: 200, target: dockHeader });
  assert.strictEqual(dockHeader.hasPointerCapture(3), true);

  // Drag near top-left edge (within 24px magnetic snap threshold)
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 18, clientY: 15 });
  assert.strictEqual(dock.dockElement.classList.contains('is-dragging'), true);

  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 3 });
  assert.strictEqual(dock.dockElement.classList.contains('is-dragging'), false);
  assert.strictEqual(dock.collapsedPos.x, 12, 'Magnetic snapping must snap x to 12px margin');
  assert.strictEqual(dock.collapsedPos.y, 12, 'Magnetic snapping must snap y to 12px margin');

  dock.setDockCollapsed(false);

  // -------------------------------------------------------------
  // Step 6: Float panel via header button and dock back
  // -------------------------------------------------------------
  const p1Record = dock.panels.get('panel-controls');
  const p1DockBtn = p1Record.dockToggleBtn;
  assert.ok(p1DockBtn, 'Panel controls must have a dock toggle button');
  assert.strictEqual(p1Record.isFloating, false);

  // Pop out to floating
  p1DockBtn.click();
  assert.strictEqual(p1Record.isFloating, true);
  assert.strictEqual(panel1.classList.contains('is-floating'), true);
  assert.strictEqual(panel1.parentElement, dock.floatingLayer);
  assert.strictEqual(p1DockBtn.textContent, '🗁', 'Header button must update to dock icon');

  // Dock back
  p1DockBtn.click();
  assert.strictEqual(p1Record.isFloating, false);
  assert.strictEqual(panel1.classList.contains('is-floating'), false);
  assert.strictEqual(panel1.parentElement, dock.dockBody);
  assert.strictEqual(p1DockBtn.textContent, '⧉', 'Header button must update to float icon');

  // -------------------------------------------------------------
  // Step 7: Float panel via tray row button and dock back
  // -------------------------------------------------------------
  const trayRows = dock.trayItemsContainer.querySelectorAll('.tray-item-row');
  assert.strictEqual(trayRows.length, 2);
  const p1TrayFloatBtn = trayRows[0].querySelector('.tray-item-float-btn');
  assert.ok(p1TrayFloatBtn, 'Tray row must contain float button');

  // Float via tray button
  p1TrayFloatBtn.click();
  assert.strictEqual(p1Record.isFloating, true);
  const updatedTrayRows = dock.trayItemsContainer.querySelectorAll('.tray-item-row');
  const updatedTrayFloatBtn = updatedTrayRows[0].querySelector('.tray-item-float-btn');
  assert.strictEqual(updatedTrayFloatBtn.textContent, '🗁');

  // Re-dock via tray button
  updatedTrayFloatBtn.click();
  assert.strictEqual(p1Record.isFloating, false);

  // -------------------------------------------------------------
  // Step 8: Panel shading via shade button and header double-click
  // -------------------------------------------------------------
  const p1ShadeBtn = p1Record.shadeBtn;
  assert.ok(p1ShadeBtn, 'Panel must have shade button');
  assert.strictEqual(panel1.classList.contains('is-shaded'), false);

  p1ShadeBtn.click();
  assert.strictEqual(panel1.classList.contains('is-shaded'), true);
  assert.strictEqual(p1ShadeBtn.textContent, '□');

  p1ShadeBtn.click();
  assert.strictEqual(panel1.classList.contains('is-shaded'), false);
  assert.strictEqual(p1ShadeBtn.textContent, '─');

  // Double-click panel header to toggle shading
  p1Header.dispatchEvent({ type: 'dblclick', target: p1Header });
  assert.strictEqual(panel1.classList.contains('is-shaded'), true);
  p1Header.dispatchEvent({ type: 'dblclick', target: p1Header });
  assert.strictEqual(panel1.classList.contains('is-shaded'), false);

  // -------------------------------------------------------------
  // Step 9: Omni-resizing floating panel (all 8 handles)
  // -------------------------------------------------------------
  dock.floatPanel('panel-controls');
  assert.strictEqual(p1Record.handles.length, 8, 'Floating panel must have 8 resize handles');

  // Test SE handle (South-East corner)
  const seHandle = panel1.querySelector('.omni-handle.omni-se');
  assert.ok(seHandle, 'SE handle must exist');
  seHandle.dispatchEvent({ type: 'pointerdown', pointerId: 4, clientX: 300, clientY: 300 });
  assert.strictEqual(seHandle.classList.contains('active'), true);
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 380, clientY: 380 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 4 });
  assert.strictEqual(seHandle.classList.contains('active'), false);
  assert.ok(parseFloat(panel1.style.width) >= 380);

  // Test NW handle (North-West corner with minimum clamping)
  const nwHandle = panel1.querySelector('.omni-handle.omni-nw');
  assert.ok(nwHandle, 'NW handle must exist');
  nwHandle.dispatchEvent({ type: 'pointerdown', pointerId: 5, clientX: 100, clientY: 100 });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 999, clientY: 999 }); // tries to shrink past min
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 5 });
  assert.ok(parseFloat(panel1.style.width) >= 260, 'Width must clamp to minimum 260px');
  assert.ok(parseFloat(panel1.style.height) >= 140, 'Height must clamp to minimum 140px');

  // -------------------------------------------------------------
  // Step 10: Floating panel z-index focus raising
  // -------------------------------------------------------------
  dock.floatPanel('panel-derivations');
  const p2Record = dock.panels.get('panel-derivations');
  assert.strictEqual(panel2.classList.contains('is-focused'), true);
  assert.strictEqual(panel1.classList.contains('is-focused'), false);

  // Click on panel1 in floating layer
  dock.floatingLayer.dispatchEvent({ type: 'pointerdown', target: panel1 });
  assert.strictEqual(panel1.classList.contains('is-focused'), true);
  assert.strictEqual(panel2.classList.contains('is-focused'), false);
  assert.ok(parseInt(panel1.style.zIndex, 10) > parseInt(panel2.style.zIndex, 10));

  // Dock both panels back
  dock.dockPanel('panel-controls');
  dock.dockPanel('panel-derivations');

  // -------------------------------------------------------------
  // Step 11: Tray checklist show/hide and outside click
  // -------------------------------------------------------------
  const trayBtn = dock.trayBtn;
  const trayDropdown = dock.trayDropdown;
  assert.strictEqual(trayDropdown.hidden, true);
  assert.strictEqual(trayBtn.getAttribute('aria-expanded'), 'false');

  // Open tray
  trayBtn.click();
  assert.strictEqual(trayDropdown.hidden, false);
  assert.strictEqual(trayBtn.getAttribute('aria-expanded'), 'true');

  // Click outside closes tray
  const outsideEl = mockDoc.createElement('div');
  mockDoc.body.appendChild(outsideEl);
  mockDoc.dispatchEvent({ type: 'click', target: outsideEl });
  assert.strictEqual(trayDropdown.hidden, true);
  assert.strictEqual(trayBtn.getAttribute('aria-expanded'), 'false');

  // Open tray again, then click on panel inside dock -> must also close tray
  trayBtn.click();
  assert.strictEqual(trayDropdown.hidden, false);
  mockDoc.dispatchEvent({ type: 'click', target: panel1 });
  assert.strictEqual(trayDropdown.hidden, true, 'Clicking on panel inside dock must close tray dropdown');

  // Open tray again, then press Escape -> must close tray
  trayBtn.click();
  assert.strictEqual(trayDropdown.hidden, false);
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(trayDropdown.hidden, true, 'Pressing Escape must close tray dropdown');

  // Toggle checkbox to hide panel-derivations
  const rowsAfter = dock.trayItemsContainer.querySelectorAll('.tray-item-row');
  const p2Checkbox = rowsAfter[1].querySelector('input[type="checkbox"]');
  p2Checkbox.checked = false;
  p2Checkbox.dispatchEvent({ type: 'change' });
  assert.strictEqual(p2Record.isHidden, true);
  assert.strictEqual(panel2.style.display, 'none');

  p2Checkbox.checked = true;
  p2Checkbox.dispatchEvent({ type: 'change' });
  assert.strictEqual(p2Record.isHidden, false);
  assert.strictEqual(panel2.style.display, '');

  // -------------------------------------------------------------
  // Step 12: Tray batch actions (Show All, Dock All, Collapse All)
  // -------------------------------------------------------------
  // Hide panel1 and float panel2
  dock.setPanelVisible('panel-controls', false);
  dock.floatPanel('panel-derivations');

  const showAllBtn = trayDropdown.querySelector('#tray-btn-show-all');
  const dockAllBtn = trayDropdown.querySelector('#tray-btn-dock-all');
  const collapseAllBtn = trayDropdown.querySelector('#tray-btn-collapse-all');
  assert.ok(showAllBtn && dockAllBtn && collapseAllBtn, 'Tray footer buttons must exist');

  showAllBtn.click();
  assert.strictEqual(p1Record.isHidden, false, 'Show All must unhide panel-controls');

  dockAllBtn.click();
  assert.strictEqual(p2Record.isFloating, false, 'Dock All must re-dock panel-derivations');

  secA.classList.remove('collapsed');
  secB.classList.remove('collapsed');
  collapseAllBtn.click();
  assert.strictEqual(secA.classList.contains('collapsed'), true, 'Collapse All must collapse secA');
  assert.strictEqual(secB.classList.contains('collapsed'), true, 'Collapse All must collapse secB');

  // -------------------------------------------------------------
  // Step 13: Empty dock notice and 1-click restore
  // -------------------------------------------------------------
  dock.setPanelVisible('panel-controls', false);
  dock.setPanelVisible('panel-derivations', false);

  const emptyNotice = dock.dockBody.querySelector('.dock-empty-notice');
  assert.ok(emptyNotice, 'Dock body must show empty notice when all docked panels are hidden');
  assert.strictEqual(emptyNotice.style.display, 'flex');

  const emptyRestoreBtn = emptyNotice.querySelector('.dock-empty-restore-btn');
  assert.ok(emptyRestoreBtn, 'Empty notice must provide Restore button');
  emptyRestoreBtn.click();

  assert.strictEqual(p1Record.isHidden, false, 'Restore button must unhide panel 1');
  assert.strictEqual(p2Record.isHidden, false, 'Restore button must unhide panel 2');
  assert.strictEqual(emptyNotice.style.display, 'none', 'Empty notice must be hidden when panels are restored');

  // -------------------------------------------------------------
  // Step 14: Elevation deck multi-expand turn-taking
  // -------------------------------------------------------------
  // Expand both secA and secB
  secA.classList.remove('collapsed');
  secB.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  const deckEl = p1Body.querySelector('.panel-elevation-deck');
  assert.ok(deckEl, 'Elevation deck must appear when multiple subpanels are expanded');
  assert.strictEqual(deckEl.style.display, 'grid');

  const deckLabel = deckEl.querySelector('.elevation-deck-label');
  assert.strictEqual(deckLabel.textContent, 'Deck (1/2)');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secA.classList.contains('is-elevated-top'), true);
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secB.classList.contains('is-in-deck'), true);

  // -------------------------------------------------------------
  // Step 15: Elevation deck pill click turn-taking
  // -------------------------------------------------------------
  const deckPills = deckEl.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(deckPills.length, 2);
  assert.strictEqual(deckPills[0].classList.contains('active'), true);
  assert.strictEqual(deckPills[1].classList.contains('active'), false);

  // Click pill 2 (secB)
  deckPills[1].click();
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.classList.contains('is-elevated-top'), true);
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(secA.classList.contains('is-in-deck'), true);

  const updatedPills = deckEl.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(updatedPills[1].classList.contains('active'), true);

  // -------------------------------------------------------------
  // Step 16: Elevation deck previous and next nav buttons with turn wrapping
  // -------------------------------------------------------------
  const nextNavBtn = deckEl.querySelector('.elevation-deck-nav-btn.next');
  assert.ok(nextNavBtn, 'Next nav button must exist');

  // Next wraps from secB (idx 1) back to secA (idx 0)
  nextNavBtn.click();
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'deck');

  // Prev wraps from secA (idx 0) back to secB (idx 1)
  const prevNavBtn = deckEl.querySelector('.elevation-deck-nav-btn.prev');
  assert.ok(prevNavBtn, 'Prev nav button must exist');
  prevNavBtn.click();
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'deck');

  // -------------------------------------------------------------
  // Step 17: Elevation deck keyboard cycling ([ and ])
  // -------------------------------------------------------------
  // Press '[' on document: retreats turn back to secA
  mockDoc.dispatchEvent({ type: 'keydown', key: '[' });
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');

  // Press ']' on document: advances turn to secB
  mockDoc.dispatchEvent({ type: 'keydown', key: ']' });
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');

  // -------------------------------------------------------------
  // Step 18: Elevation deck pill arrow key navigation
  // -------------------------------------------------------------
  const pillsForKeys = deckEl.querySelectorAll('.elevation-deck-pill');
  // Press ArrowRight on active pill (secB) -> wraps to secA
  pillsForKeys[1].dispatchEvent({ type: 'keydown', key: 'ArrowRight' });
  assert.strictEqual(secA.getAttribute('data-elevation-turn'), 'top');

  // Press ArrowLeft on new active pill (secA) -> wraps to secB
  const pillsAfterRight = deckEl.querySelectorAll('.elevation-deck-pill');
  pillsAfterRight[0].dispatchEvent({ type: 'keydown', key: 'ArrowLeft' });
  assert.strictEqual(secB.getAttribute('data-elevation-turn'), 'top');

  // -------------------------------------------------------------
  // Step 19: Elevation deck mode toggle (Focus Step vs Scroll All)
  // -------------------------------------------------------------
  const modeToggleBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.ok(modeToggleBtn, 'Mode toggle button must exist');
  assert.strictEqual(modeToggleBtn.textContent, 'Focus Step');

  // Switch to Stack mode
  modeToggleBtn.click();
  assert.strictEqual(p1Body.getAttribute('data-deck-mode'), 'stack');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);

  const updatedModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.strictEqual(updatedModeBtn.textContent, 'Scroll All');
  assert.strictEqual(updatedModeBtn.classList.contains('is-stack'), true);

  // Switch to Accordion mode
  updatedModeBtn.click();
  assert.strictEqual(p1Body.getAttribute('data-deck-mode'), 'accordion');
  assert.strictEqual(secA.classList.contains('is-in-deck'), false);
  assert.strictEqual(secB.classList.contains('is-in-deck'), false);

  // Switch back to Tabs / Deck mode
  const finalModeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  finalModeBtn.click();
  assert.ok(
    p1Body.getAttribute('data-deck-mode') === 'tabs' || p1Body.getAttribute('data-deck-mode') === 'deck',
    'Must cycle back to tabs/deck mode'
  );
  assert.strictEqual(secA.classList.contains('is-in-deck'), true);

  // -------------------------------------------------------------
  // Step 20: Viewport deduction
  // -------------------------------------------------------------
  mockWin.innerWidth = 1200;
  dock.deduceViewport();
  assert.strictEqual(root.getAttribute('data-viewport'), 'regular');

  mockWin.innerWidth = 600;
  dock.deduceViewport();
  assert.strictEqual(root.getAttribute('data-viewport'), 'compact');
});

test('WorkspaceDockManager: Cross-Level Hierarchical Navigation & Peer Roving Pipeline', async () => {
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
      if (!event.stopPropagation) event.stopPropagation = () => {};
      if (!event.preventDefault) event.preventDefault = () => {};
      const handlers = this.listeners.get(event.type) || [];
      handlers.forEach((h) => h(event));
    },
  };
  mockDoc.defaultView = mockWin;

  const root = mockDoc.createElement('div');
  root.className = 'circle-explorer';
  mockDoc.body.appendChild(root);

  const viewContainer = mockDoc.createElement('div');
  viewContainer.className = 'view-container';
  root.appendChild(viewContainer);

  // Panel 1: Controls (with two sections, secA with input slider, secB with button)
  const panel1 = mockDoc.createElement('div');
  panel1.className = 'ui-panel';
  panel1.id = 'panel-controls';

  const p1Header = mockDoc.createElement('div');
  p1Header.className = 'panel-header';
  p1Header.textContent = 'Controls';
  panel1.appendChild(p1Header);

  const p1Body = mockDoc.createElement('div');
  p1Body.className = 'panel-body';

  const secA = mockDoc.createElement('div');
  secA.className = 'collapsible-section collapsed';
  const secAHeader = mockDoc.createElement('div');
  secAHeader.className = 'collapsible-header';
  secAHeader.textContent = 'Primary Angles';
  secA.appendChild(secAHeader);
  const secAContent = mockDoc.createElement('div');
  secAContent.className = 'collapsible-content collapsed';
  const sliderInput = mockDoc.createElement('input');
  sliderInput.type = 'range';
  sliderInput.id = 'theta-slider';
  secAContent.appendChild(sliderInput);
  secA.appendChild(secAContent);
  p1Body.appendChild(secA);

  const secB = mockDoc.createElement('div');
  secB.className = 'collapsible-section collapsed';
  const secBHeader = mockDoc.createElement('div');
  secBHeader.className = 'collapsible-header';
  secBHeader.textContent = 'Camera Presets';
  secB.appendChild(secBHeader);
  const secBContent = mockDoc.createElement('div');
  secBContent.className = 'collapsible-content collapsed';
  const camBtn = mockDoc.createElement('button');
  camBtn.type = 'button';
  camBtn.id = 'btn-iso';
  camBtn.textContent = 'Isometric';
  secBContent.appendChild(camBtn);
  secB.appendChild(secBContent);
  p1Body.appendChild(secB);

  panel1.appendChild(p1Body);
  root.appendChild(panel1);

  // Panel 2: Derivations
  const panel2 = mockDoc.createElement('div');
  panel2.className = 'ui-panel';
  panel2.id = 'panel-derivations';
  const p2Header = mockDoc.createElement('div');
  p2Header.className = 'panel-header';
  p2Header.textContent = 'Derivations';
  panel2.appendChild(p2Header);
  const p2Body = mockDoc.createElement('div');
  p2Body.className = 'panel-body';
  panel2.appendChild(p2Body);
  root.appendChild(panel2);

  // Panel 3: Modes
  const panel3 = mockDoc.createElement('div');
  panel3.className = 'ui-panel';
  panel3.id = 'panel-modes';
  const p3Header = mockDoc.createElement('div');
  p3Header.className = 'panel-header';
  p3Header.textContent = 'Modes';
  panel3.appendChild(p3Header);
  const p3Body = mockDoc.createElement('div');
  p3Body.className = 'panel-body';
  panel3.appendChild(p3Body);
  root.appendChild(panel3);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // -------------------------------------------------------------
  // Test 1: Header Breadcrumb Bar Initial Structure & Click Actions
  // -------------------------------------------------------------
  const breadcrumbBar = dock.breadcrumbBar;
  assert.ok(breadcrumbBar, 'Breadcrumb bar must exist in the dock header');
  assert.strictEqual(breadcrumbBar.getAttribute('aria-label'), 'Workspace Navigation Hierarchy');

  const dockCrumb = breadcrumbBar.querySelector('.breadcrumb-dock');
  const panelCrumb = breadcrumbBar.querySelector('.breadcrumb-panel');
  const sectionCrumb = breadcrumbBar.querySelector('.breadcrumb-section');

  assert.ok(dockCrumb, 'Breadcrumb must have Dock level item');
  assert.ok(panelCrumb, 'Breadcrumb must have Panel level item');
  assert.ok(sectionCrumb, 'Breadcrumb must have Section level item');

  assert.strictEqual(dockCrumb.textContent, 'Dock');
  assert.strictEqual(panelCrumb.textContent, 'Controls');
  assert.strictEqual(sectionCrumb.style.display, 'none', 'Section crumb is hidden when no section is selected');

  // Click panel crumb jumps to panel
  panelCrumb.click();
  assert.strictEqual(dock.activePanelId, 'panel-controls');

  // -------------------------------------------------------------
  // Test 2: Roving Arrow Navigation Between Level 2 Headers
  // -------------------------------------------------------------
  assert.strictEqual(secAHeader.getAttribute('tabindex'), '0');
  assert.strictEqual(secBHeader.getAttribute('tabindex'), '0');
  assert.strictEqual(secAHeader.getAttribute('role'), 'button');

  // Focus on secAHeader
  secAHeader.focus();
  assert.strictEqual(mockDoc.activeElement, secAHeader);

  // ArrowDown roves to secBHeader
  root.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: secAHeader });
  assert.strictEqual(mockDoc.activeElement, secBHeader, 'ArrowDown must rove focus to sibling section header');
  assert.strictEqual(sectionCrumb.style.display, '', 'Breadcrumb section crumb becomes visible');
  assert.strictEqual(sectionCrumb.textContent, 'Camera Presets');

  // ArrowUp roves back to secAHeader
  root.dispatchEvent({ type: 'keydown', key: 'ArrowUp', target: secBHeader });
  assert.strictEqual(mockDoc.activeElement, secAHeader, 'ArrowUp must rove focus back to previous section header');
  assert.strictEqual(sectionCrumb.textContent, 'Primary Angles');

  // End key jumps to last header (secBHeader)
  root.dispatchEvent({ type: 'keydown', key: 'End', target: secAHeader });
  assert.strictEqual(mockDoc.activeElement, secBHeader, 'End key must jump to last section header');

  // Home key jumps to first header (secAHeader)
  root.dispatchEvent({ type: 'keydown', key: 'Home', target: secBHeader });
  assert.strictEqual(mockDoc.activeElement, secAHeader, 'Home key must jump to first section header');

  // -------------------------------------------------------------
  // Test 3: Drill-Down from Section Header into Child Control
  // -------------------------------------------------------------
  // Expand secA
  secA.classList.remove('collapsed');
  secAHeader.classList.add('open');
  secAHeader.setAttribute('aria-expanded', 'true');

  // Press ArrowRight on open header -> drops focus into child sliderInput
  root.dispatchEvent({ type: 'keydown', key: 'ArrowRight', target: secAHeader });
  assert.strictEqual(mockDoc.activeElement, sliderInput, 'ArrowRight on open header must drill down into first control');

  // -------------------------------------------------------------
  // Test 4: The Escape Ladder (Ascending Hierarchical Levels)
  // -------------------------------------------------------------
  // Level 3 (Inside control sliderInput) -> Press Escape -> Ascends to Level 2 (secAHeader)
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(mockDoc.activeElement, secAHeader, 'Escape in child control must ascend to parent section header');

  // Level 2 (Section is open) -> Press Escape -> Collapses section
  let clickTriggered = false;
  secAHeader.addEventListener('click', () => { clickTriggered = true; });
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(clickTriggered, true, 'Escape on open section header must trigger collapse');

  // Simulate section now collapsed
  secA.classList.add('collapsed');
  secAHeader.classList.remove('open');
  secAHeader.setAttribute('aria-expanded', 'false');

  // Level 2 (Section is collapsed) -> Press Escape -> Ascends to Level 1 (p1Header)
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(mockDoc.activeElement, p1Header, 'Escape on collapsed section header must ascend to panel header');

  // Level 1 (On panel header) -> Press Escape -> Ascends to Level 0 (dock title / collapse btn)
  const dockTitleGroup = dock.dockElement.querySelector('.dock-title-group');
  mockDoc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.strictEqual(mockDoc.activeElement, dockTitleGroup, 'Escape on panel header must ascend to dock header');

  // -------------------------------------------------------------
  // Test 5: Global Panel Jump Shortcuts (Alt + 1..9 & Alt + Arrow)
  // -------------------------------------------------------------
  // Alt + 2 -> Jumps to Panel 2 (Derivations)
  mockDoc.dispatchEvent({ type: 'keydown', key: '2', altKey: true });
  assert.strictEqual(dock.activePanelId, 'panel-derivations', 'Alt+2 must jump to derivations panel');
  assert.strictEqual(panelCrumb.textContent, 'Derivations', 'Breadcrumb must reflect jumped panel');
  assert.strictEqual(mockDoc.activeElement, p2Header, 'Header of derivations panel must receive focus');

  // Alt + 3 -> Jumps to Panel 3 (Modes)
  mockDoc.dispatchEvent({ type: 'keydown', key: '3', altKey: true });
  assert.strictEqual(dock.activePanelId, 'panel-modes', 'Alt+3 must jump to modes panel');
  assert.strictEqual(panelCrumb.textContent, 'Modes');

  // Alt + 1 -> Jumps back to Panel 1 (Controls)
  mockDoc.dispatchEvent({ type: 'keydown', key: '1', altKey: true });
  assert.strictEqual(dock.activePanelId, 'panel-controls');
  assert.strictEqual(panelCrumb.textContent, 'Controls');

  // Alt + ArrowDown -> Cycles to next panel (Derivations)
  mockDoc.dispatchEvent({ type: 'keydown', key: 'ArrowDown', altKey: true });
  assert.strictEqual(dock.activePanelId, 'panel-derivations');

  // Alt + ArrowUp -> Cycles to previous panel (Controls)
  mockDoc.dispatchEvent({ type: 'keydown', key: 'ArrowUp', altKey: true });
  assert.strictEqual(dock.activePanelId, 'panel-controls');

  // -------------------------------------------------------------
  // Test 6: Floating Window Focus Cycling (Alt + \)
  // -------------------------------------------------------------
  dock.floatPanel('panel-controls');
  dock.floatPanel('panel-derivations');

  // panel2 was floated last, so it's focused
  assert.strictEqual(panel2.classList.contains('is-focused'), true);
  assert.strictEqual(panel1.classList.contains('is-focused'), false);

  // Press Alt + \ to cycle focus to panel1
  mockDoc.dispatchEvent({ type: 'keydown', key: '\\', altKey: true });
  assert.strictEqual(panel1.classList.contains('is-focused'), true, 'Alt+\\ must cycle focus to next floating window');
  assert.strictEqual(panel2.classList.contains('is-focused'), false);

  // Press Alt + \ again to cycle focus back to panel2
  mockDoc.dispatchEvent({ type: 'keydown', key: '\\', altKey: true });
  assert.strictEqual(panel2.classList.contains('is-focused'), true, 'Alt+\\ must cycle focus back to first floating window');
  assert.strictEqual(panel1.classList.contains('is-focused'), false);

  // Re-dock
  dock.dockPanel('panel-controls');
  dock.dockPanel('panel-derivations');
});

test('WorkspaceDockManager: Zero-Overlap Deck Layout & Responsive Pill Scrolling Contract', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

  // 1. Zero Overlap In-Flow CSS Contracts
  assert.ok(
    css.includes('.panel-elevation-deck'),
    'CSS must define .panel-elevation-deck'
  );
  assert.ok(
    !css.includes('top: 2.25rem !important'),
    'CSS must NOT contain hardcoded top: 2.25rem on elevated subpanels which causes collisions'
  );
  assert.ok(
    css.includes('margin-bottom: 0.4rem !important'),
    'Elevation deck bar must have margin-bottom separating it cleanly from section headers'
  );
  assert.ok(
    css.includes('min-width: 0 !important'),
    'Pills container must have min-width: 0 !important to prevent displacing nav buttons'
  );
  assert.ok(
    css.includes('max-width: 140px !important'),
    'Deck pills must enforce max-width: 140px to prevent awkward horizontal ballooning'
  );
  assert.ok(
    css.includes('text-overflow: ellipsis !important'),
    'Deck pills must use text-overflow: ellipsis for elegant truncation'
  );
  assert.ok(
    css.includes('[data-deck-mode="stack"]'),
    'CSS must define dedicated rules for Stack mode'
  );

  // 2. DOM Multi-Section Expansion & Deck Synchronization
  globalThis.localStorage?.clear?.();
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer');
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'unit-panel');
  const panelHeader = new MockDOMElement('div', 'panel-header');
  const panelTitle = new MockDOMElement('span', 'panel-title');
  panelTitle.textContent = 'Interactive Controls';
  panelHeader.appendChild(panelTitle);
  const panelBody = new MockDOMElement('div', 'panel-body');

  const sec1 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-units');
  const h1 = new MockDOMElement('div', 'collapsible-header');
  h1.textContent = '▶ Unit System Conversion';
  const c1 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec1.appendChild(h1);
  sec1.appendChild(c1);

  const sec2 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-legend');
  const h2 = new MockDOMElement('div', 'collapsible-header');
  h2.textContent = '▶ Geometry Notation Legend';
  const c2 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec2.appendChild(h2);
  sec2.appendChild(c2);

  const sec3 = new MockDOMElement('div', 'collapsible-section collapsed', 'sec-angles');
  const h3 = new MockDOMElement('div', 'collapsible-header');
  h3.textContent = '▶ 2D Angles & Coordinates';
  const c3 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec3.appendChild(h3);
  sec3.appendChild(c3);

  panelBody.appendChild(sec1);
  panelBody.appendChild(sec2);
  panelBody.appendChild(sec3);
  panel.appendChild(panelHeader);
  panel.appendChild(panelBody);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: mockDoc });

  // Open Section 1
  sec1.classList.remove('collapsed');
  c1.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  let deck = panelBody.querySelector('.panel-elevation-deck');
  // Single open section: deck bar should be hidden or inactive
  assert.ok(!deck || deck.style.display === 'none', 'Deck bar should not be active for 1 section');

  // Open Section 2: multi-expand trigger
  sec2.classList.remove('collapsed');
  c2.classList.remove('collapsed');
  dock.syncSubpanelOverlayState();

  deck = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Deck bar must be created on multi-expand');
  assert.strictEqual(deck.style.display, 'grid', 'Deck bar must keep its navigation rows visible');

  const pills = deck.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 2, 'Must have 2 pills for 2 open sections');
  assert.strictEqual(pills[0].title, 'Bring "Unit System Conversion" to top elevation');
  assert.strictEqual(pills[1].title, 'Bring "Geometry Notation Legend" to top elevation');

  // Mode Toggle to Stack
  const toggleBtn = deck.querySelector('.elevation-deck-mode-toggle');
  assert.ok(toggleBtn, 'Mode toggle button must exist');
  toggleBtn.click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'stack');
  assert.strictEqual(sec1.classList.contains('is-in-deck'), false);
  assert.strictEqual(sec2.classList.contains('is-in-deck'), false);

  // Mode Toggle to Accordion
  const accordionToggle = deck.querySelector('.elevation-deck-mode-toggle');
  accordionToggle.click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'accordion');
  assert.strictEqual(sec1.classList.contains('is-in-deck'), false);
  assert.strictEqual(sec2.classList.contains('is-in-deck'), false);

  // Mode Toggle back to Tabs / Deck
  const updatedToggle = deck.querySelector('.elevation-deck-mode-toggle');
  updatedToggle.click();
  assert.ok(
    panelBody.getAttribute('data-deck-mode') === 'tabs' || panelBody.getAttribute('data-deck-mode') === 'deck',
    'Must cycle back to tabs/deck mode'
  );
  assert.strictEqual(sec2.classList.contains('is-in-deck'), true);
});

test('WorkspaceDockManager: Top/Bottom Expand All, Elevation Wheel Scrolling, Dock Height Adjustment & Responsive Reflow Pipeline', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

  // 1. Verify Responsive Reflow & Non-Dead-Space CSS Contracts
  assert.ok(css.includes('flex-wrap: wrap !important'), 'Top/bottom dock body must flex-wrap to reflow panels across viewports');
  assert.ok(css.includes('flex: 1 1 320px !important'), 'Panels must use flex: 1 1 320px to grow and eliminate dead space');
  assert.ok(css.includes('min-width: 280px !important'), 'Panels must enforce min-width: 280px');
  assert.ok(css.includes('max-width: 620px !important'), 'Panels must enforce max-width: 620px on standard screens');
  assert.ok(css.includes('container: workspace-dock / inline-size;'), 'The dock body must be the size container its docked panels reflow against');
  assert.ok(css.includes('@container workspace-dock (max-width: 40rem)'), 'Docked panels must reflow by the dock width, not the viewport width');
  assert.ok(!css.includes('@media (max-width: 768px)'), 'Docked panel reflow must not be driven by the viewport width');
  assert.ok(css.includes('flex: 1 1 100% !important'), 'Panels in a narrow dock must reflow to full 100% width');
  assert.ok(css.includes('@container workspace-dock (min-width: 84rem)'), 'CSS must define a wide-dock breakpoint for docked panels');
  assert.ok(css.includes('max-width: 720px !important'), 'Panels in a wide dock can expand up to 720px to eliminate dead space');

  // 2. Setup mock DOM with Top Dock and multi-section panel with expand button
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
  };
  mockDoc.defaultView = mockWin;

  const root = mockDoc.createElement('div');
  root.className = 'circle-explorer';
  mockDoc.body.appendChild(root);

  const panel = mockDoc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'panel-controls';

  const panelHeader = mockDoc.createElement('div');
  panelHeader.className = 'panel-header';

  const expandBtn = mockDoc.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'panel-expand-btn';
  expandBtn.id = 'controls-expand';
  expandBtn.setAttribute('aria-expanded', 'false');
  expandBtn.innerHTML = '<span class="panel-expand-label">Expand All</span>';
  panelHeader.appendChild(expandBtn);
  panel.appendChild(panelHeader);

  const panelBody = mockDoc.createElement('div');
  panelBody.className = 'panel-body';

  const sec1 = mockDoc.createElement('div');
  sec1.className = 'collapsible-section collapsed';
  const h1 = mockDoc.createElement('div');
  h1.className = 'collapsible-header';
  h1.textContent = 'Section Alpha';
  const c1 = mockDoc.createElement('div');
  c1.className = 'collapsible-content collapsed';
  c1.textContent = 'Content Alpha';
  sec1.appendChild(h1);
  sec1.appendChild(c1);

  const sec2 = mockDoc.createElement('div');
  sec2.className = 'collapsible-section collapsed';
  const h2 = mockDoc.createElement('div');
  h2.className = 'collapsible-header';
  h2.textContent = 'Section Beta';
  const c2 = mockDoc.createElement('div');
  c2.className = 'collapsible-content collapsed';
  c2.textContent = 'Content Beta';
  sec2.appendChild(h2);
  sec2.appendChild(c2);

  const sec3 = mockDoc.createElement('div');
  sec3.className = 'collapsible-section collapsed';
  const h3 = mockDoc.createElement('div');
  h3.className = 'collapsible-header';
  h3.textContent = 'Section Gamma';
  const c3 = mockDoc.createElement('div');
  c3.className = 'collapsible-content collapsed';
  c3.textContent = 'Content Gamma';
  sec3.appendChild(h3);
  sec3.appendChild(c3);

  panelBody.appendChild(sec1);
  panelBody.appendChild(sec2);
  panelBody.appendChild(sec3);
  panel.appendChild(panelBody);
  root.appendChild(panel);

  initCollapsibleSections(root);
  const dock = new WorkspaceDockManager(root, { document: mockDoc });
  dock.setDockEdge('top');

  // Test 2A: Expand All click functionality in top dock mode
  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'false');
  expandBtn.click();

  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'true', 'Clicking expandBtn must set aria-expanded="true"');
  assert.strictEqual(sec1.classList.contains('collapsed'), false, 'Section 1 must not be collapsed');
  assert.strictEqual(sec2.classList.contains('collapsed'), false, 'Section 2 must not be collapsed');
  assert.strictEqual(sec3.classList.contains('collapsed'), false, 'Section 3 must not be collapsed');
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), true);
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), true);

  const deckEl = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deckEl, 'Elevation deck must be generated when Expand All is activated');
  assert.strictEqual(deckEl.style.display, 'grid');

  // Verify pills generated
  const pills = deckEl.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 3, 'Deck must have 3 pills for 3 sections');

  // Initial active turn is Section 1
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(sec3.getAttribute('data-elevation-turn'), 'deck');

  // Test 2B: Elevation Subpanel Mouse Wheel Scrolling
  // Dispatch wheel down on deckEl -> advances turn to Section 2
  deckEl.dispatchEvent({ type: 'wheel', deltaY: 100 });
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'top', 'Wheel down on deck must advance turn to Section 2');
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'deck');

  // Dispatch wheel up on deckEl -> retreats turn back to Section 1
  deckEl._lastWheelTime = 0; // reset throttle for instant test
  deckEl.dispatchEvent({ type: 'wheel', deltaY: -100 });
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top', 'Wheel up on deck must retreat turn to Section 1');
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'deck');

  // Test 2C: Card content wheel strictly scrolls text and does not hijack turn
  c1._lastTurnTime = 0;
  c1.dispatchEvent({ type: 'wheel', deltaY: 50 });
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top', 'Wheel inside card content must not hijack turn (strictly restricted to elevation deck)');

  // Test 2D: Touch swipe navigation on deck
  deckEl.dispatchEvent({ type: 'touchstart', touches: [{ clientX: 150, clientY: 20 }] });
  deckEl.dispatchEvent({ type: 'touchend', changedTouches: [{ clientX: 50, clientY: 20 }] });
  assert.strictEqual(sec2.getAttribute('data-elevation-turn'), 'top', 'Swipe left on deck must advance turn to Section 2');

  deckEl.dispatchEvent({ type: 'touchstart', touches: [{ clientX: 150, clientY: 20 }] });
  deckEl.dispatchEvent({ type: 'touchend', changedTouches: [{ clientX: 50, clientY: 20 }] });
  assert.strictEqual(sec3.getAttribute('data-elevation-turn'), 'top', 'Second swipe left on deck must advance turn to Section 3');

  // Test 2E: Collapse All click functionality
  expandBtn.click();
  assert.strictEqual(expandBtn.getAttribute('aria-expanded'), 'false', 'Clicking expandBtn again must set aria-expanded="false"');
  assert.strictEqual(sec1.classList.contains('collapsed'), true);
  assert.strictEqual(sec2.classList.contains('collapsed'), true);
  assert.strictEqual(sec3.classList.contains('collapsed'), true);
  assert.strictEqual(panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(panelBody.classList.contains('is-all-expanded'), false);
  assert.strictEqual(deckEl.style.display, 'none');

  // Test 3: Parent Dock Height Resizer Adjustment in Top Dock Mode
  const resizer = dock.dockResizer;
  assert.ok(resizer, 'Dock resizer divider must exist');

  // Drag resizer downwards to increase dock height by 120px
  resizer.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 200, clientY: 340, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 200, clientY: 460 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 2 });

  assert.strictEqual(dock.dockSizeHorizontal, 460, 'Top dock height must adjust smoothly from resizer drag');
  assert.strictEqual(dock.dockElement.style.height, '460px', 'dockElement inline height must reflect adjusted height');
  assert.strictEqual(dock.dockElement.style.getPropertyValue('--dock-size'), '460px');
});

test('WorkspaceDockManager: Tear-Off Drag From Dock & Smart Floating Placement Pipeline', () => {
  globalThis.localStorage?.clear?.();
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

  // Verify CSS touch-action and grab cursor guarantees
  assert.ok(css.includes('.panel-header {\n  display: flex !important;\n  justify-content: space-between !important;\n  align-items: center !important;\n  min-width: 0 !important;\n  gap: 0.5rem !important;\n  touch-action: none !important;'), 'panel-header must enforce touch-action: none');
  assert.ok(css.includes('.workspace-dock-body > .ui-panel .panel-header {\n  flex-shrink: 0 !important;\n  min-height: 40px !important;\n  width: 100% !important;\n  display: flex !important;\n  align-items: center !important;\n  box-sizing: border-box !important;\n  visibility: visible !important;\n  opacity: 1 !important;\n  cursor: grab;\n  touch-action: none !important;'), 'docked panel-header must have cursor: grab and touch-action: none');

  // Verify mobile floating panel rule allows absolute positioning
  assert.ok(css.includes('.ui-panel.is-floating {\n    position: absolute !important;'), 'Mobile floating panel must remain position: absolute to allow dragging');

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
    dispatchEvent(ev) {
      const handlers = this.listeners.get(ev.type) || [];
      handlers.forEach((h) => h(ev));
    },
  };
  mockDoc.defaultView = mockWin;
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'tearoff-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  header.textContent = 'Trigonometry Inspector';
  panel.appendChild(header);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { win: mockWin, doc: mockDoc });

  const record = dock.panels.get('tearoff-panel');
  assert.strictEqual(record.isFloating, false, 'Panel starts docked in dockBody');
  assert.strictEqual(panel.parentElement, dock.dockBody);

  // Test 1: Smart Float Placement clears the left dock
  dock.floatPanel('tearoff-panel');
  assert.strictEqual(record.isFloating, true);
  assert.strictEqual(panel.parentElement, dock.floatingLayer);
  const floatLeft = parseFloat(panel.style.left);
  assert.ok(floatLeft >= dock.dockSize + 24, `Floating panel must be placed clear of the 380px dock (actual: ${floatLeft}px)`);

  // Dock back
  dock.dockPanel('tearoff-panel');
  assert.strictEqual(record.isFloating, false);
  assert.strictEqual(panel.parentElement, dock.dockBody);

  // Test 2: Tear-Off Drag from Docked state
  // Start pointerdown on docked panel header at clientX: 50, clientY: 80
  header.dispatchEvent({ type: 'pointerdown', pointerId: 10, clientX: 50, clientY: 80, target: header, preventDefault: () => {} });
  assert.strictEqual(record.isFloating, false, 'Tear-off has not triggered before exceeding drag threshold');

  // Move by 30px (exceeds 6px threshold) -> Automatically detaches and floats
  mockWin.dispatchEvent({ type: 'pointermove', pointerId: 10, clientX: 450, clientY: 180 });
  assert.strictEqual(record.isFloating, true, 'Moving docked header by >=6px must tear off and float panel');
  assert.strictEqual(panel.parentElement, dock.floatingLayer, 'Torn-off panel must move to floatingLayer');

  // Complete drag
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 10 });
  assert.strictEqual(record.isFloating, true, 'Panel remains floating after release');
  assert.ok(parseFloat(panel.style.left) > 0, 'Panel left coordinate must be set');
  assert.ok(parseFloat(panel.style.top) > 0, 'Panel top coordinate must be set');
});

test('WorkspaceDockManager: Subpanel Cycling without Requiring Prior Expansion Contract', () => {
  const mockWin = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  };
  const mockDoc = {
    createElement: (tag) => new MockDOMElement(tag),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (type, fn) => {
      mockDoc._listeners = mockDoc._listeners || {};
      mockDoc._listeners[type] = fn;
    },
    removeEventListener: () => {},
    dispatchEvent: (e) => {
      if (mockDoc._listeners && mockDoc._listeners[e.type]) {
        mockDoc._listeners[e.type](e);
      }
    },
    body: new MockDOMElement('body'),
  };
  mockDoc.defaultView = mockWin;
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'cycle-panel');
  panel.ownerDocument = mockDoc;
  const header = new MockDOMElement('div', 'panel-header');
  header.textContent = 'Derivations & Proofs';
  panel.appendChild(header);

  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(body);

  const sec1 = new MockDOMElement('div', 'collapsible-section collapsed');
  const h1 = new MockDOMElement('button', 'collapsible-header');
  h1.textContent = 'Step 1: Invariant Analysis';
  const c1 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec1.appendChild(h1);
  sec1.appendChild(c1);
  body.appendChild(sec1);

  const sec2 = new MockDOMElement('div', 'collapsible-section collapsed');
  const h2 = new MockDOMElement('button', 'collapsible-header');
  h2.textContent = 'Step 2: Geometric Rigour';
  const c2 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec2.appendChild(h2);
  sec2.appendChild(c2);
  body.appendChild(sec2);

  const sec3 = new MockDOMElement('div', 'collapsible-section collapsed');
  const h3 = new MockDOMElement('button', 'collapsible-header');
  h3.textContent = 'Step 3: Axiomatic Conclusion';
  const c3 = new MockDOMElement('div', 'collapsible-content collapsed');
  sec3.appendChild(h3);
  sec3.appendChild(c3);
  body.appendChild(sec3);

  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { win: mockWin, doc: mockDoc });

  // 1. Initially: panel is completely shaded and all 3 sections are collapsed
  dock.setPanelShaded('cycle-panel', true);
  assert.strictEqual(panel.classList.contains('is-shaded'), true, 'Panel starts shaded');
  assert.strictEqual(sec1.classList.contains('collapsed'), true);
  assert.strictEqual(sec2.classList.contains('collapsed'), true);
  assert.strictEqual(sec3.classList.contains('collapsed'), true);

  // 2. Press ']' (or cycle forward) WITHOUT having to manually expand the panel first
  mockDoc.dispatchEvent({ type: 'keydown', key: ']' });

  // Verify panel is automatically un-shaded and step 1 is opened
  assert.strictEqual(panel.classList.contains('is-shaded'), false, 'Cycling automatically un-shades the panel');
  assert.strictEqual(sec1.classList.contains('collapsed'), false, 'Step 1 is now expanded');

  // 3. Press ']' again: cycle to step 2 without prior manual expansion
  mockDoc.dispatchEvent({ type: 'keydown', key: ']' });
  assert.strictEqual(sec2.classList.contains('collapsed'), false, 'Step 2 is now expanded');

  // 4. Test programmatic cyclePanelSubpanel backward
  cyclePanelSubpanel(panel, 'backward');
  assert.strictEqual(sec1.getAttribute('data-elevation-turn'), 'top', 'Step 1 elevated to top');

  // 5. Wrap around backward from step 1 to step 3
  cyclePanelSubpanel(panel, 'backward');
  assert.strictEqual(sec3.getAttribute('data-elevation-turn'), 'top', 'Step 3 elevated to top after wrapping backward');
  assert.strictEqual(sec3.classList.contains('collapsed'), false, 'Step 3 is expanded');
});

test('WorkspaceDockManager: 4 Radical Usability Simplifications Pipeline', () => {
  const mockDoc = new MockDocument();
  const mockWin = {
    innerWidth: 1024,
    innerHeight: 768,
    document: mockDoc,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  };
  mockDoc.defaultView = mockWin;
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  // 1. Automatic Horizontal Scroll on Top/Bottom Docks
  const dock = new WorkspaceDockManager(root, { win: mockWin, doc: mockDoc });
  dock.dockEdge = 'top';
  dock.dockBody.scrollLeft = 0;

  // Dispatch vertical mouse wheel on dock body -> directly increments scrollLeft
  dock.dockBody.dispatchEvent({
    type: 'wheel',
    deltaY: 150,
    deltaX: 0,
    preventDefault: () => {},
  });
  assert.strictEqual(dock.dockBody.scrollLeft, 150, 'Vertical wheel deltaY on top dock maps to horizontal scrollLeft');

  // Reverse wheel on dock body
  dock.dockBody.dispatchEvent({
    type: 'wheel',
    deltaY: -50,
    deltaX: 0,
    preventDefault: () => {},
  });
  assert.strictEqual(dock.dockBody.scrollLeft, 100, 'Reverse wheel deltaY decreases scrollLeft');

  // 2. Stop Hijacking Wheel Events Inside Content Cards
  const panel = new MockDOMElement('div', 'ui-panel', 'deriv-panel');
  panel.ownerDocument = mockDoc;
  const panelHeader = new MockDOMElement('div', 'panel-header');
  panel.appendChild(panelHeader);

  const panelBody = new MockDOMElement('div', 'panel-body');
  panel.appendChild(panelBody);

  // Add 2 derivation cards (both initially expanded in multi-step view)
  const card1 = new MockDOMElement('div', 'derivation-card open', 'step-1-card');
  const h1 = new MockDOMElement('div', 'derivation-card-header collapsible-header open');
  const c1 = new MockDOMElement('div', 'derivation-card-content collapsible-content open');
  card1.appendChild(h1);
  card1.appendChild(c1);

  const card2 = new MockDOMElement('div', 'derivation-card open', 'step-2-card');
  const h2 = new MockDOMElement('div', 'derivation-card-header collapsible-header open');
  const c2 = new MockDOMElement('div', 'derivation-card-content collapsible-content open');
  card2.appendChild(h2);
  card2.appendChild(c2);

  panelBody.appendChild(card1);
  panelBody.appendChild(card2);
  root.appendChild(panel);

  syncPanelElevationTurn(panel, card1);
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'deck');

  // Dispatch wheel on c1 (card content): MUST NOT flip or hijack card
  c1.dispatchEvent({ type: 'wheel', deltaY: 200 });
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'top', 'Wheel inside card content strictly scrolls text and does not hijack turn');
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'deck');

  // 3. Obvious Visual Navigation Buttons in the Deck Bar (the panel's only step navigation)
  const deckEl = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deckEl, 'Elevation deck pill bar exists');
  deckEl.querySelector('.elevation-deck-nav-btn.next').click();
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'top', 'Clicking the deck Next button advances to Card 2');
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'deck');

  deckEl.querySelector('.elevation-deck-nav-btn.prev').click();
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'top', 'Clicking the deck Prev button retreats back to Card 1');
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'deck');

  // 4. Self-Explanatory Mode Toggle Labels & Stack Unrolling
  const modeBtn = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.ok(modeBtn, 'Mode toggle button exists');
  assert.strictEqual(modeBtn.textContent, 'Focus Step');
  assert.ok(modeBtn.title.includes('Focus Step mode'));

  // Switch to Scroll All (Stack)
  modeBtn.click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'stack');
  const modeBtnStack = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.strictEqual(modeBtnStack.textContent, 'Scroll All');
  assert.ok(modeBtnStack.title.includes('Scroll All mode'));
  // In stack mode, all cards are unrolled
  assert.strictEqual(card1.classList.contains('is-in-deck'), false);
  assert.strictEqual(card2.classList.contains('is-in-deck'), false);

  // Switch to Accordion
  modeBtnStack.click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'accordion');
  const modeBtnAccordion = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.strictEqual(modeBtnAccordion.textContent, 'Accordion');

  // Switch back to Focus Step (Tabs / Deck)
  modeBtnAccordion.click();
  assert.ok(
    panelBody.getAttribute('data-deck-mode') === 'tabs' || panelBody.getAttribute('data-deck-mode') === 'deck'
  );
  const modeBtnDeck = deckEl.querySelector('.elevation-deck-mode-toggle');
  assert.strictEqual(modeBtnDeck.textContent, 'Focus Step');
});
test('WorkspaceDockManager: Derivation Deck Is the Only Step Navigation Panel', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Zero vertical clipping contract on derivation cards & collapsible sections
  assert.ok(
    css.includes('.panel-body .derivation-card,\r\n.panel-body .collapsible-section {\r\n  min-width: 0 !important;\r\n  max-width: 100% !important;\r\n  overflow-x: auto !important;\r\n  overflow-y: visible !important;\r\n}') ||
    css.includes('.panel-body .derivation-card,\n.panel-body .collapsible-section {\n  min-width: 0 !important;\n  max-width: 100% !important;\n  overflow-x: auto !important;\n  overflow-y: visible !important;\n}'),
    'Derivation cards and collapsible sections must enforce overflow-y: visible !important to eliminate vertical clipping'
  );

  // 2. Sticky elevation deck bar contract
  assert.ok(
    css.includes('position: sticky !important;\r\n  top: 0 !important;\r\n  flex-shrink: 0 !important;') ||
    css.includes('position: sticky !important;\n  top: 0 !important;\n  flex-shrink: 0 !important;'),
    'Elevation deck bar must be position: sticky !important with top: 0 to remain visible during scroll'
  );

  // The deck is the only step-navigation control surface.
  assert.ok(!css.includes('.card-step-nav-bar'), 'Obsolete content navigation styling must be removed');
  assert.ok(!css.includes('.btn-card-nav-quick'), 'Per-card step navigation styling must be removed');

  // 4. Instant turnstile deck for derivations panel without requiring 2 open subpanels
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const derivPanel = new MockDOMElement('div', 'ui-panel', 'derivations-panel');
  derivPanel.ownerDocument = mockDoc;
  const panelHeader = new MockDOMElement('div', 'panel-header');
  derivPanel.appendChild(panelHeader);

  const panelBody = new MockDOMElement('div', 'panel-body');
  derivPanel.appendChild(panelBody);

  const card1 = new MockDOMElement('div', 'derivation-card open', 'aac-step-1');
  const h1 = new MockDOMElement('div', 'derivation-card-header collapsible-header open');
  const c1 = new MockDOMElement('div', 'derivation-card-content collapsible-content open');
  card1.appendChild(h1);
  card1.appendChild(c1);

  const card2 = new MockDOMElement('div', 'derivation-card', 'aac-step-2');
  const h2 = new MockDOMElement('div', 'derivation-card-header collapsible-header');
  const c2 = new MockDOMElement('div', 'derivation-card-content collapsible-content');
  card2.appendChild(h2);
  card2.appendChild(c2);

  const card3 = new MockDOMElement('div', 'derivation-card', 'aac-step-3');
  const h3 = new MockDOMElement('div', 'derivation-card-header collapsible-header');
  const c3 = new MockDOMElement('div', 'derivation-card-content collapsible-content');
  card3.appendChild(h3);
  card3.appendChild(c3);

  panelBody.appendChild(card1);
  panelBody.appendChild(card2);
  panelBody.appendChild(card3);
  root.appendChild(derivPanel);

  initCollapsibleSections(root);
  setSubpanelOpen(card1, true);

  // Only 1 card is open (card1), but because it is a derivation panel, forceDeck ensures turnstile deck is immediately active
  syncPanelElevationTurn(derivPanel, card1);
  const deck = panelBody.querySelector('.panel-elevation-deck');
  assert.ok(deck, 'Header arrows must not suppress the elevation deck');
  assert.strictEqual(deck.style.display, 'grid', 'Deck remains available with a single open step');
  assert.equal(panelBody.classList.contains('is-all-expanded'), true, 'An active deck must not enter the top/bottom lone-card overlay layout');
  assert.strictEqual(deck.querySelectorAll('.elevation-deck-pill').length, 3, 'All steps remain directly selectable');
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'deck');
  assert.strictEqual(card3.getAttribute('data-elevation-turn'), 'deck');

  // 5. Deck arrows and pills control step navigation.
  deck.querySelector('.elevation-deck-nav-btn.next').click();
  assert.strictEqual(card2.getAttribute('data-elevation-turn'), 'top', 'Top nav Next button cycles turn to Step 2');
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'deck');
  cyclePanelSubpanel(derivPanel, 'backward');
  assert.strictEqual(card1.getAttribute('data-elevation-turn'), 'top', 'Keyboard cycling must still work alongside the deck');
  deck.querySelectorAll('.elevation-deck-pill')[2].click();
  assert.strictEqual(card3.getAttribute('data-elevation-turn'), 'top', 'Deck selection must reach a non-adjacent step');
  deck.querySelector('.elevation-deck-mode-toggle').click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'stack', 'Scroll All mode must remain available');
  assert.ok([card1, card2, card3].every((card) => !card.classList.contains('is-in-deck')), 'Scroll All must expose all steps');
  deck.querySelector('.elevation-deck-mode-toggle').click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'accordion', 'Accordion mode must remain available');
  deck.querySelector('.elevation-deck-mode-toggle').click();
  assert.strictEqual(panelBody.getAttribute('data-deck-mode'), 'tabs', 'Focus Step mode must remain available');
  assert.strictEqual([card1, card2, card3].filter((card) => card.classList.contains('open')).length, 1, 'Focus Step must select exactly one step');
  for (const relativePath of [
    'js/circle-derivations.js',
    'visuals/circle-theorems/thales-theorem/src/views/DerivationView.js',
  ]) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    assert.strictEqual((source.match(/data-card-nav=/g) || []).length, 0, 'Card templates must not emit duplicate step controls');
    assert.ok(!source.includes('btn-card-nav-quick'), 'Card headers must not contain step navigation buttons');
    assert.ok(!source.includes('card-step-nav-bar') && !source.includes('derivation-card-footer'), 'Card content must not repeat header navigation');
  }
});
test('WorkspaceDockManager: Collapsed Headers Form Shelves with Groove Spacing Between Them', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

  const start = css.indexOf('Collapsed Header Shelves with Recessed Spacing');
  assert.ok(start !== -1, 'Shelf spacing block must exist in workspace-dock.css');
  const block = css.slice(start);

  // 1. Scoped strictly to collapsed headers inside parent containers
  assert.ok(block.includes('.panel-body .collapsible-section.collapsed > .collapsible-header'), 'Collapsed collapsible headers inside .panel-body must be targeted');
  assert.ok(block.includes('.panel-body .derivation-card:not(.open) > .derivation-card-header:not(.open)'), 'Collapsed derivation card headers inside .panel-body must be targeted');
  const shadedSelector = '.workspace-dock-body > .ui-panel:is(.is-shaded, :has(> .panel-content > .panel-body.hidden), :has(> .panel-body.hidden))';
  assert.ok(block.includes(`${shadedSelector} .panel-header`), 'Shaded and hidden-body docked panel headers must be targeted');

  const rules = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const grooveRule = rules.find(([, , declarations]) => declarations.includes('padding-block-end:'));
  assert.ok(grooveRule, 'Recessed separation must be real container padding');
  assert.ok(grooveRule[1].includes('.panel-body .collapsible-section.collapsed'), 'Collapsed section containers provide grooves');
  assert.ok(grooveRule[1].includes('.derivation-card:not(.open):not(:has(> .derivation-card-header.open))'), 'Both card open-state conventions must exclude groove padding');
  assert.ok(grooveRule[1].includes(shadedSelector), 'Shaded docked containers provide grooves');
  assert.ok(!grooveRule[1].includes('> .collapsible-header'), 'Groove padding must not be applied to header faces');
  assert.ok(grooveRule[2].includes('padding-block-end: 3px !important'), 'Groove padding must be 3px');
  assert.ok(grooveRule[2].includes('background: #020617 !important'), 'Inter-shelf padding must have a recessed dark background');
  assert.ok(!block.includes('gradient('), 'Shelves must not have fluted or grooved surface textures');
  assert.ok(!block.includes('--slat-'), 'Machined-face accents must not remain');
  for (const header of [
    '.panel-body .collapsible-section.collapsed > .collapsible-header',
    '.panel-body .derivation-card:not(.open) > .derivation-card-header:not(.open)',
    `${shadedSelector} .panel-header`,
  ]) {
    for (const state of [':hover', ':focus-visible']) {
      assert.ok(block.includes(`${header}${state}`), `Collapsed header requires ${state} feedback`);
    }
  }
  const circleCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');
  assert.ok(!circleCss.includes('--slat-'), 'Base circle headers must not reintroduce the removed face texture');

  // 3. Zero regression: no layout/interaction properties are overridden on headers
  for (const [, selector, declarations] of rules.filter(([, selector]) => selector.includes('.panel-header') || selector.includes('> .collapsible-header') || selector.includes('> .derivation-card-header:not(.open)'))) {
    for (const prop of ['display:', 'padding:', 'padding-block-end:', 'cursor:', 'pointer-events:', 'touch-action:', 'position:', 'height:']) {
      assert.ok(!declarations.includes(prop), `Header rule "${selector.trim()}" must not override "${prop}"`);
    }
  }

  // 4. Open/expanded states are never styled as slats
  assert.ok(!block.includes('.collapsible-section:not(.collapsed) > .collapsible-header'), 'Expanded sections must not receive slat styling');

  // 5. Accessibility fallbacks
  assert.ok(!block.includes('transition:'), 'Shelf spacing must not introduce motion');
  assert.ok(block.includes('@media (forced-colors: active)'), 'Forced-colors (High Contrast) fallback required');
  assert.ok(block.includes('outline-color: Highlight !important'), 'High Contrast must retain a visible system focus outline');
  assert.ok(block.includes('border-color: CanvasText !important'), 'High Contrast must preserve collapsed slat boundaries');
  assert.ok(css.includes('.collapsible-header:focus-visible'), 'Existing keyboard focus outline must remain');

  // 6. Behaviour unchanged: collapsed header click still toggles via dock manager
  const mockDoc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);
  const panel = new MockDOMElement('div', 'ui-panel', 'controls-panel');
  panel.ownerDocument = mockDoc;
  panel.appendChild(new MockDOMElement('div', 'panel-header'));
  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(body);
  const sec = new MockDOMElement('div', 'collapsible-section collapsed', 'slat-sec');
  const hdr = new MockDOMElement('div', 'collapsible-header');
  const cnt = new MockDOMElement('div', 'collapsible-content collapsed');
  sec.appendChild(hdr);
  sec.appendChild(cnt);
  body.appendChild(sec);
  root.appendChild(panel);

  setSubpanelOpen(sec, true);
  assert.strictEqual(sec.classList.contains('collapsed'), false, 'Collapsed shelf section must still expand');
  assert.strictEqual(hdr.getAttribute('aria-expanded'), 'true');
  setSubpanelOpen(sec, false);
  assert.strictEqual(sec.classList.contains('collapsed'), true, 'Section must collapse back into a shelf');
  assert.strictEqual(hdr.getAttribute('aria-expanded'), 'false');
});

test('WorkspaceDockManager: Default Elevation Turn-Taking, Re-dock Resync & Accordion Cursor Navigation', async () => {
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    css.includes('.workspace-dock-body > .ui-panel .panel-header .panel-expand-btn {\n  display: none !important;\n}'),
    'Expand All must be hidden only for docked panels, which navigate through the deck'
  );
  assert.ok(
    css.includes('.panel-body[data-deck-mode] .collapsible-section,\n.panel-body[data-deck-mode] .derivation-card {\n  scroll-margin-top: 3.75rem;\n}'),
    'Sections revealed by deck navigation must clear the sticky deck bar'
  );

  const doc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = doc;
  doc.body.appendChild(root);

  const reveals = [];
  const makeSub = (kind, id, title) => {
    const isCard = kind === 'card';
    const sub = new MockDOMElement('div', isCard ? 'derivation-card' : 'collapsible-section', id);
    const subHeader = new MockDOMElement('div', isCard ? 'derivation-card-header' : 'collapsible-header');
    subHeader.textContent = title;
    sub.appendChild(subHeader);
    sub.appendChild(new MockDOMElement('div', isCard ? 'derivation-card-content' : 'collapsible-content'));
    sub.scrollIntoView = () => reveals.push(id);
    return sub;
  };
  const makePanel = (id, subs, parent = root) => {
    const panel = new MockDOMElement('div', 'ui-panel', id);
    panel.ownerDocument = parent.ownerDocument;
    panel.appendChild(new MockDOMElement('div', 'panel-header'));
    const body = new MockDOMElement('div', 'panel-body');
    subs.forEach((sub) => body.appendChild(sub));
    panel.appendChild(body);
    parent.appendChild(panel);
    return { panel, body, subs };
  };

  const controls = makePanel('controls-panel', [
    makeSub('section', 'geom', 'Geometry Parameters'),
    makeSub('section', 'units', 'Unit System Conversion'),
    makeSub('section', 'conic', 'Affine Conic Mode'),
  ]);
  const toolbar = makePanel('toolbar-2d-panel', [
    makeSub('section', 'measure', 'Measurements'),
    makeSub('section', 'grid', 'Grid'),
    makeSub('section', 'labels', 'Labels'),
  ]);
  const derivs = makePanel('derivations-panel', [
    makeSub('card', 'step-1', 'Step 1'),
    makeSub('card', 'step-2', 'Step 2'),
    makeSub('card', 'step-3', 'Step 3'),
  ]);
  const [geom, units, conic] = controls.subs;
  const [measure, grid, labels] = toolbar.subs;

  const header = (sub) => sub.querySelector('.collapsible-header, .derivation-card-header');
  const deckOf = (p) => p.body.querySelector('.panel-elevation-deck');
  const deckHidden = (p) => !deckOf(p) || deckOf(p).style.display === 'none';
  const label = (p) => deckOf(p).querySelector('.elevation-deck-label').textContent;
  const pills = (p) => deckOf(p).querySelectorAll('.elevation-deck-pill');
  const star = (p) => pills(p).findIndex((pill) => pill.textContent.endsWith('★'));
  const deckButton = (p, selector) => deckOf(p).querySelector(selector);
  const turns = (p) => p.subs.map((s) => s.getAttribute('data-elevation-turn'));
  const isOpen = (sub) => (sub.classList.contains('collapsible-section') ? !sub.classList.contains('collapsed') : sub.classList.contains('open'));
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  initCollapsibleSections(root);
  const dock = new WorkspaceDockManager(root);

  // 1. Turn-taking is the default: docked sections start collapsed, and once a second section opens
  //    one section holds the top turn while the others are parked behind the deck.
  assert.strictEqual(controls.body.hasAttribute('data-deck-mode'), false, 'No other deck mode may be imposed by default');
  assert.strictEqual(dock.getPanelDeckMode('controls-panel'), 'deck');
  assert.ok(controls.subs.every((s) => !isOpen(s)), 'Docked sections start collapsed');
  assert.ok(deckHidden(controls), 'No deck while nothing is open');

  header(geom).click();
  assert.ok(deckHidden(controls), 'A single open section needs no turn-taking');
  header(units).click();
  assert.strictEqual(deckOf(controls).style.display, 'grid', 'A second open section engages turn-taking');
  assert.strictEqual(label(controls), 'Deck (2/2)');
  assert.deepStrictEqual(pills(controls).map((pill) => pill.textContent), ['1. Geometry Parameters', '2. Unit System Conversion ★']);
  assert.deepStrictEqual(turns(controls), ['deck', 'top', null], 'The last opened section takes the top turn');
  assert.ok(units.classList.contains('is-elevated-top'));
  assert.ok(geom.classList.contains('is-in-deck'), 'The other open section waits in the deck');
  assert.ok(!conic.classList.contains('is-in-deck'), 'A closed section the pills do not list stays on its shelf');

  doc.dispatchEvent({ type: 'keydown', key: ']' });
  assert.deepStrictEqual(turns(controls), ['deck', 'deck', 'top'], '] passes the turn on, opening the next section');
  assert.ok(isOpen(conic) && conic.classList.contains('slide-forward'));
  assert.strictEqual(label(controls), 'Deck (3/3)');
  deckButton(controls, '.elevation-deck-nav-btn.prev').click();
  assert.deepStrictEqual(turns(controls), ['deck', 'top', 'deck'], '◀ hands the turn back');
  assert.ok(units.classList.contains('slide-backward'));
  assert.deepStrictEqual(reveals, [], 'Deck mode parks sections instead of scrolling to them');

  assert.strictEqual(deckOf(derivs).style.display, 'grid', 'Derivation steps take turns even with one step open');
  assert.strictEqual(label(derivs), 'Deck (1/3)');
  assert.deepStrictEqual(turns(derivs), ['top', null, null]);
  assert.deepStrictEqual(derivs.subs.map(isOpen), [false, false, false], 'Derivation steps start collapsed by default as shelves');

  // 2. Re-docking resyncs the panel's own deck instead of reporting the sections it just collapsed.
  dock.floatPanel('toolbar-2d-panel');
  header(measure).click();
  header(grid).click();
  assert.strictEqual(label(toolbar), 'Deck (2/2)');
  assert.ok(toolbar.panel.classList.contains('has-expanded-subpanel') && toolbar.body.classList.contains('is-all-expanded'));

  dock.dockPanel('toolbar-2d-panel');
  assert.strictEqual(toolbar.panel.parentElement, dock.dockBody);
  assert.ok(toolbar.subs.every((s) => !isOpen(s)), 'Re-docked sections return collapsed');
  assert.ok(deckHidden(toolbar), 'A stale deck must not survive re-docking');
  assert.deepStrictEqual(turns(toolbar), [null, null, null]);
  assert.ok(toolbar.subs.every((s) => !s.classList.contains('is-in-deck') && !s.classList.contains('is-elevated-top')));
  assert.strictEqual(toolbar.panel.classList.contains('has-expanded-subpanel'), false);
  assert.strictEqual(toolbar.body.classList.contains('is-all-expanded'), false);
  header(labels).click();
  header(measure).click();
  assert.deepStrictEqual(turns(toolbar), ['top', null, 'deck'], 'Turn-taking resumes after re-docking; the closed section stays on its shelf');

  dock.floatPanel('derivations-panel');
  deckButton(derivs, '.elevation-deck-nav-btn.next').click();
  assert.deepStrictEqual(turns(derivs), ['deck', 'top', 'deck']);
  dock.dockPanel('derivations-panel');
  assert.deepStrictEqual(derivs.subs.map(isOpen), [false, false, false], 'Re-docked derivations return collapsed on their shelves');
  assert.deepStrictEqual(turns(derivs), [null, 'top', null]);
  assert.strictEqual(label(derivs), 'Deck (2/3)');

  // 3. Accordion, chosen from the deck's mode button: nothing is parked, toggles stick, and
  //    ◀/▶, [/] continue from the ★ cursor, scrolling the chosen section into view.
  await tick();
  deckButton(controls, '.elevation-deck-mode-toggle').click();
  assert.strictEqual(controls.body.getAttribute('data-deck-mode'), 'stack');
  deckButton(controls, '.elevation-deck-mode-toggle').click();
  assert.strictEqual(controls.body.getAttribute('data-deck-mode'), 'accordion');
  assert.strictEqual(label(controls), 'Accordion (3/3)');
  assert.deepStrictEqual(turns(controls), [null, null, null], 'Accordion parks nothing');
  assert.ok(controls.subs.every((s) => !s.classList.contains('is-in-deck')));
  assert.strictEqual(star(controls), 1);

  deckButton(controls, '.elevation-deck-nav-btn.next').click();
  assert.strictEqual(star(controls), 2, '▶ continues from the ★ cursor, not from the first open section');
  deckButton(controls, '.elevation-deck-nav-btn.next').click();
  assert.strictEqual(star(controls), 0, '▶ wraps around');
  assert.deepStrictEqual(reveals, ['conic', 'geom'], 'Deck navigation scrolls the chosen section into view');

  header(geom).click();
  await tick();
  assert.ok(!isOpen(geom), 'Closing a section from its header must stick in Accordion mode');
  assert.strictEqual(label(controls), 'Accordion (2/3)');
  assert.strictEqual(star(controls), 0, 'The ★ cursor stays on the section that was just closed');

  deckButton(controls, '.elevation-deck-nav-btn.next').click();
  assert.strictEqual(star(controls), 1, '▶ from a closed cursor moves to the next section');
  assert.ok(!isOpen(geom), 'Navigating away must not reopen the closed section');
  doc.dispatchEvent({ type: 'keydown', key: ']' });
  assert.strictEqual(star(controls), 2, '] follows the same cursor');
  doc.dispatchEvent({ type: 'keydown', key: '[' });
  assert.strictEqual(star(controls), 1, '[ follows the same cursor');
  assert.deepStrictEqual(reveals, ['conic', 'geom', 'units', 'conic', 'units']);

  pills(controls)[2].click();
  assert.ok(!isOpen(conic), 'An Accordion pill closes an open section');
  assert.strictEqual(label(controls), 'Accordion (1/3)');
  pills(controls)[2].click();
  assert.ok(isOpen(conic), 'and opens it again');
  assert.strictEqual(star(controls), 2);

  header(geom).click();
  await tick();
  assert.ok(isOpen(geom), 'Header clicks still reopen Accordion sections');
  assert.deepStrictEqual(turns(controls), [null, null, null]);

  // 4. Another starting mode stays opt-in.
  const optDoc = new MockDocument();
  const optRoot = new MockDOMElement('div', 'circle-explorer', 'opt-root');
  optRoot.ownerDocument = optDoc;
  optDoc.body.appendChild(optRoot);
  const optIn = makePanel('opt-in-panel', [makeSub('section', 'opt-a', 'A'), makeSub('section', 'opt-b', 'B')], optRoot);
  initWorkspaceDock(optRoot, { deckMode: 'accordion' });
  assert.strictEqual(optIn.body.getAttribute('data-deck-mode'), 'accordion', 'initWorkspaceDock(root, { deckMode }) opts docked panels into another mode');
});

test('WorkspaceDockManager: Deck Bar Disappears Once Turn-Taking Ends & Panel Body Scrolls Instead of Squeezing Sections', () => {
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8').replace(/\r\n/g, '\n');
  const ruleBody = (selector) => {
    const start = css.indexOf(`\n${selector} {\n`);
    assert.ok(start >= 0, `${selector} rule must exist`);
    return css.slice(start, css.indexOf('\n}', start));
  };

  // The deck hides itself with an inline display:none once fewer than two sections take turns.
  // An !important display in the stylesheet beats that and leaves an empty sticky strip behind.
  const deckRule = ruleBody('.panel-elevation-deck');
  assert.match(deckRule, /\n  display: grid;\n/, 'The deck keeps pills on a full-width navigation row');
  assert.doesNotMatch(deckRule, /display:[^;]*!important/, 'The stylesheet must not override the inline display:none that hides the deck');

  // Sections are scroll containers (overflow-x:auto), so as flex items they can be squeezed to nothing: HEAD squeezed
  // the shelves below their header height, and rigid shelves alone crushed the open section to its header instead.
  // Everything but the deck's top card keeps its height and the panel body scrolls.
  assert.ok(
    css.includes('.panel-body .collapsible-section:not(.is-elevated-top),\n.panel-body .derivation-card:not(.is-elevated-top) {\n  flex-shrink: 0 !important;\n}'),
    'Shelves and a lone open section must keep their full height inside the flex panel body'
  );

  // Top/bottom docks lay the lone open section over the panel body; the shelves it covers may shrink so the body
  // cannot scroll underneath the overlay and shift it out of place.
  const coveredShelves = ['top', 'bottom']
    .map((edge) => `[data-dock-edge="${edge}"] .workspace-dock-body > .ui-panel .panel-body:has(.is-subpanel-overlay) :is(.collapsible-section, .derivation-card):not(.is-subpanel-overlay)`)
    .join(',\n');
  assert.ok(
    css.includes(`${coveredShelves} {\n  flex-shrink: 1 !important;\n}`),
    'Shelves covered by a top/bottom open-section overlay must fall back to shrinking'
  );
});

test('WorkspaceDockManager: Background Resyncs Keep the [ ] Key Target and Breadcrumb on the Panel in Use', async () => {
  // Node's CustomEvent has a read-only target that the mock dispatcher cannot set, so turn events never
  // reached the dock in these tests. A plain event lets them bubble to the dock as they do in the browser.
  const NodeCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
      this.detail = init.detail ?? null;
    }
  };
  try {
    const doc = new MockDocument();
    const root = new MockDOMElement('div', 'circle-explorer', 'root');
    root.ownerDocument = doc;
    doc.body.appendChild(root);

    const makePanel = (id, title, sectionTitles) => {
      const panel = new MockDOMElement('div', 'ui-panel', id);
      panel.ownerDocument = doc;
      const panelHeader = new MockDOMElement('div', 'panel-header');
      panelHeader.textContent = title;
      panel.appendChild(panelHeader);
      const body = new MockDOMElement('div', 'panel-body');
      const subs = sectionTitles.map((sectionTitle, i) => {
        const sub = new MockDOMElement('div', 'collapsible-section', `${id}-section-${i + 1}`);
        const subHeader = new MockDOMElement('div', 'collapsible-header');
        subHeader.textContent = sectionTitle;
        sub.appendChild(subHeader);
        sub.appendChild(new MockDOMElement('div', 'collapsible-content'));
        body.appendChild(sub);
        return sub;
      });
      panel.appendChild(body);
      root.appendChild(panel);
      return { panel, body, subs };
    };

    const controls = makePanel('controls-panel', 'Interactive Controls', ['Geometry Parameters', 'Unit System Conversion', 'Affine Conic Mode']);
    // Every background resync used to hand the key target to the last docked panel.
    const toolbar = makePanel('toolbar-3d-panel', '3D Toolbar', ['Camera', 'Lighting', 'Labels']);

    const header = (sub) => sub.querySelector('.collapsible-header');
    const isOpen = (sub) => !sub.classList.contains('collapsed');
    const turns = (p) => p.subs.map((s) => s.getAttribute('data-elevation-turn'));
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    initCollapsibleSections(root);
    const dock = new WorkspaceDockManager(root);
    const panelCrumb = () => dock.breadcrumbBar.querySelector('.breadcrumb-panel').textContent;

    header(controls.subs[0]).click();
    header(controls.subs[1]).click();
    await tick(); // the dock resyncs every docked panel after a header click
    assert.strictEqual(dock.activePanelId, 'controls-panel', 'The resync after a header click must not hand the key target to the last docked panel');
    assert.strictEqual(panelCrumb(), 'Interactive Controls', 'The breadcrumb stays on the panel in use');
    assert.deepStrictEqual(turns(controls), ['deck', 'top', null]);

    // The other background resyncs: rendered derivations, DOM mutations, shading and dock edge changes.
    dock.syncSubpanelOverlayState();
    dock.setPanelShaded('toolbar-3d-panel', true);
    dock.setPanelShaded('toolbar-3d-panel', false);
    dock.setDockEdge('right');
    assert.strictEqual(dock.activePanelId, 'controls-panel');

    doc.dispatchEvent({ type: 'keydown', key: ']' });
    assert.deepStrictEqual(turns(controls), ['deck', 'deck', 'top'], '] keeps stepping the panel in use');
    assert.ok(isOpen(controls.subs[2]));
    assert.ok(toolbar.subs.every((s) => !isOpen(s)), '] must not open sections in another docked panel');
    assert.strictEqual(panelCrumb(), 'Interactive Controls');

    // Collapse All resyncs every docked panel, so only the panel in use announces its turn.
    dock.collapseAllSubComponents();
    assert.ok(controls.subs.every((s) => !isOpen(s)));
    assert.strictEqual(dock.activePanelId, 'controls-panel', 'Collapse All must not hand the key target to the last docked panel');

    // Operations on one specific panel still announce it, as before: a re-docked panel becomes the key target.
    dock.floatPanel('toolbar-3d-panel');
    assert.strictEqual(dock.activePanelId, 'controls-panel');
    dock.dockPanel('toolbar-3d-panel');
    assert.strictEqual(dock.activePanelId, 'toolbar-3d-panel', 'A re-docked panel still becomes the key target');
    assert.strictEqual(panelCrumb(), '3D Toolbar');
  } finally {
    globalThis.CustomEvent = NodeCustomEvent;
  }
});

test('WorkspaceDockManager: Hierarchical groups keep parent categories out of step turns', (t) => {
  const NodeCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = class {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; this.bubbles = init.bubbles; }
  };
  t.after(() => { globalThis.CustomEvent = NodeCustomEvent; });
  const doc = new MockDocument();
  const root = doc.createElement('div');
  root.className = 'circle-explorer';
  doc.body.appendChild(root);
  const panel = doc.createElement('div');
  panel.className = 'ui-panel';
  panel.id = 'hierarchy-derivations';
  const header = doc.createElement('div');
  header.className = 'panel-header';
  panel.appendChild(header);
  const body = doc.createElement('div');
  body.className = 'panel-body';
  panel.appendChild(body);
  root.appendChild(panel);
  const groups = ['Planar', 'Spatial'].map((title, groupIndex) => {
    const group = doc.createElement('div');
    group.className = 'collapsible-section collapsed';
    const groupHeader = doc.createElement('div');
    groupHeader.className = 'collapsible-header';
    groupHeader.textContent = title;
    group.appendChild(groupHeader);
    const content = doc.createElement('div');
    content.className = 'collapsible-content';
    group.appendChild(content);
    const wrapper = doc.createElement('div');
    content.appendChild(wrapper);
    const steps = [1, 2].map((number) => {
      const step = doc.createElement('div');
      step.className = 'derivation-card';
      step.id = `group-${groupIndex}-step-${number}`;
      const h = doc.createElement('div');
      h.className = 'derivation-card-header';
      h.textContent = `Step ${number} Proof`;
      step.appendChild(h);
      const c = doc.createElement('div');
      c.className = 'derivation-card-content';
      c.appendChild(doc.createElement('input'));
      step.appendChild(c);
      wrapper.appendChild(step);
      return step;
    });
    body.appendChild(group);
    return { group, steps };
  });
  const dock = new WorkspaceDockManager(root, { document: doc, win: mockWin });
  const deck = body.querySelector('.panel-elevation-deck');
  const [planar, spatial] = groups;
  const changeGroup = (index) => {
    const select = deck.querySelector('.elevation-deck-group-select');
    select.value = String(index);
    select.dispatchEvent({ type: 'change' });
  };
  assert.equal(panel.querySelectorAll('.panel-elevation-deck').length, 1, 'All levels share one navigation panel');
  assert.equal(deck.querySelectorAll('.elevation-deck-pill').length, 2, 'Parents and other groups are not sibling steps');
  assert.equal(planar.group.getAttribute('data-elevation-turn'), null);
  assert.equal(planar.steps[0].getAttribute('data-elevation-level'), '3');
  assert.equal(planar.steps[0].getAttribute('data-elevation-turn'), 'top');
  assert.equal(planar.group.classList.contains('collapsed'), false, 'The active step has a visible parent');
  assert.equal(spatial.group.getAttribute('data-elevation-group'), 'inactive');
  assert.match(deck.querySelector('.elevation-deck-pill').textContent, /^Step 1/, 'Existing numbering is not duplicated');

  cyclePanelSubpanel(panel, 'forward');
  assert.equal(deck._activeSubpanel, planar.steps[1]);
  changeGroup(1);
  assert.equal(deck._activeSubpanel, spatial.steps[0]);
  cyclePanelSubpanel(panel, 'backward');
  assert.equal(deck._activeSubpanel, spatial.steps[1], 'Cycling wraps within the selected group');
  changeGroup(0);
  assert.equal(deck._activeSubpanel, planar.steps[1], 'Returning to a group restores its own cursor');

  body.setAttribute('data-deck-mode', 'tabs');
  syncPanelElevationTurn(panel, planar.steps[1]);
  changeGroup(1);
  deck._lastWheelTime = 0;
  deck.dispatchEvent({ type: 'wheel', deltaY: 100 });
  assert.equal(deck._activeSubpanel, spatial.steps[0]);
  assert.equal(spatial.steps[1].classList.contains('open'), false, 'Wheel tabs close current siblings, not the previously captured group');
  assert.equal(planar.steps[1].classList.contains('open'), true, 'Other groups retain their state');

  assert.equal(dock.breadcrumbBar.querySelector('.breadcrumb-section').textContent, 'Spatial');
  assert.equal(dock.breadcrumbBar.querySelector('.breadcrumb-step').textContent, 'Step 1 Proof');
  spatial.steps[0].querySelector('input').focus();
  doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(doc.activeElement, spatial.steps[0].querySelector('.derivation-card-header'));
  doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(doc.activeElement, deck.querySelector('.elevation-deck-group-select'));
  doc.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(doc.activeElement, header);

  body.setAttribute('data-deck-mode', 'stack');
  syncPanelElevationTurn(panel, spatial.steps[1]);
  assert.equal(spatial.steps[0].classList.contains('is-in-deck'), false);
  assert.equal(spatial.steps[0].getAttribute('data-elevation-level'), '3', 'Stack mode preserves the third-level hierarchy');
  assert.equal(planar.group.getAttribute('data-elevation-group'), 'inactive');
  const replacement = doc.createElement('div');
  replacement.className = 'derivation-card';
  const replacementHeader = doc.createElement('div');
  replacementHeader.className = 'derivation-card-header';
  replacementHeader.textContent = 'Updated proof';
  replacement.appendChild(replacementHeader);
  const parent = spatial.steps[0].parentElement;
  spatial.steps.forEach((step) => parent.removeChild(step));
  parent.appendChild(replacement);
  body.setAttribute('data-deck-mode', 'deck');
  syncPanelElevationTurn(panel);
  assert.equal(deck._activeSubpanel, replacement, 'Dynamic proof replacement drops stale cursors');
  assert.equal(deck.querySelectorAll('.elevation-deck-pill').length, 1);
  assert.equal(deck.style.display, 'grid', 'The group switch remains available even for a single step');
});

test('WorkspaceDockManager: Viewport-bounded dock resizing preserves canvas area and remembered sizes', () => {
  const oldStorage = globalThis.localStorage.getItem('vml_workspace_dock_state');
  globalThis.localStorage.removeItem('vml_workspace_dock_state');
  try {
    const doc = new MockDocument();
    const listeners = new Map();
    const win = {
      innerWidth: 1200, innerHeight: 800,
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
      removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter((handler) => handler !== fn)); },
      dispatchEvent(event) { (listeners.get(event.type) || []).forEach((fn) => fn(event)); },
    };
    doc.defaultView = win;
    const root = doc.createElement('div');
    root.className = 'circle-explorer';
    root.getBoundingClientRect = () => ({ top: 0, left: 0, width: win.innerWidth, height: win.innerHeight });
    doc.body.appendChild(root);
    const dock = new WorkspaceDockManager(root, { document: doc });
    const resize = (key) => dock.dockResizer.dispatchEvent({ type: 'keydown', key });
    assert.ok(dock.dockSize <= win.innerWidth * 0.35, 'Default leaves at least 65% of canvas width unobstructed');
    assert.equal(dock.dockResizer.getAttribute('role'), 'separator');
    resize('End');
    assert.equal(dock.dockSize, 780);
    assert.equal(dock.dockResizer.getAttribute('aria-valuenow'), '780');
    resize('Home');
    assert.equal(dock.dockSize, 240);
    resize('ArrowRight');
    assert.equal(dock.dockSize, 250);
    dock.setDockEdge('right');
    resize('ArrowLeft');
    assert.equal(dock.dockSize, 260, 'Right-edge handle expands leftward');
    dock.setDockEdge('top');
    assert.ok(dock.dockSize <= win.innerHeight * 0.45);
    resize('End');
    assert.equal(dock.dockSize, 520, 'At least 35% of the canvas stays exposed at maximum height');
    dock.setDockEdge('bottom');
    resize('ArrowUp');
    assert.equal(dock.dockSize, 520, 'Keyboard cannot exceed the viewport bound');
    dock.dockResizer.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 200 });
    win.dispatchEvent({ type: 'pointermove', clientX: 100, clientY: 260 });
    win.dispatchEvent({ type: 'pointerup', pointerId: 1 });
    assert.equal(dock.dockSize, 460, 'Pointer resizing shares the keyboard limits');
    dock.setDockEdge('left');

    win.innerWidth = 390;
    win.innerHeight = 300;
    win.dispatchEvent({ type: 'resize' });
    assert.equal(dock.dockResizer.getAttribute('data-resize-edge'), 'bottom', 'Compact dock resizes as a bottom sheet regardless of saved edge');
    assert.equal(dock.dockSize, 195);
    assert.equal(dock.dockElement.style.height, '195px');
    resize('Home');
    assert.equal(dock.dockSize, 160);
    win.innerHeight = 180;
    win.dispatchEvent({ type: 'resize' });
    assert.equal(dock.dockSize, 117, 'Small viewports take precedence over the normal minimum');
    win.innerWidth = 1200;
    win.innerHeight = 800;
    win.dispatchEvent({ type: 'resize' });
    assert.equal(dock.dockSize, 260, 'Desktop width survives compact viewport changes');
    dock.setDockEdge('bottom');
    assert.equal(dock.dockSize, 160, 'User-set horizontal size survives viewport clamping');
    root.getBoundingClientRect = () => ({ top: 0, left: 0, width: 765, height: 800 });
    win.innerWidth = 780;
    dock.setDockEdge('left');
    assert.equal(dock.dockResizer.getAttribute('aria-orientation'), 'vertical', 'Breakpoint follows viewport width, not scrollbar-reduced root width');
  } finally {
    if (oldStorage === null) globalThis.localStorage.removeItem('vml_workspace_dock_state');
    else globalThis.localStorage.setItem('vml_workspace_dock_state', oldStorage);
  }
});

test('WorkspaceDockManager: Shared spatial contract reaches every published visual', () => {
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8');
  assert.ok(css.includes('scrollbar-gutter: stable both-edges !important;'));
  assert.ok(css.includes('--elevation-header-padding: 0.75rem 1rem;'));
  assert.ok(css.includes('var(--shelf-cast, 0 0 #0000)'), 'Shaded windows retain their level-one cast');
  assert.ok(css.includes('--shelf-cast: 0 0 #0000;'), 'Window cast is not inherited by nested shelves');
  assert.ok(css.includes('height: var(--dock-size) !important;'), 'Compact height follows the actual resize state');
  assert.ok(css.includes('.workspace-dock:not(.is-collapsed) .dock-resizer'), 'Compact mode exposes a resize handle');
  assert.ok(css.includes('min-height: 10rem !important;'), 'Small docks scroll rather than crushing the active card content to zero');
  const shared = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  assert.ok(shared.includes('workspace-dock.css'));
  const visuals = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'visuals.json'), 'utf8')).filter((v) => v.published);
  assert.equal(visuals.length, 12);
  for (const visual of visuals) {
    const html = fs.readFileSync(path.join(rootDir, 'visuals', visual.suite, visual.slug, 'index.html'), 'utf8');
    assert.ok(html.includes('css/visual.css'), `${visual.slug} must load the shared dock spatial rules`);
  }
});

test('WorkspaceDockManager: Elevation Reads as Volume: Each Level Is Lighter, Rimmed and Casts Further, the Deck Shows Its Thickness and Turns Move Through Depth', () => {
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8').replace(/\r\n/g, '\n');
  const ruleBody = (selector) => {
    const start = css.indexOf(`\n${selector} {\n`);
    assert.ok(start >= 0, `${selector} rule must exist`);
    return css.slice(start, css.indexOf('\n}', start));
  };
  const ruleEndingWith = (selector) => {
    const start = css.indexOf(`${selector} {\n`);
    assert.ok(start >= 0, `A rule ending with ${selector} must exist`);
    return css.slice(start, css.indexOf('\n}', start));
  };
  const layers = (shadow) => shadow
    .replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, '')
    .split(',')
    .map((layer) => layer.trim().split(/\s+/).map(parseFloat));
  const luminance = (hex) => {
    const [r, g, b] = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1)
      .map((h) => parseInt(h, 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // 1. One key light from above: each step up in elevation has a lighter face, a brighter top rim and a longer cast shadow.
  const tokens = ruleBody('.workspace-dock,\n.ui-panel');
  const token = (name) => {
    const match = tokens.match(new RegExp(`\\n  --elevation-${name}: ([^;]+);`));
    assert.ok(match, `--elevation-${name} must be declared alongside the dock and panel tokens`);
    return match[1];
  };
  const shelf = ruleBody('.panel-body .collapsible-section.collapsed > .collapsible-header,\n.panel-body .derivation-card:not(.open) > .derivation-card-header:not(.open),\n.workspace-dock-body > .ui-panel:is(.is-shaded, :has(> .panel-content > .panel-body.hidden), :has(> .panel-body.hidden)) .panel-header');
  const shelfFace = shelf.match(/\n  background: (#[0-9a-f]{6}) !important;/i)?.[1];
  assert.ok(shelfFace, 'Shelf faces must declare a solid colour');
  assert.ok(luminance(token('face-2')) > luminance(shelfFace), 'An open section must be lighter than the shelves it rises above, or depth reads inverted');
  assert.ok(luminance(token('face-3')) > luminance(token('face-2')), 'The deck top card face must be the lightest face');
  assert.ok(luminance(token('surface-3')) > luminance(token('surface-2')), 'The top card body must sit lighter than an open section body');
  const rim = (level) => parseFloat(token(`rim-${level}`).match(/([\d.]+)\)$/)[1]);
  assert.ok(rim(1) < rim(2) && rim(2) < rim(3), 'Top rims must brighten with every level');
  const reach = (level) => Math.max(...layers(token(`cast-${level}`)).map(([, y, blur]) => y + blur));
  assert.ok(reach(1) < reach(2) && reach(2) < reach(3), 'Cast shadows must lengthen with every level');
  assert.ok(token('well').startsWith('inset '), 'The dock body is a recessed well, not a raised surface');

  // 2. Every surface takes its place in that light: the well, the docked slab and its header, the deck rail, the shelves.
  assert.match(ruleBody('.workspace-dock-body'), /\n  box-shadow: var\(--elevation-well\);/, 'The dock body must read as a recess');
  assert.match(ruleBody('.workspace-dock-body > .ui-panel'), /\n  box-shadow: var\(--elevation-cast-1\) !important;/, 'Docked panels rest on the well at level 1');
  assert.match(ruleBody('.workspace-dock-body > .ui-panel .panel-header'), /\n  box-shadow: var\(--elevation-rim-1\);/, 'Panel headers catch the level 1 rim');
  const deckBar = ruleBody('.panel-elevation-deck');
  assert.match(deckBar, /\n  background: var\(--elevation-surface-3\) !important;/, 'The deck bar sits at the top card level');
  assert.match(deckBar, /\n  box-shadow: var\(--elevation-rim-2\), /, 'The deck bar is a rimmed rail');
  assert.match(shelf, /\n  box-shadow: var\(--shelf-rim, var\(--elevation-rim-2\)\), /, 'Shelves retain their rim while shaded windows use their own level');

  // 3. An open section outside the deck (the lone open section, Stack and Accordion modes) is lifted above its shelves.
  const lift = '.panel-body :is(.collapsible-section, .derivation-card)[data-elevation-level="2"]:not([data-elevation-turn])';
  const liftRule = ruleBody(lift);
  assert.match(liftRule, /\n  z-index: 2;/, 'The lifted section must stack above the shelves it casts onto');
  assert.match(liftRule, /\n  background: var\(--elevation-surface-2\);/);
  assert.match(liftRule, /\n  box-shadow: var\(--elevation-cast-2\);/);
  const liftFace = ruleBody(`${lift} > :is(.collapsible-header, .derivation-card-header)`);
  assert.match(liftFace, /\n  background: var\(--elevation-face-2\);/);
  assert.match(liftFace, /\n  box-shadow: var\(--elevation-rim-2\);/);

  // 4. The deck has thickness: one receding card edge per waiting turn (up to three), and the top card leaves room for them.
  const depthRules = [2, 3, 4].map((pills) => ruleBody(`.panel-body:has(> .panel-elevation-deck .elevation-deck-pill:nth-child(${pills}))`));
  const gaps = depthRules.map((rule, i) => {
    const pills = i + 2;
    const stack = rule.match(/\n  --elevation-stack: ([^;]+);/)[1];
    assert.strictEqual((stack.match(/rgba\(56, 189, 248, /g) || []).length, pills - 1, `${pills} turns must show ${pills - 1} card edge(s) under the top card`);
    const gap = parseFloat(rule.match(/\n  --elevation-stack-gap: ([\d.]+)px;/)[1]);
    const extent = Math.max(...layers(stack).map(([, y, blur, spread]) => y + blur + spread));
    assert.ok(gap >= extent, `The top card must leave ${extent}px for ${pills - 1} edge(s) or they are clipped`);
    return gap;
  });
  assert.ok(gaps[0] < gaps[1] && gaps[1] < gaps[2], 'The deck must thicken as more turns wait');
  const topCard = ruleEndingWith('.workspace-dock-body > .ui-panel .panel-body:not([data-deck-mode="stack"]) .derivation-card.is-elevated-top');
  assert.match(topCard, /\n  background: var\(--elevation-surface-3\) !important;/);
  assert.match(topCard, /\n  box-shadow: var\(--elevation-stack, 0 0 #0000\), var\(--elevation-cast-3\) !important;/, 'The top card draws the deck edges beneath its own cast shadow');
  assert.match(topCard, /\n  margin: 0 0 var\(--elevation-stack-gap, 0px\) !important;/, 'The top card yields exactly the room its deck edges need');
  const topFace = ruleEndingWith('.workspace-dock-body > .ui-panel .panel-body:not([data-deck-mode="stack"]) .derivation-card.is-elevated-top > .derivation-card-header');
  assert.match(topFace, /\n  background: var\(--elevation-face-3\) !important;/);
  assert.match(topFace, /\n  box-shadow: var\(--elevation-rim-3\) !important;/);

  // 5. Volume is presentation only: the new rules never change layout or interaction.
  for (const rule of [liftRule, liftFace, ...depthRules]) {
    for (const prop of ['display:', 'position:', 'height:', 'padding', 'margin', 'pointer-events:', 'cursor:', 'transition:']) {
      assert.ok(!rule.includes(prop), `Volume rule "${rule.trim().split(' {')[0]}" must not set "${prop}"`);
    }
  }

  // 6. Turns move through depth rather than sideways, and honour reduced motion.
  const fromDepth = (name) => {
    const start = css.indexOf(`\n@keyframes ${name} {\n`);
    assert.ok(start >= 0, `@keyframes ${name} must exist`);
    const frames = css.slice(start, css.indexOf('\n}', start));
    assert.ok(frames.includes('perspective('), `${name} needs perspective to read as depth`);
    assert.ok(!frames.includes('translateX('), `${name} must not slide sideways`);
    const [from, to] = [...frames.matchAll(/translate3d\(([^)]*)\)/g)].map(([, args]) => args.split(',').map(parseFloat));
    assert.deepStrictEqual(to, [0, 0, 0], `${name} must land flush where the top card rests`);
    return from[2];
  };
  assert.ok(fromDepth('deckSlideNext') < 0, 'Next lifts the following card up out of the deck, from behind');
  assert.ok(fromDepth('deckSlidePrev') > 0, 'Previous lays the earlier card back down onto the deck, from in front');
  assert.ok(fromDepth('elevationSlideIn') < 0, 'A card taking the top turn rises toward the viewer');
  const reduced = css.indexOf('\n@media (prefers-reduced-motion: reduce) {\n');
  assert.ok(reduced >= 0, 'Deck turns must honour prefers-reduced-motion');
  const reducedBlock = css.slice(reduced, css.indexOf('\n}', reduced));
  assert.ok(reducedBlock.includes(':is(.slide-forward, .slide-backward)'), 'Both turn directions must be covered');
  assert.ok(reducedBlock.includes('animation-duration: 0.01ms !important;'), 'Turn motion must collapse to an instant, since the turn rules outrank the site-wide reset');

  // 7. The light model reads only state the turn-taking logic already sets.
  const doc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = doc;
  doc.body.appendChild(root);
  const panel = new MockDOMElement('div', 'ui-panel', 'volume-panel');
  panel.ownerDocument = doc;
  panel.appendChild(new MockDOMElement('div', 'panel-header'));
  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(body);
  root.appendChild(panel);
  const subs = ['geom', 'units', 'conic'].map((id) => {
    const sub = new MockDOMElement('div', 'collapsible-section collapsed', `volume-${id}`);
    sub.appendChild(new MockDOMElement('div', 'collapsible-header'));
    sub.appendChild(new MockDOMElement('div', 'collapsible-content collapsed'));
    body.appendChild(sub);
    return sub;
  });
  const [geom, units] = subs;

  setSubpanelOpen(geom, true);
  syncPanelElevationTurn(panel, geom);
  assert.strictEqual(geom.getAttribute('data-elevation-level'), '2', 'A lone open section is raised to level 2');
  assert.strictEqual(geom.getAttribute('data-elevation-turn'), null, 'It takes no turn, so the in-flow lift applies to it');
  assert.ok(subs.slice(1).every((s) => !s.hasAttribute('data-elevation-level')), 'Shelves stay at rest');

  setSubpanelOpen(units, true);
  syncPanelElevationTurn(panel, units);
  const pillRow = body.querySelector('.elevation-deck-pills');
  assert.strictEqual(pillRow.children.length, 2, 'One pill per turn sets the visible deck thickness');
  assert.ok(pillRow.children.every((child) => child.classList.contains('elevation-deck-pill')), 'The pill row holds only pills, so :nth-child() counts turns');
  assert.strictEqual(units.getAttribute('data-elevation-turn'), 'top');
  assert.ok(subs.slice(0, 2).every((s) => s.hasAttribute('data-elevation-turn')), 'Inside the deck every open section takes a turn, so the in-flow lift steps aside for the top card');
  assert.ok(!subs[2].hasAttribute('data-elevation-turn') && !subs[2].hasAttribute('data-elevation-level'), 'A closed section stays at rest on its shelf');
});

test('WorkspaceDockManager: Header Folds Rest the Deck Step, Deck Controls Reopen It, and Dock Content Sizes to the Dock', () => {
  const doc = new MockDocument();
  const root = doc.createElement('div');
  root.className = 'circle-explorer';
  doc.body.appendChild(root);
  const makePanel = (id) => {
    const panel = doc.createElement('div');
    panel.className = 'ui-panel';
    panel.id = id;
    panel.appendChild(new MockDOMElement('div', 'panel-header'));
    const body = new MockDOMElement('div', 'panel-body');
    panel.appendChild(body);
    root.appendChild(panel);
    return { panel, body };
  };
  const makeCard = (id) => {
    const card = new MockDOMElement('div', 'derivation-card', id);
    card.appendChild(new MockDOMElement('div', 'derivation-card-header collapsible-header'));
    card.appendChild(new MockDOMElement('div', 'derivation-card-content collapsible-content'));
    return card;
  };
  const turn = (sub) => sub.getAttribute('data-elevation-turn');
  const isOpen = (card) => card.classList.contains('open');

  // 1. Forced derivation deck: a header fold (sync with the card and no options) rests the step.
  const deriv = makePanel('live-derivation-panel');
  const cards = ['rest-step-1', 'rest-step-2', 'rest-step-3'].map(makeCard);
  cards.forEach((card) => deriv.body.appendChild(card));
  const [card1, card2, card3] = cards;
  setSubpanelOpen(card1, true);
  syncPanelElevationTurn(deriv.panel, card1);
  const deck = deriv.body.querySelector('.panel-elevation-deck');
  assert.equal(turn(card1), 'top');

  setSubpanelOpen(card1, false);
  syncPanelElevationTurn(deriv.panel, card1);
  assert.equal(isOpen(card1), false, 'The deck must not undo a header fold');
  assert.equal(turn(card1), 'top', 'The folded step keeps the turn and rests on its shelf');
  assert.equal(deck._restedSubpanel, card1);
  assert.equal(deck.style.display, 'grid', 'Deck controls stay available while the step rests');
  assert.equal(deck.querySelectorAll('.elevation-deck-pill').length, 3, 'Every step stays reachable from the deck');
  for (const shelf of [card2, card3]) {
    assert.equal(turn(shelf), null, 'Nothing is parked while the turn rests');
    assert.equal(shelf.classList.contains('is-in-deck'), false, 'The other steps lie on their shelves');
  }

  syncPanelElevationTurn(deriv.panel, null, { silent: true });
  assert.equal(isOpen(card1), false, 'Background resyncs keep the rested step folded');
  assert.equal(turn(card1), 'top');

  deck.querySelector('.elevation-deck-nav-btn.next').click();
  assert.equal(turn(card2), 'top', 'Next moves the turn on from a rested step');
  assert.equal(isOpen(card2), true, 'Deck navigation opens its target');
  deck.querySelectorAll('.elevation-deck-pill')[0].click();
  assert.equal(turn(card1), 'top');
  assert.equal(isOpen(card1), true, 'A pill reopens the step it selects');
  assert.equal(deck._restedSubpanel, null, 'An open step is no longer rested');

  setSubpanelOpen(card1, false);
  syncPanelElevationTurn(deriv.panel, card1);
  cyclePanelSubpanel(deriv.panel, 'forward');
  cyclePanelSubpanel(deriv.panel, 'backward');
  assert.equal(turn(card1), 'top');
  assert.equal(isOpen(card1), true, 'Keyboard cycling back to a rested step reopens it');

  setSubpanelOpen(card1, false);
  syncPanelElevationTurn(deriv.panel, card1);
  setSubpanelOpen(card1, true);
  syncPanelElevationTurn(deriv.panel, card1);
  assert.equal(isOpen(card1), true, 'The header that folded a step unfolds it again');
  assert.equal(deck._restedSubpanel, null);

  // Folding the raised step also folds the steps left open behind it, so the panel collapses to its shelves;
  // a shelf header then raises its step and parks the others again.
  deck.querySelector('.elevation-deck-nav-btn.next').click();
  assert.equal(isOpen(card1), true, 'Deck navigation leaves the previous step open behind the deck');
  assert.equal(card1.classList.contains('is-in-deck'), true);
  setSubpanelOpen(card2, false);
  syncPanelElevationTurn(deriv.panel, card2);
  assert.equal(deck._restedSubpanel, card2);
  assert.deepEqual(cards.map(isOpen), [false, false, false], 'Folding the raised step collapses the whole deck');
  assert.deepEqual(cards.map((card) => card.classList.contains('is-in-deck')), [false, false, false], 'Every step shows on its shelf');
  syncPanelElevationTurn(deriv.panel, null, { silent: true });
  assert.equal(card1.classList.contains('is-in-deck'), false, 'Background resyncs keep the shelves in view');
  setSubpanelOpen(card3, true);
  syncPanelElevationTurn(deriv.panel, card3);
  assert.equal(turn(card3), 'top', 'A shelf header raises its step');
  assert.equal(turn(card1), 'deck');
  assert.equal(turn(card2), 'deck', 'The previously rested step is parked again');

  // 2. Thales hides card content with .collapsed; opening a card must clear it, closing must not add it.
  const content3 = card3.querySelector('.derivation-card-content');
  content3.classList.add('collapsed');
  setSubpanelOpen(card3, true);
  assert.equal(content3.classList.contains('collapsed'), false, 'An opened card must not stay empty');
  setSubpanelOpen(card3, false);
  assert.equal(content3.classList.contains('collapsed'), false, 'Shared visuals never remove .collapsed, so closing must not add it');

  // 3. Plain Deck lists only open sections, so folding the top one passes the turn to the next open one.
  const controls = makePanel('controls-panel');
  const sections = [1, 2, 3].map((n) => {
    const section = new MockDOMElement('div', 'collapsible-section', `rest-section-${n}`);
    section.appendChild(new MockDOMElement('div', 'collapsible-header open'));
    section.appendChild(new MockDOMElement('div', 'collapsible-content open'));
    controls.body.appendChild(section);
    return section;
  });
  syncPanelElevationTurn(controls.panel, sections[0]);
  assert.equal(turn(sections[0]), 'top');
  setSubpanelOpen(sections[0], false);
  syncPanelElevationTurn(controls.panel, sections[0]);
  assert.equal(turn(sections[1]), 'top', 'The turn passes to the next open section');
  assert.equal(sections[0].classList.contains('collapsed'), true, 'The folded section stays folded');
  assert.equal(sections[0].classList.contains('is-in-deck'), false, 'A closed section left out of the pills stays on its shelf');
  assert.equal(turn(sections[0]), null);
  assert.equal(turn(sections[2]), 'deck', 'Open sections listed by the pills are still parked');
  setSubpanelOpen(sections[0], true);
  syncPanelElevationTurn(controls.panel, sections[0]);
  assert.equal(turn(sections[0]), 'top', 'Opening a shelf raises it');
  assert.equal(turn(sections[1]), 'deck');

  // 4. Grouped panels fall back to the group's remembered step; that must not be mistaken for a header fold.
  const grouped = makePanel('grouped-derivations');
  const steps = ['Planar', 'Spatial'].map((title, g) => {
    const group = new MockDOMElement('div', 'collapsible-section collapsed', `rest-group-${g}`);
    group.appendChild(new MockDOMElement('div', 'collapsible-header'));
    const content = new MockDOMElement('div', 'collapsible-content');
    group.appendChild(content);
    const groupSteps = [1, 2].map((n) => makeCard(`rest-group-${g}-step-${n}`));
    groupSteps.forEach((step) => content.appendChild(step));
    grouped.body.appendChild(group);
    return groupSteps;
  })[0];
  syncPanelElevationTurn(grouped.panel, null, { silent: true });
  assert.equal(turn(steps[0]), 'top');
  assert.equal(isOpen(steps[0]), false, 'Derivation steps start collapsed by default as shelves');
  setSubpanelOpen(steps[0], false);
  syncPanelElevationTurn(grouped.panel, null, { silent: true });
  assert.equal(isOpen(steps[0]), false, 'A step collapsed by default stays rested on resync');
  setSubpanelOpen(steps[0], true);
  syncPanelElevationTurn(grouped.panel, steps[0]);
  assert.equal(isOpen(steps[0]), true, 'Opening a step unfolds it');
  setSubpanelOpen(steps[0], false);
  syncPanelElevationTurn(grouped.panel, steps[0]);
  assert.equal(isOpen(steps[0]), false, 'A header fold inside a group rests the step');
  syncPanelElevationTurn(grouped.panel, null, { silent: true });
  assert.equal(isOpen(steps[0]), false, 'The remembered step stays rested through background resyncs');
  assert.equal(turn(steps[0]), 'top');

  // 5. Thales' Accordion folds the card that owns the header and syncs that card, not its group.
  const accordion = fs.readFileSync(path.join(rootDir, 'visuals/circle-theorems/thales-theorem/src/ui/Accordion.js'), 'utf8');
  assert.ok(accordion.includes("owner.classList.toggle('open', open)"), 'Card headers toggle the card itself');
  assert.ok(accordion.includes('syncPanelElevationTurn(panel, this.#owner(header))'), 'The deck syncs the card whose header was used');

  // 6. CSS: a rested top step shrinks to its shelf, and narrow docks give the pills their own full row.
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(css.includes('.panel-body.is-all-expanded :is(.collapsible-section.collapsed, .derivation-card:not(.open)):is(.is-elevated-top, [data-elevation-turn="top"]) {\n  flex: 0 0 auto !important;\n  min-height: 0 !important;\n  --elevation-stack: 0 0 #0000;\n  --elevation-stack-gap: 0px;\n}'), 'A rested top step must not keep the open-card minimum height or show turns waiting under it');
  const narrow = css.slice(css.indexOf('@container workspace-dock (max-width: 20rem)'));
  assert.ok(narrow.length > 0 && css.includes('@container workspace-dock (max-width: 20rem)'), 'Narrow docks need their own deck layout');
  assert.ok(narrow.includes('"count count count" "prev pills next" "mode mode mode"'), 'The mode toggle leaves the pill row in narrow docks');
  assert.ok(narrow.slice(0, narrow.indexOf('\n}\n')).includes('.panel-elevation-deck .elevation-deck-pill {\n    max-width: 100% !important;'), 'The active pill must fit the narrow pill row');
});

test('WorkspaceDockManager: Universal Mouse Wheel Scrolling Across Labels, Inputs, Cards, and Headers Without Overscroll Traps', () => {
  const cssPath = path.join(rootDir, 'css', 'workspace-dock.css');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

  // 1. CSS Zero-Trapping Invariant: open subpanels in vertical docks must not trap wheel events
  assert.ok(
    css.includes('overflow-y: visible !important;\n  overflow-x: hidden !important;\n  overscroll-behavior: auto !important;\n  overscroll-behavior-y: auto !important;'),
    'Active subpanel content must declare overflow-y: visible !important and overscroll-behavior: auto !important to prevent scroll chaining deadlocks'
  );

  // 2. Panel body allows overscroll chaining to dock body
  assert.ok(
    css.includes('.workspace-dock-body > .ui-panel .panel-body {\n  --shelf-cast: 0 0 #0000;\n  padding: 0 !important;\n  flex: 0 1 auto !important;\n  display: flex !important;\n  flex-direction: column !important;\n  min-height: 0 !important;\n  height: auto !important;\n  max-height: min(460px, 55vh) !important;\n  overflow-y: auto !important;\n  overscroll-behavior: auto !important;\n  overscroll-behavior-y: auto !important;'),
    'Docked panel body must allow overscroll chaining to dock body'
  );

  // 3. Top/bottom dock wheel listener ancestor traversal
  const mockDoc = new MockDocument();
  const mockWin = { innerWidth: 1200, innerHeight: 800 };
  const root = new MockDOMElement('div', 'circle-explorer', 'root');
  root.ownerDocument = mockDoc;
  mockDoc.body.appendChild(root);

  const dock = new WorkspaceDockManager(root, { win: mockWin, doc: mockDoc });
  dock.setDockEdge('top');
  dock.dockBody.scrollLeft = 0;

  const panel = new MockDOMElement('div', 'ui-panel', 'controls-panel');
  panel.ownerDocument = mockDoc;
  const panelBody = new MockDOMElement('div', 'panel-body');
  panelBody.scrollHeight = 300;
  panelBody.clientHeight = 200;
  panelBody.scrollTop = 10;

  const sec = new MockDOMElement('div', 'collapsible-section is-elevated-top');
  const content = new MockDOMElement('div', 'collapsible-content');
  content.scrollHeight = 100;
  content.clientHeight = 100; // No vertical scroll on content itself

  const sliderBox = new MockDOMElement('div', 'slider-container');
  const label = new MockDOMElement('label');
  const input = new MockDOMElement('input');

  sliderBox.appendChild(label);
  sliderBox.appendChild(input);
  content.appendChild(sliderBox);
  sec.appendChild(content);
  panelBody.appendChild(sec);
  panel.appendChild(panelBody);
  dock.dockBody.appendChild(panel);

  // Wheel over label when parent panelBody has vertical room -> let it scroll vertically (does not hijack scrollLeft)
  let prevented = false;
  dock.dockBody.dispatchEvent({
    type: 'wheel',
    target: label,
    deltaY: 50,
    deltaX: 0,
    preventDefault: () => { prevented = true; },
  });
  assert.strictEqual(prevented, false, 'Wheel over label inside vertically scrollable panelBody must not be hijacked by horizontal dock');
  assert.strictEqual(dock.dockBody.scrollLeft, 0, 'Dock body horizontal scroll must not increment when inner container has vertical scroll');

  // When panelBody has no vertical room -> horizontal dock scrolls dock body
  panelBody.scrollHeight = 200;
  panelBody.clientHeight = 200;
  dock.dockBody.dispatchEvent({
    type: 'wheel',
    target: label,
    deltaY: 75,
    deltaX: 0,
    preventDefault: () => { prevented = true; },
  });
  assert.strictEqual(prevented, true, 'Wheel over label when no vertical scroll is needed must map to dockBody.scrollLeft');
  assert.strictEqual(dock.dockBody.scrollLeft, 75, 'Dock body horizontal scrollLeft must increment by deltaY');
});



test('WorkspaceDockManager: Derivation Panel Steps Start Collapsed by Default as Shelves', () => {
  const doc = new MockDocument();
  const root = new MockDOMElement('div', 'circle-explorer');
  root.ownerDocument = doc;
  doc.body.appendChild(root);

  const panel = new MockDOMElement('div', 'ui-panel', 'live-derivation-panel');
  panel.ownerDocument = doc;
  const header = new MockDOMElement('div', 'panel-header');
  panel.appendChild(header);

  const body = new MockDOMElement('div', 'panel-body');
  panel.appendChild(body);

  const steps = [1, 2, 3, 4].map((n) => {
    const card = new MockDOMElement('div', 'derivation-card', `step-${n}`);
    const h = new MockDOMElement('div', 'derivation-card-header collapsible-header');
    h.textContent = `Step ${n}: Proof`;
    const icon = new MockDOMElement('span', 'icon');
    icon.textContent = '▶';
    h.appendChild(icon);
    card.appendChild(h);
    const c = new MockDOMElement('div', 'derivation-card-content collapsible-content');
    card.appendChild(c);
    body.appendChild(card);
    return card;
  });
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root, { document: doc });
  const deck = body.querySelector('.panel-elevation-deck');

  // 1. All steps must be collapsed by default on initial dock render
  assert.ok(deck, 'Derivation deck must be created');
  assert.strictEqual(deck.style.display, 'grid', 'Deck bar must be displayed');
  assert.ok(steps.every((s) => !s.classList.contains('open')), 'All derivation steps must start collapsed by default');
  steps.forEach((s, idx) => {
    const h = s.querySelector('.derivation-card-header');
    assert.strictEqual(h.getAttribute('aria-expanded'), 'false', `Step ${idx + 1} header must have aria-expanded="false"`);
    assert.ok(!h.classList.contains('open'), `Step ${idx + 1} header must not have .open class`);
    const c = s.querySelector('.derivation-card-content');
    assert.ok(!c.classList.contains('open'), `Step ${idx + 1} content must not have .open class`);
  });

  // Step 1 holds the top turn cursor, resting on its shelf
  assert.strictEqual(steps[0].getAttribute('data-elevation-turn'), 'top', 'Step 1 holds the turn cursor');
  assert.strictEqual(steps[0].classList.contains('open'), false, 'Step 1 rests collapsed on its shelf');
  for (let i = 1; i < steps.length; i++) {
    assert.strictEqual(steps[i].getAttribute('data-elevation-turn'), null, `Step ${i + 1} rests unparked on its shelf`);
    assert.strictEqual(steps[i].classList.contains('is-in-deck'), false, `Step ${i + 1} is not parked in deck while turn rests`);
  }

  // 2. Navigation through deck pills or controls raises and opens the chosen step
  const pills = deck.querySelectorAll('.elevation-deck-pill');
  assert.strictEqual(pills.length, 4, 'All 4 steps must have pills in the deck');
  pills[1].click(); // Click Step 2
  assert.strictEqual(steps[1].getAttribute('data-elevation-turn'), 'top');
  assert.strictEqual(steps[1].classList.contains('open'), true, 'Clicking Step 2 pill opens Step 2');
  assert.strictEqual(steps[1].querySelector('.derivation-card-header').getAttribute('aria-expanded'), 'true');
  assert.strictEqual(steps[0].getAttribute('data-elevation-turn'), 'deck', 'Step 1 is now parked in deck');

  // 3. Folding Step 2 via header collapses it back into a rested shelf
  setSubpanelOpen(steps[1], false);
  syncPanelElevationTurn(panel, steps[1]);
  assert.strictEqual(steps[1].classList.contains('open'), false, 'Step 2 folded via header');
  assert.strictEqual(steps[1].getAttribute('data-elevation-turn'), 'top', 'Step 2 holds the turn as a rested shelf');
  assert.ok(steps.every((s) => !s.classList.contains('open')), 'All steps are collapsed again');
  for (let i = 0; i < steps.length; i++) {
    if (i !== 1) {
      assert.strictEqual(steps[i].getAttribute('data-elevation-turn'), null);
      assert.strictEqual(steps[i].classList.contains('is-in-deck'), false);
    }
  }

  // Background resync keeps all steps collapsed on their shelves
  syncPanelElevationTurn(panel, null, { silent: true });
  assert.ok(steps.every((s) => !s.classList.contains('open')), 'Background resync preserves collapsed shelf state');
});

test('WorkspaceDockManager: Dock Panel Docks in All Margins (Left, Right, Top, Bottom) Across All Viewports & Snaps on Drag', () => {
  globalThis.localStorage?.clear?.();
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);
  const panel = new MockDOMElement('div', 'ui-panel', 'test-dock-panel');
  const header = new MockDOMElement('div', 'panel-header');
  panel.appendChild(header);
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);

  // 1. Explicit docking across all 4 margins
  const edges = ['left', 'right', 'top', 'bottom'];
  edges.forEach((edge) => {
    dock.setDockEdge(edge);
    assert.strictEqual(dock.dockEdge, edge, `Dock edge must be ${edge}`);
    assert.strictEqual(root.getAttribute('data-dock-edge'), edge, `Root data-dock-edge must be ${edge}`);
    assert.strictEqual(dock.dockResizer.getAttribute('data-resize-edge'), edge, `Resizer edge must be ${edge}`);
    const isHorizontal = edge === 'top' || edge === 'bottom';
    assert.strictEqual(dock.dockResizer.getAttribute('aria-orientation'), isHorizontal ? 'horizontal' : 'vertical');
    const btn = dock.dockElement.querySelector(`.dock-edge-btn[data-edge="${edge}"]`);
    assert.ok(btn && btn.classList.contains('active'), `Edge button for ${edge} must be active`);
  });

  // 2. Dragging collapsed dock near a margin magnetically docks to that margin
  dock.setDockCollapsed(true);
  const dockHeader = dock.dockElement.querySelector('.workspace-dock-header');

  // Drag towards right margin
  root.getBoundingClientRect = () => ({ top: 0, left: 0, width: 1000, height: 700 });
  dock.dockElement.getBoundingClientRect = () => ({ top: 300, left: 100, width: 120, height: 40 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 100, clientY: 300, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 870, clientY: 300 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'right', 'Dragging collapsed pill to right edge must magnetically set dock edge to right');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'right');

  // Drag towards bottom margin
  dock.dockElement.getBoundingClientRect = () => ({ top: 100, left: 500, width: 120, height: 40 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 500, clientY: 100, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 500, clientY: 655 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'bottom', 'Dragging collapsed pill to bottom edge must magnetically set dock edge to bottom');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'bottom');

  // Drag towards top margin
  dock.dockElement.getBoundingClientRect = () => ({ top: 500, left: 500, width: 120, height: 40 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 500, clientY: 500, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 500, clientY: 8 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'top', 'Dragging collapsed pill to top edge must magnetically set dock edge to top');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'top');

  // Drag towards left margin
  dock.dockElement.getBoundingClientRect = () => ({ top: 300, left: 500, width: 120, height: 40 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 500, clientY: 300, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 8, clientY: 300 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'left', 'Dragging collapsed pill to left edge must magnetically set dock edge to left');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'left');

  // Expanding the dock restores from the docked margin
  dock.setDockCollapsed(false);
  assert.strictEqual(dock.dockEdge, 'left');

  // 3. Floating panel dropped onto the dock body re-docks automatically
  dock.floatPanel('test-dock-panel');
  assert.strictEqual(dock.panels.get('test-dock-panel').isFloating, true);
  dock.dockElement.getBoundingClientRect = () => ({ top: 0, left: 0, width: 380, height: 700, right: 380, bottom: 700 });
  const pHeader = panel.querySelector('.panel-header');
  pHeader.dispatchEvent({ type: 'pointerdown', pointerId: 2, clientX: 500, clientY: 200, target: pHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 100, clientY: 200 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 2, clientX: 100, clientY: 200 });
  assert.strictEqual(dock.panels.get('test-dock-panel').isFloating, false, 'Dropping floating panel over dock body must re-dock it');

  // 4. CSS declarations verify all 4 margins are styled and edge switcher is always visible
  const css = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(css.includes('[data-dock-edge="left"] .workspace-dock'));
  assert.ok(css.includes('[data-dock-edge="right"] .workspace-dock'));
  assert.ok(css.includes('[data-dock-edge="top"] .workspace-dock'));
  assert.ok(css.includes('[data-dock-edge="bottom"] .workspace-dock'));
  assert.ok(css.includes('.dock-edge-switcher {') && !css.includes('.dock-edge-switcher {\n    display: none !important;'));
});

test('WorkspaceDockManager: Expanded Dock is Freely Draggable to Any Margin and Supports Edge Buttons', () => {
  globalThis.localStorage?.clear?.();
  const root = new MockDOMElement('div', 'circle-explorer');
  const viewContainer = new MockDOMElement('div', 'view-container', 'main-view');
  root.appendChild(viewContainer);
  const panel = new MockDOMElement('div', 'ui-panel', 'test-expanded-panel');
  panel.appendChild(new MockDOMElement('div', 'panel-header'));
  root.appendChild(panel);

  const dock = new WorkspaceDockManager(root);
  assert.strictEqual(dock.isCollapsed, false, 'Dock must start expanded');
  assert.strictEqual(dock.dockEdge, 'left', 'Dock default edge must be left');

  // 1. Dragging expanded dock header towards right margin moves and docks to right
  const dockHeader = dock.dockElement.querySelector('.workspace-dock-header');
  root.getBoundingClientRect = () => ({ top: 0, left: 0, width: 1000, height: 700 });
  dock.dockElement.getBoundingClientRect = () => ({ top: 0, left: 0, width: 380, height: 700 });

  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 50, clientY: 20, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 900, clientY: 20 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'right', 'Dragging expanded dock to right edge must magnetically dock it to right');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'right');

  // 2. Dragging expanded dock towards top margin
  dock.dockElement.getBoundingClientRect = () => ({ top: 0, left: 620, width: 380, height: 700 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 700, clientY: 500, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 700, clientY: 10 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'top', 'Dragging expanded dock to top edge must magnetically dock it to top');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'top');

  // 3. Dragging expanded dock towards bottom margin
  dock.dockElement.getBoundingClientRect = () => ({ top: 0, left: 0, width: 1000, height: 340 });
  dockHeader.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 500, clientY: 50, target: dockHeader, preventDefault: () => {} });
  mockWin.dispatchEvent({ type: 'pointermove', clientX: 500, clientY: 670 });
  mockWin.dispatchEvent({ type: 'pointerup', pointerId: 1 });
  assert.strictEqual(dock.dockEdge, 'bottom', 'Dragging expanded dock to bottom edge must magnetically dock it to bottom');
  assert.strictEqual(root.getAttribute('data-dock-edge'), 'bottom');

  // 4. Clicking edge switcher buttons [ ⬅ | ➡ | ⬆ | ⬇ ] immediately docks to that edge
  const leftBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="left"]');
  leftBtn.dispatchEvent({ type: 'click', target: leftBtn, stopPropagation: () => {}, preventDefault: () => {} });
  assert.strictEqual(dock.dockEdge, 'left', 'Clicking left edge button must immediately dock to left');

  const rightBtn = dock.dockElement.querySelector('.dock-edge-btn[data-edge="right"]');
  rightBtn.dispatchEvent({ type: 'click', target: rightBtn, stopPropagation: () => {}, preventDefault: () => {} });
  assert.strictEqual(dock.dockEdge, 'right', 'Clicking right edge button must immediately dock to right');

  // 5. Double clicking header toggles collapse
  dockHeader.dispatchEvent({ type: 'dblclick', target: dockHeader, stopPropagation: () => {} });
  assert.strictEqual(dock.isCollapsed, true, 'Double-clicking expanded dock header must collapse it');

  dockHeader.dispatchEvent({ type: 'click', target: dockHeader, stopPropagation: () => {} });
  assert.strictEqual(dock.isCollapsed, false, 'Clicking collapsed header without drag must expand it');
});

test('Workspace Windowing System: Panel Header Typography & Zero Heading Leakage Invariant across all visuals', () => {
  const dockCss = fs.readFileSync(path.join(rootDir, 'css', 'workspace-dock.css'), 'utf8');
  const visualCss = fs.readFileSync(path.join(rootDir, 'css', 'visual.css'), 'utf8');
  const circleVisualCss = fs.readFileSync(path.join(rootDir, 'css', 'circle-visual.css'), 'utf8');

  // Verify typography resets exist in workspace-dock.css, visual.css, and circle-visual.css
  for (const [name, css] of [['workspace-dock.css', dockCss], ['visual.css', visualCss], ['circle-visual.css', circleVisualCss]]) {
    assert.ok(
      css.includes('font-size: 0.875rem !important;') &&
      css.includes('font-weight: 700 !important;') &&
      css.includes('max-width: none !important;') &&
      css.includes('white-space: nowrap !important;'),
      `${name} must enforce 0.875rem font size, font-weight 700, max-width none, and white-space nowrap on panel headers`
    );
  }

  // Verify all 12 visualizer index.html files have no conflicting inline 0.95rem styles on panel headers
  const visualFiles = [
    'visuals/circle-theorems/alternate-segment/index.html',
    'visuals/circle-theorems/angle-at-centre/index.html',
    'visuals/circle-theorems/angles-in-same-segment/index.html',
    'visuals/circle-theorems/cyclic-quadrilateral/index.html',
    'visuals/circle-theorems/perpendicular-chord-bisector/index.html',
    'visuals/circle-theorems/tangent-radius/index.html',
    'visuals/circle-theorems/tangents-from-external-point/index.html',
    'visuals/circle-theorems/thales-theorem/index.html',
    'visuals/trigonometry/angle-sum-identities/index.html',
    'visuals/trigonometry/law-of-cosines/index.html',
    'visuals/trigonometry/law-of-sines/index.html',
    'visuals/trigonometry/unit-circle-helix/index.html'
  ];

  for (const relPath of visualFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(!content.includes('style="font-size: 0.95rem'), `${relPath} must not contain conflicting inline font-size on panel headers`);
  }
});
