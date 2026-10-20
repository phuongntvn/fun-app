// Kiểm thử toàn bộ hành trình với 2 người chơi qua WebSocket thật.
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { createGame } = require('../server');
const D = require('../game-data');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G = D.WORLD.groundY;

class Client {
  constructor(port) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    this.msgs = [];
    this.waiters = [];
    this.monsters = new Map();
    this.drops = new Map();
    this.senseis = new Map();
    this.ws.on('message', (d) => {
      const m = JSON.parse(d);
      if (m.t === 'snap') for (const [id, x, , hp, dead] of m.m) this.monsters.set(id, { ...this.monsters.get(id), id, x, hp, dead });
      if (m.t === 'welcome') { this.id = m.id; for (const mo of m.monsters) this.monsters.set(mo.id, mo); }
      if (m.t === 'drop') this.drops.set(m.d.id, m.d);
      if (m.t === 'dropGone') this.drops.delete(m.id);
      if (m.t === 'progress') this.progress = m.p;
      if (m.t === 'snap' && m.k) for (const [key, x] of m.k) this.senseis.set(key, x);
      this.msgs.push(m);
      this.waiters = this.waiters.filter((w) => !(w.pred(m) && (w.resolve(m), true)));
    });
  }
  open() { return new Promise((r) => this.ws.on('open', r)); }
  send(m) { this.ws.send(JSON.stringify(m)); }
  wait(pred, ms = 3000) {
    const found = this.msgs.find(pred);
    if (found) { this.msgs.splice(this.msgs.indexOf(found), 1); return Promise.resolve(found); }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve: (m) => { clearTimeout(timer); this.msgs.splice(this.msgs.indexOf(m), 1); resolve(m); } };
      const timer = setTimeout(() => reject(new Error('Hết thời gian chờ tin nhắn')), ms);
      this.waiters.push(w);
    });
  }
  clear(t) { this.msgs = this.msgs.filter((m) => m.t !== t); }
  moveTo(x, y = G, dir = 1) { this.send({ t: 'state', x, y, dir, anim: 'idle', hp: 100 }); }
  async npc(npc, action) {
    this.clear('dialog');
    this.moveTo(npc === 'river' ? D.WORLD.dock.x1 + 80 : D.WORLD.chiefX);
    await sleep(20);
    this.send({ t: 'npc', npc, action });
    if (action !== 'bye') return this.wait((m) => m.t === 'dialog');
  }
  // Đánh cho tới khi giết được 1 con quái loại `type`
  async killOne(type, k = 0) {
    for (let tries = 0; tries < 80; tries++) {
      const ids = D.MONSTER_SPAWNS.map(([t], i) => (t === type ? i + 1 : 0)).filter(Boolean);
      const target = ids.map((id) => this.monsters.get(id)).find((m) => m && !m.dead);
      if (!target) { await sleep(200); continue; }
      this.moveTo(target.x - 30, G, 1);
      await sleep(20);
      this.send({ t: 'attack', k });
      try {
        await this.wait((m) => m.t === 'mdie' && m.m === target.id && m.by === this.id, 450);
        await sleep(30);
        return target;
      } catch { /* chưa chết, đánh tiếp */ }
    }
    throw new Error('Không giết được ' + type);
  }
  async pickAll() {
    for (const d of [...this.drops.values()]) {
      if (d.owner !== this.id) continue;
      this.moveTo(d.x); await sleep(15);
      this.send({ t: 'pickup', id: d.id });
      await this.wait((m) => m.t === 'dropGone' && m.id === d.id);
    }
    await sleep(30);
  }
}

