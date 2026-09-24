import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeRiskLevel } from "@/lib/risk-level";
import { z } from "zod";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(base: Date): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function monthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i) + 1, 0, 23, 59, 59, 999);
    return {
      name: d.toLocaleString("pt-BR", { month: "short" }),
      start,
      end,
    };
  });
}

const STAGE_LABELS: Record<string, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  review: "Em revisão",
};

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data?: { months?: number }) => z.object({ months: z.number().optional() }).optional().parse(data))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const monthsCount = data?.months === 12 ? 12 : 6;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error("Não autenticado");

    const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("id", userId).maybeSingle();
    const fullName = (profile as any)?.full_name || "";
    const firstName = fullName.trim().split(" ")[0] || "";

    // Painel é o mesmo pra todo mundo — sempre escopado no(s) squad(s) da pessoa
    // logada (inclusive admin), só o comparativo de Health Score entre squads é
    // de propósito olhando a empresa toda (é um benchmark, não dado "de alguém").
    const { data: mySquadRows } = await (supabase.from("profile_squads" as any) as any)
      .select("squad_id")
      .eq("profile_id", userId);
    const mySquadIds = Array.from(new Set(((mySquadRows as any[]) || []).map((r: any) => r.squad_id)));

    let squadLabel: string | null = null;
    if (mySquadIds.length > 0) {
      const { data: squadsRows } = await supabase.from("squads").select("id, name").in("id", mySquadIds);
      squadLabel = ((squadsRows as any[]) || []).map((s: any) => s.name).join(", ") || null;
    }

    // Membros do(s) squad(s) — base pro escopo de tarefas (squad = trabalho de
    // quem está nele, não só clientes vinculados).
    let squadMembers: any[] = [];
    if (mySquadIds.length > 0) {
      const { data: memberRows } = await (supabase.from("profile_squads" as any) as any)
        .select("profile_id, profiles(id, full_name, avatar_url, function, active)")
        .in("squad_id", mySquadIds);
      const seen = new Set<string>();
      squadMembers = ((memberRows as any[]) || [])
        .map((r: any) => r.profiles)
        .filter((p: any) => {
          if (!p || seen.has(p.id) || p.active === false) return false;
          seen.add(p.id);
          return true;
        });
    }
    const squadMemberIds = squadMembers.map((m) => m.id);

    // Clientes do(s) squad(s), via accounts -> account_squads -> squads (não
    // clients.squad_id, que é campo morto — ver memória do projeto).
    let squadClientIds: string[] = [];
    if (mySquadIds.length > 0) {
      const { data: accountSquadRows } = await supabase
        .from("account_squads")
        .select("account_id, squad_id")
        .in("squad_id", mySquadIds);
      const accountIds = Array.from(new Set(((accountSquadRows as any[]) || []).map((r: any) => r.account_id)));
      if (accountIds.length > 0) {
        const { data: accountsRows } = await supabase.from("accounts").select("id, client_id").in("id", accountIds);
        squadClientIds = Array.from(new Set(((accountsRows as any[]) || []).map((r: any) => r.client_id).filter(Boolean)));
      }
    }

    let squadClients: any[] = [];
    if (squadClientIds.length > 0) {
      const { data: clientsRows } = await supabase
        .from("clients")
        .select("id, name, status, health_score, receivables(status, due_date), contracts(status, renewal_date)")
        .in("id", squadClientIds);
      squadClients = (clientsRows as any[]) || [];
    }
    const activeSquadClients = squadClients.filter((c) => c.status === "ativo");

    // --- Tarefas do squad (todo mundo que divide squad com quem está logado) ---
    const { data: taskStages } = await supabase.from("task_stages").select("id, is_done_stage");
    const doneStageIds = new Set(((taskStages as any[]) || []).filter((s: any) => s.is_done_stage).map((s: any) => s.id));

    let squadTasks: any[] = [];
    if (squadMemberIds.length > 0) {
      const { data: assigneeRows } = await (supabase.from("task_assignees" as any) as any)
        .select("task_id, user_id, tasks(id, title, stage, deadline, priority, created_at, clients(name))")
        .in("user_id", squadMemberIds);
      const byTask = new Map<string, any>();
      for (const r of (assigneeRows as any[]) || []) {
        if (r.tasks) byTask.set(r.task_id, r.tasks);
      }
      squadTasks = Array.from(byTask.values());
    }

    // Fase atual = % de conclusão das tarefas do squad (proxy real de progresso —
    // a base de "Gestão de Entregas" por cliente/mês ainda não tem registro
    // nenhum lançado, então não dava pra usar sem inventar número).
    const doneTasksCount = squadTasks.filter((t) => doneStageIds.has(t.stage)).length;
    const totalTasksCount = squadTasks.length;
    const currentPhasePct = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    // Pendências por etapa (exclui "done").
    const pendingByStage = ["todo", "doing", "review"].map((stage) => ({
      stage,
      label: STAGE_LABELS[stage] || stage,
      count: squadTasks.filter((t) => t.stage === stage).length,
    }));
    const pendingTotal = pendingByStage.reduce((s, p) => s + p.count, 0);

    // Performance: tarefas concluídas por mês (via task_history, mesmo padrão de
    // team.functions.ts) + % no prazo + tarefas atrasadas agora.
    const { data: taskHistoryRows } = await supabase
      .from("task_history")
      .select("task_id, action, changes, created_at")
      .order("created_at", { ascending: true });
    const firstDoneAt = new Map<string, number>();
    for (const h of (taskHistoryRows as any[]) || []) {
      if (h.action !== "editou a etapa" && h.action !== "criou a tarefa") continue;
      const toStage = (h.changes as any)?.to || (h.action === "criou a tarefa" ? (h.changes as any)?.stage : null);
      if (toStage && doneStageIds.has(toStage) && !firstDoneAt.has(h.task_id)) {
        firstDoneAt.set(h.task_id, new Date(h.created_at).getTime());
      }
    }
    const squadTaskIds = new Set(squadTasks.map((t) => t.id));
    const months = monthBuckets(monthsCount);
    const completedByMonth = months.map((m) => {
      const count = Array.from(firstDoneAt.entries()).filter(
        ([taskId, doneAt]) => squadTaskIds.has(taskId) && doneAt >= m.start.getTime() && doneAt <= m.end.getTime(),
      ).length;
      return { name: m.name, value: count };
    });

    // Comparação por dia (string "YYYY-MM-DD"), não por instante exato — deadline
    // é armazenado como meia-noite do dia de vencimento, então comparar por
    // timestamp exato marcaria como atrasada uma tarefa que só vence "hoje", e
    // como fora do prazo uma concluída no próprio dia (mesma classe de bug já
    // corrigida em Recebimentos).
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let onTimeCount = 0;
    let doneWithDeadlineCount = 0;
    for (const t of squadTasks) {
      const doneAt = firstDoneAt.get(t.id);
      if (doneAt === undefined || !t.deadline) continue;
      doneWithDeadlineCount += 1;
      const doneDateStr = new Date(doneAt).toISOString().slice(0, 10);
      if (doneDateStr <= t.deadline.slice(0, 10)) onTimeCount += 1;
    }
    const onTimePct = doneWithDeadlineCount > 0 ? Math.round((onTimeCount / doneWithDeadlineCount) * 100) : null;

    const overdueCount = squadTasks.filter(
      (t) => !doneStageIds.has(t.stage) && t.deadline && t.deadline.slice(0, 10) < todayStr,
    ).length;

    // Health Score por squad — comparativo da empresa toda (benchmark, não
    // "dado de alguém"), usando clientes ativos de cada squad.
    const { data: allSquadsRows } = await supabase.from("squads").select("id, name");
    const { data: allAccountSquadRows } = await supabase.from("account_squads").select("account_id, squad_id");
    const { data: allAccountsRows } = await supabase.from("accounts").select("id, client_id");
    const { data: allActiveClientsRows } = await supabase.from("clients").select("id, status, health_score").eq("status", "ativo");
    const clientHealthById = new Map<string, number>();
    for (const c of (allActiveClientsRows as any[]) || []) clientHealthById.set(c.id, c.health_score || 0);
    const clientIdByAccountId = new Map<string, string>();
    for (const a of (allAccountsRows as any[]) || []) clientIdByAccountId.set(a.id, a.client_id);
    const clientIdsBySquad = new Map<string, Set<string>>();
    for (const asq of (allAccountSquadRows as any[]) || []) {
      const clientId = clientIdByAccountId.get(asq.account_id);
      if (!clientId || !clientHealthById.has(clientId)) continue;
      const set = clientIdsBySquad.get(asq.squad_id) || new Set<string>();
      set.add(clientId);
      clientIdsBySquad.set(asq.squad_id, set);
    }
    const squadHealthRanking = ((allSquadsRows as any[]) || [])
      .map((s: any) => {
        const clientIds = Array.from(clientIdsBySquad.get(s.id) || []);
        if (clientIds.length === 0) return { squadName: s.name, avgHealth: null as number | null };
        const avg = Math.round(clientIds.reduce((sum, id) => sum + (clientHealthById.get(id) || 0), 0) / clientIds.length);
        return { squadName: s.name, avgHealth: avg };
      })
      .sort((a, b) => (b.avgHealth ?? -1) - (a.avgHealth ?? -1));

    // Cliente com Health Score crítico (dentro do squad de quem está logado).
    const clientsWithRisk = activeSquadClients.map((c) => ({
      id: c.id,
      name: c.name,
      healthScore: c.health_score,
      riskLevel: computeRiskLevel(c.health_score, c.receivables),
    }));
    const criticalClient = clientsWithRisk
      .filter((c) => c.riskLevel === "high")
      .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0))[0] || null;

    // Cliente mais próximo de vencer contrato (renewal_date mais próxima, no squad).
    let renewingClient: { id: string; name: string; renewalDate: string } | null = null;
    for (const c of activeSquadClients) {
      for (const ct of (c.contracts as any[]) || []) {
        if (ct.status !== "active" || !ct.renewal_date || ct.renewal_date < todayStr) continue;
        if (!renewingClient || ct.renewal_date < renewingClient.renewalDate) {
          renewingClient = { id: c.id, name: c.name, renewalDate: ct.renewal_date };
        }
      }
    }

    // Minhas tarefas (pessoal — o "Calendar & Tarefas" é sempre individual, com
    // TODAS as etapas, não só pendentes, porque o anel/heatmap de hoje também
    // precisa contar o que já foi concluído hoje).
    const { data: myTaskRows } = await (supabase.from("task_assignees" as any) as any)
      .select("task_id, tasks(id, title, stage, deadline, priority, clients(name))")
      .eq("user_id", userId);
    const myAllTasks = ((myTaskRows as any[]) || []).map((r: any) => r.tasks).filter(Boolean);
    const myActiveTasks = myAllTasks
      .filter((t: any) => !doneStageIds.has(t.stage))
      .sort((a: any, b: any) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

    // Heatmap da semana atual (Seg–Dom) + agenda de hoje — só com o que
    // realmente existe (deadline de tarefa própria); sem reunião ainda (ver
    // memória — precisa de integração externa de calendário, feature à parte).
    const monday = mondayOf(now);
    const weekActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const ds = dateStr(d);
      const dayTasks = myAllTasks.filter((t: any) => t.deadline && t.deadline.slice(0, 10) === ds);
      return {
        label: WEEKDAY_LABELS[i],
        dayNumber: d.getDate(),
        dateStr: ds,
        count: dayTasks.length,
        isToday: ds === todayStr,
        tasks: dayTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          clientName: t.clients?.name || null,
          done: doneStageIds.has(t.stage),
        })),
      };
    });
    const todaysTasks = myAllTasks.filter((t: any) => t.deadline && t.deadline.slice(0, 10) === todayStr);
    const todayDoneCount = todaysTasks.filter((t: any) => doneStageIds.has(t.stage)).length;
    const todayTotalCount = todaysTasks.length;

    // Projetos especiais — feature nova da empresa toda, sem escopo por squad.
    const { data: specialProjectRows } = await supabase
      .from("special_projects")
      .select("id, name, description, start_date, end_date, color, client_id, squad_id, clients(name), squads(name)")
      .order("start_date", { ascending: true });

    return {
      firstName,
      squadLabel,
      currentPhase: { pct: currentPhasePct, done: doneTasksCount, total: totalTasksCount },
      pendingByStage,
      pendingTotal,
      performance: { completedByMonth, onTimePct, overdueCount },
      squadHealthRanking,
      criticalClient,
      renewingClient,
      myTasks: myActiveTasks.slice(0, 5).map((t: any) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
        clientName: t.clients?.name || null,
      })),
      myTasksActiveCount: myActiveTasks.length,
      today: {
        done: todayDoneCount,
        total: todayTotalCount,
        pct: todayTotalCount > 0 ? Math.round((todayDoneCount / todayTotalCount) * 100) : 0,
        tasks: todaysTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          clientName: t.clients?.name || null,
          done: doneStageIds.has(t.stage),
        })),
      },
      weekActivity,
      monthsCount,
      squadMembers: squadMembers.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        function: p.function,
      })),
      specialProjects: ((specialProjectRows as any[]) || []).map((sp: any) => ({
        id: sp.id,
        name: sp.name,
        description: sp.description,
        startDate: sp.start_date,
        endDate: sp.end_date,
        color: sp.color,
        clientId: sp.client_id,
        squadId: sp.squad_id,
        clientName: sp.clients?.name || null,
        squadName: sp.squads?.name || null,
      })),
    };
  });

