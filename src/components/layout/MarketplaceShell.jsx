"use client";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MarketplaceWhatsAppFab } from "@/components/layout/MarketplaceWhatsAppFab";
import {
  PublivallaFallbackBadge,
  PublivallaFallbackChrome,
} from "@/components/layout/PublivallaFallbackChrome";
import { WorkspaceUnknownFallback } from "@/components/layout/WorkspaceUnknownFallback";
import { useWorkspace } from "@/context/WorkspaceContext";

function WorkspaceErrorFallback({ message }) {
  return (
    <PublivallaFallbackChrome
      badge={<PublivallaFallbackBadge>Error de conexión</PublivallaFallbackBadge>}
      title="No pudimos cargar el marketplace"
      description="Comprueba tu conexión o vuelve a intentarlo en unos minutos. Si el problema continúa, contacta al operador de tu espacio o vuelve a Publivalla.com."
      meta={
        message ? (
          <p
            className="mx-auto mt-6 max-w-full break-words rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5 text-left text-xs leading-relaxed text-amber-100/90"
            role="status"
          >
            {message}
          </p>
        ) : null
      }
    />
  );
}

/** Layout marketplace: header + pie, o pantallas de error / owner inexistente. */
export function MarketplaceShell({ children }) {
  const { workspaceStatus, workspaceFetchError } = useWorkspace();

  if (workspaceStatus === "missing") {
    return <WorkspaceUnknownFallback />;
  }

  if (workspaceStatus === "error") {
    return <WorkspaceErrorFallback message={workspaceFetchError} />;
  }

  return (
    <>
      <Header />
      <main className="min-w-0 w-full flex-1">{children}</main>
      <Footer />
      <MarketplaceWhatsAppFab />
    </>
  );
}
