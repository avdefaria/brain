import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  Eye, 
  UserMinus,
  AlertCircle,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  FileText,
  Calendar,
  MessageSquare,
  Trash2,
  ExternalLink,
  Smartphone,
  Briefcase,
  ArrowUpDown
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientRegistrationModal } from "@/components/ClientRegistrationModal";
import { ChurnReasonModal } from "@/components/ChurnReasonModal";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { updateClientStatus } from "@/lib/clients.functions";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/manage")({
  component: ClientsManagePage,
});

function ClientsManagePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [churnModalOpen, setChurnModalOpen] = useState(false);
  const [pendingChurnClient, setPendingChurnClient] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: "revenue" | "ltDays" | "ltv" | "openTasks"; direction: "asc" | "desc" } | null>(null);

  const fetchClients = useServerFn(getClientsWithChannels);
  const updateStatusFn = useServerFn(updateClientStatus);

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const data = await fetchClients();
      return data;
    }
  });


  const getActiveRecurringContract = (client: any) => {
    const contracts = Array.isArray(client.contracts) ? client.contracts : [];
    return contracts
      .filter((contract: any) => contract.type === "recurring" && contract.status === "active")
      .sort((a: any, b: any) => new Date(b.start_date || b.created_at || 0).getTime() - new Date(a.start_date || a.created_at || 0).getTime())[0];
  };

  const getClientMetrics = (client: any) => {
    const activeRecurringContract = getActiveRecurringContract(client);
    const revenue = activeRecurringContract?.monthly_value != null ? Number(activeRecurringContract.monthly_value) : null;
    const todayInSaoPauloParts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const todayInSaoPauloValues = Object.fromEntries(todayInSaoPauloParts.map((part) => [part.type, part.value]));
    const todayInSaoPaulo = new Date(`${todayInSaoPauloValues['year']}-${todayInSaoPauloValues['month']}-${todayInSaoPauloValues['day']}T00:00:00`);
    const ltDays = activeRecurringContract?.start_date
      ? Math.max(0, Math.floor((todayInSaoPaulo.getTime() - new Date(`${activeRecurringContract.start_date}T00:00:00`).getTime()) / 86400000))
      : null;
    const ltv = (Array.isArray(client.receivables) ? client.receivables : [])
      .filter((receivable: any) => receivable.status === "pago")
      .reduce((sum: number, receivable: any) => sum + Number(receivable.amount || 0), 0);
    const openTasks = (Array.isArray(client.accounts) ? client.accounts : []).reduce((sum: number, account: any) => {
      const tasks = Array.isArray(account.tasks) ? account.tasks : [];
      return sum + tasks.filter((task: any) => task.stage !== "done").length;
    }, 0);

    return { revenue, ltDays, ltv, openTasks };
  };

  const formatCurrency = (value: number | null) => value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleSort = (key: "revenue" | "ltDays" | "ltv" | "openTasks") => {
    setSortConfig((current) => current?.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  };

  const filteredClients = (clients as any[])?.filter((client: any) => {
    const matchesSearch = (client.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.corporate_email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "all" || client.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const sortedClients = [...(filteredClients || [])].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const aValue = getClientMetrics(a)[sortConfig.key];
    const bValue = getClientMetrics(b)[sortConfig.key];
    const normalizedA = aValue == null ? Number.NEGATIVE_INFINITY : aValue;
    const normalizedB = bValue == null ? Number.NEGATIVE_INFINITY : bValue;
    return sortConfig.direction === "asc" ? normalizedA - normalizedB : normalizedB - normalizedA;
  });

  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      const client = (clients as any[])?.find(c => c.id === clientId);
      setPendingChurnClient(client);
      setChurnModalOpen(true);
      return;
    }

    try {
      setIsUpdating(clientId);
      await updateStatusFn({ data: { id: clientId, status: 'active' } });
      toast.success("Cliente reativado com sucesso");
      refetch();
    } catch (error) {
      console.error("Erro ao reativar cliente:", error);
      toast.error("Erro ao reativar cliente");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleConfirmChurn = async (reasonId: string) => {
    if (!pendingChurnClient) return;
    
    try {
      setIsUpdating(pendingChurnClient.id);
      await updateStatusFn({ 
        data: { 
          id: pendingChurnClient.id, 
          status: 'inactive',
          churnReasonId: reasonId 
        } 
      });
      toast.success("Cliente desativado com sucesso");
      setChurnModalOpen(false);
      setPendingChurnClient(null);
      refetch();
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
      toast.error("Erro ao desativar cliente");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditClient = (client: any) => {
    // Flatten account_squads from all accounts for the modal
    const account_squads = client.accounts?.flatMap((acc: any) => acc.account_squads || []) || [];
    setSelectedClient({ ...client, account_squads });
    setIsModalOpen(true);
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const renderSortableMetricHead = (label: string, sortKey: "revenue" | "ltDays" | "ltv" | "openTasks") => (
    <TableHead className="font-bold text-[#0E0E16]">
      <Button variant="ghost" className="h-auto p-0 font-bold text-[#0E0E16] hover:bg-transparent" onClick={() => handleSort(sortKey)}>
        {label}
        <ArrowUpDown className={cn("ml-1 h-3 w-3", sortConfig?.key === sortKey ? "opacity-100" : "opacity-40")} />
      </Button>
    </TableHead>
  );

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
            onClick={handleCreateClient}
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
              <Select defaultValue="all" onValueChange={setRiskFilter}>
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
          {isLoading ? (
            <div className="p-12 text-center text-[#8A8FA3]">Carregando clientes...</div>
          ) : sortedClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                  <TableHead className="font-bold text-[#0E0E16]">Cliente</TableHead>
                  {renderSortableMetricHead("Receita", "revenue")}
                  {renderSortableMetricHead("LT (dias)", "ltDays")}
                  {renderSortableMetricHead("LTV", "ltv")}
                  {renderSortableMetricHead("Tarefas", "openTasks")}
                  <TableHead className="font-bold text-[#0E0E16]">Nicho</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Canais</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Health Score</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Risco</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Status</TableHead>
                  <TableHead className="text-right font-bold text-[#0E0E16]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client: any) => {
                  const metrics = getClientMetrics(client);

                  return (
                  <TableRow key={client.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                    <TableCell className="font-medium text-[#0E0E16]">
                      <Link 
                        to="/clients/$clientId" 
                        params={{ clientId: String(client.id) }}
                        className="hover:text-[#3D4FE8] transition-colors"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[#0E0E16] font-medium">{formatCurrency(metrics.revenue)}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{metrics.ltDays ?? "—"}</TableCell>
                    <TableCell className="text-[#0E0E16] font-medium">{formatCurrency(metrics.ltv)}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{metrics.openTasks}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{(client as any).niches?.name || (client as any).niche_name || "--"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {client.client_sales_channels && client.client_sales_channels.length > 0 ? (
                          client.client_sales_channels.map((csc: any) => (
                            <Badge key={csc.sales_channels.name} variant="secondary" className="bg-[#3D4FE8]/10 text-[#3D4FE8] border-none text-[9px] px-2 py-0 rounded-full">
                              {csc.sales_channels.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[#8A8FA3]">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-[#E4E6F0] rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              (client.health_score || 0) > 80 ? "bg-[#22C55E]" : (client.health_score || 0) > 50 ? "bg-[#F5A524]" : "bg-[#EF4444]"
                            )}
                            style={{ width: `${client.health_score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#0E0E16]">{client.health_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        client.risk_level === "low" ? "bg-green-100 text-green-600" : client.risk_level === "medium" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"
                      )}>
                        {client.risk_level === "low" ? "Baixo" : client.risk_level === "medium" ? "Médio" : "Alto"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={client.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(client.id, client.status)}
                          disabled={isUpdating === client.id}
                          className={cn(
                            "data-[state=checked]:bg-[#22C55E] data-[state=unchecked]:bg-[#EF4444]",
                            isUpdating === client.id && "opacity-50 cursor-not-allowed"
                          )}
                        />
                        <span className="text-xs text-[#8A8FA3] min-w-[45px]">
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3] hover:text-[#3D4FE8]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 border-[#E4E6F0] dark:border-[#2A2A36] rounded-xl shadow-lg">
                          <DropdownMenuLabel className="text-xs font-bold text-[#8A8FA3] uppercase px-3 py-2">Comunicação</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`https://wa.me/${(client.contact_whatsapp || '').replace(/\D/g, '')}`, '_blank')}>
                            <Smartphone className="h-4 w-4 text-green-500" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.location.href = `mailto:${client.corporate_email || ''}`}>
                            <Mail className="h-4 w-4 text-blue-500" /> Enviar email
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-[#E4E6F0] dark:bg-[#2A2A36]" />
                          
                          <DropdownMenuLabel className="text-xs font-bold text-[#8A8FA3] uppercase px-3 py-2">Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="cursor-pointer gap-2">
                            <Link to="/clients/$clientId" params={{ clientId: String(client.id) }}>
                              <Eye className="h-4 w-4 text-[#8A8FA3]" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <ShieldCheck className="h-4 w-4 text-[#8A8FA3]" /> Pesquisa health score
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleEditClient(client)}>
                            <Settings className="h-4 w-4 text-[#8A8FA3]" /> Editar cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <FileText className="h-4 w-4 text-[#8A8FA3]" /> Configurar entregáveis
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <Briefcase className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhum cliente encontrado</h3>
                <p className="text-sm text-[#8A8FA3]">Comece cadastrando seu primeiro cliente no sistema.</p>
              </div>
              <Button 
                className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full"
                onClick={handleCreateClient}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <ClientRegistrationModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        initialData={selectedClient}
        onSuccess={() => refetch()}
      />
      <ChurnReasonModal
        open={churnModalOpen}
        onOpenChange={setChurnModalOpen}
        onConfirm={handleConfirmChurn}
        isLoading={isUpdating === pendingChurnClient?.id}
      />
    </div>
  );
}
