/**
 * @file tutorial-walkthrough.js
 * @description Interactive Walkthrough Tutorial & Contextual Interaction Tips system
 * for Visual Mathematics Lab. Provides guided step-by-step tours, interaction badges,
 * gesture cheatsheets, and persistent user toggles (ON/OFF).
 */

const STORAGE_KEY = 'vml_interaction_tips_enabled';
const TOUR_SEEN_KEY = 'vml_walkthrough_seen';

/**
 * Theorem-specific interaction guidance for all 8 circle visuals.
 */
const THEOREM_TIPS = {
  'thales-theorem': {
    name: "Thales' Theorem",
    interactionTip2D: 'Drag Point P around the semicircle, or spin baseline AB. The inscribed angle ∠APB remains strictly 90° across all quadrants.',
    theoremSpecifics: [
      'Drag Point P along the circumference to see the right angle invariant (90°) maintained continuously.',
      'Drag Point A or B to rigidly spin the baseline diameter along the perimeter, maintaining orthogonal geometry.',
      'Click and drag the circle rim, or use mouse wheel, to smoothly resize the circle radius with synchronized 2D/3D scaling.',
      'Toggle Affine Conic Mode to deform the circle into an ellipse and verify that Apollonius\' conjugate diameter invariant (v_PAᵀ Q v_PB = 0) holds strictly even when the Euclidean 90° angle breaks.',
      'Click AR Mode to project the interactive 3D spherical proof into your physical space via WebXR or camera pass-through.',
      'Click Share (or press S) to instantly copy a URL permalink encoding your exact angles, affine stretch, and view layout.',
      'Check the Telemetry panel to observe the Pythagorean sum s² + t² = |d|² and reflex angles sum (900°).'
    ],
    highlightPoint: 'Point P, A, or B'
  },
  'angle-at-centre': {
    name: 'Angle at the Centre Theorem',
    interactionTip2D: 'Drag Point P or arc endpoints A and B. Central angle 2θ is always exactly twice the inscribed angle θ.',
    theoremSpecifics: [
      'Drag Point P along the major arc; notice that inscribed angle θ remains constant for fixed A and B.',
      'Drag endpoints A and B to change the subtended arc and see central angle 2θ dynamically scale.',
      'Angle labels are vertically oriented and stacked to prevent overlapping badges and ensure mathematical clarity.',
      'Move P past the baseline or toggle Reflex Angle at Centre to explore the major-arc reflex theorem.'
    ],
    highlightPoint: 'Point P, A, or B'
  },
  'angles-in-same-segment': {
    name: 'Angles in the Same Segment',
    interactionTip2D: 'Drag points P₁ and P₂ anywhere along the same circular arc; angles ∠AP₁B and ∠AP₂B are identical.',
    theoremSpecifics: [
      'Drag Point P₁ or Point P₂ independently along the circular segment.',
      'Notice that ∠AP₁B = ∠AP₂B = α holds true everywhere along the segment.',
      'Toggle "Segment & Triangle Shading" to clearly highlight the circular segment subtended by chord AB.'
    ],
    highlightPoint: 'Points P₁ and P₂'
  },
  'cyclic-quadrilateral': {
    name: 'Cyclic Quadrilateral Theorem',
    interactionTip2D: 'Drag vertices A, B, C, D around the circle. Opposite interior angles always sum to exactly 180°.',
    theoremSpecifics: [
      'Drag any of the 4 vertices (A, B, C, D) around the circumference in order.',
      'Notice opposite angle pairs always satisfy ∠A + ∠C = 180° and ∠B + ∠D = 180°.',
      'Toggle exterior angle displays to verify that exterior angles equal the opposite interior angle.'
    ],
    highlightPoint: 'Vertices A, B, C, D'
  },
  'tangent-radius': {
    name: 'Tangent-Radius Perpendicularity',
    interactionTip2D: 'Drag contact point T around the circle. Radius OT is strictly perpendicular (90°) to the tangent line.',
    theoremSpecifics: [
      'Drag point T around all 4 quadrants; the dot product of OT and the tangent vector remains strictly 0.',
      'Use the Toolbar to cycle between 1, 2, 3, and 4 tangents to explore circumscribed polygons.',
      'Toggle between chord subtended Segment and Sector area modes in the controls.'
    ],
    highlightPoint: 'Contact Point T'
  },
  'alternate-segment': {
    name: 'Alternate Segment Theorem',
    interactionTip2D: 'Drag chord point A, vertex B, contact point T, or antipodal point D. The tangent-chord angle equals ∠TBA in the alternate segment.',
    theoremSpecifics: [
      'Observe the equality between the tangent-chord angle α and the inscribed angle ∠TBA.',
      'Notice distinct colours for Major (Alt Seg (Maj), Sky Blue) and Minor (Alt Seg (Min), Violet) circular segments, shaded cleanly without puzzle-like artifacts.',
      'Toggle "Inscribed & Proof Triangles Shading" in 2D/3D Overlays to optionally view the filled auxiliary triangles.',
      'Drag Point D along the perimeter to rigidly spin the entire geometric configuration while preserving side lengths and right angles.',
      'Toggle the Thales Overlay in controls to inspect the auxiliary diameter TD, right angles ∠TAD = ∠TBD = 90°, and Point D angles (∠TDA = α).'
    ],
    highlightPoint: 'Points T, A, B, and D'
  },
  'tangents-from-external-point': {
    name: 'Tangents from an External Point',
    interactionTip2D: 'Drag external point P outside the circle. Tangent lengths |PT₁| and |PT₂| are strictly identical.',
    theoremSpecifics: [
      'Drag Point P outside the circle; notice |PT₁| = |PT₂| = √(d² − r²) holds everywhere.',
      'Observe congruent right triangles ΔOPT₁ ≅ ΔOPT₂, subtending equal angles at the centre.',
      'Point P features smooth clearance collision boundaries to keep geometry valid outside the circle.'
    ],
    highlightPoint: 'External Point P'
  },
  'perpendicular-chord-bisector': {
    name: 'Perpendicular Chord Bisector',
    interactionTip2D: 'Drag chord endpoints A and B or midpoint M. Perpendicular bisector OM strictly bisects chord AB (|AM| = |MB| at 90°).',
    theoremSpecifics: [
      'Drag chord endpoints A and B or midpoint M to vary chord length and orientation.',
      'Dragging midpoint M smoothly and rigidly spins chord AB along the perimeter.',
      'Radius/line OM from centre O always meets chord AB at a 90° right angle and bisects it into equal halves.',
      'Inspect the telemetry to verify |AM| = |MB| with 0.000 px invariant difference.'
    ],
    highlightPoint: 'Chord endpoints A, B, or Midpoint M'
  }
};

