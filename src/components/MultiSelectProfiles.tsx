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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface MultiSelectProfilesProps {
  selectedIds: string[];
  options: Profile[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export function MultiSelectProfiles({
  selectedIds,
  options,
  onChange,
  placeholder = "Selecionar responsáveis...",
}: MultiSelectProfilesProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (id: string) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      handleUnselect(id);
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedProfiles = options.filter((opt) => selectedIds.includes(opt.id));
  const filteredOptions = options.filter((opt) =>
    opt.full_name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedProfiles.length > 0 ? (
          selectedProfiles.map((profile) => (
            <Badge
              key={profile.id}
              variant="secondary"
              className="bg-[#3D4FE8]/10 text-[#3D4FE8] hover:bg-[#3D4FE8]/20 border-none px-2 py-0.5 rounded-full flex items-center gap-2 transition-colors"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-[6px] bg-[#3D4FE8] text-white">
                  {profile.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-bold">{profile.full_name}</span>
              <button
                type="button"
                className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUnselect(profile.id);
                }}
              >
                <X className="h-3 w-3 text-[#3D4FE8] hover:text-red-500 transition-colors" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-[#8A8FA3]">Nenhum responsável</span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white border-[#E4E6F0] h-9 px-3 hover:bg-white text-xs"
          >
            <span className="text-[#8A8FA3] font-normal truncate">
              {selectedIds.length > 0
                ? `${selectedIds.length} selecionado(s)`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[#E4E6F0] rounded-xl shadow-xl z-[60]">
          <Command>
            <CommandInput
              placeholder="Buscar colaborador..."
              value={inputValue}
              onValueChange={setInputValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty className="p-2 text-xs text-[#8A8FA3]">
                Nenhum colaborador encontrado.
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((profile) => (
                  <CommandItem
                    key={profile.id}
                    value={profile.full_name}
                    onSelect={() => handleSelect(profile.id)}
                    className="cursor-pointer hover:bg-[#F7F8FC] transition-colors py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-[#3D4FE8]",
                        selectedIds.includes(profile.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-[8px] bg-[#3D4FE8] text-white">
                        {profile.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{profile.full_name}</span>
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
