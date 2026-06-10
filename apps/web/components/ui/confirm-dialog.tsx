"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  function requestCancel() {
    if (busy) return;
    onCancel();
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="animate-palette-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={requestCancel}
    >
      <div
        className="animate-palette-in w-full max-w-md overflow-hidden rounded-xl border border-white/[0.1] bg-[#0d0c14] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 p-5">
          {tone === "danger" && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-300" />
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="confirm-title" className="text-[14.5px] font-medium tracking-tight text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-[12.5px] leading-[1.6] text-white/55">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestCancel}
            disabled={busy}
            className="rounded-md p-1 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
          <Button autoFocus variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            className={
              tone === "danger"
                ? "border border-red-500/40 bg-red-500/90 text-white hover:bg-red-500"
                : undefined
            }
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
