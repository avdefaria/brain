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
  "list_leads",
  "crm_summary",
  "commercial_summary",
  "create_lead",
  "move_lead_stage",
  "reschedule_lead_contact",
] as const;

// Etapas do funil que a Edith pode usar. "vendas_feitas" fica de fora de
// propósito — marcar uma venda como fechada é decisão que só o Alan toma
// explicitamente na interface, nunca via agente (ver edith_create_lead e
// edith_move_lead_stage no banco, que bloqueiam isso no próprio SQL, não só
// aqui — a validação daqui é só pra dar um erro mais cedo/claro).
const EDITH_ALLOWED_LEAD_STAGES = [
  "novos_leads",
  "primeiro_contato",
  "em_negociacao",
  "apresentacao_agencia",
  "proposta_enviada",
  "follow_up",
  "vendas_perdidas",
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

const listLeadsParamsSchema = z.object({
  stage: z.string().trim().min(1).optional(),
  responsible_name: z.string().trim().min(1).optional(),
  show_converted: z.boolean().optional(),
});

const createLeadParamsSchema = z.object({
  name: z.string().trim().min(1, "name é obrigatório."),
  company: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().min(1).nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  recurring_revenue: z.number().nonnegative().nullable().optional(),
  one_time_revenue: z.number().nonnegative().nullable().optional(),
  responsible_name: z.string().trim().min(1).nullable().optional(),
  niche_name: z.string().trim().min(1).nullable().optional(),
  // "vendas_feitas" é rejeitado no banco mesmo que venha aqui — ver
  // EDITH_ALLOWED_LEAD_STAGES acima.
  funnel_stage: z.enum(EDITH_ALLOWED_LEAD_STAGES).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  origin: z.string().trim().min(1).nullable().optional(),
});

const moveLeadStageParamsSchema = z.object({
  lead_id: z.string().uuid(),
  funnel_stage: z.enum(EDITH_ALLOWED_LEAD_STAGES),
});

const rescheduleLeadContactParamsSchema = z.object({
  lead_id: z.string().uuid(),
  next_contact_at: z.string().trim().min(1).nullable().optional(),
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
      case "list_leads":
        return await handleListLeads(supabaseUrl, serviceRoleKey, params);
      case "crm_summary":
        return await handleCrmSummary(supabaseUrl, serviceRoleKey);
      case "commercial_summary":
        return await handleCommercialSummary(supabaseUrl, serviceRoleKey);
      case "create_lead":
        return await handleCreateLead(supabaseUrl, serviceRoleKey, params);
      case "move_lead_stage":
        return await handleMoveLeadStage(supabaseUrl, serviceRoleKey, params);
      case "reschedule_lead_contact":
        return await handleRescheduleLeadContact(supabaseUrl, serviceRoleKey, params);
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

async function handleListLeads(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = listLeadsParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    "/leads?select=id,name,company,funnel_stage,recurring_revenue,one_time_revenue,next_contact_at,converted_at,responsible:profiles!leads_responsible_id_fkey(full_name)&order=created_at.desc",
  );
  if (!res.ok) return json({ error: "Erro ao consultar leads." }, 502);
  const rows: any[] = await res.json();

  const mapped = rows
    .map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      stage: l.funnel_stage,
      recurring_revenue: l.recurring_revenue,
      one_time_revenue: l.one_time_revenue,
      next_contact_at: l.next_contact_at,
      responsible_name: l.responsible?.full_name ?? null,
      converted: l.converted_at != null,
    }))
    .filter((l) => {
      if (!p.show_converted && l.converted) return false;
      if (p.stage && l.stage !== p.stage) return false;
      if (p.responsible_name && l.responsible_name?.toLowerCase() !== p.responsible_name.toLowerCase()) return false;
      return true;
    });

  return json({ leads: mapped }, 200);
}

async function handleCrmSummary(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const res = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    "/leads?select=recurring_revenue,one_time_revenue,mrr_months,funnel_stage,converted_at&converted_at=is.null",
  );
  if (!res.ok) return json({ error: "Erro ao consultar o funil." }, 502);
  const leads: any[] = await res.json();

  const openLeads = leads.filter((l) => l.funnel_stage && !["vendas_feitas", "vendas_perdidas"].includes(l.funnel_stage));

  return json(
    {
      total: leads.length,
      proposals: leads.filter((l) => l.funnel_stage === "proposta_enviada").length,
      pipeline: openLeads.reduce((acc, l) => acc + (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0), 0),
      pipeline_mrr: openLeads.reduce((acc, l) => acc + (Number(l.recurring_revenue) || 0) * (Number(l.mrr_months) || 1), 0),
      sales: leads.filter((l) => l.funnel_stage === "vendas_feitas").length,
      lost: leads.filter((l) => l.funnel_stage === "vendas_perdidas").length,
    },
    200,
  );
}

