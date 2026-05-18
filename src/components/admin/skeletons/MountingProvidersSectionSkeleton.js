"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Misma estructura que la tabla de proveedores en `MountingProvidersAdminSection`. */
export function MountingProvidersSectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando proveedores de montaje">
      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-10 min-h-[40px] flex-1 rounded-xl" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-52" />
          <Skeleton className="h-10 min-h-[40px] w-full rounded-xl sm:w-48" />
        </div>
      </div>
      <div className={`mt-6 overflow-x-auto ${ROUNDED_CONTROL} border border-zinc-200`}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="w-10 px-2 py-3" aria-hidden />
              <th className="px-3 py-2">Centro</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-2 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((k) => (
              <tr key={k} className="border-t border-zinc-100">
                <td className="px-2 py-3">
                  <Skeleton className="mx-auto h-9 w-9 rounded-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-32 max-w-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-40 max-w-full" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-3 py-3">
                  <Skeleton className="h-4 w-24" />
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
