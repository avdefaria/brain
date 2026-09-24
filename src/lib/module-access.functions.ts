import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const MODULE_DEFS = [
  { key: "clientes", label: "Clientes", pathPrefix: "/clients" },
  { key: "projetos", label: "Projetos", pathPrefix: "/projects" },
  { key: "comercial", label: "Comercial", pathPrefix: "/comercial" },
  { key: "financas", label: "Finanças", pathPrefix: "/financas" },
  { key: "toolkit", label: "Toolkit", pathPrefix: "/em-breve" },
  { key: "time", label: "Time", pathPrefix: "/users" },
] as const;

export type ModuleKey = (typeof MODULE_DEFS)[number]["key"];

// Sem isso, qualquer usuário autenticado conseguia ler/escrever a matriz de
// permissões direto pela server function, ignorando o gate de UI (que só
// esconde a tela pra quem não é admin, mas não bloqueia a chamada em si).
async function requireAdmin(context: { userId: string; supabase: any }): Promise<void> {
  const { data: roleRow } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .maybeSingle();
  if ((roleRow as any)?.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação.");
  }
}

export const getModuleAccessMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const supabase = context.supabase;
    const { data: departments, error: deptError } = await supabase
      .from("departments")
      .select("id, name")
      .order("name");
    if (deptError) throw deptError;

    const { data: rows, error: rowsError } = await (supabase.from("department_module_access" as any) as any)
      .select("department_id, module_key");
    if (rowsError) throw rowsError;

    const accessByDept: Record<string, string[]> = {};
    for (const r of (rows as any[]) || []) {
      const arr = accessByDept[r.department_id] || [];
      arr.push(r.module_key);
      accessByDept[r.department_id] = arr;
    }

    return {
      departments: (departments as any[]) || [],
      modules: MODULE_DEFS,
      accessByDept,
    };
  });

const setAccessSchema = z.object({
  departmentId: z.string().uuid(),
  moduleKey: z.string(),
  allowed: z.boolean(),
});

export const setDepartmentModuleAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { departmentId: string; moduleKey: string; allowed: boolean }) => setAccessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const supabase = context.supabase;
    if (data.allowed) {
      const { error } = await (supabase.from("department_module_access" as any) as any)
        .upsert({ department_id: data.departmentId, module_key: data.moduleKey }, { onConflict: "department_id,module_key" });
      if (error) throw error;
    } else {
      const { error } = await (supabase.from("department_module_access" as any) as any)
        .delete()
        .eq("department_id", data.departmentId)
        .eq("module_key", data.moduleKey);
      if (error) throw error;
    }
    return { success: true };
  });

export const getMyModuleAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { isAdmin: false, allowedModules: MODULE_DEFS.map((m) => m.key) as string[] };

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const isAdmin = (roleRow as any)?.role === "admin";
    if (isAdmin) {
      return { isAdmin: true, allowedModules: MODULE_DEFS.map((m) => m.key) as string[] };
    }

    const { data: jobLinks } = await (supabase.from("profile_job_functions" as any) as any)
      .select("job_functions(department_id)")
      .eq("profile_id", userId);
    const departmentIds = Array.from(
      new Set(((jobLinks as any[]) || []).map((r: any) => r.job_functions?.department_id).filter(Boolean))
    );

    // Sem cargo/departamento atribuído ainda: libera tudo (evita travar gente
    // que ainda não foi configurada, em vez de bloquear por padrão).
    if (departmentIds.length === 0) {
      return { isAdmin: false, allowedModules: MODULE_DEFS.map((m) => m.key) as string[] };
    }

    const { data: accessRows } = await (supabase.from("department_module_access" as any) as any)
      .select("module_key")
      .in("department_id", departmentIds);
    const allowedModules = Array.from(new Set(((accessRows as any[]) || []).map((r: any) => r.module_key)));

    return { isAdmin: false, allowedModules };
  });
