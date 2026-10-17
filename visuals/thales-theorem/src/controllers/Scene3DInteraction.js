import { setPlaying, setSpherePoint, setRadius } from '../model/actions.js';
import { cartesianToSpherical, clamp } from '../model/thales-math.js';

/**
 * Drag point P across the sphere. Capture-phase listeners run before OrbitControls,
 * so grabbing P suppresses camera orbit for the duration of the drag.
 */
export class Scene3DInteraction {
  constructor(store, scene) {
    this.store = store;
    this.scene = scene;
    this.dragging = false;
    this.activeTarget = null;
    const element = scene.domElement;
    if (!element) return;

    element.addEventListener('pointerdown', (e) => this.#down(e), { capture: true });
    element.addEventListener('pointermove', (e) => this.#move(e), { capture: true });
    window.addEventListener('pointerup', (e) => this.#end(e));
    window.addEventListener('pointercancel', (e) => this.#end(e));

    // 3D Mouse Wheel Resizing (synchronized with 2D Canvas and controls slider)
    element.addEventListener('wheel', (e) => {
      if (e.shiftKey) return; // Shift + wheel retains camera dolly zoom
      e.preventDefault();
      e.stopPropagation();
      const currentRadius = this.store.get().radius;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const nextRadius = clamp(Math.round(currentRadius * factor * 2) / 2, 5, 15);
      this.store.set(setRadius(nextRadius));
    }, { capture: true, passive: false });
  }

  #down(event) {
    this.scene.pointerToRay(event);
    if (this.scene.hitsPointP()) {
      this.activeTarget = 'P';
    } else if (this.scene.hitsPointA()) {
      this.activeTarget = 'A';
    } else if (this.scene.hitsPointB()) {
      this.activeTarget = 'B';
    } else if (this.scene.hitsCircumference?.(this.store.get().radius)) {
      this.activeTarget = 'radius';
    } else {
      return;
    }
    this.dragging = true;
    if (this.store.get().playing) {
      this.store.set(setPlaying(false));
    }
    this.pointerId = event.pointerId;
    this.scene.setOrbitEnabled(false);
    if (this.scene.domElement?.setPointerCapture) {
      try { this.scene.domElement.setPointerCapture(event.pointerId); } catch {}
    }
    event.stopPropagation();
  }

  #move(event) {
    this.scene.pointerToRay(event);
    const hoverP = this.scene.hitsPointP();
    const hoverA = this.scene.hitsPointA();
    const hoverB = this.scene.hitsPointB();
    const hoverCirc = !hoverP && !hoverA && !hoverB && Boolean(this.scene.hitsCircumference?.(this.store.get().radius));
    this.store.set({
      hoverP3D: this.dragging ? (this.activeTarget === 'P') : hoverP,
      hoverA3D: this.dragging ? (this.activeTarget === 'A') : hoverA,
      hoverB3D: this.dragging ? (this.activeTarget === 'B') : hoverB,
    });

    if (!this.dragging) {
      if (this.scene.domElement) {
        this.scene.domElement.style.cursor = (hoverP || hoverA || hoverB) ? 'pointer' : (hoverCirc ? 'ew-resize' : '');
      }
      return;
    }

    if (this.scene.domElement) {
      this.scene.domElement.style.cursor = this.activeTarget === 'radius' ? 'ew-resize' : 'grabbing';
    }

    if (this.activeTarget === 'radius') {
      const newRadius = this.scene.pickCircumferenceRadius?.(5, 15);
      if (newRadius) {
        this.store.set(setRadius(newRadius));
      }
    } else if (this.activeTarget === 'P') {
      const hit = this.scene.pickSphere(this.store.get().baselineRotation || 0);
      if (hit) this.store.set(setSpherePoint(cartesianToSpherical(hit, this.store.get().radius), this.store.get()));
    } else if (this.activeTarget === 'A' || this.activeTarget === 'B') {
      const hit = this.scene.pickSphere(0);
      if (hit) {
        let ang = Math.atan2(hit.y, hit.x);
        if (this.activeTarget === 'A') ang += Math.PI;
        const TAU = Math.PI * 2;
        const baselineRotation = ((ang % TAU) + TAU) % TAU;
        this.store.set({ baselineRotation });
      }
    }
    event.stopPropagation();
  }

  #end(event) {
    if (!this.dragging) return;
    this.dragging = false;
    this.activeTarget = null;
    this.scene.setOrbitEnabled(true);
    if (this.scene.domElement) {
      this.scene.domElement.style.cursor = '';
    }
    this.store.set({ hoverP3D: false, hoverA3D: false, hoverB3D: false });
    if (event && this.scene.domElement?.hasPointerCapture?.(event.pointerId)) {
      try { this.scene.domElement.releasePointerCapture(event.pointerId); } catch {}
    }
  }
}
