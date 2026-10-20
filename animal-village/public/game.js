// Client game Làng Thú Ngộ Nghĩnh
(() => {
  'use strict';

  // ---------- Lưu trữ cục bộ ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('tv_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('tv_' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  };
  const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : 'tk' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  let SPECIES = window.GAME_DATA.SPECIES;
  const ATK_DUR = [260, 430];

  // ---------- Vẽ cơ bản ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function shade(hex, amt) {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  // Trộn 2 màu hex theo tỉ lệ k (0..1)
  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const INK = '#3b2a2a';
  // Có viền INK nghĩa là "khối": tô gradient sáng ở góc trên trái, viền là màu đậm của chính khối đó
  function ell(ctx, x, y, rx, ry, fill, stroke, rot = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    const solid = stroke === INK && fill && fill[0] === '#';
    if (fill) {
      if (solid) {
        const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.1);
        g.addColorStop(0, shade(fill, 38)); g.addColorStop(0.55, fill); g.addColorStop(1, shade(fill, -26));
        ctx.fillStyle = g;
      } else ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) { ctx.strokeStyle = solid ? shade(fill, -85) : stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function eye(ctx, x, y, r, look = 1.2) {
    ell(ctx, x, y, r, r * 1.2, '#2b1d1d');
    ell(ctx, x + look * 0.4, y - r * 0.45, r * 0.38, r * 0.42, '#fff');
  }
  function xEyes(ctx, pts) {
    ctx.strokeStyle = '#2b1d1d'; ctx.lineWidth = 2;
    for (const [x, y] of pts) { ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke(); }
  }
  const blushC = 'rgba(255,120,140,.5)';

  // ---------- Vẽ từng loài (gốc ở chân, mặt quay sang phải) ----------
  function drawHamster(ctx, c, o) {
    const { swing, hurt, k, p } = o;
    const lunge = k === 0 ? Math.sin(p * Math.PI) * 12 : 0;
    ell(ctx, -9 + swing, -2, 7, 4, '#f39aa5', INK); ell(ctx, 9 - swing, -2, 7, 4, '#f39aa5', INK);
    ctx.save(); ctx.translate(lunge, 0);
    const sq = k === 0 ? 1 + Math.sin(p * Math.PI) * 0.08 : 1;
    ell(ctx, 0, -25, 24 * sq, 25, c.body, INK);
    ell(ctx, 3, -21, 17 * sq, 18, c.belly);
    // tai
    ell(ctx, -12, -62, 8, 8, c.body, INK); ell(ctx, -12, -62, 4.5, 4.5, c.accent);
    ell(ctx, 13, -62, 8, 8, c.body, INK); ell(ctx, 13, -62, 4.5, 4.5, c.accent);
    ell(ctx, 2, -47, 20, 16, c.body, INK);
    ell(ctx, 7, -42, 12, 9, c.belly);
    if (hurt) xEyes(ctx, [[1, -50], [14, -50]]); else { eye(ctx, 1, -50, 3.6); eye(ctx, 14, -50, 3.6); }
    ell(ctx, -6, -42, 4, 2.5, blushC); ell(ctx, 20, -42, 4, 2.5, blushC);
    ell(ctx, 9, -45, 3, 2.2, '#e9707f');
    // miệng cười há
    ctx.beginPath(); ctx.ellipse(9, -39, 5, k === 1 ? 5 : 3.5, 0, 0, Math.PI); ctx.fillStyle = '#9b2d3b'; ctx.fill();
    ell(ctx, 9, -37, 2.5, 1.5, '#f39aa5');
    ctx.strokeStyle = 'rgba(80,50,40,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, -43); ctx.lineTo(28, -46); ctx.moveTo(14, -41); ctx.lineTo(28, -40); ctx.stroke();
    // tay ôm bụng
    ell(ctx, -3, -31, 4, 3, '#f39aa5', INK); ell(ctx, 13, -31, 4, 3, '#f39aa5', INK);
    if (k === 1) { ell(ctx, 18, -33, 4, 2.5, '#5b4636'); }
    ctx.restore();
  }

  function drawDuck(ctx, c, o) {
    const { swing, hurt, k, p } = o;
    ctx.fillStyle = c.accent;
    rr(ctx, -10 + swing, -5, 12, 5, 2); ctx.fill(); rr(ctx, 2 - swing, -5, 12, 5, 2); ctx.fill();
    ctx.fillStyle = '#c47a3a'; ctx.fillRect(-6 + swing, -14, 3, 9); ctx.fillRect(5 - swing, -14, 3, 9);
    ctx.fillStyle = c.body; ctx.beginPath(); ctx.moveTo(-18, -26); ctx.lineTo(-28, -32); ctx.lineTo(-22, -18); ctx.closePath(); ctx.fill();
    ell(ctx, -2, -24, 19, 15, c.body, INK);
    ell(ctx, 4, -48, 16, 15, c.body, INK);
    // kính đen
    ctx.fillStyle = '#111';
    rr(ctx, -2, -55, 11, 8, 3); ctx.fill(); rr(ctx, 11, -55, 11, 8, 3); ctx.fill(); ctx.fillRect(7, -54, 6, 2);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(1, -53); ctx.lineTo(4, -50); ctx.moveTo(14, -53); ctx.lineTo(17, -50); ctx.stroke();
    if (hurt) xEyes(ctx, [[4, -60], [16, -60]]);
    // mỏ (há khi quạ quạ)
    const open = k === 1 ? Math.sin(p * Math.PI) * 6 : 0;
    ctx.fillStyle = c.accent;
    rr(ctx, 14, -46 - open / 2, 15, 6, 3); ctx.fill();
    rr(ctx, 14, -41 + open / 2, 13, 5, 3); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(15, -41 + open / 2); ctx.lineTo(25, -42 + open / 2); ctx.stroke();
    // cánh cầm dao
    ctx.save(); ctx.translate(6, -28);
    ctx.rotate(k === 0 ? -1.4 + p * 2.4 : 0.15 + swing * 0.03);
    ell(ctx, 3, 4, 6, 9, c.body, INK);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(4, 10, 4, 7);
    ctx.fillStyle = '#cfd6e0'; ctx.beginPath(); ctx.moveTo(2, 17); ctx.lineTo(13, 17); ctx.lineTo(12, 34); ctx.lineTo(3, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d8a9c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function drawPlatypus(ctx, c, o) {
    const { swing, hurt, k, p } = o;
    // đuôi bẹt (quật khi tuyệt chiêu)
    const tailRot = k === 1 ? -1.6 * Math.sin(p * Math.PI) : Math.sin(o.t * 2) * 0.05;
    ctx.save(); ctx.translate(-14, -14); ctx.rotate(tailRot);
    ell(ctx, -14, 2, 16, 8, shade(c.body, -30), INK, 0.2);
    ctx.restore();
    ell(ctx, -8 + swing, -2, 8, 4, shade(c.body, -35), INK); ell(ctx, 9 - swing, -2, 8, 4, shade(c.body, -35), INK);
    ell(ctx, 0, -24, 18, 21, c.body, INK);
    ell(ctx, 3, -22, 11, 15, c.belly);
    const lunge = k === 0 ? Math.sin(p * Math.PI) * 10 : 0;
    ctx.save(); ctx.translate(lunge, k === 0 ? Math.sin(p * Math.PI) * 4 : 0);
    ell(ctx, 2, -47, 15, 14, c.body, INK);
    ell(ctx, 20, -42, 13, 6, c.accent, INK);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(19, -42, 7, 0.2, Math.PI - 0.6); ctx.stroke();
    if (hurt) xEyes(ctx, [[1, -51], [11, -51]]);
    else { ell(ctx, 1, -51, 4.5, 5, '#fff', INK); ell(ctx, 11, -51, 4.5, 5, '#fff', INK); eye(ctx, 2, -51, 2.6); eye(ctx, 12, -51, 2.6); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, -59); ctx.quadraticCurveTo(1, -61, 5, -59); ctx.moveTo(8, -59); ctx.quadraticCurveTo(12, -61, 15, -59); ctx.stroke();
    ell(ctx, -6, -44, 3, 2, blushC);
    ctx.restore();
    ell(ctx, -12, -28, 4, 7, shade(c.body, -35), null, 0.3); ell(ctx, 14, -28, 4, 7, shade(c.body, -35), null, -0.3);
  }

  function drawChick(ctx, c, o) {
    const { swing, hurt, k, p, t } = o;
    ctx.fillStyle = c.accent;
    rr(ctx, -10 + swing, -4, 9, 4, 2); ctx.fill(); rr(ctx, 2 - swing, -4, 9, 4, 2); ctx.fill();
    ctx.save();
    if (k === 0) { ctx.translate(0, -4); ctx.rotate(Math.sin(p * Math.PI * 3) * 0.25); ctx.translate(0, 4); }
    const puff = k === 1 ? 1 + Math.sin(p * Math.PI) * 0.12 : 1;
    ell(ctx, 0, -27, 25 * puff, 25 * puff, c.body, INK);
    ell(ctx, 2, -20, 15, 12, c.belly);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, -52); ctx.lineTo(-2, -58); ctx.moveTo(1, -52); ctx.lineTo(4, -59); ctx.moveTo(6, -52); ctx.lineTo(10, -57); ctx.stroke();
    if (hurt) xEyes(ctx, [[1, -32], [15, -32]]);
    else {
      eye(ctx, 1, -31, 3.2); eye(ctx, 15, -31, 3.2);
      ctx.beginPath(); ctx.moveTo(-4, -40); ctx.lineTo(5, -36); ctx.moveTo(20, -40); ctx.lineTo(11, -36); ctx.stroke();
    }
    ell(ctx, -9, -22, 6, 4.5, blushC); ell(ctx, 22, -22, 5, 4.5, blushC);
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(4, -27); ctx.lineTo(14, -24); ctx.lineTo(5, -21); ctx.closePath(); ctx.fill();
    ell(ctx, -22, -24, 6, 9, shade(c.body, -15), INK, 0.4);
    ctx.restore();
    // khói giận thỉnh thoảng
    if (Math.sin(t * 1.3 + o.seed) > 0.75 || k === 1) {
      ctx.globalAlpha *= 0.85;
      for (const [x, y, r] of [[-20, -62, 6], [24, -60, 5]]) { ell(ctx, x, y - (t * 12 % 6), r, r, '#fff', INK); ell(ctx, x + r * 0.8, y - 3 - (t * 12 % 6), r * 0.6, r * 0.6, '#fff', INK); }
      ctx.globalAlpha /= 0.85;
    }
  }

  function drawCroc(ctx, c, o) {
    const { swing, hurt, k, p, skin } = o;
    // đuôi dài, quật vòng ra sau
    const whip = k === 1 ? Math.sin(p * Math.PI) : 0;
    ctx.save(); ctx.translate(-10, -16); ctx.rotate(-whip * 0.9 + Math.sin(o.t * 2) * 0.05);
    ctx.fillStyle = c.body; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, -10); ctx.quadraticCurveTo(-30, -4, -44 - whip * 10, 8); ctx.quadraticCurveTo(-40, 14, -30, 10); ctx.quadraticCurveTo(-14, 6, 4, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(c.body, -35);
    for (let i = 0; i < 4; i++) { const x = -6 - i * 9; ctx.beginPath(); ctx.moveTo(x, -6 + i); ctx.lineTo(x - 4, -12 + i * 1.5); ctx.lineTo(x - 8, -5 + i * 1.5); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = c.body;
    rr(ctx, -9 + swing, -12, 8, 12, 3); ctx.fill(); rr(ctx, 3 - swing, -12, 8, 12, 3); ctx.fill();
    ell(ctx, 0, -27, 15, 20, c.body, INK);
    ell(ctx, 4, -25, 9, 16, c.belly);
    ctx.strokeStyle = 'rgba(120,100,60,.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-3, -36 + i * 6); ctx.lineTo(11, -36 + i * 6); ctx.stroke(); }
    // hàm (cắn)
    const open = k === 0 ? (p < 0.5 ? p * 2 : (1 - p) * 2) : 0;
    ell(ctx, 3, -50, 13, 12, c.body, INK);
    ctx.save(); ctx.translate(10, -46); ctx.rotate(open * 0.45);
    ctx.fillStyle = c.body; rr(ctx, -2, 0, 24, 6, 3); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 6, 0); ctx.lineTo(8 + i * 6, -3); ctx.lineTo(10 + i * 6, 0); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.translate(10, -46); ctx.rotate(-open * 0.35);
    ctx.fillStyle = c.body; rr(ctx, -2, -8, 28, 8, 4); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, 23, -6, 2, 1.5, INK);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 6, 0); ctx.lineTo(10 + i * 6, 3); ctx.lineTo(12 + i * 6, 0); ctx.fill(); }
    ctx.restore();
    // mắt lồi
    if (hurt) xEyes(ctx, [[0, -60], [11, -60]]);
    else { ell(ctx, 0, -60, 6, 6.5, '#fff', INK); ell(ctx, 11, -60, 6, 6.5, '#fff', INK); eye(ctx, 2, -59, 2.6); eye(ctx, 13, -59, 2.6); }
    ell(ctx, -4, -48, 3.5, 2.2, blushC);
    // phụ kiện tiểu thư
    if (skin === 1) {
      ctx.fillStyle = c.accent;
      ctx.beginPath(); ctx.moveTo(-10, -66); ctx.lineTo(-9, -78); ctx.lineTo(-4, -71); ctx.lineTo(0, -80); ctx.lineTo(4, -71); ctx.lineTo(9, -78); ctx.lineTo(9, -66); ctx.closePath(); ctx.fill();
      ell(ctx, 0, -70, 1.8, 1.8, '#e63946');
    } else {
      ctx.fillStyle = c.accent;
      ctx.beginPath(); ctx.moveTo(-4, -66); ctx.lineTo(-16, -74); ctx.lineTo(-15, -60); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -66); ctx.lineTo(7, -76); ctx.lineTo(8, -62); ctx.closePath(); ctx.fill();
      ell(ctx, -4, -66, 3, 3, shade(c.accent, -30));
    }
    ell(ctx, 12, -32, 3.5, 6, c.body, INK, -0.4);
  }

  const DRAW = { hamster: drawHamster, duck: drawDuck, platypus: drawPlatypus, chick: drawChick, croc: drawCroc };

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }
  function heart(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.4, x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
    ctx.fill();
  }

  // Hiệu ứng riêng của skin, chạy theo thời gian nên luôn mượt (không cần lưu hạt)
  function skinFx(ctx, kind, t, c, layer, seed) {
    const P = (i, n, sp) => (t * sp + i / n + seed * 0.13) % 1;
    const base = ctx.globalAlpha;
    if (layer === 'back') {
      if (kind === 'aura') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + seed);
        const g = ctx.createRadialGradient(0, -32, 4, 0, -32, 40 + pulse * 8);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, c.accent + '55'); g.addColorStop(1, c.accent + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -32, 48 + pulse * 8, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'flame') {
        for (let i = 0; i < 6; i++) {
          const p = P(i, 6, 1.3);
          ctx.globalAlpha = base * (1 - p) * 0.75;
          ell(ctx, Math.sin(i * 2.1 + t * 4) * 13, -4 - p * 52, (1 - p) * 9 + 2, (1 - p) * 12 + 3, p < 0.4 ? '#ffd23f' : '#ff7a2f');
        }
      } else if (kind === 'smoke') {
        for (let i = 0; i < 4; i++) {
          const p = P(i, 4, 0.5);
          ctx.globalAlpha = base * (1 - p) * 0.35;
          ell(ctx, -16 + Math.sin(i + t) * 6 - p * 14, -8 - p * 44, 5 + p * 11, 5 + p * 9, '#8d8d99');
        }
      }
      ctx.globalAlpha = base;
      return;
    }
    if (kind === 'sparkle' || kind === 'aura') {
      for (let i = 0; i < 4; i++) {
        const p = P(i, 4, 0.55), a = Math.sin(p * Math.PI);
        ctx.globalAlpha = base * a;
        ctx.fillStyle = i % 2 ? '#fff' : '#ffe27a';
        star(ctx, Math.cos(i * 2.4 + seed + Math.floor(t * 0.55 + i / 4) * 1.3) * 28, -36 + Math.sin(i * 1.9 + Math.floor(t * 0.55 + i / 4)) * 26, 2 + a * 4);
      }
    } else if (kind === 'hearts') {
      for (let i = 0; i < 3; i++) {
        const p = P(i, 3, 0.45);
        ctx.globalAlpha = base * Math.sin(p * Math.PI) * 0.9;
        ctx.fillStyle = i === 1 ? '#ff8fb1' : '#ff5c8a';
        heart(ctx, Math.sin(p * 6 + i * 2) * 14 + (i - 1) * 12, -48 - p * 42, 4.5 - p);
      }
    } else if (kind === 'bubbles') {
      for (let i = 0; i < 4; i++) {
        const p = P(i, 4, 0.4);
        ctx.globalAlpha = base * Math.sin(p * Math.PI);
        ell(ctx, (i - 1.5) * 11 + Math.sin(p * 8 + i) * 4, -18 - p * 58, 2 + p * 3.5, 2 + p * 3.5, 'rgba(190,235,255,.35)', 'rgba(255,255,255,.9)');
      }
    } else if (kind === 'leaves' || kind === 'petals') {
      for (let i = 0; i < 3; i++) {
        const p = P(i, 3, 0.32);
        ctx.globalAlpha = base * Math.sin(p * Math.PI);
        ctx.save(); ctx.translate(26 - p * 62 + Math.sin(p * 10 + i) * 6, -64 + p * 64); ctx.rotate(p * 6 + i);
        ell(ctx, 0, 0, 4.5, 2.4, kind === 'leaves' ? (i % 2 ? '#8bc34a' : '#c9a227') : (i % 2 ? '#ffb3c7' : '#ff8fb1'));
        ctx.restore();
      }
    }
    ctx.globalAlpha = base;
  }

  function drawAnimal(ctx, x, y, species, skinIdx, o = {}) {
    const sp = SPECIES[species] || SPECIES.hamster;
    const c = o.colors || sp.skins[skinIdx] || sp.skins[0];
    const fxKind = (sp.skins[skinIdx] || sp.skins[0]).fx;
    const t = o.t || 0, anim = o.anim || 'idle', seed = o.seed || 0;
    const dir = o.dir || 1;
    ctx.save();
    ctx.translate(x, y);
    const sh = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    sh.addColorStop(0, 'rgba(40,20,30,.28)'); sh.addColorStop(1, 'rgba(40,20,30,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(0, 0, 22, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (fxKind && anim !== 'dead') skinFx(ctx, fxKind, t, c, 'back', seed);
    ctx.save();
    if (anim === 'dead') { ctx.rotate(-Math.PI / 2 * dir); ctx.translate(-12 * dir, -10); }
    // quay mặt mượt: face chạy từ -1 tới 1 thay vì lật tức thì
    const face = o.face == null ? dir : o.face;
    ctx.scale(Math.sign(face || dir) * Math.max(0.12, Math.abs(face)), 1);
    const run = anim === 'run';
    const bob = run ? Math.abs(Math.sin(t * 14)) * 2.5 : 0;
    ctx.translate(0, -bob);
    const breathe = run ? 0 : Math.sin(t * 3 + seed) * 0.018;
    const sq = o.squash || 0;
    if (anim === 'jump') ctx.scale(0.94, 1.07);
    else ctx.scale(1 - breathe * 0.6 + sq * 0.16, 1 + breathe - sq * 0.16);
    const k = anim === 'atk0' ? 0 : anim === 'atk1' ? 1 : -1;
    DRAW[species]?.(ctx, c, { t, seed, swing: run ? Math.sin(t * 14) * 4 : 0, hurt: anim === 'hurt' || anim === 'dead', k, p: o.atkP || 0, skin: skinIdx });
    if (anim === 'fish') drawRod(ctx);
    ctx.restore();
    if (fxKind && anim !== 'dead') skinFx(ctx, fxKind, t, c, 'front', seed);
    ctx.restore();
  }

  function drawRod(ctx) {
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -30); ctx.lineTo(44, -78); ctx.stroke();
  }

  // ---------- NPC ----------
  function drawChief(ctx, x, y, t, mark) {
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 0, 30, 6, 'rgba(0,0,0,.18)');
    const bob = Math.sin(t * 2);
    ctx.translate(0, -bob);
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(27, -70); ctx.stroke();
    ell(ctx, 27, -72, 6, 6, '#6bbf59');
    // chân + mai rùa
    for (const fx of [-16, 14]) ell(ctx, fx, -5, 8, 6, '#9ccc65', INK);
    ell(ctx, -4, -26, 28, 22, '#6d8b3a', INK);
    ctx.strokeStyle = '#4e6b26'; ctx.lineWidth = 2;
    for (const [hx, hy] of [[-14, -32], [2, -36], [-4, -20], [-20, -18], [10, -22]]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * 7, hy + Math.sin(a) * 6); } ctx.closePath(); ctx.stroke(); }
    ell(ctx, 14, -16, 10, 12, '#f2e3b3', INK);
    // đầu
    ell(ctx, 22, -50, 15, 14, '#9ccc65', INK);
    ell(ctx, 16, -36, 9, 10, '#fff');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, -40); ctx.quadraticCurveTo(18, -12 + Math.sin(t * 3) * 2, 28, -40); ctx.fill();
    ctx.strokeStyle = '#2b1d1d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(17, -52, 3, Math.PI, 0); ctx.arc(28, -52, 3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; rr(ctx, 12, -60, 9, 4, 2); ctx.fill(); rr(ctx, 24, -60, 9, 4, 2); ctx.fill();
    ell(ctx, 12, -45, 3, 2, blushC); ell(ctx, 33, -45, 3, 2, blushC);
    ell(ctx, 30, -30, 5, 4, '#9ccc65', INK);
    ctx.fillStyle = '#e8c47a';
    ctx.beginPath(); ctx.moveTo(-6, -60); ctx.lineTo(22, -84); ctx.lineTo(50, -60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c99a4a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    if (mark) drawMark(ctx, x + 10, y - 112 + Math.sin(t * 4) * 4, mark);
  }

  // Thần Sông: chú hà mã xám bụng kem, ngồi ngâm mình dưới sông
  function drawRiverGod(ctx, x, y, t, mark, inWater = true) {
    if (inWater) {
      // phần nổi trên mặt nước vẽ rõ, phần chìm vẽ mờ như nhìn qua làn nước
      const wy = WORLD.groundY + 10;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 120, y - 260, 240, wy - y + 260); ctx.clip();
      drawRiverGod(ctx, x, y, t, null, false); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(x - 120, wy, 240, 120); ctx.clip(); ctx.globalAlpha = 0.28;
      drawRiverGod(ctx, x, y, t, null, false); ctx.restore();
      for (let i = 0; i < 2; i++) {
        const p = (t * 0.5 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, wy + 1, 46 + p * 30, 5 + p * 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (mark) drawMark(ctx, x, y - 160 + Math.sin(t * 4) * 4, mark);
      return;
    }
    const bob = Math.sin(t * 1.5) * 4;
    const HIP = '#9497b8', HIP_L = '#b3b5d1', BELLY = '#f4efdc', PINK = '#f5a3b5';
    ctx.save();
    ctx.translate(x, y + bob);
    // tay vẫy nhẹ
    const wave = Math.sin(t * 2.2) * 0.25;
    ell(ctx, -40, -46, 11, 17, HIP, INK, 0.5 + wave * 0.3);
    ell(ctx, 40, -50, 11, 17, HIP, INK, -0.6 - wave);
    ell(ctx, 0, -40, 42, 46, HIP, INK);
    ell(ctx, 0, -30, 27, 32, BELLY);
    // tai
    for (const s of [-1, 1]) { ell(ctx, s * 25, -128, 9, 9, HIP, INK); ell(ctx, s * 25, -128, 4.5, 5, PINK); }
    ell(ctx, 0, -100, 36, 30, HIP, INK);
    ell(ctx, 0, -86, 31, 18, HIP_L, INK);
    ell(ctx, -9, -92, 3.5, 2.5, '#5d5f80'); ell(ctx, 9, -92, 3.5, 2.5, '#5d5f80');
    eye(ctx, -14, -112, 3.6); eye(ctx, 14, -112, 3.6);
    ell(ctx, -27, -96, 7, 4.5, PINK); ell(ctx, 27, -96, 7, 4.5, PINK);
    ctx.strokeStyle = '#5d5f80'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -86, 13, 0.25, Math.PI - 0.25); ctx.stroke();
    // vương miện nhỏ của thần
    ctx.save(); ctx.translate(4, -130); ctx.rotate(0.12);
    const g = ctx.createLinearGradient(0, -16, 0, 0); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#f2b705');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-13, -12); ctx.lineTo(-6, -6); ctx.lineTo(0, -16); ctx.lineTo(6, -6); ctx.lineTo(13, -12); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c48f00'; ctx.lineWidth = 1.5; ctx.stroke();
    ell(ctx, 0, -6, 2, 2, '#4fb3ff');
    ctx.restore();
    ctx.restore();
  }

  // Sư Phụ Gấu Trúc: đối thủ tỷ thí khi chơi một mình
  function drawPanda(ctx, x, y, t, dir, anim, face) {
    const W = '#f7f5f0', B = '#2f2b33';
    const run = anim === 'run', atk = anim === 'atk';
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 0, 26, 6, 'rgba(40,20,30,.22)');
    ctx.scale(Math.sign(face || dir) * Math.max(0.12, Math.abs(face ?? dir)), 1);
    const swing = run ? Math.sin(t * 13) * 5 : 0;
    ctx.translate(0, run ? -Math.abs(Math.sin(t * 13)) * 2.5 : Math.sin(t * 2.5) * 0.8);
    // gậy tre sau lưng
    ctx.strokeStyle = '#7cb342'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(10, -86); ctx.stroke();
    ctx.strokeStyle = '#558b2f'; ctx.lineWidth = 2;
    for (const k of [0.3, 0.6]) { ctx.beginPath(); ctx.moveTo(-26 + 36 * k - 4, -6 - 80 * k); ctx.lineTo(-26 + 36 * k + 4, -6 - 80 * k); ctx.stroke(); }
    ell(ctx, -10 + swing, -4, 10, 6, B, INK); ell(ctx, 12 - swing, -4, 10, 6, B, INK);
    ell(ctx, 0, -30, 26, 26, W, INK);
    ell(ctx, 2, -26, 15, 15, '#ffffff');
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-24, -26, 48, 6);
    // tay: tay trước tung chưởng khi tấn công
    ell(ctx, -20, -36, 8, 13, B, INK, 0.3);
    ctx.save(); ctx.translate(16, -40); ctx.rotate(atk ? -1.5 : 0.2 + swing * 0.03);
    ell(ctx, 0, 10, 8, 14, B, INK);
    if (atk) ell(ctx, 0, 24, 9, 9, B, INK);
    ctx.restore();
    // đầu
    ell(ctx, -15, -78, 8, 8, B, INK); ell(ctx, 15, -78, 8, 8, B, INK);
    ell(ctx, 0, -62, 21, 18, W, INK);
    ell(ctx, -8, -64, 6, 7.5, B, null, -0.4); ell(ctx, 9, -64, 6, 7.5, B, null, 0.4);
    eye(ctx, -7, -64, 2.3); eye(ctx, 9, -64, 2.3);
    ell(ctx, 1, -55, 3.5, 2.5, B);
    ctx.strokeStyle = B; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1, -52, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ell(ctx, -14, -56, 3, 2, blushC); ell(ctx, 16, -56, 3, 2, blushC);
    // băng đô võ sư + râu bạc
    ctx.fillStyle = '#c0392b'; rr(ctx, -20, -76, 40, 6, 3); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-19, -73); ctx.quadraticCurveTo(-30, -74 + Math.sin(t * 7) * 3, -36, -66 + Math.sin(t * 7 + 1) * 3); ctx.stroke();
    ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.moveTo(-5, -48); ctx.quadraticCurveTo(1, -36 + Math.sin(t * 3) * 1.5, 7, -48); ctx.fill();
    ctx.restore();
  }

  function drawMark(ctx, x, y, mark) {
    ctx.font = '800 30px "Baloo 2", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(mark, x, y);
    ctx.fillStyle = mark === '?' ? '#2fbf71' : '#ffb703'; ctx.fillText(mark, x, y);
  }

  function drawMonster(ctx, m, type, t) {
    const x = m.rx, y = WORLD.groundY, d = m.dir;
    ctx.save();
    ctx.translate(x, y);
    if (m.flash > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(m.flash * 60);
    if (type === 'snail') {
      ell(ctx, 0, 0, 20, 4, 'rgba(0,0,0,.15)');
      ctx.scale(d, 1);
      const s = 1 + Math.sin(t * 4 + m.id) * 0.04;
      ctx.fillStyle = '#b9e769'; rr(ctx, -18, -10, 40 * s, 10, 5); ctx.fill();
      ctx.strokeStyle = '#8bc34a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(20, -22); ctx.moveTo(12, -9); ctx.lineTo(13, -21); ctx.stroke();
      ell(ctx, 20, -23, 3, 3, '#2b2b3a'); ell(ctx, 13, -22, 3, 3, '#2b2b3a');
      ell(ctx, 0, -18, 15, 15, '#f4a259');
      ctx.strokeStyle = '#c0632b'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const r = 2 + a * 1.05; ctx.lineTo(Math.cos(a) * r, -18 + Math.sin(a) * r); }
      ctx.stroke();
    } else if (type === 'mushroom') {
      const hop = Math.abs(Math.sin(t * 6 + m.id)) * 8;
      ell(ctx, 0, 0, 18 - hop * 0.5, 4, 'rgba(0,0,0,.15)');
      ctx.scale(d, 1);
      ctx.translate(0, -hop);
      ctx.fillStyle = '#fff1d6'; rr(ctx, -11, -24, 22, 24, 8); ctx.fill();
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -17); ctx.lineTo(0, -14); ctx.moveTo(10, -17); ctx.lineTo(4, -14); ctx.stroke();
      ell(ctx, -2, -11, 2, 2.5, '#2b2b3a'); ell(ctx, 7, -11, 2, 2.5, '#2b2b3a');
      ctx.beginPath(); ctx.arc(3, -4, 3, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.ellipse(0, -24, 22, 18, 0, Math.PI, 0); ctx.fill();
      ell(ctx, -9, -32, 4, 3, '#fff'); ell(ctx, 6, -36, 5, 3.5, '#fff'); ell(ctx, 14, -27, 3, 2.5, '#fff');
    } else {
      ell(ctx, 0, 0, 46, 8, 'rgba(0,0,0,.2)');
      ctx.scale(d, 1);
      const step = Math.sin(t * 10) * 3;
      ctx.fillStyle = '#5c3b28';
      for (const lx of [-28, -12, 12, 26]) { rr(ctx, lx - 5, -18 + (lx % 2 ? step : -step) * 0.3, 10, 18, 3); ctx.fill(); }
      ell(ctx, 0, -38, 44, 28, '#7b4b33');
      ctx.fillStyle = '#5c3b28';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 10, -62); ctx.lineTo(-25 + i * 10, -74); ctx.lineTo(-20 + i * 10, -62); ctx.fill(); }
      ell(ctx, 36, -36, 22, 20, '#8a5639');
      ell(ctx, 52, -30, 10, 8, '#f7a1b5');
      ell(ctx, 50, -30, 2, 3, '#7a3b3b'); ell(ctx, 55, -30, 2, 3, '#7a3b3b');
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(44, -24); ctx.lineTo(48, -42); ctx.lineTo(50, -24); ctx.fill();
      ell(ctx, 40, -44, 4, 4, '#fff'); ell(ctx, 41, -44, 2, 2.5, '#2b2b3a');
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(33, -52); ctx.lineTo(45, -48); ctx.stroke();
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath(); ctx.moveTo(22, -56); ctx.lineTo(24, -72); ctx.lineTo(30, -63); ctx.lineTo(36, -76); ctx.lineTo(42, -63); ctx.lineTo(48, -72); ctx.lineTo(48, -56); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const ti = MTYPES[type];
    const top = y - ti.h - (type === 'boar' ? 22 : 14);
    if (m.hp < m.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x - 22, top - 6, 44, 6, 3); ctx.fill();
      ctx.fillStyle = '#ff4d6d'; rr(ctx, x - 22, top - 6, 44 * Math.max(0, m.hp / m.maxHp), 6, 3); ctx.fill();
    }
    queueLabel(ti.name, x, top - 10, ti.boss ? '#ffb703' : '#fff', 11);
  }

  function drawRose(ctx, x, y, t, seed) {
    const by = y - 12 + Math.sin(t * 4 + seed) * 3;
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 5 + seed) * 0.15;
    ell(ctx, x, by, 16, 16, '#ffd1dc');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, by + 4); ctx.lineTo(x, by + 14); ctx.stroke();
    ell(ctx, x + 4, by + 10, 4, 2, '#4caf50', null, -0.5);
    ell(ctx, x, by, 7, 6, '#e0213f');
    ell(ctx, x - 2, by - 1, 4, 3.5, '#ff4d6d');
    ctx.strokeStyle = '#a3132c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, by, 3, 0, 4); ctx.stroke();
    ctx.restore();
  }

  function label(ctx, text, x, y, color, size = 12) {
    ctx.font = `800 ${size}px "Baloo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,20,40,.75)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawBubble(ctx, text, x, y, npc) {
    ctx.font = '700 13px "Baloo 2", sans-serif';
    const lines = wrap(ctx, text, npc ? 230 : 170);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
    const h = lines.length * 16 + 10;
    const bx = x - w / 2, by = y - h - 10;
    ctx.fillStyle = npc ? '#fff6d8' : '#fff';
    ctx.strokeStyle = npc ? '#e0a800' : '#ff6f91'; ctx.lineWidth = 2;
    rr(ctx, bx, by, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, by + h); ctx.lineTo(x, by + h + 9); ctx.lineTo(x + 6, by + h); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 5, by + h - 2, 10, 3);
    ctx.fillStyle = '#3a2a3f'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, x, by + 18 + i * 16));
  }

  // ---------- Chọn nhân vật ----------
  const $ = (id) => document.getElementById(id);
  let mySpecies = store.get('species') in SPECIES ? store.get('species') : 'hamster';
  let mySkin = Number.isInteger(store.get('skin')) ? store.get('skin') : 0;
  let previewSwap = 0, shownColors = null, shownFor = ''; // hiệu ứng đổi skin mượt ở màn chọn nhân vật
  $('nameInput').value = store.get('name') || '';
  const cards = [];
  for (const key of Object.keys(SPECIES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'species-card'; b.dataset.sp = key;
    const cv = document.createElement('canvas'); cv.width = 144; cv.height = 144;
    const nm = document.createElement('span'); nm.textContent = SPECIES[key].name;
    b.append(cv, nm);
    b.onclick = () => { mySpecies = key; mySkin = 0; refreshCreate(); };
    $('speciesList').appendChild(b);
    cards.push({ key, cv, b });
  }
  function refreshCreate() {
    previewSwap = performance.now();
    const sp = SPECIES[mySpecies];
    if (mySkin >= sp.skins.length) mySkin = 0;
    cards.forEach((c) => c.b.classList.toggle('on', c.key === mySpecies));
    $('speciesName').textContent = sp.name;
    $('speciesIntro').textContent = sp.intro;
    const sk = $('speciesSkills'); sk.innerHTML = '';
    sp.attacks.forEach((a, i) => {
      const d = document.createElement('div');
      const kb = document.createElement('kbd'); kb.textContent = i ? 'K' : 'J';
      d.append(kb, document.createTextNode((i ? 'Tuyệt chiêu: ' : 'Đánh: ') + a.name));
      sk.appendChild(d);
    });
    const list = $('skinList'); list.innerHTML = '';
    sp.skins.forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.classList.toggle('on', i === mySkin);
      const dot = document.createElement('i'); dot.style.background = s.body;
      b.append(dot, document.createTextNode(s.name));
      b.onclick = () => { mySkin = i; refreshCreate(); };
      list.appendChild(b);
    });
  }
  refreshCreate();

  let previewRaf = 0;
  function previewLoop(ts) {
    const t = ts / 1000;
    for (const c of cards) {
      const x = c.cv.getContext('2d');
      x.clearRect(0, 0, 144, 144);
      x.save(); x.scale(1.4, 1.4); drawAnimal(x, 50, 92, c.key, c.key === mySpecies ? mySkin : 0, { t, dir: 1, seed: c.key.length }); x.restore();
    }
    const pv = $('preview'), p = pv.getContext('2d');
    p.clearRect(0, 0, pv.width, pv.height);
    p.fillStyle = '#bfe6ff'; p.fillRect(0, 0, pv.width, 180); p.fillStyle = '#9ad37a'; p.fillRect(0, 180, pv.width, 60);
    // tự múa chiêu để giới thiệu
    const cyc = (ts % 3000);
    const k = cyc < ATK_DUR[0] ? 0 : cyc > 1500 && cyc < 1500 + ATK_DUR[1] ? 1 : -1;
    const atkP = k === 0 ? cyc / ATK_DUR[0] : k === 1 ? (cyc - 1500) / ATK_DUR[1] : 0;
    // màu skin chuyển dần sang skin mới thay vì đổi phụt
    const target = SPECIES[mySpecies].skins[mySkin];
    if (!shownColors || shownFor !== mySpecies) { shownColors = { ...target }; shownFor = mySpecies; }
    for (const key of ['body', 'belly', 'accent']) shownColors[key] = mix(shownColors[key], target[key], 0.14);
    const pop = Math.max(0, 1 - (ts - previewSwap) / 450);
    p.save(); p.translate(118, 186); p.scale(1.75 + Math.sin(pop * Math.PI) * 0.22, 1.75 - Math.sin(pop * Math.PI) * 0.1);
    drawAnimal(p, 0, 0, mySpecies, mySkin, { t, dir: 1, anim: k >= 0 ? 'atk' + k : 'idle', atkP, colors: shownColors });
    p.restore();
    label(p, $('nameInput').value.trim() || SPECIES[mySpecies].name, 110, 26, '#fff', 17);
    previewRaf = requestAnimationFrame(previewLoop);
  }
  previewRaf = requestAnimationFrame(previewLoop);

  $('startBtn').onclick = () => {
    const name = $('nameInput').value.trim();
    if (!name) { $('nameInput').focus(); $('createHint').textContent = 'Đặt tên cho bạn thú của con đã nào! 😊'; return; }
    store.set('species', mySpecies); store.set('skin', mySkin); store.set('name', name);
    cancelAnimationFrame(previewRaf);
    $('create').classList.add('hidden');
    $('game').classList.remove('hidden');
    startGame(name);
  };
  $('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('startBtn').click(); });

  // ---------- Game ----------
  let WORLD = null, MTYPES = {};
  const canvas = $('view'), ctx = canvas.getContext('2d');
  let ws = null, myId = null, myName = '';
  const players = new Map(); // id -> {info, rx, ry, tx, ty, dir, anim, hp}
  const monsters = new Map();
  const drops = new Map();
  const bubbles = new Map(); // who -> {text, until}
  const floaters = [], particles = [], fx = [];
  let progress = null;
  const me = { x: 1060, y: 470, vx: 0, vy: 0, face: 1, landAt: 0, landPow: 0, onGround: true, jumps: 0, dir: 1, hp: 100, invulnUntil: 0, atkK: -1, atkUntil: 0, cd: [0, 0], dead: false, deadUntil: 0, dropUntil: 0, lastHurt: 0 };
  const fishing = { state: null, since: 0 };
  const keys = {};
  let jumpQueued = false, talkQueued = false, fishQueued = false, pkQueued = false;
  const atkHeld = [false, false];
  let dialogOpen = false, dialogOptions = [], dialogNpc = 'chief';
  const pickupSent = new Map();
  let reconnectTimer = null;

  function startGame(name) {
    myName = name;
    connect();
    resize();
    requestAnimationFrame(frame);
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) $('touch').classList.remove('hidden');
    setTimeout(() => $('help').classList.add('hidden'), 20000);
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      $('disconnected').classList.add('hidden');
      let token = store.get('token');
      if (!token) { token = newToken(); store.set('token', token); }
      ws.send(JSON.stringify({ t: 'join', token, name: myName, species: mySpecies, skin: mySkin }));
    };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (myId != null) $('disconnected').classList.remove('hidden');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
  }
  function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

  function onMessage(msg) {
    const now = performance.now();
    switch (msg.t) {
      case 'inuse':
        store.set('token', newToken());
        ws.send(JSON.stringify({ t: 'join', token: store.get('token'), name: myName, species: mySpecies, skin: mySkin }));
        toast('Nhân vật cũ đang chơi ở tab khác, đã tạo bạn thú mới cho tab này!');
        break;
      case 'welcome':
        myId = msg.id; WORLD = msg.world; MTYPES = msg.monsterTypes; SPECIES = msg.species;
        store.set('token', msg.token);
        players.clear(); monsters.clear(); drops.clear();
        for (const p of msg.players) addPlayer(p);
        for (const m of msg.monsters) monsters.set(m.id, { ...m, rx: m.x, tx: m.x, flash: 0 });
        for (const d of msg.drops) drops.set(d.id, d);
        duels.clear(); for (const d of msg.duels || []) addDuel(d);
        me.x = WORLD.spawnX; me.y = WORLD.groundY; me.hp = 100;
        renderSkills();
        break;
      case 'pinfo': addPlayer(msg.p); updateOnline(); break;
      case 'leave': players.delete(msg.id); bubbles.delete(msg.id); updateOnline(); break;
      case 'snap':
        for (const [id, x, y, dir, anim, hp] of msg.p) {
          const p = players.get(id);
          if (!p || id === myId) continue;
          if (anim !== p.anim && (anim === 'atk0' || anim === 'atk1')) p.atkStart = now;
          Object.assign(p, { tx: x, ty: y, dir, anim, hp });
        }
        for (const [key, x, dir, anim] of msg.k || []) {
          const n = senseis.get(key);
          if (n) Object.assign(n, { tx: x, dir, anim }); else senseis.set(key, { rx: x, tx: x, dir, anim, face: dir });
        }
        for (const [id, x, dir, hp, dead] of msg.m) {
          const m = monsters.get(id);
          if (!m) continue;
          if (m.dead && !dead) m.rx = x;
          Object.assign(m, { tx: x, dir, hp, dead: !!dead });
        }
        break;
      case 'atk': {
        const p = players.get(msg.id);
        if (p) { p.atkStart = now; p.atkK = msg.k; spawnAttackFx(p.rx, p.ry, p.dir, p.info.species, msg.k); }
        break;
      }
      case 'chat':
        addChat(msg);
        if (msg.kind === 'player') say(msg.id, msg.text);
        break;
      case 'bubble':
        say(msg.who, msg.text);
        if (msg.who === 'chief') addChat({ kind: 'npc', name: 'Trưởng làng', text: msg.text });
        if (msg.who === 'river') addChat({ kind: 'npc', name: 'Thần Sông', text: msg.text });
        break;
      case 'hit': {
        const m = monsters.get(msg.m);
        if (!m) break;
        m.flash = 0.3;
        const mine = msg.by === myId;
        floaters.push({ x: m.rx + (Math.random() * 20 - 10), y: WORLD.groundY - MTYPES[m.type].h - 10, vy: -60, life: 1, text: (msg.crit ? 'Chí mạng! ' : '') + '-' + msg.dmg, color: msg.crit ? '#ff3860' : mine ? '#ffd23f' : '#fff', size: msg.crit ? 20 : 16 });
        for (let i = 0; i < 5; i++) particles.push({ x: m.rx, y: WORLD.groundY - 20, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, life: 0.5, color: '#fff3a0', r: 3 });
        break;
      }
      case 'mdie': {
        const m = monsters.get(msg.m);
        if (!m) break;
        m.dead = true;
        for (let i = 0; i < 16; i++) particles.push({ x: m.rx, y: WORLD.groundY - 20, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, life: 0.8, color: ['#ffd1dc', '#fff', '#c9e7ff'][i % 3], r: 5 });
        break;
      }
      case 'drop': drops.set(msg.d.id, { ...msg.d, pop: 1 }); break;
      case 'dropGone': {
        const d = drops.get(msg.id);
        drops.delete(msg.id);
        if (d && msg.by === myId) {
          floaters.push({ x: d.x, y: WORLD.groundY - 40, vy: -50, life: 1.2, text: '🌹 +1', color: '#ff6f91', size: 18 });
          for (let i = 0; i < 8; i++) particles.push({ x: d.x, y: WORLD.groundY - 14, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 180, life: 0.6, color: '#ff8fa3', r: 3 });
        }
        break;
      }
      case 'fish': onFish(msg); break;
      case 'pkInvite': showInvite(msg); break;
      case 'pkStart': {
        addDuel(msg.d);
        if (msg.d.keys.includes(myId)) { cancelFishing(); pkCountdown(duels.get(msg.d.id)); }
        break;
      }
      case 'pkGo': { const d = duels.get(msg.id); if (d) d.state = 'fight'; break; }
      case 'pkHit': {
        const d = duels.get(msg.id);
        if (d) d.hp = msg.hp;
        const p = keyPos(msg.victim);
        if (p) {
          floaters.push({ x: p.x, y: p.y - 76, vy: -60, life: 1, text: (msg.crit ? 'Chí mạng! ' : '') + '-' + msg.dmg, color: msg.victim === myId ? '#ff4d6d' : msg.crit ? '#ff3860' : '#ffd23f', size: msg.crit ? 20 : 16 });
          for (let i = 0; i < 6; i++) particles.push({ x: p.x, y: p.y - 30, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, life: 0.5, color: '#fff3a0', r: 3 });
        }
        if (msg.victim === myId) { me.vx = msg.dir * 200; me.vy = -220; me.invulnUntil = now + 900; }
        if (typeof msg.by === 'string') { const n = senseis.get(msg.by); if (n) fx.push({ kind: 'ring', x: n.rx, y: WORLD.groundY, dir: n.dir, ox: 40, oy: -40, r0: 8, r1: 34, color: '#ffd23f', life: 0.25, dur: 0.25, text: 'HÂY Á!' }); }
        break;
      }
      case 'pkEnd': {
        duels.delete(msg.id);
        $('pkBar').classList.add('hidden'); $('pkCount').classList.add('hidden');
        const inIt = msg.winner === myId || msg.loser === myId;
        if (msg.winner == null) { if (inIt || !msg.loser) showPkResult('🤝 HÒA!', 'Hai bên ngang tài ngang sức'); }
        else if (msg.winner === myId) showPkResult('🏆 CHIẾN THẮNG!', msg.reason === 'leave' ? 'Đối thủ đã bỏ chạy' : `Hạ gục ${msg.loserName}`);
        else if (msg.loser === myId) showPkResult('😵 THUA RỒI...', msg.reason === 'leave' ? 'Con chạy xa quá nên bị xử thua' : 'Tập luyện thêm rồi đấu lại nha!');
        break;
      }
      case 'npcGone': senseis.delete(msg.key); bubbles.delete(msg.key); break;
      case 'story': setTimeout(() => showStory(msg.pages), 1800); break;
      case 'progress': progress = msg.p; renderProgress(); break;
      case 'dialog': showDialog(msg.npc, msg.text, msg.options); break;
      case 'dialogClose': hideDialog(); break;
      case 'toast': toast(msg.text); break;
      case 'gift': showGift(msg); break;
    }
  }

  function onFish(msg) {
    const now = performance.now();
    if (msg.state === 'wait') { fishing.state = 'wait'; fishing.since = now; }
    else if (msg.state === 'bite') { fishing.state = 'bite'; fishing.since = now; say(myId, '❗ Cá cắn câu! Nhấn C!'); }
    else {
      fishing.state = null;
      if (msg.state === 'caught') {
        floaters.push({ x: me.x - 90, y: WORLD.groundY - 40, vy: -60, life: 1.5, text: msg.trash ? '🩴 ' + msg.name : '🐟 +1 ' + msg.name, color: msg.trash ? '#ccc' : '#4fb3ff', size: 17 });
        for (let i = 0; i < 10; i++) particles.push({ x: me.x - 110, y: WORLD.groundY + 12, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 220, life: 0.7, color: '#bfe9ff', r: 3 });
      } else if (msg.text) toast(msg.text);
    }
  }

  function addPlayer(p) {
    const ex = players.get(p.id);
    if (ex) { ex.info = p; return; }
    players.set(p.id, { info: p, rx: p.x, ry: p.y, tx: p.x, ty: p.y, dir: p.dir, anim: p.anim, hp: p.hp, seed: Math.random() * 10, atkStart: 0 });
    updateOnline();
  }
  function updateOnline() {
    const names = [...players.values()].map((p) => p.info.name);
    $('online').textContent = `🟢 Online (${names.length}): ${names.join(', ')}`;
  }

  function say(who, text) {
    const dur = Math.min(12000, 2500 + text.length * 55);
    bubbles.set(who, { text, until: performance.now() + dur });
  }

  function addChat(m) {
    const log = $('chatLog');
    const div = document.createElement('div');
    div.className = m.kind;
    if (m.kind === 'system') div.textContent = m.text;
    else {
      const n = document.createElement('span'); n.className = 'name'; n.textContent = m.name + ': ';
      div.appendChild(n); div.appendChild(document.createTextNode(m.text));
    }
    log.appendChild(div);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  let toastTimer = 0;
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function renderSkills() {
    SPECIES[mySpecies].attacks.forEach((a, i) => { $('skill' + i).querySelector('span').textContent = a.name; });
  }

  function renderProgress() {
    const p = progress;
    const info = players.get(myId);
    if (info) info.info.level = p.level;
    $('hudName').textContent = myName;
    $('hudLevel').textContent = `Cấp ${p.level}`;
    $('expFill').style.width = (p.exp / p.expNext) * 100 + '%';
    $('expText').textContent = `EXP ${p.exp}/${p.expNext}`;
    $('roses').textContent = p.roses; $('rosesNeed').textContent = `/${p.rosesNeed}`;
    $('fish').textContent = p.fish; $('fishNeed').textContent = `/${p.fishNeed}`;
    $('chest').textContent = p.chest; $('key').textContent = p.key;
    const q = $('quest'); q.innerHTML = '';
    const b = document.createElement('b'); b.textContent = `${p.graduated ? '🎓' : '📜'} Bước ${p.stage + 1}/${p.stageCount}: ${p.stageTitle}`;
    let extra = '';
    if (p.stage === 1) extra = ` (${Math.min(p.roses, p.rosesNeed)}/${p.rosesNeed} 🌹)`;
    if (p.stage === 3) extra = ` (${Math.min(p.fish, p.fishNeed)}/${p.fishNeed} 🐟)`;
    q.append(b, document.createElement('br'), document.createTextNode(p.stageHint + extra));
  }

  // ---------- Hội thoại ----------
  const portrait = $('npcPortrait').getContext('2d');
  function showDialog(npc, text, options) {
    dialogOpen = true; dialogOptions = options; dialogNpc = npc;
    $('dialog').classList.remove('hidden');
    $('dialogName').textContent = npc === 'river' ? '🌊 Thần Sông' : '🐢 Trưởng làng';
    $('dialogText').textContent = text;
    const box = $('dialogOptions'); box.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button';
      const k = document.createElement('i'); k.textContent = i + 1 + '.';
      b.appendChild(k); b.appendChild(document.createTextNode(o.label));
      b.onclick = () => send({ t: 'npc', npc, action: o.id });
      box.appendChild(b);
    });
    portrait.clearRect(0, 0, 110, 120);
    portrait.save();
    if (npc === 'river') { portrait.scale(0.66, 0.66); drawRiverGod(portrait, 83, 175, 0, null, false); }
    else { portrait.scale(1.1, 1.1); drawChief(portrait, 38, 100, 0, null); }
    portrait.restore();
  }
  function hideDialog() { dialogOpen = false; $('dialog').classList.add('hidden'); }
  $('dialogClose').onclick = () => send({ t: 'npc', npc: dialogNpc, action: 'bye' });

  // ---------- Quà VIP ----------
  function showGift(g) {
    hideDialog();
    $('giftModal').classList.remove('hidden');
    $('giftReveal').classList.add('hidden');
    const chest = $('chestStage'); chest.classList.remove('hidden', 'pop');
    chest.textContent = '🎁🗝️';
    $('giftName').textContent = g.name; $('giftText').textContent = g.text;
    setTimeout(() => chest.classList.add('pop'), 1400);
    setTimeout(() => { chest.classList.add('hidden'); $('giftReveal').classList.remove('hidden'); confetti(); giftStart = performance.now(); requestAnimationFrame(drawGiftArt); }, 1900);
  }
  // Hộp quà VIP vàng: nắp bật lên, tia sáng xoay, vương miện bay lên
  let giftStart = 0;
  function drawGiftArt(now) {
    if ($('giftModal').classList.contains('hidden')) return;
    requestAnimationFrame(drawGiftArt);
    const cv = $('giftArt'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const t = (now - giftStart) / 1000, open = Math.min(1, t / 0.8), ease = 1 - Math.pow(1 - open, 3);
    g.clearRect(0, 0, W, H);
    const cx = W / 2, by = H - 40;
    g.save(); g.translate(cx, by - 70); g.rotate(t * 0.4);
    for (let i = 0; i < 12; i++) {
      g.rotate(Math.PI / 6);
      g.fillStyle = `rgba(255,255,255,${0.35 * ease})`;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -200); g.lineTo(14, -200); g.closePath(); g.fill();
    }
    g.restore();
    ell(g, cx, by + 4, 90, 12, 'rgba(120,70,0,.2)');
    const box = g.createLinearGradient(cx - 70, 0, cx + 70, 0);
    box.addColorStop(0, '#ffd24a'); box.addColorStop(0.5, '#ffe9a0'); box.addColorStop(1, '#f2a900');
    g.fillStyle = box; rr(g, cx - 70, by - 90, 140, 90, 10); g.fill();
    g.fillStyle = '#ff5c8a'; g.fillRect(cx - 12, by - 90, 24, 90);
    // nắp
    g.save(); g.translate(cx - 80, by - 92); g.rotate(-ease * 1.25);
    g.fillStyle = box; rr(g, 0, -24, 160, 28, 8); g.fill();
    g.fillStyle = '#ff5c8a'; g.fillRect(68, -24, 24, 28);
    ell(g, 66, -30, 18, 11, '#ff7aa2', INK, -0.4); ell(g, 94, -30, 18, 11, '#ff7aa2', INK, 0.4); ell(g, 80, -28, 8, 8, '#ff4d7d', INK);
    g.restore();
    // vương miện VIP bay lên từ hộp
    const cy = by - 100 - ease * 60 + Math.sin(t * 2) * 4;
    g.save(); g.globalAlpha = ease;
    const cg = g.createLinearGradient(0, cy - 40, 0, cy);
    cg.addColorStop(0, '#fff6c2'); cg.addColorStop(1, '#f2b705');
    g.fillStyle = cg;
    g.beginPath(); g.moveTo(cx - 42, cy); g.lineTo(cx - 46, cy - 38); g.lineTo(cx - 22, cy - 18); g.lineTo(cx, cy - 46); g.lineTo(cx + 22, cy - 18); g.lineTo(cx + 46, cy - 38); g.lineTo(cx + 42, cy); g.closePath(); g.fill();
    g.strokeStyle = '#c48f00'; g.lineWidth = 2; g.stroke();
    for (const [dx, c] of [[-24, '#ff5c8a'], [0, '#4fb3ff'], [24, '#2fbf71']]) ell(g, cx + dx, cy - 9, 5, 5, c, INK);
    g.font = '800 22px "Baloo 2", sans-serif'; g.textAlign = 'center';
    g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('VIP', cx, cy + 26); g.fillStyle = '#e04870'; g.fillText('VIP', cx, cy + 26);
    for (let i = 0; i < 8; i++) {
      const a = Math.sin(t * 3 + i * 1.3);
      g.globalAlpha = ease * Math.max(0, a);
      g.fillStyle = i % 2 ? '#fff' : '#ffe27a';
      star(g, cx + Math.cos(i * 0.8) * (90 + i * 6), cy - 10 + Math.sin(i * 1.7) * 50, 5 + a * 4);
    }
    g.restore();
  }
  function confetti() {
    const box = $('confetti'); box.innerHTML = '';
    const colors = ['#ff6f91', '#ffc93c', '#2fbf71', '#4fb3ff', '#9b5de5'];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2 + Math.random() * 2.5 + 's'; c.style.animationDelay = Math.random() * 0.8 + 's';
      box.appendChild(c);
    }
  }
  $('giftClose').onclick = () => { $('giftModal').classList.add('hidden'); $('confetti').innerHTML = ''; };

  // ---------- Tỷ thí PK (giao diện) ----------
  const duels = new Map(); // id -> {id, keys, names, hp, state, endsAt}
  const senseis = new Map(); // khóa -> {rx, tx, dir, anim, face}
  let pkInvite = null; // {from, name, until}
  let pkResultTimer = 0;
  const myDuel = () => [...duels.values()].find((d) => d.keys.includes(myId));
  const keyPos = (k) => {
    if (k === myId) return { x: me.x, y: me.y };
    if (typeof k === 'string') { const n = senseis.get(k); return n && { x: n.rx, y: WORLD.groundY }; }
    const p = players.get(k); return p && { x: p.rx, y: p.ry };
  };
  function nearestFoe() {
    let best = null, bd = 160;
    for (const p of players.values()) {
      if (p.info.id === myId) continue;
      const d = Math.abs(p.rx - me.x);
      if (d < bd && Math.abs(p.ry - me.y) < 120) { bd = d; best = p; }
    }
    return best;
  }
  function addDuel(d) { duels.set(d.id, { ...d, endsAt: performance.now() + d.endsIn }); }
  function showInvite(msg) {
    pkInvite = { from: msg.from, until: performance.now() + 15000 };
    $('pkInviteText').textContent = `⚔️ ${msg.name} (${msg.species}) mời con tỷ thí PK! Nhận lời không?`;
    $('pkInvite').classList.remove('hidden');
  }
  function answerInvite(ok) {
    if (!pkInvite) return;
    send({ t: 'pkAnswer', from: pkInvite.from, ok });
    pkInvite = null; $('pkInvite').classList.add('hidden');
  }
  $('pkYes').onclick = () => answerInvite(true);
  $('pkNo').onclick = () => answerInvite(false);
  $('pkBtn').addEventListener('click', () => { pkQueued = true; });
  function pkCountdown(d) {
    const el = $('pkCount');
    el.classList.remove('hidden');
    let n = 3;
    const step = () => {
      if (!duels.has(d.id) || d.state === 'fight') { el.classList.add('hidden'); return; }
      el.textContent = n > 0 ? n : 'ĐÁNH!';
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      n--;
      setTimeout(step, 1000);
    };
    step();
  }
  function showPkResult(html, sub) {
    const el = $('pkResult');
    el.textContent = html;
    if (sub) { const s2 = document.createElement('small'); s2.textContent = sub; el.appendChild(s2); }
    el.classList.remove('hidden');
    clearTimeout(pkResultTimer); pkResultTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }
  function renderPkBar(now) {
    const d = myDuel();
    $('pkBar').classList.toggle('hidden', !d);
    if (!d) return;
    const [a, b] = d.keys, mineFirst = a === myId;
    const left = mineFirst ? a : b, right = mineFirst ? b : a;
    const name = (k) => d.names[d.keys.indexOf(k)];
    $('pkNameA').textContent = name(left) + (left === myId ? ' (con)' : '');
    $('pkNameB').textContent = name(right);
    $('pkHpA').style.width = d.hp[left] + '%'; $('pkHpTextA').textContent = `${d.hp[left]}/100`;
    $('pkHpB').style.width = d.hp[right] + '%'; $('pkHpTextB').textContent = `${d.hp[right]}/100`;
    const sec = Math.max(0, Math.ceil((d.endsAt - now) / 1000));
    $('pkTimer').textContent = d.state === 'fight' ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : 'Chuẩn bị';
  }
  // vòng sàn đấu dưới chân và thanh máu trên đầu hai đấu thủ
  function drawDuelMarks(t) {
    for (const d of duels.values()) {
      const pa = keyPos(d.keys[0]), pb = keyPos(d.keys[1]);
      if (!pa || !pb) continue;
      const cx = (pa.x + pb.x) / 2, rx = Math.max(90, Math.abs(pa.x - pb.x) / 2 + 60);
      ctx.save();
      ctx.strokeStyle = `rgba(255,201,60,${0.55 + Math.sin(t * 4) * 0.2})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.ellipse(cx, WORLD.groundY + 4, rx, 12, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      for (const k of d.keys) {
        const p = keyPos(k);
        const top = p.y - (typeof k === 'string' ? 112 : 92);
        ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(ctx, p.x - 26, top, 52, 7, 3.5); ctx.fill();
        ctx.fillStyle = k === myId ? '#2fbf71' : '#ff4d6d'; rr(ctx, p.x - 26, top, 52 * d.hp[k] / 100, 7, 3.5); ctx.fill();
      }
    }
  }

  // ---------- Câu chuyện mở đường cho phần sau ----------
  let story = null; // {pages, i, start}
  function showStory(pages) {
    story = { pages, i: 0, start: performance.now() };
    hideDialog();
    $('storyModal').classList.remove('hidden');
    renderStoryPage();
    requestAnimationFrame(drawStoryArt);
  }
  function renderStoryPage() {
    const p = story.pages[story.i];
    $('storyStep').textContent = `TRANG ${story.i + 1}/${story.pages.length}`;
    $('storyTitle').textContent = p.title; $('storyText').textContent = p.text;
    $('storyPrev').disabled = story.i === 0;
    $('storyNext').textContent = story.i === story.pages.length - 1 ? 'Đóng ✨' : 'Tiếp ▶';
    story.start = performance.now();
  }
  $('storyPrev').onclick = () => { if (story && story.i > 0) { story.i--; renderStoryPage(); } };
  $('storyNext').onclick = () => {
    if (!story) return;
    if (story.i < story.pages.length - 1) { story.i++; renderStoryPage(); }
    else { story = null; $('storyModal').classList.add('hidden'); }
  };
  function drawStoryArt(now) {
    if (!story) return;
    requestAnimationFrame(drawStoryArt);
    const cv = $('storyArt'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    const t = now / 1000, fade = Math.min(1, (now - story.start) / 500);
    const scene = story.pages[story.i].scene;
    g.save(); g.clearRect(0, 0, W, H); g.globalAlpha = fade;
    const sky = (c1, c2) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
    const ground = (c) => { g.fillStyle = c; g.fillRect(0, H - 40, W, 40); };
    if (scene === 'graduate') {
      sky('#8fd3ff', '#ffe6ef'); ground('#7ccf5a');
      g.fillStyle = '#8a5a3c'; g.fillRect(414, H - 130, 14, 90);
      for (const [dx, dy, r] of [[-30, -10, 30], [24, -14, 30], [0, -40, 32]]) ell(g, 421 + dx, H - 130 + dy, r, r * 0.85, '#ffb7cd', INK);
      drawChief(g, 120, H - 40, t, null);
      drawAnimal(g, 300, H - 40, mySpecies, mySkin, { t, dir: -1, anim: 'idle' });
      // tấm bằng tốt nghiệp
      g.save(); g.translate(250, H - 120 + Math.sin(t * 2) * 4); g.rotate(-0.15);
      g.fillStyle = '#fff6dc'; rr(g, -26, -10, 52, 20, 4); g.fill(); g.strokeStyle = '#c9a227'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#e63946'; g.fillRect(-3, -10, 6, 20);
      g.restore();
      for (let i = 0; i < 24; i++) {
        const p = (t * 0.3 + i / 24) % 1;
        g.fillStyle = ['#ff6f91', '#ffc93c', '#2fbf71', '#4fb3ff'][i % 4];
        g.fillRect((i * 47) % W + Math.sin(t + i) * 10, p * H, 6, 9);
      }
    } else if (scene === 'river') {
      sky('#0b1640', '#2e3570');
      for (let i = 0; i < 30; i++) { g.globalAlpha = fade * (0.5 + 0.5 * Math.sin(t * 2 + i)); g.fillStyle = '#fff'; g.fillRect((i * 97) % W, (i * 37) % 120, 2, 2); }
      g.globalAlpha = fade;
      ell(g, 400, 46, 22, 22, '#f4f1dc'); ell(g, 410, 40, 19, 19, '#0f1b4d');
      g.fillStyle = '#1d5f99'; g.fillRect(0, H - 70, W, 70);
      drawRiverGod(g, 240, H - 40, t, null, false);
      g.fillStyle = 'rgba(29,95,153,.9)'; g.fillRect(0, H - 52, W, 52);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(240, H - 52, 50 + ((t * 30 + i * 25) % 150), 6, 0, 0, Math.PI * 2); g.stroke(); }
      // tấm bản đồ ướt
      g.save(); g.translate(300, H - 150 + Math.sin(t * 2) * 3); g.rotate(0.2);
      g.fillStyle = '#e8d3a2'; rr(g, -24, -18, 48, 36, 4); g.fill(); g.strokeStyle = '#8a5a3c'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#c0392b'; g.beginPath(); g.moveTo(-8, -6); g.lineTo(4, 6); g.moveTo(4, -6); g.lineTo(-8, 6); g.stroke();
      g.restore();
    } else if (scene === 'map') {
      sky('#f2e1b5', '#dcc28a');
      g.strokeStyle = 'rgba(138,90,60,.35)'; g.lineWidth = 1;
      for (let x = 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      const iy = 100 + Math.sin(t * 1.5) * 6;
      for (const [dx, r] of [[-70, 26], [-30, 34], [20, 38], [70, 28], [110, 20]]) ell(g, 240 + dx, iy + 30, r, r * 0.6, '#ffffff', INK);
      g.fillStyle = '#8bc34a'; g.beginPath(); g.ellipse(240, iy + 10, 90, 22, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#9b7bd4'; g.fillRect(222, iy - 40, 36, 40);
      g.fillStyle = '#7d5cc0'; g.beginPath(); g.moveTo(218, iy - 40); g.lineTo(240, iy - 66); g.lineTo(262, iy - 40); g.fill();
      ell(g, 240, iy - 74, 7, 7, '#ffd23f');
      g.strokeStyle = '#c0392b'; g.lineWidth = 3; g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(40, H - 30); g.quadraticCurveTo(110, H - 120, 180, iy + 34); g.stroke(); g.setLineDash([]);
      g.lineWidth = 4; g.beginPath(); g.moveTo(32, H - 38); g.lineTo(48, H - 22); g.moveTo(48, H - 38); g.lineTo(32, H - 22); g.stroke();
      g.font = '800 15px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#5c3520';
      g.fillText('ĐẢO MÂY BAY', 240, iy + 72);
    } else if (scene === 'cat') {
      sky('#2a1640', '#5b2a6e');
      // mặt trời bị hút thành vòng xoáy
      for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(255,210,63,${0.6 - i * 0.18})`; g.lineWidth = 4; g.beginPath(); g.arc(380, 60, 20 + i * 12, t * 2 + i, t * 2 + i + 4); g.stroke(); }
      ell(g, 380, 60, 14, 14, '#ffd23f');
      g.fillStyle = '#120a1c';
      g.beginPath(); g.ellipse(200, H - 20, 90, 70, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.arc(200, H - 120, 48, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(160, H - 150); g.lineTo(166, H - 196); g.lineTo(190, H - 160); g.fill();
      g.beginPath(); g.moveTo(240, H - 150); g.lineTo(234, H - 196); g.lineTo(210, H - 160); g.fill();
      g.strokeStyle = '#120a1c'; g.lineWidth = 12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(280, H - 30); g.quadraticCurveTo(330, H - 60 + Math.sin(t * 2) * 10, 310, H - 120); g.stroke();
      const blink = Math.sin(t * 1.3) > 0.95 ? 0.15 : 1;
      for (const ex of [184, 216]) { ell(g, ex, H - 124, 9, 7 * blink, '#ffe04a'); ell(g, ex, H - 124, 2, 6 * blink, '#120a1c'); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(174, H - 168); g.lineTo(180, H - 188); g.lineTo(192, H - 176); g.lineTo(200, H - 194); g.lineTo(208, H - 176); g.lineTo(220, H - 188); g.lineTo(226, H - 168); g.closePath(); g.fill();
      g.font = '800 14px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe04a';
      g.fillText('VUA MÈO MUN BÓNG TỐI', 200, H - 6);
    } else {
      sky('#ff9e7a', '#ffe0c2'); ground('#6fb35a');
      const iy = 70 + Math.sin(t * 1.2) * 5;
      for (const [dx, r] of [[-40, 16], [0, 22], [40, 16]]) ell(g, 360 + dx, iy + 18, r, r * 0.6, '#fff4ea');
      g.fillStyle = '#9b7bd4'; g.fillRect(350, iy - 14, 20, 24); g.fillStyle = '#7d5cc0'; g.beginPath(); g.moveTo(346, iy - 14); g.lineTo(360, iy - 30); g.lineTo(374, iy - 14); g.fill();
      drawChief(g, 110, H - 40, t, null);
      drawAnimal(g, 200, H - 40, mySpecies, mySkin, { t, dir: 1, anim: 'idle' });
      g.font = '800 30px "Baloo 2", sans-serif'; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText('CÒN TIẾP...', W / 2, 50); g.fillStyle = '#e04870'; g.fillText('CÒN TIẾP...', W / 2, 50);
    }
    g.restore();
  }

  // ---------- Chat ----------
  const chatInput = $('chatInput');
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) send({ t: 'chat', text });
    chatInput.value = ''; chatInput.blur();
  };
  document.querySelectorAll('[data-emote]').forEach((b) => { b.onclick = () => send({ t: 'chat', text: b.dataset.emote }); });

  // ---------- Điều khiển ----------
  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'down', s: 'down', S: 'down' };
  window.addEventListener('keydown', (e) => {
    if ($('game').classList.contains('hidden')) return;
    if (document.activeElement === chatInput) { if (e.key === 'Escape') chatInput.blur(); return; }
    if (e.key === 'Enter') { e.preventDefault(); chatInput.focus(); return; }
    if (pkInvite && ['y', 'Y'].includes(e.key)) { answerInvite(true); return; }
    if (pkInvite && ['n', 'N'].includes(e.key)) { answerInvite(false); return; }
    if (['p', 'P'].includes(e.key) && !e.repeat) pkQueued = true;
    if (dialogOpen && /^[1-9]$/.test(e.key)) { const o = dialogOptions[Number(e.key) - 1]; if (o) send({ t: 'npc', npc: dialogNpc, action: o.id }); return; }
    if (e.key === 'Escape' && dialogOpen) { send({ t: 'npc', npc: dialogNpc, action: 'bye' }); return; }
    if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = true;
    if (['ArrowUp', 'w', 'W', ' '].includes(e.key) && !e.repeat) jumpQueued = true;
    if (['j', 'J', 'z', 'Z'].includes(e.key)) atkHeld[0] = true;
    if (['k', 'K', 'x', 'X'].includes(e.key)) atkHeld[1] = true;
    if (['e', 'E', 'f', 'F'].includes(e.key) && !e.repeat) talkQueued = true;
    if (['c', 'C'].includes(e.key) && !e.repeat) fishQueued = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false;
    if (['j', 'J', 'z', 'Z'].includes(e.key)) atkHeld[0] = false;
    if (['k', 'K', 'x', 'X'].includes(e.key)) atkHeld[1] = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; atkHeld[0] = atkHeld[1] = false; });
  document.querySelectorAll('#touch button').forEach((b) => {
    const k = b.dataset.key;
    const down = (e) => {
      e.preventDefault();
      if (k === 'jump') jumpQueued = true; else if (k === 'talk') talkQueued = true; else if (k === 'fish') fishQueued = true; else if (k === 'pk') pkQueued = true;
      else if (k === 'attack') atkHeld[0] = true; else if (k === 'skill') atkHeld[1] = true; else keys[k] = true;
    };
    const up = (e) => { e.preventDefault(); if (k === 'attack') atkHeld[0] = false; else if (k === 'skill') atkHeld[1] = false; else keys[k] = false; };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  for (const i of [0, 1]) {
    const b = $('skill' + i);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); atkHeld[i] = true; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { atkHeld[i] = false; });
  }
  $('fishBtn').addEventListener('click', () => { fishQueued = true; });

  const VIEW_H = 600; // chiều cao logic của khung nhìn (mặt đất ở y=470, dư đất bên dưới cho khung chat)
  const DEEP = 2000; // vẽ đất/nước sâu xuống dưới, đủ cho màn hình dọc
  let scale = 1, offY = 0, camX = 0, viewW = 960;
  canvas.addEventListener('click', (e) => {
    if (!WORLD) return;
    const wx = e.clientX / scale + camX, wy = e.clientY / scale - offY;
    if (wy < WORLD.groundY - 130 || wy > WORLD.groundY + 20) return;
    if (Math.abs(wx - WORLD.chiefX - 5) < 45 || Math.abs(wx - WORLD.riverGodX) < 50) talkQueued = true;
  });

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = innerHeight / VIEW_H;
    if (innerWidth / scale < 520) scale = innerWidth / 520;
    // màn hình dọc (điện thoại): chia phần dư cho trời phía trên và đất phía dưới để chat/nút không che nhân vật
    offY = (innerHeight / scale - VIEW_H) * 0.45;
    viewW = innerWidth / scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- Hiệu ứng chiêu thức ----------
  function spawnAttackFx(x, y, dir, species, k) {
    const add = (o) => fx.push({ x, y, dir, life: o.dur, dur: o.dur, ...o });
    if (species === 'hamster') {
      if (k === 0) add({ kind: 'ring', ox: 30, oy: -24, r0: 8, r1: 34, color: '#ffd23f', dur: 0.25, text: 'BÙM!' });
      else add({ kind: 'seed', ox: 24, oy: -34, speed: 900, dur: 0.33 });
    } else if (species === 'duck') {
      if (k === 0) add({ kind: 'slash', ox: 22, oy: -30, r: 44, color: '#e8f2ff', dur: 0.2 });
      else { add({ kind: 'wave', oy: -30, r0: 20, r1: 140, color: '#ffe066', dur: 0.45, text: 'QUẠ QUẠ!' }); }
    } else if (species === 'platypus') {
      if (k === 0) add({ kind: 'ring', ox: 40, oy: -42, r0: 6, r1: 26, color: '#ffd23f', dur: 0.22, text: 'BỐP!' });
      else add({ kind: 'dust', ox: -70, oy: 0, color: '#d9b38c', dur: 0.45, text: 'BẸP!' });
    } else if (species === 'chick') {
      if (k === 0) add({ kind: 'ring', ox: 28, oy: -24, r0: 4, r1: 16, color: '#fff3a0', dur: 0.15, text: 'mổ!' });
      else add({ kind: 'steam', oy: -30, dur: 0.6, text: 'HỪMMM!' });
    } else if (species === 'croc') {
      if (k === 0) add({ kind: 'chomp', ox: 46, oy: -46, dur: 0.3, text: 'CHOMP!' });
      else add({ kind: 'slash', ox: -24, oy: -14, r: 90, color: '#c9f2b0', back: true, dur: 0.35, text: 'VỤT!' });
    }
  }

  function drawFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt;
      if (f.life <= 0) { fx.splice(i, 1); continue; }
      const p = 1 - f.life / f.dur, a = Math.min(1, f.life / f.dur * 2);
      const cx = f.x + (f.ox || 0) * f.dir, cy = f.y + (f.oy || 0);
      ctx.save(); ctx.globalAlpha = a;
      if (f.kind === 'ring') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, f.r0 + (f.r1 - f.r0) * p, 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'seed') {
        const sx = cx + f.dir * f.speed * (f.dur - f.life);
        ell(ctx, sx, cy, 6, 3.5, '#5b4636', null, 0); ell(ctx, sx - f.dir * 2, cy - 1, 3, 1.5, '#d9c6a5');
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - f.dir * 8, cy); ctx.lineTo(sx - f.dir * 30, cy); ctx.stroke();
      } else if (f.kind === 'slash') {
        const d = f.back ? -f.dir : f.dir;
        ctx.strokeStyle = f.color; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const a0 = d > 0 ? -1.2 : Math.PI - 0.6, a1 = d > 0 ? 0.6 : Math.PI + 1.2;
        ctx.beginPath(); ctx.arc(f.x + d * 10, f.y - 28, f.r * 0.6 + f.r * 0.4 * p, a0, a1); ctx.stroke();
      } else if (f.kind === 'wave') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 5;
        for (const s of [1, 0.7]) { ctx.beginPath(); ctx.ellipse(f.x, cy, (f.r0 + (f.r1 - f.r0) * p) * s, 30 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
      } else if (f.kind === 'dust') {
        for (let j = 0; j < 6; j++) ell(ctx, cx + (j - 2.5) * 22 * f.dir * (0.5 + p), cy - 8 - p * 20 * (j % 2 + 1), 10 * (1 - p * 0.5), 7, f.color);
      } else if (f.kind === 'steam') {
        for (let j = 0; j < 8; j++) {
          const ang = j / 8 * Math.PI * 2;
          const r = 30 + p * 100;
          ell(ctx, f.x + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.4, 12 * (1 - p * 0.4), 10 * (1 - p * 0.4), '#ffffff', INK);
        }
      } else if (f.kind === 'chomp') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        const g = (1 - Math.abs(0.5 - p) * 2) * 14;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          for (let j = 0; j < 4; j++) { ctx.lineTo(cx - 14 + j * 9, cy + s * (14 - g)); ctx.lineTo(cx - 9 + j * 9, cy + s * (4 - g * 0.3)); }
          ctx.lineTo(cx + 22, cy + s * (14 - g)); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (f.text) label(ctx, f.text, cx + (f.kind === 'wave' || f.kind === 'steam' ? 0 : 0), cy - 40 - p * 20, '#fff', 16);
      ctx.restore();
    }
  }

  // ---------- Vật lý người chơi ----------
  const GRAV = 1800, SPEED = 220, JUMP = 640;
  let lastSend = 0;
  function myAnim(now) {
    if (me.dead) return 'dead';
    if (now < me.atkUntil) return 'atk' + me.atkK;
    if (now < me.invulnUntil - 600) return 'hurt';
    if (fishing.state) return 'fish';
    if (!me.onGround) return 'jump';
    return Math.abs(me.vx) > 1 ? 'run' : 'idle';
  }
  function sendState(now) {
    lastSend = now;
    send({ t: 'state', x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, anim: myAnim(now), hp: Math.round(me.hp) });
  }
  function cancelFishing() { if (fishing.state) { fishing.state = null; send({ t: 'unfish' }); } }
  const nearDock = () => me.x <= WORLD.dock.x2 + 20 && me.onGround && me.y >= WORLD.groundY - 1;
  const nearRiver = () => me.x <= WORLD.dock.x2 + 60;
  const nearChief = () => Math.abs(me.x - WORLD.chiefX) < 190;

  function updateMe(dt, now) {
    if (me.dead) {
      if (now > me.deadUntil) Object.assign(me, { dead: false, x: WORLD.spawnX, y: WORLD.groundY, vx: 0, vy: 0, hp: 100, invulnUntil: now + 2000 });
      return;
    }
    const typing = document.activeElement === chatInput;
    const dirIn = typing ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (now < me.invulnUntil - 700) { /* đang bị đẩy lùi */ } else me.vx = dirIn * SPEED;
    if (dirIn) { me.dir = dirIn; cancelFishing(); }
    if (jumpQueued && !typing) {
      cancelFishing();
      if (me.onGround) { me.vy = -JUMP; me.jumps = 1; me.onGround = false; }
      else if (me.jumps < 2) { me.vy = -JUMP * 0.9; me.jumps = 2; for (let i = 0; i < 6; i++) particles.push({ x: me.x, y: me.y, vx: (Math.random() - 0.5) * 120, vy: Math.random() * 60, life: 0.4, color: '#fff', r: 4 }); }
    }
    jumpQueued = false;
    if (keys.down && me.onGround && me.y < WORLD.groundY) { me.dropUntil = now + 250; me.onGround = false; }

    const prevY = me.y;
    me.vy += GRAV * dt;
    me.x = Math.max(WORLD.minX, Math.min(WORLD.width - 20, me.x + me.vx * dt));
    me.y += me.vy * dt;
    const fallV = me.vy, wasGround = me.onGround;
    me.onGround = false;
    if (me.vy >= 0 && now > me.dropUntil) {
      for (const p of WORLD.platforms) {
        if (me.x > p.x && me.x < p.x + p.w && prevY <= p.y + 1 && me.y >= p.y) { me.y = p.y; me.vy = 0; me.onGround = true; }
      }
    }
    if (me.y >= WORLD.groundY) { me.y = WORLD.groundY; me.vy = 0; me.onGround = true; }
    if (me.onGround) me.jumps = 0;
    if (me.onGround && !wasGround && fallV > 250) { me.landAt = now; me.landPow = Math.min(1, fallV / 900); }

    // Đánh (J) và tuyệt chiêu (K)
    const atks = SPECIES[mySpecies].attacks;
    for (const k of [0, 1]) {
      if (atkHeld[k] && !typing && now > me.cd[k] && now > me.atkUntil) {
        me.cd[k] = now + atks[k].cd; me.atkK = k; me.atkUntil = now + ATK_DUR[k];
        cancelFishing();
        sendState(now);
        send({ t: 'attack', k });
        spawnAttackFx(me.x, me.y, me.dir, mySpecies, k);
      }
      const left = Math.max(0, me.cd[k] - now);
      $('skill' + k).querySelector('i').style.height = (left / atks[k].cd) * 100 + '%';
    }

    // Va chạm quái
    if (now > me.invulnUntil) {
      for (const m of monsters.values()) {
        if (m.dead) continue;
        const ti = MTYPES[m.type];
        if (Math.abs(m.rx - me.x) < ti.w / 2 - 2 && me.y > WORLD.groundY - ti.h + 4) {
          me.hp -= ti.dmg; me.lastHurt = now;
          me.invulnUntil = now + 1000;
          me.vx = (me.x < m.rx ? -1 : 1) * 260; me.vy = -320;
          cancelFishing();
          floaters.push({ x: me.x, y: me.y - 70, vy: -50, life: 1, text: '-' + ti.dmg, color: '#ff4d6d', size: 16 });
          if (me.hp <= 0) {
            me.hp = 0; me.dead = true; me.deadUntil = now + 2000;
            say(myId, 'Ui da... cho tui nằm xíu 😵'); send({ t: 'died' });
          } else if (Math.random() < 0.3) say(myId, ['Úi!', 'Đau quá à!', 'Hông chịu đâu!'][Math.floor(Math.random() * 3)]);
          break;
        }
      }
    }
    if (now - me.lastHurt > 2000 && me.hp < 100) me.hp = Math.min(100, me.hp + 7 * dt);

    // Tự nhặt hoa hồng
    for (const d of drops.values()) {
      if (Math.abs(me.x - d.x) < 50 && me.y > WORLD.groundY - 80 && now - (pickupSent.get(d.id) || 0) > 800) {
        pickupSent.set(d.id, now); sendState(now); send({ t: 'pickup', id: d.id });
      }
    }

    // Câu cá
    const canFish = progress && progress.stage === 3;
    $('fishBtn').classList.toggle('hidden', !(nearDock() && canFish) && !fishing.state);
    if (fishQueued && !typing) {
      if (fishing.state) send({ t: 'reel' });
      else if (!canFish) toast(progress && progress.stage > 3 ? 'Thần Sông no rồi, không cần câu thêm đâu!' : 'Chưa có nhiệm vụ câu cá! Ra bờ sông gặp Thần Sông nhận nhiệm vụ trước đã nha.');
      else if (nearDock()) { me.dir = -1; me.vx = 0; fishing.state = 'wait'; fishing.since = now; sendState(now); send({ t: 'cast' }); }
      else toast('Ra bến gỗ ở bờ sông (phía trái làng) mới câu cá được nha!');
    }
    fishQueued = false;

    // Mời tỷ thí người đứng gần
    const foe = myDuel() ? null : nearestFoe();
    $('pkBtn').classList.toggle('hidden', !foe);
    if (pkQueued && !typing) {
      if (myDuel()) toast('Đang tỷ thí rồi, tập trung đánh đi!');
      else if (foe) { sendState(now); send({ t: 'pkInvite', id: foe.info.id }); }
      else toast('Lại gần một bạn khác rồi nhấn P để mời tỷ thí nha!');
    }
    pkQueued = false;
    if (pkInvite) {
      const left = pkInvite.until - now;
      $('pkInviteTimer').style.width = Math.max(0, left / 150) + '%';
      if (left <= 0) { pkInvite = null; $('pkInvite').classList.add('hidden'); }
    }

    // Nói chuyện
    if (talkQueued) {
      if (nearChief()) { sendState(now); send({ t: 'npc', npc: 'chief', action: 'talk' }); }
      else if (nearRiver()) { sendState(now); send({ t: 'npc', npc: 'river', action: 'talk' }); }
      else toast('Lại gần Trưởng làng (cụ rùa đội nón) hoặc Thần Sông để nói chuyện nha!');
    }
    talkQueued = false;
    if (dialogOpen && !(dialogNpc === 'river' ? nearRiver() : Math.abs(me.x - WORLD.chiefX) < 230)) hideDialog();

    if (now - lastSend > 66) sendState(now);
  }

  // ---------- Trời & thời tiết ----------
  const TOD = { day: 0, dusk: 1, night: 2 };
  const env = { time: store.get('time') || 'day', weather: store.get('weather') || 'clear', tod: 0, rain: 0, snow: 0, cover: 0, flash: 0, nextFlash: 0 };
  if (!(env.time in TOD) && env.time !== 'auto') env.time = 'day';
  if (!['clear', 'rain', 'snow'].includes(env.weather)) env.weather = 'clear';
  function todTarget() {
    if (env.time !== 'auto') return TOD[env.time];
    const ph = (Date.now() / 1000 % 300) / 300; // tự động: một ngày dài 5 phút
    if (ph < 0.45) return 0;
    if (ph < 0.55) return (ph - 0.45) * 20;
    if (ph < 0.85) return 2;
    return 2 - ((ph - 0.85) / 0.15) * 2;
  }
  env.tod = todTarget();
  env.rain = env.weather === 'rain' ? 1 : 0;
  env.snow = env.cover = env.weather === 'snow' ? 1 : 0;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const nightK = () => clamp01(env.tod - 1);
  const duskK = () => clamp01(1 - Math.abs(env.tod - 1));
  function updateEnv(dt, now) {
    env.tod += (todTarget() - env.tod) * Math.min(1, dt * 1.2);
    env.rain += ((env.weather === 'rain' ? 1 : 0) - env.rain) * Math.min(1, dt * 0.8);
    env.snow += ((env.weather === 'snow' ? 1 : 0) - env.snow) * Math.min(1, dt * 0.8);
    env.cover = clamp01(env.cover + (env.snow > 0.5 ? dt * 0.08 : -dt * 0.15));
    if (env.rain > 0.6 && now > env.nextFlash) {
      if (env.nextFlash) env.flash = 1;
      env.nextFlash = now + 7000 + Math.random() * 9000;
    }
    env.flash = Math.max(0, env.flash - dt * 2.5);
  }
  function refreshEnvUI() {
    document.querySelectorAll('[data-time]').forEach((b) => b.classList.toggle('on', b.dataset.time === env.time));
    document.querySelectorAll('[data-weather]').forEach((b) => b.classList.toggle('on', b.dataset.weather === env.weather));
  }
  document.querySelectorAll('[data-time]').forEach((b) => { b.onclick = () => { env.time = b.dataset.time; store.set('time', env.time); refreshEnvUI(); }; });
  document.querySelectorAll('[data-weather]').forEach((b) => { b.onclick = () => { env.weather = b.dataset.weather; store.set('weather', env.weather); refreshEnvUI(); }; });
  $('envToggle').onclick = () => {
    const open = $('envMenu').classList.toggle('hidden') === false;
    $('envToggle').setAttribute('aria-expanded', String(open));
  };
  refreshEnvUI();

  const SKY = { day: ['#7cc8ff', '#cfeeff', '#fff0f5'], dusk: ['#5b5fb4', '#ff9e7a', '#ffd59e'], night: ['#060b2b', '#16205a', '#2e3570'] };
  const RAIN_SKY = ['#5f6b7d', '#8c98a8', '#aeb7c2'], SNOW_SKY = ['#aebdd0', '#dbe4ee', '#f2f6fa'];
  function skyColor(i) {
    let c = env.tod <= 1 ? mix(SKY.day[i], SKY.dusk[i], env.tod) : mix(SKY.dusk[i], SKY.night[i], env.tod - 1);
    c = mix(c, RAIN_SKY[i], env.rain * 0.65 * (1 - nightK() * 0.6));
    return mix(c, SNOW_SKY[i], env.snow * 0.45 * (1 - nightK() * 0.7));
  }
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---------- Vẽ cảnh: bầu trời và các lớp xa (toạ độ màn hình) ----------
  function drawSky(t) {
    const top = -offY, G = WORLD.groundY;
    const g = ctx.createLinearGradient(0, top, 0, G);
    g.addColorStop(0, skyColor(0)); g.addColorStop(0.65, skyColor(1)); g.addColorStop(1, skyColor(2));
    ctx.fillStyle = g; ctx.fillRect(0, top, viewW, G - top + 2);
    const nk = nightK(), clear = 1 - Math.max(env.rain, env.snow * 0.7);
    // sao
    if (nk > 0) {
      for (let i = 0; i < 70; i++) {
        const a = nk * clear * (0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 2) + i));
        ctx.globalAlpha = a; ctx.fillStyle = '#fff';
        const sx = hash(i) * viewW, sy = top + hash(i + 99) * (G - top) * 0.6;
        if (i % 9 === 0) star(ctx, sx, sy, 3); else ctx.fillRect(sx, sy, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    }
    // mặt trời đi xuống khi chiều tối, mặt trăng hiện lên khi đêm
    const sunA = clamp01(1.4 - env.tod) * clear;
    if (sunA > 0) {
      const sx = viewW - 150, sy = top + 70 + env.tod * 120;
      const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 110);
      sg.addColorStop(0, `rgba(255,240,170,${0.55 * sunA})`); sg.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - 110, sy - 110, 220, 220);
      ctx.globalAlpha = sunA; ell(ctx, sx, sy, 34, 34, mix('#fff3a6', '#ffb36b', clamp01(env.tod))); ctx.globalAlpha = 1;
    }
    if (nk > 0) {
      const mx = 170, my = top + 80;
      ctx.globalAlpha = nk * (1 - env.rain * 0.7);
      const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 90);
      mg.addColorStop(0, 'rgba(220,230,255,.35)'); mg.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 90, my - 90, 180, 180);
      ell(ctx, mx, my, 26, 26, '#f4f1dc');
      ell(ctx, mx + 11, my - 6, 22, 22, skyColor(0));
      ctx.globalAlpha = 1;
    }
    // mây phồng có bóng, xám dần khi mưa và tối
    const cloudTop = mix(mix('#ffffff', '#5d6575', env.rain * 0.8), '#2a3160', nk * 0.8);
    const cloudBot = mix(mix('#e3ecf7', '#3f4756', env.rain * 0.8), '#1c2350', nk * 0.8);
    const n = 7 + Math.round(env.rain * 5);
    for (let i = 0; i < n; i++) {
      const span = viewW + 500;
      const cx = (((hash(i + 3) * span - camX * 0.12 + t * (6 + hash(i) * 8)) % span) + span) % span - 250;
      const cy = top + 40 + hash(i + 11) * 140 + Math.sin(t * 0.2 + i) * 3;
      const s = 0.7 + hash(i + 5) * 0.8;
      const cg = ctx.createLinearGradient(0, cy - 30 * s, 0, cy + 18 * s);
      cg.addColorStop(0, cloudTop); cg.addColorStop(1, cloudBot);
      ctx.fillStyle = cg;
      ctx.beginPath();
      for (const [dx, dy, r] of [[-38, 4, 20], [-14, -12, 26], [16, -16, 30], [44, 0, 20], [0, 6, 22]]) { ctx.moveTo(cx + dx * s + r * s, cy + dy * s); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); }
      ctx.fill();
    }
  }

  function drawFar(t) {
    const G = WORLD.groundY, top = -offY;
    // dãy núi xa có tuyết trên đỉnh
    const par1 = 0.12, step = 230;
    const k0 = Math.floor((camX * par1 - 300) / step);
    const mg = ctx.createLinearGradient(0, G - 260, 0, G);
    mg.addColorStop(0, mix('#b9c8ea', skyColor(1), 0.25)); mg.addColorStop(1, mix('#d8e4f2', skyColor(2), 0.4));
    for (let k = k0; k < k0 + viewW / step + 4; k++) {
      const px = k * step - camX * par1 + hash(k) * 60, h = 150 + hash(k + 40) * 110, w = 170 + hash(k + 80) * 80;
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.moveTo(px - w, G - 30); ctx.quadraticCurveTo(px - w * 0.3, G - h * 0.7, px - 12, G - h + 6); ctx.quadraticCurveTo(px, G - h - 4, px + 12, G - h + 6); ctx.quadraticCurveTo(px + w * 0.3, G - h * 0.7, px + w, G - 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.moveTo(px - 34, G - h + 34); ctx.quadraticCurveTo(px - 14, G - h + 2, px, G - h - 2); ctx.quadraticCurveTo(px + 14, G - h + 2, px + 34, G - h + 34);
      ctx.lineTo(px + 18, G - h + 26); ctx.lineTo(px + 6, G - h + 38); ctx.lineTo(px - 8, G - h + 26); ctx.lineTo(px - 20, G - h + 36); ctx.closePath(); ctx.fill();
    }
    // đồi giữa và đồi gần (lăn tăn, có cây nhỏ)
    const hills = (par, base, amp, wl, c1, c2, seed, trees) => {
      const g = ctx.createLinearGradient(0, base - amp, 0, G + 10);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-20, G + 10);
      const pts = [];
      for (let x = -20; x <= viewW + 20; x += 16) {
        const wx = x + camX * par;
        const y = base - (Math.sin(wx / wl + seed) * 0.6 + Math.sin(wx / (wl * 0.43) + seed * 2) * 0.4 + 1) * amp * 0.5;
        ctx.lineTo(x, y); pts.push([x, y, wx]);
      }
      ctx.lineTo(viewW + 20, G + 10); ctx.closePath(); ctx.fill();
      if (trees) {
        for (const [x, y, wx] of pts) {
          const cell = Math.floor(wx / 16);
          if (hash(cell + seed * 7) > 0.82) {
            ctx.fillStyle = shade(c1, -40); ctx.fillRect(x - 1.5, y - 10, 3, 10);
            ell(ctx, x, y - 14, 7, 9, shade(c1, -22));
          }
        }
      }
      if (env.cover > 0) {
        ctx.globalAlpha = env.cover * 0.85; ctx.strokeStyle = '#fbfdff'; ctx.lineWidth = 5; ctx.beginPath();
        for (const [x, y] of pts) ctx.lineTo(x, y + 2);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    };
    hills(0.3, G - 40, 90, 140, '#a9dcb0', '#cfe9cf', 1.3, false);
    hills(0.55, G - 4, 70, 110, '#86c98a', '#a7d9a2', 4.1, true);
  }

  // ---------- Vẽ cảnh: thế giới (toạ độ thế giới) ----------
  const lights = []; // [x, y, bán kính, màu] cho đèn ban đêm
  function snowCap(path) {
    if (env.cover <= 0) return;
    ctx.save(); ctx.globalAlpha = env.cover; ctx.fillStyle = '#fbfdff'; path(); ctx.fill(); ctx.restore();
  }

  function house(x, roof, wall, t) {
    const G = WORLD.groundY, w = 132, h = 84, nk = nightK();
    ell(ctx, x + w / 2, G + 2, w * 0.6, 7, 'rgba(40,20,20,.18)');
    const wg = ctx.createLinearGradient(x, 0, x + w, 0);
    wg.addColorStop(0, shade(wall, 6)); wg.addColorStop(1, shade(wall, -22));
    ctx.fillStyle = wg; ctx.fillRect(x, G - h, w, h);
    ctx.strokeStyle = shade(wall, -30); ctx.lineWidth = 1;
    for (let yy = G - h + 14; yy < G; yy += 14) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    ctx.fillStyle = shade(wall, -45); ctx.fillRect(x, G - 8, w, 8);
    // cửa vòm
    ctx.fillStyle = '#7a4a2f'; ctx.beginPath(); ctx.moveTo(x + 52, G); ctx.lineTo(x + 52, G - 34); ctx.arc(x + 66, G - 34, 14, Math.PI, 0); ctx.lineTo(x + 80, G); ctx.fill();
    ctx.strokeStyle = '#5c3520'; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, x + 75, G - 22, 2, 2, '#ffd23f');
    // cửa sổ: xanh trời ban ngày, vàng ấm ban đêm
    const win = mix('#bfe6ff', '#ffd27a', clamp01(nk * 1.2 + duskK() * 0.3));
    ctx.fillStyle = win; ctx.beginPath(); ctx.arc(x + 26, G - 54, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a4a2f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, G - 54); ctx.lineTo(x + 38, G - 54); ctx.moveTo(x + 26, G - 66); ctx.lineTo(x + 26, G - 42); ctx.stroke();
    ctx.fillStyle = win; rr(ctx, x + 94, G - 66, 26, 22, 4); ctx.fill(); ctx.strokeStyle = '#7a4a2f'; ctx.lineWidth = 3; ctx.stroke();
    lights.push([x + 26, G - 54, 70, '255,200,110'], [x + 107, G - 55, 70, '255,200,110']);
    // hộp hoa dưới cửa sổ
    ctx.fillStyle = '#a0603a'; ctx.fillRect(x + 90, G - 42, 34, 8);
    for (let i = 0; i < 4; i++) ell(ctx, x + 95 + i * 8, G - 44, 3.5, 3.5, ['#ff6f91', '#ffc93c', '#ff8fb1', '#fff'][i]);
    // ống khói + khói
    ctx.fillStyle = '#8a5a4a'; ctx.fillRect(x + 96, G - h - 46, 14, 30);
    ctx.fillStyle = '#6e4335'; ctx.fillRect(x + 93, G - h - 50, 20, 6);
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.25 + i / 4) % 1;
      ctx.globalAlpha = (1 - p) * 0.45 * (1 - env.rain * 0.5);
      ell(ctx, x + 103 + Math.sin(p * 5 + i) * 8 + p * 14, G - h - 54 - p * 60, 6 + p * 10, 6 + p * 8, '#f2f2f5');
    }
    ctx.globalAlpha = 1;
    // mái cong có ngói
    const rg = ctx.createLinearGradient(0, G - h - 46, 0, G - h + 6);
    rg.addColorStop(0, shade(roof, 30)); rg.addColorStop(1, shade(roof, -30));
    const roofPath = () => { ctx.beginPath(); ctx.moveTo(x - 22, G - h + 6); ctx.quadraticCurveTo(x + w / 2, G - h - 6, x + w + 22, G - h + 6); ctx.lineTo(x + w - 6, G - h - 44); ctx.quadraticCurveTo(x + w / 2, G - h - 50, x + 6, G - h - 44); ctx.closePath(); };
    ctx.fillStyle = rg; roofPath(); ctx.fill();
    ctx.strokeStyle = shade(roof, -45); ctx.lineWidth = 1.5;
    for (let r = 1; r < 4; r++) { const yy = G - h - 44 + r * 12; ctx.beginPath(); ctx.moveTo(x + 6 - r * 7, yy); ctx.quadraticCurveTo(x + w / 2, yy - 6, x + w - 6 + r * 7, yy); ctx.stroke(); }
    ctx.fillStyle = shade(roof, -50); rr(ctx, x + 2, G - h - 50, w - 4, 8, 4); ctx.fill();
    snowCap(() => { ctx.beginPath(); ctx.moveTo(x + 2, G - h - 46); ctx.quadraticCurveTo(x + w / 2, G - h - 56, x + w - 2, G - h - 46); ctx.lineTo(x + w + 4, G - h - 36); ctx.quadraticCurveTo(x + w / 2, G - h - 44, x - 4, G - h - 36); ctx.closePath(); });
    // đèn lồng đỏ ở góc mái
    const lx = x + w + 14, ly = G - h + 22 + Math.sin(t * 2 + x) * 1.5;
    ctx.strokeStyle = '#5c3520'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, G - h + 6); ctx.lineTo(lx, ly - 10); ctx.stroke();
    ell(ctx, lx, ly, 8, 10, '#e63946', INK);
    ctx.fillStyle = '#ffc93c'; ctx.fillRect(lx - 4, ly - 12, 8, 3); ctx.fillRect(lx - 4, ly + 9, 8, 3);
    lights.push([lx, ly, 80, '255,120,90']);
  }

  function tree(x, t, kind, size = 1) {
    const G = WORLD.groundY, sakura = kind === 'sakura';
    const sway = Math.sin(t * 1.1 + x * 0.01) * 0.025;
    ell(ctx, x, G + 2, 40 * size, 6, 'rgba(40,20,20,.16)');
    const tg = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
    tg.addColorStop(0, '#9b6a45'); tg.addColorStop(1, '#6e4630');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(x - 9 * size, G); ctx.quadraticCurveTo(x - 4, G - 50 * size, x - 6 * size, G - 92 * size); ctx.lineTo(x + 6 * size, G - 92 * size); ctx.quadraticCurveTo(x + 4, G - 50 * size, x + 9 * size, G); ctx.fill();
    ctx.save(); ctx.translate(x, G - 92 * size); ctx.rotate(sway); ctx.scale(size, size);
    const base = sakura ? '#ffb7cd' : '#7fcf67';
    const blobs = [[-34, 4, 30], [34, 4, 30], [-18, -26, 34], [20, -24, 34], [0, -50, 30], [0, 0, 34]];
    for (const [dx, dy, r] of blobs) ell(ctx, dx, dy, r, r * 0.9, base, INK);
    for (const [dx, dy, r] of blobs) ell(ctx, dx - r * 0.25, dy - r * 0.35, r * 0.35, r * 0.25, 'rgba(255,255,255,.28)');
    if (sakura) for (let i = 0; i < 7; i++) ell(ctx, Math.cos(i * 2.3) * 34, -20 + Math.sin(i * 1.7) * 30, 3.5, 3.5, '#ff8fb1');
    else for (let i = 0; i < 5; i++) ell(ctx, Math.cos(i * 2.3) * 32, -18 + Math.sin(i * 1.7) * 26, 4, 4, '#e8404f');
    if (env.cover > 0) { ctx.globalAlpha = env.cover; for (const [dx, dy, r] of blobs.slice(2)) ell(ctx, dx, dy - r * 0.7, r * 0.75, r * 0.3, '#fbfdff'); ctx.globalAlpha = 1; }
    ctx.restore();
    if (sakura && env.snow < 0.5) {
      for (let i = 0; i < 5; i++) {
        const p = (t * 0.18 + i / 5 + hash(x) ) % 1;
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.save(); ctx.translate(x - 50 * size + p * 110 * size + Math.sin(p * 9 + i) * 10, G - 110 * size + p * 110 * size); ctx.rotate(p * 8);
        ell(ctx, 0, 0, 3.2, 2, '#ff9ab8'); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  function pine(x, h, t) {
    const G = WORLD.groundY;
    ctx.fillStyle = '#6e4630'; ctx.fillRect(x - 5, G - 24, 10, 24);
    const sway = Math.sin(t + x) * 2;
    for (let i = 0; i < 3; i++) {
      const w = (46 - i * 10) * h / 120, y0 = G - 18 - i * h * 0.27, y1 = y0 - h * 0.45;
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, '#5fae55'); g.addColorStop(1, '#2f7a3d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - w, y0); ctx.quadraticCurveTo(x, y0 + 8, x + w, y0); ctx.lineTo(x + sway * (i + 1) * 0.4, y1); ctx.closePath(); ctx.fill();
      snowCap(() => { ctx.beginPath(); ctx.moveTo(x - w * 0.45, y1 + h * 0.2); ctx.lineTo(x + sway * (i + 1) * 0.4, y1); ctx.lineTo(x + w * 0.45, y1 + h * 0.2); ctx.quadraticCurveTo(x, y1 + h * 0.26, x - w * 0.45, y1 + h * 0.2); });
    }
  }

  function bush(x, s = 1) {
    const G = WORLD.groundY;
    for (const [dx, r] of [[-16, 14], [0, 19], [17, 13]]) ell(ctx, x + dx * s, G - r * 0.6 * s, r * s, r * 0.8 * s, '#6cc35a', INK);
    snowCap(() => { ctx.beginPath(); ctx.ellipse(x, G - 22 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2); });
  }

  function fence(x1, x2) {
    const G = WORLD.groundY;
    ctx.fillStyle = '#d9a66b'; ctx.strokeStyle = '#a8733f'; ctx.lineWidth = 1.5;
    ctx.fillRect(x1, G - 30, x2 - x1, 5); ctx.fillRect(x1, G - 16, x2 - x1, 5);
    for (let x = x1; x <= x2; x += 22) {
      ctx.beginPath(); ctx.moveTo(x - 5, G); ctx.lineTo(x - 5, G - 34); ctx.lineTo(x, G - 40); ctx.lineTo(x + 5, G - 34); ctx.lineTo(x + 5, G); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    snowCap(() => { ctx.beginPath(); ctx.rect(x1, G - 33, x2 - x1, 3); });
  }

  function lamp(x, t) {
    const G = WORLD.groundY;
    ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 3, G - 78, 6, 78); ctx.fillRect(x - 10, G - 80, 20, 4);
    const glow = mix('#fff6d0', '#ffd27a', nightK());
    ctx.fillStyle = glow; rr(ctx, x - 8, G - 100, 16, 20, 4); ctx.fill();
    ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.moveTo(x - 11, G - 100); ctx.lineTo(x, G - 110); ctx.lineTo(x + 11, G - 100); ctx.fill();
    lights.push([x, G - 90, 120, '255,214,140']);
  }

  function sign(x, text) {
    const G = WORLD.groundY;
    ctx.fillStyle = '#7a4a2f'; ctx.fillRect(x - 3, G - 50, 6, 50);
    ctx.font = '800 13px "Baloo 2", sans-serif';
    const w = ctx.measureText(text).width + 20;
    const g = ctx.createLinearGradient(0, G - 74, 0, G - 46);
    g.addColorStop(0, '#d9a066'); g.addColorStop(1, '#a8733f');
    ctx.fillStyle = g; rr(ctx, x - w / 2, G - 74, w, 26, 6); ctx.fill();
    ctx.strokeStyle = '#7a4a2f'; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, x - w / 2 + 5, G - 61, 1.5, 1.5, '#5c3520'); ell(ctx, x + w / 2 - 5, G - 61, 1.5, 1.5, '#5c3520');
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x, G - 56);
    snowCap(() => { rr(ctx, x - w / 2, G - 77, w, 5, 3); });
  }

  function gate(x) {
    const G = WORLD.groundY;
    const g = ctx.createLinearGradient(x, 0, x + 12, 0); g.addColorStop(0, '#e2525f'); g.addColorStop(1, '#b8303d');
    ctx.fillStyle = g; ctx.fillRect(x, G - 132, 13, 132); ctx.fillRect(x + 90, G - 132, 13, 132);
    ctx.fillStyle = '#2b2d42'; ctx.fillRect(x - 2, G - 10, 17, 10); ctx.fillRect(x + 88, G - 10, 17, 10);
    ctx.fillStyle = '#d6455a';
    ctx.beginPath(); ctx.moveTo(x - 20, G - 140); ctx.quadraticCurveTo(x + 52, G - 132, x + 123, G - 140); ctx.lineTo(x + 116, G - 152); ctx.quadraticCurveTo(x + 52, G - 146, x - 13, G - 152); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2d42'; ctx.fillRect(x - 16, G - 156, 135, 6);
    ctx.fillStyle = '#c23b4a'; ctx.fillRect(x - 6, G - 116, 115, 9);
    snowCap(() => { ctx.beginPath(); ctx.rect(x - 16, G - 159, 135, 4); });
  }

  function drawRiver(t) {
    const G = WORLD.groundY, W = WORLD.waterEnd;
    if (camX > W + 220) return;
    // bờ đất dốc
    const bank = ctx.createLinearGradient(0, G, 0, G + 120);
    bank.addColorStop(0, '#a8744a'); bank.addColorStop(1, '#6e4a30');
    ctx.fillStyle = bank;
    ctx.beginPath(); ctx.moveTo(W - 40, G + DEEP); ctx.lineTo(W - 40, G + 40); ctx.quadraticCurveTo(W - 6, G + 2, W + 30, G); ctx.lineTo(W + 30, G + DEEP); ctx.fill();
    const top = mix('#5ec4f2', skyColor(1), 0.35);
    const g = ctx.createLinearGradient(0, G + 8, 0, G + 220);
    g.addColorStop(0, top); g.addColorStop(1, mix('#1d5f99', '#0d1f45', nightK()));
    ctx.fillStyle = g; ctx.fillRect(camX - 330, G + 8, W - camX + 330, DEEP);
    // ánh trời phản chiếu + gợn sóng
    for (let row = 0; row < 4; row++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.55 - row * 0.1})`; ctx.lineWidth = 2;
      for (let x = Math.max(-330, Math.floor((camX - 330) / 90) * 90); x < W - 30; x += 90) {
        const off = Math.sin(t * 0.8 + row + x) * 14;
        ctx.beginPath(); ctx.moveTo(x + off, G + 16 + row * 24); ctx.quadraticCurveTo(x + off + 18, G + 12 + row * 24, x + off + 36, G + 16 + row * 24); ctx.stroke();
      }
    }
    // mưa: vòng gợn trên mặt sông
    if (env.rain > 0.1) {
      for (let i = 0; i < 10; i++) {
        const p = (t * 1.5 + hash(i)) % 1, rx = -300 + hash(i + 20) * (W + 260);
        ctx.strokeStyle = `rgba(255,255,255,${env.rain * (1 - p) * 0.8})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(rx, G + 14 + hash(i + 40) * 30, 2 + p * 14, 1 + p * 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // lá súng + hoa sen
    for (const [lx, ly, lotus] of [[60, 16, true], [130, 26, false], [320, 20, true], [-150, 22, false], [-60, 30, true]]) {
      const bob = Math.sin(t * 1.4 + lx) * 1.5;
      ctx.fillStyle = '#4caf50';
      ctx.beginPath(); ctx.ellipse(lx, G + ly + bob, 16, 5, 0, 0.3, Math.PI * 2 - 0.1); ctx.lineTo(lx, G + ly + bob); ctx.closePath(); ctx.fill();
      if (lotus) { for (let i = -2; i <= 2; i++) ell(ctx, lx + i * 3, G + ly + bob - 5 - (2 - Math.abs(i)) * 2, 3, 6, i % 2 ? '#ff9ab8' : '#ffc2d4', null, i * 0.35); }
    }
    // lau sậy
    for (let x = 18; x < W - 50; x += 92) {
      ctx.strokeStyle = '#4f9a45'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + j * 6, G + 14); ctx.quadraticCurveTo(x + j * 6 + Math.sin(t + j + x) * 4, G - 20, x + j * 8, G - 44 - j * 8); ctx.stroke(); }
      ell(ctx, x + 14, G - 56, 3.5, 10, '#8a5a3c', INK);
    }
    // đá bờ sông
    ell(ctx, W - 22, G + 14, 18, 10, '#9aa0a8', INK); ell(ctx, W - 4, G + 20, 12, 8, '#b4b9c0', INK);
    // bến gỗ
    const d = WORLD.dock;
    ctx.fillStyle = '#6e4630';
    for (let x = d.x1 + 10; x < d.x2; x += 60) ctx.fillRect(x, G, 9, 70);
    const dg = ctx.createLinearGradient(0, G - 5, 0, G + 9);
    dg.addColorStop(0, '#d9a066'); dg.addColorStop(1, '#a8733f');
    ctx.fillStyle = dg; rr(ctx, d.x1, G - 5, d.x2 - d.x1, 13, 4); ctx.fill();
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 1;
    for (let x = d.x1 + 22; x < d.x2; x += 22) { ctx.beginPath(); ctx.moveTo(x, G - 5); ctx.lineTo(x, G + 8); ctx.stroke(); }
    snowCap(() => { rr(ctx, d.x1, G - 8, d.x2 - d.x1, 5, 3); });
  }

  function drawGround(t) {
    const G = WORLD.groundY, x0 = Math.max(camX - 10, WORLD.waterEnd), x1 = camX + viewW + 20;
    const dirt = ctx.createLinearGradient(0, G, 0, G + 160);
    dirt.addColorStop(0, '#a8744a'); dirt.addColorStop(1, '#6e4a30');
    ctx.fillStyle = dirt; ctx.fillRect(x0, G, x1 - x0, DEEP);
    // sỏi đá
    for (let c = Math.floor(x0 / 46); c < x1 / 46; c++) {
      const px = c * 46 + hash(c) * 30, py = G + 24 + hash(c + 9) * 100;
      ell(ctx, px, py, 4 + hash(c + 3) * 4, 2.5 + hash(c + 5) * 2, hash(c + 7) > 0.5 ? '#8c5f3e' : '#bd8a5c');
    }
    // đường đá trong làng
    for (let x = 780; x < 1720; x += 34) if (x > x0 - 30 && x < x1) ell(ctx, x + hash(x) * 8, G + 6, 13, 3.5, '#c9b49a');
    // cỏ: dải nền + ngọn cỏ đung đưa
    const gg = ctx.createLinearGradient(0, G - 2, 0, G + 14);
    gg.addColorStop(0, '#95e06d'); gg.addColorStop(1, '#5fb444');
    ctx.fillStyle = gg; ctx.fillRect(x0, G - 1, x1 - x0, 14);
    ctx.strokeStyle = '#4fa63a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) {
      const h = 5 + hash(x) * 7, sw = Math.sin(t * 2 + x * 0.05) * 2;
      ctx.moveTo(x, G + 2); ctx.quadraticCurveTo(x + sw * 0.5, G - h * 0.5, x + sw, G - h);
    }
    ctx.stroke();
    for (let c = Math.floor(x0 / 70); c < x1 / 70; c++) {
      if (c * 70 < 720 || hash(c + 1) < 0.45) continue;
      const fx = c * 70 + hash(c) * 40;
      const col = ['#ff6f91', '#ffc93c', '#ffffff', '#9b5de5'][Math.floor(hash(c + 2) * 4)];
      ctx.strokeStyle = '#3f9b3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, G + 2); ctx.lineTo(fx, G - 9); ctx.stroke();
      for (let i = 0; i < 5; i++) ell(ctx, fx + Math.cos(i * 1.256) * 3.5, G - 10 + Math.sin(i * 1.256) * 3.5, 2.6, 2.6, col);
      ell(ctx, fx, G - 10, 1.8, 1.8, '#ffb703');
    }
    if (env.cover > 0) {
      ctx.globalAlpha = env.cover;
      ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.moveTo(x0, G + 8);
      for (let x = x0; x <= x1; x += 18) ctx.lineTo(x, G - 3 - hash(Math.floor(x / 18)) * 4);
      ctx.lineTo(x1, G + 8); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawWorld(t) {
    const G = WORLD.groundY;
    drawGround(t);
    drawRiver(t);
    sign(690, '← Bờ Sông Thần');
    lamp(740, t);
    tree(800, t, 'sakura', 0.95);
    house(880, '#4f6dd6', '#fff3e0', t);
    fence(1030, 1110);
    tree(1080, t, 'green', 0.9);
    lamp(1290, t);
    house(1350, '#d6455a', '#fff6e8', t);
    fence(1500, 1560);
    tree(1550, t, 'sakura', 1.05);
    gate(1600);
    sign(1652, 'Làng Thú Ngộ Nghĩnh');
    sign(1770, '→ Đồng Ốc Sên');
    for (const bx of [1850, 2120, 2330]) bush(bx, 0.9 + hash(bx) * 0.3);
    tree(2230, t, 'green', 0.8);
    sign(2590, '→ Rừng Nấm Lùn');
    for (let x = 2560; x < 3420; x += 95) pine(x + hash(x) * 30, 110 + hash(x + 1) * 70, t);
    for (let x = 2620; x < 3400; x += 160) { ell(ctx, x, G - 6, 8, 6, '#e63946', INK); ctx.fillStyle = '#fff1d6'; ctx.fillRect(x - 2.5, G - 2, 5, 3); }
    sign(3480, '⚠ Hang Heo Đại Ca');
    // hang đá của boss
    const rg = ctx.createLinearGradient(0, G - 260, 0, G);
    rg.addColorStop(0, '#8a7c74'); rg.addColorStop(1, '#5e524c');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(3680, G); ctx.quadraticCurveTo(3760, G - 200, 3900, G - 240); ctx.quadraticCurveTo(4080, G - 260, 4200, G - 140); ctx.lineTo(4200, G); ctx.fill();
    snowCap(() => { ctx.beginPath(); ctx.moveTo(3820, G - 220); ctx.quadraticCurveTo(3900, G - 246, 4000, G - 252); ctx.quadraticCurveTo(3920, G - 232, 3820, G - 220); });
    ctx.fillStyle = '#2b211e'; ctx.beginPath(); ctx.ellipse(4060, G, 62, 74, 0, Math.PI, 0); ctx.fill();
    for (const tx of [3975, 4145]) {
      ctx.fillStyle = '#5b4636'; ctx.fillRect(tx - 3, G - 60, 6, 60);
      const f = 1 + Math.sin(t * 12 + tx) * 0.15;
      ell(ctx, tx, G - 68, 7 * f, 11 * f, '#ff9f1c'); ell(ctx, tx, G - 66, 4 * f, 6 * f, '#ffe066');
      lights.push([tx, G - 66, 110, '255,150,60']);
    }
    // bục gỗ
    for (const p of WORLD.platforms) {
      ctx.fillStyle = '#6e4630'; ctx.fillRect(p.x + 10, p.y, 7, G - p.y); ctx.fillRect(p.x + p.w - 17, p.y, 7, G - p.y);
      const pg = ctx.createLinearGradient(0, p.y, 0, p.y + 14);
      pg.addColorStop(0, '#d9a066'); pg.addColorStop(1, '#a8733f');
      ctx.fillStyle = pg; rr(ctx, p.x, p.y, p.w, 14, 5); ctx.fill();
      ctx.fillStyle = '#7ccf5a'; rr(ctx, p.x - 2, p.y - 4, p.w + 4, 7, 3); ctx.fill();
      snowCap(() => { rr(ctx, p.x - 2, p.y - 7, p.w + 4, 6, 3); });
    }
    // bướm ban ngày, đom đóm ban đêm
    const calm = 1 - Math.max(env.rain, env.snow);
    if (calm > 0.3 && env.tod < 1.3) {
      for (let i = 0; i < 6; i++) {
        const bx = 780 + i * 330 + Math.sin(t * 0.5 + i * 2) * 90, by = G - 50 - Math.abs(Math.sin(t * 0.9 + i)) * 50;
        if (bx < camX - 20 || bx > camX + viewW + 20) continue;
        const flap = Math.abs(Math.sin(t * 14 + i));
        const col = ['#ff8fb1', '#ffd23f', '#9b5de5', '#4fb3ff'][i % 4];
        ctx.globalAlpha = calm;
        ell(ctx, bx - 4 * flap, by, 5 * flap + 1, 4, col); ell(ctx, bx + 4 * flap, by, 5 * flap + 1, 4, col);
        ell(ctx, bx, by, 1.2, 3.5, '#3b2a2a');
        ctx.globalAlpha = 1;
      }
    }
  }

  // Ban đêm: phủ màu tối rồi thắp đèn bằng chế độ cộng sáng
  function drawLighting(t) {
    const nk = nightK(), dk = duskK();
    const x = camX - 20, y = -offY - 20, w = viewW + 40, h = VIEW_H + offY + DEEP;
    if (dk > 0) { ctx.fillStyle = `rgba(255,130,70,${0.12 * dk})`; ctx.fillRect(x, y, w, h); }
    const dark = 0.1 * dk + 0.52 * nk + 0.12 * env.rain;
    if (dark > 0.01) { ctx.fillStyle = `rgba(14,18,56,${dark})`; ctx.fillRect(x, y, w, h); }
    const lk = nk * 0.95 + dk * 0.25;
    if (lk > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = (lx, ly, r, rgb, a) => {
        const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, r);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
      };
      for (const [lx, ly, r, rgb] of lights) if (lx > camX - r && lx < camX + viewW + r) glow(lx, ly, r, rgb, 0.45 * lk);
      glow(me.x, me.y - 30, 90, '255,230,190', 0.18 * lk);
      for (const p of players.values()) if (p.info.id !== myId) glow(p.rx, p.ry - 30, 80, '230,210,255', 0.15 * lk);
      // đom đóm
      if (nk > 0.3 && env.rain < 0.5) {
        for (let i = 0; i < 26; i++) {
          const fx = camX + ((hash(i) * viewW + Math.sin(t * 0.3 + i) * 60) % viewW + viewW) % viewW;
          if (fx < WORLD.waterEnd) continue;
          const fy = WORLD.groundY - 16 - hash(i + 7) * 120 + Math.sin(t * 1.3 + i * 2) * 12;
          const a = nk * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
          glow(fx, fy, 14, '200,255,120', 0.6 * a);
          ctx.fillStyle = `rgba(240,255,190,${a})`; ctx.fillRect(fx - 1.2, fy - 1.2, 2.4, 2.4);
        }
      }
      ctx.restore();
    }
  }

  // Mưa và tuyết (toạ độ màn hình)
  function drawWeather(t) {
    const top = -offY, H = VIEW_H + offY + 20;
    if (env.rain > 0.02) {
      const n = Math.round(200 * env.rain);
      ctx.strokeStyle = `rgba(210,225,255,${0.55 * env.rain})`; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = 700 + hash(i) * 400;
        const yy = top + ((hash(i + 3) * H + t * sp) % H);
        const xx = ((hash(i + 7) * (viewW + 100) - t * sp * 0.18) % (viewW + 100) + viewW + 100) % (viewW + 100) - 50;
        ctx.moveTo(xx, yy); ctx.lineTo(xx - 3, yy + 14);
      }
      ctx.stroke();
      // giọt bắn trên mặt đất
      for (let i = 0; i < 18 * env.rain; i++) {
        const p = (t * 2 + hash(i + 50)) % 1, sx = hash(i + 60) * viewW;
        ctx.strokeStyle = `rgba(220,235,255,${(1 - p) * 0.7 * env.rain})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx, WORLD.groundY + 2, 2 + p * 6, Math.PI, 0); ctx.stroke();
      }
    }
    if (env.snow > 0.02) {
      const n = Math.round(170 * env.snow);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * env.snow})`;
      for (let i = 0; i < n; i++) {
        const sp = 30 + hash(i) * 50, r = 1.2 + hash(i + 1) * 2.4;
        const yy = top + ((hash(i + 3) * H + t * sp) % H);
        const xx = ((hash(i + 7) * viewW + Math.sin(t * 0.8 + i) * 24 - camX * 0.05) % viewW + viewW) % viewW;
        ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (env.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${env.flash * 0.45})`; ctx.fillRect(0, top, viewW, H); }
  }

  function chiefMark() {
    if (!progress) return '!';
    const s = progress.stage;
    if (s === 0 || s === 4 || s === 5) return '!';
    if (s === 1 && progress.roses >= progress.rosesNeed) return '?';
    return null;
  }
  function riverMark() {
    if (!progress) return null;
    if (progress.stage === 2) return '!';
    if (progress.stage === 3 && progress.fish >= progress.fishNeed) return '?';
    return null;
  }

  function drawLine(x, y, dir, state, t) {
    const rodTipX = x + dir * 44, rodTipY = y - 78;
    const bx = x + dir * 120;
    const dip = state === 'bite' ? 6 + Math.sin(t * 30) * 3 : Math.sin(t * 3) * 1.5;
    const by = WORLD.groundY + 14 + dip;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.quadraticCurveTo((rodTipX + bx) / 2, rodTipY + 20, bx, by); ctx.stroke();
    ell(ctx, bx, by, 5, 5, '#ff4d6d', INK); ell(ctx, bx, by - 3, 5, 2.5, '#fff');
    if (state === 'bite') {
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by + 2, 10 + (t * 40 % 12), 3, 0, 0, Math.PI * 2); ctx.stroke();
      drawMark(ctx, bx, by - 24, '!');
    }
  }

  function drawMinimap() {
    const w = Math.min(260, viewW * 0.3), x0 = viewW / 2 - w / 2, y0 = -offY + 14;
    ctx.fillStyle = 'rgba(255,248,239,.85)'; rr(ctx, x0 - 6, y0 - 6, w + 12, 18, 9); ctx.fill();
    ctx.fillStyle = '#e8d3c4'; ctx.fillRect(x0, y0 + 2, w, 2);
    ctx.fillStyle = '#5ec4f2'; ctx.fillRect(x0, y0 + 1, (WORLD.waterEnd / WORLD.width) * w, 4);
    const dot = (wx, c, r) => ell(ctx, x0 + (wx / WORLD.width) * w, y0 + 3, r, r, c);
    dot(WORLD.riverGodX, '#2479b8', 4);
    dot(WORLD.chiefX, '#6d8b3a', 4);
    for (const m of monsters.values()) if (!m.dead && MTYPES[m.type].boss) dot(m.rx, '#7b4b33', 4);
    for (const p of players.values()) if (p.info.id !== myId) dot(p.rx, '#9b5de5', 3.5);
    dot(me.x, '#ff3860', 4.5);
  }

  let lastFrame = performance.now();
  const pendingLabels = [];
  function queueLabel(text, x, y, color, size) { pendingLabels.push([text, x, y, color, size]); }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const t = now / 1000;
    if (!WORLD) return;
    updateMe(dt, now);
    updateEnv(dt, now);
    const turn = Math.min(1, dt * 14);
    me.face += (me.dir - me.face) * turn;

    for (const p of players.values()) {
      if (p.info.id === myId) continue;
      const k = Math.min(1, dt * 12);
      p.rx += (p.tx - p.rx) * k; p.ry += (p.ty - p.ry) * k;
      p.face = (p.face ?? p.dir) + (p.dir - (p.face ?? p.dir)) * turn;
    }
    for (const m of monsters.values()) { m.rx += (m.tx - m.rx) * Math.min(1, dt * 10); m.flash = Math.max(0, m.flash - dt); }
    for (const n of senseis.values()) { n.rx += (n.tx - n.rx) * Math.min(1, dt * 10); n.face += (n.dir - n.face) * turn; }

    // cho phép lùi camera qua mép trái để khung chat không che Thần Sông
    camX = Math.max(-320, Math.min(WORLD.width - viewW, me.x - viewW / 2));
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, offY);
    drawSky(t);
    drawFar(t);
    ctx.save();
    ctx.translate(-camX, 0);
    lights.length = 0;
    pendingLabels.length = 0;
    drawWorld(t);
    drawRiverGod(ctx, WORLD.riverGodX, WORLD.groundY + 28, t, riverMark());
    queueLabel('🦛 Thần Sông', WORLD.riverGodX, WORLD.groundY + 44, '#bfe9ff', 13);
    drawChief(ctx, WORLD.chiefX, WORLD.groundY, t, chiefMark());
    queueLabel('🐢 Trưởng Làng', WORLD.chiefX + 5, WORLD.groundY + 24, '#ffc93c', 13);
    for (const d of drops.values()) drawRose(ctx, d.x, WORLD.groundY, t, d.id);
    for (const m of monsters.values()) if (!m.dead && m.rx > camX - 120 && m.rx < camX + viewW + 120) drawMonster(ctx, m, m.type, t);
    drawDuelMarks(t);
    for (const n of senseis.values()) { drawPanda(ctx, n.rx, WORLD.groundY, t, n.dir, n.anim, n.face); queueLabel('🐼 Sư Phụ Gấu Trúc', n.rx, WORLD.groundY + 16, '#ffd6a8', 12); }

    for (const p of players.values()) {
      if (p.info.id === myId) continue;
      const k = p.anim === 'atk1' ? 1 : 0;
      const atkP = p.anim.startsWith('atk') ? Math.min(1, (now - p.atkStart) / ATK_DUR[k]) : 0;
      drawAnimal(ctx, p.rx, p.ry, p.info.species, p.info.skin, { t, dir: p.dir, face: p.face, anim: p.anim, seed: p.seed, atkP });
      if (p.anim === 'fish') drawLine(p.rx, p.ry, p.dir, 'wait', t);
      queueLabel(`${p.info.name} · Lv${p.info.level}`, p.rx, p.ry + 16, '#e6d4ff', 12);
    }
    const blink = now < me.invulnUntil && Math.floor(now / 80) % 2 === 0;
    const anim = myAnim(now);
    const squash = Math.max(0, 1 - (now - me.landAt) / 220) * me.landPow;
    drawAnimal(ctx, me.x, me.y, mySpecies, mySkin, { t, dir: me.dir, face: me.face, anim, squash, alpha: blink ? 0.4 : 1, atkP: anim.startsWith('atk') ? 1 - (me.atkUntil - now) / ATK_DUR[me.atkK] : 0 });
    if (fishing.state) drawLine(me.x, me.y, me.dir, fishing.state, t);
    queueLabel(`${myName} · Lv${progress ? progress.level : 1}`, me.x, me.y + 16, '#fff', 12);

    drawLighting(t);
    drawFx(dt);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2); ell(ctx, p.x, p.y, p.r, p.r, p.color); ctx.globalAlpha = 1;
    }
    for (const l of pendingLabels) label(ctx, ...l);
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.life -= dt;
      if (f.life <= 0) { floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
      ctx.globalAlpha = Math.min(1, f.life * 2); label(ctx, f.text, f.x, f.y, f.color, f.size); ctx.globalAlpha = 1;
    }

    for (const [who, b] of bubbles) {
      if (now > b.until) { bubbles.delete(who); continue; }
      let x, y;
      if (who === 'chief') { x = WORLD.chiefX + 10; y = WORLD.groundY - 96; }
      else if (who === 'river') { x = WORLD.riverGodX; y = WORLD.groundY - 150; }
      else if (who === myId) { x = me.x; y = me.y - 84; }
      else if (typeof who === 'string') { const n = senseis.get(who); if (!n) continue; x = n.rx; y = WORLD.groundY - 104; }
      else { const p = players.get(who); if (!p) continue; x = p.rx; y = p.ry - 84; }
      drawBubble(ctx, b.text, Math.max(camX + 130, Math.min(camX + viewW - 130, x)), y, who === 'chief' || who === 'river');
    }
    ctx.restore();
    drawWeather(t);
    drawMinimap();
    ctx.restore();

    renderPkBar(now);
    $('hpFill').style.width = me.hp + '%';
    $('hpText').textContent = `HP ${Math.ceil(me.hp)}/100`;
  }

  // Cho phép kiểm thử tự động đọc trạng thái
  window.__tv = { me, players, monsters, drops, fishing, duels, senseis, get progress() { return progress; }, send };
})();
