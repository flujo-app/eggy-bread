// Eggy Bread: feed a hungry slice of bread while the rules fall apart
// and your coworkers try to talk to you about something important.

import * as A from './art.js';
import * as S from './audio.js';
import { createChat } from './chat.js';

const { W, H, FLOOR } = A;
const GOAL = 50;
const LOAF_MIN = 100, LOAF_MAX = 300, WALK = 32;
const BOX_X = 682;
const GRAV = 1500;
const PRICES = [0.99, 1.49, 2.49, 3.99, 6.99, 9.99];

const $ = (id) => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const overlay = $('overlay'), sheet = $('sheet'), statusEl = $('status'), live = $('live');
const gameWin = $('gameWin'), tbTitle = $('tbTitle'), adsBtn = $('adsBtn');

const rand = (a, b) => a + Math.random() * (b - a);
const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const money = (v) => '$' + v.toFixed(2);
const newCarton = () => Array.from({ length: 12 }, () => (Math.random() < 0.5 ? 'brown' : 'white'));

const chat = createChat({
  log: $('chatLog'), typing: $('chatTyping'), replies: $('chatReplies'), title: $('chatTitle'),
  onMessage: () => S.sfx.ding(),
});

const ADS = [
  { title: 'EGG INSURANCE', line: 'Because life is fragile.' },
  { title: 'LINKEDEGG', line: 'Connect with eggs in your area.' },
  { title: 'CRUSTMASTER 3000', line: 'The last bread knife you will ever need. (It is a spoon.)' },
  { title: 'SLEEP', line: 'Have you tried it? Sponsored by Greg.' },
];

/* ---------------- state ---------------- */

let G;
function fresh() {
  return {
    mode: 'title', t: 0, elapsed: 0, paused: false,
    count: 0, fed: 0, dropped: 0, spent: 0,
    phase: 'honest', phaseN: 0,
    rules: [{ text: `Feed the loaf ${GOAL} eggs.` }],
    box: { kind: 'carton', slots: newCarton(), n: 0, locked: false, slide: 0, anim: null },
    held: null, eggs: [], fx: [], texts: [], stamps: [], pieces: [],
    queue: [],
    loaf: {
      x: 190, dir: 1, base: FLOOR, open: 0, brow: 0, bounce: 0, armUp: 0, mood: 0, sad: 0,
      tilt: 0, walkT: 0, walking: true, chew: 0, chewing: false, yolk: 0, crust: 4, dance: 0, wide: 0,
    },
    breakT: 0, caption: '', captionT: 0, flash: 0,
    paywalled: false, boughtOnce: false, adEgg: false, shop: null, priceIx: 0, adIx: 0,
    bonusT: 0, peeled: 0, endShown: false, endTime: 0, noteT: 0,
    timers: [], chewSnd: 0, hintDone: false,
    pointer: { x: 400, y: 260 },
  };
}
G = fresh();

function later(sec, fn) { G.timers.push({ t: sec, fn }); }
function status(text) { statusEl.textContent = text; }
function float(text, x, y, size = 28, color = A.INK, dur = 1.2) { G.texts.push({ text, x, y, size, color, t: 0, dur }); }

/* ---------------- counting ---------------- */

function countText(n) {
  const whole = Math.floor(n), half = n - whole >= 0.5;
  return String(whole).padStart(2, '0') + (half ? '½' : '');
}
function eggWords(n) {
  const whole = Math.floor(n), half = n - whole >= 0.5;
  if (half) return whole === 0 ? 'Half an egg.' : `${whole} and a half eggs.`;
  return n === 1 ? 'One egg.' : `${n} eggs.`;
}
function setPhase(p) { G.phase = p; G.phaseN = 0; }

function addRule(text) {
  const last = G.rules[G.rules.length - 1];
  if (G.rules.length > 1) last.struck = true;
  G.rules.forEach((r) => (r.fresh = false));
  G.rules.push({ text, fresh: true });
  S.sfx.rule();
  status(`New rule: ${text}`);
}

