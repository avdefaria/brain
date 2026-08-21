import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { getChurnReasons, createChurnReason } from "@/lib/clients.functions";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface ChurnReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonId: string) => void;
  isLoading?: boolean;
}

export function ChurnReasonModal({ open, onOpenChange, onConfirm, isLoading }: ChurnReasonModalProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newReasonName, setNewReasonName] = useState("");

  const fetchReasons = useServerFn(getChurnReasons);
  const createReasonFn = useServerFn(createChurnReason);

  const { data: reasons, refetch } = useQuery({
    queryKey: ['churn-reasons'],
    queryFn: () => fetchReasons(),
    enabled: open
  });

  const handleAddNew = async () => {
    if (!newReasonName.trim()) return;
    try {
      const newReason = await createReasonFn({ data: { name: newReasonName } });
      await refetch();
      setSelectedReasonId(newReason.id);
      setIsAddingNew(false);
      setNewReasonName("");
      toast.success("Novo motivo adicionado");
    } catch (error) {
      toast.error("Erro ao adicionar motivo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-[#0E0E16]">Motivo do Cancelamento</DialogTitle>
          <DialogDescription className="text-sm text-[#8A8FA3]">
            Por favor, selecione o motivo pelo qual o cliente está sendo desativado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isAddingNew ? (
            <div className="flex gap-2">
              <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
                <SelectTrigger className="flex-1 border-[#E4E6F0] rounded-xl h-11">
                  <SelectValue placeholder="Selecione um motivo..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E4E6F0] shadow-lg">
                  {reasons?.map((reason: any) => (
                    <SelectItem key={reason.id} value={reason.id} className="rounded-lg">
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 w-11 p-0 rounded-xl border-[#E4E6F0]"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="h-5 w-5 text-[#8A8FA3]" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
              <Input
                placeholder="Novo motivo..."
                className="flex-1 border-[#E4E6F0] rounded-xl h-11"
                value={newReasonName}
                onChange={(e) => setNewReasonName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
              />
              <Button 
                type="button" 
                className="bg-[#3D4FE8] h-11 w-11 p-0 rounded-xl"
                onClick={handleAddNew}
              >
                <Check className="h-5 w-5 text-white" />
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="h-11 text-[#8A8FA3]"
                onClick={() => setIsAddingNew(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6 sm:justify-end">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-full text-[#8A8FA3]"
          >
            Voltar
          </Button>
          <Button 
            onClick={() => onConfirm(selectedReasonId)}
            disabled={!selectedReasonId || isLoading}
            className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-full px-8"
          >
            {isLoading ? "Processando..." : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
