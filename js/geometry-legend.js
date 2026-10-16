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
    colorToken: 'PALETTE.indigo (#6366f1) / PALETTE.sky (#0284c7)',
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
    colorToken: 'PALETTE.red (#ef4444)',
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
    formula: '|AB| = 2r \\sin(\\theta / 2)',
    definition: 'A straight line segment joining two distinct points on the circumference without necessarily passing through the centre.',
    colorToken: 'PALETTE.amber (#fbbf24)',
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
    formula: 'Intersects at 2 pts',
    definition: 'An extended straight line that cuts the circle at two distinct points. A chord is the finite segment bounded between the secant intersection points.',
    colorToken: 'PALETTE.steel (#6488b0)',
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
    formula: 'OT \\cdot v_{tan} = 0',
    definition: 'A coplanar line that touches the circle at exactly one point of contact T. The tangent is strictly perpendicular (90°) to the radius OT at point T.',
    colorToken: 'PALETTE.emerald (#10b981)',
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
    formula: 's = r\\theta',
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
    formula: 'Area = \\frac{1}{2} r^2 \\theta',
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
    formula: 'Area = \\frac{1}{2} r^2 (\\theta - \\sin\\theta)',
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
    name: 'Alternate Segment',
    symbol: 'Alt Seg (Maj / Min)',
    formula: '∠(t, Chord) = Inscribed ∠',
    definition: 'The segment of the circle containing the interior of the subtended angle opposite to the angle formed between a tangent and a chord.',
    colorToken: 'PALETTE.sky (#0284c7) & PALETTE.violet (#a855f7)',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="46" r="32" fill="none" stroke="#475569" stroke-width="1.5"/>
        <!-- Major segment shaded in sky -->
        <path d="M 50 78 L 22 30 A 32 32 0 1 1 50 78 Z" fill="rgba(2, 132, 199, 0.22)" stroke="none"/>
        <line x1="16" y1="78" x2="84" y2="78" stroke="#10b981" stroke-width="2"/>
        <line x1="50" y1="78" x2="22" y2="30" stroke="#fbbf24" stroke-width="2"/>
        <text x="36" y="44" fill="#0284c7" font-size="7.5" font-weight="bold">Alt Seg (Maj)</text>
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
    formula: 'θ = \\frac{1}{2} \\text{Central ∠}',
    definition: 'An angle whose vertex P lies on the circle circumference and whose legs contain chords subtending arc AB.',
    colorToken: 'PALETTE.yellow (#eab308) / PALETTE.emerald (#10b981)',
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
    formula: 'Central ∠ = 2 \\times Inscribed ∠',
    definition: 'An angle whose apex is at the circle centre O, subtending the same arc as an inscribed angle. It is always exactly twice the measure of the inscribed angle.',
    colorToken: 'PALETTE.indigo (#6366f1) / PALETTE.amber (#fbbf24)',
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
    id: 'reflex-perigon',
    category: 'angles',
    categoryName: 'Angles & Theorems',
    name: 'Reflex Angle & Perigon',
    symbol: 'θ*, θ + θ* = 360°',
    formula: 'θ^* = 360^\\circ - \\theta',
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
    formula: '∠A + ∠C = 180°, \\; ∠B + ∠D = 180°',
    definition: 'A quadrilateral whose four vertices all lie on a single common circle. Opposite interior angles are strictly supplementary (sum to 180°).',
    colorToken: 'A: Violet, B: Cyan, C: Amber, D: Rose',
    svg: `
      <svg viewBox="0 0 100 100" class="legend-svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#475569" stroke-width="2"/>
        <polygon points="50,12 85,38 68,84 20,70" fill="rgba(99, 102, 241, 0.12)" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="50" cy="12" r="3" fill="#a855f7"/>
        <circle cx="85" cy="38" r="3" fill="#06b6d4"/>
        <circle cx="68" cy="84" r="3" fill="#fbbf24"/>
        <circle cx="20" cy="70" r="3" fill="#f43f5e"/>
        <text x="36" y="52" fill="#cbd5e1" font-size="8" font-weight="bold">Opp = 180°</text>
      </svg>
    `
  }
];

