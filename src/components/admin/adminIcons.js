const c = "h-[1.125rem] w-[1.125rem] shrink-0";

/** Dólar en círculo (métricas económicas en panel). */
export function IconAdminCurrency({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21a9 9 0 100-18 9 9 0 000 18z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v10M9 10h4.5a1.5 1.5 0 010 3H9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminChart({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 13.5V19.5M9.75 9.75V19.5M16.5 5.25V19.5M21 21H3M21 10.5l-4.5 4.5-3-3-4.5 4.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminBuilding({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.75 21V6.75A2.25 2.25 0 016 4.5h4.5A2.25 2.25 0 0112.75 6.75V21M3.75 21h16.5M3.75 21H3m16.5 0h.75m-.75 0H12.75M9 6.75h.01M9 9h.01M9 11.25h.01M12 6.75h.01M12 9h.01M12 11.25h.01"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAdminGrid({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM6 13.5h2.25m2.25 0H12m0 0h2.25m2.25 0H18M10.5 6H12m0 0h1.5m-1.5 3H12m0 0h1.5m-6.75 3v1.5m0 0V18m0-1.5h1.5m-1.5 0H9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminUserPlus({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11c0-1.424 1.17-2.625 2.598-2.625h4.898c.957 0 1.817.456 2.402 1.14"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminBriefcase({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.25 14.15v4.25c0 1.242-.98 2.25-2.188 2.25H5.938c-1.208 0-2.188-1.008-2.188-2.25v-4.25M3.75 8.25A2.25 2.25 0 016 6h12a2.25 2.25 0 012.25 2.25V12a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 12V8.25zM12 12.75h.008v.008H12v-.008zM16.5 6V4.875c0-.621-.504-1.125-1.125-1.125h-6.75c-.621 0-1.125.504-1.125 1.125V6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminRefresh({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Contratos / periodos (documento + marca de tiempo). */
export function IconAdminContract({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12h6M9 16h6M9 8h2M6.75 3.75h6.75a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0113.5 20.25H6.75A2.25 2.25 0 014.5 18V6a2.25 2.25 0 012.25-2.25zM18.75 9v6.75"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.75 9a3 3 0 11-3-3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminClipboard({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.903 2.903 0 00-.106-.774m-5.39-.468c-.066-.017-.133-.025-.2-.025h-3.75c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0021 18v-7.5c0-.621-.504-1.125-1.125-1.125h-3.75c-.067 0-.134.008-.2.025m.2 0c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25h-1.5m-6-6h3.75m-3.75 3h3.75m-3.75 3h3.75"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ver ampliado / expandir vista (comprobante, etc.). */
export function IconAdminArrowsPointingOut({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m0 6l3.75 3.75m0 0h-4.5m4.5 0v-4.5m0 4.5L15 15M9 9l-3.75 3.75m0 0v-4.5m0 4.5h4.5m-4.5 0L9 15"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bloqueos de disponibilidad (calendario / fechas no reservables). */
export function IconAdminCalendarBlock({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 3.75v1.5M16.5 3.75v1.5M4.5 8.25h15M6 5.25h12a1.5 1.5 0 011.5 1.5v12.75a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 19.5V6.75A1.5 1.5 0 016 5.25zM9 12.75h6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Montaje / obra (proveedores autorizados en centro). */
export function IconAdminHardHat({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 3.75h3M9 6.75h6M4.5 9.75V18a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5V9.75M4.5 9.75L2.25 6h19.5L19.5 9.75M4.5 9.75h15"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAdminArrowDownTray({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Chevron abajo (disparadores compactos en tablas admin). */
export function IconAdminChevronDown({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Alerta suave (p. ej. requisito pendiente en una fila). */
export function IconAdminAlertSoft({ className = "" }) {
  return (
    <svg className={`${c} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v3.75M12 17.25h.008v.008H12V17.25zM10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h16.78a1.5 1.5 0 001.29-2.25L13.71 3.86a1.5 1.5 0 00-2.58 0z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
