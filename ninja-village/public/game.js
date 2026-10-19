// Client game Làng Ninja Hoa Hồng
(() => {
  'use strict';

  // ---------- Lưu trữ cục bộ ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('nv_' + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem('nv_' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  };
  const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : 'tk' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  const HAIR_NAMES = ['Tóc chổi ninja', 'Đuôi ngựa', 'Búi củ hành', 'Hai bím', 'Đầu nấm', 'Tóc xù mì'];
  const OUTFIT_NAMES = ['Áo ninja', 'Kimono', 'Hoodie gấu', 'Giáp samurai'];
  const PALETTE = {
    hairColor: ['#3b2a20', '#1d1d2b', '#e8b04a', '#ff8fb1', '#7d5cff', '#d94a2b', '#f2f2f2', '#4fb3ff'],
    outfitColor: ['#3a6df0', '#ff6f91', '#2fbf71', '#9b5de5', '#ff9f1c', '#333a4d', '#e63946', '#00b4d8'],
    bandColor: ['#e53950', '#2b2d42', '#ffc93c', '#2fbf71', '#4fb3ff', '#ffffff'],
    skin: ['#ffe0c7', '#f6c9a5', '#e0a77e', '#b97a56'],
  };

  // ---------- Vẽ ----------
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
  function ellipse(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

  // Vẽ nhân vật chibi, gốc toạ độ ở chân, mặt quay sang phải (dir lật gương)
  function drawNinja(ctx, x, y, look, o = {}) {
    const t = o.t || 0, dir = o.dir || 1, anim = o.anim || 'idle';
    ctx.save();
    ctx.translate(x, y);
    ellipse(ctx, 0, 0, 16, 4, 'rgba(0,0,0,.18)');
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (anim === 'dead') { ctx.rotate(-Math.PI / 2 * dir); ctx.translate(-10 * dir, -8); }
    ctx.scale(dir, 1);
    const run = anim === 'run';
    const bob = run ? Math.abs(Math.sin(t * 14)) * 2 : Math.sin(t * 3) * 0.8;
    const swing = run ? Math.sin(t * 14) * 5 : 0;
    const hc = look.hairColor, oc = look.outfitColor, skin = look.skin;
    ctx.translate(0, -bob);

    // Tóc phía sau đầu
    ctx.fillStyle = hc;
    if (look.hair === 1) { ctx.beginPath(); ctx.ellipse(-19, -44 + Math.sin(t * 5) * 1.5, 7, 13, 0.4, 0, Math.PI * 2); ctx.fill(); }
    if (look.hair === 3) {
      ellipse(ctx, -17, -36, 6, 9, hc); ellipse(ctx, 14, -36, 6, 9, hc);
      ellipse(ctx, -17, -46, 4, 3, look.bandColor); ellipse(ctx, 14, -46, 4, 3, look.bandColor);
    }
    if (look.outfit === 2) ellipse(ctx, -6, -40, 16, 14, shade(oc, -25)); // mũ hoodie

    // Đuôi băng đô bay phấp phới
    ctx.strokeStyle = look.bandColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15, -56);
    ctx.quadraticCurveTo(-26, -58 + Math.sin(t * 8) * 3, -32, -52 + Math.sin(t * 8 + 1) * 4); ctx.stroke();

    // Chân
    ctx.fillStyle = shade(oc, -50);
    rr(ctx, -8 + swing * 0.6, -14, 7, 14, 3); ctx.fill();
    rr(ctx, 1 - swing * 0.6, -14, 7, 14, 3); ctx.fill();
    ctx.fillStyle = '#2b2b3a';
    rr(ctx, -9 + swing * 0.6, -4, 9, 4, 2); ctx.fill();
    rr(ctx, 0 - swing * 0.6, -4, 9, 4, 2); ctx.fill();

    // Tay sau
    ctx.fillStyle = shade(oc, -20);
    rr(ctx, -15, -29 - swing * 0.3, 7, 12, 3); ctx.fill();

    // Thân áo
    ctx.fillStyle = oc;
    rr(ctx, -11, -32, 22, 21, 6); ctx.fill();
    if (look.outfit === 0) {
      ctx.fillStyle = shade(oc, 45); ctx.beginPath(); ctx.moveTo(-5, -32); ctx.lineTo(0, -24); ctx.lineTo(5, -32); ctx.fill();
      ctx.fillStyle = '#2b2b3a'; ctx.fillRect(-11, -19, 22, 3);
    } else if (look.outfit === 1) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(3, -21); ctx.moveTo(6, -32); ctx.lineTo(-1, -24); ctx.stroke();
      ctx.fillStyle = look.bandColor; ctx.fillRect(-11, -20, 22, 5);
    } else if (look.outfit === 2) {
      ctx.fillStyle = shade(oc, -25); rr(ctx, -6, -21, 12, 7, 3); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-3, -31); ctx.lineTo(-3, -25); ctx.moveTo(3, -31); ctx.lineTo(3, -25); ctx.stroke();
    } else {
      ctx.fillStyle = shade(oc, -40);
      rr(ctx, -14, -33, 10, 7, 3); ctx.fill(); rr(ctx, 4, -33, 10, 7, 3); ctx.fill();
      ctx.strokeStyle = shade(oc, 40); ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9, -24 + i * 4); ctx.lineTo(9, -24 + i * 4); ctx.stroke(); }
    }

    // Tay trước + vũ khí
    const atk = anim === 'attack';
    ctx.save();
    ctx.translate(8, -27);
    ctx.rotate(atk ? -1.3 + Math.min(1, (o.atkP || 0)) * 2.2 : 0.2 + swing * 0.04);
    ctx.fillStyle = oc; rr(ctx, -3, -2, 7, 12, 3); ctx.fill();
    ellipse(ctx, 0.5, 11, 3.5, 3.5, skin);
    if (atk || o.showWeapon) {
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(-1, 10, 3, 7);
      ctx.fillStyle = '#dfe7f2'; ctx.beginPath(); ctx.moveTo(-2, 17); ctx.lineTo(4, 17); ctx.lineTo(1, 36); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Đầu
    ellipse(ctx, 0, -48, 17, 16, skin);
    // Mắt to long lanh
    const blink = Math.sin(t * 1.7 + (o.seed || 0)) > 0.985;
    if (anim === 'hurt' || anim === 'dead') {
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2;
      for (const ex of [2, 11]) { ctx.beginPath(); ctx.moveTo(ex - 3, -50); ctx.lineTo(ex + 3, -44); ctx.moveTo(ex + 3, -50); ctx.lineTo(ex - 3, -44); ctx.stroke(); }
    } else if (blink) {
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-1, -46); ctx.lineTo(5, -46); ctx.moveTo(8, -46); ctx.lineTo(14, -46); ctx.stroke();
    } else {
      for (const ex of [2, 11]) {
        ellipse(ctx, ex, -46, 3.6, 4.8, '#2b2b3a');
        ellipse(ctx, ex + 1.2, -47.8, 1.4, 1.6, '#fff');
      }
    }
    ellipse(ctx, -3, -40, 3.5, 2, 'rgba(255,120,140,.55)');
    ellipse(ctx, 15, -40, 3, 2, 'rgba(255,120,140,.55)');
    ctx.strokeStyle = '#7a3b3b'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (atk) { ellipse(ctx, 7, -39, 2.5, 2, '#7a3b3b'); } else { ctx.arc(7, -41, 2.5, 0.2, Math.PI - 0.2); ctx.stroke(); }

    // Tóc phía trước
    ctx.fillStyle = hc;
    const cap = () => {
      ctx.beginPath();
      ctx.arc(0, -50, 18, Math.PI * 0.92, Math.PI * 2.08);
      ctx.lineTo(16, -51); ctx.lineTo(11, -56); ctx.lineTo(7, -51); ctx.lineTo(2, -57); ctx.lineTo(-3, -51);
      ctx.lineTo(-9, -55); ctx.lineTo(-14, -48); ctx.lineTo(-17, -42); ctx.closePath(); ctx.fill();
    };
    switch (look.hair) {
      case 0:
        cap();
        ctx.beginPath();
        ctx.moveTo(-16, -58); ctx.lineTo(-27, -64); ctx.lineTo(-12, -64); ctx.lineTo(-14, -76); ctx.lineTo(-3, -67);
        ctx.lineTo(2, -80); ctx.lineTo(8, -66); ctx.lineTo(17, -72); ctx.lineTo(15, -58); ctx.closePath(); ctx.fill();
        break;
      case 1: cap(); break;
      case 2: cap(); ellipse(ctx, -2, -70, 9, 8, hc); ellipse(ctx, -2, -63, 6, 2, look.bandColor); break;
      case 3: cap(); break;
      case 4:
        ctx.beginPath(); ctx.arc(0, -50, 20, Math.PI * 0.95, Math.PI * 2.05);
        ctx.lineTo(19, -50); ctx.lineTo(-19, -50); ctx.closePath(); ctx.fill();
        ctx.fillRect(-20, -52, 8, 14);
        break;
      case 5:
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.85 + i * 0.165);
          ellipse(ctx, Math.cos(a) * 17, -52 + Math.sin(a) * 15, 8, 8, hc);
        }
        cap();
        break;
    }
    // Băng đô ninja + bảng kim loại
    ctx.fillStyle = look.bandColor;
    rr(ctx, -17, -59, 34, 6, 3); ctx.fill();
    ctx.fillStyle = '#cfd8e3'; rr(ctx, 3, -60, 11, 8, 2); ctx.fill();
    ctx.strokeStyle = '#7d8a9c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(8.5, -56, 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawChief(ctx, x, y, t, mark) {
    ctx.save();
    ctx.translate(x, y);
    ellipse(ctx, 0, 0, 20, 5, 'rgba(0,0,0,.18)');
    const bob = Math.sin(t * 2) * 1;
    ctx.translate(0, -bob);
    // gậy
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(22, -70); ctx.stroke();
    ellipse(ctx, 22, -72, 6, 6, '#6bbf59');
    // áo choàng
    ctx.fillStyle = '#b5303b';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-13, -36); ctx.lineTo(13, -36); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc93c'; ctx.fillRect(-15, -18, 30, 4);
    ellipse(ctx, 20, -28, 4, 4, '#ffe0c7');
    // đầu
    ellipse(ctx, 0, -52, 19, 18, '#ffe0c7');
    // râu dài
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-13, -48); ctx.quadraticCurveTo(0, -10 + Math.sin(t * 3) * 2, 13, -48); ctx.quadraticCurveTo(0, -38, -13, -48); ctx.fill();
    ellipse(ctx, -5, -44, 6, 3, '#fff'); ellipse(ctx, 5, -44, 6, 3, '#fff');
    // mắt híp + lông mày
    ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-6, -53, 3, Math.PI, 0); ctx.arc(6, -53, 3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; rr(ctx, -12, -61, 9, 4, 2); ctx.fill(); rr(ctx, 3, -61, 9, 4, 2); ctx.fill();
    ellipse(ctx, -12, -47, 3, 2, 'rgba(255,120,140,.5)'); ellipse(ctx, 12, -47, 3, 2, 'rgba(255,120,140,.5)');
    // nón lá
    ctx.fillStyle = '#e8c47a';
    ctx.beginPath(); ctx.moveTo(-30, -62); ctx.lineTo(0, -86); ctx.lineTo(30, -62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c99a4a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    if (mark) {
      const my = y - 112 + Math.sin(t * 4) * 4;
      ctx.font = '800 30px "Baloo 2", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(mark, x, my);
      ctx.fillStyle = mark === '?' ? '#2fbf71' : '#ffb703'; ctx.fillText(mark, x, my);
    }
  }

  function drawMonster(ctx, m, type, t) {
    const x = m.rx, y = WORLD.groundY, d = m.dir;
    ctx.save();
    ctx.translate(x, y);
    if (m.flash > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(m.flash * 60);
    if (type === 'snail') {
      ellipse(ctx, 0, 0, 20, 4, 'rgba(0,0,0,.15)');
      ctx.scale(d, 1);
      const s = 1 + Math.sin(t * 4 + m.id) * 0.04;
      ctx.fillStyle = '#b9e769'; rr(ctx, -18, -10, 40 * s, 10, 5); ctx.fill();
      ctx.strokeStyle = '#8bc34a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(20, -22); ctx.moveTo(12, -9); ctx.lineTo(13, -21); ctx.stroke();
      ellipse(ctx, 20, -23, 3, 3, '#2b2b3a'); ellipse(ctx, 13, -22, 3, 3, '#2b2b3a');
      ellipse(ctx, 0, -18, 15, 15, '#f4a259');
      ctx.strokeStyle = '#c0632b'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const r = 2 + a * 1.05; ctx.lineTo(Math.cos(a) * r, -18 + Math.sin(a) * r); }
      ctx.stroke();
      ctx.font = '10px sans-serif'; ctx.fillText('z', -14, -36 - (t * 10 % 8));
    } else if (type === 'mushroom') {
      const hop = Math.abs(Math.sin(t * 6 + m.id)) * 8;
      ellipse(ctx, 0, 0, 18 - hop * 0.5, 4, 'rgba(0,0,0,.15)');
      ctx.scale(d, 1);
      ctx.translate(0, -hop);
      ctx.fillStyle = '#fff1d6'; rr(ctx, -11, -24, 22, 24, 8); ctx.fill();
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -17); ctx.lineTo(0, -14); ctx.moveTo(10, -17); ctx.lineTo(4, -14); ctx.stroke();
      ellipse(ctx, -2, -11, 2, 2.5, '#2b2b3a'); ellipse(ctx, 7, -11, 2, 2.5, '#2b2b3a');
      ctx.beginPath(); ctx.arc(3, -4, 3, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.fillStyle = '#e63946';
      ctx.beginPath(); ctx.ellipse(0, -24, 22, 18, 0, Math.PI, 0); ctx.fill();
      ellipse(ctx, -9, -32, 4, 3, '#fff'); ellipse(ctx, 6, -36, 5, 3.5, '#fff'); ellipse(ctx, 14, -27, 3, 2.5, '#fff');
    } else {
      ellipse(ctx, 0, 0, 46, 8, 'rgba(0,0,0,.2)');
      ctx.scale(d, 1);
      const step = Math.sin(t * 10) * 3;
      ctx.fillStyle = '#5c3b28';
      for (const lx of [-28, -12, 12, 26]) { rr(ctx, lx - 5, -18 + (lx % 2 ? step : -step) * 0.3, 10, 18, 3); ctx.fill(); }
      ellipse(ctx, 0, -38, 44, 28, '#7b4b33');
      ctx.fillStyle = '#5c3b28';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 10, -62); ctx.lineTo(-25 + i * 10, -74); ctx.lineTo(-20 + i * 10, -62); ctx.fill(); }
      ellipse(ctx, 36, -36, 22, 20, '#8a5639');
      ellipse(ctx, 52, -30, 10, 8, '#f7a1b5');
      ellipse(ctx, 50, -30, 2, 3, '#7a3b3b'); ellipse(ctx, 55, -30, 2, 3, '#7a3b3b');
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(44, -24); ctx.lineTo(48, -42); ctx.lineTo(50, -24); ctx.fill();
      ellipse(ctx, 40, -44, 4, 4, '#fff'); ellipse(ctx, 41, -44, 2, 2.5, '#2b2b3a');
      ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(33, -52); ctx.lineTo(45, -48); ctx.stroke();
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath(); ctx.moveTo(22, -56); ctx.lineTo(24, -72); ctx.lineTo(30, -63); ctx.lineTo(36, -76); ctx.lineTo(42, -63); ctx.lineTo(48, -72); ctx.lineTo(48, -56); ctx.closePath(); ctx.fill();
      ellipse(ctx, 35, -62, 2.5, 2.5, '#e63946');
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

  function drawBun(ctx, x, y, t) {
    const by = y - 12 + Math.sin(t * 3 + x) * 4;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15;
    ellipse(ctx, x, by, 20, 20, '#fff6a8');
    ctx.globalAlpha = 1;
    ellipse(ctx, x, by + 2, 13, 10, '#fffaf0');
    ctx.strokeStyle = '#e6d5b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 5, by - 6); ctx.quadraticCurveTo(x, by, x + 5, by - 6); ctx.moveTo(x, by - 8); ctx.lineTo(x, by - 2); ctx.stroke();
    ellipse(ctx, x - 4, by + 4, 1.5, 1.5, '#2b2b3a'); ellipse(ctx, x + 4, by + 4, 1.5, 1.5, '#2b2b3a');
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

  // ---------- Tạo nhân vật ----------
  const $ = (id) => document.getElementById(id);
  let look = store.get('look') || { hair: 0, outfit: 0, hairColor: PALETTE.hairColor[0], outfitColor: PALETTE.outfitColor[0], bandColor: PALETTE.bandColor[0], skin: PALETTE.skin[0] };
  $('nameInput').value = store.get('name') || '';
  const pv = $('preview'), pctx = pv.getContext('2d');

  function refreshCreate() {
    $('hairLabel').textContent = HAIR_NAMES[look.hair];
    $('outfitLabel').textContent = OUTFIT_NAMES[look.outfit];
    document.querySelectorAll('.swatches').forEach((box) => {
      box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === look[box.dataset.key]));
    });
  }
  document.querySelectorAll('.swatches').forEach((box) => {
    for (const c of PALETTE[box.dataset.key]) {
      const b = document.createElement('button');
      b.type = 'button'; b.style.background = c; b.dataset.c = c; b.title = c;
      b.onclick = () => { look[box.dataset.key] = c; refreshCreate(); };
      box.appendChild(b);
    }
  });
  document.querySelectorAll('[data-step]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.step, n = k === 'hair' ? HAIR_NAMES.length : OUTFIT_NAMES.length;
      look[k] = (look[k] + Number(b.dataset.d) + n) % n; refreshCreate();
    };
  });
  $('randomLook').onclick = () => {
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    look = { hair: Math.floor(Math.random() * HAIR_NAMES.length), outfit: Math.floor(Math.random() * OUTFIT_NAMES.length), hairColor: r(PALETTE.hairColor), outfitColor: r(PALETTE.outfitColor), bandColor: r(PALETTE.bandColor), skin: r(PALETTE.skin) };
    refreshCreate();
  };
  refreshCreate();

  let previewRaf = 0;
  function previewLoop(ts) {
    const t = ts / 1000;
    pctx.clearRect(0, 0, pv.width, pv.height);
    pctx.save(); pctx.scale(2, 2);
    drawNinja(pctx, 55, 112, look, { t, dir: Math.sin(t * 0.8) > -0.6 ? 1 : -1, anim: 'idle', showWeapon: true });
    pctx.restore();
    label(pctx, $('nameInput').value.trim() || 'Ninja', 110, 30, '#fff', 18);
    previewRaf = requestAnimationFrame(previewLoop);
  }
  previewRaf = requestAnimationFrame(previewLoop);

  $('startBtn').onclick = () => {
    const name = $('nameInput').value.trim();
    if (!name) { $('nameInput').focus(); $('createHint').textContent = 'Đặt tên cho ninja của con đã nào! 😊'; return; }
    store.set('look', look); store.set('name', name);
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
  const bubbles = new Map(); // who -> {text, until}
  const floaters = [], particles = [], slashes = [];
  let progress = null;
  const me = { x: 260, y: 470, vx: 0, vy: 0, onGround: true, jumps: 0, dir: 1, hp: 100, invulnUntil: 0, attackUntil: 0, attackCd: 0, dead: false, deadUntil: 0, dropUntil: 0, lastHurt: 0 };
  const keys = {};
  let jumpQueued = false, talkQueued = false, attackHeld = false;
  let dialogOpen = false, dialogOptions = [];
  const pickupSent = new Set();
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
      ws.send(JSON.stringify({ t: 'join', token, name: myName, look }));
    };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (myId != null) $('disconnected').classList.remove('hidden');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
  }
  function send(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

  function playerById(id) { return players.get(id); }

  function onMessage(msg) {
    switch (msg.t) {
      case 'inuse':
        // Nhân vật này đang online ở tab khác -> tạo nhân vật mới cho tab này
        store.set('token', newToken());
        ws.send(JSON.stringify({ t: 'join', token: store.get('token'), name: myName, look }));
        toast('Nhân vật cũ đang chơi ở tab khác, đã tạo ninja mới cho tab này!');
        break;
      case 'welcome':
        myId = msg.id; WORLD = msg.world; MTYPES = msg.monsterTypes;
        store.set('token', msg.token);
        players.clear(); monsters.clear();
        for (const p of msg.players) addPlayer(p);
        for (const m of msg.monsters) monsters.set(m.id, { ...m, rx: m.x, tx: m.x, flash: 0 });
        me.x = WORLD.spawnX; me.y = WORLD.groundY; me.hp = 100;
        break;
      case 'pinfo': addPlayer(msg.p); updateOnline(); break;
      case 'leave': players.delete(msg.id); bubbles.delete(msg.id); updateOnline(); break;
      case 'snap':
        for (const [id, x, y, dir, anim, hp] of msg.p) {
          const p = players.get(id);
          if (!p || id === myId) continue;
          Object.assign(p, { tx: x, ty: y, dir, anim, hp });
        }
        for (const [id, x, dir, hp, dead] of msg.m) {
          const m = monsters.get(id);
          if (!m) continue;
          if (m.dead && !dead) { m.rx = x; }
          Object.assign(m, { tx: x, dir, hp, dead: !!dead });
        }
        break;
      case 'chat':
        addChat(msg);
        if (msg.kind === 'player') say(msg.id, msg.text);
        break;
      case 'bubble':
        say(msg.who, msg.text);
        if (msg.who === 'chief') addChat({ kind: 'npc', name: 'Trưởng làng', text: msg.text });
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
        if (msg.roses) {
          floaters.push({ x: m.rx, y: WORLD.groundY - 50, vy: -40, life: 1.6, text: `🌹 +${msg.roses}`, color: '#ff6f91', size: 20 });
          if (msg.by === myId) toast(`Nhặt được ${msg.roses} bông hoa hồng! 🌹`);
        }
        break;
      }
      case 'progress': progress = msg.p; renderProgress(); break;
      case 'dialog': showDialog(msg.text, msg.options); break;
      case 'dialogClose': hideDialog(); break;
      case 'toast': toast(msg.text); break;
      case 'gift': showGift(msg); break;
    }
  }

  function addPlayer(p) {
    const ex = players.get(p.id);
    if (ex) { ex.info = p; return; }
    players.set(p.id, { info: p, rx: p.x, ry: p.y, tx: p.x, ty: p.y, dir: p.dir, anim: p.anim, hp: p.hp, seed: Math.random() * 10 });
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
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  const TARGET_NAMES = { snail: 'Ốc Sên Lười', mushroom: 'Nấm Lùn', boar: 'Heo Rừng Đại Ca', bun: 'Bánh bao' };
  function renderProgress() {
    const p = progress;
    const info = players.get(myId);
    if (info) info.info.level = p.level;
    $('hudName').textContent = myName;
    $('hudLevel').textContent = `Cấp ${p.level}`;
    $('expFill').style.width = (p.exp / p.expNext) * 100 + '%';
    $('expText').textContent = `EXP ${p.exp}/${p.expNext}`;
    $('roses').textContent = p.roses; $('rosesNeed').textContent = `/${p.rosesPerBouquet}`;
    $('bouquets').textContent = p.bouquets; $('bouquetsNeed').textContent = `/${p.bouquetsPerChest}`;
    $('chests').textContent = p.chests;
    $('openChestBtn').classList.toggle('hidden', p.chests <= 0);
    const q = p.quest;
    const qEl = $('quest');
    if (q) {
      const done = q.progress >= q.count;
      qEl.innerHTML = '';
      const b = document.createElement('b'); b.textContent = '📜 ' + q.title; qEl.appendChild(b);
      qEl.appendChild(document.createElement('br'));
      qEl.appendChild(document.createTextNode(done ? '✅ Xong rồi! Về gặp Trưởng làng (phím E)' : `${TARGET_NAMES[q.target]}: ${q.progress}/${q.count}`));
    } else if (p.questsLeft > 0) {
      qEl.textContent = '❗ Đến nói chuyện với Trưởng làng (phím E) để nhận nhiệm vụ';
    } else {
      qEl.textContent = `🌹 Hết nhiệm vụ! Đánh quái lấy hoa hồng, đổi ${p.rosesPerBouquet} 🌹 = 1 💐, ${p.bouquetsPerChest} 💐 = 1 🎁`;
    }
  }

  // ---------- Hội thoại ----------
  const portrait = $('chiefPortrait').getContext('2d');
  function showDialog(text, options) {
    dialogOpen = true; dialogOptions = options;
    $('dialog').classList.remove('hidden');
    $('dialogText').textContent = text;
    const box = $('dialogOptions'); box.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button';
      const k = document.createElement('i'); k.textContent = i + 1 + '.';
      b.appendChild(k); b.appendChild(document.createTextNode(o.label));
      b.onclick = () => send({ t: 'npc', action: o.id });
      box.appendChild(b);
    });
    portrait.clearRect(0, 0, 110, 120);
    portrait.save(); portrait.scale(1.2, 1.2); drawChief(portrait, 44, 96, 0, null); portrait.restore();
  }
  function hideDialog() { dialogOpen = false; $('dialog').classList.add('hidden'); }
  $('dialogClose').onclick = () => send({ t: 'npc', action: 'bye' });

  // ---------- Quà VIP ----------
  $('openChestBtn').onclick = () => send({ t: 'open' });
  function showGift(g) {
    hideDialog();
    $('giftModal').classList.remove('hidden');
    $('giftReveal').classList.add('hidden');
    const chest = $('chestStage'); chest.classList.remove('hidden', 'pop');
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
    if (dialogOpen && /^[1-9]$/.test(e.key)) { const o = dialogOptions[Number(e.key) - 1]; if (o) send({ t: 'npc', action: o.id }); return; }
    if (e.key === 'Escape' && dialogOpen) { send({ t: 'npc', action: 'bye' }); return; }
    if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = true;
    if (['ArrowUp', 'w', 'W', ' '].includes(e.key) && !e.repeat) jumpQueued = true;
    if (['j', 'J', 'z', 'Z'].includes(e.key)) attackHeld = true;
    if (['e', 'E', 'f', 'F'].includes(e.key) && !e.repeat) talkQueued = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false;
    if (['j', 'J', 'z', 'Z'].includes(e.key)) attackHeld = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; attackHeld = false; });
  document.querySelectorAll('#touch button').forEach((b) => {
    const k = b.dataset.key;
    const down = (e) => {
      e.preventDefault();
      if (k === 'jump') jumpQueued = true; else if (k === 'talk') talkQueued = true; else if (k === 'attack') attackHeld = true; else keys[k] = true;
    };
    const up = (e) => { e.preventDefault(); if (k === 'attack') attackHeld = false; else keys[k] = false; };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  // Bấm vào Trưởng làng để nói chuyện
  const VIEW_H = 600; // chiều cao logic của khung nhìn (mặt đất ở y=470, dư đất bên dưới cho khung chat)
  let scale = 1, offY = 0, camX = 0, viewW = 960;
  canvas.addEventListener('click', (e) => {
    if (!WORLD) return;
    const wx = e.clientX / scale + camX, wy = e.clientY / scale - offY;
    if (Math.abs(wx - WORLD.chiefX) < 40 && wy > WORLD.groundY - 100 && wy < WORLD.groundY + 10) talkQueued = true;
  });

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    scale = innerHeight / VIEW_H;
    if (innerWidth / scale < 520) scale = innerWidth / 520;
    offY = innerHeight / scale - VIEW_H;
    viewW = innerWidth / scale;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- Vật lý người chơi ----------
  const GRAV = 1800, SPEED = 220, JUMP = 640;
  let lastSend = 0;
  function myAnim(now) {
    if (me.dead) return 'dead';
    if (now < me.attackUntil) return 'attack';
    if (now < me.invulnUntil - 600) return 'hurt';
    if (!me.onGround) return 'jump';
    return Math.abs(me.vx) > 1 ? 'run' : 'idle';
  }
  function sendState(now) {
    lastSend = now;
    send({ t: 'state', x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, anim: myAnim(now), hp: Math.round(me.hp) });
  }

  function updateMe(dt, now) {
    if (me.dead) {
      if (now > me.deadUntil) {
        Object.assign(me, { dead: false, x: WORLD.spawnX, y: WORLD.groundY, vx: 0, vy: 0, hp: 100, invulnUntil: now + 2000 });
      }
      return;
    }
    const typing = document.activeElement === chatInput;
    const dirIn = typing ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (now < me.invulnUntil - 700) { /* đang bị đẩy lùi */ } else me.vx = dirIn * SPEED;
    if (dirIn) me.dir = dirIn;
    if (jumpQueued && !typing) {
      if (me.onGround) { me.vy = -JUMP; me.jumps = 1; me.onGround = false; }
      else if (me.jumps < 2) { me.vy = -JUMP * 0.9; me.jumps = 2; for (let i = 0; i < 6; i++) particles.push({ x: me.x, y: me.y, vx: (Math.random() - 0.5) * 120, vy: Math.random() * 60, life: 0.4, color: '#fff', r: 4 }); }
    }
    jumpQueued = false;
    if (keys.down && me.onGround && me.y < WORLD.groundY) { me.dropUntil = now + 250; me.onGround = false; }

    const prevY = me.y;
    me.vy += GRAV * dt;
    me.x = Math.max(20, Math.min(WORLD.width - 20, me.x + me.vx * dt));
    me.y += me.vy * dt;
    me.onGround = false;
    if (me.vy >= 0 && now > me.dropUntil) {
      for (const p of WORLD.platforms) {
        if (me.x > p.x && me.x < p.x + p.w && prevY <= p.y + 1 && me.y >= p.y) { me.y = p.y; me.vy = 0; me.onGround = true; }
      }
    }
    if (me.y >= WORLD.groundY) { me.y = WORLD.groundY; me.vy = 0; me.onGround = true; }
    if (me.onGround) me.jumps = 0;

    // Đánh
    if (attackHeld && !typing && now > me.attackCd) {
      me.attackCd = now + 330; me.attackUntil = now + 220;
      sendState(now);
      send({ t: 'attack' });
      slashes.push({ x: me.x, y: me.y, dir: me.dir, life: 0.2 });
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
          floaters.push({ x: me.x, y: me.y - 70, vy: -50, life: 1, text: '-' + ti.dmg, color: '#ff4d6d', size: 16 });
          if (me.hp <= 0) {
            me.hp = 0; me.dead = true; me.deadUntil = now + 2000;
            say(myId, 'Ui da... cho con nằm xíu 😵'); send({ t: 'died' });
          } else if (Math.random() < 0.3) say(myId, ['Úi!', 'Đau quá à!', 'Hông chịu đâu!'][Math.floor(Math.random() * 3)]);
          break;
        }
      }
    }
    if (now - me.lastHurt > 2000 && me.hp < 100) me.hp = Math.min(100, me.hp + 7 * dt);

    // Nhặt bánh bao
    if (progress && progress.buns) {
      for (const b of progress.buns) {
        if (!pickupSent.has(b.id) && Math.abs(me.x - b.x) < 40 && Math.abs(me.y - b.y) < 60) {
          pickupSent.add(b.id); sendState(now); send({ t: 'pickup', id: b.id });
          setTimeout(() => pickupSent.delete(b.id), 1500);
        }
      }
    }

    // Nói chuyện
    if (talkQueued) {
      if (Math.abs(me.x - WORLD.chiefX) < 190) { sendState(now); send({ t: 'npc', action: 'talk' }); }
      else toast('Lại gần Trưởng làng (ông cụ đội nón lá) để nói chuyện nha!');
    }
    talkQueued = false;
    if (dialogOpen && Math.abs(me.x - WORLD.chiefX) > 220) hideDialog();

    if (now - lastSend > 66) sendState(now);
  }

  // ---------- Vẽ cảnh ----------
  function drawBackground(t) {
    const H = VIEW_H + offY;
    const g = ctx.createLinearGradient(0, -offY, 0, WORLD.groundY);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.7, '#d9f1ff'); g.addColorStop(1, '#ffe6ef');
    ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, H);
    ellipse(ctx, viewW - 120, 70, 34, 34, '#fff2a8');
    // mây
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 420 - camX * 0.15 + t * 8) % (viewW + 400) + viewW + 400) % (viewW + 400) - 200;
      const cy = 40 + (i * 53) % 120;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ellipse(ctx, cx, cy, 40, 16, '#fff'); ellipse(ctx, cx + 26, cy - 8, 26, 16, '#fff'); ellipse(ctx, cx - 24, cy - 4, 22, 13, '#fff');
    }
    // núi xa
    for (let layer = 0; layer < 2; layer++) {
      const par = layer ? 0.45 : 0.25;
      ctx.fillStyle = layer ? '#a6d8b0' : '#c4e3d6';
      ctx.beginPath(); ctx.moveTo(0, WORLD.groundY);
      for (let x = -200; x < viewW + 400; x += 160) {
        const wx = x - ((camX * par) % 320);
        ctx.lineTo(wx, WORLD.groundY - 140 - layer * -50 - ((Math.floor((x + camX * par) / 160) * 37) % 70));
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
    ellipse(ctx, x + 60, y - 70, 8, 10, '#e63946');
  }
  function sakura(x, t) {
    const y = WORLD.groundY;
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x - 6, y - 90, 12, 90);
    for (const [dx, dy, r] of [[0, -110, 38], [-32, -95, 28], [32, -95, 28], [0, -140, 26]]) ellipse(ctx, x + dx, y + dy, r, r * 0.85, '#ffc2d4');
    for (let i = 0; i < 3; i++) {
      const px = x - 40 + ((t * 20 + i * 37 + x) % 90), py = y - 80 + ((t * 30 + i * 50) % 80);
      ellipse(ctx, px, py, 3, 2, '#ff9ab8');
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

  function drawWorld(t) {
    const G = WORLD.groundY;
    // Cổng làng, nhà, cây
    sakura(60, t); house(110, '#4f6dd6', '#fff3e0'); sakura(320, t); house(560, '#d6455a', '#fff3e0'); sakura(760, t);
    ctx.fillStyle = '#d6455a'; ctx.fillRect(880, G - 130, 12, 130); ctx.fillRect(968, G - 130, 12, 130);
    ctx.fillRect(866, G - 140, 128, 14); ctx.fillRect(876, G - 112, 108, 8);
    sign(930, 'Làng Hoa Hồng');
    sign(1040, '→ Đồng Ốc Sên'); sign(1830, '→ Rừng Nấm Lùn'); sign(2700, '⚠ Hang Heo Đại Ca');
    for (let x = 1800; x < 2650; x += 140) { ctx.fillStyle = '#5a9e4b'; ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + 40, G - 120); ctx.lineTo(x + 80, G); ctx.fill(); }
    ctx.fillStyle = '#6b5a52'; ctx.beginPath(); ctx.moveTo(2780, G); ctx.quadraticCurveTo(3050, G - 260, 3380, G); ctx.fill();
    ctx.fillStyle = '#3b2f2b'; ctx.beginPath(); ctx.ellipse(3200, G, 60, 70, 0, Math.PI, 0); ctx.fill();
    // Mặt đất
    ctx.fillStyle = '#9b6b43'; ctx.fillRect(camX - 10, G, viewW + 20, VIEW_H - G + 10);
    ctx.fillStyle = '#7ccf5a'; ctx.fillRect(camX - 10, G, viewW + 20, 12);
    ctx.fillStyle = '#5fb444';
    for (let x = Math.floor(camX / 24) * 24; x < camX + viewW + 24; x += 24) { ctx.beginPath(); ctx.moveTo(x, G + 12); ctx.lineTo(x + 6, G + 3); ctx.lineTo(x + 12, G + 12); ctx.fill(); }
    for (let x = Math.floor(camX / 90) * 90; x < camX + viewW + 90; x += 90) {
      const c = ['#ff6f91', '#ffc93c', '#fff'][(x / 90) % 3];
      ellipse(ctx, x + 30, G - 3, 4, 4, c); ellipse(ctx, x + 30, G - 3, 1.5, 1.5, '#ffb703');
    }
    // Bục gỗ
    for (const p of WORLD.platforms) {
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(p.x + 10, p.y, 6, G - p.y); ctx.fillRect(p.x + p.w - 16, p.y, 6, G - p.y);
      ctx.fillStyle = '#c98b56'; rr(ctx, p.x, p.y, p.w, 14, 5); ctx.fill();
      ctx.fillStyle = '#7ccf5a'; rr(ctx, p.x - 2, p.y - 4, p.w + 4, 7, 3); ctx.fill();
    }
  }

  function chiefMark() {
    if (!progress) return '!';
    if (progress.quest && progress.quest.progress >= progress.quest.count) return '?';
    if (!progress.quest && progress.questsLeft > 0) return '!';
    if (progress.bouquets >= progress.bouquetsPerChest || progress.roses >= progress.rosesPerBouquet) return '!';
    return null;
  }

  function drawMinimap() {
    const w = Math.min(260, viewW * 0.3), x0 = viewW / 2 - w / 2, y0 = -offY + 14;
    ctx.fillStyle = 'rgba(255,248,239,.85)'; rr(ctx, x0 - 6, y0 - 6, w + 12, 18, 9); ctx.fill();
    ctx.fillStyle = '#e8d3c4'; ctx.fillRect(x0, y0 + 2, w, 2);
    const dot = (wx, c, r) => ellipse(ctx, x0 + (wx / WORLD.width) * w, y0 + 3, r, r, c);
    dot(WORLD.chiefX, '#ffb703', 4);
    for (const m of monsters.values()) if (!m.dead && MTYPES[m.type].boss) dot(m.rx, '#7b4b33', 4);
    for (const p of players.values()) if (p.info.id !== myId) dot(p.rx, '#4fb3ff', 3.5);
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

    camX = Math.max(0, Math.min(WORLD.width - viewW, me.x - viewW / 2));
    if (WORLD.width < viewW) camX = 0;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, offY);
    drawBackground(t);
    ctx.save();
    ctx.translate(-camX, 0);
    drawWorld(t);
    if (progress && progress.buns) for (const b of progress.buns) drawBun(ctx, b.x, b.y, t);
    drawChief(ctx, WORLD.chiefX, WORLD.groundY, t, chiefMark());
    label(ctx, '👴 Trưởng Làng', WORLD.chiefX, WORLD.groundY + 24, '#ffc93c', 13);
    for (const m of monsters.values()) if (!m.dead && m.rx > camX - 120 && m.rx < camX + viewW + 120) drawMonster(ctx, m, m.type, t);

    // Người chơi khác rồi đến mình (vẽ sau cùng để nổi bật)
    const list = [...players.values()].filter((p) => p.info.id !== myId);
    for (const p of list) {
      drawNinja(ctx, p.rx, p.ry, p.info.look, { t, dir: p.dir, anim: p.anim, seed: p.seed, atkP: p.anim === 'attack' ? (t * 5) % 1 : 0 });
      label(ctx, `${p.info.name} · Lv${p.info.level}`, p.rx, p.ry + 16, '#c9e7ff', 12);
      if (p.anim === 'attack' && Math.random() < 0.25) slashes.push({ x: p.rx, y: p.ry, dir: p.dir, life: 0.15 });
    }
    const blink = now < me.invulnUntil && Math.floor(now / 80) % 2 === 0;
    const anim = myAnim(now);
    drawNinja(ctx, me.x, me.y, look, { t, dir: me.dir, anim, alpha: blink ? 0.4 : 1, atkP: anim === 'attack' ? 1 - (me.attackUntil - now) / 220 : 0 });
    label(ctx, `${myName} · Lv${progress ? progress.level : 1}`, me.x, me.y + 16, '#fff', 12);

    // Hiệu ứng chém
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i]; s.life -= dt;
      if (s.life <= 0) { slashes.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = s.life * 5;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(s.x + s.dir * 20, s.y - 30, 42, s.dir > 0 ? -1.2 : Math.PI - 0.6, s.dir > 0 ? 0.6 : Math.PI + 1.2); ctx.stroke();
      ctx.strokeStyle = '#a8e0ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2); ellipse(ctx, p.x, p.y, p.r, p.r, p.color); ctx.globalAlpha = 1;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.life -= dt;
      if (f.life <= 0) { floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
      ctx.globalAlpha = Math.min(1, f.life * 2); label(ctx, f.text, f.x, f.y, f.color, f.size); ctx.globalAlpha = 1;
    }

    // Bong bóng chat trên đầu
    for (const [who, b] of bubbles) {
      if (now > b.until) { bubbles.delete(who); continue; }
      let x, y;
      if (who === 'chief') { x = WORLD.chiefX; y = WORLD.groundY - 96; }
      else if (who === myId) { x = me.x; y = me.y - 84; }
      else { const p = playerById(who); if (!p) continue; x = p.rx; y = p.ry - 84; }
      drawBubble(ctx, b.text, Math.max(camX + 130, Math.min(camX + viewW - 130, x)), y, who === 'chief');
    }
    ctx.restore();
    drawMinimap();
    ctx.restore();

    $('hpFill').style.width = me.hp + '%';
    $('hpText').textContent = `HP ${Math.ceil(me.hp)}/100`;
  }

  // Cho phép kiểm thử tự động đọc trạng thái
  window.__nv = { me, players, monsters, get progress() { return progress; }, send };
})();
