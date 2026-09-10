/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The two-axis instrument surface requires pointer capture and pitch slider semantics; a native range cannot represent it. */
'use client';
import Image from 'next/image';
import { ThereminOrigins } from '@/components/theremin-origins';
import { SonarDiagnosticsPanel } from '@/components/sonar-diagnostics';
import { MelodyCoach } from '@/components/melody-coach';
import { useEffect, useRef, useState } from 'react';
import {
  Hand,
  MousePointer2,
  Power,
  Radio,
  Volume2,
  Waves,
  RotateCcw,
  ArrowUpRight,
  Sun,
  Moon,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Instrument,
  DEFAULT_SETTINGS,
  INITIAL_STATE,
  type Settings,
} from '@/lib/instrument';
import { clamp, midiToHz, noteName } from '@/lib/signal';
import {
  copy,
  DEFAULT_LANGUAGE,
  LANGUAGE_TAGS,
  LANGUAGE_LABELS,
  localizeMessage,
  type Language,
} from '@/lib/i18n';
import { registerInstrumentTools } from '@/lib/webmcp';
function Parameter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="parameter">
      <div className="parameter-label">
        <span>{label}</span>
        <output>{value}%</output>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        min={0}
        max={100}
        step={1}
      />
    </div>
  );
}
export default function Home() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [dark, setDark] = useState(true);
  const t = copy[language];
  const tones = [
    { value: 'classic', label: t.classic },
    { value: 'pure', label: t.pure },
    { value: 'hollow', label: t.hollow },
  ];
  const [mode, setMode] = useState<'touch' | 'sonar'>('sonar'),
    [state, setState] = useState(INITIAL_STATE),
    [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const instrument = useRef<Instrument | null>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    cursor = useRef<HTMLDivElement>(null),
    down = useRef(false),
    position = useRef({ x: 1 / 3, y: 0.5 }),
    live = useRef(INITIAL_STATE),
    liveMode = useRef(mode),
    settingsRef = useRef(DEFAULT_SETTINGS);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('ether-theme');
      } catch {}
      setDark(saved === 'dark' || (saved !== 'light' && preference.matches));
    };
    apply();
    preference.addEventListener('change', apply);
    return () => preference.removeEventListener('change', apply);
  }, []);
  useEffect(() => {
    document.documentElement.lang = LANGUAGE_TAGS[language];
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', copy[language].description);
    document.title = copy[language].title;
  }, [language]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const toggleTheme = () => {
    setDark(!dark);
    try {
      localStorage.setItem('ether-theme', dark ? 'light' : 'dark');
    } catch {}
  };
  useEffect(() => {
    live.current = state;
    liveMode.current = mode;
    settingsRef.current = settings;
  }, [state, mode, settings]);
  useEffect(() => {
    const engine = new Instrument(setState);
    instrument.current = engine;
    void engine.refreshInputs();
    const devicesChanged = () => {
      void engine.refreshInputs();
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', devicesChanged);
    const unregister = registerInstrumentTools(
      engine,
      () => settingsRef.current,
      (s) => {
        settingsRef.current = s;
        engine.configure(s);
        setSettings(s);
      },
    );
    const hidden = () => {
      if (document.hidden) {
        down.current = false;
        engine.stop('paused');
      }
    };
    const release = () => {
      down.current = false;
      if (engine.mode === 'touch') engine.release();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        down.current = false;
        engine.stop();
      }
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', release);
    window.addEventListener('keydown', escape);
    return () => {
      unregister();
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        devicesChanged,
      );
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', release);
      window.removeEventListener('keydown', escape);
      engine.dispose();
      instrument.current = null;
    };
  }, []);
  useEffect(() => {
    instrument.current?.configure(settings);
  }, [settings]);
  useEffect(() => {
    const el = canvas.current,
      ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const style = getComputedStyle(document.documentElement);
    const signalColor = style.getPropertyValue('--primary').trim();
    const idleColor = style.getPropertyValue('--signal-idle').trim();
    let frame = 0;
    const draw = () => {
      const w = el.clientWidth,
        h = el.clientHeight,
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        el.width !== Math.round(w * dpr) ||
        el.height !== Math.round(h * dpr)
      ) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const samples = instrument.current?.waveform();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = live.current.amplitude > 0.02 ? signalColor : idleColor;
      ctx.shadowColor = '#a4eccb';
      ctx.shadowBlur = live.current.amplitude > 0.02 ? 12 : 0;
      ctx.beginPath();
      const spectrum =
        liveMode.current === 'sonar' ? instrument.current?.spectrum() : null;
      if (spectrum) {
        ctx.strokeStyle = signalColor;
        ctx.shadowBlur = 5;
        for (let x = 0; x <= w; x += 2) {
          const frequency = spectrum.carrier - 500 + (x / w) * 1000;
          const index = Math.round(frequency / spectrum.hzPerBin);
          const level = clamp((spectrum.data[index] + 115) / 90);
          const y = h - 12 - level * (h - 30);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = '#738f7866';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        for (let x = 0; x <= w; x += 2) {
          const sample = samples
              ? samples[
                  Math.min(
                    samples.length - 1,
                    Math.floor((x / w) * samples.length),
                  )
                ]
              : 0,
            y = h * 0.5 + sample * h * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      const s = live.current;
      if (cursor.current) {
        cursor.current.style.left = `${clamp((s.midi - 48) / 36) * 100}%`;
        cursor.current.style.top = `${(1 - (s.running ? s.amplitude : 0.5)) * 100}%`;
        cursor.current.style.opacity =
          s.amplitude > 0.02 && liveMode.current === 'touch' ? '1' : '0';
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [dark]);
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const switchMode = (value: unknown) => {
    instrument.current?.stop(value === 'sonar' ? 'sonarReady' : 'touchReady');
    down.current = false;
    setMode(value === 'sonar' ? 'sonar' : 'touch');
  };
  const busy = state.phase === 'calibrating' || state.phase === 'requesting';
  const start = () => {
    if (state.running || busy) instrument.current?.stop();
    else void instrument.current?.start(mode);
  };
  const playPosition = () =>
    instrument.current?.play(
      48 + position.current.x * 36,
      1 - position.current.y,
    );
  const updatePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    position.current = {
      x: clamp((e.clientX - r.left) / r.width),
      y: clamp((e.clientY - r.top) / r.height),
    };
    if (down.current) playPosition();
  };
  const release = () => {
    down.current = false;
    if (mode === 'touch') instrument.current?.release();
  };
  return (
    <main className="instrument-shell" id="top">
      <a className="skip-link" href="#instrument">
        {t.play}
      </a>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="ETHER 以太">
          <Waves size={27} strokeWidth={1.3} />
          <span>
            ETHER<span className="wordmark-cn">以太</span>
          </span>
        </a>
        <nav aria-label={t.navigation}>
          <a href="#instrument">{t.play}</a>
          <a href="#origins">{t.history}</a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={t.language}>
            <button
              type="button"
              lang="zh-CN"
              aria-pressed={language === 'zh'}
              onClick={() => setLanguage('zh')}
            >
              {LANGUAGE_LABELS.zh}
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              lang="en"
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
            >
              {LANGUAGE_LABELS.en}
            </button>
          </div>
          <button
            className="theme-switch"
            onClick={toggleTheme}
            aria-label={t.theme}
            title={t.theme}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <section className="stage" aria-label={t.console}>
        <div className="art-panel">
          <Image
            unoptimized
            className="hero-art"
            src="/images/ether-art.jpg"
            alt={t.artAlt}
            width="1122"
            height="1402"
            fetchPriority="high"
          />
          <div className="art-copy">
            <p className="eyebrow">{t.subtitle}</p>
            <h1>{t.heading}</h1>
            <p className="intro">{t.intro}</p>
          </div>
          <span className="art-credit">{t.artCredit}</span>
        </div>
        <section
          className="console"
          id="instrument"
          aria-label={t.console}
          tabIndex={-1}
        >
          <div className="console-toolbar">
            <Tabs value={mode} onValueChange={switchMode}>
              <TabsList className="mode-tabs" aria-label={t.modes}>
                <TabsTrigger value="sonar">
                  <Radio />
                  {t.sonar}
                </TabsTrigger>
                <TabsTrigger value="touch">
                  <MousePointer2 />
                  {t.touch}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="engine-status">
              <i className={state.running ? 'on' : busy ? 'busy' : ''} />
              {state.running ? t.playing : busy ? t.calibrating : t.standby}
            </span>
          </div>
          <div className="play-area-wrap">
            <div className="field-head">
              <span>{mode === 'sonar' ? t.spectrum : t.touchField}</span>
              <div className="pitch-readout" aria-label={t.pitch}>
                <strong>{noteName(state.midi)}</strong>
                <span>
                  {midiToHz(state.midi).toFixed(1)} <small>Hz</small>
                </span>
              </div>
            </div>
            <div
              className={`play-area ${state.running ? 'is-ready' : ''} ${mode === 'sonar' ? 'is-sonar' : ''}`}
              role="slider"
              aria-valuemin={48}
              aria-valuemax={84}
              aria-valuenow={state.midi}
              aria-valuetext={noteName(state.midi)}
              aria-disabled={mode === 'sonar'}
              aria-label={mode === 'sonar' ? t.sonarAria : t.touchAria}
              tabIndex={mode === 'touch' ? 0 : undefined}
              onPointerDown={(e) => {
                if (mode !== 'touch' || !state.running) return;
                down.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                e.currentTarget.focus();
                updatePointer(e);
              }}
              onPointerMove={updatePointer}
              onPointerUp={release}
              onPointerCancel={release}
              onLostPointerCapture={release}
              onBlur={release}
              onKeyDown={(e) => {
                if (
                  mode !== 'touch' ||
                  !state.running ||
                  ![
                    ' ',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                  ].includes(e.key)
                )
                  return;
                e.preventDefault();
                if (e.key === ' ') down.current = true;
                else {
                  const step = e.shiftKey ? 1 / 36 : 1 / 72;
                  if (e.key === 'ArrowRight')
                    position.current.x = clamp(position.current.x + step);
                  if (e.key === 'ArrowLeft')
                    position.current.x = clamp(position.current.x - step);
                  if (e.key === 'ArrowUp')
                    position.current.y = clamp(position.current.y - 0.05);
                  if (e.key === 'ArrowDown')
                    position.current.y = clamp(position.current.y + 0.05);
                }
                if (down.current) playPosition();
              }}
              onKeyUp={(e) => {
                if (e.key === ' ') {
                  e.preventDefault();
                  release();
                }
              }}
            >
              <div className="pitch-grid" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <canvas ref={canvas} className="wave-canvas" aria-hidden="true" />
              <div ref={cursor} className="field-cursor" aria-hidden="true">
                <span />
                <i />
              </div>
              {!state.running && (
                <div className="field-invitation">
                  {mode === 'sonar' ? (
                    <Radio size={27} strokeWidth={1.1} />
                  ) : (
                    <Hand size={27} strokeWidth={1.1} />
                  )}
                  <p>
                    {busy
                      ? localizeMessage(state.message, language)
                      : mode === 'sonar'
                        ? t.invitation
                        : t.touchInvitation}
                  </p>
                  <span>
                    {busy
                      ? t.wait
                      : mode === 'sonar'
                        ? t.hardware
                        : t.touchHint}
                  </span>
                </div>
              )}
              <span className="axis-volume" aria-hidden="true">
                {mode === 'sonar' ? t.echo : t.volumeAxis} ↑
              </span>
            </div>
            <div className="note-labels" aria-hidden="true">
              {(mode === 'sonar'
                ? [t.away, t.carrier, t.toward]
                : ['C3', 'C4', 'C5', 'C6']
              ).map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>
          <div className="transport">
            <div className="transport-actions">
              <button
                className={`start-button ${state.running || busy ? 'active' : ''}`}
                onClick={start}
              >
                <Power size={17} />
                {state.running
                  ? t.stop
                  : busy
                    ? t.cancel
                    : mode === 'sonar'
                      ? t.startSonar
                      : t.start}
              </button>
              <span className="escape-hint">
                <kbd>esc</kbd> {t.escape}
              </span>
            </div>
            <output
              aria-live="polite"
              className={`status-message ${state.phase === 'error' ? 'error' : ''}`}
            >
              {localizeMessage(state.message, language)}
            </output>
          </div>
          {mode === 'sonar' && (
            <div className="melody-response">
              <div
                className="response-choices"
                role="group"
                aria-label={t.response}
              >
                <button
                  type="button"
                  aria-pressed={settings.melody}
                  onClick={() => change('melody', true)}
                >
                  {t.melodyMode}
                </button>
                <button
                  type="button"
                  aria-pressed={!settings.melody}
                  onClick={() => change('melody', false)}
                >
                  {t.gestureMode}
                </button>
                <button
                  type="button"
                  className="rest-button"
                  title={t.restHelp}
                  disabled={!state.running || state.demoStep !== null}
                  onClick={() => instrument.current?.rest()}
                >
                  {t.rest}
                </button>
              </div>
              <p>{settings.melody ? t.melodyHelp : t.gestureHelp}</p>
            </div>
          )}
          <div className="parameters">
            <div className="tone-select">
              <label id="tone-label" htmlFor="tone">
                {t.tone}
              </label>
              <Select
                items={tones}
                value={settings.tone}
                onValueChange={(v) => {
                  if (v) change('tone', v);
                }}
              >
                <SelectTrigger id="tone" aria-labelledby="tone-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Parameter
              label={t.volume}
              value={settings.volume}
              onChange={(v) => change('volume', v)}
            />
            <Parameter
              label={t.glide}
              value={settings.glide}
              onChange={(v) => change('glide', v)}
            />
            <Parameter
              label={t.reverb}
              value={settings.reverb}
              onChange={(v) => change('reverb', v)}
            />
            <div className="tone-select scale-select">
              <label htmlFor="musical-scale">{t.scaleLabel}</label>
              <Select
                value={settings.quantize ? settings.scale : 'free'}
                items={[
                  { value: 'pentatonic', label: t.pentatonic },
                  { value: 'major', label: t.major },
                  { value: 'free', label: t.free },
                ]}
                onValueChange={(v) => {
                  if (v === 'pentatonic' || v === 'major' || v === 'free')
                    setSettings((s) => ({
                      ...s,
                      quantize: v !== 'free',
                      scale: v === 'free' ? s.scale : v,
                    }));
                }}
              >
                <SelectTrigger id="musical-scale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pentatonic">{t.pentatonic}</SelectItem>
                  <SelectItem value="major">{t.major}</SelectItem>
                  <SelectItem value="free">{t.free}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {mode === 'sonar' && (
            <MelodyCoach
              state={state}
              language={language}
              onAudition={() => {
                void instrument.current?.audition();
              }}
              onStop={() => instrument.current?.stop()}
              onPreset={() => {
                instrument.current?.rest();
                setSettings((s) => ({
                  ...s,
                  melody: true,
                  scale: 'pentatonic',
                  quantize: true,
                  glide: 24,
                  reverb: 28,
                  tone: 'classic',
                }));
              }}
            />
          )}
        </section>
      </section>
      <section className="sonar-panel" aria-label={t.gestureTitle}>
        <div className="sonar-instruction">
          <Radio size={20} />
          <div>
            <h2>{t.gestureTitle}</h2>
            <p>
              {mode === 'sonar'
                ? settings.melody
                  ? t.melodyHelp
                  : t.gestureInstruction
                : t.touchInstruction}
            </p>
          </div>
        </div>
        {mode === 'sonar' && (
          <>
            <Parameter
              label={t.probe}
              value={settings.probe}
              onChange={(v) => change('probe', v)}
            />
            <Parameter
              label={t.sensitivity}
              value={settings.sensitivity}
              onChange={(v) => change('sensitivity', v)}
            />
            <div className="signal-meter">
              <span>
                {t.signal}
                <b>{Math.round(state.confidence * 100)}%</b>
              </span>
              <div>
                <i style={{ width: `${state.confidence * 100}%` }} />
              </div>
              <small>
                {state.carrier
                  ? `${t.carrier} ${(state.carrier / 1000).toFixed(1)} kHz`
                  : t.waiting}
              </small>
            </div>
            <button
              className="reset-button"
              disabled={!state.running}
              onClick={() => {
                instrument.current?.stop();
                void instrument.current?.start('sonar');
              }}
              aria-label={t.recalibrateAria}
            >
              <RotateCcw size={15} />
              {t.recalibrate}
            </button>
            <div className="microphone-choice">
              <label htmlFor="microphone-input">{t.chooseMicrophone}</label>
              <Select
                disabled={busy || state.running}
                value={settings.inputDeviceId}
                items={[
                  { value: 'auto', label: t.autoMicrophone },
                  ...(state.inputs ?? []).map((d, i) => ({
                    value: d.id,
                    label: d.label || `${t.chooseMicrophone} ${i + 1}`,
                  })),
                ]}
                onValueChange={(v) => {
                  if (v) change('inputDeviceId', v);
                }}
              >
                <SelectTrigger
                  id="microphone-input"
                  aria-describedby="microphone-help"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t.autoMicrophone}</SelectItem>
                  {(state.inputs ?? []).map((d, i) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label || `${t.chooseMicrophone} ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="microphone-help">{t.microphoneHelp}</p>
            </div>
            <div className="sonar-compatibility">
              <div>
                <Switch
                  id="compatibility"
                  disabled={busy || state.running}
                  checked={settings.compatibility}
                  onCheckedChange={(v) => change('compatibility', v)}
                  aria-describedby="compatibility-help"
                />
                <label htmlFor="compatibility">{t.compatibility}</label>
              </div>
              <p id="compatibility-help">{t.compatibilityHelp}</p>
              <p>{t.probeHelp}</p>
            </div>
            <p className="sonar-note">{t.sonarNote}</p>
          </>
        )}
      </section>
      {mode === 'sonar' && (
        <SonarDiagnosticsPanel state={state} language={language} />
      )}
      <ThereminOrigins language={language} />
      <footer>
        <span>
          <Volume2 size={15} />
          {t.lowVolume}
        </span>
        <a href="#instrument">
          {t.back}
          <ArrowUpRight size={15} />
        </a>
        <span className="footer-brand">ETHER / 以太</span>
      </footer>
    </main>
  );
}
