import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeRiskLevel } from "@/lib/risk-level";

import { z } from "zod";

export const getSalesChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sales_channels" as any)
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching sales channels:", error);
      throw error;
    }
    return data as any as { id: string, name: string }[];
  });

export const addSalesChannel = createServerFn({ method: "POST" })
  .validator((name: string) => z.string().parse(name))
  .handler(async ({ data: name }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Normalization: trim and capitalize
    const normalized = name.trim().split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Check for existence ignoring case/accents (simple version)
    const { data: existing } = await supabaseAdmin
      .from("sales_channels" as any)
      .select("*")
      .ilike("name", normalized)
      .maybeSingle();

    if (existing) return existing as any as { id: string, name: string };

    const { data, error } = await supabaseAdmin
      .from("sales_channels" as any)
      .insert([{ name: normalized }])
      .select("*")
      .single();

    if (error) throw error;
    return data as any as { id: string, name: string };
  });

export const getClientsWithChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    // For general list, we use client-side supabase to respect RLS or the caller's identity
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        niches:niche_id(id, name),
        squads(name),
        contracts(id, type, monthly_value, total_value, start_date, renewal_date, status, created_at),
        receivables(id, amount, status, due_date),
        accounts(
          id,
          account_name,
          account_squads(
            squad_id
          ),
          tasks(id, stage)
        ),
        client_sales_channels(
          sales_channels:sales_channel_id(id, name)
        ),
        client_calls(id),
        client_onboarding_items(item_key),
        client_offboarding_items(item_key)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as any[]) || []).map((c) => ({
      ...c,
      risk_level: computeRiskLevel(c.health_score, c.receivables),
    }));
  });

export const getClientStatusCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data, error } = await supabase.from("clients").select("status");
    if (error) throw error;
    const counts: Record<string, number> = { onboarding: 0, ativo: 0, em_aviso: 0, pausado: 0, inativo: 0 };
    for (const c of (data as any[]) || []) {
      if (c.status in counts) counts[c.status] += 1;
    }
    const total = ((data as any[]) || []).length;
    return { counts, total };
  });
