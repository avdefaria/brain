import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Supabase getSession error in _authenticated:", error);
        throw redirect({ to: "/auth/login" });
      }

      if (!data.session) {
        console.warn("No active session in _authenticated route, redirecting to login");
        throw redirect({ to: "/auth/login" });
      }

      console.log("Session verified in _authenticated route for:", data.session.user?.email);
      return { session: data.session };
    } catch (e) {
      if (e instanceof Error && (e.message.includes('redirect') || (e as any).status === 302)) throw e;
      console.error("Unexpected Auth guard error:", e);
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
