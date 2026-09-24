import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Switch } from "@/components/ui/switch";
import { Copy, Check, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getSquads } from "@/lib/squads.functions";
import { updateCollaborator, resetCollaboratorPassword, getDepartments } from "@/lib/users.functions";
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

export type EditCollaboratorData = {
  id: string;
  full_name: string;
  function: string | null;
  job_function_ids: string[];
  department_ids: string[];
  squad_ids: string[] | null;
  employment_type: string | null;
  role: string | null;
  active: boolean | null;
  email: string | null;
  avatar_url: string | null;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
};

interface EditCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: EditCollaboratorData | null;
  onSuccess?: () => void;
}

export function EditCollaboratorModal({
  open,
  onOpenChange,
  collaborator,
  onSuccess,
}: EditCollaboratorModalProps) {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [jobFunctionIds, setJobFunctionIds] = useState<string[]>([]);
  const [squadIds, setSquadIds] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState<string>("CLT");
  const [role, setRole] = useState<string>("collaborator");
  const [active, setActive] = useState(true);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const savingRef = useRef(false);
  const resettingRef = useRef(false);

  const fetchSquads = useServerFn(getSquads);
  const fetchDepartments = useServerFn(getDepartments);
  const updateCollaboratorFn = useServerFn(updateCollaborator);
  const resetPasswordFn = useServerFn(resetCollaboratorPassword);

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

  useEffect(() => {
    if (collaborator && open) {
      setFullName(collaborator.full_name ?? "");
      setAvatarUrl(collaborator.avatar_url ?? null);
      setDepartmentIds(collaborator.department_ids ?? []);
      setJobFunctionIds(collaborator.job_function_ids ?? []);
      setSquadIds(collaborator.squad_ids ?? []);
      setEmploymentType(
        (EMPLOYMENT_TYPES as readonly string[]).includes(collaborator.employment_type ?? "")
          ? (collaborator.employment_type as string)
          : "CLT",
      );
      const validRole = (APP_ROLES as readonly { value: string }[]).some(
        (r) => r.value === collaborator.role,
      )
        ? (collaborator.role as string)
        : "collaborator";
      setRole(validRole);
      setActive(collaborator.active === false ? false : true);
      setCpf(collaborator.cpf ?? "");
      setPhone(collaborator.phone ?? "");
      setBirthDate(collaborator.birth_date ?? null);
      setAddress({
        zip: collaborator.address_zip ?? "",
        street: collaborator.address_street ?? "",
        number: collaborator.address_number ?? "",
        complement: collaborator.address_complement ?? "",
        neighborhood: collaborator.address_neighborhood ?? "",
        city: collaborator.address_city ?? "",
        state: collaborator.address_state ?? "",
      });
      setFormError(null);
      setNewPassword(null);
      setCopied(false);
      setConfirmingReset(false);
    }
  }, [collaborator, open]);

  const handleClose = (nextOpen: boolean) => {
    if (isSaving || isResetting) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleCopyPassword = async () => {
    if (newPassword && collaborator?.email) {
      try {
        await navigator.clipboard.writeText(
          `E-mail: ${collaborator.email} — Nova senha temporária: ${newPassword}`,
        );
        setCopied(true);
        toast.success("Nova senha copiada");
      } catch (_err) {
        toast.error("Não foi possível copiar");
      }
    } else {
      toast.error("Nada para copiar ainda");
    }
  };

  const handleSave = async () => {
    if (savingRef.current || isSaving) return;
    setFormError(null);
    if (fullName.trim().length < 2) {
      setFormError("Informe o nome completo.");
    } else {
      if (collaborator) {
        if (jobFunctionIds.length === 0) {
          setFormError("Selecione ao menos um cargo.");
        } else {
        savingRef.current = true;
        setIsSaving(true);
        try {
          await updateCollaboratorFn({
            data: {
              userId: collaborator.id,
              fullName: fullName.trim(),
              avatarUrl,
              jobFunctionIds,
              squadIds,
              employmentType: employmentType as "CLT" | "PJ" | "Estágio",
              role: role as "admin" | "leader" | "collaborator",
              active: active,
              cpf: cpf.trim() || null,
              phone: phone.trim() || null,
              birthDate,
              address,
            },
          });
          toast.success("Membro atualizado com sucesso");
          if (onSuccess) {
            onSuccess();
          }
          onOpenChange(false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Erro ao salvar alterações";
          setFormError(message);
          toast.error(message);
        } finally {
          savingRef.current = false;
          setIsSaving(false);
        }
        }
      } else {
        setFormError("Nenhum membro selecionado.");
      }
    }
  };

  const handleResetPassword = async () => {
    if (resettingRef.current || isResetting) return;
    setFormError(null);
    if (collaborator) {
      if (confirmingReset) {
        resettingRef.current = true;
        setIsResetting(true);
        try {
          const result = await resetPasswordFn({
            data: { userId: collaborator.id },
          });
          setNewPassword((result as { temporaryPassword: string }).temporaryPassword);
          setCopied(false);
          setConfirmingReset(false);
          toast.success("Nova senha temporária gerada");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Erro ao resetar senha";
          setFormError(message);
          toast.error(message);
        } finally {
          resettingRef.current = false;
          setIsResetting(false);
        }
      } else {
        setConfirmingReset(true);
      }
    } else {
      setFormError("Nenhum membro selecionado.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-[var(--ink-1)]">
            Editar Membro
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--ink-3)]">
            Atualize os dados do membro. O e-mail não pode ser alterado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} fallbackName={fullName} />
          <div className="space-y-2">
            <Label htmlFor="edit-collab-name">Nome completo</Label>
            <Input id="edit-collab-name" placeholder="Ex.: Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-collab-cpf">CPF</Label>
              <Input id="edit-collab-cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <DatePicker value={birthDate} onChange={setBirthDate} placeholder="Selecionar data" className="h-11 rounded-xl" captionLayout="dropdown" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-collab-email">E-mail</Label>
              <Input id="edit-collab-email" type="email" value={collaborator?.email ?? ""} readOnly className="border-[var(--line-1)] rounded-xl h-11 bg-[var(--surface-2)] text-[var(--ink-3)]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-collab-phone">Telefone</Label>
              <Input id="edit-collab-phone" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-[var(--line-1)] rounded-xl h-11" />
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
          <div className="flex items-center justify-between rounded-xl border border-[var(--line-1)] p-3">
            <div>
              <Label>Status</Label>
              <p className="text-xs text-[var(--ink-3)]">
                {active ? "Ativo" : "Inativo"}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Button type="button" variant="outline" onClick={handleResetPassword} disabled={isResetting || !collaborator} className="w-full rounded-xl h-11 border-[var(--line-1)]">
              <KeyRound className="h-4 w-4 mr-2" />
              {confirmingReset ? "Confirmar reset de senha" : isResetting ? "Gerando..." : "Resetar Senha"}
            </Button>
            {confirmingReset ? (
              <p className="text-xs text-[var(--ink-3)]">
                Clique novamente para confirmar. Uma nova senha temporária de 12 caracteres será gerada.
              </p>
            ) : (
              <p className="hidden" />
            )}
          </div>
          {newPassword ? (
            <div className="rounded-xl border border-[var(--success-tint)] bg-[var(--success-tint)] p-4">
              <p className="text-sm font-semibold text-[var(--ink-1)]">
                Nova senha temporária gerada! Repasse manualmente:
              </p>
              <p className="mt-2 text-sm text-[var(--ink-1)] break-all font-mono font-bold">
                {newPassword}
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={handleCopyPassword}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          ) : null}
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-4 sm:justify-end">
          <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-full text-[var(--ink-3)]">
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 text-white rounded-full px-8">
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
