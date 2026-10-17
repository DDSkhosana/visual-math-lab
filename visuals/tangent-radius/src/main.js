import { createStore, Panel, DraggableToolbar, TelemetryPanel, bindFullscreen, initCollapsibleSections, pointerToAngle, isNearCircumference, bindStandardToggles, PlaybackController, UnitSystemConverter } from '../../../js/circle-core.js';
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
  document.getElementById('slider-radius')?.addEventListener('input', (e) => store.set({ radius: parseFloat(e.target.value) }));
  document.getElementById('toggle-secant')?.addEventListener('change', (e) => store.set({ showSecant: e.target.checked }));

  // Multiple Tangents Count buttons
  const countBtns = document.querySelectorAll('#tangent-count-group button');
  countBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cnt = parseInt(btn.dataset.count, 10);
      store.set({ tangentCount: cnt });
    });
  });

  // Chord Area Mode buttons (Segment vs Sector)
  const btnSegment = document.getElementById('btn-mode-segment');
  const btnSector = document.getElementById('btn-mode-sector');
  if (btnSegment && btnSector) {
    btnSegment.addEventListener('click', () => store.set({ chordAreaMode: 'segment' }));
    btnSector.addEventListener('click', () => store.set({ chordAreaMode: 'sector' }));
  }

  document.getElementById('btn-export-png')?.addEventListener('click', () => view.exportPNG());
  document.getElementById('btn-export-svg')?.addEventListener('click', () => view.exportSVG());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cur = store.get().radius || 180;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const nextR = Math.min(260, Math.max(100, Math.round(cur * factor)));
    store.set({ radius: nextR });
  }, { passive: false });

  // Interactive Drag on any active Tangent Contact Point
  let dragTargetId = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = computeGeometry(store.get(), view.width, view.height);

    for (const t of g.tangents) {
      if (Math.hypot(x - t.pt.x, y - t.pt.y) < 26) {
        dragTargetId = t.id;
        break;
      }
    }
    if (!dragTargetId && isNearCircumference(x, y, g.cx, g.cy, g.r, 14)) {
      dragTargetId = 'radius';
    }

    if (dragTargetId) {
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

    if (!dragTargetId) {
      let hoverPt = false;
      for (const t of g.tangents) {
        if (Math.hypot(x - t.pt.x, y - t.pt.y) < 26) {
          hoverPt = true;
          break;
        }
      }
      const hoverCirc = !hoverPt && isNearCircumference(x, y, g.cx, g.cy, g.r, 14);
      canvas.style.cursor = hoverPt ? 'pointer' : (hoverCirc ? 'ew-resize' : 'default');
      return;
    }

    if (dragTargetId === 'radius') {
      canvas.style.cursor = 'ew-resize';
      const dist = Math.hypot(x - g.cx, y - g.cy);
      const nextR = Math.min(260, Math.max(100, Math.round(dist)));
      store.set({ radius: nextR });
      return;
    }

    canvas.style.cursor = 'grabbing';
    const ang = pointerToAngle(x - g.cx, g.cy - y);
    if (dragTargetId === 'T') {
      store.set({ angleT: ang });
    } else if (dragTargetId === 'T2') {
      store.set({ angleT2: ang });
    } else if (dragTargetId === 'T3') {
      store.set({ angleT3: ang });
    } else if (dragTargetId === 'T4') {
      store.set({ angleT4: ang });
    }
  });

  const stopDrag = (e) => {
    if (dragTargetId) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      dragTargetId = null;
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
    document.getElementById('tel-radius-len').textContent = UnitSystemConverter.formatLength(state.radius, lenUnit, state.radius);
    const elVtan2D = document.getElementById('tel-vtan');
    if (elVtan2D) elVtan2D.textContent = `(${(-Math.sin(state.angleT)).toFixed(2)}, ${(Math.cos(state.angleT)).toFixed(2)})`;
    document.getElementById('tel-angle').textContent = UnitSystemConverter.formatAngle(90, angUnit);
    document.getElementById('tel-dot').textContent = `${Math.abs(g.dotProduct).toFixed(4)}`;
    const telQuad = document.getElementById('tel-quadrant');
    if (telQuad && g.quadrant) telQuad.textContent = g.quadrant.label;
    const elTelRefTan = document.getElementById('tel-reflex-tangent');
    if (elTelRefTan) elTelRefTan.textContent = UnitSystemConverter.formatAngle(270, angUnit);
    const elTelPerigonTan = document.getElementById('tel-perigon-tangent');
    if (elTelPerigonTan) elTelPerigonTan.textContent = UnitSystemConverter.formatAngle(360, angUnit);

    const telChords = document.getElementById('tel-chords-container');
    if (telChords) {
      if (g.chords && g.chords.length > 0) {
        telChords.innerHTML = g.chords.map(c =>
          `<div class="stat-line"><span>${c.label}:</span><strong class="color-${c.colorName}">${UnitSystemConverter.formatArea(c.area, lenUnit, state.radius, 0)}</strong></div>`
        ).join('');
      } else {
        telChords.innerHTML = '';
      }
    }

    const rSlider = document.getElementById('slider-radius');
    if (rSlider && document.activeElement !== rSlider) rSlider.value = state.radius;
    document.getElementById('label-radius').textContent = UnitSystemConverter.formatLength(state.radius, lenUnit, state.radius);

    // 3D telemetry
    const R3D = ((state.radius || 180) / 180) * 10;
    const elR3D = document.getElementById('val-3d-r');
    if (elR3D) elR3D.textContent = lenUnit === 'px' ? R3D.toFixed(1) : UnitSystemConverter.formatLength(R3D, lenUnit, 10, 1);
    const tx = (R3D * Math.cos(state.angleT)).toFixed(2);
    const tz = (R3D * Math.sin(state.angleT)).toFixed(2);
    const elT = document.getElementById('val-3d-t');
    if (elT) elT.textContent = `${tx}, ${tz}`;
    const elVtan3D = document.getElementById('val-3d-vtan');
    if (elVtan3D) elVtan3D.textContent = `(${(-Math.sin(state.angleT)).toFixed(2)}, 0.00, ${(Math.cos(state.angleT)).toFixed(2)})`;
    const elAngle = document.getElementById('val-3d-angle');
    if (elAngle) elAngle.textContent = UnitSystemConverter.formatAngle(90, angUnit);
    const elDot = document.getElementById('val-3d-dot');
    if (elDot) elDot.textContent = Math.abs(g.dotProduct).toFixed(4);

    const val3dQuad = document.getElementById('val-3d-quadrant');
    if (val3dQuad && g.quadrant) {
      const qSign3D = ['(+X, +Z)', '(-X, +Z)', '(-X, -Z)', '(+X, -Z)'][g.quadrant.index];
      val3dQuad.textContent = `Quadrant ${g.quadrant.roman} ${qSign3D}`;
    }
    const el3dRefTan = document.getElementById('val-3d-reflex-tangent');
    if (el3dRefTan) el3dRefTan.textContent = UnitSystemConverter.formatAngle(270, angUnit);
    const el3dPerigonTan = document.getElementById('val-3d-perigon-tangent');
    if (el3dPerigonTan) el3dPerigonTan.textContent = UnitSystemConverter.formatAngle(360, angUnit);

    const val3dChords = document.getElementById('val-3d-chords-container');
    if (val3dChords) {
      if (g.chords && g.chords.length > 0) {
        val3dChords.innerHTML = g.chords.map(c => {
          const u2 = (c.area / (g.r * g.r)) * (R3D * R3D);
          return `<div class="stat-line"><span>3D ${c.label}:</span><strong class="color-${c.colorName}">${u2.toFixed(1)} u²</strong></div>`;
        }).join('');
      } else {
        val3dChords.innerHTML = '';
      }
    }

    // Sync button states
    const curCount = state.tangentCount ?? 1;
    countBtns.forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === curCount);
    });

    if (btnSegment && btnSector) {
      const isSec = state.chordAreaMode === 'sector';
      btnSegment.classList.toggle('active', !isSec);
      btnSector.classList.toggle('active', isSec);
    }

    if (toggleQuad) {
      toggleQuad.checked = (state.showQuadrant !== false);
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
