"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError, endSession } from "@/lib/api";
import type { AuthMe } from "@/lib/contracts";
const AuthContext = createContext<{
  profile: AuthMe | null; loading: boolean; error: string;
  reload: (showLoading?: boolean) => Promise<AuthMe | null>; logout: () => Promise<void>;
} | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const reload = useCallback(async (showLoading = true) => {
    const current = ++version.current;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const me = await api<AuthMe>("/auth/me");
      if (current === version.current) setProfile(me);
      return current === version.current ? me : null;
    } catch (err) {
      if (current === version.current) {
        setProfile(null);
        if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : "Falha ao verificar sessão.");
      }
      return null;
    } finally { if (current === version.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const clear = () => { version.current++; setProfile(null); setLoading(false); };
    const check = () => { void reload(false); };
    window.addEventListener("kalend:session-ended", clear);
    window.addEventListener("kalend:signed-in", check);
    window.addEventListener("focus", check);
    const timer = setTimeout(() => void reload(), 0);
    return () => { clearTimeout(timer); window.removeEventListener("kalend:session-ended", clear); window.removeEventListener("kalend:signed-in", check); window.removeEventListener("focus", check); };
  }, [reload]);
  const logout = useCallback(async () => {
    await api<void>("/auth/logout", { method: "POST" });
    endSession();
  }, []);
  return <AuthContext.Provider value={{ profile, loading, error, reload, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider required");
  return context;
}
