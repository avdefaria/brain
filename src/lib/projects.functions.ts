import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const getProjectsOverviewData = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Get Squads with leader info and clients
    const { data: squadsData, error: squadsError } = await supabase
      .from('squads')
      .select(`
        *,
        clients (
          id,
          health_score,
          project_deliveries (
            id,
            current_count,
            target_count,
            status
          )
        )
      `);

    if (squadsError) throw squadsError;

    // Get profiles linked to squads to find leaders (assuming leader logic)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, function, avatar_url, squad_id');
    
    if (profilesError) throw profilesError;

    // Get all tasks for stats
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, stage, deadline, squad_id');
    
    if (tasksError) throw tasksError;

    // 3. Process Squads
    const processedSquads = squadsData.map(s => {
      const squadProfiles = profiles.filter(p => p.squad_id === s.id);
      // For demo/simplicity, first profile in squad is "leader" if not otherwise specified
      const leader = squadProfiles[0] || null;
      const squadClients = s.clients || [];
      
      const totalHealth = squadClients.reduce((acc: number, curr: any) => acc + (curr.health_score || 0), 0);
      const avgHealth = squadClients.length > 0 ? Math.round(totalHealth / squadClients.length) : null;
      
      // Calculate delivery progress from project_deliveries
      let totalDeliveries = 0;
      let completedDeliveries = 0;
      squadClients.forEach((c: any) => {
        (c.project_deliveries || []).forEach((d: any) => {
          totalDeliveries += d.target_count || 0;
          completedDeliveries += d.current_count || 0;
        });
      });

      const squadTasks = tasks.filter(t => t.squad_id === s.id);
      const lateTasks = squadTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.stage !== 'done').length;

      return {
        id: s.id,
        name: s.name,
        color: (s as any).color || '#3D4FE8', 
        leader: leader ? {
          name: leader.full_name,
          role: leader.function,
          avatar: leader.avatar_url
        } : null,
        membersCount: squadProfiles.length,
        accountsCount: squadClients.length,
        healthScore: avgHealth,
        progress: totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0,
        deliveries: completedDeliveries,
        totalDeliveries: totalDeliveries,
        pending: squadTasks.filter(t => t.stage !== 'done').length,
        late: lateTasks
      };
    });

    // 4. Overall Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.stage === 'done').length;
    
    // Planning stats from deliveries
    let totalTarget = 0;
    let totalCurrent = 0;
    squadsData.forEach(s => {
      s.clients?.forEach((c: any) => {
        c.project_deliveries?.forEach((d: any) => {
          totalTarget += d.target_count || 0;
          totalCurrent += d.current_count || 0;
        });
      });
    });

    return {
      squads: processedSquads,
      stats: {
        plannings: {
          total: totalTarget || 10, // Fallback if no data
          completed: totalCurrent || 0
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks
        }
      }
    };
  });

export const updateSquad = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    leader_id: z.string().optional()
  }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from('squads')
      .update({
        name: data.name,
        color: data.color
      } as any)
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });

export const deleteSquad = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', data.id);

    if (error) throw error;
    return { success: true };
  });
