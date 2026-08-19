import { useState } from "react";
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

const clientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  cnpj_cpf: z.string().min(11, "CNPJ/CPF inválido"),
  address: z.string().min(5, "Endereço é obrigatório"),
  country: z.string(),
  state: z.string().min(2, "Estado é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  corporate_email: z.string().email("E-mail corporativo inválido"),
  contact_email: z.string().email("E-mail do responsável inválido").optional().or(z.literal("")),
  contact_whatsapp: z.string().min(10, "WhatsApp inválido"),
  squad_id: z.string().nullable(),
  segment: z.string().min(2, "Segmento é obrigatório"),
  contract_type: z.enum(["recurring", "one-off"]),
  sales_channels: z.array(z.string()).optional(),
  start_date: z.string(),
  end_date_expected: z.string().min(1, "Data de encerramento é obrigatória"),
  scope_details: z.string().nullable(),
  extra_comments: z.string().nullable(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientRegistrationModal({ open, onOpenChange, onSuccess }: ClientRegistrationModalProps) {
  const [file, setFile] = useState<File | null>(null);

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
      contact_email: "" as any,
      contact_whatsapp: "",
      squad_id: null as any,
      segment: "",
      contract_type: "recurring",
      start_date: (new Date().toISOString().split('T')[0]) as any,
      end_date_expected: "",
      scope_details: null as any,
      extra_comments: null as any,
      sales_channels: [],
    }
  });

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
      const { error } = await supabase.from('clients').insert([{
        name: data.name,
        cnpj_cpf: data.cnpj_cpf,
        address: data.address,
        country: data.country,
        state: data.state,
        city: data.city,
        corporate_email: data.corporate_email,
        contact_whatsapp: data.contact_whatsapp,
        squad_id: data.squad_id,
        segment: data.segment,
        sales_channels: data.sales_channels || [],
        start_date: data.start_date,
        end_date_expected: data.end_date_expected,
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
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      toast.error("Erro ao cadastrar cliente: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] overflow-y-auto p-0 border-[#E4E6F0] dark:border-[#2A2A36] dark:bg-[#1A1A24]">
        <div className="sticky top-0 bg-white dark:bg-[#1A1A24] z-10 px-8 py-6 border-b border-[#E4E6F0] dark:border-[#2A2A36]">
          <DialogTitle className="text-2xl font-title font-bold text-[#0E0E16] dark:text-white">
            Cadastrar cliente
          </DialogTitle>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-8">
          {/* Bloco 1 — Informações da empresa */}
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
                <Select onValueChange={(v) => form.setValue("country", v)} defaultValue="Brasil">
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

          {/* Bloco 2 — Contato do responsável */}
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

          {/* Bloco 3 — Informações comerciais */}
          <Card className="border-[#E4E6F0] dark:border-[#2A2A36] shadow-none bg-[#F7F8FC]/50 dark:bg-[#2A2A36]/20">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-title font-bold">Informações comerciais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Squad responsável</Label>
                <Select onValueChange={(v) => form.setValue("squad_id", v)}>
                  <SelectTrigger className="bg-white dark:bg-[#1A1A24]">
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
                <Label>Segmento</Label>
                <Select onValueChange={(v) => form.setValue("segment", v)}>
                  <SelectTrigger className="bg-white dark:bg-[#1A1A24]">
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="logistics">Logística</SelectItem>
                    <SelectItem value="food">Alimentação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de contrato <span className="text-red-500">*</span></Label>
                <Select onValueChange={(v) => form.setValue("contract_type", v as any)}>
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
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.watch("sales_channels") || []).map((channel) => (
                    <Badge key={channel} className="bg-[#3D4FE8]/10 text-[#3D4FE8] border-none px-3 py-1 rounded-full flex items-center gap-1">
                      {channel}
                      <button
                        type="button"
                        onClick={() => {
                          const current = form.getValues("sales_channels") || [];
                          form.setValue("sales_channels", current.filter(c => c !== channel));
                        }}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(v) => {
                  const current = form.getValues("sales_channels") || [];
                  if (!current.includes(v)) {
                    form.setValue("sales_channels", [...current, v]);
                  }
                }}>
                  <SelectTrigger className="bg-white dark:bg-[#1A1A24]">
                    <SelectValue placeholder="Adicionar canal de venda" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mercado Livre", "Shopee", "Amazon", "TikTok Shop", "Magalu", "Americanas", "Shein", "Loja própria", "Instagram"].map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bloco 4 — Cronograma do projeto */}
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

          {/* Bloco 5 — Arquivo do contrato */}
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

          {/* Bloco 6 — Observações do contrato */}
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
              Salvar cliente
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