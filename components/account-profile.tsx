import type { AuthMe } from "@/lib/contracts";
import { accountMembership, accountRole } from "@/lib/account";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";

export function AccountProfile({ profile }: { profile: AuthMe }) {
  const membership = accountMembership(profile);
  return <Card className="k-account-profile" aria-labelledby="account-profile-title">
    <div className="k-account-identity"><UserAvatar name={profile.user.name} large /><div><h2 id="account-profile-title">Perfil</h2><p>{profile.user.name}</p><span className="k-badge k-badge-primary">{accountRole(profile)}</span></div></div>
    <p className="k-muted">Seu avatar é exibido com as iniciais do nome. A alteração de foto ainda não está disponível.</p>
    <dl className="k-account-data">
      <div><dt>Nome</dt><dd>{profile.user.name}</dd></div>
      <div><dt>E-mail</dt><dd>{profile.user.email}</dd></div>
      <div><dt>Tipo de conta</dt><dd>{profile.systemRole === "SUPER_ADMIN" ? "Administração global" : "Conta de usuário"}</dd></div>
      <div><dt>Empresa selecionada</dt><dd>{membership?.company.name ?? (profile.systemRole === "SUPER_ADMIN" ? "Nenhuma — acesso global" : "Nenhuma empresa selecionada")}</dd></div>
      {membership && <div><dt>Função na empresa</dt><dd>{accountRole({ ...profile, systemRole: "USER" })}</dd></div>}
    </dl>
    <p className="k-muted">Dados somente para consulta. A edição de nome e demais dados pessoais ainda não está disponível.</p>
  </Card>;
}
