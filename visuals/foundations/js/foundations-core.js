/**
 * Foundations Core Engine — Abstract Mathematics & Foundations
 * Visual Mathematics Lab
 * 
 * Implements axiomatic first-principles algorithms for:
 * 1. Functions, Bijectivity, Inverses & Composition (Module 1)
 * 2. Binary Relations, Equivalence Classes & Posets (Module 2)
 * 3. Permutations, Symmetric Groups S_n & Cycle Decompositions (Module 3)
 * 4. Categorical Morphisms, Commutative Diagrams & Probe Tests (Module 4)
 * 
 * Zero external dependencies. Pure deterministic mathematical functions.
 */

// ============================================================================
// 1. SETS & TUPLES (Kuratowski First Principles)
// ============================================================================

export class SetMath {
  /**
   * Kuratowski ordered pair representation: (a, b) := {{a}, {a, b}}
   */
  static kuratowskiPair(a, b) {
    return [[a], [a, b]];
  }

  /**
   * Cartesian product A x B
   */
  static cartesianProduct(setA, setB) {
    const product = [];
    for (const a of setA) {
      for (const b of setB) {
        product.push([a, b]);
      }
    }
    return product;
  }

  /**
   * Power set P(S)
   */
  static powerSet(set) {
    let result = [[]];
    for (const elem of set) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push([...result[i], elem]);
      }
    }
    return result;
  }

  /**
   * Check set equality (extensionality)
   */
  static areSetsEqual(setA, setB) {
    if (setA.length !== setB.length) return false;
    const sB = new Set(setB);
    return setA.every((x) => sB.has(x));
  }
}

// ============================================================================
// 2. FUNCTIONS, INVERSES & COMPOSITION (Module 1)
// ============================================================================

export class FunctionMath {
  /**
   * Validates if a binary relation R ⊆ X × Y is a well-defined function f: X -> Y.
   * Condition 1: Left-Totality (∀x ∈ X, ∃y ∈ Y: (x, y) ∈ f)
   * Condition 2: Right-Uniqueness (∀x ∈ X, if (x, y1) ∈ f and (x, y2) ∈ f, then y1 = y2)
   * 
   * @param {Array<any>} domain - Set X
   * @param {Array<any>} codomain - Set Y
   * @param {Array<[any, any]>} pairs - Relation pairs (x, y)
   * @returns {Object} validation report
   */
  static analyzeRelationAsFunction(domain, codomain, pairs) {
    const codomainSet = new Set(codomain);
    const domainMap = new Map(); // x -> array of y's
    const outOfCodomain = [];

    for (const x of domain) {
      domainMap.set(x, []);
    }

    for (const [x, y] of pairs) {
      if (!codomainSet.has(y)) {
        outOfCodomain.push([x, y]);
      }
      if (!domainMap.has(x)) {
        domainMap.set(x, []);
      }
      domainMap.get(x).push(y);
    }

    const missingInputs = []; // Fails totality (partial function)
    const multiValuedInputs = []; // Fails uniqueness (multivalued)

    for (const [x, outputs] of domainMap.entries()) {
      if (outputs.length === 0) {
        missingInputs.push(x);
      } else if (outputs.length > 1) {
        multiValuedInputs.push({ x, outputs });
      }
    }

    const isTotal = missingInputs.length === 0;
    const isUnique = multiValuedInputs.length === 0;
    const isWellDefined = isTotal && isUnique && outOfCodomain.length === 0;

    // If well-defined function, analyze injectivity and surjectivity
    const imageMap = new Map(); // y -> array of x's
    for (const y of codomain) {
      imageMap.set(y, []);
    }

    if (isWellDefined) {
      for (const [x, y] of pairs) {
        if (!imageMap.has(y)) imageMap.set(y, []);
        imageMap.get(y).push(x);
      }
    }

    const collisionOutputs = []; // Fails injectivity: multiple x map to same y
    const unhitOutputs = []; // Fails surjectivity: y has 0 preimages

    for (const [y, inputs] of imageMap.entries()) {
      if (inputs.length > 1) {
        collisionOutputs.push({ y, inputs });
      } else if (inputs.length === 0) {
        unhitOutputs.push(y);
      }
    }

    const isInjective = isWellDefined && collisionOutputs.length === 0;
    const isSurjective = isWellDefined && unhitOutputs.length === 0;
    const isBijective = isInjective && isSurjective;

    return {
      isFunction: isWellDefined,
      isTotal,
      isUnique,
      missingInputs,
      multiValuedInputs,
      outOfCodomain,
      isInjective,
      collisionOutputs,
      isSurjective,
      unhitOutputs,
      isBijective,
      image: Array.from(imageMap.entries())
        .filter(([, inputs]) => inputs.length > 0)
        .map(([y]) => y)
    };
  }

  /**
   * Computes the inverse function f⁻¹: Y -> X if f is bijective.
   * Throws an Error if f is not bijective.
   */
  static computeInverse(domain, codomain, pairs) {
    const analysis = this.analyzeRelationAsFunction(domain, codomain, pairs);
    if (!analysis.isBijective) {
      let reason = [];
      if (!analysis.isInjective) reason.push("Not injective (multiple inputs map to same output)");
      if (!analysis.isSurjective) reason.push("Not surjective (some codomain elements are unhit)");
      throw new Error(`Cannot compute inverse: ${reason.join(", ")}`);
    }

    // Flip pairs: (x, y) -> (y, x)
    return pairs.map(([x, y]) => [y, x]);
  }

