import type { AppTier } from "../../electron/types";

export function TierBadge({ tier }: { tier: AppTier }) {
  return <span className={`tier-badge tier-badge--${tier.toLowerCase()}`}>{tier}</span>;
}
