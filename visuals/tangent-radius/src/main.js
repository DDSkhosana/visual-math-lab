import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, bindStandardToggles, PlaybackController } from '../../../js/circle-core.js';
import { TangentRadiusDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, TangentRadius3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new TangentRadius3DView(loadThree(), container);
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
    exportPrefix: 'tangent-radius',
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

  const derivations = new TangentRadiusDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback Auto-Sweep
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: 'angleT', speed: 0.5 });

  // Controls
  document.getElementById('slider-radius').addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  const toggleArea = document.getElementById('toggle-area');
  if (toggleArea) toggleArea.addEventListener('change', (e) => store.set({ showArea: e.target.checked }));
  document.getElementById('toggle-secant').addEventListener('change', (e) => store.set({ showSecant: e.target.checked }));

  document.getElementById('btn-export-png').addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg').addEventListener('click', () => view.exportSVG());

  // Interactive Drag on Point T
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (Math.hypot(x - g.T.x, y - g.T.y) < 26) {
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
      const hover = Math.hypot(x - g.T.x, y - g.T.y) < 26;
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);
    store.set({ angleT: ang });
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
    document.getElementById('tel-radius-len').textContent = `${state.radius} px`;
    document.getElementById('tel-angle').textContent = '90.0°';
    document.getElementById('tel-dot').textContent = `${Math.abs(g.dotProduct).toFixed(4)}`;
    document.getElementById('label-radius').textContent = `${state.radius}px`;

    // 3D telemetry
    const tx = (10 * Math.cos(state.angleT)).toFixed(2);
    const tz = (10 * Math.sin(state.angleT)).toFixed(2);
    const elT = document.getElementById('val-3d-t');
    if (elT) elT.textContent = `${tx}, ${tz}`;
    const elAngle = document.getElementById('val-3d-angle');
    if (elAngle) elAngle.textContent = '90.0°';
    const elDot = document.getElementById('val-3d-dot');
    if (elDot) elDot.textContent = Math.abs(g.dotProduct).toFixed(4);

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
