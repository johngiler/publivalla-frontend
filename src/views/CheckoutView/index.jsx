"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import {
  PasswordPairLiveValidation,
  PASSWORD_PAIR_MIN_LENGTH,
} from "@/components/checkout/PasswordPairLiveValidation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  formatUsdInteger,
  formatUsdMoney,
  ivaFromSubtotal,
  totalWithIva,
} from "@/lib/marketplacePricing";
import {
  cartAllItemsMeetCheckoutRules,
  cartTotalUsd,
  expandCartItemsToOrderPayload,
} from "@/lib/rentalDates";
import { EmptyState, EmptyStateIconInbox } from "@/components/ui/EmptyState";
import {
  marketplacePrimaryBtn,
  marketplaceSecondaryBtn,
} from "@/lib/marketplaceActionButtons";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authJsonFetcher, MY_COMPANY_SWR_KEY } from "@/lib/swr/fetchers";
import {
  postGuestCheckout,
  postGuestCheckoutEmailAvailable,
  postGuestCheckoutValidateDatos,
  postValidatePassword,
} from "@/services/api";
import { authFetch, saveMyCompany } from "@/services/authApi";

function formatOrderErrorMessage(raw) {
  if (raw == null || raw === "") return "No se pudo crear el pedido.";
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (o && typeof o === "object" && o.password != null) {
      const p = o.password;
      if (Array.isArray(p)) return p.map(String).filter(Boolean).join(" ");
      if (typeof p === "string" && p.trim()) return p.trim();
    }
    if (o?.detail) {
      if (typeof o.detail === "string") return o.detail;
      if (Array.isArray(o.detail)) return o.detail.map(String).join(" ");
    }
    if (Array.isArray(o?.items)) {
      const parts = o.items
        .map((row, idx) => {
          if (!row || typeof row !== "object") return null;
          const ad = row.ad_space;
          if (Array.isArray(ad) && ad.length) {
            return `Línea ${idx + 1}: ${ad.join(" ")}`;
          }
          if (typeof ad === "string") return `Línea ${idx + 1}: ${ad}`;
          return null;
        })
        .filter(Boolean);
      if (parts.length) {
        return (
          parts.join(" ") +
          " Comprueba que las tomas existan en el catálogo publicado."
        );
      }
    }
  } catch {
    /* fallthrough */
  }
  return typeof raw === "string" ? raw : "No se pudo crear el pedido.";
}

const fieldClass = `mp-form-field-accent mt-1.5 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none sm:min-h-0 sm:py-2 sm:text-sm`;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

