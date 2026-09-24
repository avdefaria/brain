import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getJobFunctions, createJobFunction, type JobFunction } from "@/lib/users.functions";

interface MultiSelectJobFunctionsProps {
  selectedIds: string[];
  departmentIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

// Cargo é escopado por departamento (ex.: Marketing > Gestor de Tráfego) — a lista
// de opções (e a criação inline de cargo novo) só aparece depois de escolher o(s)
// departamento(s); com mais de um selecionado, mostra os cargos de todos eles juntos.
export function MultiSelectJobFunctions({ selectedIds, departmentIds, onChange, placeholder = "Selecionar cargos..." }: MultiSelectJobFunctionsProps) {
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

  const allList = (jobFunctions as JobFunction[]) || [];
  const departmentSet = new Set(departmentIds);
  const options = useMemo(
    () => allList.filter((jf) => jf.department_id && departmentSet.has(jf.department_id)),
    [allList, departmentIds],
  );

  const selected = allList.filter((jf) => selectedIds.includes(jf.id));

  // Se o departamento de um cargo já selecionado for removido, o cargo sai junto —
  // evita ficar com um cargo "órfão" de um departamento que não está mais marcado.
  useEffect(() => {
    if (allList.length === 0) return;
    const stillValid = selectedIds.filter((id) => {
      const jf = allList.find((j) => j.id === id);
      return jf?.department_id && departmentSet.has(jf.department_id);
    });
    if (stillValid.length !== selectedIds.length) onChange(stillValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentIds.join(","), allList.length]);

  const handleUnselect = (id: string) => onChange(selectedIds.filter((sid) => sid !== id));
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) handleUnselect(id);
    else onChange([...selectedIds, id]);
  };

  const trimmedSearch = search.trim();
  const alreadyExists = trimmedSearch.length === 0 || options.some((j) => j.name.toLowerCase() === trimmedSearch.toLowerCase());
  const canCreate = departmentIds.length === 1;

  const handleCreate = async () => {
    if (!canCreate || trimmedSearch.length === 0) return;
    setIsCreating(true);
    try {
      const created = (await createJobFunctionFn({ data: { name: trimmedSearch, departmentId: departmentIds[0]! } })) as JobFunction;
      queryClient.invalidateQueries({ queryKey: ["job-functions"] });
      onChange([...selectedIds, created.id]);
      setSearch("");
      toast.success("Cargo criado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cargo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selected.length > 0 ? (
          selected.map((jf) => (
            <Badge key={jf.id} variant="secondary" className="bg-[var(--violet-500)]/10 text-[var(--violet-500)] hover:bg-[var(--violet-500)]/20 border-none px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
              {jf.name}
              <button type="button" className="ml-1 rounded-full outline-none" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={() => handleUnselect(jf.id)}>
                <X className="h-3 w-3 text-[var(--violet-500)] hover:text-[var(--danger)] transition-colors" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-sm text-[var(--ink-3)]">Nenhum cargo selecionado</span>
        )}
      </div>

      {departmentIds.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">Selecione um departamento pra ver os cargos disponíveis.</p>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-[var(--surface-1)] border-[var(--line-1)] h-10 px-3 hover:bg-[var(--surface-3)]">
              <span className="text-[var(--ink-3)] font-normal">{placeholder}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[var(--line-1)] rounded-xl shadow-xl">
            <Command>
              <CommandInput placeholder="Buscar cargo..." value={search} onValueChange={setSearch} className="h-9" />
              <CommandList>
                <CommandEmpty className="p-2"><span className="text-xs text-[var(--ink-3)] px-2">Nenhum cargo encontrado</span></CommandEmpty>
                <CommandGroup>
                  {options.map((jf) => (
                    <CommandItem key={jf.id} value={jf.name} onSelect={() => handleSelect(jf.id)} className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
                      <Check className={cn("mr-2 h-4 w-4 text-[var(--violet-500)]", selectedIds.includes(jf.id) ? "opacity-100" : "opacity-0")} />
                      {jf.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {trimmedSearch.length > 0 && !alreadyExists && canCreate ? (
                  <CommandGroup className="border-t border-[var(--line-1)]">
                    <CommandItem value={`__create__${trimmedSearch}`} onSelect={handleCreate} disabled={isCreating} className="text-[var(--violet-500)] font-medium">
                      <Plus className="mr-2 h-4 w-4" />
                      {isCreating ? "Criando..." : `+ Criar '${trimmedSearch}'`}
                    </CommandItem>
                  </CommandGroup>
                ) : trimmedSearch.length > 0 && !alreadyExists ? (
                  <p className="px-3 py-2 text-[11px] text-[var(--ink-3)] border-t border-[var(--line-1)]">Selecione só 1 departamento pra criar um cargo novo.</p>
                ) : (
                  <span className="hidden" />
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
