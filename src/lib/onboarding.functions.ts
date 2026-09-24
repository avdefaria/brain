import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ONBOARDING_TOTAL_ITEMS } from "@/lib/onboarding-checklist";

export const getClientOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((clientId: string) => z.string().uuid().parse(clientId))
  .handler(async ({ data: clientId, context }) => {
    const supabase = context.supabase;
    const { data: rows, error } = await (supabase.from("client_onboarding_items" as any) as any)
      .select("item_key, checked_at, profiles:checked_by(full_name)")
      .eq("client_id", clientId);
    if (error) throw error;

    const checkedItems: Record<string, { checkedAt: string; checkedByName: string | null }> = {};
    for (const row of (rows as any[]) || []) {
      checkedItems[row.item_key] = {
        checkedAt: row.checked_at,
        checkedByName: row.profiles?.full_name || null,
      };
    }
    return { checkedItems };
  });

const toggleSchema = z.object({
  clientId: z.string().uuid(),
  itemKey: z.string().min(1),
  checked: z.boolean(),
});

export const toggleClientOnboardingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clientId: string; itemKey: string; checked: boolean }) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    if (data.checked) {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase.from("client_onboarding_items" as any) as any)
        .upsert(
          {
            client_id: data.clientId,
            item_key: data.itemKey,
            checked_by: userData?.user?.id || null,
            checked_at: new Date().toISOString(),
          },
          { onConflict: "client_id,item_key" }
        );
      if (error) throw error;
    } else {
      const { error } = await (supabase.from("client_onboarding_items" as any) as any)
        .delete()
        .eq("client_id", data.clientId)
        .eq("item_key", data.itemKey);
      if (error) throw error;
    }

    let autoActivated = false;
    if (data.checked) {
      const { count } = await (supabase.from("client_onboarding_items" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("client_id", data.clientId);
      if ((count || 0) >= ONBOARDING_TOTAL_ITEMS) {
        const { data: client } = await supabase.from("clients").select("status").eq("id", data.clientId).maybeSingle();
        if ((client as any)?.status === "onboarding") {
          const { error: statusError } = await supabase.from("clients").update({ status: "ativo" }).eq("id", data.clientId);
          if (!statusError) autoActivated = true;
        }
      }
    }

    return { success: true, autoActivated };
  });
