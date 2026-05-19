"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";

import { ADMIN_NAV_GROUPED } from "@/components/admin/adminNavConfig";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_COMPETING_RESERVATIONS_COUNT_PATH } from "@/lib/adminCompetingReservations";
import { authFetch } from "@/services/authApi";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconMenu,
} from "@/components/layout/navIcons";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "publivalla-admin-sidebar-collapsed";

/** Coincide con el breakpoint `lg` de Tailwind (1024px). */
function isMobileAdminNav() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function navActive(pathname, href) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatNavBadgeCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  if (x > 99) return "99+";
  return String(x);
}

function AdminNavCountBadge({ count, collapsed, active }) {
  const label = formatNavBadgeCount(count);
  if (!label) return null;
  if (collapsed) {
    return (
      <span
        className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white lg:right-0 lg:top-0 ${
          active ? "bg-white text-zinc-900 ring-1 ring-zinc-900/10" : "bg-[color:var(--mp-primary)]"
        }`}
        aria-hidden
      >
        {Number(label) > 9 ? "9+" : label}
      </span>
    );
  }
  return (
    <span
      className={`ml-auto inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums leading-none ${
        active
          ? "bg-white text-zinc-900 ring-1 ring-white/20"
          : "bg-[color:var(--mp-primary)] text-white"
      }`}
    >
      {label}
    </span>
  );
}

export function AdminSidebar({ mobileOpen, setMobileOpen }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { displayName } = useWorkspace();
  const { authReady, accessToken, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const { data: competingCountData } = useSWR(
    authReady && isAdmin && accessToken
      ? [ADMIN_COMPETING_RESERVATIONS_COUNT_PATH, accessToken]
      : null,
    ([path]) => authFetch(path),
    { revalidateOnFocus: true, dedupingInterval: 10_000 },
  );
  const competingCount = Number(competingCountData?.count) || 0;

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setCollapsed(
        window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1",
      );
    } catch {
      /* ignore */
    }
  }, []);

  /** Alinea el `sticky` del sidebar con el borde inferior del header global (evita hueco por offset fijo en rem). */
  useLayoutEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector("header");
    if (!header) return undefined;

    const apply = () => {
      const h = Math.ceil(header.getBoundingClientRect().height);
      root.style.setProperty("--mp-admin-sidebar-sticky-top", `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(header);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--mp-admin-sidebar-sticky-top");
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(
          ADMIN_SIDEBAR_COLLAPSED_KEY,
          next ? "1" : "0",
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const linkClass = (active) =>
    `flex items-center gap-3 px-3 ${ROUNDED_CONTROL} py-2.5 text-sm font-medium transition-colors ${
      collapsed ? "lg:justify-center lg:gap-0 lg:px-2" : ""
    } ${
      active
        ? "bg-zinc-900 text-white shadow-sm"
        : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900"
    }`;

  const navLink = ({ href, label, Icon, segment }) => {
    const active = navActive(pathname, href);
    const showCompetingBadge = segment === "pujas" && competingCount > 0;
    const linkTitle =
      showCompetingBadge && !collapsed
        ? `${label} (${competingCount} pendiente${competingCount === 1 ? "" : "s"})`
        : label;
    return (
      <Link
        key={segment}
        href={href}
        className={linkClass(active)}
        title={linkTitle}
        onClick={(e) => {
          if (isMobileAdminNav()) {
            e.preventDefault();
            setMobileOpen(false);
            router.push(href);
            return;
          }
          setMobileOpen(false);
        }}
      >
        <span className={`relative shrink-0 ${showCompetingBadge && collapsed ? "lg:mr-0" : ""}`}>
          <Icon className={active ? "text-white" : "text-zinc-500"} />
          {showCompetingBadge && collapsed ? (
            <AdminNavCountBadge count={competingCount} collapsed active={active} />
          ) : null}
        </span>
        <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:sr-only" : ""}`}>
          {label}
        </span>
        {showCompetingBadge && !collapsed ? (
          <AdminNavCountBadge count={competingCount} collapsed={false} active={active} />
        ) : null}
      </Link>
    );
  };

  const nav = (
    <nav className="p-3 lg:pt-5" aria-label="Panel administración">
      {ADMIN_NAV_GROUPED.map((group, groupIndex) => (
        <div
          key={group.id}
          className={
            groupIndex > 0
              ? `space-y-1 ${collapsed ? "mt-3 border-t border-zinc-200/80 pt-3" : "mt-5 border-t border-zinc-200/80 pt-5"}`
              : "space-y-1"
          }
        >
          {group.label && !collapsed ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              {group.label}
            </p>
          ) : null}
          {group.items.map(navLink)}
        </div>
      ))}
    </nav>
  );

  const workspaceInitial =
    (displayName || "?").trim().slice(0, 1).toUpperCase() || "?";

  return (
    <>
      <div
        className={`fixed inset-0 z-[55] bg-zinc-900/40 backdrop-blur-[2px] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`flex w-[min(18.25rem,88vw)] flex-col border-r border-zinc-200 bg-zinc-50 transition-[width,transform] duration-200 ease-out max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[60] max-lg:h-[100dvh] max-lg:overflow-y-auto max-lg:shadow-xl lg:sticky lg:z-20 lg:max-h-[calc(100dvh_-_var(--mp-admin-sidebar-sticky-top))] lg:min-h-0 lg:shrink-0 lg:self-start lg:transform-none lg:shadow-none lg:top-[var(--mp-admin-sidebar-sticky-top)] ${
          collapsed ? "lg:w-[4.25rem]" : "lg:w-[15.25rem]"
        } ${mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 lg:hidden">
          <p className="text-sm font-semibold text-zinc-900">Menú</p>
          <button
            type="button"
            className={`${ROUNDED_CONTROL} p-2 text-zinc-600 hover:bg-zinc-200`}
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <div className="relative hidden border-b border-zinc-200 lg:block">
          {collapsed ? (
            <div
              className="flex flex-col items-center px-2 py-3 pb-5"
              title={displayName || undefined}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200/90 text-sm font-bold text-zinc-800"
                aria-hidden
              >
                {workspaceInitial}
              </span>
              <span className="sr-only">{displayName}</span>
            </div>
          ) : (
            <div className="px-4 pb-5 pt-4 pr-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Administración
              </p>
              <p
                className="mt-1 truncate text-sm font-semibold text-zinc-900"
                title={displayName || undefined}
              >
                {displayName}
              </p>
            </div>
          )}
          <button
            type="button"
            className="mp-ring-brand absolute bottom-0 right-0 z-30 flex h-9 w-9 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_40%,transparent)]"
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? "Expandir menú del panel" : "Contraer menú del panel"
            }
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <IconChevronRight className="h-4 w-4" />
            ) : (
              <IconChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {nav}
        </div>

        <div className="shrink-0 border-t border-zinc-200 p-3 lg:mt-0">
          <Link
            href="/"
            className={`flex items-center justify-center gap-2 px-3 ${ROUNDED_CONTROL} py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200/60 ${
              collapsed ? "lg:justify-center lg:gap-0 lg:px-2" : ""
            }`}
            title="Volver al marketplace"
            aria-label="Volver al marketplace"
            onClick={(e) => {
              if (isMobileAdminNav()) {
                e.preventDefault();
                setMobileOpen(false);
                router.push("/");
                return;
              }
              setMobileOpen(false);
            }}
          >
            <IconChevronLeft className="shrink-0 text-zinc-600" />
            <span className={collapsed ? "lg:sr-only" : ""}>
              Volver al marketplace
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}

export function AdminMobileNavToggle({ onClick }) {
  return (
    <button
      type="button"
      className={`mb-4 inline-flex items-center gap-2 ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm lg:hidden`}
      aria-label="Abrir menú del panel"
      onClick={onClick}
    >
      <IconMenu />
      Secciones
    </button>
  );
}
