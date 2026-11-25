// DADOS DE EXEMPLO — só para validar o visual da visão "Performance".
// Nada aqui vem de planilha ou API. Quando a importação/API existir, esta
// função é substituída por dados reais; o componente de tela não muda.
// Os números são gerados a partir do id da conta, então ficam estáveis a
// cada recarga (não "pulam" na tela).

export type PerfPlatform = "Shopee" | "TikTok Shop";

export interface AccountPerformance {
  platform: PerfPlatform;
  gmvMonth: number; // GMV do mês até hoje
  gmvPrevSamePeriod: number; // GMV do mês anterior, mesmo intervalo de dias
  gmvPrevMonthTotal: number; // GMV do mês anterior fechado
  gmvToday: number;
  gmvYesterday: number;
  gmv7d: number;
  adsSpend: number;
  adsRevenue: number;
  growth: number; // variação do mês vs mesmo período do mês anterior (0.2 = +20%)
  todayVsYesterday: number; // hoje como fração do GMV de ontem
  roas: number;
  acos: number;
  tacos: number;
  attention: boolean;
}

// Regra provisória de "loja em atenção": queda expressiva no GMV do mês contra
// o mesmo período do mês anterior. O limite exato está para ser definido.
export const ATTENTION_DROP_THRESHOLD = -0.2;

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSaoPauloMonthInfo(now = new Date()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "short",
  })
    .format(now)
    .replace(".", "");
  return { day, month, year, monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
}

export interface DailyPoint {
  day: number;
  label: string; // dd/MM
  gmv: number;
  prevGmv: number; // mesmo dia do mês anterior
  orders: number;
  adsSpend: number;
  adsRevenue: number;
}

export interface ProductRow {
  name: string;
  sku: string;
  units: number;
  gmv: number;
  share: number; // fração do GMV total
  change: number; // variação vs período anterior (0.2 = +20%)
}

export interface AdsProductRow {
  name: string;
  sku: string;
  spend: number;
  revenue: number;
  roas: number;
  acos: number;
  // Variação contra o período anterior (0.2 = +20%).
  spendChange: number;
  revenueChange: number;
  roasChange: number;
  acosChange: number;
}

export interface AccountDetail {
  perf: AccountPerformance;
  orders: number;
  avgTicket: number;
  units: number;
  cancelRate: number;
  daily: DailyPoint[];
  topProducts: ProductRow[];
  risingProducts: ProductRow[];
  fallingProducts: ProductRow[];
  adsProducts: AdsProductRow[];
  // Totais de Ads do período anterior (mesmos dias do mês anterior).
  adsPrev: { spend: number; revenue: number; roas: number; acos: number; tacos: number };
}

