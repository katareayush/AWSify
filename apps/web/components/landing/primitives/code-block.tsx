import { FileCode2 } from "lucide-react";

interface CodeBlockProps {
  file: string;
  language: string;
  code: string;
}

export function CodeBlock({ file, language, code }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070708]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11.5px] text-white/55">
          <FileCode2 className="h-3.5 w-3.5 text-violet-soft" />
          {file}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-white/80">
        {code}
      </pre>
    </div>
  );
}
