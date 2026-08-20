import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDeliverablesProgress, getDeliveriesByAccount, getDeliverableTypes } from "@/lib/deliverables.functions";
import { getClientsOverviewData } from "@/lib/clients.functions";
import { useServerFn } from "@tanstack/react-start";
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  TrendingUp,
  Briefcase,
  Layers,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Shield,
  Activity
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/projects/deliverables")({
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const [view, setView] = useState<"account" | "type">("account");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [squadFilter, setSquadFilter] = useState("all");

  const fetchAccountDeliveries = useServerFn(getDeliveriesByAccount);
  const fetchTypeDeliveries = useServerFn(getDeliverablesProgress);
  const fetchTypes = useServerFn(getDeliverableTypes);

  const { data: accountData = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["deliveries-accounts"],
    queryFn: () => fetchAccountDeliveries(),
  });

  const { data: typeData = [], isLoading: loadingTypes } = useQuery({
    queryKey: ["deliveries-types", typeFilter, searchTerm], // Added searchTerm filter logic conceptually
    queryFn: () => fetchTypeDeliveries({ data: { typeId: typeFilter } }), 
  });

  const { data: deliverableTypes = [] } = useQuery({
    queryKey: ["deliverable-types"],
    queryFn: () => fetchTypes(),
  });

  const filteredAccounts = useMemo(() => {
    return accountData.filter(acc => {
      const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSquad = squadFilter === "all" || acc.squads.some((s: any) => s.id === squadFilter);
      return matchesSearch && matchesSquad;
    });
  }, [accountData, searchTerm, squadFilter]);

  const allSquads = useMemo(() => {
    const squads = new Map();
    accountData.forEach(acc => {
      acc.squads.forEach((s: any) => {
        squads.set(s.id, s);
      });
    });
    return Array.from(squads.values());
  }, [accountData]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-body">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Entregas</h1>
          <p className="text-sm text-[#8A8FA3]">Acompanhamento de progresso real por conta e tipo de trabalho</p>
        </div>

        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-auto">
          <TabsList className="bg-white border border-[#E4E6F0] h-10 p-1">
            <TabsTrigger 
              value="account" 
              className="data-[state=active]:bg-[#3D4FE8] data-[state=active]:text-white rounded-md text-xs font-bold"
            >
              <Briefcase className="h-3.5 w-3.5 mr-2" />
              Por Conta
            </TabsTrigger>
            <TabsTrigger 
              value="type" 
              className="data-[state=active]:bg-[#3D4FE8] data-[state=active]:text-white rounded-md text-xs font-bold"
            >
              <Layers className="h-3.5 w-3.5 mr-2" />
              Por Tipo
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-[#E4E6F0] shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
          <Input 
            placeholder="Buscar por conta ou cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E4E6F0] bg-[#F7F8FC] focus-visible:ring-[#3D4FE8]"
          />
        </div>

        <Select value={squadFilter} onValueChange={setSquadFilter}>
          <SelectTrigger className="w-[180px] border-[#E4E6F0] bg-[#F7F8FC]">
            <Shield className="h-4 w-4 mr-2 text-[#8A8FA3]" />
            <SelectValue placeholder="Squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Squads</SelectItem>
            {allSquads.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] border-[#E4E6F0] bg-[#F7F8FC]">
            <Package className="h-4 w-4 mr-2 text-[#8A8FA3]" />
            <SelectValue placeholder="Tipo de Trabalho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {deliverableTypes.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "account" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingAccounts ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-[#3D4FE8] animate-spin" />
            </div>
          ) : filteredAccounts.length > 0 ? (
            filteredAccounts.map((acc) => (
              <Card key={acc.id} className="border-[#E4E6F0] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[#3D4FE8]/10 rounded-2xl flex items-center justify-center text-[#3D4FE8]">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">{acc.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {acc.squads.map((s: any) => (
                            <span 
                              key={s.id} 
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: s.color || '#3D4FE8' }}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1",
                      acc.healthScore >= 80 ? "bg-green-100 text-green-600" : acc.healthScore >= 50 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                    )}>
                      <Activity className="h-3 w-3" />
                      {acc.healthScore}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-[#F7F8FC]">
                    <div>
                      <p className="text-[10px] font-bold text-[#8A8FA3] uppercase">Contrato</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="h-3 w-3 text-[#3D4FE8]" />
                        <span className="text-xs font-medium text-[#0E0E16]">
                          {acc.contract?.renewal_date 
                            ? format(new Date(acc.contract.renewal_date), "dd/MM/yy")
                            : "N/A"
                          }
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#8A8FA3] uppercase">Status</p>
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1",
                        acc.status === 'active' ? "bg-green-100 text-green-600" : "bg-[#F7F8FC] text-[#8A8FA3]"
                      )}>
                        {acc.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Progresso Geral</p>
                      <span className="text-xs font-bold text-[#0E0E16]">{Math.round(acc.progress)}%</span>
                    </div>
                    <Progress value={acc.progress} className="h-2 bg-[#F7F8FC]" />
                    <div className="flex justify-between text-[10px] font-medium text-[#8A8FA3]">
                      <span>{acc.completedTasks} concluídas</span>
                      <span>{acc.totalTasks} totais</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-[#E4E6F0]">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F7F8FC] mb-4">
                <Search className="h-6 w-6 text-[#8A8FA3]" />
              </div>
              <p className="text-[#8A8FA3] font-medium">Nenhuma conta encontrada com esses filtros</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingTypes ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-[#3D4FE8] animate-spin" />
            </div>
          ) : (
            typeData.map((item: any) => (
              <Card key={item.id} className="border-[#E4E6F0] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 bg-[#3D4FE8]/10 rounded-2xl flex items-center justify-center text-[#3D4FE8]">
                      <Package className="h-5 w-5" />
                    </div>
                    {item.total > 0 && (
                      <div className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1",
                        item.progress === 100 ? "bg-green-100 text-green-600" : "bg-[#3D4FE8]/10 text-[#3D4FE8]"
                      )}>
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(item.progress)}%
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">{item.name}</h3>
                    <p className="text-xs text-[#8A8FA3]">
                      {item.total > 0 
                        ? `${item.completed} de ${item.total} concluídas`
                        : "Nenhuma tarefa vinculada ainda"
                      }
                    </p>
                  </div>

                  {item.total > 0 ? (
                    <div className="space-y-2 pt-2">
                      <Progress value={item.progress} className="h-2 bg-[#F7F8FC]" />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#8A8FA3]">
                        <span>Progresso</span>
                        <span>{item.completed} / {item.total}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center gap-2 text-[#8A8FA3]">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Aguardando tarefas</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
