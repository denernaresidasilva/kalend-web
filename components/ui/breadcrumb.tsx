import Link from "next/link";
export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav aria-label="Caminho da página" className="k-breadcrumb"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}
