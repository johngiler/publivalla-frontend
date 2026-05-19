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
  disabledMonthsForBlockPicker,
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

const MONTH_CELL_LAYOUT = "flex items-center justify-center text-center";

/**
 * Selector de meses sueltos (sin secuencia obligatoria); emite tramos contiguos al guardar.
 * @param {{
 *   adSpaceId: string,
 *   pickSync?: { rental_segments?: Array<{ start_date?: string, end_date?: string }>, start_date?: string, end_date?: string } | null,
 *   editingPick?: { start_date?: string, end_date?: string } | null,
 *   onSelectionChange?: (payload: ReturnType<typeof selectionFromLinearIndices>) => void,
 *   readOnly?: boolean,
 * }} props
 */
export function AdminAvailabilityBlockMonthPicker({
  adSpaceId,
  pickSync = null,
  editingPick = null,
  onSelectionChange,
  readOnly = false,
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
      if (readOnly) return;
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
    [disabledByYear, emitSelection, readOnly],
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
      <p className="text-sm text-zinc-500">
        {readOnly
          ? "Sin espacio publicitario asociado."
          : "Selecciona un espacio publicitario para elegir los meses a bloquear."}
      </p>
    );
  }
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Cargando calendario del espacio publicitario…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-700" role="alert">
        No se pudo cargar el calendario del espacio publicitario.
      </p>
    );
  }

  const monthCellClass = (blocked, isSelected) => {
    if (blocked && !isSelected) return DISABLED;
    if (isSelected) return SELECTED;
    if (readOnly) {
      return `${CATALOG_MONTH_AVAILABLE_RING} ${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800`;
    }
    return AVAILABLE;
  };

  return (
    <div className="space-y-4" aria-readonly={readOnly || undefined}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-zinc-900">
          {readOnly ? "Calendario del espacio publicitario" : "Meses a bloquear"}
        </p>
        <CatalogMonthLegend />
      </div>

      {!readOnly && !anySelectable ? (
        <p className="text-sm text-amber-900">
          No quedan meses futuros libres en la ventana del calendario para este espacio publicitario.
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
              const cellClass = `min-h-11 min-w-0 rounded-xl border text-xs font-semibold sm:min-h-10 ${MONTH_CELL_LAYOUT} ${monthCellClass(
                blocked,
                isSelected,
              )} ${readOnly ? "" : "transition-colors"}`;
              if (readOnly) {
                return (
                  <span
                    key={label}
                    aria-label={`${label} ${year}${isSelected ? ", bloqueado en este registro" : blocked ? ", no disponible" : ", libre"}`}
                    className={cellClass}
                  >
                    {label}
                  </span>
                );
              }
              return (
                <button
                  key={label}
                  type="button"
                  disabled={blocked}
                  onClick={() => onMonthClick(year, m)}
                  aria-pressed={isSelected}
                  className={cellClass}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!readOnly && selectionValid ? (
        <div className="flex flex-wrap items-center gap-3">
          <FilterClearAction onClick={reset} label="Limpiar selección" />
        </div>
      ) : null}

      {rangeLabel ? (
        <p className="text-sm text-zinc-700">
          {readOnly ? "Periodo bloqueado: " : "Selección: "}
          <strong className="font-medium text-zinc-900">{rangeLabel}</strong>
          {!readOnly && segmentCount > 1 ? (
            <span className="text-zinc-500">
              {" "}
              ({segmentCount} tramos al guardar)
            </span>
          ) : null}
        </p>
      ) : readOnly ? (
        <p className="text-sm text-zinc-500">Sin meses definidos en este bloqueo.</p>
      ) : (
        <p className="text-sm text-zinc-500">
          Haz clic en cada mes que quieras bloquear; no tienen que ser consecutivos.
        </p>
      )}

      {!readOnly && selectionValid && touchesBlocked ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          Hay meses seleccionados que ya están ocupados. Quítalos de la selección.
        </p>
      ) : null}
    </div>
  );
}
