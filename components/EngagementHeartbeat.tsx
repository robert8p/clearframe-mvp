"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(a: string, b: string) {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 86400000));
}

function track(eventName: string, properties: Record<string, unknown> = {}) {
  return fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

export function EngagementHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    void track("page_viewed", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    try {
      const today = localDayKey();
      const key = "cogni:last-active-date";
      const previous = window.localStorage.getItem(key);
      if (previous === today) return;
      const gap = previous ? daysBetween(previous, today) : null;
      void track("app_opened", { local_date: today, previous_local_date: previous, days_since_previous: gap });
      if (previous) void track("user_returned", { local_date: today, previous_local_date: previous, days_since_previous: gap });
      window.localStorage.setItem(key, today);
    } catch {
      void track("app_opened", { storage_available: false });
    }
  }, []);

  return null;
}
