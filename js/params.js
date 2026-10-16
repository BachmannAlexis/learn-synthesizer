/* Parameter definitions, level patches and presets. */
const WAVES = ['Sine', 'Tri', 'Saw', 'Square', 'Wide', 'Narrow'];
const RANGES = ["32'", "16'", "8'", "4'", "2'"];
const LFO_WAVES = ['Sine', 'Tri', 'Square', 'Saw', 'S&H'];

// curve: 'lin' | 'log' ; fmt: how to display
const PARAMS = [
  // Oscillators
  { id: 'osc1Wave', label: 'Wave', section: 'osc1', type: 'choice', options: WAVES, def: 2, level: 1 },
  { id: 'osc1Range', label: 'Range', section: 'osc1', type: 'choice', options: RANGES, def: 2, level: 1 },
  { id: 'osc2Wave', label: 'Wave', section: 'osc2', type: 'choice', options: WAVES, def: 2, level: 4 },
  { id: 'osc2Range', label: 'Range', section: 'osc2', type: 'choice', options: RANGES, def: 2, level: 4 },
  { id: 'osc2Detune', label: 'Detune', section: 'osc2', min: -7, max: 7, def: 0, fmt: 'st', level: 4 },
  { id: 'osc3Wave', label: 'Wave', section: 'osc3', type: 'choice', options: WAVES, def: 2, level: 4 },
  { id: 'osc3Range', label: 'Range', section: 'osc3', type: 'choice', options: RANGES, def: 2, level: 4 },
  { id: 'osc3Detune', label: 'Detune', section: 'osc3', min: -7, max: 7, def: 0, fmt: 'st', level: 4 },
  // Mixer
  { id: 'osc1Level', label: 'Osc 1', section: 'mixer', min: 0, max: 1, def: 0.8, fmt: 'pct', level: 4 },
  { id: 'osc2Level', label: 'Osc 2', section: 'mixer', min: 0, max: 1, def: 0, fmt: 'pct', level: 4 },
  { id: 'osc3Level', label: 'Osc 3', section: 'mixer', min: 0, max: 1, def: 0, fmt: 'pct', level: 4 },
  { id: 'noiseLevel', label: 'Noise', section: 'mixer', min: 0, max: 1, def: 0, fmt: 'pct', level: 4 },
  // Filter
  { id: 'cutoff', label: 'Cutoff', section: 'filter', min: 20, max: 20000, def: 20000, curve: 'log', fmt: 'hz', level: 2 },
  { id: 'resonance', label: 'Emphasis', section: 'filter', min: 0, max: 1, def: 0, fmt: 'pct', level: 2 },
  { id: 'drive', label: 'Drive', section: 'filter', min: 0.5, max: 5, def: 1, curve: 'log', fmt: 'x', level: 2 },
  { id: 'filterEnvAmt', label: 'Contour Amt', section: 'filter', min: 0, max: 5, def: 0, fmt: 'oct', level: 3 },
  { id: 'keyTrack', label: 'Key Track', section: 'filter', min: 0, max: 1, def: 0.33, fmt: 'pct', level: 5 },
  // Filter contour
  { id: 'fA', label: 'Attack', section: 'fenv', min: 0.001, max: 10, def: 0.005, curve: 'log', fmt: 's', level: 3 },
  { id: 'fD', label: 'Decay', section: 'fenv', min: 0.001, max: 10, def: 0.4, curve: 'log', fmt: 's', level: 3 },
  { id: 'fS', label: 'Sustain', section: 'fenv', min: 0, max: 1, def: 0, fmt: 'pct', level: 3 },
  { id: 'fR', label: 'Release', section: 'fenv', min: 0.001, max: 10, def: 0.2, curve: 'log', fmt: 's', level: 3 },
  // Loudness contour
  { id: 'aA', label: 'Attack', section: 'aenv', min: 0.001, max: 10, def: 0.004, curve: 'log', fmt: 's', level: 3 },
  { id: 'aD', label: 'Decay', section: 'aenv', min: 0.001, max: 10, def: 0.3, curve: 'log', fmt: 's', level: 3 },
  { id: 'aS', label: 'Sustain', section: 'aenv', min: 0, max: 1, def: 1, fmt: 'pct', level: 3 },
  { id: 'aR', label: 'Release', section: 'aenv', min: 0.001, max: 10, def: 0.06, curve: 'log', fmt: 's', level: 3 },
  // Modulation
  { id: 'lfoRate', label: 'LFO Rate', section: 'mod', min: 0.05, max: 30, def: 5, curve: 'log', fmt: 'hz', level: 5 },
  { id: 'lfoWave', label: 'LFO Wave', section: 'mod', type: 'choice', options: LFO_WAVES, def: 1, level: 5 },
  { id: 'lfoPitch', label: '→ Pitch', section: 'mod', min: 0, max: 12, def: 0.4, curve: 'sq', fmt: 'st', level: 5 },
  { id: 'lfoFilter', label: '→ Filter', section: 'mod', min: 0, max: 4, def: 0, fmt: 'oct', level: 5 },
  { id: 'glide', label: 'Glide', section: 'mod', min: 0, max: 3, def: 0, curve: 'sq', fmt: 's', level: 5 },
  // Output
  { id: 'master', label: 'Volume', section: 'output', min: 0, max: 1, def: 0.7, fmt: 'pct', level: 1 },
  // Performance (driven by the mod wheel, shown in the keyboard area)
  { id: 'modWheel', label: 'Mod', section: 'perf', min: 0, max: 1, def: 0, fmt: 'pct', level: 5 },
  // Effect pedals (after the synth, available on every level; not part of synth patches)
  { id: 'fxDriveOn', label: 'On', pedal: 'drive', type: 'toggle', def: 0, level: 1, fx: true },
  { id: 'fxDriveGain', label: 'Gain', pedal: 'drive', min: 1, max: 40, def: 6, curve: 'log', fmt: 'x', level: 1, fx: true },
  { id: 'fxDriveTone', label: 'Tone', pedal: 'drive', min: 400, max: 12000, def: 3500, curve: 'log', fmt: 'hz', level: 1, fx: true },
  { id: 'fxDriveLevel', label: 'Level', pedal: 'drive', min: 0, max: 1, def: 0.5, fmt: 'pct', level: 1, fx: true },
  { id: 'fxChorusOn', label: 'On', pedal: 'chorus', type: 'toggle', def: 0, level: 1, fx: true },
  { id: 'fxChorusRate', label: 'Rate', pedal: 'chorus', min: 0.05, max: 6, def: 0.6, curve: 'log', fmt: 'hz', level: 1, fx: true },
  { id: 'fxChorusDepth', label: 'Depth', pedal: 'chorus', min: 0, max: 1, def: 0.5, fmt: 'pct', level: 1, fx: true },
  { id: 'fxChorusMix', label: 'Mix', pedal: 'chorus', min: 0, max: 1, def: 0.6, fmt: 'pct', level: 1, fx: true },
  { id: 'fxDelayOn', label: 'On', pedal: 'delay', type: 'toggle', def: 0, level: 1, fx: true },
  { id: 'fxDelayTime', label: 'Time', pedal: 'delay', min: 0.03, max: 1.5, def: 0.36, curve: 'log', fmt: 's', level: 1, fx: true },
  { id: 'fxDelayFeedback', label: 'Repeats', pedal: 'delay', min: 0, max: 0.92, def: 0.4, fmt: 'pct', level: 1, fx: true },
  { id: 'fxDelayMix', label: 'Mix', pedal: 'delay', min: 0, max: 1, def: 0.35, fmt: 'pct', level: 1, fx: true },
  { id: 'fxReverbOn', label: 'On', pedal: 'reverb', type: 'toggle', def: 0, level: 1, fx: true },
  { id: 'fxReverbSize', label: 'Size', pedal: 'reverb', min: 0.3, max: 8, def: 2.5, curve: 'log', fmt: 's', level: 1, fx: true },
  { id: 'fxReverbTone', label: 'Tone', pedal: 'reverb', min: 1000, max: 16000, def: 6000, curve: 'log', fmt: 'hz', level: 1, fx: true },
  { id: 'fxReverbMix', label: 'Mix', pedal: 'reverb', min: 0, max: 1, def: 0.3, fmt: 'pct', level: 1, fx: true },
];

