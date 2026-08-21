import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ClientRegistrationModal } from "./ClientRegistrationModal";

interface LeadConversionModalProps {
  lead: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadConversionModal({ lead, isOpen, onOpenChange }: LeadConversionModalProps) {
  const queryClient = useQueryClient();
  const [showFullModal, setShowFullModal] = useState(false);

  // When this modal opens, we immediately show the ClientRegistrationModal with pre-filled data
  useEffect(() => {
    if (isOpen) {
      setShowFullModal(true);
    }
  }, [isOpen]);

  if (!lead) return null;

  const handleSuccess = () => {
    toast.success("Lead convertido em cliente com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    onOpenChange(false);
  };

  const initialClientData = {
    name: lead.company || lead.name,
    corporate_email: lead.email || "",
    contact_email: lead.email || "",
    contact_whatsapp: lead.phone || "",
    niche_id: lead.niche_id || "",
    lead_id: lead.id,
    extra_comments: `Lead convertido do CRM. Notas originais: ${lead.notes || 'Sem notas.'}`,
  };

  return (
    <ClientRegistrationModal
      open={showFullModal && isOpen}
      onOpenChange={(open) => {
        setShowFullModal(open);
        if (!open) onOpenChange(false);
      }}
      initialData={initialClientData}
      onSuccess={handleSuccess}
    />
  );
}
