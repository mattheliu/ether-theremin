import type { Instrument, Settings } from './instrument';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerInstrumentTools(
  engine: Instrument,
  getSettings: () => Settings,
  configure: (s: Settings) => void,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    {
      name: 'read_instrument_state',
      description:
        'Read the theremin mode, live signal and settings. Does not start audio or microphone.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        mode: engine.mode,
        ...engine.snapshot(),
        settings: getSettings(),
      }),
    },
    {
      name: 'list_audio_inputs',
      description:
        'List available microphone inputs without starting audio or requesting microphone access. Device labels may be hidden until permission is granted.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => engine.refreshInputs(),
    },
    {
      name: 'configure_instrument',
      description:
        'Set theremin sound and sonar parameters. Does not request microphone access or start playing.',
      inputSchema: {
        type: 'object',
        properties: {
          volume: { type: 'number', minimum: 0, maximum: 100 },
          probe: { type: 'number', minimum: 0, maximum: 100 },
          sensitivity: { type: 'number', minimum: 0, maximum: 100 },
          glide: { type: 'number', minimum: 0, maximum: 100 },
          reverb: { type: 'number', minimum: 0, maximum: 100 },
          tone: { type: 'string', enum: ['classic', 'pure', 'hollow'] },
          quantize: { type: 'boolean' },
          melody: { type: 'boolean' },
          scale: { type: 'string', enum: ['pentatonic', 'major'] },
          compatibility: { type: 'boolean' },
          inputDeviceId: { type: 'string' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw new Error('Expected a settings object.');
        for (const [key, value] of Object.entries(input)) {
          if (
            ['volume', 'probe', 'sensitivity', 'glide', 'reverb'].includes(key)
          ) {
            if (
              typeof value !== 'number' ||
              !Number.isFinite(value) ||
              value < 0 ||
              value > 100
            )
              throw new Error(`${key} must be between 0 and 100.`);
          } else if (key === 'inputDeviceId') {
            if (
              typeof value !== 'string' ||
              !value ||
              (value !== 'auto' &&
                !engine.snapshot().inputs?.some((d) => d.id === value))
            )
              throw new Error('Select an available microphone.');
          } else if (key === 'scale') {
            if (value !== 'pentatonic' && value !== 'major')
              throw new Error('Unknown scale.');
          } else if (key === 'tone') {
            if (!['classic', 'pure', 'hollow'].includes(String(value)))
              throw new Error('Unknown tone.');
          } else if (
            key === 'quantize' ||
            key === 'compatibility' ||
            key === 'melody'
          ) {
            if (typeof value !== 'boolean')
              throw new Error(`${key} must be boolean.`);
          } else throw new Error('Unknown setting.');
        }
        const settings = { ...getSettings(), ...input };
        configure(settings);
        return { settings };
      },
    },
    {
      name: 'stop_instrument',
      description:
        'Stop all theremin audio, stop the sonar pilot, and release microphone tracks.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: () => {
        engine.stop();
        return engine.snapshot();
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => lifecycle.abort();
}
