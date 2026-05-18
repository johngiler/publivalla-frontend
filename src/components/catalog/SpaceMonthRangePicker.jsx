"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FilterClearAction } from "@/components/admin/AdminListFilters";
import { CatalogMonthLegend } from "@/components/catalog/CatalogMonthLegend";
import {
  MONTH_SHORT_ES,
  mergeOccupiedWithPastMonths,
  monthBoundsFromIsoInYear,
  monthRangeToIsoDates,
  normalizeMonthsOccupied,
  rangeTouchesOccupiedMonth,
  selectableMonthsExistInYear,
} from "@/lib/spaceCalendar";
import { contractMonthsInclusive } from "@/lib/rentalDates";
import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_CART_BASELINE_BG,
  CATALOG_MONTH_CART_BASELINE_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
} from "@/lib/catalogMonthColors";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const DISABLED = `cursor-not-allowed ${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING} text-zinc-400`;
const BASELINE_ONLY = `${CATALOG_MONTH_CART_BASELINE_RING} ${CATALOG_MONTH_CART_BASELINE_BG} text-sky-900 hover:border-sky-500/80 hover:bg-sky-50`;

/**
 * Selector de meses dentro del año del API. El contrato sigue siendo un intervalo continuo
 * (start/end del checkout); puedes ampliar tocando fuera del rango, acortar en los extremos
 * o quitar un mes del medio (se conserva el tramo libre más largo sin incluir ese mes).
 * @param {{
 *   availabilityYear: number,
 *   monthsOccupied?: unknown,
 *   monthlyPriceUsd: string | number,
 *   minMonths?: number,
 *   onRangeChange?: (payload: { start_date: string, end_date: string } | null) => void,
 *   pickSync?: { start_date: string, end_date: string } | null,
 *   cartBaselineMonths?: { lo: number, hi: number } | null,
 * }} props
 */
