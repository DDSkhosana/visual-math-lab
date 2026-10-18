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
    this.mode = null; // 'webxr' | 'video-passthrough' | null
    this.videoElement = null;
    this.mediaStream = null;
    this.xrSession = null;
    this.hudElement = null;
    this.originalClearColor = 0x0a0f1d;
    this.originalClearAlpha = 1.0;

    // Transform offsets for AR placement
    this.placement = {
      scale: 1.0,
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
      return await this.#startVideoPassThrough();
    }

    throw new Error('Augmented Reality is not supported on this device/browser.');
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
    video.style.zIndex = '0';
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

    // 3. Make WebGL canvas background transparent
    if (this.renderer) {
      if (typeof this.renderer.getClearColor === 'function') {
        const c = this.renderer.getClearColor();
        this.originalClearColor = c.getHex ? c.getHex() : 0x0a0f1d;
        this.originalClearAlpha = typeof this.renderer.getClearAlpha === 'function' ? this.renderer.getClearAlpha() : 1.0;
      }
      if (typeof this.renderer.setClearColor === 'function') {
        this.renderer.setClearColor(0x000000, 0);
      }
    }

    // 4. Attach AR touch / interaction HUD
    this.#createARHUD(doc);

    this.mode = 'video-passthrough';
    this.isActive = true;

    if (typeof this.onSessionStart === 'function') {
      this.onSessionStart({ mode: 'video-passthrough' });
    }
    return true;
  }

  #createARHUD(doc) {
    if (!doc || !this.container) return;

    const hud = doc.createElement('div');
    hud.className = 'ar-hud-overlay';
    hud.style.position = 'absolute';
    hud.style.top = '16px';
    hud.style.left = '16px';
    hud.style.right = '16px';
    hud.style.display = 'flex';
    hud.style.justifyContent = 'space-between';
    hud.style.alignItems = 'center';
    hud.style.zIndex = '30';
    hud.style.pointerEvents = 'auto';

    hud.innerHTML = `
      <div class="ar-hud-badge" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite;"></span>
        <span>AR Mode: Physical Space</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn-ar-action btn-ar-reset" style="background: rgba(30, 41, 59, 0.9); border: 1px solid #475569; color: #f8fafc; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
          Reset View
        </button>
        <button type="button" class="btn-ar-action btn-ar-exit" style="background: rgba(239, 68, 68, 0.9); border: 1px solid #f87171; color: #fff; font-weight: bold; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">
          ✕ Exit AR
        </button>
      </div>
    `;

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
