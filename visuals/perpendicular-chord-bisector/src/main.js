import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, bindStandardToggles, PlaybackController, UnitSystemConverter } from '../../../js/circle-core.js';
import { ChordBisectorDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, ChordBisector3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new ChordBisector3DView(loadThree(), container);
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

  const toolbar2d = document.getElementById('toolbar-2d-panel');
  const toolbar3d = document.getElementById('toolbar-3d-panel');

  new ViewModeController(store, {
    mainView: document.getElementById('main-view'),
    container2d,
    container3d,
    toolbar2d,
    toolbar3d,
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

  const cameraPresets = document.querySelectorAll('#canvas-3d-container .camera-presets-bar button');
  cameraPresets.forEach((btn) => {
    btn.addEventListener('click', () => {
      cameraPresets.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      scene3d.setCameraPreset(btn.dataset.preset);
    });
  });

  new Panel(document.getElementById('controls-panel'), {
    header: document.getElementById('controls-header'),
    minimizeButton: document.getElementById('toggle-controls-min'),
    expandButton: document.getElementById('toggle-controls-expand'),
  });

  new Panel(document.getElementById('derivations-panel'), {
    header: document.getElementById('deriv-header'),
    minimizeButton: document.getElementById('toggle-deriv-min'),
    expandButton: document.getElementById('toggle-deriv-expand'),
  });

  bindStandardToggles(store, {
    canvas2d: view,
    view3d: scene3d,
    exportPrefix: 'perpendicular-chord-bisector',
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

  const derivations = new ChordBisectorDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback Auto-Sweep
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: 'angleB', speed: 0.45 });

  // Controls
  document.getElementById('slider-radius')?.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  const toggleRadii = document.getElementById('toggle-radii');
  if (toggleRadii) toggleRadii.addEventListener('change', (e) => store.set({ showRadii: e.target.checked }));
  const toggleBisector = document.getElementById('toggle-bisector');
  if (toggleBisector) toggleBisector.addEventListener('change', (e) => store.set({ showExtendedBisector: e.target.checked }));

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 170;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(250, Math.max(100, Math.round(cur * factor)));
    store.set({ radius: nextR });
  }, { passive: false });

  // Interactive Dragging
  let activePoint = null;
  function hit(x, y, pt, radius = 22) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hit(x, y, g.A)) activePoint = 'A';
    else if (hit(x, y, g.B)) activePoint = 'B';
    else if (hit(x, y, g.M)) activePoint = 'M';

    if (activePoint) {
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

    if (!activePoint) {
      const hover = hit(x, y, g.A) || hit(x, y, g.B) || hit(x, y, g.M);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);

    if (activePoint === 'A') {
      store.set({ angleA: ang });
    } else if (activePoint === 'B') {
      store.set({ angleB: ang });
    } else if (activePoint === 'M') {
      const st = store.get();
      const dAngle = Math.atan2(Math.sin(st.angleB - st.angleA), Math.cos(st.angleB - st.angleA));
      const TAU = Math.PI * 2;
      const nextA = (ang - dAngle / 2 + TAU * 2) % TAU;
      const nextB = (ang + dAngle / 2 + TAU * 2) % TAU;
      store.set({ angleA: nextA, angleB: nextB });
    }
  });

  const stopDrag = (e) => {
    if (activePoint) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      activePoint = null;
      canvas.style.cursor = 'default';
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);

  // Store Subscribe & Initial Render
  const update = (state) => {
    view.render(state);
    scene3d.render(state);
    const g = computeGeometry(state, view.width, view.height);

    const angUnit = state.angleUnit || 'deg';
    const lenUnit = state.lengthUnit || 'px';

    // 2D telemetry
    document.getElementById('tel-len-am').textContent = UnitSystemConverter.formatLength(g.lenAM, lenUnit, state.radius, 1);
    document.getElementById('tel-len-mb').textContent = UnitSystemConverter.formatLength(g.lenMB, lenUnit, state.radius, 1);
    document.getElementById('tel-diff').textContent = UnitSystemConverter.formatLength(g.midDiff, lenUnit, state.radius, 3);
    document.getElementById('tel-angle-oma').textContent = UnitSystemConverter.formatAngle(g.angleOMADeg, angUnit);
    const rSlider = document.getElementById('slider-radius');
    if (rSlider && document.activeElement !== rSlider) rSlider.value = state.radius;
    document.getElementById('label-radius').textContent = UnitSystemConverter.formatLength(state.radius, lenUnit, state.radius);

    // 3D telemetry
    const R3 = ((state.radius || 170) / 170) * 10;
    const elR3 = document.getElementById('val-3d-r');
    if (elR3) elR3.textContent = lenUnit === 'px' ? R3.toFixed(1) : UnitSystemConverter.formatLength(R3, lenUnit, 10, 1);
    const a3 = { x: R3 * Math.cos(state.angleA), z: R3 * Math.sin(state.angleA) };
    const b3 = { x: R3 * Math.cos(state.angleB), z: R3 * Math.sin(state.angleB) };
    const m3 = { x: (a3.x + b3.x) / 2, z: (a3.z + b3.z) / 2 };
    const lenAM3 = Math.hypot(a3.x - m3.x, a3.z - m3.z).toFixed(2);
    const lenMB3 = Math.hypot(b3.x - m3.x, b3.z - m3.z).toFixed(2);

    const elM = document.getElementById('val-3d-m');
    if (elM) elM.textContent = `${m3.x.toFixed(2)}, ${m3.z.toFixed(2)}`;
    const elAm = document.getElementById('val-3d-am');
    if (elAm) elAm.textContent = lenUnit === 'px' ? lenAM3 : UnitSystemConverter.formatLength(parseFloat(lenAM3), lenUnit, 10, 2);
    const elMb = document.getElementById('val-3d-mb');
    if (elMb) elMb.textContent = lenUnit === 'px' ? lenMB3 : UnitSystemConverter.formatLength(parseFloat(lenMB3), lenUnit, 10, 2);
    const elAngM = document.getElementById('val-3d-ang-m');
    if (elAngM) elAngM.textContent = UnitSystemConverter.formatAngle(90, angUnit);
    const elDiff = document.getElementById('val-3d-diff');
    if (elDiff) elDiff.textContent = '0.000';

    // Reflex Telemetry (2D & 3D)
    const elTelRefM = document.getElementById('tel-reflex-m');
    if (elTelRefM) elTelRefM.textContent = UnitSystemConverter.formatAngle(270, angUnit);
    const elTelPerigonM = document.getElementById('tel-perigon-m');
    if (elTelPerigonM) elTelPerigonM.textContent = UnitSystemConverter.formatAngle(360, angUnit);

    const el3dRefM = document.getElementById('val-3d-reflex-m');
    if (el3dRefM) el3dRefM.textContent = UnitSystemConverter.formatAngle(270, angUnit);
    const el3dPerigonM = document.getElementById('val-3d-perigon-m');
    if (el3dPerigonM) el3dPerigonM.textContent = UnitSystemConverter.formatAngle(360, angUnit);

    // Live math derivations
    derivations.render(state, g);

    // Sync Play button state
    const isPlaying = Boolean(state.playing);
    playBtn.classList.toggle('active', isPlaying);
    playBtn.querySelector('.playback-label').textContent = isPlaying ? 'Pause' : 'Play';
    playBtn.querySelector('.icon-play').style.display = isPlaying ? 'none' : 'inline-block';
    playBtn.querySelector('.icon-pause').style.display = isPlaying ? 'inline-block' : 'none';
  };

  store.subscribe(update);
  update(store.get());
}

bootstrap();