  /**
   * Composes two functions g ∘ f: X -> Z where f: X -> Y and g: Y -> Z.
   * (g ∘ f)(x) = g(f(x))
   */
  static compose(pairsF, pairsG) {
    const mapG = new Map(pairsG);
    const composition = [];

    for (const [x, y] of pairsF) {
      if (mapG.has(y)) {
        composition.push([x, mapG.get(y)]);
      }
    }
    return composition;
  }

  /**
   * Verifies identity composition round-trip laws:
   * 1. f⁻¹ ∘ f = id_X
   * 2. f ∘ f⁻¹ = id_Y
   */
  static verifyRoundTripIdentity(domain, codomain, pairs) {
    const analysis = this.analyzeRelationAsFunction(domain, codomain, pairs);
    if (!analysis.isBijective) {
      return {
        valid: false,
        reason: "Function is not bijective; two-sided inverse does not exist."
      };
    }

    const inversePairs = this.computeInverse(domain, codomain, pairs);

    // Test f⁻¹ ∘ f on all x ∈ X
    const leftComp = this.compose(pairs, inversePairs); // f then f⁻¹
    const leftIdMatches = domain.every((x) => {
      const match = leftComp.find(([a]) => a === x);
      return match && match[1] === x;
    });

    // Test f ∘ f⁻¹ on all y ∈ Y
    const rightComp = this.compose(inversePairs, pairs); // f⁻¹ then f
    const rightIdMatches = codomain.every((y) => {
      const match = rightComp.find(([b]) => b === y);
      return match && match[1] === y;
    });

    return {
      valid: leftIdMatches && rightIdMatches,
      leftIdentity: leftIdMatches,
      rightIdentity: rightIdMatches,
      leftComp,
      rightComp
    };
  }

  // --------------------------------------------------------------------------
  // Continuous Analytic Models & Diagonal Mirror (y = x)
  // --------------------------------------------------------------------------

  static continuousPresets = {
    linear: {
      id: "linear",
      name: "Linear: f(x) = 2x + 1",
      latex: "f(x) = 2x + 1",
      domainText: "x \\in \\mathbb{R}",
      codomainText: "y \\in \\mathbb{R}",
      isBijectiveOnFull: true,
      forward: (x) => 2 * x + 1,
      inverse: (y) => (y - 1) / 2,
      forwardDeriv: () => 2,
      inverseDeriv: () => 0.5,
      forwardFormulaText: "f(x) = 2x + 1",
      inverseFormulaText: "f^{-1}(y) = \\frac{y - 1}{2}"
    },
    exponential: {
      id: "exponential",
      name: "Exponential: f(x) = e^x",
      latex: "f(x) = e^x",
      domainText: "x \\in \\mathbb{R}",
      codomainText: "y \\in (0, \\infty)",
      isBijectiveOnFull: true,
      forward: (x) => Math.exp(x),
      inverse: (y) => (y > 0 ? Math.log(y) : NaN),
      forwardDeriv: (x) => Math.exp(x),
      inverseDeriv: (y) => (y > 0 ? 1 / y : NaN),
      forwardFormulaText: "f(x) = e^x",
      inverseFormulaText: "f^{-1}(y) = \\ln(y)"
    },
    cubic: {
      id: "cubic",
      name: "Cubic: f(x) = x³",
      latex: "f(x) = x^3",
      domainText: "x \\in \\mathbb{R}",
      codomainText: "y \\in \\mathbb{R}",
      isBijectiveOnFull: true,
      forward: (x) => x * x * x,
      inverse: (y) => Math.cbrt(y),
      forwardDeriv: (x) => 3 * x * x,
      inverseDeriv: (y) => (y !== 0 ? 1 / (3 * Math.cbrt(y * y)) : Infinity),
      forwardFormulaText: "f(x) = x^3",
      inverseFormulaText: "f^{-1}(y) = \\sqrt[3]{y}"
    },
    quadratic: {
      id: "quadratic",
      name: "Quadratic: f(x) = x²",
      latex: "f(x) = x^2",
      domainText: "x \\in \\mathbb{R} \\text{ (fails injection)} \\implies \\text{restrict to } [0, \\infty)",
      codomainText: "y \\in [0, \\infty)",
      isBijectiveOnFull: false,
      forward: (x) => x * x,
      // If restricted to x >= 0:
      inverse: (y) => (y >= 0 ? Math.sqrt(y) : NaN),
      forwardDeriv: (x) => 2 * x,
      inverseDeriv: (y) => (y > 0 ? 1 / (2 * Math.sqrt(y)) : Infinity),
      forwardFormulaText: "f(x) = x^2 \\quad (x \\ge 0)",
      inverseFormulaText: "f^{-1}(y) = \\sqrt{y} \\quad (y \\ge 0)"
    }
  };

