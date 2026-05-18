"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { FilterClearAction } from "@/components/admin/AdminListFilters";
import { CatalogMonthLegend } from "@/components/catalog/CatalogMonthLegend";
import {
  MONTH_SHORT_ES,
  anySelectableMonthInCalendar,
  buildDisabledMonthsByYear,
  catalogAvailabilityYears,
  formatSelectedMonthsLabel,
  linearIndicesFromPick,
  monthLinearIndex,
  rentalSegmentsToLinearIndices,
  resolveMonthsOccupiedByYear,
  selectedMonthsTouchOccupied,
  selectionFromLinearIndices,
} from "@/lib/spaceCalendar";
import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
} from "@/lib/catalogMonthColors";
import { getSpace } from "@/services/api";

const DISABLED = `cursor-not-allowed ${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING} text-zinc-400`;
const SELECTED = `${CATALOG_MONTH_SELECTED_RING} ${CATALOG_MONTH_SELECTED_BG} text-[#b45309]`;
const AVAILABLE = `${CATALOG_MONTH_AVAILABLE_RING} ${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800 hover:border-zinc-400 hover:bg-white`;

/**
 * Meses elegibles al editar el bloqueo actual (no contar como «no disponible» en el picker).
 * @param {Record<number, boolean[]>} disabledByYear
 * @param {number[]} years
 * @param {{ rental_segments?: Array<{ start_date?: string, end_date?: string }>, start_date?: string, end_date?: string } | null} editingPick
 */
function disabledMonthsForBlockPicker(disabledByYear, years, editingPick) {
  if (!editingPick) return disabledByYear;
  const editable = new Set(
    rentalSegmentsToLinearIndices(
      editingPick.rental_segments?.length
        ? editingPick.rental_segments
        : [{ start_date: editingPick.start_date, end_date: editingPick.end_date }],
    ),
  );
  /** @type {Record<number, boolean[]>} */
  const out = {};
  for (const y of years) {
    const row = disabledByYear[y] ?? Array(12).fill(true);
    out[y] = row.map((busy, i) => {
      if (!busy) return false;
      const idx = monthLinearIndex(y, i + 1);
      return editable.has(idx) ? false : true;
    });
  }
  return out;
}

/**
 * Selector de meses sueltos (sin secuencia obligatoria); emite tramos contiguos al guardar.
 * @param {{
 *   adSpaceId: string,
 *   pickSync?: { rental_segments?: Array<{ start_date?: string, end_date?: string }>, start_date?: string, end_date?: string } | null,
 *   editingPick?: { start_date?: string, end_date?: string } | null,
 *   onSelectionChange?: (payload: ReturnType<typeof selectionFromLinearIndices>) => void,
 * }} props
 */
export function AdminAvailabilityBlockMonthPicker({
  adSpaceId,
  pickSync = null,
  editingPick = null,
  onSelectionChange,
}) {
  const refDate = useMemo(() => new Date(), []);
  const pickKey = useMemo(() => {
    const idxs = linearIndicesFromPick(pickSync);
    return idxs.join(",");
  }, [pickSync]);

  const { data: space, error, isLoading } = useSWR(
    adSpaceId ? ["admin-block-picker-space", adSpaceId] : null,
    () => getSpace(adSpaceId),
    { revalidateOnFocus: false },
  );

  const years = useMemo(
    () => (space ? catalogAvailabilityYears(refDate, space) : []),
    [refDate, space],
  );
  const byYear = useMemo(
    () => (space ? resolveMonthsOccupiedByYear(space, refDate, years) : {}),
    [space, refDate, years],
  );
  const disabledByYear = useMemo(() => {
    const base = buildDisabledMonthsByYear(byYear, years, refDate);
    return disabledMonthsForBlockPicker(base, years, editingPick);
  }, [byYear, years, refDate, editingPick]);
  const anySelectable = useMemo(
    () => (years.length ? anySelectableMonthInCalendar(years, byYear, refDate) : false),
    [years, byYear, refDate],
  );

  const [selected, setSelected] = useState(() => new Set());
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const emitSelection = useCallback((nextSet) => {
    const indices = [...nextSet].sort((a, b) => a - b);
    if (!indices.length) {
      onSelectionChangeRef.current?.(null);
      return;
    }
    onSelectionChangeRef.current?.(selectionFromLinearIndices(indices));
  }, []);

  useEffect(() => {
    const idxs = linearIndicesFromPick(pickSync);
    setSelected((prev) => {
      const prevArr = [...prev].sort((a, b) => a - b);
      if (prevArr.length === idxs.length && prevArr.every((v, i) => v === idxs[i])) {
        return prev;
      }
      return new Set(idxs);
    });
  }, [pickKey, adSpaceId]);

  const onMonthClick = useCallback(
    (year, month) => {
      if (disabledByYear[year]?.[month - 1]) return;
      const idx = monthLinearIndex(year, month);
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
    queueMicrotask(() => onSelectionChangeRef.current?.(null));
  }, []);

  const indices = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectionValid = indices.length > 0;
  const touchesBlocked =
    selectionValid && selectedMonthsTouchOccupied(disabledByYear, indices);
  const rangeLabel = selectionValid ? formatSelectedMonthsLabel(indices) : null;
  const segmentCount = selectionValid
    ? (selectionFromLinearIndices(indices)?.rental_segments?.length ?? 0)
    : 0;

  if (!adSpaceId) {
    return (
      <p className="text-sm text-zinc-500">Selecciona una toma para elegir los meses a bloquear.</p>
    );
  }
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Cargando calendario de la toma…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-700" role="alert">
        No se pudo cargar el calendario de la toma.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-900">Meses a bloquear</p>
        <CatalogMonthLegend />
      </div>

      {!anySelectable ? (
        <p className="text-sm text-amber-900">
          No quedan meses futuros libres en la ventana del calendario para esta toma.
        </p>
      ) : null}

      {years.map((year) => (
        <div key={year}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{year}</p>
          <div
            className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-2.5"
            role="group"
            aria-label={`Meses de ${year}`}
          >
            {MONTH_SHORT_ES.map((label, i) => {
              const m = i + 1;
              const blocked = disabledByYear[year]?.[i];
              const idx = monthLinearIndex(year, m);
              const isSelected = selected.has(idx);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={blocked}
                  onClick={() => onMonthClick(year, m)}
                  aria-pressed={isSelected}
                  className={`min-h-11 rounded-xl border text-xs font-semibold transition-colors sm:min-h-10 ${
                    blocked ? DISABLED : isSelected ? SELECTED : AVAILABLE
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectionValid ? (
        <div className="flex flex-wrap items-center gap-3">
          <FilterClearAction onClick={reset} label="Limpiar selección" />
        </div>
      ) : null}

      {rangeLabel ? (
        <p className="text-sm text-zinc-700">
          Selección: <strong className="font-medium text-zinc-900">{rangeLabel}</strong>
          {segmentCount > 1 ? (
            <span className="text-zinc-500">
              {" "}
              ({segmentCount} tramos al guardar)
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Haz clic en cada mes que quieras bloquear; no tienen que ser consecutivos.
        </p>
      )}

      {selectionValid && touchesBlocked ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          Hay meses seleccionados que ya están ocupados. Quítalos de la selección.
        </p>
      ) : null}
    </div>
  );
}
