import { createFileRoute } from "@tanstack/react-router";
import { FileText, RotateCw, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
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
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Contratos</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (<Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 bg-[#3D4FE8]/10 rounded-full flex items-center justify-center text-[#3D4FE8]">
                <kpi.icon className="h-5 w-5"/>
              </div>
              <div>
                <p className="text-xs font-medium text-[#8A8FA3]">{kpi.label}</p>
                <h3 className="text-xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>))}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContracts.map((contract) => (<TableRow key={contract.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                  <TableCell className="font-medium text-[#3D4FE8]">{contract.id}</TableCell>
                  <TableCell className="text-[#0E0E16]">{contract.client}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.type}</TableCell>
                  <TableCell className="font-bold text-[#0E0E16] font-jakarta">{contract.value}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.start}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{contract.renewal}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${contract.status === 'Ativo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {contract.status}
                    </span>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);
}
