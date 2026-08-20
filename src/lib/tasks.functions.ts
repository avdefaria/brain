import { createServerFn } from "@tanstack/react-start";
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
          profiles!task_assignees_user_id_profiles_fkey (id, full_name, avatar_url)
        ),
        task_tags (
          tags (id, name)
        ),
        task_attachments (*)
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
        ? task.task_assignees
            .filter((p: any) => p.profiles)
            .map((p: any) => ({
              id: p.profiles.id,
              name: p.profiles.full_name,
              initials: p.profiles.full_name?.split(' ').map((n: string) => n[0]).join('') || "??",
              avatar_url: p.profiles.avatar_url
            }))
        : [],
      tags: Array.isArray(task.task_tags)
        ? task.task_tags.map((tt: any) => tt.tags).filter(Boolean)
        : [],
      attachments: task.task_attachments || [],
      position: task.position || 0,
      deliverable_types: task.deliverable_types,
      sku_reference: task.sku_reference,
      description: task.description
    }));
  });

export const getProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url");
    
    if (error) throw error;
    return data || [];
  });

export const getTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase.from("tags").select("*").order("name");
    if (error) throw error;
    return data || [];
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string(),
    stage: z.string().optional(),
    priority: z.string().optional(),
    deadline: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    title: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { id, ...updates } = data;
    const { error } = await supabase
      .from("tasks")
      .update({ 
        ...updates,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  });

export const updateTaskAssignees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    userIds: z.array(z.string())
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    
    // Delete existing
    const { error: deleteError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", data.taskId);
    
    if (deleteError) throw deleteError;

    if (data.userIds.length > 0) {
      const { error: insertError } = await supabase
        .from("task_assignees")
        .insert(data.userIds.map(uid => ({
          task_id: data.taskId,
          user_id: uid
        })));
      if (insertError) throw insertError;
    }

    return { success: true };
  });

export const updateTaskTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    tagIds: z.array(z.string())
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    
    await supabase.from("task_tags").delete().eq("task_id", data.taskId);

    if (data.tagIds.length > 0) {
      const { error } = await supabase
        .from("task_tags")
        .insert(data.tagIds.map(tid => ({
          task_id: data.taskId,
          tag_id: tid
        })));
      if (error) throw error;
    }

    return { success: true };
  });

export const createTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ name: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: newTag, error } = await supabase
      .from("tags")
      .insert({ name: data.name })
      .select()
      .single();
    if (error) throw error;
    return newTag;
  });

export const addTaskAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    fileName: z.string(),
    fileUrl: z.string()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { userId } = context;
    
    const { data: attachment, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: data.taskId,
        file_name: data.fileName,
        file_url: data.fileUrl,
        uploaded_by: userId
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return attachment;
  });

export const deleteTaskAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    title: z.string(),
    client_id: z.string(),
    stage: z.string(),
    priority: z.string(),
    deadline: z.string().optional().nullable(),
    deliverable_type_id: z.string().optional().nullable(),
    sku_reference: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

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
