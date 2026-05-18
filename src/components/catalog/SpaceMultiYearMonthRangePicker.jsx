"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FilterClearAction } from "@/components/admin/AdminListFilters";
import {
  MONTH_SHORT_ES,
  anySelectableMonthInCalendar,
  buildDisabledMonthsByYear,
  catalogAvailabilityYears,
  formatSelectedMonthsLabel,
  isMonthInCartIsoRange,
  isMonthInRentalSegments,
  linearIndicesFromPick,
  monthLinearIndex,
  resolveMonthsOccupiedByYear,
  selectedMonthsTouchOccupied,
  selectionFromLinearIndices,
} from "@/lib/spaceCalendar";
import { highSeasonFromSpace } from "@/lib/highSeasonPricing";
import { lineSubtotalFromSegments, normalizeRentalSegments } from "@/lib/rentalDates";
import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_CART_BASELINE_BG,
  CATALOG_MONTH_CART_BASELINE_RING,
  CATALOG_MONTH_HIGH_SEASON_BG,
  CATALOG_MONTH_HIGH_SEASON_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
} from "@/lib/catalogMonthColors";
import { CatalogMonthLegend } from "@/components/catalog/CatalogMonthLegend";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const DISABLED = `cursor-not-allowed ${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING} text-zinc-400`;
const BASELINE_ONLY = `${CATALOG_MONTH_CART_BASELINE_RING} ${CATALOG_MONTH_CART_BASELINE_BG} text-sky-900 hover:border-sky-500/80 hover:bg-sky-50`;

/**
 * Selector multi-año: meses sueltos (no tienen que ser consecutivos).
 * Emite rental_segments (tramos contiguos) + sobre start/end para compatibilidad.
 */
export function SpaceMultiYearMonthRangePicker({
  space = null,
  monthsOccupiedByYear: byYearProp = null,
  monthlyPriceUsd,
  minMonths = 1,
  onRangeChange,
  pickSync = null,
  cartBaselineIso = null,
  cartBaselineSegments = null,
}) {
  const refDate = useMemo(() => new Date(), []);
  const years = useMemo(() => catalogAvailabilityYears(refDate, space), [refDate, space]);
  const byYear = useMemo(
    () => byYearProp ?? resolveMonthsOccupiedByYear(space, refDate),
    [byYearProp, space, refDate],
  );
  const disabledByYear = useMemo(
    () => buildDisabledMonthsByYear(byYear, years, refDate),
    [byYear, years, refDate],
  );
  const anySelectable = useMemo(
    () => anySelectableMonthInCalendar(years, byYear, refDate),
    [years, byYear, refDate],
  );
  const highSeason = useMemo(() => highSeasonFromSpace(space), [space]);

  const [selected, setSelected] = useState(() => new Set());
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;

  const pickSyncKey = useMemo(() => {
    const idxs = linearIndicesFromPick(pickSync);
    return idxs.join(",");
  }, [pickSync]);

  useEffect(() => {
    const idxs = linearIndicesFromPick(pickSync);
    setSelected((prev) => {
      const prevArr = [...prev].sort((a, b) => a - b);
      if (prevArr.length === idxs.length && prevArr.every((v, i) => v === idxs[i])) {
        return prev;
      }
      return new Set(idxs);
    });
  }, [pickSyncKey]);

  const emitSelection = useCallback((nextSet) => {
    const indices = [...nextSet].sort((a, b) => a - b);
    if (!indices.length) {
      onRangeChangeRef.current?.(null);
      return;
    }
    onRangeChangeRef.current?.(selectionFromLinearIndices(indices));
  }, []);

  const onMonthClick = useCallback(
    (year, m) => {
      if (disabledByYear[year]?.[m - 1]) return;
      const idx = monthLinearIndex(year, m);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        queueMicrotask(() => emitSelection(next));
        return next;
      });
    },
    [disabledByYear, emitSelection],
  );

  const reset = useCallback(() => {
    setSelected(new Set());
    queueMicrotask(() => onRangeChangeRef.current?.(null));
  }, []);

  const indices = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectionValid = indices.length >= minMonths;
  const touchesBlocked = selectionValid && selectedMonthsTouchOccupied(disabledByYear, indices);
  const rentalSegments = useMemo(() => {
    if (!selectionValid) return [];
    const pick = selectionFromLinearIndices(indices);
    return pick?.rental_segments ?? [];
  }, [indices, selectionValid]);

  const price = Number(monthlyPriceUsd);
  const subtotal =
    selectionValid && Number.isFinite(price) && rentalSegments.length
      ? lineSubtotalFromSegments(price, rentalSegments, highSeason)
      : null;
  const rangeLabel = selectionValid ? formatSelectedMonthsLabel(indices) : null;
  const spanMonths = selectionValid ? indices.length : 0;

  const baselineSegments = useMemo(() => {
    if (Array.isArray(cartBaselineSegments) && cartBaselineSegments.length) {
      return cartBaselineSegments;
    }
    if (cartBaselineIso?.start_date && cartBaselineIso?.end_date) {
      return [{ start_date: cartBaselineIso.start_date, end_date: cartBaselineIso.end_date }];
    }
    return null;
  }, [cartBaselineSegments, cartBaselineIso]);

  const selectionMatchesBaseline = useMemo(() => {
    if (!baselineSegments?.length || !selectionValid) return false;
    const a = normalizeRentalSegments({ rental_segments: baselineSegments })
      .map((s) => `${s.start_date}|${s.end_date}`)
      .sort()
      .join(",");
    const b = rentalSegments
      .map((s) => `${s.start_date}|${s.end_date}`)
      .sort()
      .join(",");
    return a === b;
  }, [baselineSegments, rentalSegments, selectionValid]);

  const yearLabel =
    years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-900">
          Calendario {yearLabel ? `(${yearLabel})` : ""}
        </p>
        <CatalogMonthLegend showHighSeason={highSeason.months.length > 0} />
      </div>

      {!anySelectable ? (
        <p className="text-sm text-amber-900">
          No quedan meses futuros disponibles en esta ventana de calendario. Contacta al centro comercial.
        </p>
      ) : null}

      {years.map((year) => (
        <YearGrid
          key={year}
          year={year}
          disabled={disabledByYear[year] ?? Array(12).fill(true)}
          selected={selected}
          baselineSegments={baselineSegments}
          selectionMatchesBaseline={selectionMatchesBaseline}
          highSeasonMonths={highSeason.months}
          onMonthClick={onMonthClick}
        />
      ))}

      {selectionValid ? (
        <div className="flex flex-wrap items-center gap-3">
          <FilterClearAction onClick={reset} label="Limpiar selección" />
        </div>
      ) : null}

      <SummaryFooter rangeLabel={rangeLabel} spanMonths={spanMonths} subtotal={subtotal} />

      {selectionValid && touchesBlocked ? (
        <p className="text-sm font-medium text-red-600">
          La selección incluye meses no disponibles. Quítalos e intenta de nuevo.
        </p>
      ) : null}
      {indices.length > 0 && !selectionValid ? (
        <p className="text-sm text-amber-800">
          Mínimo <strong>{minMonths}</strong> {minMonths === 1 ? "mes" : "meses"} en total. Marca otro mes libre.
        </p>
      ) : null}
    </div>
  );
}


