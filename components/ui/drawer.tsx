"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trapDrawerFocus } from "@/lib/drawer";
import { IconButton } from "./icon-button";
export function Drawer({ open, onClose, label, children, id, closeLabel = "Fechar menu" }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode; id?: string; closeLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.showModal();
    panel.querySelector<HTMLElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => trapDrawerFocus(event, Array.from(panel.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(element => element.getClientRects().length > 0), panel);
    panel.addEventListener("keydown", keyboard);
    return () => { panel.removeEventListener("keydown", keyboard); panel.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={dialog} id={id} className="kalend-ui k-drawer" aria-label={label} aria-modal="true" tabIndex={-1} onCancel={event => { event.preventDefault(); close.current(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current(); } }}><div className="k-drawer-heading"><strong>{label}</strong><IconButton aria-label={closeLabel} onClick={() => close.current()}><X aria-hidden="true" size={20} /></IconButton></div>{children}</dialog>, document.body);
}
