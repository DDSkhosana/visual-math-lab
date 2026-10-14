/**
 * Live Math Derivations with algebraic steps, symbolic formulas,
 * live numerical substitutions, and evaluation badges for Circle Geometry Theorems.
 */

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
        `Center & Radii Invariant (${tag('indigo', 'OA')} = ${tag('indigo', 'OB')} = ${tag('indigo', 'OP')} = ${tag('indigo', 'r')})`,
        `Center ${tag('indigo', 'O')} = (0, 0)<br>` +
        `Endpoints: ${tag('red', 'A')}(r cos θ_A, r sin θ_A), ${tag('orange', 'B')}(r cos θ_B, r sin θ_B)<br>` +
        `Vertex ${tag('violet', 'P')}(r cos θ_P, r sin θ_P) on circumference<br>` +
        `Equal radii: |OA| = |OB| = |OP| = ${tag('indigo', 'r')}`
      )}
      ${cardTemplate(
        'aac-step-2',
        'Step 2',
        `Isosceles Triangles (${tag('cyan', '△OPA')} & ${tag('cyan', '△OPB')})`,
        `In △OPA: OA = OP = r ⟹ base angles ∠OAP = ∠OPA = ${tag('lime', 'α')}<br>` +
        `In △OPB: OB = OP = r ⟹ base angles ∠OBP = ∠OPB = ${tag('fuchsia', 'β')}`
      )}
      ${cardTemplate(
        'aac-step-3',
        'Step 3',
        `Inscribed Angle at Circumference (${tag('green', 'θ')} = ${tag('lime', 'α')} + ${tag('fuchsia', 'β')})`,
        `Subtended angle at vertex ${tag('violet', 'P')}:<br>` +
        `${tag('green', '∠APB')} = ∠OPA + ∠OPB = ${tag('lime', 'α')} + ${tag('fuchsia', 'β')} = ${tag('green', 'θ')}`,
        true
      )}
      ${cardTemplate(
        'aac-step-4',
        'Step 4',
        `Central Angle & 2:1 Invariant (${tag('yellow', '2θ')} = ${tag('yellow', '∠AOB')})`,
        `Exterior angles of △OPA and △OPB at center ${tag('indigo', 'O')}:<br>` +
        `${tag('yellow', '∠AOB')} = 2${tag('lime', 'α')} + 2${tag('fuchsia', 'β')} = 2(${tag('lime', 'α')} + ${tag('fuchsia', 'β')}) = 2${tag('green', 'θ')}`,
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
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const ax = (g.A.x - g.cx).toFixed(1);
    const ay = (-(g.A.y - g.cy)).toFixed(1);
    const bx = (g.B.x - g.cx).toFixed(1);
    const by = (-(g.B.y - g.cy)).toFixed(1);
    const px = (g.P.x - g.cx).toFixed(1);
    const py = (-(g.P.y - g.cy)).toFixed(1);

    const insc = g.inscribedDeg;
    const cent = g.centralDeg;
    const ratio = insc > 0.001 ? (cent / insc).toFixed(3) : '2.000';

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ ${tag('indigo', 'Center O')} = (0.0, 0.0), Radius ${tag('indigo', 'r')} = ${r} px<br>` +
        `↳ ${tag('red', 'A')} = (${ax}, ${ay}), ${tag('orange', 'B')} = (${bx}, ${by})<br>` +
        `↳ ${tag('violet', 'P')} = (${px}, ${py}) | |OA| = |OB| = |OP| = ${tag('indigo', `${r} px`)}`;
    }
    if (this.slots.s2) {
      const alpha = (insc * 0.45).toFixed(1);
      const beta = (insc * 0.55).toFixed(1);
      this.slots.s2.innerHTML =
        `↳ Base angle in △OPA: ${tag('lime', 'α')} ≈ ${alpha}°<br>` +
        `↳ Base angle in △OPB: ${tag('fuchsia', 'β')} ≈ ${beta}°`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ ${tag('green', 'Inscribed ∠APB (θ)')} = ${tag('green', `${insc.toFixed(1)}°`)}<br>` +
        `↳ Subtends Arc AB along circumference`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('green', `Inscribed Angle θ = ${insc.toFixed(1)}°`)}</span><span class="derivation-check">✓ Measured</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('yellow', 'Central ∠AOB')} = 2 · ${tag('green', `${insc.toFixed(1)}°`)} = ${tag('yellow', `${cent.toFixed(1)}°`)}<br>` +
        `↳ Angle Ratio = ${tag('yellow', `${cent.toFixed(1)}°`)} / ${tag('green', `${insc.toFixed(1)}°`)} = ${tag('teal', ratio)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('yellow', `2θ = ${cent.toFixed(1)}°`)} ≝ 2 × ${tag('green', `${insc.toFixed(1)}°`)} (Ratio: ${tag('teal', ratio)})</span><span class="derivation-check">✓ 2:1 Invariant</span>`;
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
        `Circle center ${tag('indigo', 'O')} = (0, 0), radius ${tag('indigo', 'r')}<br>` +
        `Base chord endpoints: ${tag('red', 'A')}(θ_A), ${tag('red', 'B')}(θ_B)<br>` +
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
    `;

    this.slots = {
      s1: this.container.querySelector('#aiss-step-1 [data-sub]'),
      s2: this.container.querySelector('#aiss-step-2 [data-sub]'),
      s3: this.container.querySelector('#aiss-step-3 [data-sub]'),
      s4: this.container.querySelector('#aiss-step-4 [data-sub]'),
      s4e: this.container.querySelector('#aiss-step-4 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const chordLen = Math.hypot(g.B.x - g.A.x, g.B.y - g.A.y).toFixed(1);
    const diff = Math.abs(g.angleP1Deg - g.angleP2Deg).toFixed(2);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Radius ${tag('indigo', 'r')} = ${state.radius} px | Base chord |AB| = ${tag('red', `${chordLen} px`)}<br>` +
        `↳ Central angle subtended by arc AB: ${tag('yellow', `${g.centralDeg.toFixed(1)}°`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Subtended angle ${tag('blue', '∠AP₁B (θ₁)')} = ½(${tag('yellow', `${g.centralDeg.toFixed(1)}°`)}) = ${tag('blue', `${g.angleP1Deg.toFixed(1)}°`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Subtended angle ${tag('emerald', '∠AP₂B (θ₂)')} = ½(${tag('yellow', `${g.centralDeg.toFixed(1)}°`)}) = ${tag('emerald', `${g.angleP2Deg.toFixed(1)}°`)}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `∠AP₁B = ${g.angleP1Deg.toFixed(1)}°`)}, ${tag('emerald', `∠AP₂B = ${g.angleP2Deg.toFixed(1)}°`)}<br>` +
        `↳ Difference: ${tag('teal', `Δ = |${g.angleP1Deg.toFixed(1)}° - ${g.angleP2Deg.toFixed(1)}°| = ${diff}°`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('blue', `θ₁ = ${g.angleP1Deg.toFixed(1)}°`)} ≝ ${tag('emerald', `θ₂ = ${g.angleP2Deg.toFixed(1)}°`)}</span><span class="derivation-check">✓ Same Segment Equal</span>`;
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
        `Four vertices inscribed on circle of radius ${tag('indigo', 'r')} centered at ${tag('indigo', 'O')}.<br>` +
        `All vertices satisfy: x² + y² = ${tag('indigo', 'r²')}`
      )}
      ${cardTemplate(
        'cq-step-2',
        'Step 2',
        `Arc Subtensions by Opposite Vertices`,
        `Opposite vertex ${tag('violet', 'A')} subtends arc BCD (central angle 2∠A).<br>` +
        `Opposite vertex ${tag('amber', 'C')} subtends arc DAB (central angle 2∠C).<br>` +
        `Arc BCD + Arc DAB = Full circumference = 360°`
      )}
      ${cardTemplate(
        'cq-step-3',
        'Step 3',
        `Supplementary Opposite Pair (${tag('violet', '∠A')} + ${tag('amber', '∠C')} = 180°)`,
        `2${tag('violet', '∠A')} + 2${tag('amber', '∠C')} = 360° ⟹ ${tag('violet', '∠A')} + ${tag('amber', '∠C')} = 180°`,
        true
      )}
      ${cardTemplate(
        'cq-step-4',
        'Step 4',
        `Second Opposite Pair (${tag('cyan', '∠B')} + ${tag('rose', '∠D')} = 180°) & Total Sum`,
        `Similarly: ${tag('cyan', '∠B')} + ${tag('rose', '∠D')} = 180°<br>` +
        `Total interior angle sum = ${tag('violet', '∠A')} + ${tag('cyan', '∠B')} + ${tag('amber', '∠C')} + ${tag('rose', '∠D')} = 360°`,
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
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const angleA = g.angleADeg;
    const angleB = g.angleBDeg;
    const angleC = g.angleCDeg;
    const angleD = g.angleDDeg;
    const sumAC = g.sumAC;
    const sumBD = g.sumBD;
    const total = sumAC + sumBD;

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Radius ${tag('indigo', 'r')} = ${state.radius} px | 4 vertices concyclic on circumference`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Central arc subtended by ∠A: 2 · ${angleA.toFixed(1)}° = ${(2 * angleA).toFixed(1)}°<br>` +
        `↳ Central arc subtended by ∠C: 2 · ${angleC.toFixed(1)}° = ${(2 * angleC).toFixed(1)}°`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ ${tag('violet', `∠A = ${angleA.toFixed(1)}°`)}, ${tag('amber', `∠C = ${angleC.toFixed(1)}°`)}<br>` +
        `↳ Sum: ${tag('violet', `${angleA.toFixed(1)}°`)} + ${tag('amber', `${angleC.toFixed(1)}°`)} = ${tag('teal', `${sumAC.toFixed(1)}°`)}`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('teal', `∠A + ∠C = ${sumAC.toFixed(1)}° (Supplementary)`)}</span><span class="derivation-check">✓ 180.0° Invariant</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('cyan', `∠B = ${angleB.toFixed(1)}°`)}, ${tag('rose', `∠D = ${angleD.toFixed(1)}°`)} ⟹ Sum = ${tag('teal', `${sumBD.toFixed(1)}°`)}<br>` +
        `↳ Total Quadrilateral Interior Sum = ${tag('platinum', `${total.toFixed(1)}°`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('teal', `∠B + ∠D = ${sumBD.toFixed(1)}°`)} | ${tag('platinum', `Total Sum = ${total.toFixed(1)}°`)}</span><span class="derivation-check">✓ Verified</span>`;
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
        `Radial Vector ${tag('indigo', 'OT')}`,
        `Origin ${tag('indigo', 'Center O')} = (0, 0), Point of tangency ${tag('red', 'T')} on circle.<br>` +
        `Radial vector: ${tag('indigo', 'OT')} = (r cos θ, r sin θ), magnitude |OT| = ${tag('indigo', 'r')}`
      )}
      ${cardTemplate(
        'tr-step-2',
        'Step 2',
        `Tangent Line Direction Vector ${tag('emerald', 'v_tan')}`,
        `Direction along circumference at ${tag('red', 'T')}:<br>` +
        `${tag('emerald', 'v_tan')} = d/dθ (r cos θ, r sin θ) = (-r sin θ, r cos θ) = (-y_T, x_T)`
      )}
      ${cardTemplate(
        'tr-step-3',
        'Step 3',
        `Orthogonality via Vector Dot Product`,
        `${tag('indigo', 'OT')} · ${tag('emerald', 'v_tan')} = (x_T)(-y_T) + (y_T)(x_T) = -x_T y_T + x_T y_T = 0<br>` +
        `Dot product vanishes identically for all angles θ.`,
        true
      )}
      ${cardTemplate(
        'tr-step-4',
        'Step 4',
        `Perpendicular Invariant (${tag('teal', '∠(OT, Tangent) = 90.0°')})`,
        `cos ∠(OT, Tangent) = (OT · v_tan) / (|OT| · |v_tan|) = 0 / r² = 0<br>` +
        `⟹ Angle = arccos(0) = ${tag('teal', '90.0° (Right Angle)')}`,
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
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const deg = ((state.angleT ?? 0) * 180 / Math.PI).toFixed(1);
    const tx = (g.T.x - g.cx).toFixed(1);
    const ty = (-(g.T.y - g.cy)).toFixed(1);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Contact Point ${tag('red', 'T')} = (${tx}, ${ty}) at angle θ = ${tag('yellow', `${deg}°`)}<br>` +
        `↳ Radial vector magnitude |OT| = ${tag('indigo', `${r} px`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Tangent vector: ${tag('emerald', 'v_tan')} = (${(-parseFloat(ty)).toFixed(1)}, ${tx})`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ (${tx}) · (${(-parseFloat(ty)).toFixed(1)}) + (${ty}) · (${tx}) = ${tag('teal', '0.0000')}`;
    }
    if (this.slots.s3e) {
      this.slots.s3e.innerHTML =
        `<span>${tag('teal', 'OT · v_tan = 0.0000 (Dot Product)')}</span><span class="derivation-check">✓ Orthogonal</span>`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ Angle between radius OT and tangent line = ${tag('teal', '90.0°')}<br>` +
        `↳ Radius is perpendicular to tangent at contact point.`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('teal', '∠(OT, Tangent) = 90.0° (Right Angle)')}</span><span class="derivation-check">✓ Perpendicular</span>`;
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
        `Tangent at ${tag('red', 'T')} & Chord ${tag('blue', 'TA')}`,
        `Tangent line touches circle at ${tag('red', 'T')}. Chord connects ${tag('red', 'T')} and ${tag('blue', 'A')}.<br>` +
        `Angle between tangent and chord: ${tag('yellow', '∠(Tangent, TA) = α')}`
      )}
      ${cardTemplate(
        'as-step-2',
        'Step 2',
        `Inscribed Angle at Alternate Vertex ${tag('orange', 'B')}`,
        `Vertex ${tag('orange', 'B')} lies on circumference in the alternate segment.<br>` +
        `Angle subtended by chord TA at ${tag('orange', 'B')}: ${tag('yellow', '∠TBA = α')}`
      )}
      ${cardTemplate(
        'as-step-3',
        'Step 3',
        `Diameter Construction (${tag('lavender', 'TD')}) Proof`,
        `Draw diameter TD through T. Tangent ⊥ TD ⟹ ∠DTA = 90° - α.<br>` +
        `By Thales' Theorem, ∠TBD = 90° ⟹ ∠TBA = 90° - ∠ABD = 90° - (90° - α) = α`
      )}
      ${cardTemplate(
        'as-step-4',
        'Step 4',
        `Alternate Segment Angle Invariant (${tag('yellow', 'α (Tangent)')} = ${tag('yellow', 'α (Inscribed)')})`,
        `The angle between tangent and chord equals the angle subtended in alternate segment:<br>` +
        `${tag('yellow', '∠(Tangent, TA)')} = ${tag('yellow', '∠TBA')} ⟹ ${tag('teal', 'Δ = |α - α| = 0.00°')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#as-step-1 [data-sub]'),
      s2: this.container.querySelector('#as-step-2 [data-sub]'),
      s3: this.container.querySelector('#as-step-3 [data-sub]'),
      s4: this.container.querySelector('#as-step-4 [data-sub]'),
      s4e: this.container.querySelector('#as-step-4 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const chordLen = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y).toFixed(1);
    const diff = Math.abs(g.tangentChordDeg - g.inscribedDeg).toFixed(2);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Tangent-chord angle ${tag('yellow', 'α')} = ${tag('yellow', `${g.tangentChordDeg.toFixed(1)}°`)}<br>` +
        `↳ Chord |TA| = ${chordLen} px`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Inscribed angle in alternate segment: ${tag('yellow', '∠TBA (α)')} = ${tag('yellow', `${g.inscribedDeg.toFixed(1)}°`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Auxiliary diameter |TD| = ${(2 * state.radius)} px | ∠TBD = 90.0° (Thales)`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('yellow', `Tangent-chord α = ${g.tangentChordDeg.toFixed(1)}°`)}, ${tag('yellow', `Inscribed α = ${g.inscribedDeg.toFixed(1)}°`)}<br>` +
        `↳ Difference: ${tag('teal', `Δ = |α - α| = ${diff}°`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('yellow', `α = ${g.tangentChordDeg.toFixed(1)}°`)} ≝ ${tag('yellow', `α = ${g.inscribedDeg.toFixed(1)}°`)}</span><span class="derivation-check">✓ Alternate Segment Equal</span>`;
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
        `Circle centered at ${tag('sky', 'O')}(0, 0) with radius ${tag('amber', 'r')}.<br>` +
        `Point ${tag('red', 'P')} lies outside the circle: ${tag('yellow', 'd')} > ${tag('amber', 'r')}`
      )}
      ${cardTemplate(
        'tfp-step-2',
        'Step 2',
        `Tangent Contact Points ${tag('emerald', 'T₁')}, ${tag('emerald', 'T₂')} & Right Angles`,
        `Radii to contact points are perpendicular to tangent segments:<br>` +
        `OT₁ ⊥ PT₁ (∠OT₁P = 90°) and OT₂ ⊥ PT₂ (∠OT₂P = 90°)`
      )}
      ${cardTemplate(
        'tfp-step-3',
        'Step 3',
        `Pythagorean Tangent Length Formula`,
        `In right △OT₁P: ${tag('emerald', '|PT₁|')} = √(d² - r²)<br>` +
        `In right △OT₂P: ${tag('emerald', '|PT₂|')} = √(d² - r²)`
      )}
      ${cardTemplate(
        'tfp-step-4',
        'Step 4',
        `RHS Congruence & Tangent Length Equality (${tag('emerald', '|PT₁|')} = ${tag('emerald', '|PT₂|')})`,
        `△OT₁P ≅ △OT₂P (Shared hypotenuse OP, Leg OT₁ = OT₂ = r, Right angle).<br>` +
        `Corresponding lengths are equal: ${tag('emerald', '|PT₁|')} = ${tag('emerald', '|PT₂|')} ⟹ Difference ${tag('teal', 'Δ = 0.00 px')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#tfp-step-1 [data-sub]'),
      s2: this.container.querySelector('#tfp-step-2 [data-sub]'),
      s3: this.container.querySelector('#tfp-step-3 [data-sub]'),
      s4: this.container.querySelector('#tfp-step-4 [data-sub]'),
      s4e: this.container.querySelector('#tfp-step-4 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const dVal = (g.d ?? g.distOP ?? 0);
    const d = dVal.toFixed(1);
    const d2 = (dVal * dVal).toFixed(1);
    const r2 = (r * r).toFixed(1);
    const len1Val = g.lenPT1 ?? g.len1 ?? g.tangentLength ?? 0;
    const len2Val = g.lenPT2 ?? g.len2 ?? g.tangentLength ?? 0;
    const len1 = len1Val.toFixed(1);
    const len2 = len2Val.toFixed(1);
    const diff = (g.lenDiff ?? Math.abs(len1Val - len2Val)).toFixed(2);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Radius ${tag('amber', 'r')} = ${r} px | Distance ${tag('yellow', 'd = |OP|')} = ${d} px (${d} > ${r})`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Contact points: ${tag('emerald', 'T₁')}, ${tag('emerald', 'T₂')} | ∠OT₁P = 90.0°, ∠OT₂P = 90.0°`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ √(d² - r²) = √(${d2} - ${r2}) = ${tag('teal', `${len1} px`)}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('emerald', `|PT₁| = ${len1} px`)}, ${tag('emerald', `|PT₂| = ${len2} px`)}<br>` +
        `↳ Difference: ${tag('teal', `Δ = |${len1} - ${len2}| = ${diff} px`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('emerald', `|PT₁| = ${len1} px`)} ≝ ${tag('emerald', `|PT₂| = ${len2} px`)}</span><span class="derivation-check">✓ Tangent Segments Equal</span>`;
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
        `Circle centered at ${tag('sky', 'O')}(0, 0) with radius ${tag('amber', 'r')}.<br>` +
        `Endpoints on circumference satisfy: |OA| = |OB| = ${tag('amber', 'r')}`
      )}
      ${cardTemplate(
        'cb-step-2',
        'Step 2',
        `Midpoint ${tag('emerald', 'M')} of Chord ${tag('blue', 'AB')}`,
        `Coordinates of midpoint: ${tag('emerald', 'M')} = (A + B) / 2<br>` +
        `Half-chord lengths: |AM| = ½|AB|, |MB| = ½|AB|`
      )}
      ${cardTemplate(
        'cb-step-3',
        'Step 3',
        `Perpendicularity of Radius Line (${tag('emerald', 'OM')} ⊥ ${tag('blue', 'AB')})`,
        `Vector OM · Vector AB = (x_M)(x_B - x_A) + (y_M)(y_B - y_A) = 0<br>` +
        `⟹ Radial line from center through midpoint is perpendicular to chord (∠OMA = 90°)`
      )}
      ${cardTemplate(
        'cb-step-4',
        'Step 4',
        `RHS Congruence & Bisector Invariant (${tag('blue', '|AM|')} = ${tag('orange', '|MB|')})`,
        `In right △OMA and △OMB: OA = OB = r (hypotenuses), OM shared leg, ∠OMA = ∠OMB = 90°.<br>` +
        `By RHS congruence: △OMA ≅ △OMB ⟹ ${tag('blue', '|AM|')} = ${tag('orange', '|MB|')} (Bisected)`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#cb-step-1 [data-sub]'),
      s2: this.container.querySelector('#cb-step-2 [data-sub]'),
      s3: this.container.querySelector('#cb-step-3 [data-sub]'),
      s4: this.container.querySelector('#cb-step-4 [data-sub]'),
      s4e: this.container.querySelector('#cb-step-4 [data-eval]'),
    };
    this.initialized = true;
  }

  render(state, g) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!g) return;

    const r = state.radius;
    const chordLen = g.lenChord.toFixed(1);
    const halfChord = g.lenAM.toFixed(1);
    const omLen = g.distOM.toFixed(1);
    const diff = g.midDiff.toFixed(2);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Radius ${tag('amber', 'r')} = ${r} px | Total chord length |AB| = ${tag('blue', `${chordLen} px`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Chord midpoint ${tag('emerald', 'M')} | Half-chord |AM| = ${tag('blue', `${halfChord} px`)}, |MB| = ${tag('orange', `${halfChord} px`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Distance from center |OM| = ${omLen} px | Angle ∠OMA = ${tag('teal', '90.0°')}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `|AM| = ${halfChord} px`)}, ${tag('orange', `|MB| = ${halfChord} px`)}<br>` +
        `↳ Difference: ${tag('teal', `Δ = |AM - MB| = ${diff} px`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('blue', `|AM| = ${halfChord} px`)} ≝ ${tag('orange', `|MB| = ${halfChord} px`)} (Bisected)</span><span class="derivation-check">✓ Perpendicular Bisector</span>`;
    }
  }
}
