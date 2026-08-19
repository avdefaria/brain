import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { logSecurityEvent } from "./security-logger";

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

    // Get profiles linked to squads
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, function, avatar_url, squad_id, birth_date');
    
    if (profilesError) throw profilesError;

    // Get all tasks for stats
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, stage, deadline, client_id');
    
    if (tasksError) throw tasksError;

    // Get company events
    const { data: events, error: eventsError } = await supabase
      .from('company_events' as any)
      .select('*')
      .order('date');
    
    // Get special projects for timeline
    const { data: specialProjects, error: spError } = await supabase
      .from('special_projects' as any)
      .select('*, client:client_id(name), squad:squad_id(name, color)')
      .order('start_date');

    // 3. Process Squads
    const processedSquads = squadsData.map(s => {
      const squadProfiles = profiles.filter(p => p.squad_id === s.id);
      const leader = profiles.find(p => p.id === (s as any).leader_id) || squadProfiles[0] || null;
      const squadClients = s.clients || [];
      const squadClientIds = squadClients.map(c => c.id);
      
      const totalHealth = squadClients.reduce((acc: number, curr: any) => acc + (curr.health_score || 0), 0);
      const avgHealth = squadClients.length > 0 ? Math.round(totalHealth / squadClients.length) : null;
      
      let totalDeliveries = 0;
      let completedDeliveries = 0;
      squadClients.forEach((c: any) => {
        (c.project_deliveries || []).forEach((d: any) => {
          totalDeliveries += d.target_count || 0;
          completedDeliveries += d.current_count || 0;
        });
      });

      const squadTasks = tasks.filter(t => t.client_id && squadClientIds.includes(t.client_id));
      const lateTasks = squadTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.stage !== 'done').length;

      return {
        id: s.id,
        name: s.name,
        color: (s as any).color || '#3D4FE8', 
        leader: leader ? {
          id: leader.id,
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
          total: totalTarget || 10,
          completed: totalCurrent || 0
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks
        }
      },
      events: events || [],
      birthdays: profiles.filter(p => p.birth_date).map(p => ({
        name: `Aniversário: ${p.full_name}`,
        date: p.birth_date,
        type: 'birthday'
      })),
      specialProjects: specialProjects || []
    };
  });

export const createSquad = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string(),
    color: z.string(),
    leader_id: z.string().optional()
  }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from('squads')
      .insert({
        name: data.name,
        color: data.color,
        leader_id: data.leader_id
      } as any);

    if (error) {
      await logSecurityEvent({
        action: 'INSERT',
        tableName: 'squads',
        details: data,
        errorMessage: error.message
      });
      throw error;
    }
    return { success: true };
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
        color: data.color,
        leader_id: data.leader_id
      } as any)
      .eq('id', data.id);

    if (error) {
      await logSecurityEvent({
        action: 'UPDATE',
        tableName: 'squads',
        recordId: data.id,
        details: data,
        errorMessage: error.message
      });
      throw error;
    }
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

export const createSpecialProject = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    name: z.string(),
    client_id: z.string(),
    squad_id: z.string().optional(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string().optional(),
    color: z.string().optional()
  }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from('special_projects' as any)
      .insert(data);
    
    if (error) throw error;
    return { success: true };
  });
