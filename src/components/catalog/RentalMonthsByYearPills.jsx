"use client";

/**
 * Pastillas de mes por año (título = año, etiquetas = mes abreviado).
 * @param {{
 *   groups: Array<{ year: number, months: string[] }>,
 *   keyPrefix?: string,
 *   className?: string,
 * }} props
 */
export function RentalMonthsByYearPills({ groups, keyPrefix = "period", className = "mt-2" }) {
  if (!Array.isArray(groups) || !groups.length) return null;
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {groups.map(({ year, months }) => (
        <div key={`${keyPrefix}-${year}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{year}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {months.map((label) => (
              <span
                key={`${keyPrefix}-${year}-${label}`}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
