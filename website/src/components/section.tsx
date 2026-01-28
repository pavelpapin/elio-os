export function Section({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="py-16 sm:py-20 border-t border-white/[0.06]">
      <div className="max-w-[1000px] mx-auto px-6 sm:px-10">{children}</div>
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] text-white/20 mb-4">
      {children}
    </p>
  );
}
