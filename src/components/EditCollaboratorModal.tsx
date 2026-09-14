import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getSquads } from "@/lib/squads.functions";
import { updateCollaborator, resetCollaboratorPassword } from "@/lib/users.functions";

const USER_FUNCTIONS = [
  "Designer",
  "Copywriter",
  "Gestor de Tráfego",
  "Redator",
  "Desenvolvedor",
  "Administrador",
] as const;

const EMPLOYMENT_TYPES = ["CLT", "PJ", "Estágio"] as const;

const APP_ROLES = [
  { value: "collaborator", label: "Colaborador" },
  { value: "leader", label: "Líder" },
  { value: "admin", label: "Admin" },
] as const;

const COMMERCIAL_ROLES = ["SDR", "Closer", "Dono", "Gestor"] as const;

export type EditCollaboratorData = {
  id: string;
  full_name: string;
  function: string | null;
  commercial_roles: string[] | null;
  squad_id: string | null;
  employment_type: string | null;
  role: string | null;
  active: boolean | null;
  email: string | null;
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
  const [userFunction, setUserFunction] = useState<string>("Designer");
  const [commercialRoles, setCommercialRoles] = useState<string[]>([]);
  const [squadId, setSquadId] = useState<string>("none");
  const [employmentType, setEmploymentType] = useState<string>("CLT");
  const [role, setRole] = useState<string>("collaborator");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSquads = useServerFn(getSquads);
  const updateCollaboratorFn = useServerFn(updateCollaborator);
  const resetPasswordFn = useServerFn(resetCollaboratorPassword);

  const { data: squads } = useQuery({
    queryKey: ["squads"],
    queryFn: () => fetchSquads(),
    enabled: open,
  });

  useEffect(() => {
    if (collaborator && open) {
      setFullName(collaborator.full_name ?? "");
      setUserFunction(
        (USER_FUNCTIONS as readonly string[]).includes(collaborator.function ?? "")
          ? (collaborator.function as string)
          : "Designer",
      );
      setCommercialRoles(collaborator.commercial_roles ?? []);
      setSquadId(collaborator.squad_id ?? "none");
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
      setFormError(null);
      setNewPassword(null);
      setCopied(false);
      setConfirmingReset(false);
    }
  }, [collaborator, open]);

  const toggleCommercialRole = (value: string) => {
    if (commercialRoles.includes(value)) {
      setCommercialRoles(commercialRoles.filter((r) => r !== value));
    } else {
      setCommercialRoles([...commercialRoles, value]);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (isSaving || isResetting) {
      onOpenChange(false);
    } else {
      onOpenChange(nextOpen);
    }
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
    setFormError(null);
    if (fullName.trim().length < 2) {
      setFormError("Informe o nome completo.");
    } else {
      if (collaborator) {
        setIsSaving(true);
        try {
          await updateCollaboratorFn({
            data: {
              userId: collaborator.id,
              fullName: fullName.trim(),
              function: userFunction as
                | "Designer"
                | "Copywriter"
                | "Gestor de Tráfego"
                | "Redator"
                | "Desenvolvedor"
                | "Administrador",
              commercialRoles: commercialRoles as ("SDR" | "Closer" | "Dono" | "Gestor")[],
              squadId: squadId === "none" ? null : squadId,
              employmentType: employmentType as "CLT" | "PJ" | "Estágio",
              role: role as "admin" | "leader" | "collaborator",
              active: active,
            },
          });
          toast.success("Colaborador atualizado com sucesso");
          if (onSuccess) {
            onSuccess();
          }
          onOpenChange(false);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Erro ao salvar alterações";
          setFormError(message);
          toast.error(message);
        } finally {
          setIsSaving(false);
        }
      } else {
        setFormError("Nenhum colaborador selecionado.");
      }
    }
  };

  const handleResetPassword = async () => {
    setFormError(null);
    if (collaborator) {
      if (confirmingReset) {
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
          setIsResetting(false);
        }
      } else {
        setConfirmingReset(true);
      }
    } else {
      setFormError("Nenhum colaborador selecionado.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-[#0E0E16]">
            Editar Colaborador
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8A8FA3]">
            Atualize os dados do colaborador. O e-mail não pode ser alterado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-collab-name">Nome completo</Label>
            <Input id="edit-collab-name" placeholder="Ex.: Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-[#E4E6F0] rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-collab-email">E-mail</Label>
            <Input id="edit-collab-email" type="email" value={collaborator?.email ?? ""} readOnly className="border-[#E4E6F0] rounded-xl h-11 bg-[#F7F8FC] text-[#8A8FA3]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cargo / Funcao</Label>
              <Select value={userFunction} onValueChange={setUserFunction}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E6F0]">
                  {USER_FUNCTIONS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E6F0]">
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Papeis Comerciais (opcional)</Label>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#E4E6F0] p-3">
              {COMMERCIAL_ROLES.map((cr) => (
                <label key={cr} className="flex items-center gap-2 text-sm text-[#0E0E16] cursor-pointer">
                  <Checkbox checked={commercialRoles.includes(cr)} onCheckedChange={() => toggleCommercialRole(cr)} />
                  {cr}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Squad</Label>
              <Select value={squadId} onValueChange={setSquadId}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E6F0]">
                  <SelectItem value="none">Sem squad</SelectItem>
                  {(squads ?? []).map((s: { id: string; name: string }) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel no sistema</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-[#E4E6F0] rounded-xl h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E6F0]">
                  {APP_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#E4E6F0] p-3">
            <div>
              <Label>Status</Label>
              <p className="text-xs text-[#8A8FA3]">
                {active ? "Ativo" : "Inativo"}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Button type="button" variant="outline" onClick={handleResetPassword} disabled={isResetting || !collaborator} className="w-full rounded-xl h-11 border-[#E4E6F0]">
              <KeyRound className="h-4 w-4 mr-2" />
              {confirmingReset ? "Confirmar reset de senha" : isResetting ? "Gerando..." : "Resetar Senha"}
            </Button>
            {confirmingReset ? (
              <p className="text-xs text-[#8A8FA3]">
                Clique novamente para confirmar. Uma nova senha temporária de 12 caracteres será gerada.
              </p>
            ) : (
              <p className="hidden" />
            )}
          </div>
          {newPassword ? (
            <div className="rounded-xl border border-[#D6F0DB] bg-[#F0FAF2] p-4">
              <p className="text-sm font-semibold text-[#0E0E16]">
                Nova senha temporária gerada! Repasse manualmente:
              </p>
              <p className="mt-2 text-sm text-[#0E0E16] break-all font-mono font-bold">
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
            <p className="text-sm text-red-600">{formError}</p>
          ) : null}
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-4 sm:justify-end">
          <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-full text-[#8A8FA3]">
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-8">
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
