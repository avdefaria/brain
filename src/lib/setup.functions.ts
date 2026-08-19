import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createInitialAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'alan.vieira.faria@gmail.com',
      password: '745826@Faria',
      email_confirm: true
    });
    if (error && !error.message.includes('already has been registered')) {
      throw error;
    }
    return data;
  });
