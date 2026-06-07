import { Suspense } from "react";

import RecuperarContrasenaForm from "@/components/auth/RecuperarContrasenaForm";

function Fallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center text-zinc-500">Cargando…</div>
  );
}

export default function RecuperarContrasenaPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <RecuperarContrasenaForm />
    </Suspense>
  );
}
