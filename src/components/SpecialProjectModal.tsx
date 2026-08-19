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
import { createSpecialProject } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

interface SpecialProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  "#3D4FE8", // Ongo Indigo
  "#22C55E", // Green
  "#F5A524", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

export function SpecialProjectModal({ isOpen, onOpenChange }: SpecialProjectModalProps) {
  const queryClient = useQueryClient();
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

  const createFn = useServerFn(createSpecialProject);

  const mutation = useMutation({
    mutationFn: (data: any) => createFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      toast.success("Projeto especial criado com sucesso");
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      toast.error("Erro ao criar projeto");
      console.error(err);
    }
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
          <DialogTitle className="font-title">Novo Projeto Especial</DialogTitle>
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
                  className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-[#0E0E16]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={mutation.isPending} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90">
            {mutation.isPending ? "Criando..." : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
