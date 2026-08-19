import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getNiches = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from("niches")
      .select("*")
      .order("name");
    if (error) throw error;
    return data as { id: string, name: string }[];
  });

export const addNiche = createServerFn({ method: "POST" })
  .validator((name: string) => z.string().parse(name))
  .handler(async ({ data: name }) => {
    // Normalization: trim and capitalize
    const normalized = name.trim().split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Check for existence ignoring case/accents (simple version)
    const { data: existing } = await supabase
      .from("niches")
      .select("*")
      .ilike("name", normalized)
      .maybeSingle();

    if (existing) return existing as { id: string, name: string };

    const { data, error } = await supabase
      .from("niches")
      .insert([{ name: normalized }])
      .select("*")
      .single();

    if (error) throw error;
    return data as { id: string, name: string };
  });
