"use client";

import { MONTH_LABELS_ES } from "@/lib/highSeasonPricing";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/**
 * Selector de meses de temporada alta (1–12) y multiplicador opcional.
 * @param {{
 *   value: number[],
 *   onChange: (months: number[]) => void,
 *   multiplier?: string,
 *   onMultiplierChange?: (value: string) => void,
 *   idPrefix?: string,
 *   labelClass?: string,
 *   fieldClass?: string,
 * }} props
 */
export function HighSeasonMonthsField({
  value,
  onChange,
  multiplier,
  onMultiplierChange,
  idPrefix = "hs",
  labelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400",
  fieldClass = "mt-2 w-full max-w-[8rem] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm mp-admin-field-brand",
}) {
  const selected = new Set(Array.isArray(value) ? value : []);

  function toggle(month) {
    const next = new Set(selected);
    if (next.has(month)) next.delete(month);
    else next.add(month);
    onChange([...next].sort((a, b) => a - b));
  }

  return (
    <div>
      <p className={labelClass}>Meses de temporada alta</p>
      <p className="mt-1 text-xs text-zinc-500">
        Se repiten cada año (p. ej. noviembre–enero). El canon de los espacios publicitarios de este centro sube en esos meses.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MONTH_LABELS_ES.map((label, i) => {
          const m = i + 1;
          const on = selected.has(m);
          return (
            <button
              key={label}
              type="button"
              id={`${idPrefix}-m-${m}`}
              aria-pressed={on}
              onClick={() => toggle(m)}
              className={`min-w-[2.75rem] ${ROUNDED_CONTROL} border px-2 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? "border-amber-300/90 bg-amber-50 text-amber-950 ring-1 ring-amber-200/80"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {onMultiplierChange != null ? (
        <div className="mt-4">
          <label className={labelClass} htmlFor={`${idPrefix}-mult`}>
            Multiplicador del canon
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            En los meses marcados, el canon mensual de cada espacio publicitario se multiplica por este factor (1 = sin cambio).
          </p>
          <input
            id={`${idPrefix}-mult`}
            type="number"
            min={1}
            max={10}
            step={0.01}
            className={fieldClass}
            value={multiplier ?? "1"}
            onChange={(e) => onMultiplierChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
