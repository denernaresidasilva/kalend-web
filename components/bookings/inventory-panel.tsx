"use client";
import { useEffect, useRef, useState } from "react";
import { tenantApi, jsonBody } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { money } from "@/lib/money";
type Product = {
  id: string;
  name: string;
  priceCents: number;
  costCents: number;
  stockManaged: boolean;
  stockMilli: number;
  validMilli: number;
  minimumMilli: number;
  unit: string;
  location: string;
  barcode: string | null;
  categoryId: string | null;
};
type Dashboard = { timezone:string;
  entitled: boolean;
  summary: {
    totalProducts: number;
    costMilliCents: string;
    low: number;
    expiring: number;
  };
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  recipes: Array<{
    id: string;
    serviceId: string;
    productId: string;
    quantityMilli: number;
    product: { name: string; unit: string };
    service: { name: string };
  }>;
  lots: Array<{
    id: string;
    code: string;
    product: { name: string; unit: string };
    quantityMilli: number;
    unitCostCents: number;
    expiresAt: string | null;
  }>;
  movements: Array<{
    id: string;
    quantityMilli: number;
    costMilliCents: string;
    restorableMilli: number;
    operation: { type: string; reason: string; createdAt: string };
    lot: { code: string; product: { name: string; unit: string } };
  }>;
  serviceCosts: Array<{
    serviceId: string;
    name: string;
    costMilliCents: string;
  }>;
  topSold: Array<{
    productId: string;
    name: string;
    unit: string;
    quantityMilli: string;
  }>;
  dormant: Array<{
    id: string;
    name: string;
    unit: string;
    stockMilli: number;
  }>;
  truncated: boolean;
};
const qty = (m: number | string) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
      Number(m) / 1000,
    ),
  milli = (v: FormDataEntryValue | null) => Math.round(Number(v) * 1000);
