/*
 * Guitar & bass pedal simulator — pure data: pedal types, their controls, presets and demo riffs.
 * Controls use the same shape as the synth's PARAMS (min/max/def/curve/fmt) with labels in EN/FR.
 */
const GP_L = (en, fr) => ({ en, fr });

// Category decides the "classic order" of a pedalboard (lowest first).
const GP_CATEGORIES = {
  dynamics: { order: 1, name: GP_L('Dynamics', 'Dynamique') },
  filter: { order: 2, name: GP_L('Filter', 'Filtre') },
  pitch: { order: 3, name: GP_L('Pitch', 'Hauteur') },
  gain: { order: 4, name: GP_L('Gain', 'Saturation') },
  eq: { order: 5, name: GP_L('EQ', 'Égaliseur') },
  modulation: { order: 6, name: GP_L('Modulation', 'Modulation') },
  time: { order: 7, name: GP_L('Delay', 'Délai') },
  space: { order: 8, name: GP_L('Reverb', 'Réverb') },
};

const knob = (id, en, fr, min, max, def, extra = {}) => ({ id, labels: GP_L(en, fr), min, max, def, ...extra });

const GP_PEDALS = {
  compressor: {
    cat: 'dynamics', color: '#2f6f8f',
    name: GP_L('Compressor', 'Compresseur'),
    blurb: GP_L('Evens out loud and soft notes; adds sustain. Usually first.', 'Égalise les notes fortes et faibles, ajoute du sustain. Souvent en premier.'),
    params: [
      knob('sustain', 'Sustain', 'Sustain', 0, 1, 0.5, { fmt: 'pct' }),
      knob('attack', 'Attack', 'Attaque', 0.001, 0.1, 0.01, { curve: 'log', fmt: 's' }),
      knob('level', 'Level', 'Niveau', -6, 18, 4, { fmt: 'db' }),
    ],
  },
  wah: {
    cat: 'filter', color: '#3d3a36',
    name: GP_L('Wah', 'Wah'),
    blurb: GP_L('A sweeping resonant peak — the "wah" voice. Auto speed 0 = you move the pedal knob.', 'Un pic résonant qui balaie — la voix « wah ». Vitesse auto 0 = vous bougez le bouton pédale.'),
    params: [
      knob('pedal', 'Pedal', 'Pédale', 0, 1, 0.5, { fmt: 'pct' }),
      knob('rate', 'Auto speed', 'Vitesse auto', 0, 8, 0, { curve: 'sq', fmt: 'hz' }),
      knob('peak', 'Peak', 'Pic', 1, 15, 6, { fmt: 'x' }),
    ],
  },
  envfilter: {
    cat: 'filter', color: '#8a3f7a',
    name: GP_L('Envelope Filter', 'Filtre à enveloppe'),
    blurb: GP_L('Auto-wah that follows how hard you play: the funk bass classic.', 'Auto-wah qui suit la force de votre jeu : le classique de la basse funk.'),
    params: [
      knob('sens', 'Sensitivity', 'Sensibilité', 0, 1, 0.6, { fmt: 'pct' }),
      knob('range', 'Range', 'Plage', 0.5, 5, 3, { fmt: 'oct' }),
      knob('peak', 'Peak', 'Pic', 1, 15, 7, { fmt: 'x' }),
    ],
  },
  octaver: {
    cat: 'pitch', color: '#4a5b2a',
    name: GP_L('Octaver', 'Octaveur'),
    blurb: GP_L('Adds a note one octave down (and up). Play single notes for best tracking.', 'Ajoute la note une octave plus bas (et plus haut). Jouez note par note pour un bon suivi.'),
    params: [
      knob('sub', 'Sub', 'Grave', 0, 1, 0.7, { fmt: 'pct' }),
      knob('up', 'Up', 'Aigu', 0, 1, 0, { fmt: 'pct' }),
      knob('dry', 'Dry', 'Direct', 0, 1, 0.8, { fmt: 'pct' }),
    ],
  },
  overdrive: {
    cat: 'gain', color: '#3f8a4a',
    name: GP_L('Overdrive', 'Overdrive'),
    blurb: GP_L('Warm, soft clipping with a mid "hump" — a pushed tube amp.', 'Écrêtage doux et chaud avec des médiums en avant — un ampli à lampes poussé.'),
    params: [
      knob('drive', 'Drive', 'Gain', 1, 60, 10, { curve: 'log', fmt: 'x' }),
      knob('tone', 'Tone', 'Timbre', 500, 8000, 2800, { curve: 'log', fmt: 'hz' }),
      knob('level', 'Level', 'Niveau', -12, 12, 0, { fmt: 'db' }),
    ],
  },
  distortion: {
    cat: 'gain', color: '#c08a1e',
    name: GP_L('Distortion', 'Distorsion'),
    blurb: GP_L('Hard clipping: tight, aggressive rock and metal crunch.', 'Écrêtage dur : le crunch serré et agressif du rock et du metal.'),
    params: [
      knob('drive', 'Drive', 'Gain', 1, 200, 40, { curve: 'log', fmt: 'x' }),
      knob('tone', 'Filter', 'Filtre', 600, 10000, 3500, { curve: 'log', fmt: 'hz' }),
      knob('level', 'Level', 'Niveau', -12, 12, -2, { fmt: 'db' }),
    ],
  },
  fuzz: {
    cat: 'gain', color: '#7a2a2a',
    name: GP_L('Fuzz', 'Fuzz'),
    blurb: GP_L('Extreme, buzzy square-wave clipping with a scooped tone. Huge sustain.', 'Écrêtage extrême, bourdonnant, en onde carrée avec des médiums creusés. Sustain énorme.'),
    params: [
      knob('drive', 'Sustain', 'Sustain', 1, 300, 80, { curve: 'log', fmt: 'x' }),
      knob('tone', 'Tone', 'Timbre', 0, 1, 0.5, { fmt: 'pct' }),
      knob('level', 'Volume', 'Volume', -12, 12, -4, { fmt: 'db' }),
    ],
  },
  bassdrive: {
    cat: 'gain', color: '#3b3f8f',
    name: GP_L('Bass Drive', 'Saturation basse'),
    blurb: GP_L('Distorts only the mids and highs and keeps a clean low end, so the bass stays solid.', 'Ne sature que les médiums et les aigus et garde des graves propres : la basse reste solide.'),
    params: [
      knob('drive', 'Drive', 'Gain', 1, 100, 20, { curve: 'log', fmt: 'x' }),
      knob('blend', 'Clean low', 'Grave propre', 0, 1, 0.7, { fmt: 'pct' }),
      knob('tone', 'Tone', 'Timbre', 500, 6000, 2200, { curve: 'log', fmt: 'hz' }),
      knob('level', 'Level', 'Niveau', -12, 12, 0, { fmt: 'db' }),
    ],
  },
  eq: {
    cat: 'eq', color: '#5d6066',
    name: GP_L('EQ', 'Égaliseur'),
    blurb: GP_L('Five bands to boost or cut lows, mids and highs.', 'Cinq bandes pour accentuer ou réduire graves, médiums et aigus.'),
    params: [
      knob('b1', '80 Hz', '80 Hz', -12, 12, 0, { fmt: 'db' }),
      knob('b2', '250 Hz', '250 Hz', -12, 12, 0, { fmt: 'db' }),
      knob('b3', '750 Hz', '750 Hz', -12, 12, 0, { fmt: 'db' }),
      knob('b4', '2.2 kHz', '2,2 kHz', -12, 12, 0, { fmt: 'db' }),
      knob('b5', '6 kHz', '6 kHz', -12, 12, 0, { fmt: 'db' }),
      knob('level', 'Level', 'Niveau', -12, 12, 0, { fmt: 'db' }),
    ],
  },
  chorus: {
    cat: 'modulation', color: '#1d6f66',
    name: GP_L('Chorus', 'Chorus'),
    blurb: GP_L('Slightly detuned, moving copies: shimmer and width.', 'Des copies légèrement désaccordées et mouvantes : scintillement et largeur.'),
    params: [
      knob('rate', 'Rate', 'Vitesse', 0.05, 6, 0.8, { curve: 'log', fmt: 'hz' }),
      knob('depth', 'Depth', 'Profondeur', 0, 1, 0.5, { fmt: 'pct' }),
      knob('mix', 'Mix', 'Mélange', 0, 1, 0.5, { fmt: 'pct' }),
    ],
  },
  phaser: {
    cat: 'modulation', color: '#b85a1c',
    name: GP_L('Phaser', 'Phaser'),
    blurb: GP_L('Moving notches in the spectrum: a swirling, "jet" sound.', 'Des creux qui se déplacent dans le spectre : un son tourbillonnant.'),
    params: [
      knob('rate', 'Rate', 'Vitesse', 0.05, 8, 0.5, { curve: 'log', fmt: 'hz' }),
      knob('depth', 'Depth', 'Profondeur', 0, 1, 0.7, { fmt: 'pct' }),
      knob('mix', 'Intensity', 'Intensité', 0, 1, 0.5, { fmt: 'pct' }),
    ],
  },
  flanger: {
    cat: 'modulation', color: '#5b6f8f',
    name: GP_L('Flanger', 'Flanger'),
    blurb: GP_L('A very short moving delay with feedback: metallic jet-plane sweeps.', 'Un délai très court qui bouge, avec réinjection : balayages métalliques.'),
    params: [
      knob('rate', 'Rate', 'Vitesse', 0.05, 5, 0.3, { curve: 'log', fmt: 'hz' }),
      knob('depth', 'Depth', 'Profondeur', 0, 1, 0.6, { fmt: 'pct' }),
      knob('regen', 'Regen', 'Réinjection', 0, 0.9, 0.5, { fmt: 'pct' }),
    ],
  },
  tremolo: {
    cat: 'modulation', color: '#2a6b8a',
    name: GP_L('Tremolo', 'Trémolo'),
    blurb: GP_L('Volume that pulses up and down — surf and vintage amp vibe.', 'Le volume qui pulse — l\'ambiance surf et amplis vintage.'),
    params: [
      knob('rate', 'Rate', 'Vitesse', 0.5, 15, 5, { curve: 'log', fmt: 'hz' }),
      knob('depth', 'Depth', 'Profondeur', 0, 1, 0.6, { fmt: 'pct' }),
      { id: 'shape', labels: GP_L('Shape', 'Forme'), type: 'choice', options: ['Sine', 'Square'], def: 0 },
    ],
  },
  delay: {
    cat: 'time', color: '#2b4f8c',
    name: GP_L('Delay', 'Délai'),
    blurb: GP_L('Repeats what you play. Short = slapback, long = ambient.', 'Répète ce que vous jouez. Court = slapback, long = ambiance.'),
    params: [
      knob('time', 'Time', 'Temps', 0.04, 1.2, 0.38, { curve: 'log', fmt: 's' }),
      knob('repeats', 'Repeats', 'Répétitions', 0, 0.92, 0.35, { fmt: 'pct' }),
      knob('mix', 'Mix', 'Mélange', 0, 1, 0.3, { fmt: 'pct' }),
    ],
  },
  reverb: {
    cat: 'space', color: '#5d3f80',
    name: GP_L('Reverb', 'Réverb'),
    blurb: GP_L('Puts the sound in a room, hall or spring tank. Usually last.', 'Place le son dans une pièce, une salle ou un ressort. Souvent en dernier.'),
    params: [
      knob('size', 'Decay', 'Durée', 0.3, 8, 2.2, { curve: 'log', fmt: 's' }),
      knob('tone', 'Tone', 'Timbre', 1000, 14000, 5000, { curve: 'log', fmt: 'hz' }),
      knob('mix', 'Mix', 'Mélange', 0, 1, 0.3, { fmt: 'pct' }),
    ],
  },
};

