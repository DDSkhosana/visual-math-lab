import { createInitialState } from './config/defaults.js';
import { createStore } from './model/store.js';
import { setViewMode, setPlane2D } from './model/actions.js';
import { loadThree } from './platform/three.js';
import { Canvas2DView } from './views/Canvas2DView.js';
import { Scene3DView } from './views/Scene3DView.js';
import { NullScene3DView } from './views/NullScene3DView.js';
import { LabelOverlayView } from './views/LabelOverlayView.js';
import { StatsView } from './views/StatsView.js';
import { DerivationView } from './views/DerivationView.js';
import { ControlsController } from './controllers/ControlsController.js';
import { ViewModeController } from './controllers/ViewModeController.js';
import { PlaybackController } from './controllers/PlaybackController.js';
import { Canvas2DInteraction } from './controllers/Canvas2DInteraction.js';
import { Scene3DInteraction } from './controllers/Scene3DInteraction.js';
import { Accordion } from './ui/Accordion.js';
import { Panel } from './ui/Panel.js';
import { TelemetryPanel } from './ui/TelemetryPanel.js';
import { DraggableToolbar } from './ui/DraggableToolbar.js';
import { TooltipController } from './ui/TooltipController.js';
import { bindFullscreen } from './ui/fullscreen.js';
import { UnitSystemConverter } from '../../../js/circle-core.js';

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
};

function createScene3D(container) {
  try {
    return new Scene3DView(loadThree(), container);
  } catch (error) {
    console.warn('3D view unavailable; continuing with the 2D view only.', error);
    return new NullScene3DView();
  }
}

