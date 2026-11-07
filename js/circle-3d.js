import {
  PALETTE,
  clamp,
  clampCyclicAngle,
  clampAngleInArc,
  clampAngleToArc,
  clampMinAngleDistance,
  getSubtendedArcRange3D,
  getMinorArcRange3D,
  isLabelVisible,
  computeSagitta,
  computeCurvatureRatio,
  projectStereographicToEquator,
  projectEquatorToSphere,
  interpolateCurvatureHomotopy,
  interpolateGeodesicChord,
} from './circle-core.js';
import { SolidMorph, IdleParallax, addSolidLighting, isSolidMode } from './solid-morph.js';

export function loadThree() {
  const THREE = window.THREE;
  if (!THREE || !THREE.OrbitControls) {
    throw new Error('Three.js / OrbitControls is not available');
  }
  return THREE;
}

export class NullScene3DView {
  available = false;
  domElement = null;
  render() {}
  resize() {}
  setCameraPreset() {}
  enableInteraction() {}
  setARMode() {}
  dispose() {}
}

/**
 * Controller for Split / 2D / 3D layout, flip split, and resizer bar.
 */
export class ViewModeController {
  constructor(store, { mainView, container2d, container3d, toolbar2d, toolbar3d, buttons, flipButton, resizer, onResize }) {
    this.store = store;
    this.mainView = mainView;
    this.container2d = container2d;
    this.container3d = container3d;
    this.toolbar2d = toolbar2d;
    this.toolbar3d = toolbar3d;
    this.buttons = buttons;
    this.flipButton = flipButton;
    this.resizer = resizer;
    this.onResize = onResize;

    for (const [mode, button] of Object.entries(buttons)) {
      button?.addEventListener('click', () => {
        store.set({ viewMode: mode });
      });
    }

    flipButton?.addEventListener('click', () => {
      const cur = store.get().splitDirection || 'horizontal';
      store.set({
        splitDirection: cur === 'horizontal' ? 'vertical' : 'horizontal',
        splitRatio: 50,
      });
    });

    if (resizer) {
      this.#enableDividerDrag(resizer);
    }

    this.compactMedia = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 48rem)') : null;
    if (this.compactMedia?.addEventListener) {
      this.compactMedia.addEventListener('change', () => {
        this.render(this.store.get());
        this.onResize?.();
      });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', () => {
        this.render(this.store.get());
        this.onResize?.();
      });
    }

    if (typeof ResizeObserver !== 'undefined' && this.mainView) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize?.();
      });
      try {
        this.resizeObserver.observe(this.mainView);
      } catch (_) {}
    }

    store.subscribe((state) => this.render(state), ['viewMode', 'splitDirection', 'splitRatio']);
    this.render(store.get());
  }

  isCompact() {
    if (this.compactMedia?.matches) return true;
    const rect = this.mainView?.getBoundingClientRect?.();
    if (rect && typeof rect.width === 'number' && rect.width > 0) {
      return rect.width <= 768;
    }
    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
      return window.innerWidth <= 768;
    }
    return false;
  }

  render(state) {
    const viewMode = state.viewMode || 'split';
    const isCompact = this.isCompact();
    const effectiveSplitDirection = isCompact ? 'vertical' : (state.splitDirection || 'horizontal');
    const splitRatio = state.splitRatio ?? 50;

    const horizontal = effectiveSplitDirection === 'horizontal';
    this.mainView.className = `view-container layout-${viewMode} ${horizontal ? 'horizontal' : 'vertical'}-split`;

    if (this.mainView?.dataset) {
      this.mainView.dataset.viewport = isCompact ? 'compact' : 'regular';
    }

    for (const [mode, button] of Object.entries(this.buttons)) {
      if (!button) continue;
      const isActive = mode === viewMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }

    if (this.flipButton) {
      const isSplit = viewMode === 'split';
      this.flipButton.style.display = isSplit && !isCompact ? '' : 'none';
      this.flipButton.hidden = !isSplit || isCompact;
      this.flipButton.setAttribute(
        'title',
        horizontal ? 'Switch to vertical split (stacked)' : 'Switch to horizontal split (side-by-side)'
      );
    }

    const isSplit = viewMode === 'split';
    this.container2d.style.flexBasis = isSplit ? `${splitRatio}%` : '';
    this.container3d.style.flexBasis = isSplit ? `${100 - splitRatio}%` : '';

    if (this.toolbar2d) this.toolbar2d.style.display = viewMode === '3d' ? 'none' : '';
    if (this.toolbar3d) this.toolbar3d.style.display = viewMode === '2d' ? 'none' : '';

    if (this.resizer) {
      this.resizer.setAttribute?.('aria-orientation', horizontal ? 'vertical' : 'horizontal');
      this.resizer.setAttribute?.('aria-valuenow', String(Math.round(splitRatio)));
    }

    this.onResize?.();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.onResize?.());
    }
  }

  #enableDividerDrag(resizer) {
    if (!resizer) return;

    resizer.setAttribute?.('role', 'separator');
    resizer.setAttribute?.('tabindex', '0');
    resizer.setAttribute?.('aria-label', 'Viewport split divider');
    resizer.setAttribute?.('title', 'Drag to resize viewports (Double-click or press Home to reset to 50/50)');
    resizer.setAttribute?.('aria-valuemin', '10');
    resizer.setAttribute?.('aria-valuemax', '90');

    resizer.addEventListener?.('dblclick', () => {
      this.store.set({ splitRatio: 50 });
      this.onResize?.();
    });

    resizer.addEventListener?.('keydown', (e) => {
      const curRatio = this.store.get().splitRatio ?? 50;
      let nextRatio = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextRatio = clamp(curRatio - 5, 10, 90);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextRatio = clamp(curRatio + 5, 10, 90);
      } else if (e.key === 'Home') {
        nextRatio = 50;
      }
      if (nextRatio !== null) {
        e.preventDefault?.();
        this.store.set({ splitRatio: nextRatio });
        this.onResize?.();
      }
    });

    resizer.addEventListener('pointerdown', (event) => {
      event.preventDefault?.();
      try {
        if (resizer.setPointerCapture) resizer.setPointerCapture(event.pointerId);
      } catch (_) {}
      resizer.classList.add('active');

      const move = (e) => {
        const rect = this.mainView.getBoundingClientRect();
        const isRow = !this.mainView.classList.contains('vertical-split');
        const ratio = isRow
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
        this.store.set({ splitRatio: clamp(ratio, 10, 90) });
        this.onResize?.();
      };

      const end = () => {
        try {
          if (resizer.hasPointerCapture?.(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
        } catch (_) {}
        resizer.classList.remove('active');
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', end);
        resizer.removeEventListener('pointercancel', end);
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          window.removeEventListener('pointercancel', end);
        }
      };

      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', end);
      resizer.addEventListener('pointercancel', end);
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
      }
    });
  }
}

/**
 * Unconstrained 6-DOF Arcball / Virtual Trackball & Polar Turntable Controller.
 * Eliminates gimbal-lock singularities, pole-boundary jamming, and rigid turntable constraints.
 * Supports:
 * - 'trackball' mode (default): true 360° unconstrained tumble, full loop-around/inversion, no pole limits.
 * - 'orbit' mode: polar turntable with pole-jamming prevention.
 * - Screen-space panning (right-click / Shift+drag).
 * - Smooth exponential dolly zoom (scroll wheel / two-finger pinch).
 * - Butter-smooth inertial damping on pointer release.
 */
export class ArcballTrackballControls {
  constructor(THREE, camera, domElement) {
    this.THREE = THREE;
    this.camera = camera;
    this.object = camera; // OrbitControls compatibility
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);

    this.enabled = true;
    this.mode = 'arcball'; // 'arcball' (unconstrained 360° 6-DOF) | 'orbit' (turntable)
    this.enableDamping = true;
    this.dampingFactor = 0.035;
    this.screenSpacePanning = true;

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.8;
    this.minDistance = 2;
    this.maxDistance = 500;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    this.state = 'none'; // 'none' | 'rotate' | 'pan' | 'pinch' | 'spin'
    this.pointers = new Map();
    this.prevPointer = { x: 0, y: 0 };
    this.prevSpherePoint = new THREE.Vector3();
    this.angularVelocity = { axis: new THREE.Vector3(0, 1, 0), angle: 0 };
    this.rollVelocity = 0;
    this.lastMoveTime = 0;
    this.panStart = new THREE.Vector2();
    this.touchPinchDist = 0;
    this.touchTwistAngle = 0;
    this.touchMidpoint = { x: 0, y: 0 };

    if (!domElement) return;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerCancel = this.onPointerCancel.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onDblClick = this.onDblClick.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('pointercancel', this._onPointerCancel);
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointercancel', this._onPointerCancel);
    }
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('dblclick', this._onDblClick);
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  get isArcball() {
    return this.mode === 'arcball' || this.mode === 'trackball';
  }

  setMode(mode) {
    if (mode === 'arcball' || mode === 'trackball' || mode === 'orbit') {
      this.mode = mode === 'orbit' ? 'orbit' : 'arcball';
      this.angularVelocity.angle = 0;
      this.rollVelocity = 0;
      if (this.mode === 'orbit') {
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(this.target);
      }
    }
  }

  projectOnVirtualSphere(x, y, width, height) {
    const radius = Math.max(10, 0.85 * Math.min(width, height) / 2);
    const cx = width / 2;
    const cy = height / 2;
    const u = (x - cx) / radius;
    const v = -(y - cy) / radius;
    const dSq = u * u + v * v;

    // Holroyd's C1-continuous spherical-hyperbolic sheet projection:
    // Smoothly transitions at d^2 = 0.5 so omni-directional 3D rotation works
    // across the entire viewport without rim creases or axis lock.
    let z;
    if (dSq <= 0.5) {
      z = Math.sqrt(1.0 - dSq);
    } else {
      z = 0.5 / Math.sqrt(Math.max(1e-8, dSq));
    }
    return new this.THREE.Vector3(u, v, z).normalize();
  }

  rotateCameraByAxisAngle(axis, angle) {
    if (!axis || Math.abs(angle) < 1e-8) return;
    const q = new this.THREE.Quaternion().setFromAxisAngle(axis, angle);
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    offset.applyQuaternion(q);
    this.camera.position.addVectors(this.target, offset);
    this.camera.up.applyQuaternion(q).normalize();
    this.camera.lookAt(this.target);
  }

  spinCameraRoll(deltaRollAngle) {
    if (Math.abs(deltaRollAngle) < 1e-7) return;
    const forward = new this.THREE.Vector3().subVectors(this.target, this.camera.position);
    if (forward.lengthSq() < 1e-8) return;
    forward.normalize();
    const q = new this.THREE.Quaternion().setFromAxisAngle(forward, deltaRollAngle);
    this.camera.up.applyQuaternion(q).normalize();
    this.camera.lookAt(this.target);
  }

  orbitRotate(deltaX, deltaY, width, height) {
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    const radius = offset.length();
    if (radius < 1e-4) return;

    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const deltaTheta = -2 * Math.PI * (deltaX / w) * this.rotateSpeed;
    const deltaPhi = -2 * Math.PI * (deltaY / h) * this.rotateSpeed;

    // Omni-directional 360° turntable + vertical elevation freedom without pole lock:
    const upSign = this.camera.up.y >= 0 ? 1 : -1;
    const worldY = new this.THREE.Vector3(0, 1, 0);
    const qYaw = new this.THREE.Quaternion().setFromAxisAngle(worldY, deltaTheta * upSign);
    offset.applyQuaternion(qYaw);
    this.camera.up.applyQuaternion(qYaw);

    const camRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
    const qPitch = new this.THREE.Quaternion().setFromAxisAngle(camRight, deltaPhi);
    offset.applyQuaternion(qPitch);
    this.camera.up.applyQuaternion(qPitch).normalize();

    this.camera.position.addVectors(this.target, offset);
    this.camera.lookAt(this.target);

    // Record angular velocity for inertial spin in orbit mode too
    const combinedAxis = new this.THREE.Vector3()
      .addScaledVector(worldY, deltaTheta * upSign)
      .addScaledVector(camRight, deltaPhi);
    const combinedAngle = combinedAxis.length();
    if (combinedAngle > 1e-6) {
      this.angularVelocity.axis.copy(combinedAxis.normalize());
      this.angularVelocity.angle = 0.65 * combinedAngle + 0.35 * this.angularVelocity.angle;
      this.lastMoveTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }

  dolly(factor) {
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    const curLen = offset.length();
    const newLen = Math.max(this.minDistance, Math.min(this.maxDistance, curLen * factor));
    offset.setLength(newLen);
    this.camera.position.addVectors(this.target, offset);
    this.camera.lookAt(this.target);
  }

  pan(deltaX, deltaY, width, height) {
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    const dist = offset.length();
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const targetHeight = 2 * dist * Math.tan(fovRad / 2);
    const targetWidth = targetHeight * (this.camera.aspect || 1);

    const camRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camUp = new this.THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const panX = -(deltaX / w) * targetWidth * this.panSpeed;
    const panY = (deltaY / h) * targetHeight * this.panSpeed;

    const panVec = new this.THREE.Vector3()
      .addScaledVector(camRight, panX)
      .addScaledVector(camUp, panY);

    this.target.add(panVec);
    this.camera.position.add(panVec);
  }

  onDblClick() {
    if (!this.enabled) return;
    // Double-clicking the 3D viewport re-centers the camera target to origin and stops spin
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    this.target.set(0, 0, 0);
    this.camera.position.copy(offset);
    this.camera.lookAt(this.target);
    this.angularVelocity.angle = 0;
    this.rollVelocity = 0;
  }

  onPointerDown(event) {
    if (!this.enabled) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.angularVelocity.angle = 0;
      this.rollVelocity = 0;
      const rect = this.domElement.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      if (event.button === 1 || event.button === 2 || event.shiftKey) {
        this.state = 'pan';
        this.panStart.set(event.clientX, event.clientY);
      } else if (event.altKey) {
        this.state = 'spin';
        this.prevPointer = { x: localX, y: localY };
      } else if (event.button === 0 || event.pointerType === 'touch' || event.pointerType === 'pen') {
        this.state = 'rotate';
        this.prevPointer = { x: localX, y: localY };
        this.prevSpherePoint = this.projectOnVirtualSphere(localX, localY, rect.width, rect.height);
      }
      try { this.domElement.setPointerCapture(event.pointerId); } catch (_) {}
    } else if (this.pointers.size >= 2) {
      this.state = 'pinch';
      this.angularVelocity.angle = 0;
      this.rollVelocity = 0;
      const pts = Array.from(this.pointers.values());
      this.touchPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.touchTwistAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      this.touchMidpoint = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      try { this.domElement.setPointerCapture(event.pointerId); } catch (_) {}
    }
  }

  onPointerMove(event) {
    if (!this.enabled || this.state === 'none') return;
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const rect = this.domElement.getBoundingClientRect();
    const curX = event.clientX - rect.left;
    const curY = event.clientY - rect.top;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.state === 'spin' && this.pointers.size === 1) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const prevAng = Math.atan2(this.prevPointer.y - cy, this.prevPointer.x - cx);
      const curAng = Math.atan2(curY - cy, curX - cx);
      let deltaRoll = curAng - prevAng;
      if (deltaRoll > Math.PI) deltaRoll -= Math.PI * 2;
      if (deltaRoll < -Math.PI) deltaRoll += Math.PI * 2;
      this.spinCameraRoll(-deltaRoll * this.rotateSpeed);
      this.rollVelocity = 0.65 * (-deltaRoll * this.rotateSpeed) + 0.35 * this.rollVelocity;
      this.lastMoveTime = now;
      this.prevPointer = { x: curX, y: curY };
    } else if (this.state === 'rotate' && this.pointers.size === 1) {
      if (event.altKey) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const prevAng = Math.atan2(this.prevPointer.y - cy, this.prevPointer.x - cx);
        const curAng = Math.atan2(curY - cy, curX - cx);
        let deltaRoll = curAng - prevAng;
        if (deltaRoll > Math.PI) deltaRoll -= Math.PI * 2;
        if (deltaRoll < -Math.PI) deltaRoll += Math.PI * 2;
        this.spinCameraRoll(-deltaRoll * this.rotateSpeed);
        this.rollVelocity = 0.65 * (-deltaRoll * this.rotateSpeed) + 0.35 * this.rollVelocity;
        this.lastMoveTime = now;
      } else if (this.isArcball) {
        const curSpherePoint = this.projectOnVirtualSphere(curX, curY, rect.width, rect.height);
        const axisScreen = new this.THREE.Vector3().crossVectors(curSpherePoint, this.prevSpherePoint);
        const dot = Math.max(-1, Math.min(1, this.prevSpherePoint.dot(curSpherePoint)));
        const angle = Math.acos(dot) * this.rotateSpeed;

        if (axisScreen.lengthSq() > 1e-8 && angle > 1e-6) {
          axisScreen.normalize();
          const axisWorld = new this.THREE.Vector3(axisScreen.x, axisScreen.y, axisScreen.z)
            .applyQuaternion(this.camera.quaternion)
            .normalize();

          this.rotateCameraByAxisAngle(axisWorld, angle);

          this.angularVelocity.axis.copy(axisWorld);
          this.angularVelocity.angle = 0.65 * angle + 0.35 * this.angularVelocity.angle;
          this.lastMoveTime = now;
        }

        // Outer-rim tangential spin enhancement: dragging near the outer edge of the 3D viewport
        // also imparts smooth in-plane roll around the viewing axis so the user can spin the 3D canvas like a wheel.
        const radius = Math.max(10, 0.85 * Math.min(rect.width, rect.height) / 2);
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const normDist = Math.hypot(curX - cx, curY - cy) / radius;
        if (normDist > 0.88) {
          const rimBlend = Math.min(1, (normDist - 0.88) / 0.35);
          const prevAng = Math.atan2(this.prevPointer.y - cy, this.prevPointer.x - cx);
          const curAng = Math.atan2(curY - cy, curX - cx);
          let deltaRoll = curAng - prevAng;
          if (deltaRoll > Math.PI) deltaRoll -= Math.PI * 2;
          if (deltaRoll < -Math.PI) deltaRoll += Math.PI * 2;
          const appliedRoll = -deltaRoll * rimBlend * 0.55;
          this.spinCameraRoll(appliedRoll);
          this.rollVelocity = 0.65 * appliedRoll + 0.35 * this.rollVelocity;
          this.lastMoveTime = now;
        }

        this.prevSpherePoint.copy(curSpherePoint);
      } else {
        const deltaX = curX - this.prevPointer.x;
        const deltaY = curY - this.prevPointer.y;
        this.orbitRotate(deltaX, deltaY, rect.width, rect.height);
      }

      this.prevPointer = { x: curX, y: curY };
    } else if (this.state === 'pan' && this.pointers.size === 1) {
      const deltaX = event.clientX - this.panStart.x;
      const deltaY = event.clientY - this.panStart.y;
      this.pan(deltaX, deltaY, rect.width, rect.height);
      this.panStart.set(event.clientX, event.clientY);
    } else if (this.state === 'pinch' && this.pointers.size >= 2) {
      const pts = Array.from(this.pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const mid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };

      // 1. Two-finger pinch-to-zoom (camera dolly)
      if (this.touchPinchDist > 4 && dist > 4) {
        const factor = this.touchPinchDist / dist;
        this.dolly(factor);
        this.touchPinchDist = dist;
      }

      // 2. Two-finger twist-to-spin (in-plane roll around camera forward axis)
      if (this.touchTwistAngle !== undefined) {
        let deltaTwist = angle - this.touchTwistAngle;
        if (deltaTwist > Math.PI) deltaTwist -= Math.PI * 2;
        if (deltaTwist < -Math.PI) deltaTwist += Math.PI * 2;
        if (Math.abs(deltaTwist) < 0.6) {
          this.spinCameraRoll(-deltaTwist);
          this.rollVelocity = 0.65 * -deltaTwist + 0.35 * this.rollVelocity;
          this.lastMoveTime = now;
        }
        this.touchTwistAngle = angle;
      }

      // 3. Two-finger omni-directional pan
      if (this.touchMidpoint) {
        const dMidX = mid.x - this.touchMidpoint.x;
        const dMidY = mid.y - this.touchMidpoint.y;
        if (Math.hypot(dMidX, dMidY) > 0.15) {
          this.pan(dMidX, dMidY, rect.width || 400, rect.height || 400);
        }
        this.touchMidpoint = mid;
      }
    }
  }

  onPointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (this.domElement?.hasPointerCapture?.(event.pointerId)) {
      try { this.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // If pointer held stationary > 250ms before release, clear flick momentum; otherwise preserve spin!
    if (now - this.lastMoveTime > 250) {
      this.angularVelocity.angle = 0;
      this.rollVelocity = 0;
    }

    if (this.pointers.size === 0) {
      this.state = 'none';
    } else if (this.pointers.size === 1) {
      this.state = 'rotate';
      const remaining = Array.from(this.pointers.values())[0];
      const rect = this.domElement.getBoundingClientRect();
      this.prevPointer = { x: remaining.x - rect.left, y: remaining.y - rect.top };
      this.prevSpherePoint = this.projectOnVirtualSphere(this.prevPointer.x, this.prevPointer.y, rect.width, rect.height);
    }
  }

  onPointerCancel(event) {
    this.onPointerUp(event);
  }

  onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    // Support both mouse wheel and trackpad pinch-zoom (event.ctrlKey)
    const step = event.ctrlKey ? Math.min(0.18, Math.max(0.02, Math.abs(event.deltaY) * 0.01)) : 0.08;
    const factor = event.deltaY < 0 ? (1 - step) : (1 + step);
    this.dolly(factor);
    this.angularVelocity.angle = 0;
    this.rollVelocity = 0;
  }

  update() {
    if (this.enableDamping && this.state === 'none') {
      if (this.angularVelocity.angle > 1e-4) {
        this.rotateCameraByAxisAngle(this.angularVelocity.axis, this.angularVelocity.angle);
        this.angularVelocity.angle *= (1 - this.dampingFactor);
        if (this.angularVelocity.angle <= 1e-4) {
          this.angularVelocity.angle = 0;
        }
      }
      if (Math.abs(this.rollVelocity) > 1e-4) {
        this.spinCameraRoll(this.rollVelocity);
        this.rollVelocity *= (1 - this.dampingFactor);
        if (Math.abs(this.rollVelocity) <= 1e-4) {
          this.rollVelocity = 0;
        }
      }
    }
  }

  reset() {
    this.target.set(0, 0, 0);
    this.angularVelocity.angle = 0;
    this.rollVelocity = 0;
    this.state = 'none';
    this.pointers.clear();
  }

  dispose() {
    if (!this.domElement) return;
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerCancel);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerCancel);
    }
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('dblclick', this._onDblClick);
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);
  }
}

/**
 * Common 3D Scene setup with Arcball/Trackball & OrbitControls, lighting, coordinate axes, and presets.
 */
export class BaseScene3DView {
  constructor(THREE, container) {
    this.THREE = THREE;
    this.container = container;
    this.container.__scene3d = this;
    this.available = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.slate800);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(26, 18, 26);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new ArcballTrackballControls(THREE, this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.035;
    this.controls.screenSpacePanning = true;

    // Lighting: a weaker ambient plus a hemisphere fill gives lit solids distinct wall shading
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 30, 20);
    this.scene.add(sun);
    addSolidLighting(THREE, this.scene);

    // Grid on XZ plane
    this.grid = new THREE.GridHelper(40, 40, PALETTE.slate600, PALETTE.slate700);
    this.grid.position.y = -0.01;
    this.scene.add(this.grid);

