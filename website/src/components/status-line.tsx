"use client";

import { useState, useEffect } from "react";

const statusLines = [
  "Fewer lost leads",
  "Faster response times",
  "More follow-ups completed",
  "Clear deal ownership",
  "Full visibility across your team",
];

export function StatusLine() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % statusLines.length);
        setPhase("in");
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inset-0 rounded-full bg-[#B8A990]/30 animate-ping" />
        <span className="relative rounded-full h-2.5 w-2.5 bg-[#B8A990]/60" />
      </span>
      <div className="h-5 overflow-hidden text-left">
        <span
          className="block text-[14px] text-white/40 font-mono leading-5 transition-all duration-300 ease-out"
          style={{
            opacity: phase === "in" ? 1 : 0,
            transform: phase === "in" ? "translateY(0)" : "translateY(-8px)",
          }}
        >
          {statusLines[index]}
        </span>
      </div>
    </div>
  );
}
