"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { spaceAvailabilityLabel, spaceAvailabilityPillClassName } from "@/components/admin/adminConstants";
import { adminPrimaryBtn } from "@/components/admin/adminFormStyles";
import { SpaceDayRangePicker } from "@/components/catalog/SpaceDayRangePicker";
import { SpaceMultiYearMonthRangePicker } from "@/components/catalog/SpaceMultiYearMonthRangePicker";
import { CATALOG_MONTH_CART_LABEL } from "@/lib/catalogMonthColors";
import { marketplaceSecondaryBtn } from "@/lib/marketplaceActionButtons";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import { spaceAllowsMarketplaceReservation } from "@/lib/spaceMarketplaceReservation";
import {
  MIN_RESERVATION_CALENDAR_DAYS,
  firstAllowedDailyStartIso,
  isDailyBilling,
} from "@/lib/rentalBilling";
import {
  MIN_RESERVATION_CALENDAR_MONTHS,
  normalizeRentalSegments,
  rentalSelectionEquals,
  selectedUnitsCountFromItem,
} from "@/lib/rentalDates";
import { postSpaceRentalRangeCheck } from "@/services/api";
import {
  buildDisabledMonthsByYear,
  catalogAvailabilityYears,
  rentalSegmentsToLinearIndices,
  resolveMonthsOccupiedByYear,
  selectedMonthsTouchOccupied,
} from "@/lib/spaceCalendar";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/**
 * Bloque de reserva en detalle de toma: meses sueltos + carrito.
 */
