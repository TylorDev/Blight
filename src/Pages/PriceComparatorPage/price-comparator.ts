import type { AppTier, Category } from "../../../electron/types";

export const markets = ["Thetford", "Martlock", "Bridgewatch", "Lymhurst", "Fort Sterling"] as const;

export type Market = (typeof markets)[number];
export type CompareDirection = "NORMAL" | "REVERSA";
export type CompareMode = "LOWEST" | "HIGHEST";
export type MaterialKey = `${Category}:${AppTier}`;

export type PriceMap = Partial<Record<Market, number>>;
export type AdvancedPriceMap = Partial<Record<Market, { total: number; quantity: number }>>;

export type PriceComparisonResult =
  | {
      status: "INSUFFICIENT_DATA";
      bestMarkets: Market[];
      secondMarkets: Market[];
      text: string;
    }
  | {
      status: "ALL_EQUAL";
      bestMarkets: Market[];
      secondMarkets: Market[];
      text: string;
    }
  | {
      status: "NEAR_EQUAL";
      bestMarkets: Market[];
      bestPrice: number;
      secondMarkets: Market[];
      secondPrice: number;
      percentage: number;
      text: string;
    }
  | {
      status: "COMPARED";
      bestMarkets: Market[];
      bestPrice: number;
      secondMarkets: Market[];
      secondPrice: number;
      percentage: number;
      text: string;
    };

const reverseMarkets = [...markets].reverse() as Market[];
const nearEqualPercentageThreshold = 1.5;

export function getOrderedMarkets(startMarket: Market, direction: CompareDirection): Market[] {
  const orderedMarkets = direction === "NORMAL" ? markets : reverseMarkets;
  const startIndex = orderedMarkets.indexOf(startMarket);

  if (startIndex === -1) {
    return [...orderedMarkets];
  }

  return [...orderedMarkets.slice(startIndex), ...orderedMarkets.slice(0, startIndex)];
}

export function getTemplateMaterialKeys(category: Category, templateTiers: AppTier[]): MaterialKey[] {
  return templateTiers.map((tier) => `${category}:${tier}` as MaterialKey);
}

export function getMissingTemplateMaterialKeys(
  category: Category,
  templateTiers: AppTier[],
  existingMaterialKeys: MaterialKey[]
): MaterialKey[] {
  const existing = new Set(existingMaterialKeys);
  return getTemplateMaterialKeys(category, templateTiers).filter((materialKey) => !existing.has(materialKey));
}

export function calculateAveragePrice(total: number, quantity: number) {
  if (!Number.isFinite(total) || !Number.isFinite(quantity) || total <= 0 || quantity <= 0) {
    return 0;
  }

  return Math.trunc(total / quantity);
}

export function advancedPricesToPriceMap(advancedPrices: AdvancedPriceMap): PriceMap {
  return Object.fromEntries(
    markets.map((market) => {
      const advancedPrice = advancedPrices[market];
      return [market, calculateAveragePrice(advancedPrice?.total ?? 0, advancedPrice?.quantity ?? 0)];
    })
  ) as PriceMap;
}

export function createDefaultAdvancedPrices(quantity: number): AdvancedPriceMap {
  return Object.fromEntries(markets.map((market) => [market, { total: 0, quantity }])) as AdvancedPriceMap;
}

export function resolveAdvancedQuantityDefault(quantity: number, fallbackQuantity = 100) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return fallbackQuantity;
  }

  return quantity;
}

export function compareMarketPrices(prices: PriceMap, mode: CompareMode): PriceComparisonResult {
  const validPrices = markets
    .map((market) => ({ market, price: prices[market] ?? 0 }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0);

  if (validPrices.length < 2) {
    return {
      status: "INSUFFICIENT_DATA",
      bestMarkets: validPrices.map((item) => item.market),
      secondMarkets: [],
      text: "No hay suficientes datos para comparar."
    };
  }

  const uniquePrices = [...new Set(validPrices.map((item) => item.price))].sort((first, second) =>
    mode === "LOWEST" ? first - second : second - first
  );

  if (uniquePrices.length === 1) {
    return {
      status: "ALL_EQUAL",
      bestMarkets: validPrices.map((item) => item.market),
      secondMarkets: [],
      text: "No existe diferencia entre mercados."
    };
  }

  const bestPrice = uniquePrices[0];
  const secondPrice = uniquePrices[1];
  const bestMarkets = validPrices.filter((item) => item.price === bestPrice).map((item) => item.market);
  const secondMarkets = validPrices.filter((item) => item.price === secondPrice).map((item) => item.market);
  const percentage =
    mode === "LOWEST" ? ((secondPrice - bestPrice) / secondPrice) * 100 : ((bestPrice - secondPrice) / secondPrice) * 100;

  if (percentage < nearEqualPercentageThreshold) {
    return {
      status: "NEAR_EQUAL",
      bestMarkets,
      bestPrice,
      secondMarkets,
      secondPrice,
      percentage,
      text: `${formatMarkets(bestMarkets)}: ${formatPrice(bestPrice)} y ${formatMarkets(secondMarkets)}: ${formatPrice(
        secondPrice
      )} son iguales para comparar (${formatPercentage(percentage)}% de diferencia).`
    };
  }

  const comparisonLabel = mode === "LOWEST" ? "mas barato" : "mas caro";

  return {
    status: "COMPARED",
    bestMarkets,
    bestPrice,
    secondMarkets,
    secondPrice,
    percentage,
    text: `${formatMarkets(bestMarkets)}: ${formatPrice(bestPrice)} tiene un precio ${formatPercentage(
      percentage
    )}% ${comparisonLabel} que la segunda opcion, ${formatMarkets(secondMarkets)}: ${formatPrice(
      secondPrice
    )}.`
  };
}

export function formatMarkets(resultMarkets: Market[]) {
  return resultMarkets.join("/");
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatPercentage(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value);
}
