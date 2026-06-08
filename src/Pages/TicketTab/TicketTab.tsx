import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FabricationTicketView } from "../../../electron/types";
import { formatDate } from "../../app-data";
import { CloseTicketDialog, EmptyState, Recipe, TicketCosts, TierBadge } from "../../Components";
import { useTicketStore } from "../../stores/ticket-store";
import "./TicketTab.scss";

export function TicketTab() {
  const tickets = useTicketStore((state) => state.tickets);

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Tickets abiertos</h2>
          <span>Cierre con validacion de stock</span>
        </div>
      </div>
      <div className="ticket-grid">
        {tickets.length === 0 ? <EmptyState text="No hay tickets abiertos." /> : null}
        {tickets.map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div className="ticket-card__head">
              <TierBadge tier={ticket.tier} />
              <span>{formatDate(ticket.openedAt)}</span>
            </div>
            <TicketCosts ticket={ticket} compact />
            <Recipe tier={ticket.tier} recipeId={ticket.recipeId} leftoverCredits={ticket.appliedLeftoverCredits} />
            <div className="ticket-card__actions">
              <CloseTicketDialog ticket={ticket} />
              <DeleteOpenTicketDialog ticket={ticket} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function DeleteOpenTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteOpenTicket = useTicketStore((state) => state.deleteOpenTicket);

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteOpenTicket(ticket.id);
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo eliminar el ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button danger" type="button">
          <Trash2 />
          Eliminar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Eliminar ticket {ticket.tier}</Dialog.Title>
          <Dialog.Description className="modal-copy">
            Elimina este ticket abierto y sus sobras aplicadas. No modifica stock ni historial.
          </Dialog.Description>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <Dialog.Close asChild>
              <button className="button ghost" type="button">
                Cancelar
              </button>
            </Dialog.Close>
            <button className="button danger solid" type="button" onClick={remove} disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <Trash2 />}
              Eliminar
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
