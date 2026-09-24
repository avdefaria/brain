import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_DOMAINS = ["@ongoo.com.br", "@ongoagency.com.br"];
const DOMAIN_ERROR =
  "Apenas e-mails corporativos (@ongoo.com.br ou @ongoagency.com.br) podem ser cadastrados.";

// Gate de segurança pras operações privilegiadas deste arquivo (criar
// colaborador, mudar role, resetar senha de qualquer um) — sem isso, qualquer
// usuário autenticado conseguia chamar essas funções e se promover a admin.
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

const userFunctionEnum = z.enum([
  "Designer",
  "Copywriter",
  "Gestor de Tráfego",
  "Redator",
  "Desenvolvedor",
  "Administrador",
]);

const employmentTypeEnum = z.enum(["CLT", "PJ", "Estágio"]);

const appRoleEnum = z.enum(["admin", "leader", "collaborator"]);

const LEGACY_FUNCTIONS = [
  "Designer",
  "Copywriter",
  "Gestor de Tráfego",
  "Redator",
  "Desenvolvedor",
  "Administrador",
] as const;

export type JobFunction = {
  id: string;
  name: string;
  department_id: string | null;
};

export type Department = {
  id: string;
  name: string;
};

export const getDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("departments")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown) as Department[];
  });

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((name: string) => z.string().trim().min(1, "Informe o nome do departamento").max(80).parse(name))
  .handler(async ({ context, data: rawName }) => {
    const supabase = context.supabase as any;
    const name = rawName.trim();
    const { data: existing } = await supabase.from("departments").select("id").ilike("name", name).maybeSingle();
    if (existing) throw new Error("Este departamento já existe.");
    const { data, error } = await supabase.from("departments").insert({ name }).select("id, name").single();
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) throw new Error("Este departamento já existe.");
      throw new Error(error.message);
    }
    return (data as unknown) as Department;
  });

export const getJobFunctions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as unknown as {
      from: (table: string) => any;
    };
    const { data, error } = await supabase
      .from("job_functions")
      .select("id, name, department_id")
      .order("name");
    if (error) {
      throw new Error(error.message);
    } else {
      return ((data ?? []) as unknown) as JobFunction[];
    }
  });

export const createJobFunction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { name: string; departmentId: string }) => z.object({
    name: z.string().trim().min(1, "Informe o nome do cargo").max(80),
    departmentId: z.string().uuid("Selecione um departamento"),
  }).parse(data))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as unknown as {
      from: (table: string) => any;
    };
    const name = data.name.trim();
    const { data: existing } = await supabase
      .from("job_functions")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (existing) {
      throw new Error("Este cargo já existe.");
    } else {
      const { data: created, error } = await supabase
        .from("job_functions")
        .insert({ name, department_id: data.departmentId })
        .select("id, name, department_id")
        .single();
      if (error) {
        const msg = (error.message ?? "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
          throw new Error("Este cargo já existe.");
        } else {
          throw new Error(error.message);
        }
      } else {
        return (created as unknown) as JobFunction;
      }
    }
  });

const addressSchema = z.object({
  zip: z.string().trim().optional().nullable(),
  street: z.string().trim().optional().nullable(),
  number: z.string().trim().optional().nullable(),
  complement: z.string().trim().optional().nullable(),
  neighborhood: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
}).optional();

const createCollaboratorSchema = z.object({
  fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  function: userFunctionEnum.optional(),
  jobFunctionIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um cargo"),
  squadIds: z.array(z.string().uuid()).optional().default([]),
  employmentType: employmentTypeEnum,
  role: appRoleEnum,
  avatarUrl: z.string().trim().url("Avatar inválido").nullable().optional(),
  cpf: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  birthDate: z.string().trim().optional().nullable(),
  address: addressSchema,
});

type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

function generateTemporaryPassword(length = 12): string {
  const letters = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";
  const symbols = "!@#$%&*?";
  const all = `${letters}${numbers}${symbols}`;
  const pick = (charset: string): string => {
    const idx = Math.floor(Math.random() * charset.length);
    return charset.charAt(idx);
  };
  const chars: string[] = [];
  // Garante pelo menos 1 letra, 1 numero e 1 simbolo
  chars.push(pick(letters));
  chars.push(pick(numbers));
  chars.push(pick(symbols));
  for (let i = chars.length; i < length; i = i + 1) {
    chars.push(pick(all));
  }
  // Embaralha sem early return
  for (let i = chars.length - 1; i > 0; i = i - 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }
  return chars.join("");
}

