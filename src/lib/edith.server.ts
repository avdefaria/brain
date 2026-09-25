import { z } from "zod";

// Endpoint dedicado pra Edith (agente "CEO"/orquestrador, roda no Telegram numa
// VPS externa) ler e agir sobre dados do Brain, sem precisar mais passar pela
// Sofia+Kanban pra tudo. Mesmo desenho do endpoint da Sofia (ver sofia.server.ts):
// autenticado com um segredo PRÓPRIO (EDITH_API_KEY, nunca a service role key),
// e um conjunto FECHADO de ações permitidas — não é acesso livre ao banco. Ações
// mais sensíveis (mudar status de cliente, qualquer coisa financeira) ficam de
// fora de propósito: são decisões que só o Alan toma.
export const EDITH_ACTIONS_PATH = "/api/edith/action";

const ACTIONS = [
  "list_clients",
  "list_tasks",
  "finance_summary",
  "dashboard_overview",
  "create_task",
  "update_task",
] as const;

const requestSchema = z.object({
  action: z.enum(ACTIONS),
  params: z.record(z.unknown()).optional().default({}),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Mesmo motivo do endpoint da Sofia: supabase-js (mesmo com a service role key
// correta) devolveu "permission denied for function" numa chamada de RPC em
// produção, causa nunca identificada. fetch puro direto no PostgREST é o que
// está comprovadamente funcionando, então usamos o mesmo padrão aqui pra tudo
// (select e RPC), em vez de confiar de novo no client supabase-js.
async function postgrest(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

const createTaskParamsSchema = z.object({
  client_name: z.string().trim().min(1, "client_name é obrigatório."),
  account_name: z.string().trim().min(1).nullable().optional(),
  sku_reference: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1, "title é obrigatório.").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  // Tarefas vindas da Edith nascem sem responsável por padrão — é
  // intencional (ver projeto-brain-integracao-sofia): alguém da equipe tria
  // depois. Só atribui de cara se a Edith mandar um nome explícito.
  assignee_name: z.string().trim().min(1).nullable().optional(),
});

const updateTaskParamsSchema = z.object({
  task_id: z.string().uuid(),
  stage: z.string().trim().min(1).nullable().optional(),
  priority: z.string().trim().min(1).nullable().optional(),
  deadline: z.string().trim().min(1).nullable().optional(),
  clear_deadline: z.boolean().optional(),
  assignee_name: z.string().trim().min(1).nullable().optional(),
  clear_assignee: z.boolean().optional(),
});

const listTasksParamsSchema = z.object({
  overdue_only: z.boolean().optional(),
  client_name: z.string().trim().min(1).optional(),
  assignee_name: z.string().trim().min(1).optional(),
  stage: z.string().trim().min(1).optional(),
});

export async function handleEdithAction(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const expectedKey = process.env["EDITH_API_KEY"];
  if (!expectedKey) {
    console.error("[edith] EDITH_API_KEY não configurada no ambiente.");
    return json({ error: "Integração não configurada." }, 500);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || !timingSafeEqual(token, expectedKey)) {
    return json({ error: "Não autorizado." }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: "Dados inválidos.", details: parsed.error.flatten() }, 400);
  }

  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[edith] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente.");
    return json({ error: "Integração não configurada." }, 500);
  }

  const { action, params } = parsed.data;

  try {
    switch (action) {
      case "list_clients":
        return await handleListClients(supabaseUrl, serviceRoleKey);
      case "list_tasks":
        return await handleListTasks(supabaseUrl, serviceRoleKey, params);
      case "finance_summary":
        return await handleFinanceSummary(supabaseUrl, serviceRoleKey);
      case "dashboard_overview":
        return await handleDashboardOverview(supabaseUrl, serviceRoleKey);
      case "create_task":
        return await handleCreateTask(supabaseUrl, serviceRoleKey, params);
      case "update_task":
        return await handleUpdateTask(supabaseUrl, serviceRoleKey, params);
    }
  } catch (err) {
    console.error(`[edith] Erro inesperado na ação ${action}:`, err);
    return json({ error: "Erro interno ao processar a ação." }, 500);
  }
}

async function handleListClients(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const res = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    "/clients?select=id,name,status,health_score,accounts(id,account_name)&order=name",
  );
  if (!res.ok) return json({ error: "Erro ao consultar clientes." }, 502);
  const data = await res.json();
  return json({ clients: data }, 200);
}

async function handleListTasks(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = listTasksParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    "/tasks?select=id,title,stage,priority,deadline,client_id,clients(name),accounts(account_name),task_assignees(profiles(full_name))&order=created_at.desc",
  );
  if (!res.ok) return json({ error: "Erro ao consultar tarefas." }, 502);
  const rows: any[] = await res.json();

  const today = new Date().toISOString().slice(0, 10);
  const mapped = rows
    .map((t) => ({
      id: t.id,
      title: t.title,
      stage: t.stage,
      priority: t.priority,
      deadline: t.deadline,
      client_name: t.clients?.name ?? null,
      account_name: t.accounts?.account_name ?? null,
      assignee_names: Array.isArray(t.task_assignees)
        ? t.task_assignees.map((a: any) => a.profiles?.full_name).filter(Boolean)
        : [],
    }))
    .filter((t) => {
      if (p.overdue_only && (t.stage === "done" || !t.deadline || t.deadline.slice(0, 10) >= today)) return false;
      if (p.client_name && t.client_name?.toLowerCase() !== p.client_name.toLowerCase()) return false;
      if (p.assignee_name && !t.assignee_names.some((n: string) => n.toLowerCase() === p.assignee_name!.toLowerCase())) return false;
      if (p.stage && t.stage !== p.stage) return false;
      return true;
    });

  return json({ tasks: mapped }, 200);
}

