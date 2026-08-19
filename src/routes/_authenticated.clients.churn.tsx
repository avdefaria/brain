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
          <Select defaultValue="2024">
            <SelectTrigger className="w-[100px] border-[#E4E6F0] rounded-full">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title">Clientes com Churn Recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Receita Perdida</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Old Fashion Inc", date: "12/03/2024", type: "Recorrente", value: "R$ 4.500", reason: "Preço" },
                { name: "Future Tech", date: "05/03/2024", type: "Avulso", value: "R$ 15.000", reason: "Concorrência" },
              ].map((c) => (
                <TableRow key={c.name} className="border-[#E4E6F0]">
                  <TableCell className="font-medium text-[#0E0E16]">{c.name}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{c.date}</TableCell>
                  <TableCell className="text-[#8A8FA3]">{c.type}</TableCell>
                  <TableCell className="font-bold text-[#EF4444] tabular">{c.value}</TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase">
                      {c.reason}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-[#E4E6F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-title">Análise de Cohort de Retenção</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E4E6F0]">
                <TableHead className="min-w-[120px]">Entrada</TableHead>
                <TableHead>Inicial</TableHead>
                <TableHead>1º Mês</TableHead>
                <TableHead>2º Mês</TableHead>
                <TableHead>3º Mês</TableHead>
                <TableHead>6º Mês</TableHead>
                <TableHead>12º Mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { date: "Jan 2024", initial: 24, m1: "95%", m2: "92%", m3: "88%", m6: "80%", m12: "-" },
                { date: "Fev 2024", initial: 18, m1: "98%", m2: "94%", m3: "90%", m6: "-", m12: "-" },
                { date: "Mar 2024", initial: 15, m1: "100%", m2: "96%", m3: "-", m6: "-", m12: "-" },
              ].map((row) => (
                <TableRow key={row.date} className="border-[#E4E6F0]">
                  <TableCell className="font-medium text-[#0E0E16]">{row.date}</TableCell>
                  <TableCell className="text-[#0E0E16]">{row.initial}</TableCell>
                  <TableCell className="bg-[#22C55E]/20 text-[#22C55E] font-bold">{row.m1}</TableCell>
                  <TableCell className="bg-[#22C55E]/15 text-[#22C55E] font-medium">{row.m2}</TableCell>
                  <TableCell className="bg-[#22C55E]/10 text-[#22C55E]">{row.m3}</TableCell>
                  <TableCell className="bg-[#F7F8FC] text-[#8A8FA3]">{row.m6}</TableCell>
                  <TableCell className="bg-[#F7F8FC] text-[#8A8FA3]">{row.m12}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
