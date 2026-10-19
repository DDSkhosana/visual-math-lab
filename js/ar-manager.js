/**
 * @file ar-manager.js
 * Universal Multi-Tier Augmented Reality (AR) Manager for 3D Geometry Visualizers.
 *
 * Provides a robust, cross-platform AR experience:
 * - Tier 1: WebXR Immersive AR (navigator.xr 'immersive-ar') on supported headsets and Chrome Android.
 * - Tier 2: Universal Video Pass-Through AR via getUserMedia(video: facingMode 'environment')
 *   with transparent WebGL canvas, touch placement, and gyroscope/orientation tracking.
 * - Graceful fallback and cleanup on session termination.
 */

export class ARManager {
  /**
   * @param {Object} options
   * @param {Object} options.renderer - Three.js WebGLRenderer instance
   * @param {Object} options.scene - Three.js Scene instance
   * @param {Object} options.camera - Three.js PerspectiveCamera instance
   * @param {HTMLElement} options.container - Container holding the 3D canvas
   * @param {Function} [options.onSessionStart] - Callback when AR session begins
   * @param {Function} [options.onSessionEnd] - Callback when AR session terminates
   */
  constructor(options = {}) {
    this.renderer = options.renderer || null;
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.container = options.container || null;
    this.onSessionStart = options.onSessionStart || null;
    this.onSessionEnd = options.onSessionEnd || null;

    this.isActive = false;
    this.mode = null; // 'webxr' | 'video-passthrough' | 'spatial-simulation' | null
    this.videoElement = null;
    this.mediaStream = null;
    this.xrSession = null;
    this.hudElement = null;
    this.reticleElement = null;
    this.arReticle3D = null;
    this.previousViewMode = null;
    this.previousDockCollapsed = null;
    this.isMirrored = false;
    this.gyroHandler = null;
    this.gyroBase = null;
    this.originalClearColor = 0x0a0f1d;
    this.originalClearAlpha = 1.0;

    // Transform offsets for AR placement
    this.placement = {
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      position: { x: 0, y: -2, z: -15 },
      rotation: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Evaluates device AR capabilities.
   * @returns {Promise<{ webxr: boolean, camera: boolean }>}
   */
  async checkCapabilities() {
    let webxr = false;
    let camera = false;

    if (typeof navigator !== 'undefined') {
      if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
        try {
          webxr = await navigator.xr.isSessionSupported('immersive-ar');
        } catch (_) {
          webxr = false;
        }
      }

      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        camera = true;
      }
    }

    return { webxr, camera };
  }

  /**
   * Starts an Augmented Reality session.
   * Tries WebXR first; falls back to high-performance Video Pass-Through AR.
   * @returns {Promise<boolean>}
   */
  async start() {
    if (this.isActive) return true;

    const { webxr, camera } = await this.checkCapabilities();

    if (webxr && this.renderer?.xr) {
      try {
        const started = await this.#startWebXR();
        if (started) return true;
      } catch (err) {
        console.warn('WebXR AR failed, falling back to Video Pass-Through AR:', err);
      }
    }

    if (camera) {
      try {
        return await this.#startVideoPassThrough();
      } catch (err) {
        console.warn('Camera pass-through unavailable, falling back to Spatial AR Simulation:', err);
      }
    }

    return this.#startSpatialSimulation();
  }

  async #startWebXR() {
    if (!navigator.xr || !this.renderer) return false;

