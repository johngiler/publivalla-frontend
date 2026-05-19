"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { IconAdminCurrency } from "@/components/admin/adminIcons";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const CARD_ECON = `${ROUNDED_CONTROL} relative overflow-hidden border border-emerald-200/55 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/35 p-4 shadow-[0_2px_20px_rgba(16,185,129,0.09)] sm:p-5`;
const TITLE = "text-sm font-semibold text-zinc-900";
const SUB = "mt-0.5 text-xs text-zinc-500";

const econIconWrap =
  "flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-500/20 to-teal-500/15 text-emerald-800/75 shadow-sm [&_svg]:!h-6 [&_svg]:!w-6";

function econParse(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Tarifa mensual en catálogo: promedio + barras mín / promedio / máx (debajo de la fila KPI del resumen).
 * @param {{ economics?: object; gradId: string }} props
 */
export function AdminDashboardSpaceMonthlyPriceCard({ economics, gradId }) {
  const avg = econParse(economics?.avg_monthly_price_usd_per_space);
  const mn = econParse(economics?.min_monthly_price_usd_per_space);
  const mx = econParse(economics?.max_monthly_price_usd_per_space);

  const has = avg != null;
  const minV = mn != null ? mn : avg;
  const maxV = mx != null ? mx : avg;

  const barData = has
    ? [
        { name: "Mínimo", value: minV },
        { name: "Promedio", value: avg },
        { name: "Máximo", value: maxV },
      ]
    : [];

  if (!has) {
    return (
      <div className={CARD_ECON}>
        <div
          className="pointer-events-none absolute -left-16 top-1/2 size-48 -translate-y-1/2 rounded-full bg-gradient-to-tr from-emerald-400/12 to-teal-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={econIconWrap} aria-hidden>
              <IconAdminCurrency />
            </div>
            <div>
              <p className={TITLE}>Precio medio por espacio publicitario (catálogo)</p>
              <p className={SUB}>
                Cuando tengas espacios publicitarios con tarifa mensual en USD, aquí verás el promedio y un gráfico
                frente al mínimo y el
                máximo del workspace.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/tomas"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50/90"
          >
            Ir a espacios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD_ECON}>
      <div
        className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-gradient-to-bl from-emerald-400/18 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <div className="flex items-start gap-3">
            <div className={econIconWrap} aria-hidden>
              <IconAdminCurrency />
            </div>
            <div className="min-w-0">
              <p className={TITLE}>Precio medio por espacio publicitario</p>
              <p className={SUB}>Tarifa mensual listada en catálogo (USD, sin IVA). Comparado con el mínimo y el máximo.</p>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-emerald-950 sm:text-4xl">
            {formatUsdMoney(avg)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-emerald-900/75">
            <span>Mín.: {formatUsdMoney(minV)}</span>
            <span>Máx.: {formatUsdMoney(maxV)}</span>
          </div>
          <Link
            href="/dashboard/tomas"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-800 underline-offset-4 transition hover:text-emerald-950 hover:underline"
          >
            Ver y editar espacios
          </Link>
        </div>
        <div className="min-h-[168px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#ecfdf5" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickFormatter={(v) =>
                  typeof v === "number" && Math.abs(v) >= 1000
                    ? `${(v / 1000).toLocaleString("es-VE", { maximumFractionDigits: 1 })}k`
                    : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={76}
                tick={{ fill: "#3f3f46", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [formatUsdMoney(v), ""]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #d1fae5",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={28}>
                {barData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? "#a7f3d0" : i === 1 ? `url(#${gradId})` : "#047857"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
