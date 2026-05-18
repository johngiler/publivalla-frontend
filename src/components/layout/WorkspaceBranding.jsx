"use client";

import { useEffect } from "react";

import { useWorkspace } from "@/context/WorkspaceContext";
import { normalizeMediaUrlForUi } from "@/lib/mediaUrls";

const DEFAULT_PRIMARY = "#0c9dcf";
const DEFAULT_SECONDARY = "#ea580c";

/** Favicon por defecto del SPA (Next `app/icon.svg`); neutro, sin isotipo de marca. */
const NEUTRAL_FAVICON_HREF = "/icon.svg";

function sanitizeHex(input, fallback) {
  if (input == null || typeof input !== "string") return fallback;
  let s = input.trim();
  if (!s) return fallback;
  if (!s.startsWith("#")) s = `#${s}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return fallback;
  return s;
}

function applyFaviconHref(href) {
  let iconLink = document.querySelector('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement("link");
    iconLink.rel = "icon";
    document.head.appendChild(iconLink);
  }
  if (iconLink.getAttribute("href") !== href) {
    iconLink.setAttribute("href", href);
  }
}

/**
 * Aplica favicon, theme-color y variables CSS `--mp-primary` / `--mp-secondary`
 * según el workspace cargado desde `/api/workspace/current/`.
 */
export function WorkspaceBranding() {
  const { workspace, loading } = useWorkspace();

  useEffect(() => {
    if (loading) return;

    const root = document.documentElement;
    const primary = sanitizeHex(workspace?.primary_color, DEFAULT_PRIMARY);
    const secondary = sanitizeHex(workspace?.secondary_color, DEFAULT_SECONDARY);
    root.style.setProperty("--mp-primary", primary);
    root.style.setProperty("--mp-secondary", secondary);

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", primary);

    const tenantFavicon =
      typeof workspace?.favicon_url === "string" && workspace.favicon_url.trim() !== ""
        ? normalizeMediaUrlForUi(workspace.favicon_url.trim())
        : null;

    applyFaviconHref(tenantFavicon || NEUTRAL_FAVICON_HREF);
  }, [workspace, loading]);

  return null;
}
