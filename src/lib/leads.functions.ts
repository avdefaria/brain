import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const STAGES = [
  { id: 'novos_leads', label: 'Novos leads' },
  { id: 'primeiro_contato', label: 'Primeiro contato' },
  { id: 'em_negociacao', label: 'Em negociação' },
  { id: 'apresentacao_agencia', label: 'Apresentação da agência' },
  { id: 'proposta_enviada', label: 'Proposta enviada' },
  { id: 'follow_up', label: 'Follow up' },
  { id: 'vendas_feitas', label: 'Vendas feitas' },
  { id: 'vendas_perdidas', label: 'Vendas perdidas' },
];

export const getLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { responsible_id?: string | null, startDate?: string | null, endDate?: string | null, funnel_type_id?: string | null, showConverted?: boolean } | void) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    let query = supabase
      .from('leads')
      .select(`
        *,
        responsible:profiles!leads_responsible_id_fkey(id, full_name),
        niche:niches(id, name),
        lead_sales_channels(
          sales_channels:sales_channel_id(id, name)
        ),
        lead_stage_history(*),
        funnel_type:funnel_types(id, name)
      `);

    if (data?.responsible_id && data.responsible_id !== 'all') {
      query = query.eq('responsible_id', data.responsible_id);
    }

    if (data?.startDate) {
      query = query.gte('created_at', data.startDate);
    }

    if (data?.endDate) {
      query = query.lte('created_at', data.endDate);
    }

    if (data?.funnel_type_id && data.funnel_type_id !== 'all') {
      query = query.eq('funnel_type_id', data.funnel_type_id);
    }

    if (!data?.showConverted) {
      query = query.is('converted_at', null);
    }

    const { data: leads, error } = await query.order('position', { ascending: true });

    if (error) throw error;
    return leads || [];
  });

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { responsible_id?: string | null, startDate?: string | null, endDate?: string | null, funnel_type_id?: string | null, showConverted?: boolean } | void) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    let query = supabase
      .from('leads')
      .select('recurring_revenue, one_time_revenue, funnel_stage, created_at, responsible_id, funnel_type_id');

    if (data?.responsible_id && data.responsible_id !== 'all') {
      query = query.eq('responsible_id', data.responsible_id);
    }

    if (data?.startDate) {
      query = query.gte('created_at', data.startDate);
    }

    if (data?.endDate) {
      query = query.lte('created_at', data.endDate);
    }

    if (data?.funnel_type_id && data.funnel_type_id !== 'all') {
      query = query.eq('funnel_type_id', data.funnel_type_id);
    }

    if (!data?.showConverted) {
      query = query.is('converted_at', null);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    const openLeads = leads?.filter(l => l.funnel_stage && !['vendas_feitas', 'vendas_perdidas'].includes(l.funnel_stage)) || [];
    const stats = {
      total: leads?.length || 0,
      proposals: leads?.filter(l => l.funnel_stage === 'proposta_enviada').length || 0,
      // "Previsto": valor mensal puro do pipeline em aberto (sem multiplicar pelos meses de
      // recorrência) — mesma convenção usada no dashboard Comercial (número principal do card).
      pipeline: openLeads.reduce((acc, l) => acc + (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0), 0),
      // Projeção de MRR (valor mensal x meses de recorrência) — dado complementar, mesma fórmula
      // usada em toda a área Comercial.
      pipelineMrr: openLeads.reduce((acc, l) => acc + (Number(l.recurring_revenue) || 0) * (Number(l.mrr_months) || 1), 0),
      sales: leads?.filter(l => l.funnel_stage === 'vendas_feitas').length || 0,
      lost: leads?.filter(l => l.funnel_stage === 'vendas_perdidas').length || 0,
    };

    return stats;
  });

const trendsSchema = z.object({
  responsible_id: z.string().nullable().optional(),
  funnel_type_id: z.string().nullable().optional(),
  granularity: z.enum(["day", "week", "month"]).default("month"),
});

