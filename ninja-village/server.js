// Máy chủ game Làng Ninja Hoa Hồng: phục vụ file tĩnh + WebSocket nhiều người chơi.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const D = require('./game-data');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const MAX_HP = 100;
const TICK_MS = 66;

function expToNext(level) { return 20 + level * 15; }

function newRecord(token) {
  return {
    token, name: 'Ninja', look: {}, level: 1, exp: 0,
    roses: 0, bouquets: 0, chests: 0, giftsOpened: 0,
    questIndex: 0, questActive: false, questProgress: 0, buns: [],
  };
}

function sanitizeLook(look = {}) {
  const int = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : 0));
  const color = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
  return {
    hair: int(look.hair, 5), outfit: int(look.outfit, 3),
    hairColor: color(look.hairColor, '#3b2a20'), outfitColor: color(look.outfitColor, '#3a6df0'),
    bandColor: color(look.bandColor, '#e53950'), skin: color(look.skin, '#ffe0c7'),
  };
}

function createGame({ dataFile, random = Math.random, port = 3000, host = '0.0.0.0' } = {}) {
  dataFile = dataFile || path.join(__dirname, 'data', 'players.json');
  let records = {};
  try { records = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { records = {}; }
  let saveTimer = null;
  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFile(dataFile, JSON.stringify(records, null, 1), () => {});
    }, 500);
  }

  const sessions = new Map(); // id -> session
  let nextId = 1;
  const rnd = (a, b) => a + Math.floor(random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(random() * arr.length)];

  // ---------- Quái ----------
  const monsters = D.MONSTER_SPAWNS.map(([type, minX, maxX], i) => {
    const t = D.MONSTER_TYPES[type];
    return { id: i + 1, type, minX, maxX, x: minX + (maxX - minX) * random(), dir: 1, hp: t.hp, maxHp: t.hp, dead: false, respawnAt: 0, aggro: null, aggroUntil: 0, turnAt: 0 };
  });

  function tickMonsters(now, dt) {
    for (const m of monsters) {
      const t = D.MONSTER_TYPES[m.type];
      if (m.dead) {
        if (now >= m.respawnAt) { m.dead = false; m.hp = m.maxHp; m.x = m.minX + (m.maxX - m.minX) * random(); }
        continue;
      }
      let target = null;
      if (m.aggro && now < m.aggroUntil) target = sessions.get(m.aggro);
      if (!target && t.boss) {
        for (const s of sessions.values()) if (s.joined && Math.abs(s.x - m.x) < 320 && s.x > m.minX - 100) target = s;
      }
      let speed = t.speed;
      if (target) {
        m.dir = target.x > m.x ? 1 : -1;
        speed *= 1.6;
        if (Math.abs(target.x - m.x) < 20) speed = 0;
      } else if (now >= m.turnAt) {
        m.dir = random() < 0.5 ? -1 : 1;
        m.turnAt = now + 1500 + random() * 3000;
      }
      m.x += m.dir * speed * dt;
      if (m.x < m.minX) { m.x = m.minX; m.dir = 1; }
      if (m.x > m.maxX) { m.x = m.maxX; m.dir = -1; }
    }
  }

  // ---------- Gửi tin ----------
  function send(s, msg) { if (s.ws.readyState === 1) s.ws.send(JSON.stringify(msg)); }
  function broadcast(msg, except) {
    const data = JSON.stringify(msg);
    for (const s of sessions.values()) if (s.joined && s !== except && s.ws.readyState === 1) s.ws.send(data);
  }
  function publicInfo(s) {
    return { id: s.id, name: s.rec.name, look: s.rec.look, level: s.rec.level, x: s.x, y: s.y, dir: s.dir, anim: s.anim, hp: s.hp, maxHp: MAX_HP };
  }
  function progressOf(rec) {
    const q = D.QUESTS[rec.questIndex];
    return {
      level: rec.level, exp: rec.exp, expNext: expToNext(rec.level),
      roses: rec.roses, bouquets: rec.bouquets, chests: rec.chests, giftsOpened: rec.giftsOpened,
      quest: rec.questActive && q ? { id: q.id, title: q.title, desc: q.desc, type: q.type, target: q.target, count: q.count, progress: rec.questProgress } : null,
      questsLeft: D.QUESTS.length - rec.questIndex,
      buns: rec.questActive && q && q.type === 'collect' ? D.BUNS.filter((b) => !rec.buns.includes(b.id)) : [],
      rosesPerBouquet: D.ROSES_PER_BOUQUET, bouquetsPerChest: D.BOUQUETS_PER_CHEST,
    };
  }
  function sendProgress(s) { send(s, { t: 'progress', p: progressOf(s.rec) }); save(); }
  function chiefSay(text, to) {
    const msg = { t: 'bubble', who: 'chief', text };
    if (to) send(to, msg); else broadcast(msg);
  }
  function system(text) { broadcast({ t: 'chat', kind: 'system', text }); }

  function addExp(s, n) {
    const r = s.rec;
    r.exp += n;
    let up = false;
    while (r.exp >= expToNext(r.level)) { r.exp -= expToNext(r.level); r.level++; up = true; }
    if (up) {
      s.hp = MAX_HP;
      broadcast({ t: 'pinfo', p: publicInfo(s) });
      broadcast({ t: 'bubble', who: s.id, text: `Lên cấp ${r.level} rồi! Đẳng cấp!` });
    }
  }

  // ---------- Hội thoại Trưởng làng ----------
  function dialogFor(s, text) {
    const r = s.rec;
    const q = D.QUESTS[r.questIndex];
    const options = [];
    if (r.questActive && q && r.questProgress >= q.count) options.push({ id: 'turnin', label: `Trả nhiệm vụ: ${q.title}` });
    else if (!r.questActive && q) options.push({ id: 'accept', label: `Nhận nhiệm vụ: ${q.title}` });
    else if (r.questActive && q) options.push({ id: 'progress', label: 'Hỏi về nhiệm vụ hiện tại' });
    options.push({ id: 'exchange', label: `Đổi ${D.ROSES_PER_BOUQUET} 🌹 lấy 1 bó hoa hồng 💐` });
    options.push({ id: 'chest', label: `Đổi ${D.BOUQUETS_PER_CHEST} 💐 lấy rương báu 🎁` });
    options.push({ id: 'joke', label: 'Kể chuyện cười đi ông ơi' });
    options.push({ id: 'bye', label: 'Tạm biệt' });
    if (!text) {
      if (r.questActive && q && r.questProgress >= q.count) text = 'Ồ, xong việc rồi hả? Đưa đây ta xem nào!';
      else if (!r.questActive && q) text = `Con ơi, ta có việc nhờ nè: ${q.desc}`;
      else if (r.questActive && q) text = D.fill(D.LINES.inProgress, { title: q.title, p: r.questProgress, c: q.count });
      else text = D.fill(D.LINES.noQuest, { roses: D.ROSES_PER_BOUQUET });
    }
    return { t: 'dialog', text, options };
  }

  function nearChief(s) { return Math.abs(s.x - D.WORLD.chiefX) < 200; }

  function handleNpc(s, action) {
    const r = s.rec;
    if (!nearChief(s)) return send(s, { t: 'toast', text: 'Lại gần Trưởng làng để nói chuyện nha!' });
    const q = D.QUESTS[r.questIndex];
    let text = null;
    let reply = true;
    switch (action) {
      case 'talk': break;
      case 'accept':
        if (!r.questActive && q) {
          r.questActive = true; r.questProgress = 0; r.buns = [];
          text = `Nhận nhiệm vụ "${q.title}" rồi nhé! ${q.desc}`;
          reply = false;
          send(s, { t: 'dialog', text, options: [{ id: 'bye', label: 'Con đi liền!' }] });
        }
        break;
      case 'turnin':
        if (r.questActive && q && r.questProgress >= q.count) {
          r.questActive = false; r.questProgress = 0; r.questIndex++; r.bouquets++; r.buns = [];
          addExp(s, 30);
          text = `${q.done} (+1 💐)`;
          chiefSay(text, s);
        }
        break;
      case 'progress': break;
      case 'exchange':
        if (r.roses >= D.ROSES_PER_BOUQUET) {
          r.roses -= D.ROSES_PER_BOUQUET; r.bouquets++;
          text = D.fill(D.LINES.exchanged, { n: D.ROSES_PER_BOUQUET });
        } else text = D.fill(D.LINES.needMore, { roses: r.roses, need: D.ROSES_PER_BOUQUET });
        break;
      case 'chest':
        if (r.bouquets >= D.BOUQUETS_PER_CHEST) {
          r.bouquets -= D.BOUQUETS_PER_CHEST; r.chests++;
          text = D.fill(D.LINES.chestOk, { n: D.BOUQUETS_PER_CHEST });
          chiefSay('Rương báu nè con! Mở ra đi, mở ra điii~', s);
        } else text = D.fill(D.LINES.chestNeed, { need: D.BOUQUETS_PER_CHEST, have: r.bouquets });
        break;
      case 'joke':
        text = pick(D.LINES.jokes);
        chiefSay(text, s);
        break;
      case 'bye':
        reply = false;
        chiefSay(pick(D.LINES.bye), s);
        send(s, { t: 'dialogClose' });
        break;
      default: return;
    }
    sendProgress(s);
    if (reply) send(s, dialogFor(s, text));
  }

  function openChest(s) {
    const r = s.rec;
    if (r.chests <= 0) return send(s, { t: 'toast', text: 'Con chưa có rương báu nào!' });
    r.chests--; r.giftsOpened++;
    send(s, { t: 'gift', name: 'Hub Type-C cho MacBook', image: 'hub.png', text: D.LINES.vip });
    chiefSay(D.LINES.vip, s);
    system(`🎉 ${r.name} vừa mở rương báu và nhận được QUÀ VIP: Hub Type-C cho MacBook!`);
    sendProgress(s);
  }

  // ---------- Đánh quái ----------
  function attack(s, now) {
    if (now - s.lastAttack < 300) return;
    s.lastAttack = now;
    if (random() < 0.3) broadcast({ t: 'bubble', who: s.id, text: pick(D.LINES.cries) });
    const r = s.rec;
    for (const m of monsters) {
      if (m.dead) continue;
      const t = D.MONSTER_TYPES[m.type];
      const dx = (m.x - s.x) * s.dir;
      if (dx < -25 - t.w / 2 || dx > 85 + t.w / 2) continue;
      if (Math.abs(D.WORLD.groundY - s.y) > 90 + t.h) continue;
      const crit = random() < 0.15;
      let dmg = 8 + r.level * 3 + rnd(0, 5);
      if (crit) dmg *= 2;
      m.hp -= dmg;
      m.aggro = s.id; m.aggroUntil = now + 5000;
      m.x += s.dir * (t.boss ? 4 : 14);
      broadcast({ t: 'hit', m: m.id, dmg, crit, by: s.id });
      if (m.hp <= 0) killMonster(s, m, t, now);
    }
  }

  function killMonster(s, m, t, now) {
    const r = s.rec;
    m.dead = true; m.hp = 0; m.respawnAt = now + t.respawn; m.aggro = null;
    let roses = 0;
    if (random() < t.rose) roses = t.roseCount || 1;
    r.roses += roses;
    broadcast({ t: 'mdie', m: m.id, by: s.id, roses });
    const q = D.QUESTS[r.questIndex];
    if (r.questActive && q && q.type === 'kill' && q.target === m.type && r.questProgress < q.count) {
      r.questProgress++;
      if (r.questProgress >= q.count) send(s, { t: 'toast', text: `Xong nhiệm vụ "${q.title}"! Về gặp Trưởng làng nhé.` });
    }
    if (t.boss) system(`👑 ${r.name} đã hạ gục ${t.name}! Thiệt là bá khí!`);
    addExp(s, t.exp);
    sendProgress(s);
  }

  function pickup(s, bunId) {
    const r = s.rec;
    const q = D.QUESTS[r.questIndex];
    const bun = D.BUNS.find((b) => b.id === bunId);
    if (!bun || !r.questActive || !q || q.type !== 'collect' || r.buns.includes(bunId)) return;
    if (Math.abs(s.x - bun.x) > 60 || Math.abs(s.y - bun.y) > 90) return;
    r.buns.push(bunId);
    r.questProgress = r.buns.length;
    send(s, { t: 'bubble', who: s.id, text: 'Bánh bao thơm quá! Hihi' });
    if (r.questProgress >= q.count) send(s, { t: 'toast', text: `Đủ bánh bao rồi! Về gặp Trưởng làng nhé.` });
    sendProgress(s);
  }

  // ---------- Kết nối ----------
  function handle(s, msg, now) {
    if (!s.joined) {
      if (msg.t !== 'join') return;
      const token = typeof msg.token === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(msg.token) ? msg.token : crypto.randomUUID();
      for (const o of sessions.values()) if (o.joined && o.rec.token === token) return send(s, { t: 'inuse' });
      const rec = records[token] || (records[token] = newRecord(token));
      const name = String(msg.name || '').trim().slice(0, 16);
      if (name) rec.name = name;
      if (msg.look) rec.look = sanitizeLook(msg.look);
      else rec.look = sanitizeLook(rec.look);
      Object.assign(s, { rec, joined: true, x: D.WORLD.spawnX, y: D.WORLD.groundY, dir: 1, anim: 'idle', hp: MAX_HP });
      send(s, {
        t: 'welcome', id: s.id, token, world: D.WORLD, monsterTypes: D.MONSTER_TYPES,
        players: [...sessions.values()].filter((o) => o.joined).map(publicInfo),
        monsters: monsters.map((m) => ({ id: m.id, type: m.type, x: m.x, dir: m.dir, hp: m.hp, maxHp: m.maxHp, dead: m.dead })),
      });
      broadcast({ t: 'pinfo', p: publicInfo(s) }, s);
      sendProgress(s);
      system(`${rec.name} đã vào làng. Mọi người vẫy tay chào đi nào! 👋`);
      setTimeout(() => chiefSay(D.fill(pick(D.LINES.greet), { name: rec.name }), s), 600);
      return;
    }
    switch (msg.t) {
      case 'state':
        if (typeof msg.x === 'number' && isFinite(msg.x)) s.x = Math.max(0, Math.min(D.WORLD.width, msg.x));
        if (typeof msg.y === 'number' && isFinite(msg.y)) s.y = Math.max(-200, Math.min(D.WORLD.groundY, msg.y));
        s.dir = msg.dir === -1 ? -1 : 1;
        s.anim = ['idle', 'run', 'jump', 'attack', 'hurt', 'dead'].includes(msg.anim) ? msg.anim : 'idle';
        if (typeof msg.hp === 'number') s.hp = Math.max(0, Math.min(MAX_HP, msg.hp));
        break;
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 120);
        if (!text) return;
        broadcast({ t: 'chat', kind: 'player', id: s.id, name: s.rec.name, text });
        break;
      }
      case 'attack': attack(s, now); break;
      case 'npc': handleNpc(s, msg.action); break;
      case 'open': openChest(s); break;
      case 'pickup': pickup(s, msg.id); break;
      case 'died':
        chiefSay(pick(['Ối giời ơi, con ngã đau không? Lần sau nhớ né nha!', 'Ta đã bảo rồi, ninja phải biết... chạy!', 'Về đây ta thổi phù phù cho hết đau nè!']), s);
        break;
    }
  }

  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); return res.end(); }
    const pub = path.join(__dirname, 'public');
    const file = path.normalize(path.join(pub, urlPath === '/' ? 'index.html' : urlPath));
    if (file !== pub && !file.startsWith(pub + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    const s = { id: nextId++, ws, joined: false, lastAttack: 0 };
    sessions.set(s.id, s);
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg && typeof msg.t === 'string') handle(s, msg, Date.now());
    });
    ws.on('close', () => {
      sessions.delete(s.id);
      if (s.joined) {
        broadcast({ t: 'leave', id: s.id });
        system(`${s.rec.name} đã rời làng. Hẹn gặp lại nha!`);
        save();
      }
    });
  });

  let last = Date.now();
  let idleAt = Date.now() + 15000;
  const loop = setInterval(() => {
    const now = Date.now();
    tickMonsters(now, (now - last) / 1000);
    last = now;
    if (now > idleAt) { idleAt = now + 15000 + random() * 15000; if (sessions.size) chiefSay(pick(D.LINES.idle)); }
    broadcast({
      t: 'snap',
      p: [...sessions.values()].filter((s) => s.joined).map((s) => [s.id, Math.round(s.x), Math.round(s.y), s.dir, s.anim, s.hp]),
      m: monsters.map((m) => [m.id, Math.round(m.x), m.dir, m.hp, m.dead ? 1 : 0]),
    });
  }, TICK_MS);

  return {
    server, monsters, records,
    listen(cb) { server.listen(port, host, () => cb && cb(server.address().port)); },
    close(cb) {
      clearInterval(loop);
      for (const c of wss.clients) c.terminate();
      wss.close();
      server.close(cb);
    },
  };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const game = createGame({ port });
  game.listen((p) => {
    console.log(`🥷 Làng Ninja Hoa Hồng đang chạy ở cổng ${p}`);
    console.log(`   Máy này:      http://localhost:${p}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`   Mạng LAN:     http://${a.address}:${p}`);
    }
  });
}

module.exports = { createGame };
