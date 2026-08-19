import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getSquads = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from('squads')
      .select('*, profiles(count)')
      .order('name');
    
    if (error) throw error;
    return data;
  });

export const getCollaborators = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, function')
      .order('full_name');
    
    if (error) throw error;
    return data;
  });