// Amplifier and speaker cabinet: always the last block of the chain.
const GP_AMP = {
  name: GP_L('Amp & Cabinet', 'Ampli & baffle'),
  blurb: GP_L('The amplifier and its speaker shape the final tone. Turn the cabinet off for a direct (DI) sound.', 'L\'ampli et son haut-parleur façonnent le son final. Coupez le baffle pour un son direct (DI).'),
  params: [
    knob('gain', 'Gain', 'Gain', 1, 30, 2, { curve: 'log', fmt: 'x' }),
    knob('bass', 'Bass', 'Graves', -12, 12, 0, { fmt: 'db' }),
    knob('mid', 'Middle', 'Médiums', -12, 12, 0, { fmt: 'db' }),
    knob('treble', 'Treble', 'Aigus', -12, 12, 0, { fmt: 'db' }),
    knob('master', 'Master', 'Volume', -18, 6, -3, { fmt: 'db' }),
    { id: 'cab', labels: GP_L('Cabinet', 'Baffle'), type: 'choice', options: ['Off', '4x12', '8x10'], def: 1 },
  ],
};

const GP_INSTRUMENTS = {
  guitar: {
    name: GP_L('Guitar', 'Guitare'),
    strings: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    octave: 3, cab: 1,
  },
  bass: {
    name: GP_L('Bass', 'Basse'),
    strings: [28, 33, 38, 43], // E1 A1 D2 G2
    octave: 2, cab: 2,
  },
};