    // Axes with crisp mathematical arrowheads projecting symmetrically in all directions
    this.axes = new THREE.Group();
    const createAxis = (dir, col, len = 12.5) => {
      const g = new THREE.Group();
      const origin = new THREE.Vector3(0, 0, 0);
      // Positive ray arrow
      g.add(new THREE.ArrowHelper(dir, origin, len, col, 0.6, 0.35));
      // Negative ray arrow projecting in opposing direction
      const negDir = dir.clone().negate();
      g.add(new THREE.ArrowHelper(negDir, origin, len, col, 0.6, 0.35));
      // Central through-origin continuous axis line
      const posPt = dir.clone().multiplyScalar(len);
      const negPt = negDir.clone().multiplyScalar(len);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([negPt, posPt]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35 })
      );
      g.add(line);
      return g;
    };
    this.axes.add(createAxis(new THREE.Vector3(1, 0, 0), PALETTE.amber)); // +/- X
    this.axes.add(createAxis(new THREE.Vector3(0, 1, 0), PALETTE.lime));  // +/- Y
    this.axes.add(createAxis(new THREE.Vector3(0, 0, 1), PALETTE.steel)); // +/- Z
    this.scene.add(this.axes);

    // Translucent sphere
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshPhysicalMaterial({
        color: PALETTE.sky,
        transparent: true,
        opacity: 0.12,
        roughness: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.scene.add(this.sphere);

    // Great circle wireframe on XZ plane
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    this.circleWire = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.7, linewidth: 2 })
    );
    this.scene.add(this.circleWire);

    // 3D Projected Labels Overlay
    this.overlay = new LabelOverlay3D(THREE, container, this.camera);
    this.currentLabels = [...AXES_3D_LABELS];

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    // Render loop
    this.animating = true;
    this.latestVis3d = {};
    this.dimensionMode = 'planar';
    const loop = () => {
      if (!this.animating) return;
      this.controls.update();
      this.updateDepthCues();
      if (this.currentLabels && this.currentLabels.length) {
        this.overlay.render(this.currentLabels, this.latestVis3d);
      }
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Adjust vertical FOV when aspect ratio is narrow (< 1.0) to prevent clipping
    if (aspect < 1.0) {
      const defaultFov = 45;
      const fovRad = (defaultFov * Math.PI) / 180;
      const targetHalfWidth = Math.tan(fovRad / 2);
      this.camera.fov = (2 * Math.atan(targetHalfWidth / aspect) * 180) / Math.PI;
    } else {
      this.camera.fov = 45;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.currentLabels && this.currentLabels.length) {
      this.overlay.render(this.currentLabels, this.latestVis3d);
    }
  }

  export3DPNG(filename = 'scene-3d.png') {
    if (!this.renderer || !this.scene || !this.camera) return null;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return dataUrl;
  }
  /** Per-frame depth cues: the solid prism morph and idle parallax. */
  updateDepthCues(now = performance.now()) {
    const solid = isSolidMode(this.dimensionMode);
    if (solid && !this.solidMorph) {
      this.solidMorph = new SolidMorph(this.THREE, this.scene, {
        axis: 'y',
        normal: () => this.circleInfo?.normal || [0, 1, 0],
        center: () => this.circleInfo?.center || [0, 0, 0],
        exclude: () => [this.grid, this.axes, this.sphere],
        emphasis: () => [this.circleWire],
        halfHeight: () => 0.3 * Math.abs(this.circleWire?.scale?.x || 10),
      });
    }
    this.solidMorph?.update(solid, now);
    if (!this.parallax) this.parallax = new IdleParallax(this.controls, this.renderer.domElement);
    this.parallax.update(!this.isARActive && !this.camAnim, now);
  }

  applyCommonVis(state) {
    this.latestVis3d = state?.vis3d || {};
    this.dimensionMode = state?.dimensionMode || 'planar';
    if (this.grid) this.grid.visible = this.isARActive ? false : (state?.vis3d?.gridXZ !== false);
    if (this.axes) this.axes.visible = state?.vis3d?.axes !== false;
    if (this.sphere) this.sphere.visible = state?.vis3d?.sphere !== false && !isSolidMode(this.dimensionMode);
    if (this.circleWire) this.circleWire.visible = state?.vis3d?.circleWire !== false;
    const scaleX = state?.affineMode ? (state?.affineStretch ?? 1.35) : 1.0;
    if (this.scene?.scale?.set) {
      this.scene.scale.set(scaleX, 1, 1);
    }
    const invScaleX = scaleX ? 1 / scaleX : 1;
    if (this.grid?.scale?.set) this.grid.scale.set(invScaleX, 1, 1);
    if (this.axes?.scale?.set) this.axes.scale.set(invScaleX, 1, 1);
    if (this.overlay) {
      this.overlay.sceneScaleX = scaleX;
      if (this.overlay.overlayContainer) {
        const showLabels = (state?.vis3d?.labels !== false) || Boolean(state?.vis3d?.coords);
        this.overlay.overlayContainer.style.display = showLabels ? '' : 'none';
      }
    }
  }

  setARMode(active) {
    this.isARActive = Boolean(active);
    if (this.grid) this.grid.visible = active ? false : (this.latestVis3d?.gridXZ !== false);
    if (this.scene) {
      if (active) {
        if (this.scene.background !== null) {
          this.originalSceneBg = this.scene.background;
        }
        this.scene.background = null;
      } else {
        this.scene.background = this.originalSceneBg || new this.THREE.Color(PALETTE.slate800);
      }
    }
    if (this.renderer && typeof this.renderer.setClearColor === 'function') {
      if (active) {
        this.renderer.setClearColor(0x000000, 0);
      } else {
        this.renderer.setClearColor(PALETTE.slate800, 1);
      }
    }
  }

  setCameraPreset(preset) {
    if (this.controls?.angularVelocity) this.controls.angularVelocity.angle = 0;
    this.parallax?.poke();
    const d = 36;
    let targetPos;
    const targetUp = new this.THREE.Vector3(0, 1, 0);
    if (preset === 'top') {
      targetPos = new this.THREE.Vector3(0, d, 0.001);
    } else if (preset === 'front') {
      targetPos = new this.THREE.Vector3(0, 0, d);
    } else if (preset === 'side') {
      targetPos = new this.THREE.Vector3(d, 0, 0);
    } else {
      // iso / perspective
      targetPos = new this.THREE.Vector3(26, 18, 26);
    }

    if (typeof requestAnimationFrame === 'function' && typeof performance !== 'undefined') {
      if (this.camAnim) cancelAnimationFrame(this.camAnim);
      const startPos = this.camera.position.clone();
      const startUp = this.camera.up.clone();
      const startTime = performance.now();
      const duration = 380;

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        this.camera.position.lerpVectors(startPos, targetPos, t);
        this.camera.up.lerpVectors(startUp, targetUp, t).normalize();
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        if (this.currentLabels && this.currentLabels.length) {
          this.overlay.render(this.currentLabels, this.latestVis3d);
        }

        if (progress < 1) {
          this.camAnim = requestAnimationFrame(step);
        } else {
          this.camAnim = null;
        }
      };
      this.camAnim = requestAnimationFrame(step);
    } else {
      this.camera.position.copy(targetPos);
      this.camera.up.copy(targetUp);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      if (this.currentLabels && this.currentLabels.length) {
        this.overlay.render(this.currentLabels, this.latestVis3d);
      }
    }
  }

  enableInteraction(store, customTargets) {
    if (!this.renderer?.domElement) return;
    const element = this.renderer.domElement;
    let activeTarget = null;
    const raycaster = new this.THREE.Raycaster();

    const pointerToRay = (event) => {
      const rect = element.getBoundingClientRect();
      const ndc = new this.THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, this.camera);
      return raycaster;
    };

    const pickSphere = (ray, targetPos = null) => {
      const r = this.R || 10;
      const rayObj = ray.ray || ray;
      const vOrigin = rayObj.origin;
      const vDir = rayObj.direction;

      // Analytical ray-sphere intersection with sphere centered at origin:
      const b = vOrigin.dot(vDir);
      const c = vOrigin.lengthSq() - r * r;
      const disc = b * b - c;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = -b - sqrtDisc;
        const t2 = -b + sqrtDisc;
        if (targetPos) {
          const p1 = t1 > 0 ? vOrigin.clone().addScaledVector(vDir, t1) : null;
          const p2 = t2 > 0 ? vOrigin.clone().addScaledVector(vDir, t2) : null;
          if (p1 && p2) {
            return p1.distanceTo(targetPos) < p2.distanceTo(targetPos) ? p1 : p2;
          }
          if (p1) return p1;
          if (p2) return p2;
        }
        if (t1 > 0) return vOrigin.clone().addScaledVector(vDir, t1);
        if (t2 > 0) return vOrigin.clone().addScaledVector(vDir, t2);
      }

      // Past silhouette: project closest ray point onto sphere surface
      const tClosest = -b;
      if (tClosest > 0) {
        const pt = vOrigin.clone().addScaledVector(vDir, tClosest);
        if (pt.lengthSq() > 1e-6) {
          return pt.normalize().multiplyScalar(r);
        }
      }
      return null;
    };

    const pickEquatorialPlane = (ray, planeY = 0) => {
      const rayObj = ray.ray || ray;
      const vOrigin = rayObj.origin;
      const vDir = rayObj.direction;
      if (!vOrigin || !vDir || Math.abs(vDir.y) < 1e-4) return null;
      const t = (planeY - vOrigin.y) / vDir.y;
      if (t <= 0) return null;
      return vOrigin.clone().addScaledVector(vDir, t);
    };

    const pickTiltedPlane = (ray, normal, center) => {
      const rayObj = ray.ray || ray;
      const vOrigin = rayObj.origin;
      const vDir = rayObj.direction;
      if (!vOrigin || !vDir || !normal) return null;
      const n = normal.isVector3 ? normal : new this.THREE.Vector3(...(Array.isArray(normal) ? normal : [normal.x ?? 0, normal.y ?? 1, normal.z ?? 0]));
      const c = center ? (center.isVector3 ? center : new this.THREE.Vector3(...(Array.isArray(center) ? center : [center.x ?? 0, center.y ?? 0, center.z ?? 0]))) : new this.THREE.Vector3();
      const denom = vDir.dot(n);
      if (Math.abs(denom) < 1e-5) return null;
      const num = new this.THREE.Vector3().subVectors(c, vOrigin).dot(n);
      const t = num / denom;
      if (t <= 0) return null;
      return vOrigin.clone().addScaledVector(vDir, t);
    };

    const projectToScreen = (pos) => {
      if (!pos || !this.camera) return null;
      const v = pos.clone().project(this.camera);
      if (v.z > 1) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (v.y * -0.5 + 0.5) * rect.height,
      };
    };

    const distToVectorShaftPx = (ptrX, ptrY, tgt) => {
      if (!tgt?.isVectorRay || !tgt.mesh?.position) return Infinity;
      const oPt = projectToScreen(new this.THREE.Vector3(0, 0, 0));
      const tPt = projectToScreen(tgt.mesh.position);
      if (!oPt || !tPt) return Infinity;
      const vx = tPt.x - oPt.x;
      const vy = tPt.y - oPt.y;
      const lenSq = vx * vx + vy * vy;
      if (lenSq < 64) return Infinity;
      const t = ((ptrX - oPt.x) * vx + (ptrY - oPt.y) * vy) / lenSq;
      if (t < 0.22 || t > 1.06) return Infinity;
      const projX = oPt.x + t * vx;
      const projY = oPt.y + t * vy;
      return Math.hypot(ptrX - projX, ptrY - projY);
    };

    const activePointers = new Map();

    element.addEventListener('pointerdown', (e) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Multi-touch (2+ fingers) always yields to ArcballTrackballControls for pinch-zoom, twist-spin, and 2-finger pan
      if (activePointers.size >= 2) {
        if (activeTarget) {
          activeTarget = null;
          this.controls.enabled = true;
          element.style.cursor = '';
        }
        if (this.controls?.pointers) {
          for (const [pid, pt] of activePointers.entries()) {
            this.controls.pointers.set(pid, pt);
          }
        }
        return;
      }

      if (e.button && e.button !== 0) return;
      if (e.altKey || e.shiftKey) return; // Alt+drag = 3D spin, Shift+drag = 3D pan

      const ray = pointerToRay(e);
      const targets = customTargets || this.draggableTargets || [];
      const rect = element.getBoundingClientRect();
      const ptrX = e.clientX - rect.left;
      const ptrY = e.clientY - rect.top;

      let closest = null;
      let minScore = Infinity;
      for (const tgt of targets) {
        if (!tgt.mesh || tgt.mesh.visible === false) continue;
        const intersects = ray.intersectObject(tgt.mesh);
        const screenPt = projectToScreen(tgt.mesh.position);
        const distPx = screenPt ? Math.hypot(ptrX - screenPt.x, ptrY - screenPt.y) : Infinity;
        const shaftPx = distToVectorShaftPx(ptrX, ptrY, tgt);

        if (intersects.length > 0 || distPx < 34 || shaftPx < 16) {
          const score = intersects.length > 0 ? 0 : Math.min(distPx, shaftPx + 12);
          if (score < minScore) {
            minScore = score;
            closest = tgt;
          }
        }
      }

      if (closest) {
        activeTarget = closest;
        this.controls.enabled = false;
        element.style.cursor = 'grabbing';
        try { element.setPointerCapture(e.pointerId); } catch (_) {}
        e.stopPropagation();
      } else if (e.pointerType !== 'touch') {
        // Direct click-and-drag radius resizing from 3D equatorial wire rim (tight tolerance so 3D rotation is never obstructed)
        const r3d = this.R || 10;
        const rayObj = ray.ray || ray;
        const vOrigin = rayObj.origin;
        const vDir = rayObj.direction;
        const b = vOrigin.dot(vDir);
        const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
        const isSpatialMode = store.get().dimensionMode === 'spatial';
        const isSolid = isSolidMode(store.get().dimensionMode);
        const isOriented3D = isSolid || isSpatialMode;
        const eqHit = (isOriented3D && this.circleInfo?.normal)
          ? pickTiltedPlane(ray, this.circleInfo.normal, this.circleInfo.center)
          : pickEquatorialPlane(ray, 0);
        const cCenter = this.circleInfo?.center || new this.THREE.Vector3(0, 0, 0);
        const eqDistDiff = eqHit ? Math.abs(eqHit.clone().sub(cCenter).length() - r3d) : Infinity;
        const rimTol = (e.ctrlKey || e.metaKey) ? 1.4 : 0.35;

        let nearAnyTarget = false;
        for (const tgt of targets) {
          if (!tgt.mesh || tgt.mesh.visible === false) continue;
          const screenPt = projectToScreen(tgt.mesh.position);
          if (screenPt && Math.hypot(ptrX - screenPt.x, ptrY - screenPt.y) < 38) {
            nearAnyTarget = true;
            break;
          }
        }
        if (!nearAnyTarget && Math.abs(distRayToOrigin - r3d) < rimTol && eqDistDiff < rimTol) {
          const st = store.get();
          if (isOriented3D && !(e.ctrlKey || e.metaKey)) {
            // In Solid 3D & Spatial modes, dragging the circle rotates the 3D canvas omnidirectionally via ArcballTrackballControls.
            // Direct radius resizing requires Ctrl/Meta + drag so 3D omnidirectional tumbling is never trapped or locked to a single axis.
          } else {
            const isTangentExt = Boolean(st.pointDist);
            const isChordBisector = !isTangentExt && (st.showExtendedBisector !== undefined || st.radius === 170);
            const default2D = isTangentExt ? 120 : (isChordBisector ? 170 : 180);
            activeTarget = {
              isRadius: true,
              initialDist: distRayToOrigin,
              initialR: st.radius || default2D,
              base3D: isTangentExt ? 8 : 10,
              default2D,
              isTangentExt,
              isChordBisector,
            };
            this.controls.enabled = false;
            element.style.cursor = 'ew-resize';
            try { element.setPointerCapture(e.pointerId); } catch (_) {}
            e.stopPropagation();
          }
        }
      }
    }, { capture: true });

    element.addEventListener('pointermove', (e) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (activePointers.size >= 2) {
        if (activeTarget) {
          activeTarget = null;
          this.controls.enabled = true;
          element.style.cursor = '';
        }
        return;
      }
      const ray = pointerToRay(e);
      if (activeTarget) {
        if (activeTarget.isSolidSpin) {
          const hit = (this.circleInfo?.normal ? pickTiltedPlane(ray, this.circleInfo.normal, this.circleInfo.center) : null) || pickEquatorialPlane(ray, 0);
          if (hit) {
            const cCenter = this.circleInfo?.center || new this.THREE.Vector3(0, 0, 0);
            const dHit = new this.THREE.Vector3().subVectors(hit, cCenter);
            const curAngle = (this.circleInfo?.u && this.circleInfo?.v)
              ? Math.atan2(dHit.dot(this.circleInfo.v), dHit.dot(this.circleInfo.u))
              : Math.atan2(dHit.z, dHit.x);
            const delta = curAngle - activeTarget.startAngle;
            let nextSpin = (activeTarget.initialSpin + delta) % (Math.PI * 2);
            if (nextSpin < 0) nextSpin += Math.PI * 2;
            store.set({ solidSpin: nextSpin });
          }
          element.style.cursor = 'grabbing';
          e.stopPropagation();
          return;
        }
        if (activeTarget.isRadius) {
          const rayObj = ray.ray || ray;
          const vOrigin = rayObj.origin;
          const vDir = rayObj.direction;
          const b = vOrigin.dot(vDir);
          const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
          const minR = activeTarget.isTangentExt ? 80 : 100;
          const maxR = activeTarget.isTangentExt ? 220 : (activeTarget.isChordBisector ? 250 : 260);
          const scaleRatio = distRayToOrigin / (activeTarget.initialDist || activeTarget.base3D || 10);
          const nextR = Math.min(maxR, Math.max(minR, Math.round(activeTarget.initialR * scaleRatio)));
          const updates = { radius: nextR };
          if (activeTarget.isTangentExt) {
            updates.pointDist = Math.max(nextR + 35, store.get().pointDist);
          }
          store.set(updates);
          element.style.cursor = 'ew-resize';
          e.stopPropagation();
          return;
        }

        const isSpatialMode = store.get().dimensionMode === 'spatial';
        const isSolid = isSolidMode(store.get().dimensionMode);
        const isOriented3D = isSolid || isSpatialMode;
        const targetY = activeTarget.mesh?.position?.y || 0;
        const targetPos = activeTarget.mesh?.position || null;
        let hit = null;
        if (isOriented3D && this.circleInfo?.normal) {
          hit = pickTiltedPlane(ray, this.circleInfo.normal, this.circleInfo.center);
        } else if (!isSpatialMode && Math.abs(targetY) < 0.5) {
          hit = pickEquatorialPlane(ray, 0) || pickSphere(ray, targetPos);
        } else if (!isSpatialMode && Math.abs(targetY) >= 0.5 && !activeTarget.latField) {
          hit = pickEquatorialPlane(ray, targetY) || pickSphere(ray, targetPos);
        } else {
          hit = pickSphere(ray, targetPos);
        }
        if (hit) {
          let angle;
          if (isOriented3D && this.circleInfo?.u && this.circleInfo?.v) {
            const dHit = new this.THREE.Vector3().subVectors(hit, this.circleInfo.center || new this.THREE.Vector3());
            angle = Math.atan2(dHit.dot(this.circleInfo.v), dHit.dot(this.circleInfo.u));
          } else {
            angle = Math.atan2(hit.z, hit.x);
          }
          if (angle < 0) angle += Math.PI * 2;
          const lat = Math.acos(clamp(hit.y / (this.R || 10), -1, 1));

          if (store.get().playing) {
            store.set({ playing: false });
          }
          if (typeof activeTarget.onDrag === 'function') {
            activeTarget.onDrag(angle, hit, store, lat);
          } else if (activeTarget.latField) {
            if (store.get().dimensionMode === 'spatial') {
              store.set({ [activeTarget.field]: angle, [activeTarget.latField]: lat });
            } else {
              store.set({ [activeTarget.field]: angle, [activeTarget.latField]: Math.PI / 2 });
            }
          } else if (activeTarget.field) {
            store.set({ [activeTarget.field]: angle });
          }
        }
        e.stopPropagation();
      } else {
        const targets = customTargets || this.draggableTargets || [];
        const rect = element.getBoundingClientRect();
        const ptrX = e.clientX - rect.left;
        const ptrY = e.clientY - rect.top;
        let hover = false;
        for (const tgt of targets) {
          if (!tgt.mesh || tgt.mesh.visible === false) continue;
          const intersects = ray.intersectObject(tgt.mesh);
          const screenPt = projectToScreen(tgt.mesh.position);
          const distPx = screenPt ? Math.hypot(ptrX - screenPt.x, ptrY - screenPt.y) : Infinity;
          const shaftPx = distToVectorShaftPx(ptrX, ptrY, tgt);
          if (intersects.length > 0 || distPx < 34 || shaftPx < 16) {
            hover = true;
            break;
          }
        }
        if (!hover && e.pointerType !== 'touch') {
          const r3d = this.R || 10;
          const rayObj = ray.ray || ray;
          const vOrigin = rayObj.origin;
          const vDir = rayObj.direction;
          const b = vOrigin.dot(vDir);
          const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
          const isSpatialMode = store.get().dimensionMode === 'spatial';
          const isSolid = isSolidMode(store.get().dimensionMode);
          const isOriented3D = isSolid || isSpatialMode;
          const eqHit = (isOriented3D && this.circleInfo?.normal)
            ? pickTiltedPlane(ray, this.circleInfo.normal, this.circleInfo.center)
            : pickEquatorialPlane(ray, 0);
          const cCenter = this.circleInfo?.center || new this.THREE.Vector3(0, 0, 0);
          const eqDistDiff = eqHit ? Math.abs(eqHit.clone().sub(cCenter).length() - r3d) : Infinity;
          const rimTol = (e.ctrlKey || e.metaKey) ? 1.4 : 0.35;
          if (Math.abs(distRayToOrigin - r3d) < rimTol && eqDistDiff < rimTol) {
            element.style.cursor = isOriented3D && !(e.ctrlKey || e.metaKey) ? 'grab' : 'ew-resize';
            return;
          }
        }
        element.style.cursor = hover ? 'pointer' : (e.altKey ? 'alias' : 'grab');
      }
    }, { capture: true });

    const endDrag = (e) => {
      if (e && e.pointerId !== undefined) {
        activePointers.delete(e.pointerId);
      }
      if (activeTarget) {
        activeTarget = null;
        this.controls.enabled = true;
        element.style.cursor = '';
        if (e && element.hasPointerCapture?.(e.pointerId)) {
          try { element.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      }
    };
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // 3D Mouse Wheel Resizing (synchronized with 2D Canvas and slider)
    element.addEventListener('wheel', (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return; // Shift/Ctrl/trackpad-pinch retains camera dolly zoom
      e.preventDefault();
      e.stopPropagation();
      const st = store.get();
      const isTangentExt = Boolean(st.pointDist);
      const isChordBisector = !isTangentExt && (st.showExtendedBisector !== undefined || st.radius === 170);
      const defaultR = isTangentExt ? 120 : (isChordBisector ? 170 : 180);
      const cur = st.radius || defaultR;
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const minR = isTangentExt ? 80 : 100;
      const maxR = isTangentExt ? 220 : (isChordBisector ? 250 : 260);
      const nextR = Math.min(maxR, Math.max(minR, Math.round(cur * factor)));
      const updates = { radius: nextR };
      if (isTangentExt) {
        updates.pointDist = Math.max(nextR + 35, st.pointDist);
      }
      store.set(updates);
    }, { capture: true, passive: false });
  }

  dispose() {
    this.animating = false;
    this.resizeObserver.disconnect();
    this.overlay.clear();
    this.renderer.dispose();
  }
}

/**
 * Positions HTML labels over the 3D canvas tracking camera orientation.
 */
export class LabelOverlay3D {
  constructor(THREE, container, camera) {
    this.THREE = THREE;
    this.container = container;
    this.camera = camera;
    let oc = container?.querySelector?.('#labels-3d-container, .labels-3d-container');
    if (!oc && container) {
      oc = document.createElement('div');
      oc.id = 'labels-3d-container';
      oc.className = 'labels-3d-container';
      container.appendChild(oc);
    }
    this.overlayContainer = oc || container;
    this.elements = new Map();
  }

  project(point, isAxis = false) {
    if (!this.container || !this.camera || !point) return null;
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return null;
    const sx = isAxis ? 1 : (this.sceneScaleX || 1);
    const v = new this.THREE.Vector3(point.x * sx, point.y, point.z).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * width, y: (v.y * -0.5 + 0.5) * height };
  }

  render(labels, vis3d = {}) {
    if (!labels || !this.overlayContainer?.appendChild) return;
    const showLabels = vis3d.labels !== false;
    const showCoords = Boolean(vis3d.coords);
    const showAngles = vis3d.angles !== false;
    const activeKeys = new Set();

    for (const label of labels) {
      if (!label || !label.key) continue;
      activeKeys.add(label.key);
      let el = this.elements.get(label.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'label-3d';
        el.dataset.label = label.key;
        this.overlayContainer.appendChild(el);
        this.elements.set(label.key, el);
      }

      let shouldShow = label.show !== false;
      const isIndividualHidden = (label.name && !isLabelVisible(label.name, vis3d))
        || (label.key && !isLabelVisible(label.key, vis3d))
        || (label.text && !isLabelVisible(label.text, vis3d));
      if (isIndividualHidden) {
        shouldShow = false;
      } else if (!showLabels && !showCoords) {
        shouldShow = false;
      } else if (label.isAngle) {
        if (!showLabels || !showAngles) shouldShow = false;
      } else if (label.isAxis) {
        if (vis3d.axes === false) shouldShow = false;
      }

      const screen = shouldShow ? this.project(label.at, Boolean(label.isAxis)) : null;
      if (!screen) {
        el.classList.remove('visible');
        el.style.display = 'none';
        continue;
      }

      el.style.display = '';
      el.style.left = `${screen.x}px`;
      el.style.top = `${screen.y}px`;

      if (!label.isAngle && !label.isAxis && label.coords) {
        const name = label.name || label.key;
        const xStr = label.coords.x.toFixed(1);
        const yStr = (label.coords.y !== undefined ? label.coords.y : 0).toFixed(1);
        const zStr = (label.coords.z !== undefined ? label.coords.z : 0).toFixed(1);
        const coordHtml = `(<span class="color-amber">${xStr}</span>, <span class="color-lime">${yStr}</span>, <span class="color-steel">${zStr}</span>)`;
        if (showLabels && showCoords) {
          el.innerHTML = `${name} ${coordHtml}`;
        } else if (showCoords) {
          el.innerHTML = coordHtml;
        } else if (showLabels) {
          el.textContent = name;
        } else {
          el.textContent = '';
        }
      } else {
        el.textContent = label.text;
      }

      el.className = `label-3d visible ${label.isAngle ? 'is-angle' : ''} ${label.color || ''}`.trim();
    }

    for (const [key, el] of this.elements.entries()) {
      if (!activeKeys.has(key)) {
        el.classList.remove('visible');
        el.style.display = 'none';
      }
    }
  }

  clear() {
    for (const el of this.elements.values()) {
      el.classList.remove('visible');
      el.style.display = 'none';
    }
  }
}

export const AXES_3D_LABELS = [
  { key: 'axis-x-pos', at: { x: 13.0, y: 0, z: 0 }, text: '+X', color: 'color-amber', isAxis: true },
  { key: 'axis-x-neg', at: { x: -13.0, y: 0, z: 0 }, text: '-X', color: 'color-amber', isAxis: true },
  { key: 'axis-y-pos', at: { x: 0, y: 13.0, z: 0 }, text: '+Y', color: 'color-lime', isAxis: true },
  { key: 'axis-y-neg', at: { x: 0, y: -13.0, z: 0 }, text: '-Y', color: 'color-lime', isAxis: true },
  { key: 'axis-z-pos', at: { x: 0, y: 0, z: 13.0 }, text: '+Z', color: 'color-steel', isAxis: true },
  { key: 'axis-z-neg', at: { x: 0, y: 0, z: -13.0 }, text: '-Z', color: 'color-steel', isAxis: true },
];

/** Discrete, subtle vertex node adhering to Euclidean drawing standards (radius 0.18, no globs). */
function makeMarker(THREE, color, radius = 0.18) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.1 })
  );
}

