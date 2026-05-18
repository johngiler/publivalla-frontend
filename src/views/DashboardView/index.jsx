"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import useSWR from "swr";

import { CentrosAdminSection } from "@/components/admin/sections/CentrosAdminSection";
import { ClientesAdminSection } from "@/components/admin/sections/ClientesAdminSection";
import { ContratosAdminSection } from "@/components/admin/sections/ContratosAdminSection";
import { BloqueosDisponibilidadAdminSection } from "@/components/admin/sections/BloqueosDisponibilidadAdminSection";
import { PujasAdminSection } from "@/components/admin/sections/PujasAdminSection";
import { MountingProvidersAdminSection } from "@/components/admin/sections/MountingProvidersAdminSection";
import { PedidosAdminSection } from "@/components/admin/sections/PedidosAdminSection";
import { TomasAdminSection } from "@/components/admin/sections/TomasAdminSection";
import { UsuariosAdminSection } from "@/components/admin/sections/UsuariosAdminSection";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardKpiCards } from "@/components/admin/AdminDashboardKpiCards";
import { AdminDashboardMetrics } from "@/components/admin/AdminDashboardMetrics";
import { AdminDashboardOrdersCreatedCard } from "@/components/admin/AdminDashboardOrdersCreatedCard";
import { AdminDashboardSpaceMonthlyPriceCard } from "@/components/admin/AdminDashboardSpaceMonthlyPriceCard";
import { AdminRecentActivityCard } from "@/components/admin/AdminRecentActivityCard";
import { DashboardChromeSkeleton } from "@/components/admin/skeletons/DashboardChromeSkeleton";
import { ResumenTabSkeleton } from "@/components/admin/skeletons/ResumenTabSkeleton";
import { IconChevronLeft } from "@/components/layout/navIcons";
import { useAuth } from "@/context/AuthContext";
import { adminDashboardMainWidthClass } from "@/components/admin/adminFormStyles";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authJsonFetcher } from "@/lib/swr/fetchers";
/** Etiqueta de rol como en el panel Usuarios (UserProfile). */
const MARKETPLACE_ROLE_BADGE_LABEL = {
  admin: "Administrador marketplace",
  client: "Cliente marketplace",
};

function marketplaceRoleBadgeLabel(role) {
  if (role == null || role === "") return "";
  return MARKETPLACE_ROLE_BADGE_LABEL[role] ?? role;
}

const DASHBOARD_STATS_PATH = "/api/admin/dashboard/stats/";
const DASHBOARD_ACTIVITY_PATH = "/api/admin/dashboard/activity/?limit=40";

function ResumenTab() {
  const priceGradId = `dash-econ-${useId().replace(/:/g, "")}`;
  const ordersAreaGradId = `dash-area-${useId().replace(/:/g, "")}`;
  const { authReady, accessToken } = useAuth();
  const fetchStats = authReady && !!accessToken;

  const { data, error, isLoading } = useSWR(fetchStats ? DASHBOARD_STATS_PATH : null, authJsonFetcher);
  const {
    data: activityData,
    error: activityError,
    isLoading: activityLoading,
  } = useSWR(fetchStats ? DASHBOARD_ACTIVITY_PATH : null, authJsonFetcher);

  const { nCenters, nSpaces, nClients, nContractsRunning, nOrders, ready, chartStats } = useMemo(() => {
    if (!fetchStats) {
      return {
        nCenters: "—",
        nSpaces: "—",
        nClients: "—",
        nContractsRunning: "—",
        nOrders: "—",
        ready: true,
        chartStats: null,
      };
    }
    if (isLoading) {
      return {
        nCenters: "—",
        nSpaces: "—",
        nClients: "—",
        nContractsRunning: "—",
        nOrders: "—",
        ready: false,
        chartStats: null,
      };
    }
    if (error) {
      return {
        nCenters: "—",
        nSpaces: "—",
        nClients: "—",
        nContractsRunning: "—",
        nOrders: "—",
        ready: true,
        chartStats: null,
      };
    }
    const c = data?.counts;
    const fmt = (n) => (typeof n === "number" && Number.isFinite(n) ? String(n) : "0");
    return {
      nCenters: fmt(c?.centers),
      nSpaces: fmt(c?.spaces),
      nClients: fmt(c?.clients),
      nContractsRunning: fmt(c?.contracts_running),
      nOrders: fmt(c?.orders),
      ready: true,
      chartStats: data ?? null,
    };
  }, [fetchStats, isLoading, error, data]);

  if (!ready) {
    return <ResumenTabSkeleton />;
  }

  const errMsg = error != null ? (error instanceof Error ? error.message : "No se pudieron cargar las métricas.") : null;

  return (
    <div className="space-y-6">
      {errMsg ? (
        <p className={`${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
          {errMsg}
        </p>
      ) : null}
      <AdminDashboardKpiCards
        nCenters={nCenters}
        nSpaces={nSpaces}
        nClients={nClients}
        nContractsRunning={nContractsRunning}
        nOrders={nOrders}
      />
      <AdminDashboardSpaceMonthlyPriceCard economics={chartStats?.economics} gradId={priceGradId} />
      {chartStats ? (
        <AdminDashboardOrdersCreatedCard ordersByDay={chartStats.orders_by_day} gradId={ordersAreaGradId} />
      ) : null}
      {chartStats?.metrics ? <AdminDashboardMetrics metrics={chartStats.metrics} /> : null}
      {chartStats ? <AdminDashboardCharts stats={chartStats} /> : null}
      <AdminRecentActivityCard
        activities={Array.isArray(activityData?.activities) ? activityData.activities : []}
        loading={Boolean(fetchStats && activityLoading)}
        error={activityError}
      />
    </div>
  );
}

export default function DashboardView({ section = "resumen" }) {
  const { authReady, role } = useAuth();

  if (!authReady) {
    return (
      <div className={`${adminDashboardMainWidthClass} py-16`}>
        <DashboardChromeSkeleton />
      </div>
    );
  }

  const roleBadge = marketplaceRoleBadgeLabel(role);

  return (
    <div className={adminDashboardMainWidthClass}>
      <header className="min-w-0">
        <h1 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
          <span className="min-w-0">Panel de administración</span>
          {roleBadge ? (
            <span
              className="inline-flex max-w-full items-center rounded-full border border-orange-200/90 bg-gradient-to-r from-orange-50/95 via-amber-50/80 to-white px-4 py-1.5 text-sm font-semibold text-orange-950 shadow-sm ring-1 ring-orange-100/70"
              title="Tu rol en este marketplace"
            >
              {roleBadge}
            </span>
          ) : null}
        </h1>
      </header>

      <div className="mt-8">
        {section === "resumen" ? <ResumenTab /> : null}
        {section === "centros" ? <CentrosAdminSection /> : null}
        {section === "proveedores-montaje" ? <MountingProvidersAdminSection /> : null}
        {section === "tomas" ? <TomasAdminSection /> : null}
        {section === "bloqueos" ? <BloqueosDisponibilidadAdminSection /> : null}
        {section === "pujas" ? <PujasAdminSection /> : null}
        {section === "usuarios" ? <UsuariosAdminSection /> : null}
        {section === "clientes" ? <ClientesAdminSection /> : null}
        {section === "contratos" ? <ContratosAdminSection /> : null}
        {section === "pedidos" ? <PedidosAdminSection /> : null}
      </div>

      <p className="mt-10 text-sm text-zinc-500 lg:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-medium text-zinc-800 no-underline underline-offset-4 hover:underline"
        >
          <IconChevronLeft className="text-zinc-600" />
          Volver al marketplace
        </Link>
      </p>
    </div>
  );
}
