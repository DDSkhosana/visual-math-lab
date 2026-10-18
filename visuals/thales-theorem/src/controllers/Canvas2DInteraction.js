import { LIMITS } from '../config/defaults.js';
import { setAngle2D, setBaselineRotation, setPlaying, setRadius, setSpherePoint } from '../model/actions.js';
import { cartesianToSpherical, clamp, pointerToAngle } from '../model/thales-math.js';
import { AffineTransform2D } from '../../../../js/circle-core.js';

/** Pointer Events on the 2D canvas: drag point P, pan the background, wheel-zoom, spin baseline A/B. */
export class Canvas2DInteraction {
  constructor(store, view) {
    this.store = store;
    this.view = view;
    this.mode = null; // 'point' | 'baselineA' | 'baselineB' | 'radius' | 'pan' | null
    const { canvas } = view;

    canvas.addEventListener('pointerdown', (e) => this.#down(e));
    canvas.addEventListener('pointermove', (e) => this.#move(e));
    canvas.addEventListener('pointerup', (e) => this.#up(e));
    canvas.addEventListener('pointercancel', (e) => this.#up(e));
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', (e) => this.#up(e));
      window.addEventListener('pointercancel', (e) => this.#up(e));
    }
    canvas.addEventListener('pointerleave', () => !this.mode && store.set({ hoverP2D: false, hoverA2D: false, hoverB2D: false }));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentRadius = this.store.get().radius;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const nextRadius = clamp(Math.round(currentRadius * factor * 2) / 2, 5, 15);
      this.store.set(setRadius(nextRadius));
    }, { passive: false });
    canvas.addEventListener('dblclick', () => store.set({ pan: { x: 0, y: 0 } }));
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

    if (distP < reach) {
      this.mode = 'point';
    } else if (distA < reach) {
      this.mode = 'baselineA';
    } else if (distB < reach) {
      this.mode = 'baselineB';
    } else if (distCirc < 14) {
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

    let curX = x;
    let curY = y;
    if (state.affineMode) {
      const transform = new AffineTransform2D(
        state.affineStretch ?? 1.0,
        1.0,
        state.affineAxisAngle ?? 0
      );
      const canonical = transform.inverseTransformPoint({ x, y }, { x: cx, y: cy });
      curX = canonical.x;
      curY = canonical.y;
    }

    const rawAng = pointerToAngle(curX - cx, cy - curY);
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
    } else if (this.mode === 'baselineA' || this.mode === 'baselineB') {
      const state = this.store.get();
      const { x, y } = this.view.toLocal(event);
      const { cx, cy } = this.view.frame(state);
      const rawAng = pointerToAngle(x - cx, cy - y);
      const TAU = Math.PI * 2;
      let rot = this.mode === 'baselineA' ? (rawAng + Math.PI) : rawAng;
      rot = ((rot % TAU) + TAU) % TAU;
      this.store.set(setBaselineRotation(rot));
    } else if (this.mode === 'radius') {
      const state = this.store.get();
      const frame = this.view.frame(state);
      const { x, y } = this.view.toLocal(event);
      const distFromCenter = Math.hypot(x - frame.cx, y - frame.cy);
      const zoom = frame.zoom || state.zoom || 18;
      const newRadius = clamp(Math.round((distFromCenter / zoom) * 2) / 2, 5, 15);
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

      const hoverP = distP < 25;
      const hoverBaseline = !hoverP && (distA < 22 || distB < 22);
      const hoverCirc = !hoverP && !hoverBaseline && distCirc < 14;

      if (hoverP || hoverBaseline) {
        this.view.canvas.style.cursor = 'pointer';
      } else if (hoverCirc) {
        this.view.canvas.style.cursor = 'ew-resize';
      } else {
        this.view.canvas.style.cursor = 'grab';
      }
      this.store.set({
        hoverP2D: hoverP,
        hoverA2D: hoverBaseline && distA < 22,
        hoverB2D: hoverBaseline && distB < 22,
      });
    }
  }

  #up(event) {
    this.mode = null;
    try {
      if (this.view.canvas.hasPointerCapture?.(event.pointerId)) this.view.canvas.releasePointerCapture(event.pointerId);
    } catch (_) {}
  }
}