test('hành trình đầy đủ: hoa hồng → rương → Thần Sông → câu cá → chìa khóa → quà VIP', { timeout: 120000 }, async () => {
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tv-')), 'players.json');
  // random cố định: quái luôn rơi hoa hồng, luôn chí mạng, câu được cá xịn đầu bảng
  const game = createGame({ dataFile, port: 0, host: '127.0.0.1', random: () => 0.01, timing: { biteMin: 30, biteMax: 30, biteWindow: 300, pkCountdown: 50 } });
  const port = await new Promise((r) => game.listen(r));
  const a = new Client(port), b = new Client(port);
  await Promise.all([a.open(), b.open()]);
  try {
    a.send({ t: 'join', token: 'tokenAAAA1', name: 'Sấu Hồng', species: 'croc', skin: 2 });
    await a.wait((m) => m.t === 'welcome');
    b.send({ t: 'join', token: 'tokenBBBB2', name: 'Vịt Bụi', species: 'khunglong', skin: 99 });
    const wb = await b.wait((m) => m.t === 'welcome');
    assert.strictEqual(wb.players.length, 2, 'B thấy cả A');
    assert.ok(wb.species.croc.attacks.length === 2, 'client nhận danh sách loài');
    const infoB = await a.wait((m) => m.t === 'pinfo' && m.p.name === 'Vịt Bụi');
    assert.strictEqual(infoB.p.species, 'hamster', 'loài không hợp lệ dùng mặc định');
    assert.strictEqual(infoB.p.skin, 2, 'skin bị kẹp về hợp lệ');
    assert.strictEqual(wb.players.find((p) => p.name === 'Sấu Hồng').species, 'croc');

    const greet = await a.wait((m) => m.t === 'bubble' && m.who === 'chief');
    assert.match(greet.text, /Sấu Hồng/);

    // Chat giữa hai người chơi
    a.send({ t: 'chat', text: 'Chào Vịt Bụi nha!' });
    const chat = await b.wait((m) => m.t === 'chat' && m.kind === 'player');
    assert.strictEqual(chat.name, 'Sấu Hồng');

    // Chưa có nhiệm vụ câu cá thì không câu được, kể cả khi đứng ở bến
    a.moveTo(D.WORLD.dock.x1 + 80, G, -1); await sleep(20);
    a.send({ t: 'cast' });
    const noFish = await a.wait((m) => m.t === 'fish');
    assert.strictEqual(noFish.state, 'cancel');
    assert.match(noFish.text, /Chưa có nhiệm vụ câu cá/);

    // Bước 1: nhận nhiệm vụ săn hoa hồng
    let dlg = await a.npc('chief', 'talk');
    assert.match(dlg.text, /10 bông hoa hồng/);
    await a.npc('chief', 'accept');
    assert.strictEqual(a.progress.stage, 1);

    // Chưa đủ hoa thì chưa có nút đổi rương
    dlg = await a.npc('chief', 'talk');
    assert.ok(!dlg.options.some((o) => o.id === 'chest'));

    // Đánh quái bằng cả 2 chiêu, hoa hồng rơi xuống đất, người khác không nhặt được ngay
    await a.killOne('snail', 1); // quật đuôi
    assert.ok(a.drops.size >= 1, 'quái rơi hoa hồng');
    const firstDrop = [...a.drops.values()][0];
    b.moveTo(firstDrop.x); await sleep(20);
    b.send({ t: 'pickup', id: firstDrop.id }); await sleep(60);
    assert.ok(a.drops.has(firstDrop.id), 'hoa của A, B không nhặt được');
    b.moveTo(D.WORLD.spawnX);
    // Ở xa thì không nhặt được
    a.moveTo(firstDrop.x + 400); await sleep(20);
    a.send({ t: 'pickup', id: firstDrop.id }); await sleep(60);
    assert.ok(a.drops.has(firstDrop.id), 'ở xa không nhặt được');
    const dropped = a.drops.size;
    await a.pickAll();
    assert.strictEqual(a.progress.roses, dropped, 'nhặt hết hoa đã rơi vào hành trang');
    while (a.progress.roses < D.ROSES_FOR_CHEST) {
      await a.killOne(a.progress.roses % 2 ? 'mushroom' : 'snail');
      await a.pickAll();
    }

    // Đổi 10 hoa hồng lấy rương báu -> bước 2
    dlg = await a.npc('chief', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'chest'));
    const roses = a.progress.roses;
    dlg = await a.npc('chief', 'chest');
    assert.match(dlg.text, /lòng sông/);
    assert.strictEqual(a.progress.chest, 1);
    assert.strictEqual(a.progress.roses, roses - D.ROSES_FOR_CHEST);
    assert.strictEqual(a.progress.stage, 2);

    // Thần Sông chỉ nói chuyện được khi ở bờ sông
    a.moveTo(D.WORLD.chiefX); await sleep(20);
    a.clear('toast');
    a.send({ t: 'npc', npc: 'river', action: 'talk' });
    assert.match((await a.wait((m) => m.t === 'toast')).text, /bờ sông/);
    dlg = await a.npc('river', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'accept'));
    await a.npc('river', 'accept');
    assert.strictEqual(a.progress.stage, 3);

    // Câu cá: không ở bến thì không câu được
    a.moveTo(D.WORLD.chiefX); await sleep(20);
    a.clear('fish');
    a.send({ t: 'cast' });
    assert.strictEqual((await a.wait((m) => m.t === 'fish')).state, 'cancel');
    // Giật sớm thì cá chạy
    a.moveTo(D.WORLD.dock.x1 + 80, G, -1); await sleep(20);
    a.send({ t: 'cast' }); await a.wait((m) => m.t === 'fish' && m.state === 'wait');
    a.send({ t: 'reel' });
    assert.strictEqual((await a.wait((m) => m.t === 'fish' && m.state !== 'wait')).state, 'early');
    // Không giật thì cá ăn mồi rồi chạy
    a.send({ t: 'cast' }); await a.wait((m) => m.t === 'fish' && m.state === 'bite');
    assert.strictEqual((await a.wait((m) => m.t === 'fish' && m.state === 'escape', 1000)).state, 'escape');
    // Câu đủ 10 con
    while (a.progress.fish < D.FISH_FOR_KEY) {
      a.send({ t: 'cast' });
      await a.wait((m) => m.t === 'fish' && m.state === 'bite');
      a.send({ t: 'reel' });
      const c = await a.wait((m) => m.t === 'fish' && m.state === 'caught');
      assert.strictEqual(c.name, 'Cá Rô Mập');
      await a.wait((m) => m.t === 'progress');
    }

    // Cống nạp cá -> nhận chìa khóa -> bước 4
    dlg = await a.npc('river', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'offer'));
    await a.npc('river', 'offer');
    assert.strictEqual(a.progress.key, 1);
    assert.strictEqual(a.progress.fish, 0);
    assert.strictEqual(a.progress.stage, 4);

    // B chưa có rương thì không mở được
    await b.npc('chief', 'open');
    assert.strictEqual(b.progress.giftsOpened, 0);

    // Về làng, Trưởng làng mở rương -> quà VIP
    dlg = await a.npc('chief', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'open'));
    a.clear('gift');
    a.send({ t: 'npc', npc: 'chief', action: 'open' });
    const gift = await a.wait((m) => m.t === 'gift');
    assert.match(gift.text, /món quà VIP nhất/);
    assert.ok(!/hub|HDMI/i.test(JSON.stringify(gift)), 'không còn nhắc tới hub');
    const ann = await b.wait((m) => m.t === 'chat' && m.kind === 'system' && /QUÀ VIP/.test(m.text));
    assert.match(ann.text, /Sấu Hồng/);
    await sleep(50);
    assert.deepStrictEqual([a.progress.chest, a.progress.key, a.progress.stage, a.progress.giftsOpened], [0, 0, 5, 1]);

    // Nhiệm vụ cuối cùng: tỷ thí PK
    dlg = await a.npc('chief', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'final'));
    await a.npc('chief', 'final');
    assert.strictEqual(a.progress.stage, 6);
    assert.strictEqual(a.progress.stageCount, 8);

    // Ở xa thì không mời được
    a.moveTo(1300, G, 1); b.moveTo(1900, G, -1); await sleep(30);
    a.clear('toast');
    a.send({ t: 'pkInvite', id: b.id });
    assert.match((await a.wait((m) => m.t === 'toast')).text, /Lại gần/);
    // B từ chối
    b.moveTo(1340, G, -1); await sleep(30);
    a.send({ t: 'pkInvite', id: b.id });
    const inv = await b.wait((m) => m.t === 'pkInvite');
    assert.strictEqual(inv.name, 'Sấu Hồng');
    a.clear('toast');
    b.send({ t: 'pkAnswer', from: a.id, ok: false });
    await a.wait((m) => m.t === 'toast' && /từ chối/.test(m.text));
    // B đồng ý -> đếm ngược -> đánh
    a.send({ t: 'pkInvite', id: b.id });
    await b.wait((m) => m.t === 'pkInvite');
    b.send({ t: 'pkAnswer', from: a.id, ok: true });
    const start = await a.wait((m) => m.t === 'pkStart');
    assert.deepStrictEqual(start.d.keys, [a.id, b.id]);
    assert.deepStrictEqual(start.d.names, ['Sấu Hồng', 'Vịt Bụi']);
    // Trong lúc đếm ngược đánh không mất máu
    a.send({ t: 'attack', k: 0 });
    await a.wait((m) => m.t === 'pkGo');
    assert.ok(!a.msgs.some((m) => m.t === 'pkHit'), 'đếm ngược chưa được đánh');
    // Đang tỷ thí thì không mời người khác được
    b.clear('toast');
    b.send({ t: 'pkInvite', id: a.id });
    assert.match((await b.wait((m) => m.t === 'toast')).text, /đang tỷ thí/);
    let end = null;
    for (let i = 0; i < 20 && !end; i++) {
      a.moveTo(1300, G, 1); await sleep(20);
      a.send({ t: 'attack', k: 0 });
      await sleep(450);
      end = a.msgs.find((m) => m.t === 'pkEnd');
    }
    assert.ok(end, 'trận đấu kết thúc');
    const hit = a.msgs.find((m) => m.t === 'pkHit');
    assert.strictEqual(hit.victim, b.id);
    assert.strictEqual(end.winner, a.id);
    assert.strictEqual(end.reason, 'ko');
    const story = await a.wait((m) => m.t === 'story');
    assert.strictEqual(story.pages.length, 5);
    assert.match(story.pages[0].text, /Sấu Hồng/);
    assert.match(story.pages[4].text, /phần 2/);
    await sleep(30);
    assert.strictEqual(a.progress.stage, 7);
    assert.ok(a.progress.graduated);
    await b.wait((m) => m.t === 'chat' && m.kind === 'system' && /tốt nghiệp/.test(m.text));
    // Thua thì không tốt nghiệp
    assert.notStrictEqual(b.progress.stage, 7);

    // Xem lại câu chuyện, rồi đi lại hành trình
    a.clear('story');
    a.moveTo(D.WORLD.chiefX); await sleep(20);
    a.send({ t: 'npc', npc: 'chief', action: 'story' });
    await a.wait((m) => m.t === 'story');
    await a.npc('chief', 'restart');
    assert.strictEqual(a.progress.stage, 1);
    assert.ok(a.progress.graduated, 'vẫn giữ danh hiệu tốt nghiệp');

    // Câu nói "bá khí" hoặc câu riêng của loài khi đánh
    a.clear('bubble');
    await b.killOne('snail');
    const cry = await a.wait((m) => m.t === 'bubble' && m.who === b.id);
    assert.ok([...D.LINES.cries, ...D.SPECIES.hamster.cries].includes(cry.text));

    // Cùng token đang online thì bị từ chối
    const c = new Client(port); await c.open();
    c.send({ t: 'join', token: 'tokenAAAA1', name: 'Fake' });
    await c.wait((m) => m.t === 'inuse');
    c.ws.close();

    b.ws.close();
    await a.wait((m) => m.t === 'leave' && m.id === b.id);
  } finally {
    a.ws.close();
    await new Promise((r) => game.close(r));
  }
  await sleep(700);
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.strictEqual(saved.tokenAAAA1.giftsOpened, 1);
  assert.strictEqual(saved.tokenAAAA1.species, 'croc');
});

