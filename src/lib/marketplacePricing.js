/** Precios marketplace: subtotal + IVA (16 % salvo que el centro no cobre). */

import { highSeasonFromSpace } from "@/lib/highSeasonPricing";
import {
  lineSubtotalFromSegments,
  normalizeRentalSegments,
} from "@/lib/rentalDates";

export const IVA_RATE = 0.16;

export function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

/** `false` explícito → 0. Ausente o true → 16 % (líneas de carrito anteriores al flag). */
export function ivaRateForLine(item) {
  return item && item.charges_iva === false ? 0 : IVA_RATE;
}

export function ivaFromSubtotal(subtotal, rate = IVA_RATE) {
  return roundMoney(roundMoney(subtotal) * rate);
}

export function totalWithIva(subtotal, rate = IVA_RATE) {
  const s = roundMoney(subtotal);
  return roundMoney(s + ivaFromSubtotal(s, rate));
}

export function ivaLabel(percent) {
  if (percent == null) return "IVA";
  return `IVA (${percent} %)`;
}

/** IVA sumado por línea. `ivaPercent` es null si el carrito mezcla tasas. */
export function cartIvaFromItems(items) {
  const rows = Array.isArray(items) ? items : [];
  let iva = 0;
  const rates = [];
  for (const row of rows) {
    const segs = normalizeRentalSegments(row);
    const line = lineSubtotalFromSegments(
      row.monthly_price_usd,
      segs,
      highSeasonFromSpace(row),
      row.rental_billing_unit,
    );
    const rate = ivaRateForLine(row);
    rates.push(rate);
    iva += roundMoney(line) * rate;
  }
  const uniform = rates.length > 0 && rates.every((rate) => rate === rates[0]);
  const ivaPercent = uniform ? Math.round(rates[0] * 100) : rates.length ? null : 16;
  return {
    iva: roundMoney(iva),
    ivaPercent,
    label: ivaLabel(ivaPercent),
  };
}

export function formatUsdInteger(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}

export function formatUsdMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x);
}