export function SpaceMonthRangePicker({
  availabilityYear,
  monthsOccupied,
  monthlyPriceUsd,
  minMonths = 1,
  onRangeChange,
  pickSync = null,
  cartBaselineMonths = null,
}) {
  const refDate = useMemo(() => new Date(), []);
  const occ = useMemo(() => normalizeMonthsOccupied(monthsOccupied), [monthsOccupied]);
  const disabled = useMemo(
    () => mergeOccupiedWithPastMonths(availabilityYear, occ, refDate),
    [availabilityYear, occ, refDate],
  );
  const anySelectable = useMemo(
    () => selectableMonthsExistInYear(availabilityYear, occ, refDate),
    [availabilityYear, occ, refDate],
  );

  const [startM, setStartM] = useState(null);
  const [endM, setEndM] = useState(null);

  useEffect(() => {
    if (!pickSync?.start_date || !pickSync?.end_date) {
      setStartM(null);
      setEndM(null);
      return;
    }
    const b = monthBoundsFromIsoInYear(pickSync.start_date, pickSync.end_date, availabilityYear);
    if (!b) {
      setStartM(null);
      setEndM(null);
      return;
    }
    setStartM(b.lo);
    setEndM(b.hi);
  }, [availabilityYear, pickSync?.start_date, pickSync?.end_date]);

  const applyRange = useCallback(
    (nlo, nhi) => {
      setStartM(nlo);
      setEndM(nhi);
      onRangeChange?.(monthRangeToIsoDates(availabilityYear, nlo, nhi));
    },
    [availabilityYear, onRangeChange],
  );

  const pickRangeAfterRemovingInterior = useCallback(
    (lo, hi, m) => {
      const leftLo = lo;
      const leftHi = m - 1;
      const rightLo = m + 1;
      const rightHi = hi;
      const leftSpan = leftHi >= leftLo ? leftHi - leftLo + 1 : 0;
      const rightSpan = rightHi >= rightLo ? rightHi - rightLo + 1 : 0;
      const leftOk =
        leftSpan > 0 && !rangeTouchesOccupiedMonth(availabilityYear, leftLo, leftHi, disabled);
      const rightOk =
        rightSpan > 0 && !rangeTouchesOccupiedMonth(availabilityYear, rightLo, rightHi, disabled);
      if (leftOk && !rightOk) return [leftLo, leftHi];
      if (!leftOk && rightOk) return [rightLo, rightHi];
      if (leftOk && rightOk) {
        if (leftSpan > rightSpan) return [leftLo, leftHi];
        if (rightSpan > leftSpan) return [rightLo, rightHi];
        return [leftLo, leftHi];
      }
      return null;
    },
    [availabilityYear, disabled],
  );

  const onMonthClick = useCallback(
    (m) => {
      if (disabled[m - 1]) return;
      if (startM == null || endM == null) {
        applyRange(m, m);
        return;
      }
      const lo = Math.min(startM, endM);
      const hi = Math.max(startM, endM);

      if (m < lo || m > hi) {
        applyRange(Math.min(lo, m), Math.max(hi, m));
        return;
      }

      if (m === lo && m === hi) {
        setStartM(null);
        setEndM(null);
        onRangeChange?.(null);
        return;
      }

      if (m === lo) {
        applyRange(lo + 1, hi);
        return;
      }
      if (m === hi) {
        applyRange(lo, hi - 1);
        return;
      }

      const split = pickRangeAfterRemovingInterior(lo, hi, m);
      if (split) {
        applyRange(split[0], split[1]);
        return;
      }

      const leftLo = lo;
      const leftHi = m - 1;
      const rightLo = m + 1;
      const rightHi = hi;
      const leftSpan = leftHi >= leftLo ? leftHi - leftLo + 1 : 0;
      const rightSpan = rightHi >= rightLo ? rightHi - rightLo + 1 : 0;
      if (leftSpan === 0 && rightSpan > 0) applyRange(rightLo, rightHi);
      else if (rightSpan === 0 && leftSpan > 0) applyRange(leftLo, leftHi);
    },
    [applyRange, disabled, endM, onRangeChange, pickRangeAfterRemovingInterior, startM],
  );

  const reset = useCallback(() => {
    setStartM(null);
    setEndM(null);
    onRangeChange?.(null);
  }, [onRangeChange]);

  const rangeValid = startM != null && endM != null;
  const lo = rangeValid ? Math.min(startM, endM) : null;
  const hi = rangeValid ? Math.max(startM, endM) : null;
  const dates =
    lo != null && hi != null ? monthRangeToIsoDates(availabilityYear, lo, hi) : null;
  const spanMonths = dates ? contractMonthsInclusive(dates.start_date, dates.end_date) : 0;
  const touchesBlocked =
    lo != null && hi != null && rangeTouchesOccupiedMonth(availabilityYear, lo, hi, disabled);
  const meetsMin = spanMonths >= minMonths;
  const price = Number(monthlyPriceUsd);
  const subtotal =
    meetsMin && Number.isFinite(price) ? Math.round(price * spanMonths * 100) / 100 : null;

  const rangeLabel =
    lo != null && hi != null
      ? `${MONTH_SHORT_ES[lo - 1]} – ${MONTH_SHORT_ES[hi - 1]} ${availabilityYear}`
      : null;

  const blo = cartBaselineMonths?.lo ?? null;
  const bhi = cartBaselineMonths?.hi ?? null;
  const hasCartBaseline = blo != null && bhi != null;
  const selectionMatchesBaseline =
    hasCartBaseline && lo != null && hi != null && lo === blo && hi === bhi;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-900">
          Calendario de meses <span className="text-zinc-500">({availabilityYear})</span>
        </p>
        <CatalogMonthLegend />
      </div>

      {!anySelectable ? (
        <p className="text-sm text-amber-900">
          En {availabilityYear} no quedan meses futuros disponibles en este calendario. Contacta al centro comercial.
        </p>
      ) : null}

      <div className="grid grid-cols-4 gap-2 sm:gap-2.5" role="group" aria-label={`Meses de ${availabilityYear}`}>
        {MONTH_SHORT_ES.map((label, i) => {
          const m = i + 1;
          const blocked = disabled[i];
          const inRange = lo != null && hi != null && m >= lo && m <= hi;
          const inBaseline = hasCartBaseline && m >= blo && m <= bhi;
          const baselineOnly = inBaseline && !inRange;
          let cellClass = `${CATALOG_MONTH_AVAILABLE_RING} ${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800 hover:border-zinc-400 hover:bg-white`;
          if (!blocked) {
            if (inRange) {
              cellClass = `${CATALOG_MONTH_SELECTED_RING} ${CATALOG_MONTH_SELECTED_BG} text-[#b45309]`;
              if (hasCartBaseline && inBaseline && !selectionMatchesBaseline) {
                cellClass += " shadow-[inset_0_0_0_1px_rgba(14,165,233,0.45)]";
              }
            } else if (baselineOnly) {
              cellClass = BASELINE_ONLY;
            }
          }
          return (
            <button
              key={label}
              type="button"
              disabled={blocked}
              onClick={() => onMonthClick(m)}
              aria-pressed={inRange}
              title={
                baselineOnly
                  ? "Periodo en tu pedido (referencia)"
                  : blocked && !occ[i]
                    ? "Mes no disponible para nuevas reservas"
                    : undefined
              }
              className={`min-h-11 rounded-xl border text-xs font-semibold transition-colors sm:min-h-10 ${
                blocked ? DISABLED : cellClass
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {rangeValid ? (
        <div className="flex flex-wrap items-center gap-3">
          <FilterClearAction onClick={reset} label="Limpiar selección" />
        </div>
      ) : null}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5`}
      >
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rango elegido</p>
          <p className="text-sm font-medium text-zinc-900">
            {rangeLabel ? (
              <>
                {rangeLabel}
                <span className="ml-2 tabular-nums text-zinc-600">
                  ({spanMonths} {spanMonths === 1 ? "mes" : "meses"})
                </span>
              </>
            ) : (
              <span className="text-zinc-500">
                Elige meses seguidos. Toca fuera del bloque para ampliar; en un extremo para acortar.
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total estimado</p>
          <p className="text-xl font-semibold tabular-nums text-[#c2410c] sm:text-2xl">
            {subtotal != null
              ? new Intl.NumberFormat("es-VE", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(subtotal)
              : "—"}
          </p>
          {subtotal != null ? (
            <p className="mt-0.5 text-[11px] text-zinc-500">Precio mensual × meses</p>
          ) : null}
        </div>
      </div>

      {rangeValid && touchesBlocked ? (
        <p className="text-sm font-medium text-red-600">El rango incluye meses no disponibles. Ajusta la selección.</p>
      ) : null}
      {rangeValid && !touchesBlocked && !meetsMin ? (
        <p className="text-sm text-amber-800">
          Mínimo <strong>{minMonths}</strong> {minMonths === 1 ? "mes" : "meses"} seguidos. Amplía el bloque o
          vuelve a elegir.
        </p>
      ) : null}
    </div>
  );
}
