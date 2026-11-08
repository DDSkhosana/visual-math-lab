/**
 * DiscreteMappingView — Interactive Dual-Set Bipartite Mapping Canvas
 * Visual Mathematics Lab — Module 1: Functions, Inverses & Reversibility
 */

import { FunctionMath } from '../../../js/foundations-core.js';

export class DiscreteMappingView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.svg = null;
    this.width = 0;
    this.height = 0;
    this.activeDrag = null;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="bipartite-container" id="bipartite-view">
        <svg class="bipartite-svg" id="bipartite-svg">
          <defs>
            <marker id="arrow-domain" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-inverse" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f472b6" />
            </marker>
            <marker id="arrow-collision" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f87171" />
            </marker>
            <filter id="glow-domain" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g id="bg-layer"></g>
          <g id="arrows-layer"></g>
          <g id="particles-layer"></g>
          <g id="nodes-layer"></g>
        </svg>
      </div>
    `;

    this.svg = this.container.querySelector('#bipartite-svg');
    this.bgLayer = this.container.querySelector('#bg-layer');
    this.arrowsLayer = this.container.querySelector('#arrows-layer');
    this.particlesLayer = this.container.querySelector('#particles-layer');
    this.nodesLayer = this.container.querySelector('#nodes-layer');

    this.setupEventListeners();
    this.resize();
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    // Interactive Arrow Creation / Dragging
    this.svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || 600;
    this.height = rect.height || 450;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.render();
  }

  getLayout() {
    const state = this.controller.state;
    const paddingY = 60;
    const availableH = Math.max(200, this.height - paddingY * 2);

    const xDomain = Math.max(70, this.width * 0.22);
    const xCodomain = Math.min(this.width - 70, this.width * 0.78);

    const domainCount = state.domain.length;
    const codomainCount = state.codomain.length;

    const domainSpacing = domainCount > 1 ? availableH / (domainCount - 1) : 0;
    const codomainSpacing = codomainCount > 1 ? availableH / (codomainCount - 1) : 0;

    const domainNodes = state.domain.map((item, idx) => ({
      id: item,
      type: 'domain',
      x: xDomain,
      y: domainCount === 1 ? this.height / 2 : paddingY + idx * domainSpacing
    }));

    const codomainNodes = state.codomain.map((item, idx) => ({
      id: item,
      type: 'codomain',
      x: xCodomain,
      y: codomainCount === 1 ? this.height / 2 : paddingY + idx * codomainSpacing
    }));

    return { domainNodes, codomainNodes, xDomain, xCodomain };
  }

  render() {
    if (!this.svg || this.width === 0) return;

    const state = this.controller.state;
    const analysis = FunctionMath.analyzeRelationAsFunction(state.domain, state.codomain, state.pairs);
    const layout = this.getLayout();

    // 1. Render Background Enclosures (Set Venn boundaries)
    this.renderEnclosures(layout);

    // 2. Render Arrows
    this.renderArrows(layout, analysis, state);

    // 3. Render Nodes
    this.renderNodes(layout, analysis, state);
  }

  renderEnclosures(layout) {
    const radius = 34;
    const topY = 40;
    const botY = this.height - 40;
    const domainX = layout.xDomain;
    const codomainX = layout.xCodomain;

    this.bgLayer.innerHTML = `
      <!-- Domain Set Enclosure -->
      <rect x="${domainX - radius - 15}" y="${topY - 10}" width="${radius * 2 + 30}" height="${botY - topY + 20}" 
            rx="28" fill="rgba(3, 105, 161, 0.08)" stroke="rgba(56, 189, 248, 0.25)" stroke-dasharray="6 4" stroke-width="1.5" />
      <text x="${domainX}" y="${topY - 18}" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="700" letter-spacing="1">
        DOMAIN X
      </text>

      <!-- Codomain Set Enclosure -->
      <rect x="${codomainX - radius - 15}" y="${topY - 10}" width="${radius * 2 + 30}" height="${botY - topY + 20}" 
            rx="28" fill="rgba(190, 24, 93, 0.08)" stroke="rgba(244, 114, 182, 0.25)" stroke-dasharray="6 4" stroke-width="1.5" />
      <text x="${codomainX}" y="${topY - 18}" text-anchor="middle" fill="#f472b6" font-size="13" font-weight="700" letter-spacing="1">
        CODOMAIN Y
      </text>

      <text x="${(domainX + codomainX) / 2}" y="${topY - 18}" text-anchor="middle" fill="#94a3b8" font-size="12" font-style="italic">
        ${this.controller.state.showInverse ? 'f⁻¹: Y → X' : 'f: X → Y'}
      </text>
    `;
  }

  renderArrows(layout, analysis, state) {
    const dMap = new Map(layout.domainNodes.map(n => [n.id, n]));
    const cMap = new Map(layout.codomainNodes.map(n => [n.id, n]));
    const isInverse = state.showInverse && analysis.isBijective;

    let arrowsHtml = '';

    for (const [x, y] of state.pairs) {
      const nodeX = dMap.get(x);
      const nodeY = cMap.get(y);
      if (!nodeX || !nodeY) continue;

      const isCollision = analysis.collisionOutputs.some(c => c.y === y);

      let marker = 'url(#arrow-domain)';
      let strokeColor = '#38bdf8';

      if (isInverse) {
        marker = 'url(#arrow-inverse)';
        strokeColor = '#f472b6';
      } else if (isCollision) {
        marker = 'url(#arrow-collision)';
        strokeColor = '#f87171';
      }

      // Bezier curve between source and target
      const p1x = isInverse ? nodeY.x : nodeX.x;
      const p1y = isInverse ? nodeY.y : nodeX.y;
      const p2x = isInverse ? nodeX.x : nodeY.x;
      const p2y = isInverse ? nodeX.y : nodeY.y;

      const dx = (p2x - p1x) * 0.5;
      const pathD = `M ${p1x} ${p1y} C ${p1x + dx} ${p1y}, ${p2x - dx} ${p2y}, ${p2x} ${p2y}`;

      arrowsHtml += `
        <g class="arrow-group" data-pair="${x},${y}">
          <path d="${pathD}" class="mapping-arrow ${isInverse ? 'is-inverse' : ''} ${isCollision ? 'is-collision' : ''}" 
                stroke="${strokeColor}" style="marker-end: ${marker};" />
        </g>
      `;
    }

    // If currently dragging to create/change an arrow
    if (this.activeDrag) {
      const { startNode, currentPos } = this.activeDrag;
      const dx = (currentPos.x - startNode.x) * 0.5;
      const pathD = `M ${startNode.x} ${startNode.y} C ${startNode.x + dx} ${startNode.y}, ${currentPos.x - dx} ${currentPos.y}, ${currentPos.x} ${currentPos.y}`;
      arrowsHtml += `
        <path d="${pathD}" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="4 4" fill="none" />
      `;
    }

    this.arrowsLayer.innerHTML = arrowsHtml;
  }

  renderNodes(layout, analysis, state) {
    let nodesHtml = '';

    // Render Domain Nodes
    for (const node of layout.domainNodes) {
      const isMissing = analysis.missingInputs.includes(node.id);
      const isMulti = analysis.multiValuedInputs.some(m => m.x === node.id);

      let badgeFill = '#0369a1';
      let stroke = '#38bdf8';
      let statusIcon = '';

      if (isMissing) {
        badgeFill = '#451a03';
        stroke = '#f59e0b';
        statusIcon = '<text x="0" y="24" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="bold">No output</text>';
      } else if (isMulti) {
        badgeFill = '#450a0a';
        stroke = '#f87171';
        statusIcon = '<text x="0" y="24" text-anchor="middle" fill="#f87171" font-size="10" font-weight="bold">Multi-val</text>';
      }

      nodesHtml += `
        <g class="node-group node-domain" transform="translate(${node.x}, ${node.y})" data-node-id="${node.id}" data-type="domain">
          <circle r="18" fill="${badgeFill}" stroke="${stroke}" stroke-width="2.5" />
          <text y="5" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">${node.id}</text>
          ${statusIcon}
        </g>
      `;
    }

    // Render Codomain Nodes
    for (const node of layout.codomainNodes) {
      const isUnhit = analysis.unhitOutputs.includes(node.id);
      const isCollision = analysis.collisionOutputs.some(c => c.y === node.id);

      let badgeFill = '#831843';
      let stroke = '#f472b6';
      let statusIcon = '';

      if (isUnhit) {
        badgeFill = 'rgba(30, 41, 59, 0.8)';
        stroke = '#64748b';
        statusIcon = '<text x="0" y="24" text-anchor="middle" fill="#94a3b8" font-size="10">Unhit</text>';
      } else if (isCollision) {
        const count = state.pairs.filter(([, y]) => y === node.id).length;
        badgeFill = '#7f1d1d';
        stroke = '#f87171';
        statusIcon = `<text x="0" y="24" text-anchor="middle" fill="#f87171" font-size="10" font-weight="bold">${count} collisions</text>`;
      }

      nodesHtml += `
        <g class="node-group node-codomain ${isUnhit ? 'is-unhit' : ''} ${isCollision ? 'is-collision' : ''}" 
           transform="translate(${node.x}, ${node.y})" data-node-id="${node.id}" data-type="codomain">
          <circle r="18" fill="${badgeFill}" stroke="${stroke}" stroke-width="2.5" />
          <text y="5" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="700">${node.id}</text>
          ${statusIcon}
        </g>
      `;
    }

    this.nodesLayer.innerHTML = nodesHtml;
  }

  onPointerDown(e) {
    const targetNode = e.target.closest('.node-group');
    if (!targetNode) {
      // Check if user clicked an arrow to remove it
      const arrowGroup = e.target.closest('.arrow-group');
      if (arrowGroup) {
        const pairStr = arrowGroup.dataset.pair;
        if (pairStr) {
          const [x, y] = pairStr.split(',');
          this.controller.removePair(isNaN(Number(x)) ? x : Number(x), isNaN(Number(y)) ? y : Number(y));
        }
      }
      return;
    }

    const type = targetNode.dataset.type;
    const id = targetNode.dataset.nodeId;
    const nodeId = isNaN(Number(id)) ? id : Number(id);

    if (type === 'domain') {
      const layout = this.getLayout();
      const node = layout.domainNodes.find(n => n.id === nodeId);
      if (node) {
        this.activeDrag = {
          startNode: node,
          currentPos: { x: node.x, y: node.y }
        };
      }
    }
  }

  onPointerMove(e) {
    if (!this.activeDrag) return;
    const rect = this.svg.getBoundingClientRect();
    this.activeDrag.currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.render();
  }

  onPointerUp(e) {
    if (!this.activeDrag) return;
    const { startNode, currentPos } = this.activeDrag;
    this.activeDrag = null;

    // Check if dropped near a codomain node
    const layout = this.getLayout();
    const hitCodomain = layout.codomainNodes.find(node => {
      const dist = Math.hypot(node.x - currentPos.x, node.y - currentPos.y);
      return dist <= 32;
    });

    if (hitCodomain) {
      this.controller.setMapping(startNode.id, hitCodomain.id);
    } else {
      this.render();
    }
  }
}
