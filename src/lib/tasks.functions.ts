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
        accounts:account_id (account_name),
        internal_targets:internal_target_id (name),
        deliverable_types:deliverable_type_id (name),
        task_assignees (
          user_id,
          profiles!task_assignees_user_id_profiles_fkey (id, full_name, avatar_url)
        ),
        task_tags (
          tags (id, name)
        ),
        task_attachments (*),
        task_history (*),
        task_comments (*)
      `)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    // Resolve autores de histórico/comentários separadamente (evita join
    // embutido frágil, mesma abordagem já usada pro histórico)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url");
    const nameById = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]));
    const avatarById = new Map((profilesData || []).map((p: any) => [p.id, p.avatar_url]));

    // Pra eficiência de execução (tempo trabalhado vs tempo corrido): precisa
    // saber se a etapa atual é "concluído" e, se for, quando ficou concluída
    // pela primeira vez — pra não deixar o tempo corrido crescendo pra sempre
    // numa tarefa que já terminou há semanas.
    const { data: taskStagesForDone } = await supabase.from("task_stages").select("id, is_done_stage");
    const doneStageIds = new Set(((taskStagesForDone as any[]) || []).filter((s: any) => s.is_done_stage).map((s: any) => s.id));

    const mapped = (data || []).map(task => ({
      id: task.id,
      title: task.title || "Sem título",
      client: (task.clients as any)?.name || "Sem cliente",
      client_id: task.client_id,
      account: (task.accounts as any)?.account_name || null,
      account_id: (task as any).account_id || null,
      is_internal: (task as any).is_internal || false,
      internal_target_id: (task as any).internal_target_id || null,
      internal_target: (task.internal_targets as any)?.name || null,
      priority: task.priority || "medium",
      // Extrai Y-M-D direto da string (data "pura" armazenada como meia-noite
      // UTC) em vez de deixar o Date reinterpretar por fuso — evita depender
      // do timezone da máquina que roda o servidor.
      deadline: task.deadline
        ? (() => {
            const [y, m, d] = task.deadline.slice(0, 10).split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          })()
        : "Sem prazo",
      raw_deadline: task.deadline,
      raw_start_date: (task as any).start_date,
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
      history: (Array.isArray(task.task_history) ? task.task_history : [])
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((h: any) => ({
          ...h,
          user_name: nameById.get(h.user_id) || "Sistema"
        })),
      comments: (Array.isArray((task as any).task_comments) ? (task as any).task_comments : [])
        .slice()
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((c: any) => ({
          ...c,
          user_name: nameById.get(c.user_id) || "Usuário",
          user_avatar: avatarById.get(c.user_id) || null,
        })),
      position: task.position || 0,
      deliverable_types: task.deliverable_types,
      description: task.description,
      time_tracked_seconds: (task as any).time_tracked_seconds || 0,
      timer_started_at: (task as any).timer_started_at,
      parent_task_id: (task as any).parent_task_id || null,
      created_at: task.created_at,
      is_done: doneStageIds.has(task.stage || "todo"),
    }));

    // completed_at = primeira vez que a tarefa entrou numa etapa "concluído",
    // via o próprio histórico já carregado (mesmo critério usado em
    // team.functions.ts/dashboard.functions.ts).
    const firstDoneAtByTaskId = new Map<string, number>();
    for (const t of mapped) {
      // t.history vem ordenado do mais novo pro mais antigo — percorre ao
      // contrário aqui pra pegar a PRIMEIRA vez que entrou em "concluído".
      const chronological = t.history.slice().reverse();
      for (const h of chronological) {
        if (h.action !== "editou a etapa" && h.action !== "criou a tarefa") continue;
        const toStage = (h.changes as any)?.to || (h.action === "criou a tarefa" ? (h.changes as any)?.stage : null);
        if (toStage && doneStageIds.has(toStage) && !firstDoneAtByTaskId.has(t.id)) {
          firstDoneAtByTaskId.set(t.id, new Date(h.created_at).getTime());
        }
      }
    }
    for (const t of mapped as any[]) {
      t.completed_at_ms = t.is_done ? (firstDoneAtByTaskId.get(t.id) ?? null) : null;
    }

    // Rollup: a tarefa principal soma seu próprio tempo com o de todas as
    // subtarefas (parent_task_id apontando para ela).
    const byId = new Map(mapped.map(t => [t.id, t]));
    const subtaskCountByParent = new Map<string, number>();
    for (const t of mapped) {
      if (!t.parent_task_id) continue;
      subtaskCountByParent.set(t.parent_task_id, (subtaskCountByParent.get(t.parent_task_id) || 0) + 1);
    }

    return mapped.map(t => {
      if (t.parent_task_id) {
        const parent = byId.get(t.parent_task_id);
        return { ...t, parent_task_title: parent?.title || null, subtask_count: 0, total_time_with_subtasks: t.time_tracked_seconds };
      }
      const childrenTime = mapped
        .filter(child => child.parent_task_id === t.id)
        .reduce((sum, child) => sum + (child.time_tracked_seconds || 0), 0);
      return {
        ...t,
        parent_task_title: null,
        subtask_count: subtaskCountByParent.get(t.id) || 0,
        total_time_with_subtasks: t.time_tracked_seconds + childrenTime,
      };
    });
  });

export const getAccountsForClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clientId: string }) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("id, account_name")
      .eq("client_id", data.clientId)
      .order("account_name");

    if (error) throw error;
    return accounts || [];
  });

export const getInternalTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("internal_targets")
      .select("id, name")
      .order("name");

    if (error) throw error;
    return data || [];
  });

export const createInternalTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { data: target, error } = await supabase
      .from("internal_targets")
      .insert({ name: data.name.trim() })
      .select("id, name")
      .single();

    if (error) throw error;
    return target;
  });

export const getParentTaskOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { excludeTaskId?: string } | void) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    let query = supabase
      .from("tasks")
      .select("id, title")
      .is("parent_task_id", null) // só tarefas principais podem virar "pai" (evita aninhar em múltiplos níveis)
      .order("title");

    if (data?.excludeTaskId) {
      query = query.neq("id", data.excludeTaskId);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;
    return tasks || [];
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
    start_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    title: z.string().optional(),
    time_tracked_seconds: z.number().optional(),
    timer_started_at: z.string().optional().nullable(),
    parent_task_id: z.string().optional().nullable(),
    account_id: z.string().optional().nullable(),
    client_id: z.string().optional().nullable(),
    is_internal: z.boolean().optional(),
    internal_target_id: z.string().optional().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { id, ...updates } = data;

    // Get old state for history
    const { data: oldTask } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    // Campos de data chegam como "" quando o input nativo é limpo/editado —
    // o Postgres rejeita string vazia pra date/timestamptz (mesmo cuidado do createTask).
    const sanitized: any = { ...updates };
    if ("deadline" in sanitized) sanitized.deadline = sanitized.deadline || null;
    if ("start_date" in sanitized) sanitized.start_date = sanitized.start_date || null;

    const { error } = await supabase
      .from("tasks")
      .update({
        ...sanitized,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", id);

    if (error) throw error;

    // Log changes to history
    for (const [key, value] of Object.entries(updates)) {
      // Skip history for technical timer fields
      if (key === 'time_tracked_seconds' || key === 'timer_started_at') continue;

      const oldValue = (oldTask as any)[key];
      // Normalize values for comparison (handle null vs undefined vs empty string)
      const normalizedOld = oldValue === null ? "" : oldValue;
      const normalizedNew = value === null ? "" : value;
      
      if (oldTask && normalizedOld !== normalizedNew) {
        let actionLabel = key;
        if (key === 'description') actionLabel = 'a descrição';
        else if (key === 'stage') actionLabel = 'a etapa';
        else if (key === 'priority') actionLabel = 'a prioridade';
        else if (key === 'deadline') actionLabel = 'o prazo';
        else if (key === 'start_date') actionLabel = 'a data de início';
        else if (key === 'title') actionLabel = 'o título';
        else if (key === 'account_id') actionLabel = 'a conta';
        else if (key === 'client_id') actionLabel = 'o cliente';
        else if (key === 'is_internal') actionLabel = 'interna/externa';
        else if (key === 'internal_target_id') actionLabel = 'a frente interna';

        await addTaskHistory({
          taskId: id,
          action: `editou ${actionLabel}`,
          changes: { from: oldValue, to: value },
          supabase,
          userId: context.userId
        });
      }
    }

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

    const { data: existingRows } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", data.taskId);
    const previousUserIds = new Set(((existingRows as any[]) || []).map((r) => r.user_id));

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

    // Notifica só quem entrou de novo na tarefa — nunca quem já estava, e nunca
    // quem se atribuiu a si mesmo (ex: tarefa pessoal criada pelo próprio usuário).
    // Insert vai pelo client de serviço (bypassa RLS de propósito): a policy de
    // insert direto em "notifications" foi removida — se fosse pelo client do
    // usuário (RLS-scoped), qualquer um autenticado conseguiria inserir
    // notificação forjada pra qualquer outro user_id direto via PostgREST,
    // sem passar por essa validação de "realmente foi atribuído agora".
    const newlyAssigned = data.userIds.filter((uid) => !previousUserIds.has(uid) && uid !== context.userId);
    if (newlyAssigned.length > 0) {
      const { data: taskRow } = await supabase.from("tasks").select("title").eq("id", data.taskId).maybeSingle();
      const taskTitle = (taskRow as any)?.title || "uma tarefa";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.from("notifications" as any) as any).insert(
        newlyAssigned.map((uid) => ({
          user_id: uid,
          title: "Você foi atribuído a uma tarefa",
          message: taskTitle,
          link: `/projects/tasks?taskId=${data.taskId}`,
        })),
      );
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
    
    // Get current tags for comparison
    const { data: currentTags } = await supabase
      .from("task_tags")
      .select("tag_id")
      .eq("task_id", data.taskId);
    
    const currentTagIds = currentTags?.map(t => t.tag_id) || [];

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

    // Log history for tags
    const added = data.tagIds.filter(id => !currentTagIds.includes(id));
    const removed = currentTagIds.filter(id => !data.tagIds.includes(id));

    if (added.length > 0 || removed.length > 0) {
      await addTaskHistory({
        taskId: data.taskId,
        action: "tags_alteradas",
        changes: { added, removed },
        supabase,
        userId: context.userId
      });
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
        file_path: data.fileUrl, // Corrected from file_url to file_path
        uploaded_by: userId
      } as any)
      .select()
      .single();
    
    if (error) throw error;

    // Log to history
    await addTaskHistory({
      taskId: data.taskId,
      action: "anexo_adicionado",
      changes: { fileName: data.fileName },
      supabase,
      userId
    });

    return attachment;
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    taskId: z.string(),
    content: z.string().min(1),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { userId } = context;

    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: data.taskId,
        user_id: userId,
        content: data.content,
      })
      .select()
      .single();

    if (error) throw error;
    return comment;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", data.id);
    
    if (error) throw error;
    return { success: true };
  });

// Internal helper for history
async function addTaskHistory({ taskId, action, changes, supabase, userId }: any) {
  const { error } = await supabase
    .from("task_history")
    .insert({
      task_id: taskId,
      user_id: userId,
      action,
      changes
    });
  if (error) console.error("Error logging history:", error);
}

export const deleteTaskAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string(), taskId: z.string(), fileName: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", data.id);
    
    if (error) throw error;

    // Log to history
    await addTaskHistory({
      taskId: data.taskId,
      action: "anexo_removido",
      changes: { fileName: data.fileName },
      supabase,
      userId: context.userId
    });

    return { success: true };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    title: z.string(),
    client_id: z.string().optional().nullable(),
    account_id: z.string().optional().nullable(),
    is_internal: z.boolean().optional(),
    internal_target_id: z.string().optional().nullable(),
    stage: z.string(),
    priority: z.string(),
    deadline: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    deliverable_type_id: z.string().optional().nullable(),
    parent_task_id: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }).refine((d) => d.is_internal || !!d.client_id, {
    message: "Cliente é obrigatório para tarefas externas",
    path: ["client_id"],
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
        // Sem data de início explícita, a tarefa começa na própria data de criação.
        start_date: data.start_date || new Date().toISOString().slice(0, 10),
        // Campos de data opcionais chegam como "" quando o campo é deixado em
        // branco no formulário — o Postgres rejeita string vazia pra timestamptz.
        deadline: data.deadline || null,
        deliverable_type_id: data.deliverable_type_id || null,
        account_id: data.account_id || null,
        position,
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (error) throw error;

    await addTaskHistory({
      taskId: newTask.id,
      action: "criou a tarefa",
      changes: { stage: newTask.stage },
      supabase,
      userId: context.userId,
    });

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

    // Busca a etapa atual de cada tarefa antes de sobrescrever, pra saber se
    // realmente mudou de coluna (drag dentro da mesma coluna não conta).
    const ids = data.map(item => item.id);
    const { data: currentTasks } = await supabase
      .from("tasks")
      .select("id, stage")
      .in("id", ids);
    const currentStageById = new Map((currentTasks || []).map((t: any) => [t.id, t.stage]));

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

      const previousStage = currentStageById.get(item.id);
      if (previousStage !== undefined && previousStage !== item.stage) {
        await addTaskHistory({
          taskId: item.id,
          action: "editou a etapa",
          changes: { from: previousStage, to: item.stage },
          supabase,
          userId: context.userId,
        });
      }
    }
    return { success: true };
  });

export const getTaskStages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from("task_stages")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;
    return data || [];
  });

function slugifyStageId(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "status"}_${Math.random().toString(36).slice(2, 7)}`;
}

export const createTaskStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    name: z.string().min(1),
    color: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: last } = await supabase
      .from("task_stages")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const { data: stage, error } = await supabase
      .from("task_stages")
      .insert({
        id: slugifyStageId(data.name),
        name: data.name,
        color: data.color || "var(--ink-3)",
        position: (last?.position ?? -1) + 1,
      })
      .select()
      .single();

    if (error) throw error;
    return stage;
  });

export const updateTaskStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    color: z.string().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { id, ...updates } = data;
    const { error } = await supabase
      .from("task_stages")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  });

export const deleteTaskStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: string) => z.string().parse(id))
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase;

    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("stage", id);

    if (count && count > 0) {
      throw new Error(`Não é possível excluir: ${count} tarefa(s) estão nesse status.`);
    }

    const { error } = await supabase
      .from("task_stages")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  });
