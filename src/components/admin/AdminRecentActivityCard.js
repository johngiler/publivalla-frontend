"use client";

import Link from "next/link";

import {
  IconAdminBriefcase,
  IconAdminClipboard,
  IconAdminUserPlus,
} from "@/components/admin/adminIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { formatHumanDateTime } from "@/lib/humanDateTime";

const kindStyles = {
  order_status_changed: {
    ring: "ring-violet-200/60",
    iconWrap: "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 text-violet-700/80",
    Icon: IconAdminClipboard,
  },
  client_created: {
    ring: "ring-amber-200/60",
    iconWrap: "bg-gradient-to-br from-amber-500/25 to-orange-500/18 text-amber-800/75",
    Icon: IconAdminBriefcase,
  },
  user_created: {
    ring: "ring-indigo-200/55",
    iconWrap: "bg-gradient-to-br from-indigo-500/22 to-sky-500/18 text-indigo-700/80",
    Icon: IconAdminUserPlus,
  },
};

function ActivityIcon({ kind }) {
  const cfg = kindStyles[kind] ?? kindStyles.order_status_changed;
  const I = cfg.Icon;
  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${cfg.iconWrap} ${cfg.ring} [&_svg]:!h-5 [&_svg]:!w-5`}
      aria-hidden
    >
      <I />
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array<object>} [props.activities]
 * @param {boolean} [props.loading]
 * @param {Error|string|null} [props.error]
 */
export function AdminRecentActivityCard({ activities = [], loading = false, error = null }) {
  const errMsg = error != null ? (error instanceof Error ? error.message : String(error)) : null;

  return (
    <section
      className={`relative overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-gradient-to-br from-zinc-50/90 via-white to-violet-50/25 p-4 shadow-[0_2px_20px_rgba(15,23,42,0.06)] sm:p-5`}
      aria-labelledby="admin-recent-activity-heading"
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 size-56 rounded-full bg-gradient-to-br from-violet-400/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <h2 id="admin-recent-activity-heading" className="text-sm font-semibold text-zinc-900">
          Actividad reciente
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Cambios de estado de pedidos, altas de empresas y usuarios. Para líneas de contrato, totales y periodos
          concretos, usa <span className="font-medium text-zinc-600">Pedidos</span> en el menú lateral.
        </p>

        {errMsg ? (
          <p className={`mt-4 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
            {errMsg}
          </p>
        ) : null}

        {loading && !errMsg ? (
          <ul className="mt-4 space-y-3" aria-busy="true" aria-label="Cargando actividad">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className={`flex gap-3 rounded-xl border border-zinc-100/90 bg-white/60 p-3 ${ROUNDED_CONTROL}`}
              >
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !errMsg && activities.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Aún no hay actividad registrada para este workspace.
          </p>
        ) : null}

        {!loading && !errMsg && activities.length > 0 ? (
          <ul className="mt-4 max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {activities.map((a) => {
              return (
                <li key={a.id}>
                  <Link
                    href={a.href || "/dashboard"}
                    className={`group flex gap-3 rounded-xl border border-zinc-200/70 bg-white/70 p-3 text-left shadow-sm shadow-zinc-900/[0.03] transition-[border-color,box-shadow,background-color] duration-200 ${ROUNDED_CONTROL} hover:border-[color-mix(in_srgb,var(--mp-primary)_28%,#e4e4e7)] hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2`}
                  >
                    <div className="shrink-0 pt-0.5">
                      <ActivityIcon kind={a.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-zinc-900">{a.title}</p>
                        <time
                          className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-400"
                          dateTime={a.at}
                        >
                          {formatHumanDateTime(a.at)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-zinc-700">{a.primary_line}</p>
                      {a.secondary_line ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{a.secondary_line}</p>
                      ) : null}
                      {a.tertiary_line ? (
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{a.tertiary_line}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-medium text-[color:var(--mp-primary)] opacity-90 transition-opacity group-hover:opacity-100">
                        Ver en el panel →
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
