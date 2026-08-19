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
}

export function NicheSelector({
  selectedId,
  options,
  onChange,
  onAddNiche,
  placeholder = "Selecionar nicho..."
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
          className="w-full justify-between bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] h-10 px-3 hover:bg-white"
        >
          <span className={cn(
            "font-normal",
            !selectedNiche && "text-[#8A8FA3]"
          )}>
            {selectedNiche ? selectedNiche.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl shadow-xl">
        <Command className="dark:bg-[#1A1A24]">
          <CommandInput
            placeholder="Buscar nicho..."
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty className="p-2">
              {!isExactMatch && inputValue.trim().length > 0 ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[#3D4FE8] hover:bg-[#3D4FE8]/5 gap-2 h-8 text-xs font-bold"
                  onClick={async () => {
                    await onAddNiche(inputValue);
                    setInputValue("");
                  }}
                >
                  <Plus className="h-3 w-3" /> Adicionar "{inputValue}"
                </Button>
              ) : (
                <span className="text-xs text-[#8A8FA3] px-2">Nenhum nicho encontrado</span>
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
                  className="cursor-pointer hover:bg-[#F7F8FC] dark:hover:bg-[#2A2A36] transition-colors"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-[#3D4FE8]",
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
