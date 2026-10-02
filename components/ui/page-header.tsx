import type { ReactNode } from "react";
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="k-page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="k-actions">{actions}</div>}</header>;
}
