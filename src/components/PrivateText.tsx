import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";

// Texto que fica embaçado quando o "modo gravação" está ligado.
export function PrivateText({ children, className }: { children: ReactNode; className?: string }) {
  const { hidden } = usePrivacyMode();
  return (
    <span className={cn(hidden && "select-none blur-[9px]", className)} aria-hidden={hidden || undefined}>
      {children}
    </span>
  );
}

// Botão de olho que liga/desliga o embaçado dos nomes.
export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacyMode();
  const Icon = hidden ? EyeOff : Eye;
  const label = hidden ? "Mostrar nomes dos clientes" : "Ocultar nomes dos clientes";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={hidden}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
        hidden
          ? "border-[var(--violet-500)] bg-[var(--violet-tint-16)] text-[var(--violet-300)]"
          : "border-[var(--line-1)] bg-[var(--surface-1)] text-[var(--ink-3)] hover:text-[var(--ink-1)]",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
