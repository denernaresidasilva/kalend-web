"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-provider';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { safeQr } from '@/lib/communication';
import { normalizeEvolutionPhone, evolutionApi, evolutionExpired, evolutionLabels, type EvolutionContext, type EvolutionConnection } from '@/lib/evolution';

export function EvolutionSettings({ scope = 'COMPANY', initiallyOpen = false, onConnectionChange }: { scope?: 'GLOBAL' | 'COMPANY'; initiallyOpen?: boolean; onConnectionChange?: () => void } = {}) {
  const { profile, loading } = useAuth();
  const membership = profile?.memberships.find(m => m.company.id === profile.selectedCompanyId);
  if (loading) return <p role="status">Verificando sessão…</p>;
  if (scope === 'GLOBAL') {
    if (profile?.systemRole !== 'SUPER_ADMIN') return <p>Acesso não autorizado à conexão global.</p>;
    return <EvolutionPanel key={`${profile.user.id}:GLOBAL`} context={{ scope: 'GLOBAL', userId: profile.user.id }} initiallyOpen={initiallyOpen} onConnectionChange={onConnectionChange} />;
  }
  if (!profile || profile.systemRole === 'SUPER_ADMIN' || !membership || !['OWNER', 'ADMIN'].includes(membership.role)) return <p>Acesso não autorizado à conexão WhatsApp.</p>;
  return <EvolutionPanel key={`${profile.user.id}:${membership.company.id}`} context={{ companyId: membership.company.id, userId: profile.user.id }} initiallyOpen={initiallyOpen} onConnectionChange={onConnectionChange} />;
}
export function EvolutionView({ row, busy, now, numberMode = false, failed = false }: { row: EvolutionConnection | null; busy: boolean; now: number; numberMode?: boolean; failed?: boolean }) {
  const connected = row?.status === 'CONNECTED';
  const expired = evolutionExpired(row?.qrExpiresAt ?? null, now);
  const pairingExpired = evolutionExpired(row?.pairingExpiresAt ?? null, now);
  const image = !expired && row?.status === 'QR_AVAILABLE' ? safeQr(row.qrCode ?? '') : null;
  return <div aria-live="polite">
    <h3>{connected ? 'Seu WhatsApp está conectado' : 'Conecte seu WhatsApp'}</h3>
    <p role="status">{row?.status === 'CONNECTING' && row.pairingCode ? '🟡 Aguardando confirmação no WhatsApp' : row ? evolutionLabels[row.status] : '🟡 Aguardando conexão'}</p>
    {connected ? <dl><dt>Número</dt><dd>{row.phone ?? 'Aguardando identificação'}</dd><dt>Nome</dt><dd>{row.profileName ?? 'Aguardando identificação'}</dd></dl> : <>
      {expired && <><p>Este QR Code expirou.</p>{['QR_AVAILABLE', 'CONNECTING'].includes(row?.status ?? '') && <p role="status">Solicitando um novo código automaticamente na mesma conexão...</p>}</>}
      {image && <div className="evolution-qr"><p>Escaneie o QR Code usando o WhatsApp.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="QR Code para conectar o WhatsApp" width={280} height={280} />
        <p>WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho</p></div>}
      {row?.pairingCode && !pairingExpired && row.status === 'CONNECTING' && <div className="evolution-pairing"><p>Código de pareamento</p><strong>{row.pairingCode}</strong><ol><li>Abra o WhatsApp no celular.</li><li>Vá em Configurações.</li><li>Acesse Aparelhos conectados.</li><li>Toque em Conectar aparelho.</li><li>Escolha “Conectar com número de telefone”.</li><li>Informe o código exibido acima.</li></ol></div>}
      {pairingExpired && <p>Este código expirou. Solicite um novo código.</p>}
      {!failed && !image && !row?.pairingCode && !expired && (busy || !row || ['PENDING', 'CREATING', 'CONNECTING', 'QR_AVAILABLE'].includes(row.status)) && <p role="status">{numberMode ? 'Gerando código de conexão...' : 'Gerando QR Code...'}</p>}
    </>}
    {row?.status === 'ERROR' && <Alert tone="danger">🔴 Não foi possível conectar. O WhatsApp está temporariamente indisponível. Tente novamente em instantes.</Alert>}
  </div>;
}
export function EvolutionPanel({ context, initiallyOpen = false, onConnectionChange }: { context: EvolutionContext; initiallyOpen?: boolean; onConnectionChange?: () => void }) {
  const [opened, setOpened] = useState(initiallyOpen);
  const [row, setRow] = useState<EvolutionConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [numberMode, setNumberMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [now, setNow] = useState(Date.now);
  const [blocked, setBlocked] = useState(false);
  const flight = useRef(false);
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const { userId } = context;
  const scope = context.scope === 'GLOBAL' ? 'GLOBAL' : 'COMPANY';
  const companyId = 'companyId' in context ? context.companyId : '';
  const connectionContext = useCallback((): EvolutionContext => scope === 'GLOBAL' ? { scope, userId } : { companyId, userId }, [scope, companyId, userId]);
  const load = useCallback(async () => {
    if (flight.current) return;
    flight.current = true;
    const current = version.current;
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await evolutionApi.get(connectionContext(), abort.signal);
      if (current === version.current) { setRow(result); setError(''); setNow(Date.now()); }
    } catch {
      if (current === version.current) setError('Não foi possível atualizar a conexão. Aguarde e tente novamente.');
    } finally { if (current === version.current) flight.current = false; }
  }, [connectionContext]);
  useEffect(() => {
    if (!initiallyOpen) return;
    const abort = new AbortController();
    const current = version.current;
    const timer = setTimeout(() => {
      if (flight.current) return;
      flight.current = true; setBusy(true); controller.current = abort;
      void evolutionApi.action(connectionContext(), 'prepare', undefined, abort.signal).then(result => {
        if (current === version.current) { setRow(result); setNow(Date.now()); }
      }).catch(() => { if (current === version.current) setError('Não foi possível preparar a conexão. Aguarde e tente novamente.'); })
        .finally(() => { if (current === version.current) { flight.current = false; setBusy(false); } });
    }, 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [initiallyOpen, connectionContext]);
  useEffect(() => {
    const versionRef = version;
    const invalidate = () => { version.current++; controller.current?.abort(); setRow(null); setPhone(''); setBlocked(true); };
    window.addEventListener('kalend:tenant-changed', invalidate);
    window.addEventListener('kalend:session-ended', invalidate);
    window.addEventListener('kalend:signed-in', invalidate);
    return () => {
      versionRef.current++; controller.current?.abort();
      window.removeEventListener('kalend:tenant-changed', invalidate);
      window.removeEventListener('kalend:session-ended', invalidate);
      window.removeEventListener('kalend:signed-in', invalidate);
    };
  }, []);
  useEffect(() => {
    if (!opened || blocked || error) return;
    const focus = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', focus);
    // Moderate polling while pairing, including expiration recovery on the same connection.
    const active = !row || ['PENDING', 'CREATED', 'CREATING', 'QR_AVAILABLE', 'CONNECTING'].includes(row.status);
    const expiry = row?.pairingExpiresAt ?? row?.qrExpiresAt;
    const timer = active ? setInterval(() => { if (!document.hidden) void load(); }, 10000) : null;
    const expiration = expiry && !evolutionExpired(expiry, now) ? setTimeout(() => setNow(Date.now()), Math.max(0, Date.parse(expiry) - Date.now()) + 50) : null;
    return () => { window.removeEventListener('focus', focus); if (timer) clearInterval(timer); if (expiration) clearTimeout(expiration); };
  }, [opened, blocked, error, row, numberMode, now, load]);
  async function run(action: 'prepare' | 'connect' | 'reconnect' | 'logout' | 'remove' | 'pairing-code') {
    if (flight.current || blocked) return;
    if (action === 'remove' && !window.confirm('Excluir a conexão do WhatsApp? O WhatsApp será desconectado e você precisará configurar a conexão novamente.')) return;
    if (action === 'logout' && !window.confirm(scope === 'GLOBAL' ? 'Desconectar o WhatsApp do Kalend?' : 'Desconectar o WhatsApp da empresa?')) return;
    flight.current = true; setBusy(true); setError(''); setOpened(true);
    const current = version.current; const abort = new AbortController(); controller.current = abort;
    try {
      const result = await evolutionApi.action(connectionContext(), action, phone, abort.signal);
      if (current === version.current) {
        setRow(result); setNow(Date.now()); onConnectionChange?.();
        if (result.status === 'CONNECTED' || action === 'logout') setPhone('');
        if (action === 'remove' && result.status === 'PENDING') { setOpened(false); setRow(null); setNumberMode(false); setPhone(''); }
        if (action === 'connect' || action === 'reconnect') setNumberMode(false);
      }
    } catch { if (current === version.current) setError('Não foi possível concluir a operação. Aguarde e tente novamente.'); }
    finally { if (current === version.current) { flight.current = false; setBusy(false); } }
  }
  async function open() {
    if (flight.current || blocked) return;
    setOpened(true);
    // Provisioning is idempotent; open retrieves the existing instance and its current state.
    await run('prepare');
  }
  if (blocked) return <Alert tone="warning">A sessão ou empresa mudou. Abra novamente a configuração de WhatsApp.</Alert>;
  return <Card className="evolution-settings"><h2>WhatsApp — Evolution API</h2><p>{scope === 'GLOBAL' ? 'Comunicação do Kalend · GLOBAL' : 'Comunicação da empresa'}</p>
    {!opened ? <><p>{scope === 'GLOBAL' ? 'Conecte o WhatsApp do Kalend para comunicações do sistema.' : 'Conecte o WhatsApp da sua empresa.'}</p><Button onClick={() => void open()}>Configurar</Button></> : <>
      <EvolutionView row={row} busy={busy} now={now} numberMode={numberMode} failed={!!error} />
      {row?.status !== 'CONNECTED' && <>
        <div className="k-actions"><Button disabled={busy} onClick={() => void run(row?.status === 'ERROR' || row?.status === 'PENDING' ? 'prepare' : 'connect')}>{row?.status === 'ERROR' ? 'Tentar novamente' : 'Conectar usando QR Code'}</Button>
          {row?.status === 'DISCONNECTED' && <Button variant="secondary" disabled={busy} onClick={() => void run('reconnect')}>Reconectar</Button>}</div>
        <p>Como deseja conectar?</p>
        {row?.pairingSupported !== false && <Button variant="secondary" disabled={busy} onClick={() => setNumberMode(true)}>Conectar usando número de telefone</Button>}
        {numberMode && <><h3>Conectar usando número de telefone</h3><form onSubmit={e => { e.preventDefault(); try { normalizeEvolutionPhone(phone); void run('pairing-code'); } catch { setError('Informe um número válido com DDI.'); } }}><label>Número do WhatsApp<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 (__) _____-____" required maxLength={32} value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} /></label><Button type="submit" disabled={busy} loading={busy}>Gerar código</Button></form><div className="k-actions">{row?.pairingCode && <Button disabled={busy || !phone} onClick={() => void run('pairing-code')}>Gerar novo código</Button>}<Button variant="secondary" disabled={busy} onClick={() => void run('connect')}>Voltar para QR Code</Button></div></>}
      </>}
      <div className="k-actions"><Button variant="secondary" disabled={busy} onClick={() => void load()}>Atualizar estado</Button>
        {row?.status === 'CONNECTED' && <Button variant="secondary" disabled={busy} onClick={() => void run('logout')}>Desconectar WhatsApp</Button>}
        <Button variant="danger" disabled={busy} onClick={() => void run('remove')}>Excluir conexão</Button>
        <Button variant="ghost" disabled={busy} onClick={() => { version.current++; controller.current?.abort(); flight.current = false; setOpened(false); setRow(null); setPhone(''); setNumberMode(false); }}>Fechar</Button></div>
      {busy && <p role="status">Atualizando conexão...</p>}{error && <Alert tone="danger">{error}</Alert>}
    </>}
  </Card>;
}
