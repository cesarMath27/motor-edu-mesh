// =============================================================================
//  AUDIO DEL MOTOR  — efectos SINTETIZADOS (Web Audio, sin archivos)
// -----------------------------------------------------------------------------
//  Mismo enfoque que edu-mesh: se generan al vuelo con osciladores → 0 KB de
//  assets, 100% offline. En Node (sin AudioContext) es un no-op silencioso.
//  Los navegadores exigen un gesto del usuario: por eso unlock() se llama en el
//  primer toque.
// =============================================================================

const hasWindow = typeof window !== 'undefined';

function tone(c, freq, t0, dur, { type = 'sine', gain = 0.2, glideTo = null } = {}) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

/**
 * Crea el motor de sonido.
 * @param {object} [o]
 * @param {boolean} [o.enabled=true]
 * @param {string}  [o.storageKey='edumesh-game-mute']
 */
export function createAudio({ enabled = true, storageKey = 'edumesh-game-mute' } = {}) {
  let ctx = null;
  let muted = !enabled;
  // Recuerda la preferencia de silencio entre partidas.
  try {
    if (hasWindow && localStorage.getItem(storageKey) === '1') muted = true;
  } catch { /* sin localStorage */ }

  const ac = () => {
    if (!hasWindow) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { ctx = null; }
    }
    return ctx;
  };

  function play(name) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t = c.currentTime;
    switch (name) {
      case 'click':   tone(c, 660, t, 0.07, { type: 'triangle', gain: 0.14 }); break;
      case 'flip':    tone(c, 520, t, 0.08, { type: 'sine', gain: 0.12, glideTo: 760 }); break;
      case 'tick':    tone(c, 1150, t, 0.05, { type: 'square', gain: 0.06 }); break;
      case 'match':   [660, 880].forEach((f, i) => tone(c, f, t + i * 0.08, 0.14, { type: 'triangle', gain: 0.18 })); break;
      case 'correct': [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.08, 0.15, { type: 'triangle', gain: 0.2 })); break;
      case 'wrong':   tone(c, 200, t, 0.35, { type: 'sawtooth', gain: 0.2, glideTo: 110 }); break;
      case 'start':   [523, 784].forEach((f, i) => tone(c, f, t + i * 0.1, 0.13, { type: 'triangle', gain: 0.18 })); break;
      case 'win':     [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, t + i * 0.11, 0.24, { type: 'triangle', gain: 0.22 })); break;
      case 'lose':    [392, 330, 262].forEach((f, i) => tone(c, f, t + i * 0.14, 0.26, { type: 'sawtooth', gain: 0.18 })); break;
      default: break;
    }
  }

  return {
    play,
    unlock() {
      const c = ac();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    get muted() { return muted; },
    setMuted(v) {
      muted = !!v;
      try { if (hasWindow) localStorage.setItem(storageKey, v ? '1' : '0'); } catch { /* */ }
    },
    toggle() { this.setMuted(!muted); return muted; },
  };
}