async function handleFinanceSummary(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [pendingRes, paidRes, overdueRes, contractsRes] = await Promise.all([
    postgrest(supabaseUrl, serviceRoleKey, "/receivables?select=amount&status=eq.pendente"),
    postgrest(
      supabaseUrl,
      serviceRoleKey,
      `/receivables?select=amount&status=eq.pago&paid_at=gte.${firstDayOfMonth}&paid_at=lte.${lastDayOfMonth}T23:59:59`,
    ),
    postgrest(supabaseUrl, serviceRoleKey, `/receivables?select=amount&status=eq.pendente&due_date=lt.${today}`),
    postgrest(
      supabaseUrl,
      serviceRoleKey,
      "/contracts?select=monthly_value,mrr_months,status,clients(status)",
    ),
  ]);
  if (!pendingRes.ok || !paidRes.ok || !overdueRes.ok || !contractsRes.ok) {
    return json({ error: "Erro ao consultar dados financeiros." }, 502);
  }

  const sum = (rows: any[]) => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalPending = sum(await pendingRes.json());
  const totalPaidMonth = sum(await paidRes.json());
  const totalOverdue = sum(await overdueRes.json());

  const contracts: any[] = await contractsRes.json();
  const mrr = contracts.reduce((acc, ct) => {
    const isChurned = ct.clients?.status === "inativo" || ct.status === "cancelled";
    if (isChurned) return acc;
    return acc + (Number(ct.monthly_value) || 0) * (Number(ct.mrr_months) || 1);
  }, 0);

  return json({ mrr, total_pending: totalPending, total_paid_month: totalPaidMonth, total_overdue: totalOverdue }, 200);
}

async function handleDashboardOverview(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const [clientsRes, tasksRes] = await Promise.all([
    postgrest(supabaseUrl, serviceRoleKey, "/clients?select=status"),
    postgrest(supabaseUrl, serviceRoleKey, "/tasks?select=stage,deadline"),
  ]);
  if (!clientsRes.ok || !tasksRes.ok) return json({ error: "Erro ao consultar visão geral." }, 502);

  const clients: any[] = await clientsRes.json();
  const tasks: any[] = await tasksRes.json();
  const today = new Date().toISOString().slice(0, 10);

  const clientsByStatus: Record<string, number> = {};
  for (const c of clients) clientsByStatus[c.status] = (clientsByStatus[c.status] || 0) + 1;

  const tasksByStage: Record<string, number> = {};
  let overdueTasks = 0;
  for (const t of tasks) {
    tasksByStage[t.stage] = (tasksByStage[t.stage] || 0) + 1;
    if (t.stage !== "done" && t.deadline && t.deadline.slice(0, 10) < today) overdueTasks += 1;
  }

  return json(
    { total_clients: clients.length, clients_by_status: clientsByStatus, total_tasks: tasks.length, tasks_by_stage: tasksByStage, overdue_tasks: overdueTasks },
    200,
  );
}

async function handleCreateTask(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = createTaskParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(supabaseUrl, serviceRoleKey, "/rpc/create_sofia_task", {
    method: "POST",
    body: JSON.stringify({
      p_client_name: p.client_name,
      p_account_name: p.account_name ?? null,
      p_sku_reference: p.sku_reference ?? null,
      p_title: p.title,
      p_description: p.description ?? null,
      // Sem assignee_name explícito, nasce sem responsável de propósito
      // (ver comentário do schema acima) — nunca tenta adivinhar.
      p_assignee_name: p.assignee_name ?? null,
    }),
  });

  if (!res.ok) {
    const errBody: unknown = await res.json().catch(() => null);
    const message = (errBody as { message?: string } | null)?.message ?? "Erro ao criar tarefa.";
    return json({ error: message }, 422);
  }

  const taskId = await res.json();
  return json({ task_id: taskId }, 200);
}

async function handleUpdateTask(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = updateTaskParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(supabaseUrl, serviceRoleKey, "/rpc/edith_update_task", {
    method: "POST",
    body: JSON.stringify({
      p_task_id: p.task_id,
      p_stage: p.stage ?? null,
      p_priority: p.priority ?? null,
      p_deadline: p.deadline ?? null,
      p_clear_deadline: p.clear_deadline ?? false,
      p_assignee_name: p.assignee_name ?? null,
      p_clear_assignee: p.clear_assignee ?? false,
    }),
  });

  if (!res.ok) {
    const errBody: unknown = await res.json().catch(() => null);
    const message = (errBody as { message?: string } | null)?.message ?? "Erro ao atualizar tarefa.";
    return json({ error: message }, 422);
  }

  return json({ success: true }, 200);
}
