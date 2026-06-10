import { BarChart3, CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { TicketAnalizerHistoryView } from "../../../electron/types";
import { formatCurrency, formatNumber } from "../../app-data";
import "./HistoryXL.scss";

export function HistoryXL() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TicketAnalizerHistoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.blight
      .listTicketAnalizerHistory()
      .then((items) => {
        setRecords(items);
        setError(null);
      })
      .catch((currentError) => {
        setError(currentError instanceof Error ? currentError.message : "No se pudo cargar HistoryXL.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="history-xl-empty">Cargando registros XL</div>;
  }

  if (error) {
    return <div className="history-xl-empty history-xl-empty--error">{error}</div>;
  }

  if (records.length === 0) {
    return <div className="history-xl-empty">Todavia no hay cambios XL guardados.</div>;
  }

  return (
    <section className="history-xl-list">
      {records.map((record) => (
        <button
          className="history-xl-record"
          key={record.id}
          onClick={() => navigate(`/TicketAnalizer?historyId=${encodeURIComponent(record.id)}`)}
          type="button"
        >
          <span className="history-xl-record__date">
            <CalendarDays />
            {formatRecordDate(record.createdAt)}
          </span>
          <strong>{record.ticketIds.join(" / ")}</strong>
          <span className="history-xl-record__summary">
            <BarChart3 />
            Ganancia neta {formatCurrency(record.summary.netProfit)}
          </span>
          <span>{formatNumber(record.summary.totalQuantity)} bastones</span>
          <ChevronRight className="history-xl-record__arrow" />
        </button>
      ))}
    </section>
  );
}

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
