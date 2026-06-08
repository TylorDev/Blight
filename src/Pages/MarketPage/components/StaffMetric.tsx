type StaffMetricProps = {
  label: string;
  value: string;
};

export function StaffMetric({ label, value }: StaffMetricProps) {
  return (
    <article className="staff-market-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
