// Eficiência de execução = tempo realmente trabalhado (cronômetro, tasks.time_tracked_seconds)
// vs tempo corrido desde o início da tarefa (ou até a conclusão, pra tarefas já
// concluídas). Não existe registro por sessão/dia do cronômetro hoje — só o
// total acumulado — então esse indicador é sempre "total trabalhado vs total
// corrido", nunca um detalhamento diário (evita inventar uma distribuição que
// não temos).

export type EfficiencyBand = "critico" | "atencao" | "ok";

export interface TaskEfficiencyInput {
  startDate: string | null;
  createdAt: string;
  isDone: boolean;
  completedAtMs: number | null;
  timeTrackedSeconds: number | null;
}

export interface TaskEfficiency {
  elapsedDays: number;
  trackedSeconds: number;
  ratioPct: number | null;
}

export function computeTaskEfficiency(input: TaskEfficiencyInput): TaskEfficiency {
  const startMs = new Date(input.startDate || input.createdAt).getTime();
  const endMs = input.isDone && input.completedAtMs ? input.completedAtMs : Date.now();
  const elapsedMs = Math.max(0, endMs - startMs);
  const trackedSeconds = input.timeTrackedSeconds || 0;
  const ratioPct = elapsedMs > 0 ? Math.round(((trackedSeconds * 1000) / elapsedMs) * 1000) / 10 : null;
  return {
    elapsedDays: Math.round((elapsedMs / 86400000) * 10) / 10,
    trackedSeconds,
    ratioPct,
  };
}

// Faixas visuais — thresholds arbitrários (não calibrados por histórico ainda,
// não existe base de comparação real). Servem só pra chamar atenção; o número
// bruto (trabalhado/corrido) sempre acompanha, então não vira caixa-preta.
export function efficiencyBand(ratioPct: number | null): EfficiencyBand | null {
  if (ratioPct === null) return null;
  if (ratioPct < 3) return "critico";
  if (ratioPct < 10) return "atencao";
  return "ok";
}

export function formatTrackedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

export function formatElapsedDays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${Math.round(days)}d`;
}
