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

  const recurring = Number(lead.recurring_revenue) || 0;
  const oneTime = Number(lead.one_time_revenue) || 0;
  const mrrMonths = Number(lead.mrr_months) || 1;
  const channels = lead.lead_sales_channels?.map((lsc: any) => lsc.sales_channels?.name).filter(Boolean) || [];

  const initialClientData = {
    name: lead.company || lead.name,
    corporate_email: lead.email || "",
    contact_email: lead.email || "",
    contact_whatsapp: lead.phone || "",
    niche_id: lead.niche_id || "",
    lead_id: lead.id,
    extra_comments: lead.notes || "",
    sales_channels: channels,
    contract_type: recurring > 0 ? "recurring" : (oneTime > 0 ? "one-off" : "recurring"),
    scope_details: recurring > 0 
      ? `MRR: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recurring)} (${mrrMonths} meses).`
      : (oneTime > 0 ? `Receita Única: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oneTime)}.` : ""),
    _warning_both_revenues: (recurring > 0 && oneTime > 0) ? oneTime : null,
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
