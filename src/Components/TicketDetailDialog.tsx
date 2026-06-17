import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenCheck, Calculator, Check, Loader2, Package, ShieldAlert, WalletCards, X } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import type { Category, FabricationTicketView } from "../../electron/types";
import {
  categoryLabels,
  formatAvailableAtFromClosedAt,
  formatCurrency,
  formatDate,
  formatNumber,
  staffQualityLabels,
  staffQualityToneClasses
} from "../app-data";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../number-format";
import fabricIcon from "../Resources/fabric.svg";
import staffMonoIcon from "../Resources/staff-monocolor.svg";
import woodIcon from "../Resources/wood.svg";
import { useHistoryStore } from "../stores/history-store";
import { EmergencyConfirmDialog } from "./EmergencyConfirmDialog";
import "./TicketDetailDialog.scss";

type TicketDetailDialogProps = {
  children: ReactNode;
  ticket: FabricationTicketView;
};

const consumptionToneClasses: Record<Category, string> = {
  TABLAS: "consumption-item--wood",
  TELAS: "consumption-item--fabric",
  DIARIOS_VACIOS: "consumption-item--diary",
  ARTEFACTOS: "consumption-item--artifact"
};

function ConsumptionIcon({ category }: { category: Category }) {
  if (category === "TABLAS") {
    return <img src={woodIcon} alt="" />;
  }

  if (category === "TELAS") {
    return <img src={fabricIcon} alt="" />;
  }

  if (category === "DIARIOS_VACIOS") {
    return <BookOpenCheck />;
  }

  return <Package />;
}

