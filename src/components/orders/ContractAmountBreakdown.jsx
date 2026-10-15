import { RenewalStatusPill } from "@/components/orders/RenewalStatusPill";
import { formatUsdMoney } from "@/lib/marketplacePricing";

/**
 * Desglose de montos: periodo inicial + renovaciones aplicadas = total.
 * Filas siempre: etiqueta a la izquierda, valor a la derecha.
 * @param {{
 *   breakdown?: {
 *     base_amount?: string | number,
 *     total?: string | number,
 *     renewals?: Array<Record<string, unknown>>,
 *   } | null,
 *   subtotal?: string | number,
 *   renewals?: Array<Record<string, unknown>> | null,
 *   align?: "left" | "right",
 *   className?: string,
 * }} props
 */
export function ContractAmountBreakdown({
  breakdown = null,
  subtotal = null,
  renewals = null,
  align = "left",
  className = "",
}) {
  const rows = Array.isArray(breakdown?.renewals)
    ? breakdown.renewals
    : Array.isArray(renewals)
      ? renewals
      : [];
  const hasRenewals = rows.length > 0;
  const totalRaw = breakdown?.total ?? subtotal;
  const total = Number(totalRaw);
  const base = Number(breakdown?.base_amount);
  const headerAlign = align === "right" ? "text-right" : "text-left";

  if (!hasRenewals) {
    if (!Number.isFinite(total)) return null;
    return (
      <div className={`${headerAlign} ${className}`.trim()}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Subtotal (sin IVA)
        </p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900">
          {formatUsdMoney(total)}
        </p>
      </div>
    );
  }

  const completed = rows.filter((r) => r?.status === "completed");
  const other = rows.filter((r) => r?.status !== "completed");

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p
        className={`text-[11px] font-semibold uppercase tracking-wide text-zinc-500 ${headerAlign}`}
      >
        Subtotal (sin IVA)
      </p>
      <dl className="space-y-1.5 text-xs text-zinc-700">
        {Number.isFinite(base) ? (
          <div className="flex items-baseline justify-between gap-x-3 gap-y-0.5">
            <dt className="min-w-0 text-left text-zinc-600">Periodo inicial</dt>
            <dd className="shrink-0 font-medium tabular-nums text-zinc-900">
              {formatUsdMoney(base)}
            </dd>
          </div>
        ) : null}
        {completed.map((row, index) => {
          const amount = Number(row.amount);
          const seq = rows.indexOf(row) + 1;
          const months =
            typeof row.months_label === "string" && row.months_label.trim()
              ? row.months_label.trim()
              : "";
          return (
            <div
              key={row.id ?? `completed-${index}`}
              className="flex items-baseline justify-between gap-x-3 gap-y-0.5"
            >
              <dt className="min-w-0 text-left text-zinc-600">
                Extensión #{seq}
                {months ? (
                  <span className="text-zinc-500"> · {months}</span>
                ) : null}
              </dt>
              <dd className="shrink-0 font-medium tabular-nums text-zinc-900">
                {Number.isFinite(amount) ? formatUsdMoney(amount) : "—"}
              </dd>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-zinc-200/90 pt-1.5">
          <dt className="min-w-0 text-left font-semibold text-zinc-900">Total</dt>
          <dd className="shrink-0 text-base font-semibold tabular-nums text-zinc-900">
            {Number.isFinite(total) ? formatUsdMoney(total) : "—"}
          </dd>
        </div>
      </dl>
      {other.length > 0 ? (
        <ul className="space-y-1 border-t border-zinc-200/80 pt-2">
          {other.map((row, index) => {
            const amount = Number(row.amount);
            const seq = rows.indexOf(row) + 1;
            return (
              <li
                key={row.id ?? `other-${index}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600"
              >
                <span className="tabular-nums text-zinc-500">#{seq}</span>
                <RenewalStatusPill renewal={row} compact />
                {Number.isFinite(amount) ? (
                  <span className="ml-auto tabular-nums">{formatUsdMoney(amount)}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
