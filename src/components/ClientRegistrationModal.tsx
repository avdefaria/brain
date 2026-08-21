import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
  Building2, 
  UserCircle2, 
  Briefcase, 
  Calendar, 
  FileText, 
  MessageSquare,
  Upload,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IMaskInput } from "react-imask";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MultiSelectSalesChannels } from "./MultiSelectSalesChannels";
import { MultiSelectSquads } from "./MultiSelectSquads";
import { getSalesChannels, addSalesChannel } from "@/lib/sales-channels.functions";
import { getNiches, addNiche } from "@/lib/niches.functions";
import { NicheSelector } from "./NicheSelector";

const clientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cnpj_cpf: z.string().min(1, "Obrigatório"),
  address: z.string().min(1, "Obrigatório"),
  country: z.string().min(1, "Obrigatório"),
  state: z.string().min(1, "Obrigatório"),
  city: z.string().min(1, "Obrigatório"),
  corporate_email: z.string().email("E-mail corporativo inválido"),
  contact_email: z.string().email("E-mail do responsável inválido").optional().or(z.literal("")),
  contact_whatsapp: z.string().min(1, "Obrigatório"),
  squad_ids: z.array(z.string()),
  niche_id: z.string().min(1, "Nicho é obrigatório"),
  contract_type: z.enum(["recurring", "one-off"]),
  sales_channels: z.array(z.string()),
  start_date: z.string().min(1, "Obrigatório"),
  end_date_expected: z.string().min(1, "Obrigatório"),
  scope_details: z.string(),
  extra_comments: z.string(),
  health_score: z.number().min(0).max(100),
  lead_id: z.string().uuid().optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: any;
}

