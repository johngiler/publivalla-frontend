"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Misma estructura que la tabla en `BloqueosDisponibilidadAdminSection`. */
export function BloqueosDisponibilidadSectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando bloqueos de disponibilidad">
      <div className={`overflow-x-auto ${ROUNDED_CONTROL} border border-zinc-200`}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="w-10 px-2 py-3" aria-hidden />
              <th className="px-3 py-2">Toma</th>
              <th className="px-3 py-2">Centro</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((k) => (
              <tr key={k} className="border-t border-zinc-100">
                <td className="px-2 py-3">
                  <Skeleton className="mx-auto h-9 w-9 rounded-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-36 max-w-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </td>
                <td className="px-2 py-3 text-right">
                  <Skeleton className="ms-auto h-8 w-24 rounded-lg" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
