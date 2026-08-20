import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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

interface Squad {
  id: string;
  name: string;
}

interface MultiSelectSquadsProps {
  selectedIds: string[];
  options: Squad[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function MultiSelectSquads({
  selectedIds,
  options,
  onChange,
  placeholder = "Selecionar squads...",
}: MultiSelectSquadsProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (squadId: string) => {
    onChange(selectedIds.filter((id) => id !== squadId));
  };

  const handleSelect = (squadId: string) => {
    if (selectedIds.includes(squadId)) {
      handleUnselect(squadId);
    } else {
      onChange([...selectedIds, squadId]);
    }
  };

  const selectedSquads = options.filter((opt) => selectedIds.includes(opt.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedSquads.length > 0 ? (
          selectedSquads.map((squad) => (
            <Badge
              key={squad.id}
              variant="secondary"
              className="bg-[#3D4FE8]/10 text-[#3D4FE8] hover:bg-[#3D4FE8]/20 border-none px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              {squad.name}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(squad.id);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(squad.id)}
              >
                <X className="h-3 w-3 text-[#3D4FE8] hover:text-red-500 transition-colors" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-[#8A8FA3]">Nenhum squad vinculado</span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white dark:bg-[#1A1A24] border-[#E4E6F0] dark:border-[#2A2A36] h-10 px-3 hover:bg-white"
          >
            <span className="text-[#8A8FA3] font-normal">
              {selectedIds.length > 0
                ? `${selectedIds.length} squad(s) selecionado(s)`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl shadow-xl">
          <Command className="dark:bg-[#1A1A24]">
            <CommandInput
              placeholder="Buscar squad..."
              value={inputValue}
              onValueChange={setInputValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty className="p-2">
                <span className="text-xs text-[#8A8FA3] px-2">Nenhum squad encontrado</span>
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => handleSelect(option.id)}
                    className="cursor-pointer hover:bg-[#F7F8FC] dark:hover:bg-[#2A2A36] transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-[#3D4FE8]",
                        selectedIds.includes(option.id)
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
    </div>
  );
}
