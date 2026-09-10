import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';
const {
  snapPitch,
  sonarPitch,
  sonarAmplitude,
  MELODY_PHRASE,
  phraseAt,
  followPhrase,
} = await loadTypeScript(new URL('../lib/melody.ts', import.meta.url));

test('pentatonic snapping excludes semitone clashes and stays within the playable range', () => {
  for (let pitch = -10; pitch < 100; pitch += 0.13) {
    const note = snapPitch(pitch, 'pentatonic');
    assert.ok(note >= 48 && note <= 84);
    assert.ok([0, 2, 4, 7, 9].includes(note % 12));
  }
  assert.equal(snapPitch(65, 'major'), 65);
  assert.equal(snapPitch(65, 'pentatonic', 65), 64);
});
test('small midpoint jitter holds a note; deliberate movement crosses in either direction', () => {
  let note = 60;
  for (const pitch of [60.9, 61.1, 60.95, 61.2]) {
    note = snapPitch(pitch, 'pentatonic', note);
    assert.equal(note, 60);
  }
  note = snapPitch(61.3, 'pentatonic', note);
  assert.equal(note, 62);
  for (const pitch of [61.15, 60.95, 61.05]) {
    note = snapPitch(pitch, 'pentatonic', note);
    assert.equal(note, 62);
  }
  assert.equal(snapPitch(60.7, 'pentatonic', note), 60);
  assert.equal(snapPitch(71, 'pentatonic', note), 72);
});
test('melody response is slower, time-based and limited to one octave', () => {
  const motion = { direction: 1, strength: 0.7, shiftHz: 160 };
  const run = (fps) => {
    let pitch = 60;
    for (let i = 0; i < fps; i++)
      pitch = sonarPitch(pitch, motion, 1 / fps, true);
    return pitch;
  };
  assert.ok(Math.abs(run(30) - run(120)) < 1e-8);
  assert.ok(
    sonarPitch(60, motion, 0.05, true) < sonarPitch(60, motion, 0.05, false),
  );
  assert.equal(sonarPitch(80, motion, 0.05, true), 72);
  assert.equal(sonarPitch(60, { ...motion, direction: -1 }, 0.05, true), 60);
});
test('melody holds a stable long note then releases; gesture mode retains its quick fade', () => {
  assert.equal(sonarAmplitude(0.55, 2000, true), 0.55);
  assert.ok(sonarAmplitude(0.55, 2850, true) < 0.3);
  assert.equal(sonarAmplitude(0.55, 6000, true), 0);
  assert.equal(sonarAmplitude(0, 0, true), 0);
  assert.equal(sonarAmplitude(0.55, 100, false), 0.55);
  assert.ok(sonarAmplitude(0.55, 500, false) < 0.1);
});
test('audition follows all eight notes, includes breathing gaps and ends', () => {
  let beat = 0;
  MELODY_PHRASE.forEach((note, index) => {
    assert.deepEqual(phraseAt(beat), {
      index,
      midi: note.midi,
      sounding: true,
    });
    assert.equal(phraseAt(beat + note.beats * 0.95).sounding, false);
    beat += note.beats;
  });
  assert.equal(phraseAt(beat), null);
});
test('practice requires a sustained audible target; wrong notes, silence and stale frames do not count', () => {
  let p = { step: 0, heldMs: 0 };
  for (let i = 0; i < 3; i++) p = followPhrase(p, 60, 0.5, 100);
  assert.equal(p.step, 0);
  assert.equal(followPhrase(p, 62, 0.5, 50).heldMs, 0);
  assert.equal(followPhrase(p, 60, 0, 50).heldMs, 0);
  assert.equal(followPhrase({ step: 0, heldMs: 0 }, 60, 0.5, 5000).step, 0);
  p = followPhrase(p, 60, 0.5, 50);
  assert.equal(p.step, 1);
  for (let i = 1; i < MELODY_PHRASE.length; i++) {
    for (let j = 0; j < 7; j++)
      p = followPhrase(p, MELODY_PHRASE[i].midi, 0.5, 50);
    assert.equal(p.step, i + 1);
  }
  assert.equal(followPhrase(p, 60, 0.5, 100), p);
});