// Presets: an ordered chain of [type, {params}] plus amp settings.
const GP_PRESETS = {
  guitar: {
    'Clean & shiny': { chain: [['compressor', { sustain: 0.4 }], ['chorus', { rate: 0.7, mix: 0.45 }], ['reverb', { size: 1.8, mix: 0.25 }]], amp: { gain: 1.5, treble: 3 } },
    'Blues breaker': { chain: [['overdrive', { drive: 8, tone: 2600 }], ['delay', { time: 0.32, repeats: 0.2, mix: 0.18 }], ['reverb', { size: 1.5, mix: 0.2 }]], amp: { gain: 3, mid: 2 } },
    'Classic rock': { chain: [['distortion', { drive: 50, tone: 3200 }], ['eq', { b3: 4, b5: -2 }], ['delay', { time: 0.42, repeats: 0.25, mix: 0.18 }]], amp: { gain: 4, mid: 3, bass: 2 } },
    'Fuzz lead': { chain: [['fuzz', { drive: 150, tone: 0.6 }], ['delay', { time: 0.45, repeats: 0.35, mix: 0.25 }], ['reverb', { size: 2.5, mix: 0.25 }]], amp: { gain: 2 } },
    'Funk wah': { chain: [['compressor', { sustain: 0.6, attack: 0.005 }], ['wah', { rate: 2.5, peak: 8 }]], amp: { gain: 1.5, treble: 2 } },
    'Surf': { chain: [['tremolo', { rate: 6, depth: 0.7 }], ['reverb', { size: 3.5, mix: 0.45, tone: 7000 }]], amp: { gain: 2, treble: 4 } },
    'Ambient swells': { chain: [['chorus', { rate: 0.4, depth: 0.7 }], ['delay', { time: 0.6, repeats: 0.6, mix: 0.4 }], ['reverb', { size: 6, mix: 0.5 }]], amp: { gain: 1.5 } },
    '80s jet': { chain: [['compressor', { sustain: 0.5 }], ['distortion', { drive: 25 }], ['flanger', { rate: 0.2, regen: 0.7 }], ['delay', { time: 0.38, repeats: 0.3, mix: 0.2 }]], amp: { gain: 3 } },
    'Phase funk': { chain: [['compressor', { sustain: 0.5 }], ['phaser', { rate: 0.6, depth: 0.8 }]], amp: { gain: 1.8 } },
  },
  bass: {
    'Clean DI': { chain: [['compressor', { sustain: 0.4, level: 3 }], ['eq', { b1: 2, b3: -2 }]], amp: { gain: 1.2, cab: 0 } },
    'Rock grind': { chain: [['compressor', { sustain: 0.5 }], ['bassdrive', { drive: 30, blend: 0.75 }], ['eq', { b2: 2, b4: 3 }]], amp: { gain: 2 } },
    'Funk envelope': { chain: [['compressor', { sustain: 0.6, attack: 0.004 }], ['envfilter', { sens: 0.7, range: 3.5, peak: 8 }]], amp: { gain: 1.5 } },
    'Synth bass': { chain: [['octaver', { sub: 0.9, up: 0, dry: 0.4 }], ['envfilter', { sens: 0.6, range: 2.5, peak: 9 }]], amp: { gain: 1.5 } },
    'Fuzz bass': { chain: [['octaver', { sub: 0.6, dry: 0.7 }], ['fuzz', { drive: 60, tone: 0.35 }]], amp: { gain: 1.5, bass: 3 } },
    'Dub': { chain: [['compressor', { sustain: 0.5 }], ['eq', { b1: 6, b4: -6, b5: -8 }], ['delay', { time: 0.6, repeats: 0.45, mix: 0.25 }]], amp: { gain: 1.2, treble: -4 } },
    'Chorus bass': { chain: [['compressor', { sustain: 0.4 }], ['chorus', { rate: 0.6, depth: 0.5, mix: 0.4 }]], amp: { gain: 1.3 } },
  },
};

// Demo riffs: events are [beat, [MIDI notes], length in beats]; they loop.
const GP_RIFFS = {
  guitar: {
    'Rock power chords': {
      bpm: 120, beats: 8,
      events: [
        ...[0, 0.5, 1, 1.5].map((b) => [b, [40, 47, 52], 0.42]),
        [2, [43, 50, 55], 0.42], [2.5, [43, 50, 55], 0.42], [3, [45, 52, 57], 0.42], [3.5, [45, 52, 57], 0.42],
        ...[4, 4.5, 5, 5.5].map((b) => [b, [40, 47, 52], 0.42]),
        [6, [50, 57, 62], 0.42], [6.5, [50, 57, 62], 0.42], [7, [48, 55, 60], 0.9],
      ],
    },
    'Clean arpeggio': {
      bpm: 92, beats: 16,
      events: [
        [40, 47, 52, 55, 59, 55, 52, 47], [48, 52, 55, 60, 64, 60, 55, 52],
        [43, 47, 50, 55, 59, 55, 50, 47], [50, 54, 57, 62, 66, 62, 57, 54],
      ].flatMap((bar, i) => bar.map((n, j) => [i * 4 + j * 0.5, [n], 1.4])),
    },
    'Funk strum': {
      bpm: 100, beats: 4,
      events: [0, 0.5, 0.75, 1.25, 1.5, 2, 2.75, 3, 3.25, 3.75].map((b, i) => [b, i % 3 === 1 ? [56, 62] : [52, 56, 62, 66], i % 3 === 1 ? 0.1 : 0.2]),
    },
    'Blues lick': {
      bpm: 84, beats: 8,
      events: [[0, [57], 0.5], [0.5, [60], 0.5], [1, [62], 0.3], [1.33, [63], 0.3], [1.66, [64], 1.2], [3, [67], 0.5], [3.5, [64], 0.5], [4, [62], 0.5], [4.5, [60], 0.5], [5, [57], 2.6]],
    },
  },
  bass: {
    'Rock eighths': {
      bpm: 120, beats: 8,
      events: [...Array(8).keys()].map((i) => [i * 0.5, [28], 0.42]).concat([...Array(4).keys()].map((i) => [4 + i * 0.5, [31], 0.42]), [...Array(4).keys()].map((i) => [6 + i * 0.5, [33], 0.42])),
    },
    'Funk octaves': {
      bpm: 100, beats: 4,
      events: [[0, [28], 0.2], [0.5, [40], 0.12], [0.75, [28], 0.2], [1.5, [40], 0.12], [2, [31], 0.2], [2.5, [43], 0.12], [2.75, [33], 0.2], [3.25, [45], 0.12], [3.5, [35], 0.2]],
    },
    'Walking line': {
      bpm: 120, beats: 16,
      events: [36, 40, 43, 45, 41, 45, 48, 47, 43, 47, 50, 49, 48, 43, 40, 38].map((n, i) => [i, [n], 0.9]),
    },
    'Dub line': {
      bpm: 76, beats: 8,
      events: [[0, [28], 1.4], [1.5, [35], 0.45], [2, [33], 0.9], [3, [31], 0.9], [4, [28], 1.4], [6, [35], 0.45], [6.5, [33], 0.45], [7, [31], 0.9]],
    },
  },
};

function gpDefaults(type) {
  const def = type === 'amp' ? GP_AMP : GP_PEDALS[type];
  return Object.fromEntries(def.params.map((p) => [p.id, p.def]));
}

if (typeof module !== 'undefined') module.exports = { GP_CATEGORIES, GP_PEDALS, GP_AMP, GP_INSTRUMENTS, GP_PRESETS, GP_RIFFS, gpDefaults };

// Interface text for the pedal section (merged into the app's translations at load).
const GP_TEXT = {
  en: {
    modePedals: 'Pedals',
    gpKicker: 'Pedal simulator · guitar & bass', gpTitle: 'Build your pedalboard',
    gpIntro: 'Pick a sound source, then add pedals and listen to how each one changes the sound. The order matters — try the same pedals in a different order.',
    gpPoints: [
      'Classic order: <b>compressor → filters → octave → drive → EQ → modulation → delay → reverb</b>, then the amp.',
      'Gain pedals before modulation and delay keep echoes clean; reverb last sounds like a real room.',
      'On bass, keep the low end clean: use the Bass Drive\'s “clean low” or a compressor first.',
    ],
    gpSource: 'Sound source', gpRiff: 'Demo riff', gpPlayRiff: '▶ Play riff', gpStopRiff: '■ Stop riff',
    gpKeysHint: 'Or play the keyboard below — chords work too.',
    gpMic: 'Use my instrument (microphone / audio interface)', gpMicOff: 'Stop using my instrument', gpMicOn: 'Your instrument is connected — use headphones to avoid feedback.',
    gpMicDenied: 'The browser did not allow audio input ({msg}). Allow the microphone for this page, or play the demo riffs.',
    gpFile: 'Play an audio file…', gpStopFile: 'Stop file', gpFileBad: 'This file could not be played ({msg}).',
    gpInput: 'Input', gpInputLevel: 'Input level',
    gpTuner: 'Tuner', gpTunerIdle: 'Play one string', gpMute: 'Mute while tuning', gpStrings: 'Open strings',
    gpBoard: 'Pedalboard', gpPreset: 'Presets…', gpAdd: '+ Add a pedal…', gpOrder: 'Sort into classic order', gpClear: 'Remove all pedals',
    gpEmpty: 'No pedals yet — add one, or pick a preset.', gpMoveLeft: 'Move earlier in the chain', gpMoveRight: 'Move later in the chain', gpRemove: 'Remove {name}',
    gpIn: 'IN', gpAmpOut: 'AMP', gpOut: 'OUT', gpOrdered: 'Pedals sorted into the classic order', gpOutput: 'Output', gpOutputSub: 'after pedals and amp',
    gpLearnBtn: 'How it works', gpLearnTitle: 'Inside the {name}', gpWhat: 'What it does', gpHow: 'How it works', gpMath: 'The maths (what this app computes)', gpListen: 'Listen for', gpDiagram: 'Signal path', gpClose: 'Close',
    gpPlotTransfer: 'Clipping curve: input x → output y. Dashed line = no effect.', gpPlotResponse: 'Frequency response for the current settings (dB). Faint curves: where it moves.',
    gpPlotCompressor: 'Input level → output level (dB). Dashed = no compression; T = threshold.', gpPlotOctave: 'The real algorithm on a 110 Hz note: input (grey) and the sub-octave (orange) — half as many cycles.',
    gpPlotLfo: 'How the effect moves over time with the current Rate and Depth.', gpPlotImpulse: 'Impulse response: what comes out after a single click.',
    gpVoice: 'Keyboard & riffs play', gpVoiceStrings: 'Plucked strings', gpVoiceMoog: 'Moog synth', gpMoogSound: 'Moog sound',
    gpMoogHint: 'The Moog synth goes through your pedalboard instead of a guitar. Riffs play one note at a time (the synth is monophonic).',
    gpCompare: 'Before & after', gpCompareHint: 'Click a pedal in the signal chain above to see what that one pedal does to the sound. IN or OUT compares the whole board.',
    gpBefore: 'before', gpAfter: 'after', gpWave: 'Waveform', gpWaveSub: 'shape over time', gpChange: 'What changed', gpChangeSub: 'after − before, per frequency',
    gpComparing: 'Comparing: {what}', gpWhole: 'the whole board (input → output)', gpCompareIdle: 'Play something to compare', gpLevels: 'Level {a} dB → {b} dB ({d} dB)', gpPickChip: 'Compare before and after {name}', gpBypassed: '(switched off)',
  },
  fr: {
    modePedals: 'Pédales',
    gpKicker: 'Simulateur de pédales · guitare et basse', gpTitle: 'Construisez votre pédalier',
    gpIntro: 'Choisissez une source sonore, puis ajoutez des pédales et écoutez comment chacune change le son. L\'ordre compte — essayez les mêmes pédales dans un autre ordre.',
    gpPoints: [
      'Ordre classique : <b>compresseur → filtres → octave → saturation → égaliseur → modulation → délai → réverb</b>, puis l\'ampli.',
      'Les saturations avant la modulation et le délai gardent des échos propres ; la réverb en dernier sonne comme une vraie pièce.',
      'À la basse, gardez des graves propres : utilisez le « grave propre » de la Saturation basse ou un compresseur en premier.',
    ],
    gpSource: 'Source sonore', gpRiff: 'Riff de démo', gpPlayRiff: '▶ Jouer le riff', gpStopRiff: '■ Arrêter le riff',
    gpKeysHint: 'Ou jouez sur le clavier en bas — les accords fonctionnent aussi.',
    gpMic: 'Utiliser mon instrument (micro / interface audio)', gpMicOff: 'Ne plus utiliser mon instrument', gpMicOn: 'Votre instrument est branché — utilisez un casque pour éviter le larsen.',
    gpMicDenied: 'Le navigateur n\'a pas autorisé l\'entrée audio ({msg}). Autorisez le micro pour cette page, ou jouez les riffs de démo.',
    gpFile: 'Lire un fichier audio…', gpStopFile: 'Arrêter le fichier', gpFileBad: 'Ce fichier n\'a pas pu être lu ({msg}).',
    gpInput: 'Entrée', gpInputLevel: 'Niveau d\'entrée',
    gpTuner: 'Accordeur', gpTunerIdle: 'Jouez une corde', gpMute: 'Couper le son pendant l\'accordage', gpStrings: 'Cordes à vide',
    gpBoard: 'Pédalier', gpPreset: 'Presets…', gpAdd: '+ Ajouter une pédale…', gpOrder: 'Trier dans l\'ordre classique', gpClear: 'Retirer toutes les pédales',
    gpEmpty: 'Aucune pédale — ajoutez-en une ou choisissez un preset.', gpMoveLeft: 'Avancer dans la chaîne', gpMoveRight: 'Reculer dans la chaîne', gpRemove: 'Retirer {name}',
    gpIn: 'ENTRÉE', gpAmpOut: 'AMPLI', gpOut: 'SORTIE', gpOrdered: 'Pédales triées dans l\'ordre classique', gpOutput: 'Sortie', gpOutputSub: 'après pédales et ampli',
    gpLearnBtn: 'Comment ça marche', gpLearnTitle: 'Dans la pédale {name}', gpWhat: 'Ce qu\'elle fait', gpHow: 'Comment ça marche', gpMath: 'Les maths (ce que calcule l\'appli)', gpListen: 'À écouter', gpDiagram: 'Chemin du signal', gpClose: 'Fermer',
    gpPlotTransfer: 'Courbe d\'écrêtage : entrée x → sortie y. Pointillés = aucun effet.', gpPlotResponse: 'Réponse en fréquence pour les réglages actuels (dB). Courbes pâles : là où elle se déplace.',
    gpPlotCompressor: 'Niveau d\'entrée → niveau de sortie (dB). Pointillés = pas de compression ; T = seuil.', gpPlotOctave: 'Le vrai algorithme sur une note à 110 Hz : entrée (gris) et octave inférieure (orange) — deux fois moins de cycles.',
    gpPlotLfo: 'Comment l\'effet bouge dans le temps avec la vitesse et la profondeur actuelles.', gpPlotImpulse: 'Réponse impulsionnelle : ce qui sort après un seul clic.',
    gpVoice: 'Le clavier et les riffs jouent', gpVoiceStrings: 'Cordes pincées', gpVoiceMoog: 'Synthé Moog', gpMoogSound: 'Son Moog',
    gpMoogHint: 'Le synthé Moog passe dans votre pédalier à la place d\'une guitare. Les riffs jouent une note à la fois (le synthé est monophonique).',
    gpCompare: 'Avant / après', gpCompareHint: 'Cliquez une pédale dans la chaîne ci-dessus pour voir ce que cette seule pédale fait au son. ENTRÉE ou SORTIE compare tout le pédalier.',
    gpBefore: 'avant', gpAfter: 'après', gpWave: 'Forme d\'onde', gpWaveSub: 'forme dans le temps', gpChange: 'Ce qui a changé', gpChangeSub: 'après − avant, par fréquence',
    gpComparing: 'Comparaison : {what}', gpWhole: 'tout le pédalier (entrée → sortie)', gpCompareIdle: 'Jouez quelque chose pour comparer', gpLevels: 'Niveau {a} dB → {b} dB ({d} dB)', gpPickChip: 'Comparer avant et après {name}', gpBypassed: '(éteinte)',
  },
};

if (typeof module !== 'undefined') Object.assign(module.exports, { GP_TEXT });
