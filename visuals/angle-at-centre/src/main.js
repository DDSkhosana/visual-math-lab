import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, toRadians, bindStandardToggles, PlaybackController } from '../../../js/circle-core.js';
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
  radiusInput.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));

  const pPosInput = document.getElementById('slider-p');
  pPosInput.addEventListener('input', (e) => store.set({ angleP: toRadians(parseFloat(e.target.value)) }));

  // Checkbox bindings
  const toggleArea = document.getElementById('toggle-area');
  if (toggleArea) {
    toggleArea.addEventListener('change', (e) => store.set({ showArea: e.target.checked }));
  }

  const toggleRadii = document.getElementById('toggle-radii');
  toggleRadii.addEventListener('change', (e) => store.set({ showRadii: e.target.checked }));

  const toggleSplit = document.getElementById('toggle-split');
  toggleSplit.addEventListener('change', (e) => store.set({ showSplit: e.target.checked }));

  const toggleAngles = document.getElementById('toggle-angles');
  toggleAngles.addEventListener('change', (e) => store.set({ showAngles: e.target.checked }));

  // Snapshot Exports
  document.getElementById('btn-export-png').addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg').addEventListener('click', () => view.exportSVG());

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
      const hover = hitTest(x, y, g.P, 24) || hitTest(x, y, g.A, 20) || hitTest(x, y, g.B, 20);
      canvas.style.cursor = hover ? 'pointer' : 'default';
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

    // Update 2D telemetry
    document.getElementById('tel-central-angle').textContent = `${g.centralDeg.toFixed(1)}°`;
    document.getElementById('tel-inscribed-angle').textContent = `${g.inscribedDeg.toFixed(1)}°`;
    const elTelAlpha = document.getElementById('tel-alpha');
    if (elTelAlpha) elTelAlpha.textContent = `${alphaDeg.toFixed(1)}°`;
    const elTelBeta = document.getElementById('tel-beta');
    if (elTelBeta) elTelBeta.textContent = `${betaDeg.toFixed(1)}°`;
    document.getElementById('tel-ratio').textContent = `${g.ratio.toFixed(3)}`;
    document.getElementById('tel-radius').textContent = `${state.radius} px`;
    document.getElementById('tel-arc').textContent = `${g.arcLength.toFixed(1)} px`;

    // Update 3D telemetry
    const elPx = document.getElementById('val-3d-px');
    if (elPx) elPx.textContent = (10 * Math.cos(state.angleP)).toFixed(2);
    const elPz = document.getElementById('val-3d-pz');
    if (elPz) elPz.textContent = (10 * Math.sin(state.angleP)).toFixed(2);
    const elCentral = document.getElementById('val-3d-central');
    if (elCentral) elCentral.textContent = `${g.centralDeg.toFixed(1)}°`;
    const elInscribed = document.getElementById('val-3d-inscribed');
    if (elInscribed) elInscribed.textContent = `${g.inscribedDeg.toFixed(1)}°`;
    const el3dAlpha = document.getElementById('val-3d-alpha');
    if (el3dAlpha) el3dAlpha.textContent = `${alphaDeg.toFixed(1)}°`;
    const el3dBeta = document.getElementById('val-3d-beta');
    if (el3dBeta) el3dBeta.textContent = `${betaDeg.toFixed(1)}°`;
    const elRatio = document.getElementById('val-3d-ratio');
    if (elRatio) elRatio.textContent = g.ratio.toFixed(3);

    // Update live math derivations
    derivations.render(state, g);
    radiusLabel.textContent = `${state.radius}px`;

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
