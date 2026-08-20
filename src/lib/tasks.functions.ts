import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        clients:client_id (name),
        deliverable_types:deliverable_type_id (name),
        task_assignees (
          user_id,
          profiles:user_id (full_name)
        )
      `)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    return (data || []).map(task => ({
      id: task.id,
      title: task.title || "Sem título",
      client: (task.clients as any)?.name || "Sem cliente",
      client_id: task.client_id,
      priority: task.priority || "medium",
      deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : "Sem prazo",
      raw_deadline: task.deadline,
      stage: task.stage || "todo",
      assignees: Array.isArray(task.task_assignees) 
        ? task.task_assignees.map((p: any) => p.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || "??") 
        : [],
      position: task.position || 0,
      deliverable_types: task.deliverable_types,
      sku_reference: task.sku_reference,
      description: task.description
    }));
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    title: z.string(),
    client_id: z.string(),
    stage: z.string(),
    priority: z.string(),
    deadline: z.string().optional(),
    deliverable_type_id: z.string().optional(),
    sku_reference: z.string().optional(),
    description: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    // Get the current max position to append
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("stage", data.stage as any)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (lastTask?.position || 0) + 1;

    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        ...data,
        position,
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (error) throw error;
    return newTask;
  });

export const updateTaskPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    stage: z.string(),
    position: z.number()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { error } = await supabase
      .from("tasks")
      .update({ 
        stage: data.stage as any,
        position: data.position,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", data.taskId);

    if (error) throw error;
    return { success: true };
  });

export const updateTasksBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.array(z.object({
    id: z.string(),
    position: z.number(),
    stage: z.string()
  })).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    for (const item of data) {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          position: item.position,
          stage: item.stage,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", item.id);
      
      if (error) throw error;
    }
    return { success: true };
  });
