"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { useAuth } from "@/context/AuthContext";
import { apiBase } from "@/lib/apiBase";
import { authFetch } from "@/services/authApi";
import { getAccessToken } from "@/lib/authStorage";

const LIST_PATH = "/api/admin/notifications/";

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

function wsUrl(token) {
  const base = apiBase();
  if (!base || !token) return "";
  const wsBase = base.replace(/^http/i, "ws");
  return `${wsBase}/ws/admin-notifications/?token=${encodeURIComponent(token)}`;
}

export function AdminNotificationBell() {
  const { authReady, accessToken, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const listKey =
    authReady && isAdmin && accessToken ? [LIST_PATH, accessToken] : null;
  const { data, mutate, isLoading } = useSWR(
    listKey,
    ([path]) => authFetch(path),
    { refreshInterval: 45000, revalidateOnFocus: true },
  );
  const results = Array.isArray(data?.results) ? data.results : [];
  const unread = Number(data?.unread_count) || 0;

  useEffect(() => {
    if (!authReady || !isAdmin || !accessToken) return undefined;
    let socket;
    let stopped = false;
    let retryMs = 2000;
    let timer;

    const connect = () => {
      const token = getAccessToken();
      const url = wsUrl(token);
      if (!url || stopped) return;
      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        let incoming;
        try {
          incoming = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!incoming || incoming.id == null) return;
        mutate((current) => {
          const prev = current && typeof current === "object" ? current : { results: [], unread_count: 0 };
          const rows = Array.isArray(prev.results) ? prev.results : [];
          if (rows.some((row) => row.id === incoming.id)) return prev;
          return {
            unread_count: (Number(prev.unread_count) || 0) + (incoming.read ? 0 : 1),
            results: [incoming, ...rows].slice(0, 40),
          };
        }, { revalidate: false });
      };
      socket.onclose = (event) => {
        if (stopped || event.code === 4401) return;
        timer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30000);
      };
      socket.onopen = () => {
        retryMs = 2000;
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (!socket) return;
      const current = socket;
      current.onclose = null;
      if (current.readyState === WebSocket.CONNECTING) {
        current.onopen = () => current.close();
      } else {
        current.close();
      }
    };
  }, [authReady, isAdmin, accessToken, mutate]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  async function markRead(id) {
    await authFetch("/api/admin/notifications/read/", {
      method: "POST",
      body: id == null ? { all: true } : { id },
    });
    await mutate();
  }

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : "";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className="relative inline-flex size-10 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100"
        aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : "Avisos"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {badge ? (
          <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--mp-primary)] px-1 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Avisos"
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[15px] border border-zinc-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2">
            <p className="text-sm font-semibold text-zinc-900">Avisos</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline"
                onClick={() => void markRead(null)}
              >
                Marcar leídas
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading && results.length === 0 ? (
              <div className="space-y-2 p-3" aria-hidden>
                <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
              </div>
            ) : results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No hay avisos.</p>
            ) : (
              <ul>
                {results.map((item) => (
                  <li key={item.id} className="border-b border-zinc-100 last:border-b-0">
                    <Link
                      href={item.href || "/dashboard/pedidos"}
                      className={`block px-3 py-2.5 no-underline hover:bg-zinc-50 ${
                        item.read ? "text-zinc-600" : "text-zinc-900"
                      }`}
                      onClick={() => {
                        setOpen(false);
                        if (!item.read) void markRead(item.id);
                      }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{item.title}</span>
                        {!item.read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[color:var(--mp-primary)]" aria-hidden />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug">{item.body}</span>
                      <span className="mt-1 block text-[10px] text-zinc-500">{formatWhen(item.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
