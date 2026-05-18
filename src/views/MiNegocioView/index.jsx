"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { mutate as globalMutate } from "swr";

import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { normalizeMediaUrlForUi } from "@/lib/mediaUrls";
import {
  fetchMyWorkspace,
  patchMyWorkspace,
  authFetch,
  testMyWorkspaceTransactionalSmtp,
} from "@/services/authApi";

const fieldClass = `mp-form-field-accent mt-1.5 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-zinc-400 focus:outline-none sm:min-h-0 sm:py-2 sm:text-sm`;

/** Misma base que `fieldClass` sin `mt-1.5` (el margen va en el contenedor con el botón). */
const fieldClassNoTopMargin = fieldClass.replace(/\bmt-1\.5\s+/, "");

function IconEye({ className = "h-5 w-5 shrink-0 text-zinc-500" }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEyeOff({ className = "h-5 w-5 shrink-0 text-zinc-500" }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const pillBase = `${ROUNDED_CONTROL} border px-3 py-1.5 text-sm font-medium shadow-sm transition`;
const pillInactive = `border-zinc-200/90 bg-white text-zinc-700 hover:border-[color-mix(in_srgb,var(--mp-primary)_40%,transparent)] hover:text-[color:var(--mp-primary)]`;
const pillCurrent = `border-[color-mix(in_srgb,var(--mp-primary)_45%,#d4d4d8)] bg-[color-mix(in_srgb,var(--mp-primary)_10%,color-mix(in_srgb,var(--mp-secondary)_5%,#fff))] font-semibold text-[color:var(--mp-primary)] ring-1 ring-[color-mix(in_srgb,var(--mp-primary)_18%,transparent)]`;

const roleBadgeClass =
  "inline-flex max-w-full shrink-0 items-center rounded-full border border-orange-200/90 bg-gradient-to-r from-orange-50/95 via-amber-50/80 to-white px-3 py-1 text-xs font-semibold text-orange-950 shadow-sm ring-1 ring-orange-100/70 sm:text-sm";

function marketplaceRoleLabel(role) {
  if (role === "admin") return "Administrador marketplace";
  if (role === "client") return "Cliente marketplace";
  return typeof role === "string" && role.trim() ? role : "";
}

const brandAccept =
  ".svg,image/svg+xml,image/png,image/jpeg,image/jpg,image/webp,image/gif,image/x-icon,.ico";

const pngArtifactsAccept = "image/png,.png";

function defaultHex(v, fallback = "#0c9dcf") {
  const s = (v || "").trim();
  if (!s) return fallback;
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash)) return withHash;
  return fallback;
}

function SectionTitle({ children, id }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500"
    >
      <span
        className="h-px w-6 bg-gradient-to-r from-[color-mix(in_srgb,var(--mp-primary)_60%,transparent)] to-transparent"
        aria-hidden
      />
      {children}
    </h2>
  );
}

/** Vista previa alineada al header (150×30 en `MarketplaceBrand`); aquí 150×50 para encajar logos un poco más altos. */
const LOGO_PREVIEW_W = 150;
const LOGO_PREVIEW_H = 50;
const SQUARE_PREVIEW = 100;

