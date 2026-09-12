import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const payableSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  category_id: z.string().nullable().optional(),
  amount: z.coerce.number().min(0),
  due_date: z.string().min(1),
  supplier_name: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const getExpenseCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("expense_categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  });

export const createExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((name: string) => z.string().min(1).parse(name))
  .handler(async ({ data: name, context }) => {
    const normalized = name.trim();
    const payload = { name: normalized };
    console.log("[createExpenseCategory payload]", JSON.stringify(payload));
    const { data, error } = await context.supabase
      .from("expense_categories")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error(
        "[createExpenseCategory error FULL]",
        JSON.stringify(
          {
            message: (error as any)?.message,
            code: (error as any)?.code,
            details: (error as any)?.details,
            hint: (error as any)?.hint,
            full: error,
          },
          null,
          2,
        ),
      );
      throw error;
    }
    return data;
  });

export const getPayables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { status?: string | null; categoryId?: string | null }) => z.object({
    status: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("payables")
      .select("*, category:category_id(id, name)")
      .order("due_date", { ascending: true });

    if (data.status === "atrasado") {
      query = query.neq("status", "pago").lt("due_date", new Date().toISOString().split("T")[0]);
    } else if (data.status) query = query.eq("status", data.status as "pendente" | "pago" | "atrasado");
    if (data.categoryId) query = query.eq("category_id", data.categoryId);

    const { data: payables, error } = await query;
    if (error) throw error;
    return payables || [];
  });

export const getPayablesSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: pending, error: pendingErr } = await context.supabase.from("payables").select("amount").eq("status", "pendente");
    const { data: paidMonth, error: paidErr } = await context.supabase.from("payables").select("amount").eq("status", "pago").gte("paid_at", firstDayOfMonth).lte("paid_at", lastDayOfMonth + "T23:59:59");
    const { data: overdue, error: overdueErr } = await context.supabase.from("payables").select("amount").neq("status", "pago").lt("due_date", today);

    if (pendingErr || paidErr || overdueErr) throw (pendingErr || paidErr || overdueErr);

    return {
      totalPending: pending?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
      totalPaidMonth: paidMonth?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
      totalOverdue: overdue?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
    };
  });

export const upsertPayable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => payableSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      category_id: data.category_id ?? null,
      supplier_name: data.supplier_name ?? null,
      payment_method: data.payment_method ?? null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await context.supabase.from("payables").update(payload).eq("id", data.id)
      : await context.supabase.from("payables").insert(payload);
    if (error) {
      console.error("[upsertPayable error]", error.message, error.details);
      throw error;
    }
    return { success: true };
  });

export const updatePayableStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string; status: "pendente" | "pago" | "atrasado"; payment_method?: string | null }) => z.object({
    id: z.string(),
    status: z.enum(["pendente", "pago", "atrasado"]),
    payment_method: z.string().nullable().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const updateData: any = {
      status: data.status,
      paid_at: data.status === "pago" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (data.payment_method) updateData.payment_method = data.payment_method;
    const { error } = await context.supabase.from("payables").update(updateData).eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const deletePayable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().parse(id))
  .handler(async ({ data: id, context }) => {
    const { error } = await context.supabase.from("payables").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  });