export const COLOR_GRAMMAR_TOKENS = [
  { token: 'PALETTE.red', hex: '#ef4444', role: 'Diameter endpoint A, Tangent contact point T' },
  { token: 'PALETTE.orange', hex: '#f97316', role: 'Diameter endpoint B, Side t length, Angle β' },
  { token: 'PALETTE.blue', hex: '#3b82f6', role: 'Chord side s, Radial line OT, Vertex A' },
  { token: 'PALETTE.indigo', hex: '#6366f1', role: 'Circle center O, Radii, Derivation step headers' },
  { token: 'PALETTE.violet', hex: '#a855f7', role: 'Inscribed point P, Minor Alternate Segment, Vertex A (Cyclic)' },
  { token: 'PALETTE.yellow', hex: '#eab308', role: 'Inscribed angle α/θ, Polar angle θ' },
  { token: 'PALETTE.amber', hex: '#fbbf24', role: 'Chord AB, Central angle 2θ, Vertex C (Cyclic)' },
  { token: 'PALETTE.teal', hex: '#14b8a6', role: 'Right-angles 90°, Perigon sums 360°, Invariant Δ' },
  { token: 'PALETTE.emerald', hex: '#10b981', role: 'Tangent line direction, Altitude, Bisector normal' },
  { token: 'PALETTE.sky', hex: '#0284c7', role: 'Major Alternate Segment, Circumference, Sky overlays' },
  { token: 'PALETTE.lime', hex: '#84cc16', role: 'Reflex sector α*, Angle α at vertex A' },
  { token: 'PALETTE.rose', hex: '#f43f5e', role: 'Exterior angles, Vertex D (Cyclic)' },
  { token: 'PALETTE.cyan', hex: '#06b6d4', role: 'Diameter square |d|², Vertex B (Cyclic)' }
];

let legendOverlay = null;

/**
 * Initializes and mounts the Geometry Notation Legend Modal and its Controls Panel toggle.
 */
export function initGeometryLegend() {
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

  overlay.innerHTML = `
    <div class="geometry-legend-modal-card">
      <div class="geometry-legend-header">
        <div>
          <span class="geometry-legend-eyebrow">Circle Geometry Notation &amp; Cheatsheet</span>
          <h2 id="legend-modal-title" class="geometry-legend-title">Graphical Elements &amp; Notation Reference</h2>
          <p class="geometry-legend-subtitle">Visual guide to chords, tangents, secants, sectors, segments, and formal geometric symbols.</p>
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
          <button type="button" class="legend-tab" data-filter="grammar" role="tab" aria-selected="false">Colour Grammar</button>
        </div>
        <div class="legend-search-box">
          <input type="search" id="legend-search-input" placeholder="Search notation (e.g. chord, tangent)..." aria-label="Search geometric elements">
        </div>
      </div>

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

      <div class="geometry-legend-footer">
        <span class="legend-shortcut-hint">Tip: Press <kbd>L</kbd> anytime to toggle this cheatsheet &bull; Press <kbd>Esc</kbd> to close</span>
        <button type="button" class="button button--secondary" id="geometry-legend-dismiss">Close Cheatsheet</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  legendOverlay = overlay;

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
            <div class="legend-card-formula"><code>${el.formula}</code></div>
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
  section.className = 'collapsible-section';
  section.id = 'section-geometry-legend';
  section.innerHTML = `
    <div class="collapsible-header" id="header-geometry-legend">
      <span>Geometry Notation Legend</span><span class="icon">▼</span>
    </div>
    <div class="collapsible-content" id="content-geometry-legend" style="display:flex; flex-direction:column; gap:0.5rem; padding: 0.65rem 0.5rem;">
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
  const header = section.querySelector('.collapsible-header');
  const content = section.querySelector('.collapsible-content');
  header?.addEventListener('click', () => {
    content?.classList.toggle('hidden');
    const icon = header.querySelector('.icon');
    if (icon) icon.textContent = content?.classList.contains('hidden') ? '▶' : '▼';
  });

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
    legendOverlay.hidden = false;
    legendOverlay.querySelector('.geometry-legend-close')?.focus({ preventScroll: true });
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

