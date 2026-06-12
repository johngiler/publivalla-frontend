const SPLIT_PAYMENT_TOOLTIP =
  "Pago por partes: el pedido se cobra en cuotas acordadas en la negociación.";

function IconSplitPaymentSchedule({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4.5V6M17 4.5V6M4.5 9h15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 6h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 12.5h2M14 12.5h2M8 15.5h2M14 15.5h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Indicador compacto de plan de pago por partes (tooltip al pasar el cursor).
 * @param {{ className?: string; compact?: boolean }} props
 */
export function SplitPaymentPill({ className = "", compact = false }) {
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const padClass = compact ? "p-0.5" : "p-1";
  return (
    <span
      className={`inline-flex shrink-0 cursor-help items-center justify-center rounded-full border border-violet-200/80 bg-violet-50 text-violet-700 ${padClass} ${className}`.trim()}
      title={SPLIT_PAYMENT_TOOLTIP}
      aria-label={SPLIT_PAYMENT_TOOLTIP}
      role="img"
    >
      <IconSplitPaymentSchedule className={iconClass} />
    </span>
  );
}
