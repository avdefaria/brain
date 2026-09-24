import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon,
  Filter,
  Inbox,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
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
import { getChurnAnalysisData, getChurnReasons } from "@/lib/clients.functions";
import { MultiSelectSalesChannels } from "@/components/MultiSelectSalesChannels"; // Reusing multi-select pattern
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const Route = createFileRoute("/_authenticated/clients/churn")({
  component: ChurnAnalysisPage,
});

function ChurnAnalysisPage() {
  const fetchChurnData = useServerFn(getChurnAnalysisData);
  const fetchChurnReasons = useServerFn(getChurnReasons);

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['churn-analysis', dateRange, selectedReasons],
    queryFn: () => fetchChurnData({ 
      data: { 
        startDate: dateRange?.from?.toISOString() || null, 
        endDate: dateRange?.to?.toISOString() || null,
        reasons: selectedReasons.length > 0 ? selectedReasons : null
      } 
    })
  });

  const { data: churnReasons = [] } = useQuery({
    queryKey: ['churn-reasons'],
    queryFn: () => fetchChurnReasons()
  });

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  const kpiData = data?.kpis || [];
  const churnByReason = data?.charts?.churnByReason || [];
  const churnMonthly = data?.charts?.churnMonthly || [];
  const recentChurn = data?.recentChurn || [];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-[var(--ink-1)]">Análise de Churn</h1>
          <p className="text-sm text-[var(--ink-3)]">Entenda os motivos de cancelamento</p>
        </div>
        <div className="flex gap-3">
          {/* Período Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-10 px-4 rounded-full border-[var(--line-1)] bg-[var(--surface-1)] text-xs font-medium gap-2 hover:bg-[var(--surface-2)]"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>
                  ) : (
                    format(dateRange.from, "dd/MM/yy")
                  )
                ) : ("Período")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                selected={{ from: dateRange?.from, to: dateRange?.to }}
                onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Motivo Multi-Select */}
          <div className="w-[200px]">
             <MultiSelectSalesChannels
                selected={selectedReasons}
                options={churnReasons}
                onChange={setSelectedReasons}
                onAddChannel={async () => {}} // Not needed here as we use existing
             />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi: any) => (
          <Card key={kpi.label} className="border-[var(--line-1)] shadow-sm">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm font-medium text-[var(--ink-3)]">{kpi.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-[var(--ink-1)] font-jakarta">
                  {kpi.label === "Receita Perdida" ? money(kpi.value) : kpi.value}
                </h3>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", kpi.trending === "down" ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--danger-tint)] text-[var(--danger)]")}>
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader><CardTitle className="text-lg font-title">Churn por Mês</CardTitle></CardHeader>
          <CardContent className="h-[300px] pt-2">
            {churnMonthly.every((m: any) => m.value === 0) ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--ink-3)]">Nenhum churn registrado no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={churnMonthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="churnMonthlyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Area type="monotone" dataKey="value" name="Clientes" stroke="var(--danger)" strokeWidth={2} fill="url(#churnMonthlyFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--line-1)] shadow-sm">
          <CardHeader><CardTitle className="text-lg font-title">Motivos de Churn</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {churnByReason.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--ink-3)]">Nenhum churn registrado ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnByReason} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line-1)" />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--ink-3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--line-1)', background: 'var(--surface-2)', color: 'var(--ink-1)', boxShadow: '0 8px 24px -12px rgba(0,0,0,.7)' }} />
                  <Bar dataKey="value" fill="var(--violet-500)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--line-1)] shadow-sm">
        <CardHeader><CardTitle className="text-lg font-title">Churn Recente</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentChurn.length === 0 ? (
            <div className="p-6 text-sm text-[var(--ink-3)]">Nenhum cliente inativado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Receita Perdida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentChurn.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-[var(--ink-1)]">{c.name}</TableCell>
                    <TableCell className="text-[var(--ink-2)]">{c.date}</TableCell>
                    <TableCell className="text-[var(--ink-2)]">{c.type}</TableCell>
                    <TableCell className="text-[var(--ink-2)]">{c.reason}</TableCell>
                    <TableCell className="text-right text-[var(--danger)] font-medium">{money(c.value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
