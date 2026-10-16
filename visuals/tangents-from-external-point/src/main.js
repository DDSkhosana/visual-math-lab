import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, bindStandardToggles, PlaybackController, UnitSystemConverter } from '../../../js/circle-core.js';
import { TangentsFromPointDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, TangentsFromPoint3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry, MIN_EXTERNAL_POINT_CLEARANCE } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new TangentsFromPoint3DView(loadThree(), container);
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
    exportPrefix: 'tangents-from-external-point',
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

  const derivations = new TangentsFromPointDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback auto-sweep (orbit P around circle)
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: 'pointAngle', speed: 0.4 });

  // Controls
  const radiusInput = document.getElementById('slider-radius');
  radiusInput?.addEventListener('input', (e) => {
    const r = parseFloat(e.target.value);
    const curDist = store.get().pointDist || 260;
    const nextDist = Math.max(r + MIN_EXTERNAL_POINT_CLEARANCE, curDist);
    store.set({ radius: r, pointDist: nextDist });
  });
  const distInput = document.getElementById('slider-dist');
  distInput?.addEventListener('input', (e) => {
    const r = store.get().radius || 120;
    const d = Math.max(r + MIN_EXTERNAL_POINT_CLEARANCE, parseFloat(e.target.value));
    store.set({ pointDist: d });
  });
  const elCong = document.getElementById('toggle-congruence');
  if (elCong) elCong.addEventListener('change', (e) => store.set({ showCongruence: e.target.checked, showArea: e.target.checked }));

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 120;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(220, Math.max(80, Math.round(cur * factor)));
    const curDist = store.get().pointDist || 260;
    const nextDist = Math.max(nextR + MIN_EXTERNAL_POINT_CLEARANCE, curDist);
    store.set({ radius: nextR, pointDist: nextDist });
  }, { passive: false });

  // Interactive Dragging of P, T1, T2
  let dragTarget = null;
  function hit(x, y, pt, radius = 24) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hit(x, y, g.P, 26)) {
      dragTarget = 'P';
    } else if (hit(x, y, g.T1, 24)) {
      dragTarget = 'T1';
    } else if (hit(x, y, g.T2, 24)) {
      dragTarget = 'T2';
    }

    if (dragTarget) {
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

    if (!dragTarget) {
      const hover = hit(x, y, g.P, 26) || hit(x, y, g.T1, 24) || hit(x, y, g.T2, 24);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const dx = x - g.cx;
    const dy = g.cy - y;
    const rawAngle = pointerToAngle(dx, dy);
    const alpha = Math.acos(Math.min(1, Math.max(-1, g.r / g.d)));

    if (dragTarget === 'P') {
      const dist = Math.max(g.r + MIN_EXTERNAL_POINT_CLEARANCE, Math.hypot(dx, dy));
      store.set({ pointDist: dist, pointAngle: rawAngle });
    } else if (dragTarget === 'T1') {
      let pAngle = rawAngle - alpha;
      if (pAngle < 0) pAngle += Math.PI * 2;
      store.set({ pointAngle: pAngle });
    } else if (dragTarget === 'T2') {
      let pAngle = rawAngle + alpha;
      if (pAngle >= Math.PI * 2) pAngle -= Math.PI * 2;
      store.set({ pointAngle: pAngle });
    }
  });

  const stopDrag = (e) => {
    if (dragTarget) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      dragTarget = null;
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

    // 2D telemetry
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('tel-kite-area', `${g.kiteArea.toFixed(1)} px²`);
    setT('tel-tri-area', `${g.triArea.toFixed(1)} px²`);
    setT('tel-len-t1', `${g.lenPT1.toFixed(1)} px`);
    setT('tel-len-t2', `${g.lenPT2.toFixed(1)} px`);
    setT('tel-diff', `${g.lenDiff.toFixed(3)} px`);
    setT('tel-dist-op', `${g.d.toFixed(1)} px`);
    setT('tel-chord-t1t2', `${g.chordT1T2.toFixed(1)} px`);
    setT('tel-chord-half', `${g.halfChord.toFixed(1)} px`);
    setT('tel-radius', `${state.radius} px`);

    setT('tel-angle-alpha1', `${g.alphaDeg.toFixed(1)}°`);
    setT('tel-angle-alpha2', `${g.alphaDeg.toFixed(1)}°`);
    setT('tel-angle-tpt', `${g.angleT1PT2Deg.toFixed(1)}°`);
    setT('tel-angle-beta1', `${g.betaDeg.toFixed(1)}°`);
    setT('tel-angle-beta2', `${g.betaDeg.toFixed(1)}°`);

    setT('tel-glyph-o', `(${g.cx.toFixed(0)}, ${g.cy.toFixed(0)})`);
    setT('tel-glyph-p', `(${g.P.x.toFixed(0)}, ${g.P.y.toFixed(0)})`);
    setT('tel-glyph-t1', `(${g.T1.x.toFixed(0)}, ${g.T1.y.toFixed(0)})`);
    setT('tel-glyph-t2', `(${g.T2.x.toFixed(0)}, ${g.T2.y.toFixed(0)})`);
    setT('tel-glyph-k', `(${g.K.x.toFixed(0)}, ${g.K.y.toFixed(0)})`);

    setT('label-radius', `${state.radius}px`);
    setT('label-dist', `${Math.round(g.d)}px`);

    // 3D telemetry
    const R3D = ((state.radius || 120) / 120) * 8;
    setT('val-3d-r', R3D.toFixed(1));
    const distRatio = Math.max(1.15, (state.pointDist || 260) / (state.radius || 120));
    const d3 = R3D * distRatio;
    const ang3 = state.pointAngle || 0;
    const px3 = (d3 * Math.cos(ang3)).toFixed(2);
    const pz3 = (d3 * Math.sin(ang3)).toFixed(2);
    const tanLen3 = Math.sqrt(Math.max(0, d3 * d3 - R3D * R3D)).toFixed(2);
    const kiteArea3 = (R3D * parseFloat(tanLen3)).toFixed(2);
    const alpha3Rad = Math.acos(Math.min(1, R3D / d3));
    const alpha3Deg = (alpha3Rad * 180 / Math.PI).toFixed(1);
    const beta3Deg = (90 - parseFloat(alpha3Deg)).toFixed(1);
    const t1x3 = (R3D * Math.cos(ang3 + alpha3Rad)).toFixed(2);
    const t1z3 = (R3D * Math.sin(ang3 + alpha3Rad)).toFixed(2);
    const t2x3 = (R3D * Math.cos(ang3 - alpha3Rad)).toFixed(2);
    const t2z3 = (R3D * Math.sin(ang3 - alpha3Rad)).toFixed(2);
    const kx3 = (((R3D * R3D) / d3) * Math.cos(ang3)).toFixed(2);
    const kz3 = (((R3D * R3D) / d3) * Math.sin(ang3)).toFixed(2);
    const chord3 = (2 * (R3D / d3) * parseFloat(tanLen3)).toFixed(2);

    setT('val-3d-area', kiteArea3);
    setT('val-3d-len1', tanLen3);
    setT('val-3d-len2', tanLen3);
    setT('val-3d-diff', '0.000');
    setT('val-3d-dist', d3.toFixed(2));
    setT('val-3d-chord', chord3);

    setT('val-3d-ang-p1', `${alpha3Deg}°`);
    setT('val-3d-ang-p2', `${alpha3Deg}°`);
    setT('val-3d-ang-o1', `${beta3Deg}°`);
    setT('val-3d-ang-o2', `${beta3Deg}°`);
    setT('tel-reflex-tangent', '270.0°');
    setT('tel-reflex-kite', '1080.0°');
    setT('val-3d-reflex-tangent', '270.0°');
    setT('val-3d-reflex-kite', '1080.0°');

    setT('val-3d-p', `${px3}, ${pz3}`);
    setT('val-3d-t1', `${t1x3}, ${t1z3}`);
    setT('val-3d-t2', `${t2x3}, ${t2z3}`);
    setT('val-3d-k', `${kx3}, ${kz3}`);

    // Live math derivations
    derivations.render(state, g);

    // Sync Play button state
    const isPlaying = Boolean(state.playing);
    playBtn.classList.toggle('active', isPlaying);
    playBtn.querySelector('.playback-label').textContent = isPlaying ? 'Pause' : 'Play';
    playBtn.querySelector('.icon-play').style.display = isPlaying ? 'none' : 'inline-block';
    playBtn.querySelector('.icon-pause').style.display = isPlaying ? 'inline-block' : 'none';

    // Sync sliders if not actively dragging on 2D canvas
    if (!dragTarget) {
      if (distInput) {
        distInput.min = String(state.radius + MIN_EXTERNAL_POINT_CLEARANCE);
        distInput.value = Math.round(state.pointDist);
      }
      if (radiusInput) radiusInput.value = Math.round(state.radius);
    }
  };

  store.subscribe(update);
  update(store.get());
}

bootstrap();
