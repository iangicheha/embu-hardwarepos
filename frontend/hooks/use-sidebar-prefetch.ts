"use client";

import { useEffect, useRef } from "react";

const ROUTES = [
  "/dashboard",
  "/pos",
  "/products",
  "/categories",
  "/suppliers",
  "/restocks",
  "/reports",
  "/users",
  "/audit-logs",
  "/notifications",
  "/settings",
];

/**
 * Prefetch sidebar routes one at a time during browser idle periods.
 * Avoids the expensive "prefetch all at mount" pattern while still
 * making navigation instant after the first idle cycle.
 */
export function useSidebarPrefetch() {
  const idxRef = useRef(0);

  useEffect(() => {
    // requestIdleCallback isn't available in Safari < 16, so fall back
    // to a simple setTimeout with a small delay.
    const scheduleNext = typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : (cb: IdleRequestCallback) => setTimeout(cb, 50);

    const cancelNext = typeof requestIdleCallback === "function"
      ? cancelIdleCallback
      : clearTimeout;

    let handle: number | ReturnType<typeof setTimeout>;

    function prefetchNext() {
      const idx = idxRef.current;
      if (idx >= ROUTES.length) return;

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = ROUTES[idx];
      link.as = "document";
      document.head.appendChild(link);

      idxRef.current = idx + 1;
      handle = scheduleNext(prefetchNext);
    }

    handle = scheduleNext(prefetchNext);

    return () => {
      // cancelIdleCallback and clearTimeout share the same numeric type
      cancelNext(handle as unknown as number);
    };
  }, []);
}