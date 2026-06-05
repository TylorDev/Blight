import * as Dialog from "@radix-ui/react-dialog";
import { Factory, Loader2, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AppTier } from "../../electron/types";
import { calculateTicketPreview, staffQuantity, tierLabels, tiers } from "../app-data";
import { normalizeThousandsInput, parseThousands } from "../number-format";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import { Recipe } from "./Recipe";
import { SelectField } from "./SelectField";
import { TicketPreview } from "./TicketPreview";

export function TicketDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [tax, setTax] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stock = useStockStore((state) => state.stock);
  const createTicket = useTicketStore((state) => state.createTicket);
  const preview = useMemo(() => calculateTicketPreview(stock, tier, parseThousands(tax)), [stock, tax, tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTicket({ tier, tax: parseThousands(tax) });
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
              labels={tierLabels}
            />
            <label className="field">
              Tax
              <input
                value={tax}
                onChange={(event) => setTax(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Cantidad Bastones Total
              <input value={String(staffQuantity)} readOnly />
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
