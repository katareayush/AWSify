import { FileCode2 } from "lucide-react";

interface CodeBlockProps {
  file: string;
  language: string;
  code: string;
}

export function CodeBlock({ file, language, code }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070708] sm:rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11.5px] text-white/55">
          <FileCode2 className="h-3.5 w-3.5 text-violet-soft" />
          <span className="truncate">{file}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[11.5px] leading-[1.7] text-white/80 sm:px-5 sm:text-[12.5px]">
        {code}
      </pre>
    </div>
  );
}
