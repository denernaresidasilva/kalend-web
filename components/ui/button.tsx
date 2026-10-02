import type { ButtonHTMLAttributes } from "react";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean };
export function Button({ variant = "primary", loading = false, disabled, className = "", children, type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`k-button k-button-${variant} ${className}`}>{loading && <span className="k-spinner" aria-hidden="true" />}{children}</button>;
}
