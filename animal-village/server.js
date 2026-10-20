// Máy chủ game Làng Thú Ngộ Nghĩnh: phục vụ file tĩnh + WebSocket nhiều người chơi.
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
const DROP_LIFE = 60000;
const DROP_PRIVATE = 15000; // sau thời gian này người khác cũng nhặt được

function expToNext(level) { return 20 + level * 15; }

function newRecord(token) {
  return {
    token, name: 'Bạn nhỏ', species: 'hamster', skin: 0, level: 1, exp: 0,
    roses: 0, fish: 0, chest: 0, key: 0, giftsOpened: 0, stage: 0, graduated: false, pkWins: 0,
  };
}

function createGame({ dataFile, random = Math.random, port = 3000, host = '0.0.0.0', timing = {} } = {}) {
  dataFile = dataFile || path.join(__dirname, 'data', 'players.json');
  const biteMin = timing.biteMin ?? 1500, biteMax = timing.biteMax ?? 3500, biteWindow = timing.biteWindow ?? 1300;
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
  let nextDrop = 1;
  const drops = new Map(); // id -> {id, x, owner, born}
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
    const r = s.rec;
    return { id: s.id, name: r.name, species: r.species, skin: r.skin, level: r.level, x: s.x, y: s.y, dir: s.dir, anim: s.anim, hp: s.hp, maxHp: MAX_HP };
  }
  function progressOf(r) {
    const st = D.STAGES[r.stage];
    return {
      level: r.level, exp: r.exp, expNext: expToNext(r.level),
      roses: r.roses, fish: r.fish, chest: r.chest, key: r.key, giftsOpened: r.giftsOpened,
      stage: r.stage, stageCount: D.STAGES.length, stageTitle: st.title, stageHint: st.hint, graduated: !!r.graduated, pkWins: r.pkWins || 0,
      rosesNeed: D.ROSES_FOR_CHEST, fishNeed: D.FISH_FOR_KEY,
    };
  }
  function sendProgress(s) { send(s, { t: 'progress', p: progressOf(s.rec) }); save(); }
  function npcSay(who, text, to) {
    const msg = { t: 'bubble', who, text };
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

  // ---------- Trưởng làng ----------
  const R = D.ROSES_FOR_CHEST, F = D.FISH_FOR_KEY;
  function chiefDialog(s, text) {
    const r = s.rec;
    const options = [];
    let def;
    switch (r.stage) {
      case 0:
        def = `Con ơi, làng ta có một rương báu đựng món quà VIP nhất vùng! Muốn có rương thì gom cho ta ${R} bông hoa hồng đỏ. Quái ngoài đồng (phía PHẢI làng) đánh là rơi hoa hồng, con đi ngang qua là tự nhặt vào hành trang.`;
        options.push({ id: 'accept', label: 'Con đi săn hoa hồng ngay!' });
        break;
      case 1:
        if (r.roses >= R) { def = `Ôi, ${r.roses} bông hoa hồng đỏ thơm phức! Đưa ta ${R} bông, ta trao rương báu cho con.`; options.push({ id: 'chest', label: `Đổi ${R} 🌹 lấy rương báu 🎁` }); }
        else def = `Con mới có ${r.roses}/${R} bông hoa hồng thôi. Đánh quái ngoài đồng thêm nha, ta tin con!`;
        break;
      case 2: case 3:
        def = 'Chìa khóa rơi ở lòng sông đó con. Ra bờ sông phía TRÁI làng, nhờ Thần Sông mò giúp. Ông ấy hơi tham ăn nha!';
        break;
      case 4:
        def = 'Rương báu có rồi, chìa khóa vàng cũng có rồi! Để ta mở cho con nào, hồi hộp chưa?';
        options.push({ id: 'open', label: 'Mở rương báu! 🗝️🎁' });
        break;
      case 5:
        def = 'Quà VIP là của con rồi! Nhưng muốn tốt nghiệp Khóa Học Trưởng Thành thì còn một thử thách cuối: tỷ thí PK và giành chiến thắng. Con dám không?';
        options.push({ id: 'final', label: 'Con dám! Nhận nhiệm vụ tỷ thí ⚔️' });
        break;
      case 6:
        def = s.duel ? 'Đang tỷ thí mà còn chạy lại đây hả? Tập trung đánh đi con!' : 'Đến gần một bạn khác rồi nhấn P để mời tỷ thí. Không có ai thì ta gọi Sư Phụ Gấu Trúc ra đấu với con nha!';
        if (!s.duel) options.push({ id: 'sensei', label: 'Gọi Sư Phụ Gấu Trúc ra tỷ thí 🐼' });
        break;
      default:
        def = 'Con đã tốt nghiệp Khóa Học Trưởng Thành rồi! Muốn xem lại câu chuyện, hay đi lại hành trình từ đầu?';
        options.push({ id: 'story', label: 'Xem lại câu chuyện 📖' });
        if (!s.duel) options.push({ id: 'sensei', label: 'Tỷ thí giao hữu với Sư Phụ Gấu Trúc 🐼' });
        options.push({ id: 'restart', label: 'Đi lại hành trình từ đầu' });
    }
    options.push({ id: 'joke', label: 'Kể chuyện cười đi ông ơi' });
    options.push({ id: 'bye', label: 'Tạm biệt' });
    return { t: 'dialog', npc: 'chief', text: text || def, options };
  }

  function chiefAction(s, action) {
    const r = s.rec;
    let text = null;
    switch (action) {
      case 'talk': break;
      case 'accept':
        if (r.stage === 0) { r.stage = 1; text = 'Tốt lắm! Đi về phía PHẢI làng, đánh Ốc Sên, Nấm Lùn là rơi hoa hồng. Cẩn thận Heo Rừng Đại Ca ở cuối đường nha!'; }
        break;
      case 'chest':
        if (r.stage === 1 && r.roses >= R) {
          r.roses -= R; r.chest = 1; r.stage = 2;
          text = 'Rương báu của con đây! Nhưng mà... ôi thôi, chìa khóa ta làm rơi xuống lòng sông từ 50 năm trước rồi. Con ra bờ sông phía TRÁI làng, nhờ Thần Sông mò giúp nha!';
          npcSay('chief', 'Rương báu nè! Mà chìa khóa... ở dưới sông. Hehe.', s);
        }
        break;
      case 'open':
        if (r.stage === 4 && r.chest && r.key) {
          r.chest = 0; r.key = 0; r.stage = 5; r.giftsOpened++;
          addExp(s, 50);
          sendProgress(s);
          send(s, { t: 'gift', name: 'Quà VIP bí mật', text: D.LINES.vip });
          npcSay('chief', D.LINES.vip, s);
          system(`🎉 ${r.name} vừa mở rương báu và nhận được QUÀ VIP!`);
          return;
        }
        break;
      case 'final':
        if (r.stage === 5) { r.stage = 6; text = 'Tốt lắm! Đến gần một bạn khác rồi nhấn P để mời tỷ thí, thắng 1 trận là tốt nghiệp. Không có ai online thì nói ta gọi Sư Phụ Gấu Trúc nhé!'; }
        break;
      case 'sensei':
        if (r.stage >= 6 && !s.duel) { send(s, { t: 'dialogClose' }); return callSensei(s, Date.now()); }
        break;
      case 'story':
        if (r.stage === 7) return send(s, { t: 'story', pages: storyFor(r) });
        break;
      case 'restart':
        if (r.stage === 7) { r.stage = 1; text = `Lại đi săn ${R} bông hoa hồng nào! Lần này ta giấu chìa khóa kỹ hơn... đùa thôi, vẫn ở dưới sông.`; }
        break;
      case 'joke':
        text = pick(D.LINES.jokes);
        npcSay('chief', text, s);
        break;
      case 'bye':
        npcSay('chief', pick(D.LINES.bye), s);
        return send(s, { t: 'dialogClose' });
      default: return;
    }
    sendProgress(s);
    send(s, chiefDialog(s, text));
  }

  // ---------- Thần Sông ----------
  function riverDialog(s, text) {
    const r = s.rec;
    const options = [];
    let def;
    if (r.stage < 2) def = 'Ùm ùm... ta là Thần Sông, hà mã già nhất dòng sông này. Giờ chưa có việc gì đâu, khi nào cần ta thì quay lại nha!';
    else if (r.stage === 2) {
      def = `Chìa khóa vàng hả? Ta có thấy dưới đáy sông... Nhưng ta đói quá, bọt bọt. Câu cho ta ${F} con cá, ta sẽ lặn xuống mò cho con!`;
      options.push({ id: 'accept', label: `Con sẽ câu ${F} con cá cho ngài!` });
    } else if (r.stage === 3) {
      if (r.fish >= F) { def = `Thơm quá! ${r.fish} con cá tươi rói. Cống nạp cho ta đi nào!`; options.push({ id: 'offer', label: `Cống nạp ${F} 🐟 cho Thần Sông` }); }
      else def = `Mới có ${r.fish}/${F} con cá thôi... Đứng ở bến, nhấn C để thả câu, thấy dấu ❗ thì nhấn C lần nữa để giật!`;
    } else def = 'Ta no căng bụng rồi, cảm ơn con. Mang chìa khóa về cho lão Rùa đi! Bọt bọt.';
    options.push({ id: 'bye', label: 'Tạm biệt Thần Sông' });
    return { t: 'dialog', npc: 'river', text: text || def, options };
  }

  function riverAction(s, action) {
    const r = s.rec;
    let text = null;
    switch (action) {
      case 'talk': break;
      case 'accept':
        if (r.stage === 2) { r.stage = 3; text = `Hay lắm! Đứng ở bến gỗ, nhấn C để thả câu. Phao chìm có dấu ❗ thì nhấn C giật lên. Câu đủ ${F} con rồi quay lại nha!`; }
        break;
      case 'offer':
        if (r.stage === 3 && r.fish >= F) {
          r.fish -= F; r.key = 1; r.stage = 4;
          text = 'Măm măm, ngon quá! Đợi ta chút... bọt bọt bọt... ĐÂY RỒI! Chìa khóa vàng của con. Mang về cho Trưởng làng mở rương nhé!';
          npcSay('river', 'Bọt bọt... Tìm thấy chìa khóa vàng rồi! 🗝️', s);
        }
        break;
      case 'bye':
        npcSay('river', pick(D.LINES.riverBye), s);
        return send(s, { t: 'dialogClose' });
      default: return;
    }
    sendProgress(s);
    send(s, riverDialog(s, text));
  }

  const nearChief = (s) => Math.abs(s.x - D.WORLD.chiefX) < 200;
  const nearRiver = (s) => s.x <= D.WORLD.dock.x2 + 60;

  function handleNpc(s, npc, action) {
    if (npc === 'river') {
      if (!nearRiver(s)) return send(s, { t: 'toast', text: 'Ra bờ sông (phía trái làng) để nói chuyện với Thần Sông nha!' });
      return riverAction(s, action);
    }
    if (!nearChief(s)) return send(s, { t: 'toast', text: 'Lại gần Trưởng làng để nói chuyện nha!' });
    chiefAction(s, action);
  }

  // ---------- Câu cá ----------
  function stopFishing(s) {
    if (!s.fishing) return;
    clearTimeout(s.fishing.timer);
    s.fishing = null;
  }
  function cast(s) {
    if (s.fishing) return;
    if (s.rec.stage !== 3) return send(s, { t: 'fish', state: 'cancel', text: s.rec.stage < 3 ? 'Chưa có nhiệm vụ câu cá! Gặp Thần Sông nhận nhiệm vụ trước đã nha.' : 'Thần Sông no rồi, không cần câu thêm đâu!' });
    if (!(s.x <= D.WORLD.dock.x2 + 20 && Math.abs(s.y - D.WORLD.groundY) < 5)) return send(s, { t: 'fish', state: 'cancel', text: 'Ra đứng trên bến gỗ ở bờ sông mới câu được nha!' });
    const f = { state: 'wait', x: s.x };
    s.fishing = f;
    send(s, { t: 'fish', state: 'wait' });
    f.timer = setTimeout(() => {
      f.state = 'bite';
      send(s, { t: 'fish', state: 'bite' });
      f.timer = setTimeout(() => {
        stopFishing(s);
        send(s, { t: 'fish', state: 'escape', text: 'Cá ăn mồi rồi chạy mất tiêu! Thả câu lại nào.' });
      }, biteWindow);
    }, rnd(biteMin, biteMax));
  }
  function reel(s) {
    const f = s.fishing;
    if (!f) return;
    stopFishing(s);
    if (f.state !== 'bite') return send(s, { t: 'fish', state: 'early', text: 'Giật sớm quá, cá sợ chạy mất rồi!' });
    let roll = random() * D.FISH.reduce((a, b) => a + b.w, 0);
    const fish = D.FISH.find((x) => (roll -= x.w) < 0) || D.FISH[0];
    if (!fish.trash) s.rec.fish++;
    send(s, { t: 'fish', state: 'caught', name: fish.name, trash: !!fish.trash });
    broadcast({ t: 'bubble', who: s.id, text: fish.trash ? `Câu được ${fish.name}... ai xả rác vậy trời!` : `Câu được ${fish.name}! Haha!` });
    addExp(s, 3);
    sendProgress(s);
  }

  // ---------- Đánh quái ----------
  function attack(s, k, now) {
    const sp = D.SPECIES[s.rec.species];
    const a = sp.attacks[k === 1 ? 1 : 0];
    k = k === 1 ? 1 : 0;
    if (now - (s.cd[k] || 0) < a.cd - 30) return;
    s.cd[k] = now;
    stopFishing(s);
    broadcast({ t: 'atk', id: s.id, k }, s);
    pkAttack(s, a, now);
    if (random() < 0.3) broadcast({ t: 'bubble', who: s.id, text: pick(random() < 0.5 ? D.LINES.cries : sp.cries) });
    const r = s.rec;
    const hits = [];
    for (const m of monsters) {
      if (m.dead) continue;
      const t = D.MONSTER_TYPES[m.type];
      const rel = (m.x - s.x) * s.dir;
      if (rel < -a.back - t.w / 2 - 10 || rel > a.front + t.w / 2 + 10) continue;
      if (Math.abs(D.WORLD.groundY - s.y) > 90 + t.h) continue;
      hits.push({ m, t, rel });
    }
    if (a.nearest) hits.splice(0, hits.length, ...hits.sort((x, y) => Math.abs(x.rel) - Math.abs(y.rel)).slice(0, 1));
    for (const { m, t, rel } of hits) {
      const crit = random() < 0.15;
      let dmg = Math.round((8 + r.level * 3 + rnd(0, 5)) * a.mul);
      if (crit) dmg *= 2;
      m.hp -= dmg;
      m.aggro = s.id; m.aggroUntil = now + 5000;
      const away = rel >= 0 ? s.dir : -s.dir;
      m.x += away * (t.boss ? 4 : 14 + (a.push || 0));
      broadcast({ t: 'hit', m: m.id, dmg, crit, by: s.id });
      if (m.hp <= 0) killMonster(s, m, t, now);
    }
  }

  function killMonster(s, m, t, now) {
    const r = s.rec;
    m.dead = true; m.hp = 0; m.respawnAt = now + t.respawn; m.aggro = null;
    broadcast({ t: 'mdie', m: m.id, by: s.id });
    if (random() < t.rose) {
      const n = t.roseCount || 1;
      for (let i = 0; i < n; i++) {
        const d = { id: nextDrop++, x: Math.round(m.x + (i - (n - 1) / 2) * 30), owner: s.id, born: now };
        drops.set(d.id, d);
        broadcast({ t: 'drop', d });
      }
    }
    if (t.boss) system(`👑 ${r.name} đã hạ gục ${t.name}! Thiệt là bá khí!`);
    addExp(s, t.exp);
    sendProgress(s);
  }

  function pickup(s, id, now) {
    const d = drops.get(id);
    if (!d) return;
    if (d.owner !== s.id && now - d.born < DROP_PRIVATE) return;
    if (Math.abs(s.x - d.x) > 70 || Math.abs(s.y - D.WORLD.groundY) > 90) return;
    drops.delete(id);
    s.rec.roses++;
    broadcast({ t: 'dropGone', id, by: s.id });
    if (s.rec.stage === 1 && s.rec.roses === R) send(s, { t: 'toast', text: `Đủ ${R} bông hoa hồng rồi! Về gặp Trưởng làng đổi rương báu nhé.` });
    sendProgress(s);
  }

  // ---------- Tỷ thí PK ----------
  // Mỗi trận có 2 đấu thủ: người chơi (khóa là id phiên) hoặc Sư Phụ Gấu Trúc (khóa 'npc<số>')
  const duels = new Map(); // id -> {id, keys:[a,b], hp:{}, state:'count'|'fight', goAt, endsAt}
  const senseis = new Map(); // khóa -> {key, x, dir, hp, nextAtk, windUntil, anim, duel}
  let nextDuel = 1, nextNpc = 1;
  const pkCountdown = timing.pkCountdown ?? D.PK.countdown;

  function fighter(key) {
    if (typeof key === 'string') { const n = senseis.get(key); return n && { key, x: n.x, y: D.WORLD.groundY, name: D.SENSEI.name, npc: n }; }
    const s = sessions.get(key);
    return s && s.joined && { key, x: s.x, y: s.y, name: s.rec.name, s };
  }
  function duelInfo(d) {
    return { id: d.id, keys: d.keys, names: d.keys.map((k) => fighter(k)?.name || '?'), hp: d.hp, state: d.state, endsIn: Math.max(0, d.endsAt - Date.now()) };
  }

  function startDuel(keyA, keyB, now) {
    const d = { id: nextDuel++, keys: [keyA, keyB], hp: { [keyA]: D.PK.hp, [keyB]: D.PK.hp }, state: 'count', goAt: now + pkCountdown, endsAt: now + pkCountdown + D.PK.duration };
    duels.set(d.id, d);
    for (const k of d.keys) { const f = fighter(k); if (f?.s) { f.s.duel = d.id; f.s.invite = null; stopFishing(f.s); } if (f?.npc) f.npc.duel = d.id; }
    broadcast({ t: 'pkStart', d: duelInfo(d) });
    const [a, b] = d.keys.map((k) => fighter(k).name);
    system(`⚔️ ${a} và ${b} bắt đầu tỷ thí PK! Mọi người ra cổ vũ nào!`);
    return d;
  }

  function endDuel(d, winnerKey, reason) {
    if (!duels.has(d.id)) return;
    duels.delete(d.id);
    const loserKey = winnerKey == null ? null : d.keys.find((k) => k !== winnerKey);
    const W = winnerKey == null ? null : fighter(winnerKey), L = loserKey == null ? null : fighter(loserKey);
    broadcast({ t: 'pkEnd', id: d.id, winner: winnerKey, loser: loserKey, reason, winnerName: W?.name, loserName: L?.name });
    for (const k of d.keys) { const f = fighter(k); if (f?.s) f.s.duel = null; }
    if (W && L) system(`🏆 ${W.name} đã thắng ${L.name} trong trận tỷ thí${reason === 'time' ? ' (hết giờ, nhiều máu hơn)' : reason === 'leave' ? ' (đối thủ bỏ chạy)' : ''}!`);
    else system('🤝 Trận tỷ thí hòa!');
    if (W?.s) {
      broadcast({ t: 'bubble', who: W.key, text: pick(D.LINES.pkWin) });
      const r = W.s.rec;
      r.pkWins = (r.pkWins || 0) + 1;
      if (r.stage === 6) {
        r.stage = 7; r.graduated = true;
        addExp(W.s, 100);
        system(`🎓 ${r.name} đã tốt nghiệp Khóa Học Trưởng Thành!`);
        send(W.s, { t: 'story', pages: storyFor(r) });
      }
      sendProgress(W.s);
    }
    if (L?.s) {
      broadcast({ t: 'bubble', who: L.key, text: pick(D.LINES.pkLose) });
      if (L.s.rec.stage === 6) npcSay('chief', 'Thua một trận chưa phải là hết đâu con. Tập luyện thêm rồi tỷ thí lại nha!', L.s);
    }
    for (const k of d.keys) {
      const n = senseis.get(k);
      if (!n) continue;
      broadcast({ t: 'bubble', who: k, text: k === winnerKey ? D.LINES.senseiWin : D.LINES.senseiLose });
      setTimeout(() => { senseis.delete(k); broadcast({ t: 'npcGone', key: k }); }, 2500);
    }
  }

  function storyFor(r) { return D.LINES.story.map((p) => ({ ...p, text: D.fill(p.text, { name: r.name }) })); }

  // Đòn đánh trúng đối thủ trong trận: dùng đúng tầm đánh của chiêu
  function pkHit(d, attackerKey, victimKey, base, mul, now, dir) {
    const crit = random() < 0.15;
    let dmg = Math.round(base * mul);
    if (crit) dmg *= 2;
    d.hp[victimKey] = Math.max(0, d.hp[victimKey] - dmg);
    broadcast({ t: 'pkHit', id: d.id, by: attackerKey, victim: victimKey, dmg, crit, dir, hp: d.hp });
    const n = senseis.get(victimKey);
    if (n) { n.x += dir * 18; if (random() < 0.25) broadcast({ t: 'bubble', who: victimKey, text: pick(D.LINES.senseiTaunt) }); }
    if (d.hp[victimKey] <= 0) endDuel(d, attackerKey, 'ko');
  }

  function pkAttack(s, a, now) {
    const d = s.duel && duels.get(s.duel);
    if (!d || d.state !== 'fight') return;
    const otherKey = d.keys.find((k) => k !== s.id);
    const o = fighter(otherKey);
    if (!o) return;
    const rel = (o.x - s.x) * s.dir;
    if (rel < -a.back - 25 || rel > a.front + 25 || Math.abs(o.y - s.y) > 80) return;
    const away = rel >= 0 ? s.dir : -s.dir;
    pkHit(d, s.id, otherKey, 6 + s.rec.level * 2 + rnd(0, 4), a.mul, now, away);
  }

  function invite(s, targetId, now) {
    const t = sessions.get(targetId);
    if (!t || !t.joined || t === s) return;
    if (s.duel) return send(s, { t: 'toast', text: 'Con đang tỷ thí rồi mà!' });
    if (t.duel) return send(s, { t: 'toast', text: `${t.rec.name} đang bận tỷ thí với người khác.` });
    if (Math.abs(t.x - s.x) > D.PK.inviteRange || Math.abs(t.y - s.y) > 120) return send(s, { t: 'toast', text: 'Lại gần bạn ấy hơn để mời tỷ thí nha!' });
    t.invite = { from: s.id, until: now + D.PK.inviteTimeout };
    send(t, { t: 'pkInvite', from: s.id, name: s.rec.name, species: D.SPECIES[s.rec.species].name });
    send(s, { t: 'toast', text: `Đã gửi lời mời tỷ thí tới ${t.rec.name}!` });
  }

  function answer(s, from, ok, now) {
    const inv = s.invite;
    s.invite = null;
    const o = sessions.get(from);
    if (!inv || inv.from !== from || now > inv.until || !o || !o.joined) return send(s, { t: 'toast', text: 'Lời mời đã hết hạn rồi.' });
    if (!ok) return send(o, { t: 'toast', text: `${s.rec.name} từ chối tỷ thí. Lần sau nha!` });
    if (s.duel || o.duel) return send(s, { t: 'toast', text: 'Một trong hai bạn đang bận tỷ thí.' });
    if (Math.abs(o.x - s.x) > D.PK.leaveRange) return send(s, { t: 'toast', text: 'Hai bạn đứng xa nhau quá rồi.' });
    startDuel(from, s.id, now);
  }

  function callSensei(s, now) {
    if (s.duel) return;
    const key = 'npc' + nextNpc++;
    const x = Math.max(D.WORLD.minX + 40, Math.min(D.WORLD.width - 40, s.x + 160));
    senseis.set(key, { key, x, dir: -1, hp: D.SENSEI.hp, nextAtk: now + pkCountdown + 800, windUntil: 0, anim: 'idle', duel: null });
    broadcast({ t: 'bubble', who: key, text: 'Hô hô! Ta là Sư Phụ Gấu Trúc. Đỡ chiêu đây!' });
    startDuel(s.id, key, now);
  }

  function tickDuels(now, dt) {
    for (const d of [...duels.values()]) {
      const fs2 = d.keys.map(fighter);
      if (fs2.some((f) => !f)) { endDuel(d, fs2[0] ? d.keys[0] : fs2[1] ? d.keys[1] : null, 'leave'); continue; }
      if (d.state === 'count' && now >= d.goAt) { d.state = 'fight'; broadcast({ t: 'pkGo', id: d.id }); }
      if (Math.abs(fs2[0].x - fs2[1].x) > D.PK.leaveRange) {
        // người chơi chạy xa là bỏ cuộc (gấu trúc luôn đuổi theo nên không tính)
        const runner = fs2[0].s ? 0 : 1;
        endDuel(d, d.keys[1 - runner], 'leave'); continue;
      }
      if (now >= d.endsAt) {
        const [a, b] = d.keys;
        endDuel(d, d.hp[a] === d.hp[b] ? null : d.hp[a] > d.hp[b] ? a : b, 'time');
      }
    }
    // AI Sư Phụ Gấu Trúc: đuổi theo, vung chưởng có báo trước
    for (const n of senseis.values()) {
      const d = duels.get(n.duel);
      if (!d) { n.anim = 'idle'; continue; }
      const foeKey = d.keys.find((k) => k !== n.key);
      const foe = fighter(foeKey);
      if (!foe) continue;
      const dx = foe.x - n.x;
      n.dir = dx > 0 ? 1 : -1;
      if (n.windUntil) {
        if (now >= n.windUntil) {
          n.windUntil = 0; n.anim = 'idle';
          if (d.state === 'fight' && Math.abs(foe.x - n.x) < D.SENSEI.range + 15 && Math.abs(foe.y - D.WORLD.groundY) < 80) pkHit(d, n.key, foeKey, rnd(D.SENSEI.dmgMin, D.SENSEI.dmgMax), 1, now, n.dir);
        }
        continue;
      }
      if (Math.abs(dx) > D.SENSEI.range - 15) { n.x += n.dir * D.SENSEI.speed * dt; n.anim = 'run'; }
      else n.anim = 'idle';
      if (d.state === 'fight' && Math.abs(dx) < D.SENSEI.range && now >= n.nextAtk) {
        n.windUntil = now + 350; n.anim = 'atk';
        n.nextAtk = now + D.SENSEI.atkEvery + random() * 500;
      }
    }
    for (const s of sessions.values()) if (s.invite && now > s.invite.until) s.invite = null;
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
      if (msg.species in D.SPECIES) rec.species = msg.species;
      if (!(rec.species in D.SPECIES)) rec.species = 'hamster';
      if (Number.isInteger(msg.skin)) rec.skin = msg.skin;
      rec.skin = Math.max(0, Math.min(D.SPECIES[rec.species].skins.length - 1, Number.isInteger(rec.skin) ? rec.skin : 0));
      Object.assign(s, { rec, joined: true, x: D.WORLD.spawnX, y: D.WORLD.groundY, dir: 1, anim: 'idle', hp: MAX_HP });
      send(s, {
        t: 'welcome', id: s.id, token, world: D.WORLD, monsterTypes: D.MONSTER_TYPES, species: D.SPECIES,
        players: [...sessions.values()].filter((o) => o.joined).map(publicInfo),
        monsters: monsters.map((m) => ({ id: m.id, type: m.type, x: m.x, dir: m.dir, hp: m.hp, maxHp: m.maxHp, dead: m.dead })),
        drops: [...drops.values()],
        duels: [...duels.values()].map(duelInfo),
      });
      broadcast({ t: 'pinfo', p: publicInfo(s) }, s);
      sendProgress(s);
      system(`${rec.name} (${D.SPECIES[rec.species].name}) đã vào làng. Mọi người vẫy tay chào đi nào! 👋`);
      setTimeout(() => npcSay('chief', D.fill(pick(D.LINES.greet), { name: rec.name }), s), 600);
      return;
    }
    switch (msg.t) {
      case 'state':
        if (typeof msg.x === 'number' && isFinite(msg.x)) s.x = Math.max(D.WORLD.minX - 10, Math.min(D.WORLD.width, msg.x));
        if (typeof msg.y === 'number' && isFinite(msg.y)) s.y = Math.max(-200, Math.min(D.WORLD.groundY, msg.y));
        s.dir = msg.dir === -1 ? -1 : 1;
        s.anim = ['idle', 'run', 'jump', 'atk0', 'atk1', 'hurt', 'dead', 'fish'].includes(msg.anim) ? msg.anim : 'idle';
        if (typeof msg.hp === 'number') s.hp = Math.max(0, Math.min(MAX_HP, msg.hp));
        if (s.fishing && Math.abs(s.x - s.fishing.x) > 30) { stopFishing(s); send(s, { t: 'fish', state: 'cancel' }); }
        break;
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 120);
        if (!text) return;
        broadcast({ t: 'chat', kind: 'player', id: s.id, name: s.rec.name, text });
        break;
      }
      case 'attack': attack(s, msg.k, now); break;
      case 'npc': handleNpc(s, msg.npc, msg.action); break;
      case 'pickup': pickup(s, msg.id, now); break;
      case 'pkInvite': invite(s, msg.id, now); break;
      case 'pkAnswer': answer(s, msg.from, !!msg.ok, now); break;
      case 'cast': if (!s.duel) cast(s); break;
      case 'reel': reel(s); break;
      case 'unfish': stopFishing(s); break;
      case 'died':
        stopFishing(s);
        npcSay('chief', pick(['Ối giời ơi, con ngã đau không? Lần sau nhớ né nha!', 'Ta đã bảo rồi, gặp quái phải biết... chạy!', 'Về đây ta thổi phù phù cho hết đau nè!']), s);
        break;
    }
  }

  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); return res.end(); }
    const pub = path.join(__dirname, 'public');
    let file;
    if (urlPath === '/game-data.js') file = path.join(__dirname, 'game-data.js'); // dữ liệu dùng chung với trình duyệt
    else {
      file = path.normalize(path.join(pub, urlPath === '/' ? 'index.html' : urlPath));
      if (file !== pub && !file.startsWith(pub + path.sep)) { res.writeHead(403); return res.end(); }
    }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    const s = { id: nextId++, ws, joined: false, cd: {}, fishing: null, duel: null, invite: null };
    sessions.set(s.id, s);
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg && typeof msg.t === 'string') handle(s, msg, Date.now());
    });
    ws.on('close', () => {
      sessions.delete(s.id);
      stopFishing(s);
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
    tickDuels(now, (now - last) / 1000);
    last = now;
    if (now > idleAt) {
      idleAt = now + 15000 + random() * 15000;
      if (sessions.size) random() < 0.6 ? npcSay('chief', pick(D.LINES.idle)) : npcSay('river', pick(D.LINES.riverIdle));
    }
    for (const d of drops.values()) if (now - d.born > DROP_LIFE) { drops.delete(d.id); broadcast({ t: 'dropGone', id: d.id }); }
    broadcast({
      t: 'snap',
      p: [...sessions.values()].filter((s) => s.joined).map((s) => [s.id, Math.round(s.x), Math.round(s.y), s.dir, s.anim, s.hp]),
      m: monsters.map((m) => [m.id, Math.round(m.x), m.dir, m.hp, m.dead ? 1 : 0]),
      k: [...senseis.values()].map((n) => [n.key, Math.round(n.x), n.dir, n.anim]),
    });
  }, TICK_MS);

  return {
    server, monsters, records, drops, duels, senseis,
    listen(cb) { server.listen(port, host, () => cb && cb(server.address().port)); },
    close(cb) {
      clearInterval(loop);
      for (const s of sessions.values()) stopFishing(s);
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
    console.log(`🐹 Làng Thú Ngộ Nghĩnh đang chạy ở cổng ${p}`);
    console.log(`   Máy này:      http://localhost:${p}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`   Mạng LAN:     http://${a.address}:${p}`);
    }
  });
}

module.exports = { createGame };
