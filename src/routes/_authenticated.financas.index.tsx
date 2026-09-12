import { createFileRoute } from "@tanstack/react-router";
import { 
  DollarSign, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Download,
  Wallet,
  Building2,
  Trash2,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceSummary, getReceivables, updateReceivableStatus, deleteReceivable, updateReceivableDueDate, updateReceivableAmount } from "@/lib/finances.functions";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/financas/")({
  component: FinancesPage,
});

function FinancesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState<any | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [editingAmount, setEditingAmount] = useState<any | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSummary = useServerFn(getFinanceSummary);
  const fetchReceivables = useServerFn(getReceivables);
  const fetchClients = useServerFn(getClientsWithChannels);
  const updateStatusFn = useServerFn(updateReceivableStatus);
  const deleteReceivableFn = useServerFn(deleteReceivable);
  const updateDueDateFn = useServerFn(updateReceivableDueDate);
  const updateAmountFn = useServerFn(updateReceivableAmount);

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

  const filteredReceivables = receivables?.filter((r: any) => 
    r.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateStatusFn({ data: { id, status: 'pago' } });
      toast.success("Pagamento baixado com sucesso!");
      refetchReceivables();
      refetchSummary();
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === 'pendente' && new Date(dueDate) < new Date(new Date().setHours(0,0,0,0));
    
    if (status === 'pago') {
      return (
        <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">
          Pago
        </Badge>
      );
    }
    
    if (isOverdue) {
      return (
        <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">
          Atrasado
        </Badge>
      );
    }

    return (
      <Badge className="bg-[#F5A524]/10 text-[#F5A524] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">
        Pendente
      </Badge>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">Finanças</h1>
          <p className="text-sm text-[#8A8FA3]">Controle de recebíveis e fluxo de caixa</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
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
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClientCombo}
                    className="w-[200px] justify-between border-[#E4E6F0] rounded-full text-xs font-normal"
                  >
                    {clientFilter === "all"
                      ? "Todos Clientes"
                      : clients?.find((c: any) => c.id === clientFilter)?.name}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 border-[#E4E6F0] rounded-xl overflow-hidden" align="start">
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
                          <div className="font-bold text-[#0E0E16] dark:text-white leading-none mb-1">
                            {r.client?.name}
                          </div>
                          <div className="text-[10px] text-[#8A8FA3]">{r.payment_method || "--"}</div>
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
                    <TableCell className="text-[#8A8FA3] text-xs">
                      {r.installment_number ? `${r.installment_number}ª` : "Única"}
                    </TableCell>
                    <TableCell className="font-bold text-[#0E0E16] dark:text-white">
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
                            className="h-8 bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-4 text-[10px] font-bold"
                            onClick={() => handleMarkAsPaid(r.id)}
                          >
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
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onSelect={() => openDueDateModal(r)}
                            >
                              <Calendar className="h-4 w-4 text-[#8A8FA3]" /> Alterar vencimento
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onSelect={() => openAmountModal(r)}
                            >
                              <DollarSign className="h-4 w-4 text-[#8A8FA3]" /> Editar valor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
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

      <Dialog open={!!editingDueDate} onOpenChange={(open) => { if (!open) setEditingDueDate(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E4E6F0]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[#0E0E16]">Alterar vencimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-xs text-[#8A8FA3]">
              {editingDueDate?.client?.name ? `${editingDueDate.client.name} • ` : ""}{editingDueDate?.installment_number ? `${editingDueDate.installment_number}ª parcela` : "Parcela única"}
            </p>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setEditingDueDate(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSaveDueDate} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
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
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="border-[#E4E6F0] focus-visible:ring-[#3D4FE8] rounded-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setEditingAmount(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSaveAmount} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
