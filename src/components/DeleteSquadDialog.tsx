import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSquad } from "@/lib/projects.functions";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface DeleteSquadDialogProps {
  squad: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSquadDialog({ squad, isOpen, onOpenChange }: DeleteSquadDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSquad({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
      toast.success("Squad excluído com sucesso");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao excluir squad");
    }
  });

  const handleDelete = () => {
    deleteMutation.mutate(squad.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="font-title text-xl">Excluir Squad</DialogTitle>
          <DialogDescription className="text-balance pt-2">
            Tem certeza que deseja excluir o squad <span className="font-bold text-[#0E0E16]">"{squad?.name}"</span>? 
            Esta ação não pode ser desfeita e removerá todos os vínculos com colaboradores e clientes.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            variant="destructive"
            className="rounded-full bg-red-600 hover:bg-red-700 flex-1"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
