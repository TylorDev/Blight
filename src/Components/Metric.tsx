import type { ReactNode } from "react";

export function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
