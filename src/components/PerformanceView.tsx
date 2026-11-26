import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Megaphone, ShoppingBag, TrendingDown, TrendingUp, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivateText } from "@/components/PrivateText";
import { cn } from "@/lib/utils";
import {
  ATTENTION_DROP_THRESHOLD,
  getSaoPauloMonthInfo,
  mockPerformance,
  type AccountPerformance,
} from "@/lib/performance-mock";

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const pct = (v: number, digits = 1) =>
  `${v >= 0 ? "+" : "-"}${Math.abs(v * 100).toFixed(digits).replace(".", ",")}%`;
export const ratio = (v: number) => v.toFixed(1).replace(".", ",");
export const plainPct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

// "Hoje" contra ontem: o dia ainda está em andamento, então só destacamos os extremos.
// Verde: já superou ontem. Vermelho: queda de mais de 50%. Cinza: no meio.
export const TODAY_DROP_ALERT = 0.5;
export type Tone = "up" | "down" | "neutral";
export function todayTone(todayVsYesterday: number): Tone {
  if (todayVsYesterday >= 1) return "up";
  if (todayVsYesterday < 1 - TODAY_DROP_ALERT) return "down";
  return "neutral";
}
export const toneTextClass = (tone: Tone) =>
  tone === "up" ? "text-[var(--success)]" : tone === "down" ? "text-[var(--danger)]" : "text-[var(--ink-3)]";

interface PerformanceViewProps {
  accounts: any[];
}

export function PerformanceView({ accounts }: PerformanceViewProps) {
  const { day, monthLabel } = useMemo(() => getSaoPauloMonthInfo(), []);

  const rows = useMemo(() => {
    return accounts
      .filter((acc) => !acc.isInternal)
      .map((acc) => ({ acc, perf: mockPerformance(String(acc.id), day) }))
      .sort((a, b) => b.perf.gmvMonth - a.perf.gmvMonth);
  }, [accounts, day]);

  const totals = useMemo(() => {
    const sum = (pick: (p: AccountPerformance) => number) => rows.reduce((s, r) => s + pick(r.perf), 0);
    const gmvMonth = sum((p) => p.gmvMonth);
    const gmvPrevSame = sum((p) => p.gmvPrevSamePeriod);
    const adsSpend = sum((p) => p.adsSpend);
    const adsRevenue = sum((p) => p.adsRevenue);
    return {
      gmvToday: sum((p) => p.gmvToday),
      gmvYesterday: sum((p) => p.gmvYesterday),
      gmvMonth,
      gmvPrevSame,
      growth: gmvPrevSame > 0 ? gmvMonth / gmvPrevSame - 1 : 0,
      gmvPrevMonthTotal: sum((p) => p.gmvPrevMonthTotal),
      adsSpend,
      roas: adsSpend > 0 ? adsRevenue / adsSpend : 0,
      acos: adsRevenue > 0 ? adsSpend / adsRevenue : 0,
      active: rows.filter((r) => r.acc.status === "active").length,
      // Contas com GMV do mês acima do mesmo período do mês anterior.
      growing: rows.filter((r) => r.perf.growth > 0).length,
      attention: rows.filter((r) => r.perf.attention).length,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SampleDataNotice />

      {/* Totais de todas as contas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <TotalTile
          label="GMV hoje"
          value={brl.format(totals.gmvToday)}
          sub={`${plainPct(totals.gmvYesterday > 0 ? totals.gmvToday / totals.gmvYesterday : 0)} de ontem`}
          subTone={todayTone(totals.gmvYesterday > 0 ? totals.gmvToday / totals.gmvYesterday : 0)}
        />
        <TotalTile
          label={`GMV ${monthLabel} 1–${day}`}
          value={brl.format(totals.gmvMonth)}
          delta={totals.growth}
          sub="vs mesmo período do mês anterior"
        />
        <TotalTile
          label="Mês anterior"
          value={brl.format(totals.gmvPrevMonthTotal)}
          sub={`fechado · até o dia ${day}: ${brl.format(totals.gmvPrevSame)}`}
        />
        <TotalTile
          label="Investimento Ads"
          value={brl.format(totals.adsSpend)}
          sub={`ROAS ${ratio(totals.roas)}x · ACOS ${plainPct(totals.acos)}`}
        />
        <TotalTile
          label="Contas ativas"
          value={String(totals.active)}
          sub={`${totals.growing} acima do mês anterior`}
        />
        <TotalTile
          label="Em atenção"
          value={String(totals.attention)}
          sub={`queda de ${Math.abs(ATTENTION_DROP_THRESHOLD * 100)}% ou mais`}
          valueClassName={totals.attention > 0 ? "text-[var(--danger)]" : undefined}
        />
      </div>

      {/* Cards por conta */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[var(--line-1)] bg-[var(--surface-1)] py-12 text-center text-[var(--ink-3)]">
            Nenhuma conta encontrada com esses filtros
          </div>
        )}
        {rows.map(({ acc, perf }, index) => (
          <PerformanceCard key={acc.id} acc={acc} perf={perf} rank={index + 1} monthLabel={monthLabel} day={day} />
        ))}
      </div>
    </div>
  );
}

export function SampleDataNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-tint)] p-4">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
      <div>
        <p className="text-sm font-bold text-[var(--ink-1)]">Dados de exemplo</p>
        <p className="text-xs text-[var(--ink-2)]">
          Esta visão ainda não está ligada a planilha nem à API da Shopee. Os valores abaixo são gerados só para validar o
          layout e não representam nenhum cliente.
        </p>
      </div>
    </div>
  );
}

