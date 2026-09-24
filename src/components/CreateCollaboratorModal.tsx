import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getSquads } from "@/lib/squads.functions";
import { createCollaborator, getDepartments } from "@/lib/users.functions";
import { AvatarUpload } from "@/components/AvatarUpload";
import { DatePicker } from "@/components/DatePicker";
import { MultiSelectSquads } from "@/components/MultiSelectSquads";
import { MultiSelectJobFunctions } from "@/components/MultiSelectJobFunctions";
import { fetchAddressByCep } from "@/lib/utils";

const EMPLOYMENT_TYPES = ["CLT", "PJ", "Estágio"] as const;

const APP_ROLES = [
  { value: "collaborator", label: "Usuário" },
  { value: "leader", label: "Líder" },
  { value: "admin", label: "Admin" },
] as const;

const BR_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

const emptyAddress = { zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

export type CreatedCredential = {
  email: string;
  temporaryPassword: string;
  userId: string;
};

interface CreateCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (credential: CreatedCredential) => void;
}
export function CreateCollaboratorModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCollaboratorModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [jobFunctionIds, setJobFunctionIds] = useState<string[]>([]);
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState<string>("CLT");
  const [role, setRole] = useState<string>("collaborator");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepBlur = async () => {
    const digits = address.zip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const found = await fetchAddressByCep(address.zip);
      if (found) {
        setAddress((prev) => ({ ...prev, street: found.street || prev.street, neighborhood: found.neighborhood || prev.neighborhood, city: found.city || prev.city, state: found.state || prev.state }));
      }
    } finally {
      setCepLoading(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credential, setCredential] = useState<CreatedCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const submittingRef = useRef(false);

  const fetchSquads = useServerFn(getSquads);
  const fetchDepartments = useServerFn(getDepartments);
  const createCollaboratorFn = useServerFn(createCollaborator);

  const { data: squads } = useQuery({
    queryKey: ["squads"],
    queryFn: () => fetchSquads(),
    enabled: open,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetchDepartments(),
    enabled: open,
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setAvatarUrl(null);
    setDepartmentIds([]);
    setJobFunctionIds([]);
    setSquadIds([]);
    setEmploymentType("CLT");
    setRole("collaborator");
    setCpf("");
    setPhone("");
    setBirthDate(null);
    setAddress(emptyAddress);
    setFormError(null);
    setCopied(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (isSubmitting) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleCopy = async () => {
    if (credential) {
      try {
        await navigator.clipboard.writeText(
          `E-mail: ${credential.email} — Senha temporária: ${credential.temporaryPassword}`
        );
        setCopied(true);
        toast.success("Credenciais copiadas");
      } catch (_err) {
        toast.error("Não foi possível copiar");
      }
    } else {
      toast.error("Nada para copiar ainda");
    }
  };

  const handleNewRegistration = () => {
    resetForm();
    setCredential(null);
  };
  const handleSubmit = async () => {
    if (submittingRef.current || isSubmitting) return;
    setFormError(null);
    if (fullName.trim().length < 2) {
      setFormError("Informe o nome completo.");
    } else {
      if (email.trim().length === 0) {
        setFormError("Informe o e-mail corporativo.");
      } else {
        if (jobFunctionIds.length === 0) {
          setFormError("Selecione ao menos um cargo.");
        } else {
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
          const result = await createCollaboratorFn({
            data: {
              fullName: fullName.trim(),
              email: email.trim(),
              avatarUrl,
              jobFunctionIds,
              squadIds,
              employmentType: employmentType as "CLT" | "PJ" | "Estágio",
              role: role as "admin" | "leader" | "collaborator",
              cpf: cpf.trim() || null,
              phone: phone.trim() || null,
              birthDate,
              address,
            },
          });
          setCredential(result as CreatedCredential);
          toast.success("Membro cadastrado com sucesso");
          if (onSuccess) {
            onSuccess(result as CreatedCredential);
          }
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Erro ao cadastrar membro";
          setFormError(message);
          toast.error(message);
        } finally {
          submittingRef.current = false;
          setIsSubmitting(false);
        }
        }
      }
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-[var(--ink-1)]">
            Criar Membro
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-3)]">
            Apenas e-mails corporativos (@ongoo.com.br ou @ongoagency.com.br) podem ser
            cadastrados.
          </DialogDescription>
        </DialogHeader>

        {credential ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-[var(--success-tint)] bg-[var(--success-tint)] p-4">
              <p className="text-sm font-semibold text-[var(--ink-1)]">
                Membro criado! Copie e repasse manualmente:
              </p>
              <p className="mt-2 text-sm text-[var(--ink-1)] break-all">
                E-mail: {credential.email} — Senha temporária: {credential.temporaryPassword}
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button type="button" variant="ghost" className="rounded-full text-[var(--ink-3)]" onClick={handleNewRegistration}>
                  Novo cadastro
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} fallbackName={fullName} />
            <div className="space-y-2">
              <Label htmlFor="collab-name">Nome completo</Label>
              <Input id="collab-name" placeholder="Ex.: Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collab-cpf">CPF</Label>
                <Input id="collab-cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <DatePicker value={birthDate} onChange={setBirthDate} placeholder="Selecionar data" className="h-11 rounded-xl" captionLayout="dropdown" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collab-email">E-mail</Label>
                <Input id="collab-email" type="email" placeholder="nome@ongoo.com.br" value={email} onChange={(e) => setEmail(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collab-phone">Telefone</Label>
                <Input id="collab-phone" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--line-1)] p-3">
              <Label className="text-xs uppercase text-[var(--ink-3)]">Endereço</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder={cepLoading ? "Buscando..." : "CEP"} value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} onBlur={handleCepBlur} disabled={cepLoading} className="border-[var(--line-1)] rounded-xl h-10 col-span-2 sm:col-span-1" />
                <Input placeholder="Rua" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className="border-[var(--line-1)] rounded-xl h-10 col-span-2" />
                <Input placeholder="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} className="border-[var(--line-1)] rounded-xl h-10" />
                <Input placeholder="Complemento" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} className="border-[var(--line-1)] rounded-xl h-10 col-span-2" />
                <Input placeholder="Bairro" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} className="border-[var(--line-1)] rounded-xl h-10 col-span-2" />
                <Input placeholder="Cidade" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="border-[var(--line-1)] rounded-xl h-10 col-span-2" />
                <Select value={address.state} onValueChange={(v) => setAddress({ ...address, state: v })}>
                  <SelectTrigger className="border-[var(--line-1)] rounded-xl h-10"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-[var(--line-1)]">
                    {BR_STATES.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--line-1)]">
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <MultiSelectSquads
                selectedIds={departmentIds}
                options={(departments ?? []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }))}
                onChange={setDepartmentIds}
                placeholder="Selecionar departamentos..."
                itemLabel="departamento"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo (pode ser mais de um — ex.: CEO + Closer)</Label>
              <MultiSelectJobFunctions
                selectedIds={jobFunctionIds}
                departmentIds={departmentIds}
                onChange={setJobFunctionIds}
                placeholder="Selecionar cargos..."
              />
            </div>
            <div className="space-y-2">
              <Label>Squad</Label>
              <MultiSelectSquads
                selectedIds={squadIds}
                options={(squads ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))}
                onChange={setSquadIds}
                placeholder="Selecionar squads..."
              />
            </div>
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-[var(--line-1)] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[var(--line-1)]">
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formError ? (
              <p className="text-sm text-[var(--danger)]">{formError}</p>
            ) : (
              <p className="text-xs text-[var(--ink-3)]">
                Ao salvar, uma senha temporaria sera gerada e exibida para repasse manual.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-end gap-3 mt-4 sm:justify-end">
          <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-full text-[var(--ink-3)]">
            Fechar
          </Button>
          {credential ? (
            <Button onClick={() => handleClose(false)} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-8">
              Concluir
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-8">
              {isSubmitting ? "Salvando..." : "Criar Membro"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
