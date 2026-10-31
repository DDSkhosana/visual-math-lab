/**
 * @file animation-recorder.js
 * Client-Side Animated Loop Recorder for 2D & 3D Mathematical Visualizers.
 *
 * Captures clean, high-framerate (30/60fps) looping video clips (WebM / GIF fallback)
 * of dynamic geometric parameter sweeps and orbital rotations.
 * Zero external dependencies: uses HTMLCanvasElement.captureStream() and MediaRecorder.
 */

export class AnimationLoopRecorder {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.durationMs = options.durationMs || 3600;
    this.fps = options.fps || 30;
    this.filename = options.filename || 'geometry-loop.webm';
    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;
    this.onError = options.onError || null;

    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.timer = null;
    this.progressInterval = null;
    this.startTime = 0;
  }

  static isSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  static getSupportedMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  start() {
    if (this.isRecording) return;
    if (!this.canvas) {
      const err = new Error('No canvas element provided for recording.');
      this.onError?.(err);
      throw err;
    }

    if (!AnimationLoopRecorder.isSupported()) {
      const err = new Error('MediaRecorder or canvas.captureStream is not supported in this browser.');
      this.onError?.(err);
      throw err;
    }

    try {
      const stream = this.canvas.captureStream(this.fps);
      const mimeType = AnimationLoopRecorder.getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.chunks = [];
      this.isRecording = true;
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        clearInterval(this.progressInterval);
        this.isRecording = false;

        const blob = new Blob(this.chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);

        if (typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.download = this.filename;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        this.onProgress?.(1.0);
        this.onComplete?.(blob, url);
      };

      this.mediaRecorder.start(200);

      this.progressInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const ratio = Math.min(1.0, elapsed / this.durationMs);
        this.onProgress?.(ratio);
      }, 100);

      this.timer = setTimeout(() => {
        if (this.isRecording) {
          this.stop();
        }
      }, this.durationMs);

    } catch (err) {
      this.isRecording = false;
      clearInterval(this.progressInterval);
      this.onError?.(err);
      throw err;
    }
  }

  stop() {
    if (!this.isRecording) return;
    clearTimeout(this.timer);
    try {
      this.mediaRecorder?.stop();
    } catch (e) {
      console.warn('Error stopping MediaRecorder:', e);
    }
  }
}

/**
 * Convenience helper to record a canvas loop with visual toast notifications.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @returns {Promise<Blob>}
 */
export function recordCanvasLoop(canvas, options = {}) {
  return new Promise((resolve, reject) => {
    if (!AnimationLoopRecorder.isSupported()) {
      alert('Video recording is not supported in this browser. Please try Chrome, Edge, or Firefox.');
      reject(new Error('MediaRecorder unsupported'));
      return;
    }

    // Create toast notification
    let toast = document.getElementById('vml-recording-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'vml-recording-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #38bdf8;
        padding: 12px 18px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      `;
      document.body.appendChild(toast);
    }

    const durationMs = options.durationMs || 3600;
    const filename = options.filename || 'mathematics-loop.webm';

    toast.style.display = 'flex';
    toast.innerHTML = `
      <span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;animation:vml-pulse 1s infinite;"></span>
      <span>Recording animated loop (0%)...</span>
    `;

    const recorder = new AnimationLoopRecorder(canvas, {
      durationMs,
      filename,
      onProgress: (ratio) => {
        const pct = Math.round(ratio * 100);
        if (toast) {
          toast.innerHTML = `
            <span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;"></span>
            <span>Recording animated loop (${pct}%)...</span>
            <div style="width:60px;height:4px;background:#334155;border-radius:2px;overflow:hidden;margin-left:6px;">
              <div style="width:${pct}%;height:100%;background:#38bdf8;"></div>
            </div>
          `;
        }
      },
      onComplete: (blob) => {
        if (toast) {
          toast.innerHTML = `<span style="color:#10b981;">✓</span> <span>Animation loop saved as ${filename}!</span>`;
          setTimeout(() => {
            if (toast) toast.style.display = 'none';
          }, 3500);
        }
        resolve(blob);
      },
      onError: (err) => {
        if (toast) toast.style.display = 'none';
        reject(err);
      },
    });

    recorder.start();
  });
}

