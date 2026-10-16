/*
 * Auto-play demos, one per level (~15–20 s). Each step lasts `dur` seconds and can:
 *   preset: load a factory preset          set:  { param: value }  (applied at the start)
 *   ramp:   { param: target } (moved smoothly over the step)
 *   notes:  MIDI notes played evenly over the step (legato: overlap them, for glide)
 *   say:    caption in English and French
 * Each demo starts from the level's lesson sound plus `start`.
 */
const DEMOS = {
  1: {
    start: { osc1Range: 2 },
    steps: [
      { dur: 2.6, set: { osc1Wave: 0 }, notes: [57], say: { en: 'Sine: one pure tone — a single peak in the spectrum.', fr: 'Sinus : un son pur — un seul pic dans le spectre.' } },
      { dur: 2.6, set: { osc1Wave: 1 }, notes: [57], say: { en: 'Triangle: a few soft odd harmonics.', fr: 'Triangle : quelques harmoniques impaires, douces.' } },
      { dur: 2.6, set: { osc1Wave: 2 }, notes: [57], say: { en: 'Saw: every harmonic — bright and buzzy, the Moog raw material.', fr: 'Scie : toutes les harmoniques — brillante, la matière première du Moog.' } },
      { dur: 2.6, set: { osc1Wave: 3 }, notes: [57], say: { en: 'Square: odd harmonics only — hollow, like a clarinet.', fr: 'Carré : harmoniques impaires seulement — creux, comme une clarinette.' } },
      { dur: 2.2, set: { osc1Wave: 2, osc1Range: 0 }, notes: [57, 60, 64], say: { en: "Range 32': the same keys, two octaves lower.", fr: "Registre 32' : les mêmes touches, deux octaves plus bas." } },
      { dur: 2.2, set: { osc1Range: 4 }, notes: [57, 60, 64], say: { en: "Range 2': two octaves higher.", fr: "Registre 2' : deux octaves plus haut." } },
    ],
  },
  2: {
    start: { osc1Wave: 2, cutoff: 8000, resonance: 0.15, filterType: 0, drive: 1 },
    steps: [
      { dur: 2, notes: [48], say: { en: 'A saw through a wide-open filter: bright.', fr: 'Une scie avec le filtre grand ouvert : brillant.' } },
      { dur: 4, ramp: { cutoff: 160 }, notes: [48], say: { en: 'Lowering the cutoff removes harmonics: darker and darker.', fr: 'Baisser la coupure retire des harmoniques : de plus en plus sombre.' } },
      { dur: 4, set: { resonance: 0.85 }, ramp: { cutoff: 3000 }, notes: [48], say: { en: 'With high emphasis, a resonant peak sings as it sweeps.', fr: 'Avec beaucoup d\'emphase, un pic résonant chante pendant le balayage.' } },
      { dur: 3, set: { filterType: 2, resonance: 0.3, cutoff: 900 }, notes: [48, 55, 60, 55], say: { en: 'High-pass type: the lows disappear — thin and airy.', fr: 'Type passe-haut : les graves disparaissent — son fin et aérien.' } },
      { dur: 3, set: { filterType: 0, cutoff: 550, resonance: 0.35, drive: 3.2 }, notes: [36, 43, 48, 43], say: { en: 'Back to the Moog low-pass, with drive for a fatter growl.', fr: 'Retour au passe-bas Moog, avec de la saturation pour plus de grain.' } },
    ],
  },
  3: {
    start: { osc1Wave: 2, cutoff: 1500, resonance: 0.2, filterEnvAmt: 0, aA: 0.003, aD: 0.3, aS: 1, aR: 0.05 },
    steps: [
      { dur: 3, notes: [48, 52, 55, 60, 55, 52], say: { en: 'Organ-like: instant on at full level, instant off.', fr: 'Façon orgue : plein volume immédiat, arrêt immédiat.' } },
      { dur: 3, set: { aS: 0, aD: 0.3, aR: 0.25 }, notes: [48, 52, 55, 60, 55, 52], say: { en: 'Pluck: a fast decay and no sustain.', fr: 'Son pincé : déclin rapide et pas de maintien.' } },
      { dur: 3.5, set: { cutoff: 180, resonance: 0.4, filterEnvAmt: 3.6, fA: 0.003, fD: 0.35, fS: 0.05, aS: 0.7, aD: 0.5 }, notes: [36, 36, 43, 36, 46, 36], say: { en: 'Filter envelope: each note opens the filter, then it closes — "bwow".', fr: 'Enveloppe du filtre : chaque note ouvre puis referme le filtre — « bwow ».' } },
      { dur: 4, set: { filterEnvAmt: 1, cutoff: 600, aA: 1.3, aS: 1, aR: 1.2 }, notes: [55], say: { en: 'Slow attack: the sound swells in, like strings.', fr: 'Attaque lente : le son enfle, comme des cordes.' } },
    ],
  },
  4: {
    start: { osc1Wave: 2, osc1Level: 0.8, osc2Level: 0, osc3Level: 0, noiseLevel: 0, osc2Detune: 0, osc3Range: 2, cutoff: 1400, resonance: 0.15, filterEnvAmt: 0.5, aS: 0.9 },
    steps: [
      { dur: 2.5, notes: [48], say: { en: 'One oscillator on its own.', fr: 'Un seul oscillateur.' } },
      { dur: 3, set: { osc2Wave: 2, osc2Level: 0.7, osc2Detune: 0.12 }, notes: [48], say: { en: 'Add a second, slightly detuned: the beating makes it thick and alive.', fr: 'Ajoutez un second, légèrement désaccordé : le battement épaissit le son.' } },
      { dur: 3, set: { osc3Wave: 3, osc3Range: 1, osc3Level: 0.6 }, notes: [48], say: { en: 'A third one an octave lower adds weight.', fr: 'Un troisième une octave plus bas ajoute du poids.' } },
      { dur: 3.5, set: { osc2Detune: 7, drive: 2 }, notes: [48, 51, 53, 48], say: { en: 'Tune oscillator 2 a fifth up (+7): every key plays a power chord.', fr: 'Oscillateur 2 à la quinte (+7) : chaque touche joue un accord de puissance.' } },
      { dur: 3.5, set: { osc1Level: 0, osc2Level: 0, osc3Level: 0, noiseLevel: 0.8, cutoff: 300, resonance: 0.65, drive: 1 }, ramp: { cutoff: 3500 }, notes: [60], say: { en: 'Noise alone, swept by the filter: wind.', fr: 'Le bruit seul, balayé par le filtre : le vent.' } },
    ],
  },
  5: {
    start: { osc1Wave: 3, osc2Level: 0.5, osc2Detune: 0.06, cutoff: 1800, resonance: 0.2, lfoRate: 5.5, lfoWave: 0, lfoPitch: 0.4, lfoFilter: 0, modWheel: 0, glide: 0, aS: 1 },
    steps: [
      { dur: 3.5, ramp: { modWheel: 0.85 }, notes: [64], say: { en: 'Vibrato: the LFO moves the pitch; raising the mod wheel brings it in.', fr: 'Vibrato : le LFO fait bouger la hauteur ; la molette Mod le fait apparaître.' } },
      { dur: 4, set: { osc1Wave: 2, lfoPitch: 0, lfoFilter: 2.6, lfoRate: 3, lfoWave: 1, cutoff: 260, resonance: 0.6, modWheel: 0.9 }, notes: [36], say: { en: 'Wobble: the same LFO now moves the filter cutoff.', fr: 'Wobble : le même LFO fait maintenant bouger la coupure du filtre.' } },
      { dur: 4, set: { osc1Wave: 3, lfoFilter: 0, lfoPitch: 0.3, lfoRate: 5.5, lfoWave: 0, modWheel: 0.4, cutoff: 1800, resonance: 0.2, glide: 0.28 }, notes: [60, 67, 64, 72, 67], legato: true, say: { en: 'Glide: played legato, each note slides into the next.', fr: 'Glissando : joué legato, chaque note glisse vers la suivante.' } },
      { dur: 3, set: { glide: 0, lfoRate: 0.8, lfoWave: 4, lfoPitch: 0, lfoFilter: 2, modWheel: 1, cutoff: 900, resonance: 0.7 }, notes: [48], say: { en: 'Sample & hold LFO on the filter: random "computer" bleeps.', fr: 'LFO aléatoire sur le filtre : des bips « d\'ordinateur ».' } },
    ],
  },
  6: {
    start: {},
    steps: [
      { dur: 3, preset: 'Fat Bass', notes: [36, 36, 48, 36, 43, 46], say: { en: 'Fat Bass: three oscillators, low cutoff, strong filter envelope.', fr: 'Fat Bass : trois oscillateurs, coupure basse, forte enveloppe de filtre.' } },
      { dur: 3.5, preset: 'Lead (Lucky Man)', notes: [60, 62, 64, 67, 72], legato: true, say: { en: 'Lead: square + saw with glide and vibrato.', fr: 'Lead : carré + scie avec glissando et vibrato.' } },
      { dur: 3, preset: 'Brass', notes: [48, 55, 60], say: { en: 'Brass: a slow filter attack gives the "blat".', fr: 'Brass : l\'attaque lente du filtre donne le « blat » des cuivres.' } },
      { dur: 3, preset: 'Acid Squelch', notes: [36, 36, 48, 36, 39, 36, 46, 36], say: { en: 'Acid: one saw, high emphasis, short filter decay.', fr: 'Acid : une scie, beaucoup d\'emphase, déclin du filtre court.' } },
      { dur: 3.5, preset: 'Talking Band-pass', notes: [48, 51, 55], say: { en: 'Band-pass swept by the LFO: it almost talks.', fr: 'Passe-bande balayé par le LFO : il parle presque.' } },
      { dur: 3.5, preset: 'Self-osc Whistle', notes: [60, 64, 67, 72], legato: true, say: { en: 'No oscillators at all: the filter itself sings.', fr: 'Aucun oscillateur : c\'est le filtre lui-même qui chante.' } },
    ],
  },
};

const demoLength = (n) => DEMOS[n].steps.reduce((t, s) => t + s.dur, 0);

if (typeof module !== 'undefined') module.exports = { DEMOS, demoLength };