  /**
   * Computes the kernel equivalence relation ker(f) on domain X induced by f: X -> Y.
   * x1 ~_f x2 <=> f(x1) = f(x2).
   * Partitions X into fiber equivalence classes [x] = f⁻¹({f(x)}).
   */
  static computeKernelEquivalenceRelation(domain, pairs) {
    const forwardMap = new Map();
    for (const [x, y] of pairs) {
      if (!forwardMap.has(x)) forwardMap.set(x, []);
      forwardMap.get(x).push(y);
    }

    const fiberMap = new Map();
    const unmapped = [];

    for (const x of domain) {
      const outputs = forwardMap.get(x);
      if (!outputs || outputs.length === 0) {
        unmapped.push(x);
      } else {
        const yKey = String(outputs[0]);
        if (!fiberMap.has(yKey)) {
          fiberMap.set(yKey, { output: outputs[0], elements: [] });
        }
        fiberMap.get(yKey).elements.push(x);
      }
    }

    const classes = [];
    let idx = 1;
    for (const [, fiber] of fiberMap.entries()) {
      classes.push({
        id: `C${idx++}`,
        rep: fiber.elements[0],
        elements: fiber.elements,
        output: fiber.output,
        size: fiber.elements.length
      });
    }

    const isTrivial = classes.every(c => c.size === 1);
    const nonTrivialClasses = classes.filter(c => c.size > 1);

    return {
      classes,
      quotientSize: classes.length,
      isTrivial,
      nonTrivialClasses,
      unmapped,
      kernelPairsCount: classes.reduce((sum, c) => sum + c.size * c.size, 0)
    };
  }

