import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Search, Calendar, CheckCircle2, Clock, AlertCircle, MoreVertical, ArrowUpRight, ArrowDownRight, Download, Wallet, Building2, Trash2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceSummary, getReceivables, getRecurringClients, updateReceivableStatus, deleteReceivable, updateReceivableDueDate, updateReceivableAmount, getRevenueCategories, createRevenueCategory, createOneOffReceivable } from "@/lib/finances.functions";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/financas/recebimentos")({
  component: RecebimentosPage,
});

function RecebimentosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<any | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [editingAmount, setEditingAmount] = useState<any | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
    queryKey: ['finance-summary'],
    queryFn: () => fetchSummary()
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-simple'],
    queryFn: () => fetchClients()
  });

  const { data: receivables, isLoading: loadingReceivables, refetch: refetchReceivables } = useQuery({
    queryKey: ['receivables-list', statusFilter, clientFilter],
    queryFn: () => fetchReceivables({
      data: {
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

  const { data: recurringClients, isLoading: loadingRecurring, refetch: refetchRecurring } = useQuery({
    queryKey: ['recurring-clients'],
    queryFn: () => fetchRecurringClients()
  });

  const filteredRecurringClients = ((recurringClients as any[]) || []).filter((c: any) =>
    (c.client_name || "").toLowerCase().includes(recurringSearch.toLowerCase()) &&
    (recurringPaymentFilter === "all" || c.payment_status === recurringPaymentFilter)
  );

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateStatusFn({ data: { id, status: 'pago' } });
      toast.success("Pagamento baixado com sucesso!");
      refetchReceivables();
      refetchSummary();
      refetchRecurring();
    } catch (error) {
      toast.error("Erro ao baixar pagamento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este recebível?")) return;
    try {
      await deleteReceivableFn({ data: id });
      toast.success("Recebível excluído");
      refetchReceivables();
      refetchSummary();
      refetchRecurring();
    } catch (error) {
      toast.error("Erro ao excluir");
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
    const isOverdue = status === 'pendente' && new Date(dueDate) < new Date(new Date().setHours(0,0,0,0));
    if (status === 'pago') {
      return (<Badge className="bg-[#22C55E]/10 text-[#22C55E] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Pago</Badge>);
    }
    if (isOverdue) {
      return (<Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Atrasado</Badge>);
    }
    return (<Badge className="bg-[#F5A524]/10 text-[#F5A524] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Pendente</Badge>);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">Recebimentos</h1>
          <p className="text-sm text-[#8A8FA3]">Controle de recebíveis e fluxo de caixa</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[#E4E6F0] shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet className="h-12 w-12 text-[#3D4FE8]" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">
              {loadingSummary ? "..." : formatCurrency(summary?.totalPending || 0)}
            </div>
            <div className="flex items-center mt-1 text-[10px] text-[#8A8FA3]">
              <Clock className="h-3 w-3 mr-1" />
              Geral pendente
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E4E6F0] shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="h-12 w-12 text-[#22C55E]" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Recebido no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-title font-bold text-[#22C55E]">
              {loadingSummary ? "..." : formatCurrency(summary?.totalPaidMonth || 0)}
            </div>
            <div className="flex items-center mt-1 text-[10px] text-[#22C55E]">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Meta em dia
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E4E6F0] shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle className="h-12 w-12 text-[#EF4444]" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-title font-bold text-[#EF4444]">
              {loadingSummary ? "..." : formatCurrency(summary?.totalOverdue || 0)}
            </div>
            <div className="flex items-center mt-1 text-[10px] text-[#EF4444]">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Atenção necessária
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="border-b border-[#E4E6F0] bg-[#F7F8FC]/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-10 border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={openOneOffModal} className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-xs font-bold">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pontual
              </Button>
              <Button onClick={openAdjustModal} className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-xs font-bold">
                Ajustar valor recorrente
              </Button>
              <Select defaultValue="all" onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] border-[#E4E6F0] rounded-full text-xs">
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
                  <Button variant="outline" role="combobox" aria-expanded={openClientCombo} className="w-[200px] justify-between border-[#E4E6F0] rounded-full text-xs font-normal">
                    {clientFilter === "all" ? "Todos Clientes" : clients?.find((c: any) => c.id === clientFilter)?.name}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 border-[#E4E6F0] rounded-xl overflow-hidden" align="start">
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
            <div className="p-12 text-center text-[#8A8FA3]">Carregando dados financeiros...</div>
          ) : filteredReceivables && filteredReceivables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                  <TableHead className="font-bold text-[#0E0E16] pl-6">Cliente</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Contrato</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Vencimento</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Parcela</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Valor</TableHead>
                  <TableHead className="font-bold text-[#0E0E16]">Status</TableHead>
                  <TableHead className="text-right font-bold text-[#0E0E16] pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.map((r: any) => (
                  <TableRow key={r.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50 group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0E0E16] dark:text-white leading-none mb-1">{r.client?.name || r.client_name || "—"}</div>
                          <div className="text-[10px] text-[#8A8FA3]">{r.description || r.payment_method || "--"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#E4E6F0] text-[#8A8FA3] font-normal capitalize">
                        {r.contract?.type === 'recurring' ? 'Recorrente' : 'Avulso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#0E0E16] dark:text-white font-medium">
                      {r.due_date ? format(new Date(r.due_date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR }) : "--"}
                    </TableCell>
                    <TableCell className="text-[#8A8FA3] text-xs">{r.installment_number ? `${r.installment_number}ª` : "Única"}</TableCell>
                    <TableCell className="font-bold text-[#0E0E16] dark:text-white">{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{getStatusBadge(r.status, r.due_date)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pendente' && (
                          <Button size="sm" className="h-8 bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-4 text-[10px] font-bold" onClick={() => handleMarkAsPaid(r.id)}>
                            Liquidar
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8FA3]">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-[#E4E6F0] rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-bold text-[#8A8FA3] uppercase">Opções</DropdownMenuLabel>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => openDueDateModal(r)}>
                              <Calendar className="h-4 w-4 text-[#8A8FA3]" /> Alterar vencimento
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => openAmountModal(r)}>
                              <DollarSign className="h-4 w-4 text-[#8A8FA3]" /> Editar valor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={() => handleDelete(r.id)}>
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
              <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <DollarSign className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhum recebível</h3>
                <p className="text-sm text-[#8A8FA3]">Os recebíveis aparecem aqui conforme os contratos são criados.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="border-b border-[#E4E6F0] bg-[#F7F8FC]/50 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="font-title font-bold text-[#0E0E16] dark:text-white">Clientes Recorrentes</CardTitle>
              <p className="text-xs text-[#8A8FA3] mt-1">Um registro por cliente com contrato recorrente ativo</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8FA3]" />
                <Input placeholder="Buscar cliente..." className="pl-10 border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full" value={recurringSearch} onChange={(e) => setRecurringSearch(e.target.value)} />
              </div>
              <Select value={recurringPaymentFilter} onValueChange={setRecurringPaymentFilter}>
                <SelectTrigger className="w-[160px] border-[#E4E6F0] rounded-full text-xs">
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
            <div className="p-12 text-center text-sm text-[#8A8FA3]">Carregando clientes...</div>
          ) : filteredRecurringClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F7F8FC]/50">
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
                  <TableRow key={c.client_id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                    <TableCell className="pl-6 font-medium text-[#0E0E16]">{c.client_name}</TableCell>
                    <TableCell className="text-[#8A8FA3] text-sm">{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell className="text-[#0E0E16]">{c.monthly_value != null ? formatCurrency(c.monthly_value) : "—"}</TableCell>
                    <TableCell className="font-bold text-[#0E0E16]">{formatCurrency(c.ltv)}</TableCell>
                    <TableCell className="text-[#8A8FA3] text-sm">{c.remaining_months != null ? `${c.remaining_months} de ${c.mrr_months}` : "—"}</TableCell>
                    <TableCell className="text-[#0E0E16]">{c.health_score ?? "—"}</TableCell>
                    <TableCell className="pr-6">
                      <Badge className={cn("rounded-full border-0 px-3 py-1 text-xs font-semibold", c.payment_status === "atrasado" ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#22C55E]/10 text-[#22C55E]")}>
                        {c.payment_status === "atrasado" ? "Atrasado" : "Em dia"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <DollarSign className="h-8 w-8 opacity-20" />
              </div>
              <div>
                <h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhum cliente recorrente</h3>
                <p className="text-sm text-[#8A8FA3]">Contratos recorrentes ativos aparecem aqui.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editingDueDate} onOpenChange={(open) => { if (!open) setEditingDueDate(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E4E6F0]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[#0E0E16]">Alterar vencimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-[#8A8FA3]">
              {editingDueDate?.client?.name ? `${editingDueDate.client.name} • ` : ""}{editingDueDate?.installment_number ? `${editingDueDate.installment_number}ª parcela` : "Parcela única"}
            </p>
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setEditingDueDate(null)} disabled={savingEdit}>Cancelar</Button>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSaveDueDate} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingAmount} onOpenChange={(open) => { if (!open) setEditingAmount(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E4E6F0]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[#0E0E16]">Editar valor</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-[#8A8FA3]">
              {editingAmount?.client?.name ? `${editingAmount.client.name} • ` : ""}{editingAmount?.installment_number ? `${editingAmount.installment_number}ª parcela` : "Parcela única"}
            </p>
            <Input type="number" min="0.01" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setEditingAmount(null)} disabled={savingEdit}>Cancelar</Button>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSaveAmount} disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={adjustOpen} onOpenChange={(open) => { if (!open) setAdjustOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E4E6F0]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[#0E0E16]">Ajustar valor recorrente</DialogTitle>
            <DialogDescription className="text-xs text-[#8A8FA3]">
              As alterações afetarão apenas recebimentos pendentes a partir da data efetiva
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#8A8FA3] uppercase">Cliente Recorrente</Label>
              <Select value={adjustContractId} onValueChange={(v) => setAdjustContractId(v)}>
                <SelectTrigger className="border-[#E4E6F0] rounded-full">
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
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F7F8FC] border border-[#E4E6F0] p-3">
                <div>
                  <p className="text-[10px] font-bold text-[#8A8FA3] uppercase">Valor Atual</p>
                  <p className="text-sm font-bold text-[#0E0E16]">
                    {selectedAdjustContract.monthly_value != null ? formatCurrency(Number(selectedAdjustContract.monthly_value)) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#8A8FA3] uppercase">Tipo de Contrato</p>
                  <p className="text-sm font-bold text-[#0E0E16]">
                    {selectedAdjustContract.type === "recurring" ? "Recorrente" : String(selectedAdjustContract.type || "—")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8A8FA3]">Selecione um cliente para ver o valor atual e o tipo de contrato.</p>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#8A8FA3] uppercase">Novo valor mensal</Label>
              <Input type="number" min="0.01" step="0.01" value={newMonthlyValue} onChange={(e) => setNewMonthlyValue(e.target.value)} className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#8A8FA3] uppercase">Data Efetiva</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#8A8FA3] uppercase">Observações</Label>
              <Textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="Motivo do ajuste (opcional)" className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-xl min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setAdjustOpen(false)} disabled={savingAdjust}>Cancelar</Button>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSaveAdjust} disabled={savingAdjust}>{savingAdjust ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
