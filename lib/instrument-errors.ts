import type { MessageKey } from './i18n';

/** Expected hardware failures carry stable codes, never presentation text. */
export class InstrumentError extends Error {
  constructor(readonly code: MessageKey) {
    super(code);
    this.name = 'InstrumentError';
  }
}

export function errorMessageKey(error: unknown): MessageKey {
  if (error instanceof InstrumentError) return error.code;
  const name = error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
      return 'permissionDenied';
    case 'NotFoundError':
      return 'microphoneMissing';
    case 'NotReadableError':
      return 'microphoneBusy';
    case 'OverconstrainedError':
      return 'inputUnavailable';
    case 'SecurityError':
      return 'insecureContext';
    default:
      return 'startFailed';
  }
}
