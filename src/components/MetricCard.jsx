export function MetricCard({ label, value, detail, tone = 'neutral', icon: Icon }) {
  const isLongValue = String(value ?? '').length > 18;

  return (
    <article className={`metric-card tone-${tone} ${isLongValue ? 'value-long' : ''}`.trim()} title={detail || label}>
      <div className="metric-card-top">
        <span>{label}</span>
        {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      </div>
      <strong>{value}</strong>
    </article>
  );
}
