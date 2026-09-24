import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES } from "@/lib/leads.functions";

interface CRMFunnelChartProps {
  leads: any[];
}

export const STAGE_COLORS: Record<string, string> = {
  'novos_leads': "var(--violet-500)",
  'primeiro_contato': "var(--violet-400)",
  'em_negociacao': "var(--ink-3)",
  'apresentacao_agencia': "var(--ink-4)",
  'proposta_enviada': "var(--violet-400)",
  'follow_up': "var(--warning)",
  'vendas_feitas': "var(--success)",
  'vendas_perdidas': "var(--danger)",
};

export function CRMFunnelChart({ leads }: CRMFunnelChartProps) {
  const data = React.useMemo(() => {
    return STAGES.map((stage) => {
      const count = leads.filter(l => l.funnel_stage === stage.id).length;
      return {
        id: stage.id,
        name: stage.label,
        value: count,
        fill: STAGE_COLORS[stage.id] || "var(--ink-3)"
      };
    });
  }, [leads]);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="border-[var(--line-1)] shadow-sm overflow-hidden">
      <CardHeader className="pb-6">
        <CardTitle className="text-lg font-title font-bold text-[var(--ink-1)]">Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full">
          {/* Horizontal Trapezoidal Funnel */}
          <div className="flex w-full items-end h-32 gap-0.5">
            {data.map((stage, index) => {
              // Calculate relative height based on percentage of max value
              const maxVal = Math.max(...data.map(d => d.value)) || 1;
              const heightPercent = Math.max((stage.value / maxVal) * 100, 15);
              
              // Base polygon points (x y, ...)
              // We want a sequence where segments connect.
              // To make it look like a funnel, we'll use slightly different slopes
              let clipPath = 'polygon(0% 10%, 100% 0%, 100% 100%, 0% 90%)';
              if (index === data.length - 1) {
                clipPath = 'polygon(0% 0%, 100% 10%, 100% 90%, 0% 100%)';
              } else if (index > 0) {
                // Alternating or steady slope
                clipPath = index % 2 === 0 
                  ? 'polygon(0% 10%, 100% 0%, 100% 100%, 0% 90%)'
                  : 'polygon(0% 0%, 100% 10%, 100% 90%, 0% 100%)';
              }

              return (
                <div 
                  key={stage.id} 
                  className="flex-1 relative group flex flex-col items-center justify-center h-full"
                >
                  <div 
                    className="w-full flex items-center justify-center transition-all duration-300 hover:brightness-110"
                    style={{ 
                      backgroundColor: stage.fill,
                      height: `${heightPercent}%`,
                      clipPath: clipPath
                    }}
                  >
                    <span className="text-white font-bold text-xs z-10">
                      {stage.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {data.map((stage) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: stage.fill }}
                />
                <span className="text-[11px] font-medium text-[var(--ink-3)]">{stage.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

    </Card>
  );
}
