"use client";

const defaultLogos = ["damac", "emaar", "sobha", "dewa", "nakheel", "meraas"];

export function LogoMarquee({
  logos = defaultLogos,
  height = "h-3.5 sm:h-[18px]",
}: {
  logos?: string[];
  height?: string;
} = {}) {
  const items = [...logos, ...logos];

  return (
    <div className="overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#08090A] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#08090A] to-transparent pointer-events-none" />
      <div className="marquee-track flex items-center gap-14 sm:gap-20 w-max">
        {items.map((name, i) => (
          <img
            key={`${name}-${i}`}
            src={`/logos/${name}.svg`}
            alt={name.toUpperCase()}
            className={`${height} opacity-[0.35] select-none shrink-0`}
          />
        ))}
      </div>
    </div>
  );
}