  /**
   * Flexible parser for ordered pairs, CSV, TSV, or raw text tables.
   * Extracts domain, codomain, and mapping pairs.
   */
  static parseOrderedPairs(inputString, customCodomainStr = null) {
    if (!inputString || typeof inputString !== 'string') {
      throw new Error('Input must be a non-empty string of ordered pairs or CSV table.');
    }

    const cleaned = inputString.trim();
    const pairs = [];

    function parseElem(raw) {
      const s = String(raw).trim();
      if (!isNaN(s) && s !== '') {
        return Number(s);
      }
      return s;
    }

    // Check parenthesized pairs e.g. (1, a), (2, b) or [1, a]
    const parenRegex = /[\(\[]\s*([^,()\[\]]+?)\s*,\s*([^,()\[\]]+?)\s*[\)\]]/g;
    let match;
    let foundParen = false;

    while ((match = parenRegex.exec(cleaned)) !== null) {
      foundParen = true;
      const x = parseElem(match[1]);
      const y = parseElem(match[2]);
      pairs.push([x, y]);
    }

    // If no parenthesized pairs found, try line-by-line CSV / TSV / delimiter parsing
    if (!foundParen) {
      const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && /^(x\s*[,;\t]\s*y|input\s*[,;\t]\s*output|domain\s*[,;\t]\s*codomain)/i.test(line)) {
          continue;
        }
        let parts = [];
        if (line.includes('->')) {
          parts = line.split('->');
        } else if (line.includes('\t')) {
          parts = line.split('\t');
        } else if (line.includes(';')) {
          parts = line.split(';');
        } else if (line.includes(',')) {
          parts = line.split(',');
        } else {
          parts = line.split(/\s+/);
        }

        if (parts.length >= 2) {
          const x = parseElem(parts[0]);
          const y = parseElem(parts[1]);
          pairs.push([x, y]);
        }
      }
    }

    if (pairs.length === 0) {
      throw new Error('Could not find valid ordered pairs in input. Example formats: (1, a), (2, b) or CSV lines.');
    }

    const domain = [];
    const domainSeen = new Set();
    for (const [x] of pairs) {
      if (!domainSeen.has(x)) {
        domainSeen.add(x);
        domain.push(x);
      }
    }

    let codomain = [];
    const cSeen = new Set();
    if (customCodomainStr && customCodomainStr.trim()) {
      const rawC = customCodomainStr.split(/[,;\s]+/).map(s => parseElem(s)).filter(s => s !== '');
      for (const y of rawC) {
        if (!cSeen.has(y)) {
          cSeen.add(y);
          codomain.push(y);
        }
      }
    }
    for (const [, y] of pairs) {
      if (!cSeen.has(y)) {
        cSeen.add(y);
        codomain.push(y);
      }
    }

    return { domain, codomain, pairs };
  }

  /**
   * Deterministic, safe mathematical formula parser.
   * Zero eval(), zero CSP violations.
   * Supports: numbers, x, pi, e, +, -, *, /, %, ^, unary -, implicit multiplication,
   * sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, ln, log, sqrt, cbrt, abs.
   */
  static createSafeFormulaEvaluator(formulaStr) {
    if (!formulaStr || typeof formulaStr !== 'string') {
      throw new Error('Formula must be a valid string');
    }

    const expr = formulaStr.trim();
    const rawTokens = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
        let numStr = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          numStr += expr[i++];
        }
        rawTokens.push({ type: 'NUM', val: parseFloat(numStr) });
        continue;
      }
      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
          idStr += expr[i++];
        }
        rawTokens.push({ type: 'ID', val: idStr.toLowerCase() });
        continue;
      }
      if ('+-*/%^()'.includes(ch)) {
        rawTokens.push({ type: ch, val: ch });
        i++;
        continue;
      }
      throw new Error(`Unexpected character in formula: '${ch}'`);
    }

    // Token-based implicit multiplication insertion
    const tokens = [];
    for (let t = 0; t < rawTokens.length; t++) {
      const curr = rawTokens[t];
      const prev = tokens[tokens.length - 1];

      if (prev) {
        const prevCanMultiply =
          prev.type === 'NUM' ||
          prev.type === ')' ||
          (prev.type === 'ID' && (prev.val === 'x' || prev.val === 'pi' || prev.val === 'e'));

        const currCanMultiply =
          curr.type === 'NUM' ||
          curr.type === '(' ||
          curr.type === 'ID';

        if (prevCanMultiply && currCanMultiply) {
          tokens.push({ type: '*', val: '*' });
        }
      }
      tokens.push(curr);
    }

    let pos = 0;
    function peek() {
      return tokens[pos];
    }
    function consume(expected) {
      const tok = tokens[pos];
      if (!tok) throw new Error(`Unexpected end of expression${expected ? `, expected '${expected}'` : ''}`);
      if (expected && tok.type !== expected) {
        throw new Error(`Expected '${expected}', got '${tok.val}'`);
      }
      pos++;
      return tok;
    }

    function parseExpression() {
      let node = parseTerm();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = consume().type;
        const right = parseTerm();
        const left = node;
        node = (x) => (op === '+' ? left(x) + right(x) : left(x) - right(x));
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      while (peek() && (peek().type === '*' || peek().type === '/' || peek().type === '%')) {
        const op = consume().type;
        const right = parseUnary();
        const left = node;
        if (op === '*') {
          node = (x) => left(x) * right(x);
        } else if (op === '/') {
          node = (x) => left(x) / right(x);
        } else {
          node = (x) => left(x) % right(x);
        }
      }
      return node;
    }

    function parseUnary() {
      if (peek() && peek().type === '-') {
        consume('-');
        const operand = parseUnary();
        return (x) => -operand(x);
      }
      if (peek() && peek().type === '+') {
        consume('+');
        return parseUnary();
      }
      return parsePower();
    }

    function parsePower() {
      let node = parsePrimary();
      if (peek() && peek().type === '^') {
        consume('^');
        const right = parseUnary();
        const left = node;
        node = (x) => Math.pow(left(x), right(x));
      }
      return node;
    }

    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of formula');

      if (tok.type === 'NUM') {
        consume();
        const num = tok.val;
        return () => num;
      }

      if (tok.type === 'ID') {
        consume();
        const id = tok.val;
        if (id === 'x') return (x) => x;
        if (id === 'pi') return () => Math.PI;
        if (id === 'e') return () => Math.E;

        const fnMap = {
          sin: Math.sin,
          cos: Math.cos,
          tan: Math.tan,
          asin: Math.asin,
          acos: Math.acos,
          atan: Math.atan,
          sinh: Math.sinh,
          cosh: Math.cosh,
          tanh: Math.tanh,
          exp: Math.exp,
          ln: Math.log,
          log: Math.log10,
          sqrt: Math.sqrt,
          cbrt: Math.cbrt,
          abs: Math.abs,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round
        };

        if (fnMap[id]) {
          consume('(');
          const argExpr = parseExpression();
          consume(')');
          const fn = fnMap[id];
          return (x) => fn(argExpr(x));
        }

        throw new Error(`Unknown function or variable: '${id}'`);
      }

      if (tok.type === '(') {
        consume('(');
        const node = parseExpression();
        consume(')');
        return node;
      }

      throw new Error(`Unexpected token: '${tok.val}'`);
    }

    const rootEvaluator = parseExpression();
    if (pos < tokens.length) {
      throw new Error(`Unexpected trailing tokens: '${tokens[pos].val}'`);
    }

    return (x) => {
      try {
        const res = rootEvaluator(x);
        return typeof res === 'number' && !isNaN(res) ? res : NaN;
      } catch (_) {
        return NaN;
      }
    };
  }

  /**
   * Continuous Numerical Deductions:
   * Computes roots f(x)=0, fixed points f(x)=x, range [min, max],
   * monotonicity, and local extrema on [minX, maxX].
   */
  static analyzeContinuousFormula(evaluator, minX = -4, maxX = 4, numSteps = 400) {
    const step = (maxX - minX) / numSteps;
    const samples = [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i <= numSteps; i++) {
      const x = minX + i * step;
      const y = evaluator(x);
      if (!isNaN(y) && isFinite(y)) {
        samples.push({ x, y });
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // 1. Find Roots f(x) = 0
    const roots = [];
    for (let i = 0; i < samples.length - 1; i++) {
      const s1 = samples[i];
      const s2 = samples[i + 1];
      if (s1.y * s2.y <= 0) {
        let lo = s1.x;
        let hi = s2.x;
        for (let iter = 0; iter < 20; iter++) {
          const mid = (lo + hi) / 2;
          const midY = evaluator(mid);
          if (evaluator(lo) * midY <= 0) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        const root = (lo + hi) / 2;
        if (!roots.some(r => Math.abs(r - root) < 0.01)) {
          roots.push(root);
        }
      }
    }

    // 2. Find Fixed Points f(x) = x (Intersections with diagonal mirror line y = x!)
    const fixedPoints = [];
    for (let i = 0; i < samples.length - 1; i++) {
      const s1 = samples[i];
      const s2 = samples[i + 1];
      const g1 = s1.y - s1.x;
      const g2 = s2.y - s2.x;
      if (g1 * g2 <= 0) {
        let lo = s1.x;
        let hi = s2.x;
        for (let iter = 0; iter < 20; iter++) {
          const mid = (lo + hi) / 2;
          const midG = evaluator(mid) - mid;
          const loG = evaluator(lo) - lo;
          if (loG * midG <= 0) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        const fix = (lo + hi) / 2;
        if (!fixedPoints.some(fp => Math.abs(fp.x - fix) < 0.01)) {
          fixedPoints.push({ x: fix, y: evaluator(fix) });
        }
      }
    }

    // 3. Monotonicity & Extrema via Derivative
    const h = 0.001;
    const extrema = [];
    let prevDeriv = null;
    let hasPositiveDeriv = false;
    let hasNegativeDeriv = false;

    for (let i = 0; i < samples.length; i++) {
      const x = samples[i].x;
      const yPlus = evaluator(x + h);
      const yMinus = evaluator(x - h);
      if (!isNaN(yPlus) && !isNaN(yMinus)) {
        const deriv = (yPlus - yMinus) / (2 * h);
        if (deriv > 0.05) hasPositiveDeriv = true;
        if (deriv < -0.05) hasNegativeDeriv = true;

        if (prevDeriv !== null) {
          if (prevDeriv > 0 && deriv < 0) {
            extrema.push({ type: 'local max', x, y: samples[i].y });
          } else if (prevDeriv < 0 && deriv > 0) {
            extrema.push({ type: 'local min', x, y: samples[i].y });
          }
        }
        prevDeriv = deriv;
      }
    }

    const isStrictlyMonotonic = (hasPositiveDeriv && !hasNegativeDeriv) || (!hasPositiveDeriv && hasNegativeDeriv);
    const isInjective = isStrictlyMonotonic && extrema.length === 0;

    return {
      range: { minY, maxY },
      roots,
      fixedPoints,
      extrema,
      isStrictlyMonotonic,
      isInjective,
      monotonicType: hasPositiveDeriv && !hasNegativeDeriv ? 'strictly increasing' : (hasNegativeDeriv && !hasPositiveDeriv ? 'strictly decreasing' : 'non-monotonic (oscillating/extrema)')
    };
  }

  /**
   * Numerical inverse bisection solver for monotonic continuous functions.
   * Finds x such that f(x) = targetY on [minX, maxX].
   */
  static numericalInverse(evaluator, targetY, minX = -10, maxX = 10, maxIter = 25) {
    let lo = minX;
    let hi = maxX;
    const yLo = evaluator(lo);
    const yHi = evaluator(hi);
    if (isNaN(yLo) || isNaN(yHi)) return NaN;
    const isIncreasing = yHi >= yLo;

    if (isIncreasing) {
      if (targetY < yLo || targetY > yHi) return NaN;
    } else {
      if (targetY > yLo || targetY < yHi) return NaN;
    }

    for (let i = 0; i < maxIter; i++) {
      const mid = (lo + hi) / 2;
      const yMid = evaluator(mid);
      if (Math.abs(yMid - targetY) < 1e-6) return mid;
      if (isIncreasing) {
        if (yMid < targetY) lo = mid;
        else hi = mid;
      } else {
        if (yMid > targetY) lo = mid;
        else hi = mid;
      }
    }
    return (lo + hi) / 2;
  }
}

// ============================================================================
// 3. RELATIONS, ORDER & EQUIVALENCE (Module 2)
// ============================================================================

export class RelationMath {
  /**
   * Analyzes an arbitrary binary relation R on set A against all 5 axiomatic properties:
   * 1. Reflexive: ∀a ∈ A, (a, a) ∈ R
   * 2. Symmetric: ∀a, b ∈ A, (a, b) ∈ R => (b, a) ∈ R
   * 3. Antisymmetric: ∀a, b ∈ A, [(a, b) ∈ R ∧ (b, a) ∈ R] => a = b
   * 4. Transitive: ∀a, b, c ∈ A, [(a, b) ∈ R ∧ (b, c) ∈ R] => (a, c) ∈ R
   * 5. Trichotomy (strict): ∀a, b ∈ A, exactly one of (a < b), (b < a), or (a = b)
   * 6. Totality / Comparability: ∀a, b ∈ A, (a, b) ∈ R ∨ (b, a) ∈ R
   */
  static analyzeRelation(setA, pairs) {
    const pairSet = new Set(pairs.map(([a, b]) => `${a}->${b}`));
    const hasPair = (a, b) => pairSet.has(`${a}->${b}`);

    // 1. Reflexivity
    const missingReflexive = [];
    for (const a of setA) {
      if (!hasPair(a, a)) {
        missingReflexive.push(a);
      }
    }
    const isReflexive = missingReflexive.length === 0;

    // 2. Symmetry
    const missingSymmetric = [];
    for (const [a, b] of pairs) {
      if (!hasPair(b, a)) {
        missingSymmetric.push({ pair: [a, b], missing: [b, a] });
      }
    }
    const isSymmetric = missingSymmetric.length === 0;

    // 3. Antisymmetry
    const violatedAntisymmetric = [];
    for (const [a, b] of pairs) {
      if (a !== b && hasPair(b, a)) {
        // Distinct elements both relate
        const exists = violatedAntisymmetric.some(
          (v) => (v.a === a && v.b === b) || (v.a === b && v.b === a)
        );
        if (!exists) {
          violatedAntisymmetric.push({ a, b });
        }
      }
    }
    const isAntisymmetric = violatedAntisymmetric.length === 0;

    // 4. Transitivity
    const missingTransitive = [];
    for (const [a, b] of pairs) {
      for (const [c, d] of pairs) {
        if (b === c) {
          if (!hasPair(a, d)) {
            const alreadyLogged = missingTransitive.some(
              (m) => m.a === a && m.b === b && m.c === d
            );
            if (!alreadyLogged) {
              missingTransitive.push({ a, b, c: d });
            }
          }
        }
      }
    }
    const isTransitive = missingTransitive.length === 0;

    // 5. Totality / Comparability
    const missingComparable = [];
    for (let i = 0; i < setA.length; i++) {
      for (let j = i + 1; j < setA.length; j++) {
        const a = setA[i];
        const b = setA[j];
        if (!hasPair(a, b) && !hasPair(b, a)) {
          missingComparable.push([a, b]);
        }
      }
    }
    const isTotal = missingComparable.length === 0;

    // 6. Structure Classification
    const isEquivalence = isReflexive && isSymmetric && isTransitive;
    const isPartialOrder = isReflexive && isAntisymmetric && isTransitive;
    const isTotalOrder = isPartialOrder && isTotal;

    return {
      isReflexive,
      missingReflexive,
      isSymmetric,
      missingSymmetric,
      isAntisymmetric,
      violatedAntisymmetric,
      isTransitive,
      missingTransitive,
      isTotal,
      missingComparable,
      isEquivalence,
      isPartialOrder,
      isTotalOrder
    };
  }

  /**
   * Computes the equivalence classes A/~ for an equivalence relation.
   * Returns an array of disjoint partition subsets.
   */
  static computeEquivalenceClasses(setA, pairs) {
    const parent = new Map();
    for (const a of setA) parent.set(a, a);

    function find(i) {
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i));
      parent.set(i, root);
      return root;
    }

    function union(i, j) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    }

    for (const [a, b] of pairs) {
      if (parent.has(a) && parent.has(b)) {
        union(a, b);
      }
    }

    const groups = new Map();
    for (const a of setA) {
      const root = find(a);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(a);
    }

    return Array.from(groups.values()).map((arr) => arr.sort());
  }

  /**
   * Computes congruence modulo n equivalence classes Z/nZ
   */
  static computeModuloClasses(integers, modulus) {
    const classes = Array.from({ length: modulus }, () => []);
    for (const k of integers) {
      const remainder = ((k % modulus) + modulus) % modulus;
      classes[remainder].push(k);
    }
    return classes;
  }
}

