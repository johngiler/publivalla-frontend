import { Suspense } from "react";

import MisContratosView from "@/views/MisContratosView";

export default function MisContratosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-zinc-500">Cargando…</div>
      }
    >
      <MisContratosView />
    </Suspense>
  );
}
