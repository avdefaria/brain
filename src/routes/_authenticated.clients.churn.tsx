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
import { getChurnAnalysisData, getChurnReasons } from "@/lib/clients.functions";
import { MultiSelectSalesChannels } from "@/components/MultiSelectSalesChannels"; // Reusing multi-select pattern

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
        reasons: selectedReasons.length > 0 ? selectedReasons : undefined
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
          <h1 className="text-2xl font-title font-bold text-[#0E0E16]">Análise de Churn</h1>
          <p className="text-sm text-[#8A8FA3]">Entenda os motivos de cancelamento</p>
        </div>
        <div className="flex gap-3">
          {/* Período Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-10 px-4 rounded-full border-[#E4E6F0] bg-white text-xs font-medium gap-2 hover:bg-[#F7F8FC]"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-[#8A8FA3]" />
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
          <Card key={kpi.label} className="border-[#E4E6F0] shadow-sm">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm font-medium text-[#8A8FA3]">{kpi.label}</p>
              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-[#0E0E16] font-jakarta">
                  {kpi.label === "Receita Perdida" || kpi.label === "Churn por Mês" 
                    ? "Disponível após Finanças → Recebimentos" 
                    : kpi.value}
                </h3>
                {kpi.label !== "Receita Perdida" && (
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", kpi.trending === "down" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        {kpi.change}
                    </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader><CardTitle className="text-lg font-title">Churn por Mês</CardTitle></CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center bg-[#F7F8FC] border border-dashed border-[#E4E6F0] rounded-xl m-4 text-[#8A8FA3]">
              Disponível após Finanças → Recebimentos
          </CardContent>
        </Card>

        <Card className="border-[#E4E6F0] shadow-sm">
          <CardHeader><CardTitle className="text-lg font-title">Motivos de Churn</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnByReason} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E6F0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#8A8FA3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3D4FE8" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
