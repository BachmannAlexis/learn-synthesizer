/*
 * Loop station: records the notes you play into a loop of N bars and plays them back
 * on the synth's second voice while you keep playing live on top (overdub).
 *
 * Times: `now()` is the audio clock in seconds; notes are stored in beats so tempo
 * changes keep the loop in place. Playback is scheduled ~120 ms ahead with absolute
 * sample frames, so timing does not depend on how busy the page is.
 */
function createLooper({ now, inputTime = now, sampleRate, send, click = () => {}, onChange = () => {} }) {
  const L = {
    bpm: 110, bars: 2, metronome: true, quantize: true,
    events: [], layer: 0, running: false, recording: false,
    start: 0, schedTo: 0, open: new Map(),
  };
  const LOOKAHEAD = 0.12;
  const VOICE = 1;
  const beatDur = () => 60 / L.bpm;
  const loopBeats = () => L.bars * 4;
  const loopLen = () => loopBeats() * beatDur();
  const frameOf = (t) => Math.round(t * sampleRate);
  const mod = (a, n) => ((a % n) + n) % n;

  function startClock() {
    const t = now() + 0.06;
    L.start = t;
    L.schedTo = t;
    L.running = true;
  }

  function silenceLoopVoice() {
    send({ type: 'clearQueue', voice: VOICE });
    send({ type: 'allOff', voice: VOICE });
  }

  function closeOpen() {
    const t = inputTime();
    for (const o of L.open.values()) finalize(o, t);
    L.open.clear();
  }

  function finalize(o, t) {
    const dur = Math.min(Math.max(0.06, (t - o.onAbs) / beatDur()), loopBeats() - 0.05);
    L.events.push({ note: o.note, on: o.on, dur, layer: o.layer, armedAt: o.onAbs + loopLen() * 0.5 });
  }

  const api = {
    state: L,

    // Record button: start a new loop, toggle overdub, or stop recording.
    rec() {
      if (!L.running) { L.layer++; L.recording = true; startClock(); }
      else if (L.recording) { closeOpen(); L.recording = false; }
      else { L.layer++; L.recording = true; }
      onChange();
    },

    // Play/stop button.
    toggle() {
      if (L.running) api.stop();
      else if (L.events.length) { startClock(); onChange(); }
    },

    stop() {
      closeOpen();
      L.running = false;
      L.recording = false;
      silenceLoopVoice();
      onChange();
    },

    // Remove the most recent recording pass.
    undo() {
      if (!L.layer) return;
      closeOpen();
      const top = L.layer;
      L.events = L.events.filter((e) => e.layer !== top);
      L.recording = false;
      L.layer = L.events.reduce((m, e) => Math.max(m, e.layer), 0);
      silenceLoopVoice();
      L.schedTo = Math.max(now(), L.start);
      if (!L.events.length && L.running) { L.running = false; }
      onChange();
    },

    clear() {
      api.stop();
      L.events = [];
      L.layer = 0;
      onChange();
    },

    setBpm(v) {
      v = Math.min(240, Math.max(40, Math.round(v)));
      if (L.running) {
        const beats = (now() - L.start) / beatDur();
        L.bpm = v;
        L.start = now() - beats * beatDur();
      } else L.bpm = v;
      onChange();
    },

    setBars(n) {
      if (L.events.length || L.running) return false; // length is fixed once a loop exists
      L.bars = n;
      onChange();
      return true;
    },

    noteOn(note) {
      if (!L.recording) return;
      const t = inputTime();
      let b = mod((t - L.start) / beatDur(), loopBeats());
      if (L.quantize) b = mod(Math.round(b * 4) / 4, loopBeats());
      L.open.set(note, { note, onAbs: t, on: b, layer: L.layer });
    },

    noteOff(note) {
      const o = L.open.get(note);
      if (!o) return;
      L.open.delete(note);
      finalize(o, inputTime());
    },

    // Call every ~25 ms.
    tick() {
      if (!L.running) return;
      const t0 = Math.max(L.schedTo, now()), t1 = now() + LOOKAHEAD;
      if (t1 <= t0) return;
      const bd = beatDur(), lb = loopBeats();
      const k0 = Math.floor((t0 - L.start) / (lb * bd)), k1 = Math.floor((t1 - L.start) / (lb * bd));
      for (let k = Math.max(0, k0); k <= k1; k++) {
        for (const e of L.events) {
          const t = L.start + (k * lb + e.on) * bd;
          if (t < t0 || t >= t1 || t < e.armedAt) continue;
          send({ type: 'noteOn', note: e.note, voice: VOICE, at: frameOf(t) });
          send({ type: 'noteOff', note: e.note, voice: VOICE, at: frameOf(t + e.dur * bd) });
        }
      }
      if (L.metronome) {
        for (let j = Math.max(0, Math.ceil((t0 - L.start) / bd)); L.start + j * bd < t1; j++) {
          click(L.start + j * bd, j % 4 === 0);
        }
      }
      L.schedTo = t1;
    },

    // Position within the loop, for the display.
    status() {
      const beat = L.running ? mod((now() - L.start) / beatDur(), loopBeats()) : 0;
      return {
        running: L.running, recording: L.recording, beat, loopBeats: loopBeats(),
        layers: new Set(L.events.map((e) => e.layer)).size, notes: L.events.length,
        counting: L.running && now() < L.start,
      };
    },
  };
  return api;
}

if (typeof module !== 'undefined') module.exports = { createLooper };
