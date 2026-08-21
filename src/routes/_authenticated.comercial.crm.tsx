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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { cn } from "@/lib/utils";
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getLeads, getLeadStats, updateLeadPosition, getFunnelTypes, STAGES, deleteLead } from "@/lib/leads.functions";
import { getCollaborators } from "@/lib/squads.functions";
import { LeadFormModal } from "@/components/LeadFormModal";
import { LeadConversionModal } from "@/components/LeadConversionModal";
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

function CRMPage() {
  const queryClient = useQueryClient();
  const fetchLeads = useServerFn(getLeads);
  const fetchStats = useServerFn(getLeadStats);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchFunnelTypes = useServerFn(getFunnelTypes);
  const updatePosition = useServerFn(updateLeadPosition);

  // Filter states
  const [responsibleId, setResponsibleId] = useState<string>("all");
  const [funnelTypeId, setFunnelTypeId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const filterParams = useMemo(() => ({
    responsible_id: responsibleId === "all" ? null : responsibleId,
    funnel_type_id: funnelTypeId === "all" ? null : funnelTypeId,
    startDate: dateRange?.from?.toISOString() || null,
    endDate: dateRange?.to?.toISOString() || null
  }), [responsibleId, funnelTypeId, dateRange]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filterParams],
    queryFn: () => fetchLeads({ data: filterParams }),
  });

  const { data: stats } = useQuery({
    queryKey: ["lead-stats", filterParams],
    queryFn: () => fetchStats({ data: filterParams }),
  });

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
    setDateRange({ from: undefined, to: undefined });
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [leadToConvert, setLeadToConvert] = useState<any>(null);

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

  const kpiItems = [
    { label: "Total de leads", value: stats?.total || 0, icon: User, color: "text-[#3D4FE8]" },
    { label: "Propostas enviadas", value: stats?.proposals || 0, icon: Briefcase, color: "text-[#F5A524]" },
    { 
      label: "Pipeline", 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.pipeline || 0), 
      icon: TrendingUp, 
      color: "text-[#22C55E]" 
    },
    { label: "Vendas feitas", value: stats?.sales || 0, icon: DollarSign, color: "text-[#22C55E]" },
    { label: "Vendas perdidas", value: stats?.lost || 0, icon: AlertCircle, color: "text-[#EF4444]" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">CRM</h1>
          <p className="text-sm text-[#8A8FA3]">Gestão do funil de vendas e novos negócios</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Responsible Filter */}
          <Select value={responsibleId} onValueChange={setResponsibleId}>
            <SelectTrigger className="w-[200px] h-10 rounded-full border-[#E4E6F0] bg-white text-xs font-medium">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#8A8FA3]" />
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
            <SelectTrigger className="w-[180px] h-10 rounded-full border-[#E4E6F0] bg-white text-xs font-medium">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-[#8A8FA3]" />
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

          {/* Period Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-10 px-4 rounded-full border-[#E4E6F0] bg-white text-xs font-medium gap-2 hover:bg-[#F7F8FC]"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-[#8A8FA3]" />
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
                onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Reset Filters */}
          {(responsibleId !== "all" || funnelTypeId !== "all" || dateRange.from) && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 w-10 rounded-full text-[#EF4444] hover:bg-red-50 hover:text-[#EF4444]"
              onClick={resetFilters}
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button 
            className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 gap-2 font-bold h-10"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiItems.map((kpi) => (
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("h-10 w-10 bg-white border border-[#E4E6F0] rounded-2xl flex items-center justify-center shadow-sm", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8A8FA3] tracking-widest">{kpi.label}</p>
                <h3 className="text-lg font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-[#3D4FE8] animate-spin" />
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
                      style={{ backgroundColor: STAGE_COLORS[stage.id] || "#8A8FA3" }}
                    />
                    <h3 className="font-title font-bold text-[#0E0E16] text-sm whitespace-nowrap">{stage.label}</h3>
                    <span className="text-xs font-bold text-[#8A8FA3] bg-[#F7F8FC] px-2 py-0.5 rounded-full border border-[#E4E6F0]">
                      {leads.filter((l: any) => l.funnel_stage === stage.id).length}

                    </span>
                  </div>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4 min-h-[500px] bg-[#F7F8FC]/50 p-2 rounded-xl border border-dashed border-[#E4E6F0]"
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
                                className="border-[#E4E6F0] shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group bg-white"
                                onClick={() => setSelectedLead(lead)}
                              >
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-[#0E0E16] leading-tight">{lead.name}</h4>
                                    <Badge className="bg-[#F7F8FC] text-[#3D4FE8] text-[8px] uppercase font-bold border-none rounded-full px-2 py-0">
                                      {lead.origin || 'Direto'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-[#8A8FA3] flex items-center gap-1 font-medium">
                                      <Briefcase className="h-3 w-3" /> {lead.company || 'Empresa não informada'}
                                    </p>
                                    <p className="text-[11px] font-bold text-[#3D4FE8]">
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

                                    return (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "h-5 text-[9px] font-bold gap-1 px-2 border-[#E4E6F0] rounded-full",
                                            isAlert ? "text-[#F5A524] border-[#F5A524]/30 bg-[#F5A524]/5" : "text-[#8A8FA3] bg-[#F7F8FC]"
                                          )}
                                        >
                                          <Clock className="h-3 w-3" />
                                          {daysInStage} {daysInStage === 1 ? 'dia' : 'dias'}
                                        </Badge>

                                        {daysSinceContact !== null && (
                                          <div className="text-[9px] text-[#8A8FA3] flex items-center gap-1 font-medium italic">
                                            <MessageCircle className="h-2.5 w-2.5" />
                                            Último contato: {daysSinceContact === 0 ? 'hoje' : `há ${daysSinceContact} ${daysSinceContact === 1 ? 'dia' : 'dias'}`}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  <div className="flex items-center justify-between pt-3 border-t border-[#F7F8FC]">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-5 w-5 rounded-full bg-[#3D4FE8] flex items-center justify-center text-[8px] text-white font-bold">
                                        {lead.responsible?.full_name?.charAt(0) || '?'}
                                      </div>
                                      <span className="text-[10px] text-[#8A8FA3]">{lead.responsible?.full_name?.split(' ')[0] || 'Sem resp.'}</span>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 px-2 text-[10px] font-bold text-[#3D4FE8] hover:bg-[#3D4FE8]/10 rounded-full gap-1"
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
      />

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
              className="bg-[#EF4444] hover:bg-[#EF4444]/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
