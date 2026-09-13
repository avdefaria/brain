import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Users, Send, BadgeCheck, Wallet, Pencil, Loader2, TrendingUp, HandCoins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCommercialMonth, getCommercialDashboard, upsertCommercialGoal } from "@/lib/commercial.functions";
import { CRMFunnelChart } from "@/components/CRMFunnelChart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comercial/")({
  component: ComercialPage,
});

const pctOf = (a: number, t: number) => (t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0);
const barColor = (p: number) => (p >= 100 ? "#22C55E" : p >= 60 ? "#F5A524" : "#3D4FE8");
const pctColor = (p: number) => (p >= 100 ? "text-[#22C55E]" : p >= 60 ? "text-[#F5A524]" : "text-[#8A8FA3]");

function ComercialPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const qc = useQueryClient();
  const fetchMonth = useServerFn(getCommercialMonth);
  const fetchDashboard = useServerFn(getCommercialDashboard);
  const saveGoal = useServerFn(upsertCommercialGoal);
  const { data, isLoading } = useQuery({ queryKey: ["commercial-month", month, year], queryFn: () => fetchMonth({ data: { month, year } }) });
  const { data: dash, isLoading: dashLoading } = useQuery({ queryKey: ["commercial-dashboard"], queryFn: () => fetchDashboard({ data: {} }) });
  const kpis = (dash as any)?.kpis || { leads: 0, propostas: 0, fechados: 0, pipelineMrr: 0, pipelineAvulso: 0, vendasMrr: 0, vendasAvulso: 0 };
  const leadsByMonth = ((dash as any)?.leadsByMonth || []) as { key: string; label: string; total: number }[];
  const closedValueByMonth = ((dash as any)?.closedValueByMonth || []) as { key: string; label: string; mrr: number; avulso: number }[];
  const funnelLeads = ((dash as any)?.funnelLeads || []) as any[];
  const trendData = closedValueByMonth.map((d) => ({ ...d, total: (Number(d.mrr) || 0) + (Number(d.avulso) || 0) }));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leads: "", proposals: "", deals: "", revenue: "" });
  const goal = (data as any)?.goal || null;
  const actual = (data as any)?.actual || { leads: 0, proposals: 0, deals: 0, revenue: 0 };
  const targets = { leads: Number(goal?.leads_target ?? 0) || 0, proposals: Number(goal?.proposals_target ?? 0) || 0, deals: Number(goal?.deals_target ?? 0) || 0, revenue: Number(goal?.revenue_target ?? 0) || 0 };
  const label = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const openEdit = () => {
    setForm({ leads: goal ? String(goal.leads_target ?? "") : "", proposals: goal ? String(goal.proposals_target ?? "") : "", deals: goal ? String(goal.deals_target ?? "") : "", revenue: goal ? String(goal.revenue_target ?? "") : "" });
    setOpen(true);
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGoal({ data: { month, year, leads_target: form.leads === "" ? 0 : Number(form.leads), proposals_target: form.proposals === "" ? 0 : Number(form.proposals), deals_target: form.deals === "" ? 0 : Number(form.deals), revenue_target: form.revenue === "" ? 0 : Number(form.revenue) } });
      toast.success("Meta do mês salva");
      qc.invalidateQueries({ queryKey: ["commercial-month", month, year] });
      setOpen(false);
    } catch { toast.error("Erro ao salvar meta"); } finally { setSaving(false); }
  };
  const bars = [
    { key: "leads", label: "Leads", icon: Users, cur: Number(actual.leads) || 0, tgt: targets.leads, disp: String(Number(actual.leads) || 0), meta: String(targets.leads) },
    { key: "proposals", label: "Propostas", icon: Send, cur: Number(actual.proposals) || 0, tgt: targets.proposals, disp: String(Number(actual.proposals) || 0), meta: String(targets.proposals) },
    { key: "deals", label: "Fechamentos", icon: BadgeCheck, cur: Number(actual.deals) || 0, tgt: targets.deals, disp: String(Number(actual.deals) || 0), meta: String(targets.deals) },
    { key: "revenue", label: "Receita", icon: Wallet, cur: Number(actual.revenue) || 0, tgt: targets.revenue, disp: money(Number(actual.revenue) || 0), meta: money(targets.revenue) },
  ];
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Comercial</h1>
        <p className="text-sm text-[#8A8FA3]">Dashboard comercial e meta do mês</p>
      </div>
      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#3D4FE8]/10 text-[#3D4FE8] flex items-center justify-center"><Target className="h-5 w-5" /></div>
              <div><CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Meta do Mês</CardTitle><p className="text-xs text-[#8A8FA3]">{title}</p></div>
            </div>
            <Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#3D4FE8] gap-2" onClick={openEdit}><Pencil className="h-4 w-4" />Editar metas</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 text-[#3D4FE8] animate-spin" /></div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bars.map((b) => {
              const pct = pctOf(b.cur, b.tgt);
              return (
                <div key={b.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><b.icon className="h-4 w-4 text-[#3D4FE8]" /><span className="text-xs font-bold text-[#0E0E16] uppercase tracking-wider">{b.label}</span></div>
                    <span className={cn("text-xs font-bold tabular", pctColor(pct))}>{b.disp} | {pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4E6F0]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                  </div>
                  <p className="text-[11px] text-[#8A8FA3]">Meta: <span className="font-bold text-[#0E0E16]">{b.meta}</span>{b.tgt === 0 ? " — defina a meta" : ""}</p>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-[#E4E6F0] shadow-sm"><CardContent className="pt-5"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#3D4FE8]" /><span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Leads</span></div><p className="mt-2 text-2xl font-bold text-[#0E0E16] tabular">{dashLoading ? "…" : Number(kpis.leads) || 0}</p><p className="text-[11px] text-[#8A8FA3]">Criados no mês</p></CardContent></Card>
        <Card className="border-[#E4E6F0] shadow-sm"><CardContent className="pt-5"><div className="flex items-center gap-2"><Send className="h-4 w-4 text-[#3D4FE8]" /><span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Propostas</span></div><p className="mt-2 text-2xl font-bold text-[#0E0E16] tabular">{dashLoading ? "…" : Number(kpis.propostas) || 0}</p><p className="text-[11px] text-[#8A8FA3]">Proposta enviada no mês</p></CardContent></Card>
        <Card className="border-[#E4E6F0] shadow-sm"><CardContent className="pt-5"><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-[#22C55E]" /><span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Fechados</span></div><p className="mt-2 text-2xl font-bold text-[#0E0E16] tabular">{dashLoading ? "…" : Number(kpis.fechados) || 0}</p><p className="text-[11px] text-[#8A8FA3]">Convertidos no mês</p></CardContent></Card>
        <Card className="border-[#E4E6F0] shadow-sm"><CardContent className="pt-5"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#F5A524]" /><span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Pipeline</span></div><p className="mt-2 text-lg font-bold text-[#0E0E16] tabular">{dashLoading ? "…" : money((Number(kpis.pipelineMrr) || 0) + (Number(kpis.pipelineAvulso) || 0))}</p><p className="text-[11px] text-[#8A8FA3]">Est. MRR + avulso</p></CardContent></Card>
        <Card className="border-[#E4E6F0] shadow-sm"><CardContent className="pt-5"><div className="flex items-center gap-2"><HandCoins className="h-4 w-4 text-[#22C55E]" /><span className="text-xs font-bold text-[#8A8FA3] uppercase tracking-wider">Vendas feitas</span></div><p className="mt-2 text-lg font-bold text-[#0E0E16] tabular">{dashLoading ? "…" : money((Number(kpis.vendasMrr) || 0) + (Number(kpis.vendasAvulso) || 0))}</p><p className="text-[11px] text-[#8A8FA3]">Real MRR + avulso</p></CardContent></Card>
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#E4E6F0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Leads por mês</CardTitle><p className="text-xs text-[#8A8FA3]">Últimos 6 meses, por data de criação</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={leadsByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid stroke="#E4E6F0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any) => [v, "Leads"]} /><Line type="monotone" dataKey="total" name="Leads" stroke="#3D4FE8" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></CardContent></Card>
        <Card className="border-[#E4E6F0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Valor fechado por mês</CardTitle><p className="text-xs text-[#8A8FA3]">Por converted_at, valores reais do contrato</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={closedValueByMonth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><CartesianGrid stroke="#E4E6F0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any, name: any) => [money(Number(v) || 0), name === "mrr" ? "MRR" : "Avulso"]} /><Legend formatter={(v: string) => (v === "mrr" ? "MRR" : "Avulso")} /><Bar dataKey="mrr" name="mrr" fill="#3D4FE8" radius={[6, 6, 0, 0]} /><Bar dataKey="avulso" name="avulso" fill="#F5A524" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
      </section>
      <CRMFunnelChart leads={funnelLeads} />
      <Card className="border-[#E4E6F0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Tendências</CardTitle><p className="text-xs text-[#8A8FA3]">Valor total fechado por mês</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><defs><linearGradient id="trendTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3D4FE8" stopOpacity={0.24} /><stop offset="100%" stopColor="#3D4FE8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#E4E6F0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#8A8FA3" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any) => [money(Number(v) || 0), "Total fechado"]} /><Area type="monotone" dataKey="total" name="Total fechado" stroke="#3D4FE8" strokeWidth={2} fill="url(#trendTotal)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E4E6F0]">
          <DialogHeader><DialogTitle className="font-title font-bold text-[#0E0E16]">Editar metas — {title}</DialogTitle><DialogDescription className="text-xs text-[#8A8FA3]">Pré-preenchido com a meta salva, ou vazio se ainda não houver meta.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label className="text-xs font-bold text-[#8A8FA3] uppercase">Leads</Label><Input type="number" min="0" step="1" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} placeholder="Ex: 10" className="border-[#E4E6F0] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[#8A8FA3] uppercase">Propostas</Label><Input type="number" min="0" step="1" value={form.proposals} onChange={(e) => setForm({ ...form, proposals: e.target.value })} placeholder="Ex: 5" className="border-[#E4E6F0] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[#8A8FA3] uppercase">Fechamentos</Label><Input type="number" min="0" step="1" value={form.deals} onChange={(e) => setForm({ ...form, deals: e.target.value })} placeholder="Ex: 2" className="border-[#E4E6F0] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[#8A8FA3] uppercase">Receita (R$)</Label><Input type="number" min="0" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="Ex: 10000" className="border-[#E4E6F0] rounded-full" /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" className="rounded-full border-[#E4E6F0] text-[#8A8FA3]" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
