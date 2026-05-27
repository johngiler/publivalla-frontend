"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FilterClearAction } from "@/components/admin/AdminListFilters";
import {
  MONTH_SHORT_ES,
  anySelectableMonthInCalendar,
  buildDisabledMonthsByYear,
  catalogAvailabilityYears,
  disabledMonthsForBlockPicker,
  formatSelectedMonthsLabel,
  isMonthInCartIsoRange,
  isMonthInRentalSegments,
  linearIndicesFromPick,
  monthLinearIndex,
  resolveClientMonthsHighlightByYear,
  resolveMonthsAdminBlockedByYear,
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
  CATALOG_MONTH_ACTIVE_BG,
  CATALOG_MONTH_ACTIVE_RING,
  CATALOG_MONTH_RESERVED_BG,
  CATALOG_MONTH_RESERVED_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_BLOCKED_FORBIDDEN_BG,
  CATALOG_MONTH_BLOCKED_FORBIDDEN_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
  CATALOG_MONTH_SELECTION_LABEL,
} from "@/lib/catalogMonthColors";
import { CatalogMonthLegend } from "@/components/catalog/CatalogMonthLegend";
import { useCatalogSpaceWithClientMonths } from "@/hooks/useCatalogSpaceWithClientMonths";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const DISABLED = `cursor-not-allowed ${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING} text-zinc-400`;
const BLOCK_FORBIDDEN = `cursor-default ${CATALOG_MONTH_BLOCKED_FORBIDDEN_BG} ${CATALOG_MONTH_BLOCKED_FORBIDDEN_RING} text-red-800`;
const RESERVED_DISABLED = `cursor-default ${CATALOG_MONTH_RESERVED_RING} ${CATALOG_MONTH_RESERVED_BG} text-sky-900`;
const ACTIVE_DISABLED = `cursor-default ${CATALOG_MONTH_ACTIVE_RING} ${CATALOG_MONTH_ACTIVE_BG} text-emerald-900`;
const BASELINE_ONLY = `${CATALOG_MONTH_CART_BASELINE_RING} ${CATALOG_MONTH_CART_BASELINE_BG} text-[#b45309] hover:border-[#d98e32]/90 hover:bg-white`;

/** Alineación común de celdas de mes (botón o solo lectura). */
const MONTH_CELL_LAYOUT = "flex items-center justify-center text-center";

