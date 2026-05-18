"use client";

import { useMemo } from "react";

import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
  CATALOG_MONTH_SELECTION_LABEL,
} from "@/lib/catalogMonthColors";
import {
  futureAvailableMonthsCount,
  futureMonthsInYear,
  isMonthInRentalSegments,
  isMonthPastOrCurrentInYear,
  mergeOccupiedWithPastMonths,
  MONTH_SHORT_ES,
  normalizeMonthsOccupied,
} from "@/lib/spaceCalendar";

import { CatalogMonthLegend } from "@/components/catalog/CatalogMonthLegend";

/**
 * @param {number} availabilityYear
 * @param {number} month1to12
 * @param {boolean} busyFromApi
 * @param {Date} ref
 */
function monthSegmentTitle(
  availabilityYear,
  month1to12,
  busyFromApi,
  inCartRange,
  ref,
) {
  if (inCartRange && !busyFromApi) return CATALOG_MONTH_SELECTION_LABEL;
  if (isMonthPastOrCurrentInYear(availabilityYear, month1to12, ref)) {
    return "Ocupado o pasado";
  }
  if (busyFromApi) return "Ocupado";
  return "Disponible";
}

/**
 * @param {{ lo: number, hi: number } | null | undefined} cartMonths
 * @param {number} month1to12
 */
function isMonthInCartRange(cartMonths, month1to12) {
  if (!cartMonths || cartMonths.lo == null || cartMonths.hi == null)
    return false;
  return month1to12 >= cartMonths.lo && month1to12 <= cartMonths.hi;
}

/**
 * Franja de 12 meses; leyenda solo al pasar el cursor o al enfocar el bloque.
 * @param {{
 *   monthsOccupied?: unknown,
 *   availabilityYear?: number,
 *   cartMonthsInYear?: { lo: number, hi: number } | null,
 *   cartRentalSegments?: Array<{ start_date?: string, end_date?: string }> | null,
 *   className?: string,
 *   showLegend?: boolean,
 *   showMonthLabels?: boolean,
 *   legendPosition?: "above" | "below",
 * }} props
 */
export function SpaceMonthAvailabilityBar({
  monthsOccupied,
  availabilityYear,
  cartMonthsInYear = null,
  cartRentalSegments = null,
  className = "",
  showLegend = true,
  showMonthLabels = false,
  legendPosition = "below",
}) {
  const refDate = useMemo(() => new Date(), []);
  const year = Number(availabilityYear) || refDate.getFullYear();
  const occRaw = normalizeMonthsOccupied(monthsOccupied);
  const displayFlags = useMemo(
    () => mergeOccupiedWithPastMonths(year, occRaw, refDate),
    [year, occRaw, refDate],
  );
  const freeFuture = futureAvailableMonthsCount(year, occRaw, refDate);
  const futureTotal = futureMonthsInYear(year, refDate);
  const ariaLabel = `Disponibilidad anual: ${freeFuture} de ${futureTotal} meses por delante disponibles. Pasa el cursor para ver la leyenda de colores.`;

  const legendAbove = legendPosition === "above";

  return (
    <div
      className={`group/avail relative outline-none ${className}`}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex min-w-0 gap-1" role="presentation">
        {displayFlags.map((busy, i) => {
          const month = i + 1;
          const inCart =
            Array.isArray(cartRentalSegments) && cartRentalSegments.length
              ? isMonthInRentalSegments(cartRentalSegments, year, month)
              : isMonthInCartRange(cartMonthsInYear, month);
          const segmentClass = busy
            ? `${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING}`
            : inCart
              ? `${CATALOG_MONTH_SELECTED_BG} ${CATALOG_MONTH_SELECTED_RING}`
              : `${CATALOG_MONTH_AVAILABLE_BG} ${CATALOG_MONTH_AVAILABLE_RING}`;
          return (
            <div
              key={i}
              className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5"
              title={monthSegmentTitle(year, month, occRaw[i], inCart, refDate)}
            >
              <span
                className={`box-border h-2.5 w-full rounded-md ${segmentClass}`}
              />
              {showMonthLabels ? (
                <span className="truncate text-center text-[9px] font-medium leading-none text-zinc-500">
                  {MONTH_SHORT_ES[i]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {showLegend ? (
        <div
          className={`pointer-events-none absolute left-0 z-[100] w-max max-w-[min(100vw-2rem,22rem)] opacity-0 transition-opacity duration-150 group-hover/avail:opacity-100 group-focus-within/avail:opacity-100 motion-reduce:transition-none ${
            legendAbove ? "bottom-full pb-1.5" : "top-full pt-1.5"
          }`}
        >
          <div className="rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-zinc-950/5">
            <CatalogMonthLegend
              stacked
              title="Disponibilidad mensual"
              showSelection={Boolean(
                cartRentalSegments?.length || cartMonthsInYear,
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
