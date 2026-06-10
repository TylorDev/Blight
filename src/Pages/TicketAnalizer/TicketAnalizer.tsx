import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { BarChart3, Check, Edit3, Save } from "lucide-react";
import { useSearchParams } from "react-router";
import type { AppTier, StaffQualityView, TicketAnalizerHistoryManualState } from "../../../electron/types";
import type {
  SaleValueExceptionKey,
  TicketAnalizerEditOverrides,
  TicketAnalizerFinancialSummary,
  TicketAnalizerPower,
  TicketAnalizerResult,
  TicketAnalizerUnitCost
} from "./ticket-analizer";
import {
  analyzeTickets,
  createTicketQualityOverrideKey,
  createDefaultSaleValueByPower,
  createDefaultSaleValueExceptions,
  defaultTicketAnalizerTaxPercentages,
  normalizeTicketAnalizerPercentInput,
  parseTicketAnalizerPercentInput,
  ticketAnalizerSaleValueExceptionLabels,
  ticketAnalizerPowers
} from "./ticket-analizer";
import {
  formatCurrency,
  formatNumber,
  staffQualities,
  staffQualityLabels,
  tierLabels
} from "../../app-data";
import { normalizeThousandsInput, parseThousands } from "../../number-format";
import { useHistoryStore } from "../../stores/history-store";
import "./TicketAnalizer.scss";

const defaultManualTicketIds = ["", "", "", ""];

