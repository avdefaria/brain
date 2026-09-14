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

const createCollaboratorSchema = z.object({
  fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  function: userFunctionEnum,
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

    let result: { email: string; temporaryPassword: string; userId: string };

    if (domainOk) {
      const temporaryPassword = generateTemporaryPassword(12);

      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { full_name: data.fullName.trim() },
        });

      if (createError) {
        throw new Error(createError.message);
      } else {
        const userId = created.user.id;
        const commercialRoles =
          data.commercialRoles && data.commercialRoles.length > 0
            ? data.commercialRoles
            : null;

        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          id: userId,
          full_name: data.fullName.trim(),
          function: data.function,
          employment_type: data.employmentType,
          squad_id: data.squadId ?? null,
          commercial_roles: commercialRoles,
          must_change_password: true,
          active: true,
        } as never);

        if (profileError) {
          // Evita usuario orfao no auth quando o profile falha
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw new Error(profileError.message);
        } else {
          const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
            user_id: userId,
            role: data.role,
          } as never);

          if (roleError) {
            throw new Error(roleError.message);
          } else {
            result = {
              email: normalizedEmail,
              temporaryPassword,
              userId,
            };
          }
        }
      }
    } else {
      throw new Error(DOMAIN_ERROR);
    }

    return result;
  });

const updateCollaboratorSchema = z.object({
  userId: z.string().uuid("Usuário inválido"),
  fullName: z.string().trim().min(2, "Nome completo é obrigatório"),
  function: userFunctionEnum,
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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName.trim(),
        function: data.function,
        employment_type: data.employmentType,
        squad_id: data.squadId ?? null,
        commercial_roles: commercialRoles,
        active: data.active,
      } as never)
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
