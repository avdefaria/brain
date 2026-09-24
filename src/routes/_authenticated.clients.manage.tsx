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
import { ClientOffboardingModal } from "@/components/ClientOffboardingModal";
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
import { getClientsWithChannels, getClientStatusCounts } from "@/lib/sales-channels.functions";
import { updateClientStatus } from "@/lib/clients.functions";
import { ONBOARDING_TOTAL_ITEMS } from "@/lib/onboarding-checklist";
import { OFFBOARDING_TOTAL_ITEMS } from "@/lib/offboarding-checklist";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  ativo: "Ativo",
  em_aviso: "Em aviso",
  pausado: "Pausado",
  inativo: "Inativo",
};
const STATUS_ORDER = ["ativo", "onboarding", "em_aviso", "pausado", "inativo"] as const;
const STATUS_COLORS: Record<string, string> = {
  onboarding: "text-[var(--info)]",
  ativo: "text-[var(--success)]",
  em_aviso: "text-[var(--warning)]",
  pausado: "text-[var(--ink-3)]",
  inativo: "text-[var(--danger)]",
};

export const Route = createFileRoute("/_authenticated/clients/manage")({
  component: ClientsManagePage,
});

function ClientsManagePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [churnModalOpen, setChurnModalOpen] = useState(false);
  const [pendingChurnClient, setPendingChurnClient] = useState<any>(null);
  const [offboardingClient, setOffboardingClient] = useState<{ clientId: string; clientName: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: "revenue" | "ltDays" | "ltv" | "openTasks"; direction: "asc" | "desc" } | null>(null);

  const fetchClients = useServerFn(getClientsWithChannels);
  const fetchStatusCounts = useServerFn(getClientStatusCounts);
  const updateStatusFn = useServerFn(updateClientStatus);

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const data = await fetchClients();
      return data;
    }
  });

  const { data: statusCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['clients-status-counts'],
    queryFn: () => fetchStatusCounts(),
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
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const sortedClients = [...(filteredClients || [])].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const aValue = getClientMetrics(a)[sortConfig.key];
    const bValue = getClientMetrics(b)[sortConfig.key];
    const normalizedA = aValue == null ? Number.NEGATIVE_INFINITY : aValue;
    const normalizedB = bValue == null ? Number.NEGATIVE_INFINITY : bValue;
    return sortConfig.direction === "asc" ? normalizedA - normalizedB : normalizedB - normalizedA;
  });

  const handleChangeStatus = async (clientId: string, newStatus: string) => {
    if (newStatus === 'inativo') {
      const client = (clients as any[])?.find(c => c.id === clientId);
      setPendingChurnClient(client);
      setChurnModalOpen(true);
      return;
    }

    try {
      setIsUpdating(clientId);
      await updateStatusFn({ data: { id: clientId, status: newStatus as any } });
      toast.success("Status do cliente atualizado");
      refetch();
      refetchCounts();
      if (newStatus === 'em_aviso') {
        const client = (clients as any[])?.find(c => c.id === clientId);
        setOffboardingClient({ clientId, clientName: client?.name || "" });
      }
    } catch (error) {
      console.error("Erro ao atualizar status do cliente:", error);
      toast.error("Erro ao atualizar status do cliente");
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
          status: 'inativo',
          churnReasonId: reasonId
        }
      });
      toast.success("Cliente marcado como inativo");
      setChurnModalOpen(false);
      setPendingChurnClient(null);
      refetch();
      refetchCounts();
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
    <TableHead className="font-bold text-[var(--ink-1)]">
      <Button variant="ghost" className="h-auto p-0 font-bold text-[var(--ink-1)] hover:bg-transparent" onClick={() => handleSort(sortKey)}>
        {label}
        <ArrowUpDown className={cn("ml-1 h-3 w-3", sortConfig?.key === sortKey ? "opacity-100" : "opacity-40")} />
      </Button>
    </TableHead>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Gestão de Clientes</h1>
          <p className="text-sm text-[var(--ink-3)]">Administre sua base de clientes ativos</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]">
            Ver todos
          </Button>
          <Button 
            className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full"
            onClick={handleCreateClient}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Cadastrar cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
            statusFilter === "all" ? "bg-[var(--violet-500)] text-white border-[var(--violet-500)]" : "border-[var(--line-1)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          )}
        >
          Todos
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular", statusFilter === "all" ? "bg-white/20" : "bg-[var(--surface-2)]")}>{statusCounts?.total ?? "…"}</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
              statusFilter === s ? "bg-[var(--violet-500)] text-white border-[var(--violet-500)]" : "border-[var(--line-1)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            )}
          >
            {STATUS_LABELS[s]}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular", statusFilter === s ? "bg-white/20" : "bg-[var(--surface-2)]")}>{statusCounts?.counts?.[s] ?? "…"}</span>
          </button>
        ))}
      </div>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10 border-[var(--line-1)] focus-visible:ring-[var(--violet-500)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="all" onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px] border-[var(--line-1)]">
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
            <div className="p-12 text-center text-[var(--ink-3)]">Carregando clientes...</div>
          ) : sortedClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[var(--line-1)]">
                  <TableHead className="font-bold text-[var(--ink-1)]">Cliente</TableHead>
                  {renderSortableMetricHead("Receita", "revenue")}
                  {renderSortableMetricHead("LT (dias)", "ltDays")}
                  {renderSortableMetricHead("LTV", "ltv")}
                  {renderSortableMetricHead("Tarefas", "openTasks")}
                  <TableHead className="font-bold text-[var(--ink-1)]">Nicho</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Canais</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Health Score</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Chamados</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Risco</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Status</TableHead>
                  <TableHead className="text-right font-bold text-[var(--ink-1)]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client: any) => {
                  const metrics = getClientMetrics(client);

                  return (
                  <TableRow key={client.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50">
                    <TableCell className="font-medium text-[var(--ink-1)]">
                      <Link 
                        to="/clients/$clientId" 
                        params={{ clientId: String(client.id) }}
                        className="hover:text-[var(--violet-500)] transition-colors"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--ink-1)] font-medium">{formatCurrency(metrics.revenue)}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{metrics.ltDays ?? "—"}</TableCell>
                    <TableCell className="text-[var(--ink-1)] font-medium">{formatCurrency(metrics.ltv)}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{metrics.openTasks}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{(client as any).niches?.name || (client as any).niche_name || "--"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {client.client_sales_channels && client.client_sales_channels.length > 0 ? (
                          client.client_sales_channels.map((csc: any) => (
                            <Badge key={csc.sales_channels.name} variant="secondary" className="bg-[var(--violet-500)]/10 text-[var(--violet-500)] border-none text-[9px] px-2 py-0 rounded-full">
                              {csc.sales_channels.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[var(--ink-3)]">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-[var(--line-1)] rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              (client.health_score || 0) > 80 ? "bg-[var(--success)]" : (client.health_score || 0) > 50 ? "bg-[var(--warning)]" : "bg-[var(--danger)]"
                            )}
                            style={{ width: `${client.health_score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[var(--ink-1)]">{client.health_score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--ink-2)] font-medium text-center">{(client.client_calls || []).length}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        client.risk_level === "low" ? "bg-[var(--success-tint)] text-[var(--success)]" : client.risk_level === "medium" ? "bg-[var(--warning-tint)] text-[var(--warning)]" : "bg-[var(--danger-tint)] text-[var(--danger)]"
                      )}>
                        {client.risk_level === "low" ? "Baixo" : client.risk_level === "medium" ? "Médio" : "Alto"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={client.status}
                        onValueChange={(v) => handleChangeStatus(client.id, v)}
                        disabled={isUpdating === client.id}
                      >
                        <SelectTrigger className={cn("w-[130px] h-8 text-xs border-[var(--line-1)] font-bold", STATUS_COLORS[client.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s} className={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {client.status === "onboarding" && (
                        <p className="text-[10px] text-[var(--ink-3)] mt-1 pl-1">
                          Checklist: {(client.client_onboarding_items || []).length}/{ONBOARDING_TOTAL_ITEMS}
                        </p>
                      )}
                      {client.status === "em_aviso" && (
                        <button
                          type="button"
                          className="text-[10px] text-[var(--ink-3)] mt-1 pl-1 hover:text-[var(--violet-500)] hover:underline"
                          onClick={() => setOffboardingClient({ clientId: client.id, clientName: client.name })}
                        >
                          Offboarding: {(client.client_offboarding_items || []).length}/{OFFBOARDING_TOTAL_ITEMS}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ink-3)] hover:text-[var(--violet-500)]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 border-[var(--line-1)] rounded-xl shadow-lg">
                          <DropdownMenuLabel className="text-xs font-bold text-[var(--ink-3)] uppercase px-3 py-2">Comunicação</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open(`https://wa.me/${(client.contact_whatsapp || '').replace(/\D/g, '')}`, '_blank')}>
                            <Smartphone className="h-4 w-4 text-[var(--success)]" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.location.href = `mailto:${client.corporate_email || ''}`}>
                            <Mail className="h-4 w-4 text-[var(--info)]" /> Enviar email
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-[var(--line-1)]" />
                          
                          <DropdownMenuLabel className="text-xs font-bold text-[var(--ink-3)] uppercase px-3 py-2">Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="cursor-pointer gap-2">
                            <Link to="/clients/$clientId" params={{ clientId: String(client.id) }}>
                              <Eye className="h-4 w-4 text-[var(--ink-3)]" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer gap-2">
                            <Link to="/clients/$clientId" params={{ clientId: String(client.id) }}>
                              <ShieldCheck className="h-4 w-4 text-[var(--ink-3)]" /> Pesquisa health score
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleEditClient(client)}>
                            <Settings className="h-4 w-4 text-[var(--ink-3)]" /> Editar cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <FileText className="h-4 w-4 text-[var(--ink-3)]" /> Configurar entregáveis
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
              <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
                <Briefcase className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Nenhum cliente encontrado</h3>
                <p className="text-sm text-[var(--ink-3)]">Comece cadastrando seu primeiro cliente no sistema.</p>
              </div>
              <Button 
                className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full"
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
      {offboardingClient && (
        <ClientOffboardingModal
          clientId={offboardingClient.clientId}
          clientName={offboardingClient.clientName}
          open={Boolean(offboardingClient)}
          onOpenChange={(open) => { if (!open) setOffboardingClient(null); }}
        />
      )}
    </div>
  );
}
