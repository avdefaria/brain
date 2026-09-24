import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List as ListIcon,
  TrendingUp,
  DollarSign,
  Briefcase,
  AlertCircle,
  MoreVertical,
  Calendar as CalendarIcon,
  MessageSquare,
  User,
  Loader2,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  X
} from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCalendarDatePtBr } from "@/lib/utils";
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getLeads, getLeadStats, getLeadStatsTrends, updateLeadPosition, getFunnelTypes, STAGES, deleteLead } from "@/lib/leads.functions";
import { getCollaborators } from "@/lib/squads.functions";
import { LeadFormModal } from "@/components/LeadFormModal";
import { LeadConversionModal } from "@/components/LeadConversionModal";
import { ClientOnboardingModal } from "@/components/ClientOnboardingModal";
import { CRMFunnelChart, STAGE_COLORS } from "@/components/CRMFunnelChart";
import { CRMLeadsTable } from "@/components/CRMLeadsTable";
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

export const Route = createFileRoute("/_authenticated/comercial/crm")({
  component: CRMPage,
});

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

function CRMPage() {
  const queryClient = useQueryClient();
  const fetchLeads = useServerFn(getLeads);
  const fetchStats = useServerFn(getLeadStats);
  const fetchTrends = useServerFn(getLeadStatsTrends);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchFunnelTypes = useServerFn(getFunnelTypes);
  const updatePosition = useServerFn(updateLeadPosition);

  // Filter states
  const [responsibleId, setResponsibleId] = useState<string>("all");
  const [funnelTypeId, setFunnelTypeId] = useState<string>("all");
  const [showConverted, setShowConverted] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<"hoje" | "semana" | "mes" | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const granularity: "day" | "week" | "month" = periodPreset === "hoje" ? "day" : periodPreset === "semana" ? "week" : "month";
  const applyPreset = (preset: "hoje" | "semana" | "mes") => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === "hoje") setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (preset === "semana") setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    else setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
  };

  const filterParams = useMemo(() => ({
    responsible_id: responsibleId === "all" ? null : responsibleId,
    funnel_type_id: funnelTypeId === "all" ? null : funnelTypeId,
    showConverted,
    startDate: dateRange?.from?.toISOString() || null,
    endDate: dateRange?.to?.toISOString() || null
  }), [responsibleId, funnelTypeId, showConverted, dateRange]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filterParams],
    queryFn: () => fetchLeads({ data: filterParams }),
  });

  const { data: stats } = useQuery({
    queryKey: ["lead-stats", filterParams],
    queryFn: () => fetchStats({ data: filterParams }),
  });

  const trendsParams = useMemo(() => ({
    responsible_id: responsibleId === "all" ? null : responsibleId,
    funnel_type_id: funnelTypeId === "all" ? null : funnelTypeId,
    granularity,
  }), [responsibleId, funnelTypeId, granularity]);

  const { data: trendsData } = useQuery({
    queryKey: ["lead-stats-trends", trendsParams],
    queryFn: () => fetchTrends({ data: trendsParams }),
  });
  const trends = trendsData?.trends;
  const deltas = trendsData?.deltas;

  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => fetchCollaborators(),
  });

  const { data: funnelTypes = [] } = useQuery({
    queryKey: ["funnel-types"],
    queryFn: () => fetchFunnelTypes(),
  });

  const resetFilters = () => {
    setResponsibleId("all");
    setFunnelTypeId("all");
    setShowConverted(false);
    setPeriodPreset(null);
    setDateRange({ from: undefined, to: undefined });
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [leadToConvert, setLeadToConvert] = useState<any>(null);
  const [onboardingClient, setOnboardingClient] = useState<{ clientId: string; clientName: string } | null>(null);

  const deleteLeadFn = useServerFn(deleteLead);

  const handleDeleteLead = async () => {
    if (!leadToDelete?.id) return;
    try {
      await deleteLeadFn({ data: leadToDelete.id });
      toast.success("Lead excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["leads", filterParams] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats", filterParams] });
      setLeadToDelete(null);
    } catch (error) {
      toast.error("Erro ao excluir lead");
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      await updatePosition({
        data: {
          id: draggableId,
          funnel_stage: destination.droppableId,
          position: destination.index
        }
      });
      queryClient.invalidateQueries({ queryKey: ["leads", filterParams] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats", filterParams] });
    } catch (error) {
      toast.error("Erro ao atualizar posição do lead");
    }
  };

  const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  const shortBRL = (v: number) => {
    const abs = Math.abs(Number(v) || 0);
    const num = Number(v) || 0;
    return abs >= 1000000 ? `${(num / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M` : abs >= 1000 ? `${(num / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}K` : `${Math.round(num)}`;
  };
  const kpiItems = [
    { label: "Total de leads", value: String(stats?.total || 0), icon: User, color: "text-[var(--violet-500)]", trend: trends?.leads, delta: deltas?.leads },
    { label: "Propostas enviadas", value: String(stats?.proposals || 0), icon: Briefcase, color: "text-[var(--warning)]", trend: trends?.propostas, delta: deltas?.propostas },
    {
      label: "Previsto",
      value: money(stats?.pipeline || 0),
      subtitle: `Previsão MRR: R$${shortBRL(stats?.pipelineMrr || 0)}`,
      icon: TrendingUp,
      color: "text-[var(--success)]",
      trend: trends?.previsto,
      delta: deltas?.previsto,
    },
    { label: "Vendas feitas", value: String(stats?.sales || 0), icon: DollarSign, color: "text-[var(--success)]", trend: trends?.vendas, delta: deltas?.vendas },
    { label: "Vendas perdidas", value: String(stats?.lost || 0), icon: AlertCircle, color: "text-[var(--danger)]", trend: trends?.perdidas, delta: deltas?.perdidas },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="sticky top-16 z-20 flex flex-col gap-4 border-b border-[var(--line-1)] bg-[var(--surface-2)] px-8 pb-4 pt-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">CRM</h1>
          <p className="text-sm text-[var(--ink-3)]">Gestão do funil de vendas e novos negócios</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Responsible Filter */}
          <Select value={responsibleId} onValueChange={setResponsibleId}>
            <SelectTrigger className="w-[200px] h-10 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                <SelectValue placeholder="Responsável" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {collaborators.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Funnel Filter */}
          <Select value={funnelTypeId} onValueChange={setFunnelTypeId}>
            <SelectTrigger className="w-[180px] h-10 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                <SelectValue placeholder="Funil" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funis</SelectItem>
              {funnelTypes.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period Presets */}
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

          {/* Period Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium gap-2 hover:bg-[var(--surface-2)]"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yy")
                  )
                ) : (
                  "Período"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || new Date()}
                selected={{
                  from: dateRange?.from || undefined,
                  to: dateRange?.to || undefined,
                }}
                onSelect={(range: any) => { setPeriodPreset(null); setDateRange(range || { from: undefined, to: undefined }); }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Toggle Converted */}
          <div className="flex items-center gap-2 bg-[var(--surface-1)] px-4 h-10 rounded-full border border-[var(--line-1)]">
            <span className="text-xs font-medium text-[var(--ink-3)]">Mostrar convertidos</span>
            <input 
              type="checkbox" 
              checked={showConverted}
              onChange={(e) => setShowConverted(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--line-1)] text-[var(--violet-500)] focus:ring-[var(--violet-500)]"
            />
          </div>

          {/* Reset Filters */}
          {(responsibleId !== "all" || funnelTypeId !== "all" || showConverted || dateRange.from) && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-[var(--danger)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]"
              onClick={resetFilters}
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button 
            className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 gap-2 font-bold h-10"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiItems.map((kpi) => (
          <MiniKpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} subtitle={(kpi as any).subtitle} trend={kpi.trend} delta={kpi.delta} color={kpi.color} />
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-[var(--violet-500)] animate-spin" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
            {STAGES.map((stage) => (
              <div key={stage.id} className="flex-1 min-w-[300px]">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: STAGE_COLORS[stage.id] || "var(--ink-3)" }}
                    />
                    <h3 className="font-title font-bold text-[var(--ink-1)] text-sm whitespace-nowrap">{stage.label}</h3>
                    <span className="text-xs font-bold text-[var(--ink-3)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--line-1)]">
                      {leads.filter((l: any) => l.funnel_stage === stage.id).length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4 min-h-[500px] bg-[var(--surface-2)]/50 p-2 rounded-xl border border-dashed border-[var(--line-1)]"
                    >
                      {leads
                        .filter((l: any) => l.funnel_stage === stage.id)
                        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                        .map((lead: any, index: number) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "border-[var(--line-1)] shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group bg-[var(--surface-1)]",
                                  lead.converted_at && "opacity-60 grayscale-[0.5]"
                                )}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <CardContent className="p-4 space-y-3">
                                  {lead.converted_at && (
                                    <Badge className="bg-[var(--success)]/10 text-[var(--success)] text-[8px] font-bold border-[var(--success)]/20 rounded-full px-2 mb-1">
                                      CONVERTIDO
                                    </Badge>
                                  )}
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-[var(--ink-1)] leading-tight">{lead.name}</h4>
                                    <Badge className="bg-[var(--surface-2)] text-[var(--violet-500)] text-[8px] uppercase font-bold border-none rounded-full px-2 py-0">
                                      {lead.origin || 'Direto'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-[var(--ink-3)] flex items-center gap-1 font-medium">
                                      <Briefcase className="h-3 w-3" /> {lead.company || 'Empresa não informada'}
                                    </p>
                                    <p className="text-[11px] font-bold text-[var(--violet-500)]">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.recurring_revenue || 0)}
                                    </p>
                                  </div>

                                  {(() => {
                                    const history = lead.lead_stage_history || [];
                                    const currentStageEntry = history
                                      .filter((h: any) => h.stage === lead.funnel_stage && !h.exited_at)
                                      .sort((a: any, b: any) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())[0];
                                    
                                    // Helper function to calculate calendar days difference in America/Sao_Paulo
                                    const getDaysDiff = (dateStr: string) => {
                                      const date = new Date(dateStr);
                                      const now = new Date();
                                      
                                      // Get local dates in Brazil
                                      const getBrazilDate = (d: Date) => {
                                        const formatter = new Intl.DateTimeFormat('en-US', {
                                          timeZone: 'America/Sao_Paulo',
                                          year: 'numeric',
                                          month: 'numeric',
                                          day: 'numeric'
                                        });
                                        const parts = formatter.formatToParts(d);
                                        const dateParts: any = {};
                                        parts.forEach(p => dateParts[p.type] = p.value);
                                        return new Date(dateParts.year, dateParts.month - 1, dateParts.day);
                                      };

                                      const brStart = getBrazilDate(date);
                                      const brEnd = getBrazilDate(now);
                                      
                                      const diffTime = brEnd.getTime() - brStart.getTime();
                                      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                    };

                                    const daysInStage = currentStageEntry?.entered_at ? getDaysDiff(currentStageEntry.entered_at) : 0;
                                    const isAlert = daysInStage > 5;

                                    const daysSinceContact = lead.last_contact_at ? getDaysDiff(lead.last_contact_at) : null;

                                    const nextContactDate = lead.next_contact_at ? new Date(lead.next_contact_at) : null;
                                    const isContactOverdue = nextContactDate ? nextContactDate.getTime() < Date.now() : false;
                                    const contactAttempts = Number(lead.contact_attempts) || 0;

                                    return (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "h-5 text-[9px] font-bold gap-1 px-2 border-[var(--line-1)] rounded-full",
                                            isAlert ? "text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/5" : "text-[var(--ink-3)] bg-[var(--surface-2)]"
                                          )}
                                        >
                                          <Clock className="h-3 w-3" />
                                          {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'}
                                        </Badge>

                                        {contactAttempts > 0 && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "h-5 text-[9px] font-bold gap-1 px-2 rounded-full",
                                              contactAttempts >= 3 ? "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger-tint)]" : "text-[var(--ink-3)] border-[var(--line-1)] bg-[var(--surface-2)]"
                                            )}
                                          >
                                            {contactAttempts}/3 tentativas
                                          </Badge>
                                        )}

                                        {nextContactDate && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "h-5 text-[9px] font-bold gap-1 px-2 rounded-full",
                                              isContactOverdue ? "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger-tint)]" : "text-[var(--violet-500)] border-[var(--violet-500)]/30 bg-[var(--violet-500)]/5"
                                            )}
                                          >
                                            <CalendarIcon className="h-3 w-3" />
                                            {isContactOverdue ? "Atrasado" : "Próximo"}: {formatCalendarDatePtBr(lead.next_contact_at)}
                                          </Badge>
                                        )}

                                        {daysSinceContact !== null && (
                                          <div className="text-[9px] text-[var(--ink-3)] flex items-center gap-1 font-medium italic">
                                            <MessageCircle className="h-2.5 w-2.5" />
                                            Último contato: {daysSinceContact === 0 ? 'hoje' : `há ${daysSinceContact} ${daysSinceContact === 1 ? 'dia' : 'dias'}`}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-2)]">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-5 w-5 rounded-full bg-[var(--violet-500)] flex items-center justify-center text-[8px] text-white font-bold">
                                        {lead.responsible?.full_name?.charAt(0) || '?'}
                                      </div>
                                      <span className="text-[10px] text-[var(--ink-3)]">{lead.responsible?.full_name?.split(' ')[0] || 'Sem resp.'}</span>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 px-2 text-[10px] font-bold text-[var(--violet-500)] hover:bg-[var(--violet-500)]/10 rounded-full gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLeadToConvert(lead);
                                      }}
                                    >
                                      <ArrowRightLeft className="h-3 w-3" /> Converter
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {!isLoading && (
        <>
          <CRMFunnelChart leads={leads} />
          <CRMLeadsTable 
            leads={leads} 
            onEdit={setSelectedLead} 
            onDelete={setLeadToDelete} 
            onConvert={setLeadToConvert}
          />
        </>
      )}
      </div>

      <LeadFormModal
        isOpen={isCreateModalOpen || !!selectedLead} 
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setSelectedLead(null);
          }
        }}
        lead={selectedLead}
      />

      <LeadConversionModal
        lead={leadToConvert}
        isOpen={!!leadToConvert}
        onOpenChange={(open: boolean) => !open && setLeadToConvert(null)}
        onConverted={setOnboardingClient}
      />

      {onboardingClient && (
        <ClientOnboardingModal
          clientId={onboardingClient.clientId}
          clientName={onboardingClient.clientName}
          open={Boolean(onboardingClient)}
          onOpenChange={(open) => !open && setOnboardingClient(null)}
        />
      )}

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead <strong>{leadToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