const PEDALS = [
  { id: 'drive', name: 'Overdrive', blurb: 'Clips the waveform: more harmonics, more grit.' },
  { id: 'chorus', name: 'Chorus', blurb: 'Adds slightly detuned, wobbling copies for width.' },
  { id: 'delay', name: 'Echo', blurb: 'Repeats what you play after a set time.' },
  { id: 'reverb', name: 'Reverb', blurb: 'Places the sound in a room or hall.' },
];
const isFx = (id) => !!(PARAM_BY_ID[id] && PARAM_BY_ID[id].fx);

var PARAM_BY_ID = Object.fromEntries(PARAMS.map((p) => [p.id, p]));

const SECTIONS = [
  { id: 'osc1', title: 'Oscillator 1' },
  { id: 'osc2', title: 'Oscillator 2' },
  { id: 'osc3', title: 'Oscillator 3' },
  { id: 'mixer', title: 'Mixer' },
  { id: 'filter', title: 'Ladder Filter' },
  { id: 'fenv', title: 'Filter Contour' },
  { id: 'aenv', title: 'Loudness Contour' },
  { id: 'mod', title: 'Modulation' },
  { id: 'output', title: 'Output' },
];

function defaultPatch() {
  return Object.fromEntries(PARAMS.map((p) => [p.id, p.def]));
}

