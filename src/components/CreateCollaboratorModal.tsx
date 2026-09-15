import { useRef, useState } from "react";
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
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getSquads } from "@/lib/squads.functions";
import { createCollaborator } from "@/lib/users.functions";

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
  { value: "collaborator", label: "Usuário" },
  { value: "leader", label: "Líder" },
  { value: "admin", label: "Admin" },
] as const;

const COMMERCIAL_ROLES = ["SDR", "Closer", "Dono", "Gestor"] as const;

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
  const [userFunction, setUserFunction] = useState<string>("Designer");
  const [commercialRoles, setCommercialRoles] = useState<string[]>([]);
  const [squadId, setSquadId] = useState<string>("none");
  const [employmentType, setEmploymentType] = useState<string>("CLT");
  const [role, setRole] = useState<string>("collaborator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credential, setCredential] = useState<CreatedCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const submittingRef = useRef(false);

  const fetchSquads = useServerFn(getSquads);
  const createCollaboratorFn = useServerFn(createCollaborator);

  const { data: squads } = useQuery({
    queryKey: ["squads"],
    queryFn: () => fetchSquads(),
    enabled: open,
  });

  const toggleCommercialRole = (value: string) => {
    if (commercialRoles.includes(value)) {
      setCommercialRoles(commercialRoles.filter((r) => r !== value));
    } else {
      setCommercialRoles([...commercialRoles, value]);
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setUserFunction("Designer");
    setCommercialRoles([]);
    setSquadId("none");
    setEmploymentType("CLT");
    setRole("collaborator");
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
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
          const result = await createCollaboratorFn({
            data: {
              fullName: fullName.trim(),
              email: email.trim(),
              function: userFunction as
                | "Designer"
                | "Copywriter"
                | "Gestor de Tráfego"
                | "Redator"
                | "Desenvolvedor"
                | "Administrador",
              commercialRoles: commercialRoles as (
                | "SDR"
                | "Closer"
                | "Dono"
                | "Gestor"
              )[],
              squadId: squadId === "none" ? null : squadId,
              employmentType: employmentType as "CLT" | "PJ" | "Estágio",
              role: role as "admin" | "leader" | "collaborator",
            },
          });
          setCredential(result as CreatedCredential);
          toast.success("Usuário cadastrado com sucesso");
          if (onSuccess) {
            onSuccess(result as CreatedCredential);
          }
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Erro ao cadastrar usuário";
          setFormError(message);
          toast.error(message);
        } finally {
          submittingRef.current = false;
          setIsSubmitting(false);
        }
      }
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-[#0E0E16]">
            Cadastrar Usuário
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8A8FA3]">
            Apenas e-mails corporativos (@ongoo.com.br ou @ongoagency.com.br) podem ser
            cadastrados.
          </DialogDescription>
        </DialogHeader>

        {credential ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-[#D6F0DB] bg-[#F0FAF2] p-4">
              <p className="text-sm font-semibold text-[#0E0E16]">
                Usuário criado! Copie e repasse manualmente:
              </p>
              <p className="mt-2 text-sm text-[#0E0E16] break-all">
                E-mail: {credential.email} — Senha temporária: {credential.temporaryPassword}
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button type="button" variant="ghost" className="rounded-full text-[#8A8FA3]" onClick={handleNewRegistration}>
                  Novo cadastro
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="collab-name">Nome completo</Label>
              <Input id="collab-name" placeholder="Ex.: Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-[#E4E6F0] rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collab-email">E-mail</Label>
              <Input id="collab-email" type="email" placeholder="nome@ongoo.com.br" value={email} onChange={(e) => setEmail(e.target.value)} className="border-[#E4E6F0] rounded-xl h-11" />
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
            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : (
              <p className="text-xs text-[#8A8FA3]">
                Ao salvar, uma senha temporaria sera gerada e exibida para repasse manual.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-end gap-3 mt-4 sm:justify-end">
          <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-full text-[#8A8FA3]">
            Fechar
          </Button>
          {credential ? (
            <Button onClick={() => handleClose(false)} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-8">
              Concluir
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 text-white rounded-full px-8">
              {isSubmitting ? "Salvando..." : "Salvar usuário"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


