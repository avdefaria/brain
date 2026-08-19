import { createFileRoute } from "@tanstack/react-router";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  LayoutGrid,
  List,
  Plus,
  Eye,
  Layers
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DeliveryDetailPanel } from "@/components/DeliveryDetailPanel";

export const Route = createFileRoute("/_authenticated/projects/deliveries")({
  component: DeliveriesPage,
});

const mockDeliveries = [
  {
    id: "1",
    name: "TechFlow Systems",
    completed: 12,
    total: 15,
    squad: "Growth",
    risk: "low",
    contractEnd: "15 dias",
    planningStatus: "Em dia"
  },
  {
    id: "2",
    name: "Global Logistics",
    completed: 8,
    total: 20,
    squad: "Design",
    risk: "high",
    contractEnd: "45 dias",
    planningStatus: "Atrasado"
  },
  {
    id: "3",
    name: "Urban Eats",
    completed: 5,
    total: 5,
    squad: "Dev",
    risk: "medium",
    contractEnd: "120 dias",
    planningStatus: "Em dia"
  }
];

function DeliveriesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedClient, setSelectedClient] = useState<any>(null);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Entregas</h1>
          <p className="text-sm text-[#8A8FA3]">Monitore o progresso das entregas contratuais por cliente</p>
        </div>
        <div className="flex gap-3">
          <div className="flex border border-[#E4E6F0] rounded-full p-1 bg-white">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "grid" && "bg-[#F7F8FC] text-[#3D4FE8]")}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("rounded-full h-8 px-3", viewMode === "list" && "bg-[#F7F8FC] text-[#3D4FE8]")}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 gap-2">
            <Plus className="h-4 w-4" /> Novo Planejamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-[#E4E6F0] shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
          <Input placeholder="Buscar cliente..." className="pl-10 border-[#E4E6F0] rounded-full bg-[#F7F8FC]" />
        </div>
        <Input placeholder="Squad" className="border-[#E4E6F0] rounded-full bg-[#F7F8FC]" />
        <Input placeholder="Risco de Churn" className="border-[#E4E6F0] rounded-full bg-[#F7F8FC]" />
        <Button variant="outline" className="rounded-full border-[#E4E6F0] gap-2">
          <Filter className="h-4 w-4" /> Filtros Avançados
        </Button>
      </div>

      <div className={cn(
        "grid gap-6",
        viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {mockDeliveries.map((delivery) => (
          <Card key={delivery.id} className="border-[#E4E6F0] shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <h3 className="font-title font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">
                  {delivery.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] uppercase font-bold text-[#8A8FA3] border-[#E4E6F0] rounded-full">
                    {delivery.squad}
                  </Badge>
                  <Badge className={cn(
                    "text-[9px] uppercase font-bold border-none rounded-full",
                    delivery.risk === 'high' ? 'bg-red-100 text-red-600' : 
                    delivery.risk === 'medium' ? 'bg-amber-100 text-amber-600' : 
                    'bg-green-100 text-green-600'
                  )}>
                    Risco {delivery.risk}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3]">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-[#E4E6F0] rounded-xl">
                  <DropdownMenuItem className="gap-2 cursor-pointer font-bold text-xs py-2.5" onClick={() => setSelectedClient(delivery)}>
                    <Eye className="h-4 w-4 text-[#3D4FE8]" /> Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer font-bold text-xs py-2.5">
                    <Layers className="h-4 w-4 text-[#3D4FE8]" /> Entregáveis
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#8A8FA3]">Progresso das Entregas</span>
                  <span className="text-[#0E0E16]">{delivery.completed}/{delivery.total}</span>
                </div>
                <Progress value={(delivery.completed / delivery.total) * 100} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#F7F8FC]">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-[#8A8FA3] tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fim de Contrato
                  </p>
                  <p className="text-xs font-bold text-[#0E0E16]">{delivery.contractEnd}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold text-[#8A8FA3] tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Planejamento
                  </p>
                  <p className={cn(
                    "text-xs font-bold",
                    delivery.planningStatus === 'Atrasado' ? 'text-red-500' : 'text-green-500'
                  )}>{delivery.planningStatus}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeliveryDetailPanel 
        client={selectedClient}
        isOpen={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      />
    </div>
  );
}