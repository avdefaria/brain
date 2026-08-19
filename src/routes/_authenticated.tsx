import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    console.log("Checking session in _authenticated beforeLoad");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Session fetch error in _authenticated:", error);
    }
    if (!data.session) {
      console.log("No session found, redirecting to login");
      throw redirect({
        to: "/auth/login",
      });
    }
    console.log("Session found:", data.session.user.email);
    return { session: data.session };
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
