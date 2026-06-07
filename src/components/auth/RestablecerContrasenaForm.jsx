"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  PasswordPairLiveValidation,
  PASSWORD_PAIR_MIN_LENGTH,
} from "@/components/checkout/PasswordPairLiveValidation";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import {
  formatPasswordPolicyErrorBody,
  getPasswordResetIntent,
  postPasswordResetConfirm,
  postValidatePassword,
} from "@/services/api";

function formatErr(raw) {
  if (raw == null || raw === "") return "No se pudo restablecer la contraseña.";
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof o?.detail === "string") return o.detail;
    if (Array.isArray(o?.detail)) return o.detail.map(String).join(" ");
  } catch {
    /* fallthrough */
  }
  return typeof raw === "string" ? raw : "No se pudo restablecer la contraseña.";
}

export default function RestablecerContrasenaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [emailDisplay, setEmailDisplay] = useState("");
  const [intentLoading, setIntentLoading] = useState(true);
  const [intentError, setIntentError] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [policyError, setPolicyError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setPolicyError("");
  }, [password, passwordConfirm]);

  useEffect(() => {
    if (!token) {
      setIntentError(
        "Este enlace no es válido o falta el token. Solicita uno nuevo desde «Olvidé mi contraseña».",
      );
      setIntentLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getPasswordResetIntent(token);
        const em = typeof data?.email === "string" ? data.email.trim() : "";
        if (!cancelled) {
          setEmailDisplay(em);
          if (!em) setIntentError("No se pudo obtener el correo de este enlace.");
        }
      } catch (e) {
        if (!cancelled) {
          setIntentError(e instanceof Error ? e.message : "Enlace no válido o caducado.");
        }
      } finally {
        if (!cancelled) setIntentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPolicyError("");
    if (!token || !emailDisplay) {
      setError("Usa el enlace completo que recibiste por correo.");
      return;
    }
    if (password.length < PASSWORD_PAIR_MIN_LENGTH) {
      setPolicyError(`La contraseña debe tener al menos ${PASSWORD_PAIR_MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== passwordConfirm) {
      setPolicyError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await postValidatePassword(password);
    } catch (err) {
      setPolicyError(
        err instanceof Error ? err.message : "La contraseña no cumple las reglas de seguridad.",
      );
      setLoading(false);
      return;
    }
    try {
      await postPasswordResetConfirm({ token, password, password_confirm: passwordConfirm });
      setDone(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }
      if (parsed && typeof parsed === "object" && parsed.password != null) {
        setPolicyError(formatPasswordPolicyErrorBody(parsed));
      } else {
        setError(raw ? formatErr(raw) : "Error al guardar la contraseña");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Contraseña actualizada</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          Ya puedes iniciar sesión con{" "}
          {emailDisplay ? (
            <strong className="font-medium text-zinc-800">{emailDisplay}</strong>
          ) : (
            "tu correo"
          )}{" "}
          y la nueva contraseña.
        </p>
        <Link
          href="/login"
          className={`${marketplacePrimaryBtn} mt-8 min-h-11 w-full justify-center px-5 py-2.5 text-sm font-semibold`}
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  const formReady = !intentLoading && !intentError && Boolean(emailDisplay);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Nueva contraseña</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Elige una contraseña nueva para tu cuenta en este marketplace.
      </p>

      {intentLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Comprobando enlace…</p>
      ) : null}

      {intentError ? (
        <div className="mt-6 space-y-4">
          <p
            role="alert"
            className={`${ROUNDED_CONTROL} border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950`}
          >
            {intentError}
          </p>
          <Link
            href="/recuperar-contrasena"
            className={`${marketplacePrimaryBtn} inline-flex min-h-11 justify-center px-5 py-2.5 text-sm font-semibold`}
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      ) : null}

      {formReady ? (
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="reset-email" className="text-sm font-medium text-zinc-800">
              Correo de la cuenta
            </label>
            <input
              id="reset-email"
              type="email"
              readOnly
              autoComplete="username"
              value={emailDisplay}
              className={`mp-login-field mp-form-field-accent mt-2 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-base font-medium text-zinc-800 shadow-inner shadow-zinc-100/50 sm:min-h-10 sm:text-sm`}
            />
          </div>
          <PasswordPairLiveValidation
            password={password}
            passwordConfirm={passwordConfirm}
            onPasswordChange={setPassword}
            onPasswordConfirmChange={setPasswordConfirm}
            passwordId="reset-password"
            confirmId="reset-password2"
            policyError={policyError}
          />
          {error ? (
            <p className={`break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}>{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className={`${marketplacePrimaryBtn} min-h-11 w-full justify-center px-5 py-2.5 text-sm font-semibold`}
          >
            {loading ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
        </form>
      ) : null}

      <p className="mt-8 text-center text-sm text-zinc-500">
        <button
          type="button"
          onClick={() => router.back()}
          className="font-medium text-zinc-700 no-underline underline-offset-4 hover:underline"
        >
          Volver
        </button>
        {" · "}
        <Link href="/login" className="font-medium text-zinc-700 no-underline underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
