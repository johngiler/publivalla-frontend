"use client";

const STEPS = [
  { id: "datos", label: "Datos" },
  { id: "informacion-adicional", label: "Información adicional" },
  { id: "confirmar", label: "Confirmar" },
];

/**
 * @param {{ step: string }} props
 */
export function CheckoutStepper({ step }) {
  const idx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mt-8 border-b border-zinc-200">
      <div className="flex gap-8 sm:gap-12">
        {STEPS.map((s, i) => {
          const active = i === idx;
          return (
            <span
              key={s.id}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                active ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {s.label}
              {active ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[color:var(--mp-primary)]"
                  aria-hidden
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