// Detalhe de uma conta (DADOS DE EXEMPLO), coerente com os totais de
// mockPerformance: a soma dos dias bate com o GMV do mês, etc.
export function mockAccountDetail(accountId: string, day: number, month: number): AccountDetail {
  const perf = mockPerformance(accountId, day);
  const rand = mulberry32(hashString(`detalhe:${accountId}`));

  const scaleTo = (weights: number[], total: number) => {
    const sum = weights.reduce((s, w) => s + w, 0) || 1;
    return weights.map((w) => (w / sum) * total);
  };
  const weights = (n: number) => Array.from({ length: n }, () => 0.45 + rand() * 1.1);

  const gmvDays = scaleTo(weights(day), perf.gmvMonth);
  const prevDays = scaleTo(weights(day), perf.gmvPrevSamePeriod);
  const spendDays = scaleTo(weights(day), perf.adsSpend);
  const adsRevDays = scaleTo(weights(day), perf.adsRevenue);

  const avgTicket = 40 + rand() * 180;
  const orders = Math.round(perf.gmvMonth / avgTicket);

  const pad = (n: number) => String(n).padStart(2, "0");
  const daily: DailyPoint[] = gmvDays.map((gmv, i) => ({
    day: i + 1,
    label: `${pad(i + 1)}/${pad(month)}`,
    gmv,
    prevGmv: prevDays[i] ?? 0,
    orders: Math.round(gmv / avgTicket),
    adsSpend: spendDays[i] ?? 0,
    adsRevenue: adsRevDays[i] ?? 0,
  }));

  const productCount = 12;
  const prodWeights = Array.from({ length: productCount }, (_, i) => 1 / (i + 1.2) + rand() * 0.15);
  const prodGmv = scaleTo(prodWeights, perf.gmvMonth);
  const products: ProductRow[] = prodGmv.map((gmv, i) => {
    const price = 25 + rand() * 275;
    return {
      name: `Produto ${pad(i + 1)}`,
      sku: `SKU-${1000 + i * 7}`,
      units: Math.max(1, Math.round(gmv / price)),
      gmv,
      share: perf.gmvMonth > 0 ? gmv / perf.gmvMonth : 0,
      change: (rand() - 0.4) * 2.4,
    };
  });

  const byChange = [...products].sort((a, b) => b.change - a.change);
  // Produtos com anúncio: os de maior GMV, com investimento e receita de Ads que
  // somam o total da conta.
  const adsSource = [...products].sort((a, b) => b.gmv - a.gmv).slice(0, 8);
  const spendParts = scaleTo(adsSource.map(() => 0.3 + rand() * 1.4), perf.adsSpend);
  const revParts = scaleTo(adsSource.map(() => 0.3 + rand() * 1.4), perf.adsRevenue);
  const change = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const adsProducts: AdsProductRow[] = adsSource.map((p, i) => {
    const spend = spendParts[i] ?? 0;
    const revenue = revParts[i] ?? 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const spendChange = change(-0.4, 0.8);
    const revenueChange = change(-0.5, 1.0);
    const prevSpend = spend / (1 + spendChange);
    const prevRevenue = revenue / (1 + revenueChange);
    const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
    const roasChange = prevRoas > 0 ? roas / prevRoas - 1 : 0;
    const acos = roas > 0 ? 1 / roas : 0;
    const prevAcos = prevRoas > 0 ? 1 / prevRoas : 0;
    return {
      name: p.name,
      sku: p.sku,
      spend,
      revenue,
      roas,
      acos,
      spendChange,
      revenueChange,
      roasChange,
      acosChange: prevAcos > 0 ? acos / prevAcos - 1 : 0,
    };
  });

  const prevSpend = perf.adsSpend / (1 + change(-0.3, 0.6));
  const prevRevenue = perf.adsRevenue / (1 + change(-0.4, 0.8));
  const adsPrevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const adsPrev = {
    spend: prevSpend,
    revenue: prevRevenue,
    roas: adsPrevRoas,
    acos: adsPrevRoas > 0 ? 1 / adsPrevRoas : 0,
    tacos: perf.gmvPrevSamePeriod > 0 ? prevSpend / perf.gmvPrevSamePeriod : 0,
  };

  return {
    perf,
    orders,
    avgTicket,
    units: products.reduce((s, p) => s + p.units, 0),
    cancelRate: 0.02 + rand() * 0.07,
    daily,
    topProducts: [...products].sort((a, b) => b.gmv - a.gmv).slice(0, 6),
    risingProducts: byChange.slice(0, 4),
    fallingProducts: byChange.slice(-4).reverse(),
    adsProducts,
    adsPrev,
  };
}

export function mockPerformance(accountId: string, day: number): AccountPerformance {
  const rand = mulberry32(hashString(accountId));
  const platform: PerfPlatform = rand() < 0.75 ? "Shopee" : "TikTok Shop";

  const baseDaily = 400 + rand() * rand() * 9500;
  const gmvMonth = baseDaily * day * (0.9 + rand() * 0.2);
  const growth = (rand() - 0.3) * 2.2; // de ~ -66% a ~ +154%
  const gmvPrevSamePeriod = gmvMonth / (1 + growth);
  const gmvPrevMonthTotal = gmvPrevSamePeriod * (30 / day) * (0.95 + rand() * 0.1);
  const gmvYesterday = baseDaily * (0.7 + rand() * 0.6);
  const gmvToday = baseDaily * (0.2 + rand() * 1.3); // dia ainda em andamento
  const gmv7d = baseDaily * 7 * (0.8 + rand() * 0.4);

  const adsSpend = gmvMonth * (0.05 + rand() * 0.1);
  const roas = 2.5 + rand() * 6;
  const adsRevenue = Math.min(adsSpend * roas, gmvMonth * 0.9);
  const realRoas = adsSpend > 0 ? adsRevenue / adsSpend : 0;

  return {
    platform,
    gmvMonth,
    gmvPrevSamePeriod,
    gmvPrevMonthTotal,
    gmvToday,
    gmvYesterday,
    gmv7d,
    adsSpend,
    adsRevenue,
    growth,
    todayVsYesterday: gmvYesterday > 0 ? gmvToday / gmvYesterday : 0,
    roas: realRoas,
    acos: realRoas > 0 ? 1 / realRoas : 0,
    tacos: gmvMonth > 0 ? adsSpend / gmvMonth : 0,
    attention: growth <= ATTENTION_DROP_THRESHOLD,
  };
}
