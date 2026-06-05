"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileCode2 } from "lucide-react";
import { Panel } from "../ui/panel";

interface Artifact {
  kind: string;
  path: string;
  content: string;
  summary: string;
}

interface ArtifactsListProps {
  artifacts: Artifact[];
}

export function ArtifactsList({ artifacts }: ArtifactsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (artifacts.length === 0) return null;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-5 py-3">
        <FileCode2 className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Generated files</p>
        <span className="ml-auto font-mono text-[10.5px] text-white/40">{artifacts.length}</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {artifacts.map((artifact) => {
          const isOpen = expanded === artifact.kind;
          return (
            <div key={artifact.kind}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : artifact.kind)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.015]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12.5px] text-white">{artifact.path}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-white/40">{artifact.summary}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />}
              </button>
              {isOpen && (
                <div className="border-t border-white/[0.04] bg-black/30">
                  <pre className="max-h-[400px] overflow-auto p-4 font-mono text-[11.5px] leading-[1.65] text-white/75">
                    <code>{artifact.content}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
