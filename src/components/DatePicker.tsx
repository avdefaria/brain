import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  /** "dropdown" troca as setas mês-a-mês por selects de mês/ano — melhor pra datas
   * distantes (ex.: data de nascimento) onde navegar clique a clique é impraticável. */
  captionLayout?: "label" | "dropdown";
}

// Data "pura" (sem hora) em texto YYYY-MM-DD, extraída/gerada sem passar por
// new Date().toISOString() — evita o fuso local rolar o dia pra trás/frente
// (mesmo cuidado usado em toda a parte de datas do app).
function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({ value, onChange, placeholder = "Selecionar data", className, captionLayout = "label" }: DatePickerProps) {
  const selected = parseDateOnly(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-left font-bold border-[var(--line-1)] bg-[var(--surface-1)] hover:bg-[var(--surface-3)]",
            !selected && "text-[var(--ink-3)] font-normal",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {selected ? selected.toLocaleDateString("pt-BR") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? toDateOnlyString(date) : null)}
          defaultMonth={selected}
          captionLayout={captionLayout}
          startMonth={captionLayout === "dropdown" ? new Date(1940, 0) : undefined}
          endMonth={captionLayout === "dropdown" ? new Date() : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
