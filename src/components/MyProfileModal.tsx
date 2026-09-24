import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

interface MyProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyProfileModal({ isOpen, onOpenChange }: MyProfileModalProps) {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: isOpen,
  });

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfileFn({ data: { fullName, avatarUrl } });
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      // Nome/avatar aparecem em vários lugares (header, dashboard, Time) —
      // todos derivados dessas mesmas queries.
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["team-overview"] });
    } catch (err) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] border-[var(--line-1)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Meu perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} fallbackName={fullName || "?"} />
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-[var(--line-1)] rounded-xl" />
            </div>
            {profile?.email && (
              <p className="text-xs text-[var(--ink-3)]">{profile.email}</p>
            )}
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-full bg-[var(--violet-500)] hover:bg-[var(--violet-500)]/90 w-full">
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>

          <div className="border-t border-[var(--line-1)] pt-5 space-y-3">
            <p className="text-xs font-bold text-[var(--ink-3)] uppercase tracking-wide">Alterar senha</p>
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="border-[var(--line-1)] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[var(--ink-3)]">Confirmar nova senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="border-[var(--line-1)] rounded-xl" />
            </div>
            <Button variant="outline" onClick={handleChangePassword} disabled={savingPassword} className="rounded-full w-full">
              {savingPassword ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
