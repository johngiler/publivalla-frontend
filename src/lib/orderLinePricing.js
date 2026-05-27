/** Descuentos por toma: precios de catálogo vs acordados en un pedido concreto. */

export function orderLineOriginalSubtotal(item) {
  const orig = Number(item?.original_subtotal);
  const sub = Number(item?.subtotal);
  if (Number.isFinite(orig) && orig >= 0) return orig;
  return Number.isFinite(sub) ? sub : 0;
}

export function orderLineDiscountAmount(item) {
  const orig = orderLineOriginalSubtotal(item);
  const sub = Number(item?.subtotal);
  if (!Number.isFinite(sub) || sub >= orig - 0.004) return 0;
  return orig - sub;
}

export function orderLineHasDiscount(item) {
  return orderLineDiscountAmount(item) > 0.004;
}

export function orderCatalogSubtotal(order) {
  const fromApi = Number(order?.catalog_subtotal);
  if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((n, it) => n + orderLineOriginalSubtotal(it), 0);
}

export function orderDiscountTotal(order) {
  const fromApi = Number(order?.discount_total);
  if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((n, it) => n + orderLineDiscountAmount(it), 0);
}

export function orderHasDiscount(order) {
  return orderDiscountTotal(order) > 0.004;
}

export function orderLinePricingEditable(order) {
  return order?.line_pricing_editable === true;
}

/** @param {string | number} raw */
export function parseUsdInput(raw) {
  let s = String(raw ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/^\$/, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const after = s.slice(lastComma + 1);
    if (/^\d{1,2}$/.test(after)) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastDot !== -1) {
    const after = s.slice(lastDot + 1);
    if (!/^\d{1,2}$/.test(after)) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}
