import type { ReactNode } from "react";
export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "danger" | "warning" | "success" }) {
  return <div className={`k-alert k-alert-${tone}`} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>{children}</div>;
}
