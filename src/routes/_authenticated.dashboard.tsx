import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-title font-bold">Dashboard Ongo</h1>
      <p className="text-[#8A8FA3]">Bem-vindo ao sistema Brain.</p>
    </div>
  );
}
