/** Fechas de alquiler (mínimo 1 mes de calendario, alineado con backend). */

import { highSeasonFromSpace, lineSubtotalWithHighSeason } from "@/lib/highSeasonPricing";
import {
  contractDaysInclusive,
  isDailyBilling,
  lineSubtotalDaily,
  MIN_RESERVATION_CALENDAR_DAYS,
  normalizeRentalBillingUnit,
} from "@/lib/rentalBilling";

export const MIN_RESERVATION_CALENDAR_MONTHS = 1;

export function toISODateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODateOnly(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Primer día del mes siguiente y último día de ese mismo mes (1 mes calendario inclusivo). */
export function defaultRentalPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start_date: toISODateOnly(start), end_date: toISODateOnly(end) };
}

export function contractMonthsInclusive(startStr, endStr) {
  const s = parseISODateOnly(startStr);
  const e = parseISODateOnly(endStr);
  if (e < s) return 0;
  return (
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
  );
}

/**
 * Tramos de reserva de una línea de carrito (nuevo) o un solo tramo legacy start/end.
 * @param {Record<string, unknown> | null | undefined} item
 * @returns {Array<{ start_date: string, end_date: string }>}
 */
export function normalizeRentalSegments(item) {
  if (!item || typeof item !== "object") return [];
  const raw = item.rental_segments;
  if (Array.isArray(raw) && raw.length) {
    const out = [];
    for (const seg of raw) {
      if (
        seg &&
        typeof seg.start_date === "string" &&
        typeof seg.end_date === "string" &&
        seg.start_date &&
        seg.end_date
      ) {
        out.push({ start_date: seg.start_date, end_date: seg.end_date });
      }
    }
    if (out.length) return out;
  }
  if (typeof item.start_date === "string" && typeof item.end_date === "string") {
    return [{ start_date: item.start_date, end_date: item.end_date }];
  }
  return [];
}

/** Unidades facturables (meses o días según centro). */
export function selectedUnitsCountFromItem(item) {
  const segs = normalizeRentalSegments(item);
  if (isDailyBilling(item)) {
    return segs.reduce((n, seg) => n + contractDaysInclusive(seg.start_date, seg.end_date), 0);
  }
  return segs.reduce((n, seg) => n + contractMonthsInclusive(seg.start_date, seg.end_date), 0);
}

/** @deprecated Usar selectedUnitsCountFromItem */
export function selectedMonthCountFromItem(item) {
  return selectedUnitsCountFromItem(item);
}

export function lineSubtotal(monthlyUsd, startStr, endStr, highSeasonOpts = null) {
  if (highSeasonOpts && highSeasonOpts.months?.length) {
    return lineSubtotalWithHighSeason(
      monthlyUsd,
      startStr,
      endStr,
      highSeasonOpts.months,
      highSeasonOpts.multiplier,
    );
  }
  const months = contractMonthsInclusive(startStr, endStr);
  const n = Number(monthlyUsd);
  if (!Number.isFinite(n) || months <= 0) return 0;
  return Math.round(n * months * 100) / 100;
}

/** Subtotal de una línea con uno o varios tramos. */
export function lineSubtotalFromSegments(monthlyUsd, segments, highSeasonOpts = null, billingUnit = null) {
  if (!Array.isArray(segments) || !segments.length) return 0;
  const daily = normalizeRentalBillingUnit(billingUnit) === "calendar_day";
  return segments.reduce((sum, seg) => {
    if (daily) {
      return sum + lineSubtotalDaily(monthlyUsd, seg.start_date, seg.end_date, highSeasonOpts);
    }
    return sum + lineSubtotal(monthlyUsd, seg.start_date, seg.end_date, highSeasonOpts);
  }, 0);
}

/** Suma subtotales del carrito (respeta rental_segments por línea). */
export function cartTotalUsd(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, row) => {
    const segs = normalizeRentalSegments(row);
    if (!segs.length) return sum;
    const hs = highSeasonFromSpace(row);
    return sum + lineSubtotalFromSegments(row.monthly_price_usd, segs, hs, row.rental_billing_unit);
  }, 0);
}

/** Cumple mínimo de unidades (1 mes o 1 día según centro). */
export function cartItemDatesValidForCheckout(item) {
  if (!item) return false;
  const n = selectedUnitsCountFromItem(item);
  if (isDailyBilling(item)) return n >= MIN_RESERVATION_CALENDAR_DAYS;
  return n >= MIN_RESERVATION_CALENDAR_MONTHS;
}

export function cartAllItemsMeetCheckoutRules(items) {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(cartItemDatesValidForCheckout)
  );
}

/** Subtotal de una línea o null si no cumple mínimo. */
export function cartLineSubtotalOrNull(item) {
  if (!cartItemDatesValidForCheckout(item)) return null;
  const segs = normalizeRentalSegments(item);
  return lineSubtotalFromSegments(
    item.monthly_price_usd,
    segs,
    highSeasonFromSpace(item),
    item.rental_billing_unit,
  );
}

/**
 * Expande cada línea del carrito a ítems de orden (una fila por tramo contiguo).
 * @param {Array<Record<string, unknown>>} items
 */
export function expandCartItemsToOrderPayload(items) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((i) => {
    const segs = normalizeRentalSegments(i);
    return segs.map((seg) => ({
      ad_space: i.id,
      start_date: seg.start_date,
      end_date: seg.end_date,
    }));
  });
}

/** Comparación estable de selección (carrito vs picker). */
export function rentalSelectionEquals(a, b) {
  const norm = (x) =>
    normalizeRentalSegments(x)
      .map((s) => `${s.start_date}|${s.end_date}`)
      .sort()
      .join(",");
  return norm(a) === norm(b);
}
