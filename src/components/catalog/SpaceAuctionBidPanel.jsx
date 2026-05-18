"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { adminPrimaryBtn } from "@/components/admin/adminFormStyles";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { useAuth } from "@/context/AuthContext";
import { formatAuctionDate, formatAuctionDateTime, formatUsd } from "@/lib/auctionDisplay";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { postAuctionBid } from "@/services/authApi";

/**
 * Oferta en detalle de toma cuando hay `active_auction` en el catálogo.
 */
export function SpaceAuctionBidPanel({ auction, onBidPlaced }) {
  const router = useRouter();
  const { authReady, accessToken, me, isClient, isAdmin } = useAuth();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const minNext = auction?.minimum_next_bid_usd ?? auction?.minimum_bid_usd;
  const high = auction?.high_bid_usd;

  const onSubmit = useCallback(async () => {
    setError("");
    const parsed = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Indica un monto válido en USD.");
      return;
    }
    setLoading(true);
    try {
      await postAuctionBid(auction.id, parsed, { token: accessToken });
      setAmount("");
      setAlertOpen(true);
      onBidPlaced?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la oferta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, amount, auction.id, onBidPlaced, router]);

  if (!authReady) {
    return (
      <div className="mt-10 space-y-4 border-t border-zinc-200 pt-10" aria-busy="true">
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (me && isAdmin) {
    return (
      <div
        className={`mt-10 border-t border-zinc-200 pt-10 ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700`}
      >
        <p className="font-medium text-zinc-900">Puja abierta</p>
        <p className="mt-1">
          Gestiona esta puja desde el panel en{" "}
          <Link href="/dashboard/pujas" className="font-semibold text-zinc-900 underline-offset-4 hover:underline">
            Pujas
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <section
      className="mt-10 border-t border-zinc-200 pt-10"
      aria-labelledby="space-auction-heading"
    >
      <div
        className={`overflow-hidden ${ROUNDED_CONTROL} border border-violet-200/90 bg-gradient-to-b from-violet-50/80 to-white shadow-[0_2px_20px_-12px_rgba(15,23,42,0.12)] sm:rounded-2xl`}
      >
        <div className="border-b border-violet-100 bg-violet-50/60 px-5 py-5 sm:px-8 sm:py-6">
          <h2 id="space-auction-heading" className="text-lg font-semibold tracking-tight text-zinc-950">
            Puja abierta
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Período en disputa:{" "}
            <strong className="font-medium text-zinc-800">
              {formatAuctionDate(auction.start_date)} — {formatAuctionDate(auction.end_date)}
            </strong>
            . Cierre de ofertas:{" "}
            <strong className="font-medium text-zinc-800">{formatAuctionDateTime(auction.closes_at)}</strong>.
          </p>
          <dl className="mt-4 flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-zinc-500">Oferta mínima siguiente</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{formatUsd(minNext)}</dd>
            </div>
            {high != null ? (
              <div>
                <dt className="text-zinc-500">Oferta más alta</dt>
                <dd className="font-semibold tabular-nums text-violet-900">{formatUsd(high)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-zinc-500">Ofertas recibidas</dt>
              <dd className="font-semibold text-zinc-900">{auction.bid_count ?? 0}</dd>
            </div>
          </dl>
        </div>

        {!me ? (
          <div className="px-5 py-6 sm:px-8">
            <p className="text-sm text-zinc-700">
              Inicia sesión con tu cuenta de cliente para enviar una oferta.
            </p>
            <Link
              href="/login"
              className={`${adminPrimaryBtn} mt-4 inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm`}
            >
              Iniciar sesión
            </Link>
          </div>
        ) : !isClient ? (
          <div className="px-5 py-6 text-sm text-zinc-600 sm:px-8">
            Tu cuenta no puede ofertar en el marketplace.
          </div>
        ) : (
          <div className="space-y-4 border-t border-violet-100 px-5 py-6 sm:px-8">
            <label className="block text-sm font-medium text-zinc-800" htmlFor="auction-bid-amount">
              Tu oferta (USD)
            </label>
            <input
              id="auction-bid-amount"
              type="number"
              min={minNext}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mp-form-field-accent w-full max-w-xs rounded-[15px] border border-zinc-200 px-4 py-2.5 text-sm tabular-nums"
              placeholder={minNext != null ? String(minNext) : ""}
            />
            {error ? (
              <p role="alert" className={`text-sm text-red-800 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2`}>
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void onSubmit()}
              className={
                !loading
                  ? `${adminPrimaryBtn} min-h-12 w-full max-w-md px-6 py-3.5 text-base sm:min-h-11 sm:text-sm`
                  : "inline-flex min-h-12 w-full max-w-md cursor-wait items-center justify-center rounded-[15px] border border-zinc-200 bg-zinc-100 px-6 py-3.5 text-base font-semibold text-zinc-500 sm:text-sm"
              }
            >
              {loading ? "Enviando…" : "Enviar oferta"}
            </button>
          </div>
        )}
      </div>

      <CustomAlert
        open={alertOpen}
        title="Oferta registrada"
        message="Tu oferta se registró correctamente."
        confirmLabel="Aceptar"
        onConfirm={() => setAlertOpen(false)}
      />
    </section>
  );
}
