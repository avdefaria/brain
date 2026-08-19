import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getSalesChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("sales_channels")
      .select("*")
      .order("name");
    if (error) throw error;
    return data;
  });

export const addSalesChannel = createServerFn({ method: "POST" })
  .input((name: string) => name)
  .handler(async ({ input: name }) => {
    // Normalization: trim and capitalize
    const normalized = name.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Check for existence ignoring case/accents (simple version)
    const { data: existing } = await supabase
      .from("sales_channels")
      .select("*")
      .ilike("name", normalized)
      .single();

    if (existing) return existing;

    const { data, error } = await supabase
      .from("sales_channels")
      .insert([{ name: normalized }])
      .select("*")
      .single();

    if (error) throw error;
    return data;
  });

export const getClientsWithChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        squads(name),
        client_sales_channels(
          sales_channels(id, name)
        )
      `);
    if (error) throw error;
    return data;
  });
