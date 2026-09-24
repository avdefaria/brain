import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSquads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const { data, error } = await supabase
      .from('squads')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  });

export const getCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, function')
      .order('full_name');

    if (error) throw error;
    return data;
  });

export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const [{ count: squadCount }, { count: collaboratorCount }, { count: clientCount }] = await Promise.all([
      supabase.from('squads').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
    ]);

    return {
      hasSquad: (squadCount || 0) > 0,
      hasCollaborator: (collaboratorCount || 0) > 1, // 1 = só o próprio usuário
      hasClient: (clientCount || 0) > 0,
    };
  });
