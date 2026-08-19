import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getClientsOverviewData = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(`
        *,
        squads (name),
        contracts (*)
      `);

    if (clientsError) throw clientsError;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    const clientsTyped = clients as any[];
    
    const totalClients = clientsTyped.length;
    const activeClients = clientsTyped.filter(c => c.status === 'active').length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClients = clientsTyped.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

    const churnedClients = clientsTyped.filter(c => c.status !== 'active').length;

    const avgHealthScore = clientsTyped.reduce((acc, c) => acc + (c.health_score || 0), 0) / (totalClients || 1);
    
    const allContracts = clientsTyped.flatMap(c => c.contracts || []);
    const totalMRR = allContracts.reduce((acc, c: any) => acc + (c.monthly_value || 0), 0);
    const avgMRR = totalMRR / (activeClients || 1);
    
    const clientsByState = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const state = c.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    const channelCounts = clientsTyped.flatMap(c => c.sales_channels || []).reduce((acc: Record<string, number>, ch) => {
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    }, {});
    const topChannels = Object.entries(channelCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    const cityCounts = clientsTyped.reduce((acc: Record<string, number>, c) => {
      const city = c.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.entries(cityCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count: count as number }));

    const leaderStats = (profiles as any[]).map(p => {
      const count = clientsTyped.filter(c => c.squad_id === p.squad_id).length;
      return {
        name: p.full_name as string,
        count,
        avatar: p.avatar_url as string | null
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

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

    const priorityClients = clientsTyped
      .filter(c => c.status === 'active')
      .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id as string,
        name: c.name as string,
        segment: c.segment as string || 'N/A',
        health_score: c.health_score as number || 0,
        risk_level: c.risk_level as string || 'low',
        responsible: (c.squads as any)?.name || 'N/A',
        cac: 850,
        contract_end: c.end_date_expected as string
      }));

    return {
      kpis: {
        active: activeClients,
        new: newClients,
        churn: churnedClients,
        ltv: 24,
        cac: 850
      },
      clientsByState,
      topChannels,
      topCities,
      leaderStats,
      squadHealthData,
      priorityClients,
      totalClients
    };
  });
