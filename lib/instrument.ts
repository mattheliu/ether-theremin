import type { MessageKey } from './i18n';
import { InstrumentError, errorMessageKey } from './instrument-errors';
import {
  snapPitch,
  sonarPitch,
  sonarAmplitude,
  phraseAt,
  PHRASE_BPM,
  type Scale,
} from './melody';
import {
  clamp,
  midiToHz,
  dbToPower,
  detectMotion,
  medianSpectrum,
  evaluateCarrier,
  carrierFrequencies,
  type CarrierMeasurement,
} from './signal';
export type Settings = {
  volume: number;
  glide: number;
  reverb: number;
  sensitivity: number;
  probe: number;
  tone: string;
  quantize: boolean;
  scale: Scale;
  melody: boolean;
  compatibility: boolean;
  inputDeviceId: string;
};
export type SonarDiagnostics = {
  input: string;
  trackMuted: boolean;
  trackEnabled: boolean;
  audioState: AudioContextState;
  inputSampleRate?: number;
  contextSampleRate: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  micLevelDb: number;
  currentFrequency: number;
  measurements: CarrierMeasurement[];
};
export type InstrumentState = {
  running: boolean;
  phase: 'off' | 'requesting' | 'calibrating' | 'playing' | 'error';
  midi: number;
  amplitude: number;
  confidence: number;
  carrier: number;
  demoStep: number | null;
  message: MessageKey;
  diagnostics?: SonarDiagnostics;
  inputs?: { id: string; label: string }[];
};
export const DEFAULT_SETTINGS: Settings = {
  volume: 22,
  glide: 24,
  reverb: 28,
  sensitivity: 55,
  probe: 35,
  tone: 'classic',
  quantize: true,
  scale: 'pentatonic',
  melody: true,
  compatibility: false,
  inputDeviceId: 'auto',
};
export const INITIAL_STATE: InstrumentState = {
  running: false,
  phase: 'off',
  midi: 60,
  amplitude: 0,
  confidence: 0,
  carrier: 0,
  demoStep: null,
  message: 'sonarReady',
};

