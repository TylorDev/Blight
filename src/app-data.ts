import type {
  AppTier,
  Category,
  FabricationTicketView,
  LeftoverCreditView,
  PurchaseVendorView,
  RecipeId,
  StaffMovementTypeView,
  StaffQualityView,
  StockItemView
} from "../electron/types";
import { createEmptyPurchaseCalculation, type PurchaseCalculationState } from "./purchase-calculator";

export const categories: Category[] = ["TABLAS", "TELAS", "DIARIOS_VACIOS", "ARTEFACTOS"];
export const tiers: AppTier[] = ["T5", "T6", "T7", "T8"];
export const staffQualities: StaffQualityView[] = [
  "NORMAL",
  "BUENA",
  "NOTABLE",
  "SOBRESALIENTE",
  "OBRA_MAESTRA"
];
export const purchaseVendors: PurchaseVendorView[] = ["PARTICULAR", "MERCADO"];

export const tierLabels: Record<AppTier, string> = {
  T5: "T5",
  T6: "T6",
  T7: "T7",
  T8: "T8"
};

export const categoryLabels: Record<Category, string> = {
  TABLAS: "Tablas",
  TELAS: "Telas",
  DIARIOS_VACIOS: "Diarios Vacios",
  ARTEFACTOS: "Artefactos"
};

export const staffQualityLabels: Record<StaffQualityView, string> = {
  NORMAL: "Normal",
  BUENA: "Buena",
  NOTABLE: "Notable",
  SOBRESALIENTE: "Sobresaliente",
  OBRA_MAESTRA: "Obra Maestra"
};

export const purchaseVendorLabels: Record<PurchaseVendorView, string> = {
  PARTICULAR: "Particular",
  MERCADO: "Mercado"
};

export const staffQualityToneClasses: Record<StaffQualityView, string> = {
  NORMAL: "quality-tone--normal",
  BUENA: "quality-tone--buena",
  NOTABLE: "quality-tone--notable",
  SOBRESALIENTE: "quality-tone--sobresaliente",
  OBRA_MAESTRA: "quality-tone--obra-maestra"
};

export const staffItemPowerByTierAndQuality: Record<AppTier, Record<StaffQualityView, number>> = {
  T5: {
    NORMAL: 1560,
    BUENA: 1580,
    NOTABLE: 1600,
    SOBRESALIENTE: 1620,
    OBRA_MAESTRA: 1660
  },
  T6: {
    NORMAL: 1580,
    BUENA: 1600,
    NOTABLE: 1620,
    SOBRESALIENTE: 1640,
    OBRA_MAESTRA: 1680
  },
  T7: {
    NORMAL: 1600,
    BUENA: 1620,
    NOTABLE: 1640,
    SOBRESALIENTE: 1660,
    OBRA_MAESTRA: 1700
  },
  T8: {
    NORMAL: 1620,
    BUENA: 1640,
    NOTABLE: 1660,
    SOBRESALIENTE: 1680,
    OBRA_MAESTRA: 1720
  }
};

export const staffMovementTypeLabels: Record<StaffMovementTypeView, string> = {
  PRODUCCION: "Produccion",
  AJUSTE: "Ajuste",
  VENTA: "Venta"
};

export const recipeIds: RecipeId[] = ["RECETA_1", "RECETA_2"];
export const defaultRecipeId: RecipeId = "RECETA_2";
export const FOCUS_PER_STAFF = 1005;

export type TicketRecipe = {
  id: RecipeId;
  label: string;
  staffQuantity: number;
  diaryByTier: Record<AppTier, number>;
  materials: Array<{ category: Exclude<Category, "DIARIOS_VACIOS">; quantity: number }>;
};

export const ticketRecipes: Record<RecipeId, TicketRecipe> = {
  RECETA_1: {
    id: "RECETA_1",
    label: "Receta 1",
    staffQuantity: 6,
    diaryByTier: {
      T5: 19,
      T6: 14,
      T7: 8,
      T8: 4
    },
    materials: [
      { category: "TABLAS", quantity: 73 },
      { category: "TELAS", quantity: 44 },
      { category: "ARTEFACTOS", quantity: 6 }
    ]
  },
  RECETA_2: {
    id: "RECETA_2",
    label: "Receta 2",
    staffQuantity: 7,
    diaryByTier: {
      T5: 22,
      T6: 16,
      T7: 10,
      T8: 5
    },
    materials: [
      { category: "TABLAS", quantity: 83 },
      { category: "TELAS", quantity: 50 },
      { category: "ARTEFACTOS", quantity: 7 }
    ]
  }
};

export const staffQuantity = ticketRecipes[defaultRecipeId].staffQuantity;
export const craftingTaxBase = 10.08;
export const craftingTaxMultipliers: Record<AppTier, number> = {
  T5: 1,
  T6: 1.0858,
  T7: 1.1578,
  T8: 1.2729
};

export type ManualLeftoverQuantities = Partial<Record<Extract<Category, "TABLAS" | "TELAS">, number>>;

export type FilterValue<T extends string> = T | "TODOS";
export type BulkPurchaseDraft = Record<Category, PurchaseCalculationState>;

