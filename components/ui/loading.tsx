export function Loading({ children = "Carregando…" }: { children?: React.ReactNode }) {
  return <div className="k-loading" role="status"><span className="k-spinner" aria-hidden="true" />{children}</div>;
}
