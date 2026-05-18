"use client";

import { useMemo } from "react";

import { SpaceMonthAvailabilityBar } from "@/components/catalog/SpaceMonthAvailabilityBar";
import {
  catalogAvailabilityYears,
  catalogSummaryAvailabilityYears,
  isMonthInCartIsoRange,
  monthBoundsFromIsoInYear,
  resolveMonthsOccupiedByYear,
} from "@/lib/spaceCalendar";

/**
 * Franjas de disponibilidad mensual.
 * - `summary`: solo año actual + etiquetas Ene…Dic (catálogo y resumen de ficha).
 * - `full`: ventana multi-año (reserva usa SpaceMultiYearMonthRangePicker aparte).
 * @param {{
 *   space?: Record<string, unknown> | null,
 *   monthsOccupiedByYear?: Record<number, boolean[]>,
 *   cartStartIso?: string | null,
 *   cartEndIso?: string | null,
 *   className?: string,
 *   showLegend?: boolean,
 *   compact?: boolean,
 *   variant?: 'summary' | 'full',
 * }} props
 */
export function SpaceMultiYearAvailabilityBar({
  space = null,
  monthsOccupiedByYear: byYearProp = null,
  cartStartIso = null,
  cartEndIso = null,
  className = "",
  showLegend = true,
  compact = false,
  variant = "summary",
}) {
  const refDate = useMemo(() => new Date(), []);
  const isSummary = variant === "summary";
  const years = useMemo(
    () =>
      isSummary
        ? catalogSummaryAvailabilityYears(refDate, space)
        : catalogAvailabilityYears(refDate, space),
    [isSummary, refDate, space],
  );
  const byYear = useMemo(() => {
    if (byYearProp) return byYearProp;
    return resolveMonthsOccupiedByYear(space, refDate, years);
  }, [byYearProp, space, refDate, years]);

  return (
    <div className={`${compact ? "space-y-2" : "space-y-3"} ${className}`}>
      {years.map((year, i) => {
        const cartMonthsInYear =
          cartStartIso && cartEndIso
            ? monthBoundsFromIsoInYear(cartStartIso, cartEndIso, year)
            : null;
        const hasCartInYear =
          cartStartIso &&
          cartEndIso &&
          Array.from({ length: 12 }, (_, m) => m + 1).some((month) =>
            isMonthInCartIsoRange(cartStartIso, cartEndIso, year, month),
          );
        const yearTitleClass = compact
          ? "mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
          : "mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500";

        return (
          <div key={year}>
            <p className={yearTitleClass}>{year}</p>
            <SpaceMonthAvailabilityBar
              monthsOccupied={byYear[year]}
              availabilityYear={year}
              cartMonthsInYear={hasCartInYear ? cartMonthsInYear : null}
              showLegend={showLegend && i === years.length - 1}
              showMonthLabels={isSummary}
              legendPosition={isSummary ? "above" : "below"}
            />
          </div>
        );
      })}
    </div>
  );
}
