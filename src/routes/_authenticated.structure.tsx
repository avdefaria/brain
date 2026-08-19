import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/structure")({
  component: StructurePage,
});

function StructurePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-title font-bold">Estrutura Organizacional</h1>
      <p className="text-[#8A8FA3]">Área em desenvolvimento.</p>
    </div>
  );
}
