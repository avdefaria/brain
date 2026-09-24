import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeOpenMrr } from "@/lib/mrr";

export const getContractsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;

    const [{ data: contracts, error: contractsError }, { count: churnedCount, error: churnError }] = await Promise.all([
      supabase
        .from("contracts")
        .select(`*, clients:client_id(id, name, cnpj_cpf, corporate_email)`)
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "inativo"),
    ]);
    if (contractsError) throw contractsError;
    if (churnError) throw churnError;

    const allContracts = (contracts as any[]) || [];
    const activeContracts = allContracts.filter((c) => c.status === "active");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = allContracts.filter((c) => {
      if (!c.renewal_date) return false;
      const d = new Date(c.renewal_date);
      return d >= today && d <= in30Days;
    }).length;

    const mrrTotal = computeOpenMrr(allContracts);

    return {
      kpis: {
        activeContracts: activeContracts.length,
        churnedClients: churnedCount || 0,
        upcomingRenewals,
        mrrTotal,
      },
      contracts: allContracts.map((c) => ({
        id: c.id,
        contractNumber: c.contract_number,
        clientId: c.clients?.id,
        clientName: c.clients?.name || "—",
        clientCnpj: c.clients?.cnpj_cpf,
        clientEmail: c.clients?.corporate_email,
        type: c.type,
        monthlyValue: Number(c.monthly_value) || 0,
        totalValue: Number(c.total_value) || 0,
        startDate: c.start_date,
        renewalDate: c.renewal_date,
        mrrMonths: c.mrr_months,
        autoRenewal: c.auto_renewal,
        status: c.status,
        paymentMethod: c.payment_method,
        paymentDay: c.payment_day,
      })),
    };
  });
