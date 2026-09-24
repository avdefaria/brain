import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getFinanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { startDate?: string | null; endDate?: string | null } | undefined) =>
    z.object({
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    }).parse(data || {})
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Total a Receber: sem período selecionado = todos pendentes (comportamento
    // padrão de sempre); com período, escopado por vencimento dentro da janela.
    let pendingQuery = supabase.from('receivables').select('amount').eq('status', 'pendente');
    if (data.startDate) pendingQuery = pendingQuery.gte('due_date', data.startDate);
    if (data.endDate) pendingQuery = pendingQuery.lte('due_date', data.endDate);
    const { data: pending, error: pendingErr } = await pendingQuery;

    // Recebido: sem período = mês corrente (comportamento padrão de sempre);
    // com período, escopado por data de pagamento dentro da janela escolhida.
    let paidQuery = supabase.from('receivables').select('amount').eq('status', 'pago');
    if (data.startDate || data.endDate) {
      if (data.startDate) paidQuery = paidQuery.gte('paid_at', data.startDate);
      if (data.endDate) paidQuery = paidQuery.lte('paid_at', data.endDate + 'T23:59:59');
    } else {
      paidQuery = paidQuery.gte('paid_at', firstDayOfMonth).lte('paid_at', lastDayOfMonth + 'T23:59:59');
    }
    const { data: paidMonth, error: paidErr } = await paidQuery;

    // Atrasados: sempre o total real em atraso agora — não faz sentido escopar
    // por período (uma conta vencida não some por estar olhando "hoje").
    const { data: overdue, error: overdueErr } = await supabase
      .from('receivables')
      .select('amount')
      .eq('status', 'pendente')
      .lt('due_date', today);

    if (pendingErr || paidErr || overdueErr) {
      console.error("Error fetching finance summary:", { pendingErr, paidErr, overdueErr });
    }

    const totalPending = pending?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
    const totalPaidMonth = paidMonth?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
    const totalOverdue = overdue?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

    return {
      totalPending,
      totalPaidMonth,
      totalOverdue
    };
  });

const receivablesTrendsSchema = z.object({
  granularity: z.enum(["day", "week", "month"]).optional(),
});

export const getReceivablesSummaryTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { granularity?: "day" | "week" | "month" } | undefined) => receivablesTrendsSchema.parse(data || {}))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const granularity = data.granularity || "month";
    const now = new Date();
    const n = granularity === "day" ? 7 : 6;
    const buckets: { key: string; start: Date; end: Date }[] = [];

    if (granularity === "day") {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
      }
    } else if (granularity === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
      }
    } else {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        buckets.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, start, end });
      }
    }

    const windowStart = buckets[0]!.start;
    const windowEnd = buckets[buckets.length - 1]!.end;

    const bucketIdxOf = (iso: string | null) => {
      if (!iso) return -1;
      const t = new Date(iso).getTime();
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]!;
        if (t >= b.start.getTime() && t <= b.end.getTime()) return i;
      }
      return -1;
    };

    const { data: pendingRows } = await supabase
      .from("receivables")
      .select("amount, due_date")
      .eq("status", "pendente")
      .gte("due_date", windowStart.toISOString().split("T")[0])
      .lte("due_date", windowEnd.toISOString().split("T")[0]);

    const { data: paidRows } = await supabase
      .from("receivables")
      .select("amount, paid_at")
      .eq("status", "pago")
      .gte("paid_at", windowStart.toISOString())
      .lte("paid_at", windowEnd.toISOString());

    const pendingSeries = buckets.map(() => 0);
    const paidSeries = buckets.map(() => 0);

    for (const r of (pendingRows as any[]) || []) {
      const idx = bucketIdxOf(r.due_date ? `${r.due_date}T12:00:00` : null);
      if (idx >= 0) pendingSeries[idx] += Number(r.amount) || 0;
    }
    for (const r of (paidRows as any[]) || []) {
      const idx = bucketIdxOf(r.paid_at);
      if (idx >= 0) paidSeries[idx] += Number(r.amount) || 0;
    }

    const delta = (series: number[]) => {
      const c = series[series.length - 1] || 0;
      const p = series[series.length - 2] || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    return {
      trends: { pending: pendingSeries, paid: paidSeries },
      deltas: { pending: delta(pendingSeries), paid: delta(paidSeries) },
    };
  });

