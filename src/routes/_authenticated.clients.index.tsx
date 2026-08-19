import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Users, UserPlus, TrendingDown, BarChart3, DollarSign, MapPin, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Briefcase, Users2, TrendingUp, Target, Clock, Search, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { cn } from "@/lib/utils";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

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

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="text-sm text-[#8A8FA3]">{time.toLocaleDateString()} • {time.toLocaleTimeString()} (GMT-3)</span>;
}

function ClientsOverviewPage() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão Geral da Carteira</h1>
        <ClockDisplay />
      </div>

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

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Implementação de gráficos seguindo a estrutura (Clientes/mês, LTV, Novos, etc.) */}
      </div>

      {/* Distribuição geográfica placeholder */}
      <Card className="p-6">
        <CardTitle>Distribuição Geográfica</CardTitle>
      </Card>
    </div>
  );
}
import { useEffect } from "react";
