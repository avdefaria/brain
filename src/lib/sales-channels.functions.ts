import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getSalesChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("sales_channels" as any)
      .select("*")
      .order("name");
    if (error) throw error;
    return data as { id: string, name: string }[];
  });

export const addSalesChannel = createServerFn({ method: "POST" })
  .validator((name: string) => z.string().parse(name))
  .handler(async ({ data: name }) => {
    // Normalization: trim and capitalize
    const normalized = name.trim().split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Check for existence ignoring case/accents (simple version)
    const { data: existing } = await supabase
      .from("sales_channels" as any)
      .select("*")
      .ilike("name", normalized)
      .maybeSingle();

    if (existing) return existing as { id: string, name: string };

    const { data, error } = await supabase
      .from("sales_channels" as any)
      .insert([{ name: normalized }])
      .select("*")
      .single();

    if (error) throw error;
    return data as { id: string, name: string };
  });

export const getClientsWithChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        squads(name),
        client_sales_channels(
          sales_channels:sales_channel_id(id, name)
        )
      `);
    if (error) throw error;
    return data;
  });
