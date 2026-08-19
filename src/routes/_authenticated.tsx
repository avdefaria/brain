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

      let session = data.session;

      // In browser, handle race conditions where getSession might be null briefly
      if (!session && typeof window !== 'undefined') {
        const storageKey = Object.keys(localStorage).find(key => key.includes('-auth-token'));
        const storedSession = storageKey ? localStorage.getItem(storageKey) : null;
        if (storedSession) {
          console.log("Found session in localStorage during beforeLoad fallback");
          session = JSON.parse(storedSession);
        }
      }

      if (!session) {
        console.warn("No active session in _authenticated route, redirecting to login");
        throw redirect({ to: "/auth/login" });
      }

      console.log("Session verified in _authenticated route for:", session.user?.email);
      return { session };
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
