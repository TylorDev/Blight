import * as Dialog from "@radix-ui/react-dialog";
import { Check, CircleDollarSign, Loader2, ShieldAlert, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppTier, Category, PurchaseInvoiceLineView, PurchaseInvoiceView } from "../../../electron/types";
import {
  categories,
  categoryLabels,
  formatCurrency,
  formatDate,
  formatNumber,
  purchaseVendorLabels,
  tierLabels,
  tiers
} from "../../app-data";
import { EmergencyConfirmDialog } from "../../Components/EmergencyConfirmDialog";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../../number-format";
import { usePurchaseStore } from "../../stores/purchase-store";
import { useStockStore } from "../../stores/stock-store";
import "./BuyPage.scss";

export function BuyPage() {
  const invoices = usePurchaseStore((state) => state.invoices);
  const invoiceTotalInvestment = invoices.reduce((total, invoice) => total + invoice.total, 0);

  return (
    <div className="buy-page">
      <section className="buy-summary" aria-label="Resumen de compras">
        <article className="buy-summary__item">
          <span className="buy-summary__icon">
            <CircleDollarSign />
          </span>
          <span className="buy-summary__label">Total invertido</span>
          <strong className="buy-summary__value">{formatCurrency(invoiceTotalInvestment)}</strong>
          <small>{formatNumber(invoices.length)} facturas</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Facturas</h2>
            <span>{formatNumber(invoices.length)} compras registradas</span>
          </div>
        </div>
        <div className="invoice-list">
          {invoices.length === 0 ? (
            <div className="empty">No hay facturas registradas.</div>
          ) : (
            invoices.map((invoice) => <InvoiceDialog invoice={invoice} key={invoice.id} />)
          )}
        </div>
      </section>
    </div>
  );
}

function InvoiceDialog({ invoice }: { invoice: PurchaseInvoiceView }) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="invoice-item" type="button">
          <div>
            <strong>Factura {invoice.number}</strong>
            <span>
              {formatDate(invoice.createdAt)} · {invoiceTypeLabels[invoice.type]} · {purchaseVendorLabels[invoice.vendor]}
            </span>
          </div>
          <b>{formatCurrency(invoice.total)}</b>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal invoice-modal">
          <div className="invoice-document">
            <Dialog.Title>Factura {invoice.number}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Detalles de la factura de compra.
            </Dialog.Description>

            <div className="invoice-meta">
              <span>
                <strong>Fecha:</strong> {formatDate(invoice.createdAt)}
              </span>
              <span>
                <strong>Cliente:</strong> {invoice.client}
              </span>
              <span>
                <strong>Vendedor:</strong> {purchaseVendorLabels[invoice.vendor]}
              </span>
            </div>

            <div className="invoice-products">
              <h3>Productos:</h3>
              {invoice.lines.map((line) => (
                <InvoiceProductLine
                  editing={editingLineId === line.id}
                  invoiceId={invoice.id}
                  key={line.id}
                  line={line}
                  onCancel={() => setEditingLineId(null)}
                  onEdit={() => setEditingLineId(line.id)}
                />
              ))}
            </div>

            <div className="invoice-totals">
              <span>
                <strong>Subtotal:</strong> {formatCurrency(invoice.total)}
              </span>
              <span>
                <strong>Estado:</strong> Pagada
              </span>
              <span>
                <strong>Tipo:</strong> {invoiceTypeLabels[invoice.type]}
              </span>
            </div>
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

function InvoiceProductLine({
  editing,
  invoiceId,
  line,
  onCancel,
  onEdit
}: {
  editing: boolean;
  invoiceId: number;
  line: PurchaseInvoiceLineView;
  onCancel: () => void;
  onEdit: () => void;
}) {
  const [category, setCategory] = useState<Category>(line.category);
  const [tier, setTier] = useState<AppTier>(line.tier);
  const [quantity, setQuantity] = useState(formatThousands(String(line.quantity)));
  const [total, setTotal] = useState(formatThousands(String(Math.trunc(line.total))));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const correctPurchaseInvoiceLine = useStockStore((state) => state.correctPurchaseInvoiceLine);

  const unlock = () => {
    setCategory(line.category);
    setTier(line.tier);
    setQuantity(formatThousands(String(line.quantity)));
    setTotal(formatThousands(String(Math.trunc(line.total))));
    setError(null);
    onEdit();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await correctPurchaseInvoiceLine({
        invoiceId,
        lineId: line.id,
        category,
        tier,
        quantity: parseThousands(quantity),
        total: parseThousands(total)
      });
      onCancel();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo corregir la factura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="invoice-product-wrap">
      <div className="invoice-product">
        <span>
          {categoryLabels[line.category]} {line.tier}
        </span>
        <span>{formatNumber(line.quantity)}</span>
        <span>{formatCurrency(line.total)}</span>
        <small>{formatDate(line.createdAt)}</small>
        <EmergencyConfirmDialog
          title="Corregir factura"
          description="Esta accion altera el stock y el total de la factura. Escribe CONFIRMAR para desbloquear la correccion."
          onConfirm={unlock}
        >
          <button className="invoice-product__emergency" type="button">
            <ShieldAlert />
            Corregir
          </button>
        </EmergencyConfirmDialog>
      </div>
      {editing ? (
        <form className="invoice-correction" onSubmit={submit}>
          <label>
            Material
            <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
              {categories.map((currentCategory) => (
                <option key={currentCategory} value={currentCategory}>
                  {categoryLabels[currentCategory]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tier
            <select value={tier} onChange={(event) => setTier(event.target.value as AppTier)}>
              {tiers.map((currentTier) => (
                <option key={currentTier} value={currentTier}>
                  {tierLabels[currentTier]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cantidad
            <input
              value={quantity}
              onChange={(event) => setQuantity(normalizeThousandsInput(event.target.value))}
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
            />
          </label>
          <label>
            Total
            <input
              value={total}
              onChange={(event) => setTotal(normalizeThousandsInput(event.target.value))}
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
            />
          </label>
          {error ? <p className="form-error invoice-correction__error">{error}</p> : null}
          <div className="invoice-correction__actions">
            <button className="button ghost" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <Check />}
              Guardar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const invoiceTypeLabels = {
  UNICA: "Unica",
  MASIVA: "Masiva"
} as const;
