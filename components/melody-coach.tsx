'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { copy, type Language } from '@/lib/i18n';
import type { InstrumentState } from '@/lib/instrument';
import { MELODY_PHRASE, followPhrase } from '@/lib/melody';
import { noteName } from '@/lib/signal';

export function MelodyCoach({
  state,
  language,
  onAudition,
  onStop,
  onPreset,
}: {
  state: InstrumentState;
  language: Language;
  onAudition: () => void;
  onStop: () => void;
  onPreset: () => void;
}) {
  const t = copy[language];
  const [practicing, setPracticing] = useState(false);
  const [step, setStep] = useState(0);
  const progress = useRef({ step: 0, heldMs: 0 });
  const previous = useRef(0);
  const demo = state.demoStep !== null;
  const busy = state.phase === 'requesting' || state.phase === 'calibrating';
  useEffect(() => {
    const now = performance.now(),
      dt = now - previous.current;
    previous.current = now;
    if (!practicing || !state.running || demo) {
      progress.current.heldMs = 0;
      return;
    }
    const next = followPhrase(
      progress.current,
      state.midi,
      state.amplitude,
      dt,
    );
    if (next.step !== progress.current.step) setStep(next.step);
    progress.current = next;
  }, [state, practicing, demo]);
  const target = MELODY_PHRASE[step];
  const active = demo ? state.demoStep : practicing ? step : null;
  const hint = !practicing
    ? t.coachReady
    : !target
      ? t.practiceDone
      : !state.running
        ? t.practiceStart
        : state.midi < target.midi - 0.25
          ? t.practiceHigher
          : state.midi > target.midi + 0.25
            ? t.practiceLower
            : state.amplitude > 0.08
              ? t.practiceHold
              : t.practiceSound;
  return (
    <section className="melody-coach" aria-labelledby="coach-title">
      <div className="coach-heading">
        <h2 id="coach-title">{t.coachTitle}</h2>
        <button
          type="button"
          className="coach-button"
          disabled={busy || (state.running && !demo)}
          onClick={() => {
            setPracticing(false);
            if (demo) onStop();
            else onAudition();
          }}
          aria-describedby="demo-help"
        >
          {demo ? <Square size={14} /> : <Play size={14} />}{' '}
          {demo ? t.stopDemo : t.listenPhrase}
        </button>
      </div>
      <p>{t.coachIntro}</p>
      <ol className="phrase-notes" aria-label={t.coachTitle}>
        {MELODY_PHRASE.map((note, i) => (
          <li
            key={i}
            aria-current={active === i ? 'step' : undefined}
            className={`${active === i ? 'current' : ''} ${practicing && i < step ? 'complete' : ''}`}
          >
            <span>{noteName(note.midi)}</span>
            <small>{note.beats === 2 ? '—' : '·'}</small>
          </li>
        ))}
      </ol>
      <div className="coach-actions">
        <button
          type="button"
          className="coach-button"
          disabled={busy || demo}
          onClick={() => {
            progress.current = { step: 0, heldMs: 0 };
            previous.current = performance.now();
            setStep(0);
            setPracticing(true);
            onPreset();
          }}
        >
          <RotateCcw size={14} /> {practicing ? t.practiceAgain : t.practice}
        </button>
        {practicing && (
          <button
            type="button"
            className="coach-button"
            onClick={() => setPracticing(false)}
          >
            {t.finishPractice}
          </button>
        )}
      </div>
      <p className="coach-hint" aria-live="polite">
        {demo ? '' : hint}
      </p>
      <small id="demo-help">{t.demoHelp}</small>
    </section>
  );
}
