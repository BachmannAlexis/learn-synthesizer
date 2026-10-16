/*
 * Translations (English / French). `t(key, vars)` returns the string for the current
 * language; English is the fallback. Lessons in French live in lessons-fr.js.
 */
const STRINGS = {
  en: {
    tagline: 'learn synthesis on a simulated Model D',
    modeLearn: 'Learn', modeStudio: 'Studio', sections: 'Sections',
    startAudio: 'Start audio', soundOn: 'Sound on', tapForSound: 'Tap for sound', audioFailed: 'Audio failed — retry',
    audioError: 'Could not start audio ({msg}). Try a recent Chrome, Edge, Firefox or Safari.',
    delay: '{ms} ms delay', delayTitle: 'Time from key press to sound',
    delayHigh: 'High audio delay: Bluetooth headphones/speakers add 100–250 ms. Wired headphones or built-in speakers play much faster.',
    delayToast: 'Audio delay is {ms} ms — Bluetooth audio adds a lot; wired headphones or built-in speakers are faster.',
    progress: 'Overall progress', levels: 'Levels',
    levelKicker: 'Level {n} · {sub}', readLesson: 'Read the lesson', tryThis: 'Try this', challenges: 'Challenges',
    hint: 'A challenge completes while a note is sounding, so you hear the result.',
    prev: '← Previous', next: 'Next level →', resetProgress: 'Reset progress', resetConfirm: 'Click again to erase all stars',
    progressReset: 'Progress reset',
    levelDone: 'Level {n} complete! Next level unlocked →', allDone: 'Level {n} complete! You mastered the Model D.',
    studioKicker: 'Studio · free play', studioTitle: 'Your Model D',
    studioText: 'Every control is unlocked. Pick a preset, shape your own sound, add pedals and build loops. Your Studio sound is kept separately from the lessons.',
    studioTips: [
      'Press <kbd>R</kbd> to record a loop, <kbd>R</kbd> again to stop recording, <kbd>Space</kbd> to play or stop.',
      'Save sounds you like with <b>Save patch</b>; they show up under “My patches” in both sections.',
      'Stuck? Every control is explained in the <b>Learn</b> section.',
    ],
    signalFlow: 'Signal flow',
    flowVco: 'oscillator', flowMix: 'mixer', flowVcf: 'ladder filter', flowVca: 'amplifier', flowOut: 'speaker', flowEnv: 'contours', flowLfo: 'modulation',
    synthPanel: 'Synthesizer panel', presets: 'Presets…', presetsLabel: 'Presets', patchName: 'Patch name', savePatch: 'Save patch',
    resetPatch: 'Reset patch', initPatch: 'Init patch',
    panelHint: 'Drag knobs up/down or sideways · Shift for fine · tap a value to type it · double-click to reset',
    newBadge: 'new', myPatches: 'My patches', presetGroup: 'Level {n} · {title}', preview: ' (preview)',
    presetNeeds: 'This preset also uses Level {n} controls you can\'t see yet',
    patchReset: 'Patch reset to the lesson start', patchInit: 'Back to a plain init patch', saved: 'Saved “{name}”',
    knobTitle: 'Drag up/down or left/right · Shift = fine · Double-click = reset · Click the value to type it',
    typeValue: 'Click to type an exact value', badValue: '“{text}” is not a number this knob understands',
    pedalboard: 'Pedalboard', pedalboardSub: 'effects after the synth · loop station', onOff: '{name} on/off',
    loopStation: 'Loop Station', loopEmpty: 'Empty', loopRecording: 'Recording', loopOverdub: 'Overdub', loopPlaying: 'Playing', loopStopped: 'Stopped',
    loopRec: '● Rec', loopPlay: '▶ Play', loopStop: '■ Stop', loopUndo: 'Undo', loopClear: 'Clear',
    loopRecTitle: 'Record / overdub (R)', loopPlayTitle: 'Play / stop (Space)', loopUndoTitle: 'Remove the last take', loopClearTitle: 'Erase the loop',
    loopHint: 'Press Rec, then play', loopTakes: '{takes} take(s) · {notes} notes',
    tempo: 'Tempo', bpm: 'BPM', length: 'Length', bar1: '1 bar', bars: '{n} bars', lengthTitle: 'Clear the loop to change its length',
    click: 'Click', snap: 'Snap to 1/16',
    scope: 'Oscilloscope', scopeSub: 'shape over time', spectrum: 'Spectrum', spectrumSub: 'harmonics',
    ladder: 'Ladder response', contours: 'Contours', contoursSub: 'ADSR over time', liveCutoff: 'live cutoff {v}',
    vizIdle: 'Play a key to see the sound', vizLoud: 'LOUDNESS', vizFilter: 'FILTER ({v} oct)', vizKeyUp: 'key up',
    pitch: 'Pitch', mod: 'Mod', pitchBend: 'Pitch bend', modWheel: 'Modulation wheel',
    octDown: 'Octave down', octUp: 'Octave up', octave: 'Octave {n}', oct: 'Oct {n}',
    hold: 'Hold', holdTitle: 'Sustain: notes keep sounding after you let go (right Shift, MIDI pedal)',
    keyboard: 'Keyboard', on: 'On', off: 'Off', st: 'st', language: 'Language',
  },
  fr: {
    tagline: 'apprendre la synthèse sur un Model D simulé',
    modeLearn: 'Apprendre', modeStudio: 'Studio', sections: 'Sections',
    startAudio: 'Activer le son', soundOn: 'Son activé', tapForSound: 'Touchez pour le son', audioFailed: 'Échec audio — réessayer',
    audioError: 'Impossible de démarrer le son ({msg}). Essayez un Chrome, Edge, Firefox ou Safari récent.',
    delay: '{ms} ms de latence', delayTitle: 'Temps entre l\'appui sur une touche et le son',
    delayHigh: 'Latence élevée : un casque ou une enceinte Bluetooth ajoute 100 à 250 ms. Un casque filaire ou les haut-parleurs intégrés sont bien plus rapides.',
    delayToast: 'Latence de {ms} ms — le Bluetooth en ajoute beaucoup ; un casque filaire ou les haut-parleurs intégrés sont plus rapides.',
    progress: 'Progression', levels: 'Niveaux',
    levelKicker: 'Niveau {n} · {sub}', readLesson: 'Lire la leçon', tryThis: 'À essayer', challenges: 'Défis',
    hint: 'Un défi se valide pendant qu\'une note sonne, pour que vous entendiez le résultat.',
    prev: '← Précédent', next: 'Niveau suivant →', resetProgress: 'Réinitialiser la progression', resetConfirm: 'Cliquez encore pour effacer toutes les étoiles',
    progressReset: 'Progression réinitialisée',
    levelDone: 'Niveau {n} terminé ! Niveau suivant débloqué →', allDone: 'Niveau {n} terminé ! Vous maîtrisez le Model D.',
    studioKicker: 'Studio · jeu libre', studioTitle: 'Votre Model D',
    studioText: 'Toutes les commandes sont débloquées. Choisissez un preset, façonnez votre son, ajoutez des pédales et créez des boucles. Le son du Studio est gardé à part des leçons.',
    studioTips: [
      '<kbd>R</kbd> pour enregistrer une boucle, <kbd>R</kbd> encore pour arrêter l\'enregistrement, <kbd>Espace</kbd> pour lire ou arrêter.',
      'Gardez les sons qui vous plaisent avec <b>Enregistrer</b> ; ils apparaissent dans « Mes sons » dans les deux sections.',
      'Une commande vous échappe ? Elles sont toutes expliquées dans la section <b>Apprendre</b>.',
    ],
    signalFlow: 'Chemin du signal',
    flowVco: 'oscillateur', flowMix: 'mélangeur', flowVcf: 'filtre ladder', flowVca: 'amplificateur', flowOut: 'haut-parleur', flowEnv: 'enveloppes', flowLfo: 'modulation',
    synthPanel: 'Façade du synthétiseur', presets: 'Presets…', presetsLabel: 'Presets', patchName: 'Nom du son', savePatch: 'Enregistrer',
    resetPatch: 'Réinitialiser', initPatch: 'Son de base',
    panelHint: 'Glissez les boutons vers le haut/bas ou sur le côté · Maj pour la précision · touchez une valeur pour la saisir · double-clic pour réinitialiser',
    newBadge: 'nouveau', myPatches: 'Mes sons', presetGroup: 'Niveau {n} · {title}', preview: ' (aperçu)',
    presetNeeds: 'Ce preset utilise aussi des commandes du niveau {n}, encore cachées',
    patchReset: 'Son remis au départ de la leçon', patchInit: 'Retour à un son de base', saved: '« {name} » enregistré',
    knobTitle: 'Glisser haut/bas ou gauche/droite · Maj = précis · Double-clic = réinitialiser · Cliquer la valeur pour la saisir',
    typeValue: 'Cliquer pour saisir une valeur exacte', badValue: '« {text} » n\'est pas une valeur valable pour ce bouton',
    pedalboard: 'Pédalier', pedalboardSub: 'effets après le synthé · station de boucles', onOff: '{name} marche/arrêt',
    loopStation: 'Station de boucles', loopEmpty: 'Vide', loopRecording: 'Enregistrement', loopOverdub: 'Superposition', loopPlaying: 'Lecture', loopStopped: 'Arrêté',
    loopRec: '● Enr.', loopPlay: '▶ Lire', loopStop: '■ Stop', loopUndo: 'Annuler', loopClear: 'Effacer',
    loopRecTitle: 'Enregistrer / superposer (R)', loopPlayTitle: 'Lire / arrêter (Espace)', loopUndoTitle: 'Retirer la dernière prise', loopClearTitle: 'Effacer la boucle',
    loopHint: 'Appuyez sur Enr., puis jouez', loopTakes: '{takes} prise(s) · {notes} notes',
    tempo: 'Tempo', bpm: 'BPM', length: 'Durée', bar1: '1 mesure', bars: '{n} mesures', lengthTitle: 'Effacez la boucle pour changer sa durée',
    click: 'Métronome', snap: 'Caler sur 1/16',
    scope: 'Oscilloscope', scopeSub: 'forme dans le temps', spectrum: 'Spectre', spectrumSub: 'harmoniques',
    ladder: 'Réponse du filtre', contours: 'Enveloppes', contoursSub: 'ADSR dans le temps', liveCutoff: 'coupure actuelle {v}',
    vizIdle: 'Jouez une touche pour voir le son', vizLoud: 'VOLUME', vizFilter: 'FILTRE ({v} oct)', vizKeyUp: 'touche relâchée',
    pitch: 'Hauteur', mod: 'Mod', pitchBend: 'Molette de hauteur', modWheel: 'Molette de modulation',
    octDown: 'Octave inférieure', octUp: 'Octave supérieure', octave: 'Octave {n}', oct: 'Oct {n}',
    hold: 'Maintien', holdTitle: 'Maintien : les notes continuent après avoir lâché la touche (Maj droite, pédale MIDI)',
    keyboard: 'Clavier', on: 'Marche', off: 'Arrêt', st: 'dt', language: 'Langue',
  },
};