async function handleCommercialSummary(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const firstDay = new Date(year, month - 1, 1).toISOString();
  const lastDay = new Date(year, month, 0);
  const lastISO = new Date(year, month - 1, lastDay.getDate(), 23, 59, 59).toISOString();
  const firstDate = firstDay.slice(0, 10);
  const lastDateTime = lastDay.toISOString().slice(0, 10) + "T23:59:59";

  const [goalRes, leadsRes, dealsRes, revenueRes] = await Promise.all([
    postgrest(supabaseUrl, serviceRoleKey, `/commercial_goals?select=*&month=eq.${month}&year=eq.${year}`),
    postgrest(supabaseUrl, serviceRoleKey, `/leads?select=id,funnel_stage&created_at=gte.${firstDay}&created_at=lte.${lastISO}`),
    postgrest(supabaseUrl, serviceRoleKey, `/leads?select=id&converted_at=gte.${firstDay}&converted_at=lte.${lastISO}`),
    postgrest(
      supabaseUrl,
      serviceRoleKey,
      `/receivables?select=amount&status=eq.pago&paid_at=gte.${firstDate}&paid_at=lte.${lastDateTime}`,
    ),
  ]);
  if (!goalRes.ok || !leadsRes.ok || !dealsRes.ok || !revenueRes.ok) {
    return json({ error: "Erro ao consultar o Comercial." }, 502);
  }

  const goalRows: any[] = await goalRes.json();
  const leadsRows: any[] = await leadsRes.json();
  const dealsRows: any[] = await dealsRes.json();
  const revenueRows: any[] = await revenueRes.json();

  return json(
    {
      month,
      year,
      goal: goalRows[0] ?? null,
      actual: {
        leads: leadsRows.length,
        proposals: leadsRows.filter((l) => l.funnel_stage === "proposta_enviada").length,
        deals: dealsRows.length,
        revenue: revenueRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
      },
    },
    200,
  );
}

async function handleCreateLead(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = createLeadParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(supabaseUrl, serviceRoleKey, "/rpc/edith_create_lead", {
    method: "POST",
    body: JSON.stringify({
      p_name: p.name,
      p_company: p.company ?? null,
      p_email: p.email ?? null,
      p_phone: p.phone ?? null,
      p_recurring_revenue: p.recurring_revenue ?? null,
      p_one_time_revenue: p.one_time_revenue ?? null,
      p_responsible_name: p.responsible_name ?? null,
      p_niche_name: p.niche_name ?? null,
      p_funnel_stage: p.funnel_stage ?? null,
      p_notes: p.notes ?? null,
      p_origin: p.origin ?? null,
    }),
  });

  if (!res.ok) {
    const errBody: unknown = await res.json().catch(() => null);
    const message = (errBody as { message?: string } | null)?.message ?? "Erro ao criar lead.";
    return json({ error: message }, 422);
  }

  const leadId = await res.json();
  return json({ lead_id: leadId }, 200);
}

async function handleMoveLeadStage(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = moveLeadStageParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(supabaseUrl, serviceRoleKey, "/rpc/edith_move_lead_stage", {
    method: "POST",
    body: JSON.stringify({ p_lead_id: p.lead_id, p_funnel_stage: p.funnel_stage }),
  });

  if (!res.ok) {
    const errBody: unknown = await res.json().catch(() => null);
    const message = (errBody as { message?: string } | null)?.message ?? "Erro ao mover lead.";
    return json({ error: message }, 422);
  }

  return json({ success: true }, 200);
}

async function handleRescheduleLeadContact(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = rescheduleLeadContactParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const p = parsed.data;

  const res = await postgrest(supabaseUrl, serviceRoleKey, "/rpc/edith_reschedule_lead_contact", {
    method: "POST",
    body: JSON.stringify({ p_lead_id: p.lead_id, p_next_contact_at: p.next_contact_at ?? null }),
  });

  if (!res.ok) {
    const errBody: unknown = await res.json().catch(() => null);
    const message = (errBody as { message?: string } | null)?.message ?? "Erro ao reagendar contato.";
    return json({ error: message }, 422);
  }

  return json({ success: true }, 200);
}
