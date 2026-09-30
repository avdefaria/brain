// Rate limiter simples em memória, por chave. Não sobrevive a restart do
// processo e não é compartilhado entre réplicas — aceitável aqui porque o
// Brain roda num único container. Objetivo é defesa em profundidade: mesmo
// que uma chave de API (SOFIA_API_KEY/EDITH_API_KEY) vaze, o estrago fica
// limitado a N chamadas por minuto em vez de ilimitado.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (existing.length >= maxPerWindow) {
    hits.set(key, existing);
    return true;
  }

  existing.push(now);
  hits.set(key, existing);
  return false;
}
