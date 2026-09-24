import { createFileRoute } from "@tanstack/react-router";
import {
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Wallet,
  Building2,
  Search,
  Check,
  ChevronsUpDown,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getFinanceDashboard,
  getReceivables,
  getRecurringClients,
  updateReceivableStatus,
  updateReceivableDueDate,
  updateReceivableAmount,
  deleteReceivable,
} from "@/lib/finances.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { toast } from "sonner";

function MiniKpiCard({ icon: Icon, label, value, subtitle, trend, delta, color }: { icon: any; label: string; value: string; subtitle?: string; trend?: number[]; delta?: number; color: string }) {
  const trendData = (trend && trend.length > 0 ? trend : [0]).map((v, i) => ({ i, v }));
  const deltaColor = delta === undefined ? "text-[var(--ink-3)]" : delta > 0 ? "text-[var(--success)]" : delta < 0 ? "text-[var(--danger)]" : "text-[var(--ink-3)]";
  const deltaLabel = delta === undefined ? null : `${delta > 0 ? "+" : ""}${delta}%`;
  return (
    <Card className="border-[var(--line-1)] shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("h-10 w-10 bg-[var(--surface-1)] border border-[var(--line-1)] rounded-2xl flex items-center justify-center shadow-sm shrink-0", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase font-bold text-[var(--ink-3)] tracking-widest">{label}</p>
          <h3 className="text-lg font-bold text-[var(--ink-1)] font-jakarta truncate">{value}</h3>
          {subtitle && <p className="text-[10px] text-[var(--ink-3)] truncate">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="w-14 h-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line type="monotone" dataKey="v" stroke="var(--violet-500)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {deltaLabel && <span className={cn("text-[10px] font-bold", deltaColor)}>{deltaLabel}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/financas/")({
  component: FinancesPage,
  head: () => ({
    meta: [
      { title: "Finanças | Ongo" },
      { name: "description", content: "Controle de recebíveis, MRR e fluxo de caixa dos clientes." },
      { property: "og:title", content: "Finanças | Ongo" },
      { property: "og:description", content: "Controle de recebíveis, MRR e fluxo de caixa dos clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FinancesPage() {
  const fetchDashboard = useServerFn(getFinanceDashboard);
  const fetchReceivables = useServerFn(getReceivables);
  const fetchRecurring = useServerFn(getRecurringClients);
  const markPaid = useServerFn(updateReceivableStatus);
  const saveDueDate = useServerFn(updateReceivableDueDate);
  const saveAmount = useServerFn(updateReceivableAmount);
  const removeReceivable = useServerFn(deleteReceivable);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [recurringSearch, setRecurringSearch] = useState("");
  const [recurringPaymentFilter, setRecurringPaymentFilter] = useState("all");
  const [editingDueDate, setEditingDueDate] = useState<any>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [editingAmount, setEditingAmount] = useState<any>(null);
  const [newAmount, setNewAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => fetchDashboard()
  });

  const { data: receivables, isLoading: loadingReceivables, refetch: refetchReceivables } = useQuery({
    queryKey: ['receivables', statusFilter, clientFilter],
    queryFn: () => fetchReceivables({
      data: {
        status: statusFilter === "all" ? null : [statusFilter],
        clientId: clientFilter === "all" ? null : clientFilter,
      },
    }),
  });

  const { data: recurringClients, isLoading: loadingRecurring } = useQuery({
    queryKey: ['recurring-clients'],
    queryFn: () => fetchRecurring(),
  });

  const clients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of (receivables as any[]) || []) {
      if (r.client?.id) map.set(r.client.id, { id: r.client.id, name: r.client.name });
    }
    return Array.from(map.values());
  }, [receivables]);

  const filteredReceivables = ((receivables as any[]) || []).filter((r) =>
    (r.client?.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredRecurringClients = ((recurringClients as any[]) || []).filter((c) => {
    const matchesSearch = (c.client_name || "").toLowerCase().includes(recurringSearch.toLowerCase());
    const matchesStatus = recurringPaymentFilter === "all" || c.payment_status === recurringPaymentFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const getStatusBadge = (status: string, dueDate: string | null) => {
    const today = new Date().toISOString().slice(0, 10);
    const effective = status !== "pago" && dueDate && dueDate < today ? "atrasado" : status;
    return (
      <Badge
        className={cn(
          "rounded-full border-0 px-3 py-1 text-xs font-semibold capitalize",
          effective === "pago"
            ? "bg-[var(--success)]/10 text-[var(--success)]"
            : effective === "atrasado"
              ? "bg-[var(--danger)]/10 text-[var(--danger)]"
              : "bg-[var(--warning)]/10 text-[var(--warning)]",
        )}
      >
        {effective}
      </Badge>
    );
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markPaid({ data: { id, status: "pago", paid_at: new Date().toISOString() } });
      toast.success("Recebível liquidado");
      refetchReceivables();
    } catch {
      toast.error("Erro ao liquidar recebível");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeReceivable({ data: id });
      toast.success("Recebível excluído");
      refetchReceivables();
    } catch {
      toast.error("Erro ao excluir recebível");
    }
  };

  const openDueDateModal = (r: any) => {
    setEditingDueDate(r);
    setNewDueDate(r.due_date || "");
  };

  const openAmountModal = (r: any) => {
    setEditingAmount(r);
    setNewAmount(r.amount != null ? String(r.amount) : "");
  };

  const handleSaveDueDate = async () => {
    if (!editingDueDate) return;
    setSavingEdit(true);
    try {
      await saveDueDate({ data: { id: editingDueDate.id, due_date: newDueDate } });
      toast.success("Vencimento atualizado");
      setEditingDueDate(null);
      refetchReceivables();
    } catch {
      toast.error("Erro ao atualizar vencimento");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveAmount = async () => {
    if (!editingAmount) return;
    const parsed = Number(newAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Informe um valor maior que zero");
      return;
    }
    setSavingEdit(true);
    try {
      await saveAmount({ data: { id: editingAmount.id, amount: parsed } });
      toast.success("Valor atualizado");
      setEditingAmount(null);
      refetchReceivables();
    } catch {
      toast.error("Erro ao atualizar valor");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Finanças</h1>
          <p className="text-sm text-[var(--ink-3)]">Controle de recebíveis e fluxo de caixa</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MiniKpiCard
          icon={DollarSign}
          label="Faturamento Mensal"
          value={loadingDashboard ? "..." : formatCurrency(dashboard?.kpis?.monthlyRevenue || 0)}
          subtitle="Recebido no mês atual"
          trend={dashboard?.kpiTrends?.monthlyRevenue}
          delta={dashboard?.kpiDeltas?.monthlyRevenue}
          color="text-[var(--violet-500)]"
        />
        <MiniKpiCard
          icon={Wallet}
          label="Faturamento Anual"
          value={loadingDashboard ? "..." : formatCurrency(dashboard?.kpis?.annualRevenue || 0)}
          subtitle="Acumulado no ano"
          trend={dashboard?.kpiTrends?.annualRevenue}
          delta={dashboard?.kpiDeltas?.annualRevenue}
          color="text-[var(--violet-500)]"
        />
        <MiniKpiCard
          icon={Building2}
          label="Ticket Médio"
          value={loadingDashboard ? "..." : formatCurrency(dashboard?.kpis?.ticketMedio || 0)}
          subtitle="Média por recebimento pago"
          trend={dashboard?.kpiTrends?.ticketMedio}
          delta={dashboard?.kpiDeltas?.ticketMedio}
          color="text-[var(--success)]"
        />
        <MiniKpiCard
          icon={ArrowDownRight}
          label="Custo Total"
          value={loadingDashboard ? "..." : formatCurrency(dashboard?.kpis?.totalCost || 0)}
          subtitle="Pago no mês atual"
          trend={dashboard?.kpiTrends?.totalCost}
          delta={dashboard?.kpiDeltas?.totalCost}
          color="text-[var(--danger)]"
        />
        <MiniKpiCard
          icon={ArrowUpRight}
          label="Margem de Lucro"
          value={loadingDashboard ? "..." : `${(dashboard?.kpis?.profitMargin || 0).toFixed(1)}%`}
          subtitle="(Receita - Custo) / Receita"
          trend={dashboard?.kpiTrends?.profitMargin}
          delta={dashboard?.kpiDeltas?.profitMargin}
          color="text-[var(--success)]"
        />
      </div>
      {/* Gráficos Linha 1: Faturamento Mensal + MRR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-title font-semibold text-[var(--ink-1)]">Faturamento Mensal</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Receita paga nos últimos 12 meses</p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.charts?.monthlyRevenue || []}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--violet-500)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--violet-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Area type="monotone" dataKey="total" stroke="var(--violet-500)" strokeWidth={2} fill="url(#colorFaturamento)" name="Faturamento" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-title font-semibold text-[var(--ink-1)]">MRR</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Receita recorrente mensal contratada</p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard?.charts?.mrr || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Line type="monotone" dataKey="total" stroke="var(--success)" strokeWidth={2} dot={false} name="MRR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Gráficos Linha 2: Distribuição + Faturamento vs Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-title font-semibold text-[var(--ink-1)]">Distribuição de Faturamento</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Recorrente vs avulso no ano atual</p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard?.charts?.revenueDistribution || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(dashboard?.charts?.revenueDistribution || []).map((entry: any, index: number) => (
                      <Cell
                        key={`dist-${index}`}
                        fill={entry.name === "Recorrente" ? "var(--violet-500)" : "var(--ink-3)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-title font-semibold text-[var(--ink-1)]">Faturamento vs Custos</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Receita e custo pagos nos últimos 6 meses</p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.charts?.revenueVsCosts || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="var(--violet-500)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Linha 3: Custos por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-title font-semibold text-[var(--ink-1)]">Custos por Categoria</CardTitle>
            <p className="text-xs text-[var(--ink-3)]">Custos pagos no ano atual por categoria</p>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard?.charts?.costsByCategory || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(dashboard?.charts?.costsByCategory || []).map((_: any, index: number) => (
                      <Cell
                        key={`cost-cat-${index}`}
                        fill={["var(--violet-500)", "var(--success)", "var(--warning)", "var(--danger)", "var(--ink-3)"][index % 5] ?? "var(--violet-500)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>



      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10 border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select defaultValue="all" onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] border-[var(--line-1)] rounded-full text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClientCombo}
                    className="w-[200px] justify-between border-[var(--line-1)] rounded-full text-xs font-normal"
                  >
                    {clientFilter === "all"
                      ? "Todos Clientes"
                      : clients?.find((c: any) => c.id === clientFilter)?.name}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 border-[var(--line-1)] rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setClientFilter("all");
                            setOpenClientCombo(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clientFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Todos Clientes
                        </CommandItem>
                        {clients?.map((c: any) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setClientFilter(c.id);
                              setOpenClientCombo(false);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientFilter === c.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingReceivables ? (
            <div className="p-12 text-center text-[var(--ink-3)]">Carregando dados financeiros...</div>
          ) : filteredReceivables && filteredReceivables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[var(--line-1)]">
                  <TableHead className="font-bold text-[var(--ink-1)] pl-6">Cliente</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Contrato</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Vencimento</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Parcela</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Valor</TableHead>
                  <TableHead className="font-bold text-[var(--ink-1)]">Status</TableHead>
                  <TableHead className="text-right font-bold text-[var(--ink-1)] pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.map((r: any) => (
                  <TableRow key={r.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--ink-1)] leading-none mb-1">
                            {r.client?.name}
                          </div>
                          <div className="text-[10px] text-[var(--ink-3)]">{r.payment_method || "--"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[var(--line-1)] text-[var(--ink-3)] font-normal capitalize">
                        {r.contract?.type === 'recurring' ? 'Recorrente' : 'Avulso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--ink-1)] font-medium">
                      {r.due_date ? format(new Date(r.due_date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : "--"}
                    </TableCell>
                    <TableCell className="text-[var(--ink-3)] text-xs">
                      {r.installment_number ? `${r.installment_number}ª` : "Única"}
                    </TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)]">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(r.status, r.due_date)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            className="h-8 bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full px-4 text-[10px] font-bold"
                            onClick={() => handleMarkAsPaid(r.id)}
                          >
                            Liquidar
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ink-3)]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-[var(--line-1)] rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Opções</DropdownMenuLabel>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onSelect={() => openDueDateModal(r)}
                            >
                              <Calendar className="h-4 w-4 text-[var(--ink-3)]" /> Alterar vencimento
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onSelect={() => openAmountModal(r)}
                            >
                              <DollarSign className="h-4 w-4 text-[var(--ink-3)]" /> Editar valor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)]"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
                <DollarSign className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Nenhum recebível</h3>
                <p className="text-sm text-[var(--ink-3)]">Os recebíveis aparecem aqui conforme os contratos são criados.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="font-title font-bold text-[var(--ink-1)]">Clientes Recorrentes</CardTitle>
              <p className="text-xs text-[var(--ink-3)] mt-1">Um registro por cliente com contrato recorrente ativo</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-3)]" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-10 border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full"
                  value={recurringSearch}
                  onChange={(e) => setRecurringSearch(e.target.value)}
                />
              </div>
              <Select value={recurringPaymentFilter} onValueChange={setRecurringPaymentFilter}>
                <SelectTrigger className="w-[160px] border-[var(--line-1)] rounded-full text-xs">
                  <SelectValue placeholder="Status Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em_dia">Em dia</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecurring ? (
            <div className="p-12 text-center text-sm text-[var(--ink-3)]">Carregando clientes...</div>
          ) : filteredRecurringClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--surface-2)]/50">
                  <TableHead className="pl-6">Cliente</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>Meses restantes</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead className="pr-6">Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecurringClients.map((c: any) => (
                  <TableRow key={c.client_id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50">
                    <TableCell className="pl-6 font-medium text-[var(--ink-1)]">{c.client_name}</TableCell>
                    <TableCell className="text-[var(--ink-3)] text-sm">
                      {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-[var(--ink-1)]">{c.monthly_value != null ? formatCurrency(c.monthly_value) : "—"}</TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)]">{formatCurrency(c.ltv)}</TableCell>
                    <TableCell className="text-[var(--ink-3)] text-sm">
                      {c.remaining_months != null ? `${c.remaining_months} de ${c.mrr_months}` : "—"}
                    </TableCell>
                    <TableCell className="text-[var(--ink-1)]">{c.health_score ?? "—"}</TableCell>
                    <TableCell className="pr-6">
                      <Badge
                        className={cn(
                          "rounded-full border-0 px-3 py-1 text-xs font-semibold",
                          c.payment_status === "atrasado"
                            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                            : "bg-[var(--success)]/10 text-[var(--success)]",
                        )}
                      >
                        {c.payment_status === "atrasado" ? "Atrasado" : "Em dia"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
                <DollarSign className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Nenhum cliente recorrente</h3>
                <p className="text-sm text-[var(--ink-3)]">Contratos recorrentes ativos aparecem aqui.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingDueDate} onOpenChange={(open) => { if (!open) setEditingDueDate(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Alterar vencimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-[var(--ink-3)]">
              {editingDueDate?.client?.name ? `${editingDueDate.client.name} • ` : ""}{editingDueDate?.installment_number ? `${editingDueDate.installment_number}ª parcela` : "Parcela única"}
            </p>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setEditingDueDate(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveDueDate} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAmount} onOpenChange={(open) => { if (!open) setEditingAmount(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Editar valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-[var(--ink-3)]">
              {editingAmount?.client?.name ? `${editingAmount.client.name} • ` : ""}{editingAmount?.installment_number ? `${editingAmount.installment_number}ª parcela` : "Parcela única"}
            </p>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setEditingAmount(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveAmount} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
