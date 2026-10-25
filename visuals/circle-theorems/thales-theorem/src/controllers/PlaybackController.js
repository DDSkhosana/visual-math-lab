import { setAngle2D, setPlaying } from '../model/actions.js';

/**
 * Auto-sweeps Point P around the circumference continuously.
 * Advances angle2D and synchronizes spherical coordinates at ~0.8 rad/s,
 * scaled by user-selected playbackSpeed multiplier.
 */
export class PlaybackController {
  constructor(store, button, speed = 0.8, options = {}) {
    this.store = store;
    this.button = button;
    this.baseSpeed = speed;
    this.speed = speed;
    this.animId = null;
    this.lastTime = null;

    if (this.button) {
      this.button.addEventListener('click', () => {
        const nextState = !this.store.get().playing;
        this.store.set(setPlaying(nextState));
      });
    }

    // Playback Speed Controller: Button & Slider
    this.speedBtn = typeof document !== 'undefined' ? document.getElementById('btn-playback-speed') : null;
    this.speedLabel = typeof document !== 'undefined' ? document.getElementById('playback-speed-label') : null;
    this.speedSlider = options?.speedSlider || (typeof document !== 'undefined' ? document.querySelector?.('input[data-role="playback-speed"]') : null);
    this.speedSliderLabel = options?.speedSliderLabel || (typeof document !== 'undefined' ? document.querySelector?.('[data-role="playback-speed-label"]') : null);

    const speeds = [0.5, 1.0, 1.5, 2.0];
    if (this.speedBtn && !this.speedBtn._speedBound) {
      this.speedBtn._speedBound = true;
      this.speedBtn.addEventListener('click', () => {
        const curSpeed = this.store.get().playbackSpeed ?? 1.0;
        const curIdx = speeds.findIndex((s) => Math.abs(s - curSpeed) < 0.05);
        const nextIdx = (curIdx === -1 ? 1 : curIdx + 1) % speeds.length;
        this.store.set({ playbackSpeed: speeds[nextIdx] });
      });
    }

    if (this.speedSlider && !this.speedSlider._speedBound) {
      this.speedSlider._speedBound = true;
      this.speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val) && val > 0) {
          this.store.set({ playbackSpeed: val });
        }
      });
    }

    if (typeof document !== 'undefined' && !document._thalesPlaybackKeyBound) {
      document._thalesPlaybackKeyBound = true;
      document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (e.key === 'p' || e.key === 'P') {
          if (e.shiftKey) {
            e.preventDefault();
            const curSpeed = this.store.get().playbackSpeed ?? 1.0;
            const curIdx = speeds.findIndex((s) => Math.abs(s - curSpeed) < 0.05);
            const nextIdx = (curIdx === -1 ? 1 : curIdx + 1) % speeds.length;
            this.store.set({ playbackSpeed: speeds[nextIdx] });
          }
        }
      });
    }

    this.store.subscribe((state) => {
      this.render(state);
      this.renderSpeed(state);
    }, ['playing', 'playbackSpeed']);

    this.render(this.store.get());
    this.renderSpeed(this.store.get());
  }

  render(state) {
    const isPlaying = Boolean(state.playing);

    if (this.button) {
      this.button.classList.toggle('active', isPlaying);
      this.button.setAttribute('aria-pressed', String(isPlaying));
      const playIcon = this.button.querySelector('.icon-play');
      const pauseIcon = this.button.querySelector('.icon-pause');
      const label = this.button.querySelector('span');

      if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'inline-block';
      if (pauseIcon) pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
      if (label) label.textContent = isPlaying ? 'Pause' : 'Play';
    }

    if (isPlaying && !this.animId) {
      this.lastTime = performance.now();
      this.animId = requestAnimationFrame((now) => this.#loop(now));
    } else if (!isPlaying && this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
      this.lastTime = null;
    }
  }

  renderSpeed(state) {
    const spd = state?.playbackSpeed ?? 1.0;
    const txt = `${spd}x`;
    if (this.speedLabel) this.speedLabel.textContent = txt;
    if (this.speedBtn) {
      this.speedBtn.setAttribute('title', `Playback speed: ${txt} (Click or Shift+P to cycle 0.5x, 1x, 1.5x, 2x)`);
      this.speedBtn.setAttribute('aria-label', `Playback speed ${txt}`);
    }
    if (this.speedSlider && document.activeElement !== this.speedSlider) {
      this.speedSlider.value = String(spd);
    }
    if (this.speedSliderLabel) this.speedSliderLabel.textContent = txt;
  }

  #loop(now) {
    if (!this.store.get().playing) {
      this.animId = null;
      return;
    }

    const delta = Math.min(0.1, (now - (this.lastTime ?? now)) / 1000);
    this.lastTime = now;

    const current = this.store.get();
    const speedMult = current.playbackSpeed ?? 1.0;
    let nextAngle = (current.angle2D + this.baseSpeed * speedMult * delta) % (Math.PI * 2);
    if (nextAngle < 0) nextAngle += Math.PI * 2;

    this.store.set(setAngle2D(nextAngle, current));
    this.animId = requestAnimationFrame((t) => this.#loop(t));
  }

  pause() {
    if (this.store.get().playing) {
      this.store.set(setPlaying(false));
    }
  }
}
