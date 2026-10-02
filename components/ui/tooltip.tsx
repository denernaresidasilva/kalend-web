import type { ReactNode } from "react";
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="k-tooltip-wrap">{children}<span className="k-tooltip" aria-hidden="true">{label}</span></span>;
}