/**
 * Returns whether interaction tips and walkthrough are currently enabled by the user.
 * @returns {boolean}
 */
export function isTipsEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Updates the tips enabled state and persists user preference.
 * @param {boolean} enabled
 * @param {Function} [onToggle]
 */
export function setTipsEnabled(enabled, onToggle) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Could not persist tips preference to localStorage', err);
  }

  updateTipsDOMState(enabled);

  if (typeof onToggle === 'function') {
    onToggle(enabled);
  }
}

/**
 * Synchronizes DOM classes, button text, and checkboxes to match enabled state.
 * @param {boolean} enabled
 */
function updateTipsDOMState(enabled) {
  if (enabled) {
    document.body.classList.add('interaction-tips-enabled');
    document.body.classList.remove('interaction-tips-disabled');
  } else {
    document.body.classList.add('interaction-tips-disabled');
    document.body.classList.remove('interaction-tips-enabled');
  }

  // Update header button pills
  document.querySelectorAll('.tutorial-status-pill').forEach((pill) => {
    pill.textContent = enabled ? 'ON' : 'OFF';
    pill.classList.toggle('is-on', enabled);
    pill.classList.toggle('is-off', !enabled);
  });

  // Update any checkbox toggles in panels
  document.querySelectorAll('[data-tutorial-toggle-chk]').forEach((chk) => {
    if (chk instanceof HTMLInputElement) {
      chk.checked = enabled;
    }
  });

  // Update Viewport Toolbar button if present
  const toolbarBtn = document.getElementById('btn-toolbar-tips');
  if (toolbarBtn) {
    toolbarBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    const label = toolbarBtn.querySelector('.tips-btn-label');
    if (label) {
      label.innerHTML = `Tips: <span class="tutorial-status-pill ${enabled ? 'is-on' : 'is-off'}" id="toolbar-tips-status">${enabled ? 'ON' : 'OFF'}</span>`;
    }
  }

  // Synchronize glow on collapsed modes panel (viewport toolbar)
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('.viewport-header-toolbar').forEach((tb) => {
      tb.classList.toggle('tips-active', Boolean(enabled && tb.classList.contains('is-collapsed')));
    });
  }
}

/**
 * Creates and mounts the Walkthrough & Interaction Tips system.
 * @param {Object} visual - Visual metadata object with slug, title, etc.
 */
