import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, bindStandardToggles, PlaybackController } from '../../../js/circle-core.js';
import { CyclicQuadDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, CyclicQuad3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new CyclicQuad3DView(loadThree(), container);
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
    exportPrefix: 'cyclic-quadrilateral',
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

  const derivations = new CyclicQuadDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback auto-sweep
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, (delta, store) => {
    const cur = store.get();
    const speed = 0.4;
    store.set({
      angleA: (cur.angleA + speed * delta) % (Math.PI * 2),
      angleB: (cur.angleB + speed * delta) % (Math.PI * 2),
      angleC: (cur.angleC + speed * delta) % (Math.PI * 2),
      angleD: (cur.angleD + speed * delta) % (Math.PI * 2),
    });
  });

  // Controls
  document.getElementById('slider-radius').addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  const toggleArea = document.getElementById('toggle-area');
  if (toggleArea) toggleArea.addEventListener('change', (e) => store.set({ showArea: e.target.checked }));
  document.getElementById('toggle-exterior').addEventListener('change', (e) => store.set({ showExterior: e.target.checked }));
  document.getElementById('toggle-diagonals').addEventListener('change', (e) => store.set({ showDiagonals: e.target.checked }));

  document.getElementById('btn-export-png').addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg').addEventListener('click', () => view.exportSVG());

  // Interactive Dragging
  let activeVertex = null;
  function hit(x, y, pt, radius = 22) {
    return Math.hypot(x - pt.x, y - pt.y) < radius;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    if (hit(x, y, g.A)) activeVertex = 'A';
    else if (hit(x, y, g.B)) activeVertex = 'B';
    else if (hit(x, y, g.C)) activeVertex = 'C';
    else if (hit(x, y, g.D)) activeVertex = 'D';

    if (activeVertex) {
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

    if (!activeVertex) {
      const hover = hit(x, y, g.A) || hit(x, y, g.B) || hit(x, y, g.C) || hit(x, y, g.D);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);

    if (activeVertex === 'A') store.set({ angleA: ang });
    else if (activeVertex === 'B') store.set({ angleB: ang });
    else if (activeVertex === 'C') store.set({ angleC: ang });
    else if (activeVertex === 'D') store.set({ angleD: ang });
  });

  const stopDrag = (e) => {
    if (activeVertex) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      activeVertex = null;
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
    document.getElementById('tel-angle-a').textContent = `${g.angleADeg.toFixed(1)}°`;
    document.getElementById('tel-angle-c').textContent = `${g.angleCDeg.toFixed(1)}°`;
    document.getElementById('tel-sum-ac').textContent = `${g.sumAC.toFixed(1)}°`;
    document.getElementById('tel-angle-b').textContent = `${g.angleBDeg.toFixed(1)}°`;
    document.getElementById('tel-angle-d').textContent = `${g.angleDDeg.toFixed(1)}°`;
    document.getElementById('tel-sum-bd').textContent = `${g.sumBD.toFixed(1)}°`;
    document.getElementById('label-radius').textContent = `${state.radius}px`;

    // 3D telemetry
    const el3dA = document.getElementById('val-3d-a');
    if (el3dA) el3dA.textContent = `${g.angleADeg.toFixed(1)}°`;
    const el3dB = document.getElementById('val-3d-b');
    if (el3dB) el3dB.textContent = `${g.angleBDeg.toFixed(1)}°`;
    const el3dC = document.getElementById('val-3d-c');
    if (el3dC) el3dC.textContent = `${g.angleCDeg.toFixed(1)}°`;
    const el3dD = document.getElementById('val-3d-d');
    if (el3dD) el3dD.textContent = `${g.angleDDeg.toFixed(1)}°`;
    const elSum1 = document.getElementById('val-3d-sum1');
    if (elSum1) elSum1.textContent = `${g.sumAC.toFixed(1)}°`;
    const elSum2 = document.getElementById('val-3d-sum2');
    if (elSum2) elSum2.textContent = `${g.sumBD.toFixed(1)}°`;

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
