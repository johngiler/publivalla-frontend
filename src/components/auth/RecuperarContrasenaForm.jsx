"use client";

import Link from "next/link";
import { useState } from "react";

import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { postPasswordResetRequest } from "@/services/api";

const fieldClass = `mp-login-field mp-form-field-accent mt-2 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-base text-zinc-900 shadow-inner shadow-zinc-100/50 transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-zinc-400 focus:bg-white focus:outline-none sm:min-h-10 sm:text-sm`;

export default function RecuperarContrasenaForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [detail, setDetail] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await postPasswordResetRequest(email.trim());
      const msg =
        typeof data?.detail === "string"
          ? data.detail
          : "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.";
      setDetail(msg);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Revisa tu correo</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">{detail}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Si no lo ves en unos minutos, revisa la carpeta de spam o vuelve a intentarlo.
        </p>
        <Link
          href="/login"
          className={`${marketplacePrimaryBtn} mt-8 min-h-11 w-full justify-center px-5 py-2.5 text-sm font-semibold`}
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Olvidé mi contraseña</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Indica el correo de tu cuenta. Si está registrado en este marketplace, te enviaremos un enlace para
        elegir una nueva contraseña.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div>
          <label htmlFor="recover-email" className="text-sm font-medium text-zinc-800">
            Correo
          </label>
          <input
            id="recover-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error ? (
          <p
            role="alert"
            className={`break-words ${ROUNDED_CONTROL} border border-red-100 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800`}
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className={`${marketplacePrimaryBtn} min-h-11 w-full justify-center px-5 py-2.5 text-sm font-semibold`}
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-zinc-700 no-underline underline-offset-4 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
