import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
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
  CheckCircle2,
  Gauge,
  Timer,
  Zap
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { SquadManagementDialog } from "@/components/SquadManagementDialog";
import { DeleteSquadDialog } from "@/components/DeleteSquadDialog";
import { useState, type ReactNode } from "react";
import { efficiencyBand, formatTrackedTime, formatElapsedDays } from "@/lib/efficiency";
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

interface KpiCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  lineColor: string;
  label: string;
  value: string;
  subtitle: string;
  trend?: number[];
  delta?: number;
  deltaSuffix: string;
}

function KpiCard({ icon, iconBg, iconColor, lineColor, label, value, subtitle, trend, delta, deltaSuffix }: KpiCardProps) {
  const trendData = (trend && trend.length > 0 ? trend : [0]).map((v, i) => ({ i, v }));
  const deltaColor = !delta ? "text-[var(--ink-3)]" : delta > 0 ? "text-[var(--success)]" : "text-[var(--danger)]";
  const deltaLabel = delta === undefined || delta === null
    ? null
    : `${delta > 0 ? "+" : ""}${delta}${deltaSuffix}`;

  return (
    <Card className="p-4 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg, iconColor)}>
          {icon}
        </div>
        <span className="text-xs font-bold text-[var(--ink-3)]">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-title font-bold text-[var(--ink-1)]">{value}</p>
          <p className="text-[10px] text-[var(--ink-3)] mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="w-16 h-7">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {deltaLabel && (
            <span className={cn("text-[10px] font-bold", deltaColor)}>{deltaLabel}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProjectsPage() {
  const location = useLocation();
  const isExactProjects = location.pathname === "/projects" || location.pathname === "/projects/";

  const [selectedSquad, setSelectedSquad] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewSquadDialogOpen, setIsNewSquadDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => getProjectsOverviewData(),
  });

  const squads = data?.squads || [];
  const kpis = data?.kpis || { completionRate: 0, productivity: 0, progress: 0, trackedTimeLabel: "0s" };
  const internalStats = data?.internalStats || { total: 0, completed: 0, overdue: 0, pending: 0, inProgress: 0 };
  const externalStats = data?.externalStats || { total: 0, completed: 0, overdue: 0, pending: 0, inProgress: 0 };
  const progressOverTime = data?.progressOverTime || [];
  const taskDistribution = data?.taskDistribution || { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0 };
  const workload = data?.workload || [];
  const teamPerformance = data?.teamPerformance || [];

  const internalProgress = internalStats.total > 0 ? Math.round((internalStats.completed / internalStats.total) * 100) : 0;
  const externalProgress = externalStats.total > 0 ? Math.round((externalStats.completed / externalStats.total) * 100) : 0;

  const distributionData = [
    { key: "completed", name: "Concluídas", value: taskDistribution.completed, color: "var(--success)" },
    { key: "inProgress", name: "Em andamento", value: taskDistribution.inProgress, color: "var(--info)" },
    { key: "pending", name: "Pendentes", value: taskDistribution.pending, color: "var(--warning)" },
    { key: "overdue", name: "Atrasadas", value: taskDistribution.overdue, color: "var(--danger)" },
  ].filter(d => d.value > 0);

  return (
    <>
      {isExactProjects && (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 font-body">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Visão geral dos projetos</h1>
          <p className="text-sm text-[var(--ink-3)]">Acompanhe o desempenho de todos os squads</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[var(--ink-1)]">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-[var(--ink-3)]">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} GMT-3</p>
        </div>
      </div>

      {/* 0. KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconBg="bg-[var(--success-tint)]"
          iconColor="text-[var(--success)]"
          lineColor="var(--success)"
          label="Taxa de Conclusão"
          value={`${kpis.completionRate}%`}
          subtitle="Todas as tarefas"
          trend={kpis.trends?.completionRate}
          delta={kpis.deltas?.completionRate}
          deltaSuffix="pp"
        />
        <KpiCard
          icon={<Zap className="h-4 w-4" />}
          iconBg="bg-[var(--violet-tint-16)]"
          iconColor="text-[var(--violet-300)]"
          lineColor="var(--violet-400)"
          label="Produtividade"
          value={String(kpis.productivity)}
          subtitle="Tarefas concluídas"
          trend={kpis.trends?.productivity}
          delta={kpis.deltas?.productivity}
          deltaSuffix=""
        />
        <KpiCard
          icon={<Gauge className="h-4 w-4" />}
          iconBg="bg-[var(--info-tint)]"
          iconColor="text-[var(--info)]"
          lineColor="var(--info)"
          label="Progresso"
          value={`${kpis.progress}%`}
          subtitle="Média dos squads"
          trend={kpis.trends?.progress}
          delta={kpis.deltas?.progress}
          deltaSuffix="pp"
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          iconBg="bg-[var(--warning-tint)]"
          iconColor="text-[var(--warning)]"
          lineColor="var(--warning)"
          label="Tempo Registrado"
          value={kpis.trackedTimeLabel || "0s"}
          subtitle="Soma de todas as tarefas"
          trend={kpis.trends?.trackedTime}
          delta={kpis.deltas?.trackedTime}
          deltaSuffix="m"
        />
      </div>

      {/* 1. Cards de Squad */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[var(--line-1)]">
        {squads.map((squad: any) => (
          <Card key={squad.id} className="w-[300px] border-[var(--line-1)] shadow-sm flex-shrink-0 bg-[var(--surface-1)] group">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: squad.color || 'var(--violet-500)' }}
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--ink-1)]">{squad.name}</h3>
                    <p className="text-[10px] text-[var(--ink-3)]">{squad.leader?.name || "Sem líder"}</p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4 text-[var(--ink-3)]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-[var(--line-1)]">
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
                      className="gap-2 text-[var(--danger)] focus:text-[var(--danger)] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[var(--ink-3)] font-bold">
                  <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Progresso</span>
                  <span>{squad.deliveries}/{squad.totalDeliveries}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={squad.progress} className="h-1.5" />
                  <span className="text-xs font-bold text-[var(--ink-1)]">{squad.progress}%</span>
                </div>
              </div>

              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold",
                squad.healthScore >= 80 ? "text-[var(--success)]" : squad.healthScore >= 50 ? "text-[var(--warning)]" : squad.healthScore > 0 ? "text-[var(--danger)]" : "text-[var(--ink-3)]"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  squad.healthScore >= 80 ? "bg-[var(--success)]" : squad.healthScore >= 50 ? "bg-[var(--warning)]" : squad.healthScore > 0 ? "bg-[var(--danger)]" : "bg-[var(--ink-3)]"
                )} />
                Health Score: {squad.healthScore || "0"}
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-[var(--surface-2)] text-[10px] font-bold text-[var(--ink-3)]">
                <span>Empresas: <span className="text-[var(--ink-1)]">{String(squad.companiesCount).padStart(2, '0')}</span></span>
                <span>Contas: <span className="text-[var(--ink-1)]">{String(squad.accountsCount).padStart(2, '0')}</span></span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--surface-2)]">
                <div className="text-center" title="Membros"><Users className="h-3 w-3 mx-auto text-[var(--ink-3)] mb-1" /><span className="text-[10px] font-bold">{squad.membersCount}</span></div>
                <div className="text-center" title="Pendentes"><Clock className="h-3 w-3 mx-auto text-[var(--ink-3)] mb-1" /><span className="text-[10px] font-bold">{squad.pending}</span></div>
                <div className="text-center" title="Atrasadas"><AlertTriangle className="h-3 w-3 mx-auto text-[var(--danger)] mb-1" /><span className="text-[10px] font-bold text-[var(--danger)]">{squad.late}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <button 
          onClick={() => {
            setSelectedSquad(null);
            setIsNewSquadDialogOpen(true);
          }}
          className="w-[300px] border-2 border-dashed border-[var(--line-1)] rounded-xl flex items-center justify-center text-[var(--ink-3)] hover:border-[var(--violet-500)] hover:text-[var(--violet-500)] transition-colors bg-[var(--surface-2)]/50"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* 2. Blocos de Estatísticas e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--ink-1)]">Tarefas Interna</h3>
                <p className="text-[10px] text-[var(--ink-3)]">Demanda da própria Ongo</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-[var(--violet-tint-16)] text-[var(--violet-300)] text-[10px] font-bold shrink-0">
                {internalProgress}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-title font-bold text-[var(--ink-1)]">
                {internalStats.completed}/{internalStats.total}
              </div>
              <Progress value={internalProgress} className="h-1.5 bg-[var(--surface-2)]" />
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <p className="text-xs font-bold text-[var(--ink-1)]">{internalStats.pending}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">A fazer</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--info)]">{internalStats.inProgress}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">Em andamento</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--danger)]">{internalStats.overdue}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">Atrasado</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--ink-1)]">Tarefas Externa</h3>
                <p className="text-[10px] text-[var(--ink-3)]">Demanda de clientes</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-[var(--success-tint)] text-[var(--success)] text-[10px] font-bold shrink-0">
                {externalProgress}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-title font-bold text-[var(--ink-1)]">
                {externalStats.completed}/{externalStats.total}
              </div>
              <Progress value={externalProgress} className="h-1.5 bg-[var(--surface-2)]" />
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <p className="text-xs font-bold text-[var(--ink-1)]">{externalStats.pending}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">A fazer</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--info)]">{externalStats.inProgress}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">Em andamento</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--danger)]">{externalStats.overdue}</p>
                  <p className="text-[9px] text-[var(--ink-3)]">Atrasado</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
          <h3 className="font-bold text-[var(--ink-1)]">Contas por Squad</h3>
          <p className="text-xs text-[var(--ink-3)] mb-4">Total: {squads.reduce((acc: number, s: any) => acc + s.accountsCount, 0)} contas ativas</p>
          <div className="h-[180px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={squads}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-2)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[var(--surface-1)] p-2 border border-[var(--line-1)] rounded-lg shadow-sm">
                          <p className="text-xs font-bold text-[var(--ink-1)]">{payload[0]?.payload?.name}</p>
                          <p className="text-[10px] text-[var(--violet-500)]">{payload[0]?.value} contas</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="accountsCount" 
                  fill="var(--violet-500)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. Progresso ao longo do tempo + Distribuição das tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
          <h3 className="font-bold text-[var(--ink-1)]">Progresso ao longo do tempo</h3>
          <p className="text-xs text-[var(--ink-3)] mb-4">% de tarefas concluídas, últimos 7 dias</p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressOverTime} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--violet-500)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--violet-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--line-1)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Progresso"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--violet-500)" strokeWidth={2.5} fill="url(#progressFill)" dot={false} activeDot={{ r: 4, fill: 'var(--violet-500)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)] flex flex-col">
          <h3 className="font-bold text-[var(--ink-1)]">Distribuição das tarefas</h3>
          <p className="text-xs text-[var(--ink-3)] mb-4">Todas as tarefas, interna e externa</p>
          <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
            {taskDistribution.total > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {distributionData.map((d) => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: any) => [v, name]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-title font-bold text-[var(--ink-1)]">{taskDistribution.total}</span>
                  <span className="text-[9px] text-[var(--ink-3)] uppercase font-bold">Total</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--ink-3)] italic">Nenhuma tarefa ainda</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {[
              { label: "Concluídas", value: taskDistribution.completed, color: "var(--success)" },
              { label: "Em andamento", value: taskDistribution.inProgress, color: "var(--info)" },
              { label: "Pendentes", value: taskDistribution.pending, color: "var(--warning)" },
              { label: "Atrasadas", value: taskDistribution.overdue, color: "var(--danger)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-[var(--ink-3)] truncate">{item.label}</span>
                <span className="text-[10px] font-bold text-[var(--ink-1)] ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Desempenho do time + Distribuição de carga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
          <h3 className="font-bold text-[var(--ink-1)]">Desempenho do Time</h3>
          <p className="text-xs text-[var(--ink-3)] mb-4">Tarefas concluídas por dia, últimos 7 dias</p>
          {teamPerformance.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0" />
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {WEEKDAY_LABELS.map((d, i) => (
                    <span key={i} className="text-[9px] text-[var(--ink-3)] text-center font-bold">{d}</span>
                  ))}
                </div>
              </div>
              {teamPerformance.map((p: any) => (
                <div key={p.userId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--ink-1)] w-24 truncate shrink-0" title={p.name}>{p.name}</span>
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {p.days.map((count: number, i: number) => (
                      <div
                        key={i}
                        className="aspect-square rounded"
                        style={{ background: count === 0 ? 'var(--surface-2)' : `rgba(139,92,246,${Math.min(0.3 + count * 0.25, 1)})` }}
                        title={`${count} ${count === 1 ? 'concluída' : 'concluídas'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-3)] italic py-6 text-center">Sem conclusões recentes</p>
          )}
        </Card>

        <Card className="p-6 border-[var(--line-1)] shadow-sm bg-[var(--surface-1)]">
          <h3 className="font-bold text-[var(--ink-1)]">Distribuição de carga</h3>
          <p className="text-xs text-[var(--ink-3)] mb-4">Tarefas ativas por pessoa (não concluídas)</p>
          {workload.length > 0 ? (
            <div className="space-y-3">
              {workload.map((w: any) => (
                <div key={w.userId} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={w.avatar || undefined} />
                    <AvatarFallback className="bg-[var(--surface-3)] text-[var(--ink-2)] text-[10px] font-bold">
                      {w.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold text-[var(--ink-1)] w-24 truncate shrink-0">{w.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--violet-500)]" style={{ width: `${w.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--ink-3)] w-16 text-right shrink-0">{w.count} {w.count === 1 ? 'tarefa' : 'tarefas'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-3)] italic py-6 text-center">Nenhuma tarefa ativa atribuída no momento</p>
          )}
        </Card>
      </div>

      {/* 5. Tabela de Progresso por Squad */}
      <Card className="border-[var(--line-1)] shadow-sm overflow-hidden bg-[var(--surface-1)]">
        <div className="p-6 border-b border-[var(--surface-2)]">
          <h3 className="font-bold text-[var(--ink-1)]">Progresso das entregas por squad</h3>
        </div>
        <Table>
          <TableHeader className="bg-[var(--surface-2)]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Squad</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Contas</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Time</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Health Score</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Demandas</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Concluídas</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Atrasadas</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Eficiência</TableHead>
              <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {squads.length > 0 ? squads.map((squad: any) => (
              <TableRow 
                key={squad.id} 
                className="group border-[var(--surface-2)] hover:bg-[var(--surface-2)]/30 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedSquad(squad);
                  setIsEditDialogOpen(true);
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-8 w-8 rounded-xl ring-2 ring-offset-2 ring-offset-[var(--surface-1)]"
                      style={{ "--tw-ring-color": squad.color } as any}
                    >
                      <AvatarImage src={squad.leader?.avatar} />
                      <AvatarFallback className="bg-[var(--surface-2)] text-[10px] font-bold" style={{ color: squad.color }}>
                        {squad.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-[var(--ink-1)]">{squad.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{squad.leader?.name || "Sem líder"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-bold text-[var(--ink-1)]">{squad.accountsCount}</TableCell>
                <TableCell className="text-xs font-bold text-[var(--ink-1)]">{squad.membersCount}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                    squad.healthScore >= 80 ? "bg-[var(--success)]/10 text-[var(--success)]" : 
                    squad.healthScore >= 50 ? "bg-[var(--warning)]/10 text-[var(--warning)]" : 
                    squad.healthScore ? "bg-[var(--danger)]/10 text-[var(--danger)]" : "bg-[var(--surface-2)] text-[var(--ink-3)]"
                  )}>
                    {squad.healthScore || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-bold text-[var(--ink-1)]">{squad.totalDeliveries}</TableCell>
                <TableCell className="text-xs font-bold text-[var(--success)]">{squad.deliveries}</TableCell>
                <TableCell className="text-xs font-bold text-[var(--danger)]">{squad.late}</TableCell>
                <TableCell>
                  {squad.efficiency?.ratioPct !== null && squad.efficiency?.ratioPct !== undefined ? (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
                      efficiencyBand(squad.efficiency.ratioPct) === "ok" ? "bg-[var(--success)]/10 text-[var(--success)]" :
                      efficiencyBand(squad.efficiency.ratioPct) === "atencao" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                      "bg-[var(--danger)]/10 text-[var(--danger)]"
                    )}>
                      {formatTrackedTime(squad.efficiency.trackedSeconds)} / {formatElapsedDays(squad.efficiency.elapsedDays)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--ink-3)]">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <Progress 
                      value={squad.progress} 
                      className="h-1.5 flex-1" 
                      indicatorClassName={cn(
                        squad.progress >= 80 ? "bg-[var(--success)]" : 
                        squad.progress >= 40 ? "bg-[var(--violet-500)]" : "bg-[var(--warning)]"
                      )}
                    />
                    <span className="text-[10px] font-bold text-[var(--ink-1)] w-8">{squad.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSquad(squad);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-[var(--ink-3)] italic">
                  Nenhum squad encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {selectedSquad && (
        <DeleteSquadDialog 
          squad={selectedSquad} 
          isOpen={isDeleteDialogOpen} 
          onOpenChange={setIsDeleteDialogOpen} 
        />
      )}

      <SquadManagementDialog 
        squad={selectedSquad} 
        isOpen={isEditDialogOpen || isNewSquadDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          setIsNewSquadDialogOpen(open);
          if (!open) setSelectedSquad(null);
        }} 
      />
        </div>
      )}
      <Outlet />
    </>
  );
}

