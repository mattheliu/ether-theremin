import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleUrl, loadTypeScript } from './load-typescript.mjs';
const signalUrl = moduleUrl(new URL('../lib/signal.ts', import.meta.url));
const {
  detectMotion,
  movePitch,
  dbToPower,
  getBandwidth,
  midiToHz,
  quantizeMidi,
  noteName,
} = await import(signalUrl);
const rate = 48000,
  size = 4096,
  carrier = 19500,
  center = Math.round(carrier / (rate / size));
function fixture() {
  const db = new Float32Array(2048).fill(-120);
  db[center] = -30;
  db[center - 1] = -39;
  db[center + 1] = -39;
  return { db, baseline: Float32Array.from(db, dbToPower) };
}
const detect = (f) => detectMotion(f.db, f.baseline, carrier, rate, size, 55);
test('stationary carrier and uniform volume changes are not gestures', () => {
  const f = fixture();
  assert.equal(detect(f).strength, 0);
  for (let i = 0; i < f.db.length; i++) f.db[i] += 6;
  assert.equal(detect(f).strength, 0);
});
test('toward and away sidebands yield mirrored motion', () => {
  const f = fixture();
  f.db[center + 12] = -55;
  const toward = detect(f);
  const g = fixture();
  g.db[center - 12] = -55;
  const away = detect(g);
  assert.ok(toward.strength > 0.1 && toward.direction > 0.5);
  assert.ok(away.strength > 0.1 && away.direction < -0.5);
  assert.ok(Math.abs(toward.shiftHz + away.shiftHz) < 1e-6);
});
test('pilot leakage and symmetric noise do not move pitch', () => {
  const f = fixture();
  f.db[center + 2] = -35;
  assert.equal(detect(f).strength, 0);
  f.db[center + 15] = -55;
  f.db[center - 15] = -55;
  assert.equal(detect(f).strength, 0);
});
test('fast motion with a detached peak is retained', () => {
  const f = fixture();
  f.db[center + 34] = -52;
  assert.ok(detect(f).shiftHz > 350);
  const p = new Float32Array(100);
  p[50] = 1;
  p[52] = 0.02;
  p[78] = 0.1;
  assert.equal(getBandwidth(p, 50, 35).right, 28);
});
test('missing carrier, invalid samples and array edges remain finite', () => {
  const f = fixture();
  f.db.fill(-Infinity);
  assert.deepEqual(detect(f), { direction: 0, strength: 0, shiftHz: 0 });
  assert.deepEqual(getBandwidth(new Float32Array(5), 0, 30), {
    left: 0,
    right: 0,
  });
});
test('pitch integration is time-based and bounded', () => {
  const motion = { direction: 1, strength: 0.6, shiftHz: 120 };
  let a = 60,
    b = 60;
  for (let i = 0; i < 60; i++) a = movePitch(a, motion, 1 / 60);
  for (let i = 0; i < 30; i++) b = movePitch(b, motion, 1 / 30);
  assert.ok(Math.abs(a - b) < 1e-8);
  assert.equal(movePitch(84, motion, 0.06), 84);
});
test('musical reference and C major snapping', () => {
  assert.equal(midiToHz(69), 440);
  assert.equal(noteName(71.8), 'C5');
  assert.equal(quantizeMidi(61.8), 62);
  assert.equal(quantizeMidi(100), 84);
});

class Param {
  value = 0;
  setTargetAtTime(v) {
    this.value = v;
  }
  setValueAtTime(v) {
    this.value = v;
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  threshold = new Param();
  ratio = new Param();
  connect() {
    return this;
  }
  disconnect() {}
  start() {}
  stop() {}
  setPeriodicWave() {}
  getFloatTimeDomainData(a) {
    a.fill(0);
  }
}
class AudioContextMock {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = {};
  createOscillator() {
    return new Node();
  }
  createGain() {
    return new Node();
  }
  createBiquadFilter() {
    return new Node();
  }
  createAnalyser() {
    return new Node();
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createConvolver() {
    return new Node();
  }
  createBuffer(ch, n) {
    return { getChannelData: () => new Float32Array(n) };
  }
  createPeriodicWave() {
    return {};
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}
globalThis.AudioContext = AudioContextMock;
globalThis.cancelAnimationFrame = () => {};
const { Instrument } = await loadTypeScript(
  new URL('../lib/instrument.ts', import.meta.url),
);
test('late microphone permission after cancel stops the tracks', async () => {
  let resolveMic,
    stopped = 0;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => new Promise((r) => (resolveMic = r)),
      },
    },
  });
  const engine = new Instrument(() => {});
  const pending = engine.start('sonar');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(typeof resolveMic, 'function');
  engine.stop();
  resolveMic({ getTracks: () => [{ stop: () => stopped++ }] });
  await pending;
  assert.equal(stopped, 1);
  assert.equal(engine.snapshot().running, false);
  engine.dispose();
});
test('permission denial reports error and can recover to playable touch mode', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
    },
  });
  const engine = new Instrument(() => {});
  await engine.start('sonar');
  assert.equal(engine.snapshot().phase, 'error');
  assert.equal(engine.snapshot().message, 'permissionDenied');
  await engine.start('touch');
  engine.play(69, 0.5);
  assert.equal(engine.snapshot().midi, 69);
  assert.equal(engine.snapshot().amplitude, 0.5);
  engine.stop();
  assert.equal(engine.snapshot().amplitude, 0);
  engine.dispose();
});