// Names of controls, panel sections, pedals and waveforms in French.
const NAMES_FR = {
  params: {
    osc1Wave: 'Onde', osc1Range: 'Registre', osc2Wave: 'Onde', osc2Range: 'Registre', osc2Detune: 'Désaccord',
    osc3Wave: 'Onde', osc3Range: 'Registre', osc3Detune: 'Désaccord',
    filterType: 'Type', osc1Level: 'Osc 1', osc2Level: 'Osc 2', osc3Level: 'Osc 3', noiseLevel: 'Bruit',
    cutoff: 'Coupure', resonance: 'Emphase', drive: 'Saturation', filterEnvAmt: 'Qté env.', keyTrack: 'Suivi clavier',
    fA: 'Attaque', fD: 'Déclin', fS: 'Maintien', fR: 'Relâche', aA: 'Attaque', aD: 'Déclin', aS: 'Maintien', aR: 'Relâche',
    lfoRate: 'Vitesse LFO', lfoWave: 'Onde LFO', lfoPitch: '→ Hauteur', lfoFilter: '→ Filtre', glide: 'Glissando',
    master: 'Volume', modWheel: 'Mod',
    fxDriveGain: 'Gain', fxDriveTone: 'Timbre', fxDriveLevel: 'Niveau',
    fxChorusRate: 'Vitesse', fxChorusDepth: 'Profondeur', fxChorusMix: 'Mélange',
    fxDelayTime: 'Temps', fxDelayFeedback: 'Répétitions', fxDelayMix: 'Mélange',
    fxReverbSize: 'Taille', fxReverbTone: 'Timbre', fxReverbMix: 'Mélange',
  },
  sections: {
    osc1: 'Oscillateur 1', osc2: 'Oscillateur 2', osc3: 'Oscillateur 3', mixer: 'Mélangeur', filter: 'Filtre ladder',
    fenv: 'Enveloppe du filtre', aenv: 'Enveloppe du volume', mod: 'Modulation', output: 'Sortie',
  },
  pedals: {
    drive: { name: 'Overdrive', blurb: 'Écrête la forme d\'onde : plus d\'harmoniques, plus de grain.' },
    chorus: { name: 'Chorus', blurb: 'Ajoute des copies légèrement désaccordées et ondulantes pour élargir le son.' },
    delay: { name: 'Écho', blurb: 'Répète ce que vous jouez après un temps réglable.' },
    reverb: { name: 'Réverb', blurb: 'Place le son dans une pièce ou une salle.' },
  },
  options: {
    'LP 24': 'PB 24', 'LP 12': 'PB 12', 'HP 24': 'PH 24', 'HP 12': 'PH 12', BP: 'Bande', Notch: 'Coupe',
    Sine: 'Sinus', Tri: 'Triangle', Saw: 'Scie', Square: 'Carré', Wide: 'Large', Narrow: 'Étroit', 'S&H': 'Aléatoire',
  },
};

