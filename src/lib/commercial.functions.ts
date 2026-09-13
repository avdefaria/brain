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

export const getCommercialDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((_data: any) => ({}))
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const now = new Date();
    const buckets: { key: string; label: string; year: number; month: number }[] = [];
    const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = fmt.format(d).replace(".", "");
      buckets.push({ key, label, year, month });
    }
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString();
    const cur = buckets[buckets.length - 1]!;

    const { data: createdLeads } = await supabase
      .from("leads")
      .select("id, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue")
      .gte("created_at", sixMonthsAgoISO)
      .limit(5000);

    const { data: convertedLeads } = await supabase
      .from("leads")
      .select("id, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue")
      .gte("converted_at", sixMonthsAgoISO)
      .limit(5000);

    const { data: openLeads } = await supabase
      .from("leads")
      .select("id, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue")
      .is("converted_at", null)
      .not("funnel_stage", "in", "(vendas_feitas,vendas_perdidas)")
      .limit(5000);

    const byId = new Map<string, any>();
    for (const l of ([...((createdLeads as any[]) || []), ...((convertedLeads as any[]) || []), ...((openLeads as any[]) || [])] as any[])) {
      if (l && l.id && !byId.has(l.id)) byId.set(l.id, l);
    }
    const allLeads = [...byId.values()];
    const convertedInScope = allLeads.filter((l: any) => l.converted_at);
    const convertedIds = convertedInScope.map((l: any) => l.id);

    let leadToContract = new Map<string, any[]>();
    if (convertedIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, lead_id")
        .in("lead_id", convertedIds)
        .limit(5000);
      const clientList = (clients as any[]) || [];
      const clientIdToLeadId = new Map<string, string>();
      for (const c of clientList) {
        if (c?.id && c?.lead_id) clientIdToLeadId.set(c.id, c.lead_id);
      }
      const clientIds = [...clientIdToLeadId.keys()];
      if (clientIds.length > 0) {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("client_id, type, monthly_value, total_value")
          .in("client_id", clientIds)
          .limit(5000);
        for (const ct of ((contracts as any[]) || []) as any[]) {
          const leadId = clientIdToLeadId.get(ct.client_id);
          if (!leadId) continue;
          const arr = leadToContract.get(leadId) || [];
          arr.push(ct);
          leadToContract.set(leadId, arr);
        }
      }
    }

    const realSplit = (leadId: string) => {
      const contracts = leadToContract.get(leadId) || [];
      let mrr = 0;
      let avulso = 0;
      for (const ct of contracts) {
        if (ct.type === "recurring") {
          mrr += Number(ct.monthly_value) || 0;
        } else {
          avulso += Number(ct.total_value) || 0 || Number(ct.monthly_value) || 0;
        }
      }
      return { mrr, avulso };
    };

    const monthKeyOf = (iso: string | null) => {
      if (!iso) return null;
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const leadsByMonth = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      total: allLeads.filter((l: any) => monthKeyOf(l.created_at) === b.key).length,
    }));

    const closedValueByMonth = buckets.map((b) => {
      let mrr = 0;
      let avulso = 0;
      for (const l of convertedInScope) {
        if (monthKeyOf(l.converted_at) === b.key) {
          const s = realSplit(l.id);
          mrr += s.mrr;
          avulso += s.avulso;
        }
      }
      return { key: b.key, label: b.label, mrr, avulso };
    });

    const monthLeads = allLeads.filter((l: any) => monthKeyOf(l.created_at) === cur.key);
    const monthConverted = convertedInScope.filter((l: any) => monthKeyOf(l.converted_at) === cur.key);

    let vendasMrr = 0;
    let vendasAvulso = 0;
    for (const l of monthConverted) {
      const s = realSplit(l.id);
      vendasMrr += s.mrr;
      vendasAvulso += s.avulso;
    }

    const pipelineList = (openLeads as any[]) || [];
    let pipelineMrr = 0;
    let pipelineAvulso = 0;
    for (const l of pipelineList) {
      pipelineMrr += Number(l.recurring_revenue) || 0;
      pipelineAvulso += Number(l.one_time_revenue) || 0;
    }

    return {
      kpis: {
        leads: monthLeads.length,
        propostas: monthLeads.filter((l: any) => l.funnel_stage === "proposta_enviada").length,
        fechados: monthConverted.length,
        pipelineMrr,
        pipelineAvulso,
        vendasMrr,
        vendasAvulso,
      },
      leadsByMonth,
      closedValueByMonth,
      funnelLeads: allLeads.map((l: any) => ({ funnel_stage: l.funnel_stage })),
      month: cur.month,
      year: cur.year,
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
