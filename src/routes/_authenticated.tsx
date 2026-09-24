import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyModuleAccess, MODULE_DEFS } from "@/lib/module-access.functions";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function moduleKeyForPath(pathname: string): string | null {
  const match = MODULE_DEFS.find((m) => pathname.startsWith(m.pathPrefix));
  return match?.key || null;
}

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fetchAccess = useServerFn(getMyModuleAccess);

  const { data: access } = useQuery({
    queryKey: ["my-module-access"],
    queryFn: () => fetchAccess(),
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth/login", replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-2)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-8 bg-[var(--violet-500)] rounded-full flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-[var(--surface-1)] rounded-full"></div>
          </div>
          <p className="text-sm text-[var(--ink-3)] font-body animate-pulse">Sincronizando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const requiredModule = moduleKeyForPath(location.pathname);
  const blocked = requiredModule && access && !access.allowedModules.includes(requiredModule);

  return (
    <AppShell>
      {blocked ? (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center p-8">
          <div className="h-14 w-14 rounded-full bg-[var(--danger-tint)] flex items-center justify-center text-[var(--danger)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-title font-bold text-[var(--ink-1)]">Sem acesso a este módulo</h2>
            <p className="text-sm text-[var(--ink-3)] mt-1">Fale com um administrador se acha que deveria ter acesso.</p>
          </div>
          <Link to="/dashboard" className="text-sm font-bold text-[var(--violet-500)] hover:underline">Voltar ao início</Link>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}

