import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getDeliveriesByAccount } from "@/lib/deliverables.functions";
import { AccountPerformanceDetail } from "@/components/AccountPerformanceDetail";

export const Route = createFileRoute("/_authenticated/projects/performance/$accountId")({
  component: AccountPerformancePage,
});

function AccountPerformancePage() {
  const { accountId } = Route.useParams();
  const fetchAccountDeliveries = useServerFn(getDeliveriesByAccount);

  // Mesma chave da Gestão de Entregas: reaproveita o cache quando o usuário vem de lá.
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["deliveries-accounts", "all"],
    queryFn: () => fetchAccountDeliveries({ data: { typeId: "all" } }),
  });

  const acc = accounts.find((a: any) => String(a.id) === accountId && !a.isInternal);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--violet-500)]" />
      </div>
    );
  }

  if (!acc) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--ink-3)]">Conta não encontrada.</p>
        <Link
          to="/projects/deliverables"
          search={{ view: "performance" }}
          className="mt-4 inline-block text-sm font-bold text-[var(--violet-300)]"
        >
          Voltar para Gestão de Entregas
        </Link>
      </div>
    );
  }

  return <AccountPerformanceDetail acc={acc as any} />;
}
