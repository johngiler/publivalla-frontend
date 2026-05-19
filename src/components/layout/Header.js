"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import {
  IconBuilding,
  IconCart,
  IconCentros,
  IconClose,
  IconLock,
  IconLogout,
  IconMenu,
  IconPanel,
  IconPay,
  IconUser,
} from "@/components/layout/navIcons";
import { MarketplaceBrand } from "@/components/layout/MarketplaceBrand";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const navLinkShell = `mp-ring-brand inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 ${ROUNDED_CONTROL} px-2.5 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1`;

const navLink = `${navLinkShell} text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`;

const panelBtn =
  "mp-isotype-panel-btn inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-white sm:min-h-0";

const mobileRow =
  "mp-ring-brand-inset flex min-h-12 w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-base font-medium text-zinc-800 transition-colors duration-200 ease-out hover:bg-zinc-50 focus-visible:outline-none active:bg-zinc-100";

const mobilePanelBtn =
  "mp-isotype-panel-btn mx-4 mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-base font-semibold text-white";

const DRAWER_MS = 300;

export function Header() {
  const { items } = useCart();
  const { authReady, me, isAdmin, isClient, logout } = useAuth();
  const pathname = usePathname();
  const path = pathname || "";
  /** Detalle de toma (`/catalog/:id`): «Catálogo» sin estilo activo; el enlace sigue yendo al inicio del catálogo. */
  const catalogSpaceDetail = /^\/catalog\/[^/]+\/?$/.test(path);
  const catalogActive =
    !catalogSpaceDetail && (path === "/" || path.startsWith("/m/") || path.startsWith("/catalog"));
  const cartActive = path.startsWith("/cart");
  const ordersActive = path.startsWith("/cuenta/pedidos");
  const contractsActive = path.startsWith("/cuenta/contratos");
  /** Activo: fondo oscuro; texto e iconos en blanco (no mezclar con `navLink` para evitar `text-zinc-600` de Tailwind). */
  const navItem = (active) =>
    active
      ? `${navLinkShell} bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700/60 hover:bg-zinc-700 hover:text-white [&_svg]:text-white`
      : navLink;
  /** Carrito visible para invitados y clientes; no para admin. */
  const showMarketplaceCart = !me || isClient;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setDrawerMounted(true);
      setDrawerVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDrawerVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setDrawerVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setDrawerMounted(false);
      closeTimerRef.current = null;
    }, DRAWER_MS);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!drawerMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerMounted]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const mobileLayer =
    drawerMounted && mounted
      ? createPortal(
          <div className="sm:hidden">
            <button
              type="button"
              className={`fixed inset-0 z-[100] bg-zinc-950/40 transition-opacity ease-out ${
                drawerVisible ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDuration: `${DRAWER_MS}ms` }}
              aria-label="Cerrar menú"
              onClick={closeMenu}
            />
            <div
              id="mobile-nav-drawer"
              className={`fixed inset-y-0 right-0 z-[110] flex w-[min(100%,20rem)] flex-col border-l border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-2xl transition-transform ease-out will-change-transform ${
                drawerVisible ? "translate-x-0" : "translate-x-full"
              }`}
              style={{ transitionDuration: `${DRAWER_MS}ms` }}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <span className="text-sm font-semibold text-zinc-900">Menú</span>
                <button
                  type="button"
                  className={`inline-flex min-h-10 min-w-10 items-center justify-center ${ROUNDED_CONTROL} text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 active:scale-95`}
                  onClick={closeMenu}
                  aria-label="Cerrar"
                >
                  <IconClose />
                </button>
              </div>
              <nav
                className="mp-drawer-nav flex flex-1 flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] pt-2"
                data-visible={drawerVisible ? "true" : "false"}
              >
                <Link href="/" className={mobileRow} onClick={closeMenu}>
                  <IconCentros />
                  Catálogo
                </Link>
                <Link href="/cart" className={mobileRow} onClick={closeMenu}>
                  <IconCart />
                  <span className="flex flex-1 items-center justify-between gap-2">
                    Carrito
                    {items.length > 0 ? (
                      <span className="rounded-full bg-[var(--mp-secondary)] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                        {items.length}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {authReady && me && isClient ? (
                  <>
                    <Link href="/cuenta/pedidos" className={mobileRow} onClick={closeMenu}>
                      <IconPay className="text-zinc-500" />
                      Mis pedidos
                    </Link>
                    <Link href="/cuenta/contratos" className={mobileRow} onClick={closeMenu}>
                      <IconLock className="text-zinc-500" />
                      Mis contratos
                    </Link>
                  </>
                ) : null}
                {authReady && me ? (
                  <>
                    <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Cuenta
                    </div>
                    <Link href="/cuenta/perfil" className={mobileRow} onClick={closeMenu}>
                      <IconUser className="text-zinc-500" />
                      Mi perfil
                    </Link>
                    {isAdmin ? (
                      <Link href="/cuenta/negocio" className={mobileRow} onClick={closeMenu}>
                        <IconBuilding className="text-zinc-500" />
                        Mi negocio
                      </Link>
                    ) : null}
                    {isClient ? (
                      <Link href="/cuenta" className={mobileRow} onClick={closeMenu}>
                        <IconBuilding className="text-zinc-500" />
                        Mi empresa
                      </Link>
                    ) : null}
                    {isAdmin ? (
                      <Link href="/dashboard" className={mobilePanelBtn} onClick={closeMenu}>
                        <IconPanel className="text-white" />
                        Panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className={`${mobileRow} w-full border-t border-zinc-100 text-left text-zinc-600`}
                      onClick={() => {
                        logout();
                        closeMenu();
                      }}
                    >
                      <IconLogout className="text-zinc-500" />
                      Salir
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                      className={mobileRow}
                      onClick={closeMenu}
                    >
                      <IconLock />
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-zinc-200/60 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset] backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className={`mp-ring-brand flex min-w-0 shrink-0 items-center py-0.5 transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none ${ROUNDED_CONTROL} active:scale-[0.98]`}
          onClick={closeMenu}
        >
          <MarketplaceBrand />
        </Link>

        <nav
          className="hidden items-center gap-x-2 sm:flex sm:gap-x-3 md:gap-x-4"
          aria-label="Principal"
        >
          <Link href="/" className={navItem(catalogActive)}>
            <IconCentros />
            <span className="whitespace-nowrap">Catálogo</span>
          </Link>
          {authReady && me && isClient ? (
            <>
              <Link href="/cuenta/pedidos" className={navItem(ordersActive)} aria-label="Mis pedidos">
                <IconPay />
                <span className="whitespace-nowrap">Mis pedidos</span>
              </Link>
              <Link href="/cuenta/contratos" className={navItem(contractsActive)} aria-label="Mis contratos">
                <IconLock />
                <span className="whitespace-nowrap">Mis contratos</span>
              </Link>
            </>
          ) : null}
          {showMarketplaceCart ? (
            <Link
              href="/cart"
              className={navItem(cartActive)}
              aria-label={
                items.length > 0
                  ? `Carrito, ${items.length} ${items.length === 1 ? "producto" : "productos"}`
                  : "Carrito"
              }
            >
              <IconCart />
              <span className="whitespace-nowrap">Carrito</span>
              {items.length > 0 ? (
                <span className="rounded-full bg-[var(--mp-secondary)] px-1.5 text-[11px] font-bold tabular-nums text-white">
                  {items.length > 99 ? "99+" : items.length}
                </span>
              ) : null}
            </Link>
          ) : null}
          {authReady && me ? (
            <>
              <UserAccountMenu
                me={me}
                logout={logout}
                showMiEmpresa={isClient}
                showMiNegocio={isAdmin}
              />
              {isAdmin ? (
                <Link href="/dashboard" className={panelBtn} aria-label="Panel administración">
                  <IconPanel className="text-white" />
                  <span>Panel</span>
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                className={navLink}
                aria-label="Iniciar sesión"
              >
                <IconLock />
                <span className="whitespace-nowrap">Entrar</span>
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className={`mp-ring-brand inline-flex min-h-11 min-w-11 items-center justify-center ${ROUNDED_CONTROL} text-zinc-800 transition-colors duration-200 ease-out hover:bg-zinc-100 active:scale-95 focus-visible:outline-none sm:hidden`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>
        </div>
      </div>
      <div className="mp-isotype-gradient-line h-1 w-full shrink-0" aria-hidden />

      {mobileLayer}
    </header>
  );
}
