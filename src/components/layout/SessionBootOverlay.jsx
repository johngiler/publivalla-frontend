"use client";

import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";

/**
 * Cubre la app en la primera carga / recarga hasta tener sesión y workspace listos.
 * Evita el parpadeo del header (Panel, campana, menú).
 */
export function SessionBootOverlay() {
  const { authReady } = useAuth();
  const { workspaceStatus } = useWorkspace();
  const booting = !authReady || workspaceStatus === "loading";

  if (!booting) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-white"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span
        className="size-9 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--mp-primary,#a1a1aa)]"
        aria-hidden
      />
    </div>
  );
}
