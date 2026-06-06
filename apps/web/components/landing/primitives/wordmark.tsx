interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 16, className = "" }: WordmarkProps) {
  return (
    <span
      aria-label="AWS-ify"
      className={`inline-flex items-baseline whitespace-nowrap leading-none text-white ${className}`}
      style={{ fontSize: `${size}px` }}
    >
      <span
        aria-hidden
        className="font-sans font-semibold uppercase tracking-[0.01em]"
      >
        AWS
      </span>
      <span
        aria-hidden
        className="ml-[0.08em] font-display italic"
        style={{
          fontSize: `${size * 1.22}px`,
          transform: "translateY(0.05em)"
        }}
      >
        -ify
      </span>
    </span>
  );
}
