/*
 * "How it works" for every pedal: what it does, how it is built, the exact maths this app
 * computes, what to listen for, a block diagram, and a live graph that follows the knobs.
 * Formulas are shared between languages; the words around them are in English and French.
 */
const GP_L2 = (en, fr) => ({ en, fr });
const M = (s) => `<p class="math">${s}</p>`;

const GP_LEARN = {
  compressor: {
    plot: 'compressor',
    diagram: ['IN', GP_L2('level detector', 'détecteur de niveau'), GP_L2('gain computer', 'calcul du gain'), '×', 'makeup', 'OUT'],
    what: GP_L2('Turns loud notes down and lets soft ones through, so everything sits at a more even level — and notes seem to ring longer (sustain).',
      'Baisse les notes fortes et laisse passer les faibles : tout est plus régulier, et les notes semblent tenir plus longtemps (sustain).'),
    how: GP_L2('A detector measures the level in decibels. Above the <b>threshold</b> T, every extra dB in only gives 1/R dB out (R = <b>ratio</b>). The resulting gain multiplies the signal; <b>attack</b> sets how fast it reacts.',
      'Un détecteur mesure le niveau en décibels. Au-dessus du <b>seuil</b> T, chaque dB en plus ne donne que 1/R dB en sortie (R = <b>taux</b>). Ce gain multiplie le signal ; l\'<b>attaque</b> règle sa vitesse de réaction.'),
    math: M('L = 20·log<sub>10</sub>|x| &nbsp;(smoothed: attack / 250 ms release)') +
      M('L<sub>out</sub> = L &nbsp;if L &lt; T, &nbsp;else T + (L − T) / R') +
      M('y = x · 10<sup>(L<sub>out</sub> − L)/20</sup> · 10<sup>makeup/20</sup>') +
      M('T = −8 − 42·sustain dB, &nbsp; R = 2 + 10·sustain'),
    listen: GP_L2('Strum hard then soft: the difference shrinks. Long notes fade more slowly.', 'Grattez fort puis doucement : l\'écart se réduit. Les notes longues s\'éteignent plus lentement.'),
  },
  wah: {
    plot: 'response',
    diagram: ['IN', GP_L2('band-pass, moving f₀', 'passe-bande, f₀ mobile'), '+ 15% dry', 'OUT'],
    what: GP_L2('A narrow, resonant boost that you sweep with your foot from low to high — it sounds like a voice saying "wah".',
      'Une bosse étroite et résonante que l\'on balaie au pied du grave à l\'aigu — on dirait une voix qui dit « wah ».'),
    how: GP_L2('A second-order <b>band-pass</b> filter keeps a band around its centre f₀ and cuts the rest. The pedal position moves f₀ on a logarithmic scale; <b>Peak</b> is the filter\'s Q (narrower = more vocal). Auto speed moves it with a triangle LFO.',
      'Un filtre <b>passe-bande</b> du second ordre garde une bande autour de sa fréquence centrale f₀ et coupe le reste. La position de la pédale déplace f₀ sur une échelle logarithmique ; <b>Pic</b> est le Q du filtre (plus étroit = plus vocal). La vitesse auto le fait bouger avec un LFO triangle.'),
    math: M('H(s) = (s / Qω₀) / (s²/ω₀² + s / Qω₀ + 1)') +
      M('f₀ = 380 · 2<sup>2.5·pedal</sup> Hz &nbsp;(380 Hz → 2.1 kHz)') +
      M('y[n] = b₀x[n] + b₁x[n−1] + b₂x[n−2] − a₁y[n−1] − a₂y[n−2]'),
    listen: GP_L2('Move the Pedal knob slowly while a riff plays: the bright band slides up and down.', 'Bougez lentement le bouton Pédale pendant un riff : la bande brillante monte et descend.'),
  },
  envfilter: {
    plot: 'response',
    diagram: ['IN', GP_L2('envelope follower', 'suiveur d\'enveloppe'), GP_L2('cutoff', 'coupure'), GP_L2('resonant low-pass', 'passe-bas résonant'), 'OUT'],
    what: GP_L2('An automatic wah: the harder you play, the more the filter opens. Every note goes "bwow".',
      'Une wah automatique : plus vous jouez fort, plus le filtre s\'ouvre. Chaque note fait « bwow ».'),
    how: GP_L2('An <b>envelope follower</b> rectifies the signal and smooths it (fast attack, slow release). That level moves the cutoff of a resonant low-pass filter by up to <b>Range</b> octaves.',
      'Un <b>suiveur d\'enveloppe</b> redresse le signal et le lisse (attaque rapide, relâche lente). Ce niveau déplace la coupure d\'un passe-bas résonant jusqu\'à <b>Plage</b> octaves.'),
    math: M('e[n] = e[n−1] + α·(|x[n]| − e[n−1]), &nbsp; α = 1 − e<sup>−1/(τ·f<sub>s</sub>)</sup>, τ = 4 ms ↑ / 150 ms ↓') +
      M('f<sub>c</sub> = 220 Hz · 2<sup>range·(0.3 + 1.4·sens)·min(1, 4e)</sup>') +
      M('y = LP(x, f<sub>c</sub>), &nbsp; resonance = peak dB'),
    listen: GP_L2('Play one note hard and let it ring: the sound starts bright and closes as the note fades.', 'Jouez une note fort et laissez-la sonner : le son démarre brillant puis se referme quand la note s\'éteint.'),
  },
  octaver: {
    plot: 'octave',
    diagram: ['IN', 'LPF 320 Hz', 'Schmitt trigger', 'flip-flop ÷2', '× envelope', 'LPF 900 Hz', '+ dry + |x|', 'OUT'],
    what: GP_L2('Adds a second voice one octave below (and optionally one above) what you play — a bigger, synth-like sound.',
      'Ajoute une seconde voix une octave plus bas (et éventuellement plus haut) : un son plus gros, façon synthé.'),
    how: GP_L2('The classic analog trick: filter out the harmonics, turn the fundamental into a square wave, and let a <b>flip-flop</b> change state only on every second rising edge — that halves the frequency. The square then gets the loudness of your playing. The octave up comes from <b>full-wave rectification</b>, |x|, which doubles the frequency.',
      'Le truc analogique classique : on filtre les harmoniques, on transforme la fondamentale en signal carré, et une <b>bascule</b> ne change d\'état qu\'un front montant sur deux — la fréquence est divisée par deux. Le carré reprend ensuite le volume de votre jeu. L\'octave supérieure vient du <b>redressement double alternance</b>, |x|, qui double la fréquence.'),
    math: M('s[n] = LP<sub>320</sub>(LP<sub>320</sub>(x)) ; &nbsp; state flips when s crosses ±h, &nbsp; h = 0.15·env') +
      M('q ← −q on each rising crossing &nbsp;⇒ &nbsp; f<sub>q</sub> = f / 2') +
      M('sub = LP<sub>900</sub>(q · env), &nbsp; |sin ωt| = 2/π − (4/π)·Σ cos(2kωt)/(4k² − 1)'),
    listen: GP_L2('Play single notes on the bass: a deep second note appears. Chords confuse it — just like real octavers.', 'Jouez des notes seules à la basse : une note grave apparaît. Les accords le perturbent — comme les vrais octaveurs.'),
  },
  overdrive: {
    plot: 'transfer',
    diagram: ['IN', 'HPF 220 Hz', '× drive', 'tanh', 'LPF tone', '× level', '+ clean lows', 'OUT'],
    what: GP_L2('A warm, gentle distortion, like a tube amp turned up. Soft playing stays almost clean; hard playing breaks up.',
      'Une distorsion chaude et douce, comme un ampli à lampes poussé. Joué doucement, c\'est presque propre ; joué fort, ça sature.'),
    how: GP_L2('The signal is amplified and passed through a <b>soft-clipping</b> curve (tanh): small signals pass almost unchanged, big ones are rounded off. Rounding a sine adds <b>odd harmonics</b> (3f, 5f…). Cutting the lows before clipping gives the typical "mid hump".',
      'Le signal est amplifié puis passe dans une courbe d\'<b>écrêtage doux</b> (tanh) : les petits signaux passent presque intacts, les grands sont arrondis. Arrondir une sinusoïde ajoute des <b>harmoniques impaires</b> (3f, 5f…). Couper les graves avant l\'écrêtage donne les médiums en avant typiques.'),
    math: M('u = HP<sub>220</sub>(x) · drive / 3') +
      M('y = level · tanh(3u) / tanh(3), &nbsp; tanh(u) ≈ u − u³/3 + 2u⁵/15 …') +
      M('then LP<sub>tone</sub>, &nbsp;+ 0.3·LP<sub>220</sub>(x)'),
    listen: GP_L2('Raise Drive slowly: the sound thickens before it really distorts.', 'Montez Gain lentement : le son s\'épaissit avant de vraiment saturer.'),
  },
  distortion: {
    plot: 'transfer',
    diagram: ['IN', 'HPF 90 Hz', '× gain', 'clip', 'LPF filter', '× level', 'OUT'],
    what: GP_L2('Hard, aggressive clipping: tight rock rhythm and metal crunch with lots of sustain.', 'Écrêtage dur et agressif : rythmique rock serrée et crunch metal avec beaucoup de sustain.'),
    how: GP_L2('With high gain the waveform hits a flat ceiling — <b>hard clipping</b> — and turns almost into a square wave, which is full of odd harmonics. The Filter knob tames the fizz.',
      'Avec beaucoup de gain, la forme d\'onde touche un plafond plat — <b>écrêtage dur</b> — et devient presque carrée, pleine d\'harmoniques impaires. Le bouton Filtre calme le grésillement.'),
    math: M('u = HP<sub>90</sub>(x) · gain / 4') +
      M('y = clip(1.5u − 0.5u³), &nbsp; clip(v) = max(−1, min(1, v))') +
      M('square wave = (4/π)·Σ sin((2k+1)ωt)/(2k+1)'),
    listen: GP_L2('Compare with Overdrive at the same level: the edges are harder and the notes sustain more.', 'Comparez avec l\'Overdrive au même niveau : les attaques sont plus dures et les notes tiennent plus.'),
  },
  fuzz: {
    plot: 'transfer',
    diagram: ['IN', '× g₁', GP_L2('asymmetric clip', 'écrêtage asymétrique'), '× g₂', 'hard clip', GP_L2('tone: LP ↔ HP', 'timbre : PB ↔ PH'), 'OUT'],
    what: GP_L2('The most extreme distortion: thick, buzzy and almost square, with a scooped middle.', 'La distorsion la plus extrême : épaisse, bourdonnante, presque carrée, avec des médiums creusés.'),
    how: GP_L2('Two stages of clipping. The first is <b>asymmetric</b> (the top and bottom of the wave are clipped differently), which adds <b>even harmonics</b> (2f, 4f…) for a fatter, "broken" sound. The tone control blends a low-pass and a high-pass, which leaves a hole in the mids.',
      'Deux étages d\'écrêtage. Le premier est <b>asymétrique</b> (le haut et le bas de l\'onde sont coupés différemment), ce qui ajoute des <b>harmoniques paires</b> (2f, 4f…) pour un son plus gras et « cassé ». Le timbre mélange un passe-bas et un passe-haut, ce qui creuse les médiums.'),
    math: M('a = tanh(2.5u) if u &gt; 0, &nbsp; 0.85·tanh(1.2u) if u ≤ 0, &nbsp; u = √sustain · x') +
      M('b = clip<sub>±0.9</sub>(a · √sustain) / 0.9') +
      M('y = (1 − t)·LP<sub>700</sub>(b) + 0.9t·HP<sub>1600</sub>(b)'),
    listen: GP_L2('Hold a chord: it turns into a wall of buzz. Single notes sustain almost forever.', 'Tenez un accord : il devient un mur de bourdonnement. Les notes seules tiennent presque indéfiniment.'),
  },
  bassdrive: {
    plot: 'transfer',
    diagram: ['IN', GP_L2('split at 180 Hz', 'séparation à 180 Hz'), GP_L2('lows: clean', 'graves : propres'), GP_L2('highs: tanh', 'aigus : tanh'), '+', 'OUT'],
    what: GP_L2('Distortion for bass that keeps the low end clean, so the bass still holds the groove.', 'Une saturation pour basse qui garde les graves propres : la basse tient toujours le groove.'),
    how: GP_L2('A <b>crossover</b> splits the signal at 180 Hz. Only the upper band is distorted; the lows go around the distortion and are mixed back in (<b>Clean low</b>). Distorting lows makes them muddy and weak.',
      'Un <b>filtre séparateur</b> coupe le signal en deux à 180 Hz. Seule la bande haute est saturée ; les graves contournent la saturation et sont remélangés (<b>Grave propre</b>). Saturer les graves les rendrait boueux et faibles.'),
    math: M('low = LP<sub>180</sub>(x), &nbsp; high = HP<sub>180</sub>(x)') +
      M('y = 0.8·blend·low + level · LP<sub>tone</sub>(tanh(2.2 · drive/3 · high))'),
    listen: GP_L2('Turn Clean low down to zero: the bass loses its weight. Turn it back up: the punch returns.', 'Baissez Grave propre à zéro : la basse perd son poids. Remontez-le : l\'impact revient.'),
  },
  eq: {
    plot: 'response',
    diagram: ['IN', 'shelf 80', 'peak 250', 'peak 750', 'peak 2.2k', 'shelf 6k', '× level', 'OUT'],
    what: GP_L2('Boosts or cuts five frequency bands to shape the tone — more bass, less harshness, more presence.', 'Accentue ou réduit cinq bandes de fréquences pour façonner le son — plus de graves, moins d\'agressivité, plus de présence.'),
    how: GP_L2('Five <b>biquad</b> filters in series: two shelving filters for the extremes and three <b>peaking</b> filters for the middle. Their responses multiply — in decibels, they add up.',
      'Cinq filtres <b>biquad</b> en série : deux filtres en plateau pour les extrêmes et trois filtres en <b>cloche</b> pour le milieu. Leurs réponses se multiplient — en décibels, elles s\'additionnent.'),
    math: M('A = 10<sup>g/40</sup>, &nbsp; ω₀ = 2πf₀/f<sub>s</sub>, &nbsp; α = sin ω₀ / 2Q') +
      M('peak: b = [1 + αA, −2cos ω₀, 1 − αA], &nbsp; a = [1 + α/A, −2cos ω₀, 1 − α/A]') +
      M('|H|<sub>dB</sub> = Σ<sub>k</sub> |H<sub>k</sub>|<sub>dB</sub> + level'),
    listen: GP_L2('Cut 750 Hz on a guitar for a "scooped" metal tone; boost 80 Hz on bass for weight.', 'Coupez 750 Hz à la guitare pour un son metal « creusé » ; montez 80 Hz à la basse pour du poids.'),
  },
  chorus: {
    plot: 'lfo',
    diagram: ['IN', GP_L2('2 delays ≈ 14 ms', '2 délais ≈ 14 ms'), GP_L2('moved by LFO (L/R opposite)', 'bougés par LFO (G/D opposés)'), GP_L2('pan L/R', 'pan G/D'), '+ dry', 'OUT'],
    what: GP_L2('Makes one instrument sound like several playing together: a shimmering, wide sound.', 'Fait sonner un instrument comme plusieurs jouant ensemble : un son large et scintillant.'),
    how: GP_L2('Copies of the signal are delayed by about 14 ms, and an LFO slowly changes that delay. A delay that is shrinking or growing shifts the pitch a little (the <b>Doppler effect</b>), so the copies are slightly out of tune with the original.',
      'Des copies du signal sont retardées d\'environ 14 ms et un LFO fait lentement varier ce retard. Un retard qui raccourcit ou s\'allonge décale un peu la hauteur (<b>effet Doppler</b>) : les copies sont légèrement désaccordées par rapport à l\'original.'),
    math: M('d<sub>L,R</sub>(t) = 14 ms ± D·sin(2πrt), &nbsp; D = 0.5 + 5·depth ms') +
      M('y = (1 − 0.35m)·x(t) + m·[x(t − d<sub>L</sub>) + x(t − d<sub>R</sub>)]') +
      M('pitch shift ≈ −d′(t) &nbsp;⇒ &nbsp; max ≈ 1200·log<sub>2</sub>(1 + 2πrD) cents'),
    listen: GP_L2('Play a clean chord: it widens and gently wavers. Raise Rate for a seasick vibrato.', 'Jouez un accord clair : il s\'élargit et ondule doucement. Montez la vitesse pour un vibrato « mal de mer ».'),
  },
  phaser: {
    plot: 'response',
    diagram: ['IN', GP_L2('6 all-pass stages', '6 étages passe-tout'), GP_L2('f₀ moved by LFO', 'f₀ bougée par LFO'), '+ dry', 'OUT'],
    what: GP_L2('A swirling, swooshing sound, like a jet passing — great on funk chords and electric piano.', 'Un son tournoyant, comme un avion qui passe — superbe sur les accords funk et le piano électrique.'),
    how: GP_L2('<b>All-pass</b> filters let every frequency through at the same level but delay them by different amounts (they shift the <b>phase</b>). Mixed with the dry signal, frequencies that end up half a cycle apart cancel: <b>notches</b> appear. The LFO moves the notches.',
      'Les filtres <b>passe-tout</b> laissent passer toutes les fréquences au même niveau mais les retardent différemment (ils décalent la <b>phase</b>). Mélangées au signal direct, les fréquences décalées d\'une demi-période s\'annulent : des <b>creux</b> apparaissent. Le LFO déplace ces creux.'),
    math: M('A(s) = (s² − sω₀/Q + ω₀²) / (s² + sω₀/Q + ω₀²), &nbsp; |A| = 1') +
      M('y = (1 − 0.3m)·x + m·A⁶(x) &nbsp;→ notch where ∠A⁶ = 180°·(2k+1)') +
      M('f₀(t) = 800 Hz · 2<sup>(400 + 2000·depth)·sin(2πrt)/1200</sup>'),
    listen: GP_L2('Hold a chord and listen to the "whoosh" move up and down.', 'Tenez un accord et écoutez le « whoosh » monter et descendre.'),
  },
  flanger: {
    plot: 'response',
    diagram: ['IN', GP_L2('delay 0.3–4 ms', 'délai 0,3–4 ms'), GP_L2('feedback (regen)', 'réinjection'), '+ dry', 'OUT'],
    what: GP_L2('A metallic, jet-plane sweep — more intense and more "pitched" than a phaser.', 'Un balayage métallique façon avion à réaction — plus intense et plus « accordé » qu\'un phaser.'),
    how: GP_L2('Adding a copy delayed by a few milliseconds makes a <b>comb filter</b>: evenly spaced peaks and notches. Feedback makes the peaks sharper. As the LFO changes the delay, the whole comb slides.',
      'Ajouter une copie retardée de quelques millisecondes crée un <b>filtre en peigne</b> : des pics et des creux régulièrement espacés. La réinjection rend les pics plus aigus. Quand le LFO change le retard, tout le peigne glisse.'),
    math: M('w[n] = x[n − N] + g·w[n − N], &nbsp; y = x + 0.8·w, &nbsp; N = d·f<sub>s</sub>') +
      M('H(ω) = 1 + 0.8·e<sup>−jωd</sup> / (1 − g·e<sup>−jωd</sup>)') +
      M('peaks at f = k/d, &nbsp; notches near (2k+1)/(2d)'),
    listen: GP_L2('Raise Regen: the sweep starts to "sing" like a whistle.', 'Montez la réinjection : le balayage se met à « chanter » comme un sifflement.'),
  },
  tremolo: {
    plot: 'lfo',
    diagram: ['IN', GP_L2('× gain(t)', '× gain(t)'), 'OUT'],
    what: GP_L2('The volume pulses up and down in rhythm — the sound of surf guitar and old amps.', 'Le volume pulse en rythme — le son de la guitare surf et des vieux amplis.'),
    how: GP_L2('<b>Amplitude modulation</b>: the signal is multiplied by a slow oscillator. Multiplying by a sine at rate r adds two quiet copies at f ± r (sidebands).',
      '<b>Modulation d\'amplitude</b> : le signal est multiplié par un oscillateur lent. Multiplier par une sinusoïde de vitesse r ajoute deux copies discrètes à f ± r (bandes latérales).'),
    math: M('y(t) = x(t) · [1 − D/2 + (D/2)·s(t)], &nbsp; s = sin(2πrt) or a smoothed square') +
      M('sin(ωt)·(1 + m·sin(2πrt)) = sin ωt + (m/2)[cos((ω − 2πr)t) − cos((ω + 2πr)t)]'),
    listen: GP_L2('Set the rate to the song\'s tempo; switch Shape to Square for a choppy "stutter".', 'Réglez la vitesse sur le tempo ; passez la forme en carré pour un effet haché.'),
  },
  delay: {
    plot: 'impulse',
    diagram: ['IN', GP_L2('delay line', 'ligne de retard'), 'LPF 3.8 kHz', GP_L2('× repeats → back in', '× répétitions → réinjecté'), '× mix', '+ dry', 'OUT'],
    what: GP_L2('Plays back what you played a moment later, again and again, quieter each time — an echo.', 'Rejoue ce que vous avez joué un instant plus tard, encore et encore, de plus en plus doucement — un écho.'),
    how: GP_L2('A <b>delay line</b> stores the last second or so of sound. Its output is fed back into its input through a gain smaller than 1 (<b>Repeats</b>), so each echo is quieter. A low-pass in the loop makes each echo darker, like old tape echoes.',
      'Une <b>ligne de retard</b> garde en mémoire la dernière seconde de son. Sa sortie est réinjectée à l\'entrée avec un gain inférieur à 1 (<b>Répétitions</b>) : chaque écho est plus faible. Un passe-bas dans la boucle assombrit chaque écho, comme les vieux échos à bande.'),
    math: M('w[n] = LP(x[n − N] + fb·w[n − N]), &nbsp; N = time·f<sub>s</sub>') +
      M('y = x + mix·w &nbsp;⇒ &nbsp; echo k at k·time with level mix·fb<sup>k−1</sup>'),
    listen: GP_L2('Set Time to a beat of the riff (e.g. 500 ms at 120 BPM): the echoes groove with it.', 'Réglez le temps sur une pulsation du riff (500 ms à 120 BPM) : les échos groovent avec lui.'),
  },
  reverb: {
    plot: 'impulse',
    diagram: ['IN', GP_L2('convolution with h(t)', 'convolution avec h(t)'), 'LPF tone', '× mix', '+ dry', 'OUT'],
    what: GP_L2('Puts the sound in a space — from a small room to a big hall — by adding thousands of tiny reflections.', 'Place le son dans un espace — d\'une petite pièce à une grande salle — en ajoutant des milliers de petites réflexions.'),
    how: GP_L2('The reverb is described by an <b>impulse response</b> h(t): what you would record after a single clap. Here h is noise that fades out. <b>Convolution</b> adds a copy of h for every sample of your playing.',
      'La réverb est décrite par une <b>réponse impulsionnelle</b> h(t) : ce qu\'on enregistrerait après un seul claquement de mains. Ici h est un bruit qui s\'éteint. La <b>convolution</b> ajoute une copie de h pour chaque échantillon de votre jeu.'),
    math: M('h(t) = noise(t) · (1 − t/T)³, &nbsp; 0 ≤ t ≤ T = decay') +
      M('y[n] = (1 − 0.4m)·x[n] + 1.5m · Σ<sub>k</sub> h[k]·x[n − k]'),
    listen: GP_L2('Play short staccato chords: the space rings after each one.', 'Jouez des accords courts et piqués : l\'espace résonne après chacun.'),
  },
  amp: {
    plot: 'response',
    diagram: ['IN', '× gain', 'tanh', 'bass / mid / treble', GP_L2('cabinet filters', 'filtres du baffle'), '× master', 'OUT'],
    what: GP_L2('The amplifier adds its own warmth and break-up; the speaker cabinet removes the harsh highs that a raw distortion has.', 'L\'ampli ajoute sa chaleur et sa saturation ; le baffle retire les aigus durs d\'une distorsion brute.'),
    how: GP_L2('A preamp with soft clipping, a three-band <b>tone stack</b> (low shelf, mid peak, high shelf), then the cabinet: a guitar 4×12 has no deep lows, a presence peak near 2.5 kHz and rolls off above ~5 kHz; a bass 8×10 has a low bump and rolls off above ~3.5 kHz.',
      'Un préampli à écrêtage doux, un <b>correcteur</b> trois bandes (plateau grave, cloche médium, plateau aigu), puis le baffle : un 4×12 guitare n\'a pas d\'extrême grave, une bosse de présence vers 2,5 kHz et coupe au-dessus de ~5 kHz ; un 8×10 basse a une bosse dans le grave et coupe au-dessus de ~3,5 kHz.'),
    math: M('u = tanh(1.8 · 0.5·gain·x) / tanh(1.8)') +
      M('H = H<sub>bass</sub>·H<sub>mid</sub>·H<sub>treble</sub> · H<sub>HP</sub>·H<sub>bump</sub>·H<sub>presence</sub>·H<sub>LP</sub>²'),
    listen: GP_L2('Switch the cabinet to Off with a distortion pedal on: hear how fizzy raw distortion is.', 'Mettez le baffle sur Arrêt avec une distorsion : entendez à quel point la distorsion brute grésille.'),
  },
};

