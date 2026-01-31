import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale, isRtl } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const meta = messages.metadata;

  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL('https://getelio.co'),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://getelio.co/${locale}`,
      siteName: 'elio.',
      locale: locale === 'ar' ? 'ar_AE' : locale === 'ru' ? 'ru_RU' : 'en_US',
      type: 'website',
      images: [
        {
          url: 'https://getelio.co/og-image.png',
          width: 1200,
          height: 630,
          alt: 'elio — AI-powered deal assistant for real estate teams',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: meta.title,
      description: meta.description,
      images: ['https://getelio.co/og-image.png'],
    },
    alternates: {
      canonical: `https://getelio.co/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://getelio.co/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div dir={isRtl(locale as Locale) ? 'rtl' : 'ltr'}>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
