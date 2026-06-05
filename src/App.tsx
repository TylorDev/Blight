import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Archive,
  Check,
  ChevronDown,
  CircleDollarSign,
  Factory,
  History,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AppTier,
  Category,
  FabricationTicketView,
  LeftoverCreditView,
  StockItemView
} from "../electron/types";

const categories: Category[] = ["TABLAS", "TELAS", "DIARIOS_VACIOS", "ARTEFACTOS"];
const tiers: AppTier[] = ["T5", "T6", "T7", "T8"];

const categoryLabels: Record<Category, string> = {
  TABLAS: "Tablas",
  TELAS: "Telas",
  DIARIOS_VACIOS: "Diarios Vacios",
  ARTEFACTOS: "Artefactos"
};

const recipeDiary: Record<AppTier, number> = {
  T5: 19,
  T6: 14,
  T7: 8,
  T8: 4
};
const staffQuantity = 6;
const craftingTaxBase = 10.08;
const craftingTaxMultipliers: Record<AppTier, number> = {
  T5: 1,
  T6: 1.0858,
  T7: 1.1578,
  T8: 1.2729
};
const recipeBase: Array<{ category: Category; quantity: number }> = [
  { category: "TABLAS", quantity: 73 },
  { category: "TELAS", quantity: 44 },
  { category: "ARTEFACTOS", quantity: 6 }
];

type FilterValue<T extends string> = T | "TODOS";