export const createCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: CreateCollaboratorInput) => createCollaboratorSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const normalizedEmail = data.email.trim().toLowerCase();
    const domainOk =
      normalizedEmail.endsWith(ALLOWED_DOMAINS[0] as string) ||
      normalizedEmail.endsWith(ALLOWED_DOMAINS[1] as string);

    if (!domainOk) {
      throw new Error(DOMAIN_ERROR);
    }

    const temporaryPassword = generateTemporaryPassword(12);

    // profiles.function é um enum legado, mantido só como fallback de exibição pra
    // qualquer tela antiga que ainda leia esse campo em vez do join com job_functions.
    // Derivado do primeiro cargo selecionado que bater com o enum; senão "Designer".
    const { data: selectedJobRows } = await (supabaseAdmin as any)
      .from("job_functions")
      .select("id, name")
      .in("id", data.jobFunctionIds);
    const selectedJobNames = ((selectedJobRows as any[]) || []).map((r) => r.name as string);
    const resolvedLegacyFunction =
      selectedJobNames.find((n) => (LEGACY_FUNCTIONS as readonly string[]).includes(n)) ||
      data.function ||
      "Designer";

    const profilePayload = {
      full_name: data.fullName.trim(),
      function: resolvedLegacyFunction,
      employment_type: data.employmentType,
      must_change_password: true,
      active: true,
      avatar_url: data.avatarUrl ?? null,
      cpf: data.cpf?.trim() || null,
      phone: data.phone?.trim() || null,
      birth_date: data.birthDate || null,
      address_zip: data.address?.zip?.trim() || null,
      address_street: data.address?.street?.trim() || null,
      address_number: data.address?.number?.trim() || null,
      address_complement: data.address?.complement?.trim() || null,
      address_neighborhood: data.address?.neighborhood?.trim() || null,
      address_city: data.address?.city?.trim() || null,
      address_state: data.address?.state?.trim() || null,
    };

    const syncJobFunctions = async (userId: string) => {
      await supabaseAdmin.from("profile_job_functions" as any).delete().eq("profile_id", userId);
      if (data.jobFunctionIds.length > 0) {
        await supabaseAdmin.from("profile_job_functions" as any).insert(
          data.jobFunctionIds.map((jobFunctionId) => ({ profile_id: userId, job_function_id: jobFunctionId })) as never,
        );
      }
    };

    const syncSquads = async (userId: string) => {
      await supabaseAdmin.from("profile_squads" as any).delete().eq("profile_id", userId);
      if (data.squadIds && data.squadIds.length > 0) {
        await supabaseAdmin.from("profile_squads" as any).insert(
          data.squadIds.map((squadId) => ({ profile_id: userId, squad_id: squadId })) as never,
        );
      }
    };

    // listUsers não tem filtro por e-mail — varre páginas como em
    // setup.functions.ts / listCollaborators.
    const findUserIdByEmail = async (email: string): Promise<string | null> => {
      const target = email.trim().toLowerCase();
      for (let page = 1; page <= 10; page = page + 1) {
        const { data: listed, error: listError } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listError) {
          break;
        }
        const users = (listed?.users ?? []) as Array<{ id: string; email?: string | null }>;
        if (users.length === 0) {
          break;
        }
        const found = users.find(
          (u) => typeof u.email === "string" && u.email.toLowerCase() === target,
        );
        if (found) {
          return found.id;
        }
        if (users.length < 1000) {
          break;
        }
      }
      return null;
    };

    const completeProfileAndRole = async (userId: string) => {
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(profilePayload as never)
        .eq("id", userId)
        .select("id");

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!updatedRows || updatedRows.length === 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId, ...profilePayload } as never, {
            onConflict: "id",
          });
        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      const roleList = (existingRoles ?? []) as Array<{ id: string }>;
      if (roleList.length > 0) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: data.role } as never)
          .eq("user_id", userId);
        if (roleUpdateError) {
          throw new Error(roleUpdateError.message);
        }
      } else {
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: data.role } as never);
        if (roleInsertError) {
          throw new Error(roleInsertError.message);
        }
      }

      await syncSquads(userId);
      await syncJobFunctions(userId);
    };

    const isAlreadyRegisteredError = (message: string): boolean => {
      const msg = (message ?? "").toLowerCase();
      return (
        msg.includes("already") ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate")
      );
    };

    // 1. Pre-checagem: e-mail já existe em auth.users? (caso do orfao)
    const preExistingId = await findUserIdByEmail(normalizedEmail);
    if (preExistingId) {
      const [{ data: existingProfile }, { data: existingRoles }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id").eq("id", preExistingId).maybeSingle(),
        supabaseAdmin.from("user_roles").select("id").eq("user_id", preExistingId).limit(1),
      ]);

      const hasProfile = !!existingProfile;
      const hasRole = ((existingRoles ?? []) as Array<{ id: string }>).length > 0;

      if (hasProfile && hasRole) {
        throw new Error("Este e-mail já está cadastrado no sistema.");
      }

      // Orfao: completa o cadastro existente em vez de criar do zero.
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        preExistingId,
        { password: temporaryPassword, email_confirm: true },
      );
      if (resetError) {
        throw new Error(resetError.message);
      }

      await completeProfileAndRole(preExistingId);

      return { email: normalizedEmail, temporaryPassword, userId: preExistingId };
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: data.fullName.trim() },
      });

    if (createError) {
      // Race: e-mail criado entre a pre-checagem e o createUser.
      if (isAlreadyRegisteredError(createError.message)) {
        const racedId = await findUserIdByEmail(normalizedEmail);
        if (racedId) {
          const [{ data: racedProfile }, { data: racedRoles }] = await Promise.all([
            supabaseAdmin.from("profiles").select("id").eq("id", racedId).maybeSingle(),
            supabaseAdmin.from("user_roles").select("id").eq("user_id", racedId).limit(1),
          ]);
          const racedComplete =
            !!racedProfile && ((racedRoles ?? []) as Array<{ id: string }>).length > 0;
          if (!racedComplete) {
            const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
              racedId,
              { password: temporaryPassword, email_confirm: true },
            );
            if (!resetError) {
              await completeProfileAndRole(racedId);
              return { email: normalizedEmail, temporaryPassword, userId: racedId };
            }
          }
        }
        throw new Error("Este e-mail já está cadastrado no sistema.");
      }
      throw new Error(createError.message);
    }

    const userId = created.user.id;

    try {
      await completeProfileAndRole(userId);
    } catch (err) {
      // Evita usuario orfao no auth quando o profile/role falha.
      // O deleteUser fica aqui (fora do caminho do erro de duplicate key da
      // versao antiga) e com try/catch proprio para nao mascarar o erro original.
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch {
        // Mantem o erro original se a limpeza tambem falhar
      }
      throw err instanceof Error ? err : new Error(String(err));
    }

    return { email: normalizedEmail, temporaryPassword, userId };
  });

