import { Archive, Factory, History, Package } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";
import { BulkPurchaseDialog, ClearStockDialog, Metric, PurchaseDialog, TicketDialog, TicketDialogXL } from "../Components";
import { formatNumber } from "../app-data";
import { BuyPage } from "../Pages/BuyPage/BuyPage";
import { HistoryXL } from "../Pages/HistoryXL/HistoryXL";
import { HistoryTab } from "../Pages/HistoryTab/HistoryTab";
import { PriceComparatorPage } from "../Pages/PriceComparatorPage/PriceComparatorPage";
import { MarketPage } from "../Pages/MarketPage/MarketPage";
import { StockTab } from "../Pages/StockTab/StockTab";
import { TicketAnalizer } from "../Pages/TicketAnalizer/TicketAnalizer";
import { TicketTab } from "../Pages/TicketTab/TicketTab";
import { AppNotices } from "./AppNotices";
import { AppSidebar } from "./AppSidebar";
import { AppTitlebar } from "./AppTitlebar";
import "./AppLayout.scss";
import { PageShell } from "./PageShell";

interface AppLayoutProps {
  closedTicketsCount: number;
  errors: Array<string | null>;
  missingMaterials: string[];
  openTicketsCount: number;
  staffQuantity: number;
  totals: { quantity: number; total: number };
}

export function AppLayout({
  closedTicketsCount,
  errors,
  missingMaterials,
  openTicketsCount,
  staffQuantity,
  totals
}: AppLayoutProps) {
  return (
    <div className="app-frame">
      <AppTitlebar />
      <div className="app-body">
        <AppSidebar />

        <main className="app-shell">
          <AppNotices errors={errors} missingMaterials={missingMaterials} />

          <Routes>
            <Route path="/" element={<Navigate to="/Stock" replace />} />
            <Route
              path="/Stock"
              element={
                <PageShell eyebrow="Inventario" title="Stock de materiales" actions={<ClearStockDialog />}>
                  <section className="metrics">
                    
                   
                  </section>
                  <section className="panel">
                    <StockTab />
                  </section>
                </PageShell>
              }
            />
            <Route
              path="/Ticket"
              element={
                <PageShell
                  eyebrow="Fabricacion"
                  title="Tickets"
                  actions={
                    <>
                      <TicketDialog />
                      <TicketDialogXL />
                    </>
                  }
                >
                  
                  <div className="workspace">
                    <section className="panel">
                      <TicketTab />
                    </section>
                    <section className="panel">
                      <HistoryTab />
                    </section>
                  </div>
                </PageShell>
              }
            />
            <Route
              path="/Buy"
              element={
                <PageShell
                  eyebrow="Compras"
                  title="Historial de compras"
                  actions={
                    <>
                      <PurchaseDialog />
                      <BulkPurchaseDialog />
                    </>
                  }
                >
                  <BuyPage />
                </PageShell>
              }
            />
            <Route
              path="/PriceComparator"
              element={
                <PageShell eyebrow="Mercados" title="Comparador de precios">
                  <PriceComparatorPage />
                </PageShell>
              }
            />
            <Route
              path="/Market"
              element={
                <PageShell eyebrow="Blight Market" title="Operacion de bastones">
                  <section className="metrics">
                    <Metric icon={<History />} label="Fabricaciones" value={String(closedTicketsCount)} />
                    <Metric icon={<Package />} label="Bastones en stock" value={formatNumber(staffQuantity)} />
                  </section>
                  <MarketPage />
                </PageShell>
              }
            />
            <Route
              path="/TicketAnalizer"
              element={
                <PageShell eyebrow="Analisis" title="TicketAnalizer">
                  <TicketAnalizer />
                </PageShell>
              }
            />
            <Route
              path="/HistoryXL"
              element={
                <PageShell eyebrow="Analisis" title="HistoryXL">
                  <HistoryXL />
                </PageShell>
              }
            />
            <Route path="*" element={<Navigate to="/Stock" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
