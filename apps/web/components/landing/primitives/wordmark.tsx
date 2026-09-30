interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 16, className = "" }: WordmarkProps) {
  return (
    <span
      aria-label="AWS-ify"
      className={`inline-flex items-center whitespace-nowrap leading-none text-white ${className}`}
      style={{ fontSize: `${size}px` }}
    >
      <span aria-hidden className="mr-[0.6em] inline-block h-[0.85em] w-[0.85em] bg-[#ed462d]" />
      <span aria-hidden className="font-sans font-semibold uppercase tracking-[-0.065em]">AWS<span className="text-[#ed462d]">/</span>IFY</span>
    </span>
  );
}
