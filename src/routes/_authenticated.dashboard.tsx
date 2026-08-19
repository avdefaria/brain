import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  HeartPulse, 
  TrendingUp, 
  Calendar, 
  CheckSquare, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  MessageSquareText,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const ltvData = [
  { name: "Jan", value: 12 },
  { name: "Fev", value: 15 },
  { name: "Mar", value: 18 },
  { name: "Abr", value: 20 },
  { name: "Mai", value: 24 },
  { name: "Jun", value: 28 },
];

const healthData = [
  { name: "Jan", value: 85 },
  { name: "Fev", value: 82 },
  { name: "Mar", value: 88 },
  { name: "Abr", value: 90 },
  { name: "Mai", value: 92 },
  { name: "Jun", value: 95 },
];

function KPICard({ title, value, trend, trendValue, icon: Icon }: any) {
  return (
    <Card className="border-[#E4E6F0] shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#3D4FE8]">
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", trend === "up" ? "bg-green-50 text-[#22C55E]" : "bg-red-50 text-[#EF4444]")}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trendValue}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-[#8A8FA3]">{title}</p>
          <h3 className="text-2xl font-bold text-[#0E0E16] tabular mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [timelineView, setTimelineView] = useState<"week" | "month">("week");
  const now = new Date();

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <OnboardingModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-title font-bold text-[#0E0E16]">Olá, Alan 👋</h1>
          <p className="text-[#8A8FA3] mt-1">Aqui está o que está acontecendo no seu squad hoje.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full">Ver perfil</Button>
          <Button className="rounded-full bg-[#3D4FE8] hover:bg-[#3D4FE8]/90">Nova solicitação ao RH</Button>
        </div>
      </div>

      {/* Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 border-[#E4E6F0] bg-[#3D4FE8] text-white">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <h3 className="font-title font-bold text-lg">Avisos internos</h3>
            <Button variant="secondary" className="rounded-full text-xs mt-4">Ver todos</Button>
          </CardContent>
        </Card>
        <div className="col-span-3 grid grid-cols-3 gap-6">
          <KPICard title="Clientes no Squad" value="24" trend="up" trendValue="12% vs mês anterior" icon={Users} />
          <KPICard title="Health Score" value="92" trend="up" trendValue="5% vs mês anterior" icon={HeartPulse} />
          <KPICard title="LTV do Squad" value="28 meses" trend="up" trendValue="8% vs mês anterior" icon={TrendingUp} />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#E4E6F0] p-6">
            <h3 className="font-title font-bold mb-4">Próximas tarefas (0 pendentes)</h3>
            <div className="text-center py-8 text-[#8A8FA3]">Nenhuma tarefa pendente.</div>
          </Card>
          <Card className="border-[#E4E6F0] p-6">
            <h3 className="font-title font-bold mb-4">Próximas agendas</h3>
            <div className="text-center py-8 text-[#8A8FA3]">Agenda livre.</div>
          </Card>
        </div>
        <Card className="border-[#E4E6F0] p-6">
          <h3 className="font-title font-bold mb-4">Membros do squad (0 ativos)</h3>
          <div className="text-center py-8 text-[#8A8FA3]">Ninguém cadastrado.</div>
        </Card>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-title font-bold mb-4">LTV por mês</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvData}>
                <Line type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-title font-bold mb-4">Health score por mês</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthData}>
                <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Projects Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-title font-bold text-lg">Timeline de projetos especiais</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><ChevronLeft /></Button>
            <span className="font-semibold">Semana 12</span>
            <Button variant="ghost" size="icon"><ChevronRight /></Button>
            <div className="flex border rounded-full overflow-hidden">
               <button onClick={() => setTimelineView("week")} className={cn("px-3 py-1 text-xs", timelineView === "week" && "bg-[#F7F8FC]")}>Semana</button>
               <button onClick={() => setTimelineView("month")} className={cn("px-3 py-1 text-xs", timelineView === "month" && "bg-[#F7F8FC]")}>Mês</button>
            </div>
            <Button className="rounded-full bg-[#3D4FE8]"><Plus className="h-4 w-4 mr-2" /> Adicionar projeto</Button>
          </div>
        </div>
        <div className="text-center py-12 text-[#8A8FA3]">Timeline vazia.</div>
      </Card>
    </div>
  );
}
