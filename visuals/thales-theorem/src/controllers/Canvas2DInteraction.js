import { LIMITS } from '../config/defaults.js';
import { setAngle2D, setPlaying, setRadius, setSpherePoint } from '../model/actions.js';
import { cartesianToSpherical, clamp, pointerToAngle } from '../model/thales-math.js';

/** Pointer Events on the 2D canvas: drag point P, pan the background, wheel-zoom. */
export class Canvas2DInteraction {
  constructor(store, view) {
    this.store = store;
    this.view = view;
    this.mode = null; // 'point' | 'pan' | null
    const { canvas } = view;

    canvas.addEventListener('pointerdown', (e) => this.#down(e));
    canvas.addEventListener('pointermove', (e) => this.#move(e));
    canvas.addEventListener('pointerup', (e) => this.#up(e));
    canvas.addEventListener('pointercancel', (e) => this.#up(e));
    canvas.addEventListener('pointerleave', () => !this.mode && store.set({ hoverP2D: false }));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentRadius = this.store.get().radius;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const nextRadius = clamp(Math.round(currentRadius * factor * 2) / 2, 5, 15);
      this.store.set(setRadius(nextRadius));
    }, { passive: false });
  }

  #distanceToP(event) {
    const { x, y } = this.view.toLocal(event);
    const { p } = this.view.frame(this.store.get());
    return Math.hypot(x - p.x, y - p.y);
  }

  #down(event) {
    const reach = event.pointerType === 'touch' ? LIMITS.pointHitRadius.touch : LIMITS.pointHitRadius.mouse;
    const { pan } = this.store.get();
    this.mode = this.#distanceToP(event) < reach ? 'point' : 'pan';
    if (this.store.get().playing) {
      this.store.set(setPlaying(false));
    }
    this.panOrigin = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    try {
      if (this.view.canvas.setPointerCapture) this.view.canvas.setPointerCapture(event.pointerId);
    } catch (_) {}
  }

  #move(event) {
    if (this.mode === 'point') {
      const state = this.store.get();
      const { x, y } = this.view.toLocal(event);
      const { cx, cy } = this.view.frame(state);
      const ang = pointerToAngle(x - cx, cy - y);
      const r = state.radius;
      const plane = state.plane2D ?? 'great-circle';

      if (plane === 'xy') {
        const x3 = r * Math.cos(ang), y3 = r * Math.sin(ang), z3 = 0;
        this.store.set(setSpherePoint(cartesianToSpherical({ x: x3, y: y3, z: z3 }, r), state));
      } else if (plane === 'xz') {
        const x3 = r * Math.cos(ang), z3 = r * Math.sin(ang), y3 = 0;
        this.store.set(setSpherePoint(cartesianToSpherical({ x: x3, y: 0, z: z3 }, r), state));
      } else if (plane === 'yz') {
        const z3 = r * Math.cos(ang), y3 = r * Math.sin(ang), x3 = 0;
        this.store.set(setSpherePoint(cartesianToSpherical({ x: 0, y: y3, z: z3 }, r), state));
      } else {
        this.store.set(setAngle2D(ang, state));
      }
    } else if (this.mode === 'pan') {
      this.store.set({ pan: { x: event.clientX - this.panOrigin.x, y: event.clientY - this.panOrigin.y } });
    } else if (event.pointerType === 'mouse') {
      const hover = this.#distanceToP(event) < 25;
      this.view.canvas.style.cursor = hover ? 'pointer' : 'grab';
      this.store.set({ hoverP2D: hover });
    }
  }

  #up(event) {
    this.mode = null;
    try {
      if (this.view.canvas.hasPointerCapture?.(event.pointerId)) this.view.canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  }
}