// tạo game với random cố định và 1 người chơi có sẵn tiến độ
async function soloGame(randomValue, rec, timing = {}) {
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tv-')), 'players.json');
  fs.writeFileSync(dataFile, JSON.stringify({ tokenSOLO02: { token: 'tokenSOLO02', name: 'Mỏ', species: 'croc', skin: 0, level: 1, exp: 0, roses: 0, fish: 0, chest: 0, key: 0, giftsOpened: 0, stage: 1, ...rec } }));
  const game = createGame({ dataFile, port: 0, host: '127.0.0.1', random: () => randomValue, timing: { biteMin: 20, biteMax: 20, biteWindow: 400, noBiteMs: 60, ...timing } });
  const port = await new Promise((r) => game.listen(r));
  const a = new Client(port); await a.open();
  a.send({ t: 'join', token: 'tokenSOLO02', name: 'Mỏ' });
  await a.wait((m) => m.t === 'welcome');
  return { game, a, close: async () => { a.ws.close(); await new Promise((r) => game.close(r)); } };
}

test('câu cá ngẫu nhiên: lúc ra cá, lúc trúng rác, lúc hụt, lúc không có cá cắn câu', async () => {
  // giá trị random cố định quyết định kết quả: 0.01 cá, 0.7 rác, 0.86 hụt, 0.95 không cắn câu
  const expect = { 0.01: 'caught', 0.7: 'trash', 0.86: 'miss', 0.95: 'nothing' };
  const spots = new Set();
  for (const [rv, state] of Object.entries(expect)) {
    const { a, close } = await soloGame(Number(rv), { stage: 3 });
    try {
      a.moveTo(D.WORLD.dock.x1 + 80, G, -1); await sleep(20);
      a.send({ t: 'cast' });
      const w = await a.wait((m) => m.t === 'fish' && m.state === 'wait');
      assert.ok(w.bx < D.WORLD.waterEnd && w.bx > D.WORLD.waterEnd - 25 - D.FISHING.castRange - 1, 'phao rơi trên mặt sông: ' + w.bx);
      spots.add(w.bx);
      if (state !== 'nothing') { await a.wait((m) => m.t === 'fish' && m.state === 'bite'); a.send({ t: 'reel' }); }
      const res = await a.wait((m) => m.t === 'fish' && m.state !== 'wait' && m.state !== 'bite');
      assert.strictEqual(res.state, state, `random ${rv}`);
      if (state === 'trash') assert.ok(D.TRASH.includes(res.name));
      await sleep(30);
      assert.strictEqual(a.progress.fish, state === 'caught' ? 1 : 0, 'chỉ cá thật mới được tính');
    } finally { await close(); }
  }
  assert.ok(spots.size >= 3, 'phao rơi ở nhiều chỗ khác nhau');
});

