// Sound effects, the robot voice and the bonus-stage music.
// Everything is made with Web Audio and the browser's own speech, no files.

let ac = null, out = null, noiseBuf = null;
let sfxOn = true, voiceOn = true;
let voice = null;

export function initAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      out = ac.createGain(); out.gain.value = sfxOn ? 0.55 : 0; out.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* no audio, no problem */ }
}

export function setSound(on) { sfxOn = on; if (out) out.gain.value = on ? 0.55 : 0; }
export function setVoice(on) { voiceOn = on; if (!on) try { speechSynthesis.cancel(); } catch (e) { } }
export const soundOn = () => sfxOn;
export const voiceIsOn = () => voiceOn;

function now() { return ac ? ac.currentTime : 0; }

function tone({ f = 440, f2 = null, dur = 0.15, type = 'sine', vol = 0.3, at = null, attack = 0.005 } = {}) {
  if (!ac) return;
  const t0 = at ?? now();
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + 0.03);
}

function noise({ dur = 0.2, type = 'lowpass', f = 1200, f2 = null, q = 0.8, vol = 0.3, at = null } = {}) {
  if (!ac) return;
  const t0 = at ?? now();
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(fl).connect(g).connect(out);
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
}

export const sfx = {
  pick() { tone({ f: 520, f2: 760, dur: 0.07, type: 'triangle', vol: 0.12 }); },
  whoosh() { noise({ dur: 0.18, type: 'bandpass', f: 500, f2: 2400, q: 1.2, vol: 0.22 }); },
  gulp() { tone({ f: 300, f2: 90, dur: 0.16, vol: 0.4 }); tone({ f: 190, f2: 70, dur: 0.14, vol: 0.25, at: now() + 0.08 }); },
  swallow() { tone({ f: 150, f2: 60, dur: 0.22, vol: 0.3 }); },
  chew() { noise({ dur: 0.05, type: 'bandpass', f: 1700, q: 2, vol: 0.12 }); },
  bonk() { tone({ f: 220, f2: 140, dur: 0.1, type: 'square', vol: 0.12 }); },
  splat() { noise({ dur: 0.28, type: 'lowpass', f: 1400, f2: 180, vol: 0.55 }); tone({ f: 120, f2: 45, dur: 0.12, vol: 0.35 }); },
  deny() { tone({ f: 150, dur: 0.1, type: 'square', vol: 0.09 }); tone({ f: 110, dur: 0.12, type: 'square', vol: 0.09, at: now() + 0.11 }); },
  slide() { noise({ dur: 0.4, type: 'lowpass', f: 700, f2: 300, vol: 0.16 }); },
  rule() { [660, 880].forEach((f, i) => tone({ f, dur: 0.16, type: 'triangle', vol: 0.18, at: now() + i * 0.12 })); },
  stamp() { noise({ dur: 0.12, type: 'lowpass', f: 600, vol: 0.6 }); tone({ f: 90, f2: 50, dur: 0.12, vol: 0.4 }); },
  ding() { tone({ f: 1318, dur: 0.25, type: 'sine', vol: 0.12 }); tone({ f: 1760, dur: 0.35, type: 'sine', vol: 0.09, at: now() + 0.09 }); },
  cash() { [1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, dur: 0.14, type: 'square', vol: 0.06, at: now() + i * 0.06 })); noise({ dur: 0.3, type: 'highpass', f: 5000, vol: 0.1, at: now() + 0.25 }); },
  sad() { [392, 370, 349, 311].forEach((f, i) => tone({ f, dur: 0.3, type: 'triangle', vol: 0.12, at: now() + i * 0.22 })); },
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ f, dur: 0.18, type: 'square', vol: 0.09, at: now() + i * 0.11 })); },
  pop() { tone({ f: 600, f2: 1400, dur: 0.08, type: 'sine', vol: 0.3 }); noise({ dur: 0.08, type: 'highpass', f: 3000, vol: 0.12 }); },
};

/* ---------- robot voice ---------- */

function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    const en = vs.filter(v => /^en([-_]|$)/i.test(v.lang));
    const prefs = [/David/i, /Mark/i, /Fred/i, /Daniel/i, /Google US English/i, /Alex/i, /Male/i];
    for (const re of prefs) { const v = en.find(x => re.test(x.name)); if (v) return v; }
    return en[0] || vs[0] || null;
  } catch (e) { return null; }
}
if ('speechSynthesis' in window) {
  try { speechSynthesis.addEventListener('voiceschanged', () => { voice = pickVoice(); }); } catch (e) { }
}

export function say(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    voice = voice || pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.9; u.pitch = 0.5; u.volume = 1;
    speechSynthesis.speak(u);
  } catch (e) { }
}
export function hush() { try { speechSynthesis.cancel(); } catch (e) { } }

/* ---------- bonus music: a slinky little loop ---------- */

const BPM = 100, STEP = 60 / BPM / 4, SWING = 0.035;
const BASS = { 0: 82.41, 3: 82.41, 6: 98.0, 7: 110.0, 10: 82.41, 12: 146.83, 14: 123.47, 16: 82.41, 19: 82.41, 22: 98.0, 23: 110.0, 26: 123.47, 28: 110.0, 29: 98.0, 30: 73.42 };
const KICK = new Set([0, 10, 16, 26]);
const CLAP = new Set([8, 24]);
const LEAD = { 4: 329.63, 5: 392.0, 20: 329.63, 21: 293.66, 22: 246.94 };
let musicTimer = null, nextT = 0, step = 0;

function bass(f, t, dur) {
  const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o.frequency.value = f;
  fl.type = 'lowpass'; fl.Q.value = 9;
  fl.frequency.setValueAtTime(1500, t); fl.frequency.exponentialRampToValueAtTime(220, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function playStep(i, t) {
  if (KICK.has(i)) tone({ f: 150, f2: 45, dur: 0.16, vol: 0.7, at: t });
  if (CLAP.has(i)) { noise({ dur: 0.13, type: 'bandpass', f: 1500, q: 1, vol: 0.4, at: t }); noise({ dur: 0.08, type: 'bandpass', f: 1800, q: 1, vol: 0.2, at: t - 0.012 }); }
  if (i % 2 === 0) noise({ dur: i % 8 === 6 ? 0.14 : 0.04, type: 'highpass', f: 7000, vol: 0.14, at: t });
  if (BASS[i]) bass(BASS[i], t, (BASS[i + 1] || BASS[i + 2]) ? STEP * 1.6 : STEP * 2.6);
  if (LEAD[i]) tone({ f: LEAD[i], dur: STEP * 0.9, type: 'square', vol: 0.05, at: t });
}
export function startMusic() {
  if (!ac || musicTimer) return;
  step = 0; nextT = ac.currentTime + 0.08;
  musicTimer = setInterval(() => {
    while (nextT < ac.currentTime + 0.15) {
      playStep(step, nextT + (step % 2 ? SWING : 0));
      nextT += STEP; step = (step + 1) % 32;
    }
  }, 25);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
export const BEAT = 60 / BPM;
