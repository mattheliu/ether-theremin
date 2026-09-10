import { zh } from './locales/zh';
import { en } from './locales/en';

export type Language = 'zh' | 'en';
export type MessageKey = keyof typeof zh.messages;
export const DEFAULT_LANGUAGE: Language = 'zh';
export const LANGUAGE_TAGS = { zh: 'zh-CN', en: 'en' } as const;
export const LANGUAGE_LABELS = { zh: '中文', en: 'EN' } as const;
export const copy = { zh: zh.ui, en: en.ui };
export const messages = { zh: zh.messages, en: en.messages };

export function localizeMessage(
  message: MessageKey,
  language: Language,
): string {
  return messages[language][message];
}