test('quái trâu: tự phát hiện, nói chuyện, Trâu Mộng lấy đà húc; đối thoại với Heo Rừng Đại Ca', async () => {
  const { game, a, close } = await soloGame(0.01, { stage: 1 });
  try {
    const bull = game.monsters.find((m) => m.type === 'bull');
    for (const m of game.monsters) if (m !== bull && m.type !== 'boar') m.dead = true, m.respawnAt = Infinity;
    bull.x = 3300;
    a.moveTo(3200, G, 1);
    const talk = await a.wait((m) => m.t === 'bubble' && m.who === 'm' + bull.id);
    assert.ok(D.MONSTER_TYPES.bull.lines.includes(talk.text));
    await a.wait((m) => m.t === 'snap' && m.m.some((x) => x[0] === bull.id && x[5] === 1), 2000);
    // Lần đầu vào hang: Heo Rừng đứng lại đối thoại
    bull.dead = true; bull.respawnAt = Infinity;
    const boar = game.monsters.find((m) => m.type === 'boar');
    a.moveTo(3460, G, 1);
    const sc = await a.wait((m) => m.t === 'scene');
    assert.strictEqual(sc.lines.length, D.BOAR_SCENE.intro.length);
    assert.strictEqual(sc.lines[0].who, 'm' + boar.id);
    assert.strictEqual(sc.lines[1].who, a.id);
    assert.match(sc.lines[1].text, /Mỏ/);
    assert.ok(boar.calmUntil > Date.now(), 'heo đứng yên trong lúc nói');
    a.moveTo(3470, G, 1); await sleep(120);
    assert.ok(!a.msgs.some((m) => m.t === 'scene'), 'chỉ đối thoại lần đầu');
    // Hạ Heo Rừng: lời trăng trối nhắc tới Vua Mèo Mun
    boar.hp = 5; boar.x = 3500; boar.calmUntil = 0;
    a.moveTo(3470, G, 1); await sleep(20);
    a.send({ t: 'attack', k: 0 });
    const end = await a.wait((m) => m.t === 'scene');
    assert.match(end.lines[0].text, /Vua Mèo Mun/);
    assert.strictEqual(game.records.tokenSOLO02.boarMet, true);
  } finally { await close(); }
});

