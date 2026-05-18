/** Formato de fechas y horas para pujas (admin y marketplace). */

export function formatAuctionDate(iso) {
  if (!iso) return "—";
  try {
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return String(iso);
    return new Date(y, m - 1, d).toLocaleDateString("es-VE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

export function formatAuctionDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-VE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/** ISO UTC → valor para `<input type="datetime-local">` (hora local). */
export function isoToDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de datetime-local → ISO para API (interpretado como hora local del navegador). */
export function datetimeLocalValueToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function formatUsd(amount) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}
