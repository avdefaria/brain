import { createFileRoute } from "@tanstack/react-router";
import { 
  Shield, 
  Clock, 
  CheckSquare, 
  Users, 
  BarChart3,
  Calendar,
  Plus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const squads = [
    { name: "Growth", leader: "Alan Faria", progress: 65, total: 24, health: 92, people: 12, accounts: 8, days: 5 },
    { name: "Design", leader: "Julia Santos", progress: 42, total: 18, health: 78, people: 8, accounts: 5, days: 12 },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão geral dos projetos</h1>
          <p className="text-sm text-[#8A8FA3]">Acompanhe o desempenho de todos os squads</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#0E0E16]">19 de Agosto, 2026</p>
          <p className="text-xs text-[#8A8FA3]">15:40 GMT-3</p>
        </div>
      </div>

      {/* 1. Cards de Squad */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {squads.map((squad) => (
          <Card key={squad.name} className="w-[300px] border-[#E4E6F0] shadow-sm flex-shrink-0">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#3D4FE8]/10 flex items-center justify-center text-[#3D4FE8]">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0E0E16]">{squad.name}</h3>
                    <p className="text-[10px] text-[#8A8FA3]">{squad.leader}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#8A8FA3] font-bold">
                  <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Progresso</span>
                  <span>{squad.days} dias restantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={squad.progress} className="h-1.5" />
                  <span className="text-xs font-bold text-[#0E0E16]">{squad.progress}%</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold text-[#22C55E]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                Health Score: {squad.health}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F7F8FC]">
                <div className="text-center"><Users className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">{squad.people}</span></div>
                <div className="text-center"><Shield className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">{squad.accounts}</span></div>
                <div className="text-center"><Clock className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">12</span></div>
                <div className="text-center"><CheckSquare className="h-3 w-3 mx-auto text-[#8A8FA3] mb-1" /><span className="text-[10px] font-bold">85</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <button className="w-[300px] border-2 border-dashed border-[#E4E6F0] rounded-xl flex items-center justify-center text-[#8A8FA3] hover:border-[#3D4FE8] hover:text-[#3D4FE8] transition-colors">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Placeholder for remaining sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-6 border-[#E4E6F0]">
            <h3 className="font-bold mb-4">Planejamentos gerais</h3>
            <div className="text-center py-8 text-[#8A8FA3]">Aguardando integração...</div>
          </Card>
          <Card className="p-6 border-[#E4E6F0]">
            <h3 className="font-bold mb-4">Tarefas gerais</h3>
            <div className="text-center py-8 text-[#8A8FA3]">Aguardando integração...</div>
          </Card>
        </div>
        <Card className="p-6 border-[#E4E6F0]">
          <h3 className="font-bold mb-4">Contas por Squad</h3>
          <div className="h-[200px] bg-[#F7F8FC] rounded-xl flex items-center justify-center text-[#8A8FA3]">Gráfico em construção</div>
        </Card>
      </div>
    </div>
  );
}
