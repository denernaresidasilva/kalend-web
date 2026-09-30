"use client";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
const Operations = createContext<{ pending: number; change: (delta: number) => void; metaSyncNeeded: boolean; setMetaSyncNeeded: (value: boolean) => void } | null>(null);
export function CommunicationOperations({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const [metaSyncNeeded, setMetaSyncNeeded] = useState(false);
  return <Operations.Provider value={{ pending, metaSyncNeeded, setMetaSyncNeeded, change: delta => setPending(count => Math.max(0, count + delta)) }}>{children}</Operations.Provider>;
}
export function useCommunicationPending() { return (useContext(Operations)?.pending ?? 0) > 0; }
// Synchronous lock prevents two mutations before React renders the disabled button.
export function useCommunicationMutation() {
  const operations = useContext(Operations);
  const [busy, updateBusy] = useState(false);
  const lockRef = useRef(false);
  const reported = useRef(false);
  function setBusy(value: boolean) {
    if (reported.current !== value) { operations?.change(value ? 1 : -1); reported.current = value; }
    updateBusy(value);
  }
  return { busy, setBusy, lockRef };
}

// Keep uncertain Meta submission guard when switching communication sections.
export function useMetaSubmissionGuard() {
  const operations = useContext(Operations);
  const [local, setLocal] = useState(false);
  return [operations?.metaSyncNeeded ?? local, operations?.setMetaSyncNeeded ?? setLocal] as const;
}
