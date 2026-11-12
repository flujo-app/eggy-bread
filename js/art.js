// All drawing lives here. The canvas is always drawn in an 800 x 450 space
// and scaled to fit the screen.

export const W = 800, H = 450, FLOOR = 392;
export const INK = '#2a1f17';
const TAU = Math.PI * 2;

export const font = (px) => `${px}px "VT323", ui-monospace, monospace`;

export const EGG_COLORS = {
  brown: { fill: '#e2ad7e', shade: '#c68b57' },
  white: { fill: '#fcf8ee', shade: '#ddd3bf' },
};

const BREAD = {
  crust: '#c9873f', crumb: '#f6dfae', speck: '#e2c287',
  naked: '#fcefd2', nakedSpeck: '#efdcb4',
};

/* ---------- small helpers ---------- */

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function panel(ctx, x, y, w, h, fill = '#fffaf0') {
  ctx.fillStyle = 'rgba(42,31,23,0.18)'; rrect(ctx, x + 4, y + 4, w, h, 6); ctx.fill();
  ctx.fillStyle = fill; rrect(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
}
export function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
export function outlinedText(ctx, text, x, y, size, color = INK, outline = '#fffaf0', align = 'center') {
  ctx.font = font(size); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size / 6); ctx.strokeStyle = outline;
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/* ---------- kitchen ---------- */

export function drawKitchen(ctx) {
  ctx.fillStyle = '#f8e6b6'; ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  for (let x = 0; x < W; x += 50) ctx.fillRect(x, 0, 24, FLOOR - 100);

  // tiled backsplash
  const ty = FLOOR - 100;
  ctx.fillStyle = '#edf3ee'; ctx.fillRect(0, ty, W, 100);
  ctx.strokeStyle = '#c9d6ce'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const y = ty + r * 25; seg(ctx, 0, y, W, y);
    for (let x = (r % 2) * 26; x < W; x += 52) seg(ctx, x, y, x, y + 25);
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; seg(ctx, 0, ty, W, ty);

  drawClock(ctx, 520, 150, 24);

  // salt and pepper, far right on the counter
  shaker(ctx, 760, '#fdfdfd', '#b8c0c4');
  shaker(ctx, 782, '#6b5647', '#b8c0c4');

  // counter and cabinets
  ctx.fillStyle = '#d9a46c'; ctx.fillRect(0, FLOOR + 14, W, H - FLOOR - 14);
  ctx.fillStyle = '#a8693a'; ctx.fillRect(0, FLOOR, W, 14);
  ctx.fillStyle = '#c98d55'; ctx.fillRect(0, FLOOR, W, 5);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; seg(ctx, 0, FLOOR, W, FLOOR); seg(ctx, 0, FLOOR + 14, W, FLOOR + 14);
  ctx.lineWidth = 2.5;
  for (let x = 12; x < W; x += 160) {
    rrect(ctx, x, FLOOR + 22, 140, 44, 4); ctx.stroke();
    ell(ctx, x + 126, FLOOR + 36, 3.5, 3.5); ctx.fillStyle = INK; ctx.fill();
  }
}

function shaker(ctx, x, body, cap) {
  const b = FLOOR;
  ctx.fillStyle = body; rrect(ctx, x - 8, b - 30, 16, 30, 4); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = cap; rrect(ctx, x - 8, b - 38, 16, 10, [6, 6, 2, 2]); ctx.fill(); ctx.stroke();
}

function drawClock(ctx, x, y, r) {
  ell(ctx, x, y, r, r); ctx.fillStyle = '#fffaf0'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    seg(ctx, x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
  }
  const d = new Date();
  const hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * TAU - Math.PI / 2;
  const mA = (d.getMinutes() + d.getSeconds() / 60) / 60 * TAU - Math.PI / 2;
  const sA = d.getSeconds() / 60 * TAU - Math.PI / 2;
  ctx.lineWidth = 3; seg(ctx, x, y, x + Math.cos(hA) * r * 0.5, y + Math.sin(hA) * r * 0.5);
  ctx.lineWidth = 2; seg(ctx, x, y, x + Math.cos(mA) * r * 0.75, y + Math.sin(mA) * r * 0.75);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1; seg(ctx, x, y, x + Math.cos(sA) * r * 0.8, y + Math.sin(sA) * r * 0.8);
}

/* ---------- eggs ---------- */

export function drawEgg(ctx, x, y, rot = 0, s = 1, color = 'brown') {
  const c = EGG_COLORS[color] || EGG_COLORS.brown;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.bezierCurveTo(9, -15, 12, -2, 12, 4);
  ctx.bezierCurveTo(12, 11, 6, 15, 0, 15);
  ctx.bezierCurveTo(-6, 15, -12, 11, -12, 4);
  ctx.bezierCurveTo(-12, -2, -9, -15, 0, -15);
  ctx.closePath();
  ctx.fillStyle = c.fill; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = c.shade; ell(ctx, 6, 8, 11, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ell(ctx, -5, -5, 2.6, 4.5, -0.3); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6 / s; ctx.stroke();
  ctx.restore();
}

export function drawSplat(ctx, x, y, alpha = 1, seed = 1, s = 1) {
  const r = rng(seed);
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y); ctx.scale(s, s * 0.8);
  ctx.beginPath();
  const n = 11;
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const rr = 16 + r() * 12; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffdf3'; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ell(ctx, r() * 6 - 3, r() * 4 - 2, 8, 8); ctx.fillStyle = '#f6b313'; ctx.fill(); ctx.stroke();
  ell(ctx, -2, -3, 2.5, 2); ctx.fillStyle = '#fff3c4'; ctx.fill();
  ctx.restore();
}

/* ---------- carton, crate ---------- */

export const CARTON = { w: 168, bh: 40 };

export function cartonSlotPos(i, x, base = FLOOR) {
  const l = x - CARTON.w / 2;
  if (i < 6) return { x: l + 26 + i * 25, y: base - CARTON.bh - 17 };       // back row
  return { x: l + 20 + (i - 6) * 25.6, y: base - CARTON.bh - 6 };          // front row
}

export function drawCarton(ctx, x, slots, { locked = false, base = FLOOR } = {}) {
  const { w, bh } = CARTON; const l = x - w / 2;
  ctx.lineJoin = 'round';
  // shadow
  ctx.fillStyle = 'rgba(42,31,23,0.14)'; ell(ctx, x, base + 2, w * 0.55, 6); ctx.fill();
  // open lid behind
  ctx.beginPath();
  ctx.moveTo(l + 4, base - bh - 22); ctx.lineTo(l + 14, base - bh - 76);
  ctx.lineTo(l + w + 6, base - bh - 76); ctx.lineTo(l + w - 4, base - bh - 22); ctx.closePath();
  ctx.fillStyle = '#d6cbb6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = font(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(42,31,23,0.6)'; ctx.fillText('FARM FRESH · 12', x + 5, base - bh - 50);
  // tray top
  ctx.beginPath();
  ctx.moveTo(l, base - bh); ctx.lineTo(l + 6, base - bh - 26); ctx.lineTo(l + w + 6, base - bh - 26); ctx.lineTo(l + w, base - bh);
  ctx.closePath(); ctx.fillStyle = '#c8bca5'; ctx.fill(); ctx.stroke();
  // eggs / empty cups
  for (let i = 0; i < 12; i++) {
    const p = cartonSlotPos(i, x, base);
    if (slots[i]) drawEgg(ctx, p.x, p.y - 4, 0, 0.8, slots[i]);
    else { ell(ctx, p.x, p.y + 5, 9, 4); ctx.fillStyle = '#9d8f78'; ctx.fill(); }
  }
  // front face with cup bumps
  ctx.beginPath();
  ctx.moveTo(l, base - bh + 2);
  for (let i = 0; i < 6; i++) {
    const cx = l + 20 + i * 25.6;
    ctx.quadraticCurveTo(cx - 12.8, base - bh - 6, cx - 6, base - bh + 2);
    ctx.quadraticCurveTo(cx, base - bh + 6, cx + 6, base - bh + 2);
  }
  ctx.lineTo(l + w, base - bh + 2);
  ctx.lineTo(l + w, base - 6); ctx.quadraticCurveTo(l + w, base, l + w - 6, base);
  ctx.lineTo(l + 6, base); ctx.quadraticCurveTo(l, base, l, base - 6); ctx.closePath();
  ctx.fillStyle = '#ddd3c0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(42,31,23,0.35)';
  for (let i = 1; i < 6; i++) { const cx = l + 7 + i * 25.6; seg(ctx, cx, base - bh + 10, cx, base - 8); }

  if (locked) {
    // tape + padlock
    ctx.save(); ctx.translate(x, base - bh - 10); ctx.rotate(-0.12);
    ctx.fillStyle = '#ffd43b'; ctx.fillRect(-w * 0.62, -13, w * 1.24, 26);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-w * 0.62, -13, w * 1.24, 26);
    ctx.font = font(21); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FREE TRIAL ENDED', 0, 1);
    ctx.restore();
    const px = x + 4, py = base - 22;
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(px, py - 10, 10, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#9aa3a8'; ctx.beginPath(); ctx.arc(px, py - 10, 10, Math.PI, 0); ctx.stroke();
    rrect(ctx, px - 15, py - 10, 30, 24, 4); ctx.fillStyle = '#f2c230'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    ell(ctx, px, py + 1, 3, 3); ctx.fillStyle = INK; ctx.fill(); ctx.fillRect(px - 1.5, py + 1, 3, 7);
  }
}

export const CRATE = { w: 196, h: 62 };
const PILE = (() => {
  const r = rng(42); const a = [];
  for (let row = 0; row < 4; row++) {
    const count = 7 - row;
    for (let i = 0; i < count; i++) {
      a.push({ dx: (i - (count - 1) / 2) * 24 + (r() * 6 - 3), dy: -row * 15 - r() * 4, rot: r() * 0.8 - 0.4, color: r() < 0.5 ? 'brown' : 'white' });
    }
  }
  return a;
})();
export function crateTop(x, base = FLOOR) { return { x, y: base - CRATE.h - 12 }; }

export function drawCrate(ctx, x, n, base = FLOOR) {
  const { w, h } = CRATE; const l = x - w / 2, t = base - h;
  ctx.fillStyle = 'rgba(42,31,23,0.14)'; ell(ctx, x, base + 2, w * 0.55, 6); ctx.fill();
  // heap of eggs (shows fewer as it empties)
  const show = Math.min(PILE.length, Math.ceil(n / 80 * PILE.length));
  for (let i = 0; i < show; i++) {
    const p = PILE[i];
    drawEgg(ctx, x + p.dx, t - 4 + p.dy, p.rot, 0.85, p.color);
  }
  // planks
  ctx.fillStyle = '#c58c55'; ctx.fillRect(l, t, w, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(l, t, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(42,31,23,0.45)';
  seg(ctx, l, t + h / 3, l + w, t + h / 3); seg(ctx, l, t + 2 * h / 3, l + w, t + 2 * h / 3);
  ctx.fillStyle = '#a8713f'; ctx.fillRect(l + 6, t, 14, h); ctx.fillRect(l + w - 20, t, 14, h);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(l + 6, t, 14, h); ctx.strokeRect(l + w - 20, t, 14, h);
  ctx.font = font(30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(42,31,23,0.82)'; ctx.fillText(`${n} EGGS`, x, t + h / 2 + 1);
  ctx.font = font(15); ctx.fillText('PREMIUM · PAID', x, t + h - 10);
}

/* ---------- the loaf ---------- */

export const LOAF = { w: 140, h: 162, leg: 26 };

export function loafGeom(L) {
  const bottom = L.base - LOAF.leg;
  return { cx: L.x, top: bottom - LOAF.h, bottom, w: LOAF.w, h: LOAF.h };
}
export function loafMouth(L) {
  const g = loafGeom(L);
  return { x: g.cx, y: g.top + g.h * 0.66 };
}

function slicePath(ctx, cx, top, w, h) {
  const l = cx - w / 2, r = cx + w / 2, b = top + h;
  const sh = top + h * 0.34;
  ctx.beginPath();
  ctx.moveTo(l, sh);
  ctx.bezierCurveTo(l - w * 0.16, sh - h * 0.02, l - w * 0.12, top + h * 0.02, cx - w * 0.18, top + h * 0.015);
  ctx.quadraticCurveTo(cx, top - h * 0.03, cx + w * 0.18, top + h * 0.015);
  ctx.bezierCurveTo(r + w * 0.12, top + h * 0.02, r + w * 0.16, sh - h * 0.02, r, sh);
  ctx.lineTo(r, b - 16); ctx.quadraticCurveTo(r, b, r - 16, b);
  ctx.lineTo(l + 16, b); ctx.quadraticCurveTo(l, b, l, b - 16);
  ctx.closePath();
}

const SPECKS = (() => { const r = rng(7); const a = []; for (let i = 0; i < 24; i++) a.push([r() * 2 - 1, r(), 1.4 + r() * 2, r() * Math.PI]); return a; })();

// The four crust pieces that come off during the bonus, in order.
export const CRUST_PARTS = ['top', 'left', 'right', 'bottom'];
function crustClip(ctx, part, g) {
  const { cx, top, bottom, w, h } = g;
  ctx.beginPath();
  if (part === 'top') ctx.rect(cx - w, top - 40, w * 2, h * 0.3 + 40);
  if (part === 'left') ctx.rect(cx - w, top + h * 0.3, w * 0.75, h);
  if (part === 'right') ctx.rect(cx + w * 0.25, top + h * 0.3, w, h);
  if (part === 'bottom') ctx.rect(cx - w * 0.25, bottom - h * 0.25, w * 0.5, h * 0.4);
  ctx.clip();
}

/**
 * L: { x, base, open, brow, bounce, armUp, mood, sad, tilt, walkT, walking, chewing, crust (parts left), naked }
 * o: { t, look:{x,y}, wink, mug, sign, censor }
 */
export function drawLoaf(ctx, L, o = {}) {
  const t = o.t || 0;
  const g = loafGeom(L);
  const { cx, top, bottom, w, h } = g;
  const naked = L.crust < CRUST_PARTS.length;
  const crumb = naked ? BREAD.naked : BREAD.crumb;
  const speck = naked ? BREAD.nakedSpeck : BREAD.speck;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // legs and shoes
  const walk = L.walking ? Math.sin(L.walkT * 9) : 0;
  const dance = L.dance || 0;
  for (const s of [-1, 1]) {
    const lift = Math.max(0, s * walk) * 7 + Math.max(0, Math.sin(t * 6.4 + (s > 0 ? Math.PI : 0))) * 9 * dance;
    const hipX = cx + s * 28, hipY = bottom - 6;
    const footX = cx + s * 34 + (L.walking ? walk * s * 3 : 0), footY = L.base - 6 - lift;
    ctx.strokeStyle = INK; ctx.lineWidth = 6; seg(ctx, hipX, hipY, footX, footY);
    ell(ctx, footX + s * 8, footY + 1, 14, 7); ctx.fillStyle = INK; ctx.fill();
  }

  // whole-body squash and stretch around the feet
  const breathe = Math.sin(t * 2.3);
  const bob = L.walking ? Math.abs(Math.sin(L.walkT * 9)) * 3 : 0;
  const sy = 1 + 0.05 * L.brow - 0.08 * L.bounce + 0.012 * breathe;
  const sx = 1 - 0.025 * L.brow + 0.07 * L.bounce - 0.006 * breathe;
  ctx.translate(cx, bottom - bob); ctx.rotate(L.tilt || 0); ctx.scale(sx, sy); ctx.translate(-cx, -bottom);

  // arms (behind the body)
  for (const s of [-1, 1]) {
    const up = (L.armUp || 0) + (dance ? Math.max(0, Math.sin(t * 6.4 + s)) * 0.8 : 0);
    const shx = cx + s * (w / 2 - 6), shy = top + h * 0.6;
    let hx = cx + s * (w / 2 + 24), hy = shy + 30 - up * 58;
    if (o.mug && s === 1) { hx = cx + w / 2 + 6; hy = shy + 4; }
    ctx.strokeStyle = INK; ctx.lineWidth = 6; seg(ctx, shx, shy, hx, hy);
    ell(ctx, hx, hy, 9, 9); ctx.fillStyle = crumb; ctx.fill(); ctx.lineWidth = 3.5; ctx.stroke();
  }

  // body: crust ring (only the parts still on), then crumb
  slicePath(ctx, cx, top, w, h);
  ctx.fillStyle = crumb; ctx.fill();
  for (let i = 0; i < L.crust; i++) {
    ctx.save(); crustClip(ctx, CRUST_PARTS[i], g);
    slicePath(ctx, cx, top, w, h); ctx.fillStyle = BREAD.crust; ctx.fill();
    ctx.restore();
  }
  slicePath(ctx, cx, top + 12, w - 24, h - 22); ctx.fillStyle = crumb; ctx.fill();
  if (!naked || L.crust > 0) { ctx.strokeStyle = 'rgba(122,72,26,0.45)'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.save(); ctx.clip();
  ctx.fillStyle = speck;
  for (const [u, v, r, a] of SPECKS) { ell(ctx, cx + u * (w / 2 - 18), top + 20 + v * (h - 42), r, r * 0.6, a); ctx.fill(); }
  ctx.restore();
  slicePath(ctx, cx, top, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.stroke();

  // face
  const ey = top + h * 0.38, ex = w * 0.2, my = top + h * 0.66;
  ctx.fillStyle = naked ? 'rgba(232,110,96,0.45)' : 'rgba(232,120,96,0.28)';
  ell(ctx, cx - 42, my - 12, 11, 7); ctx.fill(); ell(ctx, cx + 42, my - 12, 11, 7); ctx.fill();

  const wide = L.wide || 0;
  const blink = (L.open < 0.1) && ((t + 1.3) % 3.9) < 0.11;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    const winking = o.wink && s === 1;
    if (o.happy || winking) {
      ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 10, ey + 3); ctx.quadraticCurveTo(x, ey - 9, x + 10, ey + 3); ctx.stroke();
      continue;
    }
    const rx = 13 + 3 * wide, ry = blink ? 2 : 15 + 4 * wide;
    ell(ctx, x, ey, rx, ry); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
    if (!blink) {
      let dx = 0, dy = 0;
      if (o.look) { const ax = o.look.x - x, ay = o.look.y - ey; const d = Math.hypot(ax, ay) || 1; dx = ax / d * 5.5; dy = ay / d * 6.5; }
      ell(ctx, x + dx, ey + dy, 5.5 - 2 * wide, 5.5 - 2 * wide); ctx.fillStyle = INK; ctx.fill();
      ell(ctx, x + dx - 1.6, ey + dy - 2, 1.6, 1.6); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (L.sad > 0.2) {
      // tears
      const ty = ey + 16 + ((t * 40 + s * 9) % 26);
      ctx.fillStyle = '#7cc3ea'; ell(ctx, x + s * 8, ty, 3.2, 4.5); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // eyebrows
  const by = ey - 24 - 10 * L.brow;
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    ctx.strokeStyle = INK; ctx.lineWidth = 5;
    const inner = by + (L.mood || 0) * 6 - (L.sad || 0) * 5;
    const outer = by - (L.mood || 0) * 2 + (L.sad || 0) * 4;
    seg(ctx, x - s * 9, inner, x + s * 9, outer);
  }

  // mouth
  const op = L.open;
  if (op > 0.04) {
    const rx = 20 + 14 * op, ry = 3 + 28 * op;
    ell(ctx, cx, my, rx, ry); ctx.fillStyle = '#3b1a12'; ctx.fill();
    ctx.save(); ctx.clip();
    ell(ctx, cx, my + ry * 0.78, rx * 0.72, ry * 0.55); ctx.fillStyle = '#e4685a'; ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(cx - 13, my - ry - 1, 11, 8); ctx.fillRect(cx + 2, my - ry - 1, 11, 8);
    ctx.restore();
    ell(ctx, cx, my, rx, ry); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
  } else if (L.chewing) {
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = -18; i <= 18; i += 2) { const y = my + Math.sin(i * 0.38 + t * 20) * 3; if (i === -18) ctx.moveTo(cx + i, y); else ctx.lineTo(cx + i, y); }
    ctx.stroke();
    const puff = 9 + Math.sin(t * 14) * 2.5;
    ctx.fillStyle = mix(crumb, '#e9a089', 0.35);
    ell(ctx, cx - 30, my - 2, puff, puff * 0.85); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
    ell(ctx, cx + 30, my - 2, puff, puff * 0.85); ctx.fill(); ctx.stroke();
  } else {
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
    const curve = o.happy || o.wink ? 12 : (L.sad > 0.2 || L.mood > 0.3) ? -7 : 6;
    ctx.moveTo(cx - 18, my); ctx.quadraticCurveTo(cx, my + curve, cx + 18, my); ctx.stroke();
  }

  // egg on the face
  if (L.yolk > 0) drawSplat(ctx, cx + (L.splatDx || 0), ey + 30 + (L.splatDy || 0), Math.min(1, L.yolk), L.splatSeed || 3, 0.85);

  // coffee mug (break time)
  if (o.mug) {
    const mx = cx + w / 2 + 10, myy = top + h * 0.6 - 6;
    rrect(ctx, mx - 11, myy - 14, 22, 26, 3); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + 13, myy - 1, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(42,31,23,0.4)';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); const sx0 = mx - 4 + i * 8;
      for (let k = 0; k <= 10; k++) { const yy = myy - 18 - k * 2.2; const xx = sx0 + Math.sin(k * 0.8 + t * 4 + i) * 3; if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
  }

  // censor mosaic (bonus)
  if (o.censor) {
    const r = rng(Math.floor(t * 6) + 1);
    const bx = cx - 36, byy = top + h * 0.74, cs = 9;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = mix('#f3dcb0', '#c99a62', r());
      ctx.fillRect(bx + i * cs, byy + j * cs, cs, cs);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(bx, byy, cs * 8, cs * 3);
  }
  ctx.restore();

  // "on break" sign floats above the head, unaffected by squash
  if (o.sign) {
    const sx0 = cx, sy0 = top - 34 + Math.sin(t * 3) * 2;
    ctx.save(); ctx.translate(sx0, sy0); ctx.rotate(Math.sin(t * 2) * 0.05);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; seg(ctx, -30, -22, 0, -38); seg(ctx, 30, -22, 0, -38);
    rrect(ctx, -58, -22, 116, 40, 5); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
    ctx.font = font(24); ctx.fillStyle = '#c0392b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ON BREAK', 0, -9);
    ctx.font = font(17); ctx.fillStyle = INK; ctx.fillText(o.sign, 0, 8);
    ctx.restore();
  }
}

/* ---------- HUD pieces ---------- */

export function drawCounter(ctx, text, goal, flash = 0) {
  panel(ctx, 14, 12, 196, 74, flash > 0 ? mix('#fffaf0', '#ffe066', Math.min(1, flash)) : '#fffaf0');
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
  ctx.font = font(20); ctx.fillText('EGGS EATEN', 26, 34);
  ctx.font = font(50); ctx.fillText(text, 26, 74);
  ctx.textAlign = 'right'; ctx.font = font(20); ctx.fillStyle = 'rgba(42,31,23,0.7)';
  ctx.fillText(`GOAL ${goal}`, 198, 74);
}

export function drawVoice(ctx, text, speaking) {
  ctx.font = font(21);
  const maxW = 196;
  const lines = text ? wrap(ctx, text, maxW) : [];
  const h = Math.max(46, 18 + lines.length * 20);
  const x = W - 14 - 250, y = 12;
  panel(ctx, x, y, 250, h, '#20263a');
  // speaker icon
  const ix = x + 22, iy = y + 23;
  ctx.fillStyle = '#9fe7a4';
  ctx.beginPath(); ctx.moveTo(ix - 9, iy - 5); ctx.lineTo(ix - 3, iy - 5); ctx.lineTo(ix + 4, iy - 11); ctx.lineTo(ix + 4, iy + 11); ctx.lineTo(ix - 3, iy + 5); ctx.lineTo(ix - 9, iy + 5); ctx.closePath(); ctx.fill();
  if (speaking) {
    ctx.strokeStyle = '#9fe7a4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ix + 6, iy, 6, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(ix + 6, iy, 11, -0.9, 0.9); ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = text ? '#9fe7a4' : 'rgba(159,231,164,0.4)';
  if (!lines.length) ctx.fillText('VOICE READY', x + 44, y + 24);
  lines.forEach((ln, i) => ctx.fillText(ln, x + 44, y + 23 + i * 20 - (lines.length - 1) * 0));
}

export function drawRules(ctx, rules, t) {
  const shown = rules.length > 6 ? [rules[0], ...rules.slice(-5)] : rules;
  ctx.font = font(19);
  const lineH = 19, pad = 12, w = 238;
  const lines = [];
  shown.forEach((r, i) => {
    if (i === 1 && rules.length > 6) lines.push({ text: `(${rules.length - 6} older rules)`, struck: false, dim: true });
    wrap(ctx, `${rules.indexOf(r) + 1}. ${r.text}`, w - pad * 2).forEach((ln, k) => lines.push({ text: ln, struck: r.struck, fresh: r.fresh, first: k === 0 }));
  });
  const h = 40 + lines.length * lineH;
  ctx.save();
  ctx.translate(W / 2, 14); ctx.rotate(-0.018);
  const x = -w / 2;
  ctx.fillStyle = 'rgba(42,31,23,0.16)'; ctx.fillRect(x + 4, 4, w, h);
  ctx.fillStyle = '#fff07a'; ctx.fillRect(x, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-34, -8, 68, 16);
  ctx.strokeStyle = 'rgba(42,31,23,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, 0, w, h);
  ctx.fillStyle = INK; ctx.font = font(22); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('RULES', x + pad, 20);
  ctx.lineWidth = 2; ctx.strokeStyle = INK; seg(ctx, x + pad, 30, x + pad + 46, 30);
  ctx.font = font(19);
  lines.forEach((ln, i) => {
    const y = 44 + i * lineH;
    ctx.fillStyle = ln.dim ? 'rgba(42,31,23,0.45)' : ln.struck ? 'rgba(42,31,23,0.45)' : ln.fresh ? '#b3261e' : INK;
    ctx.fillText(ln.text, x + pad, y);
    if (ln.struck) { const tw = ctx.measureText(ln.text).width; ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; seg(ctx, x + pad - 2, y, x + pad + tw + 2, y); }
  });
  ctx.restore();
}

export function drawStamp(ctx, text, x, y, age) {
  const s = age < 0.18 ? 1.8 - (age / 0.18) * 0.8 : 1;
  const a = age > 1.8 ? Math.max(0, 1 - (age - 1.8) / 0.5) : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-0.16); ctx.scale(s, s);
  ctx.font = font(30); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + 22;
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; rrect(ctx, -tw / 2, -18, tw, 36, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.fill();
  ctx.fillStyle = '#c0392b'; ctx.fillText(text, 0, 1);
  ctx.restore();
}

/* ---------- bonus stage ---------- */

export function drawStage(ctx, t) {
  ctx.fillStyle = '#1b1430'; ctx.fillRect(0, 0, W, H);
  // disco dots
  const r = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * 300, ph = r() * TAU;
    const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * 3 + ph));
    ctx.fillStyle = `hsla(${(i * 47 + t * 60) % 360}, 90%, 70%, ${a * 0.8})`;
    ctx.fillRect(x, y, 4, 4);
  }
  // spotlight
  const g = ctx.createRadialGradient(400, 330, 20, 400, 300, 260);
  g.addColorStop(0, 'rgba(255,240,190,0.55)'); g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stage floor
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; seg(ctx, 0, FLOOR, W, FLOOR);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 60) seg(ctx, x, FLOOR, x - 40, H);
  // curtains
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W;
    ctx.fillStyle = '#a11d33';
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + side * 120, 0);
    ctx.quadraticCurveTo(x0 + side * 70, 200, x0 + side * 90, H); ctx.lineTo(x0, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + side * k * 28, 0); ctx.quadraticCurveTo(x0 + side * (k * 18), 200, x0 + side * (k * 22), H); ctx.stroke(); }
  }
  ctx.fillStyle = '#a11d33'; ctx.fillRect(0, 0, W, 26);
  ctx.fillStyle = '#e8b730';
  for (let x = 0; x < W; x += 20) { ell(ctx, x + 10, 26, 10, 6); ctx.fill(); }
}

export function drawCrustPiece(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  ctx.fillStyle = BREAD.crust; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  rrect(ctx, -p.w / 2, -7, p.w, 14, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function drawNote(ctx, x, y, s, t) {
  // a small music note
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.2); ctx.scale(s, s);
  ctx.fillStyle = '#ffe066'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ell(ctx, 0, 0, 7, 5, -0.4); ctx.fill(); ctx.stroke();
  ctx.fillRect(5, -26, 3, 26); ctx.strokeRect(5, -26, 3, 26);
  ctx.beginPath(); ctx.moveTo(8, -26); ctx.quadraticCurveTo(18, -20, 14, -10); ctx.stroke();
  ctx.restore();
}

export function drawHint(ctx, x, y, t) {
  const bob = Math.sin(t * 5) * 5;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.fillStyle = '#ffe066'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(10, -30); ctx.lineTo(10, -12); ctx.lineTo(20, -12); ctx.lineTo(0, 6); ctx.lineTo(-20, -12); ctx.lineTo(-10, -12); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  outlinedText(ctx, 'DRAG AN EGG TO THE LOAF', x - 60, y - 52 + bob, 24);
}
