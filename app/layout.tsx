import type { Metadata } from 'next';
import './globals.css';
import { copy, DEFAULT_LANGUAGE, LANGUAGE_TAGS } from '@/lib/i18n';
export const metadata: Metadata = {
  title: copy[DEFAULT_LANGUAGE].title,
  description: copy[DEFAULT_LANGUAGE].description,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={LANGUAGE_TAGS[DEFAULT_LANGUAGE]} className="dark">
      <body>{children}</body>
    </html>
  );
}
