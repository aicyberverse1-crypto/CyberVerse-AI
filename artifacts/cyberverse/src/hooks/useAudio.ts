let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.1,
  freqEnd?: number,
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

export const audioEffects = {
  success() {
    playTone(440, 0.1, "sine", 0.12);
    setTimeout(() => playTone(660, 0.15, "sine", 0.1), 80);
    setTimeout(() => playTone(880, 0.2, "sine", 0.08), 180);
  },
  error() {
    playTone(200, 0.15, "sawtooth", 0.1, 100);
    setTimeout(() => playTone(150, 0.2, "sawtooth", 0.08, 80), 120);
  },
  typing() {
    playTone(800 + Math.random() * 400, 0.03, "square", 0.04);
  },
  alert() {
    playTone(880, 0.08, "square", 0.08);
    setTimeout(() => playTone(880, 0.08, "square", 0.08), 150);
  },
  levelUp() {
    [261, 329, 392, 523].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, "sine", 0.15), i * 100);
    });
  },
  hint() {
    playTone(600, 0.1, "sine", 0.06);
    setTimeout(() => playTone(750, 0.15, "sine", 0.05), 80);
  },
  timer() {
    playTone(440, 0.05, "square", 0.05);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, "sine", 0.12), i * 120);
    });
  },
};
