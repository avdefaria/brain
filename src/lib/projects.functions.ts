import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logSecurityEvent } from "./security-logger";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeTaskEfficiency } from "./efficiency";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const getProjectsOverviewData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    // 1. Squads com líder e contas vinculadas via account_squads
    const { data: squadsData, error: squadsError } = await supabase
      .from('squads')
      .select(`
        *,
        account_squads (
          accounts (
            id,
            account_name,
            client_id,
            clients ( id, name, health_score )
          )
        )
      `);
    if (squadsError) throw squadsError;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, function, avatar_url, birth_date');
    if (profilesError) throw profilesError;

    const { data: profileSquadRows } = await (supabase.from('profile_squads' as any) as any).select('profile_id, squad_id');
    const squadIdsByProfile = new Map<string, string[]>();
    const profileIdsBySquad = new Map<string, string[]>();
    for (const row of ((profileSquadRows as any[]) || [])) {
      const pIds = profileIdsBySquad.get(row.squad_id) || [];
      pIds.push(row.profile_id);
      profileIdsBySquad.set(row.squad_id, pIds);
      const sIds = squadIdsByProfile.get(row.profile_id) || [];
      sIds.push(row.squad_id);
      squadIdsByProfile.set(row.profile_id, sIds);
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, stage, deadline, client_id, account_id, is_internal, created_at, start_date, time_tracked_seconds, task_assignees(user_id)');
    if (tasksError) throw tasksError;

    const { data: taskStages, error: stagesError } = await supabase
      .from('task_stages')
      .select('id, position, is_done_stage')
      .order('position', { ascending: true });
    if (stagesError) throw stagesError;

    const { data: taskHistory } = await supabase
      .from('task_history')
      .select('task_id, action, changes, created_at')
      .order('created_at', { ascending: true });

    // --- Classificação de tarefas: concluída / atrasada / pendente / em andamento ---
    const doneStageIds = new Set((taskStages || []).filter(s => s.is_done_stage).map(s => s.id));
    const firstOpenPosition = Math.min(
      ...(taskStages || []).filter(s => !s.is_done_stage).map(s => s.position),
      Infinity
    );
    const firstOpenStageIds = new Set(
      (taskStages || []).filter(s => !s.is_done_stage && s.position === firstOpenPosition).map(s => s.id)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function classify(t: any): 'completed' | 'overdue' | 'pending' | 'inProgress' {
      if (doneStageIds.has(t.stage)) return 'completed';
      if (t.deadline && new Date(t.deadline) < today) return 'overdue';
      if (firstOpenStageIds.has(t.stage)) return 'pending';
      return 'inProgress';
    }

    const allTasks = tasks || [];
    const bucket = (list: any[]) => {
      const out = { total: list.length, completed: 0, overdue: 0, pending: 0, inProgress: 0 };
      for (const t of list) {
        const c = classify(t);
        out[c]++;
      }
      return out;
    };

    const internalTasks = allTasks.filter((t: any) => t.is_internal);
    const externalTasks = allTasks.filter((t: any) => !t.is_internal);

    // --- KPIs gerais (todas as tarefas, interna + externa) ---
    const completionRate = allTasks.length > 0
      ? Math.round((allTasks.filter(t => doneStageIds.has(t.stage)).length / allTasks.length) * 100)
      : 0;
    const productivity = allTasks.filter(t => doneStageIds.has(t.stage)).length;
    const trackedSeconds = allTasks.reduce((sum: number, t: any) => sum + (t.time_tracked_seconds || 0), 0);
    // Agências pequenas registram poucas horas por tarefa — arredondar direto
    // pra hora com 1 casa faz qualquer coisa abaixo de ~3min virar "0h".
    // Formata no menor tempo com dado (minutos), só sobe pra hora quando faz sentido.
    const trackedTimeLabel = trackedSeconds < 60
      ? `${trackedSeconds}s`
      : trackedSeconds < 3600
        ? `${Math.round(trackedSeconds / 60)}m`
        : `${Math.round((trackedSeconds / 3600) * 10) / 10}h`;

    // --- Progresso ao longo do tempo: últimos 7 dias, % concluído até cada dia ---
    // "Concluído até o dia X" = primeira vez que a tarefa entrou num status de
    // is_done_stage, lido do histórico (task_history). Sem entrada no
    // histórico mas já concluída (dado legado) conta desde a criação.
    const firstDoneAt = new Map<string, number>();
    for (const h of (taskHistory || [])) {
      if (h.action !== 'editou a etapa' && h.action !== 'criou a tarefa') continue;
      const toStage = (h.changes as any)?.to || (h.action === 'criou a tarefa' ? (h.changes as any)?.stage : null);
      if (toStage && doneStageIds.has(toStage) && !firstDoneAt.has(h.task_id)) {
        firstDoneAt.set(h.task_id, new Date(h.created_at).getTime());
      }
    }

    const progressOverTime = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const endOfDay = new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1);
      const createdByThen = allTasks.filter(t => new Date(t.created_at).getTime() <= endOfDay.getTime());
      const doneByThen = createdByThen.filter(t => {
        const doneAt = firstDoneAt.get(t.id);
        if (doneAt !== undefined) return doneAt <= endOfDay.getTime();
        return doneStageIds.has(t.stage); // dado legado sem histórico de transição
      });
      return {
        label: WEEKDAY_LABELS[day.getDay()],
        value: createdByThen.length > 0 ? Math.round((doneByThen.length / createdByThen.length) * 100) : 0,
      };
    });

    // --- Mini-tendências dos KPIs do topo (últimos 7 dias, tudo dado real) ---
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return { start: day.getTime(), end: day.getTime() + 24 * 60 * 60 * 1000 - 1 };
    });

    // Produtividade: quantas tarefas foram concluídas NAQUELE dia (não acumulado).
    const productivityTrend = last7Days.map(({ start, end }) =>
      allTasks.filter(t => {
        const doneAt = firstDoneAt.get(t.id);
        return doneAt !== undefined && doneAt >= start && doneAt <= end;
      }).length
    );

    // Tempo registrado: soma de segundos de sessões de cronômetro lançadas
    // naquele dia (task_history de "registrou X de trabalho").
    const trackedByDay = new Map<string, number>();
    for (const h of (taskHistory || [])) {
      if (!h.action?.startsWith('registrou')) continue;
      const seconds = (h.changes as any)?.session_seconds || 0;
      const dayKey = new Date(h.created_at).toDateString();
      trackedByDay.set(dayKey, (trackedByDay.get(dayKey) || 0) + seconds);
    }
    // Em minutos (não horas) pra não achatar tudo em zero com pouco volume.
    const trackedTimeTrend = last7Days.map(({ start }) => {
      const seconds = trackedByDay.get(new Date(start).toDateString()) || 0;
      return Math.round(seconds / 60);
    });

    // Progresso (média dos squads) por dia: reaproveita a mesma classificação
    // "concluída até aquele dia", só que escopada às tarefas externas de cada squad.
    const squadExternalTasksMap = (squadsData || []).map(s => {
      const squadAccounts = ((s as any).account_squads || []).map((as: any) => as.accounts).filter(Boolean);
      const squadAccountIds = squadAccounts.map((a: any) => a.id);
      const squadClientIds = new Set(squadAccounts.map((a: any) => a.clients?.id).filter(Boolean));
      return externalTasks.filter((t: any) =>
        squadAccountIds.includes(t.account_id) || (!t.account_id && squadClientIds.has(t.client_id))
      );
    });
    const progressTrend = last7Days.map(({ end }) => {
      const perSquad = squadExternalTasksMap.map(list => {
        const createdByThen = list.filter((t: any) => new Date(t.created_at).getTime() <= end);
        if (createdByThen.length === 0) return null;
        const doneByThen = createdByThen.filter((t: any) => {
          const doneAt = firstDoneAt.get(t.id);
          if (doneAt !== undefined) return doneAt <= end;
          return doneStageIds.has(t.stage);
        });
        return Math.round((doneByThen.length / createdByThen.length) * 100);
      }).filter((v): v is number => v !== null);
      return perSquad.length > 0 ? Math.round(perSquad.reduce((a, b) => a + b, 0) / perSquad.length) : 0;
    });

    const trendDelta = (series: number[]) => series.length > 1 ? Math.round((series[series.length - 1] - series[0]) * 10) / 10 : 0;

    // --- Distribuição das tarefas (todas) ---
    const dist = bucket(allTasks);
    const taskDistribution = {
      total: dist.total,
      completed: dist.completed,
      inProgress: dist.inProgress,
      pending: dist.pending,
      overdue: dist.overdue,
    };

    // --- Distribuição de carga por pessoa: tarefas ativas (não concluídas) ---
    const activeCountByUser = new Map<string, number>();
    for (const t of allTasks) {
      if (doneStageIds.has(t.stage)) continue;
      for (const a of (t.task_assignees || [])) {
        activeCountByUser.set(a.user_id, (activeCountByUser.get(a.user_id) || 0) + 1);
      }
    }
    const maxActive = Math.max(1, ...Array.from(activeCountByUser.values()));
    const workload = Array.from(activeCountByUser.entries())
      .map(([userId, count]) => {
        const profile = (profiles || []).find(p => p.id === userId);
        return {
          userId,
          name: profile?.full_name || "Sem nome",
          avatar: profile?.avatar_url || null,
          count,
          pct: Math.round((count / maxActive) * 100),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // --- Desempenho do time: tarefas concluídas por pessoa, por dia (últimos 7 dias) ---
    const doneByUserByDay = new Map<string, number[]>();
    for (const t of allTasks) {
      const doneAt = firstDoneAt.get(t.id);
      if (doneAt === undefined) continue;
      const dayIndex = last7Days.findIndex(d => doneAt >= d.start && doneAt <= d.end);
      if (dayIndex === -1) continue;
      for (const a of (t.task_assignees || [])) {
        const arr = doneByUserByDay.get(a.user_id) || [0, 0, 0, 0, 0, 0, 0];
        arr[dayIndex]++;
        doneByUserByDay.set(a.user_id, arr);
      }
    }
    const teamPerformance = Array.from(doneByUserByDay.entries())
      .map(([userId, days]) => {
        const profile = (profiles || []).find(p => p.id === userId);
        return {
          userId,
          name: profile?.full_name || "Sem nome",
          avatar: profile?.avatar_url || null,
          days,
          total: days.reduce((a, b) => a + b, 0),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Eficiência agregada (tempo trabalhado vs corrido) de uma lista de
    // tarefas — soma os segundos brutos em vez de tirar média das razões
    // individuais, pra uma tarefa com pouquíssimo tempo corrido não pesar
    // desproporcionalmente no agregado.
    function aggregateEfficiency(list: any[]) {
      let trackedSeconds = 0;
      let elapsedSeconds = 0;
      for (const t of list) {
        const isDone = doneStageIds.has(t.stage);
        const eff = computeTaskEfficiency({
          startDate: (t as any).start_date,
          createdAt: t.created_at,
          isDone,
          completedAtMs: isDone ? (firstDoneAt.get(t.id) ?? null) : null,
          timeTrackedSeconds: (t as any).time_tracked_seconds,
        });
        trackedSeconds += eff.trackedSeconds;
        elapsedSeconds += eff.elapsedDays * 86400;
      }
      const ratioPct = elapsedSeconds > 0 ? Math.round((trackedSeconds / elapsedSeconds) * 1000) / 10 : null;
      return { trackedSeconds, elapsedDays: Math.round((elapsedSeconds / 86400) * 10) / 10, ratioPct };
    }

    // --- Squads ---
    const processedSquads = (squadsData || []).map(s => {
      const squadMemberIds = new Set(profileIdsBySquad.get(s.id) || []);
      const squadProfiles = (profiles || []).filter(p => squadMemberIds.has(p.id));
      const leader = (profiles || []).find(p => p.id === (s as any).leader_id) || squadProfiles[0] || null;

      const squadAccounts = (s.account_squads || []).map((as: any) => as.accounts).filter(Boolean);
      const squadAccountIds = squadAccounts.map((a: any) => a.id);
      const squadClientIds = new Set(squadAccounts.map((a: any) => a.clients?.id).filter(Boolean));

      // accounts.health_score nunca é preenchido (coluna morta) — o real é
      // clients.health_score, atualizado via pesquisas de Health Score.
      const totalHealth = squadAccounts.reduce((acc: number, curr: any) => acc + (curr.clients?.health_score || 0), 0);
      const avgHealth = squadAccounts.length > 0 ? Math.round(totalHealth / squadAccounts.length) : null;

      // Tarefas dessa conta: por account_id direto, ou por client_id quando a
      // tarefa é antiga e não tem account_id (mesma regra usada em Gestão de Entregas).
      const squadTasks = externalTasks.filter((t: any) =>
        squadAccountIds.includes(t.account_id) || (!t.account_id && squadClientIds.has(t.client_id))
      );
      const squadBucket = bucket(squadTasks);
      const progress = squadBucket.total > 0 ? Math.round((squadBucket.completed / squadBucket.total) * 100) : 0;
      const efficiency = aggregateEfficiency(squadTasks);

      return {
        id: s.id,
        name: s.name,
        color: (s as any).color || 'var(--violet-500)',
        leader: leader ? {
          id: leader.id,
          name: leader.full_name,
          role: leader.function,
          avatar: leader.avatar_url
        } : null,
        membersCount: squadProfiles.length,
        accountsCount: squadAccounts.length,
        companiesCount: squadClientIds.size,
        healthScore: avgHealth || 0,
        progress,
        deliveries: squadBucket.completed,
        totalDeliveries: squadBucket.total,
        pending: squadBucket.pending + squadBucket.inProgress,
        late: squadBucket.overdue,
        efficiency,
      };
    });

    const { data: events } = await supabase
      .from('company_events' as any)
      .select('*')
      .order('date');

    const { data: specialProjects } = await supabase
      .from('special_projects' as any)
      .select('*, client:client_id(name), squad:squad_id(name, color)')
      .order('start_date');

    return {
      kpis: {
        completionRate,
        productivity,
        progress: processedSquads.length > 0
          ? Math.round(processedSquads.reduce((sum, s) => sum + s.progress, 0) / processedSquads.length)
          : completionRate,
        trackedTimeLabel,
        trends: {
          completionRate: progressOverTime.map(p => p.value),
          productivity: productivityTrend,
          progress: progressTrend,
          trackedTime: trackedTimeTrend,
        },
        deltas: {
          completionRate: trendDelta(progressOverTime.map(p => p.value)),
          productivity: trendDelta(productivityTrend),
          progress: trendDelta(progressTrend),
          trackedTime: trendDelta(trackedTimeTrend),
        },
      },
      squads: processedSquads,
      internalStats: bucket(internalTasks),
      externalStats: bucket(externalTasks),
      progressOverTime,
      taskDistribution,
      workload,
      teamPerformance,
      events: events || [],
      birthdays: (profiles || []).filter(p => p.birth_date).map(p => ({
        name: `Aniversário: ${p.full_name}`,
        date: p.birth_date,
        type: 'birthday'
      })),
      specialProjects: specialProjects || []
    };
  });

export const createSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string(),
    color: z.string(),
    leader_id: z.string().optional()
  }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('squads')
      .insert({
        name: data.name,
        color: data.color,
        leader_id: data.leader_id
      } as any);

    if (error) {
      await logSecurityEvent({
        action: 'INSERT',
        tableName: 'squads',
        details: data,
        errorMessage: error.message
      });
      throw error;
    }
    return { success: true };
  });

export const updateSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    leader_id: z.string().optional()
  }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('squads')
      .update({
        name: data.name,
        color: data.color,
        leader_id: data.leader_id
      } as any)
      .eq('id', data.id);

    if (error) {
      await logSecurityEvent({
        action: 'UPDATE',
        tableName: 'squads',
        recordId: data.id,
        details: data,
        errorMessage: error.message
      });
      throw error;
    }
    return { success: true };
  });

export const deleteSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', data.id);

    if (error) {
      await logSecurityEvent({
        action: 'DELETE',
        tableName: 'squads',
        recordId: data.id,
        errorMessage: error.message
      });
      throw error;
    }
    return { success: true };
  });

export const createSpecialProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    name: z.string(),
    client_id: z.string(),
    squad_id: z.string().optional(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string().optional(),
    color: z.string().optional()
  }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('special_projects' as any)
      .insert(data);

    if (error) throw error;
    return { success: true };
  });

export const updateSpecialProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string(),
    name: z.string(),
    client_id: z.string(),
    squad_id: z.string().optional(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string().optional(),
    color: z.string().optional()
  }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { id, ...update } = data;
    const { error } = await supabase
      .from('special_projects' as any)
      .update(update)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  });

export const deleteSpecialProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('special_projects' as any)
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });
