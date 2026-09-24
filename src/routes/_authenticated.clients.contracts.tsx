import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  RotateCw,
  Calendar,
  DollarSign,
  Eye,
  Building2,
  CreditCard,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getContractsOverview } from "@/lib/contracts.functions";

export const Route = createFileRoute("/_authenticated/clients/contracts")({
  component: ContractsPage,
});

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const date = (v: string | null) => (v ? new Date(v + "T00:00:00").toLocaleDateString("pt-BR") : "—");

function ContractsPage() {
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const fetchOverview = useServerFn(getContractsOverview);

  const { data, isLoading } = useQuery({
    queryKey: ["contracts-overview"],
    queryFn: () => fetchOverview(),
  });

  const kpis = data?.kpis;
  const contracts = data?.contracts || [];

  const kpiData = [
    { label: "Contratos Ativos", value: kpis?.activeContracts ?? 0, icon: FileText },
    { label: "Churns na Base", value: kpis?.churnedClients ?? 0, icon: RotateCw },
    { label: "Renovações Próximas (30d)", value: kpis?.upcomingRenewals ?? 0, icon: Calendar },
    { label: "MRR Total", value: money(kpis?.mrrTotal ?? 0), icon: DollarSign },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Gestão de Contratos</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border-[var(--line-1)] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-[var(--violet-500)]/10 rounded-full flex items-center justify-center text-[var(--violet-500)]">
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--ink-3)]">{kpi.label}</p>
                <h3 className="text-xl font-bold text-[var(--ink-1)] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title text-[var(--ink-1)]">Carteira de Contratos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-[var(--ink-3)]">Carregando...</div>
          ) : contracts.length === 0 ? (
            <div className="p-6 text-sm text-[var(--ink-3)]">Nenhum contrato cadastrado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[var(--line-1)]">
                  <TableHead className="font-bold text-[var(--ink-1)]">Nº Contrato</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Cliente</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Tipo</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Valor Mensal</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Início</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Renovação</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Status</TableHead>
                  <TableHead className="text-right font-bold text-[var(--ink-1)]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract: any) => (
                  <TableRow key={contract.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50">
                    <TableCell className="font-medium text-[var(--violet-500)]">
                      {contract.contractNumber || contract.id.split("-")[0].toUpperCase()}
                    </TableCell>
                    <TableCell className="text-[var(--ink-1)]">{contract.clientName}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{contract.type === "recurring" ? "Recorrente" : "Avulso"}</TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)] font-jakarta">{money(contract.monthlyValue)}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{date(contract.startDate)}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{date(contract.renewalDate)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        contract.status === 'active' ? 'bg-[var(--success-tint)] text-[var(--success)]' : 'bg-[var(--surface-3)] text-[var(--ink-3)]'
                      )}>
                        {contract.status === 'active' ? 'Ativo' : contract.status === 'cancelled' ? 'Cancelado' : contract.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--violet-500)]"
                        onClick={() => setSelectedContract(contract)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="sm:max-w-[500px] border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-title font-bold text-[var(--ink-1)]">
              Detalhes do Contrato{selectedContract?.contractNumber ? `: ${selectedContract.contractNumber}` : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--line-1)]">
                  <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-wider">Mensal</p>
                  <p className="text-sm font-bold text-[var(--ink-1)] mt-1">{money(selectedContract.monthlyValue)}</p>
                </div>
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--line-1)]">
                  <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-wider">Total</p>
                  <p className="text-sm font-bold text-[var(--ink-1)] mt-1">{money(selectedContract.totalValue)}</p>
                </div>
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--line-1)]">
                  <p className="text-[10px] uppercase font-bold text-[var(--ink-1)] mt-1">{selectedContract.type === "recurring" ? "Recorrente" : "Avulso"}</p>
                  <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-wider">Tipo</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Cliente
                </h4>
                <div className="p-4 rounded-xl border border-[var(--line-1)] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--ink-3)]">Razão Social</span>
                    <span className="text-xs font-medium text-[var(--ink-1)]">{selectedContract.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--ink-3)]">CNPJ/CPF</span>
                    <span className="text-xs font-medium text-[var(--ink-1)]">{selectedContract.clientCnpj || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--ink-3)]">E-mail</span>
                    <span className="text-xs font-medium text-[var(--ink-1)]">{selectedContract.clientEmail || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Período
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Início:</span>
                      <span className="font-medium">{date(selectedContract.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Duração:</span>
                      <span className="font-medium">{selectedContract.mrrMonths ? `${selectedContract.mrrMonths} meses` : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Renovação:</span>
                      <span className="font-medium text-[var(--violet-500)]">{date(selectedContract.renewalDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="h-3 w-3" /> Pagamento
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Forma:</span>
                      <span className="font-medium">{selectedContract.paymentMethod || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Vencimento:</span>
                      <span className="font-medium">{selectedContract.paymentDay ? `Dia ${selectedContract.paymentDay}` : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Auto-renovação:</span>
                      <span className={cn("font-bold uppercase", selectedContract.autoRenewal ? "text-[var(--success)]" : "text-[var(--ink-3)]")}>
                        {selectedContract.autoRenewal ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