function TotalTile({
  label,
  value,
  sub,
  subTone,
  delta,
  badge,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: Tone;
  delta?: number;
  badge?: string | undefined;
  valueClassName?: string | undefined;
}) {
  return (
    <div className="rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] p-4 shadow-sm">
      <p className="brain-eyebrow">{label}</p>
      <p className={cn("mt-2 text-xl font-bold tabular text-[var(--ink-1)]", valueClassName)}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {delta !== undefined && <DeltaBadge value={delta} />}
        {sub && <span className={cn("text-[11px]", subTone ? toneTextClass(subTone) : "text-[var(--ink-3)]")}>{sub}</span>}
        {badge && (
          <span className="rounded-full bg-[var(--danger-tint)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export function DeltaBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular",
        up ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--danger-tint)] text-[var(--danger)]",
      )}
    >
      <Icon className="h-3 w-3" />
      {pct(value)}
    </span>
  );
}

function PerformanceCard({
  acc,
  perf,
  rank,
  monthLabel,
  day,
}: {
  acc: any;
  perf: AccountPerformance;
  rank: number;
  monthLabel: string;
  day: number;
}) {
  const todayColor = toneTextClass(todayTone(perf.todayVsYesterday));
  const body = (
    <Card
      className={cn(
        "group h-full overflow-hidden border bg-[var(--surface-1)] shadow-sm transition-all hover:shadow-md",
        perf.attention ? "border-[var(--danger)]/40" : "border-[var(--line-1)]",
      )}
    >
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="brain-eyebrow truncate">
              <span className="mr-2 text-[var(--violet-300)]">{String(rank).padStart(2, "0")}</span>
              <PrivateText>{acc.clientName}</PrivateText>
            </p>
            <h3 className="mt-0.5 truncate text-lg font-bold text-[var(--ink-1)] transition-colors group-hover:text-[var(--violet-500)]">
              <PrivateText>{acc.name}</PrivateText>
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-2)]">
                <ShoppingBag className="h-3 w-3" />
                {perf.platform}
              </span>
              {acc.squads?.map((s: any) => (
                <span
                  key={s.id}
                  className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: s.color || "var(--violet-500)" }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <DeltaBadge value={perf.growth} />
            {perf.attention && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--danger-tint)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">
                <AlertTriangle className="h-3 w-3" />
                Atenção
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-y border-[var(--surface-2)] py-3">
          <div>
            <p className="text-[10px] font-bold uppercase text-[var(--ink-3)]">
              GMV {monthLabel} 1–{day}
            </p>
            <p className="mt-1 text-2xl font-bold tabular text-[var(--ink-1)]">{brl.format(perf.gmvMonth)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[var(--ink-3)]">Hoje</p>
            <p className="mt-1 text-lg font-bold tabular text-[var(--ink-1)]">{brl.format(perf.gmvToday)}</p>
            <p className={cn("text-[10px] font-medium tabular", todayColor)}>
              {plainPct(perf.todayVsYesterday)} de ontem
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="7 dias" value={brl.format(perf.gmv7d)} />
          <MiniStat label="Mesmo período mês ant." value={brl.format(perf.gmvPrevSamePeriod)} />
          <MiniStat label="Mês anterior" value={brl.format(perf.gmvPrevMonthTotal)} />
        </div>

        <div className="rounded-lg bg-[var(--surface-2)] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--ink-3)]">
            <Megaphone className="h-3 w-3" />
            Ads
          </p>
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Invest." value={brl.format(perf.adsSpend)} />
            <MiniStat label="ROAS" value={`${ratio(perf.roas)}x`} />
            <MiniStat label="ACOS" value={plainPct(perf.acos)} />
            <MiniStat label="TACOS" value={plainPct(perf.tacos)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Link to="/projects/performance/$accountId" params={{ accountId: String(acc.id) }} className="block !text-inherit">
      {body}
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-bold uppercase text-[var(--ink-3)]" title={label}>
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold tabular text-[var(--ink-1)]">{value}</p>
    </div>
  );
}