const EFFICIENCY_PERIODS = ["today", "week", "month"] as const;
type EfficiencyPeriod = (typeof EFFICIENCY_PERIODS)[number];

// Card "Eficiência" do dashboard — tempo trabalhado (via cronômetro) vs tempo
// disponível no período, só do que o usuário logado realmente trabalhou.
// Cada sessão do cronômetro já vira uma entrada em task_history (ação
// "registrou X de trabalho", com changes.session_seconds e created_at reais
// — mesma fonte já usada no "Tempo Registrado" de Projetos), então dá pra
// filtrar por período de verdade em vez de só o total acumulado da tarefa.
export const getMyEfficiencyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data?: { period?: EfficiencyPeriod }) => z.object({ period: z.enum(EFFICIENCY_PERIODS).optional() }).optional().parse(data))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const period = data?.period || "today";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodStart =
      period === "today" ? todayStart : period === "week" ? mondayOf(now) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodElapsedSeconds = Math.max(1, (now.getTime() - periodStart.getTime()) / 1000);

    const { data: historyRows } = await supabase
      .from("task_history")
      .select("task_id, changes, created_at")
      .eq("user_id", context.userId)
      .gte("created_at", periodStart.toISOString())
      .like("action", "registrou%");

    const sessions = ((historyRows as any[]) || []).filter((h) => (h.changes as any)?.session_seconds);
    if (sessions.length === 0) {
      return { period, tasks: [], squads: [], clients: [], periodElapsedSeconds };
    }

    const trackedByTask = new Map<string, number>();
    for (const s of sessions) {
      trackedByTask.set(s.task_id, (trackedByTask.get(s.task_id) || 0) + ((s.changes as any).session_seconds || 0));
    }
    const taskIds = Array.from(trackedByTask.keys());

    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id, title, stage, start_date, created_at, client_id, account_id, time_tracked_seconds")
      .in("id", taskIds);
    const tasksById = new Map(((taskRows as any[]) || []).map((t) => [t.id, t]));

    const { data: taskStagesForDone } = await supabase.from("task_stages").select("id, is_done_stage");
    const doneStageIds = new Set(((taskStagesForDone as any[]) || []).filter((s: any) => s.is_done_stage).map((s: any) => s.id));

    const { data: historyForDone } = await supabase
      .from("task_history")
      .select("task_id, action, changes, created_at")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true });
    const firstDoneAt = new Map<string, number>();
    for (const h of (historyForDone as any[]) || []) {
      if (h.action !== "editou a etapa" && h.action !== "criou a tarefa") continue;
      const toStage = (h.changes as any)?.to || (h.action === "criou a tarefa" ? (h.changes as any)?.stage : null);
      if (toStage && doneStageIds.has(toStage) && !firstDoneAt.has(h.task_id)) {
        firstDoneAt.set(h.task_id, new Date(h.created_at).getTime());
      }
    }

    const clientIds = Array.from(new Set(((taskRows as any[]) || []).map((t) => t.client_id).filter(Boolean)));
    const [{ data: clientsRows }, { data: accountsForClients }] = await Promise.all([
      clientIds.length > 0 ? supabase.from("clients").select("id, name").in("id", clientIds) : Promise.resolve({ data: [] } as any),
      clientIds.length > 0 ? supabase.from("accounts").select("id, client_id").in("client_id", clientIds) : Promise.resolve({ data: [] } as any),
    ]);
    const clientNameById = new Map(((clientsRows as any[]) || []).map((c) => [c.id, c.name]));

    // Tarefas antigas não têm account_id preenchido, só client_id — mesmo
    // fallback já usado em Gestão de Entregas: só cai na conta do cliente
    // quando ele tem uma única conta (senão seria ambíguo).
    const accountsByClient = new Map<string, string[]>();
    for (const a of (accountsForClients as any[]) || []) {
      const arr = accountsByClient.get(a.client_id) || [];
      arr.push(a.id);
      accountsByClient.set(a.client_id, arr);
    }
    const resolveAccountId = (t: any): string | null => {
      if (t.account_id) return t.account_id;
      const accs = t.client_id ? accountsByClient.get(t.client_id) : null;
      return accs && accs.length === 1 ? accs[0]! : null;
    };

    const accountIds = Array.from(
      new Set(((taskRows as any[]) || []).map((t) => resolveAccountId(t)).filter((id): id is string => !!id)),
    );
    const { data: accountSquadRows } =
      accountIds.length > 0
        ? await supabase.from("account_squads").select("account_id, squads(id, name)").in("account_id", accountIds)
        : { data: [] as any };
    const squadByAccount = new Map<string, { id: string; name: string }>();
    for (const row of (accountSquadRows as any[]) || []) {
      if (row.squads) squadByAccount.set(row.account_id, row.squads);
    }

    const taskResults = taskIds.map((taskId) => {
      const t = tasksById.get(taskId);
      const trackedSeconds = trackedByTask.get(taskId) || 0;
      if (!t) return { id: taskId, title: "Tarefa removida", trackedSeconds, elapsedDays: 0, ratioPct: null };
      const isDone = doneStageIds.has(t.stage);
      const startMs = new Date(t.start_date || t.created_at).getTime();
      const endMs = isDone && firstDoneAt.has(taskId) ? firstDoneAt.get(taskId)! : now.getTime();
      const elapsedDays = Math.max(0, (endMs - startMs) / 86400000);
      const ratioPct = elapsedDays > 0 ? Math.round(((trackedSeconds / (elapsedDays * 86400)) * 1000)) / 10 : null;
      return { id: taskId, title: t.title, trackedSeconds, elapsedDays: Math.round(elapsedDays * 10) / 10, ratioPct };
    });

    const bySquad = new Map<string, { id: string; name: string; trackedSeconds: number }>();
    const byClient = new Map<string, { id: string; name: string; trackedSeconds: number }>();
    for (const taskId of taskIds) {
      const t = tasksById.get(taskId);
      const trackedSeconds = trackedByTask.get(taskId) || 0;
      if (!t) continue;
      const resolvedAccountId = resolveAccountId(t);
      const squad = resolvedAccountId ? squadByAccount.get(resolvedAccountId) : null;
      if (squad) {
        const curr = bySquad.get(squad.id) || { id: squad.id, name: squad.name, trackedSeconds: 0 };
        curr.trackedSeconds += trackedSeconds;
        bySquad.set(squad.id, curr);
      }
      if (t.client_id) {
        const name = clientNameById.get(t.client_id) || "Cliente";
        const curr = byClient.get(t.client_id) || { id: t.client_id, name, trackedSeconds: 0 };
        curr.trackedSeconds += trackedSeconds;
        byClient.set(t.client_id, curr);
      }
    }

    const toRatio = (trackedSeconds: number) => Math.round((trackedSeconds / periodElapsedSeconds) * 1000) / 10;

    return {
      period,
      periodElapsedSeconds,
      tasks: taskResults.sort((a, b) => b.trackedSeconds - a.trackedSeconds),
      squads: Array.from(bySquad.values())
        .map((s) => ({ ...s, ratioPct: toRatio(s.trackedSeconds) }))
        .sort((a, b) => b.trackedSeconds - a.trackedSeconds),
      clients: Array.from(byClient.values())
        .map((c) => ({ ...c, ratioPct: toRatio(c.trackedSeconds) }))
        .sort((a, b) => b.trackedSeconds - a.trackedSeconds),
    };
  });
