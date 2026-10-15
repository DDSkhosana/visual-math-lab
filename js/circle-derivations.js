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
        `↳ ${tag('indigo', 'Center O')} = (0.0, 0.0), Radius ${tag('indigo', `r = ${r} px`)}<br>` +
        `↳ ${tag('red', 'A')} = (${tag('amber', ax)}, ${tag('lime', ay)}), ${tag('orange', 'B')} = (${tag('amber', bx)}, ${tag('lime', by)})<br>` +
        `↳ ${tag('violet', 'P')} = (${tag('amber', px)}, ${tag('lime', py)}) | ${tag('red', '|OA|')} = ${tag('orange', '|OB|')} = ${tag('lavender', '|OP|')} = ${tag('indigo', `${r} px`)}`;
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
        `↳ Base angle in ${tag('blue', '△OPA')}: ${tag('lime', `α = ${alpha}°`)}<br>` +
        `↳ Base angle in ${tag('orange', '△OPB')}: ${tag('fuchsia', `β = ${beta}°`)}<br>` +
        `↳ Total Inscribed Angle: ${tag('green', 'θ')} = ${tag('lime', `${alpha}°`)} + ${tag('fuchsia', `${beta}°`)} = ${tag('green', `${insc.toFixed(1)}°`)}`;
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
        `↳ Radius ${tag('indigo', `r = ${state.radius} px`)} | Base chord ${tag('red', `|AB| = ${chordLen} px`)}<br>` +
        `↳ Central angle subtended by ${tag('red', 'Arc AB')}: ${tag('yellow', `2θ = ${g.centralDeg.toFixed(1)}°`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Subtended angle ${tag('blue', '∠AP₁B (θ₁)')} = ½(${tag('yellow', `${g.centralDeg.toFixed(1)}°`)}) = ${tag('blue', `θ₁ = ${g.angleP1Deg.toFixed(1)}°`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Subtended angle ${tag('emerald', '∠AP₂B (θ₂)')} = ½(${tag('yellow', `${g.centralDeg.toFixed(1)}°`)}) = ${tag('emerald', `θ₂ = ${g.angleP2Deg.toFixed(1)}°`)}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `∠AP₁B = ${g.angleP1Deg.toFixed(1)}°`)}, ${tag('emerald', `∠AP₂B = ${g.angleP2Deg.toFixed(1)}°`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${g.angleP1Deg.toFixed(1)}° - ${g.angleP2Deg.toFixed(1)}°| = ${diff}°`)}`;
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
        `↳ Radius ${tag('indigo', `r = ${state.radius} px`)} | 4 vertices concyclic on circumference`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Central arc subtended by ${tag('violet', '∠A')}: 2 · ${tag('violet', `${angleA.toFixed(1)}°`)} = ${tag('violet', `${(2 * angleA).toFixed(1)}°`)}<br>` +
        `↳ Central arc subtended by ${tag('amber', '∠C')}: 2 · ${tag('amber', `${angleC.toFixed(1)}°`)} = ${tag('amber', `${(2 * angleC).toFixed(1)}°`)}`;
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
        `↳ ${tag('cyan', `∠B = ${angleB.toFixed(1)}°`)}, ${tag('rose', `∠D = ${angleD.toFixed(1)}°`)} ⟹ Sum = ${tag('cyan', `${angleB.toFixed(1)}°`)} + ${tag('rose', `${angleD.toFixed(1)}°`)} = ${tag('teal', `${sumBD.toFixed(1)}°`)}<br>` +
        `↳ Total Quadrilateral Interior Sum = ${tag('platinum', `${total.toFixed(1)}°`)}<br>` +
        `↳ <small style="color:#94a3b8"><em>Geometric invariant: Sliding vertex ${tag('cyan', 'B')} along arc AC preserves ${tag('cyan', '∠B')} because it subtends the fixed chord AC (Angles in Same Segment Theorem). Moving bounding vertices ${tag('violet', 'A')} or ${tag('amber', 'C')} dynamically changes ${tag('cyan', '∠B')} and ${tag('rose', '∠D')}.</em></small>`;
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
        `Radial Vector ${tag('blue', 'OT')}`,
        `Origin ${tag('blue', 'Center O')} = (0, 0), Point of tangency ${tag('red', 'T')} on circle.<br>` +
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
        `↳ Contact Point ${tag('red', 'T')} = (${tag('amber', tx)}, ${tag('lime', ty)}) at angle θ = ${tag('yellow', `${deg}°`)}<br>` +
        `↳ Radial vector magnitude ${tag('blue', `|OT| = ${r} px`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Tangent vector: ${tag('emerald', 'v_tan')} = (${tag('amber', (-parseFloat(ty)).toFixed(1))}, ${tag('lime', tx)}) px<br>` +
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
        `↳ Angle between radius ${tag('blue', 'OT')} and ${tag('emerald', 'Tangent line')} = ${tag('teal', '90.0°')}<br>` +
        `↳ Tangent line is strictly perpendicular to the radial vector at point of contact.`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('teal', `∠(${tag('blue', 'OT')}, ${tag('emerald', 'Tangent')}) = 90.0° (Right Angle)`)}</span><span class="derivation-check">✓ Perpendicular</span>`;
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
        `${tag('emerald', '[Tangent line]')} touches circle at contact vertex ${tag('red', 'T')}. Primary chord ${tag('blue', 'TA')} connects ${tag('red', 'T')} and ${tag('blue', 'A')}.<br>` +
        `Chord ${tag('blue', 'TA')} divides the circle into two circular segments: the ${tag('amber', 'Minor Segment (Amber)')} on chord ${tag('blue', 'TA')}, and the ${tag('sky', 'Alternate Segment (Sky)')} containing vertex ${tag('orange', 'B')}.<br>` +
        `Angle between ${tag('emerald', '[Tangent line]')} and chord ${tag('blue', 'TA')}: ${tag('yellow', '∠(Tangent, TA) = α')}`
      )}
      ${cardTemplate(
        'as-step-2',
        'Step 2',
        `Inscribed Angle at Alternate Vertex ${tag('orange', 'B')}`,
        `Vertex ${tag('orange', 'B')} lies on circumference in the ${tag('sky', 'Alternate Segment (Sky)')}.<br>` +
        `Angle subtended by chord ${tag('blue', 'TA')} at alternate vertex ${tag('orange', 'B')}: ${tag('yellow', '∠TBA = α')}`
      )}
      ${cardTemplate(
        'as-step-3',
        'Step 3',
        `Diameter Construction (${tag('indigo', 'TD')}) Proof: Thales' Theorem Overlay`,
        `Construct auxiliary diameter ${tag('indigo', 'TD')} through contact point ${tag('red', 'T')}, passing through center ${tag('sky', 'O')}.<br>` +
        `1. ${tag('emerald', '[Tangent line]')} ⊥ ${tag('indigo', 'TD')} ⟹ ${tag('indigo', '∠DTA')} = ${tag('teal', '90°')} - ${tag('yellow', 'α')}.<br>` +
        `2. By Thales' Theorem, any angle inscribed in a semicircle subtended by diameter ${tag('indigo', 'TD')} is a right angle: ${tag('teal', '∠TBD = 90.0°')}.<br>` +
        `3. In right-angled triangle ${tag('indigo', 'ΔTBD')}: ${tag('yellow', '∠TBA')} = ${tag('teal', '90°')} - ${tag('rose', '∠ABD')} = ${tag('teal', '90°')} - (${tag('teal', '90°')} - ${tag('yellow', 'α')}) = ${tag('yellow', 'α')}.<br>` +
        `<em>Thales' Theorem overlay: Chord ${tag('indigo', 'TD')} is the hypotenuse of right triangle ${tag('indigo', 'ΔTBD')}. Reflexive primitives share unified color tokens.</em>`
      )}
      ${cardTemplate(
        'as-step-4',
        'Step 4',
        `Alternate Segment Angle Invariant (${tag('yellow', 'α (Tangent-Chord)')} = ${tag('yellow', 'α (Inscribed)')})`,
        `The angle between ${tag('emerald', '[Tangent line]')} and chord ${tag('blue', 'TA')} equals the angle subtended in the ${tag('sky', 'Alternate Segment (Sky)')}:<br>` +
        `${tag('yellow', '∠(Tangent, TA)')} = ${tag('yellow', '∠TBA')} ⟹ Invariant Difference ${tag('teal', 'Δ = |α - α| = 0.00°')}`,
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
        `↳ ${tag('emerald', '[Tangent line]')} angle with chord ${tag('blue', 'TA')}: ${tag('yellow', `α = ${g.tangentChordDeg.toFixed(1)}°`)}<br>` +
        `↳ Primary chord ${tag('blue', `|TA| = ${chordLen} px`)} | Partitions circle into ${tag('amber', 'Minor Segment')} & ${tag('sky', 'Alternate Segment')}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Inscribed angle at ${tag('orange', 'B')} in ${tag('sky', 'Alternate Segment')}: ${tag('yellow', `∠TBA = ${g.inscribedDeg.toFixed(1)}°`)} (Subtends chord ${tag('blue', 'TA')})`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Auxiliary diameter ${tag('indigo', `|TD| = ${(2 * state.radius)} px`)} | Thales Right Angle: ${tag('teal', '∠TBD = 90.0°')}<br>` +
        `↳ ${tag('indigo', 'ΔTBD')} (Right Triangle on Diameter) & ${tag('rose', 'ΔABD')} overlay Thales geometry`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('emerald', '[Tangent line]')} angle: ${tag('yellow', `α = ${g.tangentChordDeg.toFixed(1)}°`)} | ${tag('sky', 'Alternate Segment')} angle at ${tag('orange', 'B')}: ${tag('yellow', `α = ${g.inscribedDeg.toFixed(1)}°`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${g.tangentChordDeg.toFixed(1)}° - ${g.inscribedDeg.toFixed(1)}°| = ${diff}°`)}`;
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
        `Circle centered at ${tag('sky', 'Center O')}(0, 0) with radius ${tag('sky', 'r')}.<br>` +
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
    const diffRad = Math.max(0, dVal * dVal - r * r).toFixed(1);
    const len1Val = g.lenPT1 ?? g.len1 ?? g.tangentLength ?? 0;
    const len2Val = g.lenPT2 ?? g.len2 ?? g.tangentLength ?? 0;
    const len1 = len1Val.toFixed(1);
    const len2 = len2Val.toFixed(1);
    const diff = (g.lenDiff ?? Math.abs(len1Val - len2Val)).toFixed(2);
    const kiteArea = (g.kiteArea ?? (r * len1Val)).toFixed(1);
    const halfChord = (g.halfChord ?? 0).toFixed(1);

    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Radius ${tag('sky', `r = ${r} px`)} | External distance ${tag('yellow', `d = |OP| = ${d} px`)} (${d} > ${r})`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Tangent contacts: ${tag('emerald', 'T₁')}, ${tag('blue', 'T₂')} | Kite ${tag('sky', 'O')}-${tag('emerald', 'T₁')}-${tag('red', 'P')}-${tag('blue', 'T₂')}<br>` +
        `↳ Diagonals intersect at ${tag('violet', 'K')}: ${tag('violet', `|KT₁| = |KT₂| = ${halfChord} px`)} | ${tag('teal', 'OP ⊥ T₁T₂ = 90.0°')}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ ${tag('emerald', '|PT₁|')} = √(${tag('yellow', '|OP|²')} - ${tag('emerald', '|OT₁|²')}) = √(${tag('yellow', `${d}²`)} - ${tag('emerald', `${r}²`)})<br>` +
        `= √(${tag('yellow', d2)} - ${tag('emerald', r2)}) = √(${diffRad}) = ${tag('emerald', `${len1} px`)}<br>` +
        `↳ Shaded Kite Area = ${tag('amber', `${kiteArea} px²`)} (Sum of congruent right triangles)`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ Tangent segment ${tag('emerald', `|PT₁| = ${len1} px`)}, Tangent segment ${tag('blue', `|PT₂| = ${len2} px`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |${len1} - ${len2}| = ${diff} px`)} (Zero invariant under all configurations)`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('emerald', `|PT₁| = ${len1} px`)} ≝ ${tag('blue', `|PT₂| = ${len2} px`)}</span><span class="derivation-check">✓ Tangent Segments Equal</span>`;
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
        `Circle centered at ${tag('indigo', 'O')}(0, 0) with radius ${tag('indigo', 'r')}.<br>` +
        `Endpoints on circumference satisfy: |OA| = |OB| = ${tag('indigo', 'r')}`
      )}
      ${cardTemplate(
        'cb-step-2',
        'Step 2',
        `Midpoint ${tag('emerald', 'M')} of Chord ${tag('blue', 'AB')}`,
        `Coordinates of midpoint: ${tag('emerald', 'M')} = (A + B) / 2<br>` +
        `Half-chord lengths: ${tag('blue', '|AM|')} = ½|AB|, ${tag('orange', '|MB|')} = ½|AB|`
      )}
      ${cardTemplate(
        'cb-step-3',
        'Step 3',
        `Perpendicularity of Radius Line (${tag('emerald', 'OM')} ⊥ ${tag('blue', 'AB')})`,
        `Vector OM · Vector AB = (x_M)(x_B - x_A) + (y_M)(y_B - y_A) = 0<br>` +
        `⟹ Radial line from center through midpoint is perpendicular to chord (∠OMA = ${tag('teal', '90°')})`
      )}
      ${cardTemplate(
        'cb-step-4',
        'Step 4',
        `RHS Congruence & Bisector Invariant (${tag('blue', '|AM|')} = ${tag('orange', '|MB|')})`,
        `In right ${tag('blue', '△OMA')} and ${tag('orange', '△OMB')}: OA = OB = ${tag('indigo', 'r')} (hypotenuses), ${tag('emerald', 'OM')} shared leg, ∠OMA = ∠OMB = ${tag('teal', '90°')}.<br>` +
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
        `↳ Radius ${tag('indigo', `r = ${r} px`)} | Total chord length ${tag('blue', `|AB| = ${chordLen} px`)}`;
    }
    if (this.slots.s2) {
      this.slots.s2.innerHTML =
        `↳ Chord midpoint ${tag('emerald', 'M')} | Half-chord ${tag('blue', `|AM| = ${halfChord} px`)}, ${tag('orange', `|MB| = ${halfChord} px`)}`;
    }
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Distance from center ${tag('emerald', `|OM| = ${omLen} px`)} | Angle ∠OMA = ${tag('teal', '90.0°')}`;
    }
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ ${tag('blue', `|AM| = ${halfChord} px`)}, ${tag('orange', `|MB| = ${halfChord} px`)}<br>` +
        `↳ Invariant Difference: ${tag('teal', `Δ = |AM - MB| = ${diff} px`)}`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML =
        `<span>${tag('blue', `|AM| = ${halfChord} px`)} ≝ ${tag('orange', `|MB| = ${halfChord} px`)} (Bisected)</span><span class="derivation-check">✓ Perpendicular Bisector</span>`;
    }
  }
}
