import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Total a Receber (Todos Pendentes)
    const { data: pending, error: pendingErr } = await supabase
      .from('receivables')
      .select('amount')
      .eq('status', 'pendente');

    // Recebido no Mês
    const { data: paidMonth, error: paidErr } = await supabase
      .from('receivables')
      .select('amount')
      .eq('status', 'pago')
      .gte('paid_at', firstDayOfMonth)
      .lte('paid_at', lastDayOfMonth + 'T23:59:59');

    // Atrasados (Vencidos e Pendentes)
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
    const today = new Date().toISOString().split('T')[0];

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
      if (!byClient[r.client_id]) byClient[r.client_id] = [];
      byClient[r.client_id].push(r);
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
        if (r.status === 'atrasado') return true;
        if (r.status !== 'pago' && r.due_date && r.due_date < today) return true;
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
