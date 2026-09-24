import { createFileRoute } from "@tanstack/react-router";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { TaskTimelineView } from "@/components/TaskTimelineView";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Calendar,
  MessageSquare,
  Play,
  Check,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, updateTasksBatch, getTaskStages, createTaskStage, deleteTaskStage, getProfiles } from "@/lib/tasks.functions";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, Trash2, Gauge, ChevronsUpDown } from "lucide-react";
import { computeTaskEfficiency, efficiencyBand, formatTrackedTime, formatElapsedDays } from "@/lib/efficiency";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/projects/tasks")({
  component: TasksPage,
});

// Compara a data de prazo (calendário, sem hora) com "hoje" no fuso de
// Brasília. O prazo é uma data "pura" escolhida pelo usuário e armazenada
// como meia-noite UTC do dia escolhido — reconverter isso pelo fuso de
// Brasília (UTC-3) jogaria pro dia anterior, então extraímos o Y-M-D direto
// da string em vez de reinterpretar via Date/timezone (mesmo cuidado do
// formatCalendarDatePtBr em src/lib/utils.ts).
function getDeadlineStatus(rawDeadline: string | null | undefined, isDoneStage: boolean) {
  if (!rawDeadline || isDoneStage) return null;

  const [depYear, depMonth, depDay] = rawDeadline.slice(0, 10).split('-').map(Number);
  const deadline = new Date(depYear, depMonth - 1, depDay);

  const nowParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date()).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
  const today = new Date(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day));

  const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { key: "atrasado", label: "Atrasado", className: "bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger)]/30" };
  if (diffDays === 0) return { key: "vence_hoje", label: "Vence hoje", className: "bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30" };
  if (diffDays === 1) return { key: "vence_amanha", label: "Vence amanhã", className: "bg-[var(--warning-tint)]/60 text-[var(--warning)] border-[var(--warning-tint)]" };
  return { key: "no_prazo", label: "No prazo", className: "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success)]/30" };
}

const EFFICIENCY_BAND_CLASS: Record<string, string> = {
  critico: "bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger)]/30",
  atencao: "bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning)]/30",
  ok: "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success)]/30",
};

// Tempo trabalhado (cronômetro) vs tempo corrido desde o início da tarefa —
// só aparece quando já passou pelo menos meio dia, pra não poluir tarefa recém-criada.
function TaskEfficiencyBadge({ task }: { task: any }) {
  const eff = computeTaskEfficiency({
    startDate: task.raw_start_date,
    createdAt: task.created_at,
    isDone: task.is_done,
    completedAtMs: task.completed_at_ms,
    timeTrackedSeconds: task.total_time_with_subtasks ?? task.time_tracked_seconds,
  });
  if (eff.elapsedDays < 0.5) return null;
  const band = efficiencyBand(eff.ratioPct);
  return (
    <div
      className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", band ? EFFICIENCY_BAND_CLASS[band] : "bg-[var(--surface-2)] text-[var(--ink-3)] border-transparent")}
      title="Tempo trabalhado (cronômetro) vs tempo corrido desde o início"
    >
      <Gauge className="h-3 w-3" />
      {formatTrackedTime(eff.trackedSeconds)} / {formatElapsedDays(eff.elapsedDays)}
    </div>
  );
}

// Stable reference so useQuery's default doesn't create a new array every
// render (that would retrigger the `[tasks]` effect below in an infinite loop
// whenever the query has no data yet, e.g. while loading or erroring).
const EMPTY_TASKS: any[] = [];

// Fallback usado só enquanto task_stages ainda não carregou (evita layout
// vazio no primeiro render). O board real é sempre data-driven.
const FALLBACK_COLUMNS = [
  { id: "todo", name: "A Fazer", color: "var(--ink-3)", position: 0, is_done_stage: false },
  { id: "doing", name: "Fazendo", color: "var(--violet-500)", position: 1, is_done_stage: false },
  { id: "review", name: "Aprovação interna", color: "var(--warning)", position: 2, is_done_stage: false },
  { id: "done", name: "Concluído", color: "var(--success)", position: 3, is_done_stage: true },
];

