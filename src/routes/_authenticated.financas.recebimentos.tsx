import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Search, Calendar, CheckCircle2, Clock, AlertCircle, MoreVertical, ArrowUpRight, ArrowDownRight, Download, Wallet, Building2, Trash2, Check, ChevronsUpDown, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceSummary, getReceivables, getReceivablesSummaryTrends, getRecurringClients, updateReceivableStatus, deleteReceivable, updateReceivableDueDate, updateReceivableAmount, getRevenueCategories, createRevenueCategory, createOneOffReceivable } from "@/lib/finances.functions";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const PAGE_SIZE = 50;

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

export const Route = createFileRoute("/_authenticated/financas/recebimentos")({
  component: RecebimentosPage,
});

function RecebimentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [periodPreset, setPeriodPreset] = useState<"hoje" | "semana" | "mes" | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);
  const granularity: "day" | "week" | "month" = periodPreset === "hoje" ? "day" : periodPreset === "semana" ? "week" : "month";
  const applyPreset = (preset: "hoje" | "semana" | "mes") => {
    setPeriodPreset(preset);
    setPage(1);
    const now = new Date();
    if (preset === "hoje") setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (preset === "semana") setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };
  const clearPeriod = () => { setPeriodPreset(null); setDateRange({ from: undefined, to: undefined }); setPage(1); };
  const periodParams = useMemo(() => ({
    startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null,
    endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null,
  }), [dateRange]);
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<any | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [editingAmount, setEditingAmount] = useState<any | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [liquidatingReceivable, setLiquidatingReceivable] = useState<any | null>(null);
  const [receivableToDelete, setReceivableToDelete] = useState<string | null>(null);
  const [liquidateDate, setLiquidateDate] = useState("");
  const [savingLiquidate, setSavingLiquidate] = useState(false);
  const [recurringSearch, setRecurringSearch] = useState("");
  const [recurringPaymentFilter, setRecurringPaymentFilter] = useState("all");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustContractId, setAdjustContractId] = useState("");
  const [adjustContracts, setAdjustContracts] = useState<any[]>([]);
  const [loadingAdjustContracts, setLoadingAdjustContracts] = useState(false);
  const [newMonthlyValue, setNewMonthlyValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0] as string);
  const [adjustNotes, setAdjustNotes] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [oneOffClientMode, setOneOffClientMode] = useState<"registered" | "simple">("registered");
  const [oneOffClientId, setOneOffClientId] = useState("");
  const [oneOffClientName, setOneOffClientName] = useState("");
  const [oneOffDescription, setOneOffDescription] = useState("");
  const [oneOffCategoryId, setOneOffCategoryId] = useState("");
  const [oneOffTotal, setOneOffTotal] = useState("");
  const [oneOffParcelled, setOneOffParcelled] = useState(false);
  const [oneOffInstallments, setOneOffInstallments] = useState("2");
  const [oneOffDueDate, setOneOffDueDate] = useState(() => new Date().toISOString().split("T")[0] as string);
  const [oneOffPaymentMethod, setOneOffPaymentMethod] = useState("");
  const [oneOffNotes, setOneOffNotes] = useState("");
  const [oneOffCatOpen, setOneOffCatOpen] = useState(false);
  const [oneOffCatSearch, setOneOffCatSearch] = useState("");
  const [savingOneOff, setSavingOneOff] = useState(false);

  const fetchSummary = useServerFn(getFinanceSummary);
  const fetchSummaryTrends = useServerFn(getReceivablesSummaryTrends);
  const fetchReceivables = useServerFn(getReceivables);
  const fetchClients = useServerFn(getClientsWithChannels);
  const fetchRecurringClients = useServerFn(getRecurringClients);
  const updateStatusFn = useServerFn(updateReceivableStatus);
  const deleteReceivableFn = useServerFn(deleteReceivable);
  const updateDueDateFn = useServerFn(updateReceivableDueDate);
  const updateAmountFn = useServerFn(updateReceivableAmount);
  const fetchRevenueCategories = useServerFn(getRevenueCategories);
  const createRevenueCategoryFn = useServerFn(createRevenueCategory);
  const createOneOffFn = useServerFn(createOneOffReceivable);

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['finance-summary', periodParams],
    queryFn: () => fetchSummary({ data: periodParams })
  });

  const { data: summaryTrends } = useQuery({
    queryKey: ['finance-summary-trends', granularity],
    queryFn: () => fetchSummaryTrends({ data: { granularity } })
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-simple'],
    queryFn: () => fetchClients()
  });

  const { data: receivables, isLoading: loadingReceivables, refetch: refetchReceivables } = useQuery({
    queryKey: ['receivables-list', statusFilter, clientFilter, periodParams],
    queryFn: () => fetchReceivables({
      data: {
        ...periodParams,
        status: statusFilter === "all" ? null : [statusFilter],
        clientId: clientFilter === "all" ? null : clientFilter
      }
    })
  });

  const { data: revenueCategories, refetch: refetchRevenueCategories } = useQuery({
    queryKey: ['revenue-categories'],
    queryFn: () => fetchRevenueCategories()
  });

  const filteredReceivables = receivables?.filter((r: any) => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      return true;
    } else {
      const name = (r.client?.name || r.client_name || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      return name.includes(term) || desc.includes(term);
    }
  });
  const totalPages = Math.max(1, Math.ceil((filteredReceivables?.length || 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedReceivables = (filteredReceivables || []).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter, clientFilter, periodParams]);

  const { data: recurringClients, isLoading: loadingRecurring, refetch: refetchRecurring } = useQuery({
    queryKey: ['recurring-clients'],
    queryFn: () => fetchRecurringClients()
  });

  const filteredRecurringClients = ((recurringClients as any[]) || []).filter((c: any) =>
    (c.client_name || "").toLowerCase().includes(recurringSearch.toLowerCase()) &&
    (recurringPaymentFilter === "all" || c.payment_status === recurringPaymentFilter)
  );

  const openLiquidateModal = (r: any) => {
    setLiquidatingReceivable(r);
    setLiquidateDate(new Date().toISOString().split("T")[0] as string);
  };

  const handleConfirmLiquidate = async () => {
    setSavingLiquidate(true);
    try {
      if (liquidatingReceivable && liquidateDate) {
        await updateStatusFn({ data: { id: liquidatingReceivable.id, status: 'pago', paid_at: new Date(liquidateDate + "T12:00:00").toISOString() } });
        toast.success("Pagamento baixado com sucesso!");
        refetchReceivables();
        refetchSummary();
        refetchRecurring();
        setLiquidatingReceivable(null);
      } else {
        toast.error("Selecione a data de pagamento");
      }
    } catch (error) {
      toast.error("Erro ao baixar pagamento");
    } finally {
      setSavingLiquidate(false);
    }
  };

  const confirmDeleteReceivable = async () => {
    if (!receivableToDelete) return;
    try {
      await deleteReceivableFn({ data: receivableToDelete });
      toast.success("Recebível excluído");
      refetchReceivables();
      refetchSummary();
      refetchRecurring();
    } catch (error) {
      toast.error("Erro ao excluir");
    } finally {
      setReceivableToDelete(null);
    }
  };

  const openDueDateModal = (r: any) => {
    setEditingDueDate(r);
    setNewDueDate(r.due_date ? String(r.due_date).slice(0, 10) : "");
  };

  const openAmountModal = (r: any) => {
    setEditingAmount(r);
    setNewAmount(r.amount != null ? String(r.amount) : "");
  };

  const handleSaveDueDate = async () => {
    if (!editingDueDate || !newDueDate) {
      toast.error("Informe a nova data de vencimento");
    } else {
      setSavingEdit(true);
      try {
        await updateDueDateFn({ data: { id: editingDueDate.id, due_date: newDueDate } });
        toast.success("Vencimento atualizado!");
        setEditingDueDate(null);
        refetchReceivables();
        refetchSummary();
      } catch (error) {
        toast.error("Erro ao atualizar vencimento");
      } finally {
        setSavingEdit(false);
      }
    }
  };

  const handleSaveAmount = async () => {
    const parsed = Number(String(newAmount).replace(",", "."));
    if (!editingAmount || !newAmount || Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Informe um valor válido maior que zero");
    } else {
      setSavingEdit(true);
      try {
        await updateAmountFn({ data: { id: editingAmount.id, amount: parsed } });
        toast.success("Valor atualizado!");
        setEditingAmount(null);
        refetchReceivables();
        refetchSummary();
      } catch (error) {
        toast.error("Erro ao atualizar valor");
      } finally {
        setSavingEdit(false);
      }
    }
  };

  const selectedAdjustContract = (adjustContracts as any[]).find((c: any) => c.id === adjustContractId) || null;

  const openAdjustModal = () => {
    setAdjustContractId("");
    setNewMonthlyValue("");
    setAdjustNotes("");
    setEffectiveDate(new Date().toISOString().split("T")[0] as string);
    setAdjustOpen(true);
    setLoadingAdjustContracts(true);
    supabase
      .from('contracts')
      .select('id, client_id, monthly_value, type, status, client:client_id(id, name)')
      .eq('type', 'recurring')
      .eq('status', 'active')
      .then(({ data, error }: any) => {
        if (error) {
          toast.error("Erro ao carregar clientes recorrentes");
        } else {
          setAdjustContracts((data as any[]) || []);
        }
        setLoadingAdjustContracts(false);
      });
  };

  const handleSaveAdjust = async () => {
    const parsed = Number(String(newMonthlyValue).replace(",", "."));
    const selected = (adjustContracts as any[]).find((c: any) => c.id === adjustContractId) || null;
    if (!adjustContractId || !selected || !newMonthlyValue || Number.isNaN(parsed) || parsed <= 0 || !effectiveDate) {
      toast.error("Preencha cliente, novo valor e data efetiva");
    } else {
      setSavingAdjust(true);
      try {
        const oldValue = Number(selected.monthly_value) || 0;
        const { error: contractErr } = await supabase
          .from('contracts')
          .update({ monthly_value: parsed } as any)
          .eq('id', selected.id);
        if (contractErr) {
          throw contractErr;
        } else {
          const { data: pendingRecs, error: fetchErr } = await supabase
            .from('receivables')
            .select('id, amount, notes')
            .eq('contract_id', selected.id)
            .eq('status', 'pendente')
            .gte('due_date', effectiveDate);
          if (fetchErr) {
            throw fetchErr;
          } else {
            const list = ((pendingRecs as any[]) || []);
            const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
            const todayStr = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
            const baseNote = `Valor ajustado de ${fmt(oldValue)} para ${fmt(parsed)} em ${todayStr}` + (adjustNotes.trim() ? `, motivo: ${adjustNotes.trim()}` : "");
            let updateError: any = null;
            for (const r of list) {
              const prevNotes = (r as any).notes ? String((r as any).notes) + "\n" : "";
              const { error: updErr } = await supabase
                .from('receivables')
                .update({ amount: parsed, notes: prevNotes + baseNote } as any)
                .eq('id', (r as any).id);
              if (updErr) {
                updateError = updErr;
                break;
              }
            }
            if (updateError) {
              throw updateError;
            } else {
              if (list.length > 0) {
                toast.success(`${list.length} parcela(s) futura(s) atualizada(s)!`);
              } else {
                toast.success("Contrato atualizado! Nenhuma parcela pendente futura encontrada.");
              }
              setAdjustOpen(false);
              setAdjustContractId("");
              setNewMonthlyValue("");
              setAdjustNotes("");
              refetchReceivables();
              refetchSummary();
              refetchRecurring();
            }
          }
        }
      } catch (error) {
        toast.error("Erro ao ajustar valor recorrente");
      } finally {
        setSavingAdjust(false);
      }
    }
  };

  const openOneOffModal = () => {
    setOneOffClientMode("registered");
    setOneOffClientId("");
    setOneOffClientName("");
    setOneOffDescription("");
    setOneOffCategoryId("");
    setOneOffTotal("");
    setOneOffParcelled(false);
    setOneOffInstallments("2");
    setOneOffDueDate(new Date().toISOString().split("T")[0] as string);
    setOneOffPaymentMethod("");
    setOneOffNotes("");
    setOneOffCatSearch("");
    setOneOffOpen(true);
  };

  const selectedOneOffCategory = ((revenueCategories as any[]) || []).find((c: any) => c.id === oneOffCategoryId) || null;
  const oneOffFilteredCats = ((revenueCategories as any[]) || []).filter((c: any) =>
    (c.name || "").toLowerCase().includes(oneOffCatSearch.toLowerCase())
  );
  const canCreateOneOffCat = oneOffCatSearch.trim().length > 0 && !oneOffFilteredCats.some((c: any) => c.name.toLowerCase() === oneOffCatSearch.trim().toLowerCase());

  const handleCreateOneOffCategory = async () => {
    const name = oneOffCatSearch.trim();
    if (!name) {
      toast.error("Digite o nome da categoria");
    } else {
      try {
        const created: any = await createRevenueCategoryFn({ data: name });
        toast.success("Categoria criada!");
        await refetchRevenueCategories();
        if (created?.id) setOneOffCategoryId(created.id);
        setOneOffCatOpen(false);
        setOneOffCatSearch("");
      } catch (error) {
        console.error("[oneOffCategory] create FAILED FULL:", error);
        console.error(
          "[oneOffCategory] code:",
          (error as any)?.code,
          "message:",
          (error as any)?.message,
          "details:",
          (error as any)?.details,
          "hint:",
          (error as any)?.hint
        );
        console.error("[oneOffCategory] JSON:", JSON.stringify(error, null, 2));
        toast.error("Erro ao criar categoria");
      }
    }
  };

  const handleSaveOneOff = async () => {
    const total = Number(String(oneOffTotal).replace(",", "."));
    const n = oneOffParcelled ? Number(oneOffInstallments) : 1;
    const desc = oneOffDescription.trim();
    if (oneOffClientMode === "registered" && !oneOffClientId) {
      toast.error("Selecione o cliente cadastrado");
    } else if (oneOffClientMode === "simple" && !oneOffClientName.trim()) {
      toast.error("Informe o nome do cliente");
    } else if (desc.length < 5) {
      toast.error("Descrição deve ter ao menos 5 caracteres");
    } else if (Number.isNaN(total) || total <= 0) {
      toast.error("Informe um valor total válido");
    } else if (oneOffParcelled && (!Number.isInteger(n) || n < 2 || n > 120)) {
      toast.error("Informe o número de parcelas (2 a 120)");
    } else if (!oneOffDueDate) {
      toast.error("Informe a data de vencimento");
    } else {
      setSavingOneOff(true);
      try {
        await createOneOffFn({
          data: {
            client_id: oneOffClientMode === "registered" ? oneOffClientId : null,
            client_name: oneOffClientMode === "simple" ? oneOffClientName.trim() : null,
            description: desc,
            category_id: oneOffCategoryId || null,
            total_amount: total,
            installments: n,
            due_date: oneOffDueDate,
            payment_method: oneOffPaymentMethod || null,
            notes: oneOffNotes.trim() || null,
          },
        });
        toast.success(n > 1 ? `${n} parcelas criadas!` : "Recebimento pontual criado!");
        setOneOffOpen(false);
        refetchReceivables();
        refetchSummary();
      } catch (error: any) {
        toast.error(error?.message || "Erro ao salvar recebimento pontual");
      } finally {
        setSavingOneOff(false);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    // Comparação por string (YYYY-MM-DD), não por Date — new Date("2026-09-20")
    // vira meia-noite UTC, que em fusos atrás de UTC (Brasil) cai no dia anterior
    // no horário local, marcando itens que vencem HOJE como já atrasados.
    const isOverdue = status === 'pendente' && dueDate < (new Date().toISOString().split("T")[0] as string);
    if (status === 'pago') {
      return (<Badge className="bg-[var(--success)]/10 text-[var(--success)] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Pago</Badge>);
    }
    if (status === 'cancelado') {
      return (<Badge className="bg-[var(--surface-3)] text-[var(--ink-3)] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Cancelado</Badge>);
    }
    if (isOverdue) {
      return (<Badge className="bg-[var(--danger)]/10 text-[var(--danger)] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Atrasado</Badge>);
    }
    return (<Badge className="bg-[var(--warning)]/10 text-[var(--warning)] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Pendente</Badge>);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Recebimentos</h1>
          <p className="text-sm text-[var(--ink-3)]">Controle de recebíveis e fluxo de caixa</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--surface-1)] p-1 rounded-full border border-[var(--line-1)]">
            {([["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-bold transition-colors",
                  periodPreset === key ? "bg-[var(--violet-500)] text-white" : "text-[var(--ink-3)] hover:bg-[var(--surface-2)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-4 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium gap-2 hover:bg-[var(--surface-2)]">
                <Calendar className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</> : format(dateRange.from, "dd/MM/yy")) : "Período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || new Date()}
                selected={{ from: dateRange?.from || undefined, to: dateRange?.to || undefined }}
                onSelect={(range: any) => { setPeriodPreset(null); setDateRange(range || { from: undefined, to: undefined }); setPage(1); }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          {dateRange.from && (
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[var(--danger)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]" onClick={clearPeriod} title="Limpar período">
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MiniKpiCard
          icon={Wallet}
          label="Total a Receber"
          value={loadingSummary ? "..." : formatCurrency(summary?.totalPending || 0)}
          subtitle={dateRange.from ? "No período selecionado" : "Geral pendente"}
          trend={summaryTrends?.trends.pending}
          delta={summaryTrends?.deltas.pending}
          color="text-[var(--violet-500)]"
        />
        <MiniKpiCard
          icon={CheckCircle2}
          label={dateRange.from ? "Recebido no Período" : "Recebido no Mês"}
          value={loadingSummary ? "..." : formatCurrency(summary?.totalPaidMonth || 0)}
          subtitle="Pagamentos confirmados"
          trend={summaryTrends?.trends.paid}
          delta={summaryTrends?.deltas.paid}
          color="text-[var(--success)]"
        />
        <MiniKpiCard
          icon={AlertCircle}
          label="Atrasados"
          value={loadingSummary ? "..." : formatCurrency(summary?.totalOverdue || 0)}
          subtitle="Atenção necessária"
          color="text-[var(--danger)]"
        />
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
              <Button onClick={openOneOffModal} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-xs font-bold">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pontual
              </Button>
              <Button onClick={openAdjustModal} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-xs font-bold">
                Ajustar valor recorrente
              </Button>
              <Select defaultValue="all" onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] border-[var(--line-1)] rounded-full text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openClientCombo} className="w-[200px] justify-between border-[var(--line-1)] rounded-full text-xs font-normal">
                    {clientFilter === "all" ? "Todos Clientes" : clients?.find((c: any) => c.id === clientFilter)?.name}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 border-[var(--line-1)] rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => { setClientFilter("all"); setOpenClientCombo(false); }} className="text-xs cursor-pointer">
                          <Check className={cn("mr-2 h-4 w-4", clientFilter === "all" ? "opacity-100" : "opacity-0")} />
                          Todos Clientes
                        </CommandItem>
                        {clients?.map((c: any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { setClientFilter(c.id); setOpenClientCombo(false); }} className="text-xs cursor-pointer">
                            <Check className={cn("mr-2 h-4 w-4", clientFilter === c.id ? "opacity-100" : "opacity-0")} />
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
                {paginatedReceivables.map((r: any) => (
                  <TableRow key={r.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--ink-1)] leading-none mb-1">{r.client?.name || r.client_name || "—"}</div>
                          <div className="text-[10px] text-[var(--ink-3)]">{r.description || r.payment_method || "--"}</div>
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
                    <TableCell className="text-[var(--ink-3)] text-xs">{r.installment_number ? `${r.installment_number}ª` : "Única"}</TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)]">{formatCurrency(r.amount)}</TableCell>
                    <TableCell><div className="flex flex-col gap-1 items-start">{getStatusBadge(r.status, r.due_date)}{r.status === 'pago' && r.paid_at ? (<span className="text-[10px] text-[var(--ink-3)]">Pago em {format(new Date(r.paid_at), 'dd/MM')}</span>) : null}</div></TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pendente' && (
                          <Button size="sm" className="h-8 bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full px-4 text-[10px] font-bold" onClick={() => openLiquidateModal(r)}>
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
                            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => openDueDateModal(r)}>
                              <Calendar className="h-4 w-4 text-[var(--ink-3)]" /> Alterar vencimento
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => openAmountModal(r)}>
                              <DollarSign className="h-4 w-4 text-[var(--ink-3)]" /> Editar valor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer text-[var(--danger)] focus:text-[var(--danger)]" onClick={() => setReceivableToDelete(r.id)}>
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
          {filteredReceivables && filteredReceivables.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[var(--line-1)] px-6 py-4">
              <p className="text-xs text-[var(--ink-3)]">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredReceivables.length)} de {filteredReceivables.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-[var(--ink-1)] px-2">Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
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
                <Input placeholder="Buscar cliente..." className="pl-10 border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" value={recurringSearch} onChange={(e) => setRecurringSearch(e.target.value)} />
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
                    <TableCell className="text-[var(--ink-3)] text-sm">{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell className="text-[var(--ink-1)]">{c.monthly_value != null ? formatCurrency(c.monthly_value) : "—"}</TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)]">{formatCurrency(c.ltv)}</TableCell>
                    <TableCell className="text-[var(--ink-3)] text-sm">{c.remaining_months != null ? `${c.remaining_months} de ${c.mrr_months}` : "—"}</TableCell>
                    <TableCell className="text-[var(--ink-1)]">{c.health_score ?? "—"}</TableCell>
                    <TableCell className="pr-6">
                      <Badge className={cn("rounded-full border-0 px-3 py-1 text-xs font-semibold", c.payment_status === "atrasado" ? "bg-[var(--danger)]/10 text-[var(--danger)]" : "bg-[var(--success)]/10 text-[var(--success)]")}>
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
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setEditingDueDate(null)} disabled={savingEdit}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveDueDate} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
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
            <Input type="number" min="0.01" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setEditingAmount(null)} disabled={savingEdit}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveAmount} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adjustOpen} onOpenChange={(open) => { if (!open) setAdjustOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Ajustar valor recorrente</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">
              As alterações afetarão apenas recebimentos pendentes a partir da data efetiva
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Cliente Recorrente</Label>
              <Select value={adjustContractId} onValueChange={(v) => setAdjustContractId(v)}>
                <SelectTrigger className="border-[var(--line-1)] rounded-full">
                  <SelectValue placeholder={loadingAdjustContracts ? "Carregando..." : "Selecione o cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {((adjustContracts as any[]) || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.client as any)?.name || c.client_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAdjustContract ? (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-1)] p-3">
                <div>
                  <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Valor Atual</p>
                  <p className="text-sm font-bold text-[var(--ink-1)]">
                    {selectedAdjustContract.monthly_value != null ? formatCurrency(Number(selectedAdjustContract.monthly_value)) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Tipo de Contrato</p>
                  <p className="text-sm font-bold text-[var(--ink-1)]">
                    {selectedAdjustContract.type === "recurring" ? "Recorrente" : String(selectedAdjustContract.type || "—")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-3)]">Selecione um cliente para ver o valor atual e o tipo de contrato.</p>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Novo valor mensal</Label>
              <Input type="number" min="0.01" step="0.01" value={newMonthlyValue} onChange={(e) => setNewMonthlyValue(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Data Efetiva</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Observações</Label>
              <Textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Motivo do ajuste (opcional)" className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-xl min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setAdjustOpen(false)} disabled={savingAdjust}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveAdjust} disabled={savingAdjust}>{savingAdjust ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={oneOffOpen} onOpenChange={(open) => { if (!open) setOneOffOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Adicionar recebimento pontual</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">
              Preencha os dados do recebimento avulso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Cliente</Label>
              <div className="flex gap-2">
                <Button type="button" variant={oneOffClientMode === "registered" ? "default" : "outline"} className={oneOffClientMode === "registered" ? "rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-xs" : "rounded-full border-[var(--line-1)] text-[var(--ink-3)] text-xs"} onClick={() => setOneOffClientMode("registered")}>Cliente cadastrado</Button>
                <Button type="button" variant={oneOffClientMode === "simple" ? "default" : "outline"} className={oneOffClientMode === "simple" ? "rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-xs" : "rounded-full border-[var(--line-1)] text-[var(--ink-3)] text-xs"} onClick={() => setOneOffClientMode("simple")}>Cliente simplificado</Button>
              </div>
              {oneOffClientMode === "registered" ? (
                <Select value={oneOffClientId} onValueChange={(v) => setOneOffClientId(v)}>
                  <SelectTrigger className="border-[var(--line-1)] rounded-full">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {((clients as any[]) || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={oneOffClientName} onChange={(e) => setOneOffClientName(e.target.value)} placeholder="Nome do cliente" className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Descrição do serviço</Label>
              <Input value={oneOffDescription} onChange={(e) => setOneOffDescription(e.target.value)} placeholder="Ex.: Consultoria de janeiro" className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Categoria</Label>
              <Popover open={oneOffCatOpen} onOpenChange={setOneOffCatOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={oneOffCatOpen} className="w-full justify-between border-[var(--line-1)] rounded-full font-normal">
                    {selectedOneOffCategory ? selectedOneOffCategory.name : "Selecione a categoria"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-[var(--line-1)] rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar ou criar categoria..." value={oneOffCatSearch} onValueChange={setOneOffCatSearch} className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        {canCreateOneOffCat ? (
                          <button type="button" onClick={handleCreateOneOffCategory} className="w-full text-xs font-bold text-[var(--violet-500)] py-2">
                            Criar &quot;{oneOffCatSearch.trim()}&quot;
                          </button>
                        ) : "Nenhuma categoria encontrada."}
                      </CommandEmpty>
                      <CommandGroup>
                        {oneOffFilteredCats.map((c: any) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { setOneOffCategoryId(c.id); setOneOffCatOpen(false); setOneOffCatSearch(""); }} className="text-xs cursor-pointer">
                            <Check className={cn("mr-2 h-4 w-4", oneOffCategoryId === c.id ? "opacity-100" : "opacity-0")} />
                            {c.name}
                          </CommandItem>
                        ))}
                        {canCreateOneOffCat && (
                          <CommandItem value={oneOffCatSearch} onSelect={handleCreateOneOffCategory} className="text-xs cursor-pointer font-bold text-[var(--violet-500)]">
                            <Plus className="mr-2 h-4 w-4" />
                            Criar &quot;{oneOffCatSearch.trim()}&quot;
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Valor total</Label>
              <Input type="number" min="0.01" step="0.01" value={oneOffTotal} onChange={(e) => setOneOffTotal(e.target.value)} placeholder="0,00" className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] border border-[var(--line-1)] p-3">
              <Label className="text-xs font-bold text-[var(--ink-1)]">Parcelar este recebimento</Label>
              <Switch checked={oneOffParcelled} onCheckedChange={setOneOffParcelled} />
            </div>
            {oneOffParcelled && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Número de parcelas</Label>
                <Input type="number" min="2" max="120" step="1" value={oneOffInstallments} onChange={(e) => setOneOffInstallments(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Data de vencimento</Label>
              <Input type="date" value={oneOffDueDate} onChange={(e) => setOneOffDueDate(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Forma de pagamento</Label>
              <Select value={oneOffPaymentMethod} onValueChange={(v) => setOneOffPaymentMethod(v)}>
                <SelectTrigger className="border-[var(--line-1)] rounded-full">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Observações</Label>
              <Textarea value={oneOffNotes} onChange={(e) => setOneOffNotes(e.target.value)} placeholder="Informações adicionais (opcional)" className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-xl min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setOneOffOpen(false)} disabled={savingOneOff}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveOneOff} disabled={savingOneOff}>{savingOneOff ? "Salvando..." : "Criar recebimento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!liquidatingReceivable} onOpenChange={(open) => { if (!open) setLiquidatingReceivable(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Liquidar recebimento</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">
              Escolha a data de pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Data de pagamento</Label>
            <Input type="date" value={liquidateDate} onChange={(e) => setLiquidateDate(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setLiquidatingReceivable(null)} disabled={savingLiquidate}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleConfirmLiquidate} disabled={savingLiquidate}>{savingLiquidate ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!receivableToDelete} onOpenChange={(open) => !open && setReceivableToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebível</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este recebível? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReceivable} className="bg-[var(--danger)] hover:bg-[var(--danger)]/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