// Decides what the game says after each egg. This is where it all goes wrong.
function judge(color) {
  const before = G.count;
  let line = null, stamp = null;
  G.phaseN++;
  const n = G.phaseN;
  switch (G.phase) {
    case 'honest':
      G.count += 1;
      if (n >= 5) setPhase('glitch');
      break;
    case 'glitch': {
      const seq = [5, 5, 6, 2];
      G.count = seq[n - 1];
      if (G.count < before) stamp = 'COUNT CORRECTED';
      if (n >= seq.length) { setPhase('brown'); addRule('Only brown eggs count.'); }
      break;
    }
    case 'brown':
      if (color === 'brown') G.count += 1;
      else line = 'That egg was white. White eggs do not count.';
      if (n >= 4) { setPhase('white'); addRule('Only white eggs count. Brown eggs are minus one.'); }
      break;
    case 'white':
      if (color === 'white') G.count += 1;
      else { G.count -= 1; stamp = 'MINUS ONE'; line = `Brown egg. Minus one. ${eggWords(Math.max(0, G.count))}`; }
      if (n >= 4) { setPhase('break'); later(1.8, startBreak); }
      break;
    case 'after':
      if (n === 2) line = 'That one did not count.';
      else G.count += 1;
      if (n >= 3) { setPhase('paywall'); later(1.6, startPaywall); }
      break;
    case 'half':
      G.count += 0.5;
      if (n >= 4) setPhase('jackpot');
      break;
    case 'jackpot':
      G.count = 47; line = 'You now have 47 eggs.'; stamp = 'JACKPOT?';
      setPhase('final');
      later(2.2, () => addRule(`Ignore rule ${G.rules.length}.`));
      break;
    case 'final': {
      const seq = [46, 48, 49, GOAL];
      G.count = seq[Math.min(n, seq.length) - 1];
      if (G.count < before) stamp = 'COUNT CORRECTED';
      break;
    }
    default:
      G.count += 1;
  }
  G.count = Math.max(0, G.count);
  if (!line) line = G.count >= GOAL ? `${eggWords(G.count)} You win.` : eggWords(G.count);
  return { line, stamp };
}

function announce({ line, stamp }) {
  G.caption = line.toUpperCase(); G.captionT = 4;
  live.textContent = line;
  S.say(line);
  G.flash = 1;
  if (stamp) { G.stamps.push({ text: stamp, x: 116, y: 112, t: 0 }); S.sfx.stamp(); }
  if (G.count >= GOAL && G.mode === 'play') win();
}

function swallowAll() {
  const eggs = G.queue.splice(0);
  let res = null;
  for (const c of eggs) res = judge(c);
  S.sfx.swallow();
  if (res && G.mode === 'play') announce(res);
}

/* ---------------- story beats ---------------- */

function startBreak() {
  addRule('The loaf is on break.');
  G.breakT = 7;
  G.caption = 'THE LOAF IS ON BREAK.'; G.captionT = 3.5;
  S.say('The loaf is on break.');
}
function endBreak() {
  G.breakT = 0;
  addRule('Break is over. All eggs count again. Probably.');
  setPhase('after');
  S.say('Break is over.');
  G.caption = 'BREAK IS OVER.'; G.captionT = 2.5;
}
function startPaywall() {
  G.paywalled = true;
  addRule('Free eggs have expired.');
  G.box.locked = true;
  S.sfx.deny();
  S.say('Your free eggs have expired.');
  G.caption = 'YOUR FREE EGGS HAVE EXPIRED.'; G.captionT = 4;
  later(2.4, openShop);
}

