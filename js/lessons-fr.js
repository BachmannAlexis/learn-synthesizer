/* Leçons en français. Mêmes niveaux et mêmes identifiants de défis que lessons.js. */
const LESSONS_FR = {
  1: {
    title: 'L\'oscillateur',
    subtitle: 'Hauteur et timbre',
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
    title: 'Le filtre ladder',
    subtitle: 'Synthèse soustractive',
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
      <p>Observez la courbe de réponse : plus d'emphase <b>amincit aussi les basses</b> — un trait typique du vrai ladder.</p>`,
    tips: [
      'Tenez une note et balayez lentement la coupure — le fameux « wah ».',
      'Montez l\'emphase, puis balayez la coupure : on entend chanter les harmoniques une à une.',
    ],
    challenges: {
      'l2-dark': 'Étouffez une onde en scie : coupure sous 300 Hz',
      'l2-peak': 'Créez un pic résonant : emphase au-dessus de 70 % et coupure entre 500 Hz et 3 kHz',
      'l2-selfosc': 'Faites siffler le filtre tout seul : emphase ≥ 95 %',
      'l2-drive': 'Saturez le ladder : saturation au-dessus de ×2,5',
    },
  },
  3: {
    title: 'Les enveloppes',
    subtitle: 'Façonner le son dans le temps',
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
    title: 'Trois oscillateurs',
    subtitle: 'Le mélangeur du Minimoog',
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
    title: 'Modulation et jeu',
    subtitle: 'LFO, molettes, glissando',
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
    title: 'Bac à sable Model D',
    subtitle: 'Tout le synthé + presets',
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
