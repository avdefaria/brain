import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDeliverablesProgress } from "@/lib/deliverables.functions";
import { useServerFn } from "@tanstack/react-start";
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/deliverables")({
  component: DeliverablesPage,
});

function DeliverablesPage() {
  const fetchProgress = useServerFn(getDeliverablesProgress);

  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ["deliverables-progress"],
    queryFn: () => fetchProgress(),
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Gestão de Entregáveis</h1>
          <p className="text-sm text-[#8A8FA3]">Tipos de entregas e progresso dinâmico baseado em tarefas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-[#3D4FE8] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliverables.map((item) => (
            <Card key={item.id} className="border-[#E4E6F0] shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 bg-[#3D4FE8]/10 rounded-2xl flex items-center justify-center text-[#3D4FE8]">
                    <Package className="h-5 w-5" />
                  </div>
                  {item.total > 0 && (
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1",
                      item.progress === 100 ? "bg-green-100 text-green-600" : "bg-[#3D4FE8]/10 text-[#3D4FE8]"
                    )}>
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(item.progress)}%
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">{item.name}</h3>
                  <p className="text-xs text-[#8A8FA3]">
                    {item.total > 0 
                      ? `${item.completed} de ${item.total} concluídas`
                      : "Nenhuma tarefa vinculada ainda"
                    }
                  </p>
                </div>

                {item.total > 0 ? (
                  <div className="space-y-2 pt-2">
                    <Progress value={item.progress} className="h-2 bg-[#F7F8FC]" />
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#8A8FA3]">
                      <span>Progresso</span>
                      <span>{item.completed} / {item.total}</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex items-center gap-2 text-[#8A8FA3]">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Aguardando tarefas</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
