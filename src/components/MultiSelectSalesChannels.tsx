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

interface SalesChannel {
  id: string;
  name: string;
}

interface MultiSelectSalesChannelsProps {
  selected: string[];
  options: SalesChannel[];
  onChange: (selected: string[]) => void;
  onAddChannel: (name: string) => Promise<void>;
}

export function MultiSelectSalesChannels({
  selected,
  options,
  onChange,
  onAddChannel,
}: MultiSelectSalesChannelsProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (channelName: string) => {
    onChange(selected.filter((s) => s !== channelName));
  };

  const handleSelect = (channelName: string) => {
    if (selected.includes(channelName)) {
      handleUnselect(channelName);
    } else {
      onChange([...selected, channelName]);
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isExactMatch = options.some(
    (opt) => opt.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selected.length > 0 ? (
          selected.map((channel) => (
            <Badge
              key={channel}
              variant="secondary"
              className="bg-[var(--violet-500)]/10 text-[var(--violet-500)] hover:bg-[var(--violet-500)]/20 border-none px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              {channel}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(channel);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(channel)}
              >
                <X className="h-3 w-3 text-[var(--violet-500)] hover:text-[var(--danger)] transition-colors" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-[var(--ink-3)]">Nenhum canal selecionado</span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-[var(--surface-1)] border-[var(--line-1)] h-10 px-3 hover:bg-[var(--surface-3)]"
          >
            <span className="text-[var(--ink-3)] font-normal">
              {selected.length > 0
                ? `${selected.length} selecionado(s)`
                : "Selecionar canais..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[var(--line-1)] rounded-xl shadow-xl">
          <Command className="">
            <CommandInput
              placeholder="Buscar canal..."
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
                      await onAddChannel(inputValue);
                      setInputValue("");
                    }}
                  >
                    <Plus className="h-3 w-3" /> Adicionar "{inputValue}"
                  </Button>
                ) : (
                  <span className="text-xs text-[var(--ink-3)] px-2">Nenhum canal encontrado</span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => handleSelect(option.name)}
                    className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-[var(--violet-500)]",
                        selected.includes(option.name)
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