function TasksPage() {
  const queryClient = useQueryClient();
  const fetchTasks = useServerFn(getTasks);
  const updateTasks = useServerFn(updateTasksBatch);

  const { data: tasks = EMPTY_TASKS, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
    refetchInterval: 5000, // Real-time feel
  });

  const fetchTaskStages = useServerFn(getTaskStages);
  const createTaskStageFn = useServerFn(createTaskStage);
  const deleteTaskStageFn = useServerFn(deleteTaskStage);
  const { data: stages = FALLBACK_COLUMNS } = useQuery({
    queryKey: ["task-stages"],
    queryFn: () => fetchTaskStages(),
  });

  const fetchClients = useServerFn(getClientsWithChannels);
  const { data: clientOptions = [] } = useQuery({ queryKey: ["clients-for-tasks"], queryFn: () => fetchClients() });
  const fetchProfiles = useServerFn(getProfiles);
  const { data: profileOptions = [] } = useQuery({ queryKey: ["profiles"], queryFn: () => fetchProfiles() });

  const [localTasks, setLocalTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newStageName, setNewStageName] = useState("");
  const [addingStage, setAddingStage] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [filterResponsibleId, setFilterResponsibleId] = useState<string>("all");
  const [filterDeadline, setFilterDeadline] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (tasks) {
      setLocalTasks(tasks);
    }
  }, [tasks]);

  // Abre direto a tarefa quando chega por um link com ?taskId= (ex: vindo de
  // uma notificação) — some da URL depois pra não reabrir num refresh.
  useEffect(() => {
    if (!tasks) return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    if (!taskId) return;
    const found = (tasks as any[]).find((t) => t.id === taskId);
    if (found) {
      setSelectedTask(found);
      params.delete("taskId");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  }, [tasks]);

  // Opções de conta disponíveis pro filtro: só as que aparecem entre as
  // tarefas do cliente selecionado (evita listar contas sem nenhuma tarefa).
  const accountFilterOptions = Array.from(
    new Map(
      localTasks
        .filter((t: any) => (filterClientId === "all" || t.client_id === filterClientId) && t.account_id && t.account)
        .map((t: any) => [t.account_id, t.account])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  useEffect(() => {
    setFilterAccountId("all");
  }, [filterClientId]);

  const filteredTasks = localTasks.filter((t: any) => {
    if (searchQuery.trim() && !t.title?.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    if (filterScope === "internal" && !t.is_internal) return false;
    if (filterScope === "external" && t.is_internal) return false;
    if (filterClientId !== "all" && t.client_id !== filterClientId) return false;
    if (filterAccountId !== "all" && t.account_id !== filterAccountId) return false;
    if (filterResponsibleId !== "all" && !(t.assignees || []).some((a: any) => a.id === filterResponsibleId)) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterDeadline !== "all") {
      const isDone = stages.find((s: any) => s.id === t.stage)?.is_done_stage || false;
      const status = getDeadlineStatus(t.raw_deadline, isDone);
      if (status?.key !== filterDeadline) return false;
    }
    return true;
  });

  const activeFilterCount = [
    filterScope !== "all",
    filterClientId !== "all",
    filterAccountId !== "all",
    filterResponsibleId !== "all",
    filterDeadline !== "all",
    filterPriority !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery("");
    setFilterScope("all");
    setFilterClientId("all");
    setFilterAccountId("all");
    setFilterResponsibleId("all");
    setFilterDeadline("all");
    setFilterPriority("all");
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;
    try {
      await createTaskStageFn({ data: { name: newStageName.trim() } });
      setNewStageName("");
      setAddingStage(false);
      queryClient.invalidateQueries({ queryKey: ["task-stages"] });
      toast.success("Status criado");
    } catch (error) {
      toast.error("Erro ao criar status");
    }
  };

  const [stageToDelete, setStageToDelete] = useState<any>(null);

  const confirmDeleteStage = async () => {
    if (!stageToDelete) return;
    try {
      await deleteTaskStageFn({ data: stageToDelete.id });
      queryClient.invalidateQueries({ queryKey: ["task-stages"] });
      toast.success("Status excluído");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao excluir status");
    } finally {
      setStageToDelete(null);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Reorder local state immediately
    const updatedTasks = Array.from(localTasks);
    
    // Find the task being moved
    const taskIndex = updatedTasks.findIndex(t => t.id === draggableId);
    if (taskIndex === -1) return;
    
    const task = { ...updatedTasks[taskIndex], stage: destination.droppableId };
    
    // Remove from old position
    updatedTasks.splice(taskIndex, 1);
    
    // Insert into new position in the target column
    const columnTasks = updatedTasks.filter(t => t.stage === destination.droppableId);
    const otherTasks = updatedTasks.filter(t => t.stage !== destination.droppableId);
    
    columnTasks.splice(destination.index, 0, task);
    
    // Re-calculate positions for the target column
    const reorderedColumn = columnTasks.map((t, idx) => ({ ...t, position: idx }));
    
    const finalTasks = [...otherTasks, ...reorderedColumn];
    setLocalTasks(finalTasks);

    try {
      await updateTasks({
        data: reorderedColumn.map(t => ({
          id: t.id,
          position: t.position,
          stage: t.stage
        }))
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      toast.error("Erro ao salvar ordem das tarefas");
      setLocalTasks(tasks); // Rollback
    }
  };

  const kpis = [
    { 
      label: "Tarefas", 
      value: `${tasks.filter((t: any) => t.stage === 'done').length}/${tasks.length}`, 
      icon: CheckCircle2, 
      color: "text-[var(--violet-500)]" 
    },
    { 
      label: "Em progresso", 
      value: tasks.filter((t: any) => t.stage === 'doing').length.toString(), 
      icon: Play, 
      color: "text-[var(--warning)]" 
    },
    { 
      label: "Em atraso", 
      value: tasks.filter((t: any) => {
        if (t.stage === 'done' || !t.raw_deadline) return false;
        return new Date(t.raw_deadline) < new Date();
      }).length.toString(), 
      icon: AlertCircle, 
      color: "text-[var(--danger)]" 
    },
    { 
      label: "Entregues no mês", 
      value: tasks.filter((t: any) => {
        if (t.stage !== 'done') return false;
        // Approximation using deadline as completion date is missing
        if (!t.raw_deadline) return false;
        const deadline = new Date(t.raw_deadline);
        const now = new Date();
        return deadline.getMonth() === now.getMonth() && deadline.getFullYear() === now.getFullYear();
      }).length.toString(), 
      icon: Check, 
      color: "text-[var(--success)]" 
    },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Tarefas</h1>
          <p className="text-sm text-[var(--ink-3)]">Gestão do fluxo de trabalho e prioridades</p>
        </div>
        <div className="flex gap-3">
          <div className="flex border border-[var(--line-1)] rounded-full p-1 bg-[var(--surface-1)]">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "kanban" && "bg-[var(--surface-2)] text-[var(--violet-500)]")}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "list" && "bg-[var(--surface-2)] text-[var(--violet-500)]")}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 gap-2 font-bold"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Criar Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-[var(--line-1)] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("h-10 w-10 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl flex items-center justify-center shadow-sm", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest">{kpi.label}</p>
                <h3 className="text-xl font-bold text-[var(--ink-1)] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between bg-[var(--surface-1)] p-4 rounded-2xl border border-[var(--line-1)] shadow-sm flex-wrap gap-3">
        <div className="flex gap-3 flex-1 flex-wrap items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
            <Input
              placeholder="Buscar tarefa..."
              className="pl-10 border-[var(--line-1)] rounded-full bg-[var(--surface-2)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterScope} onValueChange={setFilterScope}>
            <SelectTrigger className="w-[140px] h-9 rounded-full border-[var(--line-1)] text-xs font-bold text-[var(--ink-3)]">
              <SelectValue placeholder="Interno/Externo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Interno e Externo</SelectItem>
              <SelectItem value="external">Externo</SelectItem>
              <SelectItem value="internal">Interno</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openClientCombo}
                className="w-[160px] h-9 justify-between rounded-full border-[var(--line-1)] text-xs font-bold text-[var(--ink-3)]"
              >
                <span className="truncate">
                  {filterClientId === "all" ? "Todos os clientes" : clientOptions.find((c: any) => c.id === filterClientId)?.name}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 border-[var(--line-1)] rounded-xl overflow-hidden" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => { setFilterClientId("all"); setOpenClientCombo(false); }}
                      className="text-xs cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", filterClientId === "all" ? "opacity-100" : "opacity-0")} />
                      Todos os clientes
                    </CommandItem>
                    {clientOptions.map((c: any) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => { setFilterClientId(c.id); setOpenClientCombo(false); }}
                        className="text-xs cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", filterClientId === c.id ? "opacity-100" : "opacity-0")} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {accountFilterOptions.length > 0 && (
            <Select value={filterAccountId} onValueChange={setFilterAccountId}>
              <SelectTrigger className="w-[160px] h-9 rounded-full border-[var(--line-1)] text-xs font-bold text-[var(--ink-3)]">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accountFilterOptions.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterResponsibleId} onValueChange={setFilterResponsibleId}>
            <SelectTrigger className="w-[170px] h-9 rounded-full border-[var(--line-1)] text-xs font-bold text-[var(--ink-3)]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {profileOptions.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDeadline} onValueChange={setFilterDeadline}>
            <SelectTrigger className="w-[150px] h-9 rounded-full border-[var(--line-1)] text-xs font-bold text-[var(--ink-3)]">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer prazo</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="vence_hoje">Vence hoje</SelectItem>
              <SelectItem value="vence_amanha">Vence amanhã</SelectItem>
              <SelectItem value="no_prazo">No prazo</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-[var(--danger)] hover:bg-[var(--danger-tint)]" onClick={resetFilters} title="Limpar filtros">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("rounded-full border-[var(--line-1)] gap-2 font-bold", filterPriority !== "all" ? "text-[var(--violet-500)] border-[var(--violet-500)]/40" : "text-[var(--violet-500)]")}>
              <Filter className="h-4 w-4" /> Filtros Avançados
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="end">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest">Prioridade</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-9 border-[var(--line-1)] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeFilterCount > 0 && (
        <p className="text-xs text-[var(--ink-3)] -mt-4">
          Mostrando {filteredTasks.length} de {localTasks.length} tarefas
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-[var(--violet-500)] animate-spin" />
        </div>
      ) : viewMode === "list" ? (
        <TaskTimelineView tasks={filteredTasks} stages={stages} onSelectTask={setSelectedTask} />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {stages.map((col: any) => (
            <div key={col.id} className="flex-1 min-w-[280px]">
              <div className="flex items-center justify-between mb-4 px-2 group/col">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-title font-bold text-[var(--ink-1)]">{col.name}</h3>
                  <span className="text-xs font-bold text-[var(--ink-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--line-1)]">
                    {filteredTasks.filter((t: any) => t.stage === col.id).length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--danger)] rounded-full border border-transparent hover:border-[var(--line-1)] hover:bg-[var(--surface-3)] opacity-0 group-hover/col:opacity-100 transition-opacity"
                  onClick={() => setStageToDelete(col)}
                  title="Excluir status"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4 min-h-[500px]"
                  >
                    {filteredTasks.filter((t: any) => t.stage === col.id).sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((task: any, index: number) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="border-[var(--line-1)] shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                            onClick={() => setSelectedTask(task)}
                          >
                            <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-start">
                                <Badge className={cn(
                                  "text-[8px] uppercase font-bold border-none rounded-full px-2 py-0",
                                  task.priority === 'high' ? 'bg-[var(--danger-tint)] text-[var(--danger)]' : 
                                  task.priority === 'medium' ? 'bg-[var(--warning-tint)] text-[var(--warning)]' : 
                                  'bg-[var(--success-tint)] text-[var(--success)]'
                                )}>
                                  {task.priority}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--ink-3)] opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-bold text-[var(--ink-1)] leading-tight mb-1">{task.title}</h4>
                                {task.is_internal ? (
                                  <p className="text-[10px] text-[var(--violet-300)] flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-300)]" /> Interno{task.internal_target ? ` · ${task.internal_target}` : ""}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-[var(--ink-3)] flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-500)]" /> {task.client}{task.account ? ` · ${task.account}` : ""}
                                  </p>
                                )}
                                {task.parent_task_title && (
                                  <p className="text-[9px] text-[var(--ink-3)] italic mt-1">
                                    ↳ Subtarefa de: {task.parent_task_title}
                                  </p>
                                )}
                                {task.subtask_count > 0 && (
                                  <p className="text-[9px] text-[var(--violet-500)] font-bold mt-1">
                                    {task.subtask_count} {task.subtask_count === 1 ? "subtarefa" : "subtarefas"}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-2)] gap-2">
                                <div className="flex -space-x-2 shrink-0">
                                  {task.assignees.map((a: any, i: number) => (
                                    <div key={i} className="h-6 w-6 rounded-full border-2 border-[var(--surface-1)] bg-[var(--violet-500)] overflow-hidden flex items-center justify-center text-[8px] text-white font-bold">
                                      {a.avatar_url ? (
                                        <img src={a.avatar_url} alt={a.name} className="w-full h-full object-cover" />
                                      ) : (
                                        a.initials
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  {task.comments?.length > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--ink-3)]">
                                      <MessageSquare className="h-3 w-3" /> {task.comments.length}
                                    </div>
                                  )}
                                  <TaskEfficiencyBadge task={task} />
                                  {(() => {
                                    const status = getDeadlineStatus(task.raw_deadline, col.is_done_stage);
                                    return (
                                      <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                        status ? status.className : "bg-[var(--surface-2)] text-[var(--ink-3)] border-transparent"
                                      )}>
                                        <Calendar className="h-3 w-3" />
                                        {status ? `${status.label} · ${task.deadline}` : task.deadline}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          <div className="min-w-[220px] pt-1">
            {addingStage ? (
              <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-xl p-2">
                <Input
                  autoFocus
                  placeholder="Nome do status..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateStage();
                    if (e.key === "Escape") { setAddingStage(false); setNewStageName(""); }
                  }}
                  className="h-8 text-sm border-none focus-visible:ring-0 px-1"
                />
                <Button size="icon" className="h-8 w-8 shrink-0 rounded-full bg-[var(--violet-500)]" onClick={handleCreateStage}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => { setAddingStage(false); setNewStageName(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-[var(--ink-3)] hover:text-[var(--violet-500)] rounded-xl border border-dashed border-[var(--line-1)] h-10"
                onClick={() => setAddingStage(true)}
              >
                <Plus className="h-4 w-4" /> Novo status
              </Button>
            )}
          </div>
        </div>
        </DragDropContext>
      )}

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />

      <TaskDetailPanel
        task={tasks.find((t: any) => t.id === selectedTask?.id) || selectedTask}
        isOpen={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />

      <AlertDialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o status <strong>{stageToDelete?.name}</strong>? Só é possível se não houver tarefas nele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStage} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}