function makeLine(THREE, color, dashed = false) {
  const geom = new THREE.BufferGeometry();
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.3 })
    : new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.Line(geom, mat);
}

/** Mathematical double-ended line with sharp conical arrowheads at both ends (no spherical globs). */
function makeDoubleArrowLine(THREE, color) {
  const group = new THREE.Group();
  const line = makeLine(THREE, color);
  const headGeom = new THREE.ConeGeometry(0.32, 0.75, 16);
  const headMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
  const cone1 = new THREE.Mesh(headGeom, headMat);
  const cone2 = new THREE.Mesh(headGeom, headMat);
  group.add(line, cone1, cone2);

  const up = new THREE.Vector3(0, 1, 0);
  const setPoints = (p1, p2) => {
    line.geometry.setFromPoints([p1, p2]);
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    cone1.position.copy(p1);
    cone1.quaternion.setFromUnitVectors(up, dir.clone().negate());
    cone2.position.copy(p2);
    cone2.quaternion.setFromUnitVectors(up, dir);
  };

  return { group, line, cone1, cone2, setPoints };
}

function makeTriMesh(THREE, color, opacity = 0.16) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 1;
  return mesh;
}

export function makeAngleWedgeMesh(THREE, color, opacity = 0.28) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 3;

  // Crisp outline line marking the angle sector boundary and radial spokes
  const arcGeom = new THREE.BufferGeometry();
  const arcMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const arcLine = new THREE.Line(arcGeom, arcMat);
  arcLine.renderOrder = 4;
  mesh.add(arcLine);
  mesh.arcLine = arcLine;
  geom.arcLine = arcLine;

  return mesh;
}

export function makeRightAngleMesh(THREE, color = PALETTE.teal, opacity = 0.75) {
  const geom = new THREE.BufferGeometry();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 3;

  // Crisp elbow line marking the right-angle square boundary
  const elbowGeom = new THREE.BufferGeometry();
  const elbowMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const elbowLine = new THREE.Line(elbowGeom, elbowMat);
  elbowLine.renderOrder = 4;
  mesh.add(elbowLine);
  mesh.elbowLine = elbowLine;
  geom.elbowLine = elbowLine;

  return mesh;
}

export function setAngleWedgeVertices3D(meshOrGeom, vertex, toward1, toward2, radius, segments = 24, customTHREE = null, sweepReflex = false) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2 || !meshOrGeom) return;
  const geom = meshOrGeom.isBufferGeometry ? meshOrGeom : meshOrGeom.geometry;
  if (!geom) return;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
  v1.normalize();
  v2.normalize();
  let angle = v1.angleTo(v2);
  let normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  if (normal.lengthSq() < 0.001) normal.set(0, 1, 0);

  if (sweepReflex) {
    normal.negate();
    angle = 2 * Math.PI - angle;
  }

  const rim = [];
  for (let i = 0; i <= segments; i++) {
    rim.push(v1.clone().applyAxisAngle(normal, angle * (i / segments)).multiplyScalar(radius).add(vertex));
  }
  const positions = [];
  for (let i = 0; i < segments; i++) {
    positions.push(
      vertex.x, vertex.y, vertex.z,
      rim[i].x, rim[i].y, rim[i].z,
      rim[i + 1].x, rim[i + 1].y, rim[i + 1].z
    );
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();

  const arcLine = meshOrGeom.arcLine || geom.arcLine;
  if (arcLine && arcLine.geometry) {
    const loop = [vertex, ...rim, vertex];
    arcLine.geometry.setFromPoints(loop);
  }
}

/**
 * Calculates 3D spatial angle bisector position offset outward by dist.
 */
export function get3DAngleBisector(vertex, toward1, toward2, dist = 1.5, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2) return vertex;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return vertex;
  v1.normalize();
  v2.normalize();
  const bisector = new THREE.Vector3().addVectors(v1, v2);
  if (bisector.lengthSq() < 1e-4) {
    let normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 1, 0));
    if (normal.lengthSq() < 1e-4) normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 0, 1));
    return new THREE.Vector3().addVectors(vertex, normal.normalize().multiplyScalar(dist));
  }
  return new THREE.Vector3().addVectors(vertex, bisector.normalize().multiplyScalar(dist));
}

/**
 * Calculates 3D exterior spatial angle bisector position offset outward by dist for reflex angles.
 */
export function get3DReflexBisector(vertex, toward1, toward2, dist = 1.5, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2) return vertex;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return vertex;
  v1.normalize();
  v2.normalize();
  const bisector = new THREE.Vector3().addVectors(v1, v2);
  if (bisector.lengthSq() < 1e-4) {
    let normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 1, 0));
    if (normal.lengthSq() < 1e-4) normal = new THREE.Vector3().crossVectors(v1, new THREE.Vector3(0, 0, 1));
    return new THREE.Vector3().addVectors(vertex, normal.normalize().multiplyScalar(-dist));
  }
  return new THREE.Vector3().addVectors(vertex, bisector.normalize().multiplyScalar(-dist));
}

/**
 * Calculates 3D subtended angle in degrees between toward1 and toward2 from vertex.
 */
export function get3DAngleDegrees(vertex, toward1, toward2, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2) return 0;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return 0;
  v1.normalize();
  v2.normalize();
  return (v1.angleTo(v2) * 180 / Math.PI);
}

