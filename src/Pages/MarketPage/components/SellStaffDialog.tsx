import * as Dialog from "@radix-ui/react-dialog";
import { CircleDollarSign, Loader2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppTier, StaffQualityView, StaffStockItemView } from "../../../../electron/types";
import { formatNumber, staffQualities, staffQualityLabels, tierLabels, tiers } from "../../../app-data";
import { SelectField } from "../../../Components";
import { normalizeThousandsInput, parseThousands } from "../../../number-format";
import { useStaffStockStore } from "../../../stores/staff-stock-store";

type SellStaffDialogProps = {
  stock: StaffStockItemView[];
};

export function SellStaffDialog({ stock }: SellStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [quality, setQuality] = useState<StaffQualityView>("NORMAL");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sellStaffStock = useStaffStockStore((state) => state.sellStaffStock);
  const available = stock.find((item) => item.tier === tier && item.quality === quality)?.quantity ?? 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sellStaffStock({ tier, quality, quantity: parseThousands(quantity), total: parseThousands(total) });
      setQuantity("");
      setTotal("");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <CircleDollarSign />
          Registrar venta
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Venta de bastones</Dialog.Title>
          <Dialog.Description className="modal-copy">Disponible: {formatNumber(available)}</Dialog.Description>
          <form className="form" onSubmit={submit}>
            <SelectField label="Tier" value={tier} onValueChange={(value) => setTier(value as AppTier)} options={tiers} labels={tierLabels} />
            <SelectField label="Calidad" value={quality} onValueChange={(value) => setQuality(value as StaffQualityView)} options={staffQualities} labels={staffQualityLabels} />
            <label className="field">
              Cantidad
              <input value={quantity} onChange={(event) => setQuantity(normalizeThousandsInput(event.target.value))} type="text" inputMode="numeric" pattern="[0-9.]*" />
            </label>
            <label className="field">
              Total venta
              <input value={total} onChange={(event) => setTotal(normalizeThousandsInput(event.target.value))} type="text" inputMode="numeric" pattern="[0-9.]*" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">Cancelar</button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <CircleDollarSign />}
                Vender
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar"><X /></button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
