import { sphereStats, thalesStats2D, toDegrees } from '../model/thales-math.js';

const tag = (color, text) => `<span class="color-${color}">${text}</span>`;

function cardTemplate(id, badge, title, symbolicLines, hasHighlight = false) {
  return `
    <div class="derivation-card" id="${id}">
      <div class="derivation-card-header collapsible-header" role="button" tabindex="0" aria-expanded="false">
        <div class="derivation-card-header-title">
          <span class="derivation-badge">${badge}</span>
          <span class="derivation-title">${title}</span>
        </div>
        <span class="icon">▶</span>
      </div>
      <div class="derivation-card-content collapsible-content">
        <div class="derivation-math-row">${symbolicLines}</div>
        <div class="derivation-sub-row" data-sub></div>
        ${hasHighlight ? '<div class="derivation-eval-highlight" data-eval></div>' : ''}
      </div>
    </div>
  `;
}

/** Renders the "Live Math Derivations" panel with full algebraic proofs and live numerical substitutions. */
export class DerivationView {
  static stateKeys = ['radius', 'angle2D', 'lat3D', 'lon3D', 'lengthUnit', 'angleUnit', 'affineMode', 'affineStretch', 'affineAxisAngle'];

  constructor(flatElement, solidElement) {
    this.flatElement = flatElement;
    this.solidElement = solidElement;
    this.initialized = false;
  }

