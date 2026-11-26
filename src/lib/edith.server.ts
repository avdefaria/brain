import { z } from "zod";
import { isRateLimited } from "./rate-limit.server";

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
  "overdue_receivables",
  "churn_analysis",
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

// Enquanto os dados de clientes/financeiro do Brain forem de teste, as respostas
// que dependem deles saem marcadas, para a Edith sempre avisar o Alan "isto é
// teste". Ao subir os dados reais: trocar para false (e fazer deploy).
const EDITH_DATA_IS_TEST = true;
const TEST_DATA_NOTICE =
  "ATENÇÃO: os dados de clientes e financeiro do Brain ainda são de TESTE (fictícios). Apresente os números normalmente, mas sempre avise o Alan que são dados de teste.";

// Acrescenta o aviso ao corpo JSON de uma resposta de sucesso. Erros passam direto.
async function markTestData(pending: Promise<Response>): Promise<Response> {
  const res = await pending;
  if (!EDITH_DATA_IS_TEST || !res.ok) return res;
  try {
    const body = (await res.json()) as Record<string, unknown>;
    return json({ data_is_test: true, data_notice: TEST_DATA_NOTICE, ...body }, res.status);
  } catch {
    return res;
  }
}

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

  // Defesa em profundidade: mesmo com a chave certa, limita o dano caso ela
  // vaze um dia — não é pra tráfego legítimo nunca chegar perto disso. Limite
  // mais alto que o da Sofia porque algumas ações (finance_summary,
  // dashboard_overview) já fazem várias queries por chamada.
  if (isRateLimited("edith", 120, 60_000)) {
    return json({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
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
        return await markTestData(handleListClients(supabaseUrl, serviceRoleKey));
      case "list_tasks":
        return await handleListTasks(supabaseUrl, serviceRoleKey, params);
      case "finance_summary":
        return await markTestData(handleFinanceSummary(supabaseUrl, serviceRoleKey));
      case "dashboard_overview":
        return await markTestData(handleDashboardOverview(supabaseUrl, serviceRoleKey));
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
      case "overdue_receivables":
        return await markTestData(handleOverdueReceivables(supabaseUrl, serviceRoleKey, params));
      case "churn_analysis":
        return await markTestData(handleChurnAnalysis(supabaseUrl, serviceRoleKey));
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

// ---------------------------------------------------------------------------
// Inadimplência detalhada e análise de churn.
// Só leitura, dados 100% reais do banco (receivables, clients, contracts).
// As contas são feitas por funções puras (exportadas) para serem testáveis.
// ---------------------------------------------------------------------------

const overdueParamsSchema = z.object({
  client_name: z.string().trim().min(1).optional(),
  min_days_overdue: z.number().int().min(0).optional(),
});

// "Hoje" no fuso de São Paulo: vencimento é uma data (sem hora), e perto da
// meia-noite UTC o dia já virou lá antes de virar aqui.
function todayInSaoPaulo(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${fromDate.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toDate.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function monthsBetween(fromDate: string, toDate: string): number {
  return Math.max(0, Math.round((daysBetween(fromDate, toDate) / 30.4375) * 10) / 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type OverdueRow = {
  id: string;
  amount: number | string | null;
  due_date: string;
  installment_number: number | null;
  description: string | null;
  client_id: string | null;
  clients: { name: string | null; status: string | null } | null;
  contracts: { contract_number: string | null } | null;
};

export function buildOverdueReport(
  rows: OverdueRow[],
  today: string,
  filters: { client_name?: string | undefined; min_days_overdue?: number | undefined } = {},
) {
  const byClient = new Map<string, any>();
  const aging = {
    "1-15": { installments: 0, amount: 0 },
    "16-30": { installments: 0, amount: 0 },
    "31-60": { installments: 0, amount: 0 },
    "61+": { installments: 0, amount: 0 },
  };
  let totalAmount = 0;
  let totalInstallments = 0;

  for (const r of rows) {
    const days = daysBetween(r.due_date, today);
    if (days < 1) continue; // vence hoje ou depois: ainda não é atraso
    if (filters.min_days_overdue !== undefined && days < filters.min_days_overdue) continue;
    const clientName = r.clients?.name ?? "(cliente não identificado)";
    if (filters.client_name && clientName.toLowerCase() !== filters.client_name.toLowerCase()) continue;

    const amount = Number(r.amount) || 0;
    const key = r.client_id ?? clientName;
    let entry = byClient.get(key);
    if (!entry) {
      entry = {
        client_id: r.client_id,
        client_name: clientName,
        client_status: r.clients?.status ?? null,
        total_overdue: 0,
        installments_count: 0,
        oldest_due_date: r.due_date,
        max_days_overdue: 0,
        installments: [],
      };
      byClient.set(key, entry);
    }
    entry.total_overdue = round2(entry.total_overdue + amount);
    entry.installments_count += 1;
    if (r.due_date < entry.oldest_due_date) entry.oldest_due_date = r.due_date;
    entry.max_days_overdue = Math.max(entry.max_days_overdue, days);
    entry.installments.push({
      receivable_id: r.id,
      due_date: r.due_date,
      days_overdue: days,
      amount: round2(amount),
      installment_number: r.installment_number,
      description: r.description,
      contract_number: r.contracts?.contract_number ?? null,
    });

    const bucket = days <= 15 ? "1-15" : days <= 30 ? "16-30" : days <= 60 ? "31-60" : "61+";
    aging[bucket].installments += 1;
    aging[bucket].amount = round2(aging[bucket].amount + amount);
    totalAmount = round2(totalAmount + amount);
    totalInstallments += 1;
  }

  const clients = [...byClient.values()]
    .map((c) => ({ ...c, installments: c.installments.sort((a: any, b: any) => b.days_overdue - a.days_overdue) }))
    .sort((a, b) => b.total_overdue - a.total_overdue);

  return {
    as_of: today,
    totals: { amount: totalAmount, installments: totalInstallments, clients: clients.length },
    aging,
    clients,
  };
}

async function handleOverdueReceivables(
  supabaseUrl: string,
  serviceRoleKey: string,
  rawParams: Record<string, unknown>,
): Promise<Response> {
  const parsed = overdueParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return json({ error: "Parâmetros inválidos.", details: parsed.error.flatten() }, 400);
  }
  const today = todayInSaoPaulo();

  const res = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    `/receivables?select=id,amount,due_date,installment_number,description,client_id,clients(name,status),contracts(contract_number)&status=eq.pendente&due_date=lt.${today}&order=due_date.asc`,
  );
  if (!res.ok) return json({ error: "Erro ao consultar inadimplência." }, 502);
  const rows: OverdueRow[] = await res.json();

  return json(buildOverdueReport(rows, today, parsed.data), 200);
}

export type ChurnClientRow = {
  id: string;
  name: string;
  status: string | null;
  risk_level: string | null;
  health_score: number | null;
  start_date: string | null;
  cancelled_at: string | null;
  notice_date: string | null;
  expected_exit_date: string | null;
  revenue_at_risk: number | string | null;
  churn_reasons: { name: string | null } | null;
};

export type ChurnContractRow = {
  client_id: string;
  monthly_value: number | string | null;
  mrr_months: number | null;
  status: string | null;
};

// Mesma conta do MRR do finance_summary: valor mensal x meses de recorrência.
const contractMrr = (c: ChurnContractRow) => (Number(c.monthly_value) || 0) * (Number(c.mrr_months) || 1);

// Mesma régua de cores do Brain para Health Score: >=80 verde, >=50 amarelo,
// abaixo de 50 vermelho. "Em risco" = risco alto ou Health Score vermelho.
export const AT_RISK_HEALTH_BELOW = 50;

export function buildChurnReport(clients: ChurnClientRow[], contracts: ChurnContractRow[], today: string) {
  const activeMrr = new Map<string, number>();
  const lostMrr = new Map<string, number>();
  for (const ct of contracts) {
    const target = ct.status === "cancelled" ? lostMrr : activeMrr;
    target.set(ct.client_id, (target.get(ct.client_id) ?? 0) + contractMrr(ct));
  }

  const churned: any[] = [];
  const inNotice: any[] = [];
  const atRisk: any[] = [];
  let base = 0;
  let baseMrr = 0;

  for (const c of clients) {
    const isChurned = c.status === "inativo" || c.cancelled_at != null;

    if (isChurned) {
      churned.push({
        client_id: c.id,
        client_name: c.name,
        cancelled_at: c.cancelled_at,
        reason: c.churn_reasons?.name ?? null,
        tenure_months: c.start_date && c.cancelled_at ? monthsBetween(c.start_date, c.cancelled_at) : null,
        mrr_lost: round2(lostMrr.get(c.id) ?? 0),
        health_score: c.health_score,
      });
      continue;
    }

    const mrr = round2(activeMrr.get(c.id) ?? 0);
    base += 1;
    baseMrr += mrr;

    if (c.notice_date) {
      inNotice.push({
        client_id: c.id,
        client_name: c.name,
        status: c.status,
        notice_date: c.notice_date,
        expected_exit_date: c.expected_exit_date,
        days_until_exit: c.expected_exit_date ? daysBetween(today, c.expected_exit_date) : null,
        mrr,
        revenue_at_risk: c.revenue_at_risk == null ? null : Number(c.revenue_at_risk),
      });
      continue;
    }

    const lowHealth = c.health_score != null && c.health_score < AT_RISK_HEALTH_BELOW;
    if (c.risk_level === "high" || lowHealth) {
      atRisk.push({
        client_id: c.id,
        client_name: c.name,
        status: c.status,
        risk_level: c.risk_level,
        health_score: c.health_score,
        mrr,
      });
    }
  }

  const reasons: Record<string, { clients: number; mrr_lost: number }> = {};
  for (const ch of churned) {
    const key = ch.reason ?? "(sem motivo registrado)";
    reasons[key] ??= { clients: 0, mrr_lost: 0 };
    reasons[key].clients += 1;
    reasons[key].mrr_lost = round2(reasons[key].mrr_lost + ch.mrr_lost);
  }

  const sumBy = (rows: any[], field: string) => round2(rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0));

  return {
    as_of: today,
    summary: {
      clients_in_base: base,
      mrr_in_base: round2(baseMrr),
      churned_clients: churned.length,
      mrr_lost: sumBy(churned, "mrr_lost"),
      in_notice_clients: inNotice.length,
      mrr_in_notice: sumBy(inNotice, "mrr"),
      at_risk_clients: atRisk.length,
      mrr_at_risk: sumBy(atRisk, "mrr"),
    },
    definitions: {
      churned: "cliente com status 'inativo' ou data de cancelamento preenchida",
      in_notice: "cliente ainda na base com data de aviso prévio preenchida",
      at_risk: `cliente na base, sem aviso prévio, com risco 'high' ou Health Score abaixo de ${AT_RISK_HEALTH_BELOW}`,
      mrr: "soma de valor mensal x meses de recorrência dos contratos não cancelados",
      days_until_exit: "dias até a saída prevista; negativo = a data prevista já passou e o cliente continua na base",
    },
    churn_by_reason: reasons,
    churned,
    in_notice: inNotice.sort((a, b) => (a.expected_exit_date ?? "9999").localeCompare(b.expected_exit_date ?? "9999")),
    at_risk: atRisk.sort((a, b) => (a.health_score ?? 101) - (b.health_score ?? 101)),
  };
}

async function handleChurnAnalysis(supabaseUrl: string, serviceRoleKey: string): Promise<Response> {
  const [clientsRes, contractsRes] = await Promise.all([
    postgrest(
      supabaseUrl,
      serviceRoleKey,
      "/clients?select=id,name,status,risk_level,health_score,start_date,cancelled_at,notice_date,expected_exit_date,revenue_at_risk,churn_reasons(name)&order=name",
    ),
    postgrest(supabaseUrl, serviceRoleKey, "/contracts?select=client_id,monthly_value,mrr_months,status"),
  ]);
  if (!clientsRes.ok || !contractsRes.ok) return json({ error: "Erro ao consultar dados de churn." }, 502);

  const clients: ChurnClientRow[] = await clientsRes.json();
  const contracts: ChurnContractRow[] = await contractsRes.json();
  return json(buildChurnReport(clients, contracts, todayInSaoPaulo()), 200);
}
