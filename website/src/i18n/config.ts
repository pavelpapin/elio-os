export const locales = ['en', 'ru', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ar'];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export const localeNames: Record<Locale, string> = {
  en: 'EN',
  ru: 'RU',
  ar: 'AR',
};
