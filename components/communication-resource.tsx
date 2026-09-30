"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCommunicationResource<T>(loader: (signal?: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setError("");
    try { const value = await loader(controller.signal); if (controller.signal.aborted) return false; setData(value); return true; }
    catch (err) { if (!controller.signal.aborted) { setData(null); setError(err instanceof Error ? err.message : "Não foi possível carregar a comunicação."); } return false; }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [loader]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); active.current?.abort(); }; }, [load]);
  return { data, loading, error, load };
}
export function ResourceState({ loading, error, retry, children }: { loading: boolean; error: string; retry: () => void; children: React.ReactNode }) {
  if (loading) return <div className="commercial-skeleton" role="status">Carregando comunicação…</div>;
  if (error) return <div className="commercial-notice" role="alert"><p>{error}</p><button type="button" onClick={retry}>Tentar novamente</button></div>;
  return children;
}
export function Feedback({ busy, error, message }: { busy: boolean; error: string; message: string }) {
  return <>{busy && <p role="status">Processando…</p>}{error && <p role="alert" className="commercial-notice">{error}</p>}{message && <p role="status" className="commercial-notice">{message}</p>}</>;
}
