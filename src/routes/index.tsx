import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth/login", replace: true });
      }
    }
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-2)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-8 bg-[var(--violet-500)] rounded-full flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 bg-[var(--surface-1)] rounded-full"></div>
        </div>
      </div>
    </div>
  );
}