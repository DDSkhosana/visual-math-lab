/**
 * WorkspaceDockManager
 * Unified Dockable Edge Container & Floating Omni-Resize Window Manager.
 *
 * Capabilities:
 * 1. Dock Container: Dockable to left, right, bottom, or top edge of viewport.
 * 2. Dock Collapse: One-click minimize to a sleek mini icon strip along the edge.
 * 3. Float & Dock Pipeline: Lift any panel out to float anywhere; dock it back seamlessly.
 * 4. 8-Directional Omni-Resizing: N, S, E, W, NW, NE, SW, SE handles for floating windows.
 * 5. Panels Visibility Tray: Dropdown checklist to show/hide/restore any panel.
 * 6. Z-Index Focus Management: Brings active floating window to top of the stack.
 * 7. Viewport Clamping & Strict Zero-Overflow Guarantee.
 */

const STORAGE_KEY = 'vml_workspace_dock_state';

import { stepSpring, VelocityTracker, computeEdgeSnapTarget } from './motion-physics.js';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export class WorkspaceDockManager {
  constructor(rootContainer = null, options = {}) {
    const defaultDoc = typeof document !== 'undefined' ? document : null;
    this.doc = rootContainer?.ownerDocument || options.document || defaultDoc;
    this.win = (this.doc && this.doc.defaultView) || (typeof window !== 'undefined' ? window : globalThis);
    this.root = rootContainer || (this.doc ? (this.doc.querySelector('.circle-explorer') || this.doc.querySelector('.thales-explorer') || this.doc.body) : null);
    this.options = options;
    this.dockEdge = 'left'; // 'left' | 'right' | 'top' | 'bottom'
    this.isCollapsed = false;
    this.collapsedPos = null; // { x, y }
    this.dockSizeVertical = 380; // px
    this.dockSizeHorizontal = 340; // px
    this.dockSize = 380; // px
    this.panels = new Map(); // id -> { element, header, title, isFloating, isHidden, lastPos, handles }
    this.topZIndex = 40;
    this.activePanelId = null;
    this.activeSectionHeader = null;
    this.breadcrumbBar = null;

    if (this.root && this.doc) {
      this.#initContainers();
      this.#loadPersistedState();
      this.#discoverAndRegisterPanels();
      this.collapseAllSubComponents();
      this.#setupGlobalListeners();
      this.updateDockEmptyState();
      this.updateBreadcrumb();
    }
  }

  #initContainers() {
    this.root.classList.add('has-workspace-dock');
    this.root.setAttribute('data-dock-edge', this.dockEdge);
    this.deduceViewport();

    // 1. Floating Workspace Layer (Overlay directly above the Canvas container)
    this.floatingLayer = this.root.querySelector('.floating-workspace');
    if (!this.floatingLayer) {
      this.floatingLayer = this.doc.createElement('div');
      this.floatingLayer.className = 'floating-workspace';
      const viewContainer = this.root.querySelector('.view-container') || this.root.querySelector('#main-view');
      const parentOfView = viewContainer && (viewContainer.parentNode || viewContainer.parentElement);
      if (parentOfView) {
        parentOfView.insertBefore(this.floatingLayer, viewContainer.nextSibling);
      } else {
        this.root.appendChild(this.floatingLayer);
      }
    }

    // 2. Dock Container Structure
    this.dockElement = this.root.querySelector('.workspace-dock');
    if (!this.dockElement) {
      this.dockElement = this.doc.createElement('aside');
      this.dockElement.className = 'workspace-dock';
      this.dockElement.setAttribute('role', 'region');
      this.dockElement.setAttribute('aria-label', 'Workspace Panels Dock');
      this.dockElement.style.setProperty('--dock-size', `${this.dockSize}px`);

      // Header
      const header = this.doc.createElement('div');
      header.className = 'workspace-dock-header';

      const titleGroup = this.doc.createElement('div');
      titleGroup.className = 'dock-title-group';
      titleGroup.title = 'Workspace Window Manager (Drag when collapsed, double-click to reset)';
      titleGroup.innerHTML = `
        <span class="dock-drag-handle" title="Drag to reposition capsule pill" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/>
          </svg>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        <span>Dock</span>
      `;
      header.appendChild(titleGroup);

      const controlsGroup = this.doc.createElement('div');
      controlsGroup.className = 'dock-controls-group';

      // Edge Switcher [ ⬅ | ➡ | ⬇ | ⬆ ]
      const edgeSwitcher = this.doc.createElement('div');
      edgeSwitcher.className = 'dock-edge-switcher';
      edgeSwitcher.setAttribute('role', 'group');
      edgeSwitcher.setAttribute('aria-label', 'Dock placement position');

      const edges = [
        { edge: 'left', icon: '⬅', title: 'Dock Left' },
        { edge: 'right', icon: '➡', title: 'Dock Right' },
        { edge: 'top', icon: '⬆', title: 'Dock Top' },
        { edge: 'bottom', icon: '⬇', title: 'Dock Bottom' },
      ];
      edges.forEach(({ edge, icon, title }) => {
        const btn = this.doc.createElement('button');
        btn.type = 'button';
        btn.className = `dock-edge-btn ${this.dockEdge === edge ? 'active' : ''}`;
        btn.setAttribute('data-edge', edge);
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.textContent = icon;
        edgeSwitcher.appendChild(btn);
      });
      controlsGroup.appendChild(edgeSwitcher);

      // Panels tray dropdown
      const trayWrapper = this.doc.createElement('div');
      trayWrapper.style.position = 'relative';

      const trayBtn = this.doc.createElement('button');
      trayBtn.type = 'button';
      trayBtn.className = 'dock-tray-btn';
      trayBtn.id = 'dock-panels-tray-btn';
      trayBtn.setAttribute('aria-expanded', 'false');
      trayBtn.setAttribute('aria-haspopup', 'true');
      trayBtn.title = 'Panels checklist (show/hide/restore)';
      trayBtn.innerHTML = `<span>🗂 Panels</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      trayWrapper.appendChild(trayBtn);

      const trayDropdown = this.doc.createElement('div');
      trayDropdown.className = 'panels-tray-dropdown';
      trayDropdown.id = 'dock-panels-tray-dropdown';
      trayDropdown.hidden = true;
      trayDropdown.setAttribute('role', 'menu');
      trayDropdown.setAttribute('aria-label', 'Available Workspace Panels');

      const trayHeader = this.doc.createElement('div');
      trayHeader.className = 'tray-dropdown-header';
      trayHeader.textContent = 'Active Panels';
      trayDropdown.appendChild(trayHeader);

      const trayItems = this.doc.createElement('div');
      trayItems.className = 'tray-dropdown-items';
      trayItems.id = 'dock-tray-items-container';
      trayDropdown.appendChild(trayItems);

      trayWrapper.appendChild(trayDropdown);
      controlsGroup.appendChild(trayWrapper);

      // Dock Collapse / Minimize Button
      const collapseBtn = this.doc.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'dock-collapse-btn';
      collapseBtn.id = 'dock-collapse-btn';
      collapseBtn.title = 'Collapse / Minimize Dock strip';
      collapseBtn.setAttribute('aria-label', 'Collapse Dock');
      collapseBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="11 19 4 12 11 5"></polyline>
          <polyline points="18 19 11 12 18 5"></polyline>
        </svg>
      `;
      controlsGroup.appendChild(collapseBtn);

      header.appendChild(controlsGroup);
      this.dockElement.appendChild(header);

      // Breadcrumb Navigation Bar
      const breadcrumbBar = this.#createBreadcrumbBar();
      this.dockElement.appendChild(breadcrumbBar);

      // Dock Body
      const dockBody = this.doc.createElement('div');
      dockBody.className = 'workspace-dock-body';
      dockBody.id = 'workspace-dock-body';
      this.dockElement.appendChild(dockBody);

      // Dock Resizer
      const dockResizer = this.doc.createElement('div');
      dockResizer.className = 'dock-resizer';
      dockResizer.id = 'workspace-dock-resizer';
      dockResizer.title = 'Drag to resize dock';
      this.dockElement.appendChild(dockResizer);

      // Insert dock into explorer layout
      const viewContainer = this.root.querySelector('.view-container') || this.root.querySelector('#main-view');
      const parentOfView = viewContainer && (viewContainer.parentNode || viewContainer.parentElement);
      if (parentOfView) {
        parentOfView.insertBefore(this.dockElement, viewContainer);
      } else {
        this.root.prepend(this.dockElement);
      }
    }

    this.dockBody = this.dockElement.querySelector('#workspace-dock-body');
    this.dockResizer = this.dockElement.querySelector('#workspace-dock-resizer');
    this.trayBtn = this.dockElement.querySelector('#dock-panels-tray-btn');
    this.trayDropdown = this.dockElement.querySelector('#dock-panels-tray-dropdown');
    this.trayItemsContainer = this.dockElement.querySelector('#dock-tray-items-container');
    this.collapseBtn = this.dockElement.querySelector('#dock-collapse-btn');

    this.breadcrumbBar = this.dockElement.querySelector('.dock-breadcrumb-bar');
    if (!this.breadcrumbBar && this.doc?.createElement && this.dockBody) {
      this.breadcrumbBar = this.#createBreadcrumbBar();
      this.dockElement.insertBefore(this.breadcrumbBar, this.dockBody);
    }

    this.#bindDockHeaderEvents();
    this.#bindDockResizer();
    this.#bindCollapsedDockDrag();
  }

  #createBreadcrumbBar() {
    const breadcrumbBar = this.doc.createElement('nav');
    breadcrumbBar.className = 'dock-breadcrumb-bar';
    breadcrumbBar.id = 'workspace-dock-breadcrumbs';
    breadcrumbBar.setAttribute('aria-label', 'Workspace Navigation Hierarchy');

    const dockCrumb = this.doc.createElement('button');
    dockCrumb.type = 'button';
    dockCrumb.className = 'breadcrumb-item breadcrumb-dock';
    dockCrumb.textContent = 'Dock';
    dockCrumb.title = 'Workspace Dock Level (Click to focus dock)';
    dockCrumb.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      const dockTitle = this.dockElement?.querySelector('.dock-title-group, #dock-collapse-btn');
      if (dockTitle) {
        if (!dockTitle.hasAttribute?.('tabindex')) dockTitle.setAttribute?.('tabindex', '-1');
        dockTitle.focus?.();
      }
      this.updateBreadcrumb(null, null);
    });
    breadcrumbBar.appendChild(dockCrumb);

    const sep1 = this.doc.createElement('span');
    sep1.className = 'breadcrumb-sep sep-panel';
    sep1.textContent = '▸';
    breadcrumbBar.appendChild(sep1);

    const panelCrumb = this.doc.createElement('button');
    panelCrumb.type = 'button';
    panelCrumb.className = 'breadcrumb-item breadcrumb-panel';
    panelCrumb.textContent = 'Panels';
    panelCrumb.title = 'Active Panel Level (Click to jump to panel)';
    panelCrumb.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      if (this.activePanelId) this.jumpToPanel(this.activePanelId);
    });
    breadcrumbBar.appendChild(panelCrumb);

    const sep2 = this.doc.createElement('span');
    sep2.className = 'breadcrumb-sep sep-section';
    sep2.textContent = '▸';
    sep2.style.display = 'none';
    breadcrumbBar.appendChild(sep2);

    const sectionCrumb = this.doc.createElement('button');
    sectionCrumb.type = 'button';
    sectionCrumb.className = 'breadcrumb-item breadcrumb-section';
    sectionCrumb.textContent = '';
    sectionCrumb.title = 'Active Section Level (Click to focus section)';
    sectionCrumb.style.display = 'none';
    sectionCrumb.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      if (this.activeSectionHeader) {
        this.activeSectionHeader.focus?.();
      }
    });
    breadcrumbBar.appendChild(sectionCrumb);

    return breadcrumbBar;
  }

  #bindDockHeaderEvents() {
    // 1. Edge buttons
    const edgeBtns = this.dockElement.querySelectorAll('.dock-edge-btn');
    edgeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const edge = btn.getAttribute('data-edge');
        this.setDockEdge(edge);
      });
    });

    // 2. Tray toggle
    if (this.trayBtn && this.trayDropdown) {
      this.trayBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        const isHidden = this.trayDropdown.hidden;
        this.trayDropdown.hidden = !isHidden;
        this.trayBtn.setAttribute('aria-expanded', String(isHidden));
        if (isHidden) {
          const dockRect = this.dockElement?.getBoundingClientRect?.() || { top: 50 };
          const winHeight = this.win?.innerHeight || 700;
          const shouldFlipUp = dockRect.top > winHeight * 0.65;
          this.trayDropdown.classList.toggle('flip-up', shouldFlipUp);
        }
      });

      this.doc?.addEventListener('click', (e) => {
        if (!this.dockElement.contains(e.target)) {
          this.trayDropdown.hidden = true;
          this.trayBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 3. Collapse toggle
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setDockCollapsed(!this.isCollapsed);
      });
    }

    // Expand when clicking header while collapsed (unless dragging or clicking buttons)
    const header = this.dockElement.querySelector('.workspace-dock-header');
    if (header) {
      header.addEventListener('click', (e) => {
        if (this.isCollapsed && !e.target.closest('button')) {
          if (this.dockElement.classList.contains('is-dragging')) return;
          this.setDockCollapsed(false);
        }
      });
      header.addEventListener('dblclick', (e) => {
        if (this.isCollapsed) {
          e.stopPropagation();
          const initX = 16;
          const initY = 56;
          this.dockElement.style.left = `${initX}px`;
          this.dockElement.style.top = `${initY}px`;
          this.collapsedPos = { x: initX, y: initY };
          this.#persistState();
        }
      });
    }
  }

  #bindCollapsedDockDrag() {
    const header = this.dockElement.querySelector('.workspace-dock-header');
    if (!header) return;

    header.addEventListener('pointerdown', (e) => {
      if (!this.isCollapsed) return;
      if (e.target.closest('button, input, select, a')) return;
      e.preventDefault();
      try {
        if (header.setPointerCapture) header.setPointerCapture(e.pointerId);
      } catch (_) {}

      const startX = e.clientX;
      const startY = e.clientY;
      const dockRect = this.dockElement.getBoundingClientRect();
      const parentRect = this.root.getBoundingClientRect();

      const startLeft = dockRect.left - parentRect.left;
      const startTop = dockRect.top - parentRect.top;

      let hasDragged = false;

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        if (!hasDragged && Math.hypot(dx, dy) > 3) {
          hasDragged = true;
          this.dockElement.classList.add('is-dragging');
        }
        if (!hasDragged) return;

        const maxLeft = Math.max(0, parentRect.width - (dockRect.width || 120));
        const maxTop = Math.max(0, parentRect.height - (dockRect.height || 40));

        const nextX = clamp(startLeft + dx, 0, maxLeft);
        const nextY = clamp(startTop + dy, 0, maxTop);

        this.dockElement.style.left = `${nextX}px`;
        this.dockElement.style.top = `${nextY}px`;
        this.dockElement.style.right = 'auto';
        this.dockElement.style.bottom = 'auto';

        this.collapsedPos = { x: nextX, y: nextY };
      };

      const onUp = (upEv) => {
        try {
          if (header.hasPointerCapture?.(upEv.pointerId)) {
            header.releasePointerCapture(upEv.pointerId);
          }
        } catch (_) {}
        this.dockElement.classList.remove('is-dragging');
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);

        if (hasDragged) {
          // Magnetic edge snapping (within 24px of edge) using quadratic potential well
          const snapMargin = 12;
          const snapDist = 24;
          const maxLeft = Math.max(0, parentRect.width - (dockRect.width || 120));
          const maxTop = Math.max(0, parentRect.height - (dockRect.height || 40));
          let { x, y } = this.collapsedPos;
          x = computeEdgeSnapTarget(x, 0, maxLeft, snapDist, snapMargin);
          y = computeEdgeSnapTarget(y, 0, maxTop, snapDist, snapMargin);

          this.collapsedPos = { x, y };
          this.dockElement.style.left = `${x}px`;
          this.dockElement.style.top = `${y}px`;
          this.#persistState();
        }
      };

      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  #bindDockResizer() {
    if (!this.dockResizer) return;
    this.dockResizer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        if (this.dockResizer.setPointerCapture) this.dockResizer.setPointerCapture(e.pointerId);
      } catch (_) {}
      this.dockResizer.classList.add('active');

      const isHorizontalEdge = this.dockEdge === 'left' || this.dockEdge === 'right';
      const rootRect = this.root.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = this.dockSize;

      const onMove = (moveEv) => {
        let newSize = startSize;
        if (this.dockEdge === 'left') {
          newSize = startSize + (moveEv.clientX - startX);
          newSize = clamp(newSize, 280, Math.floor(rootRect.width * 0.65));
          this.dockSizeVertical = newSize;
        } else if (this.dockEdge === 'right') {
          newSize = startSize - (moveEv.clientX - startX);
          newSize = clamp(newSize, 280, Math.floor(rootRect.width * 0.65));
          this.dockSizeVertical = newSize;
        } else if (this.dockEdge === 'top') {
          newSize = startSize + (moveEv.clientY - startY);
          const maxDockH = Math.max(220, Math.floor((rootRect.height || this.win?.innerHeight || 800) * 0.85));
          newSize = clamp(newSize, 160, maxDockH);
          this.dockSizeHorizontal = newSize;
          this.dockElement.style.height = `${newSize}px`;
        } else if (this.dockEdge === 'bottom') {
          newSize = startSize - (moveEv.clientY - startY);
          const maxDockH = Math.max(220, Math.floor((rootRect.height || this.win?.innerHeight || 800) * 0.85));
          newSize = clamp(newSize, 160, maxDockH);
          this.dockSizeHorizontal = newSize;
          this.dockElement.style.height = `${newSize}px`;
        }

        this.dockSize = newSize;
        this.dockElement.style.setProperty('--dock-size', `${newSize}px`);
      };

      const onUp = (upEv) => {
        try {
          if (this.dockResizer.hasPointerCapture?.(upEv.pointerId)) {
            this.dockResizer.releasePointerCapture(upEv.pointerId);
          }
        } catch (_) {}
        this.dockResizer.classList.remove('active');
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);
        this.#persistState();
        this.#dispatchResize();
      };

      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  setDockEdge(edge) {
    if (!['left', 'right', 'top', 'bottom'].includes(edge)) return;
    this.dockEdge = edge;
    this.root.setAttribute('data-dock-edge', edge);

    const isHorizontal = edge === 'top' || edge === 'bottom';
    this.dockSize = isHorizontal ? this.dockSizeHorizontal : this.dockSizeVertical;
    this.dockElement.style.setProperty('--dock-size', `${this.dockSize}px`);

    if (!this.isCollapsed) {
      this.dockElement.style.left = '';
      this.dockElement.style.top = '';
      this.dockElement.style.right = '';
      this.dockElement.style.bottom = '';
      if (isHorizontal) {
        this.dockElement.style.width = '100%';
        this.dockElement.style.height = `${this.dockSize}px`;
      } else {
        this.dockElement.style.width = `${this.dockSize}px`;
        this.dockElement.style.height = '100%';
      }
    }

    // Update active button state
    this.dockElement.querySelectorAll('.dock-edge-btn').forEach((btn) => {
      const isActive = btn.getAttribute('data-edge') === edge;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    this.syncSubpanelOverlayState();
    this.#persistState();
  }

  setDockCollapsed(collapsed) {
    this.isCollapsed = Boolean(collapsed);
    this.dockElement.classList.toggle('is-collapsed', this.isCollapsed);
    this.root?.classList?.toggle('dock-is-collapsed', this.isCollapsed);

    if (this.isCollapsed) {
      if (this.collapsedPos) {
        const parentRect = this.root?.getBoundingClientRect?.() || { width: 1000, height: 700 };
        const maxL = Math.max(8, (parentRect.width || 1000) - 100);
        const maxT = Math.max(8, (parentRect.height || 700) - 45);
        this.collapsedPos.x = clamp(this.collapsedPos.x, 8, maxL);
        this.collapsedPos.y = clamp(this.collapsedPos.y, 8, maxT);
        this.dockElement.style.left = `${this.collapsedPos.x}px`;
        this.dockElement.style.top = `${this.collapsedPos.y}px`;
        this.dockElement.style.right = 'auto';
        this.dockElement.style.bottom = 'auto';
      } else {
        const parentRect = this.root.getBoundingClientRect();
        let initX = 16;
        let initY = 56;
        if (this.dockEdge === 'right') {
          initX = Math.max(16, (parentRect.width || 1000) - 160);
          initY = 16;
        } else if (this.dockEdge === 'bottom') {
          initX = 16;
          initY = Math.max(16, (parentRect.height || 700) - 48);
        } else if (this.dockEdge === 'top') {
          initX = 16;
          initY = 16;
        }
        this.dockElement.style.left = `${initX}px`;
        this.dockElement.style.top = `${initY}px`;
        this.dockElement.style.right = 'auto';
        this.dockElement.style.bottom = 'auto';
        this.collapsedPos = { x: initX, y: initY };
      }
    } else {
      this.dockElement.style.left = '';
      this.dockElement.style.top = '';
      this.dockElement.style.right = '';
      this.dockElement.style.bottom = '';
      this.dockElement.style.width = '';
      this.dockElement.style.height = '';
    }

    if (this.collapseBtn) {
      this.collapseBtn.title = this.isCollapsed ? 'Expand Dock strip' : 'Collapse / Minimize Dock strip';
      this.collapseBtn.setAttribute('aria-label', this.isCollapsed ? 'Expand Dock' : 'Collapse Dock');
      this.collapseBtn.innerHTML = this.isCollapsed
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 19 4 12 11 5"></polyline><polyline points="18 19 11 12 18 5"></polyline></svg>`;
    }
    this.#persistState();
  }

  #discoverAndRegisterPanels() {
    // Discover all standard panels in visual (Controls, Derivations, 2D Toolbar, 3D Toolbar, etc.)
    const panelElements = Array.from(this.root.querySelectorAll('.ui-panel'));
    panelElements.forEach((panelEl, idx) => {
      this.registerPanel(panelEl, { defaultIndex: idx });
    });
  }

  registerPanel(panelElement, meta = {}) {
    if (!panelElement || this.panels.has(panelElement.id)) return;
    const id = panelElement.id || `panel-${Math.random().toString(36).substring(2, 9)}`;
    panelElement.id = id;

    const header = panelElement.querySelector('.panel-header') || panelElement.querySelector('h1, h2, h3')?.parentElement;
    const titleText =
      panelElement.querySelector('h1, h2, h3, .panel-title')?.textContent?.trim() ||
      panelElement.querySelector('.panel-header')?.textContent?.trim() ||
      id;

    const record = {
      id,
      element: panelElement,
      header,
      title: titleText,
      isFloating: false,
      isHidden: false,
      lastPos: {
        x: 30 + (meta.defaultIndex || 0) * 35,
        y: 60 + (meta.defaultIndex || 0) * 35,
        width: Math.min(380, (this.win?.innerWidth || 1200) - 60),
        height: 380,
      },
      handles: [],
    };

    this.panels.set(id, record);
    this.#enhancePanelHeader(record);
    this.#attachOmniResizeHandles(record);
    this.#enableFloatingDrag(record);

    // Make section headers keyboard-accessible roving targets
    const subHeaders = panelElement.querySelectorAll ? panelElement.querySelectorAll('.collapsible-header, .derivation-card-header') : [];
    subHeaders.forEach((h) => {
      if (!h.hasAttribute?.('tabindex')) {
        h.setAttribute?.('tabindex', '0');
      }
      if (!h.hasAttribute?.('role')) {
        h.setAttribute?.('role', 'button');
      }
    });

    if (record.header && !record.header.hasAttribute?.('tabindex')) {
      record.header.setAttribute?.('tabindex', '-1');
    }

    if (!this.activePanelId) {
      this.activePanelId = id;
    }

    // Initial placement: default into the dock body unless marked floating
    if (!panelElement.classList.contains('is-floating')) {
      this.dockBody.appendChild(panelElement);
      this.collapseSubComponents(panelElement);
    } else {
      this.floatPanel(id);
    }

    this.#renderTrayItems();
    this.updateDockEmptyState();
    this.updateBreadcrumb(this.activePanelId, null);
  }

  collapseSubComponents(container) {
    if (!container) return;
    // 1. Collapsible sections inside panel
    const sections = container.querySelectorAll ? container.querySelectorAll('.collapsible-section') : [];
    sections.forEach((sec) => {
      sec.classList.add('collapsed');
      sec.classList.remove('is-subpanel-overlay');
      const header = sec.querySelector ? sec.querySelector('.collapsible-header') : null;
      if (header) {
        header.setAttribute('aria-expanded', 'false');
        header.classList.remove('open');
        const icon = header.querySelector ? header.querySelector('.icon') : null;
        if (icon) icon.textContent = '▶';
      }
      const content = sec.querySelector ? sec.querySelector('.collapsible-content') : null;
      if (content) {
        content.classList.remove('open');
        content.classList.add('collapsed');
      }
    });

    // 2. Derivation cards inside panel
    const cards = container.querySelectorAll ? container.querySelectorAll('.derivation-card') : [];
    cards.forEach((card) => {
      card.classList.remove('open');
      card.classList.remove('is-subpanel-overlay');
      const header = card.querySelector ? card.querySelector('.derivation-card-header') : null;
      if (header) {
        header.classList.remove('open');
        header.setAttribute('aria-expanded', 'false');
        const icon = header.querySelector ? header.querySelector('.icon') : null;
        if (icon) icon.textContent = '▶';
      }
      const content = card.querySelector ? card.querySelector('.derivation-card-content') : null;
      if (content) {
        content.classList.remove('open');
      }
    });

    // 3. Panel expand all buttons & body classes
    const panels = container.querySelectorAll ? container.querySelectorAll('.ui-panel') : [];
    panels.forEach((p) => {
      p.classList.remove('has-expanded-subpanel');
      const b = p.querySelector ? p.querySelector('.panel-body') : null;
      if (b) b.classList.remove('is-all-expanded');
      syncPanelElevationTurn(p);
    });

    const expandBtns = container.querySelectorAll ? container.querySelectorAll('.panel-expand-btn, [id$="-expand"]') : [];
    expandBtns.forEach((btn) => {
      if (btn.id === 'nav-visuals-btn' || btn.classList?.contains?.('site-nav__dropdown-trigger')) return;
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Expand all sections';
      const label = btn.querySelector ? btn.querySelector('.panel-expand-label') : null;
      if (label) label.textContent = 'Expand All';
      const icon = btn.querySelector ? btn.querySelector('.panel-expand-icon') : null;
      if (icon) {
        icon.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="7 8 12 13 17 8"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`;
      }
    });
  }

  collapseAllSubComponents() {
    if (this.dockBody) {
      this.collapseSubComponents(this.dockBody);
    }
  }

  syncSubpanelOverlayState(container = this.dockBody) {
    if (!container) return;
    const panels = container.querySelectorAll ? container.querySelectorAll('.ui-panel') : [];
    panels.forEach((panel) => {
      const body = panel.querySelector ? panel.querySelector('.panel-body') : null;
      if (!body) return;
      const sections = Array.from(body.querySelectorAll ? body.querySelectorAll('.collapsible-section') : []);
      const cards = Array.from(body.querySelectorAll ? body.querySelectorAll('.derivation-card') : []);

      const openSections = sections.filter((s) => !s.classList.contains('collapsed'));
      const openCards = cards.filter((c) => {
        const h = c.querySelector ? c.querySelector('.derivation-card-header') : null;
        return c.classList.contains('open') || Boolean(h?.classList.contains('open'));
      });

      const totalOpen = openSections.length + openCards.length;
      const isSingle = totalOpen === 1;

      panel.classList.toggle('has-expanded-subpanel', totalOpen > 0);
      body.classList.toggle('is-all-expanded', totalOpen > 1);

      sections.forEach((s) => {
        const isOpen = !s.classList.contains('collapsed');
        s.classList.toggle('is-subpanel-overlay', isSingle && isOpen);
      });

      cards.forEach((c) => {
        const h = c.querySelector ? c.querySelector('.derivation-card-header') : null;
        const isOpen = c.classList.contains('open') || Boolean(h?.classList.contains('open'));
        c.classList.toggle('is-subpanel-overlay', isSingle && isOpen);
      });

      syncPanelElevationTurn(panel);
    });
  }

  #enhancePanelHeader(record) {
    let actionsContainer = record.element.querySelector('.panel-header-actions');
    if (!actionsContainer && record.header) {
      actionsContainer = this.doc.createElement('div');
      actionsContainer.className = 'panel-header-actions';
      record.header.appendChild(actionsContainer);
    }
    if (!actionsContainer) return;

    // 1. Pop-out / Dock Toggle Button [ ⧉ / 🗁 ]
    let dockToggleBtn = actionsContainer.querySelector('.panel-dock-toggle-btn');
    if (!dockToggleBtn) {
      dockToggleBtn = this.doc.createElement('button');
      dockToggleBtn.type = 'button';
      dockToggleBtn.className = 'panel-window-btn panel-dock-toggle-btn';
      dockToggleBtn.setAttribute('aria-label', 'Pop out panel to floating window or dock back');
      dockToggleBtn.title = 'Pop out to floating window';
      dockToggleBtn.innerHTML = `⧉`;
      actionsContainer.prepend(dockToggleBtn);

      dockToggleBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        if (record.isFloating) {
          this.dockPanel(record.id);
        } else {
          this.floatPanel(record.id);
        }
      });
    }
    record.dockToggleBtn = dockToggleBtn;

    // 2. Shade / Roll Up Toggle Button [ ─ ]
    let shadeBtn = actionsContainer.querySelector('.panel-shade-btn');
    if (!shadeBtn) {
      shadeBtn = this.doc.createElement('button');
      shadeBtn.type = 'button';
      shadeBtn.className = 'panel-window-btn panel-shade-btn';
      shadeBtn.setAttribute('aria-label', 'Roll up or restore window');
      shadeBtn.title = 'Roll up / restore window';
      shadeBtn.innerHTML = `─`;
      actionsContainer.appendChild(shadeBtn);

      shadeBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        record.element.classList.toggle('is-shaded');
        shadeBtn.innerHTML = record.element.classList.contains('is-shaded') ? `□` : `─`;
      });
    }
    record.shadeBtn = shadeBtn;

    // 3. Remove / Hide Button [ ✕ ]
    let closeBtn = actionsContainer.querySelector('.panel-close-btn');
    if (!closeBtn) {
      closeBtn = this.doc.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'panel-window-btn panel-close-btn';
      closeBtn.setAttribute('aria-label', 'Close panel (restore from Panels menu)');
      closeBtn.title = 'Close panel';
      closeBtn.innerHTML = `✕`;
      actionsContainer.appendChild(closeBtn);

      closeBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        this.setPanelVisible(record.id, false);
      });
    }
    record.closeBtn = closeBtn;

    // Header double-click to shade/roll-up panel
    if (record.header && !record.header._hasShadeBound) {
      record.header._hasShadeBound = true;
      record.header.addEventListener('dblclick', (e) => {
        if (!e.target.closest('button, input, select, a')) {
          e.stopPropagation?.();
          record.element.classList.toggle('is-shaded');
          if (shadeBtn) {
            shadeBtn.innerHTML = record.element.classList.contains('is-shaded') ? `□` : `─`;
          }
        }
      });
    }
  }

  #attachOmniResizeHandles(record) {
    const directions = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
    directions.forEach((dir) => {
      const handle = this.doc.createElement('div');
      handle.className = `omni-handle omni-${dir}`;
      handle.setAttribute('data-handle', dir);
      record.element.appendChild(handle);
      record.handles.push(handle);
      this.#enableHandleResize(record, handle, dir);
    });
  }

  #enableHandleResize(record, handle, dir) {
    handle.addEventListener('pointerdown', (e) => {
      if (!record.isFloating) return;
      e.stopPropagation();
      e.preventDefault();
      try {
        if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
      } catch (_) {}
      handle.classList.add('active');
      this.#focusPanel(record);

      const panel = record.element;
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      const parentRect = this.floatingLayer.getBoundingClientRect();

      const startLeft = rect.left - parentRect.left;
      const startTop = rect.top - parentRect.top;
      const startW = rect.width;
      const startH = rect.height;

      const minW = 260;
      const minH = 140;
      const maxW = parentRect.width - 20;
      const maxH = parentRect.height - 20;

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newL = startLeft;
        let newT = startTop;

        // East / West
        if (dir.includes('e')) {
          newW = clamp(startW + dx, minW, maxW);
        } else if (dir.includes('w')) {
          newW = clamp(startW - dx, minW, maxW);
          const actualDx = startW - newW;
          newL = startLeft + actualDx;
        }

        // South / North
        if (dir.includes('s')) {
          newH = clamp(startH + dy, minH, maxH);
        } else if (dir.includes('n')) {
          newH = clamp(startH - dy, minH, maxH);
          const actualDy = startH - newH;
          newT = startTop + actualDy;
        }

        panel.style.width = `${newW}px`;
        panel.style.height = `${newH}px`;
        panel.style.left = `${Math.max(0, newL)}px`;
        panel.style.top = `${Math.max(0, newT)}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        record.lastPos = { x: newL, y: newT, width: newW, height: newH };
      };

      const onUp = (upEv) => {
        try {
          if (handle.hasPointerCapture?.(upEv.pointerId)) {
            handle.releasePointerCapture(upEv.pointerId);
          }
        } catch (_) {}
        handle.classList.remove('active');
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);
        this.#persistState();
      };

      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  #enableFloatingDrag(record) {
    const { header, element: panel } = record;
    if (!header) return;

    header.addEventListener('pointerdown', (e) => {
      if (!record.isFloating || e.target.closest('button, input, select, a')) return;
      e.preventDefault();
      try {
        if (header.setPointerCapture) header.setPointerCapture(e.pointerId);
      } catch (_) {}
      this.#focusPanel(record);

      const startX = e.clientX;
      const startY = e.clientY;
      const panelRect = panel.getBoundingClientRect();
      const parentRect = this.floatingLayer.getBoundingClientRect();

      const startLeft = panelRect.left - parentRect.left;
      const startTop = panelRect.top - parentRect.top;

      const maxLeft = parentRect.width - panelRect.width;
      const maxTop = parentRect.height - panelRect.height;

      const onMove = (moveEv) => {
        const nextX = clamp(startLeft + (moveEv.clientX - startX), 0, Math.max(0, maxLeft));
        const nextY = clamp(startTop + (moveEv.clientY - startY), 0, Math.max(0, maxTop));

        panel.style.left = `${nextX}px`;
        panel.style.top = `${nextY}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        record.lastPos.x = nextX;
        record.lastPos.y = nextY;
      };

      const onUp = (upEv) => {
        try {
          if (header.hasPointerCapture?.(upEv.pointerId)) {
            header.releasePointerCapture(upEv.pointerId);
          }
        } catch (_) {}
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);

        // Apply magnetic edge potential well to floating panel
        const curX = record.lastPos.x;
        const curY = record.lastPos.y;
        const snappedX = computeEdgeSnapTarget(curX, 0, Math.max(0, maxLeft), 24, 12);
        const snappedY = computeEdgeSnapTarget(curY, 0, Math.max(0, maxTop), 24, 12);
        if (snappedX !== curX || snappedY !== curY) {
          panel.style.left = `${snappedX}px`;
          panel.style.top = `${snappedY}px`;
          record.lastPos.x = snappedX;
          record.lastPos.y = snappedY;
        }

        this.#persistState();
      };

      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  floatPanel(panelId) {
    const record = this.panels.get(panelId);
    if (!record) return;

    record.isFloating = true;
    const panel = record.element;
    panel.classList.add('is-floating');

    // Move DOM node into floating layer
    this.floatingLayer.appendChild(panel);

    // Apply remembered coordinates
    const pos = record.lastPos;
    panel.style.position = 'absolute';
    panel.style.left = `${pos.x}px`;
    panel.style.top = `${pos.y}px`;
    panel.style.width = `${pos.width}px`;
    panel.style.height = pos.height ? `${pos.height}px` : 'auto';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';

    if (record.dockToggleBtn) {
      record.dockToggleBtn.innerHTML = `🗁`;
      record.dockToggleBtn.title = 'Dock back into sidebar';
      record.dockToggleBtn.setAttribute('aria-label', 'Dock panel back into sidebar');
    }

    this.#focusPanel(record);
    this.#persistState();
    this.updateDockEmptyState();
  }

  dockPanel(panelId) {
    const record = this.panels.get(panelId);
    if (!record) return;

    record.isFloating = false;
    const panel = record.element;
    panel.classList.remove('is-floating', 'is-focused');

    // Reset inline floating styles so it fits neatly into the dock body
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.zIndex = '';

    // Move DOM node back to dock body
    this.dockBody.appendChild(panel);
    this.collapseSubComponents(panel);

    if (record.dockToggleBtn) {
      record.dockToggleBtn.innerHTML = `⧉`;
      record.dockToggleBtn.title = 'Pop out to floating window';
      record.dockToggleBtn.setAttribute('aria-label', 'Pop out panel to floating window');
    }

    this.#persistState();
    this.updateDockEmptyState();
  }

  setPanelVisible(panelId, visible) {
    const record = this.panels.get(panelId);
    if (!record) return;

    record.isHidden = !visible;
    record.element.hidden = !visible;
    record.element.style.display = visible ? '' : 'none';

    this.#renderTrayItems();
    this.#persistState();
    this.updateDockEmptyState();
  }

  updateDockEmptyState() {
    if (!this.dockBody) return;
    const dockedPanels = Array.from(this.panels.values()).filter((p) => !p.isFloating);
    const visibleDocked = dockedPanels.filter((p) => !p.isHidden);
    let emptyNotice = this.dockBody.querySelector ? this.dockBody.querySelector('.dock-empty-notice') : null;

    if (visibleDocked.length === 0 && this.panels.size > 0) {
      if (!emptyNotice && this.doc?.createElement) {
        emptyNotice = this.doc.createElement('div');
        emptyNotice.className = 'dock-empty-notice';

        const iconEl = this.doc.createElement('div');
        iconEl.className = 'dock-empty-icon';
        iconEl.textContent = '🗂';
        emptyNotice.appendChild(iconEl);

        const titleEl = this.doc.createElement('div');
        titleEl.className = 'dock-empty-title';
        emptyNotice.appendChild(titleEl);

        const textEl = this.doc.createElement('p');
        textEl.className = 'dock-empty-text';
        emptyNotice.appendChild(textEl);

        const restoreBtn = this.doc.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'dock-empty-restore-btn';
        restoreBtn.id = 'btn-dock-restore-all';
        emptyNotice.appendChild(restoreBtn);

        this.dockBody.appendChild(emptyNotice);
      }

      if (emptyNotice) {
        const titleEl = emptyNotice.querySelector ? emptyNotice.querySelector('.dock-empty-title') : null;
        const textEl = emptyNotice.querySelector ? emptyNotice.querySelector('.dock-empty-text') : null;
        const restoreBtn = emptyNotice.querySelector ? emptyNotice.querySelector('.dock-empty-restore-btn') : null;

        if (dockedPanels.length > 0) {
          if (titleEl) titleEl.textContent = 'All Docked Panels Hidden';
          if (textEl) textEl.textContent = 'Open Panels menu above to restore views, or click below:';
          if (restoreBtn) {
            restoreBtn.textContent = 'Restore Panels';
            restoreBtn.onclick = (e) => {
              e?.stopPropagation?.();
              this.panels.forEach((_, id) => this.setPanelVisible(id, true));
            };
            restoreBtn.addEventListener?.('click', (e) => {
              e?.stopPropagation?.();
              this.panels.forEach((_, id) => this.setPanelVisible(id, true));
            });
          }
        } else {
          if (titleEl) titleEl.textContent = 'All Panels Floating';
          if (textEl) textEl.textContent = 'Panels are detached as floating windows in workspace:';
          if (restoreBtn) {
            restoreBtn.textContent = 'Dock All Panels';
            restoreBtn.onclick = (e) => {
              e?.stopPropagation?.();
              this.panels.forEach((p, id) => {
                if (p.isFloating) this.dockPanel(id);
              });
              this.#renderTrayItems();
            };
            restoreBtn.addEventListener?.('click', (e) => {
              e?.stopPropagation?.();
              this.panels.forEach((p, id) => {
                if (p.isFloating) this.dockPanel(id);
              });
              this.#renderTrayItems();
            });
          }
        }
        emptyNotice.style.display = 'flex';
      }
    } else if (emptyNotice) {
      emptyNotice.style.display = 'none';
    }
  }

  jumpToPanel(panelId) {
    const record = this.panels.get(panelId);
    if (!record) return;

    if (record.isHidden) {
      this.setPanelVisible(panelId, true);
    }

    if (!record.isFloating && this.isCollapsed) {
      this.setDockCollapsed(false);
    }

    if (record.isFloating) {
      this.#focusPanel(record);
    } else {
      try {
        record.element.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } catch (_) {}
    }

    if (record.header) {
      if (!record.header.hasAttribute?.('tabindex')) {
        record.header.setAttribute?.('tabindex', '-1');
      }
      record.header.focus?.();
    }

    this.activePanelId = panelId;
    this.updateBreadcrumb(panelId, null);
  }

  updateBreadcrumb(panelId = null, sectionTitle = null) {
    if (!this.dockElement) return;
    const breadcrumbBar = this.dockElement.querySelector ? this.dockElement.querySelector('.dock-breadcrumb-bar') : null;
    if (!breadcrumbBar) return;

    const panelCrumb = breadcrumbBar.querySelector ? breadcrumbBar.querySelector('.breadcrumb-panel') : null;
    const sep2 = breadcrumbBar.querySelector ? breadcrumbBar.querySelector('.sep-section') : null;
    const sectionCrumb = breadcrumbBar.querySelector ? breadcrumbBar.querySelector('.breadcrumb-section') : null;

    if (panelId && this.panels.has(panelId)) {
      this.activePanelId = panelId;
      const record = this.panels.get(panelId);
      if (panelCrumb) {
        panelCrumb.textContent = record.title || panelId;
        panelCrumb.title = `Jump to ${record.title}`;
        panelCrumb.style.display = '';
      }
    } else if (panelId === null && !this.activePanelId && this.panels.size > 0) {
      const firstRecord = Array.from(this.panels.values())[0];
      if (firstRecord && panelCrumb) {
        this.activePanelId = firstRecord.id;
        panelCrumb.textContent = firstRecord.title || firstRecord.id;
        panelCrumb.style.display = '';
      }
    }

    if (sectionTitle) {
      if (sep2) sep2.style.display = '';
      if (sectionCrumb) {
        let displayTitle = sectionTitle.trim();
        if (displayTitle.length > 20) displayTitle = displayTitle.slice(0, 18) + '…';
        sectionCrumb.textContent = displayTitle;
        sectionCrumb.title = `Focus "${sectionTitle}"`;
        sectionCrumb.style.display = '';
      }
    } else {
      if (sep2) sep2.style.display = 'none';
      if (sectionCrumb) sectionCrumb.style.display = 'none';
    }
  }

  #focusPanel(record) {
    this.panels.forEach((p) => p.element.classList.remove('is-focused'));
    record.element.classList.add('is-focused');
    record.element.style.zIndex = ++this.topZIndex;
  }

  #renderTrayItems() {
    if (!this.trayItemsContainer) return;
    this.trayItemsContainer.innerHTML = '';

    this.panels.forEach((record) => {
      const row = this.doc.createElement('div');
      row.className = 'tray-item-row';

      const label = this.doc.createElement('label');
      label.className = 'tray-item-label';

      const checkbox = this.doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !record.isHidden;

      checkbox.addEventListener('change', () => {
        this.setPanelVisible(record.id, checkbox.checked);
        if (checkbox.checked && this.isCollapsed && !record.isFloating) {
          this.setDockCollapsed(false);
          try {
            record.element?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
          } catch (_) {}
        }
      });

      const span = this.doc.createElement('span');
      span.textContent = record.title + (record.isFloating ? ' ⧉' : '');

      label.appendChild(checkbox);
      label.appendChild(span);
      row.appendChild(label);

      // Quick Float / Re-dock Button per panel directly in tray
      const floatBtn = this.doc.createElement('button');
      floatBtn.type = 'button';
      floatBtn.className = 'tray-item-float-btn';
      floatBtn.title = record.isFloating ? 'Dock panel back to sidebar' : 'Pop out panel to floating window';
      floatBtn.setAttribute('aria-label', record.isFloating ? `Dock ${record.title}` : `Float ${record.title}`);
      floatBtn.textContent = record.isFloating ? '🗁' : '⧉';
      floatBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        if (record.isFloating) {
          this.dockPanel(record.id);
        } else {
          this.floatPanel(record.id);
        }
        this.#renderTrayItems();
      });
      row.appendChild(floatBtn);

      this.trayItemsContainer.appendChild(row);
    });

    // Tray Batch Actions Footer
    if (this.trayDropdown && !this.trayDropdown.querySelector('.tray-dropdown-footer')) {
      const footer = this.doc.createElement('div');
      footer.className = 'tray-dropdown-footer';

      const showAllBtn = this.doc.createElement('button');
      showAllBtn.type = 'button';
      showAllBtn.className = 'tray-footer-btn';
      showAllBtn.id = 'tray-btn-show-all';
      showAllBtn.title = 'Show all panels';
      showAllBtn.textContent = 'Show All';
      showAllBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        this.panels.forEach((_, id) => this.setPanelVisible(id, true));
      });
      footer.appendChild(showAllBtn);

      const dockAllBtn = this.doc.createElement('button');
      dockAllBtn.type = 'button';
      dockAllBtn.className = 'tray-footer-btn';
      dockAllBtn.id = 'tray-btn-dock-all';
      dockAllBtn.title = 'Dock all floating windows';
      dockAllBtn.textContent = 'Dock All';
      dockAllBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        this.panels.forEach((p, id) => {
          if (p.isFloating) this.dockPanel(id);
        });
        this.#renderTrayItems();
      });
      footer.appendChild(dockAllBtn);

      const collapseAllBtn = this.doc.createElement('button');
      collapseAllBtn.type = 'button';
      collapseAllBtn.className = 'tray-footer-btn';
      collapseAllBtn.id = 'tray-btn-collapse-all';
      collapseAllBtn.title = 'Collapse all panel sections';
      collapseAllBtn.textContent = 'Collapse All';
      collapseAllBtn.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        this.collapseAllSubComponents();
      });
      footer.appendChild(collapseAllBtn);

      this.trayDropdown.appendChild(footer);
    }
  }

  #dispatchResize() {
    try {
      const evt = typeof CustomEvent !== 'undefined' ? new CustomEvent('resize') : { type: 'resize' };
      this.win?.dispatchEvent?.(evt);
    } catch (_) {}
  }

  #setupGlobalListeners() {
    // Elevate focus on click anywhere on a floating panel
    this.floatingLayer?.addEventListener?.('pointerdown', (e) => {
      const panel = e.target.closest?.('.ui-panel.is-floating');
      if (panel) {
        const record = this.panels.get(panel.id);
        if (record) this.#focusPanel(record);
      }
    });

    // Ensure floating windows stay within viewport bounds on window resize
    this.win?.addEventListener?.('resize', () => {
      this.deduceViewport();
      if (this.floatingLayer) {
        const parentRect = this.floatingLayer.getBoundingClientRect();
        this.panels.forEach((record) => {
          if (!record.isFloating || record.isHidden) return;
          const panel = record.element;
          const curLeft = parseFloat(panel.style.left) || 0;
          const curTop = parseFloat(panel.style.top) || 0;
          const maxL = Math.max(0, parentRect.width - (panel.offsetWidth || 300));
          const maxT = Math.max(0, parentRect.height - (panel.offsetHeight || 200));
          panel.style.left = `${clamp(curLeft, 0, maxL)}px`;
          panel.style.top = `${clamp(curTop, 0, maxT)}px`;
        });
      }
      if (this.isCollapsed && this.collapsedPos && this.root) {
        const rootRect = this.root.getBoundingClientRect?.() || { width: 1000, height: 700 };
        const maxL = Math.max(8, (rootRect.width || 1000) - 100);
        const maxT = Math.max(8, (rootRect.height || 700) - 45);
        this.collapsedPos.x = clamp(this.collapsedPos.x, 8, maxL);
        this.collapsedPos.y = clamp(this.collapsedPos.y, 8, maxT);
        this.dockElement.style.left = `${this.collapsedPos.x}px`;
        this.dockElement.style.top = `${this.collapsedPos.y}px`;
      }
    });

    // Auto-sync sub-panel overlay state on click interactions inside docked panels
    this.dockBody?.addEventListener?.('click', (e) => {
      if (e.target?.closest?.('.collapsible-header, .panel-expand-btn, [id$="-expand"], [id$="-btn"], .panel-minimize-btn')) {
        setTimeout(() => this.syncSubpanelOverlayState(), 0);
      }
    });

    // 1. Hierarchical Focus & Click Tracking for Breadcrumbs
    const handleHierarchyTrack = (e) => {
      const panel = e.target?.closest?.('.ui-panel');
      const section = e.target?.closest?.('.collapsible-section, .derivation-card');
      const secHeader = section?.querySelector?.('.collapsible-header, .derivation-card-header');
      const secTitle = secHeader?.textContent ? secHeader.textContent.replace(/[▶▼◀▲]/g, '').trim() : null;

      if (panel) {
        this.activePanelId = panel.id;
        if (secHeader) this.activeSectionHeader = secHeader;
        this.updateBreadcrumb(panel.id, secTitle);
      }
    };
    this.root?.addEventListener?.('focusin', handleHierarchyTrack);
    this.root?.addEventListener?.('click', handleHierarchyTrack);

    // 2. Elevation Turn Event Tracking
    this.root?.addEventListener?.('panelelevationturn', (e) => {
      const { panel, activeSubpanel, title } = e.detail || {};
      if (panel) {
        this.activePanelId = panel.id;
        if (activeSubpanel) {
          const h = activeSubpanel.querySelector?.('.collapsible-header, .derivation-card-header');
          if (h) this.activeSectionHeader = h;
        }
        this.updateBreadcrumb(panel.id, title);
      }
    });

    // 3. Global Shortcuts: Panel Jumps (Alt + 1..9), Panel Cycling (Alt + Arrow), Floating Window Cycle (Alt + \)
    this.doc?.addEventListener?.('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        // Alt + 1..9: Direct panel jump
        if (e.key >= '1' && e.key <= '9') {
          const panelIndex = parseInt(e.key, 10) - 1;
          const panelRecords = Array.from(this.panels.values());
          if (panelIndex < panelRecords.length) {
            e.preventDefault?.();
            e.stopPropagation?.();
            this.jumpToPanel(panelRecords[panelIndex].id);
            return;
          }
        }

        // Alt + ArrowDown / Alt + ArrowUp: Navigate between sibling panels
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const panelRecords = Array.from(this.panels.values());
          if (panelRecords.length > 0) {
            e.preventDefault?.();
            e.stopPropagation?.();
            const currId = this.activePanelId || panelRecords[0].id;
            const currIdx = panelRecords.findIndex((p) => p.id === currId);
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            const nextIdx = (currIdx + delta + panelRecords.length) % panelRecords.length;
            this.jumpToPanel(panelRecords[nextIdx].id);
            return;
          }
        }

        // Alt + \: Cycle floating window focus
        if (e.key === '\\') {
          const floatingRecords = Array.from(this.panels.values()).filter((p) => p.isFloating && !p.isHidden);
          if (floatingRecords.length > 0) {
            e.preventDefault?.();
            e.stopPropagation?.();
            const currFocused = floatingRecords.find((p) => p.element.classList.contains('is-focused'));
            const currIdx = currFocused ? floatingRecords.indexOf(currFocused) : -1;
            const nextIdx = (currIdx + 1) % floatingRecords.length;
            this.#focusPanel(floatingRecords[nextIdx]);
            const header = floatingRecords[nextIdx].header;
            if (header) {
              if (!header.hasAttribute?.('tabindex')) header.setAttribute?.('tabindex', '-1');
              header.focus?.();
            }
            this.updateBreadcrumb(floatingRecords[nextIdx].id, null);
            return;
          }
        }
      }
    });

    // 4. Roving Arrow Navigation between Level 2 Section Headers
    this.root?.addEventListener?.('keydown', (e) => {
      const header = e.target?.closest?.('.collapsible-header, .derivation-card-header');
      if (!header) return;

      const panel = header.closest?.('.ui-panel');
      if (!panel) return;

      const allHeaders = Array.from(
        panel.querySelectorAll?.('.collapsible-header, .derivation-card-header') || []
      );
      const currIdx = allHeaders.indexOf(header);
      if (currIdx === -1) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault?.();
        e.stopPropagation?.();
        const nextIdx = (currIdx + 1) % allHeaders.length;
        allHeaders[nextIdx]?.focus?.();
        this.activeSectionHeader = allHeaders[nextIdx];
        this.updateBreadcrumb(panel.id, allHeaders[nextIdx]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault?.();
        e.stopPropagation?.();
        const prevIdx = (currIdx - 1 + allHeaders.length) % allHeaders.length;
        allHeaders[prevIdx]?.focus?.();
        this.activeSectionHeader = allHeaders[prevIdx];
        this.updateBreadcrumb(panel.id, allHeaders[prevIdx]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'Home') {
        e.preventDefault?.();
        e.stopPropagation?.();
        allHeaders[0]?.focus?.();
        this.activeSectionHeader = allHeaders[0];
        this.updateBreadcrumb(panel.id, allHeaders[0]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'End') {
        e.preventDefault?.();
        e.stopPropagation?.();
        allHeaders[allHeaders.length - 1]?.focus?.();
        this.activeSectionHeader = allHeaders[allHeaders.length - 1];
        this.updateBreadcrumb(panel.id, allHeaders[allHeaders.length - 1]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'ArrowRight') {
        // If section is open, ArrowRight moves focus to the first interactive input/button inside
        const section = header.closest?.('.collapsible-section, .derivation-card');
        const isOpen = !section?.classList.contains('collapsed') &&
          (section?.classList.contains('open') || header.classList.contains('open') || header.getAttribute?.('aria-expanded') === 'true');
        if (isOpen) {
          const content = section?.querySelector?.('.collapsible-content, .derivation-card-content');
          const firstInteractive = content?.querySelector?.('button, input, select, [tabindex="0"]');
          if (firstInteractive) {
            e.preventDefault?.();
            e.stopPropagation?.();
            firstInteractive.focus?.();
          }
        }
      }
    });

    // 5. The Escape Ladder: Universal Hierarchical Ascending
    this.doc?.addEventListener?.('keydown', (e) => {
      if (e.key !== 'Escape') return;

      const activeEl = this.doc.activeElement;
      if (!activeEl || activeEl === this.doc.body) return;

      // Case 1: Inside a Level 3 section content (slider, input, button)
      const content = activeEl.closest?.('.collapsible-content, .derivation-card-content');
      if (content) {
        const section = content.closest?.('.collapsible-section, .derivation-card');
        const header = section?.querySelector?.('.collapsible-header, .derivation-card-header');
        if (header) {
          e.preventDefault?.();
          e.stopPropagation?.();
          header.focus?.();
          this.activeSectionHeader = header;
          const panel = section?.closest?.('.ui-panel');
          if (panel) this.updateBreadcrumb(panel.id, header.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
          return;
        }
      }

      // Case 2: On a Level 2 Section Header
      const sectionHeader = activeEl.closest?.('.collapsible-header, .derivation-card-header');
      if (sectionHeader) {
        const section = sectionHeader.closest?.('.collapsible-section, .derivation-card');
        const panel = sectionHeader.closest?.('.ui-panel');
        const isOpen = !section?.classList.contains('collapsed') &&
          (section?.classList.contains('open') || sectionHeader.classList.contains('open') || sectionHeader.getAttribute?.('aria-expanded') === 'true');

        if (isOpen) {
          // If open, collapse section
          e.preventDefault?.();
          e.stopPropagation?.();
          sectionHeader.click?.();
          return;
        } else if (panel) {
          // If already collapsed, ascend to parent Level 1 Panel Header
          e.preventDefault?.();
          e.stopPropagation?.();
          const panelHeader = panel.querySelector?.('.panel-header') || panel;
          if (!panelHeader.hasAttribute?.('tabindex')) panelHeader.setAttribute?.('tabindex', '-1');
          panelHeader.focus?.();
          this.updateBreadcrumb(panel.id, null);
          return;
        }
      }

      // Case 3: On a Level 1 Panel Header or actions
      const panelHeader = activeEl.closest?.('.panel-header');
      if (panelHeader) {
        e.preventDefault?.();
        e.stopPropagation?.();
        const dockTitle = this.dockElement?.querySelector?.('.dock-title-group, #dock-collapse-btn');
        if (dockTitle) {
          if (!dockTitle.hasAttribute?.('tabindex')) dockTitle.setAttribute?.('tabindex', '-1');
          dockTitle.focus?.();
        }
        this.updateBreadcrumb(null, null);
        return;
      }
    });

    // 6. Keyboard navigation for Elevation Turns ([ and ])
    this.doc?.addEventListener?.('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(this.doc.activeElement?.tagName)) return;
      if (e.key === '[' || e.key === ']') {
        const panels = this.dockBody?.querySelectorAll?.('.ui-panel') || [];
        for (const panel of panels) {
          const deck = panel.querySelector?.('.panel-elevation-deck');
          if (deck && deck.style.display !== 'none') {
            const navBtn = deck.querySelector?.(`.elevation-deck-nav-btn.${e.key === '[' ? 'prev' : 'next'}`);
            if (navBtn) {
              e.preventDefault?.();
              if (typeof navBtn.click === 'function') {
                navBtn.click();
              } else {
                navBtn.dispatchEvent?.({ type: 'click' });
              }
              break;
            }
          }
        }
      }
    });
  }

  deduceViewport() {
    if (!this.root) return;
    const w = this.win?.innerWidth || this.root.getBoundingClientRect?.()?.width || 1200;
    const isCompact = w <= 768;
    this.root.setAttribute?.('data-viewport', isCompact ? 'compact' : 'regular');
    this.dockElement?.setAttribute?.('data-viewport', isCompact ? 'compact' : 'regular');
  }

  #persistState() {
    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : (this.win?.localStorage || null);
      if (!storage) return;
      const panelStates = {};
      this.panels.forEach((p, id) => {
        panelStates[id] = {
          isFloating: p.isFloating,
          isHidden: p.isHidden,
          lastPos: p.lastPos,
        };
      });
      const data = {
        dockEdge: this.dockEdge,
        isCollapsed: this.isCollapsed,
        dockSize: this.dockSize,
        dockSizeVertical: this.dockSizeVertical,
        dockSizeHorizontal: this.dockSizeHorizontal,
        collapsedPos: this.collapsedPos,
        panels: panelStates,
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  #loadPersistedState() {
    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : (this.win?.localStorage || null);
      if (!storage) return;
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.dockSizeVertical) this.dockSizeVertical = data.dockSizeVertical;
      if (data.dockSizeHorizontal) this.dockSizeHorizontal = data.dockSizeHorizontal;
      if (data.dockEdge) this.setDockEdge(data.dockEdge);
      if (data.dockSize) {
        this.dockSize = data.dockSize;
        const isHorizontal = this.dockEdge === 'top' || this.dockEdge === 'bottom';
        if (isHorizontal) this.dockSizeHorizontal = data.dockSize;
        else this.dockSizeVertical = data.dockSize;
        this.dockElement.style.setProperty('--dock-size', `${data.dockSize}px`);
      }
      if (data.collapsedPos) this.collapsedPos = data.collapsedPos;
      if (data.isCollapsed !== undefined) this.setDockCollapsed(data.isCollapsed);
      this.savedPanelStates = data.panels || {};
    } catch (_) {}
  }
}

/**
 * Convenience helper to initialize the workspace dock manager across any visual page.
 */
export function initWorkspaceDock(root = null, options = {}) {
  return new WorkspaceDockManager(root, options);
}

/**
 * Synchronizes elevation levels and turn-taking deck when panels have bounded dock height.
 * - Level 1: Base panel surface (.ui-panel).
 * - Level 2: Subpanels (.collapsible-section, .derivation-card). When multiple subpanels are
 *            expanded, they take turns being at the top ([data-elevation-turn="top"] / .is-elevated-top),
 *            with an interactive Elevation Deck Bar (.panel-elevation-deck) displaying navigation pills.
 * - Level 3: Nested controls and components inside an elevated subpanel.
 *
 * @param {HTMLElement} panel - The .ui-panel container.
 * @param {HTMLElement|null} preferredActiveElement - Optional subpanel or child requesting the top turn.
 */
export function syncPanelElevationTurn(panel, preferredActiveElement = null, options = {}) {
  if (!panel) return;
  const body = panel.querySelector ? panel.querySelector('.panel-body') : null;
  if (!body) return;

  const sections = Array.from(body.querySelectorAll ? body.querySelectorAll('.collapsible-section') : []);
  const cards = Array.from(body.querySelectorAll ? body.querySelectorAll('.derivation-card') : []);
  const allSubpanels = [...sections, ...cards];

  const isOpen = (sub) => {
    if (sub.classList.contains('collapsible-section')) {
      return !sub.classList.contains('collapsed');
    }
    const h = sub.querySelector ? sub.querySelector('.derivation-card-header') : null;
    return sub.classList.contains('open') || Boolean(h?.classList.contains('open'));
  };

  const openSubpanels = allSubpanels.filter(isOpen);
  const totalOpen = openSubpanels.length;

  panel.setAttribute?.('data-elevation-level', '1');

  // Deck container inside the panel body
  let deck = body.querySelector ? body.querySelector('.panel-elevation-deck') : null;

  if (totalOpen <= 1) {
    if (deck) {
      deck.style.display = 'none';
      if (Array.isArray(deck.children)) {
        deck.children.length = 0;
      }
      if (typeof deck.replaceChildren === 'function') {
        deck.replaceChildren();
      } else if (deck.innerHTML !== undefined) {
        deck.innerHTML = '';
      }
    }
    allSubpanels.forEach((sub) => {
      sub.removeAttribute?.('data-elevation-turn');
      sub.classList?.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
      if (totalOpen === 1 && isOpen(sub)) {
        sub.setAttribute?.('data-elevation-level', '2');
      } else {
        sub.removeAttribute?.('data-elevation-level');
      }
    });
    try {
      const activeSingle = totalOpen === 1 ? openSubpanels[0] : null;
      const h = activeSingle?.querySelector?.('.collapsible-header, .derivation-card-header');
      const title = h?.textContent ? h.textContent.replace(/[▶▼◀▲]/g, '').trim() : null;
      const evt = typeof CustomEvent !== 'undefined'
        ? new CustomEvent('panelelevationturn', { bubbles: true, detail: { panel, activeSubpanel: activeSingle, title } })
        : { type: 'panelelevationturn', bubbles: true, detail: { panel, activeSubpanel: activeSingle, title } };
      panel.dispatchEvent?.(evt);
    } catch (_) {}
    return;
  }

  // Multi-expand mode (totalOpen > 1): Elevation Turn-Taking Deck is active
  let activeSubpanel = null;
  if (preferredActiveElement) {
    const target = preferredActiveElement.closest
      ? preferredActiveElement.closest('.collapsible-section, .derivation-card')
      : preferredActiveElement;
    if (target && openSubpanels.includes(target)) {
      activeSubpanel = target;
    }
  }

  if (!activeSubpanel) {
    activeSubpanel = openSubpanels.find(
      (s) => s.getAttribute?.('data-elevation-turn') === 'top' || s.classList?.contains('is-elevated-top')
    );
  }

  if (!activeSubpanel) {
    activeSubpanel = openSubpanels[0];
  }

  const prevActiveSubpanel = deck?._activeSubpanel || null;
  const prevActiveIdx = prevActiveSubpanel ? openSubpanels.indexOf(prevActiveSubpanel) : -1;
  const activeIdx = openSubpanels.indexOf(activeSubpanel);

  // Compute turn animation direction (forward vs backward)
  let direction = options?.direction || null;
  if (!direction && prevActiveIdx !== -1 && activeIdx !== -1 && prevActiveIdx !== activeIdx) {
    if (prevActiveIdx === openSubpanels.length - 1 && activeIdx === 0) {
      direction = 'forward';
    } else if (prevActiveIdx === 0 && activeIdx === openSubpanels.length - 1) {
      direction = 'backward';
    } else {
      direction = activeIdx > prevActiveIdx ? 'forward' : 'backward';
    }
  }

  // Ensure deck bar container exists
  const doc = panel.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!deck && doc && doc.createElement) {
    deck = doc.createElement('div');
    deck.className = 'panel-elevation-deck';
    if (typeof body.prepend === 'function') {
      body.prepend(deck);
    } else if (typeof body.insertBefore === 'function' && body.children && body.children[0]) {
      body.insertBefore(deck, body.children[0]);
    } else if (typeof body.appendChild === 'function') {
      body.appendChild(deck);
    }
  }

  if (deck) {
    deck._panel = panel;
    deck._openSubpanels = openSubpanels;
    deck._activeSubpanel = activeSubpanel;

    if (!deck._wheelBound) {
      deck._wheelBound = true;
      deck.addEventListener?.('wheel', (wheelEv) => {
        const subs = deck._openSubpanels || [];
        if (subs.length <= 1) return;
        wheelEv.preventDefault?.();
        wheelEv.stopPropagation?.();
        const now = Date.now();
        if (deck._lastWheelTime && (now - deck._lastWheelTime < 180)) return;
        deck._lastWheelTime = now;
        const curIdx = Math.max(0, subs.indexOf(deck._activeSubpanel));
        const dy = wheelEv.deltaY || 0;
        const dx = wheelEv.deltaX || 0;
        const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
        if (delta > 0) {
          const nextIdx = (curIdx + 1) % subs.length;
          syncPanelElevationTurn(deck._panel, subs[nextIdx], { direction: 'forward' });
        } else if (delta < 0) {
          const prevIdx = (curIdx - 1 + subs.length) % subs.length;
          syncPanelElevationTurn(deck._panel, subs[prevIdx], { direction: 'backward' });
        }
      }, { passive: false });

      let touchStartX = 0;
      let touchStartY = 0;
      deck.addEventListener?.('touchstart', (tEv) => {
        const t = tEv.touches?.[0];
        if (t) {
          touchStartX = t.clientX;
          touchStartY = t.clientY;
        }
      }, { passive: true });
      deck.addEventListener?.('touchend', (tEv) => {
        const subs = deck._openSubpanels || [];
        if (subs.length <= 1) return;
        const t = tEv.changedTouches?.[0];
        if (!t) return;
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
          tEv.preventDefault?.();
          const curIdx = Math.max(0, subs.indexOf(deck._activeSubpanel));
          if (dx < 0) {
            const nextIdx = (curIdx + 1) % subs.length;
            syncPanelElevationTurn(deck._panel, subs[nextIdx], { direction: 'forward' });
          } else {
            const prevIdx = (curIdx - 1 + subs.length) % subs.length;
            syncPanelElevationTurn(deck._panel, subs[prevIdx], { direction: 'backward' });
          }
        }
      }, { passive: false });
    }

    deck.style.display = 'flex';
    if (Array.isArray(deck.children)) {
      deck.children.length = 0;
    }
    if (typeof deck.replaceChildren === 'function') {
      deck.replaceChildren();
    } else if (deck.innerHTML !== undefined) {
      deck.innerHTML = '';
    }

    if (doc && doc.createElement) {
      const badge = doc.createElement('span');
      badge.className = 'elevation-deck-label';
      badge.textContent = `Deck (${activeIdx + 1}/${openSubpanels.length})`;
      badge.title = 'Subpanels elevation deck: click any pill or scroll mousewheel to cycle turns';
      deck.appendChild(badge);

      // Previous Turn Button
      const prevBtn = doc.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'elevation-deck-nav-btn prev';
      prevBtn.title = 'Previous elevated subpanel (Shortcut: [ or Wheel Up)';
      prevBtn.setAttribute('aria-label', 'Previous subpanel');
      prevBtn.textContent = '◀';
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        const prevIdx = (activeIdx - 1 + openSubpanels.length) % openSubpanels.length;
        syncPanelElevationTurn(panel, openSubpanels[prevIdx], { direction: 'backward' });
      });
      deck.appendChild(prevBtn);

      const pillsContainer = doc.createElement('div');
      pillsContainer.className = 'elevation-deck-pills';

      openSubpanels.forEach((sub, i) => {
        const pill = doc.createElement('button');
        pill.type = 'button';
        const isCurrent = sub === activeSubpanel;
        pill.className = `elevation-deck-pill${isCurrent ? ' active' : ''}`;
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', String(isCurrent));

        const headerEl = sub.querySelector ? sub.querySelector('.collapsible-header, .derivation-card-header') : null;
        let fullTitle = headerEl?.textContent ? headerEl.textContent.replace(/[▶▼◀▲]/g, '').trim() : `Section ${i + 1}`;
        fullTitle = fullTitle.replace(/\s+/g, ' ');
        const displayTitle = fullTitle.length > 24 ? fullTitle.slice(0, 22) + '…' : fullTitle;

        pill.textContent = `${i + 1}. ${displayTitle}${isCurrent ? ' ★' : ''}`;
        pill.title = `Bring "${fullTitle}" to top elevation`;

        if (isCurrent && typeof pill.scrollIntoView === 'function') {
          try {
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } catch (_) {}
        }

        pill.addEventListener?.('click', (e) => {
          e.stopPropagation?.();
          const pDir = i > activeIdx ? 'forward' : 'backward';
          syncPanelElevationTurn(panel, sub, { direction: pDir });
        });

        pill.addEventListener?.('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault?.();
            e.stopPropagation?.();
            const nextIdx = (i + 1) % openSubpanels.length;
            syncPanelElevationTurn(panel, openSubpanels[nextIdx], { direction: 'forward' });
            const newDeck = body.querySelector?.('.panel-elevation-deck');
            const newPills = newDeck?.querySelectorAll?.('.elevation-deck-pill') || [];
            newPills[nextIdx]?.focus?.();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault?.();
            e.stopPropagation?.();
            const prevIdx = (i - 1 + openSubpanels.length) % openSubpanels.length;
            syncPanelElevationTurn(panel, openSubpanels[prevIdx], { direction: 'backward' });
            const newDeck = body.querySelector?.('.panel-elevation-deck');
            const newPills = newDeck?.querySelectorAll?.('.elevation-deck-pill') || [];
            newPills[prevIdx]?.focus?.();
          }
        });

        pillsContainer.appendChild(pill);
      });

      deck.appendChild(pillsContainer);

      // Next Turn Button
      const nextBtn = doc.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'elevation-deck-nav-btn next';
      nextBtn.title = 'Next elevated subpanel (Shortcut: ] or Wheel Down)';
      nextBtn.setAttribute('aria-label', 'Next subpanel');
      nextBtn.textContent = '▶';
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        const nextIdx = (activeIdx + 1) % openSubpanels.length;
        syncPanelElevationTurn(panel, openSubpanels[nextIdx], { direction: 'forward' });
      });
      deck.appendChild(nextBtn);

      // Mode Toggle Button (Deck / Stack)
      const isStackMode = body.getAttribute?.('data-deck-mode') === 'stack';
      const modeBtn = doc.createElement('button');
      modeBtn.type = 'button';
      modeBtn.className = `elevation-deck-mode-toggle${isStackMode ? ' is-stack' : ''}`;
      modeBtn.title = isStackMode ? 'Switch to Deck mode (strict height turns)' : 'Switch to Stack mode (scroll all sections)';
      modeBtn.textContent = isStackMode ? 'Stack ↕' : 'Deck ☵';
      modeBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        const nextMode = body.getAttribute?.('data-deck-mode') === 'stack' ? 'deck' : 'stack';
        body.setAttribute?.('data-deck-mode', nextMode);
        syncPanelElevationTurn(panel, activeSubpanel);
      });
      deck.appendChild(modeBtn);
    }
  }

  const isStackMode = body.getAttribute?.('data-deck-mode') === 'stack';
  openSubpanels.forEach((sub) => {
    sub.setAttribute?.('data-elevation-level', '2');
    const isTop = sub === activeSubpanel;
    if (isTop) {
      sub.setAttribute?.('data-elevation-turn', 'top');
      sub.classList?.add('is-elevated-top');
      sub.classList?.remove('is-in-deck');
      sub.classList?.remove('slide-forward', 'slide-backward');
      if (direction === 'forward') {
        sub.classList?.add('slide-forward');
      } else if (direction === 'backward') {
        sub.classList?.add('slide-backward');
      }

      if (!isStackMode && openSubpanels.length > 1) {
        const activeContent = sub.querySelector?.('.collapsible-content, .derivation-card-content') || sub;
        if (activeContent && !activeContent._overscrollBound) {
          activeContent._overscrollBound = true;
          activeContent.addEventListener?.('wheel', (e) => {
            if (body.getAttribute?.('data-deck-mode') === 'stack') return;
            const subs = deck?._openSubpanels || openSubpanels || [];
            if (subs.length <= 1) return;

            const isScrollable = activeContent.scrollHeight > (activeContent.clientHeight || 0) + 4;
            const atBottom = !isScrollable || (activeContent.scrollTop + (activeContent.clientHeight || 0) >= activeContent.scrollHeight - 3);
            const atTop = !isScrollable || (activeContent.scrollTop || 0) <= 2;

            if (e.deltaY > 0 && atBottom) {
              const now = Date.now();
              if (activeContent._lastTurnTime && (now - activeContent._lastTurnTime < 240)) return;
              activeContent._lastTurnTime = now;
              e.preventDefault?.();
              e.stopPropagation?.();
              const curIdx = Math.max(0, subs.indexOf(sub));
              const nextIdx = (curIdx + 1) % subs.length;
              syncPanelElevationTurn(panel, subs[nextIdx], { direction: 'forward' });
            } else if (e.deltaY < 0 && atTop) {
              const now = Date.now();
              if (activeContent._lastTurnTime && (now - activeContent._lastTurnTime < 240)) return;
              activeContent._lastTurnTime = now;
              e.preventDefault?.();
              e.stopPropagation?.();
              const curIdx = Math.max(0, subs.indexOf(sub));
              const prevIdx = (curIdx - 1 + subs.length) % subs.length;
              syncPanelElevationTurn(panel, subs[prevIdx], { direction: 'backward' });
            }
          }, { passive: false });
        }
      }
    } else {
      sub.setAttribute?.('data-elevation-turn', 'deck');
      sub.classList?.remove('is-elevated-top', 'slide-forward', 'slide-backward');
      if (isStackMode) {
        sub.classList?.remove('is-in-deck');
      } else {
        sub.classList?.add('is-in-deck');
      }
    }
  });

  allSubpanels.filter((s) => !isOpen(s)).forEach((sub) => {
    sub.removeAttribute?.('data-elevation-turn');
    sub.removeAttribute?.('data-elevation-level');
    sub.classList?.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
  });

  try {
    const h = activeSubpanel?.querySelector?.('.collapsible-header, .derivation-card-header');
    const title = h?.textContent ? h.textContent.replace(/[▶▼◀▲]/g, '').trim() : null;
    const evt = typeof CustomEvent !== 'undefined'
      ? new CustomEvent('panelelevationturn', { bubbles: true, detail: { panel, activeSubpanel, title, direction } })
      : { type: 'panelelevationturn', bubbles: true, detail: { panel, activeSubpanel, title, direction } };
    panel.dispatchEvent?.(evt);
  } catch (_) {}
}

export { stepSpring, VelocityTracker, computeEdgeSnapTarget } from './motion-physics.js';

