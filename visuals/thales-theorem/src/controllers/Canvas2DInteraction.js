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

  #distanceTo(event, pt) {
    const { x, y } = this.view.toLocal(event);
    return Math.hypot(x - pt.x, y - pt.y);
  }

  #distanceToCircumference(event) {
    const { x, y } = this.view.toLocal(event);
    const { cx, cy, r } = this.view.frame(this.store.get());
    return Math.abs(Math.hypot(x - cx, y - cy) - r);
  }

  #down(event) {
    const reach = event.pointerType === 'touch' ? LIMITS.pointHitRadius.touch : LIMITS.pointHitRadius.mouse;
    const state = this.store.get();
    const frame = this.view.frame(state);
    const { pan } = state;

    const distP = this.#distanceTo(event, frame.p);
    const distA = this.#distanceTo(event, frame.a);
    const distB = this.#distanceTo(event, frame.b);
    const distCirc = this.#distanceToCircumference(event);

    if (distP < reach || distCirc < 16) {
      this.mode = 'point';
      if (distP >= reach) {
        this.#updatePointPosition(event);
      }
    } else if (distA < reach || distB < reach) {
      this.mode = 'radius';
    } else {
      this.mode = 'pan';
    }

    if (this.store.get().playing) {
      this.store.set(setPlaying(false));
    }
    this.panOrigin = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    try {
      if (this.view.canvas.setPointerCapture) this.view.canvas.setPointerCapture(event.pointerId);
    } catch (_) {}
  }

  #updatePointPosition(event) {
    const state = this.store.get();
    const { x, y } = this.view.toLocal(event);
    const { cx, cy } = this.view.frame(state);
    const plane = state.plane2D ?? 'great-circle';
    const rot = plane === 'yz' ? 0 : (state.baselineRotation || 0);
    const rawAng = pointerToAngle(x - cx, cy - y);
    const ang = ((rawAng - rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const r = state.radius;

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
  }

  #move(event) {
    if (this.mode === 'point') {
      this.#updatePointPosition(event);
    } else if (this.mode === 'radius') {
      const state = this.store.get();
      const { x, y } = this.view.toLocal(event);
      const { cx, cy } = this.view.frame(state);
      const distFromCenter = Math.hypot(x - cx, y - cy);
      const newRadius = clamp(Math.round((distFromCenter / state.zoom) * 2) / 2, 5, 15);
      this.store.set(setRadius(newRadius));
    } else if (this.mode === 'pan') {
      this.store.set({ pan: { x: event.clientX - this.panOrigin.x, y: event.clientY - this.panOrigin.y } });
    } else if (event.pointerType === 'mouse') {
      const state = this.store.get();
      const frame = this.view.frame(state);
      const distP = this.#distanceTo(event, frame.p);
      const distA = this.#distanceTo(event, frame.a);
      const distB = this.#distanceTo(event, frame.b);
      const distCirc = this.#distanceToCircumference(event);

      const hoverP = distP < 25 || distCirc < 12;
      const hoverRadius = distA < 22 || distB < 22;

      if (hoverP) {
        this.view.canvas.style.cursor = 'pointer';
      } else if (hoverRadius) {
        this.view.canvas.style.cursor = 'ew-resize';
      } else {
        this.view.canvas.style.cursor = 'grab';
      }
      this.store.set({ hoverP2D: hoverP });
    }
  }

  #up(event) {
    this.mode = null;
    try {
      if (this.view.canvas.hasPointerCapture?.(event.pointerId)) this.view.canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  }
}
