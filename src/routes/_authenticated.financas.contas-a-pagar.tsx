import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calendar, Check, CheckCircle2, ChevronsUpDown, DollarSign, MoreVertical, Plus, Search, Trash2, Wallet, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getPayablesSummary, getPayables, getPayablesSummaryTrends, getExpenseCategories, createExpenseCategory, upsertPayable, updatePayableStatus, deletePayable } from "@/lib/payables.functions";
import { getFunnelTypes } from "@/lib/leads.functions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/financas/contas-a-pagar")({ component: PayablesPage });
const emptyForm = { description: "", category_id: "", amount: "", due_date: "", supplier_name: "", payment_method: "", notes: "", funnel_type_id: "" };
const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const statusOf = (p: any) => p.status !== "pago" && p.due_date < (new Date().toISOString().split("T")[0] as string) ? "atrasado" : p.status;
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

function PayablesPage() {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>(emptyForm);
  const [catOpen, setCatOpen] = useState(false); const [catSearch, setCatSearch] = useState("");
  const [liquidatingPayable, setLiquidatingPayable] = useState<any | null>(null);
  const [liquidateDate, setLiquidateDate] = useState("");
  const [savingLiquidate, setSavingLiquidate] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<"hoje" | "semana" | "mes" | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);
  const granularity: "day" | "week" | "month" = periodPreset === "hoje" ? "day" : periodPreset === "semana" ? "week" : "month";
  const applyPreset = (preset: "hoje" | "semana" | "mes") => {
    setPeriodPreset(preset); setPage(1);
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
  const fetchSummary = useServerFn(getPayablesSummary), fetchSummaryTrends = useServerFn(getPayablesSummaryTrends), fetchPayables = useServerFn(getPayables), fetchCats = useServerFn(getExpenseCategories);
  const createCat = useServerFn(createExpenseCategory), savePayable = useServerFn(upsertPayable), pay = useServerFn(updatePayableStatus), del = useServerFn(deletePayable);
  const fetchFunnelTypes = useServerFn(getFunnelTypes);
  const { data: summary, refetch: rs } = useQuery({ queryKey: ["payables-summary", periodParams], queryFn: () => fetchSummary({ data: periodParams }) });
  const { data: summaryTrends } = useQuery({ queryKey: ["payables-summary-trends", granularity], queryFn: () => fetchSummaryTrends({ data: { granularity } }) });
  const { data: cats, refetch: rc } = useQuery({ queryKey: ["expense-categories"], queryFn: () => fetchCats() });
  const { data: funnelTypes } = useQuery({ queryKey: ["funnel-types"], queryFn: () => fetchFunnelTypes() });
  const { data: payables, isLoading, refetch: rp } = useQuery({ queryKey: ["payables", status, cat, periodParams], queryFn: () => fetchPayables({ data: { ...periodParams, status: status === "all" ? null : status, categoryId: cat === "all" ? null : cat } }) });
  const rows = (payables || []).filter((p: any) => [p.description, p.supplier_name].some((x) => x?.toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, status, cat, periodParams]);
  const refresh = () => { rp(); rs(); };
  const openForm = (p?: any) => { setEditing(p || null); setForm(p ? { description: p.description, category_id: p.category_id || "", amount: String(p.amount), due_date: p.due_date, supplier_name: p.supplier_name || "", payment_method: p.payment_method || "", notes: p.notes || "", funnel_type_id: p.funnel_type_id || "" } : emptyForm); setOpen(true); };
  const save = async () => { try { await savePayable({ data: { ...form, id: editing?.id, category_id: form.category_id || null, amount: Number(form.amount), supplier_name: form.supplier_name || null, payment_method: form.payment_method || null, notes: form.notes || null, funnel_type_id: form.funnel_type_id || null } }); toast.success("Conta salva"); setOpen(false); refresh(); } catch (error: any) { const message = error?.message || error?.details || "Erro ao salvar"; console.error("[save payable error]", error?.message, error?.details, error); toast.error(message); } };
  const makeCat = async () => { try { const c = await createCat({ data: catSearch.trim() }); await rc(); setForm({ ...form, category_id: c.id }); setCatOpen(false); setCatSearch(""); } catch (error: any) { const message = error?.message || error?.details || "Erro ao criar categoria"; console.error("[create category error FULL]", JSON.stringify({ message: error?.message, code: error?.code, details: error?.details, hint: error?.hint, full: error }, null, 2), error); toast.error(message); } };
  const openLiquidateModal = (p: any) => { setLiquidatingPayable(p); setLiquidateDate(new Date().toISOString().split("T")[0] as string); };
  const handleConfirmLiquidate = async () => {
    setSavingLiquidate(true);
    try {
      if (liquidatingPayable && liquidateDate) {
        await pay({ data: { id: liquidatingPayable.id, status: "pago", paid_at: new Date(liquidateDate + "T12:00:00").toISOString() } });
        toast.success("Conta liquidada"); refresh(); setLiquidatingPayable(null);
      } else {
        toast.error("Selecione a data de pagamento");
      }
    } catch { toast.error("Erro ao liquidar"); } finally { setSavingLiquidate(false); }
  };
  const remove = async (id: string) => { try { await del({ data: id }); toast.success("Conta excluída"); refresh(); } catch { toast.error("Erro ao excluir"); } };
  const badge = (p: any) => { const s = statusOf(p); return <div className="flex flex-col gap-1 items-start"><Badge className={cn("rounded-full px-3 py-1 border-0", s === "pago" ? "bg-[var(--success)]/10 text-[var(--success)]" : s === "atrasado" ? "bg-[var(--danger)]/10 text-[var(--danger)]" : "bg-[var(--warning)]/10 text-[var(--warning)]")}>{s}</Badge>{p.status === "pago" && p.paid_at ? (<span className="text-[10px] text-[var(--ink-3)]">Pago em {format(new Date(p.paid_at), "dd/MM")}</span>) : null}</div>; };
  const selectedCat = cats?.find((c: any) => c.id === form.category_id); const canCreate = catSearch.trim() && !cats?.some((c: any) => c.name.toLowerCase() === catSearch.trim().toLowerCase());
  const isMarketing = selectedCat?.name?.toLowerCase() === "marketing";

  return <div className="space-y-6 animate-in fade-in duration-500 font-sans">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Contas a Pagar</h1><p className="text-sm text-[var(--ink-3)]">Controle de despesas, fornecedores e vencimentos</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--surface-1)] p-1 rounded-full border border-[var(--line-1)]">
          {([["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => applyPreset(key)} className={cn("h-8 px-3 rounded-full text-xs font-bold transition-colors", periodPreset === key ? "bg-[var(--violet-500)] text-white" : "text-[var(--ink-3)] hover:bg-[var(--surface-2)]")}>{label}</button>
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
            <CalendarPicker initialFocus mode="range" defaultMonth={dateRange?.from || new Date()} selected={{ from: dateRange?.from || undefined, to: dateRange?.to || undefined }} onSelect={(range: any) => { setPeriodPreset(null); setDateRange(range || { from: undefined, to: undefined }); setPage(1); }} numberOfMonths={2} locale={ptBR} />
          </PopoverContent>
        </Popover>
        {dateRange.from && <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[var(--danger)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]" onClick={clearPeriod} title="Limpar período"><X className="h-4 w-4" /></Button>}
        <Button onClick={() => openForm()} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full"><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MiniKpiCard icon={Wallet} label="Total a Pagar" value={money(summary?.totalPending || 0)} subtitle={dateRange.from ? "No período selecionado" : "Geral pendente"} trend={summaryTrends?.trends.pending} delta={summaryTrends?.deltas.pending} color="text-[var(--violet-500)]" />
      <MiniKpiCard icon={CheckCircle2} label={dateRange.from ? "Pago no Período" : "Pago no Mês"} value={money(summary?.totalPaidMonth || 0)} subtitle="Pagamentos confirmados" trend={summaryTrends?.trends.paid} delta={summaryTrends?.deltas.paid} color="text-[var(--success)]" />
      <MiniKpiCard icon={AlertCircle} label="Atrasados" value={money(summary?.totalOverdue || 0)} subtitle="Atenção necessária" color="text-[var(--danger)]" />
    </div>
    <Card className="border-[var(--line-1)] shadow-sm overflow-hidden"><CardHeader className="bg-[var(--surface-1)] border-b border-[var(--line-1)] p-4"><div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" /><Input className="pl-9 bg-[var(--surface-2)] border-[var(--line-1)]" placeholder="Buscar por descrição ou fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full md:w-44 bg-[var(--surface-2)] border-[var(--line-1)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="atrasado">Atrasado</SelectItem></SelectContent></Select><Select value={cat} onValueChange={setCat}><SelectTrigger className="w-full md:w-52 bg-[var(--surface-2)] border-[var(--line-1)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas categorias</SelectItem>{cats?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent className="p-0">{isLoading ? <div className="p-12 text-center text-[var(--ink-3)]">Carregando contas...</div> : rows.length > 0 ? <Table><TableHeader><TableRow className="bg-[var(--surface-2)]/50"><TableHead className="pl-6">Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-6">Ações</TableHead></TableRow></TableHeader><TableBody>{paginatedRows.map((p: any) => <TableRow key={p.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50 group"><TableCell className="pl-6 font-medium text-[var(--ink-1)]">{p.description}</TableCell><TableCell className="text-[var(--ink-3)]">{p.category?.name || "—"}{p.funnel_type?.name && <span className="block text-[10px] text-[var(--violet-500)]">{p.funnel_type.name}</span>}</TableCell><TableCell className="text-[var(--ink-3)]">{p.supplier_name || "—"}</TableCell><TableCell><div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-[var(--ink-3)]" />{format(new Date(p.due_date + "T12:00:00"), "dd 'de' MMM", { locale: ptBR })}</div></TableCell><TableCell className="font-bold text-[var(--ink-1)]">{money(Number(p.amount))}</TableCell><TableCell>{badge(p)}</TableCell><TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-2">{statusOf(p) !== "pago" && <Button size="sm" className="h-8 bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 rounded-full px-4 text-[10px] font-bold" onClick={() => openLiquidateModal(p)}>Liquidar</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--ink-3)]"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40"><DropdownMenuItem onClick={() => openForm(p)}>Editar</DropdownMenuItem><DropdownMenuItem className="text-[var(--danger)]" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow>)}</TableBody></Table> : <div className="p-20 text-center"><DollarSign className="h-10 w-10 mx-auto text-[var(--ink-3)] opacity-30 mb-3" /><h3 className="font-title font-bold text-[var(--ink-1)]">Nenhuma conta a pagar</h3><p className="text-sm text-[var(--ink-3)]">Cadastre uma nova conta para começar.</p></div>}
      {rows.length > PAGE_SIZE && <div className="flex items-center justify-between border-t border-[var(--line-1)] px-6 py-4"><p className="text-xs text-[var(--ink-3)]">Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} de {rows.length}</p><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs font-bold text-[var(--ink-1)] px-2">Página {currentPage} de {totalPages}</span><Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>}
    </CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-[560px]"><DialogHeader><DialogTitle>{editing ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-4"><div className="col-span-2 space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="space-y-2"><Label>Categoria</Label><Popover open={catOpen} onOpenChange={setCatOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal">{selectedCat?.name || "Selecione"}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[260px] p-0"><Command><CommandInput placeholder="Pesquisar categoria..." value={catSearch} onValueChange={setCatSearch} /><CommandList><CommandGroup>{cats?.map((c: any) => <CommandItem key={c.id} value={c.name} onSelect={() => { setForm({ ...form, category_id: c.id }); setCatOpen(false); setCatSearch(""); }}><Check className={cn("mr-2 h-4 w-4", form.category_id === c.id ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>)}{canCreate && <CommandItem onSelect={makeCat} className="text-[var(--violet-500)]">Criar “{catSearch.trim()}”</CommandItem>}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>{isMarketing && <div className="col-span-2 space-y-2"><Label>Tipo de Funil</Label><Select value={form.funnel_type_id} onValueChange={(v) => setForm({ ...form, funnel_type_id: v })}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o tipo de funil" /></SelectTrigger><SelectContent>{funnelTypes?.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select><p className="text-[11px] text-[var(--ink-3)]">Usado pra calcular custo por lead/venda no dashboard Comercial.</p></div>}<div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div><div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div><div className="space-y-2"><Label>Fornecedor</Label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></div><div className="col-span-2 space-y-2"><Label>Forma de pagamento</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div><div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={save}>Salvar</Button></div></DialogContent></Dialog>
    <Dialog open={!!liquidatingPayable} onOpenChange={(o) => { if (!o) setLiquidatingPayable(null); }}><DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]"><DialogHeader><DialogTitle className="font-title font-bold text-[var(--ink-1)]">Liquidar conta</DialogTitle><DialogDescription className="text-xs text-[var(--ink-3)]">Escolha a data de pagamento</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Data de pagamento</Label><Input type="date" value={liquidateDate} onChange={(e) => setLiquidateDate(e.target.value)} className="border-[var(--line-1)] focus-visible:ring-[var(--violet-500)] rounded-full" /></div><DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setLiquidatingPayable(null)} disabled={savingLiquidate}>Cancelar</Button><Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleConfirmLiquidate} disabled={savingLiquidate}>{savingLiquidate ? "Salvando..." : "Confirmar"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

