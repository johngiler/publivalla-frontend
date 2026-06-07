import { Suspense } from "react";

import RestablecerContrasenaForm from "@/components/auth/RestablecerContrasenaForm";

function Fallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center text-zinc-500">Cargando…</div>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <RestablecerContrasenaForm />
    </Suspense>
  );
}
