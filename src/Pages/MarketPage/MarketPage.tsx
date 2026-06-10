import { useEffect, useMemo, useState } from "react";
import type { AppTier, StaffQualityView } from "../../../electron/types";
import {
  FilterValue,
  formatNumber,
  staffQualities,
  staffQualityLabels,
  tierLabels,
  tiers
} from "../../app-data";
import { SelectField } from "../../Components";
import { useHistoryStore } from "../../stores/history-store";
import { useStaffStockStore } from "../../stores/staff-stock-store";
import { StaffStockTable } from "./components/StaffStockTable";
import "./MarketPage.scss";

const ALL_TICKETS_FILTER = "TODOS";
const MANUAL_TICKET_FILTER = "SIN_TICKET";

export function MarketPage() {
  const [ticketFilter, setTicketFilter] = useState(ALL_TICKETS_FILTER);
  const lots = useStaffStockStore((state) => state.lots);
  const tickets = useHistoryStore((state) => state.tickets);
  const tierFilter = useStaffStockStore((state) => state.tierFilter);
  const qualityFilter = useStaffStockStore((state) => state.qualityFilter);
  const setTierFilter = useStaffStockStore((state) => state.setTierFilter);
  const setQualityFilter = useStaffStockStore((state) => state.setQualityFilter);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const ticketFilterOptions = useMemo(() => {
    const ticketLabels = new Map<string, string>();
    let hasManualLots = false;

    for (const lot of lots) {
      if (lot.ticketId) {
        ticketLabels.set(lot.ticketId, lot.ticketCode);
      } else {
        hasManualLots = true;
      }
    }

    const options = [ALL_TICKETS_FILTER, ...ticketLabels.keys()];
    if (hasManualLots) {
      options.push(MANUAL_TICKET_FILTER);
    }

    return {
      labels: {
        [ALL_TICKETS_FILTER]: "Todos",
        ...Object.fromEntries(ticketLabels),
        [MANUAL_TICKET_FILTER]: "Sin ticket"
      },
      options
    };
  }, [lots]);
  const filteredLots = useMemo(() => {
    return lots.filter((item) => {
      const tierMatches = tierFilter === "TODOS" || item.tier === tierFilter;
      const qualityMatches = qualityFilter === "TODOS" || item.quality === qualityFilter;
      const ticketMatches =
        ticketFilter === ALL_TICKETS_FILTER ||
        (ticketFilter === MANUAL_TICKET_FILTER ? item.ticketId === null : item.ticketId === ticketFilter);
      return tierMatches && qualityMatches && ticketMatches;
    });
  }, [lots, qualityFilter, ticketFilter, tierFilter]);

  useEffect(() => {
    void Promise.all([loadStaffStockLots(), loadHistory()]).catch(() => undefined);
  }, [loadHistory, loadStaffStockLots]);

  useEffect(() => {
    if (!ticketFilterOptions.options.includes(ticketFilter)) {
      setTicketFilter(ALL_TICKETS_FILTER);
    }
  }, [ticketFilter, ticketFilterOptions.options]);

  return (
    <section className="staff-layout">
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
              <SelectField
                value={ticketFilter}
                onValueChange={setTicketFilter}
                options={ticketFilterOptions.options}
                labels={ticketFilterOptions.labels}
              />
            </div>
          </div>
          <StaffStockTable items={filteredLots} tickets={tickets} />
        </section>
      </div>
    </section>
  );
}
