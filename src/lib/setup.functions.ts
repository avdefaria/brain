import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createInitialAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    // Check if the user already exists to make it idempotent
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      throw listError;
    }

    const existingUser = users.users.find(u => u.email === 'alan.vieira.faria@gmail.com');
    
    if (existingUser) {
      console.log("Admin user already exists, skipping creation");
      return { user: existingUser };
    }

    console.log("Creating initial admin user...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'alan.vieira.faria@gmail.com',
      password: '745826@Faria',
      email_confirm: true
    });

    if (error) {
      // Still handle the race condition if multiple requests hit at once
      if (error.message.includes('already has been registered')) {
        return { message: 'User already registered' };
      }
      throw error;
    }

    return data;
  });
