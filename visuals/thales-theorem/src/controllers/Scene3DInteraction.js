import { setPlaying, setSpherePoint } from '../model/actions.js';
import { cartesianToSpherical } from '../model/thales-math.js';

/**
 * Drag point P across the sphere. Capture-phase listeners run before OrbitControls,
 * so grabbing P suppresses camera orbit for the duration of the drag.
 */
export class Scene3DInteraction {
  constructor(store, scene) {
    this.store = store;
    this.scene = scene;
    this.dragging = false;
    const element = scene.domElement;
    if (!element) return;

    element.addEventListener('pointerdown', (e) => this.#down(e), { capture: true });
    element.addEventListener('pointermove', (e) => this.#move(e), { capture: true });
    window.addEventListener('pointerup', () => this.#end());
    window.addEventListener('pointercancel', () => this.#end());
  }

  #down(event) {
    this.scene.pointerToRay(event);
    if (!this.scene.hitsPointP()) return;
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
    this.store.set({ hoverP3D: this.dragging || this.scene.hitsPointP() });
    if (!this.dragging) return;

    const hit = this.scene.pickSphere(this.store.get().baselineRotation || 0);
    if (hit) this.store.set(setSpherePoint(cartesianToSpherical(hit, this.store.get().radius), this.store.get()));
    event.stopPropagation();
  }

  #end(event) {
    if (!this.dragging) return;
    this.dragging = false;
    this.scene.setOrbitEnabled(true);
    this.store.set({ hoverP3D: false });
    if (event && this.scene.domElement?.hasPointerCapture?.(event.pointerId)) {
      try { this.scene.domElement.releasePointerCapture(event.pointerId); } catch {}
    }
  }
}
