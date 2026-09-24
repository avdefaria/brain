import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { computeRiskLevel } from "@/lib/risk-level";
import { computeOpenMrr } from "@/lib/mrr";
import { computeTaskEfficiency } from "@/lib/efficiency";

export const getClientsOverviewData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(`
        *,
        contracts (*),
        client_sales_channels (
          sales_channels (name)
        ),
        niches (name),
        receivables (status, due_date, amount, paid_at)
      `);

    if (clientsError) throw clientsError;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, function, created_at, updated_at");

    if (profilesError) throw profilesError;

    // Squad real de cada cliente vem das contas dele (accounts -> account_squads
    // -> squads), não de clients.squad_id — esse campo não é mais usado desde a
    // migração pro modelo multi-conta (0 de 6 clientes tem ele preenchido).
    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select("client_id, account_squads(squads(id, name, leader_id))");
    if (accountsError) throw accountsError;

    const { data: marketingCategory } = await (supabase.from("expense_categories" as any) as any)
      .select("id")
      .ilike("name", "marketing")
      .maybeSingle();
    let marketingPayables: { amount: number; due_date: string }[] = [];
    if ((marketingCategory as any)?.id) {
      const { data: mp } = await supabase
        .from("payables")
        .select("amount, due_date")
        .eq("category_id", (marketingCategory as any).id);
      marketingPayables = ((mp as any[]) || []).map((p) => ({ amount: Number(p.amount) || 0, due_date: p.due_date }));
    }

    const clientsTyped = (clients as any[] || []).map(c => ({
      ...c,
      risk_level: computeRiskLevel(c.health_score, c.receivables)
    }));

    // Squads reais por cliente (dedup por squad id, um cliente pode ter mais de
    // uma conta/squad).
    const squadsByClient = new Map<string, Map<string, { id: string; name: string; leader_id: string | null }>>();
    const squadsById = new Map<string, { id: string; name: string; leader_id: string | null }>();
    for (const acc of (accountsData as any[]) || []) {
      const squads = (acc.account_squads || []).map((as: any) => as.squads).filter(Boolean);
      for (const sq of squads) {
        squadsById.set(sq.id, sq);
        const bucket = squadsByClient.get(acc.client_id) || new Map();
        bucket.set(sq.id, sq);
        squadsByClient.set(acc.client_id, bucket);
      }
    }

    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59, 999);
      return {
        name: d.toLocaleString('pt-BR', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        end,
      };
    });
    const monthKeyOf = (iso: string | null) => (iso ? iso.slice(0, 7) : null);

    const activeClientsCount = clientsTyped.filter(c => c.status === 'ativo').length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClientsCount = clientsTyped.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

    const churnedClientsCount = clientsTyped.filter(c => c.status === 'inativo').length;

    // LTV médio = receita real já paga por cliente, em média (não é mais uma
    // estimativa de meses de permanência — vira R$, valor de verdade cobrado).
    const totalPaidRevenue = clientsTyped.reduce((sum, c) => {
      const paid = ((c.receivables as any[]) || []).filter((r) => r.status === 'pago');
      return sum + paid.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    }, 0);
    const avgLTV = clientsTyped.length > 0 ? Math.round(totalPaidRevenue / clientsTyped.length) : 0;

    // CAC médio = investimento total em Marketing (Contas a Pagar) / total de
    // clientes já captados. Antes lia uma coluna (`annual_revenue`) que nem
    // existe na tabela — dava sempre R$0.
    const totalMarketingSpend = marketingPayables.reduce((s, p) => s + p.amount, 0);
    const avgCAC = clientsTyped.length > 0 ? Math.round(totalMarketingSpend / clientsTyped.length) : 0;

    const clientsByState = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const state = c.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    const nicheCounts = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const niche = c.niches?.name || 'Não definido';
      acc[niche] = (acc[niche] || 0) + 1;
      return acc;
    }, {});
    const topNiches = Object.entries(nicheCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    const channelCounts = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const channels = c.client_sales_channels?.map((csc: any) => csc.sales_channels?.name).filter(Boolean) || [];
      channels.forEach((ch: string) => {
        acc[ch] = (acc[ch] || 0) + 1;
      });
      return acc;
    }, {});
    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    // Todos os gráficos mensais abaixo são derivados de datas reais
    // (start_date/created_at/cancelled_at/paid_at) — nada de Math.random()
    // nem fórmulas "chutadas" a partir do valor atual.
    const clientsMonthly = months.map((m) => ({
      name: m.name,
      value: clientsTyped.filter((c) => {
        const start = c.start_date ? new Date(c.start_date) : (c.created_at ? new Date(c.created_at) : null);
        if (!start || start > m.end) return false;
        const cancelled = c.cancelled_at ? new Date(c.cancelled_at) : null;
        return !cancelled || cancelled > m.end;
      }).length,
    }));

    const newClientsMonthly = months.map((m) => ({
      name: m.name,
      value: clientsTyped.filter((c) => monthKeyOf(c.created_at) === m.key).length,
    }));

    const churnMonthly = months.map((m) => ({
      name: m.name,
      value: clientsTyped.filter((c) => c.cancelled_at && monthKeyOf(c.cancelled_at) === m.key).length,
    }));

    // Receita média acumulada por cliente até o fim de cada mês — mesmo
    // espírito de "LTV médio" do KPI, só que evoluindo no tempo.
    const ltvMonthly = months.map((m) => {
      let paidUntilMonth = 0;
      let clientsUntilMonth = 0;
      for (const c of clientsTyped) {
        const start = c.start_date ? new Date(c.start_date) : (c.created_at ? new Date(c.created_at) : null);
        if (start && start <= m.end) clientsUntilMonth += 1;
        const paid = ((c.receivables as any[]) || []).filter((r) => r.status === 'pago' && r.paid_at && new Date(r.paid_at) <= m.end);
        paidUntilMonth += paid.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      }
      return { name: m.name, value: clientsUntilMonth > 0 ? Math.round(paidUntilMonth / clientsUntilMonth) : 0 };
    });

    const cacMonthly = months.map((m) => {
      const spend = marketingPayables.filter((p) => monthKeyOf(p.due_date) === m.key).reduce((s, p) => s + p.amount, 0);
      const newInMonth = clientsTyped.filter((c) => monthKeyOf(c.created_at) === m.key).length;
      return { name: m.name, value: newInMonth > 0 ? Math.round(spend / newInMonth) : 0 };
    });

    const riskLevels = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const risk = c.risk_level === 'medium' ? 'medium' : (c.risk_level === 'high' ? 'high' : 'low');
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0 } as Record<string, number>);

    const riskData = [
      { name: 'Baixo Risco', value: riskLevels['low'], color: 'var(--success)' },
      { name: 'Médio Risco', value: riskLevels['medium'], color: 'var(--warning)' },
      { name: 'Alto Risco', value: riskLevels['high'], color: 'var(--danger)' },
    ];

    const profilesById = new Map(((profiles as any[]) || []).map((p) => [p.id, p]));
    const activeClientIds = new Set(clientsTyped.filter((c) => c.status === 'ativo').map((c) => c.id));
    const clientIdsBySquad = new Map<string, Set<string>>();
    for (const [clientId, squads] of squadsByClient.entries()) {
      if (!activeClientIds.has(clientId)) continue; // "Contas por líder" mostra só clientes ativos
      for (const sq of squads.values()) {
        const set = clientIdsBySquad.get(sq.id) || new Set<string>();
        set.add(clientId);
        clientIdsBySquad.set(sq.id, set);
      }
    }
    const leaderStats = Array.from(squadsById.values())
      .filter((sq) => sq.leader_id)
      .map((sq) => {
        const leader = profilesById.get(sq.leader_id as string);
        return {
          name: (leader?.full_name as string) || 'Sem líder',
          count: clientIdsBySquad.get(sq.id)?.size || 0,
          avatar: (leader?.avatar_url as string) || null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const squadStats = new Map<string, { name: string; totalScore: number; count: number }>();
    for (const c of clientsTyped) {
      const clientSquads = squadsByClient.get(c.id);
      const names = clientSquads && clientSquads.size > 0 ? Array.from(clientSquads.values()).map((s) => s.name) : ['Sem Squad'];
      for (const name of names) {
        const bucket = squadStats.get(name) || { name, totalScore: 0, count: 0 };
        bucket.totalScore += c.health_score || 0;
        bucket.count += 1;
        squadStats.set(name, bucket);
      }
    }
    const squadHealthData = Array.from(squadStats.values()).map((s) => ({
      name: s.name,
      score: Math.round(s.totalScore / s.count),
    }));

    const priorityClients = clientsTyped
      .filter(c => c.status === 'ativo')
      .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
      .slice(0, 5)
      .map(c => {
        const clientSquads = squadsByClient.get(c.id);
        const firstSquadName = clientSquads && clientSquads.size > 0 ? Array.from(clientSquads.values())[0]!.name : 'N/A';
        return {
          id: c.id as string,
          name: c.name as string,
          niche: (c.niches as any)?.name || 'N/A',
          health_score: c.health_score as number || 0,
          risk_level: c.risk_level as string || 'low',
          responsible: firstSquadName,
          cac: avgCAC,
          contract_end: c.end_date_expected as string
        };
      });

    return {
      kpis: {
        active: activeClientsCount,
        new: newClientsCount,
        churn: churnedClientsCount,
        ltv: avgLTV,
        cac: avgCAC
      },
      charts: {
        clientsMonthly,
        ltvMonthly,
        newClientsMonthly,
        cacMonthly,
        churnMonthly,
        riskData
      },
      clientsByState,
      topNiches,
      topChannels,
      leaderStats,
      squadHealthData,
      priorityClients,
      totalClients: activeClientsCount
    };
  });

export const getChurnAnalysisData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { 
    startDate?: string | null, 
    endDate?: string | null,
    reasons?: string[] | null
  }) => z.object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    reasons: z.array(z.string()).nullable().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const [{ data: churned, error: churnedError }, { count: totalClientsEver, error: countError }] = await Promise.all([
      supabase
        .from("clients")
        .select(`*, churn_reasons(id, name), contracts(*)`)
        .eq("status", "inativo"),
      supabase.from("clients").select("id", { count: "exact", head: true }),
    ]);
    if (churnedError) throw churnedError;
    if (countError) throw countError;

    const revenueLostForClient = (c: any) => computeOpenMrr(c.contracts, { onlyActive: false });

    let churnedClients = (churned || []) as any[];
    if (data.startDate) {
      churnedClients = churnedClients.filter((c) => c.cancelled_at && new Date(c.cancelled_at) >= new Date(data.startDate as string));
    }
    if (data.endDate) {
      churnedClients = churnedClients.filter((c) => c.cancelled_at && new Date(c.cancelled_at) <= new Date(data.endDate as string));
    }
    if (data.reasons && data.reasons.length > 0) {
      churnedClients = churnedClients.filter((c) => data.reasons!.includes(c.churn_reasons?.name));
    }

    // KPIs
    const totalChurn = churnedClients.length;
    const churnRate = (totalClientsEver || 0) > 0 ? (totalChurn / (totalClientsEver as number)) * 100 : 0;
    const revenueLost = churnedClients.reduce((sum, c) => sum + revenueLostForClient(c), 0);

    const timesToChurn = churnedClients
      .filter(c => c.start_date && c.cancelled_at)
      .map(c => {
        const start = new Date(c.start_date as string);
        const end = new Date(c.cancelled_at as string);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      });
    const avgTimeToChurn = timesToChurn.length > 0
      ? Math.round(timesToChurn.reduce((a, b) => a + b, 0) / timesToChurn.length)
      : 0;

    const reasonCounts = churnedClients.reduce((acc: Record<string, number>, c) => {
      const reason = c.churn_reasons?.name || 'Outros';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
    const churnByReason = Object.entries(reasonCounts).map(([name, value]) => ({ name, value }));

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('pt-BR', { month: 'short' }) };
    });
    const churnMonthly = months.map(({ key, label }) => {
      const count = churnedClients.filter((c) => {
        if (!c.cancelled_at) return false;
        const d = new Date(c.cancelled_at);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
      return { name: label, value: count };
    });

    const recentChurn = churnedClients
      .sort((a, b) => {
        const timeA = a.cancelled_at ? new Date(a.cancelled_at).getTime() : 0;
        const timeB = b.cancelled_at ? new Date(b.cancelled_at).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 8)
      .map(c => ({
        name: c.name,
        date: c.cancelled_at ? new Date(c.cancelled_at).toLocaleDateString('pt-BR') : '--',
        type: c.contracts?.[0]?.type === 'recurring' ? 'Recorrente' : 'Avulso',
        value: revenueLostForClient(c),
        reason: c.churn_reasons?.name || 'Outros'
      }));

    return {
      kpis: [
        { label: "Taxa de Churn", value: `${churnRate.toFixed(1)}%`, change: "Da base total", trending: "down" },
        { label: "Total de Churn", value: totalChurn.toString(), change: "Período", trending: "down" },
        { label: "Tempo Médio até Churn", value: `${avgTimeToChurn} meses`, change: "Real", trending: "up" },
        { label: "Receita Perdida", value: revenueLost, change: "Mensal", trending: "down" },
      ],
      charts: {
        churnMonthly,
        churnByReason
      },
      recentChurn,
    };
  });

export const getChurnReasons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("churn_reasons")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  });

