import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import blightLogo from "../Resources/BlightLogo.png";
import "./AppTitlebar.scss";

const routeLabels = [
  { path: "/TicketAnalizer", label: "Analizer" },
  { path: "/HistoryXL", label: "HistoryXL" },
  { path: "/PriceComparator", label: "Comparador" },
  { path: "/Ticket", label: "Tickets" },
  { path: "/Buy", label: "Compras" },
  { path: "/Market", label: "Market" },
  { path: "/Stock", label: "Stock" }
];

export function AppTitlebar() {
  const location = useLocation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void window.blight.isWindowMaximized().then(setIsMaximized);
  }, []);

  const sectionLabel = useMemo(() => {
    return routeLabels.find((route) => location.pathname.startsWith(route.path))?.label ?? "Stock";
  }, [location.pathname]);

  const toggleMaximize = async () => {
    const maximized = await window.blight.toggleMaximizeWindow();
    setIsMaximized(maximized);
  };

  return (
    <header className="app-titlebar">
      <div className="app-titlebar__brand">
        <img alt="Blight" src={blightLogo} />
        <strong>Blight</strong>
        <span>{sectionLabel}</span>
      </div>
      <div className="app-titlebar__controls" aria-label="Controles de ventana">
        <button type="button" aria-label="Minimizar" title="Minimizar" onClick={() => void window.blight.minimizeWindow()}>
          <Minus />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? "Restaurar" : "Maximizar"}
          title={isMaximized ? "Restaurar" : "Maximizar"}
          onClick={() => void toggleMaximize()}
        >
          {isMaximized ? <Copy /> : <Square />}
        </button>
        <button
          type="button"
          className="app-titlebar__close"
          aria-label="Cerrar"
          title="Cerrar"
          onClick={() => void window.blight.closeWindow()}
        >
          <X />
        </button>
      </div>
    </header>
  );
}
