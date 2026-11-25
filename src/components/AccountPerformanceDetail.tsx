import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Megaphone, ShoppingBag, TrendingDown, TrendingUp, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getSaoPauloMonthInfo, mockAccountDetail, type ProductRow } from "@/lib/performance-mock";
import {
  DeltaBadge,
  SampleDataNotice,
  brl,
  plainPct,
  pct,
  ratio,
  todayTone,
  toneTextClass,
  type Tone,
} from "@/components/PerformanceView";

interface AccountPerformanceDetailProps {
  acc: {
    id: string;
    name: string;
    clientName: string;
    client_id?: string | null;
    status?: string | null;
    squads?: { id: string; name: string; color?: string | null }[];
  };
}

const int = new Intl.NumberFormat("pt-BR");
const compactBrl = (v: number) => {
  if (v < 1000) return `R$ ${Math.round(v)}`;
  const k = v / 1000;
  return `R$ ${k.toLocaleString("pt-BR", { maximumFractionDigits: k < 10 ? 1 : 0 })} mil`;
};

export function AccountPerformanceDetail({ acc }: AccountPerformanceDetailProps) {
  const { day, month, monthLabel } = useMemo(() => getSaoPauloMonthInfo(), []);
  const detail = useMemo(() => mockAccountDetail(String(acc.id), day, month), [acc.id, day, month]);
  const { perf } = detail;

  const rawRows = useMemo(() => [...detail.daily].reverse().slice(0, 10), [detail.daily]);

  return (
    <div className="space-y-6 p-8 font-body animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link
            to="/projects/deliverables"
            search={{ view: "performance" }}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line-1)] bg-[var(--surface-1)] !text-[var(--ink-3)] transition-colors hover:!text-[var(--violet-500)]"
            aria-label="Voltar para Gestão de Entregas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="brain-eyebrow">{acc.clientName}</p>
            <h1 className="mt-0.5 font-title text-2xl font-bold text-[var(--ink-1)]">{acc.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-2)]">
                <ShoppingBag className="h-3 w-3" />
                {perf.platform}
              </span>
              {acc.squads?.map((s) => (
                <span
                  key={s.id}
                  className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: s.color || "var(--violet-500)" }}
                >
                  {s.name}
                </span>
              ))}
              {perf.attention && (
                <span className="rounded-full bg-[var(--danger-tint)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">
                  Atenção
                </span>
              )}
            </div>
          </div>
        </div>
        {acc.client_id && (
          <Link
            to="/clients/$clientId"
            params={{ clientId: String(acc.client_id) }}
            className="inline-flex h-9 items-center gap-2 self-start rounded-full border border-[var(--line-2)] bg-[var(--surface-1)] px-4 text-xs font-bold !text-[var(--ink-1)] transition-colors hover:bg-[var(--surface-3)]"
          >
            Ver cliente
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <SampleDataNotice />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`GMV ${monthLabel} 1–${day}`} value={brl.format(perf.gmvMonth)} delta={perf.growth} sub="vs mês anterior" />
        <Kpi
          label="Hoje"
          value={brl.format(perf.gmvToday)}
          sub={`${plainPct(perf.todayVsYesterday)} de ontem`}
          subTone={todayTone(perf.todayVsYesterday)}
        />
        <Kpi label="Pedidos" value={int.format(detail.orders)} sub={`${int.format(detail.units)} unidades`} />
        <Kpi label="Ticket médio" value={brl.format(detail.avgTicket)} sub="por pedido" />
        <Kpi label="Cancelamentos" value={plainPct(detail.cancelRate)} sub="dos pedidos pagos" />
        <Kpi label="Mês anterior" value={brl.format(perf.gmvPrevMonthTotal)} sub="fechado" />
      </div>

      {/* Gráfico */}
      <Card className="border-[var(--line-1)] bg-[var(--surface-1)] shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--ink-1)]">GMV por dia</h2>
              <p className="text-xs text-[var(--ink-3)]">
                {monthLabel} 1–{day} contra os mesmos dias do mês anterior
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[var(--ink-3)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--violet-400)]" /> Mês atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[var(--ink-4)]" /> Mês anterior
              </span>
            </div>
          </div>
          <GmvChart data={detail.daily} />
        </CardContent>
      </Card>

      {/* Produtos + Ads */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-[var(--line-1)] bg-[var(--surface-1)] shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-base font-bold text-[var(--ink-1)]">Mais vendidos</h2>
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--line-1)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase text-[var(--ink-3)]">Produto</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Unid.</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">GMV</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">% do total</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">vs anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.topProducts.map((p) => (
                  <TableRow key={p.sku} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]">
                    <TableCell>
                      <p className="text-sm font-medium text-[var(--ink-1)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{p.sku}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular text-[var(--ink-2)]">{int.format(p.units)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular text-[var(--ink-1)]">
                      {brl.format(p.gmv)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular text-[var(--ink-3)]">{plainPct(p.share)}</TableCell>
                    <TableCell className="text-right">
                      <Delta value={p.change} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-[var(--line-1)] bg-[var(--surface-1)] shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[var(--ink-1)]">
              <Megaphone className="h-4 w-4 text-[var(--violet-300)]" />
              Ads
            </h2>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <AdsStat label="Investimento" value={brl.format(perf.adsSpend)} change={rel(perf.adsSpend, detail.adsPrev.spend)} mode="neutral" />
              <AdsStat label="Receita Ads" value={brl.format(perf.adsRevenue)} change={rel(perf.adsRevenue, detail.adsPrev.revenue)} />
              <AdsStat label="ROAS" value={`${ratio(perf.roas)}x`} change={rel(perf.roas, detail.adsPrev.roas)} />
              <AdsStat label="ACOS" value={plainPct(perf.acos)} change={rel(perf.acos, detail.adsPrev.acos)} mode="lower-is-better" />
              <AdsStat label="TACOS" value={plainPct(perf.tacos)} change={rel(perf.tacos, detail.adsPrev.tacos)} mode="lower-is-better" />
            </div>
            <p className="mb-2 text-[11px] text-[var(--ink-3)]">
              Por produto, com a variação contra o mesmo período do mês anterior
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--line-1)] hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase text-[var(--ink-3)]">Produto</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Investimento</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Receita Ads</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">ROAS</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">ACOS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.adsProducts.map((p) => (
                  <TableRow key={p.sku} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]">
                    <TableCell>
                      <p className="text-sm font-medium text-[var(--ink-1)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--ink-3)]">{p.sku}</p>
                    </TableCell>
                    <MetricCell value={brl.format(p.spend)} change={p.spendChange} mode="neutral" />
                    <MetricCell value={brl.format(p.revenue)} change={p.revenueChange} />
                    <MetricCell value={`${ratio(p.roas)}x`} change={p.roasChange} strong />
                    <MetricCell value={plainPct(p.acos)} change={p.acosChange} mode="lower-is-better" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alta e queda */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MoversCard title="Produtos em alta" products={detail.risingProducts} up />
        <MoversCard title="Produtos em queda" products={detail.fallingProducts} />
      </div>

      {/* Dados brutos */}
      <Card className="border-[var(--line-1)] bg-[var(--surface-1)] shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[var(--ink-1)]">Dados brutos por dia</h2>
            <p className="text-xs text-[var(--ink-3)]">Últimos {rawRows.length} dias</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--line-1)] hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase text-[var(--ink-3)]">Data</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Pedidos</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">GMV</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Ticket médio</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">Invest. Ads</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-[var(--ink-3)]">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawRows.map((r) => (
                <TableRow key={r.day} className="border-[var(--line-1)] hover:bg-[var(--surface-2)]">
                  <TableCell className="text-sm text-[var(--ink-2)]">{r.label}</TableCell>
                  <TableCell className="text-right text-sm tabular text-[var(--ink-2)]">{int.format(r.orders)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular text-[var(--ink-1)]">
                    {brl.format(r.gmv)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular text-[var(--ink-2)]">
                    {brl.format(r.orders > 0 ? r.gmv / r.orders : 0)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular text-[var(--ink-2)]">{brl.format(r.adsSpend)}</TableCell>
                  <TableCell className="text-right text-sm tabular text-[var(--ink-3)]">
                    {r.adsSpend > 0 ? `${ratio(r.adsRevenue / r.adsSpend)}x` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  delta,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  subTone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] p-4 shadow-sm">
      <p className="brain-eyebrow">{label}</p>
      <p className="mt-2 text-xl font-bold tabular text-[var(--ink-1)]">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {delta !== undefined && <DeltaBadge value={delta} />}
        {sub && (
          <span
            className={cn("text-[11px]", subTone ? toneTextClass(subTone) : "text-[var(--ink-3)]")}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

type DeltaMode = "default" | "lower-is-better" | "neutral";

// Variação relativa contra o período anterior (0.2 = +20%).
const rel = (current: number, previous: number) => (previous > 0 ? current / previous - 1 : 0);

// Cor da variação: normalmente subir é bom; em ACOS/TACOS descer é bom; em
// investimento não há "bom" ou "ruim" por si só, então fica cinza.
function deltaClass(value: number, mode: DeltaMode) {
  if (mode === "neutral" || Math.abs(value) < 0.0005) return "text-[var(--ink-3)]";
  const good = mode === "lower-is-better" ? value < 0 : value > 0;
  return good ? "text-[var(--success)]" : "text-[var(--danger)]";
}

function Delta({ value, mode = "default" }: { value: number; mode?: DeltaMode }) {
  return <span className={cn("text-[11px] font-semibold tabular", deltaClass(value, mode))}>{pct(value)}</span>;
}

function AdsStat({
  label,
  value,
  change,
  mode = "default",
}: {
  label: string;
  value: string;
  change: number;
  mode?: DeltaMode;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3">
      <p className="text-[9px] font-bold uppercase text-[var(--ink-3)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold tabular text-[var(--ink-1)]">{value}</p>
      <Delta value={change} mode={mode} />
    </div>
  );
}

function MetricCell({
  value,
  change,
  mode = "default",
  strong,
}: {
  value: string;
  change: number;
  mode?: DeltaMode;
  strong?: boolean;
}) {
  return (
    <TableCell className="text-right">
      <p className={cn("text-sm tabular", strong ? "font-semibold text-[var(--ink-1)]" : "text-[var(--ink-2)]")}>{value}</p>
      <Delta value={change} mode={mode} />
    </TableCell>
  );
}

function MoversCard({ title, products, up }: { title: string; products: ProductRow[]; up?: boolean }) {
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <Card className="border-[var(--line-1)] bg-[var(--surface-1)] shadow-sm">
      <CardContent className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[var(--ink-1)]">
          <Icon className={cn("h-4 w-4", up ? "text-[var(--success)]" : "text-[var(--danger)]")} />
          {title}
        </h2>
        <ul className="divide-y divide-[var(--line-1)]">
          {products.map((p) => (
            <li key={p.sku} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ink-1)]">{p.name}</p>
                <p className="text-[10px] text-[var(--ink-3)]">
                  {p.sku} · {int.format(p.units)} unid. · {brl.format(p.gmv)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular",
                  p.change >= 0 ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--danger-tint)] text-[var(--danger)]",
                )}
              >
                {pct(p.change)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function GmvChart({
  data,
}: {
  data: { day: number; label: string; gmv: number; prevGmv: number; adsSpend: number; adsRevenue: number }[];
}) {
  // Recharts mede o contêiner no navegador; evita aviso/erro na renderização no servidor.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[280px]" />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--violet-400)", stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: "var(--violet-400)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line-1)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={88}
            tickFormatter={(v: number) => compactBrl(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--line-3)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as (typeof data)[number] | undefined;
              if (!point) return null;
              const roas = point.adsSpend > 0 ? point.adsRevenue / point.adsSpend : 0;
              return (
                <div className="min-w-[190px] rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] p-3 text-xs shadow-lg">
                  <p className="mb-1 font-bold text-[var(--ink-1)]">{label}</p>
                  <p className="text-[var(--violet-300)]">Mês atual: {brl.format(point.gmv)}</p>
                  <p className="text-[var(--ink-3)]">Mês anterior: {brl.format(point.prevGmv)}</p>
                  <div className="mt-2 space-y-0.5 border-t border-[var(--line-1)] pt-2">
                    <p className="text-[var(--ink-2)]">Ads: {brl.format(point.adsSpend)}</p>
                    <p className="text-[var(--ink-2)]">ROAS: {point.adsSpend > 0 ? `${ratio(roas)}x` : "—"}</p>
                  </div>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="gmv" stroke="var(--violet-400)" strokeWidth={2} fill="url(#gmvFill)" />
          <Line
            type="monotone"
            dataKey="prevGmv"
            stroke="var(--ink-4)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