/** Composition root: builds the object graph and connects views to the store. */
function bootstrap() {
  const explorer = document.querySelector('.thales-explorer');
  const store = createStore(createInitialState());

  const view2d = new Canvas2DView(byId('canvas2d'), byId('canvas-2d-container'));
  const scene3d = createScene3D(byId('canvas-3d-container'));
  const labels = new LabelOverlayView(byId('labels-3d-container'), (point) => scene3d.project(point));
  const derivations = new DerivationView(byId('live-math-2d'), byId('live-math-3d'));
  const stats = new StatsView(document);
  const controls = new ControlsController(store, document);
  const viewMode = new ViewModeController(store, {
    mainView: byId('main-view'),
    container2d: byId('canvas-2d-container'),
    container3d: byId('canvas-3d-container'),
    toolbar2d: byId('toolbar-2d-panel'),
    toolbar3d: byId('toolbar-3d-panel'),
    buttons: { split: byId('btn-split'), '2d': byId('btn-2d'), '3d': byId('btn-3d') },
    flipButton: byId('split-dir-btn'),
    resizer: byId('viewport-resizer'),
  });

  new Canvas2DInteraction(store, view2d);
  new Scene3DInteraction(store, scene3d);
  new PlaybackController(store, byId('btn-playback'));

  const exportPngBtn = document.getElementById('btn-export-png');
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => view2d.exportPNG());
  }
  const exportSvgBtn = document.getElementById('btn-export-svg');
  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', () => view2d.exportSVG());
  }
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      store.reset();
      store.set({
        playing: false,
        viewMode: 'split',
        splitDirection: 'horizontal',
        splitRatio: 50,
        plane2D: 'great-circle',
      });
      syncCameraAndPlanes('great-circle');
    });
  }

  const unitContainer = document.getElementById('content-unit-converter');
  if (unitContainer) {
    new UnitSystemConverter(unitContainer, store);
  }

  const planeToPreset = {
    'great-circle': 'isometric',
    'xy': 'front',
    'xz': 'top',
    'yz': 'side',
  };
  const presetToPlane = {
    'isometric': 'great-circle',
    'default': 'great-circle',
    'iso': 'great-circle',
    'front': 'xy',
    'top': 'xz',
    'side': 'yz',
  };

  const syncCameraAndPlanes = (plane) => {
    const targetPreset = planeToPreset[plane] || 'isometric';
    scene3d.setCameraPreset(targetPreset);

    const cameraButtons = document.querySelectorAll('#toolbar-3d-panel [data-preset], .camera-presets-bar [data-preset]');
    cameraButtons.forEach((b) => {
      const bp = b.getAttribute('data-preset');
      b.classList.toggle('active', bp === targetPreset || (targetPreset === 'isometric' && bp === 'default'));
    });

    const planeButtons = document.querySelectorAll('[data-plane]');
    planeButtons.forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-plane') === plane);
    });

    const container2d = document.getElementById('canvas-2d-container');
    if (container2d) {
      const pKey = targetPreset === 'isometric' ? 'iso' : targetPreset;
      container2d.classList.remove('perspective-top', 'perspective-front', 'perspective-side', 'perspective-iso');
      container2d.classList.add(`perspective-${pKey}`);

      const title2d = container2d.querySelector('.view-title');
      if (title2d) {
        if (!title2d.dataset.origTitle) {
          title2d.dataset.origTitle = title2d.innerHTML;
        }
        const perspectiveLabels = {
          top: ' <span class="color-yellow font-bold">[Top View: XZ Plan]</span>',
          front: ' <span class="color-lime font-bold">[Front View: XY Elevation]</span>',
          side: ' <span class="color-steel font-bold">[Side View: YZ Profile]</span>',
          iso: ' <span class="color-sky font-bold">[Isometric Perspective]</span>',
        };
        title2d.innerHTML = `${title2d.dataset.origTitle}${perspectiveLabels[pKey] || ''}`;
      }
    }
  };

  syncCameraAndPlanes(store.get().plane2D || 'great-circle');

  const cameraPresetButtons = document.querySelectorAll('#toolbar-3d-panel [data-preset], .camera-presets-bar [data-preset]');
  cameraPresetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      const targetPlane = presetToPlane[preset] || 'great-circle';
      store.set(setPlane2D(targetPlane));
    });
  });

  store.subscribe((state) => {
    const curPlane = state.plane2D ?? 'great-circle';
    syncCameraAndPlanes(curPlane);
  }, ['plane2D']);

  const accordion = new Accordion(explorer);
  new Panel(byId('ui-panel-container'), {
    header: byId('panel-header'), resizeHandle: byId('panel-resize-handle'), resizeFrom: 'right',
    minimizeButton: byId('toggle-thales-minimize'), expandButton: byId('toggle-thales-btn'), accordion,
  });
  new Panel(byId('live-derivation-panel'), {
    header: byId('derivation-header'), resizeHandle: byId('derivation-resize-handle'), resizeFrom: 'left',
    minimizeButton: byId('toggle-deriv-minimize'), expandButton: byId('toggle-deriv-btn'), accordion,
  });
  new Panel(byId('toolbar-2d-panel'), {
    header: byId('toolbar-2d-header'), resizeHandle: byId('toolbar-2d-resize-handle'), resizeFrom: 'right',
    minimizeButton: byId('toggle-toolbar-2d-minimize'), expandButton: byId('toggle-toolbar-2d-btn'), accordion,
  });
  new Panel(byId('toolbar-3d-panel'), {
    header: byId('toolbar-header'), resizeHandle: byId('toolbar-resize-handle'), resizeFrom: 'left',
    minimizeButton: byId('toggle-toolbar-minimize'), expandButton: byId('toggle-toolbar-btn'), accordion,
  });
  new TelemetryPanel(byId('stats-2d'), {
    header: byId('stats-2d-header'), toggleButton: byId('toggle-stats-2d'), body: byId('stats-2d-body'),
  });
  new TelemetryPanel(byId('stats-3d'), {
    header: byId('stats-3d-header'), toggleButton: byId('toggle-stats-3d'), body: byId('stats-3d-body'),
  });
  new DraggableToolbar(byId('viewport-toolbar'), byId('toolbar-drag-handle'));
  new TooltipController(explorer, byId('toggle-tooltips-btn'));
  bindFullscreen(byId('fullscreen-btn'), explorer);

  const connect = (component, keys = component.constructor.stateKeys ?? null) => {
    store.subscribe((state) => component.render(state), keys);
    component.render(store.get());
  };
  [view2d, scene3d, stats, derivations, viewMode].forEach((component) => connect(component));
  connect(controls);

  if (scene3d instanceof NullScene3DView) store.set(setViewMode('2d'));

  const frame = () => {
    requestAnimationFrame(frame);
    scene3d.renderFrame();
    labels.render(store.get());
  };
  frame();
}

bootstrap();
