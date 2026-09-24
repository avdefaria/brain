import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Login não passa pela requireSupabaseAuth (usuário ainda não tem token) —
// por isso o rate limit precisa viver aqui, antes de qualquer chamada ao
// Supabase Auth, pra impedir força bruta de senha.
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function getClientIp(): string {
  const request = getRequest();
  const headers = request?.headers;
  const forwardedFor = headers?.get("x-forwarded-for");
  return (
    headers?.get("cf-connecting-ip") ||
    (forwardedFor ? forwardedFor.split(",")[0]!.trim() : null) ||
    "unknown"
  );
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const loginWithRateLimit = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const identifier = `${data.email}:${getClientIp()}`;
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

    const { count } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("success", false)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      throw new Error(
        `Muitas tentativas de login com essa combinação de e-mail e rede. Tente novamente em ${WINDOW_MINUTES} minutos.`,
      );
    }

    const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    await supabaseAdmin.from("login_attempts").insert({
      identifier,
      success: !error,
    });

    if (error || !authData.session) {
      throw new Error(
        error?.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : (error?.message ?? "Erro ao entrar."),
      );
    }

    return {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    };
  });