function openShop() {
  if (G.mode !== 'play') return;
  G.shop = 'offer';
  const price = PRICES[Math.min(G.priceIx, PRICES.length - 1)];
  const old = G.priceIx > 0 ? `<s>${money(PRICES[G.priceIx - 1])}</s> ` : '';
  showDialog({
    cls: 'store', title: 'EggStore',
    html: `<div class="offer"><div class="offer-eggs" aria-hidden="true">🥚<span>×80</span></div>
      <div><p class="offer-head">Value pack: <b>80 eggs</b></p>
      <p class="price">${old}${money(price)}${G.priceIx > 0 ? ' <span class="tag">price updated</span>' : ''}</p>
      <p class="small">The loaf is hungry. Look at it.</p></div></div>`,
    buttons: [
      { label: `Buy 80 eggs – ${money(price)}`, onClick: buy },
      { label: 'No thanks', onClick: noThanks },
    ],
  });
}
function noThanks() {
  S.sfx.sad();
  const price = PRICES[Math.min(G.priceIx, PRICES.length - 1)];
  showDialog({
    cls: 'store', title: 'EggStore',
    html: `<p class="offer-head">Are you sure?</p><p>The loaf will be sad. It may never become Eggy Bread.</p>`,
    buttons: [
      { label: `Buy 80 eggs – ${money(price)}`, onClick: buy },
      { label: G.adIx ? 'Watch another ad for 1 egg' : 'Watch an ad for 1 egg', onClick: watchAd },
    ],
  });
}
function buy() {
  const price = PRICES[Math.min(G.priceIx, PRICES.length - 1)];
  showDialog({ cls: 'store', title: 'EggStore', html: `<p class="processing"><span class="spinner" aria-hidden="true"></span>Processing payment…</p>`, buttons: [] });
  later(1.6, () => {
    G.spent += price; S.sfx.cash();
    showDialog({
      cls: 'store', title: 'EggStore',
      html: `<p class="offer-head">Payment approved ✔</p><p>${money(price)} has been charged to your imagination.</p><p class="small">80 eggs are on the way.</p>`,
      buttons: [{ label: 'OK', onClick: delivered }],
    });
  });
}
function delivered() {
  hideDialog(); G.shop = null;
  swapBox(() => { const b = G.box; b.kind = 'crate'; b.n = 80; b.locked = false; });
  if (!G.boughtOnce) {
    G.boughtOnce = true;
    later(1.0, () => {
      addRule('Bought eggs count as half an egg.');
      setPhase('half');
      S.say('Bought eggs count as half an egg.');
      G.caption = 'BOUGHT EGGS COUNT AS HALF AN EGG.'; G.captionT = 4;
      adsBtn.hidden = false;
    });
  }
}
function watchAd() {
  const ad = ADS[G.adIx++ % ADS.length];
  G.shop = 'ad';
  let left = 5;
  showDialog({
    cls: 'ad', title: 'Advertisement',
    html: `<div class="ad-body"><p class="ad-title">${ad.title}</p><p class="ad-line">${ad.line}</p>
      <p class="ad-count">Your reward in <span id="adLeft">${left}</span>…</p></div>`,
    buttons: [],
  });
  const tick = () => {
    left--;
    const el = document.getElementById('adLeft'); if (el) el.textContent = left;
    if (left <= 0) adDone(); else later(1, tick);
  };
  later(1, tick);
}
function adDone() {
  hideDialog(); G.shop = null;
  const b = G.box;
  b.kind = 'carton'; b.slots = Array(12).fill(null); b.slots[11] = Math.random() < 0.5 ? 'brown' : 'white'; b.locked = false;
  G.adEgg = true;
  S.say('Thank you for watching. Here is one egg.');
  G.caption = 'THANK YOU FOR WATCHING. HERE IS ONE EGG.'; G.captionT = 4;
}
function removeAds() {
  G.spent += 1.99; S.sfx.cash(); adsBtn.hidden = true;
  const prev = stashDialog();
  showDialog({
    cls: 'store', title: 'EggStore',
    html: `<p class="offer-head">Ads removed ✔</p><p>$1.99 has been charged to your imagination.</p><p class="small">There were no ads.</p>`,
    buttons: [{ label: 'OK', onClick: () => restoreDialog(prev) }],
  });
}

function win() {
  G.mode = 'won'; G.endTime = G.elapsed;
  S.sfx.win();
  float('YOU WIN', 400, 220, 64, '#b3261e', 2.4);
  status('You win?');
  later(2.8, startBonus);
}
function startBonus() {
  G.mode = 'bonus'; G.bonusT = 0; G.peeled = 0;
  G.eggs = []; G.held = null; G.fx = []; G.texts = []; G.stamps = [];
  Object.assign(G.loaf, { x: 400, open: 0, brow: 0, mood: 0, sad: 0, yolk: 0, crust: 4, walking: false, chewing: false, tilt: 0, armUp: 0 });
  S.startMusic();
  chat.bonus();
  status('Bonus unlocked.');
  later(0.4, () => S.say('Bonus unlocked.'));
}
function peel(part) {
  const g = A.loafGeom(G.loaf);
  const P = {
    top: { x: g.cx, y: g.top + 8, w: 110, vx: rand(-80, 80), vy: -480, rot: 0 },
    left: { x: g.cx - g.w / 2 + 4, y: g.top + g.h * 0.62, w: 96, vx: -300, vy: -320, rot: Math.PI / 2 },
    right: { x: g.cx + g.w / 2 - 4, y: g.top + g.h * 0.62, w: 96, vx: 300, vy: -340, rot: Math.PI / 2 },
    bottom: { x: g.cx, y: g.bottom - 4, w: 100, vx: 120, vy: -260, rot: 0 },
  }[part];
  G.pieces.push({ ...P, spin: rand(-9, 9), rest: false });
  S.sfx.pop();
  const words = ['oh no', 'oh my', 'PEEL!', 'oh dear'];
  float(words[G.peeled % words.length], P.x, P.y - 30, 30, '#ffe066', 1.2);
}

/* ---------------- dialogs ---------------- */

function showDialog({ title, html, buttons = [], cls = '' }) {
  overlay.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'dlg ' + cls;
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
  d.innerHTML = `<div class="dlg-bar"></div><div class="dlg-body">${html}</div><div class="dlg-btns"></div>`;
  d.querySelector('.dlg-bar').textContent = title;
  const bb = d.querySelector('.dlg-btns');
  buttons.forEach((b, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = b.label; if (i === 0) el.className = 'primary';
    el.addEventListener('click', () => { S.initAudio(); b.onClick(); });
    bb.appendChild(el);
  });
  if (!buttons.length) bb.remove();
  overlay.appendChild(d); overlay.hidden = false;
  const first = bb.querySelector && bb.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}
