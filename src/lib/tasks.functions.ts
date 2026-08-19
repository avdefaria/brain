import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getTasks = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        clients (name),
        profiles:task_assignees (
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
      assignees: (task.profiles as any[])?.map(p => p.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || "??") || [],
      position: task.position
    }));
  });

export const updateTaskStage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    taskId: z.string(),
    stage: z.enum(['todo', 'doing', 'review', 'done']),
    position: z.number()
  }).parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("tasks")
      .update({ 
        stage: data.stage,
        position: data.position,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.taskId);

    if (error) throw error;
    return { success: true };
  });

export const updateTasksOrder = createServerFn({ method: "POST" })
  .inputValidator((data) => z.array(z.object({
    id: z.string(),
    position: z.number(),
    stage: z.enum(['todo', 'doing', 'review', 'done'])
  })).parse(data))
  .handler(async ({ data }) => {
    // We update each task's position. In a real app, we might use a stored procedure for batch updates.
    for (const item of data) {
      await supabase
        .from("tasks")
        .update({ 
          position: item.position,
          stage: item.stage,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.id);
    }
    return { success: true };
  });