// Starting patch for each level (overrides on top of the defaults).
const LEVEL_PATCHES = {
  1: { osc1Wave: 2 },
  2: { osc1Wave: 2, cutoff: 900, resonance: 0.3 },
  3: {
    osc1Wave: 2, cutoff: 400, resonance: 0.35, filterEnvAmt: 2.5,
    fA: 0.005, fD: 0.35, fS: 0.15, fR: 0.3, aA: 0.005, aD: 0.6, aS: 0.6, aR: 0.25,
  },
  4: {
    osc1Wave: 2, cutoff: 500, resonance: 0.3, filterEnvAmt: 2.2,
    fA: 0.005, fD: 0.4, fS: 0.2, fR: 0.3, aA: 0.005, aD: 0.6, aS: 0.7, aR: 0.25,
    osc1Level: 0.7, osc2Level: 0.6, osc2Detune: 0, osc3Level: 0.5, osc3Range: 1,
  },
  5: {
    osc1Wave: 2, cutoff: 700, resonance: 0.35, filterEnvAmt: 2,
    fA: 0.005, fD: 0.5, fS: 0.3, fR: 0.3, aA: 0.005, aD: 0.6, aS: 0.8, aR: 0.3,
    osc1Level: 0.7, osc2Level: 0.6, osc2Detune: 0.06, osc3Level: 0,
    lfoRate: 5.5, lfoWave: 0, lfoPitch: 0.4, lfoFilter: 0, glide: 0,
  },
  6: null, // sandbox: starts from the first preset
};

