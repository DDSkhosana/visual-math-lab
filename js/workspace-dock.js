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

export const DOCK_POPOUT_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>`;

export const DOCK_RETURN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><path d="M16 12l-3-3m3 3l-3 3"></path></svg>`;

export const WINDOW_CLOSE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

export const WINDOW_SHADE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

export const WINDOW_UNSHADE_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const SUBPANEL_SELECTOR = '.collapsible-section, .derivation-card';

function getChildSubpanels(container) {
  return Array.from(container?.querySelectorAll?.(SUBPANEL_SELECTOR) || []).filter((sub) => {
    const parent = sub.parentElement?.closest?.(SUBPANEL_SELECTOR);
    return parent === container || !parent || !container.contains(parent);
  });
}

function subpanelTitle(sub) {
  return sub?.querySelector?.('.collapsible-header, .derivation-card-header')
    ?.textContent?.replace(/[▶▼◀▲]/g, '').replace(/\s+/g, ' ').trim() || '';
}

function elevationContext(panel, preferred = null) {
  const body = panel?.querySelector?.('.panel-body');
  const groups = getChildSubpanels(body);
  const deck = body?.querySelector?.('.panel-elevation-deck');
  const grouped = groups.some((group) => getChildSubpanels(group).length > 0);
  const group = grouped
    ? groups.find((candidate) => candidate === preferred || candidate.contains(preferred)) ||
      (groups.includes(deck?._activeGroup) ? deck._activeGroup : groups[0])
    : null;
  const children = group ? getChildSubpanels(group) : groups;
  return { body, groups, group, subpanels: children.length ? children : [group].filter(Boolean) };
}

