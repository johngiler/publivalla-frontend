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
  "group mp-ring-brand-dark inline-flex w-full max-w-full items-start gap-2.5 rounded-sm text-sm leading-snug text-zinc-400 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-none";

const sectionTitle =
  "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500";

/** Marketplace / cliente: dos columnas cuando hay espacio; el texto puede partir en dos líneas. */
const exploreTwoColGrid =
  "mt-4 grid grid-cols-1 gap-y-8 min-[480px]:grid-cols-2 min-[480px]:gap-x-8 min-[480px]:gap-y-3 lg:gap-x-10";

const exploreListClass = "flex min-w-0 flex-col gap-3";

/** Panel admin: como máximo dos columnas; el texto puede partir en dos líneas. */
const exploreAdminGrid =
  "mt-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[520px]:gap-x-8 min-[520px]:gap-y-3 lg:gap-x-10";

const contactValueIconClass = "shrink-0 text-zinc-500";

const contactValueRowClass = "inline-flex items-center gap-2.5";

function FooterExploreLink({ href, icon: Icon, children }) {
  return (
    <li>
      <Link href={href} className={exploreLinkRowClass}>
        {Icon ? <Icon className={exploreIconClass} /> : null}
        <span className="min-w-0 flex-1">{children}</span>
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
    const adminLinks = [
      ...ADMIN_NAV,
      { segment: "cuenta-negocio", href: "/cuenta/negocio", label: "Mi negocio", Icon: IconBuilding },
      { segment: "cuenta-perfil", href: "/cuenta/perfil", label: "Mi perfil", Icon: IconUser },
    ];
    return (
      <ul className={exploreAdminGrid}>
        {adminLinks.map((item) => (
          <FooterExploreLink key={item.segment} href={item.href} icon={item.Icon}>
            {item.label}
          </FooterExploreLink>
        ))}
      </ul>
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
      : "grid min-w-0 flex-1 grid-cols-1 gap-12 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-start min-[640px]:gap-x-10 min-[640px]:gap-y-12 lg:gap-x-14 xl:gap-x-16";

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
              className={`min-w-0 ${
                showLegalColumn
                  ? "min-[640px]:border-r min-[640px]:border-white/[0.12] min-[640px]:pr-8 max-[639px]:border-b max-[639px]:border-white/[0.12] max-[639px]:pb-10 lg:pr-10"
                  : ""
              }`}
            >
              <h3 className={sectionTitle}>Explorar</h3>
              <FooterExploreList
                me={me}
                authReady={authReady}
                isClient={isClient}
                isAdmin={isAdmin}
              />
            </div>
            {showLegalColumn ? (
              <div className="min-w-0 shrink-0 min-[640px]:min-w-[11rem] lg:min-w-[12rem]">
                <h3 className={`${sectionTitle} whitespace-nowrap`}>Datos de contacto</h3>
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
