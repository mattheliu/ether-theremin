'use client';
import type { InstrumentState } from '@/lib/instrument';
import { copy, type Language } from '@/lib/i18n';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
export function SonarDiagnosticsPanel({
  state,
  language,
}: {
  state: InstrumentState;
  language: Language;
}) {
  const t = copy[language],
    d = state.diagnostics;
  const reported = (v?: boolean) =>
    v === undefined ? t.unknown : v ? t.enabled : t.disabled;
  return (
    <details className="sonar-diagnostics" open={state.phase === 'error'}>
      <summary>
        {t.diagnosticsTitle}
        {state.phase === 'calibrating' && !!d?.currentFrequency && (
          <span>
            {t.testingFrequency} {(d.currentFrequency / 1000).toFixed(1)} kHz
          </span>
        )}
      </summary>
      {!d ? (
        <p>{t.diagnosticsEmpty}</p>
      ) : (
        <>
          <dl>
            <div>
              <dt>{t.audioState}</dt>
              <dd>{t[d.audioState] ?? d.audioState}</dd>
            </div>
            <div>
              <dt>{t.trackEnabled}</dt>
              <dd>{reported(d.trackEnabled)}</dd>
            </div>
            <div>
              <dt>{t.trackMuted}</dt>
              <dd>{reported(d.trackMuted)}</dd>
            </div>
            <div>
              <dt>{t.inputDevice}</dt>
              <dd>{d.input || t.unknown}</dd>
            </div>
            <div>
              <dt>{t.inputRate}</dt>
              <dd>
                {d.inputSampleRate ? `${d.inputSampleRate} Hz` : t.unknown}
              </dd>
            </div>
            <div>
              <dt>{t.contextRate}</dt>
              <dd>{d.contextSampleRate} Hz</dd>
            </div>
            <div>
              <dt>{t.inputLevel}</dt>
              <dd>{d.micLevelDb.toFixed(1)} dBFS</dd>
            </div>
            <div>
              <dt>{t.echoCancellation}</dt>
              <dd>{reported(d.echoCancellation)}</dd>
            </div>
            <div>
              <dt>{t.noiseSuppression}</dt>
              <dd>{reported(d.noiseSuppression)}</dd>
            </div>
            <div>
              <dt>{t.autoGainControl}</dt>
              <dd>{reported(d.autoGainControl)}</dd>
            </div>
          </dl>
          {d.measurements.length > 0 && (
            <Table aria-label={t.diagnosticsTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.frequency}</TableHead>
                  <TableHead>{t.receivedLevel}</TableHead>
                  <TableHead>{t.rise}</TableHead>
                  <TableHead>{t.snr}</TableHead>
                  <TableHead>{t.stable}</TableHead>
                  <TableHead>{t.result}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.measurements.map((m) => (
                  <TableRow key={m.frequency}>
                    <TableCell>{(m.frequency / 1000).toFixed(1)} kHz</TableCell>
                    <TableCell>{m.peakDb.toFixed(1)} dBFS</TableCell>
                    <TableCell>{m.riseDb.toFixed(1)} dB</TableCell>
                    <TableCell>{m.snrDb.toFixed(1)} dB</TableCell>
                    <TableCell>
                      {m.stableFrames}/{m.totalFrames}
                    </TableCell>
                    <TableCell>
                      {m.usable ? t.usable : t.insufficient}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="diagnostics-note">{t.diagnosticsHelp}</p>
        </>
      )}
      <p>
        {t.macHelp}{' '}
        <a
          href="https://support.apple.com/en-ie/guide/mac-help/mchle82b42f0/mac"
          target="_blank"
          rel="noreferrer"
        >
          {t.macHelpLink} ↗
        </a>
      </p>
    </details>
  );
}
