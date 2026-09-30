interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeading({ eyebrow, title, description, action }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-white/[0.15] pb-7 xl:flex-row xl:items-end xl:justify-between">
      <div>
        {eyebrow ? (
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-soft">
            <span className="h-1.5 w-1.5 bg-violet" />{eyebrow}
          </p>
        ) : null}
        <h1 className="mt-4 text-[34px] font-semibold leading-none tracking-[-0.055em] text-white sm:text-[44px]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-[1.6] text-white/50 sm:text-[14px]">
          {description}
        </p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