export function TicketAnalizer() {
  const [isEditing, setIsEditing] = useState(false);
  const [manualTicketIds, setManualTicketIds] = useState(defaultManualTicketIds);
  const [saleOrderTaxInput, setSaleOrderTaxInput] = useState("");
  const [saleTaxInput, setSaleTaxInput] = useState("");
  const [unitCostDrafts, setUnitCostDrafts] = useState<Record<string, string>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [saleInputsByPower, setSaleInputsByPower] = useState<Record<TicketAnalizerPower, string>>(() =>
    Object.fromEntries(ticketAnalizerPowers.map((power) => [power, ""])) as Record<TicketAnalizerPower, string>
  );
  const [exceptionInputs, setExceptionInputs] = useState<Record<SaleValueExceptionKey, string>>(() =>
    Object.fromEntries(Object.keys(createDefaultSaleValueExceptions()).map((key) => [key, ""])) as Record<
      SaleValueExceptionKey,
      string
    >
  );
  const tickets = useHistoryStore((state) => state.tickets);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const [searchParams] = useSearchParams();
  const historyId = searchParams.get("historyId");
  const [historyFeedback, setHistoryFeedback] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);

  useEffect(() => {
    void loadHistory().catch(() => undefined);
  }, [loadHistory]);

  useEffect(() => {
    if (!historyId) {
      return;
    }

    let cancelled = false;
    void window.blight
      .getTicketAnalizerHistory(historyId)
      .then((record) => {
        if (cancelled || !record) {
          return;
        }

        applyHistoryManualState(record.ticketIds, record.manualState, {
          setExceptionInputs,
          setManualTicketIds,
          setQuantityDrafts,
          setSaleInputsByPower,
          setSaleOrderTaxInput,
          setSaleTaxInput,
          setUnitCostDrafts
        });
        setIsEditing(true);
        setHistoryFeedback("Registro XL cargado.");
        setHistoryError(null);
      })
      .catch((currentError) => {
        if (cancelled) {
          return;
        }
        setHistoryError(currentError instanceof Error ? currentError.message : "No se pudo cargar el registro XL.");
      });

    return () => {
      cancelled = true;
    };
  }, [historyId]);

  const defaultSaleValueByPower = useMemo(() => createDefaultSaleValueByPower(), []);
  const saleValueByPower = useMemo(() => {
    const values = { ...defaultSaleValueByPower };
    for (const power of ticketAnalizerPowers) {
      const parsed = parseThousands(saleInputsByPower[power] ?? "");
      values[power] = parsed > 0 ? parsed : values[power];
    }
    return values;
  }, [defaultSaleValueByPower, saleInputsByPower]);
  const saleValueExceptions = useMemo(() => {
    const values = createDefaultSaleValueExceptions();
    for (const key of Object.keys(values) as SaleValueExceptionKey[]) {
      const parsed = parseThousands(exceptionInputs[key] ?? "");
      values[key] = parsed > 0 ? parsed : values[key];
    }
    return values;
  }, [exceptionInputs]);
  const taxPercentages = useMemo(
    () => ({
      saleOrderTaxPercent: parseTicketAnalizerPercentInput(
        saleOrderTaxInput,
        defaultTicketAnalizerTaxPercentages.saleOrderTaxPercent
      ),
      saleTaxPercent: parseTicketAnalizerPercentInput(saleTaxInput, defaultTicketAnalizerTaxPercentages.saleTaxPercent)
    }),
    [saleOrderTaxInput, saleTaxInput]
  );

  const baseAnalysis = useMemo(
    () => analyzeTickets(tickets, manualTicketIds, saleValueByPower, saleValueExceptions, {}, taxPercentages),
    [manualTicketIds, saleValueByPower, saleValueExceptions, taxPercentages, tickets]
  );
  const editOverrides = useMemo(
    () => createEditOverrides(baseAnalysis.selectedTickets, unitCostDrafts, quantityDrafts),
    [baseAnalysis.selectedTickets, quantityDrafts, unitCostDrafts]
  );
  const analysis = useMemo(
    () =>
      isEditing
        ? analyzeTickets(tickets, manualTicketIds, saleValueByPower, saleValueExceptions, editOverrides, taxPercentages)
        : baseAnalysis,
    [baseAnalysis, editOverrides, isEditing, manualTicketIds, saleValueByPower, saleValueExceptions, taxPercentages, tickets]
  );
  const canSaveHistory = analysis.errors.length === 0 && analysis.selectedTickets.length === 4;

  const saveHistory = async () => {
    if (!canSaveHistory) {
      return;
    }

    setSavingHistory(true);
    setHistoryFeedback(null);
    setHistoryError(null);
    try {
      await window.blight.saveTicketAnalizerHistory({
        ticketIds: analysis.selectedTickets.map((ticket) => ticket.id),
        manualState: {
          effectiveSaleValueByPower: saleValueByPower,
          effectiveSaleValueExceptions: saleValueExceptions,
          effectiveTaxPercentages: taxPercentages,
          exceptionInputs,
          quantityDrafts,
          saleInputsByPower,
          saleOrderTaxInput,
          saleTaxInput,
          unitCostDrafts
        },
        summary: analysis.financialSummary
      });
      setHistoryFeedback("Cambios guardados en HistoryXL.");
    } catch (currentError) {
      setHistoryError(currentError instanceof Error ? currentError.message : "No se pudieron guardar los cambios.");
    } finally {
      setSavingHistory(false);
    }
  };

  return (
    <section className="ticket-analizer">
      <section className="ticket-analizer-control">
        <div className="ticket-analizer-control__head">
          <div>
            <div className="ticket-analizer-title-line">
              <h2>TicketAnalizer</h2>
              <button className={`button ${isEditing ? "primary" : "ghost"}`} onClick={() => setIsEditing((value) => !value)} type="button">
                {isEditing ? <Check /> : <Edit3 />}
                {isEditing ? "Done" : "Edit"}
              </button>
              <button className="button ghost" disabled={!canSaveHistory || savingHistory} onClick={() => void saveHistory()} type="button">
                <Save />
                {savingHistory ? "Guardando" : "Guardar cambios"}
              </button>
            </div>
            <span>{analysis.manualMode ? "Carga manual" : "Carga automatica XL"}</span>
            {historyFeedback ? <small className="ticket-analizer-history-feedback">{historyFeedback}</small> : null}
            {historyError ? <small className="ticket-analizer-history-feedback ticket-analizer-history-feedback--error">{historyError}</small> : null}
          </div>
          <SummaryMetrics financialSummary={analysis.financialSummary} />
        </div>

        <ControlInputs
          defaultSaleValueByPower={defaultSaleValueByPower}
          exceptionInputs={exceptionInputs}
          manualTicketIds={manualTicketIds}
          saleInputsByPower={saleInputsByPower}
          saleOrderTaxInput={saleOrderTaxInput}
          saleTaxInput={saleTaxInput}
          setExceptionInputs={setExceptionInputs}
          setManualTicketIds={setManualTicketIds}
          setSaleInputsByPower={setSaleInputsByPower}
          setSaleOrderTaxInput={setSaleOrderTaxInput}
          setSaleTaxInput={setSaleTaxInput}
        />

        {analysis.errors.length > 0 ? (
          <div className="ticket-analizer-errors">
            {analysis.errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        ) : null}
      </section>

      <TicketSummaryCards
        baseSummaryByTicket={baseAnalysis.summaryByTicket}
        isEditing={isEditing}
        setUnitCostDrafts={setUnitCostDrafts}
        summaryByTicket={analysis.summaryByTicket}
        unitCostDrafts={unitCostDrafts}
      />

      <section className="ticket-analizer-panel">
        <PanelTitle title="Agrupacion por poder de objeto" />
        <div className="ticket-analizer-table ticket-analizer-table--power">
          <Header labels={["Poder", "Precio venta", "Combinaciones", "Cantidad"]} />
          {analysis.powerGroups.map((group) => (
            <div className="ticket-analizer-row" key={group.itemPower}>
              <strong>{group.itemPower}</strong>
              <span>{formatCurrency(group.saleValue)}</span>
              <span>{group.combinations.length > 0 ? group.combinations.join(", ") : "-"}</span>
              <span>{formatNumber(group.quantity)}</span>
            </div>
          ))}
        </div>
      </section>

      <GroupTables analysis={analysis} />

      <DetailByTier
        baseDetailByTier={baseAnalysis.detailByTier}
        isEditing={isEditing}
        quantityDrafts={quantityDrafts}
        setQuantityDrafts={setQuantityDrafts}
        summaryByTicket={analysis.summaryByTicket}
        tierGroups={analysis.detailByTier}
      />
    </section>
  );
}

