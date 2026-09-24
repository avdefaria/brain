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
  onConverted?: (result: { clientId: string; clientName: string }) => void;
}

export function LeadConversionModal({ lead, isOpen, onOpenChange, onConverted }: LeadConversionModalProps) {
  const queryClient = useQueryClient();
  const [showFullModal, setShowFullModal] = useState(false);

  // When this modal opens, we immediately show the ClientRegistrationModal with pre-filled data
  useEffect(() => {
    if (isOpen) {
      setShowFullModal(true);
    }
  }, [isOpen]);

  if (!lead) return null;

  const handleSuccess = (result?: { clientId: string; isNewClient: boolean; fromLead: boolean }) => {
    toast.success("Lead convertido em cliente com sucesso!");
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    onOpenChange(false);
    if (result?.clientId && onConverted) {
      onConverted({ clientId: result.clientId, clientName: lead.company || lead.name });
    }
  };

  const recurring = Number(lead.recurring_revenue) || 0;
  const oneTime = Number(lead.one_time_revenue) || 0;
  const mrrMonths = Number(lead.mrr_months) || 1;
  const channels = lead.lead_sales_channels?.map((lsc: any) => lsc.sales_channels?.name).filter(Boolean) || [];
  
  // Note: There is no lead_squads table, so we check if the lead has a responsible_id or similar 
  // that could be mapped to a squad, but for now we follow the instruction: 
  // "if there is no squad field in the lead, just ignore this item and let me know".
  
  const initialClientData = {
    name: lead.company || lead.name,
    account_name: lead.account_name || lead.company || lead.name,
    corporate_email: lead.email || "",
    contact_email: lead.email || "",
    contact_whatsapp: lead.phone || "",
    niche_id: lead.niche_id || null,
    lead_id: lead.id,
    extra_comments: lead.notes || "",
    sales_channels: channels,
    contract_type: recurring > 0 ? "recurring" : (oneTime > 0 ? "one-off" : "recurring"),
    scope_details: "",
    monthly_value: recurring > 0 ? recurring : (oneTime > 0 ? oneTime : 0),
    _warning_both_revenues: (recurring > 0 && oneTime > 0) ? oneTime : null,
    // squad_ids: [] // As per schema analysis, there is no squad link in lead yet
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
