import { Archive, BarChart3, Factory, History, Package, Scale, ShoppingBasket } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import blightLogo from "../Resources/BlightLogo.png";
import "./AppSidebar.scss";

export function AppSidebar() {
  return (
    <aside className="sidebar">
    
      <nav className="sidebar-nav" aria-label="Navegacion principal">
        <SidebarLink icon={<Archive />} label="Stock" to="/Stock" />
        <SidebarLink icon={<Factory />} label="Tickets" to="/Ticket" />
        <SidebarLink icon={<BarChart3 />} label="Analizer" to="/TicketAnalizer" />
        <SidebarLink icon={<History />} label="HistoryXL" to="/HistoryXL" />
        <SidebarLink icon={<ShoppingBasket />} label="Compras" to="/Buy" />
        <SidebarLink icon={<Scale />} label="Comparador" to="/PriceComparator" />
        <SidebarLink icon={<Package />} label="Market" to="/Market" />
      </nav>
    </aside>
  );
}

function SidebarLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <NavLink className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`} to={to}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
