export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return <article className="k-card k-metric"><span>{label}</span><strong>{value}</strong></article>;
}
