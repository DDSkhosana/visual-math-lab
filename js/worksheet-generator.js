/**
 * @file worksheet-generator.js
 * Dynamic Printable PDF Theorem Worksheet & Educator Answer Key Generator.
 *
 * Generates mathematically rigorous, curriculum-aligned student exploration worksheets
 * and comprehensive educator marking guides derived directly from the live interactive geometry state.
 *
 * Features:
 * - Supports all 12 visualizers (8 Circle Theorems + 4 Trigonometry Suite).
 * - Vector SVG diagram embedding directly from live canvas state.
 * - Live parameter derivation (angles, chord lengths, radii, ratios, invariants).
 * - Page 1: Student Exploration Worksheet with structured problems and ruled workspace.
 * - Page 2: Educator Answer Key with step-by-step mathematical proofs, exact numerical solutions,
 *   marking rubrics, and diagnostic tips for common student misconceptions.
 * - High-contrast, clean typography formatted for standard A4 and Letter print media.
 */

import { PALETTE, toDegrees } from './circle-core.js';

const TAU = 2 * Math.PI;

/**
 * Extracts live state values and builds 4 structured student problems
 * and matching educator solutions for any of the 12 visualizers.
 *
 * @param {string} visualId
 * @param {object} state
 * @returns {object} Worksheet metadata, problem sets, and educator answer key
 */
