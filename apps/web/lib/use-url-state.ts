"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useUrlState(key: string, defaultValue = ""): [string, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(params.toString());
      if (!next || next === defaultValue) sp.delete(key);
      else sp.set(key, next);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [key, defaultValue, params, pathname, router]
  );

  return [value, setValue];
}

export function useUrlNumber(key: string, defaultValue = 0): [number, (next: number) => void] {
  const [raw, setRaw] = useUrlState(key, String(defaultValue));
  const parsed = Number.parseInt(raw, 10);
  const value = Number.isFinite(parsed) ? parsed : defaultValue;
  const setValue = useCallback((next: number) => setRaw(String(next)), [setRaw]);
  return [value, setValue];
}
