"use client";

import { adminPanelCard, adminTableCard } from "@/components/admin/adminFormStyles";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Misma estructura que `PujasAdminSection` (bloques por toma). */
export function PujasSectionSkeleton() {
  return (
    <div className={adminPanelCard} aria-busy="true" aria-label="Cargando pujas">
      <div className="flex gap-3">
        <Skeleton className={`hidden h-14 w-14 shrink-0 ${ROUNDED_CONTROL} sm:block`} />
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-10 min-h-[40px] flex-1 rounded-xl" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-52" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-52" />
        </div>
      </div>
      <div className="mt-6 space-y-5">
        {[1, 2].map((k) => (
          <div key={k} className={`${adminTableCard} border-l-4 border-l-zinc-200`}>
            <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-4 sm:px-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-5 w-3/4 max-w-md" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
