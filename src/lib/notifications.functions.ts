import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await (supabase.from("notifications" as any) as any)
      .select("id, title, message, link, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; title: string; message: string | null; link: string | null; created_at: string }[];
  });

export const dismissNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    // Filtra por user_id também (não só id) pra ninguém apagar notificação de outra pessoa.
    const { error } = await (supabase.from("notifications" as any) as any)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