function hideDialog() { overlay.hidden = true; overlay.innerHTML = ''; }
function stashDialog() { const prev = overlay.hidden ? null : overlay.firstElementChild; if (prev) prev.remove(); return prev; }
function restoreDialog(prev) {
  if (prev) { overlay.innerHTML = ''; overlay.appendChild(prev); overlay.hidden = false; } else hideDialog();
}

function showTitle() {
  showDialog({
    cls: 'title', title: 'EGGYBRD.EXE',
    html: `<p class="logo">EGGY BREAD</p>
      <p>Drag eggs from the carton into the loaf’s mouth.<br>Feed it ${GOAL} eggs and it becomes Eggy Bread.</p>
      <p class="small">Sound on is best. Tap an egg to toss it, or press Space.</p>`,
    buttons: [
      { label: 'Start', onClick: startGame },
      { label: 'How to play', onClick: showHelp },
    ],
  });
}
function showHelp() {
  const prev = stashDialog();
  const wasPaused = G.paused;
  if (G.mode === 'play' || G.mode === 'won') G.paused = true;
  showDialog({
    title: 'How to play',
    html: `<ul class="help">
      <li><b>Drag</b> an egg from the carton (bottom right) into the loaf’s mouth (bottom left).</li>
      <li>Or <b>tap</b> an egg to toss it. <b>Space</b> tosses one too.</li>
      <li>Feed the loaf ${GOAL} eggs.</li>
      <li>The rules are on the yellow note. They may change. They will change.</li>
      <li>Your coworkers are in the chat. You can answer them. Sort of.</li>
      <li>Press <b>B</b> if someone walks by.</li></ul>`,
    buttons: [{ label: 'OK', onClick: () => { restoreDialog(prev); G.paused = wasPaused; } }],
  });
}
function showEndCard() {
  const st = chat.stats();
  const rows = [
    ['Eggs the game says you fed', GOAL],
    ['Eggs you actually fed', G.fed],
    ['Eggs on the floor', G.dropped],
    ['Times the rules changed', G.rules.length - 1],
    ['Pretend money spent', money(G.spent)],
    ['Coworker messages ignored', st.ignored],
    ['Time', fmtTime(G.endTime)],
  ];
  showDialog({
    cls: 'end', title: 'Eggy Bread achieved',
    html: `<p>The loaf is now Eggy Bread. Probably.</p>
      <table class="stats">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`,
    buttons: [
      { label: 'Play again', onClick: startGame },
      { label: 'Keep watching', onClick: () => { hideDialog(); status('Use “New game” to play again.'); } },
    ],
  });
}
function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return `${m}:${String(r).padStart(2, '0')}`; }

/* ---------------- boss key ---------------- */

function toggleBoss() {
  const on = sheet.hidden;
  sheet.hidden = !on;
  gameWin.classList.toggle('boss', on);
  if (on) {
    G.bossWasPaused = G.paused; G.paused = true;
    tbTitle.textContent = 'Q3_BUDGET_FINAL_v2.XLS';
    document.title = 'Q3_BUDGET_FINAL_v2.xls';
    S.hush(); S.stopMusic();
    status('Sum = 9,319.40');
  } else {
    G.paused = G.bossWasPaused;
    tbTitle.textContent = 'EGGYBRD.EXE';
    document.title = 'Eggy Bread';
    if (G.mode === 'bonus') S.startMusic();
    status('Back to work. Sort of.');
  }
}

/* ---------------- the box (carton or crate) ---------------- */

function swapBox(fn) { G.box.anim = { t: 0, fn, swapped: false }; S.sfx.slide(); }
function boxReady() { return !G.box.locked && !G.box.anim; }
function inBox(p) { return p.x > BOX_X - 110 && p.x < BOX_X + 110 && p.y > FLOOR - 150 && p.y < FLOOR + 12; }

