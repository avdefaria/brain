import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, HeartPulse, TrendingUp, CheckSquare, AlertCircle, ArrowUpRight, ArrowDownRight, UserPlus, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/OnboardingModal";
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
function KPICard({ title, value, trend, trendValue, icon: Icon }) {
    return (<Card className="border-[#E4E6F0] shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#3D4FE8]">
            <Icon className="h-5 w-5"/>
          </div>
          <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", trend === "up" ? "bg-green-50 text-[#22C55E]" : "bg-red-50 text-[#EF4444]")}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
            {trendValue}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-[#8A8FA3]">{title}</p>
          <h3 className="text-2xl font-bold text-[#0E0E16] tabular mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>);
}
function DashboardPage() {
    const now = new Date();
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500">
      <OnboardingModal />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-title font-bold text-[#0E0E16]">
            Olá, Alan 👋
          </h1>
          <p className="text-[#8A8FA3] mt-1">
            Aqui está o que está acontecendo no seu squad hoje.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-[#0E0E16]">
            {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="text-[#8A8FA3]">
            {format(now, "HH:mm")}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Clientes no Squad" value="24" trend="up" trendValue="12% vs mês anterior" icon={Users}/>
        <KPICard title="Health Score" value="92" trend="up" trendValue="5% vs mês anterior" icon={HeartPulse}/>
        <KPICard title="LTV do Squad" value="28 meses" trend="up" trendValue="8% vs mês anterior" icon={TrendingUp}/>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title font-bold">LTV por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8A8FA3", fontSize: 12 }} dy={10}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8FA3", fontSize: 12 }}/>
                <Tooltip contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E4E6F0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}/>
                <Line type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={3} dot={{ r: 4, fill: "#3D4FE8", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title font-bold">Health Score por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8A8FA3", fontSize: 12 }} dy={10}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8FA3", fontSize: 12 }}/>
                <Tooltip contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E4E6F0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}/>
                <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: "#22C55E", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }}/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        {/* Avisos */}
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-title font-bold">Avisos Internos</CardTitle>
            <AlertCircle className="h-5 w-5 text-[#3D4FE8]"/>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <MessageSquareText className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0E0E16]">Nenhum aviso novo</p>
                <p className="text-xs text-[#8A8FA3] mt-1">Tudo em ordem por aqui.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximas Tarefas */}
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-title font-bold">Próximas Tarefas</CardTitle>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3D4FE8]/10 text-[#3D4FE8] text-[10px] font-bold uppercase tracking-wider tabular">
              0 pendentes
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <CheckSquare className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0E0E16]">Agenda livre</p>
                <p className="text-xs text-[#8A8FA3] mt-1">Você não tem tarefas para hoje.</p>
              </div>
              <Button variant="outline" className="rounded-full text-xs h-8 border-[#E4E6F0]">
                Criar tarefa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Squad Ativo */}
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-title font-bold">Membros do Squad</CardTitle>
            <div className="h-2 w-4 rounded-full bg-[#22C55E]" title="Online"></div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
                <UserPlus className="h-6 w-6"/>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0E0E16]">Ninguém no squad</p>
                <p className="text-xs text-[#8A8FA3] mt-1">Comece cadastrando sua equipe.</p>
              </div>
              <Button className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full text-xs h-8">
                Adicionar membro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
