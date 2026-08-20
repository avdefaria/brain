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

export const getDeliverablesProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    accountId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    
    // First get all deliverable types
    const { data: types, error: typesError } = await supabase
      .from("deliverable_types")
      .select("*")
      .order("name", { ascending: true });

    if (typesError) throw typesError;

    // Build the tasks query
    let query = supabase.from("tasks").select("id, stage, deliverable_type_id, client_id");
    
    // Filter by account if provided
    if (data.accountId) {
      query = query.eq("client_id", data.accountId);
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
