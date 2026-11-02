"use client";
import { useEffect, useState } from "react";
import { API_URL, tenantApi } from "@/lib/api";

export function useBookingEvents(companyId: string, userId: string, onChange: () => void) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!companyId || !userId || !API_URL || typeof EventSource === "undefined") return;
    let live = true;
    let source: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function connect() {
      try {
        // Refresh expiring cookies and verify tenant/user before opening a stream.
        await tenantApi(companyId, "/auth/me", undefined, userId);
        if (!live) return;
        source = new EventSource(`${API_URL}/booking/events`, { withCredentials: true });
        source.onopen = () => { if (live) setConnected(true); };
        source.addEventListener("booking-change", () => { if (live) onChange(); });
        source.onerror = () => { source?.close(); if (live) { setConnected(false); retry = setTimeout(() => void connect(), 5000); } };
      } catch { if (live) { setConnected(false); retry = setTimeout(() => void connect(), 15000); } }
    }
    void connect();
    return () => { live = false; source?.close(); clearTimeout(retry); };
  }, [companyId, userId, onChange]);
  return connected;
}
