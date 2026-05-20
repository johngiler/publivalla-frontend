import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/**
 * Solo la lista de tarjetas. En `MisPedidosView` la barra de filtros (búsqueda + estado + limpiar) sigue
 * visible mientras carga; no se duplica aquí.
 */
export function MisPedidosSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando pedidos">
    <ul className="mt-4 space-y-4">
      {/* Pedido con una sola toma (resumen: thumb + código) */}
      <li
        className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
      >
        <div className="flex w-full items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-[120px] w-[120px] shrink-0 rounded-[10px]" />
                  <div className="min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-28 max-w-[min(100%,12rem)]" />
                    <Skeleton className="h-3.5 w-20 max-w-full" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="ms-auto h-2.5 w-28" />
                <Skeleton className="ms-auto mt-1 h-7 w-20" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-44 max-w-full" />
              </div>
              <div className="text-right">
                <Skeleton className="ms-auto h-2.5 w-32" />
                <Skeleton className="ms-auto mt-1 h-7 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="mt-1 h-9 w-9 shrink-0 rounded-full" />
        </div>
      </li>
      {/* Pedido con varias tomas: título “N tomas…” + lista compacta */}
      <li
        className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
      >
        <div className="flex w-full items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-52 max-w-full" />
                <div className="mt-2 flex flex-wrap gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex w-[120px] shrink-0 flex-col">
                      <Skeleton className="h-[120px] w-[120px] rounded-[10px]" />
                      <Skeleton className="mt-1 h-3 w-full" />
                      <Skeleton className="mt-1 h-2.5 w-12" />
                      <Skeleton className="mt-0.5 h-3 w-full" />
                      <div className="mt-1 flex w-full flex-wrap gap-1">
                        <Skeleton className="h-5 w-9 rounded-md" />
                        <Skeleton className="h-5 w-9 rounded-md" />
                      </div>
                      <Skeleton className="mt-1 h-4 w-14" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="ms-auto h-2.5 w-36" />
                <Skeleton className="ms-auto mt-1 h-7 w-24" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <div className="text-right">
                <Skeleton className="ms-auto h-2.5 w-36" />
                <Skeleton className="ms-auto mt-1 h-7 w-28" />
              </div>
            </div>
          </div>
          <Skeleton className="mt-1 h-9 w-9 shrink-0 rounded-full" />
        </div>
      </li>
      {/* Otra tarjeta de una toma */}
      <li
        className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
      >
        <div className="flex w-full items-start justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-[120px] w-[120px] shrink-0 rounded-[10px]" />
                  <div className="min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-24 max-w-[min(100%,11rem)]" />
                    <Skeleton className="h-3.5 w-20 max-w-full" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="ms-auto h-2.5 w-28" />
                <Skeleton className="ms-auto mt-1 h-7 w-20" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-40 max-w-full" />
              </div>
              <div className="text-right">
                <Skeleton className="ms-auto h-2.5 w-32" />
                <Skeleton className="ms-auto mt-1 h-7 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="mt-1 h-9 w-9 shrink-0 rounded-full" />
        </div>
      </li>
    </ul>
      <Skeleton className="mx-auto mt-6 h-[4.5rem] w-full max-w-2xl rounded-2xl" aria-hidden />
    </div>
  );
}
