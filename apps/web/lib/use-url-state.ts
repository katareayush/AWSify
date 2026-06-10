"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useUrlState(key: string, defaultValue = ""): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  // Build from window.location at call time so the setter identity stays
  // stable across URL changes — effects depending on it must not re-fire
  // after every navigation (that loop froze pagination on /repositories).
  const setValue = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(window.location.search);
      if (!next || next === defaultValue) sp.delete(key);
      else sp.set(key, next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, pathname, router]
  );

  return [value, setValue];
}

export function useUrlNumber(key: string, defaultValue = 0): [number, (next: number) => void] {
  const [raw, setRaw] = useUrlState(key, String(defaultValue));
  const parsed = Number.parseInt(raw, 10);
  const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
  const setValue = useCallback((next: number) => setRaw(String(Math.max(defaultValue, next))), [defaultValue, setRaw]);
  return [value, setValue];
}