export function ClientRegistrationModal({ open, onOpenChange, onSuccess, initialData }: ClientRegistrationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [availableChannels, setAvailableChannels] = useState<{id: string, name: string}[]>([]);
  const [availableNiches, setAvailableNiches] = useState<{id: string, name: string}[]>([]);

  const [availableSquads, setAvailableSquads] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      try {
        console.log("Iniciando busca de catálogos (Nichos, Canais e Squads)...");
        const [channels, niches, squads] = await Promise.all([
          getSalesChannels(),
          getNiches(),
          supabase.from('squads').select('id, name').order('name')
        ]);
        
        console.log("Canais carregados:", channels.length);
        console.log("Nichos carregados:", niches.length);
        
        setAvailableChannels(channels);
        setAvailableNiches(niches);
        if (squads.data) setAvailableSquads(squads.data);
      } catch (err) {
        console.error("Erro crítico ao carregar catálogos no Modal:", err);
        toast.error("Erro ao carregar opções de Nicho e Canais. Verifique sua conexão.");
      }
    };
    
    fetchData();
  }, [open]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      cnpj_cpf: "",
      address: "",
      country: "Brasil",
      state: "",
      city: "",
      corporate_email: "",
      contact_email: "",
      contact_whatsapp: "",
      squad_ids: [],
      niche_id: "",
      contract_type: "recurring",
      start_date: new Date().toISOString().split('T')[0] || "",
      end_date_expected: "",
      scope_details: "",
      extra_comments: "",
      sales_channels: [],
      health_score: 100,
      lead_id: null,
    }
  });

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name || "",
        cnpj_cpf: initialData.cnpj_cpf || "",
        address: initialData.address || "",
        country: initialData.country || "Brasil",
        state: initialData.state || "",
        city: initialData.city || "",
        corporate_email: initialData.corporate_email || "",
        contact_email: initialData.contact_email || "",
        contact_whatsapp: initialData.contact_whatsapp || "",
        squad_ids: initialData.account_squads?.map((as: any) => as.squad_id) || [],
        niche_id: initialData.niche_id || "",
        contract_type: (initialData.contract_type as any) || "recurring",
        start_date: initialData.start_date || new Date().toISOString().split('T')[0] || "",
        end_date_expected: initialData.end_date_expected || "",
        scope_details: initialData.scope_details || "",
        extra_comments: initialData.extra_comments || "",
        sales_channels: initialData.sales_channels || [],
        health_score: initialData.health_score ?? 100,
        lead_id: initialData.lead_id || null,
      });
    } else if (!initialData && open) {
      form.reset({
        name: "",
        cnpj_cpf: "",
        address: "",
        country: "Brasil",
        state: "",
        city: "",
        corporate_email: "",
        contact_email: "",
        contact_whatsapp: "",
        squad_ids: [],
        niche_id: "",
        contract_type: "recurring",
        start_date: new Date().toISOString().split('T')[0] || "",
        end_date_expected: "",
        scope_details: "",
        extra_comments: "",
        sales_channels: [],
        health_score: 100,
        lead_id: null,
      });
    }
  }, [initialData, open, form]);

  const handleAddNewChannel = async (name: string) => {
    try {
      const newChannel = await addSalesChannel({ data: name });
      setAvailableChannels(prev => [...prev, newChannel]);
      const current = form.getValues("sales_channels") || [];
      if (!current.includes(newChannel.name)) {
        form.setValue("sales_channels", [...current, newChannel.name]);
      }
      toast.success(`Canal "${newChannel.name}" adicionado`);
    } catch (err) {
      toast.error("Erro ao adicionar canal");
    }
  };

  const handleAddNewNiche = async (name: string) => {
    try {
      const newNiche = await addNiche({ data: name });
      setAvailableNiches(prev => [...prev, newNiche]);
      form.setValue("niche_id", newNiche.id);
      toast.success(`Nicho "${newNiche.name}" adicionado`);
    } catch (err) {
      toast.error("Erro ao adicionar nicho");
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      if (acceptedFiles[0].size > 10 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        cnpj_cpf: data.cnpj_cpf,
        address: data.address,
        country: data.country,
        state: data.state,
        city: data.city,
        corporate_email: data.corporate_email,
        contact_whatsapp: data.contact_whatsapp,
        // squad_id is deprecated, we use N:N now
        // squad_id: data.squad_id, 
        niche_id: data.niche_id,
        start_date: data.start_date,
        end_date_expected: data.end_date_expected,
        scope_details: data.scope_details,
        extra_comments: data.extra_comments,
        status: initialData ? initialData.status : 'active',
        risk_level: initialData ? initialData.risk_level : 'low',
        health_score: initialData ? initialData.health_score : 100,
        lead_id: initialData ? initialData.lead_id : null
      };

      let clientId = initialData?.id;

      if (initialData) {
        // Update client
        const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
        if (error) {
          console.error("Error updating client:", error);
          throw new Error(`Erro ao atualizar dados básicos do cliente: ${error.message}`);
        }
      } else {
        // Insert new client
        const { data: newClient, error } = await supabase.from('clients').insert([payload]).select('id').single();
        if (error) {
          console.error("Error inserting client:", error);
          throw new Error(`Erro ao criar cliente: ${error.message}`);
        }
        
        if (!newClient) throw new Error("Erro ao obter ID do novo cliente");
        clientId = newClient.id;
      }

      // Handle sales channels junction table
      if (clientId) {
        // 1. Get channel IDs for the selected names
        const selectedChannelNames = data.sales_channels || [];
        
        if (selectedChannelNames.length > 0) {
          const { data: channels, error: channelsError } = await supabase
            .from('sales_channels' as any)
            .select('id, name')
            .in('name', selectedChannelNames);
            
          if (channelsError) {
            console.error("Error fetching channel IDs:", channelsError);
            throw new Error(`Erro ao buscar IDs dos canais: ${channelsError.message}`);
          }

          const channelIds = (channels as any[]).map(c => c.id);

          // 2. Clear existing relationships if editing
          if (initialData) {
            const { error: deleteError } = await supabase
              .from('client_sales_channels')
              .delete()
              .eq('client_id', clientId);
            
            if (deleteError) {
              console.error("Error clearing existing channels:", deleteError);
            }
          }

          // 3. Insert new relationships
          const junctionData = channelIds.map(channelId => ({
            client_id: clientId,
            sales_channel_id: channelId
          }));

          const { error: junctionError } = await supabase
            .from('client_sales_channels')
            .insert(junctionData);

          if (junctionError) {
            console.error("Error inserting channel relationships:", junctionError);
            throw new Error(`Erro ao vincular canais de venda: ${junctionError.message}`);
          }
        } else if (initialData) {
          // If no channels selected but was editing, clear them
          await supabase.from('client_sales_channels').delete().eq('client_id', clientId);
        }
        }

        // Handle account_squads junction table
        if (clientId) {
          // Find the primary account for this client
          const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id')
            .eq('client_id', clientId)
            .limit(1);
            
          if (accountsError) {
            console.error("Error fetching account for squad link:", accountsError);
          } else if (accounts && accounts.length > 0) {
            const accountId = accounts[0]?.id;
            if (!accountId) throw new Error("ID da conta não encontrado");
            const selectedSquadIds: string[] = data.squad_ids || [];

            // 1. Clear existing relationships
            await supabase
              .from('account_squads')
              .delete()
              .eq('account_id', accountId);

            // 2. Insert new relationships
            if (selectedSquadIds.length > 0) {
              const squadJunctionData = selectedSquadIds.map((sId: string) => ({
                account_id: accountId,
                squad_id: sId
              }));

              const { error: sqJunctionError } = await supabase
                .from('account_squads')
                .insert(squadJunctionData);

              if (sqJunctionError) {
                console.error("Error inserting squad relationships:", sqJunctionError);
                throw new Error(`Erro ao vincular squads: ${sqJunctionError.message}`);
              }
            }
          }
        }

      toast.success(initialData ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      onOpenChange(false);
      form.reset();
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Detailed registration error:", error);
      // Capture literal database error if available
      const dbError = error.details || error.hint || error.message;
      toast.error(`Erro: ${dbError}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] overflow-y-auto p-0 border-[#E4E6F0] dark:border-[#2A2A36] dark:bg-[#1A1A24]">
        <div className="sticky top-0 bg-white dark:bg-[#1A1A24] z-10 px-8 py-6 border-b border-[#E4E6F0] dark:border-[#2A2A36]">
          <DialogTitle className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">
            {initialData?.lead_id ? "Converter Lead em Cliente" : initialData ? "Editar cliente" : "Cadastrar cliente"}
          </DialogTitle>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-8">
          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <Building2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Informações da empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da empresa <span className="text-red-500">*</span></Label>
                <Input id="name" {...form.register("name")} placeholder="Razão social ou nome fantasia" className="bg-white dark:bg-[#1A1A24]" />
                {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CNPJ/CPF <span className="text-red-500">*</span></Label>
                <Controller
                  control={form.control}
                  name="cnpj_cpf"
                  render={({ field }) => (
                    <IMaskInput
                      mask={[{ mask: '000.000.000-00' }, { mask: '00.000.000/0000-00' }]}
                      className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-[#1A1A24] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="00.000.000/0000-00"
                      value={field.value}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
                {form.formState.errors.cnpj_cpf && <p className="text-xs text-red-500">{form.formState.errors.cnpj_cpf.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço completo <span className="text-red-500">*</span></Label>
                <Input id="address" {...form.register("address")} placeholder="Rua, número, complemento, bairro" className="bg-white dark:bg-[#1A1A24]" />
                {form.formState.errors.address && <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select onValueChange={(v) => form.setValue("country", v)} value={form.watch("country")}>
                  <SelectTrigger className="bg-white dark:bg-[#1A1A24]">
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brasil">Brasil</SelectItem>
                    <SelectItem value="Portugal">Portugal</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado/Província <span className="text-red-500">*</span></Label>
                  <Input id="state" {...form.register("state")} placeholder="UF" className="bg-white dark:bg-[#1A1A24]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade <span className="text-red-500">*</span></Label>
                  <Input id="city" {...form.register("city")} placeholder="Cidade" className="bg-white dark:bg-[#1A1A24]" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="corporate_email">Email corporativo <span className="text-red-500">*</span></Label>
                <Input id="corporate_email" type="email" {...form.register("corporate_email")} placeholder="contato@empresa.com.br" className="bg-white dark:bg-[#1A1A24]" />
                {form.formState.errors.corporate_email && <p className="text-xs text-red-500">{form.formState.errors.corporate_email.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Contato do responsável</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email do responsável</Label>
                <Input id="contact_email" type="email" {...form.register("contact_email")} placeholder="email@responsavel.com" className="bg-white dark:bg-[#1A1A24]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_whatsapp">WhatsApp do responsável <span className="text-red-500">*</span></Label>
                <Controller
                  control={form.control}
                  name="contact_whatsapp"
                  render={({ field }) => (
                    <IMaskInput
                      mask="(00) 00000-0000"
                      className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-[#1A1A24] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(11) 99999-9999"
                      value={field.value}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Informações comerciais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Squads vinculados</Label>
                <Controller
                  control={form.control}
                  name="squad_ids"
                  render={({ field }) => (
                    <MultiSelectSquads
                      selectedIds={field.value || []}
                      options={availableSquads}
                      onChange={field.onChange}
                      placeholder="Selecionar squads..."
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Nicho <span className="text-red-500">*</span></Label>
                <Controller
                  control={form.control}
                  name="niche_id"
                  render={({ field }) => (
                    <NicheSelector
                      selectedId={field.value}
                      options={availableNiches}
                      onChange={field.onChange}
                      onAddNiche={handleAddNewNiche}
                      placeholder="Selecionar nicho..."
                    />
                  )}
                />
                {form.formState.errors.niche_id && <p className="text-xs text-red-500">{form.formState.errors.niche_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipo de contrato <span className="text-red-500">*</span></Label>
                <Select onValueChange={(v) => form.setValue("contract_type", v as any)} value={form.watch("contract_type")}>
                  <SelectTrigger className="bg-white dark:bg-[#1A1A24]">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                    <SelectItem value="one-off">Projeto Avulso</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.contract_type && <p className="text-xs text-red-500">{form.formState.errors.contract_type.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Canais de vendas</Label>
                <Controller
                  control={form.control}
                  name="sales_channels"
                  render={({ field }) => (
                    <MultiSelectSalesChannels
                      selected={field.value || []}
                      options={availableChannels}
                      onChange={field.onChange}
                      onAddChannel={handleAddNewChannel}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <Calendar className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Cronograma do projeto</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de início <span className="text-red-500">*</span></Label>
                <Input id="start_date" type="date" {...form.register("start_date")} className="bg-white dark:bg-[#1A1A24]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date_expected">Data de encerramento previsto <span className="text-red-500">*</span></Label>
                <Input id="end_date_expected" type="date" {...form.register("end_date_expected")} className="bg-white dark:bg-[#1A1A24]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Arquivo do contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 transition-colors cursor-pointer",
                  isDragActive ? "border-[#3D4FE8] bg-[#3D4FE8]/5" : "border-[#E4E6F0] dark:border-[#2A2A36] hover:border-[#3D4FE8]/50 bg-white dark:bg-[#1A1A24]"
                )}
              >
                <input {...getInputProps()} />
                <div className="h-12 w-12 rounded-full bg-[#F7F8FC] dark:bg-[#2A2A36] flex items-center justify-center text-[#8A8FA3] shadow-sm mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                {file ? (
                  <div className="flex items-center gap-2 text-[#3D4FE8] font-medium">
                    <CheckCircle className="h-4 w-4" />
                    {file.name}
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[#8A8FA3] hover:text-[#EF4444]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#0E0E16] dark:text-white">Clique para upload ou arraste</p>
                    <p className="text-xs text-[#8A8FA3]">PDF até 10MB</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Observações do contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scope_details">Contratado pelo cliente</Label>
                <Textarea 
                  id="scope_details" 
                  {...form.register("scope_details")} 
                  placeholder="Descreva o que foi contratado..."
                  className="min-h-[100px] bg-white dark:bg-[#1A1A24]"
                />
                <p className="text-[10px] text-[#8A8FA3]">Descreva o que foi contratado e observações relevantes sobre o escopo.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra_comments">Comentários extras</Label>
                <Textarea 
                  id="extra_comments" 
                  {...form.register("extra_comments")} 
                  placeholder="Informações adicionais..."
                  className="min-h-[100px] bg-white dark:bg-[#1A1A24]"
                />
                <p className="text-[10px] text-[#8A8FA3]">Informações adicionais sobre o fechamento e particularidades do cliente.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-8 border-[#E4E6F0] text-[#8A8FA3]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-12 font-bold"
            >
              {initialData ? "Salvar alterações" : "Salvar cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
