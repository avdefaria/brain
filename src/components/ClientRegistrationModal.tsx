import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
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
  account_name: z.string().optional().or(z.literal("")),
  cnpj_cpf: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  country: z.string().min(1, "Obrigatório"),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  corporate_email: z.string().email("E-mail corporativo inválido").optional().or(z.literal("")),
  contact_email: z.string().email("E-mail do responsável inválido").optional().or(z.literal("")),
  contact_whatsapp: z.string().optional().or(z.literal("")),
  squad_ids: z.array(z.string()),
  niche_id: z.string().min(1, "Nicho é obrigatório"),
  contract_type: z.enum(["recurring", "one-off"]),
  sales_channels: z.array(z.string()),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date_expected: z.string().optional().or(z.literal("")),
  scope_details: z.string(),
  extra_comments: z.string(),
  health_score: z.number().min(0).max(100),
  lead_id: z.string().uuid().optional().nullable(),
  monthly_value: z.number().optional().nullable(),
  mrr_months: z.number().min(1, "Meses de MRR é obrigatório").optional().nullable(),
  payment_method: z.string().optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result?: { clientId: string; isNewClient: boolean; fromLead: boolean }) => void;
  initialData?: any;
}

export function ClientRegistrationModal({ open, onOpenChange, onSuccess, initialData }: ClientRegistrationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<{id: string, name: string}[]>([]);
  const [availableNiches, setAvailableNiches] = useState<{id: string, name: string}[]>([]);

  const [availableSquads, setAvailableSquads] = useState<{id: string, name: string}[]>([]);
  const [matchedClient, setMatchedClient] = useState<{ id: string; name: string } | null>(null);

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

  // Só faz sentido detectar "mesmo CNPJ" ao cadastrar/converter (não ao editar
  // um cliente que já é o próprio registro).
  const isEditingExistingClient = !!initialData?.id;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: initialData?.name || "",
      account_name: initialData?.account_name || initialData?.accounts?.[0]?.account_name || "",
      cnpj_cpf: initialData?.cnpj_cpf || "",
      address: initialData?.address || "",
      country: initialData?.country || "Brasil",
      state: initialData?.state || "",
      city: initialData?.city || "",
      corporate_email: initialData?.corporate_email || "",
      contact_email: initialData?.contact_email || "",
      contact_whatsapp: initialData?.contact_whatsapp || "",
      squad_ids: initialData?.account_squads?.map((as: any) => as.squad_id) || [],
      niche_id: initialData?.niche_id || (initialData?.niches?.id) || "",
      contract_type: initialData?.contracts?.[0]?.type === 'one-off' ? 'one-off' : 'recurring',
      start_date: initialData?.start_date || new Date().toISOString().split('T')[0] || "",
      end_date_expected: initialData?.end_date_expected || "",
      scope_details: initialData?.scope_details || "",
      extra_comments: initialData?.extra_comments || "",
      sales_channels: initialData?.client_sales_channels?.map((csc: any) => csc.sales_channels?.name).filter(Boolean) || [],
      health_score: initialData?.health_score ?? 100,
      lead_id: initialData?.lead_id || null,
      monthly_value: initialData?.contracts?.[0]?.monthly_value || 0,
      mrr_months: initialData?.contracts?.[0]?.mrr_months || 12,
      payment_method: initialData?.contracts?.[0]?.payment_method || "Pix",
    }
  });

  // Detecção automática de CNPJ já cadastrado (cria conta nova em vez de
  // duplicar cliente). Só roda ao cadastrar/converter, nunca ao editar.
  const watchedCnpj = form.watch("cnpj_cpf");

  useEffect(() => {
    if (isEditingExistingClient || !open) {
      setMatchedClient(null);
      return;
    }
    const digits = (watchedCnpj || "").replace(/\D/g, "");
    if (digits.length < 11) {
      setMatchedClient(null);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data: found } = await supabase
        .from('clients')
        .select('id, name')
        .eq('cnpj_cpf', watchedCnpj)
        .maybeSingle();
      setMatchedClient(found ? { id: (found as any).id, name: (found as any).name } : null);
    }, 500);

    return () => clearTimeout(timeout);
  }, [watchedCnpj, isEditingExistingClient, open]);

  useEffect(() => {
    if (initialData && open) {
      console.log("Resetting form with initialData:", initialData);
      form.reset({
        name: initialData.name || "",
        account_name: initialData.account_name || initialData.accounts?.[0]?.account_name || "",
        cnpj_cpf: initialData.cnpj_cpf || "",
        address: initialData.address || "",
        country: initialData.country || "Brasil",
        state: initialData.state || "",
        city: initialData.city || "",
        corporate_email: initialData.corporate_email || "",
        contact_email: initialData.contact_email || "",
        contact_whatsapp: initialData.contact_whatsapp || "",
        squad_ids: initialData.squad_ids || initialData.account_squads?.map((as: any) => as.squad_id) || [],
        niche_id: initialData.niche_id || initialData.niches?.id || "",
        contract_type: (initialData.contracts?.[0]?.type as any) || "recurring",
        start_date: initialData.start_date || new Date().toISOString().split('T')[0] || "",
        end_date_expected: initialData.end_date_expected || "",
        scope_details: initialData.scope_details || "",
        extra_comments: initialData.extra_comments || "",
        sales_channels: initialData.sales_channels || initialData.client_sales_channels?.map((csc: any) => csc.sales_channels?.name).filter(Boolean) || [],
        health_score: initialData.health_score ?? 100,
        lead_id: initialData.lead_id || (initialData.id ? null : initialData.lead_id) || null,
        monthly_value: initialData.monthly_value || initialData.contracts?.[0]?.monthly_value || 0,
        mrr_months: initialData.mrr_months || initialData.contracts?.[0]?.mrr_months || 12,
        payment_method: initialData.payment_method || initialData.contracts?.[0]?.payment_method || "Pix",
      });
    } else if (!initialData && open) {
      form.reset({
        name: "",
        account_name: "",
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
        monthly_value: 0,
        mrr_months: 12,
        payment_method: "Pix",
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
    setIsSubmitting(true);
    try {
      const cleanUuid = (val: any) => {
        if (!val || val === "undefined" || val === "") return null;
        return val;
      };

      const payload = {
        name: data.name,
        cnpj_cpf: data.cnpj_cpf,
        address: data.address,
        country: data.country,
        state: data.state,
        city: data.city,
        corporate_email: data.corporate_email,
        contact_whatsapp: data.contact_whatsapp,
        niche_id: cleanUuid(data.niche_id),
        start_date: data.start_date,
        end_date_expected: data.end_date_expected || null,
        scope_details: data.scope_details,
        extra_comments: data.extra_comments,
        status: initialData?.id ? initialData.status : 'onboarding',
        risk_level: initialData?.id ? initialData.risk_level : 'low',
        health_score: initialData?.id ? initialData.health_score : 100,
        lead_id: cleanUuid(data.lead_id || initialData?.lead_id)
      };

      let clientId = initialData?.id;
      // Quando reaproveitamos um cliente já existente (mesmo lead reconvertido,
      // ou mesmo CNPJ de outro registro), não sobrescrevemos os dados dele —
      // só a conta nova é criada por baixo.
      let skipClientWrite = false;

      const conversionLeadId = cleanUuid(data.lead_id);
      if (conversionLeadId && !initialData?.id) {
        const { data: existingClient } = await supabase.from('clients').select('id').eq('lead_id', conversionLeadId).limit(1).maybeSingle();
        if (existingClient?.id) {
          toast.info("Este lead já foi convertido anteriormente. Atualizando o cliente existente.");
          clientId = (existingClient as any).id;
        }
      }

      if (!clientId && !initialData?.id && matchedClient?.id) {
        clientId = matchedClient.id;
        skipClientWrite = true;
      }

      // Se temos initialData.id (ou reaproveitamos o cliente já convertido do lead_id), é uma edição/atualização.
      // Se não temos id, é uma criação. Se reaproveitamos por CNPJ, não escrevemos no cliente.
      if (clientId && !skipClientWrite) {
        const { error } = await supabase.from('clients').update(payload).eq('id', clientId);
        if (error) {
          console.error("Error updating client:", error);
          throw new Error(`Erro ao atualizar dados básicos do cliente: ${error.message}`);
        }
      } else if (!clientId) {
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

        // Resolve a conta operacional desta operação. Editando um cliente já
        // existente, reaproveita a primeira conta encontrada (comportamento
        // antigo). Num cadastro/conversão novo (inclusive quando reaproveitamos
        // um cliente pelo mesmo CNPJ), sempre cria uma conta nova — cada lead
        // fechado é uma conta distinta, mesmo quando o CNPJ já existe.
        let accountId: string | undefined;
        if (isEditingExistingClient) {
          const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id')
            .eq('client_id', clientId)
            .limit(1);
          if (accountsError) {
            console.error("Error fetching account:", accountsError);
            throw new Error(`Erro ao buscar conta operacional: ${accountsError.message}`);
          }
          if (accounts && accounts.length > 0) {
            accountId = (accounts[0] as any).id;
            await supabase.from('accounts').update({ account_name: data.account_name || data.name } as any).eq('id', accountId);
          }
        }
        if (!accountId) {
          const { data: newAccount, error: newAccountError } = await supabase
            .from('accounts')
            .insert({ client_id: clientId, account_name: data.account_name || data.name, status: 'active' } as any)
            .select('id')
            .single();
          if (newAccountError) {
            console.error("Error creating account:", newAccountError);
            throw new Error(`Falha ao criar conta operacional: ${newAccountError.message}`);
          }
          accountId = (newAccount as any)?.id;
        }
        if (!accountId) throw new Error("Falha ao resolver conta operacional: ID não retornado.");

        // Handle account_squads junction table
        {
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

        // Mark lead as converted if this was a conversion
        if (data.lead_id) {
          console.log("Marking lead as converted:", data.lead_id);
          
          // 1. Update lead record
          const { error: leadUpdateError } = await supabase
            .from('leads')
            .update({ converted_at: new Date().toISOString() })
            .eq('id', data.lead_id);
          
          if (leadUpdateError) {
            console.error("Error updating lead converted_at:", leadUpdateError);
          }

          // 2. Register stage history final entry
          // First close previous
          await supabase
            .from('lead_stage_history' as any)
            .update({ exited_at: new Date().toISOString() } as any)
            .eq('lead_id', data.lead_id)
            .is('exited_at', null);

          // Then insert new "Converted" stage
          await supabase
            .from('lead_stage_history' as any)
            .insert({
              lead_id: data.lead_id,
              stage: 'Convertido em Cliente',
              entered_at: new Date().toISOString()
            } as any);
        }

        // 4. Create or update contract record with financial data
        let financialError: string | null = null;
        try {
        if (clientId && accountId) {
          const startDateStr0 = (data.start_date || new Date().toISOString().split('T')[0]) as string;
          const computeRenewalDate = (startStr: string, months: number) => {
            const d = new Date(startStr + (startStr.includes('T') ? '' : 'T00:00:00'));
            d.setMonth(d.getMonth() + (months || 1));
            return d.toISOString().split('T')[0];
          };
          const contractData: any = {
              client_id: clientId,
              account_id: accountId,
              type: data.contract_type,
              monthly_value: data.monthly_value || 0,
              start_date: data.start_date || new Date().toISOString(),
              mrr_months: data.contract_type === 'recurring' ? data.mrr_months : null,
              payment_method: data.payment_method,
              status: 'active'
            };
            if (data.contract_type === 'recurring') {
              contractData.renewal_date = computeRenewalDate(startDateStr0, data.mrr_months || 1);
            }

            // Contrato é por conta, não por cliente — assim, duas contas do
            // mesmo cliente (mesmo CNPJ) não disputam/sobrescrevem o mesmo contrato.
            const { data: existingContracts, error: findContractError } = await supabase.from('contracts').select('id, renewal_date').eq('account_id', accountId).limit(1);

            let contractId;
            if (findContractError) {
              console.error("Error finding contract:", findContractError);
              throw new Error(`Falha ao buscar contrato: ${findContractError.message}`);
            } else if (existingContracts && existingContracts.length > 0) {
              contractId = (existingContracts[0] as any).id;
              // Não sobrescreve renewal_date se já existe um valor — pode já ter
              // avançado por renovação automática, não é pra "resetar" ao editar.
              if ((existingContracts[0] as any).renewal_date) {
                delete contractData.renewal_date;
              }
              const { error: updateContractError } = await supabase.from('contracts').update(contractData as any).eq('id', contractId);
              if (updateContractError) {
                console.error("Error updating contract:", updateContractError);
                throw new Error(`Falha ao atualizar contrato: ${updateContractError.message}`);
              }
              // Recebíveis já gerados (parcelas ainda não pagas) precisam refletir
              // o novo valor do contrato — senão ficam presos no valor antigo pra
              // sempre, já que só são gerados uma vez (na criação do contrato).
              const { error: syncReceivablesError } = await supabase
                .from('receivables')
                .update({ amount: contractData.monthly_value } as any)
                .eq('contract_id', contractId)
                .eq('status', 'pendente');
              if (syncReceivablesError) {
                console.error("Error syncing receivables amount:", syncReceivablesError);
                throw new Error(`Falha ao atualizar valor dos recebíveis: ${syncReceivablesError.message}`);
              }
            } else {
              const { data: newContract, error: newContractError } = await supabase.from('contracts').insert([contractData] as any).select('id').single();
              if (newContractError) {
                console.error("Error creating contract:", newContractError);
                throw new Error(`Falha ao criar contrato: ${newContractError.message}`);
              } else {
                contractId = newContract?.id;
              }
              if (!contractId) {
                throw new Error("Falha ao criar contrato: ID não retornado.");
              }
            }

            // Generate receivables if new or no receivables exist
            if (!contractId) {
              throw new Error("Falha ao gerar recebíveis: contrato sem ID.");
            }
            const { count, error: countError } = await supabase
              .from('receivables')
              .select('*', { count: 'exact', head: true })
              .eq('contract_id', contractId);

            if (countError) {
              console.error("Error counting receivables:", countError);
              throw new Error(`Falha ao verificar recebíveis: ${countError.message}`);
            }

            if (count === 0) {
                const receivables: any[] = [];
                const startDateStr = data.start_date || new Date().toISOString().split('T')[0];

                if (data.contract_type === 'recurring') {
                  const months = data.mrr_months || 1;
                  for (let i = 0; i < months; i++) {
                    const dueDate = new Date(startDateStr + 'T00:00:00');
                    dueDate.setMonth(dueDate.getMonth() + i);

                    receivables.push({
                      client_id: clientId,
                      contract_id: contractId,
                      amount: data.monthly_value || 0,
                      due_date: dueDate.toISOString().split('T')[0],
                      installment_number: i + 1,
                      status: 'pendente',
                      payment_method: data.payment_method
                    });
                  }
                } else {
                  receivables.push({
                    client_id: clientId,
                    contract_id: contractId,
                    amount: data.monthly_value || 0,
                    due_date: startDateStr,
                    installment_number: null,
                    status: 'pendente',
                    payment_method: data.payment_method
                  });
                }

                if (receivables.length > 0) {
                  const { error: recError } = await supabase.from('receivables').insert(receivables);
                  if (recError) {
                    console.error("Error generating receivables:", recError);
                    throw new Error(`Falha ao criar recebíveis: ${recError.message}`);
                  }
                }
            }
        }
        } catch (err: any) {
          console.error("Financial block error:", err);
          financialError =
            err?.message || "Erro desconhecido ao criar contrato/recebíveis.";
        }

        if (financialError) {
          toast.error(
            `Lead convertido, mas houve um problema ao criar o contrato/recebíveis: ${financialError} Contate o suporte ou tente novamente.`
          );
        } else if (skipClientWrite) {
          toast.success(`Nova conta criada em ${matchedClient?.name}!`);
        } else {
          toast.success(initialData?.id ? "Cliente atualizado com sucesso!" : initialData?.lead_id ? "Lead convertido em cliente com sucesso!" : "Cliente cadastrado com sucesso!");
        }
      }
      onOpenChange(false);
      form.reset();
      setFile(null);
      setMatchedClient(null);
      if (onSuccess) {
        onSuccess({
          clientId: clientId as string,
          isNewClient: !initialData?.id,
          fromLead: !initialData?.id && Boolean(initialData?.lead_id),
        });
      }
    } catch (error: any) {
      console.error("Detailed registration error:", error);
      // Capture literal database error if available
      const dbError = error.details || error.hint || error.message;
      toast.error(`Erro: ${dbError}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] overflow-y-auto p-0 border-[var(--line-1)]">
        <div className="sticky top-0 bg-[var(--surface-1)] z-10 px-8 py-6 border-b border-[var(--line-1)]">
          <DialogTitle className="text-2xl font-title font-bold text-[var(--ink-1)]">
            {initialData?.lead_id && !initialData?.id ? "Converter Lead em Cliente" : initialData?.id ? "Editar Cliente" : "Cadastrar Cliente"}
          </DialogTitle>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-8">
          {initialData?._warning_both_revenues && (
            <Alert className="bg-[var(--warning-tint)] border-[var(--warning)]/30 text-[var(--warning)]">
              <InfoIcon className="h-4 w-4 text-[var(--warning)]" />
              <AlertDescription className="text-xs font-medium">
                Este lead possui Receita Única de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData._warning_both_revenues)} que não foi mapeada automaticamente. Caso deseje, registre-a separadamente ou adicione nos detalhes do escopo abaixo.
              </AlertDescription>
            </Alert>
          )}
          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
                <Building2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Informações da empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da empresa <span className="text-[var(--danger)]">*</span></Label>
                <Input id="name" {...form.register("name")} placeholder="Razão social ou nome fantasia" className="bg-[var(--surface-1)]" />
                {form.formState.errors.name && <p className="text-xs text-[var(--danger)]">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CNPJ/CPF</Label>
                <Controller
                  control={form.control}
                  name="cnpj_cpf"
                  render={({ field }) => (
                    <IMaskInput
                      mask={[{ mask: '000.000.000-00' }, { mask: '00.000.000/0000-00' }]}
                      className="flex h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="00.000.000/0000-00"
                      value={field.value || ""}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
                {form.formState.errors.cnpj_cpf && <p className="text-xs text-[var(--danger)]">{form.formState.errors.cnpj_cpf.message}</p>}
              </div>

              {matchedClient && (
                <div className="md:col-span-2">
                  <Alert className="bg-[var(--info-tint)] border-[var(--info)]/30 text-[var(--info)]">
                    <InfoIcon className="h-4 w-4 text-[var(--info)]" />
                    <AlertDescription className="text-xs font-medium">
                      Já existe um cliente cadastrado com esse CNPJ/CPF: <strong>{matchedClient.name}</strong>. Uma conta nova será criada dentro dele, em vez de um cliente duplicado.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="account_name">Nome da conta</Label>
                <Input id="account_name" {...form.register("account_name")} placeholder="Ex: Unidade Norte, Marca X... (se vazio, usa o nome da empresa)" className="bg-[var(--surface-1)]" />
                <p className="text-[10px] text-[var(--ink-3)]">Uma empresa pode ter mais de uma conta (unidades, marcas, contratos separados). Dê um nome que diferencie esta.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço completo</Label>
                <Input id="address" {...form.register("address")} placeholder="Rua, número, complemento, bairro" className="bg-[var(--surface-1)]" />
                {form.formState.errors.address && <p className="text-xs text-[var(--danger)]">{form.formState.errors.address.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select onValueChange={(v) => form.setValue("country", v)} value={form.watch("country")}>
                  <SelectTrigger className="bg-[var(--surface-1)]">
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
                  <Label htmlFor="state">Estado/Província</Label>
                  <Input id="state" {...form.register("state")} placeholder="UF" className="bg-[var(--surface-1)]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" {...form.register("city")} placeholder="Cidade" className="bg-[var(--surface-1)]" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="corporate_email">Email corporativo</Label>
                <Input id="corporate_email" type="email" {...form.register("corporate_email")} placeholder="contato@empresa.com.br" className="bg-[var(--surface-1)]" />
                {form.formState.errors.corporate_email && <p className="text-xs text-[var(--danger)]">{form.formState.errors.corporate_email.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Contato do responsável</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email do responsável</Label>
                <Input id="contact_email" type="email" {...form.register("contact_email")} placeholder="email@responsavel.com" className="bg-[var(--surface-1)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_whatsapp">WhatsApp do responsável</Label>
                <Controller
                  control={form.control}
                  name="contact_whatsapp"
                  render={({ field }) => (
                    <IMaskInput
                      mask="(00) 00000-0000"
                      className="flex h-10 w-full rounded-md border border-input bg-[var(--surface-1)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(11) 99999-9999"
                      value={field.value || ""}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
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
                <Label>Nicho <span className="text-[var(--danger)]">*</span></Label>
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
                {form.formState.errors.niche_id && <p className="text-xs text-[var(--danger)]">{form.formState.errors.niche_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipo de contrato <span className="text-[var(--danger)]">*</span></Label>
                <Select onValueChange={(v) => form.setValue("contract_type", v as any)} value={form.watch("contract_type")}>
                  <SelectTrigger className="bg-[var(--surface-1)]">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                    <SelectItem value="one-off">Projeto Avulso</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.contract_type && <p className="text-xs text-[var(--danger)]">{form.formState.errors.contract_type.message}</p>}
              </div>
              
              {form.watch("contract_type") === 'recurring' && (
                <div className="space-y-2">
                  <Label>Meses de MRR <span className="text-[var(--danger)]">*</span></Label>
                  <Input
                    type="number"
                    min="1"
                    {...form.register("mrr_months", { valueAsNumber: true })}
                    className="bg-[var(--surface-1)]"
                    placeholder="Ex: 12"
                  />
                  {form.formState.errors.mrr_months && <p className="text-xs text-[var(--danger)]">{form.formState.errors.mrr_months.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select onValueChange={(v) => form.setValue("payment_method", v)} value={form.watch("payment_method") || ""}>
                  <SelectTrigger className="bg-[var(--surface-1)]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor {form.watch("contract_type") === 'recurring' ? 'Mensal (MRR)' : 'do Projeto'}</Label>
                <Controller
                  control={form.control}
                  name="monthly_value"
                  render={({ field }) => (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] text-sm">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-9 bg-[var(--surface-1)]"
                        placeholder="0,00"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                />
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

          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
                <Calendar className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Cronograma do projeto</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de início</Label>
                <Input id="start_date" type="date" {...form.register("start_date")} className="bg-[var(--surface-1)]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date_expected">Data de encerramento previsto</Label>
                <Input id="end_date_expected" type="date" {...form.register("end_date_expected")} className="bg-[var(--surface-1)]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Arquivo do contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 transition-colors cursor-pointer",
                  isDragActive ? "border-[var(--violet-500)] bg-[var(--violet-500)]/5" : "border-[var(--line-1)] hover:border-[var(--violet-500)]/50 bg-[var(--surface-1)]"
                )}
              >
                <input {...getInputProps()} />
                <div className="h-12 w-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)] shadow-sm mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                {file ? (
                  <div className="flex items-center gap-2 text-[var(--violet-500)] font-medium">
                    <CheckCircle className="h-4 w-4" />
                    {file.name}
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[var(--ink-3)] hover:text-[var(--danger)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[var(--ink-1)]">Clique para upload ou arraste</p>
                    <p className="text-xs text-[var(--ink-3)]">PDF até 10MB</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--line-1)] shadow-none bg-[var(--surface-2)]/50">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[var(--violet-500)]/10 flex items-center justify-center text-[var(--violet-500)]">
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
                  className="min-h-[100px] bg-[var(--surface-1)]"
                />
                <p className="text-[10px] text-[var(--ink-3)]">Descreva o que foi contratado e observações relevantes sobre o escopo.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra_comments">Comentários extras</Label>
                <Textarea 
                  id="extra_comments" 
                  {...form.register("extra_comments")} 
                  placeholder="Informações adicionais..."
                  className="min-h-[100px] bg-[var(--surface-1)]"
                />
                <p className="text-[10px] text-[var(--ink-3)]">Informações adicionais sobre o fechamento e particularidades do cliente.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-8 border-[var(--line-1)] text-[var(--ink-3)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-12 font-bold"
            >
              {isSubmitting ? "Salvando..." : initialData ? "Salvar alterações" : "Salvar cliente"}
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
