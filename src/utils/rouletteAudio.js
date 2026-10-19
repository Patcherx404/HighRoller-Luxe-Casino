// European Roulette Realistic Web Audio Sound Engine
// Uses Web Audio API synthesizers for 0-latency, 100% reliable casino sound effects without external asset loading

class RouletteAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.spinInterval = null;

    try {
      const saved = localStorage.getItem('casino_roulette_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  // Lazy initialize AudioContext on user interaction to comply with browser autoplay policies
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('casino_roulette_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    if (this.isMuted) {
      this.stopWheelSpin();
    }
    return this.isMuted;
  }

  // 1. Ceramic Casino Chip Click / Bet Placement
  playChipClink() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // High crisp resonant click
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200 + Math.random() * 200, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.05);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(3200 + Math.random() * 300, now);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.04);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.07);
    osc2.stop(now + 0.07);
  }

  // 2. Chip Stack Sweep (Clearing or Doubling Bets)
  playChipSweep() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playChipClink();
      }, i * 35);
    }
  }

  // 3. Wheel Spin & Ball Rolling with Frets Rattle
  playWheelSpin() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.stopWheelSpin();

    // Wheel whirling mechanical rumble
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 7.5);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    this.currentSpinSource = whiteNoise;
    this.currentSpinGain = gainNode;

    // Ball hopping / bouncing over frets (decelerating cadence)
    let delay = 90;
    let elapsed = 0;

    const playBallBounce = () => {
      if (!this.currentSpinSource || this.isMuted) return;

      const now = ctx.currentTime;
      const bounceOsc = ctx.createOscillator();
      const bounceGain = ctx.createGain();

      bounceOsc.type = 'triangle';
      bounceOsc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
      bounceOsc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      const vol = Math.max(0.04, 0.22 - elapsed / 9000);
      bounceGain.gain.setValueAtTime(vol, now);
      bounceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      bounceOsc.connect(bounceGain);
      bounceGain.connect(ctx.destination);

      bounceOsc.start(now);
      bounceOsc.stop(now + 0.035);

      elapsed += delay;
      // Decelerate intervals gradually as wheel slows down
      delay = Math.min(450, delay * 1.055);

      if (elapsed < 7500 && this.currentSpinSource) {
        this.spinTimeout = setTimeout(playBallBounce, delay);
      }
    };

    this.spinTimeout = setTimeout(playBallBounce, delay);
  }

  stopWheelSpin() {
    if (this.spinTimeout) {
      clearTimeout(this.spinTimeout);
      this.spinTimeout = null;
    }
    if (this.currentSpinSource) {
      try {
        if (this.currentSpinGain && this.ctx) {
          this.currentSpinGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        }
        setTimeout(() => {
          if (this.currentSpinSource) {
            this.currentSpinSource.stop();
            this.currentSpinSource.disconnect();
            this.currentSpinSource = null;
          }
        }, 120);
      } catch {
        this.currentSpinSource = null;
      }
    }
  }

  // 4. Ball Drop into Pocket (Fret landing)
  playBallDrop() {
    if (this.isMuted) return;
    this.stopWheelSpin();

    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Resonant wooden/metal pocket drop "thwack-click"
    [
      { freq: 480, time: 0, dur: 0.08, vol: 0.35 },
      { freq: 820, time: 0.04, dur: 0.06, vol: 0.28 },
      { freq: 360, time: 0.09, dur: 0.12, vol: 0.4 },
    ].forEach(({ freq, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);
      osc.frequency.exponentialRampToValueAtTime(120, now + time + dur);

      gain.gain.setValueAtTime(vol, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.01);
    });
  }

  // 5. Winning Fanfare
  playWinFanfare(isBigWin = false) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Chime frequencies
    const notes = isBigWin
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] // C5, E5, G5, C6, E6, G6
      : [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    const noteDuration = isBigWin ? 0.11 : 0.14;

    notes.forEach((freq, idx) => {
      const start = now + idx * noteDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (isBigWin ? 0.6 : 0.45));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.65);
    });
  }

  // 6. Loss / No Win Soft Felt Sweep
  playLossTone() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }
}

export const rouletteAudio = new RouletteAudioEngine();
export default rouletteAudio;
