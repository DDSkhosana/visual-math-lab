/**
 * Visual Mathematics Lab - Harmonic Audio Sonifier
 * Zero-dependency Web Audio API oscillator coupling for circular trigonometric motion.
 * Maps angle θ to fundamental frequency f(θ) = f_base * 2^(θ / 2π),
 * stereo panning to cos(θ), and triggers harmonic chimes on quadrant boundary crossings.
 */

export const TUNING_PRESETS = {
  standard: {
    id: 'standard',
    name: 'Standard (A = 440 Hz, C = 261.63 Hz)',
    baseFreq: 261.625565, // C4
    refA: 440.0,
    desc: 'ISO 16 standard concert pitch'
  },
  verdi: {
    id: 'verdi',
    name: 'Verdi / Natural (A = 432 Hz, C = 256.87 Hz)',
    baseFreq: 256.868735, // C4
    refA: 432.0,
    desc: 'Historical Italian opera pitch advocated by Verdi'
  },
  scientific: {
    id: 'scientific',
    name: 'Scientific Binary (C = 256 Hz, A = 430.54 Hz)',
    baseFreq: 256.0,      // C4 = 2^8
    refA: 430.538964,
    desc: 'Powers-of-2 octave tuning (2^8 = 256 Hz)'
  },
  baroque: {
    id: 'baroque',
    name: 'Baroque Chamber (A = 415 Hz, C = 246.76 Hz)',
    baseFreq: 415 / Math.pow(2, 0.75), // C4 ≈ 246.7605 Hz
    refA: 415.0,
    desc: 'Authentic 18th-century European baroque pitch'
  }
};

export function thetaToFrequency(theta, baseFreq = 261.625565) {
  const twoPi = 2 * Math.PI;
  const norm = ((theta % twoPi) + twoPi) % twoPi;
  return baseFreq * Math.pow(2, norm / twoPi);
}

export function freqToNoteName(f, refA = 440) {
  if (!f || !isFinite(f) || f <= 0) return 'C4';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(12 * Math.log2(f / refA)) + 69;
  const name = notes[((midi % 12) + 12) % 12];
  const oct = Math.floor(midi / 12) - 1;
  return `${name}${oct}`;
}

export class HarmonicSonifier {
  constructor(options = {}) {
    this.tuning = options.tuning || 'standard';
    const preset = TUNING_PRESETS[this.tuning] || TUNING_PRESETS.standard;
    this.baseFreq = options.baseFreq || preset.baseFreq;
    this.refA = options.refA || preset.refA;
    this.enabled = false;
    this.volume = options.volume !== undefined ? options.volume : 0.45;
    this.enableChimes = options.enableChimes !== false;
    this.enableHarmonics = options.enableHarmonics !== false;

    this.audioCtx = null;
    this.masterGain = null;
    this.pannerNode = null;
    this.fundamentalOsc = null;
    this.harmonicOsc = null;
    this.harmonicGain = null;

    this.lastTheta = null;
    this.lastQuadrant = null;
    this.currentFreq = this.baseFreq;
    this.currentNote = 'C4';
  }

