import { z } from "zod";

// Endpoint dedicado pra Sofia (agente de suporte no WhatsApp, rodando numa VPS
// externa) criar tarefas no Brain. Não usa createServerFn/RPC do TanStack Start
// porque o id de função é interno e instável — uma integração externa precisa
// de uma URL e contrato estáveis. Autenticado com SOFIA_API_KEY (segredo só
// dela, nunca a service role key), que só dá acesso a "criar tarefa" — se
// vazar, o estrago fica limitado a isso.
export const SOFIA_CREATE_TASK_PATH = "/api/sofia/create-task";

const sofiaTaskSchema = z.object({
  client_name: z.string().trim().min(1, "client_name é obrigatório."),
  account_name: z.string().trim().min(1).nullable().optional(),
  sku_reference: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1, "title é obrigatório.").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  assignee_name: z.string().trim().min(1, "assignee_name é obrigatório."),
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

export async function handleSofiaCreateTask(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const expectedKey = process.env["SOFIA_API_KEY"];
  if (!expectedKey) {
    console.error("[sofia] SOFIA_API_KEY não configurada no ambiente.");
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

  const parsed = sofiaTaskSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: "Dados inválidos.", details: parsed.error.flatten() }, 400);
  }

  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[sofia] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente.");
    return json({ error: "Integração não configurada." }, 500);
  }

  // Chamada direta via fetch, não supabase-js: o cliente supabase-js (mesmo
  // com a service role key correta, confirmado byte a byte) devolvia
  // "permission denied for function" nessa chamada específica em produção —
  // causa não identificada no wrapper de fetch do client.server.ts. fetch
  // puro com só o header apikey foi testado manualmente contra o projeto
  // real e funciona de forma consistente, então contorna o problema.
  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_sofia_task`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_client_name: parsed.data.client_name,
        p_account_name: parsed.data.account_name ?? null,
        p_sku_reference: parsed.data.sku_reference ?? null,
        p_title: parsed.data.title,
        p_description: parsed.data.description ?? null,
        p_assignee_name: parsed.data.assignee_name,
      }),
    });
  } catch (err) {
    console.error("[sofia] Falha de rede ao chamar o Supabase:", err);
    return json({ error: "Erro ao conectar ao banco." }, 502);
  }

  if (!rpcResponse.ok) {
    const errBody: unknown = await rpcResponse.json().catch(() => null);
    const message =
      (errBody as { message?: string } | null)?.message ?? "Erro ao criar tarefa.";
    // Erros de negócio (cliente/responsável não encontrado) — não é falha do
    // servidor, é a Sofia precisando confirmar melhor com o cliente.
    return json({ error: message }, 422);
  }

  const taskId = await rpcResponse.json();
  return json({ task_id: taskId }, 200);
}
