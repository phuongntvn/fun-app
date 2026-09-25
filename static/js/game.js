/* Thỏ Ngọc & Kỳ Lân vs Zombie — Đêm Trung Thu
 * Engine game kiểu Plants vs. Zombies, vẽ hoàn toàn bằng Canvas 2D.
 * Dữ liệu nhân vật / màn chơi lấy từ Flask: /api/game-data
 */
'use strict';
(() => {
  // ------------------------------------------------------------------ hằng số
  const W = 1000, H = 650;
  const LAWN_X = 190, LAWN_Y = 110, CELL_W = 84, CELL_H = 96, COLS = 9, ROWS = 5;
  const LAWN_R = LAWN_X + COLS * CELL_W;
  const LAWN_B = LAWN_Y + ROWS * CELL_H;
  const ITEM_X0 = 200;
  const SUN_BOX = { x: 8, y: 8, w: 82, h: 88 };
  const CARD = { x0: 98, y: 8, w: 62, h: 88, gap: 5 };
  const BULLET_SPEED = 340;
  const SUN_TARGET = { x: 48, y: 42 };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);

  let DATA = null;
  let game = null;
  let speed = 1;
  let paused = false;
  let muted = false;
  const mouse = { x: -100, y: -100, inside: false };

  // ------------------------------------------------------------ lưu tiến độ
  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem('tt_pvz_progress') || 'null');
      if (p && typeof p.unlocked === 'number') return p;
    } catch (e) { /* bỏ qua */ }
    return { unlocked: 1, won: [] };
  }
  function saveProgress() {
    try { localStorage.setItem('tt_pvz_progress', JSON.stringify(progress)); } catch (e) { /* bỏ qua */ }
  }
  let progress = loadProgress();

  // ---------------------------------------------------------------- canvas
  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ----------------------------------------------------------------- âm thanh
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    return actx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (muted) return;
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.3) {
    if (muted) return;
    const a = audio();
    if (!a) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(g).connect(a.destination);
    s.start();
  }
  const sfx = {
    plant: () => { tone(220, 0.12, 'triangle', 0.2, -80); },
    shoot: () => tone(520, 0.07, 'square', 0.04, -200),
    hit: () => tone(180, 0.06, 'triangle', 0.08, -60),
    armor: () => tone(900, 0.06, 'square', 0.05, -300),
    sun: () => { tone(880, 0.1, 'sine', 0.12); tone(1320, 0.14, 'sine', 0.1, 0, 0.06); },
    select: () => tone(660, 0.05, 'triangle', 0.1),
    nope: () => tone(140, 0.15, 'sawtooth', 0.08),
    chomp: () => tone(110, 0.08, 'sawtooth', 0.06, -40),
    boom: () => { noise(0.6, 0.45); tone(90, 0.5, 'sine', 0.3, -60); },
    mower: () => tone(300, 0.5, 'sawtooth', 0.08, 300),
    groan: () => tone(150 + Math.random() * 40, 0.5, 'sawtooth', 0.04, -50),
    wave: () => { tone(330, 0.3, 'square', 0.08); tone(247, 0.5, 'square', 0.08, 0, 0.3); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, 0, i * 0.15)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.08, 0, i * 0.25)),
    shovel: () => tone(250, 0.15, 'triangle', 0.15, -150),
    smash: () => { noise(0.3, 0.4); tone(70, 0.3, 'sine', 0.3); },
    howl: () => { tone(260, 0.9, 'sawtooth', 0.06, 380); tone(200, 0.9, 'triangle', 0.05, 260, 0.1); },
    gulp: () => { tone(160, 0.12, 'sine', 0.2, -80); tone(90, 0.2, 'sine', 0.2, -30, 0.12); },
    power: () => [523, 784, 1046, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.06)),
    meteor: () => { tone(1400, 0.6, 'sine', 0.08, -1100); noise(0.5, 0.2); },
    wind: () => noise(0.9, 0.18),
    tick: (n) => { tone(420 + n * 160, 0.14, 'triangle', 0.18); tone(840 + n * 320, 0.1, 'sine', 0.08, 0, 0.05); },
    drumroll: () => { for (let i = 0; i < 16; i++) tone(95 + (i % 2) * 12, 0.05, 'square', 0.07 + i * 0.004, 0, i * 0.068); },
    fanfare: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.16, 0, i * 0.11)); noise(0.4, 0.12); },
  };

  // --------------------------------------------------------------- tiện ích vẽ
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rowCY = (r) => LAWN_Y + r * CELL_H + CELL_H / 2;
  const colCX = (c) => LAWN_X + c * CELL_W + CELL_W / 2;

  function ell(c, x, y, rx, ry, fill, stroke, lw = 2) {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function rrect(c, x, y, w, h, r, fill, stroke, lw = 2) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  function starPath(c, x, y, R, r, n = 5, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = rot + (i * Math.PI) / n;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function text(c, s, x, y, size, color, align = 'center', stroke = null, weight = 'bold') {
    c.font = `${weight} ${size}px "Trebuchet MS", Arial, sans-serif`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    if (stroke) {
      c.lineWidth = Math.max(2, size / 6);
      c.strokeStyle = stroke;
      c.lineJoin = 'round';
      c.strokeText(s, x, y);
    }
    c.fillStyle = color;
    c.fillText(s, x, y);
  }

  // ============================================================ VẼ NHÂN VẬT
  // Tất cả hàm vẽ nhân vật: gốc toạ độ (0,0) là tâm ô, mặt đất ở y≈+32.

  function drawRabbit(c, t, o) {
    const fur = o.fur || '#ffffff';
    const shade = o.shade || '#e3e1ef';
    const bob = Math.sin(t * 3 + (o.phase || 0)) * 2;
    ell(c, 0, 33, 26, 7, 'rgba(0,0,0,.22)');
    // chân + thân
    ell(c, -11, 30, 10, 5, shade, '#8a8aa0', 1.5);
    ell(c, 11, 30, 10, 5, shade, '#8a8aa0', 1.5);
    ell(c, 0, 12 + bob * 0.3, 20, 19, fur, '#8a8aa0', 2);
    ell(c, 2, 15 + bob * 0.3, 11, 11, shade);
    // đuôi bông
    ell(c, -19, 18, 7, 7, fur, '#8a8aa0', 1.5);
    const hy = -12 + bob;
    // tai
    const ear = (x, rot, len) => {
      c.save();
      c.translate(x, hy - 10);
      c.rotate(rot + Math.sin(t * 2 + x) * 0.05);
      ell(c, 0, -len, 6.5, len, fur, '#8a8aa0', 2);
      ell(c, 0, -len, 3.2, len - 5, '#ffb7c8');
      c.restore();
    };
    ear(-4, -0.3, 18);
    ear(9, 0.15, o.earLen || 19);
    // đầu
    ell(c, 4, hy, 18, 16, fur, '#8a8aa0', 2);
    if (o.headDeco) o.headDeco(c, hy);
    // mắt
    const blink = (Math.sin(t * 0.9 + (o.phase || 0) * 3) > 0.985);
    const eye = (x) => {
      if (blink) {
        c.strokeStyle = '#3a1f3a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - 3, hy - 2); c.lineTo(x + 3, hy - 2); c.stroke();
      } else {
        ell(c, x, hy - 2, 3.4, 4.2, '#3a1f3a');
        ell(c, x + 1, hy - 3.5, 1.3, 1.3, '#fff');
      }
    };
    eye(3); eye(13);
    ell(c, 18, hy + 4, 2.4, 1.8, '#ff7a9a');
    c.strokeStyle = '#6a3a4a'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(16, hy + 7, 2.5, 0.2, Math.PI - 0.2); c.stroke();
    ell(c, 0, hy + 5, 3.5, 2.2, 'rgba(255,120,150,.45)');
    ell(c, 17, hy + 5, 3, 2, 'rgba(255,120,150,.45)');
  }

  function drawThoNgoc(c, t, p) {
    const glow = p ? p.glow || 0 : 0;
    if (glow > 0) ell(c, 0, 0, 44 * glow + 10, 44 * glow + 10, `rgba(255,236,150,${0.35 * glow})`);
    drawRabbit(c, t, {
      phase: 0.3,
      headDeco: (c2, hy) => {
        // vầng trăng khuyết trên trán
        c2.beginPath();
        c2.arc(6, hy - 9, 5, 0.6, Math.PI * 2 - 0.6);
        c2.arc(8.5, hy - 9, 4, Math.PI * 2 - 0.9, 0.9, true);
        c2.fillStyle = '#ffd54f'; c2.fill();
      },
    });
    // cối giã thuốc
    const pound = Math.abs(Math.sin(t * 4));
    c.fillStyle = '#8d5a2b';
    c.beginPath();
    c.moveTo(14, 16); c.lineTo(38, 16); c.lineTo(34, 32); c.lineTo(18, 32); c.closePath();
    c.fill();
    c.strokeStyle = '#4e2c0e'; c.lineWidth = 2; c.stroke();
    ell(c, 26, 16, 12, 4, '#fff6c9', '#4e2c0e', 1.5);
    // chày
    c.save();
    c.translate(26, 10 - pound * 10);
    c.rotate(-0.35);
    rrect(c, -3, -22, 6, 26, 3, '#c28a4a', '#4e2c0e', 1.5);
    c.restore();
    // tay
    ell(c, 18, 2 - pound * 5, 5, 4, '#fff', '#8a8aa0', 1.5);
    if (Math.sin(t * 4) > 0.95) ell(c, 26, 12, 3, 3, '#fffbe0');
  }

  function drawShooterRabbit(c, t, p, ice) {
    const recoil = p && p.recoil > 0 ? p.recoil * 6 : 0;
    drawRabbit(c, t, ice ? {
      fur: '#e8f6ff', shade: '#c7e4f5', phase: 1.1,
      headDeco: (c2, hy) => {
        // mũ len
        c2.fillStyle = '#4fc3f7';
        c2.beginPath(); c2.ellipse(4, hy - 11, 15, 7, 0, Math.PI, 0); c2.fill();
        ell(c2, 4, hy - 20, 4, 4, '#fff');
      },
    } : { phase: 2.1 });
    if (ice) {
      // khăn quàng
      rrect(c, -8, -2, 26, 7, 3, '#29b6f6', '#0277bd', 1.5);
      rrect(c, -6, 3, 7, 14, 3, '#29b6f6', '#0277bd', 1.5);
    }
    // ống bắn hình đèn lồng
    c.save();
    c.translate(12 - recoil, 4);
    const body = ice ? '#81d4fa' : '#e53935';
    const dark = ice ? '#0277bd' : '#8e0000';
    rrect(c, 0, -9, 30, 18, 8, body, dark, 2);
    rrect(c, 26, -11, 8, 22, 3, ice ? '#e1f5fe' : '#ffca28', dark, 2);
    c.strokeStyle = ice ? '#e1f5fe' : '#ffca28'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(10, -9); c.lineTo(10, 9); c.moveTo(18, -9); c.lineTo(18, 9); c.stroke();
    c.restore();
    ell(c, 14 - recoil, 10, 5, 4, ice ? '#e8f6ff' : '#fff', '#8a8aa0', 1.5);
  }

  function drawUnicorn(c, t, p) {
    const bob = Math.sin(t * 3 + 0.7) * 1.8;
    const recoil = p && p.recoil > 0 ? p.recoil * 4 : 0;
    const rainbow = ['#ff5252', '#ffab40', '#ffee58', '#69f0ae', '#40c4ff', '#b388ff'];
    ell(c, 0, 33, 30, 7, 'rgba(0,0,0,.22)');
    // đuôi cầu vồng
    rainbow.forEach((col, i) => {
      c.strokeStyle = col; c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(-24, -2 + i * 2);
      c.quadraticCurveTo(-40 + Math.sin(t * 3 + i) * 3, 6 + i * 2, -32, 22 + i * 1.5);
      c.stroke();
    });
    // chân
    const leg = (x) => {
      rrect(c, x - 3.5, 4, 7, 26, 3, '#fff', '#9e9ec0', 1.5);
      rrect(c, x - 4, 26, 8, 6, 2, '#ffca28', '#b28900', 1.5);
    };
    leg(-16); leg(-7); leg(8); leg(17);
    // thân
    ell(c, 0, -2 + bob * 0.3, 27, 15, '#ffffff', '#9e9ec0', 2);
    ell(c, 0, 4 + bob * 0.3, 18, 7, '#f3eefe');
    // cổ + đầu
    c.save();
    c.translate(-recoil, bob);
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(10, -10); c.lineTo(20, -36); c.lineTo(32, -32); c.lineTo(25, -4); c.closePath();
    c.fill(); c.strokeStyle = '#9e9ec0'; c.lineWidth = 2; c.stroke();
    c.save();
    c.translate(28, -38); c.rotate(0.35);
    ell(c, 0, 0, 13, 10, '#fff', '#9e9ec0', 2);
    ell(c, 10, 3, 8, 7, '#fff0f6', '#9e9ec0', 2);
    ell(c, 13, 2, 1.3, 1.3, '#b0708a');
    c.restore();
    // bờm cầu vồng
    rainbow.forEach((col, i) => {
      ell(c, 18 - i * 1.5, -46 + i * 6.5, 6, 5, col);
    });
    // sừng
    c.fillStyle = '#ffd54f';
    c.beginPath(); c.moveTo(23, -46); c.lineTo(31, -45); c.lineTo(33, -72); c.closePath(); c.fill();
    c.strokeStyle = '#c79100'; c.lineWidth = 1.5; c.stroke();
    c.beginPath(); c.moveTo(25, -52); c.lineTo(31, -54); c.moveTo(27, -60); c.lineTo(32, -62); c.stroke();
    // tai
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(20, -46); c.lineTo(17, -56); c.lineTo(24, -48); c.fill();
    // mắt
    ell(c, 28, -40, 3, 3.6, '#3a1f3a');
    ell(c, 29, -41.5, 1.1, 1.1, '#fff');
    ell(c, 33, -33, 3.2, 2, 'rgba(255,120,150,.5)');
    c.restore();
    // lấp lánh
    const sp = (t * 2) % 1;
    c.save(); c.globalAlpha = 1 - sp;
    starPath(c, 40, -60 - sp * 10, 4, 1.6); c.fillStyle = '#fff59d'; c.fill();
    c.restore();
  }

  function drawMooncake(c, r, face, crack, t) {
    // viền hoa văn
    c.beginPath();
    const n = 14;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rad = i % 2 ? r : r + 4;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.fillStyle = '#c47a2c'; c.fill();
    c.strokeStyle = '#6d3a0a'; c.lineWidth = 2; c.stroke();
    ell(c, 0, 0, r - 4, r - 4, '#e0a050', '#8a4f14', 2);
    ell(c, 0, 0, r - 10, r - 10, null, '#b36a20', 2);
    // hoa văn giữa
    for (let i = 0; i < 4; i++) {
      c.save(); c.rotate((i * Math.PI) / 2 + Math.PI / 4);
      ell(c, 0, -(r - 20) * 0.6, 4, (r - 20) * 0.45, '#cf8a3a');
      c.restore();
    }
    if (face) {
      const worried = crack >= 2;
      const eyeY = -4;
      ell(c, 2, eyeY, 4.2, 5.5, '#fff', '#5a2f08', 1.5);
      ell(c, 16, eyeY, 4.2, 5.5, '#fff', '#5a2f08', 1.5);
      const look = Math.sin(t * 0.7) * 1.2 + 1.5;
      ell(c, 2 + look, eyeY + 1, 2, 2.6, '#2a1300');
      ell(c, 16 + look, eyeY + 1, 2, 2.6, '#2a1300');
      c.strokeStyle = '#5a2f08'; c.lineWidth = 2;
      c.beginPath();
      if (worried) { c.arc(9, 14, 5, Math.PI + 0.3, -0.3); } else { c.arc(9, 8, 5, 0.3, Math.PI - 0.3); }
      c.stroke();
      if (worried) {
        c.beginPath(); c.moveTo(-2, -12); c.lineTo(6, -10); c.moveTo(20, -12); c.lineTo(12, -10); c.stroke();
      }
    }
    if (crack >= 1) {
      c.strokeStyle = '#4a2200'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-r + 6, -8); c.lineTo(-14, -2); c.lineTo(-18, 8); c.lineTo(-10, 14); c.stroke();
    }
    if (crack >= 2) {
      c.beginPath(); c.moveTo(r - 8, -r + 14); c.lineTo(20, -12); c.lineTo(26, -2); c.moveTo(-4, r - 6); c.lineTo(0, 18); c.lineTo(8, 22); c.stroke();
    }
  }

  function drawBanhNuong(c, t, p) {
    ell(c, 0, 33, 30, 7, 'rgba(0,0,0,.22)');
    let crack = 0;
    if (p) {
      const ratio = p.hp / p.maxHp;
      crack = ratio < 0.34 ? 2 : ratio < 0.67 ? 1 : 0;
    }
    c.save();
    c.translate(0, 2 + Math.sin(t * 2) * 0.8);
    c.scale(1, 1.02);
    drawMooncake(c, 33, true, crack, t);
    c.restore();
  }

  function drawBanhDeo(c, t, p) {
    const armed = !p || p.armed;
    if (!armed) {
      // đang ủ dưới đất
      ell(c, 0, 26, 24, 8, '#6d4c2b');
      c.save();
      c.beginPath(); c.rect(-30, -20, 60, 46); c.clip();
      ell(c, 0, 26, 15, 10, '#f1f8e9', '#9ccc65', 2);
      c.restore();
      ell(c, -6, 22, 1.8, 1.8, '#333'); ell(c, 5, 22, 1.8, 1.8, '#333');
      text(c, 'z', 16, 10 - Math.sin(t * 2) * 3, 10, '#fff', 'center', '#555');
      return;
    }
    const pop = p ? clamp(p.popT || 0, 0, 1) : 1;
    ell(c, 0, 28, 28, 7, '#6d4c2b');
    c.save();
    c.translate(0, 28);
    c.scale(1, 0.3 + 0.7 * pop);
    // bánh dẻo trắng xanh
    c.beginPath(); c.ellipse(0, -14, 24, 18, 0, Math.PI, 0); c.lineTo(24, 0); c.lineTo(-24, 0); c.closePath();
    c.fillStyle = '#f1f8e9'; c.fill(); c.strokeStyle = '#9ccc65'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 5; i++) {
      c.save(); c.translate(0, -16); c.rotate((i * Math.PI * 2) / 5);
      ell(c, 0, -7, 3, 6, '#c5e1a5');
      c.restore();
    }
    ell(c, 0, -16, 3, 3, '#aed581');
    ell(c, -9, -8, 2.4, 3, '#2e2e2e'); ell(c, 9, -8, 2.4, 3, '#2e2e2e');
    c.restore();
    // đèn nhấp nháy
    const on = Math.sin(t * 8) > 0;
    c.strokeStyle = '#555'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 28 - 32 * pop); c.lineTo(0, 28 - 40 * pop); c.stroke();
    ell(c, 0, 28 - 43 * pop, 4, 4, on ? '#ff1744' : '#7f0000');
    if (on) ell(c, 0, 28 - 43 * pop, 8, 8, 'rgba(255,23,68,.3)');
  }

  function drawStarLantern(c, t, p, s = 1) {
    const fuse = p ? p.fuseT || 0 : 0;
    const grow = 1 + fuse * 0.35;
    const shake = fuse > 0 ? Math.sin(t * 60) * 2 * fuse : 0;
    ell(c, 0, 33, 24, 6, 'rgba(0,0,0,.22)');
    c.save();
    c.translate(shake, 0);
    // cán
    c.strokeStyle = '#8d6e63'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-18, 32); c.lineTo(-4, 2); c.stroke();
    c.scale(grow * s, grow * s);
    // tua rua
    for (let i = -1; i <= 1; i++) {
      c.strokeStyle = '#ffd54f'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(i * 6, 22); c.lineTo(i * 7 + Math.sin(t * 4 + i) * 2, 36); c.stroke();
    }
    ell(c, 0, -6, 34, 34, `rgba(255,200,80,${0.2 + 0.15 * Math.sin(t * 5)})`);
    starPath(c, 0, -6, 30, 13);
    const grad = c.createRadialGradient(0, -8, 3, 0, -6, 30);
    grad.addColorStop(0, fuse > 0.5 ? '#ffffff' : '#fff176');
    grad.addColorStop(0.5, '#ff7043');
    grad.addColorStop(1, '#c62828');
    c.fillStyle = grad; c.fill();
    c.strokeStyle = '#ffd54f'; c.lineWidth = 3; c.stroke();
    // mặt
    ell(c, -5, -8, 2.5, 3.5, '#4a0000'); ell(c, 5, -8, 2.5, 3.5, '#4a0000');
    c.strokeStyle = '#4a0000'; c.lineWidth = 2;
    c.beginPath();
    if (fuse > 0) c.ellipse(0, 2, 4, 5, 0, 0, Math.PI * 2);
    else c.arc(0, -1, 4, 0.3, Math.PI - 0.3);
    c.stroke();
    c.restore();
  }

  function drawTrongLan(c, t, p) {
    const offX = p ? p.offX || 0 : 0;
    const offY = p ? p.offY || 0 : 0;
    const angry = p && p.state && p.state !== 'idle';
    ell(c, 0, 33, 26 - Math.min(10, -offY / 8), 7, 'rgba(0,0,0,.22)');
    c.save();
    c.translate(offX, offY + Math.sin(t * 3) * (angry ? 0 : 1.2));
    // thân trống
    const body = c.createLinearGradient(-26, 0, 26, 0);
    body.addColorStop(0, '#8e1b10'); body.addColorStop(0.35, '#e53935'); body.addColorStop(1, '#9d1d12');
    c.beginPath();
    c.moveTo(-26, -8); c.quadraticCurveTo(-30, 10, -24, 28); c.lineTo(24, 28); c.quadraticCurveTo(30, 10, 26, -8); c.closePath();
    c.fillStyle = body; c.fill(); c.strokeStyle = '#4a0a05'; c.lineWidth = 2; c.stroke();
    // đai vàng + đinh
    rrect(c, -28, -10, 56, 6, 3, '#ffca28', '#8a6000', 1.5);
    rrect(c, -25, 24, 50, 6, 3, '#ffca28', '#8a6000', 1.5);
    for (let i = -2; i <= 2; i++) { ell(c, i * 10, -7, 1.6, 1.6, '#fff59d'); ell(c, i * 9, 27, 1.6, 1.6, '#fff59d'); }
    // mặt trống
    ell(c, 0, -10, 27, 8, '#f3dfb4', '#8a6000', 2);
    ell(c, 0, -10, 12, 3.5, '#e53935');
    ell(c, 0, -10, 5, 1.6, '#ffd54f');
    // mặt
    c.strokeStyle = '#3a0500'; c.lineWidth = 2.5;
    c.beginPath();
    if (angry) { c.moveTo(-14, 0); c.lineTo(-4, 4); c.moveTo(14, 0); c.lineTo(4, 4); }
    else { c.moveTo(-14, 2); c.lineTo(-5, 1); c.moveTo(14, 2); c.lineTo(5, 1); }
    c.stroke();
    ell(c, -8, 8, 4, angry ? 3.5 : 4.5, '#fff', '#3a0500', 1.2);
    ell(c, 8, 8, 4, angry ? 3.5 : 4.5, '#fff', '#3a0500', 1.2);
    ell(c, -7, 9, 2, 2.2, '#1a0000'); ell(c, 9, 9, 2, 2.2, '#1a0000');
    c.beginPath();
    if (angry) c.ellipse(0, 19, 6, 4, 0, 0, Math.PI * 2); else c.arc(0, 15, 5, 0.2, Math.PI - 0.2);
    c.fillStyle = angry ? '#3a0500' : 'transparent'; if (angry) c.fill(); c.stroke();
    // dùi trống
    const swing = angry ? -0.8 : Math.sin(t * 2) * 0.1;
    [[-1, 1], [1, -1]].forEach(([sx], i) => {
      c.save(); c.translate(sx * 12, -16); c.rotate(sx * (0.5 + (i ? swing : -swing)));
      rrect(c, -2, -26, 4, 26, 2, '#a1887f', '#4e342e', 1.2);
      ell(c, 0, -27, 4.5, 4.5, '#e53935', '#4a0a05', 1.2);
      c.restore();
    });
    c.restore();
  }

  function drawHatDeGai(c, t, p) {
    const jab = p && p.glow > 0 ? p.glow : 0;
    ell(c, 0, 30, 34, 7, 'rgba(0,0,0,.2)');
    // vỏ gai
    c.save(); c.translate(0, 26);
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + (i / 25) * Math.PI;
      const len = 12 + (i % 2) * 5 + jab * 6;
      c.strokeStyle = i % 2 ? '#8d6e3f' : '#6d4c2b'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 26, Math.sin(a) * 12); c.lineTo(Math.cos(a) * (26 + len), Math.sin(a) * (12 + len)); c.stroke();
    }
    const husk = c.createRadialGradient(-6, -8, 2, 0, 0, 30);
    husk.addColorStop(0, '#c0a060'); husk.addColorStop(1, '#6d5025');
    c.beginPath(); c.ellipse(0, 0, 30, 14, 0, Math.PI, 0); c.lineTo(30, 3); c.lineTo(-30, 3); c.closePath();
    c.fillStyle = husk; c.fill(); c.strokeStyle = '#3e2a10'; c.lineWidth = 2; c.stroke();
    // hạt dẻ bóng loáng
    const nut = c.createRadialGradient(-4, -14, 1, 0, -8, 14);
    nut.addColorStop(0, '#d98b52'); nut.addColorStop(0.6, '#8a3f18'); nut.addColorStop(1, '#5a2508');
    c.beginPath(); c.moveTo(-13, -2); c.quadraticCurveTo(-12, -20, 0, -22); c.quadraticCurveTo(12, -20, 13, -2); c.closePath();
    c.fillStyle = nut; c.fill(); c.strokeStyle = '#3a1604'; c.lineWidth = 1.5; c.stroke();
    ell(c, 0, -3, 12, 3, '#e8cf9a');
    ell(c, -4, -15, 3, 2, 'rgba(255,255,255,.5)');
    ell(c, -4, -9, 2, 2.4, '#1a0a00'); ell(c, 5, -9, 2, 2.4, '#1a0a00');
    c.strokeStyle = '#1a0a00'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-7, -14); c.lineTo(-2, -12); c.moveTo(8, -14); c.lineTo(3, -12); c.stroke();
    c.restore();
  }

  function drawChoBuoi(c, t, p) {
    const chewing = p && p.chew > 0;
    const biting = p && p.biteT > 0;
    const bob = Math.sin(t * (chewing ? 8 : 3)) * (chewing ? 1.5 : 1);
    ell(c, 0, 33, 30, 7, 'rgba(0,0,0,.22)');
    // chân tăm tre
    c.strokeStyle = '#c8a26a'; c.lineWidth = 2.5;
    [-16, -6, 8, 18].forEach((x) => { c.beginPath(); c.moveTo(x, 12); c.lineTo(x + (x < 0 ? -2 : 2), 32); c.stroke(); });
    c.save(); c.translate(0, bob);
    // đuôi
    c.save(); c.translate(-26, 0); c.rotate(-0.8 + Math.sin(t * 6) * 0.3);
    ell(c, 0, -8, 4, 10, '#f3e28a', '#a38a2a', 1.5); c.restore();
    // thân: các múi bưởi
    const segs = [[-18, 2], [-9, 0], [0, -1], [9, 0]];
    segs.forEach(([x, y], i) => {
      const g = c.createLinearGradient(x, y - 14, x, y + 14);
      g.addColorStop(0, '#fff7c2'); g.addColorStop(0.5, '#f7de7a'); g.addColorStop(1, '#d9b441');
      c.save(); c.translate(x, y + (chewing ? Math.sin(t * 10 + i) * 1.2 : 0));
      c.beginPath(); c.ellipse(0, 0, 8, 15, 0, 0, Math.PI * 2);
      c.fillStyle = g; c.fill(); c.strokeStyle = '#b8942b'; c.lineWidth = 1.3; c.stroke();
      c.strokeStyle = 'rgba(184,148,43,.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 12); c.stroke();
      c.restore();
    });
    // cổ vỏ xanh
    ell(c, 16, -6, 8, 12, '#8bc34a', '#4b7a1a', 1.5);
    // đầu (vỏ bưởi xanh)
    const hx = 26, hy = -18;
    c.save(); c.translate(hx, hy);
    if (chewing) c.scale(1.08, 1.04);
    const hg = c.createRadialGradient(-4, -6, 2, 0, 0, 20);
    hg.addColorStop(0, '#c5e1a5'); hg.addColorStop(0.6, '#8bc34a'); hg.addColorStop(1, '#558b2f');
    ell(c, 0, 0, 17, 15, hg, '#33691e', 2);
    // tai múi bưởi
    c.save(); c.translate(-8, -12); c.rotate(-0.6); ell(c, 0, -5, 4.5, 8, '#f7de7a', '#b8942b', 1.2); c.restore();
    c.save(); c.translate(3, -14); c.rotate(-0.2); ell(c, 0, -5, 4.5, 8, '#f7de7a', '#b8942b', 1.2); c.restore();
    // mắt đinh hương
    ell(c, 2, -4, 3, 3.4, '#2b1b0e'); ell(c, 3, -5, 1, 1, '#fff');
    // miệng
    if (biting) {
      c.fillStyle = '#6d1b1b';
      c.beginPath(); c.moveTo(8, 0); c.lineTo(26, -12); c.lineTo(26, 14); c.closePath(); c.fill();
      c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(12 + i * 5, -3 - i * 2); c.lineTo(15 + i * 5, 1 - i * 2); c.lineTo(17 + i * 5, -5 - i * 2); c.fill(); }
    } else if (chewing) {
      ell(c, 14, 4, 6, 3 + Math.abs(Math.sin(t * 10)) * 2, '#6d1b1b');
      ell(c, 8, 7, 5, 4, 'rgba(160,210,110,.8)');
    } else {
      ell(c, 16, 2, 3, 2, '#3e2723');
      c.strokeStyle = '#3e2723'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(11, 6, 4, 0.2, Math.PI - 0.6); c.stroke();
    }
    c.restore();
    c.restore();
    if (chewing) text(c, 'nhồm nhoàm', 10, -46 + Math.sin(t * 4) * 2, 10, '#fff', 'center', '#3e2723');
  }

  function drawLoNuong(c, t, p) {
    ell(c, 0, 33, 32, 7, 'rgba(0,0,0,.22)');
    // ống khói + khói
    rrect(c, 8, -44, 10, 18, 2, '#8d4a2b', '#3e1a0a', 1.5);
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3) % 1);
      ell(c, 13 + Math.sin(k * 6 + i) * 4, -48 - k * 26, 4 + k * 5, 4 + k * 5, `rgba(220,220,220,${0.5 * (1 - k)})`);
    }
    // vòm gạch
    const dome = c.createRadialGradient(-6, -18, 4, 0, 0, 40);
    dome.addColorStop(0, '#e08a5c'); dome.addColorStop(0.7, '#b85a32'); dome.addColorStop(1, '#7a3218');
    c.beginPath(); c.moveTo(-32, 30); c.lineTo(-32, 4); c.quadraticCurveTo(-32, -34, 0, -34); c.quadraticCurveTo(32, -34, 32, 4); c.lineTo(32, 30); c.closePath();
    c.fillStyle = dome; c.fill(); c.strokeStyle = '#3e1a0a'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(62,26,10,.45)'; c.lineWidth = 1.2;
    for (let y = -24; y < 28; y += 9) {
      c.beginPath(); c.moveTo(-31, y); c.lineTo(31, y); c.stroke();
      for (let x = -28 + ((y / 9) % 2 ? 0 : 8); x < 30; x += 16) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); }
    }
    // miệng lò lửa
    const fl = 0.8 + Math.sin(t * 12) * 0.1 + Math.sin(t * 7) * 0.1;
    ell(c, 0, 12, 30 * fl, 24 * fl, 'rgba(255,140,40,.25)');
    c.beginPath(); c.moveTo(-16, 30); c.lineTo(-16, 12); c.quadraticCurveTo(-16, -4, 0, -4); c.quadraticCurveTo(16, -4, 16, 12); c.lineTo(16, 30); c.closePath();
    const fire = c.createLinearGradient(0, -4, 0, 30);
    fire.addColorStop(0, '#fff176'); fire.addColorStop(0.5, '#ff9800'); fire.addColorStop(1, '#d84315');
    c.fillStyle = '#2b0d02'; c.fill();
    c.save(); c.clip();
    for (let i = -2; i <= 2; i++) {
      const h = 16 + Math.sin(t * 10 + i * 2) * 5;
      c.beginPath(); c.moveTo(i * 7 - 6, 30); c.quadraticCurveTo(i * 7, 30 - h * 1.6, i * 7 + 6, 30); c.fillStyle = fire; c.fill();
    }
    c.restore();
    // mắt trên vòm
    ell(c, -9, -18, 4, 4.5, '#fff', '#3e1a0a', 1.2); ell(c, 9, -18, 4, 4.5, '#fff', '#3e1a0a', 1.2);
    ell(c, -8, -17, 2, 2.4, '#2b0d02'); ell(c, 10, -17, 2, 2.4, '#2b0d02');
    c.strokeStyle = '#3e1a0a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-14, -25); c.lineTo(-5, -24); c.moveTo(14, -25); c.lineTo(5, -24); c.stroke();
    // khay bánh
    drawMooncakeAt(c, -22, 26, 5); drawMooncakeAt(c, 24, 26, 5);
  }

  function drawThoBaDen(c, t, p) {
    const recoil = p && p.recoil > 0 ? p.recoil * 5 : 0;
    drawRabbit(c, t, {
      phase: 0.8,
      headDeco: (c2, hy) => { starPath(c2, 4, hy - 13, 5, 2.2); c2.fillStyle = '#ffd54f'; c2.fill(); },
    });
    [-0.45, 0, 0.45].forEach((a, i) => {
      c.save(); c.translate(10 - recoil, 2 + (i - 1) * 3); c.rotate(a);
      const col = ['#e53935', '#fb8c00', '#8e24aa'][i];
      rrect(c, 0, -7, 26, 14, 6, col, '#4a0a05', 1.8);
      rrect(c, 23, -8, 6, 16, 2, '#ffca28', '#4a0a05', 1.5);
      c.strokeStyle = '#ffca28'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(9, -7); c.lineTo(9, 7); c.moveTo(16, -7); c.lineTo(16, 7); c.stroke();
      c.restore();
    });
    ell(c, 12 - recoil, 10, 5, 4, '#fff', '#8a8aa0', 1.5);
  }

  const PLANT_DRAW = {
    tho_ngoc: drawThoNgoc,
    tho_ban: (c, t, p) => drawShooterRabbit(c, t, p, false),
    tho_bang: (c, t, p) => drawShooterRabbit(c, t, p, true),
    banh_nuong: drawBanhNuong,
    banh_deo: drawBanhDeo,
    den_ong_sao: drawStarLantern,
    ky_lan: drawUnicorn,
    trong_lan: drawTrongLan,
    hat_de_gai: drawHatDeGai,
    cho_buoi: drawChoBuoi,
    lo_nuong: drawLoNuong,
    tho_ba_den: drawThoBaDen,
  };
  // tỉ lệ + dịch chuyển khi vẽ trong thẻ (vừa khung 54x56)
  const ICON_FIT = {
    ky_lan: [0.52, -4, 18], banh_nuong: [0.58, 0, 0], cho_buoi: [0.56, -6, 6],
    lo_nuong: [0.56, 0, 4], hat_de_gai: [0.62, 0, -10], trong_lan: [0.6, 0, 6],
  };
  function drawPlantIcon(c, id, t) {
    const f = ICON_FIT[id] || [0.62, 0, 0];
    c.scale(f[0], f[0]);
    c.translate(f[1], f[2]);
    PLANT_DRAW[id](c, t, null);
  }

  // =========================================================== ZOMBIE & QUÁI VẬT
  // Gốc toạ độ: chân chạm đất, mặt quay sang trái.
  function zPalette(z) {
    let P;
    if (z.flash > 0) P = { skin: '#e9f6d4', shade: '#bcd39c', hi: '#ffffff', dark: '#5b7440' };
    else if (z.slow > 0) P = { skin: '#aecde8', shade: '#7fa3c4', hi: '#dcecf8', dark: '#35546f' };
    else P = { skin: '#a9c485', shade: '#7c9a5a', hi: '#d3e6b4', dark: '#34471f' };
    const blue = z.slow > 0;
    P.coat = blue ? '#5b6b82' : '#735e40';
    P.coatDark = blue ? '#3f4c60' : '#4a3a26';
    P.pants = blue ? '#465872' : '#4c4a66';
    P.pantsDark = blue ? '#33415a' : '#34334a';
    if (z.type === 'mua_lan') { P.pants = '#f9a825'; P.pantsDark = '#c17900'; P.coat = '#d32f2f'; P.coatDark = '#8e1b1b'; }
    if (z.type === 'nhoc') { P.coat = '#c62828'; P.coatDark = '#7f1414'; P.pants = '#1e3a5f'; P.pantsDark = '#132640'; }
    if (z.type === 'co') { P.coat = blue ? '#55708a' : '#5d4a74'; P.coatDark = blue ? '#3a4f63' : '#3d2f52'; }
    return P;
  }

  function drawZHead(c, z, P, t, opts = {}) {
    const eating = z.eating && !opts.detached;
    const jaw = eating ? 3 + Math.abs(Math.sin(t * 14)) * 6 : 2 + Math.sin((z.anim || 0) * 2) * 1;
    // cổ
    if (!opts.detached) rrect(c, -5, -6, 10, 10, 3, P.shade, P.dark, 1.5);
    // đầu
    const g = c.createRadialGradient(-12, -30, 3, -6, -20, 22);
    g.addColorStop(0, P.hi); g.addColorStop(0.55, P.skin); g.addColorStop(1, P.shade);
    c.beginPath(); c.ellipse(-6, -21, 16.5, 18.5, -0.12, 0, Math.PI * 2);
    c.fillStyle = g; c.fill(); c.strokeStyle = P.dark; c.lineWidth = 2; c.stroke();
    // tai
    ell(c, 9, -19, 3.5, 5.5, P.shade, P.dark, 1.5);
    ell(c, 9.5, -19, 1.5, 3, P.dark);
    // tóc lơ thơ
    c.strokeStyle = '#2a2a1a'; c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-2, -38); c.quadraticCurveTo(-4, -46, 2, -48);
    c.moveTo(4, -37); c.quadraticCurveTo(8, -44, 5, -48);
    c.moveTo(-8, -39); c.quadraticCurveTo(-12, -44, -9, -47);
    c.stroke();
    // vết khâu
    c.strokeStyle = P.dark; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-2, -33); c.lineTo(6, -28);
    for (let i = 0; i < 3; i++) { const x = -1 + i * 3, y = -32 + i * 1.8; c.moveTo(x - 1.5, y - 2); c.lineTo(x + 1.5, y + 2); }
    c.stroke();
    // lông mày
    c.strokeStyle = '#2a2a1a'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-20, -32); c.quadraticCurveTo(-13, -35, -6, -31); c.moveTo(-4, -32); c.lineTo(3, -33); c.stroke();
    // mắt: một to một nhỏ
    const eye = (x, y, rx, ry, px) => {
      ell(c, x, y, rx + 1.5, ry + 1.5, 'rgba(90,40,40,.35)');
      ell(c, x, y, rx, ry, '#f7f3d6', P.dark, 1.2);
      c.strokeStyle = 'rgba(200,60,60,.5)'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x + rx - 1, y); c.lineTo(x + rx - 3.5, y - 1.5); c.stroke();
      ell(c, x + px, y + 0.5, 1.8, 1.8, '#161616');
      // mí mắt sụp
      c.beginPath(); c.ellipse(x, y, rx + 0.5, ry + 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
      c.lineTo(x, y - ry * 0.35); c.closePath();
      c.fillStyle = P.shade; c.fill();
    };
    eye(-13, -24, 6.2, 6.8, -2.2);
    eye(-1, -25, 4.6, 5, -1.6);
    // mũi
    c.beginPath(); c.moveTo(-18, -20); c.quadraticCurveTo(-24, -15, -19, -13); c.strokeStyle = P.dark; c.lineWidth = 1.5; c.stroke();
    // miệng + hàm dưới
    c.fillStyle = '#3b0f12';
    c.beginPath(); c.moveTo(-21, -9); c.quadraticCurveTo(-12, -11, -3, -9); c.lineTo(-4, -8 + jaw); c.quadraticCurveTo(-12, -6 + jaw, -20, -8 + jaw); c.closePath(); c.fill();
    c.fillStyle = '#f2ecd0';
    c.fillRect(-18, -9.5, 3, 3); c.fillRect(-11, -9.8, 3, 3.5); c.fillRect(-7, -9.5, 2.5, 2.5);
    c.beginPath(); c.moveTo(-21, -8 + jaw); c.quadraticCurveTo(-12, -5 + jaw, -3, -8 + jaw); c.quadraticCurveTo(-8, -1 + jaw, -16, -2 + jaw); c.closePath();
    c.fillStyle = P.shade; c.fill(); c.strokeStyle = P.dark; c.lineWidth = 1.5; c.stroke();
    if (opts.hat) opts.hat(c);
  }

  function drawNonLa(c, z, detached) {
    const dent = !detached && z.armor < z.maxArmor * 0.5;
    c.save(); c.translate(-6, -36); c.rotate(-0.12);
    const g = c.createLinearGradient(-28, 0, 28, 0);
    g.addColorStop(0, '#fff3c4'); g.addColorStop(0.5, dent ? '#d8c07e' : '#f0dc9c'); g.addColorStop(1, '#b89a52');
    c.beginPath(); c.moveTo(0, -30); c.lineTo(30, 4); c.quadraticCurveTo(0, 10, -30, 4); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = '#7a6128'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(122,97,40,.55)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = 4 - i * 6.8, w = 30 - i * 6;
      c.beginPath(); c.moveTo(-w, y + 1.5); c.quadraticCurveTo(0, y + 4, w, y + 1.5); c.stroke();
    }
    if (dent) {
      c.strokeStyle = '#4e3b10'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-8, -12); c.lineTo(0, -6); c.lineTo(-4, 1); c.moveTo(10, -8); c.lineTo(14, -2); c.stroke();
    }
    c.restore();
    if (!detached) {
      c.strokeStyle = '#8a6d2e'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-20, -32); c.quadraticCurveTo(-14, 2, 6, -30); c.stroke();
    }
  }

  function drawNoiDong(c, z, detached) {
    const dent = detached ? 0 : z.armor < z.maxArmor * 0.33 ? 2 : z.armor < z.maxArmor * 0.66 ? 1 : 0;
    c.save(); c.translate(-6, -38);
    const g = c.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, '#f0b27a'); g.addColorStop(0.35, '#c97b3c'); g.addColorStop(1, '#7a4418');
    rrect(c, -19, -20, 38, 24, 5, g, '#4a2508', 2);
    rrect(c, -22, 1, 44, 6, 3, '#9a5a24', '#4a2508', 2);
    rrect(c, -28, -13, 9, 5, 2, '#5a2f0e'); rrect(c, 19, -13, 9, 5, 2, '#5a2f0e');
    c.fillStyle = 'rgba(255,235,200,.55)'; c.fillRect(-13, -17, 4, 16);
    c.strokeStyle = 'rgba(74,37,8,.5)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-19, -12); c.lineTo(19, -12); c.stroke();
    if (dent >= 1) { c.strokeStyle = '#3a1c05'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(4, -20); c.lineTo(8, -12); c.lineTo(3, -6); c.stroke(); ell(c, 9, -8, 4, 3, 'rgba(58,28,5,.35)'); }
    if (dent >= 2) { c.beginPath(); c.moveTo(-14, -18); c.lineTo(-6, -11); c.lineTo(-10, -4); c.stroke(); ell(c, -8, -14, 5, 3, 'rgba(58,28,5,.35)'); }
    c.restore();
  }

  function drawMask(c) {
    // mặt nạ Tôn Ngộ Không đội lệch trên đầu
    c.save(); c.translate(0, -36); c.rotate(0.35);
    ell(c, 0, 0, 13, 11, '#fff8e1', '#5d1a00', 1.5);
    c.beginPath(); c.moveTo(-12, -2); c.quadraticCurveTo(0, -12, 12, -2); c.quadraticCurveTo(0, -6, -12, -2); c.fillStyle = '#e53935'; c.fill();
    ell(c, -5, 1, 3, 2.4, '#222'); ell(c, 5, 1, 3, 2.4, '#222');
    c.strokeStyle = '#ffb300'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.beginPath(); c.arc(0, 6, 4, 0.2, Math.PI - 0.2); c.strokeStyle = '#b71c1c'; c.stroke();
    c.restore();
  }

  function drawCarpLantern(c, t) {
    c.save();
    c.strokeStyle = '#5d4037'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 10); c.lineTo(-2, -100); c.lineTo(22, -100); c.stroke();
    const sw = Math.sin(t * 3) * 0.15;
    c.translate(22, -100); c.rotate(sw);
    c.strokeStyle = '#333'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 9); c.stroke();
    c.translate(0, 23);
    ell(c, 0, 0, 30, 21, 'rgba(255,170,60,.28)');
    const g = c.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, '#ffab40'); g.addColorStop(1, '#e64a19');
    ell(c, 0, 0, 20, 12, g, '#bf360c', 2);
    c.fillStyle = '#ffca28';
    c.beginPath(); c.moveTo(18, 0); c.lineTo(31, -11); c.quadraticCurveTo(27, 0, 30, 11); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-2, -11); c.lineTo(6, -18); c.lineTo(8, -10); c.fill();
    ell(c, -11, -3, 3.4, 3.4, '#fff'); ell(c, -12, -3, 1.6, 1.6, '#000');
    c.strokeStyle = '#ffe082'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(-2, 0, 5, -1, 1); c.arc(6, 0, 5, -1, 1); c.stroke();
    c.strokeStyle = '#ffca28'; c.beginPath(); c.moveTo(-18, 2); c.quadraticCurveTo(-24, 8, -22, 14); c.stroke();
    c.restore();
  }

  function drawLionHeadZ(c, z, t) {
    // đầu lân, gốc tại cổ
    c.save(); c.translate(-8, -26 + Math.sin((z.anim || 0) * 8) * 2);
    const cols = ['#ffeb3b', '#ff9800', '#f44336', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.35 + (i / 15) * Math.PI * 1.3;
      c.strokeStyle = cols[i % 4]; c.lineWidth = 4.5;
      c.beginPath();
      c.moveTo(Math.cos(a) * 20, Math.sin(a) * 18);
      c.lineTo(Math.cos(a) * 37 + Math.sin(t * 6 + i) * 2, Math.sin(a) * 33);
      c.stroke();
    }
    const g = c.createRadialGradient(-8, -8, 4, 0, 0, 30);
    g.addColorStop(0, '#ff7961'); g.addColorStop(0.6, '#e53935'); g.addColorStop(1, '#9a0007');
    ell(c, 0, 0, 28, 24, g, '#5a0000', 2.5);
    ell(c, 0, -12, 18, 10, '#ffd54f', '#b28900', 1.5);
    starPath(c, 0, -25, 7, 3); c.fillStyle = '#fff176'; c.fill(); c.strokeStyle = '#b28900'; c.lineWidth = 1; c.stroke();
    // mắt to chớp chớp
    const blink = Math.sin(t * 2.3) > 0.94;
    [[-12, -2], [6, -2]].forEach(([x, y]) => {
      ell(c, x, y, 8, blink ? 1.5 : 7, '#fff', '#222', 1.5);
      if (!blink) { ell(c, x - 2, y + 1, 3.6, 3.6, '#111'); ell(c, x - 3, y, 1.2, 1.2, '#fff'); }
      c.strokeStyle = '#1b1b1b'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 8, y - 11); c.stroke();
    });
    ell(c, -4, 8, 9, 6, '#ffca28', '#b28900', 1.5);
    const mo = z.eating ? Math.abs(Math.sin(t * 12)) * 6 : 1;
    rrect(c, -21, 13, 28, 6 + mo, 4, '#5a0000', '#5a0000', 1);
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) c.fillRect(-19 + i * 6, 13, 4, 3);
    c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-18, 22 + mo); c.lineTo(-24, 36 + mo); c.moveTo(-10, 22 + mo); c.lineTo(-12, 38 + mo); c.stroke();
    c.restore();
  }

  function drawZombieHumanoid(c, z, t, P) {
    const walking = !z.eating && !z.smashing && !z.dying;
    const walk = walking ? Math.sin(z.anim * 5) : 0;
    const bob = walking ? -Math.abs(Math.sin(z.anim * 5)) * 2 : 0;
    ell(c, 0, 2, 26, 7, 'rgba(0,0,0,.28)');
    // chân
    const leg = (dx, ang, col, patch) => {
      c.save(); c.translate(dx, -38 + bob); c.rotate(ang);
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(5, 33); c.lineTo(-5, 33); c.closePath();
      c.fillStyle = col; c.fill(); c.strokeStyle = '#1d1a24'; c.lineWidth = 1.6; c.stroke();
      if (patch) { rrect(c, -4, 12, 7, 7, 1, '#8d8aa8', '#1d1a24', 1); c.strokeStyle = '#1d1a24'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-3, 15); c.lineTo(2, 15); c.stroke(); }
      // giày
      c.beginPath(); c.moveTo(-13, 34); c.quadraticCurveTo(-14, 28, -5, 29); c.lineTo(6, 30); c.lineTo(6, 38); c.lineTo(-12, 38); c.closePath();
      c.fillStyle = '#3b2b1d'; c.fill(); c.strokeStyle = '#140d07'; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#6d5438'; c.fillRect(-12, 36, 18, 2);
      c.restore();
    };
    leg(4, walk * 0.35, P.pantsDark, false);
    if (z.type === 'co') {
      c.save(); c.translate(12, -40 + bob); drawCarpLantern(c, t); c.restore();
    }
    // tay sau
    const armSwing = z.eating ? Math.sin(t * 14) * 0.35 : Math.sin(z.anim * 5 + 1) * 0.1;
    c.save(); c.translate(-2, -74 + bob); c.rotate(Math.PI - 0.2 - armSwing);
    rrect(c, 0, -4, 22, 9, 4, P.coatDark, '#1d1a24', 1.4);
    rrect(c, 20, -3.5, 12, 7, 3, P.shade, P.dark, 1.2);
    ell(c, 34, 0, 5, 4.5, P.shade, P.dark, 1.2);
    c.restore();
    leg(-4, -walk * 0.35, P.pants, true);
    // thân
    c.save();
    c.translate(0, -38 + bob);
    c.rotate(-0.08 + (z.eating ? Math.sin(t * 12) * 0.05 : 0));
    const coatG = c.createLinearGradient(-16, 0, 16, 0);
    coatG.addColorStop(0, P.coat); coatG.addColorStop(1, P.coatDark);
    c.beginPath();
    c.moveTo(-15, -46); c.lineTo(15, -46); c.lineTo(17, -4);
    for (let i = 0; i <= 6; i++) c.lineTo(17 - i * 5.6, i % 2 ? 3 : -2);
    c.closePath();
    c.fillStyle = coatG; c.fill(); c.strokeStyle = '#1d1a24'; c.lineWidth = 2; c.stroke();
    if (z.type === 'nhoc') {
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3;
      for (let y = -38; y < 0; y += 9) { c.beginPath(); c.moveTo(-15, y); c.lineTo(16, y); c.stroke(); }
    } else if (z.type === 'mua_lan') {
      c.fillStyle = '#ffd54f';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-15 + i * 7, -2); c.lineTo(-11 + i * 7, 8); c.lineTo(-7 + i * 7, -2); c.fill(); }
    } else {
      c.fillStyle = '#ece6d2';
      c.beginPath(); c.moveTo(-9, -46); c.lineTo(0, -24); c.lineTo(9, -46); c.fill();
      c.fillStyle = P.coatDark;
      c.beginPath(); c.moveTo(-9, -46); c.lineTo(-3, -30); c.lineTo(-12, -40); c.fill();
      c.beginPath(); c.moveTo(9, -46); c.lineTo(3, -30); c.lineTo(12, -40); c.fill();
      c.fillStyle = '#b3261e';
      c.beginPath(); c.moveTo(-2.5, -45); c.lineTo(2.5, -45); c.lineTo(1.5, -41); c.lineTo(-1.5, -41); c.fill();
      c.beginPath(); c.moveTo(-1.5, -41); c.lineTo(1.5, -41); c.lineTo(3, -22); c.lineTo(0, -18); c.lineTo(-3, -22); c.closePath(); c.fill();
      c.strokeStyle = '#7a120c'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, -36); c.lineTo(2, -33); c.moveTo(-1.5, -30); c.lineTo(2.5, -27); c.stroke();
      ell(c, -5, -14, 1.6, 1.6, '#2a1d10'); ell(c, -5, -6, 1.6, 1.6, '#2a1d10');
      rrect(c, 5, -20, 8, 6, 1, P.coatDark, '#1d1a24', 1);
      ell(c, 11, -8, 3, 2.5, P.skin);
    }
    // tay trước
    c.save(); c.translate(-6, -40); c.rotate(Math.PI + 0.05 + armSwing * 0.8);
    if (z.armLost) {
      c.beginPath(); c.moveTo(0, -5); c.lineTo(13, -5); c.lineTo(10, -1); c.lineTo(14, 2); c.lineTo(11, 5); c.lineTo(0, 5); c.closePath();
      c.fillStyle = P.coat; c.fill(); c.strokeStyle = '#1d1a24'; c.lineWidth = 1.4; c.stroke();
      rrect(c, 11, -1.5, 6, 3, 1.5, '#eee8d5', '#8a8470', 0.8);
    } else {
      rrect(c, 0, -5, 22, 10, 4, P.coat, '#1d1a24', 1.4);
      c.strokeStyle = '#1d1a24'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(20, -5); c.lineTo(18, 0); c.lineTo(21, 5); c.stroke();
      rrect(c, 20, -3.5, 13, 7, 3, P.skin, P.dark, 1.2);
      ell(c, 35, 0, 5.5, 5, P.skin, P.dark, 1.2);
      c.strokeStyle = P.dark; c.lineWidth = 1;
      c.beginPath(); c.moveTo(38, -3); c.lineTo(42, -4); c.moveTo(39, 0); c.lineTo(43, 0); c.moveTo(38, 3); c.lineTo(42, 4); c.stroke();
    }
    c.restore();
    // đầu
    if (!z.headless) {
      const hb = z.eating ? Math.sin(t * 14) * 2 : Math.sin(z.anim * 5) * 1;
      c.save(); c.translate(-3, -46 + hb);
      if (z.type === 'mua_lan') {
        drawZHead(c, z, P, t);
        drawLionHeadZ(c, z, t);
      } else {
        drawZHead(c, z, P, t, {
          hat: (c2) => {
            if (z.type === 'non_la' && z.armor > 0) drawNonLa(c2, z, false);
            if (z.type === 'noi_dong' && z.armor > 0) drawNoiDong(c2, z, false);
            if (z.type === 'nhoc') drawMask(c2);
          },
        });
      }
      c.restore();
    } else {
      rrect(c, -8, -50, 10, 6, 3, '#7a1c1c', '#3a0a0a', 1);
    }
    c.restore();
    if (z.type === 'mua_lan' && !z.headless) {
      // vải thân lân phấp phới phía sau
      c.save();
      const wave = Math.sin(t * 5) * 4;
      const g = c.createLinearGradient(0, -110, 40, -40);
      g.addColorStop(0, '#e53935'); g.addColorStop(1, '#ff8f00');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -104); c.quadraticCurveTo(44 + wave, -92, 38, -38); c.lineTo(20, -38); c.quadraticCurveTo(24, -80, 4, -84);
      c.closePath(); c.fill();
      c.strokeStyle = '#ffd54f'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(38, -38); c.lineTo(20, -38); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(22 + i * 5, -70 + i * 10, 5, 0, Math.PI); c.stroke(); }
      c.restore();
    }
  }

  function drawThienCau(c, z, t, P) {
    const run = z.eating ? 0 : z.anim * 9;
    const tint = z.flash > 0 ? 'flash' : z.slow > 0 ? 'slow' : '';
    const body0 = tint === 'flash' ? '#8f86c9' : tint === 'slow' ? '#3c5c8f' : '#3a2f6b';
    const body1 = tint === 'flash' ? '#6b62a8' : tint === 'slow' ? '#243e66' : '#1d163d';
    const maneA = tint === 'slow' ? '#4fc3f7' : '#e040fb';
    const maneB = tint === 'slow' ? '#1e5d8c' : '#6a1b9a';
    ell(c, 0, 2, 60, 9, 'rgba(0,0,0,.3)');
    // mây dưới chân
    c.save(); c.globalAlpha = 0.55;
    for (let i = 0; i < 5; i++) ell(c, -44 + i * 22 + Math.sin(t * 2 + i) * 3, -2, 14, 6, '#e8eaf6');
    c.restore();
    // đuôi lửa
    c.save(); c.translate(42, -58);
    const tg = c.createLinearGradient(0, 0, 40, -40);
    tg.addColorStop(0, maneB); tg.addColorStop(0.6, maneA); tg.addColorStop(1, '#ffb74d');
    c.fillStyle = tg;
    c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(30, 4 + Math.sin(t * 8) * 4, 40, -34 + Math.sin(t * 6) * 5);
    c.quadraticCurveTo(22, -8, 0, -8); c.closePath(); c.fill();
    c.restore();
    const legDraw = (x, ang, col) => {
      c.save(); c.translate(x, -40); c.rotate(ang);
      rrect(c, -7, 0, 14, 34, 6, col, '#0d0920', 1.5);
      ell(c, -3, 36, 10, 5, col, '#0d0920', 1.5);
      c.strokeStyle = '#e0e0e0'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-11, 37); c.lineTo(-14, 40); c.moveTo(-7, 39); c.lineTo(-9, 42); c.stroke();
      c.restore();
    };
    legDraw(30, Math.sin(run) * 0.5, body1);
    legDraw(-24, Math.sin(run + Math.PI) * 0.5, body1);
    // thân
    const bg = c.createRadialGradient(0, -62, 6, 5, -50, 48);
    bg.addColorStop(0, body0); bg.addColorStop(1, body1);
    ell(c, 5, -52 + Math.sin(run) * 1.5, 46, 24, bg, '#0d0920', 2.5);
    ell(c, 0, -40, 32, 9, 'rgba(160,140,220,.35)');
    // hoa văn mây vàng
    c.strokeStyle = 'rgba(255,213,79,.8)'; c.lineWidth = 2;
    [[14, -58], [28, -48], [-2, -46]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 5, Math.PI * 0.2, Math.PI * 1.6); c.stroke(); c.beginPath(); c.arc(x + 6, y + 1, 3, Math.PI, Math.PI * 2.2); c.stroke(); });
    legDraw(22, Math.sin(run + 0.6) * 0.5, body0);
    legDraw(-32, Math.sin(run + Math.PI + 0.6) * 0.5, body0);
    // bờm
    c.save(); c.translate(-30, -66);
    const mg = c.createRadialGradient(0, 0, 4, 0, 0, 34);
    mg.addColorStop(0, maneA); mg.addColorStop(1, maneB);
    c.fillStyle = mg;
    c.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI * 0.9 + (i / 14) * Math.PI * 1.7;
      const r = i % 2 ? 22 : 34 + Math.sin(t * 7 + i) * 3;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath(); c.fill(); c.strokeStyle = '#2a0a3a'; c.lineWidth = 1.5; c.stroke();
    c.restore();
    // đầu
    const hb = z.eating ? Math.sin(t * 12) * 4 : Math.sin(run) * 2;
    c.save(); c.translate(-48, -68 + hb);
    // tai nhọn
    c.fillStyle = body1;
    c.beginPath(); c.moveTo(6, -14); c.lineTo(14, -34); c.lineTo(18, -10); c.fill();
    c.beginPath(); c.moveTo(-2, -16); c.lineTo(2, -34); c.lineTo(10, -14); c.fill();
    const hg = c.createRadialGradient(-4, -8, 3, 0, 0, 26);
    hg.addColorStop(0, body0); hg.addColorStop(1, body1);
    ell(c, 0, 0, 23, 19, hg, '#0d0920', 2);
    // mõm trên
    ell(c, -24, 4, 17, 9, hg, '#0d0920', 2);
    ell(c, -39, 1, 4.5, 3.5, '#050308');
    // hàm dưới
    const open = z.eating ? 0.25 + Math.abs(Math.sin(t * 12)) * 0.35 : 0.12;
    c.save(); c.translate(-8, 10); c.rotate(-open);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, 0); c.quadraticCurveTo(-30, 9, -18, 10); c.lineTo(0, 7); c.closePath();
    c.fillStyle = body1; c.fill(); c.strokeStyle = '#0d0920'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-26 + i * 7, 0); c.lineTo(-23 + i * 7, -6); c.lineTo(-20 + i * 7, 0); c.fill(); }
    c.restore();
    c.fillStyle = '#5a0a1a';
    c.beginPath(); c.moveTo(-8, 10); c.lineTo(-36, 11); c.lineTo(-36, 13); c.lineTo(-8, 14); c.fill();
    c.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-34 + i * 7, 11); c.lineTo(-31 + i * 7, 18); c.lineTo(-28 + i * 7, 11); c.fill(); }
    // mắt rực lửa
    ell(c, -6, -6, 12, 10, 'rgba(255,60,60,.35)');
    const eg = c.createRadialGradient(-6, -6, 1, -6, -6, 7);
    eg.addColorStop(0, '#fff59d'); eg.addColorStop(0.5, '#ffb300'); eg.addColorStop(1, '#d50000');
    ell(c, -6, -6, 7, 5.5, eg, '#2a0000', 1.2);
    ell(c, -7, -6, 1.3, 4.2, '#140000');
    c.strokeStyle = '#0d0920'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-16, -13); c.lineTo(2, -12); c.stroke();
    c.restore();
    // vòng cổ vàng + chuông
    c.save(); c.translate(-26, -52);
    c.rotate(0.9);
    rrect(c, -16, -4, 32, 8, 4, '#ffca28', '#8a6000', 1.5);
    c.restore();
    ell(c, -34, -42, 5, 5, '#ffd54f', '#8a6000', 1.5);
    ell(c, -34, -40, 1.5, 1.5, '#5d4037');
    c.strokeStyle = '#e53935'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-30, -44); c.lineTo(-26, -32); c.moveTo(-29, -44); c.lineTo(-22, -34); c.stroke();
  }

  // Ông Địa (Gargantuar): bụng bự, mặt nạ cười, quạt mo
  function drawOngDiaZ(c, z, t, P) {
    const walk = z.smashing ? 0 : Math.sin(z.anim * 3);
    ell(c, 0, 2, 46, 10, 'rgba(0,0,0,.3)');
    const leg = (dx, ang) => {
      c.save(); c.translate(dx, -40); c.rotate(ang);
      rrect(c, -8, 0, 16, 40, 5, '#8d6e63', '#3e2723', 2);
      ell(c, -3, 40, 12, 6, P.skin, P.dark, 1.5);
      c.restore();
    };
    leg(10, walk * 0.25); leg(-10, -walk * 0.25);
    const shirt = c.createLinearGradient(-38, -120, 38, -40);
    shirt.addColorStop(0, '#fff176'); shirt.addColorStop(1, '#f9a825');
    ell(c, 0, -80, 38, 44, shirt, '#8a6d00', 2.5);
    const belly = c.createRadialGradient(-14, -70, 4, -4, -62, 32);
    belly.addColorStop(0, P.hi); belly.addColorStop(0.6, P.skin); belly.addColorStop(1, P.shade);
    ell(c, -4, -62, 30, 26, belly, P.dark, 2);
    ell(c, -8, -60, 3, 3, P.dark);
    c.strokeStyle = '#8a6d00'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-30, -110); c.lineTo(-34, -40); c.moveTo(22, -110); c.lineTo(28, -40); c.stroke();
    // tràng hạt
    for (let i = 0; i < 9; i++) ell(c, -22 + i * 5, -112 + Math.sin(i / 8 * Math.PI) * 12, 3, 3, '#6d4c41', '#3e2723', 1);
    let armA = -0.3;
    if (z.smashing) {
      const s = z.smashT;
      armA = s < 0.8 ? -0.3 - (s / 0.8) * 2.2 : -2.5 + Math.min(1, (s - 0.8) / 0.12) * 3.2;
    } else armA += Math.sin(z.anim * 3) * 0.15;
    c.save(); c.translate(10, -108); c.rotate(armA);
    rrect(c, 0, -7, 40, 14, 6, P.skin, P.dark, 2);
    c.translate(44, 0);
    if (z.throwing && z.smashT < 0.9) {
      // cầm Zombie Nhóc chuẩn bị ném
      c.save(); c.translate(10, -10); c.rotate(-armA); c.scale(0.5, 0.5);
      drawZHead(c, { eating: false, anim: z.anim }, P, t, { detached: true, hat: drawMask });
      c.restore();
    } else {
      const fan = c.createLinearGradient(0, -26, 40, 26);
      fan.addColorStop(0, '#ecd29b'); fan.addColorStop(1, '#b8904f');
      c.fillStyle = fan;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(34, -26); c.quadraticCurveTo(52, 0, 34, 26); c.closePath(); c.fill();
      c.strokeStyle = '#7a5a26'; c.lineWidth = 2; c.stroke();
      c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(4, 0); c.lineTo(40, i * 10); } c.stroke();
    }
    c.restore();
    c.save(); c.translate(-26, -104); c.rotate(Math.PI - 0.4 + Math.sin(z.anim * 3) * 0.1);
    rrect(c, 0, -7, 34, 14, 6, P.skin, P.dark, 2);
    c.restore();
    // mặt nạ Ông Địa
    c.save(); c.translate(-6, -142);
    const mask = c.createRadialGradient(-8, -10, 4, 0, 0, 32);
    mask.addColorStop(0, '#ffe7dc'); mask.addColorStop(1, '#f4a98c');
    ell(c, 0, 0, 30, 28, mask, '#8d4a3a', 2.5);
    c.strokeStyle = '#3e2723'; c.lineWidth = 3;
    c.beginPath(); c.arc(-12, -4, 7, Math.PI + 0.3, -0.3); c.arc(12, -4, 7, Math.PI + 0.3, -0.3); c.stroke();
    ell(c, -20, 8, 6, 4, 'rgba(244,67,54,.5)'); ell(c, 20, 8, 6, 4, 'rgba(244,67,54,.5)');
    c.beginPath(); c.arc(0, 6, 15, 0.15, Math.PI - 0.15); c.closePath();
    c.fillStyle = '#5a0f0f'; c.fill();
    c.fillStyle = '#fff'; c.fillRect(-8, 7, 5, 4); c.fillRect(2, 7, 5, 4);
    ell(c, 24, 18, 8, 6, P.skin);
    c.strokeStyle = '#212121'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-4, -27); c.quadraticCurveTo(0, -40, 8, -30); c.stroke();
    c.restore();
  }

  function drawZombie(c, z, t) {
    if (z.eaten) return;
    c.save();
    c.translate(z.x, rowCY(z.row) + 38 - (z.jumpY || 0));
    if (z.dying) {
      const k = clamp(z.dieT / 0.8, 0, 1);
      c.globalAlpha = 1 - clamp((z.dieT - 0.8) / 0.6, 0, 1);
      c.rotate(k * (z.type === 'thien_cau' ? 0.5 : 1.4));
    }
    if (z.burnt) {
      c.globalAlpha *= 0.9;
      const s = z.type === 'ong_dia' ? 1.3 : z.type === 'nhoc' ? 0.7 : 1;
      c.scale(s, s);
      if (z.type === 'thien_cau') {
        ell(c, 5, -52, 46, 24, '#141414'); ell(c, -48, -68, 23, 19, '#141414');
        ell(c, -54, -74, 3, 3, '#fff');
      } else {
        rrect(c, -14, -80, 28, 80, 8, '#1b1b1b');
        ell(c, -6, -94, 16, 17, '#1b1b1b');
        ell(c, -11, -96, 3, 3, '#fff'); ell(c, -1, -97, 3, 3, '#fff');
      }
      c.restore();
      return;
    }
    const P = zPalette(z);
    if (z.type === 'ong_dia') { c.scale(0.95, 0.95); drawOngDiaZ(c, z, t, P); }
    else if (z.type === 'thien_cau') drawThienCau(c, z, t, P);
    else {
      if (z.type === 'nhoc') c.scale(0.7, 0.7);
      drawZombieHumanoid(c, z, t, P);
    }
    c.restore();
  }

  // ----------------------------------------------------- ông chủ Phương
  function drawPhuong(c, t, mood) {
    const scared = mood === 'scared' || mood === 'panic';
    const shake = mood === 'panic' ? Math.sin(t * 40) * 1.5 : scared ? Math.sin(t * 25) * 0.8 : 0;
    c.save(); c.translate(shake, 0);
    ell(c, 0, 2, 20, 5, 'rgba(0,0,0,.25)');
    // chân
    rrect(c, -9, -34, 8, 34, 3, '#37474f', '#1c262b', 1.5);
    rrect(c, 1, -34, 8, 34, 3, '#455a64', '#1c262b', 1.5);
    rrect(c, -12, -3, 12, 5, 2, '#3e2723'); rrect(c, 0, -3, 12, 5, 2, '#3e2723');
    // áo sơ mi xanh
    const shirt = c.createLinearGradient(-16, -70, 16, -30);
    shirt.addColorStop(0, '#64b5f6'); shirt.addColorStop(1, '#1e88e5');
    rrect(c, -15, -70, 30, 40, 8, shirt, '#0d47a1', 2);
    c.fillStyle = '#e3f2fd';
    c.beginPath(); c.moveTo(-6, -70); c.lineTo(0, -62); c.lineTo(6, -70); c.fill();
    ell(c, 0, -56, 1.3, 1.3, '#0d47a1'); ell(c, 0, -48, 1.3, 1.3, '#0d47a1'); ell(c, 0, -40, 1.3, 1.3, '#0d47a1');
    // tay cầm đèn ông sao
    const wave = scared ? Math.sin(t * 20) * 0.3 : Math.sin(t * 2) * 0.15;
    c.save(); c.translate(12, -64); c.rotate(-0.5 + wave);
    rrect(c, -3, 0, 7, 22, 3, '#1e88e5', '#0d47a1', 1.2);
    ell(c, 0.5, 24, 4, 4, '#ffcc9c', '#a0663a', 1);
    c.strokeStyle = '#8d6e63'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 24); c.lineTo(10, -8); c.stroke();
    c.save(); c.translate(10, -14); c.rotate(t * 0.8);
    ell(c, 0, 0, 12, 12, 'rgba(255,200,80,.3)');
    starPath(c, 0, 0, 9, 4); c.fillStyle = '#ff5252'; c.fill(); c.strokeStyle = '#ffd54f'; c.lineWidth = 1.5; c.stroke();
    c.restore();
    c.restore();
    c.save(); c.translate(-12, -64); c.rotate(scared ? -2.6 + Math.sin(t * 20) * 0.2 : 0.3);
    rrect(c, -3, 0, 7, 22, 3, '#1e88e5', '#0d47a1', 1.2);
    ell(c, 0.5, 24, 4, 4, '#ffcc9c', '#a0663a', 1);
    c.restore();
    // đầu
    c.save(); c.translate(0, -84);
    rrect(c, -4, 6, 8, 6, 2, '#ffcc9c');
    const face = c.createRadialGradient(-4, -4, 2, 0, 0, 16);
    face.addColorStop(0, '#ffe0c2'); face.addColorStop(1, '#f2b88a');
    ell(c, 0, 0, 13, 14, face, '#a0663a', 1.8);
    // tóc
    c.fillStyle = '#1f1b18';
    c.beginPath(); c.moveTo(-13, -2); c.quadraticCurveTo(-14, -16, 0, -16); c.quadraticCurveTo(13, -16, 13, -3);
    c.quadraticCurveTo(6, -10, -2, -8); c.quadraticCurveTo(-8, -7, -13, -2); c.fill();
    ell(c, -13, 1, 2.5, 4, '#f2b88a', '#a0663a', 1);
    ell(c, 13, 1, 2.5, 4, '#f2b88a', '#a0663a', 1);
    // mắt, miệng
    if (scared) {
      ell(c, -5, -1, 3, 3.6, '#fff', '#3e2723', 1); ell(c, 5, -1, 3, 3.6, '#fff', '#3e2723', 1);
      ell(c, -5, -1, 1.2, 1.2, '#1a1a1a'); ell(c, 5, -1, 1.2, 1.2, '#1a1a1a');
      ell(c, 0, 7, 3.5, mood === 'panic' ? 4 : 2.5, '#5a1010');
      ell(c, 12, -8, 1.8, 3, '#81d4fa');
    } else {
      c.strokeStyle = '#3e2723'; c.lineWidth = 1.8;
      c.beginPath(); c.arc(-5, 0, 2.5, Math.PI + 0.3, -0.3); c.arc(5, 0, 2.5, Math.PI + 0.3, -0.3); c.stroke();
      c.beginPath(); c.arc(0, 4, 5, 0.3, Math.PI - 0.3); c.stroke();
      ell(c, -8, 4, 2.5, 1.5, 'rgba(244,67,54,.35)'); ell(c, 8, 4, 2.5, 1.5, 'rgba(244,67,54,.35)');
    }
    c.restore();
    c.restore();
  }

  // ------------------------------------------------------------ bảo vật
  function drawItemIcon(c, id, t, s = 1) {
    c.save(); c.scale(s, s);
    if (id === 'banh_than') {
      ell(c, 0, 0, 20 + Math.sin(t * 4) * 2, 20 + Math.sin(t * 4) * 2, 'rgba(255,235,59,.35)');
      c.save(); c.scale(0.95, 0.95); drawMooncakeMini(c, 14); c.restore();
      starPath(c, 0, 0, 7, 3); c.fillStyle = '#fff59d'; c.fill();
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + i * 2.1;
        starPath(c, Math.cos(a) * 18, Math.sin(a) * 14, 3.5, 1.5); c.fillStyle = '#fffde7'; c.fill();
      }
    } else if (id === 'mua_sao') {
      for (let i = 0; i < 3; i++) {
        const x = -10 + i * 10, y = -10 + i * 8;
        const g = c.createLinearGradient(x + 12, y - 12, x, y);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, '#fff59d');
        c.strokeStyle = g; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x + 14, y - 14); c.lineTo(x, y); c.stroke();
        starPath(c, x, y, 6, 2.6); c.fillStyle = ['#ffeb3b', '#ff8a65', '#81d4fa'][i]; c.fill();
      }
    } else if (id === 'gio_hang') {
      c.strokeStyle = '#b3e5fc'; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.arc(-4 + i * 3, -6 + i * 7, 8 + i * 2, Math.PI * 0.9 + t, Math.PI * 2.2 + t); c.stroke();
      }
      c.lineCap = 'butt';
      c.beginPath(); c.arc(10, -10, 7, 0, Math.PI * 2); c.fillStyle = '#fff59d'; c.fill();
      c.beginPath(); c.arc(13, -12, 6, 0, Math.PI * 2); c.fillStyle = '#3949ab'; c.fill();
    } else if (id === 'tra_sen') {
      ell(c, 0, 4, 14, 10, '#fafafa', '#607d8b', 2);
      c.strokeStyle = '#607d8b'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(13, 2); c.quadraticCurveTo(22, 0, 20, -6); c.stroke();
      c.beginPath(); c.arc(-14, 4, 5, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
      rrect(c, -4, -9, 8, 4, 2, '#90a4ae');
      for (let i = 0; i < 5; i++) {
        c.save(); c.translate(0, 4); c.rotate(-0.9 + i * 0.45);
        ell(c, 0, -6, 2.5, 5, '#f48fb1', '#c2185b', 0.8); c.restore();
      }
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.8 + i * 0.5) % 1;
        ell(c, -3 + i * 6, -12 - k * 12, 2 + k * 2, 2 + k * 2, `rgba(255,255,255,${0.6 * (1 - k)})`);
      }
    }
    c.restore();
  }

  // --------------------------------------------------------- xe đèn (mower)
  function drawMower(c, m, t) {
    c.save();
    c.translate(m.x, rowCY(m.row) + 18);
    const spin = m.state === 'run' ? t * 20 : 0;
    ell(c, 0, 22, 30, 6, 'rgba(0,0,0,.25)');
    rrect(c, -26, -4, 52, 18, 5, '#8d6e63', '#3e2723', 2);
    [-15, 15].forEach((wx) => {
      c.save(); c.translate(wx, 16); c.rotate(spin);
      ell(c, 0, 0, 8, 8, '#4e342e', '#212121', 2);
      c.strokeStyle = '#bcaaa4'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.moveTo(0, -6); c.lineTo(0, 6); c.stroke();
      c.restore();
    });
    // đèn kéo quân trên xe
    const glow = 0.25 + 0.1 * Math.sin(t * 4 + m.row);
    ell(c, 0, -22, 26, 24, `rgba(255,200,80,${glow})`);
    rrect(c, -14, -38, 28, 34, 6, '#ffca28', '#bf360c', 2);
    rrect(c, -16, -40, 32, 5, 2, '#d84315');
    rrect(c, -16, -7, 32, 5, 2, '#d84315');
    // hình người kéo quân chạy vòng
    c.save();
    c.beginPath(); c.rect(-12, -34, 24, 26); c.clip();
    const off = (t * 20) % 24;
    for (let i = -1; i < 2; i++) {
      c.fillStyle = 'rgba(120,40,0,.6)';
      const x = -12 + i * 24 + off;
      ell(c, x, -26, 3, 3, 'rgba(120,40,0,.6)');
      c.fillRect(x - 2, -23, 4, 9);
    }
    c.restore();
    c.restore();
  }

  // --------------------------------------------------------- ánh trăng (sun)
  function drawMoonlight(c, x, y, t, alpha = 1, s = 1) {
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.scale(s, s);
    c.rotate(t * 0.8);
    for (let i = 0; i < 10; i++) {
      c.rotate(Math.PI / 5);
      c.fillStyle = 'rgba(255,241,160,.55)';
      c.beginPath(); c.moveTo(-4, -20); c.lineTo(0, -34 - Math.sin(t * 4 + i) * 3); c.lineTo(4, -20); c.fill();
    }
    c.rotate(-t * 0.8);
    const g = c.createRadialGradient(-5, -5, 2, 0, 0, 22);
    g.addColorStop(0, '#fffef2');
    g.addColorStop(0.6, '#fff2a8');
    g.addColorStop(1, '#ffd54f');
    ell(c, 0, 0, 21, 21, g, '#f9a825', 2);
    // vết trên mặt trăng (hình chú Cuội ngồi gốc đa, cách điệu)
    ell(c, -6, 4, 5, 3.5, 'rgba(210,170,70,.55)');
    ell(c, 7, -7, 3.5, 3, 'rgba(210,170,70,.45)');
    ell(c, 5, 8, 2.5, 2, 'rgba(210,170,70,.45)');
    c.restore();
  }

  // ----------------------------------------------------------- đạn
  function drawBullet(c, b, t) {
    c.save();
    c.translate(b.x, b.y);
    if (b.fire) {
      for (let i = 0; i < 4; i++) {
        const k = ((t * 6 + i / 4) % 1);
        ell(c, -8 - k * 22, Math.sin(t * 30 + i) * 3, 8 * (1 - k) + 2, 6 * (1 - k) + 1, `rgba(255,${120 + i * 30},0,${0.7 * (1 - k)})`);
      }
      ell(c, 0, 0, 15, 15, 'rgba(255,120,0,.4)');
    }
    if (b.kind === 'cake') {
      c.rotate(t * 8);
      drawMooncakeMini(c, 9);
    } else if (b.kind === 'ice') {
      ell(c, 0, 0, 14, 14, 'rgba(129,212,250,.35)');
      c.rotate(t * 6);
      rrect(c, -8, -8, 16, 16, 4, '#e1f5fe', '#4fc3f7', 2);
      c.strokeStyle = '#81d4fa'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.moveTo(0, -5); c.lineTo(0, 5); c.stroke();
    } else {
      const hue = (t * 360 + b.x) % 360;
      ell(c, 0, 0, 14, 14, `hsla(${hue},100%,70%,.35)`);
      c.rotate(t * 10);
      starPath(c, 0, 0, 12, 5);
      c.fillStyle = `hsl(${hue},100%,62%)`; c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
    }
    c.restore();
  }
  function drawMooncakeMini(c, r) {
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rad = i % 2 ? r : r + 2;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.fillStyle = '#c47a2c'; c.fill();
    c.strokeStyle = '#6d3a0a'; c.lineWidth = 1.5; c.stroke();
    ell(c, 0, 0, r - 3, r - 3, '#e8b060');
    ell(c, 0, 0, 2.5, 2.5, '#b36a20');
  }

  // ------------------------------------------------------------ chân dung
  function drawPortraitBase(c, who, t) {
    c.save();
    c.clearRect(0, 0, 160, 160);
    c.translate(80, 96);
    if (who === 'tho') {
      c.scale(1.6, 1.6);
      c.translate(-4, -2);
      drawThoNgoc(c, t, null);
    } else if (who === 'cuoi') {
      // Chú Cuội
      ell(c, 0, 58, 50, 30, '#5d4037');
      rrect(c, -40, 30, 80, 50, 20, '#1e88e5', '#0d47a1', 3);
      ell(c, 0, -4, 36, 38, '#ffcc80', '#8d5a2b', 3);
      // khăn xếp
      rrect(c, -38, -44, 76, 22, 10, '#263238', '#000', 2);
      c.strokeStyle = '#455a64'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-34, -38 + i * 6); c.lineTo(34, -40 + i * 6); c.stroke(); }
      // mắt, râu
      ell(c, -13, -4, 4, 5, '#3e2723'); ell(c, 13, -4, 4, 5, '#3e2723');
      c.strokeStyle = '#3e2723'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-20, -14); c.lineTo(-7, -12); c.moveTo(20, -14); c.lineTo(7, -12); c.stroke();
      c.fillStyle = '#3e2723';
      c.beginPath(); c.moveTo(0, 12); c.quadraticCurveTo(-20, 8, -24, 18); c.quadraticCurveTo(-10, 16, 0, 16);
      c.quadraticCurveTo(10, 16, 24, 18); c.quadraticCurveTo(20, 8, 0, 12); c.fill();
      c.beginPath(); c.arc(0, 20, 9, 0.2, Math.PI - 0.2); c.fillStyle = '#b71c1c'; c.fill();
      ell(c, -24, 8, 6, 4, 'rgba(244,67,54,.35)'); ell(c, 24, 8, 6, 4, 'rgba(244,67,54,.35)');
    } else if (who === 'hang') {
      // Chị Hằng
      ell(c, 0, 0, 62, 62, 'rgba(255,245,200,.25)');
      c.fillStyle = '#1a1a2e';
      c.beginPath(); c.ellipse(0, 10, 44, 60, 0, 0, Math.PI * 2); c.fill();
      rrect(c, -38, 34, 76, 50, 22, '#f8bbd0', '#ad1457', 3);
      ell(c, 0, -4, 30, 34, '#ffe0cc', '#b07a5a', 2.5);
      c.fillStyle = '#1a1a2e';
      c.beginPath(); c.ellipse(0, -30, 32, 14, 0, Math.PI, 0); c.fill();
      ell(c, 0, -46, 16, 12, '#1a1a2e');
      // trâm cài
      starPath(c, 14, -50, 8, 3.5); c.fillStyle = '#ffd54f'; c.fill();
      ell(c, -18, -46, 5, 5, '#ec407a');
      // mặt
      c.strokeStyle = '#3e2723'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(-11, -2, 5, Math.PI + 0.4, -0.4); c.arc(11, -2, 5, Math.PI + 0.4, -0.4); c.stroke();
      ell(c, -18, 8, 5, 3, 'rgba(244,67,54,.35)'); ell(c, 18, 8, 5, 3, 'rgba(244,67,54,.35)');
      c.beginPath(); c.arc(0, 12, 5, 0.3, Math.PI - 0.3); c.strokeStyle = '#c2185b'; c.stroke();
      // trăng khuyết
      c.beginPath(); c.arc(-50, -54, 12, 0, Math.PI * 2); c.fillStyle = '#fff59d'; c.fill();
      c.beginPath(); c.arc(-44, -58, 11, 0, Math.PI * 2); c.fillStyle = '#2a2060'; c.fill();
    }
    c.restore();
  }

  // ============================================================ NỀN
  const bgCache = {};
  function getBackground(time) {
    if (bgCache[time]) return bgCache[time];
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const night = time === 'night', dusk = time === 'dusk';
    // bầu trời
    const sky = c.createLinearGradient(0, 0, 0, LAWN_Y + 20);
    if (night) { sky.addColorStop(0, '#0a0a2a'); sky.addColorStop(1, '#27215a'); }
    else if (dusk) { sky.addColorStop(0, '#3b2a6b'); sky.addColorStop(0.6, '#d9607a'); sky.addColorStop(1, '#ffb36b'); }
    else { sky.addColorStop(0, '#6fb7ff'); sky.addColorStop(1, '#ffe7a8'); }
    c.fillStyle = sky; c.fillRect(0, 0, W, LAWN_Y + 20);
    if (night) {
      for (let i = 0; i < 70; i++) ell(c, Math.random() * W, Math.random() * LAWN_Y, Math.random() * 1.4 + 0.3, Math.random() * 1.4 + 0.3, 'rgba(255,255,255,.8)');
    }
    // trăng
    const mx = 700, my = 44;
    const moonG = c.createRadialGradient(mx, my, 10, mx, my, 90);
    moonG.addColorStop(0, night ? 'rgba(255,244,190,.7)' : 'rgba(255,255,255,.35)');
    moonG.addColorStop(1, 'rgba(255,244,190,0)');
    c.fillStyle = moonG; c.fillRect(mx - 90, 0, 180, 140);
    ell(c, mx, my, 34, 34, night ? '#fff6c8' : dusk ? '#ffe9b0' : 'rgba(255,255,255,.75)');
    ell(c, mx - 8, my + 6, 8, 6, 'rgba(200,170,90,.35)');
    ell(c, mx + 10, my - 8, 6, 5, 'rgba(200,170,90,.3)');
    // cây đa + chú Cuội nhỏ trên trăng
    c.fillStyle = 'rgba(150,120,60,.35)';
    c.fillRect(mx + 4, my + 4, 3, 14);
    ell(c, mx + 6, my + 2, 9, 7, 'rgba(150,120,60,.35)');
    // đồi xa
    c.fillStyle = night ? '#16223a' : dusk ? '#5b3a5e' : '#8bc47a';
    c.beginPath(); c.moveTo(0, LAWN_Y + 5);
    for (let x = 0; x <= W; x += 50) c.lineTo(x, LAWN_Y - 10 - Math.sin(x / 90) * 12);
    c.lineTo(W, LAWN_Y + 5); c.fill();

    // sân cỏ
    const g1 = night ? '#2f5a3a' : dusk ? '#5f8f3a' : '#7cc043';
    const g2 = night ? '#284f33' : dusk ? '#54822f' : '#6aae36';
    c.fillStyle = night ? '#3a2e24' : '#7a5a36';
    c.fillRect(0, LAWN_Y - 6, W, H);
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        c.fillStyle = (r + col) % 2 ? g1 : g2;
        c.fillRect(LAWN_X + col * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
      }
    }
    // hoa lá li ti
    for (let i = 0; i < 160; i++) {
      const x = LAWN_X + Math.random() * (LAWN_R - LAWN_X);
      const y = LAWN_Y + Math.random() * ROWS * CELL_H;
      c.strokeStyle = night ? 'rgba(120,180,120,.35)' : 'rgba(40,90,20,.35)';
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 5); c.moveTo(x, y); c.lineTo(x + 2, y - 5); c.stroke();
    }
    // đường phố bên phải
    c.fillStyle = night ? '#2c2c38' : '#6d6d78';
    c.fillRect(LAWN_R, LAWN_Y - 6, W - LAWN_R, H);
    c.fillStyle = night ? '#3a3a48' : '#8d8d98';
    c.fillRect(LAWN_R, LAWN_Y - 6, 8, H);
    // hàng rào tre giữa sân và đường
    // nhà (bên trái)
    c.fillStyle = night ? '#4a3a2a' : '#c8a77a';
    c.fillRect(0, LAWN_Y - 6, LAWN_X - 60, H);
    c.fillStyle = night ? '#6a5540' : '#e8d4ae';
    c.fillRect(0, LAWN_Y + 10, LAWN_X - 70, H);
    // mái ngói đỏ
    c.fillStyle = night ? '#6d1f1f' : '#b53a2a';
    c.beginPath(); c.moveTo(0, LAWN_Y - 6); c.lineTo(LAWN_X - 40, LAWN_Y - 6); c.lineTo(LAWN_X - 70, LAWN_Y + 30); c.lineTo(0, LAWN_Y + 30); c.fill();
    c.strokeStyle = night ? '#4a1010' : '#7f2217'; c.lineWidth = 2;
    for (let y = LAWN_Y; y < LAWN_Y + 30; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(LAWN_X - 44 - (y - LAWN_Y), y); c.stroke(); }
    // cửa + cột
    for (let r = 0; r < ROWS; r++) {
      const y = rowCY(r);
      c.fillStyle = night ? '#3e2a18' : '#8d5a2b';
      c.fillRect(LAWN_X - 78, y - 44, 8, 88);
    }
    rrect(c, 20, LAWN_Y + 190, 70, 120, 6, night ? '#4e2a12' : '#8d4a1f', '#3e1f0a', 3);
    c.fillStyle = '#ffd54f'; c.fillRect(78, LAWN_Y + 250, 5, 5);
    // cửa sổ sáng đèn
    rrect(c, 20, LAWN_Y + 60, 70, 60, 6, night ? '#ffcc66' : '#ffe9b0', '#5d3a17', 3);
    c.strokeStyle = '#5d3a17'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(55, LAWN_Y + 60); c.lineTo(55, LAWN_Y + 120); c.moveTo(20, LAWN_Y + 90); c.lineTo(90, LAWN_Y + 90); c.stroke();
    // mâm cỗ trong cửa sổ
    ell(c, 55, LAWN_Y + 112, 22, 5, '#b71c1c');
    drawMooncakeAt(c, 45, LAWN_Y + 104, 7);
    drawMooncakeAt(c, 64, LAWN_Y + 104, 7);
    rrect(c, 20, LAWN_Y + 360, 70, 60, 6, night ? '#ffcc66' : '#ffe9b0', '#5d3a17', 3);
    // hiên gạch
    c.fillStyle = night ? '#5a4632' : '#b89a70';
    c.fillRect(LAWN_X - 70, LAWN_Y - 6, 70, H);
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1;
    for (let y = LAWN_Y; y < H; y += 24) { c.beginPath(); c.moveTo(LAWN_X - 70, y); c.lineTo(LAWN_X, y); c.stroke(); }
    // dây đèn lồng trước hiên
    const lcols = ['#e53935', '#fb8c00', '#fdd835', '#e53935', '#8e24aa'];
    c.strokeStyle = '#3e2723'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, LAWN_Y + 32);
    for (let i = 0; i <= 4; i++) c.quadraticCurveTo(i * 30 + 15, LAWN_Y + 44, i * 30 + 30, LAWN_Y + 32);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const lx = i * 30 + 30, ly = LAWN_Y + 44;
      if (night || dusk) ell(c, lx, ly, 16, 16, 'rgba(255,190,80,.35)');
      ell(c, lx, ly, 7, 9, lcols[i], '#5d1a00', 1.2);
      c.fillStyle = '#fdd835'; c.fillRect(lx - 1, ly + 9, 2, 6);
    }
    if (night) {
      c.fillStyle = 'rgba(10,10,50,.18)';
      c.fillRect(LAWN_X, LAWN_Y, LAWN_R - LAWN_X, ROWS * CELL_H);
    }
    bgCache[time] = cv;
    return cv;
  }
  function drawMooncakeAt(c, x, y, r) {
    c.save(); c.translate(x, y); drawMooncakeMini(c, r); c.restore();
  }

  // ============================================================ LOGIC GAME
  function plantDef(id) { return DATA.plants[id]; }
  function cfg(k) { return DATA.config[k]; }
  const ITEM_ORDER = ['banh_than', 'mua_sao', 'gio_hang', 'tra_sen'];
  const ITEM_KEYS = ['Q', 'W', 'E', 'R'];
  const HUMANOID = new Set(['thuong', 'co', 'non_la', 'noi_dong', 'mua_lan', 'nhoc']);
  const HEADPOP = new Set(['thuong', 'co', 'non_la', 'noi_dong', 'nhoc']);
  let zid = 0;

  function defaultPicks(L) {
    const max = cfg('max_slots');
    if (L.plants.length <= max) return L.plants.slice();
    const pri = ['tho_ngoc', ...L.plants.slice(-3), 'tho_ban', 'banh_nuong', 'tho_bang', 'den_ong_sao', 'cho_buoi'];
    const out = [];
    for (const id of [...pri, ...L.plants]) if (L.plants.includes(id) && !out.includes(id) && out.length < max) out.push(id);
    return L.plants.filter((id) => out.includes(id));
  }

  function newGame(levelIdx, picks) {
    const L = DATA.levels[levelIdx];
    picks = picks || defaultPicks(L);
    game = {
      L, idx: levelIdx, picks, t: 0, sun: L.start_sun,
      plants: [],
      grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      zombies: [], bullets: [], suns: [], fx: [], drops: [], pending: [],
      mowers: Array.from({ length: ROWS }, (_, r) => ({ row: r, x: LAWN_X - 44, state: 'idle' })),
      cards: picks.map((id) => ({ id, cd: plantDef(id).start_cooldown, max: plantDef(id).start_cooldown || 1 })),
      items: Object.fromEntries(ITEM_ORDER.map((id) => [id, (L.items && L.items[id]) || 0])),
      selected: null, shovel: false, itemSel: null,
      waveIndex: -1, nextWave: L.first_delay, waveHp: 1, sinceWave: 0, announced: -1,
      skyTimer: 5, state: 'ready', readyT: 0, banner: null, reward: null, groanT: 6,
      shake: 0, hover: null, mood: 'happy',
    };
    $('level-title').textContent = L.name;
    paused = false;
  }

  function spawnSun(x, y, from) {
    const g = game;
    if (from === 'sky') {
      g.suns.push({ x, y: -30, ty: y, vy: 0, value: 25, life: 9, mode: 'fall', age: 0 });
    } else {
      g.suns.push({ x, y, ty: y + 32, vx: rand(-50, 50), vy: -150, value: from.value || 25, life: 9, mode: 'pop', age: 0 });
    }
  }

  function placePlant(id, r, col) {
    const d = plantDef(id);
    const p = {
      id, row: r, col, x: colCX(col), y: rowCY(r), hp: d.hp, maxHp: d.hp,
      timer: d.kind === 'producer' ? d.first : d.kind === 'shooter' ? 0.6 : d.kind === 'spike' ? 0.5 : 0,
      armT: d.arm || 0, armed: false, popT: 0, fuseT: 0, recoil: 0, glow: 0, boost: 0,
      barrage: 0, bTimer: 0, chew: 0, biteT: 0, state: 'idle', stT: 0, offX: 0, offY: 0,
      born: game.t, pending: [], dead: false, phase: Math.random() * 6,
    };
    game.plants.push(p);
    game.grid[r][col] = p;
    game.fx.push({ kind: 'dust', x: p.x, y: p.y + 28, t: 0, life: 0.4 });
    sfx.plant();
    return p;
  }

  function removePlant(p) {
    if (p.dead) return;
    p.dead = true;
    if (game.grid[p.row][p.col] === p) game.grid[p.row][p.col] = null;
    game.plants = game.plants.filter((q) => q !== p);
  }

  function spawnZombie(type, row, xOff = 0) {
    const d = DATA.zombies[type];
    const z = {
      id: ++zid, type, row, x: LAWN_R + 40 + xOff, hp: d.hp, maxHp: d.hp, armor: d.armor, maxArmor: d.armor,
      speed: d.speed, bite: d.bite, anim: Math.random() * 10, flash: 0, slow: 0,
      eating: false, dying: false, dieT: 0, burnt: false, jumped: false, jumping: false,
      jumpT: 0, jumpY: 0, smashing: false, smashT: 0, chompT: 0,
      armLost: false, headless: false, eaten: false, squashed: false, throwing: false, thrown: false,
    };
    game.zombies.push(z);
    return z;
  }

  function spawnWave(i) {
    const g = game;
    const list = g.L.waves[i];
    const isFlag = g.L.flags.includes(i);
    let hpSum = 0;
    const rows = [];
    list.forEach((type, k) => {
      let row;
      do { row = Math.floor(Math.random() * ROWS); } while (rows.length < ROWS && rows.includes(row) && Math.random() < 0.8);
      rows.push(row);
      if (rows.length >= ROWS) rows.length = 0;
      const off = type === 'co' ? 0 : isFlag ? rand(20, 140) : k * rand(15, 45) + rand(0, 20);
      spawnZombie(type, row, off);
      hpSum += DATA.zombies[type].hp + DATA.zombies[type].armor;
    });
    g.waveHp = hpSum;
    g.sinceWave = 0;
    if (isFlag) sfx.wave();
    if (list.includes('thien_cau')) sfx.howl();
    const total = g.L.waves.length;
    if (i === total - 1) {
      g.banner = { text: 'ĐỢT CUỐI CÙNG!', t: 0, dur: 3, color: '#ff5252', size: 58 };
      cheer('final');
    } else if (isFlag) cheer('flag');
    else if (i === Math.floor(total / 2)) cheer('half');
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function cheer(kind) {
    const list = DATA.cheers && DATA.cheers[kind];
    if (!game || !list || !list.length) return;
    game.cheer = { text: pick(list), t: 0, dur: 4 };
  }

  function aliveZombieHp() {
    let s = 0;
    for (const z of game.zombies) if (!z.dying) s += z.hp + z.armor;
    return s;
  }

  function zGroundY(z) { return rowCY(z.row) + 38; }

  function damageZombie(z, dmg, opts = {}) {
    if (z.dying) return;
    const hadArmor = z.armor > 0;
    if (opts.boom) {
      z.hp -= dmg;
      if (z.hp <= 0) { z.hp = 0; z.armor = 0; }
    } else if (z.armor > 0) {
      z.armor -= dmg;
      if (z.armor < 0) { z.hp += z.armor; z.armor = 0; }
      if (!opts.quiet) sfx.armor();
    } else {
      z.hp -= dmg;
      if (!opts.quiet) sfx.hit();
    }
    if (hadArmor && z.armor <= 0 && z.hp > 0 && (z.type === 'non_la' || z.type === 'noi_dong')) {
      game.fx.push({ kind: 'armor', type: z.type, x: z.x - 6, y: zGroundY(z) - 100, vx: rand(40, 90), vy: -220, spin: rand(3, 6), ground: zGroundY(z) - 6, t: 0, life: 1.4 });
    }
    z.flash = 0.1;
    if (opts.slow) z.slow = Math.max(z.slow, opts.slow);
    if (!z.armLost && HUMANOID.has(z.type) && z.hp > 0 && z.hp < z.maxHp * 0.5) {
      z.armLost = true;
      game.fx.push({ kind: 'arm', P: zPalette(z), x: z.x - 30, y: zGroundY(z) - 78, vx: rand(-30, 20), vy: -80, spin: rand(-6, 6), ground: zGroundY(z) - 4, t: 0, life: 1.4 });
    }
    if (z.hp <= 0) killZombie(z, opts.how || (opts.boom ? 'boom' : 'hit'));
  }

  function killZombie(z, how) {
    if (z.dying) return;
    const g = game;
    z.dying = true;
    z.burnt = how === 'boom';
    z.dieT = 0;
    z.eating = false;
    if (how === 'eat') { z.eaten = true; z.dieT = 99; }
    if (how === 'squash') z.squashed = true;
    if (how === 'hit' && HEADPOP.has(z.type)) {
      z.headless = true;
      const s = z.type === 'nhoc' ? 0.7 : 1;
      g.fx.push({ kind: 'head', z: { type: z.type, anim: z.anim, eating: false }, P: zPalette(z), s, x: z.x - 4 * s, y: zGroundY(z) - 84 * s, vx: rand(20, 70), vy: -200, spin: rand(2, 5), ground: zGroundY(z) - 8, t: 0, life: 1.6 });
    }
    if (how === 'hit' && z.type === 'thien_cau') {
      g.fx.push({ kind: 'smoke', x: z.x, y: zGroundY(z) - 50, t: 0, life: 1.2 });
    }
    if (how !== 'eat') maybeDrop(z);
    g.lastDeath = { x: z.x, y: rowCY(z.row) };
  }

  function maybeDrop(z) {
    const g = game;
    if (g.drops.length >= 3) return;
    const chance = z.type === 'co' ? 1 : (z.type === 'ong_dia' || z.type === 'thien_cau') ? 0.35 : cfg('item_drop_chance');
    if (Math.random() > chance) return;
    const r = Math.random();
    const id = r < 0.4 ? 'banh_than' : r < 0.6 ? 'mua_sao' : r < 0.75 ? 'gio_hang' : 'tra_sen';
    g.drops.push({ id, x: clamp(z.x, LAWN_X + 30, LAWN_R - 30), y: rowCY(z.row) + 12, t: 0, life: 12, mode: 'rest' });
  }

  function explode(x, y, radiusX, rows, dmg, big) {
    for (const z of game.zombies) {
      if (z.dying) continue;
      if (!rows.includes(z.row)) continue;
      if (Math.abs(z.x - x) <= radiusX) damageZombie(z, dmg, { boom: true });
    }
    game.fx.push({ kind: 'boom', x, y, t: 0, life: 0.7, big });
    game.shake = big ? 0.4 : 0.25;
    sfx.boom();
  }

  function zombieTarget(z, reach) {
    let best = null;
    for (const p of game.plants) {
      if (p.row !== z.row || p.dead) continue;
      const k = plantDef(p.id).kind;
      if (k === 'spike' && z.type !== 'ong_dia') continue;
      if (k === 'squash' && p.state !== 'idle') continue;
      const d = z.x - p.x;
      if (d >= -10 && d <= reach) {
        if (!best || p.x > best.x) best = p;
      }
    }
    return best;
  }

  function update(dt) {
    const g = game;
    if (g.state === 'ready') {
      g.readyT += dt;
      if (g.readyT > 2.4) { g.state = 'playing'; cheer('start'); }
      return;
    }
    g.t += dt;
    if (g.shake > 0) g.shake -= dt;
    if (g.banner) { g.banner.t += dt; if (g.banner.t > g.banner.dur) g.banner = null; }
    if (g.cheer) { g.cheer.t += dt; if (g.cheer.t > g.cheer.dur) g.cheer = null; }
    updateMood();

    if (g.state === 'lost') {
      g.loseT += dt;
      if (g.loser) { g.loser.x -= 25 * dt; g.loser.anim += dt; }
      for (const f of g.fx) f.t += dt;
      if (g.loseT > 2.4 && !g.loseShown) { g.loseShown = true; showLose(); }
      return;
    }

    for (const cd of g.cards) cd.cd = Math.max(0, cd.cd - dt);

    if (g.state === 'playing') {
      g.skyTimer -= dt;
      if (g.skyTimer <= 0) {
        spawnSun(rand(LAWN_X + 30, LAWN_R - 40), rand(LAWN_Y + 40, LAWN_B - 30), 'sky');
        g.skyTimer = g.L.sky_sun + rand(0, 3);
      }
    }

    const nWaves = g.L.waves.length;
    if (g.state === 'playing' && g.waveIndex < nWaves - 1) {
      g.nextWave -= dt;
      g.sinceWave += dt;
      const nextIsFlag = g.L.flags.includes(g.waveIndex + 1);
      if (g.waveIndex >= 0 && g.sinceWave > 6 && aliveZombieHp() < g.waveHp * 0.35) {
        g.nextWave = Math.min(g.nextWave, nextIsFlag ? 5 : 2);
      }
      if (nextIsFlag && g.nextWave <= 4.5 && g.announced !== g.waveIndex + 1) {
        g.announced = g.waveIndex + 1;
        g.banner = { text: 'Một đợt ZOMBIE LỚN đang kéo tới!', t: 0, dur: 3.5, color: '#ff5252', size: 40 };
        sfx.wave();
      }
      if (g.nextWave <= 0) {
        g.waveIndex++;
        spawnWave(g.waveIndex);
        g.nextWave = g.L.wave_interval;
      }
    }

    g.groanT -= dt;
    if (g.groanT <= 0) { if (g.zombies.some((z) => !z.dying)) sfx.groan(); g.groanT = rand(5, 10); }

    for (const pd of g.pending) { pd.t -= dt; if (pd.t <= 0 && !pd.done) { pd.done = true; pd.fn(); } }
    g.pending = g.pending.filter((pd) => !pd.done);

    updatePlants(dt);
    updateZombies(dt);
    updateBullets(dt);
    updateMowers(dt);
    updateSuns(dt);
    updateDrops(dt);
    for (const f of g.fx) f.t += dt;
    g.fx = g.fx.filter((f) => f.t < f.life);

    if (g.state === 'playing' && g.waveIndex === nWaves - 1 && !g.zombies.some((z) => !z.dying)) {
      g.state = 'reward';
      const ld = g.lastDeath || { x: LAWN_X + CELL_W * 6, y: rowCY(2) };
      g.reward = { x: clamp(ld.x, LAWN_X + 60, LAWN_R - 60), y: clamp(ld.y, LAWN_Y + 60, LAWN_B - 70), t: 0, taken: false };
    }
    if (g.reward) {
      g.reward.t += dt;
      if (g.reward.taken) {
        g.reward.x += (W / 2 - g.reward.x) * Math.min(1, dt * 3);
        g.reward.y += (H / 2 - g.reward.y) * Math.min(1, dt * 3);
        if (g.reward.t > 2 && !g.winShown) { g.winShown = true; onWin(); }
      }
    }
  }

  function updateMood() {
    const g = game;
    if (g.state === 'lost') { g.mood = 'panic'; return; }
    let minX = Infinity;
    for (const z of g.zombies) if (!z.dying && z.x < minX) minX = z.x;
    g.mood = minX < LAWN_X + CELL_W * 1.5 ? 'panic' : minX < LAWN_X + CELL_W * 4 ? 'scared' : 'happy';
  }

  function lanesOf(p, d) {
    if (d.lanes === 3) return [p.row - 1, p.row, p.row + 1].filter((r) => r >= 0 && r < ROWS);
    return [p.row];
  }

  function hasTargetInRows(rows, x) {
    for (const z of game.zombies) {
      if (!z.dying && rows.includes(z.row) && z.x > x - 10 && z.x < W - 10) return true;
    }
    return false;
  }

  function updatePlants(dt) {
    const g = game;
    for (const p of [...g.plants]) {
      if (p.dead) continue;
      const d = plantDef(p.id);
      p.recoil = Math.max(0, p.recoil - dt * 5);
      p.glow = Math.max(0, p.glow - dt);
      p.boost = Math.max(0, p.boost - dt);
      if (d.kind === 'producer') {
        p.timer -= dt;
        if (p.timer <= 0) {
          spawnSun(p.x + 10, p.y - 10, { value: d.value });
          p.timer = d.interval + rand(-1, 1);
          p.glow = 1;
        }
      } else if (d.kind === 'shooter') {
        const rows = lanesOf(p, d);
        p.timer -= dt;
        for (const pd of p.pending) pd.t -= dt;
        while (p.pending.length && p.pending[0].t <= 0) { p.pending.shift(); fire(p, d); }
        if (p.barrage > 0) {
          p.barrage -= dt; p.bTimer -= dt;
          if (p.bTimer <= 0) { fire(p, d, true); p.bTimer = 0.07; }
        } else if (p.timer <= 0 && hasTargetInRows(rows, p.x)) {
          fire(p, d);
          for (let s = 1; s < (d.shots || 1); s++) p.pending.push({ t: 0.18 * s });
          p.timer = d.rate;
        }
      } else if (d.kind === 'mine') {
        if (!p.armed) {
          p.armT -= dt;
          if (p.armT <= 0) { p.armed = true; p.popT = 0; }
        } else {
          p.popT += dt * 4;
          const trig = g.zombies.some((z) => !z.dying && z.row === p.row && z.x - p.x < 44 && z.x - p.x > -30 && !z.jumping);
          if (trig) {
            explode(p.x, p.y, 60, [p.row], d.damage, false);
            g.fx.push({ kind: 'text', x: p.x, y: p.y - 20, t: 0, life: 1.2, text: 'BỤP DẺO!', color: '#c5e1a5' });
            removePlant(p);
          }
        }
      } else if (d.kind === 'bomb') {
        p.fuseT += dt / d.fuse;
        if (p.fuseT >= 1) {
          const rows = [p.row - 1, p.row, p.row + 1].filter((r) => r >= 0 && r < ROWS);
          explode(p.x, p.y, CELL_W * 1.5, rows, d.damage, true);
          g.fx.push({ kind: 'text', x: p.x, y: p.y - 30, t: 0, life: 1.2, text: 'BÙMMM!', color: '#ffeb3b' });
          removePlant(p);
        }
      } else if (d.kind === 'squash') {
        updateSquash(p, d, dt);
      } else if (d.kind === 'spike') {
        p.timer -= dt;
        if (p.timer <= 0) {
          let hit = false;
          for (const z of g.zombies) {
            if (!z.dying && z.row === p.row && !z.jumping && Math.abs(z.x - p.x) < 50) { damageZombie(z, d.damage, { quiet: true }); hit = true; }
          }
          if (hit) { p.glow = 0.3; sfx.hit(); }
          p.timer = d.rate;
        }
      } else if (d.kind === 'chomper') {
        if (p.chew > 0) {
          p.chew -= dt;
        } else if (p.biteT > 0) {
          p.biteT -= dt;
          if (p.biteT <= 0) {
            const z = p.biteTarget;
            if (z && !z.dying && z.row === p.row && z.x - p.x > -30 && z.x - p.x < 130) {
              if (z.type === 'ong_dia') { damageZombie(z, d.boss_damage, { boom: true }); p.chew = 6; }
              else { killZombie(z, 'eat'); p.chew = d.chew; }
              sfx.gulp();
            }
          }
        } else {
          const z = g.zombies.find((q) => !q.dying && !q.jumping && q.row === p.row && q.x - p.x >= -20 && q.x - p.x <= 110);
          if (z) { p.biteT = 0.45; p.biteTarget = z; }
        }
      }
    }
  }

  function updateSquash(p, d, dt) {
    const g = game;
    if (p.state === 'idle') {
      const z = g.zombies.filter((q) => !q.dying && q.row === p.row && q.x - p.x >= -40 && q.x - p.x <= 95)
        .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (z) startSquash(p, z);
      return;
    }
    p.stT += dt;
    if (p.target && !p.target.dying) p.tx = p.target.x;
    if (p.state === 'rise') {
      const k = clamp(p.stT / 0.4, 0, 1);
      p.offX = (p.tx - p.x) * k;
      p.offY = -80 * Math.sin((k * Math.PI) / 2);
      if (k >= 1) { p.state = 'slam'; p.stT = 0; }
    } else if (p.state === 'slam') {
      const k = clamp(p.stT / 0.14, 0, 1);
      p.offX = p.tx - p.x;
      p.offY = -80 * (1 - k);
      if (k >= 1) {
        for (const z of g.zombies) {
          if (!z.dying && z.row === p.row && Math.abs(z.x - p.tx) < 55) damageZombie(z, d.damage, { boom: true, how: 'squash' });
        }
        g.fx.push({ kind: 'dust', x: p.tx, y: p.y + 28, t: 0, life: 0.6, big: true });
        g.fx.push({ kind: 'text', x: p.tx, y: p.y - 40, t: 0, life: 1, text: 'TÙNG!!', color: '#ffeb3b' });
        g.shake = 0.25;
        sfx.smash();
        p.state = 'done'; p.stT = 0;
      }
    } else if (p.state === 'done' && p.stT > 0.45) {
      removePlant(p);
    }
  }

  function startSquash(p, z) {
    p.state = 'rise'; p.stT = 0; p.target = z; p.tx = z.x;
    sfx.select();
  }

  function fire(p, d, quiet) {
    const kind = d.bullet || 'cake';
    const oy = kind === 'star' ? -38 : 4;
    const ox = kind === 'star' ? 44 : 38;
    for (const r of lanesOf(p, d)) {
      game.bullets.push({ row: r, x: p.x + ox, y: p.y + oy, ty: rowCY(r) + oy, dmg: d.damage, kind, slow: d.slow || 0, fire: false });
    }
    p.recoil = 1;
    if (!quiet) sfx.shoot();
  }

  function updateZombies(dt) {
    const g = game;
    for (const z of g.zombies) {
      if (z.dying) { z.dieT += dt; continue; }
      z.flash -= dt;
      z.slow -= dt;
      const sf = z.slow > 0 ? 0.5 : 1;
      z.anim += dt * sf;

      if (z.jumping) {
        z.jumpT += dt / 0.9;
        const k = clamp(z.jumpT, 0, 1);
        z.x = z.jumpFrom + (z.jumpTo - z.jumpFrom) * k;
        z.jumpY = Math.sin(k * Math.PI) * (z.throwArc || 90);
        if (k >= 1) { z.jumping = false; z.jumped = true; z.jumpY = 0; z.speed = DATA.zombies[z.type].speed_after || z.speed; }
        continue;
      }
      if (z.smashing) {
        const before = z.smashT;
        z.smashT += dt * sf;
        if (before < 0.9 && z.smashT >= 0.9) {
          if (z.throwing) {
            const imp = spawnZombie(DATA.zombies[z.type].throws || 'nhoc', z.row, 0);
            imp.x = z.x - 20;
            imp.jumping = true; imp.jumpT = 0; imp.jumpFrom = imp.x; imp.throwArc = 150;
            imp.jumpTo = Math.max(LAWN_X + 30, z.x - CELL_W * 3.5);
            z.thrown = true;
            g.fx.push({ kind: 'text', x: z.x, y: rowCY(z.row) - 110, t: 0, life: 1, text: 'Ném nè!', color: '#ffccbc' });
          } else {
            if (z.smashTarget && !z.smashTarget.dead) {
              removePlant(z.smashTarget);
              g.fx.push({ kind: 'dust', x: z.smashTarget.x, y: z.smashTarget.y + 20, t: 0, life: 0.6, big: true });
            }
            g.shake = 0.3;
            sfx.smash();
          }
        }
        if (z.smashT >= 1.5) { z.smashing = false; z.smashT = 0; z.throwing = false; }
        continue;
      }
      if (z.type === 'ong_dia' && DATA.zombies[z.type].throws && !z.thrown && z.hp < z.maxHp * 0.5 && z.x > LAWN_X + CELL_W * 4.5) {
        z.smashing = true; z.throwing = true; z.smashT = 0; z.smashTarget = null; z.eating = false;
        continue;
      }

      const reach = z.type === 'ong_dia' ? 62 : z.type === 'thien_cau' ? 84 : z.type === 'mua_lan' && !z.jumped ? 70 : 42;
      const target = z.x < W - 20 ? zombieTarget(z, reach) : null;
      if (target) {
        if (z.type === 'mua_lan' && !z.jumped) {
          z.jumping = true; z.jumpT = 0; z.jumpFrom = z.x; z.jumpTo = target.x - 46; z.eating = false;
          g.fx.push({ kind: 'text', x: z.x, y: rowCY(z.row) - 90, t: 0, life: 1, text: 'Hây Dô!', color: '#ffeb3b' });
          continue;
        }
        if (z.type === 'ong_dia') {
          z.smashing = true; z.smashT = 0; z.smashTarget = target; z.eating = false;
          continue;
        }
        z.eating = true;
        const d = plantDef(target.id);
        if (d.kind !== 'bomb') target.hp -= z.bite * dt * sf;
        z.chompT -= dt;
        if (z.chompT <= 0) { sfx.chomp(); z.chompT = 0.5; }
        if (target.hp <= 0) removePlant(target);
      } else {
        z.eating = false;
        z.x -= z.speed * sf * dt;
      }

      if (z.x < LAWN_X - 6) {
        const m = g.mowers[z.row];
        if (m.state === 'idle') { m.state = 'run'; sfx.mower(); cheer('mower'); }
        else if (m.state === 'gone' && z.x < LAWN_X - 60 && g.state === 'playing') {
          g.state = 'lost'; g.loseT = 0; g.loser = z; g.selected = null; g.shovel = false; g.itemSel = null;
          g.fx.push({ kind: 'text', x: PHUONG_POS.x + 40, y: PHUONG_POS.y - 120, t: 0, life: 2.4, text: 'Cứu tôi với!!', color: '#ffffff' });
          sfx.lose();
        }
      }
    }
    g.zombies = g.zombies.filter((z) => !(z.dying && z.dieT > 1.4));
  }

  function updateBullets(dt) {
    const g = game;
    const torches = g.plants.filter((p) => plantDef(p.id).kind === 'torch');
    for (const b of g.bullets) {
      const ox = b.x;
      b.x += BULLET_SPEED * dt;
      b.y += (b.ty - b.y) * Math.min(1, dt * 12);
      for (const tp of torches) {
        if (tp.row === b.row && ox < tp.x && b.x >= tp.x) {
          if (b.kind === 'ice') { b.kind = 'cake'; b.slow = 0; }
          else if (!b.fire) { b.fire = true; b.dmg *= 2; }
        }
      }
      let hit = null;
      for (const z of g.zombies) {
        if (z.dying || z.row !== b.row || z.jumping) continue;
        const left = z.type === 'ong_dia' ? z.x - 34 : z.type === 'thien_cau' ? z.x - 60 : z.x - 20;
        const right = z.type === 'thien_cau' ? z.x + 50 : z.x + 30;
        if (b.x >= left && b.x <= right && z.x < W) {
          if (!hit || z.x < hit.x) hit = z;
        }
      }
      if (hit) {
        damageZombie(hit, b.dmg, { slow: b.slow });
        b.dead = true;
        g.fx.push({ kind: 'splat', x: b.x, y: b.y, t: 0, life: 0.3, color: b.fire ? '#ff9800' : b.kind === 'ice' ? '#b3e5fc' : b.kind === 'star' ? '#fff59d' : '#e8b060' });
      }
      if (b.x > W + 20) b.dead = true;
    }
    g.bullets = g.bullets.filter((b) => !b.dead);
  }

  function updateMowers(dt) {
    const g = game;
    for (const m of g.mowers) {
      if (m.state !== 'run') continue;
      m.x += 330 * dt;
      for (const z of g.zombies) {
        if (!z.dying && z.row === m.row && Math.abs(z.x - m.x) < 34) {
          killZombie(z, 'mow');
          g.fx.push({ kind: 'dust', x: z.x, y: rowCY(z.row) + 20, t: 0, life: 0.5 });
        }
      }
      if (m.x > W + 60) m.state = 'gone';
    }
  }

  function updateSuns(dt) {
    const g = game;
    for (const s of g.suns) {
      s.age += dt;
      if (s.mode === 'collect') {
        s.x += (SUN_TARGET.x - s.x) * Math.min(1, dt * 7);
        s.y += (SUN_TARGET.y - s.y) * Math.min(1, dt * 7);
        if (Math.hypot(s.x - SUN_TARGET.x, s.y - SUN_TARGET.y) < 8) {
          s.dead = true;
          g.sun += s.value;
        }
      } else if (s.mode === 'fall') {
        s.y += 55 * dt;
        if (s.y >= s.ty) { s.y = s.ty; s.mode = 'rest'; }
      } else if (s.mode === 'pop') {
        s.vy += 400 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.vy > 0 && s.y >= s.ty) { s.y = s.ty; s.mode = 'rest'; }
      } else {
        s.life -= dt;
        if (s.life <= 0) s.dead = true;
      }
    }
    g.suns = g.suns.filter((s) => !s.dead);
  }

  function updateDrops(dt) {
    const g = game;
    for (const d of g.drops) {
      d.t += dt;
      if (d.mode === 'collect') {
        const r = itemRect(ITEM_ORDER.indexOf(d.id));
        const tx = r.x + r.w / 2, ty = r.y + r.h / 2;
        d.x += (tx - d.x) * Math.min(1, dt * 6);
        d.y += (ty - d.y) * Math.min(1, dt * 6);
        if (Math.hypot(tx - d.x, ty - d.y) < 8) {
          d.dead = true;
          g.items[d.id] = Math.min(cfg('max_item_stock'), g.items[d.id] + 1);
        }
      } else {
        d.life -= dt;
        if (d.life <= 0) d.dead = true;
      }
    }
    g.drops = g.drops.filter((d) => !d.dead);
  }

  // --------------------------------------------------------------- bảo vật
  function applyPlantFood(p) {
    const g = game;
    const d = plantDef(p.id);
    switch (d.kind) {
      case 'producer':
        for (let i = 0; i < 4; i++) spawnSun(p.x + rand(-20, 20), p.y - 10, { value: 25 });
        break;
      case 'shooter':
        p.barrage = 2.2; p.bTimer = 0;
        break;
      case 'wall':
        p.hp = p.maxHp * 1.5;
        break;
      case 'mine':
        p.armed = true; p.armT = 0; p.popT = 0;
        break;
      case 'squash': {
        const z = g.zombies.filter((q) => !q.dying && q.row === p.row && q.x > p.x - 40 && q.x < W - 10).sort((a, b) => a.x - b.x)[0];
        if (!z || p.state !== 'idle') return false;
        startSquash(p, z);
        break;
      }
      case 'spike':
        for (const z of g.zombies) if (!z.dying && z.row === p.row && z.x < W) damageZombie(z, 200, { quiet: true });
        g.fx.push({ kind: 'spikes', row: p.row, x: p.x, t: 0, life: 0.7 });
        break;
      case 'chomper': {
        p.chew = 0; p.biteT = 0;
        const zs = g.zombies.filter((q) => !q.dying && q.row === p.row && q.x - p.x >= -20 && q.x - p.x <= CELL_W * 3 && q.type !== 'ong_dia');
        zs.slice(0, 3).forEach((z) => killZombie(z, 'eat'));
        if (zs.length) { p.chew = 3; sfx.gulp(); }
        break;
      }
      case 'torch':
        for (const z of g.zombies) if (!z.dying && z.row === p.row && z.x > p.x && z.x < W) damageZombie(z, 300, { boom: true });
        g.fx.push({ kind: 'firewave', row: p.row, x: p.x, t: 0, life: 0.8 });
        break;
      default:
        return false;
    }
    p.boost = 2.5;
    p.glow = 1;
    g.fx.push({ kind: 'text', x: p.x, y: p.y - 50, t: 0, life: 1, text: 'SIÊU CẤP!', color: '#ffeb3b' });
    sfx.power();
    return true;
  }

  function useItem(id, plant) {
    const g = game;
    if (!g.items[id]) { sfx.nope(); return false; }
    const def = DATA.items[id];
    if (id === 'banh_than') {
      if (!plant || !applyPlantFood(plant)) { sfx.nope(); return false; }
    } else if (id === 'mua_sao') {
      const zs = g.zombies.filter((z) => !z.dying && z.x < W - 10);
      if (!zs.length) { sfx.nope(); return false; }
      zs.forEach((z, i) => {
        const delay = 0.08 * i;
        g.fx.push({ kind: 'meteor', x: z.x, y: zGroundY(z) - 50, t: -delay, life: 0.6 + delay });
        g.pending.push({ t: 0.5 + delay, fn: () => { if (!z.dying) damageZombie(z, def.damage, { boom: true }); } });
      });
      sfx.meteor();
    } else if (id === 'gio_hang') {
      for (const z of g.zombies) {
        if (z.dying || z.x > W) continue;
        if (z.jumping) continue;
        z.x = Math.min(W + 20, z.x + def.push);
        z.slow = Math.max(z.slow, def.slow);
        z.eating = false;
      }
      g.fx.push({ kind: 'wind', t: 0, life: 1.1 });
      sfx.wind();
    } else if (id === 'tra_sen') {
      if (!g.plants.length) { sfx.nope(); return false; }
      for (const p of g.plants) {
        if (p.hp < p.maxHp) p.hp = p.maxHp;
        g.fx.push({ kind: 'heal', x: p.x, y: p.y, t: 0, life: 1 });
      }
      sfx.sun();
    }
    g.items[id]--;
    return true;
  }

  // =========================================================== VẼ KHUNG HÌNH
  const PHUONG_POS = { x: 58, y: LAWN_Y + 312 };

  function render() {
    const g = game;
    const t = performance.now() / 1000;
    ctx.save();
    if (g && g.shake > 0) ctx.translate(rand(-5, 5), rand(-4, 4));
    const time = g ? g.L.time : 'night';
    ctx.drawImage(getBackground(time), 0, 0, W, H);
    if (!g) { ctx.restore(); return; }

    // ông chủ Phương đứng trước cửa
    ctx.save(); ctx.translate(PHUONG_POS.x, PHUONG_POS.y); ctx.scale(1.15, 1.15);
    drawPhuong(ctx, g.t, g.mood);
    ctx.restore();

    if ((g.selected || g.shovel) && g.hover) {
      const { r, c } = g.hover;
      ctx.fillStyle = g.shovel ? 'rgba(255,80,80,.18)' : 'rgba(255,255,255,.18)';
      ctx.fillRect(LAWN_X + c * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(LAWN_X, LAWN_Y + r * CELL_H, COLS * CELL_W, CELL_H);
    }
    if (g.itemSel === 'banh_than' && g.hover) {
      const p = g.grid[g.hover.r][g.hover.c];
      if (p) ell(ctx, p.x, p.y, 44, 44, 'rgba(255,235,59,.25)', '#ffeb3b', 2);
    }

    for (const m of g.mowers) if (m.state !== 'gone') drawMower(ctx, m, g.t);

    for (let r = 0; r < ROWS; r++) {
      for (const p of g.plants) {
        if (p.row !== r) continue;
        if (p.boost > 0) {
          const a = Math.min(1, p.boost) * (0.5 + 0.2 * Math.sin(g.t * 12));
          const gr = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, 50);
          gr.addColorStop(0, `rgba(255,241,118,${a})`); gr.addColorStop(1, 'rgba(255,241,118,0)');
          ell(ctx, p.x, p.y, 50, 50, gr);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        const age = g.t - p.born;
        if (age < 0.25) { const s = 0.6 + age * 1.6; ctx.scale(s, s); }
        PLANT_DRAW[p.id](ctx, g.t + p.phase, p);
        ctx.restore();
        const k0 = plantDef(p.id).kind;
        if (p.hp < p.maxHp && k0 !== 'bomb' && k0 !== 'spike') {
          const w = 44, k = clamp(p.hp / p.maxHp, 0, 1);
          rrect(ctx, p.x - w / 2, p.y + 38, w, 5, 2, 'rgba(0,0,0,.4)');
          rrect(ctx, p.x - w / 2, p.y + 38, w * k, 5, 2, k > 0.5 ? '#76ff03' : k > 0.25 ? '#ffc400' : '#ff3d00');
        } else if (p.hp > p.maxHp) {
          ell(ctx, p.x, p.y, 38, 38, null, 'rgba(255,215,64,.8)', 3);
        }
      }
      const zs = g.zombies.filter((z) => z.row === r).sort((a, b) => b.x - a.x);
      for (const z of zs) {
        if (z.squashed) {
          ctx.save(); ctx.translate(z.x, zGroundY(z)); ctx.scale(1.25, 0.22);
          ctx.globalAlpha = 1 - clamp((z.dieT - 0.6) / 0.8, 0, 1);
          ctx.translate(-z.x, -zGroundY(z));
          const zz = Object.assign({}, z, { dying: false, squashed: false });
          drawZombie(ctx, zz, g.t);
          ctx.restore();
        } else drawZombie(ctx, z, g.t);
      }
    }

    for (const b of g.bullets) drawBullet(ctx, b, g.t);
    drawFx(g);

    for (const d of g.drops) {
      const blink = d.mode === 'rest' && d.life < 3 && Math.sin(d.life * 20) < 0;
      ctx.save(); ctx.globalAlpha = blink ? 0.4 : 1;
      ctx.translate(d.x, d.y + (d.mode === 'rest' ? Math.sin(d.t * 4) * 4 - Math.max(0, 0.4 - d.t) * 60 : 0));
      ell(ctx, 0, 0, 26, 26, 'rgba(255,255,255,.25)', 'rgba(255,235,59,.9)', 2);
      drawItemIcon(ctx, d.id, g.t, 0.9);
      ctx.restore();
    }

    for (const s of g.suns) {
      const a = s.mode === 'rest' && s.life < 2 ? (Math.sin(s.life * 20) > 0 ? 0.9 : 0.4) : 1;
      drawMoonlight(ctx, s.x, s.y, g.t + s.x * 0.01, a, s.mode === 'collect' ? 0.8 : 1);
    }

    if (g.reward) drawReward(g);

    drawHUD(g, t);

    if (g.selected && mouse.inside) {
      if (g.hover) {
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.translate(colCX(g.hover.c), rowCY(g.hover.r));
        PLANT_DRAW[g.selected](ctx, g.t, null);
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = 0.85;
      ctx.translate(mouse.x, mouse.y); ctx.scale(0.8, 0.8);
      PLANT_DRAW[g.selected](ctx, g.t, null);
      ctx.restore();
    }
    if (g.shovel && mouse.inside) drawShovel(ctx, mouse.x - 10, mouse.y - 30, 1);
    if (g.itemSel && mouse.inside) {
      ctx.save(); ctx.translate(mouse.x, mouse.y); drawItemIcon(ctx, g.itemSel, g.t, 1.1); ctx.restore();
    }

    if (g.state === 'ready') {
      const k = g.readyT;
      const s = k < 0.8 ? 'Sẵn sàng...' : k < 1.6 ? 'Chuẩn bị...' : 'BẢO VỆ ÔNG CHỦ!';
      const size = k < 1.6 ? 52 : 64;
      const sc = 1 + (k % 0.8) * 0.3;
      ctx.save(); ctx.translate(W / 2, LAWN_Y + (LAWN_B - LAWN_Y) / 2); ctx.scale(sc, sc);
      text(ctx, s, 0, 0, size, k < 1.6 ? '#fff59d' : '#ff5252', 'center', '#4a0000');
      ctx.restore();
    }
    if (g.banner) {
      const b = g.banner;
      const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.dur - 0.5 ? (b.dur - b.t) / 0.5 : 1;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(W / 2, LAWN_Y + (LAWN_B - LAWN_Y) / 2 - 20);
      const sc = 1 + Math.max(0, 0.3 - b.t) * 2;
      ctx.scale(sc, sc);
      text(ctx, b.text, 0, 0, b.size, b.color, 'center', '#2a0000');
      ctx.restore();
    }
    if (paused && g.state !== 'lost') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function fxPos(f) {
    const tt = Math.max(0, f.t);
    const x = f.x + f.vx * tt;
    const y = Math.min(f.ground, f.y + f.vy * tt + 0.5 * 700 * tt * tt);
    const landed = y >= f.ground;
    return { x, y, rot: landed ? f.spin * 0.35 : f.spin * tt, a: 1 - clamp((f.t - f.life + 0.4) / 0.4, 0, 1) };
  }

  function drawFx(g) {
    for (const f of g.fx) {
      if (f.t < 0) continue;
      const k = f.t / f.life;
      if (f.kind === 'splat') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + f.x;
          ell(ctx, f.x + Math.cos(a) * 12 * k, f.y + Math.sin(a) * 12 * k, 3 * (1 - k) + 0.5, 3 * (1 - k) + 0.5, f.color);
        }
      } else if (f.kind === 'boom') {
        const R = (f.big ? 140 : 75) * (0.4 + k);
        ctx.save(); ctx.globalAlpha = 1 - k;
        const gr = ctx.createRadialGradient(f.x, f.y, 5, f.x, f.y, R);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#ffeb3b'); gr.addColorStop(0.7, '#ff5722'); gr.addColorStop(1, 'rgba(255,87,34,0)');
        ell(ctx, f.x, f.y, R, R * 0.8, gr);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const d = R * 0.9;
          starPath(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.8, 8 * (1 - k) + 2, 3, 5, a);
          ctx.fillStyle = ['#ffeb3b', '#ff5252', '#40c4ff', '#69f0ae'][i % 4]; ctx.fill();
        }
        ctx.restore();
      } else if (f.kind === 'dust') {
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - k);
        const n = f.big ? 8 : 5;
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (i / (n - 1)) * Math.PI;
          ell(ctx, f.x + Math.cos(a) * 30 * k * (f.big ? 1.6 : 1), f.y + Math.sin(a) * 8 * k, 8, 6, '#a1887f');
        }
        ctx.restore();
      } else if (f.kind === 'smoke') {
        ctx.save(); ctx.globalAlpha = 0.7 * (1 - k);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          ell(ctx, f.x + Math.cos(a) * 40 * k, f.y + Math.sin(a) * 20 * k - k * 30, 16 * (0.5 + k), 12 * (0.5 + k), i % 2 ? '#5e35b1' : '#9575cd');
        }
        ctx.restore();
      } else if (f.kind === 'text') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        text(ctx, f.text, f.x, f.y - k * 30, 26, f.color, 'center', '#3e0000');
        ctx.restore();
      } else if (f.kind === 'head' || f.kind === 'arm' || f.kind === 'armor') {
        const q = fxPos(f);
        ctx.save(); ctx.globalAlpha = q.a;
        ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        if (f.kind === 'head') {
          ctx.scale(f.s, f.s);
          ctx.translate(6, 20);
          drawZHead(ctx, f.z, f.P, g.t, { detached: true, hat: f.z.type === 'nhoc' ? drawMask : null });
        } else if (f.kind === 'arm') {
          rrect(ctx, -12, -3.5, 14, 7, 3, f.P.skin, f.P.dark, 1.2);
          ell(ctx, -15, 0, 5.5, 5, f.P.skin, f.P.dark, 1.2);
          rrect(ctx, 1, -2, 5, 4, 2, '#eee8d5', '#8a8470', 0.8);
        } else {
          ctx.translate(6, 36);
          if (f.type === 'non_la') drawNonLa(ctx, null, true); else drawNoiDong(ctx, null, true);
        }
        ctx.restore();
      } else if (f.kind === 'meteor') {
        const kk = clamp(f.t / 0.5, 0, 1);
        if (kk < 1) {
          const sx = f.x + 140 * (1 - kk), sy = f.y - 380 * (1 - kk);
          const gr = ctx.createLinearGradient(sx + 60, sy - 160, sx, sy);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,241,118,.95)');
          ctx.strokeStyle = gr; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx + 60, sy - 160); ctx.lineTo(sx, sy); ctx.stroke();
          ctx.lineCap = 'butt';
          starPath(ctx, sx, sy, 14, 6, 5, g.t * 8); ctx.fillStyle = '#fff59d'; ctx.fill();
        } else {
          const kb = (f.t - 0.5) / Math.max(0.01, f.life - 0.5);
          ctx.save(); ctx.globalAlpha = 1 - kb;
          ell(ctx, f.x, f.y, 30 + kb * 30, 20 + kb * 20, 'rgba(255,235,59,.6)');
          ctx.restore();
        }
      } else if (f.kind === 'wind') {
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - k);
        ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
          const y = LAWN_Y + 20 + i * 40;
          const x = LAWN_X - 100 + k * (W + 100) - (i % 3) * 60;
          ctx.beginPath(); ctx.moveTo(x - 140, y); ctx.quadraticCurveTo(x - 60, y - 16, x, y); ctx.stroke();
          ctx.beginPath(); ctx.arc(x + 8, y - 8, 8, Math.PI, Math.PI * 2.4); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        ctx.restore();
      } else if (f.kind === 'heal') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 3; i++) {
          const x = f.x - 18 + i * 18, y = f.y - 10 - k * 40 - i * 6;
          ctx.fillStyle = '#69f0ae';
          ctx.fillRect(x - 2, y - 7, 4, 14); ctx.fillRect(x - 7, y - 2, 14, 4);
        }
        ctx.restore();
      } else if (f.kind === 'firewave') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        const y = rowCY(f.row) + 10;
        const gr = ctx.createLinearGradient(f.x, 0, W, 0);
        gr.addColorStop(0, 'rgba(255,152,0,.9)'); gr.addColorStop(1, 'rgba(255,87,34,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(f.x, y + 30);
        for (let x = f.x; x <= W; x += 20) ctx.lineTo(x, y - 20 - Math.sin(x * 0.1 + g.t * 20) * 14);
        ctx.lineTo(W, y + 30); ctx.fill();
        ctx.restore();
      } else if (f.kind === 'spikes') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        const y = rowCY(f.row) + 30;
        ctx.fillStyle = '#6d4c2b';
        for (let x = LAWN_X; x < LAWN_R; x += 16) {
          const h = 26 * Math.sin(Math.min(1, k * 3) * Math.PI);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - h); ctx.lineTo(x + 16, y); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawShovel(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(0.5);
    rrect(c, -3, -30, 6, 34, 2, '#8d6e63', '#3e2723', 1.5);
    rrect(c, -9, -36, 18, 7, 3, '#8d6e63', '#3e2723', 1.5);
    c.beginPath(); c.moveTo(-11, 4); c.lineTo(11, 4); c.lineTo(9, 22); c.quadraticCurveTo(0, 32, -9, 22); c.closePath();
    c.fillStyle = '#b0bec5'; c.fill(); c.strokeStyle = '#455a64'; c.lineWidth = 2; c.stroke();
    c.restore();
  }

  function cardRect(i) {
    return { x: CARD.x0 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
  }
  function shovelRect() {
    const n = game.cards.length;
    return { x: CARD.x0 + n * (CARD.w + CARD.gap) + 8, y: CARD.y + 6, w: 70, h: 76 };
  }
  function itemRect(i) {
    return { x: ITEM_X0 + i * 66, y: LAWN_B + 5, w: 58, h: H - LAWN_B - 10 };
  }
  const PHUONG_PANEL = { x: 792, y: 8, w: 200, h: 88 };

  function drawCard(c, id, x, y, w, h, t, sel) {
    const d = plantDef(id);
    rrect(c, x, y, w, h, 7, sel ? '#fff59d' : '#fff3d6', sel ? '#ff6f00' : '#5d3a17', sel ? 3 : 2);
    rrect(c, x + 4, y + 4, w - 8, 56, 5, '#2f2a5c');
    c.save();
    c.beginPath(); c.rect(x + 4, y + 4, w - 8, 56); c.clip();
    c.translate(x + w / 2 - 2, y + 36);
    drawPlantIcon(c, id, t);
    c.restore();
    text(c, String(d.cost), x + w / 2, y + h - 14, 16, '#3e2000');
  }

  function drawHUD(g, rt) {
    const sr = shovelRect();
    rrect(ctx, 2, 2, sr.x + sr.w + 8, 100, 10, '#6d4424', '#2e1a08', 3);
    rrect(ctx, 6, 6, sr.x + sr.w, 92, 8, '#8a5a30');
    rrect(ctx, SUN_BOX.x, SUN_BOX.y, SUN_BOX.w, SUN_BOX.h, 8, '#3a2a55', '#1d1030', 2);
    drawMoonlight(ctx, SUN_BOX.x + SUN_BOX.w / 2, SUN_BOX.y + 34, rt * 0.5, 1, 0.85);
    rrect(ctx, SUN_BOX.x + 6, SUN_BOX.y + 62, SUN_BOX.w - 12, 22, 6, '#fff8e1', '#6d4424', 2);
    text(ctx, String(g.sun), SUN_BOX.x + SUN_BOX.w / 2, SUN_BOX.y + 74, 18, '#3e2000');

    g.cards.forEach((cd, i) => {
      const r = cardRect(i);
      const d = plantDef(cd.id);
      const sel = g.selected === cd.id;
      drawCard(ctx, cd.id, r.x, r.y + (sel ? -3 : 0), r.w, r.h, 0, sel);
      if (g.sun < d.cost || cd.cd > 0) rrect(ctx, r.x, r.y, r.w, r.h, 7, 'rgba(0,0,0,.45)');
      if (cd.cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(r.x, r.y, r.w, r.h * clamp(cd.cd / (cd.max || 1), 0, 1));
      }
      text(ctx, String(i + 1), r.x + 8, r.y + 10, 10, '#fff8e1', 'center', '#2e1a08');
    });
    const hov = mouse.inside && inRect(mouse, sr);
    rrect(ctx, sr.x, sr.y, sr.w, sr.h, 8, g.shovel ? '#ffcc80' : hov ? '#a1887f' : '#7b5a3c', '#2e1a08', 2);
    if (!g.shovel) drawShovel(ctx, sr.x + sr.w / 2, sr.y + sr.h / 2 + 4, 1);
    text(ctx, 'Xẻng (S)', sr.x + sr.w / 2, sr.y + sr.h - 8, 11, '#fff8e1');

    // bảng ông chủ Phương
    const pp = PHUONG_PANEL;
    const moodCol = g.mood === 'panic' ? '#ff5252' : g.mood === 'scared' ? '#ffb300' : '#69f0ae';
    rrect(ctx, pp.x, pp.y, pp.w, pp.h, 10, 'rgba(30,15,50,.78)', moodCol, 2.5);
    ctx.save();
    ctx.beginPath(); ctx.rect(pp.x + 6, pp.y + 6, 64, pp.h - 12); ctx.clip();
    ctx.translate(pp.x + 38, pp.y + 150); ctx.scale(1.25, 1.25);
    drawPhuong(ctx, rt, g.mood);
    ctx.restore();
    text(ctx, 'Bảo vệ', pp.x + 136, pp.y + 18, 13, '#ffe0b2');
    text(ctx, 'Ông chủ Phương', pp.x + 136, pp.y + 38, 16, '#ffe082');
    const moodTxt = g.mood === 'panic' ? 'NGUY HIỂM!' : g.mood === 'scared' ? 'Lo lắng...' : 'Đang vui vẻ';
    rrect(ctx, pp.x + 82, pp.y + 54, 108, 24, 12, moodCol);
    text(ctx, moodTxt, pp.x + 136, pp.y + 66, 13, '#1a0f05');
    if (g.cheer) drawCheerBubble(g.cheer);

    // dải dưới: bảo vật + tiến trình
    rrect(ctx, 2, LAWN_B + 1, W - 4, H - LAWN_B - 3, 10, '#6d4424', '#2e1a08', 3);
    text(ctx, 'BẢO VẬT', 100, LAWN_B + (H - LAWN_B) / 2 - 8, 15, '#ffe082', 'center', '#2e1a08');
    text(ctx, 'phím Q W E R', 100, LAWN_B + (H - LAWN_B) / 2 + 10, 11, '#ffe0b2');
    ITEM_ORDER.forEach((id, i) => {
      const r = itemRect(i);
      const n = g.items[id] || 0;
      const sel = g.itemSel === id;
      rrect(ctx, r.x, r.y, r.w, r.h, 8, sel ? '#fff59d' : n ? '#f3e0bd' : '#8d7358', sel ? '#ff6f00' : '#2e1a08', sel ? 3 : 2);
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      if (!n) ctx.globalAlpha = 0.35;
      drawItemIcon(ctx, id, rt, 0.85);
      ctx.restore();
      rrect(ctx, r.x + r.w - 18, r.y - 4, 22, 16, 8, n ? '#e53935' : '#5d4037', '#2e1a08', 1.5);
      text(ctx, String(n), r.x + r.w - 7, r.y + 4, 11, '#fff');
      text(ctx, ITEM_KEYS[i], r.x + 8, r.y + 9, 10, '#3e2000');
    });
    const px = 760, py = LAWN_B + 26, pw = 220, ph = 16;
    text(ctx, g.L.name.split(':')[0], 690, py + ph / 2, 16, '#ffe082', 'center', '#2e1a08');
    rrect(ctx, px, py, pw, ph, 8, '#3e2a18', '#1a0f05', 2);
    const total = g.L.waves.length;
    let prog = (g.waveIndex + 1) / total;
    if (g.waveIndex < total - 1 && g.waveIndex >= -1) {
      const into = clamp(1 - g.nextWave / (g.waveIndex < 0 ? g.L.first_delay : g.L.wave_interval), 0, 1);
      prog = (g.waveIndex + 1 + into * 0.95) / total;
    }
    const fillW = (pw - 4) * clamp(prog, 0, 1);
    rrect(ctx, px + pw - 2 - fillW, py + 2, Math.max(4, fillW), ph - 4, 6, '#76ff03');
    for (const fi of g.L.flags) {
      const fx = px + pw - ((fi + 1) / total) * pw;
      const up = g.waveIndex >= fi ? 4 : 0;
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx, py + ph); ctx.lineTo(fx, py - 12 - up); ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath(); ctx.ellipse(fx + 6, py - 6 - up, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.fillRect(fx + 5, py - 1 - up, 2, 4);
    }
    const hx = px + pw - 2 - fillW;
    ell(ctx, hx, py + ph / 2, 10, 10, ZSKIN, '#3d5226', 2);
    ell(ctx, hx - 3, py + ph / 2 - 2, 2.5, 2.5, '#fff'); ell(ctx, hx + 3, py + ph / 2 - 2, 2.5, 2.5, '#fff');

    // tooltip
    if (mouse.inside && !g.selected && !g.itemSel) {
      g.cards.forEach((cd, i) => {
        const r = cardRect(i);
        if (!inRect(mouse, r)) return;
        const d = plantDef(cd.id);
        tooltip(r.x - 20, r.y + r.h + 8, `${d.name} — ${d.cost}`, d.desc,
          cd.cd > 0 ? 'Đang hồi...' : g.sun < d.cost ? 'Thiếu ánh trăng' : '');
      });
      ITEM_ORDER.forEach((id, i) => {
        const r = itemRect(i);
        if (!inRect(mouse, r)) return;
        const d = DATA.items[id];
        tooltip(r.x - 20, r.y - 78, `${d.name} (${ITEM_KEYS[i]})`, d.desc, g.items[id] ? '' : 'Hết rồi');
      });
    }
  }

  function wrapLines(c, s, maxW, size) {
    c.font = `bold ${size}px "Trebuchet MS", Arial, sans-serif`;
    const out = [];
    let line = '';
    for (const w of s.split(' ')) {
      const test = line ? line + ' ' + w : w;
      if (c.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function drawCheerBubble(ch) {
    const pp = PHUONG_PANEL;
    const a = ch.t < 0.25 ? ch.t / 0.25 : ch.t > ch.dur - 0.5 ? (ch.dur - ch.t) / 0.5 : 1;
    const lines = wrapLines(ctx, ch.text, pp.w - 24, 13);
    const bh = 14 + lines.length * 17;
    const x = pp.x, y = pp.y + pp.h + 12 + (1 - Math.min(1, ch.t * 4)) * -8;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = '#fffde7';
    ctx.beginPath(); ctx.moveTo(x + 34, y); ctx.lineTo(x + 44, y - 10); ctx.lineTo(x + 54, y); ctx.fill();
    rrect(ctx, x, y, pp.w, bh, 10, '#fffde7', '#ff6f00', 2);
    lines.forEach((ln, i) => text(ctx, ln, x + pp.w / 2, y + 15 + i * 17, 13, '#4e1c00'));
    ctx.restore();
  }

  function tooltip(x, y, title, desc, note) {
    const tw = 280, tx = clamp(x, 4, W - tw - 4);
    rrect(ctx, tx, y, tw, 70, 8, 'rgba(255,248,225,.97)', '#5d3a17', 2);
    text(ctx, title, tx + 10, y + 16, 14, '#b71c1c', 'left');
    wrapText(ctx, desc, tx + 10, y + 36, tw - 20, 16, 12, '#3e2000');
    if (note) text(ctx, note, tx + tw - 10, y + 16, 11, '#555', 'right');
  }

  const ZSKIN = '#9cb87a';

  function wrapText(c, s, x, y, maxW, lh, size, color) {
    c.font = `${size}px "Trebuchet MS", Arial, sans-serif`;
    const words = s.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (c.measureText(test).width > maxW && line) {
        text(c, line, x, y, size, color, 'left', null, 'normal');
        line = w; y += lh;
      } else line = test;
    }
    if (line) text(c, line, x, y, size, color, 'left', null, 'normal');
  }

  // Quần túi hộp rằn ri ống rộng: phần thưởng của ông chủ Phương
  let camoBlobs = null;
  function camoPattern() {
    if (camoBlobs) return camoBlobs;
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cols = ['#2b2c1f', '#6f6c47', '#3d4029', '#8a855d', '#252619'];
    camoBlobs = [];
    for (let i = 0; i < 70; i++) {
      const pts = [];
      const n = 7 + Math.floor(rnd() * 4);
      const r = 5 + rnd() * 9;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = r * (0.55 + rnd() * 0.7);
        pts.push([Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.8]);
      }
      camoBlobs.push({ x: -56 + rnd() * 112, y: -66 + rnd() * 132, rot: (rnd() - 0.5) * 0.8, pts, col: cols[i % cols.length] });
    }
    return camoBlobs;
  }

  function pantsPath(c) {
    c.beginPath();
    c.moveTo(-34, -60); c.lineTo(34, -60);
    c.quadraticCurveTo(42, -20, 44, 10);
    c.lineTo(54, 64);
    c.quadraticCurveTo(30, 70, 7, 64);
    c.lineTo(3, -6);
    c.lineTo(-3, -6);
    c.lineTo(-7, 64);
    c.quadraticCurveTo(-30, 70, -54, 64);
    c.lineTo(-44, 10);
    c.quadraticCurveTo(-42, -20, -34, -60);
    c.closePath();
  }

  function drawCargoPocket(c, side) {
    c.save(); c.scale(side, 1);
    c.translate(40, 0);
    // túi hộp phồng ra ngoài
    c.beginPath();
    c.moveTo(-8, -12); c.lineTo(12, -12); c.lineTo(14, 26); c.quadraticCurveTo(2, 30, -9, 26); c.closePath();
    c.fillStyle = 'rgba(40,42,28,.55)'; c.fill();
    c.strokeStyle = '#1c1d14'; c.lineWidth = 1.6; c.stroke();
    c.setLineDash([2, 2]); c.strokeStyle = 'rgba(214,200,150,.7)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-6, -8); c.lineTo(10, -8); c.lineTo(12, 23); c.stroke();
    c.setLineDash([]);
    // nắp túi
    c.beginPath(); c.moveTo(-10, -20); c.lineTo(14, -20); c.lineTo(15, -9); c.lineTo(-10, -9); c.closePath();
    c.fillStyle = 'rgba(58,60,40,.85)'; c.fill(); c.strokeStyle = '#1c1d14'; c.lineWidth = 1.6; c.stroke();
    c.restore();
  }

  function drawCamoPants(c, t) {
    // ánh sáng phía sau
    ell(c, 0, 0, 72, 76, 'rgba(255,241,160,.18)');
    c.save();
    c.rotate(Math.sin(t * 1.5) * 0.03);
    pantsPath(c);
    c.fillStyle = '#56593b'; c.fill();
    c.save(); pantsPath(c); c.clip();
    for (const b of camoPattern()) {
      c.save(); c.translate(b.x, b.y); c.rotate(b.rot);
      c.beginPath(); b.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      c.fillStyle = b.col; c.fill();
      c.restore();
    }
    // bạc màu kiểu wash denim
    const wash = c.createRadialGradient(-10, -20, 10, 0, 0, 90);
    wash.addColorStop(0, 'rgba(255,255,230,.22)'); wash.addColorStop(0.6, 'rgba(255,255,230,0)'); wash.addColorStop(1, 'rgba(0,0,0,.35)');
    c.fillStyle = wash; c.fillRect(-60, -70, 120, 140);
    // ly quần + nếp gấp
    c.strokeStyle = 'rgba(20,20,12,.55)'; c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-18, -54); c.quadraticCurveTo(-22, 0, -28, 60);
    c.moveTo(18, -54); c.quadraticCurveTo(22, 0, 28, 60);
    c.moveTo(-40, 30); c.lineTo(-30, 36); c.moveTo(40, 30); c.lineTo(30, 36);
    c.stroke();
    // gấu quần sáng màu
    c.fillStyle = 'rgba(200,190,140,.25)';
    c.fillRect(-60, 58, 120, 8);
    c.restore();
    pantsPath(c);
    c.strokeStyle = '#17180f'; c.lineWidth = 2.2; c.stroke();
    // cạp quần, đỉa, cúc, khoá
    rrect(c, -35, -64, 70, 9, 2, '#4a4c33', '#17180f', 1.6);
    [-26, -12, 12, 26].forEach((x) => rrect(c, x - 2, -66, 4, 12, 1, '#3d3f2a', '#17180f', 1));
    ell(c, 0, -59.5, 3, 3, '#c9b37a', '#5a4a1e', 1);
    c.strokeStyle = 'rgba(214,200,150,.8)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -55); c.lineTo(0, -24); c.quadraticCurveTo(4, -20, 8, -24); c.lineTo(8, -54); c.stroke();
    drawCargoPocket(c, 1);
    drawCargoPocket(c, -1);
    c.restore();
    // lấp lánh
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      c.save(); c.globalAlpha = Math.sin(k * Math.PI);
      starPath(c, -46 + i * 44, -60 + i * 30 - k * 10, 5, 2); c.fillStyle = '#fff59d'; c.fill();
      c.restore();
    }
  }

  function drawRewardIcon(c, id, t) {
    if (id === 'quan_ran_ri') { c.save(); c.scale(0.75, 0.75); drawCamoPants(c, t); c.restore(); return; }
    if (id === 'trophy') {
      ell(c, 0, 0, 60, 60, 'rgba(255,235,59,.25)');
      c.save(); c.scale(1.3, 1.3);
      c.strokeStyle = '#6d4c41'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, -46); c.lineTo(0, -32); c.stroke();
      ell(c, 0, -2, 30, 30, '#ffca28', '#e65100', 3);
      c.strokeStyle = '#e65100'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, -2, 14, 30, 0, 0, Math.PI * 2); c.stroke();
      rrect(c, -14, -34, 28, 6, 2, '#c62828');
      rrect(c, -14, 26, 28, 6, 2, '#c62828');
      starPath(c, 0, -2, 12, 5); c.fillStyle = '#fff59d'; c.fill();
      c.restore();
      return;
    }
    drawCard(c, id, -34, -46, 68, 92, t, true);
  }

  function drawReward(g) {
    const r = g.reward;
    ctx.save();
    ctx.translate(r.x, r.y + (r.taken ? 0 : Math.sin(r.t * 3) * 4));
    const s = r.taken ? 1 + Math.min(1, r.t) : 1;
    ctx.scale(s, s);
    ctx.save();
    ctx.rotate(r.t * 0.6);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = 'rgba(255,245,160,.35)';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -80); ctx.lineTo(8, 0); ctx.fill();
    }
    ctx.restore();
    drawRewardIcon(ctx, g.L.reward, g.t);
    ctx.restore();
    if (!r.taken) text(ctx, 'Bấm để nhận!', r.x, r.y + 64, 18, '#fff59d', 'center', '#4a2000');
  }

  function drawPortrait(c, who, t) {
    if (who !== 'phuong') { drawPortraitBase(c, who, t); return; }
    c.clearRect(0, 0, 160, 160);
    c.save(); c.translate(80, 196); c.scale(1.6, 1.6);
    drawPhuong(c, t, 'happy');
    c.restore();
  }

  // ============================================================ NHẬP LIỆU
  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function toGame(e) {
    const rc = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) / rc.width) * W, y: ((e.clientY - rc.top) / rc.height) * H };
  }
  function cellAt(p) {
    if (p.x < LAWN_X || p.x >= LAWN_R || p.y < LAWN_Y || p.y >= LAWN_B) return null;
    return { c: Math.floor((p.x - LAWN_X) / CELL_W), r: Math.floor((p.y - LAWN_Y) / CELL_H) };
  }
  function clearSelection() { if (game) { game.selected = null; game.shovel = false; game.itemSel = null; } }

  function pressItem(id) {
    const g = game;
    if (!g.items[id]) { sfx.nope(); return; }
    if (DATA.items[id].target === 'plant') {
      g.itemSel = g.itemSel === id ? null : id;
      g.selected = null; g.shovel = false;
      sfx.select();
    } else {
      clearSelection();
      useItem(id);
    }
  }
  function pressCard(i) {
    const g = game;
    const cd = g.cards[i];
    const d = plantDef(cd.id);
    if (g.selected === cd.id) { g.selected = null; return; }
    if (cd.cd > 0 || g.sun < d.cost) { sfx.nope(); return; }
    clearSelection();
    g.selected = cd.id; sfx.select();
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
    if (game) game.hover = cellAt(p);
  });
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; if (game) game.hover = null; });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); clearSelection(); });

  canvas.addEventListener('pointerdown', (e) => {
    if (!game || paused) return;
    audio();
    if (actx && actx.state === 'suspended') actx.resume();
    if (e.button === 2) return;
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
    const g = game;
    g.hover = cellAt(p);
    if (g.state === 'ready' || g.state === 'lost' || g.state === 'story') return;

    if (g.reward && !g.reward.taken) {
      if (Math.hypot(p.x - g.reward.x, p.y - g.reward.y) < 60) {
        g.reward.taken = true; g.reward.t = 0; sfx.win();
      }
      return;
    }
    for (const d of g.drops) {
      if (d.mode === 'rest' && Math.hypot(d.x - p.x, d.y - p.y) < 32) { d.mode = 'collect'; sfx.sun(); return; }
    }
    for (let i = g.suns.length - 1; i >= 0; i--) {
      const s = g.suns[i];
      if (s.mode !== 'collect' && Math.hypot(s.x - p.x, s.y - p.y) < 34) {
        s.mode = 'collect'; sfx.sun();
        return;
      }
    }
    for (let i = 0; i < g.cards.length; i++) {
      if (inRect(p, cardRect(i))) { pressCard(i); return; }
    }
    if (inRect(p, shovelRect())) {
      const on = !g.shovel; clearSelection(); g.shovel = on; sfx.select();
      return;
    }
    for (let i = 0; i < ITEM_ORDER.length; i++) {
      if (inRect(p, itemRect(i))) { pressItem(ITEM_ORDER[i]); return; }
    }
    const cell = cellAt(p);
    if (cell && g.itemSel) {
      const pl = g.grid[cell.r][cell.c];
      if (pl && useItem(g.itemSel, pl)) g.itemSel = null;
      else sfx.nope();
      return;
    }
    if (cell && g.selected) {
      if (g.grid[cell.r][cell.c]) { sfx.nope(); return; }
      const cd = g.cards.find((k) => k.id === g.selected);
      const d = plantDef(g.selected);
      if (g.sun < d.cost || cd.cd > 0) { sfx.nope(); g.selected = null; return; }
      g.sun -= d.cost;
      cd.cd = d.cooldown; cd.max = d.cooldown;
      placePlant(g.selected, cell.r, cell.c);
      g.selected = null;
      return;
    }
    if (cell && g.shovel) {
      const pl = g.grid[cell.r][cell.c];
      if (pl) { removePlant(pl); sfx.shovel(); }
      g.shovel = false;
      return;
    }
    clearSelection();
  });

  window.addEventListener('keydown', (e) => {
    if (gift && $('screen-gift').classList.contains('show') && (e.key === 'Enter' || e.key === ' ') && $('btn-gift-done').hidden) { e.preventDefault(); tapGift(); return; }
    if (e.key === 'Escape') {
      if (game && (game.selected || game.shovel || game.itemSel)) { clearSelection(); return; }
      if (game && isPlaying()) togglePause();
    }
    if (!game || paused || !isPlaying() || game.state !== 'playing') return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= game.cards.length) pressCard(n - 1);
    const k = e.key.toUpperCase();
    const ii = ITEM_KEYS.indexOf(k);
    if (ii >= 0) pressItem(ITEM_ORDER[ii]);
    if (k === 'S') { const on = !game.shovel; clearSelection(); game.shovel = on; }
  });

  // ============================================================== MÀN HÌNH
  const overlays = ['screen-title', 'screen-story', 'screen-select', 'screen-pause', 'screen-lose', 'screen-win', 'screen-gift'];
  function showOverlay(id) {
    overlays.forEach((o) => $(o).classList.toggle('show', o === id));
  }
  function isPlaying() {
    return game && !overlays.some((o) => o !== 'screen-pause' && $(o).classList.contains('show')) && game.state !== 'lost';
  }
  function togglePause(force) {
    if (!game) return;
    paused = force !== undefined ? force : !paused;
    showOverlay(paused ? 'screen-pause' : null);
    $('btn-pause').textContent = paused ? '▶ Chạy' : '⏸ Dừng';
  }

  function buildLevelSelect() {
    const box = $('level-select');
    box.innerHTML = '';
    DATA.levels.forEach((L, i) => {
      const b = document.createElement('button');
      const locked = i + 1 > progress.unlocked;
      b.className = 'lvl-card' + (locked ? ' locked' : '');
      const won = progress.won.includes(L.id);
      b.innerHTML = `<span class="num">${locked ? '🔒' : L.id}</span>${L.name.replace(/^Màn \d+: /, '')}` +
        `<span class="stars">${won ? '🏮 Đã thắng' : locked ? 'Chưa mở' : i === DATA.levels.length - 1 ? '🎁 Hộp quà bí mật' : 'Sẵn sàng'}</span>`;
      b.disabled = locked;
      b.addEventListener('click', () => startStory(i));
      box.appendChild(b);
    });
    $('btn-start').textContent = progress.unlocked > 1 ? `Chơi tiếp (Màn ${Math.min(progress.unlocked, DATA.levels.length)})` : 'Bắt đầu phiêu lưu';
  }

  const NAMES = { cuoi: 'Chú Cuội', hang: 'Chị Hằng', tho: 'Thỏ Ngọc', phuong: 'Ông chủ Phương' };
  let story = null;
  function runStory(lines, done) {
    story = { lines, i: 0, done };
    showOverlay('screen-story');
    showStoryLine();
  }
  function showStoryLine() {
    const ln = story.lines[story.i];
    $('story-name').textContent = NAMES[ln.who] || ln.who;
    $('story-line').textContent = ln.text;
    story.who = ln.who;
    story.show = ln.show || null;
  }
  function advanceStory() {
    if (!story) return;
    story.i++;
    if (story.i >= story.lines.length) { const d = story.done; story = null; d(); }
    else showStoryLine();
  }
  $('screen-story').addEventListener('click', (e) => { if (e.target.id !== 'btn-skip') { audio(); advanceStory(); } });
  $('btn-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    if (story) { const d = story.done; story = null; d(); }
  });

  // --------------------------------------------------- chọn đội hình
  const lastPicks = {};
  let picking = null;
  function chooseTeam(i) {
    const L = DATA.levels[i];
    const max = cfg('max_slots');
    if (L.plants.length <= max) { startLevel(i, L.plants.slice()); return; }
    picking = { i, chosen: (lastPicks[i] || defaultPicks(L)).slice() };
    $('select-hint').textContent = `Chọn tối đa ${max} đồng minh cho trận này. Bấm vào thẻ để thêm hoặc bỏ.`;
    renderPicker();
    showOverlay('screen-select');
  }
  function cardCanvas(id, sel) {
    const cv = document.createElement('canvas');
    cv.width = 124; cv.height = 176;
    const c = cv.getContext('2d');
    c.scale(2, 2);
    drawCard(c, id, 0, 0, 62, 88, 0, sel);
    return cv;
  }
  function renderPicker() {
    const L = DATA.levels[picking.i];
    const max = cfg('max_slots');
    const chosenBox = $('select-chosen');
    const pool = $('select-pool');
    chosenBox.innerHTML = ''; pool.innerHTML = '';
    for (let k = 0; k < max; k++) {
      const id = picking.chosen[k];
      const b = document.createElement('button');
      b.className = 'seed' + (id ? '' : ' empty');
      if (id) {
        b.appendChild(cardCanvas(id, false));
        b.title = `${plantDef(id).name}: bấm để bỏ`;
        b.addEventListener('click', () => { picking.chosen = picking.chosen.filter((x) => x !== id); renderPicker(); });
      }
      chosenBox.appendChild(b);
    }
    L.plants.forEach((id) => {
      const on = picking.chosen.includes(id);
      const b = document.createElement('button');
      b.className = 'seed' + (on ? ' used' : '');
      b.appendChild(cardCanvas(id, false));
      const lbl = document.createElement('span');
      lbl.textContent = plantDef(id).name;
      b.appendChild(lbl);
      b.title = `${plantDef(id).name} (${plantDef(id).cost}): ${plantDef(id).desc}`;
      b.addEventListener('click', () => {
        if (on) picking.chosen = picking.chosen.filter((x) => x !== id);
        else if (picking.chosen.length < max) picking.chosen.push(id);
        else { sfx.nope(); return; }
        sfx.select();
        renderPicker();
      });
      pool.appendChild(b);
    });
    $('btn-go').disabled = picking.chosen.length === 0;
    $('btn-go').textContent = `Bắt đầu trận đấu! (${picking.chosen.length}/${max})`;
  }
  $('btn-go').addEventListener('click', () => {
    if (!picking || !picking.chosen.length) return;
    const L = DATA.levels[picking.i];
    const picks = L.plants.filter((id) => picking.chosen.includes(id));
    const i = picking.i;
    picking = null;
    startLevel(i, picks);
  });

  function startStory(i) {
    audio();
    newGame(i);
    game.state = 'story';
    runStory(DATA.levels[i].story, () => chooseTeam(i));
  }
  function startLevel(i, picks) {
    if (picks) lastPicks[i] = picks;
    newGame(i, picks || lastPicks[i]);
    showOverlay(null);
    paused = false;
    $('btn-pause').textContent = '⏸ Dừng';
  }

  function onWin() {
    const g = game;
    const L = g.L;
    if (!progress.won.includes(L.id)) progress.won.push(L.id);
    progress.unlocked = Math.max(progress.unlocked, Math.min(DATA.levels.length, g.idx + 2));
    saveProgress();
    const last = g.idx === DATA.levels.length - 1;
    const show = () => {
      $('win-title').textContent = last ? 'ÔNG CHỦ PHƯƠNG ĐÃ AN TOÀN!' : 'Chiến thắng!';
      $('win-text').textContent = last
        ? 'Phần thưởng: chiếc Quần Túi Hộp Rằn Ri ống rộng, quà của ông chủ Phương dành riêng cho người bảo vệ được nhà ông!'
        : `Ông chủ Phương an toàn! Bạn nhận được đồng minh mới: ${plantDef(L.reward).name}.`;
      const left = DATA.levels.length - 1 - g.idx;
      $('win-cheer').textContent = last
        ? 'Bạn đã chinh phục trọn 3 màn! Mặc chiếc quần rằn ri đi rước đèn thôi! 🏮'
        : pick(DATA.cheers.win_level).replace('{left}', left);
      $('btn-next').style.display = last ? 'none' : '';
      showOverlay('screen-win');
      rewardAnim = L.reward;
    };
    if (last) {
      const afterGift = () => (L.ending_after ? runStory(L.ending_after, show) : show());
      const gift = () => openGift(L.reward, afterGift);
      if (L.ending) runStory(L.ending, gift); else gift();
    } else show();
  }

  function showLose() {
    $('lose-cheer').textContent = pick(DATA.cheers.lose);
    $('lose-tip').textContent = pick(DATA.tips);
    showOverlay('screen-lose');
  }

  // ------------------------------------------------------ mở hộp quà bí mật
  const GIFT_HINTS = [
    'Bấm vào hộp quà để mở!',
    'Ơ... hộp quà rung rinh kìa! Bấm tiếp đi!',
    'Có ánh sáng lọt ra kìa! Bấm thêm lần nữa!',
    'Tùng... tùng... tùng... tùng...',
  ];
  let gift = null;
  function openGift(prize, done) {
    gift = { prize, done, taps: 0, shake: 0, rollT: -1, openT: -1, t: 0, confetti: [], revealed: false };
    $('gift-title').textContent = 'Hộp Quà Bí Mật của ông chủ Phương';
    $('gift-hint').textContent = GIFT_HINTS[0];
    $('btn-gift-done').hidden = true;
    showOverlay('screen-gift');
  }
  function tapGift() {
    if (!gift || gift.rollT >= 0 || gift.openT >= 0) return;
    audio();
    gift.taps++;
    gift.shake = 1;
    sfx.tick(gift.taps);
    $('gift-hint').textContent = GIFT_HINTS[Math.min(gift.taps, 3)];
    if (gift.taps >= 3) { gift.rollT = 0; sfx.drumroll(); }
  }
  function startReveal() {
    gift.openT = 0;
    sfx.fanfare();
    const cols = ['#ff5252', '#ffd54f', '#69f0ae', '#40c4ff', '#e040fb', '#ffffff'];
    for (let i = 0; i < 120; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 160 + Math.random() * 260;
      gift.confetti.push({ x: 180, y: 128, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: cols[i % cols.length], w: 4 + Math.random() * 4, h: 6 + Math.random() * 6 });
    }
  }

  function drawGiftBox(c, t, lidOff) {
    const body = c.createLinearGradient(-65, 0, 65, 0);
    body.addColorStop(0, '#b71c1c'); body.addColorStop(0.45, '#ef5350'); body.addColorStop(1, '#8e0000');
    rrect(c, -62, 0, 124, 96, 6, body, '#4a0000', 2.5);
    c.fillStyle = 'rgba(255,213,79,.55)';
    for (let i = 0; i < 6; i++) { starPath(c, -44 + (i % 3) * 44 + (i > 2 ? 22 : 0), 22 + (i > 2 ? 44 : 0), 6, 2.6); c.fill(); }
    rrect(c, -10, 0, 20, 96, 2, '#ffca28', '#8a6000', 1.5);
    if (lidOff) return;
    // nắp + nơ
    const lid = c.createLinearGradient(-72, -24, 72, 0);
    lid.addColorStop(0, '#c62828'); lid.addColorStop(0.5, '#ff6f60'); lid.addColorStop(1, '#8e0000');
    rrect(c, -72, -24, 144, 26, 6, lid, '#4a0000', 2.5);
    rrect(c, -10, -24, 20, 26, 2, '#ffca28', '#8a6000', 1.5);
    drawBow(c, t);
  }
  function drawBow(c, t) {
    c.save(); c.translate(0, -26);
    [-1, 1].forEach((sd) => {
      c.save(); c.scale(sd, 1); c.rotate(-0.35 + Math.sin(t * 3) * 0.04);
      ell(c, 20, -8, 22, 12, '#ffca28', '#8a6000', 2);
      ell(c, 18, -8, 10, 5, '#e0a800');
      c.restore();
    });
    ell(c, 0, -6, 9, 8, '#ffd54f', '#8a6000', 2);
    c.restore();
  }

  function renderGift(t, dt) {
    if (!gift || !$('screen-gift').classList.contains('show')) return;
    const g2 = gift;
    g2.t += dt;
    g2.shake = Math.max(g2.rollT >= 0 && g2.openT < 0 ? 0.9 : 0, g2.shake - dt * 2.2);
    if (g2.rollT >= 0 && g2.openT < 0) { g2.rollT += dt; if (g2.rollT > 1.15) startReveal(); }
    const c = $('gift-canvas').getContext('2d');
    c.save();
    c.clearRect(0, 0, 720, 560);
    c.scale(2, 2);
    const bg = c.createRadialGradient(180, 140, 10, 180, 140, 200);
    bg.addColorStop(0, 'rgba(255,241,160,.35)'); bg.addColorStop(1, 'rgba(255,241,160,0)');
    c.fillStyle = bg; c.fillRect(0, 0, 360, 280);
    const bx = 180, by = 150;
    const glowRays = (n, alpha, len) => {
      c.save(); c.translate(bx, by - 22); c.rotate(g2.t * 0.4);
      for (let i = 0; i < n; i++) {
        c.rotate((Math.PI * 2) / n);
        c.fillStyle = `rgba(255,245,170,${alpha})`;
        c.beginPath(); c.moveTo(-7, 0); c.lineTo(0, -len); c.lineTo(7, 0); c.fill();
      }
      c.restore();
    };
    if (g2.openT < 0) {
      if (g2.taps > 0) glowRays(g2.taps * 5, 0.12 * g2.taps, 120 + g2.taps * 20);
      const sh = g2.shake;
      c.save();
      c.translate(bx + Math.sin(g2.t * 55) * 6 * sh, by + Math.sin(g2.t * 2) * 3);
      c.rotate(Math.sin(g2.t * 42) * 0.07 * sh);
      ell(c, 0, 100, 70, 10, 'rgba(0,0,0,.35)');
      drawGiftBox(c, g2.t, false);
      if (g2.taps > 0) {
        c.fillStyle = `rgba(255,250,200,${0.3 * g2.taps})`;
        c.fillRect(-60, -2, 120, 4);
      }
      c.restore();
      text(c, '?', bx + 88, by - 70 + Math.sin(g2.t * 3) * 6, 38, '#fff59d', 'center', '#7a3b00');
      text(c, '?', bx - 92, by - 50 + Math.cos(g2.t * 3) * 6, 26, '#ffcc80', 'center', '#7a3b00');
    } else {
      g2.openT += dt;
      const o = g2.openT;
      glowRays(18, Math.min(0.45, o * 0.6), 220);
      // quà bay lên từ trong hộp
      const k = clamp((o - 0.2) / 1.1, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      c.save(); c.translate(bx, by + 30 - 120 * e); c.scale(0.25 + 0.75 * e, 0.25 + 0.75 * e);
      drawRewardIcon(c, g2.prize, g2.t);
      c.restore();
      c.save(); c.translate(bx, by);
      ell(c, 0, 100, 70, 10, 'rgba(0,0,0,.35)');
      drawGiftBox(c, g2.t, true);
      c.restore();
      // nắp bật tung
      if (o < 1.5) {
        c.save();
        c.translate(bx + 140 * o, by - 12 - 420 * o + 380 * o * o);
        c.rotate(o * 5);
        const lid = c.createLinearGradient(-72, -24, 72, 0);
        lid.addColorStop(0, '#c62828'); lid.addColorStop(1, '#8e0000');
        rrect(c, -72, -12, 144, 26, 6, lid, '#4a0000', 2.5);
        rrect(c, -10, -12, 20, 26, 2, '#ffca28', '#8a6000', 1.5);
        c.translate(0, 12); drawBow(c, g2.t);
        c.restore();
      }
      for (const p of g2.confetti) {
        p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.995;
        if (p.y > 300) continue;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }
      if (o > 1.6 && !g2.revealed) {
        g2.revealed = true;
        $('gift-title').textContent = 'QUẦN TÚI HỘP RẰN RI ỐNG RỘNG!';
        $('gift-hint').textContent = 'Bảo vật quý nhất của ông chủ Phương giờ là của bạn!';
        $('btn-gift-done').hidden = false;
        $('btn-gift-done').focus();
      }
    }
    c.restore();
  }
  $('gift-canvas').addEventListener('click', tapGift);
  $('btn-gift-done').addEventListener('click', () => {
    if (!gift) return;
    const d = gift.done;
    gift = null;
    d();
  });

  let rewardAnim = null;
  function renderRewardCanvas(t) {
    if (!rewardAnim || !$('screen-win').classList.contains('show')) return;
    const c = $('reward-canvas').getContext('2d');
    c.clearRect(0, 0, 180, 180);
    c.save(); c.translate(90, 92);
    c.rotate(t * 0.5);
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6);
      c.fillStyle = 'rgba(255,245,160,.3)';
      c.beginPath(); c.moveTo(-8, 0); c.lineTo(0, -90); c.lineTo(8, 0); c.fill();
    }
    c.restore();
    c.save(); c.translate(90, 92); c.scale(1.2, 1.2);
    drawRewardIcon(c, rewardAnim, t);
    c.restore();
  }

  $('btn-start').addEventListener('click', () => startStory(Math.min(progress.unlocked, DATA.levels.length) - 1));
  let resetArmed = false;
  $('btn-reset').addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      $('btn-reset').textContent = 'Bấm lần nữa để xoá tiến độ';
      setTimeout(() => { resetArmed = false; $('btn-reset').textContent = 'Chơi lại từ đầu'; }, 3000);
      return;
    }
    resetArmed = false;
    $('btn-reset').textContent = 'Chơi lại từ đầu';
    progress = { unlocked: 1, won: [] }; saveProgress(); buildLevelSelect();
  });
  $('btn-pause').addEventListener('click', () => { if (isPlaying()) togglePause(); });
  $('btn-resume').addEventListener('click', () => togglePause(false));
  $('btn-restart').addEventListener('click', () => startLevel(game.idx, game.picks));
  $('btn-retry').addEventListener('click', () => startLevel(game.idx, game.picks));
  const toMenu = () => { game = null; paused = false; picking = null; buildLevelSelect(); showOverlay('screen-title'); $('level-title').textContent = 'Thỏ Ngọc & Kỳ Lân vs Zombie'; };
  $('btn-quit').addEventListener('click', toMenu);
  $('btn-menu').addEventListener('click', toMenu);
  $('btn-lose-menu').addEventListener('click', toMenu);
  $('btn-win-menu').addEventListener('click', toMenu);
  $('btn-select-menu').addEventListener('click', toMenu);
  $('btn-next').addEventListener('click', () => startStory(game.idx + 1));
  $('btn-speed').addEventListener('click', () => {
    speed = speed === 1 ? 2 : 1;
    $('btn-speed').textContent = 'x' + speed;
  });
  $('btn-mute').addEventListener('click', () => {
    muted = !muted;
    $('btn-mute').textContent = muted ? '🔇' : '🔊';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying() && !paused && game.state === 'playing') togglePause(true);
  });

  // ============================================================== VÒNG LẶP
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (game && !paused && game.state !== 'story' && !$('screen-win').classList.contains('show') && !$('screen-select').classList.contains('show') && !$('screen-gift').classList.contains('show')) {
      for (let i = 0; i < speed; i++) update(dt);
    }
    render();
    if (story) {
      const pc = $('portrait').getContext('2d');
      if (story.show) {
        pc.clearRect(0, 0, 160, 160);
        pc.save(); pc.translate(80, 84); pc.scale(1.05, 1.05); drawRewardIcon(pc, story.show, t); pc.restore();
      } else drawPortrait(pc, story.who, t);
    }
    renderRewardCanvas(t);
    renderGift(t, dt);
    requestAnimationFrame(loop);
  }

  // Bảng điều khiển gỡ lỗi cho kiểm thử tự động
  window.__tt = {
    get game() { return game; },
    start: (i, picks) => startLevel(i, picks || DATA.levels[i].plants.slice()),
    spawn: (type, row, x) => spawnZombie(type, row, x || 0),
    plant: (id, r, c) => placePlant(id, r, c),
    item: (id, plant) => useItem(id, plant),
    step: (sec) => { for (let i = 0; i < sec * 60; i++) update(1 / 60); },
  };

  async function init() {
    setupCanvas();
    try {
      const res = await fetch('/api/game-data');
      DATA = await res.json();
    } catch (e) {
      $('level-select').textContent = 'Không tải được dữ liệu game từ máy chủ Flask.';
      return;
    }
    buildLevelSelect();
    requestAnimationFrame(loop);
  }
  init();
})();
