# MoogLab — learn-synthesizer

**▶ Play it: https://bachmannalexis.github.io/learn-synthesizer/** · English / Français


An interactive app to learn synthesis on a simulated **Minimoog Model D**-style monosynth.
It goes through **6 levels**, each one adding a section of the synth and giving you a lesson,
challenges to try and live visualizations.

Two sections, switched from the top bar:

- **Learn / Apprendre** — six levels, each with three key points (full lesson one click away), challenges (stars), the controls it introduces and a **Demo** button: 15–20 s where the app plays and turns the knobs itself, with captions.
- Every panel section (each oscillator, mixer, filter, envelopes, modulation, output), the pedalboard and each scope can be **folded** to a one-line summary of its settings; "Fold all" folds everything, and the choice is remembered.
- **Studio** — the whole synth unlocked for free play: presets, pedals, loop station and all scopes. Your Studio sound is saved separately from the lessons.

- **Pedals / Pédales** — a guitar & bass pedal simulator: 15 pedals (compressor, wah, envelope filter, octaver, overdrive, distortion, fuzz, bass drive, EQ, chorus, phaser, flanger, tremolo, delay, reverb) plus amp & cabinet. Build a board, reorder it (or sort it into the classic order), use presets, and hear it with demo riffs, the keyboard (a plucked-string model, in tune to within a cent), an audio file or your own instrument through a microphone or audio interface. Includes a tuner. The keyboard and riffs can also play the **Moog synth through the pedalboard**.
- **Learn how it works** — every pedal (and the amp) has a "?" panel: what it does, how it works, the exact maths the app computes, what to listen for, a signal-path diagram and a live graph (clipping curve, frequency response, compressor curve, octave-down waveform, LFO movement or impulse response) that follows the knobs. The graphs use the same filter formulas as the browser (checked against Web Audio to 0.00 dB). Each synth lesson also has a "How it's simulated (the maths)" section.

The interface and all lessons are in **English and French** (EN/FR switch; it starts in your browser's language).
The computer keyboard uses physical key positions, so it plays the same on QWERTY, AZERTY or QWERTZ keyboards, and the letters on the piano keys match your layout.

| Level | Topic | Unlocks |
|---|---|---|
| 1 | The Oscillator | waveform, octave range (32'–2'), scope + spectrum |
| 2 | The Ladder Filter | filter type (LP 24/12, HP 24/12, band-pass, notch), cutoff, emphasis (resonance, self-oscillation), drive, response plot |
| 3 | Contours | filter & loudness ADSR, contour amount, envelope graph |
| 4 | Three Oscillators | Osc 2/3, detune, mixer, noise |
| 5 | Modulation & Performance | LFO → pitch/filter, mod & pitch wheels, glide, key tracking |
| 6 | Model D Sandbox | everything, 9 factory presets, save your own patches |

## Run

No build step and no dependencies. Open `index.html` in a recent Chrome, Edge, Firefox or Safari,
or serve the folder:

```sh
npm start        # python3 -m http.server 8000 → http://localhost:8000
```

### Presets, pedals and loops

- **Presets on every level** — 22 factory sounds grouped by the level whose controls they use, plus your own saved patches.
- **Pedalboard** — Overdrive → Chorus → Echo → Reverb after the synth, each with a footswitch. Pedal settings stay put when you change level or preset.
- **Loop Station** — `R` records (press again to stop recording, again to overdub), `Space` plays/stops, Undo removes the last take. Tempo, length (1–8 bars), click and 1/16 snap. Loops play on a second synth voice, so you can play live over them.
- **Hold** (sustain) — on-screen button, right `Shift`, or a MIDI sustain pedal (CC64).

Play with your mouse/touch, your computer keyboard (`A`–`'` white keys, `W E T Y U O P` black keys,
`Z`/`X` change octave) or a MIDI keyboard (notes, mod wheel CC1, pitch bend).

## How the simulation works

The sound is computed sample by sample in an `AudioWorklet` (`js/dsp.js`):

- **VCOs** — sine, triangle, saw, square, wide and narrow pulse, anti-aliased with PolyBLEP.
- **Mixer** — 3 oscillators + white noise.
- **Moog transistor ladder** — four one-pole stages with `tanh` saturation and global resonance
  feedback, 2× oversampled. It self-oscillates at full emphasis and loses bass as resonance rises,
  like the original.
- **Contours** — analog-style RC envelopes (attack charges toward 1.3 and stops at 1.0), single-triggered on legato like the Minimoog.
- **Modulation** — LFO (sine/tri/square/saw/S&H) scaled by the mod wheel, glide, keyboard tracking, ±2 st pitch bend.

The filter-response plot uses the analytic ladder model `H(s) = 1 / ((1 + s/ωc)^4 + k)`.

## Files

```
index.html        layout
css/styles.css    styles
js/dsp.js         synth engine (runs in the AudioWorklet)
js/params.js      parameters, level start patches, presets
js/lessons.js     curriculum: lessons + challenges (English)
js/lessons-fr.js  lessons in French
js/i18n.js        interface translations and language switch
js/viz.js         oscilloscope, spectrum, filter response, envelopes
js/fx.js          effect pedals (Web Audio graph)
js/looper.js      loop station (recording, overdub, scheduling)
js/demos.js       auto-play demo script for each level
js/guitar/        pedal simulator: catalog (pedals, presets, riffs), strings (Karplus–Strong),
                  pitch (YIN tuner), rig (Web Audio pedal chain), learn (explanations, maths, graphs), section (UI)
js/app.js         UI, keyboard, MIDI, progress
tests/            DSP, curriculum, looper and translation tests (npm test)
.github/workflows/pages.yml   tests, then publishes to GitHub Pages on every push to main
```

Progress and your saved patches are stored in the browser's `localStorage`.

## Single-file build

`python3 tools/bundle.py out.html` inlines all CSS and JS into one HTML file you can host anywhere.
If the host blocks AudioWorklet modules, the app falls back to running the same engine on the main thread.
