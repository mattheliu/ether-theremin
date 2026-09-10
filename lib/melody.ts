import { clamp, movePitch, type Motion } from './signal';

export type Scale = 'pentatonic' | 'major';
const intervals: Record<Scale, readonly number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
};

/** Keep the previous note until the gesture clearly crosses the midpoint.
 * A 0.45-semitone distance advantage gives 0.225 semitones of hysteresis. */
export function snapPitch(midi: number, scale: Scale, previous?: number) {
  const pitch = clamp(midi, 48, 84);
  let nearest = 60,
    distance = Infinity;
  for (let note = 48; note <= 84; note++) {
    if (!intervals[scale].includes(note % 12)) continue;
    const d = Math.abs(note - pitch);
    if (d < distance) {
      nearest = note;
      distance = d;
    }
  }
  if (
    previous !== undefined &&
    previous >= 48 &&
    previous <= 84 &&
    intervals[scale].includes(previous % 12) &&
    Math.abs(pitch - previous) <= distance + 0.45
  )
    return previous;
  return nearest;
}

export function sonarPitch(
  midi: number,
  motion: Motion,
  dt: number,
  melody: boolean,
) {
  return melody
    ? clamp(movePitch(clamp(midi, 60, 72), motion, dt * 0.42), 60, 72)
    : movePitch(midi, motion, dt);
}

export function sonarAmplitude(
  amplitude: number,
  idleMs: number,
  melody: boolean,
) {
  const hold = melody ? 2200 : 140,
    decay = melody ? 650 : 190;
  const value =
    clamp(amplitude) * Math.exp(-Math.max(0, idleMs - hold) / decay);
  return value < 0.01 ? 0 : value;
}

// Original eight-note phrase, shared by the audition and visual practice guide.
export const MELODY_PHRASE = [
  { midi: 60, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 67, beats: 1 },
  { midi: 69, beats: 2 },
  { midi: 67, beats: 1 },
  { midi: 64, beats: 1 },
  { midi: 62, beats: 1 },
  { midi: 60, beats: 2 },
] as const;
export const PHRASE_BPM = 80;

export function phraseAt(beat: number) {
  let start = 0;
  for (let i = 0; i < MELODY_PHRASE.length; i++) {
    const note = MELODY_PHRASE[i];
    if (beat < start + note.beats)
      return {
        index: i,
        midi: note.midi,
        sounding: beat - start < note.beats * 0.86,
      };
    start += note.beats;
  }
  return null;
}

export type PracticeProgress = { step: number; heldMs: number };
export function followPhrase(
  progress: PracticeProgress,
  midi: number,
  amplitude: number,
  dtMs: number,
): PracticeProgress {
  const target = MELODY_PHRASE[progress.step];
  if (!target) return progress;
  const matches = Math.abs(midi - target.midi) < 0.25 && amplitude > 0.08;
  const heldMs = matches ? progress.heldMs + clamp(dtMs, 0, 100) : 0;
  return heldMs >= 350
    ? { step: progress.step + 1, heldMs: 0 }
    : { step: progress.step, heldMs };
}