function takeEgg(p) {
  const b = G.box;
  if (!boxReady()) return null;
  if (b.kind === 'carton') {
    let best = -1, bd = 1e9;
    for (let i = 0; i < 12; i++) {
      if (!b.slots[i]) continue;
      const s = A.cartonSlotPos(i, BOX_X);
      const d = Math.hypot(s.x - p.x, s.y - 4 - p.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0 || (bd > 34 && !inBox(p))) return null;
    const c = b.slots[best]; b.slots[best] = null;
    afterTake();
    return c;
  }
  if (b.n <= 0 || !inBox(p)) return null;
  b.n--; afterTake();
  return Math.random() < 0.5 ? 'brown' : 'white';
}

function returnEgg(color) {
  const b = G.box;
  if (b.locked || b.anim) return false;
  if (b.kind === 'carton') {
    const i = b.slots.findIndex((s) => !s);
    if (i < 0) return false;
    b.slots[i] = color;
  } else b.n++;
  S.sfx.pick();
  return true;
}

function afterTake() {
  const b = G.box;
  const empty = b.kind === 'carton' ? b.slots.every((s) => !s) : b.n <= 0;
  if (!empty) return;
  if (G.adEgg || b.kind === 'crate') {
    G.adEgg = false; G.priceIx++;
    later(1.4, () => { if (G.mode !== 'play') return; G.box.locked = true; S.sfx.deny(); openShop(); });
    return;
  }
  if (!G.paywalled) later(0.6, () => swapBox(() => { G.box.slots = newCarton(); }));
}

function updateBox(dt) {
  const a = G.box.anim; if (!a) return;
  a.t += dt;
  if (a.t < 0.35) G.box.slide = ease(a.t / 0.35) * 300;
  else {
    if (!a.swapped) { a.swapped = true; a.fn(); }
    G.box.slide = (1 - ease((a.t - 0.35) / 0.45)) * 300;
    if (a.t >= 0.8) { G.box.slide = 0; G.box.anim = null; }
  }
}

/* ---------------- eggs and the loaf ---------------- */

function mouthHit(x, y, r) { const m = A.loafMouth(G.loaf); return Math.hypot(x - m.x, (y - m.y) * 1.1) < r; }
function canEat() { return G.mode === 'play' && G.breakT <= 0 && G.loaf.open > 0.55; }

function eat(color, x, y) {
  const L = G.loaf;
  L.bounce = 1; L.chew = 0.55; G.fed++;
  G.queue.push(color);
  G.hintDone = true;
  S.sfx.gulp();
  for (let i = 0; i < 6; i++) G.fx.push({ type: 'crumb', x, y, vx: rand(-130, 130), vy: rand(-240, -60), t: 0, dur: 0.8 });
}

function splatOnFace(e) {
  const L = G.loaf;
  e.dead = true; G.dropped++;
  L.yolk = 2.4; L.splatSeed = (Math.random() * 1e6) | 0; L.splatDx = rand(-14, 14); L.splatDy = rand(-6, 10); L.mood = 1;
  S.sfx.splat();
  float(G.breakT > 0 ? 'ON BREAK!' : 'SPLAT', e.x, e.y - 40, 26, '#b3261e');
}

function autoToss(color, x0, y0) {
  const T = 0.62, L = G.loaf;
  let px = L.x + (L.walking ? L.dir * WALK * T : 0);
  if (px > LOAF_MAX) px = 2 * LOAF_MAX - px;
  if (px < LOAF_MIN) px = 2 * LOAF_MIN - px;
  const m = A.loafMouth({ ...L, x: px });
  G.eggs.push({ x: x0, y: y0, vx: (m.x - x0) / T, vy: (m.y - y0 - 0.5 * GRAV * T * T) / T, rot: 0, spin: -9, color });
  S.sfx.whoosh();
}

function tossNext() {
  const b = G.box;
  if (!boxReady()) { S.sfx.deny(); return; }
  let pos, color;
  if (b.kind === 'carton') {
    let i = -1; for (let k = 11; k >= 0; k--) if (b.slots[k]) { i = k; break; }
    if (i < 0) { S.sfx.deny(); return; }
    pos = A.cartonSlotPos(i, BOX_X); color = b.slots[i]; b.slots[i] = null;
  } else {
    if (b.n <= 0) { S.sfx.deny(); return; }
    b.n--; pos = A.crateTop(BOX_X); color = Math.random() < 0.5 ? 'brown' : 'white';
  }
  afterTake();
  autoToss(color, pos.x, pos.y - 6);
}

function checkHeldEat() {
  const h = G.held; if (!h) return;
  if (!mouthHit(h.x, h.y, 42)) { h.denied = false; return; }
  if (canEat()) { G.held = null; eat(h.color, h.x, h.y); return; }
  if (G.breakT > 0 && !h.denied) { h.denied = true; S.sfx.deny(); float('shh. break.', h.x, h.y - 40, 24); }
}

function updateLoaf(dt) {
  const L = G.loaf;
  const m = A.loafMouth(L);
  const onBreak = G.breakT > 0;
  const near = (p) => Math.hypot(p.x - m.x, p.y - m.y);
  const incoming = G.eggs.some((e) => !e.dead && near(e) < 260);
  const hungry = G.mode === 'play' && !onBreak && !G.shop && (!!G.held || incoming);

  L.walking = (G.mode === 'play' || G.mode === 'title') && !onBreak && !G.shop;
  if (L.walking) {
    L.x += L.dir * WALK * dt; L.walkT += dt;
    if (L.x > LOAF_MAX) { L.x = LOAF_MAX; L.dir = -1; }
    if (L.x < LOAF_MIN) { L.x = LOAF_MIN; L.dir = 1; }
  }
  const k = Math.min(1, dt * 12);
  L.open += ((hungry ? 1 : 0) - L.open) * k;
  L.brow += ((hungry ? 1 : 0) - L.brow) * k;
  L.armUp += ((hungry ? 1 : G.mode === 'won' ? 1 : 0) - L.armUp) * k;
  L.sad += ((G.shop ? 1 : 0) - L.sad) * Math.min(1, dt * 4);
  L.wide = G.held ? Math.max(0, 1 - near(G.held) / 140) : 0;
  L.bounce = G.mode === 'won' ? Math.abs(Math.sin(G.t * 9)) * 0.5 : Math.max(0, L.bounce - dt * 4);
  L.yolk = Math.max(0, L.yolk - dt * 0.5);
  L.mood = Math.max(0, L.mood - dt * 0.4);

  if (L.chew > 0) {
    L.chew -= dt;
    G.chewSnd -= dt;
    if (L.open < 0.2 && G.chewSnd <= 0) { S.sfx.chew(); G.chewSnd = 0.14; }
    if (L.chew <= 0 && G.queue.length) swallowAll();
  }
  L.chewing = L.chew > 0 && L.open < 0.2;
}

function updateEggs(dt) {
  for (const e of G.eggs) {
    e.vy += GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt;
    if (e.x < 12) { e.x = 12; e.vx = Math.abs(e.vx) * 0.5; }
    if (e.x > W - 12) { e.x = W - 12; e.vx = -Math.abs(e.vx) * 0.5; }
    if (mouthHit(e.x, e.y, 36)) {
      if (canEat()) { e.dead = true; eat(e.color, e.x, e.y); continue; }
      if (G.mode === 'play') { splatOnFace(e); continue; }
    }
    if (e.y >= FLOOR - 12) {
      e.dead = true; G.dropped++;
      S.sfx.splat();
      G.fx.push({ type: 'splat', x: e.x, y: FLOOR - 4, t: 0, dur: 4, seed: (Math.random() * 1e6) | 0 });
      for (let i = 0; i < 5; i++) G.fx.push({ type: 'drop', x: e.x, y: FLOOR - 8, vx: rand(-160, 160), vy: rand(-260, -80), t: 0, dur: 0.7 });
    }
  }
  G.eggs = G.eggs.filter((e) => !e.dead);
}

function updateFx(dt) {
  for (const f of G.fx) {
    f.t += dt;
    if (f.type === 'crumb' || f.type === 'drop') {
      f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.y > FLOOR) { f.y = FLOOR; f.vx = 0; f.vy = 0; }
    }
  }
  G.fx = G.fx.filter((f) => f.t < f.dur);
  for (const tx of G.texts) { tx.t += dt; tx.y -= 28 * dt; }
  G.texts = G.texts.filter((tx) => tx.t < tx.dur);
  for (const s of G.stamps) s.t += dt;
  G.stamps = G.stamps.filter((s) => s.t < 2.4);
}

