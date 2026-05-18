"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FilterClearAction } from "@/components/admin/AdminListFilters";
import { adminField, adminLabel } from "@/components/admin/adminFormStyles";
import {
  contractDaysInclusive,
  dailyRateFromMonthly,
  firstAllowedDailyStartIso,
  formatDailyRangeLabel,
  isDailyBilling,
  lineSubtotalDaily,
} from "@/lib/rentalBilling";
import { highSeasonFromSpace } from "@/lib/highSeasonPricing";
import { normalizeRentalSegments } from "@/lib/rentalDates";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/**
 * Selector de rango por días (centros con facturación diaria).
 */
export function SpaceDayRangePicker({
  space = null,
  monthlyPriceUsd,
  minDays = 1,
  onRangeChange,
  pickSync = null,
}) {
  const minStart = useMemo(() => firstAllowedDailyStartIso(), []);
  const highSeason = useMemo(() => highSeasonFromSpace(space), [space]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const segs = normalizeRentalSegments(pickSync);
    if (!segs.length) {
      setStartDate("");
      setEndDate("");
      return;
    }
    setStartDate(segs[0].start_date);
    setEndDate(segs[segs.length - 1].end_date);
  }, [pickSync]);

  const emitRange = useCallback(
    (start, end) => {
      if (!start || !end || end < start) {
        onRangeChange?.(null);
        return;
      }
      onRangeChange?.({
        rental_segments: [{ start_date: start, end_date: end }],
        start_date: start,
        end_date: end,
        selected_day_count: contractDaysInclusive(start, end),
      });
    },
    [onRangeChange],
  );

  const onStartChange = useCallback(
    (v) => {
      setStartDate(v);
      const end = endDate && endDate >= v ? endDate : v;
      setEndDate(end);
      emitRange(v, end);
    },
    [emitRange, endDate],
  );

  const onEndChange = useCallback(
    (v) => {
      setEndDate(v);
      emitRange(startDate, v);
    },
    [emitRange, startDate],
  );

  const reset = useCallback(() => {
    setStartDate("");
    setEndDate("");
    onRangeChange?.(null);
  }, [onRangeChange]);

  const spanDays = startDate && endDate ? contractDaysInclusive(startDate, endDate) : 0;
  const rangeValid = spanDays >= minDays && endDate >= startDate && startDate >= minStart;
  const price = Number(monthlyPriceUsd);
  const subtotal =
    rangeValid && Number.isFinite(price)
      ? lineSubtotalDaily(price, startDate, endDate, highSeason)
      : null;
  const rangeLabel = rangeValid ? formatDailyRangeLabel(startDate, endDate) : null;
  const dayRate = Number.isFinite(price) ? dailyRateFromMonthly(price) : null;

  if (!isDailyBilling(space)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Este centro cotiza <strong className="font-medium text-zinc-800">por día</strong> (canon diario ≈ mensual ÷
        30{dayRate != null ? `: ${new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(dayRate)}/día` : ""}
        ). Elige inicio y fin; la disponibilidad exacta se confirma al agregar al carrito.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={adminLabel} htmlFor="rental-day-start">
            Desde
          </label>
          <input
            id="rental-day-start"
            type="date"
            min={minStart}
            className={`${adminField} mt-1 mp-form-field-accent`}
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>
        <div>
          <label className={adminLabel} htmlFor="rental-day-end">
            Hasta
          </label>
          <input
            id="rental-day-end"
            type="date"
            min={startDate || minStart}
            className={`${adminField} mt-1 mp-form-field-accent`}
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>

      {startDate || endDate ? (
        <FilterClearAction onClick={reset} label="Limpiar fechas" />
      ) : null}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5`}
      >
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Período elegido</p>
          <p className="text-sm font-medium text-zinc-900">
            {rangeLabel ? (
              <>
                {rangeLabel}
                <span className="ml-2 tabular-nums text-zinc-600">
                  ({spanDays} {spanDays === 1 ? "día" : "días"})
                </span>
              </>
            ) : (
              <span className="text-zinc-500">Indica fecha de inicio y fin.</span>
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

      {startDate && endDate && !rangeValid ? (
        <p className="text-sm text-amber-800">
          Mínimo <strong>{minDays}</strong> {minDays === 1 ? "día" : "días"} y fechas desde mañana en adelante.
        </p>
      ) : null}
    </div>
  );
}
