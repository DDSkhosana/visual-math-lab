/**
 * PosetHasseView — Transitive Reduction & Upward Hasse Diagrams
 * Visual Mathematics Lab — Module 2: Relations, Order & Equivalence
 */

import { RelationMath } from '../../../js/foundations-core.js';

export class PosetHasseView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="poset-hasse-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        <!-- Top: Status Header -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0; font-size: 0.9rem; color: #e2e8f0;">
              Hasse Diagram (Transitive Reduction of Poset)
            </h4>
            <div id="hasse-status-desc" style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">
              Self-loops and transitive shortcuts are pruned; edges point strictly upward.
            </div>
          </div>
          <div id="hasse-type-badge" class="axiom-badge is-valid" style="font-size: 0.72rem;">
            Poset Active
          </div>
        </div>

        <!-- Center: Hasse Diagram SVG -->
        <div style="flex: 1; min-height: 320px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="hasse-diagram-svg" viewBox="0 0 500 320" style="width: 100%; height: 100%; display: block; user-select: none;">
            <g id="hasse-edges-layer"></g>
            <g id="hasse-nodes-layer"></g>
          </svg>
        </div>

        <!-- Bottom: Chains & Antichains Telemetry -->
        <div id="hasse-telemetry" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-top: 12px; font-family: monospace; font-size: 0.8rem; color: #cbd5e1; line-height: 1.5;"></div>
      </div>
    `;

    this.svg = this.container.querySelector('#hasse-diagram-svg');
    this.edgesLayer = this.container.querySelector('#hasse-edges-layer');
    this.nodesLayer = this.container.querySelector('#hasse-nodes-layer');

    this.render();
  }

  /**
   * Computes transitive reduction of a partial order:
   * Finds strict covering relation a <• b (a < b with no intermediate x such that a < x < b).
   */
  computeTransitiveReduction(elements, pairs) {
    // 1. Filter out self-loops (a !== b)
    const strictPairs = pairs.filter(([a, b]) => a !== b);
    const pairSet = new Set(strictPairs.map(([a, b]) => `${a}->${b}`));

    // 2. An edge a -> b is redundant if there exists some c != a, b such that a -> c and c -> b
    const coveringEdges = [];

    for (const [a, b] of strictPairs) {
      let isRedundant = false;
      for (const c of elements) {
        if (c !== a && c !== b) {
          if (pairSet.has(`${a}->${c}`) && pairSet.has(`${c}->${b}`)) {
            isRedundant = true;
            break;
          }
        }
      }
      if (!isRedundant) {
        coveringEdges.push([a, b]);
      }
    }

    return coveringEdges;
  }

  /**
   * Assigns topological levels (ranks) for upward Hasse diagram layout
   */
  computeHasseLayout(elements, coveringEdges) {
    const inDegree = new Map(elements.map(e => [e, 0]));
    const children = new Map(elements.map(e => [e, []]));

    for (const [a, b] of coveringEdges) {
      if (inDegree.has(b)) inDegree.set(b, inDegree.get(b) + 1);
      if (children.has(a)) children.get(a).push(b);
    }

    // Level assignment: rank(x) = max length of path from minimal elements
    const levels = new Map();
    const minimalElements = elements.filter(e => inDegree.get(e) === 0);

    for (const m of minimalElements) {
      levels.set(m, 0);
    }

    // Bellman-Ford-like relaxation for acyclic poset DAG
    let changed = true;
    let iterations = 0;
    while (changed && iterations < elements.length) {
      changed = false;
      iterations++;
      for (const [a, b] of coveringEdges) {
        const lvlA = levels.get(a) ?? 0;
        const currentLvlB = levels.get(b) ?? 0;
        if (lvlA + 1 > currentLvlB) {
          levels.set(b, lvlA + 1);
          changed = true;
        }
      }
    }

    // Default missing elements to level 0
    for (const e of elements) {
      if (!levels.has(e)) levels.set(e, 0);
    }

    // Group elements by level
    const maxLevel = Math.max(...Array.from(levels.values()), 0);
    const levelGroups = Array.from({ length: maxLevel + 1 }, () => []);

    for (const e of elements) {
      const lvl = levels.get(e);
      levelGroups[lvl].push(e);
    }

    // Calculate (x, y) coordinates: level 0 is at bottom, maxLevel is at top
    const width = 500;
    const height = 320;
    const paddingY = 40;
    const availableH = height - paddingY * 2;
    const ySpacing = maxLevel > 0 ? availableH / maxLevel : 0;

    const nodeCoords = new Map();

    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const group = levelGroups[lvl];
      const y = height - paddingY - lvl * ySpacing;
      const xSpacing = width / (group.length + 1);

      group.forEach((elem, idx) => {
        const x = (idx + 1) * xSpacing;
        nodeCoords.set(elem, { x, y, level: lvl });
      });
    }

    return { nodeCoords, maxLevel, minimalElements };
  }

  render() {
    if (!this.svg) return;
    const state = this.controller.state;
    const analysis = RelationMath.analyzeRelation(state.elements, state.pairs);

    const statusBadge = this.container.querySelector('#hasse-type-badge');
    const statusDesc = this.container.querySelector('#hasse-status-desc');
    const tel = this.container.querySelector('#hasse-telemetry');

    if (!analysis.isPartialOrder) {
      if (statusBadge) {
        statusBadge.className = 'axiom-badge is-violated';
        statusBadge.textContent = 'Not a Poset';
      }
      if (statusDesc) {
        statusDesc.textContent = 'Current relation is not a Partial Order. A poset requires Reflexivity, Antisymmetry, and Transitivity.';
      }
      this.edgesLayer.innerHTML = '';
      this.nodesLayer.innerHTML = `
        <text x="250" y="160" text-anchor="middle" fill="#f87171" font-size="14" font-weight="bold">
          Cannot construct Hasse Diagram: Relation is not a Partial Order
        </text>
        <text x="250" y="190" text-anchor="middle" fill="#94a3b8" font-size="12">
          Select the "Partial Order" preset in the dock to view the Hasse lattice.
        </text>
      `;
      if (tel) tel.innerHTML = 'Hasse diagram requires an acyclic antisymmetric partial order.';
      return;
    }

    if (statusBadge) {
      statusBadge.className = 'axiom-badge is-valid';
      statusBadge.textContent = analysis.isTotalOrder ? 'Total Order (Chain)' : 'Partial Order (Poset)';
    }
    if (statusDesc) {
      statusDesc.textContent = analysis.isTotalOrder 
        ? 'Total order (Chain): all pairs are comparable.' 
        : 'Partial order (Poset): some pairs may be mutually incomparable.';
    }

    // 1. Transitive Reduction
    const coveringEdges = this.computeTransitiveReduction(state.elements, state.pairs);
    const layout = this.computeHasseLayout(state.elements, coveringEdges);

    // 2. Render Covering Edges (Upward lines)
    let edgesHtml = '';
    for (const [a, b] of coveringEdges) {
      const pA = layout.nodeCoords.get(a);
      const pB = layout.nodeCoords.get(b);
      if (pA && pB) {
        edgesHtml += `
          <line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" 
                stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" />
        `;
      }
    }
    this.edgesLayer.innerHTML = edgesHtml;

    // 3. Render Nodes
    let nodesHtml = '';
    for (const elem of state.elements) {
      const p = layout.nodeCoords.get(elem);
      if (p) {
        nodesHtml += `
          <g transform="translate(${p.x}, ${p.y})">
            <circle r="16" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5" />
            <text y="5" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="bold">${elem}</text>
          </g>
        `;
      }
    }
    this.nodesLayer.innerHTML = nodesHtml;

    // 4. Telemetry Readout
    if (tel) {
      const coveringList = coveringEdges.map(([a, b]) => `${a} &lessdot; ${b}`).join(', ');
      tel.innerHTML = `
        <div><strong>Covering Relations (a &lessdot; b):</strong> { ${coveringList || 'none'} }</div>
        <div><strong>Minimal Elements (Bottom):</strong> { ${layout.minimalElements.join(', ')} }</div>
        <div><strong>Total Elements:</strong> ${state.elements.length} &nbsp;|&nbsp; <strong>Height (Levels):</strong> ${layout.maxLevel + 1}</div>
      `;
    }
  }
}
