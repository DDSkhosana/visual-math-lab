import { rotateBaseline90, setBaselineRotation, setFlag, setPlane2D } from '../model/actions.js';
import { SLIDERS, TOGGLES } from './controls-config.js';

/** Two-way binding between form controls and the store, driven by controls-config.js. */
export class ControlsController {
  constructor(store, root = document) {
    this.store = store;
    this.sliders = SLIDERS.map((config) => ({
      ...config,
      input: root.getElementById(config.input),
      label: root.getElementById(config.label),
    })).filter((s) => s.input && s.label);
    this.toggles = Object.entries(TOGGLES)
      .map(([id, path]) => ({ path, input: root.getElementById(id) }))
      .filter((t) => t.input);

    for (const slider of this.sliders) {
      slider.input.addEventListener('input', () => {
        if (this.store.get().playing) {
          this.store.set({ playing: false });
        }
        store.set(slider.toPatch(slider.input.value, store.get()));
      });
    }
    for (const toggle of this.toggles) {
      toggle.input.addEventListener('change', () => {
        let patch = setFlag(store.get(), toggle.path, toggle.input.checked);
        if (toggle.path[0] === 'vis2d' && (toggle.path[1] === 'points' || toggle.path[1] === 'labels')) {
          patch = setFlag(patch, ['vis2d', 'points'], toggle.input.checked);
          patch = setFlag(patch, ['vis2d', 'labels'], toggle.input.checked);
        }
        store.set(patch);
      });
    }

    this.planeButtons = ['great-circle', 'xy', 'xz', 'yz'].map((plane) => {
      const btn = root.querySelector(`[data-plane="${plane}"]`);
      if (btn) {
        btn.addEventListener('click', () => store.set(setPlane2D(plane)));
      }
      return { plane, btn };
    }).filter((item) => item.btn);

    this.baselineButtons = [
      { rot: 0, btn: root.getElementById('btn-baseline-horiz') },
      { rot: Math.PI / 2, btn: root.getElementById('btn-baseline-vert') },
    ].filter((item) => item.btn);

    for (const { rot, btn } of this.baselineButtons) {
      btn.addEventListener('click', () => store.set(setBaselineRotation(rot)));
    }

    const flipBtn = root.getElementById('btn-flip-baseline');
    if (flipBtn) {
      flipBtn.addEventListener('click', () => store.set(rotateBaseline90(store.get())));
    }
  }

  render(state) {
    for (const { input, label, fromState, format } of this.sliders) {
      const value = fromState(state);
      input.value = value;
      label.textContent = format(value);
    }
    for (const { input, path } of this.toggles) {
      if (input) {
        input.checked = path.reduce((node, key) => node[key], state);
      }
    }
    const currentPlane = state.plane2D ?? 'great-circle';
    for (const { plane, btn } of this.planeButtons) {
      btn.classList.toggle('active', plane === currentPlane);
    }
    const isVert = Math.abs(Math.sin(state.baselineRotation || 0)) > 0.5;
    for (const { rot, btn } of this.baselineButtons) {
      const active = (rot === 0 && !isVert) || (rot !== 0 && isVert);
      btn.classList.toggle('active', active);
    }
  }
}
