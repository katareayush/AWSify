"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  ttl: number;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, ttl?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>((kind, message, ttl = 5000) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, kind, message, ttl }]);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ push }), [push]);

  // Expose imperative helpers so non-component code (e.g. error-messages) can call.
  useEffect(() => {
    imperativePush = push;
    return () => {
      imperativePush = null;
    };
  }, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (toast.ttl <= 0) return;
    const t = setTimeout(onClose, toast.ttl);
    return () => clearTimeout(t);
  }, [toast.ttl, onClose]);

  const iconCls = "h-4 w-4 shrink-0";
  const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertCircle : Info;
  const wrapCls =
    toast.kind === "success"
      ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100"
      : toast.kind === "error"
        ? "border-red-500/30 bg-red-500/[0.08] text-red-100"
        : "border-white/[0.08] bg-black/80 text-white/85";
  const iconColor =
    toast.kind === "success" ? "text-emerald-400" : toast.kind === "error" ? "text-red-400" : "text-white/55";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-[13px] leading-[1.5] shadow-xl backdrop-blur ${wrapCls}`}
    >
      <Icon className={`${iconCls} mt-0.5 ${iconColor}`} />
      <p className="flex-1 break-words">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 shrink-0 text-white/35 transition-colors hover:text-white/80"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return useMemo(
    () => ({
      success: (message: string, ttl?: number) => ctx.push("success", message, ttl),
      error: (message: string, ttl?: number) => ctx.push("error", message, ttl ?? 7000),
      info: (message: string, ttl?: number) => ctx.push("info", message, ttl)
    }),
    [ctx]
  );
}

// Imperative escape hatch for code that lives outside the React tree
// (e.g. the api request helper). Safe to call before/after provider mount.
let imperativePush: ToastContextValue["push"] | null = null;

export const toast = {
  success: (message: string, ttl?: number) => imperativePush?.("success", message, ttl),
  error: (message: string, ttl?: number) => imperativePush?.("error", message, ttl ?? 7000),
  info: (message: string, ttl?: number) => imperativePush?.("info", message, ttl)
};