function CheckoutRequiredMark() {
  return (
    <span className="text-red-600" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/** Aviso fijo en checkout invitado: el correo del formulario es el usuario de acceso. */
const GUEST_CHECKOUT_LOGIN_EMAIL_HINT =
  "Este correo será tu usuario para iniciar sesión en el marketplace y a donde llegarán todas tus solicitudes.";

/**
 * Interpreta la respuesta de `/api/checkout/guest/validate-datos/` (sin efectos).
 * @param {{ email: { client_exists: boolean, has_marketplace_account: boolean }, company: { client_exists: boolean, has_marketplace_account: boolean }, same_client: boolean }} d
 */
function interpretGuestCheckoutValidateDatos(d) {
  const emailBlockMsg =
    "Este correo ya está asociado a una cuenta en este sitio. Inicia sesión para completar tu reserva.";
  const companyBlockMsg =
    "Esta razón social ya está registrada con una cuenta en este sitio. Inicia sesión o corrige el nombre si es otra empresa.";

  if (d.email.has_marketplace_account) {
    return {
      emailBlock: emailBlockMsg,
      emailNotice: "",
      companyBlock: "",
      companyNotice: "",
      blocked: true,
    };
  }
  if (d.company.has_marketplace_account && !d.same_client) {
    return {
      emailBlock: "",
      emailNotice: "",
      companyBlock: companyBlockMsg,
      companyNotice: "",
      blocked: true,
    };
  }

  let emailNotice = "";
  let companyNotice = "";
  if (d.same_client && d.email.client_exists) {
    emailNotice =
      "Este correo y esta razón social ya están registrados como la misma empresa. Al enviar se actualizarán los datos de contacto con lo que indicaste arriba.";
  } else {
    if (d.email.client_exists) {
      emailNotice =
        "Este correo ya figura como empresa registrada. Al enviar la solicitud se actualizarán los datos de contacto con lo que indiques arriba.";
    }
    if (d.company.client_exists && !d.same_client) {
      companyNotice =
        "Ya hay una empresa registrada con este nombre. Si es la misma, usa el mismo correo con el que reservaste antes; si es otra razón social, ajusta el nombre.";
    }
  }

  return {
    emailBlock: "",
    emailNotice,
    companyBlock: "",
    companyNotice,
    blocked: false,
  };
}

export default function CheckoutView() {
  const router = useRouter();
  const { items, clear } = useCart();
  const {
    authReady,
    me,
    isAdmin,
    isClient,
    hasCompanyProfile,
    company,
    accessToken,
    setCompanyData,
  } = useAuth();
  const { displayName } = useWorkspace();

  const isGuest = !me;

  const [step, setStep] = useState("datos");
  const [company_name, setCompanyName] = useState("");
  const [rif, setRif] = useState("");
  const [contact_name, setContactName] = useState("");
  const [representative_name, setRepresentativeName] = useState("");
  const [representative_id_number, setRepresentativeIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [guestCreatedAccount, setGuestCreatedAccount] = useState(false);
  /** true solo si la orden se envió vía checkout invitado (no sesión cliente). */
  const [completedAsGuest, setCompletedAsGuest] = useState(false);
  const [guestPasswordPolicyError, setGuestPasswordPolicyError] = useState("");
  const [guestEmailTakenError, setGuestEmailTakenError] = useState("");
  const [guestClientEmailBlock, setGuestClientEmailBlock] = useState("");
  const [guestClientEmailNotice, setGuestClientEmailNotice] = useState("");
  const [guestCompanyBlock, setGuestCompanyBlock] = useState("");
  const [guestCompanyNotice, setGuestCompanyNotice] = useState("");
  const [guestDatosPasswordChecking, setGuestDatosPasswordChecking] =
    useState(false);

  const loggedIn = authReady && accessToken && me;
  const { data: companyFromSwr, mutate: mutateCheckoutCompany } = useSWR(
    loggedIn ? MY_COMPANY_SWR_KEY : null,
    authJsonFetcher,
    { fallbackData: company === undefined ? undefined : company },
  );
  const effectiveCompany =
    companyFromSwr !== undefined ? companyFromSwr : company;

  const meetsMin = cartAllItemsMeetCheckoutRules(items);
  const subtotal = meetsMin ? cartTotalUsd(items) : 0;
  const iva = ivaFromSubtotal(subtotal);
  const grandTotal = totalWithIva(subtotal);

  useEffect(() => {
    if (effectiveCompany && typeof effectiveCompany === "object") {
      setCompanyName(effectiveCompany.company_name || "");
      setRif(effectiveCompany.rif || "");
      setContactName(effectiveCompany.contact_name || "");
      setRepresentativeName(effectiveCompany.representative_name || "");
      setRepresentativeIdNumber(effectiveCompany.representative_id_number || "");
      setEmail(effectiveCompany.email || "");
      setPhone(effectiveCompany.phone || "");
    } else if (me?.email) {
      setEmail(me.email);
    }
  }, [effectiveCompany, me]);

  useEffect(() => {
    setGuestPasswordPolicyError("");
  }, [password, passwordConfirm, createAccount]);

  useEffect(() => {
    setGuestEmailTakenError("");
    setGuestClientEmailBlock("");
    setGuestClientEmailNotice("");
    setGuestCompanyBlock("");
    setGuestCompanyNotice("");
  }, [email, createAccount]);

  useEffect(() => {
    setGuestCompanyBlock("");
    setGuestCompanyNotice("");
    setGuestClientEmailBlock("");
    setGuestClientEmailNotice("");
  }, [company_name]);

  const baseFieldsOk =
    Boolean(company_name.trim()) &&
    Boolean(rif.trim()) &&
    Boolean(email.trim()) &&
    Boolean(contact_name.trim()) &&
    Boolean(phone.trim());

  const passwordBlockOk =
    !createAccount ||
    (password.length >= PASSWORD_PAIR_MIN_LENGTH &&
      password === passwordConfirm &&
      passwordConfirm.length >= PASSWORD_PAIR_MIN_LENGTH);

  const guestDatosReady =
    isGuest &&
    baseFieldsOk &&
    passwordBlockOk &&
    !guestClientEmailBlock &&
    !guestCompanyBlock;

  const clientNewCompanyReady = !isGuest && !hasCompanyProfile && baseFieldsOk;

  const datosStepCanContinue = isGuest
    ? guestDatosReady
    : hasCompanyProfile || clientNewCompanyReady;

  async function ensureCompanyThenSubmit() {
    setError("");
    setResult(null);
    if (!items.length || !meetsMin) {
      setError(
        "El carrito está vacío o el período no cumple al menos un mes de calendario.",
      );
      return;
    }
    if (!accessToken) return;

    setLoading(true);
    try {
      if (!hasCompanyProfile) {
        const payload = {
          company_name: company_name.trim(),
          rif: rif.trim(),
          contact_name: contact_name.trim(),
          representative_name: representative_name.trim(),
          representative_id_number: representative_id_number.trim(),
          email: email.trim(),
          phone: phone.trim(),
        };
        const saved = await saveMyCompany(payload, {
          method: "POST",
          token: accessToken,
        });
        setCompanyData(saved);
        await mutateCheckoutCompany(saved, { revalidate: false });
      }

      const orderPayload = {
        items: expandCartItemsToOrderPayload(items),
      };
      const draft = await authFetch("/api/orders/", {
        method: "POST",
        body: orderPayload,
        token: accessToken,
      });
      const submitted = await authFetch(`/api/orders/${draft.id}/submit/`, {
        method: "POST",
        body: {},
        token: accessToken,
      });
      setResult(submitted);
      setGuestCreatedAccount(false);
      setCompletedAsGuest(false);
      clear();
    } catch (err) {
      setError(
        err instanceof Error
          ? formatOrderErrorMessage(err.message)
          : "Error al enviar",
      );
    } finally {
      setLoading(false);
    }
  }

  async function guestSubmit() {
    setError("");
    setResult(null);
    if (!items.length || !meetsMin) {
      setError(
        "El carrito está vacío o el período no cumple al menos un mes de calendario.",
      );
      return;
    }
    if (!guestDatosReady) {
      setError(
        guestClientEmailBlock || guestCompanyBlock
          ? guestClientEmailBlock || guestCompanyBlock
          : `Completa los datos y, si marcaste crear cuenta, la contraseña (mínimo ${PASSWORD_PAIR_MIN_LENGTH} caracteres).`,
      );
      return;
    }

    try {
      const raw = await postGuestCheckoutValidateDatos({
        email: email.trim(),
        company_name: company_name.trim(),
      });
      const v = interpretGuestCheckoutValidateDatos(raw);
      setGuestClientEmailBlock(v.emailBlock);
      setGuestClientEmailNotice(v.emailNotice);
      setGuestCompanyBlock(v.companyBlock);
      setGuestCompanyNotice(v.companyNotice);
      if (v.blocked) {
        setError(
          v.emailBlock ||
            v.companyBlock ||
            "Revisa el correo o la razón social antes de enviar la solicitud.",
        );
        return;
      }
    } catch {
      setError(
        "No se pudo verificar los datos. Revisa tu conexión e inténtalo de nuevo.",
      );
      return;
    }

    setLoading(true);
    try {
      const submitted = await postGuestCheckout({
        company_name: company_name.trim(),
        rif: rif.trim(),
        contact_name: contact_name.trim(),
        representative_name: representative_name.trim(),
        representative_id_number: representative_id_number.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: "",
        city: "",
        create_account: createAccount,
        password: createAccount ? password : "",
        password_confirm: createAccount ? passwordConfirm : "",
        items: expandCartItemsToOrderPayload(items),
      });
      setResult(submitted);
      setGuestCreatedAccount(createAccount);
      setCompletedAsGuest(true);
      clear();
    } catch (err) {
      setError(
        err instanceof Error
          ? formatOrderErrorMessage(err.message)
          : "Error al enviar",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">
          Solicitud enviada
        </h1>
        <p className="mt-4 break-words text-zinc-600">
          Pedido{" "}
          <span className="font-mono font-medium text-zinc-900">
            #{result.id}
          </span>{" "}
          — estado: <span>{result.status_label || "Reservado"}</span>
        </p>
        <p className="mt-4 text-sm text-zinc-600">
          El comprobante de pago lo subirás más adelante, cuando el pedido esté
          facturado, desde{" "}
          <Link
            href="/cuenta/pedidos"
            className="font-semibold text-zinc-900 no-underline underline-offset-4 hover:underline"
          >
            Mis pedidos
          </Link>
          .
        </p>
        {result.hold_expires_at ? (
          <p className="mt-2 break-words text-sm text-zinc-600">
            Reserva en revisión hasta{" "}
            {new Date(result.hold_expires_at).toLocaleString("es-VE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            (72 h).
          </p>
        ) : null}
        <p className="mt-4 text-sm text-zinc-600">
          Monto total:{" "}
          <span className="mp-text-brand font-semibold tabular-nums">
            {formatUsdMoney(Number(result.total_amount))}
          </span>
        </p>
        {guestCreatedAccount ? (
          <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
            Creaste tu cuenta con este pedido. Ya puedes{" "}
            <Link
              href="/login"
              className="font-semibold no-underline underline-offset-4 hover:underline"
            >
              iniciar sesión
            </Link>{" "}
            con tu correo y contraseña para ver el estado en &quot;Mis
            pedidos&quot;.
          </p>
        ) : null}
        {completedAsGuest && !guestCreatedAccount ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Compraste{" "}
            <strong className="font-medium text-zinc-800">
              sin crear cuenta
            </strong>
            . Cuando el equipo de {displayName} apruebe la solicitud recibirás
            un correo en{" "}
            <span className="font-medium text-zinc-800">
              {email || "tu correo"}
            </span>{" "}
            con un enlace para definir tu contraseña y acceder con ese mismo
            correo.
          </p>
        ) : null}
        {!completedAsGuest ? (
          <p className="mt-4 text-sm text-zinc-600">
            Revisa el estado en{" "}
            <Link
              href="/cuenta/pedidos"
              className="font-semibold text-zinc-900 no-underline underline-offset-4 hover:underline"
            >
              Mis pedidos
            </Link>
            .
          </p>
        ) : null}
        {completedAsGuest && !guestCreatedAccount ? (
          <p className="mt-2 text-xs text-zinc-500">
            El seguimiento comercial puede continuar en tu CRM; aquí queda
            registrada la solicitud en el marketplace.
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className={`${marketplaceSecondaryBtn} min-h-11 flex-1 px-5 py-2.5 text-base font-semibold sm:min-h-0 sm:text-sm`}
          >
            Volver al inicio
          </Link>
          {guestCreatedAccount ? (
            <Link
              href="/login"
              className={`${marketplacePrimaryBtn} min-h-11 flex-1 px-5 py-2.5 text-base font-semibold sm:min-h-0 sm:text-sm`}
            >
              Iniciar sesión
            </Link>
          ) : completedAsGuest ? null : (
            <Link
              href="/cuenta/pedidos"
              className={`${marketplacePrimaryBtn} min-h-11 flex-1 px-5 py-2.5 text-base font-semibold sm:min-h-0 sm:text-sm`}
            >
              Ver mis pedidos
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-zinc-500">
        Cargando…
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">
          Checkout
        </h1>
        <p className="mt-4 text-zinc-600">
          Este proceso no está disponible para tu cuenta.{" "}
          <Link
            href="/"
            className="font-medium text-zinc-900 no-underline underline-offset-4 hover:underline"
          >
            Volver al inicio
          </Link>
        </p>
      </div>
    );
  }

  if (me && !isClient) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-zinc-600">
        Este proceso no está disponible para tu cuenta.{" "}
        <Link
          href="/"
          className="font-medium text-zinc-900 no-underline underline-offset-4 hover:underline"
        >
          Inicio
        </Link>
      </div>
    );
  }

  const canCheckout = isGuest || isClient;
  if (!canCheckout) {
    return null;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm text-zinc-500">
        <Link
          href="/cart"
          className="font-medium text-zinc-900 no-underline underline-offset-4 hover:underline"
        >
          ← Volver al carrito
        </Link>
      </p>
      {isGuest ? (
        <p className="mt-3 text-sm text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login?next=/checkout"
            className="font-semibold text-zinc-900 no-underline underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      ) : null}
      <h1 className="mt-4 text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">
        Checkout
      </h1>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<EmptyStateIconInbox />}
            title="No hay nada que confirmar"
            description="El carrito no tiene tomas con período válido. Vuelve al carrito para añadir espacios y fechas."
            action={
              <Link
                href="/cart"
                className={`${marketplacePrimaryBtn} min-h-11 px-5 py-2.5 text-sm font-semibold sm:min-h-0`}
              >
                Ir al carrito
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <CheckoutStepper step={step} />

          {step === "datos" ? (
            <div className="mt-10 space-y-6">
              {isGuest ? (
                <form
                  className="space-y-5"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!datosStepCanContinue) return;
                    setGuestPasswordPolicyError("");
                    setGuestEmailTakenError("");
                    setGuestDatosPasswordChecking(true);
                    try {
                      const raw = await postGuestCheckoutValidateDatos({
                        email: email.trim(),
                        company_name: company_name.trim(),
                      });
                      const v = interpretGuestCheckoutValidateDatos(raw);
                      setGuestClientEmailBlock(v.emailBlock);
                      setGuestClientEmailNotice(v.emailNotice);
                      setGuestCompanyBlock(v.companyBlock);
                      setGuestCompanyNotice(v.companyNotice);
                      if (v.blocked) return;
                      if (createAccount) {
                        try {
                          await postValidatePassword(password);
                        } catch (err) {
                          setGuestPasswordPolicyError(
                            err instanceof Error
                              ? err.message
                              : "La contraseña no cumple las reglas de seguridad.",
                          );
                          return;
                        }
                        try {
                          const emailCheck =
                            await postGuestCheckoutEmailAvailable(email.trim());
                          if (!emailCheck.available) {
                            setGuestEmailTakenError(
                              typeof emailCheck.detail === "string" &&
                                emailCheck.detail.trim()
                                ? emailCheck.detail.trim()
                                : "Ya existe un usuario con este correo. Inicia sesión o usa otro email.",
                            );
                            return;
                          }
                        } catch (err) {
                          setGuestEmailTakenError(
                            err instanceof Error
                              ? err.message
                              : "No se pudo comprobar el correo. Intenta de nuevo.",
                          );
                          return;
                        }
                      }
                      setStep("confirmar");
                    } catch (err) {
                      setGuestClientEmailBlock(
                        err instanceof Error
                          ? err.message
                          : "No se pudo verificar los datos. Revisa tu conexión e inténtalo de nuevo.",
                      );
                      setGuestClientEmailNotice("");
                      setGuestCompanyBlock("");
                      setGuestCompanyNotice("");
                    } finally {
                      setGuestDatosPasswordChecking(false);
                    }
                  }}
                >
                  <div>
                    <label className={labelClass}>
                      Empresa
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={company_name}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={fieldClass}
                    />
                    {guestCompanyBlock ? (
                      <p
                        role="alert"
                        className={`mt-2 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
                      >
                        {guestCompanyBlock}{" "}
                        <Link
                          href="/login?next=/checkout"
                          className="font-semibold text-red-900 no-underline underline-offset-2 hover:underline"
                        >
                          Iniciar sesión
                        </Link>
                      </p>
                    ) : null}
                    {guestCompanyNotice ? (
                      <p
                        className={`mt-2 ${ROUNDED_CONTROL} border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm text-sky-950`}
                      >
                        {guestCompanyNotice}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-guest-rif">
                      RIF
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      id="checkout-guest-rif"
                      required
                      value={rif}
                      onChange={(e) => setRif(e.target.value)}
                      className={fieldClass}
                      placeholder="Ej. J-12345678-9"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-guest-rep">
                      Representante legal
                    </label>
                    <input
                      id="checkout-guest-rep"
                      value={representative_name}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      className={fieldClass}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-guest-rep-ci">
                      Cédula del representante
                    </label>
                    <input
                      id="checkout-guest-rep-ci"
                      value={representative_id_number}
                      onChange={(e) => setRepresentativeIdNumber(e.target.value)}
                      className={fieldClass}
                      placeholder="Ej. V-12345678"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Persona de contacto
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={contact_name}
                      onChange={(e) => setContactName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-guest-email">
                      Email
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      id="checkout-guest-email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      autoComplete="email"
                      aria-describedby="checkout-guest-email-hint"
                    />
                    <p
                      id="checkout-guest-email-hint"
                      className={`mt-2 ${ROUNDED_CONTROL} border border-zinc-200/90 bg-zinc-50 px-3 py-2.5 text-sm leading-snug text-zinc-700`}
                    >
                      {GUEST_CHECKOUT_LOGIN_EMAIL_HINT}
                    </p>
                    {guestClientEmailBlock ? (
                      <p
                        role="alert"
                        className={`mt-2 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
                      >
                        {guestClientEmailBlock}{" "}
                        <Link
                          href="/login?next=/checkout"
                          className="font-semibold text-red-900 no-underline underline-offset-2 hover:underline"
                        >
                          Iniciar sesión
                        </Link>
                      </p>
                    ) : null}
                    {guestClientEmailNotice ? (
                      <p
                        className={`mt-2 ${ROUNDED_CONTROL} border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm text-sky-950`}
                      >
                        {guestClientEmailNotice}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass}>
                      Teléfono
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={fieldClass}
                      type="tel"
                      autoComplete="tel"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 accent-[color:var(--mp-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mp-primary)_30%,transparent)]"
                    />
                    <span className="text-sm leading-snug text-zinc-700">
                      <span className="font-semibold text-zinc-900">
                        Crear cuenta al comprar
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        Contraseña de al menos {PASSWORD_PAIR_MIN_LENGTH} caracteres.
                      </span>
                    </span>
                  </label>
                  {createAccount ? (
                    <PasswordPairLiveValidation
                      password={password}
                      passwordConfirm={passwordConfirm}
                      onPasswordChange={setPassword}
                      onPasswordConfirmChange={setPasswordConfirm}
                      passwordId="guest-checkout-password"
                      confirmId="guest-checkout-password-confirm"
                      policyError={guestPasswordPolicyError}
                    />
                  ) : null}
                  {guestEmailTakenError ? (
                    <p
                      role="alert"
                      className={`break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
                    >
                      {guestEmailTakenError}{" "}
                      <Link
                        href="/login?next=/checkout"
                        className="font-semibold text-red-900 no-underline underline-offset-2 hover:underline"
                      >
                        Iniciar sesión
                      </Link>
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={
                      !datosStepCanContinue || guestDatosPasswordChecking
                    }
                    className={`${marketplacePrimaryBtn} mt-2 min-h-11 w-full px-5 py-3 text-sm font-semibold`}
                  >
                    {guestDatosPasswordChecking ? "Comprobando…" : "Continuar"}
                  </button>
                </form>
              ) : !hasCompanyProfile ? (
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (datosStepCanContinue) setStep("confirmar");
                  }}
                >
                  <div>
                    <label className={labelClass}>
                      Empresa
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={company_name}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-client-rif">
                      RIF
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      id="checkout-client-rif"
                      required
                      value={rif}
                      onChange={(e) => setRif(e.target.value)}
                      className={fieldClass}
                      placeholder="Ej. J-12345678-9"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-client-rep">
                      Representante legal
                    </label>
                    <input
                      id="checkout-client-rep"
                      value={representative_name}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      className={fieldClass}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="checkout-client-rep-ci">
                      Cédula del representante
                    </label>
                    <input
                      id="checkout-client-rep-ci"
                      value={representative_id_number}
                      onChange={(e) => setRepresentativeIdNumber(e.target.value)}
                      className={fieldClass}
                      placeholder="Ej. V-12345678"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Persona de contacto
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={contact_name}
                      onChange={(e) => setContactName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Email
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Teléfono
                      <CheckoutRequiredMark />
                    </label>
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={fieldClass}
                      type="tel"
                      autoComplete="tel"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!datosStepCanContinue}
                    className={`${marketplacePrimaryBtn} mt-2 min-h-11 w-full px-5 py-3 text-sm font-semibold`}
                  >
                    Continuar
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div
                    className={`${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50/80 p-5`}
                  >
                    <p className={labelClass}>Empresa registrada</p>
                    <p className="mt-2 text-base font-semibold text-zinc-900">
                      {company.company_name}
                    </p>
                    {company.rif ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        RIF {company.rif}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => router.push("/cuenta")}
                      className="mp-text-brand mt-4 text-sm font-semibold no-underline underline-offset-4 hover:underline"
                    >
                      Editar en Mi empresa
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("confirmar")}
                    className={`${marketplacePrimaryBtn} min-h-11 w-full py-3 text-sm font-semibold`}
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {step === "confirmar" ? (
            <div className="mt-10 space-y-8">
              <div
                className={`${ROUNDED_CONTROL} border border-zinc-200 bg-white p-5 shadow-sm`}
              >
                <ul className="divide-y divide-zinc-100">
                  {items.map((i) => {
                    const line = cartTotalUsd([i]);
                    return (
                      <li
                        key={i.id}
                        className="flex items-center justify-between gap-4 py-4 first:pt-0"
                      >
                        <span className="font-medium text-zinc-900">
                          {i.title}
                        </span>
                        <span className="mp-text-brand shrink-0 text-lg font-bold tabular-nums">
                          {formatUsdInteger(line)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Total c/ IVA</span>
                    <span className="mp-text-brand text-lg font-bold tabular-nums">
                      {formatUsdInteger(grandTotal)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Subtotal {formatUsdMoney(subtotal)} + IVA (16 %){" "}
                    {formatUsdMoney(iva)}
                  </p>
                </div>
              </div>

              {error ? (
                <p
                  className={`break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
                >
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("datos")}
                  className={`${marketplaceSecondaryBtn} min-h-11 flex-1 py-2.5 text-sm font-semibold`}
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={loading || !meetsMin}
                  onClick={() =>
                    isGuest ? guestSubmit() : ensureCompanyThenSubmit()
                  }
                  className={`${marketplacePrimaryBtn} min-h-11 flex-1 py-2.5 text-sm font-semibold`}
                >
                  {loading ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