const updateCollaboratorSchema = z.object({
  userId: z.string().uuid("Usuário inválido"),
  fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
  function: userFunctionEnum.optional(),
  jobFunctionIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um cargo"),
  squadIds: z.array(z.string().uuid()).optional().default([]),
  employmentType: employmentTypeEnum,
  role: appRoleEnum,
  active: z.boolean(),
  avatarUrl: z.string().trim().url("Avatar inválido").nullable().optional(),
  cpf: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  birthDate: z.string().trim().optional().nullable(),
  address: addressSchema,
});

export const updateCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: z.infer<typeof updateCollaboratorSchema>) =>
    updateCollaboratorSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: selectedJobRows } = await (supabaseAdmin as any)
      .from("job_functions")
      .select("id, name")
      .in("id", data.jobFunctionIds);
    const selectedJobNames = ((selectedJobRows as any[]) || []).map((r) => r.name as string);
    const resolvedLegacyFunction =
      selectedJobNames.find((n) => (LEGACY_FUNCTIONS as readonly string[]).includes(n)) ||
      data.function ||
      "Designer";

    const profileUpdate: Record<string, unknown> = {
      full_name: data.fullName.trim(),
      employment_type: data.employmentType,
      function: resolvedLegacyFunction,
      active: data.active,
      cpf: data.cpf?.trim() || null,
      phone: data.phone?.trim() || null,
      birth_date: data.birthDate || null,
      address_zip: data.address?.zip?.trim() || null,
      address_street: data.address?.street?.trim() || null,
      address_number: data.address?.number?.trim() || null,
      address_complement: data.address?.complement?.trim() || null,
      address_neighborhood: data.address?.neighborhood?.trim() || null,
      address_city: data.address?.city?.trim() || null,
      address_state: data.address?.state?.trim() || null,
    };
    if (data.avatarUrl !== undefined) {
      profileUpdate["avatar_url"] = data.avatarUrl ?? null;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate as never)
      .eq("id", data.userId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    await supabaseAdmin.from("profile_squads" as any).delete().eq("profile_id", data.userId);
    if (data.squadIds && data.squadIds.length > 0) {
      await supabaseAdmin.from("profile_squads" as any).insert(
        data.squadIds.map((squadId) => ({ profile_id: data.userId, squad_id: squadId })) as never,
      );
    }

    await supabaseAdmin.from("profile_job_functions" as any).delete().eq("profile_id", data.userId);
    if (data.jobFunctionIds.length > 0) {
      await supabaseAdmin.from("profile_job_functions" as any).insert(
        data.jobFunctionIds.map((jobFunctionId) => ({ profile_id: data.userId, job_function_id: jobFunctionId })) as never,
      );
    }

    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .limit(1);

    const roleList = (existingRoles ?? []) as Array<{ id: string }>;
    if (roleList.length > 0) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role } as never)
        .eq("user_id", data.userId);
      if (roleError) {
        throw new Error(roleError.message);
      }
    } else {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: data.userId,
          role: data.role,
        } as never);
      if (roleError) {
        throw new Error(roleError.message);
      }
    }

    return { success: true };
  });

const resetCollaboratorPasswordSchema = z.object({
  userId: z.string().uuid("Usuário inválido"),
});

export const resetCollaboratorPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: z.infer<typeof resetCollaboratorPasswordSchema>) =>
    resetCollaboratorPasswordSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const temporaryPassword = generateTemporaryPassword(12);

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: temporaryPassword,
      });

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true } as never)
      .eq("id", data.userId);

    return { temporaryPassword };
  });
