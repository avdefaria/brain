import { describe, expect, test } from "bun:test";
import { buildChurnReport, buildOverdueReport, type OverdueRow } from "../src/lib/edith.server";

const row = (over: Partial<OverdueRow> & { due_date: string; amount: number }): OverdueRow => ({
  id: crypto.randomUUID(),
  installment_number: 1,
  description: null,
  client_id: "c1",
  clients: { name: "Cliente A", status: "ativo" },
  contracts: { contract_number: "CT-1" },
  ...over,
});

describe("buildOverdueReport", () => {
  const today = "2026-11-26";

  test("soma por cliente, ordena por valor e faixa de atraso", () => {
    const r = buildOverdueReport(
      [
        row({ due_date: "2026-11-20", amount: 1000 }), // 6 dias
        row({ due_date: "2026-10-01", amount: 500 }), // 56 dias
        row({ due_date: "2026-08-01", amount: 200, client_id: "c2", clients: { name: "Cliente B", status: "ativo" } }), // 117 dias
      ],
      today,
    );
    expect(r.totals).toEqual({ amount: 1700, installments: 3, clients: 2 });
    expect(r.clients[0]?.client_name).toBe("Cliente A");
    expect(r.clients[0]?.total_overdue).toBe(1500);
    expect(r.clients[0]?.max_days_overdue).toBe(56);
    expect(r.clients[0]?.oldest_due_date).toBe("2026-10-01");
    expect(r.aging["1-15"]).toEqual({ installments: 1, amount: 1000 });
    expect(r.aging["31-60"]).toEqual({ installments: 1, amount: 500 });
    expect(r.aging["61+"]).toEqual({ installments: 1, amount: 200 });
  });

  test("vencimento hoje não é atraso", () => {
    const r = buildOverdueReport([row({ due_date: today, amount: 900 })], today);
    expect(r.totals.installments).toBe(0);
  });

  test("filtros por cliente e dias mínimos", () => {
    const rows = [
      row({ due_date: "2026-11-20", amount: 100 }),
      row({ due_date: "2026-08-01", amount: 300 }),
      row({ due_date: "2026-08-01", amount: 50, client_id: "c2", clients: { name: "Cliente B", status: "ativo" } }),
    ];
    expect(buildOverdueReport(rows, today, { client_name: "cliente a" }).totals.amount).toBe(400);
    expect(buildOverdueReport(rows, today, { min_days_overdue: 30 }).totals.amount).toBe(350);
  });

  test("não arredonda errado com centavos", () => {
    const r = buildOverdueReport(
      [row({ due_date: "2026-11-01", amount: 0.1 }), row({ due_date: "2026-11-01", amount: 0.2 })],
      today,
    );
    expect(r.totals.amount).toBe(0.3);
  });
});

describe("buildChurnReport", () => {
  const today = "2026-11-26";
  const client = (over: Record<string, unknown>) => ({
    id: "x",
    name: "X",
    status: "ativo",
    risk_level: "low",
    health_score: 90,
    start_date: "2026-01-01",
    cancelled_at: null,
    notice_date: null,
    expected_exit_date: null,
    revenue_at_risk: null,
    churn_reasons: null,
    ...over,
  });

  test("separa churnado, aviso prévio, em risco e saudável", () => {
    const r = buildChurnReport(
      [
        client({ id: "a", name: "Saudável" }),
        client({ id: "b", name: "Perdido", status: "inativo", cancelled_at: "2026-07-01T00:00:00Z", churn_reasons: { name: "Preço" }, risk_level: "high" }),
        client({ id: "c", name: "Aviso", notice_date: "2026-11-10", expected_exit_date: "2026-12-10" }),
        client({ id: "d", name: "Risco", health_score: 40 }),
        client({ id: "e", name: "RiscoAlto", risk_level: "high", health_score: 90 }),
      ] as any,
      [
        { client_id: "a", monthly_value: 1000, mrr_months: 1, status: "active" },
        { client_id: "b", monthly_value: 2000, mrr_months: 1, status: "cancelled" },
        { client_id: "c", monthly_value: 500, mrr_months: 2, status: "active" },
        { client_id: "d", monthly_value: 300, mrr_months: 1, status: "active" },
      ],
      today,
    );
    expect(r.summary.clients_in_base).toBe(4);
    expect(r.summary.churned_clients).toBe(1);
    expect(r.summary.mrr_lost).toBe(2000);
    expect(r.summary.mrr_in_base).toBe(2300);
    expect(r.in_notice[0]?.days_until_exit).toBe(14);
    expect(r.in_notice[0]?.mrr).toBe(1000);
    expect(r.at_risk.map((c) => c.client_name)).toEqual(["Risco", "RiscoAlto"]);
    expect(r.churn_by_reason["Preço"]).toEqual({ clients: 1, mrr_lost: 2000 });
    expect(r.churned[0]?.tenure_months).toBeCloseTo(6, 0);
  });

  test("churn sem motivo cai em bucket explícito", () => {
    const r = buildChurnReport([client({ id: "b", status: "inativo" })] as any, [], today);
    expect(r.churn_by_reason["(sem motivo registrado)"]?.clients).toBe(1);
    expect(r.churned[0]?.tenure_months).toBeNull();
  });
});
