/** Plan de pago por partes (cuotas) en pedidos. */

const MONTH_SHORT = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

export function orderUsesSplitPayment(order) {
  return order?.split_payment_enabled === true;
}

export function orderPaymentPlanEditable(order) {
  if (order?.payment_plan?.editable === false) return false;
  if (order?.payment_plan?.editable === true) return true;
  // Sin registro de plan aún: mismo criterio que precios/inicio de alquiler.
  return order?.line_pricing_editable === true;
}

export function formatPlanMonthLabel(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (m >= 1 && m <= 12) return `${MONTH_SHORT[m - 1]} ${y}`;
  return `${month}/${year}`;
}

export function monthKey(year, month) {
  return `${year}-${month}`;
}

export function parseMonthKey(key) {
  const [y, m] = String(key).split("-");
  return { year: Number(y), month: Number(m) };
}

/** Meses de calendario cubiertos por las líneas del pedido (unión). */
export function orderCalendarMonthsFromItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const start = it?.start_date ? new Date(`${it.start_date}T12:00:00`) : null;
    const end = it?.end_date ? new Date(`${it.end_date}T12:00:00`) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }
    let y = start.getFullYear();
    let m = start.getMonth() + 1;
    const endY = end.getFullYear();
    const endM = end.getMonth() + 1;
    while (y < endY || (y === endY && m <= endM)) {
      const k = monthKey(y, m);
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ year: y, month: m, label: formatPlanMonthLabel(y, m) });
      }
      if (m === 12) {
        y += 1;
        m = 1;
      } else {
        m += 1;
      }
    }
  }
  out.sort((a, b) => a.year - b.year || a.month - b.month);
  return out;
}

export function firstInstallment(order) {
  const inst = order?.payment_plan?.installments;
  if (!Array.isArray(inst) || inst.length === 0) return null;
  return inst.find((x) => Number(x.sequence) === 1) ?? inst[0];
}

export function firstInstallmentHasReceipt(order) {
  const first = firstInstallment(order);
  return Boolean(first?.payment_receipt_url);
}

export function firstInstallmentHasInvoice(order) {
  const first = firstInstallment(order);
  return Boolean(first?.invoice_file_url);
}

export function installmentStatusPillClass(status) {
  const s = String(status ?? "");
  if (s === "paid") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80";
  if (s === "invoiced") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80";
  return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80";
}
