import type { AuthMe } from "@/lib/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function sessionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleString("pt-BR");
}
export function AccountSecurity({ profile, leaving, onLogout, onLogoutAll }: { profile: AuthMe; leaving: boolean; onLogout: () => void; onLogoutAll: () => void }) {
  return <div className="k-account-stack">
    <Card aria-labelledby="account-password-title"><h2 id="account-password-title">Alterar senha</h2><p>A alteração de senha ainda não está disponível nesta conta.</p><p className="k-muted">Quando esse recurso estiver disponível, você poderá confirmar a senha atual e cadastrar uma nova senha por aqui.</p></Card>
    <Card aria-labelledby="account-session-title"><h2 id="account-session-title">Sessão e acesso</h2><p>Gerencie o acesso à sua conta nos dispositivos conectados.</p>
      <dl className="k-account-data"><div><dt>Validade da sessão</dt><dd>{sessionDate(profile.session.expiresAt)}</dd></div><div><dt>Limite de renovação</dt><dd>{sessionDate(profile.session.refreshExpiresAt)}</dd></div></dl>
      <div className="k-actions"><Button variant="secondary" loading={leaving} onClick={onLogout}>Sair deste dispositivo</Button><Button disabled={leaving} onClick={onLogoutAll}>Sair de todos os dispositivos</Button></div>
    </Card>
  </div>;
}
