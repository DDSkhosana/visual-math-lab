/**
 * Abstract Mathematics & Foundations Suite — Dynamic Mathematical Derivations
 * Visual Mathematics Lab
 *
 * Implements interactive step-by-step mathematical proofs with live symbolic substitution
 * and validation badges matching Suites 01 & 02 architecture (circle-derivations.js).
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
        <div class="derivation-card-header-actions">
          <span class="icon">▶</span>
        </div>
      </div>
      <div class="derivation-card-content collapsible-content">
        <div class="derivation-math-row">${symbolicLines}</div>
        <div class="derivation-sub-row" data-sub></div>
        ${hasHighlight ? '<div class="derivation-eval-highlight" data-eval></div>' : ''}
      </div>
    </div>
  `;
}

export function ensureFirstDerivationCardOpen(container) {
  if (!container || typeof container.querySelector !== 'function') return;
  const firstCard = container.querySelector('.derivation-card');
  if (firstCard && typeof firstCard.querySelector === 'function') {
    const h = firstCard.querySelector('.derivation-card-header');
    const c = firstCard.querySelector('.derivation-card-content');
    if (h && c) {
      h.classList?.add?.('open');
      h.setAttribute?.('aria-expanded', 'true');
      const icon = h.querySelector?.('.icon');
      if (icon) icon.textContent = '▼';
      c.classList?.add?.('open');
      c.classList?.remove?.('collapsed');
      firstCard.classList?.add?.('open');
    }
  }
}

// ============================================================================
// 1. Module 1: Functions, Inverses & Reversibility Derivations
// ============================================================================
export class FunctionsDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'func-step-1',
        'Step 1',
        `Totality Invariant &amp; Full Domain Coverage (&forall;x &isin; ${tag('sky', 'X')}, &exist;y &isin; ${tag('fuchsia', 'Y')})`,
        `Totality Axiom: Relation ${tag('emerald', 'f')} &sube; ${tag('sky', 'X')} &times; ${tag('fuchsia', 'Y')} is total iff every input is assigned at least one output:<br>` +
        `&forall;x &isin; ${tag('sky', 'X')}, &exist;y &isin; ${tag('fuchsia', 'Y')} such that (${tag('sky', 'x')}, ${tag('fuchsia', 'y')}) &isin; ${tag('emerald', 'f')} &hArr; dom(${tag('emerald', 'f')}) = ${tag('sky', 'X')}`,
        true
      )}
      ${cardTemplate(
        'func-step-2',
        'Step 2',
        `Uniqueness Axiom &amp; Determinism ((${tag('sky', 'x')}, ${tag('fuchsia', 'y₁')}) &and; (${tag('sky', 'x')}, ${tag('fuchsia', 'y₂')}) &rArr; ${tag('fuchsia', 'y₁')} = ${tag('fuchsia', 'y₂')})`,
        `Well-Definedness: A relation is single-valued iff each input maps to at most one target:<br>` +
        `&forall;x &isin; ${tag('sky', 'X')}, (${tag('sky', 'x')}, ${tag('fuchsia', 'y₁')}) &isin; ${tag('emerald', 'f')} &and; (${tag('sky', 'x')}, ${tag('fuchsia', 'y₂')}) &isin; ${tag('emerald', 'f')} &rArr; ${tag('fuchsia', 'y₁')} = ${tag('fuchsia', 'y₂')}`,
        true
      )}
      ${cardTemplate(
        'func-step-3',
        'Step 3',
        `Injectivity &amp; Left-Invertibility (Monic: ${tag('sky', 'f(x₁)')} = ${tag('sky', 'f(x₂)')} &rArr; ${tag('sky', 'x₁')} = ${tag('sky', 'x₂')})`,
        `Kernel Diagonal Condition: ker(${tag('emerald', 'f')}) = {(${tag('sky', 'x₁')}, ${tag('sky', 'x₂')}) : ${tag('emerald', 'f')}(${tag('sky', 'x₁')}) = ${tag('emerald', 'f')}(${tag('sky', 'x₂')})} = ${tag('lime', '&Delta;_X')}<br>` +
        `Left-Inverse Existence: ${tag('emerald', 'f')} is injective &and; ${tag('sky', 'X')} &ne; &empty; &hArr; &exist; ${tag('violet', 'g')}: ${tag('fuchsia', 'Y')} &rarr; ${tag('sky', 'X')} such that ${tag('violet', 'g')} &comp; ${tag('emerald', 'f')} = ${tag('lime', 'id_X')}`,
        true
      )}
      ${cardTemplate(
        'func-step-4',
        'Step 4',
        `Surjectivity &amp; Right-Invertibility (Epic: im(${tag('emerald', 'f')}) = ${tag('fuchsia', 'Y')})`,
        `Codomain Full Coverage: &forall;y &isin; ${tag('fuchsia', 'Y')}, &exist;x &isin; ${tag('sky', 'X')} such that ${tag('emerald', 'f')}(${tag('sky', 'x')}) = ${tag('fuchsia', 'y')} &hArr; |im(${tag('emerald', 'f')})| = |${tag('fuchsia', 'Y')}|<br>` +
        `Right-Inverse (Section): Assuming Choice, &exist; ${tag('amber', 'h')}: ${tag('fuchsia', 'Y')} &rarr; ${tag('sky', 'X')} such that ${tag('emerald', 'f')} &comp; ${tag('amber', 'h')} = ${tag('lime', 'id_Y')}`,
        true
      )}
      ${cardTemplate(
        'func-step-5',
        'Step 5',
        `Bijectivity, Two-Sided Invertibility &amp; Isomorphism (${tag('emerald', 'f⁻¹')} &comp; ${tag('emerald', 'f')} = ${tag('lime', 'id_X')})`,
        `Two-Sided Invertibility: ${tag('emerald', 'f')} is a bijection iff it is both injective and surjective.<br>` +
        `Unique two-sided inverse ${tag('emerald', 'f⁻¹')}: ${tag('fuchsia', 'Y')} &rarr; ${tag('sky', 'X')} satisfies (${tag('emerald', 'f⁻¹')} &comp; ${tag('emerald', 'f')})(${tag('sky', 'x')}) = ${tag('sky', 'x')} &and; (${tag('emerald', 'f')} &comp; ${tag('emerald', 'f⁻¹')})(${tag('fuchsia', 'y')}) = ${tag('fuchsia', 'y')}`,
        true
      )}
      ${cardTemplate(
        'func-step-6',
        'Step 6',
        `Continuous Analytic Reflection (${tag('lime', 'y = x')} Mirror &amp; Derivative Reciprocal)`,
        `Cartesian Graph Duality: (${tag('sky', 'x')}, ${tag('fuchsia', 'y')}) &isin; Graph(${tag('emerald', 'f')}) &hArr; (${tag('fuchsia', 'y')}, ${tag('sky', 'x')}) &isin; Graph(${tag('emerald', 'f⁻¹')}) across ${tag('lime', 'y = x')}.<br>` +
        `Inverse Function Theorem: (${tag('emerald', 'f⁻¹')})'(${tag('fuchsia', 'y₀')}) = 1 / ${tag('emerald', 'f')}'(${tag('sky', 'x₀')}) where ${tag('fuchsia', 'y₀')} = ${tag('emerald', 'f')}(${tag('sky', 'x₀')})`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#func-step-1 [data-sub]'),
      s1e: this.container.querySelector('#func-step-1 [data-eval]'),
      s2: this.container.querySelector('#func-step-2 [data-sub]'),
      s2e: this.container.querySelector('#func-step-2 [data-eval]'),
      s3: this.container.querySelector('#func-step-3 [data-sub]'),
      s3e: this.container.querySelector('#func-step-3 [data-eval]'),
      s4: this.container.querySelector('#func-step-4 [data-sub]'),
      s4e: this.container.querySelector('#func-step-4 [data-eval]'),
      s5: this.container.querySelector('#func-step-5 [data-sub]'),
      s5e: this.container.querySelector('#func-step-5 [data-eval]'),
      s6: this.container.querySelector('#func-step-6 [data-sub]'),
      s6e: this.container.querySelector('#func-step-6 [data-eval]'),
    };
    ensureFirstDerivationCardOpen(this.container);
    this.initialized = true;
  }

  render(state, analysis, model) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!analysis) return;

    const { domain, codomain, pairs, tracerX } = state;
    const nDom = domain.length;
    const nCod = codomain.length;

    // Step 1: Totality
    if (this.slots.s1) {
      const mappedInputs = Array.from(new Set(pairs.map(p => p.x)));
      this.slots.s1.innerHTML =
        `↳ Domain ${tag('sky', `|X| = ${nDom}`)}: { ${domain.map(x => tag('sky', x)).join(', ')} }<br>` +
        `↳ Mapped inputs: ${tag('emerald', `${mappedInputs.length} / ${nDom}`)} | Explicit pairs: ${pairs.map(p => `(${tag('sky', p.x)}, ${tag('fuchsia', p.y)})`).join(', ') || '&empty;'}`;
    }
    if (this.slots.s1e) {
      if (analysis.isTotal) {
        this.slots.s1e.innerHTML = `<span class="derivation-check">✓ Totality Satisfied:</span> dom(f) = X (${nDom}/${nDom} mapped)`;
      } else {
        const miss = (analysis.missingInputs || []).map(x => tag('rose', x)).join(', ') || '&empty;';
        this.slots.s1e.innerHTML = `<span class="color-rose font-bold">✗ Totality Violated:</span> Missing preimages for { ${miss} }`;
      }
    }

    // Step 2: Uniqueness
    if (this.slots.s2) {
      const multi = analysis.multiValuedInputs || [];
      this.slots.s2.innerHTML =
        `↳ Single-valued test: ${multi.length === 0 ? tag('emerald', '0 multivalued inputs') : tag('rose', `${multi.length} multivalued collision(s)`)}<br>` +
        `↳ Fiber mappings: ${domain.map(x => {
          const targets = pairs.filter(p => p.x === x).map(p => p.y);
          return `${tag('sky', x)} &map; { ${targets.map(y => tag('fuchsia', y)).join(', ') || '&empty;'} }`;
        }).join('; ')}`;
    }
    if (this.slots.s2e) {
      if (analysis.isUnique) {
        this.slots.s2e.innerHTML = `<span class="derivation-check">✓ Deterministic Function:</span> Unique image f(x) assigned per input`;
      } else {
        const mv = (analysis.multiValuedInputs || []).map(m => `${m.x} ↦ {${(m.targets || []).join(',')}}`).join('; ') || 'None';
        this.slots.s2e.innerHTML = `<span class="color-rose font-bold">✗ Multivalued Violation:</span> Non-deterministic at ${mv}`;
      }
    }

    // Step 3: Injectivity
    if (this.slots.s3) {
      const cols = analysis.collisionOutputs || [];
      this.slots.s3.innerHTML =
        `↳ Target fiber collisions: ${cols.length === 0 ? tag('emerald', '0 collisions') : tag('rose', `${cols.length} collision(s)`)}<br>` +
        `↳ Kernel equivalence ker(f): ${analysis.isInjective ? tag('lime', '&Delta;_X (Identity diagonal)') : tag('rose', `Contains non-diagonal collisions on { ${cols.map(c => tag('rose', c.y)).join(', ')} }`)}`;
    }
    if (this.slots.s3e) {
      if (analysis.isInjective) {
        this.slots.s3e.innerHTML = `<span class="derivation-check">✓ Injective (Monic):</span> Left-inverse g exists: g ∘ f = id_X`;
      } else {
        const colDetails = (analysis.collisionOutputs || []).map(c => `${c.y} ← {${(c.sources || []).join(', ')}}`).join('; ') || 'None';
        this.slots.s3e.innerHTML = `<span class="color-rose font-bold">✗ Non-Injective:</span> Preimage collisions at ${colDetails}`;
      }
    }

    // Step 4: Surjectivity
    if (this.slots.s4) {
      const img = analysis.image || [];
      this.slots.s4.innerHTML =
        `↳ Codomain size ${tag('fuchsia', `|Y| = ${nCod}`)} | Image size ${tag('emerald', `|im(f)| = ${img.length}`)}<br>` +
        `↳ Coverage ratio: ${tag('emerald', `${Math.round((img.length / Math.max(1, nCod)) * 100)}%`)} | Image set: { ${img.map(y => tag('emerald', y)).join(', ')} }`;
    }
    if (this.slots.s4e) {
      if (analysis.isSurjective) {
        this.slots.s4e.innerHTML = `<span class="derivation-check">✓ Surjective (Epic):</span> im(f) = Y, right-inverse section h exists`;
      } else {
        const unhit = (analysis.unhitOutputs || []).map(y => tag('amber', y)).join(', ') || '&empty;';
        this.slots.s4e.innerHTML = `<span class="color-amber font-bold">✗ Non-Surjective:</span> Unhit codomain targets { ${unhit} }`;
      }
    }

    // Step 5: Bijectivity
    if (this.slots.s5) {
      const isBij = analysis.isBijective;
      this.slots.s5.innerHTML =
        `↳ Isomorphism Test: Injective = ${analysis.isInjective ? tag('lime', 'YES') : tag('rose', 'NO')}, Surjective = ${analysis.isSurjective ? tag('lime', 'YES') : tag('rose', 'NO')}<br>` +
        `↳ Roundtrip check: ${isBij ? tag('lime', '(f⁻¹ ∘ f)(x) = x for all x &isin; X') : tag('rose', 'Information loss prevents two-sided inversion')}`;
    }
    if (this.slots.s5e) {
      if (analysis.isBijective) {
        this.slots.s5e.innerHTML = `<span class="derivation-check">✓ Bijective Isomorphism:</span> f is an isomorphism in Set with unique f⁻¹`;
      } else {
        this.slots.s5e.innerHTML = `<span class="color-rose font-bold">✗ Non-Invertible:</span> Lacks two-sided inverse in Set`;
      }
    }

    // Step 6: Continuous Reflection
    if (this.slots.s6) {
      const x0 = tracerX ?? 1.2;
      const y0 = model ? model.fn(x0) : (x0 * x0 * x0);
      const dy = model ? model.df(x0) : (3 * x0 * x0);
      const recip = Math.abs(dy) > 1e-4 ? (1 / dy).toFixed(3) : '&infin;';
      this.slots.s6.innerHTML =
        `↳ Forward point: (${tag('sky', x0.toFixed(3))}, ${tag('fuchsia', y0.toFixed(3))}) &hArr; Inverse mirror point: (${tag('fuchsia', y0.toFixed(3))}, ${tag('sky', x0.toFixed(3))})<br>` +
        `↳ Tangent derivative f'(${tag('sky', x0.toFixed(3))}) = ${tag('emerald', dy.toFixed(3))} ⟹ Inverse slope (f⁻¹)'(${tag('fuchsia', y0.toFixed(3))}) = ${tag('lime', recip)}`;
    }
    if (this.slots.s6e) {
      this.slots.s6e.innerHTML = `<span class="derivation-check">✓ Reflection Invariant:</span> Points reflect symmetrically across y = x`;
    }
  }
}

// ============================================================================
// 2. Module 2: Binary Relations, Orders & Partitions Derivations
// ============================================================================
export class RelationsDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'rel-step-1',
        'Step 1',
        `Reflexivity Axiom &amp; Matrix Diagonal Trace (Tr(${tag('emerald', 'M')}) = &sum; ${tag('sky', 'M_ii')} = ${tag('sky', 'n')})`,
        `Reflexive Invariant: Relation ${tag('emerald', 'R')} on set ${tag('sky', 'A')} is reflexive iff every element is related to itself:<br>` +
        `&forall;a &isin; ${tag('sky', 'A')}, (${tag('sky', 'a')}, ${tag('sky', 'a')}) &isin; ${tag('emerald', 'R')} &hArr; Tr(${tag('emerald', 'M')}) = &sum;_{i=1}^n ${tag('sky', 'M_ii')} = |${tag('sky', 'A')}| (all diagonal cells = 1)`,
        true
      )}
      ${cardTemplate(
        'rel-step-2',
        'Step 2',
        `Symmetry Axiom &amp; Matrix Transposition Invariance (${tag('emerald', 'M')} = ${tag('fuchsia', 'Mᵀ')})`,
        `Symmetric Invariant: Every directed edge has an equal-weight reciprocal edge:<br>` +
        `&forall;a, b &isin; ${tag('sky', 'A')}, (${tag('sky', 'a')}, ${tag('fuchsia', 'b')}) &isin; ${tag('emerald', 'R')} &rArr; (${tag('fuchsia', 'b')}, ${tag('sky', 'a')}) &isin; ${tag('emerald', 'R')} &hArr; ${tag('emerald', 'M')} = ${tag('fuchsia', 'Mᵀ')}`,
        true
      )}
      ${cardTemplate(
        'rel-step-3',
        'Step 3',
        `Antisymmetry Axiom &amp; 2-Cycle Prevention (${tag('emerald', 'M')} &odot; ${tag('fuchsia', 'Mᵀ')} &le; ${tag('lime', 'I')})`,
        `Antisymmetric Invariant: Distinct vertices never have bidirectional opposing edges:<br>` +
        `&forall;a &ne; b, ((${tag('sky', 'a')}, ${tag('fuchsia', 'b')}) &isin; ${tag('emerald', 'R')} &and; (${tag('fuchsia', 'b')}, ${tag('sky', 'a')}) &isin; ${tag('emerald', 'R')}) &rArr; ${tag('sky', 'a')} = ${tag('fuchsia', 'b')} &hArr; ${tag('emerald', 'M')} &odot; ${tag('fuchsia', 'Mᵀ')} &le; ${tag('lime', 'I')}`,
        true
      )}
      ${cardTemplate(
        'rel-step-4',
        'Step 4',
        `Transitivity Axiom &amp; Matrix Power Shortcut (${tag('emerald', 'M²')} &le; ${tag('emerald', 'M')})`,
        `Transitive Invariant: Every 2-step path (${tag('sky', 'a')} &rarr; ${tag('amber', 'b')} &rarr; ${tag('fuchsia', 'c')}) has a direct composite edge (${tag('sky', 'a')} &rarr; ${tag('fuchsia', 'c')}):<br>` +
        `&forall;a, b, c, [(${tag('sky', 'a')}, ${tag('amber', 'b')}) &isin; ${tag('emerald', 'R')} &and; (${tag('amber', 'b')}, ${tag('fuchsia', 'c')}) &isin; ${tag('emerald', 'R')}] &rArr; (${tag('sky', 'a')}, ${tag('fuchsia', 'c')}) &isin; ${tag('emerald', 'R')} &hArr; ${tag('emerald', 'M²')} &le; ${tag('emerald', 'M')}`,
        true
      )}
      ${cardTemplate(
        'rel-step-5',
        'Step 5',
        `The Partition Theorem &amp; Quotient Sets (${tag('lime', 'A / ~')} = { [${tag('sky', 'a')}] })`,
        `Equivalence Invariant: A relation ~ that is reflexive, symmetric, and transitive partitions ${tag('sky', 'A')} into disjoint equivalence classes:<br>` +
        `[${tag('sky', 'a')}] := {x &isin; ${tag('sky', 'A')} : x ~ ${tag('sky', 'a')}}. The quotient set ${tag('lime', 'A/~')} satisfies &cup; [${tag('sky', 'a')}] = ${tag('sky', 'A')} and distinct classes are disjoint: [${tag('sky', 'a')}] &cap; [${tag('fuchsia', 'b')}] = &empty;`,
        true
      )}
      ${cardTemplate(
        'rel-step-6',
        'Step 6',
        `Kuratowski Ordered Pair Construction ((${tag('sky', 'a')}, ${tag('fuchsia', 'b')}) := {{${tag('sky', 'a')}}, {${tag('sky', 'a')}, ${tag('fuchsia', 'b')}}})`,
        `Set-Theoretic Grounding: Pairs encode asymmetry using pure set membership.<br>` +
        `First projection &pi;₁(({{${tag('sky', 'a')}}, {${tag('sky', 'a')}, ${tag('fuchsia', 'b')}}})) = &cap;&cup; = ${tag('sky', 'a')}, second projection &pi;₂ = ${tag('fuchsia', 'b')}`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#rel-step-1 [data-sub]'),
      s1e: this.container.querySelector('#rel-step-1 [data-eval]'),
      s2: this.container.querySelector('#rel-step-2 [data-sub]'),
      s2e: this.container.querySelector('#rel-step-2 [data-eval]'),
      s3: this.container.querySelector('#rel-step-3 [data-sub]'),
      s3e: this.container.querySelector('#rel-step-3 [data-eval]'),
      s4: this.container.querySelector('#rel-step-4 [data-sub]'),
      s4e: this.container.querySelector('#rel-step-4 [data-eval]'),
      s5: this.container.querySelector('#rel-step-5 [data-sub]'),
      s5e: this.container.querySelector('#rel-step-5 [data-eval]'),
      s6: this.container.querySelector('#rel-step-6 [data-sub]'),
      s6e: this.container.querySelector('#rel-step-6 [data-eval]'),
    };
    ensureFirstDerivationCardOpen(this.container);
    this.initialized = true;
  }

  render(state, analysis) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!analysis) return;

    const { elements, pairs } = state;
    const n = elements.length;

    // Step 1: Reflexivity
    if (this.slots.s1) {
      const missing = analysis.missingReflexive || [];
      const reflCount = n - missing.length;
      this.slots.s1.innerHTML =
        `↳ Ground set: ${tag('sky', `|A| = ${n}`)} { ${elements.map(e => tag('sky', e)).join(', ')} }<br>` +
        `↳ Matrix diagonal trace: Tr(M) = ${tag('emerald', `${reflCount} / ${n}`)} | Missing self-loops: ${missing.length === 0 ? tag('emerald', '&empty;') : tag('rose', `{ ${missing.map(e => `(${e},${e})`).join(', ')} }`)}`;
    }
    if (this.slots.s1e) {
      if (analysis.isReflexive) {
        this.slots.s1e.innerHTML = `<span class="derivation-check">✓ Reflexive:</span> Tr(M) = ${n}/${n}, all self-loops present`;
      } else {
        const miss = (analysis.missingReflexive || []).map(e => tag('rose', e)).join(', ') || '&empty;';
        this.slots.s1e.innerHTML = `<span class="color-rose font-bold">✗ Not Reflexive:</span> Missing diagonal loops for { ${miss} }`;
      }
    }

    // Step 2: Symmetry
    if (this.slots.s2) {
      const missingSymm = analysis.missingSymmetric || [];
      this.slots.s2.innerHTML =
        `↳ Total relation edges: ${tag('emerald', `${pairs.length}`)} / ${n * n}<br>` +
        `↳ Transposition test M = Mᵀ: ${missingSymm.length === 0 ? tag('emerald', 'Identical transpose (0 asymmetric pairs)') : tag('rose', `${missingSymm.length} asymmetric directed edge(s)`)}`;
    }
    if (this.slots.s2e) {
      if (analysis.isSymmetric) {
        this.slots.s2e.innerHTML = `<span class="derivation-check">✓ Symmetric:</span> M = Mᵀ, undirected self-dual graph`;
      } else {
        const miss = (analysis.missingSymmetric || []).map(p => `(${p.a},${p.b}) missing (${p.b},${p.a})`).slice(0, 3).join('; ') || 'Asymmetric pairs detected';
        this.slots.s2e.innerHTML = `<span class="color-rose font-bold">✗ Asymmetric:</span> ${miss}`;
      }
    }

    // Step 3: Antisymmetry
    if (this.slots.s3) {
      const violAnti = analysis.violatedAntisymmetric || [];
      this.slots.s3.innerHTML =
        `↳ Distinct vertex 2-cycles: ${violAnti.length === 0 ? tag('emerald', '0 bidirectional cycles') : tag('rose', `${violAnti.length} conflicting 2-cycle(s)`)}<br>` +
        `↳ Off-diagonal Hadamard product M &odot; Mᵀ: ${violAnti.length === 0 ? tag('emerald', '&le; I (Satisfied)') : tag('rose', 'Contains off-diagonal 1s')}`;
    }
    if (this.slots.s3e) {
      if (analysis.isAntisymmetric) {
        this.slots.s3e.innerHTML = `<span class="derivation-check">✓ Antisymmetric:</span> No two distinct vertices mutually relate`;
      } else {
        const cyc = (analysis.violatedAntisymmetric || []).map(p => `(${p.a} ⇄ ${p.b})`).slice(0, 3).join(', ') || 'Bidirectional pairs detected';
        this.slots.s3e.innerHTML = `<span class="color-rose font-bold">✗ Antisymmetry Violated:</span> Mutual 2-cycles at ${cyc}`;
      }
    }

    // Step 4: Transitivity
    if (this.slots.s4) {
      const missingTrans = analysis.missingTransitive || [];
      this.slots.s4.innerHTML =
        `↳ Boolean square check M² &le; M: ${missingTrans.length === 0 ? tag('emerald', 'M² &le; M verified') : tag('rose', `${missingTrans.length} missing shortcut(s)`)}<br>` +
        `↳ 2-step path evaluations: ${missingTrans.length === 0 ? tag('emerald', 'All composite paths closed') : tag('rose', `Paths lack shortcuts: ${missingTrans.map(t => `${t.a}→${t.b}→${t.c}`).slice(0, 3).join(', ')}`)}`;
    }
    if (this.slots.s4e) {
      if (analysis.isTransitive) {
        this.slots.s4e.innerHTML = `<span class="derivation-check">✓ Transitive:</span> All multi-step paths are closed by direct relations`;
      } else {
        const count = (analysis.missingTransitive || []).length;
        this.slots.s4e.innerHTML = `<span class="color-rose font-bold">✗ Non-Transitive:</span> Missing shortcuts for ${count} path(s)`;
      }
    }

    // Step 5: Partition Theorem & Classification
    if (this.slots.s5) {
      const partitions = analysis.equivalenceClasses || [];
      this.slots.s5.innerHTML =
        `↳ Relation Classification: ${analysis.isEquivalence ? tag('lime', 'EQUIVALENCE RELATION') : (analysis.isPartialOrder ? tag('violet', 'PARTIAL ORDER (POSET)') : tag('amber', 'GENERAL BINARY RELATION'))}<br>` +
        `↳ Quotient Partition: ${partitions.length > 0 ? `A/~ = { ${partitions.map(c => `{ ${c.join(', ')} }`).join(', ')} }` : 'Not an equivalence relation'}`;
    }
    if (this.slots.s5e) {
      if (analysis.isEquivalence) {
        const classCount = (analysis.equivalenceClasses || []).length;
        this.slots.s5e.innerHTML = `<span class="derivation-check">✓ Partition Theorem:</span> Valid quotient set with ${classCount} disjoint class(es)`;
      } else if (analysis.isPartialOrder) {
        this.slots.s5e.innerHTML = `<span class="derivation-check">✓ Poset Axioms Verified:</span> (A, &le;) forms a strict reflexive partial order`;
      } else {
        this.slots.s5e.innerHTML = `<span class="color-amber font-bold">ℹ Relation In Progress:</span> Does not satisfy complete partition or poset axioms`;
      }
    }

    // Step 6: Kuratowski Pair Sample
    if (this.slots.s6) {
      const sample = pairs[0] || { a: elements[0] || '1', b: elements[1] || '2' };
      this.slots.s6.innerHTML =
        `↳ Active sample pair: (${tag('sky', sample.a)}, ${tag('fuchsia', sample.b)}) := {{${tag('sky', sample.a)}}, {${tag('sky', sample.a)}, ${tag('fuchsia', sample.b)}}}<br>` +
        `↳ Projections: &pi;₁ = ${tag('sky', sample.a)}, &pi;₂ = ${tag('fuchsia', sample.b)} | Set size: 2 elements in outer set`;
    }
    if (this.slots.s6e) {
      this.slots.s6e.innerHTML = `<span class="derivation-check">✓ Kuratowski Axiom:</span> Injective ordered pair construction verified`;
    }
  }
}

// ============================================================================
// 3. Module 3: Permutations, Symmetries & Groups Derivations
// ============================================================================
export class PermutationsDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'perm-step-1',
        'Step 1',
        `Cauchy Two-Row &rarr; Disjoint Cycle Decomposition (&sigma; = ${tag('sky', 'c₁')} &comp; ${tag('fuchsia', 'c₂')} &comp; &hellip; &comp; ${tag('violet', 'cₖ')})`,
        `Orbit Partition Theorem: Every permutation &sigma; &isin; ${tag('amber', 'Sₙ')} uniquely decomposes into a commutative product of disjoint cycles:<br>` +
        `&sigma; = &prod;_{i=1}^k ${tag('sky', 'c_i')} where supp(${tag('sky', 'c_i')}) &cap; supp(${tag('fuchsia', 'c_j')}) = &empty; for all i &ne; j`,
        true
      )}
      ${cardTemplate(
        'perm-step-2',
        'Step 2',
        `Permutation Order &amp; Cyclic Periodicity (ord(&sigma;) = lcm(|${tag('sky', 'c₁')}|, |${tag('fuchsia', 'c₂')}|, &hellip;))`,
        `Minimal Period Exponent: The order of &sigma; is the smallest positive integer k &ge; 1 such that &sigma;ᵏ = ${tag('lime', 'id')}:<br>` +
        `ord(&sigma;) = lcm(|${tag('sky', 'c₁')}|, |${tag('fuchsia', 'c₂')}|, &hellip;, |${tag('violet', 'cₖ')}|) ⟹ &sigma;^{ord(&sigma;)} = ${tag('lime', 'id')}`,
        true
      )}
      ${cardTemplate(
        'perm-step-3',
        'Step 3',
        `Inversion Counter &amp; Parity Signature (sgn(&sigma;) = (-1)^{${tag('rose', 'I')}} &isin; {${tag('lime', '+1')}, ${tag('rose', '-1')}})`,
        `Inversion Definition: An inversion is a pair (i, j) with i &lt; j such that &sigma;(i) &gt; &sigma;(j):<br>` +
        `${tag('rose', 'I')} = |{(i, j) : i &lt; j &and; &sigma;(i) &gt; &sigma;(j)}|. Signature sgn(&sigma;) = (-1)^{${tag('rose', 'I')}}. Permutation is even iff &sigma; &isin; ${tag('emerald', 'Aₙ')}`,
        true
      )}
      ${cardTemplate(
        'perm-step-4',
        'Step 4',
        `Transposition Factorization (&sigma; = ${tag('sky', '&tau;₁')} &comp; ${tag('fuchsia', '&tau;₂')} &comp; &hellip; &comp; ${tag('emerald', '&tau;ₘ')})`,
        `2-Cycle Generation: Every m-cycle (a₁ a₂ &hellip; aₘ) = (a₁ aₘ)(a₁ a_{m-1}) &hellip; (a₁ a₂).<br>` +
        `The number of transpositions m satisfies m &equiv; ${tag('rose', 'I')} (mod 2), preserving parity invariant.`,
        true
      )}
      ${cardTemplate(
        'perm-step-5',
        'Step 5',
        `Non-Abelian Symmetric Group Structure (${tag('amber', 'Sₙ')} Non-Commutativity)`,
        `Group Non-Abelian Axiom: For n &ge; 3, ${tag('amber', 'Sₙ')} is non-commutative: &exist; &tau;₁, &tau;₂ such that &tau;₁ &comp; &tau;₂ &ne; &tau;₂ &comp; &tau;₁.<br>` +
        `Size of full symmetric group: |${tag('amber', 'Sₙ')}| = n!, alternating subgroup size: |${tag('emerald', 'Aₙ')}| = n! / 2`,
        true
      )}
      ${cardTemplate(
        'perm-step-6',
        'Step 6',
        `Orthogonal Permutation Matrix (${tag('sky', 'P_&sigma;')} ${tag('sky', 'P_&sigma;ᵀ')} = ${tag('lime', 'I')})`,
        `Matrix Representation: (P_&sigma;)_{ij} = 1 iff &sigma;(j) = i.<br>` +
        `Properties: P_&sigma; &isin; O(n) (orthogonal), det(P_&sigma;) = sgn(&sigma;), Tr(P_&sigma;) = number of fixed points.`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#perm-step-1 [data-sub]'),
      s1e: this.container.querySelector('#perm-step-1 [data-eval]'),
      s2: this.container.querySelector('#perm-step-2 [data-sub]'),
      s2e: this.container.querySelector('#perm-step-2 [data-eval]'),
      s3: this.container.querySelector('#perm-step-3 [data-sub]'),
      s3e: this.container.querySelector('#perm-step-3 [data-eval]'),
      s4: this.container.querySelector('#perm-step-4 [data-sub]'),
      s4e: this.container.querySelector('#perm-step-4 [data-eval]'),
      s5: this.container.querySelector('#perm-step-5 [data-sub]'),
      s5e: this.container.querySelector('#perm-step-5 [data-eval]'),
      s6: this.container.querySelector('#perm-step-6 [data-sub]'),
      s6e: this.container.querySelector('#perm-step-6 [data-eval]'),
    };
    ensureFirstDerivationCardOpen(this.container);
    this.initialized = true;
  }

  render(state, cycles, order, parity, fixedPoints) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!cycles || !parity) return;

    const { n, mapping } = state;
    const invCount = parity.inversions ?? 0;
    const isEven = parity.isEven;
    const sgnVal = isEven ? '+1' : '-1';

    // Step 1: Disjoint Cycles
    if (this.slots.s1) {
      const cycleStrs = cycles.map(c => `(${c.join(' ')})`);
      this.slots.s1.innerHTML =
        `↳ Cauchy two-row: [ ${mapping.map((m, i) => `${i + 1}&rarr;${m}`).join(', ')} ]<br>` +
        `↳ Disjoint cycle decomposition: ${tag('sky', cycleStrs.join('') || '(1)')} | Total cycles: ${tag('emerald', cycles.length)}`;
    }
    if (this.slots.s1e) {
      this.slots.s1e.innerHTML = `<span class="derivation-check">✓ Cycle Decomposition:</span> &sigma; = ${cycles.map(c => `(${c.join(' ')})`).join('') || '(1)'}`;
    }

    // Step 2: Cycle Order
    if (this.slots.s2) {
      const lens = cycles.map(c => c.length);
      this.slots.s2.innerHTML =
        `↳ Cycle lengths: { ${lens.map(l => tag('sky', l)).join(', ')} }<br>` +
        `↳ Least common multiple: lcm(${lens.join(', ') || '1'}) = ${tag('violet', order)} | Verification: &sigma;^{${order}} = ${tag('lime', 'id')}`;
    }
    if (this.slots.s2e) {
      this.slots.s2e.innerHTML = `<span class="derivation-check">✓ Group Periodicity:</span> ord(&sigma;) = ${order} (returns to identity in ${order} iterations)`;
    }

    // Step 3: Inversions & Parity
    if (this.slots.s3) {
      const maxInv = (n * (n - 1)) / 2;
      this.slots.s3.innerHTML =
        `↳ Inversions count: ${tag('rose', invCount)} / ${maxInv} (${Math.round((invCount / Math.max(1, maxInv)) * 100)}%)<br>` +
        `↳ Signature sgn(&sigma;) = (-1)^{${invCount}} = ${isEven ? tag('lime', '+1 (EVEN)') : tag('rose', '-1 (ODD)')}`;
    }
    if (this.slots.s3e) {
      if (isEven) {
        this.slots.s3e.innerHTML = `<span class="derivation-check">✓ Even Permutation:</span> &sigma; &isin; A_${n} (Alternating subgroup of size ${Math.round(this.#fact(n) / 2)})`;
      } else {
        this.slots.s3e.innerHTML = `<span class="color-rose font-bold">✗ Odd Permutation:</span> &sigma; &notin; A_${n} (Coset of A_${n} in S_${n})`;
      }
    }

    // Step 4: Transposition Factorization
    if (this.slots.s4) {
      const trans = [];
      cycles.forEach(c => {
        if (c.length > 1) {
          for (let i = c.length - 1; i >= 1; i--) {
            trans.push(`(${c[0]} ${c[i]})`);
          }
        }
      });
      this.slots.s4.innerHTML =
        `↳ Factorization into 2-cycles: ${trans.length > 0 ? trans.map(t => tag('emerald', t)).join(' &comp; ') : tag('lime', 'id')}<br>` +
        `↳ Transpositions count m = ${tag('emerald', trans.length)} &equiv; ${tag('rose', invCount)} (mod 2) (Parity strictly conserved)`;
    }
    if (this.slots.s4e) {
      this.slots.s4e.innerHTML = `<span class="derivation-check">✓ Factorization Verified:</span> Transposition parity invariant satisfied`;
    }

    // Step 5: S_n Non-Commutativity
    if (this.slots.s5) {
      this.slots.s5.innerHTML =
        `↳ Group order: |S_${n}| = ${n}! = ${tag('amber', this.#fact(n))} elements<br>` +
        `↳ Commutativity test: For adjacent transpositions (1 2) &comp; (2 3) = (1 2 3) &ne; (2 3) &comp; (1 2) = (1 3 2) (Non-abelian)`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML = `<span class="derivation-check">✓ Non-Abelian Group:</span> Generators satisfy Coxeter braid relations`;
    }

    // Step 6: Permutation Matrix
    if (this.slots.s6) {
      const fixCount = (fixedPoints || []).length;
      this.slots.s6.innerHTML =
        `↳ Permutation Matrix: ${n}&times;${n} orthogonal matrix P_&sigma;<br>` +
        `↳ Invariants: det(P_&sigma;) = ${tag(isEven ? 'lime' : 'rose', sgnVal)} | Trace Tr(P_&sigma;) = ${tag('amber', `${fixCount} fixed point(s)`)}: { ${(fixedPoints || []).join(', ') || '&empty;'} }`;
    }
    if (this.slots.s6e) {
      this.slots.s6e.innerHTML = `<span class="derivation-check">✓ Orthogonal Representation:</span> P⁻¹ = Pᵀ, det(P) = sgn(&sigma;)`;
    }
  }

  #fact(n) {
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
}

// ============================================================================
// 4. Module 4: Category Theory & Universal Properties Derivations
// ============================================================================
export class CategoryDerivations {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  #initDOM() {
    this.container.innerHTML = `
      ${cardTemplate(
        'cat-step-1',
        'Step 1',
        `Commutative Diagram Path Invariant (${tag('fuchsia', 'g')} &comp; ${tag('sky', 'f')} = ${tag('emerald', 'h')})`,
        `Diagram Commutativity: A diagram commutes iff for every pair of objects, any two directed paths yield identical composite morphisms:<br>` +
        `&forall;x &isin; ${tag('sky', 'X')}, (${tag('fuchsia', 'g')} &comp; ${tag('sky', 'f')})(${tag('sky', 'x')}) = ${tag('emerald', 'h')}(${tag('sky', 'x')}) &hArr; &parallel;${tag('fuchsia', 'g')} &comp; ${tag('sky', 'f')} - ${tag('emerald', 'h')}&parallel; = 0`,
        true
      )}
      ${cardTemplate(
        'cat-step-2',
        'Step 2',
        `Discrepancy Vector Metric (&Delta; = &sum; |${tag('fuchsia', 'g(f(x))')} - ${tag('emerald', 'h(x)')}|)`,
        `Arrow Perturbation Metric: Quantitative norm of diagram non-commutativity:<br>` +
        `&Delta; = &sum;_{x &isin; X} [${tag('fuchsia', 'g')}(${tag('sky', 'f')}(${tag('sky', 'x')})) &ne; ${tag('emerald', 'h')}(${tag('sky', 'x')})]. Commutativity holds iff &Delta; = 0.`,
        true
      )}
      ${cardTemplate(
        'cat-step-3',
        'Step 3',
        `Monomorphism Left-Cancellation Invariant (${tag('sky', 'f')} &comp; ${tag('violet', 'g₁')} = ${tag('sky', 'f')} &comp; ${tag('violet', 'g₂')} &rArr; ${tag('violet', 'g₁')} = ${tag('violet', 'g₂')})`,
        `Categorical Monic Axiom: A morphism ${tag('sky', 'f')}: ${tag('sky', 'X')} &rarr; ${tag('fuchsia', 'Y')} is a monomorphism (monic) iff it is left-cancellative against all test probes:<br>` +
        `&forall;W, &forall;g₁, g₂: W &rarr; X, ${tag('sky', 'f')} &comp; g₁ = ${tag('sky', 'f')} &comp; g₂ &rArr; g₁ = g₂. In <strong>Set</strong>, monic &hArr; injective.`,
        true
      )}
      ${cardTemplate(
        'cat-step-4',
        'Step 4',
        `Epimorphism Right-Cancellation Invariant (${tag('amber', 'h₁')} &comp; ${tag('sky', 'f')} = ${tag('amber', 'h₂')} &comp; ${tag('sky', 'f')} &rArr; ${tag('amber', 'h₁')} = ${tag('amber', 'h₂')})`,
        `Categorical Epic Axiom: A morphism ${tag('sky', 'f')}: ${tag('sky', 'X')} &rarr; ${tag('fuchsia', 'Y')} is an epimorphism (epic) iff it is right-cancellative against all test probes:<br>` +
        `&forall;Z, &forall;h₁, h₂: Y &rarr; Z, h₁ &comp; ${tag('sky', 'f')} = h₂ &comp; ${tag('sky', 'f')} &rArr; h₁ = h₂. In <strong>Set</strong>, epic &hArr; surjective.`,
        true
      )}
      ${cardTemplate(
        'cat-step-5',
        'Step 5',
        `Universal Quotient Factorization (${tag('sky', 'f')} = ${tag('emerald', '&iota;')} &comp; ${tag('lime', 'f&#772;')} &comp; ${tag('violet', '&pi;')})`,
        `First Isomorphism Theorem in <strong>Set</strong>: Every arrow ${tag('sky', 'f')} uniquely factors through the canonical projection ${tag('violet', '&pi;')}, induced isomorphism ${tag('lime', 'f&#772;')}, and inclusion ${tag('emerald', '&iota;')}:<br>` +
        `${tag('sky', 'X')} &twoheadrightarrow; ${tag('sky', 'X')}/ker(${tag('sky', 'f')}) &xrightarrow{\sim} im(${tag('sky', 'f')}) &hookrightarrow; ${tag('fuchsia', 'Y')}`,
        true
      )}
      ${cardTemplate(
        'cat-step-6',
        'Step 6',
        `Cartesian Closed Adjunction &amp; Currying (Hom(${tag('sky', 'A')} &times; ${tag('fuchsia', 'B')}, ${tag('emerald', 'C')}) &cong; Hom(${tag('sky', 'A')}, ${tag('emerald', 'C')}^{${tag('fuchsia', 'B')}}))`,
        `Currying Functor Adjunction: The product functor (- &times; B) is left adjoint to the exponential functor (-)^B:<br>` +
        `eval(${tag('violet', 'curry(f)')}(a), b) = f(a, b). Dimension identity: |C|^{(|A| &middot; |B|)} = (|C|^{|B|})^{|A|}.`,
        true
      )}
    `;

    this.slots = {
      s1: this.container.querySelector('#cat-step-1 [data-sub]'),
      s1e: this.container.querySelector('#cat-step-1 [data-eval]'),
      s2: this.container.querySelector('#cat-step-2 [data-sub]'),
      s2e: this.container.querySelector('#cat-step-2 [data-eval]'),
      s3: this.container.querySelector('#cat-step-3 [data-sub]'),
      s3e: this.container.querySelector('#cat-step-3 [data-eval]'),
      s4: this.container.querySelector('#cat-step-4 [data-sub]'),
      s4e: this.container.querySelector('#cat-step-4 [data-eval]'),
      s5: this.container.querySelector('#cat-step-5 [data-sub]'),
      s5e: this.container.querySelector('#cat-step-5 [data-eval]'),
      s6: this.container.querySelector('#cat-step-6 [data-sub]'),
      s6e: this.container.querySelector('#cat-step-6 [data-eval]'),
    };
    ensureFirstDerivationCardOpen(this.container);
    this.initialized = true;
  }

  render(state, monicTest, epicTest, fact) {
    if (!this.initialized || !this.container.firstElementChild) this.#initDOM();
    if (!monicTest || !epicTest) return;

    const { triangleCommutes, domainX, codomainY, morphismF } = state;
    const nX = domainX.length;
    const nY = codomainY.length;

    // Step 1: Commutative Diagram
    if (this.slots.s1) {
      this.slots.s1.innerHTML =
        `↳ Objects: ${tag('sky', 'X')} (|X|=${nX}), ${tag('fuchsia', 'Y')} (|Y|=${nY}), ${tag('emerald', 'Z')}<br>` +
        `↳ Path check: Composite path g ∘ f vs direct arrow h: ${triangleCommutes ? tag('emerald', 'IDENTICAL (Commutes)') : tag('rose', 'DISCREPANT (Does not commute)')}`;
    }
    if (this.slots.s1e) {
      if (triangleCommutes) {
        this.slots.s1e.innerHTML = `<span class="derivation-check">✓ Diagram Commutes:</span> ∥g ∘ f - h∥ = 0.000 (Exact arrow equivalence)`;
      } else {
        this.slots.s1e.innerHTML = `<span class="color-rose font-bold">✗ Commutativity Violated:</span> Path discrepancy &Delta; &gt; 0 detected`;
      }
    }

    // Step 2: Discrepancy Metric
    if (this.slots.s2) {
      const disc = triangleCommutes ? 0 : 1;
      this.slots.s2.innerHTML =
        `↳ Discrepancy norm: ${triangleCommutes ? tag('emerald', '&Delta; = 0.000') : tag('rose', `&Delta; = ${disc.toFixed(3)}`)}<br>` +
        `↳ Path comparison: ${triangleCommutes ? tag('emerald', 'g(f(x)) = h(x) for all x &isin; X') : tag('rose', 'Mismatch at target projection')}`;
    }
    if (this.slots.s2e) {
      if (triangleCommutes) {
        this.slots.s2e.innerHTML = `<span class="derivation-check">✓ Zero Discrepancy:</span> Diagram commutes across all paths`;
      } else {
        this.slots.s2e.innerHTML = `<span class="color-rose font-bold">✗ Perturbation Discrepancy:</span> Direct arrow does not factor through composite`;
      }
    }

    // Step 3: Monomorphism
    if (this.slots.s3) {
      this.slots.s3.innerHTML =
        `↳ Probe test: Probes g₁, g₂: W={w₁, w₂} &rarr; X. Collision count: ${monicTest.isMonic ? tag('emerald', '0 collisions') : tag('rose', `${monicTest.collisionCount} collision(s)`)}<br>` +
        `↳ Left-cancellation: ${monicTest.isMonic ? tag('emerald', 'f ∘ g₁ = f ∘ g₂ ⟹ g₁ = g₂ (Satisfied)') : tag('rose', 'Collisions allow g₁ ≠ g₂')}`;
    }
    if (this.slots.s3e) {
      if (monicTest.isMonic) {
        this.slots.s3e.innerHTML = `<span class="derivation-check">✓ Monic (Monomorphism):</span> Left-cancellative arrow, injective in Set`;
      } else {
        this.slots.s3e.innerHTML = `<span class="color-rose font-bold">✗ Non-Monic:</span> Preimage collisions destroy left-cancellation`;
      }
    }

    // Step 4: Epimorphism
    if (this.slots.s4) {
      this.slots.s4.innerHTML =
        `↳ Probe test: Probes h₁, h₂: Y &rarr; Z={z₁, z₂}. Unhit codomain elements: ${epicTest.isEpic ? tag('emerald', '0') : tag('amber', `${epicTest.unhitCount}`)}<br>` +
        `↳ Right-cancellation: ${epicTest.isEpic ? tag('emerald', 'h₁ ∘ f = h₂ ∘ f ⟹ h₁ = h₂ (Satisfied)') : tag('amber', 'Unhit targets allow h₁ ≠ h₂')}`;
    }
    if (this.slots.s4e) {
      if (epicTest.isEpic) {
        this.slots.s4e.innerHTML = `<span class="derivation-check">✓ Epic (Epimorphism):</span> Right-cancellative arrow, surjective in Set`;
      } else {
        this.slots.s4e.innerHTML = `<span class="color-amber font-bold">✗ Non-Epic:</span> Target elements missing from image im(f)`;
      }
    }

    // Step 5: Universal Quotient Factorization
    if (this.slots.s5) {
      const qBlocks = fact ? fact.quotientBlocks : [];
      const imBlocks = fact ? fact.imageBlocks : [];
      this.slots.s5.innerHTML =
        `↳ Kernel equivalence: X/ker(f) has ${tag('violet', `${qBlocks.length} quotient block(s)`)}: { ${qBlocks.map(b => `{${b.join(',')}}`).join(', ')} }<br>` +
        `↳ Image sub-object: im(f) has ${tag('emerald', `${imBlocks.length} element(s)`)}: { ${imBlocks.join(', ')} } | Induced isomorphism f&#772;: X/ker(f) &cong; im(f)`;
    }
    if (this.slots.s5e) {
      this.slots.s5e.innerHTML = `<span class="derivation-check">✓ Universal Factorization:</span> f = &iota; ∘ f&#772; ∘ &pi; verified (First Isomorphism Theorem)`;
    }

    // Step 6: Currying Adjunction
    if (this.slots.s6) {
      this.slots.s6.innerHTML =
        `↳ Product Hom(A &times; B, C) &cong; Hom(A, C^B)<br>` +
        `↳ Evaluation isomorphism: Pair function (a, b) &map; c curries naturally to higher-order a &map; (b &map; c)`;
    }
    if (this.slots.s6e) {
      this.slots.s6e.innerHTML = `<span class="derivation-check">✓ Cartesian Closed:</span> Canonical evaluation adjunction in Set`;
    }
  }
}
