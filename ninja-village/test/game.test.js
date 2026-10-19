// Kiểm thử luồng chơi đầy đủ với 2 người chơi qua WebSocket thật.
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { createGame } = require('../server');
const D = require('../game-data');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  constructor(port) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    this.msgs = [];
    this.waiters = [];
    this.monsters = new Map();
    this.ws.on('message', (d) => {
      const m = JSON.parse(d);
      if (m.t === 'snap') for (const [id, x, , hp, dead] of m.m) this.monsters.set(id, { ...this.monsters.get(id), id, x, hp, dead });
      if (m.t === 'welcome') { this.id = m.id; for (const mo of m.monsters) this.monsters.set(mo.id, mo); }
      if (m.t === 'progress') this.progress = m.p;
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
  moveTo(x, y = D.WORLD.groundY, dir = 1) { this.send({ t: 'state', x, y, dir, anim: 'idle', hp: 100 }); }
  async npc(action) {
    this.msgs = this.msgs.filter((m) => m.t !== 'dialog');
    this.moveTo(D.WORLD.chiefX);
    await sleep(20);
    this.send({ t: 'npc', action });
    if (action !== 'bye') return this.wait((m) => m.t === 'dialog');
  }
  // Đánh cho tới khi giết được 1 con quái loại `type`
  async killOne(type) {
    for (let tries = 0; tries < 80; tries++) {
      const ids = D.MONSTER_SPAWNS.map(([t], i) => (t === type ? i + 1 : 0)).filter(Boolean);
      const target = ids.map((id) => this.monsters.get(id)).find((m) => m && !m.dead);
      if (!target) { await sleep(200); continue; }
      this.moveTo(target.x - 30, D.WORLD.groundY, 1);
      await sleep(20);
      this.send({ t: 'attack' });
      try {
        await this.wait((m) => m.t === 'mdie' && m.m === target.id && m.by === this.id, 340);
        await sleep(30);
        return;
      } catch { /* chưa chết, đánh tiếp */ }
    }
    throw new Error('Không giết được ' + type);
  }
}

test('hai người chơi: chat, nhiệm vụ, hoa hồng, rương báu và quà VIP', { timeout: 120000 }, async () => {
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nv-')), 'players.json');
  // random cố định: luôn rơi hoa hồng, luôn chí mạng, luôn hô "bá khí"
  const game = createGame({ dataFile, port: 0, host: '127.0.0.1', random: () => 0.01 });
  const port = await new Promise((r) => game.listen(r));
  const a = new Client(port), b = new Client(port);
  await Promise.all([a.open(), b.open()]);
  try {
    a.send({ t: 'join', token: 'tokenAAAA1', name: 'Na', look: { hair: 1, outfit: 2, hairColor: '#ff8fb1', outfitColor: '#2fbf71', bandColor: '#ffffff', skin: '#ffe0c7' } });
    await a.wait((m) => m.t === 'welcome');
    b.send({ t: 'join', token: 'tokenBBBB2', name: 'Bin', look: { hair: 9, outfit: 0, hairColor: 'red' } });
    const wb = await b.wait((m) => m.t === 'welcome');
    assert.strictEqual(wb.players.length, 2, 'người chơi B thấy cả A');
    const info = await a.wait((m) => m.t === 'pinfo' && m.p.name === 'Bin');
    assert.strictEqual(info.p.look.hair, 5, 'giá trị tóc bị kẹp về hợp lệ');
    assert.strictEqual(info.p.look.hairColor, '#3b2a20', 'màu không hợp lệ dùng mặc định');

    // Trưởng làng chào hỏi bằng bong bóng chat
    const greet = await a.wait((m) => m.t === 'bubble' && m.who === 'chief');
    assert.match(greet.text, /Na/);

    // Hai người chat với nhau
    a.send({ t: 'chat', text: 'Chào Bin nha!' });
    const chat = await b.wait((m) => m.t === 'chat' && m.kind === 'player');
    assert.strictEqual(chat.name, 'Na');
    assert.strictEqual(chat.text, 'Chào Bin nha!');

    // Thấy vị trí của nhau qua snapshot
    a.moveTo(777);
    await b.wait((m) => m.t === 'snap' && m.p.some(([id, x]) => id === a.id && x === 777));

    // Ở xa thì không nói chuyện được với Trưởng làng
    a.moveTo(2000); await sleep(20);
    a.send({ t: 'npc', action: 'talk' });
    assert.match((await a.wait((m) => m.t === 'toast')).text, /Lại gần/);

    // Làm 4 nhiệm vụ
    for (const q of D.QUESTS) {
      let dlg = await a.npc('talk');
      assert.ok(dlg.options.some((o) => o.id === 'accept'), 'có nhiệm vụ để nhận: ' + q.id);
      await a.npc('accept');
      assert.strictEqual(a.progress.quest.id, q.id);
      if (q.type === 'kill') {
        for (let i = 0; i < q.count; i++) await a.killOne(q.target);
      } else {
        assert.strictEqual(a.progress.buns.length, 3);
        for (const bun of D.BUNS) {
          a.moveTo(bun.x, bun.y); await sleep(20);
          a.send({ t: 'pickup', id: bun.id });
          await a.wait((m) => m.t === 'progress' && !m.p.buns.some((x) => x.id === bun.id));
        }
      }
      await sleep(50);
      assert.strictEqual(a.progress.quest.progress, q.count, 'đủ tiến độ ' + q.id);
      const before = a.progress.bouquets;
      dlg = await a.npc('talk');
      assert.ok(dlg.options.some((o) => o.id === 'turnin'));
      await a.npc('turnin');
      assert.strictEqual(a.progress.bouquets, before + 1, 'trả nhiệm vụ được 1 bó hoa');
    }
    const done = await a.npc('talk');
    assert.ok(!done.options.some((o) => o.id === 'accept'), 'hết nhiệm vụ');

    // Đánh quái nhận hoa hồng; đổi hoa hồng lấy bó hoa
    assert.ok(a.progress.roses >= 5, 'đã có hoa hồng từ đánh quái: ' + a.progress.roses);
    const p0 = a.progress;
    await a.npc('exchange');
    assert.strictEqual(a.progress.roses, p0.roses - 5);
    assert.strictEqual(a.progress.bouquets, p0.bouquets + 1);

    // Hô "bá khí" khi đánh quái
    await b.killOne('snail');
    const cry = await a.wait((m) => m.t === 'bubble' && m.who === b.id);
    assert.ok(D.LINES.cries.includes(cry.text));

    // B chưa đủ bó hoa thì không đổi được rương
    const bd = await b.npc('chest');
    assert.match(bd.text, /cần 3 bó/);
    assert.strictEqual(b.progress.chests, 0);

    // A đổi 3 bó hoa lấy rương báu rồi mở ra nhận quà VIP
    const bq = a.progress.bouquets;
    await a.npc('chest');
    assert.strictEqual(a.progress.bouquets, bq - 3);
    assert.strictEqual(a.progress.chests, 1);
    a.send({ t: 'open' });
    const gift = await a.wait((m) => m.t === 'gift');
    assert.strictEqual(gift.image, 'hub.png');
    assert.match(gift.text, /HDMI, USB, Type-C/);
    assert.match(gift.text, /cổng thẻ nhớ/);
    const ann = await b.wait((m) => m.t === 'chat' && m.kind === 'system' && /QUÀ VIP/.test(m.text));
    assert.match(ann.text, /Na/);
    await sleep(50);
    assert.strictEqual(a.progress.chests, 0);
    assert.strictEqual(a.progress.giftsOpened, 1);

    // Không mở được khi hết rương
    a.send({ t: 'open' });
    assert.match((await a.wait((m) => m.t === 'toast' && /chưa có rương/.test(m.text))).text, /rương/);

    // Cùng token đang online thì bị từ chối
    const c = new Client(port); await c.open();
    c.send({ t: 'join', token: 'tokenAAAA1', name: 'Fake' });
    await c.wait((m) => m.t === 'inuse');
    c.ws.close();

    // Rời làng -> người kia nhận tin
    b.ws.close();
    await a.wait((m) => m.t === 'leave' && m.id === b.id);
  } finally {
    a.ws.close();
    await new Promise((r) => game.close(r));
  }
  // Tiến độ được lưu lại
  await sleep(700);
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.strictEqual(saved.tokenAAAA1.giftsOpened, 1);
  assert.strictEqual(saved.tokenAAAA1.questIndex, D.QUESTS.length);
});

test('phục vụ file tĩnh và chặn path traversal', async () => {
  const game = createGame({ dataFile: path.join(os.tmpdir(), 'nv-unused.json'), port: 0, host: '127.0.0.1' });
  const port = await new Promise((r) => game.listen(r));
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.strictEqual(home.status, 200);
    assert.match(await home.text(), /Làng Ninja Hoa Hồng/);
    const img = await fetch(`http://127.0.0.1:${port}/hub.png`);
    assert.strictEqual(img.headers.get('content-type'), 'image/png');
    const bad = await fetch(`http://127.0.0.1:${port}/..%2fserver.js`);
    assert.notStrictEqual(bad.status, 200);
  } finally {
    await new Promise((r) => game.close(r));
  }
});
