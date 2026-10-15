import { RenewalStatusPill } from "@/components/orders/RenewalStatusPill";
import { formatUsdMoney } from "@/lib/marketplacePricing";

/**
 * Desglose cronológico de renovaciones de una línea de contrato.
 * @param {{
 *   renewals?: Array<Record<string, unknown>> | null,
 *   className?: string,
 * }} props
 */
export function ContractRenewalsHistory({ renewals = null, className = "" }) {
  const rows = Array.isArray(renewals) ? renewals.filter(Boolean) : [];
  if (!rows.length) return null;

  return (
    <div className={`rounded-[12px] border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 ${className}`.trim()}>
      <p className="text-xs font-semibold text-zinc-900">
        Renovaciones ({rows.length})
      </p>
      <ol className="mt-2 space-y-2">
        {rows.map((row, index) => {
          const amount = Number(row.amount);
          const months =
            typeof row.months_label === "string" && row.months_label.trim()
              ? row.months_label.trim()
              : "—";
          return (
            <li
              key={row.id ?? `renewal-${index}`}
              className="flex flex-wrap items-start gap-x-2 gap-y-1 text-xs text-zinc-700"
            >
              <span className="shrink-0 font-semibold tabular-nums text-zinc-500">
                #{index + 1}
              </span>
              <RenewalStatusPill renewal={row} compact />
              <span className="min-w-0 flex-1 font-medium text-zinc-800">{months}</span>
              {Number.isFinite(amount) ? (
                <span className="shrink-0 tabular-nums text-zinc-600">
                  {formatUsdMoney(amount)} sin IVA
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
