export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function noteName(midi: number) {
  const n = Math.round(midi);
  return (
    ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][
      ((n % 12) + 12) % 12
    ] +
    (Math.floor(n / 12) - 1)
  );
}
export function quantizeMidi(midi: number) {
  let best = 60,
    distance = Infinity;
  for (let n = 48; n <= 84; n++) {
    if (![0, 2, 4, 5, 7, 9, 11].includes(n % 12)) continue;
    if (Math.abs(n - midi) < distance) {
      best = n;
      distance = Math.abs(n - midi);
    }
  }
  return best;
}

export const dbToPower = (db: number) =>
  Number.isFinite(db) ? 10 ** (db / 10) : 0;
export type Motion = { direction: number; strength: number; shiftHz: number };
/** Compare Doppler sidebands to the stationary pilot. Common gain changes and
 * the central pilot/leakage bins are excluded from gesture evidence. */
export function detectMotion(
  db: Float32Array,
  baseline: Float32Array,
  carrier: number,
  sampleRate: number,
  fftSize: number,
  sensitivity: number,
): Motion {
  const hzPerBin = sampleRate / fftSize,
    center = Math.round(carrier / hzPerBin);
  const inner = Math.max(5, Math.ceil(65 / hzPerBin)),
    outer = Math.floor(500 / hzPerBin);
  let carrierNow = 0,
    carrierBase = 0;
  for (let j = -2; j <= 2; j++) {
    carrierNow += dbToPower(db[center + j]);
    carrierBase += baseline[center + j] || 0;
  }
  if (carrierNow < 1e-9 || carrierBase < 1e-12)
    return { direction: 0, strength: 0, shiftHz: 0 };
  const ratio = clamp(carrierNow / carrierBase, 0.15, 6);
  let low = 0,
    high = 0,
    moment = 0;
  const residual = new Float32Array(db.length);
  residual[center] = carrierNow;
  for (let k = inner; k <= outer; k++)
    for (const sign of [-1, 1]) {
      const i = center + sign * k;
      if (i < 0 || i >= db.length) continue;
      const excess = Math.max(
        0,
        dbToPower(db[i]) - (baseline[i] || 0) * ratio * 2.8 - 2e-12,
      );
      residual[i] = excess;
      if (sign < 0) low += excess;
      else high += excess;
      moment += excess * sign * k * hzPerBin;
    }
  const total = low + high,
    threshold = 0.00016 * 10 ** ((50 - clamp(sensitivity, 0, 100)) / 55);
  const relative = total / carrierNow;
  if (relative < threshold || total < 1e-11)
    return { direction: 0, strength: 0, shiftHz: 0 };
  const balance = (high - low) / Math.max(total, 1e-20);
  if (Math.abs(balance) < 0.22)
    return { direction: 0, strength: 0, shiftHz: 0 };
  const band = getBandwidth(residual, center, outer, threshold / 4);
  const widthBalance =
    (band.right - band.left) / Math.max(1, band.right + band.left);
  return {
    direction: 0.8 * balance + 0.2 * widthBalance,
    strength: clamp(Math.log10(1 + relative / threshold) / 1.4),
    shiftHz: moment / total,
  };
}
export function movePitch(midi: number, motion: Motion, seconds: number) {
  return clamp(
    midi +
      motion.direction *
        clamp(Math.abs(motion.shiftHz) / 180, 0.3, 2.4) *
        12 *
        clamp(seconds, 0, 0.08),
    48,
    84,
  );
}

/** Adapted from DanielRapp/doppler (MIT, Copyright 2015 Daniel Rapp).
 * Uses linear power instead of byte-scaled decibels, and rescans beyond gaps
 * to capture the detached Doppler peaks described in SoundWave Figure 2d.
 */
export function getBandwidth(
  power: Float32Array,
  center: number,
  window: number,
  ratio = 0.001,
) {
  const primary = power[center];
  if (!(primary > 0)) return { left: 0, right: 0 };
  const scan = (sign: number) => {
    let width = 0;
    for (let k = 1; k <= window; k++) {
      const value = power[center + sign * k];
      if (Number.isFinite(value) && value / primary > ratio) width = k;
    }
    return width;
  };
  return { left: scan(-1), right: scan(1) };
}

export type CarrierMeasurement = {
  frequency: number;
  peakDb: number;
  riseDb: number;
  snrDb: number;
  stableFrames: number;
  totalFrames: number;
  usable: boolean;
};
const median = (values: number[]) => {
  const sorted = values
    .map((v) => (Number.isFinite(v) ? Math.max(-140, v) : -140))
    .sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? -140;
};
export function medianSpectrum(frames: Float32Array[]): Float32Array {
  return Float32Array.from(frames[0] ?? [], (_, i) =>
    median(frames.map((frame) => frame[i])),
  );
}
export function carrierFrequencies(
  contextRate: number,
  inputRate: number | undefined,
  compatibility: boolean,
) {
  const rate =
    inputRate && inputRate > 0 ? Math.min(contextRate, inputRate) : contextRate;
  const frequencies = [18500, 19000, 19500, 20000, 20500, 21000];
  if (compatibility) frequencies.push(18000, 17500, 17000, 16500, 16000);
  return frequencies.filter((f) => f + 600 < rate / 2);
}
/** A carrier must rise above the probe-off background in most frames. A single
 * transient or a pre-existing room tone cannot establish an acoustic path. */
export function evaluateCarrier(
  off: Float32Array,
  frames: Float32Array[],
  frequency: number,
  sampleRate: number,
  fftSize: number,
): CarrierMeasurement {
  const center = Math.round(frequency / (sampleRate / fftSize));
  const peaks: number[] = [],
    rises: number[] = [],
    snrs: number[] = [];
  let stableFrames = 0;
  if (center - 35 >= 0 && center + 35 < off.length) {
    const background = Math.max(
      ...Array.from(off.slice(center - 2, center + 3), (v) =>
        Number.isFinite(v) ? Math.max(-140, v) : -140,
      ),
    );
    for (const frame of frames) {
      if (center + 35 >= frame.length) continue;
      const peak = Math.max(
        ...Array.from(frame.slice(center - 2, center + 3), (v) =>
          Number.isFinite(v) ? Math.max(-140, v) : -140,
        ),
      );
      let noisePower = 0;
      for (let k = 10; k <= 35; k++)
        noisePower +=
          dbToPower(frame[center - k]) + dbToPower(frame[center + k]);
      const noise = 10 * Math.log10(Math.max(noisePower / 52, 1e-14));
      const rise = peak - background,
        snr = peak - noise;
      peaks.push(peak);
      rises.push(rise);
      snrs.push(snr);
      if (peak >= -84 && rise >= 8 && snr >= 14) stableFrames++;
    }
  }
  return {
    frequency,
    peakDb: median(peaks),
    riseDb: median(rises),
    snrDb: median(snrs),
    stableFrames,
    totalFrames: frames.length,
    usable: frames.length >= 5 && stableFrames / frames.length >= 0.8,
  };
}
