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
    this.activePointers = new Map();
    const element = scene.domElement;
    if (!element) return;

    element.addEventListener('pointerdown', (e) => this.#down(e), { capture: true });
    element.addEventListener('pointermove', (e) => this.#move(e), { capture: true });
    window.addEventListener('pointerup', (e) => this.#end(e));
    window.addEventListener('pointercancel', (e) => this.#end(e));

    // 3D Mouse Wheel Resizing (synchronized with 2D Canvas and controls slider)
    element.addEventListener('wheel', (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return; // Shift/Ctrl/trackpad-pinch retains camera dolly zoom
      e.preventDefault();
      e.stopPropagation();
      const currentRadius = this.store.get().radius;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const nextRadius = clamp(Math.round(currentRadius * factor * 2) / 2, 5, 15);
      this.store.set(setRadius(nextRadius));
    }, { capture: true, passive: false });
  }

  #down(event) {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size >= 2) {
      if (this.dragging) {
        this.dragging = false;
        this.activeTarget = null;
        this.scene.setOrbitEnabled(true);
        if (this.scene.domElement) this.scene.domElement.style.cursor = '';
      }
      if (this.scene.controls?.pointers) {
        for (const [pid, pt] of this.activePointers.entries()) {
          this.scene.controls.pointers.set(pid, pt);
        }
      }
      return;
    }
    if (event.button && event.button !== 0) return;
    if (event.altKey || event.shiftKey) return;

    this.scene.pointerToRay(event);
    if (this.scene.hitsPointP()) {
      this.activeTarget = 'P';
    } else if (this.scene.hitsPointA()) {
      this.activeTarget = 'A';
    } else if (this.scene.hitsPointB()) {
      this.activeTarget = 'B';
    } else if (event.pointerType !== 'touch' && this.scene.hitsCircumference?.(this.store.get().radius, event)) {
      const st = this.store.get();
      if ((st.dimensionMode === 'solid' || st.dimensionMode === 'spatial') && !(event.ctrlKey || event.metaKey)) {
        // In Solid 3D and Spatial modes, allow omnidirectional tumbling of the 3D canvas via controls
        return;
      } else {
        this.activeTarget = 'radius';
      }
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
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (this.activePointers.size >= 2) {
      if (this.dragging) {
        this.dragging = false;
        this.activeTarget = null;
        this.scene.setOrbitEnabled(true);
      }
      return;
    }
    this.scene.pointerToRay(event);
    const hoverP = this.scene.hitsPointP();
    const hoverA = this.scene.hitsPointA();
    const hoverB = this.scene.hitsPointB();
    const hoverCirc = !hoverP && !hoverA && !hoverB && event.pointerType !== 'touch' && Boolean(this.scene.hitsCircumference?.(this.store.get().radius, event));
    this.store.set({
      hoverP3D: this.dragging ? (this.activeTarget === 'P') : hoverP,
      hoverA3D: this.dragging ? (this.activeTarget === 'A') : hoverA,
      hoverB3D: this.dragging ? (this.activeTarget === 'B') : hoverB,
    });

    if (!this.dragging) {
      if (this.scene.domElement) {
        const isOriented = this.store.get().dimensionMode === 'solid' || this.store.get().dimensionMode === 'spatial';
        const circCursor = (isOriented && !(event.ctrlKey || event.metaKey)) ? 'grab' : 'ew-resize';
        this.scene.domElement.style.cursor = (hoverP || hoverA || hoverB) ? 'pointer' : (hoverCirc ? circCursor : (event.altKey ? 'alias' : 'grab'));
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
    } else if (this.activeTarget === 'solidSpin') {
      const hit = this.scene.pickBaselinePlane?.();
      const u = this.scene.circleInfo?.u;
      const v = this.scene.circleInfo?.v;
      if (hit && u && v) {
        const curAngle = Math.atan2(hit.dot(v), hit.dot(u));
        const delta = curAngle - this.spinStartAngle;
        let nextSpin = (this.spinInitial + delta) % (Math.PI * 2);
        if (nextSpin < 0) nextSpin += Math.PI * 2;
        this.store.set({ solidSpin: nextSpin });
      }
      if (this.scene.domElement) this.scene.domElement.style.cursor = 'grabbing';
      event.stopPropagation();
      return;
    } else if (this.activeTarget === 'P') {
      const st = this.store.get();
      if ((st.dimensionMode === 'solid' || st.dimensionMode === 'spatial') && this.scene.circleInfo?.u && this.scene.circleInfo?.v) {
        const hit = this.scene.pickBaselinePlane?.();
        if (hit) {
          const u = this.scene.circleInfo.u;
          const v = this.scene.circleInfo.v;
          const rot = st.baselineRotation || 0;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          const uRot = new this.scene.THREE.Vector3().addScaledVector(u, cosR).addScaledVector(v, sinR);
          const vRot = new this.scene.THREE.Vector3().addScaledVector(u, -sinR).addScaledVector(v, cosR);
          const rawAngle = Math.atan2(hit.dot(vRot), hit.dot(uRot));
          const TAU = Math.PI * 2;
          const angle2D = ((rawAngle % TAU) + TAU) % TAU;
          this.store.set({ angle2D });
        }
      } else if (st.dimensionMode !== 'spatial') {
        const hit = this.scene.pickBaselinePlane?.() || this.scene.pickSphere(st.baselineRotation || 0);
        if (hit) {
          const rot = st.baselineRotation || 0;
          const rawAngle = Math.atan2(hit.y, hit.x) - rot;
          const TAU = Math.PI * 2;
          const angle2D = ((rawAngle % TAU) + TAU) % TAU;
          this.store.set({
            angle2D,
            lat3D: clamp(Math.acos(clamp(Math.sin(angle2D), -1, 1)), 0.05, Math.PI - 0.05),
            lon3D: Math.cos(angle2D) >= 0 ? Math.PI / 2 : -Math.PI / 2,
          });
        }
      } else {
        const hit = this.scene.pickSphere(st.baselineRotation || 0);
        if (hit) {
          const sph = cartesianToSpherical(hit, st.radius);
          this.store.set(setSpherePoint(sph, st));
        }
      }
    } else if (this.activeTarget === 'A' || this.activeTarget === 'B') {
      const hit = this.scene.pickBaselinePlane?.() || this.scene.pickSphere(0);
      if (hit) {
        const st = this.store.get();
        let ang;
        if ((st.dimensionMode === 'solid' || st.dimensionMode === 'spatial') && this.scene.circleInfo?.u && this.scene.circleInfo?.v) {
          const u = this.scene.circleInfo.u;
          const v = this.scene.circleInfo.v;
          ang = Math.atan2(hit.dot(v), hit.dot(u));
        } else {
          ang = Math.atan2(hit.y, hit.x);
        }
        if (this.activeTarget === 'A') ang += Math.PI;
        const TAU = Math.PI * 2;
        const baselineRotation = ((ang % TAU) + TAU) % TAU;
        this.store.set({ baselineRotation });
      }
    }
    event.stopPropagation();
  }

  #end(event) {
    if (event && event.pointerId !== undefined) {
      this.activePointers.delete(event.pointerId);
    }
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
