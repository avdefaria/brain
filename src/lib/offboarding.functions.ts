import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { computeRiskLevel } from "@/lib/risk-level";
import { computeOpenMrr } from "@/lib/mrr";

export const getClientOffboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((clientId: string) => z.string().uuid().parse(clientId))
  .handler(async ({ data: clientId, context }) => {
    const supabase = context.supabase;

    const [{ data: rows, error: rowsError }, { data: client, error: clientError }, { data: receivables }, { data: contracts }] = await Promise.all([
      (supabase.from("client_offboarding_items" as any) as any)
        .select("item_key, checked_at, profiles:checked_by(full_name)")
        .eq("client_id", clientId),
      supabase
        .from("clients")
        .select("notice_date, expected_exit_date, health_score, status")
        .eq("id", clientId)
        .maybeSingle(),
      supabase.from("receivables").select("status, due_date").eq("client_id", clientId),
      supabase.from("contracts").select("monthly_value, mrr_months, status, type").eq("client_id", clientId),
    ]);
    if (rowsError) throw rowsError;
    if (clientError) throw clientError;

    const checkedItems: Record<string, { checkedAt: string; checkedByName: string | null }> = {};
    for (const row of (rows as any[]) || []) {
      checkedItems[row.item_key] = {
        checkedAt: row.checked_at,
        checkedByName: row.profiles?.full_name || null,
      };
    }

    return {
      checkedItems,
      noticeDate: (client as any)?.notice_date || null,
      expectedExitDate: (client as any)?.expected_exit_date || null,
      revenueAtRisk: computeOpenMrr((contracts as any[]) || []),
      clientStatus: (client as any)?.status || null,
      riskLevel: computeRiskLevel((client as any)?.health_score, (receivables as any[]) || []),
    };
  });

const toggleSchema = z.object({
  clientId: z.string().uuid(),
  itemKey: z.string().min(1),
  checked: z.boolean(),
});

export const toggleClientOffboardingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clientId: string; itemKey: string; checked: boolean }) => toggleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    if (data.checked) {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase.from("client_offboarding_items" as any) as any)
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
      const { error } = await (supabase.from("client_offboarding_items" as any) as any)
        .delete()
        .eq("client_id", data.clientId)
        .eq("item_key", data.itemKey);
      if (error) throw error;
    }
    return { success: true };
  });

const fieldsSchema = z.object({
  clientId: z.string().uuid(),
  noticeDate: z.string().optional().nullable(),
  expectedExitDate: z.string().optional().nullable(),
});

export const updateClientOffboardingFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { clientId: string; noticeDate?: string | null; expectedExitDate?: string | null }) =>
    fieldsSchema.parse(data)
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("clients")
      .update({
        notice_date: data.noticeDate || null,
        expected_exit_date: data.expectedExitDate || null,
      })
      .eq("id", data.clientId);
    if (error) throw error;
    return { success: true };
  });
