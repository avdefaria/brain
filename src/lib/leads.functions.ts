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
  .validator((data: { responsible_id?: string | null, startDate?: string | null, endDate?: string | null, funnel_type_id?: string | null } | void) => data)
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

    const { data: leads, error } = await query.order('position', { ascending: true });

    if (error) throw error;
    return leads || [];
  });

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { responsible_id?: string | null, startDate?: string | null, endDate?: string | null, funnel_type_id?: string | null } | void) => data)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    let query = supabase
      .from('leads')
      .select('recurring_revenue, funnel_stage, created_at, responsible_id, funnel_type_id');

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

    const { data: leads, error } = await query;

    if (error) throw error;

    const stats = {
      total: leads?.length || 0,
      proposals: leads?.filter(l => l.funnel_stage === 'proposta_enviada').length || 0,
      pipeline: leads?.filter(l => l.funnel_stage && !['vendas_feitas', 'vendas_perdidas'].includes(l.funnel_stage))
        .reduce((acc, l) => acc + (Number(l.recurring_revenue) || 0), 0) || 0,
      sales: leads?.filter(l => l.funnel_stage === 'vendas_feitas').length || 0,
      lost: leads?.filter(l => l.funnel_stage === 'vendas_perdidas').length || 0,
    };

    return stats;
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
    const { error } = await supabase
      .from('leads')
      .update({ 
        funnel_stage: data.funnel_stage,
        position: data.position,
        last_contact_at: new Date().toISOString()
      })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });
