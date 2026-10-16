/*
 * Curriculum: six levels of increasing complexity, modelled on the Minimoog Model D.
 * Each challenge `check(p, s)` receives the current patch `p` and session stats `s`.
 * A challenge completes when its check is true WHILE a note is sounding
 * (so you actually hear the result), unless `silent: true`.
 */
const LEVELS = [
  {
    n: 1,
    title: 'The Oscillator',
    subtitle: 'Pitch & timbre',
    flow: ['vco', 'out'],
    viz: ['scope', 'spectrum'],
    theory: `
      <p>Every sound is air vibrating. A synthesizer starts with an <b>oscillator</b> — on a Moog it is a
      <b>VCO</b> (Voltage-Controlled Oscillator): a circuit whose output repeats a shape many times per second.</p>
      <ul>
        <li><b>Frequency</b> (how often it repeats) is what you hear as <b>pitch</b>. A4 = 440 Hz; one octave up doubles it.</li>
        <li><b>Waveform</b> (the shape) is what you hear as <b>timbre</b> — the "colour" of the sound.</li>
      </ul>
      <p>Any periodic shape is a sum of sine waves called <b>harmonics</b> (at 1×, 2×, 3×… the fundamental).
      Watch the <b>spectrum</b>:</p>
      <ul>
        <li><b>Sine</b> — only the fundamental. Pure, flute-like.</li>
        <li><b>Triangle</b> — odd harmonics, fading fast (1/n²). Soft, hollow.</li>
        <li><b>Saw</b> — all harmonics (1/n). Bright, buzzy: the classic Moog raw material.</li>
        <li><b>Square / pulses</b> — square has odd harmonics only (clarinet-like); narrower pulses get thinner and nasal.</li>
      </ul>
      <p>Moog labels octaves in <b>feet</b> like a pipe organ: 32' is lowest, 2' highest; 8' is "concert pitch".</p>`,
    tips: [
      'Play with your computer keyboard: the middle letter row plays the white keys and the row above the black keys — the letters are shown on the piano. The two keys left of the bottom row shift the octave.',
      'Switch waveforms while holding a note. Compare the scope (shape) with the spectrum (harmonics).',
      'Below the synth: effect pedals and a <b>Loop Station</b>. Press <kbd>R</kbd> to record a loop, then play over it.',
    ],
    challenges: [
      { id: 'l1-play', text: 'Play any note', check: () => true },
      { id: 'l1-sine', text: 'Find the waveform with a single spectral peak', check: (p) => p.osc1Wave === 0 },
      { id: 'l1-odd', text: 'Hear a hollow, clarinet-like tone (odd harmonics, flat-topped wave)', check: (p) => p.osc1Wave === 3 },
      { id: 'l1-low', text: "Drop to the deepest range (32')", check: (p) => p.osc1Range === 0 },
    ],
  },
  {
    n: 2,
    title: 'The Ladder Filter',
    subtitle: 'Subtractive synthesis',
    flow: ['vco', 'vcf', 'out'],
    viz: ['scope', 'spectrum', 'filter'],
    theory: `
      <p>Moog synthesis is <b>subtractive</b>: start with a harmonically rich wave and <b>carve away</b> harmonics with a filter.</p>
      <p>Bob Moog's patented <b>transistor ladder</b> (1966) is a <b>low-pass</b> filter made of four identical stages,
      each removing 6 dB/octave → <b>24 dB/octave</b> above the cutoff. It is the heart of "the Moog sound".</p>
      <ul>
        <li><b>Cutoff</b> — frequency where the filter starts to bite. Lower = darker, muffled.</li>
        <li><b>Emphasis</b> (resonance) — feeds the output back into the input, creating a peak at the cutoff.
        Near maximum the filter <b>self-oscillates</b> and becomes a sine oscillator by itself.</li>
        <li><b>Drive</b> — on the Minimoog, players patched the output back into the mixer to overload the
        transistors. The tanh saturation adds warm harmonics and "growl".</li>
      </ul>
      <p>Notice in the response plot: more emphasis also <b>thins the bass</b> — a real ladder trait.</p>`,
    tips: [
      'Hold a note and sweep the cutoff slowly — the classic "wah".',
      'Set emphasis high, then sweep cutoff: you hear individual harmonics sing.',
    ],
    challenges: [
      { id: 'l2-dark', text: 'Make a saw sound muffled: cutoff below 300 Hz', check: (p) => p.osc1Wave === 2 && p.cutoff < 300 },
      { id: 'l2-peak', text: 'Create a resonant peak: emphasis above 70% with cutoff between 500 Hz and 3 kHz', check: (p) => p.resonance > 0.7 && p.cutoff > 500 && p.cutoff < 3000 },
      { id: 'l2-selfosc', text: 'Make the filter whistle on its own: emphasis ≥ 95%', check: (p) => p.resonance >= 0.95 },
      { id: 'l2-drive', text: 'Overdrive the ladder: drive above ×2.5', check: (p) => p.drive > 2.5 },
    ],
  },
  {
    n: 3,
    title: 'Contours (Envelopes)',
    subtitle: 'Shaping sound over time',
    flow: ['vco', 'vcf', 'vca', 'env', 'out'],
    viz: ['scope', 'env', 'filter'],
    theory: `
      <p>Real instruments change over time: a plucked string is bright then fades; a violin swells.
      Moog called its envelope generators <b>contour generators</b>. Each produces a control voltage when you press a key:</p>
      <ul>
        <li><b>Attack</b> — time to rise from 0 to full.</li>
        <li><b>Decay</b> — time to fall to the sustain level.</li>
        <li><b>Sustain</b> — level held while the key stays down (a level, not a time!).</li>
        <li><b>Release</b> — time to fade after you let go.</li>
      </ul>
      <p>The <b>Loudness Contour</b> drives the <b>VCA</b> (amplifier). The <b>Filter Contour</b> moves the cutoff up
      by <b>Contour Amt</b> octaves — this is how you get the famous Moog "bwow" and plucky basses.</p>
      <p>Like the Minimoog, the voice is <b>single-trigger</b>: if you play legato (overlap notes), the contours do not restart.</p>`,
    tips: [
      'Set the cutoff low and the contour amount high: every note "opens" then closes.',
      'Watch the moving dot on the envelope graph — it shows where each contour is right now.',
    ],
    challenges: [
      { id: 'l3-pluck', text: 'Make a pluck: attack < 10 ms, sustain < 10%, decay < 500 ms', check: (p) => p.aA < 0.01 && p.aS < 0.1 && p.aD < 0.5 },
      { id: 'l3-swell', text: 'Make a slow swell: loudness attack above 1 s', check: (p) => p.aA > 1 },
      { id: 'l3-bwow', text: '"Bwow": cutoff < 400 Hz, contour amount > 3 oct, filter sustain < 20%', check: (p) => p.cutoff < 400 && p.filterEnvAmt > 3 && p.fS < 0.2 },
      { id: 'l3-tail', text: 'Let notes ring after release: loudness release above 1.5 s', check: (p) => p.aR > 1.5 },
    ],
  },
  {
    n: 4,
    title: 'Three Oscillators',
    subtitle: 'The Minimoog mixer',
    flow: ['vco3', 'mix', 'vcf', 'vca', 'env', 'out'],
    viz: ['scope', 'spectrum', 'env'],
    theory: `
      <p>The <b>Minimoog Model D</b> (1970) has <b>three VCOs</b> and a <b>noise</b> source feeding a <b>mixer</b>.
      Combining oscillators is where the big, fat Moog sound comes from:</p>
      <ul>
        <li><b>Detune</b> — two oscillators a few cents apart drift in and out of phase. The slow
        <b>beating</b> you hear (and see on the scope) makes the sound thick and alive.</li>
        <li><b>Octaves</b> — stack 16' and 8' for weight, or 32' for a sub bass.</li>
        <li><b>Intervals</b> — tuning an oscillator +7 semitones (a fifth) makes every key play a power chord.</li>
        <li><b>Noise</b> — random signal containing all frequencies: wind, surf, snare-ish hits, breath.</li>
      </ul>
      <p>The mixer levels also set how hard the ladder is driven — loud mixes saturate more.</p>`,
    tips: [
      'Turn one oscillator off and on again while holding a note: hear what detuning adds.',
      'Try Osc 3 at 32\' (two octaves down) under a 8\' lead.',
    ],
    challenges: [
      { id: 'l4-fat', text: 'Fatten it up: Osc 2 above 30%, detuned by 0.05–0.3 semitones', check: (p) => p.osc2Level > 0.3 && Math.abs(p.osc2Detune) >= 0.05 && Math.abs(p.osc2Detune) <= 0.3 && p.osc1Level > 0.3 },
      { id: 'l4-fifth', text: 'Play power chords: tune Osc 2 or 3 to a fifth (+7 or −5 st)', check: (p) => [p.osc2Detune, p.osc3Detune].some((d, i) => (i === 0 ? p.osc2Level : p.osc3Level) > 0.2 && (Math.abs(d - 7) < 0.15 || Math.abs(d + 5) < 0.15)) },
      { id: 'l4-sub', text: "Add a sub: an audible oscillator at 32' below another at 8'", check: (p) => {
        const on = [[p.osc1Range, p.osc1Level], [p.osc2Range, p.osc2Level], [p.osc3Range, p.osc3Level]].filter((o) => o[1] > 0.2).map((o) => o[0]);
        return on.includes(0) && on.includes(2);
      } },
      { id: 'l4-wind', text: 'Make wind: only noise in the mixer', check: (p) => p.noiseLevel > 0.3 && p.osc1Level === 0 && p.osc2Level === 0 && p.osc3Level === 0 },
    ],
  },
  {
    n: 5,
    title: 'Modulation & Performance',
    subtitle: 'LFO, wheels, glide',
    flow: ['vco3', 'mix', 'vcf', 'vca', 'env', 'lfo', 'out'],
    viz: ['scope', 'filter', 'env'],
    theory: `
      <p><b>Modulation</b> means one signal automatically turning another's knob. An <b>LFO</b>
      (Low-Frequency Oscillator, below ~20 Hz) is too slow to hear, but it can wiggle pitch or cutoff.
      On the Minimoog, Oscillator 3 could be switched to low range to act as the LFO.</p>
      <ul>
        <li><b>LFO → Pitch</b> = <b>vibrato</b> (5–7 Hz sounds natural).</li>
        <li><b>LFO → Filter</b> = <b>wah / wobble</b>; with S&amp;H you get random "computer" bleeps.</li>
        <li><b>Mod wheel</b> — the Minimoog's left-hand wheel controls <i>how much</i> modulation reaches its destination. Play expressively!</li>
        <li><b>Pitch bend wheel</b> — bend notes ±2 semitones like a guitarist.</li>
        <li><b>Glide</b> (portamento) — pitch slides between notes. Play legato for those classic prog-rock leads.</li>
        <li><b>Key Track</b> — makes the cutoff follow the keyboard so high notes stay as bright as low ones.</li>
      </ul>`,
    tips: [
      'LFO amounts only act when the <b>Mod wheel</b> is up — it is next to the keyboard.',
      'Turn on glide, then hold one key and press another before releasing it.',
    ],
    challenges: [
      { id: 'l5-vib', text: 'Vibrato: LFO → pitch > 0.1 st, rate 4–8 Hz, mod wheel up', check: (p) => p.lfoPitch > 0.1 && p.lfoRate >= 4 && p.lfoRate <= 8 && p.modWheel > 0.3 },
      { id: 'l5-wob', text: 'Wobble: LFO → filter > 1 oct, emphasis > 50%, mod wheel up', check: (p) => p.lfoFilter > 1 && p.resonance > 0.5 && p.modWheel > 0.3 },
      { id: 'l5-glide', text: 'Glide: glide > 100 ms and play two overlapping (legato) notes', check: (p, s) => p.glide > 0.1 && s.legato > 0 },
      { id: 'l5-bend', text: 'Bend a note with the pitch wheel', check: (p, s) => s.bent },
    ],
  },
  {
    n: 6,
    title: 'Model D Sandbox',
    subtitle: 'Everything + presets',
    flow: ['vco3', 'mix', 'vcf', 'vca', 'env', 'lfo', 'out'],
    viz: ['scope', 'spectrum', 'filter', 'env'],
    theory: `
      <p>You now know every section of a Minimoog-style monosynth. Study the presets — open one,
      then explain to yourself <i>why</i> it sounds that way:</p>
      <ul>
        <li><b>Fat Bass</b> — three saws/squares in low octaves, low cutoff, strong filter contour, a bit of drive.</li>
        <li><b>Lead</b> — square + saw, glide and vibrato on the mod wheel.</li>
        <li><b>Brass</b> — slow filter attack (the "blat") and a small detune.</li>
        <li><b>Acid Squelch</b> — one saw, high emphasis, short filter decay.</li>
        <li><b>Self-osc Whistle</b> — no oscillators at all! The filter itself sings, tracking the keyboard.</li>
      </ul>
      <p>Recipe for designing any sound: <b>source</b> (waves, octaves) → <b>tone</b> (filter) → <b>shape</b> (contours) → <b>life</b> (modulation).</p>`,
    tips: [
      'Save your own patches — they are stored in your browser.',
      'Build a song: record a bass loop with <kbd>R</kbd>, press <kbd>R</kbd> again to stop recording, then change preset and play a lead over it. Press <kbd>R</kbd> again to overdub.',
      'Pedals come after the synth, like a guitarist\'s board: Overdrive → Chorus → Echo → Reverb.',
      'Got a MIDI keyboard? Plug it in: notes, mod wheel (CC1) and pitch bend work.',
    ],
    challenges: [
      { id: 'l6-presets', text: 'Audition 4 different presets', check: (p, s) => s.presets.size >= 4, silent: true },
      { id: 'l6-whistle', text: 'Play a melody with no oscillators (only the self-oscillating filter)', check: (p) => p.osc1Level === 0 && p.osc2Level === 0 && p.osc3Level === 0 && p.noiseLevel === 0 && p.resonance >= 0.95 },
      { id: 'l6-save', text: 'Design and save your own patch', check: (p, s) => s.saved, silent: true },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = { LEVELS };