export const updateClientStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    id: string,
    status: 'onboarding' | 'ativo' | 'em_aviso' | 'pausado' | 'inativo',
    churnReasonId?: string
  }) => z.object({
    id: z.string(),
    status: z.enum(['onboarding', 'ativo', 'em_aviso', 'pausado', 'inativo']),
    churnReasonId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const updatePayload: any = { status: data.status };

    if (data.status === 'inativo') {
      updatePayload.cancelled_at = new Date().toISOString();
      if (data.churnReasonId) {
        updatePayload.churn_reason_id = data.churnReasonId;
      }
    } else {
      updatePayload.cancelled_at = null;
      updatePayload.churn_reason_id = null;
    }

    const { error } = await supabase
      .from("clients")
      .update(updatePayload)
      .eq("id", data.id);

    if (error) throw error;

    if (data.status === 'inativo') {
      // Cancela contrato(s) e recebíveis ainda pendentes — mantém o histórico
      // (linhas não são apagadas, recebíveis já pagos continuam 'pago') pra
      // não perder o controle do MRR perdido na Análise de Churn, mas tira
      // essas contas de "Total a Receber"/MRR corrente daqui pra frente.
      const { data: clientContracts, error: contractsFetchError } = await supabase
        .from("contracts")
        .select("id")
        .eq("client_id", data.id)
        .eq("status", "active");
      if (contractsFetchError) throw contractsFetchError;

      const contractIds = ((clientContracts as any[]) || []).map((c) => c.id);
      if (contractIds.length > 0) {
        const { error: cancelContractsError } = await supabase
          .from("contracts")
          .update({ status: "cancelled" })
          .in("id", contractIds);
        if (cancelContractsError) throw cancelContractsError;
      }

      // Cancela também recebíveis pendentes ligados direto ao cliente sem
      // contrato (lançamentos avulsos/pontuais), não só os de contrato.
      const { error: cancelReceivablesError } = await supabase
        .from("receivables")
        .update({ status: "cancelado" })
        .eq("client_id", data.id)
        .eq("status", "pendente");
      if (cancelReceivablesError) throw cancelReceivablesError;
    }

    // accounts.status usa um enum separado e mais simples (active/inactive/
    // churn) — mantido em sincronia com o novo lifecycle do cliente, senão
    // Gestão de Entregas continua mostrando "Ativo" pra cliente já inativo.
    // Mesmo critério já usado em deliverables.functions.ts: só onboarding/ativo
    // contam como "active", o resto (em_aviso/pausado/inativo) é "inactive".
    const { error: accountsSyncError } = await supabase
      .from("accounts")
      .update({ status: ["ativo", "onboarding"].includes(data.status) ? "active" : "inactive" } as any)
      .eq("client_id", data.id);
    if (accountsSyncError) throw accountsSyncError;

    return { success: true };
  });

