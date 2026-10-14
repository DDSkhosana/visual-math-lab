import { setFlag, setPlane2D } from '../model/actions.js';
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
      toggle.input.addEventListener('change', () => store.set(setFlag(store.get(), toggle.path, toggle.input.checked)));
    }

    this.planeButtons = ['great-circle', 'xy', 'xz', 'yz'].map((plane) => {
      const btn = root.querySelector(`[data-plane="${plane}"]`);
      if (btn) {
        btn.addEventListener('click', () => store.set(setPlane2D(plane)));
      }
      return { plane, btn };
    }).filter((item) => item.btn);
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
  }
}