function MonthForbiddenIcon({ className = "h-3.5 w-3.5 shrink-0" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
  readOnly = false,
  editingPick = null,
  readOnlyPeriodLabel = null,
  /** Solo vista admin de bloqueo de disponibilidad: bloqueos del admin en rojo con icono. */
  readOnlyVariant = "default",
  selectionLabel = CATALOG_MONTH_SELECTION_LABEL,
}) {
  const blockForbiddenView = readOnly && readOnlyVariant === "availabilityBlock";
  const spaceWithClient = useCatalogSpaceWithClientMonths(space);
  const refDate = useMemo(() => new Date(), []);
  const years = useMemo(
    () => catalogAvailabilityYears(refDate, spaceWithClient),
    [refDate, spaceWithClient],
  );
  const byYear = useMemo(
    () => byYearProp ?? resolveMonthsOccupiedByYear(spaceWithClient, refDate),
    [byYearProp, spaceWithClient, refDate],
  );
  const clientHighlight = useMemo(
    () => resolveClientMonthsHighlightByYear(spaceWithClient, refDate, years),
    [spaceWithClient, refDate, years],
  );
  const hasReservedMonths = useMemo(
    () =>
      clientHighlight
        ? Object.values(clientHighlight.reserved).some((flags) => flags.some(Boolean))
        : false,
    [clientHighlight],
  );
  const hasActiveMonths = useMemo(
    () =>
      clientHighlight
        ? Object.values(clientHighlight.active).some((flags) => flags.some(Boolean))
        : false,
    [clientHighlight],
  );
  const disabledByYear = useMemo(() => {
    const base = buildDisabledMonthsByYear(byYear, years, refDate);
    if (readOnly && editingPick) {
      return disabledMonthsForBlockPicker(base, years, editingPick);
    }
    return base;
  }, [byYear, years, refDate, readOnly, editingPick]);
  const adminBlockedByYear = useMemo(() => {
    if (!blockForbiddenView) return null;
    return resolveMonthsAdminBlockedByYear(spaceWithClient, refDate, years);
  }, [blockForbiddenView, spaceWithClient, refDate, years]);
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
      if (readOnly) return;
      if (blockForbiddenView && adminBlockedByYear?.[year]?.[m - 1]) return;
      if (disabledByYear[year]?.[m - 1]) return;
      if (clientHighlight?.active?.[year]?.[m - 1]) return;
      if (clientHighlight?.reserved?.[year]?.[m - 1]) return;
      const idx = monthLinearIndex(year, m);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        queueMicrotask(() => emitSelection(next));
        return next;
      });
    },
    [blockForbiddenView, adminBlockedByYear, disabledByYear, clientHighlight, emitSelection, readOnly],
  );

  const reset = useCallback(() => {
    setSelected(new Set());
    queueMicrotask(() => onRangeChangeRef.current?.(null));
  }, []);

  const indices = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectionValid = readOnly ? indices.length > 0 : indices.length >= minMonths;
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
  const displayRangeLabel =
    readOnly && readOnlyPeriodLabel?.trim()
      ? readOnlyPeriodLabel.trim()
      : rangeLabel;

  return (
    <div className="space-y-6" aria-readonly={readOnly || undefined}>
      <div
        className={
          blockForbiddenView
            ? "flex justify-end"
            : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        {!blockForbiddenView ? (
          <p className="text-sm font-semibold text-zinc-900">
            Calendario {yearLabel ? `(${yearLabel})` : ""}
          </p>
        ) : null}
        <CatalogMonthLegend
          showReserved={!readOnly && hasReservedMonths}
          showActive={!readOnly && hasActiveMonths}
          showHighSeason={!readOnly && highSeason.months.length > 0}
          showBlockedForbidden={blockForbiddenView}
          showSelection={!blockForbiddenView}
          selectionLabel={selectionLabel}
        />
      </div>

      {!readOnly && !anySelectable ? (
        <p className="text-sm text-amber-900">
          No quedan meses futuros disponibles en esta ventana de calendario. Contacta al centro comercial.
        </p>
      ) : null}

      {years.map((year) => (
        <YearGrid
          key={year}
          year={year}
          disabled={disabledByYear[year] ?? Array(12).fill(true)}
          clientMonthsReserved={clientHighlight?.reserved?.[year] ?? null}
          clientMonthsActive={clientHighlight?.active?.[year] ?? null}
          selected={selected}
          baselineSegments={baselineSegments}
          selectionMatchesBaseline={selectionMatchesBaseline}
          highSeasonMonths={highSeason.months}
          onMonthClick={onMonthClick}
          readOnly={readOnly}
          blockForbiddenView={blockForbiddenView}
          adminBlocked={
            blockForbiddenView
              ? (adminBlockedByYear?.[year] ?? Array(12).fill(false))
              : null
          }
        />
      ))}

      {!readOnly && selectionValid ? (
        <div className="flex flex-wrap items-center gap-3">
          <FilterClearAction onClick={reset} label="Limpiar selección" />
        </div>
      ) : null}

      {readOnly ? (
        <ReadOnlyPeriodFooter
          title="Periodo bloqueado"
          rangeLabel={displayRangeLabel}
          emptyHint="Sin meses definidos en este bloqueo."
        />
      ) : (
        <SummaryFooter rangeLabel={rangeLabel} spanMonths={spanMonths} subtotal={subtotal} />
      )}

      {!readOnly && selectionValid && touchesBlocked ? (
        <p className="text-sm font-medium text-red-600">
          La selección incluye meses no disponibles. Quítalos e intenta de nuevo.
        </p>
      ) : null}
      {!readOnly && indices.length > 0 && !selectionValid ? (
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
  clientMonthsReserved,
  clientMonthsActive,
  selected,
  baselineSegments,
  selectionMatchesBaseline,
  highSeasonMonths,
  onMonthClick,
  readOnly = false,
  blockForbiddenView = false,
  adminBlocked = null,
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{year}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-2.5" role="group" aria-label={`Meses de ${year}`}>
        {MONTH_SHORT_ES.map((label, i) => {
          const m = i + 1;
          const idx = monthLinearIndex(year, m);
          const isSelected = selected.has(idx);
          const blocked = disabled[i] && !(readOnly && isSelected);
          const isAdminBlocked =
            blockForbiddenView && Boolean(adminBlocked?.[i]);
          const showForbidden = isAdminBlocked;
          const showUnavailable = blockForbiddenView
            ? blocked && !isAdminBlocked
            : blocked;
          const isActive = !readOnly && Boolean(clientMonthsActive?.[i]);
          const isReserved = !readOnly && !isActive && Boolean(clientMonthsReserved?.[i]);
          const isClientMonth = isActive || isReserved;
          const notSelectable = blocked || isClientMonth;
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
            !notSelectable &&
            highSeasonMonths?.includes(m) &&
            !isSelected &&
            !baselineOnly;
          let cellClass = `${CATALOG_MONTH_AVAILABLE_RING} ${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800 hover:border-zinc-400 hover:bg-white`;
          if (readOnly && isSelected && !blockForbiddenView) {
            cellClass = `${CATALOG_MONTH_SELECTED_RING} ${CATALOG_MONTH_SELECTED_BG} text-[#b45309]`;
          } else if (!notSelectable) {
            if (isSelected) {
              cellClass = `${CATALOG_MONTH_SELECTED_RING} ${CATALOG_MONTH_SELECTED_BG} text-[#b45309]`;
              if (baselineSegments && inBaseline && !selectionMatchesBaseline) {
                cellClass += " shadow-[inset_0_0_0_1px_rgba(217,142,50,0.45)]";
              }
            } else if (baselineOnly) {
              cellClass = BASELINE_ONLY;
            } else if (isHighSeason) {
              cellClass = `${CATALOG_MONTH_HIGH_SEASON_RING} ${CATALOG_MONTH_HIGH_SEASON_BG} text-amber-950 hover:border-amber-300`;
            }
          }
          const blockedStyle = showForbidden
            ? BLOCK_FORBIDDEN
            : showUnavailable
              ? DISABLED
              : null;
          const cellClassName = `min-h-11 min-w-0 rounded-xl border text-xs font-semibold sm:min-h-10 ${MONTH_CELL_LAYOUT} ${
            isActive
              ? ACTIVE_DISABLED
              : isReserved
                ? RESERVED_DISABLED
                : blockedStyle ?? cellClass
          } ${readOnly ? "" : "transition-colors"} ${
            showForbidden ? "flex-col gap-0.5 py-1" : ""
          }`;

          if (readOnly) {
            return (
              <span
                key={label}
                aria-label={`${label} ${year}${
                  showForbidden
                    ? blockForbiddenView && isSelected
                      ? ", bloqueado en este registro"
                      : ", bloqueado"
                    : showUnavailable
                      ? ", no disponible"
                      : isSelected
                        ? ", en carrito"
                        : ", libre"
                }`}
                className={cellClassName}
              >
                {showForbidden ? <MonthForbiddenIcon /> : null}
                <span className={showForbidden ? "text-[10px] leading-none" : undefined}>{label}</span>
              </span>
            );
          }

          return (
            <button
              key={label}
              type="button"
              disabled={notSelectable}
              onClick={() => onMonthClick(year, m)}
              aria-pressed={isSelected}
              title={
                isActive ? "Activa" : isReserved ? "Reservado" : undefined
              }
              className={cellClassName}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlyPeriodFooter({ title, rangeLabel, emptyHint }) {
  return (
    <div className={`${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">
        {rangeLabel ? rangeLabel : <span className="text-zinc-500">{emptyHint}</span>}
      </p>
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
