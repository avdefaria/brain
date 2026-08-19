import { createFileRoute } from "@tanstack/react-router";
import { CreateTaskModal } from "@/components/CreateTaskModal";
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
  Check
} from "lucide-react";
import { useState } from "react";
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

export const Route = createFileRoute("/_authenticated/projects/tasks")({
  component: TasksPage,
});

const COLUMNS = [
  { id: "todo", title: "Novas tarefas", color: "#8A8FA3" },
  { id: "doing", title: "Fazendo", color: "#3D4FE8" },
  { id: "review", title: "Aprovação interna", color: "#F5A524" },
  { id: "done", title: "Concluído", color: "#22C55E" },
];

const mockTasks = [
  {
    id: "1",
    title: "Relatório Mensal de Performance",
    client: "TechFlow Systems",
    priority: "high",
    deadline: "12 Mar",
    stage: "todo",
    assignees: ["AF"]
  },
  {
    id: "2",
    title: "Landing Page Campanha Q2",
    client: "Global Logistics",
    priority: "medium",
    deadline: "15 Mar",
    stage: "doing",
    assignees: ["AF", "JS"]
  },
  {
    id: "3",
    title: "Criação de Criativos Meta Ads",
    client: "Urban Eats",
    priority: "low",
    deadline: "20 Mar",
    stage: "review",
    assignees: ["JS"]
  }
];

function TasksPage() {
  const [tasks, setTasks] = useState(mockTasks);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newTasks = tasks.map(t => {
      if (t.id === draggableId) {
        return { ...t, stage: destination.droppableId };
      }
      return t;
    });
    setTasks(newTasks);
  };

  const kpis = [
    { label: "Tarefas", value: "42/50", icon: CheckCircle2, color: "text-[#3D4FE8]" },
    { label: "Em progresso", value: "8", icon: Play, color: "text-[#F5A524]" },
    { label: "Em atraso", value: "3", icon: AlertCircle, color: "text-[#EF4444]" },
    { label: "Entregues no mês", value: "35", icon: Check, color: "text-[#22C55E]" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Tarefas</h1>
          <p className="text-sm text-[#8A8FA3]">Gestão do fluxo de trabalho e prioridades</p>
        </div>
        <div className="flex gap-3">
          <div className="flex border border-[#E4E6F0] rounded-full p-1 bg-white">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "kanban" && "bg-[#F7F8FC] text-[#3D4FE8]")}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "list" && "bg-[#F7F8FC] text-[#3D4FE8]")}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 gap-2 font-bold">
            <Plus className="h-4 w-4" /> Criar Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("h-10 w-10 bg-white border border-[#E4E6F0] rounded-2xl flex items-center justify-center shadow-sm", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest">{kpi.label}</p>
                <h3 className="text-xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E4E6F0] shadow-sm">
        <div className="flex gap-4 flex-1">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
            <Input placeholder="Buscar tarefa..." className="pl-10 border-[#E4E6F0] rounded-full bg-[#F7F8FC]" />
          </div>
          <Button variant="outline" className="rounded-full border-[#E4E6F0] gap-2 text-xs font-bold text-[#8A8FA3]">
            Cliente
          </Button>
          <Button variant="outline" className="rounded-full border-[#E4E6F0] gap-2 text-xs font-bold text-[#8A8FA3]">
            Responsável
          </Button>
          <Button variant="outline" className="rounded-full border-[#E4E6F0] gap-2 text-xs font-bold text-[#8A8FA3]">
            Prazo
          </Button>
        </div>
        <Button variant="outline" className="rounded-full border-[#E4E6F0] gap-2 text-[#3D4FE8] font-bold">
          <Filter className="h-4 w-4" /> Filtros Avançados
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-1 min-w-[280px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-title font-bold text-[#0E0E16]">{col.title}</h3>
                  <span className="text-xs font-bold text-[#8A8FA3] bg-[#F7F8FC] px-2 py-0.5 rounded-full border border-[#E4E6F0]">
                    {tasks.filter(t => t.stage === col.id).length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8] rounded-full border border-transparent hover:border-[#E4E6F0] hover:bg-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4 min-h-[500px]"
                  >
                    {tasks.filter(t => t.stage === col.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="border-[#E4E6F0] shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                          >
                            <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-start">
                                <Badge className={cn(
                                  "text-[8px] uppercase font-bold border-none rounded-full px-2 py-0",
                                  task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                                  task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 
                                  'bg-green-100 text-green-600'
                                )}>
                                  {task.priority}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-[#8A8FA3] opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-bold text-[#0E0E16] leading-tight mb-1">{task.title}</h4>
                                <p className="text-[10px] text-[#8A8FA3] flex items-center gap-1 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D4FE8]" /> {task.client}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-[#F7F8FC]">
                                <div className="flex -space-x-2">
                                  {task.assignees.map((a, i) => (
                                    <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-[#3D4FE8] flex items-center justify-center text-[8px] text-white font-bold">
                                      {a}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#8A8FA3]">
                                    <MessageSquare className="h-3 w-3" /> 2
                                  </div>
                                  <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    task.deadline.includes("Mar") ? "bg-red-50 text-red-500" : "bg-[#F7F8FC] text-[#8A8FA3]"
                                  )}>
                                    <Calendar className="h-3 w-3" /> {task.deadline}
                                  </div>
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
        </div>
      </DragDropContext>
    </div>
  );
}