    this.renderer.xr.enabled = true;
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
    });

    this.xrSession = session;
    this.mode = 'webxr';
    this.isActive = true;

    session.addEventListener('end', () => this.stop());
    await this.renderer.xr.setSession(session);

    if (typeof this.onSessionStart === 'function') {
      this.onSessionStart({ mode: 'webxr', session });
    }
    return true;
  }

  #applyCanvasARLayering(active) {
    const doc = this.container?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const mainView = doc?.getElementById?.('main-view');

    if (active) {
      if (mainView?.classList) {
        if (mainView.classList.contains('layout-2d')) this.previousViewMode = '2d';
        else if (mainView.classList.contains('layout-3d')) this.previousViewMode = '3d';
        else this.previousViewMode = 'split';
      }
      const btn3d = doc?.getElementById?.('btn-3d');
      if (btn3d && this.previousViewMode !== '3d') {
        btn3d.click?.();
      }

      // Auto-collapse the Floating Workspace Dock to its compact pill for unobstructed AR view
      const dockEl = doc?.getElementById?.('workspace-dock');
      const dockCollapseBtn = doc?.getElementById?.('dock-collapse-btn');
      if (dockEl && dockCollapseBtn) {
        this.previousDockCollapsed = Boolean(dockEl.classList?.contains?.('is-collapsed'));
        if (!this.previousDockCollapsed) {
          dockCollapseBtn.click?.();
        }
      }
    } else {
      if (this.previousViewMode && this.previousViewMode !== '3d') {
        const restoreBtn = doc?.getElementById?.(this.previousViewMode === '2d' ? 'btn-2d' : 'btn-split');
        restoreBtn?.click?.();
        this.previousViewMode = null;
      }

      if (this.previousDockCollapsed === false) {
        const dockEl = doc?.getElementById?.('workspace-dock');
        const dockCollapseBtn = doc?.getElementById?.('dock-collapse-btn');
        if (dockEl?.classList?.contains?.('is-collapsed') && dockCollapseBtn) {
          dockCollapseBtn.click?.();
        }
      }
      this.previousDockCollapsed = null;
    }

    const canvas = this.renderer?.domElement;
    if (canvas && canvas.style) {
      if (active) {
        canvas.style.position = 'relative';
        canvas.style.zIndex = '2';
        canvas.style.background = 'transparent';
      } else {
        canvas.style.background = '';
      }
    }
    if (this.scene) {
      if (active) {
        if (this.scene.background !== null) {
          this.originalSceneBackground = this.scene.background;
        }
        this.scene.background = null;
      } else if (this.originalSceneBackground !== undefined) {
        this.scene.background = this.originalSceneBackground;
      }
    }

    if (active) {
      this.#mountSpatialAnchorReticle(doc);
      this.#enableGyroscopeTracking();
    } else {
      this.setPlacementScale(1.0);
      this.setPlacementOffset(0, 0);
      this.#removeSpatialAnchorReticle();
      this.#disableGyroscopeTracking();
    }
  }

  /**
   * Toggles horizontal mirroring on the live camera video feed (ideal for laptop/front webcams).
   * @param {boolean} mirrored
   */
  setVideoMirror(mirrored) {
    this.isMirrored = Boolean(mirrored);
    if (this.videoElement && this.videoElement.style) {
      this.videoElement.style.transform = this.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
    const mirrorBtn = this.hudElement?.querySelector?.('.btn-ar-mirror');
    if (mirrorBtn) {
      mirrorBtn.setAttribute?.('aria-pressed', String(this.isMirrored));
      mirrorBtn.style.borderColor = this.isMirrored ? '#38bdf8' : '#475569';
      mirrorBtn.style.color = this.isMirrored ? '#38bdf8' : '#f8fafc';
    }
  }

  /**
   * Scales the anchored 3D hologram & surface reticle (e.g. 0.6x Desk, 1.0x Standard, 1.4x Room).
   * @param {number} targetScale
   */
  setPlacementScale(targetScale) {
    const nextScale = Math.max(0.4, Math.min(2.0, Number(targetScale) || 1.0));
    const prevScale = this.placement.scale || 1.0;
    this.placement.scale = nextScale;

    if (this.camera && prevScale !== nextScale) {
      const ratio = prevScale / nextScale;
      if (typeof this.camera.position?.multiplyScalar === 'function') {
        this.camera.position.multiplyScalar(ratio);
      } else if (this.camera.position && typeof this.camera.position.set === 'function') {
        this.camera.position.set(
          (this.camera.position.x || 0) * ratio,
          (this.camera.position.y || 0) * ratio,
          (this.camera.position.z || 32) * ratio
        );
      }
      if (this.gyroBase) {
        this.gyroBase.dist *= ratio;
      }
    }

    if (this.reticleElement && this.reticleElement.style) {
      const sizePx = Math.round(280 * nextScale);
      this.reticleElement.style.width = `${sizePx}px`;
      this.reticleElement.style.height = `${sizePx}px`;
    }

    const scaleBtn = this.hudElement?.querySelector?.('.btn-ar-scale');
    if (scaleBtn) {
      const label = nextScale < 0.8 ? '0.6x Desk' : nextScale > 1.2 ? '1.4x Room' : '1.0x Std';
      scaleBtn.textContent = `⤢ ${label}`;
    }
  }

  /**
   * Offsets the anchored 3D hologram and floor reticle to place it onto any physical surface in view.
   * @param {number} offsetX - Horizontal screen offset in pixels
   * @param {number} offsetY - Vertical screen offset in pixels
   */
  setPlacementOffset(offsetX, offsetY) {
    const dx = Number(offsetX) || 0;
    const dy = Number(offsetY) || 0;
    this.placement.offsetX = dx;
    this.placement.offsetY = dy;
    this.placement.position.x = dx;
    this.placement.position.y = dy;

    if (this.reticleElement && this.reticleElement.style) {
      this.reticleElement.style.left = dx === 0 ? '50%' : `calc(50% + ${Math.round(dx)}px)`;
      this.reticleElement.style.top = dy === 0 ? '66%' : `calc(66% + ${Math.round(dy)}px)`;
    }

    if (this.camera) {
      if (dx === 0 && dy === 0) {
        this.camera.clearViewOffset?.();
      } else if (typeof this.camera.setViewOffset === 'function') {
        const w = this.container?.clientWidth || 1000;
        const h = this.container?.clientHeight || 700;
        this.camera.setViewOffset(w, h, -dx, -dy, w, h);
      }
      this.camera.updateProjectionMatrix?.();
    }
  }

  #mountSpatialAnchorReticle(doc) {
    this.#removeSpatialAnchorReticle();

    // 1. DOM surface-lock reticle & ground shadow beneath the 3D sphere (draggable to place on surface)
    if (doc && this.container && typeof doc.createElement === 'function') {
      const reticle = doc.createElement('div');
      reticle.id = 'ar-surface-reticle';
      reticle.className = 'ar-surface-reticle';
      reticle.title = 'Drag to place 3D hologram onto your physical desk or floor';
      reticle.style.position = 'absolute';
      reticle.style.left = '50%';
      reticle.style.top = '66%';
      reticle.style.width = '280px';
      reticle.style.height = '280px';
      reticle.style.transform = 'translate(-50%, -50%) perspective(500px) rotateX(68deg)';
      reticle.style.borderRadius = '50%';
      reticle.style.background = 'radial-gradient(circle, rgba(2, 6, 23, 0.55) 0%, rgba(56, 189, 248, 0.14) 52%, transparent 72%)';
      reticle.style.border = '2px dashed rgba(56, 189, 248, 0.55)';
      reticle.style.boxShadow = '0 0 28px rgba(56, 189, 248, 0.25), inset 0 0 18px rgba(16, 185, 129, 0.2)';
      reticle.style.zIndex = '3';
      reticle.style.cursor = 'grab';
      reticle.style.pointerEvents = 'auto';
      reticle.style.touchAction = 'none';

      let draggingReticle = false;
      let startX = 0;
      let startY = 0;
      let baseOffsetX = 0;
      let baseOffsetY = 0;

      reticle.addEventListener?.('pointerdown', (e) => {
        e?.stopPropagation?.();
        draggingReticle = true;
        startX = e.clientX || 0;
        startY = e.clientY || 0;
        baseOffsetX = this.placement.offsetX || 0;
        baseOffsetY = this.placement.offsetY || 0;
        reticle.style.cursor = 'grabbing';
        reticle.setPointerCapture?.(e.pointerId);
      });

      reticle.addEventListener?.('pointermove', (e) => {
        if (!draggingReticle) return;
        e?.stopPropagation?.();
        const dx = (e.clientX || 0) - startX;
        const dy = (e.clientY || 0) - startY;
        this.setPlacementOffset(baseOffsetX + dx, baseOffsetY + dy);
      });

      const endDrag = (e) => {
        if (!draggingReticle) return;
        draggingReticle = false;
        reticle.style.cursor = 'grab';
        if (e?.pointerId !== undefined) {
          reticle.releasePointerCapture?.(e.pointerId);
        }
      };
      reticle.addEventListener?.('pointerup', endDrag);
      reticle.addEventListener?.('pointercancel', endDrag);

      this.container.appendChild(reticle);
      this.reticleElement = reticle;
    }

    // 2. Three.js 3D floor reticle & contact shadow at y = -10.5 in world space
    const THREE = globalThis.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    if (THREE && this.scene && typeof this.scene.add === 'function' && THREE.Group && THREE.RingGeometry && THREE.CircleGeometry) {
      try {
        const group = new THREE.Group();
        group.position.set(0, -10.5, 0);

        const shadowGeom = new THREE.CircleGeometry(9.5, 48);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x020617,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        group.add(shadowMesh);

        const outerRingGeom = new THREE.RingGeometry(9.6, 10.0, 64);
        const outerRingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat);
        outerRing.rotation.x = -Math.PI / 2;
        group.add(outerRing);

        const innerRingGeom = new THREE.RingGeometry(5.6, 5.85, 48);
        const innerRingMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
        innerRing.rotation.x = -Math.PI / 2;
        group.add(innerRing);

        this.scene.add(group);
        this.arReticle3D = group;
      } catch (_) {}
    }
  }

  #removeSpatialAnchorReticle() {
    if (this.reticleElement) {
      this.reticleElement.remove?.();
      this.reticleElement = null;
    }
    if (this.arReticle3D && this.scene && typeof this.scene.remove === 'function') {
      try {
        this.scene.remove(this.arReticle3D);
      } catch (_) {}
      this.arReticle3D = null;
    }
  }

  #enableGyroscopeTracking() {
    this.#disableGyroscopeTracking();
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }

    this.gyroBase = null;
    this.gyroHandler = (event) => {
      if (!this.isActive || !this.camera || event.beta === null || event.gamma === null) return;
      if (!this.gyroBase) {
        const cx = this.camera.position?.x ?? 26;
        const cy = this.camera.position?.y ?? 18;
        const cz = this.camera.position?.z ?? 26;
        const dist = Math.hypot(cx, cy, cz) || 36;
        const baseTheta = Math.atan2(cx, cz);
        const basePhi = Math.acos(Math.max(-1, Math.min(1, cy / dist)));
        this.gyroBase = {
          beta: event.beta,
          gamma: event.gamma,
          dist,
          baseTheta,
          basePhi,
        };
        return;
      }

      const dGamma = ((event.gamma - this.gyroBase.gamma) * Math.PI) / 180;
      const dBeta = ((event.beta - this.gyroBase.beta) * Math.PI) / 180;
      const theta = this.gyroBase.baseTheta - dGamma * 0.85;
      const phi = Math.max(0.2, Math.min(Math.PI - 0.2, this.gyroBase.basePhi - dBeta * 0.65));
      const r = this.gyroBase.dist;

      if (typeof this.camera.position?.set === 'function') {
        this.camera.position.set(
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.cos(theta)
        );
        this.camera.lookAt?.(0, 0, 0);
      }
    };

    window.addEventListener('deviceorientation', this.gyroHandler, true);
  }

  #disableGyroscopeTracking() {
    if (this.gyroHandler && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('deviceorientation', this.gyroHandler, true);
    }
    this.gyroHandler = null;
    this.gyroBase = null;
  }

  #startSpatialSimulation() {
    const doc = this.container?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return false;

    const backdrop = doc.createElement('div');
    backdrop.id = 'ar-spatial-backdrop';
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.zIndex = '1';
    backdrop.style.pointerEvents = 'none';
    backdrop.style.background =
      'radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.18) 0%, rgba(15, 23, 42, 0.85) 65%, #020617 100%), ' +
      'repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.1) 0px, rgba(148, 163, 184, 0.1) 1px, transparent 1px, transparent 36px), ' +
      'repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.1) 0px, rgba(148, 163, 184, 0.1) 1px, transparent 1px, transparent 36px)';

    if (this.container) {
      this.container.classList.add('is-ar-active');
      if (typeof this.container.prepend === 'function') {
        this.container.prepend(backdrop);
      } else if (this.container.children && this.container.children[0]) {
        this.container.insertBefore(backdrop, this.container.children[0]);
      } else {
        this.container.appendChild(backdrop);
      }
    }
    this.videoElement = backdrop;

    this.#applyCanvasARLayering(true);

    if (this.renderer) {
      if (typeof this.renderer.getClearColor === 'function') {
        try {
          const c = this.renderer.getClearColor();
          this.originalClearColor = c?.getHex ? c.getHex() : 0x1e293b;
        } catch (_) {
          this.originalClearColor = 0x1e293b;
        }
        this.originalClearAlpha = typeof this.renderer.getClearAlpha === 'function' ? this.renderer.getClearAlpha() : 1.0;
      }
      if (typeof this.renderer.setClearColor === 'function') {
        this.renderer.setClearColor(0x000000, 0);
      }
    }

    this.#createARHUD(doc, 'AR Mode: Spatial Environment (3D Projected Overlay)');

    this.mode = 'spatial-simulation';
    this.isActive = true;

    if (typeof this.onSessionStart === 'function') {
      this.onSessionStart({ mode: 'spatial-simulation' });
    }
    return true;
  }

  async #startVideoPassThrough() {
    const doc = this.container?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return false;

    // 1. Request environment camera stream
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
      // Fallback to any video device (e.g. desktop webcam)
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    this.mediaStream = stream;

    const track = stream?.getVideoTracks?.()?.[0];
    const facingMode = track?.getSettings?.()?.facingMode;
    this.isMirrored = facingMode !== 'environment';

    // 2. Create background video element behind the Three.js canvas
    const video = doc.createElement('video');
    video.id = 'ar-video-background';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    video.style.position = 'absolute';
    video.style.inset = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = this.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    video.style.zIndex = '1';
    video.style.pointerEvents = 'none';

    if (typeof video.play === 'function') {
      try {
        await video.play();
      } catch (_) {}
    }

    // Insert behind canvas in container
    if (this.container) {
      this.container.classList.add('is-ar-active');
      if (typeof this.container.prepend === 'function') {
        this.container.prepend(video);
      } else if (this.container.children && this.container.children[0]) {
        this.container.insertBefore(video, this.container.children[0]);
      } else {
        this.container.appendChild(video);
      }
    }
    this.videoElement = video;

    // 3. Make WebGL canvas background transparent and stack above video element
    this.#applyCanvasARLayering(true);

    if (this.renderer) {
      if (typeof this.renderer.getClearColor === 'function') {
        try {
          const c = this.renderer.getClearColor();
          this.originalClearColor = c?.getHex ? c.getHex() : 0x1e293b;
        } catch (_) {
          this.originalClearColor = 0x1e293b;
        }
        this.originalClearAlpha = typeof this.renderer.getClearAlpha === 'function' ? this.renderer.getClearAlpha() : 1.0;
      }
      if (typeof this.renderer.setClearColor === 'function') {
        this.renderer.setClearColor(0x000000, 0);
      }
    }

    // 4. Attach AR touch / interaction HUD
    this.#createARHUD(doc, 'AR Mode: Live Camera Pass-Through');

    this.mode = 'video-passthrough';
    this.isActive = true;

    if (typeof this.onSessionStart === 'function') {
      this.onSessionStart({ mode: 'video-passthrough' });
    }
    return true;
  }

  #createARHUD(doc, labelText = 'AR Mode: Physical Space') {
    if (!doc || !this.container) return;

    const hud = doc.createElement('div');
    hud.className = 'ar-hud-overlay';
    hud.style.position = 'absolute';
    hud.style.top = '38px';
    hud.style.left = '16px';
    hud.style.right = '56px';
    hud.style.display = 'flex';
    hud.style.justifyContent = 'space-between';
    hud.style.alignItems = 'center';
    hud.style.flexWrap = 'wrap';
    hud.style.gap = '8px';
    hud.style.zIndex = '30';
    hud.style.pointerEvents = 'auto';

    const mirrorBorder = this.isMirrored ? '#38bdf8' : '#475569';
    const mirrorColor = this.isMirrored ? '#38bdf8' : '#f8fafc';

    hud.innerHTML = `
      <div class="ar-hud-badge" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite;"></span>
        <span>${labelText}</span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn-ar-action btn-ar-scale" title="Cycle Hologram Scale (Desk 0.6x / Standard 1.0x / Room 1.4x)" style="background: rgba(30, 41, 59, 0.9); border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          ⤢ 1.0x Std
        </button>
        <button type="button" class="btn-ar-action btn-ar-mirror" aria-pressed="${this.isMirrored}" title="Mirror Camera Feed (for Laptop / Front Webcams)" style="background: rgba(30, 41, 59, 0.9); border: 1px solid ${mirrorBorder}; color: ${mirrorColor}; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          ⇄ Mirror Cam
        </button>
        <button type="button" class="btn-ar-action btn-ar-reset" style="background: rgba(30, 41, 59, 0.9); border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          Reset View
        </button>
        <button type="button" class="btn-ar-action btn-ar-exit" style="background: rgba(239, 68, 68, 0.9); border: 1px solid #f87171; color: #fff; font-weight: bold; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">
          ✕ Exit AR
        </button>
      </div>
    `;

    const scaleBtn = hud.querySelector('.btn-ar-scale');
    if (scaleBtn) {
      const scales = [1.0, 0.6, 1.4];
      scaleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curr = this.placement.scale || 1.0;
        const idx = scales.findIndex((s) => Math.abs(s - curr) < 0.1);
        const next = scales[(idx + 1) % scales.length];
        this.setPlacementScale(next);
      });
    }

    const mirrorBtn = hud.querySelector('.btn-ar-mirror');
    if (mirrorBtn) {
      mirrorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setVideoMirror(!this.isMirrored);
      });
    }

    const exitBtn = hud.querySelector('.btn-ar-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stop();
      });
    }

    const resetBtn = hud.querySelector('.btn-ar-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setPlacementScale(1.0);
        this.setPlacementOffset(0, 0);
        this.gyroBase = null;
        if (this.camera && typeof this.camera.position?.set === 'function') {
          this.camera.position.set(0, 0, 32);
          this.camera.lookAt(0, 0, 0);
        }
      });
    }

    this.container.appendChild(hud);
    this.hudElement = hud;
  }

  /**
   * Stops the active AR session and restores the standard 3D viewport.
   */
  stop() {
    if (!this.isActive) return;

    // 1. Terminate WebXR session if active
    if (this.xrSession) {
      try {
        this.xrSession.end();
      } catch (_) {}
      this.xrSession = null;
    }
    if (this.renderer?.xr) {
      this.renderer.xr.enabled = false;
    }

    // 2. Stop camera stream and remove video element
    if (this.mediaStream) {
      this.mediaStream.getTracks?.().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.remove?.();
      this.videoElement = null;
    }

    // 3. Remove HUD overlay
    if (this.hudElement) {
      this.hudElement.remove?.();
      this.hudElement = null;
    }

    if (this.container) {
      this.container.classList.remove('is-ar-active');
    }

    this.#applyCanvasARLayering(false);

    // 4. Restore renderer clear color
    if (this.renderer && typeof this.renderer.setClearColor === 'function') {
      this.renderer.setClearColor(this.originalClearColor, this.originalClearAlpha);
    }

    this.isActive = false;
    this.mode = null;

    if (typeof this.onSessionEnd === 'function') {
      this.onSessionEnd();
    }
  }

  /**
   * Toggles AR state.
   * @returns {Promise<boolean>}
   */
  async toggle() {
    if (this.isActive) {
      this.stop();
      return false;
    }
    return await this.start();
  }
}
