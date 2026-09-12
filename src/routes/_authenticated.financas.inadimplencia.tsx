import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { Users, DollarSign, Wallet, Clock, Building2, ChevronDown, Eye, Calendar as CalendarIcon } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/financas/inadimplencia")({ component: DelinquencyPage });

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const todayStr = () => new Date().toISOString().split("T")[0] as string;
const daysLate = (due: string) => {
  if (!due) return 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = differenceInCalendarDays(t, new Date(due + "T12:00:00"));
  return d > 0 ? d : 0;
};
const isOverdueR = (r: any, today: string) => {
  if (!r || r.status === "pago") return false;
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
  if (maxDays >= 16) return { label: "Alto", cls: "bg-[#EF4444]/10 text-[#EF4444]" };
  if (maxDays >= 8) return { label: "Médio", cls: "bg-[#D97706]/10 text-[#D97706]" };
  return { label: "Baixo", cls: "bg-[#F5A524]/10 text-[#F5A524]" };
}

function DelinquencyPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [expanded, setExpanded] = useState<string | null>(null);
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
  const kpi = [
    { label: "Clientes Inadimplentes", val: loading ? "..." : String(nClients), sub: "Com parcela atrasada", icon: Users, tint: "text-[#3D4FE8]", vcls: "text-[#0E0E16] dark:text-white" },
    { label: "Valor Inadimplente", val: loading ? "..." : money(totOverdue), sub: "Soma dos atrasados", icon: DollarSign, tint: "text-[#EF4444]", vcls: "text-[#EF4444]" },
    { label: "Contas da Agência em Atraso", val: loading ? "..." : money(totPay), sub: "Despesas vencidas", icon: Wallet, tint: "text-[#F5A524]", vcls: "text-[#0E0E16] dark:text-white" },
    { label: "Média de Atraso", val: loading ? "..." : `${avgDelay} dias`, sub: "Hoje - vencimento", icon: Clock, tint: "text-[#3D4FE8]", vcls: "text-[#0E0E16] dark:text-white" },
  ];
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">Inadimplência</h1>
          <p className="text-sm text-[#8A8FA3]">Clientes em atraso e contas da agência vencidas</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 px-4 rounded-full border-[#E4E6F0] bg-white text-xs font-medium gap-2 hover:bg-[#F7F8FC]">
              <CalendarIcon className="h-3.5 w-3.5 text-[#8A8FA3]" />
              {dateRange.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</> : format(dateRange.from, "dd/MM/yy")) : "Período"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar initialFocus mode="range" selected={{ from: dateRange?.from, to: dateRange?.to }} onSelect={(rg: any) => setDateRange(rg || { from: undefined, to: undefined })} numberOfMonths={2} locale={ptBR} />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpi.map((k) => (
          <Card key={k.label} className="border-[#E4E6F0] shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <k.icon className={`h-12 w-12 ${k.tint}`} />
            </div>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">{k.label}</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-title font-bold ${k.vcls}`}>{k.val}</div>
              <div className="flex items-center mt-1 text-[10px] text-[#8A8FA3]"><Clock className="h-3 w-3 mr-1" />{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="border-b border-[#E4E6F0] bg-[#F7F8FC]/50 p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Clientes Inadimplentes</CardTitle>
            <Badge className="bg-[#F7F8FC] text-[#8A8FA3] text-xs font-bold border-[#E4E6F0] rounded-full">{grouped.length} clientes</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lR ? <div className="p-12 text-center text-[#8A8FA3]">Carregando dados financeiros...</div> : grouped.length > 0 ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="font-bold text-[#0E0E16] pl-6">Cliente</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Valor em Atraso</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Contas</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Atraso Mais Antigo</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Severidade</TableHead>
                <TableHead className="text-right font-bold text-[#0E0E16] pr-6">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {grouped.map((g: any) => {
                  const s = sevOf(g.max);
                  const open = expanded === g.id;
                  return [
                    <TableRow key={g.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50 group">
                      <TableCell className="pl-6"><div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]"><Building2 className="h-4 w-4" /></div>
                        <div className="font-bold text-[#0E0E16] dark:text-white leading-none">{g.name}</div>
                      </div></TableCell>
                      <TableCell className="font-bold text-[#0E0E16] dark:text-white">{money(g.total)}</TableCell>
                      <TableCell className="text-[#8A8FA3] text-xs">{g.count} {g.count === 1 ? "parcela" : "parcelas"}</TableCell>
                      <TableCell className="text-[#0E0E16] dark:text-white font-medium">{g.oldest ? format(new Date(g.oldest + "T12:00:00"), "dd 'de' MMM", { locale: ptBR }) : "--"} <span className="text-[10px] text-[#8A8FA3]">({g.max}d)</span></TableCell>
                      <TableCell><Badge className={`border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase ${s.cls}`}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-[10px] font-bold text-[#3D4FE8] hover:bg-[#3D4FE8]/10 gap-1" onClick={() => setExpanded(open ? null : g.id)}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Ocultar" : "Parcelas"}
                        </Button>
                        <Link to="/clients/$clientId" params={{ clientId: String(g.id) }} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-bold text-[#8A8FA3] hover:bg-[#F7F8FC] hover:text-[#3D4FE8]"><Eye className="h-4 w-4" /> Ver cliente</Link>
                      </div></TableCell>
                    </TableRow>,
                    open ? <TableRow key={`${g.id}-d`} className="border-[#E4E6F0] bg-[#F7F8FC]/50"><TableCell colSpan={6} className="pl-6 pr-6 py-4"><div className="space-y-2">
                      {g.items.map((r: any) => (
                        <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-xl border border-[#E4E6F0] bg-white px-4 py-3">
                          <div className="text-xs text-[#8A8FA3]">Vencimento <span className="font-bold text-[#0E0E16]">{r.due_date ? format(new Date(r.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "--"}</span> • {r.installment_number ? `${r.installment_number}ª parcela` : "Parcela única"} • {daysLate(r.due_date)} dias em atraso</div>
                          <div className="text-sm font-bold text-[#0E0E16]">{money(Number(r.amount) || 0)}</div>
                        </div>
                      ))}
                    </div></TableCell></TableRow> : null
                  ];
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]"><Users className="h-8 w-8 opacity-20" /></div>
              <div><h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhum cliente inadimplente</h3><p className="text-sm text-[#8A8FA3]">Nenhum recebível vencido no período selecionado.</p></div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="border-b border-[#E4E6F0] bg-[#F7F8FC]/50 p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Contas em Atraso</CardTitle>
            <Badge className="bg-[#F7F8FC] text-[#8A8FA3] text-xs font-bold border-[#E4E6F0] rounded-full">{sortedP.length} contas</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lP ? <div className="p-12 text-center text-[#8A8FA3]">Carregando contas...</div> : sortedP.length > 0 ? (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="font-bold text-[#0E0E16] pl-6">Descrição</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Categoria</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Valor</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Vencimento</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Dias em Atraso</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Status</TableHead>
                <TableHead className="text-right font-bold text-[#0E0E16] pr-6">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sortedP.map((p: any) => (
                  <TableRow key={p.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50 group">
                    <TableCell className="pl-6 font-medium text-[#0E0E16]">{p.description}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{p.category?.name || "—"}</TableCell>
                    <TableCell className="font-bold text-[#0E0E16] dark:text-white">{money(Number(p.amount) || 0)}</TableCell>
                    <TableCell className="text-[#0E0E16] dark:text-white font-medium">{p.due_date ? format(new Date(p.due_date + "T12:00:00"), "dd 'de' MMM", { locale: ptBR }) : "--"}</TableCell>
                    <TableCell className="text-[#8A8FA3] text-xs">{daysLate(p.due_date)} dias</TableCell>
                    <TableCell><Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase">Atrasado</Badge></TableCell>
                    <TableCell className="text-right pr-6"><div className="flex items-center justify-end gap-2">
                      <Link to="/financas/contas-a-pagar" className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[10px] font-bold text-[#8A8FA3] hover:bg-[#F7F8FC] hover:text-[#3D4FE8]"><Eye className="h-4 w-4" /> Ver conta</Link>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]"><DollarSign className="h-8 w-8 opacity-20" /></div>
              <div><h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhuma conta em atraso</h3><p className="text-sm text-[#8A8FA3]">As despesas vencidas da agência aparecem aqui.</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
