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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("create_sofia_task", {
    p_client_name: parsed.data.client_name,
    p_account_name: parsed.data.account_name ?? null,
    p_sku_reference: parsed.data.sku_reference ?? null,
    p_title: parsed.data.title,
    p_description: parsed.data.description ?? null,
    p_assignee_name: parsed.data.assignee_name,
  });

  if (error) {
    // Erros de negócio da função (cliente/responsável não encontrado) — não é
    // falha do servidor, é a Sofia precisando confirmar melhor com o cliente.
    return json({ error: error.message }, 422);
  }

  return json({ task_id: data }, 200);
}
