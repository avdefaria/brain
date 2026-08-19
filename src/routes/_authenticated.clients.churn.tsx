import { createFileRoute } from "@tanstack/react-router";
import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Users, 
  AlertCircle,
  Calendar,
  Filter,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart, 
  Bar
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/churn")({
  component: ChurnAnalysisPage,
});

const kpiData = [
  { label: "Taxa de Churn", value: "2.4%", change: "-0.5%", trending: "down" },
  { label: "Total de Churn", value: "8", change: "-2", trending: "down" },
  { label: "Tempo Médio até Churn", value: "14 meses", change: "+1.2", trending: "up" },
  { label: "Receita Perdida", value: "R$ 42.500", change: "-R$ 5k", trending: "down" },
];

const churnByReason = [
  { name: "Preço", value: 45 },
  { name: "Concorrência", value: 25 },
  { name: "Suporte", value: 20 },
  { name: "Outros", value: 10 },
];

function ChurnAnalysisPage() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Análise de Churn</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm font-medium text-[#8A8FA3]">{kpi.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  kpi.trending === "down" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
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
            <CardTitle className="text-lg font-title">Churn por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: 'Jan', value: 2 }, { name: 'Fev', value: 4 }, { name: 'Mar', value: 1 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title">Motivos de Churn</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnByReason} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E6F0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