  #initAudio() {
    if (this.audioCtx) return true;
    if (typeof window === 'undefined') return false;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[HarmonicSonifier] Web Audio API is not supported in this environment.');
      return false;
    }

    try {
      this.audioCtx = new AudioContextClass();

      // Master gain node
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // Stereo panner if available
      if (typeof this.audioCtx.createStereoPanner === 'function') {
        this.pannerNode = this.audioCtx.createStereoPanner();
        this.pannerNode.pan.setValueAtTime(0, this.audioCtx.currentTime);
        this.masterGain.connect(this.pannerNode);
        this.pannerNode.connect(this.audioCtx.destination);
      } else {
        this.masterGain.connect(this.audioCtx.destination);
      }

      // Fundamental Sine Oscillator (f0)
      this.fundamentalOsc = this.audioCtx.createOscillator();
      this.fundamentalOsc.type = 'sine';
      this.fundamentalOsc.frequency.setValueAtTime(this.baseFreq, this.audioCtx.currentTime);
      this.fundamentalOsc.connect(this.masterGain);
      this.fundamentalOsc.start();

      // Secondary Overtone Oscillator (2 * f0)
      this.harmonicOsc = this.audioCtx.createOscillator();
      this.harmonicOsc.type = 'sine';
      this.harmonicOsc.frequency.setValueAtTime(this.baseFreq * 2, this.audioCtx.currentTime);

      this.harmonicGain = this.audioCtx.createGain();
      this.harmonicGain.gain.setValueAtTime(this.enableHarmonics ? 0.12 : 0, this.audioCtx.currentTime);
      this.harmonicOsc.connect(this.harmonicGain);
      this.harmonicGain.connect(this.masterGain);
      this.harmonicOsc.start();

      return true;
    } catch (err) {
      console.warn('[HarmonicSonifier] Failed to initialize AudioContext:', err);
      return false;
    }
  }

  async setEnabled(enabled) {
    this.enabled = Boolean(enabled);

    if (this.enabled) {
      if (!this.audioCtx) {
        this.#initAudio();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch {}
      }
      this.#rampVolume(this.volume);
    } else {
      this.#rampVolume(0);
    }

    this.#syncUI();
    return this.enabled;
  }

  async toggle() {
    return this.setEnabled(!this.enabled);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, parseFloat(vol) || 0));
    if (this.enabled) {
      this.#rampVolume(this.volume);
    }
    const label = typeof document !== 'undefined' ? document.getElementById('label-audio-volume') : null;
    if (label) label.textContent = `${Math.round(this.volume * 100)}%`;
  }

  setChimesEnabled(enabled) {
    this.enableChimes = Boolean(enabled);
  }

  setHarmonicsEnabled(enabled) {
    this.enableHarmonics = Boolean(enabled);
    if (this.harmonicGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.harmonicGain.gain.setTargetAtTime(this.enableHarmonics ? 0.12 : 0, now, 0.02);
    }
  }

  setTuning(presetKey) {
    const preset = TUNING_PRESETS[presetKey] || TUNING_PRESETS.standard;
    this.tuning = preset.id;
    this.baseFreq = preset.baseFreq;
    this.refA = preset.refA;

    if (this.lastTheta !== null) {
      this.update({ angleTheta: this.lastTheta });
    } else {
      this.currentFreq = this.baseFreq;
      this.currentNote = freqToNoteName(this.baseFreq, this.refA);
      const freqValEl = typeof document !== 'undefined' ? document.getElementById('val-audio-freq') : null;
      if (freqValEl) {
        freqValEl.textContent = `${this.baseFreq.toFixed(1)} Hz (${this.currentNote})`;
      }
    }

    if (typeof document !== 'undefined') {
      const tuningSelect = document.getElementById('select-audio-tuning');
      if (tuningSelect && tuningSelect.value !== this.tuning) {
        tuningSelect.value = this.tuning;
      }
    }
  }

  #rampVolume(targetVolume) {
    if (!this.masterGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    // 25ms exponential target prevents audible speaker pops
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetVolume, now, 0.025);
  }

  update(state) {
    if (typeof state?.angleTheta !== 'number') return;

    const theta = state.angleTheta;
    const freq = thetaToFrequency(theta, this.baseFreq);
    this.currentFreq = freq;
    this.currentNote = freqToNoteName(freq, this.refA);

    // Audio node updates
    if (this.audioCtx && this.audioCtx.state === 'running' && this.fundamentalOsc) {
      const now = this.audioCtx.currentTime;
      this.fundamentalOsc.frequency.setTargetAtTime(freq, now, 0.015);

      if (this.harmonicOsc) {
        this.harmonicOsc.frequency.setTargetAtTime(freq * 2, now, 0.015);
      }

      if (this.pannerNode) {
        const pan = Math.max(-1, Math.min(1, Math.cos(theta)));
        this.pannerNode.pan.setTargetAtTime(pan, now, 0.02);
      }
    }

    // Quadrant boundary crossing detection for chimes
    if (this.enabled && this.enableChimes && this.lastTheta !== null) {
      const twoPi = 2 * Math.PI;
      const normCurr = ((theta % twoPi) + twoPi) % twoPi;
      const currQuad = Math.floor((normCurr / (Math.PI / 2)) + 0.03) % 4;

      if (this.lastQuadrant !== null && currQuad !== this.lastQuadrant) {
        this.#playChime(currQuad);
      }
      this.lastQuadrant = currQuad;
    } else {
      const twoPi = 2 * Math.PI;
      const normCurr = ((theta % twoPi) + twoPi) % twoPi;
      this.lastQuadrant = Math.floor((normCurr / (Math.PI / 2)) + 0.03) % 4;
    }
    this.lastTheta = theta;

    // Telemetry display update
    const freqValEl = typeof document !== 'undefined' ? document.getElementById('val-audio-freq') : null;
    if (freqValEl) {
      freqValEl.textContent = `${freq.toFixed(1)} Hz (${this.currentNote})`;
    }
  }

  #playChime(quadrant) {
    if (!this.audioCtx || !this.masterGain) return;

    try {
      const chimeOsc = this.audioCtx.createOscillator();
      const chimeGain = this.audioCtx.createGain();

      // Dynamic chord ratios for cardinal axes based on baseFreq:
      // 0 (0°): C6 (baseFreq * 4)
      // 1 (90°): E6 (baseFreq * 4 * 2^(4/12))
      // 2 (180°): G6 (baseFreq * 4 * 2^(7/12))
      // 3 (270°): C7 (baseFreq * 8)
      const chimeRatios = [4, 4 * Math.pow(2, 4 / 12), 4 * Math.pow(2, 7 / 12), 8];
      const pitch = this.baseFreq * (chimeRatios[quadrant] || 4);

      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(pitch, this.audioCtx.currentTime);

      const now = this.audioCtx.currentTime;
      chimeGain.gain.setValueAtTime(0.18 * this.volume, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chimeOsc.start(now);
      chimeOsc.stop(now + 0.13);
    } catch {}
  }

  #syncUI() {
    if (typeof document === 'undefined') return;
    const soundBtn = document.getElementById('btn-toggle-sound');
    const pill = document.getElementById('sound-status-pill');
    const iconOn = soundBtn?.querySelector('.icon-sound-on');
    const iconOff = soundBtn?.querySelector('.icon-sound-off');
    const checkbox = document.getElementById('check-audio-enable');

    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
      soundBtn.classList.toggle('active', this.enabled);
    }
    if (pill) {
      pill.textContent = this.enabled ? 'ON' : 'OFF';
      pill.classList.toggle('is-on', this.enabled);
      pill.classList.toggle('is-off', !this.enabled);
    }
    if (iconOn) iconOn.style.display = this.enabled ? 'inline-block' : 'none';
    if (iconOff) iconOff.style.display = this.enabled ? 'none' : 'inline-block';
    if (checkbox && checkbox.checked !== this.enabled) {
      checkbox.checked = this.enabled;
    }
    const tuningSelect = document.getElementById('select-audio-tuning');
    if (tuningSelect && tuningSelect.value !== this.tuning) {
      tuningSelect.value = this.tuning;
    }
  }

  attachControls(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root || !root.getElementById) return;

    const soundBtn = root.getElementById('btn-toggle-sound');
    if (soundBtn && !soundBtn._hasSoundBound) {
      soundBtn._hasSoundBound = true;
      soundBtn.addEventListener('click', () => {
        this.toggle();
      });
    }

    const checkbox = root.getElementById('check-audio-enable');
    if (checkbox && !checkbox._hasSoundBound) {
      checkbox._hasSoundBound = true;
      checkbox.addEventListener('change', (e) => {
        this.setEnabled(e.target.checked);
      });
    }

    const tuningSelect = root.getElementById('select-audio-tuning');
    if (tuningSelect && !tuningSelect._hasSoundBound) {
      tuningSelect._hasSoundBound = true;
      tuningSelect.value = this.tuning;
      tuningSelect.addEventListener('change', (e) => {
        this.setTuning(e.target.value);
      });
    }

    const chimesBox = root.getElementById('check-audio-chimes');
    if (chimesBox && !chimesBox._hasSoundBound) {
      chimesBox._hasSoundBound = true;
      chimesBox.addEventListener('change', (e) => {
        this.setChimesEnabled(e.target.checked);
      });
    }

    const harmonicsBox = root.getElementById('check-audio-harmonics');
    if (harmonicsBox && !harmonicsBox._hasSoundBound) {
      harmonicsBox._hasSoundBound = true;
      harmonicsBox.addEventListener('change', (e) => {
        this.setHarmonicsEnabled(e.target.checked);
      });
    }

    const volSlider = root.getElementById('slider-audio-volume');
    if (volSlider && !volSlider._hasSoundBound) {
      volSlider._hasSoundBound = true;
      volSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value) / 100);
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    this.#syncUI();
  }
}