function updateBonus(dt) {
  G.bonusT += dt;
  const T = G.bonusT, L = G.loaf;
  const dancing = T > 1.2;
  L.dance = dancing ? 1 : 0;
  L.tilt = dancing ? Math.sin(T * Math.PI / S.BEAT) * 0.13 : 0;
  L.bounce = dancing ? Math.max(0, Math.sin(T * 2 * Math.PI / S.BEAT)) * 0.3 : 0;
  L.armUp = dancing ? 0.6 : 0;
  const times = [3.0, 4.2, 5.4, 6.6];
  while (G.peeled < 4 && T >= times[G.peeled]) { peel(A.CRUST_PARTS[G.peeled]); G.peeled++; L.crust = 4 - G.peeled; }
  if (G.peeled === 4 && !G.saidUncrusted && T > 7.2) {
    G.saidUncrusted = true;
    S.say('The loaf has removed its crust.');
  }
  for (const p of G.pieces) {
    if (p.rest) continue;
    p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    if (p.y > FLOOR - 7) { p.y = FLOOR - 7; p.rest = true; p.rot = Math.round(p.rot / Math.PI) * Math.PI; }
  }
  G.noteT -= dt;
  if (dancing && G.noteT <= 0) {
    G.noteT = S.BEAT;
    G.fx.push({ type: 'note', x: 400 + rand(-120, 120), y: 300, t: 0, dur: 2.2, s: rand(0.8, 1.3) });
  }
  for (const f of G.fx) if (f.type === 'note') f.y -= 50 * dt;
  if (!G.endShown && T > 11.5) { G.endShown = true; showEndCard(); }
}

