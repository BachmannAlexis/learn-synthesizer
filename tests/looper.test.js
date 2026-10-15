const test = require('node:test');
const assert = require('node:assert');
const { createLooper } = require('../js/looper.js');

const SR = 48000;
function rig() {
  let t = 1;
  const sent = [], clicks = [];
  const lp = createLooper({ now: () => t, sampleRate: SR, send: (m) => sent.push(m), click: (at, accent) => clicks.push([at, accent]) });
  const advance = (sec) => { const end = t + sec; while (t < end) { t = Math.min(end, t + 0.025); lp.tick(); } };
  return { lp, sent, clicks, advance, at: () => t };
}

test('records notes and plays them back on the loop voice, once per cycle', () => {
  const { lp, sent, advance } = rig();
  lp.setBpm(120); // 0.5 s per beat, 2 bars = 4 s
  lp.rec();
  advance(0.06 + 1.0); // beat 2
  lp.noteOn(60);
  advance(0.5);
  lp.noteOff(60);
  advance(3.0); // finish the first pass
  lp.rec(); // stop recording, keep playing
  advance(8.1); // two more cycles
  const ons = sent.filter((m) => m.type === 'noteOn');
  assert.strictEqual(ons.length, 2, 'played once per later cycle, not during the pass it was recorded in');
  assert.ok(ons.every((m) => m.voice === 1 && m.note === 60));
  const gap = (ons[1].at - ons[0].at) / SR;
  assert.ok(Math.abs(gap - 4) < 1e-3, `cycle length ${gap}`);
  const off = sent.find((m) => m.type === 'noteOff');
  assert.ok(Math.abs((off.at - ons[0].at) / SR - 0.5) < 0.03, 'note length kept');
});

test('quantizes note starts to sixteenths', () => {
  const { lp, advance } = rig();
  lp.setBpm(120);
  lp.rec();
  advance(0.06 + 0.5 + 0.04); // 0.08 beats late
  lp.noteOn(62);
  advance(0.2);
  lp.noteOff(62);
  assert.strictEqual(lp.state.events[0].on, 1);
});

test('undo removes only the last overdub pass; clear empties the loop', () => {
  const { lp, advance } = rig();
  lp.rec();
  advance(0.5); lp.noteOn(60); advance(0.2); lp.noteOff(60);
  lp.rec(); // stop recording
  lp.rec(); // overdub
  advance(0.3); lp.noteOn(64); advance(0.2); lp.noteOff(64);
  lp.rec();
  assert.strictEqual(lp.status().layers, 2);
  lp.undo();
  assert.deepStrictEqual(lp.state.events.map((e) => e.note), [60]);
  lp.clear();
  assert.strictEqual(lp.state.events.length, 0);
  assert.strictEqual(lp.status().running, false);
});

test('metronome accents the first beat of each bar', () => {
  const { lp, clicks, advance } = rig();
  lp.setBpm(120);
  lp.rec();
  advance(2.2);
  assert.ok(clicks.length >= 4);
  assert.deepStrictEqual(clicks.slice(0, 5).map((c) => c[1]), [true, false, false, false, true]);
});

test('bars can only change while the loop is empty', () => {
  const { lp, advance } = rig();
  assert.ok(lp.setBars(4));
  lp.rec(); advance(0.3); lp.noteOn(60); advance(0.1); lp.noteOff(60); lp.stop();
  assert.strictEqual(lp.setBars(1), false);
  assert.strictEqual(lp.state.bars, 4);
});
