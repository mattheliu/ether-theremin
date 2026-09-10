import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load-typescript.mjs';

const { copy, messages, localizeMessage, DEFAULT_LANGUAGE, LANGUAGE_TAGS } =
  await loadTypeScript(new URL('../lib/i18n.ts', import.meta.url));
const { InstrumentError, errorMessageKey } = await loadTypeScript(
  new URL('../lib/instrument-errors.ts', import.meta.url),
);

test('Chinese is the default; every UI label and engine message is complete in both languages', () => {
  assert.equal(DEFAULT_LANGUAGE, 'zh');
  assert.equal(LANGUAGE_TAGS.zh, 'zh-CN');
  for (const section of [copy, messages]) {
    assert.deepEqual(
      Object.keys(section.zh).sort(),
      Object.keys(section.en).sort(),
    );
    for (const key of Object.keys(section.zh)) {
      assert.ok(section.zh[key].trim(), key);
      assert.ok(section.en[key].trim(), key);
      assert.doesNotMatch(section.en[key], /\p{Script=Han}/u, key);
    }
  }
});

test('the same live state renders in either language without changing the engine message', () => {
  const message = 'measuringBackground';
  assert.equal(
    localizeMessage(message, 'en'),
    'Stay still while the background signal is measured…',
  );
  assert.equal(localizeMessage(message, 'zh'), '请保持静止，正在测量背景信号…');
  assert.equal(localizeMessage(message, 'en'), messages.en[message]);
});

test('browser failures resolve to translated codes, including a disconnected device selection', () => {
  const cases = {
    NotAllowedError: 'permissionDenied',
    NotFoundError: 'microphoneMissing',
    NotReadableError: 'microphoneBusy',
    OverconstrainedError: 'inputUnavailable',
    SecurityError: 'insecureContext',
  };
  for (const [name, key] of Object.entries(cases)) {
    const resolved = errorMessageKey(
      new DOMException('Browser-specific internal text', name),
    );
    assert.equal(resolved, key);
    for (const language of ['zh', 'en'])
      assert.ok(localizeMessage(resolved, language));
  }
  assert.equal(
    errorMessageKey(new InstrumentError('inputSilent')),
    'inputSilent',
  );
});

test('unexpected failures produce a localized fallback instead of exposing raw error text', () => {
  for (const error of [
    new Error('Internal device identifier'),
    null,
    'Unknown failure',
  ]) {
    assert.equal(errorMessageKey(error), 'startFailed');
    assert.ok(localizeMessage(errorMessageKey(error), 'zh'));
    assert.doesNotMatch(
      localizeMessage(errorMessageKey(error), 'en'),
      /Internal device/,
    );
  }
});
