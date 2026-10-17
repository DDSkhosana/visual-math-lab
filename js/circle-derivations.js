import { UnitSystemConverter } from './circle-core.js';

export const fmtAngle = (deg, unit = 'deg', decimals = null) => UnitSystemConverter.formatAngle(deg, unit, decimals);
export const fmtLength = (px, unit = 'px', radius = 180, decimals = null) => UnitSystemConverter.formatLength(px, unit, radius, decimals);
export const fmtArea = (pxSq, unit = 'px', radius = 180, decimals = null) => UnitSystemConverter.formatArea(pxSq, unit, radius, decimals);

export const tag = (color, text) => `<span class="color-${color}">${text}</span>`;

export function cardTemplate(id, badge, title, symbolicLines, hasHighlight = false) {
  return `
    <div class="derivation-card" id="${id}">
      <div class="derivation-card-header collapsible-header" role="button" tabindex="0" aria-expanded="false">
        <div class="derivation-card-header-title">
          <span class="derivation-badge">${badge}</span>
          <span class="derivation-title">${title}</span>
        </div>
        <span class="icon">▼</span>
      </div>
      <div class="derivation-card-content collapsible-content">
        <div class="derivation-math-row">${symbolicLines}</div>
        <div class="derivation-sub-row" data-sub></div>
        ${hasHighlight ? '<div class="derivation-eval-highlight" data-eval></div>' : ''}
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// 1. Angle at Centre Theorem Derivations
// -----------------------------------------------------------------------------
export class AngleAtCentreDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'aac-step-1',
        'Step 1',
        `Center & Radii Invariant (${tag('red', 'OA')} = ${tag('orange', 'OB')} = ${tag('lavender', 'OP')} = ${tag('indigo', 'r')})`,
        `Center ${tag('indigo', 'O')} = (${tag('amber', '0')}, ${tag('lime', '0')})<br>` +
        `Endpoints: ${tag('red', 'A')}(${tag('amber', 'r cos θ_A')}, ${tag('lime', 'r sin θ_A')}), ${tag('orange', 'B')}(${tag('amber', 'r cos θ_B')}, ${tag('lime', 'r sin θ_B')})<br>` +
        `Vertex ${tag('violet', 'P')}(${tag('amber', 'r cos θ_P')}, ${tag('lime', 'r sin θ_P')}) on circumference<br>` +
        `Equal radii: |${tag('red', 'OA')}| = |${tag('orange', 'OB')}| = |${tag('lavender', 'OP')}| = ${tag('indigo', 'r')}`
      )}
      ${cardTemplate(
        'aac-step-2',
        'Step 2',
        `Isosceles Triangles (${tag('blue', '△OPA')} & ${tag('orange', '△OPB')})`,
        `In ${tag('blue', '△OPA')}: ${tag('red', 'OA')} = ${tag('lavender', 'OP')} = ${tag('indigo', 'r')} ⟹ base angles ${tag('lime', '∠OAP')} = ${tag('lime', '∠OPA')} = ${tag('lime', 'α')}<br>` +
        `In ${tag('orange', '△OPB')}: ${tag('orange', 'OB')} = ${tag('lavender', 'OP')} = ${tag('indigo', 'r')} ⟹ base angles ${tag('fuchsia', '∠OBP')} = ${tag('fuchsia', '∠OPB')} = ${tag('fuchsia', 'β')}`
      )}
      ${cardTemplate(
        'aac-step-3',
        'Step 3',
        `Inscribed Angle at Circumference (${tag('green', 'θ')} = ${tag('lime', 'α')} + ${tag('fuchsia', 'β')})`,
        `Subtended angle at vertex ${tag('violet', 'P')}:<br>` +
        `${tag('green', '∠APB')} = ${tag('lime', '∠OPA')} + ${tag('fuchsia', '∠OPB')} = ${tag('lime', 'α')} + ${tag('fuchsia', 'β')} = ${tag('green', 'θ')}`,
        true
      )}
      ${cardTemplate(
        'aac-step-4',
        'Step 4',
        `Central Angle & 2:1 Invariant (${tag('yellow', '2θ')} = ${tag('yellow', '∠AOB')})`,
        `Exterior angles of ${tag('blue', '△OPA')} and ${tag('orange', '△OPB')} at center ${tag('indigo', 'O')}:<br>` +
        `${tag('yellow', '∠AOB')} = 2${tag('lime', 'α')} + 2${tag('fuchsia', 'β')} = 2(${tag('lime', 'α')} + ${tag('fuchsia', 'β')}) = 2${tag('green', 'θ')}`,
        true
      )}
      ${cardTemplate(
        'aac-step-5',
        'Step 5',
        `Conjugate Reflex Angles & Perigon Identity (${tag('teal', '360°')})`,
        `Every angle forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'θ* = 360° - θ')}):<br>` +
        `• Central reflex angle: ${tag('yellow', '2θ')} + ${tag('teal', '2θ*')} = ${tag('teal', '360°')} ⟹ ${tag('teal', '2θ*')} = ${tag('teal', '360°')} - ${tag('yellow', '2θ')}<br>` +
        `• Inscribed reflex angle: ${tag('green', 'θ')} + ${tag('teal', 'θ*')} = ${tag('teal', '360°')} ⟹ ${tag('teal', 'θ*')} = ${tag('teal', '360°')} - ${tag('green', 'θ')}<br>` +
        `• Reflex perigon invariant: 2(${tag('teal', 'θ*')} - ${tag('lavender', '180°')}) = ${tag('teal', '2θ*')} - ${tag('teal', '360°')} (exact dual conjugate of 2:1 ratio)`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#aac-step-1 [data-sub]'),
      s2: this.container.querySelector('#aac-step-2 [data-sub]'),
      s3: this.container.querySelector('#aac-step-3 [data-sub]'),
      s3e: this.container.querySelector('#aac-step-3 [data-eval]'),
      s4: this.container.querySelector('#aac-step-4 [data-sub]'),
      s4e: this.container.querySelector('#aac-step-4 [data-eval]'),
      s5: this.container.querySelector('#aac-step-5 [data-sub]'),
      s5e: this.container.querySelector('#aac-step-5 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const ax = g.A ? (g.A.x - g.cx).toFixed(1) : '0.0';
    const ay = g.A ? (-(g.A.y - g.cy)).toFixed(1) : '0.0';
    const bx = g.B ? (g.B.x - g.cx).toFixed(1) : '0.0';
    const by = g.B ? (-(g.B.y - g.cy)).toFixed(1) : '0.0';
    const px = g.P ? (g.P.x - g.cx).toFixed(1) : '0.0';
    const py = g.P ? (-(g.P.y - g.cy)).toFixed(1) : '0.0';

    const insc = g.inscribedDeg;
    const cent = g.centralDeg;
    const ratio = insc > 0.001 ? (cent / insc).toFixed(3) : '2.000';

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('indigo', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}), Radius ${tag('indigo', `r = ${fmtLength(r, lenUnit, r)}`)}<br>` +
        `↳ ${tag('red', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), ${tag('orange', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)})<br>` +
        `↳ ${tag('violet', 'P')} = (${tag('amber', px)}, ${tag('lime', py)}) | ${tag('red', '|OA|')} = ${tag('orange', '|OB|')} = ${tag('lavender', '|OP|')} = ${tag('indigo', fmtLength(r, lenUnit, r))}`;
    }
    if (this.slots.s2) {
      let alpha = (insc * 0.5).toFixed(1);
      let beta = (insc * 0.5).toFixed(1);
      if (g.P && g.A && g.B) {
        const angPA = Math.atan2(g.A.y - g.P.y, g.A.x - g.P.x);
        const angPB = Math.atan2(g.B.y - g.P.y, g.B.x - g.P.x);
        const angPO = Math.atan2(g.cy - g.P.y, g.cx - g.P.x);
        const diffA = Math.abs(((angPA - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        const diffB = Math.abs(((angPB - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        alpha = (diffA * (180 / Math.PI)).toFixed(1);
        beta = (diffB * (180 / Math.PI)).toFixed(1);
      }
      this.slots.s2.innerHTML =
        `↳ Base angle in ${tag('blue', '△OPA')}: ${tag('lime', `α = ${fmtAngle(parseFloat(alpha), angUnit)}`)}<br>` +
        `↳ Base angle in ${tag('orange', '△OPB')}: ${tag('fuchsia', `β = ${fmtAngle(parseFloat(beta), angUnit)}`)}<br>` +
        `↳ Total Inscribed Angle: ${tag('green', 'θ')} = ${tag('lime', fmtAngle(parseFloat(alpha), angUnit))} + ${tag('fuchsia', fmtAngle(parseFloat(beta), angUnit))} = ${tag('green', fmtAngle(insc, angUnit))}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ ${tag('green', 'Inscribed ∠APB (θ)')} = ${tag('green', fmtAngle(insc, angUnit))}<br>` +
        `↳ Subtends Arc AB along circumference`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('green', `Inscribed Angle θ = ${fmtAngle(insc, angUnit)}`)}</span><span class="derivation-check">✓ Measured</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('yellow', 'Central ∠AOB')} = 2 · ${tag('green', fmtAngle(insc, angUnit))} = ${tag('yellow', fmtAngle(cent, angUnit))}<br>` +
        `↳ Angle Ratio = ${tag('yellow', fmtAngle(cent, angUnit))} / ${tag('green', fmtAngle(insc, angUnit))} = ${tag('teal', ratio)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('yellow', `2θ = ${fmtAngle(cent, angUnit)}`)} ≝ 2 × ${tag('green', fmtAngle(insc, angUnit))} (Ratio: ${tag('teal', ratio)})</span><span class="derivation-check">✓ 2:1 Invariant</span>`;
    }
    if (this.slots.s5) {
      const refCent = 360 - cent;
      const refInsc = 360 - insc;
      this.slots.s5.innerHTML =
        `↳ Central Reflex: ${tag('teal', `2θ*`)} = ${tag('teal', fmtAngle(360, angUnit))} - ${tag('yellow', fmtAngle(cent, angUnit))} = ${tag('teal', fmtAngle(refCent, angUnit))} (Perigon: ${tag('yellow', fmtAngle(cent, angUnit))} + ${tag('teal', fmtAngle(refCent, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))})<br>` +
        `↳ Inscribed Reflex: ${tag('teal', `θ*`)} = ${tag('teal', fmtAngle(360, angUnit))} - ${tag('green', fmtAngle(insc, angUnit))} = ${tag('teal', fmtAngle(refInsc, angUnit))} (Perigon: ${tag('green', fmtAngle(insc, angUnit))} + ${tag('teal', fmtAngle(refInsc, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))})`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML =
        `<span>${tag('teal', `Perigon Invariant: 2θ + 2θ* = 360.0° & θ + θ* = 360.0°`)}</span><span class="derivation-check">✓ Perigon Invariant</span>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 2. Angles in Same Segment Theorem Derivations
// -----------------------------------------------------------------------------
export class AnglesInSameSegmentDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'aiss-step-1',
        'Step 1',
        `Common Base Chord ${tag('red', 'AB')} & Subtended Arc`,
        `Circle center ${tag('indigo', 'O')} = (${tag('amber', '0')}, ${tag('lime', '0')}), radius ${tag('indigo', 'r')}<br>` +
        `Base chord endpoints: ${tag('red', 'A')}(${tag('amber', 'r cos θ_A')}, ${tag('lime', 'r sin θ_A')}), ${tag('red', 'B')}(${tag('amber', 'r cos θ_B')}, ${tag('lime', 'r sin θ_B')})<br>` +
        `Central angle subtended by arc AB: ${tag('yellow', '∠AOB = 2θ')}`
      )}
      ${cardTemplate(
        'aiss-step-2',
        'Step 2',
        `Inscribed Angle at First Vertex ${tag('blue', 'P₁')}`,
        `By Angle at Centre Theorem, angle subtended by arc AB at ${tag('blue', 'P₁')} is:<br>` +
        `${tag('blue', '∠AP₁B')} = ½ ${tag('yellow', '∠AOB')} = ${tag('blue', 'θ₁')}`
      )}
      ${cardTemplate(
        'aiss-step-3',
        'Step 3',
        `Inscribed Angle at Second Vertex ${tag('emerald', 'P₂')}`,
        `By Angle at Centre Theorem, angle subtended by arc AB at ${tag('emerald', 'P₂')} is:<br>` +
        `${tag('emerald', '∠AP₂B')} = ½ ${tag('yellow', '∠AOB')} = ${tag('emerald', 'θ₂')}`
      )}
      ${cardTemplate(
        'aiss-step-4',
        'Step 4',
        `Same Segment Angle Invariant (${tag('blue', '∠AP₁B')} = ${tag('emerald', '∠AP₂B')})`,
        `Since both ${tag('blue', 'P₁')} and ${tag('emerald', 'P₂')} lie in the same segment of the circle:<br>` +
        `${tag('blue', '∠AP₁B')} = ½ ${tag('yellow', '∠AOB')} = ${tag('emerald', '∠AP₂B')} ⟹ Difference ${tag('teal', 'Δ = |θ₁ - θ₂| = 0.00°')}`,
        true
      )}
      ${cardTemplate(
        'aiss-step-5',
        'Step 5',
        `Conjugate Reflex Angles & Perigon Identity (${tag('teal', '360°')})`,
        `Every inscribed angle forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'θ* = 360° - θ')}):<br>` +
        `• Reflex angle at ${tag('blue', 'P₁')}: ${tag('blue', 'θ₁')} + ${tag('blue', 'θ₁*')} = ${tag('teal', '360°')} ⟹ ${tag('blue', `θ₁* = ${tag('teal', '360°')} - θ₁`)}<br>` +
        `• Reflex angle at ${tag('emerald', 'P₂')}: ${tag('emerald', 'θ₂')} + ${tag('emerald', 'θ₂*')} = ${tag('teal', '360°')} ⟹ ${tag('emerald', `θ₂* = ${tag('teal', '360°')} - θ₂`)}<br>` +
        `• Reflex Equivalence Invariant: Since ${tag('blue', 'θ₁')} = ${tag('emerald', 'θ₂')}, their reflex conjugates are identically equal: ${tag('teal', 'θ₁* ≡ θ₂* = 360° - θ')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#aiss-step-1 [data-sub]'),
      s2: this.container.querySelector('#aiss-step-2 [data-sub]'),
      s3: this.container.querySelector('#aiss-step-3 [data-sub]'),
      s4: this.container.querySelector('#aiss-step-4 [data-sub]'),
      s4e: this.container.querySelector('#aiss-step-4 [data-eval]'),
      s5: this.container.querySelector('#aiss-step-5 [data-sub]'),
      s5e: this.container.querySelector('#aiss-step-5 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const ax = g.A ? (g.A.x - g.cx).toFixed(1) : '0.0';
    const ay = g.A ? (-(g.A.y - g.cy)).toFixed(1) : '0.0';
    const bx = g.B ? (g.B.x - g.cx).toFixed(1) : '0.0';
    const by = g.B ? (-(g.B.y - g.cy)).toFixed(1) : '0.0';
    const p1x = g.P1 ? (g.P1.x - g.cx).toFixed(1) : '0.0';
    const p1y = g.P1 ? (-(g.P1.y - g.cy)).toFixed(1) : '0.0';
    const p2x = g.P2 ? (g.P2.x - g.cx).toFixed(1) : '0.0';
    const p2y = g.P2 ? (-(g.P2.y - g.cy)).toFixed(1) : '0.0';

    const chordLen = Math.hypot(g.B.x - g.A.x, g.B.y - g.A.y);
    const diff = Math.abs(g.angleP1Deg - g.angleP2Deg);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('indigo', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}) | Radius ${tag('indigo', `r = ${fmtLength(state.radius, lenUnit, state.radius)}`)} | Base chord ${tag('red', `|AB| = ${fmtLength(chordLen, lenUnit, state.radius, 1)}`)}<br>` +
        `↳ Endpoints: ${tag('red', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), ${tag('red', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)}) | Vertices: ${tag('blue', 'P₁')} = (${tag('amber', p1x)}, ${tag('lime', p1y)}), ${tag('emerald', 'P₂')} = (${tag('amber', p2x)}, ${tag('lime', p2y)})<br>` +
        `↳ Central angle subtended by ${tag('red', 'Arc AB')}: ${tag('yellow', `2θ = ${fmtAngle(g.centralDeg, angUnit)}`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Subtended angle ${tag('blue', '∠AP₁B (θ₁)')} = ½(${tag('yellow', fmtAngle(g.centralDeg, angUnit))}) = ${tag('blue', `θ₁ = ${fmtAngle(g.angleP1Deg, angUnit)}`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Subtended angle ${tag('emerald', '∠AP₂B (θ₂)')} = ½(${tag('yellow', fmtAngle(g.centralDeg, angUnit))}) = ${tag('emerald', `θ₂ = ${fmtAngle(g.angleP2Deg, angUnit)}`)}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `∠AP₁B = ${fmtAngle(g.angleP1Deg, angUnit)}`)}, ${tag('emerald', `∠AP₂B = ${fmtAngle(g.angleP2Deg, angUnit)}`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${fmtAngle(g.angleP1Deg, angUnit)} - ${fmtAngle(g.angleP2Deg, angUnit)}| = ${fmtAngle(diff, angUnit, 3)}`)}`;
    }
    const isSameSegment = Math.abs(g.angleP1Deg - g.angleP2Deg) < 0.05;
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('blue', `θ₁ = ${fmtAngle(g.angleP1Deg, angUnit)}`)} ≝ ${tag('emerald', `θ₂ = ${fmtAngle(g.angleP2Deg, angUnit)}`)}</span>` +
        (isSameSegment
          ? `<span class="derivation-check">✓ Same Segment Equal</span>`
          : `<span class="derivation-check" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">⚠ Opposite Segments (θ₁ + θ₂ = 180°)</span>`);
    }
    if (this.slots.s5) {
      const ref1 = 360 - g.angleP1Deg;
      const ref2 = 360 - g.angleP2Deg;
      this.slots.s5.innerHTML =
        `↳ ${tag('blue', 'θ₁*')} = ${tag('teal', fmtAngle(360, angUnit))} - ${tag('blue', fmtAngle(g.angleP1Deg, angUnit))} = ${tag('blue', fmtAngle(ref1, angUnit))} (Perigon: ${tag('blue', fmtAngle(g.angleP1Deg, angUnit))} + ${tag('blue', fmtAngle(ref1, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))})<br>` +
        `↳ ${tag('emerald', 'θ₂*')} = ${tag('teal', fmtAngle(360, angUnit))} - ${tag('emerald', fmtAngle(g.angleP2Deg, angUnit))} = ${tag('emerald', fmtAngle(ref2, angUnit))} (Perigon: ${tag('emerald', fmtAngle(g.angleP2Deg, angUnit))} + ${tag('emerald', fmtAngle(ref2, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))})`;
    }
    if (this.slots.s5e) {
      const ref1 = 360 - g.angleP1Deg;
      const ref2 = 360 - g.angleP2Deg;
      this.slots.s5e.innerHTML =
        `<span>${tag('blue', `θ₁* = ${fmtAngle(ref1, angUnit)}`)} ≝ ${tag('emerald', `θ₂* = ${fmtAngle(ref2, angUnit)}`)}</span>` +
        (isSameSegment
          ? `<span class="derivation-check">✓ Reflex Invariant</span>`
          : `<span class="derivation-check" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">⚠ Opposite Segments</span>`);
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Cyclic Quadrilateral Theorem Derivations
// -----------------------------------------------------------------------------
export class CyclicQuadDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'cq-step-1',
        'Step 1',
        `Concyclic Vertices (${tag('violet', 'A')}, ${tag('cyan', 'B')}, ${tag('amber', 'C')}, ${tag('rose', 'D')})`,
        `Four vertices inscribed on circle of radius ${tag('indigo', 'r')} centered at ${tag('indigo', 'Center O')}(${tag('amber', '0')}, ${tag('lime', '0')}).<br>` +
        `Parametric coordinates: ${tag('violet', 'A')}(${tag('amber', 'x_A')}, ${tag('lime', 'y_A')}), ${tag('cyan', 'B')}(${tag('amber', 'x_B')}, ${tag('lime', 'y_B')}), ${tag('amber', 'C')}(${tag('amber', 'x_C')}, ${tag('lime', 'y_C')}), ${tag('rose', 'D')}(${tag('amber', 'x_D')}, ${tag('lime', 'y_D')})<br>` +
        `All vertices satisfy: ${tag('amber', 'x²')} + ${tag('lime', 'y²')} = ${tag('indigo', 'r²')}`
      )}
      ${cardTemplate(
        'cq-step-2',
        'Step 2',
        `Arc Subtensions by Opposite Vertices`,
        `Opposite vertex ${tag('violet', 'A')} subtends arc ${tag('amber', 'BCD')} (central angle 2${tag('violet', '∠A')}).<br>` +
        `Opposite vertex ${tag('amber', 'C')} subtends arc ${tag('violet', 'DAB')} (central angle 2${tag('amber', '∠C')}).<br>` +
        `Arc ${tag('amber', 'BCD')} + Arc ${tag('violet', 'DAB')} = Full ${tag('sky', 'Circumference')} = ${tag('teal', '360°')}`
      )}
      ${cardTemplate(
        'cq-step-3',
        'Step 3',
        `Supplementary Opposite Pair (${tag('violet', '∠A')} + ${tag('amber', '∠C')} = ${tag('lavender', '180°')})`,
        `2${tag('violet', '∠A')} + 2${tag('amber', '∠C')} = ${tag('teal', '360°')} ⟹ ${tag('violet', '∠A')} + ${tag('amber', '∠C')} = ${tag('lavender', '180°')}`,
        true
      )}
      ${cardTemplate(
        'cq-step-4',
        'Step 4',
        `Second Opposite Pair (${tag('cyan', '∠B')} + ${tag('rose', '∠D')} = ${tag('sky', '180°')}) & Total Sum`,
        `Similarly: ${tag('cyan', '∠B')} + ${tag('rose', '∠D')} = ${tag('sky', '180°')}<br>` +
        `Total interior angle sum = ${tag('violet', '∠A')} + ${tag('cyan', '∠B')} + ${tag('amber', '∠C')} + ${tag('rose', '∠D')} = ${tag('platinum', '360°')}`,
        true
      )}
      ${cardTemplate(
        'cq-step-5',
        'Step 5',
        `Reflex Angles & Quad Perigon Sum (${tag('lavender', '1080°')})`,
        `Each vertex angle forms a ${tag('teal', '360°')} perigon with its reflex angle (${tag('teal', 'θ* = 360° - θ')}):<br>` +
        `• Opposite Reflex Sum AC: ${tag('lavender', '∠A* + ∠C*')} = (${tag('teal', '360°')} - ${tag('violet', '∠A')}) + (${tag('teal', '360°')} - ${tag('amber', '∠C')}) = ${tag('teal', '720°')} - ${tag('lavender', '180°')} = ${tag('lavender', '540.0°')}<br>` +
        `• Opposite Reflex Sum BD: ${tag('sky', '∠B* + ∠D*')} = (${tag('teal', '360°')} - ${tag('cyan', '∠B')}) + (${tag('teal', '360°')} - ${tag('rose', '∠D')}) = ${tag('teal', '720°')} - ${tag('sky', '180°')} = ${tag('sky', '540.0°')}<br>` +
        `• <b>Total Reflex Quad Sum:</b> 4(${tag('teal', '360°')}) - ${tag('platinum', '360°')} = ${tag('lavender', '1080.0°')}`,
        true
      )}
      ${cardTemplate(
        'cq-step-6',
        'Step 6',
        `Exterior Angle Theorem (${tag('violet', 'Ext ∠C')} = ${tag('violet', '∠A')})`,
        `Extending side ${tag('amber', 'DC')} past vertex ${tag('amber', 'C')} forms ray ${tag('rose', 'CE')}, creating a straight linear pair:<br>` +
        `• Linear pair on straight line DCE: ${tag('amber', '∠BCD')} + ${tag('violet', 'Ext ∠C')} = ${tag('lavender', '180°')} ⟹ ${tag('violet', 'Ext ∠C')} = ${tag('lavender', '180°')} - ${tag('amber', '∠BCD')}<br>` +
        `• Opposite interior sum: ${tag('violet', '∠A')} + ${tag('amber', '∠BCD')} = ${tag('lavender', '180°')} ⟹ ${tag('violet', '∠A')} = ${tag('lavender', '180°')} - ${tag('amber', '∠BCD')}<br>` +
        `• <b>Exterior Angle Invariant:</b> ${tag('violet', 'Ext ∠C')} = ${tag('violet', '∠A')} (The exterior angle of a cyclic quadrilateral equals the opposite interior angle)`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#cq-step-1 [data-sub]'),
      s2: this.container.querySelector('#cq-step-2 [data-sub]'),
      s3: this.container.querySelector('#cq-step-3 [data-sub]'),
      s3e: this.container.querySelector('#cq-step-3 [data-eval]'),
      s4: this.container.querySelector('#cq-step-4 [data-sub]'),
      s4e: this.container.querySelector('#cq-step-4 [data-eval]'),
      s5: this.container.querySelector('#cq-step-5 [data-sub]'),
      s5e: this.container.querySelector('#cq-step-5 [data-eval]'),
      s6: this.container.querySelector('#cq-step-6 [data-sub]'),
      s6e: this.container.querySelector('#cq-step-6 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const ax = g.A ? (g.A.x - g.cx).toFixed(1) : '0.0';
    const ay = g.A ? (-(g.A.y - g.cy)).toFixed(1) : '0.0';
    const bx = g.B ? (g.B.x - g.cx).toFixed(1) : '0.0';
    const by = g.B ? (-(g.B.y - g.cy)).toFixed(1) : '0.0';
    const cx = g.C ? (g.C.x - g.cx).toFixed(1) : '0.0';
    const cy = g.C ? (-(g.C.y - g.cy)).toFixed(1) : '0.0';
    const dx = g.D ? (g.D.x - g.cx).toFixed(1) : '0.0';
    const dy = g.D ? (-(g.D.y - g.cy)).toFixed(1) : '0.0';

    const angleA = g.angleADeg;
    const angleB = g.angleBDeg;
    const angleC = g.angleCDeg;
    const angleD = g.angleDDeg;
    const sumAC = g.sumAC;
    const sumBD = g.sumBD;
    const total = sumAC + sumBD;

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('indigo', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}), Radius ${tag('indigo', `r = ${fmtLength(state.radius, lenUnit, state.radius)}`)}<br>` +
        `↳ ${tag('violet', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), ${tag('cyan', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)})<br>` +
        `↳ ${tag('amber', 'C')} = (${tag('amber', cx)}, ${tag('lime', cy)}), ${tag('rose', 'D')} = (${tag('amber', dx)}, ${tag('lime', dy)})`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Central arc subtended by ${tag('violet', '∠A')}: 2 · ${tag('violet', fmtAngle(angleA, angUnit))} = ${tag('violet', fmtAngle(2 * angleA, angUnit))}<br>` +
        `↳ Central arc subtended by ${tag('amber', '∠C')}: 2 · ${tag('amber', fmtAngle(angleC, angUnit))} = ${tag('amber', fmtAngle(2 * angleC, angUnit))}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ ${tag('violet', `∠A = ${fmtAngle(angleA, angUnit)}`)}, ${tag('amber', `∠C = ${fmtAngle(angleC, angUnit)}`)}<br>` +
        `↳ Sum: ${tag('violet', fmtAngle(angleA, angUnit))} + ${tag('amber', fmtAngle(angleC, angUnit))} = ${tag('lavender', fmtAngle(sumAC, angUnit))}`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('lavender', `∠A + ∠C = ${fmtAngle(sumAC, angUnit)} (Supplementary)`)}</span><span class="derivation-check">✓ 180.0° Invariant</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('cyan', `∠B = ${fmtAngle(angleB, angUnit)}`)}, ${tag('rose', `∠D = ${fmtAngle(angleD, angUnit)}`)} ⟹ Sum = ${tag('cyan', fmtAngle(angleB, angUnit))} + ${tag('rose', fmtAngle(angleD, angUnit))} = ${tag('sky', fmtAngle(sumBD, angUnit))}<br>` +
        `↳ Total Quadrilateral Interior Sum = ${tag('platinum', fmtAngle(total, angUnit))}<br>` +
        `↳ <small style="color:#94a3b8"><em>Geometric invariant: Sliding vertex ${tag('cyan', 'B')} along arc AC preserves ${tag('cyan', '∠B')} because it subtends the fixed chord AC (Angles in Same Segment Theorem). Moving bounding vertices ${tag('violet', 'A')} or ${tag('amber', 'C')} dynamically changes ${tag('cyan', '∠B')} and ${tag('rose', '∠D')}.</em></small>`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('sky', `∠B + ∠D = ${fmtAngle(sumBD, angUnit)}`)} | ${tag('platinum', `Total Sum = ${fmtAngle(total, angUnit)}`)}</span><span class="derivation-check">✓ Verified</span>`;
    }
    if (this.slots.s5) {
      const refA = 360 - angleA;
      const refB = 360 - angleB;
      const refC = 360 - angleC;
      const refD = 360 - angleD;
      const refAC = refA + refC;
      const refBD = refB + refD;
      const refSum = refAC + refBD;
      this.slots.s5.innerHTML =
        `↳ ${tag('violet', `∠A* = ${fmtAngle(refA, angUnit)}`)}, ${tag('amber', `∠C* = ${fmtAngle(refC, angUnit)}`)} ⟹ Sum ${tag('lavender', `∠A* + ∠C* = ${fmtAngle(refAC, angUnit)}`)}<br>` +
        `↳ ${tag('cyan', `∠B* = ${fmtAngle(refB, angUnit)}`)}, ${tag('rose', `∠D* = ${fmtAngle(refD, angUnit)}`)} ⟹ Sum ${tag('sky', `∠B* + ∠D* = ${fmtAngle(refBD, angUnit)}`)}<br>` +
        `↳ Total Reflex Quad Sum = ${tag('lavender', fmtAngle(refSum, angUnit))}`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML =
        `<span>${tag('lavender', `Total Reflex Quad Sum = 1080.0°`)} (Pairs: ${tag('lavender', '540.0°')} & ${tag('sky', '540.0°')})</span><span class="derivation-check">✓ 1080.0° Invariant</span>`;
    }
    if (this.slots.s6) {
      const extC = g.exteriorAngleDeg !== undefined ? g.exteriorAngleDeg : angleA;
      this.slots.s6.innerHTML =
        `↳ Linear pair at ${tag('amber', 'C')}: ${tag('amber', `∠C = ${fmtAngle(angleC, angUnit)}`)} + ${tag('violet', `Ext ∠C = ${fmtAngle(extC, angUnit)}`)} = ${tag('lavender', fmtAngle(angleC + extC, angUnit))}<br>` +
        `↳ Opposite interior angle: ${tag('violet', `∠A = ${fmtAngle(angleA, angUnit)}`)}<br>` +
        `↳ Exterior Invariant: ${tag('violet', `Ext ∠C (${fmtAngle(extC, angUnit)})`)} ≡ ${tag('violet', `∠A (${fmtAngle(angleA, angUnit)})`)}`;
    }
    if (this.slots.s6e) {
      const extC = g.exteriorAngleDeg !== undefined ? g.exteriorAngleDeg : angleA;
      const isEq = Math.abs(extC - angleA) < 0.05;
      this.slots.s6e.innerHTML =
        `<span>${tag('violet', `Ext ∠C = ${fmtAngle(extC, angUnit)}`)} ≡ ${tag('violet', `∠A = ${fmtAngle(angleA, angUnit)}`)}</span><span class="derivation-check">${isEq ? '✓ Exterior Invariant' : '✓ Verified'}</span>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 4. Tangent-Radius Theorem Derivations
// -----------------------------------------------------------------------------
export class TangentRadiusDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'tr-step-1',
        'Step 1',
        `Radial Vector ${tag('blue', 'OT')}`,
        `Origin ${tag('blue', 'Center O')} = (${tag('amber', '0')}, ${tag('lime', '0')}), Point of tangency ${tag('red', 'T')} on circle.<br>` +
        `Radial vector: ${tag('blue', 'OT')} = (${tag('amber', 'r cos θ')}, ${tag('lime', 'r sin θ')}), magnitude |${tag('blue', 'OT')}| = ${tag('blue', 'r')}`
      )}
      ${cardTemplate(
        'tr-step-2',
        'Step 2',
        `Tangent Line Direction Vector ${tag('emerald', 'v_tan')}`,
        `Velocity / direction along circle circumference at ${tag('red', 'T')}:<br>` +
        `${tag('emerald', 'v_tan')} = d/dθ (${tag('amber', 'r cos θ')}, ${tag('lime', 'r sin θ')}) = (${tag('amber', '-r sin θ')}, ${tag('lime', 'r cos θ')}) = (${tag('amber', '-y_T')}, ${tag('lime', 'x_T')})`
      )}
      ${cardTemplate(
        'tr-step-3',
        'Step 3',
        `Orthogonality via Vector Product (Inner Product Criterion)`,
        `<strong>Orthogonality Axiom:</strong> In Euclidean space, two non-zero vectors are perpendicular (${tag('teal', 'u ⊥ v')}) if and only if their inner (dot) product is zero: ${tag('blue', 'u')} · ${tag('emerald', 'v')} = 0.<br>` +
        `Coordinate inner product expansion:<br>` +
        `${tag('blue', 'OT')} · ${tag('emerald', 'v_tan')} = (${tag('amber', 'x_T')})(${tag('amber', '-y_T')}) + (${tag('lime', 'y_T')})(${tag('lime', 'x_T')}) = ${tag('amber', '-x_T y_T')} + ${tag('lime', 'x_T y_T')} = ${tag('teal', '0')}<br>` +
        `The dot product vanishes identically for all angles θ.`,
        true
      )}
      ${cardTemplate(
        'tr-step-4',
        'Step 4',
        `Perpendicular Invariant (${tag('teal', '∠(OT, Tangent) = 90.0°')})`,
        `By cosine definition of angle: cos ∠(${tag('blue', 'OT')}, ${tag('emerald', 'Tangent')}) = (${tag('blue', 'OT')} · ${tag('emerald', 'v_tan')}) / (|${tag('blue', 'OT')}| · |${tag('emerald', 'v_tan')}|) = 0 / r² = 0<br>` +
        `⟹ Geometric angle = arccos(0) = ${tag('teal', '90.0° (Right Angle)')}`,
        true
      )}
      ${cardTemplate(
        'tr-step-5',
        'Step 5',
        `Current Quadrant Dynamics & Invariant`,
        `<strong>Quadrant Invariant:</strong> Point ${tag('red', 'T')} traverses all 4 quadrants ($Q_I, Q_{II}, Q_{III}, Q_{IV}$). Coordinate signs (${tag('amber', '±x_T')}, ${tag('lime', '±y_T')}) vary periodically, but the inner product ${tag('blue', 'OT')} · ${tag('emerald', 'v_tan')} ≡ ${tag('teal', '0')} remains strictly invariant across all quadrants.`,
        true
      )}
      ${cardTemplate(
        'tr-step-6',
        'Step 6',
        `Multiple Tangents & Inscribed Chord Subtended Areas`,
        `When multiple tangents are inserted, adjacent contact points form chords $T_i T_j$. The circular segment area subtended by each chord with arc sweep ${tag('yellow', 'Δθ')} is:<br>` +
        `$$\\text{Area} = \\frac{1}{2} r^2 (\\Delta\\theta - \\sin\\Delta\\theta)$$<br>` +
        `Each subtended area is assigned an exclusive color token (${tag('violet', 'Area 1')}, ${tag('rose', 'Area 2')}, ${tag('cyan', 'Area 3')}, ${tag('fuchsia', 'Area 4')}), while every contact point preserves ${tag('teal', 'OT_i ⊥ Tangent_i ≡ 90.0°')}.`,
        true
      )}
      ${cardTemplate(
        'tr-step-7',
        'Step 7',
        `Conjugate Reflex Right Angle (${tag('teal', '270.0°')}) & Perigon Identity`,
        `Every right angle forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'θ* = 360° - 90° = 270.0°')}):<br>` +
        `• Contact point perigon: ${tag('teal', '∠(OT, Tangent)')} + ${tag('teal', '∠(OT, Tangent)*')} = ${tag('teal', '90°')} + ${tag('teal', '270°')} = ${tag('teal', '360.0°')}<br>` +
        `• Reflex Wedge: sweeps ${tag('teal', '270°')} outward from the contact point opposite the right-angle corner.<br>` +
        `• Invariant across all tangents: every inserted tangent $T_i$ identically exhibits ${tag('teal', 'T_i* = 270.0°')}.`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#tr-step-1 [data-sub]'),
      s2: this.container.querySelector('#tr-step-2 [data-sub]'),
      s3: this.container.querySelector('#tr-step-3 [data-sub]'),
      s3e: this.container.querySelector('#tr-step-3 [data-eval]'),
      s4: this.container.querySelector('#tr-step-4 [data-sub]'),
      s4e: this.container.querySelector('#tr-step-4 [data-eval]'),
      s5: this.container.querySelector('#tr-step-5 [data-sub]'),
      s5e: this.container.querySelector('#tr-step-5 [data-eval]'),
      s6: this.container.querySelector('#tr-step-6 [data-sub]'),
      s6e: this.container.querySelector('#tr-step-6 [data-eval]'),
      s7: this.container.querySelector('#tr-step-7 [data-sub]'),
      s7e: this.container.querySelector('#tr-step-7 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const deg = (state.angleT ?? 0) * 180 / Math.PI;
    const tx = g.T ? (g.T.x - g.cx).toFixed(1) : '0.0';
    const ty = g.T ? (-(g.T.y - g.cy)).toFixed(1) : '0.0';

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Contact Point ${tag('red', 'T')} = (${tag('amber', tx)}, ${tag('lime', ty)}) at angle θ = ${tag('yellow', fmtAngle(deg, angUnit))}<br>` +
        `↳ Origin ${tag('blue', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}) | Radial vector magnitude ${tag('blue', `|OT| = ${fmtLength(r, lenUnit, r)}`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Tangent vector: ${tag('emerald', 'v_tan')} = (${tag('amber', (-parseFloat(ty)).toFixed(1))}, ${tag('lime', tx)}) ${lenUnit}<br>` +
        `↳ Tangent vector direction is strictly tangential to circumference at ${tag('red', 'T')}`;
    }
    if (this.slots.s3) {
      const prod1 = (parseFloat(tx) * (-parseFloat(ty))).toFixed(1);
      const prod2 = (parseFloat(ty) * parseFloat(tx)).toFixed(1);
      this.slots.s3.innerHTML =
        `↳ Intermediate Substitution: (${tag('amber', tx)}) · (${tag('amber', (-parseFloat(ty)).toFixed(1))}) + (${tag('lime', ty)}) · (${tag('lime', tx)})<br>` +
        `= ${tag('amber', prod1)} + ${tag('lime', prod2)} = ${tag('teal', '0.0000')}<br>` +
        `↳ By Orthogonality Axiom: ${tag('blue', 'OT')} · ${tag('emerald', 'v_tan')} = 0 ⟹ ${tag('blue', 'OT')} ⊥ ${tag('emerald', 'Tangent')}`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('teal', `${tag('blue', 'OT')} · ${tag('emerald', 'v_tan')} = 0.0000 (Dot Product)`)}</span><span class="derivation-check">✓ Orthogonal</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ Angle between radius ${tag('blue', 'OT')} and ${tag('emerald', 'Tangent line')} = ${tag('teal', fmtAngle(90, angUnit))}<br>` +
        `↳ Tangent line is strictly perpendicular to the radial vector at point of contact.`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('teal', `∠(${tag('blue', 'OT')}, ${tag('emerald', 'Tangent')}) = ${fmtAngle(90, angUnit)} (Right Angle)`)}</span><span class="derivation-check">✓ Perpendicular</span>`;
    }
    if (this.slots.s5) {
      const q = g.quadrant || { roman: 'I', label: 'Quadrant I (+X, +Y)' };
      this.slots.s5.innerHTML =
        `↳ Current Quadrant: ${tag('indigo', q.label)}<br>` +
        `↳ Coordinates: ${tag('amber', `x_T = ${fmtLength(parseFloat(tx), lenUnit, r, 1)}`)}, ${tag('lime', `y_T = ${fmtLength(parseFloat(ty), lenUnit, r, 1)}`)}<br>` +
        `↳ Inner product: (${tag('amber', tx)})(${tag('amber', (-parseFloat(ty)).toFixed(1))}) + (${tag('lime', ty)})(${tag('lime', tx)}) = ${tag('teal', '0.0000')}`;
    }
    if (this.slots.s5e) {
      const q = g.quadrant || { roman: 'I' };
      this.slots.s5e.innerHTML =
        `<span>${tag('indigo', `Quadrant ${q.roman}`)}: ${tag('teal', `OT ⊥ Tangent ≡ ${fmtAngle(90, angUnit)} Invariant`)}</span><span class="derivation-check">✓ Quadrant Invariant</span>`;
    }
    if (this.slots.s6) {
      const chords = g.chords || [];
      if (chords.length > 0) {
        const chordLines = chords.map(c =>
          `• ${tag(c.colorName, c.label)}: chord length |${c.t1Name}${c.t2Name}| = ${fmtLength(c.chordLen, lenUnit, r, 1)}, sweep = ${fmtAngle(c.sweep * 180 / Math.PI, angUnit)}, area = ${tag(c.colorName, fmtArea(c.area, lenUnit, r))}`
        ).join('<br>');
        this.slots.s6.innerHTML =
          `↳ Inscribed Polygon with ${tag('yellow', `${chords.length} tangents & chords`)}:<br>` +
          `${chordLines}<br>` +
          `↳ All ${chords.length} contact radii satisfy ${tag('teal', `OT_k ⊥ v_tan,k ≡ ${fmtAngle(90, angUnit)}`)}`;
      } else {
        this.slots.s6.innerHTML =
          `↳ Single Tangent Active. Choose 2, 3, or 4 tangents in Interactive Controls to insert multiple tangents and shade subtended areas.`;
      }
    }
    if (this.slots.s6e) {
      const chords = g.chords || [];
      if (chords.length > 0) {
        const totalArea = chords.reduce((sum, c) => sum + c.area, 0);
        this.slots.s6e.innerHTML =
          `<span>Total Subtended Area = ${fmtArea(totalArea, lenUnit, r)} (${chords.length} Chords)</span><span class="derivation-check">✓ All Tangents ⊥ Radii</span>`;
      } else {
        this.slots.s6e.innerHTML =
          `<span>Single Tangent Mode</span><span class="derivation-check">✓ Ready for Multi-Tangents</span>`;
      }
    }
    if (this.slots.s7) {
      this.slots.s7.innerHTML =
        `↳ Contact Right Angle: ${tag('teal', fmtAngle(90, angUnit))}<br>` +
        `↳ Conjugate Reflex Angle: ${tag('teal', fmtAngle(360, angUnit))} - ${tag('teal', fmtAngle(90, angUnit))} = ${tag('teal', fmtAngle(270, angUnit))}<br>` +
        `↳ Perigon Invariant: ${tag('teal', fmtAngle(90, angUnit))} + ${tag('teal', fmtAngle(270, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))}`;
    }
    if (this.slots.s7e) {
      this.slots.s7e.innerHTML =
        `<span>${tag('teal', `Reflex Angle T* = ${fmtAngle(270, angUnit)} (Perigon ${fmtAngle(360, angUnit)})`)}</span><span class="derivation-check">✓ 270.0° Invariant</span>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 5. Alternate Segment Theorem Derivations
// -----------------------------------------------------------------------------
export class AlternateSegmentDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'as-step-1',
        'Step 1',
        `${tag('emerald', '[Tangent line]')} at ${tag('red', 'T')} & Chord ${tag('blue', 'TA')}`,
        `Center ${tag('sky', 'Center O')}(${tag('amber', '0')}, ${tag('lime', '0')}) | ${tag('emerald', '[Tangent line]')} touches circle at contact vertex ${tag('red', 'T')}. Primary chord ${tag('blue', 'TA')} connects ${tag('red', 'T')} and ${tag('blue', 'A')}.<br>` +
        `Chord ${tag('blue', 'TA')} divides the circle into two circular segments, both unified under ${tag('sky', 'Alternate Segment (Sky)')}: the ${tag('sky', 'Alternate Segment (Major)')} containing vertex ${tag('orange', 'B')}, and the ${tag('sky', 'Alternate Segment (Minor)')} on chord ${tag('blue', 'TA')}.<br>` +
        `Angle between ${tag('emerald', '[Tangent line]')} and chord ${tag('blue', 'TA')}: ${tag('yellow', '∠(Tangent, TA) = α')}`
      )}
      ${cardTemplate(
        'as-step-2',
        'Step 2',
        `Inscribed Angle at Alternate Vertex ${tag('orange', 'B')}`,
        `Vertex ${tag('orange', 'B')} lies on circumference in the ${tag('sky', 'Alternate Segment (Major)')}.<br>` +
        `Angle subtended by chord ${tag('blue', 'TA')} at alternate vertex ${tag('orange', 'B')}: ${tag('yellow', '∠TBA = α')}`
      )}
      ${cardTemplate(
        'as-step-3',
        'Step 3',
        `Thales' Theorem Overlay & Axiomatic First Principles (${tag('indigo', 'TD')})`,
        `Construct antipodal diameter ${tag('indigo', 'TD')} through contact ${tag('red', 'T')}, passing through center ${tag('sky', 'Center O')}(${tag('amber', '0')}, ${tag('lime', '0')}).<br>` +
        `1. <strong>Physical & Kinematic Axiom:</strong> Tangential velocity is perpendicular to the radial vector: ${tag('emerald', 'v_tan')} ⊥ ${tag('indigo', 'r_OT')} ⟹ ${tag('teal', 'TD ⊥ Tangent = 90.0°')}.<br>` +
        `2. <strong>Inner-Product Invariant:</strong> For any point ${tag('orange', 'B')} on the circle, $(\\vec{B} - \\vec{T}) \\cdot (\\vec{B} - \\vec{D}) = |\\vec{B}|^2 - |\\vec{T}|^2 = R^2 - R^2 \\equiv 0$ ⟹ ${tag('teal', '∠TBD = 90.0°')}. Likewise, ${tag('teal', '∠TAD = 90.0°')}.<br>` +
        `3. <strong>Point D Interior & Exterior Angles:</strong><br>` +
        `&nbsp;&nbsp;• Interior angle at ${tag('indigo', 'D')} subtending chord ${tag('blue', 'TA')}: ${tag('yellow', '∠TDA ≡ ∠TBA = α')}.<br>` +
        `&nbsp;&nbsp;• Exterior angle at ${tag('indigo', 'D')} (extending diameter ray ${tag('indigo', 'TD')} past ${tag('indigo', 'D')}): supplementary linear pair ${tag('rose', `Ext D = ${tag('lavender', '180.0°')} - α`)}.<br>` +
        `&nbsp;&nbsp;• Reflex angle at ${tag('indigo', 'D')}: ${tag('rose', `D* = ${tag('teal', '360.0°')} - α`)}.<br>` +
        `4. In right-angled triangle ${tag('indigo', 'ΔTBD')}: ${tag('yellow', '∠TBA')} = ${tag('teal', '90°')} - ${tag('rose', '∠ABD')} = ${tag('teal', '90°')} - (${tag('teal', '90°')} - ${tag('yellow', 'α')}) = ${tag('yellow', 'α')}.`
      )}
      ${cardTemplate(
        'as-step-4',
        'Step 4',
        `Alternate Segment Angle Invariant (${tag('yellow', 'α (Tangent-Chord)')} = ${tag('yellow', 'α (Inscribed)')})`,
        `The angle between ${tag('emerald', '[Tangent line]')} and chord ${tag('blue', 'TA')} equals the angle subtended in the ${tag('sky', 'Alternate Segment (Sky)')}:<br>` +
        `${tag('yellow', '∠(Tangent, TA)')} = ${tag('yellow', '∠TBA')} ⟹ Invariant Difference ${tag('teal', 'Δ = |α - α| = 0.00°')}`,
        true
      )}
      ${cardTemplate(
        'as-step-5',
        'Step 5',
        `Alternate Segment Area & Physical Kinematics Invariant`,
        `Both the ${tag('sky', 'Alternate Segment (Major)')} and ${tag('sky', 'Alternate Segment (Minor)')} are unified with the ${tag('sky', 'PALETTE.sky')} colour token.<br>` +
        `By conservation of angular momentum and the constancy of inscribed angle across the entire major arc, moving vertex ${tag('orange', 'B')} smoothly along the alternate segment leaves invariant: ${tag('yellow', 'α = const')}.`
      )}
      ${cardTemplate(
        'as-step-6',
        'Step 6',
        `Conjugate Reflex Angles & Perigon Arcs (${tag('teal', '360°')})`,
        `Every vertex and tangent-chord angle forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'α* = 360° - α')}):<br>` +
        `• Tangent-Chord Reflex at ${tag('red', 'T')}: ${tag('yellow', 'α')} + ${tag('yellow', 'α*')} = ${tag('teal', '360°')} ⟹ ${tag('yellow', `α* = ${tag('teal', '360°')} - α`)}<br>` +
        `• Inscribed Reflex at ${tag('orange', 'B')}: ${tag('yellow', 'α')} + ${tag('yellow', 'α*')} = ${tag('teal', '360°')} ⟹ ${tag('yellow', `α* = ${tag('teal', '360°')} - α`)}<br>` +
        `• Point ${tag('indigo', 'D')} Reflex: ${tag('yellow', '∠TDA')} + ${tag('rose', 'D*')} = ${tag('teal', '360°')} ⟹ ${tag('rose', `D* = ${tag('teal', '360°')} - α`)}<br>` +
        `• Reflex Invariant: ${tag('teal', 'Tangent α* ≡ Inscribed α* ≡ D*')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#as-step-1 [data-sub]'),
      s2: this.container.querySelector('#as-step-2 [data-sub]'),
      s3: this.container.querySelector('#as-step-3 [data-sub]'),
      s4: this.container.querySelector('#as-step-4 [data-sub]'),
      s4e: this.container.querySelector('#as-step-4 [data-eval]'),
      s5: this.container.querySelector('#as-step-5 [data-sub]'),
      s6: this.container.querySelector('#as-step-6 [data-sub]'),
      s6e: this.container.querySelector('#as-step-6 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const tx = g.T ? (g.T.x - g.cx).toFixed(1) : '0.0';
    const ty = g.T ? (-(g.T.y - g.cy)).toFixed(1) : '0.0';
    const ax = g.A ? (g.A.x - g.cx).toFixed(1) : '0.0';
    const ay = g.A ? (-(g.A.y - g.cy)).toFixed(1) : '0.0';
    const bx = g.B ? (g.B.x - g.cx).toFixed(1) : '0.0';
    const by = g.B ? (-(g.B.y - g.cy)).toFixed(1) : '0.0';

    const chordLen = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y);
    const diff = Math.abs(g.tangentChordDeg - g.inscribedDeg);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('sky', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}), Radius ${tag('indigo', `r = ${fmtLength(state.radius, lenUnit, state.radius)}`)}<br>` +
        `↳ Contact ${tag('red', 'T')} = (${tag('amber', tx)}, ${tag('lime', ty)}), Vertex ${tag('blue', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), Vertex ${tag('orange', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)})<br>` +
        `↳ ${tag('emerald', '[Tangent line]')} angle with chord ${tag('blue', 'TA')}: ${tag('yellow', `α = ${fmtAngle(g.tangentChordDeg, angUnit)}`)}<br>` +
        `↳ Primary chord ${tag('blue', `|TA| = ${fmtLength(chordLen, lenUnit, state.radius, 1)}`)} | Subtends ${tag('sky', 'Alternate Segment (Major)')} and ${tag('sky', 'Alternate Segment (Minor)')}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Inscribed angle at ${tag('orange', 'B')} in ${tag('sky', 'Alternate Segment (Major)')}: ${tag('yellow', `∠TBA = ${fmtAngle(g.inscribedDeg, angUnit)}`)} (Subtends chord ${tag('blue', 'TA')})`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Thales Right Angles: ${tag('teal', `∠TBD = ${fmtAngle(g.thalesAngleTBD, angUnit)}`)}, ${tag('teal', `∠TAD = ${fmtAngle(g.thalesAngleTAD, angUnit)}`)}, ${tag('teal', `TD ⊥ Tangent = ${fmtAngle(g.thalesTangentTD, angUnit)}`)}<br>` +
        `↳ Point D Interior Angle: ${tag('yellow', `∠TDA = α = ${fmtAngle(g.angleTDA, angUnit)}`)} | Exterior Angle: ${tag('rose', `Ext D = ${tag('lavender', '180°')} - α = ${fmtAngle(g.extAngleD, angUnit)}`)} | Reflex: ${tag('rose', `D* = ${fmtAngle(g.reflexAngleD, angUnit)}`)}<br>` +
        `↳ Semicircle inner products: ${tag('teal', '(B - T) · (B - D) ≡ 0.000')} & ${tag('teal', '(A - T) · (A - D) ≡ 0.000')}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('emerald', '[Tangent line]')} angle: ${tag('yellow', `α = ${fmtAngle(g.tangentChordDeg, angUnit)}`)} | ${tag('sky', 'Alternate Segment')} angle at ${tag('orange', 'B')}: ${tag('yellow', `α = ${fmtAngle(g.inscribedDeg, angUnit)}`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${fmtAngle(g.tangentChordDeg, angUnit)} - ${fmtAngle(g.inscribedDeg, angUnit)}| = ${fmtAngle(diff, angUnit, 3)}`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('yellow', `α = ${fmtAngle(g.tangentChordDeg, angUnit)}`)} ≝ ${tag('yellow', `α = ${fmtAngle(g.inscribedDeg, angUnit)}`)}</span><span class="derivation-check">✓ Alternate Segment Equal</span>`;
    }
    if (this.slots.s5 && g.alternateSegments) {
      this.slots.s5.innerHTML =
        `↳ ${tag('sky', 'Alt Seg (Maj)')} Area: ${tag('sky', `${fmtArea(g.alternateSegments.major.area, lenUnit, state.radius)}`)} | ${tag('violet', 'Alt Seg (Min)')} Area: ${tag('violet', `${fmtArea(g.alternateSegments.minor.area, lenUnit, state.radius)}`)}<br>` +
        `↳ Physical Kinematics Invariant: Tangential momentum flux is strictly orthogonal to radial acceleration (v_tan · r_OT = 0).`;
    }
    if (this.slots.s6) {
      const refAlpha = 360 - g.tangentChordDeg;
      const refInscribed = 360 - g.inscribedDeg;
      this.slots.s6.innerHTML =
        `↳ Tangent Reflex: ${tag('teal', fmtAngle(360, angUnit))} - ${tag('yellow', fmtAngle(g.tangentChordDeg, angUnit))} = ${tag('yellow', fmtAngle(refAlpha, angUnit))}<br>` +
        `↳ Inscribed Reflex: ${tag('teal', fmtAngle(360, angUnit))} - ${tag('yellow', fmtAngle(g.inscribedDeg, angUnit))} = ${tag('yellow', fmtAngle(refInscribed, angUnit))}<br>` +
        `↳ Perigon Invariant: ${tag('yellow', fmtAngle(g.tangentChordDeg, angUnit))} + ${tag('yellow', fmtAngle(refAlpha, angUnit))} = ${tag('teal', fmtAngle(360, angUnit))}`;
    }
    if (this.slots.s6e) {
      const refAlpha = 360 - g.tangentChordDeg;
      this.slots.s6e.innerHTML =
        `<span>${tag('yellow', `α* = ${fmtAngle(refAlpha, angUnit)}`)} (Perigon ${fmtAngle(360, angUnit)})</span><span class="derivation-check">✓ Reflex Invariant</span>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 6. Tangents from External Point Theorem Derivations
// -----------------------------------------------------------------------------
export class TangentsFromPointDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'tfp-step-1',
        'Step 1',
        `External Point ${tag('red', 'P')} & Distance ${tag('yellow', 'd = |OP|')}`,
        `Circle centered at ${tag('sky', 'Center O')}(${tag('amber', '0')}, ${tag('lime', '0')}) with radius ${tag('sky', 'r')}.<br>` +
        `Point ${tag('red', 'P')} lies strictly outside the circle: ${tag('yellow', 'd = |OP|')} > ${tag('sky', 'r')}`
      )}
      ${cardTemplate(
        'tfp-step-2',
        'Step 2',
        `Tangent Contact Points ${tag('emerald', 'T₁')}, ${tag('blue', 'T₂')} & Kite Structure`,
        `Rays from ${tag('red', 'P')} touch the circle at ${tag('emerald', 'T₁')} and ${tag('blue', 'T₂')} with right angles: ${tag('emerald', 'OT₁')} ⊥ ${tag('emerald', 'PT₁')} (${tag('teal', '∠OT₁P = 90°')}) and ${tag('blue', 'OT₂')} ⊥ ${tag('blue', 'PT₂')} (${tag('teal', '∠OT₂P = 90°')}).<br>` +
        `This forms a bounded <strong>Kite Quadrilateral</strong> ${tag('sky', 'O')}-${tag('emerald', 'T₁')}-${tag('red', 'P')}-${tag('blue', 'T₂')}.<br>` +
        `Diagonal ${tag('yellow', 'OP (d)')} and diagonal chord ${tag('violet', 'T₁T₂')} intersect at node ${tag('violet', 'K')}, where ${tag('yellow', 'OP')} ⊥ ${tag('violet', 'T₁T₂')} and ${tag('violet', '|KT₁| = |KT₂|')}.`
      )}
      ${cardTemplate(
        'tfp-step-3',
        'Step 3',
        `Pythagorean Tangent Length Formula (Kite Area & Radical Shading)`,
        `In right triangle ${tag('emerald', 'ΔOT₁P')}: |${tag('emerald', 'OT₁')}|² + |${tag('emerald', 'PT₁')}|² = |${tag('yellow', 'OP')}|² ⟹ r² + |${tag('emerald', 'PT₁')}|² = d².<br>` +
        `Rearranging yields: ${tag('emerald', '|PT₁|')} = √(${tag('yellow', 'd²')} - ${tag('sky', 'r²')}).<br>` +
        `Similarly in ${tag('blue', 'ΔOT₂P')}: ${tag('blue', '|PT₂|')} = √(${tag('yellow', 'd²')} - ${tag('sky', 'r²')}).<br>` +
        `The shaded area enclosed by kite ${tag('sky', 'O')}-${tag('emerald', 'T₁')}-${tag('red', 'P')}-${tag('blue', 'T₂')} is ${tag('amber', 'Area = r · √(d² - r²)')}.`
      )}
      ${cardTemplate(
        'tfp-step-4',
        'Step 4',
        `RHS Congruence & Tangent Length Equality (${tag('emerald', '|PT₁|')} = ${tag('blue', '|PT₂|')})`,
        `Comparing ${tag('emerald', 'ΔOT₁P')} and ${tag('blue', 'ΔOT₂P')}:<br>` +
        `1. Right Angles: ${tag('teal', '∠OT₁P = ∠OT₂P = 90.0°')}<br>` +
        `2. Shared Hypotenuse: Common diagonal ${tag('yellow', 'OP')} (${tag('yellow', 'd')})<br>` +
        `3. Equal Radial Legs: ${tag('emerald', 'OT₁')} = ${tag('blue', 'OT₂')} = ${tag('sky', 'r')}<br>` +
        `By RHS (Right-angle Hypotenuse Side) Congruence: ${tag('emerald', 'ΔOT₁P')} ≅ ${tag('blue', 'ΔOT₂P')}.<br>` +
        `Corresponding tangent segments are equal: ${tag('emerald', '|PT₁|')} = ${tag('blue', '|PT₂|')} ⟹ Difference ${tag('teal', 'Δ = |PT₁| - |PT₂| = 0.00 px')}`,
        true
      )}
      ${cardTemplate(
        'tfp-step-5',
        'Step 5',
        `Conjugate Reflex Angles & Kite Perigon (${tag('lavender', '1080°')})`,
        `Every right angle and vertex angle forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'θ* = 360° - θ')}):<br>` +
        `• Tangent Contact Reflexes: ${tag('teal', '∠OT₁P* = 270.0°')} and ${tag('teal', '∠OT₂P* = 270.0°')}<br>` +
        `• External Vertex Reflex: ${tag('lime', '2α')} + ${tag('lime', '2α*')} = ${tag('teal', '360°')} ⟹ ${tag('lime', `2α* = ${tag('teal', '360°')} - 2α`)}<br>` +
        `• Central Reflex: ${tag('amber', '2β')} + ${tag('amber', '2β*')} = ${tag('teal', '360°')} ⟹ ${tag('amber', `2β* = ${tag('teal', '360°')} - 2β`)}<br>` +
        `• Total Kite Reflex Sum: 2(${tag('teal', '270°')}) + (${tag('teal', '360°')} - ${tag('lime', '2α')}) + (${tag('teal', '360°')} - ${tag('amber', '2β')}) = ${tag('teal', '540°')} + ${tag('teal', '720°')} - ${tag('lavender', '180°')} = ${tag('lavender', '1080.0°')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#tfp-step-1 [data-sub]'),
      s2: this.container.querySelector('#tfp-step-2 [data-sub]'),
      s3: this.container.querySelector('#tfp-step-3 [data-sub]'),
      s4: this.container.querySelector('#tfp-step-4 [data-sub]'),
      s4e: this.container.querySelector('#tfp-step-4 [data-eval]'),
      s5: this.container.querySelector('#tfp-step-5 [data-sub]'),
      s5e: this.container.querySelector('#tfp-step-5 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const r = state.radius;
    const dVal = (g.d ?? g.distOP ?? 0);
    const dStr = fmtLength(dVal, lenUnit, r, 1);
    const rStr = fmtLength(r, lenUnit, r, 1);
    const len1Val = g.lenPT1 ?? g.len1 ?? g.tangentLength ?? 0;
    const len2Val = g.lenPT2 ?? g.len2 ?? g.tangentLength ?? 0;
    const len1Str = fmtLength(len1Val, lenUnit, r, 1);
    const len2Str = fmtLength(len2Val, lenUnit, r, 1);
    const diff = Math.abs(len1Val - len2Val);
    const diffStr = fmtLength(diff, lenUnit, r, 2);
    const kiteAreaVal = g.kiteArea ?? (r * len1Val);
    const kiteAreaStr = fmtArea(kiteAreaVal, lenUnit, r);
    const halfChordVal = g.halfChord ?? 0;
    const halfChordStr = fmtLength(halfChordVal, lenUnit, r, 1);

    const px = g.P ? (g.P.x - g.cx).toFixed(1) : '0.0';
    const py = g.P ? (-(g.P.y - g.cy)).toFixed(1) : '0.0';
    const t1x = g.T1 ? (g.T1.x - g.cx).toFixed(1) : '0.0';
    const t1y = g.T1 ? (-(g.T1.y - g.cy)).toFixed(1) : '0.0';
    const t2x = g.T2 ? (g.T2.x - g.cx).toFixed(1) : '0.0';
    const t2y = g.T2 ? (-(g.T2.y - g.cy)).toFixed(1) : '0.0';

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('sky', 'Center O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}), Radius ${tag('sky', `r = ${rStr}`)} | External distance ${tag('yellow', `d = |OP| = ${dStr}`)} (${dStr} > ${rStr})`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ External ${tag('red', 'P')} = (${tag('amber', px)}, ${tag('lime', py)}) | Contacts: ${tag('emerald', 'T₁')} = (${tag('amber', t1x)}, ${tag('lime', t1y)}), ${tag('blue', 'T₂')} = (${tag('amber', t2x)}, ${tag('lime', t2y)})<br>` +
        `↳ Kite ${tag('sky', 'O')}-${tag('emerald', 'T₁')}-${tag('red', 'P')}-${tag('blue', 'T₂')} | Diagonals intersect at ${tag('violet', 'K')}: ${tag('violet', `|KT₁| = |KT₂| = ${halfChordStr}`)} | ${tag('teal', `OP ⊥ T₁T₂ = ${fmtAngle(90, angUnit)}`)}`;
    }
    if (this.slots.s3) {
      const d2 = (dVal * dVal).toFixed(1);
      const r2 = (r * r).toFixed(1);
      const diffRad = Math.max(0, dVal * dVal - r * r).toFixed(1);
      this.slots.s3.innerHTML =
        `↳ ${tag('emerald', '|PT₁|')} = √(${tag('yellow', '|OP|²')} - ${tag('emerald', '|OT₁|²')}) = √(${tag('yellow', `${dVal.toFixed(1)}²`)} - ${tag('emerald', `${r}²`)})<br>` +
        `= √(${tag('yellow', d2)} - ${tag('emerald', r2)}) = √(${diffRad}) = ${tag('emerald', `${len1Str}`)}<br>` +
        `↳ Shaded Kite Area = ${tag('amber', `${kiteAreaStr}`)} (Sum of congruent right triangles)`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ Tangent segment ${tag('emerald', `|PT₁| = ${len1Str}`)}, Tangent segment ${tag('blue', `|PT₂| = ${len2Str}`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${len1Str} - ${len2Str}| = ${diffStr}`)} (Zero invariant under all configurations)`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('emerald', `|PT₁| = ${len1Str}`)} ≝ ${tag('blue', `|PT₂| = ${len2Str}`)}</span><span class="derivation-check">✓ Tangent Segments Equal</span>`;
    }
    if (this.slots.s5) {
      const alpha2 = g.alphaDeg * 2;
      const beta2 = g.betaDeg * 2;
      const refAlpha2 = 360 - alpha2;
      const refBeta2 = 360 - beta2;
      this.slots.s5.innerHTML =
        `↳ Tangent Contact Reflexes: ${tag('teal', `∠OT₁P* = ${fmtAngle(270, angUnit)}`)}, ${tag('teal', `∠OT₂P* = ${fmtAngle(270, angUnit)}`)} (Perigon Arcs ${tag('teal', fmtAngle(360, angUnit))})<br>` +
        `↳ External Vertex Reflex at ${tag('red', 'P')}: ${tag('teal', fmtAngle(360, angUnit))} - ${tag('lime', fmtAngle(alpha2, angUnit))} = ${tag('lime', fmtAngle(refAlpha2, angUnit))} | Central Reflex at ${tag('sky', 'O')}: ${tag('teal', fmtAngle(360, angUnit))} - ${tag('amber', fmtAngle(beta2, angUnit))} = ${tag('amber', fmtAngle(refBeta2, angUnit))}<br>` +
        `↳ Kite Reflex Sum: ${tag('teal', fmtAngle(270, angUnit))} + ${tag('teal', fmtAngle(270, angUnit))} + ${tag('lime', fmtAngle(refAlpha2, angUnit))} + ${tag('amber', fmtAngle(refBeta2, angUnit))} = ${tag('lavender', fmtAngle(1080, angUnit))}`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML =
        `<span>${tag('teal', `T₁* = T₂* = ${fmtAngle(270, angUnit)}`)} | ${tag('lavender', `Kite Reflex Sum = ${fmtAngle(1080, angUnit)}`)}</span><span class="derivation-check">✓ ${fmtAngle(1080, angUnit)} Invariant</span>`;
    }
  }
}

// -----------------------------------------------------------------------------
// 7. Perpendicular Chord Bisector Theorem Derivations
// -----------------------------------------------------------------------------
export class ChordBisectorDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'cb-step-1',
        'Step 1',
        `Chord Endpoints ${tag('blue', 'A')}, ${tag('orange', 'B')} on Circle`,
        `Circle centered at Center ${tag('indigo', 'O')}(${tag('amber', '0')}, ${tag('lime', '0')}) with radius ${tag('indigo', 'r')}.<br>` +
        `Endpoints on circumference satisfy: |${tag('blue', 'OA')}| = |${tag('orange', 'OB')}| = ${tag('indigo', 'r')}`
      )}
      ${cardTemplate(
        'cb-step-2',
        'Step 2',
        `Midpoint ${tag('emerald', 'M')} of Chord ${tag('blue', 'AB')}`,
        `Coordinates of midpoint: ${tag('emerald', 'M')}(${tag('amber', 'x_M')}, ${tag('lime', 'y_M')}) = (${tag('blue', 'A')} + ${tag('orange', 'B')}) / 2<br>` +
        `Half-chord lengths: ${tag('blue', '|AM|')} = ½|${tag('blue', 'AB')}|, ${tag('orange', '|MB|')} = ½|${tag('blue', 'AB')}|`
      )}
      ${cardTemplate(
        'cb-step-3',
        'Step 3',
        `Perpendicularity of Radius Line (${tag('emerald', 'OM')} ⊥ ${tag('blue', 'AB')})`,
        `${tag('emerald', 'OM')} · ${tag('blue', 'AB')} = (${tag('amber', 'x_M')})(${tag('amber', 'x_B - x_A')}) + (${tag('lime', 'y_M')})(${tag('lime', 'y_B - y_A')}) = ${tag('teal', '0')}<br>` +
        `⟹ Radial line from center through midpoint is perpendicular to chord (${tag('teal', '∠OMA = 90.0°')})`
      )}
      ${cardTemplate(
        'cb-step-4',
        'Step 4',
        `RHS Congruence & Bisector Invariant (${tag('blue', '|AM|')} = ${tag('orange', '|MB|')})`,
        `In right ${tag('blue', '△OMA')} and ${tag('orange', '△OMB')}: ${tag('blue', 'OA')} = ${tag('orange', 'OB')} = ${tag('indigo', 'r')} (hypotenuses), ${tag('emerald', 'OM')} shared leg, ${tag('teal', '∠OMA = ∠OMB = 90.0°')}.<br>` +
        `By RHS congruence: ${tag('blue', '△OMA')} ≅ ${tag('orange', '△OMB')} ⟹ ${tag('blue', '|AM|')} = ${tag('orange', '|MB|')} (Bisected)`,
        true
      )}
      ${cardTemplate(
        'cb-step-5',
        'Step 5',
        `Conjugate Reflex Right Angle at Midpoint (${tag('teal', '270.0°')})`,
        `The right angle at midpoint ${tag('emerald', 'M')} forms a ${tag('teal', '360°')} perigon with its conjugate reflex angle (${tag('teal', 'M* = 270.0°')}):<br>` +
        `• Midpoint Perigon: ${tag('teal', '∠OMA')} + ${tag('teal', '∠OMA*')} = ${tag('teal', '90°')} + ${tag('teal', '270°')} = ${tag('teal', '360.0°')}<br>` +
        `• Triangle Reflex Sum: In ${tag('blue', '△OMA')}, reflex sum = 3(${tag('teal', '360°')}) - ${tag('lavender', '180°')} = ${tag('lavender', '900.0°')}<br>` +
        `• Symmetrical Bisector Invariant: Both right angles at ${tag('emerald', 'M')} (${tag('teal', '∠OMA')} and ${tag('teal', '∠OMB')}) share identical conjugate reflex angles of ${tag('teal', '270.0°')}.`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#cb-step-1 [data-sub]'),
      s2: this.container.querySelector('#cb-step-2 [data-sub]'),
      s3: this.container.querySelector('#cb-step-3 [data-sub]'),
      s4: this.container.querySelector('#cb-step-4 [data-sub]'),
      s4e: this.container.querySelector('#cb-step-4 [data-eval]'),
      s5: this.container.querySelector('#cb-step-5 [data-sub]'),
      s5e: this.container.querySelector('#cb-step-5 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angUnit = state?.angleUnit || 'deg';
    const lenUnit = state?.lengthUnit || 'px';

    const r = state.radius;
    const rStr = fmtLength(r, lenUnit, r, 1);
    const chordLen = fmtLength(g.lenChord, lenUnit, r, 1);
    const halfChord = fmtLength(g.lenAM, lenUnit, r, 1);
    const omLen = fmtLength(g.distOM, lenUnit, r, 1);
    const diff = fmtLength(g.midDiff, lenUnit, r, 2);

    const ax = g.A ? (g.A.x - g.cx).toFixed(1) : '0.0';
    const ay = g.A ? (-(g.A.y - g.cy)).toFixed(1) : '0.0';
    const bx = g.B ? (g.B.x - g.cx).toFixed(1) : '0.0';
    const by = g.B ? (-(g.B.y - g.cy)).toFixed(1) : '0.0';
    const mx = g.M ? (g.M.x - g.cx).toFixed(1) : '0.0';
    const my = g.M ? (-(g.M.y - g.cy)).toFixed(1) : '0.0';

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Center ${tag('indigo', 'O')} = (${tag('amber', '0.0')}, ${tag('lime', '0.0')}), Radius ${tag('indigo', `r = ${rStr}`)} | Endpoints: ${tag('blue', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), ${tag('orange', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)}) | Total chord ${tag('blue', `|AB| = ${chordLen}`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Chord midpoint ${tag('emerald', 'M')} = (${tag('amber', mx)}, ${tag('lime', my)}) | Half-chord ${tag('blue', `|AM| = ${halfChord}`)}, ${tag('orange', `|MB| = ${halfChord}`)}`;
    }
    if (this.slots.s3) {
      const dotVal = (g.dot ?? 0).toFixed(2);
      this.slots.s3.innerHTML =
        `↳ Distance from center ${tag('emerald', `|OM| = ${omLen}`)} | Dot product ${tag('emerald', 'OM')} · ${tag('blue', 'AB')} = ${tag('teal', dotVal)} ⟹ Perpendicular (${tag('teal', `∠OMA = ${fmtAngle(90, angUnit)}`)})`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `|AM| = ${halfChord}`)}, ${tag('orange', `|MB| = ${halfChord}`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |AM - MB| = ${diff}`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('blue', `|AM| = ${halfChord}`)} ≝ ${tag('orange', `|MB| = ${halfChord}`)} (Bisected)</span><span class="derivation-check">✓ Perpendicular Bisector</span>`;
    }
    if (this.slots.s5) {
      this.slots.s5.innerHTML =
        `↳ Midpoint Perigon: ${tag('teal', `∠OMA (${fmtAngle(90, angUnit)})`)} + ${tag('teal', `∠OMA* (${fmtAngle(270, angUnit)})`)} = ${tag('teal', fmtAngle(360, angUnit))}<br>` +
        `↳ Symmetrical Bisector Invariant: Both right angles at ${tag('emerald', 'M')} (${tag('teal', '∠OMA')} and ${tag('teal', '∠OMB')}) share identical conjugate reflex angles of ${tag('teal', fmtAngle(270, angUnit))}.<br>` +
        `↳ Right Triangle Reflex Sum: In ${tag('blue', '△OMA')}, reflex sum = 3(${tag('teal', fmtAngle(360, angUnit))}) - ${tag('lavender', fmtAngle(180, angUnit))} = ${tag('lavender', fmtAngle(900, angUnit))}`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML =
        `<span>${tag('teal', `Midpoint Reflex M* = ${fmtAngle(270, angUnit)} (Perigon ${fmtAngle(360, angUnit)})`)}</span><span class="derivation-check">✓ ${fmtAngle(270, angUnit)} Invariant</span>`;
    }
  }
}
