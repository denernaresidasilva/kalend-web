import type { ReactNode } from "react";
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`k-badge k-badge-${tone}`}>{children}</span>;
}
