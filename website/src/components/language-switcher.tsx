"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(locale: Locale) {
    router.replace(pathname, { locale });
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center">
          {i > 0 && <span className="text-white/10 mx-1 text-[12px]">|</span>}
          <button
            onClick={() => switchLocale(locale)}
            className={`text-[12px] tracking-wider transition-colors duration-200 ${
              locale === currentLocale
                ? "text-[#E8E0D4] font-medium"
                : "text-white/20 hover:text-white/40"
            }`}
          >
            {localeNames[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
