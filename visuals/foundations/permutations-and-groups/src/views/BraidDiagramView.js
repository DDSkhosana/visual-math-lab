/**
 * BraidDiagramView — Transposition String Braiding, Inversions & Parity Gauge
 * Visual Mathematics Lab — Module 3: Permutations & Symmetric Groups S_n
 */

import { PermutationMath } from '../../../js/foundations-core.js';

export class BraidDiagramView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="braid-diagram-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Top: Parity & Sign Gauge Banner -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Parity &amp; Multiplicative Sign Gauge
            </div>
            <div id="braid-parity-status" style="font-size: 1.15rem; font-weight: bold; color: #34d399;">
              EVEN PERMUTATION (sgn = +1)
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <div id="badge-an-group" class="axiom-badge is-valid" style="font-size: 0.78rem;">
              Member of A_n
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 0.9rem; color: #cbd5e1;">
              Inversions: <strong id="braid-inversion-count" style="color: #38bdf8;">0</strong>
            </div>
          </div>
        </div>

        <!-- Center: Braiding Strands SVG -->
        <div style="flex: 1; min-height: 280px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <svg id="braid-svg" viewBox="0 0 500 280" style="width: 100%; height: 100%; display: block; user-select: none;">
            <g id="braid-strands-layer"></g>
            <g id="braid-intersections-layer"></g>
            <g id="braid-labels-layer"></g>
          </svg>
        </div>

        <!-- Bottom: Transposition Product Decomposition -->
        <div id="braid-transposition-breakdown" style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-top: 12px; font-family: monospace; font-size: 0.82rem; color: #cbd5e1; line-height: 1.6;"></div>

      </div>
    `;

    this.svg = this.container.querySelector('#braid-svg');
    this.strandsLayer = this.container.querySelector('#braid-strands-layer');
    this.intersectionsLayer = this.container.querySelector('#braid-intersections-layer');
    this.labelsLayer = this.container.querySelector('#braid-labels-layer');

    this.render();
  }

  render() {
    if (!this.svg) return;
    const state = this.controller.state;
    const n = state.n;
    const mapping = state.mapping;

    const parityInfo = PermutationMath.computeParityAndSign(mapping);
    const cycles = PermutationMath.toCycleNotation(mapping);

    // 1. Update Gauge & Badges
    const parityStatus = this.container.querySelector('#braid-parity-status');
    const anBadge = this.container.querySelector('#badge-an-group');
    const invCount = this.container.querySelector('#braid-inversion-count');

    if (parityStatus) {
      if (parityInfo.isEven) {
        parityStatus.style.color = '#34d399';
        parityStatus.textContent = `EVEN PERMUTATION (sgn(σ) = +1)`;
      } else {
        parityStatus.style.color = '#f87171';
        parityStatus.textContent = `ODD PERMUTATION (sgn(σ) = -1)`;
      }
    }

    if (anBadge) {
      anBadge.className = `axiom-badge ${parityInfo.isEven ? 'is-valid' : 'is-violated'}`;
      anBadge.textContent = parityInfo.isEven ? `Member of Alternating Group A_${n}` : `Not in A_${n} (Odd Parity)`;
    }

    if (invCount) {
      invCount.textContent = parityInfo.inversions;
    }

    // 2. Render Vertical Braiding Strands
    this.renderStrands(n, mapping, parityInfo);

    // 3. Render Transposition Product Decomposition Readout
    this.renderTranspositionBreakdown(cycles, parityInfo);
  }

  renderStrands(n, mapping, parityInfo) {
    const width = 500;
    const height = 280;
    const topY = 40;
    const botY = 240;
    const paddingX = 70;
    const availableW = width - paddingX * 2;
    const strandSpacing = availableW / (n - 1);

    const colors = ['#38bdf8', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

    let strandsHtml = '';
    let labelsHtml = '';

    // Draw top and bottom terminal rails
    strandsHtml += `
      <line x1="${paddingX - 20}" y1="${topY}" x2="${width - paddingX + 20}" y2="${topY}" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2" />
      <line x1="${paddingX - 20}" y1="${botY}" x2="${width - paddingX + 20}" y2="${botY}" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2" />
    `;

    for (let i = 0; i < n; i++) {
      const startX = paddingX + i * strandSpacing;
      const targetIndex = mapping[i] - 1; // 0-indexed destination
      const endX = paddingX + targetIndex * strandSpacing;
      const strandColor = colors[i % colors.length];

      // Smooth S-curve connecting top input i+1 to bottom output mapping[i]
      const midY = (topY + botY) / 2;
      const pathD = `M ${startX} ${topY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${botY}`;

      strandsHtml += `
        <path d="${pathD}" fill="none" stroke="${strandColor}" stroke-width="3" stroke-linecap="round" />
      `;

      // Top label
      labelsHtml += `
        <circle cx="${startX}" cy="${topY}" r="12" fill="#0f172a" stroke="${strandColor}" stroke-width="2" />
        <text x="${startX}" y="${topY + 4}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">${i + 1}</text>
        <text x="${startX}" y="${topY - 18}" text-anchor="middle" fill="#94a3b8" font-size="10">x_${i + 1}</text>
      `;

      // Bottom label
      labelsHtml += `
        <circle cx="${endX}" cy="${botY}" r="12" fill="#0f172a" stroke="${strandColor}" stroke-width="2" />
        <text x="${endX}" y="${botY + 4}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold">${mapping[i]}</text>
        <text x="${endX}" y="${botY + 22}" text-anchor="middle" fill="#94a3b8" font-size="10">σ(${i + 1})</text>
      `;
    }

    this.strandsLayer.innerHTML = strandsHtml;
    this.labelsLayer.innerHTML = labelsHtml;
  }

  renderTranspositionBreakdown(cycles, parityInfo) {
    const breakdownEl = this.container.querySelector('#braid-transposition-breakdown');
    if (!breakdownEl) return;

    const allTranspositions = [];
    for (const c of cycles) {
      allTranspositions.push(...PermutationMath.decomposeIntoTranspositions(c));
    }

    const transString = allTranspositions.length > 0 
      ? allTranspositions.map(([a, b]) => `(${a} ${b})`).join(' ∘ ')
      : 'id = () (0 transpositions)';

    const invPairsText = parityInfo.inversionPairs.length > 0
      ? parityInfo.inversionPairs.map(([a, b]) => `(${a}, ${b})`).join(', ')
      : 'None (Identity arrangement)';

    breakdownEl.innerHTML = `
      <div><strong>Transposition Decomposition (2-cycles):</strong> σ = ${transString}</div>
      <div><strong>Transposition Count:</strong> ${allTranspositions.length} ⟼ Parity: <strong>${allTranspositions.length % 2 === 0 ? 'EVEN' : 'ODD'}</strong></div>
      <div style="margin-top: 4px;"><strong>Inversion Crossings:</strong> { ${invPairsText} } &nbsp;|&nbsp; <strong>Count:</strong> ${parityInfo.inversions}</div>
    `;
  }
}
