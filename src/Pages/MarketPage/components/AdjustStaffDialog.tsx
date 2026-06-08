import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Package, SlidersHorizontal, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppTier, StaffQualityView } from "../../../../electron/types";
import { staffQualities, staffQualityLabels, tierLabels, tiers } from "../../../app-data";
import { SelectField } from "../../../Components";
import { useStaffStockStore } from "../../../stores/staff-stock-store";

export function AdjustStaffDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [quality, setQuality] = useState<StaffQualityView>("NORMAL");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adjustStaffStock = useStaffStockStore((state) => state.adjustStaffStock);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adjustStaffStock({ tier, quality, quantity: Number(quantity), reason });
      setQuantity("1");
      setReason("");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo ajustar el stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button">
          <SlidersHorizontal />
          Ajustar stock
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Ajuste de bastones</Dialog.Title>
          <Dialog.Description className="sr-only">Suma o resta bastones del stock con motivo.</Dialog.Description>
          <form className="form" onSubmit={submit}>
            <SelectField label="Tier" value={tier} onValueChange={(value) => setTier(value as AppTier)} options={tiers} labels={tierLabels} />
            <SelectField label="Calidad" value={quality} onValueChange={(value) => setQuality(value as StaffQualityView)} options={staffQualities} labels={staffQualityLabels} />
            <label className="field">
              Cantidad (+/-)
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" step="1" />
            </label>
            <label className="field">
              Motivo
              <input value={reason} onChange={(event) => setReason(event.target.value)} type="text" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">Cancelar</button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Package />}
                Guardar
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