function App() {
  const [stock, setStock] = useState<StockItemView[]>([]);
  const [tickets, setTickets] = useState<FabricationTicketView[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<FilterValue<Category>>("TODOS");
  const [tierFilter, setTierFilter] = useState<FilterValue<AppTier>>("TODOS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const refresh = async () => {
    const [stockItems, ticketItems] = await Promise.all([
      window.blight.listStock(),
      window.blight.listTickets()
    ]);
    setStock(stockItems);
    setTickets(ticketItems);
  };

  useEffect(() => {
    refresh()
      .catch((currentError) => setError(currentError.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const categoryMatches = categoryFilter === "TODOS" || item.category === categoryFilter;
      const tierMatches = tierFilter === "TODOS" || item.tier === tierFilter;
      return categoryMatches && tierMatches;
    });
  }, [categoryFilter, stock, tierFilter]);

  const openTickets = tickets.filter((ticket) => ticket.status === "ABIERTO");
  const closedTickets = tickets.filter((ticket) => ticket.status === "CERRADO");
  const totals = useMemo(() => {
    return stock.reduce(
      (summary, item) => ({
        quantity: summary.quantity + item.quantity,
        total: summary.total + item.total
      }),
      { quantity: 0, total: 0 }
    );
  }, [stock]);

  if (loading) {
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <span>Cargando inventario</span>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Blight</p>
            <h1>Inventario y fabricacion</h1>
          </div>
          <div className="actions">
            <PurchaseDialog onSaved={refresh} />
            <BulkPurchaseDialog onSaved={refresh} />
            <ClearStockDialog onSaved={refresh} />
            <TicketDialog stock={stock} onSaved={refresh} />
          </div>
        </header>

        <section className="metrics">
          <Metric icon={<Archive />} label="Stock total" value={formatNumber(totals.quantity)} />
          <Metric icon={<CircleDollarSign />} label="Valor inventario" value={formatCurrency(totals.total)} />
          <Metric icon={<Factory />} label="Tickets abiertos" value={String(openTickets.length)} />
          <Metric icon={<History />} label="Fabricaciones" value={String(closedTickets.length)} />
        </section>

        {error ? <div className="notice danger">{error}</div> : null}
        {missing && missing.length > 0 ? (
          <div className="notice danger">
            Faltan materiales: {missing.join(", ")}
          </div>
        ) : null}

        <Tabs.Root defaultValue="stock" className="workspace">
          <Tabs.List className="tab-list">
            <Tabs.Trigger value="stock">Inventario</Tabs.Trigger>
            <Tabs.Trigger value="tickets">Tickets</Tabs.Trigger>
            <Tabs.Trigger value="history">Historial</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="stock" className="panel">
            <div className="panel-head">
              <div>
                <h2>Stock</h2>
                <span>{filteredStock.length} items</span>
              </div>
              <div className="filters">
                <SelectField
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as FilterValue<Category>)}
                  options={["TODOS", ...categories]}
                  labels={{ TODOS: "Todas", ...categoryLabels }}
                />
                <SelectField
                  value={tierFilter}
                  onValueChange={(value) => setTierFilter(value as FilterValue<AppTier>)}
                  options={["TODOS", ...tiers]}
                  labels={{ TODOS: "Todos", T5: "T5", T6: "T6", T7: "T7", T8: "T8" }}
                />
              </div>
            </div>
            <StockTable items={filteredStock} />
          </Tabs.Content>

          <Tabs.Content value="tickets" className="panel">
            <div className="panel-head">
              <div>
                <h2>Tickets abiertos</h2>
                <span>Cierre con validacion de stock</span>
              </div>
            </div>
            <div className="ticket-grid">
              {openTickets.length === 0 ? <EmptyState text="No hay tickets abiertos." /> : null}
              {openTickets.map((ticket) => (
                <article className="ticket-card" key={ticket.id}>
                  <div>
                    <strong>{ticket.tier}</strong>
                    <span>{formatDate(ticket.openedAt)}</span>
                  </div>
                  <TicketCosts ticket={ticket} compact />
                  <Recipe tier={ticket.tier} />
                  <CloseTicketDialog
                    ticket={ticket}
                    onSaved={refresh}
                    onMissing={(items) => setMissing(items)}
                    onError={(message) => setError(message)}
                  />
                </article>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="history" className="panel">
            <div className="panel-head">
              <div>
                <h2>Historial</h2>
                <span>{closedTickets.length} tickets cerrados</span>
              </div>
            </div>
            <HistoryTable tickets={closedTickets} />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </Tooltip.Provider>
  );
}

function ClearStockDialog({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = async () => {
    setSaving(true);
    setError(null);
    try {
      await window.blight.clearStock();
      await onSaved();
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo vaciar el stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button danger">
          <Trash2 />
          Vaciar Stock
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Vaciar Stock</Dialog.Title>
          <p className="modal-copy">Deja cantidades, totales y precios medios en cero. No borra historial ni tickets.</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <Dialog.Close asChild>
              <button className="button ghost" type="button">
                Cancelar
              </button>
            </Dialog.Close>
            <button className="button danger solid" type="button" onClick={clear} disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <Trash2 />}
              Vaciar
            </button>
          </div>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseTicketDialog({
  ticket,
  onSaved,
  onMissing,
  onError
}: {
  ticket: FabricationTicketView;
  onSaved: () => Promise<void>;
  onMissing: (items: string[]) => void;
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filledDiariesQuantity, setFilledDiariesQuantity] = useState("0");
  const [filledDiariesDiscount, setFilledDiariesDiscount] = useState("0");
  const [leftoverTablesQuantity, setLeftoverTablesQuantity] = useState("0");
  const [leftoverClothsQuantity, setLeftoverClothsQuantity] = useState("0");
  const [pendingCredits, setPendingCredits] = useState<LeftoverCreditView[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingCredits(true);
    window.blight
      .listPendingLeftoverCredits(ticket.tier)
      .then(setPendingCredits)
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar las sobras.")
      )
      .finally(() => setLoadingCredits(false));
  }, [open, ticket.tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    onError(null);
    onMissing([]);

    try {
      const result = await window.blight.closeTicket({
        ticketId: ticket.id,
        filledDiariesQuantity: Number(filledDiariesQuantity),
        filledDiariesDiscount: Number(filledDiariesDiscount),
        leftoverTablesQuantity: Number(leftoverTablesQuantity),
        leftoverClothsQuantity: Number(leftoverClothsQuantity)
      });

      if (!result.ok) {
        onMissing(
          (result.missing ?? []).map(
            (item) => `${categoryLabels[item.category]} ${item.tier} (${item.available}/${item.required})`
          )
        );
        return;
      }

      await onSaved();
      setOpen(false);
      setFilledDiariesQuantity("0");
      setFilledDiariesDiscount("0");
      setLeftoverTablesQuantity("0");
      setLeftoverClothsQuantity("0");
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "No se pudo cerrar el ticket.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const pendingTotal = pendingCredits.reduce((total, credit) => total + credit.value, 0);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Check />
          Cerrar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Cerrar ticket {ticket.tier}</Dialog.Title>
          <form onSubmit={submit} className="form">
            <div className="pending-box">
              <strong>Sobras pendientes</strong>
              {loadingCredits ? <span>Cargando...</span> : null}
              {!loadingCredits && pendingCredits.length === 0 ? <span>Sin sobras para aplicar.</span> : null}
              {!loadingCredits && pendingCredits.length > 0 ? (
                <>
                  <div className="consumption-list">
                    {pendingCredits.map((credit) => (
                      <span key={credit.id}>
                        {categoryLabels[credit.category]} {credit.quantity} · {formatCurrency(credit.value)}
                      </span>
                    ))}
                  </div>
                  <span>Total aplicado {formatCurrency(pendingTotal)}</span>
                </>
              ) : null}
            </div>
            <label className="field">
              Cantidad de diarios llenos
              <input
                value={filledDiariesQuantity}
                onChange={(event) => setFilledDiariesQuantity(event.target.value)}
                type="number"
                min="0"
              />
            </label>
            <label className="field">
              Descuento por diarios llenos
              <input
                value={filledDiariesDiscount}
                onChange={(event) => setFilledDiariesDiscount(event.target.value)}
                type="number"
                min="0"
              />
            </label>
            <label className="field">
              Cantidad de Tablas Sobrantes
              <input
                value={leftoverTablesQuantity}
                onChange={(event) => setLeftoverTablesQuantity(event.target.value)}
                type="number"
                min="0"
                max="73"
              />
            </label>
            <label className="field">
              Cantidad de Telas Sobrantes
              <input
                value={leftoverClothsQuantity}
                onChange={(event) => setLeftoverClothsQuantity(event.target.value)}
                type="number"
                min="0"
                max="44"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Check />}
                Cerrar
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type BulkPurchaseDraft = Record<Category, { quantity: string; total: string }>;

function BulkPurchaseDialog({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [draft, setDraft] = useState<BulkPurchaseDraft>(() => createEmptyBulkDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraft = (category: Category, field: "quantity" | "total", value: string) => {
    setDraft((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [field]: value
      }
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const purchases = [];

      for (const category of categories) {
        const row = draft[category];
        const quantityFilled = row.quantity.trim() !== "";
        const totalFilled = row.total.trim() !== "";

        if (!quantityFilled && !totalFilled) {
          continue;
        }

        if (quantityFilled !== totalFilled) {
          throw new Error(`Completa Cantidad y Total en ${categoryLabels[category]} ${tier}.`);
        }

        const quantity = Number(row.quantity);
        const total = Number(row.total);

        if (quantity <= 0 || total <= 0) {
          throw new Error(`Cantidad y Total deben ser mayores a cero en ${categoryLabels[category]} ${tier}.`);
        }

        purchases.push({ category, quantity, total });
      }

      if (purchases.length === 0) {
        throw new Error("No hay compras para registrar.");
      }

      await window.blight.createBulkPurchase({ tier, purchases });
      await onSaved();
      setDraft(createEmptyBulkDraft());
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button">
          <PackagePlus />
          Compra Masiva
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal bulk-modal">
          <Dialog.Title>Compra Masiva</Dialog.Title>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={{ T5: "T5", T6: "T6", T7: "T7", T8: "T8" }}
            />
            <div className="bulk-table">
              <div className="bulk-row bulk-head">
                <span>Item</span>
                <span>Cantidad</span>
                <span>Total</span>
              </div>
              {categories.map((category) => (
                <div className="bulk-row" key={category}>
                  <span>
                    {categoryLabels[category]} <b>{tier}</b>
                  </span>
                  <input
                    value={draft[category].quantity}
                    onChange={(event) => updateDraft(category, "quantity", event.target.value)}
                    type="number"
                    min="1"
                    placeholder="Sin cambio"
                  />
                  <input
                    value={draft[category].total}
                    onChange={(event) => updateDraft(category, "total", event.target.value)}
                    type="number"
                    min="1"
                    placeholder="Sin cambio"
                  />
                </div>
              ))}
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Check />}
                Guardar
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PurchaseDialog({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("TABLAS");
  const [tier, setTier] = useState<AppTier>("T5");
  const [quantity, setQuantity] = useState("1");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await window.blight.createPurchase({
        category,
        tier,
        quantity: Number(quantity),
        total: Number(total)
      });
      await onSaved();
      setOpen(false);
      setQuantity("1");
      setTotal("");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button">
          <Plus />
          Compra
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Registrar compra</Dialog.Title>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Categoria"
              value={category}
              onValueChange={(value) => setCategory(value as Category)}
              options={categories}
              labels={categoryLabels}
            />
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={{ T5: "T5", T6: "T6", T7: "T7", T8: "T8" }}
            />
            <label className="field">
              Cantidad
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="1" />
            </label>
            <label className="field">
              Precio total
              <input value={total} onChange={(event) => setTotal(event.target.value)} type="number" min="1" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Check />}
                Guardar
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TicketDialog({ stock, onSaved }: { stock: StockItemView[]; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [tax, setTax] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => calculateTicketPreview(stock, tier, Number(tax)), [stock, tax, tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await window.blight.createTicket({ tier, tax: Number(tax) });
      await onSaved();
      setTax("1");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Factory />
          Ticket
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Nuevo ticket</Dialog.Title>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={{ T5: "T5", T6: "T6", T7: "T7", T8: "T8" }}
            />
            <label className="field">
              Tax
              <input value={tax} onChange={(event) => setTax(event.target.value)} type="number" min="1" max="1000" />
            </label>
            <label className="field">
              Cantidad Bastones Total
              <input value="6" readOnly />
            </label>
            <Recipe tier={tier} />
            <TicketPreview preview={preview} />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Plus />}
                Crear
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TicketPreview({
  preview
}: {
  preview: ReturnType<typeof calculateTicketPreview>;
}) {
  return (
    <section className="ticket-preview">
      <div className="preview-head">
        <strong>Costo estimado</strong>
        <span>Stock actual</span>
      </div>
      <div className="preview-lines">
        {preview.materials.map((material) => (
          <div className="preview-line" key={material.category}>
            <span>
              {categoryLabels[material.category]} x {material.quantity}
            </span>
            <span>{formatCurrency(material.averageCost)}</span>
            <strong>{formatCurrency(material.subtotal)}</strong>
          </div>
        ))}
      </div>
      <div className="preview-totals">
        <span>Materiales {formatCurrency(preview.materialTotal)}</span>
        <span>Crafting Tax por unidad {formatCurrency(preview.craftingTaxUnit)}</span>
        <span>Crafting Tax total {formatCurrency(preview.craftingTaxTotal)}</span>
        <strong>Inversion Total {formatCurrency(preview.investmentTotal)}</strong>
        <strong>Precio promedio por baston {formatCurrency(preview.unitCost)}</strong>
      </div>
    </section>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  options,
  labels
}: {
  label?: string;
  value: T;
  onValueChange: (value: string) => void;
  options: T[];
  labels: Record<string, string>;
}) {
  return (
    <label className="field compact">
      {label ? <span>{label}</span> : null}
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className="select">
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item className="select-item" key={option} value={option}>
                  <Select.ItemText>{labels[option]}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function StockTable({ items }: { items: StockItemView[] }) {
  return (
    <div className="table">
      <div className="row head">
        <span>Categoria</span>
        <span>Tier</span>
        <span>Cantidad</span>
        <span>Total</span>
        <span>Precio medio</span>
      </div>
      {items.map((item) => (
        <div className="row" key={item.id}>
          <span>{categoryLabels[item.category]}</span>
          <span className="badge">{item.tier}</span>
          <span>{formatNumber(item.quantity)}</span>
          <span>{formatCurrency(item.total)}</span>
          <span>{formatCurrency(item.averageCost)}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryTable({ tickets }: { tickets: FabricationTicketView[] }) {
  if (tickets.length === 0) {
    return <EmptyState text="No hay fabricaciones cerradas." />;
  }

  return (
    <div className="history-list">
      {tickets.map((ticket) => (
        <article className="history-item" key={ticket.id}>
          <div className="history-title">
            <strong>{ticket.tier}</strong>
            <span>{ticket.closedAt ? formatDate(ticket.closedAt) : ""}</span>
          </div>
          <TicketCosts ticket={ticket} />
          <div className="consumption-list">
            {ticket.consumptions.map((item) => (
              <span key={item.id}>
                {categoryLabels[item.category]} {item.quantity} · {formatCurrency(item.discountedTotal)}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function TicketCosts({ ticket, compact = false }: { ticket: FabricationTicketView; compact?: boolean }) {
  return (
    <div className={compact ? "cost-grid compact" : "cost-grid"}>
      <span>Tax {formatCurrency(ticket.tax)}</span>
      <span>Crafting Tax {formatCurrency(ticket.craftingTax)}</span>
      <span>Bastones {ticket.staffQuantity}</span>
      {!compact ? <span>Materiales {formatCurrency(ticket.materialTotal)}</span> : null}
      {!compact ? <span>Diarios llenos {ticket.filledDiariesQuantity}</span> : null}
      {!compact ? <span>Descuento diarios {formatCurrency(ticket.filledDiariesDiscount)}</span> : null}
      {!compact ? <span>Sobras tablas {ticket.leftoverTablesQuantity} · {formatCurrency(ticket.leftoverTablesValue)}</span> : null}
      {!compact ? <span>Sobras telas {ticket.leftoverClothsQuantity} · {formatCurrency(ticket.leftoverClothsValue)}</span> : null}
      {!compact ? <span>Descuento sobras {formatCurrency(ticket.appliedLeftoverDiscount)}</span> : null}
      {!compact ? <span>Inversion Total {formatCurrency(ticket.investmentTotal)}</span> : null}
      {!compact ? <span>Precio de cada baston {formatCurrency(ticket.unitCost)}</span> : null}
    </div>
  );
}

function Recipe({ tier }: { tier: AppTier }) {
  return (
    <div className="recipe">
      <span>73 Tablas</span>
      <span>44 Telas</span>
      <span>6 Artefactos</span>
      <span>{recipeDiary[tier]} Diarios</span>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function createEmptyBulkDraft() {
  return Object.fromEntries(
    categories.map((category) => [category, { quantity: "", total: "" }])
  ) as BulkPurchaseDraft;
}

function calculateTicketPreview(stock: StockItemView[], tier: AppTier, rawTax: number) {
  const taxValue = Number.isFinite(rawTax) && rawTax > 0 ? rawTax : 0;
  const materials = [
    ...recipeBase,
    { category: "DIARIOS_VACIOS" as Category, quantity: recipeDiary[tier] }
  ].map((material) => {
    const stockItem = stock.find((item) => item.category === material.category && item.tier === tier);
    const averageCost = stockItem?.averageCost ?? 0;
    return {
      ...material,
      averageCost,
      subtotal: material.quantity * averageCost
    };
  });
  const materialTotal = materials.reduce((total, material) => total + material.subtotal, 0);
  const craftingTaxUnit = taxValue * craftingTaxBase * craftingTaxMultipliers[tier];
  const craftingTaxTotal = craftingTaxUnit * staffQuantity;
  const investmentTotal = materialTotal + craftingTaxTotal;

  return {
    materials,
    materialTotal,
    craftingTaxUnit,
    craftingTaxTotal,
    investmentTotal,
    unitCost: investmentTotal / staffQuantity
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default App;
