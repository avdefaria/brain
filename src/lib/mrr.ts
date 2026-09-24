interface ContractForMrr {
  status: string | null;
  type: string | null;
  monthly_value: number | string | null;
  mrr_months: number | null;
}

/**
 * MRR = soma de (valor mensal × meses de recorrência) dos contratos recorrentes.
 * Por padrão só considera contratos com status 'active' (MRR corrente/em aberto).
 * Passe onlyActive:false para relatórios históricos (ex: MRR perdido em churn),
 * onde contratos já cancelados devem continuar contando.
 */
export function computeOpenMrr(contracts: ContractForMrr[] | null | undefined, opts?: { onlyActive?: boolean }): number {
  const onlyActive = opts?.onlyActive ?? true;
  return (contracts || [])
    .filter((c) => (onlyActive ? c.status === "active" : true) && c.type === "recurring")
    .reduce((sum, c) => sum + (Number(c.monthly_value) || 0) * (Number(c.mrr_months) || 1), 0);
}
