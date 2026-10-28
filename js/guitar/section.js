/*
 * "Pedals" section: guitar & bass pedal simulator UI. The app calls GuitarSection.init(api)
 * once, then show()/hide() when the section changes, and routes keyboard notes here.
 */
const GuitarSection = (() => {
  Object.assign(STRINGS.en, GP_TEXT.en);
  Object.assign(STRINGS.fr, GP_TEXT.fr);
  Object.assign(NAMES_FR.options, { Off: 'Arrêt' });

  let api = null, rig = null, active = false;
  const $ = (s, el = document) => el.querySelector(s);
  const t = (k, v) => I18N.t(k, v);
  const L = (o) => o[I18N.lang] || o.en;

  // ---------- state (remembered in the browser) ----------
  let uidCounter = 0;
  const uid = () => 'p' + Date.now().toString(36) + (uidCounter++);
  const mkPedal = (type, params = {}) => ({ uid: uid(), type, on: true, params: { ...gpDefaults(type), ...params } });
  const fromPreset = (inst, name) => {
    const P = GP_PRESETS[inst][name];
    return { chain: P.chain.map(([type, p]) => mkPedal(type, p)), amp: { ...gpDefaults('amp'), cab: GP_INSTRUMENTS[inst].cab, ...P.amp } };
  };
  const saved = (() => { try { return JSON.parse(localStorage.getItem('mooglab.gp') || 'null'); } catch { return null; } })();
  const state = {
    instrument: 'guitar',
    boards: { guitar: fromPreset('guitar', 'Clean & shiny'), bass: fromPreset('bass', 'Rock grind') },
    riff: { guitar: Object.keys(GP_RIFFS.guitar)[0], bass: Object.keys(GP_RIFFS.bass)[0] },
    inputGain: 1, mute: false, voice: 'strings', moogSound: 'Fat Bass',
    ...(saved || {}),
  };
  if (!PRESETS[state.moogSound]) state.moogSound = 'Fat Bass';
  // Pedals saved by an older version may miss new controls: fill them with defaults.
  for (const inst of Object.keys(state.boards)) {
    const b = state.boards[inst];
    b.chain = (b.chain || []).filter((c) => GP_PEDALS[c.type]).map((c) => ({ ...c, params: { ...gpDefaults(c.type), ...c.params } }));
    b.amp = { ...gpDefaults('amp'), ...b.amp };
  }
  const save = () => { try { localStorage.setItem('mooglab.gp', JSON.stringify(state)); } catch { /* storage unavailable */ } };
  const board = () => state.boards[state.instrument];

  // ---------- audio ----------
  async function ensureRig() {
    if (rig) return rig;
    await api.startAudio();
    const ctx = api.getCtx();
    if (!ctx) return null;
    rig = createGuitarRig(ctx, api.getOutput() || ctx.destination);
    rig.setInputGain(state.inputGain);
    applyBoard();
    routeVoice();
    return rig;
  }
  // The Moog synth can be the "instrument" plugged into the pedalboard.
  const usesSynth = () => state.voice === 'moog';
  function routeVoice() {
    if (!rig || !active) return;
    api.routeSynth(usesSynth() ? rig.input : null);
    if (usesSynth()) api.setSynthSound(state.moogSound);
  }
  const synthPlayer = {
    play(notes, t, dur) { api.synthNoteAt(Math.min(...notes), t, dur); }, // monophonic: the lowest note
    stop() { api.synthStop(); },
  };
  function applyBoard() {
    if (!rig) return;
    rig.setChain(board().chain);
    rig.setAmp(board().amp);
    rig.setMuted(state.mute && tuner.reading);
  }

  // ---------- rendering ----------
  const knobsIO = new Map(); // control ids -> update fns for this section
  const io = (get, set) => ({ get, set, register: (id, fn) => knobsIO.set(id, fn) });

  function render() {
    if (!api) return;
    knobsIO.clear();
    I18N.apply($('#gp'));
    $('#gp-points').innerHTML = STRINGS[I18N.lang].gpPoints.map((x) => `<li>${x}</li>`).join('');
    // instrument switch
    for (const inst of Object.keys(GP_INSTRUMENTS)) {
      const b = $('#gp-inst-' + inst);
      b.textContent = L(GP_INSTRUMENTS[inst].name);
      b.setAttribute('aria-pressed', state.instrument === inst);
    }
    renderSources();
    renderBoard();
    renderTunerStrings();
    $('#gp-mute').checked = state.mute;
    if (learn.target) openLearn(learn.target);
  }

  function renderSources() {
    const sel = $('#gp-riff');
    sel.innerHTML = Object.keys(GP_RIFFS[state.instrument]).map((k) => `<option value="${k}">${k}</option>`).join('');
    sel.value = state.riff[state.instrument];
    $('#gp-riff-play').textContent = t(rig && rig.riffPlaying ? 'gpStopRiff' : 'gpPlayRiff');
    $('#gp-riff-play').setAttribute('aria-pressed', !!(rig && rig.riffPlaying));
    $('#gp-mic').textContent = t(rig && rig.micOn ? 'gpMicOff' : 'gpMic');
    $('#gp-mic').setAttribute('aria-pressed', !!(rig && rig.micOn));
    $('#gp-mic-note').hidden = !(rig && rig.micOn);
    $('#gp-file-stop').hidden = !(rig && rig.filePlaying);
    $('#gp-voice-strings').setAttribute('aria-pressed', !usesSynth());
    $('#gp-voice-moog').setAttribute('aria-pressed', usesSynth());
    $('#gp-moog-row').hidden = !usesSynth();
    $('#gp-moog-hint').hidden = !usesSynth();
    const ms = $('#gp-moog-sound');
    ms.innerHTML = Object.keys(PRESETS).map((k) => `<option value="${k}">${k}</option>`).join('');
    ms.value = state.moogSound;
    const k = $('#gp-in-knob');
    k.innerHTML = '';
    const def = { id: 'gpInput', labels: { en: STRINGS.en.gpInputLevel, fr: STRINGS.fr.gpInputLevel }, min: 0.1, max: 4, def: 1, curve: 'log', fmt: 'x' };
    k.appendChild(api.makeKnob(def, io(() => state.inputGain, (id, v) => {
      state.inputGain = Math.min(def.max, Math.max(def.min, v)); save();
      if (rig) rig.setInputGain(state.inputGain);
      knobsIO.get(id)();
    })));
    knobsIO.forEach((f) => f());
  }

  function pedalIO(p) {
    return io((id) => p.params[id], (id, v) => {
      const d = GP_PEDALS[p.type].params.find((x) => x.id === id);
      p.params[id] = d.type ? v : Math.min(d.max, Math.max(d.min, v));
      save();
      if (rig) rig.updatePedal(p);
      const f = knobsIO.get(p.uid + id); if (f) f();
      renderFlow();
      if (learn.target === p.uid) drawLearn();
    });
  }

  function renderBoard() {
    const b = board(), wrap = $('#gp-pedals');
    // preset + add menus
    $('#gp-preset').innerHTML = `<option value="">${t('gpPreset')}</option>` + Object.keys(GP_PRESETS[state.instrument]).map((k) => `<option value="${k}">${k}</option>`).join('');
    const cats = Object.entries(GP_CATEGORIES).sort((a, c) => a[1].order - c[1].order);
    $('#gp-add').innerHTML = `<option value="">${t('gpAdd')}</option>` + cats.map(([cid, c]) =>
      `<optgroup label="${L(c.name)}">` + Object.entries(GP_PEDALS).filter(([, p]) => p.cat === cid).map(([id, p]) => `<option value="${id}">${L(p.name)}</option>`).join('') + '</optgroup>').join('');
    wrap.innerHTML = '';
    if (!b.chain.length) wrap.innerHTML = `<p class="gp-empty">${t('gpEmpty')}</p>`;
    b.chain.forEach((p, i) => {
      const P = GP_PEDALS[p.type];
      const el = document.createElement('div');
      el.className = 'pedal gp-pedal' + (p.on ? ' on' : '');
      el.style.setProperty('--body', P.color);
      el.dataset.uid = p.uid;
      el.innerHTML = `
        <div class="gp-pedal-top">
          <button type="button" class="gp-mini" data-act="left" title="${t('gpMoveLeft')}" aria-label="${t('gpMoveLeft')}" ${i === 0 ? 'disabled' : ''}>◀</button>
          <span class="gp-cat">${L(GP_CATEGORIES[P.cat].name)}</span>
          <button type="button" class="gp-mini" data-act="right" title="${t('gpMoveRight')}" aria-label="${t('gpMoveRight')}" ${i === b.chain.length - 1 ? 'disabled' : ''}>▶</button>
          <button type="button" class="gp-mini gp-q" data-act="learn" title="${t('gpLearnBtn')}" aria-label="${t('gpLearnBtn')}: ${L(P.name)}">?</button>
          <button type="button" class="gp-mini gp-x" data-act="remove" title="${t('gpRemove', { name: L(P.name) })}" aria-label="${t('gpRemove', { name: L(P.name) })}">✕</button>
        </div>
        <div class="pedal-knobs"></div>
        <div class="pedal-name">${L(P.name)}</div>
        <p class="pedal-blurb">${L(P.blurb)}</p>
        <span class="led" aria-hidden="true"></span>
        <button type="button" class="footswitch" aria-pressed="${p.on}" aria-label="${t('onOff', { name: L(P.name) })}"></button>`;
      const pio = pedalIO(p);
      const keyed = { ...pio, register: (id, fn) => knobsIO.set(p.uid + id, fn) };
      for (const d of P.params) {
        const def = { ...d, id: d.id };
        $('.pedal-knobs', el).appendChild(d.type ? api.makeChoice(def, keyed) : api.makeKnob(def, keyed));
      }
      el.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (act && act.dataset.act === 'learn') { openLearn(p.uid); return; }
        if (act) {
          const a = act.dataset.act;
          if (a === 'remove') { b.chain.splice(i, 1); if (learn.target === p.uid) closeLearn(); }
          else { const j = a === 'left' ? i - 1 : i + 1; [b.chain[i], b.chain[j]] = [b.chain[j], b.chain[i]]; }
          structureChanged();
        }
        if (e.target.closest('.footswitch')) {
          p.on = !p.on; save();
          el.classList.toggle('on', p.on);
          e.target.closest('.footswitch').setAttribute('aria-pressed', p.on);
          if (rig) rig.updatePedal(p);
          renderFlow();
        }
      });
      wrap.appendChild(el);
    });
    // amp block
    const ampEl = $('#gp-amp-knobs');
    ampEl.innerHTML = '';
    const aio = { get: (id) => b.amp[id], set: (id, v) => {
      const d = GP_AMP.params.find((x) => x.id === id);
      b.amp[id] = d.type ? v : Math.min(d.max, Math.max(d.min, v));
      save(); if (rig) rig.setAmp(b.amp);
      const f = knobsIO.get('amp' + id); if (f) f();
      if (learn.target === 'amp') drawLearn();
    }, register: (id, fn) => knobsIO.set('amp' + id, fn) };
    for (const d of GP_AMP.params) ampEl.appendChild(d.type ? api.makeChoice(d, aio) : api.makeKnob(d, aio));
    $('#gp-amp-name').textContent = L(GP_AMP.name);
    $('#gp-amp-blurb').textContent = L(GP_AMP.blurb);
    knobsIO.forEach((f) => f());
    renderFlow();
  }

  // The chain chips are buttons: they pick what the "before & after" view compares.
  function renderFlow() {
    if (compare.target !== 'all' && compare.target !== 'amp' && !board().chain.some((p) => p.uid === compare.target)) compare.target = 'all';
    const chip = (target, cls, text, style = '') => {
      const on = compare.target === target || (target === 'all' && compare.target === 'all');
      return `<button type="button" class="gp-chip ${cls}" data-cmp="${target}" aria-pressed="${on}" title="${t('gpPickChip', { name: text })}" ${style}>${text}</button>`;
    };
    const chips = [chip('all', 'io', t('gpIn'))]
      .concat(board().chain.map((p) => chip(p.uid, p.on ? '' : 'off', L(GP_PEDALS[p.type].name), `style="--body:${GP_PEDALS[p.type].color}"`)))
      .concat([chip('amp', 'io', t('gpAmpOut')), chip('all', 'io', t('gpOut'))]);
    $('#gp-flow').innerHTML = chips.join('<i aria-hidden="true">→</i>');
    renderCompareTitle();
  }
  const compare = { target: 'all' };
  function compareName() {
    if (compare.target === 'all') return t('gpWhole');
    if (compare.target === 'amp') return L(GP_AMP.name);
    const p = board().chain.find((x) => x.uid === compare.target);
    return p ? L(GP_PEDALS[p.type].name) + (p.on ? '' : ' ' + t('gpBypassed')) : t('gpWhole');
  }
  function renderCompareTitle() { $('#gp-compare-what').textContent = t('gpComparing', { what: compareName() }); }
  function setCompare(target) { compare.target = target; renderFlow(); }

  function structureChanged() { save(); if (rig) rig.setChain(board().chain); renderBoard(); }

  // ---------- "How it works" panel ----------
  const learn = { target: null };
  function learnSubject() {
    if (learn.target === 'amp') return { type: 'amp', name: GP_AMP.name, params: board().amp };
    const p = board().chain.find((x) => x.uid === learn.target);
    return p && { type: p.type, name: GP_PEDALS[p.type].name, params: p.params };
  }
  function openLearn(target) {
    learn.target = target;
    const s = learnSubject();
    if (!s) return closeLearn();
    const info = GP_LEARN[s.type];
    $('#gp-learn').hidden = false;
    $('#gp-learn-title').textContent = t('gpLearnTitle', { name: L(s.name) });
    $('#gp-learn-what').innerHTML = L(info.what);
    $('#gp-learn-how').innerHTML = L(info.how);
    $('#gp-learn-math').innerHTML = info.math;
    $('#gp-learn-listen').innerHTML = L(info.listen);
    $('#gp-learn-diagram').innerHTML = info.diagram.map((d) => `<span class="gp-chip io">${typeof d === 'string' ? d : L(d)}</span>`).join('<i aria-hidden="true">→</i>');
    const cap = { transfer: 'gpPlotTransfer', response: 'gpPlotResponse', compressor: 'gpPlotCompressor', octave: 'gpPlotOctave', lfo: 'gpPlotLfo', impulse: 'gpPlotImpulse' }[info.plot];
    $('#gp-learn-caption').textContent = t(cap);
    document.querySelectorAll('.gp-pedal, .gp-amp').forEach((e) => e.classList.toggle('learning', e.dataset.uid === target || (target === 'amp' && e.classList.contains('gp-amp'))));
    drawLearn();
    setCompare(target); // the before & after view follows the pedal being studied
  }
  function drawLearn() {
    const s = learnSubject();
    if (s) GPLearnPlot.draw($('#gp-learn-plot'), s.type, s.params, { cab: board().amp.cab });
  }
  function closeLearn() {
    learn.target = null;
    $('#gp-learn').hidden = true;
    document.querySelectorAll('.learning').forEach((e) => e.classList.remove('learning'));
  }

  // ---------- tuner ----------
  const tuner = { buf: null, last: 0, reading: false, hold: 0 };
  function renderTunerStrings() {
    $('#gp-strings').innerHTML = GP_INSTRUMENTS[state.instrument].strings.map((m) => `<span data-midi="${m}">${GPPitch.name(m)}</span>`).join('');
  }
  function updateTuner(now) {
    if (!rig || now - tuner.last < 80) return;
    tuner.last = now;
    const a = rig.analyserIn;
    if (!tuner.buf || tuner.buf.length !== a.fftSize) tuner.buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(tuner.buf);
    const f = GPPitch.detect(tuner.buf, api.getCtx().sampleRate, state.instrument === 'bass' ? 28 : 60, 1200);
    const noteEl = $('#gp-note'), needle = $('#gp-needle');
    if (!f) {
      if (now - tuner.hold > 1200) {
        noteEl.textContent = '—'; $('#gp-hz').textContent = t('gpTunerIdle'); needle.style.left = '50%';
        $('#gp-tuner').dataset.state = 'idle';
        if (tuner.reading) { tuner.reading = false; if (state.mute) rig.setMuted(false); }
      }
      return;
    }
    tuner.hold = now;
    if (!tuner.reading) { tuner.reading = true; if (state.mute) rig.setMuted(true); }
    const n = GPPitch.note(f);
    noteEl.innerHTML = `${n.name}<small>${n.octave}</small>`;
    $('#gp-hz').textContent = `${f.toFixed(1)} Hz · ${n.cents > 0 ? '+' : ''}${n.cents} cents`;
    needle.style.left = 50 + Math.max(-50, Math.min(50, n.cents)) + '%';
    $('#gp-tuner').dataset.state = Math.abs(n.cents) <= 5 ? 'in' : 'off';
    // highlight the nearest open string
    const strings = GP_INSTRUMENTS[state.instrument].strings;
    const near = strings.reduce((a, m) => (Math.abs(m - n.midi) < Math.abs(a - n.midi) ? m : a), strings[0]);
    document.querySelectorAll('#gp-strings span').forEach((s) => s.classList.toggle('near', +s.dataset.midi === near && Math.abs(near - n.midi) <= 2));
  }

  // ---------- meters & scopes ----------
  const meterBuf = new Float32Array(2048);
  function meter(analyser, el) {
    analyser.getFloatTimeDomainData(meterBuf);
    let pk = 0;
    for (let i = 0; i < meterBuf.length; i++) pk = Math.max(pk, Math.abs(meterBuf[i]));
    const dbv = 20 * Math.log10(pk + 1e-9);
    el.style.setProperty('--lvl', Math.max(0, Math.min(100, (dbv + 48) / 48 * 100)) + '%');
    el.classList.toggle('hot', dbv > -1);
  }
  function frame(now) {
    if (!active) return;
    if (rig) {
      updateTuner(now);
      meter(rig.analyserIn, $('#gp-meter-in'));
    }
    const [A, B] = rig ? rig.taps(compare.target) : [null, null];
    const lv = GPCompare.draw({ wave: $('#gp-cmp-wave'), spec: $('#gp-cmp-spec'), diff: $('#gp-cmp-diff') }, A, B, rig ? api.getCtx().sampleRate : 48000, compare.target);
    if (now - (frame.lastLv || 0) > 250) {
      frame.lastLv = now;
      $('#gp-levels').textContent = lv ? t('gpLevels', { a: lv.before.toFixed(1), b: lv.after.toFixed(1), d: (lv.after - lv.before >= 0 ? '+' : '') + (lv.after - lv.before).toFixed(1) }) : '';
    }
  }

  // ---------- events ----------
  function bind() {
    for (const inst of Object.keys(GP_INSTRUMENTS)) {
      $('#gp-inst-' + inst).addEventListener('click', () => {
        if (state.instrument === inst) return;
        const playing = rig && rig.riffPlaying;
        if (rig) rig.stopRiff();
        state.instrument = inst; save();
        applyBoard();
        api.setOctave(GP_INSTRUMENTS[inst].octave);
        render();
        if (playing) toggleRiff();
      });
    }
    $('#gp-riff').addEventListener('change', (e) => {
      state.riff[state.instrument] = e.target.value; save();
      if (rig && rig.riffPlaying) { rig.stopRiff(); toggleRiff(); }
    });
    $('#gp-riff-play').addEventListener('click', toggleRiff);
    $('#gp-mic').addEventListener('click', async () => {
      const r = await ensureRig();
      if (!r) return;
      if (r.micOn) r.disableMic();
      else {
        try { await r.enableMic(); } catch (err) { api.toast(t('gpMicDenied', { msg: err.name || err.message })); }
      }
      renderSources();
    });
    $('#gp-file').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const r = await ensureRig();
      try { await r.playFile(await f.arrayBuffer()); } catch (err) { api.toast(t('gpFileBad', { msg: err.message || err.name })); }
      renderSources();
    });
    $('#gp-file-stop').addEventListener('click', () => { if (rig) rig.stopFile(); renderSources(); });
    $('#gp-preset').addEventListener('change', (e) => {
      if (!e.target.value) return;
      state.boards[state.instrument] = fromPreset(state.instrument, e.target.value);
      save(); applyBoard(); renderBoard();
      $('#gp-preset').value = '';
    });
    $('#gp-add').addEventListener('change', (e) => {
      if (!e.target.value) return;
      board().chain.push(mkPedal(e.target.value));
      structureChanged();
    });
    $('#gp-order').addEventListener('click', () => {
      board().chain.sort((a, b) => GP_CATEGORIES[GP_PEDALS[a.type].cat].order - GP_CATEGORIES[GP_PEDALS[b.type].cat].order);
      structureChanged();
      api.toast(t('gpOrdered'));
    });
    $('#gp-clear').addEventListener('click', () => { board().chain = []; structureChanged(); });
    $('#gp-mute').addEventListener('change', (e) => { state.mute = e.target.checked; save(); if (rig) rig.setMuted(state.mute && tuner.reading); });
    $('#gp-amp-learn').addEventListener('click', () => { openLearn('amp'); $('#gp-learn').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    $('#gp-learn-close').addEventListener('click', closeLearn);
    $('#gp-flow').addEventListener('click', (e) => { const c = e.target.closest('[data-cmp]'); if (c) setCompare(c.dataset.cmp); });
    for (const v of ['strings', 'moog']) {
      $('#gp-voice-' + v).addEventListener('click', async () => {
        if (state.voice === v) return;
        const playing = rig && rig.riffPlaying;
        if (rig) rig.stopRiff();
        api.allNotesOff();
        state.voice = v; save();
        await ensureRig();
        routeVoice();
        renderSources();
        if (playing) toggleRiff();
      });
    }
    $('#gp-moog-sound').addEventListener('change', (e) => { state.moogSound = e.target.value; save(); routeVoice(); });
  }

  async function toggleRiff() {
    const r = await ensureRig();
    if (!r) return;
    if (r.riffPlaying) r.stopRiff();
    else r.playRiff(GP_RIFFS[state.instrument][state.riff[state.instrument]], state.instrument, usesSynth() ? synthPlayer : null);
    renderSources();
  }

  return {
    init(a) { api = a; bind(); render(); },
    show() { active = true; api.setOctave(GP_INSTRUMENTS[state.instrument].octave); render(); routeVoice(); },
    hide() { active = false; if (rig) { rig.stopAll(); rig.disableMic(); } api.routeSynth(null); },
    get usesSynth() { return usesSynth(); },
    prepare: ensureRig,
    render,
    frame,
    toggleRiff,
    async noteOn(midi) { const r = await ensureRig(); if (r) r.noteOn(midi, state.instrument); },
    noteOff(midi) { if (rig) rig.noteOff(midi); },
    get state() { return state; },
    get rig() { return rig; },
  };
})();
