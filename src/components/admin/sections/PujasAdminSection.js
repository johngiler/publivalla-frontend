"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import { AdminAccordionDetailHeader, adminAdSpaceAccordionHeader } from "@/components/admin/AdminAccordionDetail";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import {
  AdminFilterClearButton,
  AdminFilterResultHint,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
  FilterClearAction,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { IconAdminGavel } from "@/components/admin/adminIcons";
import {
  adminPanelCard,
  adminPrimaryBtn,
  adminSectionHeaderIconWrap,
  adminTableCard,
} from "@/components/admin/adminFormStyles";
import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { PujasSectionSkeleton } from "@/components/admin/skeletons/PujasSectionSkeleton";
import { useAuth } from "@/context/AuthContext";
import { isAdminCompetingCountSwrKey } from "@/lib/adminCompetingReservations";
import { dashboardPedidosSearchHref } from "@/lib/adminDashboardLinks";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { authFetch } from "@/services/authApi";
import {
  formatHumanDateTime,
} from "@/lib/humanDateTime";

/** Disputas (tomas) por página; cada bloque agrupa todas las solicitudes de esa toma. */
const PUJAS_GROUPS_PAGE_SIZE = 10;

function formatSubmittedAt(iso) {
  return formatHumanDateTime(iso);
}

/** @param {Record<string, unknown>} order */
function competingOrderMonthGroups(order) {
  const lines = Array.isArray(order.period_lines) ? order.period_lines : [];
  if (lines.length) {
    return cartLineMonthsByYear({ rental_segments: lines });
  }
  if (order.start_date && order.end_date) {
    return cartLineMonthsByYear({
      start_date: order.start_date,
      end_date: order.end_date,
    });
  }
  return [];
}