const { medianSpectrum, evaluateCarrier, carrierFrequencies } = await import(
  signalUrl
);
test('carrier calibration accepts a stable weak signal but rejects unrelated room tones', () => {
  const off = new Float32Array(2048).fill(-120);
  const on = Array.from({ length: 5 }, () => {
    const frame = off.slice();
    frame[center] = -82;
    return frame;
  });
  assert.equal(evaluateCarrier(off, on, carrier, rate, size).usable, true);
  off[center] = -83;
  assert.equal(evaluateCarrier(off, on, carrier, rate, size).usable, false);
});
test('single loud transients, silence and broadband noise cannot pass calibration', () => {
  const off = new Float32Array(2048).fill(-120);
  const frames = Array.from({ length: 5 }, () => off.slice());
  frames[2][center] = -35;
  assert.equal(evaluateCarrier(off, frames, carrier, rate, size).usable, false);
  assert.equal(medianSpectrum(frames)[center], -120);
  assert.equal(
    evaluateCarrier(
      off,
      frames.map(() => new Float32Array(2048).fill(-45)),
      carrier,
      rate,
      size,
    ).usable,
    false,
  );
  assert.equal(
    evaluateCarrier(
      off,
      frames.map(() => new Float32Array(2048).fill(-Infinity)),
      carrier,
      rate,
      size,
    ).usable,
    false,
  );
});
test('calibration requires four stable frames, and rejects invalid or incomplete windows', () => {
  const off = new Float32Array(2048).fill(-115);
  const frames = Array.from({ length: 5 }, () => {
    const f = off.slice();
    f[center] = -68;
    return f;
  });
  frames[0][center] = -115;
  assert.equal(evaluateCarrier(off, frames, carrier, rate, size).usable, true);
  frames[1][center] = -115;
  assert.equal(evaluateCarrier(off, frames, carrier, rate, size).usable, false);
  assert.equal(
    evaluateCarrier(off, frames.slice(0, 2), carrier, rate, size).usable,
    false,
  );
  assert.equal(evaluateCarrier(off, frames, 0, rate, size).usable, false);
});
test('frequency selection respects the physical input sample rate and audible-band opt-in', () => {
  assert.equal(carrierFrequencies(48000, 32000, false).length, 0);
  assert.equal(carrierFrequencies(48000, 32000, true).length, 0);
  assert.ok(
    carrierFrequencies(48000, 44100, false).every((f) => f + 600 < 22050),
  );
  assert.ok(carrierFrequencies(48000, 48000, false).every((f) => f >= 18500));
  assert.ok(carrierFrequencies(48000, 48000, true).includes(16000));
});
function setupCalibration({
  signal = true,
  inputRate = 48000,
  muted = false,
  processing = false,
} = {}) {
  let stopped = 0;
  const track = {
    label: 'Built-in microphone',
    muted,
    enabled: true,
    getSettings: () => ({
      sampleRate: inputRate,
      echoCancellation: processing,
      noiseSuppression: processing,
      autoGainControl: false,
    }),
    addEventListener() {},
    stop() {
      stopped++;
    },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => ({
          getAudioTracks: () => [track],
          getTracks: () => [track],
        }),
      },
    },
  });
  globalThis.requestAnimationFrame = () => 1;
  const engine = new Instrument(() => {});
  engine.pause = async function (_ms, epoch) {
    this.check(epoch);
  };
  // Model the real graph's microphone branch, including probe-off and probe-on windows.
  const oldEnsure = engine.ensureAudio.bind(engine);
  engine.ensureAudio = async () => {
    await oldEnsure();
    const ctx = engine.ctx;
    ctx.createMediaStreamSource = () => new Node();
    ctx.createAnalyser = () => {
      const analyser = new Node();
      analyser.getFloatFrequencyData = (array) => {
        array.fill(-120);
        if (signal && engine.pilotGain?.gain.value > 0) {
          const bin = Math.round(engine.pilot.frequency.value / (48000 / 4096));
          array[bin] = -82;
        }
      };
      analyser.getFloatTimeDomainData = (array) =>
        array.fill(signal ? 0.005 : 0);
      return analyser;
    };
  };
  return { engine, stopped: () => stopped };
}
test('full calibration selects a weak stable carrier and retains diagnostics after stop', async () => {
  const { engine, stopped } = setupCalibration();
  await engine.start('sonar');
  assert.equal(engine.snapshot().phase, 'playing');
  assert.ok(engine.snapshot().carrier >= 18500);
  assert.equal(engine.snapshot().diagnostics.measurements.length, 6);
  engine.stop();
  assert.equal(stopped(), 1);
  assert.equal(engine.snapshot().diagnostics.input, 'Built-in microphone');
  engine.dispose();
});
test('silent microphone failure retains measured silence and releases capture', async () => {
  const { engine, stopped } = setupCalibration({ signal: false, muted: true });
  await engine.start('sonar');
  const state = engine.snapshot();
  assert.equal(state.phase, 'error');
  assert.equal(state.message, 'inputSilent');
  assert.equal(state.diagnostics.micLevelDb, -140);
  assert.equal(state.diagnostics.trackMuted, true);
  assert.equal(stopped(), 1);
  engine.dispose();
});
test('low physical input sample rate is diagnosed before sending high-frequency probes', async () => {
  const { engine, stopped } = setupCalibration({ inputRate: 16000 });
  await engine.start('sonar');
  assert.equal(engine.snapshot().message, 'sampleRateTooLow');
  assert.equal(engine.snapshot().diagnostics.measurements.length, 0);
  assert.equal(stopped(), 1);
  engine.dispose();
});

