import { describe, expect, it } from "vitest";
import {
  calculateLeftoverCreditValue,
  calculateTicketPreview,
  formatAvailableAtFromClosedAt,
  formatDate,
  getRecipeFocusCost,
  getDefaultFilledDiariesDiscount,
  getDefaultFilledDiariesQuantity,
  getDefaultTicketTax,
  getRecentLeftoverQuantitySuggestions,
  recipeIds,
  ticketRecipes
} from "../../src/app-data";
import { createLeftoverCredit, createStockItem, createTicket } from "./mock-blight";

describe("app-data", () => {
  it("formats ticket availability 72 hours after closing", () => {
    expect(formatAvailableAtFromClosedAt("2026-01-01T10:30:00.000Z")).toBe(formatDate("2026-01-04T10:30:00.000Z"));
  });

  it("calculates leftover credit value from current stock average cost", () => {
    const stock = [
      createStockItem({ category: "TABLAS", tier: "T5", averageCost: 1000 }),
      createStockItem({ category: "TELAS", tier: "T5", averageCost: 2000 })
    ];

    expect(calculateLeftoverCreditValue(stock, "T5", "TABLAS", 12)).toBe(12000);
    expect(calculateLeftoverCreditValue(stock, "T5", "TELAS", 7)).toBe(14000);
    expect(calculateLeftoverCreditValue([], "T5", "TABLAS", 12)).toBe(0);
  });

  it("reduces ticket preview materials with pending leftovers", () => {
    const preview = calculateTicketPreview(
      [
        createStockItem({ category: "TABLAS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "TELAS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "ARTEFACTOS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "DIARIOS_VACIOS", quantity: 100, averageCost: 1000 })
      ],
      "T5",
      100,
      "RECETA_1",
      [
        createLeftoverCredit({ category: "TABLAS", quantity: 10, value: 10000 }),
        createLeftoverCredit({ category: "TELAS", quantity: 7, value: 7000 })
      ]
    );

    expect(preview.materials.find((material) => material.category === "TABLAS")?.quantity).toBe(63);
    expect(preview.materials.find((material) => material.category === "TELAS")?.quantity).toBe(37);
  });

  it("reduces ticket preview materials with manual leftovers", () => {
    const preview = calculateTicketPreview(
      [
        createStockItem({ category: "TABLAS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "TELAS", quantity: 100, averageCost: 2000 }),
        createStockItem({ category: "ARTEFACTOS", quantity: 100, averageCost: 3000 }),
        createStockItem({ category: "DIARIOS_VACIOS", quantity: 100, averageCost: 4000 })
      ],
      "T5",
      100,
      "RECETA_1",
      [],
      { TABLAS: 10, TELAS: 7 }
    );

    expect(preview.materials.find((material) => material.category === "TABLAS")).toMatchObject({
      quantity: 63,
      subtotal: 63000
    });
    expect(preview.materials.find((material) => material.category === "TELAS")).toMatchObject({
      quantity: 37,
      subtotal: 74000
    });
  });

  it("never reduces effective recipe materials below zero with pending leftovers", () => {
    const preview = calculateTicketPreview(
      [],
      "T5",
      100,
      "RECETA_1",
      [
        createLeftoverCredit({ category: "TABLAS", quantity: 50, value: 50000 }),
        createLeftoverCredit({ category: "TELAS", quantity: 50, value: 50000 })
      ],
      { TABLAS: 50, TELAS: 50 }
    );

    expect(preview.materials.find((material) => material.category === "TABLAS")?.quantity).toBe(0);
    expect(preview.materials.find((material) => material.category === "TELAS")?.quantity).toBe(0);
  });

  it.each([-1, 0, Number.NaN])("uses zero effective tax for invalid raw tax %s", (rawTax) => {
    const preview = calculateTicketPreview([], "T5", rawTax);

    expect(preview.craftingTaxUnit).toBe(0);
    expect(preview.craftingTaxTotal).toBe(0);
  });

  it("defines recipe 2 as the default 7 staff recipe with 50 cloths", () => {
    expect(ticketRecipes.RECETA_2.staffQuantity).toBe(7);
    expect(ticketRecipes.RECETA_2.materials).toEqual([
      { category: "TABLAS", quantity: 83 },
      { category: "TELAS", quantity: 50 },
      { category: "ARTEFACTOS", quantity: 7 }
    ]);
    expect(getDefaultFilledDiariesQuantity("T5", "RECETA_2")).toBe(22);
    expect(getRecipeFocusCost("RECETA_2")).toBe(7035);
  });

  it("defines the bonus 10 percent recipe", () => {
    expect(recipeIds).toContain("RECETA_BONUS_10");
    expect(ticketRecipes.RECETA_BONUS_10).toMatchObject({
      id: "RECETA_BONUS_10",
      label: "Bonus 10%",
      staffQuantity: 7,
      diaryByTier: {
        T5: 22,
        T6: 16,
        T7: 10,
        T8: 5
      },
      materials: [
        { category: "TABLAS", quantity: 67 },
        { category: "TELAS", quantity: 40 },
        { category: "ARTEFACTOS", quantity: 7 }
      ]
    });
    expect(getDefaultFilledDiariesQuantity("T5", "RECETA_BONUS_10")).toBe(22);
    expect(getRecipeFocusCost("RECETA_BONUS_10")).toBe(7035);
  });

  it("defines the payday recipe", () => {
    expect(recipeIds).toContain("RECETA_PAYDAY");
    expect(ticketRecipes.RECETA_PAYDAY).toMatchObject({
      id: "RECETA_PAYDAY",
      label: "Payday",
      staffQuantity: 12,
      diaryByTier: {
        T5: 37,
        T6: 28,
        T7: 18,
        T8: 9
      },
      materials: [
        { category: "TABLAS", quantity: 129 },
        { category: "TELAS", quantity: 77 },
        { category: "ARTEFACTOS", quantity: 12 }
      ]
    });
    expect(getDefaultFilledDiariesQuantity("T5", "RECETA_PAYDAY")).toBe(37);
    expect(getDefaultFilledDiariesQuantity("T8", "RECETA_PAYDAY")).toBe(9);
    expect(getRecipeFocusCost("RECETA_PAYDAY")).toBe(12060);
  });

  it("uses the most recent closed ticket tax across tiers", () => {
    const tickets = [
      createTicket({ status: "CERRADO", tax: 200, closedAt: "2026-01-01T00:00:00.000Z" }),
      createTicket({ status: "ABIERTO", tax: 999, closedAt: null, openedAt: "2026-01-03T00:00:00.000Z" }),
      createTicket({ status: "CERRADO", tier: "T8", tax: 465, closedAt: "2026-01-02T00:00:00.000Z" })
    ];

    expect(getDefaultTicketTax(tickets)).toBe(465);
    expect(getDefaultTicketTax([])).toBe(1);
  });

  it("uses diary and discount defaults for the close form", () => {
    const tickets = [
      createTicket({
        status: "CERRADO",
        tier: "T5",
        filledDiariesDiscount: 1500,
        closedAt: "2026-01-01T00:00:00.000Z"
      }),
      createTicket({
        status: "CERRADO",
        tier: "T6",
        filledDiariesDiscount: 3500,
        closedAt: "2026-01-02T00:00:00.000Z"
      })
    ];

    expect(getDefaultFilledDiariesQuantity("T6", "RECETA_1")).toBe(14);
    expect(getDefaultFilledDiariesDiscount(tickets, "T6")).toBe(3500);
    expect(getDefaultFilledDiariesDiscount(tickets, "T7")).toBe(0);
  });

  it("suggests recent positive leftover quantities once per tier and category", () => {
    const tickets = [
      createTicket({
        status: "CERRADO",
        tier: "T5",
        leftoverTablesQuantity: 4,
        leftoverClothsQuantity: 9,
        closedAt: "2026-01-03T00:00:00.000Z"
      }),
      createTicket({
        status: "CERRADO",
        tier: "T5",
        leftoverTablesQuantity: 4,
        leftoverClothsQuantity: 5,
        closedAt: "2026-01-02T00:00:00.000Z"
      }),
      createTicket({
        status: "CERRADO",
        tier: "T5",
        leftoverTablesQuantity: 2,
        leftoverClothsQuantity: 0,
        closedAt: "2026-01-01T00:00:00.000Z"
      }),
      createTicket({
        status: "CERRADO",
        tier: "T6",
        leftoverTablesQuantity: 8,
        leftoverClothsQuantity: 8,
        closedAt: "2026-01-04T00:00:00.000Z"
      })
    ];

    expect(getRecentLeftoverQuantitySuggestions(tickets, "T5", "TABLAS")).toEqual([4, 2]);
    expect(getRecentLeftoverQuantitySuggestions(tickets, "T5", "TELAS")).toEqual([9, 5]);
  });
});
