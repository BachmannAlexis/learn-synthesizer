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
  // Two sections: 'learn' (levels, lessons, challenges) and 'studio' (every control, free play).
  let mode = location.hash === '#studio' ? 'studio' : location.hash === '#learn' ? 'learn' : store.get('mode', 'learn');
  const isStudio = () => mode === 'studio';
  const vis = () => (isStudio() ? LEVELS.length : level); // highest level whose controls are shown
  const STUDIO_VIEW = { flow: ['vco3', 'mix', 'vcf', 'vca', 'env', 'lfo', 'out'], viz: ['scope', 'spectrum', 'filter', 'env'] };
  const view = () => (isStudio() ? STUDIO_VIEW : LEVELS[level - 1]);
  const studioPatch = () => ({ ...defaultPatch(), ...PRESETS['Fat Bass'], ...store.get('studio', {}) });
  let patch = { ...(isStudio() ? studioPatch() : patchForLevel(level)), ...store.get('fx', {}) };
  const withFx = (p) => ({ ...p, ...fxOf(patch) });
  const done = new Set(store.get('done', []));
  const stats = { legato: 0, bent: false, presets: new Set(), saved: false };
  const held = new Set();      // keys physically down
  const sounding = new Set();  // notes the synth is playing (held, or kept by the hold pedal)
  let sustain = false;
  let tele = null;
  let octave = 4;

  // ---------- audio ----------
  let ctx = null, node = null, analyser = null, starting = null, board = null, looper = null, tickTimer = null;
  // Chromium honours a numeric latencyHint (0 = smallest buffer the device allows, several times
  // less delay than 'interactive'); other browsers get the standard low-latency setting.
  const isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)));
  function makeContext(hint) {
    const AC = window.AudioContext || window.webkitAudioContext;
    try { return new AC({ latencyHint: hint }); } catch { return new AC(); }
  }
  // Every tap/click/key press may resume audio: browsers start or re-suspend the audio
  // context outside a user gesture (first touch on phones, calls, tab switches on iOS).
  function wake() {
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
  }
  function updatePower() {
    const on = ctx && ctx.state === 'running';
    const btn = $('#power');
    btn.textContent = I18N.t(!ctx ? 'startAudio' : on ? 'soundOn' : 'tapForSound');
    document.body.classList.toggle('powered', !!on);
  }
  // If the clock does not move after starting, rebuild the context with the default buffer.
  function watchdog(c, hint) {
    const t0 = c.currentTime;
    setTimeout(() => {
      if (c !== ctx || c.state !== 'running' || c.currentTime > t0) return;
      if (hint !== 'interactive') { c.close(); ctx = null; starting = null; startAudio('interactive'); }
    }, 700);
  }
  function startAudio(hint = isChromium ? 0 : 'interactive') {
    wake();
    if (starting) return starting;
    // iPhone: play through the ringer/silent switch like a music app.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
    starting = (async () => {
      ctx = makeContext(hint);
      ctx.onstatechange = updatePower;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
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
      if (!tickTimer) tickTimer = setInterval(() => looper && looper.tick(), 25);
      sendParams();
      updatePower();
      watchdog(ctx, hint);
      showLatency(out instanceof AudioWorkletNode ? 0 : FALLBACK_BUFFER / ctx.sampleRate);
    })().catch((err) => {
      starting = null;
      $('#power').textContent = I18N.t('audioFailed');
      toast(I18N.t('audioError', { msg: err.message }));
    });
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
  // Main-thread fallback buffer: 512 samples (~11 ms) is low delay without starving on busy devices.
  const FALLBACK_BUFFER = 512;
  function scriptNode() {
    mooglabDSP();
    const rack = new globalThis.MooglabRack(ctx.sampleRate);
    const sp = ctx.createScriptProcessor(FALLBACK_BUFFER, 0, 2);
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
  // Delay from key press to sound: browser + device buffers (+ fallback buffer).
  let latencyMs = 0;
  function showLatency(extra) {
    latencyMs = Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0) + extra) * 1000);
    renderLatency();
    if (latencyMs > 60) toast(I18N.t('delayToast', { ms: latencyMs }));
  }
  function renderLatency() {
    const el = $('#latency');
    el.textContent = latencyMs ? I18N.t('delay', { ms: latencyMs }) : '';
    el.classList.toggle('high', latencyMs > 60);
    el.title = I18N.t(latencyMs > 60 ? 'delayHigh' : 'delayTitle');
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
      <div class="knob-label">${I18N.param(def)}</div>
      <button type="button" class="knob-value" title="${I18N.t('typeValue')}"></button>`;
    el.tabIndex = 0;
    el.dataset.param = def.id;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', I18N.param(def));
    el.title = I18N.t('knobTitle');
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
    const normDef = toNorm(def, def.def);
    let startX = 0, startY = 0, startN = 0, lastPointer = 'mouse';
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.knob-value, .knob-edit')) return; // the value opens the number editor instead
      lastPointer = e.pointerType;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY; startN = toNorm(def, patch[def.id]);
      el.classList.add('active');
      showBubble(el, def);
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      // Up or right turns it up, down or left turns it down; ~250 px for a full sweep, Shift = 4x finer.
      const moved = (e.clientX - startX) - (e.clientY - startY);
      let n = startN + moved * (e.shiftKey ? 0.001 : 0.004);
      // Light notch at the default value, so it is easy to find again.
      if (Math.abs(n - normDef) < 0.015 && Math.abs(startN - normDef) > 0.001) n = normDef;
      setNorm(n);
      showBubble(el, def);
    });
    const end = () => { el.classList.remove('active'); hideBubble(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Double-click resets with a mouse; on touch screens a double tap is too easy to do by accident.
    el.addEventListener('dblclick', (e) => {
      if (lastPointer === 'mouse' && !e.target.closest('.knob-value, .knob-edit')) setParam(def.id, def.def);
    });
    val.addEventListener('click', () => editValue(el, def, val));
    el.addEventListener('wheel', (e) => { e.preventDefault(); setNorm(toNorm(def, patch[def.id]) - Math.sign(e.deltaY) * (e.shiftKey ? 0.005 : 0.03)); }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.005 : 0.03;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setNorm(toNorm(def, patch[def.id]) + step); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setNorm(toNorm(def, patch[def.id]) - step); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'Enter' && e.target === el) { editValue(el, def, val); e.preventDefault(); }
    });
    controls[def.id] = update;
    return el;
  }

  // Large readout above the knob while it is turned (a finger hides the small value).
  function showBubble(el, def) {
    const b = $('#knob-bubble');
    b.innerHTML = `<small>${I18N.param(def)}</small>${formatValue(def, patch[def.id])}`;
    const r = el.getBoundingClientRect();
    b.style.left = Math.min(window.innerWidth - 70, Math.max(70, r.left + r.width / 2)) + 'px';
    b.style.top = Math.max(8, r.top - 54) + 'px';
    b.hidden = false;
  }
  function hideBubble() { $('#knob-bubble').hidden = true; }

  // Type an exact value: click/tap the number under a knob.
  function editValue(el, def, val) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'knob-edit';
    input.value = formatValue(def, patch[def.id]).replace(/\s*(dt|st)$/, '');
    input.setAttribute('aria-label', I18N.param(def));
    val.hidden = true;
    val.after(input);
    input.focus();
    input.select();
    let closed = false;
    const close = (apply) => {
      if (closed) return;
      closed = true;
      if (apply) {
        const v = parseValue(def, input.value, patch[def.id]);
        if (v === null) toast(I18N.t('badValue', { text: input.value }));
        else setParam(def.id, v);
      }
      input.remove();
      val.hidden = false;
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') close(true);
      if (e.key === 'Escape') { close(false); el.focus(); }
    });
    input.addEventListener('blur', () => close(true));
  }

  function makeChoice(def) {
    const el = document.createElement('div');
    el.className = 'choice';
    el.dataset.param = def.id;
    const label = I18N.param(def);
    el.innerHTML = `<div class="choice-label">${label}</div><div class="choice-btns" role="radiogroup" aria-label="${label}"></div>`;
    const btns = def.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      const name = I18N.option(o);
      const icon = def.options === WAVES ? waveIcon(i) : def.icons ? `<svg viewBox="0 0 28 20" class="wave-ico" aria-hidden="true"><path d="${def.icons[i]}"/></svg>` : '';
      b.innerHTML = icon + `<span>${name}</span>`;
      b.title = name;
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
      updateSummaries();
      return;
    }
    if (isStudio()) store.set('studio', synthOf(patch));
    updateSummaries();
    if (!silent) { sendParams(); checkChallenges(); }
  }

  // ---------- foldable sections ----------
  // Any element with data-fold="key" holds a .fold-btn (its title) and a .fold-body.
  // Folded sections show a one-line .fold-summary instead; the choice is remembered.
  const folded = store.get('folded', {});
  function setFold(el, on, { save = true } = {}) {
    el.classList.toggle('folded', on);
    const btn = $('.fold-btn', el);
    if (btn) btn.setAttribute('aria-expanded', !on);
    if (save) {
      if (on) folded[el.dataset.fold] = true; else delete folded[el.dataset.fold];
      store.set('folded', folded);
    }
    updateFoldAll();
  }
  function initFold(el) {
    $('.fold-btn', el).addEventListener('click', () => setFold(el, !el.classList.contains('folded')));
    setFold(el, !!folded[el.dataset.fold], { save: false });
  }
  const foldables = () => $$('[data-fold]').filter((el) => !el.hidden && !el.closest('[hidden]'));
  function updateFoldAll() {
    const any = foldables().some((el) => !el.classList.contains('folded'));
    $('#fold-all').textContent = I18N.t(any ? 'foldAll' : 'unfoldAll');
  }
  function foldAll() {
    const any = foldables().some((el) => !el.classList.contains('folded'));
    foldables().forEach((el) => setFold(el, any));
  }
  const sectionSummaries = [];
  function updateSummaries() {
    sectionSummaries.forEach((f) => f());
    const on = PEDALS.filter((pd) => patch[PARAMS.find((d) => d.pedal === pd.id && d.type === 'toggle').id]).map((pd) => I18N.pedal(pd).name);
    $('#board-summary').textContent = (on.length ? on.join(', ') : I18N.t('noPedals')) + ' · ' + I18N.t('loopStation') + ': ' + $('#loop-state').textContent;
  }
  function refreshControls() {
    Object.values(controls).forEach((f) => f());
    updateSummaries();
  }

  function buildPanel() {
    const panel = $('#panel');
    panel.innerHTML = '';
    sectionSummaries.length = 0;
    const lv = vis(), showNew = !isStudio() && level > 1;
    for (const sec of SECTIONS) {
      const defs = PARAMS.filter((p) => p.section === sec.id && p.level <= lv);
      if (!defs.length) continue;
      const box = document.createElement('section');
      box.className = 'module module-' + sec.id;
      box.dataset.fold = sec.id;
      const isNew = showNew && defs.some((d) => d.level === level);
      box.innerHTML = `<h3><button type="button" class="fold-btn" title="${I18N.t('foldTitle')}"><span>${I18N.section(sec)}</span>${isNew ? `<span class="new">${I18N.t('newBadge')}</span>` : ''}<i class="chev" aria-hidden="true"></i></button></h3>
        <p class="fold-summary"></p><div class="module-body fold-body"></div>`;
      const sum = $('.fold-summary', box);
      sectionSummaries.push(() => {
        sum.textContent = defs.map((d) => (d.type ? '' : I18N.param(d) + ' ') + (d.type ? I18N.option(formatValue(d, patch[d.id])) : formatValue(d, patch[d.id]))).join(' · ');
      });
      const body = $('.module-body', box);
      for (const d of defs) {
        const c = d.type === 'choice' ? makeChoice(d) : makeKnob(d);
        if (showNew && d.level === level) c.classList.add('is-new');
        body.appendChild(c);
      }
      panel.appendChild(box);
      initFold(box);
    }
    refreshControls();
    $('#perf').hidden = lv < 5;
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
      b.innerHTML = `<span class="lv-num">${L.n}</span><span class="lv-text"><b>${I18N.lesson(L).title}</b><small>${n}/${L.challenges.length} ★</small></span>`;
      b.setAttribute('aria-current', L.n === level);
      b.addEventListener('click', () => goLevel(L.n));
      nav.appendChild(b);
    }
  }

  function buildLesson() {
    const L = LEVELS[level - 1], T = I18N.lesson(L);
    $('#lesson-kicker').textContent = I18N.t('levelKicker', { n: L.n, sub: T.subtitle });
    $('#lesson-title').textContent = T.title;
    $('#lesson-summary').innerHTML = T.summary.map((x) => `<li>${x}</li>`).join('');
    $('#lesson-theory').innerHTML = T.theory;
    $('#lesson-tips').innerHTML = T.tips.map((x) => `<li>${x}</li>`).join('');
    renderChallenges();
    $('#prev-level').disabled = level === 1;
    $('#next-level').disabled = level === LEVELS.length;
  }

  // Which blocks, scopes and section chrome are visible for the current section/level.
  function buildView() {
    const V = view(), studio = isStudio();
    document.body.classList.toggle('mode-studio', studio);
    $('#levels').hidden = studio;
    $('.col-lesson').hidden = studio;
    $('#studio-intro').hidden = !studio;
    $('.progress').hidden = studio;
    $('#mode-learn').setAttribute('aria-current', studio ? 'false' : 'page');
    $('#mode-studio').setAttribute('aria-current', studio ? 'page' : 'false');
    $('#reset').textContent = I18N.t(studio ? 'initPatch' : 'resetPatch');
    $('#studio-tips').innerHTML = (STRINGS[I18N.lang].studioTips || STRINGS.en.studioTips).map((x) => `<li>${x}</li>`).join('');
    $$('#flow [data-block]').forEach((b) => b.classList.toggle('on', V.flow.includes(b.dataset.block) || (b.dataset.block === 'vco' && V.flow.includes('vco3'))));
    $('#flow [data-block="vco"] b').textContent = V.flow.includes('vco3') ? 'VCO ×3' : 'VCO';
    $$('.viz').forEach((v) => (v.hidden = !V.viz.includes(v.dataset.viz)));
    if (!studio) buildLesson();
    renderDemoButtons();
  }

  function renderChallenges() {
    const L = LEVELS[level - 1];
    $('#challenges').innerHTML = L.challenges
      .map((c) => `<li class="${done.has(c.id) ? 'done' : ''}"><span class="check" aria-hidden="true">${done.has(c.id) ? '★' : '☆'}</span>${I18N.lesson(L).challenge(c)}</li>`)
      .join('');
    const n = L.challenges.filter((c) => done.has(c.id)).length;
    $('#challenge-count').textContent = `${n}/${L.challenges.length}`;
    const total = LEVELS.reduce((a, l) => a + l.challenges.length, 0);
    $('#overall').style.setProperty('--p', (done.size / total) * 100 + '%');
    $('#overall-text').textContent = `${done.size}/${total} ★`;
  }

  function checkChallenges() {
    if (isStudio() || demo.running) return; // the demo plays for you; stars are yours to earn
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
    toast(all ? I18N.t(level < LEVELS.length ? 'levelDone' : 'allDone', { n: L.n }) : '★ ' + I18N.lesson(L).challenge(gained));
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
    stopDemo();
    allOff();
    levelPatches[level] = { ...patch };
    level = n;
    store.set('level', level);
    patch = withFx(levelPatches[level] ? levelPatches[level] : patchForLevel(level));
    for (const k of Object.keys(controls)) delete controls[k];
    buildPanel();
    buildView();
    buildLevelNav();
    sendParams();
    $('#mod-wheel').value = patch.modWheel;
    window.scrollTo({ top: 0 });
  }

  function setMode(m, { scroll = true } = {}) {
    if (m !== 'learn' && m !== 'studio') m = 'learn';
    if (m !== mode) {
      stopDemo();
      allOff();
      if (isStudio()) store.set('studio', synthOf(patch)); else levelPatches[level] = { ...patch };
      mode = m;
      store.set('mode', mode);
      patch = withFx(isStudio() ? studioPatch() : levelPatches[level] || patchForLevel(level));
      sendParams();
      $('#mod-wheel').value = patch.modWheel;
    }
    if (location.hash !== '#' + mode) history.replaceState(null, '', '#' + mode);
    rebuild();
    if (scroll) window.scrollTo({ top: 0 });
  }

  // Re-render everything that depends on the section or the language.
  function rebuild() {
    I18N.apply();
    for (const k of Object.keys(controls)) delete controls[k];
    buildPanel();
    buildView();
    buildLevelNav();
    renderChallenges();
    buildLoopBars();
    renderLooper();
    buildKeyboard();
    renderLatency();
    if (ctx) updatePower();
    $('#lang-en').setAttribute('aria-pressed', I18N.lang === 'en');
    $('#lang-fr').setAttribute('aria-pressed', I18N.lang === 'fr');
  }

  function resetPatch() {
    patch = withFx(isStudio() ? defaultPatch() : patchForLevel(level));
    if (isStudio()) store.set('studio', synthOf(patch));
    refreshControls();
    $('#mod-wheel').value = patch.modWheel;
    sendParams();
    toast(I18N.t(isStudio() ? 'patchInit' : 'patchReset'));
  }

  // ---------- demos ----------
  // Each level has a short auto-play demo: the app plays notes and moves the knobs itself.
  const demo = { unfolded: new Set(), running: false, level: 0, timers: [], rafs: new Set(), saved: null, notes: new Set(), t0: 0, total: 0 };

  function renderDemoButtons() {
    for (const [id, n] of [['#demo-btn', level], ['#studio-demo-btn', LEVELS.length]]) {
      const b = $(id);
      const on = demo.running && demo.level === n;
      b.textContent = on ? I18N.t('demoStop') : I18N.t('demo', { s: Math.round(demoLength(n)) });
      b.setAttribute('aria-pressed', on);
    }
  }

  function applyPatch(p) {
    patch = withFx(p);
    if (isStudio()) store.set('studio', synthOf(patch));
    refreshControls();
    $('#mod-wheel').value = patch.modWheel;
    sendParams();
  }

  function demoNote(n, on) {
    send({ type: on ? 'noteOn' : 'noteOff', note: n });
    if (on) demo.notes.add(n); else demo.notes.delete(n);
    if (!held.has(n)) $$(`.key[data-note="${n}"]`).forEach((k) => k.classList.toggle('down', on));
  }

  function highlight(ids) {
    $$('.demo-focus').forEach((e) => e.classList.remove('demo-focus'));
    for (const id of ids) {
      const el = id === 'preset' ? $('#preset-select') : $(`[data-param="${id}"]`);
      if (!el) continue;
      el.classList.add('demo-focus');
      const box = el.closest('[data-fold].folded');
      if (box) { setFold(box, false, { save: false }); demo.unfolded.add(box.dataset.fold); }
    }
  }

  async function startDemo(n) {
    if (demo.running) { const same = demo.level === n; stopDemo(); if (same) return; }
    await startAudio();
    allOff();
    const D = DEMOS[n];
    Object.assign(demo, { running: true, level: n, saved: synthOf(patch), timers: [], t0: performance.now(), total: demoLength(n) * 1000 });
    applyPatch({ ...patchForLevel(n), ...D.start });
    $('#demo-bar').hidden = false;
    renderDemoButtons();
    if (window.innerWidth < 860) $('.case').scrollIntoView({ behavior: 'smooth', block: 'start' });
    let at = 0;
    D.steps.forEach((step, i) => {
      demo.timers.push(setTimeout(() => runStep(step, i, D.steps.length), at * 1000));
      at += step.dur;
    });
    demo.timers.push(setTimeout(() => { stopDemo(); toast(I18N.t('demoEnded')); }, at * 1000 + 400));
    const tick = () => {
      if (!demo.running) return;
      $('#demo-progress').style.width = Math.min(100, ((performance.now() - demo.t0) / demo.total) * 100) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function runStep(step, i, count) {
    $('#demo-caption').textContent = step.say[I18N.lang] || step.say.en;
    $('#demo-step').textContent = `${i + 1}/${count}`;
    if (step.preset) applyPatch({ ...defaultPatch(), ...PRESETS[step.preset] });
    for (const [id, v] of Object.entries(step.set || {})) setParam(id, v);
    highlight([...(step.preset ? ['preset'] : []), ...Object.keys(step.set || {}), ...Object.keys(step.ramp || {})]);
    // Smooth knob moves, in knob position (so frequency sweeps sound even).
    for (const [id, target] of Object.entries(step.ramp || {})) {
      const def = PARAM_BY_ID[id], from = toNorm(def, patch[id]), to = toNorm(def, target);
      const start = performance.now(), len = step.dur * 900;
      const move = (now) => {
        if (!demo.running) return;
        const k = Math.min(1, (now - start) / len);
        setParam(id, fromNorm(def, from + (to - from) * k));
        if (k < 1) requestAnimationFrame(move);
      };
      requestAnimationFrame(move);
    }
    // Notes spread evenly over the step; legato notes overlap so glide can be heard.
    const notes = step.notes || [];
    const gap = (step.dur * 1000) / Math.max(1, notes.length);
    notes.forEach((n, j) => {
      const len = notes.length === 1 ? step.dur * 920 : gap * (step.legato ? 1.15 : 0.75);
      demo.timers.push(setTimeout(() => demoNote(n, true), j * gap));
      demo.timers.push(setTimeout(() => demoNote(n, false), j * gap + len));
    });
  }

  function stopDemo() {
    if (!demo.running) return;
    demo.running = false;
    demo.timers.forEach(clearTimeout);
    demo.timers = [];
    [...demo.notes].forEach((n) => demoNote(n, false));
    send({ type: 'allOff' });
    highlight([]);
    for (const key of demo.unfolded) { const el = $(`[data-fold="${key}"]`); if (el && folded[key]) setFold(el, true, { save: false }); }
    demo.unfolded.clear();
    applyPatch(demo.saved);
    $('#demo-bar').hidden = true;
    $('#demo-progress').style.width = '0';
    renderDemoButtons();
  }

  // ---------- presets ----------
  function buildPresets() {
    const sel = $('#preset-select');
    const user = store.get('patches', {});
    // Group factory sounds by the level whose controls they use; later levels are marked.
    const byLevel = {};
    for (const [k, v] of Object.entries(PRESETS)) (byLevel[presetLevel(v)] ||= []).push(k);
    const groups = Object.keys(byLevel).sort().map((lv) => {
      const label = I18N.t('presetGroup', { n: lv, title: I18N.lesson(LEVELS[lv - 1]).title }) + (!isStudio() && lv > level ? I18N.t('preview') : '');
      return `<optgroup label="${label}">` + byLevel[lv].map((k) => `<option value="f:${k}">${k}</option>`).join('') + '</optgroup>';
    });
    sel.innerHTML = `<option value="">${I18N.t('presets')}</option>` + groups.join('') +
      (Object.keys(user).length ? `<optgroup label="${I18N.t('myPatches')}">` + Object.keys(user).map((k) => `<option value="u:${k}">${k}</option>`).join('') + '</optgroup>' : '');
  }
  function loadPreset(v) {
    if (!v) return;
    const user = store.get('patches', {});
    const src = v.startsWith('f:') ? PRESETS[v.slice(2)] : user[v.slice(2)];
    if (!src) return;
    patch = withFx({ ...defaultPatch(), ...synthOf(src) });
    const needs = presetLevel(src);
    if (!isStudio() && needs > level) toast(I18N.t('presetNeeds', { n: needs }));
    if (isStudio()) store.set('studio', synthOf(patch));
    refreshControls();
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
    toast(I18N.t('saved', { name }));
  }

  // ---------- pedalboard ----------
  function buildPedalboard() {
    const box = $('#pedals');
    box.innerHTML = '';
    for (const pd of PEDALS) {
      const on = PARAMS.find((d) => d.pedal === pd.id && d.type === 'toggle');
      const el = document.createElement('div');
      el.className = 'pedal pedal-' + pd.id;
      const P = I18N.pedal(pd);
      el.innerHTML = `<div class="pedal-knobs"></div>
        <div class="pedal-name">${P.name}</div>
        <p class="pedal-blurb">${P.blurb}</p>
        <span class="led" aria-hidden="true"></span>
        <button type="button" class="footswitch" aria-label="${I18N.t('onOff', { name: P.name })}"></button>`;
      for (const d of PARAMS.filter((d) => d.pedal === pd.id && !d.type)) $('.pedal-knobs', el).appendChild(makeKnob(d));
      const sw = $('.footswitch', el);
      sw.addEventListener('click', () => setParam(on.id, patch[on.id] ? 0 : 1));
      controls[on.id] = () => { el.classList.toggle('on', !!patch[on.id]); sw.setAttribute('aria-pressed', !!patch[on.id]); };
      box.appendChild(el);
    }
    refreshControls();
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
    const label = s.recording ? (s.layers || s.notes ? 'loopOverdub' : 'loopRecording') : s.running ? 'loopPlaying' : s.notes ? 'loopStopped' : 'loopEmpty';
    $('#loop-state').textContent = I18N.t(label);
    $('#looper').dataset.state = s.recording ? 'rec' : s.running ? 'play' : 'idle';
    $('#loop-rec').setAttribute('aria-pressed', s.recording);
    $('#loop-play').textContent = I18N.t(s.running ? 'loopStop' : 'loopPlay');
    $('#loop-play').disabled = !s.running && !s.notes;
    $('#loop-undo').disabled = !s.notes;
    $('#loop-clear').disabled = !s.notes && !s.running;
    $('#loop-layers').textContent = s.notes ? I18N.t('loopTakes', { takes: s.layers, notes: s.notes }) : I18N.t('loopHint');
    $('#loop-bpm').value = st.bpm;
    $('#loop-bars').value = st.bars;
    $('#loop-bars').disabled = !!(s.notes || s.running);
    $('#loop-click').checked = st.metronome;
    $('#loop-quant').checked = st.quantize;
    updateSummaries();
    const beats = $('#loop-beats');
    if (beats.childElementCount !== s.loopBeats) beats.innerHTML = '<i></i>'.repeat(s.loopBeats);
  }
  function buildLoopBars() {
    const sel = $('#loop-bars'), cur = (looper ? looper.state : looperPrefs).bars;
    sel.innerHTML = [1, 2, 4, 8].map((n) => `<option value="${n}">${n === 1 ? I18N.t('bar1') : I18N.t('bars', { n })}</option>`).join('');
    sel.value = cur;
  }
  function looperUI() {
    buildLoopBars();
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
  let shownNotes = 0;
  function drawLooper() {
    if (!looper) return;
    const s = looper.status();
    if (s.notes !== shownNotes) { shownNotes = s.notes; renderLooper(); }
    const cur = Math.floor(s.beat);
    $$('#loop-beats i').forEach((b, i) => {
      b.classList.toggle('now', s.running && !s.counting && i === cur);
      b.classList.toggle('bar', i % 4 === 0);
    });
    $('#loop-progress').style.width = s.running ? (s.beat / s.loopBeats) * 100 + '%' : '0%';
  }

  // ---------- keyboard ----------
  // Physical key positions (KeyboardEvent.code), so the piano layout is the same on
  // QWERTY, AZERTY or QWERTZ keyboards. Labels show the letter printed on the user's key.
  const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17 };
  const QWERTY = { KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P', Semicolon: ';', Quote: "'", KeyZ: 'Z', KeyX: 'X' };
  const AZERTY = { ...QWERTY, KeyA: 'Q', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', Quote: 'Ù' };
  // Best guess until the browser tells us the real layout (layout map, or the first key press).
  const keyLabels = { ...(I18N.lang === 'fr' ? AZERTY : QWERTY) };
  const keyLabel = (code) => keyLabels[code] || '';
  function learnLabels(map) {
    let changed = false;
    for (const code of Object.keys(QWERTY)) {
      const ch = map(code);
      if (ch && ch.length === 1 && keyLabels[code] !== ch.toUpperCase()) { keyLabels[code] = ch.toUpperCase(); changed = true; }
    }
    if (changed) buildKeyboard();
  }
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap().then((m) => learnLabels((code) => m.get(code))).catch(() => {});
  }
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
      const code = Object.keys(KEYMAP).find((c) => KEYMAP[c] === rel);
      if (code) k.innerHTML = `<span>${keyLabel(code)}</span>`;
      if (n % 12 === 0) k.insertAdjacentHTML('beforeend', `<em>${noteName(n)}</em>`);
      if (held.has(n)) k.classList.add('down');
      kb.appendChild(k);
    }
    $('#octave-readout').textContent = I18N.t(window.innerWidth < 560 ? 'oct' : 'octave', { n: octave });
    $('#hint-down').textContent = ' ' + keyLabel('KeyZ');
    $('#hint-up').textContent = keyLabel('KeyX') + ' ';
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
    // Only text fields swallow keys; checkboxes, sliders and buttons leave the keyboard playable.
    const typing = (e) => e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && /text|number|search/.test(e.target.type));
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
      const code = e.code;
      if (code in QWERTY && e.key && e.key.length === 1) learnLabels((c) => (c === code ? e.key : null));
      if (code === 'KeyZ' || code === 'KeyX') { allOff(); octave = Math.min(7, Math.max(1, octave + (code === 'KeyX' ? 1 : -1))); buildKeyboard(); return; }
      if (code === 'KeyR') { withLooper((l) => l.rec()); e.preventDefault(); return; }
      if (code === 'Space' && !/BUTTON/.test(e.target.tagName)) { withLooper((l) => l.toggle()); e.preventDefault(); return; }
      if (code === 'ShiftRight') { setSustain(!sustain); return; } // right Shift toggles hold
      if (code in KEYMAP) { noteOn(12 * (octave + 1) + KEYMAP[code]); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code in KEYMAP) noteOff(12 * (octave + 1) + KEYMAP[e.code]);
    });
    window.addEventListener('blur', allOff);
    // A mouse/touch click shouldn't leave focus on a button or menu, or Space/letters would
    // press that button or change the menu instead of playing. Keyboard (Tab) users are unaffected.
    document.addEventListener('pointerup', (e) => {
      const el = e.target.closest('button');
      if (el) setTimeout(() => el.blur());
    });
    document.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') e.target.blur();
    });
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
    const L = view();
    const sr = ctx ? ctx.sampleRate : 48000;
    if (L.viz.includes('scope')) Viz.scope($('#viz-scope'), analyser);
    if (L.viz.includes('spectrum')) Viz.spectrum($('#viz-spectrum'), analyser, sr);
    if (L.viz.includes('filter')) Viz.filter($('#viz-filter'), patch, tele && tele.stageA ? tele.fc : null);
    if (L.viz.includes('env')) Viz.envelopes($('#viz-env'), patch, tele);
    drawLooper();
    if (tele && L.viz.includes('filter')) $('#fc-readout').textContent = tele.stageA ? I18N.t('liveCutoff', { v: formatValue(PARAM_BY_ID.cutoff, tele.fc) }) : '';
    requestAnimationFrame(frame);
  }

  // ---------- init ----------
  function init() {
    if (level < 1 || level > LEVELS.length) level = 1;
    I18N.apply();
    buildLevelNav();
    buildPanel();
    buildView();
    buildKeyboard();
    keyboardPointer();
    computerKeys();
    wheels();
    midi();
    looperUI();
    $('#hold').addEventListener('click', () => { setSustain(!sustain); });
    $('#mod-wheel').value = patch.modWheel;
    $('#power').addEventListener('click', () => startAudio());
    for (const ev of ['pointerup', 'touchend', 'keydown', 'click']) document.addEventListener(ev, wake, true);
    $('#reset').addEventListener('click', resetPatch);
    $('#demo-btn').addEventListener('click', () => startDemo(level));
    $('#studio-demo-btn').addEventListener('click', () => startDemo(LEVELS.length));
    $('#demo-stop').addEventListener('click', stopDemo);
    $('#fold-all').addEventListener('click', foldAll);
    $$('.board[data-fold], .viz[data-fold]').forEach(initFold); // panel modules fold in buildPanel
    updateSummaries();
    $('#mode-learn').addEventListener('click', (e) => { e.preventDefault(); setMode('learn'); });
    $('#mode-studio').addEventListener('click', (e) => { e.preventDefault(); setMode('studio'); });
    window.addEventListener('hashchange', () => setMode(location.hash === '#studio' ? 'studio' : 'learn'));
    $('#lang-en').addEventListener('click', () => { I18N.set('en'); rebuild(); });
    $('#lang-fr').addEventListener('click', () => { I18N.set('fr'); rebuild(); });
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
        b.textContent = I18N.t('resetConfirm');
        armed = setTimeout(() => { armed = null; b.textContent = I18N.t('resetProgress'); }, 3000);
        return;
      }
      clearTimeout(armed); armed = null; b.textContent = I18N.t('resetProgress');
      done.clear(); store.set('done', []); renderChallenges(); buildLevelNav();
      toast(I18N.t('progressReset'));
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
    setMode(mode, { scroll: false });
    requestAnimationFrame(frame);
  }
  init();
  // Read-only hooks for automated tests and curious learners (try it in the console).
  window.mooglab = { get patch() { return { ...patch }; }, get telemetry() { return tele; }, get looper() { return looper && looper.status(); } };
})();