function SummaryMetrics({ financialSummary }: { financialSummary: TicketAnalizerFinancialSummary }) {
  return (
    <div className="ticket-analizer-summary">
      <div className="ticket-analizer-summary__metric">
        <span>Coste total</span>
        <strong>{formatCompactCurrency(financialSummary.totalCost)}</strong>
      </div>
      <div className="ticket-analizer-summary__metric">
        <span>
          <BarChart3 />
          Venta bruta
        </span>
        <strong>{formatCompactCurrency(financialSummary.grossSale)}</strong>
      </div>
      <div className="ticket-analizer-summary__metric">
        <span>Ganancia antes de impuestos</span>
        <strong>{formatCompactCurrency(financialSummary.profitBeforeTaxes)}</strong>
      </div>
      <div className="ticket-analizer-summary__metric">
        <span>Impuestos y comisiones</span>
        <strong>{formatCompactCurrency(financialSummary.taxesAndFees)}</strong>
      </div>
      <div className="ticket-analizer-summary__metric ticket-analizer-summary__metric--net">
        <span>Ganancia neta</span>
        <strong>{formatCompactCurrency(financialSummary.netProfit)}</strong>
      </div>
      <small>{formatNumber(financialSummary.totalQuantity)} bastones</small>
    </div>
  );
}

type SummaryByTicket = TicketAnalizerResult["summaryByTicket"];
type DetailByTierGroups = TicketAnalizerResult["detailByTier"];

