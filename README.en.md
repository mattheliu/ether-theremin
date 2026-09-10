# ETHER · Sonar Theremin

[简体中文](README.md)

Play continuous pitch with hand movements detected through your computer’s speakers and microphone. Chinese is the default; the header switches to English. Touch and keyboard control provide a backup.

## Run locally

Node.js 22.13+ and npm are required. No account, API key or cloud configuration is needed.

```sh
npm ci
npm run dev
```

Open the localhost URL printed in the terminal. Microphone capture requires HTTPS or localhost.

1. Use built-in speakers and a physical microphone, without headphones.
2. Start sonar, grant microphone access, and remain still until calibration finishes.
3. Move your palm toward the speakers to raise pitch and away to lower it. Sound fades when motion stops.
4. Adjust tone, glide, reverb and scale assist. Stop, Escape or moving the page into the background releases the microphone and stops the probe.

The microphone selector lets you choose a specific input. Automatic mode tries a built-in microphone if the default is a recognized virtual input. Browsers may hide device labels before permission is granted.

System volume and Probe level control the sensing tone; Output volume controls only the music. Calibration tests 18.5–21 kHz by default. The optional compatibility band tries 16–18 kHz only after the high band fails. These tones may be audible to people or pets. Start quietly and stop if uncomfortable.

## Diagnostics and privacy

Calibration diagnostics show the actual input, sample rates, input level, reported audio processing and per-frequency stability. A nearly silent input often means incorrect input routing; check virtual devices, input volume and mute. If normal audio is present but the probe is weak, check speaker routing, output volume and microphone mode. Browser settings cannot rule out macOS or hardware processing.

Audio is processed only on the device: it is not recorded, uploaded or played back. Diagnostics and device identifiers stay in page memory. Only the theme preference is stored locally. Optional WebMCP tools expose state, input enumeration, configuration and stop actions; they never start audio or request microphone permission. `state.message` contains a stable translation key.

## Implementation

Inspired by [Daniel Rapp’s doppler](https://github.com/DanielRapp/doppler) and [SoundWave, CHI 2012](https://www.microsoft.com/en-us/research/publication/soundwave-using-doppler-effect-sense-gestures/). The engine uses linear spectral power, a stationary baseline, a second bandwidth scan for detached peaks, and time-based pitch integration. Calibration uses a multi-frame background median and requires four stable frames per accepted carrier. Both microphone and processing sample rates constrain the usable band.

This senses motion, not absolute distance, and does not track two hands independently. It borrows the theremin’s continuous pitch expression rather than its capacitive sensing. Results depend on hardware, browser and room reflections; synthetic tests cannot validate every acoustic environment.

## Development and translation

```sh
npm run check
npm run build
npm run start
```

- `app/`: playing interface, styles and metadata.
- `components/`: diagnostics, instrument history and used UI primitives.
- `lib/instrument.ts`: audio, device selection and lifecycle.
- `lib/signal.ts`: signal processing and pitch integration.
- `lib/locales/zh.ts` and `en.ts`: UI, metadata, statuses and errors.
- `lib/instrument-errors.ts`: browser failures mapped to stable message keys.
- `lib/webmcp.ts`: optional structured browser tools.
- `tests/`: synthetic signals and simulated audio devices.

Chinese defines the dictionary shape; English uses `satisfies Locale` to catch missing or misspelled keys. Add both translations for every new message. The engine emits typed `MessageKey` values, not display text. Keep translatable prose out of the engine and JSX. Brand names, source names, browser-reported device labels and tool protocol identifiers remain unchanged. Switching language does not recreate the audio engine.

## Deployment and source export

The standalone source runs and builds without a Sites binding. For Sites hosting, configure your own `.openai/hosting.json` using `.openai/hosting.example.json` as a starting point. Never reuse another site’s project identifier.

```sh
npm run export:source -- ../ether-theremin-source
```

The allowlisted export excludes Git history, deployment bindings, dependencies, builds and temporary files. It checks for common credential patterns and local paths. The destination must not exist. Exporting does not create or publish a remote repository.

## License

Project-owned code is [MIT licensed](LICENSE). Third-party materials retain their own licenses: doppler and shadcn (MIT), Manrope (OFL 1.1), and the museum photograph (CC BY 4.0). The main artwork was AI-generated for this project and is not historical imagery. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution, asset terms and historical references.