/* ---------- maths for the graphs (same formulas as the Web Audio filters: RBJ cookbook) ---------- */
const GPMath = (() => {
  const SR = 48000;
  function biquad(type, f0, Q = 0.707, gainDb = 0, sr = SR) {
    const w = 2 * Math.PI * f0 / sr, cw = Math.cos(w), sw = Math.sin(w), A = Math.pow(10, gainDb / 40);
    // Web Audio reads Q in dB for low-pass and high-pass (a resonance), linearly for the others.
    if (type === 'lowpass' || type === 'highpass') Q = Math.pow(10, Q / 20);
    const alpha = sw / (2 * Q);
    let b, a;
    switch (type) {
      case 'lowpass': b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
      case 'highpass': b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
      case 'bandpass': b = [alpha, 0, -alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]; break; // 0 dB peak
      case 'allpass': b = [1 - alpha, -2 * cw, 1 + alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
      case 'peaking': b = [1 + alpha * A, -2 * cw, 1 - alpha * A]; a = [1 + alpha / A, -2 * cw, 1 - alpha / A]; break;
      case 'lowshelf': case 'highshelf': {
        // Web Audio shelves use S = 1 (slope), i.e. alpha = sin(w)/2 * sqrt(2).
        const al = sw / 2 * Math.SQRT2, s = type === 'lowshelf' ? 1 : -1, k = 2 * Math.sqrt(A) * al;
        b = [A * ((A + 1) - s * (A - 1) * cw + k), s * 2 * A * ((A - 1) - s * (A + 1) * cw), A * ((A + 1) - s * (A - 1) * cw - k)];
        a = [(A + 1) + s * (A - 1) * cw + k, -s * 2 * ((A - 1) + s * (A + 1) * cw), (A + 1) + s * (A - 1) * cw - k];
        break;
      }
      default: throw new Error('unknown filter ' + type);
    }
    return { b: b.map((x) => x / a[0]), a: [1, a[1] / a[0], a[2] / a[0]] };
  }
  // Complex response of a biquad at frequency f: returns [re, im].
  function resp(c, f, sr = SR) {
    const w = 2 * Math.PI * f / sr;
    const z1r = Math.cos(w), z1i = -Math.sin(w), z2r = Math.cos(2 * w), z2i = -Math.sin(2 * w);
    const nr = c.b[0] + c.b[1] * z1r + c.b[2] * z2r, ni = c.b[1] * z1i + c.b[2] * z2i;
    const dr = 1 + c.a[1] * z1r + c.a[2] * z2r, di = c.a[1] * z1i + c.a[2] * z2i;
    const d = dr * dr + di * di;
    return [(nr * dr + ni * di) / d, (ni * dr - nr * di) / d];
  }
  const mag = (c, f) => Math.hypot(...resp(c, f));
  const mul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
  const db = (x) => 20 * Math.log10(Math.max(1e-6, x));

  // Magnitude in dB at f for a pedal (the frequency-shaping part), for the given settings.
  function pedalDb(type, p, f, extra = {}) {
    switch (type) {
      case 'wah': {
        const f0 = extra.f0 || 380 * Math.pow(2, p.pedal * 2.5);
        const [r, i] = resp(biquad('bandpass', f0, p.peak), f);
        const wet = 3 + p.peak * 0.8;
        return db(Math.hypot(wet * r + 0.15, wet * i));
      }
      case 'envfilter': {
        const fc = 220 * Math.pow(2, p.range * (0.3 + p.sens * 1.4) * (extra.env ?? 0));
        return db(mag(biquad('lowpass', fc, p.peak), f) * 0.9);
      }
      case 'eq': {
        const bands = [['lowshelf', 80, 0.707], ['peaking', 250, 1.1], ['peaking', 750, 1.1], ['peaking', 2200, 1.1], ['highshelf', 6000, 0.707]];
        return bands.reduce((s, [t, f0, q], i) => s + db(mag(biquad(t, f0, q, p['b' + (i + 1)]), f)), 0) + p.level;
      }
      case 'phaser': {
        const cents = (400 + 2000 * p.depth) * (extra.lfo ?? 0);
        const ap = biquad('allpass', 800 * Math.pow(2, cents / 1200), 0.6);
        let h = [1, 0];
        for (let k = 0; k < 6; k++) h = mul(h, resp(ap, f));
        return db(Math.hypot((1 - 0.3 * p.mix) + p.mix * h[0], p.mix * h[1]));
      }
      case 'flanger': {
        const d = 0.004 + (0.0003 + p.depth * 0.0033) * (extra.lfo ?? 0);
        const w = 2 * Math.PI * f * d;
        const er = Math.cos(w), ei = -Math.sin(w);
        const dr = 1 - p.regen * er, di = -p.regen * ei, den = dr * dr + di * di;
        const qr = (er * dr + ei * di) / den, qi = (ei * dr - er * di) / den;
        return db(Math.hypot(1 + 0.8 * qr, 0.8 * qi));
      }
      case 'amp': {
        const bass = extra.cab === 2;
        let s = db(mag(biquad('lowshelf', 120, 0.707, p.bass), f)) + db(mag(biquad('peaking', 700, 0.8, p.mid), f)) + db(mag(biquad('highshelf', 3000, 0.707, p.treble), f));
        if (p.cab !== 0) {
          s += db(mag(biquad('highpass', bass ? 38 : 80, 0.7), f)) + db(mag(biquad('peaking', bass ? 90 : 120, 1, bass ? 3 : 1.5), f));
          s += db(mag(biquad('peaking', bass ? 1200 : 2500, 1.2, bass ? 1 : 3), f)) + 2 * db(mag(biquad('lowpass', bass ? 3500 : 5200, 0.8), f));
        }
        return s;
      }
      default: return 0;
    }
  }

  // Waveshaper curves y = f(x) for the clipping pedals (same as rig.js).
  function transfer(type, p, x) {
    switch (type) {
      case 'overdrive': return Math.tanh(3 * Math.max(-1, Math.min(1, x * p.drive / 3))) / Math.tanh(3);
      case 'distortion': { const u = Math.max(-1, Math.min(1, x * p.drive / 4)); return Math.max(-1, Math.min(1, 1.5 * u - 0.5 * u * u * u)); }
      case 'fuzz': {
        const u = Math.max(-1, Math.min(1, x * Math.sqrt(p.drive)));
        const a = u > 0 ? Math.tanh(u * 2.5) : Math.tanh(u * 1.2) * 0.85;
        const v = Math.max(-1, Math.min(1, a * Math.sqrt(p.drive) / 3));
        return Math.max(-0.9, Math.min(0.9, v * 3)) / 0.9;
      }
      case 'bassdrive': return Math.tanh(2.2 * Math.max(-1, Math.min(1, x * p.drive / 3)));
      default: return x;
    }
  }

  // Compressor static curve: output level for an input level (dB).
  function compress(p, L) {
    const T = -8 - 42 * p.sustain, R = 2 + 10 * p.sustain;
    return (L < T ? L : T + (L - T) / R) + p.level + 4 * p.sustain;
  }

  return { biquad, resp, mag, db, pedalDb, transfer, compress };
})();

/* ---------- live graph for the "How it works" panel ---------- */
const GPLearnPlot = (() => {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g, w, h };
  }
  function grid(g, w, h, xs, ys) {
    g.strokeStyle = css('--grid'); g.lineWidth = 1; g.beginPath();
    xs.forEach((x) => { g.moveTo(Math.round(x) + 0.5, 0); g.lineTo(Math.round(x) + 0.5, h); });
    ys.forEach((y) => { g.moveTo(0, Math.round(y) + 0.5); g.lineTo(w, Math.round(y) + 0.5); });
    g.stroke();
  }
  function text(g, s, x, y, align = 'left', color = css('--muted')) { g.fillStyle = color; g.font = '10px ui-monospace, Menlo, monospace'; g.textAlign = align; g.fillText(s, x, y); }
  function line(g, pts, color, width = 2, dash = []) {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.stroke(); g.setLineDash([]);
  }

  // y = f(x) for the clipping pedals; the dashed diagonal is "no effect".
  function transfer(canvas, type, p) {
    const { g, w, h } = setup(canvas), pad = 6;
    const X = (x) => pad + ((x + 1) / 2) * (w - 2 * pad), Y = (y) => h - pad - ((y + 1) / 2) * (h - 2 * pad);
    grid(g, w, h, [X(-0.5), X(0), X(0.5)], [Y(-0.5), Y(0), Y(0.5)]);
    line(g, [[X(-1), Y(-1)], [X(1), Y(1)]], css('--grid-strong'), 1, [4, 4]);
    const pts = [];
    for (let i = 0; i <= 200; i++) { const x = -1 + i / 100; pts.push([X(x), Y(GPMath.transfer(type, p, x))]); }
    line(g, pts, css('--accent'), 2.5);
    text(g, 'x →', w - pad, Y(0) - 4, 'right'); text(g, 'y', X(0) + 4, pad + 8);
  }

  // Frequency response(s) in dB, log frequency axis.
  function response(canvas, type, p, opts) {
    const { g, w, h } = setup(canvas), fmin = 20, fmax = 20000;
    const curves = [];
    if (type === 'envfilter') curves.push([{ env: 0 }, 0.45], [{ env: 0.5 }, 0.7], [{ env: 1 }, 1]);
    else if (type === 'phaser' || type === 'flanger') curves.push([{ lfo: -1 }, 0.45], [{ lfo: 1 }, 1]);
    else if (type === 'wah' && p.rate > 0.01) curves.push([{ f0: 380 * Math.pow(2, p.pedal * 2.5) * Math.pow(2, -1100 / 1200) }, 0.45], [{ f0: 380 * Math.pow(2, p.pedal * 2.5) * Math.pow(2, 1100 / 1200) }, 1]);
    else curves.push([{ cab: opts.cab }, 1]);
    const F = (x) => fmin * Math.pow(fmax / fmin, x / w);
    const all = curves.map(([extra]) => { const ys = []; for (let x = 0; x <= w; x += 2) ys.push(GPMath.pedalDb(type, p, F(x), extra)); return ys; });
    const flat = all.flat().filter(Number.isFinite);
    let top = Math.max(6, Math.ceil((Math.max(...flat) + 3) / 6) * 6), bot = Math.min(-24, Math.floor((Math.min(...flat) - 3) / 6) * 6);
    bot = Math.max(bot, -60);
    const Y = (d) => 4 + (1 - (Math.max(bot, Math.min(top, d)) - bot) / (top - bot)) * (h - 18);
    const fx = (f) => (Math.log(f / fmin) / Math.log(fmax / fmin)) * w;
    grid(g, w, h, [100, 1000, 10000].map(fx), [Y(0)]);
    [100, 1000, 10000].forEach((f) => text(g, f >= 1000 ? f / 1000 + 'k' : String(f), fx(f) + 3, h - 3));
    text(g, '0 dB', w - 3, Y(0) - 3, 'right');
    text(g, top + ' dB', w - 3, 12, 'right');
    curves.forEach(([, alpha], i) => {
      g.globalAlpha = alpha;
      line(g, all[i].map((d, j) => [j * 2, Y(d)]), css('--accent'), alpha === 1 ? 2.5 : 1.5);
      g.globalAlpha = 1;
    });
  }

  // Compressor: output level vs input level, in dB.
  function compressor(canvas, p) {
    const { g, w, h } = setup(canvas), lo = -60, hi = 6;
    const X = (d) => ((d - lo) / (hi - lo)) * w, Y = (d) => h - ((Math.max(lo, Math.min(hi + 12, d)) - lo) / (hi + 12 - lo)) * h;
    grid(g, w, h, [-48, -24, 0].map(X), [-48, -24, 0].map(Y));
    line(g, [[X(lo), Y(lo)], [X(hi), Y(hi)]], css('--grid-strong'), 1, [4, 4]);
    const pts = [];
    for (let d = lo; d <= hi; d += 0.5) pts.push([X(d), Y(GPMath.compress(p, d))]);
    line(g, pts, css('--accent'), 2.5);
    const T = -8 - 42 * p.sustain;
    line(g, [[X(T), 0], [X(T), h]], css('--trace'), 1, [2, 3]);
    text(g, 'T ' + T.toFixed(0) + ' dB', X(T) + 4, 12, 'left', css('--trace'));
    text(g, 'in (dB) →', w - 3, h - 4, 'right'); text(g, 'out', 3, 12);
  }

  // The real octave-down algorithm (dsp.js) run on a 110 Hz note.
  function octave(canvas, p) {
    const { g, w, h } = setup(canvas), sr = 48000, f = 110, n = Math.floor(sr * 0.2);
    if (!globalThis.MooglabSubOctave && typeof mooglabDSP === 'function') mooglabDSP();
    const x = new Float32Array(n), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = 0.5 * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t + 0.6) + 0.25 * Math.sin(6 * Math.PI * f * t)); }
    new globalThis.MooglabSubOctave(sr).process(x, y);
    const start = n - Math.round(4 * sr / f), span = n - start;
    grid(g, w, h, [], [h / 2]);
    const peak = (arr) => { let m = 1e-9; for (let i = start; i < n; i++) m = Math.max(m, Math.abs(arr[i])); return m; };
    const pts = (arr, k) => Array.from({ length: 240 }, (_, i) => { const j = start + Math.floor(i / 239 * (span - 1)); return [i / 239 * w, h / 2 - arr[j] * k * (h / 2 - 8)]; });
    line(g, pts(x, 0.9 / peak(x)), css('--muted'), 1.5);
    line(g, pts(y, (0.35 + 0.55 * p.sub) / peak(y)), css('--accent'), 2.5); // height follows the Sub knob
    text(g, '4 × 110 Hz', 3, h - 4);
  }

  // Chorus delay times, or tremolo gain, over time.
  function lfo(canvas, type, p) {
    const { g, w, h } = setup(canvas);
    grid(g, w, h, [w / 4, w / 2, 3 * w / 4], [h / 2]);
    if (type === 'chorus') {
      const D = 0.5 + 5 * p.depth, secs = 2, Y = (ms) => h / 2 - ((ms - 14) / 6) * (h / 2 - 8);
      for (const [sign, col] of [[1, css('--accent')], [-1, css('--trace')]]) {
        const pts = [];
        for (let i = 0; i <= 200; i++) { const t = (i / 200) * secs; pts.push([(i / 200) * w, Y(14 + sign * D * Math.sin(2 * Math.PI * p.rate * t))]); }
        line(g, pts, col, 2);
      }
      text(g, '14 ms', 3, h / 2 - 4); text(g, '2 s', w - 3, h - 4, 'right');
    } else {
      const secs = 1, D = p.depth, pts = [];
      let sm = 0;
      for (let i = 0; i <= 400; i++) {
        const t = (i / 400) * secs, s0 = Math.sin(2 * Math.PI * p.rate * t), s = p.shape === 1 ? Math.sign(s0) : s0;
        sm += (s - sm) * (p.shape === 1 ? 0.25 : 1);
        pts.push([(i / 400) * w, h - 6 - (1 - D / 2 + (D / 2) * sm) * (h - 14)]);
      }
      line(g, pts, css('--accent'), 2.5);
      text(g, 'gain', 3, 12); text(g, '1 s', w - 3, h - 4, 'right');
    }
  }

  // Impulse responses: echoes for the delay, the decaying reflections for the reverb.
  function impulse(canvas, type, p) {
    const { g, w, h } = setup(canvas), secs = type === 'delay' ? Math.max(2, p.time * 8) : Math.max(1, p.size * 1.15);
    const X = (t) => 4 + (t / secs) * (w - 8), base = h - 14;
    grid(g, w, h, [], [base]);
    g.fillStyle = css('--muted'); g.fillRect(X(0) - 1.5, 6, 3, base - 6); // the dry click
    if (type === 'delay') {
      for (let k = 1; X(k * p.time) < w; k++) {
        const a = p.mix * Math.pow(p.repeats, k - 1);
        g.fillStyle = css('--accent'); g.fillRect(X(k * p.time) - 1.5, base - a * (base - 6), 3, a * (base - 6));
      }
    } else {
      g.fillStyle = css('--accent');
      for (let i = 0; i < w - 8; i++) {
        const t = (i / (w - 8)) * secs;
        if (t > p.size) break;
        const a = p.mix * 1.5 * Math.pow(1 - t / p.size, 3) * (0.35 + 0.65 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1));
        g.fillRect(X(t) + 2, base - Math.min(1, a) * (base - 6), 1, Math.min(1, a) * (base - 6));
      }
    }
    text(g, '0', X(0), h - 3); text(g, secs.toFixed(1) + ' s', w - 3, h - 3, 'right');
  }

  function draw(canvas, type, params, opts = {}) {
    const kind = GP_LEARN[type].plot;
    if (kind === 'transfer') transfer(canvas, type, params);
    else if (kind === 'response') response(canvas, type, params, opts);
    else if (kind === 'compressor') compressor(canvas, params);
    else if (kind === 'octave') octave(canvas, params);
    else if (kind === 'lfo') lfo(canvas, type, params);
    else if (kind === 'impulse') impulse(canvas, type, params);
  }
  return { draw };
})();

if (typeof module !== 'undefined') module.exports = { GP_LEARN, GPMath };
