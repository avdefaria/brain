import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/squads")({
  component: SquadsPage,
});

function SquadsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-title font-bold">Gestão de Squads</h1>
      <p className="text-[var(--ink-3)]">Área em desenvolvimento.</p>
    </div>
  );
}