function ControlInputs({
  defaultSaleValueByPower,
  exceptionInputs,
  manualTicketIds,
  saleInputsByPower,
  saleOrderTaxInput,
  saleTaxInput,
  setExceptionInputs,
  setManualTicketIds,
  setSaleInputsByPower,
  setSaleOrderTaxInput,
  setSaleTaxInput
}: {
  defaultSaleValueByPower: Record<TicketAnalizerPower, number>;
  exceptionInputs: Record<SaleValueExceptionKey, string>;
  manualTicketIds: string[];
  saleInputsByPower: Record<TicketAnalizerPower, string>;
  saleOrderTaxInput: string;
  saleTaxInput: string;
  setExceptionInputs: Dispatch<SetStateAction<Record<SaleValueExceptionKey, string>>>;
  setManualTicketIds: Dispatch<SetStateAction<string[]>>;
  setSaleInputsByPower: Dispatch<SetStateAction<Record<TicketAnalizerPower, string>>>;
  setSaleOrderTaxInput: Dispatch<SetStateAction<string>>;
  setSaleTaxInput: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div className="ticket-analizer-input-grid">
      <section className="ticket-analizer-input-card ticket-analizer-input-card--tickets">
        <h3>Tickets</h3>
        <div className="ticket-analizer-ticket-inputs">
          {manualTicketIds.map((ticketId, index) => (
            <label className="field" key={index}>
              Ticket {index + 1}
              <input
                onChange={(event) =>
                  setManualTicketIds((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? event.target.value.trim() : item))
                  )
                }
                placeholder={`XL-${String(index + 1).padStart(4, "0")}`}
                value={ticketId}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="ticket-analizer-input-card ticket-analizer-input-card--powers">
        <h3>Venta por poder</h3>
        <div className="ticket-analizer-power-inputs">
          {ticketAnalizerPowers.map((power) => (
            <label className="field" key={power}>
              {power}
              <input
                inputMode="numeric"
                onChange={(event) =>
                  setSaleInputsByPower((current) => ({
                    ...current,
                    [power]: normalizeThousandsInput(event.target.value)
                  }))
                }
                pattern="[0-9.]*"
                placeholder={formatCurrency(defaultSaleValueByPower[power])}
                type="text"
                value={saleInputsByPower[power]}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="ticket-analizer-input-card ticket-analizer-input-card--exceptions">
        <h3>Excepciones</h3>
        <div className="ticket-analizer-exception-inputs">
          {(Object.keys(ticketAnalizerSaleValueExceptionLabels) as SaleValueExceptionKey[]).map((key) => (
            <label className="field" key={key}>
              {ticketAnalizerSaleValueExceptionLabels[key]}
              <input
                inputMode="numeric"
                onChange={(event) =>
                  setExceptionInputs((current) => ({
                    ...current,
                    [key]: normalizeThousandsInput(event.target.value)
                  }))
                }
                pattern="[0-9.]*"
                placeholder={formatCurrency(createDefaultSaleValueExceptions()[key])}
                type="text"
                value={exceptionInputs[key]}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="ticket-analizer-input-card ticket-analizer-input-card--taxes">
        <h3>Impuestos venta</h3>
        <div className="ticket-analizer-tax-inputs">
          <label className="field">
            Impuesto Orden de venta
            <input
              inputMode="decimal"
              onChange={(event) => setSaleOrderTaxInput(normalizeTicketAnalizerPercentInput(event.target.value))}
              placeholder={`${defaultTicketAnalizerTaxPercentages.saleOrderTaxPercent}%`}
              type="text"
              value={saleOrderTaxInput}
            />
          </label>
          <label className="field">
            Impuesto al vender
            <input
              inputMode="decimal"
              onChange={(event) => setSaleTaxInput(normalizeTicketAnalizerPercentInput(event.target.value))}
              placeholder={`${defaultTicketAnalizerTaxPercentages.saleTaxPercent}%`}
              type="text"
              value={saleTaxInput}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function TicketSummaryCards({
  baseSummaryByTicket,
  isEditing,
  setUnitCostDrafts,
  summaryByTicket,
  unitCostDrafts
}: {
  baseSummaryByTicket: SummaryByTicket;
  isEditing: boolean;
  setUnitCostDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  summaryByTicket: SummaryByTicket;
  unitCostDrafts: Record<string, string>;
}) {
  const baseUnitCostByTier = useMemo(
    () => new Map(baseSummaryByTicket.map((item) => [item.tier, item.unitCost])),
    [baseSummaryByTicket]
  );

  return (
    <section className="ticket-analizer-grid ticket-analizer-grid--four">
      {summaryByTicket.map((item) => (
        <article className="ticket-analizer-card ticket-analizer-card--metric" key={item.tier}>
          <span>{tierLabels[item.tier]}</span>
          {isEditing && item.ticketId !== "-" ? (
            <input
              aria-label={`Costo unitario ${item.ticketId}`}
              className="ticket-analizer-inline-input ticket-analizer-inline-input--cost"
              inputMode="numeric"
              onChange={(event) =>
                setUnitCostDrafts((current) => ({
                  ...current,
                  [item.ticketId]: normalizeThousandsInput(event.target.value)
                }))
              }
              pattern="[0-9.]*"
              placeholder={formatCurrency(baseUnitCostByTier.get(item.tier) ?? 0)}
              type="text"
              value={unitCostDrafts[item.ticketId] ?? ""}
            />
          ) : (
            <strong>{formatCurrency(item.unitCost)}</strong>
          )}
          <div className="ticket-analizer-card__totals">
            <span>Venta {formatCompactCurrency(item.sale)}</span>
            <span>Ganancia {formatCompactCurrency(item.profit)}</span>
          </div>
          <small>{item.ticketId}</small>
        </article>
      ))}
    </section>
  );
}

function GroupTables({ analysis }: { analysis: TicketAnalizerResult }) {
  return (
    <section className="ticket-analizer-group-tables">
      <section className="ticket-analizer-panel">
        <PanelTitle title="Ganancias por poder" />
        <div className="ticket-analizer-table ticket-analizer-table--profit">
          <Header labels={["Poder", "Unit Cost", "Cantidad", "Coste Total", "Venta Neta", "Ganancia Neta"]} />
          {analysis.powerGroups.map((group) => (
            <div className="ticket-analizer-row" key={group.itemPower}>
              <strong>{group.itemPower}</strong>
              <span>{formatUnitCosts(group.unitCosts)}</span>
              <span>{formatNumber(group.quantity)}</span>
              <span>{formatCompactCurrency(group.cost)}</span>
              <span>{formatCompactCurrency(group.sale)}</span>
              <span>{formatCompactCurrency(group.profit)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ticket-analizer-panel">
        <PanelTitle title="Ganancias por tier" />
        <div className="ticket-analizer-table ticket-analizer-table--simple">
          <Header labels={["Tier", "Unit Cost", "Cantidad", "Coste Total", "Venta Neta", "Ganancia Neta"]} />
          {analysis.profitByTier.map((item) => (
            <div className="ticket-analizer-row" key={item.tier}>
              <strong>{tierLabels[item.tier]}</strong>
              <span>{formatUnitCosts(item.unitCosts)}</span>
              <span>{formatNumber(item.quantity)}</span>
              <span>{formatCompactCurrency(item.cost)}</span>
              <span>{formatCompactCurrency(item.sale)}</span>
              <span>{formatCompactCurrency(item.profit)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ticket-analizer-panel">
        <PanelTitle title="Ganancias por calidad" />
        <div className="ticket-analizer-table ticket-analizer-table--simple">
          <Header labels={["Calidad", "Unit Cost", "Cantidad", "Coste Total", "Venta Neta", "Ganancia Neta"]} />
          {analysis.profitByQuality.map((item) => (
            <div className="ticket-analizer-row" key={item.quality}>
              <strong>{staffQualityLabels[item.quality]}</strong>
              <span>{formatUnitCosts(item.unitCosts)}</span>
              <span>{formatNumber(item.quantity)}</span>
              <span>{formatCompactCurrency(item.cost)}</span>
              <span>{formatCompactCurrency(item.sale)}</span>
              <span>{formatCompactCurrency(item.profit)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function DetailByTier({
  baseDetailByTier,
  isEditing,
  quantityDrafts,
  setQuantityDrafts,
  summaryByTicket,
  tierGroups
}: {
  baseDetailByTier: DetailByTierGroups;
  isEditing: boolean;
  quantityDrafts: Record<string, string>;
  setQuantityDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  summaryByTicket: SummaryByTicket;
  tierGroups: DetailByTierGroups;
}) {
  const ticketIdByTier = useMemo(() => new Map(summaryByTicket.map((item) => [item.tier, item.ticketId])), [summaryByTicket]);
  const baseQuantityByTierAndQuality = useMemo(() => {
    const values = new Map<string, number>();
    for (const tierGroup of baseDetailByTier) {
      for (const item of tierGroup.qualities) {
        values.set(createTierQualityKey(tierGroup.tier, item.quality), item.quantity);
      }
    }
    return values;
  }, [baseDetailByTier]);

  return (
    <section className="ticket-analizer-panel">
      <PanelTitle title="Detalle por tier y calidad" />
      <div className="ticket-analizer-detail-grid">
        {tierGroups.map((tierGroup) => {
          const ticketId = ticketIdByTier.get(tierGroup.tier) ?? "-";
          return (
            <article className="ticket-analizer-tier-detail" key={tierGroup.tier}>
              <h3>{tierLabels[tierGroup.tier]}</h3>
              <div className="ticket-analizer-table ticket-analizer-table--detail">
                <Header labels={["Calidad", "Cant.", "Coste", "Venta", "Ganancia"]} />
                {tierGroup.qualities.map((item) => {
                  const overrideKey = createTicketQualityOverrideKey(ticketId, item.quality);
                  const baseQuantity = baseQuantityByTierAndQuality.get(createTierQualityKey(tierGroup.tier, item.quality)) ?? 0;
                  return (
                    <div className="ticket-analizer-row" key={item.quality}>
                      <strong>{staffQualityLabels[item.quality]}</strong>
                      {isEditing && ticketId !== "-" ? (
                        <input
                          aria-label={`Cantidad ${tierLabels[tierGroup.tier]} ${staffQualityLabels[item.quality]}`}
                          className="ticket-analizer-inline-input"
                          inputMode="numeric"
                          onChange={(event) =>
                            setQuantityDrafts((current) => ({
                              ...current,
                              [overrideKey]: normalizeThousandsInput(event.target.value)
                            }))
                          }
                          pattern="[0-9.]*"
                          placeholder={formatNumber(baseQuantity)}
                          type="text"
                          value={quantityDrafts[overrideKey] ?? ""}
                        />
                      ) : (
                        <span>{formatNumber(item.quantity)}</span>
                      )}
                      <span>{formatCompactCurrency(item.cost)}</span>
                      <span>{formatCompactCurrency(item.sale)}</span>
                      <span>{formatCompactCurrency(item.profit)}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function applyHistoryManualState(
  ticketIds: string[],
  manualState: TicketAnalizerHistoryManualState,
  setters: {
    setExceptionInputs: Dispatch<SetStateAction<Record<SaleValueExceptionKey, string>>>;
    setManualTicketIds: Dispatch<SetStateAction<string[]>>;
    setQuantityDrafts: Dispatch<SetStateAction<Record<string, string>>>;
    setSaleInputsByPower: Dispatch<SetStateAction<Record<TicketAnalizerPower, string>>>;
    setSaleOrderTaxInput: Dispatch<SetStateAction<string>>;
    setSaleTaxInput: Dispatch<SetStateAction<string>>;
    setUnitCostDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  }
) {
  setters.setManualTicketIds([...ticketIds]);
  setters.setSaleOrderTaxInput(manualState.saleOrderTaxInput);
  setters.setSaleTaxInput(manualState.saleTaxInput);
  setters.setSaleInputsByPower(manualState.saleInputsByPower as Record<TicketAnalizerPower, string>);
  setters.setExceptionInputs(manualState.exceptionInputs as Record<SaleValueExceptionKey, string>);
  setters.setUnitCostDrafts(manualState.unitCostDrafts);
  setters.setQuantityDrafts(manualState.quantityDrafts);
}

function createEditOverrides(
  selectedTickets: Array<{ id: string; producedStaffs: Array<{ quality: StaffQualityView }> }>,
  unitCostDrafts: Record<string, string>,
  quantityDrafts: Record<string, string>
): TicketAnalizerEditOverrides {
  const unitCostByTicketId: Record<string, number> = {};
  const quantityByTicketAndQuality: Record<string, number> = {};

  for (const ticket of selectedTickets) {
    const unitCostDraft = unitCostDrafts[ticket.id] ?? "";
    if (unitCostDraft.trim() !== "") {
      unitCostByTicketId[ticket.id] = parseThousands(unitCostDraft);
    }

    for (const quality of staffQualities) {
      const key = createTicketQualityOverrideKey(ticket.id, quality);
      const quantityDraft = quantityDrafts[key] ?? "";
      if (quantityDraft.trim() !== "") {
        quantityByTicketAndQuality[key] = parseThousands(quantityDraft);
      }
    }
  }

  return { quantityByTicketAndQuality, unitCostByTicketId };
}

function createTierQualityKey(tier: AppTier, quality: StaffQualityView) {
  return `${tier}:${quality}`;
}

function formatUnitCosts(unitCosts: TicketAnalizerUnitCost[]) {
  if (unitCosts.length === 0) {
    return "-";
  }

  return unitCosts.map((item) => `${tierLabels[item.tier]} ${formatCompactCurrency(item.unitCost)}`).join(", ");
}

function Header({ labels }: { labels: string[] }) {
  return (
    <div className="ticket-analizer-row ticket-analizer-row--head">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="ticket-analizer-panel__head">
      <h3>{title}</h3>
    </div>
  );
}

function formatCompactCurrency(value: number) {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absoluteValue >= 1000000) {
    return `${sign}${formatNumber(Number((absoluteValue / 1000000).toFixed(1)))}M`;
  }

  if (absoluteValue >= 1000) {
    return `${sign}${formatNumber(Number((absoluteValue / 1000).toFixed(0)))}k`;
  }

  return `${sign}${formatCurrency(absoluteValue)}`;
}
