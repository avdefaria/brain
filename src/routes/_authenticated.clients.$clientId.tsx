import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Mail,
  Phone,
  ShieldAlert,
  TrendingUp,
  FileText,
  Clock,
  ArrowLeft,
  Settings,
  Users,
  MapPin,
  Plus,
  PhoneCall,
  ListChecks,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { getClientDetail, createClientCall, createHealthScoreSurvey } from "@/lib/clients.functions";
import { efficiencyBand, formatTrackedTime, formatElapsedDays } from "@/lib/efficiency";
import { getClientsWithChannels } from "@/lib/sales-channels.functions";
import { getClientOnboardingStatus } from "@/lib/onboarding.functions";
import { ONBOARDING_TOTAL_ITEMS } from "@/lib/onboarding-checklist";
import { getClientOffboardingStatus } from "@/lib/offboarding.functions";
import { OFFBOARDING_TOTAL_ITEMS } from "@/lib/offboarding-checklist";
import { ClientRegistrationModal } from "@/components/ClientRegistrationModal";
import { ClientOnboardingModal } from "@/components/ClientOnboardingModal";
import { ClientOffboardingModal } from "@/components/ClientOffboardingModal";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  component: ClientDetailPage,
});

const STATUS_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  ativo: "Ativo",
  em_aviso: "Em aviso",
  pausado: "Pausado",
  inativo: "Inativo",
};
const STATUS_BADGE: Record<string, string> = {
  onboarding: "bg-[var(--info-tint)] text-[var(--info)]",
  ativo: "bg-[var(--success-tint)] text-[var(--success)]",
  em_aviso: "bg-[var(--warning-tint)] text-[var(--warning)]",
  pausado: "bg-[var(--surface-2)] text-[var(--ink-3)]",
  inativo: "bg-[var(--danger-tint)] text-[var(--danger)]",
};

