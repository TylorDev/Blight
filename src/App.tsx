import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Archive, CircleDollarSign, Factory, History, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BulkPurchaseDialog, ClearStockDialog, Metric, PurchaseDialog, TicketDialog } from "./Components";
import { formatCurrency, formatNumber } from "./app-data";
import { HistoryTab } from "./Pages/HistoryTab/HistoryTab";
import { StockTab } from "./Pages/StockTab/StockTab";
import { TicketTab } from "./Pages/TicketTab/TicketTab";
import { useHistoryStore } from "./stores/history-store";
import { useStockStore } from "./stores/stock-store";
import { useTicketStore } from "./stores/ticket-store";

function App() {
  const stock = useStockStore((state) => state.stock);
  const stockError = useStockStore((state) => state.error);
  const loadStock = useStockStore((state) => state.loadStock);
  const openTicketsCount = useTicketStore((state) => state.tickets.length);
  const ticketError = useTicketStore((state) => state.error);
  const missingMaterials = useTicketStore((state) => state.missingMaterials);
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const closedTicketsCount = useHistoryStore((state) => state.tickets.length);
  const historyError = useHistoryStore((state) => state.error);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    void Promise.all([loadStock(), loadTickets(), loadHistory()])
      .catch(() => undefined)
      .finally(() => setInitialLoading(false));
  }, [loadHistory, loadStock, loadTickets]);

  const totals = useMemo(() => {
    return stock.reduce(
      (summary, item) => ({
        quantity: summary.quantity + item.quantity,
        total: summary.total + item.total
      }),
      { quantity: 0, total: 0 }
    );
  }, [stock]);

  const errors = [stockError, ticketError, historyError].filter(Boolean);

  if (initialLoading) {
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <span>Cargando inventario</span>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Blight</p>
            <h1>Inventario y fabricacion</h1>
          </div>
          <div className="actions">
            <PurchaseDialog />
            <BulkPurchaseDialog />
            <ClearStockDialog />
            <TicketDialog />
          </div>
        </header>

        <section className="metrics">
          <Metric icon={<Archive />} label="Stock total" value={formatNumber(totals.quantity)} />
          <Metric icon={<CircleDollarSign />} label="Valor inventario" value={formatCurrency(totals.total)} />
          <Metric icon={<Factory />} label="Tickets abiertos" value={String(openTicketsCount)} />
          <Metric icon={<History />} label="Fabricaciones" value={String(closedTicketsCount)} />
        </section>

        {errors.map((error) => (
          <div className="notice danger" key={error}>
            {error}
          </div>
        ))}
        {missingMaterials.length > 0 ? (
          <div className="notice danger">
            Faltan materiales: {missingMaterials.join(", ")}
          </div>
        ) : null}

        <Tabs.Root defaultValue="stock" className="workspace">
          <Tabs.List className="tab-list">
            <Tabs.Trigger value="stock">Inventario</Tabs.Trigger>
            <Tabs.Trigger value="tickets">Tickets</Tabs.Trigger>
            <Tabs.Trigger value="history">Historial</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="stock" className="panel">
            <StockTab />
          </Tabs.Content>

          <Tabs.Content value="tickets" className="panel">
            <TicketTab />
          </Tabs.Content>

          <Tabs.Content value="history" className="panel">
            <HistoryTab />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </Tooltip.Provider>
  );
}

export default App;
