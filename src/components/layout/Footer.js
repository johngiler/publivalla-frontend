"use client";

import Link from "next/link";

import { ADMIN_NAV } from "@/components/admin/adminNavConfig";
import {
  IconBuilding,
  IconCart,
  IconCentros,
  IconHeart,
  IconLock,
  IconMail,
  IconMapPin,
  IconPay,
  IconPhone,
  IconUser,
} from "@/components/layout/navIcons";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { normalizeMediaUrlForUi } from "@/lib/mediaUrls";

const linkClass =
  "mp-ring-brand-dark text-sm text-zinc-400 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none";

const exploreIconClass = "shrink-0 text-zinc-500 transition-colors group-hover:text-white";

const exploreLinkRowClass =
  "group mp-ring-brand-dark inline-flex max-w-max items-center gap-2.5 whitespace-nowrap rounded-sm text-sm text-zinc-400 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none";

const sectionTitle =
  "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500";

/**
 * Móvil: una columna (primera lista arriba, segunda abajo).
 * ≥420px: dos columnas lado a lado, ancho según texto (max-content), gap pequeño entre ellas.
 * No usar grid-cols-none: en Tailwind anula las columnas y todo queda en una sola columna.
 */
const exploreTwoColGrid =
  "mt-4 grid grid-cols-1 gap-y-8 min-[420px]:grid-cols-[max-content_max-content] min-[420px]:gap-x-4 min-[420px]:gap-y-3 lg:gap-x-5";

const exploreListClass = "flex flex-col gap-3";

const contactValueIconClass = "shrink-0 text-zinc-500";

const contactValueRowClass = "inline-flex items-center gap-2.5";

function FooterExploreLink({ href, icon: Icon, children }) {
  return (
    <li>
      <Link href={href} className={exploreLinkRowClass}>
        {Icon ? <Icon className={exploreIconClass} /> : null}
        <span className="leading-none">{children}</span>
      </Link>
    </li>
  );
}

function ExploreTwoColumns({ left, right }) {
  return (
    <div className={exploreTwoColGrid}>
      <ul className={exploreListClass}>{left}</ul>
      <ul className={exploreListClass}>{right}</ul>
    </div>
  );
}

function GuestMarketplaceExploreLinks() {
  return (
    <ExploreTwoColumns
      left={
        <>
          <FooterExploreLink href="/" icon={IconCentros}>
            Catálogo
          </FooterExploreLink>
          <FooterExploreLink href="/cart" icon={IconCart}>
            Carrito
          </FooterExploreLink>
        </>
      }
      right={
        <FooterExploreLink href="/checkout" icon={IconPay}>
          Checkout
        </FooterExploreLink>
      }
    />
  );
}

function FooterExploreList({ me, authReady, isClient, isAdmin }) {
  if (!authReady || !me) {
    return <GuestMarketplaceExploreLinks />;
  }
  if (isAdmin) {
    const dash = ADMIN_NAV;
    const leftNav = dash.slice(0, 5);
    const rightNav = dash.slice(5);
    return (
      <ExploreTwoColumns
        left={
          <>
            {leftNav.map((item) => (
              <FooterExploreLink key={item.segment} href={item.href} icon={item.Icon}>
                {item.label}
              </FooterExploreLink>
            ))}
          </>
        }
        right={
          <>
            {rightNav.map((item) => (
              <FooterExploreLink key={item.segment} href={item.href} icon={item.Icon}>
                {item.label}
              </FooterExploreLink>
            ))}
            <FooterExploreLink href="/cuenta/negocio" icon={IconBuilding}>
              Mi negocio
            </FooterExploreLink>
            <FooterExploreLink href="/cuenta/perfil" icon={IconUser}>
              Mi perfil
            </FooterExploreLink>
          </>
        }
      />
    );
  }
  if (isClient) {
    return (
      <ExploreTwoColumns
        left={
          <>
            <FooterExploreLink href="/" icon={IconCentros}>
              Catálogo
            </FooterExploreLink>
            <FooterExploreLink href="/cart" icon={IconCart}>
              Carrito
            </FooterExploreLink>
            <FooterExploreLink href="/checkout" icon={IconPay}>
              Checkout
            </FooterExploreLink>
            <FooterExploreLink href="/cuenta/pedidos" icon={IconPay}>
              Mis pedidos
            </FooterExploreLink>
          </>
        }
        right={
          <>
            <FooterExploreLink href="/cuenta/contratos" icon={IconLock}>
              Mis contratos
            </FooterExploreLink>
            <FooterExploreLink href="/cuenta/favoritos" icon={IconHeart}>
              Mis favoritos
            </FooterExploreLink>
            <FooterExploreLink href="/cuenta" icon={IconBuilding}>
              Mi empresa
            </FooterExploreLink>
            <FooterExploreLink href="/cuenta/perfil" icon={IconUser}>
              Mi perfil
            </FooterExploreLink>
          </>
        }
      />
    );
  }
  return <GuestMarketplaceExploreLinks />;
}