// ============================================================================
// 4. PERMUTATIONS & SYMMETRIC GROUPS S_n (Module 3)
// ============================================================================

export class PermutationMath {
  /**
   * Converts Cauchy two-row matrix representation to disjoint cycle notation.
   * Example: [2, 3, 1] (where 1->2, 2->3, 3->1) -> [[1, 2, 3]]
   * Example: [3, 1, 2, 5, 4] -> [[1, 3, 2], [4, 5]]
   * 
   * @param {Array<number>} mapping - 1-indexed output array: mapping[i] is image of (i + 1)
   * @param {boolean} includeFixedPoints - whether to include (x) cycles of length 1
   * @returns {Array<Array<number>>} disjoint cycles
   */
  static toCycleNotation(mapping, includeFixedPoints = false) {
    const n = mapping.length;
    const visited = new Array(n).fill(false);
    const cycles = [];

    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;

      const cycle = [];
      let current = i;

      while (!visited[current]) {
        visited[current] = true;
        cycle.push(current + 1);
        current = mapping[current] - 1;
      }

      if (cycle.length > 1 || includeFixedPoints) {
        cycles.push(cycle);
      }
    }

    return cycles;
  }

  /**
   * Formats disjoint cycles as mathematical string: "(1 2 3)(4 5)"
   */
  static formatCycles(cycles) {
    if (cycles.length === 0) return "id = ()";
    return cycles.map((c) => `(${c.join(" ")})`).join("");
  }

  /**
   * Composes two permutations (g ∘ f)(x) = g(f(x)).
   * Both f and g are 1-indexed array images of [1, 2, ..., n].
   */
  static composePermutations(f, g) {
    const n = f.length;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
      const intermediate = f[i]; // f(i + 1)
      result[i] = g[intermediate - 1]; // g(f(i + 1))
    }
    return result;
  }

  /**
   * Computes the order of a permutation from its disjoint cycles.
   * Order = lcm(len(cycle_1), len(cycle_2), ..., len(cycle_k))
   */
  static computeOrder(cycles) {
    if (cycles.length === 0) return 1;

    function gcd(a, b) {
      while (b !== 0) {
        const t = b;
        b = a % b;
        a = t;
      }
      return a;
    }

    function lcm(a, b) {
      return (a * b) / gcd(a, b);
    }

    const lengths = cycles.map((c) => c.length);
    return lengths.reduce((acc, len) => lcm(acc, len), 1);
  }

  /**
   * Counts the number of inversions and determines parity / sign:
   * sgn(σ) = (-1)^inversions
   */
  static computeParityAndSign(mapping) {
    let inversions = 0;
    const n = mapping.length;
    const inversionPairs = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (mapping[i] > mapping[j]) {
          inversions++;
          inversionPairs.push([i + 1, j + 1]);
        }
      }
    }

    const isEven = inversions % 2 === 0;
    const sign = isEven ? 1 : -1;

    return {
      inversions,
      inversionPairs,
      isEven,
      isOdd: !isEven,
      sign
    };
  }

  /**
   * Decomposes any cycle into adjacent or standard transpositions (2-cycles).
   * A k-cycle (a1 a2 ... ak) = (a1 ak) ∘ ... ∘ (a1 a3) ∘ (a1 a2).
   */
  static decomposeIntoTranspositions(cycle) {
    if (cycle.length <= 1) return [];
    const transpositions = [];
    const a1 = cycle[0];
    for (let i = cycle.length - 1; i >= 1; i--) {
      transpositions.push([a1, cycle[i]]);
    }
    return transpositions;
  }

  /**
   * Computes the mathematical inverse permutation σ⁻¹.
   * If σ(i) = j, then σ⁻¹(j) = i.
   * Geometrically equivalent to reflecting coordinates across the line y = x.
   *
   * @param {Array<number>} mapping - 1-indexed output array
   * @returns {Array<number>} inverse mapping
   */
  static computeInverse(mapping) {
    const n = mapping.length;
    const inv = new Array(n);
    for (let i = 0; i < n; i++) {
      const target = mapping[i]; // σ(i + 1)
      if (target >= 1 && target <= n) {
        inv[target - 1] = i + 1;
      }
    }
    return inv;
  }

  /**
   * Applies transposition swap (a b) to permutation mapping.
   * Swaps the images σ(a) and σ(b) (where a, b are 1-indexed).
   */
  static applyTransposition(mapping, a, b) {
    const next = [...mapping];
    const idxA = a - 1;
    const idxB = b - 1;
    if (idxA >= 0 && idxA < next.length && idxB >= 0 && idxB < next.length) {
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
    }
    return next;
  }

  /**
   * Sets mapping value σ(x) = y on the coordinate grid.
   * Automatically resolves collisions by swapping with the displaced column x'
   * so the permutation strictly maintains the bijection (Rook property).
   */
  static setMappingValue(mapping, x, y) {
    const next = [...mapping];
    const idxX = x - 1;
    if (idxX < 0 || idxX >= next.length || y < 1 || y > next.length) return next;

    const oldY = next[idxX];
    if (oldY === y) return next;

    // Find the other input x' that currently maps to y
    const displacedIdx = next.findIndex(val => val === y);
    if (displacedIdx !== -1) {
      next[displacedIdx] = oldY;
    }
    next[idxX] = y;
    return next;
  }

  /**
   * Computes fixed points of the permutation: elements where σ(x) = x.
   * Geometrically, these correspond to points lying directly on the diagonal y = x.
   */
  static computeFixedPoints(mapping) {
    const fixed = [];
    for (let i = 0; i < mapping.length; i++) {
      if (mapping[i] === i + 1) {
        fixed.push(i + 1);
      }
    }
    return fixed;
  }

  /**
   * Computes Rothe diagram and Cartesian coordinate grid properties for σ ∈ S_n.
   * - Points: (x, σ(x))
   * - Fixed points: points lying on diagonal y = x
   * - Inversion cells: cells (x, y) where y < σ(x) and σ⁻¹(y) > x
   */
  static computeRotheDiagram(mapping) {
    const n = mapping.length;
    const inv = this.computeInverse(mapping);
    const fixedPoints = this.computeFixedPoints(mapping);
    const points = [];
    const inversionCells = [];

    for (let x = 1; x <= n; x++) {
      const y = mapping[x - 1];
      points.push({ x, y, isFixed: x === y });

      // Inversion cells in Rothe diagram:
      // cell (x, c) where c < y and σ⁻¹(c) > x
      for (let c = 1; c < y; c++) {
        if (inv[c - 1] > x) {
          inversionCells.push({ x, y: c, originalTarget: y, partner: inv[c - 1] });
        }
      }
    }

    return {
      n,
      points,
      fixedPoints,
      inversionCells,
      inversionCount: inversionCells.length,
      parity: inversionCells.length % 2 === 0 ? 'EVEN' : 'ODD',
      sign: inversionCells.length % 2 === 0 ? 1 : -1
    };
  }
}