function setTriVertices(geom, p1, p2, p3) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const vertices = new Float32Array([
    p1.x, p1.y, p1.z,
    p2.x, p2.y, p2.z,
    p3.x, p3.y, p3.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
}

function setSectorXZVertices(geom, cx, cz, radius, startAngle, sweepAngle, segments = 32) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const positions = [];
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    positions.push(cx, 0, cz);
    positions.push(cx + radius * Math.cos(a1), 0, cz + radius * Math.sin(a1));
    positions.push(cx + radius * Math.cos(a2), 0, cz + radius * Math.sin(a2));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

function setSegmentXZVertices(geom, cx, cz, radius, startAngle, sweepAngle, segments = 32) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const p0x = cx + radius * Math.cos(startAngle);
  const p0z = cz + radius * Math.sin(startAngle);
  const positions = [];
  for (let i = 1; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    positions.push(p0x, 0, p0z);
    positions.push(cx + radius * Math.cos(a1), 0, cz + radius * Math.sin(a1));
    positions.push(cx + radius * Math.cos(a2), 0, cz + radius * Math.sin(a2));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

/**
 * Aligns a circle wireframe (originally on XZ plane with normal (0,1,0)) to any plane in 3D.
 */
export function alignCircleWireToPlane(circleWire, normal, center = null, radius = null, customTHREE = null) {
  if (!circleWire) return;
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  const Vec3 = THREE?.Vector3 || circleWire.position.constructor;
  const up = new Vec3(0, 1, 0);
  if (normal) {
    const lenSq = typeof normal.lengthSq === 'function'
      ? normal.lengthSq()
      : (normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (lenSq > 1e-7) {
      const n = normal.clone ? normal.clone().normalize() : new Vec3(normal.x, normal.y, normal.z).normalize();
      circleWire.quaternion.setFromUnitVectors(up, n);
    } else {
      circleWire.quaternion.identity();
    }
  } else {
    circleWire.quaternion.identity();
  }
  if (center) {
    circleWire.position.copy(center);
  } else {
    circleWire.position.set(0, 0, 0);
  }
  if (typeof radius === 'number' && Number.isFinite(radius) && radius > 0) {
    circleWire.scale.setScalar(radius);
  }
}

/**
 * Computes the unique circumcircle and containing plane for any 3 points on sphere S²(O, R).
 */
export function rodriguesVector(v, k, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const kDotV = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cross = [
    k[1] * v[2] - k[2] * v[1],
    k[2] * v[0] - k[0] * v[2],
    k[0] * v[1] - k[1] * v[0],
  ];
  return [
    v[0] * cos + cross[0] * sin + k[0] * kDotV * (1 - cos),
    v[1] * cos + cross[1] * sin + k[1] * kDotV * (1 - cos),
    v[2] * cos + cross[2] * sin + k[2] * kDotV * (1 - cos),
  ];
}

/**
 * Computes orientation frame (normal, u, v) in true 3D spherical coordinates
 * for the solid cylinder and circumprism, keeping all points in coupled lockstep.
 */
export function getSolidOrientationFrame(state = {}, defaultAxis = 'y', customTHREE = null) {
  const THREE = customTHREE || (typeof window !== 'undefined' ? window.THREE : null) || globalThis?.THREE;
  const Vec3 = THREE?.Vector3;
  const tilt = state.solidTilt !== undefined ? Number(state.solidTilt) : 0;
  const azimuth = state.solidAzimuth !== undefined ? Number(state.solidAzimuth) : 0;
  const spin = state.solidSpin !== undefined ? Number(state.solidSpin) : 0;

  let normalArr, uArr, vArr;
  if (defaultAxis === 'z') {
    const nx = Math.sin(tilt) * Math.cos(azimuth);
    const ny = Math.sin(tilt) * Math.sin(azimuth);
    const nz = Math.cos(tilt);
    normalArr = [nx, ny, nz];
    const u0 = [Math.cos(spin), Math.sin(spin), 0];
    const v0 = [-Math.sin(spin), Math.cos(spin), 0];
    const sinTilt = Math.hypot(nx, ny);
    if (sinTilt < 1e-7) {
      uArr = u0; vArr = v0;
    } else {
      const k = [-ny / sinTilt, nx / sinTilt, 0];
      uArr = rodriguesVector(u0, k, tilt);
      vArr = rodriguesVector(v0, k, tilt);
    }
  } else {
    const nx = Math.sin(tilt) * Math.cos(azimuth);
    const ny = Math.cos(tilt);
    const nz = Math.sin(tilt) * Math.sin(azimuth);
    normalArr = [nx, ny, nz];
    const u0 = [Math.cos(spin), 0, Math.sin(spin)];
    const v0 = [-Math.sin(spin), 0, Math.cos(spin)];
    const sinTilt = Math.hypot(nx, nz);
    if (sinTilt < 1e-7) {
      uArr = u0; vArr = v0;
    } else {
      const k = [nz / sinTilt, 0, -nx / sinTilt];
      uArr = rodriguesVector(u0, k, tilt);
      vArr = rodriguesVector(v0, k, tilt);
    }
  }

  const normal = Vec3 ? new Vec3(...normalArr) : normalArr;
  const u = Vec3 ? new Vec3(...uArr) : uArr;
  const v = Vec3 ? new Vec3(...vArr) : vArr;

  return {
    normal,
    u,
    v,
    normalArr,
    uArr,
    vArr,
    tilt,
    azimuth,
    spin,
  };
}
export function computeConcyclicPlaneAndCircle(p1, p2, p3, R = 10, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  const Vec3 = THREE?.Vector3 || p1.constructor;
  const v12 = new Vec3().subVectors(p2, p1);
  const v13 = new Vec3().subVectors(p3, p1);
  const normal = new Vec3().crossVectors(v12, v13);
  const lenSq = normal.lengthSq();
  if (lenSq < 1e-6) {
    const fallbackN = new Vec3(0, 1, 0);
    const u = new Vec3(1, 0, 0);
    const v = new Vec3(0, 0, 1);
    return {
      normal: fallbackN,
      center: new Vec3(0, 0, 0),
      radius: R,
      u,
      v,
      h: 0,
    };
  }
  normal.normalize();
  let h = p1.dot(normal);
  if (h < -1e-5) {
    if (typeof normal.negate === 'function') {
      normal.negate();
    } else if (typeof normal.multiplyScalar === 'function') {
      normal.multiplyScalar(-1);
    } else {
      normal.x = -normal.x;
      normal.y = -normal.y;
      normal.z = -normal.z;
    }
    h = -h;
  } else if (Math.abs(h) <= 1e-5) {
    const refUp = new Vec3(0, 1, 0);
    const dotUp = typeof normal.dot === 'function' ? normal.dot(refUp) : (normal.x * refUp.x + normal.y * refUp.y + normal.z * refUp.z);
    if (dotUp < -1e-5 || (Math.abs(dotUp) <= 1e-5 && (normal.z < 0 || (normal.z === 0 && normal.x < 0)))) {
      if (typeof normal.negate === 'function') {
        normal.negate();
      } else if (typeof normal.multiplyScalar === 'function') {
        normal.multiplyScalar(-1);
      } else {
        normal.x = -normal.x;
        normal.y = -normal.y;
        normal.z = -normal.z;
      }
    }
    h = 0;
  }
  const center = normal.clone().multiplyScalar(h);
  const radius = Math.sqrt(Math.max(0.1, R * R - h * h));
  const diff = new Vec3().subVectors(p1, center);
  const u = diff.lengthSq() > 1e-6 ? diff.normalize() : new Vec3(1, 0, 0);
  const v = new Vec3().crossVectors(normal, u).normalize();
  return { normal, center, radius, u, v, h };
}

/**
 * Generates a circular sector mesh in true 3D on any plane spanned by basis vectors u and v.
 */
export function setSector3DVertices(geom, center, u, v, radius, startAngle, sweepAngle, segments = 32, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !geom) return;
  const positions = [];
  const cx = center.x, cy = center.y, cz = center.z;
  const ux = u.x, uy = u.y, uz = u.z;
  const vx = v.x, vy = v.y, vz = v.z;
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2);
    positions.push(cx, cy, cz);
    positions.push(cx + radius * (cos1 * ux + sin1 * vx), cy + radius * (cos1 * uy + sin1 * vy), cz + radius * (cos1 * uz + sin1 * vz));
    positions.push(cx + radius * (cos2 * ux + sin2 * vx), cy + radius * (cos2 * uy + sin2 * vy), cz + radius * (cos2 * uz + sin2 * vz));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

/**
 * Generates a circular segment mesh in true 3D on any plane spanned by basis vectors u and v.
 */
export function setSegment3DVertices(geom, center, u, v, radius, startAngle, sweepAngle, segments = 32, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !geom) return;
  const cx = center.x, cy = center.y, cz = center.z;
  const ux = u.x, uy = u.y, uz = u.z;
  const vx = v.x, vy = v.y, vz = v.z;
  const cos0 = Math.cos(startAngle), sin0 = Math.sin(startAngle);
  const p0x = cx + radius * (cos0 * ux + sin0 * vx);
  const p0y = cy + radius * (cos0 * uy + sin0 * vy);
  const p0z = cz + radius * (cos0 * uz + sin0 * vz);
  const positions = [];
  for (let i = 1; i < segments; i++) {
    const a1 = startAngle + (sweepAngle * i) / segments;
    const a2 = startAngle + (sweepAngle * (i + 1)) / segments;
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2);
    positions.push(p0x, p0y, p0z);
    positions.push(cx + radius * (cos1 * ux + sin1 * vx), cy + radius * (cos1 * uy + sin1 * vy), cz + radius * (cos1 * uz + sin1 * vz));
    positions.push(cx + radius * (cos2 * ux + sin2 * vx), cy + radius * (cos2 * uy + sin2 * vy), cz + radius * (cos2 * uz + sin2 * vz));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
}

export function setRightAngle3DVertices(meshOrGeom, vertex, toward1, toward2, size = 1.3, customTHREE = null) {
  const THREE = customTHREE || window?.THREE || globalThis?.THREE;
  if (!THREE || !vertex || !toward1 || !toward2 || !meshOrGeom) return;
  const geom = meshOrGeom.isBufferGeometry ? meshOrGeom : meshOrGeom.geometry;
  if (!geom) return;
  const v1 = new THREE.Vector3().subVectors(toward1, vertex);
  const v2 = new THREE.Vector3().subVectors(toward2, vertex);
  if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
  v1.normalize().multiplyScalar(size);
  v2.normalize().multiplyScalar(size);

  const c1 = new THREE.Vector3().addVectors(vertex, v1);
  const c2 = new THREE.Vector3().addVectors(c1, v2);
  const c3 = new THREE.Vector3().addVectors(vertex, v2);

  const positions = new Float32Array([
    vertex.x, vertex.y, vertex.z,  c1.x, c1.y, c1.z,  c2.x, c2.y, c2.z,
    vertex.x, vertex.y, vertex.z,  c2.x, c2.y, c2.z,  c3.x, c3.y, c3.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const elbowLine = meshOrGeom.elbowLine || geom.elbowLine;
  if (elbowLine && elbowLine.geometry) {
    elbowLine.geometry.setFromPoints([c1, c2, c3]);
  }
}

export function setRightAngleXZVertices(geom, vertex, toward1, toward2, size = 1.0) {
  return setRightAngle3DVertices(geom, vertex, toward1, toward2, size);
}

function setQuadVertices(geom, p1, p2, p3, p4) {
  const THREE = window?.THREE;
  if (!THREE) return;
  const positions = new Float32Array([
    p1.x, p1.y, p1.z,  p2.x, p2.y, p2.z,  p3.x, p3.y, p3.z,
    p1.x, p1.y, p1.z,  p3.x, p3.y, p3.z,  p4.x, p4.y, p4.z,
  ]);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();
}

/**
 * Computes unit tangent direction at `fromPt` along the geodesic towards `toPt`.
 */
export function getGeodesicTangent(fromPt, toPt, customTHREE = null) {
  const THREE = customTHREE || (typeof window !== 'undefined' ? window.THREE : globalThis?.THREE);
  if (!fromPt || !toPt) return null;
  const fx = fromPt.x ?? 0, fy = fromPt.y ?? 0, fz = fromPt.z ?? 0;
  const tx = toPt.x ?? 0, ty = toPt.y ?? 0, tz = toPt.z ?? 0;
  const fLen = Math.hypot(fx, fy, fz) || 1;
  const tLen = Math.hypot(tx, ty, tz) || 1;
  const uFx = fx / fLen, uFy = fy / fLen, uFz = fz / fLen;
  const uTx = tx / tLen, uTy = ty / tLen, uTz = tz / tLen;
  const dot = uFx * uTx + uFy * uTy + uFz * uTz;
  let rx = uTx - uFx * dot;
  let ry = uTy - uFy * dot;
  let rz = uTz - uFz * dot;
  const rLen = Math.hypot(rx, ry, rz) || 1;
  rx /= rLen; ry /= rLen; rz /= rLen;
  if (THREE?.Vector3) return new THREE.Vector3(rx, ry, rz);
  return { x: rx, y: ry, z: rz };
}

/**
 * Creates a great-circle geodesic arc line on S² using spherical linear interpolation (SLERP).
 * Supports both signatures:
 *   createGeodesicArc3D(THREE, p1, p2, radius, color, numSegs, isDashed)
 *   createGeodesicArc3D(THREE, color, isDashed)
 */
export function createGeodesicArc3D(THREE, ...args) {
  let p1, p2, radius, color, numSegs, isDashed;
  if (typeof args[0] === 'string' || typeof args[0] === 'number') {
    color = args[0];
    isDashed = args[1] ?? false;
    p1 = new THREE.Vector3(1, 0, 0);
    p2 = new THREE.Vector3(0, 1, 0);
    radius = 10;
    numSegs = 36;
  } else {
    p1 = args[0] || new THREE.Vector3(1, 0, 0);
    p2 = args[1] || new THREE.Vector3(0, 1, 0);
    radius = args[2] ?? 10;
    color = args[3];
    numSegs = args[4] ?? 36;
    isDashed = args[5] ?? false;
  }
  const u1 = p1.clone().normalize();
  const u2 = p2.clone().normalize();
  const dotVal = Math.min(1, Math.max(-1, u1.dot(u2)));
  const theta = Math.acos(dotVal);
  const pts = [];
  if (theta < 1e-4) {
    pts.push(p1.clone(), p2.clone());
  } else {
    const sinTh = Math.sin(theta);
    for (let i = 0; i <= numSegs; i++) {
      const t = i / numSegs;
      const w1 = Math.sin((1 - t) * theta) / sinTh;
      const w2 = Math.sin(t * theta) / sinTh;
      const p = new THREE.Vector3()
        .addScaledVector(u1, w1)
        .addScaledVector(u2, w2)
        .normalize()
        .multiplyScalar(radius * 1.002);
      pts.push(p);
    }
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  if (isDashed) {
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.6,
      gapSize: 0.35,
      linewidth: 2,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    line.__THREE = THREE;
    return line;
  }
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2.6 });
  const line = new THREE.Line(geom, mat);
  line.__THREE = THREE;
  return line;
}

/**
 * Updates an existing geodesic arc line geometry in-place.
 * Supports continuous curvature homotopy lambda in [0, 1] (0 = flat 1-simplex chord, 1 = spherical geodesic arc).
 */
export function updateGeodesicArc3D(line, p1, p2, radius, numSegs = 36, curvatureLambda = 1) {
  if (!line || !line.geometry) return;
  const THREE = line.__THREE || (typeof window !== 'undefined' ? window.THREE : globalThis?.THREE);
  if (!THREE || !p1 || !p2) return;
  const u1 = p1.clone().normalize();
  const u2 = p2.clone().normalize();
  const dotVal = Math.min(1, Math.max(-1, u1.dot(u2)));
  const theta = Math.acos(dotVal);
  const pts = [];
  const lam = clamp(curvatureLambda ?? 1, 0, 1);
  if (theta < 1e-4) {
    pts.push(p1.clone(), p2.clone());
  } else {
    const sinTh = Math.sin(theta);
    for (let i = 0; i <= numSegs; i++) {
      const t = i / numSegs;
      const w1 = Math.sin((1 - t) * theta) / sinTh;
      const w2 = Math.sin(t * theta) / sinTh;
      const sphPt = new THREE.Vector3()
        .addScaledVector(u1, w1)
        .addScaledVector(u2, w2)
        .normalize()
        .multiplyScalar(radius * 1.002);

      if (lam >= 1) {
        pts.push(sphPt);
      } else {
        const chordPt = new THREE.Vector3().lerpVectors(p1, p2, t);
        const blended = new THREE.Vector3().lerpVectors(chordPt, sphPt, lam);
        pts.push(blended);
      }
    }
  }
  line.geometry.setFromPoints(pts);
  if (line.material && line.material.isLineDashedMaterial) {
    line.computeLineDistances();
  }
}

/**
 * Creates a subdivided spherical triangle mesh cap on S² with radial anti-flicker lift.
 * Supports both signatures:
 *   createSphericalTriangleMesh(THREE, pA, pB, pC, radius, color, opacity, numSub)
 *   createSphericalTriangleMesh(THREE, color, opacity, numSub)
 */
export function createSphericalTriangleMesh(THREE, ...args) {
  let pA, pB, pC, radius, color, opacity, numSub;
  if (typeof args[0] === 'string' || typeof args[0] === 'number') {
    color = args[0];
    opacity = args[1] ?? 0.22;
    numSub = args[2] ?? 14;
    pA = new THREE.Vector3(1, 0, 0);
    pB = new THREE.Vector3(0, 1, 0);
    pC = new THREE.Vector3(0, 0, 1);
    radius = 10;
  } else {
    pA = args[0] || new THREE.Vector3(1, 0, 0);
    pB = args[1] || new THREE.Vector3(0, 1, 0);
    pC = args[2] || new THREE.Vector3(0, 0, 1);
    radius = args[3] ?? 10;
    color = args[4];
    opacity = args[5] ?? 0.22;
    numSub = args[6] ?? 14;
  }
  const uA = pA.clone().normalize();
  const uB = pB.clone().normalize();
  const uC = pC.clone().normalize();
  const N = numSub;
  const positions = [];
  const indices = [];
  const grid = [];

  let idx = 0;
  for (let i = 0; i <= N; i++) {
    grid[i] = [];
    for (let j = 0; j <= N - i; j++) {
      const k = N - i - j;
      const wA = k / N;
      const wB = i / N;
      const wC = j / N;
      const vx = wA * uA.x + wB * uB.x + wC * uC.x;
      const vy = wA * uA.y + wB * uB.y + wC * uC.y;
      const vz = wA * uA.z + wB * uB.z + wC * uC.z;
      const len = Math.hypot(vx, vy, vz) || 1;
      const rLift = radius * 1.002;
      positions.push((vx / len) * rLift, (vy / len) * rLift, (vz / len) * rLift);
      grid[i][j] = idx++;
    }
  }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N - i; j++) {
      const p0 = grid[i][j];
      const p1 = grid[i + 1][j];
      const p2 = grid[i][j + 1];
      indices.push(p0, p1, p2);
      if (j < N - i - 1) {
        const p3 = grid[i + 1][j + 1];
        indices.push(p1, p3, p2);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mesh.__THREE = THREE;
  return mesh;
}

/**
 * Updates an existing spherical triangle mesh geometry in-place.
 */
export function updateSphericalTriangleMesh(mesh, pA, pB, pC, radius, numSub = 14) {
  if (!mesh || !mesh.geometry) return;
  const THREE = mesh.__THREE || (typeof window !== 'undefined' ? window.THREE : globalThis?.THREE);
  if (!THREE || !pA || !pB || !pC) return;
  const uA = pA.clone().normalize();
  const uB = pB.clone().normalize();
  const uC = pC.clone().normalize();
  const N = numSub;
  const positions = [];
  const indices = [];
  const grid = [];

  let idx = 0;
  for (let i = 0; i <= N; i++) {
    grid[i] = [];
    for (let j = 0; j <= N - i; j++) {
      const k = N - i - j;
      const wA = k / N;
      const wB = i / N;
      const wC = j / N;
      const vx = wA * uA.x + wB * uB.x + wC * uC.x;
      const vy = wA * uA.y + wB * uB.y + wC * uC.y;
      const vz = wA * uA.z + wB * uB.z + wC * uC.z;
      const len = Math.hypot(vx, vy, vz) || 1;
      const rLift = radius * 1.002;
      positions.push((vx / len) * rLift, (vy / len) * rLift, (vz / len) * rLift);
      grid[i][j] = idx++;
    }
  }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N - i; j++) {
      const p0 = grid[i][j];
      const p1 = grid[i + 1][j];
      const p2 = grid[i][j + 1];
      indices.push(p0, p1, p2);
      if (j < N - i - 1) {
        const p3 = grid[i + 1][j + 1];
        indices.push(p1, p3, p2);
      }
    }
  }

  mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mesh.geometry.setIndex(indices);
  mesh.geometry.computeVertexNormals();
}

/**
 * Calculates spherical triangle arc lengths, spherical angles, and Girard's spherical excess:
 * Excess E = A_sph + B_sph + C_sph - pi. Area = R^2 * E.
 */
export function computeSphericalTriangleExcess(pA, pB, pC, radius = 1, customTHREE = null) {
  const toUnit = (p) => {
    if (p && typeof p.clone === 'function') {
      return p.clone().normalize();
    }
    const len = Math.hypot(p.x, p.y, p.z) || 1;
    return { x: p.x / len, y: p.y / len, z: p.z / len };
  };

  const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const cross = (v1, v2) => ({
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  });
  const norm = (v) => {
    const l = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  };

  const uA = toUnit(pA);
  const uB = toUnit(pB);
  const uC = toUnit(pC);

  const clampVal = (v, min, max) => Math.min(max, Math.max(min, v));
  const a = Math.acos(clampVal(dot(uB, uC), -1, 1));
  const b = Math.acos(clampVal(dot(uA, uC), -1, 1));
  const c = Math.acos(clampVal(dot(uA, uB), -1, 1));

  // Geodesic plane normals
  const nAB = norm(cross(uA, uB));
  const nAC = norm(cross(uA, uC));
  const nBA = { x: -nAB.x, y: -nAB.y, z: -nAB.z };
  const nBC = norm(cross(uB, uC));
  const nCA = { x: -nAC.x, y: -nAC.y, z: -nAC.z };
  const nCB = { x: -nBC.x, y: -nBC.y, z: -nBC.z };

  const angleBetweenNormals = (n1, n2, pole) => {
    const cosVal = clampVal(dot(n1, n2), -1, 1);
    const cr = cross(n1, n2);
    const sinVal = dot(cr, pole);
    let ang = Math.atan2(sinVal, cosVal);
    if (ang < 0) ang += Math.PI * 2;
    if (ang > Math.PI) ang = Math.PI * 2 - ang;
    return ang;
  };

  const Asph = angleBetweenNormals(nAB, nAC, uA);
  const Bsph = angleBetweenNormals(nBA, nBC, uB);
  const Csph = angleBetweenNormals(nCA, nCB, uC);

  const excessRad = Math.max(0, Asph + Bsph + Csph - Math.PI);
  const excessDeg = (excessRad * 180) / Math.PI;
  const area = radius * radius * excessRad;

  return {
    uA,
    uB,
    uC,
    arcLengths: { a, b, c },
    sphAngles: {
      A: Asph,
      B: Bsph,
      C: Csph,
      degA: (Asph * 180) / Math.PI,
      degB: (Bsph * 180) / Math.PI,
      degC: (Csph * 180) / Math.PI,
    },
    excessRad,
    excessDeg,
    area,
  };
}

/**
 * 1. Angle at Centre 3D Scene View
 */
export class AngleAtCentre3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.indigo, 0.16);
    this.markerA = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerP = makeMarker(THREE, PALETTE.violet, 0.18);

    this.lineOA = makeLine(THREE, PALETTE.red);
    this.lineOB = makeLine(THREE, PALETTE.orange);
    this.lineOP = makeLine(THREE, PALETTE.lavender, true);
    this.linePA = makeLine(THREE, PALETTE.blue);
    this.linePB = makeLine(THREE, PALETTE.orange);

    // Spherical Geodesic Great-Circle Arcs on S²
    this.geodesicArcPA = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicArcPB = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicArcAB = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.sphericalCapMesh = createSphericalTriangleMesh(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), R, PALETTE.sky, 0.22);

    this.sectorMesh = makeTriMesh(THREE, PALETTE.yellow, 0.16);
    this.triOPAMesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.triOPBMesh = makeTriMesh(THREE, PALETTE.orange, 0.16);
    this.centralAngleMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.28);
    this.inscribedAngleMesh = makeAngleWedgeMesh(THREE, PALETTE.green, 0.28);
    this.centralReflexMesh = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25);
    this.inscribedReflexMesh = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25);
    this.angleAlphaPMesh = makeAngleWedgeMesh(THREE, PALETTE.lime, 0.28);
    this.angleBetaPMesh = makeAngleWedgeMesh(THREE, PALETTE.fuchsia, 0.28);
    this.angleAlphaAMesh = makeAngleWedgeMesh(THREE, PALETTE.lime, 0.28);
    this.angleBetaBMesh = makeAngleWedgeMesh(THREE, PALETTE.fuchsia, 0.28);

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerP,
      this.lineOA, this.lineOB, this.lineOP, this.linePA, this.linePB,
      this.geodesicArcPA, this.geodesicArcPB, this.geodesicArcAB, this.sphericalCapMesh,
      this.sectorMesh, this.triOPAMesh, this.triOPBMesh,
      this.centralAngleMesh, this.inscribedAngleMesh,
      this.centralReflexMesh, this.inscribedReflexMesh,
      this.angleAlphaPMesh, this.angleBetaPMesh,
      this.angleAlphaAMesh, this.angleBetaBMesh
    );

    const TAU_AAC = Math.PI * 2;
    const normAAC = (a) => ((a % TAU_AAC) + TAU_AAC) % TAU_AAC;
    const toCircleAngleAAC = (hit) => {
      if (!this.circleInfo || !hit) return 0;
      const dHit = new this.THREE.Vector3().subVectors(hit, this.circleInfo.center);
      return normAAC(Math.atan2(dHit.dot(this.circleInfo.v), dHit.dot(this.circleInfo.u)));
    };

    this.draggableTargets = [
      {
        id: 'P',
        mesh: this.markerP,
        field: 'angleP',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampAngleInArc(targetAng, st.angleB, st.angleA, 0.15);
          store.set({ angleP: clamped });
        },
      },
      {
        id: 'A',
        mesh: this.markerA,
        field: 'angleA',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampAngleInArc(targetAng, st.angleP, st.angleB, 0.2);
          store.set({ angleA: clamped });
        },
      },
      {
        id: 'B',
        mesh: this.markerB,
        field: 'angleB',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampAngleInArc(targetAng, st.angleA, st.angleP, 0.2);
          store.set({ angleB: clamped });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const isSolid = isSolidMode(state.dimensionMode);
    let A, B, P, circleInfo;
    if (isSolid || isSpatial) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      const { u, v, normal } = frame;
      const toPt = (ang) => new THREE.Vector3()
        .addScaledVector(u, R * Math.cos(ang))
        .addScaledVector(v, R * Math.sin(ang));
      A = toPt(state.angleA);
      B = toPt(state.angleB);
      P = toPt(state.angleP);
      circleInfo = { normal, center: new THREE.Vector3(0, 0, 0), radius: R, u, v };
    } else {
      A = new THREE.Vector3(R * Math.cos(state.angleA), 0, R * Math.sin(state.angleA));
      B = new THREE.Vector3(R * Math.cos(state.angleB), 0, R * Math.sin(state.angleB));
      P = new THREE.Vector3(R * Math.cos(state.angleP), 0, R * Math.sin(state.angleP));
      circleInfo = { normal: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, 0, 0), radius: R, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) };
    }

    const O = new THREE.Vector3(0, 0, 0);
    circleInfo.center = O;
    circleInfo.radius = R;
    this.circleInfo = circleInfo;

    alignCircleWireToPlane(this.circleWire, circleInfo.normal, circleInfo.center, circleInfo.radius, THREE);

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP.position.copy(P);

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOP.geometry.setFromPoints([O, P]);
    this.lineOP.computeLineDistances();

    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;
    this.lineOP.visible = state.showSplit !== false;

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    const showGeodesicOverlay = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);

    let sExcess = null;
    let capCenter = null;

    // Straight Euclidean chords cutting through the interior of the translucent sphere
    this.linePA.geometry.setFromPoints([P, A]);
    this.linePB.geometry.setFromPoints([P, B]);
    this.linePA.visible = true;
    this.linePB.visible = true;

    // Flat Euclidean triangles in R^3
    setTriVertices(this.triOPAMesh.geometry, O, P, A);
    setTriVertices(this.triOPBMesh.geometry, O, P, B);
    this.triOPAMesh.visible = showArea;
    this.triOPBMesh.visible = showArea;

    const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP);
    if (isSolid || isSpatial) {
      setSector3DVertices(this.sectorMesh.geometry, O, circleInfo.u, circleInfo.v, R, arcRange.start, arcRange.sweep, 32, THREE);
    } else {
      setSectorXZVertices(this.sectorMesh.geometry, 0, 0, R, arcRange.start, arcRange.sweep, 32);
    }
    this.sectorMesh.visible = showArea;

    if (isSpatial) {
      // Curved subtended arc on the sphere surface S² (distinct PALETTE.amber token)
      updateGeodesicArc3D(this.geodesicArcAB, A, B, R);
      const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
      this.geodesicArcAB.visible = showGeodesic;

      // Geodesic chord overlays on S² (optional dual overlay)
      if (showGeodesicOverlay) {
        updateGeodesicArc3D(this.geodesicArcPA, P, A, R);
        updateGeodesicArc3D(this.geodesicArcPB, P, B, R);
        this.geodesicArcPA.visible = true;
        this.geodesicArcPB.visible = true;
      } else {
        this.geodesicArcPA.visible = false;
        this.geodesicArcPB.visible = false;
      }

      // Spherical triangle cap on S² (optional dual overlay)
      if (showSphericalCap) {
        updateSphericalTriangleMesh(this.sphericalCapMesh, A, B, P, R);
        this.sphericalCapMesh.visible = showArea;
        sExcess = computeSphericalTriangleExcess(A, B, P, R, THREE);
        const cX = (A.x + B.x + P.x) / 3;
        const cY = (A.y + B.y + P.y) / 3;
        const cZ = (A.z + B.z + P.z) / 3;
        const cLen = Math.hypot(cX, cY, cZ) || 1;
        capCenter = new THREE.Vector3((cX / cLen) * (R * 1.08), (cY / cLen) * (R * 1.08), (cZ / cLen) * (R * 1.08));
      } else {
        this.sphericalCapMesh.visible = false;
      }
    } else {
      this.geodesicArcPA.visible = false;
      this.geodesicArcPB.visible = false;
      this.geodesicArcAB.visible = false;
      this.sphericalCapMesh.visible = false;
    }

    // Inscribed angle wedge measures the true Euclidean angle between straight chords PA and PB
    setAngleWedgeVertices3D(this.inscribedAngleMesh, P, A, B, 2.4);
    setAngleWedgeVertices3D(this.inscribedReflexMesh, P, A, B, 3.0, 32, THREE, true);

    const isReflexSubtended = arcRange.sweep > Math.PI;
    setAngleWedgeVertices3D(this.centralAngleMesh, O, A, B, 2.6, 24, THREE, isReflexSubtended);
    setAngleWedgeVertices3D(this.centralReflexMesh, O, A, B, 3.2, 32, THREE, !isReflexSubtended);
    setAngleWedgeVertices3D(this.angleAlphaPMesh, P, A, O, 2.8);
    setAngleWedgeVertices3D(this.angleBetaPMesh, P, O, B, 2.8);
    setAngleWedgeVertices3D(this.angleAlphaAMesh, A, O, P, 2.6);
    setAngleWedgeVertices3D(this.angleBetaBMesh, B, O, P, 2.6);
    this.centralAngleMesh.visible = this.inscribedAngleMesh.visible = showAngles;
    this.centralReflexMesh.visible = this.inscribedReflexMesh.visible = showReflex;
    this.angleAlphaPMesh.visible = this.angleBetaPMesh.visible = showAngles;
    this.angleAlphaAMesh.visible = this.angleBetaBMesh.visible = showAngles;

    const degCent = (arcRange.sweep * 180) / Math.PI;
    const degInsc = get3DAngleDegrees(P, A, B, THREE);
    const degAlpha = get3DAngleDegrees(P, A, O, THREE);
    const degBeta = get3DAngleDegrees(P, O, B, THREE);

    const centralLabelPos = isReflexSubtended
      ? get3DReflexBisector(O, A, B, 3.8, THREE)
      : get3DAngleBisector(O, A, B, 3.8, THREE);
    const centralReflexPos = isReflexSubtended
      ? get3DAngleBisector(O, A, B, 4.2, THREE)
      : get3DReflexBisector(O, A, B, 4.2, THREE);
    const inscribedLabelPos = get3DAngleBisector(P, A, B, 5.2, THREE);
    // Stagger alpha at 2.8 and beta at 4.8 to guarantee zero spatial collision in 3D
    const alphaLabelPos = get3DAngleBisector(P, A, O, 2.8, THREE);
    const betaLabelPos = get3DAngleBisector(P, O, B, 4.8, THREE);
    const alphaALabelPos = get3DAngleBisector(A, O, P, 3.8, THREE);
    const betaBLabelPos = get3DAngleBisector(B, O, P, 3.8, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const P_pos = P.clone().multiplyScalar(1.15);
    const O_pos = isSpatial ? O.clone().add(new THREE.Vector3(0, 0.8, 0)) : new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-indigo' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-red' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'P', at: P_pos, name: 'P', text: 'P', coords: P, color: 'color-violet' },
      { key: 'central', at: centralLabelPos, text: `2θ = ${degCent.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
      { key: 'inscribed', at: inscribedLabelPos, text: `θ = ${degInsc.toFixed(1)}°`, isAngle: true, color: 'color-green', show: showAngles },
      { key: 'centralReflex', at: centralReflexPos, text: `2θ* = ${(360 - degCent).toFixed(1)}°`, isAngle: true, color: 'color-teal', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'inscribedReflex', at: get3DReflexBisector(P, A, B, 4.0, THREE), text: `θ* = ${(360 - degInsc).toFixed(1)}°`, isAngle: true, color: 'color-teal', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'alphaP', at: alphaLabelPos, text: `α = ${degAlpha.toFixed(1)}°`, isAngle: true, color: 'color-lime', show: showAngles },
      { key: 'betaP', at: betaLabelPos, text: `β = ${degBeta.toFixed(1)}°`, isAngle: true, color: 'color-fuchsia', show: showAngles },
      { key: 'alphaA', at: alphaALabelPos, text: `α = ${degAlpha.toFixed(1)}°`, isAngle: true, color: 'color-lime', show: showAngles },
      { key: 'betaB', at: betaBLabelPos, text: `β = ${degBeta.toFixed(1)}°`, isAngle: true, color: 'color-fuchsia', show: showAngles },
    ];
    if (isSpatial && capCenter && sExcess) {
      this.currentLabels.push({
        key: 'excess',
        at: capCenter,
        text: `Excess E = ${sExcess.excessDeg.toFixed(1)}°`,
        isAngle: true,
        color: 'color-amber',
        show: true,
      });
    }
    this.lastComputed3D = {
      degCentral: degCent,
      degInscribed: degInsc,
      degAlpha,
      degBeta,
      ratio: degInsc > 1e-4 ? degCent / degInsc : 2.0,
      reflexCentral: 360 - degCent,
      reflexInscribed: 360 - degInsc,
      perigon: 360,
      excessDeg: sExcess ? sExcess.excessDeg : 0,
      sphArea: sExcess ? sExcess.area : 0,
      O, A, B, P,
      R3D: R,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 2. Angles in Same Segment 3D Scene View
 */
export class AnglesInSameSegment3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.indigo, 0.16);
    this.markerA = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerP1 = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerP2 = makeMarker(THREE, PALETTE.emerald, 0.18);

    this.chordAB = makeLine(THREE, PALETTE.red);
    this.lineOA = makeLine(THREE, PALETTE.indigo, true);
    this.lineOB = makeLine(THREE, PALETTE.indigo, true);
    this.lineP1A = makeLine(THREE, PALETTE.blue);
    this.lineP1B = makeLine(THREE, PALETTE.blue);
    this.lineP2A = makeLine(THREE, PALETTE.emerald);
    this.lineP2B = makeLine(THREE, PALETTE.emerald);

    // Spherical Great-Circle Geodesic Arcs & Mesh Caps on S² (Distinct PALETTE.amber token for boundary arc primitive)
    this.geodesicChordAB = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicP1A = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicP1B = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicP2A = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicP2B = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.sphericalCap1 = createSphericalTriangleMesh(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), R, PALETTE.blue, 0.16);
    this.sphericalCap2 = createSphericalTriangleMesh(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), R, PALETTE.emerald, 0.16);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.emerald, 0.16);
    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.12);
    this.centralAngleMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.28);
    this.angleP1Mesh = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.28);
    this.angleP2Mesh = makeAngleWedgeMesh(THREE, PALETTE.emerald, 0.28);
    this.reflexP1Mesh = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.25);
    this.reflexP2Mesh = makeAngleWedgeMesh(THREE, PALETTE.emerald, 0.25);

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerP1, this.markerP2,
      this.chordAB, this.lineOA, this.lineOB,
      this.lineP1A, this.lineP1B, this.lineP2A, this.lineP2B,
      this.geodesicChordAB, this.geodesicP1A, this.geodesicP1B, this.geodesicP2A, this.geodesicP2B,
      this.sphericalCap1, this.sphericalCap2,
      this.segmentMesh, this.tri1Mesh, this.tri2Mesh,
      this.centralAngleMesh, this.angleP1Mesh, this.angleP2Mesh,
      this.reflexP1Mesh, this.reflexP2Mesh
    );

    const TAU = Math.PI * 2;
    const norm = (a) => ((a % TAU) + TAU) % TAU;
    const clampAngleToSeg = (targetAng, aA, aB, refAng, margin = 0.08) => {
      const t = norm(targetAng);
      const a = norm(aA);
      const b = norm(aB);
      const ref = norm(refAng);
      const sweepCW = norm(b - a);
      const refOffset = norm(ref - a);
      const refInCW = (refOffset > 0 && refOffset < sweepCW);
      const start = refInCW ? a : b;
      const sweep = refInCW ? sweepCW : (TAU - sweepCW);
      const effectiveMargin = Math.min(margin, sweep * 0.1);
      const offset = norm(t - start);
      if (offset >= effectiveMargin && offset <= sweep - effectiveMargin) {
        return t;
      }
      if (offset < effectiveMargin) {
        return norm(start + effectiveMargin);
      }
      if (offset <= sweep) {
        return norm(start + sweep - effectiveMargin);
      }
      const distFromEnd = offset - sweep;
      const distFromStart = TAU - offset;
      return distFromEnd < distFromStart
        ? norm(start + sweep - effectiveMargin)
        : norm(start + effectiveMargin);
    };

    this.draggableTargets = [
      {
        id: 'P1',
        mesh: this.markerP1,
        field: 'angleP1',
        latField: 'latP1',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const p1 = clampAngleToSeg(angle, st.angleA, st.angleB, st.angleP1);
          const sep1 = clampMinAngleDistance(p1, st.angleP2, 0.12);
          store.set({ angleP1: clampAngleToSeg(sep1, st.angleA, st.angleB, st.angleP1) });
        },
      },
      {
        id: 'P2',
        mesh: this.markerP2,
        field: 'angleP2',
        latField: 'latP2',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          if (st.dimensionMode === 'spatial' && this.circleInfo && hit) {
            const d = hit.clone().sub(this.circleInfo.center);
            let psi = Math.atan2(d.dot(this.circleInfo.v), d.dot(this.circleInfo.u));
            if (psi < 0) psi += Math.PI * 2;
            const TAU = Math.PI * 2;
            const norm = (a) => ((a % TAU) + TAU) % TAU;
            const sweepCW2D = norm(st.angleB - st.angleA);
            const p1Offset2D = norm(st.angleP1 - st.angleA);
            const p1InCW2D = (p1Offset2D > 0 && p1Offset2D < sweepCW2D);
            const segStart2D = p1InCW2D ? st.angleA : st.angleB;
            const segSweep2D = p1InCW2D ? sweepCW2D : (TAU - sweepCW2D);

            const toCircleAngle = (pt) => {
              const dPt = new this.THREE.Vector3().subVectors(pt, this.circleInfo.center);
              return norm(Math.atan2(dPt.dot(this.circleInfo.v), dPt.dot(this.circleInfo.u)));
            };
            const psiA = toCircleAngle(this.markerA.position);
            const psiB = toCircleAngle(this.markerB.position);
            const psiP1 = toCircleAngle(this.markerP1.position);
            const sweepCWSpatial = norm(psiB - psiA);
            const p1OffsetSpatial = norm(psiP1 - psiA);
            const p1InCWSpatial = (p1OffsetSpatial > 0 && p1OffsetSpatial < sweepCWSpatial);
            const segStartSpatial = p1InCWSpatial ? psiA : psiB;
            const segSweepSpatial = p1InCWSpatial ? sweepCWSpatial : (TAU - sweepCWSpatial);

            const rawT = norm(psi - segStartSpatial) / (segSweepSpatial || 1);
            const tClamped = Math.max(0.01, Math.min(0.99, rawT));
            const newAngleP2 = norm(segStart2D + tClamped * segSweep2D);
            store.set({ angleP2: newAngleP2 });
            return;
          }
          // Always constrain P2 to P1's segment so both remain strictly in the SAME segment
          const p2 = clampAngleToSeg(angle, st.angleA, st.angleB, st.angleP1);
          store.set({ angleP2: p2 });
        },
      },
      {
        id: 'A',
        mesh: this.markerA,
        field: 'angleA',
        latField: 'latA',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const nextA = clampMinAngleDistance(angle, st.angleB, 0.25);
          const p1 = clampAngleToSeg(st.angleP1, nextA, st.angleB, st.angleP1);
          const p2 = clampAngleToSeg(st.angleP2, nextA, st.angleB, st.angleP1);
          store.set({ angleA: nextA, angleP1: p1, angleP2: p2 });
        },
      },
      {
        id: 'B',
        mesh: this.markerB,
        field: 'angleB',
        latField: 'latB',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const nextB = clampMinAngleDistance(angle, st.angleA, 0.25);
          const p1 = clampAngleToSeg(st.angleP1, st.angleA, nextB, st.angleP1);
          const p2 = clampAngleToSeg(st.angleP2, st.angleA, nextB, st.angleP1);
          store.set({ angleB: nextB, angleP1: p1, angleP2: p2 });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const isSolid = isSolidMode(state.dimensionMode);
    let A, B, P1, P2, circleInfo;
    if (isSolid || isSpatial) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      const { u, v, normal } = frame;
      const toPt = (ang) => new THREE.Vector3()
        .addScaledVector(u, R * Math.cos(ang))
        .addScaledVector(v, R * Math.sin(ang));
      A = toPt(state.angleA);
      B = toPt(state.angleB);
      P1 = toPt(state.angleP1);
      P2 = toPt(state.angleP2);
      circleInfo = { normal, center: new THREE.Vector3(0, 0, 0), radius: R, u, v };
    } else {
      A = new THREE.Vector3(R * Math.cos(state.angleA), 0, R * Math.sin(state.angleA));
      B = new THREE.Vector3(R * Math.cos(state.angleB), 0, R * Math.sin(state.angleB));
      P1 = new THREE.Vector3(R * Math.cos(state.angleP1), 0, R * Math.sin(state.angleP1));
      P2 = new THREE.Vector3(R * Math.cos(state.angleP2), 0, R * Math.sin(state.angleP2));
      circleInfo = { normal: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, 0, 0), radius: R, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) };
    }
    const O = isSpatial ? circleInfo.center : new THREE.Vector3(0, 0, 0);
    this.circleInfo = circleInfo;

    alignCircleWireToPlane(this.circleWire, circleInfo.normal, circleInfo.center, circleInfo.radius, THREE);

    let segStartSpatial = 0;
    let segSweepSpatial = Math.PI * 2;
    if (isSpatial) {
      // Keep P2 strictly concyclic on the small circle wire on S² AND in the exact SAME segment as P1
      const TAU = Math.PI * 2;
      const norm = (a) => ((a % TAU) + TAU) % TAU;

      // 2D relative position of P2 within the active segment arc
      const sweepCW2D = norm(state.angleB - state.angleA);
      const p1Offset2D = norm(state.angleP1 - state.angleA);
      const p1InCW2D = (p1Offset2D > 0 && p1Offset2D < sweepCW2D);
      const segStart2D = p1InCW2D ? state.angleA : state.angleB;
      const segSweep2D = p1InCW2D ? sweepCW2D : (TAU - sweepCW2D);
      const rawT = norm(state.angleP2 - segStart2D) / (segSweep2D || 1);
      const t2 = Math.max(0.01, Math.min(0.99, rawT));

      // Circle plane local angular coordinates for A, B, P1
      const toCircleAngle = (pt) => {
        const d = new THREE.Vector3().subVectors(pt, circleInfo.center);
        return norm(Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u)));
      };
      const psiA = toCircleAngle(A);
      const psiB = toCircleAngle(B);
      const psiP1 = toCircleAngle(P1);

      // In the circle wire plane, identify the arc between A and B containing P1
      const sweepCWSpatial = norm(psiB - psiA);
      const p1OffsetSpatial = norm(psiP1 - psiA);
      const p1InCWSpatial = (p1OffsetSpatial > 0 && p1OffsetSpatial < sweepCWSpatial);
      segStartSpatial = p1InCWSpatial ? psiA : psiB;
      segSweepSpatial = p1InCWSpatial ? sweepCWSpatial : (TAU - sweepCWSpatial);

      // Map P2 into the identical segment arc so ∠AP1B ≡ ∠AP2B exactly
      const psiP2 = norm(segStartSpatial + t2 * segSweepSpatial);
      P2 = circleInfo.center.clone()
        .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiP2))
        .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiP2));
    }

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP1.position.copy(P1);
    this.markerP2.position.copy(P2);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false) && (state.showShading !== false);
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    const showGeodesicOverlay = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);

    let ex1 = null;
    let capCenter1 = null;

    // Straight Euclidean chords cutting through the interior of the translucent sphere
    this.chordAB.geometry.setFromPoints([A, B]);
    this.lineP1A.geometry.setFromPoints([P1, A]);
    this.lineP1B.geometry.setFromPoints([P1, B]);
    this.lineP2A.geometry.setFromPoints([P2, A]);
    this.lineP2B.geometry.setFromPoints([P2, B]);
    this.chordAB.visible = true;
    this.lineP1A.visible = true;
    this.lineP1B.visible = true;
    this.lineP2A.visible = true;
    this.lineP2B.visible = true;

    // Flat Euclidean triangles in R^3
    setTriVertices(this.tri1Mesh.geometry, P1, A, B);
    setTriVertices(this.tri2Mesh.geometry, P2, A, B);
    this.tri1Mesh.visible = showArea;
    this.tri2Mesh.visible = showArea;

    if (isSpatial) {
      const segStart = segStartSpatial;
      const segSweep = segSweepSpatial;
      setSegment3DVertices(this.segmentMesh.geometry, circleInfo.center, circleInfo.u, circleInfo.v, circleInfo.radius, segStart, segSweep, 32, THREE);
      this.segmentMesh.visible = showArea;

      // Curved subtended arc on the sphere surface S² (distinct PALETTE.amber primitive)
      updateGeodesicArc3D(this.geodesicChordAB, A, B, R);
      const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
      this.geodesicChordAB.visible = showGeodesic;

      // Geodesic chord overlays on S² (optional dual overlay)
      if (showGeodesicOverlay) {
        updateGeodesicArc3D(this.geodesicP1A, P1, A, R);
        updateGeodesicArc3D(this.geodesicP1B, P1, B, R);
        updateGeodesicArc3D(this.geodesicP2A, P2, A, R);
        updateGeodesicArc3D(this.geodesicP2B, P2, B, R);
        this.geodesicP1A.visible = true;
        this.geodesicP1B.visible = true;
        this.geodesicP2A.visible = true;
        this.geodesicP2B.visible = true;
      } else {
        this.geodesicP1A.visible = false;
        this.geodesicP1B.visible = false;
        this.geodesicP2A.visible = false;
        this.geodesicP2B.visible = false;
      }

      // Spherical triangle caps on S² (optional dual overlay)
      if (showSphericalCap) {
        updateSphericalTriangleMesh(this.sphericalCap1, A, B, P1, R);
        updateSphericalTriangleMesh(this.sphericalCap2, A, B, P2, R);
        this.sphericalCap1.visible = showArea;
        this.sphericalCap2.visible = showArea;

        ex1 = computeSphericalTriangleExcess(A, B, P1, R, THREE);
        const c1X = (A.x + B.x + P1.x) / 3, c1Y = (A.y + B.y + P1.y) / 3, c1Z = (A.z + B.z + P1.z) / 3;
        const c1Len = Math.hypot(c1X, c1Y, c1Z) || 1;
        capCenter1 = new THREE.Vector3((c1X / c1Len) * (R * 1.08), (c1Y / c1Len) * (R * 1.08), (c1Z / c1Len) * (R * 1.08));
      } else {
        this.sphericalCap1.visible = false;
        this.sphericalCap2.visible = false;
      }
    } else {
      this.geodesicChordAB.visible = false;
      this.geodesicP1A.visible = false;
      this.geodesicP1B.visible = false;
      this.geodesicP2A.visible = false;
      this.geodesicP2B.visible = false;
      this.sphericalCap1.visible = false;
      this.sphericalCap2.visible = false;

      const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP1);
      const TAU = Math.PI * 2;
      const segStart = (arcRange.start + arcRange.sweep) % TAU;
      const segSweep = TAU - arcRange.sweep;
      if (isSolid) {
        setSegment3DVertices(this.segmentMesh.geometry, circleInfo.center, circleInfo.u, circleInfo.v, circleInfo.radius, segStart, segSweep, 32, THREE);
      } else {
        setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);
      }
      this.segmentMesh.visible = showArea;
    }

    // Inscribed angle wedges measure the true Euclidean angles between straight chords
    setAngleWedgeVertices3D(this.angleP1Mesh, P1, A, B, 2.4);
    setAngleWedgeVertices3D(this.angleP2Mesh, P2, A, B, 2.4);
    setAngleWedgeVertices3D(this.reflexP1Mesh, P1, A, B, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexP2Mesh, P2, A, B, 3.0, 32, THREE, true);

    this.markerO.position.copy(O);
    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOA.computeLineDistances?.();
    this.lineOB.computeLineDistances?.();

    const showCenter = state.showCenter !== false;
    this.markerO.visible = this.lineOA.visible = this.lineOB.visible = showCenter;

    const isP1AngleVisible = showAngles && isLabelVisible('θ₁', state.vis3d) && isLabelVisible('angP1', state.vis3d) && isLabelVisible('θ1', state.vis3d) && isLabelVisible('θ', state.vis3d);
    const isP2AngleVisible = showAngles && isLabelVisible('θ₂', state.vis3d) && isLabelVisible('angP2', state.vis3d) && isLabelVisible('θ2', state.vis3d) && isLabelVisible('θ', state.vis3d);
    const isCentralVisible = showCenter && showAngles && isLabelVisible('2θ', state.vis3d) && isLabelVisible('central', state.vis3d);

    this.angleP1Mesh.visible = isP1AngleVisible;
    this.angleP2Mesh.visible = isP2AngleVisible;
    this.reflexP1Mesh.visible = showReflex && isP1AngleVisible;
    this.reflexP2Mesh.visible = showReflex && isP2AngleVisible;

    setAngleWedgeVertices3D(this.centralAngleMesh, O, A, B, 2.6);
    this.centralAngleMesh.visible = isCentralVisible;

    const degP1 = get3DAngleDegrees(P1, A, B, THREE);
    const degP2 = get3DAngleDegrees(P2, A, B, THREE);
    const degCent = get3DAngleDegrees(O, A, B, THREE);
    const p1LabelPos = get3DAngleBisector(P1, A, B, 3.4, THREE);
    const p2LabelPos = get3DAngleBisector(P2, A, B, 3.4, THREE);
    const centLabelPos = get3DAngleBisector(O, A, B, 3.8, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const P1_pos = P1.clone().multiplyScalar(1.15);
    const P2_pos = P2.clone().multiplyScalar(1.15);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-red' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-red' },
      { key: 'P1', at: P1_pos, name: 'P₁', text: 'P₁', coords: P1, color: 'color-blue' },
      { key: 'P2', at: P2_pos, name: 'P₂', text: 'P₂', coords: P2, color: 'color-emerald' },
      { key: 'angP1', name: 'θ₁', at: p1LabelPos, text: `θ₁ = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: isP1AngleVisible },
      { key: 'angP2', name: 'θ₂', at: p2LabelPos, text: `θ₂ = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: isP2AngleVisible },
      { key: 'reflexP1', name: 'θ₁*', at: get3DReflexBisector(P1, A, B, 4.0, THREE), text: `θ₁* = ${(360 - degP1).toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showReflex && isP1AngleVisible && (state.vis3d?.labels !== false) },
      { key: 'reflexP2', name: 'θ₂*', at: get3DReflexBisector(P2, A, B, 4.0, THREE), text: `θ₂* = ${(360 - degP2).toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showReflex && isP2AngleVisible && (state.vis3d?.labels !== false) },
    ];
    if (showCenter) {
      const oPos = isSpatial ? O.clone().add(circleInfo.normal.clone().multiplyScalar(0.8)) : new THREE.Vector3(0, 0.8, 0);
      this.currentLabels.push(
        { key: 'O', at: oPos, name: 'O', text: 'O', coords: O, color: 'color-indigo' },
        { key: 'central', name: '2θ', at: centLabelPos, text: `2θ = ${degCent.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: isCentralVisible }
      );
    }
    if (isSpatial && showGeodesic) {
      const midArc = new THREE.Vector3().addVectors(A, B).normalize().multiplyScalar(R * 1.08);
      const uA = A.clone().normalize();
      const uB = B.clone().normalize();
      const dotAB = Math.max(-1, Math.min(1, uA.dot(uB)));
      const dCent = Math.acos(dotAB);
      const arcLen3D = R * dCent;
      this.currentLabels.push({
        key: 'arcAB',
        at: midArc,
        text: `Arc AB = ${arcLen3D.toFixed(1)}`,
        isAngle: true,
        color: 'color-amber',
        show: true,
      });
    }
    if (isSpatial && capCenter1 && ex1) {
      this.currentLabels.push({
        key: 'excess',
        at: capCenter1,
        text: `Excess E = ${ex1.excessDeg.toFixed(1)}°`,
        isAngle: true,
        color: 'color-amber',
        show: true,
      });
    }
    this.lastComputed3D = {
      degP1,
      degP2,
      diffDeg: Math.abs(degP1 - degP2),
      degCent,
      reflexP1: 360 - degP1,
      reflexP2: 360 - degP2,
      P1, P2, A, B, O,
      R3D: R,
      chordAB: A.distanceTo(B),
      arcAB: isSpatial ? R * Math.acos(Math.max(-1, Math.min(1, A.clone().normalize().dot(B.clone().normalize())))) : R * Math.abs(state.angleB - state.angleA),
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 3. Cyclic Quadrilateral 3D Scene View
 */
export class CyclicQuad3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerA = makeMarker(THREE, PALETTE.violet, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.cyan, 0.18);
    this.markerC = makeMarker(THREE, PALETTE.amber, 0.18);
    this.markerD = makeMarker(THREE, PALETTE.rose, 0.18);

    this.edgeAB = makeLine(THREE, PALETTE.indigo);
    this.edgeBC = makeLine(THREE, PALETTE.indigo);
    this.edgeCD = makeLine(THREE, PALETTE.indigo);
    this.edgeDA = makeLine(THREE, PALETTE.indigo);

    this.diagAC = makeLine(THREE, PALETTE.lavender, true);
    this.diagBD = makeLine(THREE, PALETTE.sky, true);
    this.rayExteriorArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 4.5, PALETTE.rose, 0.7, 0.35);

    // Spherical Geodesic Great-Circle Arcs & Mesh Caps on S²
    this.geodesicAB = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicBC = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicCD = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicDA = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber);
    this.geodesicDiagAC = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber, 36, true);
    this.geodesicDiagBD = createGeodesicArc3D(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), R, PALETTE.amber, 36, true);
    this.sphQuadMesh1 = createSphericalTriangleMesh(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), R, PALETTE.indigo, 0.16);
    this.sphQuadMesh2 = createSphericalTriangleMesh(THREE, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), R, PALETTE.indigo, 0.16);

    this.quadMesh1 = makeTriMesh(THREE, PALETTE.indigo, 0.14);
    this.quadMesh2 = makeTriMesh(THREE, PALETTE.indigo, 0.14);
    this.angleAMesh = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.28);
    this.angleBMesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.28);
    this.angleCMesh = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.28);
    this.angleDMesh = makeAngleWedgeMesh(THREE, PALETTE.rose, 0.28);
    this.angleExtMesh = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.28);
    this.reflexAMesh = makeAngleWedgeMesh(THREE, PALETTE.violet, 0.22);
    this.reflexBMesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.22);
    this.reflexCMesh = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.22);
    this.reflexDMesh = makeAngleWedgeMesh(THREE, PALETTE.rose, 0.22);

    this.scene.add(
      this.markerA, this.markerB, this.markerC, this.markerD,
      this.edgeAB, this.edgeBC, this.edgeCD, this.edgeDA,
      this.diagAC, this.diagBD, this.rayExteriorArrow,
      this.geodesicAB, this.geodesicBC, this.geodesicCD, this.geodesicDA,
      this.geodesicDiagAC, this.geodesicDiagBD,
      this.sphQuadMesh1, this.sphQuadMesh2,
      this.quadMesh1, this.quadMesh2,
      this.angleAMesh, this.angleBMesh, this.angleCMesh, this.angleDMesh, this.angleExtMesh,
      this.reflexAMesh, this.reflexBMesh, this.reflexCMesh, this.reflexDMesh
    );

    const TAU_CQ = Math.PI * 2;
    const normCQ = (a) => ((a % TAU_CQ) + TAU_CQ) % TAU_CQ;
    const toCircleAngleCQ = (hit) => {
      if (!this.circleInfo || !hit) return 0;
      const dHit = new this.THREE.Vector3().subVectors(hit, this.circleInfo.center);
      return normCQ(Math.atan2(dHit.dot(this.circleInfo.v), dHit.dot(this.circleInfo.u)));
    };

    this.draggableTargets = [
      {
        id: 'A',
        mesh: this.markerA,
        field: 'angleA',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampCyclicAngle(targetAng, st.angleB, st.angleD, st.angleC, 0.2);
          store.set({ angleA: clamped });
        },
      },
      {
        id: 'B',
        mesh: this.markerB,
        field: 'angleB',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampCyclicAngle(targetAng, st.angleA, st.angleC, st.angleD, 0.2);
          store.set({ angleB: clamped });
        },
      },
      {
        id: 'C',
        mesh: this.markerC,
        field: 'angleC',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const targetAng = angle;
          const clamped = clampCyclicAngle(targetAng, st.angleD, st.angleB, st.angleA, 0.2);
          store.set({ angleC: clamped });
        },
      },
      {
        id: 'D',
        mesh: this.markerD,
        field: 'angleD',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          if (st.dimensionMode === 'spatial' && this.circleInfo && hit) {
            const TAU = Math.PI * 2;
            const norm = (a) => ((a % TAU) + TAU) % TAU;

            // Canonical 2D arc containing D (between A and C, excluding B) with t in [0, 1] (0 = A, 1 = C)
            const sweepPos2D = norm(st.angleC - st.angleA);
            const bOffset2D = norm(st.angleB - st.angleA);
            const bInPos2D = (bOffset2D > 0 && bOffset2D < sweepPos2D);
            const sweepAC2D = bInPos2D ? -(TAU - sweepPos2D) : sweepPos2D;

            // 3D circle plane local angular coordinates for A, B, C
            const toCircleAngle = (pt) => {
              const dPt = new this.THREE.Vector3().subVectors(pt, this.circleInfo.center);
              return norm(Math.atan2(dPt.dot(this.circleInfo.v), dPt.dot(this.circleInfo.u)));
            };
            const psiA = toCircleAngle(this.markerA.position);
            const psiB = toCircleAngle(this.markerB.position);
            const psiC = toCircleAngle(this.markerC.position);

            const sweepPosSpatial = norm(psiC - psiA);
            const bOffsetSpatial = norm(psiB - psiA);
            const bInPosSpatial = (bOffsetSpatial > 0 && bOffsetSpatial < sweepPosSpatial);
            const sweepACSpatial = bInPosSpatial ? -(TAU - sweepPosSpatial) : sweepPosSpatial;

            // Hit point's angular coordinate on 3D circle plane
            const dHit = new this.THREE.Vector3().subVectors(hit, this.circleInfo.center);
            const psiHit = norm(Math.atan2(dHit.dot(this.circleInfo.v), dHit.dot(this.circleInfo.u)));

            const rawT = sweepACSpatial > 0
              ? norm(psiHit - psiA) / sweepACSpatial
              : norm(psiA - psiHit) / (-sweepACSpatial);
            const tClamped = Math.max(0.01, Math.min(0.99, rawT));
            const newAngleD = norm(st.angleA + tClamped * sweepAC2D);
            const clamped = clampCyclicAngle(newAngleD, st.angleC, st.angleA, st.angleB, 0.2);
            store.set({ angleD: clamped });
            return;
          }
          const clamped = clampCyclicAngle(angle, st.angleC, st.angleA, st.angleB, 0.2);
          store.set({ angleD: clamped });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const isSolid = isSolidMode(state.dimensionMode);
    let A, B, C, D, circleInfo;
    if (isSolid || isSpatial) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      const { u, v, normal } = frame;
      const toPt = (ang) => new THREE.Vector3()
        .addScaledVector(u, R * Math.cos(ang))
        .addScaledVector(v, R * Math.sin(ang));
      A = toPt(state.angleA);
      B = toPt(state.angleB);
      C = toPt(state.angleC);
      D = toPt(state.angleD);
      circleInfo = { normal, center: new THREE.Vector3(0, 0, 0), radius: R, u, v };
    } else {
      A = new THREE.Vector3(R * Math.cos(state.angleA), 0, R * Math.sin(state.angleA));
      B = new THREE.Vector3(R * Math.cos(state.angleB), 0, R * Math.sin(state.angleB));
      C = new THREE.Vector3(R * Math.cos(state.angleC), 0, R * Math.sin(state.angleC));
      D = new THREE.Vector3(R * Math.cos(state.angleD), 0, R * Math.sin(state.angleD));
      circleInfo = { normal: new THREE.Vector3(0, 1, 0), center: new THREE.Vector3(0, 0, 0), radius: R, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) };
    }
    const O = new THREE.Vector3(0, 0, 0);
    circleInfo.center = O;
    circleInfo.radius = R;
    this.circleInfo = circleInfo;

    alignCircleWireToPlane(this.circleWire, circleInfo.normal, circleInfo.center, circleInfo.radius, THREE);

    if (isSpatial) {
      // Keep D strictly concyclic on the small circle wire on S² between A and C, preserving 2D cyclic ordering
      const TAU = Math.PI * 2;
      const norm = (a) => ((a % TAU) + TAU) % TAU;

      // Canonical 2D arc containing D (between A and C, excluding B) with t in [0, 1] (0 = A, 1 = C)
      const sweepPos2D = norm(state.angleC - state.angleA);
      const bOffset2D = norm(state.angleB - state.angleA);
      const bInPos2D = (bOffset2D > 0 && bOffset2D < sweepPos2D);
      const sweepAC2D = bInPos2D ? -(TAU - sweepPos2D) : sweepPos2D;
      const rawT = sweepAC2D > 0
        ? norm(state.angleD - state.angleA) / sweepAC2D
        : norm(state.angleA - state.angleD) / (-sweepAC2D);
      const tD = Math.max(0.01, Math.min(0.99, rawT));

      // 3D circle plane local angular coordinates for A, B, C
      const toCircleAngle = (pt) => {
        const d = new THREE.Vector3().subVectors(pt, circleInfo.center);
        return norm(Math.atan2(d.dot(circleInfo.v), d.dot(circleInfo.u)));
      };
      const psiA = toCircleAngle(A);
      const psiB = toCircleAngle(B);
      const psiC = toCircleAngle(C);

      const sweepPosSpatial = norm(psiC - psiA);
      const bOffsetSpatial = norm(psiB - psiA);
      const bInPosSpatial = (bOffsetSpatial > 0 && bOffsetSpatial < sweepPosSpatial);
      const sweepACSpatial = bInPosSpatial ? -(TAU - sweepPosSpatial) : sweepPosSpatial;

      // Position D concyclically along the identical canonical spatial arc between A and C
      const psiD = norm(psiA + tD * sweepACSpatial);
      D = circleInfo.center.clone()
        .addScaledVector(circleInfo.u, circleInfo.radius * Math.cos(psiD))
        .addScaledVector(circleInfo.v, circleInfo.radius * Math.sin(psiD));
    }

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerC.position.copy(C);
    this.markerD.position.copy(D);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const showDiagonals = state.showDiagonals !== false;
    const showGeodesicOverlay = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);
    let excessQuad = 0;
    let quadCenter = null;

    // Straight Euclidean cyclic quadrilateral edges cutting through the interior of the translucent sphere
    this.edgeAB.geometry.setFromPoints([A, B]);
    this.edgeBC.geometry.setFromPoints([B, C]);
    this.edgeCD.geometry.setFromPoints([C, D]);
    this.edgeDA.geometry.setFromPoints([D, A]);
    this.edgeAB.visible = this.edgeBC.visible = this.edgeCD.visible = this.edgeDA.visible = true;

    // Straight Euclidean diagonals in R^3
    this.diagAC.geometry.setFromPoints([A, C]);
    this.diagAC.computeLineDistances();
    this.diagBD.geometry.setFromPoints([B, D]);
    this.diagBD.computeLineDistances();
    this.diagAC.visible = this.diagBD.visible = showDiagonals;

    // Flat Euclidean triangles in R^3 (secant plane triangulation of cyclic quad)
    setTriVertices(this.quadMesh1.geometry, A, B, C);
    setTriVertices(this.quadMesh2.geometry, A, C, D);
    this.quadMesh1.visible = this.quadMesh2.visible = showArea;

    const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay || state.vis3d?.geodesic);
    if (isSpatial) {
      // Curved quadrilateral boundary arcs on the sphere surface S²
      updateGeodesicArc3D(this.geodesicAB, A, B, R);
      updateGeodesicArc3D(this.geodesicBC, B, C, R);
      updateGeodesicArc3D(this.geodesicCD, C, D, R);
      updateGeodesicArc3D(this.geodesicDA, D, A, R);
      this.geodesicAB.visible = this.geodesicBC.visible = this.geodesicCD.visible = this.geodesicDA.visible = showGeodesic;

      // Geodesic diagonal overlays on S² (optional dual overlay)
      if (showGeodesic && showDiagonals) {
        updateGeodesicArc3D(this.geodesicDiagAC, A, C, R);
        updateGeodesicArc3D(this.geodesicDiagBD, B, D, R);
        this.geodesicDiagAC.visible = true;
        this.geodesicDiagBD.visible = true;
      } else {
        this.geodesicDiagAC.visible = false;
        this.geodesicDiagBD.visible = false;
      }

      // Spherical quadrilateral caps on S² (optional dual overlay)
      if (showSphericalCap) {
        updateSphericalTriangleMesh(this.sphQuadMesh1, A, B, C, R);
        updateSphericalTriangleMesh(this.sphQuadMesh2, A, C, D, R);
        this.sphQuadMesh1.visible = showArea;
        this.sphQuadMesh2.visible = showArea;

        const ex1 = computeSphericalTriangleExcess(A, B, C, R, THREE);
        const ex2 = computeSphericalTriangleExcess(A, C, D, R, THREE);
        excessQuad = ex1.excessDeg + ex2.excessDeg;

        const qX = (A.x + B.x + C.x + D.x) / 4;
        const qY = (A.y + B.y + C.y + D.y) / 4;
        const qZ = (A.z + B.z + C.z + D.z) / 4;
        const qLen = Math.hypot(qX, qY, qZ) || 1;
        quadCenter = new THREE.Vector3((qX / qLen) * (R * 1.08), (qY / qLen) * (R * 1.08), (qZ / qLen) * (R * 1.08));
      } else {
        this.sphQuadMesh1.visible = false;
        this.sphQuadMesh2.visible = false;
      }
    } else {
      this.geodesicAB.visible = false;
      this.geodesicBC.visible = false;
      this.geodesicCD.visible = false;
      this.geodesicDA.visible = false;
      this.geodesicDiagAC.visible = false;
      this.geodesicDiagBD.visible = false;
      this.sphQuadMesh1.visible = false;
      this.sphQuadMesh2.visible = false;
    }

    // Inscribed angle wedges measure the true Euclidean angles between straight chords
    setAngleWedgeVertices3D(this.angleAMesh, A, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleBMesh, B, A, C, 2.2);
    setAngleWedgeVertices3D(this.angleCMesh, C, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleDMesh, D, C, A, 2.2);

    // Exterior ray past C along DC with crisp arrow head (no sphere glob)
    const dirDC = new THREE.Vector3().subVectors(C, D).normalize();
    this.rayExteriorArrow.position.copy(C);
    this.rayExteriorArrow.setDirection(dirDC);
    this.rayExteriorArrow.setLength(4.5, 0.7, 0.35);
    this.rayExteriorArrow.visible = Boolean(state.showExterior);

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    if (state.showExterior) {
      const extPt = new THREE.Vector3().addVectors(C, dirDC.clone().multiplyScalar(4));
      setAngleWedgeVertices3D(this.angleExtMesh, C, B, extPt, 2.4);
    }
    setAngleWedgeVertices3D(this.reflexAMesh, A, B, D, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexBMesh, B, A, C, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexCMesh, C, B, D, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexDMesh, D, C, A, 3.0, 32, THREE, true);
    this.angleAMesh.visible = this.angleBMesh.visible = this.angleCMesh.visible = this.angleDMesh.visible = showAngles;
    this.angleExtMesh.visible = showAngles && Boolean(state.showExterior);
    this.reflexAMesh.visible = this.reflexBMesh.visible = this.reflexCMesh.visible = this.reflexDMesh.visible = showReflex;

    const degA = get3DAngleDegrees(A, B, D, THREE);
    const degB = get3DAngleDegrees(B, A, C, THREE);
    const degC = get3DAngleDegrees(C, B, D, THREE);
    const degD = get3DAngleDegrees(D, C, A, THREE);

    const angAPos = get3DAngleBisector(A, B, D, 3.0, THREE);
    const angBPos = get3DAngleBisector(B, A, C, 3.0, THREE);
    const angCPos = get3DAngleBisector(C, B, D, 3.0, THREE);
    const angDPos = get3DAngleBisector(D, C, A, 3.0, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const C_pos = C.clone().multiplyScalar(1.15);
    const D_pos = D.clone().multiplyScalar(1.15);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-violet' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-cyan' },
      { key: 'C', at: C_pos, name: 'C', text: 'C', coords: C, color: 'color-amber' },
      { key: 'D', at: D_pos, name: 'D', text: 'D', coords: D, color: 'color-rose' },
      { key: 'angA', at: angAPos, text: `∠A = ${degA.toFixed(1)}°`, isAngle: true, color: 'color-violet', show: showAngles },
      { key: 'angB', at: angBPos, text: `∠B = ${degB.toFixed(1)}°`, isAngle: true, color: 'color-cyan', show: showAngles },
      { key: 'angC', at: angCPos, text: `∠C = ${degC.toFixed(1)}°`, isAngle: true, color: 'color-amber', show: showAngles },
      { key: 'angD', at: angDPos, text: `∠D = ${degD.toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showAngles },
      { key: 'reflexA', at: get3DReflexBisector(A, B, D, 3.8, THREE), text: `∠A* = ${(360 - degA).toFixed(1)}°`, isAngle: true, color: 'color-violet', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflexB', at: get3DReflexBisector(B, A, C, 3.8, THREE), text: `∠B* = ${(360 - degB).toFixed(1)}°`, isAngle: true, color: 'color-cyan', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflexC', at: get3DReflexBisector(C, B, D, 3.8, THREE), text: `∠C* = ${(360 - degC).toFixed(1)}°`, isAngle: true, color: 'color-amber', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflexD', at: get3DReflexBisector(D, C, A, 3.8, THREE), text: `∠D* = ${(360 - degD).toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showReflex && (state.vis3d?.labels !== false) },
    ];
    if (showDiagonals) {
      const posAC = new THREE.Vector3().lerpVectors(A, C, 0.32);
      const posBD = new THREE.Vector3().lerpVectors(B, D, 0.32);
      const sumACVal = (degA + degC).toFixed(1);
      const sumBDVal = (degB + degD).toFixed(1);
      this.currentLabels.push(
        { key: 'sumAC', at: posAC.clone().add(new THREE.Vector3(0, 0.6, 0)), text: `AC (A+C = ${sumACVal}°)`, color: 'color-lavender', show: true },
        { key: 'sumBD', at: posBD.clone().add(new THREE.Vector3(0, -0.6, 0)), text: `BD (B+D = ${sumBDVal}°)`, color: 'color-sky', show: true }
      );
    }
    if (isSpatial && quadCenter && excessQuad > 0) {
      this.currentLabels.push({
        key: 'excess',
        at: quadCenter,
        text: `Excess E = ${excessQuad.toFixed(1)}°`,
        isAngle: true,
        color: 'color-amber',
        show: true,
      });
    }
    const extPt = new THREE.Vector3().addVectors(C, dirDC.clone().multiplyScalar(4));
    const degExt = get3DAngleDegrees(C, B, extPt, THREE);
    if (state.showExterior) {
      const angExtPos = get3DAngleBisector(C, B, extPt, 2.7, THREE);
      this.currentLabels.push({
        key: 'Ext',
        at: angExtPos,
        text: `Ext = ${degExt.toFixed(1)}°`,
        isAngle: true,
        color: 'color-violet',
        show: showAngles,
      });
    }
    this.lastComputed3D = {
      degA,
      degB,
      degC,
      degD,
      degExt,
      sumAC: degA + degC,
      sumBD: degB + degD,
      reflexA: 360 - degA,
      reflexB: 360 - degB,
      reflexC: 360 - degC,
      reflexD: 360 - degD,
      reflexSum: (360 - degA) + (360 - degB) + (360 - degC) + (360 - degD),
      diagAC: A.distanceTo(C),
      diagBD: B.distanceTo(D),
      A, B, C, D,
      R3D: R,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 4. Tangent-Radius 3D Scene View
 */
export class TangentRadius3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.blue, 0.16);
    this.markerT = makeMarker(THREE, PALETTE.red, 0.18);

    this.lineOT = makeLine(THREE, PALETTE.blue);
    this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.lime);
    this.rightAngleMarker = makeLine(THREE, PALETTE.teal);
    this.rightAngleMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);

    // Dynamic Quadrant Sector Mesh on XZ Plane
    this.quadrantMesh = makeTriMesh(THREE, PALETTE.yellow, 0.20);

    // Multi-tangent elements (indices 0..3 for up to 4 tangents)
    this.tangentMarkers = [
      this.markerT,
      makeMarker(THREE, PALETTE.red, 0.18),
      makeMarker(THREE, PALETTE.red, 0.18),
      makeMarker(THREE, PALETTE.red, 0.18),
    ];
    this.radiiLines = [
      this.lineOT,
      makeLine(THREE, PALETTE.blue),
      makeLine(THREE, PALETTE.blue),
      makeLine(THREE, PALETTE.blue),
    ];
    this.tangentDoubleArrows = [
      this.tangentDoubleArrow,
      makeDoubleArrowLine(THREE, PALETTE.lime),
      makeDoubleArrowLine(THREE, PALETTE.lime),
      makeDoubleArrowLine(THREE, PALETTE.lime),
    ];
    this.rightAngleMarkers = [
      this.rightAngleMarker,
      makeLine(THREE, PALETTE.teal),
      makeLine(THREE, PALETTE.teal),
      makeLine(THREE, PALETTE.teal),
    ];
    this.rightAngleMeshes = [
      this.rightAngleMesh,
      makeRightAngleMesh(THREE, PALETTE.teal, 0.75),
      makeRightAngleMesh(THREE, PALETTE.teal, 0.75),
      makeRightAngleMesh(THREE, PALETTE.teal, 0.75),
    ];
    this.reflexRightAngleMeshes = [
      makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25),
    ];

    // Chords connecting adjacent tangents
    this.chordLines = [
      makeLine(THREE, PALETTE.violet, true),
      makeLine(THREE, PALETTE.rose, true),
      makeLine(THREE, PALETTE.cyan, true),
      makeLine(THREE, PALETTE.fuchsia, true),
    ];

    // Subtended chord area meshes
    this.chordAreaMeshes = [
      makeTriMesh(THREE, PALETTE.violet, 0.28),
      makeTriMesh(THREE, PALETTE.rose, 0.28),
      makeTriMesh(THREE, PALETTE.cyan, 0.28),
      makeTriMesh(THREE, PALETTE.fuchsia, 0.28),
    ];

    this.secantMesh = makeTriMesh(THREE, PALETTE.yellow, 0.16);
    this.markerQ = makeMarker(THREE, PALETTE.yellow, 0.18);
    this.lineTQ = makeLine(THREE, PALETTE.yellow, true);

    // Tangent Space Plane T_T(S²) for 3D Spatial Mode
    this.tangentPlaneMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 7, 32),
      new THREE.MeshBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );

    // Geodesic Chords and Spherical Cap Meshes for 3D Spatial Mode
    this.geodesicChords = [
      createGeodesicArc3D(THREE, PALETTE.amber),
      createGeodesicArc3D(THREE, PALETTE.amber),
      createGeodesicArc3D(THREE, PALETTE.amber),
      createGeodesicArc3D(THREE, PALETTE.amber),
    ];
    this.sphChordMeshes = [
      createSphericalTriangleMesh(THREE, PALETTE.violet, 0.28),
      createSphericalTriangleMesh(THREE, PALETTE.rose, 0.28),
      createSphericalTriangleMesh(THREE, PALETTE.cyan, 0.28),
      createSphericalTriangleMesh(THREE, PALETTE.fuchsia, 0.28),
    ];

    // Trigonometric Wedges & Projections (Exclusively for Primary Tangent)
    this.lineCos = makeLine(THREE, PALETTE.sky);
    this.lineSin = makeLine(THREE, PALETTE.emerald, true);
    this.lineTan = makeLine(THREE, PALETTE.rose);
    this.lineSecantHypot = makeLine(THREE, PALETTE.violet, true);
    this.trigAngleWedgeMesh = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.25);
    this.trigTriMesh = makeTriMesh(THREE, PALETTE.sky, 0.14);
    this.secantTriMesh = makeTriMesh(THREE, PALETTE.rose, 0.12);
    this.markerTx = makeMarker(THREE, PALETTE.sky, 0.16);
    this.markerSx = makeMarker(THREE, PALETTE.rose, 0.16);

    this.scene.add(
      this.markerO,
      this.quadrantMesh,
      ...this.tangentMarkers,
      ...this.radiiLines,
      ...this.tangentDoubleArrows.map(a => a.group),
      ...this.rightAngleMarkers,
      ...this.rightAngleMeshes,
      ...this.reflexRightAngleMeshes,
      ...this.chordLines,
      ...this.chordAreaMeshes,
      ...this.geodesicChords,
      ...this.sphChordMeshes,
      this.markerQ,
      this.lineTQ,
      this.secantMesh,
      this.tangentPlaneMesh,
      this.lineCos,
      this.lineSin,
      this.lineTan,
      this.lineSecantHypot,
      this.trigAngleWedgeMesh,
      this.trigTriMesh,
      this.secantTriMesh,
      this.markerTx,
      this.markerSx
    );

    this.draggableTargets = [
      { id: 'T', mesh: this.tangentMarkers[0], field: 'angleT', latField: 'latT' },
      { id: 'T2', mesh: this.tangentMarkers[1], field: 'angleT2', latField: 'latT2' },
      { id: 'T3', mesh: this.tangentMarkers[2], field: 'angleT3', latField: 'latT3' },
      { id: 'T4', mesh: this.tangentMarkers[3], field: 'angleT4', latField: 'latT4' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';

    const O = new THREE.Vector3(0, 0, 0);
    this.markerO.position.copy(O);

    const normAngle = (rad) => {
      let a = rad % (Math.PI * 2);
      if (a < 0) a += Math.PI * 2;
      return a;
    };

    const count = Math.min(4, Math.max(1, state.tangentCount ?? 1));
    const showAngles = (state.vis3d?.angles !== false) && (state.showRightAngle !== false) && (state.showAngles !== false);
    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const showQuadrant = (state.vis3d?.quadrant !== false) && (state.showQuadrant !== false);
    const showChords = (state.vis3d?.chords !== false);

    const rawAngles = [
      state.angleT ?? state.angleP ?? 0,
      state.angleT2 ?? (3 * Math.PI / 4),
      state.angleT3 ?? (5 * Math.PI / 4),
      state.angleT4 ?? (7 * Math.PI / 4),
    ];
    const lats = [
      state.latT ?? (Math.PI / 2),
      state.latT2 ?? (Math.PI / 2),
      state.latT3 ?? (Math.PI / 2),
      state.latT4 ?? (Math.PI / 2),
    ];

    // Primary tangent angle for quadrant calculations
    const primaryAng = normAngle(rawAngles[0]);
    const quadIndex = Math.floor(primaryAng / (Math.PI / 2));
    const quadStart = quadIndex * (Math.PI / 2);

    const isSolid = isSolidMode(state.dimensionMode);
    const isOriented3D = isSolid || isSpatial;
    let primNormal, uFrame, vFrame;
    if (isOriented3D) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      primNormal = frame.normal;
      uFrame = frame.u;
      vFrame = frame.v;
      this.circleInfo = { normal: primNormal, center: O, radius: R, u: uFrame, v: vFrame };
    } else {
      primNormal = new THREE.Vector3(0, 1, 0);
      uFrame = new THREE.Vector3(1, 0, 0);
      vFrame = new THREE.Vector3(0, 0, 1);
      this.circleInfo = { normal: primNormal, center: O, radius: R, u: uFrame, v: vFrame };
    }
    alignCircleWireToPlane(this.circleWire, primNormal, O, R, THREE);

    // 1. Dynamic Quadrant Shading in 3D
    if (showQuadrant) {
      if (isSpatial) {
        let u = new THREE.Vector3(1, 0, 0).projectOnPlane(primNormal);
        if (u.lengthSq() < 1e-4) u = new THREE.Vector3(0, 0, 1).projectOnPlane(primNormal);
        u.normalize();
        let v = new THREE.Vector3().crossVectors(u, primNormal).negate().normalize();
        if (Math.abs(primNormal.y - 1) < 1e-4) {
          u = this.circleInfo.u;
          v = this.circleInfo.v;
        }
        setSector3DVertices(this.quadrantMesh.geometry, O, u, v, R, quadStart, Math.PI / 2, 32, THREE);
      } else if (isSolid) {
        setSector3DVertices(this.quadrantMesh.geometry, O, uFrame, vFrame, R, quadStart, Math.PI / 2, 32, THREE);
      } else {
        setSectorXZVertices(this.quadrantMesh.geometry, 0, 0, R, quadStart, Math.PI / 2, 32);
      }
      this.quadrantMesh.visible = true;
    } else {
      this.quadrantMesh.visible = false;
    }

    const activeTangents = [];
    const L = 14;
    const s = 1.4;

    for (let i = 0; i < 4; i++) {
      if (i < count) {
        const ang = rawAngles[i];
        const lat = lats[i];
        let T, tanDir;
        if (isOriented3D) {
          T = O.clone().addScaledVector(uFrame, R * Math.cos(ang)).addScaledVector(vFrame, R * Math.sin(ang));
          tanDir = new THREE.Vector3().addScaledVector(uFrame, -Math.sin(ang)).addScaledVector(vFrame, Math.cos(ang)).normalize();
        } else {
          T = new THREE.Vector3(
            R * Math.sin(lat) * Math.cos(ang),
            R * Math.cos(lat),
            R * Math.sin(lat) * Math.sin(ang)
          );
          tanDir = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
          if (Math.abs(Math.sin(lat)) < 0.99) {
            const radDir = T.clone().normalize();
            tanDir = new THREE.Vector3(0, 1, 0).cross(radDir).normalize();
            if (tanDir.lengthSq() < 0.01) tanDir = new THREE.Vector3(1, 0, 0).cross(radDir).normalize();
          }
        }

        this.tangentMarkers[i].position.copy(T);
        this.tangentMarkers[i].visible = true;

        this.radiiLines[i].geometry.setFromPoints([O, T]);
        this.radiiLines[i].visible = true;

        const tan1 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(-L));
        const tan2 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L));
        this.tangentDoubleArrows[i].setPoints(tan1, tan2);
        this.tangentDoubleArrows[i].group.visible = true;

        // Right-angle marker
        const normDir = new THREE.Vector3().subVectors(O, T).normalize();
        const corner1 = new THREE.Vector3().addVectors(T, normDir.clone().multiplyScalar(s));
        const corner2 = new THREE.Vector3().addVectors(corner1, tanDir.clone().multiplyScalar(s));
        const corner3 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(s));
        this.rightAngleMarkers[i].geometry.setFromPoints([corner1, corner2, corner3]);
        this.rightAngleMarkers[i].visible = showAngles;

        setRightAngle3DVertices(this.rightAngleMeshes[i], T, corner1, corner3, s);
        this.rightAngleMeshes[i].visible = showAngles;

        const showReflex = Boolean(state.vis3d?.reflex);
        setAngleWedgeVertices3D(this.reflexRightAngleMeshes[i], T, corner1, corner3, 3.0, 32, THREE, true);
        this.reflexRightAngleMeshes[i].visible = showReflex;

        const rightAngleAt = get3DAngleBisector(T, corner1, corner3, 3.0, THREE);
        const reflexAngleAt = get3DReflexBisector(T, corner1, corner3, 3.8, THREE);
        const name = count === 1 ? 'T' : `T${i + 1}`;
        activeTangents.push({ index: i, name, pos: T, tanDir, angle: normAngle(ang), rightAngleAt, reflexAngleAt });
      } else {
        this.tangentMarkers[i].visible = false;
        this.radiiLines[i].visible = false;
        this.tangentDoubleArrows[i].group.visible = false;
        this.rightAngleMarkers[i].visible = false;
        this.rightAngleMeshes[i].visible = false;
        this.reflexRightAngleMeshes[i].visible = false;
      }
    }

    if (isSpatial && activeTangents.length > 0) {
      const primaryT = activeTangents[0].pos;
      const n = primaryT.clone().normalize();
      this.tangentPlaneMesh.position.copy(primaryT);
      this.tangentPlaneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      this.tangentPlaneMesh.scale.setScalar(R / 10);
      this.tangentPlaneMesh.visible = (state.showArea !== false);
    } else {
      this.tangentPlaneMesh.visible = false;
    }

    // 2. Chords and Subtended Areas in 3D
    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);
    const chordLabels = [];
    if (count >= 2) {
      const sorted = [...activeTangents].sort((a, b) => a.angle - b.angle);
      for (let k = 0; k < 4; k++) {
        if (k < count) {
          const p1 = sorted[k];
          const p2 = sorted[(k + 1) % count];
          let sweep = p2.angle - p1.angle;
          if (sweep <= 0) sweep += Math.PI * 2;

          // Straight Euclidean chord cutting through interior of sphere
          this.chordLines[k].geometry.setFromPoints([p1.pos, p2.pos]);
          this.chordLines[k].computeLineDistances();
          this.chordLines[k].visible = showChords;

          if (isSpatial) {
            // Curved surface arc on S² (distinct PALETTE.amber token)
            updateGeodesicArc3D(this.geodesicChords[k], p1.pos, p2.pos, R * 1.002, 32);
            const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay || state.vis3d?.geodesic);
            this.geodesicChords[k].visible = showChords && showGeodesic;

            // Flat Euclidean planar triangle inside sphere
            setTriVertices(this.chordAreaMeshes[k].geometry, O, p1.pos, p2.pos);
            this.chordAreaMeshes[k].visible = showArea && showChords;

            // Optional spherical cap overlay
            if (showSphericalCap) {
              updateSphericalTriangleMesh(this.sphChordMeshes[k], O, p1.pos, p2.pos, R * 1.002, 2);
              this.sphChordMeshes[k].visible = showArea && showChords;
            } else {
              this.sphChordMeshes[k].visible = false;
            }
          } else {
            this.geodesicChords[k].visible = false;
            this.sphChordMeshes[k].visible = false;

            if (isOriented3D) {
              if (state.chordAreaMode === 'sector') {
                setSector3DVertices(this.chordAreaMeshes[k].geometry, O, uFrame, vFrame, R, p1.angle, sweep, 32, THREE);
              } else {
                setSegment3DVertices(this.chordAreaMeshes[k].geometry, O, uFrame, vFrame, R, p1.angle, sweep, 32, THREE);
              }
            } else if (state.chordAreaMode === 'sector') {
              setSectorXZVertices(this.chordAreaMeshes[k].geometry, 0, 0, R, p1.angle, sweep, 32);
            } else {
              setSegmentXZVertices(this.chordAreaMeshes[k].geometry, 0, 0, R, p1.angle, sweep, 32);
            }
            this.chordAreaMeshes[k].visible = showArea && showChords;
          }

          const midAngle = p1.angle + sweep / 2;
          const badgeR = (state.chordAreaMode === 'sector') ? (0.6 * R) : (0.85 * R);
          const badgePos = isOriented3D
            ? O.clone().addScaledVector(uFrame, badgeR * Math.cos(midAngle)).addScaledVector(vFrame, badgeR * Math.sin(midAngle)).addScaledVector(primNormal, 0.3)
            : new THREE.Vector3(badgeR * Math.cos(midAngle), 0.3, badgeR * Math.sin(midAngle));
          const areaVal = (state.chordAreaMode === 'sector') ? (0.5 * R * R * sweep) : (0.5 * R * R * (sweep - Math.sin(sweep)));
          const colClass = ['color-violet', 'color-rose', 'color-cyan', 'color-fuchsia'][k % 4];

          chordLabels.push({
            key: `chord_${k}`,
            at: badgePos,
            text: `${p1.name}${p2.name}: ${areaVal.toFixed(1)}u²`,
            color: colClass,
            show: showChords && (state.vis3d?.lengths !== false),
          });
        } else {
          this.chordLines[k].visible = false;
          this.chordAreaMeshes[k].visible = false;
          this.geodesicChords[k].visible = false;
          this.sphChordMeshes[k].visible = false;
        }
      }
    } else {
      for (let k = 0; k < 4; k++) {
        this.chordLines[k].visible = false;
        this.chordAreaMeshes[k].visible = false;
        this.geodesicChords[k].visible = false;
        this.sphChordMeshes[k].visible = false;
      }
    }

    // Secant chord & triangle (relative to primary T)
    const showSecant = Boolean(state.showSecant);
    const angQ = (rawAngles[0]) + 0.45;
    const Q = isOriented3D
      ? O.clone().addScaledVector(uFrame, R * Math.cos(angQ)).addScaledVector(vFrame, R * Math.sin(angQ))
      : new THREE.Vector3(R * Math.cos(angQ), 0, R * Math.sin(angQ));
    this.markerQ.position.copy(Q);
    this.lineTQ.geometry.setFromPoints([activeTangents[0].pos, Q]);
    this.lineTQ.computeLineDistances();
    setTriVertices(this.secantMesh.geometry, O, activeTangents[0].pos, Q);
    this.markerQ.visible = this.lineTQ.visible = showSecant;
    this.secantMesh.visible = showSecant && showArea;

    // 3D Labels
    const O_pos = new THREE.Vector3(0, 0.8, 0);
    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-blue' },
    ];

    if (showQuadrant) {
      const romans = ['I', 'II', 'III', 'IV'];
      const signs = ['(+X, +Z)', '(-X, +Z)', '(-X, -Z)', '(+X, -Z)'];
      for (let q = 0; q < 4; q++) {
        const midQuad = q * (Math.PI / 2) + Math.PI / 4;
        const qPos = isOriented3D
          ? O.clone().addScaledVector(uFrame, 0.65 * R * Math.cos(midQuad)).addScaledVector(vFrame, 0.65 * R * Math.sin(midQuad)).addScaledVector(primNormal, 0.2)
          : new THREE.Vector3(0.65 * R * Math.cos(midQuad), 0.2, 0.65 * R * Math.sin(midQuad));
        const isActive = q === quadIndex;
        if (isActive) {
          this.currentLabels.push({
            key: 'quadrant',
            at: qPos,
            text: `Quadrant ${q + 1} (${romans[q]}) ${signs[q]}`,
            color: 'color-yellow',
            show: true,
          });
        } else {
          this.currentLabels.push({
            key: `quadrant_inactive_${q}`,
            at: qPos,
            text: `Q${q + 1} (${romans[q]})`,
            color: 'color-steel',
            show: true,
          });
        }
      }
    }

    const showReflex = Boolean(state.vis3d?.reflex);
    for (const t of activeTangents) {
      const tPos = t.pos.clone().multiplyScalar(1.15);
      this.currentLabels.push({
        key: t.name,
        at: tPos,
        name: t.name,
        text: t.name,
        coords: t.pos,
        color: 'color-red',
      });
      if (showAngles) {
        this.currentLabels.push({
          key: `right_${t.name}`,
          at: t.rightAngleAt,
          text: '90°',
          isAngle: true,
          color: 'color-teal',
          show: true,
        });
      }
      if (showReflex) {
        this.currentLabels.push({
          key: `reflex_${t.name}`,
          at: t.reflexAngleAt,
          text: `270.0° (${t.name}*)`,
          isAngle: true,
          color: 'color-cyan',
          show: state.vis3d?.labels !== false,
        });
      }
    }

    if (showSecant) {
      this.currentLabels.push({
        key: 'Q',
        at: Q.clone().multiplyScalar(1.15),
        name: 'Q',
        text: 'Q',
        coords: Q,
        color: 'color-yellow',
      });
    }

    // 3D Trigonometric Wedges & Projections (Exclusively for Primary Tangent T)
    const showTrig = (state.vis3d?.trigWedges !== false) && (state.showTrigWedges !== false);
    if (showTrig && activeTangents.length > 0) {
      const prim = activeTangents[0];
      const cosVal = Math.cos(primaryAng);
      const sinVal = Math.sin(primaryAng);
      const Tx = isSolid
        ? O.clone().addScaledVector(uFrame, R * cosVal)
        : new THREE.Vector3(R * cosVal, 0, 0);

      // Horizontal line O to Tx (cos θ)
      this.lineCos.geometry.setFromPoints([O, Tx]);
      this.lineCos.visible = true;

      // Vertical altitude drop Tx to T (sin θ)
      this.lineSin.geometry.setFromPoints([Tx, prim.pos]);
      this.lineSin.computeLineDistances();
      this.lineSin.visible = true;

      // Inscribed right triangle Δ O Tx T
      setTriVertices(this.trigTriMesh.geometry, O, Tx, prim.pos);
      this.trigTriMesh.visible = true;

      this.markerTx.position.copy(Tx);
      this.markerTx.visible = true;

      // Angle θ wedge at O subtended from +X axis to primary radius OT
      const refX = isOriented3D
        ? O.clone().addScaledVector(uFrame, R * 0.35)
        : new THREE.Vector3(R * 0.35, 0, 0);
      setAngleWedgeVertices3D(this.trigAngleWedgeMesh, O, refX, prim.pos, R * 0.35, 32, THREE, false);
      this.trigAngleWedgeMesh.visible = true;

      // Secant point Sx along X-axis
      const isSecantFinite = Math.abs(cosVal) > 0.02;
      if (isSecantFinite) {
        const secVal = 1 / cosVal;
        const clampedSecX = Math.min(Math.max(R * secVal, -3.5 * R), 3.5 * R);
        const Sx = isOriented3D
          ? O.clone().addScaledVector(uFrame, clampedSecX)
          : new THREE.Vector3(clampedSecX, 0, 0);

        this.markerSx.position.copy(Sx);
        this.markerSx.visible = true;

        this.lineTan.geometry.setFromPoints([prim.pos, Sx]);
        this.lineTan.visible = true;

        this.lineSecantHypot.geometry.setFromPoints([O, Sx]);
        this.lineSecantHypot.computeLineDistances();
        this.lineSecantHypot.visible = true;

        setTriVertices(this.secantTriMesh.geometry, O, prim.pos, Sx);
        this.secantTriMesh.visible = true;

        this.currentLabels.push({
          key: 'Sx',
          at: Sx.clone().add(new THREE.Vector3(0, 0.4, 0)),
          name: 'Sx',
          text: 'Sx',
          color: 'color-rose',
          show: true,
        });
        const midTan = new THREE.Vector3().addVectors(prim.pos, Sx).multiplyScalar(0.5);
        this.currentLabels.push({
          key: 'tan_label',
          at: midTan.clone().add(new THREE.Vector3(0, 0.4, 0)),
          text: `|R tan θ| = ${(R * Math.abs(Math.tan(primaryAng))).toFixed(1)}u`,
          color: 'color-rose',
          show: state.vis3d?.lengths !== false,
        });
      } else {
        this.markerSx.visible = false;
        this.lineTan.visible = false;
        this.lineSecantHypot.visible = false;
        this.secantTriMesh.visible = false;
      }

      this.currentLabels.push({
        key: 'Tx',
        at: Tx.clone().add(new THREE.Vector3(0, 0.4, 0)),
        name: 'Tx',
        text: 'Tx',
        color: 'color-sky',
        show: true,
      });
      const midCos = Tx.clone().multiplyScalar(0.5);
      this.currentLabels.push({
        key: 'cos_label',
        at: midCos.clone().add(new THREE.Vector3(0, 0.3, 0)),
        text: `cos θ = ${cosVal.toFixed(2)}`,
        color: 'color-sky',
        show: state.vis3d?.lengths !== false,
      });
      const midSin = new THREE.Vector3().addVectors(Tx, prim.pos).multiplyScalar(0.5);
      this.currentLabels.push({
        key: 'sin_label',
        at: midSin.clone().add(new THREE.Vector3(0, 0.3, 0)),
        text: `sin θ = ${sinVal.toFixed(2)}`,
        color: 'color-emerald',
        show: state.vis3d?.lengths !== false,
      });
      const wedgeBisector = get3DAngleBisector(O, new THREE.Vector3(R * 0.35, 0, 0), prim.pos, R * 0.45, THREE);
      this.currentLabels.push({
        key: 'theta_label',
        at: wedgeBisector,
        text: `θ = ${(primaryAng * 180 / Math.PI).toFixed(1)}°`,
        color: 'color-amber',
        show: true,
      });
    } else {
      this.lineCos.visible = false;
      this.lineSin.visible = false;
      this.lineTan.visible = false;
      this.lineSecantHypot.visible = false;
      this.trigTriMesh.visible = false;
      this.secantTriMesh.visible = false;
      this.trigAngleWedgeMesh.visible = false;
      this.markerTx.visible = false;
      this.markerSx.visible = false;
    }

    if (isSpatial && activeTangents.length > 0) {
      const primaryT = activeTangents[0].pos;
      const n = primaryT.clone().normalize();
      this.currentLabels.push({
        key: 'tangent_plane',
        at: primaryT.clone().add(n.clone().multiplyScalar(2.0)),
        text: 'T_T(S²): v · n = 0',
        color: 'color-teal',
        show: true,
      });
    }

    this.currentLabels.push(...chordLabels);

    const primT = activeTangents[0]?.pos || O;
    const primTanDir = activeTangents[0]?.tanDir || new THREE.Vector3(1, 0, 0);

    this.lastComputed3D = {
      T: primT,
      tanDir: primTanDir,
      O,
      R3D: R,
      dotProduct: primT.clone().normalize().dot(primTanDir.clone().normalize()),
      angleT: primaryAng,
      activeTangents,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 5. Alternate Segment 3D Scene View
 */
export class AlternateSegment3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerT = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerA = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerD = makeMarker(THREE, PALETTE.indigo, 0.18);

    this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.emerald);
    this.tangentDoubleArrow.group.renderOrder = 5;
    this.chordTA = makeLine(THREE, PALETTE.blue);
    this.chordAB = makeLine(THREE, PALETTE.orange);
    this.chordBT = makeLine(THREE, PALETTE.cyan);

    this.diameterTD = makeLine(THREE, PALETTE.indigo, true);
    this.chordDB = makeLine(THREE, PALETTE.cyan, true);
    this.chordDA = makeLine(THREE, PALETTE.rose, true);
    this.rayDext = makeLine(THREE, PALETTE.indigo, true);

    // Alternate Segments: Major in PALETTE.sky, Minor in PALETTE.violet
    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.18);
    this.minorSegmentMesh = makeTriMesh(THREE, PALETTE.violet, 0.18);
    this.triMesh = makeTriMesh(THREE, PALETTE.cyan, 0.16);
    this.proofTriMesh = makeTriMesh(THREE, PALETTE.indigo, 0.16);
    this.triABDMesh = makeTriMesh(THREE, PALETTE.rose, 0.14);

    // Geodesic Arcs and Spherical Meshes on S² for 3D Spatial Mode
    this.geodesicTA = createGeodesicArc3D(THREE, PALETTE.amber);
    this.geodesicAB = createGeodesicArc3D(THREE, PALETTE.amber);
    this.geodesicBT = createGeodesicArc3D(THREE, PALETTE.amber);
    this.geodesicTD = createGeodesicArc3D(THREE, PALETTE.amber, true);
    this.geodesicDB = createGeodesicArc3D(THREE, PALETTE.amber, true);
    this.geodesicDA = createGeodesicArc3D(THREE, PALETTE.amber, true);

    this.sphTriMesh = createSphericalTriangleMesh(THREE, PALETTE.cyan, 0.22);
    this.sphProofTriMesh = createSphericalTriangleMesh(THREE, PALETTE.indigo, 0.20);
    this.sphTriABDMesh = createSphericalTriangleMesh(THREE, PALETTE.rose, 0.18);

    // Thales Right Angles and Point D Angle Wedges
    this.rightAngleBMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngleAMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngleTMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.angleTanMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.28);
    this.angleBMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.28);
    this.angleIntDMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.28);
    this.angleExtDMesh = makeAngleWedgeMesh(THREE, PALETTE.rose, 0.28);
    this.reflexTanMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.22);
    this.reflexBMesh = makeAngleWedgeMesh(THREE, PALETTE.yellow, 0.22);
    this.reflexDMesh = makeAngleWedgeMesh(THREE, PALETTE.rose, 0.22);

    this.scene.add(
      this.markerT, this.markerA, this.markerB, this.markerD,
      this.tangentDoubleArrow.group, this.chordTA, this.chordAB, this.chordBT,
      this.diameterTD, this.chordDB, this.chordDA, this.rayDext,
      this.geodesicTA, this.geodesicAB, this.geodesicBT,
      this.geodesicTD, this.geodesicDB, this.geodesicDA,
      this.segmentMesh, this.minorSegmentMesh,
      this.triMesh, this.proofTriMesh, this.triABDMesh,
      this.sphTriMesh, this.sphProofTriMesh, this.sphTriABDMesh,
      this.rightAngleBMesh, this.rightAngleAMesh, this.rightAngleTMesh,
      this.angleTanMesh, this.angleBMesh, this.angleIntDMesh, this.angleExtDMesh,
      this.reflexTanMesh, this.reflexBMesh, this.reflexDMesh
    );

    this.draggableTargets = [
      {
        id: 'A',
        mesh: this.markerA,
        field: 'angleA',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const clampedA = clampAngleInArc(angle, st.angleB, st.angleT, 0.2);
          store.set({ angleA: clampedA });
        },
      },
      {
        id: 'B',
        mesh: this.markerB,
        field: 'angleB',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const clampedB = clampAngleInArc(angle, st.angleT, st.angleA, 0.15);
          store.set({ angleB: clampedB });
        },
      },
      {
        id: 'T',
        mesh: this.markerT,
        field: 'angleT',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const clampedT = clampAngleInArc(angle, st.angleA, st.angleB, 0.2);
          store.set({ angleT: clampedT });
        },
      },
      {
        id: 'D',
        mesh: this.markerD,
        onDrag: (angle, hit, store, lat) => {
          const TAU = Math.PI * 2;
          const cur = store.get();
          const curT = cur.angleT;
          const curA = cur.angleA;
          const curB = cur.angleB;
          const oldD = (curT + Math.PI) % TAU;
          let delta = (angle - oldD) % TAU;
          if (delta > Math.PI) delta -= TAU;
          if (delta < -Math.PI) delta += TAU;
          const nextT = (curT + delta + TAU * 4) % TAU;
          const nextA = (curA + delta + TAU * 4) % TAU;
          const nextB = (curB + delta + TAU * 4) % TAU;

          if (lat !== undefined) {
            const curLatT = cur.latT ?? (Math.PI / 2);
            const nextLatT = Math.PI - lat;
            const deltaLat = nextLatT - curLatT;
            const curLatA = cur.latA ?? (Math.PI / 2);
            const curLatB = cur.latB ?? (Math.PI / 2);
            const nextLatA = Math.max(0.05, Math.min(Math.PI - 0.05, curLatA + deltaLat));
            const nextLatB = Math.max(0.05, Math.min(Math.PI - 0.05, curLatB + deltaLat));
            store.set({
              angleT: nextT,
              angleA: nextA,
              angleB: nextB,
              latT: nextLatT,
              latA: nextLatA,
              latB: nextLatB,
            });
          } else {
            store.set({
              angleT: nextT,
              angleA: nextA,
              angleB: nextB,
            });
          }
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latT = state.latT ?? (Math.PI / 2);
    let T = new THREE.Vector3(
      R * Math.sin(latT) * Math.cos(state.angleT),
      R * Math.cos(latT),
      R * Math.sin(latT) * Math.sin(state.angleT)
    );
    let D = T.clone().negate();
    let Dext = D.clone().add(D.clone().normalize().multiplyScalar(3.2));

    let normal;
    let tanDir;
    let u, v;
    let A, B;
    const isSolid = isSolidMode(state.dimensionMode);
    if (isSolid) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      normal = frame.normal;
      u = frame.u;
      v = frame.v;
      alignCircleWireToPlane(this.circleWire, normal, new THREE.Vector3(0, 0, 0), R, THREE);
      const toPt = (ang) => new THREE.Vector3()
        .addScaledVector(u, R * Math.cos(ang))
        .addScaledVector(v, R * Math.sin(ang));
      T = toPt(state.angleT);
      D.copy(T).negate();
      Dext.copy(D).add(D.clone().normalize().multiplyScalar(3.2));
      A = toPt(state.angleA);
      B = toPt(state.angleB);
      tanDir = new THREE.Vector3()
        .addScaledVector(u, -Math.sin(state.angleT))
        .addScaledVector(v, Math.cos(state.angleT)).normalize();
      this.circleInfo = { normal, center: new THREE.Vector3(0, 0, 0), radius: R, u, v };
    } else if (isSpatial) {
      const rawB = new THREE.Vector3(
        R * Math.sin(latB) * Math.cos(state.angleB),
        R * Math.cos(latB),
        R * Math.sin(latB) * Math.sin(state.angleB)
      );
      const vTD = new THREE.Vector3().subVectors(D, T);
      const vTB = new THREE.Vector3().subVectors(rawB, T);
      normal = new THREE.Vector3().crossVectors(vTD, vTB);
      if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3().crossVectors(vTD, new THREE.Vector3(0, 1, 0));
      if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3(0, 1, 0);
      normal.normalize();

      u = T.clone().normalize();
      v = normal.clone().cross(u).normalize();
      alignCircleWireToPlane(this.circleWire, normal, new THREE.Vector3(0, 0, 0), R, THREE);
      tanDir = v.clone();

      // Ensure A and B are strictly concyclic on this great circle containing diameter TD
      const TAU = Math.PI * 2;
      const dAngA = ((state.angleA - state.angleT) % TAU + TAU) % TAU;
      const dAngB = ((state.angleB - state.angleT) % TAU + TAU) % TAU;
      A = new THREE.Vector3().addScaledVector(u, R * Math.cos(dAngA)).addScaledVector(v, R * Math.sin(dAngA));
      B = new THREE.Vector3().addScaledVector(u, R * Math.cos(dAngB)).addScaledVector(v, R * Math.sin(dAngB));
      this.circleInfo = { normal, center: new THREE.Vector3(0, 0, 0), radius: R, u, v };
    } else {
      normal = new THREE.Vector3(0, 1, 0);
      u = new THREE.Vector3(1, 0, 0);
      v = new THREE.Vector3(0, 0, 1);
      alignCircleWireToPlane(this.circleWire, normal, new THREE.Vector3(0, 0, 0), R, THREE);
      tanDir = new THREE.Vector3(-Math.sin(state.angleT), 0, Math.cos(state.angleT));
      A = new THREE.Vector3(
        R * Math.cos(state.angleA),
        0,
        R * Math.sin(state.angleA)
      );
      B = new THREE.Vector3(
        R * Math.cos(state.angleB),
        0,
        R * Math.sin(state.angleB)
      );
    }

    this.markerT.position.copy(T);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerD.position.copy(D);

    const L = 14;
    const tan1 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(-L));
    const tan2 = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L));
    this.tangentDoubleArrow.setPoints(tan1, tan2);

    this.chordTA.geometry.setFromPoints([T, A]);
    this.chordAB.geometry.setFromPoints([A, B]);
    this.chordBT.geometry.setFromPoints([B, T]);

    this.diameterTD.geometry.setFromPoints([T, D]);
    this.diameterTD.computeLineDistances();
    this.chordDB.geometry.setFromPoints([D, B]);
    this.chordDB.computeLineDistances();
    this.chordDA.geometry.setFromPoints([D, A]);
    this.chordDA.computeLineDistances();
    this.rayDext.geometry.setFromPoints([D, Dext]);
    this.rayDext.computeLineDistances();

    const showProof = Boolean(state.showProofConstruction || state.showThalesOverlay);
    this.markerD.visible = this.diameterTD.visible = this.chordDB.visible = this.chordDA.visible = this.rayDext.visible = showProof;

    const TAU = Math.PI * 2;
    let arcRange;
    let segStart;
    let segSweep;
    if (isSpatial) {
      const u = T.clone().normalize();
      const v = normal.clone().cross(u).normalize();
      const dAngA = ((state.angleA - state.angleT) % TAU + TAU) % TAU;
      const dAngB = ((state.angleB - state.angleT) % TAU + TAU) % TAU;
      arcRange = getSubtendedArcRange3D(0, dAngA, dAngB);
      segStart = (arcRange.start + arcRange.sweep) % TAU;
      segSweep = TAU - arcRange.sweep;
      setSegment3DVertices(this.segmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, segStart, segSweep, 32, THREE);
      setSegment3DVertices(this.minorSegmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, arcRange.start, arcRange.sweep, 32, THREE);
    } else if (isSolid) {
      arcRange = getSubtendedArcRange3D(state.angleT, state.angleA, state.angleB);
      segStart = (arcRange.start + arcRange.sweep) % TAU;
      segSweep = TAU - arcRange.sweep;
      setSegment3DVertices(this.segmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, segStart, segSweep, 32, THREE);
      setSegment3DVertices(this.minorSegmentMesh.geometry, new THREE.Vector3(0, 0, 0), u, v, R, arcRange.start, arcRange.sweep, 32, THREE);
    } else {
      arcRange = getSubtendedArcRange3D(state.angleT, state.angleA, state.angleB);
      segStart = (arcRange.start + arcRange.sweep) % TAU;
      segSweep = TAU - arcRange.sweep;
      setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);
      setSegmentXZVertices(this.minorSegmentMesh.geometry, 0, 0, R, arcRange.start, arcRange.sweep, 32);
    }

    setTriVertices(this.triMesh.geometry, T, A, B);
    if (showProof) {
      setTriVertices(this.proofTriMesh.geometry, T, B, D);
      setTriVertices(this.triABDMesh.geometry, A, B, D);
    }

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const showTriangles = showArea && Boolean(state.showTriangleShading || state.showTriangles);

    this.segmentMesh.visible = showArea;
    this.minorSegmentMesh.visible = showArea;

    const showGeodesicOverlay = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);

    // Straight Euclidean chords cutting through the interior of the translucent sphere
    this.chordTA.geometry.setFromPoints([T, A]);
    this.chordAB.geometry.setFromPoints([A, B]);
    this.chordBT.geometry.setFromPoints([B, T]);
    this.chordTA.visible = this.chordAB.visible = this.chordBT.visible = true;

    if (showProof) {
      this.diameterTD.geometry.setFromPoints([T, D]);
      this.diameterTD.computeLineDistances();
      this.chordDB.geometry.setFromPoints([D, B]);
      this.chordDA.geometry.setFromPoints([D, A]);
      this.diameterTD.visible = this.chordDB.visible = this.chordDA.visible = true;
    } else {
      this.diameterTD.visible = this.chordDB.visible = this.chordDA.visible = false;
    }

    // Flat Euclidean triangles in R^3
    setTriVertices(this.triMesh.geometry, T, A, B);
    this.triMesh.visible = showTriangles;
    if (showProof) {
      setTriVertices(this.proofTriMesh.geometry, T, B, D);
      setTriVertices(this.triABDMesh.geometry, A, B, D);
      this.proofTriMesh.visible = this.triABDMesh.visible = showTriangles;
    } else {
      this.proofTriMesh.visible = this.triABDMesh.visible = false;
    }

    const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay || state.vis3d?.geodesic);
    if (isSpatial) {
      // Curved subtended arcs on the sphere surface S²
      updateGeodesicArc3D(this.geodesicTA, T, A, R * 1.002, 32);
      updateGeodesicArc3D(this.geodesicAB, A, B, R * 1.002, 32);
      updateGeodesicArc3D(this.geodesicBT, B, T, R * 1.002, 32);
      this.geodesicTA.visible = this.geodesicAB.visible = this.geodesicBT.visible = showGeodesic;

      if (showGeodesic && showProof) {
        updateGeodesicArc3D(this.geodesicTD, T, D, R * 1.002, 32);
        updateGeodesicArc3D(this.geodesicDB, D, B, R * 1.002, 32);
        updateGeodesicArc3D(this.geodesicDA, D, A, R * 1.002, 32);
        this.geodesicTD.visible = this.geodesicDB.visible = this.geodesicDA.visible = true;
      } else {
        this.geodesicTD.visible = this.geodesicDB.visible = this.geodesicDA.visible = false;
      }

      if (showSphericalCap) {
        updateSphericalTriangleMesh(this.sphTriMesh, T, A, B, R * 1.002, 2);
        this.sphTriMesh.visible = showTriangles;
        if (showProof) {
          updateSphericalTriangleMesh(this.sphProofTriMesh, T, B, D, R * 1.002, 2);
          updateSphericalTriangleMesh(this.sphTriABDMesh, A, B, D, R * 1.002, 2);
          this.sphProofTriMesh.visible = this.sphTriABDMesh.visible = showTriangles;
        } else {
          this.sphProofTriMesh.visible = this.sphTriABDMesh.visible = false;
        }
      } else {
        this.sphTriMesh.visible = this.sphProofTriMesh.visible = this.sphTriABDMesh.visible = false;
      }
    } else {
      this.geodesicTA.visible = this.geodesicAB.visible = this.geodesicBT.visible = false;
      this.geodesicTD.visible = this.geodesicDB.visible = this.geodesicDA.visible = false;
      this.sphTriMesh.visible = this.sphProofTriMesh.visible = this.sphTriABDMesh.visible = false;
    }

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const degB = get3DAngleDegrees(B, T, A, THREE);
    const degTan1 = get3DAngleDegrees(T, tan1, A, THREE);
    const degTan2 = get3DAngleDegrees(T, tan2, A, THREE);
    const activeTan = Math.abs(degTan1 - degB) <= Math.abs(degTan2 - degB) ? tan1 : tan2;
    const degTan = Math.abs(degTan1 - degB) <= Math.abs(degTan2 - degB) ? degTan1 : degTan2;

    setAngleWedgeVertices3D(this.angleTanMesh, T, activeTan, A, 2.5);
    setAngleWedgeVertices3D(this.angleBMesh, B, T, A, 2.4);
    const isAlphaVisible = showAngles && isLabelVisible('α', state.vis3d) && isLabelVisible('a', state.vis3d);
    this.angleTanMesh.visible = this.angleBMesh.visible = isAlphaVisible;

    const showReflex = Boolean(state.vis3d?.reflex);
    setAngleWedgeVertices3D(this.reflexTanMesh, T, activeTan, A, 3.2, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexBMesh, B, T, A, 3.0, 32, THREE, true);
    this.reflexTanMesh.visible = this.reflexBMesh.visible = showReflex && isAlphaVisible;

    let degIntD = 0;
    let degExtD = 0;
    if (showProof) {
      degIntD = get3DAngleDegrees(D, T, A, THREE);
      degExtD = get3DAngleDegrees(D, A, Dext, THREE);
      setRightAngle3DVertices(this.rightAngleBMesh, B, T, D, 1.4);
      setRightAngle3DVertices(this.rightAngleAMesh, A, T, D, 1.4);
      setRightAngle3DVertices(this.rightAngleTMesh, T, D, activeTan, 1.4);
      setAngleWedgeVertices3D(this.angleIntDMesh, D, T, A, 2.4);
      setAngleWedgeVertices3D(this.angleExtDMesh, D, A, Dext, 2.2);
      setAngleWedgeVertices3D(this.reflexDMesh, D, T, A, 3.0, 32, THREE, true);
      this.reflexDMesh.visible = showReflex && (state.showDAngles !== false) && isAlphaVisible;
    } else {
      this.reflexDMesh.visible = false;
    }
    this.rightAngleBMesh.visible = showProof && showAngles && isLabelVisible('90°', state.vis3d);
    this.rightAngleAMesh.visible = showProof && showAngles && isLabelVisible('90°', state.vis3d);
    this.rightAngleTMesh.visible = showProof && showAngles && isLabelVisible('90°', state.vis3d);
    const showDAngles = showProof && showAngles && (state.showDAngles !== false);
    this.angleIntDMesh.visible = showDAngles && isAlphaVisible;
    this.angleExtDMesh.visible = showDAngles && isLabelVisible('Ext D', state.vis3d) && isLabelVisible('D', state.vis3d);

    const angTPos = get3DAngleBisector(T, activeTan, A, 3.2, THREE);
    const angBPos = get3DAngleBisector(B, T, A, 3.2, THREE);
    const tanLabelPos = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L * 0.65));

    const T_pos = T.clone().multiplyScalar(1.15);
    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const D_pos = D.clone().multiplyScalar(1.15);

    // Alternate segment centroid label positions (Maj in color-sky, Min in color-violet)
    const majorMidAng = (segStart + segSweep / 2) % TAU;
    const minorMidAng = (arcRange.start + arcRange.sweep / 2) % TAU;
    const majorLabelPos = isSpatial
      ? new THREE.Vector3().addScaledVector(u, R * 0.62 * Math.cos(majorMidAng)).addScaledVector(v, R * 0.62 * Math.sin(majorMidAng))
      : new THREE.Vector3(R * 0.62 * Math.cos(majorMidAng), 0, R * 0.62 * Math.sin(majorMidAng));
    const minorLabelPos = isSpatial
      ? new THREE.Vector3().addScaledVector(u, R * 0.82 * Math.cos(minorMidAng)).addScaledVector(v, R * 0.82 * Math.sin(minorMidAng))
      : new THREE.Vector3(R * 0.82 * Math.cos(minorMidAng), 0, R * 0.82 * Math.sin(minorMidAng));

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'T', at: T_pos, name: 'T', text: 'T', coords: T, color: 'color-red' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-blue' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'tangent', at: tanLabelPos, name: 'Tangent', text: 'Tangent', color: 'color-emerald' },
      { key: 'angTan', name: 'α', at: angTPos, text: `α = ${degTan.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: isAlphaVisible },
      { key: 'angB', name: 'α', at: angBPos, text: `α = ${degB.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: isAlphaVisible },
      { key: 'reflexTan', name: 'α*', at: get3DReflexBisector(T, activeTan, A, 4.0, THREE), text: `α* = ${(360 - degTan).toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showReflex && isAlphaVisible && (state.vis3d?.labels !== false) },
      { key: 'reflexB', name: 'α*', at: get3DReflexBisector(B, T, A, 4.0, THREE), text: `α* = ${(360 - degB).toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showReflex && isAlphaVisible && (state.vis3d?.labels !== false) },
      { key: 'segMajor', name: 'Alt Seg (Maj)', at: majorLabelPos, text: 'Alt Seg (Maj)', color: 'color-sky', show: showArea },
      { key: 'segMinor', name: 'Alt Seg (Min)', at: minorLabelPos, text: 'Alt Seg (Min)', color: 'color-violet', show: showArea },
    ];
    if (isSpatial) {
      const excessInfo = computeSphericalTriangleExcess(T, A, B, R);
      const centroid = new THREE.Vector3().add(T).add(A).add(B).normalize().multiplyScalar(R * 1.08);
      this.currentLabels.push({
        key: 'sph_excess',
        at: centroid,
        text: `E = ${excessInfo.excessDeg.toFixed(1)}° (Area = ${excessInfo.area.toFixed(1)}u²)`,
        color: 'color-cyan',
        show: state.vis3d?.labels !== false,
      });
    }
    if (showProof) {
      this.currentLabels.push({ key: 'D', at: D_pos, name: 'D', text: 'D', coords: D, color: 'color-indigo' });
      const rightAngleBAt = get3DAngleBisector(B, T, D, 2.6, THREE);
      const rightAngleAAt = get3DAngleBisector(A, T, D, 2.6, THREE);
      const rightAngleTAt = get3DAngleBisector(T, D, activeTan, 2.6, THREE);
      const intDAt = get3DAngleBisector(D, T, A, 3.4, THREE);
      const extDAt = get3DAngleBisector(D, A, Dext, 3.2, THREE);
      const showDLabels = showAngles && (state.showDAngles !== false);
      this.currentLabels.push(
        { key: 'rightB', name: '90°', at: rightAngleBAt, text: '∠TBD = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'rightA', name: '90°', at: rightAngleAAt, text: '∠TAD = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'rightT', name: '90°', at: rightAngleTAt, text: 'TD ⊥ Tan = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'angIntD', name: 'α', at: intDAt, text: `∠TDA = ${degIntD.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showDLabels && isAlphaVisible },
        { key: 'angExtD', name: 'Ext D', at: extDAt, text: `Ext D = ${degExtD.toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showDLabels },
        { key: 'reflexD', name: 'D*', at: get3DReflexBisector(D, T, A, 4.0, THREE), text: `D* = ${(360 - degIntD).toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showReflex && (state.vis3d?.labels !== false) && (state.showDAngles !== false) && isAlphaVisible },
      );
    }
    this.lastComputed3D = {
      degTan,
      degB,
      diffDeg: Math.abs(degTan - degB),
      degIntD,
      degExtD,
      thalesTBD: get3DAngleDegrees(B, T, D, THREE),
      thalesTAD: get3DAngleDegrees(A, T, D, THREE),
      T, A, B, D,
      R3D: R,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 6. Tangents from External Point 3D Scene View
 */
export class TangentsFromPoint3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 8;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.sky, 0.16);
    this.markerP = makeMarker(THREE, PALETTE.red, 0.18);
    this.markerT1 = makeMarker(THREE, PALETTE.emerald, 0.18);
    this.markerT2 = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerK = makeMarker(THREE, PALETTE.violet, 0.15);

    this.lineOP = makeLine(THREE, PALETTE.yellow, true);
    this.radiusOT1 = makeLine(THREE, PALETTE.emerald);
    this.radiusOT2 = makeLine(THREE, PALETTE.blue);
    this.tangentPT1 = makeLine(THREE, PALETTE.emerald);
    this.tangentPT2 = makeLine(THREE, PALETTE.blue);
    this.chordT1T2 = makeLine(THREE, PALETTE.violet);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.emerald, 0.18);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.blue, 0.18);
    this.rightAngle1Mesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngle2Mesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.rightAngleKMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.anglePMesh1 = makeAngleWedgeMesh(THREE, PALETTE.lime, 0.28);
    this.anglePMesh2 = makeAngleWedgeMesh(THREE, PALETTE.fuchsia, 0.28);
    this.angleOMesh1 = makeAngleWedgeMesh(THREE, PALETTE.amber, 0.28);
    this.angleOMesh2 = makeAngleWedgeMesh(THREE, PALETTE.orange, 0.28);
    this.reflexRight1Mesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25);
    this.reflexRight2Mesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25);

    // 3D Right Circular Tangent Cone and Spherical Geodesics on S²
    this.tangentConeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.001, 1, 1, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false })
    );

    const contactPts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      contactPts.push(new THREE.Vector3(Math.cos(th), 0, Math.sin(th)));
    }
    this.contactCircleLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(contactPts),
      new THREE.LineBasicMaterial({ color: PALETTE.teal, transparent: true, opacity: 0.8 })
    );

    this.geodesicChordT1T2 = createGeodesicArc3D(THREE, PALETTE.amber);

    this.scene.add(
      this.markerO, this.markerP, this.markerT1, this.markerT2, this.markerK,
      this.lineOP, this.radiusOT1, this.radiusOT2,
      this.tangentPT1, this.tangentPT2, this.chordT1T2,
      this.tangentConeMesh, this.contactCircleLine, this.geodesicChordT1T2,
      this.tri1Mesh, this.tri2Mesh,
      this.rightAngle1Mesh, this.rightAngle2Mesh, this.rightAngleKMesh,
      this.anglePMesh1, this.anglePMesh2,
      this.angleOMesh1, this.angleOMesh2,
      this.reflexRight1Mesh, this.reflexRight2Mesh
    );

    this.draggableTargets = [
      {
        id: 'P',
        mesh: this.markerP,
        onDrag: (angle, hit, store, lat) => {
          store.set({ pointAngle: angle, latP: lat });
        },
      },
      {
        id: 'T1',
        mesh: this.markerT1,
        onDrag: (angle, hit, store) => {
          const state = store.get();
          const r = state.radius || 120;
          const d = state.pointDist || 260;
          const alpha = Math.acos(Math.min(1, Math.max(-1, r / d)));
          let pAngle = angle - alpha;
          if (pAngle < 0) pAngle += Math.PI * 2;
          store.set({ pointAngle: pAngle });
        },
      },
      {
        id: 'T2',
        mesh: this.markerT2,
        onDrag: (angle, hit, store) => {
          const state = store.get();
          const r = state.radius || 120;
          const d = state.pointDist || 260;
          const alpha = Math.acos(Math.min(1, Math.max(-1, r / d)));
          let pAngle = angle + alpha;
          if (pAngle >= Math.PI * 2) pAngle -= Math.PI * 2;
          store.set({ pointAngle: pAngle });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const baseR = 120;
    const R = ((state?.radius || baseR) / baseR) * 8;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const O = new THREE.Vector3(0, 0, 0);
    const distRatio = Math.max(1.15, (state.pointDist || 260) / (state.radius || 120));
    const d = R * distRatio;
    const angP = state.pointAngle || 0;
    const latP = state.latP ?? (Math.PI / 2);

    const isSolid = isSolidMode(state.dimensionMode);
    let P, u, v, normal, T1, T2, K;
    const alpha = Math.acos(Math.min(1, Math.max(-1, R / d)));
    if (isSolid || isSpatial) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      const uFrame = frame.u;
      const vFrame = frame.v;
      normal = frame.normal;
      alignCircleWireToPlane(this.circleWire, normal, O, R, THREE);
      P = new THREE.Vector3().addScaledVector(uFrame, d * Math.cos(angP)).addScaledVector(vFrame, d * Math.sin(angP));
      u = P.clone().normalize();
      v = new THREE.Vector3().crossVectors(normal, u).normalize();
      T1 = u.clone().multiplyScalar(R * Math.cos(alpha)).add(v.clone().multiplyScalar(R * Math.sin(alpha)));
      T2 = u.clone().multiplyScalar(R * Math.cos(alpha)).sub(v.clone().multiplyScalar(R * Math.sin(alpha)));
      K = u.clone().multiplyScalar(R * Math.cos(alpha));
      this.circleInfo = { normal, center: O, radius: R, u: uFrame, v: vFrame };
    } else {
      P = new THREE.Vector3(
        d * Math.sin(latP) * Math.cos(angP),
        d * Math.cos(latP),
        d * Math.sin(latP) * Math.sin(angP)
      );
      u = P.clone().normalize();
      v = new THREE.Vector3(0, 1, 0).cross(u);
      if (v.lengthSq() < 0.01) v = new THREE.Vector3(1, 0, 0).cross(u);
      v.normalize();
      normal = isSpatial ? new THREE.Vector3().crossVectors(u, v).normalize() : new THREE.Vector3(0, 1, 0);
      alignCircleWireToPlane(this.circleWire, normal, O, R, THREE);
      T1 = u.clone().multiplyScalar(R * Math.cos(alpha)).add(v.clone().multiplyScalar(R * Math.sin(alpha)));
      T2 = u.clone().multiplyScalar(R * Math.cos(alpha)).sub(v.clone().multiplyScalar(R * Math.sin(alpha)));
      K = u.clone().multiplyScalar(R * Math.cos(alpha));
      this.circleInfo = { normal, center: O, radius: R, u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) };
    }

    this.markerO.position.copy(O);
    this.markerP.position.copy(P);
    this.markerT1.position.copy(T1);
    this.markerT2.position.copy(T2);
    this.markerK.position.copy(K);

    this.lineOP.geometry.setFromPoints([O, P]);
    this.lineOP.computeLineDistances();
    this.radiusOT1.geometry.setFromPoints([O, T1]);
    this.radiusOT2.geometry.setFromPoints([O, T2]);
    this.tangentPT1.geometry.setFromPoints([P, T1]);
    this.tangentPT2.geometry.setFromPoints([P, T2]);
    // Straight Euclidean chord cutting through the interior of the translucent sphere
    this.chordT1T2.geometry.setFromPoints([T1, T2]);
    this.chordT1T2.visible = true;

    // Flat Euclidean right triangles in R^3
    setTriVertices(this.tri1Mesh.geometry, O, T1, P);
    setTriVertices(this.tri2Mesh.geometry, O, T2, P);
    setRightAngle3DVertices(this.rightAngle1Mesh, T1, O, P, 1.3);
    setRightAngle3DVertices(this.rightAngle2Mesh, T2, O, P, 1.3);
    setRightAngle3DVertices(this.rightAngleKMesh, K, T1, P, 1.1);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.tri1Mesh.visible = this.tri2Mesh.visible = (state.showCongruence !== false) && showArea;

    const showGeodesicOverlay = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay);
    if (isSpatial) {
      const h = (R * R) / d;
      const rc = Math.sqrt(Math.max(0, R * R - h * h));
      const coneHeight = d - h;
      const centerContact = u.clone().multiplyScalar(h);
      const midCone = u.clone().multiplyScalar(h + coneHeight / 2);

      this.tangentConeMesh.position.copy(midCone);
      this.tangentConeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
      this.tangentConeMesh.scale.set(rc, coneHeight, rc);
      this.tangentConeMesh.visible = showArea;

      this.contactCircleLine.position.copy(centerContact);
      this.contactCircleLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
      this.contactCircleLine.scale.set(rc, rc, rc);
      this.contactCircleLine.visible = true;

      // Optional geodesic chord overlay on S²
      if (showGeodesicOverlay) {
        updateGeodesicArc3D(this.geodesicChordT1T2, T1, T2, R * 1.002, 32);
        this.geodesicChordT1T2.visible = true;
      } else {
        this.geodesicChordT1T2.visible = false;
      }
    } else {
      this.tangentConeMesh.visible = false;
      this.contactCircleLine.visible = false;
      this.geodesicChordT1T2.visible = false;
    }

    // 3D Angle Shading & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    this.rightAngle1Mesh.visible = this.rightAngle2Mesh.visible = this.rightAngleKMesh.visible = showAngles;

    setAngleWedgeVertices3D(this.anglePMesh1, P, T1, O, 4.2);
    setAngleWedgeVertices3D(this.anglePMesh2, P, O, T2, 4.2);
    setAngleWedgeVertices3D(this.angleOMesh1, O, T1, P, 2.8);
    setAngleWedgeVertices3D(this.angleOMesh2, O, P, T2, 2.8);
    setAngleWedgeVertices3D(this.reflexRight1Mesh, T1, O, P, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexRight2Mesh, T2, O, P, 3.0, 32, THREE, true);
    this.anglePMesh1.visible = this.anglePMesh2.visible = showAngles;
    this.angleOMesh1.visible = this.angleOMesh2.visible = showAngles;
    this.reflexRight1Mesh.visible = this.reflexRight2Mesh.visible = showReflex;

    const degP1 = get3DAngleDegrees(P, T1, O, THREE);
    const degP2 = get3DAngleDegrees(P, O, T2, THREE);
    const degO1 = get3DAngleDegrees(O, T1, P, THREE);
    const degO2 = get3DAngleDegrees(O, P, T2, THREE);

    // Stagger P1 at 3.2 and P2 at 5.8, O1 at 2.8 and O2 at 4.8 to eliminate overlap
    const angP1Pos = get3DAngleBisector(P, T1, O, 3.2, THREE);
    const angP2Pos = get3DAngleBisector(P, O, T2, 5.8, THREE);
    const angO1Pos = get3DAngleBisector(O, T1, P, 2.8, THREE);
    const angO2Pos = get3DAngleBisector(O, P, T2, 4.8, THREE);

    const right1Pos = get3DAngleBisector(T1, O, P, 3.0, THREE);
    const right2Pos = get3DAngleBisector(T2, O, P, 3.0, THREE);
    const midOP = new THREE.Vector3().addVectors(O, P).multiplyScalar(0.5);

    const T1_pos = T1.clone().multiplyScalar(1.15);
    const T2_pos = T2.clone().multiplyScalar(1.15);
    const P_pos = P.clone().multiplyScalar(1.08);
    const O_pos = new THREE.Vector3(0, 0.8, 0);
    const K_pos = K.clone().add(new THREE.Vector3(0, 0.7, 0));

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-sky' },
      { key: 'P', at: P_pos, name: 'P', text: 'P', coords: P, color: 'color-red' },
      { key: 'T1', at: T1_pos, name: 'T₁', text: 'T₁', coords: T1, color: 'color-emerald' },
      { key: 'T2', at: T2_pos, name: 'T₂', text: 'T₂', coords: T2, color: 'color-blue' },
      { key: 'K', at: K_pos, name: 'K', text: 'K', coords: K, color: 'color-violet' },
      { key: 'd', at: midOP, text: `d = ${d.toFixed(1)}`, isAngle: false, color: 'color-yellow' },
      { key: 'right1', at: right1Pos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
      { key: 'right2', at: right2Pos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
      { key: 'reflex1', at: get3DReflexBisector(T1, O, P, 3.8, THREE), text: '270.0° (T₁*)', isAngle: true, color: 'color-cyan', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflex2', at: get3DReflexBisector(T2, O, P, 3.8, THREE), text: '270.0° (T₂*)', isAngle: true, color: 'color-cyan', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'angO1', at: angO1Pos, text: `β₁ = ${degO1.toFixed(1)}°`, isAngle: true, color: 'color-amber', show: showAngles },
      { key: 'angO2', at: angO2Pos, text: `β₂ = ${degO2.toFixed(1)}°`, isAngle: true, color: 'color-orange', show: showAngles },
      { key: 'angP1', at: angP1Pos, text: `α₁ = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-lime', show: showAngles },
      { key: 'angP2', at: angP2Pos, text: `α₂ = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-fuchsia', show: showAngles },
    ];
    if (isSpatial) {
      const h = (R * R) / d;
      const rc = Math.sqrt(Math.max(0, R * R - h * h));
      const coneHeight = d - h;
      const centerContact = u.clone().multiplyScalar(h);
      const genLen = Math.sqrt(Math.max(0, d * d - R * R));
      const midGen = P.clone().add(u.clone().multiplyScalar(-coneHeight * 0.5)).add(v.clone().multiplyScalar(rc * 0.5));
      this.currentLabels.push(
        { key: 'contact_circle', at: centerContact.clone().add(v.clone().multiplyScalar(rc * 1.15)), text: 'Contact Circle C(T)', color: 'color-teal', show: true },
        { key: 'cone_gen', at: midGen, text: `Cone L = ${genLen.toFixed(1)}`, color: 'color-sky', show: true }
      );
    }
    this.lastComputed3D = {
      P, T1, T2, K, O,
      d: P.distanceTo(O),
      len1: P.distanceTo(T1),
      len2: P.distanceTo(T2),
      chord: T1.distanceTo(T2),
      degP1, degP2, degO1, degO2,
      diffLen: Math.abs(P.distanceTo(T1) - P.distanceTo(T2)),
      R3D: R,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}





/**
 * 7. Perpendicular Chord Bisector 3D Scene View
 */
export class ChordBisector3DView extends BaseScene3DView {
  constructor(THREE, container) {
    super(THREE, container);
    const R = 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);

    this.markerO = makeMarker(THREE, PALETTE.indigo, 0.16);
    this.markerA = makeMarker(THREE, PALETTE.blue, 0.18);
    this.markerB = makeMarker(THREE, PALETTE.orange, 0.18);
    this.markerM = makeMarker(THREE, PALETTE.emerald, 0.18);

    this.lineAM = makeLine(THREE, PALETTE.blue);
    this.lineMB = makeLine(THREE, PALETTE.orange);
    this.perpOM = makeLine(THREE, PALETTE.emerald);
    this.lineOA = makeLine(THREE, PALETTE.blue);
    this.lineOB = makeLine(THREE, PALETTE.orange);
    this.bisectorExtArrow = makeDoubleArrowLine(THREE, PALETTE.lavender);

    this.tri1Mesh = makeTriMesh(THREE, PALETTE.blue, 0.16);
    this.tri2Mesh = makeTriMesh(THREE, PALETTE.orange, 0.16);
    this.segmentMesh = makeTriMesh(THREE, PALETTE.sky, 0.12);
    this.rightAngleMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);
    this.angleAOMMesh = makeAngleWedgeMesh(THREE, PALETTE.blue, 0.28);
    this.angleBOMMesh = makeAngleWedgeMesh(THREE, PALETTE.orange, 0.28);
    this.reflexRightMesh = makeAngleWedgeMesh(THREE, PALETTE.cyan, 0.25);

    // Geodesic Arcs, Spherical Triangles, and Bisector Plane for 3D Spatial Mode
    this.geodesicChordAB = createGeodesicArc3D(THREE, PALETTE.amber);
    this.sphTriangleAOM = createSphericalTriangleMesh(THREE, PALETTE.blue, 0.22);
    this.sphTriangleBOM = createSphericalTriangleMesh(THREE, PALETTE.orange, 0.22);

    this.bisectorPlaneMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 8, 32),
      new THREE.MeshBasicMaterial({ color: PALETTE.emerald, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );

    const bisectPts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      bisectPts.push(new THREE.Vector3(Math.cos(th), Math.sin(th), 0));
    }
    this.bisectorGreatCircle = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(bisectPts),
      new THREE.LineBasicMaterial({ color: PALETTE.emerald, transparent: true, opacity: 0.75 })
    );

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerM,
      this.lineAM, this.lineMB, this.perpOM, this.lineOA, this.lineOB,
      this.geodesicChordAB, this.sphTriangleAOM, this.sphTriangleBOM,
      this.bisectorPlaneMesh, this.bisectorGreatCircle,
      this.bisectorExtArrow.group,
      this.tri1Mesh, this.tri2Mesh, this.segmentMesh, this.rightAngleMesh,
      this.angleAOMMesh, this.angleBOMMesh, this.reflexRightMesh
    );

    this.draggableTargets = [
      {
        id: 'A',
        mesh: this.markerA,
        field: 'angleA',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const clampedA = clampMinAngleDistance(angle, st.angleB, 0.2);
          store.set({ angleA: clampedA });
        },
      },
      {
        id: 'B',
        mesh: this.markerB,
        field: 'angleB',
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const clampedB = clampMinAngleDistance(angle, st.angleA, 0.2);
          store.set({ angleB: clampedB });
        },
      },
      {
        id: 'M',
        mesh: this.markerM,
        onDrag: (angle, hit, store) => {
          const st = store.get();
          const dAngle = Math.atan2(Math.sin(st.angleB - st.angleA), Math.cos(st.angleB - st.angleA));
          const TAU = Math.PI * 2;
          const nextA = (angle - dAngle / 2 + TAU * 2) % TAU;
          const nextB = (angle + dAngle / 2 + TAU * 2) % TAU;
          store.set({ angleA: nextA, angleB: nextB });
        },
      },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 170;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    const { THREE } = this;
    const isSpatial = state.dimensionMode === 'spatial';
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const isSolid = isSolidMode(state.dimensionMode);
    let A, B, M, normal, uFrame, vFrame;
    if (isSolid || isSpatial) {
      const frame = getSolidOrientationFrame(state, 'y', THREE);
      uFrame = frame.u;
      vFrame = frame.v;
      normal = frame.normal;
      alignCircleWireToPlane(this.circleWire, normal, O, R, THREE);
      const toPt = (ang) => new THREE.Vector3()
        .addScaledVector(uFrame, R * Math.cos(ang))
        .addScaledVector(vFrame, R * Math.sin(ang));
      A = toPt(state.angleA);
      B = toPt(state.angleB);
      M = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
      this.circleInfo = { normal, center: O, radius: R, u: uFrame, v: vFrame };
    } else {
      A = new THREE.Vector3(
        R * Math.sin(latA) * Math.cos(state.angleA),
        R * Math.cos(latA),
        R * Math.sin(latA) * Math.sin(state.angleA)
      );
      B = new THREE.Vector3(
        R * Math.sin(latB) * Math.cos(state.angleB),
        R * Math.cos(latB),
        R * Math.sin(latB) * Math.sin(state.angleB)
      );
      M = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);
      normal = isSpatial ? new THREE.Vector3().crossVectors(A, B) : new THREE.Vector3(0, 1, 0);
      if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3(0, 1, 0);
      normal.normalize();
      alignCircleWireToPlane(this.circleWire, normal, O, R, THREE);
      uFrame = new THREE.Vector3(1, 0, 0);
      vFrame = new THREE.Vector3(0, 0, 1);
      this.circleInfo = { normal, center: O, radius: R, u: uFrame, v: vFrame };
    }

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerM.position.copy(M);

    // Straight Euclidean segments forming chord AB and bisector OM
    this.lineAM.geometry.setFromPoints([A, M]);
    this.lineMB.geometry.setFromPoints([M, B]);
    this.perpOM.geometry.setFromPoints([O, M]);
    this.lineAM.visible = this.lineMB.visible = true;
    this.perpOM.visible = true;

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;

    const dirOM = M.clone().normalize();
    const ext1 = dirOM.clone().multiplyScalar(-14);
    const ext2 = dirOM.clone().multiplyScalar(14);
    this.bisectorExtArrow.setPoints(ext1, ext2);
    this.bisectorExtArrow.group.visible = state.showExtendedBisector !== false;

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    // Flat Euclidean right triangles in R^3
    setTriVertices(this.tri1Mesh.geometry, O, A, M);
    setTriVertices(this.tri2Mesh.geometry, O, B, M);
    setRightAngle3DVertices(this.rightAngleMesh, M, O, A, 1.4);
    this.tri1Mesh.visible = this.tri2Mesh.visible = showArea;

    const showSphericalCap = Boolean(state.showSphericalOverlay || state.showSphericalCap);

    if (isSpatial) {
      // Curved subtended arc on the sphere surface S² (distinct PALETTE.amber token)
      updateGeodesicArc3D(this.geodesicChordAB, A, B, R * 1.002, 32);
      const showGeodesic = Boolean(state.showGeodesicOverlay || state.showSphericalOverlay || state.vis3d?.geodesic);
      this.geodesicChordAB.visible = showGeodesic;

      const chordDir = new THREE.Vector3().subVectors(B, A).normalize();
      this.bisectorPlaneMesh.position.set(0, 0, 0);
      this.bisectorPlaneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), chordDir);
      this.bisectorPlaneMesh.scale.setScalar(R / 8);
      this.bisectorPlaneMesh.visible = (state.showExtendedBisector !== false) && showArea;

      this.bisectorGreatCircle.position.set(0, 0, 0);
      this.bisectorGreatCircle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), chordDir);
      this.bisectorGreatCircle.scale.setScalar(R * 1.002);
      this.bisectorGreatCircle.visible = (state.showExtendedBisector !== false);

      // Optional spherical triangle overlays on S²
      if (showSphericalCap) {
        const Msph = new THREE.Vector3().addVectors(A, B).normalize().multiplyScalar(R);
        updateSphericalTriangleMesh(this.sphTriangleAOM, O, A, Msph, R * 1.002, 2);
        updateSphericalTriangleMesh(this.sphTriangleBOM, O, B, Msph, R * 1.002, 2);
        this.sphTriangleAOM.visible = this.sphTriangleBOM.visible = showArea;
      } else {
        this.sphTriangleAOM.visible = this.sphTriangleBOM.visible = false;
      }
      const u = A.clone().normalize();
      const v = normal.clone().cross(u).normalize();
      let sweep = Math.atan2(B.dot(v), B.dot(u));
      if (sweep < 0) sweep += Math.PI * 2;
      if (sweep > Math.PI) {
        sweep = Math.PI * 2 - sweep;
        setSegment3DVertices(this.segmentMesh.geometry, O, u, v.clone().negate(), R, 0, sweep, 32, THREE);
      } else {
        setSegment3DVertices(this.segmentMesh.geometry, O, u, v, R, 0, sweep, 32, THREE);
      }
      this.segmentMesh.visible = showArea;
    } else {
      this.geodesicChordAB.visible = false;
      this.sphTriangleAOM.visible = false;
      this.sphTriangleBOM.visible = false;
      this.bisectorPlaneMesh.visible = false;
      this.bisectorGreatCircle.visible = false;

      const { start, sweep } = getMinorArcRange3D(state.angleA, state.angleB);
      if (isSolid || isSpatial) {
        setSegment3DVertices(this.segmentMesh.geometry, O, uFrame, vFrame, R, start, sweep, 32, THREE);
      } else {
        setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, start, sweep);
      }
      this.segmentMesh.visible = showArea;
    }

    // 3D Angle Shading & Spatial Bisector
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    this.rightAngleMesh.visible = showAngles;
    setAngleWedgeVertices3D(this.angleAOMMesh, O, A, M, 2.6);
    setAngleWedgeVertices3D(this.angleBOMMesh, O, M, B, 2.6);
    setAngleWedgeVertices3D(this.reflexRightMesh, M, O, A, 2.6, 32, THREE, true);
    this.angleAOMMesh.visible = this.angleBOMMesh.visible = showAngles;
    this.reflexRightMesh.visible = showReflex;

    const degAOM = get3DAngleDegrees(O, A, M, THREE);
    const degBOM = get3DAngleDegrees(O, M, B, THREE);
    const rightPos = get3DAngleBisector(M, O, A, 2.2, THREE);
    // Stagger AOM at 2.8 and BOM at 4.8 to avoid collision near vertex O
    const aomLabelPos = get3DAngleBisector(O, A, M, 2.8, THREE);
    const bomLabelPos = get3DAngleBisector(O, M, B, 4.8, THREE);

    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const M_pos = M.clone().add(dirOM.clone().multiplyScalar(1.2));
    const O_pos = new THREE.Vector3(0, 0.8, 0);

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'O', at: O_pos, name: 'O', text: 'O', coords: O, color: 'color-indigo' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-blue' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'M', at: M_pos, name: 'M', text: 'M', coords: M, color: 'color-emerald' },
      { key: 'angAOM', at: aomLabelPos, text: `∠AOM = ${degAOM.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showAngles },
      { key: 'angBOM', at: bomLabelPos, text: `∠BOM = ${degBOM.toFixed(1)}°`, isAngle: true, color: 'color-orange', show: showAngles },
      { key: 'right', at: rightPos, text: '90°', isAngle: true, color: 'color-teal', show: showAngles },
      { key: 'reflexM', at: get3DReflexBisector(M, O, A, 3.2, THREE), text: '270.0° (M*)', isAngle: true, color: 'color-cyan', show: showReflex && (state.vis3d?.labels !== false) },
    ];
    if (isSpatial) {
      const Msph = new THREE.Vector3().addVectors(A, B).normalize().multiplyScalar(R);
      this.currentLabels.push({
        key: 'bisector_plane',
        at: Msph.clone().multiplyScalar(1.2),
        text: 'Bisector Plane: x · (B - A) = 0',
        color: 'color-emerald',
        show: true,
      });
    }
    this.lastComputed3D = {
      A, B, M, O,
      lenAM: A.distanceTo(M),
      lenMB: B.distanceTo(M),
      diffLen: Math.abs(A.distanceTo(M) - B.distanceTo(M)),
      degAOM,
      degBOM,
      R3D: R,
    };
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}

export {
  computeSagitta,
  computeCurvatureRatio,
  projectStereographicToEquator,
  projectEquatorToSphere,
  interpolateCurvatureHomotopy,
  interpolateGeodesicChord,
};






