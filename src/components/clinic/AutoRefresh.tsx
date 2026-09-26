"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps the queue live: re-renders server data every few seconds while visible. */
export function AutoRefresh({ everyMs = 6000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
