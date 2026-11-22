// audio.js — tiny synthesized sounds, made with the Web Audio API.
// No sound files: every blip is an oscillator, so the game stays offline
// and loads nothing over the network.

let ctx = null;
let muted = false;

/** Create (or reuse) the audio context on the first user gesture. */
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** One short tone: frequency in Hz, length in seconds, kind of wave. */
function tone(freq, seconds, type, volume) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + seconds);
}

export const sfx = {
  playCard() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.1, 'triangle', 0.08); },
  surge() { tone(660, 0.1, 'sine', 0.12); tone(880, 0.14, 'sine', 0.12); tone(1320, 0.18, 'sine', 0.08); },
  hurt() { tone(180, 0.18, 'sawtooth', 0.07); },
  heal() { tone(440, 0.15, 'sine', 0.1); tone(660, 0.2, 'sine', 0.08); },
  turn() { tone(392, 0.09, 'triangle', 0.09); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.12), i * 130)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.1), i * 160)); },
  click() { tone(600, 0.05, 'square', 0.04); },
};

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
