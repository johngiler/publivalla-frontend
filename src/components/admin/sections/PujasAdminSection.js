"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";

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
import { AdminListPagination, ADMIN_LIST_PAGE_SIZE } from "@/components/admin/AdminListPagination";
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
import { dashboardPedidosSearchHref } from "@/lib/adminDashboardLinks";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { authFetch } from "@/services/authApi";

const PUJAS_PAGE_SIZE = ADMIN_LIST_PAGE_SIZE;

function formatSubmittedAt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const tableRows = useMemo(
    () =>
      groups.flatMap((group) =>
        (group.orders ?? []).map((order) => ({
          group,
          order,
        })),
      ),
    [groups],
  );

  const disputeCount = groups.length;
  const requestCount = tableRows.length;

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
      { v: "all", l: "Todas las tomas" },
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

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return tableRows.filter(({ group, order }) => {
      if (filterCenter !== "all" && group.shopping_center_name !== filterCenter) return false;
      if (filterSpace !== "all" && String(group.ad_space_id) !== filterSpace) return false;
      if (!q) return true;
      return rowMatchesSearch(group, order, q);
    });
  }, [tableRows, debouncedSearch, filterCenter, filterSpace]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCenter, filterSpace]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PUJAS_PAGE_SIZE;
    return filteredRows.slice(start, start + PUJAS_PAGE_SIZE);
  }, [filteredRows, page]);

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
    await revalidateHomeCatalog(globalMutate);
    setMessage("Solicitud adjudicada. Las demás solicitudes de esta toma se cancelaron.");
    setError("");
    setAwardTarget(null);
  }, [awardTarget, mutate]);

  if (!authReady || isLoading) {
    return <PujasSectionSkeleton />;
  }

  const hasDisputes = tableRows.length > 0;

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
                  : `${disputeCount} toma${disputeCount === 1 ? "" : "s"} · ${requestCount} solicitud${requestCount === 1 ? "" : "es"}`}
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
              description="No hay tomas con varias solicitudes enviadas a la vez. Cuando ocurra, aparecerán aquí."
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
                placeholder="Toma, centro, cliente o pedido…"
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
                label="Toma"
                value={filterSpace}
                onChange={(v) => {
                  setFilterSpace(v);
                  setPage(1);
                }}
                options={spaceFilterOptions}
              />
              <AdminFilterClearButton show={filtersActive} onClick={clearFilters} />
            </AdminFiltersRow>

            <AdminFilterResultHint shown={filteredRows.length} total={requestCount} noun="solicitudes" />

            {filteredRows.length === 0 && filtersActive ? (
              <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ninguna solicitud coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction onClick={clearFilters} />
                </div>
              </div>
            ) : (
              <div className={`mt-6 ${adminTableCard}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-[48rem] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/90">
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Toma
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Cliente
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Pedido
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Meses solicitados
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Importe (sin IVA)
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {paginatedRows.map(({ group, order }) => {
                        const monthGroups = competingOrderMonthGroups(order);
                        const periodLineCount = Array.isArray(order.period_lines)
                          ? order.period_lines.length
                          : 0;
                        const orderRef = order.code || `#${order.id}`;
                        const pedidosHref = dashboardPedidosSearchHref(orderRef.replace(/^#/, ""));
                        return (
                          <tr key={`${group.ad_space_id}-${order.id}`} className="align-top">
                            <td className="px-3 py-3 align-middle">
                              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                {group.ad_space_code}
                              </p>
                              <p className="mt-0.5 font-medium text-zinc-900">{group.ad_space_title}</p>
                              <p className="mt-0.5 text-xs text-zinc-500">{group.shopping_center_name}</p>
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <p className="font-medium text-zinc-900">{order.client_name || "Cliente"}</p>
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
                            <td className="px-3 py-3 text-right align-middle">
                              <button
                                type="button"
                                className={`${adminPrimaryBtn} min-w-[9.5rem]`}
                                onClick={() =>
                                  setAwardTarget({
                                    adSpaceId: group.ad_space_id,
                                    orderId: order.id,
                                    label: orderRef,
                                    clientName: order.client_name || "Cliente",
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
              </div>
            )}

            {filteredRows.length > 0 ? (
              <AdminListPagination
                page={page}
                totalCount={filteredRows.length}
                onPageChange={setPage}
                pageSize={PUJAS_PAGE_SIZE}
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
            <span className="font-mono text-zinc-800">{awardTarget.label}</span>) para la toma{" "}
            <strong>{awardTarget.spaceLabel}</strong>? Las demás solicitudes enviadas para esta toma
            se cancelarán.
          </p>
        ) : null}
      </AdminConfirmDialog>
    </>
  );
}
