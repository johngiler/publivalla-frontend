import { Suspense } from "react";

import CartView from "@/views/CartView";

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-zinc-500">Cargando…</div>
      }
    >
      <CartView />
    </Suspense>
  );
}
