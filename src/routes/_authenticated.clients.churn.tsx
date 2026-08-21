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
  Search,
  Inbox
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
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getChurnAnalysisData } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/clients/churn")({
  component: ChurnAnalysisPage,
});

function ChurnAnalysisPage() {
  const fetchChurnData = useServerFn(getChurnAnalysisData);

  const { data, isLoading } = useQuery({
    queryKey: ['churn-analysis'],
    queryFn: () => fetchChurnData()
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Análise de Churn</h1>
            <p className="text-sm text-[#8A8FA3]">Carregando dados da base...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-[#E4E6F0] shadow-sm animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const kpiData = data?.kpis || [];
  const churnByReason = data?.charts?.churnByReason || [];
  const churnMonthly = data?.charts?.churnMonthly || [];
  const recentChurn = data?.recentChurn || [];
  const cohortData = data?.cohortData || [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Análise de Churn</h1>
          <p className="text-sm text-[#8A8FA3]">Entenda os motivos de cancelamento e retenção</p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="monthly">
            <SelectTrigger className="w-[140px] border-[#E4E6F0] rounded-full">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi: any) => (
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
            {churnMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={churnMonthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#8A8FA3]">
                <Inbox className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum churn registrado nos últimos meses</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-title">Motivos de Churn</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {churnByReason.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnByReason} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E6F0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#8A8FA3]">
                <Inbox className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum dado de motivos disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title">Clientes com Churn Recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="font-bold text-[#0E0E16]">Cliente</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Data</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Tipo</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Receita Perdida</TableHead>
                <TableHead className="font-bold text-[#0E0E16]">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentChurn.length > 0 ? (
                recentChurn.map((c: any) => (
                  <TableRow key={c.name} className="border-[#E4E6F0] hover:bg-[#F7F8FC]/50">
                    <TableCell className="font-medium text-[#0E0E16]">{c.name}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{c.date}</TableCell>
                    <TableCell className="text-[#8A8FA3]">{c.type}</TableCell>
                    <TableCell className="font-bold text-[#EF4444] tabular">
                      R$ {c.value.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase">
                        {c.reason}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[#8A8FA3]">
                    Nenhum churn recente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title">Análise de Cohort de Retenção</CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-[#F7F8FC] flex items-center justify-center text-[#8A8FA3]">
              <Calendar className="h-8 w-8 opacity-20" />
            </div>
            <div>
              <h3 className="text-lg font-title font-bold text-[#0E0E16]">Aguardando dados históricos</h3>
              <p className="text-sm text-[#8A8FA3] max-w-md mx-auto">
                A análise de cohort requer dados de entrada e permanência de clientes ao longo de vários meses para ser gerada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
