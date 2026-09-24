import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeTaskEfficiency } from "@/lib/efficiency";

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, function, employment_type, active, cpf, phone, birth_date, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state");
    if (profilesError) throw profilesError;

    const profileList = (profiles as any[]) || [];
    const ids = profileList.map((p) => p.id);

    const [{ data: profileSquadRows }, { data: squads }, { data: rolesRows }, { data: tasks }, { data: taskStages }, { data: taskHistory }, { data: departments }, { data: jobFunctions }, { data: profileJobFunctionRows }] = await Promise.all([
      (supabase.from("profile_squads" as any) as any).select("profile_id, squad_id"),
      supabase.from("squads").select("id, name, color, type"),
      ids.length > 0 ? supabase.from("user_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] } as any),
      supabase.from("tasks").select("id, stage, deadline, start_date, created_at, time_tracked_seconds, task_assignees(user_id)"),
      supabase.from("task_stages").select("id, position, is_done_stage"),
      supabase.from("task_history").select("task_id, action, changes, created_at").order("created_at", { ascending: true }),
      (supabase.from("departments" as any) as any).select("id, name"),
      (supabase.from("job_functions" as any) as any).select("id, name, department_id"),
      (supabase.from("profile_job_functions" as any) as any).select("profile_id, job_function_id"),
    ]);

    const departmentById = new Map<string, any>();
    for (const d of ((departments as any[]) || [])) departmentById.set(d.id, d);
    const jobFunctionById = new Map<string, any>();
    for (const jf of ((jobFunctions as any[]) || [])) jobFunctionById.set(jf.id, jf);
    const cargosByProfile = new Map<string, any[]>();
    for (const row of ((profileJobFunctionRows as any[]) || [])) {
      const jf = jobFunctionById.get(row.job_function_id);
      if (!jf) continue;
      const dept = jf.department_id ? departmentById.get(jf.department_id) : null;
      const arr = cargosByProfile.get(row.profile_id) || [];
      arr.push({ id: jf.id, name: jf.name, department_id: jf.department_id || null, department_name: dept?.name || null });
      cargosByProfile.set(row.profile_id, arr);
    }

    let emailById = new Map<string, string>();
    if (ids.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const users = (usersData?.users ?? []) as Array<{ id: string; email?: string | null }>;
        users.forEach((u) => { if (u && typeof u.id === "string" && typeof u.email === "string") emailById.set(u.id, u.email); });
      } catch { /* segue sem e-mail se listUsers falhar */ }
    }

    const squadById = new Map<string, any>();
    for (const s of ((squads as any[]) || [])) squadById.set(s.id, s);
    const squadsByProfile = new Map<string, any[]>();
    for (const row of ((profileSquadRows as any[]) || [])) {
      const squad = squadById.get(row.squad_id);
      if (!squad) continue;
      const arr = squadsByProfile.get(row.profile_id) || [];
      arr.push({ id: squad.id, name: squad.name, color: squad.color, type: squad.type });
      squadsByProfile.set(row.profile_id, arr);
    }

    const roleByProfile = new Map<string, string>();
    for (const r of ((rolesRows as any[]) || [])) {
      if (!roleByProfile.has(r.user_id)) roleByProfile.set(r.user_id, r.role);
    }
    // CPF/telefone/nascimento/endereço são PII sensível — só admin vê de
    // todo mundo; qualquer outro colaborador só vê os próprios dados aqui.
    const isCallerAdmin = roleByProfile.get(context.userId) === "admin";

    // --- Tarefas: ativas, concluídas nos últimos 7 dias, no prazo ou não (mesmo padrão de projects.functions.ts) ---
    const doneStageIds = new Set(((taskStages as any[]) || []).filter((s) => s.is_done_stage).map((s) => s.id));
    const firstDoneAt = new Map<string, number>();
    for (const h of ((taskHistory as any[]) || [])) {
      if (h.action !== "editou a etapa" && h.action !== "criou a tarefa") continue;
      const toStage = (h.changes as any)?.to || (h.action === "criou a tarefa" ? (h.changes as any)?.stage : null);
      if (toStage && doneStageIds.has(toStage) && !firstDoneAt.has(h.task_id)) {
        firstDoneAt.set(h.task_id, new Date(h.created_at).getTime());
      }
    }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allTasks = (tasks as any[]) || [];

    const activeTasksByProfile = new Map<string, number>();
    const completedByProfile = new Map<string, number>();
    const onTimeByProfile = new Map<string, number>();
    let activeTasksTotal = 0;

    // Eficiência de execução (tempo trabalhado vs corrido) por pessoa — soma
    // bruta de segundos, mesmo critério usado nos agregados de squad em
    // projects.functions.ts, escopado às tarefas de cada responsável.
    const trackedSecondsByProfile = new Map<string, number>();
    const elapsedSecondsByProfile = new Map<string, number>();

    for (const t of allTasks) {
      const isDone = doneStageIds.has(t.stage);
      if (!isDone) activeTasksTotal += 1;
      const eff = computeTaskEfficiency({
        startDate: (t as any).start_date,
        createdAt: t.created_at,
        isDone,
        completedAtMs: isDone ? (firstDoneAt.get(t.id) ?? null) : null,
        timeTrackedSeconds: (t as any).time_tracked_seconds,
      });
      for (const a of t.task_assignees || []) {
        if (!isDone) {
          activeTasksByProfile.set(a.user_id, (activeTasksByProfile.get(a.user_id) || 0) + 1);
        }
        const doneAt = firstDoneAt.get(t.id);
        if (doneAt !== undefined && doneAt >= sevenDaysAgo) {
          completedByProfile.set(a.user_id, (completedByProfile.get(a.user_id) || 0) + 1);
          const onTime = !t.deadline || doneAt <= new Date(t.deadline).getTime();
          if (onTime) onTimeByProfile.set(a.user_id, (onTimeByProfile.get(a.user_id) || 0) + 1);
        }
        trackedSecondsByProfile.set(a.user_id, (trackedSecondsByProfile.get(a.user_id) || 0) + eff.trackedSeconds);
        elapsedSecondsByProfile.set(a.user_id, (elapsedSecondsByProfile.get(a.user_id) || 0) + eff.elapsedDays * 86400);
      }
    }

    const members = profileList.map((p) => {
      const activeTasks = activeTasksByProfile.get(p.id) || 0;
      const completedThisWeek = completedByProfile.get(p.id) || 0;
      const onTime = onTimeByProfile.get(p.id) || 0;
      const efficiency = completedThisWeek > 0 ? Math.round((onTime / completedThisWeek) * 100) : null;
      const executionTrackedSeconds = trackedSecondsByProfile.get(p.id) || 0;
      const executionElapsedSeconds = elapsedSecondsByProfile.get(p.id) || 0;
      const executionRatioPct = executionElapsedSeconds > 0 ? Math.round((executionTrackedSeconds / executionElapsedSeconds) * 1000) / 10 : null;
      const cargos = cargosByProfile.get(p.id) || [];
      const departmentIds = Array.from(new Set(cargos.map((c: any) => c.department_id).filter(Boolean)));
      const canSeePii = isCallerAdmin || p.id === context.userId;
      return {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: emailById.get(p.id) || null,
        function: p.function || null,
        cargos,
        job_function_ids: cargos.map((c: any) => c.id),
        department_ids: departmentIds,
        cargo: cargos.length > 0 ? cargos.map((c: any) => c.name).join(", ") : (p.function || null),
        role: roleByProfile.get(p.id) || null,
        employment_type: p.employment_type,
        active: p.active !== false,
        squads: squadsByProfile.get(p.id) || [],
        squad_ids: (squadsByProfile.get(p.id) || []).map((s: any) => s.id),
        cpf: canSeePii ? (p.cpf || null) : null,
        phone: canSeePii ? (p.phone || null) : null,
        birth_date: canSeePii ? (p.birth_date || null) : null,
        address_zip: canSeePii ? (p.address_zip || null) : null,
        address_street: canSeePii ? (p.address_street || null) : null,
        address_number: canSeePii ? (p.address_number || null) : null,
        address_complement: canSeePii ? (p.address_complement || null) : null,
        address_neighborhood: canSeePii ? (p.address_neighborhood || null) : null,
        address_city: canSeePii ? (p.address_city || null) : null,
        address_state: canSeePii ? (p.address_state || null) : null,
        activeTasks,
        completedThisWeek,
        efficiency,
        executionTrackedSeconds,
        executionElapsedDays: Math.round((executionElapsedSeconds / 86400) * 10) / 10,
        executionRatioPct,
      };
    });

    const withEfficiency = members.filter((m) => m.efficiency !== null);
    const avgPerformance = withEfficiency.length > 0
      ? Math.round(withEfficiency.reduce((acc, m) => acc + (m.efficiency || 0), 0) / withEfficiency.length)
      : 0;

    const activeMembers = members.filter((m) => m.active);
    const squadsInUse = new Set<string>();
    for (const m of activeMembers) for (const s of m.squads) squadsInUse.add(s.id);

    return {
      kpis: {
        totalMembers: activeMembers.length,
        squadsCount: squadsInUse.size,
        activeTasksTotal,
        avgPerformance,
      },
      members,
      squads: (squads as any[]) || [],
      departments: (departments as any[]) || [],
    };
  });