export function createEmptyBulkDraft() {
  return Object.fromEntries(
    categories.map((category) => [category, createEmptyPurchaseCalculation()])
  ) as BulkPurchaseDraft;
}

export function getRecipeFocusCost(recipeId: RecipeId) {
  return ticketRecipes[recipeId].staffQuantity * FOCUS_PER_STAFF;
}

export function getTicketRecipeId(ticket: { recipeId?: RecipeId | null; staffQuantity: number }): RecipeId {
  return ticket.recipeId ?? (ticket.staffQuantity === ticketRecipes.RECETA_1.staffQuantity ? "RECETA_1" : "RECETA_2");
}

export function getEffectiveRecipeMaterials(
  tier: AppTier,
  recipeId: RecipeId = defaultRecipeId,
  leftoverCredits: LeftoverCreditView[] = [],
  manualLeftovers: ManualLeftoverQuantities = {}
) {
  const leftoverQuantities = leftoverCredits.reduce(
    (totals, credit) => {
      if (credit.category === "TABLAS" || credit.category === "TELAS") {
        totals[credit.category] += credit.quantity;
      }
      return totals;
    },
    { TABLAS: 0, TELAS: 0 }
  );
  leftoverQuantities.TABLAS += normalizeLeftoverQuantity(manualLeftovers.TABLAS);
  leftoverQuantities.TELAS += normalizeLeftoverQuantity(manualLeftovers.TELAS);

  return [
    ...ticketRecipes[recipeId].materials.map((material) => {
      if (material.category !== "TABLAS" && material.category !== "TELAS") {
        return material;
      }

      return {
        ...material,
        quantity: Math.max(0, material.quantity - leftoverQuantities[material.category])
      };
    }),
    { category: "DIARIOS_VACIOS" as Category, quantity: ticketRecipes[recipeId].diaryByTier[tier] }
  ];
}

export function calculateTicketPreview(
  stock: StockItemView[],
  tier: AppTier,
  rawTax: number,
  recipeId: RecipeId = defaultRecipeId,
  leftoverCredits: LeftoverCreditView[] = [],
  manualLeftovers: ManualLeftoverQuantities = {}
) {
  const taxValue = Number.isFinite(rawTax) && rawTax > 0 ? rawTax : 0;
  const recipe = ticketRecipes[recipeId];
  const materials = getEffectiveRecipeMaterials(tier, recipeId, leftoverCredits, manualLeftovers).map((material) => {
    const stockItem = stock.find((item) => item.category === material.category && item.tier === tier);
    const averageCost = stockItem?.averageCost ?? 0;
    return {
      ...material,
      averageCost,
      subtotal: material.quantity * averageCost
    };
  });
  const materialTotal = materials.reduce((total, material) => total + material.subtotal, 0);
  const craftingTaxUnit = taxValue * craftingTaxBase * craftingTaxMultipliers[tier];
  const craftingTaxTotal = craftingTaxUnit * recipe.staffQuantity;
  const investmentTotal = materialTotal + craftingTaxTotal;

  return {
    materials,
    staffQuantity: recipe.staffQuantity,
    focusCost: getRecipeFocusCost(recipeId),
    materialTotal,
    craftingTaxUnit,
    craftingTaxTotal,
    investmentTotal,
    unitCost: investmentTotal / recipe.staffQuantity
  };
}

function normalizeLeftoverQuantity(quantity: number | undefined) {
  return Number.isFinite(quantity) && quantity && quantity > 0 ? Math.trunc(quantity) : 0;
}

export function getDefaultTicketTax(tickets: FabricationTicketView[]) {
  return getLatestClosedTicket(tickets)?.tax ?? 1;
}

export function getDefaultFilledDiariesQuantity(tier: AppTier, recipeId: RecipeId = defaultRecipeId) {
  return ticketRecipes[recipeId].diaryByTier[tier];
}

export function getDefaultFilledDiariesDiscount(tickets: FabricationTicketView[], tier: AppTier) {
  return getLatestClosedTicket(tickets, tier)?.filledDiariesDiscount ?? 0;
}

export function getRecentLeftoverQuantitySuggestions(
  tickets: FabricationTicketView[],
  tier: AppTier,
  category: Extract<Category, "TABLAS" | "TELAS">
) {
  const seen = new Set<number>();
  return getClosedTicketsByRecentDate(tickets)
    .filter((ticket) => ticket.tier === tier)
    .map((ticket) => (category === "TABLAS" ? ticket.leftoverTablesQuantity : ticket.leftoverClothsQuantity))
    .filter((quantity) => {
      if (quantity < 1 || seen.has(quantity)) {
        return false;
      }

      seen.add(quantity);
      return true;
    });
}

function getLatestClosedTicket(tickets: FabricationTicketView[], tier?: AppTier) {
  return getClosedTicketsByRecentDate(tickets).find((ticket) => !tier || ticket.tier === tier);
}

function getClosedTicketsByRecentDate(tickets: FabricationTicketView[]) {
  return tickets
    .filter((ticket) => ticket.status === "CERRADO" && ticket.closedAt)
    .slice()
    .sort((first, second) => new Date(second.closedAt ?? 0).getTime() - new Date(first.closedAt ?? 0).getTime());
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
