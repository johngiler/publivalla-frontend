"use client";

const monthPillClass =
  "shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600";

/**
 * Pastillas de mes por año (título = año, etiquetas = mes abreviado).
 * Con `maxVisibleMonths`: como mucho N pastillas por año, «…» si hay más, sin wrap (cabecera Mis pedidos multi).
 *
 * @param {{
 *   groups: Array<{ year: number, months: string[] }>,
 *   keyPrefix?: string,
 *   className?: string,
 *   maxVisibleMonths?: number,
 * }} props
 */
export function RentalMonthsByYearPills({
  groups,
  keyPrefix = "period",
  className = "mt-2",
  maxVisibleMonths,
}) {
  if (!Array.isArray(groups) || !groups.length) return null;
  const capMonths =
    typeof maxVisibleMonths === "number" && maxVisibleMonths > 0 ? maxVisibleMonths : null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {groups.map(({ year, months }) => {
        const overflow =
          capMonths != null && months.length > capMonths ? months.length - capMonths : 0;
        const visible =
          capMonths != null && overflow > 0 ? months.slice(0, capMonths) : months;
        const rowClass =
          capMonths != null
            ? "mt-1 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden"
            : "mt-1 flex flex-wrap gap-1.5";

        return (
          <div key={`${keyPrefix}-${year}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{year}</p>
            <div className={rowClass}>
              {visible.map((label) => (
                <span key={`${keyPrefix}-${year}-${label}`} className={monthPillClass}>
                  {label}
                </span>
              ))}
              {overflow > 0 ? (
                <span
                  className={`${monthPillClass} min-w-[1.25rem] justify-center px-1.5 text-zinc-500`}
                  aria-label={`${overflow} meses más`}
                  title={`${overflow} meses más`}
                >
                  …
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
