import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getJobFunctions,
  createJobFunction,
  type JobFunction,
} from "@/lib/users.functions";

interface JobFunctionComboboxProps {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function JobFunctionCombobox({
  value,
  onChange,
  placeholder,
}: JobFunctionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const fetchJobFunctions = useServerFn(getJobFunctions);
  const createJobFunctionFn = useServerFn(createJobFunction);

  const { data: jobFunctions } = useQuery({
    queryKey: ["job-functions"],
    queryFn: () => fetchJobFunctions(),
  });

  const list = useMemo(() => {
    if (jobFunctions) {
      return jobFunctions as JobFunction[];
    } else {
      return [] as JobFunction[];
    }
  }, [jobFunctions]);

  const selected = useMemo(() => {
    if (!value) {
      return null;
    } else {
      const found = list.find((j) => j.id === value);
      if (found) {
        return found;
      } else {
        return null;
      }
    }
  }, [list, value]);

  const trimmedSearch = search.trim();
  const alreadyExists = useMemo(() => {
    if (trimmedSearch.length === 0) {
      return true;
    } else {
      return list.some(
        (j) => j.name.toLowerCase() === trimmedSearch.toLowerCase(),
      );
    }
  }, [list, trimmedSearch]);

  const handleCreate = async () => {
    if (trimmedSearch.length === 0) {
      toast.error("Informe o nome do cargo");
    } else {
      if (alreadyExists) {
        const existing = list.find(
          (j) => j.name.toLowerCase() === trimmedSearch.toLowerCase(),
        );
        if (existing) {
          onChange(existing.id);
          setOpen(false);
          setSearch("");
        } else {
          toast.error("Este cargo já existe.");
        }
      } else {
        setIsCreating(true);
        try {
          const created = (await createJobFunctionFn({
            data: trimmedSearch,
          })) as JobFunction;
          queryClient.setQueryData<JobFunction[]>(["job-functions"], (prev) => {
            const next = [...(prev ?? []), created].sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            return next;
          });
          queryClient.invalidateQueries({ queryKey: ["job-functions"] });
          onChange(created.id);
          setOpen(false);
          setSearch("");
          toast.success("Cargo criado!");
        } catch (err) {
          if (err instanceof Error) {
            toast.error(err.message);
          } else {
            toast.error("Erro ao criar cargo");
          }
        } finally {
          setIsCreating(false);
        }
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between border-[#E4E6F0] rounded-xl h-11 font-normal"
        >
          <span className="truncate">
            {selected ? selected.name : (placeholder ?? "Selecione...")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Pesquisar cargo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
            <CommandGroup>
              {list.map((j) => (
                <CommandItem
                  key={j.id}
                  value={j.name}
                  onSelect={() => {
                    onChange(j.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === j.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {j.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {trimmedSearch.length > 0 && !alreadyExists ? (
              <CommandGroup className="border-t border-[#E4E6F0]">
                <CommandItem
                  value={`__create__${trimmedSearch}`}
                  onSelect={handleCreate}
                  disabled={isCreating}
                  className="text-[#3D4FE8] font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating
                    ? "Criando..."
                    : `+ Criar '${trimmedSearch}'`}
                </CommandItem>
              </CommandGroup>
            ) : (
              <span className="hidden" />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