export const getReceivables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { 
    startDate?: string | null, 
    endDate?: string | null,
    status?: string[] | null,
    clientId?: string | null
  }) => z.object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    status: z.array(z.string()).nullable().optional(),
    clientId: z.string().nullable().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    let query = supabase
      .from('receivables')
      .select(`
        *,
        client:client_id(id, name),
        contract:contract_id(id, type)
      `)
      .order('due_date', { ascending: true });

    if (data.startDate) query = query.gte('due_date', data.startDate);
    if (data.endDate) query = query.lte('due_date', data.endDate);
    if (data.status && data.status.length > 0) query = query.in('status', data.status);
    if (data.clientId) query = query.eq('client_id', data.clientId);

    const { data: receivables, error } = await query;
    if (error) throw error;

    return receivables || [];
  });

export const updateReceivableStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { 
    id: string, 
    status: 'pendente' | 'pago',
    payment_method?: string,
    paid_at?: string
  }) => z.object({
    id: z.string(),
    status: z.enum(['pendente', 'pago']),
    payment_method: z.string().optional(),
    paid_at: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    
    const updateData: any = { 
      status: data.status,
      paid_at: data.status === 'pago' ? (data.paid_at || new Date().toISOString()) : null
    };
    
    if (data.payment_method) {
      updateData.payment_method = data.payment_method;
    }

    const { error } = await supabase
      .from('receivables')
      .update(updateData)
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });

export const deleteReceivable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().parse(id))
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase.from('receivables').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  });

export const updateReceivableDueDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    id: string,
    due_date: string
  }) => z.object({
    id: z.string(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('receivables')
      .update({ due_date: data.due_date })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });

export const getRecurringClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const today = new Date().toISOString().split('T')[0] as string;

    const { data: contracts, error: contractsErr } = await supabase
      .from('contracts')
      .select(`
        id,
        client_id,
        monthly_value,
        mrr_months,
        start_date,
        status,
        type,
        client:client_id(id, name, city, state, address, country, health_score)
      `)
      .eq('type', 'recurring')
      .eq('status', 'active')
      .order('start_date', { ascending: false });

    if (contractsErr) throw contractsErr;
    if (!contracts || contracts.length === 0) return [];

    const seen = new Set<string>();
    const uniqueContracts = (contracts as any[]).filter((c: any) => {
      if (seen.has(c.client_id)) return false;
      seen.add(c.client_id);
      return true;
    });

    const clientIds = uniqueContracts.map((c: any) => c.client_id);

    const { data: receivables, error: recErr } = await supabase
      .from('receivables')
      .select('id, client_id, contract_id, amount, status, due_date')
      .in('client_id', clientIds);

    if (recErr) throw recErr;

    const byClient: Record<string, any[]> = {};
    for (const r of (receivables as any[]) || []) {
      const bucket = byClient[r.client_id] ?? (byClient[r.client_id] = []);
      bucket.push(r);
    }

    return uniqueContracts.map((c: any) => {
      const clientRecs = byClient[c.client_id] || [];
      const ltv = clientRecs
        .filter((r: any) => r.status === 'pago')
        .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

      const contractRecs = clientRecs.filter((r: any) =>
        r.contract_id ? r.contract_id === c.id : true
      );
      const paidCount = contractRecs.filter((r: any) => r.status === 'pago').length;
      const mrrMonths = c.mrr_months != null ? Number(c.mrr_months) : null;
      const remainingMonths = mrrMonths != null ? Math.max(0, mrrMonths - paidCount) : null;

      const hasOverdue = clientRecs.some((r: any) => {
        if (r.status === 'pago' || r.status === 'cancelado') return false;
        if (r.status === 'atrasado') return true;
        if (r.due_date && r.due_date < today) return true;
        return false;
      });

      return {
        client_id: c.client_id,
        client_name: c.client?.name || '—',
        city: c.client?.city || null,
        state: c.client?.state || null,
        address: c.client?.address || null,
        country: c.client?.country || null,
        monthly_value: c.monthly_value != null ? Number(c.monthly_value) : null,
        ltv,
        mrr_months: mrrMonths,
        paid_count: paidCount,
        remaining_months: remainingMonths,
        health_score: c.client?.health_score ?? null,
        payment_status: hasOverdue ? 'atrasado' : 'em_dia',
      };
    });
  });