export function SpaceDetailReservationActions({ space }) {
  const dailyBilling = isDailyBilling(space);
  const { authReady, me, isClient, isAdmin } = useAuth();
  const { items, addItem, updateItemDates } = useCart();
  const [pick, setPick] = useState(null);
  const [rangeCheckError, setRangeCheckError] = useState("");
  const [rangeCheckLoading, setRangeCheckLoading] = useState(false);

  const refDate = useMemo(() => new Date(), []);
  const calendarYears = useMemo(() => catalogAvailabilityYears(refDate, space), [refDate, space]);
  const byYear = useMemo(() => resolveMonthsOccupiedByYear(space, refDate), [space, refDate]);
  const disabledByYear = useMemo(
    () => buildDisabledMonthsByYear(byYear, calendarYears, refDate),
    [byYear, calendarYears, refDate],
  );
  const yearLabel =
    calendarYears.length > 1
      ? `${calendarYears[0]}–${calendarYears[calendarYears.length - 1]}`
      : String(calendarYears[0] ?? "");

  const spaceInCart = useMemo(
    () => items.some((i) => String(i.id) === String(space.id)),
    [items, space.id],
  );

  const cartLine = useMemo(
    () => items.find((i) => String(i.id) === String(space.id)),
    [items, space.id],
  );

  const cartBaselineSegments = useMemo(
    () => (cartLine ? normalizeRentalSegments(cartLine) : null),
    [cartLine],
  );

  const cartBaselineIso = useMemo(() => {
    if (!cartBaselineSegments?.length) return null;
    return {
      start_date: cartBaselineSegments[0].start_date,
      end_date: cartBaselineSegments[cartBaselineSegments.length - 1].end_date,
    };
  }, [cartBaselineSegments]);

  useEffect(() => {
    if (spaceInCart && cartBaselineSegments?.length) {
      if (!dailyBilling) {
        const indices = rentalSegmentsToLinearIndices(cartBaselineSegments);
        if (selectedMonthsTouchOccupied(disabledByYear, indices)) {
          setPick((prev) => (prev == null ? prev : null));
          return;
        }
      }
      const nextPick = {
        rental_segments: cartBaselineSegments,
        start_date: cartBaselineIso?.start_date,
        end_date: cartBaselineIso?.end_date,
      };
      setPick((prev) => (rentalSelectionEquals(prev, nextPick) ? prev : nextPick));
    } else if (!spaceInCart) {
      setPick((prev) => (prev == null ? prev : null));
    }
  }, [
    space.id,
    space.months_occupied_by_year,
    spaceInCart,
    cartBaselineSegments,
    cartBaselineIso?.start_date,
    cartBaselineIso?.end_date,
    disabledByYear,
    dailyBilling,
  ]);

  const pickValid = useMemo(() => {
    if (!pick) return false;
    const segs = normalizeRentalSegments(pick);
    if (!segs.length) return false;
    if (dailyBilling) {
      const start = segs[0].start_date;
      if (start < firstAllowedDailyStartIso()) return false;
      return selectedUnitsCountFromItem({ ...pick, rental_billing_unit: space.rental_billing_unit }) >= MIN_RESERVATION_CALENDAR_DAYS;
    }
    const indices = rentalSegmentsToLinearIndices(segs);
    if (selectedMonthsTouchOccupied(disabledByYear, indices)) return false;
    return selectedUnitsCountFromItem(pick) >= MIN_RESERVATION_CALENDAR_MONTHS;
  }, [pick, disabledByYear, dailyBilling, space.rental_billing_unit]);

  const hasRealModification = useMemo(() => {
    if (!spaceInCart || !pickValid || !cartLine) return false;
    return !rentalSelectionEquals(cartLine, pick);
  }, [spaceInCart, pickValid, cartLine, pick]);

  useEffect(() => {
    setRangeCheckError("");
  }, [pick]);

  const onConfirmDates = useCallback(async () => {
    if (!pickValid || !pick) return;
    if (spaceInCart && !hasRealModification) return;
    const segs = normalizeRentalSegments(pick);
    setRangeCheckError("");
    setRangeCheckLoading(true);
    try {
      const r = await postSpaceRentalRangeCheck(space.id, { rental_segments: segs });
      if (!r.ok) {
        setRangeCheckError(
          typeof r.detail === "string" && r.detail.trim()
            ? r.detail.trim()
            : "Las fechas ya no están disponibles. Elige otro período.",
        );
        return;
      }
      if (spaceInCart) {
        updateItemDates(space.id, pick);
      } else {
        addItem(space, pick);
      }
    } catch (e) {
      setRangeCheckError(
        e instanceof Error ? e.message : "No se pudo comprobar la disponibilidad. Intenta de nuevo.",
      );
    } finally {
      setRangeCheckLoading(false);
    }
  }, [addItem, hasRealModification, pick, pickValid, space, spaceInCart, updateItemDates]);

  if (!authReady) {
    return (
      <div className="mt-10 space-y-4 border-t border-zinc-200 pt-10" aria-busy="true">
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="h-12 w-full max-w-md animate-pulse rounded-[15px] bg-zinc-100" />
      </div>
    );
  }

  if (me && isAdmin) {
    return (
      <div
        className={`mt-10 border-t border-zinc-200 pt-10 ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm leading-relaxed text-zinc-700 sm:px-6`}
      >
        <p className="font-medium text-zinc-900">Carrito y checkout</p>
        <p className="mt-1">
          Este proceso no está disponible para tu cuenta. Usa el acceso que te corresponde.
        </p>
        <p className="mt-3">
          <Link href="/dashboard" className="font-semibold text-zinc-900 no-underline underline-offset-4 hover:underline">
            Ir al panel
          </Link>
        </p>
      </div>
    );
  }

  if (me && !isClient) {
    return null;
  }

  const canReserveCommercially = spaceAllowsMarketplaceReservation(space);
  if (!canReserveCommercially) {
    const stLabel = spaceAvailabilityLabel(space.availability, space.availability_label);
    return (
      <section
        className="mt-10 border-t border-zinc-200 pt-10"
        aria-labelledby="space-reservation-blocked-heading"
      >
        <div
          className={`overflow-hidden ${ROUNDED_CONTROL} border border-amber-200/90 bg-amber-50/50 px-5 py-6 sm:px-8 sm:py-7`}
        >
          <h2 id="space-reservation-blocked-heading" className="text-lg font-semibold tracking-tight text-zinc-950">
            Reserva no disponible
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700">
            Esta toma no admite nuevas reservas en el marketplace con su estado actual. Puedes revisar el detalle o
            explorar otras tomas del catálogo.
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Estado comercial:{" "}
            <span
              className={`inline-flex align-middle rounded-full px-2.5 py-0.5 text-xs font-semibold ${spaceAvailabilityPillClassName(space.availability)}`}
            >
              {stLabel}
            </span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-10 border-t border-zinc-200 pt-10"
      aria-labelledby="space-reservation-heading"
    >
      <div
        className={`overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white shadow-[0_2px_20px_-12px_rgba(15,23,42,0.12)] sm:rounded-2xl`}
      >
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-5 sm:px-8 sm:py-6">
          <h2 id="space-reservation-heading" className="text-lg font-semibold tracking-tight text-zinc-950">
            Período de reserva
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            {dailyBilling ? (
              <>
                Elige <strong className="font-medium text-zinc-800">fecha de inicio y fin</strong> (mínimo{" "}
                <strong className="font-medium text-zinc-800">1</strong> día). El canon se calcula por día (mensual ÷
                30).
              </>
            ) : (
              <>
                Ventana <strong className="font-medium text-zinc-800">{yearLabel}</strong>: elige uno o más meses
                libres (no tienen que ser consecutivos). Mínimo{" "}
                <strong className="font-medium text-zinc-800">1</strong> mes en total. Los meses en gris no se pueden
                usar. Los meses en <strong className="font-medium text-zinc-800">azul</strong> son tu solicitud
                reservada; los <strong className="font-medium text-zinc-800">verdes</strong>, tu pedido o contrato activo.
              </>
            )}
          </p>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {dailyBilling ? (
            <SpaceDayRangePicker
              space={space}
              monthlyPriceUsd={space.monthly_price_usd}
              minDays={MIN_RESERVATION_CALENDAR_DAYS}
              onRangeChange={setPick}
              pickSync={pick}
            />
          ) : (
            <SpaceMultiYearMonthRangePicker
              space={space}
              monthlyPriceUsd={space.monthly_price_usd}
              minMonths={MIN_RESERVATION_CALENDAR_MONTHS}
              onRangeChange={setPick}
              pickSync={pick}
              cartBaselineIso={cartBaselineIso}
              cartBaselineSegments={cartBaselineSegments}
              selectionLabel={CATALOG_MONTH_CART_LABEL}
            />
          )}
        </div>

        <div className="space-y-5 border-t border-zinc-100 bg-zinc-50/40 px-5 py-5 sm:px-8 sm:py-6">
          {rangeCheckError ? (
            <p
              role="alert"
              className={`break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
            >
              {rangeCheckError}
            </p>
          ) : null}
          {spaceInCart ? (
            <div className="flex flex-col gap-3">
              {pickValid && hasRealModification ? (
                <button
                  type="button"
                  disabled={rangeCheckLoading}
                  onClick={() => void onConfirmDates()}
                  className={
                    !rangeCheckLoading
                      ? `${adminPrimaryBtn} min-h-12 w-full px-6 py-3.5 text-base sm:min-h-11 sm:text-sm`
                      : "inline-flex min-h-12 w-full cursor-wait items-center justify-center gap-2 rounded-[15px] border border-zinc-200 bg-zinc-100 px-6 py-3.5 text-base font-semibold text-zinc-500 sm:min-h-11 sm:text-sm"
                  }
                >
                  {rangeCheckLoading ? "Comprobando…" : "Guardar modificación"}
                  {!rangeCheckLoading ? <span aria-hidden>→</span> : null}
                </button>
              ) : null}
              <Link
                href="/cart"
                className={`${pickValid ? marketplaceSecondaryBtn : adminPrimaryBtn} flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold sm:min-h-11 sm:text-sm`}
              >
                Ir al carrito
                <span aria-hidden>→</span>
              </Link>
              {!pickValid ? (
                <p className="text-center text-xs text-zinc-500">
                  Elige un período válido para actualizar{" "}
                  <strong className="font-medium text-zinc-700">esta toma</strong> en el carrito.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={!pickValid || rangeCheckLoading}
              onClick={() => void onConfirmDates()}
              className={
                pickValid && !rangeCheckLoading
                  ? `${adminPrimaryBtn} min-h-12 w-full px-6 py-3.5 text-base sm:min-h-11 sm:text-sm`
                  : "inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[15px] border border-zinc-200 bg-zinc-100 px-6 py-3.5 text-base font-semibold text-zinc-500 sm:min-h-11 sm:text-sm"
              }
            >
              {rangeCheckLoading ? "Comprobando…" : "Agregar al carrito"}
              {!rangeCheckLoading ? <span aria-hidden>→</span> : null}
            </button>
          )}
          {!pickValid && !spaceInCart ? (
            <p className="text-center text-xs text-zinc-500">
              {dailyBilling
                ? "Indica fechas válidas (desde mañana) para habilitar el botón."
                : "Marca al menos un mes futuro libre para habilitar el botón."}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