export const getLeadStatsTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { responsible_id?: string | null; funnel_type_id?: string | null; granularity?: "day" | "week" | "month" }) => trendsSchema.parse(data))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const now = new Date();
    const n = data.granularity === "day" ? 7 : 6;
    const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
    const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
    const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });

    if (data.granularity === "day") {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, label: weekdayFmt.format(start).replace(".", ""), start, end });
      }
    } else if (data.granularity === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`, start, end });
      }
    } else {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        buckets.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, label: monthFmt.format(start).replace(".", ""), start, end });
      }
    }

    const windowStart = buckets[0]!.start;
    const windowEnd = buckets[buckets.length - 1]!.end;

    const applyFilters = (q: any) => {
      if (data.responsible_id && data.responsible_id !== "all") q = q.eq("responsible_id", data.responsible_id);
      if (data.funnel_type_id && data.funnel_type_id !== "all") q = q.eq("funnel_type_id", data.funnel_type_id);
      return q;
    };

    const bucketOf = (iso: string | null) => {
      if (!iso) return null;
      const t = new Date(iso).getTime();
      for (const b of buckets) if (t >= b.start.getTime() && t <= b.end.getTime()) return b.key;
      return null;
    };

    const { data: createdLeads } = await applyFilters(
      supabase.from("leads").select("id, created_at, funnel_stage, recurring_revenue, one_time_revenue, mrr_months, responsible_id, funnel_type_id").gte("created_at", windowStart.toISOString()).lte("created_at", windowEnd.toISOString())
    );
    const { data: convertedLeads } = await applyFilters(
      supabase.from("leads").select("id, converted_at, responsible_id, funnel_type_id").gte("converted_at", windowStart.toISOString()).lte("converted_at", windowEnd.toISOString())
    );
    let lostHistoryQuery = supabase
      .from("lead_stage_history" as any)
      .select("lead_id, entered_at, leads!inner(responsible_id, funnel_type_id)")
      .eq("stage", "vendas_perdidas")
      .gte("entered_at", windowStart.toISOString())
      .lte("entered_at", windowEnd.toISOString());
    if (data.responsible_id && data.responsible_id !== "all") lostHistoryQuery = lostHistoryQuery.eq("leads.responsible_id", data.responsible_id);
    if (data.funnel_type_id && data.funnel_type_id !== "all") lostHistoryQuery = lostHistoryQuery.eq("leads.funnel_type_id", data.funnel_type_id);
    const { data: lostHistory } = await lostHistoryQuery;

    const leadsList = (createdLeads as any[]) || [];
    const convertedList = (convertedLeads as any[]) || [];
    const lostList = (lostHistory as any[]) || [];

    const zero = () => buckets.map((b) => ({ key: b.key, label: b.label, total: 0 }));
    const leadsSeries = zero();
    const proposalsSeries = zero();
    const previstoSeries = zero();
    const salesSeries = zero();
    const lostSeries = zero();

    const byKey = new Map(buckets.map((b) => [b.key, b]));
    const idxOf = (key: string | null) => (key ? buckets.findIndex((b) => b.key === key) : -1);

    for (const l of leadsList) {
      const idx = idxOf(bucketOf(l.created_at));
      if (idx < 0) continue;
      leadsSeries[idx]!.total += 1;
      if (l.funnel_stage === "proposta_enviada") proposalsSeries[idx]!.total += 1;
      if (l.funnel_stage && !["vendas_feitas", "vendas_perdidas"].includes(l.funnel_stage)) {
        previstoSeries[idx]!.total += (Number(l.recurring_revenue) || 0) + (Number(l.one_time_revenue) || 0);
      }
    }
    for (const l of convertedList) {
      const idx = idxOf(bucketOf(l.converted_at));
      if (idx < 0) continue;
      salesSeries[idx]!.total += 1;
    }
    for (const h of lostList) {
      const idx = idxOf(bucketOf(h.entered_at));
      if (idx < 0) continue;
      lostSeries[idx]!.total += 1;
    }

    const delta = (series: { total: number }[]) => {
      const c = series[series.length - 1]?.total || 0;
      const p = series[series.length - 2]?.total || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    return {
      trends: {
        leads: leadsSeries.map((d) => d.total),
        propostas: proposalsSeries.map((d) => d.total),
        previsto: previstoSeries.map((d) => d.total),
        vendas: salesSeries.map((d) => d.total),
        perdidas: lostSeries.map((d) => d.total),
      },
      deltas: {
        leads: delta(leadsSeries),
        propostas: delta(proposalsSeries),
        previsto: delta(previstoSeries),
        vendas: delta(salesSeries),
        perdidas: delta(lostSeries),
      },
    };
  });

export const getFunnelTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from('funnel_types' as any)
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  });

export const addFunnelType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((name: string) => z.string().min(1).parse(name))
  .handler(async ({ context, data: name }) => {
    const supabase = context.supabase;

    // Check for duplicates (case insensitive)
    const { data: existing } = await supabase
      .from('funnel_types' as any)
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (existing) {
      throw new Error("Este tipo de funil já existe.");
    }

    const { data, error } = await supabase
      .from('funnel_types' as any)
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  });

export const deleteFunnelType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().parse(id))
  .handler(async ({ context, data: id }) => {
    const supabase = context.supabase;

    // Check if any leads are using this funnel type
    const { count, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('funnel_type_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      throw new Error(`Não é possível excluir: ${count} ${count === 1 ? 'lead está' : 'leads estão'} usando este tipo de funil.`);
    }

    const { error } = await supabase
      .from('funnel_types' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { sales_channels, ...updates } = data;
    
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([updates])
      .select()
      .single();

    if (error) throw error;

    // Log initial stage history
    if (lead) {
      await supabase.from('lead_stage_history' as any).insert({
        lead_id: lead.id,
        stage: lead.funnel_stage,
        entered_at: new Date().toISOString()
      } as any);
    }

    // Handle sales channels N:N
    if (sales_channels && sales_channels.length > 0) {
      const { data: channels } = await supabase
        .from('sales_channels')
        .select('id')
        .in('name', sales_channels);

      if (channels && channels.length > 0) {
        const junctionData = channels.map(c => ({
          lead_id: lead.id,
          sales_channel_id: c.id
        }));
        const { error: junctionError } = await supabase
          .from('lead_sales_channels')
          .insert(junctionData);
        if (junctionError) console.error("Error inserting lead sales channels:", junctionError);
      }
    }
    return lead;
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string } & any) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const { id, sales_channels, ...updates } = data;
    
    const { data: oldLead } = await supabase
      .from('leads')
      .select('funnel_stage')
      .eq('id', id)
      .single();

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log stage history if changed
    if (lead && oldLead && lead.funnel_stage !== oldLead.funnel_stage) {
      // Close previous entry
      await supabase
        .from('lead_stage_history' as any)
        .update({ exited_at: new Date().toISOString() } as any)
        .eq('lead_id', id)
        .is('exited_at', null);

      // Create new entry
      await supabase
        .from('lead_stage_history' as any)
        .insert({
          lead_id: id,
          stage: lead.funnel_stage,
          entered_at: new Date().toISOString()
        } as any);
    }

    // Update sales channels N:N
    if (sales_channels !== undefined) {
      // Remove old
      await supabase.from('lead_sales_channels').delete().eq('lead_id', id);

      // Insert new
      if (sales_channels.length > 0) {
        const { data: channels } = await supabase
          .from('sales_channels')
          .select('id')
          .in('name', sales_channels);

        if (channels && channels.length > 0) {
          const junctionData = channels.map(c => ({
            lead_id: id,
            sales_channel_id: c.id
          }));
          const { error: junctionError } = await supabase
            .from('lead_sales_channels')
            .insert(junctionData);
          if (junctionError) console.error("Error updating lead sales channels:", junctionError);
        }
      }
    }

    return lead;
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().parse(id))
  .handler(async ({ context, data: id }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  });

export const updateLeadPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string, funnel_stage: string, position: number }) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;

    const { data: oldLead } = await supabase
      .from('leads')
      .select('funnel_stage')
      .eq('id', data.id)
      .single();

    const { error } = await supabase
      .from('leads')
      .update({
        funnel_stage: data.funnel_stage,
        position: data.position,
        last_contact_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (error) throw error;

    // Log stage history if the stage actually changed (drag between columns,
    // not just a reorder within the same column)
    if (oldLead && oldLead.funnel_stage !== data.funnel_stage) {
      await supabase
        .from('lead_stage_history' as any)
        .update({ exited_at: new Date().toISOString() } as any)
        .eq('lead_id', data.id)
        .is('exited_at', null);

      await supabase
        .from('lead_stage_history' as any)
        .insert({
          lead_id: data.id,
          stage: data.funnel_stage,
          entered_at: new Date().toISOString()
        } as any);
    }

    return { success: true };
  });

export const registerLeadContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { leadId: string, nextContactAt: string | null }) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;

    const { data: current, error: fetchError } = await supabase
      .from('leads')
      .select('contact_attempts')
      .eq('id', data.leadId)
      .single();

    if (fetchError) throw fetchError;

    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        contact_attempts: (current?.contact_attempts || 0) + 1,
        next_contact_at: data.nextContactAt,
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', data.leadId)
      .select()
      .single();

    if (error) throw error;
    return lead;
  });
