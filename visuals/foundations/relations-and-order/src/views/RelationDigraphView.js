/**
 * RelationDigraphView — Interactive Digraph & Boolean Incidence Matrix
 * Visual Mathematics Lab — Module 2: Relations, Order & Equivalence
 */

import { RelationMath } from '../../../js/foundations-core.js';

export class RelationDigraphView {
  constructor(container, controller, matrixContainer = null) {
    this.container = container;
    this.controller = controller;
    this.matrixContainer = matrixContainer;
    this.svg = null;
    this.width = 0;
    this.height = 0;
    this.activeDrag = null;

    this.init();
  }

  init() {
    const extMatrix = this.matrixContainer || (typeof document !== 'undefined' ? document.querySelector('#matrix-viewport-container') : null);

    if (extMatrix) {
      this.container.innerHTML = `
        <div class="digraph-container" style="position: relative; width: 100%; height: 100%; background: #0c1322; overflow: hidden;">
          <svg class="digraph-svg" id="relation-digraph-svg" style="width: 100%; height: 100%; display: block; user-select: none; touch-action: none;">
            <defs>
              <marker id="rel-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="rel-arrow-symmetric" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
              </marker>
              <marker id="rel-arrow-missing" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
              </marker>
            </defs>
            <g id="rel-edges-layer"></g>
            <g id="rel-nodes-layer"></g>
          </svg>
          <div style="position: absolute; bottom: 8px; left: 12px; font-size: 0.75rem; color: #64748b; pointer-events: none; background: rgba(15, 23, 42, 0.7); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            Click node for self-loop (a, a) &bull; Drag between nodes to toggle (a, b) &bull; Click edge to delete
          </div>
        </div>
      `;

      extMatrix.innerHTML = `
        <div class="matrix-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box;">
          <div id="matrix-grid-mount" style="flex: 1; display: flex; align-items: center; justify-content: center;"></div>
          <div style="margin-top: 10px; font-size: 0.75rem; color: #94a3b8; line-height: 1.4; text-align: center;">
            <span style="color: #38bdf8;">■ Diagonal M_ii</span> = Reflexive loops &nbsp;|&nbsp;
            <span style="color: #a855f7;">■ Symmetry</span>: M = Mᵀ &nbsp;|&nbsp;
            <span style="color: #cbd5e1;">Click cell to toggle (i, j)</span>
          </div>
        </div>
      `;

      this.svg = this.container.querySelector('#relation-digraph-svg');
      this.edgesLayer = this.container.querySelector('#rel-edges-layer');
      this.nodesLayer = this.container.querySelector('#rel-nodes-layer');
      this.matrixMount = extMatrix.querySelector('#matrix-grid-mount');
    } else {
      this.container.innerHTML = `
        <div class="relation-split-container" style="display: flex; flex-direction: row; width: 100%; height: 100%; gap: 12px; padding: 12px; box-sizing: border-box;">
          <!-- Left: Digraph SVG -->
          <div class="digraph-container" style="flex: 3; position: relative; height: 100%; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; overflow: hidden;">
            <svg class="digraph-svg" id="relation-digraph-svg" style="width: 100%; height: 100%; user-select: none; touch-action: none;">
              <defs>
                <marker id="rel-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker id="rel-arrow-symmetric" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
                </marker>
                <marker id="rel-arrow-missing" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
              </defs>
              <g id="rel-edges-layer"></g>
              <g id="rel-nodes-layer"></g>
            </svg>
            <div style="position: absolute; bottom: 8px; left: 12px; font-size: 0.75rem; color: #64748b; pointer-events: none;">
              Click node for self-loop (a, a). Drag between nodes to toggle (a, b). Click edge to delete.
            </div>
          </div>

          <!-- Right: Boolean Incidence Matrix -->
          <div class="matrix-container" style="flex: 2; min-width: 220px; max-width: 320px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column;">
            <h4 style="margin: 0 0 10px 0; font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">
              Incidence Matrix (M_ij = 1 ⟺ (i, j) ∈ R)
            </h4>
            <div id="matrix-grid-mount" style="flex: 1; display: flex; align-items: center; justify-content: center;"></div>
            <div style="margin-top: 10px; font-size: 0.72rem; color: #64748b; line-height: 1.4;">
              <span style="color: #38bdf8;">■ Diagonal</span> = Reflexive loops &nbsp;|&nbsp;
              <span style="color: #a855f7;">■ Symmetry</span>: M = Mᵀ
            </div>
          </div>
        </div>
      `;

      this.svg = this.container.querySelector('#relation-digraph-svg');
      this.edgesLayer = this.container.querySelector('#rel-edges-layer');
      this.nodesLayer = this.container.querySelector('#rel-nodes-layer');
      this.matrixMount = this.container.querySelector('#matrix-grid-mount');
    }

    this.setupEventListeners();
    this.resize();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    // Observe dock changes to adjust visible canvas bounds
    const explorer = this.container.closest('.circle-explorer');
    if (explorer && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => this.resize());
      observer.observe(explorer, { attributes: true, attributeFilter: ['data-dock-edge', 'class'] });
    }