// Each preset only changes what it lists; the rest stays at the defaults.
// Simple presets come first so every level has sounds made only from controls you can see.
const PRESETS = {
  'Pure Sine': { osc1Wave: 0 },
  'Soft Flute': { osc1Wave: 1, osc1Range: 3 },
  'Hollow Square': { osc1Wave: 3, osc1Range: 2 },
  'Nasal Reed': { osc1Wave: 5, osc1Range: 3 },
  'Deep Saw': { osc1Wave: 2, osc1Range: 0 },
  'Muted Saw': { osc1Wave: 2, cutoff: 450, resonance: 0.15 },
  'Resonant Sweep': { osc1Wave: 2, cutoff: 1200, resonance: 0.8 },
  'Gritty Square': { osc1Wave: 3, osc1Range: 1, cutoff: 900, resonance: 0.3, drive: 3.5 },
  'Bwow Bass': {
    osc1Wave: 2, osc1Range: 1, cutoff: 160, resonance: 0.4, filterEnvAmt: 3.4,
    fA: 0.003, fD: 0.3, fS: 0.05, fR: 0.2, aA: 0.003, aD: 0.5, aS: 0.7, aR: 0.12,
  },
  'Slow Swell': {
    osc1Wave: 2, cutoff: 600, resonance: 0.2, filterEnvAmt: 1.5,
    fA: 1.8, fD: 1, fS: 0.6, fR: 1.5, aA: 1.5, aD: 1, aS: 0.9, aR: 1.8,
  },
  'Detuned Stack': {
    osc1Wave: 2, osc2Wave: 2, osc2Detune: 0.12, osc3Wave: 2, osc3Detune: -0.1,
    osc1Level: 0.7, osc2Level: 0.7, osc3Level: 0.7, cutoff: 1500, resonance: 0.15,
  },
  'Power Fifths': {
    osc1Wave: 2, osc2Wave: 2, osc2Detune: 7, osc3Wave: 3, osc3Range: 1,
    osc1Level: 0.7, osc2Level: 0.6, osc3Level: 0.5, cutoff: 1100, resonance: 0.2, drive: 2,
  },
  'Vibrato Lead': {
    osc1Wave: 3, osc2Wave: 2, osc2Detune: 0.05, osc1Level: 0.8, osc2Level: 0.6,
    cutoff: 2000, resonance: 0.2, glide: 0.12, lfoRate: 5.8, lfoWave: 0, lfoPitch: 0.35, modWheel: 0.6,
  },
  'Fat Bass': {
    osc1Wave: 2, osc1Range: 1, osc2Wave: 2, osc2Range: 1, osc2Detune: 0.1, osc3Wave: 3, osc3Range: 0,
    osc1Level: 0.8, osc2Level: 0.7, osc3Level: 0.6, noiseLevel: 0,
    cutoff: 180, resonance: 0.25, drive: 1.8, filterEnvAmt: 2.6, keyTrack: 0.33,
    fA: 0.003, fD: 0.28, fS: 0.1, fR: 0.15, aA: 0.003, aD: 0.4, aS: 0.85, aR: 0.08,
    glide: 0, lfoPitch: 0, lfoFilter: 0,
  },
  'Lead (Lucky Man)': {
    osc1Wave: 3, osc1Range: 2, osc2Wave: 2, osc2Range: 2, osc2Detune: 0.07, osc3Wave: 2, osc3Range: 3,
    osc1Level: 0.8, osc2Level: 0.7, osc3Level: 0.3, noiseLevel: 0,
    cutoff: 1400, resonance: 0.2, drive: 1.3, filterEnvAmt: 1.2, keyTrack: 0.66,
    fA: 0.03, fD: 0.8, fS: 0.6, fR: 0.4, aA: 0.01, aD: 0.5, aS: 1, aR: 0.35,
    glide: 0.25, lfoRate: 5.5, lfoWave: 0, lfoPitch: 0.35, lfoFilter: 0, modWheel: 0.4,
  },
  'Brass': {
    osc1Wave: 2, osc1Range: 2, osc2Wave: 2, osc2Range: 2, osc2Detune: -0.09, osc3Wave: 2, osc3Range: 1,
    osc1Level: 0.8, osc2Level: 0.8, osc3Level: 0.4, noiseLevel: 0,
    cutoff: 350, resonance: 0.1, drive: 1.2, filterEnvAmt: 2.8, keyTrack: 0.5,
    fA: 0.12, fD: 0.6, fS: 0.45, fR: 0.3, aA: 0.06, aD: 0.4, aS: 0.9, aR: 0.25,
    glide: 0, lfoPitch: 0, lfoFilter: 0,
  },
  'Acid Squelch': {
    osc1Wave: 2, osc1Range: 1, osc1Level: 0.9, osc2Level: 0, osc3Level: 0, noiseLevel: 0,
    cutoff: 220, resonance: 0.82, drive: 2.5, filterEnvAmt: 3.5, keyTrack: 0.5,
    fA: 0.002, fD: 0.18, fS: 0, fR: 0.12, aA: 0.002, aD: 0.3, aS: 0.7, aR: 0.08,
    glide: 0.06, lfoPitch: 0, lfoFilter: 0,
  },
  'Wobble': {
    osc1Wave: 2, osc1Range: 0, osc2Wave: 3, osc2Range: 1, osc2Detune: 0.05,
    osc1Level: 0.8, osc2Level: 0.7, osc3Level: 0, noiseLevel: 0,
    cutoff: 160, resonance: 0.6, drive: 2, filterEnvAmt: 0.5, keyTrack: 0.33,
    fA: 0.01, fD: 0.3, fS: 1, fR: 0.2, aA: 0.005, aD: 0.3, aS: 1, aR: 0.15,
    lfoRate: 3, lfoWave: 1, lfoPitch: 0, lfoFilter: 3, modWheel: 0.8, glide: 0,
  },
  'Pluck': {
    osc1Wave: 4, osc1Range: 3, osc2Wave: 2, osc2Range: 2, osc2Detune: 0.04,
    osc1Level: 0.8, osc2Level: 0.5, osc3Level: 0, noiseLevel: 0,
    cutoff: 300, resonance: 0.4, drive: 1, filterEnvAmt: 3.4, keyTrack: 0.66,
    fA: 0.001, fD: 0.25, fS: 0, fR: 0.2, aA: 0.001, aD: 0.9, aS: 0, aR: 0.4,
    glide: 0, lfoPitch: 0, lfoFilter: 0,
  },
  'Slow Pad': {
    osc1Wave: 2, osc1Range: 2, osc2Wave: 2, osc2Range: 2, osc2Detune: 0.15, osc3Wave: 1, osc3Range: 3, osc3Detune: -0.1,
    osc1Level: 0.6, osc2Level: 0.6, osc3Level: 0.5, noiseLevel: 0.05,
    cutoff: 500, resonance: 0.3, drive: 1, filterEnvAmt: 1.6, keyTrack: 0.33,
    fA: 2, fD: 3, fS: 0.4, fR: 2.5, aA: 1.5, aD: 2, aS: 0.9, aR: 2.5,
    lfoRate: 0.3, lfoWave: 0, lfoPitch: 0, lfoFilter: 0.6, modWheel: 0.5, glide: 0,
  },
  'Wind & Surf': {
    osc1Level: 0, osc2Level: 0, osc3Level: 0, noiseLevel: 0.9,
    cutoff: 600, resonance: 0.7, drive: 1, filterEnvAmt: 2, keyTrack: 1,
    fA: 1.5, fD: 2.5, fS: 0.2, fR: 2, aA: 0.8, aD: 2, aS: 0.7, aR: 2,
    lfoRate: 0.15, lfoWave: 0, lfoPitch: 0, lfoFilter: 1.5, modWheel: 1, glide: 0,
  },
  'Self-osc Whistle': {
    osc1Level: 0, osc2Level: 0, osc3Level: 0, noiseLevel: 0,
    cutoff: 260, resonance: 1, drive: 1, filterEnvAmt: 0, keyTrack: 1,
    aA: 0.02, aD: 0.3, aS: 1, aR: 0.3, glide: 0.15,
    lfoRate: 5, lfoWave: 0, lfoPitch: 0, lfoFilter: 0.08, modWheel: 0.5,
  },
};