function update(dt) {
  G.t += dt;
  const due = G.timers.filter((tm) => (tm.t -= dt) <= 0);
  G.timers = G.timers.filter((tm) => tm.t > 0);
  due.forEach((tm) => tm.fn());
  chat.tick(dt);
  if (G.mode === 'play') G.elapsed += dt;
  G.captionT = Math.max(0, G.captionT - dt);
  G.flash = Math.max(0, G.flash - dt * 2);
  updateFx(dt);
  if (G.mode === 'bonus') { updateBonus(dt); return; }
  if (G.breakT > 0) { G.breakT -= dt; if (G.breakT <= 0) endBreak(); }
  updateBox(dt);
  updateLoaf(dt);
  updateEggs(dt);
  checkHeldEat();
}

/* ---------------- drawing ---------------- */

function lookTarget() {
  if (G.held) return G.held;
  let best = null;
  for (const e of G.eggs) if (!best || e.x < best.x) best = e;
  return best || G.pointer;
}

function drawFx(layer) {
  for (const f of G.fx) {
    if (layer === 'floor' && f.type === 'splat') {
      A.drawSplat(ctx, f.x, f.y, Math.min(1, (f.dur - f.t) / 0.6), f.seed, 0.9);
    } else if (layer === 'air' && f.type === 'crumb') {
      ctx.fillStyle = '#c9873f'; ctx.fillRect(f.x - 2.5, f.y - 2.5, 5, 5);
    } else if (layer === 'air' && f.type === 'drop') {
      ctx.fillStyle = '#f6b313'; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill();
    } else if (layer === 'air' && f.type === 'note') {
      ctx.save(); ctx.globalAlpha = Math.min(1, (f.dur - f.t) / 0.5); A.drawNote(ctx, f.x, f.y, f.s, G.t); ctx.restore();
    }
  }
}
function drawTexts() {
  for (const tx of G.texts) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (tx.dur - tx.t) / 0.35);
    A.outlinedText(ctx, tx.text, tx.x, tx.y, tx.size, tx.color);
    ctx.restore();
  }
}
function eggShadow(x, y) {
  const d = Math.max(0, FLOOR - y);
  const s = Math.max(0.3, 1 - d / 400);
  ctx.fillStyle = `rgba(42,31,23,${0.16 * s})`;
  ctx.beginPath(); ctx.ellipse(x, FLOOR + 3, 14 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
}

function render() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (G.mode === 'bonus') { renderBonus(); return; }

  A.drawKitchen(ctx);
  drawFx('floor');
  const L = G.loaf;
  A.drawLoaf(ctx, L, {
    t: G.t, look: lookTarget(),
    mug: G.breakT > 0, sign: G.breakT > 0 ? `BACK IN ${Math.ceil(G.breakT)}` : null,
    happy: G.mode === 'won',
  });

  ctx.save(); ctx.translate(G.box.slide, 0);
  if (G.box.kind === 'carton') A.drawCarton(ctx, BOX_X, G.box.slots, { locked: G.box.locked });
  else A.drawCrate(ctx, BOX_X, G.box.n);
  ctx.restore();

  for (const e of G.eggs) { eggShadow(e.x, e.y); A.drawEgg(ctx, e.x, e.y, e.rot, 1, e.color); }
  if (G.held) { eggShadow(G.held.x, G.held.y); A.drawEgg(ctx, G.held.x, G.held.y, Math.sin(G.t * 10) * 0.15, 1.15, G.held.color); }
  drawFx('air');

  A.drawRules(ctx, G.rules, G.t);
  A.drawCounter(ctx, countText(G.count), GOAL, G.flash);
  A.drawVoice(ctx, G.captionT > 0 ? G.caption : '', G.captionT > 3.1);
  for (const s of G.stamps) A.drawStamp(ctx, s.text, s.x, s.y, s.t);
  drawTexts();

  if (G.mode === 'play' && !G.hintDone && !G.held && !G.eggs.length && G.t > 0.5) A.drawHint(ctx, BOX_X - 10, FLOOR - 128, G.t);
}

function renderBonus() {
  const T = G.bonusT, L = G.loaf;
  A.drawStage(ctx, T);
  for (const p of G.pieces) A.drawCrustPiece(ctx, p);
  A.drawLoaf(ctx, L, {
    t: T, look: { x: 400, y: 600 },
    happy: T > 1.2 && T < 7.2,
    wink: T >= 7.2 && (T % 1.6) < 0.9,
    censor: L.crust === 0 && T > 6.9,
  });
  drawFx('air');
  const title = T < 3 ? 'BONUS UNLOCKED' : 'BONUS: UNCRUSTED';
  A.outlinedText(ctx, title, 400, 64, 54, '#ffe066', '#1b1430');
  A.outlinedText(ctx, 'Very few people have ever seen this screen.', 400, 104, 24, '#f6e7c8', '#1b1430');
  if (L.crust === 0 && T > 6.9) A.outlinedText(ctx, '(CENSORED)', 400, FLOOR + 30, 26, '#ffe066', '#1b1430');
  drawTexts();
}

/* ---------------- input ---------------- */

