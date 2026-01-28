"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

type AnimVariant = "up" | "down" | "left" | "right" | "scale" | "blur" | "none";

const variantStyles: Record<
  AnimVariant,
  { from: React.CSSProperties; to: React.CSSProperties }
> = {
  up: {
    from: { opacity: 0, transform: "translateY(32px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  down: {
    from: { opacity: 0, transform: "translateY(-24px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  left: {
    from: { opacity: 0, transform: "translateX(32px)" },
    to: { opacity: 1, transform: "translateX(0)" },
  },
  right: {
    from: { opacity: 0, transform: "translateX(-32px)" },
    to: { opacity: 1, transform: "translateX(0)" },
  },
  scale: {
    from: { opacity: 0, transform: "scale(0.92)", filter: "blur(4px)" },
    to: { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
  },
  blur: {
    from: { opacity: 0, filter: "blur(8px)" },
    to: { opacity: 1, filter: "blur(0px)" },
  },
  none: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
};

export function FadeIn({
  children,
  className = "",
  delay = 0,
  variant = "up",
  duration = 0.8,
  once = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: AnimVariant;
  duration?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // isReplay becomes true only after element has been shown AND left viewport
  const [isReplay, setIsReplay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          // Only mark as replay if it was previously visible
          setVisible((prev) => {
            if (prev) setIsReplay(true);
            return false;
          });
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const activeDuration = isReplay ? 0.4 : duration;
  const activeDelay = isReplay ? 0 : delay;

  const v = variantStyles[variant];
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const cssProps = Object.keys({ ...v.from, ...v.to });
  const transitionStr = cssProps
    .map(
      (p) =>
        `${p === "filter" ? "filter" : p} ${activeDuration}s ${easing} ${visible ? activeDelay : 0}ms`
    )
    .join(", ");

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(visible ? v.to : v.from),
        transition: transitionStr,
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
}