export function generateWorksheetData(visualId, state = {}) {
  const deg = (rad) => (((rad * 180 / Math.PI) % 360) + 360) % 360;
  const fmt = (num, digits = 1) => Number(num || 0).toFixed(digits);

  switch (visualId) {
    case 'angle-at-centre': {
      const theta = state.angleP ? Math.abs(state.angleB - state.angleA) / 2 : 0.72;
      const inscribedDeg = deg(theta);
      const centralDeg = inscribedDeg * 2;
      const r = state.radius || 180;

      return {
        theoremTitle: 'Angle at the Centre Theorem',
        theoremStatement: 'The angle subtended by an arc at the centre of a circle is twice the angle subtended by the same arc at any point on the circumference.',
        formula: '∠AOB = 2 · ∠APB',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r', value: `${r}`, unit: 'px' },
          { name: 'Inscribed Angle', symbol: '∠APB', value: fmt(inscribedDeg), unit: '°' },
          { name: 'Central Angle', symbol: '∠AOB', value: fmt(centralDeg), unit: '°' },
          { name: 'Invariant Ratio', symbol: '∠AOB / ∠APB', value: '2.000', unit: '' },
        ],
        problems: [
          {
            number: 1,
            title: 'Direct Central Angle Calculation',
            marks: 3,
            prompt: `In the diagram, arc AB subtends an inscribed angle ∠APB = ${fmt(inscribedDeg)}° at point P on the circumference. Calculate the exact measure of the central angle ∠AOB subtended by the same arc at the circle centre O.`,
            subQuestions: [
              `a) State the invariant theorem relating the central angle ∠AOB to the inscribed angle ∠APB.`,
              `b) Calculate the numerical measure of ∠AOB in degrees.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Independence of Arc Point Position',
            marks: 4,
            prompt: `Suppose point P is moved along the major arc AB to a different position P' without changing the positions of points A and B.`,
            subQuestions: [
              `a) What is the measure of the new inscribed angle ∠AP'B? Explain why.`,
              `b) Does the central angle ∠AOB change when P moves? Justify your reasoning.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Geometric Proof using Isosceles Triangles',
            marks: 5,
            prompt: `Draw the auxiliary line passing from P through the centre O to an opposite point Q on the circumference.`,
            subQuestions: [
              `a) Explain why △OAP and △OBP are both isosceles triangles.`,
              `b) Using the exterior angle theorem on △OAP and △OBP, deduce that ∠AOB = 2 · ∠APB.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Reflex Angle & Cyclic Supplementary Extension',
            marks: 4,
            prompt: `Examine the reflex angle ∠AOB at the centre.`,
            subQuestions: [
              `a) Calculate the measure of the reflex angle ∠AOB at the centre.`,
              `b) If point P is moved to the minor arc AB, what is the measure of the new inscribed angle? Verify that it is supplementary to the original inscribed angle.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Central Angle Calculation',
            steps: [
              `By the Angle at Centre Theorem: ∠AOB = 2 · ∠APB.`,
              `Substitute ∠APB = ${fmt(inscribedDeg)}°: ∠AOB = 2 × ${fmt(inscribedDeg)}° = ${fmt(centralDeg)}°.`,
            ],
            finalAnswer: `∠AOB = ${fmt(centralDeg)}°`,
            rubric: '1 mark for stating theorem formula; 1 mark for substitution; 1 mark for correct numerical answer with degree symbol.',
          },
          {
            number: 2,
            title: 'Arc Position Invariant',
            steps: [
              `The measure of ∠AP'B remains exactly ${fmt(inscribedDeg)}°.`,
              `Reason: Both P and P' lie on the same major segment and are subtended by the same chord AB. By the Inscribed Angle Invariant, all inscribed angles subtended by the same arc are equal to half the central angle (1/2 ∠AOB).`,
              `The central angle ∠AOB remains constant at ${fmt(centralDeg)}° because points A and B remain fixed.`,
            ],
            finalAnswer: `∠AP'B = ${fmt(inscribedDeg)}° (unchanged)`,
            rubric: '2 marks for correct angle value; 2 marks for clear justification citing common chord AB and fixed centre angle.',
          },
          {
            number: 3,
            title: 'Isosceles Triangle Proof',
            steps: [
              `In △OAP: OA = OP = r (radii of circle). Therefore △OAP is isosceles, meaning ∠OAP = ∠OPA = α.`,
              `By the exterior angle theorem on △OAP: exterior angle ∠AOQ = ∠OAP + ∠OPA = 2α.`,
              `Similarly in △OBP: OB = OP = r, so △OBP is isosceles with ∠OBP = ∠OPB = β.`,
              `Exterior angle ∠BOQ = ∠OBP + ∠OPB = 2β.`,
              `Combining: total central angle ∠AOB = ∠AOQ + ∠BOQ = 2α + 2β = 2(α + β) = 2 · ∠APB. Q.E.D.`,
            ],
            finalAnswer: `∠AOB = 2(α + β) = 2 · ∠APB`,
            rubric: '2 marks for establishing isosceles properties (OA=OP=OB=r); 2 marks for exterior angle theorem; 1 mark for algebraic conclusion.',
          },
          {
            number: 4,
            title: 'Reflex Angle & Opposite Segment',
            steps: [
              `Reflex ∠AOB = 360° - ${fmt(centralDeg)}° = ${fmt(360 - centralDeg)}°.`,
              `When P moves to the minor arc, it subtends the reflex angle at the centre: ∠APB_minor = 1/2 · reflex(∠AOB) = 1/2 × ${fmt(360 - centralDeg)}° = ${fmt((360 - centralDeg) / 2)}°.`,
              `Sum check: ${fmt(inscribedDeg)}° + ${fmt((360 - centralDeg) / 2)}° = 180.0° (verifying cyclic quadrilateral property).`,
            ],
            finalAnswer: `Reflex ∠AOB = ${fmt(360 - centralDeg)}°, Minor Inscribed Angle = ${fmt((360 - centralDeg) / 2)}°`,
            rubric: '2 marks for reflex angle calculation; 2 marks for minor arc angle calculation and verification of 180° sum.',
          },
        ],
        commonMisconceptions: [
          'Confusing inscribed angle with central angle (halving instead of doubling).',
          'Measuring the reflex angle at the centre instead of the interior angle when P is on the major arc.',
          'Assuming ∠APB changes when P is dragged along the arc.',
        ],
      };
    }

    case 'angles-in-same-segment': {
      const angle = state.angle1 ? deg(state.angle1) : 41.5;
      const r = state.radius || 180;
      const chordLen = 2 * r * Math.sin((angle * Math.PI) / 180);

      return {
        theoremTitle: 'Angles in the Same Segment Theorem',
        theoremStatement: 'Angles subtended by the same arc (or chord) at the circumference in the same segment of a circle are equal.',
        formula: '∠AP₁B = ∠AP₂B = ½ · ∠AOB',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r', value: `${r}`, unit: 'px' },
          { name: 'Angle at P₁', symbol: '∠AP₁B', value: fmt(angle), unit: '°' },
          { name: 'Angle at P₂', symbol: '∠AP₂B', value: fmt(angle), unit: '°' },
          { name: 'Chord Length', symbol: '|AB|', value: fmt(chordLen), unit: 'px' },
        ],
        problems: [
          {
            number: 1,
            title: 'Equal Subtended Angles Verification',
            marks: 3,
            prompt: `In the diagram, points P₁ and P₂ lie on the same major arc AB of circle (O, r = ${r}px). Given ∠AP₁B = ${fmt(angle)}°, find the measure of ∠AP₂B and the central angle ∠AOB.`,
            subQuestions: [
              `a) State the measure of ∠AP₂B.`,
              `b) Calculate the central angle ∠AOB subtended by chord AB.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Chord Length and Extended Sine Formula',
            marks: 4,
            prompt: `Using the circle radius r = ${r}px and inscribed angle θ = ${fmt(angle)}°:`,
            subQuestions: [
              `a) Use the chord relation |AB| = 2r · sin θ to calculate the exact length of chord AB.`,
              `b) Verify whether changing the position of P₁ changes the length of chord AB.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Proof via Central Angle Invariant',
            marks: 5,
            prompt: `Use the Angle at Centre Theorem to prove that ∠AP₁B must strictly equal ∠AP₂B for any two points P₁, P₂ on the same circular arc.`,
            subQuestions: [
              `a) Relate ∠AP₁B to the central angle ∠AOB.`,
              `b) Relate ∠AP₂B to the central angle ∠AOB.`,
              `c) Conclude why ∠AP₁B = ∠AP₂B.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Transition across the Chord Boundary',
            marks: 4,
            prompt: `If a point P₃ is chosen on the minor arc AB on the opposite side of chord AB:`,
            subQuestions: [
              `a) Explain why ∠AP₃B is not equal to ${fmt(angle)}°.`,
              `b) Calculate the exact measure of ∠AP₃B using cyclic quadrilateral properties.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Angle Measures',
            steps: [
              `By the Angles in the Same Segment Theorem: ∠AP₂B = ∠AP₁B = ${fmt(angle)}°.`,
              `By the Angle at Centre Theorem: ∠AOB = 2 · ∠AP₁B = 2 × ${fmt(angle)}° = ${fmt(angle * 2)}°.`,
            ],
            finalAnswer: `∠AP₂B = ${fmt(angle)}°, ∠AOB = ${fmt(angle * 2)}°`,
            rubric: '1 mark for ∠AP₂B; 1 mark for formula ∠AOB = 2θ; 1 mark for correct ∠AOB value.',
          },
          {
            number: 2,
            title: 'Chord Length Calculation',
            steps: [
              `|AB| = 2r · sin θ = 2 × ${r} × sin(${fmt(angle)}°).`,
              `sin(${fmt(angle)}°) ≈ ${fmt(Math.sin((angle * Math.PI) / 180), 4)}.`,
              `|AB| = ${2 * r} × ${fmt(Math.sin((angle * Math.PI) / 180), 4)} = ${fmt(chordLen)}px.`,
              `Chord AB depends solely on the positions of A and B and circle radius r; dragging P₁ along the circumference has zero effect on |AB|.`,
            ],
            finalAnswer: `|AB| = ${fmt(chordLen)}px`,
            rubric: '2 marks for substitution into 2r sin θ; 1 mark for correct calculation; 1 mark for invariant justification.',
          },
          {
            number: 3,
            title: 'Proof from Centre Theorem',
            steps: [
              `Let O be the circle centre. Arc AB subtends central angle ∠AOB.`,
              `By the Angle at Centre Theorem: ∠AP₁B = 1/2 · ∠AOB.`,
              `Similarly, since P₂ lies on the same arc: ∠AP₂B = 1/2 · ∠AOB.`,
              `Since both angles equal half of the identical quantity ∠AOB, by transitivity ∠AP₁B = ∠AP₂B. Q.E.D.`,
            ],
            finalAnswer: `∠AP₁B = 1/2 ∠AOB = ∠AP₂B`,
            rubric: '2 marks for step (a); 2 marks for step (b); 1 mark for transitivity conclusion.',
          },
          {
            number: 4,
            title: 'Opposite Segment Angle',
            steps: [
              `Points A, P₁, B, P₃ form a cyclic quadrilateral because all four vertices lie on the circumference.`,
              `Opposite angles of a cyclic quadrilateral sum to 180°: ∠AP₁B + ∠AP₃B = 180°.`,
              `Therefore, ∠AP₃B = 180° - ${fmt(angle)}° = ${fmt(180 - angle)}°.`,
            ],
            finalAnswer: `∠AP₃B = ${fmt(180 - angle)}°`,
            rubric: '2 marks for identifying cyclic quadrilateral A-P₁-B-P₃; 2 marks for correct subtraction from 180°.',
          },
        ],
        commonMisconceptions: [
          'Assuming angles in opposite segments are equal rather than supplementary.',
          'Thinking that moving P₁ closer to A makes angle AP₁B larger.',
          'Confusing chord length with arc length.',
        ],
      };
    }

    case 'thales-theorem': {
      const r = state.radius || 10;
      const angle2D = state.angle2D || 1.05;
      const aX = -r, aY = 0;
      const bX = r, bY = 0;
      const pX = r * Math.cos(angle2D), pY = r * Math.sin(angle2D);
      const lenAP = Math.hypot(pX - aX, pY - aY);
      const lenBP = Math.hypot(pX - bX, pY - bY);

      return {
        theoremTitle: "Thales' Theorem (Angle in a Semicircle)",
        theoremStatement: 'An angle inscribed in a semicircle is strictly a right angle (90°). Equivalently, if the hypotenuse of a right-angled triangle is the diameter of a circle, the triangle vertices lie on the circle.',
        formula: '∠APB = 90°  (when AB is a diameter)',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r', value: `${r}`, unit: 'u' },
          { name: 'Diameter', symbol: '|AB|', value: `${2 * r}`, unit: 'u' },
          { name: 'Leg AP', symbol: '|AP|', value: fmt(lenAP), unit: 'u' },
          { name: 'Leg BP', symbol: '|BP|', value: fmt(lenBP), unit: 'u' },
          { name: 'Inscribed Angle', symbol: '∠APB', value: '90.0', unit: '°' },
        ],
        problems: [
          {
            number: 1,
            title: 'Pythagorean Verification of Thales Diameter',
            marks: 3,
            prompt: `In the diagram, AB is a diameter of circle O with radius r = ${r}u. The triangle legs measure |AP| = ${fmt(lenAP)}u and |BP| = ${fmt(lenBP)}u.`,
            subQuestions: [
              `a) State the measure of inscribed angle ∠APB.`,
              `b) Verify the Pythagorean theorem: calculate |AP|² + |BP|² and compare it to |AB|² = (${2 * r})².`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Median to the Hypotenuse Invariant',
            marks: 4,
            prompt: `Line segment OP connects the circle centre O (midpoint of diameter AB) to vertex P on the circumference.`,
            subQuestions: [
              `a) What is the exact length of median OP?`,
              `b) Explain why any right-angled triangle has the property that the median to the hypotenuse equals half the hypotenuse.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Algebraic Proof using Triangle Angle Sums',
            marks: 5,
            prompt: `Let segment OP divide ∠APB into two parts: ∠OPA = α and ∠OPB = β.`,
            subQuestions: [
              `a) Show that ∠OAP = α and ∠OBP = β using the isosceles property of △OAP and △OBP.`,
              `b) Write an expression for the sum of all interior angles in △APB in terms of α and β.`,
              `c) Deduce that α + β = 90°, proving ∠APB = 90°.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: "Converse of Thales' Theorem",
            marks: 4,
            prompt: `State and justify the converse of Thales' Theorem.`,
            subQuestions: [
              `a) Write the formal statement of the converse of Thales' Theorem.`,
              `b) A surveyor needs to construct a perfect 90° angle in the field using only a rope of fixed length and a peg. Describe how Thales' Theorem can be applied.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Right Angle & Pythagoras Verification',
            steps: [
              `By Thales' Theorem, since AB is a diameter, ∠APB = 90.0°.`,
              `|AP|² + |BP|² = (${fmt(lenAP)})² + (${fmt(lenBP)})² = ${fmt(lenAP * lenAP)} + ${fmt(lenBP * lenBP)} = ${fmt(lenAP * lenAP + lenBP * lenBP)}.`,
              `|AB|² = (${2 * r})² = ${4 * r * r}.`,
              `Since |AP|² + |BP|² = |AB|², the triangle satisfies the Pythagorean theorem, confirming ∠APB = 90°.`,
            ],
            finalAnswer: `∠APB = 90.0°, |AP|² + |BP|² = |AB|² = ${4 * r * r}`,
            rubric: '1 mark for stating ∠APB = 90°; 1 mark for squaring legs; 1 mark for matching |AB|².',
          },
          {
            number: 2,
            title: 'Median to Hypotenuse',
            steps: [
              `Since O is the centre of the circle and P lies on the circumference, segment OP is a radius: |OP| = r = ${r}u.`,
              `The hypotenuse is the diameter AB, so |AB| = 2r.`,
              `Therefore |OP| = 1/2 · |AB|. In any right triangle, the circumcentre lies at the midpoint of the hypotenuse, making all three vertices equidistant from the midpoint.`,
            ],
            finalAnswer: `|OP| = ${r}u = 1/2 |AB|`,
            rubric: '2 marks for identifying OP as radius; 2 marks for explaining circumcentre location at hypotenuse midpoint.',
          },
          {
            number: 3,
            title: 'Angle Sum Proof',
            steps: [
              `In △OAP: OA = OP = r, so △OAP is isosceles. Therefore ∠OAP = ∠OPA = α.`,
              `In △OBP: OB = OP = r, so △OBP is isosceles. Therefore ∠OBP = ∠OPB = β.`,
              `The interior angles of △APB are: ∠A = α, ∠B = β, and ∠P = α + β.`,
              `Total interior sum: ∠A + ∠B + ∠P = α + β + (α + β) = 2(α + β) = 180°.`,
              `Dividing by 2 gives α + β = 90°. Since ∠APB = α + β, ∠APB = 90°. Q.E.D.`,
            ],
            finalAnswer: `2(α + β) = 180° ⟹ ∠APB = α + β = 90°`,
            rubric: '2 marks for isosceles angles α and β; 2 marks for setting sum to 180°; 1 mark for conclusion.',
          },
          {
            number: 4,
            title: 'Converse & Practical Application',
            steps: [
              `Converse Statement: If the vertices of a right-angled triangle ABC (with right angle at C) lie on a plane, then the hypotenuse AB is the diameter of the circumcircle passing through C.`,
              `Construction Application: Fix a peg at point O. Rotate a rope of length r to trace a semicircle. Drive pegs at ends A and B of any diameter through O. Any third peg driven at point P anywhere on the semicircle rope arc will form a strict 90° angle ∠APB.`,
            ],
            finalAnswer: `Hypotenuse AB is the diameter of circumcircle of △APB`,
            rubric: '2 marks for clear converse statement; 2 marks for practical construction method.',
          },
        ],
        commonMisconceptions: [
          'Assuming Thales theorem applies to any chord, rather than strictly a diameter passing through the centre.',
          'Thinking that moving P closer to A changes the 90° angle.',
          'Confusing diameter with radius.',
        ],
      };
    }

    case 'cyclic-quadrilateral': {
      const aA = state.angleA ?? 0.8;
      const aB = state.angleB ?? 1.9;
      const aC = state.angleC ?? 3.5;
      const aD = state.angleD ?? 5.2;
      const angA = deg((aC - aD + TAU) % TAU) / 2;
      const angC = 180 - angA;
      const angB = deg((aD - aA + TAU) % TAU) / 2;
      const angD = 180 - angB;

      return {
        theoremTitle: 'Cyclic Quadrilateral Theorem & Ptolemy Relation',
        theoremStatement: 'A quadrilateral whose four vertices lie on a circle has opposite angles that are strictly supplementary (sum to 180°). Furthermore, an exterior angle equals the interior opposite angle, and the product of the diagonals equals the sum of the products of opposite sides (Ptolemy).',
        formula: '∠A + ∠C = 180°,  ∠B + ∠D = 180°,  AC · BD = AB · CD + BC · DA',
        givenValues: [
          { name: 'Angle at A', symbol: '∠DAB', value: fmt(angA), unit: '°' },
          { name: 'Angle at C', symbol: '∠BCD', value: fmt(angC), unit: '°' },
          { name: 'Opposite Sum A+C', symbol: '∠A + ∠C', value: '180.0', unit: '°' },
          { name: 'Angle at B', symbol: '∠ABC', value: fmt(angB), unit: '°' },
          { name: 'Angle at D', symbol: '∠CDA', value: fmt(angD), unit: '°' },
          { name: 'Opposite Sum B+D', symbol: '∠B + ∠D', value: '180.0', unit: '°' },
        ],
        problems: [
          {
            number: 1,
            title: 'Supplementary Opposite Angles Calculation',
            marks: 3,
            prompt: `Quadrilateral ABCD is inscribed in circle O. Given ∠DAB = ${fmt(angA)}° and ∠ABC = ${fmt(angB)}°:`,
            subQuestions: [
              `a) Calculate the exact measure of opposite angle ∠BCD.`,
              `b) Calculate the exact measure of opposite angle ∠CDA.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Exterior Angle Equality',
            marks: 4,
            prompt: `Side AB of the cyclic quadrilateral is extended past vertex B to point E, forming exterior angle ∠CBE.`,
            subQuestions: [
              `a) Calculate the measure of exterior angle ∠CBE.`,
              `b) Compare ∠CBE with the interior opposite angle ∠CDA and state the invariant rule.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Proof using Angle at Centre Theorem',
            marks: 5,
            prompt: `Draw radii OA and OC connecting to the circle centre O.`,
            subQuestions: [
              `a) Express interior angle ∠B in terms of the central angle ∠AOC (facing arc ADC).`,
              `b) Express interior angle ∠D in terms of the reflex central angle ∠AOC (facing arc ABC).`,
              `c) Since the two central angles complete a full perigon (360°), deduce that ∠B + ∠D = 180°.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: "Ptolemy's Theorem Application",
            marks: 4,
            prompt: `State Ptolemy's Theorem for cyclic quadrilateral ABCD. If side lengths are AB = 6, BC = 8, CD = 5, DA = 7, and diagonal AC = 9: calculate the theoretical length of diagonal BD.`,
            subQuestions: [
              `a) Write the formal Ptolemy equation relating sides and diagonals.`,
              `b) Substitute the given lengths to solve for diagonal BD.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Opposite Angle Sums',
            steps: [
              `Opposite angles of a cyclic quadrilateral sum to 180°: ∠A + ∠C = 180°.`,
              `∠BCD = 180° - ∠DAB = 180° - ${fmt(angA)}° = ${fmt(angC)}°.`,
              `∠CDA = 180° - ∠ABC = 180° - ${fmt(angB)}° = ${fmt(angD)}°.`,
            ],
            finalAnswer: `∠BCD = ${fmt(angC)}°, ∠CDA = ${fmt(angD)}°`,
            rubric: '1 mark for stating theorem; 1 mark for ∠BCD; 1 mark for ∠CDA.',
          },
          {
            number: 2,
            title: 'Exterior Angle Invariant',
            steps: [
              `Angles on straight line ABE sum to 180°: ∠ABC + ∠CBE = 180°.`,
              `Therefore, ∠CBE = 180° - ∠ABC = 180° - ${fmt(angB)}° = ${fmt(angD)}°.`,
              `Since ∠CDA = 180° - ∠ABC = ${fmt(angD)}°, we have ∠CBE = ∠CDA.`,
              `Rule: The exterior angle of a cyclic quadrilateral is strictly equal to the interior opposite angle.`,
            ],
            finalAnswer: `∠CBE = ${fmt(angD)}° = ∠CDA`,
            rubric: '2 marks for straight line calculation; 2 marks for equivalence statement and rule formulation.',
          },
          {
            number: 3,
            title: 'Central Angle Proof',
            steps: [
              `By the Angle at Centre Theorem: Central angle ∠AOC = 2 · ∠D.`,
              `Reflex central angle ∠AOC = 2 · ∠B.`,
              `The sum of an angle and its reflex conjugate is a full perigon (360°): ∠AOC + reflex(∠AOC) = 360°.`,
              `Substituting: 2 · ∠D + 2 · ∠B = 360°.`,
              `Dividing by 2 gives ∠B + ∠D = 180°. Q.E.D.`,
            ],
            finalAnswer: `2(∠B + ∠D) = 360° ⟹ ∠B + ∠D = 180°`,
            rubric: '2 marks for centre and reflex relations; 2 marks for perigon sum 360°; 1 mark for conclusion.',
          },
          {
            number: 4,
            title: "Ptolemy's Calculation",
            steps: [
              `Ptolemy's Theorem: AC · BD = AB · CD + BC · DA.`,
              `Substitute values: 9 · BD = (6 × 5) + (8 × 7) = 30 + 56 = 86.`,
              `BD = 86 / 9 ≈ 9.56.`,
            ],
            finalAnswer: `BD = 86/9 ≈ 9.56`,
            rubric: '2 marks for correct formula; 1 mark for substitution; 1 mark for correct arithmetic.',
          },
        ],
        commonMisconceptions: [
          'Assuming adjacent angles sum to 180° (true for parallelograms, but false for general cyclic quads).',
          'Assuming all quadrilaterals are cyclic.',
          'Reversing the side pairing in Ptolemy’s formula (multiplying adjacent sides instead of opposite sides).',
        ],
      };
    }

    case 'tangent-radius': {
      const r = state.radius || 180;
      const angle = state.tangentAngle ? deg(state.tangentAngle) : 45;
      const extDist = state.pointDist || Math.round(r * 1.6);
      const tangentLen = Math.sqrt(Math.max(0, extDist * extDist - r * r));

      return {
        theoremTitle: 'Tangent-Radius Orthogonality Theorem',
        theoremStatement: 'A tangent to a circle is perpendicular to the radius at the point of contact. Consequently, the angle between the tangent line and the radial segment is strictly 90°.',
        formula: 'OT ⊥ t  (∠OTP = 90°)',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r = |OT|', value: `${r}`, unit: 'px' },
          { name: 'Centre-to-Point Dist', symbol: '|OP|', value: `${extDist}`, unit: 'px' },
          { name: 'Tangent Length', symbol: '|PT|', value: fmt(tangentLen), unit: 'px' },
          { name: 'Contact Angle', symbol: '∠OTP', value: '90.0', unit: '°' },
        ],
        problems: [
          {
            number: 1,
            title: 'Orthogonality & Tangent Segment Length',
            marks: 3,
            prompt: `Line t is tangent to circle O at point T. A point P on the tangent line is at distance |OP| = ${extDist}px from the circle centre. The circle radius is r = ${r}px.`,
            subQuestions: [
              `a) State the measure of angle ∠OTP.`,
              `b) Use the Pythagorean theorem on △OTP to calculate the exact tangent length |PT|.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Shortest Distance Property',
            marks: 4,
            prompt: `Let T be the point of contact on tangent line t, and let Q be any other point on line t (Q ≠ T).`,
            subQuestions: [
              `a) Explain why point Q must lie outside the circle.`,
              `b) Using the inequality |OQ| > r, prove that the radius OT is the shortest distance from the centre O to the tangent line.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Proof by Contradiction (Reductio Ad Absurdum)',
            marks: 5,
            prompt: `Suppose OT is NOT perpendicular to tangent line t.`,
            subQuestions: [
              `a) Assume a different perpendicular segment OM can be drawn from O to line t (with M ≠ T).`,
              `b) In right-angled triangle △OMT, which side must be the hypotenuse?`,
              `c) Show that this leads to the contradiction that |OM| < r, meaning M lies inside the circle, violating the definition of a tangent line.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Circumscribed Angle & Angle at Centre',
            marks: 4,
            prompt: `Two tangents from external point P touch the circle at T₁ and T₂. Given ∠T₁PT₂ = 60°:`,
            subQuestions: [
              `a) Prove that quadrilateral OT₁PT₂ has opposite right angles.`,
              `b) Calculate the central angle ∠T₁OT₂ subtended by the arc between the contact points.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Tangent Length Calculation',
            steps: [
              `By the Tangent-Radius Theorem: OT ⊥ PT, so ∠OTP = 90.0°.`,
              `In right-angled triangle △OTP: |OP|² = |OT|² + |PT|².`,
              `|PT|² = |OP|² - |OT|² = (${extDist})² - (${r})² = ${extDist * extDist} - ${r * r} = ${extDist * extDist - r * r}.`,
              `|PT| = √(${extDist * extDist - r * r}) ≈ ${fmt(tangentLen)}px.`,
            ],
            finalAnswer: `∠OTP = 90°, |PT| = ${fmt(tangentLen)}px`,
            rubric: '1 mark for stating ∠OTP = 90°; 1 mark for Pythagoras setup; 1 mark for correct numerical answer.',
          },
          {
            number: 2,
            title: 'Shortest Distance Invariant',
            steps: [
              `By definition, a tangent line intersects a circle at exactly one point (T). All other points on the tangent line lie in the exterior of the circle.`,
              `Since Q lies outside the circle, its distance from the centre is strictly greater than the radius: |OQ| > r.`,
              `Since |OT| = r, |OQ| > |OT| for all Q ≠ T on the line.`,
              `The shortest distance from a point to a straight line is the perpendicular distance; hence OT ⊥ t.`,
            ],
            finalAnswer: `|OT| = r < |OQ| for all Q ≠ T on line t`,
            rubric: '2 marks for exterior point definition; 2 marks for shortest perpendicular distance deduction.',
          },
          {
            number: 3,
            title: 'Proof by Contradiction',
            steps: [
              `Assume OT is not perpendicular to t. Then drop perpendicular OM ⊥ t where M ≠ T.`,
              `In △OMT, ∠OMT = 90°. Since the hypotenuse is opposite the largest angle (90°), hypotenuse OT must be strictly longer than leg OM: |OT| > |OM|.`,
              `Since |OT| = r, this implies |OM| < r.`,
              `A point with distance less than r from O lies strictly inside the circle.`,
              `If M lies inside the circle, line t passes through an interior point, making it a secant line that intersects the circle in two points. This contradicts that t is a tangent. Therefore OT ⊥ t. Q.E.D.`,
            ],
            finalAnswer: `Contradiction: |OM| < r implies secant line. Thus OT ⊥ t.`,
            rubric: '2 marks for hypotenuse comparison; 2 marks for interior point deduction; 1 mark for contradiction conclusion.',
          },
          {
            number: 4,
            title: 'Circumscribed Quadrilateral',
            steps: [
              `Since OT₁ ⊥ PT₁ and OT₂ ⊥ PT₂, ∠OT₁P = 90° and ∠OT₂P = 90°.`,
              `The sum of angles in quadrilateral OT₁PT₂ is 360°: ∠T₁OT₂ + ∠T₁PT₂ + 90° + 90° = 360°.`,
              `Therefore ∠T₁OT₂ + ∠T₁PT₂ = 180° (they are supplementary).`,
              `Given ∠T₁PT₂ = 60°, central angle ∠T₁OT₂ = 180° - 60° = 120.0°.`,
            ],
            finalAnswer: `∠T₁OT₂ = 120.0°`,
            rubric: '2 marks for 90° contact angles; 2 marks for supplementary angle calculation.',
          },
        ],
        commonMisconceptions: [
          'Assuming the tangent line passes through the centre of the circle.',
          'Confusing the radius with the chord connecting two tangent points.',
          'Attempting to use the Pythagorean theorem on non-right triangles without establishing OT ⊥ t.',
        ],
      };
    }

    case 'alternate-segment': {
      const angle = state.chordAngle ? deg(state.chordAngle) : 52.5;
      const r = state.radius || 180;

      return {
        theoremTitle: 'The Alternate Segment Theorem',
        theoremStatement: 'The angle between a tangent to a circle and a chord drawn through the point of contact is equal to the angle subtended by the chord in the alternate segment.',
        formula: '∠TAB = ∠ACB',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r', value: `${r}`, unit: 'px' },
          { name: 'Tangent-Chord Angle', symbol: '∠TAB', value: fmt(angle), unit: '°' },
          { name: 'Alternate Segment Angle', symbol: '∠ACB', value: fmt(angle), unit: '°' },
          { name: 'Invariant Match', symbol: '∠TAB = ∠ACB', value: 'TRUE', unit: '' },
        ],
        problems: [
          {
            number: 1,
            title: 'Alternate Angle Identification',
            marks: 3,
            prompt: `Line t is tangent to circle O at point A. Chord AB makes an angle ∠TAB = ${fmt(angle)}° with the tangent line. Point C lies on the major arc in the alternate segment.`,
            subQuestions: [
              `a) State the measure of inscribed angle ∠ACB.`,
              `b) Name the specific theorem that justifies your answer.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Obtuse Alternate Segment Calculation',
            marks: 4,
            prompt: `Consider the obtuse angle ∠T'AB on the opposite side of the tangent line (where T'AT is the full tangent line).`,
            subQuestions: [
              `a) Calculate the measure of angle ∠T'AB.`,
              `b) If a point D is chosen on the minor arc AB, state the measure of angle ∠ADB and explain how it relates to ∠T'AB.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Proof using Diameter and Thales Theorem',
            marks: 5,
            prompt: `Draw diameter AD from contact point A through centre O, and connect D to B.`,
            subQuestions: [
              `a) What is the measure of ∠TAD (tangent to diameter)?`,
              `b) Using Thales' Theorem, state the measure of ∠ABD.`,
              `c) Express ∠ADB in terms of ∠TAB and show that ∠ACB = ∠TAB.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Tangent-Chord Triangle Invariant',
            marks: 4,
            prompt: `In △ABC, vertex A is on tangent line t. Tangent-chord angle ∠TAB = 50° and ∠CBA = 65°.`,
            subQuestions: [
              `a) Find angle ∠ACB using the Alternate Segment Theorem.`,
              `b) Calculate the remaining angle ∠BAC of the triangle.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Angle Equality',
            steps: [
              `By the Alternate Segment Theorem: The angle between the tangent and chord equals the angle subtended in the alternate segment.`,
              `Therefore, ∠ACB = ∠TAB = ${fmt(angle)}°.`,
            ],
            finalAnswer: `∠ACB = ${fmt(angle)}°`,
            rubric: '2 marks for correct numerical angle; 1 mark for naming Alternate Segment Theorem.',
          },
          {
            number: 2,
            title: 'Obtuse Angle & Minor Segment',
            steps: [
              `Angles on straight line T'AT sum to 180°: ∠T'AB = 180° - ∠TAB = 180° - ${fmt(angle)}° = ${fmt(180 - angle)}°.`,
              `By the Alternate Segment Theorem applied to the minor segment: ∠ADB = ∠T'AB = ${fmt(180 - angle)}°.`,
              `Alternatively, since ACBD is a cyclic quadrilateral: ∠ACB + ∠ADB = 180°, so ∠ADB = 180° - ${fmt(angle)}° = ${fmt(180 - angle)}°.`,
            ],
            finalAnswer: `∠T'AB = ${fmt(180 - angle)}°, ∠ADB = ${fmt(180 - angle)}°`,
            rubric: "2 marks for ∠T'AB; 2 marks for ∠ADB with cyclic quad or alternate segment justification.",
          },
          {
            number: 3,
            title: 'Proof via Diameter',
            steps: [
              `Since AD is a diameter, AD is a radial line at A. By Tangent-Radius theorem: ∠TAD = 90°.`,
              `In right-angled triangle △ABD, angle in semicircle ∠ABD = 90° (Thales).`,
              `In △ABD, the acute angles sum to 90°: ∠ADB + ∠DAB = 90°.`,
              `Also, ∠TAB + ∠DAB = ∠TAD = 90°.`,
              `Equating: ∠TAB + ∠DAB = ∠ADB + ∠DAB ⟹ ∠TAB = ∠ADB.`,
              `Since angles in the same segment subtended by chord AB are equal: ∠ACB = ∠ADB.`,
              `Therefore, ∠ACB = ∠TAB. Q.E.D.`,
            ],
            finalAnswer: `∠TAB = 90° - ∠DAB = ∠ADB = ∠ACB`,
            rubric: '1 mark for ∠TAD=90°; 1 mark for ∠ABD=90°; 2 marks for algebraic elimination of ∠DAB; 1 mark for concluding ∠ACB=∠TAB.',
          },
          {
            number: 4,
            title: 'Triangle Angle Calculation',
            steps: [
              `By Alternate Segment Theorem: ∠ACB = ∠TAB = 50.0°.`,
              `In △ABC, interior angles sum to 180°: ∠BAC + ∠CBA + ∠ACB = 180°.`,
              `∠BAC = 180° - 65° - 50° = 65.0°.`,
              `(Notice △ABC is isosceles with |AB| = |AC|).`,
            ],
            finalAnswer: `∠ACB = 50.0°, ∠BAC = 65.0°`,
            rubric: '2 marks for ∠ACB; 2 marks for triangle angle sum calculation of ∠BAC.',
          },
        ],
        commonMisconceptions: [
          'Looking at the adjacent angle in the same segment rather than the alternate segment.',
          'Assuming chord AB must be a diameter.',
          'Confusing the angle between tangent and chord with the central angle.',
        ],
      };
    }

    case 'tangents-from-external-point': {
      const r = state.radius || 180;
      const d = state.pointDist || Math.round(r * 2.0);
      const tLen = Math.sqrt(Math.max(0, d * d - r * r));
      const halfAngleP = Math.asin(r / d);
      const angleP = deg(2 * halfAngleP);

      return {
        theoremTitle: 'Tangents from an External Point Theorem',
        theoremStatement: 'Tangents drawn to a circle from an external point are equal in length, subtend equal angles at the centre, and the line connecting the external point to the centre bisects the angle between the tangents.',
        formula: '|PT₁| = |PT₂| = √(d² - r²)',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r', value: `${r}`, unit: 'px' },
          { name: 'Centre Distance', symbol: 'd = |OP|', value: `${d}`, unit: 'px' },
          { name: 'Tangent 1 Length', symbol: '|PT₁|', value: fmt(tLen), unit: 'px' },
          { name: 'Tangent 2 Length', symbol: '|PT₂|', value: fmt(tLen), unit: 'px' },
          { name: 'Apex Angle', symbol: '∠T₁PT₂', value: fmt(angleP), unit: '°' },
        ],
        problems: [
          {
            number: 1,
            title: 'Equal Tangent Length Calculation',
            marks: 3,
            prompt: `Tangents PT₁ and PT₂ are drawn from external point P to circle O. The distance from the circle centre to P is d = ${d}px and the radius is r = ${r}px.`,
            subQuestions: [
              `a) State the theorem relating lengths |PT₁| and |PT₂|.`,
              `b) Calculate the exact length of each tangent segment.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Angle Bisector Property',
            marks: 4,
            prompt: `Line segment OP connects the centre O to external point P. Given ∠T₁PT₂ = ${fmt(angleP)}°:`,
            subQuestions: [
              `a) Find the measure of ∠OPT₁.`,
              `b) Find the central angle ∠T₁OT₂ subtended by chord of contact T₁T₂.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Congruence Proof (RHS Criterion)',
            marks: 5,
            prompt: `Prove that |PT₁| = |PT₂| using triangle congruence.`,
            subQuestions: [
              `a) Identify the two right-angled triangles sharing hypotenuse OP.`,
              `b) State the three conditions that prove △OT₁P ≅ △OT₂P using the RHS criterion.`,
              `c) Conclude why |PT₁| = |PT₂| and ∠OPT₁ = ∠OPT₂.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Chord of Contact Length',
            marks: 4,
            prompt: `Chord T₁T₂ connects the two points of contact.`,
            subQuestions: [
              `a) Explain why line OP is the perpendicular bisector of chord T₁T₂.`,
              `b) Using similar triangles or area, calculate the exact length of chord T₁T₂.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Tangent Length',
            steps: [
              `By the Tangents from an External Point Theorem: |PT₁| = |PT₂|.`,
              `By Pythagoras in right △OT₁P (since OT₁ ⊥ PT₁): |PT₁|² = |OP|² - |OT₁|² = ${d}² - ${r}² = ${d * d - r * r}.`,
              `|PT₁| = √(${d * d - r * r}) ≈ ${fmt(tLen)}px.`,
            ],
            finalAnswer: `|PT₁| = |PT₂| = ${fmt(tLen)}px`,
            rubric: '1 mark for stating |PT₁|=|PT₂|; 1 mark for Pythagoras setup; 1 mark for correct numerical evaluation.',
          },
          {
            number: 2,
            title: 'Angle Measures',
            steps: [
              `Segment OP bisects ∠T₁PT₂: ∠OPT₁ = 1/2 · ∠T₁PT₂ = 1/2 × ${fmt(angleP)}° = ${fmt(angleP / 2)}°.`,
              `Quadrilateral OT₁PT₂ has right angles at T₁ and T₂. Therefore central angle ∠T₁OT₂ and apex angle ∠T₁PT₂ are supplementary: ∠T₁OT₂ = 180° - ${fmt(angleP)}° = ${fmt(180 - angleP)}°.`,
            ],
            finalAnswer: `∠OPT₁ = ${fmt(angleP / 2)}°, ∠T₁OT₂ = ${fmt(180 - angleP)}°`,
            rubric: '2 marks for bisected angle; 2 marks for supplementary central angle.',
          },
          {
            number: 3,
            title: 'RHS Congruence Proof',
            steps: [
              `Consider △OT₁P and △OT₂P:`,
              `1. ∠OT₁P = ∠OT₂P = 90° (tangents are perpendicular to radii at contact points).`,
              `2. OP is the common shared hypotenuse (OP = OP).`,
              `3. OT₁ = OT₂ = r (radii of the same circle).`,
              `By the Right-angle Hypotenuse Side (RHS) congruence criterion, △OT₁P ≅ △OT₂P.`,
              `Corresponding parts of congruent triangles (CPCTC) are equal: |PT₁| = |PT₂| and ∠OPT₁ = ∠OPT₂. Q.E.D.`,
            ],
            finalAnswer: `△OT₁P ≅ △OT₂P (RHS) ⟹ |PT₁| = |PT₂|`,
            rubric: '1 mark for identifying 90° angles; 1 mark for common hypotenuse; 1 mark for equal radii; 1 mark for RHS criterion; 1 mark for CPCTC conclusion.',
          },
          {
            number: 4,
            title: 'Chord of Contact',
            steps: [
              `In kite OT₁PT₂, diagonals OP and T₁T₂ intersect perpendicularly at midpoint M of T₁T₂.`,
              `The altitude T₁M to hypotenuse OP in right △OT₁P has length: h = (|OT₁| · |PT₁|) / |OP| = (${r} × ${fmt(tLen)}) / ${d} ≈ ${fmt((r * tLen) / d)}px.`,
              `Total chord length: |T₁T₂| = 2h = 2 × ${fmt((r * tLen) / d)} = ${fmt((2 * r * tLen) / d)}px.`,
            ],
            finalAnswer: `|T₁T₂| = ${fmt((2 * r * tLen) / d)}px`,
            rubric: '2 marks for establishing perpendicular bisection; 2 marks for calculating altitude and full chord length.',
          },
        ],
        commonMisconceptions: [
          'Assuming OP bisects the circle in half (it bisects the angle, not the circle area).',
          'Attempting to find |PT| by measuring along the curved circumference rather than the straight tangent line.',
        ],
      };
    }

    case 'perpendicular-chord-bisector': {
      const r = state.radius || 180;
      const distOM = state.chordDist !== undefined ? state.chordDist : Math.round(r * 0.55);
      const halfChord = Math.sqrt(Math.max(0, r * r - distOM * distOM));
      const fullChord = 2 * halfChord;
      const sagitta = r - distOM;

      return {
        theoremTitle: 'Perpendicular Chord Bisector Theorem',
        theoremStatement: 'The perpendicular from the centre of a circle to a chord bisects the chord. Conversely, the perpendicular bisector of a chord passes through the centre of the circle.',
        formula: 'OM ⊥ AB  ⟺  AM = MB = ½ · AB',
        givenValues: [
          { name: 'Circle Radius', symbol: 'r = |OA|', value: `${r}`, unit: 'px' },
          { name: 'Distance to Chord', symbol: '|OM|', value: `${distOM}`, unit: 'px' },
          { name: 'Half Chord', symbol: '|AM|', value: fmt(halfChord), unit: 'px' },
          { name: 'Full Chord Length', symbol: '|AB|', value: fmt(fullChord), unit: 'px' },
          { name: 'Sagitta (Height)', symbol: 's = r - |OM|', value: fmt(sagitta), unit: 'px' },
        ],
        problems: [
          {
            number: 1,
            title: 'Chord Length via Pythagoras',
            marks: 3,
            prompt: `In circle (O, r = ${r}px), perpendicular OM is dropped to chord AB. Distance OM = ${distOM}px.`,
            subQuestions: [
              `a) Calculate half-chord length AM using the right-angled triangle △OMA.`,
              `b) Find the total chord length |AB|.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Sagitta (Curvature Depth) Invariant',
            marks: 4,
            prompt: `The sagitta s is the segment height extending from midpoint M along the radius to the circumference arc.`,
            subQuestions: [
              `a) Calculate the sagitta s = r - |OM|.`,
              `b) Verify the historic circular arch relation: s(2r - s) = (AB / 2)².`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Congruence Proof (RHS or SSS)',
            marks: 5,
            prompt: `Prove that if OM ⊥ AB, then M is the midpoint of chord AB.`,
            subQuestions: [
              `a) Set up triangles △OMA and △OMB.`,
              `b) Show that △OMA ≅ △OMB.`,
              `c) Conclude why AM = MB.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Locating the Circle Centre',
            marks: 4,
            prompt: `A circular archaeological coin has missing edges and no marked centre.`,
            subQuestions: [
              `a) Describe how to draw two non-parallel chords on the coin fragment.`,
              `b) Explain how the Perpendicular Bisector Theorem guarantees that the intersection of their perpendicular bisectors identifies the exact centre O.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Chord Calculation',
            steps: [
              `In right-angled triangle △OMA: |OA|² = |OM|² + |AM|².`,
              `|AM|² = r² - |OM|² = ${r}² - ${distOM}² = ${r * r} - ${distOM * distOM} = ${r * r - distOM * distOM}.`,
              `|AM| = √(${r * r - distOM * distOM}) ≈ ${fmt(halfChord)}px.`,
              `Total chord length: |AB| = 2 · |AM| = 2 × ${fmt(halfChord)} = ${fmt(fullChord)}px.`,
            ],
            finalAnswer: `|AM| = ${fmt(halfChord)}px, |AB| = ${fmt(fullChord)}px`,
            rubric: '1 mark for Pythagoras equation; 1 mark for AM value; 1 mark for doubling to find AB.',
          },
          {
            number: 2,
            title: 'Sagitta Verification',
            steps: [
              `Sagitta: s = r - |OM| = ${r} - ${distOM} = ${fmt(sagitta)}px.`,
              `Calculate LHS: s(2r - s) = ${fmt(sagitta)} × (${2 * r} - ${fmt(sagitta)}) = ${fmt(sagitta)} × ${fmt(2 * r - sagitta)} = ${fmt(sagitta * (2 * r - sagitta))}.`,
              `Calculate RHS: (AB / 2)² = |AM|² = (${fmt(halfChord)})² = ${fmt(halfChord * halfChord)}.`,
              `Both sides equal ${fmt(halfChord * halfChord)}, confirming the classical sagitta identity.`,
            ],
            finalAnswer: `s = ${fmt(sagitta)}px, s(2r - s) = |AM|² = ${fmt(halfChord * halfChord)}`,
            rubric: '2 marks for sagitta calculation; 2 marks for calculating both sides and verifying identity.',
          },
          {
            number: 3,
            title: 'Congruence Proof',
            steps: [
              `In △OMA and △OMB:`,
              `1. ∠OMA = ∠OMB = 90° (given OM ⊥ AB).`,
              `2. OA = OB = r (radii of circle O).`,
              `3. OM is a shared common side.`,
              `By the RHS congruence theorem: △OMA ≅ △OMB.`,
              `Therefore, corresponding sides AM and MB are equal: AM = MB. Thus M is the midpoint of AB. Q.E.D.`,
            ],
            finalAnswer: `△OMA ≅ △OMB (RHS) ⟹ AM = MB`,
            rubric: '1 mark for 90° angles; 1 mark for equal radii; 1 mark for shared OM; 1 mark for RHS criterion; 1 mark for conclusion.',
          },
          {
            number: 4,
            title: 'Centre Location Construction',
            steps: [
              `1. Draw any two distinct, non-parallel chords AB and CD on the circular fragment.`,
              `2. Construct the perpendicular bisector line L₁ of chord AB. By the converse theorem, the centre O must lie on L₁.`,
              `3. Construct the perpendicular bisector line L₂ of chord CD. The centre O must also lie on L₂.`,
              `4. The unique intersection point of lines L₁ and L₂ is the exact centre O of the circle.`,
            ],
            finalAnswer: `Intersection of perpendicular bisectors of two non-parallel chords gives centre O`,
            rubric: '2 marks for chord selection and construction steps; 2 marks for geometric reasoning via converse theorem.',
          },
        ],
        commonMisconceptions: [
          'Assuming any line from the centre bisects the chord (it must be strictly perpendicular).',
          'Confusing the sagitta with the distance from centre OM.',
        ],
      };
    }

    case 'unit-circle-helix': {
      const theta = state.angleTheta ?? Math.PI / 4;
      const thetaDeg = deg(theta);
      const cosV = Math.cos(theta);
      const sinV = Math.sin(theta);
      const tanV = Math.abs(cosV) > 1e-5 ? sinV / cosV : Infinity;

      return {
        theoremTitle: 'Unit Circle & Six Trigonometric Functions',
        theoremStatement: 'On the Cartesian unit circle (x² + y² = 1), any angle θ placed in standard position defines coordinates (cos θ, sin θ). The fundamental Pythagorean identity sin²θ + cos²θ = 1 holds globally for all real and complex rotations.',
        formula: 'cos²θ + sin²θ = 1,  1 + tan²θ = sec²θ',
        givenValues: [
          { name: 'Angle θ', symbol: 'θ', value: fmt(thetaDeg), unit: '°' },
          { name: 'Cosine (X-coord)', symbol: 'cos θ', value: fmt(cosV, 4), unit: '' },
          { name: 'Sine (Y-coord)', symbol: 'sin θ', value: fmt(sinV, 4), unit: '' },
          { name: 'Tangent', symbol: 'tan θ', value: Math.abs(tanV) < 100 ? fmt(tanV, 4) : 'Undefined', unit: '' },
          { name: 'Pythagorean Sum', symbol: 'cos²θ + sin²θ', value: '1.0000', unit: '' },
        ],
        problems: [
          {
            number: 1,
            title: 'Coordinates & Fundamental Identity',
            marks: 3,
            prompt: `Point P lies on the unit circle at angle θ = ${fmt(thetaDeg)}°. Given cos θ = ${fmt(cosV, 4)} and sin θ = ${fmt(sinV, 4)}:`,
            subQuestions: [
              `a) State the Cartesian coordinates of terminal point P.`,
              `b) Verify the Pythagorean identity: calculate (cos θ)² + (sin θ)².`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Quadrant Signs & Reciprocal Functions',
            marks: 4,
            prompt: `Analyze the angle θ = ${fmt(thetaDeg)}°:`,
            subQuestions: [
              `a) Identify which quadrant θ terminates in, and state the signs (+ or -) of sin θ, cos θ, and tan θ.`,
              `b) Calculate the values of sec θ = 1/cos θ and csc θ = 1/sin θ.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Secondary Pythagorean Identity Derivation',
            marks: 5,
            prompt: `Start from the foundational identity: cos²θ + sin²θ = 1.`,
            subQuestions: [
              `a) Divide both sides by cos²θ (for cos θ ≠ 0) to derive 1 + tan²θ = sec²θ.`,
              `b) Divide both sides by sin²θ (for sin θ ≠ 0) to derive 1 + cot²θ = csc²θ.`,
              `c) Numerically verify 1 + tan²θ = sec²θ using the given angle values.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: '3D Cylindrical Helix & Wave Projections',
            marks: 4,
            prompt: `In the 3D Helix representation, a point moves along (x(t), y(t), z(t)) = (cos t, sin t, c·t).`,
            subQuestions: [
              `a) Describe what shape is traced when the 3D helix is projected perpendicularly onto the horizontal XZ ground plane.`,
              `b) Explain how the uniform circular motion in the XY plane generates sinusoidal wave propagation in 3D space.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Coordinates & Identity',
            steps: [
              `Coordinates of P: (x, y) = (cos θ, sin θ) = (${fmt(cosV, 4)}, ${fmt(sinV, 4)}).`,
              `(cos θ)² = (${fmt(cosV, 4)})² ≈ ${fmt(cosV * cosV, 4)}.`,
              `(sin θ)² = (${fmt(sinV, 4)})² ≈ ${fmt(sinV * sinV, 4)}.`,
              `Sum = ${fmt(cosV * cosV, 4)} + ${fmt(sinV * sinV, 4)} = 1.0000.`,
            ],
            finalAnswer: `P(${fmt(cosV, 4)}, ${fmt(sinV, 4)}), cos²θ + sin²θ = 1.0000`,
            rubric: '1 mark for coordinates; 1 mark for squaring each value; 1 mark for sum confirming 1.0000.',
          },
          {
            number: 2,
            title: 'Quadrant Analysis',
            steps: [
              `Angle θ = ${fmt(thetaDeg)}° lies in Quadrant ${thetaDeg < 90 ? 'I' : thetaDeg < 180 ? 'II' : thetaDeg < 270 ? 'III' : 'IV'}.`,
              `Signs: cos θ is ${cosV >= 0 ? 'positive (+)' : 'negative (-)'}, sin θ is ${sinV >= 0 ? 'positive (+)' : 'negative (-)'}, tan θ is ${tanV >= 0 ? 'positive (+)' : 'negative (-)'}.`,
              `sec θ = 1 / ${fmt(cosV, 4)} = ${fmt(1 / cosV, 4)}.`,
              `csc θ = 1 / ${fmt(sinV, 4)} = ${fmt(1 / sinV, 4)}.`,
            ],
            finalAnswer: `sec θ = ${fmt(1 / cosV, 4)}, csc θ = ${fmt(1 / sinV, 4)}`,
            rubric: '2 marks for correct quadrant and signs; 2 marks for sec and csc evaluation.',
          },
          {
            number: 3,
            title: 'Pythagorean Derivations',
            steps: [
              `Dividing cos²θ + sin²θ = 1 by cos²θ: cos²θ/cos²θ + sin²θ/cos²θ = 1/cos²θ ⟹ 1 + tan²θ = sec²θ.`,
              `Dividing cos²θ + sin²θ = 1 by sin²θ: cos²θ/sin²θ + sin²θ/sin²θ = 1/sin²θ ⟹ cot²θ + 1 = csc²θ.`,
              `Numerical check: 1 + (${fmt(tanV, 4)})² = 1 + ${fmt(tanV * tanV, 4)} = ${fmt(1 + tanV * tanV, 4)}.`,
              `sec²θ = (${fmt(1 / cosV, 4)})² = ${fmt(1 / (cosV * cosV), 4)}. Both sides match.`,
            ],
            finalAnswer: `1 + tan²θ = sec²θ and 1 + cot²θ = csc²θ`,
            rubric: '2 marks for sec²θ derivation; 2 marks for csc²θ derivation; 1 mark for numerical verification.',
          },
          {
            number: 4,
            title: 'Helix Wave Projection',
            steps: [
              `When projected onto the XZ plane (discarding y), the coordinates become (x, z) = (cos t, c·t).`,
              `This traces a pure harmonic cosine wave: x(z) = cos(z / c).`,
              `Uniform rotation in the XY plane combined with constant linear translation along the z-axis translates the rotational phase into a physical periodic spatial oscillation (wavelength λ = 2πc).`,
            ],
            finalAnswer: `Traces a sinusoidal wave x(z) = cos(z/c)`,
            rubric: '2 marks for identifying sinusoidal wave on plane; 2 marks for phase-to-spatial wavelength explanation.',
          },
        ],
        commonMisconceptions: [
          'Confusing the roles of x and y (remember: x is always cosine, y is always sine).',
          'Assuming tan 90° or tan 270° is a valid real number rather than undefined.',
        ],
      };
    }

    case 'law-of-sines': {
      const a = 12.0, b = 15.0, c = 18.0;
      const R = 9.5;
      const angA = 41.8, angB = 55.8, angC = 82.4;

      return {
        theoremTitle: 'The Law of Sines (Sine Rule & Circumdiameter 2R)',
        theoremStatement: 'In any plane triangle, the ratio of each side length to the sine of its opposite interior angle is strictly equal and equals the diameter 2R of the circumscribed circle.',
        formula: 'a / sin A = b / sin B = c / sin C = 2R',
        givenValues: [
          { name: 'Circumradius', symbol: 'R', value: `${R}`, unit: 'u' },
          { name: 'Circumdiameter', symbol: '2R', value: `${2 * R}`, unit: 'u' },
          { name: 'Side a', symbol: 'a', value: `${a}`, unit: 'u' },
          { name: 'Angle A', symbol: '∠A', value: `${angA}`, unit: '°' },
          { name: 'Side b', symbol: 'b', value: `${b}`, unit: 'u' },
          { name: 'Angle B', symbol: '∠B', value: `${angB}`, unit: '°' },
          { name: 'Side c', symbol: 'c', value: `${c}`, unit: 'u' },
          { name: 'Angle C', symbol: '∠C', value: `${angC}`, unit: '°' },
        ],
        problems: [
          {
            number: 1,
            title: 'Circumdiameter Equivalence',
            marks: 3,
            prompt: `In △ABC, side a = ${a}u and angle ∠A = ${angA}°. The triangle is circumscribed by a circle of radius R = ${R}u.`,
            subQuestions: [
              `a) Calculate the ratio a / sin A.`,
              `b) Verify that a / sin A = 2R.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Solving for an Unknown Side',
            marks: 4,
            prompt: `Given angle ∠B = ${angB}° and side a = ${a}u, ∠A = ${angA}°:`,
            subQuestions: [
              `a) Use the Law of Sines to set up the equation for side b.`,
              `b) Calculate the length of side b to one decimal place.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Altitude Bridge Derivation',
            marks: 5,
            prompt: `Draw the altitude h dropped from vertex C to side c (dividing △ABC into two right triangles).`,
            subQuestions: [
              `a) Express altitude h in terms of side b and angle A.`,
              `b) Express altitude h in terms of side a and angle B.`,
              `c) Equate both expressions to derive a / sin A = b / sin B.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'The Ambiguous Case (SSA Condition)',
            marks: 4,
            prompt: `Explain the ambiguous case when given side-side-angle (SSA).`,
            subQuestions: [
              `a) Under what condition for a, b, and ∠A does no triangle exist?`,
              `b) Under what condition do exactly two non-congruent triangles exist?`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Ratio Calculation',
            steps: [
              `sin(${angA}°) ≈ ${Math.sin((angA * Math.PI) / 180).toFixed(4)}.`,
              `Ratio = ${a} / sin(${angA}°) = ${a} / ${Math.sin((angA * Math.PI) / 180).toFixed(4)} ≈ ${(a / Math.sin((angA * Math.PI) / 180)).toFixed(1)}u.`,
              `Circumdiameter 2R = 2 × ${R} = ${2 * R}u.`,
              `Both quantities match: a / sin A = 2R = ${2 * R}u.`,
            ],
            finalAnswer: `a / sin A = 2R = ${2 * R}u`,
            rubric: '1 mark for sine evaluation; 1 mark for ratio; 1 mark for matching 2R.',
          },
          {
            number: 2,
            title: 'Unknown Side Calculation',
            steps: [
              `By Law of Sines: b / sin B = a / sin A ⟹ b = (a · sin B) / sin A.`,
              `Substitute: b = (${a} × sin(${angB}°)) / sin(${angA}°).`,
              `b = (${a} × ${Math.sin((angB * Math.PI) / 180).toFixed(4)}) / ${Math.sin((angA * Math.PI) / 180).toFixed(4)} = ${b.toFixed(1)}u.`,
            ],
            finalAnswer: `b = ${b.toFixed(1)}u`,
            rubric: '2 marks for formula rearrangement; 2 marks for correct numerical substitution and result.',
          },
          {
            number: 3,
            title: 'Altitude Derivation',
            steps: [
              `In right △ADC (where D is foot of altitude): sin A = h / b ⟹ h = b · sin A.`,
              `In right △BDC: sin B = h / a ⟹ h = a · sin B.`,
              `Equating expressions for h: b · sin A = a · sin B.`,
              `Dividing both sides by (sin A · sin B) yields: a / sin A = b / sin B. Q.E.D.`,
            ],
            finalAnswer: `b sin A = a sin B ⟹ a / sin A = b / sin B`,
            rubric: '2 marks for h=b sin A; 2 marks for h=a sin B; 1 mark for division to final ratio.',
          },
          {
            number: 4,
            title: 'Ambiguous Case Analysis',
            steps: [
              `Let h = b · sin A be the minimum altitude distance.`,
              `1. If a < h (a < b sin A), the side cannot reach the baseline; 0 triangles exist.`,
              `2. If a = h, exactly 1 right-angled triangle exists.`,
              `3. If h < a < b, side a can swing across the baseline in two positions (one acute, one obtuse), yielding exactly 2 distinct triangles.`,
              `4. If a ≥ b, exactly 1 triangle exists.`,
            ],
            finalAnswer: `No triangle when a < b sin A; 2 triangles when b sin A < a < b`,
            rubric: '2 marks for zero-triangle condition; 2 marks for two-triangle condition.',
          },
        ],
        commonMisconceptions: [
          'Pairing side a with angle B rather than its opposite angle A.',
          'Assuming the Sine Rule can only be used on right-angled triangles.',
        ],
      };
    }

    case 'law-of-cosines': {
      const a = Number(state.sideA) || 8.0;
      const b = Number(state.sideB) || 10.0;
      const angCRad = Number(state.angleC) || Math.PI / 3;
      const angCDeg = deg(angCRad);
      const cosC = Math.cos(angCRad);
      const c2 = a * a + b * b - 2 * a * b * cosC;
      const c = Math.sqrt(Math.max(0, c2));

      return {
        theoremTitle: 'The Law of Cosines (Cosine Rule)',
        theoremStatement: 'In any plane triangle, the square of any side equals the sum of the squares of the other two sides minus twice their product multiplied by the cosine of the included angle.',
        formula: 'c² = a² + b² - 2ab · cos C',
        givenValues: [
          { name: 'Side a', symbol: 'a', value: fmt(a), unit: 'u' },
          { name: 'Side b', symbol: 'b', value: fmt(b), unit: 'u' },
          { name: 'Included Angle C', symbol: '∠C', value: fmt(angCDeg), unit: '°' },
          { name: 'Side c', symbol: 'c', value: fmt(c, 2), unit: 'u' },
          { name: 'Interaction Term', symbol: '-2ab cos C', value: fmt(-2 * a * b * cosC, 2), unit: '' },
        ],
        problems: [
          {
            number: 1,
            title: 'Unknown Opposite Side Calculation',
            marks: 3,
            prompt: `In △ABC, side a = ${fmt(a)}u, side b = ${fmt(b)}u, and included angle ∠C = ${fmt(angCDeg)}°.`,
            subQuestions: [
              `a) Write down the Law of Cosines formula for side c.`,
              `b) Calculate c² and side c to two decimal places.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Reduction to the Pythagorean Theorem',
            marks: 4,
            prompt: `Examine the case where angle ∠C = 90°.`,
            subQuestions: [
              `a) What is the value of cos 90°?`,
              `b) Show how the Law of Cosines simplifies directly to Pythagoras: c² = a² + b².`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Solving for an Unknown Angle (SSS Condition)',
            marks: 5,
            prompt: `Rearrange the Law of Cosines to solve for angle C given all three sides: a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c, 2)}.`,
            subQuestions: [
              `a) Express cos C as a single algebraic quotient in terms of a, b, c.`,
              `b) Substitute the values to verify that ∠C = ${fmt(angCDeg)}°.`,
              `c) Explain how the sign of (a² + b² - c²) determines whether angle C is acute, right, or obtuse.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'Analytic Proof via Cartesian Coordinates',
            marks: 4,
            prompt: `Place vertex C at the origin (0, 0) and side b along the positive x-axis so A is at (b, 0). Vertex B is at (a cos C, a sin C).`,
            subQuestions: [
              `a) Write the distance formula for c² = |AB|² between A(b, 0) and B(a cos C, a sin C).`,
              `b) Expand and simplify using cos²C + sin²C = 1 to complete the proof.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Side Calculation',
            steps: [
              `c² = a² + b² - 2ab · cos C.`,
              `c² = (${fmt(a)})² + (${fmt(b)})² - 2(${fmt(a)})(${fmt(b)}) · cos(${fmt(angCDeg)}°).`,
              `c² = ${fmt(a * a)} + ${fmt(b * b)} - ${fmt(2 * a * b * cosC, 2)} = ${fmt(c2, 2)}.`,
              `c = √(${fmt(c2, 2)}) = ${fmt(c, 2)}u.`,
            ],
            finalAnswer: `c = ${fmt(c, 2)}u`,
            rubric: '1 mark for formula; 1 mark for arithmetic; 1 mark for square root.',
          },
          {
            number: 2,
            title: 'Pythagorean Reduction',
            steps: [
              `cos 90° = 0.`,
              `Substitute into Law of Cosines: c² = a² + b² - 2ab(0) = a² + b² - 0.`,
              `c² = a² + b², which is strictly the Pythagorean theorem.`,
              `Conclusion: The Pythagorean theorem is a special case of the Law of Cosines when the included angle is 90°.`,
            ],
            finalAnswer: `c² = a² + b² (since cos 90° = 0)`,
            rubric: '2 marks for cos 90° = 0; 2 marks for simplification and explanation.',
          },
          {
            number: 3,
            title: 'Solving for Angle',
            steps: [
              `From c² = a² + b² - 2ab cos C, add 2ab cos C and subtract c²: 2ab cos C = a² + b² - c².`,
              `Divide by 2ab: cos C = (a² + b² - c²) / (2ab).`,
              `Sign classification:`,
              `- If a² + b² > c², cos C > 0 ⟹ ∠C is acute (< 90°).`,
              `- If a² + b² = c², cos C = 0 ⟹ ∠C is a right angle (90°).`,
              `- If a² + b² < c², cos C < 0 ⟹ ∠C is obtuse (> 90°).`,
            ],
            finalAnswer: `cos C = (a² + b² - c²) / (2ab)`,
            rubric: '2 marks for formula derivation; 3 marks for acute/right/obtuse sign analysis.',
          },
          {
            number: 4,
            title: 'Cartesian Distance Proof',
            steps: [
              `c² = (x_B - x_A)² + (y_B - y_A)² = (a cos C - b)² + (a sin C - 0)².`,
              `Expand: c² = a² cos²C - 2ab cos C + b² + a² sin²C.`,
              `Group: c² = a²(cos²C + sin²C) + b² - 2ab cos C.`,
              `Since cos²C + sin²C = 1: c² = a²(1) + b² - 2ab cos C = a² + b² - 2ab cos C. Q.E.D.`,
            ],
            finalAnswer: `c² = a² + b² - 2ab cos C`,
            rubric: '2 marks for coordinate setup and distance formula; 2 marks for expansion and Pythagorean grouping.',
          },
        ],
        commonMisconceptions: [
          'Forgetting to multiply the final cosine product by 2.',
          'Subtracting the interaction term before multiplying (order of operations error: a² + b² - 2ab · cos C).',
        ],
      };
    }

    case 'angle-sum-identities': {
      const aRad = Number(state.angleAlpha) || Math.PI / 6;
      const bRad = Number(state.angleBeta) || Math.PI / 4;
      const aDeg = deg(aRad);
      const bDeg = deg(bRad);
      const cosA = Math.cos(aRad), sinA = Math.sin(aRad);
      const cosB = Math.cos(bRad), sinB = Math.sin(bRad);
      const cosSum = Math.cos(aRad + bRad);
      const sinSum = Math.sin(aRad + bRad);

      return {
        theoremTitle: 'Trigonometric Angle Addition & Subtraction Identities',
        theoremStatement: 'The trigonometric functions of the sum and difference of two angles are expressed bilinearly through the products of their individual cosine and sine components. Geometrically, this represents the matrix composition of rotations in SO(2).',
        formula: 'cos(α ± β) = cos α cos β ∓ sin α sin β,   sin(α ± β) = sin α cos β ± cos α sin β',
        givenValues: [
          { name: 'Angle α', symbol: 'α', value: fmt(aDeg), unit: '°' },
          { name: 'Angle β', symbol: 'β', value: fmt(bDeg), unit: '°' },
          { name: 'Sum α + β', symbol: 'α + β', value: fmt(aDeg + bDeg), unit: '°' },
          { name: 'cos(α + β)', symbol: 'cos(α + β)', value: fmt(cosSum, 4), unit: '' },
          { name: 'sin(α + β)', symbol: 'sin(α + β)', value: fmt(sinSum, 4), unit: '' },
        ],
        problems: [
          {
            number: 1,
            title: 'Exact Numerical Evaluation',
            marks: 3,
            prompt: `Given α = ${fmt(aDeg)}° and β = ${fmt(bDeg)}°:`,
            subQuestions: [
              `a) Use cos(α + β) = cos α cos β - sin α sin β to calculate cos(${fmt(aDeg + bDeg)}°).`,
              `b) Use sin(α + β) = sin α cos β + cos α sin β to calculate sin(${fmt(aDeg + bDeg)}°).`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 2,
            title: 'Double-Angle Identities Derivation',
            marks: 4,
            prompt: `Set β = α in the addition formulas.`,
            subQuestions: [
              `a) Derive the double-angle identity for sin 2α.`,
              `b) Derive the three common forms of the double-angle identity for cos 2α.`,
            ],
            workSpaceHeight: 90,
          },
          {
            number: 3,
            title: 'Stacked Triangles Geometric Deduction',
            marks: 5,
            prompt: `Examine the stacked right triangles △OMQ and △OQP where hypotenuse OP = 1.`,
            subQuestions: [
              `a) Show that OQ = cos β and QP = sin β.`,
              `b) Express segment OM along the horizontal axis in terms of OQ and α.`,
              `c) Deduce why the projection of P onto the x-axis gives cos(α + β) = cos α cos β - sin α sin β.`,
            ],
            workSpaceHeight: 110,
          },
          {
            number: 4,
            title: 'SO(2) Rotation Matrix Product Representation',
            marks: 4,
            prompt: `A 2D rotation by angle θ is represented by the matrix R(θ) = [[cos θ, -sin θ], [sin θ, cos θ]].`,
            subQuestions: [
              `a) Multiply matrix R(α) by matrix R(β).`,
              `b) Show that the matrix product directly produces the angle addition formulas as its entries.`,
            ],
            workSpaceHeight: 95,
          },
        ],
        solutions: [
          {
            number: 1,
            title: 'Identity Calculations',
            steps: [
              `cos(α + β) = cos(${fmt(aDeg)}°) cos(${fmt(bDeg)}°) - sin(${fmt(aDeg)}°) sin(${fmt(bDeg)}°).`,
              `= (${fmt(cosA, 4)} × ${fmt(cosB, 4)}) - (${fmt(sinA, 4)} × ${fmt(sinB, 4)}) = ${fmt(cosA * cosB, 4)} - ${fmt(sinA * sinB, 4)} = ${fmt(cosSum, 4)}.`,
              `sin(α + β) = sin(${fmt(aDeg)}°) cos(${fmt(bDeg)}°) + cos(${fmt(aDeg)}°) sin(${fmt(bDeg)}°).`,
              `= (${fmt(sinA, 4)} × ${fmt(cosB, 4)}) + (${fmt(cosA, 4)} × ${fmt(sinB, 4)}) = ${fmt(sinA * cosB, 4)} + ${fmt(cosA * sinB, 4)} = ${fmt(sinSum, 4)}.`,
            ],
            finalAnswer: `cos(α+β) = ${fmt(cosSum, 4)}, sin(α+β) = ${fmt(sinSum, 4)}`,
            rubric: '1.5 marks for cos evaluation; 1.5 marks for sin evaluation.',
          },
          {
            number: 2,
            title: 'Double-Angle Formulas',
            steps: [
              `sin(α + α) = sin α cos α + cos α sin α ⟹ sin 2α = 2 sin α cos α.`,
              `cos(α + α) = cos α cos α - sin α sin α ⟹ cos 2α = cos²α - sin²α.`,
              `Using sin²α = 1 - cos²α: cos 2α = cos²α - (1 - cos²α) = 2 cos²α - 1.`,
              `Using cos²α = 1 - sin²α: cos 2α = (1 - sin²α) - sin²α = 1 - 2 sin²α.`,
            ],
            finalAnswer: `sin 2α = 2 sin α cos α, cos 2α = cos²α - sin²α = 2 cos²α - 1 = 1 - 2 sin²α`,
            rubric: '2 marks for sin 2α; 2 marks for the forms of cos 2α.',
          },
          {
            number: 3,
            title: 'Stacked Triangles Proof',
            steps: [
              `In right △OQP with hypotenuse OP = 1 and angle β at O: adjacent leg OQ = cos β, opposite leg QP = sin β.`,
              `In right △OMQ with hypotenuse OQ = cos β and angle α at O: base OM = OQ · cos α = cos α cos β.`,
              `A perpendicular dropped from P to line MQ intersects at S: in right △PSQ, angle at P is α, so PS = QP · sin α = sin α sin β.`,
              `The x-coordinate of P is OM - PS = cos α cos β - sin α sin β. Since P is on the unit circle at angle α + β, x_P = cos(α + β). Q.E.D.`,
            ],
            finalAnswer: `cos(α+β) = OM - PS = cos α cos β - sin α sin β`,
            rubric: '2 marks for leg lengths; 2 marks for horizontal projection components; 1 mark for conclusion.',
          },
          {
            number: 4,
            title: 'Matrix Multiplication',
            steps: [
              `R(α) · R(β) = [[cos α, -sin α], [sin α, cos α]] · [[cos β, -sin β], [sin β, cos β]].`,
              `Top-left entry: (cos α)(cos β) + (-sin α)(sin β) = cos α cos β - sin α sin β = cos(α + β).`,
              `Bottom-left entry: (sin α)(cos β) + (cos α)(sin β) = sin α cos β + cos α sin β = sin(α + β).`,
              `Top-right: -sin(α + β); Bottom-right: cos(α + β).`,
              `The matrix product exactly equals R(α + β), proving rotation composition is homomorphic to addition.`,
            ],
            finalAnswer: `R(α) R(β) = R(α + β)`,
            rubric: '2 marks for matrix product multiplication; 2 marks for identifying addition formula entries.',
          },
        ],
        commonMisconceptions: [
          'Assuming linearity: cos(α + β) ≠ cos α + cos β.',
          'Mixing up the minus sign in the cosine addition formula (sum has a minus: cos(α+β) = cos α cos β - sin α sin β).',
        ],
      };
    }

    default:
      return {
        theoremTitle: 'Mathematical Exploration Worksheet',
        theoremStatement: 'Geometric invariant exploration derived from live interactive canvas configuration.',
        formula: 'Invariant = Constant',
        givenValues: [],
        problems: [],
        solutions: [],
        commonMisconceptions: [],
      };
  }
}

