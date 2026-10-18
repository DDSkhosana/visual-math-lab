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
    this.dockSize = 380; // px
    this.panels = new Map(); // id -> { element, header, title, isFloating, isHidden, lastPos, handles }
    this.topZIndex = 40;

    if (this.root && this.doc) {
      this.#initContainers();
      this.#loadPersistedState();
      this.#discoverAndRegisterPanels();
      this.collapseAllSubComponents();
      this.#setupGlobalListeners();
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
      titleGroup.title = 'Workspace Window Manager';
      titleGroup.innerHTML = `
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

    this.#bindDockHeaderEvents();
    this.#bindDockResizer();
    this.#bindCollapsedDockDrag();
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
        e.stopPropagation();
        const isHidden = this.trayDropdown.hidden;
        this.trayDropdown.hidden = !isHidden;
        this.trayBtn.setAttribute('aria-expanded', String(isHidden));
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
          newSize = clamp(newSize, 280, Math.floor(rootRect.width * 0.55));
        } else if (this.dockEdge === 'right') {
          newSize = startSize - (moveEv.clientX - startX);
          newSize = clamp(newSize, 280, Math.floor(rootRect.width * 0.55));
        } else if (this.dockEdge === 'top') {
          newSize = startSize + (moveEv.clientY - startY);
          newSize = clamp(newSize, 180, Math.floor(rootRect.height * 0.55));
        } else if (this.dockEdge === 'bottom') {
          newSize = startSize - (moveEv.clientY - startY);
          newSize = clamp(newSize, 180, Math.floor(rootRect.height * 0.55));
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

    if (!this.isCollapsed) {
      this.dockElement.style.left = '';
      this.dockElement.style.top = '';
      this.dockElement.style.right = '';
      this.dockElement.style.bottom = '';
      this.dockElement.style.width = '';
      this.dockElement.style.height = '';
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

    // Initial placement: default into the dock body unless marked floating
    if (!panelElement.classList.contains('is-floating')) {
      this.dockBody.appendChild(panelElement);
      this.collapseSubComponents(panelElement);
    } else {
      this.floatPanel(id);
    }

    this.#renderTrayItems();
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
        e.stopPropagation();
        if (record.isFloating) {
          this.dockPanel(record.id);
        } else {
          this.floatPanel(record.id);
        }
      });
    }
    record.dockToggleBtn = dockToggleBtn;

    // 2. Remove / Hide Button [ ✕ ]
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
        e.stopPropagation();
        this.setPanelVisible(record.id, false);
      });
    }
    record.closeBtn = closeBtn;
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
  }

  setPanelVisible(panelId, visible) {
    const record = this.panels.get(panelId);
    if (!record) return;

    record.isHidden = !visible;
    record.element.hidden = !visible;
    record.element.style.display = visible ? '' : 'none';

    this.#renderTrayItems();
    this.#persistState();
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
      this.trayItemsContainer.appendChild(label);
    });
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
      if (data.dockEdge) this.setDockEdge(data.dockEdge);
      if (data.dockSize) {
        this.dockSize = data.dockSize;
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
export function syncPanelElevationTurn(panel, preferredActiveElement = null) {
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
      sub.classList?.remove('is-elevated-top', 'is-in-deck');
      if (totalOpen === 1 && isOpen(sub)) {
        sub.setAttribute?.('data-elevation-level', '2');
      } else {
        sub.removeAttribute?.('data-elevation-level');
      }
    });
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
    deck.style.display = 'flex';
    if (Array.isArray(deck.children)) {
      deck.children.length = 0;
    }
    if (typeof deck.replaceChildren === 'function') {
      deck.replaceChildren();
    } else if (deck.innerHTML !== undefined) {
      deck.innerHTML = '';
    }

    const activeIdx = openSubpanels.indexOf(activeSubpanel) + 1;
    if (doc && doc.createElement) {
      const badge = doc.createElement('span');
      badge.className = 'elevation-deck-label';
      badge.textContent = `Deck (${activeIdx}/${openSubpanels.length})`;
      badge.title = 'Subpanels elevation deck: click any pill to bring that subpanel to the top';
      deck.appendChild(badge);

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
        let titleText = headerEl?.textContent ? headerEl.textContent.replace(/[▶▼◀▲]/g, '').trim() : `Section ${i + 1}`;
        titleText = titleText.replace(/\s+/g, ' ');
        if (titleText.length > 22) {
          titleText = titleText.slice(0, 20) + '…';
        }

        pill.textContent = `${i + 1}. ${titleText}${isCurrent ? ' ★' : ''}`;
        pill.title = `Bring "${titleText}" to top elevation`;

        pill.addEventListener?.('click', (e) => {
          e.stopPropagation?.();
          syncPanelElevationTurn(panel, sub);
        });

        pillsContainer.appendChild(pill);
      });

      deck.appendChild(pillsContainer);
    }
  }

  openSubpanels.forEach((sub) => {
    sub.setAttribute?.('data-elevation-level', '2');
    const isTop = sub === activeSubpanel;
    if (isTop) {
      sub.setAttribute?.('data-elevation-turn', 'top');
      sub.classList?.add('is-elevated-top');
      sub.classList?.remove('is-in-deck');
    } else {
      sub.setAttribute?.('data-elevation-turn', 'deck');
      sub.classList?.remove('is-elevated-top');
      sub.classList?.add('is-in-deck');
    }
  });

  allSubpanels.filter((s) => !isOpen(s)).forEach((sub) => {
    sub.removeAttribute?.('data-elevation-turn');
    sub.removeAttribute?.('data-elevation-level');
    sub.classList?.remove('is-elevated-top', 'is-in-deck');
  });
}

