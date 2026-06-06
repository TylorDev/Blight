import type { StaffStockLotView } from "../../../../electron/types";
import { formatCurrency, formatNumber, staffQualityLabels } from "../../../app-data";
import { EmptyState, TierBadge } from "../../../Components";

type StaffStockTableProps = {
  items: StaffStockLotView[];
};

export function StaffStockTable({ items }: StaffStockTableProps) {
  if (items.length === 0) {
    return <EmptyState text="No hay stock de bastones." />;
  }

  return (
    <div className="staff-market-table staff-market-table--stock">
      <div className="staff-market-row staff-market-row--head">
        <span>Tier</span>
        <span>Calidad</span>
        <span>Cantidad</span>
        <span>Coste</span>
        <span>Ticket</span>
      </div>
      {items.map((item) => (
        <div className="staff-market-row" key={item.id}>
          <TierBadge tier={item.tier} />
          <span>{staffQualityLabels[item.quality]}</span>
          <strong>{formatNumber(item.quantity)}</strong>
          <span>{formatCurrency(item.unitCost)}</span>
          <span>{item.ticketCode}</span>
        </div>
      ))}
    </div>
  );
}
