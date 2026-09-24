import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Users, Send, BadgeCheck, Wallet, Pencil, Loader2, TrendingUp, TrendingDown, HandCoins, Trophy, Percent, X, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCommercialMonth, getCommercialDashboard, upsertCommercialGoal, upsertCloserGoal } from "@/lib/commercial.functions";
import { CRMFunnelChart } from "@/components/CRMFunnelChart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, LineChart, Line, Cell } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comercial/")({
  component: ComercialPage,
});

const pctOf = (a: number, t: number) => (t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0);
const DONUT_COLORS = ["var(--violet-500)", "var(--success)", "var(--warning)", "var(--danger)", "var(--chart-2)", "var(--ink-3)"];

interface MiniKpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend?: number[];
  delta?: number;
}

function MiniKpiCard({ icon, label, value, subtitle, trend, delta }: MiniKpiCardProps) {
  const trendData = (trend && trend.length > 0 ? trend : [0]).map((v, i) => ({ i, v }));
  const deltaColor = delta === undefined ? "text-[var(--ink-3)]" : delta > 0 ? "text-[var(--success)]" : delta < 0 ? "text-[var(--danger)]" : "text-[var(--ink-3)]";
  const deltaLabel = delta === undefined ? null : `${delta > 0 ? "+" : ""}${delta}%`;
  return (
    <Card className="border-[var(--line-1)] shadow-sm">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--violet-500)]/10 text-[var(--violet-500)]">{icon}</div>
          <span className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wider">{label}</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-[var(--ink-1)] tabular">{value}</p>
            <p className="text-[11px] text-[var(--ink-3)]">{subtitle}</p>
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
        </div>
      </CardContent>
    </Card>
  );
}

function ComercialPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const qc = useQueryClient();
  const fetchMonth = useServerFn(getCommercialMonth);
  const fetchDashboard = useServerFn(getCommercialDashboard);
  const saveGoal = useServerFn(upsertCommercialGoal);
  const saveCloserGoal = useServerFn(upsertCloserGoal);
  const { data, isLoading } = useQuery({ queryKey: ["commercial-month", month, year], queryFn: () => fetchMonth({ data: { month, year } }) });
  const { data: dash, isLoading: dashLoading } = useQuery({ queryKey: ["commercial-dashboard"], queryFn: () => fetchDashboard({ data: {} }) });
  const kpis = (dash as any)?.kpis || { leads: 0, propostas: 0, fechados: 0, previstoMonthly: 0, previstoMrr: 0, vendasPaid: 0, vendasMrr: 0, vendasAvulso: 0, trends: {}, deltas: {} };
  const mrrOverview = (dash as any)?.mrrOverview || { active: 0, churn: 0, previsto: 0, pctVsPrevMonth: 0 };
  const leadsByMonth = ((dash as any)?.leadsByMonth || []) as { key: string; label: string; total: number }[];
  const closedValueByMonth = ((dash as any)?.closedValueByMonth || []) as { key: string; label: string; mrr: number; avulso: number }[];
  const funnelLeads = ((dash as any)?.funnelLeads || []) as any[];
  const leadsByFunnelType = ((dash as any)?.leadsByFunnelType || []) as { name: string; value: number }[];
  const trendData = closedValueByMonth.map((d) => ({ ...d, total: (Number(d.mrr) || 0) + (Number(d.avulso) || 0) }));
  const closerRace = (((dash as any)?.closerRace || []) as { id: string; name: string; avatar_url: string | null; target: number; isOverride: boolean; sold: number; soldMrr: number }[]);
  const teamRevenueTarget = Number((dash as any)?.teamRevenueTarget) || 0;
  const funnelTypeCost = (((dash as any)?.funnelTypeCost || []) as { id: string; name: string; spend: number; leads: number; deals: number; costPerLead: number | null; costPerDeal: number | null }[]);
  const costOverview = (dash as any)?.costOverview || { totalSpend: 0, overallCostPerLead: null, overallCostPerDeal: null };
  const monthDeals = (((dash as any)?.monthDeals || []) as { id: string; name: string; funnelStage: string; funnelTypeName: string; responsibleName: string; monthlyValue: number; mrrValue: number; cost: number | null; createdAt: string; convertedAt: string | null }[]);
  const stageLabel: Record<string, string> = { novos_leads: "Novos leads", primeiro_contato: "Primeiro contato", em_negociacao: "Em negociação", apresentacao_agencia: "Apresentação da agência", proposta_enviada: "Proposta enviada", follow_up: "Follow up", vendas_feitas: "Vendas feitas", vendas_perdidas: "Vendas perdidas" };
  const shortBRL = (v: number) => {
    const abs = Math.abs(Number(v) || 0);
    const num = Number(v) || 0;
    return abs >= 1000000 ? `${(num / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M` : abs >= 1000 ? `${(num / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K` : `${Math.round(num)}`;
  };
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leads: "", proposals: "", deals: "", revenue: "" });
  const [closerEdit, setCloserEdit] = useState<{ id: string; name: string; value: string } | null>(null);
  const [savingCloser, setSavingCloser] = useState(false);
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
      qc.invalidateQueries({ queryKey: ["commercial-dashboard"] });
      setOpen(false);
    } catch { toast.error("Erro ao salvar meta"); } finally { setSaving(false); }
  };
  const handleSaveCloser = async () => {
    if (!closerEdit) return;
    setSavingCloser(true);
    try {
      const value = closerEdit.value.trim() === "" ? null : Number(closerEdit.value);
      await saveCloserGoal({ data: { month, year, profile_id: closerEdit.id, target_revenue: value } });
      toast.success("Meta do closer atualizada");
      qc.invalidateQueries({ queryKey: ["commercial-dashboard"] });
      setCloserEdit(null);
    } catch { toast.error("Erro ao salvar meta do closer"); } finally { setSavingCloser(false); }
  };
  const bars = [
    { key: "leads", label: "Leads", icon: Users, cur: Number(actual.leads) || 0, tgt: targets.leads, disp: String(Number(actual.leads) || 0), meta: String(targets.leads) },
    { key: "proposals", label: "Propostas", icon: Send, cur: Number(actual.proposals) || 0, tgt: targets.proposals, disp: String(Number(actual.proposals) || 0), meta: String(targets.proposals) },
    { key: "deals", label: "Fechamentos", icon: BadgeCheck, cur: Number(actual.deals) || 0, tgt: targets.deals, disp: String(Number(actual.deals) || 0), meta: String(targets.deals) },
    { key: "revenue", label: "Receita", icon: Wallet, cur: Number(actual.revenue) || 0, tgt: targets.revenue, disp: money(Number(actual.revenue) || 0), meta: money(targets.revenue) },
  ];
  const kpiCards = [
    { icon: <Users className="h-4 w-4" />, label: "Leads", value: dashLoading ? "…" : String(Number(kpis.leads) || 0), subtitle: "Criados no mês", trend: kpis.trends?.leads, delta: kpis.deltas?.leads },
    { icon: <Send className="h-4 w-4" />, label: "Propostas", value: dashLoading ? "…" : String(Number(kpis.propostas) || 0), subtitle: "Proposta enviada no mês", trend: kpis.trends?.propostas, delta: kpis.deltas?.propostas },
    { icon: <BadgeCheck className="h-4 w-4" />, label: "Fechados", value: dashLoading ? "…" : String(Number(kpis.fechados) || 0), subtitle: "Convertidos no mês", trend: kpis.trends?.fechados, delta: kpis.deltas?.fechados },
    { icon: <TrendingUp className="h-4 w-4" />, label: "Previsto", value: dashLoading ? "…" : money(Number(kpis.previstoMonthly) || 0), subtitle: `Previsão MRR: R$${shortBRL(Number(kpis.previstoMrr) || 0)}`, trend: kpis.trends?.previsto, delta: kpis.deltas?.previsto },
    { icon: <HandCoins className="h-4 w-4" />, label: "Vendas Realizadas", value: dashLoading ? "…" : money(Number(kpis.vendasPaid) || 0), subtitle: `Previsão MRR: R$${shortBRL((Number(kpis.vendasMrr) || 0) + (Number(kpis.vendasAvulso) || 0))}`, trend: kpis.trends?.vendas, delta: kpis.deltas?.vendas },
  ];
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Comercial</h1>
        <p className="text-sm text-[var(--ink-3)]">Dashboard comercial e meta do mês</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <Card className="border-0 shadow-sm rounded-2xl bg-[var(--violet-500)] text-white flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--surface-1)]/15 text-white flex items-center justify-center"><Target className="h-5 w-5" /></div>
              <div><CardTitle className="text-lg font-title font-bold text-white">Meta do Mês</CardTitle><p className="text-xs text-white/70">{title}</p></div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold tabular text-white/80">L: {targets.leads}  P: {targets.proposals}  F: {targets.deals}  R: R${shortBRL(targets.revenue)}</span>
              <Button variant="outline" className="rounded-full bg-[var(--surface-1)]/15 hover:bg-[var(--surface-3)]/25 text-white border-[var(--surface-1)]/25 gap-2" onClick={openEdit}><Pencil className="h-4 w-4" />Editar metas</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1">
          {isLoading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>) : (
          <div className="space-y-3">
            {bars.map((b) => {
              const pct = pctOf(b.cur, b.tgt);
              return (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs font-bold text-white uppercase tracking-wider">{b.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--violet-700)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-[var(--surface-1)]/90 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs font-bold tabular text-white">{b.disp} | {pct}%</span>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm rounded-2xl bg-[var(--violet-500)] text-white flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--surface-1)]/15 text-white flex items-center justify-center"><Trophy className="h-5 w-5" /></div>
              <div><CardTitle className="text-lg font-title font-bold text-white">Corrida Comercial</CardTitle><p className="text-xs text-white/70">{title} · só closers</p></div>
            </div>
            <span className="text-[11px] font-bold tabular text-white/80">Meta total: {money(teamRevenueTarget)}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1">
          {dashLoading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>) : (
            closerRace.length > 0 ? (
            <div className="space-y-4">
              {closerRace.map((r, idx) => {
                const pct = pctOf(r.sold, r.target);
                const initial = (r.name || "?").trim().charAt(0).toUpperCase() || "?";
                return (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-1)]/15 border border-[var(--surface-1)]/25 text-white text-[11px] font-bold flex items-center justify-center tabular">{idx + 1}</span>
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt={r.name} className="h-6 w-6 shrink-0 rounded-full object-cover border border-[var(--surface-1)]/25" />
                      ) : (
                        <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--surface-1)]/15 border border-[var(--surface-1)]/25 text-white text-[11px] font-bold flex items-center justify-center">{initial}</span>
                      )}
                      <span className="text-xs font-bold text-white truncate">{r.name}</span>
                      {r.isOverride && <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--surface-1)]/15 border border-[var(--surface-1)]/25 rounded-full px-2 py-0.5 text-white/80">meta própria</span>}
                      <button
                        type="button"
                        className="ml-auto text-white/60 hover:text-white"
                        onClick={() => setCloserEdit({ id: r.id, name: r.name, value: r.isOverride ? String(Math.round(r.target)) : "" })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--violet-700)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-[var(--surface-1)]/90 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-40 shrink-0 text-right text-xs font-bold tabular text-white">{money(r.sold)} / {money(r.target)} | {pct}%</span>
                    </div>
                    <p className="text-right text-[10px] text-white/60">Previsão MRR: R${shortBRL(r.soldMrr)}</p>
                  </div>
                );
              })}
            </div>
            ) : (
              <div className="flex items-center justify-center py-12"><p className="text-xs text-white/70">Nenhum closer cadastrado (adicione o cargo "Closer" em Time).</p></div>
            )
          )}
        </CardContent>
      </Card>
      </div>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((k) => (
          <MiniKpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} subtitle={k.subtitle} trend={k.trend} delta={k.delta} />
        ))}
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <Card className="border-[var(--line-1)] shadow-sm bg-[var(--violet-500)] text-white flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--surface-1)]/15 text-white flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
              <div><CardTitle className="text-lg font-title font-bold text-white">Faturamento MRR</CardTitle><p className="text-xs text-white/70">Base ativa hoje</p></div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-between">
            <p className="text-4xl md:text-5xl font-title font-bold text-white tabular leading-tight">{dashLoading ? "…" : money(mrrOverview.active)}</p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-1)]/10 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-wider"><TrendingDown className="h-3.5 w-3.5" />Churn no mês</span>
                <span className="text-xs font-bold tabular text-white">-{money(mrrOverview.churn)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-1)]/10 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-wider"><TrendingUp className="h-3.5 w-3.5" />MRR Previsto</span>
                <span className="text-xs font-bold tabular text-white">{money(mrrOverview.previsto)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-1)]/10 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] font-bold text-white/80 uppercase tracking-wider"><Percent className="h-3.5 w-3.5" />Vs. mês anterior</span>
                <span className={cn("text-xs font-bold tabular text-white")}>{mrrOverview.pctVsPrevMonth > 0 ? "+" : ""}{mrrOverview.pctVsPrevMonth}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[var(--line-1)] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Leads por mês</CardTitle><p className="text-xs text-[var(--ink-3)]">Últimos 6 meses, por data de criação</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={leadsByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--violet-500)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--violet-500)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--line-1)" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any) => [v, "Leads"]} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} /><Area type="monotone" dataKey="total" name="Leads" stroke="var(--violet-500)" strokeWidth={2} fill="url(#leadsFill)" dot={false} activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
        <Card className="border-[var(--line-1)] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Valor fechado por mês</CardTitle><p className="text-xs text-[var(--ink-3)]">Por converted_at, valores reais do contrato</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={closedValueByMonth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><CartesianGrid stroke="var(--line-1)" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any, name: any) => [money(Number(v) || 0), name === "mrr" ? "MRR" : "Avulso"]} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} /><Legend formatter={(v: string) => (v === "mrr" ? "MRR" : "Avulso")} /><Bar dataKey="mrr" name="mrr" fill="var(--violet-500)" radius={[6, 6, 0, 0]} /><Bar dataKey="avulso" name="avulso" fill="var(--warning)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
      </section>
      <CRMFunnelChart leads={funnelLeads} />
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Leads por Tipo de Funil</CardTitle><p className="text-xs text-[var(--ink-3)]">De onde vieram os leads, últimos 6 meses</p></CardHeader>
          <CardContent>
            {leadsByFunnelType.length === 0 ? (
              <div className="flex items-center justify-center py-12"><p className="text-xs text-[var(--ink-3)]">Nenhum lead no período.</p></div>
            ) : (
              <div style={{ height: Math.max(160, leadsByFunnelType.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsByFunnelType} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke="var(--line-1)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "var(--ink-2)" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => [v, "Leads"]} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                      {leadsByFunnelType.map((_, i) => (<Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-[var(--line-1)] shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Tendências</CardTitle><p className="text-xs text-[var(--ink-3)]">Valor total fechado por mês</p></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}><defs><linearGradient id="trendTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--violet-500)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--violet-500)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--line-1)" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any) => [money(Number(v) || 0), "Total fechado"]} contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} /><Area type="monotone" dataKey="total" name="Total fechado" stroke="var(--violet-500)" strokeWidth={2} fill="url(#trendTotal)" dot={false} activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
      </section>
      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-[var(--violet-500)]/10 text-[var(--violet-500)]"><Calculator className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Custo por Lead / Custo por Venda</CardTitle>
              <p className="text-xs text-[var(--ink-3)]">Investimento vem de Contas a Pagar &gt; Marketing, por tipo de funil — {title}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-[var(--line-1)] px-4 py-3">
              <p className="text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Investimento total</p>
              <p className="text-lg font-bold text-[var(--ink-1)] tabular mt-1">{money(costOverview.totalSpend)}</p>
            </div>
            <div className="rounded-xl border border-[var(--line-1)] px-4 py-3">
              <p className="text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Custo por lead</p>
              <p className="text-lg font-bold text-[var(--ink-1)] tabular mt-1">{costOverview.overallCostPerLead === null ? "—" : money(costOverview.overallCostPerLead)}</p>
            </div>
            <div className="rounded-xl border border-[var(--line-1)] px-4 py-3">
              <p className="text-[11px] font-bold text-[var(--ink-3)] uppercase tracking-wider">Custo por venda</p>
              <p className="text-lg font-bold text-[var(--ink-1)] tabular mt-1">{costOverview.overallCostPerDeal === null ? "—" : money(costOverview.overallCostPerDeal)}</p>
            </div>
          </div>
          {funnelTypeCost.length === 0 ? (
            <div className="flex items-center justify-center py-8"><p className="text-xs text-[var(--ink-3)]">Nenhum tipo de funil cadastrado.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--line-1)]">
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Tipo de Funil</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Investimento</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Leads</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Vendas</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Custo/Lead</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Custo/Venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelTypeCost.map((f) => (
                  <TableRow key={f.id} className="border-[var(--line-1)]">
                    <TableCell className="text-xs font-bold text-[var(--ink-1)]">{f.name}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{money(f.spend)}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{f.leads}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{f.deals}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{f.costPerLead === null ? "—" : money(f.costPerLead)}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{f.costPerDeal === null ? "—" : money(f.costPerDeal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Negociações do mês</CardTitle>
          <p className="text-xs text-[var(--ink-3)]">Leads criados em {title}</p>
        </CardHeader>
        <CardContent>
          {monthDeals.length === 0 ? (
            <div className="flex items-center justify-center py-8"><p className="text-xs text-[var(--ink-3)]">Nenhuma negociação criada no mês.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--line-1)]">
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Lead</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Tipo de Funil</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Etapa</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase">Responsável</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Valor Mensal</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Valor MRR</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Custo</TableHead>
                  <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthDeals.map((d) => (
                  <TableRow key={d.id} className="border-[var(--line-1)]">
                    <TableCell className="text-xs font-bold text-[var(--ink-1)]">{d.name}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)]">{d.funnelTypeName}</TableCell>
                    <TableCell className="text-xs">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", d.funnelStage === "vendas_feitas" ? "bg-[var(--success)]/15 text-[var(--success)]" : d.funnelStage === "vendas_perdidas" ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "bg-[var(--violet-500)]/10 text-[var(--violet-500)]")}>
                        {stageLabel[d.funnelStage] || d.funnelStage}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)]">{d.responsibleName}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{money(d.monthlyValue)}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{money(d.mrrValue)}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-2)] tabular text-right">{d.cost === null ? "—" : money(d.cost)}</TableCell>
                    <TableCell className="text-xs text-[var(--ink-3)] tabular text-right">{format(new Date(d.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader><DialogTitle className="font-title font-bold text-[var(--ink-1)]">Editar metas — {title}</DialogTitle><DialogDescription className="text-xs text-[var(--ink-3)]">Pré-preenchido com a meta salva, ou vazio se ainda não houver meta.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Leads</Label><Input type="number" min="0" step="1" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} placeholder="Ex: 10" className="border-[var(--line-1)] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Propostas</Label><Input type="number" min="0" step="1" value={form.proposals} onChange={(e) => setForm({ ...form, proposals: e.target.value })} placeholder="Ex: 5" className="border-[var(--line-1)] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Fechamentos</Label><Input type="number" min="0" step="1" value={form.deals} onChange={(e) => setForm({ ...form, deals: e.target.value })} placeholder="Ex: 2" className="border-[var(--line-1)] rounded-full" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Receita (R$) — total, dividido entre os closers</Label><Input type="number" min="0" step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="Ex: 10000" className="border-[var(--line-1)] rounded-full" /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2"><Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!closerEdit} onOpenChange={(v) => !v && setCloserEdit(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-[var(--line-1)]">
          <DialogHeader><DialogTitle className="font-title font-bold text-[var(--ink-1)]">Meta de {closerEdit?.name}</DialogTitle><DialogDescription className="text-xs text-[var(--ink-3)]">Deixe vazio para voltar ao rateio automático — o restante da meta total é redistribuído entre os demais closers.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Meta mensal (R$)</Label>
            <Input type="number" min="0" step="0.01" value={closerEdit?.value ?? ""} onChange={(e) => setCloserEdit((c) => c ? { ...c, value: e.target.value } : c)} placeholder="Automático (rateio)" className="border-[var(--line-1)] rounded-full" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)] gap-1" onClick={() => setCloserEdit((c) => c ? { ...c, value: "" } : c)} disabled={savingCloser}><X className="h-3.5 w-3.5" />Usar automático</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSaveCloser} disabled={savingCloser}>{savingCloser ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
