interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 16, className = "" }: WordmarkProps) {
  return (
    <span
      aria-label="AWS-ify"
      className={`inline-flex items-baseline whitespace-nowrap leading-none ${className}`}
      style={{ fontSize: `${size}px` }}
    >
      <span
        aria-hidden
        className="font-sans font-semibold uppercase tracking-[0.01em] text-white"
        style={{ fontFeatureSettings: "'ss01', 'cv11'" }}
      >
        AWS
      </span>
      <span
        aria-hidden
        className="ml-[0.08em] font-display italic text-violet-soft"
        style={{
          fontSize: `${size * 1.22}px`,
          transform: "translateY(0.05em)",
          textShadow: "0 0 22px rgba(167, 139, 250, 0.35)"
        }}
      >
        -ify
      </span>
    </span>
  );
}
