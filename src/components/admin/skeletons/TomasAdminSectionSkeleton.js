import { adminPanelCard, adminTableCard } from "@/components/admin/adminFormStyles";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Misma estructura que `TomasAdminSection`. */
export function TomasAdminSectionSkeleton() {
  return (
    <div className={adminPanelCard}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Skeleton className={`hidden h-14 w-14 shrink-0 ${ROUNDED_CONTROL} sm:block`} />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className={`h-11 w-36 ${ROUNDED_CONTROL}`} />
      </div>
      <div className={`mt-6 ${adminTableCard}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90">
                <th className="w-10 px-2 py-3" />
                <th className="px-2 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="px-3 py-3">
                  <Skeleton className="h-3 w-14" />
                </th>
                <th className="px-3 py-3">
                  <Skeleton className="h-3 w-14" />
                </th>
                <th className="px-3 py-3">
                  <Skeleton className="h-3 w-20" />
                </th>
                <th className="px-3 py-3">
                  <Skeleton className="h-3 w-24" />
                </th>
                <th className="px-3 py-3">
                  <Skeleton className="h-3 w-14" />
                </th>
                <th className="px-3 py-3 text-right">
                  <Skeleton className="ml-auto h-3 w-20" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="px-2 py-3">
                    <Skeleton className={`h-8 w-8 ${ROUNDED_CONTROL}`} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton className="h-[60px] w-[60px] shrink-0 rounded-[10px]" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Skeleton className={`ml-auto h-8 w-24 ${ROUNDED_CONTROL}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
