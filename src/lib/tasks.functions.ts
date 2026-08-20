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
        clients (name),
        task_assignees (
          user_id,
          profiles:profiles (full_name)
        )
      `)
      .order("position", { ascending: true });

    if (error) throw error;

    return data.map(task => ({
      id: task.id,
      title: task.title,
      client: (task.clients as any)?.name || "Sem cliente",
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : "Sem prazo",
      stage: task.stage,
      assignees: (task.task_assignees as any[])?.map(p => p.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || "??") || [],
      position: (task as any).position || 0
    }));
  });

export const updateTaskPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    stage: z.enum(['todo', 'doing', 'review', 'done']),
    position: z.number()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { error } = await supabase
      .from("tasks")
      .update({ 
        stage: data.stage,
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
    stage: z.enum(['todo', 'doing', 'review', 'done'])
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
