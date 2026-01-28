export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`block font-logo font-extrabold lowercase ${className ?? ""}`}
      aria-label="elio"
    >
      elio
    </span>
  );
}
