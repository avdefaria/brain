import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, TrendingDown, BarChart3, DollarSign, MapPin, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Briefcase, TrendingUp, Target, Clock, Search, RefreshCw, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getClientsOverviewData } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsOverviewPage,
});

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="text-sm text-[#8A8FA3]">{time.toLocaleDateString()} • {time.toLocaleTimeString()} (GMT-3)</span>;
}

function ClientsOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['clients-overview'],
    queryFn: () => getClientsOverviewData()
  });

  if (isLoading || !data) return <div className="p-8">Carregando...</div>;

  const kpiData = [
    { label: "Clientes Ativos", value: data.kpis.active, change: "+0%", trending: "up" },
    { label: "Novos Clientes", value: data.kpis.new, change: "+0%", trending: "up" },
    { label: "Churn", value: `${data.kpis.churn}`, change: "-0%", trending: "down" },
    { label: "LTV Médio", value: `${data.kpis.ltv} meses`, change: "+0%", trending: "up" },
    { label: "CAC Médio", value: `R$ ${data.kpis.cac}`, change: "-0%", trending: "down" },
  ];

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
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-[#8A8FA3] uppercase">{kpi.label}</p>
                <TooltipProvider>
                  <UiTooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-[#8A8FA3]" /></TooltipTrigger>
                    <TooltipContent>Info sobre {kpi.label}</TooltipContent>
                  </UiTooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-[#0E0E16] font-jakarta">{kpi.value}</h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
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

      {/* Gráficos Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Clientes por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ name: 'Jan', value: 10 }, { name: 'Fev', value: 20 }, { name: 'Mar', value: 15 }]}>
                  <defs>
                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D4FE8" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#3D4FE8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#3D4FE8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={2} fill="url(#colorClients)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">LTV por mês (em meses)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ name: 'Jan', value: 20 }, { name: 'Fev', value: 22 }, { name: 'Mar', value: 25 }]}>
                  <defs>
                    <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#22C55E', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} fill="url(#colorLTV)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6 border-[#E4E6F0] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <CardTitle>Distribuição Geográfica</CardTitle>
          <span className="bg-[#3D4FE8]/10 text-[#3D4FE8] px-3 py-1 rounded-full text-xs font-bold">Total: {data.totalClients}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-[400px] relative bg-[#F7F8FC] rounded-xl overflow-hidden">
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 700, center: [-55, -15] }}>
                <Geographies geography="/brazil.json">
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography key={geo.rsmKey} geography={geo} fill="#E4E6F0" stroke="#FFFFFF" />
                    ))
                  }
                </Geographies>
              </ComposableMap>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full">+</Button>
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full">-</Button>
                <Button variant="outline" size="sm" className="rounded-full px-3 text-xs">Resetar</Button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs font-bold text-[#8A8FA3]">
              Legenda:
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#E4E6F0] rounded-full"></div> Poucos</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3D4FE8]/40 rounded-full"></div> Médio</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3D4FE8] rounded-full"></div> Muitos</div>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-bold text-[#0E0E16] mb-4">Top 3 Canais de vendas</h4>
              <div className="space-y-4">
                {data.topChannels.map((ch, i) => (
                  <div key={ch.name} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className="text-xs font-bold text-[#3D4FE8]">#{i+1}</span>
                      <div>
                        <p className="text-xs font-bold text-[#0E0E16]">{ch.name}</p>
                        <p className="text-[10px] text-[#8A8FA3]">{((ch.count / (data.totalClients || 1)) * 100).toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0E0E16]">{ch.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0E0E16] mb-4">Top 3 Cidades (Brasil)</h4>
              <div className="space-y-4">
                {data.topCities.map((city, i) => (
                  <div key={city.name} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className="text-xs font-bold text-[#3D4FE8]">#{i+1}</span>
                      <div>
                        <p className="text-xs font-bold text-[#0E0E16]">{city.name}</p>
                        <p className="text-[10px] text-[#8A8FA3]">{((city.count / (data.totalClients || 1)) * 100).toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0E0E16]">{city.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">Novos clientes por mês</CardTitle>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{ name: 'Jan', value: 10 }, { name: 'Fev', value: 20 }, { name: 'Mar', value: 15 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3D4FE8" fill="#3D4FE8" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">CAC médio por mês</CardTitle>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: 'Jan', value: 800 }, { name: 'Fev', value: 750 }, { name: 'Mar', value: 850 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Gráficos Linha 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">Churn por mês</CardTitle>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: 'Jan', value: 2 }, { name: 'Fev', value: 1 }, { name: 'Mar', value: 3 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">Distribuição de risco</CardTitle>
          <div className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: 'Baixo', value: 70 }, { name: 'Médio', value: 20 }, { name: 'Alto', value: 10 }]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell fill="#22C55E" />
                  <Cell fill="#F5A524" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      {/* Cards Linha 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">Contas por líder</CardTitle>
          <div className="space-y-6">
            {data.leaderStats.map((leader: any) => (
              <div key={leader.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={leader.avatar || ""} />
                      <AvatarFallback className="bg-[#3D4FE8]/10 text-[#3D4FE8] text-xs">
                        {leader.name?.substring(0, 2).toUpperCase() || "L"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-[#0E0E16]">{leader.name}</p>
                      <p className="text-[10px] text-[#8A8FA3]">{leader.count} cliente(s)</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#0E0E16]">{leader.count}</span>
                </div>
                <Progress value={(leader.count / (data.totalClients || 1)) * 100} className="h-1" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 border-[#E4E6F0] shadow-sm">
          <CardTitle className="text-lg font-title mb-6">Health score por squad</CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.squadHealthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3D4FE8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-[#E4E6F0] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <CardTitle>Clientes prioritários</CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#8A8FA3]">Alto Risco → Baixo</span>
            <span className="text-xs text-[#8A8FA3]">5 por página</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[#E4E6F0] hover:bg-transparent">
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">Cliente</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">Segmento</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">Responsável</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">Risco</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">Score</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase">CAC</TableHead>
              <TableHead className="text-xs font-bold text-[#8A8FA3] uppercase text-right">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.priorityClients.map((client: any) => (
              <TableRow key={client.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC] transition-colors">
                <TableCell className="font-bold text-[#0E0E16]">{client.name}</TableCell>
                <TableCell>
                  <span className="bg-[#F7F8FC] text-[#8A8FA3] px-2 py-1 rounded-full text-[10px] font-bold border border-[#E4E6F0]">
                    {client.segment}
                  </span>
                </TableCell>
                <TableCell>{client.responsible}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold border",
                    client.risk_level === 'high' ? "bg-red-50 text-red-600 border-red-100" :
                    client.risk_level === 'medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                    "bg-green-50 text-green-600 border-green-100"
                  )}>
                    {client.risk_level === 'high' ? 'Crítico' : client.risk_level === 'medium' ? 'Atenção' : 'Estável'}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-[#0E0E16]">{client.health_score}</TableCell>
                <TableCell className="text-[#8A8FA3]">R$ {client.cac}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 text-[#8A8FA3]">
                    <Clock className="h-3 w-3" />
                    <span className={cn(
                      "text-xs",
                      client.contract_end && new Date(client.contract_end) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-red-500 font-bold" : ""
                    )}>
                      {client.contract_end ? new Date(client.contract_end).toLocaleDateString() : 'Sem data'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}


