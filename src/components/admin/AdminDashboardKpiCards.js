"use client";

import Link from "next/link";

import {
  IconAdminBriefcase,
  IconAdminBuilding,
  IconAdminClipboard,
  IconAdminContract,
  IconAdminGrid,
} from "@/components/admin/adminIcons";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const iconBox =
  "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/80 shadow-sm shadow-black/[0.04] backdrop-blur-[3px] [&_svg]:!h-6 [&_svg]:!w-6";

const linkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/90 focus-visible:ring-offset-2";

/**
 * Tarjetas de totales del resumen admin (gradiente + icono por métrica).
 * @param {object} props
 * @param {string} props.nCenters
 * @param {string} props.nSpaces
 * @param {string} props.nClients
 * @param {string} props.nContractsRunning — líneas de contrato en curso (pedido activo, periodo vigente hoy).
 * @param {string} props.nOrders
 */
export function AdminDashboardKpiCards({ nCenters, nSpaces, nClients, nContractsRunning, nOrders }) {
  const items = [
    {
      key: "centers",
      href: "/dashboard/centros",
      label: "Centros comerciales",
      value: nCenters,
      Icon: IconAdminBuilding,
      card: `bg-gradient-to-br from-violet-100/95 via-purple-50/90 to-white ring-1 ring-violet-200/50`,
      iconWrap: `${iconBox} bg-gradient-to-br from-violet-500/25 to-purple-600/20 text-violet-700/55`,
      labelClass: "text-violet-950/70",
      valueClass: "text-violet-950",
    },
    {
      key: "spaces",
      href: "/dashboard/tomas",
      label: "Espacios publicitarios",
      value: nSpaces,
      Icon: IconAdminGrid,
      card: `bg-gradient-to-br from-cyan-100/90 via-teal-50/80 to-white ring-1 ring-cyan-200/55`,
      iconWrap: `${iconBox} bg-gradient-to-br from-cyan-500/25 to-teal-600/20 text-teal-700/55`,
      labelClass: "text-teal-950/70",
      valueClass: "text-teal-950",
    },
    {
      key: "clients",
      href: "/dashboard/clientes",
      label: "Clientes",
      value: nClients,
      Icon: IconAdminBriefcase,
      card: `bg-gradient-to-br from-amber-100/95 via-orange-50/85 to-white ring-1 ring-amber-200/60`,
      iconWrap: `${iconBox} bg-gradient-to-br from-amber-500/30 to-orange-500/22 text-amber-800/50`,
      labelClass: "text-amber-950/75",
      valueClass: "text-amber-950",
    },
    {
      key: "contracts-running",
      href: "/dashboard/contratos?phase=running",
      label: "Contratos en curso",
      value: nContractsRunning,
      Icon: IconAdminContract,
      card: `bg-gradient-to-br from-indigo-100/90 via-sky-50/80 to-white ring-1 ring-indigo-200/50`,
      iconWrap: `${iconBox} bg-gradient-to-br from-indigo-500/25 to-sky-500/22 text-indigo-700/55`,
      labelClass: "text-indigo-950/70",
      valueClass: "text-indigo-950",
    },
    {
      key: "orders",
      href: "/dashboard/pedidos",
      label: "Pedidos",
      value: nOrders,
      Icon: IconAdminClipboard,
      card: `bg-gradient-to-br from-rose-100/90 via-fuchsia-50/75 to-white ring-1 ring-rose-200/55`,
      iconWrap: `${iconBox} bg-gradient-to-br from-rose-500/25 to-fuchsia-600/20 text-rose-700/55`,
      labelClass: "text-rose-950/70",
      valueClass: "text-rose-950",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map(({ key, href, label, value, Icon, card, iconWrap, labelClass, valueClass }) => (
        <Link
          key={key}
          href={href}
          className={`${ROUNDED_CONTROL} ${card} ${linkFocus} block cursor-pointer p-4 text-left no-underline shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-14px_rgba(15,23,42,0.18)] active:scale-[0.99]`}
          aria-label={`Ir a ${label}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className={`min-w-0 text-xs font-semibold uppercase tracking-wide ${labelClass}`}>{label}</p>
            <div className={iconWrap} aria-hidden>
              <Icon />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
        </Link>
      ))}
    </div>
  );
}
