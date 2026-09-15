import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_DOMAINS = ["@ongoo.com.br", "@ongoagency.com.br"];
const DOMAIN_ERROR =
  "Apenas e-mails corporativos (@ongoo.com.br ou @ongoagency.com.br) podem ser cadastrados.";

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

const commercialRoleEnum = z.enum(["SDR", "Closer", "Dono", "Gestor"]);

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
};

export const getJobFunctions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as unknown as {
      from: (table: string) => any;
    };
    const { data, error } = await supabase
      .from("job_functions")
      .select("id, name")
      .order("name");
    if (error) {
      throw new Error(error.message);
    } else {
      return ((data ?? []) as unknown) as JobFunction[];
    }
  });

export const createJobFunction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((name: string) => z.string().trim().min(1, "Informe o nome do cargo").max(80).parse(name))
  .handler(async ({ context, data: rawName }) => {
    const supabase = context.supabase as unknown as {
      from: (table: string) => any;
    };
    const name = rawName.trim();
    if (name.length === 0) {
      throw new Error("Informe o nome do cargo");
    } else {
      const { data: existing } = await supabase
        .from("job_functions")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      if (existing) {
        throw new Error("Este cargo já existe.");
      } else {
        const { data, error } = await supabase
          .from("job_functions")
          .insert({ name })
          .select("id, name")
          .single();
        if (error) {
          const msg = (error.message ?? "").toLowerCase();
          if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
            throw new Error("Este cargo já existe.");
          } else {
            throw new Error(error.message);
          }
        } else {
          return (data as unknown) as JobFunction;
        }
      }
    }
  });

const createCollaboratorSchema = z.object({
  fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  function: userFunctionEnum.optional(),
  jobFunctionId: z.string().uuid("Cargo inválido").nullable().optional(),
  commercialRoles: z.array(commercialRoleEnum).optional().default([]),
  squadId: z.string().uuid("Squad inválido").nullable().optional(),
  employmentType: employmentTypeEnum,
  role: appRoleEnum,
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
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const normalizedEmail = data.email.trim().toLowerCase();
    const domainOk =
      normalizedEmail.endsWith(ALLOWED_DOMAINS[0] as string) ||
      normalizedEmail.endsWith(ALLOWED_DOMAINS[1] as string);

    if (!domainOk) {
      throw new Error(DOMAIN_ERROR);
    }

    const temporaryPassword = generateTemporaryPassword(12);
    const commercialRolesForPayload =
      data.commercialRoles && data.commercialRoles.length > 0 ? data.commercialRoles : null;

    let resolvedJobFunctionId: string | null = data.jobFunctionId ?? null;
    let resolvedLegacyFunction: string = data.function ?? "Designer";

    if (resolvedJobFunctionId) {
      const { data: jobRow } = await (supabaseAdmin as any)
        .from("job_functions")
        .select("id, name")
        .eq("id", resolvedJobFunctionId)
        .maybeSingle();
      const jobName = ((jobRow ?? {}) as { name?: unknown }).name;
      if (typeof jobName === "string" && jobName.length > 0) {
        if ((LEGACY_FUNCTIONS as readonly string[]).includes(jobName)) {
          resolvedLegacyFunction = jobName;
        } else {
          if (data.function) {
            resolvedLegacyFunction = data.function;
          } else {
            resolvedLegacyFunction = "Designer";
          }
        }
      } else {
        resolvedJobFunctionId = null;
      }
    } else {
      if (data.function) {
        const { data: jobByName } = await (supabaseAdmin as any)
          .from("job_functions")
          .select("id")
          .ilike("name", data.function)
          .maybeSingle();
        const foundId = ((jobByName ?? {}) as { id?: unknown }).id;
        if (typeof foundId === "string" && foundId.length > 0) {
          resolvedJobFunctionId = foundId;
        } else {
          resolvedJobFunctionId = null;
        }
        resolvedLegacyFunction = data.function;
      } else {
        resolvedJobFunctionId = null;
        resolvedLegacyFunction = "Designer";
      }
    }

    const profilePayload = {
      full_name: data.fullName.trim(),
      function: resolvedLegacyFunction,
      job_function_id: resolvedJobFunctionId,
      employment_type: data.employmentType,
      squad_id: data.squadId ?? null,
      commercial_roles: commercialRolesForPayload,
      must_change_password: true,
      active: true,
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
  jobFunctionId: z.string().uuid("Cargo inválido").nullable().optional(),
  commercialRoles: z.array(commercialRoleEnum).optional().default([]),
  squadId: z.string().uuid("Squad inválido").nullable().optional(),
  employmentType: employmentTypeEnum,
  role: appRoleEnum,
  active: z.boolean(),
});

export const updateCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: z.infer<typeof updateCollaboratorSchema>) =>
    updateCollaboratorSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const commercialRoles =
      data.commercialRoles && data.commercialRoles.length > 0
        ? data.commercialRoles
        : null;

    let resolvedJobFunctionId: string | null = data.jobFunctionId ?? null;
    let resolvedLegacyFunction: string | null = data.function ?? null;

    if (resolvedJobFunctionId) {
      const { data: jobRow } = await (supabaseAdmin as any)
        .from("job_functions")
        .select("id, name")
        .eq("id", resolvedJobFunctionId)
        .maybeSingle();
      const jobName = ((jobRow ?? {}) as { name?: unknown }).name;
      if (typeof jobName !== "string" || jobName.length === 0) {
        throw new Error("Cargo inválido");
      } else {
        if ((LEGACY_FUNCTIONS as readonly string[]).includes(jobName)) {
          resolvedLegacyFunction = jobName;
        } else {
          if (!resolvedLegacyFunction) {
            const { data: currentProfile } = await supabaseAdmin
              .from("profiles")
              .select("function")
              .eq("id", data.userId)
              .maybeSingle();
            const currentFn = ((currentProfile ?? {}) as { function?: unknown }).function;
            if (typeof currentFn === "string" && currentFn.length > 0) {
              resolvedLegacyFunction = currentFn;
            } else {
              resolvedLegacyFunction = "Designer";
            }
          }
        }
      }
    } else {
      if (data.function) {
        const { data: jobByName } = await (supabaseAdmin as any)
          .from("job_functions")
          .select("id")
          .ilike("name", data.function)
          .maybeSingle();
        const foundId = ((jobByName ?? {}) as { id?: unknown }).id;
        if (typeof foundId === "string" && foundId.length > 0) {
          resolvedJobFunctionId = foundId;
        } else {
          resolvedJobFunctionId = null;
        }
        resolvedLegacyFunction = data.function;
      } else {
        throw new Error("Informe o cargo");
      }
    }

    const profileUpdate: Record<string, unknown> = {
      full_name: data.fullName.trim(),
      employment_type: data.employmentType,
      squad_id: data.squadId ?? null,
      commercial_roles: commercialRoles,
      active: data.active,
    };
    if (resolvedJobFunctionId) {
      profileUpdate["job_function_id"] = resolvedJobFunctionId;
    } else {
      profileUpdate["job_function_id"] = null;
    }
    if (resolvedLegacyFunction) {
      profileUpdate["function"] = resolvedLegacyFunction;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate as never)
      .eq("id", data.userId);

    if (profileError) {
      throw new Error(profileError.message);
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
  .handler(async ({ data }) => {
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