function shortId(id: string) {
  return id.split("-")[0]?.toUpperCase() || id;
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchDetail = useServerFn(getClientDetail);
  const fetchClientsWithChannels = useServerFn(getClientsWithChannels);
  const fetchOnboardingStatus = useServerFn(getClientOnboardingStatus);
  const fetchOffboardingStatus = useServerFn(getClientOffboardingStatus);
  const createCallFn = useServerFn(createClientCall);
  const createSurveyFn = useServerFn(createHealthScoreSurvey);

  const [editOpen, setEditOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [offboardingOpen, setOffboardingOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callDescription, setCallDescription] = useState("");
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [relacionamento, setRelacionamento] = useState("8");
  const [entregasPrazo, setEntregasPrazo] = useState("8");
  const [satisfacao, setSatisfacao] = useState("8");
  const [savingCall, setSavingCall] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: () => fetchDetail({ data: clientId }),
  });

  const { data: onboardingStatus } = useQuery({
    queryKey: ["client-onboarding", clientId],
    queryFn: () => fetchOnboardingStatus({ data: clientId }),
  });
  const onboardingCheckedCount = Object.keys(onboardingStatus?.checkedItems || {}).length;

  const { data: offboardingStatus } = useQuery({
    queryKey: ["client-offboarding", clientId],
    queryFn: () => fetchOffboardingStatus({ data: clientId }),
    enabled: data?.status === "em_aviso" || data?.status === "inativo",
  });
  const offboardingCheckedCount = Object.keys(offboardingStatus?.checkedItems || {}).length;

  const { data: editableClients } = useQuery({
    queryKey: ["clients-list-for-edit"],
    queryFn: () => fetchClientsWithChannels(),
    enabled: editOpen,
  });

  const editInitialData = useMemo(() => {
    const raw = (editableClients as any[])?.find((c) => c.id === clientId);
    if (!raw) return null;
    const account_squads = raw.accounts?.flatMap((acc: any) => acc.account_squads || []) || [];
    return { ...raw, account_squads };
  }, [editableClients, clientId]);

  const handleRegisterCall = async () => {
    if (callDescription.trim().length === 0) {
      toast.error("Descreva o chamado");
      return;
    }
    setSavingCall(true);
    try {
      await createCallFn({ data: { clientId, description: callDescription.trim() } });
      toast.success("Chamado registrado");
      setCallDescription("");
      setCallOpen(false);
      refetch();
    } catch {
      toast.error("Erro ao registrar chamado");
    } finally {
      setSavingCall(false);
    }
  };

  const handleSubmitSurvey = async () => {
    setSavingSurvey(true);
    try {
      await createSurveyFn({
        data: {
          clientId,
          relacionamento: Number(relacionamento),
          entregasPrazo: Number(entregasPrazo),
          satisfacao: Number(satisfacao),
        },
      });
      toast.success("Pesquisa registrada — Health Score atualizado");
      setSurveyOpen(false);
      refetch();
    } catch {
      toast.error("Erro ao registrar pesquisa");
    } finally {
      setSavingSurvey(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-[var(--ink-3)]">Carregando cliente...</div>
    );
  }

  const client = data as any;
  const chartData = (client.healthScoreHistory || []).map((h: any) => ({
    label: new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    value: h.score,
  }));
  const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  // Aceita tanto "YYYY-MM-DD" puro quanto timestamptz completo (deadline de
  // tarefa vem assim) — sempre corta pros 10 primeiros chars antes de montar
  // meio-dia local, senão concatenar em cima de um timestamp já completo
  // (ex: "2026-09-30T00:00:00+00:00" + "T12:00:00") vira "Invalid Date".
  const dateFmt = (d: string | null) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—");

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/clients/manage" className="h-10 w-10 rounded-full border border-[var(--line-1)] flex items-center justify-center text-[var(--ink-3)] hover:text-[var(--violet-500)] bg-[var(--surface-1)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">{client.name}</h1>
              <Badge className={cn("border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase", STATUS_BADGE[client.status])}>
                {STATUS_LABELS[client.status] || client.status}
              </Badge>
            </div>
            <p className="text-sm text-[var(--ink-3)]">
              ID: {shortId(client.id)} • Segmento: {client.niche || "—"}
              {client.channels.length > 0 ? ` • Canais: ${client.channels.join(", ")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-1)] gap-2" onClick={() => setOnboardingOpen(true)}>
            <ListChecks className="h-4 w-4" /> Onboarding {onboardingCheckedCount}/{ONBOARDING_TOTAL_ITEMS}
          </Button>
          {(client.status === "em_aviso" || client.status === "inativo") && (
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-1)] gap-2" onClick={() => setOffboardingOpen(true)}>
              <ListChecks className="h-4 w-4" /> Offboarding {offboardingCheckedCount}/{OFFBOARDING_TOTAL_ITEMS}
            </Button>
          )}
          <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-1)] gap-2" onClick={() => setEditOpen(true)}>
            <Settings className="h-4 w-4" /> Editar
          </Button>
          <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 gap-2" onClick={() => setNewTaskOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Ação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--surface-2)] pb-4">
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--violet-500)]" /> Evolução de Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--ink-3)]">Nenhuma pesquisa de Health Score realizada ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="healthScoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--violet-500)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--violet-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="label" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Area type="monotone" dataKey="value" name="Health Score" stroke="var(--violet-500)" strokeWidth={2} fill="url(#healthScoreFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[var(--line-1)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-title text-[var(--ink-3)] uppercase tracking-widest">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-[var(--ink-3)] shrink-0" />
                <span className="text-[var(--ink-1)] font-medium">{client.contact_name || client.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldAlert className="h-4 w-4 text-[var(--ink-3)] shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ink-3)]">CNPJ/CPF:</span>
                  <span className="text-[var(--ink-1)]">{client.cnpj_cpf || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-[var(--ink-3)] shrink-0" />
                <span className="text-[var(--ink-1)]">{client.corporate_email || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-[var(--ink-3)] shrink-0" />
                <span className="text-[var(--ink-1)]">{client.contact_whatsapp || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-[var(--ink-3)] shrink-0" />
                <span className="text-[var(--ink-1)]">{[client.city, client.state].filter(Boolean).join(" - ") || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-1)] shadow-sm bg-[var(--violet-500)] text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest">Health Score</p>
                  <h3 className="text-4xl font-bold mt-1">{client.healthScore ?? "—"}</h3>
                  <p className="text-[10px] text-white/60 mt-1">
                    {client.daysSinceLastSurvey === null ? "Nenhuma pesquisa realizada" : `Última pesquisa há ${client.daysSinceLastSurvey} dias`}
                  </p>
                  {client.lastSurvey && (
                    <>
                      <div className="h-px bg-white/15 my-2" />
                      <p className={cn("text-[10px]", client.daysSinceLastSurvey !== null && client.daysSinceLastSurvey >= 30 ? "text-white font-semibold" : "text-white/60")}>
                        Próxima pesquisa: {new Date(new Date(client.lastSurvey.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                        {client.daysSinceLastSurvey !== null && client.daysSinceLastSurvey >= 30 ? " (atrasada)" : ""}
                      </p>
                    </>
                  )}
                </div>
                <div className="h-10 w-10 bg-[var(--surface-1)]/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[var(--surface-1)]/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--surface-1)]" style={{ width: `${client.healthScore ?? 0}%` }} />
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-full bg-[var(--surface-1)]/15 hover:bg-[var(--surface-3)]/25 text-white border-[var(--surface-1)]/25 mt-4" onClick={() => setSurveyOpen(true)}>
                Realizar pesquisa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--violet-500)]" /> Contrato Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.contract ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-3)]">Tipo:</span>
                  <span className="font-bold text-[var(--ink-1)]">{client.contract.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-3)]">Valor Mensal:</span>
                  <span className="font-bold text-[var(--ink-1)]">{money(client.contract.monthlyValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-3)]">Valor Pago:</span>
                  <span className="font-bold text-[var(--success)]">{money(client.contract.valorPago)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-3)]">Início:</span>
                  <span className="text-[var(--ink-1)]">{dateFmt(client.contract.startDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--ink-3)]">Renovação:</span>
                  <span className="text-[var(--violet-500)] font-bold">{dateFmt(client.contract.renewalDate)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ink-3)]">Nenhum contrato cadastrado.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[var(--violet-500)]" /> Eficiência de Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.execution?.ratioPct !== null && client.execution?.ratioPct !== undefined ? (
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                    efficiencyBand(client.execution.ratioPct) === "ok" ? "bg-[var(--success)]/10 text-[var(--success)]" :
                    efficiencyBand(client.execution.ratioPct) === "atencao" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                    "bg-[var(--danger)]/10 text-[var(--danger)]"
                  )}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  {formatTrackedTime(client.execution.trackedSeconds)} trabalhados / {formatElapsedDays(client.execution.elapsedDays)} corridos
                </span>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-3)]">Sem tarefas com tempo corrido registrado ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--violet-500)]" /> Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.upcomingDeliveries.length === 0 ? (
              <p className="text-sm text-[var(--ink-3)]">Nenhuma entrega com prazo definido.</p>
            ) : (
              <div className="space-y-3">
                {client.upcomingDeliveries.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors border border-transparent hover:border-[var(--line-1)]">
                    <div>
                      <p className="text-xs font-bold text-[var(--ink-1)]">{t.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{dateFmt(t.deadline)}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase rounded-full border-[var(--line-1)]", t.overdue ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
                      {t.overdue ? "Atrasado" : "No prazo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--violet-500)]" /> Squad Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.squads.length === 0 ? (
              <p className="text-sm text-[var(--ink-3)]">Nenhum squad vinculado.</p>
            ) : (
              <div className="space-y-3">
                {client.squads.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[var(--surface-2)] rounded-2xl border border-[var(--line-1)] flex items-center justify-center font-bold text-xl" style={{ color: s.color || "var(--violet-500)" }}>
                      {s.name.charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-[var(--ink-1)]">{s.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-title flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-[var(--violet-500)]" /> Chamados
          </CardTitle>
          <Button variant="outline" className="rounded-full border-[var(--line-1)] gap-2" onClick={() => setCallOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar chamado
          </Button>
        </CardHeader>
        <CardContent>
          {client.calls.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)]">Nenhum chamado registrado.</p>
          ) : (
            <div className="space-y-2">
              {client.calls.map((c: any) => (
                <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[var(--line-1)]">
                  <div>
                    <p className="text-sm text-[var(--ink-1)]">{c.description}</p>
                    <p className="text-[10px] text-[var(--ink-3)] mt-1">{dateFmt(c.occurredAt)}{c.createdByName ? ` • ${c.createdByName}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientRegistrationModal
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={editInitialData}
        onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["clients-list"] }); }}
      />

      <CreateTaskModal
        isOpen={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        defaultClientId={clientId}
      />

      <ClientOnboardingModal
        clientId={clientId}
        clientName={client.name}
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />

      <ClientOffboardingModal
        clientId={clientId}
        clientName={client.name}
        open={offboardingOpen}
        onOpenChange={setOffboardingOpen}
      />

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Registrar chamado</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">Cliente solicitou atendimento, reunião ou similar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Descrição</Label>
            <Textarea value={callDescription} onChange={(e) => setCallDescription(e.target.value)} placeholder="Ex.: Cliente pediu reunião pra falar sobre o desempenho da campanha." className="border-[var(--line-1)] rounded-xl" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setCallOpen(false)} disabled={savingCall}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleRegisterCall} disabled={savingCall}>{savingCall ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Pesquisa de Health Score</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">
              Feita pelo líder do squad em contato com o cliente — notas de 0 a 10 em cada item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Relacionamento com o cliente</Label>
              <Input type="number" min="0" max="10" value={relacionamento} onChange={(e) => setRelacionamento(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Entregas no prazo</Label>
              <Input type="number" min="0" max="10" value={entregasPrazo} onChange={(e) => setEntregasPrazo(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--ink-3)] uppercase">Satisfação percebida</Label>
              <Input type="number" min="0" max="10" value={satisfacao} onChange={(e) => setSatisfacao(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full border-[var(--line-1)] text-[var(--ink-3)]" onClick={() => setSurveyOpen(false)} disabled={savingSurvey}>Cancelar</Button>
            <Button className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90" onClick={handleSubmitSurvey} disabled={savingSurvey}>{savingSurvey ? "Salvando..." : "Salvar pesquisa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
