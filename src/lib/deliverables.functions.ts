import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getDeliverableTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("deliverable_types")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  });

export const createDeliverableType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: type, error } = await supabase
      .from("deliverable_types")
      .insert({ name: data.name.trim() })
      .select("*")
      .single();

    if (error) throw error;
    return type;
  });

export const getDeliveriesByAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    typeId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select(`
        id,
        account_name,
        health_score,
        status,
        client_id,
        clients (
          id,
          name,
          status,
          health_score
        ),
        account_squads (
          squads (
            id,
            name,
            color
          )
        ),
        contracts (
          id,
          renewal_date,
          status
        )
      `);

    if (accountsError) throw accountsError;

    const { data: internalTargets, error: internalTargetsError } = await supabase
      .from("internal_targets")
      .select("id, name")
      .order("name");
    if (internalTargetsError) throw internalTargetsError;

    let query = supabase.from("tasks").select("id, stage, deliverable_type_id, client_id, account_id, is_internal, internal_target_id");

    if (data.typeId && data.typeId !== 'all') {
      query = query.eq("deliverable_type_id", data.typeId);
    }

    const { data: tasks, error: tasksError } = await query;
    if (tasksError) throw tasksError;

    // "Concluído" não é sempre o stage literal "done" — qualquer status
    // customizado marcado como is_done_stage conta como entrega concluída.
    const { data: doneStages } = await supabase
      .from("task_stages")
      .select("id")
      .eq("is_done_stage", true);
    const doneStageIds = new Set((doneStages || []).map((s: any) => s.id));

    const externalTasks = tasks.filter(t => !(t as any).is_internal);
    const internalTasks = tasks.filter(t => (t as any).is_internal);

    // Tarefas antigas sem account_id só "caem" na conta do cliente quando
    // esse cliente tem uma única conta — com múltiplas contas por cliente,
    // essa herança automática duplicaria a mesma tarefa em todas elas.
    const accountCountByClient = new Map<string, number>();
    for (const acc of accountsData) {
      accountCountByClient.set(acc.client_id, (accountCountByClient.get(acc.client_id) || 0) + 1);
    }

    const externalCards = accountsData.map((acc: any) => {
      const clientHasSingleAccount = accountCountByClient.get(acc.client_id) === 1;
      const clientTasks = externalTasks.filter(t => t.account_id === acc.id || (!t.account_id && clientHasSingleAccount && t.client_id === acc.client_id));
      const total = clientTasks.length;
      const completed = clientTasks.filter(t => doneStageIds.has(t.stage)).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      return {
        id: acc.id,
        name: acc.account_name || acc.clients?.name || "Sem nome",
        clientName: acc.clients?.name || "Sem cliente",
        // accounts.health_score nunca é preenchido (coluna morta) — o real é
        // clients.health_score, atualizado via pesquisas de Health Score.
        healthScore: acc.clients?.health_score ?? 0,
        // Se a conta nunca teve status próprio definido, cai no status do
        // cliente em vez de aparentar "Inativo" por engano. `clients.status` usa
        // o ciclo de vida novo (onboarding/ativo/em_aviso/pausado/inativo) — mapeado
        // pro conceito simples ativo/inativo que esse badge usa.
        status: acc.status || (acc.clients?.status && ['ativo', 'onboarding'].includes(acc.clients.status) ? 'active' : acc.clients?.status ? 'inactive' : 'active'),
        squads: acc.account_squads?.map((as: any) => as.squads).filter(Boolean) || [],
        contract: acc.contracts?.[0] || null,
        totalTasks: total,
        completedTasks: completed,
        progress,
        client_id: acc.client_id,
        isInternal: false,
      };
    });

    // Demanda interna (sem cliente) entra como um card por frente — mesma
    // forma dos cards de conta, sem contrato/health score (não se aplicam).
    const internalCards = internalTargets.map((target: any) => {
      const targetTasks = internalTasks.filter(t => (t as any).internal_target_id === target.id);
      const total = targetTasks.length;
      const completed = targetTasks.filter(t => doneStageIds.has(t.stage)).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      return {
        id: target.id,
        name: target.name,
        clientName: "Ongo Agency",
        healthScore: null,
        status: null,
        squads: [],
        contract: null,
        totalTasks: total,
        completedTasks: completed,
        progress,
        client_id: null,
        isInternal: true,
      };
    });

    // Tarefas internas sem frente definida ainda contam em algum lugar.
    const untargeted = internalTasks.filter(t => !(t as any).internal_target_id);
    if (untargeted.length > 0) {
      const completed = untargeted.filter(t => doneStageIds.has(t.stage)).length;
      internalCards.push({
        id: "sem-frente",
        name: "Sem frente definida",
        clientName: "Ongo Agency",
        healthScore: null,
        status: null,
        squads: [],
        contract: null,
        totalTasks: untargeted.length,
        completedTasks: completed,
        progress: untargeted.length > 0 ? (completed / untargeted.length) * 100 : 0,
        client_id: null,
        isInternal: true,
      });
    }

    return [...externalCards, ...internalCards];
  });

export const getDeliverablesProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    accountId: z.string().optional(),
    typeId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    
    const { data: types, error: typesError } = await supabase
      .from("deliverable_types")
      .select("*")
      .order("name", { ascending: true });

    if (typesError) throw typesError;

    let query = supabase.from("tasks").select("id, stage, deliverable_type_id, client_id, account_id");

    if (data.accountId) {
      query = query.or(`client_id.eq.${data.accountId},account_id.eq.${data.accountId}`);
    }

    if (data.typeId && data.typeId !== 'all') {
      query = query.eq("deliverable_type_id", data.typeId);
    }

    const { data: tasks, error: tasksError } = await query;
    if (tasksError) throw tasksError;

    const { data: doneStages } = await supabase
      .from("task_stages")
      .select("id")
      .eq("is_done_stage", true);
    const doneStageIds = new Set((doneStages || []).map((s: any) => s.id));

    return types.map(type => {
      const typeTasks = (tasks || []).filter(t => t.deliverable_type_id === type.id);
      const total = typeTasks.length;
      const completed = typeTasks.filter(t => doneStageIds.has(t.stage)).length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      return {
        ...type,
        total,
        completed,
        progress
      };
    });
  });
