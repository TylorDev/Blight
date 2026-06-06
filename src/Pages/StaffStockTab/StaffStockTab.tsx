import { useEffect, useMemo } from "react";
import type { AppTier, StaffQualityView } from "../../../electron/types";
import {
  FilterValue,
  formatCurrency,
  formatNumber,
  staffQualities,
  staffQualityLabels,
  tierLabels,
  tiers
} from "../../app-data";
import { SelectField } from "../../Components";
import { useStaffStockStore } from "../../stores/staff-stock-store";
import { AdjustStaffDialog } from "./components/AdjustStaffDialog";
import { SellStaffDialog } from "./components/SellStaffDialog";
import { StaffMetric } from "./components/StaffMetric";
import { StaffMovementTable } from "./components/StaffMovementTable";
import { StaffStockTable } from "./components/StaffStockTable";
import "./StaffStockTab.scss";

export function StaffStockTab() {
  const stock = useStaffStockStore((state) => state.stock);
  const lots = useStaffStockStore((state) => state.lots);
  const movements = useStaffStockStore((state) => state.movements);
  const tierFilter = useStaffStockStore((state) => state.tierFilter);
  const qualityFilter = useStaffStockStore((state) => state.qualityFilter);
  const setTierFilter = useStaffStockStore((state) => state.setTierFilter);
  const setQualityFilter = useStaffStockStore((state) => state.setQualityFilter);
  const loadStaffStock = useStaffStockStore((state) => state.loadStaffStock);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadStaffMovements = useStaffStockStore((state) => state.loadStaffMovements);
  const staffInStock = stock.reduce((total, item) => total + item.quantity, 0);
  const totalSales = movements
    .filter((movement) => movement.type === "VENTA")
    .reduce((total, movement) => total + movement.total, 0);
  const filteredLots = useMemo(() => {
    return lots.filter((item) => {
      const tierMatches = tierFilter === "TODOS" || item.tier === tierFilter;
      const qualityMatches = qualityFilter === "TODOS" || item.quality === qualityFilter;
      return tierMatches && qualityMatches;
    });
  }, [lots, qualityFilter, tierFilter]);

  useEffect(() => {
    void Promise.all([loadStaffStock(), loadStaffStockLots(), loadStaffMovements()]).catch(() => undefined);
  }, [loadStaffMovements, loadStaffStock, loadStaffStockLots]);

  return (
    <section className="staff-layout">
      <div className="staff-market-hero">
        <div>
          <p className="staff-market-kicker">Market</p>
          <h2>Bastones en el stock</h2>
          <span>{formatNumber(staffInStock)} unidades listas</span>
        </div>
        <div className="staff-market-actions">
          <SellStaffDialog stock={stock} />
          <AdjustStaffDialog />
        </div>
      </div>

      <div className="staff-market-metrics">
        <StaffMetric label="Bastones en el stock" value={formatNumber(staffInStock)} />
        <StaffMetric label="Ventas totales" value={formatCurrency(totalSales)} />
        <StaffMetric label="Ganancias totales" value="-" />
        <StaffMetric label="Bastones en proceso de venta" value="-" />
        <StaffMetric label="Valor del stock" value="-" />
        <StaffMetric label="Valor de bastones en proceso de venta" value="-" />
      </div>

      <div className="staff-market-grid">
        <section className="staff-market-card staff-market-card--stock">
          <div className="staff-market-card-head">
            <div>
              <h3>Stock</h3>
              <span>{formatNumber(filteredLots.reduce((total, item) => total + item.quantity, 0))} filtrados</span>
            </div>
            <div className="filters">
              <SelectField
                value={tierFilter}
                onValueChange={(value) => setTierFilter(value as FilterValue<AppTier>)}
                options={["TODOS", ...tiers]}
                labels={{ TODOS: "Todos", ...tierLabels }}
              />
              <SelectField
                value={qualityFilter}
                onValueChange={(value) => setQualityFilter(value as FilterValue<StaffQualityView>)}
                options={["TODOS", ...staffQualities]}
                labels={{ TODOS: "Todas", ...staffQualityLabels }}
              />
            </div>
          </div>
          <StaffStockTable items={filteredLots} />
        </section>

        <section className="staff-market-card staff-market-card--movements">
          <div className="staff-market-card-head">
            <div>
              <h3>Movimientos</h3>
              <span>{formatNumber(movements.length)} registros</span>
            </div>
          </div>
          <StaffMovementTable movements={movements} />
        </section>
      </div>
    </section>
  );
}
