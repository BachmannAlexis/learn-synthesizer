/* Leçons en français. Mêmes niveaux et mêmes identifiants de défis que lessons.js. */
const LESSONS_FR = {
  1: {
    math: `<p>Un oscillateur numérique garde une <b>phase</b> φ qui monte de 0 à 1 à chaque cycle ; chaque forme d'onde est une fonction simple de φ. Un saut brusque (scie, carré) contient des harmoniques au-dessus de la fréquence de Nyquist qui reviendraient comme du bruit : l'appli adoucit chaque saut avec <b>PolyBLEP</b>.</p><p class="math">φ[n+1] = (φ[n] + f/f<sub>s</sub>) mod 1, &nbsp; f = 440 · 2<sup>(note − 69)/12</sup> · 2<sup>range − 2</sup></p><p class="math">saw = 2φ − 1, &nbsp; square = sign(½ − φ), &nbsp; triangle = 1 − 4|φ − ½|, &nbsp; sine = sin 2πφ</p><p class="math">saw(t) = (2/π) Σ<sub>k≥1</sub> (−1)<sup>k+1</sup> sin(kωt)/k, &nbsp; square(t) = (4/π) Σ sin((2k−1)ωt)/(2k−1)</p><p class="math">PolyBLEP: near each jump (t &lt; Δ or t &gt; 1 − Δ, Δ = f/f<sub>s</sub>) subtract a small polynomial — it removes aliasing</p>`,
    title: 'L\'oscillateur',
    subtitle: 'Hauteur et timbre',
    summary: [
      'Un oscillateur répète une forme d\'onde : sa vitesse donne la <b>hauteur</b>, sa forme le <b>timbre</b>.',
      'Sinus : pur ; triangle : doux ; scie : brillante (toutes les harmoniques) ; carré : creux (harmoniques impaires).',
      'Registre en pieds : 32\' le plus grave, 8\' normal, 2\' le plus aigu.',
    ],
    theory: `
      <p>Tout son est de l'air qui vibre. Un synthétiseur commence par un <b>oscillateur</b> — sur un Moog, c'est un
      <b>VCO</b> (oscillateur contrôlé en tension) : un circuit dont la sortie répète une forme un grand nombre de fois par seconde.</p>
      <ul>
        <li>La <b>fréquence</b> (combien de répétitions par seconde) s'entend comme la <b>hauteur</b>. La4 = 440 Hz ; monter d'une octave double la fréquence.</li>
        <li>La <b>forme d'onde</b> s'entend comme le <b>timbre</b> — la « couleur » du son.</li>
      </ul>
      <p>Toute forme périodique est une somme de sinusoïdes appelées <b>harmoniques</b> (à 1×, 2×, 3×… la fondamentale).
      Regardez le <b>spectre</b> :</p>
      <ul>
        <li><b>Sinus</b> — uniquement la fondamentale. Pur, comme une flûte.</li>
        <li><b>Triangle</b> — harmoniques impaires qui décroissent vite (1/n²). Doux, creux.</li>
        <li><b>Scie</b> — toutes les harmoniques (1/n). Brillant, bourdonnant : la matière première du son Moog.</li>
        <li><b>Carré / impulsions</b> — le carré n'a que des harmoniques impaires (proche de la clarinette) ; les impulsions plus étroites sonnent plus fines et nasales.</li>
      </ul>
      <p>Moog indique les octaves en <b>pieds</b>, comme un orgue : 32' est le plus grave, 2' le plus aigu ; 8' est le « diapason normal ».</p>`,
    tips: [
      'Jouez avec le clavier de l\'ordinateur : la rangée de lettres du milieu joue les touches blanches et la rangée du dessus les noires — les lettres sont affichées sur le piano (AZERTY comme QWERTY). Les deux touches à gauche de la rangée du bas changent d\'octave.',
      'Changez de forme d\'onde en tenant une note. Comparez l\'oscilloscope (la forme) et le spectre (les harmoniques).',
      'Sous le synthé : des pédales d\'effets et une <b>station de boucles</b>. Appuyez sur <kbd>R</kbd> pour enregistrer une boucle, puis jouez par-dessus.',
    ],
    challenges: {
      'l1-play': 'Jouez une note',
      'l1-sine': 'Trouvez la forme d\'onde qui n\'a qu\'un seul pic dans le spectre',
      'l1-odd': 'Obtenez un son creux, proche de la clarinette (harmoniques impaires, onde à sommet plat)',
      'l1-low': 'Descendez au registre le plus grave (32\')',
    },
  },
  2: {
    math: `<p>Le ladder, ce sont quatre étages passe-bas d'un pôle en série, chacun avec la courbe <b>tanh</b> des transistors, et la sortie réinjectée à l'entrée. Il tourne deux fois par échantillon (suréchantillonnage) pour rester stable et propre aux coupures élevées.</p><p class="math">u = tanh(drive · x − k · s<sub>4</sub>), &nbsp; k = 4.2 · emphasis</p><p class="math">s<sub>i</sub> ← s<sub>i</sub> + g · (tanh s<sub>i−1</sub> − tanh s<sub>i</sub>), &nbsp; i = 1…4, &nbsp; g = 1 − e<sup>−2πf<sub>c</sub> / 2f<sub>s</sub></sup> &nbsp;(2× oversampled)</p><p class="math">H(s) = 1 / ((1 + s/ω<sub>c</sub>)⁴ + k) &nbsp;→ at k = 4 each stage turns 45°, the loop 180°: self-oscillation at ω<sub>c</sub></p><p class="math">types mix u and the stages: LP24 = s<sub>4</sub>, LP12 = s<sub>2</sub>, HP24 = u − 4s<sub>1</sub> + 6s<sub>2</sub> − 4s<sub>3</sub> + s<sub>4</sub>, BP = 2s<sub>1</sub> − 2s<sub>2</sub>, notch = u − 2s<sub>1</sub> + 2s<sub>2</sub></p>`,
    title: 'Le filtre ladder',
    subtitle: 'Synthèse soustractive',
    summary: [
      'Synthèse soustractive : on part d\'un son brillant et on <b>retire des harmoniques</b> avec un filtre.',
      'La <b>coupure</b> fixe où le filtre agit ; l\'<b>emphase</b> ajoute un pic — au maximum, le filtre siffle tout seul.',
      'Le <b>type</b> choisit ce qu\'on garde : les graves (PB), les aigus (PH), une bande (Bande) ou tout sauf une bande (Coupe).',
    ],
    theory: `
      <p>La synthèse Moog est <b>soustractive</b> : on part d'une onde riche en harmoniques et on <b>retire</b> des harmoniques avec un filtre.</p>
      <p>Le <b>filtre à échelle de transistors</b> (« ladder ») breveté par Bob Moog en 1966 est un <b>passe-bas</b> fait de quatre étages
      identiques, chacun retirant 6 dB par octave → <b>24 dB/octave</b> au-dessus de la fréquence de coupure. C'est le cœur du « son Moog ».</p>
      <ul>
        <li><b>Coupure</b> — la fréquence à partir de laquelle le filtre agit. Plus elle est basse, plus le son est sombre et étouffé.</li>
        <li><b>Emphase</b> (résonance) — renvoie la sortie vers l'entrée et crée un pic à la fréquence de coupure.
        Au maximum, le filtre <b>auto-oscille</b> et devient à lui seul un oscillateur sinusoïdal.</li>
        <li><b>Saturation</b> — sur le Minimoog, les musiciens rebouclaient la sortie dans le mélangeur pour surcharger les
        transistors. La saturation (tanh) ajoute des harmoniques chaudes et du « grain ».</li>
      </ul>
      <p>Observez la courbe de réponse : plus d'emphase <b>amincit aussi les basses</b> — un trait typique du vrai ladder.</p>
      <p><b>Types de filtre.</b> Le Minimoog n'a que le passe-bas ladder, mais en mélangeant les sorties des quatre étages
      de l'échelle, les Moog plus récents (et les Oberheim) obtiennent d'autres formes. Changez le <b>Type</b> et regardez la courbe :</p>
      <ul>
        <li><b>PB 24 / PB 12</b> — passe-bas : garde les graves. 24 dB/oct est la pente raide classique du Moog ; 12 dB/oct est plus douce et plus brillante.</li>
        <li><b>PH 24 / PH 12</b> — passe-haut : retire les graves. Son fin, aérien, utile pour laisser la place à une basse.</li>
        <li><b>Bande</b> — passe-bande : ne garde qu'une bande autour de la coupure. Nasal, façon téléphone, il « parle » quand on le balaie.</li>
        <li><b>Coupe</b> — coupe-bande (réjecteur) : retire une bande étroite autour de la coupure. Discret à l'arrêt, proche d'un phaser quand il bouge.</li>
      </ul>`,
    tips: [
      'Tenez une note et balayez lentement la coupure — le fameux « wah ».',
      'Montez l\'emphase, puis balayez la coupure : on entend chanter les harmoniques une à une.',
    ],
    challenges: {
      'l2-dark': 'Étouffez une onde en scie : passe-bas, coupure sous 300 Hz',
      'l2-peak': 'Créez un pic résonant : emphase au-dessus de 70 % et coupure entre 500 Hz et 3 kHz',
      'l2-selfosc': 'Faites siffler le filtre tout seul : emphase ≥ 95 %',
      'l2-drive': 'Saturez le ladder : saturation au-dessus de ×2,5',
      'l2-types': 'Amincissez le son : un type passe-haut avec la coupure au-dessus de 1 kHz',
    },
  },
  3: {
    math: `<p>Chaque enveloppe est une courbe <b>RC</b> analogique : à chaque échantillon elle parcourt une fraction fixe du chemin vers sa cible, ce qui donne des courbes exponentielles comme un condensateur qui se charge.</p><p class="math">attack: v ← v + (1.3 − v)·c<sub>a</sub> until v = 1, &nbsp; c<sub>a</sub> = 1 − e<sup>−1.466 / (A·f<sub>s</sub>)</sup></p><p class="math">decay: v ← v + (S − v)·c<sub>d</sub>, &nbsp; release: v ← v − v·c<sub>r</sub>, &nbsp; c = 1 − e<sup>−4 / (time·f<sub>s</sub>)</sup></p><p class="math">out = v<sub>loudness</sub> · filter(x), &nbsp; f<sub>c</sub> = cutoff · 2<sup>amount · v<sub>filter</sub></sup></p>`,
    title: 'Les enveloppes',
    subtitle: 'Façonner le son dans le temps',
    summary: [
      'Une enveloppe façonne le son dans le temps : <b>Attaque, Déclin, Maintien</b> (un niveau), <b>Relâche</b>.',
      'L\'enveloppe du volume règle le volume ; celle du filtre ouvre et ferme la coupure.',
      'Déclin court sans maintien = son pincé ; attaque lente = son qui enfle ; grande enveloppe de filtre = « bwow ».',
    ],
    theory: `
      <p>Les vrais instruments évoluent dans le temps : une corde pincée est brillante puis s'éteint ; un violon enfle.
      Moog appelait ses générateurs d'enveloppe des <b>« contour generators »</b>. Chacun produit une tension de commande quand vous appuyez sur une touche :</p>
      <ul>
        <li><b>Attaque</b> — le temps pour monter de 0 au maximum.</li>
        <li><b>Déclin</b> — le temps pour redescendre jusqu'au niveau de maintien.</li>
        <li><b>Maintien</b> — le niveau gardé tant que la touche reste enfoncée (un niveau, pas une durée !).</li>
        <li><b>Relâche</b> — le temps pour s'éteindre après avoir lâché la touche.</li>
      </ul>
      <p>L'<b>enveloppe du volume</b> pilote le <b>VCA</b> (amplificateur). L'<b>enveloppe du filtre</b> fait monter la coupure de
      <b>Qté env.</b> octaves — c'est ainsi qu'on obtient le célèbre « bwow » Moog et les basses percussives.</p>
      <p>Comme sur le Minimoog, la voix est en <b>déclenchement simple</b> : si vous jouez legato (notes qui se chevauchent), les enveloppes ne repartent pas de zéro.</p>`,
    tips: [
      'Coupure basse et quantité d\'enveloppe élevée : chaque note « s\'ouvre » puis se referme.',
      'Suivez les repères sur le graphique des enveloppes — ils montrent où en est chaque enveloppe en ce moment.',
    ],
    challenges: {
      'l3-pluck': 'Faites un son pincé : attaque < 10 ms, maintien < 10 %, déclin < 500 ms',
      'l3-swell': 'Faites un son qui enfle : attaque du volume au-dessus de 1 s',
      'l3-bwow': '« Bwow » : coupure < 400 Hz, quantité d\'enveloppe > 3 oct, maintien du filtre < 20 %',
      'l3-tail': 'Laissez sonner après la touche : relâche du volume au-dessus de 1,5 s',
    },
  },
  4: {
    math: `<p>Le mélangeur additionne simplement les oscillateurs. Deux fréquences proches se décalent et se recalent : le volume monte et descend à la fréquence de leur différence — le <b>battement</b>.</p><p class="math">mix = 0.6 · (L<sub>1</sub>·osc<sub>1</sub> + L<sub>2</sub>·osc<sub>2</sub> + L<sub>3</sub>·osc<sub>3</sub> + L<sub>n</sub>·noise), &nbsp; noise ∈ [−1, 1] random</p><p class="math">f<sub>2</sub> = f<sub>1</sub> · 2<sup>detune/12</sup>; &nbsp; beating = |f<sub>1</sub> − f<sub>2</sub>| &nbsp;(0.1 st at 220 Hz → 1.3 beats/s)</p><p class="math">fifth: 2<sup>7/12</sup> ≈ 1.498 ≈ 3/2</p>`,
    title: 'Trois oscillateurs',
    subtitle: 'Le mélangeur du Minimoog',
    summary: [
      'Le Minimoog mélange <b>trois oscillateurs et du bruit</b>.',
      'Désaccordez-en légèrement deux pour un son épais et vivant ; superposez les octaves pour du poids.',
      'Accordez-en un à la quinte (+7) pour des accords de puissance ; le bruit seul donne le vent et les vagues.',
    ],
    theory: `
      <p>Le <b>Minimoog Model D</b> (1970) possède <b>trois VCO</b> et une source de <b>bruit</b> qui entrent dans un <b>mélangeur</b>.
      C'est en combinant les oscillateurs qu'on obtient le gros son Moog :</p>
      <ul>
        <li><b>Désaccord</b> — deux oscillateurs à quelques centièmes de demi-ton d'écart se décalent et se recalent sans cesse.
        Le <b>battement</b> lent qu'on entend (et qu'on voit sur l'oscilloscope) rend le son épais et vivant.</li>
        <li><b>Octaves</b> — superposez 16' et 8' pour du poids, ou 32' pour une sous-basse.</li>
        <li><b>Intervalles</b> — accorder un oscillateur à +7 demi-tons (une quinte) fait jouer un accord de puissance à chaque touche.</li>
        <li><b>Bruit</b> — un signal aléatoire qui contient toutes les fréquences : vent, ressac, caisse claire, souffle.</li>
      </ul>
      <p>Les niveaux du mélangeur règlent aussi la force avec laquelle le ladder est attaqué — un mélange fort sature davantage.</p>`,
    tips: [
      'Coupez puis remettez un oscillateur en tenant une note : écoutez ce qu\'apporte le désaccord.',
      'Essayez l\'oscillateur 3 en 32\' (deux octaves plus bas) sous une mélodie en 8\'.',
    ],
    challenges: {
      'l4-fat': 'Épaississez le son : Osc 2 au-dessus de 30 %, désaccordé de 0,05 à 0,3 demi-ton',
      'l4-fifth': 'Jouez des accords de puissance : accordez l\'Osc 2 ou 3 à la quinte (+7 ou −5 dt)',
      'l4-sub': 'Ajoutez une sous-basse : un oscillateur audible en 32\' sous un autre en 8\'',
      'l4-wind': 'Faites du vent : uniquement du bruit dans le mélangeur',
    },
  },
  5: {
    math: `<p>La modulation s'ajoute à la hauteur (en demi-tons) ou à la coupure (en octaves) : une modulation sonne donc pareil partout sur le clavier. Le glissando est un passe-bas d'un pôle sur le numéro de note.</p><p class="math">pitch = note + bend + lfo · depth<sub>pitch</sub> · mod, &nbsp; f = 440 · 2<sup>(pitch − 69)/12</sup></p><p class="math">f<sub>c</sub> = cutoff · 2<sup>env + lfo · depth<sub>filter</sub> · mod + track · (note − 60)/12</sup></p><p class="math">glide: n ← n + (target − n) · (1 − e<sup>−1/(0.3 · glide · f<sub>s</sub>)</sup>) &nbsp;(in semitones, per sample)</p><p class="math">LFO: φ ← φ + rate/f<sub>s</sub>; sine, triangle, square, saw, or a new random value each cycle (S&amp;H)</p>`,
    title: 'Modulation et jeu',
    subtitle: 'LFO, molettes, glissando',
    summary: [
      'Un <b>LFO</b> fait bouger lentement une autre commande : sur la hauteur c\'est le vibrato, sur le filtre le wobble.',
      'La <b>molette Mod</b> dose le LFO ; la molette de hauteur fait glisser les notes.',
      'Le <b>glissando</b> relie les notes ; le suivi clavier garde les aigus brillants.',
    ],
    theory: `
      <p><b>Moduler</b>, c'est laisser un signal tourner automatiquement le bouton d'un autre. Un <b>LFO</b>
      (oscillateur basse fréquence, sous ~20 Hz) est trop lent pour s'entendre, mais il peut faire onduler la hauteur ou la coupure.
      Sur le Minimoog, l'oscillateur 3 pouvait passer en registre bas pour servir de LFO.</p>
      <ul>
        <li><b>LFO → Hauteur</b> = <b>vibrato</b> (5 à 7 Hz sonne naturel).</li>
        <li><b>LFO → Filtre</b> = <b>wah / wobble</b> ; en mode aléatoire, on obtient des bips d'« ordinateur ».</li>
        <li><b>Molette de modulation</b> — la molette de gauche du Minimoog dose <i>combien</i> de modulation arrive à destination. Jouez avec expression !</li>
        <li><b>Molette de hauteur</b> — fait glisser les notes de ±2 demi-tons, comme un guitariste.</li>
        <li><b>Glissando</b> (portamento) — la hauteur glisse d'une note à l'autre. Jouez legato pour les solos de rock progressif.</li>
        <li><b>Suivi clavier</b> — la coupure suit le clavier, pour que les notes aiguës restent aussi brillantes que les graves.</li>
      </ul>`,
    tips: [
      'Les quantités de LFO n\'agissent que si la <b>molette Mod</b> est levée — elle est à côté du clavier.',
      'Activez le glissando, puis tenez une touche et appuyez sur une autre avant de lâcher la première.',
    ],
    challenges: {
      'l5-vib': 'Vibrato : LFO → hauteur > 0,1 dt, vitesse 4 à 8 Hz, molette Mod levée',
      'l5-wob': 'Wobble : LFO → filtre > 1 oct, emphase > 50 %, molette Mod levée',
      'l5-glide': 'Glissando : glissando > 100 ms et deux notes jouées legato (qui se chevauchent)',
      'l5-bend': 'Faites glisser une note avec la molette de hauteur',
    },
  },
  6: {
    math: `<p>La voix complète, calculée échantillon par échantillon dans un AudioWorklet. Pour les effets après le synthé, ouvrez l'onglet <b>Pédales</b> et appuyez sur « ? » sur une pédale.</p><p class="math">y = tanh(1.4 · VCA<sub>env</sub>(ladder(mixer(osc<sub>1</sub>, osc<sub>2</sub>, osc<sub>3</sub>, noise))) · volume) &nbsp;→ pedals</p><p class="math">every sample: oscillators → mixer → 2× ladder steps → envelopes → output, at f<sub>s</sub> = 44.1 or 48 kHz</p>`,
    title: 'Bac à sable Model D',
    subtitle: 'Tout le synthé + presets',
    summary: [
      'Tout est débloqué : étudiez les presets et demandez-vous <i>pourquoi</i> chacun sonne ainsi.',
      'Recette : <b>source</b> (ondes) → <b>timbre</b> (filtre) → <b>forme</b> (enveloppes) → <b>vie</b> (modulation).',
      'Ajoutez des pédales et enregistrez des boucles pour construire un morceau.',
    ],
    theory: `
      <p>Vous connaissez maintenant chaque section d'un monosynthé de type Minimoog. Étudiez les presets — ouvrez-en un,
      puis expliquez-vous <i>pourquoi</i> il sonne ainsi :</p>
      <ul>
        <li><b>Fat Bass</b> — trois scies/carrés dans les octaves graves, coupure basse, forte enveloppe de filtre, un peu de saturation.</li>
        <li><b>Lead</b> — carré + scie, glissando et vibrato sur la molette Mod.</li>
        <li><b>Brass</b> — attaque lente du filtre (le « blat » des cuivres) et léger désaccord.</li>
        <li><b>Acid Squelch</b> — une seule scie, beaucoup d'emphase, déclin du filtre court.</li>
        <li><b>Self-osc Whistle</b> — aucun oscillateur ! C'est le filtre lui-même qui chante en suivant le clavier.</li>
      </ul>
      <p>La recette pour créer n'importe quel son : <b>source</b> (ondes, octaves) → <b>timbre</b> (filtre) → <b>forme</b> (enveloppes) → <b>vie</b> (modulation).</p>`,
    tips: [
      'Enregistrez vos propres sons — ils sont gardés dans votre navigateur.',
      'Composez un morceau : enregistrez une boucle de basse avec <kbd>R</kbd>, appuyez encore sur <kbd>R</kbd> pour arrêter l\'enregistrement, changez de preset et jouez une mélodie par-dessus. <kbd>R</kbd> à nouveau pour superposer.',
      'Les pédales viennent après le synthé, comme le pédalier d\'un guitariste : Overdrive → Chorus → Écho → Réverb.',
      'Vous avez un clavier MIDI ? Branchez-le : notes, molette de modulation (CC1), molette de hauteur et pédale de maintien fonctionnent.',
    ],
    challenges: {
      'l6-presets': 'Écoutez 4 presets différents',
      'l6-whistle': 'Jouez une mélodie sans oscillateur (uniquement le filtre qui auto-oscille)',
      'l6-save': 'Créez et enregistrez votre propre son',
    },
  },
};

if (typeof module !== 'undefined') module.exports = { LESSONS_FR };
