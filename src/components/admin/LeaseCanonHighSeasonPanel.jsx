"use client";

import { leaseHighSeasonMonthsForCenter, MONTH_LABELS_ES } from "@/lib/highSeasonPricing";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/**
 * Canon de arrendamiento: meses de temporada alta (+30 %), solo lectura.
 * @param {{ slug?: string, name?: string, className?: string }} props
 */
export function LeaseCanonHighSeasonPanel({ slug, name, className = "" }) {
  const months = leaseHighSeasonMonthsForCenter({ slug, name });
  const selected = new Set(months);

  return (
    <div className={className}>
      <p className="text-xs text-zinc-500">Canon +30 % en los meses resaltados (según centro).</p>
      <div
        className="mt-3 flex flex-wrap gap-2"
        aria-label="Meses de temporada alta"
      >
        {MONTH_LABELS_ES.map((label, i) => {
          const m = i + 1;
          const on = selected.has(m);
          return (
            <span
              key={label}
              className={`min-w-[2.75rem] ${ROUNDED_CONTROL} border px-2 py-1.5 text-center text-xs font-semibold ${
                on
                  ? "border-amber-300/90 bg-amber-50 text-amber-950 ring-1 ring-amber-200/80"
                  : "border-zinc-100 bg-zinc-50 text-zinc-400"
              }`}
              aria-hidden={!on}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
