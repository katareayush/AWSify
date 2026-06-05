"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, ServerCrash } from "lucide-react";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";

const COLLAPSED_HEIGHT = 160;

export function FailurePanel({ reason }: { reason: string }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const isLong = reason.length > 400 || reason.split("\n").length > 6;

  async function copy() {
    try {
      await navigator.clipboard.writeText(reason);
      toast.success("Failure reason copied to clipboard.");
    } catch {
      toast.error("Clipboard write failed.");
    }
  }

  return (
    <Panel className="border-red-500/20 p-4">
      <div className="flex items-start gap-3">
        <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-red-400">Deployment failed</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? "Collapse" : "Expand"}
                </button>
              )}
            </div>
          </div>
          <pre
            className="mt-2 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-red-500/10 bg-red-500/[0.04] p-3 font-mono text-[11.5px] leading-[1.55] text-red-300/90"
            style={!expanded && isLong ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
          >
            {reason}
          </pre>
        </div>
      </div>
    </Panel>
  );
}
