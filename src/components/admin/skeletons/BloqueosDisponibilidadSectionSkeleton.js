"use client";

import { adminPanelCard, adminTableCard } from "@/components/admin/adminFormStyles";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Misma estructura que `BloqueosDisponibilidadAdminSection`. */
export function BloqueosDisponibilidadSectionSkeleton() {
  return (
    <div className={adminPanelCard} aria-busy="true" aria-label="Cargando bloqueos de disponibilidad">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Skeleton className={`hidden h-14 w-14 shrink-0 ${ROUNDED_CONTROL} sm:block`} />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className={`h-11 w-40 ${ROUNDED_CONTROL}`} />
      </div>
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-10 min-h-[40px] flex-1 rounded-xl" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-52" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-48" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-48" />
        </div>
      </div>
      <div className={`mt-6 ${adminTableCard}`}>
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
