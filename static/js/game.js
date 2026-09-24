/* Thỏ Ngọc & Kỳ Lân vs Zombie — Đêm Trung Thu
 * Engine game kiểu Plants vs. Zombies, vẽ hoàn toàn bằng Canvas 2D.
 * Dữ liệu nhân vật / màn chơi lấy từ Flask: /api/game-data
 */
'use strict';
(() => {
  // ------------------------------------------------------------------ hằng số
  const W = 1000, H = 600;
  const LAWN_X = 190, LAWN_Y = 110, CELL_W = 84, CELL_H = 96, COLS = 9, ROWS = 5;
  const LAWN_R = LAWN_X + COLS * CELL_W;
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

  const PLANT_DRAW = {
    tho_ngoc: drawThoNgoc,
    tho_ban: (c, t, p) => drawShooterRabbit(c, t, p, false),
    tho_bang: (c, t, p) => drawShooterRabbit(c, t, p, true),
    banh_nuong: drawBanhNuong,
    banh_deo: drawBanhDeo,
    den_ong_sao: drawStarLantern,
    ky_lan: drawUnicorn,
  };

  // ------------------------------------------------------------ zombie
  const ZSKIN = '#9cb87a', ZSKIN_SLOW = '#8ab8e0', ZSKIN_FLASH = '#e6ffd0';

  function drawZombieBody(c, z, t) {
    const sk = z.flash > 0 ? ZSKIN_FLASH : z.slow > 0 ? ZSKIN_SLOW : ZSKIN;
    const walk = z.eating || z.smashing ? 0 : Math.sin(z.anim * 5);
    const coat = z.slow > 0 ? '#5f6f86' : '#6b5a3e';
    ell(c, 0, 2, 26, 7, 'rgba(0,0,0,.25)');
    // chân
    const leg = (dx, ang, col) => {
      c.save(); c.translate(dx, -36); c.rotate(ang);
      rrect(c, -5, 0, 10, 34, 3, col, '#2d2418', 1.5);
      rrect(c, -10, 30, 16, 7, 3, '#3b2d1f');
      c.restore();
    };
    leg(4, walk * 0.35, '#4e4a63');
    leg(-4, -walk * 0.35, '#5b5775');
    // thân
    c.save();
    c.translate(0, -36);
    c.rotate(-0.08 + (z.eating ? Math.sin(t * 12) * 0.05 : 0));
    rrect(c, -15, -44, 30, 46, 6, coat, '#2d2418', 2);
    c.fillStyle = '#e8e2d0';
    c.beginPath(); c.moveTo(-8, -44); c.lineTo(0, -26); c.lineTo(8, -44); c.fill();
    c.fillStyle = '#b71c1c';
    c.beginPath(); c.moveTo(-2, -40); c.lineTo(2, -40); c.lineTo(3, -22); c.lineTo(0, -18); c.lineTo(-3, -22); c.closePath(); c.fill();
    // vết rách
    c.fillStyle = '#3e3326';
    c.beginPath(); c.moveTo(8, -6); c.lineTo(13, -12); c.lineTo(15, -2); c.fill();
    // tay (giơ về phía trái)
    const armSwing = z.eating ? Math.sin(t * 14) * 0.35 : Math.sin(z.anim * 5 + 1) * 0.1;
    const arm = (dy, a, col) => {
      c.save(); c.translate(-6, -38 + dy); c.rotate(Math.PI + a);
      rrect(c, 0, -4, 28, 9, 4, col, '#2d2418', 1.5);
      ell(c, 30, 0, 6, 5, sk, '#3d5226', 1.5);
      c.restore();
    };
    if (z.type !== 'co') arm(4, -0.15 + armSwing, '#5d4d34');
    arm(0, 0.05 - armSwing, coat);
    // đầu
    const hb = z.eating ? Math.sin(t * 14) * 2 : Math.sin(z.anim * 5) * 1;
    c.translate(-6, -60 + hb);
    ell(c, 0, 0, 16, 17, sk, '#3d5226', 2);
    // tóc lơ thơ
    c.strokeStyle = '#2e2e1e'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(2, -16); c.lineTo(0, -24); c.moveTo(6, -15); c.lineTo(8, -22); c.stroke();
    // mắt
    ell(c, -7, -4, 5.5, 6, '#fffde7', '#3d5226', 1);
    ell(c, 3, -5, 4.5, 5, '#fffde7', '#3d5226', 1);
    ell(c, -9, -3, 1.8, 1.8, '#222');
    ell(c, 1, -4, 1.6, 1.6, '#222');
    // miệng
    const mo = z.eating ? 3 + Math.abs(Math.sin(t * 14)) * 5 : 4;
    rrect(c, -12, 5, 12, mo, 2, '#3a1010');
    c.fillStyle = '#fffde7';
    c.fillRect(-10, 5, 3, 3); c.fillRect(-5, 5, 3, 3);
    c.restore();
  }

  function drawArmorAndProps(c, z, t) {
    const hb = z.eating ? Math.sin(t * 14) * 2 : Math.sin(z.anim * 5) * 1;
    // vị trí đầu (xấp xỉ, đã tính xoay thân)
    const hx = -8, hy = -96 + hb;
    if (z.type === 'non_la' && z.armor > 0) {
      const dent = z.armor < z.maxArmor * 0.5;
      c.save(); c.translate(hx, hy - 8); c.rotate(-0.1);
      c.beginPath(); c.moveTo(0, -28); c.lineTo(26, 4); c.lineTo(-26, 4); c.closePath();
      c.fillStyle = dent ? '#cdb77a' : '#ecd9a0'; c.fill();
      c.strokeStyle = '#8a7340'; c.lineWidth = 2; c.stroke();
      c.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        c.beginPath(); c.moveTo(-26 + i * 2.5 * 2.6, 4 - i * 8); c.lineTo(26 - i * 2.5 * 2.6, 4 - i * 8); c.stroke();
      }
      if (dent) { c.strokeStyle = '#5d4a20'; c.beginPath(); c.moveTo(-6, -10); c.lineTo(2, -4); c.lineTo(-2, 2); c.stroke(); }
      c.restore();
      c.strokeStyle = '#8a7340'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(hx - 12, hy - 2); c.quadraticCurveTo(hx, hy + 22, hx + 10, hy - 2); c.stroke();
    }
    if (z.type === 'noi_dong' && z.armor > 0) {
      const dent = z.armor < z.maxArmor * 0.33 ? 2 : z.armor < z.maxArmor * 0.66 ? 1 : 0;
      c.save(); c.translate(hx, hy - 6);
      rrect(c, -19, -20, 38, 24, 4, dent ? '#a0612a' : '#c07a38', '#5a2f0e', 2);
      rrect(c, -22, 0, 44, 6, 3, '#8d5424', '#5a2f0e', 2);
      rrect(c, -27, -12, 8, 5, 2, '#5a2f0e'); rrect(c, 19, -12, 8, 5, 2, '#5a2f0e');
      c.fillStyle = 'rgba(255,230,180,.5)'; c.fillRect(-12, -17, 4, 16);
      if (dent >= 1) { c.strokeStyle = '#3a1c05'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, -20); c.lineTo(8, -12); c.lineTo(3, -6); c.stroke(); }
      if (dent >= 2) { c.beginPath(); c.moveTo(-14, -16); c.lineTo(-6, -10); c.stroke(); }
      c.restore();
    }
    if (z.type === 'co') {
      // cán + đèn cá chép
      c.save();
      c.translate(10, -40);
      c.strokeStyle = '#6d4c41'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(0, 10); c.lineTo(-2, -95); c.lineTo(22, -95); c.stroke();
      const sw = Math.sin(t * 3) * 0.15;
      c.translate(22, -95); c.rotate(sw);
      c.strokeStyle = '#333'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 8); c.stroke();
      // cá chép
      c.translate(0, 22);
      ell(c, 0, 0, 20, 12, '#ff7043', '#bf360c', 2);
      c.fillStyle = '#ffca28';
      c.beginPath(); c.moveTo(18, 0); c.lineTo(30, -10); c.lineTo(28, 10); c.closePath(); c.fill();
      ell(c, -11, -3, 3, 3, '#fff'); ell(c, -12, -3, 1.4, 1.4, '#000');
      c.strokeStyle = '#ffca28'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(-2, 0, 5, -1, 1); c.arc(6, 0, 5, -1, 1); c.stroke();
      ell(c, 0, 0, 26, 18, 'rgba(255,170,60,.25)');
      c.restore();
      // tay cầm
      ell(c, 8, -80, 6, 5, z.slow > 0 ? ZSKIN_SLOW : ZSKIN, '#3d5226', 1.5);
    }
  }

  function drawLionHead(c, z, t) {
    const hb = Math.sin(z.anim * 8) * 3;
    c.save();
    c.translate(-12, -98 + hb);
    // bờm tua rua
    const cols = ['#ffeb3b', '#ff9800', '#f44336'];
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.4 + (i / 11) * Math.PI * 1.2;
      c.strokeStyle = cols[i % 3]; c.lineWidth = 5;
      c.beginPath();
      c.moveTo(Math.cos(a) * 20, Math.sin(a) * 18);
      c.lineTo(Math.cos(a) * 36 + Math.sin(t * 6 + i) * 2, Math.sin(a) * 32);
      c.stroke();
    }
    ell(c, 0, 0, 28, 24, '#e53935', '#7f0000', 2.5);
    // trán vàng + sừng
    ell(c, 0, -12, 18, 10, '#ffd54f', '#c79100', 1.5);
    starPath(c, 0, -24, 7, 3); c.fillStyle = '#fff176'; c.fill();
    // mắt to
    ell(c, -12, -2, 8, 7, '#fff', '#222', 1.5);
    ell(c, 6, -2, 8, 7, '#fff', '#222', 1.5);
    ell(c, -14, -1, 3.5, 3.5, '#111'); ell(c, 4, -1, 3.5, 3.5, '#111');
    // mũi + miệng
    ell(c, -4, 8, 9, 6, '#ffca28', '#c79100', 1.5);
    rrect(c, -20, 13, 26, 8, 4, '#fff', '#7f0000', 1.5);
    // râu
    c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-18, 22); c.lineTo(-24, 34); c.moveTo(-10, 22); c.lineTo(-12, 36); c.stroke();
    c.restore();
    // vải thân lân phía sau
    c.save();
    c.fillStyle = '#e53935';
    c.beginPath();
    c.moveTo(4, -110 + hb); c.quadraticCurveTo(40, -90, 34, -40); c.lineTo(18, -40); c.quadraticCurveTo(22, -80, 4, -86);
    c.closePath(); c.fill();
    c.strokeStyle = '#ffd54f'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(34, -40); c.lineTo(18, -40); c.stroke();
    c.restore();
  }

  function drawOngDia(c, z, t) {
    const sk = z.flash > 0 ? ZSKIN_FLASH : z.slow > 0 ? ZSKIN_SLOW : ZSKIN;
    const walk = z.smashing ? 0 : Math.sin(z.anim * 3);
    ell(c, 0, 2, 44, 10, 'rgba(0,0,0,.3)');
    // chân
    const leg = (dx, ang) => {
      c.save(); c.translate(dx, -40); c.rotate(ang);
      rrect(c, -8, 0, 16, 40, 5, '#8d6e63', '#3e2723', 2);
      ell(c, -3, 40, 12, 6, sk, '#3d5226', 1.5);
      c.restore();
    };
    leg(10, walk * 0.25); leg(-10, -walk * 0.25);
    // bụng bự
    ell(c, 0, -80, 38, 44, '#ffeb3b', '#8a6d00', 2.5);
    ell(c, -4, -62, 30, 26, sk, '#3d5226', 2);
    ell(c, -8, -60, 3, 3, '#5d7a3a');
    // áo mở
    c.strokeStyle = '#8a6d00'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-30, -110); c.lineTo(-34, -40); c.moveTo(22, -110); c.lineTo(28, -40); c.stroke();
    // quạt mo (tay phải)
    let armA = -0.3;
    if (z.smashing) {
      const s = z.smashT;
      armA = s < 0.8 ? -0.3 - (s / 0.8) * 2.2 : -2.5 + Math.min(1, (s - 0.8) / 0.12) * 3.2;
    } else armA += Math.sin(z.anim * 3) * 0.15;
    c.save();
    c.translate(10, -108);
    c.rotate(armA);
    rrect(c, 0, -7, 40, 14, 6, sk, '#3d5226', 2);
    c.translate(44, 0);
    c.fillStyle = '#d7b377';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(34, -26); c.quadraticCurveTo(52, 0, 34, 26); c.closePath(); c.fill();
    c.strokeStyle = '#7a5a26'; c.lineWidth = 2; c.stroke();
    c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(4, 0); c.lineTo(40, i * 10); } c.stroke();
    c.restore();
    // tay trái
    c.save(); c.translate(-26, -104); c.rotate(Math.PI - 0.4 + Math.sin(z.anim * 3) * 0.1);
    rrect(c, 0, -7, 34, 14, 6, sk, '#3d5226', 2);
    c.restore();
    // đầu (mặt nạ Ông Địa)
    c.save();
    c.translate(-6, -142);
    ell(c, 0, 0, 30, 28, '#ffccbc', '#8d4a3a', 2.5);
    // mắt cười híp
    c.strokeStyle = '#3e2723'; c.lineWidth = 3;
    c.beginPath(); c.arc(-12, -4, 7, Math.PI + 0.3, -0.3); c.arc(12, -4, 7, Math.PI + 0.3, -0.3); c.stroke();
    // má hồng
    ell(c, -20, 8, 6, 4, 'rgba(244,67,54,.5)'); ell(c, 20, 8, 6, 4, 'rgba(244,67,54,.5)');
    // miệng cười to (có răng zombie)
    c.beginPath(); c.arc(0, 6, 15, 0.15, Math.PI - 0.15); c.closePath();
    c.fillStyle = '#5a0f0f'; c.fill();
    c.fillStyle = '#fff'; c.fillRect(-8, 7, 5, 4); c.fillRect(2, 7, 5, 4);
    // phần da zombie lộ ra dưới mặt nạ
    ell(c, 24, 18, 8, 6, sk);
    // tóc chỏm
    c.strokeStyle = '#212121'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-4, -27); c.quadraticCurveTo(0, -40, 8, -30); c.stroke();
    c.restore();
  }

  function drawZombie(c, z, t) {
    c.save();
    c.translate(z.x, rowCY(z.row) + 38 - (z.jumpY || 0));
    if (z.dying) {
      const k = clamp(z.dieT / 0.8, 0, 1);
      c.globalAlpha = 1 - clamp((z.dieT - 0.8) / 0.6, 0, 1);
      c.rotate(k * 1.4);
    }
    if (z.burnt) {
      // bị nổ: bóng đen tro tàn
      c.globalAlpha *= 0.9;
      const s = z.type === 'ong_dia' ? 1.3 : 1;
      c.scale(s, s);
      c.fillStyle = '#1b1b1b';
      rrect(c, -14, -80, 28, 80, 8, '#1b1b1b');
      ell(c, -6, -94, 16, 17, '#1b1b1b');
      ell(c, -11, -96, 3, 3, '#fff'); ell(c, -1, -97, 3, 3, '#fff');
      c.restore();
      return;
    }
    if (z.type === 'ong_dia') {
      c.scale(0.95, 0.95);
      drawOngDia(c, z, t);
    } else {
      drawZombieBody(c, z, t);
      drawArmorAndProps(c, z, t);
      if (z.type === 'mua_lan') drawLionHead(c, z, t);
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
  function drawPortrait(c, who, t) {
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

  function newGame(levelIdx) {
    const L = DATA.levels[levelIdx];
    game = {
      L, idx: levelIdx, t: 0, sun: L.start_sun,
      plants: [],
      grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
      zombies: [], bullets: [], suns: [], fx: [], floaters: [],
      mowers: Array.from({ length: ROWS }, (_, r) => ({ row: r, x: LAWN_X - 44, state: 'idle' })),
      cards: L.plants.map((id) => ({ id, cd: plantDef(id).start_cooldown, max: plantDef(id).start_cooldown || 1 })),
      selected: null, shovel: false,
      waveIndex: -1, nextWave: L.first_delay, waveHp: 1, sinceWave: 0, announced: -1,
      skyTimer: 5, state: 'ready', readyT: 0, banner: null, reward: null, groanT: 6,
      shake: 0, hover: null, lastRow: -1,
    };
    $('level-title').textContent = L.name;
    paused = false;
  }

  function spawnSun(x, y, from) {
    const g = game;
    if (from === 'sky') {
      g.suns.push({ x, y: -30, ty: y, vy: 0, value: 25, life: 9, mode: 'fall', age: 0 });
    } else {
      g.suns.push({ x, y, ty: y + 32, vx: rand(-40, 40), vy: -140, value: from.value || 25, life: 9, mode: 'pop', age: 0 });
    }
  }

  function placePlant(id, r, col) {
    const d = plantDef(id);
    const p = {
      id, row: r, col, x: colCX(col), y: rowCY(r), hp: d.hp, maxHp: d.hp,
      timer: d.kind === 'producer' ? d.first : d.kind === 'shooter' ? 0.6 : 0,
      armT: d.arm || 0, armed: false, popT: 0, fuseT: 0, recoil: 0, glow: 0,
      born: game.t, pending: [], dead: false, phase: Math.random() * 6,
    };
    game.plants.push(p);
    game.grid[r][col] = p;
    game.fx.push({ kind: 'dust', x: p.x, y: p.y + 28, t: 0, life: 0.4 });
    sfx.plant();
  }

  function removePlant(p) {
    if (p.dead) return;
    p.dead = true;
    if (game.grid[p.row][p.col] === p) game.grid[p.row][p.col] = null;
    game.plants = game.plants.filter((q) => q !== p);
  }

  function spawnZombie(type, row, xOff = 0) {
    const d = DATA.zombies[type];
    game.zombies.push({
      type, row, x: LAWN_R + 40 + xOff, hp: d.hp, maxHp: d.hp, armor: d.armor, maxArmor: d.armor,
      speed: d.speed, bite: d.bite, anim: Math.random() * 10, flash: 0, slow: 0,
      eating: false, dying: false, dieT: 0, burnt: false, jumped: false, jumping: false,
      jumpT: 0, jumpY: 0, smashing: false, smashT: 0, chompT: 0,
    });
  }

  function spawnWave(i) {
    const g = game;
    const list = g.L.waves[i];
    const isFlag = g.L.flags.includes(i);
    let hpSum = 0;
    const rows = [];
    list.forEach((type, k) => {
      let row;
      // rải đều các hàng, tránh dồn 1 hàng
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
    if (i === g.L.waves.length - 1) {
      g.banner = { text: 'ĐỢT CUỐI CÙNG!', t: 0, dur: 3, color: '#ff5252', size: 58 };
    }
  }

  function aliveZombieHp() {
    let s = 0;
    for (const z of game.zombies) if (!z.dying) s += z.hp + z.armor;
    return s;
  }

  function damageZombie(z, dmg, opts = {}) {
    if (z.dying) return;
    if (opts.boom) {
      z.hp -= dmg;
      if (z.hp + z.armor <= 0 || z.hp <= 0) { z.hp = 0; z.armor = 0; }
    } else if (z.armor > 0) {
      z.armor -= dmg;
      if (z.armor < 0) { z.hp += z.armor; z.armor = 0; }
      sfx.armor();
    } else {
      z.hp -= dmg;
      sfx.hit();
    }
    z.flash = 0.1;
    if (opts.slow) z.slow = Math.max(z.slow, opts.slow);
    if (z.hp <= 0) killZombie(z, opts.boom);
  }

  function killZombie(z, burnt) {
    if (z.dying) return;
    z.dying = true;
    z.burnt = !!burnt;
    z.dieT = 0;
    z.eating = false;
    game.lastDeath = { x: z.x, y: rowCY(z.row) };
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
      if (g.readyT > 2.4) g.state = 'playing';
      return;
    }
    g.t += dt;
    if (g.shake > 0) g.shake -= dt;
    for (const f of g.floaters) f.t += dt;
    g.floaters = g.floaters.filter((f) => f.t < f.life);
    if (g.banner) { g.banner.t += dt; if (g.banner.t > g.banner.dur) g.banner = null; }

    if (g.state === 'lost') {
      // zombie đi vào nhà
      g.loseT += dt;
      if (g.loser) { g.loser.x -= 25 * dt; g.loser.anim += dt; }
      if (g.loseT > 2.2 && !g.loseShown) { g.loseShown = true; showOverlay('screen-lose'); }
      return;
    }

    // thẻ hồi chiêu
    for (const cd of g.cards) cd.cd = Math.max(0, cd.cd - dt);

    // ánh trăng rơi từ trời
    if (g.state === 'playing') {
      g.skyTimer -= dt;
      if (g.skyTimer <= 0) {
        spawnSun(rand(LAWN_X + 30, LAWN_R - 40), rand(LAWN_Y + 40, H - 40), 'sky');
        g.skyTimer = g.L.sky_sun + rand(0, 3);
      }
    }

    // đợt zombie
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

    // tiếng rên
    g.groanT -= dt;
    if (g.groanT <= 0) { if (g.zombies.some((z) => !z.dying)) sfx.groan(); g.groanT = rand(5, 10); }

    updatePlants(dt);
    updateZombies(dt);
    updateBullets(dt);
    updateMowers(dt);
    updateSuns(dt);
    for (const f of g.fx) f.t += dt;
    g.fx = g.fx.filter((f) => f.t < f.life);

    // thắng?
    if (g.state === 'playing' && g.waveIndex === nWaves - 1 && !g.zombies.some((z) => !z.dying)) {
      g.state = 'reward';
      const ld = g.lastDeath || { x: LAWN_X + CELL_W * 6, y: rowCY(2) };
      g.reward = { x: clamp(ld.x, LAWN_X + 60, LAWN_R - 60), y: clamp(ld.y, LAWN_Y + 60, H - 70), t: 0, taken: false };
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

  function hasTargetInRow(row, x) {
    for (const z of game.zombies) {
      if (!z.dying && z.row === row && z.x > x - 10 && z.x < W - 10) return true;
    }
    return false;
  }

  function updatePlants(dt) {
    const g = game;
    for (const p of [...g.plants]) {
      const d = plantDef(p.id);
      p.recoil = Math.max(0, p.recoil - dt * 5);
      p.glow = Math.max(0, p.glow - dt);
      if (d.kind === 'producer') {
        p.timer -= dt;
        if (p.timer <= 0) {
          spawnSun(p.x + 10, p.y - 10, { value: d.value });
          p.timer = d.interval + rand(-1, 1);
          p.glow = 1;
        }
      } else if (d.kind === 'shooter') {
        p.timer -= dt;
        for (const pd of p.pending) pd.t -= dt;
        while (p.pending.length && p.pending[0].t <= 0) { p.pending.shift(); fire(p, d); }
        if (p.timer <= 0 && hasTargetInRow(p.row, p.x)) {
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
      }
    }
  }

  function fire(p, d) {
    const kind = d.bullet || 'cake';
    const oy = kind === 'star' ? -38 : 4;
    const ox = kind === 'star' ? 44 : 38;
    game.bullets.push({ row: p.row, x: p.x + ox, y: p.y + oy, dmg: d.damage, kind, slow: d.slow || 0 });
    p.recoil = 1;
    sfx.shoot();
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
        z.jumpY = Math.sin(k * Math.PI) * 90;
        if (k >= 1) { z.jumping = false; z.jumped = true; z.jumpY = 0; z.speed = DATA.zombies[z.type].speed_after || z.speed; }
        continue;
      }
      if (z.smashing) {
        const before = z.smashT;
        z.smashT += dt * sf;
        if (before < 0.9 && z.smashT >= 0.9) {
          if (z.smashTarget && !z.smashTarget.dead) {
            removePlant(z.smashTarget);
            g.fx.push({ kind: 'dust', x: z.smashTarget.x, y: z.smashTarget.y + 20, t: 0, life: 0.6, big: true });
          }
          g.shake = 0.3;
          sfx.smash();
        }
        if (z.smashT >= 1.5) { z.smashing = false; z.smashT = 0; }
        continue;
      }

      const reach = z.type === 'ong_dia' ? 62 : z.type === 'mua_lan' && !z.jumped ? 70 : 42;
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
        if (m.state === 'idle') { m.state = 'run'; sfx.mower(); }
        else if (m.state === 'gone' && z.x < LAWN_X - 60 && g.state === 'playing') {
          g.state = 'lost'; g.loseT = 0; g.loser = z; g.selected = null; g.shovel = false;
          sfx.lose();
        }
      }
    }
    g.zombies = g.zombies.filter((z) => !(z.dying && z.dieT > 1.4));
  }

  function updateBullets(dt) {
    const g = game;
    for (const b of g.bullets) {
      b.x += BULLET_SPEED * dt;
      let hit = null;
      for (const z of g.zombies) {
        if (z.dying || z.row !== b.row || z.jumping) continue;
        const left = z.type === 'ong_dia' ? z.x - 34 : z.x - 20;
        if (b.x >= left && b.x <= z.x + 30 && z.x < W) {
          if (!hit || z.x < hit.x) hit = z;
        }
      }
      if (hit) {
        damageZombie(hit, b.dmg, { slow: b.slow });
        b.dead = true;
        g.fx.push({ kind: 'splat', x: b.x, y: b.y, t: 0, life: 0.3, color: b.kind === 'ice' ? '#b3e5fc' : b.kind === 'star' ? '#fff59d' : '#e8b060' });
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
          killZombie(z, false);
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

  // =========================================================== VẼ KHUNG HÌNH
  function render() {
    const g = game;
    const t = performance.now() / 1000;
    ctx.save();
    if (g && g.shake > 0) ctx.translate(rand(-5, 5), rand(-4, 4));
    const time = g ? g.L.time : 'night';
    ctx.drawImage(getBackground(time), 0, 0, W, H);
    if (!g) { ctx.restore(); return; }

    // ô được chọn
    if ((g.selected || g.shovel) && g.hover) {
      const { r, c } = g.hover;
      ctx.fillStyle = g.shovel ? 'rgba(255,80,80,.18)' : 'rgba(255,255,255,.18)';
      ctx.fillRect(LAWN_X + c * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(LAWN_X, LAWN_Y + r * CELL_H, COLS * CELL_W, CELL_H);
    }

    // mowers
    for (const m of g.mowers) if (m.state !== 'gone') drawMower(ctx, m, g.t);

    // theo từng hàng: nhân vật rồi zombie
    for (let r = 0; r < ROWS; r++) {
      for (const p of g.plants) {
        if (p.row !== r) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        const age = g.t - p.born;
        if (age < 0.25) { const s = 0.6 + age * 1.6; ctx.scale(s, s); }
        PLANT_DRAW[p.id](ctx, g.t + p.phase, p);
        ctx.restore();
        // thanh máu khi bị gặm
        if (p.hp < p.maxHp && plantDef(p.id).kind !== 'bomb') {
          const w = 44, k = clamp(p.hp / p.maxHp, 0, 1);
          rrect(ctx, p.x - w / 2, p.y + 38, w, 5, 2, 'rgba(0,0,0,.4)');
          rrect(ctx, p.x - w / 2, p.y + 38, w * k, 5, 2, k > 0.5 ? '#76ff03' : k > 0.25 ? '#ffc400' : '#ff3d00');
        }
      }
      const zs = g.zombies.filter((z) => z.row === r).sort((a, b) => b.x - a.x);
      for (const z of zs) drawZombie(ctx, z, g.t);
    }

    for (const b of g.bullets) drawBullet(ctx, b, g.t);
    drawFx(g);

    // ánh trăng
    for (const s of g.suns) {
      const a = s.mode === 'rest' && s.life < 2 ? (Math.sin(s.life * 20) > 0 ? 0.9 : 0.4) : 1;
      drawMoonlight(ctx, s.x, s.y, g.t + s.x * 0.01, a, s.mode === 'collect' ? 0.8 : 1);
    }

    // phần thưởng
    if (g.reward) drawReward(g);

    drawHUD(g, t);

    // bóng mờ nhân vật đang cầm
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

    // chữ
    if (g.state === 'ready') {
      const k = g.readyT;
      const s = k < 0.8 ? 'Sẵn sàng...' : k < 1.6 ? 'Chuẩn bị...' : 'PHÒNG THỦ!';
      const size = k < 1.6 ? 52 : 76;
      const sc = 1 + (k % 0.8) * 0.3;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
      text(ctx, s, 0, 0, size, k < 1.6 ? '#fff59d' : '#ff5252', 'center', '#4a0000');
      ctx.restore();
    }
    if (g.banner) {
      const b = g.banner;
      const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.dur - 0.5 ? (b.dur - b.t) / 0.5 : 1;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(W / 2, H / 2 - 20);
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

  function drawFx(g) {
    for (const f of g.fx) {
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
      } else if (f.kind === 'text') {
        ctx.save(); ctx.globalAlpha = 1 - k;
        text(ctx, f.text, f.x, f.y - k * 30, 26, f.color, 'center', '#3e0000');
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

  function drawHUD(g, rt) {
    const n = g.cards.length;
    const sr = shovelRect();
    // khay gỗ
    rrect(ctx, 2, 2, sr.x + sr.w + 8, 100, 10, '#6d4424', '#2e1a08', 3);
    rrect(ctx, 6, 6, sr.x + sr.w, 92, 8, '#8a5a30');
    // ô ánh trăng
    rrect(ctx, SUN_BOX.x, SUN_BOX.y, SUN_BOX.w, SUN_BOX.h, 8, '#3a2a55', '#1d1030', 2);
    drawMoonlight(ctx, SUN_BOX.x + SUN_BOX.w / 2, SUN_BOX.y + 34, rt * 0.5, 1, 0.85);
    rrect(ctx, SUN_BOX.x + 6, SUN_BOX.y + 62, SUN_BOX.w - 12, 22, 6, '#fff8e1', '#6d4424', 2);
    text(ctx, String(g.sun), SUN_BOX.x + SUN_BOX.w / 2, SUN_BOX.y + 74, 18, '#3e2000');

    // thẻ
    g.cards.forEach((cd, i) => {
      const r = cardRect(i);
      const d = plantDef(cd.id);
      const afford = g.sun >= d.cost;
      const ready = cd.cd <= 0;
      const sel = g.selected === cd.id;
      rrect(ctx, r.x, r.y + (sel ? -3 : 0), r.w, r.h, 7, sel ? '#fff59d' : '#fff3d6', sel ? '#ff6f00' : '#5d3a17', sel ? 3 : 2);
      rrect(ctx, r.x + 4, r.y + 4 + (sel ? -3 : 0), r.w - 8, 56, 5, '#2f2a5c');
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x + 4, r.y + 4 + (sel ? -3 : 0), r.w - 8, 56); ctx.clip();
      ctx.translate(r.x + r.w / 2 - 2, r.y + 36 + (sel ? -3 : 0));
      const s = cd.id === 'ky_lan' ? 0.52 : cd.id === 'banh_nuong' ? 0.58 : 0.62;
      ctx.scale(s, s);
      if (cd.id === 'ky_lan') ctx.translate(-4, 18);
      PLANT_DRAW[cd.id](ctx, 0, null);
      ctx.restore();
      text(ctx, String(d.cost), r.x + r.w / 2, r.y + r.h - 14 + (sel ? -3 : 0), 16, '#3e2000');
      if (!afford || !ready) {
        rrect(ctx, r.x, r.y, r.w, r.h, 7, 'rgba(0,0,0,.45)');
      }
      if (!ready) {
        const k = cd.cd / (cd.max || 1);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(r.x, r.y, r.w, r.h * clamp(k, 0, 1));
      }
    });
    // xẻng
    const hov = mouse.inside && inRect(mouse, sr);
    rrect(ctx, sr.x, sr.y, sr.w, sr.h, 8, g.shovel ? '#ffcc80' : hov ? '#a1887f' : '#7b5a3c', '#2e1a08', 2);
    if (!g.shovel) drawShovel(ctx, sr.x + sr.w / 2, sr.y + sr.h / 2 + 4, 1);
    text(ctx, 'Xẻng', sr.x + sr.w / 2, sr.y + sr.h - 8, 11, '#fff8e1');

    // thanh tiến trình
    const px = 760, py = 70, pw = 220, ph = 18;
    rrect(ctx, px - 6, py - 26, pw + 12, 52, 8, 'rgba(30,15,50,.7)', '#ffd54f', 2);
    text(ctx, g.L.name.split(':')[0], px + pw / 2, py - 12, 14, '#ffe082');
    rrect(ctx, px, py, pw, ph, 8, '#3e2a18', '#1a0f05', 2);
    const total = g.L.waves.length;
    let prog = (g.waveIndex + 1) / total;
    if (g.waveIndex < total - 1 && g.waveIndex >= -1) {
      const into = clamp(1 - g.nextWave / (g.waveIndex < 0 ? g.L.first_delay : g.L.wave_interval), 0, 1);
      prog = (g.waveIndex + 1 + into * 0.95) / total;
    }
    // chạy từ phải sang trái như game gốc
    const fillW = (pw - 4) * clamp(prog, 0, 1);
    rrect(ctx, px + pw - 2 - fillW, py + 2, Math.max(4, fillW), ph - 4, 6, '#76ff03');
    for (const fi of g.L.flags) {
      const fx = px + pw - ((fi + 1) / total) * pw;
      const reached = g.waveIndex >= fi;
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx, py + ph); ctx.lineTo(fx, py - 12 - (reached ? 4 : 0)); ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath(); ctx.ellipse(fx + 6, py - 6 - (reached ? 4 : 0), 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.fillRect(fx + 5, py - 1 - (reached ? 4 : 0), 2, 4);
    }
    // đầu zombie trên thanh
    const hx = px + pw - 2 - fillW;
    ell(ctx, hx, py + ph / 2, 10, 10, ZSKIN, '#3d5226', 2);
    ell(ctx, hx - 3, py + ph / 2 - 2, 2.5, 2.5, '#fff'); ell(ctx, hx + 3, py + ph / 2 - 2, 2.5, 2.5, '#fff');

    // tooltip
    if (mouse.inside && !g.selected) {
      g.cards.forEach((cd, i) => {
        const r = cardRect(i);
        if (!inRect(mouse, r)) return;
        const d = plantDef(cd.id);
        const tw = 270, tx = clamp(r.x - 20, 4, W - tw - 4), ty = r.y + r.h + 8;
        rrect(ctx, tx, ty, tw, 70, 8, 'rgba(255,248,225,.97)', '#5d3a17', 2);
        text(ctx, `${d.name} — ${d.cost}`, tx + 10, ty + 16, 15, '#b71c1c', 'left');
        wrapText(ctx, d.desc, tx + 10, ty + 36, tw - 20, 16, 12, '#3e2000');
        if (cd.cd > 0) text(ctx, 'Đang hồi...', tx + tw - 10, ty + 16, 12, '#555', 'right');
        else if (g.sun < d.cost) text(ctx, 'Thiếu ánh trăng', tx + tw - 10, ty + 16, 11, '#555', 'right');
      });
    }
  }

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

  function drawRewardIcon(c, id, t) {
    if (id === 'trophy') {
      ell(c, 0, 0, 60, 60, 'rgba(255,235,59,.25)');
      c.save(); c.scale(1.3, 1.3);
      // đèn lồng vàng chiến thắng
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
    rrect(c, -34, -46, 68, 92, 8, '#fff3d6', '#ff6f00', 3);
    rrect(c, -30, -42, 60, 60, 6, '#2f2a5c');
    c.save();
    c.beginPath(); c.rect(-30, -42, 60, 60); c.clip();
    c.translate(-2, -14);
    c.scale(id === 'ky_lan' ? 0.55 : 0.65, id === 'ky_lan' ? 0.55 : 0.65);
    if (id === 'ky_lan') c.translate(-4, 18);
    PLANT_DRAW[id](c, t, null);
    c.restore();
    text(c, String(plantDef(id).cost), 0, 32, 16, '#3e2000');
  }

  function drawReward(g) {
    const r = g.reward;
    ctx.save();
    ctx.translate(r.x, r.y + (r.taken ? 0 : Math.sin(r.t * 3) * 4));
    const s = r.taken ? 1 + Math.min(1, r.t) : 1;
    ctx.scale(s, s);
    // tia sáng
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

  // ============================================================ NHẬP LIỆU
  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function toGame(e) {
    const rc = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) / rc.width) * W, y: ((e.clientY - rc.top) / rc.height) * H };
  }
  function cellAt(p) {
    if (p.x < LAWN_X || p.x >= LAWN_R || p.y < LAWN_Y || p.y >= LAWN_Y + ROWS * CELL_H) return null;
    return { c: Math.floor((p.x - LAWN_X) / CELL_W), r: Math.floor((p.y - LAWN_Y) / CELL_H) };
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
    if (game) game.hover = cellAt(p);
  });
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; if (game) game.hover = null; });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (game) { game.selected = null; game.shovel = false; } });

  canvas.addEventListener('pointerdown', (e) => {
    if (!game || paused) return;
    audio();
    if (actx && actx.state === 'suspended') actx.resume();
    if (e.button === 2) return;
    const p = toGame(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;
    const g = game;
    g.hover = cellAt(p);
    if (g.state === 'ready' || g.state === 'lost') return;

    if (g.reward && !g.reward.taken) {
      if (Math.hypot(p.x - g.reward.x, p.y - g.reward.y) < 60) {
        g.reward.taken = true; g.reward.t = 0; sfx.win();
      }
      return;
    }
    // ánh trăng ưu tiên
    for (let i = g.suns.length - 1; i >= 0; i--) {
      const s = g.suns[i];
      if (s.mode !== 'collect' && Math.hypot(s.x - p.x, s.y - p.y) < 34) {
        s.mode = 'collect'; sfx.sun();
        return;
      }
    }
    // thẻ
    for (let i = 0; i < g.cards.length; i++) {
      if (inRect(p, cardRect(i))) {
        const cd = g.cards[i];
        const d = plantDef(cd.id);
        if (g.selected === cd.id) { g.selected = null; return; }
        if (cd.cd > 0 || g.sun < d.cost) { sfx.nope(); return; }
        g.selected = cd.id; g.shovel = false; sfx.select();
        return;
      }
    }
    if (inRect(p, shovelRect())) {
      g.shovel = !g.shovel; g.selected = null; sfx.select();
      return;
    }
    const cell = cellAt(p);
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
    g.selected = null; g.shovel = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (game && (game.selected || game.shovel)) { game.selected = null; game.shovel = false; return; }
      if (game && isPlaying()) togglePause();
    }
    if (!game || paused) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= game.cards.length) {
      const cd = game.cards[n - 1];
      if (cd.cd <= 0 && game.sun >= plantDef(cd.id).cost) { game.selected = cd.id; game.shovel = false; sfx.select(); }
      else sfx.nope();
    }
    if (e.key === 's' || e.key === 'S') { game.shovel = !game.shovel; game.selected = null; }
  });

  // ============================================================== MÀN HÌNH
  const overlays = ['screen-title', 'screen-story', 'screen-pause', 'screen-lose', 'screen-win'];
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
        `<span class="stars">${won ? '🏮 Đã thắng' : locked ? 'Chưa mở' : 'Sẵn sàng'}</span>`;
      b.disabled = locked;
      b.addEventListener('click', () => startStory(i));
      box.appendChild(b);
    });
    $('btn-start').textContent = progress.unlocked > 1 ? `Chơi tiếp (Màn ${Math.min(progress.unlocked, DATA.levels.length)})` : 'Bắt đầu phiêu lưu';
  }

  const NAMES = { cuoi: 'Chú Cuội', hang: 'Chị Hằng', tho: 'Thỏ Ngọc' };
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

  function startStory(i) {
    audio();
    newGame(i);
    game.state = 'story';
    runStory(DATA.levels[i].story, () => startLevel(i));
  }
  function startLevel(i) {
    newGame(i);
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
      $('win-title').textContent = last ? 'TRUNG THU ĐÃ ĐƯỢC BẢO VỆ!' : 'Chiến thắng!';
      $('win-text').textContent = last
        ? 'Bạn đã phá đảo! Lũ zombie bỏ chạy, cả xóm cùng rước đèn phá cỗ.'
        : `Bạn nhận được đồng minh mới: ${plantDef(L.reward).name}!`;
      $('btn-next').style.display = last ? 'none' : '';
      showOverlay('screen-win');
      rewardAnim = L.reward;
    };
    if (last && L.ending) runStory(L.ending, show); else show();
  }

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

  // nút
  $('btn-start').addEventListener('click', () => startStory(Math.min(progress.unlocked, DATA.levels.length) - 1));
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('Xoá tiến độ và chơi lại từ Màn 1?')) return;
    progress = { unlocked: 1, won: [] }; saveProgress(); buildLevelSelect();
  });
  $('btn-pause').addEventListener('click', () => { if (isPlaying()) togglePause(); });
  $('btn-resume').addEventListener('click', () => togglePause(false));
  $('btn-restart').addEventListener('click', () => startLevel(game.idx));
  $('btn-retry').addEventListener('click', () => startLevel(game.idx));
  const toMenu = () => { game = null; paused = false; buildLevelSelect(); showOverlay('screen-title'); $('level-title').textContent = 'Thỏ Ngọc & Kỳ Lân vs Zombie'; };
  $('btn-quit').addEventListener('click', toMenu);
  $('btn-menu').addEventListener('click', toMenu);
  $('btn-lose-menu').addEventListener('click', toMenu);
  $('btn-win-menu').addEventListener('click', toMenu);
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
    if (game && !paused && game.state !== 'story' && !$('screen-win').classList.contains('show')) {
      // chạy nhiều bước nhỏ khi tăng tốc để va chạm vẫn chính xác
      for (let i = 0; i < speed; i++) update(dt);
    }
    render();
    if (story) {
      drawPortrait($('portrait').getContext('2d'), story.who, t);
    }
    renderRewardCanvas(t);
    requestAnimationFrame(loop);
  }

  // Bảng điều khiển gỡ lỗi cho kiểm thử tự động
  window.__tt = {
    get game() { return game; },
    start: (i) => startLevel(i),
    spawn: (type, row, x) => spawnZombie(type, row, x || 0),
    plant: (id, r, c) => placePlant(id, r, c),
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
