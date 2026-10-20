// Client game Làng Thú Ngộ Nghĩnh
(() => {
  'use strict';

  // ---------- Lưu trữ cục bộ ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('tv_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('tv_' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  };
  const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : 'tk' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  // Bản sao tối thiểu để vẽ màn hình chọn nhân vật trước khi kết nối (server gửi bản đầy đủ khi vào game)
  let SPECIES = {
    hamster: { name: 'Chuột Béo Bụng Phệ', intro: 'Ăn khỏe, ngủ khỏe, huých bụng còn khỏe hơn!', skins: [{ name: 'Cam sữa', body: '#f0a04b', belly: '#fde6c4', accent: '#f4a3a8' }, { name: 'Trắng bông', body: '#f4efe8', belly: '#ffffff', accent: '#f7b6c2' }, { name: 'Xám khói', body: '#9a94a0', belly: '#e9e4ec', accent: '#f4a3a8' }], attacks: [{ name: 'Huých Bụng', cd: 350 }, { name: 'Bắn Hạt Hướng Dương', cd: 600 }] },
    duck: { name: 'Vịt Trẻ Trâu', intro: 'Đeo kính đen, cầm dao phay, đi đứng nghênh ngang.', skins: [{ name: 'Trắng ngầu', body: '#fbfbf7', belly: '#ffffff', accent: '#f39a1e' }, { name: 'Vàng nổi loạn', body: '#ffe066', belly: '#fff3b0', accent: '#f39a1e' }, { name: 'Đen bụi đời', body: '#4a4a55', belly: '#6b6b78', accent: '#f39a1e' }], attacks: [{ name: 'Chém Dao Phay', cd: 380 }, { name: 'Quạ Quạ Chấn Động', cd: 1500 }] },
    platypus: { name: 'Thú Mỏ Vịt Hiền Lành', intro: 'Hiền khô, hay xin lỗi, nhưng quật đuôi thì đau lắm.', skins: [{ name: 'Nâu hạt dẻ', body: '#8a5a3a', belly: '#d9a46c', accent: '#f2a93b' }, { name: 'Socola sữa', body: '#6b4630', belly: '#c8956a', accent: '#f2a93b' }, { name: 'Xanh rêu', body: '#5f7f5a', belly: '#c9d9a8', accent: '#f2a93b' }], attacks: [{ name: 'Đập Mỏ', cd: 350 }, { name: 'Quật Đuôi Bẹt', cd: 1200 }] },
    chick: { name: 'Gà Con Cáu Kỉnh', intro: 'Nhỏ xíu mà nóng tính, động vào là xì khói.', skins: [{ name: 'Vàng chanh', body: '#ffe46b', belly: '#fff1a6', accent: '#f39a1e' }, { name: 'Cam cháy', body: '#ffb35c', belly: '#ffd8a3', accent: '#e8761a' }, { name: 'Hồng giận dỗi', body: '#ffb3c7', belly: '#ffd6e2', accent: '#f39a1e' }], attacks: [{ name: 'Mổ Liên Hoàn', cd: 180 }, { name: 'Nổi Khùng Xì Khói', cd: 1600 }] },
    croc: { name: 'Tiểu Thư Cá Sấu', intro: 'Đeo nơ hồng, nói chuyện nhỏ nhẹ, cắn thì không nhẹ chút nào.', skins: [{ name: 'Xanh lá nơ hồng', body: '#6fa35a', belly: '#efe6c4', accent: '#ff7aa8' }, { name: 'Ngọc bích vương miện', body: '#3fa38f', belly: '#e3f2df', accent: '#ffc93c' }, { name: 'Hồng tiểu thư', body: '#e58fb0', belly: '#fde3ec', accent: '#9b5de5' }], attacks: [{ name: 'Cắn Một Phát', cd: 420 }, { name: 'Quật Đuôi', cd: 1100 }] },
  };
  const ATK_DUR = [260, 430];

  // ---------- Vẽ cơ bản ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  const INK = '#3b2a2a';
  function ell(ctx, x, y, rx, ry, fill, stroke, rot = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
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

  function drawAnimal(ctx, x, y, species, skinIdx, o = {}) {
    const sp = SPECIES[species] || SPECIES.hamster;
    const c = sp.skins[skinIdx] || sp.skins[0];
    const t = o.t || 0, anim = o.anim || 'idle';
    ctx.save();
    ctx.translate(x, y);
    ell(ctx, 0, 0, 20, 4.5, 'rgba(0,0,0,.18)');
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (anim === 'dead') { ctx.rotate(-Math.PI / 2 * (o.dir || 1)); ctx.translate(-12 * (o.dir || 1), -10); }
    ctx.scale(o.dir || 1, 1);
    const run = anim === 'run';
    const bob = run ? Math.abs(Math.sin(t * 14)) * 2.5 : Math.sin(t * 3 + (o.seed || 0)) * 0.8;
    ctx.translate(0, -bob);
    if (anim === 'jump') ctx.scale(0.95, 1.05);
    const k = anim === 'atk0' ? 0 : anim === 'atk1' ? 1 : -1;
    DRAW[species]?.(ctx, c, { t, seed: o.seed || 0, swing: run ? Math.sin(t * 14) * 4 : 0, hurt: anim === 'hurt' || anim === 'dead', k, p: o.atkP || 0, skin: skinIdx });
    if (anim === 'fish') drawRod(ctx);
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

  function drawRiverGod(ctx, x, y, t, mark) {
    const bob = Math.sin(t * 1.5) * 5;
    ctx.save();
    ctx.translate(x, y + bob);
    // thân nước
    const g = ctx.createLinearGradient(0, -110, 0, 10);
    g.addColorStop(0, '#7fd3ff'); g.addColorStop(1, '#2f8fd6');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-34, 14); ctx.quadraticCurveTo(-40, -60, -22, -92); ctx.quadraticCurveTo(0, -112, 22, -92); ctx.quadraticCurveTo(40, -60, 34, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1f6fa8'; ctx.lineWidth = 2; ctx.stroke();
    // đinh ba
    ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(44, 10); ctx.lineTo(44, -120); ctx.moveTo(34, -112); ctx.lineTo(34, -128); ctx.moveTo(54, -112); ctx.lineTo(54, -128); ctx.moveTo(34, -112); ctx.lineTo(54, -112); ctx.stroke();
    ell(ctx, 32, -50, 7, 6, '#7fd3ff', '#1f6fa8');
    // mặt
    eye(ctx, -9, -72, 4); eye(ctx, 9, -72, 4);
    ctx.fillStyle = '#fff'; rr(ctx, -16, -83, 11, 4, 2); ctx.fill(); rr(ctx, 5, -83, 11, 4, 2); ctx.fill();
    ell(ctx, -16, -62, 4, 2.5, blushC); ell(ctx, 16, -62, 4, 2.5, blushC);
    // râu bọt nước
    for (let i = 0; i < 7; i++) ell(ctx, -18 + i * 6, -52 + Math.abs(3 - i) * -2 + Math.sin(t * 3 + i) * 1.5, 6, 7, '#f2fbff');
    ell(ctx, 0, -40, 10, 10, '#f2fbff');
    // vương miện
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath(); ctx.moveTo(-18, -96); ctx.lineTo(-16, -114); ctx.lineTo(-8, -104); ctx.lineTo(0, -120); ctx.lineTo(8, -104); ctx.lineTo(16, -114); ctx.lineTo(18, -96); ctx.closePath(); ctx.fill();
    ell(ctx, 0, -104, 2.5, 2.5, '#e63946');
    ctx.restore();
    // bọt
    for (let i = 0; i < 4; i++) { const by = y - ((t * 25 + i * 20) % 80); ell(ctx, x - 30 + i * 18, by, 3, 3, null, 'rgba(255,255,255,.8)'); }
    if (mark) drawMark(ctx, x, y - 150 + Math.sin(t * 4) * 4, mark);
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
    label(ctx, ti.name, x, top - 10, ti.boss ? '#ffb703' : '#fff', 11);
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

  let previewRaf = 0, previewAtk = 0;
  $('preview').addEventListener('click', () => { previewAtk = performance.now(); });
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
    p.save(); p.scale(2, 2);
    drawAnimal(p, 55, 92, mySpecies, mySkin, { t, dir: 1, anim: k >= 0 ? 'atk' + k : 'idle', atkP });
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
  const me = { x: 1060, y: 470, vx: 0, vy: 0, onGround: true, jumps: 0, dir: 1, hp: 100, invulnUntil: 0, atkK: -1, atkUntil: 0, cd: [0, 0], dead: false, deadUntil: 0, dropUntil: 0, lastHurt: 0 };
  const fishing = { state: null, since: 0 };
  const keys = {};
  let jumpQueued = false, talkQueued = false, fishQueued = false;
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
    const b = document.createElement('b'); b.textContent = `📜 Bước ${Math.min(p.stage + 1, 5)}/5: ${p.stageTitle}`;
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
    if (npc === 'river') { portrait.scale(0.85, 0.85); drawRiverGod(portrait, 62, 140, 0, null); }
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
    $('giftName').textContent = g.name; $('giftText').textContent = g.text; $('giftImg').src = g.image;
    setTimeout(() => chest.classList.add('pop'), 1400);
    setTimeout(() => { chest.classList.add('hidden'); $('giftReveal').classList.remove('hidden'); confetti(); }, 1900);
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
      if (k === 'jump') jumpQueued = true; else if (k === 'talk') talkQueued = true; else if (k === 'fish') fishQueued = true;
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
    me.onGround = false;
    if (me.vy >= 0 && now > me.dropUntil) {
      for (const p of WORLD.platforms) {
        if (me.x > p.x && me.x < p.x + p.w && prevY <= p.y + 1 && me.y >= p.y) { me.y = p.y; me.vy = 0; me.onGround = true; }
      }
    }
    if (me.y >= WORLD.groundY) { me.y = WORLD.groundY; me.vy = 0; me.onGround = true; }
    if (me.onGround) me.jumps = 0;

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
    $('fishBtn').classList.toggle('hidden', !nearDock() && !fishing.state);
    if (fishQueued && !typing) {
      if (fishing.state) send({ t: 'reel' });
      else if (nearDock()) { me.dir = -1; me.vx = 0; fishing.state = 'wait'; fishing.since = now; sendState(now); send({ t: 'cast' }); }
      else toast('Ra bến gỗ ở bờ sông (phía trái làng) mới câu cá được nha!');
    }
    fishQueued = false;

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

  // ---------- Vẽ cảnh ----------
  function drawBackground(t) {
    const H = VIEW_H + offY;
    const g = ctx.createLinearGradient(0, -offY, 0, WORLD.groundY);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.7, '#d9f1ff'); g.addColorStop(1, '#ffe6ef');
    ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, H);
    ell(ctx, viewW - 120, 70, 34, 34, '#fff2a8');
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 420 - camX * 0.15 + t * 8) % (viewW + 400) + viewW + 400) % (viewW + 400) - 200;
      const cy = 40 + (i * 53) % 120;
      ell(ctx, cx, cy, 40, 16, '#fff'); ell(ctx, cx + 26, cy - 8, 26, 16, '#fff'); ell(ctx, cx - 24, cy - 4, 22, 13, '#fff');
    }
    for (let layer = 0; layer < 2; layer++) {
      const par = layer ? 0.45 : 0.25;
      ctx.fillStyle = layer ? '#a6d8b0' : '#c4e3d6';
      ctx.beginPath(); ctx.moveTo(0, WORLD.groundY);
      for (let x = -200; x < viewW + 400; x += 160) {
        const wx = x - ((camX * par) % 320);
        ctx.lineTo(wx, WORLD.groundY - 140 + layer * 50 - ((Math.floor((x + camX * par) / 160) * 37) % 70));
        ctx.lineTo(wx + 80, WORLD.groundY - 40);
      }
      ctx.lineTo(viewW, WORLD.groundY); ctx.closePath(); ctx.fill();
    }
  }

  function house(x, roof, wall) {
    const y = WORLD.groundY;
    ctx.fillStyle = wall; ctx.fillRect(x, y - 80, 120, 80);
    ctx.fillStyle = '#7a4a2f'; ctx.fillRect(x + 48, y - 46, 24, 46);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 12, y - 62, 24, 20); ctx.fillRect(x + 84, y - 62, 24, 20);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x - 20, y - 76); ctx.quadraticCurveTo(x + 60, y - 90, x + 140, y - 76); ctx.lineTo(x + 110, y - 120); ctx.lineTo(x + 10, y - 120); ctx.closePath(); ctx.fill();
    ell(ctx, x + 60, y - 70, 8, 10, '#e63946');
  }
  function tree(x, t, color) {
    const y = WORLD.groundY;
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x - 6, y - 90, 12, 90);
    for (const [dx, dy, r] of [[0, -110, 38], [-32, -95, 28], [32, -95, 28], [0, -140, 26]]) ell(ctx, x + dx, y + dy, r, r * 0.85, color);
    for (let i = 0; i < 3; i++) {
      const px = x - 40 + ((t * 20 + i * 37 + x) % 90), py = y - 80 + ((t * 30 + i * 50) % 80);
      ell(ctx, px, py, 3, 2, shade(color, -30));
    }
  }
  function sign(x, text) {
    const y = WORLD.groundY;
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x - 3, y - 50, 6, 50);
    ctx.font = '800 13px "Baloo 2", sans-serif';
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = '#c98b56'; rr(ctx, x - w / 2, y - 72, w, 24, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, x, y - 55);
  }

  function drawRiver(t) {
    const G = WORLD.groundY, W = WORLD.waterEnd;
    if (camX > W + 200) return;
    // bờ đất dốc xuống nước
    ctx.fillStyle = '#9b6b43';
    ctx.beginPath(); ctx.moveTo(W - 30, G + DEEP); ctx.lineTo(W - 30, G + 30); ctx.quadraticCurveTo(W, G, W + 30, G); ctx.lineTo(W + 30, G + DEEP); ctx.fill();
    const g = ctx.createLinearGradient(0, G + 8, 0, G + 200);
    g.addColorStop(0, '#5ec4f2'); g.addColorStop(1, '#2479b8');
    ctx.fillStyle = g; ctx.fillRect(camX - 10, G + 8, W - camX + 10, DEEP);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      for (let x = Math.max(0, camX - 20); x < W; x += 6) ctx.lineTo(x, G + 10 + row * 28 + Math.sin(x / 22 + t * 2 + row) * 3);
      ctx.stroke();
    }
    // lau sậy
    for (let x = 30; x < W - 40; x += 70) {
      ctx.strokeStyle = '#4f9a45'; ctx.lineWidth = 3;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + j * 6, G + 14); ctx.quadraticCurveTo(x + j * 6 + Math.sin(t + j) * 4, G - 20, x + j * 8, G - 40 - j * 8); ctx.stroke(); }
      ell(ctx, x + 14, G - 52, 3, 9, '#8a5a3c');
    }
    // bến gỗ
    const d = WORLD.dock;
    ctx.fillStyle = '#7a4a2f';
    for (let x = d.x1 + 10; x < d.x2; x += 60) ctx.fillRect(x, G, 8, 60);
    ctx.fillStyle = '#c98b56'; rr(ctx, d.x1, G - 4, d.x2 - d.x1, 12, 4); ctx.fill();
    ctx.strokeStyle = '#a06a3c'; ctx.lineWidth = 1;
    for (let x = d.x1 + 20; x < d.x2; x += 20) { ctx.beginPath(); ctx.moveTo(x, G - 4); ctx.lineTo(x, G + 8); ctx.stroke(); }
  }

  function drawWorld(t) {
    const G = WORLD.groundY;
    // Mặt đất (bên phải dòng sông)
    const gx = Math.max(camX - 10, WORLD.waterEnd);
    ctx.fillStyle = '#9b6b43'; ctx.fillRect(gx, G, camX + viewW + 20 - gx, DEEP);
    ctx.fillStyle = '#7ccf5a'; ctx.fillRect(gx, G, camX + viewW + 20 - gx, 12);
    ctx.fillStyle = '#5fb444';
    for (let x = Math.max(Math.floor(camX / 24) * 24, WORLD.waterEnd); x < camX + viewW + 24; x += 24) { ctx.beginPath(); ctx.moveTo(x, G + 12); ctx.lineTo(x + 6, G + 3); ctx.lineTo(x + 12, G + 12); ctx.fill(); }
    drawRiver(t);
    sign(700, '← Bờ Sông Thần');
    tree(790, t, '#ffc2d4'); house(870, '#4f6dd6', '#fff3e0'); tree(1060, t, '#a8e07a'); house(1340, '#d6455a', '#fff3e0'); tree(1540, t, '#ffc2d4');
    ctx.fillStyle = '#d6455a'; ctx.fillRect(1600, G - 130, 12, 130); ctx.fillRect(1688, G - 130, 12, 130);
    ctx.fillRect(1586, G - 140, 128, 14); ctx.fillRect(1596, G - 112, 108, 8);
    sign(1650, 'Làng Thú Ngộ Nghĩnh');
    sign(1760, '→ Đồng Ốc Sên'); sign(2580, '→ Rừng Nấm Lùn'); sign(3480, '⚠ Hang Heo Đại Ca');
    for (let x = 2560; x < 3400; x += 140) { ctx.fillStyle = '#5a9e4b'; ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + 40, G - 120); ctx.lineTo(x + 80, G); ctx.fill(); }
    ctx.fillStyle = '#6b5a52'; ctx.beginPath(); ctx.moveTo(3700, G); ctx.quadraticCurveTo(3950, G - 260, 4200, G); ctx.fill();
    ctx.fillStyle = '#3b2f2b'; ctx.beginPath(); ctx.ellipse(4060, G, 60, 70, 0, Math.PI, 0); ctx.fill();
    for (let x = Math.max(Math.floor(camX / 90) * 90, 720); x < camX + viewW + 90; x += 90) {
      const c = ['#ff6f91', '#ffc93c', '#fff'][(x / 90) % 3];
      ell(ctx, x + 30, G - 3, 4, 4, c); ell(ctx, x + 30, G - 3, 1.5, 1.5, '#ffb703');
    }
    for (const p of WORLD.platforms) {
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(p.x + 10, p.y, 6, G - p.y); ctx.fillRect(p.x + p.w - 16, p.y, 6, G - p.y);
      ctx.fillStyle = '#c98b56'; rr(ctx, p.x, p.y, p.w, 14, 5); ctx.fill();
      ctx.fillStyle = '#7ccf5a'; rr(ctx, p.x - 2, p.y - 4, p.w + 4, 7, 3); ctx.fill();
    }
  }

  function chiefMark() {
    if (!progress) return '!';
    const s = progress.stage;
    if (s === 0 || s === 4) return '!';
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
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const t = now / 1000;
    if (!WORLD) return;
    updateMe(dt, now);

    for (const p of players.values()) {
      if (p.info.id === myId) continue;
      const k = Math.min(1, dt * 12);
      p.rx += (p.tx - p.rx) * k; p.ry += (p.ty - p.ry) * k;
    }
    for (const m of monsters.values()) { m.rx += (m.tx - m.rx) * Math.min(1, dt * 10); m.flash = Math.max(0, m.flash - dt); }

    // cho phép lùi camera qua mép trái để khung chat không che Thần Sông
    camX = Math.max(-320, Math.min(WORLD.width - viewW, me.x - viewW / 2));
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, offY);
    drawBackground(t);
    ctx.save();
    ctx.translate(-camX, 0);
    drawWorld(t);
    drawRiverGod(ctx, WORLD.riverGodX, WORLD.groundY + 6, t, riverMark());
    label(ctx, '🌊 Thần Sông', WORLD.riverGodX, WORLD.groundY + 40, '#bfe9ff', 13);
    drawChief(ctx, WORLD.chiefX, WORLD.groundY, t, chiefMark());
    label(ctx, '🐢 Trưởng Làng', WORLD.chiefX + 5, WORLD.groundY + 24, '#ffc93c', 13);
    for (const d of drops.values()) drawRose(ctx, d.x, WORLD.groundY, t, d.id);
    for (const m of monsters.values()) if (!m.dead && m.rx > camX - 120 && m.rx < camX + viewW + 120) drawMonster(ctx, m, m.type, t);

    for (const p of players.values()) {
      if (p.info.id === myId) continue;
      const k = p.anim === 'atk1' ? 1 : 0;
      const atkP = p.anim.startsWith('atk') ? Math.min(1, (now - p.atkStart) / ATK_DUR[k]) : 0;
      drawAnimal(ctx, p.rx, p.ry, p.info.species, p.info.skin, { t, dir: p.dir, anim: p.anim, seed: p.seed, atkP });
      if (p.anim === 'fish') drawLine(p.rx, p.ry, p.dir, 'wait', t);
      label(ctx, `${p.info.name} · Lv${p.info.level}`, p.rx, p.ry + 16, '#e6d4ff', 12);
    }
    const blink = now < me.invulnUntil && Math.floor(now / 80) % 2 === 0;
    const anim = myAnim(now);
    drawAnimal(ctx, me.x, me.y, mySpecies, mySkin, { t, dir: me.dir, anim, alpha: blink ? 0.4 : 1, atkP: anim.startsWith('atk') ? 1 - (me.atkUntil - now) / ATK_DUR[me.atkK] : 0 });
    if (fishing.state) drawLine(me.x, me.y, me.dir, fishing.state, t);
    label(ctx, `${myName} · Lv${progress ? progress.level : 1}`, me.x, me.y + 16, '#fff', 12);

    drawFx(dt);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2); ell(ctx, p.x, p.y, p.r, p.r, p.color); ctx.globalAlpha = 1;
    }
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
      else if (who === 'river') { x = WORLD.riverGodX; y = WORLD.groundY - 128; }
      else if (who === myId) { x = me.x; y = me.y - 84; }
      else { const p = players.get(who); if (!p) continue; x = p.rx; y = p.ry - 84; }
      drawBubble(ctx, b.text, Math.max(camX + 130, Math.min(camX + viewW - 130, x)), y, who === 'chief' || who === 'river');
    }
    ctx.restore();
    drawMinimap();
    ctx.restore();

    $('hpFill').style.width = me.hp + '%';
    $('hpText').textContent = `HP ${Math.ceil(me.hp)}/100`;
  }

  // Cho phép kiểm thử tự động đọc trạng thái
  window.__tv = { me, players, monsters, drops, fishing, get progress() { return progress; }, send };
})();