function toLocal(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
const canPlay = () => G.mode === 'play' && !G.paused && overlay.hidden && sheet.hidden;

cv.addEventListener('pointerdown', (e) => {
  S.initAudio();
  const p = toLocal(e); G.pointer = p;
  if (!canPlay()) return;
  const color = takeEgg(p);
  if (!color) {
    if (inBox(p)) { S.sfx.deny(); if (G.box.locked) float('LOCKED', BOX_X, FLOOR - 150, 28, '#b3261e'); }
    return;
  }
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { }
  const now = performance.now();
  G.held = { x: p.x, y: p.y, sx: p.x, sy: p.y, t0: now, color, id: e.pointerId, hist: [{ x: p.x, y: p.y, t: now }] };
  S.sfx.pick();
});
cv.addEventListener('pointermove', (e) => {
  const p = toLocal(e); G.pointer = p;
  const h = G.held; if (!h || e.pointerId !== h.id) return;
  h.x = p.x; h.y = Math.min(p.y, FLOOR - 14);
  const now = performance.now();
  h.hist.push({ x: h.x, y: h.y, t: now });
  while (h.hist.length > 2 && now - h.hist[0].t > 90) h.hist.shift();
  checkHeldEat();
});
function release(e) {
  const h = G.held; if (!h || e.pointerId !== h.id) return;
  G.held = null;
  const now = performance.now();
  if (Math.hypot(h.x - h.sx, h.y - h.sy) < 12 && now - h.t0 < 350) { autoToss(h.color, h.x, h.y); return; }
  if (canEat() && mouthHit(h.x, h.y, 46)) { eat(h.color, h.x, h.y); return; }
  const a = h.hist[0], b = h.hist[h.hist.length - 1];
  const dt = Math.max(0.016, (b.t - a.t) / 1000);
  let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
  const sp = Math.hypot(vx, vy);
  if (sp > 1400) { vx *= 1400 / sp; vy *= 1400 / sp; }
  if (sp < 600 && inBox(h) && returnEgg(h.color)) return;
  G.eggs.push({ x: h.x, y: h.y, vx, vy, rot: 0, spin: vx / 70, color: h.color });
  if (sp > 300) S.sfx.whoosh();
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);

window.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') { e.preventDefault(); toggleBoss(); return; }
  if (e.key === 'Escape' && !sheet.hidden) { toggleBoss(); return; }
  if (e.code === 'Space' && canPlay()) { e.preventDefault(); S.initAudio(); tossNext(); }
});
sheet.addEventListener('click', () => toggleBoss());

/* ---------------- menu ---------------- */

const PREFS_KEY = 'eggybread.prefs';
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ sound: S.soundOn(), voice: S.voiceIsOn() })); } catch (e) { } }
function loadPrefs() {
  try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); if (p.sound === false) S.setSound(false); if (p.voice === false) S.setVoice(false); } catch (e) { }
}
function syncMenu() {
  const sb = document.querySelector('[data-act="sound"]'), vb = document.querySelector('[data-act="voice"]');
  sb.textContent = `Sound: ${S.soundOn() ? 'on' : 'off'}`; sb.setAttribute('aria-pressed', S.soundOn());
  vb.textContent = `Voice: ${S.voiceIsOn() ? 'on' : 'off'}`; vb.setAttribute('aria-pressed', S.voiceIsOn());
}

$('menubar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  b.blur(); S.initAudio();
  const act = b.dataset.act;
  if (act === 'new') { if (!sheet.hidden) toggleBoss(); startGame(); }
  if (act === 'sound') { S.setSound(!S.soundOn()); syncMenu(); savePrefs(); }
  if (act === 'voice') { S.setVoice(!S.voiceIsOn()); syncMenu(); savePrefs(); }
  if (act === 'help') showHelp();
  if (act === 'boss') toggleBoss();
  if (act === 'ads') removeAds();
});

function startGame() {
  S.initAudio(); S.stopMusic(); S.hush();
  const pointer = G.pointer;
  G = fresh(); G.mode = 'play'; G.pointer = pointer;
  hideDialog(); adsBtn.hidden = true;
  chat.reset(); chat.start();
  live.textContent = '';
  status('Feed the loaf.');
}

/* ---------------- boot ---------------- */

function fit() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(320, Math.round(r.width * dpr)), h = Math.round(w * H / W);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
new ResizeObserver(fit).observe(cv);
fit();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!G.paused) update(dt);
  render();
  requestAnimationFrame(frame);
}

loadPrefs(); syncMenu();
showTitle();
requestAnimationFrame(frame);

// Small hook for automated play-testing.
// step(sec) runs the game forward without waiting for real frames.
window.__eggy = {
  get state() { return G; }, startGame, tossNext, toggleBoss,
  step(sec) { for (let t = 0; t < sec; t += 1 / 60) if (!G.paused) update(1 / 60); render(); },
};
