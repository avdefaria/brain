import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarClock, CalendarDays, ListChecks, Plus, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/OnboardingModal";
import { QuickAddTaskModal } from "@/components/QuickAddTaskModal";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { SpecialProjectModal } from "@/components/SpecialProjectModal";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardOverview, getMyEfficiencyOverview } from "@/lib/dashboard.functions";
import { getTasks } from "@/lib/tasks.functions";
import { efficiencyBand, formatTrackedTime, formatElapsedDays } from "@/lib/efficiency";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

// new Date(isoString) + format() desloca 1 dia pra trás em fusos atrás de UTC
// (o valor vem como meia-noite UTC). Construir a data a partir dos componentes
// YYYY-MM-DD evita o round-trip por UTC e mantém o dia calendário certo.
function formatDateOnly(value: string, pattern: string): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return format(new Date(y!, (m || 1) - 1, d || 1), pattern, { locale: ptBR });
}

const PRIORITY_LABEL: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-[var(--surface-3)] text-[var(--ink-3)]",
  medium: "bg-[var(--warning-tint)] text-[var(--warning)]",
  high: "bg-[var(--danger-tint)] text-[var(--danger)]",
};
const STAGE_COLOR: Record<string, string> = {
  todo: "var(--violet-300)",
  doing: "var(--violet-500)",
  review: "var(--violet-700)",
  done: "var(--surface-4)",
};

function ProgressRing({ pct, size = 128, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--violet-tint-16)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--violet-300)"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function heatColor(count: number): string {
  if (count === 0) return "var(--surface-3)";
  if (count === 1) return "var(--violet-tint-28)";
  if (count === 2) return "rgba(139, 92, 246, .5)";
  return "var(--violet-500)";
}

