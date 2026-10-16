const test = require('node:test');
const assert = require('node:assert');
const { STRINGS, NAMES_FR } = require('../js/i18n.js');
const { LESSONS_FR } = require('../js/lessons-fr.js');
const { LEVELS } = require('../js/lessons.js');
const { PARAMS, PEDALS } = require('../js/params.js');

test('every English interface string has a French translation with the same placeholders', () => {
  const vars = (s) => (Array.isArray(s) ? s.join(' ') : s).match(/\{\w+\}/g)?.sort().join() || '';
  for (const [k, en] of Object.entries(STRINGS.en)) {
    assert.ok(k in STRINGS.fr, `missing fr: ${k}`);
    assert.strictEqual(vars(STRINGS.fr[k]), vars(en), `placeholders differ: ${k}`);
  }
});

test('every lesson, tip and challenge has French text', () => {
  for (const L of LEVELS) {
    const f = LESSONS_FR[L.n];
    assert.ok(f && f.title && f.subtitle && f.theory, `level ${L.n}`);
    assert.strictEqual(f.tips.length, L.tips.length, `level ${L.n} tips count`);
    for (const c of L.challenges) assert.ok(f.challenges[c.id], `challenge ${c.id}`);
  }
});

test('every control, pedal and option has a French name', () => {
  for (const d of PARAMS.filter((d) => d.type !== 'toggle')) assert.ok(NAMES_FR.params[d.id], `param ${d.id}`);
  for (const p of PEDALS) assert.ok(NAMES_FR.pedals[p.id], `pedal ${p.id}`);
  for (const d of PARAMS.filter((d) => d.type === 'choice')) {
    for (const o of d.options) if (/[a-z]/i.test(o)) assert.ok(NAMES_FR.options[o], `option ${o}`);
  }
});