export const getClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((clientId: string) => z.string().uuid().parse(clientId))
  .handler(async ({ data: clientId, context }) => {
    const supabase = context.supabase;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(`
        *,
        niches:niche_id(id, name),
        client_sales_channels(sales_channels:sales_channel_id(id, name)),
        accounts(
          id, account_name, status, health_score,
          account_squads(squads(id, name, color)),
          contracts(id, type, monthly_value, total_value, start_date, renewal_date, payment_method, status)
        )
      `)
      .eq("id", clientId)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) throw new Error("Cliente não encontrado");

    const accountIds = ((client as any).accounts || []).map((a: any) => a.id);

    const [{ data: taskStages }, { data: tasks }, { data: receivables }, { data: surveys }, { data: calls }] = await Promise.all([
      supabase.from("task_stages").select("id, is_done_stage"),
      accountIds.length > 0 || true
        ? supabase
            .from("tasks")
            .select("id, title, deadline, stage, account_id, client_id, start_date, created_at, time_tracked_seconds")
            .or(`client_id.eq.${clientId}${accountIds.length > 0 ? "," + accountIds.map((id: string) => `account_id.eq.${id}`).join(",") : ""}`)
        : Promise.resolve({ data: [] } as any),
      supabase.from("receivables").select("amount, status, paid_at").eq("client_id", clientId),
      (supabase.from("health_score_surveys" as any) as any)
        .select("id, relacionamento, entregas_prazo, satisfacao, score, created_at, conducted_by, profiles:conducted_by(full_name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true }),
      (supabase.from("client_calls" as any) as any)
        .select("id, description, occurred_at, created_at, created_by, profiles:created_by(full_name)")
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false }),
    ]);

    const doneStageIds = new Set(((taskStages as any[]) || []).filter((s) => s.is_done_stage).map((s) => s.id));
    const allTasks = (tasks as any[]) || [];

    // Eficiência de execução (tempo trabalhado vs corrido) — mesmo critério
    // usado nos agregados de squad/usuário, escopado às tarefas desse cliente.
    const clientTaskIds = allTasks.map((t) => t.id);
    const { data: clientTaskHistory } = clientTaskIds.length > 0
      ? await supabase.from("task_history").select("task_id, action, changes, created_at").in("task_id", clientTaskIds).order("created_at", { ascending: true })
      : { data: [] as any };
    const firstDoneAtByTask = new Map<string, number>();
    for (const h of (clientTaskHistory as any[]) || []) {
      if (h.action !== "editou a etapa" && h.action !== "criou a tarefa") continue;
      const toStage = (h.changes as any)?.to || (h.action === "criou a tarefa" ? (h.changes as any)?.stage : null);
      if (toStage && doneStageIds.has(toStage) && !firstDoneAtByTask.has(h.task_id)) {
        firstDoneAtByTask.set(h.task_id, new Date(h.created_at).getTime());
      }
    }
    let executionTrackedSeconds = 0;
    let executionElapsedSeconds = 0;
    for (const t of allTasks) {
      const isDone = doneStageIds.has(t.stage);
      const eff = computeTaskEfficiency({
        startDate: t.start_date,
        createdAt: t.created_at,
        isDone,
        completedAtMs: isDone ? (firstDoneAtByTask.get(t.id) ?? null) : null,
        timeTrackedSeconds: t.time_tracked_seconds,
      });
      executionTrackedSeconds += eff.trackedSeconds;
      executionElapsedSeconds += eff.elapsedDays * 86400;
    }
    const executionRatioPct = executionElapsedSeconds > 0 ? Math.round((executionTrackedSeconds / executionElapsedSeconds) * 1000) / 10 : null;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcomingDeliveries = allTasks
      .filter((t) => !doneStageIds.has(t.stage) && t.deadline)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.title, deadline: t.deadline, overdue: new Date(t.deadline) < today }));

    const accounts = ((client as any).accounts || []) as any[];
    const primaryAccount = accounts[0] || null;
    const activeContract = primaryAccount?.contracts?.find((c: any) => c.status === "active" && c.type === "recurring") || primaryAccount?.contracts?.[0] || null;
    const squadsResponsaveis = Array.from(
      new Map(
        accounts.flatMap((a: any) => (a.account_squads || []).map((as: any) => as.squads).filter(Boolean)).map((s: any) => [s.id, s])
      ).values()
    );

    const valorPago = ((receivables as any[]) || []).filter((r) => r.status === "pago").reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const surveyList = (surveys as any[]) || [];
    const latestSurvey = surveyList[surveyList.length - 1] || null;
    const healthScoreHistory = surveyList.map((s) => ({ date: s.created_at, score: s.score }));
    const daysSinceLastSurvey = latestSurvey ? Math.floor((Date.now() - new Date(latestSurvey.created_at).getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      id: client.id,
      name: (client as any).name,
      cnpj_cpf: (client as any).cnpj_cpf,
      corporate_email: (client as any).corporate_email,
      contact_name: (client as any).contact_name,
      contact_whatsapp: (client as any).contact_whatsapp,
      address: (client as any).address,
      city: (client as any).city,
      state: (client as any).state,
      status: (client as any).status,
      niche: (client as any).niches?.name || null,
      channels: ((client as any).client_sales_channels || []).map((c: any) => c.sales_channels?.name).filter(Boolean),
      healthScore: latestSurvey ? latestSurvey.score : ((client as any).health_score ?? null),
      healthScoreHistory,
      daysSinceLastSurvey,
      lastSurvey: latestSurvey,
      contract: activeContract ? {
        type: activeContract.type === "recurring" ? "Recorrente" : "Avulso",
        monthlyValue: Number(activeContract.monthly_value) || 0,
        totalValue: Number(activeContract.total_value) || 0,
        startDate: activeContract.start_date,
        renewalDate: activeContract.renewal_date,
        valorPago,
      } : null,
      upcomingDeliveries,
      squads: squadsResponsaveis,
      calls: (calls as any[] || []).map((c) => ({ id: c.id, description: c.description, occurredAt: c.occurred_at, createdByName: c.profiles?.full_name || null })),
      execution: {
        trackedSeconds: executionTrackedSeconds,
        elapsedDays: Math.round((executionElapsedSeconds / 86400) * 10) / 10,
        ratioPct: executionRatioPct,
      },
    };
  });

