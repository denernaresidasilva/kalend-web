export function Skeleton({ label = "Carregando…" }: { label?: string }) {
  return <div className="k-skeleton" role="status"><span>{label}</span><div aria-hidden="true" /></div>;
}
