import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  Eye, 
  UserMinus,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { ClientRegistrationModal } from "@/components/ClientRegistrationModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/manage")({
  component: ClientsManagePage,
});

const mockClients = [
  { id: 1, name: "TechFlow Systems", segment: "SaaS", risk: "low", status: "active", health: 92 },
  { id: 2, name: "Global Logistics", segment: "Logística", risk: "medium", status: "active", health: 75 },
  { id: 3, name: "Urban Eats", segment: "Food & Bev", risk: "high", status: "active", health: 45 },
];

function ClientsManagePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Clientes</h1>
          <p className="text-sm text-[#8A8FA3]">Administre sua base de clientes ativos</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]">
            Ver todos
          </Button>
          <Button 
            className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full"
            onClick={() => setIsModalOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Cadastrar cliente
          </Button>
        </div>
      </div>

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="border-b border-[#E4E6F0] bg-[#F7F8FC]/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10 border-[#E4E6F0] focus-visible:ring-[#3D4FE8]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] border-[#E4E6F0]">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os riscos</SelectItem>
                  <SelectItem value="high">Alto Risco</SelectItem>
                  <SelectItem value="medium">Médio Risco</SelectItem>
                  <SelectItem value="low">Baixo Risco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="font-bold text-[#0E0E16]">Cliente</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Segmento</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Health Score</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Risco</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Status</TableHead>
                <TableHead className="text-right font-bold text-[#0E0E16]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClients.map((client) => (
                <TableRow key={client.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                  <TableCell className="font-medium text-[#0E0E16]">
                    <Link 
                      to="/clients/$clientId" 
                      params={{ clientId: client.id }}
                      className="hover:text-[#3D4FE8] transition-colors"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#8A8FA3]">{client.segment}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-[#E4E6F0] rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            client.health > 80 ? "bg-[#22C55E]" : client.health > 50 ? "bg-[#F5A524]" : "bg-[#EF4444]"
                          )}
                          style={{ width: `${client.health}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#0E0E16]">{client.health}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      client.risk === "low" ? "bg-green-100 text-green-600" : client.risk === "medium" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"
                    )}>
                      {client.risk === "low" ? "Baixo" : client.risk === "medium" ? "Médio" : "Alto"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-2 bg-[#22C55E] rounded-full flex items-center justify-center relative">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                      </div>
                      <span className="text-xs text-[#8A8FA3]">Ativo</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8]">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:text-red-500">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ClientRegistrationModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
