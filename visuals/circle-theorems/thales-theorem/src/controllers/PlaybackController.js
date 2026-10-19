import { setAngle2D, setPlaying } from '../model/actions.js';

/**
 * Auto-sweeps Point P around the circumference continuously.
 * Advances angle2D and synchronizes spherical coordinates at ~0.8 rad/s.
 */
export class PlaybackController {
  constructor(store, button, speed = 0.8) {
    this.store = store;
    this.button = button;
    this.speed = speed;
    this.animId = null;
    this.lastTime = null;

    if (this.button) {
      this.button.addEventListener('click', () => {
        const nextState = !this.store.get().playing;
        this.store.set(setPlaying(nextState));
      });
    }

    this.store.subscribe((state) => this.render(state), ['playing']);
    this.render(this.store.get());
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

  #loop(now) {
    if (!this.store.get().playing) {
      this.animId = null;
      return;
    }

    const delta = Math.min(0.1, (now - (this.lastTime ?? now)) / 1000);
    this.lastTime = now;

    const current = this.store.get();
    let nextAngle = (current.angle2D + this.speed * delta) % (Math.PI * 2);
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
