import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTask, updateTaskAssignees } from "@/lib/tasks.functions";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { useAuth } from "@/hooks/use-auth";

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modal enxuto pra criar uma tarefa pessoal direto do painel — diferente do
// CreateTaskModal completo do Kanban (etapa/entregável/subtarefa/descrição),
// aqui é só o essencial e a tarefa já sai atribuída a quem criou.
export function QuickAddTaskModal({ isOpen, onOpenChange }: QuickAddTaskModalProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const fetchClients = useServerFn(getClientsWithChannels);
  const createTaskFn = useServerFn(createTask);
  const updateAssigneesFn = useServerFn(updateTaskAssignees);

  const [clients, setClients] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients().then(setClients);
    } else {
      setTitle("");
      setIsInternal(true);
      setClientId(null);
      setPriority("medium");
      setDeadline(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (!isInternal && !clientId) {
      setError("Selecione o cliente ou marque como interna");
      return;
    }
    if (!session?.user?.id) return;

    setSubmitting(true);
    try {
      const newTask = await createTaskFn({
        data: {
          title: title.trim(),
          client_id: isInternal ? null : clientId,
          is_internal: isInternal,
          stage: "todo",
          priority,
          deadline: deadline || null,
        },
      });
      await updateAssigneesFn({ data: { taskId: newTask.id, userIds: [session.user.id] } });
      toast.success("Tarefa criada");
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao criar tarefa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-[var(--line-1)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Nova tarefa pessoal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-[var(--ink-3)]">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Criar planilha de indicadores do cliente X"
              className="border-[var(--line-1)] rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--line-1)] bg-[var(--surface-2)] px-3 py-2.5">
            <Checkbox
              id="qat-internal"
              checked={isInternal}
              onCheckedChange={(checked) => { setIsInternal(!!checked); if (checked) setClientId(null); }}
            />
            <Label htmlFor="qat-internal" className="text-sm text-[var(--ink-1)] cursor-pointer">
              Minhas Tarefas
            </Label>
          </div>

          {!isInternal && (
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Cliente</Label>
              <Select value={clientId || undefined} onValueChange={setClientId}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Prazo</Label>
              <DatePicker value={deadline} onChange={setDeadline} className="rounded-xl" />
            </div>
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-[var(--ink-3)]">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 font-bold px-6">
            {submitting ? "Criando..." : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
