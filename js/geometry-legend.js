import { t } from './i18n.js';
/**
 * @file geometry-legend.js
 * @description Collapsible pop-out Legend Modal & Cheatsheet for Circle Geometry Notation.
 * Provides visual diagrams, formal definitions, and mathematical notation for radii,
 * diameters, chords, secants, tangents, arcs, sectors, segments, subtended angles,
 * and the lab's unified colour grammar tokens.
 */

export const GEOMETRY_ELEMENTS = [
  // 1. Lines & Segments
  {
    id: 'radius',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Radius',
    symbol: 'r, OA',
    formula: '|OA| = r',
    definition: 'A straight line segment from the centre of a circle to any point on its circumference. All radii in a circle are congruent.',
    colorToken: 'Center O: Indigo (#6366f1) | Radius OA: Sky (#0284c7) / Blue (#3b82f6) | Point A: Red (#ef4444)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="50" y1="50" x2="88" y2="50" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <circle cx="88" cy="50" r="3" fill="#ef4444"/>
        <text x="44" y="46" fill="#6366f1" font-size="9" font-weight="bold">O</text>
        <text x="91" y="53" fill="#ef4444" font-size="9" font-weight="bold">A</text>
        <text x="66" y="44" fill="#0284c7" font-size="9" font-weight="bold">r</text>
      </svg>
    `
  },
  {
    id: 'diameter',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Diameter',
    symbol: 'd, AB',
    formula: '|d| = 2r',
    definition: 'A straight chord passing through the circle centre, dividing the circle into two congruent semicircles. It is the longest possible chord.',
    colorToken: 'Endpoint A: Red (#ef4444) | Endpoint B: Orange (#f97316) | Center O: Indigo (#6366f1) | Diameter Segment: Red (#ef4444)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="12" y1="50" x2="88" y2="50" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <circle cx="12" cy="50" r="3" fill="#ef4444"/>
        <circle cx="88" cy="50" r="3" fill="#f97316"/>
        <text x="4" y="53" fill="#ef4444" font-size="9" font-weight="bold">A</text>
        <text x="92" y="53" fill="#f97316" font-size="9" font-weight="bold">B</text>
        <text x="47" y="44" fill="#6366f1" font-size="9" font-weight="bold">O</text>
        <text x="48" y="63" fill="#ef4444" font-size="9" font-weight="bold">|d|</text>
      </svg>
    `
  },
  {
    id: 'chord',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Chord',
    symbol: 'AB',
    formula: '|AB| = 2r \\sin\\left(\\frac{\\theta}{2}\\right)',
    definition: 'A straight line segment joining two distinct points on the circumference without necessarily passing through the centre.',
    colorToken: 'Chord AB: Amber (#fbbf24) | Endpoint A: Blue (#3b82f6) | Endpoint B: Orange (#f97316)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="22" y1="28" x2="78" y2="28" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="2.5" fill="#64748b"/>
        <circle cx="22" cy="28" r="3" fill="#3b82f6"/>
        <circle cx="78" cy="28" r="3" fill="#f97316"/>
        <text x="14" y="27" fill="#3b82f6" font-size="9" font-weight="bold">A</text>
        <text x="82" y="27" fill="#f97316" font-size="9" font-weight="bold">B</text>
        <text x="47" y="22" fill="#fbbf24" font-size="9" font-weight="bold">Chord</text>
      </svg>
    `
  },
  {
    id: 'secant',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Secant Line',
    symbol: 'Line AB',
    formula: '\\text{Secant cuts circle at 2 points: } A, B',
    definition: 'An extended straight line that cuts the circle at two distinct points. A chord is the finite segment bounded between the secant intersection points.',
    colorToken: 'Secant Line: Steel (#6488b0) | Cut Points: Sky (#38bdf8)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="4" y1="22" x2="96" y2="34" stroke="#6488b0" stroke-width="2.5" stroke-dasharray="4,2"/>
        <circle cx="22" cy="24.5" r="3" fill="#38bdf8"/>
        <circle cx="78" cy="31.5" r="3" fill="#38bdf8"/>
        <text x="46" y="20" fill="#6488b0" font-size="8.5" font-weight="bold">Secant Line</text>
      </svg>
    `
  },
  {
    id: 'tangent',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Tangent Line',
    symbol: 't, OT ⊥ t',
    formula: 'OT \\perp t \\implies OT \\cdot \\mathbf{v}_{\\text{tan}} = 0, \\quad \\angle(OT, t) = 90^\\circ',
    definition: 'A coplanar line touching the circle at exactly one contact point T, strictly perpendicular (90°) to radius OT. Dynamic quadrants and orthogonal trigonometric projections (cos, sin, tan) align with the tangent.',
    colorToken: 'Tangent Line: Emerald (#10b981) / Lime (#84cc16) | Radius OT: Blue (#3b82f6) | Contact Point T: Red (#ef4444) | Right Angle: Teal (#14b8a6) | Reflex T*: Cyan (#06b6d4) | cos θ: Sky (#0284c7) | sin θ: Emerald (#10b981) | tan θ: Rose (#f43f5e)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="45" r="32" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="50" y1="45" x2="50" y2="77" stroke="#3b82f6" stroke-width="2"/>
        <line x1="12" y1="77" x2="88" y2="77" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <!-- Right angle mark -->
        <path d="M 50 69 L 58 69 L 58 77" fill="none" stroke="#14b8a6" stroke-width="1.5"/>
        <circle cx="50" cy="45" r="3" fill="#6366f1"/>
        <circle cx="50" cy="77" r="3.5" fill="#ef4444"/>
        <text x="42" y="42" fill="#6366f1" font-size="8.5" font-weight="bold">O</text>
        <text x="54" y="87" fill="#ef4444" font-size="8.5" font-weight="bold">T</text>
        <text x="14" y="72" fill="#10b981" font-size="8" font-weight="bold">Tangent (90°)</text>
      </svg>
    `
  },

  // 2. Regions & Areas
  {
    id: 'arc',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Arc (Minor / Major)',
    symbol: '⌒AB',
    formula: 's = r\\theta \\quad (\\theta \\text{ in rad})',
    definition: 'A connected curved segment of the circumference. The minor arc is the shorter curve between two points; the major arc is the longer curve.',
    colorToken: 'PALETTE.yellow (#eab308)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#334155" stroke-dasharray="3,3" stroke-width="1.5"/>
        <path d="M 23 28 A 38 38 0 0 1 77 28" fill="none" stroke="#eab308" stroke-width="4" stroke-linecap="round"/>
        <circle cx="23" cy="28" r="3" fill="#3b82f6"/>
        <circle cx="77" cy="28" r="3" fill="#f97316"/>
        <text x="13" y="27" fill="#3b82f6" font-size="8.5" font-weight="bold">A</text>
        <text x="81" y="27" fill="#f97316" font-size="8.5" font-weight="bold">B</text>
        <text x="44" y="16" fill="#eab308" font-size="9" font-weight="bold">Arc s</text>
      </svg>
    `
  },
  {
    id: 'sector',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Circular Sector',
    symbol: 'Sector OAB',
    formula: '\\text{Area} = \\frac{1}{2} r^2 \\theta',
    definition: 'The wedge-shaped region enclosed by two radii and the arc between them (similar to a pizza slice). Area is proportional to central angle θ.',
    colorToken: 'PALETTE.amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#334155" stroke-width="1.5"/>
        <path d="M 50 50 L 77 23 A 38 38 0 0 1 88 50 Z" fill="rgba(251, 191, 36, 0.3)" stroke="#fbbf24" stroke-width="2"/>
        <circle cx="50" cy="50" r="2.5" fill="#6366f1"/>
        <text x="64" y="44" fill="#fbbf24" font-size="8" font-weight="bold">Sector</text>
      </svg>
    `
  },
  {
    id: 'segment',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Circular Segment',
    symbol: 'Segment on AB',
    formula: '\\text{Area} = \\frac{1}{2} r^2 (\\theta - \\sin\\theta)',
    definition: 'The region enclosed between a straight chord and the circular arc subtended by it. Can be Major (greater than semicircle) or Minor (less than semicircle).',
    colorToken: 'Major: Sky Blue (#0284c7) | Minor: Violet (#a855f7)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#334155" stroke-width="1.5"/>
        <path d="M 23 28 L 77 28 A 38 38 0 0 0 23 28 Z" fill="rgba(168, 85, 247, 0.28)" stroke="#a855f7" stroke-width="2"/>
        <line x1="23" y1="28" x2="77" y2="28" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="36" y="22" fill="#a855f7" font-size="8" font-weight="bold">Alt Seg (Min)</text>
      </svg>
    `
  },
  {
    id: 'alternate-segment',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Alternate Segment Theorem & Auxiliary Thales Diameter',
    symbol: '∠TAB = ∠APB = α',
    formula: '\\angle(t, \\text{chord } TA) = \\angle TBA = \\alpha, \\quad TD = 2r \\implies \\angle TBD = 90^\\circ',
    definition: 'The angle between a tangent line and a chord TA equals the inscribed angle subtended by the chord in the alternate segment. Proven via auxiliary diameter TD through center O with right angles ∠TBD = ∠TAD = 90° and interior angle ∠TDA = α.',
    colorToken: 'Tangent: Emerald (#10b981) | Chord TA: Blue (#3b82f6) | Inscribed Angle α: Yellow (#eab308) | Major Segment: Sky (#0284c7) | Minor Segment: Violet (#a855f7) | Auxiliary Diameter TD: Indigo (#6366f1) | Right Angles: Teal (#14b8a6) | Ext D: Rose (#f43f5e)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="46" r="32" fill="none" stroke="#475569" stroke-width="1.8"/>
        <!-- Major segment in Sky -->
        <path d="M 50 78 L 22 30 A 32 32 0 1 1 50 78 Z" fill="rgba(2, 132, 199, 0.16)" stroke="none"/>
        <!-- Minor segment in Violet -->
        <path d="M 50 78 L 22 30 A 32 32 0 0 0 50 78 Z" fill="rgba(168, 85, 247, 0.16)" stroke="none"/>
        <!-- Tangent line in emerald -->
        <line x1="14" y1="78" x2="86" y2="78" stroke="#10b981" stroke-width="2.6" stroke-linecap="round"/>
        <!-- Chord TA in blue -->
        <line x1="50" y1="78" x2="22" y2="30" stroke="#3b82f6" stroke-width="2.2"/>
        <!-- Chords to vertex B in orange -->
        <line x1="50" y1="78" x2="78" y2="34" stroke="#f97316" stroke-width="2"/>
        <line x1="22" y1="30" x2="78" y2="34" stroke="#f97316" stroke-width="2"/>
        <!-- Auxiliary diameter TD in indigo dashed -->
        <line x1="50" y1="78" x2="50" y2="14" stroke="#6366f1" stroke-width="1.8" stroke-dasharray="3,2"/>
        <line x1="78" y1="34" x2="50" y2="14" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="2,2"/>
        <!-- Inscribed angle wedges in yellow -->
        <path d="M 42 78 A 8 8 0 0 1 45 70" fill="none" stroke="#eab308" stroke-width="2"/>
        <path d="M 70 33 A 8 8 0 0 1 72 40" fill="none" stroke="#eab308" stroke-width="2"/>
        <!-- Right angle mark at B in teal -->
        <path d="M 74 30 L 76 26 L 72 24" fill="none" stroke="#14b8a6" stroke-width="1.5"/>
        <!-- Vertices -->
        <circle cx="50" cy="78" r="3.2" fill="#ef4444"/>
        <circle cx="22" cy="30" r="3" fill="#3b82f6"/>
        <circle cx="78" cy="34" r="3" fill="#f97316"/>
        <circle cx="50" cy="14" r="2.8" fill="#6366f1"/>
        <circle cx="50" cy="46" r="2" fill="#6366f1"/>
        <!-- Labels -->
        <text x="48" y="88" fill="#ef4444" font-size="8" font-weight="bold">T</text>
        <text x="13" y="28" fill="#3b82f6" font-size="8" font-weight="bold">A</text>
        <text x="82" y="36" fill="#f97316" font-size="8" font-weight="bold">B</text>
        <text x="47" y="10" fill="#6366f1" font-size="8" font-weight="bold">D</text>
        <text x="35" y="74" fill="#eab308" font-size="7.5" font-weight="bold">α</text>
        <text x="65" y="42" fill="#eab308" font-size="7.5" font-weight="bold">α</text>
        <text x="15" y="62" fill="#a855f7" font-size="6.5" font-weight="bold">Min</text>
        <text x="56" y="58" fill="#0284c7" font-size="6.5" font-weight="bold">Maj</text>
      </svg>
    `
  },
  {
    id: 'sagitta-curvature',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Sagitta & Spherical Curvature Contraction',
    symbol: 's = R(1 - cos(θ/2)), K = 1/r',
    formula: 's = R\\left(1 - \\cos\\frac{\\theta}{2}\\right), \\quad K = \\frac{1}{r}, \\quad h = \\sqrt{R^2 - r^2}',
    definition: 'The sagitta s measures the radial height from the midpoint of chord AB to the arc apex. Under spherical projection onto S², the cutting circle radius r contracts relative to sphere radius R with plane distance h = R cos(φ).',
    colorToken: 'Sagitta s: Rose (#f43f5e) | Chord AB: Amber (#fbbf24) | Midpoint M: Teal (#14b8a6) | Cutting Circle: Sky (#0284c7) | Spherical Arc: Amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <!-- Chord AB in amber -->
        <line x1="20" y1="40" x2="80" y2="40" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round"/>
        <!-- Sagitta s in rose -->
        <line x1="50" y1="40" x2="50" y2="12" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>
        <!-- Normal line to center in indigo dashed -->
        <line x1="50" y1="50" x2="50" y2="40" stroke="#6366f1" stroke-width="1.8" stroke-dasharray="2,2"/>
        <!-- Right angle mark at M in teal -->
        <path d="M 50 46 L 56 46 L 56 40" fill="none" stroke="#14b8a6" stroke-width="1.5"/>
        <!-- Points -->
        <circle cx="50" cy="50" r="2.5" fill="#6366f1"/>
        <circle cx="50" cy="40" r="2.5" fill="#14b8a6"/>
        <circle cx="50" cy="12" r="3" fill="#f43f5e"/>
        <circle cx="20" cy="40" r="3" fill="#3b82f6"/>
        <circle cx="80" cy="40" r="3" fill="#f97316"/>
        <!-- Labels -->
        <text x="12" y="43" fill="#3b82f6" font-size="8" font-weight="bold">A</text>
        <text x="83" y="43" fill="#f97316" font-size="8" font-weight="bold">B</text>
        <text x="53" y="43" fill="#14b8a6" font-size="7.5" font-weight="bold">M</text>
        <text x="54" y="28" fill="#f43f5e" font-size="8" font-weight="bold">s</text>
        <text x="47" y="60" fill="#6366f1" font-size="7.5" font-weight="bold">O</text>
        <text x="24" y="78" fill="#0284c7" font-size="7" font-weight="bold">s = R(1 - cos θ/2)</text>
      </svg>
    `
  },

  // 3. Angles & Invariants
  {
    id: 'inscribed-angle',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Inscribed Angle',
    symbol: '∠APB',
    formula: '\\theta = \\frac{1}{2} \\angle\\text{AOB} = \\frac{1}{2} \\times \\text{Central } \\angle',
    definition: 'An angle whose vertex P lies on the circle circumference and whose legs contain chords subtending arc AB.',
    colorToken: 'Vertex P: Violet (#a855f7) | Inscribed Angle θ: Yellow (#eab308) | Chords PA, PB: Blue (#3b82f6) / Orange (#f97316)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="50" y1="12" x2="20" y2="68" stroke="#3b82f6" stroke-width="2"/>
        <line x1="50" y1="12" x2="80" y2="68" stroke="#f97316" stroke-width="2"/>
        <path d="M 45 22 A 12 12 0 0 1 55 22" fill="none" stroke="#eab308" stroke-width="2"/>
        <circle cx="50" cy="12" r="3" fill="#a855f7"/>
        <text x="46" y="8" fill="#a855f7" font-size="8.5" font-weight="bold">P</text>
        <text x="48" y="30" fill="#eab308" font-size="8" font-weight="bold">θ</text>
      </svg>
    `
  },
  {
    id: 'central-angle',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Central Angle',
    symbol: '∠AOB',
    formula: '\\angle\\text{AOB} = 2\\angle\\text{APB} = 2\\theta',
    definition: 'An angle whose apex is at the circle centre O, subtending the same arc as an inscribed angle. It is always exactly twice the measure of the inscribed angle.',
    colorToken: 'Center O: Indigo (#6366f1) | Central Angle 2θ: Amber (#fbbf24) / Yellow (#eab308) | Radii OA, OB: Blue (#3b82f6) / Orange (#f97316)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="50" y1="50" x2="20" y2="68" stroke="#3b82f6" stroke-width="2"/>
        <line x1="50" y1="50" x2="80" y2="68" stroke="#f97316" stroke-width="2"/>
        <path d="M 40 56 A 14 14 0 0 0 60 56" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <text x="47" y="44" fill="#6366f1" font-size="8.5" font-weight="bold">O</text>
        <text x="46" y="67" fill="#fbbf24" font-size="8" font-weight="bold">2θ</text>
      </svg>
    `
  },
  {
    id: 'angles-same-segment',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Angles in the Same Segment',
    symbol: '∠AP₁B = ∠AP₂B = θ',
    formula: '\\angle AP_1B = \\angle AP_2B = \\frac{1}{2}\\angle AOB = \\theta',
    definition: 'Inscribed angles subtended at the circumference by the same chord AB in the same circular segment are identically congruent. Vertices P₁ and P₂ glide along the common arc while preserving angle measure θ.',
    colorToken: 'P₁ / ∠P₁: Blue (#3b82f6) | P₂ / ∠P₂: Emerald (#10b981) | Common Chord AB: Red (#ef4444) | Same Segment: Sky (#0284c7) | Central 2θ: Yellow (#eab308) | Centre O: Indigo (#6366f1) | Spherical Arc: Amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <!-- Same Segment fill in sky -->
        <path d="M 22 70 L 78 70 A 38 38 0 1 0 22 70 Z" fill="rgba(2, 132, 199, 0.12)" stroke="none"/>
        <!-- Common chord AB in red -->
        <line x1="22" y1="70" x2="78" y2="70" stroke="#ef4444" stroke-width="2.8" stroke-linecap="round"/>
        <!-- Chords from P1 in blue -->
        <line x1="32" y1="20" x2="22" y2="70" stroke="#3b82f6" stroke-width="1.8"/>
        <line x1="32" y1="20" x2="78" y2="70" stroke="#3b82f6" stroke-width="1.8"/>
        <!-- Chords from P2 in emerald -->
        <line x1="68" y1="22" x2="22" y2="70" stroke="#10b981" stroke-width="1.8"/>
        <line x1="68" y1="22" x2="78" y2="70" stroke="#10b981" stroke-width="1.8"/>
        <!-- Angle wedge arcs -->
        <path d="M 29 30 A 11 11 0 0 0 40 30" fill="none" stroke="#3b82f6" stroke-width="2"/>
        <path d="M 59 31 A 11 11 0 0 0 71 33" fill="none" stroke="#10b981" stroke-width="2"/>
        <!-- Central angle radii in indigo dashed -->
        <line x1="50" y1="50" x2="22" y2="70" stroke="#6366f1" stroke-width="1.2" stroke-dasharray="2,2"/>
        <line x1="50" y1="50" x2="78" y2="70" stroke="#6366f1" stroke-width="1.2" stroke-dasharray="2,2"/>
        <!-- Central angle arc in yellow -->
        <path d="M 42 56 A 11 11 0 0 0 58 56" fill="none" stroke="#eab308" stroke-width="2"/>
        <!-- Vertices -->
        <circle cx="22" cy="70" r="3" fill="#ef4444"/>
        <circle cx="78" cy="70" r="3" fill="#ef4444"/>
        <circle cx="32" cy="20" r="3" fill="#3b82f6"/>
        <circle cx="68" cy="22" r="3" fill="#10b981"/>
        <circle cx="50" cy="50" r="2.5" fill="#6366f1"/>
        <!-- Text labels -->
        <text x="14" y="74" fill="#ef4444" font-size="8" font-weight="bold">A</text>
        <text x="81" y="74" fill="#ef4444" font-size="8" font-weight="bold">B</text>
        <text x="28" y="15" fill="#3b82f6" font-size="8" font-weight="bold">P₁</text>
        <text x="70" y="17" fill="#10b981" font-size="8" font-weight="bold">P₂</text>
        <text x="47" y="46" fill="#6366f1" font-size="7.5" font-weight="bold">O</text>
        <text x="46" y="64" fill="#eab308" font-size="7.5" font-weight="bold">2θ</text>
        <text x="32" y="38" fill="#3b82f6" font-size="7.5" font-weight="bold">θ₁</text>
        <text x="65" y="39" fill="#10b981" font-size="7.5" font-weight="bold">θ₂</text>
      </svg>
    `
  },
  {
    id: 'reflex-perigon',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Reflex Angle & Perigon',
    symbol: 'θ*, θ + θ* = 360°',
    formula: '\\theta^* = 360^\\circ - \\theta, \\quad \\theta + \\theta^* = 360^\\circ',
    definition: 'A reflex angle is an angle greater than 180° and less than 360°. Together with its interior conjugate angle, it forms an exact 360° perigon (full circle).',
    colorToken: 'PALETTE.lime (#84cc16) / PALETTE.teal (#14b8a6)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#334155" stroke-dasharray="3,3" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="85" y2="50" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="15" stroke="#cbd5e1" stroke-width="2"/>
        <!-- Reflex arc -->
        <path d="M 50 25 A 25 25 0 1 1 75 50" fill="none" stroke="#84cc16" stroke-width="3" stroke-linecap="round"/>
        <text x="25" y="72" fill="#84cc16" font-size="8" font-weight="bold">Reflex θ* (270°)</text>
      </svg>
    `
  },
  {
    id: 'cyclic-quad',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Cyclic Quadrilateral',
    symbol: 'ABCD on circle',
    formula: '\\angle A + \\angle C = 180^\\circ, \\quad \\angle B + \\angle D = 180^\\circ',
    definition: 'A quadrilateral whose four vertices all lie on a single common circle. Opposite interior angles are strictly supplementary (sum to 180°). Diagonals AC and BD join opposite vertices and meet inside the circle.',
    colorToken: 'Vertex A: Violet (#a855f7) | Vertex B: Cyan (#06b6d4) | Vertex C: Amber (#fbbf24) | Vertex D: Rose (#f43f5e) | Diagonal AC: Lavender (#c4b5fd) | Diagonal BD: Sky (#0284c7)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <polygon points="50,12 85,38 68,84 20,70" fill="rgba(99, 102, 241, 0.12)" stroke="#cbd5e1" stroke-width="2"/>
        <line x1="50" y1="12" x2="68" y2="84" stroke="#c4b5fd" stroke-width="1.6" stroke-dasharray="4,3"/>
        <line x1="85" y1="38" x2="20" y2="70" stroke="#0284c7" stroke-width="1.6" stroke-dasharray="4,3"/>
        <circle cx="50" cy="12" r="3" fill="#a855f7"/>
        <circle cx="85" cy="38" r="3" fill="#06b6d4"/>
        <circle cx="68" cy="84" r="3" fill="#fbbf24"/>
        <circle cx="20" cy="70" r="3" fill="#f43f5e"/>
        <text x="46" y="9" fill="#a855f7" font-size="8" font-weight="bold">A</text>
        <text x="88" y="38" fill="#06b6d4" font-size="8" font-weight="bold">B</text>
        <text x="70" y="94" fill="#fbbf24" font-size="8" font-weight="bold">C</text>
        <text x="11" y="74" fill="#f43f5e" font-size="8" font-weight="bold">D</text>
        <text x="30" y="40" fill="#cbd5e1" font-size="7.5" font-weight="bold">Opp = 180°</text>
      </svg>
    `
  },
  {
    id: 'cyclic-diagonals-ptolemy',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: "Cyclic Diagonals & Ptolemy's Theorem",
    symbol: 'AC, BD',
    formula: '|AC| \\cdot |BD| = |AB| \\cdot |CD| + |BC| \\cdot |DA|',
    definition: 'In a cyclic quadrilateral, the product of the two diagonals equals the sum of the products of the two pairs of opposite sides. The diagonals intersect at an interior point of the circle.',
    colorToken: 'Diagonal AC: PALETTE.lavender (#c4b5fd) | Diagonal BD: PALETTE.sky (#0284c7) | Intersection: PALETTE.teal (#14b8a6)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="1.5"/>
        <polygon points="50,12 85,38 68,84 20,70" fill="none" stroke="#6366f1" stroke-width="1.5"/>
        <line x1="50" y1="12" x2="68" y2="84" stroke="#c4b5fd" stroke-width="2.5" stroke-dasharray="5,3"/>
        <line x1="85" y1="38" x2="20" y2="70" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="5,3"/>
        <circle cx="59.6" cy="50.5" r="3" fill="#14b8a6"/>
        <circle cx="50" cy="12" r="2.5" fill="#a855f7"/>
        <circle cx="85" cy="38" r="2.5" fill="#06b6d4"/>
        <circle cx="68" cy="84" r="2.5" fill="#fbbf24"/>
        <circle cx="20" cy="70" r="2.5" fill="#f43f5e"/>
        <text x="67" y="66" fill="#c4b5fd" font-size="8" font-weight="bold">AC</text>
        <text x="26" y="56" fill="#0284c7" font-size="8" font-weight="bold">BD</text>
      </svg>
    `
  },

  // 4. Circle Theorems & Invariants
  {
    id: 'thales-semicircle',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: "Thales' Theorem & Semicircle Right Angle",
    symbol: '∠APB = 90°',
    formula: '\\angle APB = 90^\\circ \\iff AB \\text{ is diameter}',
    definition: 'Any angle inscribed in a semicircle subtended by a diameter AB at circumference point P is strictly a right angle (90°). Triangle APB has hypotenuse AB = 2r.',
    colorToken: 'Diameter AB: Red (#ef4444) / Orange (#f97316) | Vertex P: Teal (#14b8a6) | Right Angle 90°: Teal (#14b8a6) | Center O: Indigo (#6366f1)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <path d="M 14 62 A 36 36 0 0 1 86 62 Z" fill="rgba(20, 184, 166, 0.08)" stroke="#475569" stroke-width="2"/>
        <line x1="14" y1="62" x2="86" y2="62" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="14" y1="62" x2="62" y2="28" stroke="#3b82f6" stroke-width="2"/>
        <line x1="86" y1="62" x2="62" y2="28" stroke="#f97316" stroke-width="2"/>
        <path d="M 57 32 L 62 38 L 67 33" fill="none" stroke="#14b8a6" stroke-width="1.8"/>
        <circle cx="50" cy="62" r="2.5" fill="#6366f1"/>
        <circle cx="14" cy="62" r="3" fill="#ef4444"/>
        <circle cx="86" cy="62" r="3" fill="#f97316"/>
        <circle cx="62" cy="28" r="3.5" fill="#14b8a6"/>
        <text x="7" y="65" fill="#ef4444" font-size="8.5" font-weight="bold">A</text>
        <text x="89" y="65" fill="#f97316" font-size="8.5" font-weight="bold">B</text>
        <text x="64" y="24" fill="#14b8a6" font-size="8.5" font-weight="bold">P</text>
        <text x="47" y="73" fill="#6366f1" font-size="8" font-weight="bold">O</text>
        <text x="36" y="44" fill="#14b8a6" font-size="8" font-weight="bold">90°</text>
      </svg>
    `
  },
  {
    id: 'tangents-external-point',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Tangents from an External Point',
    symbol: '|PT₁| = |PT₂|',
    formula: '|PT_1| = |PT_2| = \\sqrt{d^2 - r^2}',
    definition: 'Two tangent lines drawn to a circle from an external point P are strictly congruent. Radii OT₁ and OT₂ form an orthogonal kite PT₁OT₂ with ∠PT₁O = ∠PT₂O = 90°.',
    colorToken: 'External Point P: Rose (#f43f5e) | Tangents PT₁, PT₂: Emerald (#10b981) | Contact Points T₁, T₂: Emerald (#10b981) | Radii OT₁, OT₂: Blue (#3b82f6) | Center O: Indigo (#6366f1) | Right Angles: Teal (#14b8a6)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="42" cy="50" r="28" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="42" y1="50" x2="52" y2="24" stroke="#3b82f6" stroke-width="1.8"/>
        <line x1="42" y1="50" x2="52" y2="76" stroke="#3b82f6" stroke-width="1.8"/>
        <line x1="90" y1="50" x2="52" y2="24" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="90" y1="50" x2="52" y2="76" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="42" y1="50" x2="90" y2="50" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 31 L 56 34 L 58 26" fill="none" stroke="#14b8a6" stroke-width="1.5"/>
        <path d="M 50 69 L 56 66 L 58 74" fill="none" stroke="#14b8a6" stroke-width="1.5"/>
        <circle cx="42" cy="50" r="3" fill="#6366f1"/>
        <circle cx="90" cy="50" r="3.5" fill="#f43f5e"/>
        <circle cx="52" cy="24" r="3" fill="#10b981"/>
        <circle cx="52" cy="76" r="3" fill="#10b981"/>
        <text x="34" y="53" fill="#6366f1" font-size="8.5" font-weight="bold">O</text>
        <text x="93" y="53" fill="#f43f5e" font-size="8.5" font-weight="bold">P</text>
        <text x="48" y="19" fill="#10b981" font-size="8" font-weight="bold">T₁</text>
        <text x="48" y="87" fill="#10b981" font-size="8" font-weight="bold">T₂</text>
        <text x="66" y="32" fill="#10b981" font-size="7.5" font-weight="bold">|PT₁|</text>
        <text x="66" y="73" fill="#10b981" font-size="7.5" font-weight="bold">|PT₂|</text>
      </svg>
    `
  },
  {
    id: 'perpendicular-chord-bisector',
    category: 'lines',
    categoryName: 'Lines & Distances',
    name: 'Perpendicular Chord Bisector',
    symbol: 'OM ⊥ AB, |AM| = |MB|',
    formula: 'OM \\perp AB \\iff |AM| = |MB|',
    definition: 'A line segment from the center O perpendicular to chord AB bisects the chord at M. Conversely, the perpendicular bisector of any chord passes through the center.',
    colorToken: 'Chord AB: Amber (#fbbf24) | Bisector OM: Indigo (#6366f1) | Midpoint M: Teal (#14b8a6) | Right Angle 90°: Teal (#14b8a6) | Reflex M* (270°): Cyan (#06b6d4) | Center O: Indigo (#6366f1)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <line x1="20" y1="36" x2="80" y2="36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="50" x2="50" y2="12" stroke="#6366f1" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 50 42 L 56 42 L 56 36" fill="none" stroke="#14b8a6" stroke-width="1.6"/>
        <line x1="34" y1="33" x2="34" y2="39" stroke="#fbbf24" stroke-width="1.8"/>
        <line x1="66" y1="33" x2="66" y2="39" stroke="#fbbf24" stroke-width="1.8"/>
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <circle cx="50" cy="36" r="3" fill="#14b8a6"/>
        <circle cx="20" cy="36" r="3" fill="#3b82f6"/>
        <circle cx="80" cy="36" r="3" fill="#f97316"/>
        <text x="12" y="38" fill="#3b82f6" font-size="8.5" font-weight="bold">A</text>
        <text x="83" y="38" fill="#f97316" font-size="8.5" font-weight="bold">B</text>
        <text x="47" y="60" fill="#6366f1" font-size="8.5" font-weight="bold">O</text>
        <text x="52" y="32" fill="#14b8a6" font-size="8.5" font-weight="bold">M</text>
        <text x="32" y="49" fill="#14b8a6" font-size="7.5" font-weight="bold">OM ⊥ AB</text>
      </svg>
    `
  },
  {
    id: 'affine-conic-invariants',
    category: 'regions',
    categoryName: 'Regions & Arcs',
    name: 'Affine Conic Mode & Erlangen Invariants',
    symbol: 'v₁ᵀ Q v₂ = 0',
    formula: '\\mathbf{v}_1^T Q \\mathbf{v}_2 = 0, \\quad Q = (S^{-1})^T S^{-1}',
    definition: 'Under non-isotropic stretch S(s, ω), circular geometry maps to elliptical quadrics while preserving affine invariants (parallelism, midpoints, and Apollonius conjugate diameter polarity).',
    colorToken: 'PALETTE.violet (#a855f7) / PALETTE.cyan (#06b6d4)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="34" fill="none" stroke="#334155" stroke-dasharray="3,3" stroke-width="1.2"/>
        <ellipse cx="50" cy="50" rx="42" ry="22" transform="rotate(-25 50 50)" fill="rgba(168, 85, 247, 0.12)" stroke="#a855f7" stroke-width="2.2"/>
        <line x1="12" y1="64" x2="88" y2="36" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
        <line x1="41" y1="28" x2="59" y2="72" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="2.5" fill="#6366f1"/>
        <text x="44" y="47" fill="#6366f1" font-size="8" font-weight="bold">O</text>
        <text x="80" y="32" fill="#06b6d4" font-size="8" font-weight="bold">v₁</text>
        <text x="61" y="78" fill="#fbbf24" font-size="8" font-weight="bold">v₂</text>
        <text x="24" y="24" fill="#a855f7" font-size="7.5" font-weight="bold">v₁ᵀ Q v₂ = 0</text>
      </svg>
    `
  },

  // 5. Trigonometry & Circular Functions
  {
    id: 'six-trig-functions',
    category: 'trig',
    categoryName: 'Trigonometry & Functions',
    name: 'The Six Circular Trigonometric Functions',
    symbol: 'sin, cos, tan, csc, sec, cot',
    formula: '\\sin^2\\theta + \\cos^2\\theta = 1, \\quad 1 + \\tan^2\\theta = \\sec^2\\theta',
    definition: 'Direct geometric segment lengths on the unit circle: cos θ (horizontal leg), sin θ (vertical altitude), tan θ (vertical tangent at x=1), sec θ (radial secant), cot θ (horizontal tangent at y=1), csc θ (vertical cosecant).',
    colorToken: 'Cos: Amber (#fbbf24) | Sin: Emerald (#10b981) | Tan: Rose (#f43f5e) | Sec: Sky (#0284c7)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="45" cy="55" r="35" fill="none" stroke="#475569" stroke-width="1.8"/>
        <line x1="8" y1="55" x2="88" y2="55" stroke="#334155" stroke-width="1.2"/>
        <line x1="45" y1="12" x2="45" y2="92" stroke="#334155" stroke-width="1.2"/>
        <line x1="45" y1="55" x2="72" y2="55" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <line x1="72" y1="55" x2="72" y2="33" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <line x1="45" y1="55" x2="72" y2="33" stroke="#6366f1" stroke-width="1.8"/>
        <line x1="80" y1="55" x2="80" y2="26" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="45" y1="55" x2="80" y2="26" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="3,2"/>
        <circle cx="72" cy="33" r="2.5" fill="#ef4444"/>
        <text x="54" y="63" fill="#fbbf24" font-size="7" font-weight="bold">cos θ</text>
        <text x="74" y="46" fill="#10b981" font-size="7" font-weight="bold">sin θ</text>
        <text x="82" y="42" fill="#f43f5e" font-size="7" font-weight="bold">tan θ</text>
      </svg>
    `
  },
  {
    id: 'cylindrical-helix-waves',
    category: 'trig',
    categoryName: 'Trigonometry & Functions',
    name: '3D Cylindrical Helix & Wave Projections',
    symbol: 'r(θ) = (cos θ, hθ, sin θ)',
    formula: '\\mathbf{r}(\\theta) = \\left(R\\cos\\theta, \\; \\frac{p}{2\\pi}\\theta, \\; R\\sin\\theta\\right)',
    definition: 'Parametric spatial curve lifting circular rotation into a 3D cylindrical wave. Planar orthogonal projections yield harmonic sinusoidal waves x(θ) = R cos θ and z(θ) = R sin θ along the cylinder axis.',
    colorToken: 'PALETTE.sky (#0284c7) / PALETTE.violet (#a855f7)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <ellipse cx="50" cy="22" rx="30" ry="10" fill="none" stroke="#334155" stroke-width="1.2"/>
        <ellipse cx="50" cy="78" rx="30" ry="10" fill="none" stroke="#334155" stroke-width="1.2"/>
        <line x1="20" y1="22" x2="20" y2="78" stroke="#334155" stroke-width="1.2"/>
        <line x1="80" y1="22" x2="80" y2="78" stroke="#334155" stroke-width="1.2"/>
        <path d="M 20 78 C 30 70, 70 70, 80 62 C 70 54, 30 54, 20 46 C 30 38, 70 38, 80 30" fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
        <path d="M 20 78 Q 50 64, 80 50 T 20 22" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="3,2"/>
        <text x="44" y="16" fill="#0284c7" font-size="8" font-weight="bold">Helix r(θ)</text>
        <text x="48" y="52" fill="#a855f7" font-size="7" font-weight="bold">sin(θ)</text>
      </svg>
    `
  },
  {
    id: 'law-of-sines-circumdiameter',
    category: 'trig',
    categoryName: 'Trigonometry & Functions',
    name: 'Law of Sines & Circumcircle Invariant',
    symbol: 'a / sin A = b / sin B = c / sin C = 2R',
    formula: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R_{\\text{circum}}',
    definition: 'The ratio of each triangle side to the sine of its opposing angle equals the circumcircle diameter 2R (the generalized inscribed angle theorem). On sphere S²: sin(a/R)/sin A = sin(b/R)/sin B = sin(c/R)/sin C.',
    colorToken: 'Side a / ∠A: Red (#ef4444) | Side b / ∠B: Orange (#f97316) | Side c / ∠C: Blue (#3b82f6)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#0284c7" stroke-width="1.8" stroke-dasharray="3,2"/>
        <polygon points="50,12 18,74 82,74" fill="rgba(2, 132, 199, 0.08)" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="18" y1="74" x2="82" y2="74" stroke="#3b82f6" stroke-width="2.5"/>
        <line x1="50" y1="12" x2="18" y2="74" stroke="#f97316" stroke-width="2.5"/>
        <line x1="50" y1="12" x2="82" y2="74" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="50" y1="12" x2="50" y2="74" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,2"/>
        <path d="M 50 68 L 56 68 L 56 74" fill="none" stroke="#14b8a6" stroke-width="1.2"/>
        <circle cx="50" cy="12" r="3" fill="#ef4444"/>
        <circle cx="18" cy="74" r="3" fill="#f97316"/>
        <circle cx="82" cy="74" r="3" fill="#3b82f6"/>
        <text x="47" y="8" fill="#ef4444" font-size="8.5" font-weight="bold">A</text>
        <text x="9" y="78" fill="#f97316" font-size="8.5" font-weight="bold">B</text>
        <text x="85" y="78" fill="#3b82f6" font-size="8.5" font-weight="bold">C</text>
        <text x="32" y="83" fill="#3b82f6" font-size="7" font-weight="bold">c/sinC = 2R</text>
      </svg>
    `
  },
  {
    id: 'law-of-cosines-projection',
    category: 'trig',
    categoryName: 'Trigonometry & Functions',
    name: 'Law of Cosines & Bilinear Interaction Rectangle',
    symbol: 'c² = a² + b² - 2ab cos C',
    formula: 'c^2 = a^2 + b^2 - 2ab\\cos C, \\quad P_\\parallel + P_\\perp = I',
    definition: 'Generalized Pythagorean theorem using idempotent orthogonal projection: c² = a² + b² - 2ab cos C. The correction term -2ab cos C represents the signed area of the bilinear interaction rectangle below base b.',
    colorToken: 'A: Sky (#0284c7) | B: Emerald (#10b981) | C: Rose (#f43f5e) | cos C: Violet (#a855f7) | Bilinear Rect: Amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <line x1="16" y1="52" x2="84" y2="52" stroke="#3b82f6" stroke-width="2.5"/>
        <line x1="16" y1="52" x2="48" y2="18" stroke="#f97316" stroke-width="2.5"/>
        <line x1="84" y1="52" x2="48" y2="18" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="48" y1="18" x2="48" y2="52" stroke="#10b981" stroke-width="1.8" stroke-dasharray="3,2"/>
        <rect x="48" y="52" width="36" height="24" fill="rgba(251, 191, 36, 0.22)" stroke="#fbbf24" stroke-width="1.8"/>
        <circle cx="16" cy="52" r="3" fill="#ef4444"/>
        <circle cx="84" cy="52" r="3" fill="#3b82f6"/>
        <circle cx="48" cy="18" r="3" fill="#f97316"/>
        <text x="8" y="55" fill="#ef4444" font-size="8.5" font-weight="bold">A</text>
        <text x="87" y="55" fill="#3b82f6" font-size="8.5" font-weight="bold">C</text>
        <text x="46" y="14" fill="#f97316" font-size="8.5" font-weight="bold">B</text>
        <text x="51" y="68" fill="#fbbf24" font-size="7" font-weight="bold">-2ab cos C</text>
      </svg>
    `
  },
  {
    id: 'angle-sum-difference-rotation',
    category: 'trig',
    categoryName: 'Trigonometry & Functions',
    name: 'Angle Sum, Difference & Rotation Group SO(2)/SO(3)',
    symbol: 'cos(α ± β), sin(α ± β)',
    formula: '\\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta',
    definition: 'Compound angle identities proven via stacked orthogonal right triangles (△OMQ, △OQP, △PSQ) and Lie group matrix composition in SO(2). Difference ray D(α-β) with horizontal foot N_D = cos(α-β) and vertical altitude sin(α-β) verifies subtraction.',
    colorToken: 'α: Sky (#0284c7) | β: Violet (#a855f7) | cos(α+β): Amber (#fbbf24) | sin(α+β): Emerald (#10b981) | cos(α−β): Orange (#f97316) | sin(α−β): Rose (#f43f5e)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,2"/>
        <line x1="50" y1="50" x2="88" y2="50" stroke="#64748b" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="82" y2="28" stroke="#0284c7" stroke-width="2.2"/>
        <line x1="50" y1="50" x2="62" y2="14" stroke="#fbbf24" stroke-width="2.5"/>
        <line x1="50" y1="50" x2="84" y2="42" stroke="#14b8a6" stroke-width="2"/>
        <line x1="62" y1="14" x2="72" y2="35" stroke="#f43f5e" stroke-width="1.8"/>
        <circle cx="50" cy="50" r="2.5" fill="#6366f1"/>
        <circle cx="62" cy="14" r="3" fill="#fbbf24"/>
        <text x="44" y="58" fill="#6366f1" font-size="7.5" font-weight="bold">O</text>
        <text x="64" y="10" fill="#fbbf24" font-size="7.5" font-weight="bold">P(α+β)</text>
        <text x="84" y="24" fill="#0284c7" font-size="7.5" font-weight="bold">Q(β)</text>
        <text x="86" y="44" fill="#14b8a6" font-size="7" font-weight="bold">D(α-β)</text>
      </svg>
    `
  }
,
  // 5. Composite Elements & Multi-Color Gradients
  {
    id: 'composite-diameter',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'Decomposed Diameter Segment (A → O → B)',
    symbol: 'AB = AO + OB',
    formula: 'A(\\text{Red}) \\to O(\\text{Indigo}) \\to B(\\text{Orange})',
    definition: 'Compound baseline diameter connecting distinct topological anchors. Rather than assigning a single duplicate token, the segment is visually decomposed into a linear gradient uniting the respective endpoint anchor tokens.',
    colorToken: 'Multi-Color Gradient: Red (#ef4444) → Indigo (#6366f1) → Orange (#f97316)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <defs>
          <linearGradient id="leg-grad-diam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="50%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#f97316"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="1.5"/>
        <line x1="12" y1="50" x2="88" y2="50" stroke="url(#leg-grad-diam)" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="12" cy="50" r="3" fill="#ef4444"/>
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <circle cx="88" cy="50" r="3" fill="#f97316"/>
        <text x="6" y="53" fill="#ef4444" font-size="8" font-weight="bold">A</text>
        <text x="47" y="44" fill="#6366f1" font-size="8" font-weight="bold">O</text>
        <text x="91" y="53" fill="#f97316" font-size="8" font-weight="bold">B</text>
      </svg>
    `
  },
  {
    id: 'composite-tangent-pair',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'Dual Tangents & Cyclic Kite (PT₁ / PT₂)',
    symbol: 'PT_1, PT_2',
    formula: '|PT_1| = |PT_2| = \\sqrt{d^2 - r^2}',
    definition: 'Two tangents drawn to a circle from a common external point P to contact points T₁ and T₂. Each tangent carries independent color tokens while forming a congruent cyclic kite with the radial vectors.',
    colorToken: 'External Point P: Rose (#f43f5e) | Contact T₁: Red (#ef4444) | Contact T₂: Amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="42" cy="50" r="28" fill="none" stroke="#475569" stroke-width="1.5"/>
        <line x1="90" y1="50" x2="42" y2="22" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="90" y1="50" x2="42" y2="78" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="42" y1="50" x2="42" y2="22" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="2,2"/>
        <line x1="42" y1="50" x2="42" y2="78" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="2,2"/>
        <circle cx="90" cy="50" r="3" fill="#f43f5e"/>
        <circle cx="42" cy="22" r="3" fill="#ef4444"/>
        <circle cx="42" cy="78" r="3" fill="#fbbf24"/>
        <circle cx="42" cy="50" r="2.5" fill="#6366f1"/>
        <text x="92" y="53" fill="#f43f5e" font-size="7.5" font-weight="bold">P</text>
        <text x="36" y="19" fill="#ef4444" font-size="7.5" font-weight="bold">T₁</text>
        <text x="36" y="86" fill="#fbbf24" font-size="7.5" font-weight="bold">T₂</text>
      </svg>
    `
  },
  {
    id: 'composite-stacked-triangles',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'Stacked Compound Angle Triangles (△OMQ, △OQP, △PSQ)',
    symbol: 'R(α + β) = R(α) ∘ R(β)',
    formula: '\\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta',
    definition: 'Stack of orthogonal right triangles generating addition and subtraction identities. Multi-color gradient bounding edges differentiate the stacked projections of cosine and sine.',
    colorToken: '△OMQ: Sky/Emerald | △OQP: Indigo/Amber | △PSQ: Amber/Rose/Teal',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <polygon points="20,80 80,80 80,45" fill="rgba(2, 132, 199, 0.15)" stroke="#0284c7" stroke-width="1.8"/>
        <polygon points="20,80 80,45 60,15" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" stroke-width="1.8"/>
        <polygon points="60,15 80,45 80,15" fill="rgba(251, 191, 36, 0.15)" stroke="#fbbf24" stroke-width="1.8"/>
        <circle cx="20" cy="80" r="2.5" fill="#6366f1"/>
        <circle cx="60" cy="15" r="3" fill="#fbbf24"/>
        <circle cx="80" cy="45" r="3" fill="#0284c7"/>
        <text x="14" y="86" fill="#6366f1" font-size="7.5" font-weight="bold">O</text>
        <text x="56" y="11" fill="#fbbf24" font-size="7.5" font-weight="bold">P</text>
        <text x="83" y="47" fill="#0284c7" font-size="7.5" font-weight="bold">Q</text>
      </svg>
    `
  },
  {
    id: 'composite-bilinear-rect',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'Bilinear Interaction Rectangle (2ab cos C)',
    symbol: '2ab cos C',
    formula: 'c^2 = a^2 + b^2 - 2ab \\cos C',
    definition: 'The generalized Pythagorean correction term represented in 3D ground plane with color-coded edge borders aligning with triangle sides a (Red), b (Orange), and included angle C (Blue).',
    colorToken: 'Side a: Red (#ef4444) | Side b: Orange (#f97316) | Angle C: Blue (#3b82f6) | Area: Amber (#fbbf24)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <rect x="22" y="32" width="56" height="36" fill="rgba(251, 191, 36, 0.18)" stroke="#fbbf24" stroke-width="2" stroke-dasharray="3,2"/>
        <line x1="22" y1="32" x2="78" y2="32" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="22" y1="32" x2="22" y2="68" stroke="#f97316" stroke-width="2.5"/>
        <text x="44" y="27" fill="#ef4444" font-size="7.5" font-weight="bold">2a</text>
        <text x="8" y="52" fill="#f97316" font-size="7" font-weight="bold">b cos C</text>
        <text x="32" y="52" fill="#fbbf24" font-size="7.5" font-weight="bold">2ab cos C</text>
      </svg>
    `
  },
  {
    id: 'composite-helix-walls',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'Cylindrical Wave Projection Walls',
    symbol: 'r(θ) = (R cos θ, y(θ), R sin θ)',
    formula: '\\sin^2\\theta + \\cos^2\\theta = 1',
    definition: 'Dual orthogonal harmonic walls bounding the 3D cylindrical space curve: the cosine wave wall in Amber projects onto the XY plane, while the sine wave wall in Emerald projects onto the ZY plane.',
    colorToken: 'Helix: Sky (#0284c7) | Cos Wall: Amber (#fbbf24) | Sin Wall: Emerald (#10b981)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <ellipse cx="50" cy="72" rx="36" ry="12" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="2,2"/>
        <line x1="50" y1="72" x2="50" y2="20" stroke="#475569" stroke-width="1.5"/>
        <path d="M 14,72 C 14,50 86,50 86,28" fill="none" stroke="#0284c7" stroke-width="2.5"/>
        <rect x="14" y="28" width="72" height="44" fill="rgba(251, 191, 36, 0.08)" stroke="#fbbf24" stroke-width="1" stroke-dasharray="2,2"/>
        <text x="40" y="16" fill="#0284c7" font-size="7.5" font-weight="bold">Helix Curve</text>
      </svg>
    `
  },
  {
    id: 'composite-euler-frame',
    category: 'composite',
    categoryName: 'Composite Elements & Gradients',
    name: 'SO(3) Spatial Euler Rotation Triad',
    symbol: 'R(α, β, γ) ∈ SO(3)',
    formula: 'R^T R = I, \\quad \\det(R) = +1',
    definition: 'An orthonormal spatial coordinate frame decomposing 3D attitude into yaw (α), pitch (β), and roll (γ) rotations with discrete Red/Green/Blue standard directional axis markers.',
    colorToken: 'X-axis: Red (#ef4444) | Y-axis: Green (#22c55e) | Z-axis: Blue (#3b82f6)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="3" fill="#6366f1"/>
        <line x1="50" y1="50" x2="85" y2="50" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="50" y1="50" x2="50" y2="15" stroke="#22c55e" stroke-width="2.5"/>
        <line x1="50" y1="50" x2="28" y2="72" stroke="#3b82f6" stroke-width="2.5"/>
        <text x="88" y="53" fill="#ef4444" font-size="8" font-weight="bold">X (α)</text>
        <text x="47" y="11" fill="#22c55e" font-size="8" font-weight="bold">Y (β)</text>
        <text x="18" y="80" fill="#3b82f6" font-size="8" font-weight="bold">Z (γ)</text>
      </svg>
    `
  }
];

export const COLOR_GRAMMAR_TOKENS = [
  { token: 'PALETTE.red', hex: '#ef4444', role: 'Diameter endpoint A, Tangent contact point T, Triangle vertex A / side a, Common chord AB (Angles in Same Segment), Euler X-axis' },
  { token: 'PALETTE.orange', hex: '#f97316', role: 'Diameter endpoint B, Side t length, Angle β, Triangle vertex B / side b, Cotangent leg' },
  { token: 'PALETTE.blue', hex: '#3b82f6', role: 'Chord side s, Radial line OT, Triangle vertex C / side c, Vertex P₁ & angle θ₁ (Angles in Same Segment), Chord TA (Alternate Segment), Euler Z-axis' },
  { token: 'PALETTE.indigo', hex: '#6366f1', role: 'Circle center O, Radii, Derivation step headers, Coordinate origin, Auxiliary point D & diameter TD (Alternate Segment)' },
  { token: 'PALETTE.violet', hex: '#a855f7', role: 'Inscribed point P, Minor Alternate Segment, Vertex A (Cyclic), Cosecant (csc θ), 3D wave projection, Law of Cosines cos C' },
  { token: 'PALETTE.violetLight', hex: '#d8b4fe', role: 'Conjugate reflex arc halo, auxiliary geodesic guidance, ambient fill' },
  { token: 'PALETTE.yellow', hex: '#eab308', role: 'Inscribed angle α/θ, Polar angle θ, Angular coordinate, Tangent-Radius active quadrant numeral, Alternate Segment α, Central angle 2θ (Angles in Same Segment)' },
  { token: 'PALETTE.amber', hex: '#fbbf24', role: 'Chord AB, Central angle 2θ, Vertex C (Cyclic), Cosine leg (cos θ), Bilinear interaction rectangle (-2ab cos C), Compound angle α+β, Spherical boundary geodesic arc on S²' },
  { token: 'PALETTE.teal', hex: '#14b8a6', role: 'Right-angles 90°, Perigon sums 360°, Cyclic diagonal intersection & Ptolemy invariant, Cotangent (cot θ), Difference ray D(α-β), Invariant Δ, Midpoint M (Chord Bisector)' },
  { token: 'PALETTE.green', hex: '#22c55e', role: 'Subtended angle θ, Inscribed area (½st), Euler Y-axis' },
  { token: 'PALETTE.emerald', hex: '#10b981', role: 'Tangent line direction, Altitude, Bisector normal, Sine leg (sin θ), Vertex P₂ & angle θ₂ (Angles in Same Segment), Bisection Invariant Δ = |AM - MB|' },
  { token: 'PALETTE.sky', hex: '#0284c7', role: 'Major Alternate Segment, Circumference & 2R ratio, Cyclic diagonal BD & sum ∠B + ∠D, Secant line (sec θ), Cylindrical helix curve, Angle β, Same Segment region (Angles in Same Segment), cos θ projection (Tangent-Radius)' },
  { token: 'PALETTE.lime', hex: '#84cc16', role: 'Reflex sector α*, Angle α at vertex A, Compound angle α, Tangent line vector' },
  { token: 'PALETTE.rose', hex: '#f43f5e', role: 'Exterior angles, Vertex D (Cyclic), Tangent ratio leg (tan θ), External point P, Exterior angle D (Alternate Segment), Sagitta s' },
  { token: 'PALETTE.cyan', hex: '#06b6d4', role: 'Diameter square |d|², Vertex B (Cyclic), Affine conjugate axis v₁, Chord Bisector reflex angle M* (270°), Tangent-Radius reflex angle T* (270°)' },
  { token: 'PALETTE.fuchsia', hex: '#d946ef', role: 'Angle β base angles, Cosecant (csc θ), 3D spherical longitude (φ), Multiple tangent chord areas' },
  { token: 'PALETTE.steel', hex: '#6488b0', role: 'Secant line construction, Cartesian reference grids, auxiliary chord extensions' },
  { token: 'PALETTE.lavender', hex: '#c4b5fd', role: 'Reflex angle sums (1080° / 540° / 900°), Perigon Invariant 360°, Cyclic diagonal AC & sum ∠A + ∠C, radius OP helper in 3D, polar coordinate ground grid' },
  { token: 'PALETTE.platinum', hex: '#f8fafc', role: 'High-contrast labels, primary derivation headings, coordinate axes values' }
];

let legendOverlay = null;
let katexPromise = null;

/**
 * Dynamically loads KaTeX script and CSS if not present.
 * @returns {Promise<any>}
 */
export function loadKaTeX() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.katex && typeof window.katex.renderToString === 'function') {
    return Promise.resolve(window.katex);
  }
  if (katexPromise) {
    return katexPromise;
  }

  katexPromise = new Promise((resolve) => {
    try {
      if (!document.querySelector('link[href*="katex"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }

      if (window.katex) {
        resolve(window.katex);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
      script.crossOrigin = 'anonymous';
      script.defer = true;
      script.onload = () => resolve(window.katex || null);
      script.onerror = () => {
        console.warn('KaTeX CDN failed to load; using mathematical typography fallback.');
        resolve(null);
      };
      document.head.appendChild(script);
    } catch {
      resolve(null);
    }
  });

  return katexPromise;
}

/**
 * Clean fallback mathematical formatter converting common LaTeX tokens to clean Unicode symbols.
 * @param {string} latex
 * @returns {string} HTML code block
 */
export function formatLatexFallback(latex) {
  if (!latex) return '';
  const clean = latex
    .replace(/\\left|\\right/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\csc/g, 'csc')
    .replace(/\\sec/g, 'sec')
    .replace(/\\cot/g, 'cot')
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    .replace(/\\theta\^?\*/g, 'θ*')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha\^?\*/g, 'α*')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta\^?\*/g, 'β*')
    .replace(/\\beta/g, 'β')
    .replace(/\\omega/g, 'ω')
    .replace(/\\pi/g, 'π')
    .replace(/\\circ/g, '°')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\perp/g, '⊥')
    .replace(/\\parallel/g, '∥')
    .replace(/\\implies/g, '⟹')
    .replace(/\\iff/g, '⟺')
    .replace(/\\quad/g, '   ')
    .replace(/\\;/g, ' ')
    .replace(/\\,/g, ' ')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\vec\{([^}]+)\}/g, '$1')
    .replace(/\^2/g, '²')
    .replace(/\^T/g, 'ᵀ')
    .replace(/_1/g, '₁')
    .replace(/_2/g, '₂')
    .replace(/_\\parallel/g, '∥')
    .replace(/_\\perp/g, '⊥')
    .replace(/\\angle/g, '∠');
  return `<code>${clean}</code>`;
}

/**
 * Renders LaTeX into HTML using KaTeX if available, or fallback mathematical typography.
 * @param {string} latex
 * @returns {string} HTML string
 */
export function renderLatex(latex) {
  if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
    try {
      return window.katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false
      });
    } catch {
      // Fallback
    }
  }
  return formatLatexFallback(latex);
}

/**
 * Iterates through all formula containers in the DOM and upgrades them to KaTeX once loaded.
 */
export function renderAllFormulasInDOM() {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !window.katex) return;
  const formulaElements = document.querySelectorAll('.legend-card-formula[data-formula]');
  formulaElements.forEach((el) => {
    const rawFormula = decodeURIComponent(el.getAttribute('data-formula') || '');
    if (rawFormula) {
      try {
        el.innerHTML = window.katex.renderToString(rawFormula, {
          throwOnError: false,
          displayMode: false
        });
      } catch {
        // preserve existing HTML
      }
    }
  });
}

/**
 * Initializes and mounts the Geometry Notation Legend Modal and its Controls Panel toggle.
 */
export function initGeometryLegend() {
  loadKaTeX();
  mountLegendModal();
  mountControlsToggle();

  // Keyboard shortcut: Pressing 'L' (when not in an input) toggles the legend
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'l' || e.key === 'L') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      toggleLegendModal();
    }
  });
}

/**
 * Mounts the full floating pop-out Legend Modal into the document.
 */
function mountLegendModal() {
  if (document.getElementById('geometry-legend-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'geometry-legend-overlay';
  overlay.className = 'geometry-legend-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'legend-modal-title');
  overlay.hidden = true;

  const isTrig = typeof window !== 'undefined' && (
    window.location.pathname.includes('/trigonometry/') ||
    document.title.includes('Trigonometry') ||
    document.title.includes('Sine') ||
    document.title.includes('Cosine') ||
    document.title.includes('Identities') ||
    document.title.includes('Unit Circle')
  );

  const eyebrowText = isTrig
    ? 'Trigonometry &amp; Geometry Cheatsheet'
    : 'Circle Geometry &amp; Trigonometry Cheatsheet';
  const subtitleText = isTrig
    ? 'Visual guide to circular functions, 3D helices, spherical sines, projection rectangles, and colour tokens.'
    : 'Visual guide to chords, tangents, secants, sectors, segments, trigonometric functions, and formal symbols.';

  overlay.innerHTML = `
    <div class="geometry-legend-modal-card">
      <div class="geometry-legend-header">
        <div>
          <span class="geometry-legend-eyebrow">${eyebrowText}</span>
          <h2 id="legend-modal-title" class="geometry-legend-title">Graphical Elements &amp; Notation Reference</h2>
          <p class="geometry-legend-subtitle">${subtitleText}</p>
        </div>
        <button type="button" class="geometry-legend-close" id="geometry-legend-close" aria-label="Close geometry legend">✕</button>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="geometry-legend-toolbar">
        <div class="geometry-legend-tabs" role="tablist">
          <button type="button" class="legend-tab active" data-filter="all" role="tab" aria-selected="true">All Elements</button>
          <button type="button" class="legend-tab" data-filter="lines" role="tab" aria-selected="false">Lines &amp; Segments</button>
          <button type="button" class="legend-tab" data-filter="regions" role="tab" aria-selected="false">Regions &amp; Arcs</button>
          <button type="button" class="legend-tab" data-filter="angles" role="tab" aria-selected="false">Angles &amp; Theorems</button>
          <button type="button" class="legend-tab" data-filter="trig" role="tab" aria-selected="false">Trigonometry &amp; Functions</button>
          <button type="button" class="legend-tab" data-filter="composite" role="tab" aria-selected="false">Composite &amp; Tensor Elements</button>
          <button type="button" class="legend-tab" data-filter="grammar" role="tab" aria-selected="false">Colour Grammar</button>
        </div>
        <div class="legend-search-box">
          <input type="search" id="legend-search-input" placeholder="Search notation (e.g. chord, tangent, sine, helix)..." aria-label="Search geometric elements">
        </div>
      </div>

      <!-- Unified Scrollable Content Area: contains cards grid and colour grammar tokens -->
      <div class="geometry-legend-scroll-container" id="legend-scroll-container">
        <!-- Content Body: Cards Grid -->
        <div class="geometry-legend-body" id="legend-body-grid">
          ${renderLegendCards(GEOMETRY_ELEMENTS)}
        </div>

        <!-- Colour Grammar Section (Rendered when grammar tab is selected or all) -->
        <div class="geometry-legend-grammar" id="legend-grammar-section">
          <h3 class="grammar-title">Unified Lab Colour Grammar Tokens</h3>
          <p class="grammar-desc">Standard color-coding tokens synchronized between 2D canvas vertices, 3D spatial models, telemetry panels, and algebraic derivation steps:</p>
          <div class="grammar-tokens-grid">
            ${COLOR_GRAMMAR_TOKENS.map((t) => `
              <div class="grammar-token-card">
                <span class="token-swatch" style="background-color: ${t.hex};"></span>
                <div class="token-info">
                  <strong>${t.token} <span class="token-hex">(${t.hex})</span></strong>
                  <span>${t.role}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="geometry-legend-footer">
        <span class="legend-shortcut-hint">Tip: Press <kbd>L</kbd> anytime to toggle this cheatsheet &bull; Press <kbd>Esc</kbd> to close</span>
        <button type="button" class="button button--secondary" id="geometry-legend-dismiss">Close Cheatsheet</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  legendOverlay = overlay;

  // Preload and render formulas once KaTeX loads
  loadKaTeX().then(() => {
    renderAllFormulasInDOM();
  });

  // Event handlers
  const closeBtn = overlay.querySelector('#geometry-legend-close');
  const dismissBtn = overlay.querySelector('#geometry-legend-dismiss');
  const searchInput = overlay.querySelector('#legend-search-input');
  const tabs = overlay.querySelectorAll('.legend-tab');

  const close = () => closeLegendModal();
  closeBtn?.addEventListener('click', close);
  dismissBtn?.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) {
      close();
    }
  });

  // Tab filtering
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      applyFilter(tab.dataset.filter, searchInput?.value || '');
    });
  });

  // Search filtering
  searchInput?.addEventListener('input', (e) => {
    const activeTab = overlay.querySelector('.legend-tab.active')?.dataset.filter || 'all';
    applyFilter(activeTab, e.target.value);
  });
}

function renderLegendCards(elements) {
  return elements
    .map((el) => `
      <article class="legend-card" data-category="${el.category}" data-id="${el.id}">
        <div class="legend-card-header">
          <span class="legend-card-category">${el.categoryName}</span>
          <span class="legend-card-symbol">${el.symbol}</span>
        </div>
        <div class="legend-card-main">
          <div class="legend-card-visual">
            ${el.svg}
          </div>
          <div class="legend-card-details">
            <h4 class="legend-card-title">${el.name}</h4>
            <div class="legend-card-formula" data-formula="${encodeURIComponent(el.formula)}">${renderLatex(el.formula)}</div>
            <p class="legend-card-definition">${el.definition}</p>
            <div class="legend-card-token">
              <span class="token-label">Token:</span> ${el.colorToken}
            </div>
          </div>
        </div>
      </article>
    `)
    .join('');
}

function applyFilter(category, query) {
  const cards = document.querySelectorAll('.legend-card');
  const grammarSection = document.getElementById('legend-grammar-section');
  const scrollContainer = document.getElementById('legend-scroll-container');
  const q = query.trim().toLowerCase();

  cards.forEach((card) => {
    const cardCat = card.dataset.category;
    const cardText = card.textContent.toLowerCase();
    const matchesCat = category === 'all' || cardCat === category;
    const matchesQuery = !q || cardText.includes(q);

    if (category === 'grammar') {
      card.style.display = 'none';
    } else {
      card.style.display = matchesCat && matchesQuery ? 'flex' : 'none';
    }
  });

  if (grammarSection) {
    if (category === 'grammar') {
      grammarSection.style.display = 'block';
    } else if (category === 'all' && (!q || 'colour color grammar tokens'.includes(q))) {
      grammarSection.style.display = 'block';
    } else {
      grammarSection.style.display = 'none';
    }
  }

  if (scrollContainer) {
    scrollContainer.scrollTop = 0;
  }

  renderAllFormulasInDOM();
}

/**
 * Injects the Pop-out Legend toggle into the Main Controls Panel.
 */
function mountControlsToggle() {
  // Find the primary controls container across all visual variants
  const controlsBodies = [
    document.querySelector('#controls-panel .panel-body'),
    document.querySelector('#angle-at-centre-panel .panel-body'),
    document.querySelector('#ui-panel-container .panel-body'),
    document.querySelector('#toolbar-2d-panel .panel-body'),
  ].filter(Boolean);

  if (controlsBodies.length === 0) return;
  const container = controlsBodies[0];

  if (container.querySelector('#section-geometry-legend')) return;

  const section = document.createElement('div');
  section.className = 'collapsible-section collapsed';
  section.id = 'section-geometry-legend';
  section.innerHTML = `
    <div class="collapsible-header" id="header-geometry-legend" role="button" tabindex="0" aria-expanded="false">
      <span>Geometry Notation Legend</span><span class="icon">▶</span>
    </div>
    <div class="collapsible-content collapsed" id="content-geometry-legend" style="display:flex; flex-direction:column; gap:0.5rem; padding: 0.65rem 0.5rem;">
      <p class="text-xs text-slate-400 m-0">Reference cheatsheet for chords, tangents, secants, sectors, segments, and angles notation.</p>
      <button type="button" class="btn text-xs font-bold px-2 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-500/40 rounded flex items-center justify-between" id="btn-popout-legend">
        <span style="display:flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Pop Out Notation Legend
        </span>
        <span class="badge text-2xs bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-mono">Cheatsheet</span>
      </button>
    </div>
  `;

  // Place it near the unit converter or append to the controls
  const unitSec = container.querySelector('#section-unit-converter');
  if (unitSec && unitSec.nextSibling) {
    container.insertBefore(section, unitSec.nextSibling);
  } else {
    container.appendChild(section);
  }

  // Wire events
  const popoutBtn = section.querySelector('#btn-popout-legend');
  popoutBtn?.addEventListener('click', () => {
    openLegendModal();
  });
}

/**
 * Opens the Pop-out Legend Modal.
 */
export function openLegendModal() {
  if (!legendOverlay) {
    mountLegendModal();
  }
  if (legendOverlay) {
    const isTrig = typeof window !== 'undefined' && (
      window.location.pathname.includes('/trigonometry/') ||
      document.title.includes('Trigonometry') ||
      document.title.includes('Sine') ||
      document.title.includes('Cosine') ||
      document.title.includes('Identities') ||
      document.title.includes('Unit Circle')
    );
    if (isTrig) {
      const activeTab = legendOverlay.querySelector('.legend-tab.active');
      const trigTab = legendOverlay.querySelector('.legend-tab[data-filter="trig"]');
      if (trigTab && (!activeTab || activeTab.dataset.filter === 'all')) {
        legendOverlay.querySelectorAll('.legend-tab').forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        trigTab.classList.add('active');
        trigTab.setAttribute('aria-selected', 'true');
        applyFilter('trig', '');
      }
    }
    legendOverlay.hidden = false;
    legendOverlay.querySelector('.geometry-legend-close')?.focus({ preventScroll: true });
    renderAllFormulasInDOM();
  }
}

/**
 * Closes the Pop-out Legend Modal.
 */
export function closeLegendModal() {
  if (legendOverlay) {
    legendOverlay.hidden = true;
  }
}

/**
 * Toggles the Pop-out Legend Modal between open and closed.
 */
export function toggleLegendModal() {
  if (legendOverlay && !legendOverlay.hidden) {
    closeLegendModal();
  } else {
    openLegendModal();
  }
}

