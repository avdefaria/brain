import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Upload, X, ChevronRight, ChevronLeft, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const clientSchema = z.object({
  // Seção 1: Empresa
  name: z.string().min(2, "Nome é obrigatório"),
  cnpj_cpf: z.string().min(11, "CNPJ/CPF inválido"),
  address: z.string().min(5, "Endereço é obrigatório"),
  country: z.string().default("Brasil"),
  state: z.string().min(2, "Estado é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  corporate_email: z.string().email("E-mail corporativo inválido"),
  
  // Seção 2: Contato
  contact_name: z.string().min(2, "Nome do contato é obrigatório"),
  contact_whatsapp: z.string().min(10, "WhatsApp inválido"),
  
  // Seção 3: Comercial
  squad_id: z.string().optional(),
  segment: z.string().min(2, "Segmento é obrigatório"),
  contract_type: z.enum(["recurring", "one-off"]),
  
  // Seção 4: Cronograma
  start_date: z.string(),
  end_date_expected: z.string().optional(),
  
  // Seção 6: Observações
  scope_details: z.string().optional(),
  extra_comments: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientRegistrationModal({ open, onOpenChange, onSuccess }: ClientRegistrationModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      country: "Brasil",
      contract_type: "recurring",
      start_date: new Date().toISOString().split('T')[0],
    }
  });

  const nextStep = async () => {
    // Basic validation per step could be added here if needed
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    try {
      const { error } = await supabase.from('clients').insert([{
        name: data.name,
        cnpj_cpf: data.cnpj_cpf,
        address: data.address,
        country: data.country,
        state: data.state,
        city: data.city,
        corporate_email: data.corporate_email,
        contact_name: data.contact_name,
        contact_whatsapp: data.contact_whatsapp,
        squad_id: data.squad_id || null,
        segment: data.segment,
        start_date: data.start_date,
        end_date_expected: data.end_date_expected || null,
        scope_details: data.scope_details,
        extra_comments: data.extra_comments,
        status: 'active',
        risk_level: 'low',
        health_score: 100
      }]);

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      onOpenChange(false);
      form.reset();
      setStep(1);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      toast.error("Erro ao cadastrar cliente: " + error.message);
    }
  };

  const steps = [
    { title: "Informações da Empresa", description: "Dados básicos e localização" },
    { title: "Contato Responsável", description: "Quem responderá pelo projeto" },
    { title: "Comercial e Cronograma", description: "Squad, segmento e prazos" },
    { title: "Contrato e Observações", description: "Arquivos e detalhes extras" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-[#E4E6F0]">
        <div className="bg-[#F7F8FC] p-6 border-b border-[#E4E6F0]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <DialogTitle className="text-xl font-title font-bold text-[#0E0E16]">
                Cadastrar Novo Cliente
              </DialogTitle>
              <p className="text-sm text-[#8A8FA3] mt-1">Passo {step} de {totalSteps}: {steps[step-1].title}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-[#3D4FE8] shadow-sm">
              {step === totalSteps ? <Check className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
            </div>
          </div>
          <Progress value={progress} className="h-1.5 bg-[#E4E6F0]" indicatorClassName="bg-[#3D4FE8]" />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
          <div className="min-h-[350px]">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input id="name" {...form.register("name")} placeholder="Ex: Ongo Marketing" />
                  {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj_cpf">CNPJ/CPF</Label>
                    <Input id="cnpj_cpf" {...form.register("cnpj_cpf")} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="corporate_email">E-mail Corporativo</Label>
                    <Input id="corporate_email" type="email" {...form.register("corporate_email")} placeholder="contato@empresa.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço Completo</Label>
                  <Input id="address" {...form.register("address")} placeholder="Rua, número, bairro..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...form.register("city")} placeholder="Ex: São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" {...form.register("state")} placeholder="Ex: SP" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input id="country" {...form.register("country")} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Nome do Responsável</Label>
                  <Input id="contact_name" {...form.register("contact_name")} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_whatsapp">WhatsApp / Celular</Label>
                  <Input id="contact_whatsapp" {...form.register("contact_whatsapp")} placeholder="(00) 00000-0000" />
                </div>
                <div className="p-4 bg-[#F7F8FC] rounded-xl border border-[#E4E6F0] flex items-start gap-3 mt-8">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-[#3D4FE8] shrink-0 shadow-sm">
                    <Mail className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-[#8A8FA3] leading-relaxed">
                    Estas informações serão usadas para comunicações oficiais e acesso ao portal do cliente (em breve).
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Squad Responsável</Label>
                    <Select onValueChange={(v) => form.setValue("squad_id", v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione o squad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="dev">Desenvolvimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento</Label>
                    <Input id="segment" {...form.register("segment")} placeholder="Ex: E-commerce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Contrato</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => form.setValue("contract_type", "recurring")}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all text-left",
                        form.watch("contract_type") === "recurring" 
                          ? "border-[#3D4FE8] bg-[#3D4FE8]/5 text-[#3D4FE8]" 
                          : "border-[#E4E6F0] bg-white text-[#8A8FA3] hover:border-[#3D4FE8]/50"
                      )}
                    >
                      Recorrente (Monthly)
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("contract_type", "one-off")}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all text-left",
                        form.watch("contract_type") === "one-off" 
                          ? "border-[#3D4FE8] bg-[#3D4FE8]/5 text-[#3D4FE8]" 
                          : "border-[#E4E6F0] bg-white text-[#8A8FA3] hover:border-[#3D4FE8]/50"
                      )}
                    >
                      Projeto Avulso
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input id="start_date" type="date" {...form.register("start_date")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date_expected">Previsão de Término</Label>
                    <Input id="end_date_expected" type="date" {...form.register("end_date_expected")} />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Arquivo do Contrato (PDF)</Label>
                  <div className="border-2 border-dashed border-[#E4E6F0] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2 hover:border-[#3D4FE8]/50 transition-colors cursor-pointer bg-[#F7F8FC]/50">
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#8A8FA3] shadow-sm">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0E0E16]">Clique para upload ou arraste</p>
                      <p className="text-xs text-[#8A8FA3]">PDF até 10MB</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope_details">O que foi contratado (Escopo)</Label>
                  <Textarea 
                    id="scope_details" 
                    {...form.register("scope_details")} 
                    placeholder="Detalhe os entregáveis e serviços..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_comments">Comentários Extras</Label>
                  <Textarea 
                    id="extra_comments" 
                    {...form.register("extra_comments")} 
                    placeholder="Observações importantes..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-8 gap-3 sm:justify-between border-t border-[#E4E6F0] pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              className={cn("rounded-full", step === 1 && "invisible")}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-8"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full px-12"
              >
                Finalizar Cadastro
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
