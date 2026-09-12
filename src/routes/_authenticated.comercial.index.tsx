import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Users, Send, BadgeCheck, Wallet, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCommercialMonth, upsertCommercialGoal } from "@/lib/commercial.functions";
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
  const saveGoal = useServerFn(upsertCommercialGoal);
  const { data, isLoading } = useQuery({ queryKey: ["commercial-month", month, year], queryFn: () => fetchMonth({ data: { month, year } }) });
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
