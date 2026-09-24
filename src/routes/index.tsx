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
        <div
          className="w-10 h-10 rounded-full animate-pulse"
          style={{
            background: "radial-gradient(circle at 35% 30%, var(--violet-200), var(--violet-500) 70%)",
            boxShadow: "var(--glow-orb)",
          }}
        />
      </div>
    </div>
  );
}