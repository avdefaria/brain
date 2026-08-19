import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getClientsOverviewData = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(`
        *,
        squads (name),
        contracts (*),
        client_sales_channels (
          sales_channels (name)
        ),
        niches (name)
      `);

    if (clientsError) throw clientsError;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    const clientsTyped = clients as any[] || [];
    
    // Last 12 months helper
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleString('pt-BR', { month: 'short' });
    });

    const activeClientsCount = clientsTyped.filter(c => c.status === 'active').length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClientsCount = clientsTyped.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

    const churnedClientsCount = clientsTyped.filter(c => c.status === 'churn' || c.status === 'inactive').length;

    const avgLTV = 24; // Mock logic or real calculation if contracts exist
    const avgCAC = 850;

    // Geographic mapping
    const clientsByState = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const state = c.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    // Top 3 Nichos
    const nicheCounts = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const niche = c.niches?.name || 'Não definido';
      acc[niche] = (acc[niche] || 0) + 1;
      return acc;
    }, {});
    const topNiches = Object.entries(nicheCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    // Top 3 Canais
    const channelCounts = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const channels = c.client_sales_channels?.map((csc: any) => csc.sales_channels?.name).filter(Boolean) || [];
      channels.forEach((ch: string) => {
        acc[ch] = (acc[ch] || 0) + 1;
      });
      return acc;
    }, {});
    const topChannels = Object.entries(channelCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    // Mock trend data for charts (12 months)
    const clientsMonthly = months.map((m, i) => ({ name: m, value: Math.max(0, activeClientsCount - (11 - i) * 2) }));
    const ltvMonthly = months.map((m) => ({ name: m, value: avgLTV + Math.floor(Math.random() * 2) }));
    const newClientsMonthly = months.map((m, i) => ({ name: m, value: Math.max(0, Math.floor(newClientsCount / 2) + (i % 3)) }));
    const cacMonthly = months.map((m) => ({ name: m, value: avgCAC + (Math.random() * 50 - 25) }));
    const churnMonthly = months.map((m) => ({ name: m, value: Math.floor(Math.random() * 2) }));

    // Risk distribution
    const riskLevels = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const risk = c.risk_level || 'low';
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, { low: 0, medium: 0, high: 0 });
    const riskData = [
      { name: 'Baixo Risco', value: riskLevels.low, color: '#22C55E' },
      { name: 'Médio Risco', value: riskLevels.medium, color: '#F5A524' },
      { name: 'Alto Risco', value: riskLevels.high, color: '#EF4444' },
    ];

    // Accounts per leader
    const leaderStats = (profiles as any[]).map(p => {
      const count = clientsTyped.filter(c => c.squad_id === p.squad_id).length;
      return {
        name: p.full_name as string,
        count,
        avatar: p.avatar_url as string | null
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

    // Health score per squad
    const squadStats = clientsTyped.reduce((acc: any, c) => {
      const squadName = (c.squads as any)?.name || 'Sem Squad';
      if (!acc[squadName]) acc[squadName] = { name: squadName, totalScore: 0, count: 0 };
      acc[squadName].totalScore += (c.health_score || 0);
      acc[squadName].count += 1;
      return acc;
    }, {});
    const squadHealthData = Object.values(squadStats).map((s: any) => ({
      name: s.name,
      score: Math.round(s.totalScore / s.count)
    }));

    // Priority clients (lowest health score)
    const priorityClients = clientsTyped
      .filter(c => c.status === 'active')
      .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id as string,
        name: c.name as string,
        niche: (c.niches as any)?.name || 'N/A',
        health_score: c.health_score as number || 0,
        risk_level: c.risk_level as string || 'low',
        responsible: (c.squads as any)?.name || 'N/A',
        cac: 850,
        contract_end: c.end_date_expected as string
      }));

    return {
      kpis: {
        active: activeClientsCount,
        new: newClientsCount,
        churn: churnedClientsCount,
        ltv: avgLTV,
        cac: avgCAC
      },
      charts: {
        clientsMonthly,
        ltvMonthly,
        newClientsMonthly,
        cacMonthly,
        churnMonthly,
        riskData
      },
      clientsByState,
      topNiches,
      topChannels,
      leaderStats,
      squadHealthData,
      priorityClients,
      totalClients: activeClientsCount
    };
  });
