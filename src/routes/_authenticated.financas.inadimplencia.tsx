import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReceivables } from "@/lib/finances.functions";
import { getPayables } from "@/lib/payables.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Users, DollarSign, Wallet, Clock, Building2, ChevronDown, Eye, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInCalendarDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financas/inadimplencia")({ component: DelinquencyPage });

const PAGE_SIZE = 50;
const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function MiniKpiCard({ icon: Icon, label, value, subtitle, trend, delta, color }: { icon: any; label: string; value: string; subtitle?: string; trend?: number[]; delta?: number; color: string }) {
  const trendData = (trend && trend.length > 0 ? trend : [0]).map((v, i) => ({ i, v }));
  const deltaColor = delta === undefined ? "text-[var(--ink-3)]" : delta > 0 ? "text-[var(--danger)]" : delta < 0 ? "text-[var(--success)]" : "text-[var(--ink-3)]";
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

function buildBuckets(granularity: "day" | "week" | "month") {
  const now = new Date();
  const n = granularity === "day" ? 7 : 6;
  const buckets: { key: string; start: Date; end: Date }[] = [];
  if (granularity === "day") {
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
      buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
    }
  } else if (granularity === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
    }
  } else {
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      buckets.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, start, end });
    }
  }
  return buckets;
}

function bucketTrend(rows: { due_date: string; amount: any }[], buckets: { start: Date; end: Date }[]) {
  const series = buckets.map(() => 0);
  for (const r of rows) {
    if (!r.due_date) continue;
    const t = new Date(r.due_date + "T12:00:00").getTime();
    for (let i = 0; i < buckets.length; i++) {
      if (t >= buckets[i]!.start.getTime() && t <= buckets[i]!.end.getTime()) {
        series[i] += Number(r.amount) || 0;
        break;
      }
    }
  }
  return series;
}

function trendDelta(series: number[]) {
  const c = series[series.length - 1] || 0;
  const p = series[series.length - 2] || 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 100);
}
const todayStr = () => new Date().toISOString().split("T")[0] as string;
const daysLate = (due: string) => {
  if (!due) return 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = differenceInCalendarDays(t, new Date(due + "T12:00:00"));
  return d > 0 ? d : 0;
};
const isOverdueR = (r: any, today: string) => {
  if (!r || r.status === "pago" || r.status === "cancelado") return false;
  if (r.status === "atrasado") return true;
  return !!r.due_date && r.due_date < today;
};
const isOverdueP = (p: any, today: string) => {
  if (!p || p.status === "pago") return false;
  if (p.status === "atrasado") return true;
  return !!p.due_date && p.due_date < today;
};
const toDS = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function sevOf(maxDays: number) {
  if (maxDays >= 16) return { label: "Alto", cls: "bg-[var(--danger)]/10 text-[var(--danger)]" };
  if (maxDays >= 8) return { label: "Médio", cls: "bg-[var(--warning)]/10 text-[var(--warning)]" };
  return { label: "Baixo", cls: "bg-[var(--success)]/10 text-[var(--success)]" };
}

function DelinquencyPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [periodPreset, setPeriodPreset] = useState<"hoje" | "semana" | "mes" | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pageClients, setPageClients] = useState(1);
  const [pagePayables, setPagePayables] = useState(1);
  const granularity: "day" | "week" | "month" = periodPreset === "hoje" ? "day" : periodPreset === "semana" ? "week" : "month";
  const applyPreset = (preset: "hoje" | "semana" | "mes") => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === "hoje") setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (preset === "semana") setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };
  const clearPeriod = () => { setPeriodPreset(null); setDateRange({ from: undefined, to: undefined }); };
  const fetchR = useServerFn(getReceivables);
  const fetchP = useServerFn(getPayables);
  const { data: receivables, isLoading: lR } = useQuery({ queryKey: ["delinq-r"], queryFn: () => fetchR({ data: {} }) });
  const { data: payables, isLoading: lP } = useQuery({ queryKey: ["delinq-p"], queryFn: () => fetchP({ data: { status: "atrasado" } }) });
  const today = todayStr();
  const fromStr = dateRange.from ? toDS(dateRange.from) : null;
  const toStr = dateRange.to ? toDS(dateRange.to) : dateRange.from ? toDS(dateRange.from) : null;
  const inPeriod = (due: string) => {
    if (!fromStr && !toStr) return true;
    if (!due) return false;
    if (fromStr && due < fromStr) return false;
    if (toStr && due > toStr) return false;
    return true;
  };
  const overdueR = useMemo(() => ((receivables || []) as any[]).filter((r) => isOverdueR(r, today) && inPeriod(r.due_date)), [receivables, fromStr, toStr]);
  const overdueP = useMemo(() => ((payables || []) as any[]).filter((p) => isOverdueP(p, today) && inPeriod(p.due_date)), [payables, fromStr, toStr]);
  const nClients = useMemo(() => new Set(overdueR.map((r: any) => r.client_id)).size, [overdueR]);
  const totOverdue = useMemo(() => overdueR.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0), [overdueR]);
  const totPay = useMemo(() => overdueP.reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0), [overdueP]);
  const avgDelay = useMemo(() => overdueR.length === 0 ? 0 : Math.round(overdueR.reduce((a: number, r: any) => a + daysLate(r.due_date), 0) / overdueR.length), [overdueR]);
  const buckets = useMemo(() => buildBuckets(granularity), [granularity]);
  const overdueRTrend = useMemo(() => bucketTrend(overdueR, buckets), [overdueR, buckets]);
  const overduePTrend = useMemo(() => bucketTrend(overdueP, buckets), [overdueP, buckets]);
  const clientsTrend = useMemo(() => buckets.map((b) => new Set(overdueR.filter((r: any) => {
    if (!r.due_date) return false;
    const t = new Date(r.due_date + "T12:00:00").getTime();
    return t >= b.start.getTime() && t <= b.end.getTime();
  }).map((r: any) => r.client_id)).size), [overdueR, buckets]);
  const grouped = useMemo(() => {
    const m = new Map<string, any>();
    overdueR.forEach((r: any) => {
      const k = String(r.client_id);
      const e = m.get(k) || { id: k, name: r.client?.name || "Cliente", total: 0, count: 0, oldest: r.due_date, max: 0, items: [] };
      e.total += Number(r.amount) || 0; e.count += 1; e.items.push(r);
      if (r.due_date && r.due_date < e.oldest) e.oldest = r.due_date;
      const d = daysLate(r.due_date);
      if (d > e.max) e.max = d;
      m.set(k, e);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [overdueR]);
  const sortedP = useMemo(() => [...overdueP].sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date))), [overdueP]);
  const loading = lR || lP;
  const totalPagesClients = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const currentPageClients = Math.min(pageClients, totalPagesClients);
  const paginatedGrouped = grouped.slice((currentPageClients - 1) * PAGE_SIZE, currentPageClients * PAGE_SIZE);
  const totalPagesPayables = Math.max(1, Math.ceil(sortedP.length / PAGE_SIZE));
  const currentPagePayables = Math.min(pagePayables, totalPagesPayables);
  const paginatedP = sortedP.slice((currentPagePayables - 1) * PAGE_SIZE, currentPagePayables * PAGE_SIZE);
  useEffect(() => { setPageClients(1); setPagePayables(1); }, [fromStr, toStr]);
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Inadimplência</h1>
          <p className="text-sm text-[var(--ink-3)]">Clientes em atraso e contas da agência vencidas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--surface-1)] p-1 rounded-full border border-[var(--line-1)]">
            {([["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => applyPreset(key)} className={cn("h-8 px-3 rounded-full text-xs font-bold transition-colors", periodPreset === key ? "bg-[var(--violet-500)] text-white" : "text-[var(--ink-3)] hover:bg-[var(--surface-2)]")}>{label}</button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 px-4 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium gap-2 hover:bg-[var(--surface-2)]">
                <CalendarIcon className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</> : format(dateRange.from, "dd/MM/yy")) : "Período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" selected={{ from: dateRange?.from, to: dateRange?.to }} onSelect={(rg: any) => { setPeriodPreset(null); setDateRange(rg || { from: undefined, to: undefined }); }} numberOfMonths={2} locale={ptBR} />
            </PopoverContent>
          </Popover>
          {dateRange.from && <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[var(--danger)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]" onClick={clearPeriod} title="Limpar período"><X className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MiniKpiCard icon={Users} label="Clientes Inadimplentes" value={loading ? "..." : String(nClients)} subtitle="Com parcela atrasada" trend={clientsTrend} delta={trendDelta(clientsTrend)} color="text-[var(--violet-500)]" />
        <MiniKpiCard icon={DollarSign} label="Valor Inadimplente" value={loading ? "..." : money(totOverdue)} subtitle="Soma dos atrasados" trend={overdueRTrend} delta={trendDelta(overdueRTrend)} color="text-[var(--danger)]" />
        <MiniKpiCard icon={Wallet} label="Contas da Agência em Atraso" value={loading ? "..." : money(totPay)} subtitle="Despesas vencidas" trend={overduePTrend} delta={trendDelta(overduePTrend)} color="text-[var(--warning)]" />
        <MiniKpiCard icon={Clock} label="Média de Atraso" value={loading ? "..." : `${avgDelay} dias`} subtitle="Hoje - vencimento" color="text-[var(--violet-500)]" />
      </div>
      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50 p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Clientes Inadimplentes</CardTitle>
            <Badge className="bg-[var(--surface-2)] text-[var(--ink-3)] text-xs font-bold border-[var(--line-1)] rounded-full">{grouped.length} clientes</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lR ? <div className="p-12 text-center text-[var(--ink-3)]">Carregando dados financeiros...</div> : grouped.length > 0 ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-[var(--line-1)]">
                <TableHead className="font-bold text-[var(--ink-1)] pl-6">Cliente</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Valor em Atraso</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Contas</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Atraso Mais Antigo</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Severidade</TableHead>
                <TableHead className="text-right font-bold text-[var(--ink-1)] pr-6">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {paginatedGrouped.map((g: any) => {
                  const s = sevOf(g.max);
                  const open = expanded === g.id;
                  return [
                    <TableRow key={g.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50 group">
                      <TableCell className="pl-6"><div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]"><Building2 className="h-4 w-4" /></div>
                        <div className="font-bold text-[var(--ink-1)] leading-none">{g.name}</div>
                      </div></TableCell>
                      <TableCell className="font-bold text-[var(--ink-1)]">{money(g.total)}</TableCell>
                      <TableCell className="text-[var(--ink-3)] text-xs">{g.count} {g.count === 1 ? "parcela" : "parcelas"}</TableCell>
                      <TableCell className="text-[var(--ink-1)] font-medium">{g.oldest ? format(new Date(g.oldest + "T12:00:00"), "dd 'de' MMM", { locale: ptBR }) : "--"} <span className="text-[10px] text-[var(--ink-3)]">({g.max}d)</span></TableCell>
                      <TableCell><Badge className={`border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase ${s.cls}`}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-[10px] font-bold text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10 gap-1" onClick={() => setExpanded(open ? null : g.id)}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Ocultar" : "Parcelas"}
                        </Button>
                        <Link to="/clients/$clientId" params={{ clientId: String(g.id) }} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-bold text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--violet-500)]"><Eye className="h-4 w-4" /> Ver cliente</Link>
                      </div></TableCell>
                    </TableRow>,
                    open ? <TableRow key={`${g.id}-d`} className="border-[var(--line-1)] bg-[var(--surface-2)]/50"><TableCell colSpan={6} className="pl-6 pr-6 py-4"><div className="space-y-2">
                      {g.items.map((r: any) => (
                        <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-3">
                          <div className="text-xs text-[var(--ink-3)]">Vencimento <span className="font-bold text-[var(--ink-1)]">{r.due_date ? format(new Date(r.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "--"}</span> • {r.installment_number ? `${r.installment_number}ª parcela` : "Parcela única"} • {daysLate(r.due_date)} dias em atraso</div>
                          <div className="text-sm font-bold text-[var(--ink-1)]">{money(Number(r.amount) || 0)}</div>
                        </div>
                      ))}
                    </div></TableCell></TableRow> : null
                  ];
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]"><Users className="h-8 w-8 opacity-20" /></div>
              <div><h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Nenhum cliente inadimplente</h3><p className="text-sm text-[var(--ink-3)]">Nenhum recebível vencido no período selecionado.</p></div>
            </div>
          )}
          {grouped.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[var(--line-1)] px-6 py-4">
              <p className="text-xs text-[var(--ink-3)]">Mostrando {(currentPageClients - 1) * PAGE_SIZE + 1}–{Math.min(currentPageClients * PAGE_SIZE, grouped.length)} de {grouped.length}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPageClients <= 1} onClick={() => setPageClients((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs font-bold text-[var(--ink-1)] px-2">Página {currentPageClients} de {totalPagesClients}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPageClients >= totalPagesClients} onClick={() => setPageClients((p) => Math.min(totalPagesClients, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="border-b border-[var(--line-1)] bg-[var(--surface-2)]/50 p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Contas em Atraso</CardTitle>
            <Badge className="bg-[var(--surface-2)] text-[var(--ink-3)] text-xs font-bold border-[var(--line-1)] rounded-full">{sortedP.length} contas</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lP ? <div className="p-12 text-center text-[var(--ink-3)]">Carregando contas...</div> : sortedP.length > 0 ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-[var(--line-1)]">
                <TableHead className="font-bold text-[var(--ink-1)] pl-6">Descrição</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Categoria</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Valor</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Vencimento</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Dias em Atraso</TableHead>
                <TableHead className="font-bold text-[var(--ink-1)]">Status</TableHead>
                <TableHead className="text-right font-bold text-[var(--ink-1)] pr-6">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {paginatedP.map((p: any) => (
                  <TableRow key={p.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]/50 group">
                    <TableCell className="pl-6 font-medium text-[var(--ink-1)]">{p.description}</TableCell>
                    <TableCell className="text-[var(--ink-3)]">{p.category?.name || "—"}</TableCell>
                    <TableCell className="font-bold text-[var(--ink-1)]">{money(Number(p.amount) || 0)}</TableCell>
                    <TableCell className="text-[var(--ink-1)] font-medium">{p.due_date ? format(new Date(p.due_date + "T12:00:00"), "dd 'de' MMM", { locale: ptBR }) : "--"}</TableCell>
                    <TableCell className="text-[var(--ink-3)] text-xs">{daysLate(p.due_date)} dias</TableCell>
                    <TableCell><Badge className="bg-[var(--danger)]/10 text-[var(--danger)] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Atrasado</Badge></TableCell>
                    <TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-2">
                      <Link to="/financas/contas-a-pagar" className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-bold text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--violet-500)]"><Eye className="h-4 w-4" /> Ver conta</Link>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)]"><DollarSign className="h-8 w-8 opacity-20" /></div>
              <div><h3 className="text-lg font-title font-bold text-[var(--ink-1)]">Nenhuma conta em atraso</h3><p className="text-sm text-[var(--ink-3)]">As despesas vencidas da agência aparecem aqui.</p></div>
            </div>
          )}
          {sortedP.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-[var(--line-1)] px-6 py-4">
              <p className="text-xs text-[var(--ink-3)]">Mostrando {(currentPagePayables - 1) * PAGE_SIZE + 1}–{Math.min(currentPagePayables * PAGE_SIZE, sortedP.length)} de {sortedP.length}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPagePayables <= 1} onClick={() => setPagePayables((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs font-bold text-[var(--ink-1)] px-2">Página {currentPagePayables} de {totalPagesPayables}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-[var(--line-1)]" disabled={currentPagePayables >= totalPagesPayables} onClick={() => setPagePayables((p) => Math.min(totalPagesPayables, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