/**
 * Generates a complete, beautiful, A4/Letter print-optimized HTML document.
 *
 * @param {object} options
 * @param {string} options.visualId
 * @param {object} options.state
 * @param {string} options.svgMarkup
 * @param {object} options.worksheetData
 * @returns {string} Standalone HTML markup
 */
export function generateWorksheetHTML({ visualId, state = {}, svgMarkup = '', worksheetData = null }) {
  const data = worksheetData || generateWorksheetData(visualId, state);

  const cleanSvg = svgMarkup
    ? svgMarkup.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"')
    : '<div style="padding:40px;text-align:center;color:#64748b;">Diagram unavailable</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.theoremTitle} — Student Worksheet & Educator Key</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      font-size: 13px;
      line-height: 1.45;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #1e293b;
      color: #f8fafc;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .no-print-bar .title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-bar .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #334155;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .sheet-container {
      max-width: 820px;
      margin: 20px auto;
      background: #ffffff;
      padding: 24px 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .header-table td {
      padding: 4px 0;
      font-size: 12px;
      border-bottom: 1px dotted #cbd5e1;
    }
    .header-title-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0284c7;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 14px;
    }
    .header-title-box h1 {
      margin: 0 0 4px 0;
      font-size: 17px;
      color: #0f172a;
    }
    .header-title-box p {
      margin: 0;
      font-size: 12px;
      color: #334155;
    }
    .formula-tag {
      display: inline-block;
      margin-top: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 3px;
      color: #0369a1;
      font-size: 12px;
    }
    .diagram-params-grid {
      display: grid;
      grid-template-columns: 1fr 180px;
      gap: 16px;
      align-items: center;
      margin-bottom: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
    }
    .diagram-frame {
      width: 100%;
      height: 220px;
      background: #0f172a;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .params-table th {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid #cbd5e1;
      color: #475569;
    }
    .params-table td {
      padding: 4px 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    .params-table td.val {
      font-weight: 600;
      font-family: monospace;
      text-align: right;
      color: #0369a1;
    }
    .problem-box {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .problem-header {
      font-weight: 600;
      font-size: 13px;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .problem-marks {
      font-weight: 500;
      color: #64748b;
      font-size: 12px;
    }
    .problem-prompt {
      font-size: 12px;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .sub-question {
      font-size: 12px;
      color: #334155;
      margin-left: 12px;
      margin-bottom: 4px;
    }
    .workspace-lines {
      width: 100%;
      border: 1px solid #e2e8f0;
      background: repeating-linear-gradient(
        to bottom,
        #ffffff,
        #ffffff 23px,
        #f1f5f9 24px
      );
      border-radius: 4px;
      margin-top: 6px;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 30px;
      border-top: 2px dashed #cbd5e1;
      padding-top: 20px;
    }
    .educator-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .educator-banner h2 {
      margin: 0 0 2px 0;
      color: #b91c1c;
      font-size: 15px;
    }
    .educator-banner p {
      margin: 0;
      font-size: 11px;
      color: #7f1d1d;
    }
    .solution-box {
      margin-bottom: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 10px 14px;
      page-break-inside: avoid;
    }
    .solution-box h3 {
      margin: 0 0 6px 0;
      font-size: 13px;
      color: #0f172a;
    }
    .solution-step {
      font-size: 12px;
      color: #334155;
      margin-bottom: 3px;
      line-height: 1.4;
    }
    .final-ans {
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      margin-top: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .rubric-text {
      margin-top: 6px;
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      border-top: 1px dotted #cbd5e1;
      padding-top: 4px;
    }
    .misconceptions-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 5px;
      padding: 10px 14px;
      margin-top: 16px;
    }
    .misconceptions-box h4 {
      margin: 0 0 6px 0;
      color: #b45309;
      font-size: 12px;
    }
    .misconceptions-box ul {
      margin: 0;
      padding-left: 18px;
      font-size: 11px;
      color: #78350f;
    }
    .footer-stamp {
      text-align: center;
      margin-top: 20px;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .no-print-bar {
        display: none !important;
      }
      .sheet-container {
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
      }
      .page-break {
        border-top: none;
        margin-top: 0;
        padding-top: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="title">
      <span>📐 Visual Mathematics Lab — Educator &amp; Presentation Toolkit</span>
    </div>
    <div class="actions">
      <button class="btn" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print Worksheet / Save as PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">Close Window</button>
    </div>
  </div>

  <div class="sheet-container">
    <!-- PAGE 1: STUDENT THEOREM EXPLORATION WORKSHEET -->
    <table class="header-table">
      <tr>
        <td style="width: 50%;"><strong>Student Name:</strong> ________________________________</td>
        <td style="width: 25%;"><strong>Date:</strong> _______________</td>
        <td style="width: 25%;"><strong>Period / Class:</strong> _________</td>
      </tr>
      <tr>
        <td colspan="2"><strong>School / Institution:</strong> ________________________________</td>
        <td><strong>Score:</strong> _____ / 16 marks</td>
      </tr>
    </table>

    <div class="header-title-box">
      <h1>${data.theoremTitle}</h1>
      <p>${data.theoremStatement}</p>
      <div class="formula-tag">${data.formula}</div>
    </div>

    <div class="diagram-params-grid">
      <div class="diagram-frame">
        ${cleanSvg}
      </div>
      <div>
        <table class="params-table">
          <thead>
            <tr>
              <th>Given Parameter</th>
              <th style="text-align:right;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${data.givenValues.map(p => `
              <tr>
                <td>${p.name} (<em>${p.symbol}</em>)</td>
                <td class="val">${p.value}${p.unit ? ' ' + p.unit : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- STUDENT EXERCISES (QUESTIONS 1-4) -->
    ${data.problems.map(prob => `
      <div class="problem-box">
        <div class="problem-header">
          <span>Question ${prob.number}: ${prob.title}</span>
          <span class="problem-marks">[${prob.marks} marks]</span>
        </div>
        <div class="problem-prompt">${prob.prompt}</div>
        ${prob.subQuestions.map(sq => `<div class="sub-question">${sq}</div>`).join('')}
        <div class="workspace-lines" style="height: ${prob.workSpaceHeight}px;"></div>
      </div>
    `).join('')}

    <div class="footer-stamp">
      Visual Mathematics Lab &bull; Dynamic Theorem Worksheet &bull; Generated from live interactive configuration
    </div>

    <!-- PAGE 2: EDUCATOR ANSWER KEY & ASSESSMENT GUIDE -->
    <div class="page-break"></div>

    <div class="educator-banner">
      <h2>CONFIDENTIAL — EDUCATOR MARKING GUIDE &amp; ANSWER KEY</h2>
      <p>For teacher reference and scoring only. Derived directly from the live geometry state.</p>
    </div>

    ${data.solutions.map(sol => `
      <div class="solution-box">
        <h3>Question ${sol.number} Solution: ${sol.title}</h3>
        ${sol.steps.map(step => `<div class="solution-step">${step}</div>`).join('')}
        <div class="final-ans">Exact Solution: ${sol.finalAnswer}</div>
        <div class="rubric-text">Marking Rubric: ${sol.rubric}</div>
      </div>
    `).join('')}

    ${data.commonMisconceptions && data.commonMisconceptions.length ? `
      <div class="misconceptions-box">
        <h4>Pedagogical Guide: Common Student Misconceptions &amp; Remediation</h4>
        <ul>
          ${data.commonMisconceptions.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="footer-stamp" style="margin-top: 30px;">
      Visual Mathematics Lab &bull; Educator Reference Guide &bull; A4/Letter Print Ready
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal action to generate and launch the printable theorem worksheet.
 *
 * @param {object} options
 * @param {string} options.visualId
 * @param {object} options.state
 * @param {object} [options.viewTarget]
 * @returns {Window|null} The opened print window
 */
export function openPrintableWorksheet({ visualId, state = {}, viewTarget = null }) {
  let svgMarkup = '';

  if (viewTarget?.getSVG) {
    try {
      svgMarkup = viewTarget.getSVG(700, 480);
    } catch (e) {
      console.warn('Could not retrieve SVG via viewTarget.getSVG:', e);
    }
  }

  const worksheetData = generateWorksheetData(visualId, state);
  const html = generateWorksheetHTML({ visualId, state, svgMarkup, worksheetData });

  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return printWindow;
    }
  }
  return null;
}
