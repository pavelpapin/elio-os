import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="min-h-screen bg-[#08090A] text-white/90 font-sans flex items-center justify-center">
      <div className="text-center px-6">
        <Logo className="text-[36px] leading-none tracking-[-0.02em] text-white/90 mb-8" />
        <h1 className="text-[64px] font-medium tracking-[-0.03em] text-white/20">
          404
        </h1>
        <p className="mt-4 text-[17px] text-white/40">
          {t("text")}
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 mt-8 bg-white/[0.9] text-[#08090A] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-colors duration-150"
        >
          {t("back")}
        </a>
      </div>
    </div>
  );
}