test('Sư Phụ Gấu Trúc chỉ để luyện tập, thắng không được tốt nghiệp', { timeout: 60000 }, async () => {
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tv-')), 'players.json');
  fs.writeFileSync(dataFile, JSON.stringify({ tokenSOLO01: { token: 'tokenSOLO01', name: 'Chuột', species: 'hamster', skin: 0, level: 1, exp: 0, roses: 0, fish: 0, chest: 0, key: 0, giftsOpened: 1, stage: 6 } }));
  const game = createGame({ dataFile, port: 0, host: '127.0.0.1', random: () => 0.01, timing: { pkCountdown: 50 } });
  const port = await new Promise((r) => game.listen(r));
  const a = new Client(port); await a.open();
  try {
    a.send({ t: 'join', token: 'tokenSOLO01', name: 'Chuột' });
    await a.wait((m) => m.t === 'welcome');
    for (const m of game.monsters) m.dead = true, m.respawnAt = Infinity;
    const dlg = await a.npc('chief', 'talk');
    assert.ok(dlg.options.some((o) => o.id === 'sensei'));
    a.send({ t: 'npc', npc: 'chief', action: 'sensei' });
    const start = await a.wait((m) => m.t === 'pkStart');
    const npcKey = start.d.keys[1];
    assert.match(npcKey, /^npc/);
    assert.strictEqual(start.d.names[1], 'Sư Phụ Gấu Trúc');
    await a.wait((m) => m.t === 'pkGo');
    let end = null;
    for (let i = 0; i < 40 && !end; i++) {
      const nx = a.senseis.get(npcKey);
      if (nx != null) a.moveTo(nx - 40, G, 1);
      await sleep(20);
      a.send({ t: 'attack', k: 0 });
      await sleep(360);
      end = a.msgs.find((m) => m.t === 'pkEnd');
    }
    assert.ok(end, 'trận đấu kết thúc');
    assert.ok(a.msgs.some((m) => m.t === 'pkHit' && m.by === npcKey), 'gấu trúc có đánh trả');
    assert.strictEqual(end.winner, a.id);
    await a.wait((m) => m.t === 'toast' && /người chơi khác/.test(m.text));
    await a.wait((m) => m.t === 'npcGone' && m.key === npcKey, 4000);
    assert.ok(!a.msgs.some((m) => m.t === 'story'), 'không có câu chuyện tốt nghiệp');
    assert.strictEqual(a.progress.stage, 6, 'vẫn ở nhiệm vụ tỷ thí');
    assert.ok(!a.progress.graduated);
    assert.strictEqual(game.senseis.size, 0);
  } finally {
    a.ws.close();
    await new Promise((r) => game.close(r));
  }
});

