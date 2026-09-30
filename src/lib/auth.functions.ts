import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Login não passa pela requireSupabaseAuth (usuário ainda não tem token) —
// por isso o rate limit precisa viver aqui, antes de qualquer chamada ao
// Supabase Auth, pra impedir força bruta de senha.
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
// Limite adicional agregado por IP, além do limite por email+IP acima — sem
// isso, um IP conseguia tentar 5x cada um de milhares de emails diferentes
// sem nunca ser bloqueado (credential stuffing). Bem mais alto que o limite
// por conta, pra não travar uma rede compartilhada (escritório, VPN) em uso
// legítimo.
const MAX_ATTEMPTS_PER_IP = 30;

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

// O Brain só tem usuários da própria equipe, todos no Brasil — o Cloudflare
// já manda o país de origem em cf-ipcountry em todo request que passa por
// ele. Isso é reforço, não a defesa principal: o bloqueio de verdade deve
// ficar numa regra de WAF no próprio Cloudflare (bloqueia antes de gastar
// recurso do servidor). Se o header não vier (dev local, ou Cloudflare fora
// do caminho por algum motivo), não bloqueia — não queremos travar o time
// por falta de sinal, só quando o sinal existir e disser claramente "não é
// Brasil".
function isBlockedCountry(): boolean {
  const country = getRequest()?.headers?.get("cf-ipcountry");
  return !!country && country !== "BR";
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const loginWithRateLimit = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    if (isBlockedCountry()) {
      throw new Error("Acesso não disponível a partir da sua localização.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const clientIp = getClientIp();
    const identifier = `${data.email}:${clientIp}`;
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

    // Limite agregado por IP, indexado pelo mesmo campo "identifier" com o
    // prefixo "ip:" — não conta contra o limite por email acima, é uma
    // segunda checagem independente.
    const ipIdentifier = `ip:${clientIp}`;
    const { count: ipCount } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", ipIdentifier)
      .eq("success", false)
      .gte("created_at", windowStart);

    if ((ipCount ?? 0) >= MAX_ATTEMPTS_PER_IP) {
      throw new Error(
        `Muitas tentativas de login vindas dessa rede. Tente novamente em ${WINDOW_MINUTES} minutos.`,
      );
    }

    const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    await supabaseAdmin.from("login_attempts").insert([
      { identifier, success: !error },
      { identifier: ipIdentifier, success: !error },
    ]);

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
