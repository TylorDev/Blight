import * as Dialog from "@radix-ui/react-dialog";
import { BadgeDollarSign, Factory, Gauge, Loader2, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import type { AppTier, CreateTicketInput, FabricationTicketView, LeftoverCreditView, RecipeId } from "../../electron/types";
import {
  calculateTicketPreview,
  categoryLabels,
  defaultRecipeId,
  formatCurrency,
  formatNumber,
  getDefaultTicketTax,
  recipeIds,
  ticketRecipes,
  tierLabels,
  tiers
} from "../app-data";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../number-format";
import { useHistoryStore } from "../stores/history-store";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import { Recipe } from "./Recipe";
import { TicketPreview } from "./TicketPreview";

const tierColors: Record<AppTier, string> = {
  T5: "#76221A",
  T6: "#C36E2B",
  T7: "#D6B446",
  T8: "#D3CEC7"
};

type TicketDialogProps = {
  fixedTier?: AppTier;
  fixedRecipeId?: RecipeId;
  fixedTax?: number;
  idPrefix?: CreateTicketInput["idPrefix"];
  onCreated?: (ticket: FabricationTicketView) => void | Promise<void>;
  submitLabel?: string;
  triggerLabel?: string;
};

type TicketDialogFormProps = TicketDialogProps & {
  active: boolean;
  onCancel: () => void;
  stepLabel?: string;
};

export function TicketDialog({ triggerLabel = "Ticket", ...formProps }: TicketDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Factory />
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal ticket-dialog">
          <TicketDialogForm
            {...formProps}
            active={open}
            onCancel={() => setOpen(false)}
            onCreated={async (ticket) => {
              await formProps.onCreated?.(ticket);
              setOpen(false);
            }}
          />
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

export function TicketDialogForm({
  active,
  fixedRecipeId,
  fixedTax,
  fixedTier,
  idPrefix,
  onCancel,
  onCreated,
  stepLabel,
  submitLabel = "Crear"
}: TicketDialogFormProps) {
  const [tier, setTier] = useState<AppTier>("T5");
  const [recipeId, setRecipeId] = useState<RecipeId>(defaultRecipeId);
  const [tax, setTax] = useState("");
  const [pendingLeftovers, setPendingLeftovers] = useState<LeftoverCreditView[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingLeftovers, setLoadingLeftovers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stock = useStockStore((state) => state.stock);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const createTicket = useTicketStore((state) => state.createTicket);
  const listPendingLeftoverCredits = useTicketStore((state) => state.listPendingLeftoverCredits);
  const selectedTier = fixedTier ?? tier;
  const selectedRecipeId = fixedRecipeId ?? recipeId;
  const defaultTax = useMemo(() => getDefaultTicketTax(closedTickets), [closedTickets]);
  const effectiveTax = fixedTax ?? (tax === "" ? defaultTax : parseThousands(tax));
  const preview = useMemo(
    () => calculateTicketPreview(stock, selectedTier, effectiveTax, selectedRecipeId, pendingLeftovers),
    [effectiveTax, pendingLeftovers, selectedRecipeId, selectedTier, stock]
  );
  const pendingLeftoverTotal = pendingLeftovers.reduce((total, credit) => total + credit.value, 0);
  const recipeLocked = Boolean(fixedRecipeId);
  const taxLocked = fixedTax !== undefined;
  const tierLocked = Boolean(fixedTier);

  useEffect(() => {
    if (!active) {
      return;
    }

    setError(null);
    setLoadingLeftovers(true);
    listPendingLeftoverCredits(selectedTier)
      .then(setPendingLeftovers)
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar las sobras.")
      )
      .finally(() => setLoadingLeftovers(false));
  }, [active, listPendingLeftoverCredits, selectedTier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const ticket = await createTicket({ tier: selectedTier, tax: effectiveTax, recipeId: selectedRecipeId, idPrefix });
      if (!taxLocked) {
        setTax("");
      }
      await onCreated?.(ticket);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form ticket-dialog__form">
      {stepLabel ? <p className="modal-copy">{stepLabel}</p> : null}
      <section className="ticket-dialog__section">
        <div className="ticket-dialog__section-head">
          <strong>Tier de fabricacion</strong>
          <span>Seleccion activa: {tierLabels[selectedTier]}</span>
        </div>
        <div className="ticket-dialog__tier-grid">
          {tiers.map((currentTier) => (
            <button
              aria-pressed={selectedTier === currentTier}
              className="ticket-tier-option"
              disabled={tierLocked}
              key={currentTier}
              onClick={() => setTier(currentTier)}
              style={{ "--ticket-tier-color": tierColors[currentTier] } as CSSProperties}
              type="button"
            >
              <span className="ticket-tier-option__mark" />
              <strong>{tierLabels[currentTier]}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="ticket-dialog__section">
        <div className="ticket-dialog__section-head">
          <strong>Receta</strong>
          <span>Seleccion activa: {ticketRecipes[selectedRecipeId].label}</span>
        </div>
        <div className="ticket-dialog__recipe-grid">
          {recipeIds.map((currentRecipeId) => {
            const recipe = ticketRecipes[currentRecipeId];
            const summary = `${recipe.materials[0].quantity} tablas, ${recipe.materials[1].quantity} telas, ${recipe.materials[2].quantity} artefactos`;

            return (
              <button
                aria-pressed={selectedRecipeId === currentRecipeId}
                className="ticket-recipe-option"
                disabled={recipeLocked}
                key={currentRecipeId}
                onClick={() => setRecipeId(currentRecipeId)}
                type="button"
              >
                <strong>{recipe.label}</strong>
                <span>{summary}</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className="ticket-dialog__inputs">
        <label className="field ticket-dialog__field">
          <span>
            <BadgeDollarSign />
            Tax
          </span>
          <input
            value={taxLocked ? formatThousands(String(fixedTax)) : tax}
            onChange={(event) => setTax(normalizeThousandsInput(event.target.value))}
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            placeholder={formatThousands(String(defaultTax))}
            aria-label={`Tax, por defecto ${formatNumber(defaultTax)}`}
            disabled={taxLocked}
          />
        </label>
        <label className="field ticket-dialog__field">
          <span>
            <WandSparkles />
            Cantidad Bastones Total
          </span>
          <input value={String(preview.staffQuantity)} readOnly />
        </label>
        <label className="field ticket-dialog__field">
          <span>
            <Gauge />
            Foco
          </span>
          <input value={formatNumber(preview.focusCost)} readOnly />
        </label>
      </div>
      {loadingLeftovers ? <p className="modal-copy">Buscando sobras disponibles...</p> : null}
      {!loadingLeftovers && pendingLeftovers.length > 0 ? (
        <div className="leftover-note">
          <div className="leftover-note__head">
            <Sparkles />
            <strong>Sobras aplicadas al crear</strong>
            <span>Descuento total {formatCurrency(pendingLeftoverTotal)}</span>
          </div>
          <div className="leftover-note__rows">
            {pendingLeftovers.map((credit) => (
              <div className="leftover-note__row" key={credit.id}>
                <span>{categoryLabels[credit.category]}</span>
                <strong>{credit.quantity}</strong>
                <b>{formatCurrency(credit.value)}</b>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <section className="ticket-dialog__section">
        <div className="ticket-dialog__section-head">
          <strong>Receta efectiva</strong>
          <span>Stock y sobras ya considerados</span>
        </div>
        <Recipe tier={selectedTier} recipeId={selectedRecipeId} leftoverCredits={pendingLeftovers} />
      </section>
      <TicketPreview preview={preview} />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="modal-actions">
        <button className="button ghost" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" /> : <Plus />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
