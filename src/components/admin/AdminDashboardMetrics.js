"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ORDER_STATUS, SPACE_TYPES } from "@/components/admin/adminConstants";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const CARD_BASE = `${ROUNDED_CONTROL} border p-4 shadow-[0_2px_18px_rgba(0,0,0,0.05)] sm:p-5`;

/** Gradientes por tarjeta (misma línea visual que `AdminDashboardKpiCards`). */
const G = {
  violet: `${CARD_BASE} border-violet-200/55 bg-gradient-to-br from-violet-100/90 via-purple-50/75 to-white ring-1 ring-violet-200/45`,
  emerald: `${CARD_BASE} border-emerald-200/55 bg-gradient-to-br from-emerald-50/95 via-teal-50/50 to-white ring-1 ring-emerald-200/45`,
  cyan: `${CARD_BASE} border-cyan-200/55 bg-gradient-to-br from-cyan-100/85 via-teal-50/70 to-white ring-1 ring-cyan-200/48`,
  amber: `${CARD_BASE} border-amber-200/55 bg-gradient-to-br from-amber-100/90 via-orange-50/65 to-white ring-1 ring-amber-200/50`,
  orange: `${CARD_BASE} border-orange-200/55 bg-gradient-to-br from-orange-50/95 via-amber-50/55 to-white ring-1 ring-orange-200/45`,
  indigo: `${CARD_BASE} border-indigo-200/55 bg-gradient-to-br from-indigo-100/85 via-sky-50/55 to-white ring-1 ring-indigo-200/45`,
  chart: `${CARD_BASE} border-violet-200/45 bg-gradient-to-br from-violet-50/55 via-white to-emerald-50/50 ring-1 ring-violet-200/38`,
  slate: `${CARD_BASE} border-zinc-200/70 bg-gradient-to-br from-zinc-100/80 via-zinc-50/95 to-white ring-1 ring-zinc-200/55`,
  sky: `${CARD_BASE} border-sky-200/55 bg-gradient-to-br from-sky-100/85 via-blue-50/50 to-white ring-1 ring-sky-200/45`,
  rose: `${CARD_BASE} border-rose-200/55 bg-gradient-to-br from-rose-50/90 via-orange-50/35 to-white ring-1 ring-rose-200/42`,
  teal: `${CARD_BASE} border-teal-200/55 bg-gradient-to-br from-teal-50/95 via-cyan-50/45 to-white ring-1 ring-teal-200/45`,
  fuchsia: `${CARD_BASE} border-fuchsia-200/50 bg-gradient-to-br from-fuchsia-50/90 via-violet-50/40 to-white ring-1 ring-fuchsia-200/40`,
};

const ROW_DIVIDER = "border-b border-zinc-900/[0.07] pb-2 last:border-0";
const TITLE = "text-sm font-semibold text-zinc-900";
const SUB = "mt-0.5 text-xs text-zinc-500";
const KPI_VAL = "mt-2 text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl";

function labelOrderStatus(code) {
  const o = ORDER_STATUS.find((x) => String(x.v) === String(code ?? ""));
  return o ? o.l : code ? String(code) : "—";
}

function labelSpaceType(code) {
  const o = SPACE_TYPES.find((x) => String(x.v) === String(code ?? ""));
  return o ? o.l : code ? String(code) : "—";
}

