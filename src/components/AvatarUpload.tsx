import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  fallbackName: string;
  disabled?: boolean;
}

export function AvatarUpload({ value, onChange, fallbackName, disabled }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, WEBP ou GIF.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Imagem muito grande. Máximo de 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      onChange(data.publicUrl);
      toast.success("Foto atualizada");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar a imagem");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16 border border-[var(--line-1)]">
          <AvatarImage src={value ?? undefined} alt={fallbackName} />
          <AvatarFallback className="bg-[var(--violet-500)]/10 text-[var(--violet-500)] font-semibold">
            {initialsFrom(fallbackName || "?")}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--violet-500)] text-white shadow-sm hover:bg-[var(--violet-500)]/90 disabled:opacity-60"
          aria-label="Alterar foto"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-[var(--ink-1)]">Foto de perfil</p>
        <p className="text-xs text-[var(--ink-3)]">PNG, JPG, WEBP ou GIF. Máximo 5MB.</p>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled || isUploading}
            className="flex w-fit items-center gap-1 text-xs text-[var(--danger)] hover:underline disabled:opacity-60"
          >
            <X className="h-3 w-3" /> Remover foto
          </button>
        ) : null}
      </div>
    </div>
  );
}