export function initTutorialAndTips(visual) {
  const slug = visual?.slug || 'thales-theorem';
  const theoremData = THEOREM_TIPS[slug] || THEOREM_TIPS['thales-theorem'];

  // Apply initial DOM state
  updateTipsDOMState(isTipsEnabled());

  // 1. Mount contextual interaction tip badges in 2D and 3D containers
  mountInteractionBadges(slug, theoremData);

  // 2. Mount tutorial walkthrough modal dialog
  mountTutorialModal(visual, theoremData);

  // 3. Mount interactive walkthrough tour controller
  const tourController = createTourController(slug, theoremData);

  // 4. Inject Tips & Walkthrough section into Controls Panel if available
  mountControlsSection();

  // 5. Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // If user presses '?' or 'Shift+/' (not inside an input or textarea)
    if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openTutorialModal();
    }
  });

  return {
    isTipsEnabled,
    setTipsEnabled: (v) => setTipsEnabled(v),
    openTutorialModal,
    closeTutorialModal,
    startTour: (step = 0) => tourController.start(step),
    stopTour: () => tourController.stop(),
  };
}

/**
 * Mounts contextual interaction badges onto 2D and 3D viewports.
 */
function mountInteractionBadges(slug, theoremData) {
  // 2D Canvas Badge
  const container2d = document.getElementById('canvas-2d-container');
  if (container2d && !container2d.querySelector('.interaction-tip-badge.tip-2d')) {
    const badge2d = document.createElement('div');
    badge2d.className = 'interaction-tip-badge tip-2d';
    badge2d.setAttribute('role', 'region');
    badge2d.setAttribute('aria-label', '2D Canvas interaction tip');
    badge2d.innerHTML = `
      <button type="button" class="tip-badge-icon" aria-label="Show 2D interaction tip" title="2D Interaction Tip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </button>
      <div class="tip-badge-content">
        <div class="tip-badge-header">
          <span class="tip-badge-tag">2D Interaction</span>
          <button type="button" class="tip-badge-close" title="Dismiss tip badge">✕</button>
        </div>
        <p class="tip-badge-text"><strong>Drag ${theoremData.highlightPoint}:</strong> ${theoremData.interactionTip2D}</p>
        <div class="tip-badge-actions">
          <button type="button" class="tip-action-btn" data-start-tour-step="1">Guided Tour &rarr;</button>
        </div>
      </div>
    `;

    // Handle toggle and close
    const iconBtn = badge2d.querySelector('.tip-badge-icon');
    const closeBtn = badge2d.querySelector('.tip-badge-close');
    iconBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      badge2d.classList.toggle('is-expanded');
    });
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      badge2d.classList.remove('is-expanded');
    });

    container2d.appendChild(badge2d);
  }

  // 3D Scene Badge
  const container3d = document.getElementById('canvas-3d-container');
  if (container3d && !container3d.querySelector('.interaction-tip-badge.tip-3d')) {
    const badge3d = document.createElement('div');
    badge3d.className = 'interaction-tip-badge tip-3d';
    badge3d.setAttribute('role', 'region');
    badge3d.setAttribute('aria-label', '3D Scene interaction tip');
    badge3d.innerHTML = `
      <button type="button" class="tip-badge-icon" aria-label="Show 3D interaction tip" title="3D Navigation Tip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </button>
      <div class="tip-badge-content">
        <div class="tip-badge-header">
          <span class="tip-badge-tag">3D Navigation</span>
          <button type="button" class="tip-badge-close" title="Dismiss tip badge">✕</button>
        </div>
        <div class="tip-badge-shortcuts">
          <div><kbd>Left-drag</kbd> Direct Orbit (follows pointer)</div>
          <div><kbd>Right-drag</kbd> Pan View</div>
          <div><kbd>Scroll / Pinch</kbd> Zoom In / Out</div>
          <div><kbd>Presets</kbd> Snap to Top/Front/Side/Iso</div>
        </div>
        <div class="tip-badge-actions">
          <button type="button" class="tip-action-btn" data-start-tour-step="2">3D Tour &rarr;</button>
        </div>
      </div>
    `;

    const iconBtn = badge3d.querySelector('.tip-badge-icon');
    const closeBtn = badge3d.querySelector('.tip-badge-close');
    iconBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      badge3d.classList.toggle('is-expanded');
    });
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      badge3d.classList.remove('is-expanded');
    });

    container3d.appendChild(badge3d);
  }
}

/**
 * Mounts the full interactive Tutorial & Tips Modal Card.
 */
