import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { CloseTicketResult, FabricationTicketView } from "../../electron/types";
import {
  categoryLabels,
  formatNumber,
  getDefaultFilledDiariesDiscount,
  getDefaultFilledDiariesQuantity,
  getRecentLeftoverQuantitySuggestions,
  staffQualities,
  staffQualityLabels,
  staffQualityToneClasses
} from "../app-data";
import { normalizeThousandsInput, parseThousands } from "../number-format";
import { useHistoryStore } from "../stores/history-store";
import { useStaffStockStore } from "../stores/staff-stock-store";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import "./CloseTicketDialog.scss";

export function CloseTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const [open, setOpen] = useState(false);
  const [filledDiariesQuantity, setFilledDiariesQuantity] = useState("");
  const [filledDiariesDiscount, setFilledDiariesDiscount] = useState("");
  const [leftoverTablesQuantity, setLeftoverTablesQuantity] = useState("");
  const [leftoverClothsQuantity, setLeftoverClothsQuantity] = useState("");
  const [producedStaffs, setProducedStaffs] = useState<Record<string, string>>(() =>
    getDefaultProducedStaffs(ticket.staffQuantity)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTicket = useTicketStore((state) => state.closeTicket);
  const clearTicketError = useTicketStore((state) => state.clearError);
  const setMissingMaterials = useTicketStore((state) => state.setMissingMaterials);
  const loadStock = useStockStore((state) => state.loadStock);
  const loadStaffStock = useStaffStockStore((state) => state.loadStaffStock);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadStaffMovements = useStaffStockStore((state) => state.loadStaffMovements);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const defaultFilledDiariesQuantity = getDefaultFilledDiariesQuantity(ticket.tier, ticket.recipeId);
  const defaultFilledDiariesDiscount = useMemo(
    () => getDefaultFilledDiariesDiscount(closedTickets, ticket.tier),
    [closedTickets, ticket.tier]
  );
  const tableSuggestions = useMemo(
    () => getRecentLeftoverQuantitySuggestions(closedTickets, ticket.tier, "TABLAS"),
    [closedTickets, ticket.tier]
  );
  const clothSuggestions = useMemo(
    () => getRecentLeftoverQuantitySuggestions(closedTickets, ticket.tier, "TELAS"),
    [closedTickets, ticket.tier]
  );
  const tableSuggestionsId = `leftover-tables-${ticket.id}`;
  const clothSuggestionsId = `leftover-cloths-${ticket.id}`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    clearTicketError();
    setMissingMaterials([]);

    const parsedLeftoverTablesQuantity = parseThousands(leftoverTablesQuantity);
    const parsedLeftoverClothsQuantity = parseThousands(leftoverClothsQuantity);
    if (parsedLeftoverTablesQuantity < 1 || parsedLeftoverClothsQuantity < 1) {
      setError("Cantidad de Tablas Sobrantes y Cantidad de Telas Sobrantes deben ser mayores a cero.");
      return;
    }
    const parsedProducedStaffs = staffQualities.map((quality) => ({
      quality,
      quantity: parseThousands(producedStaffs[quality] ?? "")
    }));
    const producedStaffTotal = parsedProducedStaffs.reduce((total, staff) => total + staff.quantity, 0);
    if (producedStaffTotal !== ticket.staffQuantity) {
      setError(`La suma de bastones creados debe ser ${ticket.staffQuantity}.`);
      return;
    }

    setSaving(true);

    try {
      const result = await closeTicket({
        ticketId: ticket.id,
        filledDiariesQuantity:
          filledDiariesQuantity === "" ? defaultFilledDiariesQuantity : parseThousands(filledDiariesQuantity),
        filledDiariesDiscount:
          filledDiariesDiscount === "" ? defaultFilledDiariesDiscount : parseThousands(filledDiariesDiscount),
        leftoverTablesQuantity: parsedLeftoverTablesQuantity,
        leftoverClothsQuantity: parsedLeftoverClothsQuantity,
        producedStaffs: parsedProducedStaffs
      });

      if (!result.ok) {
        setError(formatMissingMaterialsError(result.missing));
        return;
      }

      await Promise.all([loadStock(), loadHistory(), loadStaffStock(), loadStaffStockLots(), loadStaffMovements()]);
      setOpen(false);
      setFilledDiariesQuantity("");
      setFilledDiariesDiscount("");
      setLeftoverTablesQuantity("");
      setLeftoverClothsQuantity("");
      setProducedStaffs(getDefaultProducedStaffs(ticket.staffQuantity));
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "No se pudo cerrar el ticket.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

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
          <Dialog.Description className="sr-only">
            Cierra el ticket registrando diarios llenos y nuevas sobras para futuros tickets.
          </Dialog.Description>
          <form onSubmit={submit} className="form">
            <label className="field">
              Cantidad de diarios llenos
              <input
                value={filledDiariesQuantity}
                onChange={(event) => setFilledDiariesQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                placeholder={formatNumber(defaultFilledDiariesQuantity)}
              />
            </label>
            <label className="field">
              Descuento por diarios llenos
              <input
                value={filledDiariesDiscount}
                onChange={(event) => setFilledDiariesDiscount(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                placeholder={formatNumber(defaultFilledDiariesDiscount)}
              />
            </label>
            <label className="field">
              Cantidad de Tablas Sobrantes
              <input
                value={leftoverTablesQuantity}
                onChange={(event) => setLeftoverTablesQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                list={tableSuggestionsId}
              />
              <datalist id={tableSuggestionsId}>
                {tableSuggestions.map((quantity) => (
                  <option key={quantity} value={formatNumber(quantity)} />
                ))}
              </datalist>
            </label>
            <label className="field">
              Cantidad de Telas Sobrantes
              <input
                value={leftoverClothsQuantity}
                onChange={(event) => setLeftoverClothsQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                list={clothSuggestionsId}
              />
              <datalist id={clothSuggestionsId}>
                {clothSuggestions.map((quantity) => (
                  <option key={quantity} value={formatNumber(quantity)} />
                ))}
              </datalist>
            </label>
            <div className="staff-production-fields">
              <strong>Bastones creados</strong>
              {staffQualities.map((quality) => (
                <label className={`field staff-quality-field ${staffQualityToneClasses[quality]}`} key={quality}>
                  <span>{staffQualityLabels[quality]}</span>
                  <input
                    value={producedStaffs[quality] ?? ""}
                    onChange={(event) =>
                      setProducedStaffs((current) => ({
                        ...current,
                        [quality]: normalizeThousandsInput(event.target.value)
                      }))
                    }
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                  />
                </label>
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

function getDefaultProducedStaffs(staffQuantity: number) {
  return Object.fromEntries(staffQualities.map((quality, index) => [quality, index === 0 ? String(staffQuantity) : ""]));
}

function formatMissingMaterialsError(resultMissing: CloseTicketResult["missing"]) {
  if (!resultMissing || resultMissing.length === 0) {
    return "No se pudo cerrar el ticket. Revisa el stock disponible.";
  }

  const missingMaterials = resultMissing.map(
    (item) => `${categoryLabels[item.category]} ${item.tier} (${formatNumber(item.available)}/${formatNumber(item.required)})`
  );

  return `Faltan materiales: ${missingMaterials.join(", ")}.`;
}