const labels: Record<string, string> = {
  ENTRY: "Entrada",
  INTERNAL: "Consumo interno",
  ADJUST_IN: "Ajuste de entrada",
  ADJUST_OUT: "Ajuste de saída",
  LOSS: "Perda",
  INVENTORY: "Inventário físico",
  RETURN: "Devolução física",
  SALE_FINALIZED: "Comanda finalizada",
};
export function InventoryPanel(props: {
  companyId: string;
  userId: string;
  manager?: boolean;
  revision?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <details
        className="k-package-settings"
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary>Estoque e materiais</summary>
        {open && (
          <InventoryContent
            key={`${props.companyId}:${props.userId}`}
            {...props}
          />
        )}
      </details>
    </Card>
  );
}
function InventoryContent({
  companyId,
  userId,
  manager = false,
  revision = 0,
}: {
  companyId: string;
  userId: string;
  manager?: boolean;
  revision?: number;
}) {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [productId, setProductId] = useState(""),
    [moveType, setMoveType] = useState("ENTRY"),
    [serviceId, setServiceId] = useState(""),
    [recipe, setRecipe] = useState<
      Array<{ productId: string; quantityMilli: number }>
    >([]);
  const keys = useRef(new Map<string, string>());
  useEffect(() => {
    let live = true;
    void tenantApi<Dashboard>(
      companyId,
      "/operations/inventory",
      undefined,
      userId,
    )
      .then((r) => {
        if (live) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar estoque.",
          );
      });
    return () => {
      live = false;
    };
  }, [companyId, userId, revision, refresh]);
  async function save(
    path: string,
    body: Record<string, unknown>,
    idempotent = false,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    const signature = JSON.stringify({ path, body });
    if (idempotent && !keys.current.has(signature))
      keys.current.set(signature, crypto.randomUUID());
    try {
      await tenantApi(
        companyId,
        "/operations/" + path,
        {
          method: "POST",
          ...jsonBody({
            ...body,
            ...(idempotent
              ? { idempotencyKey: keys.current.get(signature) }
              : {}),
          }),
        },
        userId,
      );
      keys.current.delete(signature);
      setRefresh((n) => n + 1);
      setNotice("Operação de estoque registrada.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível registrar o estoque.",
      );
    } finally {
      setBusy(false);
    }
  }
  const product = data?.products.find((p) => p.id === productId),
    editable = manager && data?.entitled;
  return (
    <>
      {error && <Alert tone="danger">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!data ? (
        <p role="status">Carregando estoque…</p>
      ) : (
        <>
          <p>
            Baixa automática na finalização da comanda. Lotes válidos com
            vencimento mais próximo são consumidos primeiro. Estornos
            financeiros não devolvem material: registre a devolução física
            conferida, com motivo.
          </p>
          {!data.entitled && (
            <Alert tone="warning">
              Seu plano não inclui novas operações de estoque. O histórico
              permanece disponível.
            </Alert>
          )}
          <div className="k-grid">
            <Card>
              Produtos controlados<strong>{data.summary.totalProducts}</strong>
            </Card>
            <Card>
              Custo do estoque físico
              <strong>
                {money(Number(data.summary.costMilliCents) / 1000)}
              </strong>
              <small>
                Inclui lotes vencidos; valor de custo, sem estimar lucro.
              </small>
            </Card>
            <Card>
              Abaixo ou no mínimo de saldo válido
              <strong>{data.summary.low}</strong>
            </Card>
            <Card>
              Lotes vencidos ou a vencer em 30 dias
              <strong>{data.summary.expiring}</strong>
            </Card>
          </div>
          {data.truncated && (
            <p>
              Listagens limitadas a 500 produtos/lotes, 200 movimentos e 1.000
              materiais. Os indicadores são calculados sobre todo o estoque.
            </p>
          )}
          {editable && (
            <>
              <details>
                <summary>Categorias e fornecedores</summary>
                <form
                  className="k-ops-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void save("inventory/references", {
                      type: f.get("type"),
                      name: f.get("name"),
                      ...(f.get("contact")
                        ? { contact: f.get("contact") }
                        : {}),
                    });
                  }}
                >
                  <label>
                    Tipo de cadastro
                    <select name="type">
                      <option value="CATEGORY">Categoria</option>
                      <option value="SUPPLIER">Fornecedor</option>
                    </select>
                  </label>
                  <label>
                    Nome do cadastro
                    <input name="name" required maxLength={120} />
                  </label>
                  <label>
                    Contato do fornecedor
                    <input name="contact" maxLength={300} />
                  </label>
                  <button className="k-button-secondary" disabled={busy}>
                    Salvar categoria ou fornecedor
                  </button>
                </form>
              </details>
              <details>
                <summary>Configurar produto do estoque</summary>
                <p>
                  Cadastre o produto em “Produtos e cupons” no PDV. Ative o
                  estoque explicitamente e registre a entrada/contagem inicial.
                  A unidade de medida fica preservada após o primeiro lote.
                </p>
                <label>
                  Produto a configurar
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {data.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {product && (
                  <form
                    key={product.id + ":" + refresh}
                    className="k-ops-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void save(`inventory/products/${product.id}`, {
                        stockManaged: f.get("managed") === "on",
                        minimumMilli: milli(f.get("minimum")),
                        costCents: Math.round(Number(f.get("cost")) * 100),
                        priceCents: Math.round(Number(f.get("price")) * 100),
                        unit: f.get("unit"),
                        location: f.get("location") || undefined,
                        barcode: f.get("barcode") || undefined,
                        categoryId: f.get("category") || undefined,
                        reason: f.get("reason"),
                      });
                    }}
                  >
                    <div className="k-ops-days">
                      <label>
                        <input
                          name="managed"
                          type="checkbox"
                          defaultChecked={product.stockManaged}
                        />
                        Controlar estoque físico
                      </label>
                    </div>
                    <label>
                      Unidade de medida
                      <input
                        name="unit"
                        required
                        maxLength={16}
                        defaultValue={product.unit}
                      />
                    </label>
                    <label>
                      Estoque mínimo (unidade cadastrada)
                      <input
                        name="minimum"
                        type="number"
                        min={0}
                        max={1000000}
                        step={0.001}
                        required
                        defaultValue={product.minimumMilli / 1000}
                      />
                    </label>
                    <label>
                      Custo padrão por unidade (R$)
                      <input
                        name="cost"
                        type="number"
                        min={0}
                        max={1000000}
                        step={0.01}
                        required
                        defaultValue={product.costCents / 100}
                      />
                    </label>
                    <label>
                      Preço de venda por unidade (R$)
                      <input
                        name="price"
                        type="number"
                        min={0}
                        max={1000000}
                        step={0.01}
                        required
                        defaultValue={product.priceCents / 100}
                      />
                    </label>
                    <label>
                      Localização
                      <input
                        name="location"
                        maxLength={160}
                        defaultValue={product.location}
                      />
                    </label>
                    <label>
                      Código de barras
                      <input
                        name="barcode"
                        maxLength={80}
                        defaultValue={product.barcode ?? ""}
                      />
                    </label>
                    <label>
                      Categoria do produto
                      <select
                        name="category"
                        defaultValue={product.categoryId ?? ""}
                      >
                        <option value="">Sem categoria</option>
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Motivo da configuração
                      <input name="reason" required maxLength={1000} />
                    </label>
                    <button className="k-button-primary" disabled={busy}>
                      Salvar controle do produto
                    </button>
                  </form>
                )}
              </details>
              <details>
                <summary>Registrar movimentação física</summary>
                <form
                  className="k-ops-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void save(
                      "inventory/movements",
                      {
                        productId: f.get("product"),
                        type: moveType,
                        ...(moveType === "INVENTORY"
                          ? { countedMilli: milli(f.get("quantity")) }
                          : { quantityMilli: milli(f.get("quantity")) }),
                        ...(["ENTRY", "ADJUST_IN", "INVENTORY"].includes(
                          moveType,
                        )
                          ? {
                              ...(f.get("cost")
                                ? {
                                    unitCostCents: Math.round(
                                      Number(f.get("cost")) * 100,
                                    ),
                                  }
                                : {}),
                              supplierId: f.get("supplier") || undefined,
                              lotCode: f.get("lot") || undefined,
                              expiresOn: f.get("expiry") || undefined,
                            }
                          : {}),
                        reason: f.get("reason"),
                      },
                      true,
                    );
                  }}
                >
                  <label>
                    Produto da movimentação
                    <select name="product" required defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      {data.products
                        .filter((p) => p.stockManaged)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.unit}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Tipo de movimentação
                    <select
                      value={moveType}
                      onChange={(e) => setMoveType(e.target.value)}
                    >
                      {Object.entries(labels)
                        .filter(
                          ([k]) => !["RETURN", "SALE_FINALIZED"].includes(k),
                        )
                        .map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {moveType === "INVENTORY"
                      ? "Quantidade total contada"
                      : "Quantidade da movimentação"}
                    <input
                      name="quantity"
                      type="number"
                      min={moveType === "INVENTORY" ? 0 : 0.001}
                      max={1000000}
                      step={0.001}
                      required
                    />
                  </label>
                  {["ENTRY", "ADJUST_IN", "INVENTORY"].includes(moveType) && (
                    <>
                      <p>
                        Para entradas positivas, informe os dados do lote. Sem
                        custo informado, vale o custo padrão do produto.
                        Inventário compara a contagem com o saldo físico;
                        diferenças são registradas.
                      </p>
                      <label>
                        Custo por unidade do lote (R$)
                        <input
                          name="cost"
                          type="number"
                          min={0}
                          max={1000000}
                          step={0.01}
                        />
                      </label>
                      <label>
                        Fornecedor do lote
                        <select name="supplier" defaultValue="">
                          <option value="">Não informado</option>
                          {data.suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Código do lote
                        <input name="lot" maxLength={100} />
                      </label>
                      <label>
                        Validade do lote
                        <input name="expiry" type="date" />
                      </label>
                    </>
                  )}
                  <label>
                    Motivo da movimentação
                    <input name="reason" required maxLength={1000} />
                  </label>
                  <button className="k-button-primary" disabled={busy}>
                    Registrar movimento de estoque
                  </button>
                </form>
              </details>
              <details>
                <summary>Materiais utilizados por serviço</summary>
                <label>
                  Serviço a configurar
                  <select
                    value={serviceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setServiceId(id);
                      setRecipe(
                        data.recipes
                          .filter((r) => r.serviceId === id)
                          .map((r) => ({
                            productId: r.productId,
                            quantityMilli: r.quantityMilli,
                          })),
                      );
                    }}
                  >
                    <option value="">Selecione</option>
                    {data.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {serviceId && (
                  <form
                    className="k-ops-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save(`inventory/services/${serviceId}/materials`, {
                        materials: recipe,
                        reason: new FormData(e.currentTarget).get("reason"),
                      });
                    }}
                  >
                    {recipe.map((r, i) => (
                      <fieldset key={i}>
                        <legend>Material {i + 1}</legend>
                        <label>
                          Produto do material
                          <select
                            value={r.productId}
                            required
                            onChange={(e) =>
                              setRecipe(
                                recipe.map((v, n) =>
                                  n === i
                                    ? { ...v, productId: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          >
                            <option value="" disabled>
                              Selecione
                            </option>
                            {data.products
                              .filter((p) => p.stockManaged)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} · {p.unit}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Quantidade por atendimento
                          <input
                            type="number"
                            min={0.001}
                            max={100000}
                            step={0.001}
                            required
                            value={r.quantityMilli / 1000}
                            onChange={(e) =>
                              setRecipe(
                                recipe.map((v, n) =>
                                  n === i
                                    ? {
                                        ...v,
                                        quantityMilli: Math.round(
                                          Number(e.target.value) * 1000,
                                        ),
                                      }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="k-button-secondary"
                          onClick={() =>
                            setRecipe(recipe.filter((_, n) => n !== i))
                          }
                        >
                          Remover material {i + 1}
                        </button>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      className="k-button-secondary"
                      disabled={recipe.length >= 30}
                      onClick={() =>
                        setRecipe([
                          ...recipe,
                          { productId: "", quantityMilli: 1000 },
                        ])
                      }
                    >
                      Adicionar material ao serviço
                    </button>
                    <label>
                      Motivo da alteração dos materiais
                      <input name="reason" required maxLength={1000} />
                    </label>
                    <button className="k-button-primary" disabled={busy}>
                      Salvar materiais do serviço
                    </button>
                  </form>
                )}
              </details>
            </>
          )}
          <details open>
            <summary>Saldos por produto</summary>
            {data.products
              .filter((p) => p.stockManaged)
              .map((p) => (
                <article
                  className="k-package-wallet"
                  key={p.id}
                  data-stock-product-id={p.id}
                >
                  <h3>{p.name}</h3>
                  <p>
                    Saldo físico: {qty(p.stockMilli)} {p.unit} · saldo válido
                    para uso: {qty(p.validMilli)} {p.unit} · mínimo:{" "}
                    {qty(p.minimumMilli)} {p.unit}.
                  </p>
                  {p.validMilli <= p.minimumMilli && (
                    <p>
                      Estoque válido no mínimo ou abaixo: confira reposição.
                    </p>
                  )}
                  <p>
                    {p.location} · custo padrão {money(p.costCents)} · preço de
                    venda {money(p.priceCents)}.
                  </p>
                </article>
              ))}
          </details>
          <details>
            <summary>Lotes e vencimentos</summary>
            {data.lots.map((l) => (
              <p key={l.id}>
                {l.product.name} · lote {l.code} · {qty(l.quantityMilli)}{" "}
                {l.product.unit} · custo/unidade {money(l.unitCostCents)} ·{" "}
                {l.expiresAt
                  ? "limite de uso " +
                    new Intl.DateTimeFormat("pt-BR",{timeZone:data.timezone,dateStyle:"medium",timeStyle:"short"}).format(new Date(l.expiresAt))
                  : "sem validade informada"}
                {l.expiresAt && new Date(l.expiresAt) <= new Date()
                  ? " · vencido, bloqueado para consumo"
                  : ""}
              </p>
            ))}
          </details>
          <details>
            <summary>Histórico de estoque e devoluções</summary>
            {data.movements.map((m) => (
              <article className="k-package-wallet" key={m.id}>
                <h3>
                  {m.lot.product.name} ·{" "}
                  {labels[m.operation.type] ?? m.operation.type}
                </h3>
                <p>
                  {new Intl.DateTimeFormat("pt-BR",{timeZone:data.timezone,dateStyle:"short",timeStyle:"short"}).format(new Date(m.operation.createdAt))} · {qty(m.quantityMilli)} {m.lot.product.unit} · lote{" "}
                  {m.lot.code} · {m.operation.reason}
                </p>
                {editable && m.restorableMilli > 0 && (
                  <form
                    className="k-ops-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void save(
                        `inventory/movements/${m.id}/restore`,
                        {
                          quantityMilli: milli(f.get("quantity")),
                          reason: f.get("reason"),
                        },
                        true,
                      );
                    }}
                  >
                    <p>
                      Devolva somente material fisicamente recebido. Validade e
                      custo do lote serão preservados.
                    </p>
                    <label>
                      Quantidade devolvida
                      <input
                        name="quantity"
                        type="number"
                        min={0.001}
                        max={m.restorableMilli / 1000}
                        step={0.001}
                        required
                      />
                    </label>
                    <label>
                      Motivo da devolução física
                      <input name="reason" required maxLength={1000} />
                    </label>
                    <button className="k-button-secondary" disabled={busy}>
                      Registrar devolução física
                    </button>
                  </form>
                )}
              </article>
            ))}
          </details>
          <details>
            <summary>Consumo e custo por serviço</summary>
            <p>
              Custos de material efetivamente movimentado, descontadas
              devoluções físicas. Não representam lucro líquido. Até 100
              serviços, histórico completo.
            </p>
            {data.serviceCosts.map((s) => (
              <p key={s.serviceId}>
                {s.name}: {money(Number(s.costMilliCents) / 1000)}
              </p>
            ))}
          </details>
          <details>
            <summary>Produtos mais vendidos</summary>
            {data.topSold.map((p) => (
              <p key={p.productId}>
                {p.name}: {qty(p.quantityMilli)} {p.unit}
              </p>
            ))}
          </details>
          <details>
            <summary>
              Produtos sem venda ou consumo de serviço em 30 dias
            </summary>
            {data.dormant.map((p) => (
              <p key={p.id}>
                {p.name}: {qty(p.stockMilli)} {p.unit}
              </p>
            ))}
          </details>
        </>
      )}
    </>
  );
}
