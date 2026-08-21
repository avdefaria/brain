import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES } from "@/lib/leads.functions";

interface CRMFunnelChartProps {
  leads: any[];
}

export const STAGE_COLORS: Record<string, string> = {
  'novos_leads': "#3D4FE8",
  'primeiro_contato': "#6373F2",
  'em_negociacao': "#8A8FA3",
  'apresentacao_agencia': "#B2B7C8",
  'proposta_enviada': "#4F5FEF",
  'follow_up': "#F5A524",
  'vendas_feitas': "#22C55E",
  'vendas_perdidas': "#EF4444",
};

export function CRMFunnelChart({ leads }: CRMFunnelChartProps) {
  const data = React.useMemo(() => {
    return STAGES.map((stage) => {
      const count = leads.filter(l => l.funnel_stage === stage.id).length;
      return {
        id: stage.id,
        name: stage.label,
        value: count,
        fill: STAGE_COLORS[stage.id] || "#8A8FA3"
      };
    });
  }, [leads]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="border-[#E4E6F0] shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full py-8">
          {/* Horizontal Trapezoidal Funnel */}
          <div className="flex w-full items-end justify-center h-32 gap-1 px-4">
            {data.map((stage, index) => {
              // Calculate width based on proportion of total or minimum width
              const widthPercentage = total > 0 ? Math.max((stage.value / total) * 100, 5) : 12.5;
              
              return (
                <div 
                  key={stage.id} 
                  className="relative group flex flex-col items-center justify-end h-full"
                  style={{ width: `${widthPercentage}%`, minWidth: '60px' }}
                >
                  {/* The Trapezoidal Segment */}
                  <div 
                    className="w-full flex items-center justify-center transition-all duration-300 hover:opacity-90"
                    style={{ 
                      backgroundColor: stage.fill,
                      height: `${Math.max((stage.value / (Math.max(...data.map(d => d.value)) || 1)) * 100, 20)}%`,
                      minHeight: '40px',
                      borderRadius: '4px',
                      clipPath: index === 0 
                        ? 'polygon(0% 20%, 100% 0%, 100% 100%, 0% 80%)' 
                        : index === data.length - 1
                        ? 'polygon(0% 0%, 100% 20%, 100% 80%, 0% 100%)'
                        : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' // Simplest trapezoid is a rect here for sequence
                    }}
                  >
                    <span className="text-white font-bold text-sm z-10 drop-shadow-sm">
                      {stage.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 px-4">
            {data.map((stage) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: stage.fill }}
                />
                <span className="text-[11px] font-medium text-[#8A8FA3] whitespace-nowrap">{stage.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