function virtualInput() {
  let stopped = 0;
  const track = {
    label: 'Cast Audio (Virtual)',
    muted: false,
    enabled: true,
    getSettings: () => ({
      sampleRate: 44100,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    }),
    addEventListener() {},
    stop() {
      stopped++;
    },
  };
  return {
    stream: { getAudioTracks: () => [track], getTracks: () => [track] },
    stopped: () => stopped,
  };
}
test('automatic input selection replaces a virtual default with the built-in microphone', async () => {
  const { engine } = setupCalibration();
  const realInput = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices,
  );
  const virtual = virtualInput();
  const requests = [];
  navigator.mediaDevices.enumerateDevices = async () => [
    {
      kind: 'audioinput',
      deviceId: 'builtin-1',
      label: 'MacBook Pro麦克风 (Built-in)',
    },
  ];
  navigator.mediaDevices.getUserMedia = async (request) => {
    requests.push(request);
    return requests.length === 1 ? virtual.stream : realInput();
  };
  await engine.start('sonar');
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].audio.deviceId, { exact: 'builtin-1' });
  assert.equal(virtual.stopped(), 1);
  assert.equal(engine.snapshot().phase, 'playing');
  assert.equal(engine.snapshot().diagnostics.input, 'Built-in microphone');
  engine.dispose();
});
test('an explicitly selected microphone is requested exactly, without a virtual default capture', async () => {
  const { engine } = setupCalibration();
  const realInput = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices,
  );
  const requests = [];
  navigator.mediaDevices.getUserMedia = async (request) => {
    requests.push(request);
    return realInput();
  };
  engine.configure({ ...engine.settings, inputDeviceId: 'builtin-1' });
  await engine.start('sonar');
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].audio.deviceId, { exact: 'builtin-1' });
  engine.dispose();
});
test('a virtual-only browser reports its device problem before playing probe tones', async () => {
  const { engine } = setupCalibration();
  const virtual = virtualInput();
  navigator.mediaDevices.getUserMedia = async () => virtual.stream;
  navigator.mediaDevices.enumerateDevices = async () => [
    {
      kind: 'audioinput',
      deviceId: 'virtual-1',
      label: 'Cast Audio (Virtual)',
    },
  ];
  await engine.start('sonar');
  assert.equal(engine.snapshot().phase, 'error');
  assert.equal(engine.snapshot().message, 'virtualInput');
  assert.equal(engine.snapshot().diagnostics.measurements.length, 0);
  assert.equal(virtual.stopped(), 1);
  engine.dispose();
});
test('cancelling automatic device switching releases the late physical microphone stream', async () => {
  const { engine, stopped } = setupCalibration();
  const realInput = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices,
  );
  const virtual = virtualInput();
  let resolvePhysical,
    calls = 0;
  navigator.mediaDevices.enumerateDevices = async () => [
    { kind: 'audioinput', deviceId: 'builtin-1', label: 'Built-in microphone' },
  ];
  navigator.mediaDevices.getUserMedia = async () =>
    ++calls === 1
      ? virtual.stream
      : new Promise((resolve) => {
          resolvePhysical = resolve;
        });
  const pending = engine.start('sonar');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(typeof resolvePhysical, 'function');
  engine.stop();
  resolvePhysical(await realInput());
  await pending;
  assert.equal(virtual.stopped(), 1);
  assert.equal(stopped(), 1);
  assert.equal(engine.snapshot().running, false);
  engine.dispose();
});
