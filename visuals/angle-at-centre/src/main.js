import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, isNearCircumference, toRadians, bindStandardToggles, PlaybackController, UnitSystemConverter } from '../../../js/circle-core.js';
import { AngleAtCentreDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, AngleAtCentre3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new AngleAtCentre3DView(loadThree(), container);
  } catch (error) {
    console.warn('3D view unavailable; continuing with 2D view only.', error);
    return new NullScene3DView();
  }
}

function bootstrap() {
  const store = createStore(createInitialState());
  const canvas = document.getElementById('main-canvas');
  const container2d = document.getElementById('canvas-2d-container');
  const container3d = document.getElementById('canvas-3d-container');
  const view = new CanvasView(canvas, container2d);
  const scene3d = createScene3D(container3d);
  scene3d.enableInteraction(store);

  // Floating Toolbar & Fullscreen
  new DraggableToolbar(document.getElementById('viewport-toolbar'), document.getElementById('toolbar-drag-handle'));
  bindFullscreen(document.getElementById('fullscreen-btn'), document.querySelector('.circle-explorer'));

  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      store.reset();
      store.set({ playing: false, viewMode: 'split', splitDirection: 'horizontal', splitRatio: 50 });
    });
  }

  const unitContainer = document.getElementById('content-unit-converter');
  if (unitContainer) {
    new UnitSystemConverter(unitContainer, store);
  }

  // View Mode Controller (Split, 2D, 3D)
  new ViewModeController(store, {
    mainView: document.getElementById('main-view'),
    container2d,
    container3d,
    toolbar2d: document.getElementById('toolbar-2d-panel'),
    toolbar3d: document.getElementById('toolbar-3d-panel'),
    buttons: {
      split: document.getElementById('btn-split'),
      '2d': document.getElementById('btn-2d'),
      '3d': document.getElementById('btn-3d'),
    },
    flipButton: document.getElementById('split-dir-btn'),
    resizer: document.getElementById('viewport-resizer'),
    onResize: () => {
      view.resize();
      scene3d.resize();
    },
  });

  // Standard 2D & 3D Toggles, Camera Presets, and Export
  bindStandardToggles(store, {
    canvas2d: view,
    view3d: scene3d,
    exportPrefix: 'angle-at-centre',
  });

  // Panels
  new Panel(document.getElementById('angle-at-centre-panel'), {
    header: document.getElementById('controls-header'),
    minimizeButton: document.getElementById('toggle-controls-min'),
    expandButton: document.getElementById('toggle-controls-expand'),
  });

  new Panel(document.getElementById('derivations-panel'), {
    header: document.getElementById('deriv-header'),
    minimizeButton: document.getElementById('toggle-deriv-min'),
    expandButton: document.getElementById('toggle-deriv-expand'),
  });

  new TelemetryPanel(document.getElementById('telemetry-panel'), {
    header: document.getElementById('telemetry-header'),
    toggleButton: document.getElementById('telemetry-toggle-btn'),
    body: document.getElementById('telemetry-body'),
  });

  const stats3d = document.getElementById('stats-3d');
  if (stats3d) {
    new TelemetryPanel(stats3d, {
      header: document.getElementById('stats-3d-header'),
      toggleButton: document.getElementById('toggle-stats-3d'),
      body: document.getElementById('stats-3d-body'),
    });
  }

  const derivations = new AngleAtCentreDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback Auto-Sweep Controller
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: 'angleP', speed: 0.6 });

  // Slider bindings
  const radiusInput = document.getElementById('slider-radius');
  const radiusLabel = document.getElementById('label-radius');
  radiusInput?.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));

  const pPosInput = document.getElementById('slider-p');
  pPosInput?.addEventListener('input', (e) => store.set({ angleP: toRadians(parseFloat(e.target.value)) }));

  // Checkbox bindings
  const toggleRadii = document.getElementById('toggle-radii');
  if (toggleRadii) {
    toggleRadii.addEventListener('change', (e) => store.set({ showRadii: e.target.checked }));
  }

  const toggleSplit = document.getElementById('toggle-split');
  if (toggleSplit) {
    toggleSplit.addEventListener('change', (e) => store.set({ showSplit: e.target.checked }));
  }

  // Snapshot Exports
  document.getElementById('btn-export-png')?.addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg')?.addEventListener('click', () => view.exportSVG());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 180;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(260, Math.max(100, Math.round(cur * factor)));
    store.set({ radius: nextR });
  }, { passive: false });

  // Interactive Drag on Canvas
  let activeDragPoint = null;

  function hitTest(x, y, pt, radius = 18) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hitTest(x, y, g.P, 24)) {
      activeDragPoint = 'P';
    } else if (hitTest(x, y, g.A, 20)) {
      activeDragPoint = 'A';
    } else if (hitTest(x, y, g.B, 20)) {
      activeDragPoint = 'B';
    } else if (isNearCircumference(x, y, g.cx, g.cy, g.r, 14)) {
      activeDragPoint = 'radius';
    }

    if (activeDragPoint) {
      if (store.get().playing) {
        store.set({ playing: false });
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (!activeDragPoint) {
      const hoverPt = hitTest(x, y, g.P, 24) || hitTest(x, y, g.A, 20) || hitTest(x, y, g.B, 20);
      const hoverCirc = !hoverPt && isNearCircumference(x, y, g.cx, g.cy, g.r, 14);
      canvas.style.cursor = hoverPt ? 'pointer' : (hoverCirc ? 'ew-resize' : 'default');
      return;
    }

    if (activeDragPoint === 'radius') {
      canvas.style.cursor = 'ew-resize';
      const dist = Math.hypot(x - g.cx, y - g.cy);
      const nextR = Math.min(260, Math.max(100, Math.round(dist)));
      store.set({ radius: nextR });
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);

    if (activeDragPoint === 'P') {
      store.set({ angleP: ang });
      pPosInput.value = Math.round(((ang * 180) / Math.PI + 360) % 360);
    } else if (activeDragPoint === 'A') {
      store.set({ angleA: ang });
    } else if (activeDragPoint === 'B') {
      store.set({ angleB: ang });
    }
  });

  const stopDrag = (e) => {
    if (activeDragPoint) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      activeDragPoint = null;
      canvas.style.cursor = 'default';
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);

  // Subscribe view, 3d, and telemetry to store changes
  const update = (state) => {
    view.render(state);
    scene3d.render(state);
    const g = computeGeometry(state, view.width, view.height);

    // Base angles alpha and beta
    const angPA = Math.atan2(g.A.y - g.P.y, g.A.x - g.P.x);
    const angPB = Math.atan2(g.B.y - g.P.y, g.B.x - g.P.x);
    const angPO = Math.atan2(g.O.y - g.P.y, g.O.x - g.P.x);
    const diffAlpha = Math.abs(((angPA - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const diffBeta = Math.abs(((angPB - angPO + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const alphaDeg = diffAlpha * (180 / Math.PI);
    const betaDeg = diffBeta * (180 / Math.PI);

    const angUnit = state.angleUnit || 'deg';
    const lenUnit = state.lengthUnit || 'px';

    // Update 2D telemetry
    const elCentralAngle = document.getElementById('tel-central-angle');
    if (elCentralAngle) elCentralAngle.textContent = UnitSystemConverter.formatAngle(g.centralDeg, angUnit);
    const elInscribedAngle = document.getElementById('tel-inscribed-angle');
    if (elInscribedAngle) elInscribedAngle.textContent = UnitSystemConverter.formatAngle(g.inscribedDeg, angUnit);
    const elTelAlpha = document.getElementById('tel-alpha');
    if (elTelAlpha) elTelAlpha.textContent = UnitSystemConverter.formatAngle(alphaDeg, angUnit);
    const elTelBeta = document.getElementById('tel-beta');
    if (elTelBeta) elTelBeta.textContent = UnitSystemConverter.formatAngle(betaDeg, angUnit);
    const elTelRatio = document.getElementById('tel-ratio');
    if (elTelRatio) elTelRatio.textContent = `${g.ratio.toFixed(3)}`;
    const elTelRadius = document.getElementById('tel-radius');
    if (elTelRadius) elTelRadius.textContent = UnitSystemConverter.formatLength(state.radius, lenUnit, state.radius);
    const elTelArc = document.getElementById('tel-arc');
    if (elTelArc) elTelArc.textContent = UnitSystemConverter.formatLength(g.arcLength, lenUnit, state.radius, 1);

    // Update 3D telemetry
    const R3D = ((state.radius || 180) / 180) * 10;
    const el3dR = document.getElementById('val-3d-r');
    if (el3dR) el3dR.textContent = lenUnit === 'px' ? R3D.toFixed(1) : UnitSystemConverter.formatLength(R3D, lenUnit, 10, 1);
    const elPx = document.getElementById('val-3d-px');
    if (elPx) elPx.textContent = (R3D * Math.cos(state.angleP)).toFixed(2);
    const elPz = document.getElementById('val-3d-pz');
    if (elPz) elPz.textContent = (R3D * Math.sin(state.angleP)).toFixed(2);
    const elCentral = document.getElementById('val-3d-central');
    if (elCentral) elCentral.textContent = UnitSystemConverter.formatAngle(g.centralDeg, angUnit);
    const elInscribed = document.getElementById('val-3d-inscribed');
    if (elInscribed) elInscribed.textContent = UnitSystemConverter.formatAngle(g.inscribedDeg, angUnit);
    const el3dAlpha = document.getElementById('val-3d-alpha');
    if (el3dAlpha) el3dAlpha.textContent = UnitSystemConverter.formatAngle(alphaDeg, angUnit);
    const el3dBeta = document.getElementById('val-3d-beta');
    if (el3dBeta) el3dBeta.textContent = UnitSystemConverter.formatAngle(betaDeg, angUnit);
    const elRatio = document.getElementById('val-3d-ratio');
    if (elRatio) elRatio.textContent = g.ratio.toFixed(3);

    // Reflex Telemetry (2D & 3D)
    const reflexCentral = 360 - g.centralDeg;
    const reflexInscribed = 360 - g.inscribedDeg;
    const elTelReflexCent = document.getElementById('tel-reflex-central');
    if (elTelReflexCent) elTelReflexCent.textContent = UnitSystemConverter.formatAngle(reflexCentral, angUnit);
    const elTelReflexInsc = document.getElementById('tel-reflex-inscribed');
    if (elTelReflexInsc) elTelReflexInsc.textContent = UnitSystemConverter.formatAngle(reflexInscribed, angUnit);
    const elTelPerigonCent = document.getElementById('tel-perigon-central');
    if (elTelPerigonCent) elTelPerigonCent.textContent = UnitSystemConverter.formatAngle(g.centralDeg + reflexCentral, angUnit);

    const el3dReflexCent = document.getElementById('val-3d-reflex-central');
    if (el3dReflexCent) el3dReflexCent.textContent = UnitSystemConverter.formatAngle(reflexCentral, angUnit);
    const el3dReflexInsc = document.getElementById('val-3d-reflex-inscribed');
    if (el3dReflexInsc) el3dReflexInsc.textContent = UnitSystemConverter.formatAngle(reflexInscribed, angUnit);
    const el3dPerigon = document.getElementById('val-3d-perigon');
    if (el3dPerigon) el3dPerigon.textContent = UnitSystemConverter.formatAngle(g.centralDeg + reflexCentral, angUnit);

    // Update live math derivations
    derivations.render(state, g);
    if (radiusInput && document.activeElement !== radiusInput) radiusInput.value = state.radius;
    if (radiusLabel) radiusLabel.textContent = `${Math.round(state.radius)}px`;

    // Sync Play button state
    const isPlaying = Boolean(state.playing);
    playBtn.classList.toggle('active', isPlaying);
    playBtn.querySelector('.playback-label').textContent = isPlaying ? 'Pause' : 'Play';
    playBtn.querySelector('.icon-play').style.display = isPlaying ? 'none' : 'inline-block';
    playBtn.querySelector('.icon-pause').style.display = isPlaying ? 'inline-block' : 'none';

    // Sync Point P slider if not actively dragging it in 2D
    if (activeDragPoint !== 'P' && pPosInput) {
      pPosInput.value = Math.round(((state.angleP * 180) / Math.PI + 360) % 360);
    }
  };

  store.subscribe(update);
  update(store.get());
}

bootstrap();
