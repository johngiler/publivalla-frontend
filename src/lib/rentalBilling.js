/** Cotización en reservas: solo meses de calendario (alineado con backend). */

import { parseISODateOnly } from "@/lib/rentalDates";
import { highSeasonFromSpace } from "@/lib/highSeasonPricing";

export const RENTAL_BILLING_MONTH = "calendar_month";
/** @deprecated Solo meses; se mantiene por compatibilidad API. */
export const RENTAL_BILLING_DAY = "calendar_day";

export const DAYS_PER_MONTH_COMMERCIAL = 30;

export const MIN_RESERVATION_CALENDAR_DAYS = 1;

/** @param {unknown} _raw */
export function normalizeRentalBillingUnit(_raw) {
  return RENTAL_BILLING_MONTH;
}

/** @param {Record<string, unknown> | null | undefined} _spaceOrItem */
export function isDailyBilling(_spaceOrItem) {
  return false;
}

/** @param {number | string} monthlyUsd */
export function dailyRateFromMonthly(monthlyUsd) {
  const n = Number(monthlyUsd);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / DAYS_PER_MONTH_COMMERCIAL) * 100) / 100;
}

/** @param {string} startStr @param {string} endStr */
export function contractDaysInclusive(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = parseISODateOnly(startStr);
  const e = parseISODateOnly(endStr);
  if (e < s) return 0;
  return Math.floor((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

function* iterDaysInIsoRange(startStr, endStr) {
  let d = parseISODateOnly(startStr);
  const end = parseISODateOnly(endStr);
  while (d <= end) {
    yield new Date(d.getFullYear(), d.getMonth(), d.getDate());
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  }
}

/**
 * @param {number | string} monthlyUsd
 * @param {string} startStr
 * @param {string} endStr
 * @param {{ months?: number[], multiplier?: number }} [highSeasonOpts]
 */
export function lineSubtotalDaily(monthlyUsd, startStr, endStr, highSeasonOpts = null) {
  if (!startStr || !endStr) return 0;
  const dayBase = dailyRateFromMonthly(monthlyUsd);
  const hs = highSeasonOpts?.months?.length ? highSeasonOpts : highSeasonFromSpace({});
  const months = hs.months || [];
  const mult = hs.multiplier > 1 ? hs.multiplier : 1;
  let total = 0;
  for (const d of iterDaysInIsoRange(startStr, endStr)) {
    const m = d.getMonth() + 1;
    const rate = months.includes(m) ? Math.round(dayBase * mult * 100) / 100 : dayBase;
    total += rate;
  }
  return Math.round(total * 100) / 100;
}

/** Primer día reservable (mañana en hora local). */
export function firstAllowedDailyStartIso(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} isoDate */
export function formatDailyRangeLabel(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const s = parseISODateOnly(startStr);
  const e = parseISODateOnly(endStr);
  const fmt = (d) =>
    d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
  if (startStr === endStr) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}
