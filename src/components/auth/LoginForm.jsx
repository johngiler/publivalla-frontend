"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { getAccessToken } from "@/lib/authStorage";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { postLoginRedirectPath } from "@/lib/postLoginRedirect";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { fetchMe } from "@/services/authApi";

const fieldBase = `mp-login-field mp-form-field-accent min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-base text-zinc-900 shadow-inner shadow-zinc-100/50 transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-zinc-400 focus:bg-white focus:outline-none sm:min-h-10 sm:text-sm`;

const fieldClass = `${fieldBase} mt-2`;

function IconEye({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconEyeOff({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function LoginShell({ children }) {
  const { displayName, loading } = useWorkspace();
  const brand = loading ? "…" : displayName;

  return (
    <div className="relative flex min-h-[calc(100dvh-10rem)] flex-col lg:grid lg:min-h-[calc(100dvh-8.5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative order-1 flex min-h-[11rem] flex-col justify-end overflow-hidden bg-zinc-950 px-6 py-8 text-white sm:min-h-[13rem] lg:order-none lg:min-h-0 lg:justify-between lg:px-12 lg:py-14 xl:px-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="mp-login-aside-glow absolute -left-[20%] -top-[30%] h-[22rem] w-[22rem] rounded-full blur-[80px]" />
            <div className="absolute -bottom-[25%] -right-[15%] h-[20rem] w-[20rem] rounded-full bg-sky-400/20 blur-[72px]" />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(12,157,207,0.12)_0%,transparent_45%,rgba(15,23,42,0.4)_100%)]" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>
          <div className="relative">
            <p className="font-semibold tracking-tight text-white/95">
              <span className="text-2xl sm:text-3xl">{brand}</span>
              <span className="ml-2 text-sm font-medium uppercase tracking-[0.2em] text-[#7dd3fc] sm:text-base">
                Ads
              </span>
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-300 lg:text-[0.9375rem]">
              Espacios publicitarios en centros comerciales. Accede para reservar, contratar y gestionar la ficha de tu
              empresa.
            </p>
          </div>
          <p className="relative mt-6 hidden text-xs text-zinc-500 lg:mt-0 lg:block">
            Marketplace B2B · Cuentas habilitadas por el operador ({brand})
          </p>
      </aside>

      <div className="relative order-2 flex flex-1 flex-col justify-center bg-gradient-to-b from-zinc-100/90 via-white to-sky-50/25 px-4 py-10 sm:px-8 lg:order-none lg:px-10 lg:py-14">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "";

  const { login, me, authReady } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady || !me) return;
    const target = postLoginRedirectPath({ role: me.role ?? null, nextPath });
    router.replace(target);
  }, [authReady, me, nextPath, router]);

  if (!authReady) {
    return (
      <LoginShell>
        <div
          className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white/90 p-10 text-center text-sm text-zinc-500 shadow-lg shadow-zinc-200/40 ring-1 ring-zinc-100/80 backdrop-blur-sm`}
        >
          <span className="mp-login-loading-dot inline-block h-5 w-5 animate-pulse rounded-full" aria-hidden />
          <p className="mt-4 font-medium text-zinc-600">Cargando sesión…</p>
        </div>
      </LoginShell>
    );
  }
  if (me) {
    return (
      <LoginShell>
        <div
          className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white/90 p-10 text-center shadow-lg shadow-zinc-200/40 ring-1 ring-zinc-100/80 backdrop-blur-sm`}
        >
          <p className="text-sm font-medium text-zinc-700">Ya iniciaste sesión.</p>
          <p className="mt-1 text-sm text-zinc-500">Redirigiendo…</p>
        </div>
      </LoginShell>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      const m = await fetchMe(getAccessToken());
      const target = postLoginRedirectPath({ role: m?.role ?? null, nextPath });
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <div
        className={`${ROUNDED_CONTROL} border border-zinc-200/80 bg-white/95 p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-zinc-100/90 backdrop-blur-sm sm:p-10`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.65rem]">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#0b7aa8]">
              Acceso empresas y equipo
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-xs font-medium text-zinc-900 no-underline underline-offset-4 transition-colors hover:underline"
          >
            ← Catálogo
          </Link>
        </div>

        <p className="mt-5 text-pretty text-sm leading-relaxed text-zinc-600">
          Necesario para completar el checkout y gestionar la ficha de tu empresa. Las cuentas las habilita el equipo del
          operador junto con el alta de tu empresa.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="login-username" className="text-sm font-medium text-zinc-800">
              Usuario
            </label>
            <input
              id="login-username"
              className={fieldClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="login-password" className="text-sm font-medium text-zinc-800">
                Contraseña
              </label>
              <Link
                href="/recuperar-contrasena"
                className="text-xs font-medium text-zinc-700 no-underline underline-offset-4 hover:underline"
              >
                Olvidé mi contraseña
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`${fieldBase} pr-11`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="mp-login-toggle-focus absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[15px] text-zinc-500 transition-colors hover:bg-zinc-100/50 hover:text-zinc-800 focus:outline-none"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <IconEyeOff className="shrink-0" /> : <IconEye className="shrink-0" />}
              </button>
            </div>
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
            className={`${marketplacePrimaryBtn} min-h-11 w-full justify-center px-5 py-2.5 text-base font-semibold sm:text-sm`}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 border-t border-zinc-100 pt-6 text-pretty text-left text-sm leading-relaxed text-zinc-500">
          ¿No tienes usuario? Contacta a tu ejecutivo o a soporte para que te den de alta en el marketplace.
        </p>
      </div>
    </LoginShell>
  );
}
