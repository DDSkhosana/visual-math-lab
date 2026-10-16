import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, toRadians, bindStandardToggles, PlaybackController, UnitSystemConverter } from '../../../js/circle-core.js';
import { AnglesInSameSegmentDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, AnglesInSameSegment3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new AnglesInSameSegment3DView(loadThree(), container);
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

  bindStandardToggles(store, {
    canvas2d: view,
    view3d: scene3d,
    exportPrefix: 'angles-in-same-segment',
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

  const derivations = new AnglesInSameSegmentDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback Auto-Sweep
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, (delta, store) => {
    const cur = store.get();
    store.set({
      angleP1: (cur.angleP1 + 0.4 * delta) % (Math.PI * 2),
      angleP2: (cur.angleP2 + 0.7 * delta) % (Math.PI * 2),
    });
  });

  // Controls
  const sliderRadius = document.getElementById('slider-radius');
  sliderRadius?.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));

  document.getElementById('toggle-center')?.addEventListener('change', (e) => store.set({ showCenter: e.target.checked }));
  document.getElementById('toggle-shading')?.addEventListener('change', (e) => store.set({ showShading: e.target.checked, showArea: e.target.checked }));
  document.getElementById('toggle-angles')?.addEventListener('change', (e) => store.set({ showAngles: e.target.checked }));

  document.getElementById('btn-export-png')?.addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg')?.addEventListener('click', () => view.exportSVG());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 180;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(260, Math.max(100, Math.round(cur * factor)));
    store.set({ radius: nextR });
  }, { passive: false });

  // Dragging Points
  let activePoint = null;
  function hit(x, y, pt, radius = 20) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hit(x, y, g.P1, 24)) activePoint = 'P1';
    else if (hit(x, y, g.P2, 24)) activePoint = 'P2';
    else if (hit(x, y, g.A, 20)) activePoint = 'A';
    else if (hit(x, y, g.B, 20)) activePoint = 'B';

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
      const hover = hit(x, y, g.P1, 24) || hit(x, y, g.P2, 24) || hit(x, y, g.A, 20) || hit(x, y, g.B, 20);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);

    if (activePoint === 'P1') store.set({ angleP1: ang });
    else if (activePoint === 'P2') store.set({ angleP2: ang });
    else if (activePoint === 'A') store.set({ angleA: ang });
    else if (activePoint === 'B') store.set({ angleB: ang });
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

  // Store Subscribe & Initial Render
  const update = (state) => {
    view.render(state);
    scene3d.render(state);
    const g = computeGeometry(state, view.width, view.height);

    // 2D telemetry
    const telP1Angle = document.getElementById('tel-p1-angle');
    if (telP1Angle) telP1Angle.textContent = `${g.angleP1Deg.toFixed(1)}°`;
    const telP2Angle = document.getElementById('tel-p2-angle');
    if (telP2Angle) telP2Angle.textContent = `${g.angleP2Deg.toFixed(1)}°`;
    const p1c2d = document.getElementById('tel-p1-coords');
    if (p1c2d) p1c2d.innerHTML = `<span class="color-amber">${(g.P1.x - g.cx).toFixed(1)}</span>, <span class="color-lime">${(-(g.P1.y - g.cy)).toFixed(1)}</span>`;
    const p2c2d = document.getElementById('tel-p2-coords');
    if (p2c2d) p2c2d.innerHTML = `<span class="color-amber">${(g.P2.x - g.cx).toFixed(1)}</span>, <span class="color-lime">${(-(g.P2.y - g.cy)).toFixed(1)}</span>`;
    const telDiff = document.getElementById('tel-diff');
    if (telDiff) telDiff.textContent = `${g.diffDeg.toFixed(3)}°`;
    const telCentral = document.getElementById('tel-central-angle');
    if (telCentral) telCentral.textContent = `${g.centralDeg.toFixed(1)}°`;
    const rSlider = document.getElementById('slider-radius');
    if (rSlider && document.activeElement !== rSlider) rSlider.value = state.radius;
    const labelRadius = document.getElementById('label-radius');
    if (labelRadius) labelRadius.textContent = `${Math.round(state.radius)}px`;

    // 3D telemetry
    const R3D = ((state.radius || 180) / 180) * 10;
    const elR3D = document.getElementById('val-3d-r');
    if (elR3D) elR3D.textContent = R3D.toFixed(1);
    const p1x = (R3D * Math.cos(state.angleP1)).toFixed(2);
    const p1z = (R3D * Math.sin(state.angleP1)).toFixed(2);
    const p2x = (R3D * Math.cos(state.angleP2)).toFixed(2);
    const p2z = (R3D * Math.sin(state.angleP2)).toFixed(2);
    const elP1 = document.getElementById('val-3d-p1');
    if (elP1) elP1.innerHTML = `<span class="color-amber">${p1x}</span>, <span class="color-steel">${p1z}</span>`;
    const elP2 = document.getElementById('val-3d-p2');
    if (elP2) elP2.innerHTML = `<span class="color-amber">${p2x}</span>, <span class="color-steel">${p2z}</span>`;
    const elAng1 = document.getElementById('val-3d-ang1');
    if (elAng1) elAng1.textContent = `${g.angleP1Deg.toFixed(1)}°`;
    const elAng2 = document.getElementById('val-3d-ang2');
    if (elAng2) elAng2.textContent = `${g.angleP2Deg.toFixed(1)}°`;
    const elDiff = document.getElementById('val-3d-diff');
    if (elDiff) elDiff.textContent = `${g.diffDeg.toFixed(3)}°`;

    // Reflex Telemetry (2D & 3D)
    const refP1 = 360 - g.angleP1Deg;
    const refP2 = 360 - g.angleP2Deg;
    const elTelRefP1 = document.getElementById('tel-reflex-p1');
    if (elTelRefP1) elTelRefP1.textContent = `${refP1.toFixed(1)}°`;
    const elTelRefP2 = document.getElementById('tel-reflex-p2');
    if (elTelRefP2) elTelRefP2.textContent = `${refP2.toFixed(1)}°`;
    const elTelRefSame = document.getElementById('tel-reflex-same');
    if (elTelRefSame) elTelRefSame.textContent = Math.abs(refP1 - refP2) < 0.01 ? 'Invariant' : `${Math.abs(refP1 - refP2).toFixed(3)}°`;

    const el3dRefP1 = document.getElementById('val-3d-reflex-p1');
    if (el3dRefP1) el3dRefP1.textContent = `${refP1.toFixed(1)}°`;
    const el3dRefP2 = document.getElementById('val-3d-reflex-p2');
    if (el3dRefP2) el3dRefP2.textContent = `${refP2.toFixed(1)}°`;
    const el3dRefSame = document.getElementById('val-3d-reflex-same');
    if (el3dRefSame) el3dRefSame.textContent = Math.abs(refP1 - refP2) < 0.01 ? 'Match' : 'Mismatch';

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
