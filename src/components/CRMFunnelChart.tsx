import React from 'react';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGES } from "@/lib/leads.functions";
import { cn } from "@/lib/utils";

interface CRMFunnelChartProps {
  leads: any[];
}

const COLORS = [
  "#3D4FE8", // Ongo Indigo
  "#6373F2", // Lighter Indigo
  "#8A8FA3", // Slate
  "#B2B7C8", // Lighter Slate
  "#D1D5E0", // Even lighter Slate
  "#F5A524", // Amber (Follow up)
  "#22C55E", // Green (Vendas feitas)
  "#EF4444", // Red (Vendas perdidas)
];

export function CRMFunnelChart({ leads }: CRMFunnelChartProps) {
  const data = React.useMemo(() => {
    return STAGES.map((stage, index) => {
      const count = leads.filter(l => l.funnel_stage === stage.id).length;
      return {
        name: stage.label,
        value: count,
        fill: COLORS[index % COLORS.length]
      };
    });
  }, [leads]);

  return (
    <Card className="border-[#E4E6F0] shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-title font-bold text-[#0E0E16]">Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #E4E6F0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
              >
                <LabelList position="right" fill="#0E0E16" stroke="none" dataKey="name" />
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  position="center" 
                  fill="#fff" 
                  stroke="none" 
                  dataKey="value" 
                  style={{ fontWeight: 'bold' }}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
          {data.map((stage, index) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: stage.fill }}
              />
              <span className="text-xs font-medium text-[#8A8FA3]">{stage.name}</span>
              <span className="text-xs font-bold text-[#0E0E16]">({stage.value})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
