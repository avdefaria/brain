import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSquads, getCollaborators } from "@/lib/squads.functions";
import { createSpecialProject, updateSpecialProject, deleteSpecialProject } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

interface SpecialProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o modal abre em modo edição já preenchido com esse projeto. */
  project?: {
    id: string;
    name: string;
    client_id: string;
    squad_id: string | null;
    start_date: string;
    end_date: string;
    description: string | null;
    color: string | null;
  } | null;
}

const COLORS = [
  "var(--violet-500)", // Ongo Indigo
  "var(--success)", // Green
  "var(--warning)", // Amber
  "var(--danger)", // Red
  "var(--violet-700)", // Purple
  "var(--chart-2)", // Pink
  "var(--chart-4)", // Cyan
];

export function SpecialProjectModal({ isOpen, onOpenChange, project }: SpecialProjectModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!project;
  const [name, setName] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [squadId, setSquadId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: squads } = useQuery({
    queryKey: ["squads"],
    queryFn: () => getSquads()
  });

  const resetForm = () => {
    setName("");
    setClientId("");
    setSquadId("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setColor(COLORS[0]);
  };

  React.useEffect(() => {
    if (!isOpen) return;
    if (project) {
      setName(project.name);
      setClientId(project.client_id);
      setSquadId(project.squad_id || "");
      setStartDate(project.start_date.slice(0, 10));
      setEndDate(project.end_date.slice(0, 10));
      setDescription(project.description || "");
      setColor(project.color || COLORS[0]);
    } else {
      resetForm();
    }
  }, [isOpen, project]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
  };

  const createFn = useServerFn(createSpecialProject);
  const updateFn = useServerFn(updateSpecialProject);
  const deleteFn = useServerFn(deleteSpecialProject);

  const mutation = useMutation({
    mutationFn: (data: any) => (isEditing ? updateFn({ data: { ...data, id: project!.id } }) : createFn({ data })),
    onSuccess: () => {
      invalidateAll();
      toast.success(isEditing ? "Projeto especial atualizado" : "Projeto especial criado com sucesso");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(isEditing ? "Erro ao atualizar projeto" : "Erro ao criar projeto");
      console.error(err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { id: project!.id } }),
    onSuccess: () => {
      invalidateAll();
      toast.success("Projeto especial excluído");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Erro ao excluir projeto");
      console.error(err);
    }
  });

  const handleSave = () => {
    if (!name || !clientId || !startDate || !endDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    mutation.mutate({
      name,
      client_id: clientId,
      squad_id: squadId || undefined,
      start_date: startDate,
      end_date: endDate,
      description,
      color
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-title">{isEditing ? "Editar Projeto Especial" : "Novo Projeto Especial"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome do projeto *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Black Friday 2026" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Squad Responsável</Label>
              <Select value={squadId} onValueChange={setSquadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {squads?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Início *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Término *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do projeto..." />
          </div>

          <div className="grid gap-2">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-[var(--ink-1)]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className={isEditing ? "sm:justify-between" : undefined}>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)]"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={mutation.isPending} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90">
              {mutation.isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
