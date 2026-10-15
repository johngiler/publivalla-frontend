const PILL_BY_KEY = {
  pending: "border-amber-200/90 bg-amber-50 text-amber-950",
  approved: "border-sky-200/90 bg-sky-50 text-sky-900",
  renewed: "border-emerald-200/90 bg-emerald-50 text-emerald-900",
  rejected: "border-zinc-200/90 bg-zinc-100 text-zinc-700",
  unknown: "border-zinc-200/90 bg-zinc-50 text-zinc-800",
};

/**
 * Indicador de la última renovación de una línea de contrato.
 * @param {{
 *   renewal?: { badge_key?: string, badge_label?: string, months_label?: string, status_label?: string } | null,
 *   count?: number,
 *   compact?: boolean,
 *   className?: string,
 * }} props
 */
export function RenewalStatusPill({
  renewal = null,
  count = null,
  compact = false,
  className = "",
}) {
  if (!renewal) return null;
  const key = String(renewal.badge_key || "unknown");
  const baseLabel =
    (typeof renewal.badge_label === "string" && renewal.badge_label.trim()) ||
    (typeof renewal.status_label === "string" && renewal.status_label.trim()) ||
    "Renovación";
  const n = Number(count);
  const label =
    Number.isFinite(n) && n > 1 ? `${baseLabel} · ${n}` : baseLabel;
  const tone = PILL_BY_KEY[key] || PILL_BY_KEY.unknown;
  const title =
    typeof renewal.months_label === "string" && renewal.months_label.trim()
      ? `${label}: ${renewal.months_label.trim()}`
      : label;
  const size = compact
    ? "px-2 py-0.5 text-[10px]"
    : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex max-w-full rounded-full border font-semibold ${size} ${tone} ${className}`.trim()}
      title={title}
    >
      {label}
    </span>
  );
}
