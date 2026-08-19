import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        console.warn("No active session found in _authenticated route, redirecting to login");
        throw redirect({
          to: "/auth/login",
        });
      }
      return { session: data.session };
    } catch (e) {
      if (e instanceof Error && e.message.includes('redirect')) throw e;
      console.error("Auth guard error:", e);
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