export const updateReceivableAmount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    id: string,
    amount: number
  }) => z.object({
    id: z.string(),
    amount: z.number().positive("Valor deve ser maior que zero"),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('receivables')
      .update({ amount: data.amount })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });

export const getRevenueCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("revenue_categories" as any)
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any[]) || [];
  });

export const createRevenueCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((name: string) => z.string().min(1).parse(name))
  .handler(async ({ data: name, context }) => {
    const normalized = name.trim();
    const { data, error } = await context.supabase
      .from("revenue_categories" as any)
      .insert({ name: normalized } as any)
      .select("*")
      .single();
    if (error) {
      console.error("[createRevenueCategory] Supabase insert error FULL:", error);
      console.error(
        "[createRevenueCategory] code:",
        (error as any)?.code,
        "message:",
        (error as any)?.message,
        "details:",
        (error as any)?.details,
        "hint:",
        (error as any)?.hint
      );
      console.error("[createRevenueCategory] JSON:", JSON.stringify(error, null, 2));
      throw error;
    }
    return data as any;
  });

const oneOffReceivableSchema = z.object({
  client_id: z.string().nullable().optional(),
  client_name: z.string().nullable().optional(),
  description: z.string().min(5, "Descrição deve ter ao menos 5 caracteres"),
  category_id: z.string().nullable().optional(),
  total_amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  installments: z.coerce.number().int().min(1).max(120).default(1),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createOneOffReceivable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => oneOffReceivableSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const n = data.installments || 1;
    const totalCents = Math.round(Number(data.total_amount) * 100);
    const perCents = Math.floor(totalCents / n);
    const remainder = totalCents - perCents * n;
    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const cents = perCents + (i === n - 1 ? remainder : 0);
      const due = new Date(data.due_date + "T00:00:00");
      due.setMonth(due.getMonth() + i);
      rows.push({
        client_id: data.client_id ?? null,
        client_name: data.client_name ?? null,
        contract_id: null,
        description: data.description.trim(),
        category_id: data.category_id ?? null,
        amount: cents / 100,
        due_date: due.toISOString().split("T")[0],
        installment_number: n > 1 ? i + 1 : null,
        status: "pendente",
        payment_method: data.payment_method ?? null,
        notes: data.notes ?? null,
      });
    }
    const { error } = await supabase.from("receivables" as any).insert(rows as any);
    if (error) throw error;
    return { success: true, count: rows.length };
  });

