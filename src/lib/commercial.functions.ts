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

const monthKeyOf = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthsBetweenDates = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

// This business's internal "MRR" for a recurring deal is its monthly value times the
// committed number of months (not the plain monthly rate) — confirmed by Alan with a
// worked example (5k/mo x 6 months = 30k "MRR").
const dealMrr = (monthlyValue: number, mrrMonths: number | null | undefined) => (Number(monthlyValue) || 0) * (Number(mrrMonths) || 1);

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
    const prev = buckets[buckets.length - 2] || cur;
    const prevMonthEnd = new Date(prev.year, prev.month, 0, 23, 59, 59);

    const { data: createdLeads } = await supabase
      .from("leads")
      .select("id, name, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue, mrr_months, responsible_id, funnel_type_id")
      .gte("created_at", sixMonthsAgoISO)
      .limit(5000);

    const { data: convertedLeads } = await supabase
      .from("leads")
      .select("id, name, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue, mrr_months, responsible_id, funnel_type_id")
      .gte("converted_at", sixMonthsAgoISO)
      .limit(5000);

    const { data: openLeads } = await supabase
      .from("leads")
      .select("id, name, created_at, converted_at, funnel_stage, recurring_revenue, one_time_revenue, mrr_months, responsible_id, funnel_type_id")
      .is("converted_at", null)
      .not("funnel_stage", "in", "(vendas_feitas,vendas_perdidas)")
      .limit(5000);

    const { data: funnelTypes } = await supabase.from("funnel_types" as any).select("id, name") as any;
    const funnelTypeName = new Map<string, string>(((funnelTypes as any[]) || []).map((f: any) => [f.id, f.name]));

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
          .select("client_id, type, monthly_value, total_value, mrr_months")
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
          mrr += dealMrr(ct.monthly_value, ct.mrr_months);
        } else {
          avulso += Number(ct.total_value) || 0 || Number(ct.monthly_value) || 0;
        }
      }
      return { mrr, avulso };
    };

    // Valor mensal puro (sem multiplicar pelos meses de recorrência) — usado como número
    // principal na Corrida Comercial; a projeção de MRR (realSplit) vira dado complementar.
    const plainMonthlySplit = (leadId: string) => {
      const contracts = leadToContract.get(leadId) || [];
      let monthly = 0;
      let avulso = 0;
      for (const ct of contracts) {
        if (ct.type === "recurring") {
          monthly += Number(ct.monthly_value) || 0;
        } else {
          avulso += Number(ct.total_value) || 0 || Number(ct.monthly_value) || 0;
        }
      }
      return { monthly, avulso };
    };

    const leadsByMonth = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      total: allLeads.filter((l: any) => monthKeyOf(l.created_at) === b.key).length,
    }));

    const proposalsByMonth = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      total: allLeads.filter((l: any) => monthKeyOf(l.created_at) === b.key && l.funnel_stage === "proposta_enviada").length,
    }));

    const dealsByMonth = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      total: convertedInScope.filter((l: any) => monthKeyOf(l.converted_at) === b.key).length,
    }));

    // "Previsto" (cabeçalho do KPI) é o valor mensal puro do pipeline em aberto (sem multiplicar
    // pelos meses de recorrência) — a projeção de MRR (multiplicada) vira um dado secundário.
    // Por mês passado é uma aproximação por coorte: leads criados naquele mês que ainda estão em
    // aberto hoje (não existe snapshot histórico do pipeline pra calcular o valor exato daquele dia).
    const previstoByMonth = buckets.map((b) => {
      const cohortOpen = ((openLeads as any[]) || []).filter((l: any) => monthKeyOf(l.created_at) === b.key);
      const total = cohortOpen.reduce((acc: number, l: any) => acc + (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0), 0);
      return { key: b.key, label: b.label, total };
    });

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

    // "Vendas Realizadas" (cabeçalho do KPI) é o que foi de fato pago no mês (receivables pagos),
    // não a projeção de MRR do contrato — essa projeção (vendasMrr/vendasAvulso) vira dado secundário.
    const paidMonthKeyOf = (dateStr: string | null) => {
      if (!dateStr) return null;
      const [y, m] = dateStr.split("-");
      return `${y}-${m}`;
    };
    const sixMonthsAgoDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: paidReceivables } = await supabase
      .from("receivables")
      .select("amount, paid_at")
      .eq("status", "pago")
      .gte("paid_at", sixMonthsAgoDate)
      .limit(5000);
    const paidByMonth = buckets.map((b) => ({
      key: b.key,
      label: b.label,
      total: (((paidReceivables as any[]) || []).filter((r: any) => paidMonthKeyOf(r.paid_at) === b.key)).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0),
    }));
    const vendasByMonth = paidByMonth;

    const delta = (series: { total: number }[]) => {
      const c = series[series.length - 1]?.total || 0;
      const p = series[series.length - 2]?.total || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    const monthLeads = allLeads.filter((l: any) => monthKeyOf(l.created_at) === cur.key);
    const monthConverted = convertedInScope.filter((l: any) => monthKeyOf(l.converted_at) === cur.key);

    let vendasMrr = 0;
    let vendasAvulso = 0;
    const raceByResponsible = new Map<string, { id: string; name: string; avatar_url: string | null; mrr: number; avulso: number }>();
    const responsibleIds = [...new Set([...monthLeads, ...monthConverted].map((l: any) => l.responsible_id).filter(Boolean))] as string[];
    const nameByResponsible = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (responsibleIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", responsibleIds);
      for (const p of ((profiles as any[]) || []) as any[]) {
        if (p?.id) nameByResponsible.set(p.id, { full_name: p.full_name || "Sem responsável", avatar_url: p.avatar_url || null });
      }
    }
    for (const l of monthConverted) {
      const s = realSplit(l.id);
      vendasMrr += s.mrr;
      vendasAvulso += s.avulso;
      const responsibleId = l.responsible_id || "unassigned";
      const profile = nameByResponsible.get(responsibleId);
      const item = raceByResponsible.get(responsibleId) || { id: responsibleId, name: profile?.full_name || "Sem responsável", avatar_url: profile?.avatar_url || null, mrr: 0, avulso: 0 };
      item.mrr += s.mrr;
      item.avulso += s.avulso;
      raceByResponsible.set(responsibleId, item);
    }
    const commercialRace = [...raceByResponsible.values()]
      .filter((r) => r.mrr > 0 || r.avulso > 0)
      .sort((a, b) => b.mrr - a.mrr || b.avulso - a.avulso);

    const pipelineList = (openLeads as any[]) || [];
    let previstoMrr = 0;
    let previstoMonthly = 0;
    for (const l of pipelineList) {
      previstoMrr += dealMrr(l.recurring_revenue, l.mrr_months);
      previstoMonthly += (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0);
    }
    const vendasPaid = paidByMonth[paidByMonth.length - 1]?.total || 0;

    // Leads by funnel type (which channel/funnel brought the lead), all leads in the 6-month window.
    const leadsByFunnelType = (() => {
      const counts = new Map<string, number>();
      for (const l of allLeads) {
        const name = l.funnel_type_id ? funnelTypeName.get(l.funnel_type_id) || "Outro" : "Sem tipo definido";
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    })();

    // Custo por lead / por venda, por tipo de funil — vem de Contas a Pagar (categoria "Marketing",
    // com o tipo de funil marcado em cada conta), não é lançado à mão nessa tela.
    const { data: marketingCategory } = await (supabase.from("expense_categories" as any) as any)
      .select("id")
      .ilike("name", "marketing")
      .maybeSingle();
    const spendByFunnelType = new Map<string, number>();
    if ((marketingCategory as any)?.id) {
      const curMonthFirstDay = `${cur.year}-${String(cur.month).padStart(2, "0")}-01`;
      const curMonthLastDay = new Date(cur.year, cur.month, 0).toISOString().split("T")[0] as string;
      const { data: marketingPayables } = await supabase
        .from("payables")
        .select("amount, funnel_type_id, due_date")
        .eq("category_id", (marketingCategory as any).id)
        .not("funnel_type_id", "is", null)
        .gte("due_date", curMonthFirstDay)
        .lte("due_date", curMonthLastDay);
      for (const p of ((marketingPayables as any[]) || []) as any[]) {
        if (!p.funnel_type_id) continue;
        spendByFunnelType.set(p.funnel_type_id, (spendByFunnelType.get(p.funnel_type_id) || 0) + (Number(p.amount) || 0));
      }
    }
    const monthLeadsByFunnelType = new Map<string, number>();
    const monthDealsByFunnelType = new Map<string, number>();
    for (const l of monthLeads) {
      if (!l.funnel_type_id) continue;
      monthLeadsByFunnelType.set(l.funnel_type_id, (monthLeadsByFunnelType.get(l.funnel_type_id) || 0) + 1);
    }
    for (const l of monthConverted) {
      if (!l.funnel_type_id) continue;
      monthDealsByFunnelType.set(l.funnel_type_id, (monthDealsByFunnelType.get(l.funnel_type_id) || 0) + 1);
    }
    const funnelTypeCost = ((funnelTypes as any[]) || [])
      .map((f: any) => {
        const spend = spendByFunnelType.get(f.id) || 0;
        const leadsCount = monthLeadsByFunnelType.get(f.id) || 0;
        const dealsCount = monthDealsByFunnelType.get(f.id) || 0;
        return {
          id: f.id,
          name: f.name,
          spend,
          leads: leadsCount,
          deals: dealsCount,
          costPerLead: leadsCount > 0 ? spend / leadsCount : null,
          costPerDeal: dealsCount > 0 ? spend / dealsCount : null,
        };
      })
      .sort((a, b) => b.spend - a.spend || b.leads - a.leads);
    const totalSpend = funnelTypeCost.reduce((acc, f) => acc + f.spend, 0);
    const overallCostPerLead = monthLeads.length > 0 ? totalSpend / monthLeads.length : null;
    const overallCostPerDeal = monthConverted.length > 0 ? totalSpend / monthConverted.length : null;

    // Tabela de negociações do mês, pro Alan ver o detalhe por trás dos gráficos/KPIs.
    // "Custo" é o custo por lead do tipo de funil desse lead (investimento de Marketing daquele
    // tipo ÷ leads daquele tipo no mês) — uma aproximação de CAC individual, não um custo real
    // rastreado por negociação (não existe tracking de clique/conversão por lead).
    const monthDeals = monthLeads
      .map((l: any) => {
        const leadsOfType = l.funnel_type_id ? monthLeadsByFunnelType.get(l.funnel_type_id) || 0 : 0;
        const spendOfType = l.funnel_type_id ? spendByFunnelType.get(l.funnel_type_id) || 0 : 0;
        return {
          id: l.id,
          name: l.name,
          funnelStage: l.funnel_stage,
          funnelTypeName: l.funnel_type_id ? funnelTypeName.get(l.funnel_type_id) || "Outro" : "Sem tipo",
          responsibleName: nameByResponsible.get(l.responsible_id)?.full_name || "Sem responsável",
          monthlyValue: (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0),
          mrrValue: dealMrr(l.recurring_revenue, l.mrr_months),
          cost: leadsOfType > 0 ? spendOfType / leadsOfType : null,
          createdAt: l.created_at,
          convertedAt: l.converted_at,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // --- MRR base (contracts) — faturamento ativo, churn do mês, snapshot do mês anterior ---
    const { data: recurringContracts } = await supabase
      .from("contracts")
      .select(
        "id, client_id, account_id, type, monthly_value, mrr_months, start_date, status, clients:client_id(status, cancelled_at), accounts:account_id(client_id, clients:client_id(status, cancelled_at))"
      )
      .eq("type", "recurring")
      .limit(5000);

    const resolveClient = (ct: any) => ct.clients || ct.accounts?.clients || null;

    let activeMrrTotal = 0;
    let prevMrrTotal = 0;
    let churnMrrThisMonth = 0;
    for (const ct of ((recurringContracts as any[]) || []) as any[]) {
      const client = resolveClient(ct);
      const startDate = ct.start_date ? new Date(ct.start_date) : null;
      const cancelledAt = client?.cancelled_at ? new Date(client.cancelled_at) : null;
      // client_lifecycle_status atual (onboarding/ativo/em_aviso/pausado/inativo) —
      // os valores antigos 'churn'/'inactive' não existem mais desde a migração
      // de status do cliente, então checar só eles nunca dava match (bug real:
      // cliente inativo continuava contando no MRR ativo pra sempre).
      const isChurnedNow = client?.status === "inativo" || ct.status === "cancelled";
      const mrrValue = dealMrr(ct.monthly_value, ct.mrr_months);

      if (!isChurnedNow) activeMrrTotal += mrrValue;

      if (startDate && startDate <= prevMonthEnd && !(cancelledAt && cancelledAt <= prevMonthEnd)) {
        prevMrrTotal += mrrValue;
      }

      if (cancelledAt && monthKeyOf(cancelledAt.toISOString()) === cur.key && startDate) {
        const elapsed = Math.max(0, monthsBetweenDates(startDate, cancelledAt));
        const totalMonths = Number(ct.mrr_months) || 1;
        const remaining = Math.max(0, totalMonths - elapsed);
        churnMrrThisMonth += (Number(ct.monthly_value) || 0) * remaining;
      }
    }
    const mrrPctVsPrevMonth = prevMrrTotal > 0 ? Math.round(((activeMrrTotal - prevMrrTotal) / prevMrrTotal) * 100) : (activeMrrTotal > 0 ? 100 : 0);

    // --- Corrida Comercial: closers only, com meta mensal dividida/editável ---
    // "Closer" agora é um cargo (job_function) dentro do departamento Comercial,
    // vinculado via profile_job_functions (m2m) — não é mais um array hardcoded no profile.
    const { data: closerJobFunction } = await (supabase.from("job_functions" as any) as any)
      .select("id")
      .ilike("name", "closer")
      .maybeSingle();
    let closers: any[] = [];
    if ((closerJobFunction as any)?.id) {
      const { data: closerLinks } = await (supabase.from("profile_job_functions" as any) as any)
        .select("profile_id, profiles:profile_id(id, full_name, avatar_url, active)")
        .eq("job_function_id", (closerJobFunction as any).id);
      closers = ((closerLinks as any[]) || [])
        .map((r: any) => r.profiles)
        .filter((p: any) => p && p.active !== false);
    }

    const { data: closerGoalRows } = await (supabase.from("closer_goals" as any) as any)
      .select("*")
      .eq("month", cur.month)
      .eq("year", cur.year);
    const overrideByProfile = new Map<string, number>();
    for (const g of ((closerGoalRows as any[]) || []) as any[]) {
      if (g.target_revenue !== null && g.target_revenue !== undefined) overrideByProfile.set(g.profile_id, Number(g.target_revenue));
    }
    const teamRevenueTarget = Number((await (async () => {
      const { data: g } = await (supabase.from("commercial_goals" as any) as any).select("revenue_target").eq("month", cur.month).eq("year", cur.year).maybeSingle();
      return (g as any)?.revenue_target ?? 0;
    })())) || 0;

    const overriddenTotal = [...overrideByProfile.values()].reduce((a, b) => a + b, 0);
    const nonOverriddenClosers = closers.filter((c: any) => !overrideByProfile.has(c.id));
    const remainder = Math.max(0, teamRevenueTarget - overriddenTotal);
    const autoShare = nonOverriddenClosers.length > 0 ? remainder / nonOverriddenClosers.length : 0;

    const raceMonthlyByProfile = new Map<string, number>();
    const raceMrrByProfile = new Map<string, number>();
    for (const l of monthConverted) {
      const plain = plainMonthlySplit(l.id);
      const projected = realSplit(l.id);
      const pid = l.responsible_id;
      if (!pid) continue;
      raceMonthlyByProfile.set(pid, (raceMonthlyByProfile.get(pid) || 0) + plain.monthly + plain.avulso);
      raceMrrByProfile.set(pid, (raceMrrByProfile.get(pid) || 0) + projected.mrr + projected.avulso);
    }

    const closerRace = closers
      .map((c: any) => ({
        id: c.id,
        name: c.full_name,
        avatar_url: c.avatar_url,
        target: overrideByProfile.has(c.id) ? overrideByProfile.get(c.id)! : autoShare,
        isOverride: overrideByProfile.has(c.id),
        sold: raceMonthlyByProfile.get(c.id) || 0,
        soldMrr: raceMrrByProfile.get(c.id) || 0,
      }))
      .sort((a, b) => b.sold - a.sold);

    return {
      kpis: {
        leads: monthLeads.length,
        propostas: monthLeads.filter((l: any) => l.funnel_stage === "proposta_enviada").length,
        fechados: monthConverted.length,
        previstoMonthly,
        previstoMrr,
        vendasPaid,
        vendasMrr,
        vendasAvulso,
        trends: {
          leads: leadsByMonth.map((d) => d.total),
          propostas: proposalsByMonth.map((d) => d.total),
          fechados: dealsByMonth.map((d) => d.total),
          previsto: previstoByMonth.map((d) => d.total),
          vendas: vendasByMonth.map((d) => d.total),
        },
        deltas: {
          leads: delta(leadsByMonth),
          propostas: delta(proposalsByMonth),
          fechados: delta(dealsByMonth),
          previsto: delta(previstoByMonth),
          vendas: delta(vendasByMonth),
        },
      },
      mrrOverview: {
        active: activeMrrTotal,
        churn: churnMrrThisMonth,
        previsto: previstoMrr,
        pctVsPrevMonth: mrrPctVsPrevMonth,
      },
      leadsByMonth,
      closedValueByMonth,
      funnelLeads: allLeads.map((l: any) => ({ funnel_stage: l.funnel_stage })),
      leadsByFunnelType,
      funnelTypeCost,
      costOverview: { totalSpend, overallCostPerLead, overallCostPerDeal },
      monthDeals,
      commercialRace,
      closerRace,
      teamRevenueTarget,
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

const closerGoalSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  profile_id: z.string().uuid(),
  target_revenue: z.coerce.number().min(0).nullable(),
});

export const upsertCloserGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { month: number; year: number; profile_id: string; target_revenue: number | null }) => closerGoalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    if (data.target_revenue === null) {
      const { error } = await (supabase.from("closer_goals" as any) as any)
        .delete()
        .eq("month", data.month)
        .eq("year", data.year)
        .eq("profile_id", data.profile_id);
      if (error) throw error;
      return { cleared: true };
    }
    const { data: saved, error } = await (supabase.from("closer_goals" as any) as any)
      .upsert(
        { month: data.month, year: data.year, profile_id: data.profile_id, target_revenue: data.target_revenue, updated_at: new Date().toISOString() },
        { onConflict: "month,year,profile_id" }
      )
      .select()
      .single();
    if (error) throw error;
    return saved;
  });

