"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { emailApi, emailProviders, emailStatuses, type EmailContext, type EmailConfiguration, type EmailInput, type EmailProvider, type EmailScope, type EmailTest } from '@/lib/email';
import { emailFields, emailDirty } from '@/lib/email-form';
import { installEmailLeaveGuard } from '@/lib/email-leave-guard';
import { useCommunicationMutation } from './communication-operations';
import { ResourceState, useCommunicationResource } from './communication-resource';

// Resolve authorization before mounting a loader; tenant identity always comes from the session.
export function EmailSettings({ scope, onDirtyChange }: { scope: EmailScope; onDirtyChange?: (dirty: boolean) => void }) {
  const { profile, loading } = useAuth();
  const membership = profile?.memberships.find(m => m.company.id === profile.selectedCompanyId);
  if (loading) return <p role="status">Verificando sessão…</p>;
  const authorized = scope === 'SYSTEM' ? profile?.systemRole === 'SUPER_ADMIN' : profile?.systemRole !== 'SUPER_ADMIN' && !!membership && ['OWNER', 'ADMIN'].includes(membership.role);
  if (!authorized) return <p>Acesso não autorizado à configuração de e-mail.</p>;
  return <EmailResource onDirtyChange={onDirtyChange} key={`${profile?.user.id}:${scope}:${profile?.selectedCompanyId ?? ''}`} context={scope === 'SYSTEM' ? { scope } : { scope, companyId: membership!.company.id, userId: profile!.user.id }} />;
}
export function EmailResource({ context, onDirtyChange }: { context: EmailContext; onDirtyChange?: (dirty: boolean) => void }) {
  const { scope } = context;
  const companyId = context.scope === 'COMPANY' ? context.companyId : '';
  const userId = context.scope === 'COMPANY' ? context.userId : '';
  const loader = useCallback((signal?: AbortSignal) => emailApi.get(scope === 'SYSTEM' ? { scope } : { scope, companyId, userId }, signal), [scope, companyId, userId]);
  const resource = useCommunicationResource(loader);
  return <ResourceState {...resource} retry={() => void resource.load()}>{resource.data && <EmailEditor onDirtyChange={onDirtyChange} context={context} initial={resource.data} />}</ResourceState>;
}
export function EmailEditor({ context, initial, onDirtyChange }: { context: EmailContext; initial: EmailConfiguration; onDirtyChange?: (dirty: boolean) => void }) {
  const { scope } = context;
  const [row, setRow] = useState(initial);
  const [managing, setManaging] = useState(false);
  const [draft, setDraft] = useState<EmailInput>(() => emailFields(initial));
  const [hasSecretInput, setHasSecretInput] = useState(false);
  const dirty = emailDirty(draft, row, hasSecretInput);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [result, setResult] = useState<EmailTest | null>(null);
  const mutation = useCommunicationMutation();
  const flight = useRef(false);
  const password = useRef<HTMLInputElement>(null);
  const title = scope === 'SYSTEM' ? 'E-mail do Sistema' : 'E-mail da empresa';
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  useEffect(() => installEmailLeaveGuard(() => dirty), [dirty]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 3000); return () => clearTimeout(timer); }, [message]);
  function change(values: Partial<EmailInput>) { setDraft({ ...draft, ...values }); setResult(null); setMessage(''); }
  function provider(value: EmailProvider) {
    const preset = emailProviders[value];
    if (password.current) password.current.value = '';
    setHasSecretInput(false);
    change({ provider: value, smtpHost: preset.host, smtpPort: preset.port, security: preset.security });
  }
  async function run(action: 'save' | 'test' | 'remove' | 'toggle') {
    if (flight.current || ((action === 'test' || action === 'toggle') && dirty)) return;
    flight.current = true; mutation.setBusy(true); setBusy(action); setError(''); setMessage(''); setResult(null);
    try {
      if (action === 'test') {
        const test = await emailApi.test(context, recipient); setResult(test); setRow(test.configuration);
      } else {
        let saved: EmailConfiguration;
        if (action === 'remove') saved = await emailApi.remove(context);
        else {
          const secret = password.current?.value;
          saved = await emailApi.save(context, action === 'toggle' ? { ...emailFields(row), enabled: !row.enabled } : { ...draft, ...(secret ? { password: secret } : {}) });
        }
        setRow(saved); setDraft(emailFields(saved)); setHasSecretInput(false); if (password.current) password.current.value = ''; setMessage(action === 'remove' ? 'Configuração removida.' : 'Configuração salva com sucesso.');
      }
    } catch { setError(action === 'test' ? 'Não foi possível enviar o e-mail. Confira a configuração ou aguarde antes de tentar novamente.' : 'Não foi possível salvar a configuração.'); }
    finally { flight.current = false; mutation.setBusy(false); setBusy(''); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void run('save'); }
  return <Card className="email-settings"><h2>{title}</h2><p>{scope === 'SYSTEM' ? 'Usado pelo Kalend para comunicação com proprietários e assinantes do sistema.' : 'Configure o e-mail que o Kalend utilizará para enviar mensagens aos seus clientes.'}</p>
    <p role="status">{emailStatuses[row.status]}{row.configured && ` · ${row.enabled ? 'Habilitado' : 'Desabilitado'}`}</p>
    {row.lastTestAt && <p>Último teste: {new Date(row.lastTestAt).toLocaleString('pt-BR')}<br />Destinatário: {row.lastTestRecipient}</p>}
    {!managing ? <Button onClick={() => setManaging(true)}>Gerenciar</Button> : <>
      <div className="k-actions" aria-label="Provedores SMTP">{(Object.keys(emailProviders) as EmailProvider[]).map(key => <Button key={key} variant={draft.provider === key ? 'primary' : 'secondary'} disabled={!!busy} aria-pressed={draft.provider === key} onClick={() => provider(key)}>{emailProviders[key].name}</Button>)}</div>
      <form onSubmit={submit}><fieldset disabled={!!busy}><legend>Configuração SMTP</legend><div className="email-form-grid">
        <label>E-mail<input type="email" required maxLength={320} value={draft.email} onChange={e => change({ email: e.target.value, username: e.target.value })} /></label>
        <label>Usuário SMTP<input required maxLength={320} value={draft.username ?? draft.email} onChange={e => change({ username: e.target.value })} /></label>
        <label>{draft.provider === 'CUSTOM' ? 'Senha' : 'Senha de app'}<input ref={password} name="smtpPassword" type="password" autoComplete="new-password" maxLength={16384} placeholder={row.hasPassword ? "••••••••••••" : undefined} required={!row.hasPassword} onChange={e => { setHasSecretInput(!!e.target.value); setResult(null); setMessage(''); }} />{draft.provider === 'GOOGLE' && <p>No Gmail, ative a verificação em duas etapas, gere uma senha de app <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">aqui</a> e cole os 16 caracteres neste campo. Use smtp.gmail.com, porta 587 e segurança TLS.</p>}</label>
        <label>Servidor SMTP<input required maxLength={253} value={draft.smtpHost} onChange={e => change({ smtpHost: e.target.value })} /></label>
        <label>Porta<input type="number" required min={1} max={65535} value={draft.smtpPort} onChange={e => change({ smtpPort: Number(e.target.value) })} /></label>
        <label>Segurança<select value={draft.security} onChange={e => change({ security: e.target.value as 'TLS' | 'SSL', smtpPort: e.target.value === 'SSL' ? 465 : 587 })}><option value="TLS">TLS</option><option value="SSL">SSL</option></select></label>
      </div>
      {row.configured && <p>Os pontos indicam uma senha salva. Digite para substituí-la; deixe vazio para mantê-la. Ao alterar a conta ou o servidor, informe uma nova senha.</p>}
      <p>Use TLS com porta 587 ou SSL com porta 465. Para Outro SMTP, o servidor precisa estar autorizado pela administração do Kalend.</p>
      <Button type="submit" loading={busy === 'save'} disabled={!!busy}>Salvar configuração</Button></fieldset></form>
      {dirty && <p>Salve as alterações antes de testar ou habilitar o envio.</p>}
      <form onSubmit={e => { e.preventDefault(); void run('test'); }}><label>E-mail para teste<input type="email" required maxLength={320} value={recipient} disabled={!!busy} onChange={e => setRecipient(e.target.value)} /></label><Button type="submit" loading={busy === 'test'} disabled={!!busy || dirty || !row.configured}>Enviar e-mail de teste</Button></form>
      <div className="k-actions"><Button variant="secondary" disabled={!!busy || dirty || !row.configured || !row.enabled && !row.verified} onClick={() => void run('toggle')}>{row.enabled ? 'Desativar envio' : 'Habilitar envio'}</Button><Button variant="danger" disabled={!!busy || !row.configured} onClick={() => void run('remove')}>Remover configuração</Button><Button variant="ghost" disabled={!!busy} onClick={() => { if (dirty && !window.confirm('Sair desta seção? Os campos editados que ainda não foram salvos serão descartados.')) return; if (password.current) password.current.value = ''; setDraft(emailFields(row)); setHasSecretInput(false); setManaging(false); }}>Fechar</Button></div>
    </>}
    {!!busy && <p role="status">{busy === 'test' ? 'Testando…' : 'Salvando…'}</p>}{error && <Alert tone="danger">{error}</Alert>}{message && <Alert tone="success">{message}</Alert>}
    {result && <div role={result.sent ? 'status' : 'alert'}><p>{result.sent ? '🟢' : '🔴'} {result.message}</p>{result.sent && <p>Enviado para: {result.recipient}<br />Servidor: {result.server}<br />TLS: {result.tls ? 'Ativo' : 'Inativo'}</p>}<p>O sucesso confirma a aceitação pelo servidor SMTP.</p></div>}
  </Card>;
}