function FileBlock({
  label,
  helper,
  existingUrl,
  previewObjectUrl,
  file,
  onFileChange,
  onClearMark,
  formatsHint,
  formatErrorMessage,
  accept = brandAccept,
  /** @type {'logoWide' | 'square100'} */
  previewVariant = "square100",
}) {
  const fieldId = useId();
  const imgSrc =
    previewObjectUrl ||
    (existingUrl ? normalizeMediaUrlForUi(existingUrl) : "");

  const isLogoWide = previewVariant === "logoWide";
  const previewBoxClass = isLogoWide
    ? `mt-2 flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1`
    : `mt-2 flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2`;
  const previewStyle = isLogoWide
    ? { width: LOGO_PREVIEW_W, height: LOGO_PREVIEW_H }
    : { width: SQUARE_PREVIEW, height: SQUARE_PREVIEW };
  const imgClass = isLogoWide
    ? "max-h-[50px] max-w-[150px] object-contain object-left"
    : "max-h-full max-w-full object-contain";

  const handleRemoveClick = () => {
    if (file) {
      onFileChange(null);
    } else {
      onClearMark();
    }
  };

  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-zinc-800">{label}</label>
      {imgSrc ? (
        <>
          <div className={previewBoxClass} style={previewStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              className={imgClass}
              decoding="async"
              loading="lazy"
            />
          </div>
          <div className="mt-2">
            <button
              type="button"
              className="mp-ring-brand inline-flex shrink-0 items-center justify-center rounded-[15px] border border-transparent p-2 text-red-600 transition-colors hover:border-red-200/90 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
              aria-label={
                file ? "Quitar archivo seleccionado" : "Quitar archivo actual"
              }
              onClick={handleRemoveClick}
            >
              <IconRowTrash />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2">
          <FileDropZoneField
            id={fieldId}
            showLabel={false}
            ariaLabel={label}
            value={file}
            onChange={onFileChange}
            accept={accept}
            helperText=""
            formatsHint={formatsHint}
            formatErrorMessage={formatErrorMessage}
            maxBytesErrorMessage="El archivo supera el tamaño máximo permitido (5 MB). Elige otro archivo."
            showInlinePreview={false}
            dropZoneAriaLabel={`Zona para adjuntar: ${label}`}
          />
        </div>
      )}
      {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
    </div>
  );
}

export default function MiNegocioView() {
  const router = useRouter();
  const { authReady, me, isAdmin, accessToken, role } = useAuth();
  const { reloadWorkspace } = useWorkspace();

  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [marketplaceTitle, setMarketplaceTitle] = useState("");
  const [marketplaceTagline, setMarketplaceTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0c9dcf");
  const [secondaryColor, setSecondaryColor] = useState("#ea580c");
  const [supportEmail, setSupportEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [txHost, setTxHost] = useState("");
  const [txPort, setTxPort] = useState("587");
  const [txTls, setTxTls] = useState(true);
  const [txUseSsl, setTxUseSsl] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState(null);
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [txTestContext, setTxTestContext] = useState(null);

  const [txUser, setTxUser] = useState("");
  const [txPassword, setTxPassword] = useState("");
  const [txFrom, setTxFrom] = useState("");
  const [txFromName, setTxFromName] = useState("");
  const [txPwdSet, setTxPwdSet] = useState(false);
  const [txShowPassword, setTxShowPassword] = useState(false);
  const [txMethod, setTxMethod] = useState("smtp");
  const [txProvider, setTxProvider] = useState("mailgun");
  const [txApiKey, setTxApiKey] = useState("");
  const [txApiKeySet, setTxApiKeySet] = useState(false);
  const [txShowApiKey, setTxShowApiKey] = useState(false);
  const [txMailgunDomain, setTxMailgunDomain] = useState("");
  const [txMailgunRegion, setTxMailgunRegion] = useState("us");

  const [logoUrl, setLogoUrl] = useState("");
  const [logoMarkUrl, setLogoMarkUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoPngArtifactsUrl, setLogoPngArtifactsUrl] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [logoMarkFile, setLogoMarkFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPngArtifactsFile, setLogoPngArtifactsFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeLogoMark, setRemoveLogoMark] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [removeLogoPngArtifacts, setRemoveLogoPngArtifacts] = useState(false);

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoMarkPreview, setLogoMarkPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [logoPngArtifactsPreview, setLogoPngArtifactsPreview] = useState(null);

  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSmtpTestStatus(null);
    setTxTestContext(null);
  }, [txMethod]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const u = URL.createObjectURL(logoFile);
    setLogoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [logoFile]);

  useEffect(() => {
    if (!logoMarkFile) {
      setLogoMarkPreview(null);
      return;
    }
    const u = URL.createObjectURL(logoMarkFile);
    setLogoMarkPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [logoMarkFile]);

  useEffect(() => {
    if (!faviconFile) {
      setFaviconPreview(null);
      return;
    }
    const u = URL.createObjectURL(faviconFile);
    setFaviconPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [faviconFile]);

  useEffect(() => {
    if (!logoPngArtifactsFile) {
      setLogoPngArtifactsPreview(null);
      return;
    }
    const u = URL.createObjectURL(logoPngArtifactsFile);
    setLogoPngArtifactsPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [logoPngArtifactsFile]);

  useEffect(() => {
    if (!authReady) return;
    if (!me) {
      router.replace("/login?next=/cuenta/negocio");
      return;
    }
    if (!isAdmin) {
      router.replace("/cuenta/perfil");
    }
  }, [authReady, me, isAdmin, router]);

  useEffect(() => {
    if (!authReady || !me || !isAdmin || !accessToken) return;
    let cancelled = false;
    (async () => {
      setLoadErr("");
      setLoading(true);
      try {
        const d = await fetchMyWorkspace({ token: accessToken });
        if (cancelled) return;
        if (!d) {
          router.replace("/cuenta/perfil");
          return;
        }
        setSlug(typeof d.slug === "string" ? d.slug : "");
        setName(typeof d.name === "string" ? d.name : "");
        setLegalName(typeof d.legal_name === "string" ? d.legal_name : "");
        setMarketplaceTitle(
          typeof d.marketplace_title === "string" ? d.marketplace_title : "",
        );
        setMarketplaceTagline(
          typeof d.marketplace_tagline === "string"
            ? d.marketplace_tagline
            : "",
        );
        setPrimaryColor(defaultHex(d.primary_color, "#0c9dcf"));
        setSecondaryColor(defaultHex(d.secondary_color, "#ea580c"));
        setSupportEmail(
          typeof d.support_email === "string" ? d.support_email : "",
        );
        setPhone(typeof d.phone === "string" ? d.phone : "");
        setCountry(typeof d.country === "string" ? d.country : "");
        setCity(typeof d.city === "string" ? d.city : "");
        setTxHost(
          typeof d.transactional_email_host === "string"
            ? d.transactional_email_host
            : "",
        );
        setTxPort(
          d.transactional_email_port != null &&
            String(d.transactional_email_port).trim() !== ""
            ? String(d.transactional_email_port)
            : "587",
        );
        setTxTls(d.transactional_email_use_tls !== false);
        setTxUseSsl(d.transactional_email_use_ssl === true);
        setTxUser(
          typeof d.transactional_email_username === "string"
            ? d.transactional_email_username
            : "",
        );
        setTxPassword("");
        setTxFrom(
          typeof d.transactional_email_from_address === "string"
            ? d.transactional_email_from_address
            : "",
        );
        setTxFromName(
          typeof d.transactional_email_from_name === "string"
            ? d.transactional_email_from_name
            : "",
        );
        setTxPwdSet(Boolean(d.transactional_email_password_set));
        setTxMethod(
          typeof d.transactional_email_method === "string" && d.transactional_email_method.trim()
            ? d.transactional_email_method.trim().toLowerCase()
            : "smtp",
        );
        setTxProvider(
          typeof d.transactional_email_provider === "string" && d.transactional_email_provider.trim()
            ? d.transactional_email_provider.trim().toLowerCase()
            : "mailgun",
        );
        setTxApiKey("");
        setTxApiKeySet(Boolean(d.transactional_email_api_key_set));
        setTxMailgunDomain(
          typeof d.transactional_email_mailgun_domain === "string"
            ? d.transactional_email_mailgun_domain
            : "",
        );
        setTxMailgunRegion(
          typeof d.transactional_email_mailgun_region === "string" && d.transactional_email_mailgun_region.trim()
            ? d.transactional_email_mailgun_region.trim().toLowerCase()
            : "us",
        );
        setLogoUrl(typeof d.logo_url === "string" ? d.logo_url : "");
        setLogoMarkUrl(
          typeof d.logo_mark_url === "string" ? d.logo_mark_url : "",
        );
        setFaviconUrl(typeof d.favicon_url === "string" ? d.favicon_url : "");
        setLogoPngArtifactsUrl(
          typeof d.logo_png_artifacts_url === "string"
            ? d.logo_png_artifacts_url
            : "",
        );
        setLogoFile(null);
        setLogoMarkFile(null);
        setFaviconFile(null);
        setLogoPngArtifactsFile(null);
        setRemoveLogo(false);
        setRemoveLogoMark(false);
        setRemoveFavicon(false);
        setRemoveLogoPngArtifacts(false);
      } catch (e) {
        if (!cancelled)
          setLoadErr(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, me, isAdmin, accessToken, router]);

  async function onTestSmtp() {
    setSmtpTestStatus(null);
    setTxTestContext("smtp");
    setSmtpTestLoading(true);
    try {
      const body = {
        transactional_email_host: txHost.trim(),
        transactional_email_port:
          Number.parseInt(String(txPort).trim(), 10) || 587,
        transactional_email_use_tls: txTls,
        transactional_email_use_ssl: txUseSsl,
        transactional_email_username: txUser.trim(),
      };
      const pwd = txPassword.trim();
      if (pwd) body.transactional_email_password = pwd;
      const r = await testMyWorkspaceTransactionalSmtp(body, {
        token: accessToken,
      });
      setSmtpTestStatus(r);
    } catch (err) {
      setSmtpTestStatus({
        ok: false,
        detail:
          err instanceof Error
            ? err.message
            : "No se pudo contactar al servidor.",
        technical: null,
      });
    } finally {
      setSmtpTestLoading(false);
    }
  }

  async function onTestRelay() {
    setSmtpTestStatus(null);
    setTxTestContext(txMethod === "api" ? "api" : "smtp");
    setSmtpTestLoading(true);
    try {
      const body =
        txMethod === "api"
          ? {
              transactional_email_method: "api",
              transactional_email_provider: txProvider,
              transactional_email_mailgun_domain: txMailgunDomain.trim(),
              transactional_email_mailgun_region: txMailgunRegion,
              ...(txApiKey.trim() ? { transactional_email_api_key: txApiKey.trim() } : {}),
            }
          : {
              transactional_email_method: "smtp",
              transactional_email_host: txHost.trim(),
              transactional_email_port:
                Number.parseInt(String(txPort).trim(), 10) || 587,
              transactional_email_use_tls: txTls,
              transactional_email_use_ssl: txUseSsl,
              transactional_email_username: txUser.trim(),
              ...(txPassword.trim()
                ? { transactional_email_password: txPassword.trim() }
                : {}),
            };
      const r = await authFetch("/api/me/workspace/test-transactional-relay/", {
        method: "POST",
        body,
      });
      setSmtpTestStatus(r);
    } catch (err) {
      setSmtpTestStatus({
        ok: false,
        detail:
          err instanceof Error
            ? err.message
            : "No se pudo contactar al servidor.",
        technical: null,
      });
    } finally {
      setSmtpTestLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaveErr("");
    setSaveOk("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("legal_name", legalName.trim());
      fd.append("marketplace_title", marketplaceTitle.trim());
      fd.append("marketplace_tagline", marketplaceTagline.trim());
      fd.append("primary_color", primaryColor.trim());
      fd.append("secondary_color", secondaryColor.trim());
      fd.append("support_email", supportEmail.trim());
      fd.append("phone", phone.trim());
      fd.append("country", country.trim());
      fd.append("city", city.trim());
      fd.append("transactional_email_host", txHost.trim());
      fd.append(
        "transactional_email_port",
        String(Number.parseInt(String(txPort).trim(), 10) || 587),
      );
      fd.append("transactional_email_use_tls", txTls ? "true" : "false");
      fd.append("transactional_email_use_ssl", txUseSsl ? "true" : "false");
      fd.append("transactional_email_username", txUser.trim());
      if (txMethod !== "api" && txPassword.trim())
        fd.append("transactional_email_password", txPassword.trim());
      fd.append("transactional_email_from_address", txFrom.trim());
      fd.append("transactional_email_from_name", txFromName.trim());
      fd.append("transactional_email_method", txMethod === "api" ? "api" : "smtp");
      fd.append("transactional_email_provider", txMethod === "api" ? txProvider : "");
      fd.append(
        "transactional_email_mailgun_domain",
        txMethod === "api" ? txMailgunDomain.trim() : "",
      );
      fd.append(
        "transactional_email_mailgun_region",
        txMethod === "api" ? txMailgunRegion : "us",
      );
      if (txMethod === "api" && txApiKey.trim())
        fd.append("transactional_email_api_key", txApiKey.trim());
      if (logoFile) fd.append("logo", logoFile);
      if (removeLogo) fd.append("remove_logo", "true");
      if (logoMarkFile) fd.append("logo_mark", logoMarkFile);
      if (removeLogoMark) fd.append("remove_logo_mark", "true");
      if (faviconFile) fd.append("favicon", faviconFile);
      if (removeFavicon) fd.append("remove_favicon", "true");
      if (logoPngArtifactsFile)
        fd.append("logo_png_artifacts", logoPngArtifactsFile);
      if (removeLogoPngArtifacts)
        fd.append("remove_logo_png_artifacts", "true");

      const data = await patchMyWorkspace(fd, { token: accessToken });
      setSlug(typeof data.slug === "string" ? data.slug : slug);
      setLogoUrl(typeof data.logo_url === "string" ? data.logo_url : "");
      setLogoMarkUrl(
        typeof data.logo_mark_url === "string" ? data.logo_mark_url : "",
      );
      setFaviconUrl(
        typeof data.favicon_url === "string" ? data.favicon_url : "",
      );
      setLogoPngArtifactsUrl(
        typeof data.logo_png_artifacts_url === "string"
          ? data.logo_png_artifacts_url
          : "",
      );
      setLogoFile(null);
      setLogoMarkFile(null);
      setFaviconFile(null);
      setLogoPngArtifactsFile(null);
      setRemoveLogo(false);
      setRemoveLogoMark(false);
      setRemoveFavicon(false);
      setRemoveLogoPngArtifacts(false);
      setTxPassword("");
      setTxPwdSet(Boolean(data.transactional_email_password_set));
      setTxApiKey("");
      setTxApiKeySet(Boolean(data.transactional_email_api_key_set));
      await globalMutate("/api/me/workspace/");
      setSaveOk("Cambios guardados.");
      await reloadWorkspace();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!authReady || !me) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--mp-primary)]" />
        <p className="mt-4 text-sm">Cargando…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--mp-primary)]" />
        <p className="mt-4 text-sm">Cargando datos del negocio…</p>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-red-700">{loadErr}</p>
        <Link
          href="/cuenta/perfil"
          className={`${marketplacePrimaryBtn} mt-6 inline-flex px-5 py-2.5 text-sm font-semibold`}
        >
          Volver a mi perfil
        </Link>
      </div>
    );
  }

  const logoExisting = removeLogo ? "" : logoUrl;
  const logoPngArtifactsExisting = removeLogoPngArtifacts ? "" : logoPngArtifactsUrl;
  const markExisting = removeLogoMark ? "" : logoMarkUrl;
  const favExisting = removeFavicon ? "" : faviconUrl;
  const profileRoleBadge = marketplaceRoleLabel(role);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <nav
        className="flex flex-wrap gap-2 text-sm"
        aria-label="Sección de cuenta"
      >
        <Link href="/cuenta/perfil" className={`${pillBase} ${pillInactive}`}>
          Mi perfil
        </Link>
        <span className={`${pillBase} ${pillCurrent}`} aria-current="page">
          Mi negocio
        </span>
      </nav>

      <div className="relative mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-5 py-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:px-6 sm:py-7">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent"
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Mi negocio
          </h1>
          {profileRoleBadge ? (
            <span
              className={roleBadgeClass}
              aria-label={`Rol: ${profileRoleBadge}`}
            >
              {profileRoleBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
          Marca, contacto y archivos visibles en el catálogo.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className={`relative mt-8 overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-zinc-100/80`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent"
          aria-hidden
        />
        <div className="space-y-8 p-5 sm:p-6">
          <section aria-labelledby="sec-ident">
            <SectionTitle id="sec-ident">Identificador</SectionTitle>
            <div className="mt-4">
              <label
                htmlFor="ws-slug"
                className="block text-sm font-medium text-zinc-800"
              >
                Slug (solo lectura)
              </label>
              <input
                id="ws-slug"
                readOnly
                disabled
                value={slug}
                className={`${fieldClass} cursor-not-allowed bg-zinc-50 text-zinc-600`}
              />
            </div>
          </section>

          <section aria-labelledby="sec-textos">
            <SectionTitle id="sec-textos">Textos y marca</SectionTitle>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ws-name"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Nombre comercial
                </label>
                <input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                  required
                  autoComplete="organization"
                />
              </div>
              <div>
                <label
                  htmlFor="ws-legal"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Razón social (opcional)
                </label>
                <input
                  id="ws-legal"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="ws-mtitle"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Título del marketplace (opcional)
                </label>
                <input
                  id="ws-mtitle"
                  value={marketplaceTitle}
                  onChange={(e) => setMarketplaceTitle(e.target.value)}
                  className={fieldClass}
                  placeholder="Si está vacío, se usa el nombre comercial"
                />
              </div>
              <div>
                <label
                  htmlFor="ws-tagline"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Eslogan (opcional)
                </label>
                <input
                  id="ws-tagline"
                  value={marketplaceTagline}
                  onChange={(e) => setMarketplaceTagline(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>


          <section aria-labelledby="sec-colores">
            <SectionTitle id="sec-colores">Colores</SectionTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="block text-sm font-medium text-zinc-800">
                  Color primario
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#([0-9a-fA-F]{6})$/.test((primaryColor || "").trim())
                        ? primaryColor.trim()
                        : "#0c9dcf"
                    }
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 shadow-sm"
                    aria-label="Muestra color primario"
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className={`${fieldClass} mt-0 max-w-[11rem] flex-1 font-mono text-sm`}
                    placeholder="#2c2c81"
                  />
                </div>
              </div>
              <div>
                <span className="block text-sm font-medium text-zinc-800">
                  Color secundario
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#([0-9a-fA-F]{6})$/.test((secondaryColor || "").trim())
                        ? secondaryColor.trim()
                        : "#ea580c"
                    }
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-md border border-zinc-200 bg-white p-1 shadow-sm"
                    aria-label="Muestra color secundario"
                  />
                  <input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className={`${fieldClass} mt-0 max-w-[11rem] flex-1 font-mono text-sm`}
                    placeholder="#ea580c"
                  />
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-txmail">
            <SectionTitle id="sec-txmail">
              Envío de notificaciones de pedidos
            </SectionTitle>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
              Cuenta SMTP para avisos automáticos cuando cambia el estado de un
              pedido: llegan a los administradores (correo en Mi perfil) y a la
              empresa (Mi empresa). Sin servidor indicado no se envía correo
              desde aquí.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="block text-sm font-medium text-zinc-800">
                  Método de envío
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                    <input
                      type="radio"
                      name="tx-method"
                      checked={txMethod === "smtp"}
                      onChange={() => setTxMethod("smtp")}
                      className="h-4 w-4 border-zinc-300 accent-[color:var(--mp-primary)]"
                    />
                    SMTP (usuario y contraseña)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                    <input
                      type="radio"
                      name="tx-method"
                      checked={txMethod === "api"}
                      onChange={() => setTxMethod("api")}
                      className="h-4 w-4 border-zinc-300 accent-[color:var(--mp-primary)]"
                    />
                    API key (relay)
                  </label>
                </div>
              </div>

              {txMethod === "api" ? (
                <>
                  <div>
                    <label
                      htmlFor="tx-provider"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Proveedor
                    </label>
                    <select
                      id="tx-provider"
                      value={txProvider}
                      onChange={(e) => setTxProvider(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="mailgun">Mailgun</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="tx-mg-region"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Región
                    </label>
                    <select
                      id="tx-mg-region"
                      value={txMailgunRegion}
                      onChange={(e) => setTxMailgunRegion(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="us">US</option>
                      <option value="eu">EU</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="tx-mg-domain"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Dominio (Mailgun)
                    </label>
                    <input
                      id="tx-mg-domain"
                      value={txMailgunDomain}
                      onChange={(e) => setTxMailgunDomain(e.target.value)}
                      className={fieldClass}
                      placeholder="mg.tudominio.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="tx-api-key"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      API key
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="tx-api-key"
                        type={txShowApiKey ? "text" : "password"}
                        value={txApiKey}
                        onChange={(e) => setTxApiKey(e.target.value)}
                        className={fieldClassNoTopMargin.replace(
                          /\\bpx-3\\.5\\b/,
                          "pl-3.5 pr-11",
                        )}
                        autoComplete="off"
                        placeholder={
                          txApiKeySet
                            ? "Deja en blanco para no cambiar la guardada"
                            : ""
                        }
                      />
                      <button
                        type="button"
                        className="mp-ring-brand absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100/60 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)] rounded-r-[15px]"
                        aria-label={
                          txShowApiKey ? "Ocultar API key" : "Mostrar API key"
                        }
                        aria-pressed={txShowApiKey}
                        onClick={() => setTxShowApiKey((v) => !v)}
                      >
                        {txShowApiKey ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="tx-host"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Servidor SMTP
                    </label>
                    <input
                      id="tx-host"
                      value={txHost}
                      onChange={(e) => setTxHost(e.target.value)}
                      className={fieldClass}
                      placeholder="smtp.ejemplo.com"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tx-port"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Puerto
                    </label>
                    <input
                      id="tx-port"
                      inputMode="numeric"
                      value={txPort}
                      onChange={(e) => setTxPort(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-4 pb-1 sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                      <input
                        type="checkbox"
                        checked={txTls}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setTxTls(v);
                          if (v) setTxUseSsl(false);
                        }}
                        className="h-4 w-4 rounded border-zinc-300 accent-[color:var(--mp-primary)]"
                      />
                      Usar TLS (STARTTLS, típico en puerto 587)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                      <input
                        type="checkbox"
                        checked={txUseSsl}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setTxUseSsl(v);
                          if (v) setTxTls(false);
                        }}
                        className="h-4 w-4 rounded border-zinc-300 accent-[color:var(--mp-primary)]"
                      />
                      SSL implícito (típico en puerto 465)
                    </label>
                  </div>
                  <div>
                    <label
                      htmlFor="tx-user"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Usuario SMTP
                    </label>
                    <input
                      id="tx-user"
                      value={txUser}
                      onChange={(e) => setTxUser(e.target.value)}
                      className={fieldClass}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tx-pass"
                      className="block text-sm font-medium text-zinc-800"
                    >
                      Contraseña SMTP
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="tx-pass"
                        type={txShowPassword ? "text" : "password"}
                        value={txPassword}
                        onChange={(e) => setTxPassword(e.target.value)}
                        className={fieldClassNoTopMargin.replace(
                          /\\bpx-3\\.5\\b/,
                          "pl-3.5 pr-11",
                        )}
                        autoComplete="new-password"
                        placeholder={
                          txPwdSet
                            ? "Deja en blanco para no cambiar la guardada"
                            : ""
                        }
                      />
                      <button
                        type="button"
                        className="mp-ring-brand absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100/60 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)] rounded-r-[15px]"
                        aria-label={
                          txShowPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        aria-pressed={txShowPassword}
                        onClick={() => setTxShowPassword((v) => !v)}
                      >
                        {txShowPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="tx-from"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Correo remitente (From)
                </label>
                <input
                  id="tx-from"
                  type="email"
                  value={txFrom}
                  onChange={(e) => setTxFrom(e.target.value)}
                  className={fieldClass}
                  placeholder="notificaciones@tudominio.com"
                />
              </div>
              <div>
                <label
                  htmlFor="tx-fromname"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Nombre remitente (opcional)
                </label>
                <input
                  id="tx-fromname"
                  value={txFromName}
                  onChange={(e) => setTxFromName(e.target.value)}
                  className={fieldClass}
                  placeholder="Nombre del marketplace"
                />
              </div>
            </div>
            <div className="mt-5 border-t border-zinc-200/90 pt-4">
              <p className="max-w-xl text-xs text-zinc-600">
                Solo comprueba conexión y credenciales; no envía correo.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={txMethod === "api" ? onTestRelay : onTestSmtp}
                  disabled={
                    smtpTestLoading ||
                    (txMethod === "api"
                      ? !txMailgunDomain.trim() || (!txApiKey.trim() && !txApiKeySet)
                      : !txHost.trim() || !txUser.trim() || (!txPassword.trim() && !txPwdSet))
                  }
                  className="mp-ring-brand inline-flex shrink-0 items-center justify-center rounded-[15px] border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)] disabled:pointer-events-none disabled:opacity-50"
                >
                  {smtpTestLoading
                    ? "Comprobando…"
                    : txMethod === "api"
                      ? "Probar conexión (API)"
                      : "Probar conexión SMTP"}
                </button>
              </div>
              {smtpTestStatus && txTestContext === txMethod ? (
                <div
                  className={`mt-3 rounded-xl border px-3 py-2.5 text-sm ${
                    smtpTestStatus.ok
                      ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950"
                      : "border-red-200/90 bg-red-50/90 text-red-950"
                  }`}
                  role="status"
                >
                  <p className="font-medium">{smtpTestStatus.detail}</p>
                  {smtpTestStatus.technical ? (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-800">
                      {smtpTestStatus.technical}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="sec-contacto">
            <SectionTitle id="sec-contacto">Contacto público</SectionTitle>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ws-email"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Correo de soporte
                </label>
                <input
                  id="ws-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="ws-phone"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Teléfono
                </label>
                <input
                  id="ws-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="ws-country"
                  className="block text-sm font-medium text-zinc-800"
                >
                  País
                </label>
                <input
                  id="ws-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="ws-city"
                  className="block text-sm font-medium text-zinc-800"
                >
                  Ciudad
                </label>
                <input
                  id="ws-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-archivos">
            <SectionTitle id="sec-archivos">Archivos de marca</SectionTitle>
            <div className="mt-4 space-y-8">
              <FileBlock
                previewVariant="logoWide"
                label="Logotipo completo"
                helper="SVG, PNG, JPEG, GIF o WebP. Vista previa 150×50 px (en cabecera el logotipo se muestra hasta 150×30 px)."
                existingUrl={logoExisting}
                previewObjectUrl={logoPreview}
                file={logoFile}
                formatsHint="SVG, PNG, JPEG, GIF o WebP · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa SVG, PNG, JPEG, GIF o WebP."
                onFileChange={(f) => {
                  setLogoFile(f);
                  setRemoveLogo(false);
                }}
                onClearMark={() => {
                  setRemoveLogo(true);
                  setLogoFile(null);
                }}
              />
              <FileBlock
                previewVariant="logoWide"
                label="Logo PNG (correo, PDF y similares)"
                helper="Solo PNG. Se usa en notificaciones por correo y en PDFs del pedido cuando no aplica SVG. Recomendado si tu logotipo en vector no se reproduce bien en correo o documentos."
                existingUrl={logoPngArtifactsExisting}
                previewObjectUrl={logoPngArtifactsPreview}
                file={logoPngArtifactsFile}
                accept={pngArtifactsAccept}
                formatsHint="PNG · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa solo PNG."
                onFileChange={(f) => {
                  setLogoPngArtifactsFile(f);
                  setRemoveLogoPngArtifacts(false);
                }}
                onClearMark={() => {
                  setRemoveLogoPngArtifacts(true);
                  setLogoPngArtifactsFile(null);
                }}
              />
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                <FileBlock
                  previewVariant="square100"
                  label="Isotipo"
                  helper="Símbolo o marca reducida. Vista previa 100×100 px. Mismos formatos."
                  existingUrl={markExisting}
                  previewObjectUrl={logoMarkPreview}
                  file={logoMarkFile}
                  formatsHint="SVG, PNG, JPEG, GIF o WebP · máximo 5 MB"
                  formatErrorMessage="Formato no permitido. Usa SVG, PNG, JPEG, GIF o WebP."
                  onFileChange={(f) => {
                    setLogoMarkFile(f);
                    setRemoveLogoMark(false);
                  }}
                  onClearMark={() => {
                    setRemoveLogoMark(true);
                    setLogoMarkFile(null);
                  }}
                />
                <FileBlock
                  previewVariant="square100"
                  label="Favicon"
                  helper="SVG, PNG, ICO, JPEG, GIF o WebP. Vista previa 100×100 px."
                  existingUrl={favExisting}
                  previewObjectUrl={faviconPreview}
                  file={faviconFile}
                  formatsHint="SVG, PNG, ICO, JPEG, GIF o WebP · máximo 5 MB"
                  formatErrorMessage="Formato no permitido. Usa SVG, PNG, ICO, JPEG, GIF o WebP."
                  onFileChange={(f) => {
                    setFaviconFile(f);
                    setRemoveFavicon(false);
                  }}
                  onClearMark={() => {
                    setRemoveFavicon(true);
                    setFaviconFile(null);
                  }}
                />
              </div>
            </div>
          </section>

          {saveErr ? <p className="text-sm text-red-700">{saveErr}</p> : null}
          {saveOk ? <p className="text-sm text-emerald-800">{saveOk}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`${marketplacePrimaryBtn} min-h-11 px-5 py-2.5 text-sm font-semibold disabled:opacity-60`}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
