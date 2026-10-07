"use client";
import { EvolutionSettings } from "./evolution-settings";
import { EmailSettings } from "./email-settings";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { communication, providerNames, providerFields, secretFields, providerState, providerPatch, availableProvider, safeQr, type CommunicationProvider, type ProviderName, type Environment, type MetaTemplate } from "@/lib/communication";
import { date } from "@/lib/commercial";
import { useCommunicationMutation } from "./communication-operations";
import { Feedback, ResourceState, useCommunicationResource } from "./communication-resource";

export function ProviderCards({ providers, select }: { providers: CommunicationProvider[]; select?: (provider: ProviderName) => void }) {
  return <div className="gateway-grid">{(Object.keys(providerNames) as ProviderName[]).filter(name => name !== "GMAIL").map(name => {
    const row = providers.find(item => item.provider === name);
    return <section className="gateway-card" key={name}><h2>{providerNames[name]}</h2><p>{providerState(row)}</p>
      {row && <><div className="commercial-badges"><span>Credencial: {row.configured ? "salva" : "não configurada"}</span><span>{row.enabled ? "Habilitado" : "Desabilitado"}</span><span>{name !== "PUSH_PENDING" && name !== "EVOLUTION" && row.environment === "SANDBOX" ? "Sandbox" : "Produção"}</span></div><p>Adapter: {row.adapterAvailable ? "disponível" : "indisponível"}</p></>}
      {name === "PUSH_PENDING" && <Link href="/conta/notificacoes#preferencias">Gerenciar notificações e dispositivos</Link>}
      {select && availableProvider(name) && <button onClick={() => select(name)}>Configurar</button>}
    </section>;
  })}</div>;
}
function MetaTest({ choose }: { choose: (value: MetaTemplate | undefined) => void }) {
  const resource = useCommunicationResource(communication.metaTemplates);
  const rows = (resource.data ?? []).filter(row => row.status === "APPROVED" && row.components.length === 1 && row.components[0].type === "BODY" && typeof row.components[0].text === "string" && !/[{}]/.test(row.components[0].text));
  return <ResourceState {...resource} retry={() => void resource.load()}><label>Template Meta aprovado e sem parâmetros para o teste<select defaultValue="" onChange={e => choose(rows.find(row => row.id === e.target.value))}><option value="">Selecione</option>{rows.map(row => <option key={row.id} value={row.id}>{row.name} · {row.language}</option>)}</select></label>{!rows.length && <p>Nenhum template compatível. Sincronize os templates Meta.</p>}</ResourceState>;
}
export function ProviderEditor({ initial, name, close }: { initial?: CommunicationProvider; name: ProviderName; close: () => void; }) {
  const [row, setRow] = useState(initial);
  const [config, setConfig] = useState<Record<string, string>>({ ...(initial?.config ?? {}), ...(name === "SMTP" && !initial ? { port: "587", secure: "false" } : {}) });
  const [environment, setEnvironment] = useState<Environment>(initial?.environment ?? "SANDBOX");
  const [hasSecretInput, setHasSecretInput] = useState(false);
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [metaTest, setMetaTest] = useState<MetaTemplate>();
  const dirty = environment !== (row?.environment ?? "SANDBOX") || Object.entries(config).some(([key, value]) => value !== (row?.config[key] ?? "")) || hasSecretInput;
  async function run(action: "save" | "test" | "send-test" | "pair" | "enable", form?: HTMLFormElement) {
    if (lockRef.current || stale || (action !== "save" && dirty)) return;
    let body: ReturnType<typeof providerPatch> | undefined;
    if (action === "save") {
      if (!form) return;
      // Read secrets only at submission; their values never enter React state or props.
      const secrets = Object.fromEntries(secretFields[name].map(([key]) => [key, (form.elements.namedItem(key) as HTMLInputElement | null)?.value ?? ""]));
      try { body = providerPatch(name, config, secrets, environment); } catch (err) { setError((err as Error).message); return; }
      if (row && row.environment !== environment && !window.confirm("Trocar o ambiente? Novas credenciais serão necessárias e o canal será desabilitado. O backend pode recusar se houver histórico.")) return;
    }
    if (action === "enable" && !window.confirm(row?.enabled ? "Desabilitar envios globais neste canal?" : "Habilitar envios globais aos proprietários neste canal?")) return;
    if (form) {
      for (const [key] of secretFields[name]) { const input = form.elements.namedItem(key) as HTMLInputElement | null; if (input) input.value = ""; }
      setHasSecretInput(false);
    }
    lockRef.current = true; setBusy(true); setError(""); setMessage(""); setQr(null);
    try {
      if (action === "save") {
        const saved = await communication.patchProvider(name, body!); setRow(saved); setConfig(saved.config); setEnvironment(saved.environment); setMetaTest(undefined);
        setMessage("Configuração salva. Alterações exigem nova validação antes de habilitar o canal.");
      } else if (action === "test") {
        const result = await communication.test(name); setMessage(result.connected ? "Conexão validada. Este teste não comprova entrega nem homologação completa." : "A conexão falhou. Confira a configuração e as credenciais.");
      } else if (action === "send-test") {
        const result = await communication.sendTest(name, name === "META" && metaTest ? { id: metaTest.externalId, name: metaTest.name, language: metaTest.language, parameters: [] } : undefined);
        setMessage(result.accepted ? "Teste aceito pelo provedor para o administrador autenticado. Entrega não confirmada." : "O provedor não confirmou a aceitação.");
      } else if (action === "pair") {
        const result = await communication.pair();
        if (result.status === 'CONNECTED') setMessage("A Evolution informou que a instância já está conectada. Execute Testar conexão para validar a configuração no Kalend.");
        else if (result.qrCode) {
          const image = safeQr(result.qrCode);
          if (!image) throw new Error("QR Code inválido retornado pelo serviço.");
          setQr(image); setMessage("Escaneie o QR Code e depois teste a conexão. O pareamento não confirma conexão ou entrega.");
        } else { setQr(null); setMessage("Aguardando o QR Code da Evolution. Abra o painel WhatsApp para acompanhar a conexão."); }
      } else { setRow(await communication.patchProvider(name, { enabled: !row?.enabled })); setMessage("Estado do canal atualizado."); }
    } catch (err) { setError(err instanceof Error ? err.message : "Operação indisponível."); }
    finally {
      try { const latest = (await communication.providers()).find(item => item.provider === name); setRow(latest); }
      catch { setStale(true); setError("Não foi possível atualizar o estado do canal. Feche e recarregue os canais antes de continuar."); }
      lockRef.current = false; setBusy(false);
    }
  }
  function save(event: FormEvent) { event.preventDefault(); void run("save", event.currentTarget as HTMLFormElement); }
  return <section className="commercial-panel"><div className="commercial-heading"><h2>{providerNames[name]}</h2><button disabled={busy} onClick={close}>Voltar à configuração</button></div>
    <div className="commercial-badges"><span>{providerState(row)}</span><span>{row?.enabled ? "Habilitado" : "Desabilitado"}</span></div>
    <dl className="commercial-details"><div><dt>Credencial</dt><dd>{row?.configured ? "Credencial salva (não recuperável)" : "Não configurada"}</dd></div><div><dt>Última verificação</dt><dd>{date(row?.lastVerifiedAt ?? null)}</dd></div><div><dt>Último envio aceito</dt><dd>{date(row?.lastSentAt ?? null)}</dd></div></dl>
    {name !== "EVOLUTION" && <form className="commercial-form" onSubmit={save} autoComplete="off"><fieldset disabled={busy || stale}>
      {name === "PUSH_PENDING" ? <div className="commercial-badges"><span>Produção</span></div> : <label>Ambiente<select value={environment} onChange={e => { setQr(null); setMetaTest(undefined); setEnvironment(e.target.value as Environment); }}><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Produção</option></select></label>}
      <div className="communication-form-grid">{providerFields[name].map(([key, label]) => <label key={key}>{label}<input required={key !== "replyTo"} maxLength={500} type={key === "fromEmail" || key === "replyTo" ? "email" : "text"} value={config[key] ?? ""} onChange={e => { setQr(null); setConfig({ ...config, [key]: e.target.value }); }} /></label>)}</div>
      {name === "SMTP" && <><label>Porta e TLS<select value={config.port ?? "587"} onChange={e => setConfig({ ...config, port: e.target.value, secure: e.target.value === "465" ? "true" : "false" })}><option value="587">587 · STARTTLS obrigatório (secure: false)</option><option value="465">465 · TLS (secure: true)</option></select></label><p>smtp.gmail.com não é permitido. Gmail exige OAuth, ainda indisponível neste módulo.</p></>}
      <div className="communication-form-grid">{secretFields[name].map(([key, label]) => <label key={key}>{label}<input type="password" autoComplete="new-password" maxLength={16384} name={key} onChange={e => { setQr(null); const form = e.currentTarget.form; setHasSecretInput(!!form && secretFields[name].some(([field]) => !!(form.elements.namedItem(field) as HTMLInputElement | null)?.value)); }} /></label>)}</div>
      <p>Secrets são somente de escrita. Campos vazios preservam os valores salvos no mesmo ambiente. A API informa apenas se há credencial armazenada, sem detalhar cada secret.</p>
      {name === "PUSH_PENDING" && <p>A chave privada é somente de escrita e fica cifrada no servidor. Testar conexão valida o par VAPID; para comprovar entrega, ative um dispositivo na central e use o teste administrativo deste canal. Trocar a chave exige novo registro dos navegadores.</p>}
      <button className="commercial-primary" disabled={!dirty}>Salvar configuração</button>
    </fieldset></form>}
    {name === "EVOLUTION" && <p>A instância e a credencial deste canal global são gerenciadas pelo servidor. Para conectar o WhatsApp de uma empresa, acesse <Link href="/conta/configuracoes/whatsapp">Configurações da empresa</Link>.</p>}
    {name === "META" && row?.configured && <div className="commercial-form"><MetaTest key={`${row.revision}:${row.environment}`} choose={setMetaTest} /></div>}
    <div className="commercial-actions"><button disabled={busy || stale || dirty || !row?.configured || !row.adapterAvailable} onClick={() => void run("test")}>Testar conexão</button>
      <button disabled={busy || stale || dirty || !row?.configured || !row.adapterAvailable || (name === "META" && !metaTest)} onClick={() => void run("send-test")}>Enviar teste para mim</button>
      {name === "EVOLUTION" && <button disabled={busy || stale || dirty || !row?.configured || !row.adapterAvailable} onClick={() => void run("pair")}>Parear / atualizar QR Code</button>}
      <button disabled={busy || stale || dirty || (!row?.enabled && (!row?.adapterAvailable || row.status !== "CONNECTED"))} onClick={() => void run("enable")}>{row?.enabled ? "Desabilitar canal" : "Habilitar canal"}</button>
    </div>{dirty && <p>Salve as alterações antes de executar ações.</p>}
    {qr && <div className="communication-qr">{ /* Backend returns an in-memory PNG data URI. */ }
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR Code de pareamento Evolution retornado pela API" /><button onClick={() => setQr(null)}>Ocultar QR Code</button></div>}
    <Feedback busy={busy} error={error} message={message} />
  </section>;
}
export function CommunicationProviders() {
  const resource = useCommunicationResource(communication.providers);
  const [selected, setSelected] = useState<ProviderName | null>(null);
  return <><button disabled={resource.loading || !!selected} onClick={() => void resource.load()}>Atualizar canais</button>
    {selected === "EVOLUTION" ? <><button onClick={() => { setSelected(null); void resource.load(); }}>Voltar à configuração</button><EvolutionSettings scope="GLOBAL" initiallyOpen onConnectionChange={() => void resource.load()} /><GlobalEvolutionSending /></> : selected === "SMTP" ? <><button onClick={() => setSelected(null)}>Voltar à configuração</button><EmailSettings scope="SYSTEM" /></> : selected ? <ProviderEditor key={selected} name={selected} initial={resource.data?.find(row => row.provider === selected)} close={() => { setSelected(null); void resource.load(); }} /> : <ResourceState {...resource} retry={() => void resource.load()}><ProviderCards providers={resource.data ?? []} select={setSelected} /></ResourceState>}
  </>;
}

export function GlobalEvolutionSending() {
  const resource = useCommunicationResource(communication.providers);
  const row = resource.data?.find(item => item.provider === "EVOLUTION");
  const { busy, setBusy, lockRef } = useCommunicationMutation();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testNumber, setTestNumber] = useState("");
  async function run(action: "test" | "send" | "toggle") {
    if (lockRef.current) return;
    if (action === "toggle" && !window.confirm(row?.enabled ? "Desabilitar as comunicações do Kalend neste canal?" : "Habilitar as comunicações do Kalend neste canal?")) return;
    lockRef.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (action === "test") {
        const result = await communication.test("EVOLUTION");
        setMessage(result.connected ? "WhatsApp conectado." : "WhatsApp desconectado.");
      } else if (action === "send") {
        const result = await communication.sendTest("EVOLUTION", undefined, testNumber.trim() || undefined);
        if (!result.accepted) throw new Error("O WhatsApp não confirmou a aceitação da mensagem.");
        setMessage("Mensagem de teste aceita pelo WhatsApp. Entrega não confirmada.");
      } else {
        await communication.patchProvider("EVOLUTION", { enabled: !row?.enabled });
        setMessage("Preferência de envio atualizada.");
      }
      await resource.load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível atualizar o envio global."); }
    finally { lockRef.current = false; setBusy(false); }
  }
  return <section className="commercial-panel"><h3>Comunicações do Kalend</h3><p>Este canal envia mensagens do sistema a seus proprietários e ao administrador. Não envia campanhas aos clientes das empresas.</p>
    <label>Número para teste (opcional, com DDI)<input type="tel" inputMode="tel" autoComplete="tel" maxLength={32} placeholder="+55 (11) 99999-9999" value={testNumber} disabled={busy} onChange={event => setTestNumber(event.target.value)} /></label><p>Informe seu próprio número se não houver telefone salvo no perfil. Este número será usado somente neste teste.</p>
    <p>{row?.enabled ? "Uso para comunicação: habilitado" : "Uso para comunicação: desabilitado"}</p><div className="commercial-actions">
      <button disabled={busy} onClick={() => void resource.load()}>Atualizar preferência de envio</button>
      <button disabled={busy} onClick={() => void run("test")}>Testar conexão</button>
      <button disabled={busy} onClick={() => void run("send")}>Enviar teste para mim</button>
      <button disabled={busy} onClick={() => void run("toggle")}>{row?.enabled ? "Desabilitar envio" : "Habilitar envio"}</button>
    </div><Feedback busy={busy} error={error} message={message} />
  </section>;
}
