"use client";
import { useEffect, useState } from "react";
import { API_URL, tenantApi, jsonBody } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
type Settings = {
  enabled: boolean;
  leadMinutes: number;
  responseMinutes: number;
  reminderMinutes: number[];
  channels: string[];
  noResponseRule: string;
};
type Customer = { id: string; name: string };
type History = {
  counts: Record<string, number>;
  truncated: boolean;
  requests: Array<{
    id: string;
    status: string;
    items: Array<{
      id: string;
      serviceId: string;
      professionalId: string;
      serviceName: string;
      professional: { displayName: string };
    }>;
    confirmation: {
      response: string | null;
      events: Array<{ type: string; reason: string | null; createdAt: string }>;
    } | null;
  }>;
};
export function ConfirmationsPanel({
  companyId,
  userId,
  manager,
}: {
  companyId: string;
  userId: string;
  manager: boolean;
}) {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null),
    [customers, setCustomers] = useState<Customer[]>([]),
    [history, setHistory] = useState<History | null>(null),
    [selectedCustomer, setSelectedCustomer] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const slug =
    profile?.memberships.find((m) => m.company.id === companyId)?.company
      .slug ?? "";
  useEffect(() => {
    let live = true;
    void Promise.all([
      manager
        ? tenantApi<{ settings: Settings | null }>(
            companyId,
            "/booking/confirmations/settings",
            undefined,
            userId,
          )
        : null,
      tenantApi<Customer[]>(companyId, "/booking/customers", undefined, userId),
    ])
      .then(([s, c]) => {
        if (live) {
          setSettings(s?.settings ?? null);
          setCustomers(c);
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Falha ao consultar.");
      });
    return () => {
      live = false;
    };
  }, [companyId, userId, manager]);
  async function save(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await tenantApi(
        companyId,
        "/booking/confirmations/" + path,
        { method: "POST", ...jsonBody(body) },
        userId,
      );
      if (path === "settings") setSettings(r as Settings);
      if (path.startsWith("requests/") && selectedCustomer)
        setHistory(
          await tenantApi(
            companyId,
            `/booking/confirmations/customers/${selectedCustomer}/history`,
            undefined,
            userId,
          ),
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <details>
        <summary>Agenda · Confirmações e comparecimento</summary>
        {error && <Alert tone="danger">{error}</Alert>}
        {manager && (
          <>
            <p>
              O envio exige canais habilitados, cadastro ativado e
              consentimento. O padrão preserva o horário sem resposta.
              Cancelamento automático exige regra explícita, evidência de
              entrega e ausência de comanda ativa.
            </p>
            <form
              className="k-ops-form"
              key={JSON.stringify(settings)}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void save("settings", {
                  enabled: f.get("enabled") === "on",
                  leadMinutes: Number(f.get("lead")),
                  responseMinutes: Number(f.get("response")),
                  reminderMinutes: String(f.get("reminders")).trim()
                    ? String(f.get("reminders"))
                        .split(",")
                        .map((s) => Number(s.trim()))
                    : [],
                  channels: f.getAll("channel"),
                  noResponseRule: f.get("rule"),
                });
              }}
            >
              <div className="k-ops-days">
                <label>
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={settings?.enabled ?? false}
                  />
                  Ativar confirmações
                </label>
              </div>
              <label>
                Antecedência (minutos)
                <input
                  name="lead"
                  type="number"
                  min={5}
                  max={10080}
                  required
                  defaultValue={settings?.leadMinutes ?? 1440}
                />
              </label>
              <label>
                Prazo para responder (minutos)
                <input
                  name="response"
                  type="number"
                  min={5}
                  max={10080}
                  required
                  defaultValue={settings?.responseMinutes ?? 120}
                />
              </label>
              <label>
                Antecedências dos lembretes adicionais (minutos, separados por
                vírgula)
                <input
                  name="reminders"
                  defaultValue={settings?.reminderMinutes.join(",") ?? ""}
                />
              </label>
              <fieldset>
                <legend>Canais autorizados</legend>
                <div className="k-ops-days">
                  {[
                    ["EMAIL", "E-mail"],
                    ["WHATSAPP", "WhatsApp"],
                    ["PUSH", "Push"],
                  ].map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        name="channel"
                        value={value}
                        defaultChecked={
                          settings?.channels.includes(value) ?? value === "PUSH"
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Sem resposta
                <select
                  name="rule"
                  defaultValue={settings?.noResponseRule ?? "NONE"}
                >
                  <option value="NONE">Preservar agendamento</option>
                  <option value="NOTIFY_STAFF">
                    Preservar e avisar a equipe
                  </option>
                  <option value="CANCEL">
                    Cancelar somente com entrega comprovada e sem comanda ativa
                  </option>
                </select>
              </label>
              <button className="k-button-primary" disabled={busy}>
                Salvar confirmações
              </button>
            </form>
            <p>
              Ative também o evento “Confirme seu atendimento” nos templates
              operacionais.
            </p>
            <button
              className="k-button-secondary"
              disabled={busy}
              onClick={() => void save("run-due", {})}
            >
              Verificar confirmações agora
            </button>
          </>
        )}
        <h3>Histórico informativo do cliente</h3>
        <p>
          Registros podem ser revistos com justificativa. Estes indicadores não
          atribuem classificação nem restringem atendimento.
        </p>
        <label>
          Cliente do histórico
          <select
            defaultValue=""
            onChange={async (e) => {
              setSelectedCustomer(e.target.value);
              setBusy(true);
              setError("");
              try {
                setHistory(
                  await tenantApi(
                    companyId,
                    `/booking/confirmations/customers/${e.target.value}/history`,
                    undefined,
                    userId,
                  ),
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Falha ao consultar.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <option value="" disabled>
              Selecione
            </option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {history && (
          <>
            <div className="k-ops-days">
              {Object.entries({
                completed: "Atendimentos concluídos",
                cancelled: "Cancelamentos",
                noShows: "Não comparecimentos",
                confirmed: "Presenças confirmadas",
                rescheduleRequests: "Pedidos de reagendamento",
                rescheduled: "Reagendamentos efetivados",
              }).map(([key, label]) => (
                <p key={key}>
                  {label}: <strong>{history.counts[key]}</strong>
                </p>
              ))}
            </div>
            {history.truncated && (
              <p>Exibindo os 200 agendamentos mais recentes.</p>
            )}
            {history.requests.map((r) => (
              <article key={r.id}>
                <h4>Agendamento {r.id.slice(0, 8).toUpperCase()}</h4>
                {r.confirmation?.events.map((e, i) => (
                  <p key={i}>
                    {new Date(e.createdAt).toLocaleString("pt-BR")} ·{" "}
                    {
                      (
                        {
                          COMPLETED: "Atendimento concluído",
                          ATTENDED: "Comparecimento revisado",
                          NO_SHOW: "Não comparecimento registrado",
                          CANCELLED: "Cancelamento",
                          PRESENCE_CONFIRMED: "Presença confirmada",
                          RESCHEDULE_REQUESTED: "Reagendamento solicitado",
                          RESCHEDULED: "Reagendamento efetivado",
                          CANCELLATION_REQUESTED: "Cancelamento solicitado",
                        } as Record<string, string>
                      )[e.type]
                    }
                    {e.reason ? ` · ${e.reason}` : ""}
                  </p>
                ))}
                {r.status === "CONFIRMED" && slug && (
                  <ReschedulingForm
                    items={r.items}
                    slug={slug}
                    disabled={busy}
                    submit={(body) => save(`requests/${r.id}/reschedule`, body)}
                  />
                )}
                {r.status === "CONFIRMED" && (
                  <form
                    className="k-ops-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void save(`requests/${r.id}/review`, {
                        type: f.get("type"),
                        reason: f.get("reason"),
                        idempotencyKey: crypto.randomUUID(),
                      });
                    }}
                  >
                    <label>
                      Revisar comparecimento
                      <select name="type">
                        <option value="ATTENDED">Compareceu</option>
                        <option value="NO_SHOW">Não compareceu</option>
                      </select>
                    </label>
                    <label>
                      Justificativa
                      <input name="reason" required maxLength={1000} />
                    </label>
                    <button disabled={busy} className="k-button-secondary">
                      Registrar revisão
                    </button>
                  </form>
                )}
              </article>
            ))}
          </>
        )}
      </details>
    </Card>
  );
}

function ReschedulingForm({
  items,
  slug,
  disabled,
  submit,
}: {
  items: History["requests"][number]["items"];
  slug: string;
  disabled: boolean;
  submit: (body: unknown) => Promise<void>;
}) {
  const [slots, setSlots] = useState<
      Record<string, { timezone: string; slots: string[] }>
    >({}),
    [error, setError] = useState("");
  return (
    <details>
      <summary>Reagendar atendimento</summary>
      <p>
        Escolha datas e horários disponíveis. A mudança será validada e gravada
        integralmente; links de confirmação antigos serão invalidados.
      </p>
      {error && <Alert tone="danger">{error}</Alert>}
      <form
        className="k-ops-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit({
            idempotencyKey: crypto.randomUUID(),
            reason: f.get("reason"),
            items: items.map((i) => ({
              itemId: i.id,
              professionalId: i.professionalId,
              startsAt: f.get(i.id),
            })),
          });
        }}
      >
        {items.map((i) => (
          <fieldset key={i.id}>
            <legend>
              {i.serviceName} · {i.professional.displayName}
            </legend>
            <label>
              Nova data de {i.serviceName}
              <input
                type="date"
                required
                onChange={async (e) => {
                  setError("");
                  try {
                    const q = new URLSearchParams({
                      date: e.target.value,
                      serviceId: i.serviceId,
                      professionalId: i.professionalId,
                    });
                    const r = await fetch(
                      `${API_URL}/public/booking/${encodeURIComponent(slug)}/availability?${q}`,
                      { cache: "no-store" },
                    );
                    if (!r.ok)
                      throw Error("Não foi possível consultar os horários.");
                    const data = await r.json();
                    setSlots((old) => ({
                      ...old,
                      [i.id]: {
                        timezone: data.timezone,
                        slots:
                          data.professionals.find(
                            (p: { id: string }) => p.id === i.professionalId,
                          )?.slots ?? [],
                      },
                    }));
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Falha ao consultar.",
                    );
                  }
                }}
              />
            </label>
            <label>
              Novo horário de {i.serviceName}
              <select name={i.id} required defaultValue="">
                <option value="" disabled>
                  Selecione uma data e horário
                </option>
                {slots[i.id]?.slots.map((s) => (
                  <option key={s} value={s}>
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: slots[i.id].timezone,
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(s))}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ))}
        <label>
          Motivo do reagendamento
          <input name="reason" required maxLength={1000} />
        </label>
        <button disabled={disabled} className="k-button-secondary">
          Salvar novo agendamento
        </button>
      </form>
    </details>
  );
}