function DashboardPage() {
  const [monthsCount, setMonthsCount] = useState<6 | 12>(6);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [efficiencyPeriod, setEfficiencyPeriod] = useState<"today" | "week" | "month">("today");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getDashboardOverview);
  const fetchTasks = useServerFn(getTasks);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview", monthsCount],
    queryFn: () => fetchOverview({ data: { months: monthsCount } }),
  });
  const { data: allTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });
  const selectedTask = allTasks?.find((t: any) => t.id === selectedTaskId) || null;

  const fetchEfficiency = useServerFn(getMyEfficiencyOverview);
  const { data: efficiencyData, isLoading: efficiencyLoading } = useQuery({
    queryKey: ["my-efficiency", efficiencyPeriod],
    queryFn: () => fetchEfficiency({ data: { period: efficiencyPeriod } }),
  });
  const editingProjectSource = data?.specialProjects.find((sp) => sp.id === editingProjectId) || null;
  const editingProject = editingProjectSource
    ? {
        id: editingProjectSource.id,
        name: editingProjectSource.name,
        client_id: editingProjectSource.clientId,
        squad_id: editingProjectSource.squadId,
        start_date: editingProjectSource.startDate,
        end_date: editingProjectSource.endDate,
        description: editingProjectSource.description,
        color: editingProjectSource.color,
      }
    : null;

  const todayIndex = data?.weekActivity.findIndex((d) => d.isToday) ?? -1;
  const activeDayIndex = selectedDayIndex ?? (todayIndex >= 0 ? todayIndex : 0);
  const activeDay = data?.weekActivity[activeDayIndex];
  const isActiveDayToday = activeDay?.isToday ?? true;

  const greetingName = data?.firstName || "";
  const scopeSubtitle = data?.squadLabel
    ? `Aqui está o que está acontecendo no ${data.squadLabel} hoje.`
    : "Você ainda não faz parte de um squad.";
  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  const stageSegments = data
    ? [
        { key: "todo", count: data.pendingByStage.find((p) => p.stage === "todo")?.count || 0, label: "A fazer" },
        { key: "doing", count: data.pendingByStage.find((p) => p.stage === "doing")?.count || 0, label: "Em andamento" },
        { key: "review", count: data.pendingByStage.find((p) => p.stage === "review")?.count || 0, label: "Em revisão" },
        { key: "done", count: data.currentPhase.done, label: "Concluído" },
      ]
    : [];
  const stageTotal = stageSegments.reduce((s, seg) => s + seg.count, 0) || 1;

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <OnboardingModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-title font-bold text-[var(--ink-1)]">
            {greetingName ? `Olá, ${greetingName} 👋` : "Olá 👋"}
          </h1>
          <p className="text-[var(--ink-3)] mt-1">{scopeSubtitle}</p>
        </div>
        <Button onClick={() => setQuickAddOpen(true)} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90">
          <Plus className="h-4 w-4 mr-1" /> Add Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fase atual */}
        <Card className="border-[var(--line-1)] p-6 flex flex-col">
          <h3 className="font-title font-bold mb-4">Fase atual do squad</h3>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : (
            <>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative">
                  <ProgressRing pct={data?.currentPhase.pct ?? 0} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-[var(--ink-1)]">{data?.currentPhase.pct ?? 0}%</span>
                    <span className="text-[10px] text-[var(--ink-3)]">Completo</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--ink-3)] mt-3">
                  {data?.currentPhase.done ?? 0} de {data?.currentPhase.total ?? 0} tarefas concluídas
                </p>
              </div>
              <div className="mt-4">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {stageSegments.map((seg) => (
                    <div
                      key={seg.key}
                      style={{ width: `${(seg.count / stageTotal) * 100}%`, background: STAGE_COLOR[seg.key] }}
                      className={seg.count === 0 ? "hidden" : ""}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 flex-wrap gap-1">
                  {stageSegments.map((seg) => (
                    <span key={seg.key} className="text-[10px] text-[var(--ink-3)] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLOR[seg.key] }} />
                      {seg.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Pendências */}
        <Card className="border-[var(--line-1)] p-6 flex flex-col">
          <h3 className="font-title font-bold mb-1">Pendências do squad</h3>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : (
            <>
              <p className="text-4xl font-bold text-[var(--ink-1)] tabular mb-1">{data?.pendingTotal ?? 0}</p>
              <p className="text-xs text-[var(--ink-3)] mb-4">itens aguardando</p>
              <div className="flex-1 space-y-2">
                {data?.pendingByStage.map((p) => (
                  <div key={p.stage} className="flex items-center justify-between rounded-[var(--r-md)] bg-[var(--surface-2)] px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-[var(--ink-1)]">
                      <ListChecks className="h-4 w-4 text-[var(--violet-300)]" />
                      {p.label}
                    </span>
                    <span className="text-sm font-bold text-[var(--ink-1)] tabular">{p.count}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => navigate({ to: "/projects/tasks" })}
                className="rounded-full text-xs mt-4 w-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90"
              >
                Ver todas
              </Button>
            </>
          )}
        </Card>

        {/* Performance */}
        <Card className="border-[var(--line-1)] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title font-bold">Performance do squad</h3>
            <div className="flex border border-[var(--line-1)] rounded-full overflow-hidden text-[10px]">
              <button
                onClick={() => setMonthsCount(6)}
                className={cn("px-2 py-1", monthsCount === 6 ? "bg-[var(--violet-tint-16)] text-[var(--violet-300)]" : "text-[var(--ink-3)]")}
              >
                6M
              </button>
              <button
                onClick={() => setMonthsCount(12)}
                className={cn("px-2 py-1", monthsCount === 12 ? "bg-[var(--violet-tint-16)] text-[var(--violet-300)]" : "text-[var(--ink-3)]")}
              >
                12M
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-[var(--r-md)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide">No prazo</p>
                  <p className="text-lg font-bold text-[var(--ink-1)] tabular">
                    {data?.performance.onTimePct !== null && data?.performance.onTimePct !== undefined ? `${data.performance.onTimePct}%` : "—"}
                  </p>
                </div>
                <div className="rounded-[var(--r-md)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide">Atrasadas</p>
                  <p className={cn("text-lg font-bold tabular", (data?.performance.overdueCount ?? 0) > 0 ? "text-[var(--danger)]" : "text-[var(--ink-1)]")}>
                    {data?.performance.overdueCount ?? 0}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide mb-1">Concluídas por mês</p>
              <div className="flex-1 min-h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.performance.completedByMonth || []}>
                    <Bar dataKey="value" fill="var(--violet-500)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score dos squads */}
        <Card className="border-[var(--line-1)] p-6">
          <h3 className="font-title font-bold mb-4">Health Score dos squads</h3>
          {isLoading ? (
            <div className="text-center py-8 text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : (
            <div className="space-y-3">
              {data?.squadHealthRanking.map((s) => (
                <div key={s.squadName}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[var(--ink-3)]">{s.squadName}</span>
                    <span className="font-medium text-[var(--ink-1)] tabular">{s.avgHealth ?? "—"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full bg-[var(--violet-500)] rounded-full" style={{ width: `${s.avgHealth ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cliente crítico */}
        <Card className="border-[var(--line-1)] p-6 flex flex-col">
          <h3 className="font-title font-bold mb-4">Cliente com Health Score crítico</h3>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : data?.criticalClient ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--danger-tint)] text-[var(--danger)] flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--ink-1)]">{data.criticalClient.name}</p>
                <p className="text-xs text-[var(--ink-3)]">Health Score {data.criticalClient.healthScore ?? 0}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-[var(--ink-3)] text-sm">Nenhum cliente em risco crítico no squad.</div>
          )}
        </Card>

        {/* Cliente próximo de vencer */}
        <Card className="border-[var(--line-1)] p-6 flex flex-col">
          <h3 className="font-title font-bold mb-4">Cliente próximo de vencer</h3>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : data?.renewingClient ? (
            <button
              onClick={() => navigate({ to: "/clients/$clientId", params: { clientId: data.renewingClient!.id } })}
              className="flex items-center gap-3 text-left rounded-[var(--r-md)] hover:bg-[var(--surface-2)] -m-2 p-2 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--warning-tint)] text-[var(--warning)] flex items-center justify-center shrink-0">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--ink-1)]">{data.renewingClient.name}</p>
                <p className="text-xs text-[var(--ink-3)]">Renova em {formatDateOnly(data.renewingClient.renewalDate, "dd/MM/yyyy")}</p>
              </div>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-[var(--ink-3)] text-sm">Nenhum contrato vencendo no squad.</div>
          )}
        </Card>
      </div>

      {/* Eficiência de execução */}
      <Card className="border-[var(--line-1)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-title font-bold">Eficiência</h3>
            <p className="text-xs text-[var(--ink-3)]">Tempo trabalhado (cronômetro) vs tempo do período — só o que você registrou</p>
          </div>
          <div className="flex border border-[var(--line-1)] rounded-full overflow-hidden text-[10px] shrink-0">
            {([
              ["today", "Hoje"],
              ["week", "Semana"],
              ["month", "Mês"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setEfficiencyPeriod(key)}
                className={cn("px-3 py-1", efficiencyPeriod === key ? "bg-[var(--violet-tint-16)] text-[var(--violet-300)]" : "text-[var(--ink-3)]")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {efficiencyLoading ? (
          <div className="text-center py-8 text-[var(--ink-3)] text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                ["Tarefas", efficiencyData?.tasks || [], (row: any) => formatElapsedDays(row.elapsedDays)],
                ["Squads", efficiencyData?.squads || [], () => formatElapsedDays((efficiencyData?.periodElapsedSeconds || 0) / 86400)],
                ["Clientes", efficiencyData?.clients || [], () => formatElapsedDays((efficiencyData?.periodElapsedSeconds || 0) / 86400)],
              ] as const
            ).map(([label, rows, denomLabel]) => (
              <div key={label}>
                <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide mb-2">{label}</p>
                {rows.length > 0 ? (
                  <div className="space-y-2">
                    {rows.slice(0, 5).map((row: any) => {
                      const band = efficiencyBand(row.ratioPct);
                      return (
                        <div key={row.id} className="flex items-center justify-between gap-2 rounded-[var(--r-md)] bg-[var(--surface-2)] px-3 py-2">
                          <p className="text-xs font-medium text-[var(--ink-1)] truncate">{row.title || row.name}</p>
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                              band === "ok" ? "bg-[var(--success)]/10 text-[var(--success)]" :
                              band === "atencao" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                              band === "critico" ? "bg-[var(--danger)]/10 text-[var(--danger)]" :
                              "bg-[var(--surface-3)] text-[var(--ink-3)]",
                            )}
                          >
                            <Gauge className="h-3 w-3" />
                            {formatTrackedTime(row.trackedSeconds)} / {denomLabel(row)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--ink-3)]">Nada registrado nesse período.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline de projetos especiais */}
        <Card className="lg:col-span-2 border-[var(--line-1)] p-6">
          <h3 className="font-title font-bold mb-4">Projetos especiais</h3>
          {isLoading ? (
            <div className="text-center py-8 text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : data && data.specialProjects.length > 0 ? (
            <div className="space-y-4">
              {data.specialProjects.map((sp) => {
                const start = new Date(sp.startDate).getTime();
                const end = sp.endDate ? new Date(sp.endDate).getTime() : start;
                const now = Date.now();
                const elapsedPct = end > start ? Math.round(Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) ) : 0;
                return (
                  <button
                    key={sp.id}
                    onClick={() => setEditingProjectId(sp.id)}
                    className="block w-full text-left rounded-[var(--r-md)] hover:bg-[var(--surface-2)] -mx-2 px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-[var(--ink-1)]">{sp.name}</span>
                      <span className="text-xs text-[var(--ink-3)] tabular">{elapsedPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${elapsedPct}%`, background: sp.color || "var(--violet-500)" }} />
                    </div>
                    <p className="text-xs text-[var(--ink-3)]">
                      {[sp.clientName, sp.squadName].filter(Boolean).join(" · ") || "Interno"} · {formatDateOnly(sp.startDate, "dd/MM")}
                      {sp.endDate ? ` – ${formatDateOnly(sp.endDate, "dd/MM")}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--ink-3)] text-sm">Nenhum projeto especial cadastrado.</div>
          )}
        </Card>

        {/* Calendar & Tarefas */}
        <Card className="border-[var(--line-1)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title font-bold">Calendário & Tarefas</h3>
            <span className="flex items-center gap-1 text-xs text-[var(--ink-3)]">
              <CalendarDays className="h-3.5 w-3.5" />
              {monthLabel}
            </span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-[var(--ink-3)] text-sm">Carregando...</div>
          ) : (
            <>
              {/* Progresso de hoje */}
              <div className="rounded-[var(--r-lg)] bg-[var(--violet-tint-16)] p-4 flex items-center gap-4 mb-5">
                {data && data.today.total > 0 ? (
                  <>
                    <div className="relative shrink-0">
                      <ProgressRing pct={data.today.pct} size={64} stroke={6} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-[var(--ink-1)]">{data.today.pct}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--ink-1)]">Progresso de hoje</p>
                      <p className="text-xs text-[var(--ink-3)]">{data.today.done} de {data.today.total} concluídas</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet-tint-28)]" /> {data.today.total - data.today.done} pendente
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--ink-3)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--violet-300)]" /> {data.today.done} concluída
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--ink-3)]">Nenhuma tarefa prevista para hoje.</p>
                )}
              </div>

              {/* Heatmap da semana — clicável, cada dia filtra a lista abaixo */}
              <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide mb-2">Atividade da semana</p>
              <div className="grid grid-cols-7 gap-1.5 mb-1">
                {data?.weekActivity.map((d, i) => (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDayIndex(i)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-[9px] text-[var(--ink-3)]">{d.label}</span>
                    <div
                      className={cn(
                        "h-7 w-7 rounded-[var(--r-sm)] flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-105",
                        i === activeDayIndex && "ring-1 ring-[var(--violet-300)]",
                      )}
                      style={{ background: heatColor(d.count), color: d.count >= 2 ? "#fff" : "var(--ink-3)" }}
                    >
                      {d.dayNumber}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1 mb-5">
                <span className="text-[9px] text-[var(--ink-3)] mr-1">Menos</span>
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className="h-2 w-2 rounded-sm" style={{ background: heatColor(n) }} />
                ))}
                <span className="text-[9px] text-[var(--ink-3)] ml-1">Mais</span>
              </div>

              {/* Tarefas do dia selecionado (hoje por padrão) — clique abre a tarefa */}
              <p className="text-[10px] text-[var(--ink-3)] uppercase tracking-wide mb-2">
                {isActiveDayToday ? "Tarefas de hoje" : `Tarefas de ${activeDay?.label}, dia ${activeDay?.dayNumber}`}
              </p>
              {activeDay && activeDay.tasks.length > 0 ? (
                <div className="space-y-2">
                  {activeDay.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="w-full rounded-[var(--r-md)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors"
                    >
                      <p className={cn("text-xs font-medium truncate", t.done ? "text-[var(--ink-3)] line-through" : "text-[var(--ink-1)]")}>{t.title}</p>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", PRIORITY_COLOR[t.priority || "low"])}>
                        {PRIORITY_LABEL[t.priority || "low"]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--ink-3)]">Nada agendado pra esse dia.</p>
              )}
            </>
          )}
        </Card>
      </div>

      <QuickAddTaskModal isOpen={quickAddOpen} onOpenChange={setQuickAddOpen} />

      <TaskDetailPanel
        task={selectedTask}
        isOpen={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
            queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
          }
        }}
      />

      <SpecialProjectModal
        isOpen={!!editingProjectId}
        onOpenChange={(open) => !open && setEditingProjectId(null)}
        project={editingProject}
      />
    </div>
  );
}
