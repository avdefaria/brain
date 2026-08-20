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
          name
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

    let query = supabase.from("tasks").select("id, stage, deliverable_type_id, client_id, account_id");
    
    if (data.typeId && data.typeId !== 'all') {
      query = query.eq("deliverable_type_id", data.typeId);
    }

    const { data: tasks, error: tasksError } = await query;
    if (tasksError) throw tasksError;

    return accountsData.map((acc: any) => {
      const clientTasks = tasks.filter(t => t.account_id === acc.id || t.client_id === acc.client_id);
      const total = clientTasks.length;
      const completed = clientTasks.filter(t => t.stage === 'done').length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      return {
        id: acc.id,
        name: acc.account_name || acc.clients?.name || "Sem nome",
        healthScore: acc.health_score || 0,
        status: acc.status,
        squads: acc.account_squads?.map((as: any) => as.squads).filter(Boolean) || [],
        contract: acc.contracts?.[0] || null,
        totalTasks: total,
        completedTasks: completed,
        progress,
        client_id: acc.client_id
      };
    });
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

    return types.map(type => {
      const typeTasks = (tasks || []).filter(t => t.deliverable_type_id === type.id);
      const total = typeTasks.length;
      const completed = typeTasks.filter(t => t.stage === 'done').length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      return {
        ...type,
        total,
        completed,
        progress
      };
    });
  });
