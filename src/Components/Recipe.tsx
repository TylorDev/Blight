import type { AppTier, LeftoverCreditView, RecipeId } from "../../electron/types";
import { categoryLabels, getEffectiveRecipeMaterials, type ManualLeftoverQuantities } from "../app-data";

export function Recipe({
  className = "recipe",
  tier,
  recipeId,
  leftoverCredits = [],
  manualLeftovers = {}
}: {
  className?: string;
  tier: AppTier;
  recipeId?: RecipeId;
  leftoverCredits?: LeftoverCreditView[];
  manualLeftovers?: ManualLeftoverQuantities;
}) {
  return (
    <div className={className}>
      {getEffectiveRecipeMaterials(tier, recipeId, leftoverCredits, manualLeftovers).map((material) => (
        <span key={material.category}>
          {material.quantity} {categoryLabels[material.category]}
        </span>
      ))}
    </div>
  );
}