const I18N = (() => {
  let lang = 'en';
  try {
    const saved = localStorage.getItem('mooglab.lang');
    lang = saved ? JSON.parse(saved) : /^fr\b/i.test(navigator.language || '') ? 'fr' : 'en';
  } catch { lang = /^fr\b/i.test(navigator.language || '') ? 'fr' : 'en'; }
  if (!STRINGS[lang]) lang = 'en';

  const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}')) : s);
  const t = (key, vars) => fill(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars);
  const fr = () => lang === 'fr';

  return {
    get lang() { return lang; },
    set(l) {
      lang = STRINGS[l] ? l : 'en';
      try { localStorage.setItem('mooglab.lang', JSON.stringify(lang)); } catch { /* storage unavailable */ }
    },
    t,
    param: (def) => (fr() && NAMES_FR.params[def.id]) || def.label,
    section: (sec) => (fr() && NAMES_FR.sections[sec.id]) || sec.title,
    pedal: (pd) => (fr() && NAMES_FR.pedals[pd.id]) || pd,
    option: (o) => (fr() && NAMES_FR.options[o]) || o,
    // Lesson fields in the current language (French text from lessons-fr.js when available).
    lesson(L) {
      const f = fr() && typeof LESSONS_FR !== 'undefined' && LESSONS_FR[L.n];
      if (!f) return { title: L.title, subtitle: L.subtitle, theory: L.theory, tips: L.tips, challenge: (c) => c.text };
      return { title: f.title, subtitle: f.subtitle, theory: f.theory, tips: f.tips, challenge: (c) => f.challenges[c.id] || c.text };
    },
    // Fill static markup: data-i18n (text), data-i18n-html, data-i18n-title, data-i18n-aria, data-i18n-placeholder.
    apply(root = document) {
      document.documentElement.lang = lang;
      root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
      root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
      root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
      root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
      root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    },
  };
})();

if (typeof module !== 'undefined') module.exports = { STRINGS, NAMES_FR };