function YearGrid({
  year,
  disabled,
  selected,
  baselineSegments,
  selectionMatchesBaseline,
  highSeasonMonths,
  onMonthClick,
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{year}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-2.5" role="group" aria-label={`Meses de ${year}`}>
        {MONTH_SHORT_ES.map((label, i) => {
          const m = i + 1;
          const blocked = disabled[i];
          const idx = monthLinearIndex(year, m);
          const isSelected = selected.has(idx);
          const inBaseline =
            baselineSegments &&
            (isMonthInRentalSegments(baselineSegments, year, m) ||
              (baselineSegments.length === 1 &&
                baselineSegments[0]?.start_date &&
                isMonthInCartIsoRange(
                  baselineSegments[0].start_date,
                  baselineSegments[0].end_date,
                  year,
                  m,
                )));
          const baselineOnly = inBaseline && !isSelected;
          const isHighSeason =
            !blocked && highSeasonMonths?.includes(m) && !isSelected && !baselineOnly;
          let cellClass = `${CATALOG_MONTH_AVAILABLE_RING} ${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800 hover:border-zinc-400 hover:bg-white`;
          if (!blocked) {
            if (isSelected) {
              cellClass = `${CATALOG_MONTH_SELECTED_RING} ${CATALOG_MONTH_SELECTED_BG} text-[#b45309]`;
              if (baselineSegments && inBaseline && !selectionMatchesBaseline) {
                cellClass += " shadow-[inset_0_0_0_1px_rgba(14,165,233,0.45)]";
              }
            } else if (baselineOnly) {
              cellClass = BASELINE_ONLY;
            } else if (isHighSeason) {
              cellClass = `${CATALOG_MONTH_HIGH_SEASON_RING} ${CATALOG_MONTH_HIGH_SEASON_BG} text-amber-950 hover:border-amber-300`;
            }
          }
          return (
            <button
              key={label}
              type="button"
              disabled={blocked}
              onClick={() => onMonthClick(year, m)}
              aria-pressed={isSelected}
              className={`min-h-11 rounded-xl border text-xs font-semibold transition-colors sm:min-h-10 ${
                blocked ? DISABLED : cellClass
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryFooter({ rangeLabel, spanMonths, subtotal }) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5`}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Meses elegidos</p>
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
              Toca los meses libres que quieras reservar. No tienen que ser consecutivos.
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
      </div>
    </div>
  );
}