export class WorkspaceDockManager {
  constructor(rootContainer = null, options = {}) {
    const defaultDoc = typeof document !== 'undefined' ? document : null;
    this.doc = rootContainer?.ownerDocument || options.document || defaultDoc;
    this.win = (this.doc && this.doc.defaultView) || options.win || (typeof window !== 'undefined' ? window : globalThis);
    this.root = rootContainer || (this.doc ? (this.doc.querySelector('.circle-explorer') || this.doc.querySelector('.thales-explorer') || this.doc.body) : null);
    this.options = options;
    this.dockEdge = 'left'; // 'left' | 'right' | 'top' | 'bottom'
    const startCollapsed = options.defaultCollapsed !== undefined
      ? Boolean(options.defaultCollapsed)
      : Boolean(options.startCollapsed);
    this.isCollapsed = startCollapsed;
    this.collapsedPos = null; // { x, y }
    this._hasUserDraggedCollapsedPos = false;
    this.dockSizeVertical = 380; // px
    this.dockSizeHorizontal = 340; // px
    this.dockSize = 380; // px
    this.dockSizeCustomized = { vertical: false, horizontal: false };
    this.panels = new Map(); // id -> { element, header, title, isFloating, isHidden, lastPos, handles }
    this.topZIndex = 40;
    this.activePanelId = null;
    this.activeSectionHeader = null;
    this.breadcrumbBar = null;
    this.defaultDeckMode = options.deckMode || options.defaultDeckMode || 'deck';

    if (this.root && this.doc) {
      this.#initContainers();
      if (this.isCollapsed) {
        this.setDockCollapsed(true);
      }
      this.#loadPersistedState();
      this.deduceViewport();
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
      titleGroup.title = 'Workspace Window Manager (Drag dock header to snap to any margin, click arrow buttons to switch, double-click to collapse/expand)';
      titleGroup.innerHTML = `
        <span class="dock-drag-handle" title="Drag dock to snap to any margin (Left, Right, Top, Bottom)" aria-hidden="true">
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
      dockResizer.setAttribute('role', 'separator');
      dockResizer.setAttribute('tabindex', '0');
      dockResizer.setAttribute('aria-label', 'Resize workspace dock');
      dockResizer.setAttribute('aria-controls', 'workspace-dock-body');
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
    this.#bindDockHeaderDrag();
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
      const groupSelect = this.panels.get(this.activePanelId)?.element.querySelector('.elevation-deck-group-select');
      if (groupSelect) {
        groupSelect.focus();
        return;
      }
      if (this.activeSectionHeader) {
        this.activeSectionHeader.focus?.();
      }
    });
    breadcrumbBar.appendChild(sectionCrumb);

    const sep3 = this.doc.createElement('span');
    sep3.className = 'breadcrumb-sep sep-step';
    sep3.textContent = '▸';
    sep3.style.display = 'none';
    breadcrumbBar.appendChild(sep3);
    const stepCrumb = this.doc.createElement('button');
    stepCrumb.type = 'button';
    stepCrumb.className = 'breadcrumb-item breadcrumb-step';
    stepCrumb.style.display = 'none';
    stepCrumb.addEventListener('click', () => this.activeSectionHeader?.focus?.());
    breadcrumbBar.appendChild(stepCrumb);

    return breadcrumbBar;
  }

  #bindDockHeaderEvents() {
    // 1. Edge buttons
    const edgeBtns = this.dockElement.querySelectorAll('.dock-edge-btn');
    edgeBtns.forEach((btn) => {
      const handleEdge = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const edge = btn.getAttribute('data-edge');
        if (edge) this.setDockEdge(edge);
      };
      btn.addEventListener('click', handleEdge);
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
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

      const closeTray = () => {
        if (this.trayDropdown && !this.trayDropdown.hidden) {
          this.trayDropdown.hidden = true;
          this.trayBtn?.setAttribute('aria-expanded', 'false');
        }
      };

      const handleOutside = (e) => {
        if (!this.trayDropdown || this.trayDropdown.hidden) return;
        const target = e.target;
        const isInsideTray = (this.trayDropdown.contains && this.trayDropdown.contains(target)) ||
                             (this.trayBtn && this.trayBtn.contains && this.trayBtn.contains(target));
        if (!isInsideTray) {
          closeTray();
        }
      };

      this.doc?.addEventListener?.('pointerdown', handleOutside, true);
      this.doc?.addEventListener?.('click', handleOutside);
      this.doc?.addEventListener?.('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          closeTray();
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
          if (this._justDragged) {
            this._justDragged = false;
            return;
          }
          this.setDockCollapsed(false);
        }
      });
      header.addEventListener('dblclick', (e) => {
        if (e.target.closest('button, input, select, a')) return;
        e.stopPropagation();
        if (this.isCollapsed) {
          this._hasUserDraggedCollapsedPos = false;
          const pos = this.getEdgeDefaultCollapsedPos(this.dockEdge);
          this.dockElement.style.left = `${pos.x}px`;
          this.dockElement.style.top = `${pos.y}px`;
          this.collapsedPos = pos;
          this.#persistState();
        } else {
          this.setDockCollapsed(true);
        }
      });
    }
  }

  #bindDockHeaderDrag() {
    const header = this.dockElement.querySelector('.workspace-dock-header');
    if (!header) return;

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select, a, textarea')) return;
      e.preventDefault();
      this._justDragged = false;
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
      let lastDragPos = { x: startLeft, y: startTop };
      let lastPointerPos = { x: startX, y: startY };

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        if (!hasDragged && Math.hypot(dx, dy) > 3) {
          hasDragged = true;
          this.dockElement.classList.add('is-dragging');
        }
        if (!hasDragged) return;

        const maxLeft = Math.max(0, parentRect.width - (this.isCollapsed ? (dockRect.width || 120) : Math.min(dockRect.width || 380, parentRect.width * 0.8)));
        const maxTop = Math.max(0, parentRect.height - (this.isCollapsed ? (dockRect.height || 40) : Math.min(dockRect.height || 340, parentRect.height * 0.8)));

        const nextX = clamp(startLeft + dx, 0, maxLeft);
        const nextY = clamp(startTop + dy, 0, maxTop);

        this.dockElement.style.left = `${nextX}px`;
        this.dockElement.style.top = `${nextY}px`;
        this.dockElement.style.right = 'auto';
        this.dockElement.style.bottom = 'auto';

        lastDragPos = { x: nextX, y: nextY };
        lastPointerPos = { x: moveEv.clientX, y: moveEv.clientY };
        if (this.isCollapsed) {
          this.collapsedPos = { x: nextX, y: nextY };
          this._hasUserDraggedCollapsedPos = true;
        }
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
          const maxLeft = Math.max(0, parentRect.width - (this.isCollapsed ? (dockRect.width || 120) : Math.min(dockRect.width || 380, parentRect.width * 0.8)));
          const maxTop = Math.max(0, parentRect.height - (this.isCollapsed ? (dockRect.height || 40) : Math.min(dockRect.height || 340, parentRect.height * 0.8)));

          if (this.isCollapsed) {
            this._justDragged = true;
            setTimeout(() => { this._justDragged = false; }, 350);
            const snapMargin = 12;
            const snapDist = 24;
            let { x, y } = this.collapsedPos || lastDragPos;
            const oldX = x;
            const oldY = y;
            x = computeEdgeSnapTarget(x, 0, maxLeft, snapDist, snapMargin);
            y = computeEdgeSnapTarget(y, 0, maxTop, snapDist, snapMargin);

            this.collapsedPos = { x, y };
            if (oldX !== x || oldY !== y) {
              this.dockElement.style.transition = 'left 0.18s cubic-bezier(0.16, 1, 0.3, 1), top 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
              this.dockElement.style.left = `${x}px`;
              this.dockElement.style.top = `${y}px`;
              setTimeout(() => {
                if (this.dockElement) this.dockElement.style.transition = '';
              }, 200);
            } else {
              this.dockElement.style.left = `${x}px`;
              this.dockElement.style.top = `${y}px`;
            }

            // If dragged near a margin boundary, magnetically dock to that margin
            const edgeDists = [
              { edge: 'left', dist: x },
              { edge: 'right', dist: maxLeft - x },
              { edge: 'top', dist: y },
              { edge: 'bottom', dist: maxTop - y },
            ];
            edgeDists.sort((a, b) => a.dist - b.dist);
            if (edgeDists[0].dist <= snapDist) {
              this.setDockEdge(edgeDists[0].edge);
            } else {
              this.#persistState();
            }
          } else {
            // When expanded, dragging the dock header magnetically docks to the closest/dragged margin
            const dxTotal = lastPointerPos.x - startX;
            const dyTotal = lastPointerPos.y - startY;
            let targetEdge = null;
            if (Math.hypot(dxTotal, dyTotal) > 30) {
              if (Math.abs(dxTotal) > Math.abs(dyTotal)) {
                targetEdge = dxTotal > 0 ? 'right' : 'left';
              } else {
                targetEdge = dyTotal > 0 ? 'bottom' : 'top';
              }
            } else {
              const pLeft = parentRect.left || 0;
              const pTop = parentRect.top || 0;
              const pRight = parentRect.right || (pLeft + (parentRect.width || 1000));
              const pBottom = parentRect.bottom || (pTop + (parentRect.height || 700));

              const dists = [
                { edge: 'left', dist: Math.max(0, lastPointerPos.x - pLeft) },
                { edge: 'right', dist: Math.max(0, pRight - lastPointerPos.x) },
                { edge: 'top', dist: Math.max(0, lastPointerPos.y - pTop) },
                { edge: 'bottom', dist: Math.max(0, pBottom - lastPointerPos.y) },
              ];
              dists.sort((a, b) => a.dist - b.dist);
              targetEdge = dists[0].edge;
            }
            this.setDockEdge(targetEdge);
          }
        }
      };

      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  #bindDockResizer() {
    if (!this.dockResizer) return;
    this.dockResizer.addEventListener('keydown', (e) => {
      const { edge, min, max } = this.#dockBounds();
      const horizontal = edge === 'top' || edge === 'bottom';
      const keys = horizontal ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
      if (![...keys, 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const sign = edge === 'right' || edge === 'bottom' ? -1 : 1;
      const delta = (e.key === keys[0] ? -1 : 1) * sign * (e.shiftKey ? 40 : 10);
      this.#applyDockSize(e.key === 'Home' ? min : e.key === 'End' ? max : this.dockSize + delta);
      this.#persistState();
    });
    this.dockResizer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        if (this.dockResizer.setPointerCapture) this.dockResizer.setPointerCapture(e.pointerId);
      } catch (_) {}
      this.dockResizer.classList.add('active');

      const { edge } = this.#dockBounds();
      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = this.dockSize;

      const onMove = (moveEv) => {
        const delta = edge === 'left' || edge === 'right'
          ? moveEv.clientX - startX : moveEv.clientY - startY;
        this.#applyDockSize(startSize + delta * (edge === 'right' || edge === 'bottom' ? -1 : 1));
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

  #dockBounds(overrideEdge = null) {
    const rect = this.root.getBoundingClientRect();
    const width = Math.min(rect.width || 1200, this.win?.innerWidth || 1200);
    const height = Math.min(rect.height || 800,
      (this.win?.innerHeight || 800) - Math.max(0, rect.top || 0));
    const isCompact = (this.win?.innerWidth || width) <= 768;
    const edge = overrideEdge || (isCompact ? 'bottom' : this.dockEdge);
    const horizontal = edge === 'top' || edge === 'bottom';
    const extent = Math.max(0, horizontal ? height : width);
    const max = Math.floor(extent * 0.65);
    return { edge, horizontal, extent, max, min: Math.min(horizontal ? 160 : 240, max) };
  }

  #applyDockSize(requested = null, overrideEdge = null) {
    if (!this.dockElement) return;
    const { edge, horizontal, extent, min, max } = this.#dockBounds(overrideEdge);
    const axis = horizontal ? 'horizontal' : 'vertical';
    const key = horizontal ? 'dockSizeHorizontal' : 'dockSizeVertical';
    if (requested !== null) {
      this[key] = clamp(requested, min, max);
      this.dockSizeCustomized[axis] = true;
    }
    const defaultSize = horizontal ? 340 : 380;
    const preferred = this.dockSizeCustomized[axis] ? this[key] :
      (extent >= (horizontal ? 650 : 860)
        ? defaultSize
        : Math.max(horizontal ? 280 : 340, Math.min(defaultSize, Math.floor(extent * (horizontal ? 0.45 : 0.35)))));
    this.dockSize = clamp(preferred, min, max);
    this.dockElement.style.setProperty('--dock-size', `${this.dockSize}px`);
    if (!this.isCollapsed) {
      this.dockElement.style.width = horizontal ? '100%' : `${this.dockSize}px`;
      this.dockElement.style.height = horizontal ? `${this.dockSize}px` : '100%';
    }
    this.dockResizer?.setAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
    this.dockResizer?.setAttribute('aria-valuemin', String(min));
    this.dockResizer?.setAttribute('aria-valuemax', String(max));
    this.dockResizer?.setAttribute('aria-valuenow', String(this.dockSize));
    this.dockResizer?.setAttribute('data-resize-edge', edge);
  }

  getEdgeDefaultCollapsedPos(edge) {
    const parentRect = this.root?.getBoundingClientRect?.() || { width: 1000, height: 700 };
    let initX = 16;
    let initY = 56;
    if (edge === 'right') {
      initX = Math.max(16, (parentRect.width || 1000) - 160);
      initY = 16;
    } else if (edge === 'bottom') {
      initX = 16;
      initY = Math.max(16, (parentRect.height || 700) - 48);
    } else if (edge === 'top') {
      initX = 16;
      initY = 16;
    } else if (edge === 'left') {
      initX = 16;
      initY = 56;
    }
    return { x: initX, y: initY };
  }

  setDockEdge(edge) {
    if (!['left', 'right', 'top', 'bottom'].includes(edge)) return;
    const edgeChanged = this.dockEdge !== edge;
    this.dockEdge = edge;
    this.root.setAttribute('data-dock-edge', edge);

    if (!this.isCollapsed) {
      this.dockElement.style.left = '';
      this.dockElement.style.top = '';
      this.dockElement.style.right = '';
      this.dockElement.style.bottom = '';
    }
    this.#applyDockSize(null, edge);

    // Update active button state
    this.dockElement.querySelectorAll('.dock-edge-btn').forEach((btn) => {
      const isActive = btn.getAttribute('data-edge') === edge;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    // Synchronize collapsed position with the new dock edge margin when expanded.
    // When collapsed, preserve the dragged / magnetically-snapped position.
    if (!this.isCollapsed) {
      if (!this.collapsedPos || edgeChanged || !this._hasUserDraggedCollapsedPos) {
        this.collapsedPos = this.getEdgeDefaultCollapsedPos(edge);
        if (edgeChanged) {
          this._hasUserDraggedCollapsedPos = false;
        }
      }
    } else if (!this.collapsedPos) {
      this.collapsedPos = this.getEdgeDefaultCollapsedPos(edge);
    }
    if (this.isCollapsed && this.collapsedPos) {
      this.dockElement.style.left = `${this.collapsedPos.x}px`;
      this.dockElement.style.top = `${this.collapsedPos.y}px`;
      this.dockElement.style.right = 'auto';
      this.dockElement.style.bottom = 'auto';
    }

    this.syncSubpanelOverlayState();
    this.#persistState();
  }

  setDockCollapsed(collapsed) {
    this.isCollapsed = Boolean(collapsed);
    this.dockElement.classList.toggle('is-collapsed', this.isCollapsed);
    this.root?.classList?.toggle('dock-is-collapsed', this.isCollapsed);

    if (this.isCollapsed) {
      if (!this.collapsedPos || !this._hasUserDraggedCollapsedPos) {
        this.collapsedPos = this.getEdgeDefaultCollapsedPos(this.dockEdge);
      }
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

    const defaultIndex = meta.defaultIndex || 0;
    const record = {
      id,
      element: panelElement,
      header,
      title: titleText,
      isFloating: false,
      isHidden: false,
      metaIndex: defaultIndex,
      lastPos: {
        x: 30 + defaultIndex * 35,
        y: 60 + defaultIndex * 35,
        width: Math.min(380, (this.win?.innerWidth || 1200) - 60),
        height: 380,
      },
      handles: [],
    };

    this.panels.set(id, record);
    if (id.includes('deriv') || id === 'live-derivation-panel') {
      panelElement.setAttribute?.('data-force-deck', 'true');
    }
    if (this.defaultDeckMode && this.defaultDeckMode !== 'deck') {
      const b = panelElement.querySelector?.('.panel-body');
      if (b && !b.hasAttribute?.('data-deck-mode')) {
        b.setAttribute?.('data-deck-mode', this.defaultDeckMode);
      }
    }
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

    // Ensure panel-body is visible and rendered (subcomponents remain cleanly collapsed)
    const body = panelElement.querySelector('.panel-body');
    if (body) {
      body.classList.remove('hidden');
      body.style.display = '';
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

    // 3. Panel expand all buttons & body classes. A re-docked panel is itself the container,
    // so it must resync too or its deck keeps reporting the sections that were just collapsed.
    const nestedPanels = Array.from(container.querySelectorAll ? container.querySelectorAll('.ui-panel') : []);
    const panels = container.classList?.contains('ui-panel') ? [container, ...nestedPanels] : nestedPanels;
    panels.forEach((p) => {
      p.classList.remove('has-expanded-subpanel');
      const b = p.querySelector ? p.querySelector('.panel-body') : null;
      if (b) b.classList.remove('is-all-expanded');
      // A panel collapsed on its own (registration, re-dock) announces its turn as before; when a whole
      // container is collapsed only the panel in use does, so the [ ] key target stays where it was.
      syncPanelElevationTurn(p, null, { silent: p !== container && p.id !== this.activePanelId });
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

      // Background resync: only the panel in use announces its turn, so the [ ] key target and the
      // breadcrumb do not jump to whichever docked panel happens to be synced last.
      syncPanelElevationTurn(panel, null, { silent: panel.id !== this.activePanelId });
    });
  }

  setPanelDeckMode(panelId, mode) {
    const record = this.panels.get(panelId);
    if (!record) return;
    const body = record.element.querySelector ? record.element.querySelector('.panel-body') : null;
    if (!body) return;
    body.setAttribute?.('data-deck-mode', mode);
    syncPanelElevationTurn(record.element);
  }

  getPanelDeckMode(panelId) {
    const record = this.panels.get(panelId);
    if (!record) return null;
    const body = record.element.querySelector ? record.element.querySelector('.panel-body') : null;
    return body?.getAttribute?.('data-deck-mode') || 'deck';
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
      actionsContainer.prepend(dockToggleBtn);
    }
    dockToggleBtn.title = record.isFloating ? 'Dock back into sidebar' : 'Pop out to floating window';
    dockToggleBtn.innerHTML = record.isFloating ? `🗁` : `⧉`;
    if (!dockToggleBtn._hasDockToggleBound) {
      dockToggleBtn._hasDockToggleBound = true;
      dockToggleBtn.addEventListener('pointerdown', (e) => {
        e?.stopPropagation?.();
      });
      dockToggleBtn.addEventListener('click', (e) => {
        e?.preventDefault?.();
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
      actionsContainer.appendChild(shadeBtn);
    }
    shadeBtn.title = 'Roll up / restore window';
    shadeBtn.innerHTML = record.element.classList.contains('is-shaded') ? `□` : `─`;
    if (!shadeBtn._hasShadeBound) {
      shadeBtn._hasShadeBound = true;
      shadeBtn.addEventListener('pointerdown', (e) => {
        e?.stopPropagation?.();
      });
      shadeBtn.addEventListener('click', (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.setPanelShaded(record.id);
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
    }
    if (!closeBtn._hasCloseBound) {
      closeBtn._hasCloseBound = true;
      closeBtn.addEventListener('pointerdown', (e) => {
        e?.stopPropagation?.();
      });
      closeBtn.addEventListener('click', (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.setPanelVisible(record.id, false);
      });
    }
    record.closeBtn = closeBtn;

    // Wire minBtn if present in header actions
    const minBtn = actionsContainer.querySelector('.panel-minimize-btn');
    if (minBtn && !minBtn._hasWorkspaceDockBound) {
      minBtn._hasWorkspaceDockBound = true;
      minBtn.addEventListener('pointerdown', (e) => {
        e?.stopPropagation?.();
      });
      minBtn.addEventListener('click', (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        this.setPanelShaded(record.id);
      });
    }

    // Header click to restore shaded panel, double-click to toggle shading
    if (record.header && !record.header._hasShadeBound) {
      record.header._hasShadeBound = true;
      record.header.addEventListener('click', (e) => {
        if (!e.target.closest('button, input, select, a') && record.element.classList.contains('is-shaded')) {
          e.stopPropagation?.();
          this.setPanelShaded(record.id, false);
        }
      });
      record.header.addEventListener('dblclick', (e) => {
        if (!e.target.closest('button, input, select, a')) {
          e.stopPropagation?.();
          this.setPanelShaded(record.id);
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
        handle.removeEventListener?.('pointermove', onMove);
        handle.removeEventListener?.('pointerup', onUp);
        handle.removeEventListener?.('pointercancel', onUp);
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);
        this.#persistState();
      };

      handle.addEventListener?.('pointermove', onMove);
      handle.addEventListener?.('pointerup', onUp);
      handle.addEventListener?.('pointercancel', onUp);
      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  #enableFloatingDrag(record) {
    const { header, element: panel } = record;
    if (!header) return;

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, select, a, textarea')) return;
      if (e.button !== undefined && e.button !== 0) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let hasDragged = false;
      const dragThreshold = 6;

      this.#focusPanel(record);

      let panelRect = panel.getBoundingClientRect ? panel.getBoundingClientRect() : { left: 0, top: 0, width: 380, height: 380 };
      let parentRect = this.floatingLayer?.getBoundingClientRect
        ? this.floatingLayer.getBoundingClientRect()
        : { left: 0, top: 0, width: 1200, height: 800 };

      const grabOffsetX = startX - (panelRect?.left || 0);
      const grabOffsetY = startY - (panelRect?.top || 0);

      const startLeft = (panelRect?.left || 0) - (parentRect?.left || 0);
      const startTop = (panelRect?.top || 0) - (parentRect?.top || 0);

      let maxLeft = Math.max(0, (parentRect?.width || 1200) - (record.lastPos?.width || panelRect?.width || 380));
      let maxTop = Math.max(0, (parentRect?.height || 800) - (record.lastPos?.height || panelRect?.height || 380));

      if (record.isFloating) {
        e.preventDefault?.();
        try {
          if (header.setPointerCapture) header.setPointerCapture(e.pointerId);
        } catch (_) {}
      }

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;

        if (!hasDragged) {
          const isTouchDocked = !record.isFloating && (moveEv.pointerType === 'touch' || e.pointerType === 'touch');
          const passedThreshold = record.isFloating || (
            isTouchDocked
              ? (Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy) * 1.35)
              : (Math.hypot(dx, dy) >= dragThreshold)
          );
          if (passedThreshold) {
            hasDragged = true;
            try {
              if (header.setPointerCapture) header.setPointerCapture(moveEv.pointerId || e.pointerId);
            } catch (_) {}

            if (!record.isFloating) {
              // Tear-off drag: smoothly detach & float out of the dock!
              this.floatPanel(record.id);
              if (this.floatingLayer?.getBoundingClientRect) {
                parentRect = this.floatingLayer.getBoundingClientRect();
              }
              if (panel.getBoundingClientRect) {
                panelRect = panel.getBoundingClientRect();
              }
              maxLeft = Math.max(0, (parentRect?.width || 1200) - (panelRect?.width || 380));
              maxTop = Math.max(0, (parentRect?.height || 800) - (panelRect?.height || 380));
            }
          } else {
            return;
          }
        }

        moveEv.preventDefault?.();

        const currentLeft = (record.isFloating && !hasDragged)
          ? startLeft + dx
          : (moveEv.clientX - (parentRect?.left || 0) - grabOffsetX);
        const currentTop = (record.isFloating && !hasDragged)
          ? startTop + dy
          : (moveEv.clientY - (parentRect?.top || 0) - grabOffsetY);

        const nextX = clamp(currentLeft, 0, Math.max(0, maxLeft));
        const nextY = clamp(currentTop, 0, Math.max(0, maxTop));

        panel.style.left = `${nextX}px`;
        panel.style.top = `${nextY}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        record.lastPos.x = nextX;
        record.lastPos.y = nextY;
      };

      const onUp = (upEv) => {
        try {
          if (header.hasPointerCapture?.(upEv.pointerId || e.pointerId)) {
            header.releasePointerCapture(upEv.pointerId || e.pointerId);
          }
        } catch (_) {}
        header.removeEventListener?.('pointermove', onMove);
        header.removeEventListener?.('pointerup', onUp);
        header.removeEventListener?.('pointercancel', onUp);
        this.win?.removeEventListener?.('pointermove', onMove);
        this.win?.removeEventListener?.('pointerup', onUp);
        this.win?.removeEventListener?.('pointercancel', onUp);

        if (!hasDragged && !record.isFloating) {
          return;
        }

        if (record.isFloating && hasDragged) {
          // If dropped over the workspace dock body, re-dock the panel into the dock
          if (this.dockElement && !this.isCollapsed) {
            const dockRect = this.dockElement.getBoundingClientRect?.() || {};
            const clientX = upEv?.clientX;
            const clientY = upEv?.clientY;
            if (Number.isFinite(clientX) && Number.isFinite(clientY) &&
                clientX >= (dockRect.left || 0) && clientX <= (dockRect.right || 0) &&
                clientY >= (dockRect.top || 0) && clientY <= (dockRect.bottom || 0)) {
              this.dockPanel(record.id);
              return;
            }
          }

          // Apply magnetic edge potential well to floating panel
          const curX = record.lastPos.x;
          const curY = record.lastPos.y;
          const snappedX = computeEdgeSnapTarget(curX, 0, Math.max(0, maxLeft), 24, 12);
          const snappedY = computeEdgeSnapTarget(curY, 0, Math.max(0, maxTop), 24, 12);
          if (snappedX !== curX || snappedY !== curY) {
            panel.style.transition = 'left 0.18s cubic-bezier(0.16, 1, 0.3, 1), top 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
            panel.style.left = `${snappedX}px`;
            panel.style.top = `${snappedY}px`;
            setTimeout(() => {
              if (panel) panel.style.transition = '';
            }, 200);
            record.lastPos.x = snappedX;
            record.lastPos.y = snappedY;
          }
          this.#persistState();
        }
      };

      header.addEventListener?.('pointermove', onMove);
      header.addEventListener?.('pointerup', onUp);
      header.addEventListener?.('pointercancel', onUp);
      this.win?.addEventListener?.('pointermove', onMove);
      this.win?.addEventListener?.('pointerup', onUp);
      this.win?.addEventListener?.('pointercancel', onUp);
    });
  }

  floatPanel(panelId) {
    const record = this.panels.get(panelId);
    if (!record) return;

    record.isFloating = true;
    record.isHidden = false;
    const panel = record.element;
    panel.hidden = false;
    panel.classList.remove('is-hidden');
    if (typeof panel.style?.removeProperty === 'function') {
      panel.style.removeProperty('display');
    }
    panel.style.display = '';
    panel.classList.add('is-floating');

    // If panel was shaded, unshade it on float out so the floating window is fully open and accessible
    if (panel.classList.contains('is-shaded')) {
      this.setPanelShaded(panelId, false);
    }

    // Ensure panel-body is visible and rendered (not hidden)
    const body = panel.querySelector('.panel-body');
    if (body) {
      body.classList.remove('hidden');
      body.style.display = '';
    }

    // Move DOM node into floating layer
    this.floatingLayer.appendChild(panel);

    // Apply remembered coordinates (ensuring it floats visibly into open workspace if overlapping dock)
    const pos = record.lastPos;
    if (this.dockEdge === 'left' && !this.isCollapsed && pos.x < this.dockSize + 10) {
      pos.x = Math.max(this.dockSize + 24, Math.min(this.dockSize + 24 + ((record.metaIndex || 0) * 28), (this.win?.innerWidth || 1200) - (pos.width || 380) - 24));
    } else if (this.dockEdge === 'top' && !this.isCollapsed && pos.y < this.dockSize + 10) {
      pos.y = this.dockSize + 24;
    }

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
    record.isHidden = false;
    const panel = record.element;
    panel.hidden = false;
    panel.classList.remove('is-hidden');
    if (typeof panel.style?.removeProperty === 'function') {
      panel.style.removeProperty('display');
    }
    panel.style.display = '';
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

    // If dock is currently collapsed, automatically expand it so user sees the returned panel
    if (this.isCollapsed) {
      this.setDockCollapsed(false);
    }

    // If panel was shaded while floating, unshade it so it docks cleanly
    if (panel.classList.contains('is-shaded')) {
      this.setPanelShaded(panelId, false);
    }

    // Move DOM node back to dock body
    this.dockBody.appendChild(panel);
    this.collapseSubComponents(panel);

    // Ensure panel-body remains visible and rendered
    const body = panel.querySelector('.panel-body');
    if (body) {
      body.classList.remove('hidden');
      body.style.display = '';
    }

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
    record.element.classList.toggle('is-hidden', !visible);
    if (visible) {
      if (typeof record.element.style?.removeProperty === 'function') {
        record.element.style.removeProperty('display');
      }
      record.element.style.display = '';
    } else {
      if (typeof record.element.style?.setProperty === 'function') {
        record.element.style.setProperty('display', 'none', 'important');
      }
      record.element.style.display = 'none';
    }

    this.#renderTrayItems();
    this.#persistState();
    this.updateDockEmptyState();
  }

  setPanelShaded(panelId, shaded) {
    const record = this.panels.get(panelId);
    if (!record) return;

    const panel = record.element;
    const body = panel.querySelector('.panel-body');
    const isShaded = shaded === undefined ? !panel.classList.contains('is-shaded') : Boolean(shaded);

    panel.classList.toggle('is-shaded', isShaded);

    if (body) {
      if (isShaded) {
        body.classList.add('hidden');
      } else {
        body.classList.remove('hidden');
        body.style.display = '';
      }
    }

    if (record.shadeBtn) {
      record.shadeBtn.innerHTML = isShaded ? `□` : `─`;
      record.shadeBtn.title = isShaded ? 'Restore window height' : 'Roll up / restore window';
      record.shadeBtn.setAttribute('aria-expanded', String(!isShaded));
    }

    const minBtn = panel.querySelector('.panel-minimize-btn');
    if (minBtn) {
      const isExpanded = !isShaded;
      minBtn.setAttribute('aria-expanded', String(isExpanded));
      minBtn.title = isExpanded ? `Minimize ${record.title || 'Panel'}` : `Expand ${record.title || 'Panel'}`;
      let icon = minBtn.querySelector('.panel-minimize-icon');
      const upSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
      const downSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      if (!icon) {
        minBtn.innerHTML = `<span class="panel-minimize-icon" aria-hidden="true">${isExpanded ? upSvg : downSvg}</span>`;
      } else {
        icon.innerHTML = isExpanded ? upSvg : downSvg;
      }
    }

    if (record.isFloating) {
      if (isShaded) {
        record.unshadedHeight = panel.style.height || `${record.lastPos?.height || 380}px`;
        panel.style.height = 'auto';
      } else {
        panel.style.height = record.unshadedHeight || `${record.lastPos?.height || 380}px`;
      }
    } else {
      this.syncSubpanelOverlayState();
    }

    this.#persistState();
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
    const stepCrumb = breadcrumbBar.querySelector?.('.breadcrumb-step');
    const stepSeparator = breadcrumbBar.querySelector?.('.sep-step');
    const activePanel = this.panels.get(panelId)?.element;
    const group = activePanel?.querySelector('.panel-elevation-deck')?._activeGroup;
    const activeSubpanel = this.activeSectionHeader?.closest?.(SUBPANEL_SELECTOR);
    const stepTitle = sectionTitle && group && activeSubpanel !== group && group.contains(activeSubpanel)
      ? sectionTitle : null;
    if (stepTitle) sectionTitle = subpanelTitle(group);
    if (stepCrumb) {
      stepCrumb.textContent = stepTitle || '';
      stepCrumb.title = stepTitle ? `Focus "${stepTitle}"` : '';
      stepCrumb.style.display = stepTitle ? '' : 'none';
    }
    if (stepSeparator) stepSeparator.style.display = stepTitle ? '' : 'none';

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
      floatBtn.innerHTML = record.isFloating ? '🗁' : '⧉';
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

    // Auto-sync subpanel state when derivations are dynamically mounted
    if (typeof this.win?.addEventListener === 'function') {
      this.win.addEventListener('vml:derivations-rendered', () => {
        setTimeout(() => this.syncSubpanelOverlayState(), 0);
      });
    }
    if (typeof this.doc?.addEventListener === 'function') {
      this.doc.addEventListener('vml:derivations-rendered', () => {
        setTimeout(() => this.syncSubpanelOverlayState(), 0);
      });
    }

    if (typeof MutationObserver !== 'undefined' && this.dockBody) {
      try {
        const observer = new MutationObserver((mutations) => {
          let hasCards = false;
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length > 0) {
              for (const n of m.addedNodes) {
                if (n.nodeType === 1 && (n.matches?.('.derivation-card, .collapsible-section, #live-derivations-content') || n.querySelector?.('.derivation-card'))) {
                  hasCards = true;
                  break;
                }
              }
            }
            if (hasCards) break;
          }
          if (hasCards) {
            this.syncSubpanelOverlayState();
          }
        });
        observer.observe(this.dockBody, { childList: true, subtree: true });
        this._dockMutationObserver = observer;
      } catch (_) {}
    }

    // Automatic Horizontal Scroll on Top/Bottom Docks (Zero-Effort mouse wheel navigation)
    if (this.dockBody && !this.dockBody._horizontalWheelBound) {
      this.dockBody._horizontalWheelBound = true;
      this.dockBody.addEventListener?.('wheel', (e) => {
        if (this.dockEdge === 'top' || this.dockEdge === 'bottom') {
          // If the cursor is over an inner vertically-scrollable container that has room to scroll, let it scroll
          let cur = e.target;
          let innerScrollable = null;
          while (cur && cur !== this.dockBody && cur !== this.root && cur !== this.doc?.body) {
            const scrollable = cur.closest?.('.collapsible-content, .derivation-card-content, .panel-body');
            if (!scrollable || scrollable === this.dockBody) break;
            const hasVert = (scrollable.scrollHeight || 0) > (scrollable.clientHeight || 0) + 2;
            const canScrollDown = e.deltaY > 0 && ((scrollable.scrollTop || 0) + (scrollable.clientHeight || 0) < (scrollable.scrollHeight || 0) - 2);
            const canScrollUp = e.deltaY < 0 && (scrollable.scrollTop || 0) > 2;
            if (hasVert && (canScrollDown || canScrollUp)) {
              innerScrollable = scrollable;
              break;
            }
            cur = scrollable.parentElement;
          }
          if (innerScrollable) {
            return; // Allow the inner content to scroll vertically
          }
          const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
          if (delta) {
            this.dockBody.scrollLeft += delta;
            e.preventDefault?.();
          }
        }
      }, { passive: false });
    }

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

      const section = header.closest(SUBPANEL_SELECTOR);
      const parentGroup = section.parentElement?.closest?.(SUBPANEL_SELECTOR);
      const allHeaders = getChildSubpanels(parentGroup || panel.querySelector('.panel-body'))
        .map((sub) => sub.querySelector('.collapsible-header, .derivation-card-header')).filter(Boolean);
      const currIdx = allHeaders.indexOf(header);
      if (currIdx === -1) return;
      const focusHeader = (target) => {
        const sub = target?.closest?.(SUBPANEL_SELECTOR);
        if (sub?.classList.contains('is-in-deck')) syncPanelElevationTurn(panel, sub, { reveal: true });
        target?.focus?.();
      };

      if (e.key === 'ArrowDown') {
        e.preventDefault?.();
        e.stopPropagation?.();
        const nextIdx = (currIdx + 1) % allHeaders.length;
        focusHeader(allHeaders[nextIdx]);
        this.activeSectionHeader = allHeaders[nextIdx];
        this.updateBreadcrumb(panel.id, allHeaders[nextIdx]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault?.();
        e.stopPropagation?.();
        const prevIdx = (currIdx - 1 + allHeaders.length) % allHeaders.length;
        focusHeader(allHeaders[prevIdx]);
        this.activeSectionHeader = allHeaders[prevIdx];
        this.updateBreadcrumb(panel.id, allHeaders[prevIdx]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'Home') {
        e.preventDefault?.();
        e.stopPropagation?.();
        focusHeader(allHeaders[0]);
        this.activeSectionHeader = allHeaders[0];
        this.updateBreadcrumb(panel.id, allHeaders[0]?.textContent?.replace(/[▶▼◀▲]/g, '')?.trim());
      } else if (e.key === 'End') {
        e.preventDefault?.();
        e.stopPropagation?.();
        focusHeader(allHeaders[allHeaders.length - 1]);
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

      const panel = activeEl.closest?.('.ui-panel');
      const nestedHeader = activeEl.closest?.('.collapsible-header, .derivation-card-header');
      const nestedSubpanel = nestedHeader?.closest?.(SUBPANEL_SELECTOR);
      const group = panel?.querySelector('.panel-elevation-deck')?._activeGroup;
      if (group && nestedSubpanel && nestedSubpanel !== group && group.contains(nestedSubpanel)) {
        e.preventDefault?.();
        e.stopPropagation?.();
        panel.querySelector('.elevation-deck-group-select')?.focus?.();
        return;
      }
      if (activeEl.classList?.contains('elevation-deck-group-select')) {
        e.preventDefault?.();
        e.stopPropagation?.();
        panel?.querySelector('.panel-header')?.focus?.();
        return;
      }

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
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(this.doc.activeElement?.tagName)) return;
      if (e.key === '[' || e.key === ']') {
        const panels = Array.from(this.dockBody?.querySelectorAll?.('.ui-panel') || []);
        let targetPanel = null;
        if (this.activePanelId) {
          targetPanel = this.panels.get(this.activePanelId)?.element || null;
        }
        if (!targetPanel && panels.length > 0) {
          for (const panel of panels) {
            const deck = panel.querySelector?.('.panel-elevation-deck');
            if (deck && deck.style.display !== 'none') {
              targetPanel = panel;
              break;
            }
          }
          if (!targetPanel) {
            for (const panel of panels) {
              const subs = panel.querySelectorAll?.('.collapsible-section, .derivation-card') || [];
              if (subs.length > 1) {
                targetPanel = panel;
                break;
              }
            }
          }
          if (!targetPanel) targetPanel = panels[0];
        }
        if (targetPanel) {
          e.preventDefault?.();
          cyclePanelSubpanel(targetPanel, e.key === '[' ? 'backward' : 'forward');
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
    this.#applyDockSize();
    if (isCompact && !this._userCustomizedEdge) {
      this.dockResizer?.setAttribute?.('data-resize-edge', 'bottom');
    }
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
        dockSizeCustomized: this.dockSizeCustomized,
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
      const isCustomVert = Boolean(data.dockSizeCustomized?.vertical);
      const isCustomHoriz = Boolean(data.dockSizeCustomized?.horizontal);
      if (Number.isFinite(data.dockSizeVertical)) {
        this.dockSizeVertical = isCustomVert ? data.dockSizeVertical : Math.max(380, data.dockSizeVertical);
      }
      if (Number.isFinite(data.dockSizeHorizontal)) {
        this.dockSizeHorizontal = isCustomHoriz ? data.dockSizeHorizontal : Math.max(340, data.dockSizeHorizontal);
      }
      this.dockSizeCustomized = {
        vertical: isCustomVert,
        horizontal: isCustomHoriz,
      };
      if (Number.isFinite(data.dockSize) && !Number.isFinite(data.dockSizeVertical) && !Number.isFinite(data.dockSizeHorizontal)) {
        const horizontal = data.dockEdge === 'top' || data.dockEdge === 'bottom';
        this[horizontal ? 'dockSizeHorizontal' : 'dockSizeVertical'] = data.dockSize;
        this.dockSizeCustomized[horizontal ? 'horizontal' : 'vertical'] = true;
      }
      if (data.dockEdge) this.setDockEdge(data.dockEdge);
      if (data.collapsedPos) {
        this.collapsedPos = data.collapsedPos;
        this._hasUserDraggedCollapsedPos = true;
      }
      if (data.isCollapsed !== undefined) {
        this.setDockCollapsed(data.isCollapsed);
      } else if (this.options?.defaultCollapsed || this.options?.startCollapsed) {
        this.setDockCollapsed(true);
      }
      this.savedPanelStates = data.panels || {};
    } catch (_) {}
  }
}

/**
 * Convenience helper to initialize the workspace dock manager across any visual page.
 */
export function initWorkspaceDock(root = null, options = {}) {
  const mergedOptions = { defaultCollapsed: true, ...options };
  return new WorkspaceDockManager(root, mergedOptions);
}

/**
 * Helper to open/close an individual collapsible section or derivation card cleanly.
 */
export function setSubpanelOpen(sub, shouldOpen) {
  if (!sub) return;
  if (sub.classList.contains('collapsible-section')) {
    sub.classList.toggle('collapsed', !shouldOpen);
    const h = sub.querySelector ? sub.querySelector('.collapsible-header') : null;
    if (h) {
      h.setAttribute('aria-expanded', String(shouldOpen));
      h.classList.toggle('open', shouldOpen);
      const icon = h.querySelector ? h.querySelector('.icon') : null;
      if (icon) icon.textContent = shouldOpen ? '▼' : '▶';
    }
    const c = sub.querySelector ? sub.querySelector('.collapsible-content') : null;
    if (c) {
      c.classList.toggle('open', shouldOpen);
      c.classList.toggle('collapsed', !shouldOpen);
    }
  } else if (sub.classList.contains('derivation-card')) {
    sub.classList.toggle('open', shouldOpen);
    const h = sub.querySelector ? sub.querySelector('.derivation-card-header') : null;
    if (h) {
      h.setAttribute('aria-expanded', String(shouldOpen));
      h.classList.toggle('open', shouldOpen);
      const icon = h.querySelector ? h.querySelector('.icon') : null;
      if (icon) icon.textContent = shouldOpen ? '▼' : '▶';
    }
    const c = sub.querySelector ? sub.querySelector('.derivation-card-content') : null;
    if (c) {
      c.classList.toggle('open', shouldOpen);
      // Thales' Accordion hides card content with .collapsed; opening must clear it or the card opens empty.
      if (shouldOpen) c.classList.remove('collapsed');
    }
  }
}

/**
 * Cycles between subpanels of a panel without having to expand that panel first.
 * If the panel is shaded, it un-shades it, expands the target subpanel, and synchronizes elevation.
 */
export function cyclePanelSubpanel(panel, direction = 'forward') {
  if (!panel) return;
  const { body, subpanels: allSubpanels } = elevationContext(panel);
  if (!body) return;

  if (allSubpanels.length <= 1) return;

  const isOpen = (sub) => {
    if (sub.classList.contains('collapsible-section')) {
      return !sub.classList.contains('collapsed');
    }
    const h = sub.querySelector ? sub.querySelector('.derivation-card-header') : null;
    return sub.classList.contains('open') || Boolean(h?.classList.contains('open'));
  };

  // If panel is shaded/minimized, restore it so user sees the newly cycled content
  if (panel.classList.contains('is-shaded')) {
    panel.classList.remove('is-shaded');
    const shadeBtn = panel.querySelector('.panel-shade-btn');
    if (shadeBtn) {
      shadeBtn.innerHTML = '─';
      shadeBtn.title = 'Roll up / restore window';
      shadeBtn.setAttribute('aria-expanded', 'true');
    }
    const minBtn = panel.querySelector('.panel-minimize-btn');
    if (minBtn) {
      minBtn.setAttribute('aria-expanded', 'true');
      minBtn.title = 'Minimize Panel';
      const icon = minBtn.querySelector('.panel-minimize-icon');
      const upSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
      if (icon) icon.innerHTML = upSvg;
    }
    if (body.classList.contains('hidden')) body.classList.remove('hidden');
    if (body.style) body.style.display = '';
  }

  // Find currently elevated or open subpanel across all subpanels
  let curSub = allSubpanels.find((s) => s.getAttribute('data-elevation-turn') === 'top' || s.classList.contains('is-elevated-top'));
  if (!curSub) {
    // Accordion and Scroll All carry no turn markers, so continue from the visible deck cursor.
    const deck = body.querySelector ? body.querySelector('.panel-elevation-deck') : null;
    const cursor = deck && deck.style?.display !== 'none' ? deck._activeSubpanel : null;
    if (cursor && allSubpanels.includes(cursor)) curSub = cursor;
  }
  if (!curSub) {
    curSub = allSubpanels.find((s) => isOpen(s));
  }
  const curIdx = curSub ? allSubpanels.indexOf(curSub) : -1;
  let nextIdx = 0;
  if (curIdx === -1) {
    nextIdx = direction === 'backward' ? allSubpanels.length - 1 : 0;
  } else if (direction === 'forward') {
    nextIdx = (curIdx + 1) % allSubpanels.length;
  } else {
    nextIdx = (curIdx - 1 + allSubpanels.length) % allSubpanels.length;
  }
  const targetSub = allSubpanels[nextIdx];

  // Open target subpanel if not open without requiring prior manual expansion
  const curMode = body.getAttribute?.('data-deck-mode') || 'deck';
  if (curMode === 'tabs') {
    activateTabSubpanel(targetSub, allSubpanels);
  } else if (!isOpen(targetSub)) {
    setSubpanelOpen(targetSub, true);
  }

  // Sync elevation turn
  syncPanelElevationTurn(panel, targetSub, { direction, reveal: true });
}

/**
 * Activates a single tab in Tab Bar mode by expanding the selected subpanel and closing others.
 */
export function activateTabSubpanel(targetSub, allSubpanels = []) {
  if (!targetSub) return;
  allSubpanels.forEach((sub) => {
    const isTarget = sub === targetSub;
    setSubpanelOpen(sub, isTarget);
  });
  const panel = targetSub?.closest ? targetSub.closest('.ui-panel') : null;
  if (panel) {
    panel.classList.add('has-expanded-subpanel');
    panel.classList.remove('is-shaded');
    const body = panel.querySelector ? panel.querySelector('.panel-body') : null;
    if (body) {
      body.classList.remove('hidden');
      if (body.style) body.style.display = '';
    }
  }
}

/**
 * Synchronizes elevation levels and turn-taking deck when panels have bounded dock height.
 * Supports three navigation modes via [data-deck-mode]:
 * - 'tabs' / 'deck': Tab Bar mode (single-turn tabs). Pills for all subpanels are always visible
 *                    allowing 1-click tab switching. Non-active sections are parked in the deck.
 * - 'accordion': Accordion mode (nested collapsible headers). Independent collapsibles without deck parking;
 *                 sections are never auto-opened, so header/pill toggles stick.
 * - 'stack': Stack mode (continuous vertical scroll). All open sections expanded in full vertical flow.
 *
 * @param {HTMLElement} panel - The .ui-panel container.
 * @param {HTMLElement|null} preferredActiveElement - Optional subpanel or child requesting the top turn.
 * @param {Object} options - { direction, mode, forceDeck, reveal, silent }; silent skips the
 *                            panelelevationturn event (background resyncs of panels not in use).
 */
export function syncPanelElevationTurn(panel, preferredActiveElement = null, options = {}) {
  if (!panel) return;
  const { body, groups, group, subpanels: allSubpanels } = elevationContext(panel, preferredActiveElement);
  if (!body) return;

  body.classList.toggle('has-elevation-groups', Boolean(group));
  // True when the target is the group's remembered step rather than one the caller (e.g. a header) passed.
  let rememberedTarget = false;
  if (group) {
    const requested = preferredActiveElement?.closest?.(SUBPANEL_SELECTOR);
    rememberedTarget = !allSubpanels.includes(requested);
    preferredActiveElement = allSubpanels.includes(requested) ? requested :
      (allSubpanels.includes(group._activeElevationSubpanel) ? group._activeElevationSubpanel : null);
    for (const sub of body.querySelectorAll(SUBPANEL_SELECTOR)) {
      sub.classList.remove('is-subpanel-overlay');
      if (!allSubpanels.includes(sub)) {
        sub.removeAttribute('data-elevation-turn');
        sub.removeAttribute('data-elevation-level');
        sub.classList.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
      }
    }
    for (const candidate of groups) {
      candidate.setAttribute('data-elevation-group', candidate === group ? 'active' : 'inactive');
      candidate.classList.toggle('is-elevation-group', getChildSubpanels(candidate).length > 0);
      candidate.setAttribute('data-elevation-level', '2');
    }
    if (!allSubpanels.includes(group)) setSubpanelOpen(group, true);
    body.classList.add('is-all-expanded');
    panel.classList.add('has-expanded-subpanel');
  } else {
    for (const candidate of groups) {
      candidate.removeAttribute('data-elevation-group');
      candidate.classList.remove('is-elevation-group');
    }
  }

  const isOpen = (sub) => {
    if (sub.classList.contains('collapsible-section')) {
      return !sub.classList.contains('collapsed');
    }
    const h = sub.querySelector ? sub.querySelector('.derivation-card-header') : null;
    return sub.classList.contains('open') || Boolean(h?.classList.contains('open'));
  };

  const openSubpanels = allSubpanels.filter(isOpen);
  const totalOpen = openSubpanels.length;
  body.classList.toggle('is-all-expanded', Boolean(group) || totalOpen > 1);

  panel.setAttribute?.('data-elevation-level', '1');

  // Deck container inside the panel body
  let deck = body.querySelector ? body.querySelector('.panel-elevation-deck') : null;

  if (allSubpanels.length <= 1 && !group) {
    if (deck) {
      deck.style.display = 'none';
      if (Array.isArray(deck.children)) deck.children.length = 0;
      if (typeof deck.replaceChildren === 'function') deck.replaceChildren();
      else if (deck.innerHTML !== undefined) deck.innerHTML = '';
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
    return;
  }

  const currentMode = body.getAttribute?.('data-deck-mode') || options?.mode || 'deck';
  const isTabsMode = currentMode === 'tabs';
  const isAccordionMode = currentMode === 'accordion';
  const isStackMode = currentMode === 'stack';
  const isDeckMode = currentMode === 'deck';

  const isDerivPanel = panel?.id?.includes('deriv') || panel?.id === 'live-derivation-panel';
  const forceDeck = Boolean(
    group ||
    options?.forceDeck ||
    panel?.hasAttribute?.('data-force-deck') ||
    body?.hasAttribute?.('data-force-deck') ||
    (isDerivPanel && allSubpanels.length > 1)
  );

  // In default dynamic deck mode, hide deck when totalOpen <= 1 unless forceDeck is requested
  if (isDeckMode && totalOpen <= 1 && !forceDeck) {
    if (deck) {
      deck.style.display = 'none';
      if (Array.isArray(deck.children)) deck.children.length = 0;
      if (typeof deck.replaceChildren === 'function') deck.replaceChildren();
      else if (deck.innerHTML !== undefined) deck.innerHTML = '';
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
      if (!options?.silent) panel.dispatchEvent?.(evt);
    } catch (_) {}
    return;
  }

  // Active subpanel determination
  let activeSubpanel = null;
  const pillsAll = isTabsMode || isAccordionMode || forceDeck;
  const pool = pillsAll ? allSubpanels : (openSubpanels.length > 0 ? openSubpanels : allSubpanels);

  // Deck controls navigate (reveal/direction) and always open their target. A header that folds the step
  // holding the turn (any step in Scroll All, where nothing is parked) leaves it resting on its shelf.
  const navigating = Boolean(options?.reveal || options?.direction);
  const currentTop = allSubpanels.find(
    (s) => s.getAttribute?.('data-elevation-turn') === 'top' || s.classList?.contains('is-elevated-top')
  ) || null;
  let restedSubpanel = !navigating && allSubpanels.includes(deck?._restedSubpanel) ? deck._restedSubpanel : null;
  let restedNow = false;

  if (preferredActiveElement) {
    const target = preferredActiveElement.closest
      ? preferredActiveElement.closest('.collapsible-section, .derivation-card')
      : preferredActiveElement;
    if (target && allSubpanels.includes(target)) {
      const folded = !navigating && !rememberedTarget && !isOpen(target) && (isStackMode || target === currentTop);
      if (folded && !pillsAll) {
        // Pills list open sections only here, so the turn passes to the next open one.
        const from = allSubpanels.indexOf(target);
        activeSubpanel = [...allSubpanels.slice(from + 1), ...allSubpanels.slice(0, from)].find(isOpen) || null;
      } else {
        if (folded) {
          restedSubpanel = target;
          restedNow = true;
        } else if (!isAccordionMode && target !== restedSubpanel && !isOpen(target)) {
          // A parked shelf whose header was clicked is raised, so it opens. Accordion sections are independent
          // (a header or pill that just closed one must not reopen it), and a rested step stays folded.
          setSubpanelOpen(target, true);
        }
        activeSubpanel = target;
      }
    }
  }
  if (restedSubpanel && isOpen(restedSubpanel)) restedSubpanel = null;

  if (!activeSubpanel) {
    activeSubpanel = pool.find(
      (s) => s.getAttribute?.('data-elevation-turn') === 'top' || s.classList?.contains('is-elevated-top')
    );
  }

  // Modes without turn markers keep the visible deck cursor instead of jumping to the first open section.
  const deckCursor = deck && deck.style?.display !== 'none' ? deck._activeSubpanel : null;
  if (!activeSubpanel && deckCursor && pool.includes(deckCursor)) {
    activeSubpanel = deckCursor;
  }

  if (!activeSubpanel) {
    activeSubpanel = openSubpanels[0] || (isAccordionMode ? null : allSubpanels[0]);
  }

  if (!restedSubpanel && openSubpanels.length === 0 && !navigating) {
    restedSubpanel = activeSubpanel;
  }

  if (!isAccordionMode && (isTabsMode || forceDeck) && activeSubpanel && activeSubpanel !== restedSubpanel && !isOpen(activeSubpanel)) {
    setSubpanelOpen(activeSubpanel, true);
  }

  const subsToRender = pillsAll ? allSubpanels : (openSubpanels.length > 0 ? openSubpanels : allSubpanels);

  const prevActiveSubpanel = deck?._activeSubpanel || null;
  const prevActiveIdx = prevActiveSubpanel ? subsToRender.indexOf(prevActiveSubpanel) : -1;
  const activeIdx = Math.max(0, subsToRender.indexOf(activeSubpanel));

  // Compute turn animation direction (forward vs backward)
  let direction = options?.direction || null;
  if (!direction && prevActiveIdx !== -1 && activeIdx !== -1 && prevActiveIdx !== activeIdx) {
    if (prevActiveIdx === subsToRender.length - 1 && activeIdx === 0) {
      direction = 'forward';
    } else if (prevActiveIdx === 0 && activeIdx === subsToRender.length - 1) {
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
    body.classList.add('is-all-expanded');
    deck._panel = panel;
    deck._activeGroup = group;
    deck._allSubpanels = allSubpanels;
    deck._openSubpanels = subsToRender;
    deck._activeSubpanel = activeSubpanel;
    deck._restedSubpanel = restedSubpanel;
    if (group) group._activeElevationSubpanel = activeSubpanel;

    if (!deck._wheelBound) {
      deck._wheelBound = true;
      deck.addEventListener?.('wheel', (wheelEv) => {
        if (wheelEv.target?.closest?.('select')) return;
        const subs = deck._openSubpanels || [];
        if (subs.length <= 1) return;

        if (wheelEv.cancelable) wheelEv.preventDefault?.();
        wheelEv.stopPropagation?.();
        const now = Date.now();
        if (deck._lastWheelTime && (now - deck._lastWheelTime < 180)) return;
        deck._lastWheelTime = now;
        const curIdx = subs.indexOf(deck._activeSubpanel);
        const dy = wheelEv.deltaY || 0;
        const dx = wheelEv.deltaX || 0;
        const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
        if (delta > 0) {
          const nextIdx = (curIdx + 1) % subs.length;
          const targetSub = subs[nextIdx];
          const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
          if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
          if (curMode === 'tabs') activateTabSubpanel(targetSub, deck._allSubpanels);
          else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
          syncPanelElevationTurn(deck._panel, targetSub, { direction: 'forward', reveal: true });
        } else if (delta < 0) {
          const prevIdx = (Math.max(curIdx, 0) - 1 + subs.length) % subs.length;
          const targetSub = subs[prevIdx];
          const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
          if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
          if (curMode === 'tabs') activateTabSubpanel(targetSub, deck._allSubpanels);
          else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
          syncPanelElevationTurn(deck._panel, targetSub, { direction: 'backward', reveal: true });
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
          const curIdx = subs.indexOf(deck._activeSubpanel);
          const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
          if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
          if (dx < 0) {
            const nextIdx = (curIdx + 1) % subs.length;
            const targetSub = subs[nextIdx];
            if (curMode === 'tabs') activateTabSubpanel(targetSub, deck._allSubpanels);
            else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
            syncPanelElevationTurn(deck._panel, targetSub, { direction: 'forward', reveal: true });
          } else {
            const prevIdx = (Math.max(curIdx, 0) - 1 + subs.length) % subs.length;
            const targetSub = subs[prevIdx];
            if (curMode === 'tabs') activateTabSubpanel(targetSub, deck._allSubpanels);
            else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
            syncPanelElevationTurn(deck._panel, targetSub, { direction: 'backward', reveal: true });
          }
        }
      }, { passive: false });
    }

    deck.style.display = 'grid';
    if (Array.isArray(deck.children)) {
      deck.children.length = 0;
    }
    if (typeof deck.replaceChildren === 'function') {
      deck.replaceChildren();
    } else if (deck.innerHTML !== undefined) {
      deck.innerHTML = '';
    }

    if (doc && doc.createElement) {
      if (group) {
        const groupLabel = doc.createElement('label');
        groupLabel.className = 'elevation-deck-group';
        const caption = doc.createElement('span');
        caption.textContent = 'Group';
        groupLabel.appendChild(caption);
        const select = doc.createElement('select');
        select.className = 'elevation-deck-group-select';
        select.setAttribute('aria-label', 'Section group');
        groups.forEach((candidate, index) => {
          const option = doc.createElement('option');
          option.value = String(index);
          option.textContent = subpanelTitle(candidate) || `Group ${index + 1}`;
          option.selected = candidate === group;
          select.appendChild(option);
        });
        select.value = String(groups.indexOf(group));
        select.addEventListener('change', () => {
          const target = groups[Number(select.value)];
          if (target) {
            syncPanelElevationTurn(panel, target, { reveal: true });
            body.querySelector('.elevation-deck-group-select')?.focus?.();
          }
        });
        groupLabel.appendChild(select);
        deck.appendChild(groupLabel);
      }
      const badge = doc.createElement('span');
      badge.className = 'elevation-deck-label';
      if (isTabsMode) {
        badge.textContent = `Tabs (${activeIdx + 1}/${subsToRender.length})`;
        badge.title = 'Tab bar mode: 1-click tab switching between all sections';
      } else if (isAccordionMode) {
        badge.textContent = `Accordion (${openSubpanels.length}/${allSubpanels.length})`;
        badge.title = 'Accordion mode: independent collapsible sections';
      } else if (isStackMode) {
        badge.textContent = `Stack (${openSubpanels.length}/${allSubpanels.length})`;
        badge.title = 'Stack mode: continuous vertical scrolling';
      } else {
        badge.textContent = `Deck (${activeIdx + 1}/${subsToRender.length})`;
        badge.title = 'Subpanels elevation deck: click any pill or scroll mousewheel to cycle turns';
      }
      deck.appendChild(badge);

      // Previous Turn Button
      const prevBtn = doc.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'elevation-deck-nav-btn prev';
      prevBtn.title = 'Previous section (Shortcut: [ or Wheel Up)';
      prevBtn.setAttribute('aria-label', 'Previous section');
      prevBtn.textContent = '◀';
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        cyclePanelSubpanel(panel, 'backward');
      });
      deck.appendChild(prevBtn);

      const pillsContainer = doc.createElement('div');
      pillsContainer.className = 'elevation-deck-pills';
      pillsContainer.setAttribute('role', 'tablist');
      pillsContainer.setAttribute('aria-label', group ? 'Steps in selected group' : 'Sections');

      subsToRender.forEach((sub, i) => {
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

        const prefix = /^(?:\d+[.)]\s|Step\s+\d+\b)/i.test(fullTitle) ? '' : `${i + 1}. `;
        pill.textContent = `${prefix}${displayTitle}${isCurrent ? ' ★' : ''}`;
        pill.title = isTabsMode
          ? `Switch tab to "${fullTitle}"`
          : isAccordionMode
            ? `Toggle "${fullTitle}"`
            : `Bring "${fullTitle}" to top elevation`;

        pill.addEventListener?.('click', (e) => {
          e.stopPropagation?.();
          const pDir = i > activeIdx ? 'forward' : 'backward';
          const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
          if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
          if (curMode === 'tabs') {
            activateTabSubpanel(sub, allSubpanels);
            syncPanelElevationTurn(panel, sub, { direction: pDir, reveal: true });
          } else if (curMode === 'accordion') {
            const currentlyOpen = isOpen(sub);
            setSubpanelOpen(sub, !currentlyOpen);
            syncPanelElevationTurn(panel, sub, { direction: pDir, reveal: true });
          } else if (curMode === 'stack') {
            if (!isOpen(sub)) setSubpanelOpen(sub, true);
            syncPanelElevationTurn(panel, sub, { reveal: true });
          } else {
            if (!isOpen(sub)) setSubpanelOpen(sub, true);
            syncPanelElevationTurn(panel, sub, { direction: pDir, reveal: true });
          }
        });

        pill.addEventListener?.('keydown', (e) => {
          const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault?.();
            e.stopPropagation?.();
            const nextIdx = (i + 1) % subsToRender.length;
            const targetSub = subsToRender[nextIdx];
            if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
            if (curMode === 'tabs') activateTabSubpanel(targetSub, allSubpanels);
            else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
            syncPanelElevationTurn(panel, targetSub, { direction: 'forward', reveal: true });
            const newDeck = body.querySelector?.('.panel-elevation-deck');
            const newPills = newDeck?.querySelectorAll?.('.elevation-deck-pill') || [];
            newPills[nextIdx]?.focus?.();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault?.();
            e.stopPropagation?.();
            const prevIdx = (i - 1 + subsToRender.length) % subsToRender.length;
            const targetSub = subsToRender[prevIdx];
            if (panel.classList.contains('is-shaded')) panel.classList.remove('is-shaded');
            if (curMode === 'tabs') activateTabSubpanel(targetSub, allSubpanels);
            else if (!isOpen(targetSub)) setSubpanelOpen(targetSub, true);
            syncPanelElevationTurn(panel, targetSub, { direction: 'backward', reveal: true });
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
      nextBtn.title = 'Next section (Shortcut: ] or Wheel Down)';
      nextBtn.setAttribute('aria-label', 'Next section');
      nextBtn.textContent = '▶';
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        cyclePanelSubpanel(panel, 'forward');
      });
      deck.appendChild(nextBtn);

      // Mode Toggle Button (Focus Step / Scroll All / Accordion)
      const modeBtn = doc.createElement('button');
      modeBtn.type = 'button';
      let modeClass = 'is-deck';
      let modeText = 'Focus Step';
      let modeTitle = 'Current: Focus Step mode (1 step at a time). Click to switch to Scroll All mode.';

      if (isTabsMode) {
        modeClass = 'is-tabs';
        modeText = 'Focus Step';
        modeTitle = 'Current: Focus Tab mode (1 tab at a time). Click to switch to Scroll All mode.';
      } else if (isStackMode) {
        modeClass = 'is-stack';
        modeText = 'Scroll All';
        modeTitle = 'Current: Scroll All mode (all steps visible in continuous flow). Click to switch to Accordion mode.';
      } else if (isAccordionMode) {
        modeClass = 'is-accordion';
        modeText = 'Accordion';
        modeTitle = 'Current: Accordion mode (independent sections). Click to switch to Focus Step mode.';
      }

      modeBtn.className = `elevation-deck-mode-toggle ${modeClass}`;
      modeBtn.title = modeTitle;
      modeBtn.textContent = modeText;
      modeBtn.addEventListener('click', (e) => {
        e.stopPropagation?.();
        let nextMode = 'stack';
        const curMode = body.getAttribute?.('data-deck-mode') || currentMode;
        if (curMode === 'tabs' || curMode === 'deck') {
          nextMode = 'stack';
        } else if (curMode === 'stack') {
          nextMode = 'accordion';
        } else if (curMode === 'accordion') {
          nextMode = 'tabs';
        }
        body.setAttribute?.('data-deck-mode', nextMode);
        if (nextMode === 'stack') {
          allSubpanels.forEach((s) => {
            if (!isOpen(s)) setSubpanelOpen(s, true);
          });
        } else if (nextMode === 'tabs') {
          activateTabSubpanel(activeSubpanel || allSubpanels[0], allSubpanels);
        }
        syncPanelElevationTurn(panel, activeSubpanel);
      });
      deck.appendChild(modeBtn);
      const activePill = pillsContainer.querySelector('.active');
      if (activePill && Number.isFinite(activePill.offsetLeft)) {
        pillsContainer.scrollLeft = Math.max(0,
          activePill.offsetLeft - pillsContainer.offsetLeft -
          (pillsContainer.clientWidth - activePill.offsetWidth) / 2);
      }
    }
  }

  // While the turn rests (its step folded), nothing is raised, so nothing is parked: every step lies on its
  // shelf under the deck. In the parking modes, folding the raised step also folds the steps left open behind it.
  const resting = Boolean(restedSubpanel) && activeSubpanel === restedSubpanel;
  if (resting && restedNow && (isTabsMode || isDeckMode)) {
    allSubpanels.forEach((sub) => {
      if (sub !== restedSubpanel && isOpen(sub)) setSubpanelOpen(sub, false);
    });
  }

  if (isTabsMode || isDeckMode) {
    allSubpanels.forEach((sub) => {
      sub.setAttribute?.('data-elevation-level', group && sub !== group ? '3' : '2');
      const isTop = sub === activeSubpanel;
      // Only steps the pills can reach are parked; a closed section that plain Deck pills leave out stays on its shelf.
      if (!isTop && (resting || (!pillsAll && !isOpen(sub)))) {
        sub.removeAttribute?.('data-elevation-turn');
        sub.removeAttribute?.('data-elevation-level');
        sub.classList?.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
      } else if (isTop) {
        sub.setAttribute?.('data-elevation-turn', 'top');
        sub.classList?.add('is-elevated-top');
        sub.classList?.remove('is-in-deck', 'slide-forward', 'slide-backward');
        if (direction === 'forward') {
          sub.classList?.add('slide-forward');
        } else if (direction === 'backward') {
          sub.classList?.add('slide-backward');
        }
      } else {
        sub.setAttribute?.('data-elevation-turn', 'deck');
        sub.classList?.remove('is-elevated-top', 'slide-forward', 'slide-backward');
        sub.classList?.add('is-in-deck');
      }
    });
  } else {
    // Stack or Accordion mode: no subpanel is forced into 'is-in-deck'
    allSubpanels.forEach((sub) => {
      sub.removeAttribute?.('data-elevation-turn');
      sub.classList?.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
      if (isOpen(sub)) {
        sub.setAttribute?.('data-elevation-level', group && sub !== group ? '3' : '2');
      } else {
        sub.removeAttribute?.('data-elevation-level');
      }
    });
  }

  allSubpanels.filter((s) => !isOpen(s) && !isTabsMode && !isDeckMode).forEach((sub) => {
    sub.removeAttribute?.('data-elevation-turn');
    sub.removeAttribute?.('data-elevation-level');
    sub.classList?.remove('is-elevated-top', 'is-in-deck', 'slide-forward', 'slide-backward');
  });

  // Accordion and Scroll All keep sections in flow, so deck navigation scrolls the chosen one into view.
  if (options?.reveal && (isAccordionMode || isStackMode) && activeSubpanel && isOpen(activeSubpanel)) {
    activeSubpanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  try {
    const title = subpanelTitle(activeSubpanel) || null;
    const evt = typeof CustomEvent !== 'undefined'
      ? new CustomEvent('panelelevationturn', { bubbles: true, detail: { panel, activeSubpanel, title, direction } })
      : { type: 'panelelevationturn', bubbles: true, detail: { panel, activeSubpanel, title, direction } };
    if (!options?.silent) panel.dispatchEvent?.(evt);
  } catch (_) {}
}

export { stepSpring, VelocityTracker, computeEdgeSnapTarget } from './motion-physics.js';
