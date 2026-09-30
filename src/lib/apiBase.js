/**
 * URL base del API (NEXT_PUBLIC_API_URL). Compartido por `services/api` y `lib/mediaUrls`.
 *
 * Si en producción falta `NEXT_PUBLIC_API_URL`, las rutas `/media/...` relativas se resolvían contra
 * el host del portal (p. ej. acme.publivalla.com) y las miniaturas devolvían 404. Fallback:
 * `https://api.${NEXT_PUBLIC_TENANT_BASE_DOMAIN}` cuando exista (alineado a `.env.production.example`).
 */
export function apiBase() {
  const env = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8001";
  }
  const tenant = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "")
    .trim()
    .toLowerCase();
  if (tenant) {
    return `https://api.${tenant}`;
  }
  return "";
}
