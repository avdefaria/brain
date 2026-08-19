import { createFileRoute } from "@tanstack/react-router";
import { 
  Users, 
  UserPlus, 
  TrendingDown, 
  BarChart3, 
  DollarSign, 
  MapPin,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Users2,
  TrendingUp,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsOverviewPage,
});

const kpiData = [
  { label: "Clientes Ativos", value: "128", change: "+12%", trending: "up" },
  { label: "Novos Clientes", value: "14", change: "+4%", trending: "up" },
  { label: "Churn", value: "2.4%", change: "-0.5%", trending: "down" },
  { label: "LTV Médio", value: "R$ 4.250", change: "+8%", trending: "up" },
  { label: "CAC Médio", value: "R$ 850", change: "-2%", trending: "down" },
];

const riskData = [
  { name: "Baixo", value: 85, color: "#22C55E" },
  { name: "Médio", value: 30, color: "#F5A524" },
  { name: "Alto", value: 13, color: "#EF4444" },
];

function ClientsOverviewPage() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão Geral da Carteira</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm font-medium text-[#8A8FA3]">{kpi.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
                  kpi.trending === "up" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {kpi.trending === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title">Clientes por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Jan', value: 100 }, { name: 'Fev', value: 110 }, { name: 'Mar', value: 128 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3D4FE8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title">Distribuição de Risco</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
