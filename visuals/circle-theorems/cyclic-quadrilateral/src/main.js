import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, isNearCircumference, bindStandardToggles, PlaybackController, UnitSystemConverter, clampCyclicAngle } from '../../../../js/circle-core.js';
import { CyclicQuadDerivations } from '../../../../js/circle-derivations.js';
import { loadThree, NullScene3DView, ViewModeController, CyclicQuad3DView } from '../../../../js/circle-3d.js';
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

  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      store.reset();
      store.set({ playing: false, viewMode: 'split', splitDirection: 'horizontal', splitRatio: 50, pan: { x: 0, y: 0 } });
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
  document.getElementById('slider-radius')?.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  const toggleExt = document.getElementById('toggle-exterior');
  const toggle3dExt = document.getElementById('toggle-3d-exterior');
  const onExtChange = (checked) => {
    store.set({ showExterior: checked });
    if (toggleExt) toggleExt.checked = checked;
    if (toggle3dExt) toggle3dExt.checked = checked;
  };
  if (toggleExt) toggleExt.addEventListener('change', (e) => onExtChange(e.target.checked));
  if (toggle3dExt) toggle3dExt.addEventListener('change', (e) => onExtChange(e.target.checked));
  const toggleDiag = document.getElementById('toggle-diagonals');
  const toggle3dDiag = document.getElementById('toggle-3d-diagonals');
  const onDiagChange = (checked) => {
    store.set({ showDiagonals: checked });
    if (toggleDiag) toggleDiag.checked = checked;
    if (toggle3dDiag) toggle3dDiag.checked = checked;
  };
  if (toggleDiag) toggleDiag.addEventListener('change', (e) => onDiagChange(e.target.checked));
  if (toggle3dDiag) toggle3dDiag.addEventListener('change', (e) => onDiagChange(e.target.checked));

  document.getElementById('btn-export-png')?.addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg')?.addEventListener('click', () => view.exportSVG());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 180;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(260, Math.max(100, Math.round(cur * factor)));
    store.set({ radius: nextR });
  }, { passive: false });

  // Interactive Dragging
  let activeVertex = null;
  let panOrigin = { x: 0, y: 0 };
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
    else if (isNearCircumference(x, y, g.cx, g.cy, g.r, 14)) activeVertex = 'radius';
    else {
      activeVertex = 'pan';
      const curPan = store.get().pan || { x: 0, y: 0 };
      panOrigin = { x: e.clientX - curPan.x, y: e.clientY - curPan.y };
    }

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
      const hoverPt = hit(x, y, g.A) || hit(x, y, g.B) || hit(x, y, g.C) || hit(x, y, g.D);
      const hoverCirc = !hoverPt && isNearCircumference(x, y, g.cx, g.cy, g.r, 14);
      canvas.style.cursor = hoverPt ? 'pointer' : (hoverCirc ? 'ew-resize' : 'grab');
      return;
    }

    if (activeVertex === 'pan') {
      canvas.style.cursor = 'grabbing';
      store.set({
        pan: {
          x: e.clientX - panOrigin.x,
          y: e.clientY - panOrigin.y,
        },
      });
      return;
    }

    if (activeVertex === 'radius') {
      canvas.style.cursor = 'ew-resize';
      const dist = Math.hypot(x - g.cx, y - g.cy);
      const nextR = Math.min(260, Math.max(100, Math.round(dist)));
      store.set({ radius: nextR });
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);
    const cur = store.get();

    if (activeVertex === 'A') {
      const clampedA = clampCyclicAngle(ang, cur.angleB, cur.angleD, cur.angleC, 0.2);
      store.set({ angleA: clampedA });
    } else if (activeVertex === 'B') {
      const clampedB = clampCyclicAngle(ang, cur.angleA, cur.angleC, cur.angleD, 0.2);
      store.set({ angleB: clampedB });
    } else if (activeVertex === 'C') {
      const clampedC = clampCyclicAngle(ang, cur.angleD, cur.angleB, cur.angleA, 0.2);
      store.set({ angleC: clampedC });
    } else if (activeVertex === 'D') {
      const clampedD = clampCyclicAngle(ang, cur.angleC, cur.angleA, cur.angleB, 0.2);
      store.set({ angleD: clampedD });
    }
  });

  const stopDrag = (e) => {
    if (activeVertex) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      activeVertex = null;
      canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('dblclick', () => {
    store.set({ pan: { x: 0, y: 0 } });
  });

  // Store Subscribe & Initial Render
  const update = (state) => {
    view.render(state);
    scene3d.render(state);
    const g = computeGeometry(state, view.width, view.height);

    const angUnit = state.angleUnit || 'deg';
    const lenUnit = state.lengthUnit || 'px';

    // 2D telemetry
    document.getElementById('tel-angle-a').textContent = UnitSystemConverter.formatAngle(g.angleADeg, angUnit);
    document.getElementById('tel-angle-c').textContent = UnitSystemConverter.formatAngle(g.angleCDeg, angUnit);
    document.getElementById('tel-sum-ac').textContent = UnitSystemConverter.formatAngle(g.sumAC, angUnit);
    document.getElementById('tel-angle-b').textContent = UnitSystemConverter.formatAngle(g.angleBDeg, angUnit);
    document.getElementById('tel-angle-d').textContent = UnitSystemConverter.formatAngle(g.angleDDeg, angUnit);
    document.getElementById('tel-sum-bd').textContent = UnitSystemConverter.formatAngle(g.sumBD, angUnit);
    const rSlider = document.getElementById('slider-radius');
    if (rSlider && document.activeElement !== rSlider) rSlider.value = state.radius;
    document.getElementById('label-radius').textContent = UnitSystemConverter.formatLength(state.radius, lenUnit, state.radius);

    // 3D telemetry
    const isSpatial = state.dimensionMode === 'spatial';
    const m3d = scene3d.lastComputed3D;
    const R3D = ((state.radius || 180) / 180) * 10;
    const elR3D = document.getElementById('val-3d-r');
    if (elR3D) elR3D.textContent = lenUnit === 'px' ? R3D.toFixed(1) : UnitSystemConverter.formatLength(R3D, lenUnit, 10, 1);

    const a3d = (isSpatial && m3d) ? m3d.degA : g.angleADeg;
    const b3d = (isSpatial && m3d) ? m3d.degB : g.angleBDeg;
    const c3d = (isSpatial && m3d) ? m3d.degC : g.angleCDeg;
    const d3d = (isSpatial && m3d) ? m3d.degD : g.angleDDeg;
    const sum1_3d = (isSpatial && m3d) ? m3d.sumAC : g.sumAC;
    const sum2_3d = (isSpatial && m3d) ? m3d.sumBD : g.sumBD;

    const el3dA = document.getElementById('val-3d-a');
    if (el3dA) el3dA.textContent = UnitSystemConverter.formatAngle(a3d, angUnit);
    const el3dB = document.getElementById('val-3d-b');
    if (el3dB) el3dB.textContent = UnitSystemConverter.formatAngle(b3d, angUnit);
    const el3dC = document.getElementById('val-3d-c');
    if (el3dC) el3dC.textContent = UnitSystemConverter.formatAngle(c3d, angUnit);
    const el3dD = document.getElementById('val-3d-d');
    if (el3dD) el3dD.textContent = UnitSystemConverter.formatAngle(d3d, angUnit);
    const elSum1 = document.getElementById('val-3d-sum1');
    if (elSum1) elSum1.textContent = UnitSystemConverter.formatAngle(sum1_3d, angUnit);
    const elSum2 = document.getElementById('val-3d-sum2');
    if (elSum2) elSum2.textContent = UnitSystemConverter.formatAngle(sum2_3d, angUnit);

    // Reflex Telemetry (2D & 3D)
    const refA = 360 - g.angleADeg;
    const refB = 360 - g.angleBDeg;
    const refC = 360 - g.angleCDeg;
    const refD = 360 - g.angleDDeg;
    const refSum = refA + refB + refC + refD;
    const refAC = refA + refC;
    const refBD = refB + refD;

    const elTelRefA = document.getElementById('tel-reflex-a');
    if (elTelRefA) elTelRefA.textContent = UnitSystemConverter.formatAngle(refA, angUnit);
    const elTelRefB = document.getElementById('tel-reflex-b');
    if (elTelRefB) elTelRefB.textContent = UnitSystemConverter.formatAngle(refB, angUnit);
    const elTelRefC = document.getElementById('tel-reflex-c');
    if (elTelRefC) elTelRefC.textContent = UnitSystemConverter.formatAngle(refC, angUnit);
    const elTelRefD = document.getElementById('tel-reflex-d');
    if (elTelRefD) elTelRefD.textContent = UnitSystemConverter.formatAngle(refD, angUnit);

    const elTelRefSum = document.getElementById('tel-reflex-sum');
    if (elTelRefSum) elTelRefSum.textContent = UnitSystemConverter.formatAngle(refSum, angUnit);
    const elTelRefAC = document.getElementById('tel-reflex-ac');
    if (elTelRefAC) elTelRefAC.textContent = UnitSystemConverter.formatAngle(refAC, angUnit);
    const elTelRefBD = document.getElementById('tel-reflex-bd');
    if (elTelRefBD) elTelRefBD.textContent = UnitSystemConverter.formatAngle(refBD, angUnit);

    const refA_3d = 360 - a3d;
    const refB_3d = 360 - b3d;
    const refC_3d = 360 - c3d;
    const refD_3d = 360 - d3d;
    const refSum_3d = refA_3d + refB_3d + refC_3d + refD_3d;
    const refAC_3d = refA_3d + refC_3d;
    const refBD_3d = refB_3d + refD_3d;

    const el3dRefA = document.getElementById('val-3d-reflex-a');
    if (el3dRefA) el3dRefA.textContent = UnitSystemConverter.formatAngle(refA_3d, angUnit);
    const el3dRefB = document.getElementById('val-3d-reflex-b');
    if (el3dRefB) el3dRefB.textContent = UnitSystemConverter.formatAngle(refB_3d, angUnit);
    const el3dRefC = document.getElementById('val-3d-reflex-c');
    if (el3dRefC) el3dRefC.textContent = UnitSystemConverter.formatAngle(refC_3d, angUnit);
    const el3dRefD = document.getElementById('val-3d-reflex-d');
    if (el3dRefD) el3dRefD.textContent = UnitSystemConverter.formatAngle(refD_3d, angUnit);

    const el3dRefSum = document.getElementById('val-3d-reflex-sum');
    if (el3dRefSum) el3dRefSum.textContent = UnitSystemConverter.formatAngle(refSum_3d, angUnit);
    const el3dRefAC = document.getElementById('val-3d-reflex-ac');
    if (el3dRefAC) el3dRefAC.textContent = UnitSystemConverter.formatAngle(refAC_3d, angUnit);
    const el3dRefBD = document.getElementById('val-3d-reflex-bd');
    if (el3dRefBD) el3dRefBD.textContent = UnitSystemConverter.formatAngle(refBD_3d, angUnit);

    // Exterior Angle Telemetry (2D & 3D)
    const extC = g.exteriorAngleDeg !== undefined ? g.exteriorAngleDeg : g.angleADeg;
    const isExtMatch = Math.abs(extC - g.angleADeg) < 0.05;
    const elTelExtC = document.getElementById('tel-ext-c');
    if (elTelExtC) elTelExtC.textContent = UnitSystemConverter.formatAngle(extC, angUnit);
    const elTelExtMatch = document.getElementById('tel-ext-match');
    if (elTelExtMatch) {
      elTelExtMatch.textContent = isExtMatch ? `Equal (${UnitSystemConverter.formatAngle(g.angleADeg, angUnit)})` : `${UnitSystemConverter.formatAngle(extC, angUnit)} ≠ ${UnitSystemConverter.formatAngle(g.angleADeg, angUnit)}`;
    }

    const extC_3d = (isSpatial && m3d?.degExt !== undefined) ? m3d.degExt : (isSpatial && m3d ? (180 - c3d) : extC);
    const isExtMatch_3d = Math.abs(extC_3d - a3d) < 0.05;
    const el3dExtC = document.getElementById('val-3d-ext-c');
    if (el3dExtC) el3dExtC.textContent = UnitSystemConverter.formatAngle(extC_3d, angUnit);
    const el3dExtMatch = document.getElementById('val-3d-ext-match');
    if (el3dExtMatch) {
      el3dExtMatch.textContent = isExtMatch_3d ? `Equal (${UnitSystemConverter.formatAngle(a3d, angUnit)})` : `${UnitSystemConverter.formatAngle(extC_3d, angUnit)} ≠ ${UnitSystemConverter.formatAngle(a3d, angUnit)}`;
    }

    // Sync toggle UI with store state
    const isExt = state.showExterior !== false;
    if (toggleExt && toggleExt.checked !== isExt) toggleExt.checked = isExt;
    if (toggle3dExt && toggle3dExt.checked !== isExt) toggle3dExt.checked = isExt;
    const isDiag = state.showDiagonals !== false;
    if (toggleDiag && toggleDiag.checked !== isDiag) toggleDiag.checked = isDiag;
    if (toggle3dDiag && toggle3dDiag.checked !== isDiag) toggle3dDiag.checked = isDiag;

    // Diagonal & Ptolemy Telemetry (2D & 3D)
    const elTelDiagAC = document.getElementById('tel-diag-ac');
    if (elTelDiagAC && g.lenAC !== undefined) {
      elTelDiagAC.textContent = UnitSystemConverter.formatLength(g.lenAC, lenUnit, state.radius, 1);
    }
    const elTelDiagBD = document.getElementById('tel-diag-bd');
    if (elTelDiagBD && g.lenBD !== undefined) {
      elTelDiagBD.textContent = UnitSystemConverter.formatLength(g.lenBD, lenUnit, state.radius, 1);
    }
    const elTelPtolemy = document.getElementById('tel-ptolemy');
    if (elTelPtolemy && g.ptolemyLHS !== undefined && g.ptolemyRHS !== undefined) {
      const isPtolemyMatch = Math.abs(g.ptolemyLHS - g.ptolemyRHS) < 1.0;
      elTelPtolemy.textContent = isPtolemyMatch ? 'Verified (|AC|·|BD| = ∑opp)' : 'Crossed Quad';
    }
    const scale3D = R3D / (g.r || 180);
    const d3AC = (isSpatial && m3d?.diagAC !== undefined) ? m3d.diagAC : ((g.lenAC || 0) * scale3D);
    const d3BD = (isSpatial && m3d?.diagBD !== undefined) ? m3d.diagBD : ((g.lenBD || 0) * scale3D);
    const el3dDiagAC = document.getElementById('val-3d-diag-ac');
    if (el3dDiagAC) {
      el3dDiagAC.textContent = lenUnit === 'px' ? d3AC.toFixed(2) : UnitSystemConverter.formatLength(d3AC, lenUnit, 10, 2);
    }
    const el3dDiagBD = document.getElementById('val-3d-diag-bd');
    if (el3dDiagBD) {
      el3dDiagBD.textContent = lenUnit === 'px' ? d3BD.toFixed(2) : UnitSystemConverter.formatLength(d3BD, lenUnit, 10, 2);
    }

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
