import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Trash2,
  Check,
  ChevronsUpDown,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createLead, updateLead, deleteLead, getFunnelTypes, addFunnelType, deleteFunnelType, STAGES } from "@/lib/leads.functions";
import { getNiches } from "@/lib/niches.functions";
import { getCollaborators } from "@/lib/squads.functions";
import { getSalesChannels, addSalesChannel } from "@/lib/sales-channels.functions";
import { MultiSelectSalesChannels } from "./MultiSelectSalesChannels";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

const leadSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  company: z.string().nullable().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  recurring_revenue: z.number(),
  one_time_revenue: z.number(),
  expected_close_date: z.string().nullable().optional(),
  responsible_id: z.string().nullable().optional(),
  monthly_revenue_range: z.string().nullable().optional(),
  niche_id: z.string().nullable().optional(),
  mrr_months: z.number().int().min(1, "Mínimo 1 mês").default(1),
  origin: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  funnel_stage: z.string(),
  sales_channels: z.array(z.string()),
  funnel_type_id: z.string().nullable().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: any;
}

export function LeadFormModal({ isOpen, onOpenChange, lead }: LeadFormModalProps) {
  const queryClient = useQueryClient();
  const createLeadFn = useServerFn(createLead);
  const updateLeadFn = useServerFn(updateLead);
  const deleteLeadFn = useServerFn(deleteLead);
  
  const [niches, setNiches] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [salesChannelOptions, setSalesChannelOptions] = useState<any[]>([]);
  const [funnelTypes, setFunnelTypes] = useState<any[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFunnelPopoverOpen, setIsFunnelPopoverOpen] = useState(false);
  const [funnelSearch, setFunnelSearch] = useState("");

  const fetchNiches = useServerFn(getNiches);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchSalesChannels = useServerFn(getSalesChannels);
  const fetchFunnelTypes = useServerFn(getFunnelTypes);
  const addSalesChannelFn = useServerFn(addSalesChannel);
  const addFunnelTypeFn = useServerFn(addFunnelType);
  const deleteFunnelTypeFn = useServerFn(deleteFunnelType);
  const [funnelToDelete, setFunnelToDelete] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNiches().then(setNiches);
      fetchCollaborators().then(setCollaborators);
      fetchSalesChannels().then(setSalesChannelOptions);
      fetchFunnelTypes().then(setFunnelTypes);
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!lead?.id) return;
    try {
      await deleteLeadFn({ data: lead.id });
      toast.success("Lead excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao excluir lead");
    }
  };

  const handleAddSalesChannel = async (name: string) => {
    try {
      const newChannel = await addSalesChannelFn({ data: name });
      setSalesChannelOptions(prev => [...prev, newChannel]);
      const current = form.getValues("sales_channels");
      form.setValue("sales_channels", [...current, newChannel.name]);
      toast.success("Canal adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar canal");
    }
  };

  const handleCreateFunnelType = async (name: string) => {
    if (!name.trim()) return;
    try {
      const newFunnel = await addFunnelTypeFn({ data: name.trim() }) as any;
      setFunnelTypes(prev => [...prev, newFunnel].sort((a, b) => a.name.localeCompare(b.name)));
      form.setValue("funnel_type_id", newFunnel.id);
      setIsFunnelPopoverOpen(false);
      setFunnelSearch("");
      toast.success("Tipo de funil criado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar tipo de funil");
    }
  };

  const handleDeleteFunnelType = async (id: string) => {
    try {
      await deleteFunnelTypeFn({ data: id });
      setFunnelTypes(prev => prev.filter(f => f.id !== id));
      if (form.getValues("funnel_type_id") === id) {
        form.setValue("funnel_type_id", null);
      }
      queryClient.invalidateQueries({ queryKey: ["funnel-types"] });
      toast.success("Tipo de funil excluído!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir tipo de funil");
    } finally {
      setFunnelToDelete(null);
    }
  };

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema as any),
    defaultValues: {
      name: "",
      company: null,
      email: null,
      phone: null,
      recurring_revenue: 0,
      mrr_months: 1,
      one_time_revenue: 0,
      expected_close_date: null,
      responsible_id: null,
      monthly_revenue_range: null,
      niche_id: null,
      origin: null,
      notes: null,
      funnel_stage: "novos_leads",
      sales_channels: [],
      funnel_type_id: null,
    }
  });

  useEffect(() => {
    if (lead && isOpen) {
      const channels = lead.lead_sales_channels?.map((lsc: any) => lsc.sales_channels?.name).filter(Boolean) || [];
      
      form.reset({
        name: lead.name || "",
        company: lead.company || null,
        email: lead.email || null,
        phone: lead.phone || null,
        recurring_revenue: Number(lead.recurring_revenue) || 0,
        mrr_months: Number(lead.mrr_months) || 1,
        one_time_revenue: Number(lead.one_time_revenue) || 0,
        expected_close_date: lead.expected_close_date || null,
        responsible_id: lead.responsible_id || null,
        monthly_revenue_range: lead.monthly_revenue_range || null,
        niche_id: lead.niche_id || null,
        origin: lead.origin || null,
        notes: lead.notes || null,
        funnel_stage: lead.funnel_stage || "novos_leads",
        sales_channels: channels,
        funnel_type_id: lead.funnel_type_id || null,
      });
    } else if (!lead && isOpen) {
      form.reset({
        name: "",
        company: null,
        email: null,
        phone: null,
        recurring_revenue: 0,
        mrr_months: 1,
        one_time_revenue: 0,
        expected_close_date: null,
        responsible_id: null,
        monthly_revenue_range: null,
        niche_id: null,
        origin: null,
        notes: null,
        funnel_stage: "novos_leads",
        sales_channels: [],
        funnel_type_id: null,
      });
    }
  }, [lead, isOpen, form]);

  const onSubmit = async (data: LeadFormValues) => {
    try {
      if (lead) {
        await updateLeadFn({ data: { id: lead.id, ...data } });
        toast.success("Lead atualizado com sucesso!");
      } else {
        await createLeadFn({ data });
        toast.success("Lead criado com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar lead");
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-title font-bold flex items-center justify-between">
            <span>{lead ? "Editar Lead" : "Novo Lead"}</span>
            {lead && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#8A8FA3] hover:text-red-500 mr-8"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do contato *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input {...form.register("name")} className="pl-10" placeholder="Nome completo" />
              </div>
              {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input {...form.register("company")} className="pl-10" placeholder="Nome da empresa" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input {...form.register("email")} className="pl-10" placeholder="email@exemplo.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input {...form.register("phone")} className="pl-10" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receita Recorrente (MRR)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...form.register("recurring_revenue", { valueAsNumber: true })} 
                    className="pl-10" 
                    placeholder="0,00" 
                  />
                </div>
                <div className="relative">
                  <Input 
                    type="number"
                    {...form.register("mrr_months", { valueAsNumber: true })}
                    placeholder="Meses"
                    title="Qtd. de Meses"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receita Total Recorrente (Estimada)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input 
                  readOnly
                  disabled
                  value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((form.watch("recurring_revenue") || 0) * (form.watch("mrr_months") || 0))}
                  className="pl-10 bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receita Única</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input 
                  type="number" 
                  step="0.01" 
                  {...form.register("one_time_revenue", { valueAsNumber: true })} 
                  className="pl-10" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expectativa de Fechamento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input type="date" {...form.register("expected_close_date")} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select 
                onValueChange={(v) => form.setValue("responsible_id", v)} 
                value={form.watch("responsible_id") || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nicho</Label>
              <Select 
                onValueChange={(v) => form.setValue("niche_id", v)} 
                value={form.watch("niche_id") || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um nicho" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label>Canais de Vendas</Label>
              <MultiSelectSalesChannels
                selected={form.watch("sales_channels") || []}
                options={salesChannelOptions}
                onChange={(selected) => form.setValue("sales_channels", selected)}
                onAddChannel={handleAddSalesChannel}
              />
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Input {...form.register("origin")} placeholder="Ex: Indicação, Google Ads, LinkedIn" />
            </div>

            <div className="space-y-2">
              <Label>Etapa do Funil</Label>
              <Select 
                onValueChange={(v) => form.setValue("funnel_stage", v)} 
                value={form.watch("funnel_stage")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Funil</Label>
              <Popover open={isFunnelPopoverOpen} onOpenChange={setIsFunnelPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isFunnelPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {form.watch("funnel_type_id")
                      ? funnelTypes.find((f) => f.id === form.watch("funnel_type_id"))?.name
                      : "Selecione o tipo de funil"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Pesquisar tipo..." 
                      value={funnelSearch}
                      onValueChange={setFunnelSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum tipo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {funnelTypes.map((f) => (
                          <CommandItem
                            key={f.id}
                            value={f.name}
                            onSelect={() => {
                              form.setValue("funnel_type_id", f.id);
                              setIsFunnelPopoverOpen(false);
                              setFunnelSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("funnel_type_id") === f.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {f.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {funnelSearch && !funnelTypes.some(f => f.name.toLowerCase() === funnelSearch.toLowerCase()) && (
                        <CommandGroup className="border-t border-[#E4E6F0]">
                          <CommandItem
                            onSelect={() => handleCreateFunnelType(funnelSearch)}
                            className="text-[#3D4FE8] font-medium"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Criar "{funnelSearch}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea {...form.register("notes")} placeholder="Observações adicionais sobre o lead..." className="min-h-[100px]" />
          </div>

          {lead && (
            <div className="space-y-4 pt-4 border-t border-[#E4E6F0]">
              <h3 className="font-title font-bold text-lg text-[#0E0E16]">Histórico de Estágios</h3>
              <div className="space-y-3">
                {(() => {
                  const history = Array.isArray(lead.lead_stage_history) 
                    ? [...lead.lead_stage_history].sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())
                    : [];

                  if (history.length === 0) {
                    return <p className="text-sm text-[#8A8FA3] italic text-center py-4">Nenhum histórico registrado.</p>;
                  }

                  return (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E4E6F0]">
                      {history.map((h: any, idx: number) => {
                        const entered = new Date(h.entered_at);
                        const exited = h.exited_at ? new Date(h.exited_at) : new Date();
                        const diffMs = exited.getTime() - entered.getTime();
                        
                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                        let timeDisplay = "";
                        if (days > 0) timeDisplay = `${days}d ${hours}h`;
                        else if (hours > 0) timeDisplay = `${hours}h ${minutes}m`;
                        else timeDisplay = `${minutes}m`;

                        const stageLabel = STAGES.find(s => s.id === h.stage)?.label || h.stage;

                        return (
                          <div key={h.id || idx} className="relative">
                            <div className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${h.exited_at ? 'bg-[#8A8FA3]' : 'bg-[#3D4FE8]'}`} />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <p className={`text-sm font-semibold ${h.exited_at ? 'text-[#8A8FA3]' : 'text-[#3D4FE8]'}`}>
                                  {stageLabel}
                                </p>
                                <p className="text-xs text-[#8A8FA3]">
                                  Entrou em {entered.toLocaleDateString('pt-BR')} às {entered.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${h.exited_at ? 'bg-slate-100 text-[#8A8FA3]' : 'bg-indigo-50 text-[#3D4FE8]'}`}>
                                  {h.exited_at ? timeDisplay : 'Em andamento'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90">
              {lead ? "Salvar Alterações" : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Confirmar exclusão</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-[#8A8FA3]">
            Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-full">
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
