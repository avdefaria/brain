import { useState, useEffect } from "react";
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
  User, 
  Building2, 
  Mail, 
  Phone, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLead, deleteLead, STAGES } from "@/lib/leads.functions";
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
  origin: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  funnel_stage: z.string(),
  sales_channels: z.array(z.string()).default([]),
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchNiches = useServerFn(getNiches);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchSalesChannels = useServerFn(getSalesChannels);
  const addSalesChannelFn = useServerFn(addSalesChannel);

  useEffect(() => {
    if (isOpen) {
      fetchNiches().then(setNiches);
      fetchCollaborators().then(setCollaborators);
      fetchSalesChannels().then(setSalesChannelOptions);
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

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      company: null,
      email: null,
      phone: null,
      recurring_revenue: 0,
      one_time_revenue: 0,
      expected_close_date: null,
      responsible_id: null,
      monthly_revenue_range: null,
      niche_id: null,
      origin: null,
      notes: null,
      funnel_stage: "novos_leads",
    }
  });

  useEffect(() => {
    if (lead && isOpen) {
      form.reset({
        name: lead.name || "",
        company: lead.company || null,
        email: lead.email || null,
        phone: lead.phone || null,
        recurring_revenue: Number(lead.recurring_revenue) || 0,
        one_time_revenue: Number(lead.one_time_revenue) || 0,
        expected_close_date: lead.expected_close_date || null,
        responsible_id: lead.responsible_id || null,
        monthly_revenue_range: lead.monthly_revenue_range || null,
        niche_id: lead.niche_id || null,
        origin: lead.origin || null,
        notes: lead.notes || null,
        funnel_stage: lead.funnel_stage || "novos_leads",
      });
    } else if (!lead && isOpen) {
      form.reset({
        name: "",
        company: null,
        email: null,
        phone: null,
        recurring_revenue: 0,
        one_time_revenue: 0,
        expected_close_date: null,
        responsible_id: null,
        monthly_revenue_range: null,
        niche_id: null,
        origin: null,
        notes: null,
        funnel_stage: "novos_leads",
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
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8FA3]" />
                <Input 
                  type="number" 
                  step="0.01" 
                  {...form.register("recurring_revenue", { valueAsNumber: true })} 
                  className="pl-10" 
                  placeholder="0,00" 
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
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea {...form.register("notes")} placeholder="Observações adicionais sobre o lead..." className="min-h-[100px]" />
          </div>

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
