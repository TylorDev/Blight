import { Plus, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { AppTier, Category } from "../../../electron/types";
import { categories, categoryLabels, tiers } from "../../app-data";
import { EmptyState, SelectField } from "../../Components";
import { normalizeThousandsInput, parseThousands } from "../../number-format";
import {
  advancedPricesToPriceMap,
  calculateAveragePrice,
  compareMarketPrices,
  createDefaultAdvancedPrices,
  getMissingTemplateMaterialKeys,
  getOrderedMarkets,
  markets,
  resolveAdvancedQuantityDefault,
  type AdvancedPriceMap,
  type CompareDirection,
  type CompareMode,
  type MaterialKey,
  type Market,
  type PriceMap
} from "./price-comparator";
import "./PriceComparatorPage.scss";

type ComparatorRow = {
  id: string;
  advancedPrices: Partial<Record<Market, AdvancedPriceDraft>>;
  materialKey: MaterialKey;
  prices: Partial<Record<Market, string>>;
};

type AdvancedPriceDraft = {
  quantity: string;
  total: string;
};

type ComparatorViewMode = "SIMPLE" | "ADVANCED";

const directionLabels: Record<CompareDirection, string> = {
  NORMAL: "Normal",
  REVERSA: "Reversa"
};

const modeLabels: Record<CompareMode, string> = {
  LOWEST: "Buscar menor",
  HIGHEST: "Buscar mayor"
};

const viewModeLabels: Record<ComparatorViewMode, string> = {
  SIMPLE: "Simple",
  ADVANCED: "Avanzado"
};

const templateCategories: Category[] = ["TABLAS", "TELAS", "DIARIOS_VACIOS", "ARTEFACTOS"];
const defaultAdvancedQuantity = "100";
const marketLabels = Object.fromEntries(markets.map((market) => [market, market])) as Record<Market, string>;
const materialOptions = categories.flatMap((category) =>
  tiers.map((tier) => `${category}:${tier}` as MaterialKey)
);
const materialLabels = Object.fromEntries(
  materialOptions.map((materialKey) => {
    const [category, tier] = materialKey.split(":") as [Category, AppTier];
    return [materialKey, `${categoryLabels[category]} ${tier}`];
  })
) as Record<MaterialKey, string>;

export function PriceComparatorPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>(materialOptions[0]);
  const [startMarket, setStartMarket] = useState<Market>("Thetford");
  const [direction, setDirection] = useState<CompareDirection>("NORMAL");
  const [mode, setMode] = useState<CompareMode>("LOWEST");
  const [viewMode, setViewMode] = useState<ComparatorViewMode>("SIMPLE");
  const [templateQuantity, setTemplateQuantity] = useState(defaultAdvancedQuantity);
  const [rows, setRows] = useState<ComparatorRow[]>([]);
  const orderedMarkets = useMemo(() => getOrderedMarkets(startMarket, direction), [direction, startMarket]);
  const selectedMaterialExists = rows.some((row) => row.materialKey === selectedMaterial);

  const addMaterial = () => {
    if (selectedMaterialExists) {
      return;
    }

    const advancedQuantity = getAdvancedQuantityDefault(templateQuantity);
    setRows((currentRows) => [
      ...currentRows,
      {
        id: `${selectedMaterial}-${Date.now()}`,
        advancedPrices: createAdvancedPriceDrafts(advancedQuantity),
        materialKey: selectedMaterial,
        prices: {}
      }
    ]);
  };

  const addTemplate = (category: Category) => {
    setRows((currentRows) => {
      const missingMaterialKeys = getMissingTemplateMaterialKeys(
        category,
        tiers,
        currentRows.map((row) => row.materialKey)
      );

      if (missingMaterialKeys.length === 0) {
        return currentRows;
      }

      const templateId = Date.now();
      const quantity = getAdvancedQuantityDefault(templateQuantity);
      return [
        ...currentRows,
        ...missingMaterialKeys.map((materialKey, index) => ({
          id: `${materialKey}-${templateId}-${index}`,
          advancedPrices: createAdvancedPriceDrafts(quantity),
          materialKey,
          prices: {}
        }))
      ];
    });
  };

  const removeMaterial = (rowId: string) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
  };

  const updatePrice = (rowId: string, market: Market, value: string) => {
    const normalizedValue = normalizeThousandsInput(value);
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              prices: {
                ...row.prices,
                [market]: normalizedValue
              }
            }
          : row
      )
    );
  };

  const updateAdvancedPrice = (rowId: string, market: Market, field: keyof AdvancedPriceDraft, value: string) => {
    const normalizedValue = normalizeThousandsInput(value);
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              advancedPrices: {
                ...row.advancedPrices,
                [market]: {
                  quantity: row.advancedPrices[market]?.quantity ?? defaultAdvancedQuantity,
                  total: row.advancedPrices[market]?.total ?? "",
                  [field]: normalizedValue
                }
              }
            }
          : row
      )
    );
  };

  return (
    <section className="price-comparator">
      <div className="price-comparator__toolbar">
        <SelectField
          label="Vista"
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ComparatorViewMode)}
          options={["SIMPLE", "ADVANCED"]}
          labels={viewModeLabels}
        />
        <SelectField
          label="Material"
          value={selectedMaterial}
          onValueChange={(value) => setSelectedMaterial(value as MaterialKey)}
          options={materialOptions}
          labels={materialLabels}
        />
        <button className="button primary" type="button" onClick={addMaterial} disabled={selectedMaterialExists}>
          <Plus />
          Agregar
        </button>
        <SelectField
          label="Mercado inicial"
          value={startMarket}
          onValueChange={(value) => setStartMarket(value as Market)}
          options={[...markets]}
          labels={marketLabels}
        />
        <SelectField
          label="Direccion"
          value={direction}
          onValueChange={(value) => setDirection(value as CompareDirection)}
          options={["NORMAL", "REVERSA"]}
          labels={directionLabels}
        />
        <SelectField
          label="Modo"
          value={mode}
          onValueChange={(value) => setMode(value as CompareMode)}
          options={["LOWEST", "HIGHEST"]}
          labels={modeLabels}
        />
      </div>

      <div className="price-comparator__templates">
        <span>Templates</span>
        {viewMode === "ADVANCED" ? (
          <label className="field compact price-comparator__template-quantity">
            <span>Cantidad template</span>
            <input
              value={templateQuantity}
              onChange={(event) => setTemplateQuantity(normalizeThousandsInput(event.target.value))}
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              placeholder={defaultAdvancedQuantity}
            />
          </label>
        ) : null}
        {templateCategories.map((category) => (
          <button className="button ghost" type="button" key={category} onClick={() => addTemplate(category)}>
            <Plus />
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      <div className="price-comparator__table-wrap">
        <div
          className={`price-comparator__table price-comparator__table--${viewMode.toLowerCase()}`}
          style={{ "--market-count": orderedMarkets.length } as CSSProperties}
        >
          <div className="price-comparator__row price-comparator__row--head">
            <span>Material</span>
            {orderedMarkets.map((market) => (
              <span className="price-comparator__market-head" key={market}>
                {market}
                {viewMode === "ADVANCED" ? (
                  <small>
                    <span>Total</span>
                    <span>Cant.</span>
                    <span>Prom.</span>
                  </small>
                ) : null}
              </span>
            ))}
            <span>Resultado</span>
            <span />
          </div>
          {rows.map((row) => (
            <PriceComparatorRow
              key={row.id}
              mode={mode}
              orderedMarkets={orderedMarkets}
              row={row}
              viewMode={viewMode}
              onRemove={removeMaterial}
              onUpdateAdvancedPrice={updateAdvancedPrice}
              onUpdatePrice={updatePrice}
            />
          ))}
        </div>
        {rows.length === 0 ? <EmptyState text="Agrega materiales para comparar precios entre mercados." /> : null}
      </div>
    </section>
  );
}

function PriceComparatorRow({
  mode,
  orderedMarkets,
  row,
  viewMode,
  onRemove,
  onUpdateAdvancedPrice,
  onUpdatePrice
}: {
  mode: CompareMode;
  orderedMarkets: Market[];
  row: ComparatorRow;
  viewMode: ComparatorViewMode;
  onRemove: (rowId: string) => void;
  onUpdateAdvancedPrice: (rowId: string, market: Market, field: keyof AdvancedPriceDraft, value: string) => void;
  onUpdatePrice: (rowId: string, market: Market, value: string) => void;
}) {
  const prices = useMemo<PriceMap>(() => {
    if (viewMode === "ADVANCED") {
      const advancedPrices = Object.fromEntries(
        markets.map((market) => [
          market,
          {
            quantity: parseThousands(row.advancedPrices[market]?.quantity ?? ""),
            total: parseThousands(row.advancedPrices[market]?.total ?? "")
          }
        ])
      ) as AdvancedPriceMap;
      return advancedPricesToPriceMap(advancedPrices);
    }

    return Object.fromEntries(
      markets.map((market) => [market, parseThousands(row.prices[market] ?? "")])
    ) as PriceMap;
  }, [row.advancedPrices, row.prices, viewMode]);
  const result = useMemo(() => compareMarketPrices(prices, mode), [mode, prices]);

  return (
    <div className="price-comparator__row">
      <strong>{materialLabels[row.materialKey]}</strong>
      {orderedMarkets.map((market) => {
        const price = parseThousands(row.prices[market] ?? "");
        const advancedTotal = parseThousands(row.advancedPrices[market]?.total ?? "");
        const advancedQuantity = parseThousands(row.advancedPrices[market]?.quantity ?? "");
        const averagePrice = calculateAveragePrice(advancedTotal, advancedQuantity);
        const comparisonPrice = viewMode === "ADVANCED" ? averagePrice : price;
        const isBest = comparisonPrice > 0 && result.bestMarkets.includes(market);
        const isSecond = comparisonPrice > 0 && result.secondMarkets.includes(market);
        if (viewMode === "ADVANCED") {
          return (
            <div
              className={`price-comparator__advanced-price${isBest ? " price-comparator__price--best" : ""}${
                isSecond ? " price-comparator__price--second" : ""
              }`}
              key={market}
            >
              <label>
                <span className="sr-only">{market} total</span>
                <input
                  value={row.advancedPrices[market]?.total ?? ""}
                  onChange={(event) => onUpdateAdvancedPrice(row.id, market, "total", event.target.value)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  placeholder="0"
                />
              </label>
              <label>
                <span className="sr-only">{market} cantidad</span>
                <input
                  value={row.advancedPrices[market]?.quantity ?? defaultAdvancedQuantity}
                  onChange={(event) => onUpdateAdvancedPrice(row.id, market, "quantity", event.target.value)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  placeholder={defaultAdvancedQuantity}
                />
              </label>
              <strong>{averagePrice > 0 ? formatAdvancedAverage(averagePrice) : "-"}</strong>
            </div>
          );
        }

        return (
          <label
            className={`price-comparator__price${isBest ? " price-comparator__price--best" : ""}${
              isSecond ? " price-comparator__price--second" : ""
            }`}
            key={market}
          >
            <span className="sr-only">{market}</span>
            <input
              value={row.prices[market] ?? ""}
              onChange={(event) => onUpdatePrice(row.id, market, event.target.value)}
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              placeholder="0"
            />
          </label>
        );
      })}
      <span className={`price-comparator__result price-comparator__result--${result.status.toLowerCase()}`}>
        {result.text}
      </span>
      <button className="button ghost price-comparator__remove" type="button" onClick={() => onRemove(row.id)}>
        <Trash2 />
      </button>
    </div>
  );
}

function createAdvancedPriceDrafts(quantity: string): Partial<Record<Market, AdvancedPriceDraft>> {
  const defaultQuantity = getAdvancedQuantityDefault(quantity);
  const defaultPrices = createDefaultAdvancedPrices(parseThousands(defaultQuantity));
  return Object.fromEntries(
    markets.map((market) => [
      market,
      {
        total: "",
        quantity: String(defaultPrices[market]?.quantity || parseThousands(defaultAdvancedQuantity))
      }
    ])
  ) as Partial<Record<Market, AdvancedPriceDraft>>;
}

function getAdvancedQuantityDefault(quantity: string) {
  return String(resolveAdvancedQuantityDefault(parseThousands(quantity), parseThousands(defaultAdvancedQuantity)));
}

function formatAdvancedAverage(value: number) {
  return new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
