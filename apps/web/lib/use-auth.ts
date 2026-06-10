"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Me } from "./api";

// One /me request per page load, shared by every consumer (pages, top bar).
// Login/logout always navigate via full page loads, so the cache naturally
// resets when auth state changes.
let cachedMe: Me | null = null;
let inflight: Promise<Me> | null = null;

export function fetchMe(): Promise<Me> {
  if (cachedMe) return Promise.resolve(cachedMe);
  if (!inflight) {
    inflight = api
      .me()
      .then((me) => {
        cachedMe = me;
        return me;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useAuth(opts?: { redirect?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(cachedMe);
  const [loading, setLoading] = useState(cachedMe === null);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        if (!data.authenticated && opts?.redirect !== false) {
          router.replace("/");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMe({ authenticated: false });
        if (opts?.redirect !== false) router.replace("/");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { me, loading };
}