function mountTutorialModal(visual, theoremData) {
  if (document.getElementById('tutorial-modal-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-modal-overlay';
  overlay.className = 'tutorial-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorial-modal-title');
  overlay.hidden = true;

  const currentStatus = isTipsEnabled();

  overlay.innerHTML = `
    <div class="tutorial-modal-card">
      <div class="tutorial-modal-header">
        <div class="tutorial-modal-heading-group">
          <span class="tutorial-modal-eyebrow">Interactive Guide &amp; Walkthrough</span>
          <h2 id="tutorial-modal-title" class="tutorial-modal-title">${visual.title || "Thales' Theorem"}</h2>
        </div>
        <button type="button" class="tutorial-modal-close" id="tutorial-modal-close" aria-label="Close tutorial modal">✕</button>
      </div>

      <!-- User Toggle Section -->
      <div class="tutorial-toggle-banner">
        <div class="tutorial-toggle-desc">
          <strong>Interactive Tips &amp; Badges:</strong>
          <span>Toggle on-screen interaction hints, gesture reminders, and live guidance.</span>
        </div>
        <label class="tutorial-switch" title="Toggle interaction tips on/off">
          <input type="checkbox" id="tutorial-master-switch" ${currentStatus ? 'checked' : ''}>
          <span class="tutorial-slider"></span>
          <span class="tutorial-switch-label" id="tutorial-switch-label">${currentStatus ? 'ENABLED' : 'DISABLED'}</span>
        </label>
      </div>

      <!-- Quick Launch Tour Hero -->
      <div class="tutorial-hero-box">
        <div class="tutorial-hero-text">
          <h3>Interactive Step-by-Step Walkthrough</h3>
          <p>Take an interactive guided tour through the 2D Euclidean canvas, 3D spatial sphere, dockable windowing system, affine conic mode, WebXR spatial AR, live proofs, and shareable permalinks.</p>
        </div>
        <button type="button" class="button button--primary tutorial-start-btn" id="tutorial-start-tour-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Start Guided Tour</span>
        </button>
      </div>

      <!-- Core Interactions Cheatsheet -->
      <div class="tutorial-cheatsheet-grid">
        <div class="tutorial-card-section">
          <h4>2D Planar Canvas</h4>
          <ul class="tutorial-feature-list">
            <li><strong>Click &amp; Drag:</strong> Move vertices (e.g. ${theoremData.highlightPoint}) across quadrants to test invariants.</li>
            <li><strong>Radius Resizing:</strong> Click and drag near the circle circumference, or scroll mouse wheel over canvas, to resize radius with synchronized 2D/3D scaling.</li>
            <li><strong>Vertical Badges:</strong> Angle labels are oriented vertically to eliminate label overlaps and maintain clear legibility.</li>
            <li><strong>Touch Drag:</strong> Fully supported on mobile, tablets, and interactive touch screens.</li>
            <li><strong>Real-time Math:</strong> Inscribed angles, chord lengths, and radial orthogonality recalculate continuously.</li>
          </ul>
        </div>

        <div class="tutorial-card-section">
          <h4>3D Spatial Sphere &amp; AR</h4>
          <ul class="tutorial-feature-list">
            <li><strong>Direct Manipulation Orbit:</strong> Left-click and drag (or 1-finger swipe) to rotate the 3D graphic in the exact direction of your pointer.</li>
            <li><strong>Spatial WebXR AR:</strong> Click <em>AR</em> in the toolbar to project the 3D sphere into your physical space with WebXR or camera pass-through.</li>
            <li><strong>Pan:</strong> Right-click and drag (or 2-finger drag) to pan spatial coordinates.</li>
            <li><strong>Zoom / Dolly:</strong> Mouse scroll wheel or pinch to zoom.</li>
            <li><strong>Camera Presets:</strong> Click Top, Front, Side, or Iso buttons to align views with zero gimbal lock.</li>
          </ul>
        </div>

        <div class="tutorial-card-section">
          <h4>Dock System &amp; Navigation</h4>
          <ul class="tutorial-feature-list">
            <li><strong>Breadcrumb Bar:</strong> Interactive <em>Dock ▸ Panel ▸ Section</em> path lets you ascend or hop across nested levels instantly.</li>
            <li><strong>Keyboard Ladder:</strong> Press <kbd>Esc</kbd> to ascend from sub-section to section, panel header, and dock bar.</li>
            <li><strong>Peer Section Roving:</strong> Navigate section headers using <kbd>&darr;</kbd> and <kbd>&uarr;</kbd>, or drill down with <kbd>&rarr;</kbd>.</li>
            <li><strong>Global Shortcuts:</strong> Press <kbd>Alt + 1..9</kbd> to focus docked panels, and <kbd>Alt + \\</kbd> to cycle floating windows.</li>
            <li><strong>Detachable Panels:</strong> Detach and drag panels outside the dock as free-floating windows with zero canvas displacement.</li>
          </ul>
        </div>

        <div class="tutorial-card-section">
          <h4>${theoremData.name} &amp; Permalinks</h4>
          <ul class="tutorial-feature-list">
            ${theoremData.theoremSpecifics.map((spec) => `<li>${spec}</li>`).join('')}
            <li><strong>1-Click Permalinks:</strong> Click <em>Share</em> (or press <kbd>S</kbd>) to copy a URL encoding your exact angles, affine stretch, and dock layout.</li>
          </ul>
        </div>
      </div>

      <!-- Keyboard Shortcuts Reference -->
      <div class="tutorial-shortcuts-bar">
        <span class="shortcuts-title">Keyboard Shortcuts:</span>
        <div class="shortcuts-pills">
          <span><kbd>S</kbd> Share Link</span>
          <span><kbd>L</kbd> Legend</span>
          <span><kbd>?</kbd> Guide</span>
          <span><kbd>Alt+1..9</kbd> Panels</span>
          <span><kbd>Alt+\\</kbd> Float Cycle</span>
          <span><kbd>Esc</kbd> Ascend / Close</span>
          <span><kbd>&darr;/&uarr;</kbd> Rove</span>
          <span><kbd>&larr;/&rarr;</kbd> Tour</span>
          <span><kbd>Home</kbd> Reset</span>
        </div>
      </div>

      <div class="tutorial-modal-footer">
        <button type="button" class="button button--secondary" id="tutorial-modal-dismiss">Close Guide</button>
        <button type="button" class="button button--primary" id="tutorial-modal-launch-tour">Take Guided Tour &rarr;</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Wire event handlers
  const closeBtn = overlay.querySelector('#tutorial-modal-close');
  const dismissBtn = overlay.querySelector('#tutorial-modal-dismiss');
  const startBtn = overlay.querySelector('#tutorial-start-tour-btn');
  const launchBtn = overlay.querySelector('#tutorial-modal-launch-tour');
  const masterSwitch = overlay.querySelector('#tutorial-master-switch');
  const switchLabel = overlay.querySelector('#tutorial-switch-label');

  const close = () => closeTutorialModal();
  closeBtn?.addEventListener('click', close);
  dismissBtn?.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  masterSwitch?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    setTipsEnabled(isChecked);
    if (switchLabel) {
      switchLabel.textContent = isChecked ? 'ENABLED' : 'DISABLED';
    }
  });

  const launchTour = () => {
    close();
    // Launch tour at step 0
    document.dispatchEvent(new CustomEvent('vml:start-tour', { detail: { step: 0 } }));
  };

  startBtn?.addEventListener('click', launchTour);
  launchBtn?.addEventListener('click', launchTour);
}

/**
 * Opens the tutorial modal.
 */
export function openTutorialModal() {
  const overlay = document.getElementById('tutorial-modal-overlay');
  if (overlay) {
    overlay.hidden = false;
    const masterSwitch = overlay.querySelector('#tutorial-master-switch');
    const switchLabel = overlay.querySelector('#tutorial-switch-label');
    const enabled = isTipsEnabled();
    if (masterSwitch) masterSwitch.checked = enabled;
    if (switchLabel) switchLabel.textContent = enabled ? 'ENABLED' : 'DISABLED';
    overlay.querySelector('.tutorial-modal-close')?.focus({ preventScroll: true });
  }
}

/**
 * Closes the tutorial modal.
 */
export function closeTutorialModal() {
  const overlay = document.getElementById('tutorial-modal-overlay');
  if (overlay) {
    overlay.hidden = true;
  }
}

/**
 * Injects a Walkthrough Tips toggle in the 2D Controls / Toggles panel.
 */
function mountControlsSection() {
  // Try to find the controls container (controls-panel, toolbar-2d-panel, or accordion)
  const panels = [
    document.querySelector('#toolbar-2d-panel .panel-body'),
    document.querySelector('#controls-panel .panel-body'),
    document.querySelector('.thales-explorer #accordion-controls'),
  ].filter(Boolean);

  if (panels.length === 0) return;
  const target = panels[0];

  if (target.querySelector('#section-walkthrough-tips')) return;

  const section = document.createElement('div');
  section.className = 'collapsible-section collapsed';
  section.id = 'section-walkthrough-tips';
  section.innerHTML = `
    <div class="collapsible-header" id="header-walkthrough-tips" role="button" tabindex="0" aria-expanded="false">
      <span>Tutorial &amp; Interaction Tips</span><span class="icon">▶</span>
    </div>
    <div class="collapsible-content collapsed" id="content-walkthrough-tips" style="display:flex; flex-direction:column; gap:0.6rem; padding: 0.65rem 0.5rem;">
      <label class="checkbox-container" title="Show on-screen interaction tips and badges">
        <input type="checkbox" data-tutorial-toggle-chk ${isTipsEnabled() ? 'checked' : ''}>
        <span class="checkmark"></span>
        <span class="color-yellow font-bold">Show Interaction Tips &amp; Badges</span>
      </label>
      <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
        <button type="button" class="btn text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded" id="btn-open-guide-panel">
          📖 Open Guide
        </button>
        <button type="button" class="btn text-xs px-2 py-1 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 font-bold rounded" id="btn-start-tour-panel">
          🚀 Start Tour
        </button>
      </div>
    </div>
  `;

  target.appendChild(section);

  // Wire events
  const chk = section.querySelector('[data-tutorial-toggle-chk]');
  chk?.addEventListener('change', (e) => {
    setTipsEnabled(e.target.checked);
  });

  section.querySelector('#btn-open-guide-panel')?.addEventListener('click', () => {
    openTutorialModal();
  });

  section.querySelector('#btn-start-tour-panel')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vml:start-tour', { detail: { step: 0 } }));
  });
}

/**
 * Creates the step-by-step interactive walkthrough tour controller.
 */
function createTourController(slug, theoremData) {
  let activeStep = 0;
  let isTourRunning = false;

  // Build the 10 comprehensive tour steps
  const steps = [
    {
      title: 'Welcome to the Interactive Math Lab',
      selector: '#main-view',
      content: `This lab combines a real-time <strong>2D Euclidean canvas</strong> with an interactive <strong>3D spatial sphere</strong>. Every point drag updates angles, distances, reflex arcs, and theorem invariants dynamically across both views.`,
      placement: 'center',
    },
    {
      title: '2D Interactive Canvas & Draggable Points',
      selector: '#canvas-2d-container',
      content: `<strong>Drag ${theoremData.highlightPoint}:</strong> ${theoremData.interactionTip2D}
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Circumference Resizing:</strong> Click and drag near the circle rim, or use mouse wheel, to resize the circle radius with live 2D/3D synchronization.</li>
          <li><strong>Vertical Badges:</strong> Angle labels are stacked vertically to eliminate label overlaps.</li>
          <li><strong>Real-time Geometry:</strong> Chords, tangents, sectors, and right-angles adapt continuously.</li>
        </ul>`,
      placement: 'right',
    },
    {
      title: '3D Spatial Scene & Direct Pointer Orbit',
      selector: '#canvas-3d-container',
      content: `Explore the spatial geometry in 3D with direct pointer manipulation:
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Direct Manipulation:</strong> Left-drag rotates the 3D graphic in the exact direction of your pointer (in both Arcball and Orbit modes).</li>
          <li><strong>Right-drag:</strong> Pan the camera across 3D space</li>
          <li><strong>Scroll / Pinch:</strong> Zoom / dolly in and out</li>
          <li><strong>Presets:</strong> Click <em>Top, Front, Side, Iso</em> buttons to align spatial angles with 2D projections.</li>
        </ul>`,
      placement: 'left',
    },
    {
      title: 'Viewport Modes & Dockable Windowing Toolbar',
      selector: '#viewport-toolbar',
      content: `Use the floating toolbar to switch between <strong>Split</strong>, <strong>2D</strong>, and <strong>3D</strong> viewports.
        Click <strong>Flip</strong> to rotate layout horizontally or vertically.
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Dock to any Margin:</strong> Grab the 6-dot grip handle to dock on Top, Bottom, Left, or Right edges.</li>
          <li><strong>Movable Capsule Pill:</strong> Collapse the dock toolbar to float it anywhere without disrupting the canvas.</li>
          <li><strong>Detachable Panels:</strong> Drag panels outside the dock as free-floating windows with zero canvas displacement.</li>
          <li><strong>Reset:</strong> Click Reset or press <kbd>Home</kbd> to restore initial configuration.</li>
        </ul>`,
      placement: 'bottom',
    },
    {
      title: 'Hierarchical Breadcrumbs & Dock Navigation',
      selector: '.dock-breadcrumb-bar, .workspace-dock, #viewport-toolbar',
      content: `Navigate deeply nested panels without losing focus or screen space:
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Breadcrumb Bar:</strong> Visual <em>Dock ▸ Panel ▸ Section</em> path shows active focus; click any crumb to ascend levels immediately.</li>
          <li><strong>Escape Ladder:</strong> Press <kbd>Escape</kbd> to ascend (Sub-Section &rarr; Section Header &rarr; Panel Header &rarr; Dock Bar).</li>
          <li><strong>Peer Section Roving:</strong> Navigate section headers using <kbd>&darr;</kbd> and <kbd>&uarr;</kbd>, and drill down with <kbd>&rarr;</kbd>.</li>
          <li><strong>Direct Jump:</strong> Press <kbd>Alt + 1..9</kbd> to jump directly to docked panel 1 through 9.</li>
        </ul>`,
      placement: 'bottom',
    },
    {
      title: 'Dual-Mode Affine Conic Generalization',
      selector: '#btn-toggle-affine, #section-affine-conic, #toolbar-content',
      content: `Explore how classical circle theorems generalize into conics under Felix Klein's Erlangen Program (1872):
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Circle Mode (Default):</strong> Pure Euclidean geometry with 90° right angles and Pythagorean distances.</li>
          <li><strong>Affine Conic Mode:</strong> Deforms the circle into an ellipse. While Euclidean angles deform (&theta; &ne; 90&deg;), <strong>Apollonius' Conjugate Diameters Invariant</strong> (<em>v_PAᵀ Q v_PB &equiv; 0.000</em>) holds strictly constant!</li>
          <li><strong>Stretch &amp; Axis:</strong> Adjust aspect ratio (<em>s</em>) and deformation angle (&phi;) interactively.</li>
        </ul>`,
      placement: 'bottom',
    },
    {
      title: 'WebXR & Spatial Augmented Reality (AR)',
      selector: '#btn-toggle-ar, #canvas-3d-container',
      content: `Bring the 3D spherical theorem into your physical room:
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>Immersive AR:</strong> On supported headsets (Quest, Vision Pro) and Android Chrome, projects the 3D sphere floating in physical 3D space.</li>
          <li><strong>Camera Pass-Through:</strong> Universal fallback uses device camera feed with transparent WebGL canvas and touch controls.</li>
          <li><strong>Exit AR:</strong> Tap the on-screen Exit AR button or click the toolbar AR toggle.</li>
        </ul>`,
      placement: 'bottom',
    },
    {
      title: 'Live Math Derivations & Telemetry',
      selector: '#derivations-panel, #live-derivation-panel',
      content: `Follow the step-by-step deductive geometric and algebraic proof. Variable labels share <strong>synchronized colour tokens</strong> with the canvas points. Inspect the 2D and 3D telemetry panels to check real-time values and 360° perigon invariants.`,
      placement: 'left',
    },
    {
      title: 'Controls, Overlays & Unit System Conversion',
      selector: '#section-unit-converter, #toolbar-2d-panel, #controls-panel',
      content: `Customize display layers (Cartesian grids, axes, angle arcs, reflex wedges, Major/Minor circular segments, and dedicated triangle shading toggles). Open the <strong>Unit System Conversion</strong> section to convert measurements across <em>Pixels, Normalized (0-1), Centimeters, Inches</em> and <em>Degrees vs Radians</em>.`,
      placement: 'top',
    },
    {
      title: 'Shareable Permalinks & Notation Legend',
      selector: '#btn-toolbar-share, #btn-toolbar-legend, #toolbar-content',
      content: `Collaborate and share exact geometric proofs with 1 click:
        <ul style="margin: 0.5rem 0 0 1.2rem; padding: 0;">
          <li><strong>1-Click Permalink:</strong> Click <strong>Share</strong> (or press <kbd>S</kbd>) to copy a URL encoding your exact angles, affine deformation, view mode, camera angle, and dock layout.</li>
          <li><strong>Bidirectional Hash:</strong> Bookmarks and URLs load directly into your exact configuration.</li>
          <li><strong>Geometry Legend:</strong> Click <strong>Legend</strong> (or press <kbd>L</kbd>) to inspect the KaTeX notation cheat-sheet, color tokens, and coordinate conventions.</li>
        </ul>`,
      placement: 'bottom',
    },
  ];

  // Create Tour DOM elements
  let spotlight = document.querySelector('.walkthrough-spotlight');
  let popover = document.querySelector('.walkthrough-popover');

  if (!spotlight) {
    spotlight = document.createElement('div');
    spotlight.className = 'walkthrough-spotlight';
    spotlight.hidden = true;
    document.body.appendChild(spotlight);
  }

  if (!popover) {
    popover = document.createElement('div');
    popover.className = 'walkthrough-popover';
    popover.hidden = true;
    document.body.appendChild(popover);
  }

  function renderStep(index) {
    activeStep = Math.max(0, Math.min(index, steps.length - 1));
    const step = steps[activeStep];

    const targetEl = document.querySelector(step.selector);

    // If target element is inside a hidden viewport (e.g. 3D container when in 2D mode),
    // switch to split mode automatically
    if (step.selector.includes('3d') && document.getElementById('btn-split')) {
      const splitBtn = document.getElementById('btn-split');
      if (!splitBtn.classList.contains('active')) {
        splitBtn.click();
      }
    }

    // Position spotlight
    if (targetEl && step.placement !== 'center') {
      const rect = targetEl.getBoundingClientRect();
      spotlight.hidden = false;
      spotlight.style.top = `${Math.max(0, rect.top - 6)}px`;
      spotlight.style.left = `${Math.max(0, rect.left - 6)}px`;
      spotlight.style.width = `${rect.width + 12}px`;
      spotlight.style.height = `${rect.height + 12}px`;

      // Add highlight class to target
      document.querySelectorAll('.walkthrough-target-highlight').forEach((el) => {
        el.classList.remove('walkthrough-target-highlight');
      });
      targetEl.classList.add('walkthrough-target-highlight');
    } else {
      spotlight.hidden = true;
      document.querySelectorAll('.walkthrough-target-highlight').forEach((el) => {
        el.classList.remove('walkthrough-target-highlight');
      });
    }

    const isFirst = activeStep === 0;
    const isLast = activeStep === steps.length - 1;

    // Render popover content
    popover.hidden = false;
    popover.innerHTML = `
      <div class="walkthrough-popover-header">
        <span class="walkthrough-step-badge">Step ${activeStep + 1} of ${steps.length}</span>
        <button type="button" class="walkthrough-close-btn" aria-label="End walkthrough">✕</button>
      </div>
      <h3 class="walkthrough-popover-title">${step.title}</h3>
      <div class="walkthrough-popover-body">${step.content}</div>
      <div class="walkthrough-popover-footer">
        <div class="walkthrough-dots">
          ${steps.map((_, i) => `<button type="button" class="walkthrough-dot ${i === activeStep ? 'is-active' : ''}" data-goto-step="${i}" aria-label="Go to step ${i + 1}"></button>`).join('')}
        </div>
        <div class="walkthrough-buttons">
          <button type="button" class="button button--secondary walkthrough-btn-prev" ${isFirst ? 'disabled' : ''}>Back</button>
          <button type="button" class="button button--primary walkthrough-btn-next">${isLast ? 'Finish Tour' : 'Next &rarr;'}</button>
        </div>
      </div>
    `;

    // Position popover
    positionPopover(popover, targetEl, step.placement);

    // Event listeners
    popover.querySelector('.walkthrough-close-btn')?.addEventListener('click', stop);
    popover.querySelector('.walkthrough-btn-prev')?.addEventListener('click', () => renderStep(activeStep - 1));
    popover.querySelector('.walkthrough-btn-next')?.addEventListener('click', () => {
      if (isLast) {
        stop();
      } else {
        renderStep(activeStep + 1);
      }
    });

    popover.querySelectorAll('.walkthrough-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        const targetStep = parseInt(e.target.dataset.gotoStep, 10);
        if (!isNaN(targetStep)) renderStep(targetStep);
      });
    });
  }

  function positionPopover(pop, targetEl, placement) {
    if (!targetEl || placement === 'center') {
      pop.style.top = '50%';
      pop.style.left = '50%';
      pop.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const popWidth = Math.min(380, window.innerWidth - 32);
    const popHeight = 220;

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = rect.bottom + 12;
      left = rect.left + rect.width / 2 - popWidth / 2;
    } else if (placement === 'top') {
      top = rect.top - popHeight - 12;
      left = rect.left + rect.width / 2 - popWidth / 2;
    } else if (placement === 'left') {
      top = rect.top + 30;
      left = rect.left - popWidth - 16;
    } else {
      // right
      top = rect.top + 30;
      left = rect.right + 16;
    }

    // Clamp within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - popWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - popHeight - 16));

    pop.style.transform = 'none';
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.style.width = `${popWidth}px`;
  }

  function start(fromStep = 0) {
    isTourRunning = true;
    renderStep(fromStep);
  }

  function stop() {
    isTourRunning = false;
    spotlight.hidden = true;
    popover.hidden = true;
    document.querySelectorAll('.walkthrough-target-highlight').forEach((el) => {
      el.classList.remove('walkthrough-target-highlight');
    });
  }

  // Keyboard navigation during tour
  document.addEventListener('keydown', (e) => {
    if (!isTourRunning) return;
    if (e.key === 'Escape') {
      stop();
    } else if (e.key === 'ArrowRight') {
      renderStep(activeStep + 1);
    } else if (e.key === 'ArrowLeft') {
      renderStep(activeStep - 1);
    }
  });

  // Listen to custom start-tour events
  document.addEventListener('vml:start-tour', (e) => {
    const step = e.detail?.step ?? 0;
    start(step);
  });

  // Listen to quick tour buttons across badges
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-start-tour-step]');
    if (btn) {
      const step = parseInt(btn.dataset.startTourStep, 10);
      start(isNaN(step) ? 0 : step);
    }
  });

  return { start, stop };
}

