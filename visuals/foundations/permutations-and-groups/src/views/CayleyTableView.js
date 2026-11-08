/**
 * CayleyTableView — Symmetric Group S_3 Cayley Table & Non-Commutativity Inspector
 * Visual Mathematics Lab — Module 3: Permutations & Symmetric Groups S_n
 */

import { PermutationMath } from '../../../js/foundations-core.js';

export class CayleyTableView {
  constructor(container, controller) {
    this.container = container;
    this.controller = controller;
    this.selectedRow = null;
    this.selectedCol = null;

    // Elements of S_3 in standard order
    this.s3Elements = [
      { name: 'e', mapping: [1, 2, 3], order: 1, type: 'id' },
      { name: '(1 2)', mapping: [2, 1, 3], order: 2, type: 'transposition' },
      { name: '(1 3)', mapping: [3, 2, 1], order: 2, type: 'transposition' },
      { name: '(2 3)', mapping: [1, 3, 2], order: 2, type: 'transposition' },
      { name: '(1 2 3)', mapping: [2, 3, 1], order: 3, type: '3-cycle' },
      { name: '(1 3 2)', mapping: [3, 1, 2], order: 3, type: '3-cycle' }
    ];

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="cayley-table-container" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 16px; box-sizing: border-box; overflow-y: auto;">
        
        <!-- Top: Description & Non-Commutativity Inspector Banner -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-size: 0.9rem; color: #e2e8f0;">
              Symmetric Group S₃ Cayley Multiplication Table (|S₃| = 3! = 6)
            </h4>
            <div style="display: flex; gap: 8px; font-size: 0.72rem;">
              <span style="color: #64748b;">■ Order 1</span>
              <span style="color: #38bdf8;">■ Order 2 (Transposition)</span>
              <span style="color: #c084fc;">■ Order 3 (3-Cycle)</span>
            </div>
          </div>
          <div id="commutativity-telemetry" style="font-family: monospace; font-size: 0.85rem; color: #cbd5e1; margin-top: 8px; line-height: 1.5;">
            Click any cell (σ, τ) to inspect the composition σ ∘ τ vs τ ∘ σ.
          </div>
        </div>

        <!-- Center: 6x6 Cayley Multiplication Table -->
        <div style="flex: 1; min-height: 280px; background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: center;">
          <div id="cayley-grid-mount" style="overflow-x: auto; max-width: 100%;"></div>
        </div>

        <!-- Bottom: Cayley's Theorem Note -->
        <div style="background: #0c1322; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-top: 12px; font-size: 0.8rem; color: #94a3b8; line-height: 1.5;">
          <strong>Cayley's Representation Theorem:</strong> Every finite group $G$ is isomorphic to a subgroup of the symmetric group $S_{|G|}$. Understanding permutation groups unlocks the structure of all finite groups.
        </div>

      </div>
    `;

    this.render();
  }

  render() {
    const mount = this.container.querySelector('#cayley-grid-mount');
    if (!mount) return;

    const elements = this.s3Elements;
    const n = elements.length;

    let html = `
      <table style="border-collapse: collapse; text-align: center; font-family: monospace; font-size: 0.85rem; color: #cbd5e1;">
        <thead>
          <tr>
            <th style="padding: 6px 12px; color: #64748b; border-bottom: 2px solid rgba(255,255,255,0.2);">∘</th>
            ${elements.map(e => `<th style="padding: 6px 12px; color: #38bdf8; border-bottom: 2px solid rgba(255,255,255,0.2);">${e.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    for (let r = 0; r < n; r++) {
      const sigma = elements[r];
      html += `<tr><th style="padding: 6px 12px; color: #38bdf8; border-right: 2px solid rgba(255,255,255,0.2);">${sigma.name}</th>`;

      for (let c = 0; c < n; c++) {
        const tau = elements[c];
        // Composition (sigma ∘ tau)(x) = sigma(tau(x))
        const compMapping = PermutationMath.composePermutations(tau.mapping, sigma.mapping);
        const match = elements.find(e => 
          e.mapping.every((val, idx) => val === compMapping[idx])
        );

        const resultName = match ? match.name : '?';
        const isSelectedCell = this.selectedRow === r && this.selectedCol === c;
        const isReversedCell = this.selectedRow === c && this.selectedCol === r;

        let bg = 'rgba(30, 41, 59, 0.4)';
        let border = 'rgba(255, 255, 255, 0.08)';
        let color = '#94a3b8';

        if (match.order === 1) {
          color = '#94a3b8';
        } else if (match.order === 2) {
          color = '#38bdf8';
        } else if (match.order === 3) {
          color = '#c084fc';
        }

        if (isSelectedCell) {
          bg = 'rgba(245, 158, 11, 0.3)';
          border = '1px solid #f59e0b';
        } else if (isReversedCell && r !== c) {
          bg = 'rgba(236, 72, 153, 0.3)';
          border = '1px solid #ec4899';
        }

        html += `
          <td class="cayley-cell" data-row="${r}" data-col="${c}" 
              style="padding: 8px 12px; border: 1px solid ${border}; background: ${bg}; color: ${color}; font-weight: bold; cursor: pointer; transition: background 0.15s;"
              title="${sigma.name} ∘ ${tau.name} = ${resultName}">
            ${resultName}
          </td>
        `;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    mount.innerHTML = html;

    // Attach click events
    mount.querySelectorAll('.cayley-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        this.selectedRow = parseInt(cell.dataset.row, 10);
        this.selectedCol = parseInt(cell.dataset.col, 10);
        this.render();
        this.updateCommutativityReadout();
      });
    });

    this.updateCommutativityReadout();
  }

  updateCommutativityReadout() {
    const tel = this.container.querySelector('#commutativity-telemetry');
    if (!tel) return;

    if (this.selectedRow === null || this.selectedCol === null) {
      tel.innerHTML = `Click any cell (σ, τ) to test non-commutativity: <strong>(1 2) ∘ (2 3) = (1 2 3)</strong> vs <strong>(2 3) ∘ (1 2) = (1 3 2)</strong>.`;
      return;
    }

    const sigma = this.s3Elements[this.selectedRow];
    const tau = this.s3Elements[this.selectedCol];

    const comp1 = PermutationMath.composePermutations(tau.mapping, sigma.mapping);
    const comp2 = PermutationMath.composePermutations(sigma.mapping, tau.mapping);

    const match1 = this.s3Elements.find(e => e.mapping.every((v, i) => v === comp1[i]));
    const match2 = this.s3Elements.find(e => e.mapping.every((v, i) => v === comp2[i]));

    const name1 = match1 ? match1.name : '?';
    const name2 = match2 ? match2.name : '?';
    const commutes = name1 === name2;

    if (commutes) {
      tel.innerHTML = `
        <span style="color: #34d399;">Commutes:</span> 
        ${sigma.name} ∘ ${tau.name} = <strong>${name1}</strong> &nbsp;and&nbsp; 
        ${tau.name} ∘ ${sigma.name} = <strong>${name2}</strong>
      `;
    } else {
      tel.innerHTML = `
        <span style="color: #f87171; font-weight: bold;">NON-COMMUTATIVE:</span> 
        <span style="color: #fbbf24;">${sigma.name} ∘ ${tau.name} = ${name1}</span> &nbsp;&ne;&nbsp; 
        <span style="color: #f472b6;">${tau.name} ∘ ${sigma.name} = ${name2}</span> 
        (Proves S₃ is non-abelian!)
      `;
    }
  }
}
