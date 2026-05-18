"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";

import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { IconAdminGavel } from "@/components/admin/adminIcons";
import {
  adminPanelCard,
  adminPrimaryBtn,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import { PujasSectionSkeleton } from "@/components/admin/skeletons/PujasSectionSkeleton";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { authFetch } from "@/services/authApi";

function formatPeriod(start, end) {
  if (!start || !end) return "—";
  const fmt = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-VE", { month: "short", year: "numeric" });
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

export function PujasAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [awardTarget, setAwardTarget] = useState(null);

  const { data, isLoading, mutate } = useSWR(
    authReady && accessToken ? ["/api/admin/competing-reservations/", accessToken] : null,
    ([url, token]) => authJsonFetcher(url, { token }),
    { revalidateOnFocus: true },
  );

  const groups = Array.isArray(data?.groups) ? data.groups : [];

  const runAward = useCallback(async () => {
    if (!awardTarget) return;
    const { adSpaceId, orderId } = awardTarget;
    await authFetch(`/api/admin/competing-reservations/${adSpaceId}/award/`, {
      method: "POST",
      body: { winner_order_id: orderId },
    });
    await mutate();
    await revalidateHomeCatalog();
    setMessage("Solicitud adjudicada. Las demás solicitudes de esta toma se cancelaron.");
    setError("");
    setAwardTarget(null);
  }, [awardTarget, mutate]);


  if (!authReady || isLoading) {
    return <PujasSectionSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className={adminSectionHeaderIconWrap}>
          <IconAdminGavel className="h-6 w-6 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Pujas</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Cuando dos o más clientes envían una solicitud (estado enviada) para la misma toma,
            elige aquí cuál pedido adjudicar. El ganador pasa a «Solicitud aprobada»; el resto se
            cancela.
          </p>
        </div>
      </div>

      {message ? (
        <AdminInlineAlert variant="success" onDismiss={() => setMessage("")}>
          {message}
        </AdminInlineAlert>
      ) : null}
      {error ? (
        <AdminInlineAlert variant="error" onDismiss={() => setError("")}>
          {error}
        </AdminInlineAlert>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          icon={<EmptyStateIconBuilding />}
          title="Sin disputas pendientes"
          description="No hay tomas con varias solicitudes enviadas a la vez. Cuando ocurra, aparecerán aquí."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.ad_space_id} className={adminPanelCard}>
              <header className="border-b border-zinc-100 px-4 py-4 sm:px-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {group.ad_space_code}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-950">{group.ad_space_title}</h2>
                <p className="mt-0.5 text-sm text-zinc-600">{group.shopping_center_name}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {group.orders?.length ?? 0} solicitudes enviadas en disputa
                </p>
              </header>
              <ul className="divide-y divide-zinc-100">
                {(group.orders ?? []).map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">{order.client_name || "Cliente"}</p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">
                        {order.code || `#${order.id}`}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Período: {formatPeriod(order.start_date, order.end_date)}
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums text-zinc-700">
                        Total estimado: USD {order.total_amount}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`${adminPrimaryBtn} shrink-0 sm:min-w-[10rem]`}
                      onClick={() =>
                        setAwardTarget({
                          adSpaceId: group.ad_space_id,
                          orderId: order.id,
                          label: order.code || String(order.id),
                        })
                      }
                    >
                      Adjudicar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}


      <AdminConfirmDialog
        open={awardTarget != null}
        title="Adjudicar solicitud"
        description={
          awardTarget
            ? `¿Confirmas adjudicar el pedido ${awardTarget.label}? Las demás solicitudes enviadas para esta toma se cancelarán.`
            : ""
        }
        confirmLabel="Adjudicar"
        destructive
        onCancel={() => setAwardTarget(null)}
        onConfirm={async () => {
          try {
            await runAward();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo adjudicar.");
            throw e;
          }
        }}
      />
    </div>
  );
}
