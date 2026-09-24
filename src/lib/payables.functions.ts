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
  funnel_type_id: z.string().nullable().optional(),
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
  .validator((data: { status?: string | null; categoryId?: string | null; startDate?: string | null; endDate?: string | null }) => z.object({
    status: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("payables")
      .select("*, category:category_id(id, name), funnel_type:funnel_type_id(id, name)")
      .order("due_date", { ascending: true });

    if (data.status === "atrasado") {
      query = query.neq("status", "pago").lt("due_date", new Date().toISOString().split("T")[0]);
    } else if (data.status) query = query.eq("status", data.status as "pendente" | "pago" | "atrasado");
    if (data.categoryId) query = query.eq("category_id", data.categoryId);
    if (data.startDate) query = query.gte("due_date", data.startDate);
    if (data.endDate) query = query.lte("due_date", data.endDate);

    const { data: payables, error } = await query;
    if (error) throw error;
    return payables || [];
  });

export const getPayablesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { startDate?: string | null; endDate?: string | null } | undefined) => z.object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).parse(data || {}))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    // Total a Pagar: sem período = tudo pendente (comportamento padrão de
    // sempre); com período, escopado por vencimento dentro da janela.
    let pendingQuery = context.supabase.from("payables").select("amount").eq("status", "pendente");
    if (data.startDate) pendingQuery = pendingQuery.gte("due_date", data.startDate);
    if (data.endDate) pendingQuery = pendingQuery.lte("due_date", data.endDate);
    const { data: pending, error: pendingErr } = await pendingQuery;

    // Pago: sem período = mês corrente (padrão de sempre); com período,
    // escopado por data de pagamento dentro da janela escolhida.
    let paidQuery = context.supabase.from("payables").select("amount").eq("status", "pago");
    if (data.startDate || data.endDate) {
      if (data.startDate) paidQuery = paidQuery.gte("paid_at", data.startDate);
      if (data.endDate) paidQuery = paidQuery.lte("paid_at", data.endDate + "T23:59:59");
    } else {
      paidQuery = paidQuery.gte("paid_at", firstDayOfMonth).lte("paid_at", lastDayOfMonth + "T23:59:59");
    }
    const { data: paidMonth, error: paidErr } = await paidQuery;

    // Atrasados: sempre o total real em atraso agora, não escopado por período
    // (uma conta vencida não some por estar olhando "hoje").
    const { data: overdue, error: overdueErr } = await context.supabase.from("payables").select("amount").neq("status", "pago").lt("due_date", today);

    if (pendingErr || paidErr || overdueErr) throw (pendingErr || paidErr || overdueErr);

    return {
      totalPending: pending?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
      totalPaidMonth: paidMonth?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
      totalOverdue: overdue?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0,
    };
  });

const payablesTrendsSchema = z.object({
  granularity: z.enum(["day", "week", "month"]).optional(),
});

export const getPayablesSummaryTrends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { granularity?: "day" | "week" | "month" } | undefined) => payablesTrendsSchema.parse(data || {}))
  .handler(async ({ data, context }) => {
    const granularity = data.granularity || "month";
    const now = new Date();
    const n = granularity === "day" ? 7 : 6;
    const buckets: { key: string; start: Date; end: Date }[] = [];

    if (granularity === "day") {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
      }
    } else if (granularity === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        buckets.push({ key: start.toISOString().split("T")[0] as string, start, end });
      }
    } else {
      for (let i = n - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        buckets.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, start, end });
      }
    }

    const windowStart = buckets[0]!.start;
    const windowEnd = buckets[buckets.length - 1]!.end;

    const bucketIdxOf = (iso: string | null) => {
      if (!iso) return -1;
      const t = new Date(iso).getTime();
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]!;
        if (t >= b.start.getTime() && t <= b.end.getTime()) return i;
      }
      return -1;
    };

    const { data: pendingRows } = await context.supabase
      .from("payables")
      .select("amount, due_date")
      .eq("status", "pendente")
      .gte("due_date", windowStart.toISOString().split("T")[0])
      .lte("due_date", windowEnd.toISOString().split("T")[0]);

    const { data: paidRows } = await context.supabase
      .from("payables")
      .select("amount, paid_at")
      .eq("status", "pago")
      .gte("paid_at", windowStart.toISOString())
      .lte("paid_at", windowEnd.toISOString());

    const pendingSeries = buckets.map(() => 0);
    const paidSeries = buckets.map(() => 0);

    for (const r of (pendingRows as any[]) || []) {
      const idx = bucketIdxOf(r.due_date ? `${r.due_date}T12:00:00` : null);
      if (idx >= 0) pendingSeries[idx] += Number(r.amount) || 0;
    }
    for (const r of (paidRows as any[]) || []) {
      const idx = bucketIdxOf(r.paid_at);
      if (idx >= 0) paidSeries[idx] += Number(r.amount) || 0;
    }

    const delta = (series: number[]) => {
      const c = series[series.length - 1] || 0;
      const p = series[series.length - 2] || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    return {
      trends: { pending: pendingSeries, paid: paidSeries },
      deltas: { pending: delta(pendingSeries), paid: delta(paidSeries) },
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
      funnel_type_id: data.funnel_type_id ?? null,
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
  .validator((data: { id: string; status: "pendente" | "pago" | "atrasado"; payment_method?: string | null; paid_at?: string | null }) => z.object({
    id: z.string(),
    status: z.enum(["pendente", "pago", "atrasado"]),
    payment_method: z.string().nullable().optional(),
    paid_at: z.string().nullable().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const updateData: any = {
      status: data.status,
      paid_at: data.status === "pago" ? (data.paid_at || new Date().toISOString()) : null,
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
