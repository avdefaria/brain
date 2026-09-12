import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const monthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const goalSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  leads_target: z.coerce.number().min(0).default(0),
  proposals_target: z.coerce.number().min(0).default(0),
  deals_target: z.coerce.number().min(0).default(0),
  revenue_target: z.coerce.number().min(0).default(0),
});

export const getCommercialMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { month: number; year: number }) => monthSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { month, year } = data;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstISO = firstDay.toISOString();
    const lastISO = new Date(year, month - 1, lastDay.getDate(), 23, 59, 59).toISOString();
    const firstDate = firstISO.split("T")[0] as string;
    const lastDateTime = lastDay.toISOString().split("T")[0] + "T23:59:59";

    const { data: goal } = await (supabase.from("commercial_goals" as any) as any)
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    const { data: monthLeads } = await supabase
      .from("leads")
      .select("id, funnel_stage")
      .gte("created_at", firstISO)
      .lte("created_at", lastISO);

    const { data: monthDeals } = await supabase
      .from("leads")
      .select("id")
      .gte("converted_at", firstISO)
      .lte("converted_at", lastISO);

    const { data: monthRevenue } = await supabase
      .from("receivables")
      .select("amount")
      .eq("status", "pago")
      .gte("paid_at", firstDate)
      .lte("paid_at", lastDateTime);

    const leadsList = (monthLeads as any[]) || [];
    const actual = {
      leads: leadsList.length,
      proposals: leadsList.filter((l: any) => l.funnel_stage === "proposta_enviada").length,
      deals: ((monthDeals as any[]) || []).length,
      revenue: ((monthRevenue as any[]) || []).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0),
    };

    return {
      goal: (goal as any) || null,
      actual,
      month,
      year,
    };
  });

export const upsertCommercialGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      month: number;
      year: number;
      leads_target: number;
      proposals_target: number;
      deals_target: number;
      revenue_target: number;
    }) => goalSchema.parse(data)
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const payload = {
      month: data.month,
      year: data.year,
      leads_target: Math.floor(Number(data.leads_target) || 0),
      proposals_target: Math.floor(Number(data.proposals_target) || 0),
      deals_target: Math.floor(Number(data.deals_target) || 0),
      revenue_target: Number(data.revenue_target) || 0,
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = await (supabase.from("commercial_goals" as any) as any)
      .upsert(payload, { onConflict: "month,year" })
      .select()
      .single();
    if (error) {
      throw error;
    }
    return saved;
  });
