import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";


export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth/login", replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-8 bg-[#3D4FE8] rounded-full flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <p className="text-sm text-[#8A8FA3] font-body animate-pulse">Sincronizando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