export function TicketDetailDialog({ children, ticket }: TicketDetailDialogProps) {
  const [editingCosts, setEditingCosts] = useState(false);
  const [costDrafts, setCostDrafts] = useState(() => createCostDrafts(ticket));
  const [savingCosts, setSavingCosts] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const updateClosedTicketMaterialCosts = useHistoryStore((state) => state.updateClosedTicketMaterialCosts);
  const closedDate = ticket.closedAt ? formatDate(ticket.closedAt) : "";
  const availableDate = ticket.closedAt ? formatAvailableAtFromClosedAt(ticket.closedAt) : "";
  const producedStaffs = ticket.producedStaffs.filter((staff) => staff.quantity > 0);
  const primaryMetrics = [
    {
      icon: <WalletCards />,
      label: "Inversión total",
      value: formatCurrency(ticket.investmentTotal)
    },
    {
      icon: <Calculator />,
      label: "Precio por bastón",
      value: formatCurrency(ticket.unitCost)
    },
    {
      icon: <img src={staffMonoIcon} alt="" />,
      label: "Bastones",
      value: formatNumber(ticket.staffQuantity)
    },
    {
      icon: <Package />,
      label: "Materiales",
      value: formatCurrency(ticket.materialTotal)
    }
  ];
  const costRows = [
    { label: "Tax", value: formatCurrency(ticket.tax) },
    { label: "Crafting tax", value: formatCurrency(ticket.craftingTax) },
    { label: "Foco", value: formatCurrency(ticket.focusCost) },
    { label: "Diarios llenos", value: formatNumber(ticket.filledDiariesQuantity) },
    { label: "Descuento diarios", value: formatCurrency(ticket.filledDiariesDiscount) },
    {
      label: "Sobras tablas",
      value: `${formatNumber(ticket.leftoverTablesQuantity)} - ${formatCurrency(ticket.leftoverTablesValue)}`
    },
    {
      label: "Sobras telas",
      value: `${formatNumber(ticket.leftoverClothsQuantity)} - ${formatCurrency(ticket.leftoverClothsValue)}`
    },
    { label: "Sobras aplicadas", value: formatCurrency(ticket.appliedLeftoverDiscount) }
  ];
  const unlockCostEditing = () => {
    setCostDrafts(createCostDrafts(ticket));
    setCostError(null);
    setEditingCosts(true);
  };
  const submitCostCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCosts(true);
    setCostError(null);

    try {
      await updateClosedTicketMaterialCosts({
        ticketId: ticket.id,
        materialCosts: ticket.consumptions.map((consumption) => ({
          consumptionId: consumption.id,
          total: parseThousands(costDrafts[consumption.id] ?? "")
        }))
      });
      setEditingCosts(false);
    } catch (currentError) {
      setCostError(currentError instanceof Error ? currentError.message : "No se pudo corregir el coste del ticket.");
    } finally {
      setSavingCosts(false);
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ticket-detail-dialog__overlay" />
        <Dialog.Content className="ticket-detail-dialog">
          <div className="ticket-detail-dialog__head">
            <Dialog.Title>Ticket {ticket.tier}</Dialog.Title>
            <span>{closedDate}</span>
          </div>
          <Dialog.Description className="ticket-detail-dialog__description">
            Detalle completo del ticket cerrado, incluyendo costos y consumos.
          </Dialog.Description>
          {availableDate ? (
            <div className="ticket-detail-availability">
              <span>Disponible</span>
              <strong>{availableDate}</strong>
            </div>
          ) : null}
          <section className="ticket-detail-kpis" aria-label="Resumen principal">
            {primaryMetrics.map((metric) => (
              <div className="ticket-detail-kpi" key={metric.label}>
                <span className="ticket-detail-kpi__icon">{metric.icon}</span>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </section>
          <div className={producedStaffs.length > 0 ? "ticket-detail-body" : "ticket-detail-body ticket-detail-body--single"}>
            <section className="ticket-detail-section ticket-detail-section--costs">
              <div className="ticket-detail-section__head">
                <h3>Costes e impuestos</h3>
                <span>{costRows.length} datos</span>
              </div>
              <div className="ticket-detail-cost-table">
                {costRows.map((row) => (
                  <div className="ticket-detail-cost-row" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>
            {producedStaffs.length > 0 ? (
              <section className="ticket-detail-section">
                <div className="ticket-detail-section__head">
                  <h3>Producción</h3>
                  <span>{formatNumber(ticket.staffQuantity)} bastones</span>
                </div>
                <div className="staff-quality-list">
                  {producedStaffs.map((staff) => (
                    <span className={`staff-quality-item ${staffQualityToneClasses[staff.quality]}`} key={staff.id}>
                      <b>{staffQualityLabels[staff.quality]}</b>
                      <strong>{formatNumber(staff.quantity)}</strong>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="ticket-detail-section">
              <div className="ticket-detail-section__head">
                <h3>Consumos</h3>
                <span>{ticket.consumptions.length} materiales</span>
                <EmergencyConfirmDialog
                  title="Corregir costes del ticket"
                  description="Esta accion cambia el coste historico del ticket cerrado. Escribe CONFIRMAR para editar los costes por material."
                  onConfirm={unlockCostEditing}
                >
                  <button className="ticket-detail-emergency" type="button">
                    <ShieldAlert />
                    Emergencia
                  </button>
                </EmergencyConfirmDialog>
              </div>
              {editingCosts ? (
                <form className="ticket-cost-correction" onSubmit={submitCostCorrection}>
                  {ticket.consumptions.map((item) => (
                    <label className={`ticket-cost-correction__row ${consumptionToneClasses[item.category]}`} key={item.id}>
                      <span className="consumption-item__icon">
                        <ConsumptionIcon category={item.category} />
                      </span>
                      <span className="consumption-item__meta">
                        <b>{categoryLabels[item.category]}</b>
                        <small>
                          Cantidad {formatNumber(item.quantity)} · Actual {formatCurrency(item.discountedTotal)}
                        </small>
                      </span>
                      <input
                        value={costDrafts[item.id] ?? ""}
                        onChange={(event) =>
                          setCostDrafts((current) => ({
                            ...current,
                            [item.id]: normalizeThousandsInput(event.target.value)
                          }))
                        }
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                      />
                    </label>
                  ))}
                  {costError ? <p className="ticket-detail-dialog__error">{costError}</p> : null}
                  <div className="ticket-cost-correction__actions">
                    <button className="button ghost" type="button" onClick={() => setEditingCosts(false)}>
                      Cancelar
                    </button>
                    <button className="button primary" type="submit" disabled={savingCosts}>
                      {savingCosts ? <Loader2 className="spin" /> : <Check />}
                      Guardar costes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="consumption-list">
                  {ticket.consumptions.map((item) => (
                    <div className={`consumption-item ${consumptionToneClasses[item.category]}`} key={item.id}>
                      <span className="consumption-item__icon">
                        <ConsumptionIcon category={item.category} />
                      </span>
                      <span className="consumption-item__meta">
                        <b>{categoryLabels[item.category]}</b>
                        <small>Cantidad {formatNumber(item.quantity)}</small>
                      </span>
                      <strong className="consumption-item__value">{formatCurrency(item.discountedTotal)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <Dialog.Close asChild>
            <button className="ticket-detail-dialog__close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function createCostDrafts(ticket: FabricationTicketView) {
  return Object.fromEntries(
    ticket.consumptions.map((consumption) => [consumption.id, formatThousands(String(Math.trunc(consumption.discountedTotal)))])
  );
}
