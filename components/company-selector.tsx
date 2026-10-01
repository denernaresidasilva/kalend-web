"use client";
import { useState } from "react";
import { linkedCompanies } from "@/lib/company-selection";
import type { AuthMe } from "@/lib/contracts";
export function CompanySelector({ profile, busy, select }: {
  profile: AuthMe; busy: boolean; select: (companyId: string) => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState("");
  const companies = linkedCompanies(profile);
  if (companies.length <= 1) return null;
  return <section className="commercial-panel commercial-form" aria-label="Selecionar empresa">
    <h2>Selecionar empresa</h2>
    <label>Empresa<select disabled={busy} value={companyId} onChange={event => setCompanyId(event.target.value)}>
      <option value="">Escolha uma empresa</option>
      {companies.map(row => <option key={row.company.id} value={row.company.id}>{row.company.name} · {row.role}</option>)}
    </select></label>
    <button type="button" className="new-company-submit" disabled={busy || !companies.some(row => row.company.id === companyId)} onClick={() => void select(companyId)}>{busy ? "Selecionando…" : "Continuar"}</button>
  </section>;
}
