import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getClientsOverviewData = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(`
        *,
        squads (name),
        contracts (*)
      `);

    if (clientsError) throw clientsError;

    // 2. Fetch all profiles for leaders
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    // 3. Process Data
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    
    // Determine new clients (created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newClients = clients.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

    // Churn (inactive in last 30 days - simplified logic)
    const churnedClients = clients.filter(c => c.status !== 'active').length;

    // Average LTV (simplified as months active or contract duration)
    // Here we'll calculate average health score instead for now as a proxy or if we had actual MRR
    const avgHealthScore = clients.reduce((acc, c) => acc + (c.health_score || 0), 0) / (totalClients || 1);
    
    // MRR and CAC calculations from contracts
    const allContracts = clients.flatMap(c => c.contracts || []);
    const totalMRR = allContracts.reduce((acc, c: any) => acc + (c.monthly_value || 0), 0);
    const avgMRR = totalMRR / (activeClients || 1);
    
    // Map data for Brazil Map (group by state)
    const clientsByState = clients.reduce((acc: any, c) => {
      const state = c.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    // Top Channels
    const channelCounts = clients.flatMap(c => c.sales_channels || []).reduce((acc: any, ch) => {
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    }, {});
    const topChannels = Object.entries(channelCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Top Cities
    const cityCounts = clients.reduce((acc: any, c) => {
      const city = c.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.entries(cityCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Accounts per Leader
    const leaderStats = profiles.map(p => {
      const count = clients.filter(c => c.squad_id === p.squad_id).length; // Simplified assignment
      return {
        name: p.full_name,
        count,
        avatar: p.avatar_url
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

    // Squad Stats
    const squadStats = clients.reduce((acc: any, c) => {
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

    // Priority Clients (Top 5 lowest health score)
    const priorityClients = clients
      .filter(c => c.status === 'active')
      .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        segment: c.segment,
        health_score: c.health_score,
        risk_level: c.risk_level,
        responsible: (c.squads as any)?.name || 'N/A', // Using squad as proxy for now
        cac: 850, // Mocked as not in DB yet
        contract_end: c.end_date_expected
      }));

    return {
      kpis: {
        active: activeClients,
        new: newClients,
        churn: churnedClients,
        ltv: 24, // months (mocked or calculated)
        cac: 850 // R$ (mocked)
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
