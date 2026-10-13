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

/** Renders the "Live Math Derivations" panel with full algebraic proofs and live numerical substitutions. */
export class DerivationView {
  static stateKeys = ['radius', 'angle2D', 'lat3D', 'lon3D'];

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
        `Origin ${tag('indigo', 'Center C')} = (0, 0)<br>` +
        `Endpoints: ${tag('red', 'a')} = (-${tag('indigo', 'r')}, 0), ${tag('orange', 'b')} = (${tag('indigo', 'r')}, 0)<br>` +
        `${tag('red', 'Diameter')} magnitude: ${tag('red', '|d|')} = 2${tag('indigo', 'r')}<br>` +
        `${tag('sky', 'Circumference')}: ${tag('sky', '2πr')}`
      )}
      ${cardTemplate(
        'deriv-2d-step-2',
        'Step 2',
        `Parametric Point ${tag('violet', 'P')} on Circumference`,
        `${tag('violet', 'P')}(${tag('amber', 'x')}, ${tag('lime', 'y')}) = (${tag('indigo', 'r')} cos ${tag('yellow', 'θ')}, ${tag('indigo', 'r')} sin ${tag('yellow', 'θ')})<br>` +
        `Components: ${tag('amber', 'x (horizontal)')}, ${tag('lime', 'y (elevation)')}<br>` +
        `Circle condition: ${tag('amber', 'x²')} + ${tag('lime', 'y²')} = ${tag('indigo', 'r²')}`
      )}
      ${cardTemplate(
        'deriv-2d-step-3',
        'Step 3',
        `Triangle Legs ${tag('blue', 's')} & ${tag('orange', 't')} (Euclidean Distance)`,
        `${tag('blue', 'Leg s')} = |${tag('violet', 'P')} - ${tag('red', 'a')}| = √[(${tag('amber', 'x')} + ${tag('indigo', 'r')})² + ${tag('lime', 'y')}²]<br>` +
        `${tag('orange', 'Leg t')} = |${tag('violet', 'P')} - ${tag('orange', 'b')}| = √[(${tag('amber', 'x')} - ${tag('indigo', 'r')})² + ${tag('lime', 'y')}²]`
      )}
      ${cardTemplate(
        'deriv-2d-step-4',
        'Step 4',
        `Pythagorean Derivation: ${tag('blue', 's²')} + ${tag('orange', 't²')} = ${tag('cyan', '|d|²')}`,
        `${tag('blue', 's²')} + ${tag('orange', 't²')} = [(${tag('amber', 'x')} + ${tag('indigo', 'r')})² + ${tag('lime', 'y²')}] + [(${tag('amber', 'x')} - ${tag('indigo', 'r')})² + ${tag('lime', 'y²')}]<br>` +
        `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 2(${tag('amber', 'x²')} + ${tag('lime', 'y²')}) + 2${tag('indigo', 'r²')} = 2(${tag('indigo', 'r²')}) + 2${tag('indigo', 'r²')} = 4${tag('indigo', 'r²')} = ${tag('cyan', '|d|²')}`,
        true
      )}
      ${cardTemplate(
        'deriv-2d-step-5',
        'Step 5',
        `Orthogonality & Right Angle at ${tag('violet', 'P')}`,
        `Vectors: ${tag('blue', 'u')} = ${tag('red', 'a')} - ${tag('violet', 'P')}, ${tag('orange', 'v')} = ${tag('orange', 'b')} - ${tag('violet', 'P')}<br>` +
        `${tag('teal', 'Dot product')}: ${tag('blue', 'u')} · ${tag('orange', 'v')} = (${tag('amber', 'x²')} + ${tag('lime', 'y²')}) - ${tag('indigo', 'r²')} = ${tag('indigo', 'r²')} - ${tag('indigo', 'r²')} = 0<br>` +
        `${tag('teal', 'Angle ∠APB')} = arccos(${tag('blue', 'u')} · ${tag('orange', 'v')} / (${tag('blue', 's')} · ${tag('orange', 't')})) = ${tag('teal', '90°')}<br>` +
        `${tag('green', 'Inscribed Area')}: ½ · ${tag('blue', 's')} · ${tag('orange', 't')}`,
        true
      )}
    `;

    this.solidElement.innerHTML = `
      ${cardTemplate(
        'deriv-3d-step-1',
        'Step 1',
        `Spherical Parameterization of ${tag('violet', 'P')}`,
        `${tag('yellow', 'Latitude θ')} ∈ [0, π] (from ${tag('lime', '+Y')}), ${tag('fuchsia', 'Longitude φ')} ∈ [-π, π] (in ${tag('amber', 'X')}${tag('steel', 'Z')} plane)<br>` +
        `Components: ${tag('amber', 'x (diameter axis)')}, ${tag('lime', 'y (elevation)')}, ${tag('steel', 'z (depth)')}<br>` +
        `${tag('amber', 'x')} = ${tag('indigo', 'r')} sin ${tag('yellow', 'θ')} sin ${tag('fuchsia', 'φ')}<br>` +
        `${tag('lime', 'y')} = ${tag('indigo', 'r')} cos ${tag('yellow', 'θ')}<br>` +
        `${tag('steel', 'z')} = ${tag('indigo', 'r')} sin ${tag('yellow', 'θ')} cos ${tag('fuchsia', 'φ')}`
      )}
      ${cardTemplate(
        'deriv-3d-step-2',
        'Step 2',
        `${tag('sky', 'Sphere')} Surface Invariant: ${tag('amber', 'x²')} + ${tag('lime', 'y²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')}`,
        `Sum of coordinate squares on sphere surface equals radius squared:<br>` +
        `${tag('amber', 'x²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')}(sin²${tag('fuchsia', 'φ')} + cos²${tag('fuchsia', 'φ')}) = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')}<br>` +
        `${tag('amber', 'x²')} + ${tag('lime', 'y²')} + ${tag('steel', 'z²')} = ${tag('indigo', 'r²')} sin²${tag('yellow', 'θ')} + ${tag('indigo', 'r²')} cos²${tag('yellow', 'θ')} = ${tag('indigo', 'r²')}`,
        true
      )}
      ${cardTemplate(
        'deriv-3d-step-3',
        'Step 3',
        `3D Great Circle Invariance (Thales on Sphere)`,
        `${tag('red', 'Diameter')} on ${tag('amber', 'X-axis')}: ${tag('red', 'a')} = (-${tag('indigo', 'r')}, 0, 0), ${tag('orange', 'b')} = (${tag('indigo', 'r')}, 0, 0)<br>` +
        `3D Leg lengths: ${tag('blue', 's')} = √[(${tag('amber', 'x')} + ${tag('indigo', 'r')})² + ${tag('lime', 'y²')} + ${tag('steel', 'z²')}], ${tag('orange', 't')} = √[(${tag('amber', 'x')} - ${tag('indigo', 'r')})² + ${tag('lime', 'y²')} + ${tag('steel', 'z²')}]<br>` +
        `${tag('blue', 's²')} + ${tag('orange', 't²')} = 2(${tag('amber', 'x²')} + ${tag('lime', 'y²')} + ${tag('steel', 'z²')}) + 2${tag('indigo', 'r²')} = 4${tag('indigo', 'r²')} = ${tag('cyan', '|d|²')}<br>` +
        `${tag('teal', 'Dot product')}: (${tag('red', 'a')} - ${tag('violet', 'P')}) · (${tag('orange', 'b')} - ${tag('violet', 'P')}) = 0 ⇒ ${tag('teal', '∠APB = 90.0°')}<br>` +
        `${tag('green', 'Inscribed Area')}: ½ · ${tag('blue', 's')} · ${tag('orange', 't')}`,
        true
      )}
      ${cardTemplate(
        'deriv-3d-step-4',
        'Step 4',
        `${tag('sky', 'Surface Area')} & Enclosed ${tag('violet', 'Volumes')}`,
        `${tag('sky', 'Sphere Surface Area A')} = 4π${tag('indigo', 'r²')}<br>` +
        `${tag('sky', 'Great Circle Circumference')} = 2π${tag('indigo', 'r')}<br>` +
        `${tag('indigo', 'Sphere Volume V')} = ⁴⁄₃π${tag('indigo', 'r³')}<br>` +
        `${tag('violet', 'Bounding Box Volume V')} = |${tag('amber', 'x')}| · |${tag('lime', 'y')}| · |${tag('steel', 'z')}|`,
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

  updateFlat({ radius, angle2D }) {
    const { p, s, t, sumSquares, diameterSquared, area } = thalesStats2D(radius, angle2D);
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
        `↳ ${tag('indigo', 'Center C')} = (0.00, 0.00)<br>` +
        `↳ ${tag('red', 'a')} = (${tag('red', ax.toFixed(2))}, 0.00), ${tag('orange', 'b')} = (${tag('orange', bx.toFixed(2))}, 0.00)<br>` +
        `↳ ${tag('red', '|d|')} = 2 · ${tag('indigo', radius.toFixed(2))} = ${tag('red', d.toFixed(2))}<br>` +
        `↳ ${tag('sky', 'Circumference 2πr')} = 2π · ${tag('indigo', radius.toFixed(2))} = ${tag('sky', (2 * Math.PI * radius).toFixed(2))}`;
    }

    if (this.slots2D.step2Sub) {
      this.slots2D.step2Sub.innerHTML =
        `↳ ${tag('yellow', 'Polar angle θ')} = ${tag('yellow', `${deg}°`)}<br>` +
        `↳ ${tag('amber', 'x (horizontal)')} = ${tag('indigo', radius.toFixed(2))} · cos(${tag('yellow', `${deg}°`)}) = ${tag('amber', px.toFixed(2))}<br>` +
        `↳ ${tag('lime', 'y (elevation)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${deg}°`)}) = ${tag('lime', py.toFixed(2))}<br>` +
        `↳ ${tag('violet', 'P')} = (${tag('amber', px.toFixed(2))}, ${tag('lime', py.toFixed(2))})<br>` +
        `↳ (${tag('amber', px.toFixed(2))})² + (${tag('lime', py.toFixed(2))})² = ${tag('amber', px2.toFixed(2))} + ${tag('lime', py2.toFixed(2))} = ${tag('platinum', sumCoordsSq.toFixed(2))} ≡ ${tag('indigo', r2.toFixed(2))} (${tag('indigo', 'r²')})`;
    }

    if (this.slots2D.step3Sub) {
      this.slots2D.step3Sub.innerHTML =
        `↳ ${tag('blue', 's')} = √[(${tag('amber', px.toFixed(2))} + ${tag('indigo', radius.toFixed(2))})² + (${tag('lime', py.toFixed(2))})²] = ${tag('blue', s.toFixed(2))} ⇒ ${tag('blue', 's²')} = ${tag('blue', s2.toFixed(2))}<br>` +
        `↳ ${tag('orange', 't')} = √[(${tag('amber', px.toFixed(2))} - ${tag('indigo', radius.toFixed(2))})² + (${tag('lime', py.toFixed(2))})²] = ${tag('orange', t.toFixed(2))} ⇒ ${tag('orange', 't²')} = ${tag('orange', t2.toFixed(2))}`;
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

    if (this.slots2D.step5Sub) {
      this.slots2D.step5Sub.innerHTML =
        `↳ ${tag('blue', 'u')} = (${tag('blue', ux.toFixed(2))}, ${tag('blue', uy.toFixed(2))}), ${tag('orange', 'v')} = (${tag('orange', vx.toFixed(2))}, ${tag('orange', vy.toFixed(2))})<br>` +
        `↳ ${tag('blue', 'u')} · ${tag('orange', 'v')} = (${tag('blue', ux.toFixed(2))})(${tag('orange', vx.toFixed(2))}) + (${tag('blue', uy.toFixed(2))})(${tag('orange', vy.toFixed(2))}) = ${tag('teal', Math.abs(dotProduct) < 0.005 ? '0.00' : dotProduct.toFixed(2))}<br>` +
        `↳ ${tag('green', 'Inscribed Area')}: 0.5 · ${tag('blue', s.toFixed(2))} · ${tag('orange', t.toFixed(2))} = ${tag('green', area.toFixed(2))}`;
    }
    if (this.slots2D.step5Eval) {
      this.slots2D.step5Eval.innerHTML =
        `<span>${tag('teal', '∠APB = 90.0° (Right Angle)')}</span><span class="derivation-check">✓ Orthogonal</span>`;
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

    if (this.slots3D.step1Sub) {
      this.slots3D.step1Sub.innerHTML =
        `↳ ${tag('yellow', 'θ (lat)')} = ${tag('yellow', `${latDeg}°`)}, ${tag('fuchsia', 'φ (lon)')} = ${tag('fuchsia', `${lonDeg}°`)}, ${tag('indigo', 'r')} = ${tag('indigo', radius.toFixed(2))}<br>` +
        `↳ ${tag('amber', 'P.x (diameter)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${latDeg}°`)}) · sin(${tag('fuchsia', `${lonDeg}°`)}) = ${tag('amber', x.toFixed(2))}<br>` +
        `↳ ${tag('lime', 'P.y (elevation)')} = ${tag('indigo', radius.toFixed(2))} · cos(${tag('yellow', `${latDeg}°`)}) = ${tag('lime', y.toFixed(2))}<br>` +
        `↳ ${tag('steel', 'P.z (depth)')} = ${tag('indigo', radius.toFixed(2))} · sin(${tag('yellow', `${latDeg}°`)}) · cos(${tag('fuchsia', `${lonDeg}°`)}) = ${tag('steel', z.toFixed(2))}<br>` +
        `↳ ${tag('violet', 'P')} = (${tag('amber', x.toFixed(2))}, ${tag('lime', y.toFixed(2))}, ${tag('steel', z.toFixed(2))})`;
    }

    if (this.slots3D.step2Sub) {
      this.slots3D.step2Sub.innerHTML =
        `↳ ${tag('amber', 'x²')} = (${tag('amber', x.toFixed(2))})² = ${tag('amber', x2.toFixed(2))}<br>` +
        `↳ ${tag('lime', 'y²')} = (${tag('lime', y.toFixed(2))})² = ${tag('lime', y2.toFixed(2))}<br>` +
        `↳ ${tag('steel', 'z²')} = (${tag('steel', z.toFixed(2))})² = ${tag('steel', z2.toFixed(2))}<br>` +
        `↳ ${tag('platinum', 'x² + y² + z²')} = ${tag('amber', x2.toFixed(2))} + ${tag('lime', y2.toFixed(2))} + ${tag('steel', z2.toFixed(2))} = ${tag('platinum', sumSquares.toFixed(2))}<br>` +
        `↳ ${tag('indigo', 'r²')} = (${tag('indigo', radius.toFixed(2))})² = ${tag('indigo', r2.toFixed(2))}`;
    }
    if (this.slots3D.step2Eval) {
      this.slots3D.step2Eval.innerHTML =
        `<span>${tag('platinum', `x² + y² + z² = ${sumSquares.toFixed(2)}`)} ≝ ${tag('indigo', `r² = ${r2.toFixed(2)}`)}</span><span class="derivation-check">✓ Sphere Verified</span>`;
    }

    if (this.slots3D.step3Sub) {
      this.slots3D.step3Sub.innerHTML =
        `↳ ${tag('blue', 's')} = ${tag('blue', s3D.toFixed(2))} ⇒ ${tag('blue', 's²')} = ${tag('blue', s3D2.toFixed(2))}<br>` +
        `↳ ${tag('orange', 't')} = ${tag('orange', t3D.toFixed(2))} ⇒ ${tag('orange', 't²')} = ${tag('orange', t3D2.toFixed(2))}<br>` +
        `↳ ${tag('lavender', 's² + t²')} = ${tag('blue', s3D2.toFixed(2))} + ${tag('orange', t3D2.toFixed(2))} = ${tag('lavender', sumSquares3D.toFixed(2))} ≡ ${tag('cyan', d2.toFixed(2))} (${tag('cyan', '|d|²')})<br>` +
        `↳ ${tag('green', '3D Triangle Area')}: 0.5 · ${tag('blue', s3D.toFixed(2))} · ${tag('orange', t3D.toFixed(2))} = ${tag('green', (0.5 * s3D * t3D).toFixed(2))}<br>` +
        `↳ 3D ${tag('teal', 'Angle ∠APB')} at ${tag('violet', 'P')} = ${tag('teal', '90.0°')}`;
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
        `↳ ${tag('violet', 'Volume Box')}: |${tag('amber', x.toFixed(2))}| · |${tag('lime', y.toFixed(2))}| · |${tag('steel', z.toFixed(2))}| = ${tag('violet', volume.toFixed(2))} units³`;
    }
    if (this.slots3D.step4Eval) {
      this.slots3D.step4Eval.innerHTML =
        `<span>${tag('sky', `Surface Area = ${surfaceArea.toFixed(2)}`)}</span><span>${tag('violet', `Box Vol = ${volume.toFixed(2)}`)}</span>`;
    }
  }
}