    this.svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  getVisibleBounds() {
    const explorer = this.container.closest('.circle-explorer');
    let bottomInset = 0;
    let topInset = 0;
    if (explorer) {
      const isDockBottom = explorer.getAttribute('data-dock-edge') === 'bottom' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockBottom) {
        const dockEl = explorer.querySelector('.workspace-dock');
        bottomInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 320) : 0;
      }
      const isDockTop = explorer.getAttribute('data-dock-edge') === 'top' && !explorer.classList.contains('dock-is-collapsed');
      if (isDockTop) {
        const dockEl = explorer.querySelector('.workspace-dock');
        topInset = (dockEl && !dockEl.classList.contains('is-collapsed')) ? (dockEl.offsetHeight || 280) : 0;
      }
    }
    const usableH = Math.max(180, this.height - bottomInset - topInset);
    const startY = topInset;
    return { topInset, bottomInset, usableH, startY };
  }

  resize() {
    const rect = this.svg.getBoundingClientRect();
    this.width = rect.width || 450;
    this.height = rect.height || 400;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.render();
  }

  getNodePositions() {
    const state = this.controller.state;
    const n = state.elements.length;
    const { startY, usableH } = this.getVisibleBounds();
    const cx = this.width / 2;
    const cy = startY + usableH / 2;
    const radius = Math.min(this.width * 0.42, usableH * 0.36);

    return state.elements.map((elem, idx) => {
      const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
      return {
        id: elem,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle
      };
    });
  }

  render() {
    if (!this.svg || this.width === 0) return;
    const state = this.controller.state;
    const analysis = RelationMath.analyzeRelation(state.elements, state.pairs);
    const nodes = this.getNodePositions();

    this.renderEdges(nodes, state, analysis);
    this.renderNodes(nodes, state, analysis);
    this.renderMatrix(state, analysis);
  }

  renderEdges(nodes, state, analysis) {
    const nMap = new Map(nodes.map(n => [n.id, n]));
    const pairSet = new Set(state.pairs.map(([a, b]) => `${a}->${b}`));
    let html = '';

    // Render Edges in R
    for (const [a, b] of state.pairs) {
      const nodeA = nMap.get(a);
      const nodeB = nMap.get(b);
      if (!nodeA || !nodeB) continue;

      if (a === b) {
        // Self-loop: Arc circling out from node along its radial direction
        const r = 18;
        const loopR = 16;
        const outX = Math.cos(nodeA.angle);
        const outY = Math.sin(nodeA.angle);
        const loopCenterX = nodeA.x + outX * (r + loopR);
        const loopCenterY = nodeA.y + outY * (r + loopR);

        html += `
          <g class="rel-edge-group" data-edge="${a},${b}">
            <circle cx="${loopCenterX}" cy="${loopCenterY}" r="${loopR}" fill="none" 
                    stroke="#38bdf8" stroke-width="2.2" stroke-dasharray="0" />
            <polygon points="${loopCenterX + outY * 4},${loopCenterY - outX * 4} ${loopCenterX - outY * 4},${loopCenterY + outX * 4} ${loopCenterX + outX * 6},${loopCenterY + outY * 6}" fill="#38bdf8" />
          </g>
        `;
      } else {
        const hasReverse = pairSet.has(`${b}->${a}`);
        const strokeColor = hasReverse ? '#a855f7' : '#38bdf8';
        const marker = hasReverse ? 'url(#rel-arrow-symmetric)' : 'url(#rel-arrow)';

        // If bidirectional, curve each edge slightly so both arrows are legible
        const curveOffset = hasReverse ? 18 : 0;
        const midX = (nodeA.x + nodeB.x) / 2;
        const midY = (nodeA.y + nodeB.y) / 2;
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const len = Math.hypot(dx, dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;

        const ctrlX = midX + perpX * curveOffset;
        const ctrlY = midY + perpY * curveOffset;

        const pathD = `M ${nodeA.x} ${nodeA.y} Q ${ctrlX} ${ctrlY} ${nodeB.x} ${nodeB.y}`;

        html += `
          <g class="rel-edge-group" data-edge="${a},${b}">
            <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.2" style="marker-end: ${marker};" />
          </g>
        `;
      }
    }

    // Render Missing Transitive Shortcuts (when user toggles showViolations)
    if (state.highlightTransitiveViolations && analysis.missingTransitive.length > 0) {
      for (const { a, c } of analysis.missingTransitive) {
        const nodeA = nMap.get(a);
        const nodeC = nMap.get(c);
        if (nodeA && nodeC && a !== c) {
          const pathD = `M ${nodeA.x} ${nodeA.y} L ${nodeC.x} ${nodeC.y}`;
          html += `
            <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 4" style="marker-end: url(#rel-arrow-missing);" opacity="0.75" />
          `;
        }
      }
    }

    // Active dragging line
    if (this.activeDrag) {
      const { startNode, currentPos } = this.activeDrag;
      html += `
        <line x1="${startNode.x}" y1="${startNode.y}" x2="${currentPos.x}" y2="${currentPos.y}" 
              stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="5 3" />
      `;
    }

    this.edgesLayer.innerHTML = html;
  }

  renderNodes(nodes, state, analysis) {
    let html = '';
    const hasSelfLoop = (id) => state.pairs.some(([a, b]) => a === id && b === id);

    for (const node of nodes) {
      const hasLoop = hasSelfLoop(node.id);
      const strokeColor = hasLoop ? '#38bdf8' : '#64748b';
      const strokeWidth = hasLoop ? 3 : 1.5;

      html += `
        <g class="rel-node-group" transform="translate(${node.x}, ${node.y})" data-node-id="${node.id}" style="cursor: pointer;">
          <circle r="18" fill="#1e293b" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <text y="5" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="bold">${node.id}</text>
        </g>
      `;
    }
    this.nodesLayer.innerHTML = html;
  }

  renderMatrix(state, analysis) {
    if (!this.matrixMount) return;
    const elements = state.elements;
    const n = elements.length;
    const pairSet = new Set(state.pairs.map(([a, b]) => `${a}->${b}`));

    let gridHtml = `
      <table style="border-collapse: collapse; text-align: center; font-family: monospace; font-size: 0.85rem; color: #cbd5e1;">
        <thead>
          <tr>
            <th style="padding: 4px; color: #64748b;">R</th>
            ${elements.map(e => `<th style="padding: 4px; color: #38bdf8;">${e}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    for (let i = 0; i < n; i++) {
      const a = elements[i];
      gridHtml += `<tr><th style="padding: 4px; color: #38bdf8;">${a}</th>`;
      for (let j = 0; j < n; j++) {
        const b = elements[j];
        const isConnected = pairSet.has(`${a}->${b}`);
        const isDiag = i === j;
        const hasReverse = pairSet.has(`${b}->${a}`);

        let bg = 'rgba(30, 41, 59, 0.4)';
        let border = 'rgba(255, 255, 255, 0.08)';
        let text = isConnected ? '1' : '0';
        let textColor = isConnected ? '#38bdf8' : '#475569';

        if (isDiag) {
          bg = isConnected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.15)';
          border = isConnected ? 'rgba(56, 189, 248, 0.5)' : 'rgba(239, 68, 68, 0.4)';
          textColor = isConnected ? '#38bdf8' : '#f87171';
        } else if (isConnected && hasReverse) {
          bg = 'rgba(168, 85, 247, 0.2)';
          border = 'rgba(168, 85, 247, 0.4)';
          textColor = '#c084fc';
        }

        gridHtml += `
          <td class="matrix-cell" data-row="${a}" data-col="${b}" 
              style="width: 28px; height: 28px; background: ${bg}; border: 1px solid ${border}; color: ${textColor}; font-weight: bold; cursor: pointer; transition: background 0.15s;"
              title="(${a}, ${b}) = ${text}">
            ${text}
          </td>
        `;
      }
      gridHtml += '</tr>';
    }
    gridHtml += '</tbody></table>';

    this.matrixMount.innerHTML = gridHtml;

    // Attach click events to cells
    this.matrixMount.querySelectorAll('.matrix-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const row = isNaN(Number(cell.dataset.row)) ? cell.dataset.row : Number(cell.dataset.row);
        const col = isNaN(Number(cell.dataset.col)) ? cell.dataset.col : Number(cell.dataset.col);
        this.controller.togglePair(row, col);
      });
    });
  }

  onPointerDown(e) {
    const nodeEl = e.target.closest('.rel-node-group');
    if (nodeEl) {
      const idStr = nodeEl.dataset.nodeId;
      const id = isNaN(Number(idStr)) ? idStr : Number(idStr);
      const nodes = this.getNodePositions();
      const node = nodes.find(n => n.id === id);
      if (node) {
        this.activeDrag = {
          startNode: node,
          currentPos: { x: node.x, y: node.y },
          hasMoved: false
        };
      }
      return;
    }

    const edgeEl = e.target.closest('.rel-edge-group');
    if (edgeEl) {
      const [aStr, bStr] = edgeEl.dataset.edge.split(',');
      const a = isNaN(Number(aStr)) ? aStr : Number(aStr);
      const b = isNaN(Number(bStr)) ? bStr : Number(bStr);
      this.controller.togglePair(a, b);
    }
  }

  onPointerMove(e) {
    if (!this.activeDrag) return;
    const rect = this.svg.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    if (Math.hypot(curX - this.activeDrag.startNode.x, curY - this.activeDrag.startNode.y) > 8) {
      this.activeDrag.hasMoved = true;
    }

    this.activeDrag.currentPos = { x: curX, y: curY };
    this.render();
  }

  onPointerUp(e) {
    if (!this.activeDrag) return;
    const { startNode, currentPos, hasMoved } = this.activeDrag;
    this.activeDrag = null;

    if (!hasMoved) {
      // User simply clicked the node -> toggle self-loop (startNode, startNode)
      this.controller.togglePair(startNode.id, startNode.id);
      return;
    }

    // Dragged: check if dropped on a target node
    const nodes = this.getNodePositions();
    const hitTarget = nodes.find(n => Math.hypot(n.x - currentPos.x, n.y - currentPos.y) <= 26);

    if (hitTarget) {
      this.controller.togglePair(startNode.id, hitTarget.id);
    } else {
      this.render();
    }
  }
}
