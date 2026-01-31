import { getRequestConfig } from 'next-intl/server';
import { type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) as Locale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
