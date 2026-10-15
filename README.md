# MoogLab — learn-synthesizer

An interactive app to learn synthesis on a simulated **Minimoog Model D**-style monosynth.
It goes through **6 levels**, each one adding a section of the synth and giving you a lesson,
challenges to try and live visualizations.

| Level | Topic | Unlocks |
|---|---|---|
| 1 | The Oscillator | waveform, octave range (32'–2'), scope + spectrum |
| 2 | The Ladder Filter | cutoff, emphasis (resonance, self-oscillation), drive, response plot |
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
js/lessons.js     curriculum: lessons + challenges
js/viz.js         oscilloscope, spectrum, filter response, envelopes
js/app.js         UI, keyboard, MIDI, progress
tests/            DSP and curriculum tests (npm test)
```

Progress and your saved patches are stored in the browser's `localStorage`.
