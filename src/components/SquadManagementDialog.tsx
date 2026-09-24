import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCollaborators } from "@/lib/squads.functions";
import { createSquad, updateSquad } from "@/lib/projects.functions";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

const COLORS = [
  "var(--violet-500)", // Ongo Indigo
  "var(--success)", // Green
  "var(--warning)", // Amber
  "var(--danger)", // Red
  "var(--violet-500)", // Purple
  "var(--chart-2)", // Pink
  "var(--chart-4)", // Cyan
  "var(--chart-3)", // Orange
  "var(--ink-3)", // Slate
];

interface SquadManagementDialogProps {
  squad: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SquadManagementDialog({ squad, isOpen, onOpenChange }: SquadManagementDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState(COLORS[0]);
  const [leaderId, setLeaderId] = React.useState("");

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => getCollaborators(),
  });

  const createFn = useServerFn(createSquad);
  const updateFn = useServerFn(updateSquad);

  const mutation = useMutation({
    mutationFn: (data: any) => squad ? updateFn({ data }) : createFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      toast.success(squad ? "Squad atualizado com sucesso" : "Squad criado com sucesso");
      onOpenChange(false);
      if (!squad) resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.message || (squad ? "Erro ao atualizar squad" : "Erro ao criar squad"));
    }
  });

  const resetForm = () => {
    setName("");
    setSelectedColor(COLORS[0]);
    setLeaderId("");
  };

  React.useEffect(() => {
    if (squad) {
      setName(squad.name || "");
      setSelectedColor(squad.color || COLORS[0]);
      setLeaderId(squad.leader?.id || "");
    } else if (isOpen) {
      resetForm();
    }
  }, [squad, isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("O nome do squad é obrigatório");
      return;
    }
    const payload: any = {
      name,
      color: selectedColor,
      leader_id: leaderId || undefined
    };
    if (squad) payload.id = squad.id;
    
    mutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-title">{squad ? "Editar Squad" : "Novo Squad"}</DialogTitle>
          <DialogDescription>{squad ? "Altere os dados do squad" : "Crie um novo squad para a agência"}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Squad</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ex: Growth"
              className="rounded-lg"
            />
          </div>

          <div className="grid gap-2">
            <Label>Cor do Squad</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full transition-all border-2",
                    selectedColor === color ? "border-[var(--ink-1)] scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="leader">Líder do Squad</Label>
            <Select value={leaderId} onValueChange={setLeaderId}>
              <SelectTrigger id="leader" className="rounded-lg">
                <SelectValue placeholder="Selecione um líder" />
              </SelectTrigger>
              <SelectContent>
                {collaborators?.map((collab) => (
                  <SelectItem key={collab.id} value={collab.id}>
                    {collab.full_name} ({collab.function})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : squad ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
