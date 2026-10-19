import { PALETTE, clamp, getSubtendedArcRange3D, getMinorArcRange3D } from './circle-core.js';

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

    this.onResize?.();
  }

  #enableDividerDrag(resizer) {
    resizer.addEventListener('pointerdown', (event) => {
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
      };

      const end = () => {
        try {
          if (resizer.hasPointerCapture?.(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
        } catch (_) {}
        resizer.classList.remove('active');
        resizer.removeEventListener('pointermove', move);
        resizer.removeEventListener('pointerup', end);
        resizer.removeEventListener('pointercancel', end);
      };

      resizer.addEventListener('pointermove', move);
      resizer.addEventListener('pointerup', end);
      resizer.addEventListener('pointercancel', end);
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
    this.dampingFactor = 0.05;
    this.screenSpacePanning = true;

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.8;
    this.minDistance = 2;
    this.maxDistance = 500;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    this.state = 'none'; // 'none' | 'rotate' | 'pan' | 'pinch'
    this.pointers = new Map();
    this.prevPointer = { x: 0, y: 0 };
    this.prevSpherePoint = new THREE.Vector3();
    this.angularVelocity = { axis: new THREE.Vector3(0, 1, 0), angle: 0 };
    this.panStart = new THREE.Vector2();
    this.touchPinchDist = 0;

    if (!domElement) return;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerCancel = this.onPointerCancel.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('pointercancel', this._onPointerCancel);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  get isArcball() {
    return this.mode === 'arcball' || this.mode === 'trackball';
  }

  setMode(mode) {
    if (mode === 'arcball' || mode === 'trackball' || mode === 'orbit') {
      this.mode = mode === 'orbit' ? 'orbit' : 'arcball';
      this.angularVelocity.angle = 0;
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
    const v = (cy - y) / radius;
    const dSq = u * u + v * v;

    if (dSq <= 1.0) {
      return new this.THREE.Vector3(u, v, Math.sqrt(1.0 - dSq));
    } else {
      const invLen = 1.0 / Math.sqrt(dSq);
      return new this.THREE.Vector3(u * invLen, v * invLen, 0);
    }
  }

  rotateCameraByAxisAngle(axis, angle) {
    const q = new this.THREE.Quaternion().setFromAxisAngle(axis, angle);
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    offset.applyQuaternion(q);
    this.camera.position.addVectors(this.target, offset);
    this.camera.up.applyQuaternion(q);
    this.camera.lookAt(this.target);
  }

  orbitRotate(deltaX, deltaY, width, height) {
    const offset = new this.THREE.Vector3().subVectors(this.camera.position, this.target);
    const radius = offset.length();
    if (radius < 1e-4) return;

    let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
    let theta = Math.atan2(offset.x, offset.z);

    const deltaTheta = -2 * Math.PI * (deltaX / width) * this.rotateSpeed;
    const deltaPhi = -2 * Math.PI * (deltaY / height) * this.rotateSpeed;

    theta += deltaTheta;

    // Eliminate Top-View Lock in orbit mode:
    const EPS = 0.005;
    phi = Math.max(EPS, Math.min(Math.PI - EPS, phi + deltaPhi));

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.addVectors(this.target, offset);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target);
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
    const targetWidth = targetHeight * this.camera.aspect;

    const camRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camUp = new this.THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const panX = - (deltaX / width) * targetWidth * this.panSpeed;
    const panY = (deltaY / height) * targetHeight * this.panSpeed;

    const panVec = new this.THREE.Vector3()
      .addScaledVector(camRight, panX)
      .addScaledVector(camUp, panY);

    this.target.add(panVec);
    this.camera.position.add(panVec);
  }

  onPointerDown(event) {
    if (!this.enabled) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      if (event.button === 2 || event.shiftKey) {
        this.state = 'pan';
        this.panStart.set(event.clientX, event.clientY);
      } else if (event.button === 0) {
        this.state = 'rotate';
        const rect = this.domElement.getBoundingClientRect();
        this.prevPointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.prevSpherePoint = this.projectOnVirtualSphere(this.prevPointer.x, this.prevPointer.y, rect.width, rect.height);
        this.angularVelocity.angle = 0;
      }
      try { this.domElement.setPointerCapture(event.pointerId); } catch (_) {}
    } else if (this.pointers.size === 2) {
      this.state = 'pinch';
      const pts = Array.from(this.pointers.values());
      this.touchPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }

  onPointerMove(event) {
    if (!this.enabled || this.state === 'none') return;
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const rect = this.domElement.getBoundingClientRect();

    if (this.state === 'rotate' && this.pointers.size === 1) {
      const curX = event.clientX - rect.left;
      const curY = event.clientY - rect.top;

      if (this.isArcball) {
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
          this.angularVelocity.angle = angle;
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
    } else if (this.state === 'pinch' && this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.touchPinchDist > 0 && dist > 0) {
        const factor = this.touchPinchDist / dist;
        this.dolly(factor);
        this.touchPinchDist = dist;
      }
    }
  }

  onPointerUp(event) {
    this.pointers.delete(event.pointerId);
    if (this.domElement?.hasPointerCapture?.(event.pointerId)) {
      try { this.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
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
    const factor = event.deltaY < 0 ? 0.92 : 1.08;
    this.dolly(factor);
    this.angularVelocity.angle = 0;
  }

  update() {
    if (this.enableDamping && this.state === 'none' && this.angularVelocity.angle > 1e-4) {
      if (this.isArcball) {
        this.rotateCameraByAxisAngle(this.angularVelocity.axis, this.angularVelocity.angle);
      }
      this.angularVelocity.angle *= (1 - this.dampingFactor);
      if (this.angularVelocity.angle <= 1e-4) {
        this.angularVelocity.angle = 0;
      }
    }
  }

  reset() {
    this.target.set(0, 0, 0);
    this.angularVelocity.angle = 0;
    this.state = 'none';
  }

  dispose() {
    if (!this.domElement) return;
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerCancel);
    this.domElement.removeEventListener('wheel', this._onWheel);
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
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 30, 20);
    this.scene.add(sun);

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
    const loop = () => {
      if (!this.animating) return;
      this.controls.update();
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

  applyCommonVis(state) {
    this.latestVis3d = state?.vis3d || {};
    if (this.grid) this.grid.visible = state?.vis3d?.gridXZ !== false;
    if (this.axes) this.axes.visible = state?.vis3d?.axes !== false;
    if (this.sphere) this.sphere.visible = state?.vis3d?.sphere !== false;
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

    const pickSphere = (ray) => {
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
        if (t1 > 0) return vOrigin.clone().addScaledVector(vDir, t1);
        const t2 = -b + sqrtDisc;
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

    element.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
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

        if (intersects.length > 0 || distPx < 14) {
          const score = intersects.length > 0 ? 0 : distPx;
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
      } else {
        // Direct click-and-drag radius resizing from 3D sphere circumference/silhouette
        const r3d = this.R || 10;
        const rayObj = ray.ray || ray;
        const vOrigin = rayObj.origin;
        const vDir = rayObj.direction;
        const b = vOrigin.dot(vDir);
        const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
        if (Math.abs(distRayToOrigin - r3d) < 1.4) {
          const st = store.get();
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
    }, { capture: true });

    element.addEventListener('pointermove', (e) => {
      const ray = pointerToRay(e);
      if (activeTarget) {
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

        const hit = pickSphere(ray);
        if (hit) {
          let angle = Math.atan2(hit.z, hit.x);
          if (angle < 0) angle += Math.PI * 2;
          const lat = Math.acos(clamp(hit.y / (this.R || 10), -1, 1));

          if (store.get().playing) {
            store.set({ playing: false });
          }
          if (typeof activeTarget.onDrag === 'function') {
            activeTarget.onDrag(angle, hit, store, lat);
          } else if (activeTarget.latField) {
            store.set({ [activeTarget.field]: angle, [activeTarget.latField]: lat });
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
          if (intersects.length > 0 || distPx < 14) {
            hover = true;
            break;
          }
        }
        if (!hover) {
          const r3d = this.R || 10;
          const rayObj = ray.ray || ray;
          const vOrigin = rayObj.origin;
          const vDir = rayObj.direction;
          const b = vOrigin.dot(vDir);
          const distRayToOrigin = Math.sqrt(Math.max(0, vOrigin.lengthSq() - b * b));
          if (Math.abs(distRayToOrigin - r3d) < 1.4) {
            element.style.cursor = 'ew-resize';
            return;
          }
        }
        element.style.cursor = hover ? 'pointer' : '';
      }
    }, { capture: true });

    const endDrag = (e) => {
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
      if (e.shiftKey) return; // Shift + wheel retains camera dolly zoom
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
      if (!showLabels && !showCoords) {
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
      this.sectorMesh, this.triOPAMesh, this.triOPBMesh,
      this.centralAngleMesh, this.inscribedAngleMesh,
      this.centralReflexMesh, this.inscribedReflexMesh,
      this.angleAlphaPMesh, this.angleBetaPMesh,
      this.angleAlphaAMesh, this.angleBetaBMesh
    );

    this.draggableTargets = [
      { id: 'P', mesh: this.markerP, field: 'angleP', latField: 'latP' },
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const latP = state.latP ?? (Math.PI / 2);
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const P = new THREE.Vector3(
      R * Math.sin(latP) * Math.cos(state.angleP),
      R * Math.cos(latP),
      R * Math.sin(latP) * Math.sin(state.angleP)
    );

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP.position.copy(P);

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOP.geometry.setFromPoints([O, P]);
    this.lineOP.computeLineDistances();
    this.linePA.geometry.setFromPoints([P, A]);
    this.linePB.geometry.setFromPoints([P, B]);

    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;
    this.lineOP.visible = state.showSplit !== false;

    const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP);
    setSectorXZVertices(this.sectorMesh.geometry, 0, 0, R, arcRange.start, arcRange.sweep, 32);
    setTriVertices(this.triOPAMesh.geometry, O, P, A);
    setTriVertices(this.triOPBMesh.geometry, O, P, B);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.sectorMesh.visible = showArea;
    this.triOPAMesh.visible = showArea;
    this.triOPBMesh.visible = showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    const isReflexSubtended = arcRange.sweep > Math.PI;
    setAngleWedgeVertices3D(this.centralAngleMesh, O, A, B, 2.6, 24, THREE, isReflexSubtended);
    setAngleWedgeVertices3D(this.inscribedAngleMesh, P, A, B, 2.4);
    setAngleWedgeVertices3D(this.centralReflexMesh, O, A, B, 3.2, 32, THREE, !isReflexSubtended);
    setAngleWedgeVertices3D(this.inscribedReflexMesh, P, A, B, 3.0, 32, THREE, true);
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
    const O_pos = new THREE.Vector3(0, 0.8, 0);

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
      this.segmentMesh, this.tri1Mesh, this.tri2Mesh,
      this.centralAngleMesh, this.angleP1Mesh, this.angleP2Mesh,
      this.reflexP1Mesh, this.reflexP2Mesh
    );

    this.draggableTargets = [
      { id: 'P1', mesh: this.markerP1, field: 'angleP1', latField: 'latP1' },
      { id: 'P2', mesh: this.markerP2, field: 'angleP2', latField: 'latP2' },
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latP1 = state.latP1 ?? (Math.PI / 2);
    const latP2 = state.latP2 ?? (Math.PI / 2);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const P1 = new THREE.Vector3(
      R * Math.sin(latP1) * Math.cos(state.angleP1),
      R * Math.cos(latP1),
      R * Math.sin(latP1) * Math.sin(state.angleP1)
    );
    const P2 = new THREE.Vector3(
      R * Math.sin(latP2) * Math.cos(state.angleP2),
      R * Math.cos(latP2),
      R * Math.sin(latP2) * Math.sin(state.angleP2)
    );

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerP1.position.copy(P1);
    this.markerP2.position.copy(P2);

    this.chordAB.geometry.setFromPoints([A, B]);
    this.lineP1A.geometry.setFromPoints([P1, A]);
    this.lineP1B.geometry.setFromPoints([P1, B]);
    this.lineP2A.geometry.setFromPoints([P2, A]);
    this.lineP2B.geometry.setFromPoints([P2, B]);

    setTriVertices(this.tri1Mesh.geometry, P1, A, B);
    setTriVertices(this.tri2Mesh.geometry, P2, A, B);

    const arcRange = getSubtendedArcRange3D(state.angleA, state.angleB, state.angleP1);
    const TAU = Math.PI * 2;
    const segStart = (arcRange.start + arcRange.sweep) % TAU;
    const segSweep = TAU - arcRange.sweep;
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false) && (state.showShading !== false);
    this.segmentMesh.visible = showArea;
    this.tri1Mesh.visible = showArea;
    this.tri2Mesh.visible = showArea;

    const O = new THREE.Vector3(0, 0, 0);
    this.markerO.position.copy(O);
    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOA.computeLineDistances?.();
    this.lineOB.computeLineDistances?.();

    const showCenter = state.showCenter !== false;
    this.markerO.visible = this.lineOA.visible = this.lineOB.visible = showCenter;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    setAngleWedgeVertices3D(this.angleP1Mesh, P1, A, B, 2.4);
    setAngleWedgeVertices3D(this.angleP2Mesh, P2, A, B, 2.4);
    setAngleWedgeVertices3D(this.reflexP1Mesh, P1, A, B, 3.0, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexP2Mesh, P2, A, B, 3.0, 32, THREE, true);
    this.angleP1Mesh.visible = this.angleP2Mesh.visible = showAngles;
    this.reflexP1Mesh.visible = this.reflexP2Mesh.visible = showReflex;

    setAngleWedgeVertices3D(this.centralAngleMesh, O, A, B, 2.6);
    this.centralAngleMesh.visible = showCenter && showAngles;

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
      { key: 'angP1', at: p1LabelPos, text: `θ₁ = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showAngles },
      { key: 'angP2', at: p2LabelPos, text: `θ₂ = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showAngles },
      { key: 'reflexP1', at: get3DReflexBisector(P1, A, B, 4.0, THREE), text: `θ₁* = ${(360 - degP1).toFixed(1)}°`, isAngle: true, color: 'color-blue', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflexP2', at: get3DReflexBisector(P2, A, B, 4.0, THREE), text: `θ₂* = ${(360 - degP2).toFixed(1)}°`, isAngle: true, color: 'color-emerald', show: showReflex && (state.vis3d?.labels !== false) },
    ];
    if (showCenter) {
      this.currentLabels.push(
        { key: 'O', at: new THREE.Vector3(0, 0.8, 0), name: 'O', text: 'O', coords: O, color: 'color-indigo' },
        { key: 'central', at: centLabelPos, text: `2θ = ${degCent.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles }
      );
    }
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
      this.quadMesh1, this.quadMesh2,
      this.angleAMesh, this.angleBMesh, this.angleCMesh, this.angleDMesh, this.angleExtMesh,
      this.reflexAMesh, this.reflexBMesh, this.reflexCMesh, this.reflexDMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
      { id: 'C', mesh: this.markerC, field: 'angleC', latField: 'latC' },
      { id: 'D', mesh: this.markerD, field: 'angleD', latField: 'latD' },
    ];
  }

  render(state) {
    this.applyCommonVis(state);
    const default2D = 180;
    const R = ((state?.radius || default2D) / default2D) * 10;
    this.R = R;
    this.sphere.scale.setScalar(R);
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latC = state.latC ?? (Math.PI / 2);
    const latD = state.latD ?? (Math.PI / 2);
    const A = new THREE.Vector3(R * Math.sin(latA) * Math.cos(state.angleA), R * Math.cos(latA), R * Math.sin(latA) * Math.sin(state.angleA));
    const B = new THREE.Vector3(R * Math.sin(latB) * Math.cos(state.angleB), R * Math.cos(latB), R * Math.sin(latB) * Math.sin(state.angleB));
    const C = new THREE.Vector3(R * Math.sin(latC) * Math.cos(state.angleC), R * Math.cos(latC), R * Math.sin(latC) * Math.sin(state.angleC));
    const D = new THREE.Vector3(R * Math.sin(latD) * Math.cos(state.angleD), R * Math.cos(latD), R * Math.sin(latD) * Math.sin(state.angleD));

    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerC.position.copy(C);
    this.markerD.position.copy(D);

    this.edgeAB.geometry.setFromPoints([A, B]);
    this.edgeBC.geometry.setFromPoints([B, C]);
    this.edgeCD.geometry.setFromPoints([C, D]);
    this.edgeDA.geometry.setFromPoints([D, A]);

    this.diagAC.geometry.setFromPoints([A, C]);
    this.diagAC.computeLineDistances();
    this.diagBD.geometry.setFromPoints([B, D]);
    this.diagBD.computeLineDistances();
    this.diagAC.visible = this.diagBD.visible = Boolean(state.showDiagonals);

    // Exterior ray past C along DC with crisp arrow head (no sphere glob)
    const dirDC = new THREE.Vector3().subVectors(C, D).normalize();
    this.rayExteriorArrow.position.copy(C);
    this.rayExteriorArrow.setDirection(dirDC);
    this.rayExteriorArrow.setLength(4.5, 0.7, 0.35);
    this.rayExteriorArrow.visible = Boolean(state.showExterior);

    setTriVertices(this.quadMesh1.geometry, A, B, C);
    setTriVertices(this.quadMesh2.geometry, A, C, D);
    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.quadMesh1.visible = this.quadMesh2.visible = showArea;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const showReflex = Boolean(state.vis3d?.reflex);
    setAngleWedgeVertices3D(this.angleAMesh, A, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleBMesh, B, A, C, 2.2);
    setAngleWedgeVertices3D(this.angleCMesh, C, B, D, 2.2);
    setAngleWedgeVertices3D(this.angleDMesh, D, C, A, 2.2);
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
    if (state.showDiagonals) {
      const midAC = new THREE.Vector3().addVectors(A, C).multiplyScalar(0.5);
      const midBD = new THREE.Vector3().addVectors(B, D).multiplyScalar(0.5);
      const sumACVal = (degA + degC).toFixed(1);
      const sumBDVal = (degB + degD).toFixed(1);
      this.currentLabels.push(
        { key: 'sumAC', at: midAC.clone().add(new THREE.Vector3(0, 0.6, 0)), text: `A+C = ${sumACVal}°`, color: 'color-lavender', show: true },
        { key: 'sumBD', at: midBD.clone().add(new THREE.Vector3(0, -0.6, 0)), text: `B+D = ${sumBDVal}°`, color: 'color-sky', show: true }
      );
    }
    if (state.showExterior) {
      const extPt = new THREE.Vector3().addVectors(C, dirDC.clone().multiplyScalar(4));
      const degExt = get3DAngleDegrees(C, B, extPt, THREE);
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
    this.tangentDoubleArrow = makeDoubleArrowLine(THREE, PALETTE.emerald);
    this.rightAngleMarker = makeLine(THREE, PALETTE.teal);
    this.rightAngleMesh = makeRightAngleMesh(THREE, PALETTE.teal, 0.75);

    // Dynamic Quadrant Sector Mesh on XZ Plane
    this.quadrantMesh = makeTriMesh(THREE, PALETTE.indigo, 0.16);

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
      makeDoubleArrowLine(THREE, PALETTE.emerald),
      makeDoubleArrowLine(THREE, PALETTE.emerald),
      makeDoubleArrowLine(THREE, PALETTE.emerald),
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
      makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25),
      makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25),
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
      this.markerQ,
      this.lineTQ,
      this.secantMesh
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
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;

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

    // 1. Dynamic Quadrant Shading in 3D
    if (showQuadrant) {
      setSectorXZVertices(this.quadrantMesh.geometry, 0, 0, R, quadStart, Math.PI / 2, 32);
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
        const T = new THREE.Vector3(
          R * Math.sin(lat) * Math.cos(ang),
          R * Math.cos(lat),
          R * Math.sin(lat) * Math.sin(ang)
        );

        this.tangentMarkers[i].position.copy(T);
        this.tangentMarkers[i].visible = true;

        this.radiiLines[i].geometry.setFromPoints([O, T]);
        this.radiiLines[i].visible = true;

        // Tangent direction
        let tanDir = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
        if (Math.abs(Math.sin(lat)) < 0.99) {
          const radDir = T.clone().normalize();
          tanDir = new THREE.Vector3(0, 1, 0).cross(radDir).normalize();
          if (tanDir.lengthSq() < 0.01) tanDir = new THREE.Vector3(1, 0, 0).cross(radDir).normalize();
        }

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
        activeTangents.push({ index: i, name, pos: T, angle: normAngle(ang), rightAngleAt, reflexAngleAt });
      } else {
        this.tangentMarkers[i].visible = false;
        this.radiiLines[i].visible = false;
        this.tangentDoubleArrows[i].group.visible = false;
        this.rightAngleMarkers[i].visible = false;
        this.rightAngleMeshes[i].visible = false;
        this.reflexRightAngleMeshes[i].visible = false;
      }
    }

    // 2. Chords and Subtended Areas in 3D
    const chordLabels = [];
    if (count >= 2) {
      const sorted = [...activeTangents].sort((a, b) => a.angle - b.angle);
      for (let k = 0; k < 4; k++) {
        if (k < count) {
          const p1 = sorted[k];
          const p2 = sorted[(k + 1) % count];
          let sweep = p2.angle - p1.angle;
          if (sweep <= 0) sweep += Math.PI * 2;

          this.chordLines[k].geometry.setFromPoints([p1.pos, p2.pos]);
          this.chordLines[k].computeLineDistances();
          this.chordLines[k].visible = showChords;

          if (state.chordAreaMode === 'sector') {
            setSectorXZVertices(this.chordAreaMeshes[k].geometry, 0, 0, R, p1.angle, sweep, 32);
          } else {
            setSegmentXZVertices(this.chordAreaMeshes[k].geometry, 0, 0, R, p1.angle, sweep, 32);
          }
          this.chordAreaMeshes[k].visible = showArea && showChords;

          const midAngle = p1.angle + sweep / 2;
          const badgeR = (state.chordAreaMode === 'sector') ? (0.6 * R) : (0.85 * R);
          const badgePos = new THREE.Vector3(badgeR * Math.cos(midAngle), 0.3, badgeR * Math.sin(midAngle));
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
        }
      }
    } else {
      for (let k = 0; k < 4; k++) {
        this.chordLines[k].visible = false;
        this.chordAreaMeshes[k].visible = false;
      }
    }

    // Secant chord & triangle (relative to primary T)
    const showSecant = Boolean(state.showSecant);
    const angQ = (rawAngles[0]) + 0.45;
    const Q = new THREE.Vector3(R * Math.cos(angQ), 0, R * Math.sin(angQ));
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
      const midQuad = quadStart + Math.PI / 4;
      const qPos = new THREE.Vector3(0.65 * R * Math.cos(midQuad), 0.2, 0.65 * R * Math.sin(midQuad));
      const roman = ['I', 'II', 'III', 'IV'][quadIndex];
      const sign = ['(+X, +Z)', '(-X, +Z)', '(-X, -Z)', '(+X, -Z)'][quadIndex];
      this.currentLabels.push({
        key: 'quadrant',
        at: qPos,
        text: `Q-${roman} ${sign}`,
        color: 'color-indigo',
        show: true,
      });
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
          color: 'color-teal',
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

    this.currentLabels.push(...chordLabels);

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
      this.segmentMesh, this.minorSegmentMesh,
      this.triMesh, this.proofTriMesh, this.triABDMesh,
      this.rightAngleBMesh, this.rightAngleAMesh, this.rightAngleTMesh,
      this.angleTanMesh, this.angleBMesh, this.angleIntDMesh, this.angleExtDMesh,
      this.reflexTanMesh, this.reflexBMesh, this.reflexDMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
      { id: 'T', mesh: this.markerT, field: 'angleT', latField: 'latT' },
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
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const latT = state.latT ?? (Math.PI / 2);
    const T = new THREE.Vector3(
      R * Math.sin(latT) * Math.cos(state.angleT),
      R * Math.cos(latT),
      R * Math.sin(latT) * Math.sin(state.angleT)
    );
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const D = T.clone().negate();
    const Dext = D.clone().add(D.clone().normalize().multiplyScalar(3.2));

    this.markerT.position.copy(T);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerD.position.copy(D);

    const tanDir = new THREE.Vector3(-Math.sin(state.angleT), 0, Math.cos(state.angleT));
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

    const arcRange = getSubtendedArcRange3D(state.angleT, state.angleA, state.angleB);
    const TAU = Math.PI * 2;
    const segStart = (arcRange.start + arcRange.sweep) % TAU;
    const segSweep = TAU - arcRange.sweep;
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, segStart, segSweep, 32);
    setSegmentXZVertices(this.minorSegmentMesh.geometry, 0, 0, R, arcRange.start, arcRange.sweep, 32);

    setTriVertices(this.triMesh.geometry, T, A, B);
    if (showProof) {
      setTriVertices(this.proofTriMesh.geometry, T, B, D);
      setTriVertices(this.triABDMesh.geometry, A, B, D);
    }

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    const showTriangles = showArea && Boolean(state.showTriangleShading || state.showTriangles);
    this.segmentMesh.visible = showArea;
    this.minorSegmentMesh.visible = showArea;
    this.triMesh.visible = showTriangles;
    this.proofTriMesh.visible = showProof && showTriangles;
    this.triABDMesh.visible = showProof && showTriangles;

    // 3D Angle Wedges & Spatial Bisectors
    const showAngles = (state.vis3d?.angles !== false) && (state.showAngles !== false);
    const degB = get3DAngleDegrees(B, T, A, THREE);
    const degTan1 = get3DAngleDegrees(T, tan1, A, THREE);
    const degTan2 = get3DAngleDegrees(T, tan2, A, THREE);
    const activeTan = Math.abs(degTan1 - degB) <= Math.abs(degTan2 - degB) ? tan1 : tan2;
    const degTan = Math.abs(degTan1 - degB) <= Math.abs(degTan2 - degB) ? degTan1 : degTan2;

    setAngleWedgeVertices3D(this.angleTanMesh, T, activeTan, A, 2.5);
    setAngleWedgeVertices3D(this.angleBMesh, B, T, A, 2.4);
    this.angleTanMesh.visible = this.angleBMesh.visible = showAngles;

    const showReflex = Boolean(state.vis3d?.reflex);
    setAngleWedgeVertices3D(this.reflexTanMesh, T, activeTan, A, 3.2, 32, THREE, true);
    setAngleWedgeVertices3D(this.reflexBMesh, B, T, A, 3.0, 32, THREE, true);
    this.reflexTanMesh.visible = this.reflexBMesh.visible = showReflex;

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
      this.reflexDMesh.visible = showReflex && (state.showDAngles !== false);
    } else {
      this.reflexDMesh.visible = false;
    }
    this.rightAngleBMesh.visible = showProof && showAngles;
    this.rightAngleAMesh.visible = showProof && showAngles;
    this.rightAngleTMesh.visible = showProof && showAngles;
    const showDAngles = showProof && showAngles && (state.showDAngles !== false);
    this.angleIntDMesh.visible = showDAngles;
    this.angleExtDMesh.visible = showDAngles;

    const angTPos = get3DAngleBisector(T, activeTan, A, 3.2, THREE);
    const angBPos = get3DAngleBisector(B, T, A, 3.2, THREE);
    const tanLabelPos = new THREE.Vector3().addVectors(T, tanDir.clone().multiplyScalar(L * 0.65));

    const T_pos = T.clone().multiplyScalar(1.15);
    const A_pos = A.clone().multiplyScalar(1.15);
    const B_pos = B.clone().multiplyScalar(1.15);
    const D_pos = D.clone().multiplyScalar(1.15);

    // Alternate segment centroid label positions (both in color-sky)
    const majorMidAng = (segStart + segSweep / 2) % TAU;
    const minorMidAng = (arcRange.start + arcRange.sweep / 2) % TAU;
    const majorLabelPos = new THREE.Vector3(R * 0.62 * Math.cos(majorMidAng), 0, R * 0.62 * Math.sin(majorMidAng));
    const minorLabelPos = new THREE.Vector3(R * 0.82 * Math.cos(minorMidAng), 0, R * 0.82 * Math.sin(minorMidAng));

    this.currentLabels = [
      ...AXES_3D_LABELS,
      { key: 'T', at: T_pos, name: 'T', text: 'T', coords: T, color: 'color-red' },
      { key: 'A', at: A_pos, name: 'A', text: 'A', coords: A, color: 'color-blue' },
      { key: 'B', at: B_pos, name: 'B', text: 'B', coords: B, color: 'color-orange' },
      { key: 'tangent', at: tanLabelPos, name: 'Tangent', text: 'Tangent', color: 'color-emerald' },
      { key: 'angTan', at: angTPos, text: `α = ${degTan.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
      { key: 'angB', at: angBPos, text: `α = ${degB.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showAngles },
      { key: 'reflexTan', at: get3DReflexBisector(T, activeTan, A, 4.0, THREE), text: `α* = ${(360 - degTan).toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflexB', at: get3DReflexBisector(B, T, A, 4.0, THREE), text: `α* = ${(360 - degB).toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'segMajor', at: majorLabelPos, text: 'Alt Seg (Maj)', color: 'color-sky', show: showArea },
      { key: 'segMinor', at: minorLabelPos, text: 'Alt Seg (Min)', color: 'color-violet', show: showArea },
    ];
    if (showProof) {
      this.currentLabels.push({ key: 'D', at: D_pos, name: 'D', text: 'D', coords: D, color: 'color-indigo' });
      const rightAngleBAt = get3DAngleBisector(B, T, D, 2.6, THREE);
      const rightAngleAAt = get3DAngleBisector(A, T, D, 2.6, THREE);
      const rightAngleTAt = get3DAngleBisector(T, D, activeTan, 2.6, THREE);
      const intDAt = get3DAngleBisector(D, T, A, 3.4, THREE);
      const extDAt = get3DAngleBisector(D, A, Dext, 3.2, THREE);
      const showDLabels = showAngles && (state.showDAngles !== false);
      this.currentLabels.push(
        { key: 'rightB', at: rightAngleBAt, text: '∠TBD = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'rightA', at: rightAngleAAt, text: '∠TAD = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'rightT', at: rightAngleTAt, text: 'TD ⊥ Tan = 90.0°', isAngle: true, color: 'color-teal', show: showAngles },
        { key: 'angIntD', at: intDAt, text: `∠TDA = ${degIntD.toFixed(1)}°`, isAngle: true, color: 'color-yellow', show: showDLabels },
        { key: 'angExtD', at: extDAt, text: `Ext D = ${degExtD.toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showDLabels },
        { key: 'reflexD', at: get3DReflexBisector(D, T, A, 4.0, THREE), text: `D* = ${(360 - degIntD).toFixed(1)}°`, isAngle: true, color: 'color-rose', show: showReflex && (state.vis3d?.labels !== false) && (state.showDAngles !== false) },
      );
    }
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
    this.reflexRight1Mesh = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25);
    this.reflexRight2Mesh = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25);

    this.scene.add(
      this.markerO, this.markerP, this.markerT1, this.markerT2, this.markerK,
      this.lineOP, this.radiusOT1, this.radiusOT2,
      this.tangentPT1, this.tangentPT2, this.chordT1T2,
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
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const O = new THREE.Vector3(0, 0, 0);
    const distRatio = Math.max(1.15, (state.pointDist || 260) / (state.radius || 120));
    const d = R * distRatio;
    const angP = state.pointAngle || 0;
    const latP = state.latP ?? (Math.PI / 2);

    const P = new THREE.Vector3(
      d * Math.sin(latP) * Math.cos(angP),
      d * Math.cos(latP),
      d * Math.sin(latP) * Math.sin(angP)
    );
    const alpha = Math.acos(Math.min(1, Math.max(-1, R / d)));

    // Unit vector towards P
    const u = P.clone().normalize();
    // Orthogonal vector in the tangential plane
    let v = new THREE.Vector3(0, 1, 0).cross(u);
    if (v.lengthSq() < 0.01) v = new THREE.Vector3(1, 0, 0).cross(u);
    v.normalize();

    // Tangent contact points on sphere
    const T1 = u.clone().multiplyScalar(R * Math.cos(alpha)).add(v.clone().multiplyScalar(R * Math.sin(alpha)));
    const T2 = u.clone().multiplyScalar(R * Math.cos(alpha)).sub(v.clone().multiplyScalar(R * Math.sin(alpha)));
    const K = u.clone().multiplyScalar(R * Math.cos(alpha));

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
    this.chordT1T2.geometry.setFromPoints([T1, T2]);

    setTriVertices(this.tri1Mesh.geometry, O, T1, P);
    setTriVertices(this.tri2Mesh.geometry, O, T2, P);
    setRightAngle3DVertices(this.rightAngle1Mesh, T1, O, P, 1.3);
    setRightAngle3DVertices(this.rightAngle2Mesh, T2, O, P, 1.3);
    setRightAngle3DVertices(this.rightAngleKMesh, K, T1, P, 1.1);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.tri1Mesh.visible = this.tri2Mesh.visible = (state.showCongruence !== false) && showArea;

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
      { key: 'reflex1', at: get3DReflexBisector(T1, O, P, 3.8, THREE), text: '270.0° (T₁*)', isAngle: true, color: 'color-teal', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'reflex2', at: get3DReflexBisector(T2, O, P, 3.8, THREE), text: '270.0° (T₂*)', isAngle: true, color: 'color-teal', show: showReflex && (state.vis3d?.labels !== false) },
      { key: 'angO1', at: angO1Pos, text: `β₁ = ${degO1.toFixed(1)}°`, isAngle: true, color: 'color-amber', show: showAngles },
      { key: 'angO2', at: angO2Pos, text: `β₂ = ${degO2.toFixed(1)}°`, isAngle: true, color: 'color-orange', show: showAngles },
      { key: 'angP1', at: angP1Pos, text: `α₁ = ${degP1.toFixed(1)}°`, isAngle: true, color: 'color-lime', show: showAngles },
      { key: 'angP2', at: angP2Pos, text: `α₂ = ${degP2.toFixed(1)}°`, isAngle: true, color: 'color-fuchsia', show: showAngles },
    ];
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
    this.reflexRightMesh = makeAngleWedgeMesh(THREE, PALETTE.teal, 0.25);

    this.scene.add(
      this.markerO, this.markerA, this.markerB, this.markerM,
      this.lineAM, this.lineMB, this.perpOM, this.lineOA, this.lineOB,
      this.bisectorExtArrow.group,
      this.tri1Mesh, this.tri2Mesh, this.segmentMesh, this.rightAngleMesh,
      this.angleAOMMesh, this.angleBOMMesh, this.reflexRightMesh
    );

    this.draggableTargets = [
      { id: 'A', mesh: this.markerA, field: 'angleA', latField: 'latA' },
      { id: 'B', mesh: this.markerB, field: 'angleB', latField: 'latB' },
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
    this.circleWire.scale.setScalar(R);
    const { THREE } = this;
    const latA = state.latA ?? (Math.PI / 2);
    const latB = state.latB ?? (Math.PI / 2);
    const O = new THREE.Vector3(0, 0, 0);
    const A = new THREE.Vector3(
      R * Math.sin(latA) * Math.cos(state.angleA),
      R * Math.cos(latA),
      R * Math.sin(latA) * Math.sin(state.angleA)
    );
    const B = new THREE.Vector3(
      R * Math.sin(latB) * Math.cos(state.angleB),
      R * Math.cos(latB),
      R * Math.sin(latB) * Math.sin(state.angleB)
    );
    const M = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5);

    this.markerO.position.copy(O);
    this.markerA.position.copy(A);
    this.markerB.position.copy(B);
    this.markerM.position.copy(M);

    this.lineAM.geometry.setFromPoints([A, M]);
    this.lineMB.geometry.setFromPoints([M, B]);
    this.perpOM.geometry.setFromPoints([O, M]);

    this.lineOA.geometry.setFromPoints([O, A]);
    this.lineOB.geometry.setFromPoints([O, B]);
    this.lineOA.visible = this.lineOB.visible = state.showRadii !== false;

    const dirOM = M.clone().normalize();
    const ext1 = dirOM.clone().multiplyScalar(-14);
    const ext2 = dirOM.clone().multiplyScalar(14);
    this.bisectorExtArrow.setPoints(ext1, ext2);
    this.bisectorExtArrow.group.visible = state.showExtendedBisector !== false;

    setTriVertices(this.tri1Mesh.geometry, O, A, M);
    setTriVertices(this.tri2Mesh.geometry, O, B, M);
    setRightAngle3DVertices(this.rightAngleMesh, M, O, A, 1.4);

    const { start, sweep } = getMinorArcRange3D(state.angleA, state.angleB);
    setSegmentXZVertices(this.segmentMesh.geometry, 0, 0, R, start, sweep);

    const showArea = (state.vis3d?.area !== false) && (state.showArea !== false);
    this.tri1Mesh.visible = this.tri2Mesh.visible = showArea;
    this.segmentMesh.visible = showArea;

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
      { key: 'reflexM', at: get3DReflexBisector(M, O, A, 3.2, THREE), text: '270.0° (M*)', isAngle: true, color: 'color-teal', show: showReflex && (state.vis3d?.labels !== false) },
    ];
    this.overlay.render(this.currentLabels, state.vis3d);
  }
}