export function Footer() {
  const { me, authReady, isClient, isAdmin } = useAuth();
  const { workspace, displayName } = useWorkspace();
  /** Solo isotipo del API (`logo_mark_url`); si no viene, no se muestra imagen. */
  const footerIsotypeUrl =
    typeof workspace?.logo_mark_url === "string" &&
    workspace.logo_mark_url.trim() !== ""
      ? workspace.logo_mark_url.trim()
      : null;
  const supportEmail =
    typeof workspace?.support_email === "string" &&
    workspace.support_email.trim() !== ""
      ? workspace.support_email.trim()
      : null;
  const phone =
    typeof workspace?.phone === "string" && workspace.phone.trim() !== ""
      ? workspace.phone.trim()
      : null;
  const country =
    typeof workspace?.country === "string" && workspace.country.trim() !== ""
      ? workspace.country.trim()
      : null;
  const showLegalColumn = Boolean(supportEmail || phone || country);
  const navColCount = 1 + (showLegalColumn ? 1 : 0);
  const navGridClass =
    navColCount <= 1
      ? "grid min-w-0 flex-1 grid-cols-1 gap-12"
      : navColCount === 2
        ? "grid min-w-0 flex-1 grid-cols-1 gap-12 min-[480px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-[480px]:gap-x-10 min-[480px]:gap-y-12 lg:gap-x-14 xl:gap-x-16"
        : "grid min-w-0 flex-1 grid-cols-1 gap-12 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-16";

  return (
    <footer className="relative mt-auto bg-zinc-950 text-zinc-400">
      <div
        className="mp-isotype-gradient-line h-1 w-full shrink-0"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-12 sm:gap-14 lg:flex-row lg:items-stretch lg:justify-between lg:gap-0">
          <div className="flex max-w-lg flex-col items-start gap-4 min-[480px]:flex-row min-[480px]:items-center sm:gap-6 max-lg:border-b max-lg:border-white/[0.12] max-lg:pb-10 lg:max-w-md lg:shrink-0 lg:border-r lg:border-white/[0.12] lg:pr-8 xl:max-w-lg xl:pr-10">
            {footerIsotypeUrl ? (
              <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center">
                <img
                  src={normalizeMediaUrlForUi(footerIsotypeUrl)}
                  alt=""
                  width={100}
                  height={100}
                  className="h-[100px] w-[100px] object-contain"
                  decoding="async"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-white">
                {displayName}{" "}
                <span className="font-normal text-zinc-400">Marketplace</span>
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                Reserva y gestiona espacios publicitarios en centros comerciales. Inventario, disponibilidad y pedidos en
                una sola plataforma.
              </p>
            </div>
          </div>

          <div className={`${navGridClass} min-w-0 flex-1 lg:pl-8 xl:pl-10`}>
            <div
              className={`min-w-0 max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch] ${
                showLegalColumn
                  ? "min-[480px]:border-r min-[480px]:border-white/[0.12] max-[479px]:border-b max-[479px]:border-white/[0.12] max-[479px]:pb-10"
                  : ""
              }`}
            >
              <h3 className={`${sectionTitle} max-w-full`}>Explorar</h3>
              <FooterExploreList
                me={me}
                authReady={authReady}
                isClient={isClient}
                isAdmin={isAdmin}
              />
            </div>
            {showLegalColumn ? (
              <div className="min-w-0">
                <h3 className={sectionTitle}>Datos de contacto</h3>
                <ul className="mt-4 list-none space-y-4 p-0 text-sm">
                  {supportEmail ? (
                    <li>
                      <a
                        href={`mailto:${supportEmail}`}
                        className={`${linkClass} ${contactValueRowClass}`}
                      >
                        <IconMail className={contactValueIconClass} />
                        <span className="break-all">{supportEmail}</span>
                      </a>
                    </li>
                  ) : null}
                  {phone ? (
                    <li>
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className={`${linkClass} ${contactValueRowClass} whitespace-nowrap`}
                      >
                        <IconPhone className={contactValueIconClass} />
                        {phone}
                      </a>
                    </li>
                  ) : null}
                  {country ? (
                    <li>
                      <p
                        className={`m-0 leading-relaxed text-zinc-400 ${contactValueRowClass}`}
                        aria-label={`País: ${country}`}
                      >
                        <IconMapPin className={contactValueIconClass} />
                        <span className="whitespace-nowrap" aria-hidden="true">
                          {country}
                        </span>
                      </p>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.08] pt-8">
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} {displayName} · Marketplace de
            publicidad en centros comerciales.
          </p>
        </div>
      </div>
    </footer>
  );
}