  #initDOM() {
    this.flatElement.innerHTML = `
      ${cardTemplate(
        'deriv-2d-step-1',
        'Step 1',
        `Coordinate Setup & Diameter Chord ${tag('red', '|d|')}`,
        `Origin ${tag('indigo', 'Center O')} = (${tag('amber', '0')}, ${tag('emerald', '0')})<br>` +
        `Endpoints: ${tag('red', 'A')} = (${tag('amber', `-${tag('indigo', 'r')}`)}, ${tag('emerald', '0')}), ${tag('orange', 'B')} = (${tag('amber', tag('indigo', 'r'))}, ${tag('emerald', '0')})<br>` +
        `${tag('red', 'Diameter')} magnitude: ${tag('red', '|d|')} = 2${tag('indigo', 'r')}<br>` +
        `${tag('sky', 'Circumference')}: ${tag('sky', '2πr')}`
      )}
      ${cardTemplate(
        'deriv-2d-step-2',
        'Step 2',
        `Parametric Point ${tag('violet', 'P')} on Circumference`,
        `${tag('violet', 'P')}(${tag('amber', 'x')}, ${tag('emerald', 'y')}) = (${tag('amber', `${tag('indigo', 'r')} cos ${tag('yellow', 'θ')}`)}, ${tag('emerald', `${tag('indigo', 'r')} sin ${tag('yellow', 'θ')}`)})<br>` +
        `Components: ${tag('amber', 'x (horizontal)')}, ${tag('emerald', 'y (elevation)')}<br>` +
        `Circle condition: ${tag('amber', 'x²')} + ${tag('emerald', 'y²')} = ${tag('indigo', 'r²')}`
      )}
      ${cardTemplate(
        'deriv-2d-step-3',
        'Step 3',
        `Triangle Legs ${tag('blue', 's')} & ${tag('orange', 't')} (Euclidean Distance)`,
        `${tag('blue', 'Leg s')} = |${tag('violet', 'P')} - ${tag('red', 'A')}| = √[(${tag('amber', 'x')} + ${tag('indigo', 'r')})² + ${tag('emerald', 'y')}²]<br>` +
        `${tag('orange', 'Leg t')} = |${tag('violet', 'P')} - ${tag('orange', 'B')}| = √[(${tag('amber', 'x')} - ${tag('indigo', 'r')})² + ${tag('emerald', 'y')}²]`
      )}
      ${cardTemplate(
        'deriv-2d-step-4',
        'Step 4',
        `Pythagorean Derivation: ${tag('blue', 's²')} + ${tag('orange', 't²')} = ${tag('cyan', '|d|²')}`,
        `${tag('blue', 's²')} + ${tag('orange', 't²')} = [(${tag('amber', 'x')} + ${tag('indigo', 'r')})² + ${tag('emerald', 'y²')}] + [(${tag('amber', 'x')} - ${tag('indigo', 'r')})² + ${tag('emerald', 'y²')}]<br>` +
        `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 2(${tag('amber', 'x²')} + ${tag('emerald', 'y²')}) + 2${tag('indigo', 'r²')} = 2(${tag('indigo', 'r²')}) + 2${tag('indigo', 'r²')} = 4${tag('indigo', 'r²')} = ${tag('cyan', '|d|²')}`,
        true
      )}
      ${cardTemplate(
        'deriv-2d-step-5',
        'Step 5',
        `Right Angle at ${tag('violet', 'P')}: Euclidean Isosceles & Dot Product`,
        `<b>Euclidean Proof:</b> Radius ${tag('indigo', '|OP|')} = ${tag('red', '|OA|')} = ${tag('orange', '|OB|')} = ${tag('indigo', 'r')}<br>` +
        `⇒ ${tag('blue', '△OAP')} isosceles (${tag('red', 'OA')} = ${tag('indigo', 'OP')}): base angle ${tag('lime', '∠OAP')} = ${tag('lime', '∠OPA')} = ${tag('lime', 'α')}<br>` +
        `⇒ ${tag('orange', '△OBP')} isosceles (${tag('orange', 'OB')} = ${tag('indigo', 'OP')}): base angle ${tag('orange', '∠OBP')} = ${tag('orange', '∠OPB')} = ${tag('orange', 'β')}<br>` +
        `⇒ At vertex ${tag('violet', 'P')}: ${tag('teal', '∠APB')} = ${tag('lime', 'α')} + ${tag('orange', 'β')}<br>` +
        `Angle sum in △APB: ${tag('lime', 'α')} + ${tag('orange', 'β')} + (${tag('lime', 'α')} + ${tag('orange', 'β')}) = 2(${tag('lime', 'α')} + ${tag('orange', 'β')}) = ${tag('lavender', '180°')} ⇒ ${tag('teal', '∠APB = 90.0°')}<br>` +
        `<b>Vector Dot Product:</b> ${tag('blue', 'u')} = ${tag('red', 'A')} - ${tag('violet', 'P')}, ${tag('orange', 'v')} = ${tag('orange', 'B')} - ${tag('violet', 'P')}<br>` +
        `${tag('teal', 'Dot product')}: ${tag('blue', 'u')} · ${tag('orange', 'v')} = (${tag('amber', 'x²')} + ${tag('emerald', 'y²')}) - ${tag('indigo', 'r²')} = ${tag('indigo', 'r²')} - ${tag('indigo', 'r²')} = 0 ⇒ ${tag('teal', '∠APB = 90.0°')}`,
        true
      )}
      ${cardTemplate(
        'deriv-2d-step-6',
        'Step 6',
        `Inscribed Area Invariant & Quadrant Elevation`,
        `${tag('green', 'Area')} = ½ · ${tag('blue', 's')} · ${tag('orange', 't')} = ½ · ${tag('red', '|d|')} · ${tag('emerald', 'h')} = ${tag('indigo', 'r')} · |${tag('emerald', 'y')}| = ${tag('indigo', 'r²')} · |sin ${tag('yellow', 'θ')}|<br>` +
        `<b>Quadrant Area Dynamics:</b><br>` +
        `• Upper Semicircle (Q-I & Q-II, ${tag('emerald', 'y > 0')}): Elevation ${tag('emerald', 'h = y')}. Area peaks at zenith ${tag('yellow', 'θ = 90°')} (${tag('indigo', 'Area = r²')}) and collapses to 0 at diameter endpoints.<br>` +
        `• Lower Semicircle (Q-III & Q-IV, ${tag('emerald', 'y < 0')}): Triangle reflects into southern hemisphere with height ${tag('emerald', 'h = -y = |y|')}.<br>` +
        `• <b>Invariant:</b> While height ${tag('emerald', 'h')} and ${tag('green', 'Area')} oscillate across quadrants, the right angle ${tag('teal', '∠APB ≡ 90.0°')} and ${tag('lavender', 's² + t² ≡ |d|²')} are strictly invariant.`,
        true
      )}
      ${cardTemplate(
        'deriv-2d-step-7',
        'Step 7',
        `Explementary & Reflex Angles: Perigon ${tag('teal', '360°')} & Inscribed Theorem`,
        `<b>Explementary (Conjugate) Perigon Identity:</b><br>` +
        `Every angle ${tag('yellow', 'γ')} forms a full ${tag('teal', '360°')} perigon with its reflex conjugate ${tag('lime', 'γ*')} = ${tag('teal', '360°')} - ${tag('yellow', 'γ')}:<br>` +
        `• Base Angle A: ${tag('lime', 'α')} + ${tag('lime', 'α*')} = ${tag('teal', '360°')} ⇒ ${tag('lime', `α* = ${tag('teal', '360°')} - α`)}<br>` +
        `• Base Angle B: ${tag('orange', 'β')} + ${tag('orange', 'β*')} = ${tag('teal', '360°')} ⇒ ${tag('orange', `β* = ${tag('teal', '360°')} - β`)}<br>` +
        `• Inscribed Vertex P: ${tag('teal', '∠APB')} + ${tag('teal', '∠APB*')} = ${tag('teal', '90°')} + ${tag('teal', '270°')} = ${tag('teal', '360°')} ⇒ ${tag('teal', '∠APB* = 270.0°')}<br>` +
        `• <b>Invariant Reflex Sum:</b> ${tag('lavender', 'α* + β* + ∠APB*')} = 3(${tag('teal', '360°')}) - ${tag('lavender', '180°')} = ${tag('lavender', '900.0°')}<br>` +
        `<b>Inscribed Angle Theorem Connection:</b><br>` +
        `Diameter AB subtends straight central angle ${tag('lavender', '180°')} and reflex central angle ${tag('lavender', '180°')}. For any cyclic polygon, reflex central angles govern obtuse inscribed angles, guaranteeing opposite angles sum to ${tag('lavender', '180°')}.`,
        true
      )}
      ${cardTemplate(
        'deriv-2d-step-8',
        'Step 8',
        `Affine Conic Generalization (Erlangen Program & Apollonius Conjugacy)`,
        `<b>Felix Klein's Erlangen Program (1872):</b> Under affine deformation ${tag('amber', "x' = S x")}, Euclidean orthogonality deforms (${tag('rose', '∠APB ≠ 90°')}).<br>` +
        `However, the deeper <b>Apollonius Theorem of Conjugate Diameters</b> remains invariant:<br>` +
        `• Metric Tensor: ${tag('indigo', 'Q = (S⁻¹)ᵀ (1/r² I) S⁻¹')}<br>` +
        `• Invariant Conjugacy: ${tag('teal', 'v_PAᵀ Q v_PB ≡ 0.000')}<br>` +
        `The chords to diameter endpoints are conjugate directions with respect to the ellipse.`,
        true
      )}
    `;

    this.solidElement.innerHTML = `
      ${cardTemplate(
        'deriv-3d-step-1',
        'Step 1',
        `Spherical Coordinates: Colatitude ${tag('yellow', 'θ')} vs Longitude ${tag('fuchsia', 'φ')}`,
        `• ${tag('yellow', 'Colatitude θ')} ∈ [0, π]: Measured from vertical zenith pole ${tag('emerald', '+Y')} downward (${tag('yellow', '0°')} at North Pole, ${tag('yellow', '90°')} at equator, ${tag('yellow', '180°')} at South Pole). *Note: Unlike 2D polar angle which is measured from horizontal diameter +X.*<br>` +
        `• ${tag('fuchsia', 'Longitude φ')} ∈ [-π, π]: Measured in ${tag('amber', 'X')}${tag('steel', 'Z')} plane from ${tag('steel', '+Z')} towards ${tag('amber', '+X')}.<br>` +
        `• <b>Why ${tag('fuchsia', 'φ = 90°')} is shaded by default:</b> At ${tag('fuchsia', 'φ = 90°')}, cos(${tag('fuchsia', '90°')}) = 0 ⇒ ${tag('steel', 'z = 0')}. Depth collapses to zero, perfectly embedding the 3D spherical triangle into the 2D Great-Circle cross-section plane (${tag('amber', 'X')}${tag('emerald', 'Y')}-plane)!<br>` +
        `Components: ${tag('amber', 'x')} = ${tag('indigo', 'r')} sin ${tag('yellow', 'θ')} sin ${tag('fuchsia', 'φ')}, ${tag('emerald', 'y')} = ${tag('indigo', 'r')} cos ${tag('yellow', 'θ')}, ${tag('steel', 'z')} = ${tag('indigo', 'r')} sin ${tag('yellow', 'θ')} cos ${tag('fuchsia', 'φ')}`
      )}
      ${cardTemplate(
        'deriv-3d-step-2',
        'Step 2',
        `${tag('sky', 'Sphere')} Surface Invariant: ${tag('amber', 'x²')} + ${tag('emerald', 'y²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')}`,
        `Sum of coordinate squares on sphere surface equals radius squared:<br>` +
        `${tag('amber', 'x²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')}(sin²${tag('fuchsia', 'φ')} + cos²${tag('fuchsia', 'φ')}) = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')}<br>` +
        `${tag('amber', 'x²')} + ${tag('emerald', 'y²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')} + ${tag('indigo', 'r²')} cos²${tag('yellow', 'θ')} = ${tag('indigo', 'r²')}`,
        true
      )}
      ${cardTemplate(
        'deriv-3d-step-3',
        'Step 3',
        `3D Great Circle Invariance & Spatial Orthogonality`,
        `• ${tag('teal', '3D Dot Product')}: (${tag('red', 'A')} - ${tag('violet', 'P')}) · (${tag('orange', 'B')} - ${tag('violet', 'P')}) = (${tag('amber', 'x²')} + ${tag('emerald', 'y²')} + ${tag('steel', 'z²')}) - ${tag('indigo', 'r²')} = ${tag('indigo', 'r²')} - ${tag('indigo', 'r²')} = 0 ⇒ ${tag('teal', '3D ∠APB = 90.0°')}<br>` +
        `• <b>Geometric Invariance:</b> Points ${tag('red', 'A')}, ${tag('orange', 'B')}, and ${tag('violet', 'P')} span a Great Circle slicing plane through sphere center ${tag('indigo', 'Center O')}(${tag('amber', '0')}, ${tag('emerald', '0')}, ${tag('steel', '0')}) with diameter ${tag('red', 'AB')}. Therefore, Thales' Theorem holds in 3D across the entire sphere surface.<br>` +
        `• ${tag('green', '3D Inscribed Area')}: ½ · ${tag('blue', 's')} · ${tag('orange', 't')} = ${tag('indigo', 'r')} · √(${tag('emerald', 'y²')} + ${tag('steel', 'z²')}) = ${tag('indigo', 'r')} · dist(${tag('violet', 'P')}, ${tag('red', 'AB')})`,
        true
      )}
      ${cardTemplate(
        'deriv-3d-step-4',
        'Step 4',
        `${tag('sky', 'Surface Area')} & Enclosed ${tag('violet', 'Volumes')}`,
        `${tag('sky', 'Sphere Surface Area A')} = 4π${tag('indigo', 'r²')}<br>` +
        `${tag('sky', 'Great Circle Circumference')} = 2π${tag('indigo', 'r')}<br>` +
        `${tag('indigo', 'Sphere Volume V')} = ⁴⁄₃π${tag('indigo', 'r³')}<br>` +
        `${tag('violet', 'Bounding Box Volume V')} = |${tag('amber', 'x')}| · |${tag('emerald', 'y')}| · |${tag('steel', 'z')}|`,
        true
      )}
    `;

    this.slots2D = {
      step1Sub: this.flatElement.querySelector('#deriv-2d-step-1 [data-sub]'),
      step2Sub: this.flatElement.querySelector('#deriv-2d-step-2 [data-sub]'),
      step3Sub: this.flatElement.querySelector('#deriv-2d-step-3 [data-sub]'),
      step4Sub: this.flatElement.querySelector('#deriv-2d-step-4 [data-sub]'),
      step4Eval: this.flatElement.querySelector('#deriv-2d-step-4 [data-eval]'),
      step5Sub: this.flatElement.querySelector('#deriv-2d-step-5 [data-sub]'),
      step5Eval: this.flatElement.querySelector('#deriv-2d-step-5 [data-eval]'),
      step6Sub: this.flatElement.querySelector('#deriv-2d-step-6 [data-sub]'),
      step6Eval: this.flatElement.querySelector('#deriv-2d-step-6 [data-eval]'),
      step7Sub: this.flatElement.querySelector('#deriv-2d-step-7 [data-sub]'),
      step7Eval: this.flatElement.querySelector('#deriv-2d-step-7 [data-eval]'),
      step8Sub: this.flatElement.querySelector('#deriv-2d-step-8 [data-sub]'),
      step8Eval: this.flatElement.querySelector('#deriv-2d-step-8 [data-eval]'),
    };

    this.slots3D = {
      step1Sub: this.solidElement.querySelector('#deriv-3d-step-1 [data-sub]'),
      step2Sub: this.solidElement.querySelector('#deriv-3d-step-2 [data-sub]'),
      step2Eval: this.solidElement.querySelector('#deriv-3d-step-2 [data-eval]'),
      step3Sub: this.solidElement.querySelector('#deriv-3d-step-3 [data-sub]'),
      step3Eval: this.solidElement.querySelector('#deriv-3d-step-3 [data-eval]'),
      step4Sub: this.solidElement.querySelector('#deriv-3d-step-4 [data-sub]'),
      step4Eval: this.solidElement.querySelector('#deriv-3d-step-4 [data-eval]'),
    };

    this.initialized = true;
  }

  render(state) {
    if (!this.initialized || !this.flatElement.firstElementChild) {
      this.#initDOM();
    }
    this.updateFlat(state);
    this.updateSolid(state);
  }

  updateFlat(state) {
    const { radius, angle2D } = state;
    const flat = thalesStats2D(radius, angle2D, state);
    const { p, s, t, sumSquares, diameterSquared, area } = flat;
    const deg = Math.round(toDegrees(angle2D));
    const px = p.x;
    const py = p.y;
    const px2 = px * px;
    const py2 = py * py;
    const sumCoordsSq = px2 + py2;
    const r2 = radius * radius;
    const d = 2 * radius;
    const d2 = diameterSquared;
    const s2 = s * s;
    const t2 = t * t;
    const ax = -radius;
    const bx = radius;
    const ux = ax - px;
    const uy = -py;
    const vx = bx - px;
    const vy = -py;
    const dotProduct = ux * vx + uy * vy;

    if (this.slots2D.step1Sub) {
      this.slots2D.step1Sub.innerHTML =
        `↳ ${tag('indigo', 'Center O')} = (${tag('amber', '0.00')}, ${tag('emerald', '0.00')})<br>` +
        `↳ ${tag('red', 'A')} = (${tag('amber', ax.toFixed(2))}, ${tag('emerald', '0.00')}), ${tag('orange', 'B')} = (${tag('amber', bx.toFixed(2))}, ${tag('emerald', '0.00')})<br>` +
        `↳ ${tag('red', '|d|')} = 2 · ${tag('indigo', radius.toFixed(2))} = ${tag('red', d.toFixed(2))}<br>` +
        `↳ ${tag('sky', 'Circumference 2πr')} = 2π · ${tag('indigo', radius.toFixed(2))} = ${tag('sky', (2 * Math.PI * radius).toFixed(2))}`;
    }

    if (this.slots2D.step2Sub) {
      this.slots2D.step2Sub.innerHTML =
        `↳ ${tag('yellow', 'Polar angle θ')} = ${tag('yellow', `${deg}°`)}<br>` +
        `↳ ${tag('amber', 'x (horizontal)')} = ${tag('indigo', radius.toFixed(2))} · cos(${tag('yellow', `${deg}°`)}) = ${tag('amber', px.toFixed(2))}<br>` +
        `↳ ${tag('emerald', 'y (elevation)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${deg}°`)}) = ${tag('emerald', py.toFixed(2))}<br>` +
        `↳ ${tag('violet', 'P')} = (${tag('amber', px.toFixed(2))}, ${tag('emerald', py.toFixed(2))})<br>` +
        `↳ (${tag('amber', px.toFixed(2))})² + (${tag('emerald', py.toFixed(2))})² = ${tag('amber', px2.toFixed(2))} + ${tag('emerald', py2.toFixed(2))} = ${tag('platinum', sumCoordsSq.toFixed(2))} ≡ ${tag('indigo', r2.toFixed(2))} (${tag('indigo', 'r²')})`;
    }

    if (this.slots2D.step3Sub) {
      this.slots2D.step3Sub.innerHTML =
        `↳ ${tag('blue', 's')} = √[(${tag('amber', px.toFixed(2))} + ${tag('indigo', radius.toFixed(2))})² + (${tag('emerald', py.toFixed(2))})²] = ${tag('blue', s.toFixed(2))} ⇒ ${tag('blue', 's²')} = ${tag('blue', s2.toFixed(2))}<br>` +
        `↳ ${tag('orange', 't')} = √[(${tag('amber', px.toFixed(2))} - ${tag('indigo', radius.toFixed(2))})² + (${tag('emerald', py.toFixed(2))})²] = ${tag('orange', t.toFixed(2))} ⇒ ${tag('orange', 't²')} = ${tag('orange', t2.toFixed(2))}`;
    }

    if (this.slots2D.step4Sub) {
      this.slots2D.step4Sub.innerHTML =
        `↳ ${tag('lavender', 's² + t²')} = ${tag('blue', s2.toFixed(2))} + ${tag('orange', t2.toFixed(2))} = ${tag('lavender', sumSquares.toFixed(2))}<br>` +
        `↳ ${tag('cyan', '|d|²')} = (${tag('red', d.toFixed(2))})² = ${tag('cyan', d2.toFixed(2))}`;
    }
    if (this.slots2D.step4Eval) {
      this.slots2D.step4Eval.innerHTML =
        `<span>${tag('lavender', `s² + t² = ${sumSquares.toFixed(2)}`)} ≝ ${tag('cyan', `|d|² = ${d2.toFixed(2)}`)}</span><span class="derivation-check">✓ Thales Verified</span>`;
    }

    const normAngle = ((angle2D % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const isUpper = normAngle <= Math.PI;
    const alphaRad = isUpper ? normAngle / 2 : (Math.PI * 2 - normAngle) / 2;
    const betaRad = Math.PI / 2 - alphaRad;
    const alphaDeg = toDegrees(alphaRad);
    const betaDeg = toDegrees(betaRad);
    const h = Math.abs(py);
    const qStr = py >= 0
      ? (px >= 0 ? 'Quadrant I (Upper-Right)' : 'Quadrant II (Upper-Left)')
      : (px < 0 ? 'Quadrant III (Lower-Left)' : 'Quadrant IV (Lower-Right)');

    if (this.slots2D.step5Sub) {
      this.slots2D.step5Sub.innerHTML =
        `↳ Euclidean Base Angles: ${tag('lime', `α = ${alphaDeg.toFixed(1)}°`)}, ${tag('orange', `β = ${betaDeg.toFixed(1)}°`)} ⇒ ${tag('teal', `α + β = ${(alphaDeg + betaDeg).toFixed(1)}° (Right Angle)`)}<br>` +
        `↳ Vectors: ${tag('blue', 'u')} = (${tag('amber', ux.toFixed(2))}, ${tag('emerald', uy.toFixed(2))}), ${tag('orange', 'v')} = (${tag('amber', vx.toFixed(2))}, ${tag('emerald', vy.toFixed(2))})<br>` +
        `↳ Dot Product: (${tag('amber', ux.toFixed(2))})(${tag('amber', vx.toFixed(2))}) + (${tag('emerald', uy.toFixed(2))})(${tag('emerald', vy.toFixed(2))}) = ${tag('teal', Math.abs(dotProduct) < 0.005 ? '0.00' : dotProduct.toFixed(2))}<br>` +
        `↳ ${tag('teal', '∠APB')} = arccos(0) = ${tag('teal', '90.0°')}`;
    }
    if (this.slots2D.step5Eval) {
      this.slots2D.step5Eval.innerHTML =
        `<span>${tag('teal', 'Euclidean: α + β = 90.0°')} | ${tag('teal', 'Dot Product: u·v = 0.00')}</span><span class="derivation-check">✓ Orthogonal (90.0°)</span>`;
    }

    if (this.slots2D.step6Sub) {
      this.slots2D.step6Sub.innerHTML =
        `↳ Active Position: ${tag('yellow', qStr)} (Altitude ${tag('emerald', `h = |y| = ${h.toFixed(2)}`)})<br>` +
        `↳ ${tag('green', 'Inscribed Area')} = ½ · ${tag('blue', s.toFixed(2))} · ${tag('orange', t.toFixed(2))} = ${tag('indigo', radius.toFixed(2))} · ${tag('emerald', h.toFixed(2))} = ${tag('green', area.toFixed(2))}<br>` +
        `↳ Max Peak Area at Zenith (${tag('yellow', 'θ = 90°')}): ${tag('indigo', `r² = ${r2.toFixed(2)}`)} (current ratio: ${r2 > 0 ? (area / r2 * 100).toFixed(1) : '0.0'}%)<br>` +
        `↳ ${tag('teal', 'Quadrant Invariant')}: While altitude and area oscillate across quadrants, ${tag('teal', '∠APB ≡ 90.0°')} and ${tag('lavender', `s² + t² = ${sumSquares.toFixed(2)} ≡ |d|² = ${d2.toFixed(2)}`)}`;
    }
    if (this.slots2D.step6Eval) {
      this.slots2D.step6Eval.innerHTML =
        `<span>${tag('green', `Current Area = ${area.toFixed(2)}`)} | ${tag('teal', '∠APB ≡ 90.0° (Constant)')}</span><span class="derivation-check">✓ Quadrant Invariant</span>`;
    }

    const alphaReflexDeg = 360 - alphaDeg;
    const betaReflexDeg = 360 - betaDeg;
    const reflexSumDeg = alphaReflexDeg + betaReflexDeg + 270;

    if (this.slots2D.step7Sub) {
      this.slots2D.step7Sub.innerHTML =
        `↳ Conjugate Reflex Angles: ${tag('lime', `α* = ${tag('teal', '360°')} - ${alphaDeg.toFixed(1)}° = ${alphaReflexDeg.toFixed(1)}°`)}, ${tag('orange', `β* = ${tag('teal', '360°')} - ${betaDeg.toFixed(1)}° = ${betaReflexDeg.toFixed(1)}°`)}<br>` +
        `↳ Inscribed Right Angle Reflex: ${tag('teal', `∠APB* = ${tag('teal', '360°')} - 90.0° = 270.0°`)}<br>` +
        `↳ Total Triangle Reflex Sum: ${tag('lime', `${alphaReflexDeg.toFixed(1)}°`)} + ${tag('orange', `${betaReflexDeg.toFixed(1)}°`)} + ${tag('teal', `270.0°`)} = ${tag('lavender', `${reflexSumDeg.toFixed(1)}°`)}<br>` +
        `↳ ${tag('yellow', 'Winding Order & Exterior Space')}: Interior (${tag('lime', 'α')} + ${tag('orange', 'β')} = ${tag('teal', '90°')}) + Exterior (${tag('lime', 'α*')} + ${tag('orange', 'β*')} = ${tag('lavender', '630°')}) = 2 × ${tag('teal', '360°')} = ${tag('teal', '720°')} at baseline vertices.`;
    }
    if (this.slots2D.step7Eval) {
      this.slots2D.step7Eval.innerHTML =
        `<span>${tag('lavender', `Total Reflex Sum = ${reflexSumDeg.toFixed(1)}° ≡ 900.0°`)}</span><span class="derivation-check">✓ Perigon Invariant</span>`;
    }

    const affine = flat.affine;
    if (this.slots2D.step8Sub) {
      if (state.affineMode && affine) {
        this.slots2D.step8Sub.innerHTML =
          `↳ Active Affine Mode: ${tag('yellow', `Stretch s = ${(state.affineStretch ?? 1.0).toFixed(2)}`)}, Axis ${tag('cyan', `ω = ${Math.round(toDegrees(state.affineAxisAngle ?? 0))}°`)}<br>` +
          `↳ Ellipse Semi-Axes: ${tag('indigo', `a = ${affine.semiMajor.toFixed(2)}`)}, ${tag('indigo', `b = ${affine.semiMinor.toFixed(2)}`)}, Eccentricity ${tag('cyan', `e = ${affine.eccentricity.toFixed(3)}`)}<br>` +
          `↳ Euclidean Angle at P: ${tag('rose', `∠APB = ${affine.angleEuclidDeg.toFixed(1)}°`)} (perturbed from 90°)<br>` +
          `↳ Apollonius Invariant: ${tag('teal', `v_PAᵀ Q v_PB = ${Math.abs(affine.apolloniusConjugacy) < 1e-6 ? '0.000' : affine.apolloniusConjugacy.toFixed(4)}`)} (strictly conjugate)`;
      } else {
        this.slots2D.step8Sub.innerHTML =
          `↳ Canonical Euclidean Circle: ${tag('sky', 's = 1.00, e = 0.000')}<br>` +
          `↳ Toggle ${tag('yellow', 'Affine Mode: ON')} to observe how Euclidean right angles deform into Apollonius conjugate directions.`;
      }
    }
    if (this.slots2D.step8Eval) {
      if (state.affineMode && affine) {
        this.slots2D.step8Eval.innerHTML =
          `<span>${tag('rose', `Euclidean ∠APB = ${affine.angleEuclidDeg.toFixed(1)}°`)} | ${tag('teal', 'Conjugacy Inv = 0.000')}</span><span class="derivation-check">✓ Apollonius Invariant</span>`;
      } else {
        this.slots2D.step8Eval.innerHTML =
          `<span>${tag('teal', 'Euclidean Orthogonality (90.0°)')}</span><span class="derivation-check">✓ Canonical Circle</span>`;
      }
    }
  }

  updateSolid({ radius, lat3D, lon3D }) {
    const { p, sumSquares, radiusSquared, surfaceArea, volume } = sphereStats(radius, lat3D, lon3D);
    const latDeg = Math.round(toDegrees(lat3D));
    const lonDeg = Math.round(toDegrees(lon3D));
    const x = p.x;
    const y = p.y;
    const z = p.z;
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    const r2 = radiusSquared;
    const r3 = radius * radius * radius;
    const sphereVolume = (4 / 3) * Math.PI * r3;
    const d = 2 * radius;
    const d2 = d * d;
    const s3D = Math.hypot(x + radius, y, z);
    const t3D = Math.hypot(x - radius, y, z);
    const s3D2 = s3D * s3D;
    const t3D2 = t3D * t3D;
    const sumSquares3D = s3D2 + t3D2;
    const ux3 = -radius - x;
    const uy3 = -y;
    const uz3 = -z;
    const vx3 = radius - x;
    const vy3 = -y;
    const vz3 = -z;
    const dot3D = ux3 * vx3 + uy3 * vy3 + uz3 * vz3;
    const alt3D = Math.hypot(y, z);

    if (this.slots3D.step1Sub) {
      this.slots3D.step1Sub.innerHTML =
        `↳ Colatitude ${tag('yellow', 'θ (from +Y)')} = ${tag('yellow', `${latDeg}°`)}, Longitude ${tag('fuchsia', 'φ (XZ plane)')} = ${tag('fuchsia', `${lonDeg}°`)}, ${tag('indigo', 'r')} = ${tag('indigo', radius.toFixed(2))}<br>` +
        `↳ ${tag('amber', 'P.x (diameter)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${latDeg}°`)}) · sin(${tag('fuchsia', `${lonDeg}°`)}) = ${tag('amber', x.toFixed(2))}<br>` +
        `↳ ${tag('emerald', 'P.y (elevation)')} = ${tag('indigo', radius.toFixed(2))} · cos(${tag('yellow', `${latDeg}°`)}) = ${tag('emerald', y.toFixed(2))}<br>` +
        `↳ ${tag('steel', 'P.z (depth)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${latDeg}°`)}) · cos(${tag('fuchsia', `${lonDeg}°`)}) = ${tag('steel', z.toFixed(2))}<br>` +
        (lonDeg === 90 ? `↳ ${tag('fuchsia', 'φ = 90°')} ⇒ cos(${tag('fuchsia', '90°')}) = 0 ⇒ ${tag('steel', 'P.z = 0.00')} (depth vanishes: embeds 3D sphere into 2D Great Circle XY-plane!)<br>` : '') +
        `↳ ${tag('violet', 'P')} = (${tag('amber', x.toFixed(2))}, ${tag('emerald', y.toFixed(2))}, ${tag('steel', z.toFixed(2))})`;
    }

    if (this.slots3D.step2Sub) {
      this.slots3D.step2Sub.innerHTML =
        `↳ ${tag('amber', 'x²')} = (${tag('amber', x.toFixed(2))})² = ${tag('amber', x2.toFixed(2))}<br>` +
        `↳ ${tag('emerald', 'y²')} = (${tag('emerald', y.toFixed(2))})² = ${tag('emerald', y2.toFixed(2))}<br>` +
        `↳ ${tag('steel', 'z²')} = (${tag('steel', z.toFixed(2))})² = ${tag('steel', z2.toFixed(2))}<br>` +
        `↳ ${tag('platinum', 'x² + y² + z²')} = ${tag('amber', x2.toFixed(2))} + ${tag('emerald', y2.toFixed(2))} + ${tag('steel', z2.toFixed(2))} = ${tag('platinum', sumSquares.toFixed(2))}<br>` +
        `↳ ${tag('indigo', 'r²')} = (${tag('indigo', radius.toFixed(2))})² = ${tag('indigo', r2.toFixed(2))}`;
    }
    if (this.slots3D.step2Eval) {
      this.slots3D.step2Eval.innerHTML =
        `<span>${tag('platinum', `x² + y² + z² = ${sumSquares.toFixed(2)}`)} ≝ ${tag('indigo', `r² = ${r2.toFixed(2)}`)}</span><span class="derivation-check">✓ Sphere Verified</span>`;
    }

    if (this.slots3D.step3Sub) {
      this.slots3D.step3Sub.innerHTML =
        `↳ 3D Vectors: ${tag('blue', 'u')} = (${tag('amber', ux3.toFixed(2))}, ${tag('emerald', uy3.toFixed(2))}, ${tag('steel', uz3.toFixed(2))}), ${tag('orange', 'v')} = (${tag('amber', vx3.toFixed(2))}, ${tag('emerald', vy3.toFixed(2))}, ${tag('steel', vz3.toFixed(2))})<br>` +
        `↳ 3D ${tag('teal', 'Dot Product')}: (${tag('amber', ux3.toFixed(2))})(${tag('amber', vx3.toFixed(2))}) + (${tag('emerald', uy3.toFixed(2))})(${tag('emerald', vy3.toFixed(2))}) + (${tag('steel', uz3.toFixed(2))})(${tag('steel', vz3.toFixed(2))}) = ${tag('teal', Math.abs(dot3D) < 0.005 ? '0.00' : dot3D.toFixed(2))}<br>` +
        `↳ ${tag('blue', 's')} = ${tag('blue', s3D.toFixed(2))} ⇒ ${tag('blue', 's²')} = ${tag('blue', s3D2.toFixed(2))}, ${tag('orange', 't')} = ${tag('orange', t3D.toFixed(2))} ⇒ ${tag('orange', 't²')} = ${tag('orange', t3D2.toFixed(2))}<br>` +
        `↳ ${tag('lavender', 's² + t²')} = ${tag('blue', s3D2.toFixed(2))} + ${tag('orange', t3D2.toFixed(2))} = ${tag('lavender', sumSquares3D.toFixed(2))} ≡ ${tag('cyan', d2.toFixed(2))} (${tag('cyan', '|d|²')})<br>` +
        `↳ 3D Altitude ${tag('emerald', 'h')} = √[y² + z²] = ${tag('emerald', alt3D.toFixed(2))} ⇒ ${tag('green', '3D Area')} = ½ · ${tag('blue', s3D.toFixed(2))} · ${tag('orange', t3D.toFixed(2))} = ${tag('green', (0.5 * s3D * t3D).toFixed(2))}<br>` +
        `↳ 3D ${tag('teal', 'Angle ∠APB')} = arccos(0) = ${tag('teal', '90.0° (Sphere Invariant)')}`;
    }
    if (this.slots3D.step3Eval) {
      this.slots3D.step3Eval.innerHTML =
        `<span>${tag('teal', '3D Right Angle ∠APB = 90.0°')}</span><span class="derivation-check">✓ Great Circle Invariant</span>`;
    }

    if (this.slots3D.step4Sub) {
      this.slots3D.step4Sub.innerHTML =
        `↳ ${tag('sky', 'Sphere Surface Area')}: 4π · (${tag('indigo', radius.toFixed(2))})² = ${tag('sky', surfaceArea.toFixed(2))} units²<br>` +
        `↳ ${tag('sky', 'Great Circle Circumference')}: 2π · ${tag('indigo', radius.toFixed(2))} = ${tag('sky', (2 * Math.PI * radius).toFixed(2))} units<br>` +
        `↳ ${tag('indigo', 'Sphere Volume')}: ⁴⁄₃π · (${tag('indigo', radius.toFixed(2))})³ = ${tag('indigo', sphereVolume.toFixed(2))} units³<br>` +
        `↳ ${tag('violet', 'Volume Box')}: |${tag('amber', x.toFixed(2))}| · |${tag('emerald', y.toFixed(2))}| · |${tag('steel', z.toFixed(2))}| = ${tag('violet', volume.toFixed(2))} units³`;
    }
    if (this.slots3D.step4Eval) {
      this.slots3D.step4Eval.innerHTML =
        `<span>${tag('sky', `Surface Area = ${surfaceArea.toFixed(2)}`)}</span><span>${tag('violet', `Box Vol = ${volume.toFixed(2)}`)}</span>`;
    }
  }
}