function rowMatchesSearch(group, order, q) {
  const hay = [
    group.ad_space_code,
    group.ad_space_title,
    group.shopping_center_name,
    order.client_name,
    order.code,
    String(order.id),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * @param {Array<Record<string, unknown>>} groups
 * @param {string} debouncedSearch
 * @param {string} filterCenter
 * @param {string} filterSpace
 */
function filterCompetingGroups(groups, debouncedSearch, filterCenter, filterSpace) {
  const q = debouncedSearch.trim().toLowerCase();
  return groups
    .map((group) => {
      const orders = (group.orders ?? []).filter((order) => {
        if (filterCenter !== "all" && group.shopping_center_name !== filterCenter) return false;
        if (filterSpace !== "all" && String(group.ad_space_id) !== filterSpace) return false;
        if (!q) return true;
        return rowMatchesSearch(group, order, q);
      });
      return { ...group, orders };
    })
    .filter((g) => Array.isArray(g.orders) && g.orders.length >= 2);
}

function CompetingBidGroupBlock({ group, onAward }) {
  const orders = Array.isArray(group.orders) ? group.orders : [];
  const bidCount = orders.length;

  return (
    <section
      className={`${adminTableCard} border-l-4 border-l-[color:var(--mp-primary)]`}
      aria-label={`Pujas para ${group.ad_space_code}`}
    >
      <header className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <AdminAccordionDetailHeader
              embedded
              {...adminAdSpaceAccordionHeader(group.ad_space_code, group.ad_space_title)}
            />
            {group.shopping_center_name ? (
              <p className="mt-2 text-sm text-zinc-600">{group.shopping_center_name}</p>
            ) : null}
          </div>
          <p className="shrink-0 self-start rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
            {bidCount} participante{bidCount === 1 ? "" : "s"}
          </p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-[40rem] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-white">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:px-5">
                Empresa
              </th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pedido
              </th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Meses solicitados
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Importe (sin IVA)
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:px-5">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order) => {
              const monthGroups = competingOrderMonthGroups(order);
              const periodLineCount = Array.isArray(order.period_lines)
                ? order.period_lines.length
                : 0;
              const orderRef = order.code || `#${order.id}`;
              const pedidosHref = dashboardPedidosSearchHref(orderRef.replace(/^#/, ""));
              return (
                <tr key={order.id} className="align-top bg-white">
                  <td className="px-4 py-3 align-middle sm:px-5">
                    <p className="font-medium text-zinc-900">{order.client_name || "Empresa"}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Enviado: {formatSubmittedAt(order.submitted_at)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Link
                      href={pedidosHref}
                      className="font-mono text-xs font-semibold text-[color:var(--mp-primary)] hover:underline"
                    >
                      {orderRef}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {monthGroups.length > 0 ? (
                      <div>
                        {periodLineCount > 1 ? (
                          <p className="mb-1.5 text-[11px] text-zinc-500">
                            {periodLineCount} periodos en este pedido
                          </p>
                        ) : null}
                        <RentalMonthsByYearPills
                          groups={monthGroups}
                          keyPrefix={`puja-${group.ad_space_id}-${order.id}`}
                          className="mt-0"
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right align-middle tabular-nums">
                    <span className="font-semibold text-zinc-900">
                      {formatUsdMoney(Number(order.total_amount))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right align-middle sm:px-5">
                    <button
                      type="button"
                      className={`${adminPrimaryBtn} min-w-[9.5rem]`}
                      onClick={() =>
                        onAward({
                          adSpaceId: group.ad_space_id,
                          orderId: order.id,
                          label: orderRef,
                          clientName: order.client_name || "Empresa",
                          spaceLabel: `${group.ad_space_code} — ${group.ad_space_title}`,
                        })
                      }
                    >
                      Adjudicar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PujasAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [awardTarget, setAwardTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterSpace, setFilterSpace] = useState("all");

  const debouncedSearch = useDebouncedValue(search, 350);

  const { data, isLoading, mutate } = useSWR(
    authReady && accessToken ? ["/api/admin/competing-reservations/", accessToken] : null,
    ([url, token]) => authJsonFetcher(url, { token }),
    { revalidateOnFocus: true },
  );

  const groups = Array.isArray(data?.groups) ? data.groups : [];

  const disputeCount = groups.length;
  const requestCount = useMemo(
    () => groups.reduce((n, g) => n + (g.orders?.length ?? 0), 0),
    [groups],
  );

  const centerFilterOptions = useMemo(() => {
    const names = [...new Set(groups.map((g) => g.shopping_center_name).filter(Boolean))].sort(
      (a, b) => String(a).localeCompare(String(b), "es"),
    );
    return [{ v: "all", l: "Todos los centros" }, ...names.map((n) => ({ v: n, l: n }))];
  }, [groups]);

  const spaceFilterOptions = useMemo(() => {
    let scoped = groups;
    if (filterCenter !== "all") {
      scoped = scoped.filter((g) => g.shopping_center_name === filterCenter);
    }
    return [
      { v: "all", l: "Todos los espacios publicitarios" },
      ...scoped.map((g) => ({
        v: String(g.ad_space_id),
        l: `${g.ad_space_code} — ${g.ad_space_title}`,
      })),
    ];
  }, [groups, filterCenter]);

  useEffect(() => {
    if (filterSpace === "all") return;
    if (!spaceFilterOptions.some((o) => o.v === filterSpace)) {
      setFilterSpace("all");
    }
  }, [filterSpace, spaceFilterOptions]);

  const filtersActive =
    debouncedSearch.trim() !== "" || filterCenter !== "all" || filterSpace !== "all";

  const filteredGroups = useMemo(
    () => filterCompetingGroups(groups, debouncedSearch, filterCenter, filterSpace),
    [groups, debouncedSearch, filterCenter, filterSpace],
  );

  const filteredRequestCount = useMemo(
    () => filteredGroups.reduce((n, g) => n + (g.orders?.length ?? 0), 0),
    [filteredGroups],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCenter, filterSpace]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * PUJAS_GROUPS_PAGE_SIZE;
    return filteredGroups.slice(start, start + PUJAS_GROUPS_PAGE_SIZE);
  }, [filteredGroups, page]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterCenter("all");
    setFilterSpace("all");
    setPage(1);
  }, []);

  const runAward = useCallback(async () => {
    if (!awardTarget) return;
    const { adSpaceId, orderId } = awardTarget;
    await authFetch(`/api/admin/competing-reservations/${adSpaceId}/award/`, {
      method: "POST",
      body: { winner_order_id: orderId },
    });
    await mutate();
    await globalMutate(isAdminCompetingCountSwrKey);
    await revalidateHomeCatalog(globalMutate);
    setMessage(
      "Solicitud adjudicada. Las demás solicitudes de este espacio publicitario se rechazaron.",
    );
    setError("");
    setAwardTarget(null);
  }, [awardTarget, mutate]);

  if (!authReady || isLoading) {
    return <PujasSectionSkeleton />;
  }

  const hasDisputes = groups.length > 0;

  return (
    <>
      <div className={adminPanelCard}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconAdminGavel className="!h-8 !w-8" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pujas</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {disputeCount === 0
                  ? "Sin disputas pendientes"
                  : `${disputeCount} ${disputeCount === 1 ? "espacio publicitario" : "espacios publicitarios"} · ${requestCount} solicitud${requestCount === 1 ? "" : "es"}`}
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="mt-4">
            <AdminInlineAlert variant="success" onDismiss={() => setMessage("")}>
              {message}
            </AdminInlineAlert>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <AdminInlineAlert variant="error" onDismiss={() => setError("")}>
              {error}
            </AdminInlineAlert>
          </div>
        ) : null}

        {!hasDisputes ? (
          <div className="mt-6">
            <EmptyState
              icon={<EmptyStateIconBuilding />}
              title="Sin disputas pendientes"
              description="No hay espacios publicitarios con varias solicitudes enviadas a la vez. Cuando ocurra, aparecerán aquí."
            />
          </div>
        ) : (
          <>
            <AdminFiltersRow>
              <AdminFilterSearchInput
                id="pujas-filter-search"
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Buscar por espacio, empresa o pedido…"
                className="min-w-0 flex-[1.6]"
              />
              <AdminFilterSelect
                id="pujas-filter-center"
                label="Centro"
                value={filterCenter}
                onChange={(v) => {
                  setFilterCenter(v);
                  setPage(1);
                }}
                options={centerFilterOptions}
              />
              <AdminFilterSelect
                id="pujas-filter-space"
                label="Espacio publicitario"
                value={filterSpace}
                onChange={(v) => {
                  setFilterSpace(v);
                  setPage(1);
                }}
                options={spaceFilterOptions}
              />
              <AdminFilterClearButton show={filtersActive} onClick={clearFilters} />
            </AdminFiltersRow>

            <AdminFilterResultHint
              shown={filteredGroups.length}
              total={disputeCount}
              noun="disputas"
            />
            {filteredRequestCount !== requestCount && filtersActive ? (
              <p className="mt-1 text-xs text-zinc-500">
                {filteredRequestCount} solicitud{filteredRequestCount === 1 ? "" : "es"} en esta vista
              </p>
            ) : null}

            {filteredGroups.length === 0 && filtersActive ? (
              <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ninguna disputa coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction onClick={clearFilters} />
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {paginatedGroups.map((group) => (
                  <CompetingBidGroupBlock
                    key={group.ad_space_id}
                    group={group}
                    onAward={setAwardTarget}
                  />
                ))}
              </div>
            )}

            {filteredGroups.length > 0 ? (
              <AdminListPagination
                page={page}
                totalCount={filteredGroups.length}
                onPageChange={setPage}
                pageSize={PUJAS_GROUPS_PAGE_SIZE}
              />
            ) : null}
          </>
        )}
      </div>

      <AdminConfirmDialog
        open={awardTarget != null}
        onClose={() => setAwardTarget(null)}
        title="Adjudicar solicitud"
        confirmLabel="Adjudicar"
        onConfirm={async () => {
          try {
            await runAward();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo adjudicar.");
            throw e;
          }
        }}
      >
        {awardTarget ? (
          <p>
            ¿Adjudicas la solicitud de <strong>{awardTarget.clientName}</strong> (
            <span className="font-mono text-zinc-800">{awardTarget.label}</span>) para el espacio publicitario{" "}
            <strong>{awardTarget.spaceLabel}</strong>? Las demás solicitudes enviadas para este espacio publicitario
            se rechazarán.
          </p>
        ) : null}
      </AdminConfirmDialog>
    </>
  );
}
