import { describe, expect, it } from "vitest";
import {
  advancedPricesToPriceMap,
  calculateAveragePrice,
  compareMarketPrices,
  createDefaultAdvancedPrices,
  getMissingTemplateMaterialKeys,
  getOrderedMarkets,
  getTemplateMaterialKeys,
  resolveAdvancedQuantityDefault,
  type PriceMap
} from "../../src/Pages/PriceComparatorPage/price-comparator";

describe("price-comparator", () => {
  it("finds the lowest price and percentage difference against the second option", () => {
    const result = compareMarketPrices(
      {
        Martlock: 50,
        Bridgewatch: 40,
        Lymhurst: 51,
        "Fort Sterling": 54,
        Thetford: 43
      },
      "LOWEST"
    );

    expect(result.status).toBe("COMPARED");
    expect(result.bestMarkets).toEqual(["Bridgewatch"]);
    expect(result.secondMarkets).toEqual(["Thetford"]);
    if (result.status === "COMPARED") {
      expect(result.percentage).toBeCloseTo(6.9767, 4);
    }
  });

  it("finds the highest price and percentage difference against the second option", () => {
    const result = compareMarketPrices(
      {
        Martlock: 50,
        Bridgewatch: 40,
        Lymhurst: 51,
        "Fort Sterling": 54,
        Thetford: 43
      },
      "HIGHEST"
    );

    expect(result.status).toBe("COMPARED");
    expect(result.bestMarkets).toEqual(["Fort Sterling"]);
    expect(result.secondMarkets).toEqual(["Lymhurst"]);
    if (result.status === "COMPARED") {
      expect(result.percentage).toBeCloseTo(5.88235, 4);
    }
  });

  it("returns all markets tied for the best price", () => {
    const result = compareMarketPrices(
      {
        Martlock: 40,
        Bridgewatch: 40,
        Lymhurst: 51,
        "Fort Sterling": 54,
        Thetford: 43
      },
      "LOWEST"
    );

    expect(result.status).toBe("COMPARED");
    expect(result.bestMarkets).toEqual(["Martlock", "Bridgewatch"]);
    expect(result.secondMarkets).toEqual(["Thetford"]);
  });

  it("returns all markets tied for the second option", () => {
    const result = compareMarketPrices(
      {
        Martlock: 15,
        Bridgewatch: 56,
        Lymhurst: 45,
        "Fort Sterling": 45,
        Thetford: 64
      },
      "LOWEST"
    );

    expect(result.status).toBe("COMPARED");
    expect(result.bestMarkets).toEqual(["Martlock"]);
    expect(result.secondMarkets).toEqual(["Lymhurst", "Fort Sterling"]);
  });

  it("ignores missing and zero prices", () => {
    const result = compareMarketPrices(
      {
        Martlock: 0,
        Bridgewatch: 56,
        Thetford: 64
      },
      "HIGHEST"
    );

    expect(result.status).toBe("COMPARED");
    expect(result.bestMarkets).toEqual(["Thetford"]);
    expect(result.secondMarkets).toEqual(["Bridgewatch"]);
  });

  it("reports insufficient data when only one price is valid", () => {
    const result = compareMarketPrices({ Thetford: 64 } as PriceMap, "LOWEST");

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.text).toBe("No hay suficientes datos para comparar.");
  });

  it("reports no difference when all valid prices are equal", () => {
    const result = compareMarketPrices(
      {
        Martlock: 45,
        Lymhurst: 45,
        "Fort Sterling": 45
      },
      "LOWEST"
    );

    expect(result.status).toBe("ALL_EQUAL");
    expect(result.bestMarkets).toEqual(["Martlock", "Lymhurst", "Fort Sterling"]);
    expect(result.text).toBe("No existe diferencia entre mercados.");
  });

  it("treats the best and second option as equal when the difference is under 1.5 percent", () => {
    const result = compareMarketPrices(
      {
        Thetford: 1000,
        Martlock: 1010,
        Bridgewatch: 1200
      },
      "LOWEST"
    );

    expect(result.status).toBe("NEAR_EQUAL");
    expect(result.bestMarkets).toEqual(["Thetford"]);
    expect(result.secondMarkets).toEqual(["Martlock"]);
    expect(result.text).toContain("son iguales para comparar");
  });

  it("rotates normal and reverse market order from the selected start market", () => {
    expect(getOrderedMarkets("Bridgewatch", "NORMAL")).toEqual([
      "Bridgewatch",
      "Lymhurst",
      "Fort Sterling",
      "Thetford",
      "Martlock"
    ]);
    expect(getOrderedMarkets("Bridgewatch", "REVERSA")).toEqual([
      "Bridgewatch",
      "Martlock",
      "Thetford",
      "Fort Sterling",
      "Lymhurst"
    ]);
  });

  it("builds four tier rows for a material template", () => {
    expect(getTemplateMaterialKeys("TABLAS", ["T5", "T6", "T7", "T8"])).toEqual([
      "TABLAS:T5",
      "TABLAS:T6",
      "TABLAS:T7",
      "TABLAS:T8"
    ]);
  });

  it("skips template materials that already exist", () => {
    expect(getMissingTemplateMaterialKeys("TABLAS", ["T5", "T6", "T7", "T8"], ["TABLAS:T5", "TABLAS:T7"])).toEqual([
      "TABLAS:T6",
      "TABLAS:T8"
    ]);
  });

  it("keeps existing rows from other material templates untouched", () => {
    expect(getMissingTemplateMaterialKeys("TELAS", ["T5", "T6", "T7", "T8"], ["TABLAS:T5", "TELAS:T6"])).toEqual([
      "TELAS:T5",
      "TELAS:T7",
      "TELAS:T8"
    ]);
  });

  it("calculates advanced average prices from total and quantity", () => {
    expect(calculateAveragePrice(250000, 100)).toBe(2500);
  });

  it("ignores advanced average prices with missing total or zero quantity", () => {
    expect(calculateAveragePrice(0, 100)).toBe(0);
    expect(calculateAveragePrice(250000, 0)).toBe(0);
  });

  it("converts advanced market totals and quantities to a price map", () => {
    expect(
      advancedPricesToPriceMap({
        Martlock: { total: 250000, quantity: 100 },
        Bridgewatch: { total: 180000, quantity: 60 }
      })
    ).toMatchObject({
      Martlock: 2500,
      Bridgewatch: 3000
    });
  });

  it("creates default advanced market quantities for templates", () => {
    expect(createDefaultAdvancedPrices(100)).toMatchObject({
      Thetford: { total: 0, quantity: 100 },
      Martlock: { total: 0, quantity: 100 },
      Bridgewatch: { total: 0, quantity: 100 },
      Lymhurst: { total: 0, quantity: 100 },
      "Fort Sterling": { total: 0, quantity: 100 }
    });
  });

  it("resolves advanced row quantity defaults with fallback", () => {
    expect(resolveAdvancedQuantityDefault(150)).toBe(150);
    expect(resolveAdvancedQuantityDefault(0)).toBe(100);
    expect(resolveAdvancedQuantityDefault(Number.NaN)).toBe(100);
  });
});