// ============================================================================
// 5. CATEGORY THEORY & UNIVERSAL PROPERTIES (Module 4)
// ============================================================================

export class CategoryMath {
  /**
   * Checks whether a diagram commutes between paths from source to target.
   * Example: g ∘ f == h
   */
  static checkCommutativity(pathA, pathB) {
    if (pathA.length !== pathB.length) return false;
    return pathA.every((val, idx) => val === pathB[idx]);
  }

  /**
   * Categorical Monomorphism (Monic) Probe Test:
   * A morphism f: X -> Y is monic iff for all test probes g1, g2: W -> X:
   * f ∘ g1 = f ∘ g2  =>  g1 = g2.
   * 
   * If f is NOT monic, returns the witness counterexample (g1, g2) where g1 ≠ g2 but f ∘ g1 = f ∘ g2.
   */
  static testMonomorphism(morphismF, domainX, codomainY) {
    // In Set, monic <=> injective.
    // We construct test probes from a singleton W = {*} into X.
    const fMap = new Map(morphismF);
    const collisions = new Map();

    for (const x of domainX) {
      const y = fMap.get(x);
      if (!collisions.has(y)) {
        collisions.set(y, []);
      }
      collisions.get(y).push(x);
    }

    for (const [y, inputs] of collisions.entries()) {
      if (inputs.length > 1) {
        // Found collision: inputs[0] and inputs[1] both map to y.
        // Construct witness probes g1(*) = inputs[0], g2(*) = inputs[1].
        return {
          isMonic: false,
          reason: `Violates monic property: distinct elements map to ${y}`,
          witness: {
            probeDomain: ["*"],
            g1: [["*", inputs[0]]],
            g2: [["*", inputs[1]]],
            compositionBoth: [["*", y]]
          }
        };
      }
    }

    return {
      isMonic: true,
      reason: "Satisfies left-cancellation: f ∘ g1 = f ∘ g2 implies g1 = g2 for all probes."
    };
  }

