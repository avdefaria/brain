import { createFileRoute } from "@tanstack/react-router";
import { 
  Shield, 
  Clock, 
  CheckSquare, 
  Users, 
  BarChart3,
  Calendar,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  Layout,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getProjectsOverviewData } from "@/lib/projects.functions";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SquadManagementDialog } from "@/components/SquadManagementDialog";
import { DeleteSquadDialog } from "@/components/DeleteSquadDialog";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const [selectedSquad, setSelectedSquad] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => getProjectsOverviewData(),
  });

  const squads = data?.squads || [];
  const stats = data?.stats || {
    plannings: { total: 0, completed: 0 },
    tasks: { total: 0, completed: 0 }
  };

  const planningProgress = stats.plannings.total > 0 
    ? Math.round((stats.plannings.completed / stats.plannings.total) * 100) 
    : 0;

  const taskProgress = stats.tasks.total > 0
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
    : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão geral dos projetos</h1>
          <p className="text-sm text-[#8A8FA3]">Acompanhe o desempenho de todos os squads</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#0E0E16]">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-[#8A8FA3]">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} GMT-3</p>
        </div>
      </div>

      {/* 1. Cards de Squad */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#E4E6F0]">
        {squads.map((squad: any) => (
          <Card key={squad.id} className="w-[300px] border-[#E4E6F0] shadow-sm flex-shrink-0 bg-white group">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: squad.color || '#3D4FE8' }}
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0E0E16]">{squad.name}</h3>
                    <p className="text-[10px] text-[#8A8FA3]">{squad.leader?.name || "Sem líder"}</p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4 text-[#8A8FA3]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-[#E4E6F0]">
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedSquad(squad);
                        setIsEditDialogOpen(true);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedSquad(squad);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#8A8FA3] font-bold">
                  <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Progresso</span>
                  <span>{squad.deliveries}/{squad.totalDeliveries}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={squad.progress} className="h-1.5" />
                  <span className="text-xs font-bold text-[#0E0E16]">{squad.progress}%</span>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold",
                squad.healthScore >= 80 ? "text-[#22C55E]" : squad.healthScore >= 50 ? "text-[#F5A524]" : "text-[#EF4444]"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  squad.healthScore >= 80 ? "bg-[#22C55E]" : squad.healthScore >= 50 ? "bg-[#F5A524]" : "bg-[#EF4444]"
                )} />
                Health Score: {squad.healthScore || "N/A"}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F7F8FC]">
                <div className="text-center" title="Membros"><Users className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">{squad.membersCount}</span></div>
                <div className="text-center" title="Contas"><Shield className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">{squad.accountsCount}</span></div>
                <div className="text-center" title="Pendentes"><Clock className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">{squad.pending}</span></div>
                <div className="text-center" title="Atrasadas"><AlertTriangle className="h-3 w-3 mx-auto text-red-500 mb-1" /><span className="text-[10px] font-bold text-red-500">{squad.late}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <button className="w-[300px] border-2 border-dashed border-[#E4E6F0] rounded-xl flex items-center justify-center text-[#8A8FA3] hover:border-[#3D4FE8] hover:text-[#3D4FE8] transition-colors bg-[#F7F8FC]/50">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* 2. Blocos de Estatísticas e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-[#0E0E16]">Planejamentos gerais</h3>
                <p className="text-xs text-[#8A8FA3]">Planejamentos a serem entregues</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-[#3D4FE8]/10 text-[#3D4FE8] text-[10px] font-bold">
                {planningProgress}% completado
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="text-3xl font-title font-bold text-[#0E0E16]">
                {stats.plannings.completed}/{stats.plannings.total}
              </div>
              <Progress value={planningProgress} className="h-2 bg-[#F7F8FC]" />
            </div>
          </Card>

          <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-[#0E0E16]">Tarefas gerais</h3>
                <p className="text-xs text-[#8A8FA3]">Tarefas em andamento</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-[#22C55E]/10 text-[#22C55E] text-[10px] font-bold">
                {taskProgress}% completado
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="text-3xl font-title font-bold text-[#0E0E16]">
                {stats.tasks.completed}/{stats.tasks.total}
              </div>
              <Progress value={taskProgress} className="h-2 bg-[#F7F8FC]" />
            </div>
          </Card>
        </div>

        <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white">
          <h3 className="font-bold text-[#0E0E16]">Contas por Squad</h3>
          <p className="text-xs text-[#8A8FA3] mb-4">Total: {squads.reduce((acc: number, s: any) => acc + s.accountsCount, 0)} contas ativas</p>
          <div className="h-[180px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={squads}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F7F8FC" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#8A8FA3' }}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#F7F8FC' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border border-[#E4E6F0] rounded-lg shadow-sm">
                          <p className="text-xs font-bold text-[#0E0E16]">{payload[0].payload.name}</p>
                          <p className="text-[10px] text-[#3D4FE8]">{payload[0].value} contas</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="accountsCount" 
                  fill="#3D4FE8" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. Calendário e Timeline */}
      <ProjectCalendar />

      {/* 4. Timeline de Projetos Especiais */}
      <Card className="p-6 border-[#E4E6F0] shadow-sm bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-[#0E0E16]">Timeline de projetos especiais</h3>
            <div className="flex items-center gap-2 bg-[#F7F8FC] p-1 rounded-full">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="text-[10px] font-bold px-2">Semana de {new Date().getDate()} de {new Date().toLocaleDateString('pt-BR', { month: 'short' })}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#F7F8FC] p-1 rounded-full">
              <button className="px-3 py-1 text-[10px] font-bold rounded-full bg-white shadow-sm text-[#0E0E16]">Semana</button>
              <button className="px-3 py-1 text-[10px] font-bold rounded-full text-[#8A8FA3]">Mês</button>
            </div>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 h-8 px-4 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar projeto
            </Button>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 border-b border-[#F7F8FC] pb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                <div key={day} className="text-center">
                  <p className="text-[10px] text-[#8A8FA3]">{day}</p>
                  <p className="text-xs font-bold text-[#0E0E16]">{17 + i}</p>
                </div>
              ))}
            </div>
            <div className="h-32 flex items-center justify-center text-[#8A8FA3] text-sm italic">
              Nenhum projeto especial agendado para esta semana
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Tabela de Progresso por Squad */}
      <Card className="border-[#E4E6F0] shadow-sm overflow-hidden bg-white">
        <div className="p-6 border-b border-[#F7F8FC]">
          <h3 className="font-bold text-[#0E0E16]">Progresso das entregas por squad</h3>
        </div>
        <Table>
          <TableHeader className="bg-[#F7F8FC]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Squad</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Contas</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Time</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Health Score</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Demandas</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Concluídas</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Atrasadas</TableHead>
              <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {squads.length > 0 ? squads.map((squad: any) => (
              <TableRow key={squad.id} className="border-[#F7F8FC] hover:bg-[#F7F8FC]/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-xl ring-2 ring-offset-2" style={{ ringColor: squad.color }}>
                      <AvatarImage src={squad.leader?.avatar} />
                      <AvatarFallback className="bg-[#F7F8FC] text-[10px] font-bold" style={{ color: squad.color }}>
                        {squad.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-[#0E0E16]">{squad.name}</p>
                      <p className="text-[10px] text-[#8A8FA3]">{squad.leader?.name || "Sem líder"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-bold text-[#0E0E16]">{squad.accountsCount}</TableCell>
                <TableCell className="text-xs font-bold text-[#0E0E16]">{squad.membersCount}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                    squad.healthScore >= 80 ? "bg-[#22C55E]/10 text-[#22C55E]" : 
                    squad.healthScore >= 50 ? "bg-[#F5A524]/10 text-[#F5A524]" : 
                    squad.healthScore ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#F7F8FC] text-[#8A8FA3]"
                  )}>
                    {squad.healthScore || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-bold text-[#0E0E16]">{squad.totalDeliveries}</TableCell>
                <TableCell className="text-xs font-bold text-[#22C55E]">{squad.deliveries}</TableCell>
                <TableCell className="text-xs font-bold text-red-500">{squad.late}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <Progress 
                      value={squad.progress} 
                      className="h-1.5 flex-1" 
                      indicatorClassName={cn(
                        squad.progress >= 80 ? "bg-[#22C55E]" : 
                        squad.progress >= 40 ? "bg-[#3D4FE8]" : "bg-[#F5A524]"
                      )}
                    />
                    <span className="text-[10px] font-bold text-[#0E0E16] w-8">{squad.progress}%</span>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-[#8A8FA3] italic">
                  Nenhum squad encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {selectedSquad && (
        <>
          <SquadManagementDialog 
            squad={selectedSquad} 
            isOpen={isEditDialogOpen} 
            onOpenChange={setIsEditDialogOpen} 
          />
          <DeleteSquadDialog 
            squad={selectedSquad} 
            isOpen={isDeleteDialogOpen} 
            onOpenChange={setIsDeleteDialogOpen} 
          />
        </>
      )}
    </div>
  );
}