// Lowest level whose controls can show everything a preset changes.
function presetLevel(src) {
  const defs = defaultPatch();
  let lv = 1;
  for (const [k, v] of Object.entries(src)) {
    const d = PARAM_BY_ID[k];
    if (d && !d.fx && v !== defs[k]) lv = Math.max(lv, d.level);
  }
  return lv;
}

function patchForLevel(level) {
  if (level === 6) return { ...defaultPatch(), ...PRESETS['Fat Bass'] };
  return { ...defaultPatch(), ...LEVEL_PATCHES[level] };
}

// Value <-> knob position (0..1)
function toNorm(def, v) {
  const { min, max } = def;
  if (def.curve === 'log') return Math.log(v / min) / Math.log(max / min);
  if (def.curve === 'sq') return Math.sqrt((v - min) / (max - min));
  return (v - min) / (max - min);
}
function fromNorm(def, n) {
  n = Math.min(1, Math.max(0, n));
  const { min, max } = def;
  if (def.curve === 'log') return min * Math.pow(max / min, n);
  if (def.curve === 'sq') return min + n * n * (max - min);
  return min + n * (max - min);
}

function formatValue(def, v) {
  if (def.type === 'choice') return def.options[v];
  const tr = (k, en) => (typeof I18N !== 'undefined' ? I18N.t(k) : en);
  if (def.type === 'toggle') return v ? tr('on', 'On') : tr('off', 'Off');
  switch (def.fmt) {
    case 'hz': return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz' : v.toFixed(v < 10 ? 2 : 0) + ' Hz';
    case 's': return v < 1 ? Math.round(v * 1000) + ' ms' : v.toFixed(2) + ' s';
    case 'pct': return Math.round(v * 100) + '%';
    case 'st': return (v > 0 ? '+' : '') + v.toFixed(2) + ' ' + tr('st', 'st');
    case 'oct': return v.toFixed(2) + ' oct';
    case 'x': return '×' + v.toFixed(2);
    default: return v.toFixed(2);
  }
}

if (typeof module !== 'undefined') module.exports = { PARAMS, PRESETS, PEDALS, LEVEL_PATCHES, defaultPatch, patchForLevel, presetLevel, toNorm, fromNorm, formatValue };
