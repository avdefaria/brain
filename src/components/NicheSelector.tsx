import * as React from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Niche {
  id: string;
  name: string;
}

interface NicheSelectorProps {
  selectedId: string | null;
  options: Niche[];
  onChange: (id: string) => void;
  onAddNiche: (name: string) => Promise<void>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

export function NicheSelector({
  selectedId,
  options,
  onChange,
  onAddNiche,
  placeholder = "Selecionar nicho...",
  searchPlaceholder = "Buscar nicho...",
  emptyLabel = "Nenhum nicho encontrado"
}: NicheSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedNiche = options.find((opt) => opt.id === selectedId);

  const isExactMatch = options.some(
    (opt) => opt.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-[var(--surface-1)] border-[var(--line-1)] h-10 px-3 hover:bg-[var(--surface-3)]"
        >
          <span className={cn(
            "font-normal",
            !selectedNiche && "text-[var(--ink-3)]"
          )}>
            {selectedNiche ? selectedNiche.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[var(--line-1)] rounded-xl shadow-xl">
        <Command className="">
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty className="p-2">
              {!isExactMatch && inputValue.trim().length > 0 ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[var(--violet-500)] hover:bg-[var(--violet-500)]/5 gap-2 h-8 text-xs font-bold"
                  onClick={async () => {
                    await onAddNiche(inputValue);
                    setInputValue("");
                  }}
                >
                  <Plus className="h-3 w-3" /> Adicionar "{inputValue}"
                </Button>
              ) : (
                <span className="text-xs text-[var(--ink-3)] px-2">{emptyLabel}</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-[var(--violet-500)]",
                      selectedId === option.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
