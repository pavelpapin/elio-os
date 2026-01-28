"use client";

interface PerspectiveFrameProps {
  children: React.ReactNode;
  className?: string;
  /** Fade direction - which side fades out */
  fadeDirection?: "bottom" | "left" | "left-bottom";
  /** Stronger rotation for hero sections */
  heroMode?: boolean;
}

export function PerspectiveFrame({
  children,
  className = "",
  fadeDirection = "bottom",
  heroMode = false
}: PerspectiveFrameProps) {
  const rotation = heroMode
    ? "rotateX(12deg) rotateY(-8deg)"
    : "rotateX(8deg) rotateY(-3deg)";

  return (
    <div className={`relative ${className}`} style={{ perspective: heroMode ? "1000px" : "1200px" }}>
      {/* 3D transformed container */}
      <div
        className="relative"
        style={{
          transform: rotation,
          transformStyle: "preserve-3d",
          transformOrigin: heroMode ? "right center" : "center center",
        }}
      >
        {children}

        {/* Bottom fade gradient */}
        {(fadeDirection === "bottom" || fadeDirection === "left-bottom") && (
          <div
            className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #08090A 0%, transparent 100%)",
            }}
          />
        )}

        {/* Left fade gradient - for overlapping with text */}
        {(fadeDirection === "left" || fadeDirection === "left-bottom") && (
          <div
            className="absolute top-0 bottom-0 left-0 w-48 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #08090A 0%, transparent 100%)",
            }}
          />
        )}
      </div>

      {/* Subtle reflection/glow under the card */}
      {heroMode && (
        <div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-20 opacity-15 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(184,169,144,0.4) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
