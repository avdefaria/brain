import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_CHECKLIST, ONBOARDING_TOTAL_ITEMS } from "@/lib/onboarding-checklist";
import { getClientOnboardingStatus, toggleClientOnboardingItem } from "@/lib/onboarding.functions";
import { cn } from "@/lib/utils";

interface ClientOnboardingModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientOnboardingModal({ clientId, clientName, open, onOpenChange }: ClientOnboardingModalProps) {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getClientOnboardingStatus);
  const toggleItemFn = useServerFn(toggleClientOnboardingItem);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["client-onboarding", clientId],
    queryFn: () => fetchStatus({ data: clientId }),
    enabled: open,
  });

  const checkedItems = data?.checkedItems || {};
  const checkedCount = Object.keys(checkedItems).length;
  const progress = Math.round((checkedCount / ONBOARDING_TOTAL_ITEMS) * 100);

  const handleToggle = async (itemKey: string, checked: boolean) => {
    setPendingKey(itemKey);
    try {
      const result = await toggleItemFn({ data: { clientId, itemKey, checked } });
      await queryClient.invalidateQueries({ queryKey: ["client-onboarding", clientId] });
      if (result?.autoActivated) {
        toast.success("Checklist de onboarding completo — cliente movido para Ativo!");
        await queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
        await queryClient.invalidateQueries({ queryKey: ["clients-list"] });
        await queryClient.invalidateQueries({ queryKey: ["clients-status-counts"] });
      }
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-[var(--line-1)]">
        <DialogHeader>
          <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Onboarding · {clientName}</DialogTitle>
          <DialogDescription className="text-xs text-[var(--ink-3)]">
            Checklist de onboarding do cliente. O progresso fica salvo automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-2">
          <Progress value={progress} className="flex-1" />
          <span className="text-xs text-[var(--ink-3)] whitespace-nowrap">
            {checkedCount}/{ONBOARDING_TOTAL_ITEMS}
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--ink-3)]">Carregando...</p>
        ) : (
          <div className="space-y-6">
            {ONBOARDING_CHECKLIST.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold text-[var(--ink-1)] mb-2">{group.title}</h4>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isChecked = Boolean(checkedItems[item.key]);
                    return (
                      <div key={item.key} className={cn("flex items-start gap-2", item.indent && "ml-5")}>
                        <Checkbox
                          checked={isChecked}
                          disabled={pendingKey === item.key}
                          onCheckedChange={(v) => handleToggle(item.key, Boolean(v))}
                          className="mt-0.5"
                        />
                        <div>
                          <p
                            className={cn(
                              "text-sm text-[var(--ink-1)]",
                              isChecked && "line-through text-[var(--ink-3)]"
                            )}
                          >
                            {item.label}
                          </p>
                          {item.note && (
                            <p className="text-xs text-[var(--ink-3)] mt-0.5">{item.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
