import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFBOARDING_CHECKLIST, OFFBOARDING_TOTAL_ITEMS } from "@/lib/offboarding-checklist";
import { getClientOffboardingStatus, toggleClientOffboardingItem, updateClientOffboardingFields } from "@/lib/offboarding.functions";
import { updateClientStatus } from "@/lib/clients.functions";
import { ChurnReasonModal } from "@/components/ChurnReasonModal";
import { cn } from "@/lib/utils";

interface ClientOffboardingModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Médio", high: "Alto" };
const RISK_COLORS: Record<string, string> = {
  low: "bg-[var(--success-tint)] text-[var(--success)]",
  medium: "bg-[var(--warning-tint)] text-[var(--warning)]",
  high: "bg-[var(--danger-tint)] text-[var(--danger)]",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function ClientOffboardingModal({ clientId, clientName, open, onOpenChange }: ClientOffboardingModalProps) {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getClientOffboardingStatus);
  const toggleItemFn = useServerFn(toggleClientOffboardingItem);
  const updateFieldsFn = useServerFn(updateClientOffboardingFields);
  const updateStatusFn = useServerFn(updateClientStatus);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [noticeDate, setNoticeDate] = useState("");
  const [expectedExitDate, setExpectedExitDate] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [churnModalOpen, setChurnModalOpen] = useState(false);
  const [confirmingChurn, setConfirmingChurn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["client-offboarding", clientId],
    queryFn: () => fetchStatus({ data: clientId }),
    enabled: open,
  });

  useEffect(() => {
    if (!data || initialized) return;

    if (data.noticeDate) {
      setNoticeDate(data.noticeDate);
      setExpectedExitDate(data.expectedExitDate || addDaysStr(data.noticeDate, 30));
    } else {
      const today = todayStr();
      setNoticeDate(today);
      setExpectedExitDate(addDaysStr(today, 30));
      saveFields({ noticeDate: today, expectedExitDate: addDaysStr(today, 30) }).catch(() => {});
    }

    setInitialized(true);
  }, [data, initialized]);

  useEffect(() => {
    if (!open) setInitialized(false);
  }, [open]);

  const checkedItems = data?.checkedItems || {};
  const checkedCount = Object.keys(checkedItems).length;
  const progress = Math.round((checkedCount / OFFBOARDING_TOTAL_ITEMS) * 100);

  const saveFields = async (overrides?: Partial<{ noticeDate: string; expectedExitDate: string }>) => {
    const payload = {
      clientId,
      noticeDate: overrides?.noticeDate ?? noticeDate,
      expectedExitDate: overrides?.expectedExitDate ?? expectedExitDate,
    };
    await updateFieldsFn({ data: payload });
    queryClient.invalidateQueries({ queryKey: ["client-offboarding", clientId] });
  };

  const handleToggle = async (itemKey: string, checked: boolean, triggersChurn?: boolean) => {
    if (triggersChurn && checked) {
      setChurnModalOpen(true);
      return;
    }
    setPendingKey(itemKey);
    try {
      await toggleItemFn({ data: { clientId, itemKey, checked } });
      await queryClient.invalidateQueries({ queryKey: ["client-offboarding", clientId] });
    } finally {
      setPendingKey(null);
    }
  };

  const handleConfirmChurn = async (reasonId: string) => {
    setConfirmingChurn(true);
    try {
      await updateStatusFn({ data: { id: clientId, status: "inativo", churnReasonId: reasonId } });
      await toggleItemFn({ data: { clientId, itemKey: "processos_passar_inativo", checked: true } });
      toast.success("Cliente marcado como Inativo");
      setChurnModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["client-offboarding", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      await queryClient.invalidateQueries({ queryKey: ["clients-status-counts"] });
    } finally {
      setConfirmingChurn(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-[var(--line-1)]">
          <DialogHeader>
            <DialogTitle className="font-title font-bold text-[var(--ink-1)]">Offboarding · {clientName}</DialogTitle>
            <DialogDescription className="text-xs text-[var(--ink-3)]">
              Processo de saída do cliente. O progresso fica salvo automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 mb-2">
            <Progress value={progress} className="flex-1" />
            <span className="text-xs text-[var(--ink-3)] whitespace-nowrap">
              {checkedCount}/{OFFBOARDING_TOTAL_ITEMS}
            </span>
          </div>

          {data?.riskLevel && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[var(--ink-3)]">Risco:</span>
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", RISK_COLORS[data.riskLevel])}>
                {RISK_LABELS[data.riskLevel]}
              </span>
              <span className="text-[10px] text-[var(--ink-3)]">(calculado automaticamente por Health Score + pagamentos)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-1)]">
            <div>
              <Label className="text-xs text-[var(--ink-3)]">Data do aviso</Label>
              <Input
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                onBlur={() => saveFields()}
                className="h-8 text-xs bg-[var(--surface-1)] mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[var(--ink-3)]">Data de saída prevista</Label>
              <Input
                type="date"
                value={expectedExitDate}
                onChange={(e) => setExpectedExitDate(e.target.value)}
                onBlur={() => saveFields()}
                className="h-8 text-xs bg-[var(--surface-1)] mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-[var(--ink-3)]">Receita em risco — calculada automaticamente pelo MRR aberto do cliente</Label>
              <p className="h-8 flex items-center text-sm font-bold text-[var(--ink-1)] mt-1">
                {money(data?.revenueAtRisk ?? 0)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-[var(--ink-3)]">Carregando...</p>
          ) : (
            <div className="space-y-6">
              {OFFBOARDING_CHECKLIST.map((group) => (
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
                            onCheckedChange={(v) => handleToggle(item.key, Boolean(v), item.triggersChurn)}
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
                              <p className="text-xs text-[var(--ink-3)] mt-0.5 whitespace-pre-line">{item.note}</p>
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

      <ChurnReasonModal
        open={churnModalOpen}
        onOpenChange={setChurnModalOpen}
        onConfirm={handleConfirmChurn}
        isLoading={confirmingChurn}
      />
    </>
  );
}
