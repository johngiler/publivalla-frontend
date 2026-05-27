"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function AdminTomasViewQuerySyncInner({ onViewId }) {
  const searchParams = useSearchParams();
  const handledRef = useRef(null);
  const viewId = (searchParams.get("view") || "").trim();

  useEffect(() => {
    if (!viewId || handledRef.current === viewId) return;
    handledRef.current = viewId;
    onViewId(viewId);
  }, [viewId, onViewId]);

  return null;
}

/** Expande el acordeón del espacio cuando la URL incluye `?view=<id>`. */
export function AdminTomasViewQuerySync({ onViewId }) {
  return (
    <Suspense fallback={null}>
      <AdminTomasViewQuerySyncInner onViewId={onViewId} />
    </Suspense>
  );
}
