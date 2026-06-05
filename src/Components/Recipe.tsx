import type { AppTier } from "../../electron/types";
import { recipeDiary } from "../app-data";

export function Recipe({ tier }: { tier: AppTier }) {
  return (
    <div className="recipe">
      <span>73 Tablas</span>
      <span>44 Telas</span>
      <span>6 Artefactos</span>
      <span>{recipeDiary[tier]} Diarios</span>
    </div>
  );
}
