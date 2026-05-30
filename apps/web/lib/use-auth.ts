"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Me } from "./api";

export function useAuth(opts?: { redirect?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(data => {
        setMe(data);
        if (!data.authenticated && opts?.redirect !== false) {
          router.replace("/");
        }
      })
      .catch(() => {
        setMe({ authenticated: false });
        if (opts?.redirect !== false) router.replace("/");
      })
      .finally(() => setLoading(false));
  }, []);

  return { me, loading };
}
