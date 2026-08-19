import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, TrendingDown, BarChart3, DollarSign, MapPin, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Briefcase, TrendingUp, Target, Clock, Search, RefreshCw, Info,
  Plus, Minus
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

  if (isLoading || !data) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <RefreshCw className="h-8 w-8 text-[#3D4FE8] animate-spin opacity-20" />
      <p className="text-sm text-[#8A8FA3]">Carregando análise da carteira...</p>
    </div>
  );

  if (data.totalClients === 0) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-[#F7F8FC]/50 min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão Geral da Carteira</h1>
            <p className="text-sm text-[#8A8FA3]">Análise analítica e distribuição de clientes</p>
          </div>
          <ClockDisplay />
        </div>
        <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4 border-[#E4E6F0]">
          <div className="h-16 w-16 rounded-full bg-[#3D4FE8]/5 flex items-center justify-center text-[#3D4FE8]">
            <Users className="h-8 w-8 opacity-20" />
          </div>
          <div>
            <h3 className="text-lg font-title font-bold text-[#0E0E16]">Nenhum dado disponível</h3>
            <p className="text-sm text-[#8A8FA3]">Cadastre clientes para visualizar as métricas analíticas.</p>
          </div>
          <Button asChild className="bg-[#3D4FE8] hover:bg-[#3D4FE8]/90 rounded-full">
            <Link to="/clients/manage">Gerenciar Clientes</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const kpiData = [
    { label: "Clientes Ativos", value: data.kpis.active, change: "+0%", trending: "up", icon: Users, tooltip: "Total de clientes com contrato ativo" },
    { label: "Novos Clientes", value: data.kpis.new, change: "+0%", trending: "up", icon: TrendingUp, tooltip: "Clientes adquiridos nos últimos 30 dias" },
    { label: "Churn", value: data.kpis.churn, change: "-0%", trending: "down", icon: TrendingDown, tooltip: "Contratos finalizados no período" },
    { label: "LTV Médio", value: `${data.kpis.ltv} meses`, change: "+0%", trending: "up", icon: Clock, tooltip: "Tempo médio de permanência do cliente" },
    { label: "CAC Médio", value: `R$ ${data.kpis.cac}`, change: "-0%", trending: "down", icon: DollarSign, tooltip: "Custo médio de aquisição por cliente" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-[#F7F8FC]/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Visão Geral da Carteira</h1>
          <p className="text-sm text-[#8A8FA3]">Análise analítica e distribuição de clientes</p>
        </div>
        <ClockDisplay />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border border-[#E4E6F0] shadow-sm hover:shadow-md transition-shadow group">
            <CardContent className="p-6 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-[#3D4FE8]/8 p-1.5 rounded-lg">
                    <kpi.icon className="h-4 w-4 text-[#3D4FE8]" />
                  </div>
                  <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">{kpi.label}</p>
                </div>
                <TooltipProvider>
                  <UiTooltip>
                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-[#8A8FA3] hover:text-[#3D4FE8] transition-colors" /></TooltipTrigger>
                    <TooltipContent>{kpi.tooltip}</TooltipContent>
                  </UiTooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-baseline justify-between pt-1">
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
            <div className="bg-[#22C55E]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[#22C55E]" />
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

      <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <div className="flex items-center">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <MapPin className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Distribuição Geográfica</CardTitle>
              <p className="text-xs text-[#8A8FA3]">Mapa de clientes por estados brasileiros</p>
            </div>
          </div>
          <span className="bg-[#3D4FE8]/10 text-[#3D4FE8] px-3 py-1 rounded-full text-xs font-bold font-jakarta">
            {data.totalClients} {data.totalClients === 1 ? 'cliente' : 'clientes'}
          </span>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-[400px] relative bg-[#F7F8FC] rounded-xl overflow-hidden border border-[#E4E6F0]">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 700, center: [-55, -15] }}>
                  <Geographies geography="/brazil.json">
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const stateName = geo.properties.name;
                        const clientCount = data.clientsByState[stateName] || 0;
                        const intensity = clientCount > 0 ? Math.min(0.2 + (clientCount / (data.totalClients || 1)) * 0.8, 1) : 0;
                        
                        return (
                          <TooltipProvider key={geo.rsmKey}>
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <Geography
                                  geography={geo}
                                  fill={clientCount > 0 ? `rgba(61, 79, 232, ${intensity})` : "#F0F1F7"}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.5}
                                  style={{
                                    default: { outline: "none" },
                                    hover: { fill: "#3D4FE8", outline: "none", cursor: "pointer" },
                                    pressed: { outline: "none" }
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-bold">{stateName}</p>
                                <p className="text-xs">{clientCount > 0 ? `${clientCount} cliente(s)` : 'Sem clientes'}</p>
                              </TooltipContent>
                            </UiTooltip>
                          </TooltipProvider>
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-white hover:bg-[#F7F8FC] border-[#E4E6F0] transition-colors"><Plus className="h-4 w-4 text-[#8A8FA3]" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-white hover:bg-[#F7F8FC] border-[#E4E6F0] transition-colors"><Minus className="h-4 w-4 text-[#8A8FA3]" /></Button>
                  <Button variant="outline" size="sm" className="rounded-full px-4 text-[10px] font-bold uppercase tracking-wider bg-white shadow-sm hover:bg-[#F7F8FC] border-[#E4E6F0] transition-colors text-[#8A8FA3]">Resetar</Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-6 text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">
                <span>Intensidade:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#F0F1F7] rounded-sm border border-[#E4E6F0]"></div> Poucos</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#3D4FE8]/12 rounded-sm"></div> Médio</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#3D4FE8] rounded-sm"></div> Muitos</div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h4 className="text-xs font-bold text-[#8A8FA3] mb-4 uppercase tracking-wider">Top 3 Canais de vendas</h4>
                <div className="space-y-4">
                  {data.topChannels.length > 0 ? data.topChannels.map((ch, i) => (
                    <div key={ch.name} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3D4FE8]/10 text-[#3D4FE8] text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">{ch.name}</p>
                          <p className="text-[10px] text-[#8A8FA3]">{((ch.count / (data.totalClients || 1)) * 100).toFixed(1)}% da base</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#0E0E16]">{ch.count}</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <AlertTriangle className="h-5 w-5 text-[#F5A524] mb-2 opacity-20" />
                      <p className="text-[10px] text-[#8A8FA3]">Sem dados de canais</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#8A8FA3] mb-4 uppercase tracking-wider">Top 3 Cidades (Brasil)</h4>
                <div className="space-y-4">
                  {data.topCities.length > 0 ? data.topCities.map((city, i) => (
                    <div key={city.name} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3D4FE8]/10 text-[#3D4FE8] text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0E0E16] group-hover:text-[#3D4FE8] transition-colors">{city.name}</p>
                          <p className="text-[10px] text-[#8A8FA3]">{((city.count / (data.totalClients || 1)) * 100).toFixed(1)}% da base</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#0E0E16]">{city.count}</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <AlertTriangle className="h-5 w-5 text-[#F5A524] mb-2 opacity-20" />
                      <p className="text-[10px] text-[#8A8FA3]">Sem dados de cidades</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Novos clientes por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ name: 'Jan', value: 10 }, { name: 'Fev', value: 20 }, { name: 'Mar', value: 15 }]}>
                  <defs>
                    <linearGradient id="colorNewClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D4FE8" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#3D4FE8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#3D4FE8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="#3D4FE8" strokeWidth={2} fill="url(#colorNewClients)" />
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
            <CardTitle className="text-lg font-title font-semibold">CAC médio por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{ name: 'Jan', value: 800 }, { name: 'Fev', value: 750 }, { name: 'Mar', value: 850 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#F5A524', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="value" stroke="#F5A524" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F5A524', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <TrendingDown className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Churn por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{ name: 'Jan', value: 2 }, { name: 'Fev', value: 1 }, { name: 'Mar', value: 3 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{ stroke: '#EF4444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <AlertTriangle className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Distribuição de risco</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px] flex items-center justify-center">
              {data.kpis.active > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: 'Baixo', value: 70 }, { name: 'Médio', value: 20 }, { name: 'Alto', value: 10 }]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      <Cell fill="#22C55E" />
                      <Cell fill="#F5A524" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-40">
                  <AlertTriangle className="h-10 w-10 text-[#F5A524] mb-2" />
                  <p className="text-xs font-bold text-[#8A8FA3]">Nenhum cliente ativo para análise</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Cards Linha 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <Users className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Contas por líder</CardTitle>
              <p className="text-xs text-[#8A8FA3]">Quantidade de clientes ativos por líder</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {data.leaderStats.map((leader: any) => (
                <div key={leader.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-[#E4E6F0]">
                        <AvatarImage src={leader.avatar || ""} />
                        <AvatarFallback className="bg-[#3D4FE8]/8 text-[#3D4FE8] text-xs font-bold font-jakarta">
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
                  <Progress value={(leader.count / (data.totalClients || 1)) * 100} className="h-1 bg-[#F7F8FC]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <BarChart3 className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Health score por squad</CardTitle>
              <p className="text-xs text-[#8A8FA3]">Média do health score dos clientes por squad</p>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.squadHealthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#8A8FA3', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="score" fill="#3D4FE8" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-[#E4E6F0] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <div className="flex items-center">
            <div className="bg-[#3D4FE8]/8 p-2 rounded-lg mr-4">
              <Target className="h-5 w-5 text-[#3D4FE8]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Clientes prioritários</CardTitle>
              <p className="text-xs text-[#8A8FA3]">Top 5 menor health score • {data.totalClients} total</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#F7F8FC] px-3 py-1.5 rounded-full border border-[#E4E6F0]">
              <Search className="h-3 w-3 text-[#8A8FA3]" />
              <span className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">Alto Risco → Baixo</span>
            </div>
            <div className="bg-[#F7F8FC] px-3 py-1.5 rounded-full border border-[#E4E6F0]">
              <span className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">5 por página</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E4E6F0] hover:bg-transparent bg-[#F7F8FC]/50">
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10 px-6">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10">Nicho</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10">Responsável</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10">Risco</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10">Score</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10">CAC</TableHead>
                <TableHead className="text-[10px] font-bold text-[#8A8FA3] uppercase h-10 px-6 text-right">Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.priorityClients.map((client: any) => (
                <TableRow key={client.id} className="border-[#E4E6F0] hover:bg-[#F7F8FC] transition-colors group">
                  <TableCell className="font-bold text-[#0E0E16] px-6 py-4">{client.name}</TableCell>
                  <TableCell>
                    <span className="bg-[#F7F8FC] text-[#8A8FA3] px-2 py-1 rounded-full text-[10px] font-bold border border-[#E4E6F0]">
                      {client.niche}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-[#E4E6F0]">
                        <AvatarFallback className="text-[8px] bg-[#3D4FE8]/5 text-[#3D4FE8] font-bold">{client.responsible?.substring(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-[#0E0E16]">{client.responsible}</span>
                    </div>
                  </TableCell>
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
                  <TableCell className="font-bold text-[#0E0E16] font-jakarta">{client.health_score}</TableCell>
                  <TableCell className="text-[#8A8FA3] font-jakarta">R$ {client.cac}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[#8A8FA3]">
                      <Clock className="h-3 w-3" />
                      <span className={cn(
                        "text-xs font-jakarta",
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
        </CardContent>
      </Card>
    </div>
  );
}


