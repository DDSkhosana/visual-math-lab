import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, bindStandardToggles, PlaybackController } from '../../../js/circle-core.js';
import { AlternateSegmentDerivations } from '../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, AlternateSegment3DView } from '../../../js/circle-3d.js';
import { createInitialState, computeGeometry } from './model.js';
import { CanvasView } from './canvas.js';

function createScene3D(container) {
  try {
    return new AlternateSegment3DView(loadThree(), container);
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
    exportPrefix: 'alternate-segment',
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

  const derivations = new AlternateSegmentDerivations(document.getElementById('live-derivations-content'));
  initCollapsibleSections(document);

  // Playback auto-sweep
  const playBtn = document.getElementById('btn-playback');
  new PlaybackController(store, playBtn, { field: 'angleB', speed: 0.5 });

  // Controls
  document.getElementById('slider-radius').addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  
  const toggleProof = document.getElementById('toggle-proof');
  const toggle3dProof = document.getElementById('toggle-3d-proof');
  const toggleDAngles = document.getElementById('toggle-d-angles');
  const toggle3dDAngles = document.getElementById('toggle-3d-d-angles');

  const onProofChange = (checked) => {
    store.set({ showProofConstruction: checked, showThalesOverlay: checked });
    if (toggleProof) toggleProof.checked = checked;
    if (toggle3dProof) toggle3dProof.checked = checked;
  };

  if (toggleProof) toggleProof.addEventListener('change', (e) => onProofChange(e.target.checked));
  if (toggle3dProof) toggle3dProof.addEventListener('change', (e) => onProofChange(e.target.checked));
  if (toggleDAngles) toggleDAngles.addEventListener('change', (e) => {
    store.set({ showDAngles: e.target.checked });
    if (toggle3dDAngles) toggle3dDAngles.checked = e.target.checked;
  });
  if (toggle3dDAngles) toggle3dDAngles.addEventListener('change', (e) => {
    store.set({ showDAngles: e.target.checked });
    if (toggleDAngles) toggleDAngles.checked = e.target.checked;
  });

  document.getElementById('btn-export-png').addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg').addEventListener('click', () => view.exportSVG());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 180;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(260, Math.max(100, Math.round(cur * factor)));
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

    if (hit(x, y, g.T)) activePoint = 'T';
    else if (hit(x, y, g.A)) activePoint = 'A';
    else if (hit(x, y, g.B)) activePoint = 'B';

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
      const hover = hit(x, y, g.T) || hit(x, y, g.A) || hit(x, y, g.B);
      canvas.style.cursor = hover ? 'pointer' : 'default';
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);

    if (activePoint === 'T') store.set({ angleT: ang });
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

    // Sync toggle UI with store state
    const isProof = state.showProofConstruction !== false;
    if (toggleProof && toggleProof.checked !== isProof) toggleProof.checked = isProof;
    if (toggleProofMain && toggleProofMain.checked !== isProof) toggleProofMain.checked = isProof;
    if (toggleDAngles && toggleDAngles.checked !== (state.showDAngles !== false)) toggleDAngles.checked = (state.showDAngles !== false);

    // 2D telemetry
    document.getElementById('tel-tangent-angle').textContent = `${g.tangentChordDeg.toFixed(1)}°`;
    document.getElementById('tel-inscribed-angle').textContent = `${g.inscribedDeg.toFixed(1)}°`;
    const chordLen = Math.hypot(g.A.x - g.T.x, g.A.y - g.T.y).toFixed(1);
    const elChordTA = document.getElementById('tel-chord-ta');
    if (elChordTA) elChordTA.textContent = `${chordLen} px`;
    document.getElementById('tel-diff').textContent = `${g.diffDeg.toFixed(3)}°`;
    const rSlider = document.getElementById('slider-radius');
    if (rSlider && document.activeElement !== rSlider) rSlider.value = state.radius;
    document.getElementById('tel-radius').textContent = `${Math.round(state.radius)} px`;
    document.getElementById('label-radius').textContent = `${Math.round(state.radius)}px`;

    // Thales & Point D 2D Telemetry
    const elThalesTBD = document.getElementById('tel-thales-tbd');
    if (elThalesTBD) elThalesTBD.textContent = `${g.thalesAngleTBD.toFixed(1)}°`;
    const elThalesTAD = document.getElementById('tel-thales-tad');
    if (elThalesTAD) elThalesTAD.textContent = `${g.thalesAngleTAD.toFixed(1)}°`;
    const elThalesTan = document.getElementById('tel-thales-tan');
    if (elThalesTan) elThalesTan.textContent = `${g.thalesTangentTD.toFixed(1)}°`;
    const elAngleTDA = document.getElementById('tel-angle-tda');
    if (elAngleTDA) elAngleTDA.textContent = `${g.angleTDA.toFixed(1)}°`;
    const elExtD = document.getElementById('tel-ext-d');
    if (elExtD) elExtD.textContent = `${g.extAngleD.toFixed(1)}°`;

    // Alternate segments area telemetry
    const elSegMajor = document.getElementById('tel-seg-major');
    if (elSegMajor && g.alternateSegments) elSegMajor.textContent = `${Math.round(g.alternateSegments.major.area)} px²`;
    const elSegMinor = document.getElementById('tel-seg-minor');
    if (elSegMinor && g.alternateSegments) elSegMinor.textContent = `${Math.round(g.alternateSegments.minor.area)} px²`;

    // 3D telemetry
    const R3D = ((state.radius || 180) / 180) * 10;
    const elR3D = document.getElementById('val-3d-r');
    if (elR3D) elR3D.textContent = R3D.toFixed(1);
    const tx = (R3D * Math.cos(state.angleT)).toFixed(2);
    const tz = (R3D * Math.sin(state.angleT)).toFixed(2);
    const ax = (R3D * Math.cos(state.angleA)).toFixed(2);
    const az = (R3D * Math.sin(state.angleA)).toFixed(2);
    const bx = (R3D * Math.cos(state.angleB)).toFixed(2);
    const bz = (R3D * Math.sin(state.angleB)).toFixed(2);
    const dx = (R3D * Math.cos(state.angleT + Math.PI)).toFixed(2);
    const dz = (R3D * Math.sin(state.angleT + Math.PI)).toFixed(2);

    const elT = document.getElementById('val-3d-t');
    if (elT) elT.textContent = `${tx}, ${tz}`;
    const elA = document.getElementById('val-3d-a');
    if (elA) elA.textContent = `${ax}, ${az}`;
    const elB = document.getElementById('val-3d-b');
    if (elB) elB.textContent = `${bx}, ${bz}`;
    const elD = document.getElementById('val-3d-d');
    if (elD) elD.textContent = `${dx}, ${dz}`;

    const elTan = document.getElementById('val-3d-ang-tan');
    if (elTan) elTan.textContent = `${g.tangentChordDeg.toFixed(1)}°`;
    const elTba = document.getElementById('val-3d-ang-tba');
    if (elTba) elTba.textContent = `${g.inscribedDeg.toFixed(1)}°`;
    const elDiff = document.getElementById('val-3d-diff');
    if (elDiff) elDiff.textContent = `${g.diffDeg.toFixed(3)}°`;

    const el3DThalesTBD = document.getElementById('val-3d-thales-tbd');
    if (el3DThalesTBD) el3DThalesTBD.textContent = `${g.thalesAngleTBD.toFixed(1)}°`;
    const el3DThalesTAD = document.getElementById('val-3d-thales-tad');
    if (el3DThalesTAD) el3DThalesTAD.textContent = `${g.thalesAngleTAD.toFixed(1)}°`;
    const el3DAngIntD = document.getElementById('val-3d-ang-int-d');
    if (el3DAngIntD) el3DAngIntD.textContent = `${g.angleTDA.toFixed(1)}°`;
    const el3DAngExtD = document.getElementById('val-3d-ang-ext-d');
    if (el3DAngExtD) el3DAngExtD.textContent = `${g.extAngleD.toFixed(1)}°`;

    // Reflex Telemetry (2D & 3D)
    const reflexAlpha = 360 - g.tangentChordDeg;
    const elTelRefAlpha = document.getElementById('tel-reflex-alpha');
    if (elTelRefAlpha) elTelRefAlpha.textContent = `${reflexAlpha.toFixed(1)}°`;
    const elTelPerigonAlpha = document.getElementById('tel-perigon-alpha');
    if (elTelPerigonAlpha) elTelPerigonAlpha.textContent = `${(g.tangentChordDeg + reflexAlpha).toFixed(1)}°`;

    const el3dRefAlpha = document.getElementById('val-3d-reflex-alpha');
    if (el3dRefAlpha) el3dRefAlpha.textContent = `${reflexAlpha.toFixed(1)}°`;
    const el3dPerigonAlpha = document.getElementById('val-3d-perigon-alpha');
    if (el3dPerigonAlpha) el3dPerigonAlpha.textContent = `${(g.tangentChordDeg + reflexAlpha).toFixed(1)}°`;

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
