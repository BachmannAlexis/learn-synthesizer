/* MoogLab — app wiring: audio engine, panel UI, keyboard, lessons & progress. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('mooglab.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('mooglab.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  // ---------- state ----------
  let level = store.get('level', 1);
  const levelPatches = {}; // per-level edits kept while switching levels
  // Pedal settings live in the same patch object but persist across levels and presets.
  const fxOf = (p) => Object.fromEntries(PARAMS.filter((d) => d.fx).map((d) => [d.id, p[d.id]]));
  const synthOf = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !isFx(k)));
  let patch = { ...patchForLevel(level), ...store.get('fx', {}) };
  const withFx = (p) => ({ ...p, ...fxOf(patch) });
  const done = new Set(store.get('done', []));
  const stats = { legato: 0, bent: false, presets: new Set(), saved: false };
  const held = new Set();      // keys physically down
  const sounding = new Set();  // notes the synth is playing (held, or kept by the hold pedal)
  let sustain = false;
  let tele = null;
  let octave = 4;

  // ---------- audio ----------
  let ctx = null, node = null, analyser = null, starting = null, board = null, looper = null;
  function startAudio() {
    if (starting) return starting;
    starting = (async () => {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      const src = '(' + mooglabDSP.toString() + ')();';
      let out;
      try {
        out = await workletNode(src);
      } catch {
        out = scriptNode(); // sandboxed pages may refuse worklet modules: run the same engine on the main thread
      }
      analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.6;
      out.connect(analyser); // the scopes show the synth itself, before the pedals
      board = createPedalboard(ctx);
      out.connect(board.input);
      board.output.connect(ctx.destination);
      board.update(patch);
      looper = createLooper({
        now: () => ctx.currentTime,
        inputTime: () => ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0),
        sampleRate: ctx.sampleRate,
        send,
        click: metronomeClick,
        onChange: renderLooper,
      });
      Object.assign(looper.state, looperPrefs);
      setInterval(() => looper.tick(), 25);
      sendParams();
      document.body.classList.add('powered');
      $('#power').textContent = 'Audio on';
    })().catch((err) => {
      starting = null;
      $('#power').textContent = 'Audio failed — retry';
      toast('Could not start audio (' + err.message + '). Try a recent Chrome, Edge, Firefox or Safari.');
    });
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return starting;
  }
  async function workletNode(src) {
    try {
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
    } catch {
      // Some browsers refuse blob: worklets on file:// pages; a data: URL usually works there.
      await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,' + encodeURIComponent(src));
    }
    const w = new AudioWorkletNode(ctx, 'moog-voice', { numberOfInputs: 0, outputChannelCount: [2] });
    w.port.onmessage = (e) => { tele = e.data; };
    node = { port: w.port };
    return w;
  }
  function scriptNode() {
    mooglabDSP();
    const rack = new globalThis.MooglabRack(ctx.sampleRate);
    const sp = ctx.createScriptProcessor(1024, 0, 2);
    sp.onaudioprocess = (e) => {
      const l = e.outputBuffer.getChannelData(0);
      rack.render(l, Math.round(e.playbackTime * ctx.sampleRate));
      e.outputBuffer.getChannelData(1).set(l);
      tele = rack.telemetry();
    };
    node = { port: { postMessage: (m) => rack.message(m) } };
    window.__mooglabKeep = sp; // keep the node alive
    return sp;
  }
  const send = (m) => node && node.port.postMessage(m);
  const sendParams = () => send({ type: 'params', p: synthOf(patch) });

  function metronomeClick(t, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(accent ? 0.25 : 0.14, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.06);
  }

  // ---------- notes ----------
  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = (n) => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
  async function noteOn(n) {
    if (held.has(n)) return;
    if (held.size > 0) stats.legato++;
    held.add(n);
    $$(`.key[data-note="${n}"]`).forEach((k) => k.classList.add('down'));
    $('#note-readout').textContent = noteName(n) + ' · ' + (440 * Math.pow(2, (n - 69) / 12)).toFixed(1) + ' Hz';
    await startAudio();
    if (!held.has(n)) return; // released while audio was starting
    if (sounding.has(n)) { send({ type: 'noteOff', note: n }); if (looper) looper.noteOff(n); }
    sounding.add(n);
    send({ type: 'noteOn', note: n });
    if (looper) looper.noteOn(n);
    checkChallenges();
  }
  function noteOff(n) {
    if (!held.delete(n)) return;
    $$(`.key[data-note="${n}"]`).forEach((k) => k.classList.remove('down'));
    if (!sustain) release(n);
  }
  function release(n) {
    if (!sounding.delete(n)) return;
    send({ type: 'noteOff', note: n });
    if (looper) looper.noteOff(n);
  }
  function setSustain(on) {
    sustain = on;
    $('#hold').setAttribute('aria-pressed', on);
    if (!on) [...sounding].filter((n) => !held.has(n)).forEach(release);
  }
  function allOff() {
    [...held].forEach(noteOff);
    [...sounding].forEach(release);
    send({ type: 'allOff' });
  }

  // ---------- controls ----------
  const controls = {}; // id -> update fn

  function makeKnob(def) {
    const el = document.createElement('div');
    el.className = 'knob';
    el.innerHTML = `
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="knob-track" d="${arc(-135, 135)}"/>
        <path class="knob-fill"/>
        <circle class="knob-cap" cx="32" cy="32" r="19"/>
        <line class="knob-pointer" x1="32" y1="32" x2="32" y2="16"/>
      </svg>
      <div class="knob-label">${def.label}</div>
      <div class="knob-value"></div>`;
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', def.label);
    el.title = 'Drag up/down · Shift = fine · Double-click = reset';
    const fill = $('.knob-fill', el), ptr = $('.knob-pointer', el), val = $('.knob-value', el);
    const update = () => {
      const n = toNorm(def, patch[def.id]);
      const ang = -135 + 270 * n;
      fill.setAttribute('d', n > 0.001 ? arc(-135, ang) : '');
      ptr.setAttribute('transform', `rotate(${ang} 32 32)`);
      val.textContent = formatValue(def, patch[def.id]);
      el.setAttribute('aria-valuetext', val.textContent);
    };
    const setNorm = (n) => setParam(def.id, fromNorm(def, n));
    let startY = 0, startN = 0;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      startY = e.clientY; startN = toNorm(def, patch[def.id]);
      el.classList.add('active');
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const sens = e.shiftKey ? 0.001 : 0.004; // ~250 px for a full sweep
      setNorm(startN + (startY - e.clientY) * sens);
    });
    el.addEventListener('pointerup', () => el.classList.remove('active'));
    el.addEventListener('dblclick', () => setParam(def.id, def.def));
    el.addEventListener('wheel', (e) => { e.preventDefault(); setNorm(toNorm(def, patch[def.id]) - Math.sign(e.deltaY) * (e.shiftKey ? 0.005 : 0.03)); }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.005 : 0.03;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setNorm(toNorm(def, patch[def.id]) + step); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setNorm(toNorm(def, patch[def.id]) - step); e.preventDefault(); e.stopPropagation(); }
    });
    controls[def.id] = update;
    return el;
  }

  function makeChoice(def) {
    const el = document.createElement('div');
    el.className = 'choice';
    el.innerHTML = `<div class="choice-label">${def.label}</div><div class="choice-btns" role="radiogroup" aria-label="${def.label}"></div>`;
    const btns = def.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = def.options === WAVES ? waveIcon(i) + `<span>${o}</span>` : `<span>${o}</span>`;
      b.title = o;
      b.addEventListener('click', () => setParam(def.id, i));
      $('.choice-btns', el).appendChild(b);
      return b;
    });
    controls[def.id] = () => btns.forEach((b, i) => b.setAttribute('aria-pressed', patch[def.id] === i));
    return el;
  }

  function waveIcon(i) {
    const d = [
      'M2 10 C6 -2, 10 -2, 14 10 S22 22, 26 10',
      'M2 10 L8 3 L20 17 L26 10',
      'M2 16 L14 4 L14 16 L26 4 L26 16',
      'M2 16 L2 4 L14 4 L14 16 L26 16 L26 4',
      'M2 16 L2 4 L8 4 L8 16 L26 16 L26 4',
      'M2 16 L2 4 L4 4 L4 16 L26 16 L26 4',
    ][i];
    return `<svg viewBox="0 0 28 20" class="wave-ico" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  function arc(a0, a1) {
    const r = 26, c = 32, rad = (a) => ((a - 90) * Math.PI) / 180;
    const p = (a) => `${c + r * Math.cos(rad(a))} ${c + r * Math.sin(rad(a))}`;
    return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
  }

  function setParam(id, v, { silent = false } = {}) {
    const def = PARAM_BY_ID[id];
    if (!def.type) {
      v = Math.min(def.max, Math.max(def.min, v));
      if (def.fmt === 'pct' && v < 0.005) v = 0;
      if (id.endsWith('Detune') && Math.abs(v - Math.round(v)) < 0.04) v = Math.round(v); // snap to semitones
    }
    patch[id] = v;
    if (controls[id]) controls[id]();
    if (id === 'modWheel') $('#mod-wheel').value = v;
    if (def.fx) {
      if (board) board.update(patch);
      store.set('fx', fxOf(patch));
      return;
    }
    if (!silent) { sendParams(); checkChallenges(); }
  }

  function buildPanel() {
    const panel = $('#panel');
    panel.innerHTML = '';
    for (const sec of SECTIONS) {
      const defs = PARAMS.filter((p) => p.section === sec.id && p.level <= level);
      if (!defs.length) continue;
      const box = document.createElement('section');
      box.className = 'module module-' + sec.id;
      const isNew = defs.some((d) => d.level === level) && level > 1;
      box.innerHTML = `<h3>${sec.title}${isNew ? '<span class="new">new</span>' : ''}</h3><div class="module-body"></div>`;
      const body = $('.module-body', box);
      for (const d of defs) {
        const c = d.type === 'choice' ? makeChoice(d) : makeKnob(d);
        if (d.level === level && level > 1) c.classList.add('is-new');
        body.appendChild(c);
      }
      panel.appendChild(box);
    }
    Object.values(controls).forEach((f) => f());
    $('#perf').hidden = level < 5;
    buildPresets();
    buildPedalboard();
  }

  // ---------- lessons ----------
  function buildLevelNav() {
    const nav = $('#levels');
    nav.innerHTML = '';
    for (const L of LEVELS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-tab';
      const n = L.challenges.filter((c) => done.has(c.id)).length;
      b.innerHTML = `<span class="lv-num">${L.n}</span><span class="lv-text"><b>${L.title}</b><small>${n}/${L.challenges.length} ★</small></span>`;
      b.setAttribute('aria-current', L.n === level);
      b.addEventListener('click', () => goLevel(L.n));
      nav.appendChild(b);
    }
  }

  function buildLesson() {
    const L = LEVELS[level - 1];
    $('#lesson-kicker').textContent = `Level ${L.n} · ${L.subtitle}`;
    $('#lesson-title').textContent = L.title;
    $('#lesson-theory').innerHTML = L.theory;
    $('#lesson-tips').innerHTML = L.tips.map((t) => `<li>${t}</li>`).join('');
    // On phones the lesson text starts folded so the synth is reachable without a long scroll.
    $('#lesson-more').open = !window.matchMedia('(max-width: 860px)').matches;
    renderChallenges();
    // signal flow
    $$('#flow [data-block]').forEach((b) => b.classList.toggle('on', L.flow.includes(b.dataset.block) || (b.dataset.block === 'vco' && L.flow.includes('vco3'))));
    $('#flow [data-block="vco"] b').textContent = L.flow.includes('vco3') ? 'VCO ×3' : 'VCO';
    // visualizers
    $$('.viz').forEach((v) => (v.hidden = !L.viz.includes(v.dataset.viz)));
    $('#prev-level').disabled = level === 1;
    $('#next-level').disabled = level === LEVELS.length;
  }

  function renderChallenges() {
    const L = LEVELS[level - 1];
    $('#challenges').innerHTML = L.challenges
      .map((c) => `<li class="${done.has(c.id) ? 'done' : ''}"><span class="check" aria-hidden="true">${done.has(c.id) ? '★' : '☆'}</span>${c.text}</li>`)
      .join('');
    const n = L.challenges.filter((c) => done.has(c.id)).length;
    $('#challenge-count').textContent = `${n}/${L.challenges.length}`;
    const total = LEVELS.reduce((a, l) => a + l.challenges.length, 0);
    $('#overall').style.setProperty('--p', (done.size / total) * 100 + '%');
    $('#overall-text').textContent = `${done.size}/${total} ★`;
  }

  function checkChallenges() {
    const L = LEVELS[level - 1];
    let gained = null;
    for (const c of L.challenges) {
      if (done.has(c.id)) continue;
      if (!c.silent && held.size === 0) continue;
      if (c.check(patch, stats)) { done.add(c.id); gained = c; }
    }
    if (!gained) return;
    store.set('done', [...done]);
    renderChallenges();
    buildLevelNav();
    const all = L.challenges.every((c) => done.has(c.id));
    toast(all ? `Level ${L.n} complete! ${level < LEVELS.length ? 'Next level unlocked →' : 'You mastered the Model D.'}` : '★ ' + gained.text);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function goLevel(n) {
    allOff();
    levelPatches[level] = { ...patch };
    level = n;
    store.set('level', level);
    patch = withFx(levelPatches[level] ? levelPatches[level] : patchForLevel(level));
    for (const k of Object.keys(controls)) delete controls[k];
    buildPanel();
    buildLesson();
    buildLevelNav();
    sendParams();
    $('#mod-wheel').value = patch.modWheel;
    window.scrollTo({ top: 0 });
  }

  function resetPatch() {
    patch = withFx(patchForLevel(level));
    Object.values(controls).forEach((f) => f());
    $('#mod-wheel').value = patch.modWheel;
    sendParams();
    toast('Patch reset to the lesson start');
  }

  // ---------- presets ----------
  function buildPresets() {
    const sel = $('#preset-select');
    const user = store.get('patches', {});
    // Group factory sounds by the level whose controls they use; later levels are marked.
    const byLevel = {};
    for (const [k, v] of Object.entries(PRESETS)) (byLevel[presetLevel(v)] ||= []).push(k);
    const groups = Object.keys(byLevel).sort().map((lv) => {
      const label = `Level ${lv} · ${LEVELS[lv - 1].title}${lv > level ? ' (preview)' : ''}`;
      return `<optgroup label="${label}">` + byLevel[lv].map((k) => `<option value="f:${k}">${k}</option>`).join('') + '</optgroup>';
    });
    sel.innerHTML = '<option value="">Presets…</option>' + groups.join('') +
      (Object.keys(user).length ? '<optgroup label="My patches">' + Object.keys(user).map((k) => `<option value="u:${k}">${k}</option>`).join('') + '</optgroup>' : '');
  }
  function loadPreset(v) {
    if (!v) return;
    const user = store.get('patches', {});
    const src = v.startsWith('f:') ? PRESETS[v.slice(2)] : user[v.slice(2)];
    if (!src) return;
    patch = withFx({ ...defaultPatch(), ...synthOf(src) });
    const needs = presetLevel(src);
    if (needs > level) toast(`This preset also uses Level ${needs} controls you can't see yet`);
    Object.values(controls).forEach((f) => f());
    $('#mod-wheel').value = patch.modWheel;
    if (v.startsWith('f:')) stats.presets.add(v);
    sendParams();
    checkChallenges();
  }
  function savePatch(e) {
    e.preventDefault();
    const name = $('#patch-name').value.trim();
    if (!name) { $('#patch-name').focus(); return; }
    $('#patch-name').value = '';
    const user = store.get('patches', {});
    user[name] = synthOf(patch);
    store.set('patches', user);
    stats.saved = true;
    buildPresets();
    $('#preset-select').value = 'u:' + name;
    checkChallenges();
    toast('Saved “' + name + '”');
  }

  // ---------- pedalboard ----------
  function buildPedalboard() {
    const box = $('#pedals');
    box.innerHTML = '';
    for (const pd of PEDALS) {
      const on = PARAMS.find((d) => d.pedal === pd.id && d.type === 'toggle');
      const el = document.createElement('div');
      el.className = 'pedal pedal-' + pd.id;
      el.innerHTML = `<div class="pedal-knobs"></div>
        <div class="pedal-name">${pd.name}</div>
        <p class="pedal-blurb">${pd.blurb}</p>
        <span class="led" aria-hidden="true"></span>
        <button type="button" class="footswitch" aria-label="${pd.name} on/off"></button>`;
      for (const d of PARAMS.filter((d) => d.pedal === pd.id && !d.type)) $('.pedal-knobs', el).appendChild(makeKnob(d));
      const sw = $('.footswitch', el);
      sw.addEventListener('click', () => setParam(on.id, patch[on.id] ? 0 : 1));
      controls[on.id] = () => { el.classList.toggle('on', !!patch[on.id]); sw.setAttribute('aria-pressed', !!patch[on.id]); };
      box.appendChild(el);
    }
    Object.values(controls).forEach((f) => f());
  }

  // ---------- looper ----------
  const looperPrefs = { bpm: 110, bars: 2, metronome: true, quantize: true, ...store.get('looper', {}) };
  async function withLooper(fn) {
    await startAudio();
    if (looper) fn(looper);
  }
  function saveLooperPrefs() {
    const st = looper ? looper.state : looperPrefs;
    store.set('looper', { bpm: st.bpm, bars: st.bars, metronome: st.metronome, quantize: st.quantize });
  }
  function renderLooper() {
    const st = looper ? looper.state : looperPrefs;
    const s = looper ? looper.status() : { running: false, recording: false, layers: 0, notes: 0, loopBeats: st.bars * 4 };
    const label = s.recording ? (s.layers || s.notes ? 'Overdub' : 'Recording') : s.running ? 'Playing' : s.notes ? 'Stopped' : 'Empty';
    $('#loop-state').textContent = label;
    $('#looper').dataset.state = s.recording ? 'rec' : s.running ? 'play' : 'idle';
    $('#loop-rec').setAttribute('aria-pressed', s.recording);
    $('#loop-play').textContent = s.running ? '■ Stop' : '▶ Play';
    $('#loop-play').disabled = !s.running && !s.notes;
    $('#loop-undo').disabled = !s.notes;
    $('#loop-clear').disabled = !s.notes && !s.running;
    $('#loop-layers').textContent = s.notes ? `${s.layers} take${s.layers === 1 ? '' : 's'} · ${s.notes} notes` : 'Press Rec, then play';
    $('#loop-bpm').value = st.bpm;
    $('#loop-bars').value = st.bars;
    $('#loop-bars').disabled = !!(s.notes || s.running);
    $('#loop-click').checked = st.metronome;
    $('#loop-quant').checked = st.quantize;
    const beats = $('#loop-beats');
    if (beats.childElementCount !== s.loopBeats) beats.innerHTML = '<i></i>'.repeat(s.loopBeats);
  }
  function looperUI() {
    $('#loop-rec').addEventListener('click', () => withLooper((l) => l.rec()));
    $('#loop-play').addEventListener('click', () => withLooper((l) => l.toggle()));
    $('#loop-undo').addEventListener('click', () => withLooper((l) => l.undo()));
    $('#loop-clear').addEventListener('click', () => withLooper((l) => l.clear()));
    $('#loop-bpm').addEventListener('change', (e) => {
      const v = +e.target.value || 110;
      if (looper) looper.setBpm(v); else looperPrefs.bpm = Math.min(240, Math.max(40, Math.round(v)));
      saveLooperPrefs(); renderLooper();
    });
    $('#loop-bars').addEventListener('change', (e) => {
      if (looper) looper.setBars(+e.target.value); else looperPrefs.bars = +e.target.value;
      saveLooperPrefs(); renderLooper();
    });
    $('#loop-click').addEventListener('change', (e) => { (looper ? looper.state : looperPrefs).metronome = e.target.checked; saveLooperPrefs(); });
    $('#loop-quant').addEventListener('change', (e) => { (looper ? looper.state : looperPrefs).quantize = e.target.checked; saveLooperPrefs(); });
    renderLooper();
  }
  function drawLooper() {
    if (!looper) return;
    const s = looper.status();
    const cur = Math.floor(s.beat);
    $$('#loop-beats i').forEach((b, i) => {
      b.classList.toggle('now', s.running && !s.counting && i === cur);
      b.classList.toggle('bar', i % 4 === 0);
    });
    $('#loop-progress').style.width = s.running ? (s.beat / s.loopBeats) * 100 + '%' : '0%';
  }

  // ---------- keyboard ----------
  const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17 };
  function buildKeyboard() {
    const kb = $('#keyboard');
    kb.innerHTML = '';
    // Three octaves on wide screens (starting one below), fewer and wider keys on phones.
    const size = keyboardSize();
    const first = 12 * (octave + 1) - (size === 'wide' ? 12 : 0);
    const last = first + { wide: 36, mid: 17, small: 12 }[size];
    const whites = [];
    for (let n = first; n <= last; n++) if (![1, 3, 6, 8, 10].includes(n % 12)) whites.push(n);
    const ww = 100 / whites.length;
    let wi = 0;
    for (let n = first; n <= last; n++) {
      const black = [1, 3, 6, 8, 10].includes(n % 12);
      const k = document.createElement('div');
      k.className = 'key ' + (black ? 'black' : 'white');
      k.dataset.note = n;
      if (black) k.style.left = `calc(${wi * ww}% - ${ww * 0.3}%)`, k.style.width = ww * 0.6 + '%';
      else { k.style.left = wi * ww + '%'; k.style.width = ww + '%'; wi++; }
      const rel = n - 12 * (octave + 1);
      const ch = Object.keys(KEYMAP).find((c) => KEYMAP[c] === rel);
      if (ch) k.innerHTML = `<span>${ch.toUpperCase()}</span>`;
      if (n % 12 === 0) k.insertAdjacentHTML('beforeend', `<em>${noteName(n)}</em>`);
      if (held.has(n)) k.classList.add('down');
      kb.appendChild(k);
    }
    $('#octave-readout').textContent = (window.innerWidth < 560 ? 'Oct ' : 'Octave ') + octave;
  }
  const keyboardSize = () => (window.innerWidth < 500 ? 'small' : window.innerWidth < 700 ? 'mid' : 'wide');
  let pointerNote = new Map();
  function keyboardPointer() {
    const kb = $('#keyboard');
    const noteAt = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest('.key') ? +el.closest('.key').dataset.note : null; };
    kb.addEventListener('pointerdown', (e) => {
      kb.setPointerCapture(e.pointerId);
      const n = noteAt(e);
      if (n !== null) { pointerNote.set(e.pointerId, n); noteOn(n); }
      e.preventDefault();
    });
    kb.addEventListener('pointermove', (e) => {
      if (!pointerNote.has(e.pointerId)) return;
      const n = noteAt(e), cur = pointerNote.get(e.pointerId);
      if (n !== null && n !== cur) { noteOn(n); noteOff(cur); pointerNote.set(e.pointerId, n); }
    });
    const up = (e) => { if (pointerNote.has(e.pointerId)) { noteOff(pointerNote.get(e.pointerId)); pointerNote.delete(e.pointerId); } };
    kb.addEventListener('pointerup', up);
    kb.addEventListener('pointercancel', up);
  }
  function computerKeys() {
    const typing = (e) => /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range';
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'x') { allOff(); octave = Math.min(7, Math.max(1, octave + (key === 'x' ? 1 : -1))); buildKeyboard(); return; }
      if (key === 'r') { withLooper((l) => l.rec()); e.preventDefault(); return; }
      if (key === ' ' && !/BUTTON/.test(e.target.tagName)) { withLooper((l) => l.toggle()); e.preventDefault(); return; }
      if (key === 'shift' && e.location === 2) { setSustain(!sustain); return; } // right Shift toggles hold
      if (key in KEYMAP) { noteOn(12 * (octave + 1) + KEYMAP[key]); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key in KEYMAP) noteOff(12 * (octave + 1) + KEYMAP[key]);
    });
    window.addEventListener('blur', allOff);
  }

  // ---------- wheels & MIDI ----------
  function wheels() {
    const bend = $('#bend-wheel'), mod = $('#mod-wheel');
    bend.addEventListener('input', () => {
      const v = +bend.value;
      send({ type: 'bend', value: v });
      if (Math.abs(v) > 0.5 && held.size) { stats.bent = true; checkChallenges(); }
    });
    const spring = () => { bend.value = 0; send({ type: 'bend', value: 0 }); };
    bend.addEventListener('pointerup', spring);
    bend.addEventListener('change', spring);
    mod.addEventListener('input', () => setParam('modWheel', +mod.value));
  }
  function midi() {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then((acc) => {
      const bind = () => acc.inputs.forEach((inp) => (inp.onmidimessage = onMidi));
      bind();
      acc.onstatechange = bind;
    }).catch(() => {});
    function onMidi({ data: [st, d1, d2] }) {
      const cmd = st & 0xf0;
      if (cmd === 0x90 && d2 > 0) noteOn(d1);
      else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1);
      else if (cmd === 0xb0 && d1 === 1) setParam('modWheel', d2 / 127);
      else if (cmd === 0xb0 && d1 === 64) setSustain(d2 >= 64);
      else if (cmd === 0xe0) {
        const v = (((d2 << 7) | d1) - 8192) / 8192 * 2;
        $('#bend-wheel').value = v;
        send({ type: 'bend', value: v });
        if (Math.abs(v) > 0.5 && held.size) { stats.bent = true; checkChallenges(); }
      }
    }
  }

  // ---------- render loop ----------
  function frame() {
    const L = LEVELS[level - 1];
    const sr = ctx ? ctx.sampleRate : 48000;
    if (L.viz.includes('scope')) Viz.scope($('#viz-scope'), analyser);
    if (L.viz.includes('spectrum')) Viz.spectrum($('#viz-spectrum'), analyser, sr);
    if (L.viz.includes('filter')) Viz.filter($('#viz-filter'), patch, tele && tele.stageA ? tele.fc : null);
    if (L.viz.includes('env')) Viz.envelopes($('#viz-env'), patch, tele);
    drawLooper();
    if (tele && L.viz.includes('filter')) $('#fc-readout').textContent = tele.stageA ? 'live cutoff ' + formatValue(PARAM_BY_ID.cutoff, tele.fc) : '';
    requestAnimationFrame(frame);
  }

  // ---------- init ----------
  function init() {
    if (level < 1 || level > LEVELS.length) level = 1;
    buildLevelNav();
    buildPanel();
    buildLesson();
    buildPresets();
    buildKeyboard();
    keyboardPointer();
    computerKeys();
    wheels();
    midi();
    looperUI();
    $('#hold').addEventListener('click', () => { setSustain(!sustain); });
    $('#mod-wheel').value = patch.modWheel;
    $('#power').addEventListener('click', () => { startAudio(); if (ctx) ctx.resume(); });
    $('#reset').addEventListener('click', resetPatch);
    $('#prev-level').addEventListener('click', () => goLevel(level - 1));
    $('#next-level').addEventListener('click', () => goLevel(level + 1));
    $('#oct-down').addEventListener('click', () => { allOff(); octave = Math.max(1, octave - 1); buildKeyboard(); });
    $('#oct-up').addEventListener('click', () => { allOff(); octave = Math.min(7, octave + 1); buildKeyboard(); });
    $('#preset-select').addEventListener('change', (e) => loadPreset(e.target.value));
    $('#save-form').addEventListener('submit', savePatch);
    let armed = null;
    $('#reset-progress').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (!armed) {
        b.textContent = 'Click again to erase all stars';
        armed = setTimeout(() => { armed = null; b.textContent = 'Reset progress'; }, 3000);
        return;
      }
      clearTimeout(armed); armed = null; b.textContent = 'Reset progress';
      done.clear(); store.set('done', []); renderChallenges(); buildLevelNav();
      toast('Progress reset');
    });
    let lastSize = keyboardSize();
    window.addEventListener('resize', () => {
      if (keyboardSize() !== lastSize) { lastSize = keyboardSize(); buildKeyboard(); }
    });
    // Keep page content clear of the fixed keyboard, whatever its height.
    const keysArea = $('.keys-area');
    const syncPad = () => document.body.style.setProperty('--kb-h', keysArea.offsetHeight + 16 + 'px');
    if (window.ResizeObserver) new ResizeObserver(syncPad).observe(keysArea);
    syncPad();
    requestAnimationFrame(frame);
  }
  init();
  // Read-only hooks for automated tests and curious learners (try it in the console).
  window.mooglab = { get patch() { return { ...patch }; }, get telemetry() { return tele; }, get looper() { return looper && looper.status(); } };
})();
