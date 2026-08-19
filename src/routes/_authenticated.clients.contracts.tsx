import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, 
  RotateCw, 
  Users, 
  CheckCircle2,
  Calendar,
  DollarSign,
  Eye,
  Building2,
  CreditCard,
  Clock
} from "lucide-react";
import { useState } from "react";
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
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/contracts")({
  component: ContractsPage,
});

const kpiData = [
  { label: "Contratos Ativos", value: "142", icon: FileText },
  { label: "Churns na Base", value: "8", icon: RotateCw },
  { label: "Renovações Próximas", value: "12", icon: Calendar },
  { label: "MRR Total", value: "R$ 542k", icon: DollarSign },
];

const mockContracts = [
  { id: "CTR-001", client: "TechFlow Systems", type: "Recorrente", value: "R$ 12.000", start: "01/01/2024", renewal: "01/01/2025", status: "Ativo" },
  { id: "CTR-002", client: "Global Logistics", type: "Recorrente", value: "R$ 8.500", start: "15/02/2024", renewal: "15/02/2025", status: "Ativo" },
  { id: "CTR-003", client: "Urban Eats", type: "Avulso", value: "R$ 25.000", start: "10/03/2024", renewal: "-", status: "Finalizado" },
];

function ContractsPage() {
  const [selectedContract, setSelectedContract] = useState<any>(null);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Contratos</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-[#3D4FE8]/10 rounded-full flex items-center justify-center text-[#3D4FE8]">
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#8A8FA3]">{kpi.label}</p>
                <h3 className="text-xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title text-[#0E0E16]">Carteira de Contratos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="font-bold text-[#0E0E16]">Nº Contrato</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Cliente</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Tipo</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Valor Mensal</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Início</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Renovação</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Status</TableHead>
                <TableHead className="text-right font-bold text-[#0E0E16]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContracts.map((contract) => (
                <TableRow key={contract.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                  <TableCell className="font-medium text-[#3D4FE8]">{contract.id}</TableCell>
                  <TableCell className="text-[#0E0E16]">{contract.client}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.type}</TableCell>
                  <TableCell className="font-bold text-[#0E0E16] font-jakarta">{contract.value}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.start}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.renewal}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      contract.status === 'Ativo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {contract.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8]"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="sm:max-w-[500px] border-[#E4E6F0]">
          <DialogHeader>
            <DialogTitle className="text-xl font-title font-bold text-[#0E0E16]">
              Detalhes do Contrato: {selectedContract?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E4E6F0]">
                <p className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-wider">Mensal</p>
                <p className="text-sm font-bold text-[#0E0E16] mt-1">{selectedContract?.value}</p>
              </div>
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E4E6F0]">
                <p className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-wider">Total</p>
                <p className="text-sm font-bold text-[#0E0E16] mt-1">R$ 144.000</p>
              </div>
              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E4E6F0]">
                <p className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-wider">Tipo</p>
                <p className="text-sm font-bold text-[#0E0E16] mt-1">{selectedContract?.type}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-3 w-3" /> Cliente
              </h4>
              <div className="p-4 rounded-xl border border-[#E4E6F0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-[#8A8FA3]">Razão Social</span>
                  <span className="text-xs font-medium text-[#0E0E16]">{selectedContract?.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#8A8FA3]">CNPJ</span>
                  <span className="text-xs font-medium text-[#0E0E16]">00.000.000/0001-00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#8A8FA3]">E-mail</span>
                  <span className="text-xs font-medium text-[#0E0E16]">financeiro@cliente.com</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Período
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Início:</span>
                    <span className="font-medium">{selectedContract?.start}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Término:</span>
                    <span className="font-medium">01/01/2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Renovação:</span>
                    <span className="font-medium text-[#3D4FE8]">{selectedContract?.renewal}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#8A8FA3] uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Pagamento
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Forma:</span>
                    <span className="font-medium">Boleto</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Vencimento:</span>
                    <span className="font-medium">Dia 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8FA3]">Auto-renovação:</span>
                    <span className="text-green-600 font-bold uppercase">Sim</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button className="w-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full">
              Baixar Contrato (PDF)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