export class Instrument {
  mode: 'touch' | 'sonar' = 'sonar';
  private ctx?: AudioContext;
  private oscillator?: OscillatorNode;
  private envelope?: GainNode;
  private master?: GainNode;
  private wet?: GainNode;
  private analyser?: AnalyserNode;
  private wave = new Float32Array(2048);
  private spectrumData = new Float32Array(2048);
  private baseline = new Float32Array(2048);
  private stream?: MediaStream;
  private mic?: MediaStreamAudioSourceNode;
  private micAnalyser?: AnalyserNode;
  private mute?: GainNode;
  private pilot?: OscillatorNode;
  private pilotGain?: GainNode;
  private epoch = 0;
  private frame = 0;
  private suspendTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private freeMidi = 60;
  private snappedMidi?: number;
  private resting = false;
  private lastUi = 0;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private state: InstrumentState = { ...INITIAL_STATE };
  constructor(private notify: (state: InstrumentState) => void) {}
  snapshot() {
    return { ...this.state };
  }
  private emit(patch: Partial<InstrumentState>, throttle = false) {
    this.state = { ...this.state, ...patch };
    if (this.disposed) return;
    const now = performance.now();
    if (!throttle || now - this.lastUi > 45) {
      this.lastUi = now;
      this.notify({ ...this.state });
    }
  }
  configure(settings: Settings) {
    const previous = this.settings;
    this.settings = settings;
    if (
      previous.quantize !== settings.quantize ||
      previous.scale !== settings.scale ||
      previous.melody !== settings.melody
    )
      this.snappedMidi = undefined;
    if (
      previous.melody !== settings.melody &&
      settings.melody &&
      this.mode === 'sonar'
    )
      this.freeMidi = clamp(this.freeMidi, 60, 72);
    if (
      (previous.compatibility !== settings.compatibility ||
        previous.inputDeviceId !== settings.inputDeviceId) &&
      this.mode === 'sonar' &&
      (this.state.running ||
        this.state.phase === 'calibrating' ||
        this.state.phase === 'requesting')
    ) {
      this.stop('inputChanged');
      return;
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master?.gain.setTargetAtTime(
      this.state.running ? (settings.volume / 100) * 0.45 : 0,
      t,
      0.035,
    );
    this.wet?.gain.setTargetAtTime((settings.reverb / 100) * 0.75, t, 0.06);
    if (previous.probe !== settings.probe && this.pilotGain)
      this.pilotGain.gain.setTargetAtTime(
        0.02 + (settings.probe / 100) * 0.16,
        t,
        0.08,
      );
    if (previous.tone !== settings.tone) this.setTone();
    if (
      previous.quantize !== settings.quantize ||
      previous.scale !== settings.scale ||
      previous.melody !== settings.melody
    )
      this.play(this.freeMidi, this.state.amplitude);
  }
  private setTone() {
    if (!this.ctx || !this.oscillator) return;
    const real = new Float32Array(6),
      imag = new Float32Array(6);
    imag.set(
      this.settings.tone === 'pure'
        ? [0, 1]
        : this.settings.tone === 'hollow'
          ? [0, 1, 0, 0.3, 0, 0.12]
          : [0, 1, 0.24, 0.12, 0.05],
    );
    this.oscillator.setPeriodicWave(this.ctx.createPeriodicWave(real, imag));
  }
  private async ensureAudio() {
    clearTimeout(this.suspendTimer);
    if (this.ctx?.state === 'closed') this.ctx = undefined;
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.oscillator = c.createOscillator();
      this.oscillator.frequency.value = midiToHz(60);
      this.envelope = c.createGain();
      this.envelope.gain.value = 0;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4800;
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 2048;
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 6;
      const reverb = c.createConvolver(),
        buffer = c.createBuffer(
          2,
          Math.floor(c.sampleRate * 1.8),
          c.sampleRate,
        );
      let seed = 3901;
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 16807) % 2147483647;
          data[i] = ((seed / 2147483647) * 2 - 1) * (1 - i / data.length) ** 3;
        }
      }
      reverb.buffer = buffer;
      this.wet = c.createGain();
      this.wet.gain.value = (this.settings.reverb / 100) * 0.75;
      this.oscillator.connect(this.envelope);
      this.envelope.connect(filter);
      filter.connect(this.master);
      filter.connect(reverb);
      reverb.connect(this.wet);
      this.wet.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(this.analyser);
      this.analyser.connect(c.destination);
      this.setTone();
      this.oscillator.start();
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }
  private check(epoch: number) {
    if (this.disposed || epoch !== this.epoch)
      throw new DOMException('Cancelled', 'AbortError');
  }
  private async pause(ms: number, epoch: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    this.check(epoch);
  }
  async start(mode: 'touch' | 'sonar') {
    this.stop();
    const epoch = this.epoch;
    this.mode = mode;
    this.freeMidi = 60;
    this.emit({
      phase: 'requesting',
      diagnostics: undefined,
      message: mode === 'sonar' ? 'requestMicrophone' : 'startingAudio',
    });
    try {
      await this.ensureAudio();
      this.check(epoch);
      if (mode === 'sonar') await this.startSonar(epoch);
      else {
        this.master!.gain.setTargetAtTime(
          (this.settings.volume / 100) * 0.45,
          this.ctx!.currentTime,
          0.04,
        );
        this.emit({
          running: true,
          phase: 'playing',
          message: 'touchPlaying',
        });
      }
    } catch (error) {
      if (epoch !== this.epoch || this.disposed) return;
      this.stop();
      this.emit({ phase: 'error', message: errorMessageKey(error) });
    }
  }
  async refreshInputs() {
    if (!navigator.mediaDevices?.enumerateDevices)
      return this.state.inputs ?? [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter(
          (d) =>
            d.kind === 'audioinput' &&
            d.deviceId &&
            d.deviceId !== 'default' &&
            d.deviceId !== 'communications',
        )
        .map((d) => ({ id: d.deviceId, label: d.label }));
      this.emit({ inputs });
      return inputs;
    } catch {
      return this.state.inputs ?? [];
    }
  }
  private async openInput(epoch: number, deviceId?: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        sampleRate: { ideal: 48000 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    });
    if (epoch !== this.epoch || this.disposed) {
      stream.getTracks().forEach((t) => t.stop());
      this.check(epoch);
    }
    this.stream = stream;
    return stream;
  }
  private async startSonar(epoch: number) {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new InstrumentError('insecureContext');
    const selected =
      this.settings.inputDeviceId === 'auto'
        ? undefined
        : this.settings.inputDeviceId;
    let stream = await this.openInput(epoch, selected);
    let track = stream.getAudioTracks()[0];
    const inputs = await this.refreshInputs();
    this.check(epoch);
    if (
      !selected &&
      /virtual|cast audio|blackhole|loopback|虚拟/i.test(track.label)
    ) {
      const builtin = inputs.find((d) =>
        /macbook.*(microphone|麦克风)|built[ -]?in.*mic|内置.*麦克风/i.test(
          d.label,
        ),
      );
      if (builtin) {
        stream.getTracks().forEach((t) => t.stop());
        this.stream = undefined;
        stream = await this.openInput(epoch, builtin.id);
        track = stream.getAudioTracks()[0];
      }
    }
    const reported = track.getSettings();
    if (
      reported.echoCancellation ||
      reported.noiseSuppression ||
      reported.autoGainControl
    ) {
      const supported =
        navigator.mediaDevices.getSupportedConstraints?.() ?? {};
      const constraints: MediaTrackConstraints = {};
      if (supported.echoCancellation)
        constraints.echoCancellation = { exact: false };
      if (supported.noiseSuppression)
        constraints.noiseSuppression = { exact: false };
      if (supported.autoGainControl)
        constraints.autoGainControl = { exact: false };
      // Preserve access if a device cannot disable its processing. Report its actual settings.
      if (Object.keys(constraints).length) {
        try {
          await track.applyConstraints(constraints);
        } catch {}
        this.check(epoch);
      }
    }
    const inputSettings = track.getSettings();
    const diagnostics: SonarDiagnostics = {
      input: track.label,
      trackMuted: track.muted,
      trackEnabled: track.enabled,
      audioState: this.ctx!.state,
      inputSampleRate: inputSettings.sampleRate,
      contextSampleRate: this.ctx!.sampleRate,
      echoCancellation:
        inputSettings.echoCancellation === undefined
          ? undefined
          : inputSettings.echoCancellation !== false,
      noiseSuppression: inputSettings.noiseSuppression,
      autoGainControl: inputSettings.autoGainControl,
      micLevelDb: -140,
      currentFrequency: 0,
      measurements: [],
    };
    this.emit({ diagnostics });
    if (/virtual|cast audio|blackhole|loopback|虚拟/i.test(track.label))
      throw new InstrumentError('virtualInput');
    stream.getAudioTracks().forEach((track) =>
      track.addEventListener(
        'ended',
        () => {
          if (epoch === this.epoch) this.stop('microphoneDisconnected');
        },
        { once: true },
      ),
    );
    const c = this.ctx!;
    this.mic = c.createMediaStreamSource(stream);
    this.micAnalyser = c.createAnalyser();
    this.micAnalyser.fftSize = 4096;
    this.micAnalyser.smoothingTimeConstant = 0;
    this.micAnalyser.minDecibels = -120;
    this.micAnalyser.maxDecibels = 0;
    this.mute = c.createGain();
    this.mute.gain.value = 0;
    this.mic.connect(this.micAnalyser);
    this.micAnalyser.connect(this.mute);
    this.mute.connect(c.destination);
    this.pilot = c.createOscillator();
    this.pilot.type = 'sine';
    this.pilotGain = c.createGain();
    this.pilotGain.gain.value = 0;
    this.pilot.connect(this.pilotGain);
    this.pilotGain.connect(c.destination);
    this.pilot.start();
    this.emit({ phase: 'calibrating', message: 'searchingEcho' });
    const frequencies = carrierFrequencies(
      c.sampleRate,
      inputSettings.sampleRate,
      this.settings.compatibility,
    );
    if (!frequencies.length) throw new InstrumentError('sampleRateTooLow');
    const timeData = new Float32Array(this.micAnalyser.fftSize);
    const capture = async () => {
      const frames: Float32Array[] = [];
      for (let n = 0; n < 5; n++) {
        await this.pause(90, epoch);
        this.micAnalyser!.getFloatFrequencyData(this.spectrumData);
        frames.push(this.spectrumData.slice());
        this.micAnalyser!.getFloatTimeDomainData(timeData);
        let power = 0;
        for (const value of timeData)
          if (Number.isFinite(value)) power += value * value;
        diagnostics.audioState = c.state;
        diagnostics.trackMuted = track.muted;
        diagnostics.trackEnabled = track.enabled;
        diagnostics.micLevelDb = Math.max(
          diagnostics.micLevelDb,
          10 * Math.log10(Math.max(power / timeData.length, 1e-14)),
        );
      }
      return frames;
    };
    // Allow the capture path to settle, then use a robust probe-off reference.
    await this.pause(450, epoch);
    const before = medianSpectrum(await capture());
    let chosen = 0,
      best = -Infinity;
    for (const frequency of frequencies) {
      // Lower frequencies are only attempted after explicit opt-in and a failed high band.
      if (frequency < 18500 && chosen >= 18500) break;
      diagnostics.currentFrequency = frequency;
      this.emit({
        diagnostics: {
          ...diagnostics,
          measurements: [...diagnostics.measurements],
        },
      });
      this.pilot.frequency.setValueAtTime(frequency, c.currentTime);
      this.pilotGain.gain.setTargetAtTime(
        0.02 + (this.settings.probe / 100) * 0.16,
        c.currentTime,
        0.025,
      );
      await this.pause(300, epoch);
      const result = evaluateCarrier(
        before,
        await capture(),
        frequency,
        c.sampleRate,
        4096,
      );
      diagnostics.measurements.push(result);
      const score =
        result.snrDb + Math.min(result.riseDb, 40) + result.peakDb * 0.15;
      if (result.usable && score > best) {
        chosen = frequency;
        best = score;
      }
      this.emit({
        diagnostics: {
          ...diagnostics,
          measurements: [...diagnostics.measurements],
        },
      });
    }
    diagnostics.currentFrequency = 0;
    this.emit({
      diagnostics: {
        ...diagnostics,
        measurements: [...diagnostics.measurements],
      },
    });
    if (!chosen) {
      if (diagnostics.micLevelDb < -105)
        throw new InstrumentError('inputSilent');
      if (diagnostics.echoCancellation || diagnostics.noiseSuppression)
        throw new InstrumentError('processingEnabled');
      throw new InstrumentError(
        this.settings.compatibility ? 'probeMissing' : 'highBandMissing',
      );
    }
    this.pilot.frequency.setValueAtTime(chosen, c.currentTime);
    this.emit({ carrier: chosen, message: 'measuringBackground' });
    await this.pause(250, epoch);
    this.baseline.fill(0);
    // Store a conservative stationary envelope, suppressing baseline variations.
    for (let n = 0; n < 24; n++) {
      await this.pause(35, epoch);
      this.micAnalyser.getFloatFrequencyData(this.spectrumData);
      for (let i = 0; i < this.baseline.length; i++)
        this.baseline[i] = Math.max(
          this.baseline[i],
          dbToPower(this.spectrumData[i]),
        );
    }
    this.check(epoch);
    this.freeMidi = 60;
    this.master!.gain.setTargetAtTime(
      (this.settings.volume / 100) * 0.45,
      c.currentTime,
      0.04,
    );
    this.emit({
      running: true,
      phase: 'playing',
      midi: 60,
      message: this.settings.melody ? 'melodyCalibrated' : 'calibrated',
    });
    let previous = performance.now(),
      lastMotion = 0,
      consecutive = 0,
      heldAmplitude = 0,
      lastSignal = previous,
      lowCarrierSince = 0;
    const tick = (now: number) => {
      if (epoch !== this.epoch || !this.state.running) return;
      const dt = Math.min((now - previous) / 1000, 0.06);
      previous = now;
      this.micAnalyser!.getFloatFrequencyData(this.spectrumData);
      const center = Math.round(chosen / (c.sampleRate / 4096));
      const peak = Math.max(
        this.spectrumData[center - 1],
        this.spectrumData[center],
        this.spectrumData[center + 1],
      );
      if (peak < -88) {
        if (!lowCarrierSince) lowCarrierSince = now;
        if (now - lowCarrierSince > 1600) {
          this.stop('signalLost');
          return;
        }
      } else lowCarrierSince = 0;
      const motion = detectMotion(
        this.spectrumData,
        this.baseline,
        chosen,
        c.sampleRate,
        4096,
        this.settings.sensitivity,
      );
      consecutive = motion.strength > 0.08 ? consecutive + 1 : 0;
      if (consecutive >= 3) {
        this.freeMidi = sonarPitch(
          this.freeMidi,
          motion,
          dt,
          this.settings.melody,
        );
        this.resting = false;
        lastMotion = now;
        lastSignal = now;
        heldAmplitude = this.settings.melody
          ? 0.5 + motion.strength * 0.12
          : clamp(0.22 + motion.strength * 0.65);
      }
      const amplitude = this.resting
        ? 0
        : sonarAmplitude(heldAmplitude, now - lastMotion, this.settings.melody);
      const message =
        now - lastSignal > 10000
          ? 'noGesture'
          : this.settings.melody
            ? 'melodyPlaying'
            : 'sonarPlaying';
      this.emit({ confidence: motion.strength, message }, true);
      this.play(this.freeMidi, amplitude, true);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  play(midi: number, amplitude: number, throttle = false) {
    if (!this.ctx || !this.state.running) return;
    this.freeMidi = clamp(midi, 48, 84);
    const note = this.settings.quantize
        ? snapPitch(this.freeMidi, this.settings.scale, this.snappedMidi)
        : this.freeMidi,
      amp = clamp(amplitude);
    this.snappedMidi = this.settings.quantize ? note : undefined;
    this.oscillator?.frequency.setTargetAtTime(
      midiToHz(note),
      this.ctx.currentTime,
      0.012 + (this.settings.glide / 100) * 0.24,
    );
    this.envelope?.gain.setTargetAtTime(amp * 0.6, this.ctx.currentTime, 0.025);
    this.emit({ midi: note, amplitude: amp }, throttle);
  }
  /** End the current phrase without releasing the calibrated microphone. */
  rest() {
    this.resting = true;
    this.release();
  }
  /** Explicit user audition, using the same voice, without requesting a microphone. */
  async audition() {
    this.stop();
    const epoch = this.epoch;
    this.emit({ phase: 'requesting', demoStep: 0, message: 'startingAudio' });
    try {
      await this.ensureAudio();
      this.check(epoch);
      this.master!.gain.setTargetAtTime(
        (this.settings.volume / 100) * 0.45,
        this.ctx!.currentTime,
        0.04,
      );
      this.emit({ running: true, phase: 'playing', message: 'demoPlaying' });
      const started = performance.now();
      const tick = (now: number) => {
        if (epoch !== this.epoch || !this.state.running) return;
        const note = phraseAt(((now - started) * PHRASE_BPM) / 60000);
        if (!note) {
          this.stop('demoFinished');
          return;
        }
        this.emit({ demoStep: note.index }, true);
        this.play(note.midi, note.sounding ? 0.54 : 0, true);
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    } catch (error) {
      if (epoch !== this.epoch || this.disposed) return;
      this.stop();
      this.emit({ phase: 'error', message: errorMessageKey(error) });
    }
  }
  release() {
    if (this.ctx)
      this.envelope?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    this.emit({ amplitude: 0 });
  }
  stop(message: MessageKey = 'stopped') {
    this.epoch++;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resting = false;
    this.snappedMidi = undefined;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    try {
      this.pilot?.stop();
    } catch {}
    this.pilot?.disconnect();
    this.pilotGain?.disconnect();
    this.mic?.disconnect();
    this.micAnalyser?.disconnect();
    this.mute?.disconnect();
    this.pilot = undefined;
    this.pilotGain = undefined;
    this.mic = undefined;
    this.micAnalyser = undefined;
    this.mute = undefined;
    this.release();
    if (this.ctx) {
      this.master?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.025);
      clearTimeout(this.suspendTimer);
      const epoch = this.epoch;
      this.suspendTimer = setTimeout(() => {
        if (epoch === this.epoch && this.ctx?.state === 'running')
          void this.ctx.suspend();
      }, 140);
    }
    this.emit({
      running: false,
      phase: 'off',
      confidence: 0,
      carrier: 0,
      demoStep: null,
      message,
    });
  }
  waveform() {
    if (!this.analyser || !this.state.running) return null;
    this.analyser.getFloatTimeDomainData(this.wave);
    return this.wave;
  }
  spectrum() {
    if (!this.micAnalyser || !this.ctx || !this.state.carrier) return null;
    return {
      data: this.spectrumData,
      carrier: this.state.carrier,
      hzPerBin: this.ctx.sampleRate / 4096,
    };
  }
  dispose() {
    this.disposed = true;
    this.stop();
    clearTimeout(this.suspendTimer);
    void this.ctx?.close();
  }
}
