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
