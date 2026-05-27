"use client";

import useSWR from "swr";

import { SpaceMultiYearMonthRangePicker } from "@/components/catalog/SpaceMultiYearMonthRangePicker";
import { getSpace } from "@/services/api";

/**
 * Calendario multi-año en solo lectura (mismo componente que la reserva en ficha de toma).
 * @param {{
 *   adSpaceId?: string | number | null,
 *   pickSync?: object | null,
 *   editingPick?: { start_date?: string, end_date?: string } | null,
 *   periodLabel?: string | null,
 * }} props
 */
export function AdminBlockViewAvailabilityCalendar({
  adSpaceId,
  pickSync = null,
  editingPick = null,
  periodLabel = null,
}) {
  const id = adSpaceId != null && adSpaceId !== "" ? String(adSpaceId) : null;
  const { data: space, error, isLoading } = useSWR(
    id ? ["admin-block-view-space", id] : null,
    () => getSpace(id),
    { revalidateOnFocus: false },
  );

  return (
    <>
      {!id ? (
        <p className="text-sm text-zinc-500">Sin espacio publicitario asociado.</p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-500">Cargando calendario del espacio publicitario…</p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          No se pudo cargar el calendario del espacio publicitario.
        </p>
      ) : (
        <SpaceMultiYearMonthRangePicker
          space={space}
          monthlyPriceUsd={space?.monthly_price_usd}
          minMonths={1}
          readOnly
          readOnlyVariant="availabilityBlock"
          pickSync={pickSync}
          editingPick={editingPick}
          readOnlyPeriodLabel={periodLabel}
        />
      )}
    </>
  );
}
