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
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        responsible:profiles!leads_responsible_id_fkey(id, full_name),
        niche:niches(id, name),
        lead_sales_channels(
          sales_channels:sales_channel_id(id, name)
        )
      `)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  });

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: leads, error } = await supabase
      .from('leads')
      .select('recurring_revenue, funnel_stage');

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

    // Handle sales channels N:N
    if (sales_channels && sales_channels.length > 0) {
      const { data: channels } = await supabase
        .from('sales_channels')
        .select('id')
        .in('name', sales_channels);

      if (channels) {
        const junctionData = channels.map(c => ({
          lead_id: lead.id,
          sales_channel_id: c.id
        }));
        await supabase.from('lead_sales_channels' as any).insert(junctionData as any);
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
    
    const { data: lead, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update sales channels N:N
    if (sales_channels !== undefined) {
      // Remove old
      await supabase.from('lead_sales_channels' as any).delete().eq('lead_id', id);

      // Insert new
      if (sales_channels.length > 0) {
        const { data: channels } = await supabase
          .from('sales_channels')
          .select('id')
          .in('name', sales_channels);

        if (channels) {
          const junctionData = channels.map(c => ({
            lead_id: id,
            sales_channel_id: c.id
          }));
          await supabase.from('lead_sales_channels' as any).insert(junctionData as any);
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
        position: data.position
      })
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });
