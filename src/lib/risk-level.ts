export type RiskLevel = "low" | "medium" | "high";

interface ReceivableForRisk {
  status: string | null;
  due_date: string | null;
}

/**
 * Risco = pior sinal entre saúde (Health Score) e pagamentos (recebíveis atrasados).
 * Cortes confirmados com o Alan: saúde >=70 boa / 40-69 atenção / <40 crítica;
 * pagamento OK sem atraso / atenção com 1 atrasado / crítico com 2+ atrasados ou 30+ dias de atraso.
 */
export function computeRiskLevel(
  healthScore: number | null | undefined,
  receivables: ReceivableForRisk[] | null | undefined
): RiskLevel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = (receivables || []).filter((r) => {
    if (!r.due_date || r.status === "pago") return false;
    return new Date(r.due_date) < today;
  });

  const maxOverdueDays = overdue.reduce((max, r) => {
    const days = Math.floor((today.getTime() - new Date(r.due_date as string).getTime()) / 86400000);
    return Math.max(max, days);
  }, 0);

  const hs = healthScore ?? 100;
  const healthBand: "good" | "warning" | "critical" = hs >= 70 ? "good" : hs >= 40 ? "warning" : "critical";

  const paymentBand: "good" | "warning" | "critical" =
    overdue.length >= 2 || maxOverdueDays >= 30 ? "critical" : overdue.length === 1 ? "warning" : "good";

  if (healthBand === "critical" || paymentBand === "critical") return "high";
  if (healthBand === "warning" || paymentBand === "warning") return "medium";
  return "low";
}