export const getFinanceDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const months: { key: string; label: string; endDate: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0] as string;
      months.push({ key, label, endDate });
    }
    const monthKeys = new Set(months.map((m) => m.key));

    const monthKeyOf = (paid_at: string | null, due_date: string | null) => {
      const ref = (paid_at || due_date || "") as string;
      return ref ? ref.slice(0, 7) : "";
    };

    const { data: paidReceivables, error: recErr } = await supabase
      .from("receivables")
      .select("amount, paid_at, due_date, contract_id, client_id")
      .eq("status", "pago");
    if (recErr) throw recErr;

    const { data: paidPayables, error: payErr } = await supabase
      .from("payables")
      .select("amount, paid_at, due_date, category_id")
      .eq("status", "pago");
    if (payErr) throw payErr;

    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name");
    const catName = new Map((categories || []).map((c: any) => [c.id, c.name]));

    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, type, status, monthly_value, start_date");
    const contractType = new Map((contracts || []).map((c: any) => [c.id, c.type]));
    const recurringActive = (contracts || []).filter(
      (c: any) => c.type === "recurring" && c.status === "active"
    );

    const monthlyTotals = new Map<string, number>();
    const receivablesCountMonthly = new Map<string, number>();
    let annualRevenue = 0;
    let annualCount = 0;
    let monthlyRevenue = 0;
    const distribution = new Map<string, number>();

    for (const r of (paidReceivables as any[]) || []) {
      const amt = Number(r.amount) || 0;
      const key = monthKeyOf(r.paid_at, r.due_date);
      const year = key ? Number(key.slice(0, 4)) : NaN;
      if (key && monthKeys.has(key)) {
        monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + amt);
        receivablesCountMonthly.set(key, (receivablesCountMonthly.get(key) || 0) + 1);
      }
      if (key === currentMonthKey) monthlyRevenue += amt;
      if (year === currentYear) {
        annualRevenue += amt;
        annualCount += 1;
        const t = r.contract_id ? contractType.get(r.contract_id) : null;
        const label = t === "recurring" ? "Recorrente" : "Avulso";
        distribution.set(label, (distribution.get(label) || 0) + amt);
      }
    }

    const ticketMedio = annualCount > 0 ? annualRevenue / annualCount : 0;

    let totalCost = 0;
    const costMonthly = new Map<string, number>();
    const costsByCat = new Map<string, number>();
    for (const p of (paidPayables as any[]) || []) {
      const amt = Number(p.amount) || 0;
      const key = monthKeyOf(p.paid_at, p.due_date);
      const year = key ? Number(key.slice(0, 4)) : NaN;
      if (key && monthKeys.has(key)) {
        costMonthly.set(key, (costMonthly.get(key) || 0) + amt);
      }
      if (key === currentMonthKey) totalCost += amt;
      if (year === currentYear) {
        const label = (p.category_id && catName.get(p.category_id)) || "Sem categoria";
        costsByCat.set(label, (costsByCat.get(label) || 0) + amt);
      }
    }

    const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - totalCost) / monthlyRevenue) * 100 : 0;

    const monthlyRevenueChart = months.map((m) => ({
      month: m.label,
      total: Math.round((monthlyTotals.get(m.key) || 0) * 100) / 100,
    }));

    const mrrChart = months.map((m) => {
      let mrr = 0;
      for (const c of recurringActive as any[]) {
        const start = String(c.start_date || "").slice(0, 10);
        if (!start || start <= m.endDate) mrr += Number(c.monthly_value) || 0;
      }
      return { month: m.label, total: Math.round(mrr * 100) / 100 };
    });

    const last6 = months.slice(-6);
    const revenueVsCosts = last6.map((m) => ({
      month: m.label,
      receita: Math.round((monthlyTotals.get(m.key) || 0) * 100) / 100,
      custo: Math.round((costMonthly.get(m.key) || 0) * 100) / 100,
    }));

    // Séries dos últimos 6 meses pra alimentar sparkline + delta dos cards de
    // KPI (mesmo padrão de getReceivablesSummaryTrends: compara os 2 últimos
    // pontos da série real, nunca um número inventado).
    const revenueTrend = last6.map((m) => Math.round((monthlyTotals.get(m.key) || 0) * 100) / 100);
    const costTrend = last6.map((m) => Math.round((costMonthly.get(m.key) || 0) * 100) / 100);
    const ticketTrend = last6.map((m) => {
      const rev = monthlyTotals.get(m.key) || 0;
      const cnt = receivablesCountMonthly.get(m.key) || 0;
      return cnt > 0 ? Math.round((rev / cnt) * 100) / 100 : 0;
    });
    const marginTrend = revenueTrend.map((rev, i) => (rev > 0 ? Math.round(((rev - costTrend[i]!) / rev) * 1000) / 10 : 0));
    // Faturamento anual não tem "mês a mês" próprio — é acumulado, então o
    // trend dele é a soma corrida dentro do ano atual (real, só que cumulativa).
    let runningAnnual = 0;
    const annualCumulativeTrend = months
      .map((m) => {
        if (Number(m.key.slice(0, 4)) === currentYear) runningAnnual += monthlyTotals.get(m.key) || 0;
        return Math.round(runningAnnual * 100) / 100;
      })
      .slice(-6);

    const deltaOf = (series: number[]) => {
      const c = series[series.length - 1] || 0;
      const p = series[series.length - 2] || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    return {
      kpis: {
        monthlyRevenue,
        annualRevenue,
        ticketMedio,
        totalCost,
        profitMargin,
      },
      kpiTrends: {
        monthlyRevenue: revenueTrend,
        annualRevenue: annualCumulativeTrend,
        ticketMedio: ticketTrend,
        totalCost: costTrend,
        profitMargin: marginTrend,
      },
      kpiDeltas: {
        monthlyRevenue: deltaOf(revenueTrend),
        annualRevenue: deltaOf(annualCumulativeTrend),
        ticketMedio: deltaOf(ticketTrend),
        totalCost: deltaOf(costTrend),
        profitMargin: deltaOf(marginTrend),
      },
      charts: {
        monthlyRevenue: monthlyRevenueChart,
        mrr: mrrChart,
        revenueDistribution: Array.from(distribution.entries()).map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100,
        })),
        revenueVsCosts,
        costsByCategory: Array.from(costsByCat.entries()).map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100,
        })),
      },
    };
  });
