// Âm thanh của game: tất cả được tạo bằng Web Audio API, không cần file âm thanh.
// Dùng: Sound.unlock() trong một lần bấm của người chơi, rồi Sound.play('jump').
(() => {
  'use strict';

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('tv_snd_' + k)); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tv_snd_' + k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  };
  // voice: 'auto' (giọng Việt nếu máy có, không thì ríu rít) | 'babble' (luôn ríu rít) | 'off'
  const settings = { music: store.get('music', true), sfx: store.get('sfx', true), voice: store.get('voice', 'auto'), volume: store.get('volume', 0.7) };

  let ac = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let rainNode = null, rainGain = null;
  let out = null; // nơi hiệu ứng đang phát ra (gain riêng của lần phát hiện tại)

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applySettings(true);
      startMusic();
    }
    if (ac.state === 'suspended') ac.resume();
  }

  // immediate: đặt ngay (lúc khởi động), ngược lại thì chuyển mượt để không bị "bụp"
  function applySettings(immediate = false) {
    if (!ac) return;
    const now = ac.currentTime;
    const target = [[master, settings.volume, 0.05], [musicBus, settings.music ? 0.32 : 0, 0.2], [sfxBus, settings.sfx ? 0.9 : 0, 0.05]];
    for (const [node, v, tau] of target) {
      if (immediate) node.gain.setValueAtTime(v, now); else node.gain.setTargetAtTime(v, now, tau);
    }
  }
  function set(key, value) { settings[key] = value; store.set(key, value); applySettings(); }

  // ---------- Bộ tạo tiếng cơ bản ----------
  // tone: nốt có đường bao âm lượng, có thể trượt cao độ
  function tone(freq, t, dur, { type = 'sine', vol = 0.3, to = null, attack = 0.005, bus = out, vibrato = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    if (vibrato) {
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = vibrato; lg.gain.value = freq * 0.06;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // noise: tiếng xì / gió / va chạm qua bộ lọc
  function noise(t, dur, { vol = 0.3, freq = 1200, to = null, filter = 'bandpass', q = 1, bus = out } = {}) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  const notes = (list, t, step, opts) => list.forEach((f, i) => tone(f, t + i * step, step * 1.6, opts));

  // ---------- Thư viện hiệu ứng ----------
  const SFX = {
    click: (t) => tone(880, t, 0.06, { type: 'triangle', vol: 0.15 }),
    jump: (t) => tone(320, t, 0.14, { type: 'square', vol: 0.08, to: 640 }),
    jump2: (t) => tone(520, t, 0.14, { type: 'square', vol: 0.08, to: 1040 }),
    hurt: (t) => { tone(520, t, 0.22, { type: 'triangle', vol: 0.25, to: 180 }); noise(t, 0.08, { vol: 0.15, freq: 900 }); },
    // chiêu J/K của từng loài
    hamster0: (t) => { tone(140, t, 0.18, { vol: 0.45, to: 60 }); noise(t, 0.06, { vol: 0.2, freq: 400, filter: 'lowpass' }); },
    hamster1: (t) => tone(1100, t, 0.16, { type: 'square', vol: 0.08, to: 300 }),
    duck0: (t) => noise(t, 0.16, { vol: 0.35, freq: 3000, to: 600, q: 2 }),
    duck1: (t) => { tone(420, t, 0.16, { type: 'sawtooth', vol: 0.14, to: 260, vibrato: 30 }); tone(420, t + 0.2, 0.18, { type: 'sawtooth', vol: 0.14, to: 240, vibrato: 30 }); },
    platypus0: (t) => tone(320, t, 0.14, { type: 'triangle', vol: 0.35, to: 140 }),
    platypus1: (t) => { tone(90, t, 0.3, { vol: 0.5, to: 45 }); noise(t, 0.25, { vol: 0.3, freq: 300, filter: 'lowpass' }); },
    chick0: (t) => { for (let i = 0; i < 3; i++) tone(1400, t + i * 0.05, 0.035, { type: 'square', vol: 0.06 }); },
    chick1: (t) => { noise(t, 0.5, { vol: 0.25, freq: 5000, to: 1500, filter: 'highpass' }); tone(900, t, 0.2, { type: 'square', vol: 0.06, to: 1300, vibrato: 25 }); },
    croc0: (t) => { noise(t, 0.04, { vol: 0.4, freq: 2500 }); noise(t + 0.09, 0.05, { vol: 0.45, freq: 1800 }); tone(110, t + 0.09, 0.12, { type: 'sawtooth', vol: 0.12, to: 70 }); },
    croc1: (t) => noise(t, 0.28, { vol: 0.4, freq: 600, to: 4000, q: 3 }),
    sensei: (t) => { noise(t, 0.12, { vol: 0.3, freq: 800, to: 2400 }); tone(200, t + 0.05, 0.15, { type: 'triangle', vol: 0.3, to: 90 }); },
    hit: (t) => { noise(t, 0.07, { vol: 0.3, freq: 1500 }); tone(220, t, 0.08, { type: 'square', vol: 0.06, to: 120 }); },
    crit: (t) => { noise(t, 0.09, { vol: 0.35, freq: 2000 }); tone(1320, t, 0.18, { type: 'triangle', vol: 0.18 }); tone(1980, t + 0.05, 0.2, { type: 'triangle', vol: 0.12 }); },
    pop: (t) => { tone(500, t, 0.12, { vol: 0.3, to: 1400 }); notes([1568, 2093], t + 0.08, 0.06, { type: 'triangle', vol: 0.08 }); },
    bossDie: (t) => { tone(160, t, 0.6, { type: 'sawtooth', vol: 0.15, to: 40 }); notes([523, 659, 784, 1047], t + 0.3, 0.1, { type: 'square', vol: 0.07 }); },
    rose: (t) => notes([1319, 1760, 2637], t, 0.06, { type: 'triangle', vol: 0.12 }),
    cast: (t) => { noise(t, 0.2, { vol: 0.2, freq: 2000, to: 500 }); tone(260, t + 0.3, 0.15, { vol: 0.3, to: 110 }); },
    bite: (t) => { tone(500, t, 0.08, { vol: 0.25, to: 250 }); tone(500, t + 0.14, 0.08, { vol: 0.25, to: 250 }); },
    catch: (t) => { noise(t, 0.3, { vol: 0.3, freq: 1500, to: 400 }); notes([784, 988, 1175, 1568], t + 0.15, 0.07, { type: 'triangle', vol: 0.14 }); },
    trash: (t) => tone(300, t, 0.4, { type: 'triangle', vol: 0.2, to: 120, vibrato: 8 }),
    miss: (t) => notes([440, 370], t, 0.12, { type: 'triangle', vol: 0.12 }),
    levelUp: (t) => notes([523, 659, 784, 1047, 1319], t, 0.08, { type: 'square', vol: 0.08 }),
    chat: (t) => tone(1046, t, 0.07, { type: 'sine', vol: 0.12 }),
    npc: (t) => notes([392, 523], t, 0.07, { type: 'triangle', vol: 0.1 }),
    dialog: (t) => notes([659, 880], t, 0.06, { type: 'triangle', vol: 0.12 }),
    quest: (t) => notes([523, 784, 1047], t, 0.09, { type: 'triangle', vol: 0.14 }),
    gift: (t) => { notes([523, 659, 784, 1047], t, 0.12, { type: 'square', vol: 0.09 }); notes([1047, 1319, 1568, 2093], t + 0.55, 0.1, { type: 'triangle', vol: 0.12 }); tone(262, t + 0.55, 0.8, { type: 'triangle', vol: 0.15 }); },
    pkInvite: (t) => notes([880, 660, 880], t, 0.1, { type: 'square', vol: 0.08 }),
    beep: (t) => tone(660, t, 0.15, { type: 'square', vol: 0.1 }),
    go: (t) => { tone(990, t, 0.4, { type: 'square', vol: 0.1 }); tone(110, t, 0.8, { type: 'triangle', vol: 0.3, to: 80 }); noise(t, 0.6, { vol: 0.15, freq: 3000, filter: 'highpass' }); },
    win: (t) => { notes([523, 659, 784], t, 0.12, { type: 'square', vol: 0.09 }); tone(1047, t + 0.36, 0.6, { type: 'square', vol: 0.1, vibrato: 6 }); },
    lose: (t) => notes([523, 494, 466, 440], t, 0.18, { type: 'triangle', vol: 0.14 }),
    thunder: (t) => { noise(t, 2.2, { vol: 0.6, freq: 180, to: 60, filter: 'lowpass' }); noise(t + 0.05, 0.4, { vol: 0.3, freq: 900, filter: 'lowpass' }); },
    page: (t) => noise(t, 0.12, { vol: 0.12, freq: 4000, to: 1500, filter: 'highpass' }),
    // nhạc kết: hợp âm vang lên chậm rãi rồi giai điệu đi lên
    ending: (t) => {
      [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62, 67]].forEach((ch, i) => ch.forEach((n) => tone(440 * Math.pow(2, (n - 69) / 12), t + i * 1.1, 1.6, { type: 'triangle', vol: 0.08, attack: 0.25 })));
      notes([72, 74, 76, 79, 81, 79, 84].map((n) => 440 * Math.pow(2, (n - 69) / 12)), t + 0.4, 0.55, { type: 'sine', vol: 0.12 });
    },
    // tiếng "dừng hình" kiểu phim: quét xuống + hai nốt trầm
    tbc: (t) => { noise(t, 0.35, { vol: 0.35, freq: 4000, to: 200 }); tone(196, t + 0.3, 0.5, { type: 'sawtooth', vol: 0.12 }); tone(147, t + 0.85, 1.2, { type: 'sawtooth', vol: 0.12, vibrato: 5 }); },
  };

  // vol: 0..1, dùng để giảm tiếng của người chơi ở xa
  function play(name, vol = 1) {
    if (!ac || !settings.sfx || vol <= 0.02 || !SFX[name]) return;
    const g = ac.createGain();
    g.gain.value = Math.min(1, vol);
    g.connect(sfxBus);
    out = g;
    SFX[name](ac.currentTime + 0.01);
    out = null;
    setTimeout(() => g.disconnect(), 3000);
  }

  // ---------- Nhạc nền: bộ phát nhạc có lịch trước để không bị giật ----------
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // số MIDI -> Hz
  const SONGS = {
    day: {
      bpm: 112,
      chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], // C Am F G
      melody: [76, 0, 79, 76, 74, 0, 72, 74, 76, 79, 81, 0, 79, 76, 74, 0,
        72, 0, 74, 76, 79, 0, 76, 74, 72, 74, 76, 0, 74, 0, 72, 0],
      drums: true,
    },
    night: {
      bpm: 76,
      chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], // Am F C G
      melody: [76, 0, 0, 74, 72, 0, 0, 0, 69, 0, 72, 0, 74, 0, 0, 0,
        72, 0, 0, 71, 69, 0, 0, 0, 67, 0, 69, 0, 72, 0, 0, 0],
      drums: false,
    },
  };
  let mood = 'day', step = 0, nextTime = 0, timer = null;
  function startMusic() {
    nextTime = ac.currentTime + 0.1;
    schedule();
    timer = setInterval(schedule, 50);
  }
  function schedule() {
    while (nextTime < ac.currentTime + 0.25) {
      const song = SONGS[mood], dur = 60 / song.bpm / 2; // nốt móc đơn
      const bar = Math.floor(step / 8) % song.chords.length, chord = song.chords[bar];
      const m = song.melody[step % song.melody.length];
      const opts = { bus: musicBus };
      if (m) tone(N(m), nextTime, dur * 1.8, { ...opts, type: mood === 'day' ? 'square' : 'triangle', vol: mood === 'day' ? 0.05 : 0.09, attack: 0.01 });
      if (step % 8 === 0) tone(N(chord[0] - 24), nextTime, dur * 7, { ...opts, type: 'triangle', vol: 0.2, attack: 0.02 });
      if (step % 2 === 0) tone(N(chord[(step / 2) % 3]), nextTime, dur * 1.5, { ...opts, type: 'triangle', vol: 0.06 });
      if (song.drums) {
        if (step % 4 === 0) tone(110, nextTime, 0.12, { ...opts, vol: 0.25, to: 50 });
        if (step % 4 === 2) noise(nextTime, 0.05, { bus: musicBus, vol: 0.08, freq: 7000, filter: 'highpass' });
      }
      nextTime += dur;
      step++;
    }
  }
  // tạm nhỏ nhạc nền (khi chiếu đoạn kết) rồi trả lại
  function duck(on) { if (ac) musicBus.gain.setTargetAtTime(on ? 0 : settings.music ? 0.32 : 0, ac.currentTime, 0.4); }
  function setMood(m) { if (SONGS[m] && m !== mood) { mood = m; step = 0; } }

  // Tiếng mưa rơi liên tục, to nhỏ theo độ mưa
  function setRain(k) {
    if (!ac) return;
    if (!rainNode) {
      rainNode = ac.createBufferSource(); rainNode.buffer = noiseBuf; rainNode.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.6;
      rainGain = ac.createGain(); rainGain.gain.value = 0;
      rainNode.connect(f); f.connect(rainGain); rainGain.connect(sfxBus);
      rainNode.start();
    }
    rainGain.gain.setTargetAtTime(k * 0.12, ac.currentTime, 0.3);
  }

  // ---------- Giọng nói nhân vật ----------
  // Ưu tiên giọng tiếng Việt có sẵn trên máy (Microsoft Edge có giọng HoaiMy/NamMinh rất tự nhiên).
  // Máy không có giọng Việt thì nói "ríu rít" kiểu thú bằng các nốt ngắn, mỗi nhân vật một cao độ.
  const synth = window.speechSynthesis || null;
  let viVoices = [];
  function loadVoices() {
    const score = (v) => (/natural|online/i.test(v.name) ? 2 : 0) + (/google|microsoft/i.test(v.name) ? 1 : 0);
    viVoices = synth.getVoices().filter((v) => /^vi/i.test(v.lang)).sort((a, b) => score(b) - score(a));
  }
  if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }
  function pickVoice(male) {
    // tên giọng có chữ "Vietnamese" nên phải so khớp đúng tên người đọc (NamMinh là nam; HoaiMy, An là nữ)
    return viVoices.find((v) => (male ? /namminh|\bmale\b/i : /hoaimy|female|\ban\b/i).test(v.name)) || viVoices[0];
  }
  const hasVietnamese = () => viVoices.length > 0;
  // bỏ emoji để giọng đọc không đọc tên biểu tượng
  const clean = (text) => text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

  let lastSpoken = '', lastAt = 0, babbleUntil = 0;
  // profile: { pitch, rate, male, base (Hz của tiếng ríu rít), wave }
  // urgent: câu hội thoại chính thì ngắt câu đang đọc; câu hô khi đánh thì bỏ qua nếu đang bận đọc
  function speak(text, profile, { vol = 1, urgent = false } = {}) {
    if (settings.voice === 'off' || vol <= 0.05) return;
    text = clean(text);
    if (!text) return;
    const now = Date.now();
    if (text === lastSpoken && now - lastAt < 4000) return;
    lastSpoken = text; lastAt = now;
    if (settings.voice === 'auto' && synth && hasVietnamese()) {
      if (urgent) synth.cancel();
      else if (synth.pending) return; // đã có một câu chờ rồi thì thôi, tránh dồn hàng
      const u = new SpeechSynthesisUtterance(text.slice(0, 240));
      u.voice = pickVoice(profile.male); u.lang = u.voice.lang;
      u.pitch = profile.pitch; u.rate = profile.rate;
      u.volume = Math.min(1, vol * settings.volume * 1.4);
      synth.speak(u);
      return;
    }
    babble(text, profile, vol);
  }
  function stopSpeech() { if (synth) synth.cancel(); }

  function babble(text, p, vol) {
    if (!ac) return;
    const t0 = Math.max(ac.currentTime + 0.02, babbleUntil);
    if (t0 - ac.currentTime > 1.2) return; // đang ríu rít dồn quá thì bỏ qua câu này
    const syl = Math.min(14, Math.max(2, Math.round(text.length / 3.2)));
    const g = ac.createGain(); g.gain.value = Math.min(1, vol); g.connect(master);
    out = g;
    let t = t0;
    const ask = /\?\s*$/.test(text);
    for (let i = 0; i < syl; i++) {
      const c = text.charCodeAt((i * 3) % text.length);
      const f = p.base * (1 + (((c * 37) % 9) - 4) * 0.045) * (ask && i === syl - 1 ? 1.3 : 1);
      const d = (0.07 + (c % 3) * 0.012) / p.rate;
      tone(f, t, d, { type: p.wave || 'triangle', vol: p.wave === 'sawtooth' || p.wave === 'square' ? 0.12 : 0.16, to: f * (0.85 + (c % 5) * 0.06), attack: 0.008 });
      t += d + 0.018;
    }
    out = null;
    babbleUntil = t + 0.05;
    setTimeout(() => g.disconnect(), (t - ac.currentTime) * 1000 + 500);
  }

  window.Sound = { unlock, play, set, setMood, setRain, speak, stopSpeech, hasVietnamese, duck, settings };
})();