const clientCallSchema = z.object({
  clientId: z.string().uuid(),
  description: z.string().trim().min(1, "Descreva o chamado"),
  occurredAt: z.string().optional(),
});

export const createClientCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clientId: string; description: string; occurredAt?: string }) => clientCallSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: userData } = await supabase.auth.getUser();
    const { data: created, error } = await (supabase.from("client_calls" as any) as any)
      .insert({
        client_id: data.clientId,
        description: data.description.trim(),
        occurred_at: data.occurredAt || new Date().toISOString().slice(0, 10),
        created_by: userData?.user?.id || null,
      })
      .select()
      .single();
    if (error) throw error;
    return created;
  });

const healthScoreSurveySchema = z.object({
  clientId: z.string().uuid(),
  relacionamento: z.number().int().min(0).max(10),
  entregasPrazo: z.number().int().min(0).max(10),
  satisfacao: z.number().int().min(0).max(10),
});

export const createHealthScoreSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clientId: string; relacionamento: number; entregasPrazo: number; satisfacao: number }) => healthScoreSurveySchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: userData } = await supabase.auth.getUser();
    const score = Math.round(((data.relacionamento + data.entregasPrazo + data.satisfacao) / 3) * 10);
    const { data: created, error } = await (supabase.from("health_score_surveys" as any) as any)
      .insert({
        client_id: data.clientId,
        relacionamento: data.relacionamento,
        entregas_prazo: data.entregasPrazo,
        satisfacao: data.satisfacao,
        score,
        conducted_by: userData?.user?.id || null,
      })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("clients").update({ health_score: score }).eq("id", data.clientId);
    return created;
  });

export const createChurnReason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { name: string }) => z.object({
    name: z.string().min(1)
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: reason, error } = await supabase
      .from("churn_reasons")
      .insert({ name: data.name })
      .select()
      .single();

    if (error) throw error;
    return reason;
  });