  /**
   * Categorical Epimorphism (Epic) Probe Test:
   * A morphism f: X -> Y is epic iff for all test probes h1, h2: Y -> Z:
   * h1 ∘ f = h2 ∘ f  =>  h1 = h2.
   * 
   * If f is NOT epic, returns the witness counterexample (h1, h2) where h1 ≠ h2 but h1 ∘ f = h2 ∘ f.
   */
  static testEpimorphism(morphismF, domainX, codomainY) {
    // In Set, epic <=> surjective.
    const fMap = new Map(morphismF);
    const hitOutputs = new Set();
    for (const x of domainX) {
      hitOutputs.add(fMap.get(x));
    }

    const unhit = codomainY.filter((y) => !hitOutputs.has(y));

    if (unhit.length > 0) {
      const orphaned = unhit[0];
      // Construct witness probes h1, h2: Y -> {0, 1}
      // h1 sends everything to 0
      // h2 sends orphaned to 1, everything else to 0
      const h1 = codomainY.map((y) => [y, 0]);
      const h2 = codomainY.map((y) => [y, y === orphaned ? 1 : 0]);

      return {
        isEpic: false,
        reason: `Violates epic property: element ${orphaned} is not hit in codomain`,
        witness: {
          testCodomain: [0, 1],
          orphaned,
          h1,
          h2,
          composedOutputConstant: 0
        }
      };
    }

    return {
      isEpic: true,
      reason: "Satisfies right-cancellation: h1 ∘ f = h2 ∘ f implies h1 = h2 for all probes."
    };
  }

  /**
   * First Isomorphism Theorem / Universal Factorization:
   * Every function f: X -> Y factors uniquely through its quotient by the kernel relation:
   * X --π--> X/~ --f_bar--> im(f) --ι--> Y
   * where:
   * - π: X -> X/~ is canonical epimorphism (surjection)
   * - f_bar: X/~ -> im(f) is an isomorphism (bijection)
   * - ι: im(f) -> Y is canonical monomorphism (injection)
   * Hence f = ι ∘ f_bar ∘ π.
   */
  static computeQuotientFactorization(morphismF, domainX, codomainY) {
    const fMap = new Map(morphismF);
    const kernelClassesMap = new Map(); // y -> [x1, x2, ...]

    for (const x of domainX) {
      const y = fMap.get(x);
      if (!kernelClassesMap.has(y)) {
        kernelClassesMap.set(y, []);
      }
      kernelClassesMap.get(y).push(x);
    }

    // Quotient classes: array of classes e.g. { id: "[1,2]", elements: [1,2], targetY: y }
    const quotientClasses = [];
    const imageElements = [];
    const fBarMapping = [];
    const projectionMapping = [];
    const inclusionMapping = [];

    for (const [y, elements] of kernelClassesMap.entries()) {
      const classId = `[${elements.join(',')}]`;
      quotientClasses.push({ id: classId, elements, targetY: y });
      imageElements.push(y);
      fBarMapping.push([classId, y]);
      inclusionMapping.push([y, y]);
      for (const x of elements) {
        projectionMapping.push([x, classId]);
      }
    }

    const unhit = codomainY.filter((y) => !kernelClassesMap.has(y));

    return {
      domainX,
      codomainY,
      quotientClasses,
      imageElements,
      projectionMapping, // π: X -> X/~
      fBarMapping,       // f_bar: X/~ -> im(f) (isomorphism)
      inclusionMapping,  // ι: im(f) -> Y
      unhitCodomain: unhit,
      isIsomorphismDirect: quotientClasses.length === domainX.length && unhit.length === 0,
      factorsCommute: true
    };
  }

  /**
   * Currying / Cartesian Adjunction:
   * Natural isomorphism Hom(A × B, C) ≅ Hom(A, C^B).
   * Uncurried: f: (a, b) -> c
   * Curried: f_hat: a -> (b -> c)
   * Evaluation: eval(f_hat(a), b) = f(a, b)
   */
  static testCurryingAdjunction(domainA, domainB, fn) {
    const table2D = [];
    const curriedMap = new Map();

    for (const a of domainA) {
      const row = [];
      const sliceMap = new Map();
      for (const b of domainB) {
        const val = fn(a, b);
        row.push({ a, b, val });
        sliceMap.set(b, val);
      }
      table2D.push(row);
      curriedMap.set(a, sliceMap);
    }

    // Verify round-trip evaluation
    let allMatch = true;
    for (const a of domainA) {
      for (const b of domainB) {
        const direct = fn(a, b);
        const curriedSlice = curriedMap.get(a);
        const curriedEval = curriedSlice.get(b);
        if (direct !== curriedEval) {
          allMatch = false;
        }
      }
    }

    return {
      domainA,
      domainB,
      table2D,
      curriedMap,
      adjunctionHolds: allMatch
    };
  }
}
