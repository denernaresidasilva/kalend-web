"use client";
import { useEffect, useState } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
type Config = {
  enabled: boolean;
  name: string;
  welcome: string;
  tone: string;
  businessInfo: string;
  schedule: Array<{ weekday: number; startMinute: number; endMinute: number }>;
  humanHandoff: boolean;
  maxMessagesPerDay: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostCents: number;
  historyEnabled: boolean;
  retentionDays: number;
};
type Settings = {
  settings: Config | null;
  provider: { id: string; configured: boolean; status: string };
  entitled: boolean;
  remoteHomologated: boolean;
};
type Dashboard = {
  conversationsStarted: number | null;
  conversationsTransferred: number | null;
  bookingsConfirmed: number | null;
  requestsGenerated: number | null;
  usage: Array<{
    provider: string;
    tool: string;
    status: string;
    _count: number;
    _sum: {
      inputTokens: number | null;
      outputTokens: number | null;
      estimatedCostCents: number | null;
      reservedCents: number | null;
    };
  }>;
};
export function AssistantSettings({
  companyId,
  userId,
}: {
  companyId: string;
  userId: string;
}) {
  const [data, setData] = useState<Settings | null>(null),
    [dash, setDash] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [catalog, setCatalog] = useState<
      Array<{ id: string; name: string; priceCents: number }>
    >([]);
  useEffect(() => {
    let live = true;
    void Promise.all([
      tenantApi<Settings>(companyId, "/assistant/settings", undefined, userId),
      tenantApi<Dashboard>(
        companyId,
        "/assistant/dashboard",
        undefined,
        userId,
      ),
    ])
      .then(([s, d]) => {
        if (live) {
          setData(s);
          setDash(d);
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível ler o assistente.",
          );
      });
    return () => {
      live = false;
    };
  }, [companyId, userId]);
  async function probe() {
    setBusy(true);
    setError("");
    try {
      const result = await tenantApi<{ services: typeof catalog }>(
        companyId,
        "/assistant/tools",
        { method: "POST", ...jsonBody({ tool: "catalog", arguments: {} }) },
        userId,
      );
      setCatalog(result.services);
      setDash(
        await tenantApi(companyId, "/assistant/dashboard", undefined, userId),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Falha ao verificar as ferramentas.",
      );
    } finally {
      setBusy(false);
    }
  }
  const settings = data?.settings;
  return (
    <section className="k-ops-page k-ai-settings">
      {error && <Alert tone="danger">{error}</Alert>}
      {data && (
        <>
          <Card>
            <h2>Assistente no WhatsApp</h2>
            <p>
              {data.provider.configured
                ? "Provedor configurado; homologação externa necessária."
                : "Integração remota pendente: nenhum provedor de IA está configurado. O assistente não está atendendo conversas no WhatsApp."}
            </p>
            <p>
              As ferramentas locais consultam dados reais do estabelecimento. A
              IA não pode criar pagamentos, confirmar horários por conta própria
              ou executar SQL. Pedidos privados exigem autenticação do próprio
              cliente.
            </p>
            {!data.entitled && (
              <Alert tone="warning">
                O plano atual não inclui o módulo de IA. A disponibilidade do
                módulo é definida pelo Super Admin; nenhum preço ou direito será
                alterado automaticamente.
              </Alert>
            )}
          </Card>
          {data.entitled && (
            <Card>
              <form
                className="k-ops-form"
                key={JSON.stringify(settings)}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget),
                    minute = (v: FormDataEntryValue | null) => {
                      const [h, m] = String(v).split(":").map(Number);
                      return h * 60 + m;
                    };
                  setBusy(true);
                  setError("");
                  try {
                    await tenantApi(
                      companyId,
                      "/assistant/settings",
                      {
                        method: "POST",
                        ...jsonBody({
                          enabled: f.get("enabled") === "on",
                          name: f.get("name"),
                          welcome: f.get("welcome"),
                          tone: f.get("tone"),
                          businessInfo: f.get("info"),
                          schedule: f
                            .getAll("weekday")
                            .map((d) => ({
                              weekday: Number(d),
                              startMinute: minute(f.get("start")),
                              endMinute: minute(f.get("end")),
                            })),
                          humanHandoff: f.get("handoff") === "on",
                          maxMessagesPerDay: Number(f.get("messages")),
                          maxInputTokens: Number(f.get("input")),
                          maxOutputTokens: Number(f.get("output")),
                          maxEstimatedCostCents: Math.round(
                            Number(f.get("cost")) * 100,
                          ),
                          historyEnabled: f.get("history") === "on",
                          retentionDays: Number(f.get("retention")),
                        }),
                      },
                      userId,
                    );
                    setData(
                      await tenantApi(
                        companyId,
                        "/assistant/settings",
                        undefined,
                        userId,
                      ),
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Falha ao salvar.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="k-ops-days">
                  <label>
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={settings?.enabled ?? false}
                      disabled={!data.provider.configured}
                    />
                    Ativar assistente quando o provedor estiver disponível
                  </label>
                </div>
                <label>
                  Nome do assistente
                  <input
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={settings?.name ?? "Assistente"}
                  />
                </label>
                <label>
                  Tom
                  <select
                    name="tone"
                    defaultValue={settings?.tone ?? "NEUTRAL"}
                  >
                    <option value="NEUTRAL">Neutro</option>
                    <option value="FRIENDLY">Acolhedor</option>
                    <option value="FORMAL">Formal</option>
                  </select>
                </label>
                <label>
                  Boas-vindas
                  <textarea
                    name="welcome"
                    required
                    maxLength={1000}
                    defaultValue={
                      settings?.welcome ??
                      "Olá! Posso ajudar a consultar serviços e horários. Peça atendimento humano quando preferir."
                    }
                  />
                </label>
                <label>
                  Informações e políticas cadastradas pelo estabelecimento
                  <textarea
                    name="info"
                    maxLength={3000}
                    defaultValue={settings?.businessInfo ?? ""}
                  />
                </label>
                <fieldset>
                  <legend>
                    Horário do assistente no fuso do estabelecimento
                  </legend>
                  <p>
                    Sem dias selecionados: sem restrição de horário. A ativação
                    continua dependendo da integração remota.
                  </p>
                  <div className="k-ops-days">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      (day, i) => (
                        <label key={day}>
                          <input
                            type="checkbox"
                            name="weekday"
                            value={i}
                            defaultChecked={
                              settings?.schedule.some((w) => w.weekday === i) ??
                              false
                            }
                          />
                          {day}
                        </label>
                      ),
                    )}
                  </div>
                  <label>
                    Abertura do assistente
                    <input
                      name="start"
                      type="time"
                      required
                      defaultValue="08:00"
                    />
                  </label>
                  <label>
                    Encerramento do assistente
                    <input
                      name="end"
                      type="time"
                      required
                      defaultValue="18:00"
                    />
                  </label>
                </fieldset>
                <label>
                  Mensagens por 24 horas
                  <input
                    name="messages"
                    type="number"
                    min={1}
                    max={10000}
                    required
                    defaultValue={settings?.maxMessagesPerDay ?? 50}
                  />
                </label>
                <label>
                  Limite de tokens de entrada
                  <input
                    name="input"
                    type="number"
                    min={100}
                    max={8000}
                    required
                    defaultValue={settings?.maxInputTokens ?? 2000}
                  />
                </label>
                <label>
                  Limite de tokens de saída
                  <input
                    name="output"
                    type="number"
                    min={50}
                    max={1000}
                    required
                    defaultValue={settings?.maxOutputTokens ?? 300}
                  />
                </label>
                <label>
                  Limite mensal estimado (R$)
                  <input
                    name="cost"
                    type="number"
                    min={0.01}
                    max={10000}
                    step={0.01}
                    required
                    defaultValue={
                      (settings?.maxEstimatedCostCents ?? 1000) / 100
                    }
                  />
                </label>
                <label>
                  Retenção do histórico autorizado (dias)
                  <input
                    name="retention"
                    type="number"
                    min={1}
                    max={90}
                    required
                    defaultValue={settings?.retentionDays ?? 7}
                  />
                </label>
                <div className="k-ops-days">
                  <label>
                    <input
                      name="handoff"
                      type="checkbox"
                      defaultChecked={settings?.humanHandoff ?? true}
                    />
                    Permitir transferência para humano
                  </label>
                  <label>
                    <input
                      name="history"
                      type="checkbox"
                      defaultChecked={settings?.historyEnabled ?? false}
                    />
                    Solicitar histórico autorizado quando a integração estiver
                    disponível
                  </label>
                </div>
                <button className="k-button-primary" disabled={busy}>
                  Salvar configuração de IA
                </button>
              </form>
            </Card>
          )}
          <Card>
            <h2>Uso e verificações</h2>
            <p>
              Conversas iniciadas:{" "}
              {dash?.conversationsStarted ?? "Não disponível"} · Transferências:{" "}
              {dash?.conversationsTransferred ?? "Não disponível"} ·
              Agendamentos atribuíveis:{" "}
              {dash?.bookingsConfirmed ?? "Não disponível"} · Solicitações
              geradas: {dash?.requestsGenerated ?? "Não disponível"}
            </p>
            <p>
              Métricas de conversas e atribuição aguardam a integração.
              Verificação de ferramentas não representa conversa com IA ou
              mensagem enviada. Custo não informado não representa custo zero.
            </p>
            {data.entitled && (
              <button
                className="k-button-secondary"
                disabled={busy}
                onClick={() => void probe()}
              >
                Verificar catálogo real pela ferramenta
              </button>
            )}
            {catalog.map((s) => (
              <p key={s.id}>
                {s.name} ·{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(s.priceCents / 100)}
              </p>
            ))}
            {dash?.usage.map((u, i) => (
              <p key={i}>
                {u.provider === "TOOL_PROBE"
                  ? "Verificação local de ferramenta"
                  : u.provider}{" "}
                · {u.tool} · {u.status} · {u._count} registro(s) · custo
                estimado{" "}
                {u._sum.estimatedCostCents === null
                  ? "não mensurado"
                  : new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format((u._sum.estimatedCostCents ?? 0) / 100)}
              </p>
            ))}
          </Card>
        </>
      )}
    </section>
  );
}
