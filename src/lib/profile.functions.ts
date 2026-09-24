import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      id: context.userId,
      email: userData?.user?.email || null,
      fullName: (profile as any)?.full_name || "",
      avatarUrl: (profile as any)?.avatar_url || null,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
    avatarUrl: z.string().trim().url().nullable().optional(),
  }).parse)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    // Sempre atualiza o próprio usuário (context.userId vem do JWT verificado no
    // middleware) — nunca aceita um id vindo do cliente, pra não dar brecha de
    // editar o perfil de outra pessoa.
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.fullName.trim(), avatar_url: data.avatarUrl ?? null } as never)
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
