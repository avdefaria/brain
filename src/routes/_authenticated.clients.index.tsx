import { createFileRoute, Link } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";
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
  return <span className="text-sm text-[var(--ink-3)]">{time.toLocaleDateString()} • {time.toLocaleTimeString()} (GMT-3)</span>;
}

function ClientsOverviewPage() {
  const location = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ['clients-overview'],
    queryFn: () => getClientsOverviewData()
  });

  if (isLoading || !data) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <RefreshCw className="h-8 w-8 text-[var(--violet-500)] animate-spin opacity-20" />
      <p className="text-sm text-[var(--ink-3)]">Carregando análise da carteira...</p>
    </div>
  );


  const kpiData = [
    { label: "Clientes Ativos", value: data.kpis.active, change: "+0%", trending: "up", icon: Users, tooltip: "Total de clientes com contrato ativo" },
    { label: "Novos Clientes", value: data.kpis.new, change: "+0%", trending: "up", icon: TrendingUp, tooltip: "Clientes adquiridos nos últimos 30 dias" },
    { label: "Churn", value: data.kpis.churn, change: "-0%", trending: "down", icon: TrendingDown, tooltip: "Contratos finalizados no período" },
    { label: "LTV Médio", value: `R$ ${data.kpis.ltv.toLocaleString('pt-BR')}`, change: "+0%", trending: "up", icon: Clock, tooltip: "Receita média já paga por cliente (soma dos recebíveis pagos ÷ total de clientes)" },
    { label: "CAC Médio", value: `R$ ${data.kpis.cac.toLocaleString('pt-BR')}`, change: "-0%", trending: "down", icon: DollarSign, tooltip: "Investimento total em Marketing (Contas a Pagar) ÷ total de clientes captados" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-[var(--surface-2)]/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Visão Geral da Carteira</h1>
          <p className="text-sm text-[var(--ink-3)]">Análise analítica e distribuição de clientes</p>
        </div>
        <ClockDisplay />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label} className="border border-[var(--line-1)] shadow-sm hover:shadow-md transition-shadow group">
            <CardContent className="p-6 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-[var(--violet-500)]/8 p-1.5 rounded-lg">
                    <kpi.icon className="h-4 w-4 text-[var(--violet-500)]" />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">{kpi.label}</p>
                </div>
                <TooltipProvider>
                  <UiTooltip>
                    <TooltipTrigger><Info className="h-3.5 w-3.5 text-[var(--ink-3)] hover:text-[var(--violet-500)] transition-colors" /></TooltipTrigger>
                    <TooltipContent>{kpi.tooltip}</TooltipContent>
                  </UiTooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <h3 className="text-2xl font-bold text-[var(--ink-1)] font-sora">{kpi.value}</h3>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
                  kpi.trending === "up" ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--danger-tint)] text-[var(--danger)]"
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
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Clientes por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.clientsMonthly}>
                  <defs>
                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--violet-500)" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="var(--violet-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} cursor={{ stroke: 'var(--violet-500)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--violet-500)" strokeWidth={2} fill="url(#colorClients)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--success)]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[var(--success)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Receita média por cliente (acumulada)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.ltvMonthly}>
                  <defs>
                    <linearGradient id="colorLTV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} cursor={{ stroke: 'var(--success)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--success)" strokeWidth={2} fill="url(#colorLTV)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <div className="flex items-center">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <MapPin className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Distribuição Geográfica</CardTitle>
              <p className="text-xs text-[var(--ink-3)]">Mapa de clientes por estados brasileiros</p>
            </div>
          </div>
          <span className="bg-[var(--violet-500)]/10 text-[var(--violet-500)] px-3 py-1 rounded-full text-xs font-bold font-sora">
            {data.totalClients} {data.totalClients === 1 ? 'cliente' : 'clientes'}
          </span>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="h-[400px] relative bg-[var(--surface-2)] rounded-xl overflow-hidden border border-[var(--line-1)]">
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
                                  fill={clientCount > 0 ? `rgba(139, 92, 246, ${intensity})` : "var(--surface-2)"}
                                  stroke="var(--surface-1)"
                                  strokeWidth={0.5}
                                  style={{
                                    default: { outline: "none" },
                                    hover: { fill: "var(--violet-500)", outline: "none", cursor: "pointer" },
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
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border-[var(--line-1)] transition-colors"><Plus className="h-4 w-4 text-[var(--ink-3)]" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border-[var(--line-1)] transition-colors"><Minus className="h-4 w-4 text-[var(--ink-3)]" /></Button>
                  <Button variant="outline" size="sm" className="rounded-full px-4 text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-1)] shadow-sm hover:bg-[var(--surface-2)] border-[var(--line-1)] transition-colors text-[var(--ink-3)]">Resetar</Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-6 text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider">
                <span>Intensidade:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[var(--surface-2)] rounded-sm border border-[var(--line-1)]"></div> Poucos</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[var(--violet-500)]/12 rounded-sm"></div> Médio</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[var(--violet-500)] rounded-sm"></div> Muitos</div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h4 className="text-xs font-bold text-[var(--ink-3)] mb-4 uppercase tracking-wider">Top 3 Nichos</h4>
                <div className="space-y-4">
                  {data.topNiches.length > 0 ? data.topNiches.map((niche: any, i: number) => (
                    <div key={niche.name} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--violet-500)]/10 text-[var(--violet-500)] text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--ink-1)] group-hover:text-[var(--violet-500)] transition-colors">{niche.name}</p>
                          <p className="text-[10px] text-[var(--ink-3)]">{((niche.count / (data.totalClients || 1)) * 100).toFixed(1)}% da base</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[var(--ink-1)]">{niche.count}</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <AlertTriangle className="h-5 w-5 text-[var(--warning)] mb-2 opacity-20" />
                      <p className="text-[10px] text-[var(--ink-3)]">Sem dados de nichos</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--ink-3)] mb-4 uppercase tracking-wider">Top 3 Canais de Vendas</h4>
                <div className="space-y-4">
                  {data.topChannels.length > 0 ? data.topChannels.map((channel: any, i: number) => (
                    <div key={channel.name} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--violet-500)]/10 text-[var(--violet-500)] text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--ink-1)] group-hover:text-[var(--violet-500)] transition-colors">{channel.name}</p>
                          <p className="text-[10px] text-[var(--ink-3)]">{((channel.count / (data.totalClients || 1)) * 100).toFixed(1)}% da base</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[var(--ink-1)]">{channel.count}</span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <AlertTriangle className="h-5 w-5 text-[var(--warning)] mb-2 opacity-20" />
                      <p className="text-[10px] text-[var(--ink-3)]">Sem dados de canais</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <TrendingUp className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Novos clientes por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.charts.newClientsMonthly}>
                  <defs>
                    <linearGradient id="colorNewClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--violet-500)" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="var(--violet-500)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} cursor={{ stroke: 'var(--violet-500)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--violet-500)" strokeWidth={2} fill="url(#colorNewClients)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--warning)]/8 p-2 rounded-lg mr-4">
              <DollarSign className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">CAC médio por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.cacMonthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} cursor={{ stroke: 'var(--warning)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--warning)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--warning)', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--danger)]/8 p-2 rounded-lg mr-4">
              <TrendingDown className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Churn por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.churnMonthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} cursor={{ stroke: 'var(--danger)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--danger)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--danger)', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <AlertTriangle className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <CardTitle className="text-lg font-title font-semibold">Distribuição de risco</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[250px] flex items-center justify-center">
              {data.kpis.active > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.charts.riskData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.charts.riskData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-40">
                  <AlertTriangle className="h-10 w-10 text-[var(--warning)] mb-2" />
                  <p className="text-xs font-bold text-[var(--ink-3)]">Nenhum cliente ativo para análise</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Cards Linha 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <Users className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Contas por líder</CardTitle>
              <p className="text-xs text-[var(--ink-3)]">Quantidade de clientes ativos por líder</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {data.leaderStats.map((leader: any) => (
                <div key={leader.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-[var(--line-1)]">
                        <AvatarImage src={leader.avatar || ""} />
                        <AvatarFallback className="bg-[var(--violet-500)]/8 text-[var(--violet-500)] text-xs font-bold font-sora">
                          {leader.name?.substring(0, 2).toUpperCase() || "L"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-[var(--ink-1)]">{leader.name}</p>
                        <p className="text-[10px] text-[var(--ink-3)]">{leader.count} cliente(s)</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[var(--ink-1)] font-sora">{leader.count}</span>
                  </div>
                  <Progress value={(leader.count / (data.totalClients || 1)) * 100} className="h-1 bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
          <CardHeader className="flex flex-row items-center space-y-0 p-6 pb-2">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <BarChart3 className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Health score por squad</CardTitle>
              <p className="text-xs text-[var(--ink-3)]">Média do health score dos clientes por squad</p>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.squadHealthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: 'var(--ink-3)', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Bar dataKey="score" fill="var(--violet-500)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-[var(--line-1)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-6">
          <div className="flex items-center">
            <div className="bg-[var(--violet-500)]/8 p-2 rounded-lg mr-4">
              <Target className="h-5 w-5 text-[var(--violet-500)]" />
            </div>
            <div>
              <CardTitle className="text-lg font-title font-semibold">Clientes prioritários</CardTitle>
              <p className="text-xs text-[var(--ink-3)]">Top 5 menor health score • {data.totalClients} total</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="rounded-full border-[var(--line-1)] text-[var(--ink-3)] hover:text-[var(--violet-500)] hover:bg-[var(--violet-500)]/5 h-8 text-[10px] font-bold uppercase tracking-wider"
            >
              <Link to="/clients/manage">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--line-1)] hover:bg-transparent bg-[var(--surface-2)]/50">
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10 px-6">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10">Nicho</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10">Responsável</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10">Risco</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10">Score</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10">CAC</TableHead>
                <TableHead className="text-[10px] font-bold text-[var(--ink-3)] uppercase h-10 px-6 text-right">Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.priorityClients.map((client: any) => (
                <TableRow key={client.id} className="border-[var(--line-1)] hover:bg-[var(--surface-2)] transition-colors group">
                  <TableCell className="font-bold text-[var(--ink-1)] px-6 py-4">{client.name}</TableCell>
                  <TableCell>
                    <span className="bg-[var(--surface-2)] text-[var(--ink-3)] px-2 py-1 rounded-full text-[10px] font-bold border border-[var(--line-1)]">
                      {client.niche}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-[var(--line-1)]">
                        <AvatarFallback className="text-[8px] bg-[var(--violet-500)]/5 text-[var(--violet-500)] font-bold">{client.responsible?.substring(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-[var(--ink-1)]">{client.responsible}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold border",
                      client.risk_level === 'high' ? "bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger-tint)]" :
                      client.risk_level === 'medium' ? "bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning-tint)]" :
                      "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success-tint)]"
                    )}>
                      {client.risk_level === 'high' ? 'Crítico' : client.risk_level === 'medium' ? 'Atenção' : 'Estável'}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-[var(--ink-1)] font-sora">{client.health_score}</TableCell>
                  <TableCell className="text-[var(--ink-3)] font-sora">R$ {client.cac.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[var(--ink-3)]">
                      <Clock className="h-3 w-3" />
                      <span className={cn(
                        "text-xs font-sora",
                        client.contract_end && new Date(client.contract_end) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-[var(--danger)] font-bold" : ""
                      )}>
                        {client.contract_end ? new Date(client.contract_end).toLocaleDateString('pt-BR') : 'Sem data'}
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