function monthLabel(isoMonth) {
  if (!isoMonth || String(isoMonth).length < 7) return isoMonth || "—";
  try {
    return new Date(`${isoMonth}-01T12:00:00`).toLocaleDateString("es-VE", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoMonth;
  }
}

function fmtPct(x) {
  if (x == null || Number.isNaN(Number(x))) return "—";
  return `${Number(x).toLocaleString("es-VE", { maximumFractionDigits: 1 })} %`;
}

function fmtDays(x) {
  if (x == null || Number.isNaN(Number(x))) return "—";
  return `${Number(x).toLocaleString("es-VE", { maximumFractionDigits: 2 })} d`;
}

/**
 * Métricas operativas del workspace (admin marketplace). Payload: `stats.metrics` del API stats.
 * @param {{ metrics?: object }} props
 */
export function AdminDashboardMetrics({ metrics }) {
  const uid = useId().replace(/:/g, "");
  const gradRev = `dash-mrev-${uid}`;
  const occ = metrics?.occupancy ?? {};
  const revP = metrics?.revenue_periods ?? {};
  const revMonth = Array.isArray(metrics?.revenue_by_month) ? metrics.revenue_by_month : [];
  const newMonth = Array.isArray(metrics?.new_orders_by_month) ? metrics.new_orders_by_month : [];

  const comboChart = useMemo(() => {
    const byM = Object.fromEntries(newMonth.map((r) => [r.month, r.count]));
    return revMonth.map((r) => ({
      month: r.month,
      label: monthLabel(r.month),
      ingresos: typeof r.total_usd === "number" && Number.isFinite(r.total_usd) ? r.total_usd : 0,
      nuevas: Number(byM[r.month]) || 0,
    }));
  }, [revMonth, newMonth]);

  if (!metrics) {
    return null;
  }

  const top = metrics.top_space_by_revenue;
  const coldest = Array.isArray(metrics.coldest_spaces) ? metrics.coldest_spaces : [];
  const byType = Array.isArray(metrics.spaces_by_type) ? metrics.spaces_by_type : [];
  const cancelFrom = Array.isArray(metrics.orders_cancelled_from_status)
    ? metrics.orders_cancelled_from_status
    : [];
  const permitCity = Array.isArray(metrics.permit_pending_by_city) ? metrics.permit_pending_by_city : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">Métricas operativas</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Cálculos a partir de pedidos, líneas de contrato, tomas y eventos de estado del workspace. Lo que
          aún no está modelado (p. ej. renovaciones explícitas) se indica en cada bloque.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className={G.violet}>
          <p className={TITLE}>Ocupación por contrato vigente</p>
          <p className={SUB}>
            Tomas distintas con línea en pedido <strong>activo</strong> hoy (periodo que cubre la fecha).
          </p>
          <p className={KPI_VAL}>{fmtPct(occ.occupancy_contract_pct)}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {occ.spaces_under_contract_today ?? 0} / {occ.spaces_total ?? 0} tomas
          </p>
        </div>
        <div className={G.emerald}>
          <p className={TITLE}>Ingreso mensual en contratos vigentes</p>
          <p className={SUB}>Suma de tarifas mensuales de líneas con contrato activo hoy (USD sin IVA).</p>
          <p className={`${KPI_VAL} text-emerald-900`}>{formatUsdMoney(occ.monthly_revenue_contract_usd)}</p>
        </div>
        <div className={G.cyan}>
          <p className={TITLE}>Uso vs capacidad tarifaria listada</p>
          <p className={SUB}>
            Ingreso mensual contratado hoy frente a la suma de tarifas mensuales de todas las tomas del
            catálogo.
          </p>
          <p className={KPI_VAL}>{fmtPct(occ.capacity_use_pct)}</p>
          <p className="mt-1 text-xs text-zinc-600">
            Capacidad listada: {formatUsdMoney(occ.monthly_capacity_listed_usd)}
          </p>
        </div>
        <div className={G.amber}>
          <p className={TITLE}>Ingreso contratado acumulado</p>
          <p className={SUB}>
            Suma de totales de pedido (activos o vencidos) según fecha de registro en el periodo: es monto
            contratado, no cobro en caja.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-zinc-600">Mes en curso</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatUsdMoney(revP.mtd_usd)}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-zinc-600">Trimestre</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatUsdMoney(revP.quarter_usd)}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-zinc-600">Año en curso</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatUsdMoney(revP.ytd_usd)}
              </span>
            </li>
          </ul>
        </div>
        <div className={G.orange}>
          <p className={TITLE}>Líneas que vencen en 30 días</p>
          <p className={SUB}>Contratos activos con fin de periodo dentro del mes.</p>
          <p className={KPI_VAL}>{metrics.lines_ending_within_30_days ?? 0}</p>
        </div>
        <div className={G.indigo}>
          <p className={TITLE}>Bloqueos de calendario activos</p>
          <p className={SUB}>Bloques manuales en disponibilidad (is_active).</p>
          <p className={KPI_VAL}>{metrics.active_availability_blocks ?? 0}</p>
        </div>
      </div>

      <div className={G.chart}>
        <p className={TITLE}>Ingreso contratado y volumen de pedidos (12 meses)</p>
        <p className={SUB}>
          <strong>Barras verdes (eje izquierdo, USD):</strong> total contratado en pedidos activos o vencidos por
          mes de registro. <strong>Barras violetas (eje derecho):</strong> cantidad de pedidos enviados (no
          borrador) por mes. No confundir con el gráfico de «Pedidos creados» de la sección inferior, que es
          día a día y por fecha de creación.
        </p>
        <div className="mt-4 h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comboChart} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradRev} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "ingresos") return [formatUsdMoney(value), "Ingreso contratado"];
                  return [value, "Pedidos nuevos"];
                }}
                labelFormatter={(_, p) => (p?.[0]?.payload?.label ? String(p[0].payload.label) : "")}
                contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="left"
                dataKey="ingresos"
                name="Ingreso contratado (USD)"
                fill={`url(#${gradRev})`}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                yAxisId="right"
                dataKey="nuevas"
                name="Pedidos nuevos"
                fill="#7c3aed"
                radius={[6, 6, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={G.emerald}>
          <p className={TITLE}>Toma más rentable (histórico contratado)</p>
          <p className={SUB}>Suma de subtotales de líneas en pedidos activos o vencidos.</p>
          {top ? (
            <div className="mt-3">
              <p className="font-semibold text-zinc-900">{top.title || top.code}</p>
              <p className="font-mono text-xs text-zinc-500">{top.code}</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-800">
                {formatUsdMoney(top.revenue_usd)}
              </p>
              <Link
                href={`/dashboard/tomas?q=${encodeURIComponent(top.code || "")}`}
                className="mt-3 inline-block text-sm font-semibold text-[color:var(--mp-primary)] underline-offset-4 hover:underline"
              >
                Ver espacios
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Sin datos aún.</p>
          )}
        </div>
        <div className={G.amber}>
          <p className={TITLE}>Mayor tiempo sin contrato activo</p>
          <p className={SUB}>
            Días desde el fin del último contrato (o desde el alta de la toma si nunca contrató). Excluye
            tomas con contrato vigente hoy.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Promedio días (todas las tomas): <strong>{metrics.avg_idle_days_per_space ?? "—"}</strong>
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {coldest.length === 0 ? (
              <li className="text-zinc-500">Sin datos.</li>
            ) : (
              coldest.map((r) => (
                <li key={r.ad_space_id} className={`flex flex-wrap items-baseline justify-between gap-2 ${ROW_DIVIDER}`}>
                  <span className="min-w-0 font-medium text-zinc-800">
                    <span className="font-mono text-xs text-zinc-500">{r.code}</span>{" "}
                    <span className="line-clamp-2">{r.title}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-amber-900">{r.idle_days} d</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className={G.slate}>
        <p className={TITLE}>Tasa de renovación</p>
        <p className={SUB}>{metrics.renewal_note || "—"}</p>
      </div>

      <div className={G.sky}>
        <p className={TITLE}>Tiempos medios (eventos de estado)</p>
        <p className={SUB}>
          Promedios entre transiciones registradas en el historial de estados del pedido. El desglose por
          estado actual está en el gráfico «Pedidos por estado» más abajo.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between gap-2">
            <span className="text-zinc-600">Solicitud → activa</span>
            <span className="font-medium tabular-nums">{fmtDays(metrics.avg_days_submitted_to_active)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-zinc-600">Solicitud aprobada → arte aprobado</span>
            <span className="font-medium tabular-nums">
              {fmtDays(metrics.avg_days_client_approved_to_art_approved)}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span className="text-zinc-600">Facturada → pagada</span>
            <span className="font-medium tabular-nums">{fmtDays(metrics.avg_days_invoiced_to_paid)}</span>
          </li>
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={G.cyan}>
          <p className={TITLE}>Pedidos en permiso (por ciudad del centro)</p>
          <p className={SUB}>Ciudad del centro de la primera línea del pedido (aproximación a municipio).</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {permitCity.length === 0 ? (
              <li className="text-zinc-500">Ninguno en permiso pendiente.</li>
            ) : (
              permitCity.map((r) => (
                <li key={r.city} className="flex justify-between gap-2">
                  <span className="text-zinc-700">{r.city}</span>
                  <span className="tabular-nums font-semibold">{r.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className={G.rose}>
          <p className={TITLE}>Pedidos cancelados</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-zinc-600">Total en estado cancelada</span>
              <span className="font-semibold">{metrics.orders_cancelled_total ?? 0}</span>
            </li>
          </ul>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Cancelación desde</p>
          <ul className="mt-1 space-y-1 text-xs text-zinc-600">
            {cancelFrom.length === 0 ? (
              <li>—</li>
            ) : (
              cancelFrom.map((r) => (
                <li key={r.from_status} className="flex justify-between gap-2">
                  <span>{labelOrderStatus(r.from_status)}</span>
                  <span className="tabular-nums">{r.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className={G.teal}>
        <p className={TITLE}>Distribución de tomas por tipo</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {byType.length === 0 ? (
            <li className="text-sm text-zinc-500">Sin tomas.</li>
          ) : (
            byType.map((r) => (
              <li
                key={r.type}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/55 bg-white/45 px-3 py-2 text-sm shadow-sm shadow-black/[0.03] backdrop-blur-[1px]"
              >
                <span className="min-w-0 text-zinc-800">{labelSpaceType(r.type)}</span>
                <span className="shrink-0 tabular-nums font-semibold text-zinc-900">{r.count}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
