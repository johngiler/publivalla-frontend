/** @type {import('next').NextConfig} */
// `remotePatterns`: host del API para `next/image` si se usa. `rewrites`: proxy `/media/*` → API (misma base que `apiBase`).
function mediaPatternFromApiUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    (() => {
      const t = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "").trim().toLowerCase();
      return t ? `https://api.${t}` : "";
    })();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const pat = {
      protocol: u.protocol.replace(":", ""),
      hostname: u.hostname,
      pathname: "/**",
    };
    if (u.port) pat.port = u.port;
    return pat;
  } catch {
    return null;
  }
}

const fromEnv = mediaPatternFromApiUrl();

function resolveApiBaseForMediaRewrites() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (raw) return raw;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8001";
  }
  const tenant = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "").trim().toLowerCase();
  if (tenant) return `https://api.${tenant}`;
  return "";
}

const nextConfig = {
  // Rutas dinámicas impiden `output: "export"` (solo estático). Standalone + Nginx proxy en prod.
  output: "standalone",
  async rewrites() {
    const api = resolveApiBaseForMediaRewrites();
    if (!api) return [];
    return [{ source: "/media/:path*", destination: `${api}/media/:path*` }];
  },
  images: {
    // Next 14+ bloquea IPs privadas en el optimizador (SSRF). En `next dev` el media en 127.0.0.1 falla sin esto.
    // En producción sirve las imágenes desde un dominio público o, en entornos cerrados, valora `unoptimized` / proxy.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      // Sin `port`: en Next coincide con cualquier puerto (evita desajuste 8000 vs omisión).
      // `pathname: "/**"`: cubre `/media/...` y cualquier otra ruta que sirva el API en local.
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      ...(fromEnv ? [fromEnv] : []),
    ],
  },
};

export default nextConfig;
