import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, bindStandardToggles, PlaybackController } from '../../../js/circle-core.js';
import { TangentsFromPointDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, TangentsFromPoint3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
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
  document.getElementById('slider-radius').addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  const distInput = document.getElementById('slider-dist');
  distInput.addEventListener('input', (e) => store.set({ pointDist: parseFloat(e.target.value) }));
  document.getElementById('toggle-congruence').addEventListener('change', (e) => store.set({ showCongruence: e.target.checked, showArea: e.target.checked }));

  // Interactive Dragging of P
  let dragging = false;
  function hit(x, y, pt, radius = 24) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hit(x, y, g.P)) {
      dragging = true;
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

    if (!dragging) {
      const hover = hit(x, y, g.P);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const dx = x - g.cx;
    const dy = y - g.cy;
    const dist = Math.max(g.r + 15, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    store.set({ pointDist: dist, pointAngle: angle });
  });

  const stopDrag = (e) => {
    if (dragging) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      dragging = false;
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
    document.getElementById('tel-len-t1').textContent = `${g.lenPT1.toFixed(1)} px`;
    document.getElementById('tel-len-t2').textContent = `${g.lenPT2.toFixed(1)} px`;
    document.getElementById('tel-diff').textContent = `${g.lenDiff.toFixed(3)} px`;
    document.getElementById('tel-angle-tpt').textContent = `${g.angleT1PT2Deg.toFixed(1)}°`;

    document.getElementById('label-radius').textContent = `${state.radius}px`;
    document.getElementById('label-dist').textContent = `${Math.round(g.d)}px`;

    // 3D telemetry
    const distRatio = Math.max(1.15, (state.pointDist || 260) / (state.radius || 120));
    const d3 = 8 * distRatio;
    const px3 = (d3 * Math.cos(state.pointAngle || 0)).toFixed(2);
    const pz3 = (d3 * Math.sin(state.pointAngle || 0)).toFixed(2);
    const tanLen3 = Math.sqrt(d3 * d3 - 64).toFixed(2);

    const elP = document.getElementById('val-3d-p');
    if (elP) elP.textContent = `${px3}, ${pz3}`;
    const elLen1 = document.getElementById('val-3d-len1');
    if (elLen1) elLen1.textContent = tanLen3;
    const elLen2 = document.getElementById('val-3d-len2');
    if (elLen2) elLen2.textContent = tanLen3;
    const elDiff = document.getElementById('val-3d-diff');
    if (elDiff) elDiff.textContent = '0.000';

    // Live math derivations
    derivations.render(state, g);

    // Sync Play button state
    const isPlaying = Boolean(state.playing);
    playBtn.classList.toggle('active', isPlaying);
    playBtn.querySelector('.playback-label').textContent = isPlaying ? 'Pause' : 'Play';
    playBtn.querySelector('.icon-play').style.display = isPlaying ? 'none' : 'inline-block';
    playBtn.querySelector('.icon-pause').style.display = isPlaying ? 'inline-block' : 'none';

    // Sync dist slider if not actively dragging on 2D canvas
    if (!dragging && distInput) {
      distInput.value = Math.round(state.pointDist);
    }
  };

  store.subscribe(update);
  update(store.get());
}

bootstrap();