test('tầm đánh theo loài: quật đuôi trúng quái phía sau, cắn thì không', async () => {
  const game = createGame({ dataFile: path.join(os.tmpdir(), 'tv-unused2.json'), port: 0, host: '127.0.0.1', random: () => 0.99 });
  const port = await new Promise((r) => game.listen(r));
  const a = new Client(port); await a.open();
  try {
    a.send({ t: 'join', token: 'tokenCROC01', name: 'Sấu', species: 'croc' });
    await a.wait((m) => m.t === 'welcome');
    const snail = game.monsters.find((m) => m.type === 'snail');
    for (const m of game.monsters) if (m !== snail) m.dead = true, m.respawnAt = Infinity;
    snail.x = 2000; snail.minX = 1990; snail.maxX = 2010;
    // quái ở phía sau 70px (người chơi quay mặt sang phải)
    a.moveTo(2070, G, 1); await sleep(30);
    a.send({ t: 'attack', k: 0 });
    await assert.rejects(a.wait((m) => m.t === 'hit', 300));
    a.send({ t: 'attack', k: 1 });
    await a.wait((m) => m.t === 'hit' && m.m === snail.id);
  } finally {
    a.ws.close();
    await new Promise((r) => game.close(r));
  }
});

test('phục vụ file tĩnh và chặn path traversal', async () => {
  const game = createGame({ dataFile: path.join(os.tmpdir(), 'tv-unused.json'), port: 0, host: '127.0.0.1' });
  const port = await new Promise((r) => game.listen(r));
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.strictEqual(home.status, 200);
    assert.match(await home.text(), /Làng Thú Ngộ Nghĩnh/);
    const data = await fetch(`http://127.0.0.1:${port}/game-data.js`);
    assert.strictEqual(data.status, 200);
    assert.match(await data.text(), /window\.GAME_DATA/);
    const bad = await fetch(`http://127.0.0.1:${port}/..%2fserver.js`);
    assert.notStrictEqual(bad.status, 200);
  } finally {
    await new Promise((r) => game.close(r));
  }
});
