interface PageHeadingProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeading({ eyebrow, title, description, action }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-soft">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-[28px] font-medium tracking-tight text-white sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-[1.65] text-white/55">
          {description}
        </p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
